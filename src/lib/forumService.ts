import { SupabaseClient } from '@supabase/supabase-js';
import {
  ForumPost,
  ForumPostType,
  ForumTopic,
  ForumTopicId,
  ForumComment,
  ForumReport,
  ForumReportReason,
  ForumProgramCourseRef,
  StudentUser,
  StudyNote
} from '../types/index.ts';
import { getSupabaseInstance, classifySupabaseError } from './supabaseClient.ts';

// ============================================================================
// CONFIGURABLE TEXT-FIRST FORUM LIMITS & CONSTANTS
// ============================================================================

export const FORUM_MAX_TITLE_LENGTH = 150;
export const FORUM_MAX_BODY_LENGTH = 10000;
export const FORUM_MAX_COMMENT_LENGTH = 4000;
export const FORUM_MAX_NESTING_DEPTH = 4;
export const FORUM_PAGE_SIZE = 15;

export const FORUM_POST_TYPES: ForumPostType[] = [
  'Discussion',
  'Question',
  'Study Tip',
  'Resource Link',
  'Announcement'
];

export const FORUM_TOPICS: ForumTopic[] = [
  {
    id: 'mathematics',
    name: 'Mathematics',
    slug: 'mathematics',
    description: 'Calculus, linear algebra, discrete math, proofs, and problem solving.'
  },
  {
    id: 'physics',
    name: 'Physics',
    slug: 'physics',
    description: 'Mechanics, electromagnetism, quantum physics, thermodynamics, and derivations.'
  },
  {
    id: 'computer-science',
    name: 'Computer Science',
    slug: 'computer-science',
    description: 'Algorithms, data structures, systems programming, AI, and software design.'
  },
  {
    id: 'engineering',
    name: 'Engineering',
    slug: 'engineering',
    description: 'Electrical, mechanical, civil, chemical, and biomedical engineering discussions.'
  },
  {
    id: 'business',
    name: 'Business',
    slug: 'business',
    description: 'Economics, finance, accounting, management, and case study analysis.'
  },
  {
    id: 'english-languages',
    name: 'English & Languages',
    slug: 'english-languages',
    description: 'Academic writing, literature, linguistics, rhetoric, and research citations.'
  },
  {
    id: 'study-tips',
    name: 'Study Tips',
    slug: 'study-tips',
    description: 'Active recall, spaced repetition, note-taking workflows, and time management.'
  },
  {
    id: 'university-life',
    name: 'University Life',
    slug: 'university-life',
    description: 'Course registration advice, research internships, and academic milestones.'
  },
  {
    id: 'exam-preparation',
    name: 'Exam Preparation',
    slug: 'exam-preparation',
    description: 'Midterm and final exam review strategies, past paper walkthroughs, and formulas.'
  },
  {
    id: 'general-discussion',
    name: 'General Discussion',
    slug: 'general-discussion',
    description: 'Cross-disciplinary academic conversations and open scholarly exchange.'
  }
];

export const FORUM_REPORT_REASONS: ForumReportReason[] = [
  'Spam or self-promotion',
  'Harassment or disrespect',
  'Academic dishonesty / active exam leak',
  'Off-topic or low-effort',
  'Unsafe or misleading link',
  'Other'
];

// Persistent storage keys (real user-created records only — zero mock data)
const STORAGE_KEY_FORUM_POSTS = 'xeusar_forum_posts_v1';
const STORAGE_KEY_FORUM_COMMENTS = 'xeusar_forum_comments_v1';
const STORAGE_KEY_FORUM_VOTES = 'xeusar_forum_votes_v1'; // key: `${userId}::${targetType}::${targetId}` -> 1 | -1
const STORAGE_KEY_FORUM_BOOKMARKS = 'xeusar_forum_bookmarks_v1'; // key: `${userId}` -> string[] of postIds
const STORAGE_KEY_FORUM_REPORTS = 'xeusar_forum_reports_v1';
const STORAGE_KEY_FOLLOWED_TOPICS = 'xeusar_forum_followed_topics_v1'; // key: `${userId}` -> ForumTopicId[]
const STORAGE_KEY_POST_DRAFT = 'xeusar_forum_post_draft_v1';

// In-memory rate-limiting & duplicate-submission guards
const recentSubmissionSignatures = new Map<string, number>();
const SUBMISSION_COOLDOWN_MS = 2500;

// ============================================================================
// SECURITY, SANITIZATION & TEXT-ONLY ENFORCEMENT
// ============================================================================

/**
 * Strips executable HTML, script tags, event handlers, and embedded objects
 * while preserving clean plain text, markdown lists, code blocks, quotes, and LaTeX math.
 */
export function sanitizeForumText(input: string): string {
  if (typeof input !== 'string') return '';
  return input
    // Remove script, iframe, object, embed, style, form, input tags completely
    .replace(/<(script|iframe|object|embed|style|form|input|button|textarea|meta|link)[^>]*>[\s\S]*?<\/\1>/gi, '')
    .replace(/<(script|iframe|object|embed|style|form|input|button|textarea|meta|link)[^>]*\/?>/gi, '')
    // Strip arbitrary HTML tags while keeping mathematical inequality symbols like a < b if followed by space/digits
    .replace(/<\/?[a-zA-Z][a-zA-Z0-9-]*(?:\s+[^>]*)?>/g, '')
    // Neutralize inline javascript: or data: URIs inside markdown links
    .replace(/javascript\s*:/gi, 'blocked:')
    .replace(/vbscript\s*:/gi, 'blocked:')
    .replace(/data\s*:\s*(image|application|text|video|audio)\/[^\s)]+/gi, '[media-upload-disabled]')
    .replace(/\r\n/g, '\n')
    .trim();
}

/**
 * Strictly validates that a payload does not contain any uploaded files, blobs,
 * or base64 data URIs. Forum interactions are strictly text-first.
 */
export function assertNoMediaUploadInForumPayload(payload: Record<string, any>): {
  valid: boolean;
  error?: string;
} {
  for (const [key, value] of Object.entries(payload)) {
    if (typeof File !== 'undefined' && value instanceof File) {
      return {
        valid: false,
        error: `Direct file uploads (${key}) are disabled in the Public Forum. Link an existing Study Library resource instead.`
      };
    }
    if (typeof Blob !== 'undefined' && value instanceof Blob) {
      return {
        valid: false,
        error: 'Binary media attachments are disabled in the Public Forum.'
      };
    }
    if (typeof value === 'string' && /data\s*:\s*(image|application|video|audio)\/[a-z0-9.+-]+;base64,/i.test(value)) {
      return {
        valid: false,
        error: 'Embedded base64 files and images are not permitted in the text-first Public Forum.'
      };
    }
  }
  return { valid: true };
}

export function validateExternalForumUrl(rawUrl?: string | null): {
  valid: boolean;
  sanitizedUrl: string | null;
  error?: string;
} {
  if (!rawUrl || !rawUrl.trim()) {
    return { valid: true, sanitizedUrl: null };
  }
  const trimmed = rawUrl.trim();
  if (trimmed.length > 1000) {
    return { valid: false, sanitizedUrl: null, error: 'URL cannot exceed 1,000 characters.' };
  }
  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      return {
        valid: false,
        sanitizedUrl: null,
        error: 'External links must start with https:// or http://.'
      };
    }
    return { valid: true, sanitizedUrl: parsed.toString() };
  } catch {
    return {
      valid: false,
      sanitizedUrl: null,
      error: 'Please enter a valid URL starting with https:// or http://.'
    };
  }
}

