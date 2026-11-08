-- =============================================================================
-- XEUSAR v4 COMPLETE SECURITY & PUBLIC SYNC REPAIR — PART 1 OF 4
-- Extensions, Admin Helpers, 30 Canonical Tables, Indexes & Public View
-- =============================================================================
BEGIN;

CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;

-- -----------------------------------------------------------------------------
-- 1. GENERIC UPDATED_AT TRIGGER FUNCTION
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = pg_catalog, public
AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

-- -----------------------------------------------------------------------------
-- 2. IDENTITY, ACADEMIC PROFILE, SETTINGS & MODERATOR ROLES (Tables 1 - 4)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username text UNIQUE,
  display_name text NOT NULL DEFAULT 'Student',
  full_name text NOT NULL DEFAULT 'Student',
  avatar_url text DEFAULT '',
  bio text DEFAULT '',
  email text DEFAULT NULL,
  role text NOT NULL DEFAULT 'student',
  points integer NOT NULL DEFAULT 0,
  setup_completed boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT profiles_username_format_chk CHECK (
    username IS NULL OR (
      char_length(btrim(username)) BETWEEN 2 AND 40
      AND username ~ '^[a-zA-Z0-9_.-]+$'
    )
  ),
  CONSTRAINT profiles_bio_length_chk CHECK (char_length(coalesce(bio, '')) <= 2000),
  CONSTRAINT profiles_role_chk CHECK (role IN ('student', 'educator', 'moderator', 'admin')),
  CONSTRAINT profiles_points_nonneg_chk CHECK (points >= 0)
);

CREATE TABLE IF NOT EXISTS public.moderator_roles (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role text NOT NULL DEFAULT 'moderator',
  assigned_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  notes text DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT moderator_roles_role_chk CHECK (role IN ('moderator', 'admin', 'super_admin'))
);

-- Privileged role helpers (owned by postgres, zero direct table access needed)
CREATE OR REPLACE FUNCTION public.is_platform_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.moderator_roles mr
    WHERE mr.user_id = auth.uid()
      AND mr.role IN ('moderator', 'admin', 'super_admin')
  );
$$;
ALTER FUNCTION public.is_platform_admin() OWNER TO postgres;

CREATE OR REPLACE FUNCTION public.get_my_moderator_role()
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
  SELECT coalesce(
    (
      SELECT mr.role
      FROM public.moderator_roles mr
      WHERE mr.user_id = auth.uid()
      LIMIT 1
    ),
    'student'
  );
$$;
ALTER FUNCTION public.get_my_moderator_role() OWNER TO postgres;

-- -----------------------------------------------------------------------------
-- 3. UNIVERSITIES, DEPARTMENTS, COURSES & ACADEMIC PROGRAMS (Tables 5 - 10)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.universities (
  id text PRIMARY KEY,
  name text NOT NULL,
  short_name text DEFAULT '',
  slug text UNIQUE,
  location text DEFAULT '',
  country text DEFAULT '',
  website text DEFAULT '',
  description text DEFAULT '',
  logo_url text DEFAULT '',
  banner_url text DEFAULT '',
  type text NOT NULL DEFAULT 'public',
  access_scope text NOT NULL DEFAULT 'public',
  is_verified boolean NOT NULL DEFAULT false,
  followers_count integer NOT NULL DEFAULT 0,
  courses_count integer NOT NULL DEFAULT 0,
  resources_count integer NOT NULL DEFAULT 0,
  created_by uuid DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT universities_id_len_chk CHECK (char_length(btrim(id)) BETWEEN 1 AND 128),
  CONSTRAINT universities_name_len_chk CHECK (char_length(btrim(name)) BETWEEN 2 AND 250),
  CONSTRAINT universities_access_scope_chk CHECK (
    access_scope IN ('public', 'members_only', 'verified_members_only')
  ),
  CONSTRAINT universities_counts_nonneg_chk CHECK (
    followers_count >= 0 AND courses_count >= 0 AND resources_count >= 0
  )
);

CREATE TABLE IF NOT EXISTS public.departments (
  id text PRIMARY KEY,
  university_id text NOT NULL,
  name text NOT NULL,
  code text DEFAULT '',
  description text DEFAULT '',
  faculty_head text DEFAULT '',
  courses_count integer NOT NULL DEFAULT 0,
  created_by uuid DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT departments_name_len_chk CHECK (char_length(btrim(name)) BETWEEN 2 AND 200),
  CONSTRAINT departments_courses_count_chk CHECK (courses_count >= 0)
);

CREATE TABLE IF NOT EXISTS public.courses (
  id text PRIMARY KEY,
  university_id text NOT NULL,
  department_id text DEFAULT NULL,
  code text NOT NULL,
  name text NOT NULL,
  title text DEFAULT '',
  description text DEFAULT '',
  semester text DEFAULT '',
  credits integer NOT NULL DEFAULT 3,
  instructor text DEFAULT '',
  resources_count integer NOT NULL DEFAULT 0,
  created_by uuid DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT courses_credits_chk CHECK (credits BETWEEN 0 AND 60),
  CONSTRAINT courses_resources_count_chk CHECK (resources_count >= 0)
);

CREATE TABLE IF NOT EXISTS public.academic_programs (
  id text PRIMARY KEY,
  university_id text DEFAULT NULL,
  title text NOT NULL,
  name text DEFAULT '',
  code text DEFAULT '',
  category text NOT NULL DEFAULT 'General',
  level text NOT NULL DEFAULT 'Undergraduate',
  duration text DEFAULT '4 Years',
  description text DEFAULT '',
  syllabus_summary text DEFAULT '',
  career_paths jsonb NOT NULL DEFAULT '[]'::jsonb,
  subjects jsonb NOT NULL DEFAULT '[]'::jsonb,
  access_scope text NOT NULL DEFAULT 'public',
  is_verified boolean NOT NULL DEFAULT false,
  enrolled_count integer NOT NULL DEFAULT 0,
  discussions_count integer NOT NULL DEFAULT 0,
  doubts_count integer NOT NULL DEFAULT 0,
  created_by uuid DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT academic_programs_title_len_chk CHECK (char_length(btrim(title)) BETWEEN 2 AND 250),
  CONSTRAINT academic_programs_access_scope_chk CHECK (access_scope IN ('public', 'enrolled_only')),
  CONSTRAINT academic_programs_counts_nonneg_chk CHECK (
    enrolled_count >= 0 AND discussions_count >= 0 AND doubts_count >= 0
  )
);

CREATE TABLE IF NOT EXISTS public.academic_information (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE REFERENCES public.profiles(id) ON DELETE CASCADE,
  university_id text DEFAULT NULL,
  program_id text DEFAULT NULL,
  education_level text NOT NULL DEFAULT 'undergraduate',
  academic_stage text DEFAULT '',
  institution_name text DEFAULT '',
  degree_program text DEFAULT '',
  major text DEFAULT '',
  field_of_study text DEFAULT '',
  academic_year text DEFAULT '',
  semester text DEFAULT '',
  current_semester text DEFAULT '',
  student_id_number text DEFAULT '',
  graduation_year integer DEFAULT NULL,
  enrollment_verified boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT academic_info_grad_year_chk CHECK (
    graduation_year IS NULL OR (graduation_year BETWEEN 1950 AND 2100)
  )
);

CREATE TABLE IF NOT EXISTS public.user_settings_preferences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE REFERENCES public.profiles(id) ON DELETE CASCADE,
  account_settings jsonb NOT NULL DEFAULT '{}'::jsonb,
  privacy_settings jsonb NOT NULL DEFAULT '{"public_badge_enabled": true, "show_uni_on_notes": true}'::jsonb,
  notification_settings jsonb NOT NULL DEFAULT '{"email_Resource_updates": true, "discussion_replies": true}'::jsonb,
  appearance_settings jsonb NOT NULL DEFAULT '{"compact_mode": false}'::jsonb,
  preferred_subjects text[] NOT NULL DEFAULT '{}'::text[],
  study_preferences jsonb NOT NULL DEFAULT '{}'::jsonb,
  preferred_language text NOT NULL DEFAULT 'en',
  theme_preference text NOT NULL DEFAULT 'system',
  theme text NOT NULL DEFAULT 'system',
  content_discovery_preferences jsonb NOT NULL DEFAULT '{"prioritize_User_uni": true, "hide_archived": false}'::jsonb,
  email_notifications boolean NOT NULL DEFAULT true,
  forum_notifications boolean NOT NULL DEFAULT true,
  resource_alerts boolean NOT NULL DEFAULT true,
  public_profile boolean NOT NULL DEFAULT true,
  show_academic_info boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.program_enrollments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  program_id text NOT NULL,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role text NOT NULL DEFAULT 'student',
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT program_enrollments_program_user_key UNIQUE (program_id, user_id),
  -- Trap 5 Fix: clean 'alumnus' literal without leading whitespace
  CONSTRAINT program_enrollments_role_chk CHECK (role IN ('student', 'mentor', 'alumnus'))
);

CREATE TABLE IF NOT EXISTS public.university_follows (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  university_id text NOT NULL,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT university_follows_uni_user_key UNIQUE (university_id, user_id)
);

-- -----------------------------------------------------------------------------
-- 4. STUDY LIBRARY, STORED FILES, UPVOTES & DOWNLOADS (Tables 11 - 14)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.stored_files (
  id text PRIMARY KEY DEFAULT gen_random_uuid()::text,
  content_hash text NOT NULL UNIQUE,
  sha256_hash text NOT NULL UNIQUE,
  storage_bucket text NOT NULL DEFAULT 'study-materials',
  storage_path text NOT NULL,
  file_url text NOT NULL DEFAULT '',
  original_filename text DEFAULT '',
  mime_type text NOT NULL DEFAULT 'application/pdf',
  size_bytes bigint NOT NULL DEFAULT 0,
  is_public boolean NOT NULL DEFAULT true,
  uploaded_by uuid DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE SET NULL,
  created_by uuid DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE SET NULL,
  reference_count integer NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT stored_files_bucket_path_key UNIQUE (storage_bucket, storage_path),
  CONSTRAINT stored_files_bucket_chk CHECK (
    storage_bucket IN ('study-materials', 'study-materials-restricted')
  ),
  CONSTRAINT stored_files_size_chk CHECK (size_bytes >= 0 AND size_bytes <= 5242880),
  CONSTRAINT stored_files_ref_count_chk CHECK (reference_count >= 0)
);

CREATE TABLE IF NOT EXISTS public.study_notes (
  id text PRIMARY KEY DEFAULT gen_random_uuid()::text,
  title text NOT NULL,
  subject text NOT NULL DEFAULT 'General',
  course_code text DEFAULT '',
  course_id text DEFAULT NULL,
  university text DEFAULT '',
  university_id text DEFAULT NULL,
  program_id text DEFAULT NULL,
  department text DEFAULT '',
  department_id text DEFAULT NULL,
  semester text DEFAULT '',
  academic_year text DEFAULT '',
  professor text DEFAULT '',
  note_type text NOT NULL DEFAULT 'lecture_notes',
  resource_type text DEFAULT 'notes',
  description text DEFAULT '',
  summary text DEFAULT '',
  content text DEFAULT '',
  tags text[] NOT NULL DEFAULT '{}'::text[],
  pages jsonb NOT NULL DEFAULT '[]'::jsonb,
  page_count integer NOT NULL DEFAULT 1,
  file_url text DEFAULT '',
  storage_bucket text NOT NULL DEFAULT 'study-materials',
  storage_path text DEFAULT '',
  file_name text DEFAULT '',
  file_type text DEFAULT 'application/pdf',
  mime_type text DEFAULT 'application/pdf',
  file_size bigint NOT NULL DEFAULT 0,
  file_size_bytes bigint NOT NULL DEFAULT 0,
  content_hash text DEFAULT NULL,
  file_sha256 text DEFAULT NULL,
  file_id text DEFAULT NULL,
  preview_url text DEFAULT '',
  author_id uuid DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE SET NULL,
  uploader_id uuid DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE SET NULL,
  author_name text NOT NULL DEFAULT 'Student',
  author_avatar text DEFAULT '',
  author_university text DEFAULT '',
  upvotes integer NOT NULL DEFAULT 0,
  downloads integer NOT NULL DEFAULT 0,
  views_count integer NOT NULL DEFAULT 0,
  rating numeric(3,2) NOT NULL DEFAULT 0.00,
  is_verified boolean NOT NULL DEFAULT false,
  is_public boolean NOT NULL DEFAULT true,
  is_published boolean NOT NULL DEFAULT true,
  is_restricted boolean NOT NULL DEFAULT false,
  moderation_status text NOT NULL DEFAULT 'approved',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT study_notes_title_len_chk CHECK (char_length(btrim(title)) BETWEEN 2 AND 300),
  CONSTRAINT study_notes_page_count_chk CHECK (page_count >= 1),
  CONSTRAINT study_notes_bucket_chk CHECK (
    storage_bucket IN ('study-materials', 'study-materials-restricted')
  ),
  CONSTRAINT study_notes_file_size_chk CHECK (file_size >= 0 AND file_size <= 5242880),
  CONSTRAINT study_notes_counters_chk CHECK (
    upvotes >= 0 AND downloads >= 0 AND views_count >= 0 AND rating >= 0 AND rating <= 5
  ),
  CONSTRAINT study_notes_mod_status_chk CHECK (
    moderation_status IN ('approved', 'pending', 'flagged', 'archived', 'rejected')
  )
);

CREATE TABLE IF NOT EXISTS public.study_note_upvotes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  note_id text NOT NULL,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT study_note_upvotes_note_user_key UNIQUE (note_id, user_id)
);

CREATE TABLE IF NOT EXISTS public.study_note_downloads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  note_id text NOT NULL,
  user_id uuid DEFAULT NULL REFERENCES auth.users(id) ON DELETE SET NULL,
  actor_fingerprint text NOT NULL,
  downloaded_date date NOT NULL DEFAULT (now() AT TIME ZONE 'utc')::date,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- -----------------------------------------------------------------------------
-- 5. PUBLIC FORUM TABLES (Tables 15 - 21)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.forum_topics (
  id text PRIMARY KEY,
  name text NOT NULL,
  title text DEFAULT '',
  slug text NOT NULL UNIQUE,
  description text DEFAULT '',
  icon text DEFAULT 'MessageSquare',
  color text DEFAULT '#4F46E5',
  category text NOT NULL DEFAULT 'General',
  sort_order integer NOT NULL DEFAULT 0,
  posts_count integer NOT NULL DEFAULT 0,
  is_locked boolean NOT NULL DEFAULT false,
  created_by uuid DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT forum_topics_name_len_chk CHECK (char_length(btrim(name)) BETWEEN 2 AND 120),
  CONSTRAINT forum_topics_posts_count_chk CHECK (posts_count >= 0)
);

CREATE TABLE IF NOT EXISTS public.forum_posts (
  id text PRIMARY KEY DEFAULT gen_random_uuid()::text,
  topic_id text NOT NULL DEFAULT 'general',
  title text NOT NULL,
  content text NOT NULL,
  author_id uuid DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE SET NULL,
  author_name text NOT NULL DEFAULT 'Student',
  author_username text DEFAULT '',
  author_avatar text DEFAULT '',
  author_role text NOT NULL DEFAULT 'student',
  tags text[] NOT NULL DEFAULT '{}'::text[],
  upvotes integer NOT NULL DEFAULT 0,
  downvotes integer NOT NULL DEFAULT 0,
  score integer NOT NULL DEFAULT 0,
  comments_count integer NOT NULL DEFAULT 0,
  views_count integer NOT NULL DEFAULT 0,
  is_pinned boolean NOT NULL DEFAULT false,
  is_locked boolean NOT NULL DEFAULT false,
  is_resolved boolean NOT NULL DEFAULT false,
  moderation_status text NOT NULL DEFAULT 'approved',
  last_activity_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT forum_posts_title_len_chk CHECK (char_length(btrim(title)) BETWEEN 2 AND 300),
  CONSTRAINT forum_posts_content_len_chk CHECK (char_length(btrim(content)) >= 1),
  CONSTRAINT forum_posts_counts_chk CHECK (
    upvotes >= 0 AND downvotes >= 0 AND comments_count >= 0 AND views_count >= 0
  ),
  CONSTRAINT forum_posts_mod_status_chk CHECK (
    moderation_status IN ('approved', 'pending', 'flagged', 'archived', 'rejected')
  )
);

CREATE TABLE IF NOT EXISTS public.forum_comments (
  id text PRIMARY KEY DEFAULT gen_random_uuid()::text,
  post_id text NOT NULL,
  parent_id text DEFAULT NULL,
  content text NOT NULL,
  author_id uuid DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE SET NULL,
  author_name text NOT NULL DEFAULT 'Student',
  author_username text DEFAULT '',
  author_avatar text DEFAULT '',
  author_role text NOT NULL DEFAULT 'student',
  upvotes integer NOT NULL DEFAULT 0,
  downvotes integer NOT NULL DEFAULT 0,
  score integer NOT NULL DEFAULT 0,
  is_accepted boolean NOT NULL DEFAULT false,
  moderation_status text NOT NULL DEFAULT 'approved',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT forum_comments_content_len_chk CHECK (char_length(btrim(content)) >= 1),
  CONSTRAINT forum_comments_counts_chk CHECK (upvotes >= 0 AND downvotes >= 0),
  CONSTRAINT forum_comments_mod_status_chk CHECK (
    moderation_status IN ('approved', 'pending', 'flagged', 'archived', 'rejected')
  )
);

CREATE TABLE IF NOT EXISTS public.forum_post_votes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id text NOT NULL,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  vote_type smallint NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT forum_post_votes_post_user_key UNIQUE (post_id, user_id),
  CONSTRAINT forum_post_votes_type_chk CHECK (vote_type IN (-1, 1))
);

CREATE TABLE IF NOT EXISTS public.forum_comment_votes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  comment_id text NOT NULL,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  vote_type smallint NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT forum_comment_votes_comment_user_key UNIQUE (comment_id, user_id),
  CONSTRAINT forum_comment_votes_type_chk CHECK (vote_type IN (-1, 1))
);

CREATE TABLE IF NOT EXISTS public.forum_bookmarks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id text NOT NULL,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT forum_bookmarks_post_user_key UNIQUE (post_id, user_id)
);

CREATE TABLE IF NOT EXISTS public.forum_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  target_type text NOT NULL DEFAULT 'post',
  target_id text NOT NULL,
  post_id text DEFAULT NULL,
  comment_id text DEFAULT NULL,
  reporter_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  reason text NOT NULL,
  details text DEFAULT '',
  status text NOT NULL DEFAULT 'pending',
  reviewed_by uuid DEFAULT NULL REFERENCES auth.users(id) ON DELETE SET NULL,
  reviewed_at timestamptz DEFAULT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT forum_reports_target_type_chk CHECK (
    target_type IN ('post', 'comment', 'note', 'program_discussion', 'university_discussion')
  ),
  CONSTRAINT forum_reports_reason_len_chk CHECK (char_length(btrim(reason)) BETWEEN 2 AND 500),
  CONSTRAINT forum_reports_status_chk CHECK (
    status IN ('pending', 'reviewed', 'resolved', 'dismissed')
  )
);

-- -----------------------------------------------------------------------------
-- 6. PROGRAM & UNIVERSITY COMMUNITY TABLES (Tables 22 - 30)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.program_discussions (
  id text PRIMARY KEY DEFAULT gen_random_uuid()::text,
  program_id text NOT NULL,
  title text NOT NULL,
  content text NOT NULL,
  category text NOT NULL DEFAULT 'General',
  tags text[] NOT NULL DEFAULT '{}'::text[],
  author_id uuid DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE SET NULL,
  author_name text NOT NULL DEFAULT 'Student',
  author_avatar text DEFAULT '',
  upvotes integer NOT NULL DEFAULT 0,
  downvotes integer NOT NULL DEFAULT 0,
  comments_count integer NOT NULL DEFAULT 0,
  views_count integer NOT NULL DEFAULT 0,
  is_pinned boolean NOT NULL DEFAULT false,
  is_locked boolean NOT NULL DEFAULT false,
  moderation_status text NOT NULL DEFAULT 'approved',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT program_discussions_title_len_chk CHECK (char_length(btrim(title)) BETWEEN 2 AND 300),
  CONSTRAINT program_discussions_content_len_chk CHECK (char_length(btrim(content)) >= 1),
  CONSTRAINT program_discussions_counts_chk CHECK (
    upvotes >= 0 AND downvotes >= 0 AND comments_count >= 0 AND views_count >= 0
  ),
  CONSTRAINT program_discussions_mod_status_chk CHECK (
    moderation_status IN ('approved', 'pending', 'flagged', 'archived', 'rejected')
  )
);

