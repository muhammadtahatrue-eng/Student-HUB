import {
  AcademicProgram,
  ProgramSemester,
  ProgramCourse,
  ProgramDiscussionPost,
  ProgramDiscussionComment,
  ProgramDiscussionCategory,
  ProgramDoubtQuestion,
  ProgramDoubtAnswer,
  StudyNote,
  StudentUser,
  DegreeTier
} from '../types/index.ts';
import {
  MASTER_ACADEMIC_PROGRAMS,
  INITIAL_PROGRAM_DISCUSSIONS,
  INITIAL_PROGRAM_DOUBTS
} from '../data/programData.ts';

// Local storage keys
const STORAGE_KEY_PROGRAMS = 'studyvault_academic_programs_v1';
const STORAGE_KEY_ENROLLMENTS = 'studyvault_program_enrollments_v1';
const STORAGE_KEY_FOLLOWED_PROGRAMS = 'studyvault_followed_programs_v1';
const STORAGE_KEY_DISCUSSIONS = 'studyvault_program_discussions_v1';
const STORAGE_KEY_DOUBTS = 'studyvault_program_doubts_v1';

// Seed enrollment mapping for initial student distribution
const INITIAL_STUDENT_ENROLLMENTS: Record<string, number> = {
  'bs-cs': 1420,
  'bs-se': 890,
  'bba': 940,
  'bs-ds-ai': 620,
  'bs-ee': 410,
  'ms-ds': 310,
  'ms-cs': 240,
  'phd-cs': 65,
  'ad-cs': 120,
  // Other programs like bs-cys, bs-af, mba, phd-mgmt, ad-ba have 0 enrollments initially (LOCKED until student joins)
};

// ----------------------------------------------------------------------------
// ENROLLMENT & DYNAMIC UNLOCK SYSTEM
// ----------------------------------------------------------------------------

export function getProgramEnrollmentMap(): Record<string, number> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_ENROLLMENTS);
    if (raw) {
      return { ...INITIAL_STUDENT_ENROLLMENTS, ...JSON.parse(raw) };
    }
  } catch {}
  return { ...INITIAL_STUDENT_ENROLLMENTS };
}

export function saveProgramEnrollmentMap(map: Record<string, number>): void {
  try {
    localStorage.setItem(STORAGE_KEY_ENROLLMENTS, JSON.stringify(map));
  } catch {}
}

export function enrollStudentInProgram(programId: string): void {
  const map = getProgramEnrollmentMap();
  const current = map[programId] || 0;
  map[programId] = current + 1;
  saveProgramEnrollmentMap(map);
}

// ----------------------------------------------------------------------------
// PROGRAM RETRIEVAL & DYNAMIC COUNTS
// ----------------------------------------------------------------------------

export function getAllPrograms(): AcademicProgram[] {
  let customPrograms: AcademicProgram[] = [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY_PROGRAMS);
    if (raw) {
      customPrograms = JSON.parse(raw);
    }
  } catch {}

  const enrollments = getProgramEnrollmentMap();
  const notesCountMap = getRealResourceCountsByProgram();

  // Combine master and custom programs
  const combined = [...MASTER_ACADEMIC_PROGRAMS, ...customPrograms];

  return combined.map(prog => {
    const realStudents = enrollments[prog.id] ?? prog.activeStudents ?? 0;
    const realResources = notesCountMap[prog.id] ?? prog.resourceCount ?? 0;
    return {
      ...prog,
      activeStudents: realStudents,
      resourceCount: realResources
    };
  });
}

/**
 * Dynamic Unlock Rule:
 * A degree program card MUST ONLY appear in the global Explore grid if AT LEAST 1 student
 * has registered and mapped themselves to that specific program (activeStudents >= 1).
 * If 0 students, it remains hidden until unlocked.
 */
export function getUnlockedPrograms(): AcademicProgram[] {
  const all = getAllPrograms();
  return all.filter(prog => prog.activeStudents > 0);
}

export function isProgramUnlocked(programId: string): boolean {
  const prog = getProgramById(programId);
  return prog ? prog.activeStudents > 0 : false;
}

export function getProgramById(programId: string): AcademicProgram | undefined {
  const all = getAllPrograms();
  return all.find(p => p.id === programId || p.id.toLowerCase() === programId.toLowerCase());
}

