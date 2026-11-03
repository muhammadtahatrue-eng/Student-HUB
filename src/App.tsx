import React, { useState, useEffect, useMemo, useRef } from 'react';
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
import { AuthModal, AuthModalMode } from './components/AuthModal.tsx';
import { UserSettingsModal, UserSettingsTab } from './components/UserSettingsModal.tsx';
import { AuthPages, AuthPageMode } from './components/AuthPages.tsx';
import { VerificationBanner } from './components/VerificationBanner.tsx';
import { ProfilePages, ProfileManagementSection } from './components/ProfilePages.tsx';
import {
  fetchAuthenticatedUserProfile,
  loadUserAppearanceFromLocal,
  saveUserAppearanceToLocal,
  saveRegisteredUserAppearanceSettings,
  DEFAULT_USER_SETTINGS
} from './lib/profileService.ts';
import { DemoModal } from './components/DemoModal.tsx';
import { Footer } from './components/Footer.tsx';
import { VerticalTaskbar } from './components/VerticalTaskbar.tsx';
import { ExploreUniversitiesView } from './components/university/ExploreUniversitiesView.tsx';
import { UniversityDirectoryView, UniversityTabKey } from './components/university/UniversityDirectoryView.tsx';
import { UniversitySetupModal } from './components/university/UniversitySetupModal.tsx';
import { findUniversityByNameOrFuzzy } from './lib/universityStore.ts';
import { AcademicProgram, MaterialType } from './types/index.ts';
import { ExploreProgramsView } from './components/program/ExploreProgramsView.tsx';
import { ProgramDirectoryView, ProgramTabKey } from './components/program/ProgramDirectoryView.tsx';
import { ProgramSetupModal } from './components/program/ProgramSetupModal.tsx';
import { ensureSystemProgramForRegisteredStudent } from './lib/programStore.ts';
import {
  noteBelongsToProgram,
  updateSharedResource,
  deleteSharedResource,
  getAvailableProgramsForFilter,
  getNoteCourseCategory,
  getNoteCourseDisplay,
  deriveCourseCategoryFromUploaderProgram,
  canUserDeleteNote
} from './lib/resourceService.ts';
import { MATERIAL_TYPE_LABELS, SUBJECT_OPTIONS } from './data/seedData.ts';
import { resolveViewablePdfForNote } from './lib/pdfViewerService.ts';
import { PublicForumView } from './components/forum/PublicForumView.tsx';
import { InfoCenterView } from './components/InfoCenterView.tsx';
import { InfoCenterSectionId } from './data/legalAndInfoData.ts';
import { ProductsView } from './components/ProductsView.tsx';

const DEFAULT_FLARE_COLOR = '#9ca3af'; // Ash Grey default
const DEFAULT_RAY_ORIGIN: RaysOrigin = 'top-center';
const DEFAULT_FLARE_BRIGHTNESS = 0.5; // 50% default intensity

const HOLOGRAPHIC_NEON_COLORS = [
  '#9ca3af', // Ash Grey (Default)
  'rgb',     // RGB Spectrum
  '#00f0ff', // Cyber Cyan
  '#ffffff', // Pure White
  '#10b981', // Aurora Emerald
  '#b388ff', // Ultraviolet Hologram
  '#f59e0b', // Solar Amber
  '#ff007f', // Neon Magenta
  '#00ffff', // Electric Aqua
  '#ff3366', // Neon Crimson
  '#39ff14', // Matrix Green
  '#d946ef', // Cyber Fuchsia
];

export type AppTab =
  | 'landing'
  | 'browse'
  | 'upload'
  | 'explore'
  | 'program'
  | 'university'
  | 'forum'
  | 'about'
  | 'products'
  | 'login'
  | 'signup'
  | 'forgot-password'
  | 'reset-password'
  | 'profile-setup'
  | 'profile-management';

