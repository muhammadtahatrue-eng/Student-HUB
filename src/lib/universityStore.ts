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
  INITIAL_UNIVERSITIES,
  INITIAL_DEPARTMENTS,
  INITIAL_COURSES,
  INITIAL_DISCUSSIONS,
  INITIAL_DOUBTS
} from '../data/universityData.ts';
import { getLocalNotes } from './supabaseClient.ts';

const STORAGE_KEY_UNIVERSITIES = 'studyvault_universities_v1';
const STORAGE_KEY_FOLLOWED = 'studyvault_followed_universities';
const STORAGE_KEY_DISCUSSIONS = 'studyvault_discussions_v1';
const STORAGE_KEY_DOUBTS = 'studyvault_doubts_v1';
const STORAGE_KEY_UPVOTED_ITEMS = 'studyvault_community_upvotes';

// ============================================================================
// UNIVERSITIES & FOLLOWS
// ============================================================================

export function getUniversities(): University[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_UNIVERSITIES);
    if (raw) {
      return JSON.parse(raw);
    }
  } catch {}
  saveUniversities(INITIAL_UNIVERSITIES);
  return INITIAL_UNIVERSITIES;
}

export function saveUniversities(universities: University[]): void {
  try {
    localStorage.setItem(STORAGE_KEY_UNIVERSITIES, JSON.stringify(universities));
  } catch {}
}

export function getUniversityById(id: string): University | null {
  const unis = getUniversities();
  return (
    unis.find(
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
  const unis = getUniversities();
  return (
    unis.find(
      u =>
        u.name.toLowerCase().includes(clean) ||
        clean.includes(u.name.toLowerCase()) ||
        u.shortName.toLowerCase() === clean ||
        u.id.toLowerCase() === clean
    ) || null
  );
}

export function getFollowedUniversityIds(): string[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_FOLLOWED);
    if (raw) {
      return JSON.parse(raw);
    }
  } catch {}
  return ['stanford']; // Default follow
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

// Compute real document counts per university from active notes
export function getUniversityRealResourceCounts(universityId: string, notes: StudyNote[]): {
  documentsCount: number;
  coursesCount: number;
  totalDownloads: number;
} {
  const uni = getUniversityById(universityId);
  const matchedNotes = notes.filter(n => {
    if (n.universityId && n.universityId.toLowerCase() === universityId.toLowerCase()) return true;
    if (uni && n.uploaderUniversity && (
      n.uploaderUniversity.toLowerCase().includes(uni.shortName.toLowerCase()) ||
      uni.name.toLowerCase().includes(n.uploaderUniversity.toLowerCase())
    )) {
      return true;
    }
    return false;
  });

  const uniqueCourses = new Set(matchedNotes.map(n => n.courseCode).filter(Boolean));
  const totalDownloads = matchedNotes.reduce((acc, curr) => acc + (curr.downloadsCount || 0), 0);

  return {
    documentsCount: matchedNotes.length,
    coursesCount: Math.max(uniqueCourses.size, getCoursesByUniversity(universityId).length),
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

// ============================================================================
// COMMUNITY UPVOTES TRACKER
// ============================================================================

export function getCommunityUpvotedIds(): Set<string> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_UPVOTED_ITEMS);
    if (raw) {
      return new Set(JSON.parse(raw));
    }
  } catch {}
  return new Set();
}

export function toggleCommunityUpvote(itemId: string): boolean {
  const upvoted = getCommunityUpvotedIds();
  const willBeUpvoted = !upvoted.has(itemId);
  if (willBeUpvoted) {
    upvoted.add(itemId);
  } else {
    upvoted.delete(itemId);
  }
  try {
    localStorage.setItem(STORAGE_KEY_UPVOTED_ITEMS, JSON.stringify(Array.from(upvoted)));
  } catch {}
  return willBeUpvoted;
}

// ============================================================================
// UNIVERSITY DISCUSSIONS
// ============================================================================

