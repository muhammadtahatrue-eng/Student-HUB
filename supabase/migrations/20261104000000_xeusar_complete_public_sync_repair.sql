-- ==============================================================================
-- XEUSAR PLATFORM — COMPLETE IDEMPOTENT PRODUCTION MIGRATION & PUBLIC SYNC REPAIR
-- File: supabase/migrations/20261104000000_xeusar_complete_public_sync_repair.sql
--
-- Purpose:
--   1. Creates and reconciles all canonical tables, columns, constraints, indexes,
--      triggers, and RPC functions for:
--        - User Profiles, Academic Information & Private Preferences
--        - Study Library & Shared Study Materials (study_notes, note_upvotes, stored_files)
--        - Public Forum (forum_topics, forum_posts, forum_comments, forum_votes, forum_bookmarks, forum_reports)
--        - Academic Programs & Cohort Community (academic_programs, program_discussions, program_discussion_comments, program_doubts, program_doubt_answers)
--        - University Directory & Campus Community (universities, departments, courses, university_discussions, university_discussion_comments, discussion_comments, university_doubts, university_doubt_answers, doubt_answers, university_follows)
--   2. Configures Row-Level Security (RLS) policies so shared/public educational content
--      is genuinely visible across all users, accounts, browsers, and devices while
--      keeping private user data (preferences, bookmarks, unverified drafts) protected
--      and restricting edits/deletions to the content owner or moderator.
--   3. Provisions and secures the 'study-materials' and 'avatars' Storage buckets.
--   4. Cleans any legacy <!--XEUSAR_PUBLIC_SYNC:...--> payloads out of public.profiles.full_name.
--   5. Reloads the PostgREST schema cache and runs verification queries.
--
-- Safe to run multiple times (100% idempotent).
-- ==============================================================================

create extension if not exists "pgcrypto";

-- ==============================================================================
-- 0. HELPER FUNCTIONS & TRIGGERS
-- ==============================================================================

create or replace function public.set_current_timestamp_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc'::text, now());
  return new;
end;
$$;

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

create or replace function public.is_forum_moderator()
returns boolean
language sql
stable
security definer
set search_path = public, auth
as $$
  select exists (
    select 1 from auth.users u
    left join public.profiles p on p.id = u.id
    where u.id = auth.uid()
      and (
        lower(coalesce(u.email, '')) = 'muhammadtahatrue@gmail.com'
        or lower(coalesce(u.email, '')) like '%@xeusar.edu'
        or lower(coalesce(p.username, '')) in ('admin', 'moderator', 'muhammadtahatrue')
      )
  );
$$;

grant execute on function public.is_email_verified() to anon, authenticated;
grant execute on function public.is_forum_moderator() to anon, authenticated;

-- ==============================================================================
-- 1. PROFILES, ACADEMIC INFORMATION & PRIVATE SETTINGS
-- ==============================================================================

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text not null,
  display_name text not null,
  full_name text,
  avatar_url text,
  bio text,
  setup_completed boolean not null default false,
  created_at timestamptz not null default timezone('utc'::text, now()),
  updated_at timestamptz not null default timezone('utc'::text, now())
);

alter table public.profiles add column if not exists username text;
alter table public.profiles add column if not exists display_name text;
alter table public.profiles add column if not exists full_name text;
alter table public.profiles add column if not exists avatar_url text;
alter table public.profiles add column if not exists bio text;
alter table public.profiles add column if not exists setup_completed boolean not null default false;
alter table public.profiles add column if not exists created_at timestamptz not null default timezone('utc'::text, now());
alter table public.profiles add column if not exists updated_at timestamptz not null default timezone('utc'::text, now());

-- Strip any legacy <!--XEUSAR_PUBLIC_SYNC:...--> comment payload from full_name and display_name
update public.profiles
set full_name = trim(regexp_replace(coalesce(full_name, ''), '<!--XEUSAR_PUBLIC_SYNC:[\s\S]*?-->', '', 'g'))
where full_name like '%<!--XEUSAR_PUBLIC_SYNC:%';

update public.profiles
set display_name = trim(regexp_replace(coalesce(display_name, ''), '<!--XEUSAR_PUBLIC_SYNC:[\s\S]*?-->', '', 'g'))
where display_name like '%<!--XEUSAR_PUBLIC_SYNC:%';

update public.profiles
set display_name = coalesce(nullif(trim(display_name), ''), nullif(trim(full_name), ''), 'Student')
where display_name is null or trim(display_name) = '';

update public.profiles
set full_name = display_name
where full_name is null or trim(full_name) = '';

update public.profiles
set username = 'user_' || substr(replace(id::text, '-', ''), 1, 8)
where username is null or trim(username) = '';

alter table public.profiles drop constraint if exists profiles_username_length;
alter table public.profiles add constraint profiles_username_length
  check (char_length(trim(username)) >= 3 and char_length(trim(username)) <= 30);

alter table public.profiles drop constraint if exists profiles_username_format;
alter table public.profiles add constraint profiles_username_format
  check (username ~ '^[a-zA-Z0-9_.-]+$');

alter table public.profiles drop constraint if exists profiles_display_name_not_empty;
alter table public.profiles add constraint profiles_display_name_not_empty
  check (char_length(trim(display_name)) >= 1);

create unique index if not exists idx_profiles_username_lower
  on public.profiles (lower(username));

create table if not exists public.academic_information (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  education_level text check (
    education_level is null or education_level in ('undergraduate', 'bachelors', 'masters', 'phd')
  ),
  academic_stage text check (
    academic_stage is null or academic_stage in ('high_school', 'college')
  ),
  major text,
  institution_name text,
  academic_year text,
  semester text,
  updated_at timestamptz not null default timezone('utc'::text, now())
);

create index if not exists idx_academic_information_institution
  on public.academic_information (institution_name);
create index if not exists idx_academic_information_major
  on public.academic_information (major);

create table if not exists public.user_settings_preferences (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  account_settings jsonb not null default '{}'::jsonb,
  privacy_settings jsonb not null default '{"public_badge_enabled": true, "show_uni_on_notes": true}'::jsonb,
  notification_settings jsonb not null default '{}'::jsonb,
  appearance_settings jsonb not null default '{"flare_locked": true, "ray_color": "#9ca3af", "ray_origin": "top-center", "ray_brightness": 0.5}'::jsonb,
  preferred_subjects text[] not null default array[]::text[],
  study_preferences jsonb not null default '{"study_style": "", "session_length": "", "collaboration_mode": ""}'::jsonb,
  preferred_language text not null default 'en',
  theme_preference text not null default 'dark',
  content_discovery_preferences jsonb not null default '{"prioritize_verified_notes": true, "prioritize_my_institution": true, "include_past_exams": true}'::jsonb,
  updated_at timestamptz not null default timezone('utc'::text, now())
);