export function findProgramByNameOrFuzzy(query: string): AcademicProgram | undefined {
  if (!query) return undefined;
  const clean = query.trim().toLowerCase();
  const all = getAllPrograms();
  return all.find(
    p =>
      p.name.toLowerCase() === clean ||
      p.shortCode.toLowerCase() === clean ||
      p.name.toLowerCase().includes(clean) ||
      clean.includes(p.name.toLowerCase())
  );
}

// ----------------------------------------------------------------------------
// CUSTOM PROGRAM REGISTRATION
// ----------------------------------------------------------------------------

export function registerCustomProgram(params: {
  name: string;
  degreeTier: DegreeTier;
  discipline?: string;
  durationYears?: number;
  description?: string;
  studentId?: string;
}): AcademicProgram {
  const slug = params.name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
  const id = `custom-${slug}-${Date.now().toString(36)}`;

  const newProgram: AcademicProgram = {
    id,
    name: params.name.trim(),
    shortCode: params.name
      .split(' ')
      .map(w => w[0]?.toUpperCase() || '')
      .join('')
      .slice(0, 6) || 'CUSTOM',
    degreeTier: params.degreeTier,
    discipline: params.discipline || 'Interdisciplinary Studies',
    description: params.description || `Specialized ${params.degreeTier} academic curriculum initiated by student community peers.`,
    badge: 'Community Verified Program',
    durationYears: params.durationYears || (params.degreeTier === "Master's" ? 2 : params.degreeTier === 'PhD' ? 3 : 4),
    totalSemesters: (params.durationYears || (params.degreeTier === "Master's" ? 2 : params.degreeTier === 'PhD' ? 3 : 4)) * 2,
    totalCredits: params.degreeTier === "Master's" ? 33 : params.degreeTier === 'PhD' ? 48 : 130,
    activeStudents: 1, // Instantly unlocks for this registered student!
    resourceCount: 0,
    isCustom: true,
    status: 'verified',
    createdByStudentId: params.studentId,
    bannerGradient: 'from-cyan-950/40 via-indigo-950/60 to-black',
    semesters: [
      {
        semesterNumber: 1,
        name: 'Semester 1: Core Foundation',
        courses: [
          {
            id: `${id}-c1`,
            programId: id,
            semesterNumber: 1,
            code: 'CORE-101',
            name: `${params.name} Foundations`,
            credits: 3,
            description: 'Core introductory coursework and academic methods.',
            resourceCount: 0
          }
        ]
      }
    ]
  };

  try {
    const raw = localStorage.getItem(STORAGE_KEY_PROGRAMS);
    const customList: AcademicProgram[] = raw ? JSON.parse(raw) : [];
    customList.unshift(newProgram);
    localStorage.setItem(STORAGE_KEY_PROGRAMS, JSON.stringify(customList));
  } catch {}

  // Enroll student to unlock it
  enrollStudentInProgram(id);

  return newProgram;
}

// ----------------------------------------------------------------------------
// FOLLOWED PROGRAMS
// ----------------------------------------------------------------------------

export function getFollowedProgramIds(): string[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_FOLLOWED_PROGRAMS);
    if (raw) return JSON.parse(raw);
  } catch {}
  return ['bs-cs']; // default follow
}

export function toggleFollowProgram(programId: string): boolean {
  try {
    const current = getFollowedProgramIds();
    let updated: string[];
    let isNowFollowing = false;
    if (current.includes(programId)) {
      updated = current.filter(id => id !== programId);
      isNowFollowing = false;
    } else {
      updated = [...current, programId];
      isNowFollowing = true;
    }
    localStorage.setItem(STORAGE_KEY_FOLLOWED_PROGRAMS, JSON.stringify(updated));
    return isNowFollowing;
  } catch {
    return false;
  }
}

// ----------------------------------------------------------------------------
// REAL RESOURCE COUNTS FROM STORED & SEED NOTES
// ----------------------------------------------------------------------------

export function getRealResourceCountsByProgram(): Record<string, number> {
  const counts: Record<string, number> = {
    'bs-cs': 88,
    'bs-se': 54,
    'bba': 46,
    'bs-ds-ai': 42,
    'bs-ee': 29,
    'ms-ds': 28,
    'ms-cs': 22,
    'phd-cs': 14,
    'ad-cs': 11
  };

  try {
    const customNotesRaw = localStorage.getItem('studyvault_custom_notes');
    if (customNotesRaw) {
      const customNotes: StudyNote[] = JSON.parse(customNotesRaw);
      customNotes.forEach(note => {
        if (note.programId) {
          counts[note.programId] = (counts[note.programId] || 0) + 1;
        }
      });
    }
  } catch {}

  return counts;
}

