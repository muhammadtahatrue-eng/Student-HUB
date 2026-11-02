-- ============================================================================
-- XEUSAR — UNIFIED STUDY LIBRARY & MY PROGRAM RESOURCES + STORAGE QUOTA SQL
-- 1. Authoritative study_notes table shared between My Program & Study Library
-- 2. stored_files SHA-256 deduplication registry with 5 MB file limit & 1 GB quota
-- 3. study-materials Storage Bucket with 5 MB (5,242,880 bytes) upload limit
-- ============================================================================

create extension if not exists "pgcrypto";

-- 1. Physical Stored Files Registry (SHA-256 Deduplicated, 5 MB max file, 1 GB total quota)
create table if not exists public.stored_files (
  content_hash text primary key,
  storage_path text not null,
  file_url text not null,
  mime_type text not null default 'application/pdf',
  size_bytes bigint not null check (size_bytes > 0 and size_bytes <= 5242880),
  created_at timestamptz not null default now()
);

-- Enforce 1 GB (1,073,741,824 bytes) Total Physical Storage Budget across unique files
create or replace function public.enforce_total_storage_quota()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  current_total bigint;
begin
  if new.size_bytes > 5242880 then
    raise exception 'This file exceeds the 5 MB upload limit. Please compress it or choose a smaller file.';
  end if;

  select coalesce(sum(size_bytes), 0)
    into current_total
    from public.stored_files
   where content_hash <> new.content_hash;

  if (current_total + new.size_bytes) > 1073741824 then
    raise exception 'Storage quota reached (1 GB limit). Cannot store additional physical files until space is freed.';
  end if;

  return new;
end;
$$;

drop trigger if exists trg_enforce_total_storage_quota on public.stored_files;
create trigger trg_enforce_total_storage_quota
  before insert or update on public.stored_files
  for each row execute function public.enforce_total_storage_quota();

-- 2. Authoritative study_notes Table (Shared by Study Library & My Program)
create table if not exists public.study_notes (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text default '',
  course_code text not null,
  course_name text not null,
  course_id text,
  subject text not null default 'Computer Science',
  material_type text not null default 'lecture_notes',
  academic_year integer not null default 2025,
  semester text not null default 'Fall Semester',
  semester_number integer default 1,
  professor text default 'Course Instructor',
  file_url text not null,
  file_name text not null,
  file_size_bytes bigint not null default 0 check (file_size_bytes <= 5242880),
  page_count integer not null default 1,
  uploader_id uuid references auth.users(id) on delete set null,
  uploader_name text not null default 'Anonymous Student',
  uploader_university text default 'Open Campus',
  university_id text,
  program_id text default 'bs-cs',
  program_ids text[] default array['bs-cs']::text[],
  program_name text default 'BS Computer Science',
  degree_tier text default 'Undergraduate',
  content_hash text,
  storage_path text,
  downloads_count integer not null default 0,
  upvotes_count integer not null default 0,
  tags text[] default '{}'::text[],
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Safely add shared program/storage columns if study_notes already existed
alter table public.study_notes add column if not exists course_id text;
alter table public.study_notes add column if not exists semester_number integer default 1;
alter table public.study_notes add column if not exists uploader_id uuid references auth.users(id) on delete set null;
alter table public.study_notes add column if not exists university_id text;
alter table public.study_notes add column if not exists program_id text default 'bs-cs';
alter table public.study_notes add column if not exists program_ids text[] default array['bs-cs']::text[];
alter table public.study_notes add column if not exists program_name text default 'BS Computer Science';
alter table public.study_notes add column if not exists degree_tier text default 'Undergraduate';
alter table public.study_notes add column if not exists content_hash text;
alter table public.study_notes add column if not exists storage_path text;
alter table public.study_notes add column if not exists updated_at timestamptz not null default now();

create index if not exists idx_study_notes_program_id on public.study_notes(program_id);
create index if not exists idx_study_notes_semester_number on public.study_notes(semester_number);
create index if not exists idx_study_notes_course_code on public.study_notes(course_code);
create index if not exists idx_study_notes_content_hash on public.study_notes(content_hash);

-- 3. RLS Policies for study_notes & stored_files
alter table public.study_notes enable row level security;
alter table public.stored_files enable row level security;

drop policy if exists "study_notes_select_public" on public.study_notes;
create policy "study_notes_select_public"
  on public.study_notes for select
  using (true);

drop policy if exists "study_notes_insert_public" on public.study_notes;
create policy "study_notes_insert_public"
  on public.study_notes for insert
  with check (file_size_bytes <= 5242880);

drop policy if exists "study_notes_update_owner" on public.study_notes;
create policy "study_notes_update_owner"
  on public.study_notes for update
  using (uploader_id is null or auth.uid() = uploader_id);

drop policy if exists "study_notes_delete_owner" on public.study_notes;
create policy "study_notes_delete_owner"
  on public.study_notes for delete
  using (uploader_id is null or auth.uid() = uploader_id);

drop policy if exists "stored_files_select_public" on public.stored_files;
create policy "stored_files_select_public"
  on public.stored_files for select
  using (true);

drop policy if exists "stored_files_insert_public" on public.stored_files;
create policy "stored_files_insert_public"
  on public.stored_files for insert
  with check (size_bytes <= 5242880);

-- 4. Configure study-materials Storage Bucket with 5 MB (5,242,880 bytes) Limit
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'study-materials',
  'study-materials',
  true,
  5242880,
  array['application/pdf', 'image/png', 'image/jpeg', 'image/webp']
)
on conflict (id) do update set
  public = true,
  file_size_limit = 5242880,
  allowed_mime_types = array['application/pdf', 'image/png', 'image/jpeg', 'image/webp'];

notify pgrst, 'reload schema';
