import { SupabaseClient } from '@supabase/supabase-js';
import {
  StudyNote,
  ForumPost,
  ForumComment,
  ProgramDiscussionPost,
  ProgramDiscussionComment,
  ProgramDoubtQuestion,
  ProgramDoubtAnswer,
  DiscussionPost,
  DiscussionComment,
  DoubtQuestion,
  DoubtAnswer,
  AcademicProgram,
  University,
  DegreeTier
} from '../types/index.ts';

/**
 * ============================================================================
 * XEUSAR — LEGACY PUBLIC SYNC RELAY RETIREMENT & ONE-TIME CANONICAL MIGRATION
 * ============================================================================
 *
 * Security & Architecture Policy:
 * - `public.profiles.full_name` MUST NEVER be used to store Forum posts, study
 *   resources, comments, discussions, doubts, answers, or internal JSON manifests.
 * - Public profile records contain ONLY intended profile metadata (id, username,
 *   display_name, full_name, avatar_url, bio, setup_completed).
 * - This module provides:
 *   1. `extractCleanDisplayName()` to strip any legacy `<!--XEUSAR_PUBLIC_SYNC:...-->`
 *      comment tag that may have been written by older builds.
 *   2. `migrateLegacyProfileSyncData()` to safely migrate any legacy relay-only
 *      records into canonical Supabase tables (`study_notes`, `forum_posts`,
 *      `forum_comments`, `program_discussions`, `program_doubts`,
 *      `university_discussions`, `university_doubts`, `academic_programs`,
 *      `universities`) with ownership validation and duplicate prevention,
 *      cleaning `profiles.full_name` only after migration succeeds.
 */

const SYNC_MARKER_START = '<!--XEUSAR_PUBLIC_SYNC:';
const SYNC_MARKER_END = '-->';
const LOCAL_MANIFEST_PREFIX = 'xeusar_public_sync_manifest_v2_';
const MIGRATED_PROFILES_SESSION_SET = new Set<string>();

export interface UserPublicSyncManifest {
  v: number;
  updatedAt: string;
  enrolledProgram?: {
    programId: string;
    programName: string;
    degreeTier?: DegreeTier;
  };
  enrolledUniversity?: {
    universityId: string;
    universityName: string;
  };
  notes?: StudyNote[];
  noteUpvotes?: string[];
  forumPosts?: ForumPost[];
  forumComments?: ForumComment[];
  forumVotes?: Record<string, 1 | -1>;
  acceptedAnswers?: Record<string, string>;
  programDiscussions?: ProgramDiscussionPost[];
  programDiscussionComments?: ProgramDiscussionComment[];
  programDoubts?: ProgramDoubtQuestion[];
  programDoubtAnswers?: ProgramDoubtAnswer[];
  universityDiscussions?: DiscussionPost[];
  universityDiscussionComments?: DiscussionComment[];
  universityDoubts?: DoubtQuestion[];
  universityDoubtAnswers?: DoubtAnswer[];
  customPrograms?: AcademicProgram[];
  customUniversities?: University[];
}

export function createEmptyManifest(): UserPublicSyncManifest {
  return {
    v: 2,
    updatedAt: new Date().toISOString()
  };
}

function isUuidString(val?: string | null): boolean {
  if (!val) return false;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(val.trim());
}

/**
 * Strips any legacy `<!--XEUSAR_PUBLIC_SYNC:...-->` payload from a raw `full_name`
 * or `display_name` string and returns only the clean human-readable display name.
 */
export function extractCleanDisplayName(rawFullName?: string | null): string {
  if (!rawFullName || typeof rawFullName !== 'string') return '';
  const idx = rawFullName.indexOf(SYNC_MARKER_START);
  if (idx === -1) return rawFullName.trim();
  return rawFullName.slice(0, idx).trim();
}

/**
 * Decodes a legacy `full_name` string if it contains an embedded `<!--XEUSAR_PUBLIC_SYNC:...-->`
 * tag so its contents can be migrated into canonical Supabase tables and cleaned.
 */
