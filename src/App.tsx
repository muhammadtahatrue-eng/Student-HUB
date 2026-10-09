import React, { useState, useEffect, useMemo } from 'react';
import {
  FileText,
  Upload,
  BookOpen,
  Filter,
  CheckCircle2,
  AlertCircle,
  Code2,
  Database,
  Search,
  Sparkles,
  ArrowRight
} from 'lucide-react';
import { StudyNote, FilterState, SupabaseConfig, StudentUser } from './types/index.ts';
import {
  getSavedSupabaseConfig,
  getSupabaseInstance,
  fetchAllNotes,
  toggleUpvoteLocal,
  incrementDownloadCountLocal,
  isValidHttpUrl
} from './lib/supabaseClient.ts';
import { LightRays, RaysOrigin } from './components/LightRays.tsx';
import { Navbar } from './components/Navbar.tsx';
import { LandingHero } from './components/LandingHero.tsx';
import { SearchHeader } from './components/SearchHeader.tsx';
import { NoteCard } from './components/NoteCard.tsx';
import { PDFPreviewModal } from './components/PDFPreviewModal.tsx';
import { UploadView } from './components/UploadView.tsx';
import { SupabaseModal } from './components/SupabaseModal.tsx';
import { CodeExportModal } from './components/CodeExportModal.tsx';
import { AuthModal } from './components/AuthModal.tsx';
import { DemoModal } from './components/DemoModal.tsx';
import { Footer } from './components/Footer.tsx';
import { VerticalTaskbar } from './components/VerticalTaskbar.tsx';
import { ExploreUniversitiesView } from './components/university/ExploreUniversitiesView.tsx';
import { UniversityDirectoryView, UniversityTabKey } from './components/university/UniversityDirectoryView.tsx';
import { UniversitySetupModal } from './components/university/UniversitySetupModal.tsx';
import { findUniversityByNameOrFuzzy } from './lib/universityStore.ts';

const ASH_GREY_COLOR = '#9ca3af'; // Ash Grey default
const DEFAULT_RAY_ORIGIN: RaysOrigin = 'top-center';

const HOLOGRAPHIC_NEON_COLORS = [
  '#9ca3af', // Ash Grey (Default)
  '#00f0ff', // Cyber Cyan
  '#ff007f', // Neon Magenta
  '#10b981', // Aurora Emerald
  '#b388ff', // Ultraviolet Hologram
  '#f59e0b', // Solar Amber
  '#00ffff', // Electric Aqua
  '#ff3366', // Neon Crimson
  '#39ff14', // Matrix Green
  '#d946ef', // Cyber Fuchsia
  '#ffffff', // Pure Platinum
];

