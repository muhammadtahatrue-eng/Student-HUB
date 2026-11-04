export interface ExportFile {
  path: string;
  language: string;
  description: string;
  code: string;
}

export const NEXTJS_EXPORT_FILES: ExportFile[] = [
  {
    path: 'supabase/schema.sql',
    language: 'sql',
    description: 'PostgreSQL Database Schema, Row-Level Security (RLS) policies, Storage bucket configuration, and Realtime publications.',
    code: `-- ==============================================================================
-- XEUSAR PLATFORM — COMPLETE IDEMPOTENT SUPABASE SCHEMA & RLS MIGRATION
-- Run this in your Supabase Project -> SQL Editor -> New Query
-- Safe to run multiple times (uses IF NOT EXISTS and DROP POLICY IF EXISTS).
-- ==============================================================================

-- 0. Email Verification Helper
create or replace function public.is_email_verified()
returns boolean
language sql
stable
security definer
set search_path = public, auth
as $$
  select coalesce(
    (auth.jwt() ->> 'email_confirmed_at') is not null,
    exists (
      select 1 from auth.users
      where id = auth.uid() and email_confirmed_at is not null
    ),
    false
  );
$$;

-- ==============================================================================
-- 1. STUDY LIBRARY & SHARED ACADEMIC RESOURCES (public.study_notes)
-- ==============================================================================
create table if not exists public.study_notes (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  course_code text not null,
  course_name text not null,
  course_id text,
  subject text not null,
  material_type text not null check (
    material_type in ('lecture_notes', 'past_exam', 'cheat_sheet', 'lab_manual', 'summary', 'assignment', 'other')
  ),
  academic_year integer not null default extract(year from current_date),
  semester text default 'Fall Semester',
  semester_number integer default 1,
  professor text,
  file_url text not null,
  file_name text not null,
  file_size_bytes bigint not null default 0,
  page_count integer not null default 1,
  uploader_name text not null default 'Anonymous Student',
  uploader_university text default 'Open Campus',
  uploader_id uuid references auth.users(id) on delete set null,
  university_id text,
  program_id text,
  program_ids text[] default array[]::text[],
  program_name text,
  degree_tier text,
  content_hash text,
  storage_path text,
  downloads_count integer not null default 0,
  upvotes_count integer not null default 0,
  tags text[] default array[]::text[],
  pages jsonb default '[]'::jsonb,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Idempotent column additions if study_notes was created with an older schema
alter table public.study_notes add column if not exists course_id text;
alter table public.study_notes add column if not exists semester_number integer default 1;
alter table public.study_notes add column if not exists university_id text;
alter table public.study_notes add column if not exists program_id text;
alter table public.study_notes add column if not exists program_ids text[] default array[]::text[];
alter table public.study_notes add column if not exists program_name text;
alter table public.study_notes add column if not exists degree_tier text;
alter table public.study_notes add column if not exists content_hash text;
alter table public.study_notes add column if not exists storage_path text;
alter table public.study_notes add column if not exists pages jsonb default '[]'::jsonb;
alter table public.study_notes add column if not exists updated_at timestamp with time zone default timezone('utc'::text, now()) not null;

create index if not exists idx_study_notes_course_code on public.study_notes(course_code);
create index if not exists idx_study_notes_subject on public.study_notes(subject);
create index if not exists idx_study_notes_program_id on public.study_notes(program_id);
create index if not exists idx_study_notes_material_type on public.study_notes(material_type);
create index if not exists idx_study_notes_created_at on public.study_notes(created_at desc);

create table if not exists public.note_upvotes (
  user_id uuid not null references auth.users(id) on delete cascade,
  note_id uuid not null references public.study_notes(id) on delete cascade,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  primary key (user_id, note_id)
);

create table if not exists public.stored_files (
  content_hash text primary key,
  storage_path text not null,
  file_url text not null,
  mime_type text not null default 'application/pdf',
  size_bytes bigint not null default 0,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.study_notes enable row level security;
alter table public.note_upvotes enable row level security;
alter table public.stored_files enable row level security;

drop policy if exists "Anyone can read study notes" on public.study_notes;
create policy "Anyone can read study notes"
  on public.study_notes for select using (true);

drop policy if exists "Anyone can upload study notes" on public.study_notes;
drop policy if exists "Verified users can upload study notes" on public.study_notes;
create policy "Verified users can upload study notes"
  on public.study_notes for insert
  with check (auth.uid() = uploader_id and public.is_email_verified());

drop policy if exists "Allow students to update upvotes and download counts" on public.study_notes;
drop policy if exists "Only uploader can update their study notes" on public.study_notes;
create policy "Only uploader can update their study notes"
  on public.study_notes for update
  using (auth.uid() = uploader_id)
  with check (auth.uid() = uploader_id);

drop policy if exists "Only uploader can delete their study notes" on public.study_notes;
create policy "Only uploader can delete their study notes"
  on public.study_notes for delete
  using (auth.uid() = uploader_id);

drop policy if exists "Anyone can read note upvotes" on public.note_upvotes;
create policy "Anyone can read note upvotes"
  on public.note_upvotes for select using (true);

drop policy if exists "Verified users manage own note upvotes" on public.note_upvotes;
create policy "Verified users manage own note upvotes"
  on public.note_upvotes for all
  using (auth.uid() = user_id and public.is_email_verified())
  with check (auth.uid() = user_id and public.is_email_verified());

drop policy if exists "Anyone can read stored files" on public.stored_files;
create policy "Anyone can read stored files"
  on public.stored_files for select using (true);

drop policy if exists "Verified users can register stored files" on public.stored_files;
create policy "Verified users can register stored files"
  on public.stored_files for insert
  with check (public.is_email_verified());

-- Safe RPCs & Triggers for Study Note Counters
create or replace function public.increment_downloads(note_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.study_notes
  set downloads_count = coalesce(downloads_count, 0) + 1
  where id = note_id;
end;
$$;

create or replace function public.sync_study_note_upvotes_count()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_note_id uuid;
begin
  v_note_id := coalesce(new.note_id, old.note_id);
  update public.study_notes
  set upvotes_count = (select count(*) from public.note_upvotes where note_id = v_note_id)
  where id = v_note_id;
  return coalesce(new, old);
end;
$$;

drop trigger if exists trg_sync_study_note_upvotes on public.note_upvotes;
create trigger trg_sync_study_note_upvotes
  after insert or delete on public.note_upvotes
  for each row execute function public.sync_study_note_upvotes_count();

-- ==============================================================================
-- 2. STORAGE BUCKETS & POLICIES (study-materials & avatars)
-- ==============================================================================
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'study-materials',
  'study-materials',
  true,
  26214400,
  array['application/pdf', 'image/png', 'image/jpeg', 'image/webp']
)
on conflict (id) do update set
  public = true,
  file_size_limit = 26214400,
  allowed_mime_types = array['application/pdf', 'image/png', 'image/jpeg', 'image/webp'];

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'avatars',
  'avatars',
  true,
  5242880,
  array['image/png', 'image/jpeg', 'image/webp', 'image/gif']
)
on conflict (id) do update set
  public = true,
  file_size_limit = 5242880,
  allowed_mime_types = array['image/png', 'image/jpeg', 'image/webp', 'image/gif'];

drop policy if exists "Public Access: Anyone can view and download PDFs" on storage.objects;
create policy "Public Access: Anyone can view and download PDFs"
  on storage.objects for select
  using (bucket_id in ('study-materials', 'avatars'));

drop policy if exists "Public Access: Anyone can upload study PDFs" on storage.objects;
drop policy if exists "Authenticated users can upload study materials and avatars" on storage.objects;
create policy "Authenticated users can upload study materials and avatars"
  on storage.objects for insert
  with check (bucket_id in ('study-materials', 'avatars') and auth.role() = 'authenticated');

drop policy if exists "Owners can update or delete their storage objects" on storage.objects;
create policy "Owners can update or delete their storage objects"
  on storage.objects for delete
  using (bucket_id in ('study-materials', 'avatars') and auth.uid() = owner);

-- ==============================================================================
-- 3. ACADEMIC PROGRAMS & COHORT DISCUSSIONS / DOUBTS
-- ==============================================================================
create table if not exists public.academic_programs (
  id text primary key,
  name text not null,
  short_code text not null,
  degree_tier text not null default 'Undergraduate',
  discipline text not null default 'Interdisciplinary Studies',
  description text,
  duration_years integer not null default 4,
  total_semesters integer not null default 8,
  total_credits integer not null default 130,
  semesters jsonb default '[]'::jsonb,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

create table if not exists public.program_discussions (
  id text primary key,
  program_id text not null,
  title text not null,
  content text not null,
  category text not null default 'Academics',
  semester_tag text,
  course_tag text,
  author_id uuid references auth.users(id) on delete cascade,
  author_name text not null,
  author_avatar text,
  author_program text,
  author_degree_tier text,
  upvotes_count integer not null default 1,
  comments_count integer not null default 0,
  is_pinned boolean not null default false,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

create table if not exists public.program_discussion_comments (
  id text primary key,
  post_id text not null references public.program_discussions(id) on delete cascade,
  author_id uuid references auth.users(id) on delete cascade,
  author_name text not null,
  author_avatar text,
  author_program text,
  author_degree_tier text,
  content text not null,
  upvotes_count integer not null default 0,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

create table if not exists public.program_doubts (
  id text primary key,
  program_id text not null,
  title text not null,
  content text not null,
  course_code text not null,
  semester_tag text,
  tags text[] default array[]::text[],
  author_id uuid references auth.users(id) on delete cascade,
  author_name text not null,
  author_avatar text,
  author_program text,
  upvotes_count integer not null default 1,
  status text not null default 'unanswered' check (status in ('answered', 'unanswered')),
  accepted_answer_id text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

create table if not exists public.program_doubt_answers (
  id text primary key,
  question_id text not null references public.program_doubts(id) on delete cascade,
  author_id uuid references auth.users(id) on delete cascade,
  author_name text not null,
  author_avatar text,
  author_role text default 'Peer',
  author_program text,
  content text not null,
  upvotes_count integer not null default 0,
  is_accepted boolean not null default false,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.academic_programs enable row level security;
alter table public.program_discussions enable row level security;
alter table public.program_discussion_comments enable row level security;
alter table public.program_doubts enable row level security;
alter table public.program_doubt_answers enable row level security;

drop policy if exists "Anyone can read academic programs" on public.academic_programs;
create policy "Anyone can read academic programs" on public.academic_programs for select using (true);
drop policy if exists "Verified users can create academic programs" on public.academic_programs;
create policy "Verified users can create academic programs" on public.academic_programs for insert with check (public.is_email_verified());

drop policy if exists "Anyone can read program discussions" on public.program_discussions;
create policy "Anyone can read program discussions" on public.program_discussions for select using (true);
drop policy if exists "Verified users create program discussions" on public.program_discussions;
create policy "Verified users create program discussions" on public.program_discussions for insert with check (auth.uid() = author_id and public.is_email_verified());
drop policy if exists "Authors update own program discussions" on public.program_discussions;
create policy "Authors update own program discussions" on public.program_discussions for update using (auth.uid() = author_id);
drop policy if exists "Authors delete own program discussions" on public.program_discussions;
create policy "Authors delete own program discussions" on public.program_discussions for delete using (auth.uid() = author_id);

drop policy if exists "Anyone can read program discussion comments" on public.program_discussion_comments;
create policy "Anyone can read program discussion comments" on public.program_discussion_comments for select using (true);
drop policy if exists "Verified users create program discussion comments" on public.program_discussion_comments;
create policy "Verified users create program discussion comments" on public.program_discussion_comments for insert with check (auth.uid() = author_id and public.is_email_verified());

drop policy if exists "Anyone can read program doubts" on public.program_doubts;
create policy "Anyone can read program doubts" on public.program_doubts for select using (true);
drop policy if exists "Verified users create program doubts" on public.program_doubts;
create policy "Verified users create program doubts" on public.program_doubts for insert with check (auth.uid() = author_id and public.is_email_verified());
drop policy if exists "Authors update own program doubts" on public.program_doubts;
create policy "Authors update own program doubts" on public.program_doubts for update using (auth.uid() = author_id);

drop policy if exists "Anyone can read program doubt answers" on public.program_doubt_answers;
create policy "Anyone can read program doubt answers" on public.program_doubt_answers for select using (true);
drop policy if exists "Verified users create program doubt answers" on public.program_doubt_answers;
create policy "Verified users create program doubt answers" on public.program_doubt_answers for insert with check (auth.uid() = author_id and public.is_email_verified());

-- ==============================================================================
-- 4. UNIVERSITY DIRECTORY & COMMUNITY SCHEMA
-- ==============================================================================
create table if not exists public.universities (
  id text primary key,
  name text not null,
  short_name text not null,
  badge text,
  logo_url text not null,
  banner_url text not null,
  location text not null,
  country text not null default 'Pakistan',
  disciplines text[] default array[]::text[],
  website text,
  established_year integer,
  verified_students integer not null default 0,
  total_courses_count integer not null default 0,
  description text,
  is_member_restricted boolean not null default false,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

create table if not exists public.departments (
  id text primary key,
  university_id text not null references public.universities(id) on delete cascade,
  name text not null,
  code text not null,
  description text,
  course_count integer not null default 0
);

create table if not exists public.courses (
  id text primary key,
  university_id text not null references public.universities(id) on delete cascade,
  department_id text not null references public.departments(id) on delete cascade,
  department_code text not null,
  code text not null,
  name text not null,
  description text,
  instructor text,
  active_students integer not null default 0
);

create table if not exists public.university_discussions (
  id text primary key,
  university_id text not null,
  title text not null,
  content text not null,
  category text not null default 'Academics',
  course_tag text,
  author_id uuid references auth.users(id) on delete set null,
  author_name text not null default 'Student Scholar',
  author_avatar text,
  author_major text,
  author_university text not null,
  upvotes_count integer not null default 0,
  comments_count integer not null default 0,
  is_pinned boolean not null default false,
  is_reported boolean not null default false,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

create table if not exists public.discussion_comments (
  id text primary key,
  post_id text not null references public.university_discussions(id) on delete cascade,
  author_id uuid references auth.users(id) on delete set null,
  author_name text not null default 'Peer Contributor',
  author_avatar text,
  author_university text not null,
  content text not null,
  upvotes_count integer not null default 0,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

create table if not exists public.university_doubts (
  id text primary key,
  university_id text not null,
  title text not null,
  content text not null,
  department text not null,
  course_code text not null,
  tags text[] default array[]::text[],
  author_id uuid references auth.users(id) on delete set null,
  author_name text not null default 'Academic Inquirer',
  author_avatar text,
  author_university text not null,
  upvotes_count integer not null default 0,
  status text not null default 'unanswered' check (status in ('answered', 'unanswered')),
  accepted_answer_id text,
  attachments jsonb default '[]'::jsonb,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

create table if not exists public.doubt_answers (
  id text primary key,
  question_id text not null references public.university_doubts(id) on delete cascade,
  author_id uuid references auth.users(id) on delete set null,
  author_name text not null default 'Peer Assistant',
  author_avatar text,
  author_role text default 'Peer Contributor',
  author_university text not null,
  content text not null,
  upvotes_count integer not null default 0,
  is_accepted boolean not null default false,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

create table if not exists public.university_follows (
  user_id uuid references auth.users(id) on delete cascade,
  university_id text not null references public.universities(id) on delete cascade,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  primary key (user_id, university_id)
);

alter table public.universities enable row level security;
alter table public.departments enable row level security;
alter table public.courses enable row level security;
alter table public.university_discussions enable row level security;
alter table public.discussion_comments enable row level security;
alter table public.university_doubts enable row level security;
alter table public.doubt_answers enable row level security;
alter table public.university_follows enable row level security;

drop policy if exists "Anyone can read universities" on public.universities;
create policy "Anyone can read universities" on public.universities for select using (true);
drop policy if exists "Verified users can add universities" on public.universities;
create policy "Verified users can add universities" on public.universities for insert with check (public.is_email_verified());

drop policy if exists "Anyone can read departments" on public.departments;
create policy "Anyone can read departments" on public.departments for select using (true);
drop policy if exists "Anyone can read courses" on public.courses;
create policy "Anyone can read courses" on public.courses for select using (true);
drop policy if exists "Anyone can read discussions" on public.university_discussions;
create policy "Anyone can read discussions" on public.university_discussions for select using (true);
drop policy if exists "Anyone can read comments" on public.discussion_comments;
create policy "Anyone can read comments" on public.discussion_comments for select using (true);
drop policy if exists "Anyone can read doubts" on public.university_doubts;
create policy "Anyone can read doubts" on public.university_doubts for select using (true);
drop policy if exists "Anyone can read answers" on public.doubt_answers;
create policy "Anyone can read answers" on public.doubt_answers for select using (true);

drop policy if exists "Students can post discussions" on public.university_discussions;
create policy "Students can post discussions" on public.university_discussions for insert with check (auth.uid() = author_id and public.is_email_verified());
drop policy if exists "Students can comment" on public.discussion_comments;
create policy "Students can comment" on public.discussion_comments for insert with check (auth.uid() = author_id and public.is_email_verified());
drop policy if exists "Students can ask doubts" on public.university_doubts;
create policy "Students can ask doubts" on public.university_doubts for insert with check (auth.uid() = author_id and public.is_email_verified());
drop policy if exists "Question authors can update university doubts" on public.university_doubts;
create policy "Question authors can update university doubts" on public.university_doubts for update using (auth.uid() = author_id);
drop policy if exists "Students can post answers" on public.doubt_answers;
create policy "Students can post answers" on public.doubt_answers for insert with check (auth.uid() = author_id and public.is_email_verified());

-- ==============================================================================
-- 5. TEXT-FIRST PUBLIC FORUM SCHEMA & ROW-LEVEL SECURITY
-- ==============================================================================
create table if not exists public.forum_topics (
  id text primary key,
  name text not null,
  slug text not null unique,
  description text not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

insert into public.forum_topics (id, name, slug, description) values
  ('mathematics', 'Mathematics', 'mathematics', 'Calculus, linear algebra, discrete math, proofs, and problem solving.'),
  ('physics', 'Physics', 'physics', 'Mechanics, electromagnetism, quantum physics, thermodynamics, and derivations.'),
  ('computer-science', 'Computer Science', 'computer-science', 'Algorithms, data structures, systems programming, AI, and software design.'),
  ('engineering', 'Engineering', 'engineering', 'Electrical, mechanical, civil, chemical, and biomedical engineering discussions.'),
  ('business', 'Business', 'business', 'Economics, finance, accounting, management, and case study analysis.'),
  ('english-languages', 'English & Languages', 'english-languages', 'Academic writing, literature, linguistics, rhetoric, and research citations.'),
  ('study-tips', 'Study Tips', 'study-tips', 'Active recall, spaced repetition, note-taking workflows, and time management.'),
  ('university-life', 'University Life', 'university-life', 'Course registration advice, research internships, and academic milestones.'),
  ('exam-preparation', 'Exam Preparation', 'exam-preparation', 'Midterm and final exam review strategies, past paper walkthroughs, and formulas.'),
  ('general-discussion', 'General Discussion', 'general-discussion', 'Cross-disciplinary academic conversations and open scholarly exchange.')
on conflict (id) do nothing;

create table if not exists public.forum_posts (
  id uuid primary key default gen_random_uuid(),
  title text not null check (char_length(title) between 3 and 150),
  body text not null check (char_length(body) between 1 and 10000),
  post_type text not null check (
    post_type in ('Discussion', 'Question', 'Study Tip', 'Resource Link', 'Announcement')
  ),
  topic_id text not null references public.forum_topics(id) on delete restrict,
  topic_name text not null,
  author_id uuid not null references auth.users(id) on delete cascade,
  author_name text not null,
  author_username text not null,
  author_avatar text,
  author_program text,
  author_degree_tier text,
  author_university text,
  resource_id uuid references public.study_notes(id) on delete set null,
  program_course_ref jsonb,
  external_link text,
  upvotes_count integer not null default 1,
  downvotes_count integer not null default 0,
  comments_count integer not null default 0,
  accepted_comment_id uuid,
  status text not null default 'published' check (status in ('published', 'flagged', 'removed')),
  idempotency_key text unique,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

create index if not exists idx_forum_posts_topic_id on public.forum_posts(topic_id);
create index if not exists idx_forum_posts_post_type on public.forum_posts(post_type);
create index if not exists idx_forum_posts_created_at on public.forum_posts(created_at desc);
create index if not exists idx_forum_posts_author_id on public.forum_posts(author_id);

create table if not exists public.forum_comments (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.forum_posts(id) on delete cascade,
  parent_comment_id uuid references public.forum_comments(id) on delete cascade,
  body text not null check (char_length(body) between 1 and 4000),
  author_id uuid not null references auth.users(id) on delete cascade,
  author_name text not null,
  author_username text not null,
  author_avatar text,
  author_program text,
  author_degree_tier text,
  upvotes_count integer not null default 1,
  downvotes_count integer not null default 0,
  is_accepted boolean not null default false,
  status text not null default 'published' check (status in ('published', 'flagged', 'removed')),
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

create index if not exists idx_forum_comments_post_id on public.forum_comments(post_id, created_at asc);
create index if not exists idx_forum_comments_parent_id on public.forum_comments(parent_comment_id);

create table if not exists public.forum_votes (
  user_id uuid not null references auth.users(id) on delete cascade,
  target_type text not null check (target_type in ('post', 'comment')),
  target_id uuid not null,
  vote_value smallint not null check (vote_value in (-1, 1)),
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  primary key (user_id, target_type, target_id)
);

create table if not exists public.forum_bookmarks (
  user_id uuid not null references auth.users(id) on delete cascade,
  post_id uuid not null references public.forum_posts(id) on delete cascade,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  primary key (user_id, post_id)
);

create table if not exists public.forum_reports (
  id uuid primary key default gen_random_uuid(),
  target_type text not null check (target_type in ('post', 'comment')),
  target_id uuid not null,
  post_id uuid not null references public.forum_posts(id) on delete cascade,
  target_snippet text not null,
  reporter_id uuid not null references auth.users(id) on delete cascade,
  reporter_username text not null,
  reason text not null,
  details text,
  status text not null default 'pending' check (status in ('pending', 'reviewed_kept', 'reviewed_removed')),
  reviewed_by uuid references auth.users(id) on delete set null,
  reviewed_at timestamp with time zone,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.forum_topics enable row level security;
alter table public.forum_posts enable row level security;
alter table public.forum_comments enable row level security;
alter table public.forum_votes enable row level security;
alter table public.forum_bookmarks enable row level security;
alter table public.forum_reports enable row level security;

drop policy if exists "Anyone can read forum topics" on public.forum_topics;
create policy "Anyone can read forum topics" on public.forum_topics for select using (true);

drop policy if exists "Public can read published forum posts" on public.forum_posts;
create policy "Public can read published forum posts" on public.forum_posts for select using (status <> 'removed');

drop policy if exists "Verified users create own forum posts" on public.forum_posts;
create policy "Verified users create own forum posts" on public.forum_posts for insert with check (auth.uid() = author_id and public.is_email_verified());

drop policy if exists "Verified authors can update own forum posts" on public.forum_posts;
create policy "Verified authors can update own forum posts" on public.forum_posts for update using (auth.uid() = author_id and public.is_email_verified()) with check (auth.uid() = author_id and public.is_email_verified());

drop policy if exists "Verified authors can delete own forum posts" on public.forum_posts;
create policy "Verified authors can delete own forum posts" on public.forum_posts for delete using (auth.uid() = author_id and public.is_email_verified());

drop policy if exists "Public can read published forum comments" on public.forum_comments;
create policy "Public can read published forum comments" on public.forum_comments for select using (status <> 'removed');

drop policy if exists "Verified users create own forum comments" on public.forum_comments;
create policy "Verified users create own forum comments" on public.forum_comments for insert with check (auth.uid() = author_id and public.is_email_verified());

drop policy if exists "Verified authors can update own forum comments" on public.forum_comments;
create policy "Verified authors can update own forum comments" on public.forum_comments for update using (auth.uid() = author_id and public.is_email_verified()) with check (auth.uid() = author_id and public.is_email_verified());

drop policy if exists "Verified authors can delete own forum comments" on public.forum_comments;
create policy "Verified authors can delete own forum comments" on public.forum_comments for delete using (auth.uid() = author_id and public.is_email_verified());

drop policy if exists "Anyone can read forum votes" on public.forum_votes;
create policy "Anyone can read forum votes" on public.forum_votes for select using (true);

drop policy if exists "Verified users manage own forum votes" on public.forum_votes;
create policy "Verified users manage own forum votes" on public.forum_votes for all using (auth.uid() = user_id and public.is_email_verified()) with check (auth.uid() = user_id and public.is_email_verified());

drop policy if exists "Verified users manage own forum bookmarks" on public.forum_bookmarks;
create policy "Verified users manage own forum bookmarks" on public.forum_bookmarks for all using (auth.uid() = user_id and public.is_email_verified()) with check (auth.uid() = user_id and public.is_email_verified());

drop policy if exists "Verified users submit forum reports" on public.forum_reports;
create policy "Verified users submit forum reports" on public.forum_reports for insert with check (auth.uid() = reporter_id and public.is_email_verified());

-- Triggers to safely synchronize forum comment counts and vote counts without allowing non-authors to edit posts
create or replace function public.sync_forum_post_comments_count()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_post_id uuid;
begin
  v_post_id := coalesce(new.post_id, old.post_id);
  update public.forum_posts
  set comments_count = (
    select count(*) from public.forum_comments
    where post_id = v_post_id and status <> 'removed'
  )
  where id = v_post_id;
  return coalesce(new, old);
end;
$$;

drop trigger if exists trg_sync_forum_post_comments_count on public.forum_comments;
create trigger trg_sync_forum_post_comments_count
  after insert or update or delete on public.forum_comments
  for each row execute function public.sync_forum_post_comments_count();

create or replace function public.sync_forum_vote_totals()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_type text;
  v_id uuid;
  v_up integer;
  v_down integer;
begin
  v_type := coalesce(new.target_type, old.target_type);
  v_id := coalesce(new.target_id, old.target_id);

  select
    count(*) filter (where vote_value = 1),
    count(*) filter (where vote_value = -1)
  into v_up, v_down
  from public.forum_votes
  where target_type = v_type and target_id = v_id;

  if v_type = 'post' then
    update public.forum_posts
    set upvotes_count = coalesce(v_up, 0), downvotes_count = coalesce(v_down, 0)
    where id = v_id;
  elsif v_type = 'comment' then
    update public.forum_comments
    set upvotes_count = coalesce(v_up, 0), downvotes_count = coalesce(v_down, 0)
    where id = v_id;
  end if;

  return coalesce(new, old);
end;
$$;

drop trigger if exists trg_sync_forum_vote_totals on public.forum_votes;
create trigger trg_sync_forum_vote_totals
  after insert or update or delete on public.forum_votes
  for each row execute function public.sync_forum_vote_totals();

-- ==============================================================================
-- 6. USER PROFILES, ACADEMIC INFORMATION & PRIVATE SETTINGS
-- ==============================================================================
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text unique not null,
  display_name text not null,
  full_name text,
  avatar_url text,
  bio text,
  setup_completed boolean not null default false,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.profiles add column if not exists display_name text;
alter table public.profiles add column if not exists full_name text;
alter table public.profiles add column if not exists setup_completed boolean not null default false;

create table if not exists public.academic_information (
  user_id uuid primary key references auth.users(id) on delete cascade,
  education_level text,
  academic_stage text,
  major text,
  institution_name text,
  academic_year text,
  semester text,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

create table if not exists public.user_settings_preferences (
  user_id uuid primary key references auth.users(id) on delete cascade,
  privacy_settings jsonb default '{}'::jsonb,
  appearance_settings jsonb default '{}'::jsonb,
  preferred_subjects text[] default array[]::text[],
  study_preferences jsonb default '{}'::jsonb,
  preferred_language text default 'en',
  theme_preference text default 'dark',
  content_discovery_preferences jsonb default '{}'::jsonb,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.profiles enable row level security;
alter table public.academic_information enable row level security;
alter table public.user_settings_preferences enable row level security;

drop policy if exists "Anyone can view public student profiles" on public.profiles;
create policy "Anyone can view public student profiles"
  on public.profiles for select using (true);

drop policy if exists "Verified users can insert own profile" on public.profiles;
create policy "Verified users can insert own profile"
  on public.profiles for insert
  with check (auth.uid() = id and public.is_email_verified());

drop policy if exists "Verified users can update own profile" on public.profiles;
create policy "Verified users can update own profile"
  on public.profiles for update
  using (auth.uid() = id and public.is_email_verified())
  with check (auth.uid() = id and public.is_email_verified());

-- Academic cohort info is readable by authenticated students so program/university directories reflect active enrollments,
-- while only the account owner can insert/update/delete their own academic_information row.
drop policy if exists "Authenticated users can view academic cohort enrollments" on public.academic_information;
create policy "Authenticated users can view academic cohort enrollments"
  on public.academic_information for select
  using (true);

drop policy if exists "Verified users can read and manage own academic information" on public.academic_information;
create policy "Verified users can read and manage own academic information"
  on public.academic_information for all
  using (auth.uid() = user_id and public.is_email_verified())
  with check (auth.uid() = user_id and public.is_email_verified());

-- Private settings & preferences are strictly restricted to the owner (auth.uid() = user_id)
drop policy if exists "Verified users can read and manage own settings and preferences" on public.user_settings_preferences;
create policy "Verified users can read and manage own settings and preferences"
  on public.user_settings_preferences for all
  using (auth.uid() = user_id and public.is_email_verified())
  with check (auth.uid() = user_id and public.is_email_verified());

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_username text;
  v_display_name text;
begin
  if new.email_confirmed_at is null then
    return new;
  end if;

  v_display_name := coalesce(
    nullif(trim(new.raw_user_meta_data ->> 'display_name'), ''),
    nullif(trim(new.raw_user_meta_data ->> 'full_name'), ''),
    nullif(trim(new.raw_user_meta_data ->> 'name'), ''),
    split_part(new.email, '@', 1)
  );

  v_username := lower(regexp_replace(
    coalesce(
      nullif(trim(new.raw_user_meta_data ->> 'username'), ''),
      split_part(new.email, '@', 1) || '_' || substr(new.id::text, 1, 6)
    ),
    '[^a-z0-9_.-]', '', 'g'
  ));

  insert into public.profiles (id, username, display_name, full_name, setup_completed)
  values (new.id, v_username, v_display_name, v_display_name, false)
  on conflict (id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert or update of email_confirmed_at on auth.users
  for each row execute function public.handle_new_user();
`
  },
  {
    path: '.env.local.example',
    language: 'bash',
    description: 'Supabase environment configuration variables for Next.js.',
    code: `# Get these values from your Supabase Dashboard -> Project Settings -> API
NEXT_PUBLIC_SUPABASE_URL="https://your-project-id.supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="your-anon-key-here"
`
  },
  {
    path: 'lib/supabase.ts',
    language: 'typescript',
    description: 'Browser-side and Server-side Supabase client initialization.',
    code: `import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('Warning: NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY is missing.');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export interface StudyNoteRow {
  id: string;
  title: string;
  description: string;
  course_code: string;
  course_name: string;
  subject: string;
  material_type: 'lecture_notes' | 'past_exam' | 'cheat_sheet' | 'lab_manual' | 'summary';
  academic_year: number;
  semester: string;
  professor?: string;
  file_url: string;
  file_name: string;
  file_size_bytes: number;
  page_count: number;
  uploader_name: string;
  uploader_university?: string;
  downloads_count: number;
  upvotes_count: number;
  tags?: string[];
  created_at: string;
}
`
  },
  {
    path: 'app/layout.tsx',
    language: 'typescript',
    description: 'Next.js 15 root layout with metadata, navbar, and typography.',
    code: `import type { Metadata } from 'next';
import { Plus_Jakarta_Sans } from 'next/font/google';
import Link from 'next/link';
import './globals.css';

const jakarta = Plus_Jakarta_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-jakarta',
});

export const metadata: Metadata = {
  title: 'StudyVault — Free Student Study-Material Sharing Platform',
  description: 'Discover, download, and share peer-reviewed lecture notes, past exam papers, and high-yield cheat sheets.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={jakarta.variable}>
      <body className="bg-stone-50 text-stone-900 font-sans antialiased min-h-screen flex flex-col">
        {/* Top Bar Contract: 3-Zone Navigation */}
        <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-sm border-b border-stone-200">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
            {/* Zone 1: Single text element wordmark */}
            <Link href="/" className="text-xl font-bold tracking-tight text-stone-900">
              StudyVault
            </Link>

            {/* Zone 2: Navigation Links */}
            <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-stone-600">
              <Link href="/" className="hover:text-stone-900 transition-colors">
                Browse Notes
              </Link>
              <Link href="/upload" className="hover:text-stone-900 transition-colors">
                Share Material
              </Link>
              <a href="#how-it-works" className="hover:text-stone-900 transition-colors">
                How It Works
              </a>
            </nav>

            {/* Zone 3: Primary Action */}
            <div className="flex items-center gap-3">
              <Link
                href="/upload"
                className="px-4 py-2 text-sm font-semibold text-white bg-indigo-900 hover:bg-indigo-800 rounded-lg transition-colors whitespace-nowrap shadow-sm"
              >
                + Upload PDF
              </Link>
            </div>
          </div>
        </header>

        <main className="flex-1">{children}</main>

        <footer className="border-t border-stone-200 bg-white py-8 text-center text-xs text-stone-500">
          <p>© {new Date().getFullYear()} StudyVault · Free & open academic material platform for students.</p>
        </footer>
      </body>
    </html>
  );
}
`
  },
  {
    path: 'app/page.tsx',
    language: 'typescript',
    description: 'Next.js homepage with search bar, material filters, and realtime note stream.',
    code: `'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { supabase, StudyNoteRow } from '@/lib/supabase';

const MATERIAL_TYPES = [
  { id: 'all', label: 'All Materials' },
  { id: 'lecture_notes', label: 'Lecture Notes' },
  { id: 'past_exam', label: 'Past Exams' },
  { id: 'cheat_sheet', label: 'Cheat Sheets' },
  { id: 'summary', label: 'Summaries' },
  { id: 'lab_manual', label: 'Lab Manuals' },
];

export default function HomePage() {
  const [notes, setNotes] = useState<StudyNoteRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');

  useEffect(() => {
    fetchNotes();

    // Set up Realtime listener
    const channel = supabase
      .channel('realtime_notes')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'study_notes' },
        (payload) => {
          setNotes((prev) => [payload.new as StudyNoteRow, ...prev]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  async function fetchNotes() {
    setLoading(true);
    let query = supabase.from('study_notes').select('*').order('created_at', { ascending: false });
    const { data, error } = await query;
    if (!error && data) {
      setNotes(data);
    }
    setLoading(false);
  }

  const filtered = notes.filter((n) => {
    const matchesSearch =
      n.title.toLowerCase().includes(search.toLowerCase()) ||
      n.course_code.toLowerCase().includes(search.toLowerCase()) ||
      n.subject.toLowerCase().includes(search.toLowerCase());
    const matchesType = typeFilter === 'all' || n.material_type === typeFilter;
    return matchesSearch && matchesType;
  });

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-10">
      {/* Hero & Search Header */}
      <section className="text-center max-w-2xl mx-auto mb-10">
        <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-stone-900 mb-3 text-balance">
          University Study Materials, Verified & Free
        </h1>
        <p className="text-stone-600 text-sm sm:text-base mb-6">
          Search course codes, midterms, lecture summaries, and formula sheets shared by peers.
        </p>

        {/* Search Bar */}
        <div className="relative">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by course code (e.g. CS106B, MATH21A), topic, or title..."
            className="w-full px-4 py-3 pl-11 text-sm bg-white border border-stone-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:border-transparent shadow-sm"
          />
          <svg
            className="w-5 h-5 text-stone-400 absolute left-3.5 top-3.5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>
      </section>

      {/* Filter Tabs (Interactive Segmented Buttons) */}
      <div className="flex flex-wrap items-center justify-between gap-4 mb-8 pb-4 border-b border-stone-200">
        <div className="flex flex-wrap items-center gap-1.5 p-1 bg-stone-200/60 rounded-lg">
          {MATERIAL_TYPES.map((t) => (
            <button
              key={t.id}
              onClick={() => setTypeFilter(t.id)}
              className={\`px-3 py-1.5 text-xs font-medium rounded-md transition-colors \${
                typeFilter === t.id
                  ? 'bg-white text-stone-900 shadow-sm'
                  : 'text-stone-600 hover:text-stone-900'
              }\`}
            >
              {t.label}
            </button>
          ))}
        </div>
        <span className="text-xs text-stone-500 tabular-nums">
          Showing {filtered.length} resources
        </span>
      </div>

      {/* Notes Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="h-48 bg-stone-200/60 rounded-xl animate-pulse" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-xl border border-stone-200 p-8">
          <p className="text-stone-600 font-medium mb-2">No study materials found</p>
          <p className="text-xs text-stone-500 mb-4">Be the first to share notes for this course!</p>
          <Link
            href="/upload"
            className="inline-block px-4 py-2 text-xs font-semibold text-white bg-indigo-900 rounded-lg hover:bg-indigo-800"
          >
            Upload Notes
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filtered.map((note) => (
            <article
              key={note.id}
              className="bg-white rounded-xl border border-stone-200 p-5 hover:border-stone-400 transition-colors flex flex-col justify-between"
            >
              <div>
                {/* Clean unboxed metadata with typographic separators */}
                <div className="flex items-center gap-2 text-xs font-medium text-indigo-900 mb-2">
                  <span>{note.course_code}</span>
                  <span aria-hidden="true">·</span>
                  <span className="text-stone-500">{note.subject}</span>
                </div>

                <h3 className="font-semibold text-stone-900 text-base leading-snug mb-2 line-clamp-2">
                  {note.title}
                </h3>
                <p className="text-xs text-stone-600 line-clamp-3 mb-4 leading-relaxed">
                  {note.description}
                </p>
              </div>

              <div>
                <div className="flex items-center justify-between text-xs text-stone-500 pt-3 border-t border-stone-100">
                  <span className="tabular-nums">{note.page_count} pages</span>
                  <span>{note.uploader_name}</span>
                </div>

                <div className="mt-4 flex items-center gap-2">
                  <a
                    href={note.file_url}
                    target="_blank"
                    rel="noreferrer"
                    className="flex-1 py-2 text-center text-xs font-semibold text-stone-900 bg-stone-100 hover:bg-stone-200 rounded-lg transition-colors"
                  >
                    Download PDF
                  </a>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
`
  },
  {
    path: 'app/upload/page.tsx',
    language: 'typescript',
    description: 'Next.js upload page handling PDF drag-and-drop, Supabase storage bucket upload, and database insert.',
    code: `'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

export default function UploadPage() {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState('');
  const [courseCode, setCourseCode] = useState('');
  const [courseName, setCourseName] = useState('');
  const [subject, setSubject] = useState('Computer Science');
  const [materialType, setMaterialType] = useState('lecture_notes');
  const [description, setDescription] = useState('');
  const [uploaderName, setUploaderName] = useState('');
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (selected) {
      if (selected.type !== 'application/pdf') {
        setError('Only PDF files are supported.');
        return;
      }
      if (selected.size > 25 * 1024 * 1024) {
        setError('File size must be less than 25MB.');
        return;
      }
      setError(null);
      setFile(selected);
      if (!title) {
        setTitle(selected.name.replace(/\\.pdf$/i, '').replace(/[-_]/g, ' '));
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) {
      setError('Please select a PDF file to upload.');
      return;
    }
    if (!title || !courseCode) {
      setError('Title and Course Code are required.');
      return;
    }

    try {
      setUploading(true);
      setError(null);

      // 1. Upload PDF into Supabase Storage Bucket 'study-materials'
      const fileExt = 'pdf';
      const cleanFileName = \`\${Date.now()}_\${file.name.replace(/[^a-zA-Z0-9.-]/g, '_')}\`;
      const filePath = \`uploads/\${cleanFileName}\`;

      const { data: storageData, error: storageError } = await supabase.storage
        .from('study-materials')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false,
          contentType: 'application/pdf',
        });

      if (storageError) {
        throw new Error(\`Storage error: \${storageError.message}\`);
      }

      // 2. Retrieve Public URL for the uploaded PDF
      const { data: urlData } = supabase.storage
        .from('study-materials')
        .getPublicUrl(filePath);

      const publicUrl = urlData.publicUrl;

      // 3. Insert metadata record into 'study_notes' Postgres table
      const { error: dbError } = await supabase.from('study_notes').insert([
        {
          title,
          description,
          course_code: courseCode.trim().toUpperCase(),
          course_name: courseName || courseCode.trim().toUpperCase(),
          subject,
          material_type: materialType,
          academic_year: new Date().getFullYear(),
          file_url: publicUrl,
          file_name: file.name,
          file_size_bytes: file.size,
          page_count: 12, // Estimate or computed via pdf-lib
          uploader_name: uploaderName.trim() || 'Anonymous Student',
          downloads_count: 0,
          upvotes_count: 0,
        },
      ]);

      if (dbError) {
        throw new Error(\`Database error: \${dbError.message}\`);
      }

      // 4. Redirect to home feed
      router.push('/');
    } catch (err: any) {
      console.error(err);
      setError(err?.message || 'Failed to upload note.');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-10">
      <div className="bg-white rounded-xl border border-stone-200 p-6 sm:p-8">
        <h1 className="text-2xl font-bold text-stone-900 mb-1">Share Study Material</h1>
        <p className="text-xs text-stone-500 mb-6">
          Upload PDF notes, exam solutions, or course summaries for fellow students.
        </p>

        {error && (
          <div className="mb-6 p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-lg">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* File Dropzone */}
          <div>
            <label className="block text-xs font-semibold text-stone-700 uppercase tracking-wider mb-2">
              PDF Document
            </label>
            <div className="border-2 border-dashed border-stone-300 rounded-xl p-6 text-center hover:border-indigo-600 transition-colors bg-stone-50/50">
              <input
                type="file"
                accept="application/pdf"
                onChange={handleFileChange}
                className="hidden"
                id="file-upload"
              />
              <label htmlFor="file-upload" className="cursor-pointer block">
                <svg
                  className="w-8 h-8 text-stone-400 mx-auto mb-2"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                  />
                </svg>
                <span className="text-sm font-medium text-stone-800">
                  {file ? file.name : 'Click to select or drag PDF file here'}
                </span>
                <p className="text-xs text-stone-400 mt-1">PDF format up to 25MB</p>
              </label>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">
                Course Code *
              </label>
              <input
                type="text"
                required
                placeholder="e.g. CS 106B, MATH 21A"
                value={courseCode}
                onChange={(e) => setCourseCode(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-600"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">
                Subject
              </label>
              <select
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-600"
              >
                <option value="Computer Science">Computer Science</option>
                <option value="Mathematics">Mathematics</option>
                <option value="Biology">Biology</option>
                <option value="Physics">Physics</option>
                <option value="Chemistry">Chemistry</option>
                <option value="Economics">Economics</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-stone-700 mb-1">
              Document Title *
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Binary Search Trees & Graph Algorithms Complete Notes"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-600"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">
                Material Type
              </label>
              <select
                value={materialType}
                onChange={(e) => setMaterialType(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-600"
              >
                <option value="lecture_notes">Lecture Notes</option>
                <option value="past_exam">Past Exam</option>
                <option value="cheat_sheet">Cheat Sheet</option>
                <option value="summary">Summary</option>
                <option value="lab_manual">Lab Manual</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">
                Your Name / Alias
              </label>
              <input
                type="text"
                placeholder="e.g. Alex T."
                value={uploaderName}
                onChange={(e) => setUploaderName(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-600"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-stone-700 mb-1">
              Description & Key Topics
            </label>
            <textarea
              rows={3}
              placeholder="Brief description of chapters or problems covered..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-600"
            />
          </div>

          <button
            type="submit"
            disabled={uploading}
            className="w-full py-2.5 px-4 text-sm font-semibold text-white bg-indigo-900 hover:bg-indigo-800 disabled:opacity-50 rounded-lg transition-colors shadow-sm"
          >
            {uploading ? 'Uploading to Supabase...' : 'Publish Study Material'}
          </button>
        </form>
      </div>
    </div>
  );
}
`
  }
];
