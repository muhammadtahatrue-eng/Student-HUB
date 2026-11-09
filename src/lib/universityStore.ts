import { SupabaseClient } from '@supabase/supabase-js';
import {
  University,
  Department,
  Course,
  DiscussionPost,
  DiscussionComment,
  DiscussionCategory,
  DoubtQuestion,
  DoubtAnswer,
  StudyNote,
  StudentUser
} from '../types/index.ts';
import {
  HEC_MASTER_UNIVERSITIES,
  INITIAL_DEPARTMENTS,
  INITIAL_COURSES,
  INITIAL_DISCUSSIONS,
  INITIAL_DOUBTS
} from '../data/universityData.ts';
import { getSupabaseInstance } from './supabaseClient.ts';

const STORAGE_KEY_CUSTOM_UNIS = 'xeusar_custom_universities_v3';
const STORAGE_KEY_ENROLLMENTS = 'xeusar_student_enrollments_v3';
const STORAGE_KEY_FOLLOWED = 'xeusar_followed_universities_v3';
const STORAGE_KEY_DISCUSSIONS = 'xeusar_discussions_v3';
const STORAGE_KEY_DOUBTS = 'xeusar_doubts_v3';
const STORAGE_KEY_UPVOTED_ITEMS = 'xeusar_community_upvotes_v3';

function isUuidString(val?: string | null): boolean {
  if (!val) return false;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(val.trim());
}

function getActiveUserIdFromStorage(): string | undefined {
  try {
    const rawUser = localStorage.getItem('studyvault_active_user');
    if (rawUser) {
      const parsed = JSON.parse(rawUser);
      if (parsed?.id) return String(parsed.id);
    }
  } catch {}
  return undefined;
}

// Zero hardcoded enrollments — counts increment only when real students register
const INITIAL_STUDENT_ENROLLMENTS: Record<string, number> = {};

// ============================================================================
// STUDENT ENROLLMENT & DYNAMIC UNLOCK TRACKING
// ============================================================================

export function getStudentEnrollments(): Record<string, number> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_ENROLLMENTS);
    if (raw) {
      return { ...INITIAL_STUDENT_ENROLLMENTS, ...JSON.parse(raw) };
    }
  } catch {}
  return { ...INITIAL_STUDENT_ENROLLMENTS };
}

export function saveStudentEnrollments(enrollments: Record<string, number>): void {
  try {
    localStorage.setItem(STORAGE_KEY_ENROLLMENTS, JSON.stringify(enrollments));
  } catch {}
}

export function getStudentCountForUniversity(universityId: string): number {
  const enrollments = getStudentEnrollments();
  let count = enrollments[universityId] || 0;
  try {
    const rawUser = localStorage.getItem('studyvault_active_user');
    if (rawUser) {
      const user = JSON.parse(rawUser);
      if (user.universityId === universityId) {
        count = Math.max(count, 1);
      }
    }
  } catch {}
  return count;
}

export function isUniversityUnlocked(universityId: string): boolean {
  return getStudentCountForUniversity(universityId) >= 1;
}

// ============================================================================
// HEC UNIVERSITIES & CUSTOM UNIVERSITIES MANAGEMENT
// ============================================================================

export function getCustomUniversities(): University[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_CUSTOM_UNIS);
    if (raw) {
      return JSON.parse(raw);
    }
  } catch {}
  return [];
}

export function saveCustomUniversities(customUnis: University[]): void {
  try {
    localStorage.setItem(STORAGE_KEY_CUSTOM_UNIS, JSON.stringify(customUnis));
  } catch {}
}

export function getAllHecUniversities(): University[] {
  const customUnis = getCustomUniversities();
  const enrollments = getStudentEnrollments();

  return [...HEC_MASTER_UNIVERSITIES, ...customUnis].map(uni => {
    const activeStudents = enrollments[uni.id] ?? (uni.verifiedStudents || 0);
    return {
      ...uni,
      verifiedStudents: activeStudents
    };
  });
}

/**
 * Dynamic Visibility Rule for Explore Directory:
 * A university card must only appear in the global Explore grid if AT LEAST 1 student
 * has successfully registered and mapped themselves to that specific university.
 */
export function getUnlockedUniversities(): University[] {
  const allUnis = getAllHecUniversities();
  return allUnis.filter(uni => isUniversityUnlocked(uni.id));
}

// Alias for backwards compatibility
export function getUniversities(): University[] {
  return getUnlockedUniversities();
}

export function getUniversityById(id: string): University | null {
  if (!id) return null;
  const allUnis = getAllHecUniversities();
  return (
    allUnis.find(
      u =>
        u.id.toLowerCase() === id.toLowerCase() ||
        u.name.toLowerCase() === id.toLowerCase() ||
        u.shortName.toLowerCase() === id.toLowerCase()
    ) || null
  );
}

export function findUniversityByNameOrFuzzy(name: string): University | null {
  if (!name) return null;
  const clean = name.toLowerCase().trim();
  const allUnis = getAllHecUniversities();

  return (
    allUnis.find(
      u =>
        u.name.toLowerCase() === clean ||
        u.shortName.toLowerCase() === clean ||
        u.id.toLowerCase() === clean ||
        u.name.toLowerCase().includes(clean) ||
        clean.includes(u.name.toLowerCase()) ||
        clean.includes(u.shortName.toLowerCase())
    ) || null
  );
}

