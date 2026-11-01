import {
  University,
  Department,
  Course,
  DiscussionPost,
  DoubtQuestion
} from '../types/index.ts';

export const INITIAL_UNIVERSITIES: University[] = [
  {
    id: 'stanford',
    name: 'Stanford University',
    shortName: 'Stanford',
    badge: 'Silicon Valley Research',
    logoUrl: 'https://images.unsplash.com/photo-1541339907198-e08756dedf3f?w=160&auto=format&fit=crop&q=80',
    bannerUrl: 'https://images.unsplash.com/photo-1541339907198-e08756dedf3f?w=1200&auto=format&fit=crop&q=80',
    location: 'Stanford, California, USA',
    country: 'United States',
    disciplines: ['Computer Science', 'Electrical Engineering', 'Economics', 'Medicine', 'Mathematics'],
    website: 'https://stanford.edu',
    establishedYear: 1885,
    verifiedStudents: 17240,
    totalCoursesCount: 1420,
    description: 'Premier global university recognized for computer science, engineering breakthroughs, venture innovation, and academic scholarship.',
    isMemberRestricted: false
  },
  {
    id: 'berkeley',
    name: 'University of California, Berkeley',
    shortName: 'UC Berkeley',
    badge: 'Public Ivy Flagship',
    logoUrl: 'https://images.unsplash.com/photo-1523050854058-8df90110c9f1?w=160&auto=format&fit=crop&q=80',
    bannerUrl: 'https://images.unsplash.com/photo-1523050854058-8df90110c9f1?w=1200&auto=format&fit=crop&q=80',
    location: 'Berkeley, California, USA',
    country: 'United States',
    disciplines: ['Computer Science', 'Mathematics', 'Statistics', 'Physics', 'Chemistry'],
    website: 'https://berkeley.edu',
    establishedYear: 1868,
    verifiedStudents: 22890,
    totalCoursesCount: 1890,
    description: 'Leading research institute renowned for open systems innovation, mathematical rigor, and Nobel laureate faculty.',
    isMemberRestricted: false
  },
  {
    id: 'mit',
    name: 'Massachusetts Institute of Technology',
    shortName: 'MIT',
    badge: 'Global STEM Hub',
    logoUrl: 'https://images.unsplash.com/photo-1562774053-701939374585?w=160&auto=format&fit=crop&q=80',
    bannerUrl: 'https://images.unsplash.com/photo-1562774053-701939374585?w=1200&auto=format&fit=crop&q=80',
    location: 'Cambridge, Massachusetts, USA',
    country: 'United States',
    disciplines: ['Computer Science', 'Physics', 'Aerospace', 'Mathematics', 'Electrical Engineering'],
    website: 'https://mit.edu',
    establishedYear: 1861,
    verifiedStudents: 11930,
    totalCoursesCount: 1250,
    description: 'World-renowned institution focused on cutting-edge technological research, artificial intelligence, quantum physics, and engineering.',
    isMemberRestricted: false
  },
  {
    id: 'harvard',
    name: 'Harvard University',
    shortName: 'Harvard',
    badge: 'Historic Ivy League',
    logoUrl: 'https://images.unsplash.com/photo-1509062522246-3755977927d7?w=160&auto=format&fit=crop&q=80',
    bannerUrl: 'https://images.unsplash.com/photo-1509062522246-3755977927d7?w=1200&auto=format&fit=crop&q=80',
    location: 'Cambridge, Massachusetts, USA',
    country: 'United States',
    disciplines: ['Economics', 'Government', 'Computer Science', 'Medicine', 'Law'],
    website: 'https://harvard.edu',
    establishedYear: 1636,
    verifiedStudents: 19800,
    totalCoursesCount: 2100,
    description: 'Oldest higher education institution in the United States, cultivating global thought leaders, economists, and researchers.',
    isMemberRestricted: false
  },
  {
    id: 'oxford',
    name: 'University of Oxford',
    shortName: 'Oxford',
    badge: 'Ancient Collegiate',
    logoUrl: 'https://images.unsplash.com/photo-1579899147572-cfaea05f4296?w=160&auto=format&fit=crop&q=80',
    bannerUrl: 'https://images.unsplash.com/photo-1579899147572-cfaea05f4296?w=1200&auto=format&fit=crop&q=80',
    location: 'Oxford, Oxfordshire, United Kingdom',
    country: 'United Kingdom',
    disciplines: ['Philosophy', 'Mathematics', 'Computer Science', 'History', 'Biochemistry'],
    website: 'https://ox.ac.uk',
    establishedYear: 1096,
    verifiedStudents: 24500,
    totalCoursesCount: 1640,
    description: 'Oldest English-speaking university in the world, renowned for rigorous tutorials, foundational science, and historical scholarship.',
    isMemberRestricted: false
  },
  {
    id: 'cmu',
    name: 'Carnegie Mellon University',
    shortName: 'CMU',
    badge: 'Robotics & Systems Institute',
    logoUrl: 'https://images.unsplash.com/photo-1592280771190-3e2e4d571952?w=160&auto=format&fit=crop&q=80',
    bannerUrl: 'https://images.unsplash.com/photo-1592280771190-3e2e4d571952?w=1200&auto=format&fit=crop&q=80',
    location: 'Pittsburgh, Pennsylvania, USA',
    country: 'United States',
    disciplines: ['Computer Science', 'Software Engineering', 'Robotics', 'Design', 'Data Science'],
    website: 'https://cmu.edu',
    establishedYear: 1900,
    verifiedStudents: 14780,
    totalCoursesCount: 1120,
    description: 'Top-tier institution celebrated for systems software, artificial intelligence, robotics, and multidisciplinary design.',
    isMemberRestricted: false
  },
  {
    id: 'toronto',
    name: 'University of Toronto',
    shortName: 'U of T',
    badge: 'Deep Learning Pioneer',
    logoUrl: 'https://images.unsplash.com/photo-1580582932707-520aed937b7b?w=160&auto=format&fit=crop&q=80',
    bannerUrl: 'https://images.unsplash.com/photo-1580582932707-520aed937b7b?w=1200&auto=format&fit=crop&q=80',
    location: 'Toronto, Ontario, Canada',
    country: 'Canada',
    disciplines: ['Computer Science', 'Neural Networks', 'Medicine', 'Bioinformatics', 'Economics'],
    website: 'https://utoronto.ca',
    establishedYear: 1827,
    verifiedStudents: 28400,
    totalCoursesCount: 2200,
    description: 'Canada’s flagship university and historic birthplace of modern deep neural network breakthroughs.',
    isMemberRestricted: false
  }
];

