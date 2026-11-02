-- ==============================================================================
-- XEUSAR AUTHENTICATION, PROFILES, ACADEMIC INFORMATION & PREFERENCES MIGRATION
-- Repeatable, idempotent SQL setup for Supabase (PostgreSQL + Auth + Storage)
-- Run this in Supabase Dashboard -> SQL Editor -> New Query
-- ==============================================================================

-- 1. PROFILES TABLE
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text not null,
  display_name text not null,
  full_name text,
  avatar_url text,
  bio text,
  setup_completed boolean not null default false,
  created_at timestamp with time zone not null default timezone('utc'::text, now()),
  updated_at timestamp with time zone not null default timezone('utc'::text, now())
);

-- Ensure all required columns exist if public.profiles was created by an earlier template
alter table public.profiles add column if not exists username text;
alter table public.profiles add column if not exists display_name text;
alter table public.profiles add column if not exists full_name text;
alter table public.profiles add column if not exists avatar_url text;
alter table public.profiles add column if not exists bio text;
alter table public.profiles add column if not exists setup_completed boolean not null default false;
alter table public.profiles add column if not exists created_at timestamp with time zone not null default timezone('utc'::text, now());
alter table public.profiles add column if not exists updated_at timestamp with time zone not null default timezone('utc'::text, now());

-- Backfill any existing rows where display_name or username might be null
update public.profiles
set display_name = coalesce(nullif(trim(display_name), ''), nullif(trim(full_name), ''), 'Student')
where display_name is null or trim(display_name) = '';

update public.profiles
set username = 'user_' || substr(replace(id::text, '-', ''), 1, 8)
where username is null or trim(username) = '';

-- Add validation constraints safely (drop first so re-running never errors)
alter table public.profiles drop constraint if exists profiles_username_length;
alter table public.profiles add constraint profiles_username_length
  check (char_length(trim(username)) >= 3 and char_length(trim(username)) <= 30);

alter table public.profiles drop constraint if exists profiles_username_format;
alter table public.profiles add constraint profiles_username_format
  check (username ~ '^[a-zA-Z0-9_.-]+$');

alter table public.profiles drop constraint if exists profiles_display_name_not_empty;
alter table public.profiles add constraint profiles_display_name_not_empty
  check (char_length(trim(display_name)) >= 1);

-- Case-insensitive uniqueness index on username
create unique index if not exists idx_profiles_username_lower
  on public.profiles (lower(username));

-- 2. ACADEMIC INFORMATION TABLE
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
  updated_at timestamp with time zone not null default timezone('utc'::text, now())
);

create index if not exists idx_academic_information_institution
  on public.academic_information (institution_name);

-- 3. USER SETTINGS AND PREFERENCES TABLE
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
  updated_at timestamp with time zone not null default timezone('utc'::text, now())
);

-- 4. UPDATED_AT TIMESTAMP TRIGGER FUNCTION
create or replace function public.set_current_timestamp_updated_at()
returns trigger as $$
begin
  new.updated_at = timezone('utc'::text, now());
  return new;
end;
$$ language plpgsql;

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

-- 5. ENABLE ROW LEVEL SECURITY (RLS)
alter table public.profiles enable row level security;
alter table public.academic_information enable row level security;
alter table public.user_settings_preferences enable row level security;

-- Profiles RLS Policies (Users can access and modify only their own records)
drop policy if exists "Users can view their own profile" on public.profiles;
create policy "Users can view their own profile"
  on public.profiles for select
  using (auth.uid() = id);

drop policy if exists "Users can insert their own profile" on public.profiles;
create policy "Users can insert their own profile"
  on public.profiles for insert
  with check (auth.uid() = id);

drop policy if exists "Users can update their own profile" on public.profiles;
create policy "Users can update their own profile"
  on public.profiles for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

drop policy if exists "Users can delete their own profile" on public.profiles;
create policy "Users can delete their own profile"
  on public.profiles for delete
  using (auth.uid() = id);

-- Academic Information RLS Policies
drop policy if exists "Users can view their own academic information" on public.academic_information;
create policy "Users can view their own academic information"
  on public.academic_information for select
  using (auth.uid() = user_id);

