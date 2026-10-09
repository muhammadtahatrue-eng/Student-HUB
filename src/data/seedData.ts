import { StudyNote } from '../types/index.ts';

export const INITIAL_STUDY_NOTES: StudyNote[] = [
  {
    id: 'sn-001',
    title: 'Data Structures & Algorithms: Balanced Trees & Graph Traversals',
    description: 'Comprehensive handwritten and annotated lecture notes covering Red-Black Trees, AVL balance rotations, Dijkstra shortest path, and Prim-Jarnik MST algorithms.',
    courseCode: 'CS-214',
    courseName: 'Data Structures and Algorithm Analysis',
    subject: 'Computer Science',
    materialType: 'lecture_notes',
    academicYear: 2025,
    semester: 'Fall Semester',
    professor: 'Dr. Faisal Shafait',
    fileUrl: 'https://example.com/notes/nust-cs214-algorithms-trees.pdf',
    fileName: 'CS214_Lecture_Notes_Week5_Trees_Graphs.pdf',
    fileSizeBytes: 4823449, // ~4.6 MB
    pageCount: 38,
    uploaderName: 'Hamza Tariq',
    uploaderUniversity: 'National University of Sciences & Technology (NUST)',
    universityId: 'nust',
    downloadsCount: 1248,
    upvotesCount: 342,
    createdAt: '2025-11-12T14:22:00Z',
    tags: ['Algorithms', 'Binary Trees', 'Graphs', 'Dijkstra', 'Complexity Analysis'],
    pages: [
      {
        pageNumber: 1,
        sectionTitle: 'Section 1: AVL Trees & Binary Search Invariants',
        content: `An AVL tree is a self-balancing Binary Search Tree where the difference between heights of left and right subtrees (Balance Factor) cannot be more than 1 for all nodes.\n\nBalance Factor: BF(k) = height(left_subtree) - height(right_subtree)\nValid states: BF ∈ {-1, 0, +1}\nWhen an insertion creates BF = +2 or -2, we execute single (LL, RR) or double (LR, RL) rotations.`,
        keyFormulasOrPoints: [
          'Height bounding: h < 1.4404 · log2(N + 2) - 0.328',
          'Worst-case search: O(log N)',
          'Single Left Rotation: root.right becomes parent',
          'Single Right Rotation: root.left becomes parent'
        ]
      },
      {
        pageNumber: 2,
        sectionTitle: 'Section 2: Red-Black Tree Properties & Rotations',
        content: `Red-Black Trees relax strict balance to guarantee at most 2 rotations per insertion and O(log N) operations.\n\nFive Core Invariants:\n1. Every node is either RED or BLACK.\n2. The root node is always BLACK.\n3. Every leaf (NIL) is BLACK.\n4. If a node is RED, both its children must be BLACK (No consecutive REDs).\n5. For each node, all simple paths to descendant leaves contain the same number of BLACK nodes (Black Height).`,
        keyFormulasOrPoints: [
          'Black-Height BH(x) invariant preserved on every rebalance',
          'Max height: h ≤ 2 · log2(N + 1)',
          'Case 1: Uncle is Red → Recolor parent, uncle, and grandparent',
          'Case 2: Uncle is Black (Triangle) → Rotate to line',
          'Case 3: Uncle is Black (Line) → Rotate and recolor'
        ]
      },
      {
        pageNumber: 3,
        sectionTitle: 'Section 3: Graph Shortest Path — Dijkstra & Priority Queues',
        content: `Given a directed weighted graph G = (V, E) with non-negative edge weights w(u, v) ≥ 0, Dijkstra's algorithm finds the shortest path tree from source node s.\n\nAlgorithm Flow:\n1. Initialize dist[s] = 0, dist[v] = ∞ for all v ≠ s.\n2. Insert all vertices into min-priority queue Q keyed by dist[v].\n3. While Q is not empty:\n   u = extract_min(Q)\n   For each outgoing edge (u, v) ∈ E:\n     relax(u, v): if dist[u] + w(u, v) < dist[v] then dist[v] = dist[u] + w(u, v)`,
        keyFormulasOrPoints: [
          'Time with Binary Heap: O((|V| + |E|) log |V|)',
          'Time with Fibonacci Heap: O(|E| + |V| log |V|)',
          'Non-negative weights invariant is mandatory (Negative cycles break greedy optimal substructure)'
        ]
      }
    ]
  },
  {
    id: 'sn-002',
    title: 'Multivariable Calculus & Vector Fields Midterm Exam with Solutions',
    description: 'Official university midterm exam paper containing 6 major problems with complete step-by-step LaTeX solution derivations for Green\'s Theorem and Lagrange Multipliers.',
    courseCode: 'MATH-101',
    courseName: 'Calculus I & Real Analysis',
    subject: 'Mathematics',
    materialType: 'past_exam',
    academicYear: 2024,
    semester: 'Spring Semester',
    professor: 'Dr. Sultan Sial',
    fileUrl: 'https://example.com/notes/lums-math101-midterm-solutions.pdf',
    fileName: 'MATH101_Calculus_Midterm_Complete_Solutions.pdf',
    fileSizeBytes: 2154210, // ~2.1 MB
    pageCount: 14,
    uploaderName: 'Daniyal Mirza',
    uploaderUniversity: 'Lahore University of Management Sciences (LUMS)',
    universityId: 'lums',
    downloadsCount: 2410,
    upvotesCount: 681,
    createdAt: '2025-04-18T09:15:00Z',
    tags: ['Calculus', 'Lagrange Multipliers', 'Greens Theorem', 'Line Integrals', 'Past Exam'],
    pages: [
      {
        pageNumber: 1,
        sectionTitle: 'Problem 1: Constrained Optimization via Lagrange Multipliers',
        content: `Problem Statement: Find the extreme values of f(x, y, z) = 2x + 3y - z subject to the spherical constraint g(x, y, z) = x² + y² + z² = 14.\n\nDerivation:\nSet ∇f = λ∇g:\n⟨2, 3, -1⟩ = λ⟨2x, 2y, 2z⟩\nSolving system of equations:\n2 = 2λx  ⟹  x = 1/λ\n3 = 2λy  ⟹  y = 3/(2λ)\n-1 = 2λz ⟹  z = -1/(2λ)\nSubstitute into constraint: (1/λ)² + (9/4λ²) + (1/4λ²) = 14\n14/(4λ²) = 14  ⟹  λ² = 1/4  ⟹  λ = ±1/2`,
        keyFormulasOrPoints: [
          'Max at (2, 3, -1) with f(2, 3, -1) = 4 + 9 + 1 = 14',
          'Min at (-2, -3, 1) with f(-2, -3, 1) = -14',
          'Always verify constraint gradient ∇g ≠ 0 at critical points'
        ]
      },
      {
        pageNumber: 2,
        sectionTitle: 'Problem 2: Double Integrals & Polar Coordinate Transformations',
        content: `Evaluate the improper Gaussian integral boundary over disk region D of radius R:\n∬_D exp(-(x² + y²)) dA\n\nTransitioning to polar coordinates (x = r cos θ, y = r sin θ, dA = r dr dθ):\nIntegral = ∫[0 to 2π] dθ ∫[0 to R] e^(-r²) · r dr\nLet u = -r², du = -2r dr ⟹ r dr = -du/2\n= 2π · [-1/2 e^(-r²)][0 to R] = π(1 - e^(-R²))\nAs R → ∞, limit converges exactly to π.`,
        keyFormulasOrPoints: [
          'Jacobian factor: dA = r dr dθ',
          'Limits: θ ∈ [0, 2π], r ∈ [0, R]',
          'Standard normal integral: ∫[-∞ to ∞] e^(-x²) dx = √π'
        ]
      }
    ]
  },
  {
    id: 'sn-003',
    title: 'Signals & Systems: Fourier Transforms & Frequency Response Cheat Sheet',
    description: 'High-density review sheet condensing CTFT/DTFT properties, convolution duality, impulse response stability, and transfer function Bode plots.',
    courseCode: 'EE-221',
    courseName: 'Signals and Systems',
    subject: 'Engineering',
    materialType: 'cheat_sheet',
    academicYear: 2025,
    semester: 'Fall Semester',
    professor: 'Dr. Hassaan Khaliq',
    fileUrl: 'https://example.com/notes/nust-ee221-cheat-sheet.pdf',
    fileName: 'EE221_Signals_Systems_High_Yield_CheatSheet.pdf',
    fileSizeBytes: 3412090, // ~3.3 MB
    pageCount: 8,
    uploaderName: 'Ayesha Malik',
    uploaderUniversity: 'National University of Sciences & Technology (NUST)',
    universityId: 'nust',
    downloadsCount: 3190,
    upvotesCount: 894,
    createdAt: '2025-10-05T11:40:00Z',
    tags: ['Signals', 'Fourier Transform', 'Convolution', 'Frequency Response', 'Cheat Sheet'],
    pages: [
      {
        pageNumber: 1,
        sectionTitle: 'Overview 1: Continuous & Discrete Fourier Properties',
        content: `Fourier Transform pair: X(jω) = ∫[-∞ to ∞] x(t) e^(-jωt) dt\nInverse: x(t) = (1 / 2π) ∫[-∞ to ∞] X(jω) e^(jωt) dω\n\nConvolution Theorem:\nx(t) * h(t) ⟷ X(jω) · H(jω)\nx(t) · p(t) ⟷ (1 / 2π) [X(jω) * P(jω)] (Modulation)\n\nParseval's Relation:\n∫ |x(t)|² dt = (1 / 2π) ∫ |X(jω)|² dω`,
        keyFormulasOrPoints: [
          'BIBO Stability: ∫ |h(t)| dt < ∞ (All poles in open left-half s-plane)',
          'Duality: x(t) ⟷ X(jω) implies X(jt) ⟷ 2π x(-ω)',
          'Ideal Low-Pass Filter impulse response is sinc(ω_c t / π)'
        ]
      }
    ]
  },
  {
    id: 'sn-004',
    title: 'Operating Systems & Kernel Internals: XV6 Virtual Memory & Traps Lab Manual',
    description: 'Concise reference and lab manual covering page tables, virtual memory layout, trap frames, user/kernel stack transitions, and POSIX threads.',
    courseCode: 'CS-3005',
    courseName: 'Operating Systems & Kernel Internals',
    subject: 'Computer Science',
    materialType: 'lab_manual',
    academicYear: 2025,
    semester: 'Fall Semester',
    professor: 'Dr. Kashif Zafar',
    fileUrl: 'https://example.com/notes/fast-cs3005-kernel-manual.pdf',
    fileName: 'CS3005_Operating_Systems_XV6_Kernel_Manual.pdf',
    fileSizeBytes: 1845100, // ~1.8 MB
    pageCount: 16,
    uploaderName: 'Saad Ur Rehman',
    uploaderUniversity: 'National University of Computer and Emerging Sciences (FAST-NUCES)',
    universityId: 'fast-nuces',
    downloadsCount: 1675,
    upvotesCount: 420,
    createdAt: '2025-11-20T16:05:00Z',
    tags: ['Operating Systems', 'Kernels', 'Virtual Memory', 'XV6', 'Lab Manual'],
    pages: [
      {
        pageNumber: 1,
        sectionTitle: 'Core Axioms: RISC-V Page Tables & Satp Register',
        content: `Three-level page table walk in Sv39:\nVirtual address: 39 bits = 9 (VPN[2]) + 9 (VPN[1]) + 9 (VPN[0]) + 12 (Offset).\nEach Page Table Entry (PTE) contains 44 PPN bits and 10 flags (V, R, W, X, U, G, A, D).\n\nWhen satp is loaded with root page table address and paging enabled in supervisor mode, hardware MMU translates addresses automatically on TLB miss.`,
        keyFormulasOrPoints: [
          'Page size: 4096 bytes (4 KB)',
          'TLB flush instruction: sfence.vma',
          'Kernel address space maps physical memory directly via KERNBASE = 0x80000000'
        ]
      }
    ]
  },
  {
    id: 'sn-005',
    title: 'Data Structures & Algorithms: C++ Pointer Manipulation & Tree Implementations',
    description: 'Detailed laboratory protocol and practice questions covering generic AVL balancing, min/max binary heaps, and graph adjacency lists.',
    courseCode: 'CS-2001',
    courseName: 'Data Structures & Algorithms',
    subject: 'Computer Science',
    materialType: 'lecture_notes',
    academicYear: 2024,
    semester: 'Spring Semester',
    professor: 'Prof. Farooq Ahmad',
    fileUrl: 'https://example.com/notes/fast-cs2001-dsa-cpp.pdf',
    fileName: 'CS2001_Data_Structures_Cpp_Implementation.pdf',
    fileSizeBytes: 3920310, // ~3.9 MB
    pageCount: 32,
    uploaderName: 'Zainab Qureshi',
    uploaderUniversity: 'National University of Computer and Emerging Sciences (FAST-NUCES)',
    universityId: 'fast-nuces',
    downloadsCount: 1980,
    upvotesCount: 512,
    createdAt: '2024-11-04T08:30:00Z',
    tags: ['Data Structures', 'C++', 'AVL', 'Binary Heaps', 'Lecture Notes'],
    pages: [
      {
        pageNumber: 1,
        sectionTitle: 'Lab 4: Amortized Analysis & Dynamic Array Resizing',
        content: `When a dynamic array doubles capacity from N to 2N:\n- Resizing cost is O(N) copy operations.\n- This cost is distributed across the previous N/2 insertions.\n- Amortized cost per insertion = O(1).\n\nContrast with arithmetic expansion (+C capacity), which incurs O(N²) cumulative cost.`,
        keyFormulasOrPoints: [
          'Accounting method: Charge $3 per insertion',
          'Potential function: Φ(D_i) = 2 · num - size',
          'Geometric factor > 1 ensures O(1) amortized bound'
        ]
      }
    ]
  },
  {
    id: 'sn-006',
    title: 'Algorithms & Computational Complexity: Dynamic Programming & Reductions',
    description: 'Lecture slides and problem sets with detailed dynamic programming state tables, Ford-Fulkerson max flow, and polynomial-time NP-complete reductions.',
    courseCode: 'CS-310',
    courseName: 'Algorithms & Computational Complexity',
    subject: 'Computer Science',
    materialType: 'summary',
    academicYear: 2025,
    semester: 'Fall Semester',
    professor: 'Dr. Ihsan Ayyub Qazi',
    fileUrl: 'https://example.com/notes/lums-cs310-algorithms.pdf',
    fileName: 'CS310_Algorithms_Complexity_Summary_Pack.pdf',
    fileSizeBytes: 3120400, // ~3.0 MB
    pageCount: 26,
    uploaderName: 'Mariam Farooq',
    uploaderUniversity: 'Lahore University of Management Sciences (LUMS)',
    universityId: 'lums',
    downloadsCount: 1450,
    upvotesCount: 388,
    createdAt: '2025-09-28T13:10:00Z',
    tags: ['Algorithms', 'Dynamic Programming', 'Max Flow', 'NP-Complete'],
    pages: [
      {
        pageNumber: 1,
        sectionTitle: 'Lecture 6: Dynamic Programming State Transitions',
        content: `Optimal Substructure & Overlapping Subproblems:\n0/1 Knapsack recurrence:\nDP[i][w] = DP[i-1][w]  if weight[i] > w\nDP[i][w] = max(DP[i-1][w], DP[i-1][w - weight[i]] + val[i])  otherwise.\n\nTime Complexity: O(n · W) pseudo-polynomial. Space optimized to O(W) using 1D reverse-iteration array.`,
        keyFormulasOrPoints: [
          'Topological order on DAG of subproblems',
          'Memoization vs Tabulation trade-offs',
          'Space optimization: keep only previous row'
        ]
      }
    ]
  },
  {
    id: 'sn-007',
    title: 'Computer Networks: TCP Congestion Control & Socket Architecture Notes',
    description: 'Comprehensive study packet explaining Reno vs Cubic congestion window curves, slow start thresholds, sliding windows, and DNS resolution protocols.',
    courseCode: 'CSC-339',
    courseName: 'Computer Networks & Protocols',
    subject: 'Computer Science',
    materialType: 'lecture_notes',
    academicYear: 2025,
    semester: 'Fall Semester',
    professor: 'Dr. Majid Iqbal Khan',
    fileUrl: 'https://example.com/notes/comsats-csc339-networks.pdf',
    fileName: 'CSC339_Computer_Networks_Protocols_Notes.pdf',
    fileSizeBytes: 2980100, // ~2.9 MB
    pageCount: 22,
    uploaderName: 'Taimoor Shah',
    uploaderUniversity: 'COMSATS University Islamabad (CUI)',
    universityId: 'comsats',
    downloadsCount: 1320,
    upvotesCount: 340,
    createdAt: '2025-10-15T11:20:00Z',
    tags: ['Computer Networks', 'TCP', 'Congestion Control', 'Sockets'],
    pages: [
      {
        pageNumber: 1,
        sectionTitle: 'TCP Flow Control vs Congestion Control',
        content: `Flow Control: Receiver advertises rwnd (receive window) in TCP header to prevent receiver buffer overflow.\n\nCongestion Control: Sender maintains cwnd (congestion window) dynamically based on network state.\nEffective transmission window: W = min(cwnd, rwnd).\n\nAIMD (Additive Increase Multiplicative Decrease):\n- On ACK in congestion avoidance: cwnd = cwnd + 1/cwnd\n- On loss event (3 duplicate ACKs): ssthresh = cwnd / 2, cwnd = ssthresh + 3`,
        keyFormulasOrPoints: [
          'Slow Start: cwnd doubles every RTT until ssthresh',
          'Fast Retransmit triggered upon 3 duplicate ACKs',
          'CUBIC uses cubic function of elapsed time since last loss'
        ]
      }
    ]
  },
  {
    id: 'sn-008',
    title: 'Database Systems: Relational Algebra & Normalization (1NF to BCNF) Past Exam',
    description: 'Solved university past examination with step-by-step functional dependency proofs, canonical cover derivation, and lossless-join BCNF decomposition.',
    courseCode: 'CS-202',
    courseName: 'Database Engineering',
    subject: 'Computer Science',
    materialType: 'past_exam',
    academicYear: 2024,
    semester: 'Fall Semester',
    professor: 'Dr. Shazia Arshad',
    fileUrl: 'https://example.com/notes/uet-cs202-database-exam.pdf',
    fileName: 'CS202_Database_Engineering_Past_Exam_Solutions.pdf',
    fileSizeBytes: 2280100, // ~2.2 MB
    pageCount: 18,
    uploaderName: 'Ayesha Siddiqui',
    uploaderUniversity: 'University of Engineering and Technology, Lahore (UET Lahore)',
    universityId: 'uet-lahore',
    downloadsCount: 1830,
    upvotesCount: 462,
    createdAt: '2024-12-08T15:45:00Z',
    tags: ['Database Systems', 'Relational Algebra', 'Normalization', 'BCNF', 'Past Exam'],
    pages: [
      {
        pageNumber: 1,
        sectionTitle: 'Problem 3: Functional Dependencies & BCNF Decomposition',
        content: `Given schema R(A, B, C, D, E) with FDs:\nF = { A → BC, CD → E, B → D, E → A }\n\n1. Find candidate keys of R:\nClosure (A)+ = { A, B, C, D, E } ⟹ A is a superkey.\nClosure (E)+ = { E, A, B, C, D } ⟹ E is a superkey.\nClosure (CD)+ = { C, D, E, A, B } ⟹ CD is a superkey.\nClosure (BC)+ = { B, C, D, E, A } ⟹ BC is a superkey.\n\n2. Check BCNF violation:\nConsider B → D. B+ = { B, D } ≠ R, and B is not a superkey.\nThus B → D violates BCNF. Decompose R into R1(B, D) and R2(A, B, C, E).`,
        keyFormulasOrPoints: [
          'BCNF condition: For every α → β, α must be a superkey',
          '3NF allows prime attributes on the right hand side',
          'Lossless-Join property guaranteed when R1 ∩ R2 is a superkey of R1 or R2'
        ]
      }
    ]
  }
];

export const SUBJECT_OPTIONS = [
  'All Subjects',
  'Computer Science',
  'Mathematics',
  'Biology',
  'Physics',
  'Chemistry',
  'Economics',
  'Engineering',
  'Psychology',
  'History',
  'Philosophy'
];

export const MATERIAL_TYPE_LABELS: Record<string, { label: string; short: string }> = {
  all: { label: 'All Resources', short: 'All' },
  lecture_notes: { label: 'Lecture Notes', short: 'Lectures' },
  past_exam: { label: 'Past Exams', short: 'Exams' },
  cheat_sheet: { label: 'Cheat Sheets', short: 'Cheats' },
  summary: { label: 'Summaries', short: 'Summaries' },
  lab_manual: { label: 'Lab Manuals', short: 'Labs' }
};
