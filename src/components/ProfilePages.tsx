import React, { useState, useEffect, useRef } from 'react';
import {
  User as UserIcon,
  GraduationCap,
  Settings,
  Sliders,
  LogOut,
  Camera,
  Upload,
  Check,
  CheckCircle2,
  AlertCircle,
  Loader2,
  AtSign,
  Mail,
  FileText,
  BookOpen,
  Layers,
  Compass,
  Award,
  ChevronLeft,
  ChevronRight,
  Plus,
  Edit3,
  ShieldCheck,
  KeyRound,
  Lock,
  Unlock,
  RotateCcw,
  Palette,
  Sparkles,
  Bell,
  Globe,
  Eye,
  EyeOff,
  ArrowRight,
  ArrowLeft,
  X
} from 'lucide-react';
import {
  StudentUser,
  SupabaseConfig,
  EducationLevel,
  UndergraduateStage,
  AcademicSemester,
  UserSettingsData,
  UserPreferencesData
} from '../types/index.ts';
import { getSupabaseInstance } from '../lib/supabaseClient.ts';
import { RaysOrigin } from './LightRays.tsx';
import { HecUniversitySelect } from './university/HecUniversitySelect.tsx';
import { registerStudentToUniversity } from '../lib/universityStore.ts';
import {
  DEFAULT_USER_SETTINGS,
  DEFAULT_USER_PREFERENCES,
  validateDisplayName,
  validateUsernameFormat,
  validatePasswordStrength,
  checkUsernameAvailability,
  saveUserProfileToSupabase,
  uploadProfileAvatar,
  saveSetupDraft,
  loadSetupDraft,
  loadPendingSignupDraft
} from '../lib/profileService.ts';

export type ProfileManagementSection =
  | 'profile'
  | 'academic'
  | 'settings'
  | 'preferences';

interface ProfilePagesProps {
  pageMode: 'setup' | 'management';
  user: StudentUser;
  supabaseConfig: SupabaseConfig;
  initialSection?: ProfileManagementSection;
  onUserUpdated: (updatedUser: StudentUser) => void;
  onSetupCompleted: (updatedUser: StudentUser) => void;
  onSignOut: () => void;
  onBackToDashboard: () => void;
  // Atmospheric Background Flare appearance controls
  isFlareLocked: boolean;
  onToggleFlareLock: (locked: boolean) => void;
  rayColor: string;
  onChangeRayColor: (color: string) => void;
  rayOrigin: RaysOrigin;
  onChangeRayOrigin: (origin: RaysOrigin) => void;
  rayBrightness: number;
  onChangeRayBrightness: (brightness: number) => void;
  onResetFlare: () => void;
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
  { name: 'Pure Platinum', hex: '#ffffff' }
];

const FLARE_ORIGIN_OPTIONS: { label: string; value: RaysOrigin }[] = [
  { label: 'Top Center (Default)', value: 'top-center' },
  { label: 'Top Left', value: 'top-left' },
  { label: 'Top Right', value: 'top-right' },
  { label: 'Bottom Center', value: 'bottom-center' },
  { label: 'Bottom Left', value: 'bottom-left' },
  { label: 'Bottom Right', value: 'bottom-right' }
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
  placeholder = 'Enter or select field of study (Optional)',
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
          <span className="text-[10px] text-white/40 font-normal">(Optional)</span>
          {levelBadge && (
            <span className="text-[9px] px-1.5 py-0.5 rounded bg-cyan-400/10 text-cyan-300 font-mono border border-cyan-400/20">
              {levelBadge}
            </span>
          )}
        </label>
        {fieldValue && (
          <div className="flex items-center gap-2 shrink-0">
            <span className="text-[10px] text-cyan-300/80 font-mono truncate max-w-[180px]">
              {isPredefined ? 'Selected' : 'Custom'}: {fieldValue}
            </span>
            <button
              type="button"
              onClick={() => onSelectField('')}
              className="text-[10px] text-white/40 hover:text-white cursor-pointer"
            >
              Clear
            </button>
          </div>
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
            <span>Other Field</span>
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
          value={fieldValue}
          onChange={(e) => {
            onSelectField(e.target.value);
            if (e.target.value && !ALL_MAJOR_FIELDS.includes(e.target.value)) {
              setIsCustomMode(true);
            }
          }}
          placeholder={isCustomMode ? 'Type custom field or major (Optional)...' : placeholder}
          className={`w-full px-3.5 py-2.5 rounded-xl text-xs transition-all border ${
            isCustomMode
              ? 'bg-amber-400/[0.04] border-amber-400/40 text-amber-100 placeholder-amber-200/40 focus:border-amber-400 focus:ring-1 focus:ring-amber-400'
              : 'bg-white/[0.04] border-white/15 text-white placeholder-white/30 focus:border-[#00f0ff] focus:ring-1 focus:ring-[#00f0ff]'
          }`}
        />
        {isCustomMode && (
          <div className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] text-amber-400/80 font-mono flex items-center gap-1 pointer-events-none">
            <Edit3 className="w-3 h-3" />
            <span>Custom</span>
          </div>
        )}
      </div>
    </div>
  );
};

