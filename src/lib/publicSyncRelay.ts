import { SupabaseClient } from '@supabase/supabase-js';
import {
  StudyNote,
  ForumPost,
  ForumComment,
  AcademicProgram,
  ProgramDiscussionPost,
  ProgramDiscussionComment,
  ProgramDoubtQuestion,
  ProgramDoubtAnswer,
  University,
  DiscussionPost,
  DiscussionComment,
  DoubtQuestion,
  DoubtAnswer,
  DegreeTier
} from '../types/index.ts';

const SYNC_MARKER_START = '\n<!--XEUSAR_PUBLIC_SYNC:';
const SYNC_MARKER_END = '-->';

/**
 * Per-user public contribution manifest stored alongside the owner's public profile row.
 * - Strictly contains ONLY public/shared academic contributions authored by `userId === profile.id`.
 * - NEVER contains private user data (never email, never user_settings_preferences, never bookmarks, never drafts).
 * - Protected by PostgreSQL RLS on `public.profiles` (`auth.uid() = id` for INSERT/UPDATE)
 *   and verified on read (`item.authorId === row.id` / `item.uploaderId === row.id`).
 */
export interface UserPublicSyncManifest {
  version: 1;
  userId: string;
  updatedAt: string;
  enrollment?: {
    programId?: string;
    programName?: string;
    degreeTier?: DegreeTier;
    semesterNumber?: number;
    universityId?: string;
    universityName?: string;
    customProgram?: AcademicProgram;
    customUniversity?: University;
  };
  enrolledProgram?: {
    programId: string;
    programName: string;
    degreeTier?: DegreeTier;
  };
  enrolledUniversity?: {
    universityId: string;
    universityName: string;
  };
  customPrograms?: AcademicProgram[];
  customUniversities?: University[];
  notes?: StudyNote[];
  noteUpvotes?: string[]; // noteIds upvoted by this user
  forumPosts?: ForumPost[];
  forumComments?: ForumComment[];
  forumVotes?: Record<string, 1 | -1>; // key: `${targetType}::${targetId}`
  acceptedForumAnswers?: Record<string, string | null>; // key: postId -> commentId | null
  acceptedAnswers?: Record<string, string>; // key: postId/questionId -> commentId/answerId
  programDiscussions?: ProgramDiscussionPost[];
  programDiscussionComments?: ProgramDiscussionComment[];
  programDoubts?: ProgramDoubtQuestion[];
  programDoubtAnswers?: ProgramDoubtAnswer[];
  acceptedProgramDoubtAnswers?: Record<string, string>; // key: questionId -> answerId
  universityDiscussions?: DiscussionPost[];
  universityDiscussionComments?: DiscussionComment[];
  universityDoubts?: DoubtQuestion[];
  universityDoubtAnswers?: DoubtAnswer[];
  acceptedUniversityDoubtAnswers?: Record<string, string>; // key: questionId -> answerId
}

const LOCAL_MANIFEST_CACHE_PREFIX = 'xeusar_public_sync_manifest_v1_';

/**
 * Strips any embedded public sync marker from `full_name` so callers always get a clean display name.
 */
export function extractCleanDisplayName(rawFullName?: string | null, fallbackName = ''): string {
  if (!rawFullName || typeof rawFullName !== 'string') return fallbackName;
  const idx = rawFullName.indexOf(SYNC_MARKER_START);
  if (idx === -1) return rawFullName.trim() || fallbackName;
  return rawFullName.slice(0, idx).trim() || fallbackName;
}

/**
 * Parses the public sync manifest from a `public.profiles` row, if present.
 */