export function getDiscussionsByUniversity(
  universityId: string,
  options?: {
    category?: DiscussionCategory | 'all';
    searchQuery?: string;
    sortBy?: 'latest' | 'popular';
  }
): DiscussionPost[] {
  let all: DiscussionPost[] = [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY_DISCUSSIONS);
    all = raw ? JSON.parse(raw) : INITIAL_DISCUSSIONS;
  } catch {
    all = INITIAL_DISCUSSIONS;
  }

  const upvotes = getCommunityUpvotedIds();

  let filtered = all.filter(
    p => p.universityId.toLowerCase() === universityId.toLowerCase() && !p.isReported
  );

  if (options?.category && options.category !== 'all') {
    filtered = filtered.filter(p => p.category === options.category);
  }

  if (options?.searchQuery && options.searchQuery.trim()) {
    const q = options.searchQuery.toLowerCase().trim();
    filtered = filtered.filter(
      p =>
        p.title.toLowerCase().includes(q) ||
        p.content.toLowerCase().includes(q) ||
        (p.courseTag && p.courseTag.toLowerCase().includes(q))
    );
  }

  // Populate dynamic upvoted state
  const mapped = filtered.map(post => ({
    ...post,
    hasUpvoted: upvotes.has(post.id),
    comments: post.comments.map(c => ({
      ...c,
      hasUpvoted: upvotes.has(c.id)
    }))
  }));

  // Sort
  if (options?.sortBy === 'popular') {
    mapped.sort((a, b) => (b.upvotesCount + b.commentsCount * 2) - (a.upvotesCount + a.commentsCount * 2));
  } else {
    // Pinned posts first, then latest
    mapped.sort((a, b) => {
      if (a.isPinned && !b.isPinned) return -1;
      if (!a.isPinned && b.isPinned) return 1;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
  }

  return mapped;
}

export function saveAllDiscussions(posts: DiscussionPost[]): void {
  try {
    localStorage.setItem(STORAGE_KEY_DISCUSSIONS, JSON.stringify(posts));
  } catch {}
}

export function addDiscussionPost(
  universityId: string,
  data: {
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
  let all: DiscussionPost[] = [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY_DISCUSSIONS);
    all = raw ? JSON.parse(raw) : INITIAL_DISCUSSIONS;
  } catch {
    all = INITIAL_DISCUSSIONS;
  }

  const newPost: DiscussionPost = {
    id: `disc-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    universityId: universityId.toLowerCase(),
    title: data.title.trim(),
    content: data.content.trim(),
    category: data.category,
    courseTag: data.courseTag?.trim() || undefined,
    authorId: data.authorId || `usr-${Date.now()}`,
    authorName: data.authorName.trim() || 'Student Scholar',
    authorAvatar: data.authorAvatar || 'https://api.dicebear.com/7.x/bottts/svg?seed=ScholarBot&backgroundColor=0d1117',
    authorMajor: data.authorMajor || 'Academic Department',
    authorUniversity: data.authorUniversity,
    createdAt: new Date().toISOString(),
    upvotesCount: 1,
    hasUpvoted: true,
    commentsCount: 0,
    comments: [],
    isPinned: false
  };

  toggleCommunityUpvote(newPost.id);
  all.unshift(newPost);
  saveAllDiscussions(all);
  return newPost;
}

export function addDiscussionComment(
  postId: string,
  data: {
    content: string;
    authorName: string;
    authorId?: string;
    authorAvatar?: string;
    authorUniversity: string;
  }
): DiscussionComment | null {
  let all: DiscussionPost[] = [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY_DISCUSSIONS);
    all = raw ? JSON.parse(raw) : INITIAL_DISCUSSIONS;
  } catch {
    all = INITIAL_DISCUSSIONS;
  }

  const post = all.find(p => p.id === postId);
  if (!post) return null;

  const newComment: DiscussionComment = {
    id: `comm-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    postId,
    authorId: data.authorId || `usr-${Date.now()}`,
    authorName: data.authorName.trim() || 'Peer Contributor',
    authorAvatar: data.authorAvatar || 'https://api.dicebear.com/7.x/pixel-art/svg?seed=Peer&backgroundColor=1f2937',
    authorUniversity: data.authorUniversity,
    content: data.content.trim(),
    createdAt: new Date().toISOString(),
    upvotesCount: 0,
    hasUpvoted: false
  };

  post.comments.push(newComment);
  post.commentsCount = post.comments.length;
  saveAllDiscussions(all);
  return newComment;
}

export function toggleDiscussionUpvote(postId: string): { upvoted: boolean; count: number } {
  let all: DiscussionPost[] = [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY_DISCUSSIONS);
    all = raw ? JSON.parse(raw) : INITIAL_DISCUSSIONS;
  } catch {
    all = INITIAL_DISCUSSIONS;
  }

  const post = all.find(p => p.id === postId);
  if (!post) return { upvoted: false, count: 0 };

  const isUpvoted = toggleCommunityUpvote(postId);
  post.upvotesCount = isUpvoted
    ? post.upvotesCount + 1
    : Math.max(0, post.upvotesCount - 1);

  saveAllDiscussions(all);
  return { upvoted: isUpvoted, count: post.upvotesCount };
}

