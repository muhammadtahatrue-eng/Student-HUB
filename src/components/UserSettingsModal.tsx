import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  CheckCircle2,
  AlertCircle,
  LogOut,
  GraduationCap,
  Lock,
  Unlock,
  RotateCcw,
  Palette,
  User as UserIcon,
  Sparkles,
  ShieldCheck,
  Camera,
  Upload,
  Edit3,
  BookOpen,
  FileText,
  UserCheck,
  Check,
  Layers,
  Compass,
  Award,
  ChevronLeft,
  ChevronRight,
  Plus,
  Settings,
  KeyRound,
  Sliders,
  Mail,
  Eye,
  EyeOff
} from 'lucide-react';
import {
  StudentUser,
  SupabaseConfig,
  EducationLevel,
  UndergraduateStage,
  AcademicSemester,
  AcademicProfileInfo
} from '../types/index.ts';
import { getSupabaseInstance, signOutCurrentUser } from '../lib/supabaseClient.ts';
import { RaysOrigin } from './LightRays.tsx';
import { HecUniversitySelect } from './university/HecUniversitySelect.tsx';
import { registerStudentToUniversity, findUniversityByNameOrFuzzy } from '../lib/universityStore.ts';

export type UserSettingsTab = 'profile' | 'academic' | 'appearance' | 'account';

interface UserSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: StudentUser | null;
  onUserChange: (user: StudentUser | null) => void;
  supabaseConfig: SupabaseConfig;
  initialTab?: UserSettingsTab;
  isFlareLocked?: boolean;
  onToggleFlareLock?: (locked: boolean) => void;
  rayColor?: string;
  onChangeRayColor?: (color: string) => void;
  rayOrigin?: RaysOrigin;
  onChangeRayOrigin?: (origin: RaysOrigin) => void;
  rayBrightness?: number;
  onChangeRayBrightness?: (brightness: number) => void;
  onResetFlare?: () => void;
  onOpenAuthModal?: (mode: 'signin' | 'signup') => void;
  onSignOut?: () => void;
}

const FLARE_PRESET_COLORS: { name: string; hex: string; isRgb?: boolean }[] = [
  { name: 'Ash Grey (Default)', hex: '#9ca3af' },
  { name: 'RGB Spectrum', hex: 'rgb', isRgb: true },
  { name: 'Cyber Cyan', hex: '#00f0ff' },
  { name: 'Aurora Emerald', hex: '#10b981' },
  { name: 'Neon Magenta', hex: '#ff007f' },
  { name: 'Ultraviolet', hex: '#b388ff' },
  { name: 'Solar Amber', hex: '#f59e0b' },
  { name: 'Electric Aqua', hex: '#00ffff' },
  { name: 'Pure Platinum', hex: '#ffffff' },
];

const FLARE_ORIGIN_OPTIONS: { label: string; value: RaysOrigin }[] = [
  { label: 'Top Center (Default)', value: 'top-center' },
  { label: 'Top Left', value: 'top-left' },
  { label: 'Top Right', value: 'top-right' },
  { label: 'Bottom Center', value: 'bottom-center' },
  { label: 'Bottom Left', value: 'bottom-left' },
  { label: 'Bottom Right', value: 'bottom-right' },
];

const AVATAR_PRESETS = [
  {
    name: 'Cyber Mecha',
    url: 'https://api.dicebear.com/7.x/bottts/svg?seed=MechaZero&backgroundColor=0d1117'
  },
  {
    name: 'Pixel Mage',
    url: 'https://api.dicebear.com/7.x/pixel-art/svg?seed=PixelMage&backgroundColor=18181b'
  },
  {
    name: 'Retro Hero',
    url: 'https://api.dicebear.com/7.x/pixel-art/svg?seed=RetroHero&backgroundColor=1f2937'
  },
  {
    name: 'Astro Bot',
    url: 'https://api.dicebear.com/7.x/bottts/svg?seed=AstroBot&backgroundColor=0f172a'
  },
  {
    name: 'Pixel Ninja',
    url: 'https://api.dicebear.com/7.x/pixel-art/svg?seed=ShadowNinja&backgroundColor=111827'
  },
  {
    name: 'Spark Droid',
    url: 'https://api.dicebear.com/7.x/bottts/svg?seed=SparkDroid&backgroundColor=1e1b4b'
  },
  {
    name: 'Neon Fox',
    url: 'https://api.dicebear.com/7.x/pixel-art/svg?seed=NeonFox&backgroundColor=090d16'
  },
  {
    name: 'Quantum Bot',
    url: 'https://api.dicebear.com/7.x/bottts/svg?seed=QuantumBot&backgroundColor=131127'
  }
];

const ALL_MAJOR_FIELDS = [
  'Computer Science',
  'Software Engineering',
  'Artificial Intelligence & Data Science',
  'Cybersecurity & Network Systems',
  'Information Technology',
  'Electrical & Electronics Engineering',
  'Mechanical Engineering',
  'Civil & Environmental Engineering',
  'Biomedical Engineering',
  'Chemical Engineering',
  'Aerospace & Aeronautical Engineering',
  'Robotics & Automation',
  'Pure & Applied Mathematics',
  'Physics & Quantum Sciences',
  'Chemistry & Biochemistry',
  'Molecular Biology & Genetics',
  'Neuroscience & Cognitive Science',
  'Medicine & Health Sciences',
  'Nursing & Healthcare Practice',
  'Pharmacy & Pharmacology',
  'Business Administration (BBA/MBA)',
  'Economics & Econometrics',
  'Finance & Investment Banking',
  'Accounting & Auditing',
  'Marketing & Strategic Brand Management',
  'Psychology & Behavioral Sciences',
  'Political Science & International Relations',
  'Law & Legal Studies',
  'Sociology & Social Anthropology',
  'Philosophy & Ethics',
  'History & Cultural Studies',
  'Literature & Linguistics',
  'Architecture & Urban Planning',
  'Graphic Design & UI/UX Design',
  'Digital Media & Communications',
  'Environmental Science & Ecology'
];

const UNDERGRAD_BACHELORS_YEARS = [
  'Freshman (1st Year)',
  'Sophomore (2nd Year)',
  'Junior (3rd Year)',
  'Senior (4th Year)'
];

const MASTERS_YEARS = ['Year 1', 'Year 2'];
const PHD_YEARS = ['Year 1', 'Year 2', 'Year 3', 'Year 4+'];

interface FieldSlidingSelectorProps {
  label: string;
  fieldValue: string;
  onSelectField: (field: string) => void;
  placeholder?: string;
  levelBadge?: string;
}