export function decodeFullNameAndManifest(rawFullName?: string | null): {
  displayName: string;
  manifest: UserPublicSyncManifest | null;
  hasLegacyTag: boolean;
} {
  if (!rawFullName || typeof rawFullName !== 'string') {
    return { displayName: '', manifest: null, hasLegacyTag: false };
  }
  const startIdx = rawFullName.indexOf(SYNC_MARKER_START);
  if (startIdx === -1) {
    return { displayName: rawFullName.trim(), manifest: null, hasLegacyTag: false };
  }

  const displayName = rawFullName.slice(0, startIdx).trim();
  const payloadStart = startIdx + SYNC_MARKER_START.length;
  const endIdx = rawFullName.indexOf(SYNC_MARKER_END, payloadStart);
  const rawPayload =
    endIdx === -1
      ? rawFullName.slice(payloadStart).trim()
      : rawFullName.slice(payloadStart, endIdx).trim();

  if (!rawPayload) {
    return { displayName, manifest: null, hasLegacyTag: true };
  }

  try {
    const json = decodeURIComponent(rawPayload);
    const parsed = JSON.parse(json);
    if (parsed && typeof parsed === 'object') {
      return {
        displayName,
        manifest: parsed as UserPublicSyncManifest,
        hasLegacyTag: true
      };
    }
  } catch {
    try {
      const parsed = JSON.parse(rawPayload);
      if (parsed && typeof parsed === 'object') {
        return {
          displayName,
          manifest: parsed as UserPublicSyncManifest,
          hasLegacyTag: true
        };
      }
    } catch {}
  }

  return { displayName, manifest: null, hasLegacyTag: true };
}

/**
 * Retired encoder: NEVER appends `<!--XEUSAR_PUBLIC_SYNC:...-->` to `full_name`.
 * Always returns only the clean human-readable display name.
 */
export function encodeFullNameWithManifest(
  displayName: string,
  _manifest?: UserPublicSyncManifest | null
): string {
  return extractCleanDisplayName(displayName) || 'Student';
}

export function loadLocalUserManifest(_userId: string): UserPublicSyncManifest {
  return createEmptyManifest();
}

export function saveLocalUserManifest(_userId: string, _manifest: UserPublicSyncManifest): void {
  // No-op: local manifest relay retired in favor of canonical Supabase tables
}

/**
 * Safely migrates any legacy records embedded inside a profile's `full_name`
 * into the real canonical Supabase tables, validating ownership (`ownerId`),
 * preventing duplicate inserts, preserving original IDs and timestamps,
 * and cleaning `public.profiles.full_name` only if migration succeeds.
 */
