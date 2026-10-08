import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  CheckCircle2,
  AlertCircle,
  LogOut,
  GraduationCap,
  Mail,
  Lock,
  User as UserIcon,
  Building,
  Eye,
  EyeOff,
  Sparkles,
  ShieldCheck,
  Camera,
  Upload,
  Edit3,
  BookOpen,
  AtSign,
  FileText,
  UserCheck,
  Check,
  Calendar,
  Layers,
  Compass,
  Award
} from 'lucide-react';
import {
  StudentUser,
  SupabaseConfig,
  EducationLevel,
  UndergraduateStage,
  AcademicSemester,
  AcademicProfileInfo
} from '../types/index.ts';
import { getSupabaseInstance } from '../lib/supabaseClient.ts';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: StudentUser | null;
  onUserChange: (user: StudentUser | null) => void;
  supabaseConfig: SupabaseConfig;
  initialMode?: 'signin' | 'signup';
}

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

const POPULAR_MAJORS = [
  'Computer Science',
  'Data Science & AI',
  'Electrical Engineering',
  'Mechanical Engineering',
  'Mathematics & Statistics',
  'Biology & Pre-Med',
  'Economics & Finance',
  'Physics',
  'Psychology',
  'Chemistry'
];

const UNDERGRAD_BACHELORS_YEARS = [
  'Freshman (1st Year)',
  'Sophomore (2nd Year)',
  'Junior (3rd Year)',
  'Senior (4th Year)'
];

const MASTERS_YEARS = [
  'Year 1',
  'Year 2'
];

