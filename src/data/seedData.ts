import { StudyNote } from '../types/index.ts';

export const INITIAL_STUDY_NOTES: StudyNote[] = [
  {
    id: 'sn-001',
    title: 'Data Structures & Algorithms: Balanced Trees & Graph Traversals',
    description: 'Comprehensive handwritten and annotated lecture notes covering Red-Black Trees, AVL balance rotations, Dijkstra shortest path, and Prim-Jarnik MST algorithms.',
    courseCode: 'CS 106B',
    courseName: 'Programming Abstractions & Algorithms',
    subject: 'Computer Science',
    materialType: 'lecture_notes',
    academicYear: 2025,
    semester: 'Fall Semester',
    professor: 'Prof. Eric Roberts',
    fileUrl: 'https://example.com/notes/cs106b-algorithms-trees.pdf',
    fileName: 'CS106B_Lecture_Notes_Week5_Trees_Graphs.pdf',
    fileSizeBytes: 4823449, // ~4.6 MB
    pageCount: 38,
    uploaderName: 'Sarah Lin',
    uploaderUniversity: 'Stanford University',
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
        content: `Given a directed weighted graph G = (V, E) with non-negative edge weights w(u, v) ≥ 0, Dijkstra\'s algorithm finds the shortest path tree from source node s.\n\nAlgorithm Flow:\n1. Initialize dist[s] = 0, dist[v] = ∞ for all v ≠ s.\n2. Insert all vertices into min-priority queue Q keyed by dist[v].\n3. While Q is not empty:\n   u = extract_min(Q)\n   For each outgoing edge (u, v) ∈ E:\n     relax(u, v): if dist[u] + w(u, v) < dist[v] then dist[v] = dist[u] + w(u, v)`,
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
    description: 'Official 2024 university midterm exam paper containing 6 major problems with complete step-by-step LaTeX solution derivations for Green\'s Theorem and Lagrange Multipliers.',
    courseCode: 'MATH 21A',
    courseName: 'Multivariable Calculus',
    subject: 'Mathematics',
    materialType: 'past_exam',
    academicYear: 2024,
    semester: 'Spring Semester',
    professor: 'Prof. David Jerison',
    fileUrl: 'https://example.com/notes/math21a-midterm-solutions.pdf',
    fileName: 'MATH21A_Spring2024_Midterm_Complete_Solutions.pdf',
    fileSizeBytes: 2154210, // ~2.1 MB
    pageCount: 14,
    uploaderName: 'Alex Thorne',
    uploaderUniversity: 'MIT',
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
    title: 'Cellular & Molecular Biology Complete High-Yield Summary Sheet',
    description: 'High-density, visual review sheet condensing cell respiration pathways, Krebs cycle stoichiometry, DNA replication fork enzymes, and CRISPR Cas9 mechanisms.',
    courseCode: 'BIO 101',
    courseName: 'Principles of Molecular & Cellular Biology',
    subject: 'Biology',
    materialType: 'cheat_sheet',
    academicYear: 2025,
    semester: 'Fall Semester',
    professor: 'Dr. Helen Vanderveer',
    fileUrl: 'https://example.com/notes/bio101-cheat-sheet.pdf',
    fileName: 'BIO101_Molecular_Biology_High_Yield_CheatSheet.pdf',
    fileSizeBytes: 3412090, // ~3.3 MB
    pageCount: 8,
    uploaderName: 'Priya Patel',
    uploaderUniversity: 'UC Berkeley',
    downloadsCount: 3190,
    upvotesCount: 894,
    createdAt: '2025-10-05T11:40:00Z',
    tags: ['Cell Biology', 'Glycolysis', 'ATP Synthase', 'Replication Fork', 'Cheat Sheet'],
    pages: [
      {
        pageNumber: 1,
        sectionTitle: 'Overview 1: Cellular Respiration Energetics & ATP Yield',
        content: `C6H12O6 + 6O2 ⟶ 6CO2 + 6H2O + ~30-32 ATP\n\n1. Glycolysis (Cytoplasm, anaerobic):\n   Glucose ⟶ 2 Pyruvate + 2 ATP (net) + 2 NADH\n   Rate-limiting enzyme: Phosphofructokinase-1 (PFK-1), allosterically inhibited by ATP and citrate.\n\n2. Pyruvate Oxidation (Mitochondrial Matrix):\n   2 Pyruvate ⟶ 2 Acetyl-CoA + 2 CO2 + 2 NADH\n\n3. Citric Acid Cycle / Krebs (Matrix):\n   Per glucose: 2 ATP (GTP) + 6 NADH + 2 FADH2 + 4 CO2\n\n4. Oxidative Phosphorylation (Inner Membrane):\n   Proton gradient across intermembrane space driving Complex V (ATP Synthase).`,
        keyFormulasOrPoints: [
          'P/O Ratios: 1 NADH ≈ 2.5 ATP, 1 FADH2 ≈ 1.5 ATP',
          'Proton motive force: Δp = Δψ - (2.3 RT/F)ΔpH',
          'Uncouplers (e.g. DNP) dissipate proton gradient without ATP generation, releasing heat'
        ]
      },
      {
        pageNumber: 2,
        sectionTitle: 'Overview 2: DNA Replication Fork Machinery',
        content: `Leading strand synthesized continuously 5\' ⟶ 3\'. Lagging strand synthesized discontinuously in Okazaki fragments (~100-200 bp in eukaryotes).\n\nEnzyme Battery:\n- Helicase (DnaB): Unwinds double helix by breaking hydrogen bonds.\n- Single-Stranded Binding Proteins (SSBs): Stabilize single strands.\n- Topoisomerase / Gyrase: Relieves torsional strain and supercoiling ahead of fork.\n- Primase (RNA Polymerase): Synthesizes short 10-nt RNA primer.\n- DNA Polymerase III: Primary elongating enzyme (proofreading 3\' ⟶ 5\' exonuclease).\n- DNA Polymerase I: Removes RNA primers and fills gaps.\n- DNA Ligase: Seals phosphodiester backbone nicks.`,
        keyFormulasOrPoints: [
          'Proofreading fidelity: Error rate drops from 10^-5 to 10^-7 with 3\'→5\' exonuclease',
          'Telomerase extends G-rich 3\' overhang via internal RNA template (TERC)'
        ]
      }
    ]
  },
  {
    id: 'sn-004',
    title: 'Quantum Mechanics & Wave Equations: One-Page Formula & Operator Digest',
    description: 'Concise reference sheet for time-independent Schrödinger equations, infinite square well eigenvalues, angular momentum operators, and harmonic oscillators.',
    courseCode: 'PHYS 137A',
    courseName: 'Quantum Mechanics I',
    subject: 'Physics',
    materialType: 'summary',
    academicYear: 2025,
    semester: 'Fall Semester',
    professor: 'Prof. Sean Carroll',
    fileUrl: 'https://example.com/notes/phys137a-quantum-operators.pdf',
    fileName: 'PHYS137A_Quantum_Mechanics_Operator_Summary.pdf',
    fileSizeBytes: 1845100, // ~1.8 MB
    pageCount: 6,
    uploaderName: 'Liam Chen',
    uploaderUniversity: 'Caltech',
    downloadsCount: 1675,
    upvotesCount: 420,
    createdAt: '2025-11-20T16:05:00Z',
    tags: ['Quantum Mechanics', 'Schrodinger Equation', 'Operators', 'Harmonic Oscillator'],
    pages: [
      {
        pageNumber: 1,
        sectionTitle: 'Core Axioms & Schrödinger Equation',
        content: `Postulate 1: The state of a physical system is represented by a normalized ray |Ψ⟩ in Hilbert space.\nPostulate 2: Physical observables correspond to self-adjoint (Hermitian) operators Â = Â†.\n\nTime-Dependent Schrödinger Equation:\niħ ∂Ψ/∂t = ĤΨ = [-ħ²/(2m) ∇² + V(r)] Ψ\n\nCommutation & Uncertainty:\n[x̂, p̂x] = iħ\nGeneralized Heisenberg Uncertainty: σ_A · σ_B ≥ (1/2) |⟨[Â, B̂]⟩|`,
        keyFormulasOrPoints: [
          'Momentum operator in position basis: p̂ = -iħ (d/dx)',
          'Infinite Square Well Energy: En = (n² π² ħ²) / (2 m L²)',
          'Wavefunction normalization: ∫ |Ψ(x,t)|² dx = 1'
        ]
      }
    ]
  },
  {
    id: 'sn-005',
    title: 'Organic Chemistry II: Named Reactions, Synthesis & Spectrometry Lab Guide',
    description: 'Detailed laboratory protocol and synthesis guide covering Grignard addition, Aldol condensation, Diels-Alder stereochemistry, and 1H-NMR spectrum analysis.',
    courseCode: 'CHEM 230',
    courseName: 'Organic Chemistry Laboratory',
    subject: 'Chemistry',
    materialType: 'lab_manual',
    academicYear: 2024,
    semester: 'Spring Semester',
    professor: 'Dr. Rebecca Evans',
    fileUrl: 'https://example.com/notes/chem230-lab-mechanisms.pdf',
    fileName: 'CHEM230_Organic_Chemistry_Synthesis_Lab_Manual.pdf',
    fileSizeBytes: 5920310, // ~5.8 MB
    pageCount: 32,
    uploaderName: 'Maya Sorensen',
    uploaderUniversity: 'University of Michigan',
    downloadsCount: 1980,
    upvotesCount: 512,
    createdAt: '2024-11-04T08:30:00Z',
    tags: ['Organic Chemistry', 'NMR', 'Grignard', 'Diels-Alder', 'Lab Manual'],
    pages: [
      {
        pageNumber: 1,
        sectionTitle: 'Lab Protocol 4: Grignard Reagent Preparation & Triphenylmethanol Synthesis',
        content: `Objective: Prepare phenylmagnesium bromide from bromobenzene and magnesium turnings under anhydrous conditions, then react with benzophenone.\n\nSafety & Reagents:\n- Diethyl ether is extremely volatile and flammable (b.p. 34.6°C). No open flames permitted.\n- Flame-dry all glassware with hot air gun and seal with drying tube packed with anhydrous CaCl2.\n- Trace water immediately quenches reagent: RMgBr + H2O ⟶ R-H + HOMgBr`,
        keyFormulasOrPoints: [
          'Initiation: Add small crystal of iodine (I2) to activate magnesium surface',
          'Reaction: PhBr + Mg (dry Et2O) ⟶ PhMgBr',
          'Nucleophilic Addition: PhMgBr + Ph2C=O ⟶ Ph3C-OMgBr ⟶ Ph3C-OH'
        ]
      }
    ]
  },
  {
    id: 'sn-006',
    title: 'Intermediate Microeconomics: Consumer Equilibrium & Nash Game Theory',
    description: 'Lecture slides and problem sets with detailed marginal utility curves, Slutsky equation income/substitution effects, Cournot and Bertrand duopoly models.',
    courseCode: 'ECON 100A',
    courseName: 'Microeconomic Theory',
    subject: 'Economics',
    materialType: 'lecture_notes',
    academicYear: 2025,
    semester: 'Fall Semester',
    professor: 'Prof. Jonathan Levin',
    fileUrl: 'https://example.com/notes/econ100a-microeconomics.pdf',
    fileName: 'ECON100A_Microeconomic_Theory_Lecture_Pack.pdf',
    fileSizeBytes: 3120400, // ~3.0 MB
    pageCount: 26,
    uploaderName: 'David Zhang',
    uploaderUniversity: 'Columbia University',
    downloadsCount: 1450,
    upvotesCount: 388,
    createdAt: '2025-09-28T13:10:00Z',
    tags: ['Microeconomics', 'Game Theory', 'Nash Equilibrium', 'Slutsky Equation'],
    pages: [
      {
        pageNumber: 1,
        sectionTitle: 'Lecture 6: Utility Maximization & Tangency Condition',
        content: `Consumer Problem: Maximize U(x1, x2) subject to p1 x1 + p2 x2 = M\n\nFirst Order Condition (Tangency):\nMRS(x1, x2) = MU1 / MU2 = p1 / p2\nMarginal Rate of Substitution equals the economic price ratio.\n\nCobb-Douglas Specification U(x1, x2) = x1^α x2^β:\nExpenditure share on good 1 is strictly α / (α + β).\nx1*(p1, p2, M) = [α / (α + β)] · (M / p1)`,
        keyFormulasOrPoints: [
          'Slutsky Decomposition: ∂x1/∂p1 = (∂x1/∂p1)|utility_const - x1 · (∂x1/∂M)',
          'Normal goods: Substitution effect and Income effect move in same direction',
          'Giffen goods: Inferior good with income effect overriding substitution effect'
        ]
      }
    ]
  },
  {
    id: 'sn-007',
    title: 'Computer Systems & Architecture: Caches, Pipeline Hazards & Virtual Memory',
    description: 'Exam cram sheet detailing set-associative cache hit/miss calculations, branch prediction, forwarding paths, and page table translation walks.',
    courseCode: 'EECS 370',
    courseName: 'Introduction to Computer Organization',
    subject: 'Computer Science',
    materialType: 'cheat_sheet',
    academicYear: 2025,
    semester: 'Winter Semester',
    professor: 'Prof. Ronald Dreslinski',
    fileUrl: 'https://example.com/notes/eecs370-architecture.pdf',
    fileName: 'EECS370_Computer_Architecture_CramSheet.pdf',
    fileSizeBytes: 2750300, // ~2.6 MB
    pageCount: 12,
    uploaderName: 'Marcus Vance',
    uploaderUniversity: 'University of Michigan',
    downloadsCount: 2890,
    upvotesCount: 745,
    createdAt: '2025-02-14T10:00:00Z',
    tags: ['Computer Architecture', 'Caches', 'MIPS', 'Pipelining', 'Virtual Memory'],
    pages: [
      {
        pageNumber: 1,
        sectionTitle: 'Cache Geometry & Address Breakdown',
        content: `Given a 32-bit byte-addressed memory, Cache Size C, Block Size B, Associativity S (sets S-way):\n- Number of Sets = C / (B · S)\n- Offset bits = log2(B)\n- Index bits = log2(Number of Sets)\n- Tag bits = 32 - Index - Offset\n\nAMAT (Average Memory Access Time):\nAMAT = Hit Time + (Miss Rate · Miss Penalty)`,
        keyFormulasOrPoints: [
          '3 Cs of Cache Misses: Compulsory (cold), Capacity (too small), Conflict (set collisions)',
          'Direct Mapped = 1-way set associative',
          'Fully Associative = 0 index bits, 1 set'
        ]
      }
    ]
  },
  {
    id: 'sn-008',
    title: 'Probability & Statistics Practice Final Exam with Step Derivations',
    description: 'Complete 2024 final exam containing Bayes Theorem probability trees, Poisson processes, central limit theorem approximations, and hypothesis tests.',
    courseCode: 'STAT 134',
    courseName: 'Concepts of Probability',
    subject: 'Mathematics',
    materialType: 'past_exam',
    academicYear: 2024,
    semester: 'Fall Semester',
    professor: 'Prof. Ani Adhikari',
    fileUrl: 'https://example.com/notes/stat134-final-exam-practice.pdf',
    fileName: 'STAT134_Concepts_of_Probability_Final_Exam.pdf',
    fileSizeBytes: 2280100, // ~2.2 MB
    pageCount: 18,
    uploaderName: 'Elena Rostova',
    uploaderUniversity: 'UC Berkeley',
    downloadsCount: 1830,
    upvotesCount: 462,
    createdAt: '2024-12-08T15:45:00Z',
    tags: ['Probability', 'Bayes Theorem', 'Poisson', 'Central Limit Theorem', 'Past Exam'],
    pages: [
      {
        pageNumber: 1,
        sectionTitle: 'Problem 3: Joint Probability Distributions & Marginalization',
        content: `Let X and Y have joint density f(x, y) = c(x + 2y) on the unit square 0 ≤ x, y ≤ 1, and 0 elsewhere.\n\n1. Find normalizing constant c:\n∫[0 to 1] dx ∫[0 to 1] c(x + 2y) dy = c ∫[0 to 1] [xy + y²][0 to 1] dx = c ∫[0 to 1] (x + 1) dx\n= c [x²/2 + x][0 to 1] = c (1/2 + 1) = 3c/2 = 1 ⟹ c = 2/3.\n\n2. Marginal density of X:\nf_X(x) = ∫[0 to 1] (2/3)(x + 2y) dy = (2/3)(x + 1) for 0 ≤ x ≤ 1.\n\n3. Conditional expectation E[Y | X = x]:\nf_{Y|X}(y|x) = f(x, y) / f_X(x) = (x + 2y) / (x + 1).`,
        keyFormulasOrPoints: [
          'Law of Total Expectation: E[E[Y|X]] = E[Y]',
          'Covariance: Cov(X, Y) = E[XY] - E[X]E[Y]',
          'Independence iff f(x, y) = f_X(x) · f_Y(y)'
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
