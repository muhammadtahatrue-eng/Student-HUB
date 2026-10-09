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

const STORAGE_KEY_CUSTOM_UNIS = 'studyvault_custom_universities_v2';
const STORAGE_KEY_ENROLLMENTS = 'studyvault_student_enrollments_v2';
const STORAGE_KEY_FOLLOWED = 'studyvault_followed_universities_v2';
const STORAGE_KEY_DISCUSSIONS = 'studyvault_discussions_v2';
const STORAGE_KEY_DOUBTS = 'studyvault_doubts_v2';
const STORAGE_KEY_UPVOTED_ITEMS = 'studyvault_community_upvotes_v2';

// Seed enrollments for initially active Pakistani HEC universities
const INITIAL_STUDENT_ENROLLMENTS: Record<string, number> = {
  'nust': 1420,
  'fast-nuces': 1850,
  'lums': 1220,
  'comsats': 980,
  'uet-lahore': 850,
  'iba-karachi': 740,
  'giki': 590,
  'qau': 410,
};

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

  return newCustomUni;
}

export function registerStudentToUniversity(studentId: string, universityId: string): void {
  const enrollments = getStudentEnrollments();
  const currentCount = enrollments[universityId] || 0;
  enrollments[universityId] = currentCount + 1;
  saveStudentEnrollments(enrollments);
}

// ============================================================================
// FOLLOWED UNIVERSITIES
// ============================================================================

export function getFollowedUniversityIds(): string[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_FOLLOWED);
    if (raw) {
      return JSON.parse(raw);
    }
  } catch {}
  return ['nust'];
}

export function toggleFollowUniversity(universityId: string): { followed: boolean; followedIds: string[] } {
  const current = getFollowedUniversityIds();
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
    localStorage.setItem(STORAGE_KEY_FOLLOWED, JSON.stringify(updated));
  } catch {}

  return { followed, followedIds: updated };
}

export function isFollowingUniversity(universityId: string): boolean {
  return getFollowedUniversityIds().includes(universityId);
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
    authorUniversity: payload.user.university
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
    authorUniversity: user.university
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
    authorUniversity: payload.user.university
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
    authorUniversity: user.university
  });
}

export function acceptDoubtAnswer(questionId: string, answerId: string): void {
  const raw = localStorage.getItem(STORAGE_KEY_DOUBTS);
  let all: DoubtQuestion[] = INITIAL_DOUBTS;
  if (raw) {
    try {
      all = JSON.parse(raw);
    } catch {}
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

  return { upvoted: !hasUpvoted, count: finalCount };
}

export function toggleUpvoteDoubt(questionId: string) {
  return toggleDoubtUpvote(questionId);
}

// ============================================================================
// UPVOTES TRACKING
// ============================================================================

function getCommunityUpvotes(): string[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_UPVOTED_ITEMS);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function toggleCommunityUpvote(itemKey: string): void {
  const upvoted = getCommunityUpvotes();
  const idx = upvoted.indexOf(itemKey);
  let next: string[];
  if (idx >= 0) {
    next = upvoted.filter(k => k !== itemKey);
  } else {
    next = [...upvoted, itemKey];
  }
  try {
    localStorage.setItem(STORAGE_KEY_UPVOTED_ITEMS, JSON.stringify(next));
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