export function validateForumPostInput(params: {
  title: string;
  body: string;
  postType: ForumPostType;
  topicId: ForumTopicId;
  externalLink?: string | null;
  resourceId?: string | null;
  rawPayload?: Record<string, any>;
}): {
  valid: boolean;
  error?: string;
  sanitizedTitle: string;
  sanitizedBody: string;
  sanitizedExternalLink: string | null;
} {
  if (params.rawPayload) {
    const mediaCheck = assertNoMediaUploadInForumPayload(params.rawPayload);
    if (!mediaCheck.valid) {
      return {
        valid: false,
        error: mediaCheck.error,
        sanitizedTitle: '',
        sanitizedBody: '',
        sanitizedExternalLink: null
      };
    }
  }

  const sanitizedTitle = sanitizeForumText(params.title || '');
  const sanitizedBody = sanitizeForumText(params.body || '');

  if (!sanitizedTitle) {
    return {
      valid: false,
      error: 'Post title is required.',
      sanitizedTitle,
      sanitizedBody,
      sanitizedExternalLink: null
    };
  }
  if (sanitizedTitle.length < 3) {
    return {
      valid: false,
      error: 'Post title must be at least 3 characters.',
      sanitizedTitle,
      sanitizedBody,
      sanitizedExternalLink: null
    };
  }
  if (sanitizedTitle.length > FORUM_MAX_TITLE_LENGTH) {
    return {
      valid: false,
      error: `Post title cannot exceed ${FORUM_MAX_TITLE_LENGTH} characters.`,
      sanitizedTitle,
      sanitizedBody,
      sanitizedExternalLink: null
    };
  }

  if (!FORUM_POST_TYPES.includes(params.postType)) {
    return {
      valid: false,
      error: 'Please select a valid post type.',
      sanitizedTitle,
      sanitizedBody,
      sanitizedExternalLink: null
    };
  }

  if (!FORUM_TOPICS.some(t => t.id === params.topicId)) {
    return {
      valid: false,
      error: 'Please select a valid academic topic.',
      sanitizedTitle,
      sanitizedBody,
      sanitizedExternalLink: null
    };
  }

  if (!sanitizedBody) {
    return {
      valid: false,
      error: 'Post body text is required.',
      sanitizedTitle,
      sanitizedBody,
      sanitizedExternalLink: null
    };
  }
  if (sanitizedBody.length > FORUM_MAX_BODY_LENGTH) {
    return {
      valid: false,
      error: `Post body cannot exceed ${FORUM_MAX_BODY_LENGTH.toLocaleString()} characters.`,
      sanitizedTitle,
      sanitizedBody,
      sanitizedExternalLink: null
    };
  }

  const linkValidation = validateExternalForumUrl(params.externalLink);
  if (!linkValidation.valid) {
    return {
      valid: false,
      error: linkValidation.error,
      sanitizedTitle,
      sanitizedBody,
      sanitizedExternalLink: null
    };
  }

  return {
    valid: true,
    sanitizedTitle,
    sanitizedBody,
    sanitizedExternalLink: linkValidation.sanitizedUrl
  };
}

export function validateForumCommentInput(
  body: string,
  rawPayload?: Record<string, any>
): { valid: boolean; error?: string; sanitizedBody: string } {
  if (rawPayload) {
    const mediaCheck = assertNoMediaUploadInForumPayload(rawPayload);
    if (!mediaCheck.valid) {
      return { valid: false, error: mediaCheck.error, sanitizedBody: '' };
    }
  }

  const sanitizedBody = sanitizeForumText(body || '');
  if (!sanitizedBody) {
    return { valid: false, error: 'Comment text cannot be empty.', sanitizedBody };
  }
  if (sanitizedBody.length > FORUM_MAX_COMMENT_LENGTH) {
    return {
      valid: false,
      error: `Comment cannot exceed ${FORUM_MAX_COMMENT_LENGTH.toLocaleString()} characters.`,
      sanitizedBody
    };
  }
  return { valid: true, sanitizedBody };
}

// ============================================================================
// STUDY LIBRARY RESOURCE ACCESS & PERMISSION CHECK
// ============================================================================

export function canUserAccessForumLinkedResource(
  note: StudyNote | undefined | null,
  viewer: StudentUser | null | undefined
): { accessible: boolean; reason?: string } {
  if (!note) {
    return {
      accessible: false,
      reason: 'This Study Library resource has been removed or is no longer available.'
    };
  }

  if (note.isRestricted) {
    if (!viewer || viewer.isGuest) {
      return {
        accessible: false,
        reason: 'Sign in with an enrolled program profile to access this cohort-restricted study resource.'
      };
    }
    if (
      note.programId &&
      viewer.programId &&
      note.programId !== viewer.programId &&
      !(Array.isArray(note.programIds) && note.programIds.includes(viewer.programId)) &&
      note.uploaderId !== viewer.id
    ) {
      return {
        accessible: false,
        reason: `Restricted to ${note.programName || 'enrolled program'} cohort members.`
      };
    }
  }

  return { accessible: true };
}

// ============================================================================
// COMPOSER DRAFT PERSISTENCE
// ============================================================================

export interface ForumPostDraft {
  title: string;
  postType: ForumPostType;
  topicId: ForumTopicId;
  body: string;
  resourceId: string;
  externalLink: string;
  programId: string;
  courseName: string;
  updatedAt: string;
}

export function saveForumPostDraft(userId: string | undefined, draft: Omit<ForumPostDraft, 'updatedAt'>): void {
  try {
    const key = `${STORAGE_KEY_POST_DRAFT}_${userId || 'guest'}`;
    localStorage.setItem(
      key,
      JSON.stringify({
        ...draft,
        updatedAt: new Date().toISOString()
      })
    );
  } catch {}
}

export function loadForumPostDraft(userId: string | undefined): ForumPostDraft | null {
  try {
    const key = `${STORAGE_KEY_POST_DRAFT}_${userId || 'guest'}`;
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function clearForumPostDraft(userId: string | undefined): void {
  try {
    const key = `${STORAGE_KEY_POST_DRAFT}_${userId || 'guest'}`;
    localStorage.removeItem(key);
  } catch {}
}

// ============================================================================
// FOLLOWED TOPICS FOR "FOR YOU" PERSONALIZATION
// ============================================================================

export function getFollowedForumTopics(userId?: string): ForumTopicId[] {
  try {
    const raw = localStorage.getItem(`${STORAGE_KEY_FOLLOWED_TOPICS}_${userId || 'guest'}`);
    if (raw) {
      return JSON.parse(raw);
    }
  } catch {}
  return [];
}

export function toggleFollowForumTopic(topicId: ForumTopicId, userId?: string): ForumTopicId[] {
  const current = getFollowedForumTopics(userId);
  const exists = current.includes(topicId);
  const next = exists ? current.filter(id => id !== topicId) : [...current, topicId];
  try {
    localStorage.setItem(`${STORAGE_KEY_FOLLOWED_TOPICS}_${userId || 'guest'}`, JSON.stringify(next));
  } catch {}
  return next;
}

// ============================================================================
// LOCAL PERSISTENT DATABASE MIRROR (ZERO MOCK DATA)
// ============================================================================

function getStoredPosts(): ForumPost[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_FORUM_POSTS);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch {}
  return [];
}

function saveStoredPosts(posts: ForumPost[]): void {
  try {
    localStorage.setItem(STORAGE_KEY_FORUM_POSTS, JSON.stringify(posts));
  } catch {}
}

function getStoredComments(): ForumComment[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_FORUM_COMMENTS);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch {}
  return [];
}