export const INITIAL_DEPARTMENTS: Department[] = [
  // Stanford
  {
    id: 'dept-stanford-cs',
    universityId: 'stanford',
    name: 'Computer Science',
    code: 'CS',
    description: 'Core software systems, algorithms, artificial intelligence, and human-computer interaction.',
    courseCount: 42
  },
  {
    id: 'dept-stanford-math',
    universityId: 'stanford',
    name: 'Mathematics & Statistics',
    code: 'MATH',
    description: 'Pure mathematics, continuous optimization, probability theory, and discrete structures.',
    courseCount: 28
  },
  {
    id: 'dept-stanford-ee',
    universityId: 'stanford',
    name: 'Electrical Engineering',
    code: 'EE',
    description: 'VLSI architectures, signal processing, quantum devices, and cyber-physical systems.',
    courseCount: 24
  },
  {
    id: 'dept-stanford-econ',
    universityId: 'stanford',
    name: 'Economics',
    code: 'ECON',
    description: 'Microeconomic theory, econometric methods, monetary economics, and game theory.',
    courseCount: 20
  },
  // UC Berkeley
  {
    id: 'dept-berkeley-eecs',
    universityId: 'berkeley',
    name: 'Electrical Engineering & Computer Sciences',
    code: 'EECS',
    description: 'Scalable distributed systems, machine learning theory, operating systems, and circuits.',
    courseCount: 48
  },
  {
    id: 'dept-berkeley-stat',
    universityId: 'berkeley',
    name: 'Statistics & Data Science',
    code: 'STAT',
    description: 'Theoretical probability, stochastic calculus, Bayesian inference, and high-dimensional analytics.',
    courseCount: 30
  },
  // MIT
  {
    id: 'dept-mit-eecs',
    universityId: 'mit',
    name: 'EECS Course 6',
    code: '6',
    description: 'Foundations of computation, algorithmic complexity, robotics, and hardware architectures.',
    courseCount: 52
  },
  {
    id: 'dept-mit-phys',
    universityId: 'mit',
    name: 'Physics Course 8',
    code: '8',
    description: 'Quantum mechanics, statistical mechanics, relativistic electrodynamics, and astrophysics.',
    courseCount: 34
  }
];

