import {
  AcademicProgram,
  ProgramDiscussionPost,
  ProgramDoubtQuestion
} from '../types/index.ts';

// ============================================================================
// MASTER CATALOG OF STANDARDIZED ACADEMIC PROGRAMS ACROSS DEGREE TIERS
// Zero hardcoded student counts or resource counts — all counts are computed
// dynamically from real user enrollments and uploaded study notes.
// ============================================================================

export const MASTER_ACADEMIC_PROGRAMS: AcademicProgram[] = [
  // --------------------------------------------------------------------------
  // UNDERGRADUATE / BACHELOR'S
  // --------------------------------------------------------------------------
  {
    id: 'bs-cs',
    name: 'BS Computer Science',
    shortCode: 'BSCS',
    degreeTier: 'Undergraduate',
    discipline: 'Computing & Software',
    description: 'Undergraduate program focusing on algorithms, system architecture, computational theory, artificial intelligence, and scalable software systems.',
    badge: 'ACM/IEEE Curriculum Aligned',
    durationYears: 4,
    totalSemesters: 8,
    totalCredits: 134,
    activeStudents: 0,
    resourceCount: 0,
    iconName: 'Code2',
    bannerGradient: 'from-cyan-900/40 via-blue-950/60 to-black',
    semesters: []
  },
  {
    id: 'bs-se',
    name: 'BS Software Engineering',
    shortCode: 'BSSE',
    degreeTier: 'Undergraduate',
    discipline: 'Computing & Software',
    description: 'Engineering-focused degree emphasizing industrial software quality, full-stack architectures, automated testing, DevOps, and project life-cycle reliability.',
    badge: 'Industry Partnership Track',
    durationYears: 4,
    totalSemesters: 8,
    totalCredits: 136,
    activeStudents: 0,
    resourceCount: 0,
    iconName: 'Layers',
    bannerGradient: 'from-emerald-950/40 via-teal-950/60 to-black',
    semesters: []
  },
  {
    id: 'bba',
    name: 'Bachelor of Business Administration (BBA)',
    shortCode: 'BBA',
    degreeTier: 'Undergraduate',
    discipline: 'Business & Management',
    description: 'Comprehensive business degree preparing future founders and executives in corporate finance, strategic marketing, organizational behavior, and supply chain management.',
    badge: 'AACSB Standard Focus',
    durationYears: 4,
    totalSemesters: 8,
    totalCredits: 132,
    activeStudents: 0,
    resourceCount: 0,
    iconName: 'Briefcase',
    bannerGradient: 'from-amber-950/40 via-yellow-950/60 to-black',
    semesters: []
  },
  {
    id: 'bs-ds-ai',
    name: 'BS Data Science & Artificial Intelligence',
    shortCode: 'BSDS',
    degreeTier: 'Undergraduate',
    discipline: 'Data Science & AI',
    description: 'Quantitative degree combining mathematical statistics, big data engineering, deep neural networks, and computer vision.',
    badge: 'High Impact Specialization',
    durationYears: 4,
    totalSemesters: 8,
    totalCredits: 130,
    activeStudents: 0,
    resourceCount: 0,
    iconName: 'Sparkles',
    bannerGradient: 'from-purple-950/40 via-violet-950/60 to-black',
    semesters: []
  },
  {
    id: 'bs-ee',
    name: 'BS Electrical Engineering',
    shortCode: 'BSEE',
    degreeTier: 'Undergraduate',
    discipline: 'Engineering & Hardware',
    description: 'Rigorous engineering program covering signals, microcontrollers, VLSI circuits, electromagnetic fields, and power electronics.',
    badge: 'PEC / Washington Accord',
    durationYears: 4,
    totalSemesters: 8,
    totalCredits: 136,
    activeStudents: 0,
    resourceCount: 0,
    iconName: 'Cpu',
    bannerGradient: 'from-orange-950/40 via-red-950/60 to-black',
    semesters: []
  },
  {
    id: 'bs-cys',
    name: 'BS Cyber Security',
    shortCode: 'BSCYS',
    degreeTier: 'Undergraduate',
    discipline: 'Computing & Security',
    description: 'Specialized defensive and offensive security degree spanning reverse engineering, threat hunting, secure software architecture, and cryptography.',
    badge: 'Cyber Defense Certified',
    durationYears: 4,
    totalSemesters: 8,
    totalCredits: 130,
    activeStudents: 0,
    resourceCount: 0,
    iconName: 'Shield',
    bannerGradient: 'from-rose-950/40 via-red-950/60 to-black',
    semesters: []
  },
  {
    id: 'bs-af',
    name: 'BS Accounting & Finance',
    shortCode: 'BSAF',
    degreeTier: 'Undergraduate',
    discipline: 'Business & Finance',
    description: 'Professional finance track recognized for ACCA/CFA exemptions, corporate tax laws, internal auditing, and investment banking.',
    badge: 'ACCA Accredited Track',
    durationYears: 4,
    totalSemesters: 8,
    totalCredits: 130,
    activeStudents: 0,
    resourceCount: 0,
    iconName: 'Calculator',
    bannerGradient: 'from-emerald-950/40 via-green-950/60 to-black',
    semesters: []
  },

  // --------------------------------------------------------------------------
  // MASTER'S / POSTGRADUATE
  // --------------------------------------------------------------------------
  {
    id: 'ms-ds',
    name: 'MS Data Science',
    shortCode: 'MSDS',
    degreeTier: "Master's",
    discipline: 'Data Science & AI',
    description: 'Graduate program covering deep neural architectures, distributed map-reduce computation, causal inference, and probabilistic graphical models.',
    badge: 'Graduate Research Track',
    durationYears: 2,
    totalSemesters: 4,
    totalCredits: 33,
    activeStudents: 0,
    resourceCount: 0,
    iconName: 'Network',
    bannerGradient: 'from-blue-950/40 via-indigo-950/60 to-black',
    semesters: []
  },
  {
    id: 'ms-cs',
    name: 'MS Computer Science',
    shortCode: 'MSCS',
    degreeTier: "Master's",
    discipline: 'Computing & Software',
    description: 'Advanced theoretical and applied computing curriculum designed for software architects, researchers, and technical leadership.',
    badge: 'Thesis & Project Options',
    durationYears: 2,
    totalSemesters: 4,
    totalCredits: 33,
    activeStudents: 0,
    resourceCount: 0,
    iconName: 'Terminal',
    bannerGradient: 'from-cyan-950/40 via-sky-950/60 to-black',
    semesters: []
  },
  {
    id: 'mba',
    name: 'Master of Business Administration (MBA)',
    shortCode: 'MBA',
    degreeTier: "Master's",
    discipline: 'Business & Management',
    description: 'Postgraduate management program prioritizing case-study analysis, venture capital fundraising, cross-border negotiation, and organizational change.',
    badge: 'Executive Case Pedagogy',
    durationYears: 2,
    totalSemesters: 4,
    totalCredits: 60,
    activeStudents: 0,
    resourceCount: 0,
    iconName: 'TrendingUp',
    bannerGradient: 'from-yellow-950/40 via-amber-950/60 to-black',
    semesters: []
  },

  // --------------------------------------------------------------------------
  // PHD / DOCTORATE
  // --------------------------------------------------------------------------
  {
    id: 'phd-cs',
    name: 'PhD Computer Science & AI',
    shortCode: 'PhD-CS',
    degreeTier: 'PhD',
    discipline: 'Computing & Software',
    description: 'Terminal doctoral research program producing novel contributions to computer science, verified theoretical bounds, and patented algorithms.',
    badge: 'Top Tier Publications Track',
    durationYears: 3,
    totalSemesters: 6,
    totalCredits: 48,
    activeStudents: 0,
    resourceCount: 0,
    iconName: 'GraduationCap',
    bannerGradient: 'from-fuchsia-950/40 via-purple-950/60 to-black',
    semesters: []
  },
  {
    id: 'phd-mgmt',
    name: 'PhD Management Sciences',
    shortCode: 'PhD-MS',
    degreeTier: 'PhD',
    discipline: 'Business & Management',
    description: 'Rigorous empirical doctoral study exploring organizational behaviors, behavioral finance, macro-governance, and econometrics.',
    badge: 'Doctoral Dissertation Program',
    durationYears: 3,
    totalSemesters: 6,
    totalCredits: 48,
    activeStudents: 0,
    resourceCount: 0,
    iconName: 'Award',
    bannerGradient: 'from-amber-950/40 via-stone-950/60 to-black',
    semesters: []
  },

  // --------------------------------------------------------------------------
  // ASSOCIATE / DIPLOMA
  // --------------------------------------------------------------------------
  {
    id: 'ad-cs',
    name: 'Associate Degree in Computer Science (ADCS)',
    shortCode: 'ADCS',
    degreeTier: 'Associate',
    discipline: 'Computing & Software',
    description: 'High-intensity 2-year practical degree providing foundational software programming, web development, and database administration.',
    badge: 'Fast-Track Technical Career',
    durationYears: 2,
    totalSemesters: 4,
    totalCredits: 66,
    activeStudents: 0,
    resourceCount: 0,
    iconName: 'Binary',
    bannerGradient: 'from-teal-950/40 via-cyan-950/60 to-black',
    semesters: []
  },
  {
    id: 'ad-ba',
    name: 'Associate Degree in Business Administration (ADBA)',
    shortCode: 'ADBA',
    degreeTier: 'Associate',
    discipline: 'Business & Management',
    description: 'Two-year vocational foundation in commercial operations, retail management, sales communication, and computerized bookkeeping.',
    badge: 'Vocational Business Credentials',
    durationYears: 2,
    totalSemesters: 4,
    totalCredits: 64,
    activeStudents: 0,
    resourceCount: 0,
    iconName: 'Building',
    bannerGradient: 'from-lime-950/40 via-neutral-950/60 to-black',
    semesters: []
  }
];

export const INITIAL_PROGRAM_DISCUSSIONS: ProgramDiscussionPost[] = [];

export const INITIAL_PROGRAM_DOUBTS: ProgramDoubtQuestion[] = [];
