import {
  AcademicProgram,
  ProgramSemester,
  ProgramCourse,
  ProgramDiscussionPost,
  ProgramDoubtQuestion,
  DegreeTier
} from '../types/index.ts';

// ============================================================================
// MASTER CATALOG OF STANDARDIZED ACADEMIC PROGRAMS ACROSS DEGREE TIERS
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
    description: 'Premier undergraduate program focusing on algorithms, system architecture, computational theory, artificial intelligence, and scalable software systems.',
    badge: 'ACM/IEEE Curriculum Aligned',
    durationYears: 4,
    totalSemesters: 8,
    totalCredits: 134,
    activeStudents: 1420, // Initially unlocked (>0 students)
    resourceCount: 88,
    iconName: 'Code2',
    bannerGradient: 'from-cyan-900/40 via-blue-950/60 to-black',
    semesters: [
      {
        semesterNumber: 1,
        name: 'Semester 1: Foundations',
        courses: [
          { id: 'cs-101', programId: 'bs-cs', semesterNumber: 1, code: 'CS-101', name: 'Programming Fundamentals (C++)', credits: 4, description: 'Core procedural programming, control structures, pointers, memory allocation, and debugging.', instructor: 'Dr. Arshad Malik', resourceCount: 12 },
          { id: 'math-101', programId: 'bs-cs', semesterNumber: 1, code: 'MATH-101', name: 'Calculus & Analytical Geometry', credits: 3, description: 'Limits, derivatives, definite integrals, and series expansions with analytical applications.', instructor: 'Dr. Saima Naz', resourceCount: 8 },
          { id: 'phy-101', programId: 'bs-cs', semesterNumber: 1, code: 'PHY-101', name: 'Applied Physics for Computing', credits: 3, description: 'Electromagnetism, semiconductor physics, and circuit principles.', instructor: 'Prof. Tariq Mahmood', resourceCount: 6 },
          { id: 'eng-101', programId: 'bs-cs', semesterNumber: 1, code: 'ENG-101', name: 'Functional English & Academic Writing', credits: 3, description: 'Technical reading, argumentative writing, and rhetorical analysis.', instructor: 'Dr. Faiza Munir', resourceCount: 4 }
        ]
      },
      {
        semesterNumber: 2,
        name: 'Semester 2: Object Paradigm & Discrete Structures',
        courses: [
          { id: 'cs-102', programId: 'bs-cs', semesterNumber: 2, code: 'CS-102', name: 'Object Oriented Programming', credits: 4, description: 'Encapsulation, inheritance, polymorphism, design patterns, RAII, and templates.', instructor: 'Dr. Bilal Tahir', resourceCount: 14 },
          { id: 'cs-104', programId: 'bs-cs', semesterNumber: 2, code: 'CS-104', name: 'Discrete Mathematical Structures', credits: 3, description: 'Propositional logic, set theory, induction, combinatorics, and graph proofs.', instructor: 'Dr. Asim Karim', resourceCount: 9 },
          { id: 'ee-102', programId: 'bs-cs', semesterNumber: 2, code: 'EE-102', name: 'Digital Logic & Computer Design', credits: 4, description: 'Boolean algebra, Karnaugh maps, combinational logic, and sequential circuits.', instructor: 'Engr. Noman Ali', resourceCount: 7 }
        ]
      },
      {
        semesterNumber: 3,
        name: 'Semester 3: Core Data Structures & Systems',
        courses: [
          { id: 'cs-201', programId: 'bs-cs', semesterNumber: 3, code: 'CS-201', name: 'Data Structures & Algorithms', credits: 4, description: 'Trees, heaps, hashing, balanced binary search trees, graph algorithms, asymptotic analysis.', instructor: 'Dr. Farooq Ahmad', resourceCount: 18 },
          { id: 'cs-203', programId: 'bs-cs', semesterNumber: 3, code: 'CS-203', name: 'Computer Architecture & Assembly', credits: 4, description: 'x86/ARM assembly, pipelining, caching hierarchies, and CPU datapath execution.', instructor: 'Dr. Usman Ghani', resourceCount: 11 },
          { id: 'math-202', programId: 'bs-cs', semesterNumber: 3, code: 'MATH-202', name: 'Linear Algebra & Differential Equations', credits: 3, description: 'Vector spaces, matrix decompositions, eigenvalues, and first/second order ODEs.', instructor: 'Dr. Maryam Jamil', resourceCount: 8 }
        ]
      },
      {
        semesterNumber: 4,
        name: 'Semester 4: Operating Systems & Algorithms',
        courses: [
          { id: 'cs-204', programId: 'bs-cs', semesterNumber: 4, code: 'CS-204', name: 'Operating Systems & Kernel Design', credits: 4, description: 'Virtual memory paging, process scheduling, synchronization primitives, deadlocks, file systems.', instructor: 'Dr. Zulfiqar Memon', resourceCount: 15 },
          { id: 'cs-206', programId: 'bs-cs', semesterNumber: 4, code: 'CS-206', name: 'Design & Analysis of Algorithms', credits: 3, description: 'Divide-and-conquer, dynamic programming, greedy algorithms, network flow, NP-completeness.', instructor: 'Dr. Kashif Zafar', resourceCount: 13 },
          { id: 'math-205', programId: 'bs-cs', semesterNumber: 4, code: 'MATH-205', name: 'Probability & Statistics for Computing', credits: 3, description: 'Random variables, Bayes rule, joint distributions, hypothesis testing, Markov chains.', instructor: 'Dr. Hassan Jamil', resourceCount: 7 }
        ]
      },
      {
        semesterNumber: 5,
        name: 'Semester 5: Databases & Software Engineering',
        courses: [
          { id: 'cs-301', programId: 'bs-cs', semesterNumber: 5, code: 'CS-301', name: 'Database Management Systems', credits: 4, description: 'Relational algebra, SQL, B+ trees indexing, ACID transactions, normalization 3NF/BCNF.', instructor: 'Dr. Faisal Iradat', resourceCount: 12 },
          { id: 'cs-303', programId: 'bs-cs', semesterNumber: 5, code: 'CS-303', name: 'Theory of Automata & Formal Languages', credits: 3, description: 'DFA, NFA, context-free grammars, pushdown automata, Turing machines, decidability.', instructor: 'Dr. Hammad Naveed', resourceCount: 9 },
          { id: 'se-301', programId: 'bs-cs', semesterNumber: 5, code: 'SE-301', name: 'Software Engineering Principles', credits: 3, description: 'Agile methodologies, software architectural styles, testing frameworks, CI/CD pipelines.', instructor: 'Dr. Waseem Ikram', resourceCount: 6 }
        ]
      },
      {
        semesterNumber: 6,
        name: 'Semester 6: Networks, Compilers & Security',
        courses: [
          { id: 'cs-306', programId: 'bs-cs', semesterNumber: 6, code: 'CS-306', name: 'Computer Networks & Distributed Systems', credits: 4, description: 'TCP/IP stack, routing protocols (BGP/OSPF), congestion control, socket programming.', instructor: 'Dr. Muddassar Farooq', resourceCount: 10 },
          { id: 'cs-308', programId: 'bs-cs', semesterNumber: 6, code: 'CS-308', name: 'Compiler Construction', credits: 3, description: 'Lexical analysis, LR/LL parsers, syntax-directed translation, intermediate code optimization.', instructor: 'Dr. Shahid Raza', resourceCount: 8 },
          { id: 'cs-310', programId: 'bs-cs', semesterNumber: 6, code: 'CS-310', name: 'Artificial Intelligence & Search', credits: 3, description: 'A* search, minimax alpha-beta pruning, CSP, Bayesian networks, reinforcement learning.', instructor: 'Dr. Rabia Latif', resourceCount: 11 }
        ]
      },
      {
        semesterNumber: 7,
        name: 'Semester 7: Advanced Specializations & Capstone I',
        courses: [
          { id: 'cs-401', programId: 'bs-cs', semesterNumber: 7, code: 'CS-401', name: 'Senior Capstone Design Project I', credits: 3, description: 'System design, research validation, architecture prototyping and sprint delivery.', instructor: 'Capstone Committee', resourceCount: 4 },
          { id: 'cs-405', programId: 'bs-cs', semesterNumber: 7, code: 'CS-405', name: 'Information & Cyber Security', credits: 3, description: 'Cryptographic algorithms (AES/RSA), zero-trust networks, penetration testing, side-channel attacks.', instructor: 'Dr. Haider Abbas', resourceCount: 7 }
        ]
      },
      {
        semesterNumber: 8,
        name: 'Semester 8: Capstone II & Emerging Paradigms',
        courses: [
          { id: 'cs-402', programId: 'bs-cs', semesterNumber: 8, code: 'CS-402', name: 'Senior Capstone Design Project II', credits: 3, description: 'Final implementation, industry defense, peer review, and deployment benchmarking.', instructor: 'Capstone Committee', resourceCount: 5 },
          { id: 'cs-410', programId: 'bs-cs', semesterNumber: 8, code: 'CS-410', name: 'Cloud Computing & Distributed Clusters', credits: 3, description: 'Container orchestration (Kubernetes), microservices, CAP theorem, distributed consensus (Raft).', instructor: 'Dr. Omer Rana', resourceCount: 8 }
        ]
      }
    ]
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
    activeStudents: 890, // Unlocked
    resourceCount: 54,
    iconName: 'Layers',
    bannerGradient: 'from-emerald-950/40 via-teal-950/60 to-black',
    semesters: [
      {
        semesterNumber: 1,
        name: 'Semester 1: Software Principles',
        courses: [
          { id: 'se-101', programId: 'bs-se', semesterNumber: 1, code: 'SE-101', name: 'Introduction to Software Engineering', credits: 3, description: 'SDLC models, requirements gathering, and professional software ethics.', instructor: 'Dr. Tahir Jamil', resourceCount: 6 },
          { id: 'cs-101-se', programId: 'bs-se', semesterNumber: 1, code: 'CS-101', name: 'Programming Fundamentals', credits: 4, description: 'C++ syntax, procedural logic, array structures, and debugging.', instructor: 'Engr. Haris Khan', resourceCount: 9 }
        ]
      },
      {
        semesterNumber: 2,
        name: 'Semester 2: Object Design & Quality',
        courses: [
          { id: 'se-201', programId: 'bs-se', semesterNumber: 2, code: 'SE-201', name: 'Software Requirements Engineering', credits: 3, description: 'Use case modeling, SRS documentation, UML notation, and user validation.', instructor: 'Dr. Ayesha Saeed', resourceCount: 8 },
          { id: 'cs-102-se', programId: 'bs-se', semesterNumber: 2, code: 'CS-102', name: 'Object Oriented Programming', credits: 4, description: 'OOP concepts, design patterns, and unit test automation.', instructor: 'Dr. Imran Sarwar', resourceCount: 11 }
        ]
      },
      {
        semesterNumber: 3,
        name: 'Semester 3: Architecture & Data Structures',
        courses: [
          { id: 'cs-201-se', programId: 'bs-se', semesterNumber: 3, code: 'CS-201', name: 'Data Structures & Algorithms', credits: 4, description: 'Algorithmic efficiency, graph theory, trees, dynamic tables.', instructor: 'Dr. Naveed Anjum', resourceCount: 14 },
          { id: 'se-202', programId: 'bs-se', semesterNumber: 3, code: 'SE-202', name: 'Software Architecture & Design', credits: 3, description: 'Microservices, MVC, domain-driven design, and architectural refactoring.', instructor: 'Dr. Sajjad Haider', resourceCount: 10 }
        ]
      },
      {
        semesterNumber: 4,
        name: 'Semester 4: Testing & Verification',
        courses: [
          { id: 'se-204', programId: 'bs-se', semesterNumber: 4, code: 'SE-204', name: 'Software Quality Assurance & Testing', credits: 3, description: 'Automated integration testing, mutation testing, coverage metrics, Jest/Cypress.', instructor: 'Dr. Rehan Inam', resourceCount: 12 },
          { id: 'cs-204-se', programId: 'bs-se', semesterNumber: 4, code: 'CS-204', name: 'Operating Systems', credits: 4, description: 'Kernel process scheduling, POSIX threads, memory management.', instructor: 'Dr. Shahzad Ali', resourceCount: 9 }
        ]
      }
    ]
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
    activeStudents: 940, // Unlocked
    resourceCount: 46,
    iconName: 'Briefcase',
    bannerGradient: 'from-amber-950/40 via-yellow-950/60 to-black',
    semesters: [
      {
        semesterNumber: 1,
        name: 'Semester 1: Foundation in Business',
        courses: [
          { id: 'bba-101', programId: 'bba', semesterNumber: 1, code: 'MGT-101', name: 'Principles of Management', credits: 3, description: 'Classical and modern organizational management theories, leadership strategies, and organizational culture.', instructor: 'Dr. Jahanzeb Khan', resourceCount: 9 },
          { id: 'bba-102', programId: 'bba', semesterNumber: 1, code: 'ECO-101', name: 'Microeconomics', credits: 3, description: 'Market equilibria, elasticity, consumer surplus, monopolistic competition, and game theory basics.', instructor: 'Dr. Salman Ahmed', resourceCount: 11 },
          { id: 'bba-103', programId: 'bba', semesterNumber: 1, code: 'ACT-101', name: 'Financial Accounting I', credits: 3, description: 'Double-entry bookkeeping, ledger reconciliation, balance sheet formulation, and cash flow analysis.', instructor: 'Prof. Nida Zahid', resourceCount: 14 }
        ]
      },
      {
        semesterNumber: 2,
        name: 'Semester 2: Markets & Macroeconomics',
        courses: [
          { id: 'bba-201', programId: 'bba', semesterNumber: 2, code: 'MKT-201', name: 'Principles of Marketing', credits: 3, description: '4Ps framework, market segmentation, brand equity, digital acquisition funnels.', instructor: 'Dr. Zainab Qureshi', resourceCount: 8 },
          { id: 'bba-202', programId: 'bba', semesterNumber: 2, code: 'ECO-201', name: 'Macroeconomics', credits: 3, description: 'GDP national accounting, IS-LM model, fiscal and monetary policies, inflationary curves.', instructor: 'Dr. Ahsan Rana', resourceCount: 10 }
        ]
      },
      {
        semesterNumber: 3,
        name: 'Semester 3: Financial Management & Analytics',
        courses: [
          { id: 'bba-301', programId: 'bba', semesterNumber: 3, code: 'FIN-301', name: 'Corporate Business Finance', credits: 3, description: 'DCF valuation, WACC calculation, capital budgeting, dividend policies.', instructor: 'Dr. Mohsin Bashir', resourceCount: 13 },
          { id: 'bba-302', programId: 'bba', semesterNumber: 3, code: 'STAT-301', name: 'Business Statistics & Econometrics', credits: 3, description: 'Multivariate regression, time series forecasting, hypothesis tests.', instructor: 'Dr. Amber Gul', resourceCount: 7 }
        ]
      }
    ]
  },

  {
    id: 'bs-ds-ai',
    name: 'BS Data Science & Artificial Intelligence',
    shortCode: 'BSDS',
    degreeTier: 'Undergraduate',
    discipline: 'Data Science & AI',
    description: 'Next-generation quantitative degree combining mathematical statistics, big data engineering, deep neural networks, and computer vision.',
    badge: 'High Impact Specialization',
    durationYears: 4,
    totalSemesters: 8,
    totalCredits: 130,
    activeStudents: 620, // Unlocked
    resourceCount: 42,
    iconName: 'Sparkles',
    bannerGradient: 'from-purple-950/40 via-violet-950/60 to-black',
    semesters: [
      {
        semesterNumber: 1,
        name: 'Semester 1: Computational Foundations',
        courses: [
          { id: 'ds-101', programId: 'bs-ds-ai', semesterNumber: 1, code: 'DS-101', name: 'Introduction to Data Science & Python', credits: 4, description: 'Python numeric ecosystem (NumPy, Pandas, Matplotlib), exploratory data analysis.', instructor: 'Dr. Kamran Malik', resourceCount: 10 },
          { id: 'math-101-ds', programId: 'bs-ds-ai', semesterNumber: 1, code: 'MATH-101', name: 'Calculus & Multivariable Optimization', credits: 3, description: 'Gradient descent, Hessian matrices, partial derivatives.', instructor: 'Dr. Asma Rauf', resourceCount: 7 }
        ]
      },
      {
        semesterNumber: 2,
        name: 'Semester 2: Linear Algebra & Structures',
        courses: [
          { id: 'ds-102', programId: 'bs-ds-ai', semesterNumber: 2, code: 'DS-102', name: 'Linear Algebra for Machine Learning', credits: 3, description: 'SVD, PCA dimensionality reduction, eigen decomposition, tensor operations.', instructor: 'Dr. Tariq Javeed', resourceCount: 11 },
          { id: 'cs-201-ds', programId: 'bs-ds-ai', semesterNumber: 2, code: 'CS-201', name: 'Data Structures for Analytics', credits: 4, description: 'Graph algorithms, hash maps, trie trees, vector embeddings.', instructor: 'Dr. Faisal Cheema', resourceCount: 9 }
        ]
      },
      {
        semesterNumber: 3,
        name: 'Semester 3: Machine Learning & Pipelines',
        courses: [
          { id: 'ds-301', programId: 'bs-ds-ai', semesterNumber: 3, code: 'DS-301', name: 'Supervised & Unsupervised Machine Learning', credits: 4, description: 'Regression, random forests, SVM, XGBoost, clustering, cross-validation.', instructor: 'Dr. Umair Zaki', resourceCount: 15 },
          { id: 'ds-302', programId: 'bs-ds-ai', semesterNumber: 3, code: 'DS-302', name: 'Data Warehousing & ETL Pipelines', credits: 3, description: 'Snowflake, dbt, Apache Airflow, SQL transformation schemas.', instructor: 'Dr. Hamza Ali', resourceCount: 8 }
        ]
      }
    ]
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
    activeStudents: 410, // Unlocked
    resourceCount: 29,
    iconName: 'Cpu',
    bannerGradient: 'from-orange-950/40 via-red-950/60 to-black',
    semesters: [
      {
        semesterNumber: 1,
        name: 'Semester 1: Circuit Foundations',
        courses: [
          { id: 'ee-101', programId: 'bs-ee', semesterNumber: 1, code: 'EE-101', name: 'Linear Circuit Analysis', credits: 4, description: 'Kirchhoff laws, Thevenin/Norton equivalents, RLC transient and AC response.', instructor: 'Dr. Mansoor Shafi', resourceCount: 8 },
          { id: 'math-101-ee', programId: 'bs-ee', semesterNumber: 1, code: 'MATH-101', name: 'Engineering Calculus', credits: 3, description: 'Differential equations and integral transforms.', instructor: 'Dr. Naeem Iqbal', resourceCount: 5 }
        ]
      },
      {
        semesterNumber: 2,
        name: 'Semester 2: Electronics & Logic',
        courses: [
          { id: 'ee-201', programId: 'bs-ee', semesterNumber: 2, code: 'EE-201', name: 'Electronic Devices & Circuits', credits: 4, description: 'Diodes, BJT, MOSFET small-signal amplifiers, operational amplifiers.', instructor: 'Dr. Shahzad Saleem', resourceCount: 9 },
          { id: 'ee-202', programId: 'bs-ee', semesterNumber: 2, code: 'EE-202', name: 'Digital Systems & VHDL', credits: 4, description: 'FPGA programming, state machines, logic synthesis.', instructor: 'Dr. Bilal Qazi', resourceCount: 7 }
        ]
      }
    ]
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
    activeStudents: 0, // Initially locked (0 registered students) - unlocks when student registers
    resourceCount: 0,
    iconName: 'Shield',
    bannerGradient: 'from-rose-950/40 via-red-950/60 to-black',
    semesters: [
      {
        semesterNumber: 1,
        name: 'Semester 1: System Foundations',
        courses: [
          { id: 'cys-101', programId: 'bs-cys', semesterNumber: 1, code: 'CYS-101', name: 'Fundamentals of Cyber Security', credits: 3, description: 'CIA triad, attack surfaces, threat vectors, security hygiene.', instructor: 'Dr. Adeel Anjum', resourceCount: 0 }
        ]
      }
    ]
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
    activeStudents: 0, // Initially locked (0 students)
    resourceCount: 0,
    iconName: 'Calculator',
    bannerGradient: 'from-emerald-950/40 via-green-950/60 to-black',
    semesters: [
      {
        semesterNumber: 1,
        name: 'Semester 1: Quantitative Accounting',
        courses: [
          { id: 'af-101', programId: 'bs-af', semesterNumber: 1, code: 'AF-101', name: 'Financial Accounting & Reporting', credits: 3, description: 'IFRS frameworks, cash reconciliation, asset depreciation.', instructor: 'Prof. Zahid Saeed', resourceCount: 0 }
        ]
      }
    ]
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
    activeStudents: 310, // Unlocked
    resourceCount: 28,
    iconName: 'Network',
    bannerGradient: 'from-blue-950/40 via-indigo-950/60 to-black',
    semesters: [
      {
        semesterNumber: 1,
        name: 'Semester 1: Advanced Theory',
        courses: [
          { id: 'ms-ds-501', programId: 'ms-ds', semesterNumber: 1, code: 'DS-501', name: 'Statistical Foundations of Machine Learning', credits: 3, description: 'Convex optimization, Bayesian parameter estimation, empirical risk minimization.', instructor: 'Dr. Faisal Shafait', resourceCount: 8 },
          { id: 'ms-ds-502', programId: 'ms-ds', semesterNumber: 1, code: 'DS-502', name: 'Distributed Systems & Big Data (Spark/Ray)', credits: 3, description: 'Apache Spark, cluster scheduling, memory-mapped tensors, streaming ingest.', instructor: 'Dr. Khawar Khurshid', resourceCount: 6 }
        ]
      },
      {
        semesterNumber: 2,
        name: 'Semester 2: Deep Learning & Vision',
        courses: [
          { id: 'ms-ds-601', programId: 'ms-ds', semesterNumber: 2, code: 'DS-601', name: 'Deep Learning & Neural Architectures', credits: 3, description: 'Transformers, attention mechanisms, diffusion models, backpropagation calculus.', instructor: 'Dr. Murtaza Taj', resourceCount: 9 },
          { id: 'ms-ds-602', programId: 'ms-ds', semesterNumber: 2, code: 'DS-602', name: 'Natural Language Processing & LLMs', credits: 3, description: 'Tokenization, embeddings, fine-tuning LoRA, instruction tuning, RAG pipelines.', instructor: 'Dr. Awais Athar', resourceCount: 7 }
        ]
      }
    ]
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
    activeStudents: 240, // Unlocked
    resourceCount: 22,
    iconName: 'Terminal',
    bannerGradient: 'from-cyan-950/40 via-sky-950/60 to-black',
    semesters: [
      {
        semesterNumber: 1,
        name: 'Semester 1: Advanced Analysis',
        courses: [
          { id: 'ms-cs-501', programId: 'ms-cs', semesterNumber: 1, code: 'CS-501', name: 'Advanced Analysis of Algorithms', credits: 3, description: 'Randomized algorithms, approximation algorithms, amortized bounds.', instructor: 'Dr. Arif Zaman', resourceCount: 7 },
          { id: 'ms-cs-502', programId: 'ms-cs', semesterNumber: 1, code: 'CS-502', name: 'Advanced Computer Architecture', credits: 3, description: 'Out-of-order execution, branch predictors, cache coherence protocols (MESI).', instructor: 'Dr. Shahid Bokhari', resourceCount: 5 }
        ]
      }
    ]
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
    activeStudents: 0, // Initially locked (0 students)
    resourceCount: 0,
    iconName: 'TrendingUp',
    bannerGradient: 'from-yellow-950/40 via-amber-950/60 to-black',
    semesters: [
      {
        semesterNumber: 1,
        name: 'Semester 1: Leadership Foundations',
        courses: [
          { id: 'mba-501', programId: 'mba', semesterNumber: 1, code: 'MBA-501', name: 'Strategic Leadership & Corporate Ethics', credits: 3, description: 'Harvard business school cases on competitive advantage and executive decision making.', instructor: 'Dr. Arif Iqbal Rana', resourceCount: 0 }
        ]
      }
    ]
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
    activeStudents: 65, // Unlocked
    resourceCount: 14,
    iconName: 'GraduationCap',
    bannerGradient: 'from-fuchsia-950/40 via-purple-950/60 to-black',
    semesters: [
      {
        semesterNumber: 1,
        name: 'Doctoral Coursework & Research Seminar',
        courses: [
          { id: 'phd-701', programId: 'phd-cs', semesterNumber: 1, code: 'CS-701', name: 'Advanced Research Methodologies & Grant Writing', credits: 3, description: 'Systematic literature reviews, statistical significance testing, reproducibility frameworks.', instructor: 'Dean of Research', resourceCount: 5 },
          { id: 'phd-702', programId: 'phd-cs', semesterNumber: 1, code: 'CS-702', name: 'Special Topics in Artificial Intelligence', credits: 3, description: 'NeurIPS / ICML paper dissections, neural theorem proving, neuro-symbolic reasoning.', instructor: 'Dr. Arshad Ahmad', resourceCount: 6 }
        ]
      }
    ]
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
    activeStudents: 0, // Initially locked (0 students)
    resourceCount: 0,
    iconName: 'Award',
    bannerGradient: 'from-amber-950/40 via-stone-950/60 to-black',
    semesters: [
      {
        semesterNumber: 1,
        name: 'Doctoral Methodologies',
        courses: [
          { id: 'phd-mgt-701', programId: 'phd-mgmt', semesterNumber: 1, code: 'MGT-701', name: 'Advanced Econometric Modeling', credits: 3, description: 'Panel data econometrics, instrument variables, structural equation modeling.', instructor: 'Dr. Jamshed Hasan', resourceCount: 0 }
        ]
      }
    ]
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
    activeStudents: 120, // Unlocked
    resourceCount: 11,
    iconName: 'Binary',
    bannerGradient: 'from-teal-950/40 via-cyan-950/60 to-black',
    semesters: [
      {
        semesterNumber: 1,
        name: 'Semester 1: Computing Basics',
        courses: [
          { id: 'ad-101', programId: 'ad-cs', semesterNumber: 1, code: 'AD-101', name: 'Web Programming & Modern JavaScript', credits: 3, description: 'HTML5, CSS3, ES6+, responsive DOM design, REST API consumption.', instructor: 'Prof. Adeel Raza', resourceCount: 4 },
          { id: 'ad-102', programId: 'ad-cs', semesterNumber: 1, code: 'AD-102', name: 'Introduction to Relational Databases', credits: 3, description: 'PostgreSQL, query authoring, indices, and schema design.', instructor: 'Engr. Saira Bano', resourceCount: 4 }
        ]
      }
    ]
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
    activeStudents: 0, // Initially locked (0 students)
    resourceCount: 0,
    iconName: 'Building',
    bannerGradient: 'from-lime-950/40 via-neutral-950/60 to-black',
    semesters: [
      {
        semesterNumber: 1,
        name: 'Semester 1: Commercial Skills',
        courses: [
          { id: 'ad-ba-101', programId: 'ad-ba', semesterNumber: 1, code: 'AD-BA-101', name: 'Computerized Bookkeeping & Office Applications', credits: 3, description: 'Spreadsheet formulas, invoice processing, basic ledger balancing.', instructor: 'Ms. Rabia Noreen', resourceCount: 0 }
        ]
      }
    ]
  }
];