CREATE TABLE IF NOT EXISTS public.program_discussion_comments (
  id text PRIMARY KEY DEFAULT gen_random_uuid()::text,
  discussion_id text NOT NULL,
  parent_id text DEFAULT NULL,
  content text NOT NULL,
  author_id uuid DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE SET NULL,
  author_name text NOT NULL DEFAULT 'Student',
  author_avatar text DEFAULT '',
  upvotes integer NOT NULL DEFAULT 0,
  downvotes integer NOT NULL DEFAULT 0,
  moderation_status text NOT NULL DEFAULT 'approved',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT prog_disc_comments_content_len_chk CHECK (char_length(btrim(content)) >= 1),
  CONSTRAINT prog_disc_comments_counts_chk CHECK (upvotes >= 0 AND downvotes >= 0),
  CONSTRAINT prog_disc_comments_mod_status_chk CHECK (
    moderation_status IN ('approved', 'pending', 'flagged', 'archived', 'rejected')
  )
);

CREATE TABLE IF NOT EXISTS public.program_doubts (
  id text PRIMARY KEY DEFAULT gen_random_uuid()::text,
  program_id text NOT NULL,
  title text NOT NULL,
  question text DEFAULT '',
  content text NOT NULL DEFAULT '',
  subject text DEFAULT 'General',
  tags text[] NOT NULL DEFAULT '{}'::text[],
  author_id uuid DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE SET NULL,
  author_name text NOT NULL DEFAULT 'Student',
  author_avatar text DEFAULT '',
  upvotes integer NOT NULL DEFAULT 0,
  downvotes integer NOT NULL DEFAULT 0,
  answers_count integer NOT NULL DEFAULT 0,
  views_count integer NOT NULL DEFAULT 0,
  is_resolved boolean NOT NULL DEFAULT false,
  accepted_answer_id text DEFAULT NULL,
  moderation_status text NOT NULL DEFAULT 'approved',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT program_doubts_title_len_chk CHECK (char_length(btrim(title)) BETWEEN 2 AND 300),
  CONSTRAINT program_doubts_counts_chk CHECK (
    upvotes >= 0 AND downvotes >= 0 AND answers_count >= 0 AND views_count >= 0
  ),
  CONSTRAINT program_doubts_mod_status_chk CHECK (
    moderation_status IN ('approved', 'pending', 'flagged', 'archived', 'rejected')
  )
);

CREATE TABLE IF NOT EXISTS public.program_doubt_answers (
  id text PRIMARY KEY DEFAULT gen_random_uuid()::text,
  doubt_id text NOT NULL,
  content text NOT NULL,
  author_id uuid DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE SET NULL,
  author_name text NOT NULL DEFAULT 'Student',
  author_avatar text DEFAULT '',
  upvotes integer NOT NULL DEFAULT 0,
  downvotes integer NOT NULL DEFAULT 0,
  is_accepted boolean NOT NULL DEFAULT false,
  moderation_status text NOT NULL DEFAULT 'approved',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT program_doubt_answers_content_len_chk CHECK (char_length(btrim(content)) >= 1),
  CONSTRAINT program_doubt_answers_counts_chk CHECK (upvotes >= 0 AND downvotes >= 0),
  CONSTRAINT program_doubt_answers_mod_status_chk CHECK (
    moderation_status IN ('approved', 'pending', 'flagged', 'archived', 'rejected')
  )
);

CREATE TABLE IF NOT EXISTS public.university_discussions (
  id text PRIMARY KEY DEFAULT gen_random_uuid()::text,
  university_id text NOT NULL,
  department_id text DEFAULT NULL,
  course_id text DEFAULT NULL,
  title text NOT NULL,
  content text NOT NULL,
  category text NOT NULL DEFAULT 'General',
  tags text[] NOT NULL DEFAULT '{}'::text[],
  author_id uuid DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE SET NULL,
  author_name text NOT NULL DEFAULT 'Student',
  author_avatar text DEFAULT '',
  upvotes integer NOT NULL DEFAULT 0,
  downvotes integer NOT NULL DEFAULT 0,
  comments_count integer NOT NULL DEFAULT 0,
  views_count integer NOT NULL DEFAULT 0,
  is_pinned boolean NOT NULL DEFAULT false,
  is_locked boolean NOT NULL DEFAULT false,
  moderation_status text NOT NULL DEFAULT 'approved',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT uni_discussions_title_len_chk CHECK (char_length(btrim(title)) BETWEEN 2 AND 300),
  CONSTRAINT uni_discussions_content_len_chk CHECK (char_length(btrim(content)) >= 1),
  CONSTRAINT uni_discussions_counts_chk CHECK (
    upvotes >= 0 AND downvotes >= 0 AND comments_count >= 0 AND views_count >= 0
  ),
  CONSTRAINT uni_discussions_mod_status_chk CHECK (
    moderation_status IN ('approved', 'pending', 'flagged', 'archived', 'rejected')
  )
);

CREATE TABLE IF NOT EXISTS public.university_discussion_comments (
  id text PRIMARY KEY DEFAULT gen_random_uuid()::text,
  discussion_id text NOT NULL,
  parent_id text DEFAULT NULL,
  content text NOT NULL,
  author_id uuid DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE SET NULL,
  author_name text NOT NULL DEFAULT 'Student',
  author_avatar text DEFAULT '',
  upvotes integer NOT NULL DEFAULT 0,
  downvotes integer NOT NULL DEFAULT 0,
  moderation_status text NOT NULL DEFAULT 'approved',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT uni_disc_comments_content_len_chk CHECK (char_length(btrim(content)) >= 1),
  CONSTRAINT uni_disc_comments_counts_chk CHECK (upvotes >= 0 AND downvotes >= 0),
  CONSTRAINT uni_disc_comments_mod_status_chk CHECK (
    moderation_status IN ('approved', 'pending', 'flagged', 'archived', 'rejected')
  )
);

CREATE TABLE IF NOT EXISTS public.university_doubts (
  id text PRIMARY KEY DEFAULT gen_random_uuid()::text,
  university_id text NOT NULL,
  department_id text DEFAULT NULL,
  course_id text DEFAULT NULL,
  title text NOT NULL,
  question text DEFAULT '',
  content text NOT NULL DEFAULT '',
  subject text DEFAULT 'General',
  tags text[] NOT NULL DEFAULT '{}'::text[],
  author_id uuid DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE SET NULL,
  author_name text NOT NULL DEFAULT 'Student',
  author_avatar text DEFAULT '',
  upvotes integer NOT NULL DEFAULT 0,
  downvotes integer NOT NULL DEFAULT 0,
  answers_count integer NOT NULL DEFAULT 0,
  views_count integer NOT NULL DEFAULT 0,
  is_resolved boolean NOT NULL DEFAULT false,
  accepted_answer_id text DEFAULT NULL,
  moderation_status text NOT NULL DEFAULT 'approved',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT uni_doubts_title_len_chk CHECK (char_length(btrim(title)) BETWEEN 2 AND 300),
  CONSTRAINT uni_doubts_counts_chk CHECK (
    upvotes >= 0 AND downvotes >= 0 AND answers_count >= 0 AND views_count >= 0
  ),
  CONSTRAINT uni_doubts_mod_status_chk CHECK (
    moderation_status IN ('approved', 'pending', 'flagged', 'archived', 'rejected')
  )
);

CREATE TABLE IF NOT EXISTS public.university_doubt_answers (
  id text PRIMARY KEY DEFAULT gen_random_uuid()::text,
  doubt_id text NOT NULL,
  content text NOT NULL,
  author_id uuid DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE SET NULL,
  author_name text NOT NULL DEFAULT 'Student',
  author_avatar text DEFAULT '',
  upvotes integer NOT NULL DEFAULT 0,
  downvotes integer NOT NULL DEFAULT 0,
  is_accepted boolean NOT NULL DEFAULT false,
  moderation_status text NOT NULL DEFAULT 'approved',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT uni_doubt_answers_content_len_chk CHECK (char_length(btrim(content)) >= 1),
  CONSTRAINT uni_doubt_answers_counts_chk CHECK (upvotes >= 0 AND downvotes >= 0),
  CONSTRAINT uni_doubt_answers_mod_status_chk CHECK (
    moderation_status IN ('approved', 'pending', 'flagged', 'archived', 'rejected')
  )
);

CREATE TABLE IF NOT EXISTS public.community_item_votes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  item_type text NOT NULL,
  item_id text NOT NULL,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  vote_type smallint NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT community_item_votes_uniq UNIQUE (item_type, item_id, user_id),
  CONSTRAINT community_item_votes_item_type_chk CHECK (
    item_type IN (
      'program_discussion',
      'program_discussion_comment',
      'program_doubt',
      'program_doubt_answer',
      'university_discussion',
      'university_discussion_comment',
      'university_doubt',
      'university_doubt_answer'
    )
  ),
  CONSTRAINT community_item_votes_vote_type_chk CHECK (vote_type IN (-1, 1))
);

-- -----------------------------------------------------------------------------
-- 7. CONSERVATIVE QUARANTINE & AUDIT TABLE (Table 30 / Section 2.5 #31)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.migration_orphan_quarantine (
  quarantine_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_table text NOT NULL,
  source_pk text NOT NULL,
  missing_fk_column text NOT NULL,
  missing_fk_value text DEFAULT NULL,
  target_table text NOT NULL,
  quarantine_class text NOT NULL DEFAULT 'CLASS_B_QUARANTINED',
  reason text NOT NULL,
  row_payload jsonb NOT NULL,
  quarantined_at timestamptz NOT NULL DEFAULT now(),
  resolved_at timestamptz DEFAULT NULL,
  resolved_by uuid DEFAULT NULL REFERENCES auth.users(id) ON DELETE SET NULL,
  resolution_notes text DEFAULT '',
  CONSTRAINT migration_orphan_quarantine_uniq UNIQUE (source_table, source_pk, missing_fk_column),
  CONSTRAINT migration_orphan_quarantine_class_chk CHECK (
    quarantine_class IN ('CLASS_B_QUARANTINED', 'CLASS_C_ADMIN_RESOLVED', 'CLASS_C_ARCHIVED')
  )
);

-- -----------------------------------------------------------------------------
-- 8. COMPLETE INDEX INVENTORY (Section 3 + Download Deduplication Indexes)
-- -----------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_academic_info_user_id ON public.academic_information(user_id);
CREATE INDEX IF NOT EXISTS idx_academic_info_university_id ON public.academic_information(university_id);
CREATE INDEX IF NOT EXISTS idx_academic_info_program_id ON public.academic_information(program_id);
CREATE INDEX IF NOT EXISTS idx_user_settings_user_id ON public.user_settings_preferences(user_id);
CREATE INDEX IF NOT EXISTS idx_moderator_roles_assigned_by ON public.moderator_roles(assigned_by);

CREATE INDEX IF NOT EXISTS idx_universities_created_by ON public.universities(created_by);
CREATE INDEX IF NOT EXISTS idx_departments_university_id ON public.departments(university_id);
CREATE INDEX IF NOT EXISTS idx_departments_created_by ON public.departments(created_by);
CREATE INDEX IF NOT EXISTS idx_courses_university_id ON public.courses(university_id);
CREATE INDEX IF NOT EXISTS idx_courses_department_id ON public.courses(department_id);
CREATE INDEX IF NOT EXISTS idx_courses_created_by ON public.courses(created_by);

CREATE INDEX IF NOT EXISTS idx_academic_programs_university_id ON public.academic_programs(university_id);
CREATE INDEX IF NOT EXISTS idx_academic_programs_created_by ON public.academic_programs(created_by);
CREATE INDEX IF NOT EXISTS idx_program_enrollments_program_user ON public.program_enrollments(program_id, user_id);
CREATE INDEX IF NOT EXISTS idx_program_enrollments_user_id ON public.program_enrollments(user_id);
CREATE INDEX IF NOT EXISTS idx_university_follows_uni_user ON public.university_follows(university_id, user_id);
CREATE INDEX IF NOT EXISTS idx_university_follows_user_id ON public.university_follows(user_id);

CREATE INDEX IF NOT EXISTS idx_stored_files_uploaded_by ON public.stored_files(uploaded_by);
CREATE INDEX IF NOT EXISTS idx_stored_files_created_by ON public.stored_files(created_by);
CREATE INDEX IF NOT EXISTS idx_study_notes_file_id ON public.study_notes(file_id);
CREATE INDEX IF NOT EXISTS idx_study_notes_content_hash ON public.study_notes(content_hash);
CREATE INDEX IF NOT EXISTS idx_study_notes_university_id ON public.study_notes(university_id);
CREATE INDEX IF NOT EXISTS idx_study_notes_program_id ON public.study_notes(program_id);
CREATE INDEX IF NOT EXISTS idx_study_notes_department_id ON public.study_notes(department_id);
CREATE INDEX IF NOT EXISTS idx_study_notes_course_id ON public.study_notes(course_id);
CREATE INDEX IF NOT EXISTS idx_study_notes_author_id ON public.study_notes(author_id);
CREATE INDEX IF NOT EXISTS idx_study_notes_uploader_id ON public.study_notes(uploader_id);

CREATE INDEX IF NOT EXISTS idx_study_note_upvotes_note_user ON public.study_note_upvotes(note_id, user_id);
CREATE INDEX IF NOT EXISTS idx_study_note_upvotes_user_id ON public.study_note_upvotes(user_id);
CREATE INDEX IF NOT EXISTS idx_study_note_downloads_note_id ON public.study_note_downloads(note_id);
CREATE INDEX IF NOT EXISTS idx_study_note_downloads_user_id ON public.study_note_downloads(user_id);

-- Partial unique indexes for authenticated permanent deduplication & anonymous daily deduplication
CREATE UNIQUE INDEX IF NOT EXISTS idx_study_note_downloads_auth_uniq
  ON public.study_note_downloads(note_id, user_id)
  WHERE user_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_study_note_downloads_anon_daily_uniq
  ON public.study_note_downloads(note_id, actor_fingerprint, downloaded_date)
  WHERE user_id IS NULL;

CREATE INDEX IF NOT EXISTS idx_forum_topics_created_by ON public.forum_topics(created_by);
CREATE INDEX IF NOT EXISTS idx_forum_posts_topic_id ON public.forum_posts(topic_id);
CREATE INDEX IF NOT EXISTS idx_forum_posts_author_id ON public.forum_posts(author_id);
CREATE INDEX IF NOT EXISTS idx_forum_comments_post_id ON public.forum_comments(post_id);
CREATE INDEX IF NOT EXISTS idx_forum_comments_parent_id ON public.forum_comments(parent_id);
CREATE INDEX IF NOT EXISTS idx_forum_comments_author_id ON public.forum_comments(author_id);
CREATE INDEX IF NOT EXISTS idx_forum_post_votes_post_user ON public.forum_post_votes(post_id, user_id);
CREATE INDEX IF NOT EXISTS idx_forum_post_votes_user_id ON public.forum_post_votes(user_id);
CREATE INDEX IF NOT EXISTS idx_forum_comment_votes_comment_user ON public.forum_comment_votes(comment_id, user_id);
CREATE INDEX IF NOT EXISTS idx_forum_comment_votes_user_id ON public.forum_comment_votes(user_id);
CREATE INDEX IF NOT EXISTS idx_forum_bookmarks_post_user ON public.forum_bookmarks(post_id, user_id);
CREATE INDEX IF NOT EXISTS idx_forum_bookmarks_user_id ON public.forum_bookmarks(user_id);
CREATE INDEX IF NOT EXISTS idx_forum_reports_post_id ON public.forum_reports(post_id);
CREATE INDEX IF NOT EXISTS idx_forum_reports_comment_id ON public.forum_reports(comment_id);
CREATE INDEX IF NOT EXISTS idx_forum_reports_reporter_id ON public.forum_reports(reporter_id);

CREATE INDEX IF NOT EXISTS idx_program_discussions_program_id ON public.program_discussions(program_id);
CREATE INDEX IF NOT EXISTS idx_program_discussions_author_id ON public.program_discussions(author_id);
CREATE INDEX IF NOT EXISTS idx_prog_disc_comments_disc_id ON public.program_discussion_comments(discussion_id);
CREATE INDEX IF NOT EXISTS idx_prog_disc_comments_parent_id ON public.program_discussion_comments(parent_id);
CREATE INDEX IF NOT EXISTS idx_prog_disc_comments_author_id ON public.program_discussion_comments(author_id);
CREATE INDEX IF NOT EXISTS idx_program_doubts_program_id ON public.program_doubts(program_id);
CREATE INDEX IF NOT EXISTS idx_program_doubts_author_id ON public.program_doubts(author_id);
CREATE INDEX IF NOT EXISTS idx_program_doubt_answers_doubt_id ON public.program_doubt_answers(doubt_id);
CREATE INDEX IF NOT EXISTS idx_program_doubt_answers_author_id ON public.program_doubt_answers(author_id);

CREATE INDEX IF NOT EXISTS idx_uni_discussions_uni_id ON public.university_discussions(university_id);
CREATE INDEX IF NOT EXISTS idx_uni_discussions_dept_id ON public.university_discussions(department_id);
CREATE INDEX IF NOT EXISTS idx_uni_discussions_course_id ON public.university_discussions(course_id);
CREATE INDEX IF NOT EXISTS idx_uni_discussions_author_id ON public.university_discussions(author_id);
CREATE INDEX IF NOT EXISTS idx_uni_disc_comments_disc_id ON public.university_discussion_comments(discussion_id);
CREATE INDEX IF NOT EXISTS idx_uni_disc_comments_parent_id ON public.university_discussion_comments(parent_id);
CREATE INDEX IF NOT EXISTS idx_uni_disc_comments_author_id ON public.university_discussion_comments(author_id);
CREATE INDEX IF NOT EXISTS idx_uni_doubts_uni_id ON public.university_doubts(university_id);
CREATE INDEX IF NOT EXISTS idx_uni_doubts_dept_id ON public.university_doubts(department_id);
CREATE INDEX IF NOT EXISTS idx_uni_doubts_course_id ON public.university_doubts(course_id);
CREATE INDEX IF NOT EXISTS idx_uni_doubts_author_id ON public.university_doubts(author_id);
CREATE INDEX IF NOT EXISTS idx_uni_doubt_answers_doubt_id ON public.university_doubt_answers(doubt_id);
CREATE INDEX IF NOT EXISTS idx_uni_doubt_answers_author_id ON public.university_doubt_answers(author_id);
CREATE INDEX IF NOT EXISTS idx_community_item_votes_user_id ON public.community_item_votes(user_id);

-- -----------------------------------------------------------------------------
-- 9. PUBLIC STUDENT PROFILES VIEW (Privacy-Masked, Zero Email/Student ID Leak)
-- -----------------------------------------------------------------------------
CREATE OR REPLACE VIEW public.public_student_profiles AS
SELECT
  p.id,
  p.username,
  p.display_name,
  p.full_name,
  p.avatar_url,
  p.bio,
  p.role,
  p.points,
  p.created_at,
  CASE WHEN coalesce(usp.show_academic_info, false) THEN ai.institution_name ELSE NULL END AS institution_name,
  CASE WHEN coalesce(usp.show_academic_info, false) THEN ai.degree_program ELSE NULL END AS degree_program,
  CASE WHEN coalesce(usp.show_academic_info, false) THEN ai.education_level ELSE NULL END AS education_level,
  CASE WHEN coalesce(usp.show_academic_info, false) THEN ai.academic_stage ELSE NULL END AS academic_stage,
  CASE WHEN coalesce(usp.show_academic_info, false) THEN ai.university_id ELSE NULL END AS university_id,
  CASE WHEN coalesce(usp.show_academic_info, false) THEN ai.program_id ELSE NULL END AS program_id
FROM public.profiles p
LEFT JOIN public.user_settings_preferences usp ON usp.user_id = p.id
LEFT JOIN public.academic_information ai ON ai.user_id = p.id
WHERE coalesce(usp.public_profile, true) = true;

ALTER VIEW public.public_student_profiles OWNER TO postgres;

-- =============================================================================
-- XEUSAR v4 COMPLETE SECURITY & PUBLIC SYNC REPAIR — PART 2 OF 4
-- Schema Reconciliation, UUID-to-TEXT Conversion, Class A/B Quarantine & FKs
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 10. IDEMPOTENT COLUMN RECONCILIATION & TARGETED UUID-TO-TEXT CONVERSION
-- -----------------------------------------------------------------------------
DO $$
DECLARE
  v_rec RECORD;
  v_fk RECORD;
  v_pages_type text;
  v_tags_type text;
