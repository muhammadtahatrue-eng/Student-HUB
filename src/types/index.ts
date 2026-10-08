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
