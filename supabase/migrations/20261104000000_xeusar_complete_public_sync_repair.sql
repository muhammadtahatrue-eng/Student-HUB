-- ============================================================================
-- XEUSAR — COMPLETE PUBLIC DATA SYNCHRONIZATION, SECURITY & SCHEMA RECONCILIATION
-- Migration: 20261104000000_xeusar_complete_public_sync_repair.sql
--
-- What this migration does:
-- 1. Reconciles every table and column queried by the Xeusar frontend
--    (profileService, resourceService, pdfViewerService, forumService,
--    programStore, universityStore, supabaseClient) with idempotent
--    CREATE TABLE IF NOT EXISTS and ALTER TABLE ... ADD COLUMN IF NOT EXISTS.
-- 2. Safely converts legacy UUID columns to TEXT on hybrid-ID tables without
--    dropping data, and backfills legacy votes/comments/notes/counters.
-- 3. Dynamically drops all legacy/conflicting RLS policies on canonical tables
--    via pg_policies before recreating least-privilege RLS policies.
-- 4. Protects user emails by restricting direct SELECT on public.profiles to
--    the profile owner or moderators, while exposing public.public_student_profiles
--    for safe public profile lookups.
-- 5. Prevents self-moderation and privilege escalation by locking moderator_roles
--    to platform admins and adding BEFORE UPDATE triggers that protect counters,
--    ownership, pin/lock flags, and answer bodies.
-- 6. Replaces untrusted counter RPCs with user-bound vote persistence in
--    public.community_item_votes and visibility-validated increment_downloads.
-- ============================================================================

begin;

create extension if not exists pgcrypto;

-- ============================================================================
-- 0. SHARED UPDATED_AT TRIGGER FUNCTION
-- ============================================================================

create or replace function public.set_updated_at()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ============================================================================
-- 1. MODERATOR ROLES & AUTHORIZATION HELPERS (NO SELF-ASSIGNMENT)
-- ============================================================================

create table if not exists public.moderator_roles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  role text not null default 'moderator' check (role in ('moderator', 'admin')),
  granted_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

alter table public.moderator_roles enable row level security;

-- Only server-controlled app_metadata or an existing admin row in moderator_roles
-- can grant platform admin privileges. Never trust raw_user_meta_data.
create or replace function public.is_platform_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    auth.uid() is not null
    and (
      exists (
        select 1
        from public.moderator_roles mr
        where mr.user_id = auth.uid()
          and mr.role = 'admin'
      )
      or coalesce(auth.jwt() -> 'app_metadata' ->> 'role', '') in ('admin', 'super_admin')
    );
$$;

create or replace function public.is_moderator()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    auth.uid() is not null
    and (
      exists (
        select 1
        from public.moderator_roles mr
        where mr.user_id = auth.uid()
          and mr.role in ('moderator', 'admin')
      )
      or coalesce(auth.jwt() -> 'app_metadata' ->> 'role', '') in ('moderator', 'admin', 'super_admin')
    );
$$;

-- ============================================================================
-- 2. PROFILES, ACADEMIC INFORMATION & USER SETTINGS (PRIVATE vs PUBLIC)
-- ============================================================================

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  full_name text not null default 'Student Scholar',
  username text unique,
  avatar_url text default '',
  bio text default '',
  role text not null default 'student' check (role in ('student', 'verified_contributor', 'moderator', 'admin')),
  points integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles add column if not exists email text;
alter table public.profiles add column if not exists full_name text not null default 'Student Scholar';
alter table public.profiles add column if not exists username text;
alter table public.profiles add column if not exists avatar_url text default '';
alter table public.profiles add column if not exists bio text default '';
alter table public.profiles add column if not exists role text not null default 'student';
alter table public.profiles add column if not exists points integer not null default 0;
alter table public.profiles add column if not exists created_at timestamptz not null default now();
alter table public.profiles add column if not exists updated_at timestamptz not null default now();

create unique index if not exists idx_profiles_username_lower
  on public.profiles (lower(username))
  where username is not null;

-- Prevent non-moderators from escalating role, points, email, or id on profiles
create or replace function public.protect_profile_privileged_columns()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if current_user in ('authenticated', 'anon') and not public.is_moderator() then
    new.id := old.id;
    new.email := old.email;
    new.points := old.points;
    new.created_at := old.created_at;
    if new.role is distinct from old.role then
      raise exception 'Role changes require moderator authorization.';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_protect_profile_role on public.profiles;
drop trigger if exists trg_protect_profile_privileged_columns on public.profiles;
create trigger trg_protect_profile_privileged_columns
before update on public.profiles
for each row execute function public.protect_profile_privileged_columns();

drop trigger if exists set_profiles_updated_at on public.profiles;
create trigger set_profiles_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

-- Safe public view that NEVER exposes profiles.email.
-- Uses security_invoker = false (definer privileges) so anon & authenticated users
-- can read public student profiles while direct SELECT on public.profiles is restricted.
create or replace view public.public_student_profiles
with (security_invoker = false)
as
select
  id,
  full_name,
  username,
  avatar_url,
  bio,
  role,
  points,
  created_at,
  updated_at
from public.profiles;

grant select on public.public_student_profiles to anon, authenticated;

create table if not exists public.academic_information (
  user_id uuid primary key references auth.users(id) on delete cascade,
  institution_name text default '',
  university_id text default '',
  degree_program text default '',
  program_id text default '',
  major text default '',
  current_semester text default '',
  academic_year text default '',
  student_id_number text default '',
  graduation_year integer,
  updated_at timestamptz not null default now()
);

alter table public.academic_information add column if not exists institution_name text default '';
alter table public.academic_information add column if not exists university_id text default '';
alter table public.academic_information add column if not exists degree_program text default '';
alter table public.academic_information add column if not exists program_id text default '';
alter table public.academic_information add column if not exists major text default '';
alter table public.academic_information add column if not exists current_semester text default '';
alter table public.academic_information add column if not exists academic_year text default '';
alter table public.academic_information add column if not exists student_id_number text default '';
alter table public.academic_information add column if not exists graduation_year integer;
alter table public.academic_information add column if not exists updated_at timestamptz not null default now();

drop trigger if exists set_academic_information_updated_at on public.academic_information;
create trigger set_academic_information_updated_at
before update on public.academic_information
for each row execute function public.set_updated_at();

create table if not exists public.user_settings_preferences (
  user_id uuid primary key references auth.users(id) on delete cascade,
  email_notifications boolean not null default true,
  forum_Notifications boolean not null default true,
  resource_alerts boolean not null default true,
  public_profile boolean not null default true,
  show_academic_info boolean not null default true,
  theme text not null default 'dark',
  updated_at timestamptz not null default now()
);

alter table public.user_settings_preferences add column if not exists email_notifications boolean not null default true;
alter table public.user_settings_preferences add column if not exists forum_notifications boolean not null default true;
alter table public.user_settings_preferences add column if not exists resource_alerts boolean not null default true;
alter table public.user_settings_preferences add column if not exists public_profile boolean not null default true;
alter table public.user_settings_preferences add column if not exists show_academic_info boolean not null default true;
alter table public.user_settings_preferences add column if not exists theme text not null default 'dark';
alter table public.user_settings_preferences add column if not exists updated_at timestamptz not null default now();

drop trigger if exists set_user_settings_preferences_updated_at on public.user_settings_preferences;
create trigger set_user_settings_preferences_updated_at
before update on public.user_settings_preferences
for each row execute function public.set_updated_at();

-- Automatic profile & preferences bootstrap on Auth signup
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_username text;
  v_full_name text;