export const INITIAL_COURSES: Course[] = [
  // Stanford
  {
    id: 'course-stanford-cs106b',
    universityId: 'stanford',
    departmentId: 'dept-stanford-cs',
    departmentCode: 'CS',
    code: 'CS 106B',
    name: 'Programming Abstractions & Data Structures',
    description: 'Pointers, recursion, dynamic memory, balanced search trees, graph algorithms, and ADT design in C++.',
    instructor: 'Prof. Eric Roberts',
    activeStudents: 620
  },
  {
    id: 'course-stanford-cs161',
    universityId: 'stanford',
    departmentId: 'dept-stanford-cs',
    departmentCode: 'CS',
    code: 'CS 161',
    name: 'Design and Analysis of Algorithms',
    description: 'Divide-and-conquer, dynamic programming, network flows, randomized algorithms, and NP-completeness.',
    instructor: 'Prof. Mary Wootters',
    activeStudents: 410
  },
  {
    id: 'course-stanford-math51',
    universityId: 'stanford',
    departmentId: 'dept-stanford-math',
    departmentCode: 'MATH',
    code: 'MATH 51',
    name: 'Linear Algebra & Multivariable Calculus',
    description: 'Matrix vector spaces, eigenvalues, multivariable optimization, gradients, and Hessian matrices.',
    instructor: 'Prof. Rafe Mazzeo',
    activeStudents: 540
  },
  {
    id: 'course-stanford-ee108',
    universityId: 'stanford',
    departmentId: 'dept-stanford-ee',
    departmentCode: 'EE',
    code: 'EE 108',
    name: 'Digital System Design with Verilog',
    description: 'Synchronous logic, state machines, timing constraints, FPGA implementation, and bus architectures.',
    instructor: 'Prof. Subhasish Mitra',
    activeStudents: 190
  },
  // UC Berkeley
  {
    id: 'course-berkeley-stat134',
    universityId: 'berkeley',
    departmentId: 'dept-berkeley-stat',
    departmentCode: 'STAT',
    code: 'STAT 134',
    name: 'Concepts of Probability',
    description: 'Discrete & continuous distributions, conditional expectation, Poisson processes, and limit theorems.',
    instructor: 'Prof. Ani Adhikari',
    activeStudents: 580
  },
  {
    id: 'course-berkeley-cs61a',
    universityId: 'berkeley',
    departmentId: 'dept-berkeley-eecs',
    departmentCode: 'EECS',
    code: 'CS 61A',
    name: 'Structure & Interpretation of Computer Programs',
    description: 'Functional programming, environment diagrams, object-oriented systems, and interpreters in Python.',
    instructor: 'Prof. John DeNero',
    activeStudents: 1100
  },
  // MIT
  {
    id: 'course-mit-6006',
    universityId: 'mit',
    departmentId: 'dept-mit-eecs',
    departmentCode: '6',
    code: '6.006',
    name: 'Introduction to Algorithms',
    description: 'Sorting, heaps, hash tables, dynamic programming, shortest paths, and asymptotic complexity.',
    instructor: 'Prof. Erik Demaine',
    activeStudents: 480
  }
];