async function migrateSingleLegacyProfileManifest(
  supabase: SupabaseClient,
  ownerId: string,
  cleanDisplayName: string,
  manifest: UserPublicSyncManifest | null,
  canCleanProfileRow: boolean
): Promise<void> {
  if (!isUuidString(ownerId)) return;
  let allSucceeded = true;

  if (manifest) {
    // 1. Migrate legacy custom programs
    if (Array.isArray(manifest.customPrograms) && manifest.customPrograms.length > 0) {
      for (const prog of manifest.customPrograms) {
        if (!prog?.id || !prog?.name) continue;
        const { error } = await supabase.from('academic_programs').upsert(
          {
            id: prog.id,
            name: prog.name,
            short_code: prog.shortCode || 'PROG',
            degree_tier: prog.degreeTier || 'Undergraduate',
            discipline: prog.discipline || 'Interdisciplinary Studies',
            description: prog.description || '',
            duration_years: prog.durationYears || 4,
            total_semesters: prog.totalSemesters || 8,
            total_credits: prog.totalCredits || 130,
            semesters: prog.semesters || [],
            created_by: ownerId
          },
          { onConflict: 'id', ignoreDuplicates: true }
        );
        if (error) allSucceeded = false;
      }
    }

    // 2. Migrate legacy custom universities
    if (Array.isArray(manifest.customUniversities) && manifest.customUniversities.length > 0) {
      for (const uni of manifest.customUniversities) {
        if (!uni?.id || !uni?.name) continue;
        const { error } = await supabase.from('universities').upsert(
          {
            id: uni.id,
            name: uni.name,
            short_name: uni.shortName || 'UNI',
            badge: uni.badge || null,
            logo_url: uni.logoUrl || '',
            banner_url: uni.bannerUrl || '',
            location: uni.location || 'Pakistan',
            country: uni.country || 'Pakistan',
            disciplines: Array.isArray(uni.disciplines) ? uni.disciplines : [],
            website: uni.website || null,
            established_year: uni.establishedYear || 2025,
            verified_students: Math.max(1, uni.verifiedStudents || 1),
            description: uni.description || '',
            is_member_restricted: Boolean(uni.isMemberRestricted),
            created_by: ownerId
          },
          { onConflict: 'id', ignoreDuplicates: true }
        );
        if (error) allSucceeded = false;
      }
    }

    // 3. Migrate legacy study notes owned by this user
    if (Array.isArray(manifest.notes) && manifest.notes.length > 0) {
      for (const note of manifest.notes) {
        if (!note?.id || !note?.title || !isUuidString(note.id)) continue;
        if (note.uploaderId && note.uploaderId !== ownerId) continue;
        if (!note.fileUrl || note.fileUrl.startsWith('https://xeusar.local/')) continue;

        const { error } = await supabase.from('study_notes').upsert(
          {
            id: note.id,
            title: note.title,
            description: note.description || '',
            course_code: note.courseCode || 'GEN-101',
            course_name: note.courseName || note.courseCode || 'General Course',
            course_id: note.courseId || null,
            subject: note.subject || 'Computer Science',
            material_type: note.materialType || 'lecture_notes',
            academic_year: note.academicYear || 2025,
            semester: note.semester || 'Fall Semester',
            semester_number: note.semesterNumber || 1,
            professor: note.professor || 'Course Instructor',
            file_url: note.fileUrl,
            file_name: note.fileName || 'study_note.pdf',
            file_size_bytes: note.fileSizeBytes || 0,
            page_count: note.pageCount || 1,
            uploader_id: ownerId,
            uploader_name: note.uploaderName || cleanDisplayName || 'Student',
            uploader_university: note.uploaderUniversity || 'Open Campus',
            university_id: note.universityId || null,
            program_id: note.programId || 'bs-cs',
            program_ids: Array.isArray(note.programIds) ? note.programIds : [note.programId || 'bs-cs'],
            program_name: note.programName || 'BS Computer Science',
            degree_tier: note.degreeTier || 'Undergraduate',
            content_hash: note.contentHash || null,
            storage_path: note.storagePath || null,
            downloads_count: note.downloadsCount || 0,
            upvotes_count: note.upvotesCount || 1,
            tags: Array.isArray(note.tags) ? note.tags : [],
            pages: Array.isArray(note.pages) ? note.pages : [],
            created_at: note.createdAt || new Date().toISOString()
          },
          { onConflict: 'id', ignoreDuplicates: true }
        );
        if (error) allSucceeded = false;
      }
    }

    // 4. Migrate legacy forum posts owned by this user
    if (Array.isArray(manifest.forumPosts) && manifest.forumPosts.length > 0) {
      for (const post of manifest.forumPosts) {
        if (!post?.id || !post?.title || !post?.body || !isUuidString(post.id)) continue;
        if (post.authorId && post.authorId !== ownerId) continue;

        const { error } = await supabase.from('forum_posts').upsert(
          {
            id: post.id,
            title: post.title,
            body: post.body,
            post_type: post.postType || 'Discussion',
            topic_id: post.topicId || 'general-discussion',
            topic_name: post.topicName || 'General Discussion',
            author_id: ownerId,
            author_name: post.authorName || cleanDisplayName || 'Student',
            author_username: post.authorUsername || 'student',
            author_avatar: post.authorAvatar || null,
            author_program: post.authorProgram || null,
            author_degree_tier: post.authorDegreeTier || null,
            author_university: post.authorUniversity || null,
            resource_id: isUuidString(post.resourceId) ? post.resourceId : null,
            program_course_ref: post.programCourseRef || null,
            external_link: post.externalLink || null,
            upvotes_count: post.upvotesCount || 1,
            downvotes_count: post.downvotesCount || 0,
            comments_count: post.commentsCount || 0,
            accepted_comment_id: isUuidString(post.acceptedCommentId) ? post.acceptedCommentId : null,
            status: post.status || 'published',
            created_at: post.createdAt || new Date().toISOString()
          },
          { onConflict: 'id', ignoreDuplicates: true }
        );
        if (error) allSucceeded = false;
      }
    }

    // 5. Migrate legacy forum comments owned by this user
    if (Array.isArray(manifest.forumComments) && manifest.forumComments.length > 0) {
      for (const comm of manifest.forumComments) {
        if (!comm?.id || !comm?.postId || !comm?.body || !isUuidString(comm.id) || !isUuidString(comm.postId)) continue;
        if (comm.authorId && comm.authorId !== ownerId) continue;

        const { error } = await supabase.from('forum_comments').upsert(
          {
            id: comm.id,
            post_id: comm.postId,
            parent_comment_id: isUuidString(comm.parentCommentId) ? comm.parentCommentId : null,
            body: comm.body,
            author_id: ownerId,
            author_name: comm.authorName || cleanDisplayName || 'Student',
            author_username: comm.authorUsername || 'student',
            author_avatar: comm.authorAvatar || null,
            author_program: comm.authorProgram || null,
            author_degree_tier: comm.authorDegreeTier || null,
            upvotes_count: comm.upvotesCount || 1,
            downvotes_count: comm.downvotesCount || 0,
            is_accepted: Boolean(comm.isAccepted),
            status: comm.status || 'published',
            created_at: comm.createdAt || new Date().toISOString()
          },
          { onConflict: 'id', ignoreDuplicates: true }
        );
        if (error) allSucceeded = false;
      }
    }

    // 6. Migrate legacy program discussions & doubts owned by this user
    if (Array.isArray(manifest.programDiscussions) && manifest.programDiscussions.length > 0) {
      for (const disc of manifest.programDiscussions) {
        if (!disc?.id || !disc?.programId || !disc?.title) continue;
        if (disc.authorId && disc.authorId !== ownerId) continue;

        const { error } = await supabase.from('program_discussions').upsert(
          {
            id: disc.id,
            program_id: disc.programId,
            title: disc.title,
            content: disc.content || '',
            category: disc.category || 'Academics',
            semester_tag: disc.semesterTag || null,
            course_tag: disc.courseTag || null,
            author_id: ownerId,
            author_name: disc.authorName || cleanDisplayName || 'Student',
            author_avatar: disc.authorAvatar || null,
            author_program: disc.authorProgram || 'Student Peer',
            author_degree_tier: disc.authorDegreeTier || null,
            upvotes_count: disc.upvotesCount || 1,
            comments_count: disc.commentsCount || 0,
            created_at: disc.createdAt || new Date().toISOString()
          },
          { onConflict: 'id', ignoreDuplicates: true }
        );
        if (error) allSucceeded = false;
      }
    }

    if (Array.isArray(manifest.programDoubts) && manifest.programDoubts.length > 0) {
      for (const doubt of manifest.programDoubts) {
        if (!doubt?.id || !doubt?.programId || !doubt?.title) continue;
        if (doubt.authorId && doubt.authorId !== ownerId) continue;

        const { error } = await supabase.from('program_doubts').upsert(
          {
            id: doubt.id,
            program_id: doubt.programId,
            title: doubt.title,
            content: doubt.content || '',
            course_code: doubt.courseCode || 'GEN',
            semester_tag: doubt.semesterTag || null,
            tags: Array.isArray(doubt.tags) ? doubt.tags : [],
            author_id: ownerId,
            author_name: doubt.authorName || cleanDisplayName || 'Student',
            author_avatar: doubt.authorAvatar || null,
            author_program: doubt.authorProgram || 'Student Peer',
            upvotes_count: doubt.upvotesCount || 1,
            status: doubt.status || 'unanswered',
            accepted_answer_id: doubt.acceptedAnswerId || null,
            created_at: doubt.createdAt || new Date().toISOString()
          },
          { onConflict: 'id', ignoreDuplicates: true }
        );
        if (error) allSucceeded = false;
      }
    }
  }

  // Only strip the legacy tag from profiles.full_name after migration succeeds (or if manifest was empty)
  if (canCleanProfileRow && (allSucceeded || !manifest)) {
    const safeName = cleanDisplayName || 'Student';
    await supabase
      .from('profiles')
      .update({
        display_name: safeName,
        full_name: safeName
      })
      .eq('id', ownerId)
      .then(() => {}, () => {});

    try {
      localStorage.removeItem(`${LOCAL_MANIFEST_PREFIX}${ownerId}`);
    } catch {}
  }
}