function saveStoredComments(comments: ForumComment[]): void {
  try {
    localStorage.setItem(STORAGE_KEY_FORUM_COMMENTS, JSON.stringify(comments));
  } catch {}
}

function getStoredVoteMap(): Record<string, 1 | -1> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_FORUM_VOTES);
    if (raw) return JSON.parse(raw);
  } catch {}
  return {};
}

function saveStoredVoteMap(map: Record<string, 1 | -1>): void {
  try {
    localStorage.setItem(STORAGE_KEY_FORUM_VOTES, JSON.stringify(map));
  } catch {}
}

function getStoredBookmarksMap(): Record<string, string[]> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_FORUM_BOOKMARKS);
    if (raw) return JSON.parse(raw);
  } catch {}
  return {};
}

function saveStoredBookmarksMap(map: Record<string, string[]>): void {
  try {
    localStorage.setItem(STORAGE_KEY_FORUM_BOOKMARKS, JSON.stringify(map));
  } catch {}
}

function getStoredReports(): ForumReport[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_FORUM_REPORTS);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch {}
  return [];
}

function saveStoredReports(reports: ForumReport[]): void {
  try {
    localStorage.setItem(STORAGE_KEY_FORUM_REPORTS, JSON.stringify(reports));
  } catch {}
}

// ============================================================================
// SUPABASE ROW MAPPERS
// ============================================================================

function mapRowToForumPost(
  row: any,
  userVote: 1 | -1 | 0 = 0,
  isBookmarked = false
): ForumPost {
  const topicObj = FORUM_TOPICS.find(t => t.id === row.topic_id) || FORUM_TOPICS[9];
  const upvotes = Number(row.upvotes_count ?? row.upvotes ?? 0);
  const downvotes = Number(row.downvotes_count ?? row.downvotes ?? 0);
  return {
    id: String(row.id),
    title: String(row.title || ''),
    body: String(row.body || ''),
    postType: (row.post_type as ForumPostType) || 'Discussion',
    topicId: (row.topic_id as ForumTopicId) || 'general-discussion',
    topicName: row.topic_name || topicObj.name,
    authorId: String(row.author_id || ''),
    authorName: String(row.author_name || 'Student Scholar'),
    authorUsername: String(row.author_username || 'student'),
    authorAvatar: row.author_avatar || undefined,
    authorProgram: row.author_program || undefined,
    authorDegreeTier: row.author_degree_tier || undefined,
    authorUniversity: row.author_university || undefined,
    authorBio: row.author_bio || undefined,
    resourceId: row.resource_id || null,
    programCourseRef: row.program_course_ref || null,
    externalLink: row.external_link || null,
    upvotesCount: upvotes,
    downvotesCount: downvotes,
    score: upvotes - downvotes,
    userVote,
    commentsCount: Number(row.comments_count ?? row.comment_count ?? 0),
    isBookmarked,
    acceptedCommentId: row.accepted_comment_id || null,
    status: row.status || 'published',
    idempotencyKey: row.idempotency_key || undefined,
    createdAt: row.created_at || new Date().toISOString(),
    updatedAt: row.updated_at || undefined
  };
}

function mapRowToForumComment(row: any, userVote: 1 | -1 | 0 = 0): ForumComment {
  const upvotes = Number(row.upvotes_count ?? row.upvotes ?? 0);
  const downvotes = Number(row.downvotes_count ?? row.downvotes ?? 0);
  const parentId = row.parent_comment_id ?? row.parent_id ?? null;
  return {
    id: String(row.id),
    postId: String(row.post_id),
    parentCommentId: parentId ? String(parentId) : null,
    body: String(row.body || ''),
    authorId: String(row.author_id || ''),
    authorName: String(row.author_name || 'Student Scholar'),
    authorUsername: String(row.author_username || 'student'),
    authorAvatar: row.author_avatar || undefined,
    authorProgram: row.author_program || undefined,
    authorDegreeTier: row.author_degree_tier || undefined,
    upvotesCount: upvotes,
    downvotesCount: downvotes,
    score: upvotes - downvotes,
    userVote,
    isAccepted: Boolean(row.is_accepted),
    status: row.status || 'published',
    createdAt: row.created_at || new Date().toISOString(),
    updatedAt: row.updated_at || undefined
  };
}

// ============================================================================
// FETCH FORUM POSTS & TOPIC COUNTS (REAL DATABASE DATA)
// ============================================================================