export function registerCustomUniversity(details: {
  name: string;
  city?: string;
  province?: string;
  sector?: 'Public' | 'Private';
  studentId?: string;
}): University {
  const cleanName = details.name.trim();
  const slug = `custom-${cleanName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') || Date.now()}`;

  const existingCustom = getCustomUniversities();
  const found = existingCustom.find(u => u.id === slug || u.name.toLowerCase() === cleanName.toLowerCase());
  if (found) {
    registerStudentToUniversity(details.studentId || 'current-user', found.id);
    return found;
  }

  const newCustomUni: University = {
    id: slug,
    name: cleanName,
    shortName: cleanName.split(' ').map(w => w[0]).join('').slice(0, 8).toUpperCase() || 'INST',
    sector: details.sector || 'Private',
    province: details.province || 'Other / Regional',
    city: details.city || 'Pakistan',
    location: `${details.city || 'Campus'}, ${details.province || 'Pakistan'}`,
    country: 'Pakistan',
    badge: 'Community Added (Pending HEC Verification)',
    logoUrl: 'https://images.unsplash.com/photo-1541339907198-e08756dedf3f?w=160&auto=format&fit=crop&q=80',
    bannerUrl: 'https://images.unsplash.com/photo-1541339907198-e08756dedf3f?w=1200&auto=format&fit=crop&q=80',
    disciplines: ['General Studies', 'Computer Science', 'Commerce'],
    website: 'https://hec.gov.pk',
    establishedYear: new Date().getFullYear(),
    verifiedStudents: 1, // Automatically unlocked by registering student!
    totalCoursesCount: 0,
    description: `Academic directory for ${cleanName}. Pending official HEC verification check. Created and verified by active student membership.`,
    hecRecognized: false,
    isCustom: true,
    status: 'pending',
    createdByStudentId: details.studentId,
    isMemberRestricted: false
  };

  const updatedCustom = [...existingCustom, newCustomUni];
  saveCustomUniversities(updatedCustom);
  registerStudentToUniversity(details.studentId || 'current-user', slug);

  const sb = getSupabaseInstance();
  if (sb && isUuidString(details.studentId)) {
    ensureUniversityExistsInSupabase(sb, newCustomUni, details.studentId).catch(() => {});
  }

  return newCustomUni;
}

export async function ensureUniversityExistsInSupabase(
  supabaseClient: SupabaseClient | null,
  universityOrId: University | string | null | undefined,
  userId?: string | null
): Promise<boolean> {
  if (!supabaseClient || !universityOrId) return false;
  const uni =
    typeof universityOrId === 'string'
      ? getUniversityById(universityOrId) || findUniversityByNameOrFuzzy(universityOrId)
      : universityOrId;
  if (!uni || !uni.id) return false;

  try {
    const { data: existing } = await supabaseClient
      .from('universities')
      .select('id')
      .eq('id', uni.id)
      .maybeSingle();
    if (existing?.id) return true;

    const cleanUid = isUuidString(userId) ? userId!.trim() : undefined;
    const payload: Record<string, any> = {
      id: uni.id,
      name: uni.name,
      short_name: uni.shortName || '',
      slug: uni.id,
      location: uni.location || uni.city || 'Pakistan',
      country: uni.country || 'Pakistan',
      website: uni.website || '',
      description: uni.description || '',
      logo_url: uni.logoUrl || '',
      banner_url: uni.bannerUrl || '',
      type: (uni.sector || 'public').toLowerCase(),
      access_scope: uni.isMemberRestricted ? 'members_only' : 'public'
    };
    if (cleanUid) {
      payload.created_by = cleanUid;
    }

    const { error } = await supabaseClient
      .from('universities')
      .upsert([payload], { onConflict: 'id', ignoreDuplicates: true });
    return !error;
  } catch {
    return false;
  }
}

export function registerStudentToUniversity(studentId: string, universityId: string): void {
  const enrollments = getStudentEnrollments();
  const currentCount = enrollments[universityId] || 0;
  enrollments[universityId] = Math.max(1, currentCount + 1);
  saveStudentEnrollments(enrollments);
}

// ============================================================================
// FOLLOWED UNIVERSITIES (SCOPED BY USER ID)
// ============================================================================

function getFollowedUniversitiesStorageKey(userId?: string): string {
  const effectiveUserId = userId || getActiveUserIdFromStorage();
  return effectiveUserId ? `${STORAGE_KEY_FOLLOWED}_${effectiveUserId}` : STORAGE_KEY_FOLLOWED;
}

export function getFollowedUniversityIds(userId?: string): string[] {
  try {
    const raw = localStorage.getItem(getFollowedUniversitiesStorageKey(userId));
    if (raw) {
      return JSON.parse(raw);
    }
  } catch {}
  return [];
}

export function toggleFollowUniversity(
  universityId: string,
  userId?: string
): { followed: boolean; followedIds: string[] } {
  const current = getFollowedUniversityIds(userId);
  const index = current.indexOf(universityId);
  let updated: string[];
  let followed: boolean;

  if (index >= 0) {
    updated = current.filter(id => id !== universityId);
    followed = false;
  } else {
    updated = [...current, universityId];
    followed = true;
  }

  try {
    localStorage.setItem(getFollowedUniversitiesStorageKey(userId), JSON.stringify(updated));
  } catch {}

  return { followed, followedIds: updated };
}

export function isFollowingUniversity(universityId: string, userId?: string): boolean {
  return getFollowedUniversityIds(userId).includes(universityId);
}

// ============================================================================
// REAL-TIME STATS (NO FABRICATION)
// ============================================================================

export function getUniversityRealStats(
  university: University,
  notes: StudyNote[]
): {
  documentsCount: number;
  coursesCount: number;
  discussionsCount: number;
  doubtsCount: number;
  studentsCount: number;
} {
  const matchingNotes = notes.filter(n => {
    if (n.universityId && n.universityId.toLowerCase() === university.id.toLowerCase()) return true;
    if (n.uploaderUniversity) {
      const uName = university.name.toLowerCase();
      const nUni = n.uploaderUniversity.toLowerCase();
      if (nUni === uName || (university.shortName && nUni.includes(university.shortName.toLowerCase()))) {
        return true;
      }
    }
    return false;
  });

  const allCourses = getCoursesByUniversity(university.id);
  const allDiscussions = getDiscussionsByUniversity(university.id);
  const allDoubts = getDoubtsByUniversity(university.id);
  const studentsCount = getStudentCountForUniversity(university.id);

  return {
    documentsCount: matchingNotes.length,
    coursesCount: allCourses.length,
    discussionsCount: allDiscussions.length,
    doubtsCount: allDoubts.length,
    studentsCount
  };
}