BEGIN
  -- 10.1 Fix study_notes.pages if a prior migration typed it as integer instead of jsonb
  SELECT data_type INTO v_pages_type
  FROM information_schema.columns
  WHERE table_schema = 'public' AND table_name = 'study_notes' AND column_name = 'pages';

  IF v_pages_type IN ('integer', 'bigint', 'smallint') THEN
    ALTER TABLE public.study_notes ADD COLUMN IF NOT EXISTS page_count integer NOT NULL DEFAULT 1;
    EXECUTE 'UPDATE public.study_notes SET page_count = GREATEST(1, COALESCE(pages, 1))';
    ALTER TABLE public.study_notes DROP COLUMN pages;
    ALTER TABLE public.study_notes ADD COLUMN pages jsonb NOT NULL DEFAULT '[]'::jsonb;
  END IF;

  -- 10.2 Ensure critical reconciled columns exist on legacy tables before conversion
  ALTER TABLE public.profiles
    ADD COLUMN IF NOT EXISTS display_name text NOT NULL DEFAULT 'Student',
    ADD COLUMN IF NOT EXISTS full_name text NOT NULL DEFAULT 'Student',
    ADD COLUMN IF NOT EXISTS setup_completed boolean NOT NULL DEFAULT false,
    ADD COLUMN IF NOT EXISTS role text NOT NULL DEFAULT 'student',
    ADD COLUMN IF NOT EXISTS points integer NOT NULL DEFAULT 0;

  ALTER TABLE public.academic_information
    ADD COLUMN IF NOT EXISTS university_id text DEFAULT NULL,
    ADD COLUMN IF NOT EXISTS program_id text DEFAULT NULL,
    ADD COLUMN IF NOT EXISTS education_level text NOT NULL DEFAULT 'undergraduate',
    ADD COLUMN IF NOT EXISTS academic_stage text DEFAULT '',
    ADD COLUMN IF NOT EXISTS institution_name text DEFAULT '',
    ADD COLUMN IF NOT EXISTS degree_program text DEFAULT '',
    ADD COLUMN IF NOT EXISTS major text DEFAULT '',
    ADD COLUMN IF NOT EXISTS field_of_study text DEFAULT '',
    ADD COLUMN IF NOT EXISTS academic_year text DEFAULT '',
    ADD COLUMN IF NOT EXISTS semester text DEFAULT '',
    ADD COLUMN IF NOT EXISTS current_semester text DEFAULT '',
    ADD COLUMN IF NOT EXISTS student_id_number text DEFAULT '',
    ADD COLUMN IF NOT EXISTS graduation_year integer DEFAULT NULL,
    ADD COLUMN IF NOT EXISTS enrollment_verified boolean NOT NULL DEFAULT false;

  ALTER TABLE public.user_settings_preferences
    ADD COLUMN IF NOT EXISTS account_settings jsonb NOT NULL DEFAULT '{}'::jsonb,
    ADD COLUMN IF NOT EXISTS privacy_settings jsonb NOT NULL DEFAULT '{"public_badge_enabled": true, "show_uni_on_notes": true}'::jsonb,
    ADD COLUMN IF NOT EXISTS notification_settings jsonb NOT NULL DEFAULT '{"email_Resource_updates": true, "discussion_replies": true}'::jsonb,
    ADD COLUMN IF NOT EXISTS appearance_settings jsonb NOT NULL DEFAULT '{"compact_mode": false}'::jsonb,
    ADD COLUMN IF NOT EXISTS preferred_subjects text[] NOT NULL DEFAULT '{}'::text[],
    ADD COLUMN IF NOT EXISTS study_preferences jsonb NOT NULL DEFAULT '{}'::jsonb,
    ADD COLUMN IF NOT EXISTS preferred_language text NOT NULL DEFAULT 'en',
    ADD COLUMN IF NOT EXISTS theme_preference text NOT NULL DEFAULT 'system',
    ADD COLUMN IF NOT EXISTS theme text NOT NULL DEFAULT 'system',
    ADD COLUMN IF NOT EXISTS content_discovery_preferences jsonb NOT NULL DEFAULT '{"prioritize_User_uni": true, "hide_archived": false}'::jsonb,
    ADD COLUMN IF NOT EXISTS public_profile boolean NOT NULL DEFAULT true,
    ADD COLUMN IF NOT EXISTS show_academic_info boolean NOT NULL DEFAULT false;

  ALTER TABLE public.stored_files
    ADD COLUMN IF NOT EXISTS content_hash text,
    ADD COLUMN IF NOT EXISTS sha256_hash text,
    ADD COLUMN IF NOT EXISTS storage_bucket text NOT NULL DEFAULT 'study-materials',
    ADD COLUMN IF NOT EXISTS file_url text NOT NULL DEFAULT '',
    ADD COLUMN IF NOT EXISTS is_public boolean NOT NULL DEFAULT true,
    ADD COLUMN IF NOT EXISTS uploaded_by uuid DEFAULT auth.uid(),
    ADD COLUMN IF NOT EXISTS created_by uuid DEFAULT auth.uid(),
    ADD COLUMN IF NOT EXISTS reference_count integer NOT NULL DEFAULT 1;

  ALTER TABLE public.study_notes
    ADD COLUMN IF NOT EXISTS pages jsonb NOT NULL DEFAULT '[]'::jsonb,
    ADD COLUMN IF NOT EXISTS page_count integer NOT NULL DEFAULT 1,
    ADD COLUMN IF NOT EXISTS storage_bucket text NOT NULL DEFAULT 'study-materials',
    ADD COLUMN IF NOT EXISTS storage_path text DEFAULT '',
    ADD COLUMN IF NOT EXISTS content_hash text DEFAULT NULL,
    ADD COLUMN IF NOT EXISTS file_sha256 text DEFAULT NULL,
    ADD COLUMN IF NOT EXISTS file_id text DEFAULT NULL,
    ADD COLUMN IF NOT EXISTS university_id text DEFAULT NULL,
    ADD COLUMN IF NOT EXISTS program_id text DEFAULT NULL,
    ADD COLUMN IF NOT EXISTS department_id text DEFAULT NULL,
    ADD COLUMN IF NOT EXISTS course_id text DEFAULT NULL,
    ADD COLUMN IF NOT EXISTS author_id uuid DEFAULT auth.uid(),
    ADD COLUMN IF NOT EXISTS uploader_id uuid DEFAULT auth.uid(),
    ADD COLUMN IF NOT EXISTS is_public boolean NOT NULL DEFAULT true,
    ADD COLUMN IF NOT EXISTS is_published boolean NOT NULL DEFAULT true,
    ADD COLUMN IF NOT EXISTS is_restricted boolean NOT NULL DEFAULT false,
    ADD COLUMN IF NOT EXISTS moderation_status text NOT NULL DEFAULT 'approved';

  -- Convert jsonb tags to text[] on study_notes if needed
  SELECT data_type INTO v_tags_type
  FROM information_schema.columns
  WHERE table_schema = 'public' AND table_name = 'study_notes' AND column_name = 'tags';

  IF v_tags_type = 'jsonb' THEN
    ALTER TABLE public.study_notes
      ALTER COLUMN tags DROP DEFAULT,
      ALTER COLUMN tags TYPE text[] USING (
        CASE
          WHEN jsonb_typeof(tags) = 'array' THEN ARRAY(SELECT jsonb_array_elements_text(tags))
          ELSE '{}'::text[]
        END
      ),
      ALTER COLUMN tags SET DEFAULT '{}'::text[];
  END IF;

  -- 10.3 Targeted UUID-to-TEXT conversion (Section 7.1)
  CREATE TEMP TABLE IF NOT EXISTS _saved_fk_defs (
    conname text PRIMARY KEY,
    table_name text NOT NULL,
    condef text NOT NULL
  ) ON COMMIT DROP;

  FOR v_rec IN
    SELECT c.table_name, c.column_name
    FROM information_schema.columns c
    WHERE c.table_schema = 'public'
      AND c.data_type = 'uuid'
      AND (c.table_name, c.column_name) IN (
        ('universities', 'id'),
        ('departments', 'id'), ('departments', 'university_id'),
        ('courses', 'id'), ('courses', 'university_id'), ('courses', 'department_id'),
        ('academic_programs', 'id'), ('academic_programs', 'university_id'),
        ('academic_information', 'university_id'), ('academic_information', 'program_id'),
        ('program_enrollments', 'program_id'),
        ('university_follows', 'university_id'),
        ('stored_files', 'id'),
        ('study_notes', 'id'), ('study_notes', 'file_id'), ('study_notes', 'university_id'),
        ('study_notes', 'program_id'), ('study_notes', 'department_id'), ('study_notes', 'course_id'),
        ('study_note_upvotes', 'note_id'),
        ('study_note_downloads', 'note_id'),
        ('forum_topics', 'id'),
        ('forum_posts', 'id'), ('forum_posts', 'topic_id'),
        ('forum_comments', 'id'), ('forum_comments', 'post_id'), ('forum_comments', 'parent_id'),
        ('forum_post_votes', 'post_id'),
        ('forum_comment_votes', 'comment_id'),
        ('forum_bookmarks', 'post_id'),
        ('forum_reports', 'target_id'), ('forum_reports', 'post_id'), ('forum_reports', 'comment_id'),
        ('program_discussions', 'id'), ('program_discussions', 'program_id'),
        ('program_discussion_comments', 'id'), ('program_discussion_comments', 'discussion_id'), ('program_discussion_comments', 'parent_id'),
        ('program_doubts', 'id'), ('program_doubts', 'program_id'), ('program_doubts', 'accepted_answer_id'),
        ('program_doubt_answers', 'id'), ('program_doubt_answers', 'doubt_id'),
        ('university_discussions', 'id'), ('university_discussions', 'university_id'),
        ('university_discussions', 'department_id'), ('university_discussions', 'course_id'),
        ('university_discussion_comments', 'id'), ('university_discussion_comments', 'discussion_id'), ('university_discussion_comments', 'parent_id'),
        ('university_doubts', 'id'), ('university_doubts', 'university_id'),
        ('university_doubts', 'department_id'), ('university_doubts', 'course_id'), ('university_doubts', 'accepted_answer_id'),
        ('university_doubt_answers', 'id'), ('university_doubt_answers', 'doubt_id'),
        ('community_item_votes', 'item_id')
      )
  LOOP
    FOR v_fk IN
      SELECT DISTINCT con.conname, rel.relname AS tbl_name, pg_get_constraintdef(con.oid) AS condef
      FROM pg_constraint con
      JOIN pg_class rel ON rel.oid = con.conrelid
      JOIN pg_namespace nsp ON nsp.oid = rel.relnamespace
      LEFT JOIN pg_class confrel ON confrel.oid = con.confrelid
      LEFT JOIN pg_attribute a_src ON a_src.attrelid = con.conrelid AND a_src.attnum = ANY(con.conkey)
      LEFT JOIN pg_attribute a_tgt ON a_tgt.attrelid = con.confrelid AND a_tgt.attnum = ANY(con.confkey)
      WHERE nsp.nspname = 'public'
        AND con.contype = 'f'
        AND (
          (rel.relname = v_rec.table_name AND a_src.attname = v_rec.column_name)
          OR (confrel.relname = v_rec.table_name AND a_tgt.attname = v_rec.column_name)
        )
    LOOP
      INSERT INTO _saved_fk_defs (conname, table_name, condef)
      VALUES (v_fk.conname, v_fk.tbl_name, v_fk.condef)
      ON CONFLICT (conname) DO NOTHING;

      EXECUTE format('ALTER TABLE public.%I DROP CONSTRAINT IF EXISTS %I', v_fk.tbl_name, v_fk.conname);
    END LOOP;

    EXECUTE format(
      'ALTER TABLE public.%I ALTER COLUMN %I TYPE text USING %I::text',
      v_rec.table_name, v_rec.column_name, v_rec.column_name
    );
  END LOOP;
END;
$$;

-- -----------------------------------------------------------------------------
-- 11. CLASS A: SAFE AUTOMATIC DATA REPAIRS (DETERMINISTIC ONLY)
-- -----------------------------------------------------------------------------
INSERT INTO public.profiles (id, email, display_name, full_name, username)
SELECT
  u.id,
  u.email,
  coalesce(nullif(btrim(u.raw_user_meta_data->>'display_name'), ''), nullif(btrim(u.raw_user_meta_data->>'full_name'), ''), split_part(coalesce(u.email, 'Student'), '@', 1), 'Student'),
  coalesce(nullif(btrim(u.raw_user_meta_data->>'full_name'), ''), nullif(btrim(u.raw_user_meta_data->>'display_name'), ''), split_part(coalesce(u.email, 'Student'), '@', 1), 'Student'),
  CASE
    WHEN (u.raw_user_meta_data->>'username') ~ '^[a-zA-Z0-9_.-]{2,40}$'
     AND NOT EXISTS (SELECT 1 FROM public.profiles p2 WHERE p2.username = u.raw_user_meta_data->>'username')
    THEN u.raw_user_meta_data->>'username'
    ELSE NULL
  END
FROM auth.users u
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.academic_information (user_id)
SELECT p.id FROM public.profiles p
ON CONFLICT (user_id) DO NOTHING;

INSERT INTO public.user_settings_preferences (user_id)
SELECT p.id FROM public.profiles p
ON CONFLICT (user_id) DO NOTHING;

UPDATE public.stored_files
SET
  content_hash = coalesce(nullif(btrim(content_hash), ''), nullif(btrim(sha256_hash), ''), md5(storage_bucket || ':' || storage_path)),
  sha256_hash  = coalesce(nullif(btrim(sha256_hash), ''), nullif(btrim(content_hash), ''), md5(storage_bucket || ':' || storage_path)),
  uploaded_by  = coalesce(uploaded_by, created_by),
  created_by   = coalesce(created_by, uploaded_by)
WHERE content_hash IS NULL OR sha256_hash IS NULL OR uploaded_by IS DISTINCT FROM created_by;

ALTER TABLE public.stored_files
  ALTER COLUMN content_hash SET NOT NULL,
  ALTER COLUMN sha256_hash SET NOT NULL;

UPDATE public.study_notes sn
SET
  content_hash = coalesce(nullif(btrim(sn.content_hash), ''), nullif(btrim(sn.file_sha256), '')),
  file_sha256  = coalesce(nullif(btrim(sn.file_sha256), ''), nullif(btrim(sn.content_hash), '')),
  author_id    = coalesce(sn.author_id, sn.uploader_id),
  uploader_id  = coalesce(sn.uploader_id, sn.author_id)
WHERE sn.content_hash IS DISTINCT FROM sn.file_sha256
   OR sn.author_id IS DISTINCT FROM sn.uploader_id;

UPDATE public.study_notes sn
SET file_id = sf.id
FROM public.stored_files sf
WHERE sn.file_id IS NULL
  AND sn.content_hash IS NOT NULL
  AND sf.content_hash = sn.content_hash;

INSERT INTO public.forum_topics (id, name, title, slug, description, icon, color, category, sort_order)
VALUES
  ('general', 'General Discussion', 'General Discussion', 'general', 'General student discussions and study questions', 'MessageSquare', '#4F46E5', 'General', 1),
  ('computer-science', 'Computer Science & AI', 'Computer Science & AI', 'computer-science', 'Programming, algorithms, AI, and software engineering', 'Code', '#0EA5E9', 'Academic', 2),
  ('mathematics', 'Mathematics & Logic', 'Mathematics & Logic', 'mathematics', 'Calculus, discrete structures, linear algebra, and statistics', 'Calculator', '#8B5CF6', 'Academic', 3),
  ('engineering', 'Engineering & Hardware', 'Engineering & Hardware', 'engineering', 'Electrical, mechanical, civil, and embedded systems', 'Cpu', '#F59E0B', 'Academic', 4),
  ('exam-prep', 'Exam Prep & Past Papers', 'Exam Prep & Past Papers', 'exam-prep', 'Entry tests, midterms, finals, and study strategies', 'BookOpen', '#10B981', 'Study', 5),
  ('career-internships', 'Careers & Scholarships', 'Careers & Scholarships', 'career-internships', 'Internships, scholarships, and career guidance', 'Briefcase', '#EC4899', 'Career', 6),
  ('university-life', 'Campus & University Life', 'Campus & University Life', 'university-life', 'Admissions, societies, hostels, and student life', 'GraduationCap', '#6366F1', 'Community', 7),
  ('announcements', 'Platform Announcements', 'Platform Announcements', 'announcements', 'Official Xeusar updates and community announcements', 'Megaphone', '#EF4444', 'Official', 8)
ON CONFLICT (id) DO NOTHING;

DO $$
DECLARE
  v_rec RECORD;
BEGIN
  FOR v_rec IN
    SELECT * FROM (VALUES
      ('universities', 'id', 'created_by'),
      ('departments', 'id', 'created_by'),
      ('courses', 'id', 'created_by'),
      ('academic_programs', 'id', 'created_by'),
      ('stored_files', 'id', 'uploaded_by'),
      ('stored_files', 'id', 'created_by'),
      ('study_notes', 'id', 'author_id'),
      ('study_notes', 'id', 'uploader_id'),
      ('study_note_downloads', 'id', 'user_id'),
      ('forum_topics', 'id', 'created_by'),
      ('forum_posts', 'id', 'author_id'),
      ('forum_comments', 'id', 'author_id'),
      ('forum_reports', 'id', 'reviewed_by'),
      ('program_discussions', 'id', 'author_id'),
      ('program_discussion_comments', 'id', 'author_id'),
      ('program_doubts', 'id', 'author_id'),
      ('program_doubt_answers', 'id', 'author_id'),
      ('university_discussions', 'id', 'author_id'),
      ('university_discussion_comments', 'id', 'author_id'),
      ('university_doubts', 'id', 'author_id'),
      ('university_doubt_answers', 'id', 'author_id'),
      ('moderator_roles', 'user_id', 'assigned_by')
    ) AS t(src_table, pk_col, fk_col)
  LOOP
    EXECUTE format($sql$
      INSERT INTO public.migration_orphan_quarantine
        (source_table, source_pk, missing_fk_column, missing_fk_value, target_table, quarantine_class, reason, row_payload, resolved_at, resolution_notes)
      SELECT
        %1$L, s.%2$I::text, %3$L, s.%3$I::text, 'auth.users', 'CLASS_C_ADMIN_RESOLVED',
        'Class A auto-repair: nullable user FK referenced deleted auth.users row; set to NULL while preserving content row',
        to_jsonb(s), now(), 'Auto-nullified dangling nullable user pointer'
      FROM public.%1$I s
      WHERE s.%3$I IS NOT NULL
        AND NOT EXISTS (SELECT 1 FROM auth.users u WHERE u.id = s.%3$I)
      ON CONFLICT (source_table, source_pk, missing_fk_column) DO NOTHING;

      UPDATE public.%1$I s
      SET %3$I = NULL
      WHERE s.%3$I IS NOT NULL
        AND NOT EXISTS (SELECT 1 FROM auth.users u WHERE u.id = s.%3$I);
    $sql$, v_rec.src_table, v_rec.pk_col, v_rec.fk_col);
  END LOOP;
END;
$$;

-- -----------------------------------------------------------------------------
-- 12. CLASS B: CONSERVATIVE ORPHAN QUARANTINE (ZERO DATA LOSS / ZERO FABRICATION)
-- -----------------------------------------------------------------------------
DO $$
DECLARE
  v_rec RECORD;
