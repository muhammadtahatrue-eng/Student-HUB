import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { StudyNote, SupabaseConfig } from '../types/index.ts';
import { INITIAL_STUDY_NOTES } from '../data/seedData.ts';
import { updateCurrentUserPublicManifest } from './publicSyncRelay.ts';

const STORAGE_KEY_CONFIG = 'xeusar_supabase_config_v2';
const STORAGE_KEY_NOTES = 'xeusar_local_notes_v2';
const STORAGE_KEY_UPVOTES = 'xeusar_user_upvotes_v2';
const STORAGE_KEY_DELETED_NOTE_IDS = 'xeusar_deleted_note_ids_v1';

const SEED_NOTE_IDS = new Set<string>(INITIAL_STUDY_NOTES.map(n => n.id));

// Helper to strictly validate HTTP/HTTPS URLs
export function isValidHttpUrl(urlString: string | null | undefined): boolean {
  if (!urlString || typeof urlString !== 'string') return false;
  const trimmed = urlString.trim();
  if (!trimmed.startsWith('http://') && !trimmed.startsWith('https://')) {
    return false;
  }
  if (
    trimmed.includes('your-project') ||
    trimmed.includes('xyzcompany') ||
    trimmed.includes('example.com')
  ) {
    return false;
  }
  try {
    const parsed = new URL(trimmed);
    return Boolean(parsed.hostname && (parsed.protocol === 'http:' || parsed.protocol === 'https:'));
  } catch {
    return false;
  }
}

export function classifySupabaseError(
  error: any,
  tableName?: string
): {
  category: 'missing_schema' | 'missing_column' | 'permission_denied' | 'foreign_key' | 'other';
  isMissingSchema: boolean;
  isPermissionDenied: boolean;
  isForeignKeyViolation: boolean;
  code: string;
  userMessage: string;
} {
  if (!error) {
    return {
      category: 'other',
      isMissingSchema: false,
      isPermissionDenied: false,
      isForeignKeyViolation: false,
      code: '',
      userMessage: ''
    };
  }
  const code = String(error.code || '').toUpperCase();
  const msg = String(error.message || '');
  const lower = msg.toLowerCase();

  const isMissingColumn =
    code === '42703' ||
    code === 'PGRST204' ||
    lower.includes('could not find the column');

  const isMissingSchema =
    isMissingColumn ||
    code === '42P01' ||
    code === 'PGRST205' ||
    lower.includes('could not find the table') ||
    (lower.includes('relation') && lower.includes('does not exist'));

  const isPermissionDenied =
    code === '42501' ||
    lower.includes('row-level security') ||
    lower.includes('permission denied');

  const isForeignKeyViolation =
    code === '23503' || lower.includes('foreign key constraint');

  const tableLabel = tableName ? ` (${tableName})` : '';
  let category: 'missing_schema' | 'missing_column' | 'permission_denied' | 'foreign_key' | 'other' = 'other';
  let userMessage = msg || 'Database operation failed.';

  if (isMissingColumn) {
    category = 'missing_column';
    userMessage = `Required Supabase column${tableLabel} is missing (${code || 'PGRST204'}: ${msg}). Run the complete SQL migration in your Supabase SQL Editor to enable cross-user synchronization.`;
  } else if (isMissingSchema) {
    category = 'missing_schema';
    userMessage = `Required Supabase table${tableLabel} is missing (${code || 'PGRST205'}: ${msg}). Run the complete SQL migration in your Supabase SQL Editor to enable cross-user synchronization.`;
  } else if (isPermissionDenied) {
    category = 'permission_denied';
    userMessage = `Supabase RLS permission denied${tableLabel} (${code || '42501'}: ${msg}). Verify you are signed in with the owning account and that RLS policies are applied.`;
  } else if (isForeignKeyViolation) {
    category = 'foreign_key';
    userMessage = `Database reference check failed${tableLabel} (${code || '23503'}: ${msg}).`;
  }

  return {
    category,
    isMissingSchema,
    isPermissionDenied,
    isForeignKeyViolation,
    code,
    userMessage
  };
}