export default function App() {
  // Navigation including dedicated authentication and profile setup/management pages
  const [currentTab, setCurrentTab] = useState<AppTab>(() => {
    if (typeof window !== 'undefined') {
      const hash = window.location.hash.replace(/^#/, '');
      const pathname = window.location.pathname.replace(/\/+$/, '');
      if (hash.includes('type=recovery') || hash === 'reset-password') return 'reset-password';
      if (hash === 'login') return 'login';
      if (hash === 'signup') return 'signup';
      if (hash === 'profile-setup') return 'profile-setup';
      if (hash === 'profile') return 'profile-management';
      if (hash === 'products' || pathname === '/products') return 'products';
      if (
        hash === 'about' ||
        hash === 'faq' ||
        hash === 'terms' ||
        hash === 'copyright' ||
        hash === 'contact' ||
        pathname === '/about'
      ) {
        return 'about';
      }
      if (hash === 'forum' || hash.startsWith('forum/post/')) return 'forum';
    }
    return 'landing';
  });
  const [infoCenterSection, setInfoCenterSection] = useState<InfoCenterSectionId>(() => {
    if (typeof window !== 'undefined') {
      const hash = window.location.hash.replace(/^#/, '');
      if (hash === 'faq' || hash === 'terms' || hash === 'copyright' || hash === 'contact') {
        return hash;
      }
    }
    return 'about';
  });
  const [initialForumPostId, setInitialForumPostId] = useState<string | null>(() => {
    if (typeof window !== 'undefined') {
      const hash = window.location.hash.replace(/^#/, '');
      if (hash.startsWith('forum/post/')) {
        return hash.replace('forum/post/', '').trim() || null;
      }
    }
    return null;
  });
  const [postLoginDestination, setPostLoginDestination] = useState<AppTab>('landing');
  const [profileSection, setProfileSection] = useState<ProfileManagementSection>('profile');

  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash.replace(/^#/, '');
      if (hash === 'forum') {
        setCurrentTab('forum');
      } else if (hash.startsWith('forum/post/')) {
        const postId = hash.replace('forum/post/', '').trim();
        if (postId) {
          setInitialForumPostId(postId);
          setCurrentTab('forum');
        }
      } else if (hash === 'products') {
        setCurrentTab('products');
      } else if (
        hash === 'about' ||
        hash === 'faq' ||
        hash === 'terms' ||
        hash === 'copyright' ||
        hash === 'contact'
      ) {
        setInfoCenterSection(hash as InfoCenterSectionId);
        setCurrentTab('about');
      }
    };
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  // Active program directory state
  const [selectedProgramId, setSelectedProgramId] = useState<string>(() => {
    try {
      const savedUser = localStorage.getItem('studyvault_active_user');
      if (savedUser) {
        const parsed = JSON.parse(savedUser);
        if (parsed.programId) return parsed.programId;
      }
    } catch {}
    return 'bs-cs';
  });
  const [programSubTab, setProgramSubTab] = useState<ProgramTabKey>('overview');
  const [isProgramSetupOpen, setIsProgramSetupOpen] = useState(false);

  // Active university directory state (kept for backward-compatibility)
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
  const [uploadPrefill, setUploadPrefill] = useState<{
    university?: string;
    courseCode?: string;
    programId?: string;
    semesterNumber?: number;
  }>({});
  const [editingNote, setEditingNote] = useState<StudyNote | null>(null);

  // Supabase & Authenticated User state
  const [supabaseConfig, setSupabaseConfig] = useState<SupabaseConfig>(getSavedSupabaseConfig());
  const [user, setUser] = useState<StudentUser | null>(() => {
    try {
      const saved = localStorage.getItem('studyvault_active_user');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (
          parsed &&
          parsed.id &&
          parsed.id !== 'student-local' &&
          !parsed.isGuest &&
          parsed.emailConfirmed === true
        ) {
          if (parsed.programId || parsed.program || parsed.majorOrField) {
            const sysProg = ensureSystemProgramForRegisteredStudent({
              studentId: parsed.id,
              programId: parsed.programId,
              programName: parsed.program || parsed.majorOrField,
              degreeTier: parsed.degreeTier
            });
            if (sysProg) {
              parsed.programId = sysProg.id;
              parsed.program = sysProg.name;
            }
          }
          return parsed;
        }
      }
    } catch {}
    return null;
  });

  // Email verification & auth callback state
  const [isAuthInitializing, setIsAuthInitializing] = useState<boolean>(() => {
    const cfg = getSavedSupabaseConfig();
    if (cfg.isConnected && isValidHttpUrl(cfg.url)) return true;
    if (typeof window !== 'undefined') {
      const rawUrl = `${window.location.search}${window.location.hash}`;
      if (
        rawUrl.includes('access_token=') ||
        rawUrl.includes('code=') ||
        rawUrl.includes('token_hash=') ||
        rawUrl.includes('error=') ||
        rawUrl.includes('error_code=')
      ) {
        return true;
      }
    }
    return false;
  });
  const [pendingVerificationEmail, setPendingVerificationEmail] = useState<string | null>(null);
  const [authCallbackBanner, setAuthCallbackBanner] = useState<AuthCallbackBanner | null>(null);
  const processedAuthCallbackRef = useRef<string | null>(null);

  // Modal visibility
  const [isSupabaseModalOpen, setIsSupabaseModalOpen] = useState(false);
  const [isCodeExportOpen, setIsCodeExportOpen] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authModalMode, setAuthModalMode] = useState<AuthModalMode>('signin');
  const [isUserSettingsOpen, setIsUserSettingsOpen] = useState(false);
  const [userSettingsTab, setUserSettingsTab] = useState<UserSettingsTab>('profile');
  const [isDemoModalOpen, setIsDemoModalOpen] = useState(false);
  const [previewNote, setPreviewNote] = useState<StudyNote | null>(null);

  // LightRays atmospheric background effect state
  // Default is Ash Grey color (#9ca3af), Top-Center position ('top-center'), Locked (true), and 50% (0.5) on slider.
  // For registered users, their personalized background settings are saved and restored from their profile.
  const [rayColor, setRayColor] = useState<string>(() => {
    if (user && !user.isGuest && (user.emailConfirmed || user.emailConfirmedAt)) {
      const localApp = loadUserAppearanceFromLocal(user.id);
      return user.settings?.rayColor || localApp?.rayColor || DEFAULT_FLARE_COLOR;
    }
    return DEFAULT_FLARE_COLOR;
  });
  const [rayOrigin, setRayOrigin] = useState<RaysOrigin>(() => {
    if (user && !user.isGuest && (user.emailConfirmed || user.emailConfirmedAt)) {
      const localApp = loadUserAppearanceFromLocal(user.id);
      return (
        (user.settings?.rayOrigin as RaysOrigin) ||
        (localApp?.rayOrigin as RaysOrigin) ||
        DEFAULT_RAY_ORIGIN
      );
    }
    return DEFAULT_RAY_ORIGIN;
  });
  const [isFlareLocked, setIsFlareLocked] = useState<boolean>(() => {
    if (user && !user.isGuest && (user.emailConfirmed || user.emailConfirmedAt)) {
      const localApp = loadUserAppearanceFromLocal(user.id);
      if (typeof user.settings?.flareLocked === 'boolean') return user.settings.flareLocked;
      if (typeof localApp?.flareLocked === 'boolean') return localApp.flareLocked;
    }
    return true;
  });
  const [rayPulsating, setRayPulsating] = useState<boolean>(true);
  const [rayBrightness, setRayBrightness] = useState<number>(() => {
    if (user && !user.isGuest && (user.emailConfirmed || user.emailConfirmedAt)) {
      const localApp = loadUserAppearanceFromLocal(user.id);
      const savedBrightness =
        typeof user.settings?.rayBrightness === 'number'
          ? user.settings.rayBrightness
          : localApp?.rayBrightness;
      if (
        typeof savedBrightness === 'number' &&
        !Number.isNaN(savedBrightness) &&
        savedBrightness >= 0.05 &&
        savedBrightness <= 1.0
      ) {
        return savedBrightness;
      }
    }
    return DEFAULT_FLARE_BRIGHTNESS;
  });
  const [homeScrollBlur, setHomeScrollBlur] = useState<number>(0);
  const flareSaveTimeoutRef = useRef<number | null>(null);
  const hydratedFlareUserIdRef = useRef<string | null>(
    user && !user.isGuest && (user.emailConfirmed || user.emailConfirmedAt) ? user.id : null
  );

  // Hydrate registered user's saved background settings on login/session restore,
  // or revert to default (Locked, Top-Center, Ash Grey, 50%) when signed out
  useEffect(() => {
    const isVerifiedUser = Boolean(
      user && !user.isGuest && (user.emailConfirmed || user.emailConfirmedAt)
    );

    if (isVerifiedUser && user) {
      if (hydratedFlareUserIdRef.current !== user.id) {
        hydratedFlareUserIdRef.current = user.id;
        const localApp = loadUserAppearanceFromLocal(user.id);
        const resolvedLocked =
          typeof user.settings?.flareLocked === 'boolean'
            ? user.settings.flareLocked
            : typeof localApp?.flareLocked === 'boolean'
            ? localApp.flareLocked
            : true;
        const resolvedColor =
          user.settings?.rayColor || localApp?.rayColor || DEFAULT_FLARE_COLOR;
        const resolvedOrigin =
          (user.settings?.rayOrigin as RaysOrigin) ||
          (localApp?.rayOrigin as RaysOrigin) ||
          DEFAULT_RAY_ORIGIN;
        const rawBrightness =
          typeof user.settings?.rayBrightness === 'number'
            ? user.settings.rayBrightness
            : localApp?.rayBrightness;
        const resolvedBrightness =
          typeof rawBrightness === 'number' &&
          !Number.isNaN(rawBrightness) &&
          rawBrightness >= 0.05 &&
          rawBrightness <= 1.0
            ? rawBrightness
            : DEFAULT_FLARE_BRIGHTNESS;

        setIsFlareLocked(resolvedLocked);
        setRayColor(resolvedColor);
        setRayOrigin(resolvedOrigin);
        setRayBrightness(resolvedBrightness);
      }
    } else if (hydratedFlareUserIdRef.current !== null) {
      hydratedFlareUserIdRef.current = null;
      setIsFlareLocked(true);
      setRayColor(DEFAULT_FLARE_COLOR);
      setRayOrigin(DEFAULT_RAY_ORIGIN);
      setRayBrightness(DEFAULT_FLARE_BRIGHTNESS);
    }
  }, [user?.id, user?.emailConfirmed, user?.emailConfirmedAt, user?.isGuest]);

  // Persist background settings for registered users (immediate local cache + debounced Supabase sync)
  const persistRegisteredUserFlareSettings = (
    overrides: Partial<{
      flareLocked: boolean;
      rayColor: string;
      rayOrigin: RaysOrigin;
      rayBrightness: number;
    }>
  ) => {
    const isVerifiedUser = Boolean(
      user && !user.isGuest && (user.emailConfirmed || user.emailConfirmedAt)
    );
    if (!isVerifiedUser || !user) return;

    const nextAppearance = {
      flareLocked: overrides.flareLocked ?? isFlareLocked,
      rayColor: overrides.rayColor ?? rayColor,
      rayOrigin: overrides.rayOrigin ?? rayOrigin,
      rayBrightness: overrides.rayBrightness ?? rayBrightness
    };

    // 1. Save immediately to per-user localStorage
    saveUserAppearanceToLocal(user.id, nextAppearance);

    // 2. Update active user state and studyvault_active_user cache
    setUser((prev) => {
      if (!prev || prev.id !== user.id) return prev;
      const updatedUser: StudentUser = {
        ...prev,
        settings: {
          ...DEFAULT_USER_SETTINGS,
          ...(prev.settings || {}),
          flareLocked: nextAppearance.flareLocked,
          rayColor: nextAppearance.rayColor,
          rayOrigin: nextAppearance.rayOrigin,
          rayBrightness: nextAppearance.rayBrightness
        }
      };
      try {
        localStorage.setItem('studyvault_active_user', JSON.stringify(updatedUser));
      } catch {}
      return updatedUser;
    });

    // 3. Debounced sync to Supabase (user_settings_preferences + auth.users metadata)
    if (flareSaveTimeoutRef.current !== null) {
      window.clearTimeout(flareSaveTimeoutRef.current);
    }
    const targetUserId = user.id;
    flareSaveTimeoutRef.current = window.setTimeout(() => {
      const supabase = supabaseConfig.isConnected ? getSupabaseInstance(supabaseConfig) : null;
      saveRegisteredUserAppearanceSettings(supabase, targetUserId, nextAppearance).catch(() => {});
      flareSaveTimeoutRef.current = null;
    }, 350);
  };

  // Scroll-driven blur effect on the Home (landing) page only:
  // Blurs the background flare as the user scrolls down so all content stays legible,
  // and smoothly restores to 0 (original sharp flare) when scrolling back up.
  useEffect(() => {
    if (currentTab !== 'landing') {
      setHomeScrollBlur(0);
      return;
    }

    let rafId: number | null = null;
    const updateScrollBlur = () => {
      const scrollY = Math.max(0, window.scrollY || document.documentElement.scrollTop || 0);
      // Smoothstep easing from 0px to 560px scroll depth for feather-soft start and stop
      const rawProgress = Math.min(1, scrollY / 560);
      const easedProgress = rawProgress * rawProgress * (3 - 2 * rawProgress);
      setHomeScrollBlur(Number((easedProgress * 28).toFixed(2)));
    };

    const handleScroll = () => {
      if (rafId !== null) return;
      rafId = window.requestAnimationFrame(() => {
        updateScrollBlur();
        rafId = null;
      });
    };

    updateScrollBlur();
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', handleScroll);
      if (rafId !== null) window.cancelAnimationFrame(rafId);
    };
  }, [currentTab]);

  // Calculate LightRays origin dynamically from cursor click position
  const getOriginFromCursorPosition = (clientX: number, clientY: number): RaysOrigin => {
    const normX = clientX / window.innerWidth;
    const normY = clientY / window.innerHeight;

    // Mid-screen side edge clicks
    if (normY >= 0.35 && normY <= 0.65) {
      if (normX < 0.25) return 'left';
      if (normX > 0.75) return 'right';
    }

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

  // Flare setting handlers (automatically saved for registered users)
  const handleToggleFlareLock = (locked: boolean) => {
    setIsFlareLocked(locked);
    persistRegisteredUserFlareSettings({ flareLocked: locked });
    triggerToast(
      locked
        ? 'Background flare locked: frozen at latest position & color'
        : 'Background flare unlocked: dynamic corner and color shifting enabled'
    );
  };

  const handleChangeRayColor = (color: string) => {
    setRayColor(color);
    persistRegisteredUserFlareSettings({ rayColor: color });
  };

  const handleChangeRayOrigin = (origin: RaysOrigin) => {
    setRayOrigin(origin);
    persistRegisteredUserFlareSettings({ rayOrigin: origin });
  };

  const handleChangeRayBrightness = (brightness: number) => {
    const clamped = Math.min(1.0, Math.max(0.05, Number(brightness.toFixed(2))));
    setRayBrightness(clamped);
    persistRegisteredUserFlareSettings({ rayBrightness: clamped });
  };

  const handleResetFlare = () => {
    setRayColor(DEFAULT_FLARE_COLOR);
    setRayOrigin(DEFAULT_RAY_ORIGIN);
    setIsFlareLocked(true);
    setRayBrightness(DEFAULT_FLARE_BRIGHTNESS);
    persistRegisteredUserFlareSettings({
      flareLocked: true,
      rayColor: DEFAULT_FLARE_COLOR,
      rayOrigin: DEFAULT_RAY_ORIGIN,
      rayBrightness: DEFAULT_FLARE_BRIGHTNESS
    });
    triggerToast('Flare reset to default Ash Grey (Top Center, Locked, 50% Intensity)');
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

      // Holographic neon color shifting
      const pool = HOLOGRAPHIC_NEON_COLORS.filter(
        c => c.toLowerCase() !== rayColor.toLowerCase()
      );
      const nextColor = pool[Math.floor(Math.random() * pool.length)];
      setRayColor(nextColor);

      persistRegisteredUserFlareSettings({
        rayOrigin: dynamicOrigin,
        rayColor: nextColor
      });
    };

    window.addEventListener('click', handleCursorClick);
    return () => window.removeEventListener('click', handleCursorClick);
  }, [isFlareLocked, rayColor, rayOrigin, rayBrightness, user]);

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
    programId: 'all',
    semesterNumber: 'all',
    sortBy: 'latest'
  });

  // Temporary toast feedback
  const triggerToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // Safe data loader & Supabase Auth / Email Verification Callback Handler
  useEffect(() => {
    async function loadData() {
      setIsLoading(true);
      const supabase = getSupabaseInstance(supabaseConfig);
      const result = await fetchAllNotes(supabase);
      setNotes(result.notes);
      setIsLoading(false);
    }
    loadData();

    const supabase = getSupabaseInstance(supabaseConfig);
    if (supabase && supabaseConfig.isConnected && isValidHttpUrl(supabaseConfig.url)) {
      let isMounted = true;

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

        const cleanUpAuthCallbackUrl = () => {
          if (typeof window !== 'undefined') {
            window.history.replaceState({}, document.title, window.location.pathname);
          }
        };

        const initializeAuthAndProcessCallback = async () => {
          if (typeof window === 'undefined') {
            if (isMounted) setIsAuthInitializing(false);
            return;
          }

          const rawSearch = window.location.search;
          const rawHash = window.location.hash;
          const callbackSignature = `${rawSearch}${rawHash}`;

          const searchParams = new URLSearchParams(rawSearch);
          // Handle potential double-# fragments gracefully if an old email link had #profile-setup#access_token=...
          const normalizedHash = rawHash.replace(/^#/, '').replace(/#/g, '&');
          const hashParams = new URLSearchParams(normalizedHash);

          const errorParam = searchParams.get('error') || hashParams.get('error');
          const errorCode = searchParams.get('error_code') || hashParams.get('error_code');
          const errorDescription =
            searchParams.get('error_description') || hashParams.get('error_description');

          const codeParam = searchParams.get('code');
          const tokenHashParam = searchParams.get('token_hash');
          const typeParam = searchParams.get('type') || hashParams.get('type');
          const hasImplicitToken =
            hashParams.has('access_token') || hashParams.has('refresh_token');

          const hasCallbackParams = Boolean(
            errorParam ||
              errorCode ||
              errorDescription ||
              codeParam ||
              tokenHashParam ||
              hasImplicitToken
          );

          // 1. Handle explicit callback errors (e.g. expired or invalid email confirmation link)
          if (errorParam || errorCode || errorDescription) {
            if (processedAuthCallbackRef.current !== callbackSignature) {
              processedAuthCallbackRef.current = callbackSignature;
              cleanUpAuthCallbackUrl();

              const decodedDesc = (errorDescription || errorParam || '')
                .replace(/\+/g, ' ')
                .trim();
              const lowerDesc = decodedDesc.toLowerCase();
              const friendlyError =
                errorCode === 'otp_expired' ||
                lowerDesc.includes('expired') ||
                lowerDesc.includes('invalid')
                  ? 'This email verification link has expired or has already been used. Please log in if your account is already verified, or enter your email to request a new confirmation link.'
                  : decodedDesc || 'Email verification could not be completed. Please try again.';

              if (isMounted) {
                setAuthCallbackBanner({ type: 'error', text: friendlyError });
                setCurrentTab('login');
              }
            }
          }

          // 2. Process PKCE code or explicit token_hash callback once
          let callbackError: string | null = null;
          const isNewCallbackToProcess =
            hasCallbackParams && processedAuthCallbackRef.current !== callbackSignature;

          if (isNewCallbackToProcess) {
            processedAuthCallbackRef.current = callbackSignature;

            if (codeParam) {
              const { error: exchangeErr } = await supabase.auth.exchangeCodeForSession(codeParam);
              if (exchangeErr) {
                callbackError = exchangeErr.message;
              }
            } else if (tokenHashParam && typeParam) {
              const { error: otpErr } = await supabase.auth.verifyOtp({
                token_hash: tokenHashParam,
                type: typeParam as any
              });
              if (otpErr) {
                callbackError = otpErr.message;
              }
            } else if (hasImplicitToken && rawHash.indexOf('#', 1) !== -1) {
              // Recovery for legacy links with double hash (#profile-setup#access_token=...)
              const accessToken = hashParams.get('access_token');
              const refreshToken = hashParams.get('refresh_token');
              if (accessToken && refreshToken) {
                const { error: setSessionErr } = await supabase.auth.setSession({
                  access_token: accessToken,
                  refresh_token: refreshToken
                });
                if (setSessionErr) {
                  callbackError = setSessionErr.message;
                }
              }
            }
          }

          // 3. Retrieve current session and explicitly verify updated email_confirmed_at flag
          const {
            data: { session },
            error: sessionError
          } = await supabase.auth.getSession();

          let sessionUser = session?.user ?? null;

          // If a verification callback just occurred or email_confirmed_at is not yet reflected on cached session,
          // fetch the fresh user object from Supabase Auth to check the updated email_confirmed_at flag
          if (sessionUser && (!sessionUser.email_confirmed_at || hasCallbackParams)) {
            const { data: freshUserData } = await supabase.auth.getUser();
            if (freshUserData?.user) {
              sessionUser = freshUserData.user;
            }
          }

          if (hasCallbackParams) {
            cleanUpAuthCallbackUrl();
          }

          if (!isMounted) return;

          if (callbackError && !sessionUser) {
            setAuthCallbackBanner({
              type: 'error',
              text:
                callbackError.toLowerCase().includes('expired') ||
                callbackError.toLowerCase().includes('invalid')
                  ? 'This email confirmation link has expired or is invalid. Please request a new confirmation email.'
                  : callbackError
            });
            setCurrentTab('login');
            setIsAuthInitializing(false);
            return;
          }

          if (typeParam === 'recovery' && sessionUser) {
            setCurrentTab('reset-password');
            setIsAuthInitializing(false);
            return;
          }

          if (!sessionError && sessionUser) {
            const isVerified = Boolean(sessionUser.email_confirmed_at);

            if (!isVerified) {
              // User is still unverified
              setPendingVerificationEmail(sessionUser.email || null);
              setUser(null);
              try {
                localStorage.removeItem('studyvault_active_user');
              } catch {}
              await supabase.auth.signOut().catch(() => {});
              setCurrentTab('login');
              setIsAuthInitializing(false);
              return;
            }

            // User's email_confirmed_at is verified
            setPendingVerificationEmail(null);
            const hydrated = await fetchAuthenticatedUserProfile(supabase, sessionUser);
            if (!isMounted) return;

            setUser(hydrated);
            try {
              localStorage.setItem('studyvault_active_user', JSON.stringify(hydrated));
            } catch {}

            if (!hydrated.setupCompleted) {
              setAuthCallbackBanner(null);
              setCurrentTab('profile-setup');
              if (isNewCallbackToProcess && typeParam !== 'recovery') {
                triggerToast('Email verified! Welcome to Xeusar. Please complete your profile setup.');
              }
            } else if (isNewCallbackToProcess && typeParam !== 'recovery') {
              setAuthCallbackBanner(null);
              setCurrentTab('landing');
              triggerToast(`Email verified! Welcome to Xeusar, ${hydrated.name}.`);
            } else {
              setCurrentTab((prev) =>
                prev === 'login' || prev === 'signup' || prev === 'profile-setup'
                  ? 'landing'
                  : prev
              );
            }
          } else if (!sessionUser) {
            setUser(null);
            try {
              localStorage.removeItem('studyvault_active_user');
            } catch {}
          }

          setIsAuthInitializing(false);
        };

        initializeAuthAndProcessCallback().catch(() => {
          if (isMounted) setIsAuthInitializing(false);
        });

        // Listen for live Supabase Auth state transitions (including email verification completion)
        const { data: authListener } = supabase.auth.onAuthStateChange(async (event, session) => {
          if (!isMounted) return;

          if (event === 'PASSWORD_RECOVERY') {
            setCurrentTab('reset-password');
            return;
          }

          if (session?.user) {
            let activeAuthUser = session.user;
            if (!activeAuthUser.email_confirmed_at) {
              const { data: freshUserData } = await supabase.auth.getUser();
              if (freshUserData?.user) {
                activeAuthUser = freshUserData.user;
              }
            }

            const isVerified = Boolean(activeAuthUser.email_confirmed_at);

            if (!isVerified) {
              setPendingVerificationEmail(activeAuthUser.email || null);
              setUser(null);
              try {
                localStorage.removeItem('studyvault_active_user');
              } catch {}
              setCurrentTab('login');
              return;
            }

            setPendingVerificationEmail(null);
            const hydrated = await fetchAuthenticatedUserProfile(supabase, activeAuthUser);
            if (!isMounted) return;

            setUser(hydrated);
            try {
              localStorage.setItem('studyvault_active_user', JSON.stringify(hydrated));
            } catch {}

            if (!hydrated.setupCompleted) {
              setCurrentTab((prev) =>
                prev === 'reset-password' ? 'reset-password' : 'profile-setup'
              );
            }
          } else if (event === 'SIGNED_OUT') {
            setUser(null);
            try {
              localStorage.removeItem('studyvault_active_user');
            } catch {}
          }
        });

        return () => {
          isMounted = false;
          supabase.removeChannel(channel);
          authListener?.subscription?.unsubscribe();
        };
      } catch {
        setIsAuthInitializing(false);
      }
    } else {
      setIsAuthInitializing(false);
    }
  }, [supabaseConfig.isConnected, supabaseConfig.url, supabaseConfig.anonKey]);

  // Enforce protected routes & email verification via Supabase Auth email_confirmed_at
  // Unregistered users can only access 'landing', 'browse' (Study Library), and auth pages; all other pages require sign-in/registration.
  useEffect(() => {
    if (isAuthInitializing) return;

    // Ensure an in-flight auth callback in the URL is never interrupted by route guards
    const searchParams = new URLSearchParams(window.location.search);
    const rawHash = window.location.hash.startsWith('#')
      ? window.location.hash.substring(1)
      : window.location.hash;
    const hashParams = new URLSearchParams(rawHash);
    const hasActiveCallbackParams = Boolean(
      searchParams.get('code') ||
        searchParams.get('token_hash') ||
        hashParams.get('access_token') ||
        hashParams.get('refresh_token') ||
        hashParams.get('token_hash')
    );
    if (hasActiveCallbackParams) return;

    // Features restricted to registered & verified users only (unregistered users may only access 'landing' and 'browse' Library)
    const isRegisteredOnlyTab =
      currentTab === 'profile-setup' ||
      currentTab === 'profile-management' ||
      currentTab === 'upload' ||
      currentTab === 'explore' ||
      currentTab === 'program' ||
      currentTab === 'university' ||
      currentTab === 'forum';

    const isDashboardOrProfileSetupView = isRegisteredOnlyTab || currentTab === 'browse';

    let isCancelled = false;

    const verifySessionAndEnforceGuard = async () => {
      const supabase = supabaseConfig.isConnected
        ? getSupabaseInstance(supabaseConfig)
        : null;

      if (supabase) {
        const { data } = await supabase.auth.getSession();
        if (isCancelled) return;

        let sessionUser = data.session?.user ?? null;

        if (sessionUser && !sessionUser.email_confirmed_at) {
          const { data: freshUserData } = await supabase.auth.getUser();
          if (isCancelled) return;
          if (freshUserData?.user) {
            sessionUser = freshUserData.user;
          }
        }

        // Explicitly check email_confirmed_at on the Supabase Auth user
        if (sessionUser && !sessionUser.email_confirmed_at) {
          if (sessionUser.email && pendingVerificationEmail !== sessionUser.email) {
            setPendingVerificationEmail(sessionUser.email);
          }
          if (user) {
            setUser(null);
            try {
              localStorage.removeItem('studyvault_active_user');
            } catch {}
          }
          if (isDashboardOrProfileSetupView) {
            if (isRegisteredOnlyTab) {
              setPostLoginDestination(currentTab);
            }
            setCurrentTab('login');
          }
          return;
        }

        // If user has a pending unverified email (e.g. after signup/login attempt where session is null or unconfirmed)
        if (pendingVerificationEmail && (!sessionUser || !sessionUser.email_confirmed_at)) {
          if (isDashboardOrProfileSetupView) {
            if (isRegisteredOnlyTab) {
              setPostLoginDestination(currentTab);
            }
            setCurrentTab('login');
          }
          return;
        }

        const hasConfirmedSupabaseEmail = Boolean(
          sessionUser && sessionUser.email_confirmed_at
        );
        const hasConfirmedLocalUser = Boolean(
          user && !user.isGuest && (user.emailConfirmedAt || user.emailConfirmed === true)
        );
        const isVerifiedAuthenticated = hasConfirmedSupabaseEmail || hasConfirmedLocalUser;

        // Block unverified local user objects from accessing profile-setup or any dashboard view
        if (user && !user.isGuest && !hasConfirmedSupabaseEmail && !hasConfirmedLocalUser) {
          if (user.email && !pendingVerificationEmail) {
            setPendingVerificationEmail(user.email);
          }
          if (isDashboardOrProfileSetupView) {
            setCurrentTab('login');
          }
          return;
        }

        // Unregistered users can ONLY access 'landing' and 'browse' (Library).
        // Any attempt to access other pages redirects to the sign-in/login window first.
        if (isRegisteredOnlyTab && !isVerifiedAuthenticated) {
          setPostLoginDestination(currentTab);
          setCurrentTab('login');
          return;
        }

        // Redirect verified users who haven't completed onboarding immediately to profile-setup
        if (
          isVerifiedAuthenticated &&
          user &&
          !user.isGuest &&
          user.setupCompleted === false &&
          currentTab !== 'profile-setup' &&
          currentTab !== 'reset-password'
        ) {
          setCurrentTab('profile-setup');
        }
        return;
      }

      // Fallback guard when Supabase client is not connected
      const isVerifiedLocal = Boolean(
        user && !user.isGuest && (user.emailConfirmedAt || user.emailConfirmed === true)
      );

      if (pendingVerificationEmail && isDashboardOrProfileSetupView) {
        setCurrentTab('login');
        return;
      }

      if (isRegisteredOnlyTab && !isVerifiedLocal) {
        setPostLoginDestination(currentTab);
        setCurrentTab('login');
        return;
      }

      if (
        isVerifiedLocal &&
        user?.setupCompleted === false &&
        currentTab !== 'profile-setup' &&
        currentTab !== 'reset-password'
      ) {
        setCurrentTab('profile-setup');
      }
    };

    verifySessionAndEnforceGuard();

    return () => {
      isCancelled = true;
    };
  }, [
    currentTab,
    user,
    isAuthInitializing,
    pendingVerificationEmail,
    supabaseConfig.isConnected,
    supabaseConfig.url,
    supabaseConfig.anonKey,
  ]);

  // Extract distinct courses (by course name / uploader's course) for quick navigation
  const availableCourses = useMemo(() => {
    const set = new Set<string>();
    notes.forEach(n => {
      const displayCourse = getNoteCourseDisplay(n);
      if (displayCourse) set.add(displayCourse);
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

  // Extract distinct course categories / subjects dynamically (including standard categories like Engineering)
  const availableSubjects = useMemo(() => {
    const set = new Set<string>(
      SUBJECT_OPTIONS.filter(s => s !== 'All Subjects')
    );
    notes.forEach(n => {
      const cat = getNoteCourseCategory(n);
      if (cat) set.add(cat);
    });
    return ['All Subjects', ...Array.from(set)];
  }, [notes]);

  // Filtered & Sorted notes (Unified Study Library & My Program resources)
  const filteredNotes = useMemo(() => {
    const q = filters.searchQuery.trim().toLowerCase();

    return notes
      .filter(note => {
        const noteCategory = getNoteCourseCategory(note);
        const noteCourseDisplay = getNoteCourseDisplay(note);

        if (q) {
          const matchTitle = note.title.toLowerCase().includes(q);
          const matchCategory = noteCategory.toLowerCase().includes(q);
          const matchCourseDisplay = noteCourseDisplay.toLowerCase().includes(q);
          const matchCourseName = (note.courseName || '').toLowerCase().includes(q);
          const matchProgram = (note.programName || '').toLowerCase().includes(q);
          const matchUploader = (note.uploaderName || '').toLowerCase().includes(q);
          const matchSubj = note.subject.toLowerCase().includes(q);
          const matchProf = note.professor.toLowerCase().includes(q);
          const matchDesc = note.description.toLowerCase().includes(q);
          const matchTags = note.tags.some(t => t.toLowerCase().includes(q));
          if (
            !matchTitle &&
            !matchCategory &&
            !matchCourseDisplay &&
            !matchCourseName &&
            !matchProgram &&
            !matchUploader &&
            !matchSubj &&
            !matchProf &&
            !matchDesc &&
            !matchTags
          ) {
            return false;
          }
        }

        if (filters.programId && filters.programId !== 'all') {
          if (!noteBelongsToProgram(note, filters.programId)) {
            return false;
          }
        }

        if (filters.semesterNumber && filters.semesterNumber !== 'all') {
          const semNum = parseInt(filters.semesterNumber, 10);
          if (!isNaN(semNum) && note.semesterNumber !== semNum) {
            return false;
          }
        }

        if (filters.materialType !== 'all' && note.materialType !== filters.materialType) {
          return false;
        }

        if (
          filters.subject !== 'all' &&
          noteCategory !== filters.subject &&
          note.subject !== filters.subject
        ) {
          return false;
        }

        if (
          filters.courseCode !== 'all' &&
          noteCourseDisplay !== filters.courseCode &&
          note.courseName !== filters.courseCode &&
          note.courseCode !== filters.courseCode
        ) {
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

  const handleDownloadNote = async (note: StudyNote) => {
    incrementDownloadCountLocal(note.id);
    setNotes(prev =>
      prev.map(n => (n.id === note.id ? { ...n, downloadsCount: n.downloadsCount + 1 } : n))
    );

    const { blobUrl } = await resolveViewablePdfForNote(note);
    const cleanDownloadName =
      note.fileName ||
      `${getNoteCourseDisplay(note).replace(/[^a-zA-Z0-9_-]+/g, '_')}_Notes.pdf`;
    const link = document.createElement('a');
    link.href = blobUrl;
    link.download = cleanDownloadName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setTimeout(() => URL.revokeObjectURL(blobUrl), 5000);

    triggerToast(`Downloaded "${cleanDownloadName}"`);
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
    setNotes(prev => [newNote, ...prev.filter(n => n.id !== newNote.id)]);
    if (uploadPrefill.programId) {
      setSelectedProgramId(uploadPrefill.programId);
      setProgramSubTab('materials');
      setCurrentTab('program');
    } else {
      setCurrentTab('browse');
    }
    setUploadPrefill({});
    setPreviewNote(newNote);
    triggerToast(`"${newNote.title}" published to Study Library & ${newNote.programName || 'My Program'}!`);
  };

  const handleDeleteSharedNote = async (note: StudyNote) => {
    if (!canUserDeleteNote(note, user)) {
      triggerToast('Permission denied: Only the uploader can delete this document.');
      return;
    }
    try {
      const supabase = getSupabaseInstance(supabaseConfig);
      await deleteSharedResource(note.id, supabase, user);
      setNotes(prev => prev.filter(n => n.id !== note.id));
      if (previewNote?.id === note.id) {
        setPreviewNote(null);
      }
      triggerToast(`Removed "${note.title}" from Study Library & My Program`);
    } catch (err: any) {
      triggerToast(err?.message || 'Only the uploader can delete this document.');
    }
  };

  const handleSaveEditedNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingNote) return;
    const supabase = getSupabaseInstance(supabaseConfig);
    const updated = await updateSharedResource({
      noteId: editingNote.id,
      title: editingNote.title,
      description: editingNote.description,
      courseCode: editingNote.courseCode,
      courseName: editingNote.courseName,
      subject: editingNote.subject,
      materialType: editingNote.materialType,
      semesterNumber: editingNote.semesterNumber,
      programId: editingNote.programId,
      programName: editingNote.programName,
      professor: editingNote.professor,
      supabaseClient: supabase
    });
    if (updated) {
      setNotes(prev => prev.map(n => (n.id === updated.id ? updated : n)));
      if (previewNote?.id === updated.id) {
        setPreviewNote(updated);
      }
      triggerToast(`Updated "${updated.title}" across Study Library & My Program`);
    }
    setEditingNote(null);
  };

  const isRegisteredUser = Boolean(
    user && !user.isGuest && (user.emailConfirmed === true || Boolean(user.emailConfirmedAt))
  );

  const handleOpenInfoCenter = (section: InfoCenterSectionId = 'about') => {
    setInfoCenterSection(section);
    setCurrentTab('about');
    if (typeof window !== 'undefined') {
      window.history.replaceState({}, document.title, `#${section}`);
    }
  };

  const handleNavigateTab = (targetTab: AppTab) => {
    const isPublicTab =
      targetTab === 'landing' ||
      targetTab === 'browse' ||
      targetTab === 'about' ||
      targetTab === 'products' ||
      targetTab === 'login' ||
      targetTab === 'signup' ||
      targetTab === 'forgot-password' ||
      targetTab === 'reset-password';

    if (!isPublicTab && !isRegisteredUser) {
      setPostLoginDestination(targetTab);
      setCurrentTab('login');
      triggerToast('Please sign in or register an account to access this page.');
      return;
    }

    if (isRegisteredUser && user?.setupCompleted === false && targetTab !== 'profile-setup' && targetTab !== 'reset-password') {
      setCurrentTab('profile-setup');
      return;
    }

    if (targetTab === 'about') {
      setInfoCenterSection('about');
    }

    if (typeof window !== 'undefined') {
      if (targetTab === 'products') {
        window.history.replaceState({}, document.title, '#products');
      } else if (targetTab === 'about') {
        window.history.replaceState({}, document.title, '#about');
      } else if (targetTab === 'landing') {
        window.history.replaceState({}, document.title, window.location.pathname || '/');
      }
    }

    setCurrentTab(targetTab);
  };

  const handleOpenMyProgram = () => {
    if (!isRegisteredUser) {
      setPostLoginDestination('program');
      setCurrentTab('login');
      triggerToast('Please sign in or register an account to access My Program.');
      return;
    }
    if (user?.setupCompleted === false) {
      setCurrentTab('profile-setup');
      return;
    }
    if (user?.programId || user?.program || user?.majorOrField) {
      let targetProgramId = user.programId;
      if (!targetProgramId && (user.program || user.majorOrField)) {
        const sysProg = ensureSystemProgramForRegisteredStudent({
          studentId: user.id,
          programName: user.program || user.majorOrField,
          degreeTier: user.degreeTier
        });
        if (sysProg) {
          targetProgramId = sysProg.id;
        }
      }
      if (targetProgramId) {
        setSelectedProgramId(targetProgramId);
      }
      setProgramSubTab('overview');
      setCurrentTab('program');
    } else {
      setIsProgramSetupOpen(true);
    }
  };

  const handleSelectProgram = (program: string | AcademicProgram) => {
    if (!isRegisteredUser) {
      setPostLoginDestination('program');
      setCurrentTab('login');
      triggerToast('Please sign in or register an account to view academic programs.');
      return;
    }
    const progId = typeof program === 'string' ? program : program.id;
    setSelectedProgramId(progId);
    setProgramSubTab('overview');
    setCurrentTab('program');
  };

  const handleSaveUserProgram = (program: AcademicProgram, semester?: string | number) => {
    if (!isRegisteredUser || !user) {
      setPostLoginDestination('program');
      setCurrentTab('login');
      return;
    }
    const updatedUser: StudentUser = {
      ...user,
      degreeTier: program.degreeTier,
      program: program.name,
      programId: program.id,
      currentSemester: semester || 1
    };
    setUser(updatedUser);
    try {
      localStorage.setItem('studyvault_active_user', JSON.stringify(updatedUser));
    } catch {}
    triggerToast(`Enrolled in ${program.name} (${program.degreeTier})`);
    setSelectedProgramId(program.id);
    setProgramSubTab('overview');
    setCurrentTab('program');
  };

  const handleOpenMyUniversity = () => {
    handleOpenMyProgram();
  };

  const handleOpenExplore = () => {
    if (!isRegisteredUser) {
      setPostLoginDestination('explore');
      setCurrentTab('login');
      triggerToast('Please sign in or register an account to explore programs.');
      return;
    }
    setCurrentTab('explore');
  };

  const handleSelectUniversity = (uniId: string) => {
    if (!isRegisteredUser) {
      setPostLoginDestination('program');
      setCurrentTab('login');
      return;
    }
    setSelectedProgramId(uniId);
    setProgramSubTab('overview');
    setCurrentTab('program');
  };

  const handleSaveUserUniversity = (universityName: string, universityId?: string) => {
    if (!isRegisteredUser || !user) {
      setPostLoginDestination('university');
      setCurrentTab('login');
      return;
    }
    const updatedUser: StudentUser = {
      ...user,
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
    if (!isRegisteredUser) {
      setPostLoginDestination('upload');
      setCurrentTab('login');
      triggerToast('Please sign in or register an account to upload study materials.');
      return;
    }
    setUploadPrefill({ university: prefillUni, courseCode: prefillCourse });
    setCurrentTab('upload');
  };

  const handleSignOut = async () => {
    try {
      const supabase = getSupabaseInstance(supabaseConfig);
      if (supabase) {
        await supabase.auth.signOut();
      }
    } catch {
      // Ignore network errors on logout
    }
    try {
      localStorage.removeItem('studyvault_active_user');
    } catch {}
    setUser(null);
    setCurrentTab('login');
    triggerToast('Signed out of Xeusar account');
  };

  const handleOpenAuthOrProfileRoute = (
    mode: 'signin' | 'signup' | 'settings' | 'profile' = 'signin'
  ) => {
    if (mode === 'signin') {
      setCurrentTab('login');
      return;
    }
    if (mode === 'signup') {
      setCurrentTab('signup');
      return;
    }
    if (!user || user.isGuest || !user.emailConfirmed) {
      setPostLoginDestination('profile-management');
      setCurrentTab('login');
      return;
    }
    if (user.setupCompleted === false) {
      setCurrentTab('profile-setup');
      return;
    }
    setProfileSection(mode === 'settings' ? 'settings' : 'profile');
    setCurrentTab('profile-management');
  };

  return (
    <div className="min-h-screen bg-[#050505] text-white flex flex-col font-outfit relative overflow-x-hidden selection:bg-white selection:text-black">
      {/* Top Verification Notification Banner for Unverified Users */}
      {pendingVerificationEmail && (
        <VerificationBanner
          email={pendingVerificationEmail}
          supabaseConfig={supabaseConfig}
          currentTab={currentTab}
          onNavigateToVerify={() => setCurrentTab('login')}
        />
      )}

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
        brightness={rayBrightness}
        scrollBlur={currentTab === 'landing' ? homeScrollBlur : 28}
      />

      {/* Toast Notification Banner */}
      {toastMessage && (
        <div className="fixed bottom-20 sm:bottom-6 right-4 sm:right-6 left-4 sm:left-auto z-50 bg-black/90 text-white px-5 py-3 rounded-2xl text-xs font-medium shadow-2xl border border-white/20 flex items-center justify-center sm:justify-start gap-2.5 backdrop-blur-md animate-in slide-in-from-bottom-3 duration-200">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span className="truncate">{toastMessage}</span>
        </div>
      )}

      {/* Top Floating Glass Navigation - Appears on landing page, Products, and Information Center */}
      {(currentTab === 'landing' || currentTab === 'about' || currentTab === 'products') && (
        <Navbar
          currentTab={currentTab}
          setCurrentTab={tab => {
            if (tab === 'program' || tab === 'university') {
              handleOpenMyProgram();
            } else if (tab === 'explore') {
              handleOpenExplore();
            } else {
              handleNavigateTab(tab);
            }
          }}
          supabaseConfig={supabaseConfig}
          onOpenSupabaseModal={() => setIsSupabaseModalOpen(true)}
          user={user}
          onOpenAuthModal={handleOpenAuthOrProfileRoute}
          onOpenCodeDrawer={() => setIsCodeExportOpen(true)}
          onSignOut={handleSignOut}
        />
      )}

      {/* Floating Vertical Taskbar on Left Side (Detached from edge; hidden on overview/landing, about, products, and auth/setup pages) */}
      {currentTab !== 'landing' &&
        currentTab !== 'about' &&
        currentTab !== 'products' &&
        currentTab !== 'login' &&
        currentTab !== 'signup' &&
        currentTab !== 'forgot-password' &&
        currentTab !== 'reset-password' &&
        currentTab !== 'profile-setup' && (
          <VerticalTaskbar
            currentTab={
              currentTab === 'profile-management' ? 'browse' : currentTab
            }
            setCurrentTab={handleNavigateTab}
            filters={filters}
            setFilters={setFilters}
            user={user}
            onOpenMyProgram={handleOpenMyProgram}
            onOpenMyUniversity={handleOpenMyProgram}
            onOpenExplore={handleOpenExplore}
            onOpenAuthModal={handleOpenAuthOrProfileRoute}
            onOpenCodeDrawer={() => setIsCodeExportOpen(true)}
            supabaseConfig={supabaseConfig}
            onOpenSupabaseModal={() => setIsSupabaseModalOpen(true)}
          />
        )}

      {/* Dedicated Custom Xeusar Login, Signup, and Password Recovery Pages */}
      {(currentTab === 'login' ||
        currentTab === 'signup' ||
        currentTab === 'forgot-password' ||
        currentTab === 'reset-password') && (
        <AuthPages
          mode={currentTab as AuthPageMode}
          onChangeMode={(nextMode) => setCurrentTab(nextMode)}
          supabaseConfig={supabaseConfig}
          initialVerificationPendingEmail={pendingVerificationEmail}
          onVerificationPendingChange={setPendingVerificationEmail}
          externalBannerMessage={authCallbackBanner}
          onClearExternalBanner={() => setAuthCallbackBanner(null)}
          onAuthenticated={(authenticatedUser, isNewSignup) => {
            if (!authenticatedUser.emailConfirmed) {
              setPendingVerificationEmail(authenticatedUser.email);
              setCurrentTab('login');
              return;
            }
            setPendingVerificationEmail(null);
            setAuthCallbackBanner(null);
            setUser(authenticatedUser);
            try {
              localStorage.setItem(
                'studyvault_active_user',
                JSON.stringify(authenticatedUser)
              );
            } catch {}

            if (isNewSignup || !authenticatedUser.setupCompleted) {
              setCurrentTab('profile-setup');
              triggerToast('Account authenticated! Please complete your profile setup.');
            } else {
              const target =
                postLoginDestination &&
                postLoginDestination !== 'login' &&
                postLoginDestination !== 'signup'
                  ? postLoginDestination
                  : 'landing';
              setPostLoginDestination('landing');
              setCurrentTab(target);
              triggerToast(`Welcome back, ${authenticatedUser.name}!`);
            }
          }}
          onBackToHome={() => setCurrentTab('landing')}
          onOpenBackendConfig={() => setIsSupabaseModalOpen(true)}
        />
      )}

      {/* Dedicated Profile Setup Page (Post-Signup Onboarding Page — Verified Users Only) */}
      {currentTab === 'profile-setup' && user && user.emailConfirmed && (
        <ProfilePages
          pageMode="setup"
          user={user}
          supabaseConfig={supabaseConfig}
          onUserUpdated={(updated) => setUser(updated)}
          onSetupCompleted={(completedUser) => {
            setUser(completedUser);
            setCurrentTab('landing');
            triggerToast('Profile setup completed! Welcome to Xeusar.');
          }}
          onSignOut={handleSignOut}
          onBackToDashboard={() => setCurrentTab('landing')}
          isFlareLocked={isFlareLocked}
          onToggleFlareLock={handleToggleFlareLock}
          rayColor={rayColor}
          onChangeRayColor={handleChangeRayColor}
          rayOrigin={rayOrigin}
          onChangeRayOrigin={handleChangeRayOrigin}
          rayBrightness={rayBrightness}
          onChangeRayBrightness={handleChangeRayBrightness}
          onResetFlare={handleResetFlare}
        />
      )}

      {/* Dedicated Profile Management Page (Verified Users Only) */}
      {currentTab === 'profile-management' && user && user.emailConfirmed && (
        <ProfilePages
          pageMode="management"
          user={user}
          supabaseConfig={supabaseConfig}
          initialSection={profileSection}
          onUserUpdated={(updated) => {
            setUser(updated);
            triggerToast('Profile updated');
          }}
          onSetupCompleted={(updated) => {
            setUser(updated);
            setCurrentTab('landing');
          }}
          onSignOut={handleSignOut}
          onBackToDashboard={() => setCurrentTab('landing')}
          isFlareLocked={isFlareLocked}
          onToggleFlareLock={handleToggleFlareLock}
          rayColor={rayColor}
          onChangeRayColor={handleChangeRayColor}
          rayOrigin={rayOrigin}
          onChangeRayOrigin={handleChangeRayOrigin}
          rayBrightness={rayBrightness}
          onChangeRayBrightness={handleChangeRayBrightness}
          onResetFlare={handleResetFlare}
        />
      )}

      {/* Primary View Routing */}
      {currentTab === 'landing' && (
        <div className="relative z-10 flex-1 flex flex-col justify-center pb-20 md:pb-0">
          <LandingHero
            notes={notes}
            user={user}
            onBrowseMaterials={() => handleNavigateTab('browse')}
            onUploadNotes={() => handleNavigateTab('upload')}
            onWatchDemo={() => setIsDemoModalOpen(true)}
            onPreviewNote={handlePreviewNote}
            onDownloadNote={handleDownloadNote}
            onUpvoteNote={handleUpvoteNote}
            onOpenProgram={handleSelectProgram}
            onOpenExplorePrograms={handleOpenExplore}
            onOpenInfoCenter={handleOpenInfoCenter}
            rayColor={rayColor}
            onChangeRayColor={handleChangeRayColor}
            rayOrigin={rayOrigin}
            onChangeRayOrigin={handleChangeRayOrigin}
            rayPulsating={rayPulsating}
            onTogglePulsating={() => setRayPulsating(prev => !prev)}
          />
        </div>
      )}

      {currentTab === 'about' && (
        <main className="relative z-10 flex-1">
          <InfoCenterView
            initialSection={infoCenterSection}
            onBackToHome={() => handleNavigateTab('landing')}
            onOpenLibrary={() => handleNavigateTab('browse')}
            onOpenExplorePrograms={handleOpenExplore}
            onOpenForum={() => handleNavigateTab('forum')}
          />
        </main>
      )}

      {currentTab === 'products' && (
        <main className="relative z-10 flex-1">
          <ProductsView
            onBackToHome={() => handleNavigateTab('landing')}
          />
        </main>
      )}

      {currentTab === 'explore' && (
        <main className="relative z-10 flex-1 max-w-6xl w-full mx-auto pl-16 sm:pl-20 md:pl-24 pr-4 sm:pr-6 lg:pr-8 pt-5 sm:pt-7 pb-20 md:pb-10">
          <ExploreProgramsView
            user={user}
            notes={notes}
            onSelectProgram={handleSelectProgram}
            onOpenMyProgram={handleOpenMyProgram}
            onOpenSetupModal={() => setIsProgramSetupOpen(true)}
          />
        </main>
      )}

      {currentTab === 'forum' && (
        <main className="relative z-10 flex-1 max-w-6xl w-full mx-auto pl-16 sm:pl-20 md:pl-24 pr-4 sm:pr-6 lg:pr-8 pt-5 sm:pt-7 pb-20 md:pb-10">
          <PublicForumView
            user={user}
            supabaseConfig={supabaseConfig}
            notes={notes}
            initialPostId={initialForumPostId}
            onPreviewNote={handlePreviewNote}
            onOpenProgram={(progId, subTab) => handleSelectProgram(progId, subTab)}
            onOpenAuthModal={(mode) => handleOpenAuthOrProfileRoute(mode)}
            onTriggerToast={triggerToast}
          />
        </main>
      )}

      {(currentTab === 'program' || currentTab === 'university') && (
        <main className="relative z-10 flex-1 max-w-6xl w-full mx-auto pl-16 sm:pl-20 md:pl-24 pr-4 sm:pr-6 lg:pr-8 pt-5 sm:pt-7 pb-20 md:pb-10">
          <ProgramDirectoryView
            programId={selectedProgramId}
            user={user}
            notes={notes}
            activeTab={programSubTab}
            onTabChange={setProgramSubTab}
            onBackToExplore={() => setCurrentTab('explore')}
            onPreviewNote={handlePreviewNote}
            onDownloadNote={handleDownloadNote}
            onToggleUpvoteNote={handleUpvoteNote}
            onUpvoteNote={(n) => handleUpvoteNote(typeof n === 'string' ? n : n.id)}
            onEditNote={(note) => setEditingNote({ ...note })}
            onDeleteNote={handleDeleteSharedNote}
            onOpenUpload={(progId: string, cCode?: string, semNum?: number) => {
              setUploadPrefill({ programId: progId, courseCode: cCode, semesterNumber: semNum });
              setCurrentTab('upload');
            }}
            onOpenSetupModal={() => setIsProgramSetupOpen(true)}
          />
        </main>
      )}

      {currentTab === 'browse' && (
        <main className="relative z-10 flex-1 max-w-6xl w-full mx-auto pl-16 sm:pl-20 md:pl-24 pr-4 sm:pr-6 lg:pr-8 pt-5 sm:pt-7 pb-20 md:pb-10">
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
                      programId: 'all',
                      semesterNumber: 'all',
                      sortBy: 'latest'
                    })
                  }
                  className="px-5 py-2.5 text-xs font-bold text-white/80 bg-white/10 hover:bg-white/20 rounded-full transition-colors cursor-pointer"
                >
                  Clear Filters
                </button>
                <button
                  onClick={() => handleNavigateTab('upload')}
                  className="px-5 py-2.5 text-xs font-black uppercase text-black bg-white hover:bg-white/90 rounded-full transition-colors cursor-pointer"
                >
                  Upload First Note
                </button>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredNotes.map(note => {
                const isNoteOwner = canUserDeleteNote(note, user);
                return (
                  <NoteCard
                    key={note.id}
                    note={note}
                    onPreview={handlePreviewNote}
                    onDownload={handleDownloadNote}
                    onUpvote={handleUpvoteNote}
                    canManage={isNoteOwner}
                    onEdit={isNoteOwner ? (n) => setEditingNote({ ...n }) : undefined}
                    onDelete={isNoteOwner ? handleDeleteSharedNote : undefined}
                  />
                );
              })}
            </div>
          )}
        </main>
      )}

      {currentTab === 'upload' && (
        <main className="relative z-10 flex-1 px-4 sm:px-6 pl-14 sm:pl-20 md:pl-24 lg:px-8 pt-6 sm:pt-8 pb-24 md:pb-8">
          <UploadView
            onBack={() => setCurrentTab(uploadPrefill.programId ? 'program' : 'browse')}
            onSuccess={handleUploadSuccess}
            supabaseConfig={supabaseConfig}
            user={user}
            onOpenSupabaseModal={() => setIsSupabaseModalOpen(true)}
            initialUniversity={uploadPrefill.university}
            initialCourseCode={uploadPrefill.courseCode}
            initialProgramId={uploadPrefill.programId}
            initialSemesterNumber={uploadPrefill.semesterNumber}
          />
        </main>
      )}

      {/* Synchronized Edit Shared Resource Modal */}
      {editingNote && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md"
        >
          <div className="bg-zinc-950 border border-white/15 rounded-3xl w-full max-w-lg p-6 shadow-2xl text-white font-outfit">
            <h3 className="text-lg font-bold text-white mb-1">
              Edit Shared Resource Metadata
            </h3>
            <p className="text-xs text-white/50 mb-4">
              Changes synchronize automatically across both Study Library and My Program.
            </p>
            <form onSubmit={handleSaveEditedNote} className="space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-white/70 mb-1 font-jetbrains">
                  Title
                </label>
                <input
                  type="text"
                  required
                  value={editingNote.title}
                  onChange={e => setEditingNote({ ...editingNote, title: e.target.value })}
                  className="w-full px-3 py-2 text-xs bg-white/5 border border-white/15 rounded-xl text-white"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-white/70 mb-1 font-jetbrains">
                    Course Category (Discipline)
                  </label>
                  <select
                    value={editingNote.subject || getNoteCourseCategory(editingNote)}
                    onChange={e => setEditingNote({ ...editingNote, subject: e.target.value })}
                    className="w-full px-3 py-2 text-xs bg-stone-900 border border-white/15 rounded-xl text-white"
                  >
                    {SUBJECT_OPTIONS.filter(s => s !== 'All Subjects').map(s => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-white/70 mb-1 font-jetbrains">
                    Course / Subject Name
                  </label>
                  <input
                    type="text"
                    required
                    value={editingNote.courseName}
                    onChange={e => setEditingNote({ ...editingNote, courseName: e.target.value })}
                    className="w-full px-3 py-2 text-xs bg-white/5 border border-white/15 rounded-xl text-white"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-white/70 mb-1 font-jetbrains">
                    Degree Program
                  </label>
                  <select
                    value={editingNote.programId || 'bs-ee'}
                    onChange={e => {
                      const prog = getAvailableProgramsForFilter().find(p => p.id === e.target.value);
                      const autoSubject = deriveCourseCategoryFromUploaderProgram(prog?.name || e.target.value, editingNote.courseName);
                      setEditingNote({
                        ...editingNote,
                        programId: e.target.value,
                        programName: prog?.name || editingNote.programName,
                        subject: autoSubject
                      });
                    }}
                    className="w-full px-3 py-2 text-xs bg-stone-900 border border-white/15 rounded-xl text-white"
                  >
                    {getAvailableProgramsForFilter().map(p => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-white/70 mb-1 font-jetbrains">
                    Semester
                  </label>
                  <select
                    value={editingNote.semesterNumber || 1}
                    onChange={e => setEditingNote({ ...editingNote, semesterNumber: Number(e.target.value) })}
                    className="w-full px-3 py-2 text-xs bg-stone-900 border border-white/15 rounded-xl text-white"
                  >
                    {[1, 2, 3, 4, 5, 6, 7, 8].map(s => (
                      <option key={s} value={s}>Semester {s}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-white/70 mb-1 font-jetbrains">
                  Resource Type
                </label>
                <select
                  value={editingNote.materialType}
                  onChange={e => setEditingNote({ ...editingNote, materialType: e.target.value as MaterialType })}
                  className="w-full px-3 py-2 text-xs bg-stone-900 border border-white/15 rounded-xl text-white"
                >
                  {Object.entries(MATERIAL_TYPE_LABELS)
                    .filter(([k]) => k !== 'all')
                    .map(([k, info]) => (
                      <option key={k} value={k}>{info.label}</option>
                    ))}
                </select>
              </div>
              <div className="flex items-center justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setEditingNote(null)}
                  className="px-4 py-2 text-xs font-semibold text-white/60 hover:text-white rounded-xl cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-bold text-black bg-cyan-400 hover:bg-cyan-300 rounded-xl cursor-pointer"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* StudyHub Universal Footer */}
      <Footer
        onOpenLibrary={() => setCurrentTab('browse')}
        onOpenUpload={() => handleNavigateTab('upload')}
        onOpenCodeDrawer={() => setIsCodeExportOpen(true)}
        onOpenSupabaseModal={() => setIsSupabaseModalOpen(true)}
        onOpenInfoCenter={handleOpenInfoCenter}
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

      {/* Blank Black Login & Sign Up Window (Ready to be updated later) */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        initialMode={authModalMode}
      />

      {/* Dedicated User Settings Window */}
      <UserSettingsModal
        isOpen={isUserSettingsOpen}
        onClose={() => setIsUserSettingsOpen(false)}
        user={user}
        onUserChange={u => setUser(u)}
        supabaseConfig={supabaseConfig}
        initialTab={userSettingsTab}
        isFlareLocked={isFlareLocked}
        onToggleFlareLock={handleToggleFlareLock}
        rayColor={rayColor}
        onChangeRayColor={handleChangeRayColor}
        rayOrigin={rayOrigin}
        onChangeRayOrigin={handleChangeRayOrigin}
        rayBrightness={rayBrightness}
        onChangeRayBrightness={handleChangeRayBrightness}
        onResetFlare={handleResetFlare}
      />

      {/* University Setup Modal (Prompt & Search for unassigned / changing primary campus) */}
      <UniversitySetupModal
        isOpen={isUniversitySetupOpen}
        onClose={() => setIsUniversitySetupOpen(false)}
        user={user}
        onSaveUniversity={handleSaveUserUniversity}
      />

      {/* Program Setup Modal (Prompt & Search for student degree program and semester) */}
      <ProgramSetupModal
        isOpen={isProgramSetupOpen}
        onClose={() => setIsProgramSetupOpen(false)}
        user={user}
        onSaveProgram={handleSaveUserProgram}
      />
    </div>
  );
}