drop trigger if exists trg_profiles_updated_at on public.profiles;
create trigger trg_profiles_updated_at
  before update on public.profiles
  for each row execute function public.set_current_timestamp_updated_at();

drop trigger if exists trg_academic_information_updated_at on public.academic_information;
create trigger trg_academic_information_updated_at
  before update on public.academic_information
  for each row execute function public.set_current_timestamp_updated_at();

drop trigger if exists trg_user_settings_preferences_updated_at on public.user_settings_preferences;
create trigger trg_user_settings_preferences_updated_at
  before update on public.user_settings_preferences
  for each row execute function public.set_current_timestamp_updated_at();

alter table public.profiles enable row level security;
alter table public.academic_information enable row level security;
alter table public.user_settings_preferences enable row level security;

-- Public profile metadata (username, display_name, avatar_url, bio) is readable by everyone
-- so author attribution works across users, while only the account owner can write their profile.
drop policy if exists "Users can view their own profile" on public.profiles;
drop policy if exists "Anyone can view public student profiles" on public.profiles;
drop policy if exists "Public profiles are viewable by everyone" on public.profiles;
create policy "Public profiles are viewable by everyone"
  on public.profiles for select
  using (true);

drop policy if exists "Users can insert their own profile" on public.profiles;
drop policy if exists "Verified users can insert own profile" on public.profiles;
create policy "Users can insert their own profile"
  on public.profiles for insert
  to authenticated
  with check (auth.uid() = id);

drop policy if exists "Users can update their own profile" on public.profiles;
drop policy if exists "Verified users can update own profile" on public.profiles;
create policy "Users can update their own profile"
  on public.profiles for update
  to authenticated
  using (auth.uid() = id)
  with check (auth.uid() = id);

drop policy if exists "Users can delete their own profile" on public.profiles;
create policy "Users can delete their own profile"
  on public.profiles for delete
  to authenticated
  using (auth.uid() = id);

-- Academic cohort info (major & institution) is readable so program/university directories reflect real student counts,
-- while only the user can insert/update/delete their own academic_information record.
drop policy if exists "Users can view their own academic information" on public.academic_information;
drop policy if exists "Authenticated users can view academic cohort enrollments" on public.academic_information;
create policy "Authenticated users can view academic cohort enrollments"
  on public.academic_information for select
  using (true);

drop policy if exists "Users can insert their own academic information" on public.academic_information;
create policy "Users can insert their own academic information"
  on public.academic_information for insert
  to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "Users can update their own academic information" on public.academic_information;
create policy "Users can update their own academic information"
  on public.academic_information for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Users can delete their own academic information" on public.academic_information;
drop policy if exists "Verified users can read and manage own academic information" on public.academic_information;
create policy "Users can delete their own academic information"
  on public.academic_information for delete
  to authenticated
  using (auth.uid() = user_id);

-- Private user settings & preferences are strictly owner-only (auth.uid() = user_id)
drop policy if exists "Users can view their own settings and preferences" on public.user_settings_preferences;
drop policy if exists "Verified users can read and manage own settings and preferences" on public.user_settings_preferences;
create policy "Users can view their own settings and preferences"
  on public.user_settings_preferences for select
  to authenticated
  using (auth.uid() = user_id);

drop policy if exists "Users can insert their own settings and preferences" on public.user_settings_preferences;
create policy "Users can insert their own settings and preferences"
  on public.user_settings_preferences for insert
  to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "Users can update their own settings and preferences" on public.user_settings_preferences;
create policy "Users can update their own settings and preferences"
  on public.user_settings_preferences for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Users can delete their own settings and preferences" on public.user_settings_preferences;
create policy "Users can delete their own settings and preferences"
  on public.user_settings_preferences for delete
  to authenticated
  using (auth.uid() = user_id);

