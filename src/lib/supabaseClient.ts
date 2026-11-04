import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { StudyNote, SupabaseConfig } from '../types/index.ts';
import { INITIAL_STUDY_NOTES } from '../data/seedData.ts';
import {
  fetchAggregatedPublicPlatformData,
  updateCurrentUserPublicManifest
} from './publicSyncRelay.ts';

const STORAGE_KEY_CONFIG = 'xeusar_supabase_config_v2';
const STORAGE_KEY_NOTES = 'xeusar_local_notes_v2';
const STORAGE_KEY_UPVOTES = 'xeusar_user_upvotes_v2';
const STORAGE_KEY_DELETED_NOTE_IDS = 'xeusar_deleted_note_ids_v1';

// Helper to strictly validate HTTP/HTTPS URLs
export function isValidHttpUrl(urlString: string | null | undefined): boolean {
  if (!urlString || typeof urlString !== 'string') return false;
  const trimmed = urlString.trim();
  if (!trimmed.startsWith('http://') && !trimmed.startsWith('https://')) {
    return false;
  }
  // Reject placeholder domains that aren't real Supabase projects
  if (trimmed.includes('your-project') || trimmed.includes('xyzcompany') || trimmed.includes('example.com')) {
    return false;
  }
  try {
    const parsed = new URL(trimmed);
    return Boolean(parsed.hostname && (parsed.protocol === 'http:' || parsed.protocol === 'https:'));
  } catch {
    return false;
  }
}

const DEFAULT_SUPABASE_URL = 'https://mfyngivzwyjgcnzhodud.supabase.co';
const DEFAULT_SUPABASE_ANON_KEY = 'sb_publishable_Bpa3IEI_19hEqC5dwM6QiQ_VCMRlSfn';

// Load stored config or default
export function getSavedSupabaseConfig(): SupabaseConfig {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_CONFIG);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (isValidHttpUrl(parsed.url) && parsed.anonKey && parsed.anonKey.trim() !== 'your-anon-key') {
        return {
          url: parsed.url.trim(),
          anonKey: parsed.anonKey.trim(),
          storageBucket: parsed.storageBucket || 'study-materials',
          isConnected: Boolean(parsed.isConnected),
          lastTestedAt: parsed.lastTestedAt || null
        };
      }
    }
  } catch {
    // Ignore storage parse issues
  }

  // Check if environment variables are provided, otherwise use the configured Xeusar Supabase project
  const envUrl = (import.meta as any).env?.VITE_SUPABASE_URL || '';
  const envKey = (import.meta as any).env?.VITE_SUPABASE_ANON_KEY || '';

  const hasValidEnv = isValidHttpUrl(envUrl) && Boolean(envKey) && envKey !== 'your-anon-key';
  const finalUrl = hasValidEnv ? envUrl.trim() : DEFAULT_SUPABASE_URL;
  const finalKey = hasValidEnv ? envKey.trim() : DEFAULT_SUPABASE_ANON_KEY;

  return {
    url: finalUrl,
    anonKey: finalKey,
    storageBucket: 'study-materials',
    isConnected: Boolean(isValidHttpUrl(finalUrl) && finalKey),
    lastTestedAt: null
  };
}

export function saveSupabaseConfig(config: SupabaseConfig): void {
  try {
    localStorage.setItem(STORAGE_KEY_CONFIG, JSON.stringify(config));
  } catch {
    // Ignore storage issues
  }
}

// Create client instance if configured with valid HTTP/HTTPS url
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

