# Xeusar — Final Technical Review and Implementation Plan v4 (With PostgREST Edge-Case Hardening)

## Executive Summary & Guiding Principles

This document is the finalized **Revision v4** of the Xeusar Supabase Technical Review and Implementation Plan, incorporating the 6 critical PostgreSQL/PostgREST runtime edge-case fixes (`Traps 1–6`) and the exact 4-part SQL migration and frontend service alignments.

1. **Preserve the Existing Project & User Data**:
   - Zero UI redesign, zero feature removal, and zero truncation or destructive overwrite of user data.
   - All schema upgrades are idempotent and assume the database may be in any intermediate state (fresh database, `20261102*` applied, partially applied `20261104000000`, or mixed legacy/canonical tables).
2. **Defense-in-Depth Privileged-Column Architecture (Zero Custom Session Flags)**:
   - Custom PostgreSQL session settings (`set_config` / `current_setting('xeusar.internal_sync', true)`) are **completely eliminated** as an authorization mechanism.
   - Privileged columns (`points`, `role`, `upvotes`, `downvotes`, `downloads`, `views_count`, `comments_count`, `posts_count`, `enrolled_count`, `followers_count`, `courses_count`, `is_verified`, `is_pinned`, `is_locked`, `is_resolved`, `is_accepted`, `moderation_status`) are protected simultaneously by:
     1. **Upsert-Safe Column-Level SQL Grants (`Trap 1 Fix`)**: `REVOKE UPDATE ON TABLE ... FROM anon, authenticated` followed by explicit `GRANT UPDATE (...)` that includes primary-key/conflict/identity columns (`id`, `user_id`, `content_hash`, `storage_path`, `storage_bucket`, `uploaded_by`, `created_by`, `author_id`, `uploader_id`, `created_at`) so PostgREST `.upsert()` payloads pass SQL privilege checks, while excluding counters, roles, and moderation flags.
     2. **`SECURITY INVOKER` Before-Insert/Update Triggers (`enforce_privileged_columns()`)**: Enforce initial counter zeroes and caller ownership on `INSERT`, and on `UPDATE` silently preserve immutable identity columns (`NEW.id := OLD.id`, `NEW.author_id := OLD.author_id`, `NEW.created_at := OLD.created_at`) while raising `42501` if an unprivileged caller attempts to alter any privileged counter or moderation flag.
     3. **Narrow `SECURITY DEFINER` RPCs Owned by `postgres`**: Set `search_path = pg_catalog, public`, validate target visibility and caller `auth.uid()`, mutate the underlying ledger table first, check `GET DIAGNOSTICS v_rows = ROW_COUNT`, and update only the specific counter column.
3. **Conservative Data Recovery & Quarantine (Classes A, B, and C)**:
   - The migration **never** fabricates unverified `academic_programs`, `universities`, or `forum_topics` to satisfy foreign keys, and **never** silently flattens broken comment parent pointers (`parent_id = NULL`).
   - All 8 standard frontend `forum_topics` (`general`, `computer-science`, `mathematics`, `engineering`, `exam-prep`, `career-internships`, `university-life`, `announcements`) are seeded in Class A (`Trap 6 Fix`), and any remaining orphaned rows are preserved intact inside `public.migration_orphan_quarantine` (`Class B`) before constraints are attached, with dedicated administrator resolution RPCs (`Class C`).

---

## 1. Six Critical PostgreSQL / PostgREST Edge Cases Resolved in v4