export function getUniversityRealResourceCounts(
  universityId: string,
  notes: StudyNote[]
): {
  documentsCount: number;
  coursesCount: number;
  discussionsCount: number;
  doubtsCount: number;
  totalDownloads: number;
} {
  const uni = getUniversityById(universityId);
  if (!uni) {
    return { documentsCount: 0, coursesCount: 0, discussionsCount: 0, doubtsCount: 0, totalDownloads: 0 };
  }
  const matchingNotes = notes.filter(n => {
    if (n.universityId && n.universityId.toLowerCase() === uni.id.toLowerCase()) return true;
    if (n.uploaderUniversity) {
      const uName = uni.name.toLowerCase();
      const nUni = n.uploaderUniversity.toLowerCase();
      if (nUni === uName || (uni.shortName && nUni.includes(uni.shortName.toLowerCase()))) {
        return true;
      }
    }
    return false;
  });

  const allCourses = getCoursesByUniversity(uni.id);
  const allDiscussions = getDiscussionsByUniversity(uni.id);
  const allDoubts = getDoubtsByUniversity(uni.id);
  const totalDownloads = matchingNotes.reduce((sum, n) => sum + (n.downloadsCount || 0), 0);

  return {
    documentsCount: matchingNotes.length,
    coursesCount: allCourses.length,
    discussionsCount: allDiscussions.length,
    doubtsCount: allDoubts.length,
    totalDownloads
  };
}

// ============================================================================
// DEPARTMENTS & COURSES
// ============================================================================

export function getDepartmentsByUniversity(universityId: string): Department[] {
  return INITIAL_DEPARTMENTS.filter(
    d => d.universityId.toLowerCase() === universityId.toLowerCase()
  );
}

export function getCoursesByUniversity(universityId: string): Course[] {
  return INITIAL_COURSES.filter(
    c => c.universityId.toLowerCase() === universityId.toLowerCase()
  );
}

export function getCoursesByDepartment(departmentId: string): Course[] {
  return INITIAL_COURSES.filter(c => c.departmentId === departmentId);
}

// ============================================================================
// DISCUSSIONS
// ============================================================================