export function reportDiscussionPost(postId: string): void {
  let all: DiscussionPost[] = [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY_DISCUSSIONS);
    all = raw ? JSON.parse(raw) : INITIAL_DISCUSSIONS;
  } catch {
    all = INITIAL_DISCUSSIONS;
  }

  const post = all.find(p => p.id === postId);
  if (post) {
    post.isReported = true;
    saveAllDiscussions(all);
  }
}

// ============================================================================
// UNIVERSITY DOUBT CENTER (Q&A)
// ============================================================================

export function getDoubtsByUniversity(
  universityId: string,
  options?: {
    status?: 'all' | 'answered' | 'unanswered';
    department?: string;
    searchQuery?: string;
  }
): DoubtQuestion[] {
  let all: DoubtQuestion[] = [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY_DOUBTS);
    all = raw ? JSON.parse(raw) : INITIAL_DOUBTS;
  } catch {
    all = INITIAL_DOUBTS;
  }

  const upvotes = getCommunityUpvotedIds();

  let filtered = all.filter(
    q => q.universityId.toLowerCase() === universityId.toLowerCase()
  );

  if (options?.status && options.status !== 'all') {
    filtered = filtered.filter(q => q.status === options.status);
  }

  if (options?.department && options.department !== 'all') {
    filtered = filtered.filter(
      q => q.department.toLowerCase() === options.department?.toLowerCase()
    );
  }

  if (options?.searchQuery && options.searchQuery.trim()) {
    const q = options.searchQuery.toLowerCase().trim();
    filtered = filtered.filter(
      item =>
        item.title.toLowerCase().includes(q) ||
        item.content.toLowerCase().includes(q) ||
        item.courseCode.toLowerCase().includes(q) ||
        item.tags.some(t => t.toLowerCase().includes(q))
    );
  }

  // Populate dynamic upvoted state & answers
  const mapped = filtered.map(question => ({
    ...question,
    hasUpvoted: upvotes.has(question.id),
    answers: question.answers.map(ans => ({
      ...ans,
      hasUpvoted: upvotes.has(ans.id)
    }))
  }));

  // Sort: unanswered first or latest
  mapped.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  return mapped;
}

export function saveAllDoubts(doubts: DoubtQuestion[]): void {
  try {
    localStorage.setItem(STORAGE_KEY_DOUBTS, JSON.stringify(doubts));
  } catch {}
}

