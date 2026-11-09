import { SupabaseClient, User as SupabaseAuthUser } from '@supabase/supabase-js';
import {
  StudentUser,
  EducationLevel,
  UndergraduateStage,
  AcademicSemester,
  DegreeTier,
  UserSettingsData,
  UserPreferencesData
} from '../types/index.ts';
import {
  findUniversityByNameOrFuzzy,
  registerStudentToUniversity,
  ensureUniversityExistsInSupabase
} from './universityStore.ts';
import {
  ensureSystemProgramForRegisteredStudent,
  unenrollStudentFromProgram,
  ensureProgramExistsInSupabase
} from './programStore.ts';
import { extractCleanDisplayName } from './publicSyncRelay.ts';

const SETUP_DRAFT_PREFIX = 'xeusar_profile_setup_draft_';

export const DEFAULT_USER_SETTINGS: UserSettingsData = {
  publicBadgeEnabled: true,
  showUniOnNotes: true,
  flareLocked: true,
  rayColor: '#9ca3af',
  rayOrigin: 'top-center',
  rayBrightness: 0.5
};

export const DEFAULT_USER_PREFERENCES: UserPreferencesData = {
  preferredSubjects: [],
  studyStyle: '',
  sessionLength: '',
  collaborationMode: '',
  preferredLanguage: 'en',
  themePreference: 'dark',
  prioritizeVerifiedNotes: true,
  prioritizeMyInstitution: true,
  includePastExams: true
};

// ============================================================================
// VALIDATION UTILITIES
// ============================================================================

export function validateUsernameFormat(username: string): { valid: boolean; error?: string } {
  const trimmed = username.trim();
  if (!trimmed) {
    return { valid: false, error: 'Username is required.' };
  }
  if (trimmed.length < 3) {
    return { valid: false, error: 'Username must be at least 3 characters long.' };
  }
  if (trimmed.length > 30) {
    return { valid: false, error: 'Username cannot exceed 30 characters.' };
  }
  if (!/^[a-zA-Z0-9_.-]+$/.test(trimmed)) {
    return {
      valid: false,
      error: 'Username can only contain letters, numbers, underscores (_), dots (.), and hyphens (-).'
    };
  }
  return { valid: true };
}

export function validateDisplayName(displayName: string): { valid: boolean; error?: string } {
  const trimmed = typeof displayName === 'string' ? displayName.trim() : '';
  if (!trimmed) {
    return { valid: false, error: 'Display name is required.' };
  }
  if (trimmed.length > 100) {
    return { valid: false, error: 'Display name cannot exceed 100 characters.' };
  }
  return { valid: true };
}

export function validateEmailFormat(email: string): { valid: boolean; error?: string } {
  const trimmed = typeof email === 'string' ? email.trim() : '';
  if (!trimmed) {
    return { valid: false, error: 'Email address is required.' };
  }
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(trimmed)) {
    return { valid: false, error: 'Please enter a valid email address.' };
  }
  return { valid: true };
}

export function validatePasswordStrength(password: string): { valid: boolean; error?: string } {
  if (!password) {
    return { valid: false, error: 'Password is required.' };
  }
  if (password.length < 8) {
    return { valid: false, error: 'Password must be at least 8 characters long.' };
  }
  return { valid: true };
}

export function isIgnorableSchemaOrTableError(error: any): boolean {
  if (!error) return false;
  const code = String(error.code || '').toUpperCase();
  const msg = String(error.message || '').toLowerCase();
  const details = String(error.details || '').toLowerCase();

  // Do NOT treat 42501 (permission denied / RLS policy violation) or 23503 (FK violation)
  // as missing schema/table errors.
  if (code === '42501' || code === '23503' || msg.includes('row-level security') || msg.includes('permission denied')) {
    return false;
  }

  if (
    code === '42P01' ||
    code === '42703' ||
    code === 'PGRST204' ||
    code === 'PGRST205' ||
    code === 'PGRST202'
  ) {
    return true;
  }

  if (
    msg.includes('does not exist') ||
    msg.includes('schema cache') ||
    msg.includes('could not find the') ||
    details.includes('schema cache')
  ) {
    return true;
  }

  return false;
}

// ============================================================================
// USERNAME UNIQUENESS CHECK (Case-Insensitive)
// ============================================================================