export function parsePublicSyncManifestFromRow(row: any): UserPublicSyncManifest | null {
  if (!row || !row.id) return null;
  const rawFullName = typeof row.full_name === 'string' ? row.full_name : '';
  const startIdx = rawFullName.indexOf(SYNC_MARKER_START);
  if (startIdx === -1) return null;
  const jsonStart = startIdx + SYNC_MARKER_START.length;
  const endIdx = rawFullName.lastIndexOf(SYNC_MARKER_END);
  if (endIdx === -1 || endIdx <= jsonStart) return null;

  try {
    const parsed = JSON.parse(rawFullName.slice(jsonStart, endIdx));
    if (!parsed || typeof parsed !== 'object') return null;
    // Enforce strict ownership: manifest userId must match the profile row's primary key `id`
    const rowUserId = String(row.id);
    return {
      ...parsed,
      version: 1,
      userId: rowUserId
    };
  } catch {
    return null;
  }
}

export function encodeFullNameWithManifest(
  cleanDisplayName: string,
  manifest: UserPublicSyncManifest
): string {
  const safeName = extractCleanDisplayName(cleanDisplayName, 'Student');
  try {
    const serialized = JSON.stringify(manifest);
    return `${safeName}${SYNC_MARKER_START}${serialized}${SYNC_MARKER_END}`;
  } catch {
    return safeName;
  }
}

export function loadLocalUserManifest(userId: string): UserPublicSyncManifest {
  if (!userId) {
    return { version: 1, userId: '', updatedAt: new Date().toISOString() };
  }
  try {
    const raw = localStorage.getItem(`${LOCAL_MANIFEST_CACHE_PREFIX}${userId}`);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object') {
        return {
          ...parsed,
          version: 1,
          userId
        };
      }
    }
  } catch {}
  return {
    version: 1,
    userId,
    updatedAt: new Date().toISOString()
  };
}

export function saveLocalUserManifest(userId: string, manifest: UserPublicSyncManifest): void {
  if (!userId) return;
  try {
    localStorage.setItem(`${LOCAL_MANIFEST_CACHE_PREFIX}${userId}`, JSON.stringify(manifest));
  } catch {}
}

/**
 * Compacts a StudyNote for safe cross-user relay storage so even if `study_notes` table
 * is not yet created, other users receive the complete note metadata, multi-page content,
 * and file URL (if HTTP URL or compact Data URL <= 250 KB).
 */
function compactNoteForManifest(note: StudyNote): StudyNote {
  const isLargeDataUrl =
    Boolean(note.fileUrl && note.fileUrl.startsWith('data:') && note.fileUrl.length > 260000);
  return {
    ...note,
    fileUrl: isLargeDataUrl
      ? `https://xeusar.local/storage/${note.storagePath || `shared/${note.contentHash || note.id}.pdf`}`
      : note.fileUrl
  };
}

/**
 * Updates the authenticated user's public sync manifest in `public.profiles` (`auth.uid() = id`).
 */
export async function updateCurrentUserPublicManifest(
  supabase: SupabaseClient | null,
  userId: string | undefined | null,
  updater: (current: UserPublicSyncManifest) => UserPublicSyncManifest,
  fallbackDisplayName?: string
): Promise<void> {
  if (!userId || userId === 'student-local' || userId.startsWith('local-')) return;

  const currentLocal = loadLocalUserManifest(userId);
  const updated = updater({
    ...currentLocal,
    version: 1,
    userId,
    updatedAt: new Date().toISOString()
  });
  updated.updatedAt = new Date().toISOString();
  if (Array.isArray(updated.notes)) {
    updated.notes = updated.notes.map(compactNoteForManifest);
  }
  saveLocalUserManifest(userId, updated);

  if (!supabase) return;

  try {
    const { data: existingRow } = await supabase
      .from('profiles')
      .select('id, username, display_name, full_name')
      .eq('id', userId)
      .maybeSingle();

    if (!existingRow) return;

    // Merge with any remote manifest on the user's profile row so we never clobber another session of the same user
    const remoteManifest = parsePublicSyncManifestFromRow(existingRow);
    const mergedManifest: UserPublicSyncManifest = remoteManifest
      ? updater({
          ...remoteManifest,
          ...updated,
          enrollment: updated.enrollment || remoteManifest.enrollment,
          enrolledProgram: updated.enrolledProgram || remoteManifest.enrolledProgram,
          enrolledUniversity: updated.enrolledUniversity || remoteManifest.enrolledUniversity,
          version: 1,
          userId,
          updatedAt: new Date().toISOString()
        })
      : updated;

    if (Array.isArray(mergedManifest.notes)) {
      mergedManifest.notes = mergedManifest.notes.map(compactNoteForManifest);
    }
    saveLocalUserManifest(userId, mergedManifest);

    const cleanName =
      existingRow.display_name ||
      extractCleanDisplayName(
        existingRow.full_name,
        fallbackDisplayName || existingRow.username || 'Student'
      );

    const encodedFullName = encodeFullNameWithManifest(cleanName, mergedManifest);

    await supabase
      .from('profiles')
      .update({
        full_name: encodedFullName,
        updated_at: new Date().toISOString()
      })
      .eq('id', userId);
  } catch {
    // Ignore transient network errors
  }
}