const PHD_YEARS = [
  'Year 1',
  'Year 2',
  'Year 3',
  'Year 4+'
];

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  user,
  onUserChange,
  supabaseConfig,
  initialMode = 'signup',
}) => {
  // Unauthenticated Form State
  const [isSignUp, setIsSignUp] = useState(initialMode === 'signup');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [name, setName] = useState('');
  const [university, setUniversity] = useState('Stanford University');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Authenticated Settings State
  const [activeTab, setActiveTab] = useState<'profile' | 'settings'>('profile');
  const [editName, setEditName] = useState('');
  const [editUsername, setEditUsername] = useState('');
  const [editBio, setEditBio] = useState('');
  const [editAvatarUrl, setEditAvatarUrl] = useState('');
  const [isSavingSettings, setIsSavingSettings] = useState(false);
  const [settingsSuccess, setSettingsSuccess] = useState(false);

  // Structured Academic Information Hierarchy State
  const [educationLevel, setEducationLevel] = useState<EducationLevel>('undergraduate');
  const [undergraduateStage, setUndergraduateStage] = useState<UndergraduateStage>('college');
  const [institution, setInstitution] = useState('');
  const [academicYear, setAcademicYear] = useState('Freshman (1st Year)');
  const [semester, setSemester] = useState<AcademicSemester>('semester_1');
  const [majorOrField, setMajorOrField] = useState('');

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Sync mode and form fields when user or modal changes
  useEffect(() => {
    if (isOpen) {
      setErrorMsg(null);
      setSuccessMsg(null);
      setSettingsSuccess(false);

      if (user) {
        setActiveTab('profile');
        setEditName(user.name || '');
        setEditUsername(user.username || '');
        setEditBio(user.bio || 'Sharing verified course lecture notes & past exam cheat sheets.');
        setEditAvatarUrl(user.avatarUrl || '');

        // Initialize structured education hierarchy
        const prof = user.academicProfile;
        const currentEduLevel: EducationLevel =
          prof?.educationLevel ||
          user.educationLevel ||
          (user.academicLevel === 'graduate' ? 'masters' : 'undergraduate');
        setEducationLevel(currentEduLevel);

        setUndergraduateStage(
          prof?.undergraduateStage ||
          user.undergraduateStage ||
          (user.academicLevel === 'high_school' ? 'high_school' : 'college')
        );

        setInstitution(prof?.institution || user.university || 'Stanford University');

        // Normalize academic year based on education level
        const storedYear = prof?.academicYear || user.academicYear || user.undergraduateYear || '';
        if (currentEduLevel === 'masters') {
          setAcademicYear(MASTERS_YEARS.includes(storedYear) ? storedYear : MASTERS_YEARS[0]);
        } else if (currentEduLevel === 'phd') {
          setAcademicYear(PHD_YEARS.includes(storedYear) ? storedYear : PHD_YEARS[0]);
        } else {
          setAcademicYear(UNDERGRAD_BACHELORS_YEARS.includes(storedYear) ? storedYear : UNDERGRAD_BACHELORS_YEARS[0]);
        }

        setSemester(prof?.semester || user.semester || 'semester_1');
        setMajorOrField(prof?.majorOrField || user.majorOrField || user.fieldOfStudy || 'Computer Science');
      } else {
        setIsSignUp(initialMode === 'signup');
      }
    }
  }, [isOpen, user, initialMode]);

  // Handle Education Level change and adjust academic year appropriately
  const handleEducationLevelChange = (newLevel: EducationLevel) => {
    setEducationLevel(newLevel);

    if (newLevel === 'masters') {
      if (!MASTERS_YEARS.includes(academicYear)) {
        setAcademicYear(MASTERS_YEARS[0]);
      }
    } else if (newLevel === 'phd') {
      if (!PHD_YEARS.includes(academicYear)) {
        setAcademicYear(PHD_YEARS[0]);
      }
    } else {
      if (!UNDERGRAD_BACHELORS_YEARS.includes(academicYear)) {
        setAcademicYear(UNDERGRAD_BACHELORS_YEARS[0]);
      }
    }
  };

  if (!isOpen) return null;

  // Sign In / Sign Up handler
  const handleSubmitAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    const supabase = getSupabaseInstance(supabaseConfig);

    try {
      if (supabase && supabaseConfig.isConnected) {
        if (isSignUp) {
          const generatedUsername = email.split('@')[0].replace(/[^a-zA-Z0-9_]/g, '');
          const initialProfile: AcademicProfileInfo = {
            educationLevel: 'undergraduate',
            undergraduateStage: 'college',
            institution: university.trim(),
            academicYear: 'Freshman (1st Year)',
            semester: 'semester_1',
            majorOrField: 'Computer Science'
          };

          const { data, error } = await supabase.auth.signUp({
            email: email.trim(),
            password: password.trim(),
            options: {
              data: {
                full_name: name.trim(),
                username: generatedUsername,
                university: university.trim(),
                academic_profile: initialProfile,
                education_level: 'undergraduate',
                undergraduate_stage: 'college',
                academic_year: 'Freshman (1st Year)',
                semester: 'semester_1',
                major_or_field: 'Computer Science',
                bio: 'Sharing verified lecture notes and study guides.'
              }
            }
          });
          if (error) throw error;

          const createdUser: StudentUser = {
            id: data.user?.id || `usr-${Date.now()}`,
            email: data.user?.email || email.trim(),
            name: name.trim() || 'Student Contributor',
            username: generatedUsername,
            university: university.trim() || 'University Member',
            academicProfile: initialProfile,
            educationLevel: 'undergraduate',
            undergraduateStage: 'college',
            academicYear: 'Freshman (1st Year)',
            semester: 'semester_1',
            majorOrField: 'Computer Science',
            bio: 'Sharing verified lecture notes and study guides.',
            isGuest: false
          };

          localStorage.setItem('studyvault_active_user', JSON.stringify(createdUser));
          onUserChange(createdUser);

          if (data.session) {
            setSuccessMsg('Student account created successfully!');
            setTimeout(() => onClose(), 800);
          } else {
            setSuccessMsg('Account registered! If confirmation is required, please check your inbox.');
            setTimeout(() => onClose(), 1500);
          }
        } else {
          const { data, error } = await supabase.auth.signInWithPassword({
            email: email.trim(),
            password: password.trim()
          });
          if (error) throw error;

          if (data.user) {
            const meta = data.user.user_metadata || {};
            const loggedInUser: StudentUser = {
              id: data.user.id,
              email: data.user.email || email.trim(),
              name: meta.full_name || name.trim() || email.split('@')[0],
              username: meta.username || email.split('@')[0],
              university: meta.university || university.trim() || 'University Member',
              academicProfile: meta.academic_profile,
              educationLevel: meta.education_level || 'undergraduate',
              undergraduateStage: meta.undergraduate_stage || 'college',
              academicYear: meta.academic_year || 'Freshman (1st Year)',
              semester: meta.semester || 'semester_1',
              majorOrField: meta.major_or_field || 'Computer Science',
              bio: meta.bio || 'Sharing verified study materials.',
              avatarUrl: meta.avatar_url || undefined,
              isGuest: false
            };
            localStorage.setItem('studyvault_active_user', JSON.stringify(loggedInUser));
            onUserChange(loggedInUser);
          }
          setSuccessMsg('Signed in successfully!');
          setTimeout(() => onClose(), 600);
        }
      } else {
        // Local student auth simulation
        await new Promise(r => setTimeout(r, 300));
        const generatedUsername = email ? email.split('@')[0].replace(/[^a-zA-Z0-9_]/g, '') : `student_${Date.now().toString().slice(-4)}`;
        const initialProfile: AcademicProfileInfo = {
          educationLevel: 'undergraduate',
          undergraduateStage: 'college',
          institution: university.trim() || 'Stanford University',
          academicYear: 'Freshman (1st Year)',
          semester: 'semester_1',
          majorOrField: 'Computer Science'
        };

        const simulatedUser: StudentUser = {
          id: `usr-${Date.now()}`,
          email: email.trim() || 'student@university.edu',
          name: name.trim() || (email ? email.split('@')[0] : 'Alex Student'),
          username: generatedUsername,
          university: university.trim() || 'Stanford University',
          academicProfile: initialProfile,
          educationLevel: 'undergraduate',
          undergraduateStage: 'college',
          academicYear: 'Freshman (1st Year)',
          semester: 'semester_1',
          majorOrField: 'Computer Science',
          bio: 'Undergraduate student sharing lecture summaries, cheat sheets, and lab guides.',
          isGuest: true
        };
        localStorage.setItem('studyvault_active_user', JSON.stringify(simulatedUser));
        onUserChange(simulatedUser);
        setSuccessMsg(isSignUp ? 'Student account created!' : 'Signed in successfully!');
        setTimeout(() => onClose(), 600);
      }
    } catch (err: any) {
      setErrorMsg(err?.message || 'Authentication error. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  // Avatar file upload handler
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

  // Save Settings handler with full Structured Education Hierarchy
  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setIsSavingSettings(true);
    setErrorMsg(null);

    const cleanUsername = editUsername.trim().replace(/^@/, '');
    const cleanInstitution = institution.trim() || user.university || 'University Member';
    const isUndergraduate = educationLevel === 'undergraduate';

    const structuredProfile: AcademicProfileInfo = {
      educationLevel,
      undergraduateStage: isUndergraduate ? undergraduateStage : undefined,
      institution: cleanInstitution,
      academicYear,
      semester,
      majorOrField: !isUndergraduate ? majorOrField.trim() : (undergraduateStage === 'college' ? majorOrField.trim() : undefined)
    };

    const updatedUser: StudentUser = {
      ...user,
      name: editName.trim() || user.name,
      username: cleanUsername || undefined,
      university: cleanInstitution,
      // Structured Academic Hierarchy
      academicProfile: structuredProfile,
      educationLevel,
      undergraduateStage: structuredProfile.undergraduateStage,
      academicYear: structuredProfile.academicYear,
      semester: structuredProfile.semester,
      majorOrField: structuredProfile.majorOrField,
      // Backwards-compatibility
      undergraduateCollege: isUndergraduate ? (undergraduateStage === 'high_school' ? 'High School Division' : 'College Division') : undefined,
      undergraduateYear: academicYear,
      fieldOfStudy: structuredProfile.majorOrField,
      bio: editBio.trim() || undefined,
      avatarUrl: editAvatarUrl.trim() || undefined,
    };

    try {
      const supabase = getSupabaseInstance(supabaseConfig);
      if (supabase && supabaseConfig.isConnected && !user.isGuest) {
        await supabase.auth.updateUser({
          data: {
            full_name: updatedUser.name,
            username: updatedUser.username,
            university: updatedUser.university,
            academic_profile: structuredProfile,
            education_level: educationLevel,
            undergraduate_stage: structuredProfile.undergraduateStage,
            academic_year: academicYear,
            semester: semester,
            major_or_field: structuredProfile.majorOrField,
            bio: updatedUser.bio,
            avatar_url: updatedUser.avatarUrl,
          }
        });
      }

      localStorage.setItem('studyvault_active_user', JSON.stringify(updatedUser));
      onUserChange(updatedUser);
      setSettingsSuccess(true);

      setTimeout(() => {
        setSettingsSuccess(false);
        setActiveTab('profile');
      }, 700);
    } catch (err: any) {
      setErrorMsg(err?.message || 'Failed to update settings. Please try again.');
    } finally {
      setIsSavingSettings(false);
    }
  };

  // Sign out handler
  const handleSignOut = async () => {
    try {
      const supabase = getSupabaseInstance(supabaseConfig);
      if (supabase) {
        await supabase.auth.signOut();
      }
    } catch {
      // Ignore network errors
    }
    localStorage.removeItem('studyvault_active_user');
    onUserChange(null);
    onClose();
  };

  // Helper to format level badge
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

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200 overflow-y-auto"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="relative bg-[#0d0f14]/95 border border-white/10 rounded-2xl shadow-[0_0_50px_rgba(0,240,255,0.12)] w-full max-w-xl flex flex-col overflow-hidden backdrop-blur-2xl my-auto max-h-[94vh] sm:max-h-[90vh]">
        {/* Holographic Top Glow Border */}
        <div className="absolute top-0 inset-x-0 h-0.5 bg-gradient-to-r from-transparent via-[#00f0ff] to-transparent" />

        {/* Header */}
        <header className="px-4 sm:px-6 py-3.5 sm:py-4.5 border-b border-white/10 flex items-center justify-between bg-white/[0.02] shrink-0">
          <div className="flex items-center gap-2.5 sm:gap-3">
            <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-white/10 border border-white/15 flex items-center justify-center text-[#00f0ff] shrink-0">
              <GraduationCap className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <div className="min-w-0">
              <h2 className="text-sm sm:text-base font-bold text-white tracking-tight flex items-center gap-2 truncate">
                {user ? (
                  activeTab === 'settings' ? 'Academic Settings' : 'Student Profile'
                ) : isSignUp ? (
                  'Create Student Account'
                ) : (
                  'Welcome Back'
                )}
                <span className="text-[10px] font-mono uppercase px-1.5 py-0.5 rounded bg-white/10 text-white/60 shrink-0">
                  {supabaseConfig.isConnected ? 'Supabase' : 'Auth'}
                </span>
              </h2>
              <p className="text-[11px] sm:text-xs text-white/50 truncate">
                {user
                  ? activeTab === 'settings'
                    ? 'Update your academic details, username, and profile'
                    : 'Your verified credentials, academic standing, and public bio'
                  : isSignUp
                  ? 'Sign up to upload notes & bookmark materials'
                  : 'Sign in to access your study account'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-white/40 hover:text-white rounded-lg transition-colors cursor-pointer hover:bg-white/5 shrink-0"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </header>

        {/* Scrollable Body Content */}
        <div className="p-4 sm:p-6 text-xs text-white overflow-y-auto space-y-4">
          {user ? (
            /* ========================================================
               LOGGED IN USER AREA: TABS (PROFILE / SETTINGS)
               ======================================================== */
            <div className="space-y-4">
              {/* Tab Navigation */}
              <div className="flex p-1 bg-white/[0.04] border border-white/10 rounded-xl">
                <button
                  type="button"
                  onClick={() => {
                    setActiveTab('profile');
                    setErrorMsg(null);
                  }}
                  className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-all cursor-pointer flex items-center justify-center gap-1.5 sm:gap-2 ${
                    activeTab === 'profile'
                      ? 'bg-white text-black shadow-md font-bold'
                      : 'text-white/60 hover:text-white'
                  }`}
                >
                  <UserCheck className="w-3.5 h-3.5" />
                  <span>Student Profile</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setActiveTab('settings');
                    setErrorMsg(null);
                  }}
                  className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-all cursor-pointer flex items-center justify-center gap-1.5 sm:gap-2 ${
                    activeTab === 'settings'
                      ? 'bg-white text-black shadow-md font-bold'
                      : 'text-white/60 hover:text-white'
                  }`}
                >
                  <Edit3 className="w-3.5 h-3.5" />
                  <span>Academic Settings</span>
                </button>
              </div>

              {errorMsg && (
                <div className="p-3 bg-rose-500/10 border border-rose-500/30 text-rose-300 rounded-xl flex items-center gap-2.5 animate-in fade-in">
                  <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
                  <span className="text-[11px] leading-relaxed">{errorMsg}</span>
                </div>
              )}

              {settingsSuccess && (
                <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 rounded-xl flex items-center gap-2.5 animate-in fade-in">
                  <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
                  <span className="text-[11px] leading-relaxed">Academic information updated and saved successfully!</span>
                </div>
              )}

              {activeTab === 'profile' ? (
                /* TAB 1: PUBLIC STUDENT PROFILE CARD WITH EDUCATION HIERARCHY */
                <div className="space-y-4">
                  <div className="p-5 bg-white/[0.03] rounded-2xl border border-white/10 space-y-4 relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-36 h-36 bg-cyan-500/10 rounded-full blur-2xl pointer-events-none" />

                    {/* Avatar & Identifiers */}
                    <div className="flex items-start gap-4">
                      <div className="relative">
                        {user.avatarUrl ? (
                          <img
                            src={user.avatarUrl}
                            alt={user.name}
                            className="w-16 h-16 rounded-2xl object-cover border-2 border-cyan-400 shadow-[0_0_20px_rgba(0,240,255,0.25)]"
                          />
                        ) : (
                          <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-cyan-500/20 to-blue-500/20 border-2 border-cyan-400/40 text-cyan-300 flex items-center justify-center font-bold text-2xl shadow-[0_0_20px_rgba(0,240,255,0.25)]">
                            {user.name.charAt(0).toUpperCase()}
                          </div>
                        )}
                        <span className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-emerald-400 border-2 border-[#0d0f14]" title="Active student session" />
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="font-bold text-white text-base tracking-tight truncate">{user.name}</h3>
                          {user.username && (
                            <span className="text-cyan-300 font-mono text-xs">@{user.username}</span>
                          )}
                        </div>
                        <p className="text-white/60 text-xs font-mono truncate">{user.email}</p>

                        <div className="flex items-center gap-2 mt-2 flex-wrap">
                          <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-400 bg-emerald-400/10 px-2 py-0.5 rounded-md border border-emerald-400/20">
                            <ShieldCheck className="w-3 h-3" />
                            <span>Verified Student</span>
                          </span>

                          {/* Level Badge */}
                          <span className="text-[11px] font-mono text-cyan-300 bg-cyan-400/10 px-2 py-0.5 rounded-md border border-cyan-400/20">
                            {getLevelLabel(user.educationLevel || user.academicProfile?.educationLevel)}
                          </span>

                          {/* Undergraduate stage badge if applicable */}
                          {(user.educationLevel === 'undergraduate' || (!user.educationLevel && user.undergraduateStage)) && (
                            <span className="text-[11px] font-mono text-white/70 bg-white/10 px-2 py-0.5 rounded-md border border-white/15">
                              {user.undergraduateStage === 'high_school' ? 'High School' : 'College'}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Structured Academic Hierarchy Grid */}
                    <div className="pt-3 border-t border-white/10 grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-white/70 text-xs">
                      {/* Institution */}
                      <div className="bg-white/[0.02] p-2.5 rounded-xl border border-white/5">
                        <span className="text-[10px] text-white/40 block mb-0.5 font-jetbrains uppercase tracking-wider">
                          Institution / University
                        </span>
                        <span className="font-semibold text-white truncate block">
                          {user.academicProfile?.institution || user.university}
                        </span>
                      </div>

                      {/* Major or Research Field */}
                      {(user.majorOrField || user.academicProfile?.majorOrField) && (
                        <div className="bg-white/[0.02] p-2.5 rounded-xl border border-white/5">
                          <span className="text-[10px] text-white/40 block mb-0.5 font-jetbrains uppercase tracking-wider">
                            {user.educationLevel === 'phd' ? 'Research Field' : 'Major / Field of Study'}
                          </span>
                          <span className="font-semibold text-white truncate block">
                            {user.academicProfile?.majorOrField || user.majorOrField}
                          </span>
                        </div>
                      )}

                      {/* Academic Year */}
                      <div className="bg-white/[0.02] p-2.5 rounded-xl border border-white/5">
                        <span className="text-[10px] text-white/40 block mb-0.5 font-jetbrains uppercase tracking-wider">
                          Academic Year
                        </span>
                        <span className="font-semibold text-white truncate block">
                          {user.academicProfile?.academicYear || user.academicYear || 'Freshman (1st Year)'}
                        </span>
                      </div>

                      {/* Semester */}
                      <div className="bg-white/[0.02] p-2.5 rounded-xl border border-white/5">
                        <span className="text-[10px] text-white/40 block mb-0.5 font-jetbrains uppercase tracking-wider">
                          Current Term
                        </span>
                        <span className="font-semibold text-white truncate block">
                          {(user.academicProfile?.semester || user.semester) === 'semester_2' ? 'Semester 2' : 'Semester 1'}
                        </span>
                      </div>
                    </div>

                    {/* Public Bio Quote Box */}
                    {user.bio ? (
                      <div className="pt-1">
                        <span className="text-[10px] uppercase font-mono tracking-wider text-white/40 block mb-1">
                          Public Description (Visible to everyone)
                        </span>
                        <p className="p-3 bg-white/[0.02] rounded-xl border border-white/10 text-white/80 leading-relaxed text-xs italic">
                          "{user.bio}"
                        </p>
                      </div>
                    ) : (
                      <div className="pt-1">
                        <button
                          type="button"
                          onClick={() => setActiveTab('settings')}
                          className="text-[11px] text-cyan-300 hover:text-cyan-200 underline cursor-pointer"
                        >
                          + Add a student description / bio visible to everyone
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-3 pt-1">
                    <button
                      type="button"
                      onClick={() => setActiveTab('settings')}
                      className="flex-1 py-2.5 px-4 text-xs font-bold text-black bg-[#00f0ff] hover:bg-[#00f0ff]/90 rounded-xl transition-all cursor-pointer shadow-[0_0_15px_rgba(0,240,255,0.25)] flex items-center justify-center gap-2 active:scale-98"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                      <span>Edit Academic Info & Profile</span>
                    </button>
                    <button
                      type="button"
                      onClick={handleSignOut}
                      className="py-2.5 px-4 text-xs font-semibold text-rose-300 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 rounded-xl transition-all cursor-pointer flex items-center justify-center gap-2"
                    >
                      <LogOut className="w-3.5 h-3.5" />
                      <span>Sign Out</span>
                    </button>
                  </div>
                </div>
              ) : (
                /* ========================================================
                   TAB 2: STRUCTURED EDUCATION HIERARCHY & SETTINGS FORM
                   ======================================================== */
                <form onSubmit={handleSaveSettings} className="space-y-4">
                  {/* --- SECTION 1: STRUCTURED EDUCATION HIERARCHY --- */}
                  <div className="p-4 bg-white/[0.03] border border-white/10 rounded-2xl space-y-4">
                    <div className="flex items-center justify-between border-b border-white/10 pb-3">
                      <label className="text-xs font-bold text-white tracking-wide uppercase font-jetbrains flex items-center gap-2">
                        <GraduationCap className="w-4 h-4 text-cyan-400" />
                        <span>Academic Information</span>
                      </label>
                    </div>

                    {/* Education Level Selection */}
                    <div>
                      <label className="block text-[11px] font-bold text-white/80 uppercase tracking-wider mb-2 font-jetbrains">
                        Education Level
                      </label>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                        {[
                          { id: 'undergraduate', label: 'Undergraduate', desc: 'High School & College' },
                          { id: 'bachelors', label: "Bachelor's Program", desc: '4-Year Degree' },
                          { id: 'masters', label: "Master's Program", desc: 'Graduate Degree' },
                          { id: 'phd', label: 'PhD', desc: 'Doctoral Research' }
                        ].map((lvl) => {
                          const isSelected = educationLevel === lvl.id;
                          return (
                            <button
                              key={lvl.id}
                              type="button"
                              onClick={() => handleEducationLevelChange(lvl.id as EducationLevel)}
                              className={`p-2.5 text-left rounded-xl transition-all cursor-pointer border flex flex-col justify-between ${
                                isSelected
                                  ? 'bg-cyan-400 text-black border-cyan-400 font-bold shadow-[0_0_15px_rgba(0,240,255,0.35)]'
                                  : 'bg-white/[0.03] text-white/70 border-white/10 hover:border-white/25 hover:text-white'
                              }`}
                            >
                              <div className="flex items-center justify-between mb-1">
                                <span className="text-xs font-bold leading-tight">{lvl.label}</span>
                                {isSelected && <Check className="w-3.5 h-3.5 text-black shrink-0" />}
                              </div>
                              <span className={`text-[10px] ${isSelected ? 'text-black/80 font-medium' : 'text-white/40'}`}>
                                {lvl.desc}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* ========================================================
                        2. UNDERGRADUATE SECTION
                        ======================================================== */}
                    {educationLevel === 'undergraduate' && (
                      <div className="p-4 bg-cyan-400/[0.03] border border-cyan-400/20 rounded-xl space-y-4 animate-in fade-in">
                        <div className="flex items-center gap-2 text-cyan-300 text-xs font-bold font-jetbrains">
                          <Layers className="w-3.5 h-3.5" />
                          <span>Undergraduate</span>
                        </div>

                        {/* 2a. Academic Stage (High School vs College) */}
                        <div>
                          <label className="block text-[11px] font-semibold text-white/80 mb-1.5">
                            Academic Stage
                          </label>
                          <div className="grid grid-cols-2 gap-2">
                            {[
                              { id: 'high_school', label: 'High School', subtitle: 'Secondary education' },
                              { id: 'college', label: 'College', subtitle: 'Higher education institution' }
                            ].map((stage) => {
                              const isStageSelected = undergraduateStage === stage.id;
                              return (
                                <button
                                  key={stage.id}
                                  type="button"
                                  onClick={() => setUndergraduateStage(stage.id as UndergraduateStage)}
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
                                  <span className={`text-[10px] ${isStageSelected ? 'text-black/70' : 'text-white/40'}`}>
                                    {stage.subtitle}
                                  </span>
                                </button>
                              );
                            })}
                          </div>
                        </div>

                        {/* 2b. Academic Institution */}
                        <div>
                          <label className="block text-[11px] font-semibold text-white/80 mb-1">
                            Institution Name
                          </label>
                          <input
                            type="text"
                            required
                            value={institution}
                            onChange={(e) => setInstitution(e.target.value)}
                            placeholder="e.g. Stanford University, MIT, Berkeley High, Lowell"
                            className="w-full px-3.5 py-2.5 bg-white/[0.04] border border-white/15 rounded-xl text-white placeholder-white/30 text-xs focus:outline-none focus:border-[#00f0ff] focus:ring-1 focus:ring-[#00f0ff] transition-all"
                          />
                        </div>

                        {/* 2c. Academic Year & 2d. Semester */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div>
                            <label className="block text-[11px] font-semibold text-white/80 mb-1">
                              Academic Year
                            </label>
                            <select
                              value={academicYear}
                              onChange={(e) => setAcademicYear(e.target.value)}
                              className="w-full px-3.5 py-2.5 bg-[#12141a] border border-white/15 rounded-xl text-white text-xs focus:outline-none focus:border-[#00f0ff] focus:ring-1 focus:ring-[#00f0ff] transition-all cursor-pointer"
                            >
                              {UNDERGRAD_BACHELORS_YEARS.map((yr) => (
                                <option key={yr} value={yr}>{yr}</option>
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

                    {/* ========================================================
                        3. BACHELOR'S PROGRAM SECTION
                        ======================================================== */}
                    {educationLevel === 'bachelors' && (
                      <div className="p-4 bg-cyan-400/[0.03] border border-cyan-400/20 rounded-xl space-y-4 animate-in fade-in">
                        <div className="flex items-center gap-2 text-cyan-300 text-xs font-bold font-jetbrains">
                          <BookOpen className="w-3.5 h-3.5" />
                          <span>Bachelor's Program</span>
                        </div>

                        {/* 3a. Major / Field of Study */}
                        <div>
                          <label className="block text-[11px] font-semibold text-white/80 mb-1">
                            Major / Field of Study
                          </label>
                          <input
                            type="text"
                            required
                            value={majorOrField}
                            onChange={(e) => setMajorOrField(e.target.value)}
                            placeholder="e.g. Computer Science, Mechanical Engineering, Economics"
                            className="w-full px-3.5 py-2.5 bg-white/[0.04] border border-white/15 rounded-xl text-white placeholder-white/30 text-xs focus:outline-none focus:border-[#00f0ff] focus:ring-1 focus:ring-[#00f0ff] transition-all"
                          />

                          {/* Quick selection chips */}
                          <div className="mt-2 flex items-center gap-1.5 flex-wrap">
                            <span className="text-[10px] text-white/40 font-mono">Suggested:</span>
                            {POPULAR_MAJORS.slice(0, 5).map((m) => (
                              <button
                                key={m}
                                type="button"
                                onClick={() => setMajorOrField(m)}
                                className={`text-[10px] px-2 py-0.5 rounded-md border transition-all cursor-pointer ${
                                  majorOrField === m
                                    ? 'bg-cyan-400 text-black border-cyan-400 font-bold'
                                    : 'bg-white/[0.04] text-white/60 border-white/10 hover:text-white'
                                }`}
                              >
                                {m}
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* 3b. Major University / Institution Name */}
                        <div>
                          <label className="block text-[11px] font-semibold text-white/80 mb-1">
                            Major University / Institution Name
                          </label>
                          <input
                            type="text"
                            required
                            value={institution}
                            onChange={(e) => setInstitution(e.target.value)}
                            placeholder="e.g. Stanford University, MIT, UC Berkeley"
                            className="w-full px-3.5 py-2.5 bg-white/[0.04] border border-white/15 rounded-xl text-white placeholder-white/30 text-xs focus:outline-none focus:border-[#00f0ff] focus:ring-1 focus:ring-[#00f0ff] transition-all"
                          />
                        </div>

                        {/* 3c. Academic Year & 3d. Semester */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div>
                            <label className="block text-[11px] font-semibold text-white/80 mb-1">
                              Academic Year
                            </label>
                            <select
                              value={academicYear}
                              onChange={(e) => setAcademicYear(e.target.value)}
                              className="w-full px-3.5 py-2.5 bg-[#12141a] border border-white/15 rounded-xl text-white text-xs focus:outline-none focus:border-[#00f0ff] focus:ring-1 focus:ring-[#00f0ff] transition-all cursor-pointer"
                            >
                              {UNDERGRAD_BACHELORS_YEARS.map((yr) => (
                                <option key={yr} value={yr}>{yr}</option>
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

                    {/* ========================================================
                        4. MASTER'S PROGRAM SECTION
                        ======================================================== */}
                    {educationLevel === 'masters' && (
                      <div className="p-4 bg-cyan-400/[0.03] border border-cyan-400/20 rounded-xl space-y-4 animate-in fade-in">
                        <div className="flex items-center gap-2 text-cyan-300 text-xs font-bold font-jetbrains">
                          <Compass className="w-3.5 h-3.5" />
                          <span>Master's Program</span>
                        </div>

                        {/* 4a. Major / Field of Study */}
                        <div>
                          <label className="block text-[11px] font-semibold text-white/80 mb-1">
                            Major / Field of Study (Specialization)
                          </label>
                          <input
                            type="text"
                            required
                            value={majorOrField}
                            onChange={(e) => setMajorOrField(e.target.value)}
                            placeholder="e.g. Master of Science in Artificial Intelligence, MBA, Data Science"
                            className="w-full px-3.5 py-2.5 bg-white/[0.04] border border-white/15 rounded-xl text-white placeholder-white/30 text-xs focus:outline-none focus:border-[#00f0ff] focus:ring-1 focus:ring-[#00f0ff] transition-all"
                          />
                        </div>

                        {/* 4b. Major University / Institution Name */}
                        <div>
                          <label className="block text-[11px] font-semibold text-white/80 mb-1">
                            Major University / Institution Name
                          </label>
                          <input
                            type="text"
                            required
                            value={institution}
                            onChange={(e) => setInstitution(e.target.value)}
                            placeholder="e.g. Stanford University, Carnegie Mellon, Oxford"
                            className="w-full px-3.5 py-2.5 bg-white/[0.04] border border-white/15 rounded-xl text-white placeholder-white/30 text-xs focus:outline-none focus:border-[#00f0ff] focus:ring-1 focus:ring-[#00f0ff] transition-all"
                          />
                        </div>

                        {/* 4c. Academic Year (Year 1, Year 2) & 4d. Semester */}
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

                    {/* ========================================================
                        5. PHD PROGRAM SECTION
                        ======================================================== */}
                    {educationLevel === 'phd' && (
                      <div className="p-4 bg-cyan-400/[0.03] border border-cyan-400/20 rounded-xl space-y-4 animate-in fade-in">
                        <div className="flex items-center gap-2 text-cyan-300 text-xs font-bold font-jetbrains">
                          <Award className="w-3.5 h-3.5" />
                          <span>PhD Program</span>
                        </div>

                        {/* 5a. Major / Research Field */}
                        <div>
                          <label className="block text-[11px] font-semibold text-white/80 mb-1">
                            Major / Research Field
                          </label>
                          <input
                            type="text"
                            required
                            value={majorOrField}
                            onChange={(e) => setMajorOrField(e.target.value)}
                            placeholder="e.g. Distributed Consensus, Quantum Photonics, Neurobiology"
                            className="w-full px-3.5 py-2.5 bg-white/[0.04] border border-white/15 rounded-xl text-white placeholder-white/30 text-xs focus:outline-none focus:border-[#00f0ff] focus:ring-1 focus:ring-[#00f0ff] transition-all"
                          />
                        </div>

                        {/* 5b. Major University / Institution Name */}
                        <div>
                          <label className="block text-[11px] font-semibold text-white/80 mb-1">
                            Major University / Institution Name
                          </label>
                          <input
                            type="text"
                            required
                            value={institution}
                            onChange={(e) => setInstitution(e.target.value)}
                            placeholder="e.g. Stanford University, MIT, ETH Zurich"
                            className="w-full px-3.5 py-2.5 bg-white/[0.04] border border-white/15 rounded-xl text-white placeholder-white/30 text-xs focus:outline-none focus:border-[#00f0ff] focus:ring-1 focus:ring-[#00f0ff] transition-all"
                          />
                        </div>

                        {/* 5c. Academic Year (Year 1, 2, 3, 4+) & 5d. Semester */}
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

                  {/* --- SECTION 2: USERNAME & DISPLAY NAME --- */}
                  <div className="p-4 bg-white/[0.03] border border-white/10 rounded-2xl space-y-3">
                    <label className="block text-xs font-bold text-white tracking-wide uppercase font-jetbrains flex items-center gap-2">
                      <AtSign className="w-3.5 h-3.5 text-cyan-400" />
                      <span>Username & Display Name</span>
                    </label>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[11px] text-white/70 mb-1">Full Name</label>
                        <input
                          type="text"
                          required
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          placeholder="e.g. Alex Thorne"
                          className="w-full px-3 py-2 bg-white/[0.04] border border-white/10 rounded-xl text-white placeholder-white/30 text-xs focus:outline-none focus:border-[#00f0ff] focus:ring-1 focus:ring-[#00f0ff] transition-all"
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] text-white/70 mb-1 flex items-center justify-between">
                          <span>Username Handle</span>
                          <span className="text-cyan-300 font-mono text-[10px]">
                            {editUsername ? `@${editUsername.replace(/^@/, '')}` : '@handle'}
                          </span>
                        </label>
                        <div className="relative">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40 font-mono">@</span>
                          <input
                            type="text"
                            value={editUsername.replace(/^@/, '')}
                            onChange={(e) => setEditUsername(e.target.value.replace(/[^a-zA-Z0-9_]/g, ''))}
                            placeholder="username"
                            className="w-full pl-7 pr-3 py-2 bg-white/[0.04] border border-white/10 rounded-xl text-white placeholder-white/30 text-xs font-mono focus:outline-none focus:border-[#00f0ff] focus:ring-1 focus:ring-[#00f0ff] transition-all"
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* --- SECTION 3: PROFILE PICTURE OPTION --- */}
                  <div className="p-4 bg-white/[0.03] border border-white/10 rounded-2xl space-y-3">
                    <label className="block text-xs font-bold text-white tracking-wide uppercase font-jetbrains flex items-center gap-2">
                      <Camera className="w-3.5 h-3.5 text-cyan-400" />
                      <span>Profile Picture</span>
                    </label>

                    <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4">
                      {/* Avatar Preview */}
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

                      {/* Photo Upload & Presets Actions */}
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
                            <span>Upload Image</span>
                          </button>

                          {editAvatarUrl && (
                            <button
                              type="button"
                              onClick={() => setEditAvatarUrl('')}
                              className="py-1.5 px-2.5 text-rose-300 hover:text-rose-200 text-xs transition-colors cursor-pointer"
                            >
                              Reset
                            </button>
                          )}
                        </div>

                        {/* Animated Character Presets */}
                        <div className="w-full">
                          <span className="text-[10px] text-white/60 block mb-2 font-jetbrains uppercase tracking-wider flex items-center justify-center sm:justify-start gap-1.5">
                            <Sparkles className="w-3 h-3 text-cyan-400" />
                            <span>Animated Character Presets</span>
                          </span>
                          <div className="flex items-center justify-center sm:justify-start gap-2 sm:gap-2.5 flex-wrap p-2.5 rounded-xl bg-black/40 border border-white/10">
                            {AVATAR_PRESETS.map((preset) => (
                              <button
                                key={preset.name}
                                type="button"
                                onClick={() => setEditAvatarUrl(preset.url)}
                                title={preset.name}
                                className={`w-10 h-10 sm:w-11 sm:h-11 rounded-xl overflow-hidden border p-1 transition-all duration-200 cursor-pointer bg-white/[0.04] active:scale-95 group relative ${
                                  editAvatarUrl === preset.url
                                    ? 'border-[#00f0ff] scale-105 shadow-[0_0_15px_rgba(0,240,255,0.45)] ring-2 ring-[#00f0ff]/60 bg-[#00f0ff]/15'
                                    : 'border-white/15 opacity-80 hover:opacity-100 hover:border-white/35 hover:scale-105'
                                }`}
                              >
                                <img
                                  src={preset.url}
                                  alt={preset.name}
                                  className="w-full h-full rounded-lg object-contain transition-transform group-hover:scale-110"
                                  loading="lazy"
                                />
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* --- SECTION 4: PUBLIC DESCRIPTION (BIO) --- */}
                  <div className="p-4 bg-white/[0.03] border border-white/10 rounded-2xl space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold text-white tracking-wide uppercase font-jetbrains flex items-center gap-2">
                        <FileText className="w-3.5 h-3.5 text-cyan-400" />
                        <span>Public Description (Visible to everyone)</span>
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
                      placeholder="Write a brief student intro visible to anyone viewing your notes or profile (e.g. Junior CS student focusing on machine learning and algorithms. Uploading study guides for CS106 & MATH51)."
                      className="w-full p-3 bg-white/[0.04] border border-white/10 rounded-xl text-white placeholder-white/30 text-xs focus:outline-none focus:border-[#00f0ff] focus:ring-1 focus:ring-[#00f0ff] transition-all resize-none leading-relaxed"
                    />
                  </div>

                  {/* Form Submission Buttons */}
                  <div className="flex items-center gap-3 pt-2">
                    <button
                      type="submit"
                      disabled={isSavingSettings}
                      className="flex-1 py-3 px-4 text-xs font-bold text-black bg-[#00f0ff] hover:bg-[#00f0ff]/90 disabled:opacity-50 rounded-xl transition-all cursor-pointer shadow-[0_0_20px_rgba(0,240,255,0.3)] flex items-center justify-center gap-2 active:scale-98"
                    >
                      {isSavingSettings ? (
                        <span className="flex items-center gap-2">
                          <span className="w-3.5 h-3.5 border-2 border-black border-t-transparent rounded-full animate-spin" />
                          Saving Academic Information...
                        </span>
                      ) : (
                        <>
                          <Check className="w-4 h-4" />
                          <span>Save Academic Information</span>
                        </>
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveTab('profile')}
                      className="py-3 px-4 text-xs font-medium text-white/60 hover:text-white bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl transition-all cursor-pointer"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              )}
            </div>
          ) : (
            /* ========================================================
               UNAUTHENTICATED AREA: SIGN UP / LOG IN
               ======================================================== */
            <div>
              {/* Tab Switcher */}
              <div className="flex p-1 bg-white/[0.04] border border-white/10 rounded-xl mb-5">
                <button
                  type="button"
                  onClick={() => {
                    setIsSignUp(true);
                    setErrorMsg(null);
                    setSuccessMsg(null);
                  }}
                  className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                    isSignUp
                      ? 'bg-white text-black shadow-md font-bold'
                      : 'text-white/60 hover:text-white'
                  }`}
                >
                  Sign Up
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsSignUp(false);
                    setErrorMsg(null);
                    setSuccessMsg(null);
                  }}
                  className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                    !isSignUp
                      ? 'bg-white text-black shadow-md font-bold'
                      : 'text-white/60 hover:text-white'
                  }`}
                >
                  Log In
                </button>
              </div>

              <form onSubmit={handleSubmitAuth} className="space-y-4">
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

                {isSignUp && (
                  <>
                    <div>
                      <label className="block text-white/80 font-medium mb-1.5 flex items-center gap-1.5">
                        <UserIcon className="w-3.5 h-3.5 text-white/40" />
                        <span>Full Name</span>
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. Alex Thorne"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className="w-full px-3.5 py-2.5 bg-white/[0.04] border border-white/10 rounded-xl text-white placeholder-white/30 text-xs focus:outline-none focus:border-[#00f0ff] focus:ring-1 focus:ring-[#00f0ff] transition-all"
                      />
                    </div>

                    <div>
                      <label className="block text-white/80 font-medium mb-1.5 flex items-center gap-1.5">
                        <Building className="w-3.5 h-3.5 text-white/40" />
                        <span>Major University / Institution</span>
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. Stanford University, MIT, UC Berkeley"
                        value={university}
                        onChange={(e) => setUniversity(e.target.value)}
                        className="w-full px-3.5 py-2.5 bg-white/[0.04] border border-white/10 rounded-xl text-white placeholder-white/30 text-xs focus:outline-none focus:border-[#00f0ff] focus:ring-1 focus:ring-[#00f0ff] transition-all"
                      />
                    </div>
                  </>
                )}

                <div>
                  <label className="block text-white/80 font-medium mb-1.5 flex items-center gap-1.5">
                    <Mail className="w-3.5 h-3.5 text-white/40" />
                    <span>University Email</span>
                  </label>
                  <input
                    type="email"
                    required
                    placeholder="student@stanford.edu"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-white/[0.04] border border-white/10 rounded-xl text-white placeholder-white/30 text-xs focus:outline-none focus:border-[#00f0ff] focus:ring-1 focus:ring-[#00f0ff] transition-all"
                  />
                </div>

                <div>
                  <label className="block text-white/80 font-medium mb-1.5 flex items-center gap-1.5">
                    <Lock className="w-3.5 h-3.5 text-white/40" />
                    <span>Password</span>
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      minLength={6}
                      placeholder="•••••••• (min 6 characters)"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full pl-3.5 pr-10 py-2.5 bg-white/[0.04] border border-white/10 rounded-xl text-white placeholder-white/30 text-xs focus:outline-none focus:border-[#00f0ff] focus:ring-1 focus:ring-[#00f0ff] transition-all font-mono"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white transition-colors cursor-pointer"
                      tabIndex={-1}
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full mt-2 py-3 px-4 text-xs font-bold text-black bg-[#00f0ff] hover:bg-[#00f0ff]/90 disabled:opacity-50 rounded-xl transition-all cursor-pointer shadow-[0_0_20px_rgba(0,240,255,0.3)] hover:shadow-[0_0_25px_rgba(0,240,255,0.5)] active:scale-[0.99] flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <span className="flex items-center gap-2">
                      <span className="w-3.5 h-3.5 border-2 border-black border-t-transparent rounded-full animate-spin" />
                      Authenticating with Supabase...
                    </span>
                  ) : (
                    <span>{isSignUp ? 'Create Student Account' : 'Sign In to StudyVault'}</span>
                  )}
                </button>

                {/* Footer Switcher */}
                <div className="text-center pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setIsSignUp(!isSignUp);
                      setErrorMsg(null);
                      setSuccessMsg(null);
                    }}
                    className="text-white/60 hover:text-white transition-colors text-xs cursor-pointer inline-flex items-center gap-1"
                  >
                    {isSignUp ? (
                      <>
                        Already have an account? <span className="text-[#00f0ff] underline">Log In</span>
                      </>
                    ) : (
                      <>
                        Don't have an account? <span className="text-[#00f0ff] underline">Sign Up free</span>
                      </>
                    )}
                  </button>
                </div>

                {/* Open access note */}
                <div className="pt-3 border-t border-white/5 text-center">
                  <p className="text-[11px] text-white/40 leading-relaxed">
                    StudyVault is open to all students. Registration is free and lets you contribute notes & customize your structured academic profile.
                  </p>
                </div>
              </form>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