begin
  v_full_name := coalesce(
    nullif(trim(new.raw_user_meta_data ->> 'full_name'), ''),
    nullif(trim(new.raw_user_meta_data ->> 'name'), ''),
    split_part(coalesce(new.email, 'scholar@xeusar.edu'), '@', 1)
  );
  v_username := lower(regexp_replace(
    coalesce(
      nullif(trim(new.raw_user_meta_data ->> 'username'), ''),
      split_part(coalesce(new.email, 'scholar'), '@', 1)
    ),
    '[^a-z0-9_]', '_', 'g'
  ));
  if length(v_username) < 3 then
    v_username := 'student_' || substr(replace(new.id::text, '-', ''), 1, 6);
  end if;

  insert into public.profiles (id, email, full_name, username, avatar_url, role)
  values (
    new.id,
    new.email,
    v_full_name,
    v_username || '_' || substr(replace(new.id::text, '-', ''), 1, 4),
    coalesce(new.raw_user_meta_data ->> 'avatar_url', ''),
    'student'
  )
  on conflict (id) do update
  set email = excluded.email,
      full_name = coalesce(nullif(public.profiles.full_name, ''), excluded.full_name),
      updated_at = now();

  insert into public.academic_information (
    user_id,
    institution_name,
    degree_program,
    major,
    current_semester,
    academic_year
  )
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'institution_name', new.raw_user_meta_data ->> 'university', ''),
    coalesce(new.raw_user_meta_data ->> 'degree_program', new.raw_user_meta_data ->> 'degree_tier', ''),
    coalesce(new.raw_user_meta_data ->> 'major', new.raw_user_meta_data ->> 'program', ''),
    coalesce(new.raw_user_meta_data ->> 'current_semester', ''),
    coalesce(new.raw_user_meta_data ->> 'academic_year', '')
  )
  on conflict (user_id) do nothing;

  insert into public.user_settings_preferences (user_id)
  values (new.id)
  on conflict (user_id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

-- ============================================================================
-- 3. STUDY LIBRARY: STORED FILES, STUDY NOTES & UPVOTES
-- ============================================================================

create table if not exists public.stored_files (
  id uuid primary key default gen_random_uuid(),
  sha256_hash text not null unique,
  storage_bucket text not null default 'study-materials',
  storage_path text not null,
  original_filename text not null default '',
  mime_type text not null default 'application/pdf',
  size_bytes bigint not null default 0 check (size_bytes >= 0 and size_bytes <= 5242880),
  uploaded_by uuid references auth.users(id) on delete set null,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

alter table public.stored_files add column if not exists sha256_hash text;
alter table public.stored_files add column if not exists storage_bucket text not null default 'study-materials';
alter table public.stored_files add column if not exists storage_path text not null default '';
alter table public.stored_files add column if not exists original_filename text not null default '';
alter table public.stored_files add column if not exists mime_type text not null default 'application/pdf';
alter table public.stored_files add column if not exists size_bytes bigint not null default 0;
alter table public.stored_files add column if not exists uploaded_by uuid references auth.users(id) on delete set null;
alter table public.stored_files add column if not exists created_by uuid references auth.users(id) on delete set null;
alter table public.stored_files add column if not exists created_at timestamptz not null default now();

create or replace function public.sync_stored_files_owner_columns()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  new.uploaded_by := coalesce(new.uploaded_by, new.created_by, auth.uid());
  new.created_by := coalesce(new.created_by, new.uploaded_by, auth.uid());
  return new;
end;
$$;

drop trigger if exists trg_sync_stored_files_owner on public.stored_files;
create trigger trg_sync_stored_files_owner
before insert or update on public.stored_files
for each row execute function public.sync_stored_files_owner_columns();

-- Concurrency-safe 1 GB global storage quota + 5 MB per-file enforcement
create or replace function public.enforce_total_storage_quota()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_current_bytes bigint;
  v_max_total_bytes constant bigint := 1073741824; -- 1 GB
  v_max_file_bytes constant bigint := 5242880;     -- 5 MB
begin
  perform pg_advisory_xact_lock(hashtext('xeusar_storage_quota_lock'));

  if coalesce(new.size_bytes, 0) > v_max_file_bytes then
    raise exception 'File exceeds maximum allowed size of 5 MB (5,242,880 bytes).';
  end if;

  select coalesce(sum(size_bytes), 0)
  into v_current_bytes
  from public.stored_files
  where id is distinct from new.id;

  if (v_current_bytes + coalesce(new.size_bytes, 0)) > v_max_total_bytes then
    raise exception 'Platform storage quota (1 GB) reached. Cannot store additional file.';
  end if;

  return new;
end;
$$;

drop trigger if exists trg_enforce_total_storage_quota on public.stored_files;
create trigger trg_enforce_total_storage_quota
before insert or update on public.stored_files
for each row execute function public.enforce_total_storage_quota();

create table if not exists public.study_notes (
  id text primary key default gen_random_uuid()::text,
  title text not null,
  subject text not null default 'General',
  course_code text default '',
  course_name text default '',
  course_id text default '',
  university text default '',
  university_id text default '',
  program_id text default '',
  program_ids text[] default '{}',
  program_name text default '',
  degree_tier text default 'Undergraduate',
  semester text default '',
  semester_number integer,
  academic_year text default '',
  professor text default '',
  description text default '',
  content text default '',
  preview_text text default '',
  tags text[] default '{}',
  file_id uuid references public.stored_files(id) on delete set null,
  file_url text default '',
  file_name text default '',
  file_type text default 'pdf',
  file_size text default '',
  file_size_bytes bigint default 0,
  file_sha256 text default '',
  storage_bucket text default 'study-materials',
  storage_path text default '',
  resource_type text not null default 'Lecture Notes',
  material_type text not null default 'Lecture Notes',
  pages integer default 1,
  upvotes integer not null default 0,
  upvotes_count integer not null default 0,
  downloads integer not null default 0,
  downloads_count integer not null default 0,
  author_id uuid references auth.users(id) on delete set null,
  uploader_id uuid references auth.users(id) on delete set null,
  author_name text not null default 'Student Contributor',
  uploader_name text not null default 'Student Contributor',
  author_username text default '',
  author_avatar text default '',
  author_university text default '',
  uploader_university text default '',
  status text not null default 'published' check (status in ('published', 'draft', 'archived', 'removed', 'pending')),
  is_verified boolean not null default false,
  is_public boolean not null default true,
  is_restricted boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Reconcile all study_notes columns used by resourceService.ts and supabaseClient.ts
alter table public.study_notes add column if not exists subject text not null default 'General';
alter table public.study_notes add column if not exists course_code text default '';
alter table public.study_notes add column if not exists course_name text default '';
alter table public.study_notes add column if not exists course_id text default '';
alter table public.study_notes add column if not exists university text default '';
alter table public.study_notes add column if not exists university_id text default '';
alter table public.study_notes add column if not exists program_id text default '';
alter table public.study_notes add column if not exists program_ids text[] default '{}';
alter table public.study_notes add column if not exists program_name text default '';
alter table public.study_notes add column if not exists degree_tier text default 'Undergraduate';
alter table public.study_notes add column if not exists semester text default '';
alter table public.study_notes add column if not exists semester_number integer;
alter table public.study_notes add column if not exists academic_year text default '';
alter table public.study_notes add column if not exists professor text default '';
alter table public.study_notes add column if not exists description text default '';
alter table public.study_notes add column if not exists content text default '';
alter table public.study_notes add column if not exists preview_text text default '';
alter table public.study_notes add column if not exists tags text[] default '{}';
alter table public.study_notes add column if not exists file_id uuid references public.stored_files(id) on delete set null;
alter table public.study_notes add column if not exists file_url text default '';
alter table public.study_notes add column if not exists file_name text default '';
alter table public.study_notes add column if not exists file_type text default 'pdf';
alter table public.study_notes add column if not exists file_size text default '';
alter table public.study_notes add column if not exists file_size_bytes bigint default 0;
alter table public.study_notes add column if not exists file_sha256 text default '';
alter table public.study_notes add column if not exists storage_bucket text default 'study-materials';
alter table public.study_notes add column if not exists storage_path text default '';
alter table public.study_notes add column if not exists resource_type text not null default 'Lecture Notes';
alter table public.study_notes add column if not exists material_type text not null default 'Lecture Notes';
alter table public.study_notes add column if not exists pages integer default 1;
alter table public.study_notes add column if not exists upvotes integer not null default 0;
alter table public.study_notes add column if not exists upvotes_count integer not null default 0;
alter table public.study_notes add column if not exists downloads integer not null default 0;
alter table public.study_notes add column if not exists downloads_count integer not null default 0;
alter table public.study_notes add column if not exists author_id uuid references auth.users(id) on delete set null;
alter table public.study_notes add column if not exists uploader_id uuid references auth.users(id) on delete set null;
alter table public.study_notes add column if not exists author_name text not null default 'Student Contributor';
alter table public.study_notes add column if not exists uploader_name text not null default 'Student Contributor';
alter table public.study_notes add column if not exists author_username text default '';
alter table public.study_notes add column if not exists author_avatar text default '';
alter table public.study_notes add column if not exists author_university text default '';
alter table public.study_notes add column if not exists uploader_university text default '';
alter table public.study_notes add column if not exists status text not null default 'published';
alter table public.study_notes add column if not exists is_verified boolean not null default false;
alter table public.study_notes add column if not exists is_public boolean not null default true;
alter table public.study_notes add column if not exists is_restricted boolean not null default false;
alter table public.study_notes add column if not exists created_at timestamptz not null default now();
alter table public.study_notes add column if not exists updated_at timestamptz not null default now();

-- Backfill dual-named columns on existing study_notes rows
update public.study_notes
set
  author_id = coalesce(author_id, uploader_id),
  uploader_id = coalesce(uploader_id, author_id),
  author_name = coalesce(nullif(author_name, 'Student Contributor'), nullif(uploader_name, ''), 'Student Contributor'),
  uploader_name = coalesce(nullif(uploader_name, 'Student Contributor'), nullif(author_name, ''), 'Student Contributor'),
  author_university = coalesce(nullif(author_university, ''), uploader_university, university, ''),
  uploader_university = coalesce(nullif(uploader_university, ''), author_university, university, ''),
  resource_type = coalesce(nullif(resource_type, ''), nullif(material_type, ''), 'Lecture Notes'),
  material_type = coalesce(nullif(material_type, ''), nullif(resource_type, ''), 'Lecture Notes'),
  upvotes = greatest(coalesce(upvotes, 0), coalesce(upvotes_count, 0)),
  upvotes_count = greatest(coalesce(upvotes_count, 0), coalesce(upvotes, 0)),
  downloads = greatest(coalesce(downloads, 0), coalesce(downloads_count, 0)),
  downloads_count = greatest(coalesce(downloads_count, 0), coalesce(downloads, 0));

create or replace function public.sync_and_protect_study_notes()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    new.author_id := coalesce(new.author_id, new.uploader_id, auth.uid());
    new.uploader_id := coalesce(new.uploader_id, new.author_id, auth.uid());
    new.author_name := coalesce(nullif(new.author_name, ''), nullif(new.uploader_name, ''), 'Student Contributor');
    new.uploader_name := coalesce(nullif(new.uploader_name, ''), nullif(new.author_name, ''), 'Student Contributor');
    new.author_university := coalesce(nullif(new.author_university, ''), nullif(new.uploader_university, ''), new.university, '');
    new.uploader_university := coalesce(nullif(new.uploader_university, ''), nullif(new.author_university, ''), new.university, '');
    new.resource_type := coalesce(nullif(new.resource_type, ''), nullif(new.material_type, ''), 'Lecture Notes');
    new.material_type := coalesce(nullif(new.material_type, ''), nullif(new.resource_type, ''), 'Lecture Notes');
    new.upvotes := greatest(coalesce(new.upvotes, 0), coalesce(new.upvotes_count, 0));
    new.upvotes_count := new.upvotes;
    new.downloads := greatest(coalesce(new.downloads, 0), coalesce(new.downloads_count, 0));
    new.downloads_count := new.downloads;
    if current_user in ('authenticated', 'anon') and not public.is_moderator() then
      new.is_verified := false;
    end if;
  elsif tg_op = 'UPDATE' then
    if current_user in ('authenticated', 'anon') and not public.is_moderator() then
      new.author_id := old.author_id;
      new.uploader_id := old.uploader_id;
      new.upvotes := old.upvotes;
      new.upvotes_count := old.upvotes_count;
      new.downloads := old.downloads;
      new.downloads_count := old.downloads_count;
      new.is_verified := old.is_verified;
      new.created_at := old.created_at;
    else
      new.upvotes := greatest(coalesce(new.upvotes, 0), coalesce(new.upvotes_count, 0));
      new.upvotes_count := new.upvotes;
      new.downloads := greatest(coalesce(new.downloads, 0), coalesce(new.downloads_count, 0));
      new.downloads_count := new.downloads;
    end if;
    new.resource_type := coalesce(nullif(new.resource_type, ''), nullif(new.material_type, ''), old.resource_type);
    new.material_type := coalesce(nullif(new.material_type, ''), nullif(new.resource_type, ''), old.material_type);
  end if;
  return new;
end;
$$;

drop trigger if exists trg_sync_and_protect_study_notes on public.study_notes;
create trigger trg_sync_and_protect_study_notes
before insert or update on public.study_notes
for each row execute function public.sync_and_protect_study_notes();

drop trigger if exists set_study_notes_updated_at on public.study_notes;
create trigger set_study_notes_updated_at
before update on public.study_notes
for each row execute function public.set_updated_at();

create table if not exists public.study_note_upvotes (
  note_id text not null references public.study_notes(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (note_id, user_id)
);

-- Maintain exact study_notes upvote counts via trigger
create or replace function public.sync_study_note_upvotes_count()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_note_id text;
  v_count integer;
begin
  v_note_id := coalesce(new.note_id, old.note_id);
  select count(*)::integer into v_count
  from public.study_note_upvotes
  where note_id = v_note_id;

  update public.study_notes
  set upvotes = v_count,
      upvotes_count = v_count,
      updated_at = now()
  where id = v_note_id;

  return coalesce(new, old);
end;
$$;

drop trigger if exists trg_sync_study_note_upvotes_count on public.study_note_upvotes;
create trigger trg_sync_study_note_upvotes_count
after insert or delete on public.study_note_upvotes
for each row execute function public.sync_study_note_upvotes_count();

-- ============================================================================
-- 4. PUBLIC FORUM: TOPICS, POSTS, COMMENTS, VOTES, BOOKMARKS & REPORTS
-- ============================================================================

create table if not exists public.forum_topics (
  id text primary key,
  name text not null,
  slug text not null unique,
  description text default '',
  icon text default 'MessageSquare',
  post_count integer not null default 0,
  created_at timestamptz not null default now()
);

insert into public.forum_topics (id, name, slug, description, icon)
values
  ('mathematics', 'Mathematics', 'mathematics', 'Calculus, Linear Algebra, Differential Equations, and Proofs', 'Calculator'),
  ('physics', 'Physics', 'physics', 'Mechanics, Electromagnetism, Quantum Physics, and Labs', 'Atom'),
  ('computer-science', 'Computer Science', 'computer-science', 'Algorithms, Data Structures, Systems, AI, and Software Engineering', 'Code'),
  ('engineering', 'Engineering', 'engineering', 'Electrical, Mechanical, Civil, Mechatronics, and Design Projects', 'Cpu'),
  ('business', 'Business & Economics', 'business', 'Finance, Accounting, Microeconomics, Management, and Case Studies', 'Briefcase'),
  ('english-languages', 'English & Languages', 'english-languages', 'Academic Writing, Literature, Linguistics, and Communication', 'BookOpen'),
  ('study-tips', 'Study Tips & Productivity', 'study-tips', 'Active Recall, Spaced Repetition, Note-Taking, and Research Workflows', 'Lightbulb'),
  ('university-life', 'University Life', 'university-life', 'Campus Guides, Societies, Hostels, Internships, and Scholarships', 'GraduationCap'),
  ('exam-preparation', 'Exam Preparation', 'exam-preparation', 'Midterms, Finals, Past Paper Walkthroughs, and Entry Tests', 'CheckCircle'),
  ('general-discussion', 'General Discussion', 'general-discussion', 'Open Academic Peer Discussions and Cross-Disciplinary Threads', 'MessageSquare')
on conflict (id) do update
set name = excluded.name,
    slug = excluded.slug,
    description = excluded.description;

create table if not exists public.forum_posts (
  id text primary key default gen_random_uuid()::text,
  topic_id text not null default 'general-discussion' references public.forum_topics(id) on delete restrict,
  topic_name text default 'General Discussion',
  post_type text not null default 'Discussion',
  title text not null,
  body text not null,
  tags text[] default '{}',
  author_id uuid not null references auth.users(id) on delete cascade,
  author_name text not null default 'Student Scholar',
  author_username text default '',
  author_avatar text default '',
  author_university text default '',
  author_program text default '',
  author_degree_tier text default '',
  author_bio text default '',
  resource_id text,
  program_course_ref jsonb,
  external_link text,
  upvotes integer not null default 0,
  upvotes_count integer not null default 0,
  downvotes integer not null default 0,
  downvotes_count integer not null default 0,
  comment_count integer not null default 0,
  comments_count integer not null default 0,
  is_pinned boolean not null default false,
  is_locked boolean not null default false,
  is_answered boolean not null default false,
  accepted_comment_id text,
  status text not null default 'published' check (status in ('published', 'removed', 'hidden', 'flagged')),
  idempotency_key text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.forum_posts add column if not exists topic_id text not null default 'general-discussion';
alter table public.forum_posts add column if not exists topic_name text default 'General Discussion';
alter table public.forum_posts add column if not exists post_type text not null default 'Discussion';
alter table public.forum_posts add column if not exists tags text[] default '{}';
alter table public.forum_posts add column if not exists author_name text not null default 'Student Scholar';
alter table public.forum_posts add column if not exists author_username text default '';
alter table public.forum_posts add column if not exists author_avatar text default '';
alter table public.forum_posts add column if not exists author_university text default '';
alter table public.forum_posts add column if not exists author_program text default '';
alter table public.forum_posts add column if not exists author_degree_tier text default '';
alter table public.forum_posts add column if not exists author_bio text default '';
alter table public.forum_posts add column if not exists resource_id text;
alter table public.forum_posts add column if not exists program_course_ref jsonb;
alter table public.forum_posts add column if not exists external_link text;
alter table public.forum_posts add column if not exists upvotes integer not null default 0;
alter table public.forum_posts add column if not exists upvotes_count integer not null default 0;
alter table public.forum_posts add column if not exists downvotes integer not null default 0;
alter table public.forum_posts add column if not exists downvotes_count integer not null default 0;
alter table public.forum_posts add column if not exists comment_count integer not null default 0;
alter table public.forum_posts add column if not exists comments_count integer not null default 0;
alter table public.forum_posts add column if not exists is_pinned boolean not null default false;
alter table public.forum_posts add column if not exists is_locked boolean not null default false;
alter table public.forum_posts add column if not exists is_answered boolean not null default false;
alter table public.forum_posts add column if not exists accepted_comment_id text;
alter table public.forum_posts add column if not exists status text not null default 'published';
alter table public.forum_posts add column if not exists idempotency_key text;
alter table public.forum_posts add column if not exists created_at timestamptz not null default now();
alter table public.forum_posts add column if not exists updated_at timestamptz not null default now();

-- Relax any legacy lowercase post_type check constraint so 'Discussion', 'Question', 'Study Resource', 'Announcement' work
alter table public.forum_posts drop constraint if exists forum_posts_post_type_check;

create or replace function public.sync_and_protect_forum_posts()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    new.upvotes := greatest(coalesce(new.upvotes, 0), coalesce(new.upvotes_count, 0));
    new.upvotes_count := new.upvotes;
    new.downvotes := greatest(coalesce(new.downvotes, 0), coalesce(new.downvotes_count, 0));
    new.downvotes_count := new.downvotes;
    new.comment_count := greatest(coalesce(new.comment_count, 0), coalesce(new.comments_count, 0));
    new.comments_count := new.comment_count;
    if current_user in ('authenticated', 'anon') and not public.is_moderator() then
      new.is_pinned := false;
      new.is_locked := false;
    end if;
  elsif tg_op = 'UPDATE' then
    if current_user in ('authenticated', 'anon') and not public.is_moderator() then
      new.author_id := old.author_id;
      new.upvotes := old.upvotes;
      new.upvotes_count := old.upvotes_count;
      new.downvotes := old.downvotes;
      new.downvotes_count := old.downvotes_count;
      new.comment_count := old.comment_count;
      new.comments_count := old.comments_count;
      new.is_pinned := old.is_pinned;
      new.is_locked := old.is_locked;
      new.created_at := old.created_at;
    else
      new.upvotes := greatest(coalesce(new.upvotes, 0), coalesce(new.upvotes_count, 0));
      new.upvotes_count := new.upvotes;
      new.downvotes := greatest(coalesce(new.downvotes, 0), coalesce(new.downvotes_count, 0));
      new.downvotes_count := new.downvotes;
      new.comment_count := greatest(coalesce(new.comment_count, 0), coalesce(new.comments_count, 0));
      new.comments_count := new.comment_count;
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_sync_and_protect_forum_posts on public.forum_posts;
create trigger trg_sync_and_protect_forum_posts
before insert or update on public.forum_posts
for each row execute function public.sync_and_protect_forum_posts();

drop trigger if exists set_forum_posts_updated_at on public.forum_posts;
create trigger set_forum_posts_updated_at
before update on public.forum_posts
for each row execute function public.set_updated_at();

create table if not exists public.forum_comments (
  id text primary key default gen_random_uuid()::text,
  post_id text not null references public.forum_posts(id) on delete cascade,
  parent_id text references public.forum_comments(id) on delete cascade,
  parent_comment_id text references public.forum_comments(id) on delete cascade,
  body text not null,
  author_id uuid not null references auth.users(id) on delete cascade,
  author_name text not null default 'Student Scholar',
  author_username text default '',
  author_avatar text default '',
  author_university text default '',
  author_program text default '',
  author_degree_tier text default '',
  upvotes integer not null default 0,
  upvotes_count integer not null default 0,
  downvotes integer not null default 0,
  downvotes_count integer not null default 0,
  is_accepted boolean not null default false,
  status text not null default 'published' check (status in ('published', 'removed', 'hidden')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.forum_comments add column if not exists parent_id text;
alter table public.forum_comments add column if not exists parent_comment_id text;
alter table public.forum_comments add column if not exists author_name text not null default 'Student Scholar';
alter table public.forum_comments add column if not exists author_username text default '';
alter table public.forum_comments add column if not exists author_avatar text default '';
alter table public.forum_comments add column if not exists author_university text default '';
alter table public.forum_comments add column if not exists author_program text default '';
alter table public.forum_comments add column if not exists author_degree_tier text default '';
alter table public.forum_comments add column if not exists upvotes integer not null default 0;
alter table public.forum_comments add column if not exists upvotes_count integer not null default 0;
alter table public.forum_comments add column if not exists downvotes integer not null default 0;
alter table public.forum_comments add column if not exists downvotes_count integer not null default 0;
alter table public.forum_comments add column if not exists is_accepted boolean not null default false;
alter table public.forum_comments add column if not exists status text not null default 'published';
alter table public.forum_comments add column if not exists created_at timestamptz not null default now();
alter table public.forum_comments add column if not exists updated_at timestamptz not null default now();

create or replace function public.sync_and_protect_forum_comments()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    new.parent_id := coalesce(new.parent_id, new.parent_comment_id);
    new.parent_comment_id := coalesce(new.parent_comment_id, new.parent_id);
    new.upvotes := greatest(coalesce(new.upvotes, 0), coalesce(new.upvotes_count, 0));
    new.upvotes_count := new.upvotes;
    new.downvotes := greatest(coalesce(new.downvotes, 0), coalesce(new.downvotes_count, 0));
    new.downvotes_count := new.downvotes;
  elsif tg_op = 'UPDATE' then
    if current_user in ('authenticated', 'anon') and not public.is_moderator() then
      new.author_id := old.author_id;
      new.post_id := old.post_id;
      new.parent_id := old.parent_id;
      new.parent_comment_id := old.parent_comment_id;
      new.upvotes := old.upvotes;
      new.upvotes_count := old.upvotes_count;
      new.downvotes := old.downvotes;
      new.downvotes_count := old.downvotes_count;
      new.created_at := old.created_at;
      -- If a post author is marking someone else's comment as accepted, lock the comment body & status
      if auth.uid() is distinct from old.author_id then
        new.body := old.body;
        new.status := old.status;
      end if;
    else
      new.upvotes := greatest(coalesce(new.upvotes, 0), coalesce(new.upvotes_count, 0));
      new.upvotes_count := new.upvotes;
      new.downvotes := greatest(coalesce(new.downvotes, 0), coalesce(new.downvotes_count, 0));
      new.downvotes_count := new.downvotes;
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_sync_and_protect_forum_comments on public.forum_comments;
create trigger trg_sync_and_protect_forum_comments
before insert or update on public.forum_comments
for each row execute function public.sync_and_protect_forum_comments();

drop trigger if exists set_forum_comments_updated_at on public.forum_comments;
create trigger set_forum_comments_updated_at
before update on public.forum_comments
for each row execute function public.set_updated_at();

create table if not exists public.forum_post_votes (
  post_id text not null references public.forum_posts(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  vote_type smallint not null check (vote_type in (-1, 1)),
  created_at timestamptz not null default now(),
  primary key (post_id, user_id)
);

create table if not exists public.forum_comment_votes (
  comment_id text not null references public.forum_comments(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  vote_type smallint not null check (vote_type in (-1, 1)),
  created_at timestamptz not null default now(),
  primary key (comment_id, user_id)
);

create table if not exists public.forum_bookmarks (
  post_id text not null references public.forum_posts(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (post_id, user_id)
);

create table if not exists public.forum_reports (
  id text primary key default gen_random_uuid()::text,
  target_type text not null check (target_type in ('post', 'comment')),
  target_id text not null,
  post_id text default '',
  target_snippet text default '',
  reporter_id uuid not null references auth.users(id) on delete cascade,
  reporter_username text default '',
  reason text not null,
  details text default '',
  status text not null default 'pending' check (status in ('pending', 'reviewed', 'dismissed', 'actioned', 'reviewed_removed', 'reviewed_kept')),
  reviewed_by text,
  reviewed_at timestamptz,
  created_at timestamptz not null default now()
);

alter table public.forum_reports add column if not exists post_id text default '';
alter table public.forum_reports add column if not exists target_snippet text default '';
alter table public.forum_reports add column if not exists reporter_username text default '';
alter table public.forum_reports add column if not exists details text default '';
alter table public.forum_reports add column if not exists status text not null default 'pending';
alter table public.forum_reports add column if not exists reviewed_by text;
alter table public.forum_reports add column if not exists reviewed_at timestamptz;
alter table public.forum_reports drop constraint if exists forum_reports_status_check;
alter table public.forum_reports add constraint forum_reports_status_check
  check (status in ('pending', 'reviewed', 'dismissed', 'actioned', 'reviewed_removed', 'reviewed_kept'));

-- Triggers to maintain exact forum counters
create or replace function public.sync_forum_post_votes_counts()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_post_id text;
  v_up integer;
  v_down integer;
begin
  v_post_id := coalesce(new.post_id, old.post_id);
  select
    count(*) filter (where vote_type = 1)::integer,
    count(*) filter (where vote_type = -1)::integer
  into v_up, v_down
  from public.forum_post_votes
  where post_id = v_post_id;

  update public.forum_posts
  set upvotes = coalesce(v_up, 0),
      upvotes_count = coalesce(v_up, 0),
      downvotes = coalesce(v_down, 0),
      downvotes_count = coalesce(v_down, 0)
  where id = v_post_id;

  return coalesce(new, old);
end;
$$;

drop trigger if exists trg_sync_forum_post_votes_counts on public.forum_post_votes;
create trigger trg_sync_forum_post_votes_counts
after insert or update or delete on public.forum_post_votes
for each row execute function public.sync_forum_post_votes_counts();

create or replace function public.sync_forum_comment_votes_counts()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_comment_id text;
  v_up integer;
  v_down integer;
begin
  v_comment_id := coalesce(new.comment_id, old.comment_id);
  select
    count(*) filter (where vote_type = 1)::integer,
    count(*) filter (where vote_type = -1)::integer
  into v_up, v_down
  from public.forum_comment_votes
  where comment_id = v_comment_id;

  update public.forum_comments
  set upvotes = coalesce(v_up, 0),
      upvotes_count = coalesce(v_up, 0),
      downvotes = coalesce(v_down, 0),
      downvotes_count = coalesce(v_down, 0)
  where id = v_comment_id;

  return coalesce(new, old);
end;
$$;

drop trigger if exists trg_sync_forum_comment_votes_counts on public.forum_comment_votes;
create trigger trg_sync_forum_comment_votes_counts
after insert or update or delete on public.forum_comment_votes
for each row execute function public.sync_forum_comment_votes_counts();

create or replace function public.sync_forum_post_comment_count()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_post_id text;
  v_count integer;
begin
  v_post_id := coalesce(new.post_id, old.post_id);
  select count(*)::integer into v_count
  from public.forum_comments
  where post_id = v_post_id
    and status = 'published';

  update public.forum_posts
  set comment_count = v_count,
      comments_count = v_count
  where id = v_post_id;

  return coalesce(new, old);
end;
$$;

drop trigger if exists trg_sync_forum_post_comment_count on public.forum_comments;
create trigger trg_sync_forum_post_comment_count
after insert or update or delete on public.forum_comments
for each row execute function public.sync_forum_post_comment_count();

-- ============================================================================
-- 5. ACADEMIC PROGRAMS, DISCUSSIONS & DOUBTS
-- ============================================================================

create table if not exists public.academic_programs (
  id text primary key,
  code text default 'PROG',
  short_code text default 'PROG',
  name text not null,
  degree_tier text not null default 'Undergraduate',
  department text default 'General',
  discipline text default 'Interdisciplinary Studies',
  description text default '',
  duration_years integer not null default 4,
  total_semesters integer not null default 8,
  total_credits integer not null default 130,
  semesters jsonb default '[]'::jsonb,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

alter table public.academic_programs alter column code drop not null;
alter table public.academic_programs alter column code set default 'PROG';
alter table public.academic_programs add column if not exists short_code text default 'PROG';
alter table public.academic_programs add column if not exists discipline text default 'Interdisciplinary Studies';
alter table public.academic_programs add column if not exists department text default 'General';
alter table public.academic_programs add column if not exists total_semesters integer not null default 8;
alter table public.academic_programs add column if not exists semesters jsonb default '[]'::jsonb;
alter table public.academic_programs add column if not exists created_by uuid references auth.users(id) on delete set null;

create or replace function public.sync_academic_programs_columns()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  new.short_code := coalesce(nullif(new.short_code, ''), nullif(new.code, ''), 'PROG');
  new.code := coalesce(nullif(new.code, ''), new.short_code, 'PROG');
  new.discipline := coalesce(nullif(new.discipline, ''), nullif(new.department, ''), 'Interdisciplinary Studies');
  new.department := coalesce(nullif(new.department, ''), new.discipline, 'General');
  return new;
end;
$$;

drop trigger if exists trg_sync_academic_programs_columns on public.academic_programs;
create trigger trg_sync_academic_programs_columns
before insert or update on public.academic_programs
for each row execute function public.sync_academic_programs_columns();

create table if not exists public.program_enrollments (
  program_id text not null references public.academic_programs(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  semester integer default 1,
  created_at timestamptz not null default now(),
  primary key (program_id, user_id)
);

create table if not exists public.program_discussions (
  id text primary key default gen_random_uuid()::text,
  program_id text not null,
  title text not null,
  content text not null,
  category text not null default 'Course Advice',
  semester_tag text,
  course_tag text,
  author_id uuid not null references auth.users(id) on delete cascade,
  author_name text not null default 'Student Peer',
  author_avatar text default '',
  author_program text default '',
  author_degree_tier text default '',
  upvotes_count integer not null default 1,
  comments_count integer not null default 0,
  is_pinned boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.program_discussions add column if not exists semester_tag text;
alter table public.program_discussions add column if not exists course_tag text;
alter table public.program_discussions add column if not exists author_program text default '';
alter table public.program_discussions add column if not exists author_degree_tier text default '';
alter table public.program_discussions add column if not exists upvotes_count integer not null default 1;
alter table public.program_discussions add column if not exists comments_count integer not null default 0;
alter table public.program_discussions add column if not exists is_pinned boolean not null default false;
alter table public.program_discussions add column if not exists updated_at timestamptz not null default now();

create table if not exists public.program_discussion_comments (
  id text primary key default gen_random_uuid()::text,
  post_id text not null references public.program_discussions(id) on delete cascade,
  content text not null,
  author_id uuid not null references auth.users(id) on delete cascade,
  author_name text not null default 'Student Peer',
  author_avatar text default '',
  author_program text default '',
  author_degree_tier text default '',
  upvotes_count integer not null default 0,
  created_at timestamptz not null default now()
);

alter table public.program_discussion_comments add column if not exists author_program text default '';
alter table public.program_discussion_comments add column if not exists author_degree_tier text default '';
alter table public.program_discussion_comments add column if not exists upvotes_count integer not null default 0;

create table if not exists public.program_doubts (
  id text primary key default gen_random_uuid()::text,
  program_id text not null,
  title text not null,
  content text not null,
  course_code text default 'GEN',
  semester_tag text,
  tags text[] default '{}',
  author_id uuid not null references auth.users(id) on delete cascade,
  author_name text not null default 'Student Peer',
  author_avatar text default '',
  author_program text default '',
  upvotes_count integer not null default 1,
  status text not null default 'unanswered' check (status in ('unanswered', 'answered', 'resolved')),
  accepted_answer_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.program_doubts add column if not exists course_code text default 'GEN';
alter table public.program_doubts add column if not exists semester_tag text;
alter table public.program_doubts add column if not exists tags text[] default '{}';
alter table public.program_doubts add column if not exists author_program text default '';
alter table public.program_doubts add column if not exists upvotes_count integer not null default 1;
alter table public.program_doubts add column if not exists status text not null default 'unanswered';
alter table public.program_doubts add column if not exists accepted_answer_id text;
alter table public.program_doubts add column if not exists updated_at timestamptz not null default now();

create table if not exists public.program_doubt_answers (
  id text primary key default gen_random_uuid()::text,
  question_id text not null references public.program_doubts(id) on delete cascade,
  content text not null,
  author_id uuid not null references auth.users(id) on delete cascade,
  author_name text not null default 'Student Peer',
  author_avatar text default '',
  author_role text default 'Peer',
  author_program text default '',
  upvotes_count integer not null default 0,
  is_accepted boolean not null default false,
  created_at timestamptz not null default now()
);

alter table public.program_doubt_answers add column if not exists author_role text default 'Peer';
alter table public.program_doubt_answers add column if not exists author_program text default '';
alter table public.program_doubt_answers add column if not exists upvotes_count integer not null default 0;
alter table public.program_doubt_answers add column if not exists is_accepted boolean not null default false;

-- ============================================================================
-- 6. UNIVERSITIES, DEPARTMENTS, COURSES, DISCUSSIONS & DOUBTS
-- ============================================================================

create table if not exists public.universities (
  id text primary key,
  name text not null,
  short_name text not null default 'UNI',
  sector text not null default 'Public',
  province text not null default 'Federal',
  city text not null default 'Islamabad',
  location text default 'Pakistan',
  country text not null default 'Pakistan',
  badge text default 'HEC Recognized',
  logo_url text default '',
  banner_url text default '',
  disciplines text[] default '{}',
  website text default '',
  established_year integer default 2000,
  verified_students integer not null default 1,
  total_courses_count integer not null default 0,
  description text default '',
  hec_recognized boolean not null default true,
  is_custom boolean not null default false,
  is_member_restricted boolean not null default false,
  status text not null default 'verified',
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

alter table public.universities add column if not exists location text default 'Pakistan';
alter table public.universities add column if not exists country text not null default 'Pakistan';
alter table public.universities add column if not exists badge text default 'HEC Recognized';
alter table public.universities add column if not exists banner_url text default '';
alter table public.universities add column if not exists disciplines text[] default '{}';
alter table public.universities add column if not exists established_year integer default 2000;
alter table public.universities add column if not exists verified_students integer not null default 1;
alter table public.universities add column if not exists total_courses_count integer not null default 0;
alter table public.universities add column if not exists is_member_restricted boolean not null default false;
alter table public.universities add column if not exists status text not null default 'verified';
alter table public.universities add column if not exists created_by uuid references auth.users(id) on delete set null;

create table if not exists public.departments (
  id text primary key,
  university_id text not null references public.universities(id) on delete cascade,
  name text not null,
  code text default '',
  description text default '',
  created_at timestamptz not null default now()
);

create table if not exists public.courses (
  id text primary key,
  university_id text references public.universities(id) on delete cascade,
  department_id text references public.departments(id) on delete set null,
  program_id text references public.academic_programs(id) on delete set null,
  code text not null,
  name text not null,
  semester integer default 1,
  credit_hours integer default 3,
  description text default '',
  created_at timestamptz not null default now()
);

create table if not exists public.university_follows (
  university_id text not null references public.universities(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (university_id, user_id)
);

create table if not exists public.university_discussions (
  id text primary key default gen_random_uuid()::text,
  university_id text not null,
  title text not null,
  content text not null,
  category text not null default 'General',
  course_tag text,
  author_id uuid not null references auth.users(id) on delete cascade,
  author_name text not null default 'Student Member',
  author_avatar text default '',
  author_major text default '',
  author_university text default '',
  upvotes_count integer not null default 1,
  comments_count integer not null default 0,
  is_pinned boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.university_discussions add column if not exists course_tag text;
alter table public.university_discussions add column if not exists author_major text default '';
alter table public.university_discussions add column if not exists author_university text default '';
alter table public.university_discussions add column if not exists upvotes_count integer not null default 1;
alter table public.university_discussions add column if not exists comments_count integer not null default 0;
alter table public.university_discussions add column if not exists is_pinned boolean not null default false;
alter table public.university_discussions add column if not exists updated_at timestamptz not null default now();

create table if not exists public.university_discussion_comments (
  id text primary key default gen_random_uuid()::text,
  post_id text not null references public.university_discussions(id) on delete cascade,
  content text not null,
  author_id uuid not null references auth.users(id) on delete cascade,
  author_name text not null default 'Student Member',
  author_avatar text default '',
  author_university text default '',
  upvotes_count integer not null default 0,
  created_at timestamptz not null default now()
);

alter table public.university_discussion_comments add column if not exists author_university text default '';
alter table public.university_discussion_comments add column if not exists upvotes_count integer not null default 0;

create table if not exists public.university_doubts (
  id text primary key default gen_random_uuid()::text,
  university_id text not null,
  title text not null,
  content text not null,
  department text default 'General',
  course_code text default 'GEN',
  tags text[] default '{}',
  attachments jsonb default '[]'::jsonb,
  author_id uuid not null references auth.users(id) on delete cascade,
  author_name text not null default 'Student Member',
  author_avatar text default '',
  author_university text default '',
  upvotes_count integer not null default 1,
  status text not null default 'unanswered' check (status in ('unanswered', 'answered', 'resolved')),
  accepted_answer_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.university_doubts add column if not exists department text default 'General';
alter table public.university_doubts add column if not exists course_code text default 'GEN';
alter table public.university_doubts add column if not exists tags text[] default '{}';
alter table public.university_doubts add column if not exists attachments jsonb default '[]'::jsonb;
alter table public.university_doubts add column if not exists author_university text default '';
alter table public.university_doubts add column if not exists upvotes_count integer not null default 1;
alter table public.university_doubts add column if not exists status text not null default 'unanswered';
alter table public.university_doubts add column if not exists accepted_answer_id text;
alter table public.university_doubts add column if not exists updated_at timestamptz not null default now();

create table if not exists public.university_doubt_answers (
  id text primary key default gen_random_uuid()::text,
  question_id text not null references public.university_doubts(id) on delete cascade,
  content text not null,
  author_id uuid not null references auth.users(id) on delete cascade,
  author_name text not null default 'Student Member',
  author_avatar text default '',
  author_role text default 'Peer Member',
  author_university text default '',
  upvotes_count integer not null default 0,
  is_accepted boolean not null default false,
  created_at timestamptz not null default now()
);

alter table public.university_doubt_answers add column if not exists author_role text default 'Peer Member';
alter table public.university_doubt_answers add column if not exists author_university text default '';
alter table public.university_doubt_answers add column if not exists upvotes_count integer not null default 0;
alter table public.university_doubt_answers add column if not exists is_accepted boolean not null default false;

-- ============================================================================
-- 7. COMMUNITY ITEM VOTES & PRIVILEGED COLUMN PROTECTION TRIGGERS
-- ============================================================================

create table if not exists public.community_item_votes (
  target_table text not null check (target_table in (
    'program_discussions',
    'program_discussion_comments',
    'program_doubts',
    'program_doubt_answers',
    'university_discussions',
    'university_discussion_comments',
    'university_doubts',
    'university_doubt_answers'
  )),
  target_id text not null,
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (target_table, target_id, user_id)
);

-- Protect privileged columns on program & university discussions and doubts
create or replace function public.protect_community_post_columns()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if current_user in ('authenticated', 'anon') and not public.is_moderator() then
    new.author_id := old.author_id;
    new.upvotes_count := old.upvotes_count;
    new.created_at := old.created_at;
    if tg_table_name in ('program_discussions', 'university_discussions') then
      new.comments_count := old.comments_count;
      new.is_pinned := old.is_pinned;
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_protect_program_discussions on public.program_discussions;
create trigger trg_protect_program_discussions
before update on public.program_discussions
for each row execute function public.protect_community_post_columns();

drop trigger if exists trg_protect_program_doubts on public.program_doubts;
create trigger trg_protect_program_doubts
before update on public.program_doubts
for each row execute function public.protect_community_post_columns();

drop trigger if exists trg_protect_university_discussions on public.university_discussions;
create trigger trg_protect_university_discussions
before update on public.university_discussions
for each row execute function public.protect_community_post_columns();

drop trigger if exists trg_protect_university_doubts on public.university_doubts;
create trigger trg_protect_university_doubts
before update on public.university_doubts
for each row execute function public.protect_community_post_columns();

-- Protect doubt answers so question authors marking is_accepted cannot alter another user's answer content
create or replace function public.protect_doubt_answer_columns()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if current_user in ('authenticated', 'anon') and not public.is_moderator() then
    new.author_id := old.author_id;
    new.question_id := old.question_id;
    new.upvotes_count := old.upvotes_count;
    new.created_at := old.created_at;
    if auth.uid() is distinct from old.author_id then
      new.content := old.content;
      new.author_name := old.author_name;
      new.author_avatar := old.author_avatar;
      new.author_role := old.author_role;
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_protect_program_doubt_answers on public.program_doubt_answers;
create trigger trg_protect_program_doubt_answers
before update on public.program_doubt_answers
for each row execute function public.protect_doubt_answer_columns();

drop trigger if exists trg_protect_university_doubt_answers on public.university_doubt_answers;
create trigger trg_protect_university_doubt_answers
before update on public.university_doubt_answers
for each row execute function public.protect_doubt_answer_columns();

-- Maintain comment counts on program_discussions and university_discussions
create or replace function public.sync_program_discussion_comments_count()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_post_id text;
  v_count integer;
begin
  v_post_id := coalesce(new.post_id, old.post_id);
  select count(*)::integer into v_count
  from public.program_discussion_comments
  where post_id = v_post_id;

  update public.program_discussions
  set comments_count = v_count,
      updated_at = now()
  where id = v_post_id;

  return coalesce(new, old);
end;
$$;

drop trigger if exists trg_sync_program_discussion_comments_count on public.program_discussion_comments;
create trigger trg_sync_program_discussion_comments_count
after insert or delete on public.program_discussion_comments
for each row execute function public.sync_program_discussion_comments_count();

create or replace function public.sync_university_discussion_comments_count()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_post_id text;
  v_count integer;
begin
  v_post_id := coalesce(new.post_id, old.post_id);
  select count(*)::integer into v_count
  from public.university_discussion_comments
  where post_id = v_post_id;

  update public.university_discussions
  set comments_count = v_count,
      updated_at = now()
  where id = v_post_id;

  return coalesce(new, old);
end;
$$;

drop trigger if exists trg_sync_university_discussion_comments_count on public.university_discussion_comments;
create trigger trg_sync_university_discussion_comments_count
after insert or delete on public.university_discussion_comments
for each row execute function public.sync_university_discussion_comments_count();

-- ============================================================================
-- 8. SAFE LEGACY DATA MIGRATION & HYBRID-ID CONVERSION
-- ============================================================================

do $$
declare
  r record;
begin
  -- Drop foreign keys that block UUID -> TEXT conversion on hybrid-ID tables, then convert & restore
  for r in
    select
      tc.table_name,
      tc.constraint_name
    from information_schema.table_constraints tc
    where tc.table_schema = 'public'
      and tc.constraint_type = 'FOREIGN KEY'
      and tc.table_name in (
        'study_notes', 'study_note_upvotes',
        'forum_posts', 'forum_comments', 'forum_post_votes', 'forum_comment_votes', 'forum_bookmarks', 'forum_reports',
        'program_enrollments', 'program_discussions', 'program_discussion_comments', 'program_doubts', 'program_doubt_answers',
        'university_follows', 'university_discussions', 'university_discussion_comments', 'university_doubts', 'university_doubt_answers'
      )
      and exists (
        select 1
        from information_schema.columns c
        where c.table_schema = 'public'
          and c.table_name = tc.table_name
          and c.column_name in ('id', 'note_id', 'post_id', 'parent_id', 'parent_comment_id', 'comment_id', 'program_id', 'question_id', 'university_id')
          and c.data_type = 'uuid'
      )
  loop
    execute format('alter table public.%I drop constraint if exists %I', r.table_name, r.constraint_name);
  end loop;

  for r in
    select table_name, column_name
    from information_schema.columns
    where table_schema = 'public'
      and data_type = 'uuid'
      and (
        (table_name = 'study_notes' and column_name = 'id')
        or (table_name = 'study_note_upvotes' and column_name = 'note_id')
        or (table_name = 'forum_posts' and column_name in ('id', 'accepted_comment_id', 'resource_id'))
        or (table_name = 'forum_comments' and column_name in ('id', 'post_id', 'parent_id', 'parent_comment_id'))
        or (table_name = 'forum_post_votes' and column_name = 'post_id')
        or (table_name = 'forum_comment_votes' and column_name = 'comment_id')
        or (table_name = 'forum_bookmarks' and column_name = 'post_id')
        or (table_name = 'forum_reports' and column_name in ('id', 'target_id', 'post_id'))
        or (table_name = 'program_discussions' and column_name in ('id', 'program_id'))
        or (table_name = 'program_discussion_comments' and column_name in ('id', 'post_id'))
        or (table_name = 'program_doubts' and column_name in ('id', 'program_id', 'accepted_answer_id'))
        or (table_name = 'program_doubt_answers' and column_name in ('id', 'question_id'))
        or (table_name = 'university_discussions' and column_name in ('id', 'university_id'))
        or (table_name = 'university_discussion_comments' and column_name in ('id', 'post_id'))
        or (table_name = 'university_doubts' and column_name in ('id', 'university_id', 'accepted_answer_id'))
        or (table_name = 'university_doubt_answers' and column_name in ('id', 'question_id'))
      )
  loop
    execute format('alter table public.%I alter column %I type text using %I::text', r.table_name, r.column_name, r.column_name);
  end loop;

  -- Migrate legacy note_upvotes -> study_note_upvotes if present
  if to_regclass('public.note_upvotes') is not null then
    insert into public.study_note_upvotes (note_id, user_id, created_at)
    select nu.note_id::text, nu.user_id, coalesce(nu.created_at, now())
    from public.note_upvotes nu
    where exists (select 1 from public.study_notes sn where sn.id = nu.note_id::text)
    on conflict (note_id, user_id) do nothing;
  end if;

  -- Migrate legacy forum_votes -> forum_post_votes and forum_comment_votes if present
  if to_regclass('public.forum_votes') is not null then
    insert into public.forum_post_votes (post_id, user_id, vote_type, created_at)
    select
      fv.target_id::text,
      fv.user_id,
      case when coalesce(fv.vote_value, 1) < 0 then -1 else 1 end,
      coalesce(fv.created_at, now())
    from public.forum_votes fv
    where fv.target_type = 'post'
      and exists (select 1 from public.forum_posts fp where fp.id = fv.target_id::text)
    on conflict (post_id, user_id) do nothing;

    insert into public.forum_comment_votes (comment_id, user_id, vote_type, created_at)
    select
      fv.target_id::text,
      fv.user_id,
      case when coalesce(fv.vote_value, 1) < 0 then -1 else 1 end,
      coalesce(fv.created_at, now())
    from public.forum_votes fv
    where fv.target_type = 'comment'
      and exists (select 1 from public.forum_comments fc where fc.id = fv.target_id::text)
    on conflict (comment_id, user_id) do nothing;
  end if;

  -- Recalculate counters after backfill
  update public.study_notes sn
  set upvotes = greatest(sn.upvotes, sn.upvotes_count, (select count(*)::integer from public.study_note_upvotes u where u.note_id = sn.id)),
      upvotes_count = greatest(sn.upvotes, sn.upvotes_count, (select count(*)::integer from public.study_note_upvotes u where u.note_id = sn.id));

  update public.forum_posts fp
  set upvotes = greatest(fp.upvotes, fp.upvotes_count, (select count(*) filter (where vote_type = 1)::integer from public.forum_post_votes v where v.post_id = fp.id)),
      upvotes_count = greatest(fp.upvotes, fp.upvotes_count, (select count(*) filter (where vote_type = 1)::integer from public.forum_post_votes v where v.post_id = fp.id)),
      downvotes = greatest(fp.downvotes, fp.downvotes_count, (select count(*) filter (where vote_type = -1)::integer from public.forum_post_votes v where v.post_id = fp.id)),
      downvotes_count = greatest(fp.downvotes, fp.downvotes_count, (select count(*) filter (where vote_type = -1)::integer from public.forum_post_votes v where v.post_id = fp.id)),
      comment_count = (select count(*)::integer from public.forum_comments c where c.post_id = fp.id and c.status = 'published'),
      comments_count = (select count(*)::integer from public.forum_comments c where c.post_id = fp.id and c.status = 'published');
end $$;

-- ============================================================================
-- 9. DYNAMIC POLICY RESET & CANONICAL ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================================

do $$
declare
  t text;
  pol record;
  canonical_tables text[] := array[
    'moderator_roles',
    'profiles',
    'academic_information',
    'user_settings_preferences',
    'stored_files',
    'study_notes',
    'study_note_upvotes',
    'forum_topics',
    'forum_posts',
    'forum_comments',
    'forum_post_votes',
    'forum_comment_votes',
    'forum_bookmarks',
    'forum_reports',
    'academic_programs',
    'program_enrollments',
    'program_discussions',
    'program_discussion_comments',
    'program_doubts',
    'program_doubt_answers',
    'universities',
    'departments',
    'courses',
    'university_follows',
    'university_discussions',
    'university_discussion_comments',
    'university_doubts',
    'university_doubt_answers',
    'community_item_votes'
  ];
begin
  foreach t in array canonical_tables loop
    execute format('alter table public.%I enable row level security', t);
    for pol in
      select policyname
      from pg_policies
      where schemaname = 'public'
        and tablename = t
    loop
      execute format('drop policy if exists %I on public.%I', pol.policyname, t);
    end loop;
  end loop;
end $$;

-- 9.1 moderator_roles (Platform admin only for write; self or moderator for read)
create policy "moderator_roles_select_own_or_mod"
  on public.moderator_roles for select
  using (auth.uid() = user_id or public.is_moderator());

create policy "moderator_roles_admin_insert"
  on public.moderator_roles for insert
  with check (public.is_platform_admin());

create policy "moderator_roles_admin_update"
  on public.moderator_roles for update
  using (public.is_platform_admin())
  with check (public.is_platform_admin());

create policy "moderator_roles_admin_delete"
  on public.moderator_roles for delete
  using (public.is_platform_admin());

-- 9.2 profiles (Owner or moderator only on base table to protect email; public reads use public_student_profiles view)
create policy "profiles_select_own_or_mod"
  on public.profiles for select
  using (auth.uid() = id or public.is_moderator());

create policy "profiles_insert_own"
  on public.profiles for insert
  with check (auth.uid() = id and role = 'student');

create policy "profiles_update_own_or_mod"
  on public.profiles for update
  using (auth.uid() = id or public.is_moderator())
  with check (auth.uid() = id or public.is_moderator());

-- 9.3 academic_information (Strictly private to owner; public aggregates use get_public_cohort_counts RPC)
create policy "academic_info_select_own"
  on public.academic_information for select
  using (auth.uid() = user_id);

create policy "academic_info_insert_own"
  on public.academic_information for insert
  with check (auth.uid() = user_id);

create policy "academic_info_update_own"
  on public.academic_information for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "academic_info_delete_own"
  on public.academic_information for delete
  using (auth.uid() = user_id);

-- 9.4 user_settings_preferences (Strictly private to owner)
create policy "user_settings_select_own"
  on public.user_settings_preferences for select
  using (auth.uid() = user_id);

create policy "user_settings_insert_own"
  on public.user_settings_preferences for insert
  with check (auth.uid() = user_id);

create policy "user_settings_update_own"
  on public.user_settings_preferences for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- 9.5 stored_files (Visible when linked to a visible published note, or to the uploader/moderator)
create policy "stored_files_select_visible"
  on public.stored_files for select
  using (
    auth.uid() = coalesce(uploaded_by, created_by)
    or public.is_moderator()
    or exists (
      select 1
      from public.study_notes sn
      where (sn.file_id = stored_files.id or sn.file_sha256 = stored_files.sha256_hash)
        and sn.status = 'published'
        and sn.is_public = true
        and (not sn.is_restricted or auth.uid() is not null)
    )
  );

create policy "stored_files_insert_authenticated"
  on public.stored_files for insert
  with check (
    auth.uid() is not null
    and coalesce(uploaded_by, created_by, auth.uid()) = auth.uid()
    and size_bytes <= 5242880
  );

create policy "stored_files_delete_own_or_mod"
  on public.stored_files for delete
  using (auth.uid() = coalesce(uploaded_by, created_by) or public.is_moderator());

-- 9.6 study_notes & study_note_upvotes
create policy "study_notes_select_public_or_own"
  on public.study_notes for select
  using (
    (status = 'published' and is_public = true and (not is_restricted or auth.uid() is not null))
    or auth.uid() = coalesce(author_id, uploader_id)
    or public.is_moderator()
  );

create policy "study_notes_insert_own"
  on public.study_notes for insert
  with check (
    auth.uid() is not null
    and coalesce(author_id, uploader_id) = auth.uid()
  );

create policy "study_notes_update_own_or_mod"
  on public.study_notes for update
  using (auth.uid() = coalesce(author_id, uploader_id) or public.is_moderator())
  with check (auth.uid() = coalesce(author_id, uploader_id) or public.is_moderator());

create policy "study_notes_delete_own_or_mod"
  on public.study_notes for delete
  using (auth.uid() = coalesce(author_id, uploader_id) or public.is_moderator());

create policy "study_note_upvotes_select_public"
  on public.study_note_upvotes for select
  using (true);

create policy "study_note_upvotes_insert_own"
  on public.study_note_upvotes for insert
  with check (auth.uid() = user_id);

create policy "study_note_upvotes_delete_own"
  on public.study_note_upvotes for delete
  using (auth.uid() = user_id);

-- 9.7 forum_topics, forum_posts, forum_comments, votes, bookmarks, reports
create policy "forum_topics_select_public"
  on public.forum_topics for select
  using (true);

create policy "forum_topics_insert_authenticated"
  on public.forum_topics for insert
  with check (auth.uid() is not null);

create policy "forum_topics_mod_write"
  on public.forum_topics for update
  using (public.is_moderator())
  with check (public.is_moderator());

create policy "forum_posts_select_public"
  on public.forum_posts for select
  using (status = 'published' or auth.uid() = author_id or public.is_moderator());

create policy "forum_posts_insert_own"
  on public.forum_posts for insert
  with check (auth.uid() = author_id);

create policy "forum_posts_update_own_or_mod"
  on public.forum_posts for update
  using (auth.uid() = author_id or public.is_moderator())
  with check (auth.uid() = author_id or public.is_moderator());

create policy "forum_posts_delete_own_or_mod"
  on public.forum_posts for delete
  using (auth.uid() = author_id or public.is_moderator());

create policy "forum_comments_select_public"
  on public.forum_comments for select
  using (status = 'published' or auth.uid() = author_id or public.is_moderator());

create policy "forum_comments_insert_own"
  on public.forum_comments for insert
  with check (auth.uid() = author_id);

create policy "forum_comments_update_own_post_author_or_mod"
  on public.forum_comments for update
  using (
    auth.uid() = author_id
    or public.is_moderator()
    or exists (
      select 1 from public.forum_posts fp
      where fp.id = forum_comments.post_id
        and fp.author_id = auth.uid()
    )
  )
  with check (
    auth.uid() = author_id
    or public.is_moderator()
    or exists (
      select 1 from public.forum_posts fp
      where fp.id = forum_comments.post_id
        and fp.author_id = auth.uid()
    )
  );

create policy "forum_comments_delete_own_or_mod"
  on public.forum_comments for delete
  using (auth.uid() = author_id or public.is_moderator());

create policy "forum_post_votes_select_public"
  on public.forum_post_votes for select
  using (true);

create policy "forum_post_votes_insert_own"
  on public.forum_post_votes for insert
  with check (auth.uid() = user_id);

create policy "forum_post_votes_update_own"
  on public.forum_post_votes for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "forum_post_votes_delete_own"
  on public.forum_post_votes for delete
  using (auth.uid() = user_id);

create policy "forum_comment_votes_select_public"
  on public.forum_comment_votes for select
  using (true);

create policy "forum_comment_votes_insert_own"
  on public.forum_comment_votes for insert
  with check (auth.uid() = user_id);

create policy "forum_comment_votes_update_own"
  on public.forum_comment_votes for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "forum_comment_votes_delete_own"
  on public.forum_comment_votes for delete
  using (auth.uid() = user_id);

create policy "forum_bookmarks_select_own"
  on public.forum_bookmarks for select
  using (auth.uid() = user_id);

create policy "forum_bookmarks_insert_own"
  on public.forum_bookmarks for insert
  with check (auth.uid() = user_id);

create policy "forum_bookmarks_delete_own"
  on public.forum_bookmarks for delete
  using (auth.uid() = user_id);

create policy "forum_reports_insert_own"
  on public.forum_reports for insert
  with check (auth.uid() = reporter_id);

create policy "forum_reports_select_own_or_mod"
  on public.forum_reports for select
  using (auth.uid() = reporter_id or public.is_moderator());

create policy "forum_reports_update_mod"
  on public.forum_reports for update
  using (public.is_moderator())
  with check (public.is_moderator());

-- 9.8 academic_programs, enrollments, discussions, doubts
create policy "academic_programs_select_public"
  on public.academic_programs for select
  using (true);

create policy "academic_programs_insert_authenticated"
  on public.academic_programs for insert
  with check (auth.uid() is not null and (created_by is null or created_by = auth.uid()));

create policy "academic_programs_update_creator_or_mod"
  on public.academic_programs for update
  using (auth.uid() = created_by or public.is_moderator())
  with check (auth.uid() = created_by or public.is_moderator());

create policy "program_enrollments_select_public"
  on public.program_enrollments for select
  using (true);

create policy "program_enrollments_insert_own"
  on public.program_enrollments for insert
  with check (auth.uid() = user_id);

create policy "program_enrollments_delete_own"
  on public.program_enrollments for delete
  using (auth.uid() = user_id);

create policy "program_discussions_select_public"
  on public.program_discussions for select
  using (true);

create policy "program_discussions_insert_own"
  on public.program_discussions for insert
  with check (auth.uid() = author_id);

create policy "program_discussions_update_own_or_mod"
  on public.program_discussions for update
  using (auth.uid() = author_id or public.is_moderator())
  with check (auth.uid() = author_id or public.is_moderator());

create policy "program_discussions_delete_own_or_mod"
  on public.program_discussions for delete
  using (auth.uid() = author_id or public.is_moderator());

create policy "program_discussion_comments_select_public"
  on public.program_discussion_comments for select
  using (true);

create policy "program_discussion_comments_insert_own"
  on public.program_discussion_comments for insert
  with check (auth.uid() = author_id);

create policy "program_discussion_comments_delete_own_or_mod"
  on public.program_discussion_comments for delete
  using (auth.uid() = author_id or public.is_moderator());

create policy "program_doubts_select_public"
  on public.program_doubts for select
  using (true);

create policy "program_doubts_insert_own"
  on public.program_doubts for insert
  with check (auth.uid() = author_id);

create policy "program_doubts_update_own_or_mod"
  on public.program_doubts for update
  using (auth.uid() = author_id or public.is_moderator())
  with check (auth.uid() = author_id or public.is_moderator());

create policy "program_doubts_delete_own_or_mod"
  on public.program_doubts for delete
  using (auth.uid() = author_id or public.is_moderator());

create policy "program_doubt_answers_select_public"
  on public.program_doubt_answers for select
  using (true);

create policy "program_doubt_answers_insert_own"
  on public.program_doubt_answers for insert
  with check (auth.uid() = author_id);

create policy "program_doubt_answers_update_own_or_question_author"
  on public.program_doubt_answers for update
  using (
    auth.uid() = author_id
    or public.is_moderator()
    or exists (
      select 1 from public.program_doubts pd
      where pd.id = program_doubt_answers.question_id
        and pd.author_id = auth.uid()
    )
  )
  with check (
    auth.uid() = author_id
    or public.is_moderator()
    or exists (
      select 1 from public.program_doubts pd
      where pd.id = program_doubt_answers.question_id
        and pd.author_id = auth.uid()
    )
  );

create policy "program_doubt_answers_delete_own_or_mod"
  on public.program_doubt_answers for delete
  using (auth.uid() = author_id or public.is_moderator());

-- 9.9 universities, departments, courses, follows, discussions, doubts
create policy "universities_select_public"
  on public.universities for select
  using (true);

create policy "universities_insert_authenticated"
  on public.universities for insert
  with check (auth.uid() is not null and (created_by is null or created_by = auth.uid()));

create policy "universities_update_creator_or_mod"
  on public.universities for update
  using (auth.uid() = created_by or public.is_moderator())
  with check (auth.uid() = created_by or public.is_moderator());

create policy "departments_select_public"
  on public.departments for select
  using (true);

create policy "departments_mod_write"
  on public.departments for all
  using (public.is_moderator())
  with check (public.is_moderator());

create policy "courses_select_public"
  on public.courses for select
  using (true);

create policy "courses_mod_write"
  on public.courses for all
  using (public.is_moderator())
  with check (public.is_moderator());

create policy "university_follows_select_public"
  on public.university_follows for select
  using (true);

create policy "university_follows_insert_own"
  on public.university_follows for insert
  with check (auth.uid() = user_id);

create policy "university_follows_delete_own"
  on public.university_follows for delete
  using (auth.uid() = user_id);

create policy "university_discussions_select_public"
  on public.university_discussions for select
  using (true);

create policy "university_discussions_insert_own"
  on public.university_discussions for insert
  with check (auth.uid() = author_id);

create policy "university_discussions_update_own_or_mod"
  on public.university_discussions for update
  using (auth.uid() = author_id or public.is_moderator())
  with check (auth.uid() = author_id or public.is_moderator());

create policy "university_discussions_delete_own_or_mod"
  on public.university_discussions for delete
  using (auth.uid() = author_id or public.is_moderator());

create policy "university_discussion_comments_select_public"
  on public.university_discussion_comments for select
  using (true);

create policy "university_discussion_comments_insert_own"
  on public.university_discussion_comments for insert
  with check (auth.uid() = author_id);

create policy "university_discussion_comments_delete_own_or_mod"
  on public.university_discussion_comments for delete
  using (auth.uid() = author_id or public.is_moderator());

create policy "university_doubts_select_public"
  on public.university_doubts for select
  using (true);

create policy "university_doubts_insert_own"
  on public.university_doubts for insert
  with check (auth.uid() = author_id);

create policy "university_doubts_update_own_or_mod"
  on public.university_doubts for update
  using (auth.uid() = author_id or public.is_moderator())
  with check (auth.uid() = author_id or public.is_moderator());

create policy "university_doubts_delete_own_or_mod"
  on public.university_doubts for delete
  using (auth.uid() = author_id or public.is_moderator());

create policy "university_doubt_answers_select_public"
  on public.university_doubt_answers for select
  using (true);

create policy "university_doubt_answers_insert_own"
  on public.university_doubt_answers for insert
  with check (auth.uid() = author_id);

create policy "university_doubt_answers_update_own_or_question_author"
  on public.university_doubt_answers for update
  using (
    auth.uid() = author_id
    or public.is_moderator()
    or exists (
      select 1 from public.university_doubts ud
      where ud.id = university_doubt_answers.question_id
        and ud.author_id = auth.uid()
    )
  )
  with check (
    auth.uid() = author_id
    or public.is_moderator()
    or exists (
      select 1 from public.university_doubts ud
      where ud.id = university_doubt_answers.question_id
        and ud.author_id = auth.uid()
    )
  );

create policy "university_doubt_answers_delete_own_or_mod"
  on public.university_doubt_answers for delete
  using (auth.uid() = author_id or public.is_moderator());

-- 9.10 community_item_votes
create policy "community_item_votes_select_public"
  on public.community_item_votes for select
  using (true);

create policy "community_item_votes_insert_own"
  on public.community_item_votes for insert
  with check (auth.uid() = user_id);

create policy "community_item_votes_delete_own"
  on public.community_item_votes for delete
  using (auth.uid() = user_id);

-- ============================================================================
-- 10. STORAGE BUCKETS & STORAGE RLS POLICIES (5 MB STUDY MATERIALS, 2 MB AVATARS)
-- ============================================================================

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'study-materials',
  'study-materials',
  true,
  5242880,
  array[
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'text/plain',
    'text/markdown',
    'image/png',
    'image/jpeg',
    'image/webp'
  ]
)
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'avatars',
  'avatars',
  true,
  2097152,
  array['image/png', 'image/jpeg', 'image/webp', 'image/gif']
)
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "study_materials_public_read" on storage.objects;
drop policy if exists "study_materials_auth_insert" on storage.objects;
drop policy if exists "study_materials_owner_update" on storage.objects;
drop policy if exists "study_materials_owner_delete" on storage.objects;
drop policy if exists "avatars_public_read" on storage.objects;
drop policy if exists "avatars_auth_insert" on storage.objects;
drop policy if exists "avatars_owner_update" on storage.objects;
drop policy if exists "avatars_owner_delete" on storage.objects;

create policy "study_materials_public_read"
  on storage.objects for select
  using (bucket_id = 'study-materials');

create policy "study_materials_auth_insert"
  on storage.objects for insert
  with check (
    bucket_id = 'study-materials'
    and auth.uid() is not null
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "study_materials_owner_update"
  on storage.objects for update
  using (
    bucket_id = 'study-materials'
    and auth.uid() is not null
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "study_materials_owner_delete"
  on storage.objects for delete
  using (
    bucket_id = 'study-materials'
    and (
      (auth.uid() is not null and (storage.foldername(name))[1] = auth.uid()::text)
      or public.is_moderator()
    )
  );

create policy "avatars_public_read"
  on storage.objects for select
  using (bucket_id = 'avatars');

create policy "avatars_auth_insert"
  on storage.objects for insert
  with check (
    bucket_id = 'avatars'
    and auth.uid() is not null
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "avatars_owner_update"
  on storage.objects for update
  using (
    bucket_id = 'avatars'
    and auth.uid() is not null
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "avatars_owner_delete"
  on storage.objects for delete
  using (
    bucket_id = 'avatars'
    and auth.uid() is not null
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- ============================================================================
-- 11. HARDENED RPC FUNCTIONS
-- ============================================================================

-- 11.1 Validated download counter increment
create or replace function public.increment_downloads(row_id text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if row_id is null or length(trim(row_id)) = 0 then
    return;
  end if;

  update public.study_notes
  set downloads = coalesce(downloads, 0) + 1,
      downloads_count = coalesce(downloads_count, 0) + 1,
      updated_at = now()
  where id = row_id
    and status = 'published'
    and is_public = true
    and (not is_restricted or auth.uid() is not null);
end;
$$;

-- 11.2 User-bound community upvote persistence (prevents repeated anonymous counter manipulation)
create or replace function public.adjust_community_upvote(
  p_table text,
  p_id text,
  p_delta integer
)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid;
  v_new_count integer := 0;
begin
  v_uid := auth.uid();
  if v_uid is null then
    raise exception 'Authentication is required to vote on community items.';
  end if;

  if p_table not in (
    'program_discussions',
    'program_discussion_comments',
    'program_doubts',
    'program_doubt_answers',
    'university_discussions',
    'university_discussion_comments',
    'university_doubts',
    'university_doubt_answers'
  ) then
    raise exception 'Unsupported community table: %', p_table;
  end if;

  if p_delta > 0 then
    insert into public.community_item_votes (target_table, target_id, user_id)
    values (p_table, p_id, v_uid)
    on conflict (target_table, target_id, user_id) do nothing;
  else
    delete from public.community_item_votes
    where target_table = p_table
      and target_id = p_id
      and user_id = v_uid;
  end if;

  select count(*)::integer
  into v_new_count
  from public.community_item_votes
  where target_table = p_table
    and target_id = p_id;

  execute format(
    'update public.%I set upvotes_count = $1 where id = $2',
    p_table
  ) using v_new_count, p_id;

  return v_new_count;
end;
$$;

-- 11.3 Case-insensitive username availability check (without exposing profiles.email)
create or replace function public.check_username_available(
  requested_username text,
  current_user_id uuid default null
)
returns boolean
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_clean text;
begin
  v_clean := lower(trim(coalesce(requested_username, '')));
  if length(v_clean) < 3 then
    return false;
  end if;

  return not exists (
    select 1
    from public.profiles p
    where lower(p.username) = v_clean
      and (current_user_id is null or p.id <> current_user_id)
  );
end;
$$;

-- 11.4 Aggregated public cohort counts (never exposes individual academic_information rows)
create or replace function public.get_public_cohort_counts()
returns table (
  institution_name text,
  major text,
  student_count bigint
)
language sql
stable
security definer
set search_path = public
as $$
  select
    coalesce(nullif(trim(ai.institution_name), ''), '') as institution_name,
    coalesce(nullif(trim(ai.major), ''), nullif(trim(ai.degree_program), ''), '') as major,
    count(distinct ai.user_id) as student_count
  from public.academic_information ai
  where nullif(trim(ai.institution_name), '') is not null
     or nullif(trim(ai.major), '') is not null
     or nullif(trim(ai.degree_program), '') is not null
  group by 1, 2;
$$;

-- ============================================================================
-- 12. EXPLICIT TABLE, VIEW & FUNCTION GRANTS + REALTIME PUBLICATIONS
-- ============================================================================

grant usage on schema public to anon, authenticated;

-- Publicly readable tables
grant select on
  public.public_student_profiles,
  public.stored_files,
  public.study_notes,
  public.study_note_upvotes,
  public.forum_topics,
  public.forum_posts,
  public.forum_comments,
  public.forum_post_votes,
  public.forum_comment_votes,
  public.academic_programs,
  public.program_enrollments,
  public.program_discussions,
  public.program_discussion_comments,
  public.program_doubts,
  public.program_doubt_answers,
  public.universities,
  public.departments,
  public.courses,
  public.university_follows,
  public.university_discussions,
  public.university_discussion_comments,
  public.university_doubts,
  public.university_doubt_answers,
  public.community_item_votes
to anon, authenticated;

-- Authenticated write/own-row tables (protected by RLS + column-protection triggers)
grant select, insert, update on public.profiles to authenticated;
grant select, insert, update, delete on
  public.academic_information,
  public.user_settings_preferences,
  public.stored_files,
  public.study_notes,
  public.study_note_upvotes,
  public.forum_topics,
  public.forum_posts,
  public.forum_comments,
  public.forum_post_votes,
  public.forum_comment_votes,
  public.forum_bookmarks,
  public.forum_reports,
  public.academic_programs,
  public.program_enrollments,
  public.program_discussions,
  public.program_discussion_comments,
  public.program_doubts,
  public.program_doubt_answers,
  public.universities,
  public.university_follows,
  public.university_discussions,
  public.university_discussion_comments,
  public.university_doubts,
  public.university_doubt_answers,
  public.community_item_votes
to authenticated;

-- Moderator roles: read-only for authenticated (subject to RLS); no self-insert/update/delete
revoke insert, update, delete on public.moderator_roles from anon, authenticated;
grant select on public.moderator_roles to authenticated;

-- Function execution grants
grant execute on function public.increment_downloads(text) to anon, authenticated;
revoke execute on function public.adjust_community_upvote(text, text, integer) from anon;
grant execute on function public.adjust_community_upvote(text, text, integer) to authenticated;
grant execute on function public.check_username_available(text, uuid) to anon, authenticated;
grant execute on function public.get_public_cohort_counts() to anon, authenticated;
grant execute on function public.is_moderator() to anon, authenticated;
grant execute on function public.is_platform_admin() to anon, authenticated;

-- Ensure Realtime publication includes canonical shared tables
do $$
declare
  rt_table text;
  rt_tables text[] := array[
    'study_notes',
    'study_note_upvotes',
    'forum_posts',
    'forum_comments',
    'forum_post_votes',
    'forum_comment_votes',
    'program_discussions',
    'program_discussion_comments',
    'program_doubts',
    'program_doubt_answers',
    'university_discussions',
    'university_discussion_comments',
    'university_doubts',
    'university_doubt_answers',
    'community_item_votes'
  ];
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    foreach rt_table in array rt_tables loop
      if not exists (
        select 1
        from pg_publication_tables
        where pubname = 'supabase_realtime'
          and schemaname = 'public'
          and tablename = rt_table
      ) then
        execute format('alter publication supabase_realtime add table public.%I', rt_table);
      end if;
    end loop;
  end if;
end $$;

commit;