export default function App() {
  // Navigation: 'landing' (showcase), 'browse' (library), 'upload' (share), 'explore' (universities), 'university' (campus directory)
  const [currentTab, setCurrentTab] = useState<'landing' | 'browse' | 'upload' | 'explore' | 'university'>('landing');

  // Active university directory state
  const [selectedUniversityId, setSelectedUniversityId] = useState<string>(() => {
    try {
      const savedUser = localStorage.getItem('studyvault_active_user');
      if (savedUser) {
        const parsed = JSON.parse(savedUser);
        if (parsed.universityId) return parsed.universityId;
        const matched = findUniversityByNameOrFuzzy(parsed.university);
        if (matched) return matched.id;
      }
    } catch {}
    return 'nust';
  });
  const [universitySubTab, setUniversitySubTab] = useState<UniversityTabKey>('overview');
  const [isUniversitySetupOpen, setIsUniversitySetupOpen] = useState(false);
  const [uploadPrefill, setUploadPrefill] = useState<{ university?: string; courseCode?: string }>({});

  // Supabase & Auth state - anyone can view without registration by default
  const [supabaseConfig, setSupabaseConfig] = useState<SupabaseConfig>(getSavedSupabaseConfig());
  const [user, setUser] = useState<StudentUser | null>(() => {
    try {
      const saved = localStorage.getItem('studyvault_active_user');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });
  const [authModalMode, setAuthModalMode] = useState<'signin' | 'signup' | 'settings' | 'profile'>('signup');

  // Modal visibility
  const [isSupabaseModalOpen, setIsSupabaseModalOpen] = useState(false);
  const [isCodeExportOpen, setIsCodeExportOpen] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isDemoModalOpen, setIsDemoModalOpen] = useState(false);
  const [previewNote, setPreviewNote] = useState<StudyNote | null>(null);

  // LightRays atmospheric background effect state
  // Default is Ash Grey color and Top-Center position
  const [rayColor, setRayColor] = useState<string>(() => {
    try {
      return localStorage.getItem('studyvault_flare_color') || ASH_GREY_COLOR;
    } catch {
      return ASH_GREY_COLOR;
    }
  });
  const [rayOrigin, setRayOrigin] = useState<RaysOrigin>(() => {
    try {
      return (localStorage.getItem('studyvault_flare_origin') as RaysOrigin) || DEFAULT_RAY_ORIGIN;
    } catch {
      return DEFAULT_RAY_ORIGIN;
    }
  });
  const [isFlareLocked, setIsFlareLocked] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem('studyvault_flare_locked');
      return saved !== null ? JSON.parse(saved) : false;
    } catch {
      return false;
    }
  });
  const [rayPulsating, setRayPulsating] = useState<boolean>(true);

  // Calculate LightRays origin dynamically from cursor click position
  const getOriginFromCursorPosition = (clientX: number, clientY: number): RaysOrigin => {
    const normX = clientX / window.innerWidth;
    const normY = clientY / window.innerHeight;

    // Upper hemisphere clicks
    if (normY < 0.5) {
      if (normX < 0.35) return 'top-left';
      if (normX > 0.65) return 'top-right';
      return 'top-center';
    }
    // Lower hemisphere clicks
    if (normX < 0.35) return 'bottom-left';
    if (normX > 0.65) return 'bottom-right';
    return 'bottom-center';
  };

  // Flare setting handlers
  const handleToggleFlareLock = (locked: boolean) => {
    setIsFlareLocked(locked);
    try {
      localStorage.setItem('studyvault_flare_locked', JSON.stringify(locked));
    } catch {}
    triggerToast(
      locked
        ? 'Background flare locked: frozen at latest position & color'
        : 'Background flare unlocked: dynamic corner and color shifting enabled'
    );
  };

  const handleChangeRayColor = (color: string) => {
    setRayColor(color);
    try {
      localStorage.setItem('studyvault_flare_color', color);
    } catch {}
  };

  const handleChangeRayOrigin = (origin: RaysOrigin) => {
    setRayOrigin(origin);
    try {
      localStorage.setItem('studyvault_flare_origin', origin);
    } catch {}
  };

  const handleResetFlare = () => {
    setRayColor(ASH_GREY_COLOR);
    setRayOrigin(DEFAULT_RAY_ORIGIN);
    try {
      localStorage.setItem('studyvault_flare_color', ASH_GREY_COLOR);
      localStorage.setItem('studyvault_flare_origin', DEFAULT_RAY_ORIGIN);
    } catch {}
    triggerToast('Flare reset to default Ash Grey (Top Center)');
  };

  // Cursor click interaction: shifts LightRays origin based on click position and cycles neon hue
  // When locked, stops switching corners and freezes color changing
  useEffect(() => {
    const handleCursorClick = (e: MouseEvent) => {
      // When flare is locked, stop switching corners and freeze color changes
      if (isFlareLocked) {
        return;
      }

      const target = e.target as HTMLElement | null;
      if (target?.closest('input, textarea, select, button, [role="button"], [role="menuitem"], a, label')) {
        return;
      }

      // Dynamic origin shifting according to cursor click coordinates
      const dynamicOrigin = getOriginFromCursorPosition(e.clientX, e.clientY);
      setRayOrigin(dynamicOrigin);
      try {
        localStorage.setItem('studyvault_flare_origin', dynamicOrigin);
      } catch {}

      // Holographic neon color shifting
      setRayColor(prev => {
        const pool = HOLOGRAPHIC_NEON_COLORS.filter(
          c => c.toLowerCase() !== prev.toLowerCase()
        );
        const nextColor = pool[Math.floor(Math.random() * pool.length)];
        try {
          localStorage.setItem('studyvault_flare_color', nextColor);
        } catch {}
        return nextColor;
      });
    };

    window.addEventListener('click', handleCursorClick);
    return () => window.removeEventListener('click', handleCursorClick);
  }, [isFlareLocked]);

  // Notes data state
  const [notes, setNotes] = useState<StudyNote[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Filters state
  const [filters, setFilters] = useState<FilterState>({
    searchQuery: '',
    materialType: 'all',
    subject: 'all',
    courseCode: 'all',
    academicYear: 'all',
    sortBy: 'latest'
  });

  // Temporary toast feedback
  const triggerToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // Safe data loader
  useEffect(() => {
    async function loadData() {
      setIsLoading(true);
      const supabase = getSupabaseInstance(supabaseConfig);
      const result = await fetchAllNotes(supabase);
      setNotes(result.notes);
      setIsLoading(false);
    }
    loadData();

    // Setup Supabase Realtime only if valid client exists
    const supabase = getSupabaseInstance(supabaseConfig);
    if (supabase && supabaseConfig.isConnected && isValidHttpUrl(supabaseConfig.url)) {
      try {
        const channel = supabase
          .channel('studyvault_public_notes')
          .on(
            'postgres_changes',
            { event: '*', schema: 'public', table: 'study_notes' },
            () => {
              loadData();
            }
          )
          .subscribe();

        // Check active Supabase auth session
        supabase.auth.getSession().then(({ data: { session }, error }) => {
          if (!error && session?.user) {
            const u: StudentUser = {
              id: session.user.id,
              email: session.user.email || '',
              name: session.user.user_metadata?.full_name || session.user.email?.split('@')[0] || 'Student Contributor',
              university: session.user.user_metadata?.university || 'Campus University',
              isGuest: false
            };
            setUser(u);
            localStorage.setItem('studyvault_active_user', JSON.stringify(u));
          }
        }).catch(() => {});

        // Listen for live Supabase Auth state transitions
        const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
          if (session?.user) {
            const u: StudentUser = {
              id: session.user.id,
              email: session.user.email || '',
              name: session.user.user_metadata?.full_name || session.user.email?.split('@')[0] || 'Student Contributor',
              university: session.user.user_metadata?.university || 'Campus University',
              isGuest: false
            };
            setUser(u);
            localStorage.setItem('studyvault_active_user', JSON.stringify(u));
          } else if (event === 'SIGNED_OUT') {
            setUser(null);
            localStorage.removeItem('studyvault_active_user');
          }
        });

        return () => {
          supabase.removeChannel(channel);
          authListener?.subscription?.unsubscribe();
        };
      } catch {
        // Ignore realtime subscription connection failures gracefully
      }
    }
  }, [supabaseConfig.isConnected, supabaseConfig.url, supabaseConfig.anonKey]);

  // Extract distinct course codes for quick navigation
  const availableCourses = useMemo(() => {
    const set = new Set<string>();
    notes.forEach(n => {
      if (n.courseCode) set.add(n.courseCode);
    });
    return Array.from(set).sort();
  }, [notes]);

  // Extract distinct academic years dynamically
  const availableYears = useMemo(() => {
    const set = new Set<string>();
    notes.forEach(n => {
      if (n.academicYear) set.add(String(n.academicYear));
    });
    return Array.from(set).sort().reverse();
  }, [notes]);

  // Extract distinct subjects dynamically
  const availableSubjects = useMemo(() => {
    const set = new Set<string>();
    notes.forEach(n => {
      if (n.subject) set.add(n.subject);
    });
    return ['All Subjects', ...Array.from(set).sort()];
  }, [notes]);

  // Filtered & Sorted notes
  const filteredNotes = useMemo(() => {
    const q = filters.searchQuery.trim().toLowerCase();

    return notes
      .filter(note => {
        if (q) {
          const matchTitle = note.title.toLowerCase().includes(q);
          const matchCode = note.courseCode.toLowerCase().includes(q);
          const matchSubj = note.subject.toLowerCase().includes(q);
          const matchProf = note.professor.toLowerCase().includes(q);
          const matchDesc = note.description.toLowerCase().includes(q);
          const matchTags = note.tags.some(t => t.toLowerCase().includes(q));
          if (!matchTitle && !matchCode && !matchSubj && !matchProf && !matchDesc && !matchTags) {
            return false;
          }
        }

        if (filters.materialType !== 'all' && note.materialType !== filters.materialType) {
          return false;
        }

        if (filters.subject !== 'all' && note.subject !== filters.subject) {
          return false;
        }

        if (filters.courseCode !== 'all' && note.courseCode !== filters.courseCode) {
          return false;
        }

        if (filters.academicYear !== 'all' && String(note.academicYear) !== filters.academicYear) {
          return false;
        }

        return true;
      })
      .sort((a, b) => {
        if (filters.sortBy === 'popular') {
          return b.downloadsCount - a.downloadsCount;
        }
        if (filters.sortBy === 'pages') {
          return b.pageCount - a.pageCount;
        }
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      });
  }, [notes, filters]);

  // Document Handlers
  const handlePreviewNote = (note: StudyNote) => {
    setPreviewNote(note);
  };

  const handleDownloadNote = (note: StudyNote) => {
    incrementDownloadCountLocal(note.id);
    setNotes(prev =>
      prev.map(n => (n.id === note.id ? { ...n, downloadsCount: n.downloadsCount + 1 } : n))
    );

    const content = `%PDF-1.4
% StudyHub Academic Export
Course: ${note.courseCode} — ${note.courseName}
Title: ${note.title}
Professor: ${note.professor}
Academic Year: ${note.academicYear} ${note.semester}
Uploader: ${note.uploaderName} (${note.uploaderUniversity})
Downloaded from: StudyHub Interactive Open Platform

Summary & Key Takeaways:
${note.description}

Section 1 Details:
${note.pages[0]?.content || 'Notes content.'}

Formulas & Key Derivation Points:
${(note.pages[0]?.keyFormulasOrPoints || []).join('\n')}
`;

    const blob = new Blob([content], { type: 'application/pdf' });
    const downloadUrl = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = downloadUrl;
    link.download = note.fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(downloadUrl);

    triggerToast(`Downloaded "${note.fileName}"`);
  };

  const handleUpvoteNote = (noteId: string) => {
    const { upvoted, count } = toggleUpvoteLocal(noteId);
    setNotes(prev =>
      prev.map(n =>
        n.id === noteId ? { ...n, upvotesCount: count, hasUpvoted: upvoted } : n
      )
    );

    if (previewNote && previewNote.id === noteId) {
      setPreviewNote(prev =>
        prev ? { ...prev, upvotesCount: count, hasUpvoted: upvoted } : null
      );
    }

    triggerToast(upvoted ? 'Upvoted study resource!' : 'Removed upvote');
  };

  const handleUploadSuccess = (newNote: StudyNote) => {
    setNotes(prev => [newNote, ...prev]);
    setCurrentTab('browse');
    setPreviewNote(newNote);
    triggerToast(`"${newNote.title}" published to library!`);
  };

  const handleOpenMyUniversity = () => {
    if (user?.university) {
      const match = findUniversityByNameOrFuzzy(user.university);
      if (match) {
        setSelectedUniversityId(match.id);
      }
      setUniversitySubTab('overview');
      setCurrentTab('university');
    } else {
      setIsUniversitySetupOpen(true);
    }
  };

  const handleOpenExplore = () => {
    setCurrentTab('explore');
  };

  const handleSelectUniversity = (uniId: string) => {
    setSelectedUniversityId(uniId);
    setUniversitySubTab('overview');
    setCurrentTab('university');
  };

  const handleSaveUserUniversity = (universityName: string, universityId?: string) => {
    const updatedUser: StudentUser = {
      ...(user || {
        id: `student-${Date.now()}`,
        email: 'student@campus.edu',
        name: 'Student Scholar',
        isGuest: true
      }),
      university: universityName,
      universityId: universityId
    };
    setUser(updatedUser);
    try {
      localStorage.setItem('studyvault_active_user', JSON.stringify(updatedUser));
    } catch {}
    triggerToast(`Primary campus set to ${universityName}`);
    if (universityId) {
      setSelectedUniversityId(universityId);
      setUniversitySubTab('overview');
      setCurrentTab('university');
    }
  };

  const handleOpenUploadWithPrefill = (prefillUni?: string, prefillCourse?: string) => {
    setUploadPrefill({ university: prefillUni, courseCode: prefillCourse });
    setCurrentTab('upload');
  };

  const handleSignOut = async () => {
    try {
      const supabase = getSupabaseInstance(supabaseConfig);
      if (supabase && supabaseConfig.isConnected) {
        await supabase.auth.signOut();
      }
    } catch {
      // Ignore network errors on logout
    }
    localStorage.removeItem('studyvault_active_user');
    setUser(null);
    triggerToast('Signed out of student session');
  };

  return (
    <div className="min-h-screen bg-[#050505] text-white flex flex-col font-outfit relative overflow-x-hidden selection:bg-white selection:text-black">
      {/* WebGL Light Rays Atmospheric Background Effect - Intense Holographic Atmosphere */}
      <LightRays
        raysOrigin={rayOrigin}
        raysColor={rayColor}
        raysSpeed={1.2}
        lightSpread={1.3}
        rayLength={2.6}
        pulsating={rayPulsating}
        followMouse={true}
        mouseInfluence={0.18}
        noiseAmount={0.10}
        distortion={0.16}
      />

      {/* Toast Notification Banner */}
      {toastMessage && (
        <div className="fixed bottom-20 sm:bottom-6 right-4 sm:right-6 left-4 sm:left-auto z-50 bg-black/90 text-white px-5 py-3 rounded-2xl text-xs font-medium shadow-2xl border border-white/20 flex items-center justify-center sm:justify-start gap-2.5 backdrop-blur-md animate-in slide-in-from-bottom-3 duration-200">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span className="truncate">{toastMessage}</span>
        </div>
      )}

      {/* Top Floating Glass Navigation */}
      <Navbar
        currentTab={currentTab}
        setCurrentTab={tab => {
          if (tab === 'university') {
            handleOpenMyUniversity();
          } else if (tab === 'explore') {
            handleOpenExplore();
          } else {
            setCurrentTab(tab);
          }
        }}
        supabaseConfig={supabaseConfig}
        onOpenSupabaseModal={() => setIsSupabaseModalOpen(true)}
        user={user}
        onOpenAuthModal={(mode = 'signup') => {
          setAuthModalMode(mode);
          setIsAuthModalOpen(true);
        }}
        onOpenCodeDrawer={() => setIsCodeExportOpen(true)}
        onSignOut={handleSignOut}
      />

      {/* Floating Vertical Taskbar on Left Side (Detached from edge, floats like top taskbar; hidden on overview/landing page) */}
      {currentTab !== 'landing' && (
        <VerticalTaskbar
          currentTab={currentTab}
          setCurrentTab={setCurrentTab}
          filters={filters}
          setFilters={setFilters}
          user={user}
          onOpenMyUniversity={handleOpenMyUniversity}
          onOpenExplore={handleOpenExplore}
          onOpenAuthModal={(mode = 'signup') => {
            setAuthModalMode(mode);
            setIsAuthModalOpen(true);
          }}
          onOpenCodeDrawer={() => setIsCodeExportOpen(true)}
        />
      )}

      {/* Primary View Routing */}
      {currentTab === 'landing' && (
        <div className="relative z-10 flex-1 flex flex-col justify-center pb-20 md:pb-0">
          <LandingHero
            onBrowseMaterials={() => setCurrentTab('browse')}
            onUploadNotes={() => setCurrentTab('upload')}
            onWatchDemo={() => setIsDemoModalOpen(true)}
          />
        </div>
      )}

      {currentTab === 'explore' && (
        <main className="relative z-10 flex-1 pb-24 md:pb-8">
          <ExploreUniversitiesView
            user={user}
            notes={notes}
            onSelectUniversity={handleSelectUniversity}
            onOpenSetupModal={() => setIsUniversitySetupOpen(true)}
          />
        </main>
      )}

      {currentTab === 'university' && (
        <main className="relative z-10 flex-1 pb-24 md:pb-8">
          <UniversityDirectoryView
            universityId={selectedUniversityId}
            user={user}
            notes={notes}
            activeTab={universitySubTab}
            onTabChange={setUniversitySubTab}
            onBackToExplore={() => setCurrentTab('explore')}
            onPreviewNote={handlePreviewNote}
            onDownloadNote={handleDownloadNote}
            onUpvoteNote={handleUpvoteNote}
            onOpenUpload={handleOpenUploadWithPrefill}
            onOpenSetupModal={() => setIsUniversitySetupOpen(true)}
          />
        </main>
      )}

      {currentTab === 'browse' && (
        <main className="relative z-10 flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 pl-14 sm:pl-20 md:pl-24 lg:px-8 py-6 sm:py-8 pb-24 md:pb-8">
          <SearchHeader
            filters={filters}
            setFilters={setFilters}
            totalCount={filteredNotes.length}
            availableCourses={availableCourses}
            availableYears={availableYears}
            availableSubjects={availableSubjects}
            user={user}
          />

          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3, 4, 5, 6].map(i => (
                <div
                  key={i}
                  className="h-64 glass-card animate-pulse p-6"
                />
              ))}
            </div>
          ) : filteredNotes.length === 0 ? (
            <div className="text-center py-20 px-6 glass-card max-w-xl mx-auto shadow-2xl">
              <div className="p-4 bg-white/5 rounded-full w-14 h-14 flex items-center justify-center mx-auto mb-4 text-white/50">
                <Search className="w-7 h-7" />
              </div>
              <h3 className="text-lg font-bold text-white mb-2">
                No study materials found
              </h3>
              <p className="text-xs text-white/60 mb-6 leading-relaxed">
                Try clearing your search query or subject filters to explore all available documents.
              </p>
              <div className="flex items-center justify-center gap-3">
                <button
                  onClick={() =>
                    setFilters({
                      searchQuery: '',
                      materialType: 'all',
                      subject: 'all',
                      courseCode: 'all',
                      academicYear: 'all',
                      sortBy: 'latest'
                    })
                  }
                  className="px-5 py-2.5 text-xs font-bold text-white/80 bg-white/10 hover:bg-white/20 rounded-full transition-colors cursor-pointer"
                >
                  Clear Filters
                </button>
                <button
                  onClick={() => setCurrentTab('upload')}
                  className="px-5 py-2.5 text-xs font-black uppercase text-black bg-white hover:bg-white/90 rounded-full transition-colors cursor-pointer"
                >
                  Upload First Note
                </button>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredNotes.map(note => (
                <NoteCard
                  key={note.id}
                  note={note}
                  onPreview={handlePreviewNote}
                  onDownload={handleDownloadNote}
                  onUpvote={handleUpvoteNote}
                />
              ))}
            </div>
          )}
        </main>
      )}

      {currentTab === 'upload' && (
        <main className="relative z-10 flex-1 px-4 sm:px-6 pl-14 sm:pl-20 md:pl-24 lg:px-8 pb-24 md:pb-8">
          <UploadView
            onBack={() => setCurrentTab('browse')}
            onSuccess={handleUploadSuccess}
            supabaseConfig={supabaseConfig}
            user={user}
            onOpenSupabaseModal={() => setIsSupabaseModalOpen(true)}
            initialUniversity={uploadPrefill.university}
            initialCourseCode={uploadPrefill.courseCode}
          />
        </main>
      )}

      {/* StudyHub Universal Footer */}
      <Footer
        onOpenLibrary={() => setCurrentTab('browse')}
        onOpenUpload={() => setCurrentTab('upload')}
        onOpenCodeDrawer={() => setIsCodeExportOpen(true)}
        onOpenSupabaseModal={() => setIsSupabaseModalOpen(true)}
      />

      {/* Interactive Modals */}
      <PDFPreviewModal
        note={previewNote}
        onClose={() => setPreviewNote(null)}
        onDownload={handleDownloadNote}
        onUpvote={handleUpvoteNote}
      />

      <DemoModal
        isOpen={isDemoModalOpen}
        onClose={() => setIsDemoModalOpen(false)}
        onLaunchLibrary={() => {
          setIsDemoModalOpen(false);
          setCurrentTab('browse');
        }}
        onLaunchUpload={() => {
          setIsDemoModalOpen(false);
          setCurrentTab('upload');
        }}
      />

      <SupabaseModal
        isOpen={isSupabaseModalOpen}
        onClose={() => setIsSupabaseModalOpen(false)}
        config={supabaseConfig}
        onConfigChange={cfg => setSupabaseConfig(cfg)}
        onOpenCodeDrawer={() => setIsCodeExportOpen(true)}
      />

      <CodeExportModal
        isOpen={isCodeExportOpen}
        onClose={() => setIsCodeExportOpen(false)}
      />

      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        user={user}
        onUserChange={u => setUser(u)}
        supabaseConfig={supabaseConfig}
        initialMode={authModalMode}
        isFlareLocked={isFlareLocked}
        onToggleFlareLock={handleToggleFlareLock}
        rayColor={rayColor}
        onChangeRayColor={handleChangeRayColor}
        rayOrigin={rayOrigin}
        onChangeRayOrigin={handleChangeRayOrigin}
        onResetFlare={handleResetFlare}
      />

      {/* University Setup Modal (Prompt & Search for unassigned / changing primary campus) */}
      <UniversitySetupModal
        isOpen={isUniversitySetupOpen}
        onClose={() => setIsUniversitySetupOpen(false)}
        user={user}
        onSaveUniversity={handleSaveUserUniversity}
      />
    </div>
  );
}
