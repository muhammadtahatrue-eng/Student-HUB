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
const STORAGE_KEY_PROGRAMS = 'xeusar_academic_programs_v2';
const STORAGE_KEY_ENROLLMENTS = 'xeusar_program_enrollments_v2';
const STORAGE_KEY_STUDENT_PROGRAM_MAP = 'xeusar_student_program_map_v2';
const STORAGE_KEY_FOLLOWED_PROGRAMS = 'xeusar_followed_programs_v2';
const STORAGE_KEY_DISCUSSIONS = 'xeusar_program_discussions_v2';
const STORAGE_KEY_DOUBTS = 'xeusar_program_doubts_v2';

// Zero hardcoded enrollments — counts increment only when real students register
const INITIAL_STUDENT_ENROLLMENTS: Record<string, number> = {};

// ----------------------------------------------------------------------------
// ENROLLMENT & SYSTEM-DRIVEN DYNAMIC UNLOCK
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

function getStudentProgramMap(): Record<string, string> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_STUDENT_PROGRAM_MAP);
    if (raw) {
      return JSON.parse(raw);
    }
  } catch {}
  return {};
}

function saveStudentProgramMap(map: Record<string, string>): void {
  try {
    localStorage.setItem(STORAGE_KEY_STUDENT_PROGRAM_MAP, JSON.stringify(map));
  } catch {}
}

export function enrollStudentInProgram(programId: string, studentId?: string): void {
  if (!programId) return;
  const map = getProgramEnrollmentMap();

  let effectiveStudentId = studentId;
  if (!effectiveStudentId) {
    try {
      const rawUser = localStorage.getItem('studyvault_active_user');
      if (rawUser) {
        const parsed = JSON.parse(rawUser);
        if (parsed?.id) effectiveStudentId = parsed.id;
      }
    } catch {}
  }

  if (effectiveStudentId) {
    const studentMap = getStudentProgramMap();
    const previousProgramId = studentMap[effectiveStudentId];
    if (previousProgramId === programId) {
      map[programId] = Math.max(1, map[programId] || 1);
      saveProgramEnrollmentMap(map);
      return;
    }
    if (previousProgramId && previousProgramId !== programId) {
      const prevCount = map[previousProgramId] || 0;
      map[previousProgramId] = Math.max(0, prevCount - 1);
    }
    studentMap[effectiveStudentId] = programId;
    saveStudentProgramMap(studentMap);
  }

  const current = map[programId] || 0;
  map[programId] = current + 1;
  saveProgramEnrollmentMap(map);
}

export function unenrollStudentFromProgram(studentId?: string): void {
  if (!studentId) return;
  const studentMap = getStudentProgramMap();
  const prevProgramId = studentMap[studentId];
  if (!prevProgramId) return;

  const map = getProgramEnrollmentMap();
  if (map[prevProgramId]) {
    map[prevProgramId] = Math.max(0, map[prevProgramId] - 1);
    saveProgramEnrollmentMap(map);
  }
  delete studentMap[studentId];
  saveStudentProgramMap(studentMap);
}

// ----------------------------------------------------------------------------
// PROGRAM RETRIEVAL & DYNAMIC COUNTS
// ----------------------------------------------------------------------------

function getStoredSystemPrograms(): AcademicProgram[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_PROGRAMS);
    if (raw) {
      return JSON.parse(raw);
    }
  } catch {}
  return [];
}

function saveStoredSystemPrograms(list: AcademicProgram[]): void {
  try {
    localStorage.setItem(STORAGE_KEY_PROGRAMS, JSON.stringify(list));
  } catch {}
}