const FieldSlidingSelector: React.FC<FieldSlidingSelectorProps> = ({
  label,
  fieldValue,
  onSelectField,
  placeholder = 'Enter or select field of study',
  levelBadge
}) => {
  const sliderRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [isCustomMode, setIsCustomMode] = useState(
    Boolean(fieldValue && !ALL_MAJOR_FIELDS.includes(fieldValue))
  );

  const isPredefined = ALL_MAJOR_FIELDS.includes(fieldValue);

  const slideLeft = () => {
    sliderRef.current?.scrollBy({ left: -260, behavior: 'smooth' });
  };

  const slideRight = () => {
    sliderRef.current?.scrollBy({ left: 260, behavior: 'smooth' });
  };

  const handleSelectPredefined = (field: string) => {
    setIsCustomMode(false);
    onSelectField(field);
  };

  const handleSelectCustom = () => {
    setIsCustomMode(true);
    setTimeout(() => {
      inputRef.current?.focus();
    }, 50);
  };

  return (
    <div className="space-y-2 min-w-0 w-full">
      <div className="flex items-center justify-between gap-2 min-w-0">
        <label className="text-[11px] font-semibold text-white/80 flex items-center gap-1.5 flex-wrap min-w-0">
          <span>{label}</span>
          {levelBadge && (
            <span className="text-[9px] px-1.5 py-0.5 rounded bg-cyan-400/10 text-cyan-300 font-mono border border-cyan-400/20">
              {levelBadge}
            </span>
          )}
        </label>
        {fieldValue && (
          <span className="text-[10px] text-cyan-300/80 font-mono truncate max-w-[200px] shrink-0">
            {isPredefined ? 'Selected' : 'Other'}: {fieldValue}
          </span>
        )}
      </div>

      <div className="relative flex items-center gap-1 bg-white/[0.02] p-1 rounded-xl border border-white/10 min-w-0 w-full overflow-hidden">
        <button
          type="button"
          onClick={slideLeft}
          title="Slide left"
          className="p-1.5 rounded-lg bg-white/5 hover:bg-white/15 text-white/70 hover:text-white transition-all cursor-pointer shrink-0"
        >
          <ChevronLeft className="w-3.5 h-3.5" />
        </button>

        <div
          ref={sliderRef}
          className="flex-1 min-w-0 w-0 overflow-x-auto flex items-center gap-1.5 py-0.5 scroll-smooth no-scrollbar [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        >
          <button
            type="button"
            onClick={handleSelectCustom}
            className={`text-[11px] px-3 py-1.5 rounded-lg border whitespace-nowrap transition-all cursor-pointer shrink-0 flex items-center gap-1.5 ${
              isCustomMode || (!isPredefined && fieldValue)
                ? 'bg-amber-400 text-black border-amber-400 font-bold shadow-[0_0_12px_rgba(251,191,36,0.35)]'
                : 'bg-amber-400/10 text-amber-300 border-amber-400/30 hover:bg-amber-400/20'
            }`}
          >
            <Plus className="w-3 h-3" />
            <span>Other Fields</span>
          </button>

          {ALL_MAJOR_FIELDS.map((field) => {
            const isSelected = !isCustomMode && fieldValue === field;
            return (
              <button
                key={field}
                type="button"
                onClick={() => handleSelectPredefined(field)}
                className={`text-[11px] px-3 py-1.5 rounded-lg border whitespace-nowrap transition-all cursor-pointer shrink-0 ${
                  isSelected
                    ? 'bg-cyan-400 text-black border-cyan-400 font-bold shadow-[0_0_12px_rgba(0,240,255,0.35)]'
                    : 'bg-white/[0.04] text-white/75 border-white/10 hover:text-white hover:bg-white/[0.08]'
                }`}
              >
                {field}
              </button>
            );
          })}
        </div>

        <button
          type="button"
          onClick={slideRight}
          title="Slide right"
          className="p-1.5 rounded-lg bg-white/5 hover:bg-white/15 text-white/70 hover:text-white transition-all cursor-pointer shrink-0"
        >
          <ChevronRight className="w-3.5 h-3.5" />
        </button>
      </div>

      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          required
          value={fieldValue}
          onChange={(e) => {
            onSelectField(e.target.value);
            if (!ALL_MAJOR_FIELDS.includes(e.target.value)) {
              setIsCustomMode(true);
            }
          }}
          placeholder={isCustomMode ? 'Type other field manually...' : placeholder}
          className={`w-full px-3.5 py-2.5 rounded-xl text-xs transition-all border ${
            isCustomMode
              ? 'bg-amber-400/[0.04] border-amber-400/40 text-amber-100 placeholder-amber-200/40 focus:border-amber-400 focus:ring-1 focus:ring-amber-400'
              : 'bg-white/[0.04] border-white/15 text-white placeholder-white/30 focus:border-[#00f0ff] focus:ring-1 focus:ring-[#00f0ff]'
          }`}
        />
        {isCustomMode && (
          <div className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] text-amber-400/80 font-mono flex items-center gap-1 pointer-events-none">
            <Edit3 className="w-3 h-3" />
            <span>Other</span>
          </div>
        )}
      </div>
    </div>
  );
};