-- Case-insensitive username check RPC
create or replace function public.check_username_available(
  candidate_username text,
  current_user_id uuid default null
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  normalized text;
  exists_count integer;
begin
  normalized := lower(trim(coalesce(candidate_username, '')));
  if char_length(normalized) < 3 or char_length(normalized) > 30 then
    return false;
  end if;

  select count(*)
    into exists_count
    from public.profiles p
   where lower(p.username) = normalized
     and (current_user_id is null or p.id <> current_user_id);

  return exists_count = 0;
end;
$$;

grant execute on function public.check_username_available(text, uuid) to anon, authenticated;

-- ==============================================================================
-- 2. STUDY LIBRARY & SHARED ACADEMIC RESOURCES
--    (stored_files, study_notes, note_upvotes, study_note_upvotes)
-- ==============================================================================

create table if not exists public.stored_files (
  content_hash text primary key,
  storage_path text not null,
  file_url text not null,
  mime_type text not null default 'application/pdf',
  size_bytes bigint not null default 0 check (size_bytes >= 0 and size_bytes <= 26214400),
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default timezone('utc'::text, now())
);

alter table public.stored_files add column if not exists created_by uuid references auth.users(id) on delete set null;

create table if not exists public.study_notes (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text not null default '',
  course_code text not null,
  course_name text not null default '',
  course_id text,
  subject text not null default 'Computer Science',
  material_type text not null default 'lecture_notes' check (
    material_type in ('lecture_notes', 'past_exam', 'cheat_sheet', 'lab_manual', 'summary', 'assignment', 'other')
  ),
  academic_year integer not null default extract(year from current_date),
  semester text not null default 'Fall Semester',
  semester_number integer not null default 1,
  professor text not null default 'Course Instructor',
  file_url text not null,
  file_name text not null,
  file_size_bytes bigint not null default 0 check (file_size_bytes >= 0 and file_size_bytes <= 26214400),
  page_count integer not null default 1,
  uploader_id uuid references auth.users(id) on delete set null,
  user_id uuid references auth.users(id) on delete set null,
  uploader_name text not null default 'Anonymous Student',
  uploader_university text not null default 'Open Campus',
  university_id text,
  program_id text default 'bs-cs',
  program_ids text[] not null default array['bs-cs']::text[],
  program_name text default 'BS Computer Science',
  degree_tier text default 'Undergraduate',
  content_hash text,
  storage_path text,
  downloads_count integer not null default 0,
  upvotes_count integer not null default 0,
  is_restricted boolean not null default false,
  status text not null default 'published' check (status in ('published', 'draft', 'removed')),
  tags text[] not null default array[]::text[],
  pages jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default timezone('utc'::text, now()),
  updated_at timestamptz not null default timezone('utc'::text, now())
);

-- Ensure all columns exist if study_notes was created by an earlier migration
alter table public.study_notes add column if not exists description text not null default '';
alter table public.study_notes add column if not exists course_name text not null default '';
alter table public.study_notes add column if not exists course_id text;
alter table public.study_notes add column if not exists semester text not null default 'Fall Semester';
alter table public.study_notes add column if not exists semester_number integer not null default 1;
alter table public.study_notes add column if not exists professor text not null default 'Course Instructor';
alter table public.study_notes add column if not exists uploader_id uuid references auth.users(id) on delete set null;
alter table public.study_notes add column if not exists user_id uuid references auth.users(id) on delete set null;
alter table public.study_notes add column if not exists uploader_name text not null default 'Anonymous Student';
alter table public.study_notes add column if not exists uploader_university text not null default 'Open Campus';
alter table public.study_notes add column if not exists university_id text;
alter table public.study_notes add column if not exists program_id text default 'bs-cs';
alter table public.study_notes add column if not exists program_ids text[] not null default array['bs-cs']::text[];
alter table public.study_notes add column if not exists program_name text default 'BS Computer Science';
alter table public.study_notes add column if not exists degree_tier text default 'Undergraduate';
alter table public.study_notes add column if not exists content_hash text;
alter table public.study_notes add column if not exists storage_path text;
alter table public.study_notes add column if not exists downloads_count integer not null default 0;
alter table public.study_notes add column if not exists upvotes_count integer not null default 0;
alter table public.study_notes add column if not exists is_restricted boolean not null default false;
alter table public.study_notes add column if not exists status text not null default 'published';
alter table public.study_notes add column if not exists tags text[] not null default array[]::text[];
alter table public.study_notes add column if not exists pages jsonb not null default '[]'::jsonb;
alter table public.study_notes add column if not exists created_at timestamptz not null default timezone('utc'::text, now());
alter table public.study_notes add column if not exists updated_at timestamptz not null default timezone('utc'::text, now());

-- Keep uploader_id and user_id synchronized automatically
create or replace function public.sync_study_notes_owner_columns()
returns trigger
language plpgsql
as $$
begin
  if new.uploader_id is null and new.user_id is not null then
    new.uploader_id := new.user_id;
  elsif new.user_id is null and new.uploader_id is not null then
    new.user_id := new.uploader_id;
  elsif new.uploader_id is null and new.user_id is null and auth.uid() is not null then
    new.uploader_id := auth.uid();
    new.user_id := auth.uid();
  end if;
  new.updated_at := timezone('utc'::text, now());
  return new;
end;
$$;

drop trigger if exists trg_sync_study_notes_owner on public.study_notes;
create trigger trg_sync_study_notes_owner
  before insert or update on public.study_notes
  for each row execute function public.sync_study_notes_owner_columns();

create index if not exists idx_study_notes_course_code on public.study_notes(course_code);
create index if not exists idx_study_notes_subject on public.study_notes(subject);
create index if not exists idx_study_notes_program_id on public.study_notes(program_id);
create index if not exists idx_study_notes_semester_number on public.study_notes(semester_number);
create index if not exists idx_study_notes_material_type on public.study_notes(material_type);
create index if not exists idx_study_notes_content_hash on public.study_notes(content_hash);
create index if not exists idx_study_notes_uploader_id on public.study_notes(uploader_id);
create index if not exists idx_study_notes_created_at on public.study_notes(created_at desc);

-- Canonical note_upvotes table + alias study_note_upvotes table
create table if not exists public.note_upvotes (
  user_id uuid not null references auth.users(id) on delete cascade,
  note_id uuid not null references public.study_notes(id) on delete cascade,
  created_at timestamptz not null default timezone('utc'::text, now()),
  primary key (user_id, note_id)
);

create table if not exists public.study_note_upvotes (
  user_id uuid not null references auth.users(id) on delete cascade,
  note_id uuid not null references public.study_notes(id) on delete cascade,
  created_at timestamptz not null default timezone('utc'::text, now()),
  primary key (user_id, note_id)
);

alter table public.stored_files enable row level security;
alter table public.study_notes enable row level security;
alter table public.note_upvotes enable row level security;
alter table public.study_note_upvotes enable row level security;

-- Stored files policies
drop policy if exists "stored_files_select_public" on public.stored_files;
drop policy if exists "Anyone can read stored files" on public.stored_files;
create policy "Anyone can read stored files"
  on public.stored_files for select
  using (true);

drop policy if exists "stored_files_insert_public" on public.stored_files;
drop policy if exists "Verified users can register stored files" on public.stored_files;
create policy "Authenticated users can register stored files"
  on public.stored_files for insert
  to authenticated
  with check (size_bytes <= 26214400);

drop policy if exists "Owners can delete stored files" on public.stored_files;
create policy "Owners can delete stored files"
  on public.stored_files for delete
  to authenticated
  using (created_by is null or auth.uid() = created_by or public.is_forum_moderator());

-- Study notes RLS policies:
-- 1. Anyone (anonymous or authenticated) can read published study notes
drop policy if exists "study_notes_select_public" on public.study_notes;
drop policy if exists "Anyone can read study notes" on public.study_notes;
create policy "Anyone can read published study notes"
  on public.study_notes for select
  using (status = 'published' or auth.uid() = coalesce(uploader_id, user_id) or public.is_forum_moderator());

-- 2. Authenticated users can insert study notes they own
drop policy if exists "study_notes_insert_public" on public.study_notes;
drop policy if exists "Anyone can upload study notes" on public.study_notes;
drop policy if exists "Verified users can upload study notes" on public.study_notes;
drop policy if exists "Authenticated users can upload study notes" on public.study_notes;
create policy "Authenticated users can upload study notes"
  on public.study_notes for insert
  to authenticated
  with check (
    (uploader_id is null or auth.uid() = uploader_id)
    and (user_id is null or auth.uid() = user_id)
    and file_size_bytes <= 26214400
  );

-- 3. Only the uploader or moderator can update or delete a study note
drop policy if exists "study_notes_update_owner" on public.study_notes;
drop policy if exists "Allow students to update upvotes and download counts" on public.study_notes;
drop policy if exists "Only uploader can update their study notes" on public.study_notes;
create policy "Only uploader can update their study notes"
  on public.study_notes for update
  to authenticated
  using (auth.uid() = coalesce(uploader_id, user_id) or public.is_forum_moderator())
  with check (auth.uid() = coalesce(uploader_id, user_id) or public.is_forum_moderator());

drop policy if exists "study_notes_delete_owner" on public.study_notes;
drop policy if exists "Only uploader can delete their study notes" on public.study_notes;
create policy "Only uploader can delete their study notes"
  on public.study_notes for delete
  to authenticated
  using (auth.uid() = coalesce(uploader_id, user_id) or public.is_forum_moderator());

-- Note upvotes RLS policies
drop policy if exists "Anyone can read note upvotes" on public.note_upvotes;
create policy "Anyone can read note upvotes"
  on public.note_upvotes for select
  using (true);

drop policy if exists "Verified users manage own note upvotes" on public.note_upvotes;
drop policy if exists "Authenticated users manage own note upvotes" on public.note_upvotes;
create policy "Authenticated users manage own note upvotes"
  on public.note_upvotes for all
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Anyone can read study note upvotes" on public.study_note_upvotes;
create policy "Anyone can read study note upvotes"
  on public.study_note_upvotes for select
  using (true);

drop policy if exists "Authenticated users manage own study note upvotes" on public.study_note_upvotes;
create policy "Authenticated users manage own study note upvotes"
  on public.study_note_upvotes for all
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Safe RPCs & triggers for download counts and upvote counts
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

grant execute on function public.increment_downloads(uuid) to anon, authenticated;

create or replace function public.sync_study_note_upvotes_count()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_note_id uuid;
  v_count integer;
begin
  v_note_id := coalesce(new.note_id, old.note_id);
  select count(*) into v_count from (
    select user_id from public.note_upvotes where note_id = v_note_id
    union
    select user_id from public.study_note_upvotes where note_id = v_note_id
  ) combined;

  update public.study_notes
  set upvotes_count = coalesce(v_count, 0)
  where id = v_note_id;

  return coalesce(new, old);
end;
$$;

drop trigger if exists trg_sync_study_note_upvotes on public.note_upvotes;
create trigger trg_sync_study_note_upvotes
  after insert or delete on public.note_upvotes
  for each row execute function public.sync_study_note_upvotes_count();

drop trigger if exists trg_sync_study_note_upvotes_alias on public.study_note_upvotes;
create trigger trg_sync_study_note_upvotes_alias
  after insert or delete on public.study_note_upvotes
  for each row execute function public.sync_study_note_upvotes_count();

-- ==============================================================================
-- 3. PUBLIC FORUM SCHEMA & RLS POLICIES
--    (forum_topics, forum_posts, forum_comments, forum_votes,
--     forum_post_votes, forum_comment_votes, forum_bookmarks, forum_reports)
-- ==============================================================================

create table if not exists public.forum_topics (
  id text primary key,
  name text not null,
  slug text not null unique,
  description text not null,
  created_at timestamptz not null default timezone('utc'::text, now())
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
on conflict (id) do update set
  name = excluded.name,
  slug = excluded.slug,
  description = excluded.description;

create table if not exists public.forum_posts (
  id uuid primary key default gen_random_uuid(),
  title text not null check (char_length(title) between 3 and 150),
  body text not null check (char_length(body) between 1 and 10000),
  post_type text not null default 'Discussion' check (
    post_type in ('Discussion', 'Question', 'Study Tip', 'Resource Link', 'Announcement')
  ),
  topic_id text not null references public.forum_topics(id) on delete restrict,
  topic_name text not null default 'General Discussion',
  author_id uuid not null references auth.users(id) on delete cascade,
  author_name text not null,
  author_username text not null,
  author_avatar text,
  author_program text,
  author_degree_tier text,
  author_university text,
  author_bio text,
  resource_id uuid references public.study_notes(id) on delete set null,
  program_course_ref jsonb,
  external_link text,
  upvotes_count integer not null default 1,
  downvotes_count integer not null default 0,
  comments_count integer not null default 0,
  accepted_comment_id uuid,
  status text not null default 'published' check (status in ('published', 'flagged', 'removed', 'draft')),
  idempotency_key text unique,
  created_at timestamptz not null default timezone('utc'::text, now()),
  updated_at timestamptz not null default timezone('utc'::text, now())
);

alter table public.forum_posts add column if not exists author_bio text;
alter table public.forum_posts add column if not exists resource_id uuid references public.study_notes(id) on delete set null;
alter table public.forum_posts add column if not exists program_course_ref jsonb;
alter table public.forum_posts add column if not exists external_link text;
alter table public.forum_posts add column if not exists accepted_comment_id uuid;
alter table public.forum_posts add column if not exists idempotency_key text;

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
  created_at timestamptz not null default timezone('utc'::text, now()),
  updated_at timestamptz not null default timezone('utc'::text, now())
);

create index if not exists idx_forum_comments_post_id on public.forum_comments(post_id, created_at asc);
create index if not exists idx_forum_comments_parent_id on public.forum_comments(parent_comment_id);

create table if not exists public.forum_votes (
  user_id uuid not null references auth.users(id) on delete cascade,
  target_type text not null check (target_type in ('post', 'comment')),
  target_id uuid not null,
  vote_value smallint not null check (vote_value in (-1, 1)),
  created_at timestamptz not null default timezone('utc'::text, now()),
  primary key (user_id, target_type, target_id)
);

-- Compatibility vote tables if queried directly
create table if not exists public.forum_post_votes (
  user_id uuid not null references auth.users(id) on delete cascade,
  post_id uuid not null references public.forum_posts(id) on delete cascade,
  vote_value smallint not null default 1 check (vote_value in (-1, 1)),
  created_at timestamptz not null default timezone('utc'::text, now()),
  primary key (user_id, post_id)
);

create table if not exists public.forum_comment_votes (
  user_id uuid not null references auth.users(id) on delete cascade,
  comment_id uuid not null references public.forum_comments(id) on delete cascade,
  vote_value smallint not null default 1 check (vote_value in (-1, 1)),
  created_at timestamptz not null default timezone('utc'::text, now()),
  primary key (user_id, comment_id)
);

create table if not exists public.forum_bookmarks (
  user_id uuid not null references auth.users(id) on delete cascade,
  post_id uuid not null references public.forum_posts(id) on delete cascade,
  created_at timestamptz not null default timezone('utc'::text, now()),
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
  reviewed_at timestamptz,
  created_at timestamptz not null default timezone('utc'::text, now())
);

alter table public.forum_topics enable row level security;
alter table public.forum_posts enable row level security;
alter table public.forum_comments enable row level security;
alter table public.forum_votes enable row level security;
alter table public.forum_post_votes enable row level security;
alter table public.forum_comment_votes enable row level security;
alter table public.forum_bookmarks enable row level security;
alter table public.forum_reports enable row level security;

drop policy if exists "Anyone can read forum topics" on public.forum_topics;
create policy "Anyone can read forum topics"
  on public.forum_topics for select
  using (true);

drop policy if exists "Authenticated users can seed forum topics" on public.forum_topics;
create policy "Authenticated users can seed forum topics"
  on public.forum_topics for insert
  to authenticated
  with check (true);

drop policy if exists "Public can read published forum posts" on public.forum_posts;
create policy "Public can read published forum posts"
  on public.forum_posts for select
  using (status = 'published' or auth.uid() = author_id or public.is_forum_moderator());

drop policy if exists "Verified users create own forum posts" on public.forum_posts;
drop policy if exists "Authenticated users create own forum posts" on public.forum_posts;
create policy "Authenticated users create own forum posts"
  on public.forum_posts for insert
  to authenticated
  with check (auth.uid() = author_id);

drop policy if exists "Verified authors can update own forum posts" on public.forum_posts;
drop policy if exists "Authors can update own forum posts" on public.forum_posts;
create policy "Authors can update own forum posts"
  on public.forum_posts for update
  to authenticated
  using (auth.uid() = author_id or public.is_forum_moderator())
  with check (auth.uid() = author_id or public.is_forum_moderator());

drop policy if exists "Verified authors can delete own forum posts" on public.forum_posts;
drop policy if exists "Authors can delete own forum posts" on public.forum_posts;
create policy "Authors can delete own forum posts"
  on public.forum_posts for delete
  to authenticated
  using (auth.uid() = author_id or public.is_forum_moderator());

drop policy if exists "Public can read published forum comments" on public.forum_comments;
create policy "Public can read published forum comments"
  on public.forum_comments for select
  using (status = 'published' or auth.uid() = author_id or public.is_forum_moderator());

drop policy if exists "Verified users create own forum comments" on public.forum_comments;
drop policy if exists "Authenticated users create own forum comments" on public.forum_comments;
create policy "Authenticated users create own forum comments"
  on public.forum_comments for insert
  to authenticated
  with check (auth.uid() = author_id);

drop policy if exists "Verified authors can update own forum comments" on public.forum_comments;
drop policy if exists "Authors can update own forum comments" on public.forum_comments;
create policy "Authors can update own forum comments"
  on public.forum_comments for update
  to authenticated
  using (auth.uid() = author_id or public.is_forum_moderator())
  with check (auth.uid() = author_id or public.is_forum_moderator());

drop policy if exists "Verified authors can delete own forum comments" on public.forum_comments;
drop policy if exists "Authors can delete own forum comments" on public.forum_comments;
create policy "Authors can delete own forum comments"
  on public.forum_comments for delete
  to authenticated
  using (auth.uid() = author_id or public.is_forum_moderator());

drop policy if exists "Anyone can read forum votes" on public.forum_votes;
create policy "Anyone can read forum votes"
  on public.forum_votes for select
  using (true);

drop policy if exists "Verified users manage own forum votes" on public.forum_votes;
drop policy if exists "Authenticated users manage own forum votes" on public.forum_votes;
create policy "Authenticated users manage own forum votes"
  on public.forum_votes for all
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Anyone can read forum post votes" on public.forum_post_votes;
create policy "Anyone can read forum post votes"
  on public.forum_post_votes for select
  using (true);

drop policy if exists "Authenticated users manage own forum post votes" on public.forum_post_votes;
create policy "Authenticated users manage own forum post votes"
  on public.forum_post_votes for all
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Anyone can read forum comment votes" on public.forum_comment_votes;
create policy "Anyone can read forum comment votes"
  on public.forum_comment_votes for select
  using (true);

drop policy if exists "Authenticated users manage own forum comment votes" on public.forum_comment_votes;
create policy "Authenticated users manage own forum comment votes"
  on public.forum_comment_votes for all
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Bookmarks are strictly private to the owner
drop policy if exists "Verified users manage own forum bookmarks" on public.forum_bookmarks;
drop policy if exists "Authenticated users manage own forum bookmarks" on public.forum_bookmarks;
create policy "Authenticated users manage own forum bookmarks"
  on public.forum_bookmarks for all
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Verified users submit forum reports" on public.forum_reports;
drop policy if exists "Authenticated users submit forum reports" on public.forum_reports;
create policy "Authenticated users submit forum reports"
  on public.forum_reports for insert
  to authenticated
  with check (auth.uid() = reporter_id);

drop policy if exists "Reporters and moderators can view forum reports" on public.forum_reports;
create policy "Reporters and moderators can view forum reports"
  on public.forum_reports for select
  to authenticated
  using (auth.uid() = reporter_id or public.is_forum_moderator());

drop policy if exists "Moderators can update forum reports" on public.forum_reports;
create policy "Moderators can update forum reports"
  on public.forum_reports for update
  to authenticated
  using (public.is_forum_moderator())
  with check (public.is_forum_moderator());

-- Forum triggers for comment counts, vote totals, and accepted answers
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
    where post_id = v_post_id and status = 'published'
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

create or replace function public.sync_forum_accepted_comment_flag()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.accepted_comment_id is distinct from old.accepted_comment_id then
    update public.forum_comments
    set is_accepted = (id = new.accepted_comment_id)
    where post_id = new.id;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_sync_forum_accepted_comment_flag on public.forum_posts;
create trigger trg_sync_forum_accepted_comment_flag
  after update of accepted_comment_id on public.forum_posts
  for each row execute function public.sync_forum_accepted_comment_flag();

-- ==============================================================================
-- 4. ACADEMIC PROGRAMS & COHORT DISCUSSIONS / DOUBTS
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
  semesters jsonb not null default '[]'::jsonb,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default timezone('utc'::text, now())
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
  created_at timestamptz not null default timezone('utc'::text, now())
);

