export type MaterialType =
  | 'lecture_notes'
  | 'past_exam'
  | 'cheat_sheet'
  | 'lab_manual'
  | 'summary';

export interface NotePage {
  pageNumber: number;
  sectionTitle: string;
  content: string;
  keyFormulasOrPoints: string[];
}

export interface StudyNote {
  id: string;
  title: string;
  description: string;
  courseCode: string;
  courseName: string;
  subject: string;
  materialType: MaterialType;
  academicYear: number;
  semester: string;
  professor: string;
  fileUrl: string;
  fileName: string;
  fileSizeBytes: number;
  pageCount: number;
  uploaderName: string;
  uploaderUniversity: string;
  uploaderId?: string;
  universityId?: string;
  departmentId?: string;
  // Core Program Hierarchy Mapping
  programId?: string; // e.g. 'bs-cs', 'bba', 'ms-ds'
  programName?: string; // e.g. 'BS Computer Science'
  degreeTier?: DegreeTier; // 'Undergraduate' | 'Master\'s' | 'PhD' | 'Associate'
  semesterNumber?: number; // e.g. 1, 2, 3, 4
  isRestricted?: boolean; // If true, only students of the same program/cohort have full download access
  downloadsCount: number;
  upvotesCount: number;
  hasUpvoted?: boolean;
  createdAt: string;
  tags: string[];
  pages: NotePage[];
}

export interface SupabaseConfig {
  url: string;
  anonKey: string;
  storageBucket: string;
  isConnected: boolean;
  lastTestedAt: string | null;
}

export interface FilterState {
  searchQuery: string;
  materialType: string; // 'all' or MaterialType
  subject: string; // 'all' or specific subject
  courseCode: string; // 'all' or specific course
  academicYear: string; // 'all' or year
  sortBy: 'latest' | 'popular' | 'pages';
}

export type EducationLevel = 'undergraduate' | 'bachelors' | 'masters' | 'phd';
export type UndergraduateStage = 'high_school' | 'college';
export type AcademicSemester = 'semester_1' | 'semester_2';

export interface AcademicProfileInfo {
  educationLevel: EducationLevel;
  undergraduateStage?: UndergraduateStage; // 'high_school' | 'college' (Undergraduate only)
  majorOrField?: string; // Major / Field of Study or Research Field
  institution: string; // Major University / Institution Name
  academicYear: string; // e.g. "Freshman (1st Year)", "Year 1", etc.
  semester: AcademicSemester; // 'semester_1' | 'semester_2'
}

export type AcademicLevel = 'undergraduate' | 'graduate' | 'college' | 'high_school';

export type DegreeTier = "Undergraduate" | "Master's" | "PhD" | "Associate";

export interface StudentUser {
  id: string;
  email: string;
  name: string;
  username?: string;
  // Core Academic Program & Degree-Level System
  degreeTier?: DegreeTier;
  program?: string; // e.g. "BS Computer Science"
  programId?: string; // e.g. "bs-cs"
  currentSemester?: string; // e.g. "Semester 3"
  isCustomProgram?: boolean;
  customProgramDetails?: {
    name: string;
    degreeTier: DegreeTier;
    discipline?: string;
  };
  // University / Institution (optional or complementary)
  university?: string;
  universityId?: string;
  // Structured Education Hierarchy
  academicProfile?: AcademicProfileInfo;
  educationLevel?: EducationLevel;
  undergraduateStage?: UndergraduateStage;
  academicYear?: string;
  semester?: AcademicSemester;
  majorOrField?: string;
  // Backwards-compatible legacy fields
  academicLevel?: AcademicLevel;
  undergraduateCollege?: string;
  undergraduateYear?: string;
  fieldOfStudy?: string;
  bio?: string;
  avatarUrl?: string;
  isGuest?: boolean;
}

// ============================================================================
// ACADEMIC PROGRAM & DEGREE-LEVEL DATA MODELS (Core StudyVault Hierarchy)
// ============================================================================

export interface ProgramCourse {
  id: string;
  programId: string;
  semesterNumber: number;
  code: string; // e.g. 'CS-201'
  name: string; // e.g. 'Data Structures & Algorithms'
  credits: number;
  description: string;
  instructor?: string;
  resourceCount?: number;
}

export interface ProgramSemester {
  semesterNumber: number;
  name: string; // e.g. 'Semester 1: Foundations'
  courses: ProgramCourse[];
}

export interface AcademicProgram {
  id: string; // e.g. 'bs-cs', 'bba', 'ms-ds', 'phd-ai'
  name: string; // e.g. 'BS Computer Science'
  shortCode: string; // e.g. 'BSCS'
  degreeTier: DegreeTier; // 'Undergraduate' | "Master's" | 'PhD' | 'Associate'
  discipline: string; // e.g. 'Computing & Software', 'Business & Management', etc.
  description: string;
  badge?: string; // e.g. 'ABET Accredited', 'High Demand', 'Research Track'
  durationYears: number;
  totalSemesters: number;
  totalCredits: number;
  activeStudents: number; // dynamic count of registered peers
  resourceCount: number; // dynamic count of accessible notes & exams
  iconName?: string;
  bannerGradient?: string;
  isCustom?: boolean;
  status?: 'verified' | 'pending';
  createdByStudentId?: string;
  isMemberRestricted?: boolean;
  semesters?: ProgramSemester[];
}