export async function checkUsernameAvailability(
  supabase: SupabaseClient,
  username: string,
  currentUserId?: string
): Promise<{ available: boolean; error?: string }> {
  const formatCheck = validateUsernameFormat(username);
  if (!formatCheck.valid) {
    return { available: false, error: formatCheck.error };
  }

  const normalized = username.trim().toLowerCase();

  try {
    // 1. Try security-definer RPC function first
    const { data: rpcAvailable, error: rpcError } = await supabase.rpc(
      'check_username_available',
      {
        candidate_username: normalized,
        current_user_id: currentUserId || null
      }
    );

    if (!rpcError && typeof rpcAvailable === 'boolean') {
      return {
        available: rpcAvailable,
        error: rpcAvailable ? undefined : `The username "@${normalized}" is already taken.`
      };
    }

    // 2. Fallback: case-insensitive query on safe public_student_profiles view (never querying private profiles table across users)
    let query = supabase
      .from('public_student_profiles')
      .select('id')
      .ilike('username', normalized)
      .limit(1);

    if (currentUserId) {
      query = query.neq('id', currentUserId);
    }

    const { data, error } = await query;
    if (error) {
      return { available: true };
    }

    const taken = Boolean(data && data.length > 0);
    return {
      available: !taken,
      error: taken ? `The username "@${normalized}" is already taken.` : undefined
    };
  } catch {
    return { available: true };
  }
}

// ============================================================================
// PARTIAL PROFILE SETUP DRAFT PERSISTENCE (Resumable across sessions)
// ============================================================================

export interface SetupDraftData {
  displayName?: string;
  username?: string;
  bio?: string;
  avatarUrl?: string;
  educationLevel?: EducationLevel | '';
  undergraduateStage?: UndergraduateStage;
  majorOrField?: string;
  institution?: string;
  academicYear?: string;
  semester?: AcademicSemester | '';
  settings?: Partial<UserSettingsData>;
  preferences?: Partial<UserPreferencesData>;
  updatedAt?: string;
}

export function saveSetupDraft(userId: string, draft: SetupDraftData): void {
  if (!userId) return;
  try {
    const existing = loadSetupDraft(userId) || {};
    const merged: SetupDraftData = {
      ...existing,
      ...draft,
      displayName:
        draft.displayName && draft.displayName.trim()
          ? draft.displayName.trim()
          : existing.displayName,
      username:
        draft.username && draft.username.trim()
          ? draft.username.trim()
          : existing.username,
      updatedAt: new Date().toISOString()
    };
    localStorage.setItem(`${SETUP_DRAFT_PREFIX}${userId}`, JSON.stringify(merged));
  } catch {}
}