export function addDoubtQuestion(
  universityId: string,
  data: {
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
  let all: DoubtQuestion[] = [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY_DOUBTS);
    all = raw ? JSON.parse(raw) : INITIAL_DOUBTS;
  } catch {
    all = INITIAL_DOUBTS;
  }

  const newDoubt: DoubtQuestion = {
    id: `doubt-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    universityId: universityId.toLowerCase(),
    title: data.title.trim(),
    content: data.content.trim(),
    department: data.department.trim(),
    courseCode: data.courseCode.trim().toUpperCase(),
    tags: data.tags.filter(Boolean),
    authorId: data.authorId || `usr-${Date.now()}`,
    authorName: data.authorName.trim() || 'Curious Student',
    authorAvatar: data.authorAvatar || 'https://api.dicebear.com/7.x/bottts/svg?seed=DoubtBot&backgroundColor=0d1117',
    authorUniversity: data.authorUniversity,
    createdAt: new Date().toISOString(),
    upvotesCount: 1,
    hasUpvoted: true,
    status: 'unanswered',
    attachments: data.attachments || [],
    answers: []
  };

  toggleCommunityUpvote(newDoubt.id);
  all.unshift(newDoubt);
  saveAllDoubts(all);
  return newDoubt;
}

export function addDoubtAnswer(
  questionId: string,
  data: {
    content: string;
    authorName: string;
    authorId?: string;
    authorAvatar?: string;
    authorRole?: string;
    authorUniversity: string;
  }
): DoubtAnswer | null {
  let all: DoubtQuestion[] = [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY_DOUBTS);
    all = raw ? JSON.parse(raw) : INITIAL_DOUBTS;
  } catch {
    all = INITIAL_DOUBTS;
  }

  const question = all.find(q => q.id === questionId);
  if (!question) return null;

  const newAnswer: DoubtAnswer = {
    id: `ans-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    questionId,
    authorId: data.authorId || `usr-${Date.now()}`,
    authorName: data.authorName.trim() || 'Peer Contributor',
    authorAvatar: data.authorAvatar || 'https://api.dicebear.com/7.x/pixel-art/svg?seed=AnsBot&backgroundColor=18181b',
    authorRole: data.authorRole || 'Peer Contributor',
    authorUniversity: data.authorUniversity,
    content: data.content.trim(),
    createdAt: new Date().toISOString(),
    upvotesCount: 0,
    hasUpvoted: false,
    isAccepted: false
  };

  question.answers.push(newAnswer);
  saveAllDoubts(all);
  return newAnswer;
}

export function acceptDoubtAnswer(questionId: string, answerId: string): boolean {
  let all: DoubtQuestion[] = [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY_DOUBTS);
    all = raw ? JSON.parse(raw) : INITIAL_DOUBTS;
  } catch {
    all = INITIAL_DOUBTS;
  }

  const question = all.find(q => q.id === questionId);
  if (!question) return false;

  const targetAnswer = question.answers.find(a => a.id === answerId);
  if (!targetAnswer) return false;

  // Toggle acceptance
  if (targetAnswer.isAccepted) {
    targetAnswer.isAccepted = false;
    question.acceptedAnswerId = undefined;
    question.status = 'unanswered';
  } else {
    // Unmark any previously accepted answer
    question.answers.forEach(a => {
      a.isAccepted = false;
    });
    targetAnswer.isAccepted = true;
    question.acceptedAnswerId = answerId;
    question.status = 'answered';
  }

  saveAllDoubts(all);
  return true;
}

export function toggleDoubtUpvote(questionId: string): { upvoted: boolean; count: number } {
  let all: DoubtQuestion[] = [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY_DOUBTS);
    all = raw ? JSON.parse(raw) : INITIAL_DOUBTS;
  } catch {
    all = INITIAL_DOUBTS;
  }

  const question = all.find(q => q.id === questionId);
  if (!question) return { upvoted: false, count: 0 };

  const isUpvoted = toggleCommunityUpvote(questionId);
  question.upvotesCount = isUpvoted
    ? question.upvotesCount + 1
    : Math.max(0, question.upvotesCount - 1);

  saveAllDoubts(all);
  return { upvoted: isUpvoted, count: question.upvotesCount };
}

// ============================================================================
// ACCESS CONTROL & STUDY MATERIALS RELATIONSHIP
// ============================================================================

/**
 * Checks if the current student has authorization to download / access a document.
 * Documents uploaded by students become available to authorized peers.
 * Public documents are accessible to everyone; restricted documents are strictly accessible
 * to students enrolled/affiliated with the same university.
 */
export function checkDocumentAccess(
  note: StudyNote,
  user: StudentUser | null
): { canAccess: boolean; reason?: string } {
  if (!note.isRestricted) {
    return { canAccess: true };
  }

  if (!user || !user.university) {
    return {
      canAccess: false,
      reason: 'This resource is restricted to verified campus members. Sign in and set your university to unlock.'
    };
  }

  const userUni = user.university.toLowerCase();
  const noteUni = (note.uploaderUniversity || '').toLowerCase();
  const matches =
    userUni.includes(noteUni) ||
    noteUni.includes(userUni) ||
    (note.universityId && user.universityId === note.universityId);

  if (matches) {
    return { canAccess: true };
  }

  return {
    canAccess: false,
    reason: `This document is reserved for members of ${note.uploaderUniversity}. You are registered with ${user.university}.`
  };
}
