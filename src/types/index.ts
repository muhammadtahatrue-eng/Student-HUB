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
  // Core Program Hierarchy Mapping (Shared between My Program & Study Library)
  programId?: string; // Primary program ID e.g. 'bs-cs', 'bba', 'ms-ds'
  programIds?: string[]; // Multi-program associations without duplicating the resource
  programName?: string; // e.g. 'BS Computer Science'
  degreeTier?: DegreeTier; // 'Undergraduate' | 'Master\'s' | 'PhD' | 'Associate'
  semesterNumber?: number; // e.g. 1, 2, 3, 4
  semesterId?: string; // e.g. 'sem-3'
  courseId?: string; // Associated ProgramCourse ID e.g. 'cs-201'
  isRestricted?: boolean; // If true, only students of the same program/cohort have full download access
  // Storage, Deduplication & Integrity Metadata
  contentHash?: string; // SHA-256 hex digest of stored file
  storagePath?: string; // Physical storage key in bucket
  originalSizeBytes?: number; // Original file size before safe compression
  wasCompressed?: boolean; // True if file was safely compressed prior to storage
  deduplicated?: boolean; // True if physical file was reused via SHA-256 match
  idempotencyKey?: string; // Prevents duplicate records on retry/double-submit
  updatedAt?: string;
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
  programId?: string; // 'all' or specific degree program ID
  semesterNumber?: string; // 'all' or semester number ('1'..'8')
  sortBy: 'latest' | 'popular' | 'pages';
}

export type EducationLevel = 'undergraduate' | 'bachelors' | 'masters' | 'phd';
export type UndergraduateStage = 'high_school' | 'college';
export type AcademicSemester = 'semester_1' | 'semester_2';

export interface AcademicProfileInfo {
  educationLevel?: EducationLevel;
  undergraduateStage?: UndergraduateStage; // 'high_school' | 'college' (Undergraduate only)
  majorOrField?: string; // Major / Field of Study or Research Field
  institution?: string; // Major University / Institution Name
  academicYear?: string; // e.g. "Freshman (1st Year)", "Year 1", etc.
  semester?: AcademicSemester; // 'semester_1' | 'semester_2'
}

export interface UserSettingsData {
  publicBadgeEnabled: boolean;
  showUniOnNotes: boolean;
  flareLocked?: boolean;
  rayColor?: string;
  rayOrigin?: string;
  rayBrightness?: number;
}

export interface UserPreferencesData {
  preferredSubjects: string[];
  studyStyle?: string;
  sessionLength?: string;
  collaborationMode?: string;
  preferredLanguage: string;
  themePreference: 'dark' | 'light' | 'system';
  prioritizeVerifiedNotes: boolean;
  prioritizeMyInstitution: boolean;
  includePastExams: boolean;
}

export type AcademicLevel = 'undergraduate' | 'graduate' | 'college' | 'high_school';

export type DegreeTier = "Undergraduate" | "Master's" | "PhD" | "Associate";

export interface StudentUser {
  id: string;
  email: string;
  name: string;
  username?: string;
  setupCompleted?: boolean;
  createdAt?: string;
  updatedAt?: string;
  // Core Academic Program & Degree-Level System
  degreeTier?: DegreeTier;
  program?: string; // e.g. "BS Computer Science"
  programId?: string; // e.g. "bs-cs"
  currentSemester?: string | number; // e.g. "Semester 3" or 3
  isCustomProgram?: boolean;
  customProgramDetails?: {
    name: string;
    degreeTier: DegreeTier;
    discipline?: string;
  };
  // University / Institution (optional or complementary)
  university?: string;
  universityId?: string;
  isCustomUniversity?: boolean;
  customUniversityDetails?: {
    name: string;
    city?: string;
    website?: string;
    country?: string;
  };
  // Structured Education Hierarchy
  academicProfile?: AcademicProfileInfo;
  educationLevel?: EducationLevel;
  undergraduateStage?: UndergraduateStage;
  academicYear?: string;
  semester?: AcademicSemester;
  majorOrField?: string;
  // Settings & Personalization Preferences
  settings?: UserSettingsData;
  preferences?: UserPreferencesData;
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

// ============================================================================
// TEXT-FIRST PUBLIC FORUM DATA MODELS
// ============================================================================

export type ForumPostType =
  | 'Discussion'
  | 'Question'
  | 'Study Tip'
  | 'Resource Link'
  | 'Announcement';

export type ForumTopicId =
  | 'mathematics'
  | 'physics'
  | 'computer-science'
  | 'engineering'
  | 'business'
  | 'english-languages'
  | 'study-tips'
  | 'university-life'
  | 'exam-preparation'
  | 'general-discussion';

export interface ForumTopic {
  id: ForumTopicId;
  name: string;
  slug: string;
  description: string;
  postCount?: number;
}

export type ForumContentStatus = 'published' | 'flagged' | 'removed';

export interface ForumProgramCourseRef {
  programId: string;
  programName: string;
  courseName?: string;
  semesterNumber?: number;
}

export interface ForumPost {
  id: string;
  title: string;
  body: string;
  postType: ForumPostType;
  topicId: ForumTopicId;
  topicName: string;
  authorId: string;
  authorName: string;
  authorUsername: string;
  authorAvatar?: string;
  authorProgram?: string;
  authorDegreeTier?: DegreeTier;
  authorUniversity?: string;
  authorBio?: string;
  // Optional Study Library or My Program reference (NO file upload)
  resourceId?: string | null;
  programCourseRef?: ForumProgramCourseRef | null;
  externalLink?: string | null;
  upvotesCount: number;
  downvotesCount: number;
  score: number;
  userVote?: 1 | -1 | 0;
  commentsCount: number;
  isBookmarked?: boolean;
  acceptedCommentId?: string | null;
  status: ForumContentStatus;
  idempotencyKey?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface ForumComment {
  id: string;
  postId: string;
  parentCommentId: string | null;
  body: string;
  authorId: string;
  authorName: string;
  authorUsername: string;
  authorAvatar?: string;
  authorProgram?: string;
  authorDegreeTier?: DegreeTier;
  upvotesCount: number;
  downvotesCount: number;
  score: number;
  userVote?: 1 | -1 | 0;
  isAccepted?: boolean;
  status: ForumContentStatus;
  createdAt: string;
  updatedAt?: string;
}

export type ForumReportReason =
  | 'Spam or self-promotion'
  | 'Harassment or disrespect'
  | 'Academic dishonesty / active exam leak'
  | 'Off-topic or low-effort'
  | 'Unsafe or misleading link'
  | 'Other';

export interface ForumReport {
  id: string;
  targetType: 'post' | 'comment';
  targetId: string;
  postId: string;
  targetTitleOrSnippet: string;
  reporterId: string;
  reporterUsername: string;
  reason: ForumReportReason;
  details?: string;
  status: 'pending' | 'reviewed_kept' | 'reviewed_removed';
  createdAt: string;
  reviewedBy?: string;
  reviewedAt?: string;
}