BEGIN
  FOR v_rec IN
    SELECT * FROM (VALUES
      ('academic_information', 'id', 'university_id', 'universities', 'id'),
      ('academic_information', 'id', 'program_id', 'academic_programs', 'id'),
      ('courses', 'id', 'department_id', 'departments', 'id'),
      ('academic_programs', 'id', 'university_id', 'universities', 'id'),
      ('study_notes', 'id', 'file_id', 'stored_files', 'id'),
      ('study_notes', 'id', 'content_hash', 'stored_files', 'content_hash'),
      ('study_notes', 'id', 'university_id', 'universities', 'id'),
      ('study_notes', 'id', 'program_id', 'academic_programs', 'id'),
      ('study_notes', 'id', 'department_id', 'departments', 'id'),
      ('study_notes', 'id', 'course_id', 'courses', 'id'),
      ('forum_reports', 'id', 'post_id', 'forum_posts', 'id'),
      ('forum_reports', 'id', 'comment_id', 'forum_comments', 'id'),
      ('university_discussions', 'id', 'department_id', 'departments', 'id'),
      ('university_discussions', 'id', 'course_id', 'courses', 'id'),
      ('university_doubts', 'id', 'department_id', 'departments', 'id'),
      ('university_doubts', 'id', 'course_id', 'courses', 'id')
    ) AS t(src_table, pk_col, fk_col, tgt_table, tgt_col)
  LOOP
    EXECUTE format($sql$
      INSERT INTO public.migration_orphan_quarantine
        (source_table, source_pk, missing_fk_column, missing_fk_value, target_table, quarantine_class, reason, row_payload, resolved_at, resolution_notes)
      SELECT
        %1$L, s.%2$I::text, %3$L, s.%3$I::text, %4$L, 'CLASS_C_ADMIN_RESOLVED',
        'Nullable catalog FK pointed to missing target; snapshot saved and column set to NULL',
        to_jsonb(s), now(), 'Nullable FK cleared safely'
      FROM public.%1$I s
      WHERE s.%3$I IS NOT NULL
        AND NOT EXISTS (SELECT 1 FROM public.%4$I tgt WHERE tgt.%5$I = s.%3$I)
      ON CONFLICT (source_table, source_pk, missing_fk_column) DO NOTHING;

      UPDATE public.%1$I s
      SET %3$I = NULL
      WHERE s.%3$I IS NOT NULL
        AND NOT EXISTS (SELECT 1 FROM public.%4$I tgt WHERE tgt.%5$I = s.%3$I);
    $sql$, v_rec.src_table, v_rec.pk_col, v_rec.fk_col, v_rec.tgt_table, v_rec.tgt_col);
  END LOOP;

  FOR v_rec IN
    SELECT * FROM (VALUES
      ('departments', 'id', 'university_id', 'universities', 'id'),
      ('courses', 'id', 'university_id', 'universities', 'id'),
      ('program_enrollments', 'id', 'program_id', 'academic_programs', 'id'),
      ('university_follows', 'id', 'university_id', 'universities', 'id'),
      ('forum_posts', 'id', 'topic_id', 'forum_topics', 'id'),
      ('forum_comments', 'id', 'post_id', 'forum_posts', 'id'),
      ('program_discussions', 'id', 'program_id', 'academic_programs', 'id'),
      ('program_discussion_comments', 'id', 'discussion_id', 'program_discussions', 'id'),
      ('program_doubts', 'id', 'program_id', 'academic_programs', 'id'),
      ('program_doubt_answers', 'id', 'doubt_id', 'program_doubts', 'id'),
      ('university_discussions', 'id', 'university_id', 'universities', 'id'),
      ('university_discussion_comments', 'id', 'discussion_id', 'university_discussions', 'id'),
      ('university_doubts', 'id', 'university_id', 'universities', 'id'),
      ('university_doubt_answers', 'id', 'doubt_id', 'university_doubts', 'id'),
      ('study_note_upvotes', 'id', 'note_id', 'study_notes', 'id'),
      ('study_note_downloads', 'id', 'note_id', 'study_notes', 'id'),
      ('forum_post_votes', 'id', 'post_id', 'forum_posts', 'id'),
      ('forum_comment_votes', 'id', 'comment_id', 'forum_comments', 'id'),
      ('forum_bookmarks', 'id', 'post_id', 'forum_posts', 'id')
    ) AS t(src_table, pk_col, fk_col, tgt_table, tgt_col)
  LOOP
    EXECUTE format($sql$
      INSERT INTO public.migration_orphan_quarantine
        (source_table, source_pk, missing_fk_column, missing_fk_value, target_table, quarantine_class, reason, row_payload)
      SELECT
        %1$L, s.%2$I::text, %3$L, s.%3$I::text, %4$L, 'CLASS_B_QUARANTINED',
        format('Required parent row in %%s (%%s = %%s) does not exist', %4$L, %5$L, coalesce(s.%3$I::text, 'NULL')),
        to_jsonb(s)
      FROM public.%1$I s
      WHERE s.%3$I IS NULL
         OR NOT EXISTS (SELECT 1 FROM public.%4$I tgt WHERE tgt.%5$I = s.%3$I)
      ON CONFLICT (source_table, source_pk, missing_fk_column) DO NOTHING;

      DELETE FROM public.%1$I s
      WHERE (s.%3$I IS NULL OR NOT EXISTS (SELECT 1 FROM public.%4$I tgt WHERE tgt.%5$I = s.%3$I))
        AND EXISTS (
          SELECT 1 FROM public.migration_orphan_quarantine q
          WHERE q.source_table = %1$L
            AND q.source_pk = s.%2$I::text
            AND q.missing_fk_column = %3$L
        );
    $sql$, v_rec.src_table, v_rec.pk_col, v_rec.fk_col, v_rec.tgt_table, v_rec.tgt_col);
  END LOOP;

  FOR v_rec IN
    SELECT * FROM (VALUES
      ('forum_comments'),
      ('program_discussion_comments'),
      ('university_discussion_comments')
    ) AS t(tbl_name)
  LOOP
    EXECUTE format($sql$
      WITH RECURSIVE broken_tree AS (
        SELECT c.id, c.parent_id
        FROM public.%1$I c
        WHERE c.parent_id IS NOT NULL
          AND NOT EXISTS (SELECT 1 FROM public.%1$I p WHERE p.id = c.parent_id)
        UNION ALL
        SELECT child.id, child.parent_id
        FROM public.%1$I child
        JOIN broken_tree bt ON child.parent_id = bt.id
      )
      INSERT INTO public.migration_orphan_quarantine
        (source_table, source_pk, missing_fk_column, missing_fk_value, target_table, quarantine_class, reason, row_payload)
      SELECT
        %1$L, c.id::text, 'parent_id', c.parent_id::text, %1$L, 'CLASS_B_QUARANTINED',
        'Reply belongs to a comment thread whose ancestor parent_id does not exist; quarantined to preserve thread hierarchy',
        to_jsonb(c)
      FROM public.%1$I c
      JOIN broken_tree bt ON bt.id = c.id
      ON CONFLICT (source_table, source_pk, missing_fk_column) DO NOTHING;

      DELETE FROM public.%1$I c
      WHERE EXISTS (
        SELECT 1 FROM public.migration_orphan_quarantine q
        WHERE q.source_table = %1$L
          AND q.source_pk = c.id::text
          AND q.missing_fk_column = 'parent_id'
      );
    $sql$, v_rec.tbl_name);
  END LOOP;
END;
$$;