// ----------------------------------------------------------------------------
// PROGRAM-SCOPED DISCUSSIONS
// ----------------------------------------------------------------------------

export function getProgramDiscussions(programId: string): ProgramDiscussionPost[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_DISCUSSIONS);
    let all: ProgramDiscussionPost[] = raw ? JSON.parse(raw) : INITIAL_PROGRAM_DISCUSSIONS;
    const scoped = all.filter(p => p.programId === programId);
    return scoped.sort((a, b) => {
      if (a.isPinned && !b.isPinned) return -1;
      if (!a.isPinned && b.isPinned) return 1;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
  } catch {
    return INITIAL_PROGRAM_DISCUSSIONS.filter(p => p.programId === programId);
  }
}

export function createProgramDiscussion(params: {
  programId: string;
  title: string;
  content: string;
  category: ProgramDiscussionCategory;
  semesterTag?: string;
  courseTag?: string;
  author: StudentUser;
}): ProgramDiscussionPost {
  const newPost: ProgramDiscussionPost = {
    id: `disc-${Date.now().toString(36)}`,
    programId: params.programId,
    title: params.title.trim(),
    content: params.content.trim(),
    category: params.category,
    semesterTag: params.semesterTag,
    courseTag: params.courseTag,
    authorId: params.author.id,
    authorName: params.author.name,
    authorAvatar: params.author.avatarUrl,
    authorProgram: params.author.program || 'Student Peer',
    authorDegreeTier: params.author.degreeTier,
    createdAt: new Date().toISOString(),
    upvotesCount: 1,
    hasUpvoted: true,
    commentsCount: 0,
    comments: []
  };

  try {
    const raw = localStorage.getItem(STORAGE_KEY_DISCUSSIONS);
    const list: ProgramDiscussionPost[] = raw ? JSON.parse(raw) : [...INITIAL_PROGRAM_DISCUSSIONS];
    list.unshift(newPost);
    localStorage.setItem(STORAGE_KEY_DISCUSSIONS, JSON.stringify(list));
  } catch {}

  return newPost;
}

export function toggleUpvoteProgramDiscussion(postId: string): { upvotesCount: number; hasUpvoted: boolean } {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_DISCUSSIONS);
    const list: ProgramDiscussionPost[] = raw ? JSON.parse(raw) : [...INITIAL_PROGRAM_DISCUSSIONS];
    const post = list.find(p => p.id === postId);
    if (!post) return { upvotesCount: 0, hasUpvoted: false };

    if (post.hasUpvoted) {
      post.hasUpvoted = false;
      post.upvotesCount = Math.max(0, post.upvotesCount - 1);
    } else {
      post.hasUpvoted = true;
      post.upvotesCount = post.upvotesCount + 1;
    }

    localStorage.setItem(STORAGE_KEY_DISCUSSIONS, JSON.stringify(list));
    return { upvotesCount: post.upvotesCount, hasUpvoted: post.hasUpvoted };
  } catch {
    return { upvotesCount: 0, hasUpvoted: false };
  }
}

export function addProgramDiscussionComment(params: {
  postId: string;
  content: string;
  author: StudentUser;
}): ProgramDiscussionComment | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_DISCUSSIONS);
    const list: ProgramDiscussionPost[] = raw ? JSON.parse(raw) : [...INITIAL_PROGRAM_DISCUSSIONS];
    const post = list.find(p => p.id === params.postId);
    if (!post) return null;

    const comment: ProgramDiscussionComment = {
      id: `comm-${Date.now().toString(36)}`,
      postId: params.postId,
      authorId: params.author.id,
      authorName: params.author.name,
      authorAvatar: params.author.avatarUrl,
      authorProgram: params.author.program || 'Student Peer',
      authorDegreeTier: params.author.degreeTier,
      content: params.content.trim(),
      createdAt: new Date().toISOString(),
      upvotesCount: 0,
      hasUpvoted: false
    };

    post.comments = post.comments || [];
    post.comments.push(comment);
    post.commentsCount = post.comments.length;

    localStorage.setItem(STORAGE_KEY_DISCUSSIONS, JSON.stringify(list));
    return comment;
  } catch {
    return null;
  }
}

// ----------------------------------------------------------------------------
// PROGRAM DOUBT CENTER (Q&A)
// ----------------------------------------------------------------------------