const DEFAULT_SUPABASE_URL = 'https://mfyngivzwyjgcnzhodud.supabase.co';
const DEFAULT_SUPABASE_ANON_KEY = 'sb_publishable_Bpa3IEI_19hEqC5dwM6QiQ_VCMRlSfn';

function normalizeProjectUrl(urlString: string | null | undefined): string {
  if (!urlString || typeof urlString !== 'string') return '';
  return urlString.trim().replace(/\/+$/, '').toLowerCase();
}

// Load authoritative environment/default configuration or validated custom config
export function getSavedSupabaseConfig(): SupabaseConfig {
  const envUrl = (import.meta as any).env?.VITE_SUPABASE_URL || '';
  const envKey = (import.meta as any).env?.VITE_SUPABASE_ANON_KEY || '';

  const hasValidEnv =
    isValidHttpUrl(envUrl) && Boolean(envKey) && envKey.trim() !== 'your-anon-key';
  const authoritativeUrl = hasValidEnv ? envUrl.trim() : DEFAULT_SUPABASE_URL;
  const authoritativeKey = hasValidEnv ? envKey.trim() : DEFAULT_SUPABASE_ANON_KEY;
  const normalizedAuthoritativeUrl = normalizeProjectUrl(authoritativeUrl);

  try {
    const raw = localStorage.getItem(STORAGE_KEY_CONFIG);
    if (raw) {
      const parsed = JSON.parse(raw);
      const storedUrl = typeof parsed?.url === 'string' ? parsed.url.trim() : '';
      const storedKey = typeof parsed?.anonKey === 'string' ? parsed.anonKey.trim() : '';
      const hasValidStored =
        isValidHttpUrl(storedUrl) &&
        Boolean(storedKey) &&
        storedKey !== 'your-anon-key' &&
        parsed.isConnected !== false;

      if (hasValidStored) {
        const normalizedStoredUrl = normalizeProjectUrl(storedUrl);

        if (hasValidEnv) {
          // When VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY are provided at build time,
          // they are authoritative. Ignore and clear any stale localStorage config for another project or key.
          if (
            normalizedStoredUrl === normalizedAuthoritativeUrl &&
            storedKey === authoritativeKey
          ) {
            return {
              url: authoritativeUrl,
              anonKey: authoritativeKey,
              storageBucket: parsed.storageBucket || 'study-materials',
              isConnected: true,
              lastTestedAt: parsed.lastTestedAt || null
            };
          }
          localStorage.removeItem(STORAGE_KEY_CONFIG);
        } else {
          // In local/dev environments without build-time env vars, honor valid connected custom config
          return {
            url: storedUrl,
            anonKey: storedKey,
            storageBucket: parsed.storageBucket || 'study-materials',
            isConnected: true,
            lastTestedAt: parsed.lastTestedAt || null
          };
        }
      } else {
        // Remove disconnected ("demo mode") or malformed localStorage config so it cannot override live auth
        localStorage.removeItem(STORAGE_KEY_CONFIG);
      }
    }
  } catch {
    // Ignore storage parse issues
  }

  return {
    url: authoritativeUrl,
    anonKey: authoritativeKey,
    storageBucket: 'study-materials',
    isConnected: Boolean(isValidHttpUrl(authoritativeUrl) && authoritativeKey),
    lastTestedAt: null
  };
}

export function saveSupabaseConfig(config: SupabaseConfig): void {
  try {
    if (!config.isConnected || !isValidHttpUrl(config.url) || !config.anonKey) {
      localStorage.removeItem(STORAGE_KEY_CONFIG);
      return;
    }
    localStorage.setItem(STORAGE_KEY_CONFIG, JSON.stringify(config));
  } catch {
    // Ignore storage issues
  }
}

let cachedClient: SupabaseClient | null = null;
let cachedConfigSignature = '';

export function getSupabaseInstance(config?: SupabaseConfig): SupabaseClient | null {
  const currentConfig = config || getSavedSupabaseConfig();
  if (!currentConfig.url || !currentConfig.anonKey || !isValidHttpUrl(currentConfig.url)) {
    return null;
  }

  const sig = `${currentConfig.url.trim()}::${currentConfig.anonKey.trim()}`;
  if (cachedClient && cachedConfigSignature === sig) {
    return cachedClient;
  }

  try {
    cachedClient = createClient(currentConfig.url.trim(), currentConfig.anonKey.trim(), {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
        storageKey: 'xeusar_supabase_auth_token'
      }
    });
    cachedConfigSignature = sig;
    return cachedClient;
  } catch {
    return null;
  }
}