export function loadSetupDraft(userId: string): SetupDraftData | null {
  if (!userId) return null;
  try {
    const raw = localStorage.getItem(`${SETUP_DRAFT_PREFIX}${userId}`);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function clearSetupDraft(userId: string): void {
  if (!userId) return;
  try {
    localStorage.removeItem(`${SETUP_DRAFT_PREFIX}${userId}`);
  } catch {}
}

const PENDING_SIGNUP_DRAFT_KEY = 'xeusar_pending_signup_draft';

export function savePendingSignupDraft(
  email: string,
  data: { displayName: string; username: string }
): void {
  if (!email) return;
  try {
    localStorage.setItem(
      PENDING_SIGNUP_DRAFT_KEY,
      JSON.stringify({
        email: email.trim().toLowerCase(),
        displayName: data.displayName.trim(),
        username: data.username.trim().toLowerCase(),
        updatedAt: new Date().toISOString()
      })
    );
  } catch {}
}

export function loadPendingSignupDraft(
  email?: string
): { displayName?: string; username?: string } | null {
  try {
    const raw = localStorage.getItem(PENDING_SIGNUP_DRAFT_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (
      email &&
      parsed.email &&
      parsed.email.toLowerCase() !== email.trim().toLowerCase()
    ) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

// ============================================================================
// FETCH & HYDRATE AUTHENTICATED USER PROFILE FROM SUPABASE
// ============================================================================

export function mapEducationLevelToDegreeTier(level?: EducationLevel): DegreeTier | undefined {
  if (!level) return undefined;
  switch (level) {
    case 'undergraduate':
    case 'bachelors':
      return 'Undergraduate';
    case 'masters':
      return "Master's";
    case 'phd':
      return 'PhD';
    default:
      return undefined;
  }
}

export async function fetchAuthenticatedUserProfile(
  supabase: SupabaseClient,
  authUser: SupabaseAuthUser
): Promise<StudentUser> {
  const userId = authUser.id;
  const email = authUser.email || '';
  const emailConfirmedAt = authUser.email_confirmed_at || null;
  const emailConfirmed = Boolean(emailConfirmedAt);
  const meta = authUser.user_metadata || {};
  const pendingDraft = loadPendingSignupDraft(email);

  // Fallback values derived from signup metadata and pending signup draft
  let displayName = (
    meta.display_name ||
    meta.full_name ||
    meta.name ||
    pendingDraft?.displayName ||
    email.split('@')[0] ||
    ''
  ).trim();
  let username = (
    meta.username ||
    pendingDraft?.username ||
    email.split('@')[0] ||
    ''
  )
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_.-]/g, '');
  let avatarUrl: string | undefined = meta.avatar_url || undefined;
  let bio: string | undefined = meta.bio || undefined;
  let setupCompleted = Boolean(meta.setup_completed);

  let educationLevel: EducationLevel | undefined = meta.education_level || undefined;
  let undergraduateStage: UndergraduateStage | undefined = meta.academic_stage || undefined;
  let majorOrField: string | undefined = meta.major || undefined;
  let institution: string | undefined = meta.institution_name || undefined;
  let academicYear: string | undefined = meta.academic_year || undefined;
  let semester: AcademicSemester | undefined = meta.semester || undefined;

  let settings: UserSettingsData = { ...DEFAULT_USER_SETTINGS };
  let preferences: UserPreferencesData = { ...DEFAULT_USER_PREFERENCES };

  // Hydrate from auth.users user_metadata appearance_settings if stored
  if (meta.appearance_settings && typeof meta.appearance_settings === 'object') {
    const metaApp = meta.appearance_settings;
    settings = {
      ...settings,
      flareLocked:
        typeof metaApp.flare_locked === 'boolean' ? metaApp.flare_locked : settings.flareLocked,
      rayColor: typeof metaApp.ray_color === 'string' && metaApp.ray_color ? metaApp.ray_color : settings.rayColor,
      rayOrigin:
        typeof metaApp.ray_origin === 'string' && metaApp.ray_origin
          ? metaApp.ray_origin
          : settings.rayOrigin,
      rayBrightness:
        typeof metaApp.ray_brightness === 'number' && !Number.isNaN(metaApp.ray_brightness)
          ? Math.min(1.0, Math.max(0.05, metaApp.ray_brightness))
          : settings.rayBrightness
    };
  }

  // Hydrate from per-user localStorage cache if available
  const localAppearance = loadUserAppearanceFromLocal(userId);
  if (localAppearance) {
    settings = {
      ...settings,
      ...localAppearance
    };
  }

  const appMeta = authUser.app_metadata || {};
  let moderatorRole: 'moderator' | 'admin' | null =
    appMeta.role === 'admin' || appMeta.role === 'moderator' ? appMeta.role : null;

  try {
    // 1. Fetch from public.profiles
    const { data: profileRow, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .maybeSingle();

    if (!profileError && profileRow) {
      displayName =
        profileRow.display_name ||
        extractCleanDisplayName(profileRow.full_name) ||
        profileRow.name ||
        displayName;
      username = profileRow.username || username;
      avatarUrl = profileRow.avatar_url || avatarUrl;
      bio = profileRow.bio ?? bio;
      if (typeof profileRow.setup_completed === 'boolean') {
        setupCompleted = profileRow.setup_completed;
      }
    } else if (!profileError && !profileRow && displayName && username && emailConfirmed) {
      // Ensure initial profile row exists only after email verification is confirmed
      await supabase
        .from('profiles')
        .upsert(
          {
            id: userId,
            display_name: displayName,
            full_name: displayName,
            username,
            avatar_url: avatarUrl || null,
            bio: bio || null,
            setup_completed: setupCompleted
          },
          { onConflict: 'id' }
        )
        .then(() => {}, () => {});
    }

    // 2. Fetch from private owner-only public.academic_information
    const { data: academicRow, error: academicError } = await supabase
      .from('academic_information')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();

    if (!academicError && academicRow) {
      educationLevel = (academicRow.education_level as EducationLevel) || educationLevel;
      undergraduateStage =
        (academicRow.academic_stage as UndergraduateStage) || undergraduateStage;
      majorOrField = academicRow.major || majorOrField;
      institution = academicRow.institution_name || institution;
      academicYear = academicRow.academic_year || academicYear;
      semester = (academicRow.semester as AcademicSemester) || semester;
    }

    // 3. Fetch from private owner-only public.user_settings_preferences
    const { data: prefsRow, error: prefsError } = await supabase
      .from('user_settings_preferences')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();

    if (!prefsError && prefsRow) {
      const priv = prefsRow.privacy_settings || {};
      const app = prefsRow.appearance_settings || {};
      const study = prefsRow.study_preferences || {};
      const disc = prefsRow.content_discovery_preferences || {};

      settings = {
        publicBadgeEnabled:
          typeof priv.public_badge_enabled === 'boolean' ? priv.public_badge_enabled : true,
        showUniOnNotes:
          typeof priv.show_uni_on_notes === 'boolean' ? priv.show_uni_on_notes : true,
        flareLocked:
          typeof app.flare_locked === 'boolean'
            ? app.flare_locked
            : settings.flareLocked ?? true,
        rayColor: app.ray_color || settings.rayColor || '#9ca3af',
        rayOrigin: app.ray_origin || settings.rayOrigin || 'top-center',
        rayBrightness:
          typeof app.ray_brightness === 'number' && !Number.isNaN(app.ray_brightness)
            ? Math.min(1.0, Math.max(0.05, app.ray_brightness))
            : settings.rayBrightness ?? 0.5
      };

      preferences = {
        preferredSubjects: Array.isArray(prefsRow.preferred_subjects)
          ? prefsRow.preferred_subjects
          : [],
        studyStyle: study.study_style || '',
        sessionLength: study.session_length || '',
        collaborationMode: study.collaboration_mode || '',
        preferredLanguage: prefsRow.preferred_language || 'en',
        themePreference: prefsRow.theme_preference || 'dark',
        prioritizeVerifiedNotes:
          typeof disc.prioritize_verified_notes === 'boolean'
            ? disc.prioritize_verified_notes
            : true,
        prioritizeMyInstitution:
          typeof disc.prioritize_my_institution === 'boolean'
            ? disc.prioritize_my_institution
            : true,
        includePastExams:
          typeof disc.include_past_exams === 'boolean' ? disc.include_past_exams : true
      };
    }

    // 4. Check server-side moderator role via SECURITY DEFINER RPC (zero direct moderator_roles table access)
    if (!moderatorRole) {
      const { data: modRole, error: modErr } = await supabase.rpc('get_my_moderator_role');
      const resolvedModeratorRole = !modErr && typeof modRole === 'string' ? modRole : 'student';
      if (
        resolvedModeratorRole === 'admin' ||
        resolvedModeratorRole === 'super_admin' ||
        resolvedModeratorRole === 'moderator'
      ) {
        moderatorRole = resolvedModeratorRole === 'moderator' ? 'moderator' : 'admin';
      }
    }
  } catch {
    // Gracefully fall back to auth.users metadata if tables are not yet migrated
  }

  // Merge any unsaved partial setup draft if setup is not yet completed
  if (!setupCompleted) {
    const draft = loadSetupDraft(userId);
    if (draft) {
      if (draft.displayName && draft.displayName.trim()) {
        displayName = draft.displayName.trim();
      }
      if (draft.username && draft.username.trim()) {
        username = draft.username.trim().toLowerCase();
      }
      if (draft.bio !== undefined) bio = draft.bio;
      if (draft.avatarUrl !== undefined) avatarUrl = draft.avatarUrl;
      if (draft.educationLevel) educationLevel = draft.educationLevel as EducationLevel;
      if (draft.undergraduateStage) undergraduateStage = draft.undergraduateStage;
      if (draft.majorOrField !== undefined) majorOrField = draft.majorOrField;
      if (draft.institution !== undefined) institution = draft.institution;
      if (draft.academicYear !== undefined) academicYear = draft.academicYear;
      if (draft.semester) semester = draft.semester as AcademicSemester;
      if (draft.settings) settings = { ...settings, ...draft.settings };
      if (draft.preferences) preferences = { ...preferences, ...draft.preferences };
    }
  }

  // Keep per-user local appearance cache synchronized with hydrated settings
  saveUserAppearanceToLocal(userId, {
    flareLocked: settings.flareLocked ?? true,
    rayColor: settings.rayColor ?? '#9ca3af',
    rayOrigin: settings.rayOrigin ?? 'top-center',
    rayBrightness: settings.rayBrightness ?? 0.5
  });

  const matchedUni = institution ? findUniversityByNameOrFuzzy(institution) : undefined;
  if (matchedUni && emailConfirmed) {
    registerStudentToUniversity(matchedUni.id, userId);
  }
  const degreeTier = mapEducationLevelToDegreeTier(educationLevel);
  const systemProgram =
    majorOrField && emailConfirmed
      ? ensureSystemProgramForRegisteredStudent({
          studentId: userId,
          programName: majorOrField,
          degreeTier
        })
      : undefined;

  if (emailConfirmed && (matchedUni || systemProgram || institution || majorOrField)) {
    (async () => {
      try {
        if (matchedUni) {
          await ensureUniversityExistsInSupabase(supabase, matchedUni, userId);
          await supabase
            .from('university_follows')
            .upsert({ university_id: matchedUni.id, user_id: userId }, { onConflict: 'university_id,user_id' });
        }
        if (systemProgram) {
          await ensureProgramExistsInSupabase(supabase, systemProgram, userId);
          await supabase
            .from('program_enrollments')
            .upsert({ program_id: systemProgram.id, user_id: userId }, { onConflict: 'program_id,user_id' });
        }
        await supabase.from('academic_information').upsert(
          {
            user_id: userId,
            university_id: matchedUni?.id || null,
            program_id: systemProgram?.id || null,
            institution_name: institution || '',
            degree_program: systemProgram?.name || majorOrField || '',
            field_of_study: majorOrField || '',
            major: majorOrField || '',
            education_level: educationLevel || 'undergraduate',
            academic_stage: undergraduateStage || '',
            academic_year: academicYear || '',
            semester: semester || ''
          },
          { onConflict: 'user_id' }
        );
        await supabase.from('user_settings_preferences').upsert(
          {
            user_id: userId,
            public_profile: settings.publicBadgeEnabled !== false,
            show_academic_info: settings.showUniOnNotes !== false
          },
          { onConflict: 'user_id' }
        );
      } catch {
        // Ignore background cohort sync errors
      }
    })();
  }

  const studentUser: StudentUser = {
    id: userId,
    email,
    name: displayName || 'Student',
    username: username || undefined,
    emailConfirmed,
    emailConfirmedAt,
    avatarUrl: avatarUrl || undefined,
    bio: bio || undefined,
    setupCompleted,
    educationLevel,
    undergraduateStage: educationLevel === 'undergraduate' ? undergraduateStage : undefined,
    majorOrField: majorOrField || undefined,
    university: institution || undefined,
    universityId: matchedUni?.id,
    academicYear: academicYear || undefined,
    semester: semester || undefined,
    degreeTier: systemProgram?.degreeTier || degreeTier,
    program: systemProgram?.name || majorOrField || undefined,
    programId: systemProgram?.id,
    currentSemester: semester === 'semester_2' ? 2 : semester === 'semester_1' ? 1 : undefined,
    academicProfile: educationLevel
      ? {
          educationLevel,
          undergraduateStage: educationLevel === 'undergraduate' ? undergraduateStage : undefined,
          majorOrField: majorOrField || undefined,
          institution: institution || undefined,
          academicYear: academicYear || undefined,
          semester: semester || undefined
        }
      : undefined,
    settings,
    preferences,
    isModerator: Boolean(moderatorRole),
    moderatorRole,
    isGuest: false
  };

  return studentUser;
}

// ============================================================================
// PER-USER BACKGROUND APPEARANCE PERSISTENCE (REGISTERED USERS)
// ============================================================================

const USER_APPEARANCE_PREFIX = 'xeusar_user_appearance_v1_';

export interface UserAppearanceSettings {
  flareLocked: boolean;
  rayColor: string;
  rayOrigin: string;
  rayBrightness: number;
}

export function loadUserAppearanceFromLocal(userId?: string | null): UserAppearanceSettings | null {
  if (!userId) return null;
  try {
    const raw = localStorage.getItem(`${USER_APPEARANCE_PREFIX}${userId}`);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return null;
    return {
      flareLocked: typeof parsed.flareLocked === 'boolean' ? parsed.flareLocked : true,
      rayColor: typeof parsed.rayColor === 'string' && parsed.rayColor ? parsed.rayColor : '#9ca3af',
      rayOrigin:
        typeof parsed.rayOrigin === 'string' && parsed.rayOrigin ? parsed.rayOrigin : 'top-center',
      rayBrightness:
        typeof parsed.rayBrightness === 'number' && !Number.isNaN(parsed.rayBrightness)
          ? Math.min(1.0, Math.max(0.05, parsed.rayBrightness))
          : 0.5
    };
  } catch {
    return null;
  }
}

export function saveUserAppearanceToLocal(
  userId: string,
  appearance: UserAppearanceSettings
): void {
  if (!userId) return;
  try {
    localStorage.setItem(`${USER_APPEARANCE_PREFIX}${userId}`, JSON.stringify(appearance));
  } catch {}
}

export async function saveRegisteredUserAppearanceSettings(
  supabase: SupabaseClient | null,
  userId: string,
  appearance: UserAppearanceSettings
): Promise<void> {
  if (!userId) return;

  const cleanAppearance: UserAppearanceSettings = {
    flareLocked: Boolean(appearance.flareLocked),
    rayColor: appearance.rayColor || '#9ca3af',
    rayOrigin: appearance.rayOrigin || 'top-center',
    rayBrightness: Math.min(1.0, Math.max(0.05, Number((appearance.rayBrightness ?? 0.5).toFixed(2))))
  };

  // 1. Persist immediately in per-user localStorage
  saveUserAppearanceToLocal(userId, cleanAppearance);

  if (!supabase) return;

  // 2. Persist in public.user_settings_preferences
  try {
    await supabase.from('user_settings_preferences').upsert(
      {
        user_id: userId,
        appearance_settings: {
          flare_locked: cleanAppearance.flareLocked,
          ray_color: cleanAppearance.rayColor,
          ray_origin: cleanAppearance.rayOrigin,
          ray_brightness: cleanAppearance.rayBrightness
        }
      },
      { onConflict: 'user_id' }
    );
  } catch {
    // Ignore if table not yet migrated
  }

  // 3. Persist in Supabase Auth user_metadata so settings follow the registered user across browsers/devices
  try {
    await supabase.auth.updateUser({
      data: {
        appearance_settings: {
          flare_locked: cleanAppearance.flareLocked,
          ray_color: cleanAppearance.rayColor,
          ray_origin: cleanAppearance.rayOrigin,
          ray_brightness: cleanAppearance.rayBrightness
        }
      }
    });
  } catch {
    // Ignore transient network errors
  }
}

// ============================================================================
// SAVE / UPDATE USER PROFILE, ACADEMIC INFO & SETTINGS IN SUPABASE
// ============================================================================

export interface SaveProfilePayload {
  displayName: string;
  username: string;
  bio?: string;
  avatarUrl?: string;
  setupCompleted: boolean;
  educationLevel?: EducationLevel | '';
  undergraduateStage?: UndergraduateStage;
  majorOrField?: string;
  institution?: string;
  academicYear?: string;
  semester?: AcademicSemester | '';
  settings?: UserSettingsData;
  preferences?: UserPreferencesData;
}

export async function saveUserProfileToSupabase(
  supabase: SupabaseClient,
  authUser: SupabaseAuthUser,
  payload: SaveProfilePayload
): Promise<{ success: boolean; user?: StudentUser; error?: string }> {
  if (!authUser.email_confirmed_at) {
    return {
      success: false,
      error: 'Please verify your email address before saving your profile.'
    };
  }

  const userId = authUser.id;

  // 1. Validate required fields (Display Name and Username are the ONLY mandatory profile fields)
  const nameValidation = validateDisplayName(payload.displayName);
  if (!nameValidation.valid) {
    return { success: false, error: nameValidation.error };
  }

  const usernameValidation = validateUsernameFormat(payload.username);
  if (!usernameValidation.valid) {
    return { success: false, error: usernameValidation.error };
  }

  const cleanDisplayName = payload.displayName.trim();
  const cleanUsername = payload.username.trim().toLowerCase();
  const cleanBio = payload.bio?.trim() || null;
  const cleanAvatar = payload.avatarUrl?.trim() || null;

  // 2. Check case-insensitive username uniqueness
  const availability = await checkUsernameAvailability(supabase, cleanUsername, userId);
  if (!availability.available) {
    return {
      success: false,
      error: availability.error || `The username "@${cleanUsername}" is already taken.`
    };
  }

  const eduLevel = payload.educationLevel || null;
  const acadStage =
    eduLevel === 'undergraduate' ? payload.undergraduateStage || null : null;
  const cleanMajor = payload.majorOrField?.trim() || null;
  const cleanInstitution = payload.institution?.trim() || null;
  const cleanYear = payload.academicYear?.trim() || null;
  const cleanSemester = payload.semester || null;

  const matchedUniEarly = cleanInstitution ? findUniversityByNameOrFuzzy(cleanInstitution) : undefined;
  const degreeTierEarly = mapEducationLevelToDegreeTier((eduLevel as EducationLevel) || undefined);
  let earlyProgram: ReturnType<typeof ensureSystemProgramForRegisteredStudent> | undefined;
  if (cleanMajor) {
    earlyProgram = ensureSystemProgramForRegisteredStudent({
      studentId: userId,
      programName: cleanMajor,
      degreeTier: degreeTierEarly
    });
  } else {
    unenrollStudentFromProgram(userId);
  }
  if (matchedUniEarly) {
    registerStudentToUniversity(matchedUniEarly.id, userId);
  }

  // Ensure university and program catalog records exist in Supabase before FK references
  if (matchedUniEarly) {
    await ensureUniversityExistsInSupabase(supabase, matchedUniEarly, userId);
  }
  if (earlyProgram) {
    await ensureProgramExistsInSupabase(supabase, earlyProgram, userId);
  }

  // 3. Upsert public.profiles with clean display_name and full_name (no comment-tag payloads)
  const { error: profileError } = await supabase.from('profiles').upsert(
    {
      id: userId,
      username: cleanUsername,
      display_name: cleanDisplayName,
      full_name: cleanDisplayName,
      avatar_url: cleanAvatar,
      bio: cleanBio,
      setup_completed: payload.setupCompleted
    },
    { onConflict: 'id' }
  );

  if (profileError) {
    const lowerMsg = String(profileError.message || '').toLowerCase();
    if (
      profileError.code === '23505' ||
      lowerMsg.includes('unique') ||
      lowerMsg.includes('idx_profiles_username_lower')
    ) {
      return {
        success: false,
        error: `The username "@${cleanUsername}" is already taken by another account.`
      };
    }

    if (profileError.code === 'PGRST204' || profileError.code === '42703') {
      // Fallback if existing profiles table uses full_name instead of display_name
      await supabase
        .from('profiles')
        .upsert(
          {
            id: userId,
            username: cleanUsername,
            full_name: cleanDisplayName,
            avatar_url: cleanAvatar
          },
          { onConflict: 'id' }
        )
        .then(() => {}, () => {});
    } else if (!isIgnorableSchemaOrTableError(profileError)) {
      return { success: false, error: profileError.message };
    }
  }

  // 4. Upsert private owner-only public.academic_information (including university_id, program_id, degree_program)
  const { error: academicError } = await supabase.from('academic_information').upsert(
    {
      user_id: userId,
      university_id: matchedUniEarly?.id || null,
      program_id: earlyProgram?.id || null,
      degree_program: earlyProgram?.name || cleanMajor || '',
      field_of_study: cleanMajor || '',
      education_level: eduLevel || 'undergraduate',
      academic_stage: acadStage || '',
      major: cleanMajor || '',
      institution_name: cleanInstitution || '',
      academic_year: cleanYear || '',
      semester: cleanSemester || ''
    },
    { onConflict: 'user_id' }
  );

  if (academicError && !isIgnorableSchemaOrTableError(academicError)) {
    return { success: false, error: academicError.message };
  }

  // Sync program_enrollments and university_follows in Supabase
  try {
    if (earlyProgram) {
      await supabase
        .from('program_enrollments')
        .upsert({ program_id: earlyProgram.id, user_id: userId }, { onConflict: 'program_id,user_id' });
    }
    if (matchedUniEarly) {
      await supabase
        .from('university_follows')
        .upsert({ university_id: matchedUniEarly.id, user_id: userId }, { onConflict: 'university_id,user_id' });
    }
  } catch {
    // Ignore optional enrollment join table errors
  }

  // 5. Upsert private owner-only public.user_settings_preferences
  const finalSettings: UserSettingsData = {
    ...DEFAULT_USER_SETTINGS,
    ...(payload.settings || {})
  };
  const finalPreferences: UserPreferencesData = {
    ...DEFAULT_USER_PREFERENCES,
    ...(payload.preferences || {})
  };

  saveUserAppearanceToLocal(userId, {
    flareLocked: finalSettings.flareLocked ?? true,
    rayColor: finalSettings.rayColor ?? '#9ca3af',
    rayOrigin: finalSettings.rayOrigin ?? 'top-center',
    rayBrightness: finalSettings.rayBrightness ?? 0.5
  });

  const { error: prefsError } = await supabase.from('user_settings_preferences').upsert(
    {
      user_id: userId,
      public_profile: finalSettings.publicBadgeEnabled !== false,
      show_academic_info: finalSettings.showUniOnNotes !== false,
      privacy_settings: {
        public_badge_enabled: finalSettings.publicBadgeEnabled,
        show_uni_on_notes: finalSettings.showUniOnNotes
      },
      appearance_settings: {
        flare_locked: finalSettings.flareLocked ?? true,
        ray_color: finalSettings.rayColor ?? '#9ca3af',
        ray_origin: finalSettings.rayOrigin ?? 'top-center',
        ray_brightness: finalSettings.rayBrightness ?? 0.5
      },
      preferred_subjects: finalPreferences.preferredSubjects,
      study_preferences: {
        study_style: finalPreferences.studyStyle || '',
        session_length: finalPreferences.sessionLength || '',
        collaboration_mode: finalPreferences.collaborationMode || ''
      },
      preferred_language: finalPreferences.preferredLanguage,
      theme_preference: finalPreferences.themePreference,
      content_discovery_preferences: {
        prioritize_verified_notes: finalPreferences.prioritizeVerifiedNotes,
        prioritize_my_institution: finalPreferences.prioritizeMyInstitution,
        include_past_exams: finalPreferences.includePastExams
      }
    },
    { onConflict: 'user_id' }
  );

  if (prefsError && !isIgnorableSchemaOrTableError(prefsError)) {
    return { success: false, error: prefsError.message };
  }

  // 6. Sync core metadata and appearance settings to Supabase Auth user_metadata
  await supabase.auth
    .updateUser({
      data: {
        name: cleanDisplayName,
        display_name: cleanDisplayName,
        full_name: cleanDisplayName,
        username: cleanUsername,
        bio: cleanBio,
        avatar_url: cleanAvatar && !cleanAvatar.startsWith('data:') ? cleanAvatar : undefined,
        setup_completed: payload.setupCompleted,
        education_level: eduLevel,
        academic_stage: acadStage,
        major: cleanMajor,
        institution_name: cleanInstitution,
        academic_year: cleanYear,
        semester: cleanSemester,
        appearance_settings: {
          flare_locked: finalSettings.flareLocked ?? true,
          ray_color: finalSettings.rayColor ?? '#9ca3af',
          ray_origin: finalSettings.rayOrigin ?? 'top-center',
          ray_brightness: finalSettings.rayBrightness ?? 0.5
        }
      }
    })
    .catch(() => {});

  if (payload.setupCompleted) {
    clearSetupDraft(userId);
    try {
      localStorage.removeItem(PENDING_SIGNUP_DRAFT_KEY);
    } catch {}
  }

  // Preserve server-assigned moderator status (never client-editable)
  const appMeta = authUser.app_metadata || {};
  let moderatorRole: 'moderator' | 'admin' | null =
    appMeta.role === 'admin' || appMeta.role === 'moderator' ? appMeta.role : null;
  if (!moderatorRole) {
    try {
      const { data: modRole, error: modErr } = await supabase.rpc('get_my_moderator_role');
      const resolvedModeratorRole = !modErr && typeof modRole === 'string' ? modRole : 'student';
      if (
        resolvedModeratorRole === 'admin' ||
        resolvedModeratorRole === 'super_admin' ||
        resolvedModeratorRole === 'moderator'
      ) {
        moderatorRole = resolvedModeratorRole === 'moderator' ? 'moderator' : 'admin';
      }
    } catch {}
  }

  const matchedUni = matchedUniEarly;
  const degreeTier = degreeTierEarly;
  const systemProgram = earlyProgram;

  const updatedUser: StudentUser = {
    id: userId,
    email: authUser.email || '',
    name: cleanDisplayName,
    username: cleanUsername,
    emailConfirmed: Boolean(authUser.email_confirmed_at),
    emailConfirmedAt: authUser.email_confirmed_at || null,
    avatarUrl: cleanAvatar || undefined,
    bio: cleanBio || undefined,
    setupCompleted: payload.setupCompleted,
    educationLevel: (eduLevel as EducationLevel) || undefined,
    undergraduateStage: (acadStage as UndergraduateStage) || undefined,
    majorOrField: cleanMajor || undefined,
    university: cleanInstitution || undefined,
    universityId: matchedUni?.id,
    academicYear: cleanYear || undefined,
    semester: (cleanSemester as AcademicSemester) || undefined,
    degreeTier: systemProgram?.degreeTier || degreeTier,
    program: systemProgram?.name || cleanMajor || undefined,
    programId: systemProgram?.id,
    currentSemester:
      cleanSemester === 'semester_2' ? 2 : cleanSemester === 'semester_1' ? 1 : undefined,
    academicProfile: eduLevel
      ? {
          educationLevel: eduLevel as EducationLevel,
          undergraduateStage: (acadStage as UndergraduateStage) || undefined,
          majorOrField: cleanMajor || undefined,
          institution: cleanInstitution || undefined,
          academicYear: cleanYear || undefined,
          semester: (cleanSemester as AcademicSemester) || undefined
        }
      : undefined,
    settings: finalSettings,
    preferences: finalPreferences,
    isModerator: Boolean(moderatorRole),
    moderatorRole,
    isGuest: false
  };

  try {
    localStorage.setItem('studyvault_active_user', JSON.stringify(updatedUser));
  } catch {}

  return { success: true, user: updatedUser };
}

// ============================================================================
// SUPABASE STORAGE AVATAR UPLOAD (with safe client-side resize fallback)
// ============================================================================

export const MAX_AVATAR_SIZE_BYTES = 2 * 1024 * 1024; // 2 MB strict avatar limit

export async function uploadProfileAvatar(
  supabase: SupabaseClient,
  userId: string,
  file: File
): Promise<{ url?: string; error?: string }> {
  const lowerName = (file.name || '').toLowerCase();
  const allowedMimes = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif']);
  if (
    !allowedMimes.has(file.type) ||
    file.type === 'image/svg+xml' ||
    lowerName.endsWith('.svg')
  ) {
    return { error: 'Please select a valid raster image file (PNG, JPG, WEBP, or GIF). SVG files are not permitted.' };
  }
  if (file.size > MAX_AVATAR_SIZE_BYTES) {
    return { error: 'Avatar image size must be under 2 MB.' };
  }

  const rawExt = (file.name.split('.').pop() || 'png').toLowerCase().replace(/[^a-z0-9]/g, '');
  const safeExt = ['jpg', 'jpeg', 'png', 'webp', 'gif'].includes(rawExt) ? rawExt : 'png';
  const objectPath = `${userId}/avatar-${Date.now()}.${safeExt}`;

  try {
    const { error: uploadError } = await supabase.storage
      .from('avatars')
      .upload(objectPath, file, {
        cacheControl: '3600',
        upsert: true,
        contentType: file.type
      });

    if (!uploadError) {
      const { data } = supabase.storage.from('avatars').getPublicUrl(objectPath);
      if (data?.publicUrl) {
        return { url: data.publicUrl };
      }
    }
  } catch {
    // Fall back to compressed data URL if storage bucket hasn't been created yet
  }

  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (ev) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const maxDim = 256;
        let w = img.width;
        let h = img.height;
        if (w > h) {
          if (w > maxDim) {
            h = Math.round((h * maxDim) / w);
            w = maxDim;
          }
        } else {
          if (h > maxDim) {
            w = Math.round((w * maxDim) / h);
            h = maxDim;
          }
        }
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, w, h);
          resolve({ url: canvas.toDataURL('image/jpeg', 0.85) });
        } else {
          resolve({ url: String(ev.target?.result || '') });
        }
      };
      img.onerror = () => resolve({ error: 'Could not process the selected image.' });
      img.src = String(ev.target?.result || '');
    };
    reader.onerror = () => resolve({ error: 'Could not read image file.' });
    reader.readAsDataURL(file);
  });
}