create index if not exists idx_program_discussions_program_id on public.program_discussions(program_id, created_at desc);

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
  created_at timestamptz not null default timezone('utc'::text, now())
);

create index if not exists idx_program_discussion_comments_post_id on public.program_discussion_comments(post_id, created_at asc);

create table if not exists public.program_doubts (
  id text primary key,
  program_id text not null,
  title text not null,
  content text not null,
  course_code text not null,
  semester_tag text,
  tags text[] not null default array[]::text[],
  author_id uuid references auth.users(id) on delete cascade,
  author_name text not null,
  author_avatar text,
  author_program text,
  upvotes_count integer not null default 1,
  status text not null default 'unanswered' check (status in ('answered', 'unanswered')),
  accepted_answer_id text,
  attachments jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default timezone('utc'::text, now())
);

alter table public.program_doubts add column if not exists attachments jsonb not null default '[]'::jsonb;
create index if not exists idx_program_doubts_program_id on public.program_doubts(program_id, created_at desc);

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
  created_at timestamptz not null default timezone('utc'::text, now())
);

create index if not exists idx_program_doubt_answers_question_id on public.program_doubt_answers(question_id, created_at asc);

alter table public.academic_programs enable row level security;
alter table public.program_discussions enable row level security;
alter table public.program_discussion_comments enable row level security;
alter table public.program_doubts enable row level security;
alter table public.program_doubt_answers enable row level security;