| Edge Case | Root Cause | Resolution Implemented in v4 SQL & Frontend |
|---|---|---|
| **Trap 1: PostgREST `.upsert()` vs. Column-Level `REVOKE UPDATE`** | PostgREST translates `.upsert(payload, { onConflict })` into `INSERT ... ON CONFLICT DO UPDATE SET col = EXCLUDED.col` for every key in the JSON payload. PostgreSQL checks column-level `UPDATE` privileges before firing `BEFORE UPDATE` triggers. | Include PK/conflict/immutable identity columns (`id`, `user_id`, `content_hash`, `sha256_hash`, `storage_bucket`, `storage_path`, `uploaded_by`, `created_by`, `author_id`, `uploader_id`, `created_at`) in `GRANT UPDATE (...)` for tables that use `.upsert()`, while `enforce_privileged_columns()` (`BEFORE UPDATE`) locks them to `OLD.<col>`. Counter, role, and moderation columns (`upvotes`, `downloads`, `points`, `role`, `is_verified`, `is_pinned`, `is_locked`, `moderation_status`) remain strictly excluded from `GRANT UPDATE`. |
| **Trap 2: Cross-User Deduplication RLS Failure on `public.stored_files`** | When Student B uploads a PDF with the same `content_hash` as Student A, a client `.upsert()` on `stored_files` triggers `ON CONFLICT (content_hash) DO UPDATE` against Student A's row and fails `stored_files` `UPDATE` RLS (`42501`), or risks downgrading a public file to restricted. | Added `public.upsert_stored_file(...)` (`SECURITY DEFINER`, owned by `postgres`), which safely increments `reference_count` on `content_hash` conflict without failing RLS and never downgrades an existing public file in `study-materials` to `study-materials-restricted`. Updated `resourceService.ts` to call `supabase.rpc('upsert_stored_file', ...)`. |
| **Trap 3: Double-Counting & Privilege Failure in `study_note_upvotes`** | A `SECURITY INVOKER` trigger on `study_note_upvotes` runs as `authenticated` on direct client inserts and fails to update `study_notes.upvotes`, whereas having both the trigger and `toggle_study_note_upvote` increment `upvotes` double-counts by `+2`. | Made `public.sync_study_note_upvotes_counter()` a `SECURITY DEFINER` function owned by `postgres`, and made it the **single source of truth** that increments/decrements `study_notes.upvotes` on `AFTER INSERT OR DELETE ON public.study_note_upvotes`. `toggle_study_note_upvote(p_note_id)` only inserts/deletes on `study_note_upvotes` and reads back `study_notes.upvotes`. |
| **Trap 4: Preventing RLS Recursion in `can_access_study_note` & `can_access_stored_file`** | `study_notes` `SELECT` policy calls `can_access_study_note`, which queries `study_notes` and `stored_files`, while `stored_files` `SELECT` policy calls `can_access_stored_file`, which queries `study_notes`. | Both `can_access_study_note` and `can_access_stored_file` are `SECURITY DEFINER` owned by `postgres` (which has `BYPASSRLS` in Supabase), and `FORCE ROW LEVEL SECURITY` is never enabled on `study_notes` or `stored_files`. |
| **Trap 5: String Literal Typo in `program_enrollments.role` Check Constraint** | Earlier draft had `' alumnus'` with a leading space. | Fixed constraint in Part 1 (`Section 3`): `CONSTRAINT program_enrollments_role_chk CHECK (role IN ('student', 'mentor', 'alumnus'))`. |
| **Trap 6: Missing `forum_topics` Seed Rows Before `forum_posts_topic_id_fkey`** | Existing `forum_posts` referencing standard frontend topics other than `'general'` would fail `forum_posts_topic_id_fkey` (`ON DELETE RESTRICT`) if only `'general'` were seeded. | Part 2 (`Section 11.3`) seeds all 8 canonical frontend `forum_topics` (`general`, `computer-science`, `mathematics`, `engineering`, `exam-prep`, `career-internships`, `university-life`, `announcements`), and Part 2 (`Section 12.2`) quarantines any remaining `forum_posts` with unresolvable `topic_id` into `migration_orphan_quarantine` (`CLASS_B_QUARANTINED`) before attaching `forum_posts_topic_id_fkey`. |

---

## 2. Final Database Architecture