// ============================================================================
// INITIAL SEED DISCUSSIONS (Scoped to Program)
// ============================================================================

export const INITIAL_PROGRAM_DISCUSSIONS: ProgramDiscussionPost[] = [
  {
    id: 'disc-prog-001',
    programId: 'bs-cs',
    title: 'How to approach the CS-201 Red-Black Trees rotation implementation in C++?',
    content: 'We just started self-balancing BSTs in Data Structures this week. Does anyone have clean pseudocode or visual tracing notes for the left-rotate and right-case double rotations? The textbook diagrams get confusing with the recoloring logic.',
    category: 'Academics',
    semesterTag: 'Semester 3',
    courseTag: 'CS-201 Data Structures & Algorithms',
    authorId: 'stu-ahmed-01',
    authorName: 'Ahmed Bilal',
    authorAvatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&h=100&fit=crop',
    authorProgram: 'BS Computer Science',
    authorDegreeTier: 'Undergraduate',
    createdAt: '2026-03-24T14:30:00Z',
    upvotesCount: 38,
    commentsCount: 3,
    isPinned: true,
    comments: [
      {
        id: 'c-001',
        postId: 'disc-prog-001',
        authorId: 'stu-zainab-02',
        authorName: 'Zainab Fatima',
        authorAvatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&h=100&fit=crop',
        authorProgram: 'BS Computer Science',
        authorDegreeTier: 'Undergraduate',
        content: 'Check the Study Library under CS-201 notes! I uploaded a 4-page handwritten breakdown that illustrates each case with color-coded nodes. Remember case 1 is uncle red (recolor only), case 2 & 3 uncle black (rotate).',
        createdAt: '2026-03-24T15:10:00Z',
        upvotesCount: 17
      },
      {
        id: 'c-002',
        postId: 'disc-prog-001',
        authorId: 'stu-hamza-03',
        authorName: 'Hamza Tariq',
        authorProgram: 'BS Computer Science',
        authorDegreeTier: 'Undergraduate',
        content: 'Also highly recommend writing a small printTree() ASCII helper in your test harness early on. It saves hours of GDB stepping!',
        createdAt: '2026-03-24T16:02:00Z',
        upvotesCount: 9
      }
    ]
  },
  {
    id: 'disc-prog-002',
    programId: 'bs-cs',
    title: 'Recommended electives for Semester 6: Distributed Systems vs Mobile Computing?',
    content: 'For seniors or graduates in BS Computer Science: between CS-306 Distributed Systems and Mobile Computing, which provides better preparation for cloud backend roles and industry internships?',
    category: 'Course Advice',
    semesterTag: 'Semester 6',
    courseTag: 'Elective Selection',
    authorId: 'stu-maham-04',
    authorName: 'Maham Noor',
    authorAvatar: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=100&h=100&fit=crop',
    authorProgram: 'BS Computer Science',
    authorDegreeTier: 'Undergraduate',
    createdAt: '2026-03-22T10:15:00Z',
    upvotesCount: 24,
    commentsCount: 2,
    comments: [
      {
        id: 'c-003',
        postId: 'disc-prog-002',
        authorId: 'stu-usman-05',
        authorName: 'Usman Ghani',
        authorProgram: 'BS Computer Science',
        authorDegreeTier: 'Undergraduate',
        content: 'Distributed Systems 100%! Understanding consensus (Raft/Paxos), RPC frameworks (gRPC), and distributed caching directly helps in technical interviews.',
        createdAt: '2026-03-22T11:45:00Z',
        upvotesCount: 14
      }
    ]
  },
  {
    id: 'disc-prog-003',
    programId: 'bs-cs',
    title: 'Semester 4 Study Group: OS Threading & Paging Lab 3',
    content: 'We are organizing an online and campus study jam this Thursday at 5 PM for the virtual memory paging lab. Bring your Linux dev environment (WSL2 or native).',
    category: 'Study Groups',
    semesterTag: 'Semester 4',
    courseTag: 'CS-204 Operating Systems',
    authorId: 'stu-daniyal-06',
    authorName: 'Daniyal Qureshi',
    authorProgram: 'BS Computer Science',
    authorDegreeTier: 'Undergraduate',
    createdAt: '2026-03-20T08:00:00Z',
    upvotesCount: 19,
    commentsCount: 1,
    comments: []
  },
  {
    id: 'disc-prog-004',
    programId: 'bba',
    title: 'FIN-301 Midterm Prep: Free Cash Flow to Firm (FCFF) vs FCFE derivations',
    content: 'Quick summary table of working capital adjustments and net borrowing terms for the upcoming valuation exam. Make sure you do not double-count interest tax shields!',
    category: 'Academics',
    semesterTag: 'Semester 3',
    courseTag: 'FIN-301 Corporate Business Finance',
    authorId: 'stu-hassan-07',
    authorName: 'Hassan Mir',
    authorAvatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop',
    authorProgram: 'Bachelor of Business Administration (BBA)',
    authorDegreeTier: 'Undergraduate',
    createdAt: '2026-03-23T12:00:00Z',
    upvotesCount: 31,
    commentsCount: 1,
    isPinned: true,
    comments: []
  },
  {
    id: 'disc-prog-005',
    programId: 'ms-ds',
    title: 'Paper Discussion: LoRA parameter efficiency vs full-rank fine tuning in high dimensional LLMs',
    content: 'Looking at how rank $r=8$ vs $r=32$ affects convergence stability on domain-specific corpora. Anyone experimenting with QLoRA on 4-bit quantized bases?',
    category: 'Academics',
    semesterTag: 'Semester 2',
    courseTag: 'DS-602 NLP & LLMs',
    authorId: 'stu-sarah-08',
    authorName: 'Dr. Sarah Kazi',
    authorProgram: 'MS Data Science',
    authorDegreeTier: "Master's",
    createdAt: '2026-03-21T09:20:00Z',
    upvotesCount: 42,
    commentsCount: 2,
    comments: []
  }
];