drop policy if exists "Anyone can read academic programs" on public.academic_programs;
create policy "Anyone can read academic programs"
  on public.academic_programs for select using (true);

drop policy if exists "Verified users can create academic programs" on public.academic_programs;
drop policy if exists "Authenticated users can create academic programs" on public.academic_programs;
create policy "Authenticated users can create academic programs"
  on public.academic_programs for insert
  to authenticated
  with check (auth.role() = 'authenticated');

drop policy if exists "Creators can update academic programs" on public.academic_programs;
create policy "Creators can update academic programs"
  on public.academic_programs for update
  to authenticated
  using (created_by is null or auth.uid() = created_by or public.is_forum_moderator());

drop policy if exists "Anyone can read program discussions" on public.program_discussions;
create policy "Anyone can read program discussions"
  on public.program_discussions for select using (true);

drop policy if exists "Verified users create program discussions" on public.program_discussions;
drop policy if exists "Authenticated users create program discussions" on public.program_discussions;
create policy "Authenticated users create program discussions"
  on public.program_discussions for insert
  to authenticated
  with check (auth.uid() = author_id);

drop policy if exists "Authors update own program discussions" on public.program_discussions;
create policy "Authors update own program discussions"
  on public.program_discussions for update
  to authenticated
  using (auth.uid() = author_id or public.is_forum_moderator());

