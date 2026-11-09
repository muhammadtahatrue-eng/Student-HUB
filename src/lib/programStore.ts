import { SupabaseClient } from '@supabase/supabase-js';
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
import { getSupabaseInstance } from './supabaseClient.ts';

// Local storage keys
const STORAGE_KEY_PROGRAMS = 'xeusar_academic_programs_v2';
const STORAGE_KEY_ENROLLMENTS = 'xeusar_program_enrollments_v2';
const STORAGE_KEY_STUDENT_PROGRAM_MAP = 'xeusar_student_program_map_v2';
const STORAGE_KEY_FOLLOWED_PROGRAMS = 'xeusar_followed_programs_v2';
const STORAGE_KEY_DISCUSSIONS = 'xeusar_program_discussions_v2';
const STORAGE_KEY_DOUBTS = 'xeusar_program_doubts_v2';
const STORAGE_KEY_PROGRAM_UPVOTES = 'xeusar_program_upvotes_v2';

function getProgramUpvotesKey(userId?: string): string {
  const effectiveUserId = userId || getActiveUserFromStorage()?.id;
  return effectiveUserId
    ? `${STORAGE_KEY_PROGRAM_UPVOTES}_${effectiveUserId}`
    : STORAGE_KEY_PROGRAM_UPVOTES;
}

function getProgramUpvotedSet(userId?: string): Set<string> {
  try {
    const raw = localStorage.getItem(getProgramUpvotesKey(userId));
    if (raw) return new Set(JSON.parse(raw));
  } catch {}
  return new Set();
}

function saveProgramUpvotedSet(set: Set<string>, userId?: string): void {
  try {
    localStorage.setItem(getProgramUpvotesKey(userId), JSON.stringify(Array.from(set)));
  } catch {}
}

function getActiveUserFromStorage(): { id?: string; name?: string; isGuest?: boolean; programId?: string; program?: string; majorOrField?: string } | null {
  try {
    const raw = localStorage.getItem('studyvault_active_user');
    if (raw) return JSON.parse(raw);
  } catch {}
  return null;
}

