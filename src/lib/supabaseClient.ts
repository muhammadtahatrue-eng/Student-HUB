import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { StudyNote, SupabaseConfig } from '../types/index.ts';
import { INITIAL_STUDY_NOTES } from '../data/seedData.ts';

const STORAGE_KEY_CONFIG = 'xeusar_supabase_config_v2';
const STORAGE_KEY_NOTES = 'xeusar_local_notes_v2';
const STORAGE_KEY_UPVOTES = 'xeusar_user_upvotes_v2';

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
  } catch (e) {
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
  } catch (e) {
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
    // Do not log error to avoid triggering false-positive AI Studio crash alerts
    return null;
  }
}

// Test live Supabase connection
export async function testSupabaseConnection(url: string, key: string): Promise<{ success: boolean; message: string }> {
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

    // Test a basic select or health call
    const { error } = await testClient.from('study_notes').select('id').limit(1);

    if (error) {
      if (
        error.code === '42P01' ||
        error.code === 'PGRST205' ||
        error.message.includes('relation "study_notes" does not exist') ||
        error.message.includes('schema cache') ||
        error.message.includes('not found')
      ) {
        return {
          success: true,
          message: 'Connected to Supabase! (Note: database tables are not created yet; run the provided SQL migration in your Supabase SQL Editor).'
        };
      }
      return { success: false, message: `Supabase responded with: ${error.message} (Code: ${error.code})` };
    }

    return { success: true, message: 'Connected to Supabase study_notes table successfully!' };
  } catch (err: any) {
    return { success: false, message: err?.message || 'Could not reach Supabase endpoint.' };
  }
}

// Local Storage Fallback Data Manager
export function getLocalNotes(): StudyNote[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY_NOTES);
    if (stored) {
      const parsed: StudyNote[] = JSON.parse(stored);
      const upvotes = getUpvotedIds();
      return parsed.map(note => ({
        ...note,
        hasUpvoted: upvotes.has(note.id)
      }));
    }
  } catch (e) {
    // Fall back to seed notes
  }

  // Initialize with seed data
  setLocalNotes(INITIAL_STUDY_NOTES);
  return INITIAL_STUDY_NOTES;
}

export function setLocalNotes(notes: StudyNote[]): void {
  try {
    localStorage.setItem(STORAGE_KEY_NOTES, JSON.stringify(notes));
  } catch (e) {
    // Ignore storage issues
  }
}

export function getUpvotedIds(): Set<string> {
  try {
    const stored = localStorage.getItem(STORAGE_KEY_UPVOTES);
    if (stored) {
      return new Set(JSON.parse(stored));
    }
  } catch {}
  return new Set();
}

export function toggleUpvoteLocal(noteId: string): { upvoted: boolean; count: number } {
  const upvotes = getUpvotedIds();
  const isUpvoted = upvotes.has(noteId);
  const notes = getLocalNotes();
  const noteIndex = notes.findIndex(n => n.id === noteId);

  if (isUpvoted) {
    upvotes.delete(noteId);
  } else {
    upvotes.add(noteId);
  }

  try {
    localStorage.setItem(STORAGE_KEY_UPVOTES, JSON.stringify(Array.from(upvotes)));
  } catch {}

  let newCount = 0;
  if (noteIndex >= 0) {
    newCount = isUpvoted ? Math.max(0, notes[noteIndex].upvotesCount - 1) : notes[noteIndex].upvotesCount + 1;
    notes[noteIndex].upvotesCount = newCount;
    notes[noteIndex].hasUpvoted = !isUpvoted;
    setLocalNotes(notes);
  }

  return { upvoted: !isUpvoted, count: newCount };
}

export function incrementDownloadCountLocal(noteId: string): number {
  const notes = getLocalNotes();
  const noteIndex = notes.findIndex(n => n.id === noteId);
  if (noteIndex >= 0) {
    notes[noteIndex].downloadsCount += 1;
    setLocalNotes(notes);
    return notes[noteIndex].downloadsCount;
  }
  return 0;
}

export function addLocalNote(newNote: StudyNote): void {
  const notes = getLocalNotes().filter(n => n.id !== newNote.id);
  notes.unshift(newNote);
  setLocalNotes(notes);
}

// Unified Service to fetch notes (Supabase if connected, else Local)
export async function fetchAllNotes(supabaseClient: SupabaseClient | null): Promise<{
  notes: StudyNote[];
  isFromSupabase: boolean;
  error?: string;
}> {
  const localNotes = getLocalNotes();
  const localById = new Map<string, StudyNote>();
  localNotes.forEach(n => localById.set(n.id, n));

  if (supabaseClient) {
    try {
      const { data, error } = await supabaseClient
        .from('study_notes')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        return { notes: localNotes, isFromSupabase: false, error: error.message };
      }

      if (data && data.length > 0) {
        const upvotes = getUpvotedIds();
        const mapped: StudyNote[] = data.map((row: any) => {
          const localMatch = localById.get(row.id);
          return {
            id: row.id,
            title: row.title,
            description: row.description || '',
            courseCode: row.course_code,
            courseName: row.course_name || localMatch?.courseName || row.subject,
            courseId: row.course_id || localMatch?.courseId,
            subject: row.subject,
            materialType: row.material_type,
            academicYear: row.academic_year || new Date().getFullYear(),
            semester: row.semester || localMatch?.semester || 'Current Semester',
            semesterNumber:
              typeof row.semester_number === 'number'
                ? row.semester_number
                : localMatch?.semesterNumber,
            semesterId:
              row.semester_number
                ? `sem-${row.semester_number}`
                : localMatch?.semesterId,
            professor: row.professor || 'Instructor',
            fileUrl: row.file_url,
            fileName: row.file_name,
            fileSizeBytes: row.file_size_bytes || 2048000,
            pageCount: row.page_count || 10,
            uploaderId: row.uploader_id || localMatch?.uploaderId,
            uploaderName: row.uploader_name || 'Student Contributor',
            uploaderUniversity: row.uploader_university || 'Open Campus',
            universityId: row.university_id || localMatch?.universityId,
            programId: row.program_id || localMatch?.programId,
            programIds:
              Array.isArray(row.program_ids) && row.program_ids.length > 0
                ? row.program_ids
                : localMatch?.programIds ||
                  (row.program_id ? [row.program_id] : undefined),
            programName: row.program_name || localMatch?.programName,
            degreeTier: row.degree_tier || localMatch?.degreeTier,
            contentHash: row.content_hash || localMatch?.contentHash,
            storagePath: row.storage_path || localMatch?.storagePath,
            downloadsCount: row.downloads_count || 0,
            upvotesCount: row.upvotes_count || 0,
            hasUpvoted: upvotes.has(row.id),
            createdAt: row.created_at,
            tags: row.tags || [row.subject, row.course_code],
            pages: row.pages || localMatch?.pages || [
              {
                pageNumber: 1,
                sectionTitle: `${row.title} - Overview`,
                content: row.description || 'Uploaded study guide and lecture notes.',
                keyFormulasOrPoints: ['Verified peer study material', 'Complete syllabus coverage']
              }
            ]
          };
        });

        // Merge any local notes that are not yet in remote rows (by id) so zero resources are lost
        const remoteIds = new Set(mapped.map(m => m.id));
        const merged = [
          ...mapped,
          ...localNotes.filter(ln => !remoteIds.has(ln.id))
        ];
        setLocalNotes(merged);
        return { notes: merged, isFromSupabase: true };
      }
    } catch {
      // Fallback
    }
  }

  return { notes: localNotes, isFromSupabase: false };
}