```
+---------------------------------------------------------------------------------------------------+
|                                  XEUSAR CLIENT (React / Vite SPA)                                 |
|  publicSyncRelay.ts | resourceService.ts | profileService.ts | forumService.ts | programStore.ts  |
+-------------------------------------------------+-------------------------------------------------+
                                                  |
                         PostgREST / Supabase Auth / Realtime / Storage API
                                                  |
+-------------------------------------------------v-------------------------------------------------+
|                         SUPABASE POSTGRESQL & STORAGE SECURITY BOUNDARY                           |
|                                                                                                   |
|  +-------------------------------------------+  +----------------------------------------------+  |
|  | 1. PUBLIC PLATFORM CATALOG & DISCUSSIONS  |  | 2. PRIVATE / OWNER-ONLY USER & LEDGER DATA   |  |
|  | (Public SELECT where published/approved;  |  | (Strict Owner-Only SELECT or Zero Direct     |  |
|  |  Upsert-Safe Column-Level GRANT UPDATE)   |  |  Table Access; Aggregate Counts Public)      |  |
|  |                                           |  |                                              |  |
|  | - public_student_profiles (VIEW)          |  | - profiles (Full row: owner/admin SELECT;    |  |
|  | - universities, departments, courses      |  |   email never exposed in public view)        |  |
|  | - academic_programs                       |  | - academic_information (Owner or explicit    |  |
|  | - study_notes, stored_files               |  |   opt-in show_academic_info = true)          |  |
|  | - forum_topics, forum_posts,              |  | - user_settings_preferences (Owner-only)     |  |
|  |   forum_comments                          |  | - moderator_roles (ZERO client table grants; |  |
|  | - program_discussions,                    |  |   queried only via get_my_moderator_role())  |  |
|  |   program_discussion_comments             |  | - study_note_upvotes (Owner SELECT only)     |  |
|  | - program_doubts, program_doubt_answers   |  | - study_note_downloads (Zero direct client   |  |
|  | - university_discussions,                 |  |   table access; RPC-only write)              |  |
|  |   university_discussion_comments          |  | - forum_post_votes, forum_comment_votes      |  |
|  | - university_doubts,                      |  | - community_item_votes (Owner SELECT only)   |  |
|  |   university_doubt_answers                |  | - program_enrollments, university_follows    |  |
|  |                                           |  | - forum_bookmarks, forum_reports             |  |
|  +-------------------------------------------+  +----------------------------------------------+  |
|                                                                                                   |
|  +---------------------------------------------------------------------------------------------+  |
|  | 3. CONTROLLED MUTATION & PRIVILEGED-COLUMN LAYER (SECURITY DEFINER, Owner = postgres)       |  |
|  | - upsert_stored_file(...)                     - toggle_study_note_upvote(p_note_id)         |  |
|  | - increment_downloads(note_id, row_id, hash)  - vote_forum_post(p_post_id, p_vote_type)     |  |
|  | - vote_forum_comment(p_comment_id, p_type)    - toggle_community_vote(p_type, p_id, p_vote) |  |
|  | - toggle_program_enrollment(p_program_id)     - toggle_university_follow(p_university_id)   |  |
|  | - accept_doubt_answer(p_scope, p_id, p_ans)   - moderate_content_item(p_table, p_id, patch) |  |
|  | - can_access_study_note(p_note_id, p_user_id) - can_access_stored_file(p_bucket, p_path)    |  |
|  +---------------------------------------------------------------------------------------------+  |
|                                                                                                   |
|  +-------------------------------------------+  +----------------------------------------------+  |
|  | 4. DUAL-BUCKET STORAGE ARCHITECTURE       |  | 5. CONSERVATIVE QUARANTINE & AUDIT LAYER     |  |
|  | - avatars (public=true, 2MB, images)      |  | - migration_orphan_quarantine (Admin-only    |  |
|  | - study-materials (public=true, 5MB,      |  |   table storing Class B orphaned rows with   |  |
|  |   strictly public/unrestricted notes)     |  |   full JSONB payload & resolution status)    |  |
|  | - study-materials-restricted              |  | - resolve_quarantined_record() (Class C      |  |
|  |   (public=false, 5MB, RLS-gated via       |  |   admin RPC to restore or archive records)   |  |
|  |   can_access_stored_file + 300s URLs)     |  |                                              |  |
|  +-------------------------------------------+  +----------------------------------------------+  |
+---------------------------------------------------------------------------------------------------+
```

---

## 3. Complete Table Inventory (30 Domain & Community Tables + 1 Quarantine Table + 1 Public View)