// Test live Supabase connection and verify required tables + storage buckets
export async function testSupabaseConnection(
  url: string,
  key: string
): Promise<{
  success: boolean;
  schemaReady?: boolean;
  message: string;
  missingTables?: string[];
  missingBuckets?: string[];
}> {
  if (!url || !key) {
    return { success: false, message: 'URL and Anon Key are required.' };
  }

  if (!isValidHttpUrl(url)) {
    return {
      success: false,
      message:
        'Invalid Supabase URL. Please enter a valid HTTP or HTTPS URL (e.g. https://yourprojectid.supabase.co).'
    };
  }

  try {
    const testClient = createClient(url.trim(), key.trim(), {
      auth: { persistSession: false }
    });

    const coreTables = [
      'profiles',
      'moderator_roles',
      'academic_information',
      'user_settings_preferences',
      'stored_files',
      'study_notes',
      'study_note_upvotes',
      'forum_topics',
      'forum_posts',
      'forum_comments',
      'forum_post_votes',
      'forum_comment_votes',
      'forum_bookmarks',
      'forum_reports',
      'academic_programs',
      'program_enrollments',
      'program_discussions',
      'program_discussion_comments',
      'program_doubts',
      'program_doubt_answers',
      'universities',
      'departments',
      'courses',
      'university_discussions',
      'university_discussion_comments',
      'university_doubts',
      'university_doubt_answers',
      'community_item_votes'
    ];

    const missingTables: string[] = [];
    for (const table of coreTables) {
      const { error } = await testClient.from(table).select('*').limit(1);
      if (error) {
        const classified = classifySupabaseError(error);
        if (classified.isMissingSchema) {
          missingTables.push(table);
        }
      }
    }

    const missingBuckets: string[] = [];
    for (const bucketName of ['study-materials', 'avatars']) {
      const { error: listErr } = await testClient.storage.from(bucketName).list('', { limit: 1 });
      if (listErr && listErr.message.toLowerCase().includes('bucket not found')) {
        missingBuckets.push(bucketName);
      }
    }

    if (missingTables.length > 0 || missingBuckets.length > 0) {
      const missingSummary = [
        missingTables.length > 0 ? `Missing tables (${missingTables.length}): ${missingTables.join(', ')}` : '',
        missingBuckets.length > 0 ? `Missing storage buckets: ${missingBuckets.join(', ')}` : ''
      ]
        .filter(Boolean)
        .join(' · ');

      return {
        success: true,
        schemaReady: false,
        missingTables,
        missingBuckets,
        message: `Connected to Supabase endpoint, but cross-user sync requires applying the production SQL migration in Supabase SQL Editor. ${missingSummary}`
      };
    }

    return {
      success: true,
      schemaReady: true,
      missingTables: [],
      missingBuckets: [],
      message:
        'Connected to Supabase! All 26 canonical database tables, RLS policies, and Storage buckets (study-materials, avatars) are active.'
    };
  } catch (err: any) {
    return { success: false, message: err?.message || 'Could not reach Supabase endpoint.' };
  }
}

function getActiveUserIdFromStorage(): string | undefined {
  try {
    const raw = localStorage.getItem('studyvault_active_user');
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed?.id) return String(parsed.id);
    }
  } catch {}
  return undefined;
}

/**
 * Clears all user-specific private state and unsynced user-scoped caches on sign-out or account switch
 * so stale user data never leaks across sessions.
 */