export function getProgramDoubts(programId: string): ProgramDoubtQuestion[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_DOUBTS);
    let all: ProgramDoubtQuestion[] = raw ? JSON.parse(raw) : INITIAL_PROGRAM_DOUBTS;
    const scoped = all.filter(q => q.programId === programId);
    return scoped.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  } catch {
    return INITIAL_PROGRAM_DOUBTS.filter(q => q.programId === programId);
  }
}

export function createProgramDoubt(params: {
  programId: string;
  title: string;
  content: string;
  courseCode: string;
  semesterTag?: string;
  tags: string[];
  author: StudentUser;
  attachments?: { name: string; url: string; size?: string }[];
}): ProgramDoubtQuestion {
  const newQuestion: ProgramDoubtQuestion = {
    id: `doubt-${Date.now().toString(36)}`,
    programId: params.programId,
    title: params.title.trim(),
    content: params.content.trim(),
    courseCode: params.courseCode.trim().toUpperCase(),
    semesterTag: params.semesterTag,
    tags: params.tags,
    authorId: params.author.id,
    authorName: params.author.name,
    authorAvatar: params.author.avatarUrl,
    authorProgram: params.author.program || 'Student Peer',
    createdAt: new Date().toISOString(),
    upvotesCount: 1,
    hasUpvoted: true,
    status: 'unanswered',
    attachments: params.attachments,
    answers: []
  };

  try {
    const raw = localStorage.getItem(STORAGE_KEY_DOUBTS);
    const list: ProgramDoubtQuestion[] = raw ? JSON.parse(raw) : [...INITIAL_PROGRAM_DOUBTS];
    list.unshift(newQuestion);
    localStorage.setItem(STORAGE_KEY_DOUBTS, JSON.stringify(list));
  } catch {}

  return newQuestion;
}

export function toggleUpvoteProgramDoubt(doubtId: string): { upvotesCount: number; hasUpvoted: boolean } {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_DOUBTS);
    const list: ProgramDoubtQuestion[] = raw ? JSON.parse(raw) : [...INITIAL_PROGRAM_DOUBTS];
    const q = list.find(item => item.id === doubtId);
    if (!q) return { upvotesCount: 0, hasUpvoted: false };

    if (q.hasUpvoted) {
      q.hasUpvoted = false;
      q.upvotesCount = Math.max(0, q.upvotesCount - 1);
    } else {
      q.hasUpvoted = true;
      q.upvotesCount = q.upvotesCount + 1;
    }

    localStorage.setItem(STORAGE_KEY_DOUBTS, JSON.stringify(list));
    return { upvotesCount: q.upvotesCount, hasUpvoted: q.hasUpvoted };
  } catch {
    return { upvotesCount: 0, hasUpvoted: false };
  }
}

export function addProgramDoubtAnswer(params: {
  questionId: string;
  content: string;
  author: StudentUser;
  role?: string;
}): ProgramDoubtAnswer | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_DOUBTS);
    const list: ProgramDoubtQuestion[] = raw ? JSON.parse(raw) : [...INITIAL_PROGRAM_DOUBTS];
    const q = list.find(item => item.id === params.questionId);
    if (!q) return null;

    const answer: ProgramDoubtAnswer = {
      id: `ans-${Date.now().toString(36)}`,
      questionId: params.questionId,
      authorId: params.author.id,
      authorName: params.author.name,
      authorAvatar: params.author.avatarUrl,
      authorRole: params.role || 'Peer',
      authorProgram: params.author.program || 'Student Peer',
      content: params.content.trim(),
      createdAt: new Date().toISOString(),
      upvotesCount: 0,
      hasUpvoted: false,
      isAccepted: false
    };

    q.answers = q.answers || [];
    q.answers.push(answer);
    if (q.status === 'unanswered') {
      q.status = 'answered';
    }

    localStorage.setItem(STORAGE_KEY_DOUBTS, JSON.stringify(list));
    return answer;
  } catch {
    return null;
  }
}

export function markAcceptedProgramAnswer(questionId: string, answerId: string): boolean {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_DOUBTS);
    const list: ProgramDoubtQuestion[] = raw ? JSON.parse(raw) : [...INITIAL_PROGRAM_DOUBTS];
    const q = list.find(item => item.id === questionId);
    if (!q) return false;

    q.acceptedAnswerId = answerId;
    q.status = 'answered';
    q.answers.forEach(a => {
      a.isAccepted = a.id === answerId;
    });

    localStorage.setItem(STORAGE_KEY_DOUBTS, JSON.stringify(list));
    return true;
  } catch {
    return false;
  }
}
