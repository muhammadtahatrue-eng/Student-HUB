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
  isRestricted?: boolean; // If true, only students of the same university have full download access
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

export interface StudentUser {
  id: string;
  email: string;
  name: string;
  username?: string;
  university: string;
  universityId?: string;
  isCustomUniversity?: boolean;
  customUniversityDetails?: {
    name: string;
    city?: string;
    province?: string;
    sector?: 'Public' | 'Private';
  };
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
// UNIVERSITY DIRECTORY & COMMUNITY DATA MODELS
// ============================================================================

export interface University {
  id: string; // e.g. 'nust', 'fast-nuces', 'lums'
  name: string;
  shortName: string;
  sector?: 'Public' | 'Private';
  province?: string; // 'Islamabad', 'Punjab', 'Sindh', 'Khyber Pakhtunkhwa', 'Balochistan', 'AJK / GB'
  city?: string;
  badge?: string; // e.g. 'HEC Ranked #1 Engineering & Tech', 'Premier Tech & Computing Flagship'
  logoUrl: string;
  bannerUrl: string;
  location: string; // e.g. 'Sector H-12, Islamabad, ICT, Pakistan'
  country: string;
  disciplines: string[]; // e.g. ['Computer Science', 'Software Engineering', 'Electrical Engineering']
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