export const INITIAL_DISCUSSIONS: DiscussionPost[] = [
  {
    id: 'disc-stanford-01',
    universityId: 'stanford',
    title: 'Midterm 2 Study Room & Red-Black Tree Rotation Review (CS 106B)',
    content: 'We booked Huang Engineering Center study room 114 this Thursday from 6 PM to 9 PM. We will work through 2023–2024 past midterm rotations and Dijkstra heap implementations. Whiteboard markers and summary printouts provided. Anyone is welcome to drop in!',
    category: 'Study Groups',
    courseTag: 'CS 106B',
    authorId: 'usr-sarah-lin',
    authorName: 'Sarah Lin',
    authorAvatar: 'https://api.dicebear.com/7.x/bottts/svg?seed=MechaZero&backgroundColor=0d1117',
    authorMajor: 'Computer Science',
    authorUniversity: 'Stanford University',
    createdAt: '2026-03-24T18:40:00Z',
    upvotesCount: 38,
    commentsCount: 3,
    isPinned: true,
    comments: [
      {
        id: 'comm-st-01',
        postId: 'disc-stanford-01',
        authorId: 'usr-david-k',
        authorName: 'David Kim',
        authorAvatar: 'https://api.dicebear.com/7.x/pixel-art/svg?seed=RetroHero&backgroundColor=1f2937',
        authorUniversity: 'Stanford University',
        content: 'Awesome! Will bring previous years problem set solutions with Prof. Roberts commentary.',
        createdAt: '2026-03-24T19:10:00Z',
        upvotesCount: 6
      },
      {
        id: 'comm-st-02',
        postId: 'disc-stanford-01',
        authorId: 'usr-elena-v',
        authorName: 'Elena Vance',
        authorAvatar: 'https://api.dicebear.com/7.x/pixel-art/svg?seed=NeonFox&backgroundColor=090d16',
        authorUniversity: 'Stanford University',
        content: 'Can someone upload the handwritten AVL tree diagrams to the Study Library beforehand?',
        createdAt: '2026-03-24T20:05:00Z',
        upvotesCount: 4
      },
      {
        id: 'comm-st-03',
        postId: 'disc-stanford-01',
        authorId: 'usr-sarah-lin',
        authorName: 'Sarah Lin',
        authorAvatar: 'https://api.dicebear.com/7.x/bottts/svg?seed=MechaZero&backgroundColor=0d1117',
        authorUniversity: 'Stanford University',
        content: 'Done! Uploaded to CS 106B section under Lecture Notes.',
        createdAt: '2026-03-24T20:30:00Z',
        upvotesCount: 8
      }
    ]
  },
  {
    id: 'disc-stanford-02',
    universityId: 'stanford',
    title: 'Tips for transitioning from MATH 51 to Advanced Machine Learning & Optimization',
    content: 'For anyone who took MATH 51 with Prof. Mazzeo: which topics in multivariable calculus proved most crucial when taking CS 229 / CS 230? Specifically wondering if constrained optimization with Lagrange multipliers or SVD decomposition deserves more emphasis.',
    category: 'Course Advice',
    courseTag: 'MATH 51',
    authorId: 'usr-marcus-chen',
    authorName: 'Marcus Chen',
    authorAvatar: 'https://api.dicebear.com/7.x/pixel-art/svg?seed=ShadowNinja&backgroundColor=111827',
    authorMajor: 'Symbolic Systems',
    authorUniversity: 'Stanford University',
    createdAt: '2026-03-22T14:15:00Z',
    upvotesCount: 24,
    commentsCount: 2,
    comments: [
      {
        id: 'comm-st-04',
        postId: 'disc-stanford-02',
        authorId: 'usr-rachel-w',
        authorName: 'Rachel Wu',
        authorAvatar: 'https://api.dicebear.com/7.x/bottts/svg?seed=AstroBot&backgroundColor=0f172a',
        authorUniversity: 'Stanford University',
        content: 'Definitely gradient vectors, Jacobians for backprop, and positive semidefinite Hessians. Also master positive definiteness for loss landscape curvature.',
        createdAt: '2026-03-22T15:20:00Z',
        upvotesCount: 12
      },
      {
        id: 'comm-st-05',
        postId: 'disc-stanford-02',
        authorId: 'usr-alex-m',
        authorName: 'Alex Mercer',
        authorAvatar: 'https://api.dicebear.com/7.x/pixel-art/svg?seed=PixelMage&backgroundColor=18181b',
        authorUniversity: 'Stanford University',
        content: 'Check the MATH 51 Linear Algebra summary sheets in StudyVault; they cover the exact geometric intuition you need for gradient descent.',
        createdAt: '2026-03-22T17:00:00Z',
        upvotesCount: 9
      }
    ]
  },
  {
    id: 'disc-berkeley-01',
    universityId: 'berkeley',
    title: 'STAT 134 Final Exam Preparation Checklist & Formula Sheets',
    content: 'Consolidated list of core distribution transformations: Rayleigh, Cauchy, Chi-Squared, and Poisson sum properties. Remember that conditional expectation E[X|Y] is a random variable in Y, not a scalar! Good luck during finals week everyone.',
    category: 'Academics',
    courseTag: 'STAT 134',
    authorId: 'usr-elena-rostova',
    authorName: 'Elena Rostova',
    authorAvatar: 'https://api.dicebear.com/7.x/pixel-art/svg?seed=PixelMage&backgroundColor=18181b',
    authorMajor: 'Statistics',
    authorUniversity: 'UC Berkeley',
    createdAt: '2026-03-20T11:00:00Z',
    upvotesCount: 45,
    commentsCount: 1,
    isPinned: true,
    comments: [
      {
        id: 'comm-bk-01',
        postId: 'disc-berkeley-01',
        authorId: 'usr-kevin-b',
        authorName: 'Kevin Bhatia',
        authorAvatar: 'https://api.dicebear.com/7.x/bottts/svg?seed=SparkDroid&backgroundColor=1e1b4b',
        authorUniversity: 'UC Berkeley',
        content: 'Thanks Elena! That joint PDF marginalization solution in your past exam upload saved my homework assignment.',
        createdAt: '2026-03-20T12:45:00Z',
        upvotesCount: 7
      }
    ]
  }
];