export function getAllPrograms(): AcademicProgram[] {
  const customPrograms = getStoredSystemPrograms();
  const enrollments = getProgramEnrollmentMap();
  const notesCountMap = getRealResourceCountsByProgram();

  // Combine master and system-created programs (deduplicated by id)
  const seenIds = new Set<string>();
  const combined: AcademicProgram[] = [];
  [...MASTER_ACADEMIC_PROGRAMS, ...customPrograms].forEach(prog => {
    if (!seenIds.has(prog.id)) {
      seenIds.add(prog.id);
      combined.push(prog);
    }
  });

  // Also ensure active registered student in localStorage is reflected
  let activeUserProgramId: string | undefined;
  try {
    const rawUser = localStorage.getItem('studyvault_active_user');
    if (rawUser) {
      const parsed = JSON.parse(rawUser);
      if (parsed && !parsed.isGuest) {
        if (parsed.programId) {
          activeUserProgramId = parsed.programId;
        } else if (parsed.program || parsed.majorOrField) {
          const q = (parsed.program || parsed.majorOrField || '').trim().toLowerCase();
          const matched = combined.find(
            p =>
              p.id.toLowerCase() === q ||
              p.name.toLowerCase() === q ||
              p.shortCode.toLowerCase() === q ||
              p.name.toLowerCase().includes(q) ||
              q.includes(p.name.toLowerCase())
          );
          if (matched) {
            activeUserProgramId = matched.id;
          }
        }
      }
    }
  } catch {}

  return combined.map(prog => {
    let realStudents = enrollments[prog.id] ?? prog.activeStudents ?? 0;
    if (activeUserProgramId && prog.id === activeUserProgramId) {
      realStudents = Math.max(realStudents, 1);
    }
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
 * has registered with that specific program (activeStudents >= 1).
 * If 0 students, it remains hidden until a student registers with that program.
 */
export function getUnlockedPrograms(): AcademicProgram[] {
  const all = getAllPrograms();
  return all.filter(prog => (prog.activeStudents || 0) >= 1);
}

export function isProgramUnlocked(programId: string): boolean {
  const prog = getProgramById(programId);
  return prog ? (prog.activeStudents || 0) >= 1 : false;
}

export function getProgramById(programId: string): AcademicProgram | undefined {
  const all = getAllPrograms();
  return all.find(p => p.id === programId || p.id.toLowerCase() === programId.toLowerCase());
}

export function findProgramByNameOrFuzzy(query: string, degreeTier?: DegreeTier): AcademicProgram | undefined {
  if (!query) return undefined;
  const clean = query.trim().toLowerCase();
  const all = getAllPrograms();

  // 1. Exact ID, Name, or ShortCode match
  const exact = all.find(
    p =>
      p.id.toLowerCase() === clean ||
      p.name.toLowerCase() === clean ||
      p.shortCode.toLowerCase() === clean
  );
  if (exact) return exact;

  // 2. Match considering degreeTier if provided
  const tierPrefix =
    degreeTier === "Master's"
      ? 'ms '
      : degreeTier === 'PhD'
      ? 'phd '
      : degreeTier === 'Associate'
      ? 'adp '
      : 'bs ';

  const withPrefixMatch = all.find(
    p =>
      p.name.toLowerCase() === `${tierPrefix}${clean}` ||
      (degreeTier && p.degreeTier === degreeTier && p.name.toLowerCase().includes(clean))
  );
  if (withPrefixMatch) return withPrefixMatch;

  // 3. Fuzzy match by name or discipline
  return all.find(
    p =>
      p.name.toLowerCase().includes(clean) ||
      clean.includes(p.name.toLowerCase())
  );
}

// ----------------------------------------------------------------------------
// SYSTEM AUTOMATIC PROGRAM CREATION ON STUDENT REGISTRATION
// ----------------------------------------------------------------------------

function deriveProgramFormatFromRegistration(name: string, degreeTier: DegreeTier = 'Undergraduate'): {
  formattedName: string;
  shortCode: string;
  discipline: string;
} {
  const raw = name.trim();
  const lower = raw.toLowerCase();

  let discipline = 'Interdisciplinary Studies';
  if (lower.includes('engineer') || lower.includes('robotics') || lower.includes('aerospace')) {
    discipline = 'Engineering';
  } else if (lower.includes('computer') || lower.includes('software') || lower.includes('cyber') || lower.includes('information tech')) {
    discipline = 'Computing & Information Sciences';
  } else if (lower.includes('artificial intelligence') || lower.includes('data science')) {
    discipline = 'Data Science & AI';
  } else if (lower.includes('business') || lower.includes('finance') || lower.includes('accounting') || lower.includes('marketing') || lower.includes('economics')) {
    discipline = 'Business & Management';
  } else if (lower.includes('math') || lower.includes('physics') || lower.includes('chemistry')) {
    discipline = 'Natural & Physical Sciences';
  } else if (lower.includes('medicine') || lower.includes('nursing') || lower.includes('pharmacy') || lower.includes('biology') || lower.includes('neuro')) {
    discipline = 'Medical & Life Sciences';
  } else if (lower.includes('law') || lower.includes('psychology') || lower.includes('political') || lower.includes('sociology') || lower.includes('philosophy') || lower.includes('history') || lower.includes('literature')) {
    discipline = 'Humanities & Social Sciences';
  } else if (lower.includes('architecture') || lower.includes('design') || lower.includes('media')) {
    discipline = 'Design, Architecture & Media';
  }

  const hasDegreePrefix = /^(bs|b\.s\.|ba|b\.a\.|be|b\.e\.|bba|ms|m\.s\.|ma|m\.a\.|mba|phd|ph\.d\.|adp|associate)\b/i.test(raw);
  let formattedName = raw;
  if (!hasDegreePrefix) {
    if (degreeTier === "Master's") {
      formattedName = `MS ${raw}`;
    } else if (degreeTier === 'PhD') {
      formattedName = `PhD ${raw}`;
    } else if (degreeTier === 'Associate') {
      formattedName = `ADP ${raw}`;
    } else {
      formattedName = `BS ${raw}`;
    }
  }

  const words = formattedName.replace(/[^a-zA-Z0-9\s]/g, '').split(/\s+/).filter(Boolean);
  const shortCode =
    words
      .map(w => w[0]?.toUpperCase() || '')
      .join('')
      .slice(0, 6) || 'PROG';

  return { formattedName, shortCode, discipline };
}

/**
 * Automatically called by the system when a student registers or saves their profile
 * with a specific degree program / major.
 * - If the program exists in the master catalog, enrolls the student and unlocks it.
 * - If the program does not exist yet, the system creates it automatically and unlocks it with activeStudents >= 1.
 */
export function ensureSystemProgramForRegisteredStudent(params: {
  studentId?: string;
  programId?: string;
  programName?: string;
  degreeTier?: DegreeTier;
  discipline?: string;
}): AcademicProgram | undefined {
  const tier: DegreeTier = params.degreeTier || 'Undergraduate';

  if (params.programId) {
    const byId = getProgramById(params.programId);
    if (byId) {
      enrollStudentInProgram(byId.id, params.studentId);
      return getProgramById(byId.id) || byId;
    }
  }

  const rawName = (params.programName || '').trim();
  if (!rawName) return undefined;

  const existing = findProgramByNameOrFuzzy(rawName, tier);
  if (existing) {
    enrollStudentInProgram(existing.id, params.studentId);
    return getProgramById(existing.id) || existing;
  }

  // System automatically creates this program when a student registers with it
  const { formattedName, shortCode, discipline } = deriveProgramFormatFromRegistration(rawName, tier);
  const slug = formattedName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
  const id = `sys-${slug}`;

  const customList = getStoredSystemPrograms();
  const alreadyStored = customList.find(
    p => p.id === id || p.name.toLowerCase() === formattedName.toLowerCase()
  );
  if (alreadyStored) {
    enrollStudentInProgram(alreadyStored.id, params.studentId);
    return getProgramById(alreadyStored.id) || alreadyStored;
  }

  const durationYears = tier === "Master's" ? 2 : tier === 'PhD' ? 3 : tier === 'Associate' ? 2 : 4;
  const totalSemesters = durationYears * 2;
  const defaultSemesters: ProgramSemester[] = Array.from({ length: totalSemesters }, (_, i) => ({
    semesterNumber: i + 1,
    title: `Semester ${i + 1}`,
    courses: [
      {
        code: `${shortCode}-${(i + 1) * 100 + 1}`,
        name: `${rawName} Core I (Sem ${i + 1})`,
        credits: 3,
        category: 'Core',
        description: `Core curriculum module for ${formattedName} in Semester ${i + 1}.`
      },
      {
        code: `${shortCode}-${(i + 1) * 100 + 2}`,
        name: `${rawName} Applied Lab & Seminar (Sem ${i + 1})`,
        credits: 3,
        category: i < 4 ? 'Core' : 'Major Elective',
        description: `Applied coursework and research methods for ${formattedName}.`
      }
    ]
  }));

  const newSystemProgram: AcademicProgram = {
    id,
    name: formattedName,
    shortCode,
    degreeTier: tier,
    discipline: params.discipline || discipline,
    description: `Official ${tier} degree cohort for ${formattedName}, unlocked by registered students in ${params.discipline || discipline}.`,
    badge: `${tier} Cohort`,
    durationYears,
    totalSemesters,
    totalCredits: tier === "Master's" ? 33 : tier === 'PhD' ? 48 : tier === 'Associate' ? 66 : 130,
    activeStudents: 1,
    resourceCount: 0,
    isCustom: false,
    status: 'verified',
    createdByStudentId: params.studentId,
    bannerGradient: 'from-cyan-950/40 via-indigo-950/60 to-black',
    semesters: defaultSemesters
  };

  customList.unshift(newSystemProgram);
  saveStoredSystemPrograms(customList);

  enrollStudentInProgram(id, params.studentId);
  return getProgramById(id) || newSystemProgram;
}

export function registerCustomProgram(params: {
  name: string;
  degreeTier: DegreeTier;
  discipline?: string;
  durationYears?: number;
  description?: string;
  studentId?: string;
}): AcademicProgram {
  const prog = ensureSystemProgramForRegisteredStudent({
    studentId: params.studentId,
    programName: params.name,
    degreeTier: params.degreeTier,
    discipline: params.discipline
  });
  return prog!;
}

// ----------------------------------------------------------------------------
// FOLLOWED PROGRAMS
// ----------------------------------------------------------------------------

export function getFollowedProgramIds(): string[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_FOLLOWED_PROGRAMS);
    if (raw) return JSON.parse(raw);
  } catch {}
  return [];
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
// REAL RESOURCE COUNTS FROM UPLOADED NOTES (NO HARDCODED COUNTS)
// ----------------------------------------------------------------------------

export function getRealResourceCountsByProgram(): Record<string, number> {
  const counts: Record<string, number> = {};

  try {
    const localNotesRaw = localStorage.getItem('xeusar_local_notes_v2');
    if (localNotesRaw) {
      const localNotes: StudyNote[] = JSON.parse(localNotesRaw);
      localNotes.forEach(note => {
        const associatedIds = new Set<string>();
        if (note.programId) associatedIds.add(note.programId);
        if (Array.isArray(note.programIds)) {
          note.programIds.forEach(pid => {
            if (pid) associatedIds.add(pid);
          });
        }
        if (associatedIds.size === 0 && note.subject === 'Computer Science') {
          associatedIds.add('bs-cs');
        }
        associatedIds.forEach(pid => {
          counts[pid] = (counts[pid] || 0) + 1;
        });
      });
    }
  } catch {}

  return counts;
}

// ----------------------------------------------------------------------------
// PROGRAM-SCOPED DISCUSSIONS
// ----------------------------------------------------------------------------

export function getAllProgramDiscussions(): ProgramDiscussionPost[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_DISCUSSIONS);
    const all: ProgramDiscussionPost[] = raw ? JSON.parse(raw) : INITIAL_PROGRAM_DISCUSSIONS;
    return [...all].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  } catch {
    return INITIAL_PROGRAM_DISCUSSIONS;
  }
}

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