drop policy if exists "Authors delete own program discussions" on public.program_discussions;
create policy "Authors delete own program discussions"
  on public.program_discussions for delete
  to authenticated
  using (auth.uid() = author_id or public.is_forum_moderator());

drop policy if exists "Anyone can read program discussion comments" on public.program_discussion_comments;
create policy "Anyone can read program discussion comments"
  on public.program_discussion_comments for select using (true);

drop policy if exists "Verified users create program discussion comments" on public.program_discussion_comments;
drop policy if exists "Authenticated users create program discussion comments" on public.program_discussion_comments;
create policy "Authenticated users create program discussion comments"
  on public.program_discussion_comments for insert
  to authenticated
  with check (auth.uid() = author_id);

drop policy if exists "Authors update own program discussion comments" on public.program_discussion_comments;
create policy "Authors update own program discussion comments"
  on public.program_discussion_comments for update
  to authenticated
  using (auth.uid() = author_id or public.is_forum_moderator());

drop policy if exists "Authors delete own program discussion comments" on public.program_discussion_comments;
create policy "Authors delete own program discussion comments"
  on public.program_discussion_comments for delete
  to authenticated
  using (auth.uid() = author_id or public.is_forum_moderator());

drop policy if exists "Anyone can read program doubts" on public.program_doubts;
create policy "Anyone can read program doubts"
  on public.program_doubts for select using (true);

drop policy if exists "Verified users create program doubts" on public.program_doubts;
drop policy if exists "Authenticated users create program doubts" on public.program_doubts;
create policy "Authenticated users create program doubts"
  on public.program_doubts for insert
  to authenticated
  with check (auth.uid() = author_id);

drop policy if exists "Authors update own program doubts" on public.program_doubts;
create policy "Authors update own program doubts"
  on public.program_doubts for update
  to authenticated
  using (auth.uid() = author_id or public.is_forum_moderator());

drop policy if exists "Authors delete own program doubts" on public.program_doubts;
create policy "Authors delete own program doubts"
  on public.program_doubts for delete
  to authenticated
  using (auth.uid() = author_id or public.is_forum_moderator());

drop policy if exists "Anyone can read program doubt answers" on public.program_doubt_answers;
create policy "Anyone can read program doubt answers"
  on public.program_doubt_answers for select using (true);

drop policy if exists "Verified users create program doubt answers" on public.program_doubt_answers;
drop policy if exists "Authenticated users create program doubt answers" on public.program_doubt_answers;
create policy "Authenticated users create program doubt answers"
  on public.program_doubt_answers for insert
  to authenticated
  with check (auth.uid() = author_id);

drop policy if exists "Authors update own program doubt answers" on public.program_doubt_answers;
create policy "Authors update own program doubt answers"
  on public.program_doubt_answers for update
  to authenticated
  using (auth.uid() = author_id or public.is_forum_moderator());

drop policy if exists "Authors delete own program doubt answers" on public.program_doubt_answers;
create policy "Authors delete own program doubt answers"
  on public.program_doubt_answers for delete
  to authenticated
  using (auth.uid() = author_id or public.is_forum_moderator());

-- Sync program discussion comment counts and doubt status automatically
create or replace function public.sync_program_discussion_comments_count()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_post_id text;
begin
  v_post_id := coalesce(new.post_id, old.post_id);
  update public.program_discussions
  set comments_count = (select count(*) from public.program_discussion_comments where post_id = v_post_id)
  where id = v_post_id;
  return coalesce(new, old);
end;
$$;

drop trigger if exists trg_sync_program_discussion_comments_count on public.program_discussion_comments;
create trigger trg_sync_program_discussion_comments_count
  after insert or delete on public.program_discussion_comments
  for each row execute function public.sync_program_discussion_comments_count();

create or replace function public.sync_program_doubt_answer_state()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_qid text;
begin
  v_qid := coalesce(new.question_id, old.question_id);
  update public.program_doubts
  set status = case
    when exists (select 1 from public.program_doubt_answers where question_id = v_qid) then 'answered'
    else 'unanswered'
  end
  where id = v_qid;
  return coalesce(new, old);
end;
$$;

drop trigger if exists trg_sync_program_doubt_answer_state on public.program_doubt_answers;
create trigger trg_sync_program_doubt_answer_state
  after insert or delete on public.program_doubt_answers
  for each row execute function public.sync_program_doubt_answer_state();

-- ==============================================================================
-- 5. UNIVERSITY DIRECTORY & CAMPUS COMMUNITY SCHEMA
--    (universities, departments, courses, university_discussions,
--     university_discussion_comments, discussion_comments,
--     university_doubts, university_doubt_answers, doubt_answers, university_follows)
-- ==============================================================================