export async function fetchForumPosts(
  supabase: SupabaseClient | null,
  currentUserId?: string
): Promise<{ posts: ForumPost[]; error?: string }> {
  const sb = supabase ?? getSupabaseInstance();
  const voteMap = getStoredVoteMap();
  const bookmarksMap = getStoredBookmarksMap();
  const userBookmarks = new Set<string>(currentUserId ? bookmarksMap[currentUserId] || [] : []);

  const localPosts = getStoredPosts();
  const localComments = getStoredComments().filter(c => c.status !== 'removed');

  // Recompute accurate comment counts from real comments
  const commentCountsByPost = new Map<string, number>();
  localComments.forEach(c => {
    commentCountsByPost.set(c.postId, (commentCountsByPost.get(c.postId) || 0) + 1);
  });

  let syncErrorMsg: string | undefined;

  if (sb) {
    try {
      const { data: postRows, error: postError } = await sb
        .from('forum_posts')
        .select('*')
        .neq('status', 'removed')
        .order('created_at', { ascending: false });

      if (postError) {
        const classified = classifySupabaseError(postError, 'forum_posts');
        syncErrorMsg = classified.userMessage;
      } else if (postRows) {
        // Also fetch user's votes and bookmarks from Supabase if authenticated
        if (currentUserId) {
          const [postVotesRes, commentVotesRes, bookmarksRes] = await Promise.all([
            sb
              .from('forum_post_votes')
              .select('post_id, vote_type')
              .eq('user_id', currentUserId),
            sb
              .from('forum_comment_votes')
              .select('comment_id, vote_type')
              .eq('user_id', currentUserId),
            sb
              .from('forum_bookmarks')
              .select('post_id')
              .eq('user_id', currentUserId)
          ]);

          if (!postVotesRes.error && Array.isArray(postVotesRes.data)) {
            postVotesRes.data.forEach(v => {
              const key = `${currentUserId}::post::${v.post_id}`;
              if (v.vote_type === 1 || v.vote_type === -1) {
                voteMap[key] = v.vote_type;
              }
            });
          }

          if (!commentVotesRes.error && Array.isArray(commentVotesRes.data)) {
            commentVotesRes.data.forEach(v => {
              const key = `${currentUserId}::comment::${v.comment_id}`;
              if (v.vote_type === 1 || v.vote_type === -1) {
                voteMap[key] = v.vote_type;
              }
            });
          }

          saveStoredVoteMap(voteMap);

          if (!bookmarksRes.error && Array.isArray(bookmarksRes.data)) {
            bookmarksRes.data.forEach(b => userBookmarks.add(String(b.post_id)));
            bookmarksMap[currentUserId] = Array.from(userBookmarks);
            saveStoredBookmarksMap(bookmarksMap);
          }
        }

        const mergedById = new Map<string, ForumPost>();

        // Keep only explicitly unsynced local posts belonging to current user so deleted remote posts never resurrect
        localPosts
          .filter(p => p.status !== 'removed' && p.isUnsynced && (!currentUserId || p.authorId === currentUserId))
          .forEach(p => {
            const vKey = currentUserId ? `${currentUserId}::post::${p.id}` : '';
            const uv = (vKey ? voteMap[vKey] || 0 : 0) as -1 | 0 | 1;
            const liveComments = commentCountsByPost.get(p.id) ?? (p.commentsCount || 0);
            mergedById.set(p.id, {
              ...p,
              commentsCount: Math.max(p.commentsCount || 0, liveComments),
              score: (p.upvotesCount || 0) - (p.downvotesCount || 0),
              userVote: uv,
              isBookmarked: userBookmarks.has(p.id)
            });
          });

        postRows.forEach(row => {
          const id = String(row.id);
          const vKey = currentUserId ? `${currentUserId}::post::${id}` : '';
          const uv = vKey ? voteMap[vKey] || 0 : 0;
          const mapped = mapRowToForumPost(row, uv, userBookmarks.has(id));
          const liveComments = commentCountsByPost.get(id) ?? mapped.commentsCount;
          mergedById.set(id, {
            ...mapped,
            isUnsynced: false,
            syncError: undefined,
            commentsCount: Math.max(mapped.commentsCount, liveComments)
          });
        });

        const finalPosts = Array.from(mergedById.values()).sort(
          (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
        saveStoredPosts(finalPosts);
        return { posts: finalPosts };
      }
    } catch (err: any) {
      syncErrorMsg = err?.message || 'Unable to reach Supabase forum_posts table.';
    }
  }

  const hydratedLocal = localPosts
    .filter(p => p.status !== 'removed')
    .map(p => {
      const vKey = currentUserId ? `${currentUserId}::post::${p.id}` : '';
      const uv = (vKey ? voteMap[vKey] || 0 : 0) as -1 | 0 | 1;
      const realCommentCount = commentCountsByPost.has(p.id)
        ? Math.max(p.commentsCount || 0, commentCountsByPost.get(p.id)!)
        : p.commentsCount || 0;
      return {
        ...p,
        isUnsynced: true,
        syncError: syncErrorMsg,
        commentsCount: realCommentCount,
        score: (p.upvotesCount || 0) - (p.downvotesCount || 0),
        userVote: uv,
        isBookmarked: userBookmarks.has(p.id)
      };
    })
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  return { posts: hydratedLocal, error: syncErrorMsg };
}

export function computeRealTopicCounts(posts: ForumPost[]): Record<ForumTopicId, number> {
  const counts: Record<ForumTopicId, number> = {
    mathematics: 0,
    physics: 0,
    'computer-science': 0,
    engineering: 0,
    business: 0,
    'english-languages': 0,
    'study-tips': 0,
    'university-life': 0,
    'exam-preparation': 0,
    'general-discussion': 0
  };
  posts.forEach(p => {
    if (p.status !== 'removed' && counts[p.topicId] !== undefined) {
      counts[p.topicId] += 1;
    }
  });
  return counts;
}

// ============================================================================
// CREATE, EDIT & DELETE FORUM POSTS
// ============================================================================

export async function createForumPost(params: {
  supabase: SupabaseClient | null;
  author: StudentUser;
  title: string;
  body: string;
  postType: ForumPostType;
  topicId: ForumTopicId;
  resourceId?: string | null;
  programCourseRef?: ForumProgramCourseRef | null;
  externalLink?: string | null;
  idempotencyKey?: string;
  rawPayload?: Record<string, any>;
}): Promise<{ post?: ForumPost; error?: string }> {
  if (!params.author || params.author.isGuest) {
    return { error: 'Authentication is required to publish a forum post.' };
  }

  const validation = validateForumPostInput({
    title: params.title,
    body: params.body,
    postType: params.postType,
    topicId: params.topicId,
    externalLink: params.externalLink,
    resourceId: params.resourceId,
    rawPayload: params.rawPayload
  });

  if (!validation.valid) {
    return { error: validation.error };
  }

  // Duplicate submission & rate-limit protection
  const signature = `${params.author.id}::${validation.sanitizedTitle.toLowerCase()}::${validation.sanitizedBody.slice(0, 120).toLowerCase()}`;
  const lastSubmittedAt = recentSubmissionSignatures.get(signature);
  const now = Date.now();
  if (lastSubmittedAt && now - lastSubmittedAt < SUBMISSION_COOLDOWN_MS) {
    return { error: 'Please wait a moment before submitting the same post again.' };
  }

  const existingPosts = getStoredPosts();
  if (params.idempotencyKey) {
    const existingByIdempotency = existingPosts.find(
      p => p.idempotencyKey === params.idempotencyKey && p.authorId === params.author.id
    );
    if (existingByIdempotency) {
      return { post: existingByIdempotency };
    }
  }

  recentSubmissionSignatures.set(signature, now);

  const topicObj = FORUM_TOPICS.find(t => t.id === params.topicId) || FORUM_TOPICS[9];
  const cleanUsername =
    params.author.username ||
    params.author.email?.split('@')[0]?.replace(/[^a-zA-Z0-9_.-]/g, '') ||
    'scholar';

  const postId =
    typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
      ? crypto.randomUUID()
      : `fpost-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

  const nowIso = new Date().toISOString();

  const newPost: ForumPost = {
    id: postId,
    title: validation.sanitizedTitle,
    body: validation.sanitizedBody,
    postType: params.postType,
    topicId: params.topicId,
    topicName: topicObj.name,
    authorId: params.author.id,
    authorName: params.author.name || cleanUsername,
    authorUsername: cleanUsername,
    authorAvatar: params.author.avatarUrl,
    authorProgram: params.author.program || params.author.majorOrField,
    authorDegreeTier: params.author.degreeTier,
    authorUniversity: params.author.university,
    authorBio: params.author.bio,
    resourceId: params.resourceId || null,
    programCourseRef: params.programCourseRef || null,
    externalLink: validation.sanitizedExternalLink,
    upvotesCount: 1,
    downvotesCount: 0,
    score: 1,
    userVote: 1,
    commentsCount: 0,
    isBookmarked: false,
    acceptedCommentId: null,
    status: 'published',
    idempotencyKey: params.idempotencyKey,
    createdAt: nowIso,
    updatedAt: nowIso
  };

  // Record author's initial upvote
  const voteMap = getStoredVoteMap();
  voteMap[`${params.author.id}::post::${postId}`] = 1;
  saveStoredVoteMap(voteMap);

  const sb = params.supabase ?? getSupabaseInstance();
  let syncedToDb = false;
  let syncWarning: string | undefined;

  if (sb) {
    try {
      const insertPayload = {
        id: postId,
        title: newPost.title,
        body: newPost.body,
        post_type: newPost.postType,
        topic_id: newPost.topicId,
        topic_name: newPost.topicName,
        author_id: newPost.authorId,
        author_name: newPost.authorName,
        author_username: newPost.authorUsername,
        author_avatar: newPost.authorAvatar || null,
        author_program: newPost.authorProgram || null,
        author_degree_tier: newPost.authorDegreeTier || null,
        author_university: newPost.authorUniversity || null,
        resource_id: newPost.resourceId || null,
        program_course_ref: newPost.programCourseRef || null,
        external_link: newPost.externalLink || null,
        upvotes_count: 1,
        downvotes_count: 0,
        comments_count: 0,
        status: 'published',
        idempotency_key: newPost.idempotencyKey || null
      };

      let { data, error } = await sb
        .from('forum_posts')
        .insert(insertPayload)
        .select('*')
        .single();

      // If forum_topics isn't seeded yet (FK 23503), seed FORUM_TOPICS and retry
      if (error && error.code === '23503') {
        await sb
          .from('forum_topics')
          .upsert(
            FORUM_TOPICS.map(t => ({
              id: t.id,
              name: t.name,
              slug: t.slug,
              description: t.description
            })),
            { onConflict: 'id' }
          )
          .then(() => {}, () => {});
        const retryRes = await sb.from('forum_posts').insert(insertPayload).select('*').single();
        data = retryRes.data;
        error = retryRes.error;
      }

      if (error) {
        const classified = classifySupabaseError(error, 'forum_posts');
        if (classified.category === 'permission_denied') {
          return { error: classified.userMessage };
        }
        syncWarning = classified.userMessage;
      } else if (data) {
        syncedToDb = true;
        await sb
          .from('forum_post_votes')
          .upsert(
            {
              post_id: postId,
              user_id: params.author.id,
              vote_type: 1
            },
            { onConflict: 'post_id,user_id' }
          )
          .then(() => {}, () => {});
      }
    } catch (err: any) {
      syncWarning = err?.message || 'Could not persist forum post to Supabase.';
    }
  } else {
    syncWarning = 'Supabase client not connected; saved locally only.';
  }

  newPost.isUnsynced = !syncedToDb;
  newPost.syncError = syncWarning;

  const updatedPosts = [newPost, ...existingPosts.filter(p => p.id !== newPost.id)];
  saveStoredPosts(updatedPosts);
  clearForumPostDraft(params.author.id);

  return { post: newPost };
}

export async function updateForumPost(params: {
  supabase: SupabaseClient | null;
  user: StudentUser | null;
  postId: string;
  title: string;
  body: string;
  postType: ForumPostType;
  topicId: ForumTopicId;
  resourceId?: string | null;
  programCourseRef?: ForumProgramCourseRef | null;
  externalLink?: string | null;
}): Promise<{ post?: ForumPost; error?: string }> {
  if (!params.user || params.user.isGuest) {
    return { error: 'Authentication is required to edit a post.' };
  }

  const posts = getStoredPosts();
  const index = posts.findIndex(p => p.id === params.postId);
  if (index < 0) {
    return { error: 'Post not found.' };
  }

  const target = posts[index];
  if (target.authorId !== params.user.id) {
    return { error: 'Permission denied: You can only edit your own forum posts.' };
  }

  const validation = validateForumPostInput({
    title: params.title,
    body: params.body,
    postType: params.postType,
    topicId: params.topicId,
    externalLink: params.externalLink,
    resourceId: params.resourceId
  });

  if (!validation.valid) {
    return { error: validation.error };
  }

  const topicObj = FORUM_TOPICS.find(t => t.id === params.topicId) || FORUM_TOPICS[9];
  const updatedAt = new Date().toISOString();

  const updatedPost: ForumPost = {
    ...target,
    title: validation.sanitizedTitle,
    body: validation.sanitizedBody,
    postType: params.postType,
    topicId: params.topicId,
    topicName: topicObj.name,
    resourceId: params.resourceId ?? target.resourceId ?? null,
    programCourseRef: params.programCourseRef ?? target.programCourseRef ?? null,
    externalLink: validation.sanitizedExternalLink,
    updatedAt
  };

  const sb = params.supabase ?? getSupabaseInstance();
  if (sb) {
    try {
      const { error } = await sb
        .from('forum_posts')
        .update({
          title: updatedPost.title,
          body: updatedPost.body,
          post_type: updatedPost.postType,
          topic_id: updatedPost.topicId,
          topic_name: updatedPost.topicName,
          resource_id: updatedPost.resourceId,
          program_course_ref: updatedPost.programCourseRef,
          external_link: updatedPost.externalLink,
          updated_at: updatedAt
        })
        .eq('id', params.postId)
        .eq('author_id', params.user.id);

      if (error) {
        const classified = classifySupabaseError(error, 'forum_posts');
        if (classified.category === 'permission_denied') {
          return { error: classified.userMessage };
        }
      } else {
        updatedPost.isUnsynced = false;
        updatedPost.syncError = undefined;
      }
    } catch {}
  }

  posts[index] = updatedPost;
  saveStoredPosts(posts);

  return { post: updatedPost };
}

export async function deleteForumPost(params: {
  supabase: SupabaseClient | null;
  user: StudentUser | null;
  postId: string;
}): Promise<{ success: boolean; error?: string }> {
  if (!params.user || params.user.isGuest) {
    return { success: false, error: 'Authentication is required.' };
  }

  const posts = getStoredPosts();
  const target = posts.find(p => p.id === params.postId);
  if (!target) {
    return { success: false, error: 'Post not found.' };
  }

  if (target.authorId !== params.user.id && !isForumModerator(params.user)) {
    return { success: false, error: 'Permission denied: Only the author can delete this post.' };
  }

  const sb = params.supabase ?? getSupabaseInstance();
  if (sb) {
    try {
      let query = sb.from('forum_posts').delete().eq('id', params.postId);
      if (!isForumModerator(params.user)) {
        query = query.eq('author_id', params.user.id);
      }
      const { error } = await query;
      if (error) {
        const classified = classifySupabaseError(error, 'forum_posts');
        if (classified.category === 'permission_denied') {
          return { success: false, error: classified.userMessage };
        }
      }
    } catch {}
  }

  const remainingPosts = posts.filter(p => p.id !== params.postId);
  saveStoredPosts(remainingPosts);

  const remainingComments = getStoredComments().filter(c => c.postId !== params.postId);
  saveStoredComments(remainingComments);

  return { success: true };
}

// ============================================================================
// COMMENTS & NESTED REPLIES
// ============================================================================

export async function fetchForumComments(
  supabase: SupabaseClient | null,
  postId: string,
  currentUserId?: string
): Promise<ForumComment[]> {
  const sb = supabase ?? getSupabaseInstance();
  const voteMap = getStoredVoteMap();
  const localComments = getStoredComments().filter(
    c => c.postId === postId && c.status !== 'removed'
  );

  if (sb) {
    try {
      const { data, error } = await sb
        .from('forum_comments')
        .select('*')
        .eq('post_id', postId)
        .neq('status', 'removed')
        .order('created_at', { ascending: true });

      if (!error && data) {
        if (currentUserId && data.length > 0) {
          const commentIds = data.map(r => String(r.id));
          const { data: voteRows, error: voteErr } = await sb
            .from('forum_comment_votes')
            .select('comment_id, vote_type')
            .eq('user_id', currentUserId)
            .in('comment_id', commentIds);
          if (!voteErr && Array.isArray(voteRows)) {
            voteRows.forEach(v => {
              const key = `${currentUserId}::comment::${v.comment_id}`;
              if (v.vote_type === 1 || v.vote_type === -1) {
                voteMap[key] = v.vote_type;
              }
            });
            saveStoredVoteMap(voteMap);
          }
        }

        const merged = new Map<string, ForumComment>();
        // Keep only unsynced local comments for current user
        localComments
          .filter(c => c.isUnsynced && (!currentUserId || c.authorId === currentUserId))
          .forEach(c => {
            const vKey = currentUserId ? `${currentUserId}::comment::${c.id}` : '';
            merged.set(c.id, {
              ...c,
              score: (c.upvotesCount || 0) - (c.downvotesCount || 0),
              userVote: vKey ? voteMap[vKey] || 0 : 0
            });
          });
        data.forEach(row => {
          const cid = String(row.id);
          const vKey = currentUserId ? `${currentUserId}::comment::${cid}` : '';
          merged.set(cid, mapRowToForumComment(row, vKey ? voteMap[vKey] || 0 : 0));
        });

        const all = getStoredComments().filter(c => c.postId !== postId);
        const postList = Array.from(merged.values());
        saveStoredComments([...all, ...postList]);
        return postList;
      }
    } catch {}
  }

  return localComments.map(c => {
    const vKey = currentUserId ? `${currentUserId}::comment::${c.id}` : '';
    return {
      ...c,
      isUnsynced: true,
      score: (c.upvotesCount || 0) - (c.downvotesCount || 0),
      userVote: vKey ? voteMap[vKey] || 0 : 0
    };
  });
}

export async function createForumComment(params: {
  supabase: SupabaseClient | null;
  author: StudentUser;
  postId: string;
  parentCommentId?: string | null;
  body: string;
  rawPayload?: Record<string, any>;
}): Promise<{ comment?: ForumComment; error?: string }> {
  if (!params.author || params.author.isGuest) {
    return { error: 'Please sign in to post a comment or reply.' };
  }

  const validation = validateForumCommentInput(params.body, params.rawPayload);
  if (!validation.valid) {
    return { error: validation.error };
  }

  const sig = `${params.author.id}::${params.postId}::${validation.sanitizedBody.slice(0, 100).toLowerCase()}`;
  const now = Date.now();
  const prevTime = recentSubmissionSignatures.get(sig);
  if (prevTime && now - prevTime < 1800) {
    return { error: 'Duplicate comment prevented. Please wait a moment.' };
  }
  recentSubmissionSignatures.set(sig, now);

  // Enforce maximum nesting depth
  const allComments = getStoredComments();
  let effectiveParentId = params.parentCommentId || null;
  if (effectiveParentId) {
    let depth = 1;
    let cursor = allComments.find(c => c.id === effectiveParentId);
    while (cursor && cursor.parentCommentId && depth < FORUM_MAX_NESTING_DEPTH + 2) {
      depth += 1;
      if (depth >= FORUM_MAX_NESTING_DEPTH) {
        effectiveParentId = cursor.id;
        break;
      }
      cursor = allComments.find(c => c.id === cursor!.parentCommentId);
    }
  }

  const cleanUsername =
    params.author.username ||
    params.author.email?.split('@')[0]?.replace(/[^a-zA-Z0-9_.-]/g, '') ||
    'scholar';

  const commentId =
    typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
      ? crypto.randomUUID()
      : `fcomm-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

  const nowIso = new Date().toISOString();

  const newComment: ForumComment = {
    id: commentId,
    postId: params.postId,
    parentCommentId: effectiveParentId,
    body: validation.sanitizedBody,
    authorId: params.author.id,
    authorName: params.author.name || cleanUsername,
    authorUsername: cleanUsername,
    authorAvatar: params.author.avatarUrl,
    authorProgram: params.author.program || params.author.majorOrField,
    authorDegreeTier: params.author.degreeTier,
    upvotesCount: 1,
    downvotesCount: 0,
    score: 1,
    userVote: 1,
    isAccepted: false,
    status: 'published',
    createdAt: nowIso,
    updatedAt: nowIso
  };

  const voteMap = getStoredVoteMap();
  voteMap[`${params.author.id}::comment::${commentId}`] = 1;
  saveStoredVoteMap(voteMap);

  const sb = params.supabase ?? getSupabaseInstance();
  let syncedToDb = false;
  let syncWarning: string | undefined;

  if (sb) {
    try {
      const { error } = await sb.from('forum_comments').insert({
        id: commentId,
        post_id: newComment.postId,
        parent_comment_id: newComment.parentCommentId,
        parent_id: newComment.parentCommentId,
        body: newComment.body,
        author_id: newComment.authorId,
        author_name: newComment.authorName,
        author_username: newComment.authorUsername,
        author_avatar: newComment.authorAvatar || null,
        author_program: newComment.authorProgram || null,
        author_degree_tier: newComment.authorDegreeTier || null,
        upvotes_count: 1,
        upvotes: 1,
        downvotes_count: 0,
        downvotes: 0,
        is_accepted: false,
        status: 'published'
      });

      if (error) {
        const classified = classifySupabaseError(error, 'forum_comments');
        if (classified.category === 'permission_denied') {
          return { error: classified.userMessage };
        }
        syncWarning = classified.userMessage;
      } else {
        syncedToDb = true;
        await sb
          .from('forum_comment_votes')
          .upsert(
            {
              comment_id: commentId,
              user_id: params.author.id,
              vote_type: 1
            },
            { onConflict: 'comment_id,user_id' }
          )
          .then(() => {}, () => {});
      }
    } catch (err: any) {
      syncWarning = err?.message;
    }
  } else {
    syncWarning = 'Supabase client not connected; saved locally only.';
  }

  newComment.isUnsynced = !syncedToDb;
  newComment.syncError = syncWarning;

  const updatedComments = [...allComments, newComment];
  saveStoredComments(updatedComments);

  // Increment post comment count
  const posts = getStoredPosts();
  const postIdx = posts.findIndex(p => p.id === params.postId);
  if (postIdx >= 0) {
    const nextCount = updatedComments.filter(
      c => c.postId === params.postId && c.status !== 'removed'
    ).length;
    posts[postIdx] = {
      ...posts[postIdx],
      commentsCount: nextCount
    };
    saveStoredPosts(posts);
  }

  return { comment: newComment };
}

export async function updateForumComment(params: {
  supabase: SupabaseClient | null;
  user: StudentUser | null;
  commentId: string;
  body: string;
}): Promise<{ comment?: ForumComment; error?: string }> {
  if (!params.user || params.user.isGuest) {
    return { error: 'Authentication is required.' };
  }

  const validation = validateForumCommentInput(params.body);
  if (!validation.valid) {
    return { error: validation.error };
  }

  const comments = getStoredComments();
  const idx = comments.findIndex(c => c.id === params.commentId);
  if (idx < 0) {
    return { error: 'Comment not found.' };
  }

  if (comments[idx].authorId !== params.user.id) {
    return { error: 'Permission denied: You can only edit your own comments.' };
  }

  const updatedAt = new Date().toISOString();
  const updated: ForumComment = {
    ...comments[idx],
    body: validation.sanitizedBody,
    updatedAt
  };

  const sb = params.supabase ?? getSupabaseInstance();
  if (sb) {
    try {
      const { error } = await sb
        .from('forum_comments')
        .update({ body: updated.body, updated_at: updatedAt })
        .eq('id', params.commentId)
        .eq('author_id', params.user.id);
      if (error) {
        const classified = classifySupabaseError(error, 'forum_comments');
        if (classified.category === 'permission_denied') {
          return { error: classified.userMessage };
        }
      } else {
        updated.isUnsynced = false;
        updated.syncError = undefined;
      }
    } catch {}
  }

  comments[idx] = updated;
  saveStoredComments(comments);

  return { comment: updated };
}

export async function deleteForumComment(params: {
  supabase: SupabaseClient | null;
  user: StudentUser | null;
  commentId: string;
}): Promise<{ success: boolean; error?: string }> {
  if (!params.user || params.user.isGuest) {
    return { success: false, error: 'Authentication is required.' };
  }

  const comments = getStoredComments();
  const target = comments.find(c => c.id === params.commentId);
  if (!target) {
    return { success: false, error: 'Comment not found.' };
  }

  if (target.authorId !== params.user.id && !isForumModerator(params.user)) {
    return { success: false, error: 'Permission denied: Only the comment author can delete it.' };
  }

  // Delete comment and any nested child replies
  const toDeleteIds = new Set<string>([params.commentId]);
  let added = true;
  while (added) {
    added = false;
    comments.forEach(c => {
      if (c.parentCommentId && toDeleteIds.has(c.parentCommentId) && !toDeleteIds.has(c.id)) {
        toDeleteIds.add(c.id);
        added = true;
      }
    });
  }

  const sb = params.supabase ?? getSupabaseInstance();
  if (sb) {
    try {
      let query = sb.from('forum_comments').delete().eq('id', params.commentId);
      if (!isForumModerator(params.user)) {
        query = query.eq('author_id', params.user.id);
      }
      const { error } = await query;
      if (error) {
        const classified = classifySupabaseError(error, 'forum_comments');
        if (classified.category === 'permission_denied') {
          return { success: false, error: classified.userMessage };
        }
      }
    } catch {}
  }

  const remaining = comments.filter(c => !toDeleteIds.has(c.id));
  saveStoredComments(remaining);

  // Sync post comment count and acceptedCommentId
  const posts = getStoredPosts();
  const postIdx = posts.findIndex(p => p.id === target.postId);
  if (postIdx >= 0) {
    const nextCount = remaining.filter(
      c => c.postId === target.postId && c.status !== 'removed'
    ).length;
    const acceptedId =
      posts[postIdx].acceptedCommentId && toDeleteIds.has(posts[postIdx].acceptedCommentId!)
        ? null
        : posts[postIdx].acceptedCommentId;
    posts[postIdx] = {
      ...posts[postIdx],
      commentsCount: nextCount,
      acceptedCommentId: acceptedId
    };
    saveStoredPosts(posts);
  }

  return { success: true };
}

// ============================================================================
// ACCEPTED ANSWER FOR QUESTION POSTS
// ============================================================================

export async function toggleAcceptedForumAnswer(params: {
  supabase: SupabaseClient | null;
  user: StudentUser | null;
  postId: string;
  commentId: string;
}): Promise<{ acceptedCommentId: string | null; error?: string }> {
  if (!params.user || params.user.isGuest) {
    return { acceptedCommentId: null, error: 'Authentication is required.' };
  }

  const posts = getStoredPosts();
  const postIdx = posts.findIndex(p => p.id === params.postId);
  if (postIdx < 0) {
    return { acceptedCommentId: null, error: 'Post not found.' };
  }

  const post = posts[postIdx];
  if (post.authorId !== params.user.id) {
    return {
      acceptedCommentId: post.acceptedCommentId || null,
      error: 'Only the author of this question can mark an accepted answer.'
    };
  }

  if (post.postType !== 'Question') {
    return {
      acceptedCommentId: null,
      error: 'Accepted answers are only available for Question posts.'
    };
  }

  const nextAcceptedId = post.acceptedCommentId === params.commentId ? null : params.commentId;

  const sb = params.supabase ?? getSupabaseInstance();
  if (sb) {
    try {
      const { error } = await sb
        .from('forum_posts')
        .update({
          accepted_comment_id: nextAcceptedId,
          is_answered: Boolean(nextAcceptedId)
        })
        .eq('id', params.postId)
        .eq('author_id', params.user.id);
      if (error) {
        const classified = classifySupabaseError(error, 'forum_posts');
        if (classified.category === 'permission_denied') {
          return { acceptedCommentId: post.acceptedCommentId || null, error: classified.userMessage };
        }
      }
      await sb
        .from('forum_comments')
        .update({ is_accepted: false })
        .eq('post_id', params.postId)
        .then(() => {
          if (nextAcceptedId) {
            return sb
              .from('forum_comments')
              .update({ is_accepted: true })
              .eq('id', nextAcceptedId)
              .eq('post_id', params.postId);
          }
        }, () => {});
    } catch {}
  }

  posts[postIdx] = {
    ...post,
    acceptedCommentId: nextAcceptedId
  };
  saveStoredPosts(posts);

  const comments = getStoredComments().map(c => {
    if (c.postId !== params.postId) return c;
    return {
      ...c,
      isAccepted: c.id === nextAcceptedId
    };
  });
  saveStoredComments(comments);

  return { acceptedCommentId: nextAcceptedId };
}

// ============================================================================
// UPVOTE / DOWNVOTE SYSTEM (PREVENT MULTIPLE ACTIVE VOTES)
// ============================================================================

export async function voteOnForumTarget(params: {
  supabase: SupabaseClient | null;
  user: StudentUser | null;
  targetType: 'post' | 'comment';
  targetId: string;
  desiredVote: 1 | -1;
}): Promise<{
  upvotesCount: number;
  downvotesCount: number;
  score: number;
  userVote: 1 | -1 | 0;
  error?: string;
}> {
  if (!params.user || params.user.isGuest) {
    return {
      upvotesCount: 0,
      downvotesCount: 0,
      score: 0,
      userVote: 0,
      error: 'Please sign in to vote on posts and comments.'
    };
  }

  const voteMap = getStoredVoteMap();
  const voteKey = `${params.user.id}::${params.targetType}::${params.targetId}`;
  const currentVote: 1 | -1 | 0 = voteMap[voteKey] || 0;

  // Toggle off if clicking same vote, otherwise switch to desiredVote
  const nextVote: 1 | -1 | 0 = currentVote === params.desiredVote ? 0 : params.desiredVote;

  let upvotesDelta = 0;
  let downvotesDelta = 0;

  if (currentVote === 1) upvotesDelta -= 1;
  if (currentVote === -1) downvotesDelta -= 1;
  if (nextVote === 1) upvotesDelta += 1;
  if (nextVote === -1) downvotesDelta += 1;

  if (nextVote === 0) {
    delete voteMap[voteKey];
  } else {
    voteMap[voteKey] = nextVote;
  }
  saveStoredVoteMap(voteMap);

  let updatedUpvotes = 0;
  let updatedDownvotes = 0;

  if (params.targetType === 'post') {
    const posts = getStoredPosts();
    const idx = posts.findIndex(p => p.id === params.targetId);
    if (idx >= 0) {
      updatedUpvotes = Math.max(0, (posts[idx].upvotesCount || 0) + upvotesDelta);
      updatedDownvotes = Math.max(0, (posts[idx].downvotesCount || 0) + downvotesDelta);
      posts[idx] = {
        ...posts[idx],
        upvotesCount: updatedUpvotes,
        downvotesCount: updatedDownvotes,
        score: updatedUpvotes - updatedDownvotes,
        userVote: nextVote
      };
      saveStoredPosts(posts);
    }
  } else {
    const comments = getStoredComments();
    const idx = comments.findIndex(c => c.id === params.targetId);
    if (idx >= 0) {
      updatedUpvotes = Math.max(0, (comments[idx].upvotesCount || 0) + upvotesDelta);
      updatedDownvotes = Math.max(0, (comments[idx].downvotesCount || 0) + downvotesDelta);
      comments[idx] = {
        ...comments[idx],
        upvotesCount: updatedUpvotes,
        downvotesCount: updatedDownvotes,
        score: updatedUpvotes - updatedDownvotes,
        userVote: nextVote
      };
      saveStoredComments(comments);
    }
  }

  const sb = params.supabase ?? getSupabaseInstance();
  if (sb) {
    try {
      if (params.targetType === 'post') {
        if (nextVote === 0) {
          await sb
            .from('forum_post_votes')
            .delete()
            .eq('user_id', params.user.id)
            .eq('post_id', params.targetId);
        } else {
          await sb.from('forum_post_votes').upsert(
            {
              post_id: params.targetId,
              user_id: params.user.id,
              vote_type: nextVote
            },
            { onConflict: 'post_id,user_id' }
          );
        }
      } else {
        if (nextVote === 0) {
          await sb
            .from('forum_comment_votes')
            .delete()
            .eq('user_id', params.user.id)
            .eq('comment_id', params.targetId);
        } else {
          await sb.from('forum_comment_votes').upsert(
            {
              comment_id: params.targetId,
              user_id: params.user.id,
              vote_type: nextVote
            },
            { onConflict: 'comment_id,user_id' }
          );
        }
      }
    } catch {}
  }

  return {
    upvotesCount: updatedUpvotes,
    downvotesCount: updatedDownvotes,
    score: updatedUpvotes - updatedDownvotes,
    userVote: nextVote
  };
}

// ============================================================================
// BOOKMARKS / SAVED POSTS
// ============================================================================

export async function toggleForumBookmark(params: {
  supabase: SupabaseClient | null;
  user: StudentUser | null;
  postId: string;
}): Promise<{ isBookmarked: boolean; error?: string }> {
  if (!params.user || params.user.isGuest) {
    return { isBookmarked: false, error: 'Please sign in to save posts to your bookmarks.' };
  }

  const bookmarksMap = getStoredBookmarksMap();
  const currentList = new Set<string>(bookmarksMap[params.user.id] || []);
  const wasBookmarked = currentList.has(params.postId);

  if (wasBookmarked) {
    currentList.delete(params.postId);
  } else {
    currentList.add(params.postId);
  }

  bookmarksMap[params.user.id] = Array.from(currentList);
  saveStoredBookmarksMap(bookmarksMap);

  const isBookmarked = !wasBookmarked;

  const sb = params.supabase ?? getSupabaseInstance();
  if (sb) {
    try {
      if (isBookmarked) {
        await sb.from('forum_bookmarks').upsert(
          {
            user_id: params.user.id,
            post_id: params.postId
          },
          { onConflict: 'user_id,post_id' }
        );
      } else {
        await sb
          .from('forum_bookmarks')
          .delete()
          .eq('user_id', params.user.id)
          .eq('post_id', params.postId);
      }
    } catch {}
  }

  return { isBookmarked };
}

// ============================================================================
// REPORTING & MODERATION
// ============================================================================

export function isForumModerator(user: StudentUser | null | undefined): boolean {
  if (!user || user.isGuest) return false;
  return Boolean(
    user.isModerator === true ||
      user.moderatorRole === 'moderator' ||
      user.moderatorRole === 'admin'
  );
}

export async function submitForumReport(params: {
  supabase: SupabaseClient | null;
  reporter: StudentUser | null;
  targetType: 'post' | 'comment';
  targetId: string;
  postId: string;
  targetTitleOrSnippet: string;
  reason: ForumReportReason;
  details?: string;
}): Promise<{ success: boolean; error?: string }> {
  if (!params.reporter || params.reporter.isGuest) {
    return { success: false, error: 'Please sign in to report content.' };
  }

  const cleanDetails = sanitizeForumText(params.details || '').slice(0, 500);
  const reports = getStoredReports();

  // Prevent duplicate pending reports from the same user on the same target
  const existing = reports.find(
    r =>
      r.reporterId === params.reporter!.id &&
      r.targetType === params.targetType &&
      r.targetId === params.targetId &&
      r.status === 'pending'
  );
  if (existing) {
    return { success: false, error: 'You have already submitted a report for this item.' };
  }

  const reportId =
    typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
      ? crypto.randomUUID()
      : `frep-${Date.now()}`;

  const newReport: ForumReport = {
    id: reportId,
    targetType: params.targetType,
    targetId: params.targetId,
    postId: params.postId,
    targetTitleOrSnippet: sanitizeForumText(params.targetTitleOrSnippet).slice(0, 140),
    reporterId: params.reporter.id,
    reporterUsername: params.reporter.username || params.reporter.name || 'student',
    reason: params.reason,
    details: cleanDetails || undefined,
    status: 'pending',
    createdAt: new Date().toISOString()
  };

  const sb = params.supabase ?? getSupabaseInstance();
  if (sb) {
    try {
      await sb.from('forum_reports').insert({
        id: reportId,
        target_type: newReport.targetType,
        target_id: newReport.targetId,
        post_id: newReport.postId,
        target_snippet: newReport.targetTitleOrSnippet,
        reporter_id: newReport.reporterId,
        reporter_username: newReport.reporterUsername,
        reason: newReport.reason,
        details: newReport.details || null,
        status: 'pending'
      });
    } catch {}
  }

  reports.unshift(newReport);
  saveStoredReports(reports);
  return { success: true };
}

export async function fetchForumModerationReports(
  supabase: SupabaseClient | null,
  viewer: StudentUser | null
): Promise<ForumReport[]> {
  if (!isForumModerator(viewer)) {
    return [];
  }

  const localReports = getStoredReports();
  const sb = supabase ?? getSupabaseInstance();
  if (sb) {
    try {
      const { data, error } = await sb
        .from('forum_reports')
        .select('*')
        .order('created_at', { ascending: false });

      if (!error && Array.isArray(data)) {
        const merged = new Map<string, ForumReport>();
        localReports.forEach(r => merged.set(r.id, r));
        data.forEach(row => {
          merged.set(String(row.id), {
            id: String(row.id),
            targetType: row.target_type,
            targetId: String(row.target_id),
            postId: String(row.post_id),
            targetTitleOrSnippet: String(row.target_snippet || ''),
            reporterId: String(row.reporter_id || ''),
            reporterUsername: String(row.reporter_username || 'student'),
            reason: row.reason as ForumReportReason,
            details: row.details || undefined,
            status: row.status || 'pending',
            createdAt: row.created_at || new Date().toISOString(),
            reviewedBy: row.reviewed_by || undefined,
            reviewedAt: row.reviewed_at || undefined
          });
        });
        const list = Array.from(merged.values()).sort(
          (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
        saveStoredReports(list);
        return list;
      }
    } catch {}
  }

  return localReports;
}

export async function resolveForumReport(params: {
  supabase: SupabaseClient | null;
  moderator: StudentUser | null;
  reportId: string;
  action: 'keep' | 'remove';
}): Promise<{ success: boolean; error?: string }> {
  if (!isForumModerator(params.moderator)) {
    return { success: false, error: 'Unauthorized: Moderator privileges are required.' };
  }

  const reports = getStoredReports();
  const idx = reports.findIndex(r => r.id === params.reportId);
  if (idx < 0) {
    return { success: false, error: 'Report not found.' };
  }

  const report = reports[idx];
  const nextStatus = params.action === 'remove' ? 'reviewed_removed' : 'reviewed_kept';
  const reviewedAt = new Date().toISOString();

  reports[idx] = {
    ...report,
    status: nextStatus,
    reviewedBy: params.moderator!.username || params.moderator!.name,
    reviewedAt
  };
  saveStoredReports(reports);

  if (params.action === 'remove') {
    if (report.targetType === 'post') {
      const posts = getStoredPosts().map(p =>
        p.id === report.targetId ? { ...p, status: 'removed' as const } : p
      );
      saveStoredPosts(posts);
    } else {
      const comments = getStoredComments().map(c =>
        c.id === report.targetId ? { ...c, status: 'removed' as const } : c
      );
      saveStoredComments(comments);
    }
  }

  const sb = params.supabase ?? getSupabaseInstance();
  if (sb) {
    try {
      await sb
        .from('forum_reports')
        .update({
          status: nextStatus,
          reviewed_by: params.moderator!.id,
          reviewed_at: reviewedAt
        })
        .eq('id', params.reportId);

      if (params.action === 'remove') {
        const table = report.targetType === 'post' ? 'forum_posts' : 'forum_comments';
        await sb
          .from(table)
          .update({ status: 'removed' })
          .eq('id', report.targetId);
      }
    } catch {}
  }

  return { success: true };
}