export function getDiscussionsByUniversity(
  universityId: string,
  options?: {
    category?: DiscussionCategory | 'all';
    searchQuery?: string;
    sortBy?: 'latest' | 'popular';
  }
): DiscussionPost[] {
  let allPosts: DiscussionPost[] = INITIAL_DISCUSSIONS;
  try {
    const raw = localStorage.getItem(STORAGE_KEY_DISCUSSIONS);
    if (raw) {
      const stored = JSON.parse(raw);
      const ids = new Set(stored.map((p: DiscussionPost) => p.id));
      const filteredInit = INITIAL_DISCUSSIONS.filter(p => !ids.has(p.id));
      allPosts = [...stored, ...filteredInit];
    }
  } catch {}

  let filtered = allPosts.filter(
    p => p.universityId.toLowerCase() === universityId.toLowerCase()
  );

  if (options?.category && options.category !== 'all') {
    filtered = filtered.filter(p => p.category === options.category);
  }

  if (options?.searchQuery?.trim()) {
    const q = options.searchQuery.toLowerCase().trim();
    filtered = filtered.filter(
      p =>
        p.title.toLowerCase().includes(q) ||
        p.content.toLowerCase().includes(q) ||
        (p.courseTag && p.courseTag.toLowerCase().includes(q))
    );
  }

  if (options?.sortBy === 'popular') {
    filtered.sort((a, b) => b.upvotesCount - a.upvotesCount);
  } else {
    filtered.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  return filtered;
}

export function saveAllDiscussions(discussions: DiscussionPost[]): void {
  try {
    localStorage.setItem(STORAGE_KEY_DISCUSSIONS, JSON.stringify(discussions));
  } catch {}
}

export function addDiscussionPost(
  universityId: string,
  payload: {
    title: string;
    content: string;
    category: DiscussionCategory;
    courseTag?: string;
    authorName: string;
    authorId?: string;
    authorAvatar?: string;
    authorMajor?: string;
    authorUniversity: string;
  }
): DiscussionPost {
  const newPost: DiscussionPost = {
    id: `disc-${Date.now()}`,
    universityId,
    title: payload.title.trim(),
    content: payload.content.trim(),
    category: payload.category,
    courseTag: payload.courseTag?.trim() || undefined,
    authorId: payload.authorId || `guest-${Date.now()}`,
    authorName: payload.authorName,
    authorAvatar: payload.authorAvatar,
    authorMajor: payload.authorMajor || 'Student Member',
    authorUniversity: payload.authorUniversity,
    createdAt: new Date().toISOString(),
    upvotesCount: 1,
    hasUpvoted: true,
    commentsCount: 0,
    comments: [],
    isPinned: false
  };

  const current = getDiscussionsByUniversity(universityId);
  const raw = localStorage.getItem(STORAGE_KEY_DISCUSSIONS);
  let all: DiscussionPost[] = INITIAL_DISCUSSIONS;
  if (raw) {
    try {
      all = JSON.parse(raw);
    } catch {}
  }
  const merged = [newPost, ...all.filter(p => p.id !== newPost.id)];
  saveAllDiscussions(merged);

  const sb = getSupabaseInstance();
  if (sb && isUuidString(payload.authorId)) {
    (async () => {
      await ensureUniversityExistsInSupabase(sb, newPost.universityId, payload.authorId);
      const tags = [
        newPost.courseTag ? `course:${newPost.courseTag}` : '',
        newPost.authorMajor ? `major:${newPost.authorMajor}` : '',
        newPost.authorUniversity ? `uni:${newPost.authorUniversity}` : ''
      ].filter(Boolean);
      const { error } = await sb.from('university_discussions').insert([
        {
          id: newPost.id,
          university_id: newPost.universityId,
          title: newPost.title,
          content: newPost.content,
          category: newPost.category,
          tags,
          author_id: payload.authorId,
          author_name: newPost.authorName,
          author_avatar: newPost.authorAvatar || '',
          is_pinned: false
        }
      ]);
      if (!error) {
        await sb.rpc('toggle_community_vote', {
          p_item_type: 'university_discussion',
          p_item_id: newPost.id,
          p_vote: 1
        });
      }
    })().catch(() => {});
  }

  return newPost;
}

export function createDiscussionPost(payload: {
  universityId: string;
  title: string;
  content: string;
  category: DiscussionCategory;
  courseTag?: string;
  user: StudentUser;
}): DiscussionPost {
  return addDiscussionPost(payload.universityId, {
    title: payload.title,
    content: payload.content,
    category: payload.category,
    courseTag: payload.courseTag,
    authorName: payload.user.name,
    authorId: payload.user.id,
    authorAvatar: payload.user.avatarUrl,
    authorMajor: payload.user.majorOrField,
    authorUniversity: payload.user.university || 'General Campus'
  });
}

export function addDiscussionComment(
  postId: string,
  payload: {
    content: string;
    authorName: string;
    authorId?: string;
    authorAvatar?: string;
    authorUniversity: string;
  }
): DiscussionComment {
  const newComment: DiscussionComment = {
    id: `comment-${Date.now()}`,
    postId,
    authorId: payload.authorId || `guest-${Date.now()}`,
    authorName: payload.authorName,
    authorAvatar: payload.authorAvatar,
    authorUniversity: payload.authorUniversity,
    content: payload.content.trim(),
    createdAt: new Date().toISOString(),
    upvotesCount: 0,
    hasUpvoted: false
  };

  const raw = localStorage.getItem(STORAGE_KEY_DISCUSSIONS);
  let all: DiscussionPost[] = INITIAL_DISCUSSIONS;
  if (raw) {
    try {
      all = JSON.parse(raw);
    } catch {}
  }

  const updatedAll = all.map(post => {
    if (post.id === postId) {
      const comments = post.comments || [];
      return {
        ...post,
        comments: [...comments, newComment],
        commentsCount: (post.commentsCount || comments.length) + 1
      };
    }
    return post;
  });

  saveAllDiscussions(updatedAll);

  const sb = getSupabaseInstance();
  if (sb && isUuidString(payload.authorId)) {
    const commentRow = {
      id: newComment.id,
      discussion_id: newComment.postId,
      author_id: payload.authorId,
      author_name: newComment.authorName,
      author_avatar: newComment.authorAvatar || '',
      content: newComment.content
    };
    sb.from('university_discussion_comments')
      .insert([commentRow])
      .then(() => {}, () => {});
  }

  return newComment;
}

export function addCommentToDiscussion(
  postId: string,
  content: string,
  user: StudentUser
): DiscussionComment {
  return addDiscussionComment(postId, {
    content,
    authorName: user.name,
    authorId: user.id,
    authorAvatar: user.avatarUrl,
    authorUniversity: user.university || 'General Campus'
  });
}

export function toggleDiscussionUpvote(postId: string): { upvoted: boolean; count: number } {
  const upvotedIds = getCommunityUpvotes();
  const hasUpvoted = upvotedIds.includes(`disc-${postId}`);

  const raw = localStorage.getItem(STORAGE_KEY_DISCUSSIONS);
  let all: DiscussionPost[] = INITIAL_DISCUSSIONS;
  if (raw) {
    try {
      all = JSON.parse(raw);
    } catch {}
  }

  let finalCount = 0;
  const updatedAll = all.map(post => {
    if (post.id === postId) {
      const nextCount = hasUpvoted
        ? Math.max(0, post.upvotesCount - 1)
        : post.upvotesCount + 1;
      finalCount = nextCount;
      return {
        ...post,
        upvotesCount: nextCount,
        hasUpvoted: !hasUpvoted
      };
    }
    return post;
  });

  saveAllDiscussions(updatedAll);
  toggleCommunityUpvote(`disc-${postId}`);

  const sb = getSupabaseInstance();
  if (sb) {
    sb.rpc('toggle_community_vote', {
      p_item_type: 'university_discussion',
      p_item_id: postId,
      p_vote: 1
    }).then(() => {}, () => {});
  }

  return { upvoted: !hasUpvoted, count: finalCount };
}

export function toggleUpvoteDiscussion(postId: string) {
  return toggleDiscussionUpvote(postId);
}

export function reportDiscussionPost(postId: string): void {
  const raw = localStorage.getItem(STORAGE_KEY_DISCUSSIONS);
  let all: DiscussionPost[] = INITIAL_DISCUSSIONS;
  if (raw) {
    try {
      all = JSON.parse(raw);
    } catch {}
  }
  const updatedAll = all.map(p => (p.id === postId ? { ...p, isReported: true } : p));
  saveAllDiscussions(updatedAll);
}

// ============================================================================
// DOUBT CENTER
// ============================================================================

export function getDoubtsByUniversity(
  universityId: string,
  options?: {
    status?: 'all' | 'answered' | 'unanswered';
    searchQuery?: string;
  }
): DoubtQuestion[] {
  let allDoubts: DoubtQuestion[] = INITIAL_DOUBTS;
  try {
    const raw = localStorage.getItem(STORAGE_KEY_DOUBTS);
    if (raw) {
      const stored = JSON.parse(raw);
      const ids = new Set(stored.map((d: DoubtQuestion) => d.id));
      const filteredInit = INITIAL_DOUBTS.filter(d => !ids.has(d.id));
      allDoubts = [...stored, ...filteredInit];
    }
  } catch {}

  let filtered = allDoubts.filter(
    d => d.universityId.toLowerCase() === universityId.toLowerCase()
  );

  if (options?.status && options.status !== 'all') {
    filtered = filtered.filter(d => d.status === options.status);
  }

  if (options?.searchQuery?.trim()) {
    const q = options.searchQuery.toLowerCase().trim();
    filtered = filtered.filter(
      d =>
        d.title.toLowerCase().includes(q) ||
        d.content.toLowerCase().includes(q) ||
        d.courseCode.toLowerCase().includes(q) ||
        d.tags.some(t => t.toLowerCase().includes(q))
    );
  }

  filtered.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  return filtered;
}

export function saveAllDoubts(doubts: DoubtQuestion[]): void {
  try {
    localStorage.setItem(STORAGE_KEY_DOUBTS, JSON.stringify(doubts));
  } catch {}
}

export function addDoubtQuestion(
  universityId: string,
  payload: {
    title: string;
    content: string;
    department: string;
    courseCode: string;
    tags: string[];
    authorName: string;
    authorId?: string;
    authorAvatar?: string;
    authorUniversity: string;
    attachments?: { name: string; url: string; size?: string }[];
  }
): DoubtQuestion {
  const newQuestion: DoubtQuestion = {
    id: `doubt-${Date.now()}`,
    universityId,
    title: payload.title.trim(),
    content: payload.content.trim(),
    department: payload.department.trim(),
    courseCode: payload.courseCode.trim(),
    tags: payload.tags,
    attachments: payload.attachments,
    authorId: payload.authorId || `guest-${Date.now()}`,
    authorName: payload.authorName,
    authorAvatar: payload.authorAvatar,
    authorUniversity: payload.authorUniversity,
    createdAt: new Date().toISOString(),
    upvotesCount: 1,
    hasUpvoted: true,
    status: 'unanswered',
    answers: []
  };

  const raw = localStorage.getItem(STORAGE_KEY_DOUBTS);
  let all: DoubtQuestion[] = INITIAL_DOUBTS;
  if (raw) {
    try {
      all = JSON.parse(raw);
    } catch {}
  }
  const merged = [newQuestion, ...all.filter(d => d.id !== newQuestion.id)];
  saveAllDoubts(merged);

  const sb = getSupabaseInstance();
  if (sb && isUuidString(payload.authorId)) {
    (async () => {
      await ensureUniversityExistsInSupabase(sb, newQuestion.universityId, payload.authorId);
      const { error } = await sb.from('university_doubts').insert([
        {
          id: newQuestion.id,
          university_id: newQuestion.universityId,
          title: newQuestion.title,
          question: newQuestion.content,
          content: newQuestion.content,
          subject: newQuestion.courseCode || newQuestion.department || 'General',
          tags: newQuestion.tags,
          author_id: payload.authorId,
          author_name: newQuestion.authorName,
          author_avatar: newQuestion.authorAvatar || '',
          is_resolved: false
        }
      ]);
      if (!error) {
        await sb.rpc('toggle_community_vote', {
          p_item_type: 'university_doubt',
          p_item_id: newQuestion.id,
          p_vote: 1
        });
      }
    })().catch(() => {});
  }

  return newQuestion;
}

export function createDoubtQuestion(payload: {
  universityId: string;
  title: string;
  content: string;
  department: string;
  courseCode: string;
  tags: string[];
  attachments?: { name: string; url: string; size?: string }[];
  user: StudentUser;
}): DoubtQuestion {
  return addDoubtQuestion(payload.universityId, {
    title: payload.title,
    content: payload.content,
    department: payload.department,
    courseCode: payload.courseCode,
    tags: payload.tags,
    attachments: payload.attachments,
    authorName: payload.user.name,
    authorId: payload.user.id,
    authorAvatar: payload.user.avatarUrl,
    authorUniversity: payload.user.university || 'General Campus'
  });
}

export function addDoubtAnswer(
  questionId: string,
  payload: {
    content: string;
    authorName: string;
    authorId?: string;
    authorAvatar?: string;
    authorRole?: string;
    authorUniversity: string;
  }
): DoubtAnswer {
  const newAnswer: DoubtAnswer = {
    id: `ans-${Date.now()}`,
    questionId,
    authorId: payload.authorId || `guest-${Date.now()}`,
    authorName: payload.authorName,
    authorAvatar: payload.authorAvatar,
    authorRole: payload.authorRole || 'Peer Member',
    authorUniversity: payload.authorUniversity,
    content: payload.content.trim(),
    createdAt: new Date().toISOString(),
    upvotesCount: 0,
    hasUpvoted: false,
    isAccepted: false
  };

  const raw = localStorage.getItem(STORAGE_KEY_DOUBTS);
  let all: DoubtQuestion[] = INITIAL_DOUBTS;
  if (raw) {
    try {
      all = JSON.parse(raw);
    } catch {}
  }

  const updatedAll = all.map(q => {
    if (q.id === questionId) {
      const answers = q.answers || [];
      return {
        ...q,
        answers: [...answers, newAnswer]
      };
    }
    return q;
  });

  saveAllDoubts(updatedAll);

  const sb = getSupabaseInstance();
  if (sb && isUuidString(payload.authorId)) {
    const answerRow = {
      id: newAnswer.id,
      doubt_id: newAnswer.questionId,
      author_id: payload.authorId,
      author_name: newAnswer.authorName,
      author_avatar: newAnswer.authorAvatar || '',
      content: newAnswer.content,
      is_accepted: false
    };
    sb.from('university_doubt_answers')
      .insert([answerRow])
      .then(() => {}, () => {});
  }

  return newAnswer;
}

export function addAnswerToDoubt(
  questionId: string,
  content: string,
  user: StudentUser
): DoubtAnswer {
  return addDoubtAnswer(questionId, {
    content,
    authorName: user.name,
    authorId: user.id,
    authorAvatar: user.avatarUrl,
    authorRole: 'Peer Member',
    authorUniversity: user.university || 'General Campus'
  });
}

export function acceptDoubtAnswer(
  questionId: string,
  answerId: string,
  currentUserId?: string
): void {
  const raw = localStorage.getItem(STORAGE_KEY_DOUBTS);
  let all: DoubtQuestion[] = INITIAL_DOUBTS;
  if (raw) {
    try {
      all = JSON.parse(raw);
    } catch {}
  }

  const targetQ = all.find(q => q.id === questionId);
  let activeUserId = currentUserId;
  if (!activeUserId) {
    try {
      const rawUser = localStorage.getItem('studyvault_active_user');
      if (rawUser) activeUserId = JSON.parse(rawUser)?.id;
    } catch {}
  }

  // Enforce ownership: only the question author can mark an answer as accepted
  if (targetQ?.authorId && activeUserId && targetQ.authorId !== activeUserId) {
    return;
  }

  const updatedAll = all.map(q => {
    if (q.id === questionId) {
      const answers = (q.answers || []).map(ans => ({
        ...ans,
        isAccepted: ans.id === answerId
      }));
      return {
        ...q,
        status: 'answered' as const,
        acceptedAnswerId: answerId,
        answers
      };
    }
    return q;
  });

  saveAllDoubts(updatedAll);

  const sb = getSupabaseInstance();
  if (sb && isUuidString(activeUserId)) {
    sb.rpc('accept_doubt_answer', {
      p_scope: 'university',
      p_doubt_id: questionId,
      p_answer_id: answerId
    }).then(() => {}, () => {});
  }
}

export function toggleDoubtUpvote(questionId: string): { upvoted: boolean; count: number } {
  const upvotedIds = getCommunityUpvotes();
  const hasUpvoted = upvotedIds.includes(`doubt-${questionId}`);

  const raw = localStorage.getItem(STORAGE_KEY_DOUBTS);
  let all: DoubtQuestion[] = INITIAL_DOUBTS;
  if (raw) {
    try {
      all = JSON.parse(raw);
    } catch {}
  }

  let finalCount = 0;
  const updatedAll = all.map(q => {
    if (q.id === questionId) {
      const nextCount = hasUpvoted
        ? Math.max(0, q.upvotesCount - 1)
        : q.upvotesCount + 1;
      finalCount = nextCount;
      return {
        ...q,
        upvotesCount: nextCount,
        hasUpvoted: !hasUpvoted
      };
    }
    return q;
  });

  saveAllDoubts(updatedAll);
  toggleCommunityUpvote(`doubt-${questionId}`);

  const sb = getSupabaseInstance();
  if (sb) {
    sb.rpc('toggle_community_vote', {
      p_item_type: 'university_doubt',
      p_item_id: questionId,
      p_vote: 1
    }).then(() => {}, () => {});
  }

  return { upvoted: !hasUpvoted, count: finalCount };
}

export function toggleUpvoteDoubt(questionId: string) {
  return toggleDoubtUpvote(questionId);
}

// ============================================================================
// UPVOTES TRACKING (SCOPED BY USER ID)
// ============================================================================

function getCommunityUpvotesKey(userId?: string): string {
  const effectiveUserId = userId || getActiveUserIdFromStorage();
  return effectiveUserId
    ? `${STORAGE_KEY_UPVOTED_ITEMS}_${effectiveUserId}`
    : STORAGE_KEY_UPVOTED_ITEMS;
}

function getCommunityUpvotes(userId?: string): string[] {
  try {
    const raw = localStorage.getItem(getCommunityUpvotesKey(userId));
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function toggleCommunityUpvote(itemKey: string, userId?: string): void {
  const upvoted = getCommunityUpvotes(userId);
  const idx = upvoted.indexOf(itemKey);
  let next: string[];
  if (idx >= 0) {
    next = upvoted.filter(k => k !== itemKey);
  } else {
    next = [...upvoted, itemKey];
  }
  try {
    localStorage.setItem(getCommunityUpvotesKey(userId), JSON.stringify(next));
  } catch {}
}

// ============================================================================
// ACCESS CONTROL
// ============================================================================

export function checkUniversityAccess(
  user: StudentUser | null,
  university: University
): {
  isMember: boolean;
  canViewPublic: boolean;
  canViewRestricted: boolean;
  reason?: string;
} {
  const isMember = Boolean(
    user &&
    user.university &&
    (user.university.toLowerCase() === university.name.toLowerCase() ||
      user.university.toLowerCase() === university.shortName.toLowerCase() ||
      (user.universityId && user.universityId.toLowerCase() === university.id.toLowerCase()))
  );

  const canViewRestricted = !university.isMemberRestricted || isMember;

  return {
    isMember,
    canViewPublic: true,
    canViewRestricted,
    reason: canViewRestricted
      ? undefined
      : `Restricted to verified students of ${university.shortName}. Sign in with your university credentials to view internal materials.`
  };
}

export function checkDocumentAccess(
  param1: any,
  param2: any,
  param3?: any
): {
  canAccess: boolean;
  isRestricted: boolean;
  reason?: string;
} {
  const note: StudyNote | undefined = (param1 && 'fileUrl' in param1) ? param1 : (param2 && 'fileUrl' in param2) ? param2 : undefined;
  const user: StudentUser | null = (param1 && 'email' in param1) ? param1 : (param2 && 'email' in param2) ? param2 : null;
  const university: University | null = param3 || (note?.universityId ? getUniversityById(note.universityId) : null);

  if (!university) {
    return { canAccess: true, isRestricted: false };
  }

  const access = checkUniversityAccess(user, university);
  return {
    canAccess: access.canViewRestricted,
    isRestricted: Boolean(university.isMemberRestricted),
    reason: access.reason
  };
}

// ============================================================================
// CROSS-USER SUPABASE SYNCHRONIZATION FOR UNIVERSITIES, DISCUSSIONS & DOUBTS
// ============================================================================

export async function syncUniversitiesFromSupabase(
  supabaseClient?: SupabaseClient | null,
  currentNotes?: StudyNote[]
): Promise<void> {
  const sb = supabaseClient ?? getSupabaseInstance();
  if (!sb) return;

  try {
    // 1. Authoritative custom universities from canonical universities table
    const customById = new Map<string, University>();
    const dbUniCounts: Record<string, number> = {};

    try {
      const { data: dbUnis, error: uniErr } = await sb.from('universities').select('*').limit(300);
      if (!uniErr && Array.isArray(dbUnis)) {
        for (const row of dbUnis) {
          if (!row?.id) continue;
          const followersCount = Number(row.followers_count ?? row.verified_students ?? 0);
          if (followersCount > 0) {
            dbUniCounts[row.id] = followersCount;
          }
          const isMaster = HEC_MASTER_UNIVERSITIES.some(m => m.id === row.id);
          if (!isMaster) {
            customById.set(row.id, {
              id: row.id,
              name: row.name,
              shortName: row.short_name || 'UNI',
              sector: row.type === 'public' ? 'Public' : 'Private',
              province: 'Pakistan',
              city: row.location || 'Pakistan',
              location: row.location || 'Pakistan',
              country: row.country || 'Pakistan',
              badge: row.badge || 'Community Added',
              logoUrl: row.logo_url || '',
              bannerUrl: row.banner_url || '',
              disciplines: Array.isArray(row.disciplines) ? row.disciplines : ['General Studies'],
              website: row.website || 'https://hec.gov.pk',
              establishedYear: Number(row.established_year) || 2024,
              verifiedStudents: Math.max(1, followersCount || 1),
              totalCoursesCount: Number(row.courses_count ?? row.total_courses_count) || 0,
              description: row.description || '',
              hecRecognized: Boolean(row.is_verified),
              isCustom: true,
              status: 'verified',
              isMemberRestricted: row.access_scope === 'members_only' || row.access_scope === 'verified_members_only'
            });
          }
        }
        saveCustomUniversities(Array.from(customById.values()));
      }
    } catch {}

    // 2. Compute authoritative student enrollments per university from live Supabase profiles + notes (replaces stale local counts)
    const studentsPerUni: Record<string, Set<string>> = {};

    try {
      const { data: pubProfiles } = await sb
        .from('public_student_profiles')
        .select('id, institution_name, university_id')
        .limit(1000);
      if (Array.isArray(pubProfiles)) {
        for (const prof of pubProfiles) {
          if (!prof?.id) continue;
          const matched =
            (prof.university_id ? getUniversityById(prof.university_id) : null) ||
            (prof.institution_name ? findUniversityByNameOrFuzzy(prof.institution_name) : null);
          if (matched) {
            if (!studentsPerUni[matched.id]) studentsPerUni[matched.id] = new Set();
            studentsPerUni[matched.id].add(String(prof.id));
          }
        }
      }
    } catch {}

    const notesList =
      currentNotes ||
      (() => {
        try {
          const raw = localStorage.getItem('xeusar_local_notes_v2');
          return raw ? (JSON.parse(raw) as StudyNote[]) : [];
        } catch {
          return [];
        }
      })();

    for (const note of notesList) {
      if (note.id.startsWith('seed-') || note.isUnsynced) continue;
      const matched =
        (note.universityId ? getUniversityById(note.universityId) : null) ||
        (note.uploaderUniversity ? findUniversityByNameOrFuzzy(note.uploaderUniversity) : null);
      if (matched) {
        if (!studentsPerUni[matched.id]) studentsPerUni[matched.id] = new Set();
        studentsPerUni[matched.id].add(note.uploaderId || note.uploaderName || note.id);
      }
    }

    const freshEnrollments: Record<string, number> = {};
    for (const [uniId, set] of Object.entries(studentsPerUni)) {
      if (set.size > 0) {
        freshEnrollments[uniId] = set.size;
      }
    }
    for (const [uniId, count] of Object.entries(dbUniCounts)) {
      if (count > 0) {
        freshEnrollments[uniId] = Math.max(freshEnrollments[uniId] || 0, count);
      }
    }
    saveStudentEnrollments(freshEnrollments);

    // Hydrate user's persisted community votes if signed in
    const activeUserId = getActiveUserIdFromStorage();
    const upvotedList = new Set<string>();
    if (isUuidString(activeUserId)) {
      try {
        const { data: voteRows } = await sb
          .from('community_item_votes')
          .select('item_type, item_id, vote_type')
          .eq('user_id', activeUserId!)
          .in('item_type', ['university_discussion', 'university_doubt']);
        if (Array.isArray(voteRows)) {
          for (const vr of voteRows) {
            if ((vr.vote_type ?? 1) > 0) {
              if (vr.item_type === 'university_discussion') {
                upvotedList.add(`disc-${vr.item_id}`);
              } else if (vr.item_type === 'university_doubt') {
                upvotedList.add(`doubt-${vr.item_id}`);
              }
            }
          }
          try {
            localStorage.setItem(
              getCommunityUpvotesKey(activeUserId),
              JSON.stringify(Array.from(upvotedList))
            );
          } catch {}
        }
      } catch {}
    }

    // 3. Authoritative University Discussions & Comments from canonical tables
    const discById = new Map<string, DiscussionPost>();
    INITIAL_DISCUSSIONS.forEach(d => discById.set(d.id, { ...d, comments: [...(d.comments || [])] }));

    try {
      const { data: dbDiscs, error: discErr } = await sb
        .from('university_discussions')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(200);
      if (!discErr && Array.isArray(dbDiscs)) {
        for (const row of dbDiscs) {
          if (row?.id && row.moderation_status !== 'rejected' && row.moderation_status !== 'archived') {
            const existing = discById.get(row.id);
            const rowTags: string[] = Array.isArray(row.tags) ? row.tags : [];
            const courseTagFromTags = rowTags.find(t => t.startsWith('course:'))?.slice(7);
            const majorFromTags = rowTags.find(t => t.startsWith('major:'))?.slice(6);
            const uniFromTags = rowTags.find(t => t.startsWith('uni:'))?.slice(4);
            discById.set(row.id, {
              id: row.id,
              universityId: row.university_id,
              title: row.title,
              content: row.content,
              category: row.category || 'Academic Advice',
              courseTag: row.course_tag || courseTagFromTags || undefined,
              authorId: row.author_id || `user-${row.id}`,
              authorName: row.author_name || 'Student Member',
              authorAvatar: row.author_avatar || undefined,
              authorMajor: row.author_major || majorFromTags || 'Student Member',
              authorUniversity: row.author_university || uniFromTags || 'University Campus',
              createdAt: row.created_at || new Date().toISOString(),
              upvotesCount: Number(row.upvotes ?? row.upvotes_count ?? 1),
              hasUpvoted: upvotedList.has(`disc-${row.id}`),
              commentsCount: Number(row.comments_count ?? 0),
              comments: existing?.comments ? [...existing.comments] : [],
              isPinned: Boolean(row.is_pinned)
            });
          }
        }
      }
    } catch {}

    const allComments: DiscussionComment[] = [];
    try {
      const { data: dbComments } = await sb
        .from('university_discussion_comments')
        .select('*')
        .order('created_at', { ascending: true })
        .limit(500);
      if (Array.isArray(dbComments)) {
        for (const row of dbComments) {
          const parentDiscId = row?.discussion_id || row?.post_id;
          if (row?.id && parentDiscId && row.moderation_status !== 'rejected') {
            allComments.push({
              id: row.id,
              postId: parentDiscId,
              authorId: row.author_id || `user-${row.id}`,
              authorName: row.author_name || 'Student Member',
              authorAvatar: row.author_avatar || undefined,
              authorUniversity: row.author_university || 'University Campus',
              content: row.content,
              createdAt: row.created_at || new Date().toISOString(),
              upvotesCount: Number(row.upvotes ?? row.upvotes_count) || 0,
              hasUpvoted: false
            });
          }
        }
      }
    } catch {}

    for (const c of allComments) {
      const parent = discById.get(c.postId);
      if (parent) {
        const exists = (parent.comments || []).some(existing => existing.id === c.id);
        if (!exists) {
          parent.comments = [...(parent.comments || []), c];
          parent.commentsCount = Math.max(parent.commentsCount || 0, parent.comments.length);
        }
      }
    }

    saveAllDiscussions(Array.from(discById.values()));

    // 4. Authoritative University Doubts & Answers from canonical tables
    const doubtById = new Map<string, DoubtQuestion>();
    INITIAL_DOUBTS.forEach(q => doubtById.set(q.id, { ...q, answers: [...(q.answers || [])] }));

    try {
      const { data: dbDoubts, error: doubtErr } = await sb
        .from('university_doubts')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(200);
      if (!doubtErr && Array.isArray(dbDoubts)) {
        for (const row of dbDoubts) {
          if (row?.id && row.moderation_status !== 'rejected' && row.moderation_status !== 'archived') {
            const existing = doubtById.get(row.id);
            const isResolved = Boolean(row.is_resolved || row.status === 'answered' || row.accepted_answer_id);
            doubtById.set(row.id, {
              id: row.id,
              universityId: row.university_id,
              title: row.title,
              content: row.content || row.question || '',
              department: row.department || 'General',
              courseCode: row.course_code || row.subject || 'GEN',
              tags: Array.isArray(row.tags) ? row.tags : [],
              attachments: Array.isArray(row.attachments) ? row.attachments : [],
              authorId: row.author_id || `user-${row.id}`,
              authorName: row.author_name || 'Student Member',
              authorAvatar: row.author_avatar || undefined,
              authorUniversity: row.author_university || 'University Campus',
              createdAt: row.created_at || new Date().toISOString(),
              upvotesCount: Number(row.upvotes ?? row.upvotes_count ?? 1),
              hasUpvoted: upvotedList.has(`doubt-${row.id}`),
              status: isResolved ? 'answered' : 'unanswered',
              acceptedAnswerId: row.accepted_answer_id || existing?.acceptedAnswerId || undefined,
              answers: existing?.answers ? [...existing.answers] : []
            });
          }
        }
      }
    } catch {}

    const allAnswers: DoubtAnswer[] = [];
    try {
      const { data: dbAnswers } = await sb
        .from('university_doubt_answers')
        .select('*')
        .order('created_at', { ascending: true })
        .limit(500);
      if (Array.isArray(dbAnswers)) {
        for (const row of dbAnswers) {
          const parentDoubtId = row?.doubt_id || row?.question_id;
          if (row?.id && parentDoubtId && row.moderation_status !== 'rejected') {
            allAnswers.push({
              id: row.id,
              questionId: parentDoubtId,
              authorId: row.author_id || `user-${row.id}`,
              authorName: row.author_name || 'Student Member',
              authorAvatar: row.author_avatar || undefined,
              authorRole: row.author_role || 'Peer Member',
              authorUniversity: row.author_university || 'University Campus',
              content: row.content,
              createdAt: row.created_at || new Date().toISOString(),
              upvotesCount: Number(row.upvotes ?? row.upvotes_count) || 0,
              hasUpvoted: false,
              isAccepted: Boolean(row.is_accepted)
            });
          }
        }
      }
    } catch {}

    for (const a of allAnswers) {
      const parent = doubtById.get(a.questionId);
      if (parent) {
        const exists = (parent.answers || []).some(existing => existing.id === a.id);
        if (!exists) {
          parent.answers = [...(parent.answers || []), a];
          if (parent.status === 'unanswered') parent.status = 'answered';
        }
        if (parent.acceptedAnswerId) {
          parent.answers = parent.answers.map(ans => ({
            ...ans,
            isAccepted: ans.id === parent.acceptedAnswerId
          }));
        }
      }
    }

    saveAllDoubts(Array.from(doubtById.values()));

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('xeusar-university-data-synced'));
    }
  } catch {}
}