drop policy if exists "Users can insert their own academic information" on public.academic_information;
create policy "Users can insert their own academic information"
  on public.academic_information for insert
  with check (auth.uid() = user_id);

drop policy if exists "Users can update their own academic information" on public.academic_information;
create policy "Users can update their own academic information"
  on public.academic_information for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Users can delete their own academic information" on public.academic_information;
create policy "Users can delete their own academic information"
  on public.academic_information for delete
  using (auth.uid() = user_id);

-- User Settings & Preferences RLS Policies
drop policy if exists "Users can view their own settings and preferences" on public.user_settings_preferences;
create policy "Users can view their own settings and preferences"
  on public.user_settings_preferences for select
  using (auth.uid() = user_id);

drop policy if exists "Users can insert their own settings and preferences" on public.user_settings_preferences;
create policy "Users can insert their own settings and preferences"
  on public.user_settings_preferences for insert
  with check (auth.uid() = user_id);

drop policy if exists "Users can update their own settings and preferences" on public.user_settings_preferences;
create policy "Users can update their own settings and preferences"
  on public.user_settings_preferences for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Users can delete their own settings and preferences" on public.user_settings_preferences;
create policy "Users can delete their own settings and preferences"
  on public.user_settings_preferences for delete
  using (auth.uid() = user_id);

-- 6. SAFE USERNAME AVAILABILITY CHECK RPC (Case-Insensitive, Does Not Expose Private Rows)
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

-- 7. AUTOMATIC PROFILE INITIALIZATION ON AUTH.USERS CREATION
create or replace function public.handle_new_xeusar_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  raw_username text;
  raw_display_name text;
  final_username text;
begin
  begin
    raw_display_name := trim(coalesce(
      new.raw_user_meta_data->>'display_name',
      new.raw_user_meta_data->>'full_name',
      new.raw_user_meta_data->>'name',
      split_part(coalesce(new.email, 'scholar'), '@', 1)
    ));
    if raw_display_name = '' then
      raw_display_name := 'Student';
    end if;

    raw_username := regexp_replace(
      lower(trim(coalesce(
        new.raw_user_meta_data->>'username',
        split_part(coalesce(new.email, 'user'), '@', 1)
      ))),
      '[^a-z0-9_.-]',
      '',
      'g'
    );
    if char_length(raw_username) < 3 then
      raw_username := 'user_' || substr(replace(new.id::text, '-', ''), 1, 8);
    end if;

    -- Ensure uniqueness on fallback collision
    if exists (select 1 from public.profiles where lower(username) = lower(raw_username) and id <> new.id) then
      final_username := substr(raw_username, 1, 20) || '_' || substr(replace(new.id::text, '-', ''), 1, 6);
    else
      final_username := substr(raw_username, 1, 30);
    end if;

    insert into public.profiles (id, username, display_name, full_name, setup_completed)
    values (new.id, final_username, raw_display_name, raw_display_name, false)
    on conflict (id) do update set
      display_name = coalesce(nullif(trim(public.profiles.display_name), ''), excluded.display_name),
      full_name = coalesce(nullif(trim(public.profiles.full_name), ''), excluded.full_name),
      username = coalesce(nullif(trim(public.profiles.username), ''), excluded.username);

    insert into public.academic_information (user_id)
    values (new.id)
    on conflict (user_id) do nothing;

    insert into public.user_settings_preferences (user_id)
    values (new.id)
    on conflict (user_id) do nothing;
  exception when others then
    -- Never block auth.users signup if profile table schema differs
    null;
  end;

  return new;
end;
$$;

-- Drop any legacy starter trigger that might fail on missing columns
drop trigger if exists on_auth_user_created on auth.users;
drop trigger if exists on_auth_user_created_xeusar on auth.users;
create trigger on_auth_user_created_xeusar
  after insert on auth.users
  for each row execute function public.handle_new_xeusar_user();

-- 8. SUPABASE STORAGE BUCKET & RLS POLICIES FOR PROFILE PICTURES
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

drop policy if exists "Avatar images are publicly accessible" on storage.objects;
create policy "Avatar images are publicly accessible"
  on storage.objects for select
  using (bucket_id = 'avatars');

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

-- 9. REFRESH POSTGREST SCHEMA CACHE
notify pgrst, 'reload schema';