export interface AggregatedPublicPlatformData {
  manifests: UserPublicSyncManifest[];
  notes: StudyNote[];
  noteUpvoteCounts: Record<string, number>;
  userUpvotedNoteIds: Set<string>;
  forumPosts: ForumPost[];
  forumComments: ForumComment[];
  acceptedAnswers: Record<string, string>;
  programEnrollments: Record<string, string>; // studentId -> programId
  enrolledPrograms: {
    userId: string;
    programId?: string;
    programName?: string;
    degreeTier?: DegreeTier;
  }[];
  customPrograms: AcademicProgram[];
  programDiscussions: ProgramDiscussionPost[];
  programDiscussionComments: ProgramDiscussionComment[];
  programDoubts: ProgramDoubtQuestion[];
  programDoubtAnswers: ProgramDoubtAnswer[];
  universityEnrollments: Record<string, string>; // studentId -> universityId
  enrolledUniversities: {
    userId: string;
    universityId?: string;
    universityName?: string;
  }[];
  customUniversities: University[];
  universityDiscussions: DiscussionPost[];
  universityDiscussionComments: DiscussionComment[];
  universityDoubts: DoubtQuestion[];
  universityDoubtAnswers: DoubtAnswer[];
}

function createEmptyAggregatedData(): AggregatedPublicPlatformData {
  return {
    manifests: [],
    notes: [],
    noteUpvoteCounts: {},
    userUpvotedNoteIds: new Set(),
    forumPosts: [],
    forumComments: [],
    acceptedAnswers: {},
    programEnrollments: {},
    enrolledPrograms: [],
    customPrograms: [],
    programDiscussions: [],
    programDiscussionComments: [],
    programDoubts: [],
    programDoubtAnswers: [],
    universityEnrollments: {},
    enrolledUniversities: [],
    customUniversities: [],
    universityDiscussions: [],
    universityDiscussionComments: [],
    universityDoubts: [],
    universityDoubtAnswers: []
  };
}

/**
 * Fetches all public student rows from `public.profiles` and aggregates their verified
 * public contributions (strictly enforcing `authorId === row.id` / `uploaderId === row.id`).
 */