export type ProgramDiscussionCategory =
  | 'Academics'
  | 'Course Advice'
  | 'Study Groups'
  | 'Career & Internships'
  | 'General'
  | 'Announcements';

export interface ProgramDiscussionComment {
  id: string;
  postId: string;
  authorId: string;
  authorName: string;
  authorAvatar?: string;
  authorProgram: string;
  authorDegreeTier?: DegreeTier;
  content: string;
  createdAt: string;
  upvotesCount: number;
  hasUpvoted?: boolean;
}

export interface ProgramDiscussionPost {
  id: string;
  programId: string;
  title: string;
  content: string;
  category: ProgramDiscussionCategory;
  semesterTag?: string;
  courseTag?: string;
  authorId: string;
  authorName: string;
  authorAvatar?: string;
  authorProgram: string;
  authorDegreeTier?: DegreeTier;
  createdAt: string;
  upvotesCount: number;
  hasUpvoted?: boolean;
  commentsCount: number;
  comments: ProgramDiscussionComment[];
  isPinned?: boolean;
  isReported?: boolean;
}

export interface ProgramDoubtAttachment {
  name: string;
  url: string;
  size?: string;
}

export interface ProgramDoubtAnswer {
  id: string;
  questionId: string;
  authorId: string;
  authorName: string;
  authorAvatar?: string;
  authorRole?: string; // 'Peer', 'TA', 'Honor Student'
  authorProgram: string;
  content: string;
  createdAt: string;
  upvotesCount: number;
  hasUpvoted?: boolean;
  isAccepted: boolean;
}

export interface ProgramDoubtQuestion {
  id: string;
  programId: string;
  title: string;
  content: string;
  semesterTag?: string;
  courseCode: string;
  tags: string[];
  authorId: string;
  authorName: string;
  authorAvatar?: string;
  authorProgram: string;
  createdAt: string;
  upvotesCount: number;
  hasUpvoted?: boolean;
  status: 'answered' | 'unanswered';
  acceptedAnswerId?: string;
  attachments?: ProgramDoubtAttachment[];
  answers: ProgramDoubtAnswer[];
}

// Backward-compatible University types
export interface University {
  id: string;
  name: string;
  shortName: string;
  sector?: 'Public' | 'Private';
  province?: string;
  city?: string;
  badge?: string;
  logoUrl: string;
  bannerUrl: string;
  location: string;
  country: string;
  disciplines: string[];
  website: string;
  establishedYear: number;
  verifiedStudents: number;
  totalCoursesCount: number;
  description: string;
  hecRecognized?: boolean;
  isCustom?: boolean;
  status?: 'verified' | 'pending';
  createdByStudentId?: string;
  isMemberRestricted?: boolean;
}

export interface Department {
  id: string;
  universityId: string;
  name: string;
  code: string; // e.g. 'CS', 'MATH', 'BIO'
  description: string;
  courseCount: number;
}

export interface Course {
  id: string;
  universityId: string;
  departmentId: string;
  departmentCode: string;
  code: string; // e.g. 'CS 106B'
  name: string;
  description: string;
  instructor: string;
  activeStudents: number;
}

export type DiscussionCategory =
  | 'Academics'
  | 'Course Advice'
  | 'Study Groups'
  | 'Campus Life'
  | 'General'
  | 'Announcements';

export interface DiscussionComment {
  id: string;
  postId: string;
  authorId: string;
  authorName: string;
  authorAvatar?: string;
  authorUniversity: string;
  content: string;
  createdAt: string;
  upvotesCount: number;
  hasUpvoted?: boolean;
}

export interface DiscussionPost {
  id: string;
  universityId: string;
  title: string;
  content: string;
  category: DiscussionCategory;
  courseTag?: string;
  authorId: string;
  authorName: string;
  authorAvatar?: string;
  authorMajor?: string;
  authorUniversity: string;
  createdAt: string;
  upvotesCount: number;
  hasUpvoted?: boolean;
  commentsCount: number;
  comments: DiscussionComment[];
  isPinned?: boolean;
  isReported?: boolean;
}

export interface DoubtAttachment {
  name: string;
  url: string;
  size?: string;
}

export interface DoubtAnswer {
  id: string;
  questionId: string;
  authorId: string;
  authorName: string;
  authorAvatar?: string;
  authorRole?: string; // 'Peer', 'Teaching Assistant', 'Honor Student'
  authorUniversity: string;
  content: string;
  createdAt: string;
  upvotesCount: number;
  hasUpvoted?: boolean;
  isAccepted: boolean;
}

export interface DoubtQuestion {
  id: string;
  universityId: string;
  title: string;
  content: string;
  department: string;
  courseCode: string;
  tags: string[];
  authorId: string;
  authorName: string;
  authorAvatar?: string;
  authorUniversity: string;
  createdAt: string;
  upvotesCount: number;
  hasUpvoted?: boolean;
  status: 'answered' | 'unanswered';
  acceptedAnswerId?: string;
  attachments?: DoubtAttachment[];
  answers: DoubtAnswer[];
}