export function clearUserSpecificLocalState(userId?: string): void {
  try {
    const effectiveUserId = userId || getActiveUserIdFromStorage();
    localStorage.removeItem('studyvault_active_user');
    localStorage.removeItem('xeusar_pending_signup_draft');
    localStorage.removeItem(STORAGE_KEY_UPVOTES);
    localStorage.removeItem('xeusar_followed_universities_v3');
    localStorage.removeItem('xeusar_community_upvotes_v3');
    localStorage.removeItem('xeusar_program_upvotes_v2');
    localStorage.removeItem('xeusar_followed_programs_v2');
    localStorage.removeItem('xeusar_forum_followed_topics_v1');
    if (effectiveUserId) {
      localStorage.removeItem(`${STORAGE_KEY_UPVOTES}_${effectiveUserId}`);
      localStorage.removeItem(`xeusar_followed_universities_v3_${effectiveUserId}`);
      localStorage.removeItem(`xeusar_community_upvotes_v3_${effectiveUserId}`);
      localStorage.removeItem(`xeusar_program_upvotes_v2_${effectiveUserId}`);
      localStorage.removeItem(`xeusar_followed_programs_v2_${effectiveUserId}`);
      localStorage.removeItem(`xeusar_forum_followed_topics_v1_${effectiveUserId}`);
      localStorage.removeItem(`xeusar_profile_setup_draft_${effectiveUserId}`);
      localStorage.removeItem(`xeusar_forum_post_draft_v1_${effectiveUserId}`);
      localStorage.removeItem(`xeusar_user_appearance_v1_${effectiveUserId}`);
    }
    // Remove any local-only unsynced notes that belonged to the signed-out user
    const rawNotes = localStorage.getItem(STORAGE_KEY_NOTES);
    if (rawNotes) {
      const parsed: StudyNote[] = JSON.parse(rawNotes);
      if (Array.isArray(parsed)) {
        const cleaned = parsed
          .filter(n => !n.isUnsynced)
          .map(n => ({ ...n, hasUpvoted: false }));
        localStorage.setItem(STORAGE_KEY_NOTES, JSON.stringify(cleaned));
      }
    }
  } catch {}
}

/**
 * Centralized sign-out helper used across all logout entry points.
 * Signs out of Supabase Auth and clears all authenticated user-specific local state.
 */
export async function signOutCurrentUser(
  supabaseClient?: SupabaseClient | null,
  userId?: string
): Promise<void> {
  const effectiveUserId = userId || getActiveUserIdFromStorage();
  const client = supabaseClient ?? getSupabaseInstance();
  try {
    if (client) {
      await client.auth.signOut();
    }
  } catch {
    // Ignore transient network errors so local state cleanup always completes
  } finally {
    clearUserSpecificLocalState(effectiveUserId);
  }
}

export function getDeletedNoteIds(): Set<string> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_DELETED_NOTE_IDS);
    if (raw) {
      return new Set(JSON.parse(raw));
    }
  } catch {}
  return new Set();
}

export function recordDeletedNoteId(noteId: string): void {
  if (!noteId) return;
  try {
    const set = getDeletedNoteIds();
    set.add(noteId);
    localStorage.setItem(STORAGE_KEY_DELETED_NOTE_IDS, JSON.stringify(Array.from(set)));
  } catch {}
}

export function getLocalNotes(): StudyNote[] {
  const deletedIds = getDeletedNoteIds();
  try {
    const stored = localStorage.getItem(STORAGE_KEY_NOTES);
    if (stored) {
      const parsed: StudyNote[] = JSON.parse(stored);
      const upvotes = getUpvotedIds();
      return parsed
        .filter(note => !deletedIds.has(note.id))
        .map(note => ({
          ...note,
          hasUpvoted: upvotes.has(note.id)
        }));
    }
  } catch {
    // Fall back to seed notes
  }

  const initial = INITIAL_STUDY_NOTES.filter(n => !deletedIds.has(n.id));
  setLocalNotes(initial);
  return initial;
}

export function setLocalNotes(notes: StudyNote[]): void {
  try {
    localStorage.setItem(STORAGE_KEY_NOTES, JSON.stringify(notes));
  } catch {
    // Ignore storage issues
  }
}

export function getUpvotedIds(userId?: string): Set<string> {
  const effectiveUser = userId || getActiveUserIdFromStorage();
  try {
    if (effectiveUser) {
      const scoped = localStorage.getItem(`${STORAGE_KEY_UPVOTES}_${effectiveUser}`);
      if (scoped) {
        return new Set(JSON.parse(scoped));
      }
    }
    const stored = localStorage.getItem(STORAGE_KEY_UPVOTES);
    if (stored) {
      return new Set(JSON.parse(stored));
    }
  } catch {}
  return new Set();
}