1. **`public.profiles`**: `id` (`uuid PK`), `username` (`text UNIQUE`), `display_name` (`text NOT NULL DEFAULT 'Student'`), `full_name` (`text NOT NULL DEFAULT 'Student'`), `avatar_url`, `bio`, `email`, `role` (**Privileged**), `points` (**Privileged**), `setup_completed` (`boolean NOT NULL DEFAULT false`), `created_at`, `updated_at`.
2. **`public.moderator_roles`**: `user_id` (`uuid PK`), `role` (`'moderator' | 'admin' | 'super_admin'`), `assigned_by`, `notes`, `created_at`, `updated_at`. Zero direct client access; queried via `public.get_my_moderator_role()`.
3. **`public.academic_information`**: `id` (`uuid PK`), `user_id` (`uuid UNIQUE`), `university_id` (`text FK`), `program_id` (`text FK`), `education_level`, `academic_stage`, `institution_name`, `degree_program`, `major`, `field_of_study`, `academic_year`, `semester`, `current_semester`, `student_id_number`, `graduation_year`, `enrollment_verified` (**Privileged**), `created_at`, `updated_at`.
4. **`public.user_settings_preferences`**: `id` (`uuid PK`), `user_id` (`uuid UNIQUE`), `account_settings`, `privacy_settings`, `notification_settings`, `appearance_settings`, `preferred_subjects`, `study_preferences`, `preferred_language`, `theme_preference`, `theme`, `content_discovery_preferences`, `email_notifications`, `forum_notifications`, `resource_alerts`, `public_profile` (`DEFAULT true`), `show_academic_info` (`DEFAULT false`, strict opt-in), `created_at`, `updated_at`.
5. **`public.universities`**: `id` (`text PK`), `name`, `short_name`, `slug`, `location`, `country`, `website`, `description`, `logo_url`, `banner_url`, `type`, `access_scope` (`'public' | 'members_only' | 'verified_members_only'`), `is_verified` (**Privileged**), `followers_count` (**Privileged**), `courses_count` (**Privileged**), `resources_count` (**Privileged**), `created_by`, `created_at`, `updated_at`.
6. **`public.departments`**: `id` (`text PK`), `university_id` (`text FK`), `name`, `code`, `description`, `faculty_head`, `courses_count` (**Privileged**), `created_by`, `created_at`, `updated_at`.
7. **`public.courses`**: `id` (`text PK`), `university_id` (`text FK`), `department_id` (`text FK`), `code`, `name`, `title`, `description`, `semester`, `credits`, `instructor`, `resources_count` (**Privileged**), `created_by`, `created_at`, `updated_at`.
8. **`public.academic_programs`**: `id` (`text PK`), `university_id` (`text FK`), `title`, `name`, `code`, `category`, `level`, `duration`, `description`, `syllabus_summary`, `career_paths` (`jsonb`), `subjects` (`jsonb`), `access_scope` (`'public' | 'enrolled_only'`), `is_verified` (**Privileged**), `enrolled_count` (**Privileged**), `discussions_count` (**Privileged**), `doubts_count` (**Privileged**), `created_by`, `created_at`, `updated_at`.
9. **`public.program_enrollments`**: `id` (`uuid PK`), `program_id` (`text FK`), `user_id` (`uuid FK`), `role` (`CHECK (role IN ('student', 'mentor', 'alumnus'))` — **Trap 5 Fixed**), `created_at`, `UNIQUE (program_id, user_id)`.
10. **`public.university_follows`**: `id` (`uuid PK`), `university_id` (`text FK`), `user_id` (`uuid FK`), `created_at`, `UNIQUE (university_id, user_id)`.
11. **`public.stored_files`**: `id` (`text PK`), `content_hash` (`text NOT NULL UNIQUE`), `sha256_hash` (`text NOT NULL UNIQUE`), `storage_bucket` (`'study-materials' | 'study-materials-restricted'`), `storage_path`, `file_url`, `original_filename`, `mime_type`, `size_bytes` (`<= 5242880`), `is_public`, `uploaded_by`, `created_by`, `reference_count` (**Privileged**), `created_at`, `updated_at`.
12. **`public.study_notes`**: `id` (`text PK`), `title`, `subject`, `course_code`, `course_id`, `university`, `university_id`, `program_id`, `department`, `department_id`, `semester`, `academic_year`, `professor`, `note_type`, `resource_type`, `description`, `summary`, `content`, `tags` (`text[]`), `pages` (`jsonb NOT NULL DEFAULT '[]'::jsonb`), `page_count` (`integer NOT NULL DEFAULT 1`), `file_url`, `storage_bucket`, `storage_path`, `file_name`, `file_type`, `mime_type`, `file_size`, `file_size_bytes`, `content_hash`, `file_sha256`, `file_id`, `preview_url`, `author_id`, `uploader_id`, `author_name`, `author_avatar`, `author_university`, `upvotes` (**Privileged**), `downloads` (**Privileged**), `views_count` (**Privileged**), `rating` (**Privileged**), `is_verified` (**Privileged**), `is_public`, `is_published`, `is_restricted`, `moderation_status` (**Privileged**), `created_at`, `updated_at`.
13. **`public.study_note_upvotes`**: `id` (`uuid PK`), `note_id` (`text FK`), `user_id` (`uuid FK`), `created_at`, `UNIQUE (note_id, user_id)`.
14. **`public.study_note_downloads`**: `id` (`uuid PK`), `note_id` (`text FK`), `user_id` (`uuid FK NULL`), `actor_fingerprint` (`text NOT NULL`), `downloaded_date` (`date NOT NULL`), `created_at`, with partial unique indexes `idx_study_note_downloads_auth_uniq` and `idx_study_note_downloads_anon_daily_uniq`.
15. **`public.forum_topics`**: `id` (`text PK`), `name`, `title`, `slug` (`UNIQUE`), `description`, `icon`, `color`, `category`, `sort_order`, `posts_count` (**Privileged**), `is_locked` (**Privileged**), `created_by`, `created_at`, `updated_at`.
16. **`public.forum_posts`**: `id` (`text PK`), `topic_id` (`text FK ON DELETE RESTRICT`), `title`, `content`, `author_id`, `author_name`, `author_username`, `author_avatar`, `author_role` (**Privileged**), `tags`, `upvotes` (**Privileged**), `downvotes` (**Privileged**), `score` (**Privileged**), `comments_count` (**Privileged**), `views_count` (**Privileged**), `is_pinned` (**Privileged**), `is_locked` (**Privileged**), `is_resolved`, `moderation_status` (**Privileged**), `last_activity_at`, `created_at`, `updated_at`.
17. **`public.forum_comments`**: `id` (`text PK`), `post_id` (`text FK`), `parent_id` (`text FK`), `content`, `author_id`, `author_name`, `author_username`, `author_avatar`, `author_role` (**Privileged**), `upvotes` (**Privileged**), `downvotes` (**Privileged**), `score` (**Privileged**), `is_accepted` (**Privileged**), `moderation_status` (**Privileged**), `created_at`, `updated_at`.
18. **`public.forum_post_votes`**: `id` (`uuid PK`), `post_id` (`text FK`), `user_id` (`uuid FK`), `vote_type` (`-1 | 1`), `created_at`, `updated_at`, `UNIQUE (post_id, user_id)`.
19. **`public.forum_comment_votes`**: `id` (`uuid PK`), `comment_id` (`text FK`), `user_id` (`uuid FK`), `vote_type` (`-1 | 1`), `created_at`, `updated_at`, `UNIQUE (comment_id, user_id)`.
20. **`public.forum_bookmarks`**: `id` (`uuid PK`), `post_id` (`text FK`), `user_id` (`uuid FK`), `created_at`, `UNIQUE (post_id, user_id)`.
21. **`public.forum_reports`**: `id` (`uuid PK`), `target_type`, `target_id`, `post_id`, `comment_id`, `reporter_id`, `reason`, `details`, `status` (**Privileged**), `reviewed_by` (**Privileged**), `reviewed_at` (**Privileged**), `created_at`.
22–29. **Program & University Community Tables**: `program_discussions`, `program_discussion_comments`, `program_doubts`, `program_doubt_answers`, `university_discussions`, `university_discussion_comments`, `university_doubts`, `university_doubt_answers`.
30. **`public.community_item_votes`**: `id` (`uuid PK`), `item_type`, `item_id`, `user_id`, `vote_type` (`-1 | 1`), `created_at`, `updated_at`, `UNIQUE (item_type, item_id, user_id)`.
31. **`public.migration_orphan_quarantine`**: `quarantine_id` (`uuid PK`), `source_table`, `source_pk`, `missing_fk_column`, `missing_fk_value`, `target_table`, `quarantine_class` (`'CLASS_B_QUARANTINED' | 'CLASS_C_ADMIN_RESOLVED' | 'CLASS_C_ARCHIVED'`), `reason`, `row_payload` (`jsonb`), `quarantined_at`, `resolved_at`, `resolved_by`, `resolution_notes`.
32. **View `public.public_student_profiles`**: Privacy-masked view over `profiles`, `user_settings_preferences`, and `academic_information`.