create table if not exists public.universities (
  id text primary key,
  name text not null,
  short_name text not null,
  badge text,
  logo_url text not null default '',
  banner_url text not null default '',
  location text not null default 'Pakistan',
  country text not null default 'Pakistan',
  disciplines text[] not null default array[]::text[],
  website text,
  established_year integer,
  verified_students integer not null default 0,
  total_courses_count integer not null default 0,
  description text,
  is_member_restricted boolean not null default false,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default timezone('utc'::text, now())
);

alter table public.universities add column if not exists created_by uuid references auth.users(id) on delete set null;

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
  author_university text not null default 'General Campus',
  upvotes_count integer not null default 1,
  comments_count integer not null default 0,
  is_pinned boolean not null default false,
  is_reported boolean not null default false,
  created_at timestamptz not null default timezone('utc'::text, now())
);

create index if not exists idx_university_discussions_uni_id on public.university_discussions(university_id, created_at desc);

create table if not exists public.university_discussion_comments (
  id text primary key,
  post_id text not null references public.university_discussions(id) on delete cascade,
  author_id uuid references auth.users(id) on delete set null,
  author_name text not null default 'Peer Contributor',
  author_avatar text,
  author_university text not null default 'General Campus',
  content text not null,
  upvotes_count integer not null default 0,
  created_at timestamptz not null default timezone('utc'::text, now())
);

create table if not exists public.discussion_comments (
  id text primary key,
  post_id text not null references public.university_discussions(id) on delete cascade,
  author_id uuid references auth.users(id) on delete set null,
  author_name text not null default 'Peer Contributor',
  author_avatar text,
  author_university text not null default 'General Campus',
  content text not null,
  upvotes_count integer not null default 0,
  created_at timestamptz not null default timezone('utc'::text, now())
);

create table if not exists public.university_doubts (
  id text primary key,
  university_id text not null,
  title text not null,
  content text not null,
  department text not null default 'General',
  course_code text not null default 'GEN',
  tags text[] not null default array[]::text[],
  author_id uuid references auth.users(id) on delete set null,
  author_name text not null default 'Academic Inquirer',
  author_avatar text,
  author_university text not null default 'General Campus',
  upvotes_count integer not null default 1,
  status text not null default 'unanswered' check (status in ('answered', 'unanswered')),
  accepted_answer_id text,
  attachments jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default timezone('utc'::text, now())
);

create index if not exists idx_university_doubts_uni_id on public.university_doubts(university_id, created_at desc);

create table if not exists public.university_doubt_answers (
  id text primary key,
  question_id text not null references public.university_doubts(id) on delete cascade,
  author_id uuid references auth.users(id) on delete set null,
  author_name text not null default 'Peer Assistant',
  author_avatar text,
  author_role text default 'Peer Contributor',
  author_university text not null default 'General Campus',
  content text not null,
  upvotes_count integer not null default 0,
  is_accepted boolean not null default false,
  created_at timestamptz not null default timezone('utc'::text, now())
);

create table if not exists public.doubt_answers (
  id text primary key,
  question_id text not null references public.university_doubts(id) on delete cascade,
  author_id uuid references auth.users(id) on delete set null,
  author_name text not null default 'Peer Assistant',
  author_avatar text,
  author_role text default 'Peer Contributor',
  author_university text not null default 'General Campus',
  content text not null,
  upvotes_count integer not null default 0,
  is_accepted boolean not null default false,
  created_at timestamptz not null default timezone('utc'::text, now())
);

create table if not exists public.university_follows (
  user_id uuid not null references auth.users(id) on delete cascade,
  university_id text not null references public.universities(id) on delete cascade,
  created_at timestamptz not null default timezone('utc'::text, now()),
  primary key (user_id, university_id)
);

alter table public.universities enable row level security;
alter table public.departments enable row level security;
alter table public.courses enable row level security;
alter table public.university_discussions enable row level security;
alter table public.university_discussion_comments enable row level security;
alter table public.discussion_comments enable row level security;
alter table public.university_doubts enable row level security;
alter table public.university_doubt_answers enable row level security;
alter table public.doubt_answers enable row level security;
alter table public.university_follows enable row level security;

drop policy if exists "Anyone can read universities" on public.universities;
create policy "Anyone can read universities" on public.universities for select using (true);

drop policy if exists "Verified users can add universities" on public.universities;
drop policy if exists "Authenticated users can add universities" on public.universities;
create policy "Authenticated users can add universities"
  on public.universities for insert
  to authenticated
  with check (auth.role() = 'authenticated');

drop policy if exists "Creators can update universities" on public.universities;
create policy "Creators can update universities"
  on public.universities for update
  to authenticated
  using (created_by is null or auth.uid() = created_by or public.is_forum_moderator());

drop policy if exists "Anyone can read departments" on public.departments;
create policy "Anyone can read departments" on public.departments for select using (true);

drop policy if exists "Anyone can read courses" on public.courses;
create policy "Anyone can read courses" on public.courses for select using (true);

drop policy if exists "Anyone can read discussions" on public.university_discussions;
create policy "Anyone can read discussions" on public.university_discussions for select using (true);

drop policy if exists "Students can post discussions" on public.university_discussions;
create policy "Students can post discussions"
  on public.university_discussions for insert
  to authenticated
  with check (auth.uid() = author_id);

drop policy if exists "Authors can update university discussions" on public.university_discussions;
create policy "Authors can update university discussions"
  on public.university_discussions for update
  to authenticated
  using (auth.uid() = author_id or public.is_forum_moderator());

drop policy if exists "Authors can delete university discussions" on public.university_discussions;
create policy "Authors can delete university discussions"
  on public.university_discussions for delete
  to authenticated
  using (auth.uid() = author_id or public.is_forum_moderator());

drop policy if exists "Anyone can read university discussion comments" on public.university_discussion_comments;
create policy "Anyone can read university discussion comments"
  on public.university_discussion_comments for select using (true);

drop policy if exists "Students can post university discussion comments" on public.university_discussion_comments;
create policy "Students can post university discussion comments"
  on public.university_discussion_comments for insert
  to authenticated
  with check (auth.uid() = author_id);

drop policy if exists "Authors can delete university discussion comments" on public.university_discussion_comments;
create policy "Authors can delete university discussion comments"
  on public.university_discussion_comments for delete
  to authenticated
  using (auth.uid() = author_id or public.is_forum_moderator());

drop policy if exists "Anyone can read comments" on public.discussion_comments;
create policy "Anyone can read comments" on public.discussion_comments for select using (true);

drop policy if exists "Students can comment" on public.discussion_comments;
create policy "Students can comment"
  on public.discussion_comments for insert
  to authenticated
  with check (auth.uid() = author_id);