export const ProfilePages: React.FC<ProfilePagesProps> = ({
  pageMode,
  user,
  supabaseConfig,
  initialSection = 'profile',
  onUserUpdated,
  onSetupCompleted,
  onSignOut,
  onBackToDashboard,
  isFlareLocked,
  onToggleFlareLock,
  rayColor,
  onChangeRayColor,
  rayOrigin,
  onChangeRayOrigin,
  rayBrightness,
  onChangeRayBrightness,
  onResetFlare
}) => {
  const [activeSection, setActiveSection] = useState<ProfileManagementSection>(initialSection);

  // Basic Profile State (Display Name & Username are the ONLY mandatory fields)
  const initialDraft = pageMode === 'setup' ? loadSetupDraft(user.id) : null;
  const initialPending = loadPendingSignupDraft(user.email);
  const [displayName, setDisplayName] = useState(
    () =>
      initialDraft?.displayName?.trim() ||
      initialPending?.displayName?.trim() ||
      user.name?.trim() ||
      ''
  );
  const [username, setUsername] = useState(
    () =>
      initialDraft?.username?.trim() ||
      initialPending?.username?.trim() ||
      user.username?.trim() ||
      ''
  );
  const [bio, setBio] = useState(user.bio || '');
  const [avatarUrl, setAvatarUrl] = useState(user.avatarUrl || '');
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);

  // Academic Information State (ALL Optional)
  const [educationLevel, setEducationLevel] = useState<EducationLevel | ''>(
    user.academicProfile?.educationLevel || user.educationLevel || ''
  );
  const [undergraduateStage, setUndergraduateStage] = useState<UndergraduateStage>(
    user.academicProfile?.undergraduateStage || user.undergraduateStage || 'college'
  );
  const [majorOrField, setMajorOrField] = useState(
    user.academicProfile?.majorOrField || user.majorOrField || ''
  );
  const [institution, setInstitution] = useState(
    user.academicProfile?.institution || user.university || ''
  );
  const [academicYear, setAcademicYear] = useState(
    user.academicProfile?.academicYear || user.academicYear || ''
  );
  const [semester, setSemester] = useState<AcademicSemester | ''>(
    user.academicProfile?.semester || user.semester || ''
  );

  // Settings State
  const [settings, setSettings] = useState<UserSettingsData>(() => ({
    ...DEFAULT_USER_SETTINGS,
    ...(user.settings || {}),
    flareLocked: isFlareLocked,
    rayColor,
    rayOrigin,
    rayBrightness
  }));

  // Password Update State (Inside Settings -> Password & Security)
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);

  // Preferences State
  const [preferences, setPreferences] = useState<UserPreferencesData>(() => ({
    ...DEFAULT_USER_PREFERENCES,
    ...(user.preferences || {})
  }));
  const [customSubjectInput, setCustomSubjectInput] = useState('');

  // Username availability feedback
  const [checkingUsername, setCheckingUsername] = useState(false);
  const [usernameAvailable, setUsernameAvailable] = useState<boolean | null>(null);
  const [usernameHint, setUsernameHint] = useState<string | null>(null);

  // Submission & Feedback State
  const [isSaving, setIsSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Hydrate from user & any saved setup draft when user changes
  useEffect(() => {
    const draft = pageMode === 'setup' ? loadSetupDraft(user.id) : null;
    const pending = loadPendingSignupDraft(user.email);
    const nextDisplayName =
      draft?.displayName?.trim() ||
      pending?.displayName?.trim() ||
      user.name?.trim() ||
      '';
    const nextUsername =
      draft?.username?.trim() ||
      pending?.username?.trim() ||
      user.username?.trim() ||
      '';

    setDisplayName((prev) => prev.trim() || nextDisplayName);
    setUsername((prev) => prev.trim() || nextUsername);
    setBio((prev) => prev || draft?.bio || user.bio || '');
    setAvatarUrl((prev) => prev || draft?.avatarUrl || user.avatarUrl || '');
    setEducationLevel(
      (draft?.educationLevel as EducationLevel | '') ||
        user.academicProfile?.educationLevel ||
        user.educationLevel ||
        ''
    );
    setUndergraduateStage(
      draft?.undergraduateStage ||
        user.academicProfile?.undergraduateStage ||
        user.undergraduateStage ||
        'college'
    );
    setMajorOrField(
      draft?.majorOrField || user.academicProfile?.majorOrField || user.majorOrField || ''
    );
    setInstitution(
      draft?.institution || user.academicProfile?.institution || user.university || ''
    );
    setAcademicYear(
      draft?.academicYear || user.academicProfile?.academicYear || user.academicYear || ''
    );
    setSemester(
      (draft?.semester as AcademicSemester | '') ||
        user.academicProfile?.semester ||
        user.semester ||
        ''
    );
  }, [user.id, user.name, user.username, user.email, pageMode]);

  useEffect(() => {
    setActiveSection(initialSection);
  }, [initialSection]);

  // Preserve partial setup progress automatically if the user leaves before completing setup
  useEffect(() => {
    if (pageMode !== 'setup' || !user.id) return;
    saveSetupDraft(user.id, {
      displayName,
      username,
      bio,
      avatarUrl,
      educationLevel,
      undergraduateStage,
      majorOrField,
      institution,
      academicYear,
      semester,
      settings,
      preferences
    });
  }, [
    pageMode,
    user.id,
    displayName,
    username,
    bio,
    avatarUrl,
    educationLevel,
    undergraduateStage,
    majorOrField,
    institution,
    academicYear,
    semester,
    settings,
    preferences
  ]);

  // Debounced case-insensitive username availability check
  useEffect(() => {
    const trimmed = username.trim().toLowerCase();
    if (!trimmed) {
      setUsernameAvailable(false);
      setUsernameHint('Username is required.');
      return;
    }

    const formatCheck = validateUsernameFormat(trimmed);
    if (!formatCheck.valid) {
      setUsernameAvailable(false);
      setUsernameHint(formatCheck.error || 'Invalid username format.');
      return;
    }

    if (user.username && trimmed === user.username.trim().toLowerCase()) {
      setUsernameAvailable(true);
      setUsernameHint('Your current username');
      return;
    }

    const supabase = getSupabaseInstance(supabaseConfig);
    if (!supabase) {
      setUsernameAvailable(true);
      setUsernameHint('Username format is valid.');
      return;
    }

    let cancelled = false;
    setCheckingUsername(true);
    const timer = setTimeout(async () => {
      const res = await checkUsernameAvailability(supabase, trimmed, user.id);
      if (cancelled) return;
      setCheckingUsername(false);
      setUsernameAvailable(res.available);
      setUsernameHint(
        res.available ? `@${trimmed} is available` : res.error || `@${trimmed} is already taken`
      );
    }, 350);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [username, user.id, user.username, supabaseConfig]);

  // Avatar file upload handler
  const handleAvatarFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setErrorMsg(null);
    const supabase = getSupabaseInstance(supabaseConfig);
    if (!supabase) {
      setErrorMsg('Supabase client is not available for file upload.');
      return;
    }

    setIsUploadingAvatar(true);
    const res = await uploadProfileAvatar(supabase, user.id, file);
    setIsUploadingAvatar(false);

    if (res.error) {
      setErrorMsg(res.error);
    } else if (res.url) {
      setAvatarUrl(res.url);
      setSuccessMsg('Profile picture updated. Click Save / Complete Setup to persist.');
    }
  };

  // Switch education level without forcing fields mandatory
  const handleSelectEducationLevel = (level: EducationLevel) => {
    if (educationLevel === level) return;
    setEducationLevel(level);
    if (level === 'undergraduate') {
      setUndergraduateStage('college');
      if (!academicYear) setAcademicYear('Freshman (1st Year)');
    } else if (level === 'bachelors') {
      if (! UNDERGRAD_BACHELORS_YEARS.includes(academicYear)) {
        setAcademicYear('Freshman (1st Year)');
      }
    } else if (level === 'masters') {
      if (!MASTERS_YEARS.includes(academicYear)) {
        setAcademicYear('Year 1');
      }
    } else if (level === 'phd') {
      if (!PHD_YEARS.includes(academicYear)) {
        setAcademicYear('Year 1');
      }
    }
  };

  const handleClearAcademicInfo = () => {
    setEducationLevel('');
    setMajorOrField('');
    setInstitution('');
    setAcademicYear('');
    setSemester('');
  };

  // Toggle subject in Preferred Subjects
  const handleToggleSubject = (subj: string) => {
    setPreferences((prev) => {
      const exists = prev.preferredSubjects.includes(subj);
      return {
        ...prev,
        preferredSubjects: exists
          ? prev.preferredSubjects.filter((s) => s !== subj)
          : [...prev.preferredSubjects, subj]
      };
    });
  };

  const handleAddCustomSubject = () => {
    const trimmed = customSubjectInput.trim();
    if (!trimmed) return;
    if (!preferences.preferredSubjects.includes(trimmed)) {
      setPreferences((prev) => ({
        ...prev,
        preferredSubjects: [...prev.preferredSubjects, trimmed]
      }));
    }
    setCustomSubjectInput('');
  };

  // Save or Complete Setup Handler
  const handleSaveProfile = async (markSetupCompleted: boolean) => {
    if (isSaving) return;
    setErrorMsg(null);
    setSuccessMsg(null);

    const pending = loadPendingSignupDraft(user.email);
    const effectiveDisplayName =
      displayName.trim() || pending?.displayName?.trim() || user.name?.trim() || '';
    const effectiveUsername =
      username.trim().toLowerCase() ||
      pending?.username?.trim().toLowerCase() ||
      user.username?.trim().toLowerCase() ||
      '';

    if (effectiveDisplayName && effectiveDisplayName !== displayName) {
      setDisplayName(effectiveDisplayName);
    }
    if (effectiveUsername && effectiveUsername !== username) {
      setUsername(effectiveUsername);
    }

    // 1. Validate ONLY mandatory profile fields: Display Name & Username
    const nameCheck = validateDisplayName(effectiveDisplayName);
    if (!nameCheck.valid) {
      setErrorMsg(nameCheck.error || 'Display name is required.');
      return;
    }

    const cleanUsername = effectiveUsername;
    const userCheck = validateUsernameFormat(cleanUsername);
    if (!userCheck.valid) {
      setErrorMsg(userCheck.error || 'Valid username is required.');
      return;
    }

    const supabase = getSupabaseInstance(supabaseConfig);
    if (!supabase) {
      setErrorMsg('Supabase connection is required to save your profile.');
      return;
    }

    setIsSaving(true);

    try {
      const {
        data: { user: authUser }
      } = await supabase.auth.getUser();

      if (!authUser) {
        setErrorMsg('Your authenticated session has expired. Please log in again.');
        setIsSaving(false);
        return;
      }

      const finalSettings: UserSettingsData = {
        ...settings,
        flareLocked: isFlareLocked,
        rayColor,
        rayOrigin,
        rayBrightness
      };

      const result = await saveUserProfileToSupabase(supabase, authUser, {
        displayName: effectiveDisplayName,
        username: cleanUsername,
        bio,
        avatarUrl,
        setupCompleted: markSetupCompleted ? true : Boolean(user.setupCompleted),
        educationLevel,
        undergraduateStage,
        majorOrField,
        institution,
        academicYear,
        semester,
        settings: finalSettings,
        preferences
      });

      if (!result.success || !result.user) {
        setErrorMsg(result.error || 'Could not save profile changes.');
        setIsSaving(false);
        return;
      }

      if (institution.trim()) {
        registerStudentToUniversity(user.id, institution.trim());
      }

      // Persist local privacy badge preferences for compatibility with note cards
      try {
        localStorage.setItem(
          'xeusar_pref_public_badge',
          JSON.stringify(finalSettings.publicBadgeEnabled)
        );
        localStorage.setItem(
          'xeusar_pref_uni_badge',
          JSON.stringify(finalSettings.showUniOnNotes)
        );
      } catch {}

      setIsSaving(false);
      onUserUpdated(result.user);

      if (pageMode === 'setup' && markSetupCompleted) {
        onSetupCompleted(result.user);
      } else {
        setSuccessMsg('Profile, academic information, and preferences saved to your account.');
      }
    } catch (err: any) {
      setErrorMsg(err?.message || 'An unexpected error occurred while saving your profile.');
      setIsSaving(false);
    }
  };

  // Password Change Handler
  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isUpdatingPassword) return;
    setErrorMsg(null);
    setSuccessMsg(null);

    const passCheck = validatePasswordStrength(newPassword);
    if (!passCheck.valid) {
      setErrorMsg(passCheck.error || 'New password must be at least 8 characters.');
      return;
    }

    if (newPassword !== confirmNewPassword) {
      setErrorMsg('New password and confirmation do not match.');
      return;
    }

    const supabase = getSupabaseInstance(supabaseConfig);
    if (!supabase) {
      setErrorMsg('Supabase connection is not available.');
      return;
    }

    setIsUpdatingPassword(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) {
        setErrorMsg(error.message);
      } else {
        setNewPassword('');
        setConfirmNewPassword('');
        setSuccessMsg('Your account password has been updated.');
      }
    } catch (err: any) {
      setErrorMsg(err?.message || 'Failed to update password.');
    } finally {
      setIsUpdatingPassword(false);
    }
  };

  // ============================================================================
  // SHARED SECTION RENDERERS
  // ============================================================================

  const renderBasicProfileSection = () => (
    <div className="p-5 sm:p-6 bg-white/[0.03] border border-white/10 rounded-2xl space-y-5">
      <div className="flex items-center justify-between border-b border-white/10 pb-3">
        <div className="flex items-center gap-2">
          <UserIcon className="w-4 h-4 text-cyan-400" />
          <h2 className="text-sm font-bold text-white uppercase tracking-wide font-jetbrains">
            {pageMode === 'setup' ? 'A. Basic Profile' : 'My Profile'}
          </h2>
        </div>
        <span className="text-[10px] font-mono text-cyan-300 bg-cyan-400/10 px-2.5 py-0.5 rounded-full border border-cyan-400/25">
          Display Name & Username Required
        </span>
      </div>

      {/* Avatar Upload & Presets */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 pb-4 border-b border-white/10">
        <div className="relative group shrink-0">
          {avatarUrl ? (
            <img
              src={avatarUrl}
              alt={displayName || 'Profile Avatar'}
              className="w-20 h-20 rounded-2xl object-cover border-2 border-cyan-400/60 shadow-lg bg-black"
            />
          ) : (
            <div className="w-20 h-20 rounded-2xl bg-gradient-to-tr from-cyan-500/20 to-blue-500/20 border-2 border-cyan-400/40 flex items-center justify-center text-cyan-300 font-bold text-2xl">
              {(displayName || user.email || 'S').charAt(0).toUpperCase()}
            </div>
          )}
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploadingAvatar}
            className="absolute -bottom-1.5 -right-1.5 w-7 h-7 rounded-full bg-cyan-400 text-black flex items-center justify-center shadow-md hover:scale-105 transition-transform cursor-pointer"
            title="Upload Profile Picture"
          >
            {isUploadingAvatar ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Camera className="w-3.5 h-3.5" />
            )}
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleAvatarFileChange}
            className="hidden"
          />
        </div>

        <div className="flex-1 space-y-2.5 w-full">
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploadingAvatar}
              className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/15 border border-white/15 text-xs font-medium text-white flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Upload className="w-3.5 h-3.5 text-cyan-400" />
              <span>{isUploadingAvatar ? 'Uploading...' : 'Upload Picture (Optional)'}</span>
            </button>
            {avatarUrl && (
              <button
                type="button"
                onClick={() => setAvatarUrl('')}
                className="px-2.5 py-1.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 text-xs text-rose-300 transition-colors cursor-pointer"
              >
                Remove
              </button>
            )}
          </div>

          <div>
            <p className="text-[10px] font-mono uppercase tracking-wider text-white/40 mb-1.5">
              Or choose a preset avatar:
            </p>
            <div className="flex items-center gap-1.5 flex-wrap">
              {AVATAR_PRESETS.map((preset) => {
                const isSelected = avatarUrl === preset.url;
                return (
                  <button
                    key={preset.name}
                    type="button"
                    onClick={() => setAvatarUrl(preset.url)}
                    title={preset.name}
                    className={`w-8 h-8 rounded-lg overflow-hidden border transition-all cursor-pointer ${
                      isSelected
                        ? 'border-cyan-400 ring-2 ring-cyan-400/40 scale-105'
                        : 'border-white/15 opacity-70 hover:opacity-100'
                    }`}
                  >
                    <img src={preset.url} alt={preset.name} className="w-full h-full object-cover" />
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Required Profile Fields: Display Name & Username */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-semibold text-white/85 mb-1.5">
            Display Name <span className="text-cyan-400">*</span>
          </label>
          <input
            type="text"
            name="displayName"
            required
            value={displayName}
            onChange={(e) => {
              setDisplayName(e.target.value);
              if (errorMsg) setErrorMsg(null);
            }}
            onInput={(e) => {
              setDisplayName((e.target as HTMLInputElement).value);
              if (errorMsg) setErrorMsg(null);
            }}
            placeholder="Your full or display name"
            className="w-full px-3.5 py-2.5 bg-white/[0.04] border border-white/15 rounded-xl text-white placeholder-white/30 text-xs focus:outline-none focus:border-[#00f0ff] focus:ring-1 focus:ring-[#00f0ff]"
          />
        </div>

        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="block text-xs font-semibold text-white/85">
              Username <span className="text-cyan-400">*</span>
            </label>
            {checkingUsername && (
              <span className="text-[10px] font-mono text-white/50 flex items-center gap-1">
                <Loader2 className="w-3 h-3 animate-spin" />
                Checking...
              </span>
            )}
            {!checkingUsername && usernameHint && (
              <span
                className={`text-[10px] font-mono ${
                  usernameAvailable ? 'text-emerald-400' : 'text-rose-400'
                }`}
              >
                {usernameHint}
              </span>
            )}
          </div>
          <div className="relative">
            <AtSign className="w-3.5 h-3.5 text-cyan-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              required
              value={username}
              onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/\s+/g, ''))}
              placeholder="username"
              className="w-full pl-8 pr-3.5 py-2.5 bg-white/[0.04] border border-white/15 rounded-xl text-white placeholder-white/30 text-xs font-mono focus:outline-none focus:border-[#00f0ff] focus:ring-1 focus:ring-[#00f0ff]"
            />
          </div>
        </div>
      </div>

      {/* Authenticated Email Address (Read-only from Supabase Auth) */}
      <div>
        <label className="block text-xs font-semibold text-white/85 mb-1.5">
          Authenticated Email Address
        </label>
        <div className="flex items-center justify-between px-3.5 py-2.5 bg-black/50 border border-white/10 rounded-xl text-xs">
          <div className="flex items-center gap-2 min-w-0">
            <Mail className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
            <span className="font-mono text-white/85 truncate">{user.email}</span>
          </div>
          <span className="text-[10px] font-mono text-emerald-300 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/25 shrink-0">
            Verified Account
          </span>
        </div>
      </div>

      {/* Optional Short Bio */}
      <div>
        <div className="flex items-center justify-between mb-1.5">
          <label className="text-xs font-semibold text-white/85 flex items-center gap-1.5">
            <FileText className="w-3.5 h-3.5 text-cyan-400" />
            <span>Short Bio</span>
            <span className="text-[10px] text-white/40 font-normal">(Optional)</span>
          </label>
          <span className="text-[10px] font-mono text-white/40">{bio.length}/240</span>
        </div>
        <textarea
          rows={3}
          maxLength={240}
          value={bio}
          onChange={(e) => setBio(e.target.value)}
          placeholder="Tell peers about your academic interests, research focus, or study goals..."
          className="w-full px-3.5 py-2.5 bg-white/[0.04] border border-white/15 rounded-xl text-white placeholder-white/30 text-xs focus:outline-none focus:border-[#00f0ff] resize-none"
        />
      </div>
    </div>
  );

  const renderAcademicInfoSection = () => (
    <div className="p-5 sm:p-6 bg-white/[0.03] border border-white/10 rounded-2xl space-y-5 min-w-0 w-full">
      <div className="flex items-center justify-between border-b border-white/10 pb-3 flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <GraduationCap className="w-4 h-4 text-cyan-400" />
          <h2 className="text-sm font-bold text-white uppercase tracking-wide font-jetbrains">
            {pageMode === 'setup' ? 'B. Academic Information' : 'Academic Information'}
          </h2>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-mono text-white/60 bg-white/5 px-2.5 py-0.5 rounded-full border border-white/10">
            Optional
          </span>
          {educationLevel && (
            <button
              type="button"
              onClick={handleClearAcademicInfo}
              className="text-[11px] text-white/50 hover:text-white px-2.5 py-0.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 transition-colors cursor-pointer"
            >
              Clear Academic Info
            </button>
          )}
        </div>
      </div>

      <p className="text-xs text-white/60 leading-relaxed">
        Select your current education level to personalize course directories and study materials. All academic fields are optional and can be updated anytime.
      </p>

      {/* Education Level Options */}
      <div>
        <label className="block text-xs font-semibold text-white/85 mb-2">
          Education Level <span className="text-[10px] text-white/40 font-normal">(Optional)</span>
        </label>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
          {[
            {
              id: 'undergraduate',
              title: 'Undergraduate',
              subtitle: 'High School / College'
            },
            {
              id: 'bachelors',
              title: "Bachelor's Program",
              subtitle: 'BS / BA / BE / BBA'
            },
            {
              id: 'masters',
              title: "Master's Program",
              subtitle: 'MS / MA / MBA / MPhil'
            },
            {
              id: 'phd',
              title: 'PhD',
              subtitle: 'Doctoral Research'
            }
          ].map((lvl) => {
            const isSelected = educationLevel === lvl.id;
            return (
              <button
                key={lvl.id}
                type="button"
                onClick={() => handleSelectEducationLevel(lvl.id as EducationLevel)}
                className={`p-3 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                  isSelected
                    ? 'bg-cyan-400 text-black border-cyan-400 shadow-[0_0_18px_rgba(0,240,255,0.3)]'
                    : 'bg-white/[0.03] text-white/80 border-white/10 hover:border-white/25 hover:bg-white/[0.06]'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-bold">{lvl.title}</span>
                  {isSelected && <Check className="w-3.5 h-3.5 text-black shrink-0" />}
                </div>
                <span
                  className={`text-[10px] ${
                    isSelected ? 'text-black/75 font-medium' : 'text-white/45'
                  }`}
                >
                  {lvl.subtitle}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Conditional Fields Based on Selected Education Level */}
      {educationLevel === 'undergraduate' && (
        <div className="p-4 bg-cyan-400/[0.03] border border-cyan-400/20 rounded-xl space-y-4 min-w-0 w-full">
          <div className="flex items-center gap-2 text-cyan-300 text-xs font-bold font-jetbrains">
            <Layers className="w-3.5 h-3.5" />
            <span>Undergraduate Track (High School / College)</span>
          </div>

          {/* Academic Stage: High School or College */}
          <div>
            <label className="block text-[11px] font-semibold text-white/80 mb-1.5">
              Academic Stage <span className="text-[10px] text-white/40 font-normal">(Optional)</span>
            </label>
            <div className="grid grid-cols-2 gap-2.5">
              {[
                {
                  id: 'high_school',
                  label: 'High School',
                  subtitle: 'Matric / O-Levels / High School'
                },
                {
                  id: 'college',
                  label: 'College',
                  subtitle: 'FSc / A-Levels / Associate College'
                }
              ].map((st) => {
                const isSelected = undergraduateStage === st.id;
                return (
                  <button
                    key={st.id}
                    type="button"
                    onClick={() => setUndergraduateStage(st.id as UndergraduateStage)}
                    className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-cyan-400 text-black border-cyan-400 font-bold'
                        : 'bg-white/[0.04] text-white/75 border-white/10 hover:text-white'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-0.5">
                      <span className="text-xs font-semibold">{st.label}</span>
                      {isSelected && <Check className="w-3.5 h-3.5 text-black" />}
                    </div>
                    <span
                      className={`text-[10px] block ${
                        isSelected ? 'text-black/75' : 'text-white/45'
                      }`}
                    >
                      {st.subtitle}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          <FieldSlidingSelector
            label="Major or Field of Study"
            fieldValue={majorOrField}
            onSelectField={setMajorOrField}
            placeholder="e.g. Pre-Engineering, Pre-Medical, Computer Science (Optional)"
            levelBadge={undergraduateStage === 'high_school' ? 'High School' : 'College'}
          />

          <HecUniversitySelect
            label="University or Institution Name (Optional)"
            value={institution}
            onChange={(uniName) => setInstitution(uniName)}
            placeholder="Select or enter school, college, or institution (Optional)..."
            studentId={user.id}
            required={false}
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-semibold text-white/80 mb-1">
                Academic Year <span className="text-[10px] text-white/40 font-normal">(Optional)</span>
              </label>
              <select
                value={academicYear}
                onChange={(e) => setAcademicYear(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-[#12141a] border border-white/15 rounded-xl text-white text-xs focus:outline-none focus:border-[#00f0ff] cursor-pointer"
              >
                <option value="">Select Academic Year (Optional)</option>
                {UNDERGRAD_BACHELORS_YEARS.map((yr) => (
                  <option key={yr} value={yr}>
                    {yr}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-white/80 mb-1">
                Semester <span className="text-[10px] text-white/40 font-normal">(Optional)</span>
              </label>
              <div className="grid grid-cols-2 gap-1.5">
                {[
                  { id: 'semester_1', label: 'Semester 1' },
                  { id: 'semester_2', label: 'Semester 2' }
                ].map((sem) => (
                  <button
                    key={sem.id}
                    type="button"
                    onClick={() =>
                      setSemester(semester === sem.id ? '' : (sem.id as AcademicSemester))
                    }
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

      {educationLevel === 'bachelors' && (
        <div className="p-4 bg-cyan-400/[0.03] border border-cyan-400/20 rounded-xl space-y-4 min-w-0 w-full">
          <div className="flex items-center gap-2 text-cyan-300 text-xs font-bold font-jetbrains">
            <BookOpen className="w-3.5 h-3.5" />
            <span>Bachelor's Program</span>
          </div>

          <FieldSlidingSelector
            label="Major or Field of Study"
            fieldValue={majorOrField}
            onSelectField={setMajorOrField}
            placeholder="e.g. Computer Science, Mechanical Engineering, Economics (Optional)"
            levelBadge="Bachelor's"
          />

          <HecUniversitySelect
            label="University or Institution Name (Optional)"
            value={institution}
            onChange={(uniName) => setInstitution(uniName)}
            placeholder="Select HEC university or institution (Optional)..."
            studentId={user.id}
            required={false}
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-semibold text-white/80 mb-1">
                Academic Year <span className="text-[10px] text-white/40 font-normal">(Optional)</span>
              </label>
              <select
                value={academicYear}
                onChange={(e) => setAcademicYear(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-[#12141a] border border-white/15 rounded-xl text-white text-xs focus:outline-none focus:border-[#00f0ff] cursor-pointer"
              >
                <option value="">Select Academic Year (Optional)</option>
                {UNDERGRAD_BACHELORS_YEARS.map((yr) => (
                  <option key={yr} value={yr}>
                    {yr}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-white/80 mb-1">
                Semester <span className="text-[10px] text-white/40 font-normal">(Optional)</span>
              </label>
              <div className="grid grid-cols-2 gap-1.5">
                {[
                  { id: 'semester_1', label: 'Semester 1' },
                  { id: 'semester_2', label: 'Semester 2' }
                ].map((sem) => (
                  <button
                    key={sem.id}
                    type="button"
                    onClick={() =>
                      setSemester(semester === sem.id ? '' : (sem.id as AcademicSemester))
                    }
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
        <div className="p-4 bg-cyan-400/[0.03] border border-cyan-400/20 rounded-xl space-y-4 min-w-0 w-full">
          <div className="flex items-center gap-2 text-cyan-300 text-xs font-bold font-jetbrains">
            <Compass className="w-3.5 h-3.5" />
            <span>Master's Program</span>
          </div>

          <FieldSlidingSelector
            label="Major or Field of Study (Specialization)"
            fieldValue={majorOrField}
            onSelectField={setMajorOrField}
            placeholder="e.g. Artificial Intelligence, MBA, Data Science (Optional)"
            levelBadge="Master's"
          />

          <HecUniversitySelect
            label="University or Institution Name (Optional)"
            value={institution}
            onChange={(uniName) => setInstitution(uniName)}
            placeholder="Select HEC university or institution (Optional)..."
            studentId={user.id}
            required={false}
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-semibold text-white/80 mb-1">
                Academic Year <span className="text-[10px] text-white/40 font-normal">(Optional)</span>
              </label>
              <div className="grid grid-cols-2 gap-1.5">
                {MASTERS_YEARS.map((yr) => (
                  <button
                    key={yr}
                    type="button"
                    onClick={() => setAcademicYear(academicYear === yr ? '' : yr)}
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
                Semester <span className="text-[10px] text-white/40 font-normal">(Optional)</span>
              </label>
              <div className="grid grid-cols-2 gap-1.5">
                {[
                  { id: 'semester_1', label: 'Semester 1' },
                  { id: 'semester_2', label: 'Semester 2' }
                ].map((sem) => (
                  <button
                    key={sem.id}
                    type="button"
                    onClick={() =>
                      setSemester(semester === sem.id ? '' : (sem.id as AcademicSemester))
                    }
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
        <div className="p-4 bg-cyan-400/[0.03] border border-cyan-400/20 rounded-xl space-y-4 min-w-0 w-full">
          <div className="flex items-center gap-2 text-cyan-300 text-xs font-bold font-jetbrains">
            <Award className="w-3.5 h-3.5" />
            <span>PhD Program</span>
          </div>

          <FieldSlidingSelector
            label="Doctoral Research Field / Major"
            fieldValue={majorOrField}
            onSelectField={setMajorOrField}
            placeholder="e.g. Distributed Consensus, Quantum Photonics, Neurobiology (Optional)"
            levelBadge="PhD"
          />

          <HecUniversitySelect
            label="University or Institution Name (Optional)"
            value={institution}
            onChange={(uniName) => setInstitution(uniName)}
            placeholder="Select HEC doctoral university or institution (Optional)..."
            studentId={user.id}
            required={false}
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-semibold text-white/80 mb-1">
                Academic Year <span className="text-[10px] text-white/40 font-normal">(Optional)</span>
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                {PHD_YEARS.map((yr) => (
                  <button
                    key={yr}
                    type="button"
                    onClick={() => setAcademicYear(academicYear === yr ? '' : yr)}
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
                Semester <span className="text-[10px] text-white/40 font-normal">(Optional)</span>
              </label>
              <div className="grid grid-cols-2 gap-1.5">
                {[
                  { id: 'semester_1', label: 'Semester 1' },
                  { id: 'semester_2', label: 'Semester 2' }
                ].map((sem) => (
                  <button
                    key={sem.id}
                    type="button"
                    onClick={() =>
                      setSemester(semester === sem.id ? '' : (sem.id as AcademicSemester))
                    }
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
  );

  const renderSettingsSection = () => (
    <div className="space-y-5">
      {/* 1. Account Settings */}
      <div className="p-5 bg-white/[0.03] border border-white/10 rounded-2xl space-y-3">
        <div className="flex items-center justify-between border-b border-white/10 pb-2.5">
          <h3 className="text-xs font-bold text-white uppercase tracking-wide font-jetbrains flex items-center gap-2">
            <Mail className="w-4 h-4 text-cyan-400" />
            <span>1. Account Settings</span>
          </h3>
          <span className="text-[10px] font-mono text-emerald-300 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/25">
            Authenticated
          </span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
          <div className="p-3 rounded-xl bg-black/40 border border-white/10">
            <span className="text-[10px] text-white/45 uppercase font-jetbrains block mb-0.5">
              Account Email
            </span>
            <span className="font-mono text-white font-semibold truncate block">
              {user.email}
            </span>
          </div>
          <div className="p-3 rounded-xl bg-black/40 border border-white/10">
            <span className="text-[10px] text-white/45 uppercase font-jetbrains block mb-0.5">
              Account Handle
            </span>
            <span className="font-mono text-cyan-300 truncate block">
              @{username || user.username || 'student'}
            </span>
          </div>
        </div>
      </div>

      {/* 2. Password and Security */}
      <div className="p-5 bg-white/[0.03] border border-white/10 rounded-2xl space-y-3">
        <div className="flex items-center justify-between border-b border-white/10 pb-2.5">
          <h3 className="text-xs font-bold text-white uppercase tracking-wide font-jetbrains flex items-center gap-2">
            <KeyRound className="w-4 h-4 text-cyan-400" />
            <span>2. Password & Security</span>
          </h3>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-[11px] font-semibold text-white/80 mb-1">
              New Password
            </label>
            <div className="relative">
              <input
                type={showNewPassword ? 'text' : 'password'}
                minLength={8}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Min 8 characters"
                className="w-full pl-3 pr-9 py-2 bg-white/[0.04] border border-white/15 rounded-xl text-white placeholder-white/30 text-xs font-mono focus:outline-none focus:border-[#00f0ff]"
              />
              <button
                type="button"
                onClick={() => setShowNewPassword((prev) => !prev)}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-white/45 hover:text-white cursor-pointer"
              >
                {showNewPassword ? (
                  <EyeOff className="w-3.5 h-3.5" />
                ) : (
                  <Eye className="w-3.5 h-3.5" />
                )}
              </button>
            </div>
          </div>
          <div>
            <label className="block text-[11px] font-semibold text-white/80 mb-1">
              Confirm New Password
            </label>
            <input
              type={showNewPassword ? 'text' : 'password'}
              minLength={8}
              value={confirmNewPassword}
              onChange={(e) => setConfirmNewPassword(e.target.value)}
              placeholder="Repeat new password"
              className="w-full px-3 py-2 bg-white/[0.04] border border-white/15 rounded-xl text-white placeholder-white/30 text-xs font-mono focus:outline-none focus:border-[#00f0ff]"
            />
          </div>
        </div>
        <div className="flex justify-end">
          <button
            type="button"
            disabled={isUpdatingPassword || !newPassword}
            onClick={handleUpdatePassword}
            className="py-2 px-4 rounded-xl bg-white/10 hover:bg-white/20 disabled:opacity-40 text-white font-semibold text-xs transition-all cursor-pointer"
          >
            {isUpdatingPassword ? 'Updating Password...' : 'Update Password'}
          </button>
        </div>
      </div>

      {/* 3. Privacy */}
      <div className="p-5 bg-white/[0.03] border border-white/10 rounded-2xl space-y-3">
        <div className="flex items-center justify-between border-b border-white/10 pb-2.5">
          <h3 className="text-xs font-bold text-white uppercase tracking-wide font-jetbrains flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-cyan-400" />
            <span>3. Privacy</span>
          </h3>
        </div>
        <div className="space-y-2.5">
          <div className="flex items-center justify-between p-3 rounded-xl bg-black/40 border border-white/10">
            <div>
              <p className="text-xs font-semibold text-white">
                Display Verified Student Badge on Uploads
              </p>
              <p className="text-[11px] text-white/50">
                Shows your @username and verified student badge on study notes you share
              </p>
            </div>
            <button
              type="button"
              onClick={() =>
                setSettings((prev) => ({
                  ...prev,
                  publicBadgeEnabled: !prev.publicBadgeEnabled
                }))
              }
              className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full p-0.5 transition-colors ${
                settings.publicBadgeEnabled ? 'bg-cyan-400' : 'bg-white/20'
              }`}
            >
              <span
                className={`inline-block h-5 w-5 rounded-full bg-black transition-transform ${
                  settings.publicBadgeEnabled ? 'translate-x-5' : 'translate-x-0'
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
                Displays your institution and degree level alongside your contributor profile
              </p>
            </div>
            <button
              type="button"
              onClick={() =>
                setSettings((prev) => ({
                  ...prev,
                  showUniOnNotes: !prev.showUniOnNotes
                }))
              }
              className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full p-0.5 transition-colors ${
                settings.showUniOnNotes ? 'bg-cyan-400' : 'bg-white/20'
              }`}
            >
              <span
                className={`inline-block h-5 w-5 rounded-full bg-black transition-transform ${
                  settings.showUniOnNotes ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>
        </div>
      </div>

      {/* 4. Notifications (Clearly identified as unimplemented / planned for future expansion) */}
      <div className="p-5 bg-white/[0.02] border border-white/10 rounded-2xl space-y-2.5">
        <div className="flex items-center justify-between border-b border-white/10 pb-2.5">
          <h3 className="text-xs font-bold text-white/80 uppercase tracking-wide font-jetbrains flex items-center gap-2">
            <Bell className="w-4 h-4 text-amber-400" />
            <span>4. Notifications</span>
          </h3>
          <span className="text-[10px] font-mono text-amber-300 bg-amber-500/10 px-2.5 py-0.5 rounded-full border border-amber-500/30">
            Planned / Not Yet Implemented
          </span>
        </div>
        <p className="text-xs text-white/55 leading-relaxed">
          Automated email digests for course uploads, discussion replies, and peer doubt answers are prepared in the account schema for future expansion and are not currently active.
        </p>
      </div>

      {/* 5. Appearance (Atmospheric Background Flare Controls) */}
      <div className="p-5 bg-white/[0.03] border border-white/10 rounded-2xl space-y-4">
        <div className="flex items-center justify-between border-b border-white/10 pb-3">
          <h3 className="text-xs font-bold text-white uppercase tracking-wide font-jetbrains flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-cyan-400" />
            <span>5. Appearance — Atmospheric Background Flare</span>
          </h3>
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
        <div className="p-3.5 bg-black/50 border border-white/10 rounded-xl flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div
              className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 border ${
                isFlareLocked
                  ? 'bg-amber-500/15 border-amber-500/40 text-amber-400'
                  : 'bg-emerald-500/15 border-emerald-500/40 text-emerald-400'
              }`}
            >
              {isFlareLocked ? <Lock className="w-4 h-4" /> : <Unlock className="w-4 h-4" />}
            </div>
            <div>
              <span className="font-semibold text-white text-xs block">
                {isFlareLocked
                  ? 'Flare Corner & Color: Locked'
                  : 'Flare Corner & Color: Dynamic'}
              </span>
              <span className="text-[11px] text-white/55">
                {isFlareLocked
                  ? 'Frozen at current position and color tint.'
                  : 'Clicking on the background dynamically shifts flare corner and hue.'}
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={() => onToggleFlareLock(!isFlareLocked)}
            className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full p-0.5 transition-colors ${
              isFlareLocked ? 'bg-amber-500' : 'bg-white/20'
            }`}
          >
            <span
              className={`inline-block h-5 w-5 rounded-full bg-black transition-transform ${
                isFlareLocked ? 'translate-x-5' : 'translate-x-0'
              }`}
            />
          </button>
        </div>

        {/* Brightness Intensity Slider */}
        <div className="p-3.5 bg-black/40 border border-white/10 rounded-xl space-y-2.5">
          <div className="flex items-center justify-between text-xs">
            <span className="font-medium text-white/85 flex items-center gap-1.5">
              <Sliders className="w-3.5 h-3.5 text-cyan-400" />
              <span>Brightness Intensity</span>
            </span>
            <span className="text-[11px] font-mono font-bold text-cyan-300 bg-cyan-400/10 px-2.5 py-0.5 rounded-full border border-cyan-400/30">
              {Math.round(rayBrightness * 100)}%
            </span>
          </div>
          <input
            type="range"
            min={0.1}
            max={2.0}
            step={0.05}
            value={rayBrightness}
            onChange={(e) => onChangeRayBrightness(parseFloat(e.target.value))}
            className="w-full h-2 rounded-lg appearance-none cursor-pointer bg-white/15 accent-[#00f0ff]"
          />
        </div>

        {/* Origin / Position Selector */}
        <div className="space-y-2">
          <span className="text-xs font-medium text-white/80 block">Position / Origin</span>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {FLARE_ORIGIN_OPTIONS.map((opt) => {
              const isSelected = rayOrigin === opt.value;
              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => onChangeRayOrigin(opt.value)}
                  className={`py-2 px-2.5 rounded-xl text-[11px] font-medium border transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                    isSelected
                      ? 'bg-cyan-500/15 border-cyan-400/60 text-cyan-300 font-semibold'
                      : 'bg-white/[0.02] border-white/10 text-white/60 hover:text-white'
                  }`}
                >
                  {isSelected && <Check className="w-3 h-3 text-cyan-400 shrink-0" />}
                  <span className="truncate">{opt.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Color Swatches */}
        <div className="space-y-2">
          <span className="text-xs font-medium text-white/80 flex items-center gap-1.5">
            <Palette className="w-3.5 h-3.5 text-cyan-400" />
            <span>Color Tint</span>
          </span>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {FLARE_PRESET_COLORS.map((color) => {
              const isSelected = rayColor.toLowerCase() === color.hex.toLowerCase();
              return (
                <button
                  key={color.hex}
                  type="button"
                  onClick={() => onChangeRayColor(color.hex)}
                  className={`p-2 rounded-xl text-[11px] font-medium border transition-all cursor-pointer flex items-center gap-2 ${
                    isSelected
                      ? 'bg-white/10 border-cyan-400/60 text-white font-semibold'
                      : 'bg-white/[0.02] border-white/10 text-white/60 hover:text-white'
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
        </div>
      </div>
    </div>
  );

  const renderPreferencesSection = () => (
    <div className="space-y-5">
      {/* 1. Preferred Subjects & Academic Interests */}
      <div className="p-5 bg-white/[0.03] border border-white/10 rounded-2xl space-y-3.5">
        <div className="flex items-center justify-between border-b border-white/10 pb-2.5">
          <h3 className="text-xs font-bold text-white uppercase tracking-wide font-jetbrains flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-cyan-400" />
            <span>1. Preferred Subjects & Academic Interests</span>
          </h3>
          <span className="text-[10px] font-mono text-white/50">Optional</span>
        </div>

        <div className="flex flex-wrap gap-1.5">
          {ALL_MAJOR_FIELDS.slice(0, 14).map((subj) => {
            const selected = preferences.preferredSubjects.includes(subj);
            return (
              <button
                key={subj}
                type="button"
                onClick={() => handleToggleSubject(subj)}
                className={`px-3 py-1.5 rounded-xl text-[11px] font-medium border transition-all cursor-pointer ${
                  selected
                    ? 'bg-cyan-400 text-black border-cyan-400 font-bold'
                    : 'bg-white/[0.03] text-white/70 border-white/10 hover:text-white'
                }`}
              >
                {subj}
              </button>
            );
          })}
        </div>

        <div className="flex items-center gap-2 pt-1">
          <input
            type="text"
            value={customSubjectInput}
            onChange={(e) => setCustomSubjectInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                handleAddCustomSubject();
              }
            }}
            placeholder="Add another subject or research interest..."
            className="flex-1 px-3.5 py-2 bg-white/[0.04] border border-white/15 rounded-xl text-white placeholder-white/30 text-xs focus:outline-none focus:border-[#00f0ff]"
          />
          <button
            type="button"
            onClick={handleAddCustomSubject}
            className="px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-semibold cursor-pointer"
          >
            Add
          </button>
        </div>

        {preferences.preferredSubjects.length > 0 && (
          <div className="flex flex-wrap gap-1.5 pt-1">
            {preferences.preferredSubjects.map((item) => (
              <span
                key={item}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-cyan-400/15 border border-cyan-400/35 text-cyan-200 text-[11px]"
              >
                <span>{item}</span>
                <button
                  type="button"
                  onClick={() => handleToggleSubject(item)}
                  className="hover:text-white cursor-pointer"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            ))}
          </div>
        )}
      </div>

      {/* 2. Study & Learning Preferences */}
      <div className="p-5 bg-white/[0.03] border border-white/10 rounded-2xl space-y-3.5">
        <div className="flex items-center justify-between border-b border-white/10 pb-2.5">
          <h3 className="text-xs font-bold text-white uppercase tracking-wide font-jetbrains flex items-center gap-2">
            <Sliders className="w-4 h-4 text-cyan-400" />
            <span>2. Study & Learning Preferences</span>
          </h3>
          <span className="text-[10px] font-mono text-white/50">Optional</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className="block text-[11px] font-semibold text-white/80 mb-1">
              Preferred Study Format
            </label>
            <select
              value={preferences.studyStyle || ''}
              onChange={(e) =>
                setPreferences((prev) => ({ ...prev, studyStyle: e.target.value }))
              }
              className="w-full px-3 py-2 bg-[#12141a] border border-white/15 rounded-xl text-white text-xs focus:outline-none focus:border-[#00f0ff]"
            >
              <option value="">No preference</option>
              <option value="lecture_notes">Detailed Lecture Notes</option>
              <option value="cheat_sheet">Condensed Cheat Sheets & Summaries</option>
              <option value="past_exam">Practice Exams & Past Papers</option>
              <option value="lab_manual">Lab Manuals & Practical Guides</option>
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-white/80 mb-1">
              Study Session Cadence
            </label>
            <select
              value={preferences.sessionLength || ''}
              onChange={(e) =>
                setPreferences((prev) => ({ ...prev, sessionLength: e.target.value }))
              }
              className="w-full px-3 py-2 bg-[#12141a] border border-white/15 rounded-xl text-white text-xs focus:outline-none focus:border-[#00f0ff]"
            >
              <option value="">No preference</option>
              <option value="pomodoro_25">25-min Focused Sprints</option>
              <option value="deep_50">50-min Deep Study Blocks</option>
              <option value="extended_90">90-min Intensive Sessions</option>
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-white/80 mb-1">
              Collaboration Mode
            </label>
            <select
              value={preferences.collaborationMode || ''}
              onChange={(e) =>
                setPreferences((prev) => ({ ...prev, collaborationMode: e.target.value }))
              }
              className="w-full px-3 py-2 bg-[#12141a] border border-white/15 rounded-xl text-white text-xs focus:outline-none focus:border-[#00f0ff]"
            >
              <option value="">No preference</option>
              <option value="solo">Independent Study</option>
              <option value="peer_groups">Peer Study Groups</option>
              <option value="qa_mentor">Q&A & Doubt Resolution</option>
            </select>
          </div>
        </div>
      </div>

      {/* 3. Preferred Language & 4. Content Discovery Preferences */}
      <div className="p-5 bg-white/[0.03] border border-white/10 rounded-2xl space-y-3.5">
        <div className="flex items-center justify-between border-b border-white/10 pb-2.5">
          <h3 className="text-xs font-bold text-white uppercase tracking-wide font-jetbrains flex items-center gap-2">
            <Globe className="w-4 h-4 text-cyan-400" />
            <span>3. Language & Content Discovery Preferences</span>
          </h3>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-[11px] font-semibold text-white/80 mb-1">
              Preferred Content Language
            </label>
            <select
              value={preferences.preferredLanguage}
              onChange={(e) =>
                setPreferences((prev) => ({ ...prev, preferredLanguage: e.target.value }))
              }
              className="w-full px-3 py-2 bg-[#12141a] border border-white/15 rounded-xl text-white text-xs focus:outline-none focus:border-[#00f0ff]"
            >
              <option value="en">English (Default)</option>
              <option value="ur">English & Urdu</option>
              <option value="ar">Arabic</option>
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-white/80 mb-1">
              Theme Preference
            </label>
            <div className="px-3 py-2 bg-black/50 border border-white/10 rounded-xl flex items-center justify-between text-xs">
              <span className="text-white/85">Xeusar Obsidian Dark</span>
              <span className="text-[10px] font-mono text-amber-300 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/25">
                Light Theme Planned
              </span>
            </div>
          </div>
        </div>

        <div className="space-y-2 pt-1">
          {[
            {
              key: 'prioritizeVerifiedNotes' as const,
              title: 'Prioritize Peer-Upvoted & Verified Study Notes',
              desc: 'Rank highest-rated lecture notes and summaries first in discovery views'
            },
            {
              key: 'prioritizeMyInstitution' as const,
              title: 'Highlight Resources from My Institution & Program',
              desc: 'Surface materials matching your selected university or degree program'
            },
            {
              key: 'includePastExams' as const,
              title: 'Include Past Papers & Exam Solutions in Recommendations',
              desc: 'Show past exams alongside standard lecture notes'
            }
          ].map((item) => (
            <div
              key={item.key}
              className="flex items-center justify-between p-3 rounded-xl bg-black/40 border border-white/10"
            >
              <div>
                <p className="text-xs font-semibold text-white">{item.title}</p>
                <p className="text-[11px] text-white/50">{item.desc}</p>
              </div>
              <button
                type="button"
                onClick={() =>
                  setPreferences((prev) => ({ ...prev, [item.key]: !prev[item.key] }))
                }
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full p-0.5 transition-colors ${
                  preferences[item.key] ? 'bg-cyan-400' : 'bg-white/20'
                }`}
              >
                <span
                  className={`inline-block h-5 w-5 rounded-full bg-black transition-transform ${
                    preferences[item.key] ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  // ============================================================================
  // PAGE MODE 1: DEDICATED PROFILE SETUP PAGE (Post-Signup Onboarding Page)
  // ============================================================================
  if (pageMode === 'setup') {
    return (
      <div className="relative z-10 flex-1 max-w-4xl w-full mx-auto px-4 sm:px-6 py-8 sm:py-12 font-outfit">
        {/* Top Brand & Step Header */}
        <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center">
              <GraduationCap className="w-4 h-4 text-black" />
            </div>
            <div>
              <span className="text-base font-bold tracking-tight uppercase text-white block leading-none">
                Xeusar
              </span>
              <span className="text-[10px] font-mono text-cyan-300 uppercase tracking-wider">
                Dedicated Profile Setup
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={onSignOut}
            className="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-rose-500/15 border border-white/10 hover:border-rose-500/30 text-xs text-white/70 hover:text-rose-200 flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Sign Out</span>
          </button>
        </div>

        {/* Main Setup Page Container */}
        <div className="bg-[#080a0f]/95 border border-white/15 rounded-3xl p-6 sm:p-8 shadow-[0_25px_80px_rgba(0,0,0,0.9)] backdrop-blur-2xl space-y-6 min-w-0 w-full">
          <div className="border-b border-white/10 pb-5">
            <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
              Complete your Xeusar Profile
            </h1>
            <p className="text-xs sm:text-sm text-white/60 mt-1.5 leading-relaxed">
              Only your <strong className="text-white">Display Name</strong> and{' '}
              <strong className="text-white">Username</strong> are required to enter the Xeusar dashboard. All academic information, settings, and preferences are optional and can be filled now or updated anytime in Profile Settings.
            </p>
          </div>

          {/* Alerts */}
          {errorMsg && (
            <div
              role="alert"
              className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-200 text-xs flex items-start gap-2.5"
            >
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div
              role="status"
              className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-200 text-xs flex items-start gap-2.5"
            >
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* A. Basic Profile */}
          {renderBasicProfileSection()}

          {/* B. Academic Information (Optional) */}
          {renderAcademicInfoSection()}

          {/* C. Initial Settings Section */}
          <div className="space-y-3">
            <h2 className="text-xs font-bold text-white/80 uppercase tracking-wider font-jetbrains px-1">
              C. Initial Settings (Optional)
            </h2>
            {renderSettingsSection()}
          </div>

          {/* D. Initial Preferences Section */}
          <div className="space-y-3">
            <h2 className="text-xs font-bold text-white/80 uppercase tracking-wider font-jetbrains px-1">
              D. Initial Preferences (Optional)
            </h2>
            {renderPreferencesSection()}
          </div>

          {/* Complete Setup Action Bar */}
          <div className="pt-4 border-t border-white/10 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <p className="text-[11px] text-white/50">
              Your progress is saved automatically. You can edit any of these fields later in Profile Management.
            </p>
            <div className="flex items-center gap-3">
              <button
                type="button"
                disabled={isSaving}
                onClick={() => handleSaveProfile(true)}
                className="px-6 py-3 rounded-xl bg-[#00f0ff] hover:bg-[#00f0ff]/90 disabled:opacity-50 text-black font-bold text-xs transition-all cursor-pointer shadow-[0_0_25px_rgba(0,240,255,0.35)] flex items-center justify-center gap-2"
              >
                {isSaving ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Completing Setup...</span>
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4" />
                    <span>Complete Setup</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ============================================================================
  // PAGE MODE 2: DEDICATED PROFILE MANAGEMENT PAGE
  // ============================================================================
  return (
    <div className="relative z-10 flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 pl-14 sm:pl-20 md:pl-24 lg:px-8 py-6 sm:py-10 pb-24 md:pb-12 font-outfit">
      {/* Top Bar */}
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onBackToDashboard}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-medium text-white/80 hover:text-white transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to Dashboard</span>
          </button>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
              Account & Profile Management
            </h1>
            <p className="text-xs text-white/55">
              Manage your personal profile, academic information, settings, and learning preferences
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[260px_minmax(0,1fr)] gap-6 items-start">
        {/* Left Navigation Sidebar */}
        <aside className="bg-[#080a0f]/95 border border-white/15 rounded-2xl p-4 space-y-4 backdrop-blur-2xl">
          {/* User Summary Card */}
          <div className="p-3.5 rounded-xl bg-white/[0.03] border border-white/10 flex items-center gap-3">
            {avatarUrl ? (
              <img
                src={avatarUrl}
                alt={displayName}
                className="w-11 h-11 rounded-full object-cover border border-cyan-400/50 shrink-0"
              />
            ) : (
              <div className="w-11 h-11 rounded-full bg-cyan-500/20 border border-cyan-400/40 flex items-center justify-center text-cyan-300 font-bold text-sm shrink-0">
                {(displayName || user.email || 'S').charAt(0).toUpperCase()}
              </div>
            )}
            <div className="min-w-0 flex-1">
              <p className="text-xs font-bold text-white truncate">{displayName || user.name}</p>
              <p className="text-[11px] font-mono text-cyan-300 truncate">
                @{username || user.username || 'student'}
              </p>
              <p className="text-[10px] text-white/45 truncate">{user.email}</p>
            </div>
          </div>

          {/* Section Navigation */}
          <nav className="space-y-1" aria-label="Profile Management Sections">
            {[
              { id: 'profile', label: 'My Profile', icon: UserIcon },
              { id: 'academic', label: 'Academic Information', icon: GraduationCap },
              { id: 'settings', label: 'Settings', icon: Settings },
              { id: 'preferences', label: 'Preferences', icon: Sliders }
            ].map((item) => {
              const Icon = item.icon;
              const isActive = activeSection === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => {
                    setErrorMsg(null);
                    setSuccessMsg(null);
                    setActiveSection(item.id as ProfileManagementSection);
                  }}
                  className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer text-left ${
                    isActive
                      ? 'bg-cyan-400 text-black shadow-[0_0_18px_rgba(0,240,255,0.3)]'
                      : 'text-white/70 hover:text-white hover:bg-white/5'
                  }`}
                >
                  <Icon className="w-4 h-4 shrink-0" />
                  <span>{item.label}</span>
                </button>
              );
            })}

            {/* Logout Action */}
            <div className="pt-3 mt-3 border-t border-white/10">
              <button
                type="button"
                onClick={onSignOut}
                className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold text-rose-300 hover:text-rose-200 hover:bg-rose-500/15 border border-transparent hover:border-rose-500/30 transition-all cursor-pointer text-left"
              >
                <LogOut className="w-4 h-4 shrink-0" />
                <span>Logout</span>
              </button>
            </div>
          </nav>
        </aside>

        {/* Right Content Area */}
        <div className="bg-[#080a0f]/95 border border-white/15 rounded-3xl p-5 sm:p-7 space-y-5 backdrop-blur-2xl min-w-0 w-full">
          {errorMsg && (
            <div
              role="alert"
              className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-200 text-xs flex items-start gap-2.5"
            >
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div
              role="status"
              className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-200 text-xs flex items-start gap-2.5"
            >
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <span>{successMsg}</span>
            </div>
          )}

          {activeSection === 'profile' && renderBasicProfileSection()}
          {activeSection === 'academic' && renderAcademicInfoSection()}
          {activeSection === 'settings' && renderSettingsSection()}
          {activeSection === 'preferences' && renderPreferencesSection()}

          {/* Save Changes Footer */}
          <div className="pt-4 border-t border-white/10 flex items-center justify-end gap-3">
            <button
              type="button"
              disabled={isSaving}
              onClick={() => handleSaveProfile(true)}
              className="px-6 py-2.5 rounded-xl bg-[#00f0ff] hover:bg-[#00f0ff]/90 disabled:opacity-50 text-black font-bold text-xs transition-all cursor-pointer shadow-[0_0_20px_rgba(0,240,255,0.3)] flex items-center gap-2"
            >
              {isSaving ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Saving Changes...</span>
                </>
              ) : (
                <>
                  <Check className="w-4 h-4" />
                  <span>Save Changes</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