---

## 4. Implementation Deliverables & Execution Steps (Upon Approval)

1. **Write Complete 4-Part SQL to `supabase/migrations/20261108000000_xeusar_complete_security_and_sync_repair.sql` and `supabase/schema.sql`**:
   - Concatenate Parts 1, 2, 3, and 4 cleanly into both `supabase/migrations/20261108000000_xeusar_complete_security_and_sync_repair.sql` and `supabase/schema.sql`.
2. **Apply Phase 3 Frontend TypeScript Alignments**:
   - **`src/lib/profileService.ts`**: Replace direct `.from('moderator_roles').select('role')` queries with `supabase.rpc('get_my_moderator_role')`.
   - **`src/lib/resourceService.ts`**: Route restricted/private study notes (`is_restricted` or `is_public === false` or `is_published === false`) to `'study-materials-restricted'`, clear public `file_url` for restricted notes, and register `stored_files` via `supabase.rpc('upsert_stored_file', ...)` (with graceful fallback) so cross-user uploads of identical PDFs never trigger RLS errors.
   - **`src/lib/pdfViewerService.ts`**: Resolve `study-materials-restricted` or `is_restricted` notes via 300-second signed URLs (`supabase.storage.from('study-materials-restricted').createSignedUrl(storagePath, 300)`).
3. **Verify Build & Lint**:
   - Run `compile_applet` and `lint_applet` to ensure zero TypeScript or ESLint issues.