function isUuidString(val?: string | null): boolean {
  if (!val) return false;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(val.trim());
}

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
    // If real shared resources have been uploaded to this program by a registered student,
    // ensure at least 1 active student is reflected so the program is unlocked across all users.
    if (realResources > 0) {
      realStudents = Math.max(realStudents, 1);
    }
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
    name: `Semester ${i + 1}`,
    courses: [
      {
        id: `${id}-sem${i + 1}-c1`,
        programId: id,
        semesterNumber: i + 1,
        code: `${shortCode}-${(i + 1) * 100 + 1}`,
        name: `${rawName} Core I (Sem ${i + 1})`,
        credits: 3,
        description: `Core curriculum module for ${formattedName} in Semester ${i + 1}.`
      },
      {
        id: `${id}-sem${i + 1}-c2`,
        programId: id,
        semesterNumber: i + 1,
        code: `${shortCode}-${(i + 1) * 100 + 2}`,
        name: `${rawName} Applied Lab & Seminar (Sem ${i + 1})`,
        credits: 3,
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

  const sb = getSupabaseInstance();
  if (sb && isUuidString(params.studentId)) {
    ensureProgramExistsInSupabase(sb, newSystemProgram, params.studentId).catch(() => {});
  }

  return getProgramById(id) || newSystemProgram;
}

export async function ensureProgramExistsInSupabase(
  supabaseClient: SupabaseClient | null,
  programOrId: AcademicProgram | string | null | undefined,
  userId?: string | null
): Promise<boolean> {
  if (!supabaseClient || !programOrId) return false;
  const prog =
    typeof programOrId === 'string'
      ? getProgramById(programOrId) || findProgramByNameOrFuzzy(programOrId)
      : programOrId;
  if (!prog || !prog.id) return false;

  try {
    const { data: existing } = await supabaseClient
      .from('academic_programs')
      .select('id')
      .eq('id', prog.id)
      .maybeSingle();
    if (existing?.id) return true;

    const cleanUid = isUuidString(userId) ? userId!.trim() : undefined;
    const payload: Record<string, any> = {
      id: prog.id,
      title: prog.name,
      name: prog.name,
      code: prog.shortCode || 'PROG',
      category: prog.discipline || 'General',
      level: prog.degreeTier || 'Undergraduate',
      duration: `${prog.durationYears || 4} Years`,
      description: prog.description || '',
      subjects: Array.isArray(prog.semesters) ? prog.semesters : [],
      access_scope: 'public'
    };
    if (cleanUid) {
      payload.created_by = cleanUid;
    }

    const { error } = await supabaseClient
      .from('academic_programs')
      .upsert([payload], { onConflict: 'id', ignoreDuplicates: true });
    return !error;
  } catch {
    return false;
  }
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
// FOLLOWED PROGRAMS (SCOPED PER USER)
// ----------------------------------------------------------------------------

function getFollowedProgramsStorageKey(userId?: string): string {
  const effectiveUserId = userId || getActiveUserFromStorage()?.id;
  return effectiveUserId
    ? `${STORAGE_KEY_FOLLOWED_PROGRAMS}_${effectiveUserId}`
    : STORAGE_KEY_FOLLOWED_PROGRAMS;
}

export function getFollowedProgramIds(userId?: string): string[] {
  try {
    const raw = localStorage.getItem(getFollowedProgramsStorageKey(userId));
    if (raw) return JSON.parse(raw);
  } catch {}
  return [];
}

export function toggleFollowProgram(programId: string, userId?: string): boolean {
  try {
    const current = getFollowedProgramIds(userId);
    let updated: string[];
    let isNowFollowing = false;
    if (current.includes(programId)) {
      updated = current.filter(id => id !== programId);
      isNowFollowing = false;
    } else {
      updated = [...current, programId];
      isNowFollowing = true;
    }
    localStorage.setItem(getFollowedProgramsStorageKey(userId), JSON.stringify(updated));
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
  const upvotedSet = getProgramUpvotedSet();
  try {
    const raw = localStorage.getItem(STORAGE_KEY_DISCUSSIONS);
    const all: ProgramDiscussionPost[] = raw ? JSON.parse(raw) : INITIAL_PROGRAM_DISCUSSIONS;
    return [...all]
      .map(p => ({ ...p, hasUpvoted: upvotedSet.has(`disc-${p.id}`) }))
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  } catch {
    return INITIAL_PROGRAM_DISCUSSIONS;
  }
}

export function getProgramDiscussions(programId: string): ProgramDiscussionPost[] {
  const upvotedSet = getProgramUpvotedSet();
  try {
    const raw = localStorage.getItem(STORAGE_KEY_DISCUSSIONS);
    let all: ProgramDiscussionPost[] = raw ? JSON.parse(raw) : INITIAL_PROGRAM_DISCUSSIONS;
    const scoped = all
      .filter(p => p.programId === programId)
      .map(p => ({ ...p, hasUpvoted: upvotedSet.has(`disc-${p.id}`) }));
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
    const upvotedSet = getProgramUpvotedSet(params.author.id);
    upvotedSet.add(`disc-${newPost.id}`);
    saveProgramUpvotedSet(upvotedSet, params.author.id);

    const raw = localStorage.getItem(STORAGE_KEY_DISCUSSIONS);
    const list: ProgramDiscussionPost[] = raw ? JSON.parse(raw) : [...INITIAL_PROGRAM_DISCUSSIONS];
    list.unshift(newPost);
    localStorage.setItem(STORAGE_KEY_DISCUSSIONS, JSON.stringify(list));
  } catch {}

  const sb = getSupabaseInstance();
  if (sb && isUuidString(params.author.id)) {
    (async () => {
      await ensureProgramExistsInSupabase(sb, newPost.programId, params.author.id);
      const tags = [
        newPost.semesterTag ? `sem:${newPost.semesterTag}` : '',
        newPost.courseTag ? `course:${newPost.courseTag}` : '',
        newPost.authorProgram ? `prog:${newPost.authorProgram}` : '',
        newPost.authorDegreeTier ? `tier:${newPost.authorDegreeTier}` : ''
      ].filter(Boolean);
      const { error } = await sb.from('program_discussions').insert([
        {
          id: newPost.id,
          program_id: newPost.programId,
          title: newPost.title,
          content: newPost.content,
          category: newPost.category,
          tags,
          author_id: params.author.id,
          author_name: newPost.authorName,
          author_avatar: newPost.authorAvatar || ''
        }
      ]);
      if (!error) {
        await sb.rpc('toggle_community_vote', {
          p_item_type: 'program_discussion',
          p_item_id: newPost.id,
          p_vote: 1
        });
      }
    })().catch(() => {});
  }

  return newPost;
}

export function toggleUpvoteProgramDiscussion(postId: string): { upvotesCount: number; hasUpvoted: boolean } {
  try {
    const upvotedSet = getProgramUpvotedSet();
    const key = `disc-${postId}`;
    const wasUpvoted = upvotedSet.has(key);

    const raw = localStorage.getItem(STORAGE_KEY_DISCUSSIONS);
    const list: ProgramDiscussionPost[] = raw ? JSON.parse(raw) : [...INITIAL_PROGRAM_DISCUSSIONS];
    const post = list.find(p => p.id === postId);
    if (!post) return { upvotesCount: 0, hasUpvoted: false };

    if (wasUpvoted) {
      upvotedSet.delete(key);
      post.hasUpvoted = false;
      post.upvotesCount = Math.max(0, post.upvotesCount - 1);
    } else {
      upvotedSet.add(key);
      post.hasUpvoted = true;
      post.upvotesCount = post.upvotesCount + 1;
    }

    saveProgramUpvotedSet(upvotedSet);
    localStorage.setItem(STORAGE_KEY_DISCUSSIONS, JSON.stringify(list));

    const sb = getSupabaseInstance();
    if (sb) {
      sb.rpc('toggle_community_vote', {
        p_item_type: 'program_discussion',
        p_item_id: postId,
        p_vote: 1
      }).then(() => {}, () => {});
    }

    return { upvotesCount: post.upvotesCount, hasUpvoted: !wasUpvoted };
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

    const sb = getSupabaseInstance();
    if (sb && isUuidString(params.author.id)) {
      sb.from('program_discussion_comments')
        .insert([
          {
            id: comment.id,
            discussion_id: comment.postId,
            author_id: params.author.id,
            author_name: comment.authorName,
            author_avatar: comment.authorAvatar || '',
            content: comment.content
          }
        ])
        .then(() => {}, () => {});
    }

    return comment;
  } catch {
    return null;
  }
}

// ----------------------------------------------------------------------------
// PROGRAM DOUBT CENTER (Q&A)
// ----------------------------------------------------------------------------

export function getProgramDoubts(programId: string): ProgramDoubtQuestion[] {
  const upvotedSet = getProgramUpvotedSet();
  try {
    const raw = localStorage.getItem(STORAGE_KEY_DOUBTS);
    let all: ProgramDoubtQuestion[] = raw ? JSON.parse(raw) : INITIAL_PROGRAM_DOUBTS;
    const scoped = all
      .filter(q => q.programId === programId)
      .map(q => ({ ...q, hasUpvoted: upvotedSet.has(`doubt-${q.id}`) }));
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
    const upvotedSet = getProgramUpvotedSet(params.author.id);
    upvotedSet.add(`doubt-${newQuestion.id}`);
    saveProgramUpvotedSet(upvotedSet, params.author.id);

    const raw = localStorage.getItem(STORAGE_KEY_DOUBTS);
    const list: ProgramDoubtQuestion[] = raw ? JSON.parse(raw) : [...INITIAL_PROGRAM_DOUBTS];
    list.unshift(newQuestion);
    localStorage.setItem(STORAGE_KEY_DOUBTS, JSON.stringify(list));
  } catch {}

  const sb = getSupabaseInstance();
  if (sb && isUuidString(params.author.id)) {
    (async () => {
      await ensureProgramExistsInSupabase(sb, newQuestion.programId, params.author.id);
      const { error } = await sb.from('program_doubts').insert([
        {
          id: newQuestion.id,
          program_id: newQuestion.programId,
          title: newQuestion.title,
          question: newQuestion.content,
          content: newQuestion.content,
          subject: newQuestion.courseCode || 'GEN',
          tags: newQuestion.tags,
          author_id: params.author.id,
          author_name: newQuestion.authorName,
          author_avatar: newQuestion.authorAvatar || '',
          is_resolved: false
        }
      ]);
      if (!error) {
        await sb.rpc('toggle_community_vote', {
          p_item_type: 'program_doubt',
          p_item_id: newQuestion.id,
          p_vote: 1
        });
      }
    })().catch(() => {});
  }

  return newQuestion;
}

export function toggleUpvoteProgramDoubt(doubtId: string): { upvotesCount: number; hasUpvoted: boolean } {
  try {
    const upvotedSet = getProgramUpvotedSet();
    const key = `doubt-${doubtId}`;
    const wasUpvoted = upvotedSet.has(key);

    const raw = localStorage.getItem(STORAGE_KEY_DOUBTS);
    const list: ProgramDoubtQuestion[] = raw ? JSON.parse(raw) : [...INITIAL_PROGRAM_DOUBTS];
    const q = list.find(item => item.id === doubtId);
    if (!q) return { upvotesCount: 0, hasUpvoted: false };

    if (wasUpvoted) {
      upvotedSet.delete(key);
      q.hasUpvoted = false;
      q.upvotesCount = Math.max(0, q.upvotesCount - 1);
    } else {
      upvotedSet.add(key);
      q.hasUpvoted = true;
      q.upvotesCount = q.upvotesCount + 1;
    }

    saveProgramUpvotedSet(upvotedSet);
    localStorage.setItem(STORAGE_KEY_DOUBTS, JSON.stringify(list));

    const sb = getSupabaseInstance();
    if (sb) {
      sb.rpc('toggle_community_vote', {
        p_item_type: 'program_doubt',
        p_item_id: doubtId,
        p_vote: 1
      }).then(() => {}, () => {});
    }

    return { upvotesCount: q.upvotesCount, hasUpvoted: !wasUpvoted };
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

    const sb = getSupabaseInstance();
    if (sb && isUuidString(params.author.id)) {
      sb.from('program_doubt_answers')
        .insert([
          {
            id: answer.id,
            doubt_id: answer.questionId,
            author_id: params.author.id,
            author_name: answer.authorName,
            author_avatar: answer.authorAvatar || '',
            content: answer.content
          }
        ])
        .then(() => {}, () => {});
    }

    return answer;
  } catch {
    return null;
  }
}

export function markAcceptedProgramAnswer(
  questionId: string,
  answerId: string,
  currentUserId?: string
): boolean {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_DOUBTS);
    const list: ProgramDoubtQuestion[] = raw ? JSON.parse(raw) : [...INITIAL_PROGRAM_DOUBTS];
    const q = list.find(item => item.id === questionId);
    if (!q) return false;

    const activeUserId = currentUserId || getActiveUserFromStorage()?.id;
    // Enforce that only the question author can mark an accepted answer
    if (q.authorId && activeUserId && q.authorId !== activeUserId) {
      return false;
    }

    q.acceptedAnswerId = answerId;
    q.status = 'answered';
    q.answers.forEach(a => {
      a.isAccepted = a.id === answerId;
    });

    localStorage.setItem(STORAGE_KEY_DOUBTS, JSON.stringify(list));

    const sb = getSupabaseInstance();
    if (sb && isUuidString(activeUserId)) {
      sb.rpc('accept_doubt_answer', {
        p_scope: 'program',
        p_doubt_id: questionId,
        p_answer_id: answerId
      }).then(() => {}, () => {});
    }

    return true;
  } catch {
    return false;
  }
}

// ----------------------------------------------------------------------------
// CROSS-USER SUPABASE SYNCHRONIZATION FOR PROGRAMS, ENROLLMENTS, DISCUSSIONS & DOUBTS
// ----------------------------------------------------------------------------

export async function syncProgramsFromSupabase(
  supabaseClient?: SupabaseClient | null,
  currentNotes?: StudyNote[]
): Promise<void> {
  const sb = supabaseClient ?? getSupabaseInstance();
  if (!sb) return;

  try {
    // 1. Authoritative custom programs from canonical academic_programs table
    const customById = new Map<string, AcademicProgram>();
    const dbProgCounts: Record<string, number> = {};

    try {
      const { data: dbProgs, error: progErr } = await sb.from('academic_programs').select('*').limit(300);
      if (!progErr && Array.isArray(dbProgs)) {
        for (const row of dbProgs) {
          if (!row?.id) continue;
          const enrolledCount = Number(row.enrolled_count ?? 0);
          if (enrolledCount > 0) {
            dbProgCounts[row.id] = enrolledCount;
          }
          const isMaster = MASTER_ACADEMIC_PROGRAMS.some(m => m.id === row.id);
          if (!isMaster) {
            const progName = row.name || row.title || 'Academic Program';
            const tier = ((row.level || row.degree_tier || 'Undergraduate') as DegreeTier);
            customById.set(row.id, {
              id: row.id,
              name: progName,
              shortCode: row.code || row.short_code || 'PROG',
              degreeTier: tier,
              discipline: row.category || row.discipline || 'Interdisciplinary Studies',
              description: row.description || '',
              badge: `${tier} Cohort`,
              durationYears: Number(row.duration_years) || 4,
              totalSemesters: Number(row.total_semesters) || 8,
              totalCredits: Number(row.total_credits) || 130,
              activeStudents: Math.max(1, enrolledCount || 1),
              resourceCount: 0,
              status: 'verified',
              bannerGradient: 'from-cyan-950/40 via-indigo-950/60 to-black',
              semesters: Array.isArray(row.subjects)
                ? row.subjects
                : Array.isArray(row.semesters)
                ? row.semesters
                : []
            });
          }
        }
        saveStoredSystemPrograms(Array.from(customById.values()));
      }
    } catch {}

    // 2. Compute authoritative cohort counts from live public_student_profiles + notes (replaces stale local counts)
    const freshStudentMap: Record<string, string> = {};
    const countsByProgram: Record<string, Set<string>> = {};

    try {
      const { data: pubProfiles } = await sb
        .from('public_student_profiles')
        .select('id, degree_program, program_id')
        .limit(1000);
      if (Array.isArray(pubProfiles)) {
        for (const prof of pubProfiles) {
          if (!prof?.id) continue;
          const matchedProg =
            (prof.program_id ? getProgramById(prof.program_id) : undefined) ||
            (prof.degree_program ? findProgramByNameOrFuzzy(prof.degree_program) : undefined);
          if (matchedProg) {
            const uid = String(prof.id);
            freshStudentMap[uid] = matchedProg.id;
            if (!countsByProgram[matchedProg.id]) countsByProgram[matchedProg.id] = new Set();
            countsByProgram[matchedProg.id].add(uid);
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
      const pids = new Set<string>();
      if (note.programId) pids.add(note.programId);
      if (Array.isArray(note.programIds)) note.programIds.forEach(p => p && pids.add(p));
      for (const pid of pids) {
        if (!countsByProgram[pid]) countsByProgram[pid] = new Set();
        countsByProgram[pid].add(note.uploaderId || note.uploaderName || note.id);
      }
    }

    const freshEnrollmentCounts: Record<string, number> = {};
    for (const [pid, set] of Object.entries(countsByProgram)) {
      if (set.size > 0) {
        freshEnrollmentCounts[pid] = set.size;
      }
    }
    for (const [pid, count] of Object.entries(dbProgCounts)) {
      if (count > 0) {
        freshEnrollmentCounts[pid] = Math.max(freshEnrollmentCounts[pid] || 0, count);
      }
    }
    saveStudentProgramMap(freshStudentMap);
    saveProgramEnrollmentMap(freshEnrollmentCounts);

    // Hydrate user's persisted community votes if signed in
    const activeUserId = getActiveUserFromStorage()?.id;
    const upvotedSet = new Set<string>();
    if (isUuidString(activeUserId)) {
      try {
        const { data: voteRows } = await sb
          .from('community_item_votes')
          .select('item_type, item_id, vote_type')
          .eq('user_id', activeUserId!)
          .in('item_type', ['program_discussion', 'program_doubt']);
        if (Array.isArray(voteRows)) {
          for (const vr of voteRows) {
            if ((vr.vote_type ?? 1) > 0) {
              if (vr.item_type === 'program_discussion') {
                upvotedSet.add(`disc-${vr.item_id}`);
              } else if (vr.item_type === 'program_doubt') {
                upvotedSet.add(`doubt-${vr.item_id}`);
              }
            }
          }
          saveProgramUpvotedSet(upvotedSet, activeUserId);
        }
      } catch {}
    }

    // 3. Authoritative Program Discussions & Comments from canonical tables
    const discById = new Map<string, ProgramDiscussionPost>();
    INITIAL_PROGRAM_DISCUSSIONS.forEach(d =>
      discById.set(d.id, { ...d, comments: [...(d.comments || [])] })
    );

    try {
      const { data: dbDiscs, error: discErr } = await sb
        .from('program_discussions')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(200);
      if (!discErr && Array.isArray(dbDiscs)) {
        for (const row of dbDiscs) {
          if (row?.id && row.moderation_status !== 'rejected' && row.moderation_status !== 'archived') {
            const existing = discById.get(row.id);
            const rowTags: string[] = Array.isArray(row.tags) ? row.tags : [];
            const semTagFromTags = rowTags.find(t => t.startsWith('sem:'))?.slice(4);
            const courseTagFromTags = rowTags.find(t => t.startsWith('course:'))?.slice(7);
            const progFromTags = rowTags.find(t => t.startsWith('prog:'))?.slice(5);
            const tierFromTags = rowTags.find(t => t.startsWith('tier:'))?.slice(5);
            discById.set(row.id, {
              id: row.id,
              programId: row.program_id,
              title: row.title,
              content: row.content,
              category: row.category || 'Course Advice',
              semesterTag: row.semester_tag || semTagFromTags || undefined,
              courseTag: row.course_tag || courseTagFromTags || undefined,
              authorId: row.author_id,
              authorName: row.author_name || 'Student Peer',
              authorAvatar: row.author_avatar || undefined,
              authorProgram: row.author_program || progFromTags || 'Student Peer',
              authorDegreeTier: (row.author_degree_tier || tierFromTags || undefined) as DegreeTier | undefined,
              createdAt: row.created_at || new Date().toISOString(),
              upvotesCount: Number(row.upvotes ?? row.upvotes_count ?? 1),
              hasUpvoted: upvotedSet.has(`disc-${row.id}`),
              commentsCount: Number(row.comments_count ?? 0),
              isPinned: Boolean(row.is_pinned ?? existing?.isPinned),
              comments: existing?.comments ? [...existing.comments] : []
            });
          }
        }
      }
    } catch {}

    const allComments: ProgramDiscussionComment[] = [];
    try {
      const { data: dbComments } = await sb
        .from('program_discussion_comments')
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
              authorId: row.author_id,
              authorName: row.author_name || 'Student Peer',
              authorAvatar: row.author_avatar || undefined,
              authorProgram: row.author_program || 'Student Peer',
              authorDegreeTier: row.author_degree_tier || undefined,
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

    const mergedDiscs = Array.from(discById.values()).sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
    localStorage.setItem(STORAGE_KEY_DISCUSSIONS, JSON.stringify(mergedDiscs));

    // 4. Authoritative Program Doubts & Answers from canonical tables
    const doubtById = new Map<string, ProgramDoubtQuestion>();
    INITIAL_PROGRAM_DOUBTS.forEach(q =>
      doubtById.set(q.id, { ...q, answers: [...(q.answers || [])] })
    );

    try {
      const { data: dbDoubts, error: doubtErr } = await sb
        .from('program_doubts')
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
              programId: row.program_id,
              title: row.title,
              content: row.content || row.question || '',
              courseCode: row.course_code || row.subject || 'GEN',
              semesterTag: row.semester_tag || undefined,
              tags: Array.isArray(row.tags) ? row.tags : [],
              authorId: row.author_id,
              authorName: row.author_name || 'Student Peer',
              authorAvatar: row.author_avatar || undefined,
              authorProgram: row.author_program || 'Student Peer',
              createdAt: row.created_at || new Date().toISOString(),
              upvotesCount: Number(row.upvotes ?? row.upvotes_count ?? 1),
              hasUpvoted: upvotedSet.has(`doubt-${row.id}`),
              status: isResolved ? 'answered' : 'unanswered',
              acceptedAnswerId: row.accepted_answer_id || existing?.acceptedAnswerId || undefined,
              answers: existing?.answers ? [...existing.answers] : []
            });
          }
        }
      }
    } catch {}

    const allAnswers: ProgramDoubtAnswer[] = [];
    try {
      const { data: dbAnswers } = await sb
        .from('program_doubt_answers')
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
              authorId: row.author_id,
              authorName: row.author_name || 'Student Peer',
              authorAvatar: row.author_avatar || undefined,
              authorRole: row.author_role || 'Peer',
              authorProgram: row.author_program || 'Student Peer',
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

    const mergedDoubts = Array.from(doubtById.values()).sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
    localStorage.setItem(STORAGE_KEY_DOUBTS, JSON.stringify(mergedDoubts));

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('xeusar-program-data-synced'));
    }
  } catch {}
}