export const INITIAL_DOUBTS: DoubtQuestion[] = [
  {
    id: 'doubt-stanford-01',
    universityId: 'stanford',
    title: 'Why does Dijkstra fail on negative edges even without negative cycles?',
    content: 'In CS 106B, we proved Dijkstra terminates with the shortest path when all edge weights w(u, v) >= 0. But why specifically does having even one negative edge break the greedy choice property, if there is no negative-weight cycle? Can someone provide a minimal 3-node counterexample?',
    department: 'Computer Science',
    courseCode: 'CS 106B',
    tags: ['Algorithms', 'Graphs', 'Dijkstra', 'Greedy Choice'],
    authorId: 'usr-jason-t',
    authorName: 'Jason Thorne',
    authorAvatar: 'https://api.dicebear.com/7.x/bottts/svg?seed=QuantumBot&backgroundColor=131127',
    authorUniversity: 'Stanford University',
    createdAt: '2026-03-23T16:20:00Z',
    upvotesCount: 19,
    status: 'answered',
    acceptedAnswerId: 'ans-01',
    answers: [
      {
        id: 'ans-01',
        questionId: 'doubt-stanford-01',
        authorId: 'usr-sarah-lin',
        authorName: 'Sarah Lin',
        authorAvatar: 'https://api.dicebear.com/7.x/bottts/svg?seed=MechaZero&backgroundColor=0d1117',
        authorRole: 'Course TA',
        authorUniversity: 'Stanford University',
        content: `Here is the classic minimal 3-node counterexample:\n\nNodes: Source S, A, and B.\nEdges:\n- S -> A with weight 2\n- S -> B with weight 5\n- B -> A with weight -4\n\nExecution:\n1. S extracts itself (dist[S] = 0).\n2. Neighbors of S are relaxed: dist[A] = 2, dist[B] = 5.\n3. The min-priority queue extracts A next because 2 < 5. Dijkstra permanently marks A as visited (closed) with optimal distance 2.\n4. Next, B is extracted with dist[B] = 5.\n5. The edge B -> A has weight -4, which yields 5 + (-4) = 1. This is strictly better than 2!\n6. However, because A was already finalized by the greedy assumption that no future path can decrease an extracted distance, Dijkstra never updates A or downstream paths from A.\n\nHence, the greedy invariant "the distance of the extracted node is guaranteed to be optimal" relies directly on all future edge additions being non-negative. For negative edges, use Bellman-Ford or SPFA instead.`,
        createdAt: '2026-03-23T17:05:00Z',
        upvotesCount: 28,
        isAccepted: true
      }
    ]
  },
  {
    id: 'doubt-stanford-02',
    universityId: 'stanford',
    title: 'Double rotation conditions in AVL trees: when is LR vs RL invoked?',
    content: 'I get confused between when to do Left-Right vs Right-Left rotations. How do we test the balance factor of the child node to determine the orientation of the inner rotation?',
    department: 'Computer Science',
    courseCode: 'CS 106B',
    tags: ['Trees', 'AVL Tree', 'Rotations', 'Data Structures'],
    authorId: 'usr-chloe-d',
    authorName: 'Chloe Dupont',
    authorAvatar: 'https://api.dicebear.com/7.x/pixel-art/svg?seed=RetroHero&backgroundColor=1f2937',
    authorUniversity: 'Stanford University',
    createdAt: '2026-03-21T09:40:00Z',
    upvotesCount: 14,
    status: 'answered',
    acceptedAnswerId: 'ans-02',
    answers: [
      {
        id: 'ans-02',
        questionId: 'doubt-stanford-02',
        authorId: 'usr-marcus-chen',
        authorName: 'Marcus Chen',
        authorAvatar: 'https://api.dicebear.com/7.x/pixel-art/svg?seed=ShadowNinja&backgroundColor=111827',
        authorRole: 'Peer Contributor',
        authorUniversity: 'Stanford University',
        content: `Rule of thumb based on Balance Factor (BF = height(left) - height(right)):\n\n1. Left-Right (LR) Case:\n   - Node N has BF(N) = +2 (left-heavy).\n   - Its left child L has BF(L) = -1 (right-heavy).\n   - Action: Rotate L to the left (straightens the zigzag into LL), then rotate N to the right.\n\n2. Right-Left (RL) Case:\n   - Node N has BF(N) = -2 (right-heavy).\n   - Its right child R has BF(R) = +1 (left-heavy).\n   - Action: Rotate R to the right (straightens the zigzag into RR), then rotate N to the left.\n\nWhenever the signs of the parent BF and the heavy child BF have opposite signs, you always need a double rotation to straighten the bent branch first!`,
        createdAt: '2026-03-21T10:15:00Z',
        upvotesCount: 16,
        isAccepted: true
      }
    ]
  },
  {
    id: 'doubt-berkeley-01',
    universityId: 'berkeley',
    title: 'Finding the Normalizing Constant c in Joint Density f(x, y) = c(x + 2y)',
    content: 'On the unit square 0 <= x <= 1 and 0 <= y <= 1, how do we evaluate the iterated double integral step-by-step to confirm c = 2/3? I kept getting 3/2 on my scratch paper.',
    department: 'Statistics',
    courseCode: 'STAT 134',
    tags: ['Probability', 'Calculus', 'Joint PDF', 'Normalizing Constant'],
    authorId: 'usr-liam-s',
    authorName: 'Liam Song',
    authorAvatar: 'https://api.dicebear.com/7.x/bottts/svg?seed=AstroBot&backgroundColor=0f172a',
    authorUniversity: 'UC Berkeley',
    createdAt: '2026-03-19T14:00:00Z',
    upvotesCount: 8,
    status: 'unanswered',
    answers: []
  }
];