-- -----------------------------------------------------------------------------
-- 13. DUPLICATE VOTE DEDUPLICATION & COUNTER RECALCULATION (Section 5.1 #4)
-- -----------------------------------------------------------------------------
DELETE FROM public.study_note_upvotes a
USING (
  SELECT id, row_number() OVER (PARTITION BY note_id, user_id ORDER BY created_at DESC, id DESC) AS rn
  FROM public.study_note_upvotes
) b
WHERE a.id = b.id AND b.rn > 1;

DELETE FROM public.forum_post_votes a
USING (
  SELECT id, row_number() OVER (PARTITION BY post_id, user_id ORDER BY updated_at DESC, created_at DESC, id DESC) AS rn
  FROM public.forum_post_votes
) b
WHERE a.id = b.id AND b.rn > 1;

DELETE FROM public.forum_comment_votes a
USING (
  SELECT id, row_number() OVER (PARTITION BY comment_id, user_id ORDER BY updated_at DESC, created_at DESC, id DESC) AS rn
  FROM public.forum_comment_votes
) b
WHERE a.id = b.id AND b.rn > 1;

DELETE FROM public.community_item_votes a
USING (
  SELECT id, row_number() OVER (PARTITION BY item_type, item_id, user_id ORDER BY updated_at DESC, created_at DESC, id DESC) AS rn
  FROM public.community_item_votes
) b
WHERE a.id = b.id AND b.rn > 1;

DELETE FROM public.program_enrollments a
USING (
  SELECT id, row_number() OVER (PARTITION BY program_id, user_id ORDER BY created_at DESC, id DESC) AS rn
  FROM public.program_enrollments
) b
WHERE a.id = b.id AND b.rn > 1;

DELETE FROM public.university_follows a
USING (
  SELECT id, row_number() OVER (PARTITION BY university_id, user_id ORDER BY created_at DESC, id DESC) AS rn
  FROM public.university_follows
) b
WHERE a.id = b.id AND b.rn > 1;

UPDATE public.study_notes sn
SET upvotes = GREATEST(
  CASE WHEN EXISTS (SELECT 1 FROM public.study_note_upvotes u WHERE u.note_id = sn.id) THEN 0 ELSE sn.upvotes END,
  (SELECT count(*)::integer FROM public.study_note_upvotes u WHERE u.note_id = sn.id)
);

UPDATE public.forum_posts fp
SET
  upvotes   = CASE WHEN EXISTS (SELECT 1 FROM public.forum_post_votes v WHERE v.post_id = fp.id)
                   THEN (SELECT count(*)::integer FROM public.forum_post_votes v WHERE v.post_id = fp.id AND v.vote_type = 1)
                   ELSE fp.upvotes END,
  downvotes = CASE WHEN EXISTS (SELECT 1 FROM public.forum_post_votes v WHERE v.post_id = fp.id)
                   THEN (SELECT count(*)::integer FROM public.forum_post_votes v WHERE v.post_id = fp.id AND v.vote_type = -1)
                   ELSE fp.downvotes END,
  comments_count = (SELECT count(*)::integer FROM public.forum_comments fc WHERE fc.post_id = fp.id AND fc.moderation_status = 'approved');

UPDATE public.forum_posts SET score = upvotes - downvotes;

UPDATE public.forum_comments fc
SET
  upvotes   = CASE WHEN EXISTS (SELECT 1 FROM public.forum_comment_votes v WHERE v.comment_id = fc.id)
                   THEN (SELECT count(*)::integer FROM public.forum_comment_votes v WHERE v.comment_id = fc.id AND v.vote_type = 1)
                   ELSE fc.upvotes END,
  downvotes = CASE WHEN EXISTS (SELECT 1 FROM public.forum_comment_votes v WHERE v.comment_id = fc.id)
                   THEN (SELECT count(*)::integer FROM public.forum_comment_votes v WHERE v.comment_id = fc.id AND v.vote_type = -1)
                   ELSE fc.downvotes END;

UPDATE public.forum_comments SET score = upvotes - downvotes;

UPDATE public.academic_programs ap
SET
  enrolled_count    = GREATEST(ap.enrolled_count, (SELECT count(*)::integer FROM public.program_enrollments pe WHERE pe.program_id = ap.id)),
  discussions_count = (SELECT count(*)::integer FROM public.program_discussions pd WHERE pd.program_id = ap.id AND pd.moderation_status = 'approved'),
  doubts_count      = (SELECT count(*)::integer FROM public.program_doubts pd WHERE pd.program_id = ap.id AND pd.moderation_status = 'approved');

UPDATE public.universities u
SET
  followers_count = GREATEST(u.followers_count, (SELECT count(*)::integer FROM public.university_follows uf WHERE uf.university_id = u.id)),
  courses_count   = (SELECT count(*)::integer FROM public.courses c WHERE c.university_id = u.id),
  resources_count = (SELECT count(*)::integer FROM public.study_notes sn WHERE sn.university_id = u.id AND sn.moderation_status = 'approved');

-- -----------------------------------------------------------------------------
-- 14. IDEMPOTENT FOREIGN KEY ATTACHMENT (Section 3 Relationship Map)
-- -----------------------------------------------------------------------------
DO $$
DECLARE
  v_fk RECORD;
BEGIN
  FOR v_fk IN
    SELECT * FROM (VALUES
      ('academic_information', 'university_id', 'universities', 'id', 'SET NULL', 'academic_information_university_id_fkey'),
      ('academic_information', 'program_id', 'academic_programs', 'id', 'SET NULL', 'academic_information_program_id_fkey'),
      ('departments', 'university_id', 'universities', 'id', 'CASCADE', 'departments_university_id_fkey'),
      ('courses', 'university_id', 'universities', 'id', 'CASCADE', 'courses_university_id_fkey'),
      ('courses', 'department_id', 'departments', 'id', 'SET NULL', 'courses_department_id_fkey'),
      ('academic_programs', 'university_id', 'universities', 'id', 'SET NULL', 'academic_programs_university_id_fkey'),
      ('program_enrollments', 'program_id', 'academic_programs', 'id', 'CASCADE', 'program_enrollments_program_id_fkey'),
      ('university_follows', 'university_id', 'universities', 'id', 'CASCADE', 'university_follows_university_id_fkey'),
      ('study_notes', 'file_id', 'stored_files', 'id', 'SET NULL', 'study_notes_file_id_fkey'),
      ('study_notes', 'content_hash', 'stored_files', 'content_hash', 'SET NULL', 'study_notes_content_hash_fkey'),
      ('study_notes', 'university_id', 'universities', 'id', 'SET NULL', 'study_notes_university_id_fkey'),
      ('study_notes', 'program_id', 'academic_programs', 'id', 'SET NULL', 'study_notes_program_id_fkey'),
      ('study_notes', 'department_id', 'departments', 'id', 'SET NULL', 'study_notes_department_id_fkey'),
      ('study_notes', 'course_id', 'courses', 'id', 'SET NULL', 'study_notes_course_id_fkey'),
      ('study_note_upvotes', 'note_id', 'study_notes', 'id', 'CASCADE', 'study_note_upvotes_note_id_fkey'),
      ('study_note_downloads', 'note_id', 'study_notes', 'id', 'CASCADE', 'study_note_downloads_note_id_fkey'),
      ('forum_posts', 'topic_id', 'forum_topics', 'id', 'RESTRICT', 'forum_posts_topic_id_fkey'),
      ('forum_comments', 'post_id', 'forum_posts', 'id', 'CASCADE', 'forum_comments_post_id_fkey'),
      ('forum_comments', 'parent_id', 'forum_comments', 'id', 'CASCADE', 'forum_comments_parent_id_fkey'),
      ('forum_post_votes', 'post_id', 'forum_posts', 'id', 'CASCADE', 'forum_post_votes_post_id_fkey'),
      ('forum_comment_votes', 'comment_id', 'forum_comments', 'id', 'CASCADE', 'forum_comment_votes_comment_id_fkey'),
      ('forum_bookmarks', 'post_id', 'forum_posts', 'id', 'CASCADE', 'forum_bookmarks_post_id_fkey'),
      ('forum_reports', 'post_id', 'forum_posts', 'id', 'CASCADE', 'forum_reports_post_id_fkey'),
      ('forum_reports', 'comment_id', 'forum_comments', 'id', 'CASCADE', 'forum_reports_comment_id_fkey'),
      ('program_discussions', 'program_id', 'academic_programs', 'id', 'CASCADE', 'program_discussions_program_id_fkey'),
      ('program_discussion_comments', 'discussion_id', 'program_discussions', 'id', 'CASCADE', 'program_discussion_comments_discussion_id_fkey'),
      ('program_discussion_comments', 'parent_id', 'program_discussion_comments', 'id', 'CASCADE', 'program_discussion_comments_parent_id_fkey'),
      ('program_doubts', 'program_id', 'academic_programs', 'id', 'CASCADE', 'program_doubts_program_id_fkey'),
      ('program_doubt_answers', 'doubt_id', 'program_doubts', 'id', 'CASCADE', 'program_doubt_answers_doubt_id_fkey'),
      ('university_discussions', 'university_id', 'universities', 'id', 'CASCADE', 'university_discussions_university_id_fkey'),
      ('university_discussions', 'department_id', 'departments', 'id', 'SET NULL', 'university_discussions_department_id_fkey'),
      ('university_discussions', 'course_id', 'courses', 'id', 'SET NULL', 'university_discussions_course_id_fkey'),
      ('university_discussion_comments', 'discussion_id', 'university_discussions', 'id', 'CASCADE', 'university_discussion_comments_discussion_id_fkey'),
      ('university_discussion_comments', 'parent_id', 'university_discussion_comments', 'id', 'CASCADE', 'university_discussion_comments_parent_id_fkey'),
      ('university_doubts', 'university_id', 'universities', 'id', 'CASCADE', 'university_doubts_university_id_fkey'),
      ('university_doubts', 'department_id', 'departments', 'id', 'SET NULL', 'university_doubts_department_id_fkey'),
      ('university_doubts', 'course_id', 'courses', 'id', 'SET NULL', 'university_doubts_course_id_fkey'),
      ('university_doubt_answers', 'doubt_id', 'university_doubts', 'id', 'CASCADE', 'university_doubt_answers_doubt_id_fkey')
    ) AS t(src_table, src_col, tgt_table, tgt_col, on_del, con_name)
  LOOP
    IF NOT EXISTS (
      SELECT 1
      FROM pg_constraint con
      JOIN pg_class rel ON rel.oid = con.conrelid
      JOIN pg_namespace nsp ON nsp.oid = rel.relnamespace
      JOIN pg_attribute att ON att.attrelid = rel.oid AND att.attnum = ANY(con.conkey)
      WHERE nsp.nspname = 'public'
        AND con.contype = 'f'
        AND rel.relname = v_fk.src_table
        AND att.attname = v_fk.src_col
    ) THEN
      EXECUTE format(
        'ALTER TABLE public.%I ADD CONSTRAINT %I FOREIGN KEY (%I) REFERENCES public.%I(%I) ON DELETE %s',
        v_fk.src_table, v_fk.con_name, v_fk.src_col, v_fk.tgt_table, v_fk.tgt_col, v_fk.on_del
      );
    END IF;
  END LOOP;
END;
$$;

-- =============================================================================
-- XEUSAR v4 COMPLETE SECURITY & PUBLIC SYNC REPAIR — PART 3 OF 4
-- Access Control Helpers, Privileged-Column Triggers & SECURITY DEFINER RPCs
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 15. RESTRICTED-STORAGE & STUDY NOTE AUTHORIZATION FUNCTIONS (Section 6.3)
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.can_access_study_note(
  p_note_id text,
  p_user_id uuid DEFAULT auth.uid()
)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  v_note RECORD;
  v_uni_scope text;
  v_prog_scope text;
  v_uni_ok boolean := true;
  v_prog_ok boolean := true;
BEGIN
  IF p_note_id IS NULL OR btrim(p_note_id) = '' THEN
    RETURN false;
  END IF;

  SELECT
    sn.id,
    sn.author_id,
    sn.uploader_id,
    sn.moderation_status,
    sn.is_published,
    sn.is_public,
    sn.is_restricted,
    sn.university_id,
    sn.program_id
  INTO v_note
  FROM public.study_notes sn
  WHERE sn.id = p_note_id;

  IF NOT FOUND THEN
    RETURN false;
  END IF;

  -- Rule 1: Uploader / Owner / Moderator always has access
  IF p_user_id IS NOT NULL AND (
    v_note.author_id = p_user_id
    OR v_note.uploader_id = p_user_id
    OR public.is_platform_admin()
  ) THEN
    RETURN true;
  END IF;

  -- Rule 2: Moderation & publication gate
  IF v_note.moderation_status <> 'approved'
     OR v_note.is_published = false
     OR v_note.is_public = false THEN
    RETURN false;
  END IF;

  IF v_note.university_id IS NOT NULL THEN
    SELECT u.access_scope INTO v_uni_scope
    FROM public.universities u
    WHERE u.id = v_note.university_id;
  END IF;

  IF v_note.program_id IS NOT NULL THEN
    SELECT ap.access_scope INTO v_prog_scope
    FROM public.academic_programs ap
    WHERE ap.id = v_note.program_id;
  END IF;

  -- Rule 3: Unrestricted public note
  IF v_note.is_restricted = false
     AND coalesce(v_uni_scope, 'public') = 'public'
     AND coalesce(v_prog_scope, 'public') = 'public' THEN
    RETURN true;
  END IF;

  -- Rule 4: Restricted note requires authenticated membership
  IF p_user_id IS NULL THEN
    RETURN false;
  END IF;

  IF v_note.university_id IS NOT NULL AND (
    v_note.is_restricted = true
    OR coalesce(v_uni_scope, 'public') IN ('members_only', 'verified_members_only')
  ) THEN
    v_uni_ok := EXISTS (
      SELECT 1
      FROM public.academic_information ai
      WHERE ai.user_id = p_user_id
        AND ai.university_id = v_note.university_id
        AND (coalesce(v_uni_scope, 'public') <> 'verified_members_only' OR ai.enrollment_verified = true)
    ) OR (
      coalesce(v_uni_scope, 'public') <> 'verified_members_only'
      AND EXISTS (
        SELECT 1
        FROM public.university_follows uf
        WHERE uf.user_id = p_user_id
          AND uf.university_id = v_note.university_id
      )
    );
  END IF;

  IF v_note.program_id IS NOT NULL AND (
    v_note.is_restricted = true
    OR coalesce(v_prog_scope, 'public') = 'enrolled_only'
  ) THEN
    v_prog_ok := EXISTS (
      SELECT 1
      FROM public.program_enrollments pe
      WHERE pe.user_id = p_user_id
        AND pe.program_id = v_note.program_id
    ) OR EXISTS (
      SELECT 1
      FROM public.academic_information ai
      WHERE ai.user_id = p_user_id
        AND ai.program_id = v_note.program_id
    );
  END IF;

  RETURN (v_uni_ok AND v_prog_ok);
END;
$$;
ALTER FUNCTION public.can_access_study_note(text, uuid) OWNER TO postgres;

CREATE OR REPLACE FUNCTION public.can_access_stored_file(
  p_bucket text,
  p_path text,
  p_user_id uuid DEFAULT auth.uid()
)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  v_first_seg text;
  v_second_seg text;
BEGIN
  IF p_bucket IS NULL OR p_path IS NULL OR btrim(p_path) = '' THEN
    RETURN false;
  END IF;

  IF p_bucket = 'avatars' THEN
    RETURN true;
  END IF;

  v_first_seg := split_part(ltrim(p_path, '/'), '/', 1);
  v_second_seg := split_part(ltrim(p_path, '/'), '/', 2);

  -- Path owner or platform moderator/admin always has access
  IF p_user_id IS NOT NULL AND (
    v_first_seg = p_user_id::text
    OR (v_first_seg = 'notes' AND v_second_seg = p_user_id::text)
    OR public.is_platform_admin()
    OR EXISTS (
      SELECT 1
      FROM public.stored_files sf
      WHERE sf.storage_bucket = p_bucket
        AND sf.storage_path = p_path
        AND (sf.uploaded_by = p_user_id OR sf.created_by = p_user_id)
    )
  ) THEN
    RETURN true;
  END IF;

  IF p_bucket = 'study-materials' THEN
    RETURN EXISTS (
      SELECT 1
      FROM public.study_notes sn
      LEFT JOIN public.stored_files sf
        ON sf.id = sn.file_id OR sf.content_hash = sn.content_hash
      WHERE (
        (sn.storage_bucket = 'study-materials' AND sn.storage_path = p_path)
        OR (sf.storage_bucket = 'study-materials' AND sf.storage_path = p_path)
      )
        AND sn.is_public = true
        AND sn.is_published = true
        AND sn.is_restricted = false
        AND sn.moderation_status = 'approved'
    );
  END IF;

  IF p_bucket = 'study-materials-restricted' THEN
    IF p_user_id IS NULL THEN
      RETURN false;
    END IF;

    RETURN EXISTS (
      SELECT 1
      FROM public.study_notes sn
      LEFT JOIN public.stored_files sf
        ON sf.id = sn.file_id OR sf.content_hash = sn.content_hash
      WHERE (
        sn.storage_path = p_path
        OR (sf.storage_bucket = 'study-materials-restricted' AND sf.storage_path = p_path)
      )
        AND public.can_access_study_note(sn.id, p_user_id)
    );
  END IF;

  RETURN false;
END;
$$;
ALTER FUNCTION public.can_access_stored_file(text, text, uuid) OWNER TO postgres;

-- -----------------------------------------------------------------------------
-- 16. AUTH SIGNUP, ALIAS SYNC, PRIVILEGED-COLUMN & COUNTER TRIGGERS
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  v_display text;
  v_username text;
BEGIN
  v_display := coalesce(
    nullif(btrim(NEW.raw_user_meta_data->>'display_name'), ''),
    nullif(btrim(NEW.raw_user_meta_data->>'full_name'), ''),
    nullif(split_part(coalesce(NEW.email, ''), '@', 1), ''),
    'Student'
  );

  v_username := nullif(btrim(NEW.raw_user_meta_data->>'username'), '');
  IF v_username IS NOT NULL AND (
    v_username !~ '^[a-zA-Z0-9_.-]{2,40}$'
    OR EXISTS (SELECT 1 FROM public.profiles p WHERE p.username = v_username)
  ) THEN
    v_username := NULL;
  END IF;

  INSERT INTO public.profiles (id, username, display_name, full_name, email)
  VALUES (NEW.id, v_username, v_display, v_display, NEW.email)
  ON CONFLICT (id) DO UPDATE
    SET email = coalesce(public.profiles.email, EXCLUDED.email);

  INSERT INTO public.academic_information (user_id)
  VALUES (NEW.id)
  ON CONFLICT (user_id) DO NOTHING;

  INSERT INTO public.user_settings_preferences (user_id)
  VALUES (NEW.id)
  ON CONFLICT (user_id) DO NOTHING;

  RETURN NEW;
END;
$$;
ALTER FUNCTION public.handle_new_user() OWNER TO postgres;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- SECURITY INVOKER privileged-column firewall & alias synchronizer (Section 4.1)
CREATE OR REPLACE FUNCTION public.enforce_privileged_columns()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = pg_catalog, public
AS $$
DECLARE
  v_unprivileged boolean := (
    current_user IN ('authenticated', 'anon')
    AND NOT public.is_platform_admin()
  );
BEGIN
  IF TG_OP = 'UPDATE' THEN
    NEW.created_at := OLD.created_at;
    NEW.updated_at := now();
  ELSE
    NEW.created_at := coalesce(NEW.created_at, now());
    NEW.updated_at := coalesce(NEW.updated_at, now());
  END IF;

  CASE TG_TABLE_NAME
    WHEN 'profiles' THEN
      NEW.display_name := coalesce(nullif(btrim(NEW.display_name), ''), nullif(btrim(NEW.full_name), ''), 'Student');
      NEW.full_name    := coalesce(nullif(btrim(NEW.full_name), ''), NEW.display_name);
      IF TG_OP = 'INSERT' AND v_unprivileged THEN
        NEW.id := coalesce(auth.uid(), NEW.id);
        NEW.role := 'student';
        NEW.points := 0;
      ELSIF TG_OP = 'UPDATE' AND v_unprivileged THEN
        IF NEW.role IS DISTINCT FROM OLD.role OR NEW.points IS DISTINCT FROM OLD.points THEN
          RAISE EXCEPTION 'Cannot modify privileged profile columns (role, points)' USING ERRCODE = '42501';
        END IF;
        NEW.id := OLD.id;
        NEW.email := OLD.email;
      END IF;

    WHEN 'academic_information' THEN
      NEW.major := coalesce(nullif(btrim(NEW.major), ''), nullif(btrim(NEW.field_of_study), ''), '');
      NEW.field_of_study := coalesce(nullif(btrim(NEW.field_of_study), ''), NEW.major);
      NEW.semester := coalesce(nullif(btrim(NEW.semester), ''), nullif(btrim(NEW.current_semester), ''), '');
      NEW.current_semester := coalesce(nullif(btrim(NEW.current_semester), ''), NEW.semester);
      IF TG_OP = 'INSERT' AND v_unprivileged THEN
        NEW.user_id := coalesce(auth.uid(), NEW.user_id);
        NEW.enrollment_verified := false;
      ELSIF TG_OP = 'UPDATE' AND v_unprivileged THEN
        IF NEW.enrollment_verified IS DISTINCT FROM OLD.enrollment_verified THEN
          RAISE EXCEPTION 'Cannot self-verify academic enrollment' USING ERRCODE = '42501';
        END IF;
        NEW.id := OLD.id;
        NEW.user_id := OLD.user_id;
      END IF;

    WHEN 'user_settings_preferences' THEN
      NEW.theme_preference := coalesce(nullif(btrim(NEW.theme_preference), ''), nullif(btrim(NEW.theme), ''), 'system');
      NEW.theme := coalesce(nullif(btrim(NEW.theme), ''), NEW.theme_preference);
      IF TG_OP = 'INSERT' AND v_unprivileged THEN
        NEW.user_id := coalesce(auth.uid(), NEW.user_id);
      ELSIF TG_OP = 'UPDATE' AND v_unprivileged THEN
        NEW.id := OLD.id;
        NEW.user_id := OLD.user_id;
      END IF;

    WHEN 'stored_files' THEN
      NEW.content_hash := coalesce(nullif(btrim(NEW.content_hash), ''), nullif(btrim(NEW.sha256_hash), ''));
      NEW.sha256_hash  := coalesce(nullif(btrim(NEW.sha256_hash), ''), NEW.content_hash);
      IF NEW.storage_bucket = 'study-materials-restricted' THEN
        NEW.is_public := false;
        NEW.file_url := '';
      END IF;
      IF TG_OP = 'INSERT' AND v_unprivileged THEN
        NEW.uploaded_by := auth.uid();
        NEW.created_by := auth.uid();
        NEW.reference_count := 1;
      ELSIF TG_OP = 'UPDATE' AND v_unprivileged THEN
        NEW.id := OLD.id;
        NEW.content_hash := OLD.content_hash;
        NEW.sha256_hash := OLD.sha256_hash;
        NEW.uploaded_by := OLD.uploaded_by;
        NEW.created_by := OLD.created_by;
        NEW.reference_count := OLD.reference_count;
        IF OLD.storage_bucket = 'study-materials' AND OLD.is_public = true THEN
          NEW.storage_bucket := OLD.storage_bucket;
          NEW.storage_path := OLD.storage_path;
          NEW.is_public := true;
          NEW.file_url := coalesce(nullif(OLD.file_url, ''), NEW.file_url);
        END IF;
      END IF;

    WHEN 'study_notes' THEN
      NEW.content_hash   := coalesce(nullif(btrim(NEW.content_hash), ''), nullif(btrim(NEW.file_sha256), ''));
      NEW.file_sha256    := coalesce(nullif(btrim(NEW.file_sha256), ''), NEW.content_hash);
      NEW.file_type      := coalesce(nullif(btrim(NEW.file_type), ''), nullif(btrim(NEW.mime_type), ''), 'application/pdf');
      NEW.mime_type      := coalesce(nullif(btrim(NEW.mime_type), ''), NEW.file_type);
      NEW.file_size      := GREATEST(coalesce(NEW.file_size, 0), coalesce(NEW.file_size_bytes, 0));
      NEW.file_size_bytes := NEW.file_size;
      IF NEW.is_restricted = true OR NEW.is_public = false OR NEW.is_published = false THEN
        NEW.storage_bucket := 'study-materials-restricted';
        NEW.file_url := '';
      END IF;
      IF TG_OP = 'INSERT' AND v_unprivileged THEN
        NEW.author_id := auth.uid();
        NEW.uploader_id := auth.uid();
        NEW.upvotes := 0;
        NEW.downloads := 0;
        NEW.views_count := 0;
        NEW.rating := 0.00;
        NEW.is_verified := false;
        NEW.moderation_status := 'approved';
      ELSIF TG_OP = 'UPDATE' AND v_unprivileged THEN
        IF NEW.upvotes IS DISTINCT FROM OLD.upvotes
           OR NEW.downloads IS DISTINCT FROM OLD.downloads
           OR NEW.is_verified IS DISTINCT FROM OLD.is_verified
           OR NEW.moderation_status IS DISTINCT FROM OLD.moderation_status THEN
          RAISE EXCEPTION 'Cannot directly modify privileged study_notes counters or moderation flags' USING ERRCODE = '42501';
        END IF;
        NEW.id := OLD.id;
        NEW.author_id := OLD.author_id;
        NEW.uploader_id := OLD.uploader_id;
        NEW.views_count := OLD.views_count;
        NEW.rating := OLD.rating;
      END IF;

    WHEN 'universities' THEN
      IF TG_OP = 'INSERT' AND v_unprivileged THEN
        NEW.created_by := auth.uid();
        NEW.is_verified := false;
        NEW.followers_count := 0;
        NEW.courses_count := 0;
        NEW.resources_count := 0;
      ELSIF TG_OP = 'UPDATE' AND v_unprivileged THEN
        NEW.id := OLD.id;
        NEW.created_by := OLD.created_by;
        NEW.is_verified := OLD.is_verified;
        NEW.followers_count := OLD.followers_count;
        NEW.courses_count := OLD.courses_count;
        NEW.resources_count := OLD.resources_count;
      END IF;

    WHEN 'departments' THEN
      IF TG_OP = 'INSERT' AND v_unprivileged THEN
        NEW.created_by := auth.uid();
        NEW.courses_count := 0;
      ELSIF TG_OP = 'UPDATE' AND v_unprivileged THEN
        NEW.id := OLD.id;
        NEW.university_id := OLD.university_id;
        NEW.created_by := OLD.created_by;
        NEW.courses_count := OLD.courses_count;
      END IF;

    WHEN 'courses' THEN
      NEW.name := coalesce(nullif(btrim(NEW.name), ''), nullif(btrim(NEW.title), ''), 'Course');
      NEW.title := coalesce(nullif(btrim(NEW.title), ''), NEW.name);
      IF TG_OP = 'INSERT' AND v_unprivileged THEN
        NEW.created_by := auth.uid();
        NEW.resources_count := 0;
      ELSIF TG_OP = 'UPDATE' AND v_unprivileged THEN
        NEW.id := OLD.id;
        NEW.university_id := OLD.university_id;
        NEW.created_by := OLD.created_by;
        NEW.resources_count := OLD.resources_count;
      END IF;

    WHEN 'academic_programs' THEN
      NEW.title := coalesce(nullif(btrim(NEW.title), ''), nullif(btrim(NEW.name), ''), 'Program');
      NEW.name := coalesce(nullif(btrim(NEW.name), ''), NEW.title);
      IF TG_OP = 'INSERT' AND v_unprivileged THEN
        NEW.created_by := auth.uid();
        NEW.is_verified := false;
        NEW.enrolled_count := 0;
        NEW.discussions_count := 0;
        NEW.doubts_count := 0;
      ELSIF TG_OP = 'UPDATE' AND v_unprivileged THEN
        NEW.id := OLD.id;
        NEW.created_by := OLD.created_by;
        NEW.is_verified := OLD.is_verified;
        NEW.enrolled_count := OLD.enrolled_count;
        NEW.discussions_count := OLD.discussions_count;
        NEW.doubts_count := OLD.doubts_count;
      END IF;

    WHEN 'forum_topics' THEN
      NEW.name := coalesce(nullif(btrim(NEW.name), ''), nullif(btrim(NEW.title), ''), 'Topic');
      NEW.title := coalesce(nullif(btrim(NEW.title), ''), NEW.name);
      IF TG_OP = 'INSERT' AND v_unprivileged THEN
        RAISE EXCEPTION 'Only platform moderators can create forum topics' USING ERRCODE = '42501';
      END IF;

    WHEN 'forum_posts' THEN
      IF TG_OP = 'INSERT' AND v_unprivileged THEN
        NEW.author_id := auth.uid();
        NEW.author_role := public.get_my_moderator_role();
        NEW.upvotes := 0;
        NEW.downvotes := 0;
        NEW.score := 0;
        NEW.comments_count := 0;
        NEW.views_count := 0;
        NEW.is_pinned := false;
        NEW.is_locked := false;
        NEW.moderation_status := 'approved';
      ELSIF TG_OP = 'UPDATE' AND v_unprivileged THEN
        IF NEW.upvotes IS DISTINCT FROM OLD.upvotes
           OR NEW.downvotes IS DISTINCT FROM OLD.downvotes
           OR NEW.is_pinned IS DISTINCT FROM OLD.is_pinned
           OR NEW.is_locked IS DISTINCT FROM OLD.is_locked
           OR NEW.moderation_status IS DISTINCT FROM OLD.moderation_status THEN
          RAISE EXCEPTION 'Cannot directly modify privileged forum_posts fields' USING ERRCODE = '42501';
        END IF;
        NEW.id := OLD.id;
        NEW.author_id := OLD.author_id;
        NEW.author_role := OLD.author_role;
        NEW.score := OLD.score;
        NEW.comments_count := OLD.comments_count;
        NEW.views_count := OLD.views_count;
      END IF;

    WHEN 'forum_comments' THEN
      IF TG_OP = 'INSERT' AND v_unprivileged THEN
        NEW.author_id := auth.uid();
        NEW.author_role := public.get_my_moderator_role();
        NEW.upvotes := 0;
        NEW.downvotes := 0;
        NEW.score := 0;
        NEW.is_accepted := false;
        NEW.moderation_status := 'approved';
      ELSIF TG_OP = 'UPDATE' AND v_unprivileged THEN
        IF NEW.upvotes IS DISTINCT FROM OLD.upvotes
           OR NEW.downvotes IS DISTINCT FROM OLD.downvotes
           OR NEW.is_accepted IS DISTINCT FROM OLD.is_accepted
           OR NEW.moderation_status IS DISTINCT FROM OLD.moderation_status THEN
          RAISE EXCEPTION 'Cannot directly modify privileged forum_comments fields' USING ERRCODE = '42501';
        END IF;
        NEW.id := OLD.id;
        NEW.post_id := OLD.post_id;
        NEW.parent_id := OLD.parent_id;
        NEW.author_id := OLD.author_id;
        NEW.author_role := OLD.author_role;
        NEW.score := OLD.score;
      END IF;

    WHEN 'program_discussions', 'university_discussions' THEN
      IF TG_OP = 'INSERT' AND v_unprivileged THEN
        NEW.author_id := auth.uid();
        NEW.upvotes := 0;
        NEW.downvotes := 0;
        NEW.comments_count := 0;
        NEW.views_count := 0;
        NEW.is_pinned := false;
        NEW.is_locked := false;
        NEW.moderation_status := 'approved';
      ELSIF TG_OP = 'UPDATE' AND v_unprivileged THEN
        NEW.id := OLD.id;
        NEW.author_id := OLD.author_id;
        NEW.upvotes := OLD.upvotes;
        NEW.downvotes := OLD.downvotes;
        NEW.comments_count := OLD.comments_count;
        NEW.views_count := OLD.views_count;
        NEW.is_pinned := OLD.is_pinned;
        NEW.is_locked := OLD.is_locked;
        NEW.moderation_status := OLD.moderation_status;
      END IF;

    WHEN 'program_discussion_comments', 'university_discussion_comments' THEN
      IF TG_OP = 'INSERT' AND v_unprivileged THEN
        NEW.author_id := auth.uid();
        NEW.upvotes := 0;
        NEW.downvotes := 0;
        NEW.moderation_status := 'approved';
      ELSIF TG_OP = 'UPDATE' AND v_unprivileged THEN
        NEW.id := OLD.id;
        NEW.discussion_id := OLD.discussion_id;
        NEW.parent_id := OLD.parent_id;
        NEW.author_id := OLD.author_id;
        NEW.upvotes := OLD.upvotes;
        NEW.downvotes := OLD.downvotes;
        NEW.moderation_status := OLD.moderation_status;
      END IF;

    WHEN 'program_doubts', 'university_doubts' THEN
      NEW.title := coalesce(nullif(btrim(NEW.title), ''), nullif(btrim(NEW.question), ''), 'Question');
      NEW.question := coalesce(nullif(btrim(NEW.question), ''), NEW.title);
      IF TG_OP = 'INSERT' AND v_unprivileged THEN
        NEW.author_id := auth.uid();
        NEW.upvotes := 0;
        NEW.downvotes := 0;
        NEW.answers_count := 0;
        NEW.views_count := 0;
        NEW.is_resolved := false;
        NEW.accepted_answer_id := NULL;
        NEW.moderation_status := 'approved';
      ELSIF TG_OP = 'UPDATE' AND v_unprivileged THEN
        NEW.id := OLD.id;
        NEW.author_id := OLD.author_id;
        NEW.upvotes := OLD.upvotes;
        NEW.downvotes := OLD.downvotes;
        NEW.answers_count := OLD.answers_count;
        NEW.views_count := OLD.views_count;
        NEW.accepted_answer_id := OLD.accepted_answer_id;
        NEW.moderation_status := OLD.moderation_status;
      END IF;

    WHEN 'program_doubt_answers', 'university_doubt_answers' THEN
      IF TG_OP = 'INSERT' AND v_unprivileged THEN
        NEW.author_id := auth.uid();
        NEW.upvotes := 0;
        NEW.downvotes := 0;
        NEW.is_accepted := false;
        NEW.moderation_status := 'approved';
      ELSIF TG_OP = 'UPDATE' AND v_unprivileged THEN
        NEW.id := OLD.id;
        NEW.doubt_id := OLD.doubt_id;
        NEW.author_id := OLD.author_id;
        NEW.upvotes := OLD.upvotes;
        NEW.downvotes := OLD.downvotes;
        NEW.is_accepted := OLD.is_accepted;
        NEW.moderation_status := OLD.moderation_status;
      END IF;

    ELSE
      NULL;
  END CASE;

  RETURN NEW;
END;
$$;

-- Attach enforce_privileged_columns() across all content and profile tables
DO $$
DECLARE
  v_tbl text;
BEGIN
  FOREACH v_tbl IN ARRAY ARRAY[
    'profiles', 'academic_information', 'user_settings_preferences',
    'universities', 'departments', 'courses', 'academic_programs',
    'stored_files', 'study_notes',
    'forum_topics', 'forum_posts', 'forum_comments',
    'program_discussions', 'program_discussion_comments', 'program_doubts', 'program_doubt_answers',
    'university_discussions', 'university_discussion_comments', 'university_doubts', 'university_doubt_answers'
  ]
  LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS trg_enforce_privileged_%I ON public.%I', v_tbl, v_tbl);
    EXECUTE format(
      'CREATE TRIGGER trg_enforce_privileged_%I BEFORE INSERT OR UPDATE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.enforce_privileged_columns()',
      v_tbl, v_tbl
    );
  END LOOP;
END;
$$;

-- Single-source study_note_upvotes counter trigger (Trap 3 Fix: SECURITY DEFINER owned by postgres)
CREATE OR REPLACE FUNCTION public.sync_study_note_upvotes_counter()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.study_notes
    SET upvotes = upvotes + 1, updated_at = now()
    WHERE id = NEW.note_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.study_notes
    SET upvotes = GREATEST(0, upvotes - 1), updated_at = now()
    WHERE id = OLD.note_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$;
ALTER FUNCTION public.sync_study_note_upvotes_counter() OWNER TO postgres;

DROP TRIGGER IF EXISTS trg_sync_study_note_upvotes_counter ON public.study_note_upvotes;
CREATE TRIGGER trg_sync_study_note_upvotes_counter
  AFTER INSERT OR DELETE ON public.study_note_upvotes
  FOR EACH ROW EXECUTE FUNCTION public.sync_study_note_upvotes_counter();

-- Parent comment / answer / post count synchronizer (SECURITY DEFINER owned by postgres)
CREATE OR REPLACE FUNCTION public.sync_parent_collection_counts()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  v_delta integer := CASE WHEN TG_OP = 'INSERT' THEN 1 ELSE -1 END;
BEGIN
  CASE TG_TABLE_NAME
    WHEN 'forum_posts' THEN
      UPDATE public.forum_topics
      SET posts_count = GREATEST(0, posts_count + v_delta), updated_at = now()
      WHERE id = CASE WHEN TG_OP = 'INSERT' THEN NEW.topic_id ELSE OLD.topic_id END;
    WHEN 'forum_comments' THEN
      UPDATE public.forum_posts
      SET
        comments_count = GREATEST(0, comments_count + v_delta),
        last_activity_at = CASE WHEN TG_OP = 'INSERT' THEN now() ELSE last_activity_at END,
        updated_at = now()
      WHERE id = CASE WHEN TG_OP = 'INSERT' THEN NEW.post_id ELSE OLD.post_id END;
    WHEN 'program_discussions' THEN
      UPDATE public.academic_programs
      SET discussions_count = GREATEST(0, discussions_count + v_delta), updated_at = now()
      WHERE id = CASE WHEN TG_OP = 'INSERT' THEN NEW.program_id ELSE OLD.program_id END;
    WHEN 'program_discussion_comments' THEN
      UPDATE public.program_discussions
      SET comments_count = GREATEST(0, comments_count + v_delta), updated_at = now()
      WHERE id = CASE WHEN TG_OP = 'INSERT' THEN NEW.discussion_id ELSE OLD.discussion_id END;
    WHEN 'program_doubts' THEN
      UPDATE public.academic_programs
      SET doubts_count = GREATEST(0, doubts_count + v_delta), updated_at = now()
      WHERE id = CASE WHEN TG_OP = 'INSERT' THEN NEW.program_id ELSE OLD.program_id END;
    WHEN 'program_doubt_answers' THEN
      UPDATE public.program_doubts
      SET answers_count = GREATEST(0, answers_count + v_delta), updated_at = now()
      WHERE id = CASE WHEN TG_OP = 'INSERT' THEN NEW.doubt_id ELSE OLD.doubt_id END;
    WHEN 'university_discussion_comments' THEN
      UPDATE public.university_discussions
      SET comments_count = GREATEST(0, comments_count + v_delta), updated_at = now()
      WHERE id = CASE WHEN TG_OP = 'INSERT' THEN NEW.discussion_id ELSE OLD.discussion_id END;
    WHEN 'university_doubt_answers' THEN
      UPDATE public.university_doubts
      SET answers_count = GREATEST(0, answers_count + v_delta), updated_at = now()
      WHERE id = CASE WHEN TG_OP = 'INSERT' THEN NEW.doubt_id ELSE OLD.doubt_id END;
  END CASE;

  RETURN COALESCE(NEW, OLD);
END;
$$;
ALTER FUNCTION public.sync_parent_collection_counts() OWNER TO postgres;

DO $$
DECLARE
  v_tbl text;
BEGIN
  FOREACH v_tbl IN ARRAY ARRAY[
    'forum_posts', 'forum_comments',
    'program_discussions', 'program_discussion_comments',
    'program_doubts', 'program_doubt_answers',
    'university_discussion_comments', 'university_doubt_answers'
  ]
  LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS trg_sync_counts_%I ON public.%I', v_tbl, v_tbl);
    EXECUTE format(
      'CREATE TRIGGER trg_sync_counts_%I AFTER INSERT OR DELETE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.sync_parent_collection_counts()',
      v_tbl, v_tbl
    );
  END LOOP;
END;
$$;

-- -----------------------------------------------------------------------------
-- 17. CONTROLLED MUTATION RPCs (SECURITY DEFINER, OWNER = postgres)
-- -----------------------------------------------------------------------------

-- 17.1 Safe cross-user stored_files registration (Trap 2 Fix)
CREATE OR REPLACE FUNCTION public.upsert_stored_file(
  p_content_hash text,
  p_storage_bucket text DEFAULT 'study-materials',
  p_storage_path text DEFAULT '',
  p_file_url text DEFAULT '',
  p_original_filename text DEFAULT '',
  p_mime_type text DEFAULT 'application/pdf',
  p_size_bytes bigint DEFAULT 0,
  p_is_public boolean DEFAULT true
)
RETURNS public.stored_files
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_hash text := nullif(btrim(p_content_hash), '');
  v_bucket text := coalesce(nullif(btrim(p_storage_bucket), ''), 'study-materials');
  v_row public.stored_files;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Authentication required to register stored files' USING ERRCODE = '42501';
  END IF;
  IF v_hash IS NULL THEN
    RAISE EXCEPTION 'content_hash is required' USING ERRCODE = '22023';
  END IF;

  INSERT INTO public.stored_files (
    content_hash, sha256_hash, storage_bucket, storage_path, file_url,
    original_filename, mime_type, size_bytes, is_public, uploaded_by, created_by, reference_count
  )
  VALUES (
    v_hash, v_hash, v_bucket, p_storage_path,
    CASE WHEN v_bucket = 'study-materials-restricted' THEN '' ELSE coalesce(p_file_url, '') END,
    coalesce(p_original_filename, ''), coalesce(p_mime_type, 'application/pdf'),
    GREATEST(0, coalesce(p_size_bytes, 0)),
    CASE WHEN v_bucket = 'study-materials-restricted' THEN false ELSE coalesce(p_is_public, true) END,
    v_uid, v_uid, 1
  )
  ON CONFLICT (content_hash) DO UPDATE
    SET
      reference_count = public.stored_files.reference_count + 1,
      updated_at = now()
  RETURNING * INTO v_row;

  RETURN v_row;
END;
$$;
ALTER FUNCTION public.upsert_stored_file(text, text, text, text, text, text, bigint, boolean) OWNER TO postgres;

-- 17.2 Voting System #1: Study Note Upvotes (Single-source trigger updates study_notes.upvotes)
CREATE OR REPLACE FUNCTION public.toggle_study_note_upvote(p_note_id text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_rows integer := 0;
  v_upvoted boolean := false;
  v_upvotes integer := 0;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Authentication required to upvote study notes' USING ERRCODE = '42501';
  END IF;
  IF NOT public.can_access_study_note(p_note_id, v_uid) THEN
    RAISE EXCEPTION 'Study note % not found or access denied', p_note_id USING ERRCODE = '42501';
  END IF;

  PERFORM 1 FROM public.study_notes WHERE id = p_note_id FOR UPDATE;

  DELETE FROM public.study_note_upvotes
  WHERE note_id = p_note_id AND user_id = v_uid;
  GET DIAGNOSTICS v_rows = ROW_COUNT;

  IF v_rows > 0 THEN
    v_upvoted := false;
  ELSE
    INSERT INTO public.study_note_upvotes (note_id, user_id)
    VALUES (p_note_id, v_uid)
    ON CONFLICT (note_id, user_id) DO NOTHING;
    v_upvoted := true;
  END IF;

  SELECT sn.upvotes INTO v_upvotes
  FROM public.study_notes sn
  WHERE sn.id = p_note_id;

  RETURN jsonb_build_object(
    'note_id', p_note_id,
    'upvoted', v_upvoted,
    'upvotes', coalesce(v_upvotes, 0)
  );
END;
$$;
ALTER FUNCTION public.toggle_study_note_upvote(text) OWNER TO postgres;

-- 17.3 Download Deduplication & Rate-Limiting (Section 5.2)
CREATE OR REPLACE FUNCTION public.increment_downloads(
  note_id text DEFAULT NULL,
  row_id text DEFAULT NULL,
  p_session_hash text DEFAULT NULL
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, extensions
AS $$
DECLARE
  v_note_id text := coalesce(nullif(btrim(note_id), ''), nullif(btrim(row_id), ''));
  v_uid uuid := auth.uid();
  v_headers jsonb;
  v_raw text;
  v_fp text;
  v_rows integer := 0;
  v_downloads integer := 0;
BEGIN
  IF v_note_id IS NULL THEN
    RAISE EXCEPTION 'note_id or row_id is required' USING ERRCODE = '22023';
  END IF;

  IF NOT public.can_access_study_note(v_note_id, v_uid) THEN
    RAISE EXCEPTION 'Access denied to study note %', v_note_id USING ERRCODE = '42501';
  END IF;

  IF v_uid IS NOT NULL THEN
    v_fp := 'u:' || v_uid::text;
    INSERT INTO public.study_note_downloads (note_id, user_id, actor_fingerprint, downloaded_date)
    VALUES (v_note_id, v_uid, v_fp, (now() AT TIME ZONE 'utc')::date)
    ON CONFLICT (note_id, user_id) WHERE user_id IS NOT NULL DO NOTHING;
    GET DIAGNOSTICS v_rows = ROW_COUNT;
  ELSE
    BEGIN
      v_headers := coalesce(nullif(current_setting('request.headers', true), ''), '{}')::jsonb;
    EXCEPTION WHEN OTHERS THEN
      v_headers := '{}'::jsonb;
    END;

    v_raw := coalesce(nullif(btrim(p_session_hash), ''), '')
             || '|' || coalesce(v_headers->>'x-forwarded-for', '')
             || '|' || coalesce(v_headers->>'user-agent', '');

    v_fp := 'anon:' || encode(extensions.digest(v_raw::bytea, 'sha256'), 'hex');

    INSERT INTO public.study_note_downloads (note_id, user_id, actor_fingerprint, downloaded_date)
    VALUES (v_note_id, NULL, v_fp, (now() AT TIME ZONE 'utc')::date)
    ON CONFLICT (note_id, actor_fingerprint, downloaded_date) WHERE user_id IS NULL DO NOTHING;
    GET DIAGNOSTICS v_rows = ROW_COUNT;
  END IF;

  IF v_rows = 1 THEN
    UPDATE public.study_notes sn
    SET downloads = sn.downloads + 1, updated_at = now()
    WHERE sn.id = v_note_id
    RETURNING sn.downloads INTO v_downloads;
  ELSE
    SELECT sn.downloads INTO v_downloads
    FROM public.study_notes sn
    WHERE sn.id = v_note_id;
  END IF;

  RETURN coalesce(v_downloads, 0);
END;
$$;
ALTER FUNCTION public.increment_downloads(text, text, text) OWNER TO postgres;

-- 17.4 Voting System #2: Forum Post Votes (Section 5.1)
CREATE OR REPLACE FUNCTION public.vote_forum_post(
  p_post_id text,
  p_vote_type smallint
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_existing smallint;
  v_rows integer := 0;
  v_up integer;
  v_down integer;
  v_score integer;
  v_final_vote smallint := 0;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Authentication required to vote on forum posts' USING ERRCODE = '42501';
  END IF;
  IF p_vote_type NOT IN (-1, 0, 1) THEN
    RAISE EXCEPTION 'Invalid vote_type % (must be -1, 0, or 1)', p_vote_type USING ERRCODE = '22023';
  END IF;

  PERFORM 1
  FROM public.forum_posts fp
  WHERE fp.id = p_post_id
    AND (fp.moderation_status = 'approved' OR fp.author_id = v_uid OR public.is_platform_admin())
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Forum post % not found or not accessible', p_post_id USING ERRCODE = '42501';
  END IF;

  SELECT v.vote_type INTO v_existing
  FROM public.forum_post_votes v
  WHERE v.post_id = p_post_id AND v.user_id = v_uid;

  IF p_vote_type = 0 THEN
    IF v_existing IS NOT NULL THEN
      DELETE FROM public.forum_post_votes
      WHERE post_id = p_post_id AND user_id = v_uid AND vote_type = v_existing;
      GET DIAGNOSTICS v_rows = ROW_COUNT;
      IF v_rows = 1 THEN
        UPDATE public.forum_posts
        SET
          upvotes   = CASE WHEN v_existing = 1 THEN GREATEST(0, upvotes - 1) ELSE upvotes END,
          downvotes = CASE WHEN v_existing = -1 THEN GREATEST(0, downvotes - 1) ELSE downvotes END,
          score     = (CASE WHEN v_existing = 1 THEN GREATEST(0, upvotes - 1) ELSE upvotes END)
                    - (CASE WHEN v_existing = -1 THEN GREATEST(0, downvotes - 1) ELSE downvotes END),
          updated_at = now()
        WHERE id = p_post_id;
      END IF;
    END IF;
    v_final_vote := 0;

  ELSIF v_existing IS NULL THEN
    INSERT INTO public.forum_post_votes (post_id, user_id, vote_type)
    VALUES (p_post_id, v_uid, p_vote_type)
    ON CONFLICT (post_id, user_id) DO NOTHING;
    GET DIAGNOSTICS v_rows = ROW_COUNT;
    IF v_rows = 1 THEN
      UPDATE public.forum_posts
      SET
        upvotes   = CASE WHEN p_vote_type = 1 THEN upvotes + 1 ELSE upvotes END,
        downvotes = CASE WHEN p_vote_type = -1 THEN downvotes + 1 ELSE downvotes END,
        score     = (CASE WHEN p_vote_type = 1 THEN upvotes + 1 ELSE upvotes END)
                  - (CASE WHEN p_vote_type = -1 THEN downvotes + 1 ELSE downvotes END),
        updated_at = now()
      WHERE id = p_post_id;
    END IF;
    v_final_vote := p_vote_type;

  ELSIF v_existing <> p_vote_type THEN
    UPDATE public.forum_post_votes
    SET vote_type = p_vote_type, updated_at = now()
    WHERE post_id = p_post_id AND user_id = v_uid AND vote_type = v_existing;
    GET DIAGNOSTICS v_rows = ROW_COUNT;
    IF v_rows = 1 THEN
      UPDATE public.forum_posts
      SET
        upvotes   = CASE WHEN p_vote_type = 1 THEN upvotes + 1 ELSE GREATEST(0, upvotes - 1) END,
        downvotes = CASE WHEN p_vote_type = -1 THEN downvotes + 1 ELSE GREATEST(0, downvotes - 1) END,
        score     = (CASE WHEN p_vote_type = 1 THEN upvotes + 1 ELSE GREATEST(0, upvotes - 1) END)
                  - (CASE WHEN p_vote_type = -1 THEN downvotes + 1 ELSE GREATEST(0, downvotes - 1) END),
        updated_at = now()
      WHERE id = p_post_id;
    END IF;
    v_final_vote := p_vote_type;
  ELSE
    v_final_vote := v_existing;
  END IF;

  SELECT fp.upvotes, fp.downvotes, fp.score INTO v_up, v_down, v_score
  FROM public.forum_posts fp
  WHERE fp.id = p_post_id;

  RETURN jsonb_build_object(
    'post_id', p_post_id,
    'vote_type', v_final_vote,
    'upvotes', coalesce(v_up, 0),
    'downvotes', coalesce(v_down, 0),
    'score', coalesce(v_score, 0)
  );
END;
$$;
ALTER FUNCTION public.vote_forum_post(text, smallint) OWNER TO postgres;

-- 17.5 Voting System #3: Forum Comment Votes (Section 5.1)
CREATE OR REPLACE FUNCTION public.vote_forum_comment(
  p_comment_id text,
  p_vote_type smallint
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_existing smallint;
  v_rows integer := 0;
  v_up integer;
  v_down integer;
  v_score integer;
  v_final_vote smallint := 0;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Authentication required to vote on forum comments' USING ERRCODE = '42501';
  END IF;
  IF p_vote_type NOT IN (-1, 0, 1) THEN
    RAISE EXCEPTION 'Invalid vote_type % (must be -1, 0, or 1)', p_vote_type USING ERRCODE = '22023';
  END IF;

  PERFORM 1
  FROM public.forum_comments fc
  JOIN public.forum_posts fp ON fp.id = fc.post_id
  WHERE fc.id = p_comment_id
    AND (fc.moderation_status = 'approved' OR fc.author_id = v_uid OR public.is_platform_admin())
    AND (fp.moderation_status = 'approved' OR fp.author_id = v_uid OR public.is_platform_admin())
  FOR UPDATE OF fc;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Forum comment % not found or not accessible', p_comment_id USING ERRCODE = '42501';
  END IF;

  SELECT v.vote_type INTO v_existing
  FROM public.forum_comment_votes v
  WHERE v.comment_id = p_comment_id AND v.user_id = v_uid;

  IF p_vote_type = 0 THEN
    IF v_existing IS NOT NULL THEN
      DELETE FROM public.forum_comment_votes
      WHERE comment_id = p_comment_id AND user_id = v_uid AND vote_type = v_existing;
      GET DIAGNOSTICS v_rows = ROW_COUNT;
      IF v_rows = 1 THEN
        UPDATE public.forum_comments
        SET
          upvotes   = CASE WHEN v_existing = 1 THEN GREATEST(0, upvotes - 1) ELSE upvotes END,
          downvotes = CASE WHEN v_existing = -1 THEN GREATEST(0, downvotes - 1) ELSE downvotes END,
          score     = (CASE WHEN v_existing = 1 THEN GREATEST(0, upvotes - 1) ELSE upvotes END)
                    - (CASE WHEN v_existing = -1 THEN GREATEST(0, downvotes - 1) ELSE downvotes END),
          updated_at = now()
        WHERE id = p_comment_id;
      END IF;
    END IF;
    v_final_vote := 0;

  ELSIF v_existing IS NULL THEN
    INSERT INTO public.forum_comment_votes (comment_id, user_id, vote_type)
    VALUES (p_comment_id, v_uid, p_vote_type)
    ON CONFLICT (comment_id, user_id) DO NOTHING;
    GET DIAGNOSTICS v_rows = ROW_COUNT;
    IF v_rows = 1 THEN
      UPDATE public.forum_comments
      SET
        upvotes   = CASE WHEN p_vote_type = 1 THEN upvotes + 1 ELSE upvotes END,
        downvotes = CASE WHEN p_vote_type = -1 THEN downvotes + 1 ELSE downvotes END,
        score     = (CASE WHEN p_vote_type = 1 THEN upvotes + 1 ELSE upvotes END)
                  - (CASE WHEN p_vote_type = -1 THEN downvotes + 1 ELSE downvotes END),
        updated_at = now()
      WHERE id = p_comment_id;
    END IF;
    v_final_vote := p_vote_type;

  ELSIF v_existing <> p_vote_type THEN
    UPDATE public.forum_comment_votes
    SET vote_type = p_vote_type, updated_at = now()
    WHERE comment_id = p_comment_id AND user_id = v_uid AND vote_type = v_existing;
    GET DIAGNOSTICS v_rows = ROW_COUNT;
    IF v_rows = 1 THEN
      UPDATE public.forum_comments
      SET
        upvotes   = CASE WHEN p_vote_type = 1 THEN upvotes + 1 ELSE GREATEST(0, upvotes - 1) END,
        downvotes = CASE WHEN p_vote_type = -1 THEN downvotes + 1 ELSE GREATEST(0, downvotes - 1) END,
        score     = (CASE WHEN p_vote_type = 1 THEN upvotes + 1 ELSE GREATEST(0, upvotes - 1) END)
                  - (CASE WHEN p_vote_type = -1 THEN downvotes + 1 ELSE GREATEST(0, downvotes - 1) END),
        updated_at = now()
      WHERE id = p_comment_id;
    END IF;
    v_final_vote := p_vote_type;
  ELSE
    v_final_vote := v_existing;
  END IF;

  SELECT fc.upvotes, fc.downvotes, fc.score INTO v_up, v_down, v_score
  FROM public.forum_comments fc
  WHERE fc.id = p_comment_id;

  RETURN jsonb_build_object(
    'comment_id', p_comment_id,
    'vote_type', v_final_vote,
    'upvotes', coalesce(v_up, 0),
    'downvotes', coalesce(v_down, 0),
    'score', coalesce(v_score, 0)
  );
END;
$$;
ALTER FUNCTION public.vote_forum_comment(text, smallint) OWNER TO postgres;

-- 17.6 Voting Systems #4 - #7: Community Item Votes (Programs & Universities)
CREATE OR REPLACE FUNCTION public.toggle_community_vote(
  p_item_type text,
  p_item_id text,
  p_vote_type integer DEFAULT 1
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_target_table text;
  v_existing smallint;
  v_rows integer := 0;
  v_up_delta integer := 0;
  v_down_delta integer := 0;
  v_final_vote smallint := 0;
  v_up integer := 0;
  v_down integer := 0;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Authentication required to vote' USING ERRCODE = '42501';
  END IF;
  IF p_vote_type NOT IN (-1, 0, 1) THEN
    RAISE EXCEPTION 'Invalid p_vote_type % (must be -1, 0, or 1)', p_vote_type USING ERRCODE = '22023';
  END IF;

  v_target_table := CASE p_item_type
    WHEN 'program_discussion' THEN 'program_discussions'
    WHEN 'program_discussion_comment' THEN 'program_discussion_comments'
    WHEN 'program_doubt' THEN 'program_doubts'
    WHEN 'program_doubt_answer' THEN 'program_doubt_answers'
    WHEN 'university_discussion' THEN 'university_discussions'
    WHEN 'university_discussion_comment' THEN 'university_discussion_comments'
    WHEN 'university_doubt' THEN 'university_doubts'
    WHEN 'university_doubt_answer' THEN 'university_doubt_answers'
    ELSE NULL
  END;

  IF v_target_table IS NULL THEN
    RAISE EXCEPTION 'Unsupported community item_type: %', p_item_type USING ERRCODE = '22023';
  END IF;

  EXECUTE format(
    'SELECT upvotes, downvotes FROM public.%I WHERE id = $1 AND (moderation_status = ''approved'' OR author_id = $2 OR public.is_platform_admin()) FOR UPDATE',
    v_target_table
  ) INTO v_up, v_down USING p_item_id, v_uid;

  IF v_up IS NULL THEN
    RAISE EXCEPTION 'Target % (%) not found or not accessible', p_item_type, p_item_id USING ERRCODE = '42501';
  END IF;

  SELECT v.vote_type INTO v_existing
  FROM public.community_item_votes v
  WHERE v.item_type = p_item_type AND v.item_id = p_item_id AND v.user_id = v_uid;

  IF p_vote_type = 0 OR (v_existing IS NOT NULL AND v_existing = p_vote_type) THEN
    IF v_existing IS NOT NULL THEN
      DELETE FROM public.community_item_votes
      WHERE item_type = p_item_type AND item_id = p_item_id AND user_id = v_uid AND vote_type = v_existing;
      GET DIAGNOSTICS v_rows = ROW_COUNT;
      IF v_rows = 1 THEN
        v_up_delta := CASE WHEN v_existing = 1 THEN -1 ELSE 0 END;
        v_down_delta := CASE WHEN v_existing = -1 THEN -1 ELSE 0 END;
      END IF;
    END IF;
    v_final_vote := 0;

  ELSIF v_existing IS NULL THEN
    INSERT INTO public.community_item_votes (item_type, item_id, user_id, vote_type)
    VALUES (p_item_type, p_item_id, v_uid, p_vote_type::smallint)
    ON CONFLICT (item_type, item_id, user_id) DO NOTHING;
    GET DIAGNOSTICS v_rows = ROW_COUNT;
    IF v_rows = 1 THEN
      v_up_delta := CASE WHEN p_vote_type = 1 THEN 1 ELSE 0 END;
      v_down_delta := CASE WHEN p_vote_type = -1 THEN 1 ELSE 0 END;
    END IF;
    v_final_vote := p_vote_type::smallint;

  ELSE
    UPDATE public.community_item_votes
    SET vote_type = p_vote_type::smallint, updated_at = now()
    WHERE item_type = p_item_type AND item_id = p_item_id AND user_id = v_uid AND vote_type = v_existing;
    GET DIAGNOSTICS v_rows = ROW_COUNT;
    IF v_rows = 1 THEN
      v_up_delta := CASE WHEN p_vote_type = 1 THEN 1 ELSE -1 END;
      v_down_delta := CASE WHEN p_vote_type = -1 THEN 1 ELSE -1 END;
    END IF;
    v_final_vote := p_vote_type::smallint;
  END IF;

  IF v_up_delta <> 0 OR v_down_delta <> 0 THEN
    EXECUTE format(
      'UPDATE public.%I SET upvotes = GREATEST(0, upvotes + $1), downvotes = GREATEST(0, downvotes + $2), updated_at = now() WHERE id = $3 RETURNING upvotes, downvotes',
      v_target_table
    ) INTO v_up, v_down USING v_up_delta, v_down_delta, p_item_id;
  END IF;

  RETURN jsonb_build_object(
    'item_type', p_item_type,
    'item_id', p_item_id,
    'vote_type', v_final_vote,
    'upvotes', coalesce(v_up, 0),
    'downvotes', coalesce(v_down, 0)
  );
END;
$$;
ALTER FUNCTION public.toggle_community_vote(text, text, integer) OWNER TO postgres;

-- 17.7 Program Enrollment & University Follow RPCs
CREATE OR REPLACE FUNCTION public.toggle_program_enrollment(p_program_id text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_rows integer := 0;
  v_enrolled boolean := false;
  v_count integer := 0;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Authentication required' USING ERRCODE = '42501';
  END IF;

  PERFORM 1 FROM public.academic_programs WHERE id = p_program_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Program % not found', p_program_id USING ERRCODE = '22023';
  END IF;

  DELETE FROM public.program_enrollments WHERE program_id = p_program_id AND user_id = v_uid;
  GET DIAGNOSTICS v_rows = ROW_COUNT;

  IF v_rows > 0 THEN
    v_enrolled := false;
    UPDATE public.academic_programs
    SET enrolled_count = GREATEST(0, enrolled_count - 1), updated_at = now()
    WHERE id = p_program_id
    RETURNING enrolled_count INTO v_count;
  ELSE
    INSERT INTO public.program_enrollments (program_id, user_id)
    VALUES (p_program_id, v_uid)
    ON CONFLICT (program_id, user_id) DO NOTHING;
    GET DIAGNOSTICS v_rows = ROW_COUNT;
    v_enrolled := true;
    UPDATE public.academic_programs
    SET enrolled_count = enrolled_count + v_rows, updated_at = now()
    WHERE id = p_program_id
    RETURNING enrolled_count INTO v_count;
  END IF;

  RETURN jsonb_build_object('program_id', p_program_id, 'enrolled', v_enrolled, 'enrolled_count', coalesce(v_count, 0));
END;
$$;
ALTER FUNCTION public.toggle_program_enrollment(text) OWNER TO postgres;

CREATE OR REPLACE FUNCTION public.toggle_university_follow(p_university_id text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_rows integer := 0;
  v_following boolean := false;
  v_count integer := 0;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Authentication required' USING ERRCODE = '42501';
  END IF;

  PERFORM 1 FROM public.universities WHERE id = p_university_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'University % not found', p_university_id USING ERRCODE = '22023';
  END IF;

  DELETE FROM public.university_follows WHERE university_id = p_university_id AND user_id = v_uid;
  GET DIAGNOSTICS v_rows = ROW_COUNT;

  IF v_rows > 0 THEN
    v_following := false;
    UPDATE public.universities
    SET followers_count = GREATEST(0, followers_count - 1), updated_at = now()
    WHERE id = p_university_id
    RETURNING followers_count INTO v_count;
  ELSE
    INSERT INTO public.university_follows (university_id, user_id)
    VALUES (p_university_id, v_uid)
    ON CONFLICT (university_id, user_id) DO NOTHING;
    GET DIAGNOSTICS v_rows = ROW_COUNT;
    v_following := true;
    UPDATE public.universities
    SET followers_count = followers_count + v_rows, updated_at = now()
    WHERE id = p_university_id
    RETURNING followers_count INTO v_count;
  END IF;

  RETURN jsonb_build_object('university_id', p_university_id, 'following', v_following, 'followers_count', coalesce(v_count, 0));
END;
$$;
ALTER FUNCTION public.toggle_university_follow(text) OWNER TO postgres;

-- 17.8 Doubt Answer Acceptance RPC (Section 5.3)
CREATE OR REPLACE FUNCTION public.accept_doubt_answer(
  p_scope text,
  p_doubt_id text,
  p_answer_id text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_author_id uuid;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Authentication required' USING ERRCODE = '42501';
  END IF;

  IF p_scope = 'program' THEN
    SELECT author_id INTO v_author_id FROM public.program_doubts WHERE id = p_doubt_id FOR UPDATE;
    IF NOT FOUND THEN RAISE EXCEPTION 'Program doubt % not found', p_doubt_id USING ERRCODE = '22023'; END IF;
    IF v_author_id IS DISTINCT FROM v_uid AND NOT public.is_platform_admin() THEN
      RAISE EXCEPTION 'Only the doubt author or a platform moderator can accept an answer' USING ERRCODE = '42501';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM public.program_doubt_answers WHERE id = p_answer_id AND doubt_id = p_doubt_id) THEN
      RAISE EXCEPTION 'Answer % does not belong to doubt %', p_answer_id, p_doubt_id USING ERRCODE = '22023';
    END IF;

    UPDATE public.program_doubt_answers SET is_accepted = (id = p_answer_id), updated_at = now() WHERE doubt_id = p_doubt_id;
    UPDATE public.program_doubts SET is_resolved = true, accepted_answer_id = p_answer_id, updated_at = now() WHERE id = p_doubt_id;

  ELSIF p_scope = 'university' THEN
    SELECT author_id INTO v_author_id FROM public.university_doubts WHERE id = p_doubt_id FOR UPDATE;
    IF NOT FOUND THEN RAISE EXCEPTION 'University doubt % not found', p_doubt_id USING ERRCODE = '22023'; END IF;
    IF v_author_id IS DISTINCT FROM v_uid AND NOT public.is_platform_admin() THEN
      RAISE EXCEPTION 'Only the doubt author or a platform moderator can accept an answer' USING ERRCODE = '42501';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM public.university_doubt_answers WHERE id = p_answer_id AND doubt_id = p_doubt_id) THEN
      RAISE EXCEPTION 'Answer % does not belong to doubt %', p_answer_id, p_doubt_id USING ERRCODE = '22023';
    END IF;

    UPDATE public.university_doubt_answers SET is_accepted = (id = p_answer_id), updated_at = now() WHERE doubt_id = p_doubt_id;
    UPDATE public.university_doubts SET is_resolved = true, accepted_answer_id = p_answer_id, updated_at = now() WHERE id = p_doubt_id;
  ELSE
    RAISE EXCEPTION 'Invalid p_scope % (must be program or university)', p_scope USING ERRCODE = '22023';
  END IF;

  RETURN jsonb_build_object('scope', p_scope, 'doubt_id', p_doubt_id, 'accepted_answer_id', p_answer_id, 'is_resolved', true);
END;
$$;
ALTER FUNCTION public.accept_doubt_answer(text, text, text) OWNER TO postgres;

-- 17.9 Content Moderation RPC (Section 4.2 Note)
CREATE OR REPLACE FUNCTION public.moderate_content_item(
  p_table text,
  p_id text,
  p_patch jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
BEGIN
  IF NOT public.is_platform_admin() THEN
    RAISE EXCEPTION 'Moderator or administrator privileges required' USING ERRCODE = '42501';
  END IF;

  IF p_table NOT IN (
    'study_notes', 'forum_topics', 'forum_posts', 'forum_comments',
    'program_discussions', 'program_discussion_comments', 'program_doubts', 'program_doubt_answers',
    'university_discussions', 'university_discussion_comments', 'university_doubts', 'university_doubt_answers',
    'universities', 'academic_programs'
  ) THEN
    RAISE EXCEPTION 'Unsupported moderation table: %', p_table USING ERRCODE = '22023';
  END IF;

  IF p_patch ? 'moderation_status' THEN
    EXECUTE format('UPDATE public.%I SET moderation_status = $1, updated_at = now() WHERE id = $2', p_table)
    USING (p_patch->>'moderation_status'), p_id;
  END IF;
  IF p_patch ? 'is_pinned' THEN
    EXECUTE format('UPDATE public.%I SET is_pinned = $1, updated_at = now() WHERE id = $2', p_table)
    USING (p_patch->>'is_pinned')::boolean, p_id;
  END IF;
  IF p_patch ? 'is_locked' THEN
    EXECUTE format('UPDATE public.%I SET is_locked = $1, updated_at = now() WHERE id = $2', p_table)
    USING (p_patch->>'is_locked')::boolean, p_id;
  END IF;
  IF p_patch ? 'is_verified' THEN
    EXECUTE format('UPDATE public.%I SET is_verified = $1, updated_at = now() WHERE id = $2', p_table)
    USING (p_patch->>'is_verified')::boolean, p_id;
  END IF;

  RETURN jsonb_build_object('table', p_table, 'id', p_id, 'status', 'moderated');
END;
$$;
ALTER FUNCTION public.moderate_content_item(text, text, jsonb) OWNER TO postgres;

-- 17.10 Class C Quarantine Resolution RPC (Section 7.2)
CREATE OR REPLACE FUNCTION public.resolve_quarantined_record(
  p_quarantine_id uuid,
  p_action text,
  p_new_fk_value text DEFAULT NULL,
  p_notes text DEFAULT ''
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  v_q public.migration_orphan_quarantine;
  v_payload jsonb;
BEGIN
  IF NOT public.is_platform_admin() THEN
    RAISE EXCEPTION 'Administrator privileges required to resolve quarantined records' USING ERRCODE = '42501';
  END IF;

  SELECT * INTO v_q
  FROM public.migration_orphan_quarantine
  WHERE quarantine_id = p_quarantine_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Quarantine record % not found', p_quarantine_id USING ERRCODE = '22023';
  END IF;

  IF p_action = 'archive' THEN
    UPDATE public.migration_orphan_quarantine
    SET
      quarantine_class = 'CLASS_C_ARCHIVED',
      resolved_at = now(),
      resolved_by = auth.uid(),
      resolution_notes = coalesce(p_notes, '')
    WHERE quarantine_id = p_quarantine_id;

    RETURN jsonb_build_object('quarantine_id', p_quarantine_id, 'status', 'CLASS_C_ARCHIVED');

  ELSIF p_action = 'restore' THEN
    v_payload := CASE
      WHEN p_new_fk_value IS NOT NULL THEN jsonb_set(v_q.row_payload, ARRAY[v_q.missing_fk_column], to_jsonb(p_new_fk_value), true)
      ELSE v_q.row_payload
    END;

    EXECUTE format(
      'INSERT INTO public.%I SELECT * FROM jsonb_populate_record(NULL::public.%I, $1) ON CONFLICT DO NOTHING',
      v_q.source_table, v_q.source_table
    ) USING v_payload;

    UPDATE public.migration_orphan_quarantine
    SET
      quarantine_class = 'CLASS_C_ADMIN_RESOLVED',
      resolved_at = now(),
      resolved_by = auth.uid(),
      resolution_notes = coalesce(p_notes, '')
    WHERE quarantine_id = p_quarantine_id;

    RETURN jsonb_build_object('quarantine_id', p_quarantine_id, 'status', 'CLASS_C_ADMIN_RESOLVED', 'source_table', v_q.source_table);
  ELSE
    RAISE EXCEPTION 'Invalid p_action % (must be restore or archive)', p_action USING ERRCODE = '22023';
  END IF;
END;
$$;
ALTER FUNCTION public.resolve_quarantined_record(uuid, text, text, text) OWNER TO postgres;

-- =============================================================================
-- XEUSAR v4 COMPLETE SECURITY & PUBLIC SYNC REPAIR — PART 4 OF 4
-- Grants, Column-Level UPDATE Firewall, RLS Policies, Storage & Verification
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 18. GLOBAL REVOCATIONS, TABLE GRANTS & COLUMN-LEVEL UPDATE LISTS (Section 4.2)
-- -----------------------------------------------------------------------------
REVOKE ALL ON ALL TABLES IN SCHEMA public FROM PUBLIC, anon, authenticated;
REVOKE ALL ON ALL SEQUENCES IN SCHEMA public FROM PUBLIC, anon, authenticated;
REVOKE ALL ON ALL FUNCTIONS IN SCHEMA public FROM PUBLIC, anon, authenticated;

ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON TABLES FROM PUBLIC, anon, authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON FUNCTIONS FROM PUBLIC, anon, authenticated;

GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL TABLES IN SCHEMA public TO postgres, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO postgres, service_role;

-- 18.1 Public View & Read Grants for anon and authenticated
GRANT SELECT ON public.public_student_profiles TO anon, authenticated;

GRANT SELECT ON
  public.academic_information,
  public.universities,
  public.departments,
  public.courses,
  public.academic_programs,
  public.stored_files,
  public.study_notes,
  public.forum_topics,
  public.forum_posts,
  public.forum_comments,
  public.program_discussions,
  public.program_discussion_comments,
  public.program_doubts,
  public.program_doubt_answers,
  public.university_discussions,
  public.university_discussion_comments,
  public.university_doubts,
  public.university_doubt_answers
TO anon, authenticated;

-- 18.2 Authenticated Owner-Only SELECT / INSERT / DELETE Table Grants
GRANT SELECT, INSERT ON
  public.profiles,
  public.academic_information,
  public.user_settings_preferences,
  public.universities,
  public.departments,
  public.courses,
  public.academic_programs,
  public.forum_reports
TO authenticated;

GRANT SELECT, INSERT, DELETE ON
  public.program_enrollments,
  public.university_follows,
  public.stored_files,
  public.study_notes,
  public.study_note_upvotes,
  public.forum_topics,
  public.forum_posts,
  public.forum_comments,
  public.forum_bookmarks,
  public.program_discussions,
  public.program_discussion_comments,
  public.program_doubts,
  public.program_doubt_answers,
  public.university_discussions,
  public.university_discussion_comments,
  public.university_doubts,
  public.university_doubt_answers
TO authenticated;

GRANT SELECT ON
  public.forum_post_votes,
  public.forum_comment_votes,
  public.community_item_votes
TO authenticated;

-- Zero client grants on public.moderator_roles, public.study_note_downloads, public.migration_orphan_quarantine

-- 18.3 Upsert-Safe Column-Level UPDATE Grants (Privileged Counters, Roles & Flags Excluded!)
GRANT UPDATE (id, username, display_name, full_name, avatar_url, bio, setup_completed, created_at, updated_at)
  ON public.profiles TO authenticated;

GRANT UPDATE (
  id, user_id, university_id, program_id, education_level, academic_stage,
  institution_name, degree_program, major, field_of_study, academic_year,
  semester, current_semester, student_id_number, graduation_year, created_at, updated_at
) ON public.academic_information TO authenticated;

GRANT UPDATE (
  id, user_id, account_settings, privacy_settings, notification_settings,
  appearance_settings, preferred_subjects, study_preferences, preferred_language,
  theme_preference, theme, content_discovery_preferences, email_notifications,
  forum_notifications, resource_alerts, public_profile, show_academic_info, created_at, updated_at
) ON public.user_settings_preferences TO authenticated;

GRANT UPDATE (
  id, name, short_name, slug, location, country, website, description,
  logo_url, banner_url, type, access_scope, created_by, created_at, updated_at
) ON public.universities TO authenticated;

GRANT UPDATE (id, university_id, name, code, description, faculty_head, created_by, created_at, updated_at)
  ON public.departments TO authenticated;

GRANT UPDATE (
  id, university_id, department_id, code, name, title, description,
  semester, credits, instructor, created_by, created_at, updated_at
) ON public.courses TO authenticated;

GRANT UPDATE (
  id, university_id, title, name, code, category, level, duration, description,
  syllabus_summary, career_paths, subjects, access_scope, created_by, created_at, updated_at
) ON public.academic_programs TO authenticated;

GRANT UPDATE (
  id, content_hash, sha256_hash, storage_bucket, storage_path, file_url,
  original_filename, mime_type, size_bytes, is_public, uploaded_by, created_by, created_at, updated_at
) ON public.stored_files TO authenticated;

GRANT UPDATE (
  id, title, subject, course_code, course_id, university, university_id, program_id,
  department, department_id, semester, academic_year, professor, note_type, resource_type,
  description, summary, content, tags, pages, page_count, file_url, storage_bucket,
  storage_path, file_name, file_type, mime_type, file_size, file_size_bytes, content_hash,
  file_sha256, file_id, preview_url, author_id, uploader_id, author_name, author_avatar,
  author_university, is_public, is_published, is_restricted, created_at, updated_at
) ON public.study_notes TO authenticated;

GRANT UPDATE (
  id, name, title, slug, description, icon, color, category, sort_order, is_locked, created_by, created_at, updated_at
) ON public.forum_topics TO authenticated;

GRANT UPDATE (
  id, topic_id, title, content, author_id, author_name, author_username,
  author_avatar, tags, is_resolved, created_at, updated_at
) ON public.forum_posts TO authenticated;

GRANT UPDATE (
  id, post_id, parent_id, content, author_id, author_name, author_username, author_avatar, created_at, updated_at
) ON public.forum_comments TO authenticated;

GRANT UPDATE (
  id, program_id, title, content, category, tags, author_id, author_name, author_avatar, created_at, updated_at
) ON public.program_discussions TO authenticated;

GRANT UPDATE (
  id, discussion_id, parent_id, content, author_id, author_name, author_avatar, created_at, updated_at
) ON public.program_discussion_comments TO authenticated;

GRANT UPDATE (
  id, program_id, title, question, content, subject, tags, author_id, author_name, author_avatar, is_resolved, created_at, updated_at
) ON public.program_doubts TO authenticated;

GRANT UPDATE (
  id, doubt_id, content, author_id, author_name, author_avatar, created_at, updated_at
) ON public.program_doubt_answers TO authenticated;

GRANT UPDATE (
  id, university_id, department_id, course_id, title, content, category, tags, author_id, author_name, author_avatar, created_at, updated_at
) ON public.university_discussions TO authenticated;

GRANT UPDATE (
  id, discussion_id, parent_id, content, author_id, author_name, author_avatar, created_at, updated_at
) ON public.university_discussion_comments TO authenticated;

GRANT UPDATE (
  id, university_id, department_id, course_id, title, question, content, subject, tags, author_id, author_name, author_avatar, is_resolved, created_at, updated_at
) ON public.university_doubts TO authenticated;

GRANT UPDATE (
  id, doubt_id, content, author_id, author_name, author_avatar, created_at, updated_at
) ON public.university_doubt_answers TO authenticated;

-- 18.4 Function Execution Grants
GRANT EXECUTE ON FUNCTION public.is_platform_admin() TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_my_moderator_role() TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.can_access_study_note(text, uuid) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.can_access_stored_file(text, text, uuid) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.increment_downloads(text, text, text) TO anon, authenticated, service_role;

GRANT EXECUTE ON FUNCTION public.upsert_stored_file(text, text, text, text, text, text, bigint, boolean) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.toggle_study_note_upvote(text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.vote_forum_post(text, smallint) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.vote_forum_comment(text, smallint) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.toggle_community_vote(text, text, integer) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.toggle_program_enrollment(text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.toggle_university_follow(text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.accept_doubt_answer(text, text, text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.moderate_content_item(text, text, jsonb) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.resolve_quarantined_record(uuid, text, text, text) TO authenticated, service_role;

-- -----------------------------------------------------------------------------
-- 19. ROW LEVEL SECURITY ENABLEMENT & POLICIES (All 30 Tables)
-- -----------------------------------------------------------------------------
DO $$
DECLARE
  v_tbl text;
  v_pol RECORD;
BEGIN
  FOREACH v_tbl IN ARRAY ARRAY[
    'profiles', 'academic_information', 'user_settings_preferences', 'moderator_roles',
    'universities', 'departments', 'courses', 'academic_programs',
    'program_enrollments', 'university_follows',
    'stored_files', 'study_notes', 'study_note_upvotes', 'study_note_downloads',
    'forum_topics', 'forum_posts', 'forum_comments', 'forum_post_votes',
    'forum_comment_votes', 'forum_bookmarks', 'forum_reports',
    'program_discussions', 'program_discussion_comments', 'program_doubts', 'program_doubt_answers',
    'university_discussions', 'university_discussion_comments', 'university_doubts', 'university_doubt_answers',
    'community_item_votes', 'migration_orphan_quarantine'
  ]
  LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', v_tbl);
    FOR v_pol IN
      SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = v_tbl
    LOOP
      EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', v_pol.policyname, v_tbl);
    END LOOP;
  END LOOP;
END;
$$;

-- 19.1 Identity, Academic Profile & Settings Policies
CREATE POLICY profiles_select_owner_or_admin ON public.profiles
  FOR SELECT TO authenticated
  USING (id = auth.uid() OR public.is_platform_admin());

CREATE POLICY profiles_insert_owner ON public.profiles
  FOR INSERT TO authenticated
  WITH CHECK (id = auth.uid());

CREATE POLICY profiles_update_owner_or_admin ON public.profiles
  FOR UPDATE TO authenticated
  USING (id = auth.uid() OR public.is_platform_admin())
  WITH CHECK (id = auth.uid() OR public.is_platform_admin());

CREATE POLICY profiles_delete_admin ON public.profiles
  FOR DELETE TO authenticated
  USING (public.is_platform_admin());

CREATE POLICY academic_info_select_opt_in_or_owner ON public.academic_information
  FOR SELECT TO anon, authenticated
  USING (
    user_id = auth.uid()
    OR public.is_platform_admin()
    OR EXISTS (
      SELECT 1
      FROM public.user_settings_preferences usp
      WHERE usp.user_id = academic_information.user_id
        AND usp.public_profile = true
        AND usp.show_academic_info = true
    )
  );

CREATE POLICY academic_info_insert_owner ON public.academic_information
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid() OR public.is_platform_admin());

CREATE POLICY academic_info_update_owner ON public.academic_information
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid() OR public.is_platform_admin())
  WITH CHECK (user_id = auth.uid() OR public.is_platform_admin());

CREATE POLICY user_settings_all_owner ON public.user_settings_preferences
  FOR ALL TO authenticated
  USING (user_id = auth.uid() OR public.is_platform_admin())
  WITH CHECK (user_id = auth.uid() OR public.is_platform_admin());

-- 19.2 Catalog Policies (universities, departments, courses, academic_programs)
DO $$
DECLARE
  v_tbl text;
BEGIN
  FOREACH v_tbl IN ARRAY ARRAY['universities', 'departments', 'courses', 'academic_programs']
  LOOP
    EXECUTE format('CREATE POLICY %I_select_public ON public.%I FOR SELECT TO anon, authenticated USING (true)', v_tbl, v_tbl);
    EXECUTE format('CREATE POLICY %I_insert_auth ON public.%I FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL AND coalesce(created_by, auth.uid()) = auth.uid())', v_tbl, v_tbl);
    EXECUTE format('CREATE POLICY %I_update_owner_admin ON public.%I FOR UPDATE TO authenticated USING (created_by = auth.uid() OR public.is_platform_admin()) WITH CHECK (created_by = auth.uid() OR public.is_platform_admin())', v_tbl, v_tbl);
    EXECUTE format('CREATE POLICY %I_delete_admin ON public.%I FOR DELETE TO authenticated USING (public.is_platform_admin())', v_tbl, v_tbl);
  END LOOP;
END;
$$;

-- 19.3 Enrollments, Follows, Upvotes, Votes & Bookmarks (Owner-Only Ledger Access)
DO $$
DECLARE
  v_tbl text;
BEGIN
  FOREACH v_tbl IN ARRAY ARRAY['program_enrollments', 'university_follows', 'study_note_upvotes', 'forum_bookmarks']
  LOOP
    EXECUTE format('CREATE POLICY %I_select_owner ON public.%I FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.is_platform_admin())', v_tbl, v_tbl);
    EXECUTE format('CREATE POLICY %I_insert_owner ON public.%I FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid())', v_tbl, v_tbl);
    EXECUTE format('CREATE POLICY %I_delete_owner ON public.%I FOR DELETE TO authenticated USING (user_id = auth.uid() OR public.is_platform_admin())', v_tbl, v_tbl);
  END LOOP;

  FOREACH v_tbl IN ARRAY ARRAY['forum_post_votes', 'forum_comment_votes', 'community_item_votes']
  LOOP
    EXECUTE format('CREATE POLICY %I_select_owner ON public.%I FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.is_platform_admin())', v_tbl, v_tbl);
  END LOOP;
END;
$$;

-- 19.4 Stored Files & Study Notes Policies (Gated via can_access_stored_file & can_access_study_note)
CREATE POLICY stored_files_select_access ON public.stored_files
  FOR SELECT TO anon, authenticated
  USING (public.can_access_stored_file(storage_bucket, storage_path, auth.uid()));

CREATE POLICY stored_files_insert_owner ON public.stored_files
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL AND coalesce(uploaded_by, created_by, auth.uid()) = auth.uid());

CREATE POLICY stored_files_update_owner_admin ON public.stored_files
  FOR UPDATE TO authenticated
  USING (uploaded_by = auth.uid() OR created_by = auth.uid() OR public.is_platform_admin())
  WITH CHECK (uploaded_by = auth.uid() OR created_by = auth.uid() OR public.is_platform_admin());

CREATE POLICY stored_files_delete_owner_admin ON public.stored_files
  FOR DELETE TO authenticated
  USING (uploaded_by = auth.uid() OR created_by = auth.uid() OR public.is_platform_admin());

CREATE POLICY study_notes_select_access ON public.study_notes
  FOR SELECT TO anon, authenticated
  USING (public.can_access_study_note(id, auth.uid()));

CREATE POLICY study_notes_insert_owner ON public.study_notes
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL AND coalesce(author_id, uploader_id, auth.uid()) = auth.uid());

CREATE POLICY study_notes_update_owner_admin ON public.study_notes
  FOR UPDATE TO authenticated
  USING (author_id = auth.uid() OR uploader_id = auth.uid() OR public.is_platform_admin())
  WITH CHECK (author_id = auth.uid() OR uploader_id = auth.uid() OR public.is_platform_admin());

CREATE POLICY study_notes_delete_owner_admin ON public.study_notes
  FOR DELETE TO authenticated
  USING (author_id = auth.uid() OR uploader_id = auth.uid() OR public.is_platform_admin());

-- 19.5 Forum Policies (forum_topics, forum_posts, forum_comments, forum_reports)
CREATE POLICY forum_topics_select_public ON public.forum_topics
  FOR SELECT TO anon, authenticated USING (true);

CREATE POLICY forum_topics_write_admin ON public.forum_topics
  FOR ALL TO authenticated
  USING (public.is_platform_admin())
  WITH CHECK (public.is_platform_admin());

CREATE POLICY forum_posts_select_visible ON public.forum_posts
  FOR SELECT TO anon, authenticated
  USING (moderation_status = 'approved' OR author_id = auth.uid() OR public.is_platform_admin());

CREATE POLICY forum_posts_insert_unlocked ON public.forum_posts
  FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() IS NOT NULL
    AND coalesce(author_id, auth.uid()) = auth.uid()
    AND EXISTS (SELECT 1 FROM public.forum_topics ft WHERE ft.id = topic_id AND NOT ft.is_locked)
  );

CREATE POLICY forum_posts_update_owner_admin ON public.forum_posts
  FOR UPDATE TO authenticated
  USING (author_id = auth.uid() OR public.is_platform_admin())
  WITH CHECK (author_id = auth.uid() OR public.is_platform_admin());

CREATE POLICY forum_posts_delete_owner_admin ON public.forum_posts
  FOR DELETE TO authenticated
  USING (author_id = auth.uid() OR public.is_platform_admin());

CREATE POLICY forum_comments_select_visible ON public.forum_comments
  FOR SELECT TO anon, authenticated
  USING (moderation_status = 'approved' OR author_id = auth.uid() OR public.is_platform_admin());

CREATE POLICY forum_comments_insert_unlocked ON public.forum_comments
  FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() IS NOT NULL
    AND coalesce(author_id, auth.uid()) = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.forum_posts fp
      WHERE fp.id = post_id AND NOT fp.is_locked AND fp.moderation_status = 'approved'
    )
  );

CREATE POLICY forum_comments_update_owner_admin ON public.forum_comments
  FOR UPDATE TO authenticated
  USING (author_id = auth.uid() OR public.is_platform_admin())
  WITH CHECK (author_id = auth.uid() OR public.is_platform_admin());

CREATE POLICY forum_comments_delete_owner_admin ON public.forum_comments
  FOR DELETE TO authenticated
  USING (author_id = auth.uid() OR public.is_platform_admin());

CREATE POLICY forum_reports_select_owner_admin ON public.forum_reports
  FOR SELECT TO authenticated
  USING (reporter_id = auth.uid() OR public.is_platform_admin());

CREATE POLICY forum_reports_insert_owner ON public.forum_reports
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL AND coalesce(reporter_id, auth.uid()) = auth.uid());

-- 19.6 Program & University Community Policies (Tables 22 - 29)
DO $$
DECLARE
  v_tbl text;
BEGIN
  FOREACH v_tbl IN ARRAY ARRAY[
    'program_discussions', 'program_doubts', 'program_doubt_answers',
    'university_discussions', 'university_doubts', 'university_doubt_answers'
  ]
  LOOP
    EXECUTE format('CREATE POLICY %I_select_visible ON public.%I FOR SELECT TO anon, authenticated USING (moderation_status = ''approved'' OR author_id = auth.uid() OR public.is_platform_admin())', v_tbl, v_tbl);
    EXECUTE format('CREATE POLICY %I_insert_owner ON public.%I FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL AND coalesce(author_id, auth.uid()) = auth.uid())', v_tbl, v_tbl);
    EXECUTE format('CREATE POLICY %I_update_owner_admin ON public.%I FOR UPDATE TO authenticated USING (author_id = auth.uid() OR public.is_platform_admin()) WITH CHECK (author_id = auth.uid() OR public.is_platform_admin())', v_tbl, v_tbl);
    EXECUTE format('CREATE POLICY %I_delete_owner_admin ON public.%I FOR DELETE TO authenticated USING (author_id = auth.uid() OR public.is_platform_admin())', v_tbl, v_tbl);
  END LOOP;
END;
$$;

CREATE POLICY prog_disc_comments_select_visible ON public.program_discussion_comments
  FOR SELECT TO anon, authenticated
  USING (moderation_status = 'approved' OR author_id = auth.uid() OR public.is_platform_admin());

CREATE POLICY prog_disc_comments_insert_unlocked ON public.program_discussion_comments
  FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() IS NOT NULL
    AND coalesce(author_id, auth.uid()) = auth.uid()
    AND EXISTS (SELECT 1 FROM public.program_discussions pd WHERE pd.id = discussion_id AND NOT pd.is_locked)
  );

CREATE POLICY prog_disc_comments_update_owner_admin ON public.program_discussion_comments
  FOR UPDATE TO authenticated
  USING (author_id = auth.uid() OR public.is_platform_admin())
  WITH CHECK (author_id = auth.uid() OR public.is_platform_admin());

CREATE POLICY prog_disc_comments_delete_owner_admin ON public.program_discussion_comments
  FOR DELETE TO authenticated
  USING (author_id = auth.uid() OR public.is_platform_admin());

CREATE POLICY uni_disc_comments_select_visible ON public.university_discussion_comments
  FOR SELECT TO anon, authenticated
  USING (moderation_status = 'approved' OR author_id = auth.uid() OR public.is_platform_admin());

CREATE POLICY uni_disc_comments_insert_unlocked ON public.university_discussion_comments
  FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() IS NOT NULL
    AND coalesce(author_id, auth.uid()) = auth.uid()
    AND EXISTS (SELECT 1 FROM public.university_discussions ud WHERE ud.id = discussion_id AND NOT ud.is_locked)
  );

CREATE POLICY uni_disc_comments_update_owner_admin ON public.university_discussion_comments
  FOR UPDATE TO authenticated
  USING (author_id = auth.uid() OR public.is_platform_admin())
  WITH CHECK (author_id = auth.uid() OR public.is_platform_admin());

CREATE POLICY uni_disc_comments_delete_owner_admin ON public.university_discussion_comments
  FOR DELETE TO authenticated
  USING (author_id = auth.uid() OR public.is_platform_admin());

-- -----------------------------------------------------------------------------
-- 20. DUAL-BUCKET STORAGE ARCHITECTURE & STORAGE RLS POLICIES (Section 6.2 & 6.3)
-- -----------------------------------------------------------------------------
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES
  (
    'avatars',
    'avatars',
    true,
    2097152,
    ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
  ),
  (
    'study-materials',
    'study-materials',
    true,
    5242880,
    ARRAY[
      'application/pdf', 'image/jpeg', 'image/png', 'image/webp',
      'text/plain', 'text/markdown', 'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-powerpoint',
      'application/vnd.openxmlformats-officedocument.presentationml.presentation'
    ]
  ),
  (
    'study-materials-restricted',
    'study-materials-restricted',
    false,
    5242880,
    ARRAY[
      'application/pdf', 'image/jpeg', 'image/png', 'image/webp',
      'text/plain', 'text/markdown', 'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-powerpoint',
      'application/vnd.openxmlformats-officedocument.presentationml.presentation'
    ]
  )
ON CONFLICT (id) DO UPDATE
SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- Drop legacy Xeusar storage policies before creating canonical v4 policies
DO $$
DECLARE
  v_pol RECORD;
BEGIN
  FOR v_pol IN
    SELECT policyname
    FROM pg_policies
    WHERE schemaname = 'storage'
      AND tablename = 'objects'
      AND (
        policyname ILIKE '%xeusar%'
        OR policyname ILIKE '%avatar%'
        OR policyname ILIKE '%study_material%'
        OR policyname ILIKE '%study-material%'
      )
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON storage.objects', v_pol.policyname);
  END LOOP;
END;
$$;

CREATE POLICY xeusar_storage_select_policy ON storage.objects
  FOR SELECT TO anon, authenticated
  USING (
    bucket_id IN ('avatars', 'study-materials', 'study-materials-restricted')
    AND public.can_access_stored_file(bucket_id, name, auth.uid())
  );

CREATE POLICY xeusar_storage_insert_owner_folder ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id IN ('avatars', 'study-materials', 'study-materials-restricted')
    AND auth.uid() IS NOT NULL
    AND (
      (storage.foldername(name))[1] = auth.uid()::text
      OR (
        bucket_id IN ('study-materials', 'study-materials-restricted')
        AND (storage.foldername(name))[1] = 'notes'
        AND (storage.foldername(name))[2] = auth.uid()::text
      )
    )
  );

CREATE POLICY xeusar_storage_update_owner_folder ON storage.objects
  FOR UPDATE TO authenticated
  USING (
    bucket_id IN ('avatars', 'study-materials', 'study-materials-restricted')
    AND (
      (storage.foldername(name))[1] = auth.uid()::text
      OR (
        bucket_id IN ('study-materials', 'study-materials-restricted')
        AND (storage.foldername(name))[1] = 'notes'
        AND (storage.foldername(name))[2] = auth.uid()::text
      )
      OR public.is_platform_admin()
    )
  )
  WITH CHECK (
    bucket_id IN ('avatars', 'study-materials', 'study-materials-restricted')
    AND (
      (storage.foldername(name))[1] = auth.uid()::text
      OR (
        bucket_id IN ('study-materials', 'study-materials-restricted')
        AND (storage.foldername(name))[1] = 'notes'
        AND (storage.foldername(name))[2] = auth.uid()::text
      )
      OR public.is_platform_admin()
    )
  );

CREATE POLICY xeusar_storage_delete_owner_folder ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id IN ('avatars', 'study-materials', 'study-materials-restricted')
    AND (
      (storage.foldername(name))[1] = auth.uid()::text
      OR (
        bucket_id IN ('study-materials', 'study-materials-restricted')
        AND (storage.foldername(name))[1] = 'notes'
        AND (storage.foldername(name))[2] = auth.uid()::text
      )
      OR public.is_platform_admin()
    )
  );

-- -----------------------------------------------------------------------------
-- 21. AUTOMATED POST-MIGRATION ASSERTIONS (Section 10 Verification Gate)
-- -----------------------------------------------------------------------------
DO $$
DECLARE
  v_rls_off integer;
  v_bad_privs integer;
  v_pages_type text;
BEGIN
  SELECT count(*) INTO v_rls_off
  FROM pg_tables
  WHERE schemaname = 'public'
    AND tablename IN (
      'profiles', 'academic_information', 'user_settings_preferences', 'moderator_roles',
      'universities', 'departments', 'courses', 'academic_programs',
      'program_enrollments', 'university_follows',
      'stored_files', 'study_notes', 'study_note_upvotes', 'study_note_downloads',
      'forum_topics', 'forum_posts', 'forum_comments', 'forum_post_votes',
      'forum_comment_votes', 'forum_bookmarks', 'forum_reports',
      'program_discussions', 'program_discussion_comments', 'program_doubts', 'program_doubt_answers',
      'university_discussions', 'university_discussion_comments', 'university_doubts', 'university_doubt_answers',
      'community_item_votes', 'migration_orphan_quarantine'
    )
    AND rowsecurity = false;

  IF v_rls_off > 0 THEN
    RAISE EXCEPTION 'Post-migration assertion failed: % tables do not have RLS enabled', v_rls_off;
  END IF;

  SELECT data_type INTO v_pages_type
  FROM information_schema.columns
  WHERE table_schema = 'public' AND table_name = 'study_notes' AND column_name = 'pages';

  IF v_pages_type <> 'jsonb' THEN
    RAISE EXCEPTION 'Post-migration assertion failed: study_notes.pages is %, expected jsonb', v_pages_type;
  END IF;

  SELECT count(*) INTO v_bad_privs
  FROM information_schema.column_privileges
  WHERE table_schema = 'public'
    AND grantee IN ('anon', 'authenticated')
    AND privilege_type = 'UPDATE'
    AND (
      (table_name = 'profiles' AND column_name IN ('role', 'points', 'email'))
      OR (table_name = 'academic_information' AND column_name = 'enrollment_verified')
      OR (table_name = 'study_notes' AND column_name IN ('upvotes', 'downloads', 'views_count', 'rating', 'is_verified', 'moderation_status'))
      OR (table_name = 'forum_posts' AND column_name IN ('upvotes', 'downvotes', 'score', 'comments_count', 'views_count', 'is_pinned', 'is_locked', 'moderation_status'))
      OR (table_name = 'forum_comments' AND column_name IN ('upvotes', 'downvotes', 'score', 'is_accepted', 'moderation_status'))
    );

  IF v_bad_privs > 0 THEN
    RAISE EXCEPTION 'Post-migration assertion failed: % privileged columns still have UPDATE granted to anon/authenticated', v_bad_privs;
  END IF;
END;
$$;

COMMIT;