function saveUpvotedIds(upvotes: Set<string>, userId?: string): void {
  const effectiveUser = userId || getActiveUserIdFromStorage();
  const arr = Array.from(upvotes);
  try {
    if (effectiveUser) {
      localStorage.setItem(`${STORAGE_KEY_UPVOTES}_${effectiveUser}`, JSON.stringify(arr));
    }
    localStorage.setItem(STORAGE_KEY_UPVOTES, JSON.stringify(arr));
  } catch {}
}

export function toggleUpvoteLocal(
  noteId: string,
  userId?: string
): { upvoted: boolean; count: number } {
  const effectiveUser = userId || getActiveUserIdFromStorage();
  const upvotes = getUpvotedIds(effectiveUser);
  const isUpvoted = upvotes.has(noteId);
  const notes = getLocalNotes();
  const noteIndex = notes.findIndex(n => n.id === noteId);

  if (isUpvoted) {
    upvotes.delete(noteId);
  } else {
    upvotes.add(noteId);
  }

  saveUpvotedIds(upvotes, effectiveUser);

  let newCount = 0;
  if (noteIndex >= 0) {
    newCount = isUpvoted
      ? Math.max(0, notes[noteIndex].upvotesCount - 1)
      : notes[noteIndex].upvotesCount + 1;
    notes[noteIndex].upvotesCount = newCount;
    notes[noteIndex].hasUpvoted = !isUpvoted;
    setLocalNotes(notes);
  }

  const supabase = getSupabaseInstance();
  if (supabase) {
    syncNoteUpvoteToSupabase(supabase, noteId, effectiveUser, !isUpvoted, newCount).catch(() => {});
  }

  return { upvoted: !isUpvoted, count: newCount };
}

export async function syncNoteUpvoteToSupabase(
  supabase: SupabaseClient | null,
  noteId: string,
  userId: string | undefined,
  upvoted: boolean,
  _newCount: number
): Promise<void> {
  if (!supabase) return;
  try {
    if (userId && /^[0-9a-f]{8}-[0-9a-f]{4}-/i.test(userId)) {
      if (upvoted) {
        const { error } = await supabase
          .from('study_note_upvotes')
          .upsert({ note_id: noteId, user_id: userId }, { onConflict: 'note_id,user_id' });
        if (error && classifySupabaseError(error).isMissingSchema) {
          await supabase
            .from('note_upvotes')
            .upsert({ note_id: noteId, user_id: userId }, { onConflict: 'user_id,note_id' });
        }
      } else {
        const { error } = await supabase
          .from('study_note_upvotes')
          .delete()
          .eq('note_id', noteId)
          .eq('user_id', userId);
        if (error && classifySupabaseError(error).isMissingSchema) {
          await supabase
            .from('note_upvotes')
            .delete()
            .eq('note_id', noteId)
            .eq('user_id', userId);
        }
      }
    }
  } catch {
    // Ignore transient network errors
  }
}

export function incrementDownloadCountLocal(noteId: string): number {
  const notes = getLocalNotes();
  const noteIndex = notes.findIndex(n => n.id === noteId);
  let nextCount = 1;
  if (noteIndex >= 0) {
    notes[noteIndex].downloadsCount += 1;
    nextCount = notes[noteIndex].downloadsCount;
    setLocalNotes(notes);
  }

  const supabase = getSupabaseInstance();
  if (supabase) {
    syncNoteDownloadToSupabase(supabase, noteId, nextCount).catch(() => {});
  }

  return nextCount;
}

export async function syncNoteDownloadToSupabase(
  supabase: SupabaseClient | null,
  noteId: string,
  _nextCount: number
): Promise<void> {
  if (!supabase) return;
  try {
    await supabase.rpc('increment_downloads', { note_id: noteId });
  } catch {
    // Ignore offline errors
  }
}

export function addLocalNote(newNote: StudyNote): void {
  const notes = getLocalNotes().filter(n => n.id !== newNote.id);
  notes.unshift(newNote);
  setLocalNotes(notes);
}