// Test live Supabase connection
export async function testSupabaseConnection(
  url: string,
  key: string
): Promise<{ success: boolean; message: string; missingTables?: string[] }> {
  if (!url || !key) {
    return { success: false, message: 'URL and Anon Key are required.' };
  }

  if (!isValidHttpUrl(url)) {
    return {
      success: false,
      message: 'Invalid Supabase URL. Please enter a valid HTTP or HTTPS URL (e.g. https://yourprojectid.supabase.co).'
    };
  }

  try {
    const testClient = createClient(url.trim(), key.trim(), {
      auth: { persistSession: false }
    });

    const coreTables = [
      'profiles',
      'academic_information',
      'user_settings_preferences',
      'study_notes',
      'forum_posts',
      'forum_comments',
      'program_discussions',
      'program_doubts',
      'universities'
    ];

    const missingTables: string[] = [];
    for (const table of coreTables) {
      const { error } = await testClient.from(table).select('*').limit(1);
      if (
        error &&
        (error.code === '42P01' ||
          error.code === 'PGRST205' ||
          error.message.includes('does not exist') ||
          error.message.includes('schema cache'))
      ) {
        missingTables.push(table);
      }
    }

    if (missingTables.length > 0) {
      return {
        success: true,
        missingTables,
        message: `Connected to Supabase! (${coreTables.length - missingTables.length}/${coreTables.length} core tables active. Run the updated SQL Migration Script in your Supabase SQL Editor to create: ${missingTables.join(', ')}).`
      };
    }

    return {
      success: true,
      missingTables: [],
      message: 'Connected to Supabase! All core database tables and policies are active.'
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

// Local Storage Fallback Data Manager
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

export function toggleUpvoteLocal(noteId: string, userId?: string): { upvoted: boolean; count: number } {
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

  // Sync upvote with Supabase in the background
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
  newCount: number
): Promise<void> {
  if (!supabase) return;
  try {
    if (userId && /^[0-9a-f]{8}-[0-9a-f]{4}-/i.test(userId)) {
      // Update public sync manifest for cross-user upvote tally
      await updateCurrentUserPublicManifest(supabase, userId, current => {
        const set = new Set<string>(current.noteUpvotes || []);
        if (upvoted) {
          set.add(noteId);
        } else {
          set.delete(noteId);
        }
        return {
          ...current,
          noteUpvotes: Array.from(set)
        };
      });

      // Sync to note_upvotes table if present
      if (upvoted) {
        await supabase
          .from('note_upvotes')
          .upsert({ note_id: noteId, user_id: userId }, { onConflict: 'note_id,user_id' })
          .then(() => {}, () => {});
      } else {
        await supabase
          .from('note_upvotes')
          .delete()
          .eq('note_id', noteId)
          .eq('user_id', userId)
          .then(() => {}, () => {});
      }
    }

    // Update study_notes counter if table is present
    await supabase
      .from('study_notes')
      .update({ upvotes_count: newCount })
      .eq('id', noteId)
      .then(() => {}, () => {});
  } catch {
    // Ignore network or unmigrated table errors
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
  nextCount: number
): Promise<void> {
  if (!supabase) return;
  try {
    const { error: rpcErr } = await supabase.rpc('increment_downloads', { note_id: noteId });
    if (rpcErr) {
      await supabase
        .from('study_notes')
        .update({ downloads_count: nextCount })
        .eq('id', noteId)
        .then(() => {}, () => {});
    }
  } catch {
    // Ignore offline errors
  }
}

export function addLocalNote(newNote: StudyNote): void {
  const notes = getLocalNotes().filter(n => n.id !== newNote.id);
  notes.unshift(newNote);
  setLocalNotes(notes);
}

/**
 * Extracts lossless extended metadata embedded in `row.pages[0]._xeusarMeta` when
 * `study_notes` in Supabase only has the base columns.
 */
function extractEmbeddedMetaFromPages(pagesRaw: any): Record<string, any> {
  if (!Array.isArray(pagesRaw) || pagesRaw.length === 0) return {};
  const firstPage = pagesRaw[0];
  if (firstPage && typeof firstPage === 'object' && firstPage._xeusarMeta && typeof firstPage._xeusarMeta === 'object') {
    return firstPage._xeusarMeta;
  }
  return {};
}

// Unified Service to fetch notes (Supabase study_notes + Public Sync Relay + Local)
export async function fetchAllNotes(
  supabaseClient: SupabaseClient | null,
  currentUserId?: string
): Promise<{
  notes: StudyNote[];
  isFromSupabase: boolean;
  error?: string;
}> {
  const effectiveUserId = currentUserId || getActiveUserIdFromStorage();
  const deletedIds = getDeletedNoteIds();
  const localNotes = getLocalNotes();
  const localById = new Map<string, StudyNote>();
  localNotes.forEach(n => localById.set(n.id, n));

  if (!supabaseClient) {
    return { notes: localNotes, isFromSupabase: false };
  }

  const upvotes = getUpvotedIds(effectiveUserId);
  let studyNotesTableRows: StudyNote[] | null = null;
  let tableErrorMsg: string | undefined;

  try {
    // 1. Fetch user's remote note_upvotes if authenticated
    if (effectiveUserId && /^[0-9a-f]{8}-[0-9a-f]{4}-/i.test(effectiveUserId)) {
      const { data: upvoteRows, error: upvoteErr } = await supabaseClient
        .from('note_upvotes')
        .select('note_id')
        .eq('user_id', effectiveUserId);

      if (!upvoteErr && Array.isArray(upvoteRows)) {
        upvoteRows.forEach((r: any) => {
          if (r.note_id) upvotes.add(String(r.note_id));
        });
        saveUpvotedIds(upvotes, effectiveUserId);
      }
    }

    // 2. Query dedicated `study_notes` table
    const { data, error } = await supabaseClient
      .from('study_notes')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      tableErrorMsg = error.message;
    } else if (Array.isArray(data)) {
      studyNotesTableRows = data
        .filter((row: any) => row && row.id && !deletedIds.has(String(row.id)))
        .map((row: any) => {
          const id = String(row.id);
          const localMatch = localById.get(id);
          const embeddedMeta = extractEmbeddedMetaFromPages(row.pages);

          const resolvedProgramId =
            row.program_id || embeddedMeta.programId || localMatch?.programId;
          const resolvedProgramIds =
            Array.isArray(row.program_ids) && row.program_ids.length > 0
              ? row.program_ids
              : Array.isArray(embeddedMeta.programIds) && embeddedMeta.programIds.length > 0
              ? embeddedMeta.programIds
              : localMatch?.programIds || (resolvedProgramId ? [resolvedProgramId] : undefined);
          const resolvedSemesterNum =
            typeof row.semester_number === 'number'
              ? row.semester_number
              : typeof embeddedMeta.semesterNumber === 'number'
              ? embeddedMeta.semesterNumber
              : localMatch?.semesterNumber;

          return {
            id,
            title: row.title,
            description: row.description || '',
            courseCode: row.course_code,
            courseName: row.course_name || embeddedMeta.courseName || localMatch?.courseName || row.subject,
            courseId: row.course_id || embeddedMeta.courseId || localMatch?.courseId,
            subject: row.subject,
            materialType: row.material_type,
            academicYear: row.academic_year || new Date().getFullYear(),
            semester: row.semester || localMatch?.semester || 'Current Semester',
            semesterNumber: resolvedSemesterNum,
            semesterId: resolvedSemesterNum ? `sem-${resolvedSemesterNum}` : localMatch?.semesterId,
            professor: row.professor || 'Instructor',
            fileUrl: row.file_url,
            fileName: row.file_name,
            fileSizeBytes: Number(row.file_size_bytes) || 2048000,
            pageCount: Number(row.page_count) || 10,
            uploaderId: row.uploader_id || embeddedMeta.uploaderId || localMatch?.uploaderId,
            uploaderName: row.uploader_name || 'Student Contributor',
            uploaderUniversity: row.uploader_university || 'Open Campus',
            universityId: row.university_id || embeddedMeta.universityId || localMatch?.universityId,
            programId: resolvedProgramId,
            programIds: resolvedProgramIds,
            programName: row.program_name || embeddedMeta.programName || localMatch?.programName,
            degreeTier: row.degree_tier || embeddedMeta.degreeTier || localMatch?.degreeTier,
            contentHash: row.content_hash || embeddedMeta.contentHash || localMatch?.contentHash,
            storagePath: row.storage_path || embeddedMeta.storagePath || localMatch?.storagePath,
            downloadsCount: Number(row.downloads_count) || 0,
            upvotesCount: Number(row.upvotes_count) || 0,
            hasUpvoted: upvotes.has(id),
            createdAt: row.created_at,
            tags: Array.isArray(row.tags) && row.tags.length > 0 ? row.tags : [row.subject, row.course_code],
            pages: Array.isArray(row.pages) && row.pages.length > 0
              ? row.pages
              : localMatch?.pages || [
                  {
                    pageNumber: 1,
                    sectionTitle: `${row.title} - Overview`,
                    content: row.description || 'Uploaded study guide and lecture notes.',
                    keyFormulasOrPoints: ['Verified peer study material', 'Complete syllabus coverage']
                  }
                ]
          };
        });
    }
  } catch (err: any) {
    tableErrorMsg = err?.message;
  }

  // 3. Also fetch cross-user public sync relay data (covers unmigrated study_notes table or cross-user metadata)
  const aggregatedRelay = await fetchAggregatedPublicPlatformData(supabaseClient, effectiveUserId);
  const relayNotes = (aggregatedRelay?.notes || []).filter(n => !deletedIds.has(n.id));

  if (studyNotesTableRows !== null || relayNotes.length > 0) {
    const mergedById = new Map<string, StudyNote>();

    // First add remote study_notes rows (highest authority)
    if (studyNotesTableRows) {
      studyNotesTableRows.forEach(n => mergedById.set(n.id, n));
    }

    // Next add verified cross-user notes from public sync relay
    relayNotes.forEach(rn => {
      if (!mergedById.has(rn.id)) {
        mergedById.set(rn.id, {
          ...rn,
          hasUpvoted: upvotes.has(rn.id) || Boolean(rn.hasUpvoted)
        });
      } else {
        const existing = mergedById.get(rn.id)!;
        mergedById.set(rn.id, {
          ...existing,
          programId: existing.programId || rn.programId,
          programIds: existing.programIds || rn.programIds,
          programName: existing.programName || rn.programName,
          degreeTier: existing.degreeTier || rn.degreeTier,
          semesterNumber: existing.semesterNumber ?? rn.semesterNumber,
          semesterId: existing.semesterId || rn.semesterId,
          courseId: existing.courseId || rn.courseId,
          universityId: existing.universityId || rn.universityId,
          upvotesCount: Math.max(existing.upvotesCount || 0, rn.upvotesCount || 0)
        });
      }
    });

    // Preserve local seed notes + any local notes uploaded in this browser that haven't been deleted
    localNotes.forEach(ln => {
      if (!deletedIds.has(ln.id) && !mergedById.has(ln.id)) {
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

  return { notes: localNotes, isFromSupabase: false, error: tableErrorMsg };
}