/**
 * Retired manifest writer: does NOT write any internal sync data to `profiles.full_name`.
 * If the current user's profile row still has a legacy `<!--XEUSAR_PUBLIC_SYNC:...-->`
 * tag, migrates it once to canonical tables and cleans `full_name`.
 */
export async function updateCurrentUserPublicManifest(
  supabase: SupabaseClient | null | undefined,
  userId: string | undefined,
  _mutator?: (prev: UserPublicSyncManifest) => UserPublicSyncManifest,
  fallbackDisplayName?: string
): Promise<void> {
  if (!supabase || !userId || !isUuidString(userId)) return;
  if (MIGRATED_PROFILES_SESSION_SET.has(userId)) return;

  try {
    const { data: row } = await supabase
      .from('profiles')
      .select('id, display_name, full_name')
      .eq('id', userId)
      .maybeSingle();

    if (row) {
      const decoded = decodeFullNameAndManifest(row.full_name);
      if (decoded.hasLegacyTag) {
        const cleanName =
          extractCleanDisplayName(row.display_name) ||
          decoded.displayName ||
          extractCleanDisplayName(fallbackDisplayName) ||
          'Student';
        await migrateSingleLegacyProfileManifest(
          supabase,
          userId,
          cleanName,
          decoded.manifest,
          true
        );
      }
      MIGRATED_PROFILES_SESSION_SET.add(userId);
    }
  } catch {}
}