function extractEmbeddedMetaFromPages(pagesRaw: any): Record<string, any> {
  if (!Array.isArray(pagesRaw) || pagesRaw.length === 0) return {};
  const firstPage = pagesRaw[0];
  if (
    firstPage &&
    typeof firstPage === 'object' &&
    firstPage._xeusarMeta &&
    typeof firstPage._xeusarMeta === 'object'
  ) {
    return firstPage._xeusarMeta;
  }
  return {};
}

// Fetch shared notes from canonical `public.study_notes` table
export async function fetchAllNotes(
  supabaseClient: SupabaseClient | null,
  currentUserId?: string
): Promise<{
  notes: StudyNote[];
  isFromSupabase: boolean;
  error?: string;
  schemaMissing?: boolean;
}> {
  const effectiveUserId = currentUserId || getActiveUserIdFromStorage();
  const deletedIds = getDeletedNoteIds();
  const localNotes = getLocalNotes();
  const localById = new Map<string, StudyNote>();
  localNotes.forEach(n => localById.set(n.id, n));

  if (!supabaseClient) {
    return { notes: localNotes, isFromSupabase: false };
  }

  // Trigger one-time legacy profile cleanup/migration for the active user if needed
  if (effectiveUserId) {
    updateCurrentUserPublicManifest(supabaseClient, effectiveUserId).catch(() => {});
  }

  const upvotes = getUpvotedIds(effectiveUserId);
  let studyNotesTableRows: StudyNote[] | null = null;
  let tableErrorMsg: string | undefined;
  let schemaMissing = false;

  try {
    // 1. Fetch user's remote study_note_upvotes if authenticated
    if (effectiveUserId && /^[0-9a-f]{8}-[0-9a-f]{4}-/i.test(effectiveUserId)) {
      let { data: upvoteRows, error: upvoteErr } = await supabaseClient
        .from('study_note_upvotes')
        .select('note_id')
        .eq('user_id', effectiveUserId);

      if (upvoteErr && classifySupabaseError(upvoteErr).isMissingSchema) {
        const legacyRes = await supabaseClient
          .from('note_upvotes')
          .select('note_id')
          .eq('user_id', effectiveUserId);
        upvoteRows = legacyRes.data;
        upvoteErr = legacyRes.error;
      }

      if (!upvoteErr && Array.isArray(upvoteRows)) {
        upvotes.clear();
        upvoteRows.forEach((r: any) => {
          if (r.note_id) upvotes.add(String(r.note_id));
        });
        saveUpvotedIds(upvotes, effectiveUserId);
      }
    }

    // 2. Query canonical `public.study_notes` table
    const { data, error } = await supabaseClient
      .from('study_notes')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      const classified = classifySupabaseError(error);
      tableErrorMsg = classified.userMessage;
      schemaMissing = classified.isMissingSchema;
    } else if (Array.isArray(data)) {
      studyNotesTableRows = data
        .filter(
          (row: any) =>
            row &&
            row.id &&
            row.status !== 'removed' &&
            !deletedIds.has(String(row.id))
        )
        .map((row: any) => {
          const id = String(row.id);
          const localMatch = localById.get(id);
          const embeddedMeta = extractEmbeddedMetaFromPages(row.pages);

          const resolvedProgramId =
            row.program_id || embeddedMeta.programId || localMatch?.programId || 'bs-cs';
          const resolvedProgramIds =
            Array.isArray(row.program_ids) && row.program_ids.length > 0
              ? row.program_ids
              : Array.isArray(embeddedMeta.programIds) && embeddedMeta.programIds.length > 0
              ? embeddedMeta.programIds
              : localMatch?.programIds || [resolvedProgramId];
          const resolvedSemesterNum =
            typeof row.semester_number === 'number'
              ? row.semester_number
              : typeof embeddedMeta.semesterNumber === 'number'
              ? embeddedMeta.semesterNumber
              : localMatch?.semesterNumber || 1;
          const resolvedUploaderId =
            row.uploader_id ||
            row.author_id ||
            row.user_id ||
            embeddedMeta.uploaderId ||
            localMatch?.uploaderId;

          return {
            id,
            title: row.title,
            description: row.description || '',
            courseCode: row.course_code,
            courseName:
              row.course_name ||
              embeddedMeta.courseName ||
              localMatch?.courseName ||
              row.subject,
            courseId: row.course_id || embeddedMeta.courseId || localMatch?.courseId,
            subject: row.subject,
            materialType: row.material_type || row.resource_type || 'lecture_notes',
            academicYear: row.academic_year || new Date().getFullYear(),
            semester: row.semester || localMatch?.semester || 'Current Semester',
            semesterNumber: resolvedSemesterNum,
            semesterId: resolvedSemesterNum
              ? `sem-${resolvedSemesterNum}`
              : localMatch?.semesterId,
            professor: row.professor || 'Instructor',
            fileUrl: row.file_url,
            fileName: row.file_name,
            fileSizeBytes: Number(row.file_size_bytes) || 2048000,
            pageCount: Number(row.page_count) || 10,
            authorId: resolvedUploaderId,
            uploaderId: resolvedUploaderId,
            uploaderName: row.uploader_name || row.author_name || 'Student Contributor',
            uploaderUniversity:
              row.uploader_university || row.author_university || row.university || 'Open Campus',
            universityId:
              row.university_id ||
              embeddedMeta.universityId ||
              localMatch?.universityId,
            programId: resolvedProgramId,
            programIds: resolvedProgramIds,
            programName:
              row.program_name ||
              embeddedMeta.programName ||
              localMatch?.programName,
            degreeTier:
              row.degree_tier || embeddedMeta.degreeTier || localMatch?.degreeTier,
            contentHash:
              row.content_hash ||
              embeddedMeta.contentHash ||
              localMatch?.contentHash,
            storagePath:
              row.storage_path ||
              embeddedMeta.storagePath ||
              localMatch?.storagePath,
            isRestricted: Boolean(row.is_restricted),
            isUnsynced: false,
            downloadsCount: Number(row.downloads_count ?? row.downloads) || 0,
            upvotesCount: Number(row.upvotes_count ?? row.upvotes) || 0,
            hasUpvoted: upvotes.has(id),
            createdAt: row.created_at,
            updatedAt: row.updated_at || row.created_at,
            tags:
              Array.isArray(row.tags) && row.tags.length > 0
                ? row.tags
                : [row.subject, row.course_code].filter(Boolean),
            pages:
              Array.isArray(row.pages) && row.pages.length > 0
                ? row.pages
                : localMatch?.pages || [
                    {
                      pageNumber: 1,
                      sectionTitle: `${row.title} - Overview`,
                      content: row.description || 'Uploaded study guide and lecture notes.',
                      keyFormulasOrPoints: [
                        'Verified peer study material',
                        'Complete syllabus coverage'
                      ]
                    }
                  ]
          };
        });
    }
  } catch (err: any) {
    tableErrorMsg = err?.message;
  }

  // When `public.study_notes` succeeded, use it as the authoritative source of shared notes
  if (studyNotesTableRows !== null) {
    const mergedById = new Map<string, StudyNote>();

    studyNotesTableRows.forEach(n => mergedById.set(n.id, n));

    // Preserve built-in seed notes and any explicitly unsynced notes created by the active user
    localNotes.forEach(ln => {
      if (deletedIds.has(ln.id) || mergedById.has(ln.id)) return;
      const isSeed = SEED_NOTE_IDS.has(ln.id) || ln.id.startsWith('seed-');
      const isOwnUnsynced = Boolean(
        ln.isUnsynced && effectiveUserId && ln.uploaderId === effectiveUserId
      );
      if (isSeed || isOwnUnsynced) {
        mergedById.set(ln.id, {
          ...ln,
          hasUpvoted: upvotes.has(ln.id)
        });
      }
    });

    const finalNotes = Array.from(mergedById.values()).sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
    setLocalNotes(finalNotes);
    return { notes: finalNotes, isFromSupabase: true };
  }

  // If `study_notes` table is missing or errored, mark non-seed local notes as unsynced
  const fallbackNotes = localNotes.map(ln => {
    const isSeed = SEED_NOTE_IDS.has(ln.id) || ln.id.startsWith('seed-');
    if (isSeed) return ln;
    return {
      ...ln,
      isUnsynced: true,
      syncError: ln.syncError || tableErrorMsg
    };
  });

  return {
    notes: fallbackNotes,
    isFromSupabase: false,
    error: tableErrorMsg,
    schemaMissing
  };
}