export async function fetchAggregatedPublicPlatformData(
  supabase: SupabaseClient | null,
  currentUserId?: string
): Promise<AggregatedPublicPlatformData> {
  if (!supabase) return createEmptyAggregatedData();

  try {
    const { data: rows, error } = await supabase
      .from('profiles')
      .select('id, username, display_name, full_name, avatar_url, bio, setup_completed, updated_at')
      .order('updated_at', { ascending: false });

    if (error || !Array.isArray(rows)) {
      return createEmptyAggregatedData();
    }

    const manifests: UserPublicSyncManifest[] = [];
    const notesById = new Map<string, StudyNote>();
    const noteUpvoteUsers = new Map<string, Set<string>>();
    const userUpvotedNoteIds = new Set<string>();

    const forumPostsById = new Map<string, ForumPost>();
    const forumCommentsById = new Map<string, ForumComment>();
    const forumVotesByTarget = new Map<string, { up: Set<string>; down: Set<string> }>();
    const currentUserForumVotes = new Map<string, 1 | -1>();
    const acceptedAnswerByPostId = new Map<string, string | null>();
    const acceptedAnswers: Record<string, string> = {};

    const programEnrollments: Record<string, string> = {};
    const enrolledPrograms: {
      userId: string;
      programId?: string;
      programName?: string;
      degreeTier?: DegreeTier;
    }[] = [];
    const customProgramsById = new Map<string, AcademicProgram>();
    const programDiscussionsById = new Map<string, ProgramDiscussionPost>();
    const programCommentsByPostId = new Map<string, ProgramDiscussionComment[]>();
    const allProgramDiscussionComments: ProgramDiscussionComment[] = [];
    const programDoubtsById = new Map<string, ProgramDoubtQuestion>();
    const programAnswersByQuestionId = new Map<string, ProgramDoubtAnswer[]>();
    const allProgramDoubtAnswers: ProgramDoubtAnswer[] = [];
    const acceptedProgramDoubtAnswers = new Map<string, string>();

    const universityEnrollments: Record<string, string> = {};
    const enrolledUniversities: {
      userId: string;
      universityId?: string;
      universityName?: string;
    }[] = [];
    const customUniversitiesById = new Map<string, University>();
    const universityDiscussionsById = new Map<string, DiscussionPost>();
    const universityCommentsByPostId = new Map<string, DiscussionComment[]>();
    const allUniversityDiscussionComments: DiscussionComment[] = [];
    const universityDoubtsById = new Map<string, DoubtQuestion>();
    const universityAnswersByQuestionId = new Map<string, DoubtAnswer[]>();
    const allUniversityDoubtAnswers: DoubtAnswer[] = [];
    const acceptedUniversityDoubtAnswers = new Map<string, string>();

    for (const row of rows) {
      const ownerId = String(row.id);
      const manifest = parsePublicSyncManifestFromRow(row);
      if (!manifest) continue;
      manifests.push(manifest);

      // 1. Academic Program & University Enrollment
      if (manifest.enrollment) {
        if (manifest.enrollment.customProgram && manifest.enrollment.customProgram.id) {
          customProgramsById.set(manifest.enrollment.customProgram.id, manifest.enrollment.customProgram);
        }
        if (manifest.enrollment.programId) {
          programEnrollments[ownerId] = manifest.enrollment.programId;
          enrolledPrograms.push({
            userId: ownerId,
            programId: manifest.enrollment.programId,
            programName: manifest.enrollment.programName,
            degreeTier: manifest.enrollment.degreeTier
          });
        }
        if (manifest.enrollment.customUniversity && manifest.enrollment.customUniversity.id) {
          customUniversitiesById.set(manifest.enrollment.customUniversity.id, manifest.enrollment.customUniversity);
        }
        if (manifest.enrollment.universityId) {
          universityEnrollments[ownerId] = manifest.enrollment.universityId;
          enrolledUniversities.push({
            userId: ownerId,
            universityId: manifest.enrollment.universityId,
            universityName: manifest.enrollment.universityName
          });
        }
      }

      if (manifest.enrolledProgram) {
        if (manifest.enrolledProgram.programId) {
          programEnrollments[ownerId] = manifest.enrolledProgram.programId;
        }
        enrolledPrograms.push({
          userId: ownerId,
          programId: manifest.enrolledProgram.programId,
          programName: manifest.enrolledProgram.programName,
          degreeTier: manifest.enrolledProgram.degreeTier
        });
      }

      if (manifest.enrolledUniversity) {
        if (manifest.enrolledUniversity.universityId) {
          universityEnrollments[ownerId] = manifest.enrolledUniversity.universityId;
        }
        enrolledUniversities.push({
          userId: ownerId,
          universityId: manifest.enrolledUniversity.universityId,
          universityName: manifest.enrolledUniversity.universityName
        });
      }

      if (Array.isArray(manifest.customPrograms)) {
        for (const cp of manifest.customPrograms) {
          if (cp && cp.id) {
            customProgramsById.set(cp.id, cp);
          }
        }
      }

      if (Array.isArray(manifest.customUniversities)) {
        for (const cu of manifest.customUniversities) {
          if (cu && cu.id) {
            customUniversitiesById.set(cu.id, cu);
          }
        }
      }

      // 2. Shared Study Notes (strictly verify uploaderId === ownerId)
      if (Array.isArray(manifest.notes)) {
        for (const note of manifest.notes) {
          if (!note || !note.id) continue;
          if (note.uploaderId && note.uploaderId !== ownerId) continue;
          notesById.set(note.id, {
            ...note,
            uploaderId: ownerId
          });
          if (!noteUpvoteUsers.has(note.id)) {
            noteUpvoteUsers.set(note.id, new Set([ownerId]));
          } else {
            noteUpvoteUsers.get(note.id)!.add(ownerId);
          }
        }
      }

      if (Array.isArray(manifest.noteUpvotes)) {
        for (const nid of manifest.noteUpvotes) {
          if (!nid) continue;
          if (!noteUpvoteUsers.has(nid)) {
            noteUpvoteUsers.set(nid, new Set());
          }
          noteUpvoteUsers.get(nid)!.add(ownerId);
          if (currentUserId && ownerId === currentUserId) {
            userUpvotedNoteIds.add(nid);
          }
        }
      }

      // 3. Public Forum Posts, Comments & Votes (strictly verify authorId === ownerId)
      if (Array.isArray(manifest.forumPosts)) {
        for (const post of manifest.forumPosts) {
          if (!post || !post.id || post.status === 'removed') continue;
          if (post.authorId !== ownerId) continue;
          forumPostsById.set(post.id, { ...post, authorId: ownerId });
        }
      }

      if (manifest.acceptedForumAnswers && typeof manifest.acceptedForumAnswers === 'object') {
        for (const [postId, commentId] of Object.entries(manifest.acceptedForumAnswers)) {
          const post = forumPostsById.get(postId);
          if (post && post.authorId === ownerId) {
            acceptedAnswerByPostId.set(postId, commentId);
            if (commentId) {
              acceptedAnswers[postId] = commentId;
            }
          }
        }
      }

      if (manifest.acceptedAnswers && typeof manifest.acceptedAnswers === 'object') {
        for (const [targetId, ansId] of Object.entries(manifest.acceptedAnswers)) {
          if (typeof ansId === 'string') {
            acceptedAnswers[targetId] = ansId;
            acceptedAnswerByPostId.set(targetId, ansId || null);
          }
        }
      }

      if (Array.isArray(manifest.forumComments)) {
        for (const comment of manifest.forumComments) {
          if (!comment || !comment.id || comment.status === 'removed') continue;
          if (comment.authorId !== ownerId) continue;
          forumCommentsById.set(comment.id, { ...comment, authorId: ownerId });
        }
      }

      if (manifest.forumVotes && typeof manifest.forumVotes === 'object') {
        for (const [targetKey, voteVal] of Object.entries(manifest.forumVotes)) {
          if (voteVal !== 1 && voteVal !== -1) continue;
          if (!forumVotesByTarget.has(targetKey)) {
            forumVotesByTarget.set(targetKey, { up: new Set(), down: new Set() });
          }
          const bucket = forumVotesByTarget.get(targetKey)!;
          if (voteVal === 1) {
            bucket.up.add(ownerId);
            bucket.down.delete(ownerId);
          } else {
            bucket.down.add(ownerId);
            bucket.up.delete(ownerId);
          }
          if (currentUserId && ownerId === currentUserId) {
            currentUserForumVotes.set(targetKey, voteVal);
          }
        }
      }

      // 4. Program Discussions & Comments
      if (Array.isArray(manifest.programDiscussions)) {
        for (const disc of manifest.programDiscussions) {
          if (!disc || !disc.id || disc.authorId !== ownerId) continue;
          programDiscussionsById.set(disc.id, { ...disc, authorId: ownerId });
        }
      }
      if (Array.isArray(manifest.programDiscussionComments)) {
        for (const comm of manifest.programDiscussionComments) {
          if (!comm || !comm.id || comm.authorId !== ownerId) continue;
          const cleanComm = { ...comm, authorId: ownerId };
          allProgramDiscussionComments.push(cleanComm);
          const list = programCommentsByPostId.get(comm.postId) || [];
          if (!list.some(c => c.id === comm.id)) {
            list.push(cleanComm);
          }
          programCommentsByPostId.set(comm.postId, list);
        }
      }

      // 5. Program Doubts & Answers
      if (Array.isArray(manifest.programDoubts)) {
        for (const doubt of manifest.programDoubts) {
          if (!doubt || !doubt.id || doubt.authorId !== ownerId) continue;
          programDoubtsById.set(doubt.id, { ...doubt, authorId: ownerId });
        }
      }
      if (Array.isArray(manifest.programDoubtAnswers)) {
        for (const ans of manifest.programDoubtAnswers) {
          if (!ans || !ans.id || ans.authorId !== ownerId) continue;
          const cleanAns = { ...ans, authorId: ownerId };
          allProgramDoubtAnswers.push(cleanAns);
          const list = programAnswersByQuestionId.get(ans.questionId) || [];
          if (!list.some(a => a.id === ans.id)) {
            list.push(cleanAns);
          }
          programAnswersByQuestionId.set(ans.questionId, list);
        }
      }
      if (manifest.acceptedProgramDoubtAnswers && typeof manifest.acceptedProgramDoubtAnswers === 'object') {
        for (const [qId, aId] of Object.entries(manifest.acceptedProgramDoubtAnswers)) {
          const doubt = programDoubtsById.get(qId);
          if (doubt && doubt.authorId === ownerId && aId) {
            acceptedProgramDoubtAnswers.set(qId, aId);
            acceptedAnswers[qId] = aId;
          }
        }
      }

      // 6. University Discussions & Comments
      if (Array.isArray(manifest.universityDiscussions)) {
        for (const disc of manifest.universityDiscussions) {
          if (!disc || !disc.id || disc.authorId !== ownerId) continue;
          universityDiscussionsById.set(disc.id, { ...disc, authorId: ownerId });
        }
      }
      if (Array.isArray(manifest.universityDiscussionComments)) {
        for (const comm of manifest.universityDiscussionComments) {
          if (!comm || !comm.id || comm.authorId !== ownerId) continue;
          const cleanComm = { ...comm, authorId: ownerId };
          allUniversityDiscussionComments.push(cleanComm);
          const list = universityCommentsByPostId.get(comm.postId) || [];
          if (!list.some(c => c.id === comm.id)) {
            list.push(cleanComm);
          }
          universityCommentsByPostId.set(comm.postId, list);
        }
      }

      // 7. University Doubts & Answers
      if (Array.isArray(manifest.universityDoubts)) {
        for (const doubt of manifest.universityDoubts) {
          if (!doubt || !doubt.id || doubt.authorId !== ownerId) continue;
          universityDoubtsById.set(doubt.id, { ...doubt, authorId: ownerId });
        }
      }
      if (Array.isArray(manifest.universityDoubtAnswers)) {
        for (const ans of manifest.universityDoubtAnswers) {
          if (!ans || !ans.id || ans.authorId !== ownerId) continue;
          const cleanAns = { ...ans, authorId: ownerId };
          allUniversityDoubtAnswers.push(cleanAns);
          const list = universityAnswersByQuestionId.get(ans.questionId) || [];
          if (!list.some(a => a.id === ans.id)) {
            list.push(cleanAns);
          }
          universityAnswersByQuestionId.set(ans.questionId, list);
        }
      }
      if (manifest.acceptedUniversityDoubtAnswers && typeof manifest.acceptedUniversityDoubtAnswers === 'object') {
        for (const [qId, aId] of Object.entries(manifest.acceptedUniversityDoubtAnswers)) {
          const doubt = universityDoubtsById.get(qId);
          if (doubt && doubt.authorId === ownerId && aId) {
            acceptedUniversityDoubtAnswers.set(qId, aId);
            acceptedAnswers[qId] = aId;
          }
        }
      }
    }

    // Reconcile note upvote counts
    const noteUpvoteCounts: Record<string, number> = {};
    for (const [nid, usersSet] of noteUpvoteUsers.entries()) {
      noteUpvoteCounts[nid] = usersSet.size;
    }

    const hydratedNotes = Array.from(notesById.values()).map(n => ({
      ...n,
      upvotesCount: Math.max(n.upvotesCount || 0, noteUpvoteCounts[n.id] || 0),
      hasUpvoted: userUpvotedNoteIds.has(n.id) || Boolean(n.hasUpvoted && n.uploaderId === currentUserId)
    }));

    // Reconcile forum comments & posts counts and votes
    const allForumComments: ForumComment[] = Array.from(forumCommentsById.values()).map(c => {
      const vKey = `comment::${c.id}`;
      const bucket = forumVotesByTarget.get(vKey);
      const up = bucket ? Math.max(1, bucket.up.size) : c.upvotesCount || 1;
      const down = bucket ? bucket.down.size : c.downvotesCount || 0;
      const uv = (currentUserForumVotes.get(vKey) || 0) as -1 | 0 | 1;
      const postAcceptedId = acceptedAnswerByPostId.get(c.postId);
      return {
        ...c,
        upvotesCount: up,
        downvotesCount: down,
        score: up - down,
        userVote: uv,
        isAccepted: postAcceptedId !== undefined ? postAcceptedId === c.id : Boolean(c.isAccepted)
      };
    });

    const commentCountByForumPost = new Map<string, number>();
    allForumComments.forEach(c => {
      commentCountByForumPost.set(c.postId, (commentCountByForumPost.get(c.postId) || 0) + 1);
    });

    const allForumPosts: ForumPost[] = Array.from(forumPostsById.values()).map(p => {
      const vKey = `post::${p.id}`;
      const bucket = forumVotesByTarget.get(vKey);
      const up = bucket ? Math.max(1, bucket.up.size) : p.upvotesCount || 1;
      const down = bucket ? bucket.down.size : p.downvotesCount || 0;
      const uv = (currentUserForumVotes.get(vKey) || 0) as -1 | 0 | 1;
      const cCount = commentCountByForumPost.get(p.id) ?? p.commentsCount ?? 0;
      const acceptedId = acceptedAnswerByPostId.has(p.id)
        ? acceptedAnswerByPostId.get(p.id) || null
        : p.acceptedCommentId || null;
      return {
        ...p,
        upvotesCount: up,
        downvotesCount: down,
        score: up - down,
        userVote: uv,
        commentsCount: cCount,
        acceptedCommentId: acceptedId
      };
    });

    // Assemble Program Discussions with cross-user comments
    const allProgramDiscussions = Array.from(programDiscussionsById.values()).map(d => {
      const extraComments = programCommentsByPostId.get(d.id) || [];
      const mergedCommentsMap = new Map<string, ProgramDiscussionComment>();
      (d.comments || []).forEach(c => mergedCommentsMap.set(c.id, c));
      extraComments.forEach(c => mergedCommentsMap.set(c.id, c));
      const mergedComments = Array.from(mergedCommentsMap.values()).sort(
        (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
      );
      return {
        ...d,
        comments: mergedComments,
        commentsCount: mergedComments.length
      };
    });

    // Assemble Program Doubts with cross-user answers
    const allProgramDoubts = Array.from(programDoubtsById.values()).map(q => {
      const extraAnswers = programAnswersByQuestionId.get(q.id) || [];
      const mergedAnswersMap = new Map<string, ProgramDoubtAnswer>();
      (q.answers || []).forEach(a => mergedAnswersMap.set(a.id, a));
      extraAnswers.forEach(a => mergedAnswersMap.set(a.id, a));
      const acceptedId = acceptedProgramDoubtAnswers.get(q.id) || acceptedAnswers[q.id] || q.acceptedAnswerId;
      const mergedAnswers = Array.from(mergedAnswersMap.values())
        .map(a => ({
          ...a,
          isAccepted: acceptedId ? a.id === acceptedId : Boolean(a.isAccepted)
        }))
        .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
      return {
        ...q,
        acceptedAnswerId: acceptedId,
        status: mergedAnswers.length > 0 ? ('answered' as const) : q.status,
        answers: mergedAnswers
      };
    });

    // Assemble University Discussions with cross-user comments
    const allUniversityDiscussions = Array.from(universityDiscussionsById.values()).map(d => {
      const extraComments = universityCommentsByPostId.get(d.id) || [];
      const mergedCommentsMap = new Map<string, DiscussionComment>();
      (d.comments || []).forEach(c => mergedCommentsMap.set(c.id, c));
      extraComments.forEach(c => mergedCommentsMap.set(c.id, c));
      const mergedComments = Array.from(mergedCommentsMap.values()).sort(
        (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
      );
      return {
        ...d,
        comments: mergedComments,
        commentsCount: mergedComments.length
      };
    });

    // Assemble University Doubts with cross-user answers
    const allUniversityDoubts = Array.from(universityDoubtsById.values()).map(q => {
      const extraAnswers = universityAnswersByQuestionId.get(q.id) || [];
      const mergedAnswersMap = new Map<string, DoubtAnswer>();
      (q.answers || []).forEach(a => mergedAnswersMap.set(a.id, a));
      extraAnswers.forEach(a => mergedAnswersMap.set(a.id, a));
      const acceptedId = acceptedUniversityDoubtAnswers.get(q.id) || acceptedAnswers[q.id] || q.acceptedAnswerId;
      const mergedAnswers = Array.from(mergedAnswersMap.values())
        .map(a => ({
          ...a,
          isAccepted: acceptedId ? a.id === acceptedId : Boolean(a.isAccepted)
        }))
        .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
      return {
        ...q,
        acceptedAnswerId: acceptedId,
        status: mergedAnswers.length > 0 ? ('answered' as const) : q.status,
        answers: mergedAnswers
      };
    });

    return {
      manifests,
      notes: hydratedNotes,
      noteUpvoteCounts,
      userUpvotedNoteIds,
      forumPosts: allForumPosts,
      forumComments: allForumComments,
      acceptedAnswers,
      programEnrollments,
      enrolledPrograms,
      customPrograms: Array.from(customProgramsById.values()),
      programDiscussions: allProgramDiscussions,
      programDiscussionComments: allProgramDiscussionComments,
      programDoubts: allProgramDoubts,
      programDoubtAnswers: allProgramDoubtAnswers,
      universityEnrollments,
      enrolledUniversities,
      customUniversities: Array.from(customUniversitiesById.values()),
      universityDiscussions: allUniversityDiscussions,
      universityDiscussionComments: allUniversityDiscussionComments,
      universityDoubts: allUniversityDoubts,
      universityDoubtAnswers: allUniversityDoubtAnswers
    };
  } catch {
    return createEmptyAggregatedData();
  }
}