// ============================================================================
// INITIAL SEED DOUBT QUESTIONS (Scoped to Program)
// ============================================================================

export const INITIAL_PROGRAM_DOUBTS: ProgramDoubtQuestion[] = [
  {
    id: 'doubt-prog-001',
    programId: 'bs-cs',
    title: 'Why is amortized insertion in dynamic array $O(1)$ while worst-case is $O(n)$?',
    content: 'In our Algorithms class, we discussed doubling capacity whenever an array is full. I understand the resize copies $n$ elements, but why does aggregate accounting prove that the amortized cost per single push_back remains $O(1)$?',
    semesterTag: 'Semester 3',
    courseCode: 'CS-201',
    tags: ['Algorithms', 'Complexity Analysis', 'Amortized Analysis', 'Vectors'],
    authorId: 'stu-ali-09',
    authorName: 'Ali Raza',
    authorAvatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100&h=100&fit=crop',
    authorProgram: 'BS Computer Science',
    createdAt: '2026-03-23T16:45:00Z',
    upvotesCount: 27,
    status: 'answered',
    acceptedAnswerId: 'ans-001',
    attachments: [
      { name: 'Aggregate_Banker_Method_Proof.pdf', url: '#', size: '240 KB' }
    ],
    answers: [
      {
        id: 'ans-001',
        questionId: 'doubt-prog-001',
        authorId: 'stu-saba-10',
        authorName: 'Saba Parveen',
        authorAvatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=100&h=100&fit=crop',
        authorRole: 'Peer Teaching Assistant',
        authorProgram: 'BS Computer Science',
        content: 'Think of it with the Banker’s Accounting Method: Every time you insert an item without resizing, charge an amortized cost of 3 tokens. 1 token pays for the immediate insertion. The remaining 2 tokens are deposited as savings. When the array doubles from size $N$ to $2N$, exactly $N$ items have each accumulated 2 unused tokens (= $2N$ credits), which pays exactly for copying all $2N$ items into new memory. Thus, the bank never runs out of credits, proving $O(1)$ amortized!',
        createdAt: '2026-03-23T17:15:00Z',
        upvotesCount: 35,
        isAccepted: true
      }
    ]
  },
  {
    id: 'doubt-prog-002',
    programId: 'bs-cs',
    title: 'How does POSIX sem_wait() avoid busy waiting under the hood?',
    content: 'When a thread calls sem_wait() on a semaphore with value 0, does the thread stay in a spin loop or does the OS transition its task state to TASK_INTERRUPTIBLE / BLOCKED on a wait queue?',
    semesterTag: 'Semester 4',
    courseCode: 'CS-204',
    tags: ['Operating Systems', 'Concurrency', 'Semaphores', 'Kernel'],
    authorId: 'stu-bilal-11',
    authorName: 'Bilal Jahangir',
    authorProgram: 'BS Computer Science',
    createdAt: '2026-03-22T14:10:00Z',
    upvotesCount: 16,
    status: 'answered',
    acceptedAnswerId: 'ans-002',
    answers: [
      {
        id: 'ans-002',
        questionId: 'doubt-prog-002',
        authorId: 'stu-umer-12',
        authorName: 'Umer Farooq',
        authorRole: 'Senior Student',
        authorProgram: 'BS Computer Science',
        content: 'It avoids busy waiting via system calls (such as futex on Linux). The thread yields CPU time by moving from the CPU runqueue to the kernel semaphore sleep queue. The scheduler then gives the CPU to other runnable threads until sem_post() issues a wake_up() on the wait queue.',
        createdAt: '2026-03-22T15:30:00Z',
        upvotesCount: 21,
        isAccepted: true
      }
    ]
  },
  {
    id: 'doubt-prog-003',
    programId: 'bs-cs',
    title: 'Doubt about Database Normalization: When does 3NF suffice over BCNF?',
    content: 'If a table has multiple overlapping composite candidate keys, 3NF allows prime attributes on the right-hand side of functional dependencies ($X \\rightarrow A$ where $A$ is prime). What is an intuitive real-world scenario where a table is in 3NF but not BCNF?',
    semesterTag: 'Semester 5',
    courseCode: 'CS-301',
    tags: ['Databases', '3NF', 'BCNF', 'Normalization', 'Relational Theory'],
    authorId: 'stu-maryam-13',
    authorName: 'Maryam Siddiqui',
    authorProgram: 'BS Computer Science',
    createdAt: '2026-03-24T11:00:00Z',
    upvotesCount: 12,
    status: 'unanswered',
    answers: []
  },
  {
    id: 'doubt-prog-004',
    programId: 'bba',
    title: 'How do you calculate Free Cash Flow to Equity (FCFE) when Net Borrowing is negative?',
    content: 'When debt repayments exceed new borrowings, Net Borrowing becomes negative. Does this decrease FCFE directly in the formula: $FCFE = NI + NCC - \\Delta WC - CapEx + Net Borrowing$?',
    semesterTag: 'Semester 3',
    courseCode: 'FIN-301',
    tags: ['Finance', 'FCFE', 'Cash Flow', 'Valuation'],
    authorId: 'stu-kashif-14',
    authorName: 'Kashif Mehmood',
    authorProgram: 'Bachelor of Business Administration (BBA)',
    createdAt: '2026-03-23T19:00:00Z',
    upvotesCount: 14,
    status: 'answered',
    acceptedAnswerId: 'ans-003',
    answers: [
      {
        id: 'ans-003',
        questionId: 'doubt-prog-004',
        authorId: 'stu-hassan-07',
        authorName: 'Hassan Mir',
        authorRole: 'Honor Student',
        authorProgram: 'Bachelor of Business Administration (BBA)',
        content: 'Yes, exactly! Negative net borrowing means cash was used to pay down principal debt rather than being available for distribution to equity shareholders. So it rightfully subtracts from FCFE.',
        createdAt: '2026-03-23T19:30:00Z',
        upvotesCount: 19,
        isAccepted: true
      }
    ]
  }
];