export const UserSettingsModal: React.FC<UserSettingsModalProps> = ({
  isOpen,
  onClose,
  user,
  onUserChange,
  supabaseConfig,
  initialTab = 'profile',
  isFlareLocked = true,
  onToggleFlareLock,
  rayColor = '#9ca3af',
  onChangeRayColor,
  rayOrigin = 'top-center',
  onChangeRayOrigin,
  rayBrightness = 0.5,
  onChangeRayBrightness,
  onResetFlare,
  onOpenAuthModal,
  onSignOut,
}) => {
  const [activeTab, setActiveTab] = useState<UserSettingsTab>(initialTab);
  const [editName, setEditName] = useState('');
  const [editUsername, setEditUsername] = useState('');
  const [editBio, setEditBio] = useState('');
  const [editAvatarUrl, setEditAvatarUrl] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Academic Hierarchy State
  const [educationLevel, setEducationLevel] = useState<EducationLevel>('undergraduate');
  const [undergraduateStage, setUndergraduateStage] = useState<UndergraduateStage>('college');
  const [institution, setInstitution] = useState('');
  const [institutionId, setInstitutionId] = useState<string | undefined>();
  const [isCustomUni, setIsCustomUni] = useState(false);
  const [customUniDetails, setCustomUniDetails] = useState<{
    name: string;
    city?: string;
    province?: string;
    sector?: 'Public' | 'Private';
  } | undefined>();
  const [academicYear, setAcademicYear] = useState('Freshman (1st Year)');
  const [semester, setSemester] = useState<AcademicSemester>('semester_1');
  const [majorOrField, setMajorOrField] = useState('');

  // Account & Security State
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [publicBadgeEnabled, setPublicBadgeEnabled] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem('xeusar_pref_public_badge');
      return saved !== null ? JSON.parse(saved) : true;
    } catch {
      return true;
    }
  });
  const [showUniOnNotes, setShowUniOnNotes] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem('xeusar_pref_uni_badge');
      return saved !== null ? JSON.parse(saved) : true;
    } catch {
      return true;
    }
  });

  const fileInputRef = useRef<HTMLInputElement>(null);

  const activeUser: StudentUser = user || {
    id: 'student-local',
    email: '',
    name: 'Student',
    username: 'student',
    university: 'National University of Sciences & Technology (NUST)',
    universityId: 'nust',
    degreeTier: 'Undergraduate',
    program: 'BS Computer Science',
    programId: 'bs-cs',
    currentSemester: 1,
    educationLevel: 'undergraduate',
    undergraduateStage: 'college',
    academicYear: 'Freshman (1st Year)',
    semester: 'semester_1',
    majorOrField: 'Computer Science',
    isGuest: false
  };

  useEffect(() => {
    if (isOpen) {
      setActiveTab(initialTab);
      setErrorMsg(null);
      setSuccessMsg(null);

      setEditName(activeUser.name || 'Student');
      setEditUsername(activeUser.username || 'student');
      setEditBio(activeUser.bio || '');
      setEditAvatarUrl(activeUser.avatarUrl || '');

      const prof = activeUser.academicProfile;
      const currentEduLevel: EducationLevel =
        prof?.educationLevel ||
        activeUser.educationLevel ||
        (activeUser.academicLevel === 'graduate' ? 'masters' : 'undergraduate');
      setEducationLevel(currentEduLevel);

      setUndergraduateStage(
        prof?.undergraduateStage ||
          activeUser.undergraduateStage ||
          (activeUser.academicLevel === 'high_school' ? 'high_school' : 'college')
      );

      const currentInst =
        prof?.institution ||
        activeUser.university ||
        'National University of Sciences & Technology (NUST)';
      setInstitution(currentInst);
      const resolvedId = activeUser.universityId || findUniversityByNameOrFuzzy(currentInst)?.id;
      setInstitutionId(resolvedId);
      setIsCustomUni(Boolean(activeUser.isCustomUniversity));
      setCustomUniDetails(activeUser.customUniversityDetails);

      const storedYear =
        prof?.academicYear || activeUser.academicYear || activeUser.undergraduateYear || '';
      if (currentEduLevel === 'masters') {
        setAcademicYear(MASTERS_YEARS.includes(storedYear) ? storedYear : MASTERS_YEARS[0]);
      } else if (currentEduLevel === 'phd') {
        setAcademicYear(PHD_YEARS.includes(storedYear) ? storedYear : PHD_YEARS[0]);
      } else {
        setAcademicYear(
          UNDERGRAD_BACHELORS_YEARS.includes(storedYear)
            ? storedYear
            : UNDERGRAD_BACHELORS_YEARS[0]
        );
      }

      setSemester(prof?.semester || activeUser.semester || 'semester_1');
      setMajorOrField(prof?.majorOrField || activeUser.majorOrField || activeUser.fieldOfStudy || '');
    }
  }, [isOpen, user, initialTab]);

  if (!isOpen) return null;

  const handleEducationLevelChange = (newLevel: EducationLevel) => {
    setEducationLevel(newLevel);
    if (newLevel === 'masters') {
      if (!MASTERS_YEARS.includes(academicYear)) setAcademicYear(MASTERS_YEARS[0]);
    } else if (newLevel === 'phd') {
      if (!PHD_YEARS.includes(academicYear)) setAcademicYear(PHD_YEARS[0]);
    } else {
      if (!UNDERGRAD_BACHELORS_YEARS.includes(academicYear)) {
        setAcademicYear(UNDERGRAD_BACHELORS_YEARS[0]);
      }
    }
  };

  const handleAvatarFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setErrorMsg('Please select a valid image file (PNG, JPG, WebP).');
      return;
    }

    if (file.size > 4 * 1024 * 1024) {
      setErrorMsg('Image file size must be less than 4MB.');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setEditAvatarUrl(reader.result);
        setErrorMsg(null);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();

    setIsSaving(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    const cleanUsername = editUsername.trim().replace(/^@/, '');
    const updatedUser: StudentUser = {
      ...activeUser,
      name: editName.trim() || activeUser.name || 'Student',
      username: cleanUsername || undefined,
      bio: editBio.trim() || undefined,
      avatarUrl: editAvatarUrl.trim() || undefined,
      isGuest: false
    };

    try {
      localStorage.setItem('studyvault_active_user', JSON.stringify(updatedUser));
      onUserChange(updatedUser);
      setSuccessMsg('Student profile updated successfully!');
      setTimeout(() => setSuccessMsg(null), 2500);
    } catch (err: any) {
      setErrorMsg(err?.message || 'Failed to update student profile.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveAcademicInfo = async (e: React.FormEvent) => {
    e.preventDefault();

    setIsSaving(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    const cleanInstitution = institution.trim();
    const resolvedInstId =
      institutionId || findUniversityByNameOrFuzzy(cleanInstitution)?.id || activeUser.universityId;
    const isUndergraduate = educationLevel === 'undergraduate';
    const computedYear = isUndergraduate
      ? semester === 'semester_1'
        ? 'First Year (Term 1)'
        : 'Second Year (Term 2)'
      : academicYear;

    const structuredProfile: AcademicProfileInfo = {
      educationLevel,
      undergraduateStage: isUndergraduate ? undergraduateStage : undefined,
      institution: cleanInstitution,
      academicYear: computedYear,
      semester,
      majorOrField: !isUndergraduate
        ? majorOrField.trim()
        : undergraduateStage === 'college'
        ? majorOrField.trim()
        : undefined
    };

    const updatedUser: StudentUser = {
      ...activeUser,
      university: cleanInstitution || activeUser.university || '',
      universityId: resolvedInstId,
      isCustomUniversity: isCustomUni,
      customUniversityDetails: customUniDetails,
      academicProfile: structuredProfile,
      educationLevel,
      undergraduateStage: structuredProfile.undergraduateStage,
      academicYear: structuredProfile.academicYear,
      semester: structuredProfile.semester,
      majorOrField: structuredProfile.majorOrField,
      undergraduateCollege: isUndergraduate
        ? undergraduateStage === 'high_school'
          ? 'High School Division'
          : 'College Division'
        : undefined,
      undergraduateYear: computedYear,
      fieldOfStudy: structuredProfile.majorOrField,
      isGuest: false
    };

    if (resolvedInstId) {
      registerStudentToUniversity(activeUser.id, resolvedInstId);
    }

    try {
      localStorage.setItem('studyvault_active_user', JSON.stringify(updatedUser));
      onUserChange(updatedUser);
      setSuccessMsg('Academic settings saved successfully!');
      setTimeout(() => setSuccessMsg(null), 2500);
    } catch (err: any) {
      setErrorMsg(err?.message || 'Failed to update academic settings.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleSignOut = async () => {
    if (onSignOut) {
      onClose();
      await onSignOut();
      return;
    }
    const supabase = getSupabaseInstance(supabaseConfig);
    await signOutCurrentUser(supabase, user?.id);
    onUserChange(null);
    onClose();
  };

  const getLevelLabel = (lvl?: EducationLevel) => {
    switch (lvl) {
      case 'bachelors':
        return "Bachelor's Program";
      case 'masters':
        return "Master's Program";
      case 'phd':
        return 'PhD Program';
      case 'undergraduate':
      default:
        return 'Undergraduate';
    }
  };

  const navItems: {
    id: UserSettingsTab;
    label: string;
    subtitle: string;
    icon: React.FC<{ className?: string }>;
  }[] = [
    {
      id: 'profile',
      label: 'Student Profile',
      subtitle: 'Identity, photo & bio',
      icon: UserCheck
    },
    {
      id: 'academic',
      label: 'Academic Settings',
      subtitle: 'Degree, major & university',
      icon: GraduationCap
    },
    {
      id: 'appearance',
      label: 'Background Flare',
      subtitle: 'Brightness, origin & RGB tint',
      icon: Sparkles
    },
    {
      id: 'account',
      label: 'Preferences',
      subtitle: 'Privacy & contributor options',
      icon: ShieldCheck
    }
  ];

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="User Settings Window"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/80 backdrop-blur-md animate-in fade-in duration-200 overflow-y-auto"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="relative bg-[#0b0d13]/95 border border-white/15 rounded-2xl sm:rounded-3xl shadow-[0_0_60px_rgba(0,240,255,0.14)] w-full max-w-4xl flex flex-col overflow-hidden backdrop-blur-2xl my-auto max-h-[92vh]">
        {/* Top Accent Glow */}
        <div className="absolute top-0 inset-x-0 h-0.5 bg-gradient-to-r from-transparent via-[#00f0ff] to-transparent" />

        {/* Window Header */}
        <header className="px-4 sm:px-6 py-3.5 sm:py-4 border-b border-white/10 flex items-center justify-between bg-white/[0.02] shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-cyan-500/15 border border-cyan-400/30 flex items-center justify-center text-[#00f0ff] shrink-0 shadow-[0_0_15px_rgba(0,240,255,0.2)]">
              <Settings className="w-4.5 h-4.5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h2 className="text-sm sm:text-base font-bold text-white tracking-tight truncate">
                  User Settings
                </h2>
              </div>
              <p className="text-[11px] text-white/50 truncate">
                Configure your student profile, academic hierarchy, background flare, and preferences
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-white/40 hover:text-white rounded-xl transition-colors cursor-pointer hover:bg-white/10 shrink-0"
            aria-label="Close User Settings"
          >
            <X className="w-5 h-5" />
          </button>
        </header>

        {/* Two-Pane Dedicated User Settings Layout */}
        <div className="flex flex-col md:flex-row flex-1 min-h-0 overflow-hidden">
          {/* Left Sidebar Navigation (Desktop) & Top Tab Strip (Mobile) */}
          <aside className="w-full md:w-64 border-b md:border-b-0 md:border-r border-white/10 bg-black/40 p-2.5 sm:p-4 flex md:flex-col justify-between shrink-0 gap-2 overflow-x-auto no-scrollbar">
            <div className="flex md:flex-col gap-1.5 w-full">
              {/* Compact User Summary Card (Desktop) */}
              <div className="hidden md:flex items-center gap-3 p-3 mb-2 rounded-2xl bg-white/[0.03] border border-white/10">
                <div className="w-10 h-10 rounded-xl overflow-hidden border border-cyan-400/50 shrink-0 flex items-center justify-center bg-cyan-500/10">
                  {activeUser.avatarUrl ? (
                    <img
                      src={activeUser.avatarUrl}
                      alt={activeUser.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <span className="text-sm font-bold text-cyan-300">
                      {activeUser.name.charAt(0).toUpperCase()}
                    </span>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-bold text-white truncate">{activeUser.name}</p>
                  <p className="text-[11px] font-mono text-cyan-300 truncate">
                    @{activeUser.username || 'student'}
                  </p>
                </div>
              </div>

              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => {
                      setActiveTab(item.id);
                      setErrorMsg(null);
                      setSuccessMsg(null);
                    }}
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-all cursor-pointer shrink-0 md:w-full ${
                      isActive
                        ? 'bg-cyan-400 text-black font-bold shadow-[0_0_20px_rgba(0,240,255,0.3)]'
                        : 'text-white/65 hover:text-white hover:bg-white/[0.05]'
                    }`}
                  >
                    <Icon
                      className={`w-4 h-4 shrink-0 ${
                        isActive ? 'text-black' : 'text-cyan-400'
                      }`}
                    />
                    <div className="min-w-0">
                      <div className="text-xs leading-tight whitespace-nowrap">
                        {item.label}
                      </div>
                      <div
                        className={`hidden md:block text-[10px] truncate mt-0.5 ${
                          isActive ? 'text-black/75 font-medium' : 'text-white/40'
                        }`}
                      >
                        {item.subtitle}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Bottom Logout / Reset Button (Desktop Sidebar) */}
            <div className="hidden md:block pt-3 border-t border-white/10">
              <button
                type="button"
                onClick={handleSignOut}
                className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-semibold text-rose-300 hover:text-rose-200 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/25 transition-all cursor-pointer"
              >
                <LogOut className="w-4 h-4 shrink-0" />
                <span>Logout</span>
              </button>
            </div>
          </aside>

          {/* Right Content Pane */}
          <div className="flex-1 p-4 sm:p-6 overflow-y-auto space-y-4 text-xs text-white no-scrollbar [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
            {errorMsg && (
              <div className="p-3 bg-rose-500/10 border border-rose-500/30 text-rose-300 rounded-xl flex items-center gap-2.5 animate-in fade-in">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
                <span className="text-[11px] leading-relaxed">{errorMsg}</span>
              </div>
            )}

            {successMsg && (
              <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 rounded-xl flex items-center gap-2.5 animate-in fade-in">
                <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
                <span className="text-[11px] leading-relaxed">{successMsg}</span>
              </div>
            )}

            {/* ========================================================
                TAB 1: STUDENT PROFILE (Identity, Photo & Bio)
                ======================================================== */}
            {activeTab === 'profile' && (
              <div className="space-y-4">
                {/* Live Student Identity Card Preview */}
                <div className="p-5 bg-white/[0.03] rounded-2xl border border-white/10 space-y-4 relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-36 h-36 bg-cyan-500/10 rounded-full blur-2xl pointer-events-none" />

                  <div className="flex items-start gap-4">
                    <div className="relative">
                      {editAvatarUrl || activeUser.avatarUrl ? (
                        <img
                          src={editAvatarUrl || activeUser.avatarUrl}
                          alt={editName || activeUser.name}
                          className="w-16 h-16 rounded-2xl object-cover border-2 border-cyan-400 shadow-[0_0_20px_rgba(0,240,255,0.25)]"
                        />
                      ) : (
                        <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-cyan-500/20 to-blue-500/20 border-2 border-cyan-400/40 text-cyan-300 flex items-center justify-center font-bold text-2xl shadow-[0_0_20px_rgba(0,240,255,0.25)]">
                          {(editName || activeUser.name).charAt(0).toUpperCase()}
                        </div>
                      )}
                      <span
                        className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-emerald-400 border-2 border-[#0d0f14]"
                        title="Active student profile"
                      />
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-bold text-white text-base tracking-tight truncate">
                          {editName || activeUser.name}
                        </h3>
                        <span className="text-cyan-300 font-mono text-xs">
                          @{(editUsername || activeUser.username || 'student').replace(/^@/, '')}
                        </span>
                      </div>

                      <div className="flex items-center gap-2 mt-2 flex-wrap">
                        <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-400 bg-emerald-400/10 px-2 py-0.5 rounded-md border border-emerald-400/20">
                          <ShieldCheck className="w-3 h-3" />
                          <span>Verified Student</span>
                        </span>

                        <span className="text-[11px] font-mono text-cyan-300 bg-cyan-400/10 px-2 py-0.5 rounded-md border border-cyan-400/20">
                          {getLevelLabel(
                            activeUser.educationLevel || activeUser.academicProfile?.educationLevel
                          )}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="pt-3 border-t border-white/10 grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-white/70 text-xs">
                    <div className="bg-white/[0.02] p-2.5 rounded-xl border border-white/5">
                      <span className="text-[10px] text-white/40 block mb-0.5 font-jetbrains uppercase tracking-wider">
                        Institution / University
                      </span>
                      <span className="font-semibold text-white truncate block">
                        {activeUser.academicProfile?.institution || activeUser.university}
                      </span>
                    </div>
                    <div className="bg-white/[0.02] p-2.5 rounded-xl border border-white/5">
                      <span className="text-[10px] text-white/40 block mb-0.5 font-jetbrains uppercase tracking-wider">
                        Academic Year & Term
                      </span>
                      <span className="font-semibold text-white truncate block">
                        {activeUser.academicProfile?.academicYear ||
                          activeUser.academicYear ||
                          'Freshman (1st Year)'}{' '}
                        •{' '}
                        {(activeUser.academicProfile?.semester || activeUser.semester) === 'semester_2'
                          ? 'Semester 2'
                          : 'Semester 1'}
                      </span>
                    </div>
                  </div>
                </div>

                  {/* Profile Edit Form */}
                  <form onSubmit={handleSaveProfile} className="space-y-4">
                    <div className="p-4 bg-white/[0.03] border border-white/10 rounded-2xl space-y-3">
                      <div className="flex items-center justify-between border-b border-white/10 pb-2.5">
                        <label className="text-xs font-bold text-white tracking-wide uppercase font-jetbrains flex items-center gap-2">
                          <UserIcon className="w-4 h-4 text-cyan-400" />
                          <span>Student Identity</span>
                        </label>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="block text-[11px] font-semibold text-white/80 mb-1">
                            Display Name
                          </label>
                          <input
                            type="text"
                            required
                            value={editName}
                            onChange={(e) => setEditName(e.target.value)}
                            className="w-full px-3 py-2 bg-white/[0.04] border border-white/10 rounded-xl text-white text-xs focus:outline-none focus:border-[#00f0ff] focus:ring-1 focus:ring-[#00f0ff] transition-all"
                          />
                        </div>

                        <div>
                          <label className="block text-[11px] font-semibold text-white/80 mb-1 flex items-center justify-between">
                            <span>Username Handle</span>
                            <span className="text-cyan-300 font-mono text-[10px]">
                              {editUsername ? `@${editUsername.replace(/^@/, '')}` : '@handle'}
                            </span>
                          </label>
                          <div className="relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40 font-mono">
                              @
                            </span>
                            <input
                              type="text"
                              value={editUsername.replace(/^@/, '')}
                              onChange={(e) =>
                                setEditUsername(e.target.value.replace(/[^a-zA-Z0-9_]/g, ''))
                              }
                              className="w-full pl-7 pr-3 py-2 bg-white/[0.04] border border-white/10 rounded-xl text-white text-xs font-mono focus:outline-none focus:border-[#00f0ff] focus:ring-1 focus:ring-[#00f0ff] transition-all"
                            />
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Profile Picture Selection */}
                    <div className="p-4 bg-white/[0.03] border border-white/10 rounded-2xl space-y-3">
                      <label className="block text-xs font-bold text-white tracking-wide uppercase font-jetbrains flex items-center gap-2">
                        <Camera className="w-3.5 h-3.5 text-cyan-400" />
                        <span>Profile Picture</span>
                      </label>

                      <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4">
                        <div className="relative group shrink-0">
                          {editAvatarUrl ? (
                            <img
                              src={editAvatarUrl}
                              alt="Avatar Preview"
                              className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl object-cover border-2 border-cyan-400 shadow-[0_0_20px_rgba(0,240,255,0.3)]"
                            />
                          ) : (
                            <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-white/10 border-2 border-dashed border-white/20 text-white/50 flex flex-col items-center justify-center text-xs">
                              <UserIcon className="w-6 h-6 mb-0.5" />
                              <span className="text-[10px]">No Photo</span>
                            </div>
                          )}
                        </div>

                        <div className="flex-1 w-full space-y-3 text-center sm:text-left">
                          <div className="flex items-center justify-center sm:justify-start gap-2 flex-wrap">
                            <input
                              ref={fileInputRef}
                              type="file"
                              accept="image/*"
                              className="hidden"
                              onChange={handleAvatarFileUpload}
                            />
                            <button
                              type="button"
                              onClick={() => fileInputRef.current?.click()}
                              className="py-1.5 px-3 bg-white/10 hover:bg-white/20 text-white font-medium rounded-lg text-xs transition-colors cursor-pointer flex items-center gap-1.5 active:scale-95"
                            >
                              <Upload className="w-3 h-3" />
                              <span>Upload Custom Image</span>
                            </button>

                            {editAvatarUrl && (
                              <button
                                type="button"
                                onClick={() => setEditAvatarUrl('')}
                                className="py-1.5 px-2.5 text-rose-300 hover:text-rose-200 text-xs transition-colors cursor-pointer"
                              >
                                Reset Photo
                              </button>
                            )}
                          </div>

                          <div className="w-full">
                            <span className="text-[10px] text-white/60 block mb-2 font-jetbrains uppercase tracking-wider flex items-center justify-center sm:justify-start gap-1.5">
                              <Sparkles className="w-3 h-3 text-cyan-400" />
                              <span>Character Avatar Presets</span>
                            </span>
                            <div className="flex items-center justify-center sm:justify-start gap-2 flex-wrap p-2.5 rounded-xl bg-black/40 border border-white/10">
                              {AVATAR_PRESETS.map((preset) => (
                                <button
                                  key={preset.name}
                                  type="button"
                                  onClick={() => setEditAvatarUrl(preset.url)}
                                  title={preset.name}
                                  className={`w-10 h-10 rounded-xl overflow-hidden border p-1 transition-all duration-200 cursor-pointer bg-white/[0.04] active:scale-95 group relative ${
                                    editAvatarUrl === preset.url
                                      ? 'border-[#00f0ff] scale-105 shadow-[0_0_15px_rgba(0,240,255,0.45)] ring-2 ring-[#00f0ff]/60 bg-[#00f0ff]/15'
                                      : 'border-white/15 opacity-80 hover:opacity-100 hover:border-white/35 hover:scale-105'
                                  }`}
                                >
                                  <img
                                    src={preset.url}
                                    alt={preset.name}
                                    className="w-full h-full rounded-lg object-contain"
                                    loading="lazy"
                                  />
                                </button>
                              ))}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Public Bio */}
                    <div className="p-4 bg-white/[0.03] border border-white/10 rounded-2xl space-y-2">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-bold text-white tracking-wide uppercase font-jetbrains flex items-center gap-2">
                          <FileText className="w-3.5 h-3.5 text-cyan-400" />
                          <span>Public Description (Bio)</span>
                        </label>
                        <span className="text-[10px] font-mono text-white/40">
                          {editBio.length} / 300
                        </span>
                      </div>

                      <textarea
                        rows={3}
                        maxLength={300}
                        value={editBio}
                        onChange={(e) => setEditBio(e.target.value)}
                        className="w-full p-3 bg-white/[0.04] border border-white/10 rounded-xl text-white text-xs focus:outline-none focus:border-[#00f0ff] focus:ring-1 focus:ring-[#00f0ff] transition-all resize-none leading-relaxed"
                      />
                    </div>

                    <div className="flex items-center justify-end gap-3 pt-1">
                      <button
                        type="submit"
                        disabled={isSaving}
                        className="py-2.5 px-5 text-xs font-bold text-black bg-[#00f0ff] hover:bg-[#00f0ff]/90 disabled:opacity-50 rounded-xl transition-all cursor-pointer shadow-[0_0_20px_rgba(0,240,255,0.3)] flex items-center justify-center gap-2"
                      >
                        <Check className="w-4 h-4" />
                        <span>{isSaving ? 'Saving Profile...' : 'Save Profile Changes'}</span>
                      </button>
                    </div>
                  </form>
                </div>
              )}

              {/* ========================================================
                  TAB 2: ACADEMIC SETTINGS (Degree, Major & University)
                  ======================================================== */}
              {activeTab === 'academic' && (
                <form onSubmit={handleSaveAcademicInfo} className="space-y-4">
                  <div className="p-4 bg-white/[0.03] border border-white/10 rounded-2xl space-y-4">
                    <div className="flex items-center justify-between border-b border-white/10 pb-3">
                      <label className="text-xs font-bold text-white tracking-wide uppercase font-jetbrains flex items-center gap-2">
                        <GraduationCap className="w-4 h-4 text-cyan-400" />
                        <span>Academic Hierarchy & Institution</span>
                      </label>
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-white/80 uppercase tracking-wider mb-2 font-jetbrains">
                        Education Level
                      </label>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                        {[
                          {
                            id: 'undergraduate',
                            label: 'Undergraduate',
                            desc: 'High School & College'
                          },
                          {
                            id: 'bachelors',
                            label: "Bachelor's Program",
                            desc: '4-Year Degree'
                          },
                          {
                            id: 'masters',
                            label: "Master's Program",
                            desc: 'Graduate Degree'
                          },
                          { id: 'phd', label: 'PhD', desc: 'Doctoral Research' }
                        ].map((lvl) => {
                          const isSelected = educationLevel === lvl.id;
                          return (
                            <button
                              key={lvl.id}
                              type="button"
                              onClick={() =>
                                handleEducationLevelChange(lvl.id as EducationLevel)
                              }
                              className={`p-2.5 text-left rounded-xl transition-all cursor-pointer border flex flex-col justify-between ${
                                isSelected
                                  ? 'bg-cyan-400 text-black border-cyan-400 font-bold shadow-[0_0_15px_rgba(0,240,255,0.35)]'
                                  : 'bg-white/[0.03] text-white/70 border-white/10 hover:border-white/25 hover:text-white'
                              }`}
                            >
                              <div className="flex items-center justify-between mb-1">
                                <span className="text-xs font-bold leading-tight">
                                  {lvl.label}
                                </span>
                                {isSelected && (
                                  <Check className="w-3.5 h-3.5 text-black shrink-0" />
                                )}
                              </div>
                              <span
                                className={`text-[10px] ${
                                  isSelected ? 'text-black/80 font-medium' : 'text-white/40'
                                }`}
                              >
                                {lvl.desc}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {educationLevel === 'undergraduate' && (
                      <div className="p-4 bg-cyan-400/[0.03] border border-cyan-400/20 rounded-xl space-y-4">
                        <div className="flex items-center gap-2 text-cyan-300 text-xs font-bold font-jetbrains">
                          <Layers className="w-3.5 h-3.5" />
                          <span>Undergraduate Configuration</span>
                        </div>

                        <div>
                          <label className="block text-[11px] font-semibold text-white/80 mb-1.5">
                            Academic Stage
                          </label>
                          <div className="grid grid-cols-2 gap-2">
                            {[
                              {
                                id: 'high_school',
                                label: 'High School',
                                subtitle: 'Secondary education'
                              },
                              {
                                id: 'college',
                                label: 'College',
                                subtitle: 'Higher education institution'
                              }
                            ].map((stage) => {
                              const isStageSelected = undergraduateStage === stage.id;
                              return (
                                <button
                                  key={stage.id}
                                  type="button"
                                  onClick={() =>
                                    setUndergraduateStage(stage.id as UndergraduateStage)
                                  }
                                  className={`py-2 px-3 text-left rounded-xl transition-all cursor-pointer border ${
                                    isStageSelected
                                      ? 'bg-white text-black border-white font-bold shadow-sm'
                                      : 'bg-white/[0.04] text-white/70 border-white/10 hover:text-white'
                                  }`}
                                >
                                  <div className="flex items-center justify-between">
                                    <span className="text-xs font-semibold">{stage.label}</span>
                                    {isStageSelected && <Check className="w-3 h-3 text-black" />}
                                  </div>
                                  <span
                                    className={`text-[10px] ${
                                      isStageSelected ? 'text-black/70' : 'text-white/40'
                                    }`}
                                  >
                                    {stage.subtitle}
                                  </span>
                                </button>
                              );
                            })}
                          </div>
                        </div>

                        <HecUniversitySelect
                          label="Academic Institution"
                          value={institution}
                          onChange={(uniName, uniId, isCust, details) => {
                            setInstitution(uniName);
                            setInstitutionId(uniId);
                            setIsCustomUni(Boolean(isCust));
                            setCustomUniDetails(details);
                          }}
                          placeholder="Select HEC university or college..."
                          studentId={activeUser.id}
                          required
                        />

                        <div>
                          <label className="block text-[11px] font-semibold text-white/80 mb-1.5">
                            Academic Year / Term
                          </label>
                          <div className="grid grid-cols-2 gap-2">
                            {[
                              {
                                id: 'semester_1',
                                label: 'First Year / Term 1',
                                subtitle: 'Initial Academic Cycle'
                              },
                              {
                                id: 'semester_2',
                                label: 'Second Year / Term 2',
                                subtitle: 'Advanced Academic Cycle'
                              }
                            ].map((sem) => {
                              const isSelected = semester === sem.id;
                              return (
                                <button
                                  key={sem.id}
                                  type="button"
                                  onClick={() => {
                                    setSemester(sem.id as AcademicSemester);
                                    setAcademicYear(
                                      sem.id === 'semester_1'
                                        ? 'First Year (Term 1)'
                                        : 'Second Year (Term 2)'
                                    );
                                  }}
                                  className={`py-2.5 px-3 text-left rounded-xl transition-all cursor-pointer border flex flex-col justify-between ${
                                    isSelected
                                      ? 'bg-cyan-400 text-black border-cyan-400 font-bold shadow-[0_0_12px_rgba(0,240,255,0.3)]'
                                      : 'bg-white/[0.04] text-white/70 border-white/10 hover:text-white'
                                  }`}
                                >
                                  <div className="flex items-center justify-between mb-0.5">
                                    <span className="text-xs font-semibold">{sem.label}</span>
                                    {isSelected && (
                                      <Check className="w-3.5 h-3.5 text-black shrink-0" />
                                    )}
                                  </div>
                                  <span
                                    className={`text-[10px] ${
                                      isSelected
                                        ? 'text-black/80 font-medium'
                                        : 'text-white/40'
                                    }`}
                                  >
                                    {sem.subtitle}
                                  </span>
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      </div>
                    )}

                    {educationLevel === 'bachelors' && (
                      <div className="p-4 bg-cyan-400/[0.03] border border-cyan-400/20 rounded-xl space-y-4">
                        <div className="flex items-center gap-2 text-cyan-300 text-xs font-bold font-jetbrains">
                          <BookOpen className="w-3.5 h-3.5" />
                          <span>Bachelor's Program</span>
                        </div>

                        <FieldSlidingSelector
                          label="Major / Field of Study"
                          fieldValue={majorOrField}
                          onSelectField={(f) => setMajorOrField(f)}
                          placeholder="e.g. Computer Science, Mechanical Engineering, Economics"
                          levelBadge="Bachelor's"
                        />

                        <HecUniversitySelect
                          label="Major University / Institution Name"
                          value={institution}
                          onChange={(uniName, uniId, isCust, details) => {
                            setInstitution(uniName);
                            setInstitutionId(uniId);
                            setIsCustomUni(Boolean(isCust));
                            setCustomUniDetails(details);
                          }}
                          placeholder="Select HEC university or institution..."
                          studentId={activeUser.id}
                          required
                        />

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div>
                            <label className="block text-[11px] font-semibold text-white/80 mb-1">
                              Academic Year
                            </label>
                            <select
                              value={academicYear}
                              onChange={(e) => setAcademicYear(e.target.value)}
                              className="w-full px-3.5 py-2.5 bg-[#12141a] border border-white/15 rounded-xl text-white text-xs focus:outline-none focus:border-[#00f0ff] cursor-pointer"
                            >
                              {UNDERGRAD_BACHELORS_YEARS.map((yr) => (
                                <option key={yr} value={yr}>
                                  {yr}
                                </option>
                              ))}
                            </select>
                          </div>

                          <div>
                            <label className="block text-[11px] font-semibold text-white/80 mb-1">
                              Semester
                            </label>
                            <div className="grid grid-cols-2 gap-1.5">
                              {[
                                { id: 'semester_1', label: 'Semester 1' },
                                { id: 'semester_2', label: 'Semester 2' }
                              ].map((sem) => (
                                <button
                                  key={sem.id}
                                  type="button"
                                  onClick={() => setSemester(sem.id as AcademicSemester)}
                                  className={`py-2 px-2 text-center rounded-xl font-medium text-xs transition-all cursor-pointer border ${
                                    semester === sem.id
                                      ? 'bg-cyan-400 text-black border-cyan-400 font-bold'
                                      : 'bg-white/[0.04] text-white/70 border-white/10 hover:text-white'
                                  }`}
                                >
                                  {sem.label}
                                </button>
                              ))}
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    {educationLevel === 'masters' && (
                      <div className="p-4 bg-cyan-400/[0.03] border border-cyan-400/20 rounded-xl space-y-4">
                        <div className="flex items-center gap-2 text-cyan-300 text-xs font-bold font-jetbrains">
                          <Compass className="w-3.5 h-3.5" />
                          <span>Master's Program</span>
                        </div>

                        <FieldSlidingSelector
                          label="Major / Field of Study (Specialization)"
                          fieldValue={majorOrField}
                          onSelectField={(f) => setMajorOrField(f)}
                          placeholder="e.g. Artificial Intelligence, MBA, Data Science"
                          levelBadge="Master's"
                        />

                        <HecUniversitySelect
                          label="Major University / Institution Name"
                          value={institution}
                          onChange={(uniName, uniId, isCust, details) => {
                            setInstitution(uniName);
                            setInstitutionId(uniId);
                            setIsCustomUni(Boolean(isCust));
                            setCustomUniDetails(details);
                          }}
                          placeholder="Select HEC university or institution..."
                          studentId={activeUser.id}
                          required
                        />

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div>
                            <label className="block text-[11px] font-semibold text-white/80 mb-1">
                              Academic Year
                            </label>
                            <div className="grid grid-cols-2 gap-1.5">
                              {MASTERS_YEARS.map((yr) => (
                                <button
                                  key={yr}
                                  type="button"
                                  onClick={() => setAcademicYear(yr)}
                                  className={`py-2 px-2 text-center rounded-xl font-medium text-xs transition-all cursor-pointer border ${
                                    academicYear === yr
                                      ? 'bg-cyan-400 text-black border-cyan-400 font-bold'
                                      : 'bg-white/[0.04] text-white/70 border-white/10 hover:text-white'
                                  }`}
                                >
                                  {yr}
                                </button>
                              ))}
                            </div>
                          </div>

                          <div>
                            <label className="block text-[11px] font-semibold text-white/80 mb-1">
                              Semester
                            </label>
                            <div className="grid grid-cols-2 gap-1.5">
                              {[
                                { id: 'semester_1', label: 'Semester 1' },
                                { id: 'semester_2', label: 'Semester 2' }
                              ].map((sem) => (
                                <button
                                  key={sem.id}
                                  type="button"
                                  onClick={() => setSemester(sem.id as AcademicSemester)}
                                  className={`py-2 px-2 text-center rounded-xl font-medium text-xs transition-all cursor-pointer border ${
                                    semester === sem.id
                                      ? 'bg-cyan-400 text-black border-cyan-400 font-bold'
                                      : 'bg-white/[0.04] text-white/70 border-white/10 hover:text-white'
                                  }`}
                                >
                                  {sem.label}
                                </button>
                              ))}
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    {educationLevel === 'phd' && (
                      <div className="p-4 bg-cyan-400/[0.03] border border-cyan-400/20 rounded-xl space-y-4">
                        <div className="flex items-center gap-2 text-cyan-300 text-xs font-bold font-jetbrains">
                          <Award className="w-3.5 h-3.5" />
                          <span>PhD Program</span>
                        </div>

                        <FieldSlidingSelector
                          label="Major / Research Field"
                          fieldValue={majorOrField}
                          onSelectField={(f) => setMajorOrField(f)}
                          placeholder="e.g. Distributed Consensus, Quantum Photonics, Neurobiology"
                          levelBadge="Doctoral / PhD"
                        />

                        <HecUniversitySelect
                          label="Major University / Institution Name"
                          value={institution}
                          onChange={(uniName, uniId, isCust, details) => {
                            setInstitution(uniName);
                            setInstitutionId(uniId);
                            setIsCustomUni(Boolean(isCust));
                            setCustomUniDetails(details);
                          }}
                          placeholder="Select HEC doctoral university or institution..."
                          studentId={activeUser.id}
                          required
                        />

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div>
                            <label className="block text-[11px] font-semibold text-white/80 mb-1">
                              Academic Year
                            </label>
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                              {PHD_YEARS.map((yr) => (
                                <button
                                  key={yr}
                                  type="button"
                                  onClick={() => setAcademicYear(yr)}
                                  className={`py-2 px-1 text-center rounded-xl font-medium text-xs transition-all cursor-pointer border ${
                                    academicYear === yr
                                      ? 'bg-cyan-400 text-black border-cyan-400 font-bold'
                                      : 'bg-white/[0.04] text-white/70 border-white/10 hover:text-white'
                                  }`}
                                >
                                  {yr}
                                </button>
                              ))}
                            </div>
                          </div>

                          <div>
                            <label className="block text-[11px] font-semibold text-white/80 mb-1">
                              Semester
                            </label>
                            <div className="grid grid-cols-2 gap-1.5">
                              {[
                                { id: 'semester_1', label: 'Semester 1' },
                                { id: 'semester_2', label: 'Semester 2' }
                              ].map((sem) => (
                                <button
                                  key={sem.id}
                                  type="button"
                                  onClick={() => setSemester(sem.id as AcademicSemester)}
                                  className={`py-2 px-2 text-center rounded-xl font-medium text-xs transition-all cursor-pointer border ${
                                    semester === sem.id
                                      ? 'bg-cyan-400 text-black border-cyan-400 font-bold'
                                      : 'bg-white/[0.04] text-white/70 border-white/10 hover:text-white'
                                  }`}
                                >
                                  {sem.label}
                                </button>
                              ))}
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center justify-end gap-3 pt-1">
                    <button
                      type="submit"
                      disabled={isSaving}
                      className="py-2.5 px-5 text-xs font-bold text-black bg-[#00f0ff] hover:bg-[#00f0ff]/90 disabled:opacity-50 rounded-xl transition-all cursor-pointer shadow-[0_0_20px_rgba(0,240,255,0.3)] flex items-center justify-center gap-2"
                    >
                      <Check className="w-4 h-4" />
                      <span>{isSaving ? 'Saving Academic Settings...' : 'Save Academic Settings'}</span>
                    </button>
                  </div>
                </form>
              )}

              {/* ========================================================
                  TAB 3: BACKGROUND FLARE & APPEARANCE
                  ======================================================== */}
              {activeTab === 'appearance' && (
                <div className="p-4 sm:p-5 bg-white/[0.03] border border-white/10 rounded-2xl space-y-4">
                  <div className="flex items-center justify-between border-b border-white/10 pb-3">
                    <label className="text-xs font-bold text-white tracking-wide uppercase font-jetbrains flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-cyan-400" />
                      <span>Atmospheric Background Flare</span>
                    </label>
                    <button
                      type="button"
                      onClick={onResetFlare}
                      className="text-[11px] text-white/60 hover:text-white flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 transition-colors cursor-pointer"
                    >
                      <RotateCcw className="w-3 h-3 text-cyan-400" />
                      <span>Reset Default</span>
                    </button>
                  </div>

                  {/* Lock / Unlock Toggle */}
                  <div className="p-3.5 bg-black/50 border border-white/10 rounded-xl">
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div
                          className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 border transition-all ${
                            isFlareLocked
                              ? 'bg-amber-500/15 border-amber-500/40 text-amber-400'
                              : 'bg-emerald-500/15 border-emerald-500/40 text-emerald-400'
                          }`}
                        >
                          {isFlareLocked ? (
                            <Lock className="w-4 h-4" />
                          ) : (
                            <Unlock className="w-4 h-4" />
                          )}
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-semibold text-white text-xs">
                              {isFlareLocked
                                ? 'Flare Corner & Color: Locked'
                                : 'Flare Corner & Color: Dynamic'}
                            </span>
                            <span
                              className={`text-[10px] font-mono px-2 py-0.5 rounded-full border ${
                                isFlareLocked
                                  ? 'bg-amber-500/10 text-amber-300 border-amber-500/30'
                                  : 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30'
                              }`}
                            >
                              {isFlareLocked ? 'Frozen at Latest' : 'Interactive'}
                            </span>
                          </div>
                          <p className="text-[11px] text-white/60 mt-0.5">
                            {isFlareLocked
                              ? 'The flare is locked at its latest position and color.'
                              : 'Clicking anywhere dynamically glides the flare to that corner and cycles hues.'}
                          </p>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => onToggleFlareLock?.(!isFlareLocked)}
                        className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full p-0.5 transition-colors duration-200 ${
                          isFlareLocked ? 'bg-amber-500' : 'bg-white/20 hover:bg-white/30'
                        }`}
                        role="switch"
                        aria-checked={isFlareLocked}
                      >
                        <span
                          className={`pointer-events-none inline-flex items-center justify-center h-5 w-5 rounded-full bg-black shadow-md transition-transform duration-200 ${
                            isFlareLocked ? 'translate-x-5' : 'translate-x-0'
                          }`}
                        >
                          {isFlareLocked ? (
                            <Lock className="w-3 h-3 text-amber-300 stroke-[2.5]" />
                          ) : (
                            <Unlock className="w-3 h-3 text-white/90 stroke-[2.5]" />
                          )}
                        </span>
                      </button>
                    </div>
                  </div>

                  {/* Brightness Intensity Slider */}
                  <div className="p-3.5 bg-black/40 border border-white/10 rounded-xl space-y-3">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-medium text-white/90 flex items-center gap-1.5">
                        <Sliders className="w-3.5 h-3.5 text-cyan-400" />
                        <span>Brightness Intensity</span>
                      </span>
                      <span className="text-[11px] font-mono font-bold text-cyan-300 bg-cyan-400/10 px-2.5 py-0.5 rounded-full border border-cyan-400/30">
                        {Math.round(rayBrightness * 100)}%
                      </span>
                    </div>

                    <div className="space-y-2">
                      <input
                        type="range"
                        min={0}
                        max={1.0}
                        step={0.05}
                        value={rayBrightness}
                        onChange={(e) => onChangeRayBrightness?.(parseFloat(e.target.value))}
                        className="w-full h-2 rounded-lg appearance-none cursor-pointer bg-white/15 accent-[#00f0ff] focus:outline-none"
                      />
                      <div className="flex items-center justify-between gap-1.5 pt-0.5">
                        {[
                          { label: 'Subtle (25%)', value: 0.25 },
                          { label: 'Default (50%)', value: 0.5 },
                          { label: 'Balanced (75%)', value: 0.75 },
                          { label: 'Bright (100%)', value: 1.0 },
                        ].map((preset) => {
                          const isSelected = Math.abs(rayBrightness - preset.value) < 0.03;
                          return (
                            <button
                              key={preset.label}
                              type="button"
                              onClick={() => onChangeRayBrightness?.(preset.value)}
                              className={`flex-1 py-1 px-1.5 rounded-lg text-[10px] font-mono transition-all cursor-pointer border text-center truncate ${
                                isSelected
                                  ? 'bg-cyan-500/20 border-cyan-400/60 text-cyan-300 font-bold'
                                  : 'bg-white/[0.03] border-white/10 text-white/50 hover:text-white hover:bg-white/10'
                              }`}
                            >
                              {preset.label}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>

                  {/* Origin / Position Selector */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-medium text-white/80 flex items-center gap-1.5">
                        <Compass className="w-3.5 h-3.5 text-cyan-400" />
                        <span>Position / Origin</span>
                      </span>
                      <span className="text-[10px] font-mono text-cyan-300 bg-cyan-400/10 px-2 py-0.5 rounded border border-cyan-400/20">
                        {rayOrigin}
                      </span>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      {FLARE_ORIGIN_OPTIONS.map((opt) => {
                        const isSelected = rayOrigin === opt.value;
                        return (
                          <button
                            key={opt.value}
                            type="button"
                            onClick={() => onChangeRayOrigin?.(opt.value)}
                            className={`py-2 px-2.5 rounded-xl text-[11px] font-medium border text-center transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                              isSelected
                                ? 'bg-cyan-500/15 border-cyan-400/60 text-cyan-300 font-semibold'
                                : 'bg-white/[0.02] border-white/10 text-white/60 hover:text-white hover:bg-white/5'
                            }`}
                          >
                            {isSelected && <Check className="w-3 h-3 text-cyan-400 shrink-0" />}
                            <span className="truncate">{opt.label}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Color Palette Swatches & RGB Selection */}
                  <div className="space-y-2.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-medium text-white/80 flex items-center gap-1.5">
                        <Palette className="w-3.5 h-3.5 text-cyan-400" />
                        <span>Color Tint</span>
                      </span>
                      <div className="flex items-center gap-1.5">
                        <span
                          className="w-3.5 h-3.5 rounded-full border border-white/40 shadow-sm shrink-0"
                          style={
                            rayColor.toLowerCase() === 'rgb'
                              ? {
                                  background:
                                    'conic-gradient(from 0deg, #ff0055, #ffaa00, #00ff66, #00f0ff, #7c3aed, #ff0055)'
                                }
                              : { backgroundColor: rayColor }
                          }
                        />
                        <span className="text-[11px] font-mono text-white/80 font-medium">
                          {rayColor.toLowerCase() === '#9ca3af'
                            ? 'Ash Grey (Default)'
                            : rayColor.toLowerCase() === 'rgb'
                            ? 'RGB Spectrum'
                            : rayColor.toUpperCase()}
                        </span>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      {FLARE_PRESET_COLORS.map((color) => {
                        const isSelected = rayColor.toLowerCase() === color.hex.toLowerCase();
                        return (
                          <button
                            key={color.hex}
                            type="button"
                            onClick={() => onChangeRayColor?.(color.hex)}
                            className={`p-2 rounded-xl text-[11px] font-medium border transition-all cursor-pointer flex items-center gap-2 ${
                              isSelected
                                ? color.isRgb
                                  ? 'bg-gradient-to-r from-rose-500/20 via-emerald-500/20 to-cyan-500/20 border-cyan-400/60 text-white font-semibold'
                                  : 'bg-white/10 border-white/40 text-white font-semibold'
                                : 'bg-white/[0.02] border-white/10 text-white/60 hover:text-white hover:bg-white/5'
                            }`}
                          >
                            <span
                              className="w-3.5 h-3.5 rounded-full shrink-0 border border-white/30"
                              style={
                                color.isRgb
                                  ? {
                                      background:
                                        'conic-gradient(from 0deg, #ff0055, #ffaa00, #00ff66, #00f0ff, #7c3aed, #ff0055)'
                                    }
                                  : { backgroundColor: color.hex }
                              }
                            />
                            <span className="truncate">{color.name}</span>
                          </button>
                        );
                      })}
                    </div>

                    {/* Custom RGB Color Picker */}
                    <div className="flex items-center justify-between gap-3 p-2.5 rounded-xl bg-black/40 border border-white/10">
                      <div className="flex items-center gap-2 min-w-0">
                        <div
                          className="w-4 h-4 rounded-md shrink-0 border border-white/30"
                          style={{
                            background:
                              'linear-gradient(135deg, #ff0055 0%, #00ff66 50%, #00f0ff 100%)'
                          }}
                        />
                        <span className="text-[11px] text-white/75 font-medium truncate">
                          Custom RGB Color Picker
                        </span>
                      </div>
                      <label className="flex items-center gap-2 px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 border border-white/15 cursor-pointer transition-colors shrink-0">
                        <input
                          type="color"
                          value={
                            rayColor.startsWith('#') && rayColor.length === 7
                              ? rayColor
                              : '#00f0ff'
                          }
                          onChange={(e) => onChangeRayColor?.(e.target.value)}
                          className="w-4 h-4 rounded cursor-pointer bg-transparent border-0 p-0"
                        />
                        <span className="text-[10px] font-mono text-cyan-300">
                          {rayColor.startsWith('#') ? rayColor.toUpperCase() : 'Pick RGB'}
                        </span>
                      </label>
                    </div>
                  </div>
                </div>
              )}

              {/* ========================================================
                  TAB 4: PRIVACY & PREFERENCES
                  ======================================================== */}
              {activeTab === 'account' && (
                <div className="space-y-4">
                  {/* Privacy & Study Preferences */}
                  <div className="p-4 bg-white/[0.03] border border-white/10 rounded-2xl space-y-3">
                    <div className="flex items-center justify-between border-b border-white/10 pb-2.5">
                      <label className="text-xs font-bold text-white tracking-wide uppercase font-jetbrains flex items-center gap-2">
                        <ShieldCheck className="w-4 h-4 text-cyan-400" />
                        <span>Privacy & Contributor Preferences</span>
                      </label>
                    </div>

                    <div className="space-y-2.5">
                      <div className="flex items-center justify-between p-3 rounded-xl bg-black/40 border border-white/10">
                        <div>
                          <p className="text-xs font-semibold text-white">
                            Display Verified Student Badge on Uploads
                          </p>
                          <p className="text-[11px] text-white/50">
                            Shows your @handle and verified status on study materials you share
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            const next = !publicBadgeEnabled;
                            setPublicBadgeEnabled(next);
                            try {
                              localStorage.setItem(
                                'xeusar_pref_public_badge',
                                JSON.stringify(next)
                              );
                            } catch {}
                          }}
                          className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full p-0.5 transition-colors ${
                            publicBadgeEnabled ? 'bg-cyan-400' : 'bg-white/20'
                          }`}
                        >
                          <span
                            className={`inline-block h-5 w-5 rounded-full bg-black transition-transform ${
                              publicBadgeEnabled ? 'translate-x-5' : 'translate-x-0'
                            }`}
                          />
                        </button>
                      </div>

                      <div className="flex items-center justify-between p-3 rounded-xl bg-black/40 border border-white/10">
                        <div>
                          <p className="text-xs font-semibold text-white">
                            Show University & Program Affiliation
                          </p>
                          <p className="text-[11px] text-white/50">
                            Displays your institution and degree tier alongside your profile
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            const next = !showUniOnNotes;
                            setShowUniOnNotes(next);
                            try {
                              localStorage.setItem('xeusar_pref_uni_badge', JSON.stringify(next));
                            } catch {}
                          }}
                          className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full p-0.5 transition-colors ${
                            showUniOnNotes ? 'bg-cyan-400' : 'bg-white/20'
                          }`}
                        >
                          <span
                            className={`inline-block h-5 w-5 rounded-full bg-black transition-transform ${
                              showUniOnNotes ? 'translate-x-5' : 'translate-x-0'
                            }`}
                          />
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Mobile Sign Out Button */}
                  <div className="md:hidden pt-1">
                    <button
                      type="button"
                      onClick={handleSignOut}
                      className="w-full py-3 px-4 rounded-xl text-xs font-semibold text-rose-300 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 flex items-center justify-center gap-2 cursor-pointer"
                    >
                      <LogOut className="w-4 h-4" />
                      <span>Sign Out of Session</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
      </div>
    </div>
  );
};