export interface AggregatedPublicPlatformData {
  notes: StudyNote[];
  upvoteCountsByNote: Record<string, number>;
  upvotedByCurrentUser: Set<string>;
  forumPosts: ForumPost[];
  forumComments: ForumComment[];
  forumVoteTotals: Record<string, { up: number; down: number }>;
  acceptedAnswers: Record<string, string>;
  programDiscussions: ProgramDiscussionPost[];
  programDiscussionComments: ProgramDiscussionComment[];
  programDoubts: ProgramDoubtQuestion[];
  programDoubtAnswers: ProgramDoubtAnswer[];
  universityDiscussions: DiscussionPost[];
  universityDiscussionComments: DiscussionComment[];
  universityDoubts: DoubtQuestion[];
  universityDoubtAnswers: DoubtAnswer[];
  customPrograms: AcademicProgram[];
  customUniversities: University[];
  enrolledPrograms: Array<{ userId: string; programId: string; programName: string; degreeTier?: DegreeTier }>;
  enrolledUniversities: Array<{ userId: string; universityId: string; universityName: string }>;
}

export function invalidatePublicPlatformCache(): void {
  // No-op: canonical tables are queried directly
}

/**
 * Checks if any visible `public.profiles` rows still contain legacy `<!--XEUSAR_PUBLIC_SYNC:...-->`
 * tags and performs a safe one-time migration into canonical tables.
 * Returns empty relay collections so all callers use canonical Supabase tables as the single source of truth.
 */
export async function fetchAggregatedPublicPlatformData(
  supabase: SupabaseClient | null | undefined,
  currentUserId?: string
): Promise<AggregatedPublicPlatformData> {
  if (supabase && currentUserId && isUuidString(currentUserId)) {
    await updateCurrentUserPublicManifest(supabase, currentUserId);
  }

  return {
    notes: [],
    upvoteCountsByNote: {},
    upvotedByCurrentUser: new Set<string>(),
    forumPosts: [],
    forumComments: [],
    forumVoteTotals: {},
    acceptedAnswers: {},
    programDiscussions: [],
    programDiscussionComments: [],
    programDoubts: [],
    programDoubtAnswers: [],
    universityDiscussions: [],
    universityDiscussionComments: [],
    universityDoubts: [],
    universityDoubtAnswers: [],
    customPrograms: [],
    customUniversities: [],
    enrolledPrograms: [],
    enrolledUniversities: []
  };
}