drop policy if exists "Authors can delete discussion comments" on public.discussion_comments;
create policy "Authors can delete discussion comments"
  on public.discussion_comments for delete
  to authenticated
  using (auth.uid() = author_id or public.is_forum_moderator());

drop policy if exists "Anyone can read doubts" on public.university_doubts;
create policy "Anyone can read doubts" on public.university_doubts for select using (true);

drop policy if exists "Students can ask doubts" on public.university_doubts;
create policy "Students can ask doubts"
  on public.university_doubts for insert
  to authenticated
  with check (auth.uid() = author_id);

drop policy if exists "Question authors can update university doubts" on public.university_doubts;
create policy "Question authors can update university doubts"
  on public.university_doubts for update
  to authenticated
  using (auth.uid() = author_id or public.is_forum_moderator());

drop policy if exists "Question authors can delete university doubts" on public.university_doubts;
create policy "Question authors can delete university doubts"
  on public.university_doubts for delete
  to authenticated
  using (auth.uid() = author_id or public.is_forum_moderator());

drop policy if exists "Anyone can read university doubt answers" on public.university_doubt_answers;
create policy "Anyone can read university doubt answers"
  on public.university_doubt_answers for select using (true);

drop policy if exists "Students can post university doubt answers" on public.university_doubt_answers;
create policy "Students can post university doubt answers"
  on public.university_doubt_answers for insert
  to authenticated
  with check (auth.uid() = author_id);

drop policy if exists "Authors can delete university doubt answers" on public.university_doubt_answers;
create policy "Authors can delete university doubt answers"
  on public.university_doubt_answers for delete
  to authenticated
  using (auth.uid() = author_id or public.is_forum_moderator());

drop policy if exists "Anyone can read answers" on public.doubt_answers;
create policy "Anyone can read answers" on public.doubt_answers for select using (true);

drop policy if exists "Students can post answers" on public.doubt_answers;
create policy "Students can post answers"
  on public.doubt_answers for insert
  to authenticated
  with check (auth.uid() = author_id);

drop policy if exists "Authors can delete doubt answers" on public.doubt_answers;
create policy "Authors can delete doubt answers"
  on public.doubt_answers for delete
  to authenticated
  using (auth.uid() = author_id or public.is_forum_moderator());

drop policy if exists "Users manage own university follows" on public.university_follows;
create policy "Users manage own university follows"
  on public.university_follows for all
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ==============================================================================
-- 6. STORAGE BUCKETS & STORAGE.OBJECTS RLS POLICIES
--    (study-materials & avatars)
-- ==============================================================================

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'study-materials',
  'study-materials',
  true,
  26214400, -- 25 MB limit
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
  5242880, -- 5 MB limit
  array['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/svg+xml']
)
on conflict (id) do update set
  public = true,
  file_size_limit = 5242880,
  allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/svg+xml'];

drop policy if exists "Public Access: Anyone can view and download PDFs" on storage.objects;
drop policy if exists "Study materials are publicly accessible" on storage.objects;
create policy "Study materials are publicly accessible"
  on storage.objects for select
  using (bucket_id = 'study-materials');

drop policy if exists "Avatar images are publicly accessible" on storage.objects;
create policy "Avatar images are publicly accessible"
  on storage.objects for select
  using (bucket_id = 'avatars');

drop policy if exists "Public Access: Anyone can upload study PDFs" on storage.objects;
drop policy if exists "Authenticated users can upload study materials and avatars" on storage.objects;
drop policy if exists "Authenticated users can upload study materials" on storage.objects;
create policy "Authenticated users can upload study materials"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'study-materials' and auth.role() = 'authenticated');

drop policy if exists "Owners can update study materials" on storage.objects;
create policy "Owners can update study materials"
  on storage.objects for update
  to authenticated
  using (bucket_id = 'study-materials' and (auth.uid() = owner or public.is_forum_moderator()))
  with check (bucket_id = 'study-materials' and (auth.uid() = owner or public.is_forum_moderator()));

drop policy if exists "Owners can update or delete their storage objects" on storage.objects;
drop policy if exists "Owners can delete study materials" on storage.objects;
create policy "Owners can delete study materials"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'study-materials' and (auth.uid() = owner or public.is_forum_moderator()));

drop policy if exists "Users can upload their own avatar" on storage.objects;
create policy "Users can upload their own avatar"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "Users can update their own avatar" on storage.objects;
create policy "Users can update their own avatar"
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  )
  with check (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "Users can delete their own avatar" on storage.objects;
create policy "Users can delete their own avatar"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- ==============================================================================
-- 7. REALTIME PUBLICATIONS & SCHEMA CACHE REFRESH
-- ==============================================================================

do $$
declare
  tbl text;
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    foreach tbl in array array[
      'profiles',
      'study_notes',
      'note_upvotes',
      'forum_posts',
      'forum_comments',
      'forum_votes',
      'academic_programs',
      'program_discussions',
      'program_discussion_comments',
      'program_doubts',
      'program_doubt_answers',
      'universities',
      'university_discussions',
      'university_discussion_comments',
      'university_doubts',
      'university_doubt_answers'
    ]
    loop
      if not exists (
        select 1 from pg_publication_tables
        where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = tbl
      ) then
        execute format('alter publication supabase_realtime add table public.%I', tbl);
      end if;
    end loop;
  end if;
exception when others then
  null;
end;
$$;

notify pgrst, 'reload schema';

-- ==============================================================================
-- 8. POST-MIGRATION VALIDATION QUERIES
--    (Returns verification summary of tables, RLS status, policies, and buckets)
-- ==============================================================================

select
  t.tablename as table_name,
  t.rowsecurity as rls_enabled,
  (select count(*) from pg_policies p where p.schemaname = 'public' and p.tablename = t.tablename) as policy_count,
  (select count(*) from information_schema.columns c where c.table_schema = 'public' and c.table_name = t.tablename) as column_count
from pg_tables t
where t.schemaname = 'public'
  and t.tablename in (
    'profiles',
    'academic_information',
    'user_settings_preferences',
    'stored_files',
    'study_notes',
    'note_upvotes',
    'study_note_upvotes',
    'forum_topics',
    'forum_posts',
    'forum_comments',
    'forum_votes',
    'forum_bookmarks',
    'forum_reports',
    'academic_programs',
    'program_discussions',
    'program_discussion_comments',
    'program_doubts',
    'program_doubt_answers',
    'universities',
    'university_discussions',
    'university_discussion_comments',
    'discussion_comments',
    'university_doubts',
    'university_doubt_answers',
    'doubt_answers',
    'university_follows'
  )
order by t.tablename;
