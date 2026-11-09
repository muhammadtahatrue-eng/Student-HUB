import { SupabaseClient } from '@supabase/supabase-js';
import {
  StudyNote,
  MaterialType,
  DegreeTier,
  AcademicProgram,
  StudentUser
} from '../types/index.ts';
import {
  getLocalNotes,
  setLocalNotes,
  isValidHttpUrl,
  recordDeletedNoteId,
  classifySupabaseError
} from './supabaseClient.ts';
import { getAllPrograms, getProgramById, ensureProgramExistsInSupabase } from './programStore.ts';
import { ensureUniversityExistsInSupabase } from './universityStore.ts';
import {
  storeLocalPdfBlob,
  storeUploadedFileAllKeys,
  blobToDataUrl,
  getUploadedPdfPageCount
} from './pdfViewerService.ts';

// ============================================================================
// CONSTANTS: 5 MB PER-FILE LIMIT & 1 GB TOTAL PHYSICAL STORAGE QUOTA
// ============================================================================

export const MAX_UPLOAD_SIZE_BYTES = 5 * 1024 * 1024; // 5,242,880 bytes (5 MB)
export const MAX_TOTAL_STORAGE_BYTES = 1024 * 1024 * 1024; // 1,073,741,824 bytes (1 GB)

export const OVERSIZED_FILE_ERROR_MESSAGE =
  'This file exceeds the 5 MB upload limit. Please compress it or choose a smaller file.';

export const STORAGE_FULL_ERROR_MESSAGE =
  'Storage quota reached (1 GB limit). Cannot store additional physical files until space is freed.';

const STORAGE_KEY_PHYSICAL_FILES = 'xeusar_physical_files_registry_v1';
const STORAGE_KEY_LOCAL_UPLOADER_ID = 'xeusar_local_uploader_id_v1';
const STORAGE_KEY_OWNED_NOTE_IDS = 'xeusar_owned_note_ids_v1';

/**
 * Returns a persistent local uploader identifier for the current browser/session
 * when a user uploads without a remote Supabase UUID, ensuring strict ownership tracking.
 */
export function getOrCreateLocalUploaderId(): string {
  try {
    const existing = localStorage.getItem(STORAGE_KEY_LOCAL_UPLOADER_ID);
    if (existing && existing.trim()) return existing.trim();
    const generated =
      typeof crypto !== 'undefined' && crypto.randomUUID
        ? `local-uploader-${crypto.randomUUID()}`
        : `local-uploader-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
    localStorage.setItem(STORAGE_KEY_LOCAL_UPLOADER_ID, generated);
    return generated;
  } catch {
    return 'local-uploader-session';
  }
}

function getOwnedNotesRegistry(): Record<string, string> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_OWNED_NOTE_IDS);
    if (raw) return JSON.parse(raw);
  } catch {}
  return {};
}

export function recordUploadedNoteOwnership(noteId: string, uploaderId: string): void {
  if (!noteId || !uploaderId) return;
  try {
    const reg = getOwnedNotesRegistry();
    reg[noteId] = uploaderId;
    localStorage.setItem(STORAGE_KEY_OWNED_NOTE_IDS, JSON.stringify(reg));
  } catch {}
}

/**
 * Strictly determines whether the given user is the original uploader of `note`
 * and is therefore authorized to delete (or manage) it.
 */
export function canUserDeleteNote(
  note: StudyNote | null | undefined,
  user?: StudentUser | null
): boolean {
  if (!note) return false;

  if (
    user &&
    !user.isGuest &&
    (user.isModerator === true ||
      user.moderatorRole === 'moderator' ||
      user.moderatorRole === 'admin')
  ) {
    return true;
  }

  const currentUserId = user?.id?.trim();
  const localUploaderId = getOrCreateLocalUploaderId();
  const ownedRegistry = getOwnedNotesRegistry();
  const recordedOwnerId = note.uploaderId?.trim() || ownedRegistry[note.id];

  // 1. If the note has an explicit uploaderId (either on the record or in ownership registry)
  if (recordedOwnerId) {
    if (currentUserId && recordedOwnerId === currentUserId) {
      return true;
    }
    if (recordedOwnerId === localUploaderId) {
      return true;
    }
    // Belongs to a different uploader ID -> strictly deny
    return false;
  }

  // 2. Fallback for legacy notes where uploaderId wasn't stored in DB row:
  // Only allow if the user is authenticated (non-guest) and their name/username matches the note's uploaderName
  if (user && !user.isGuest) {
    const cleanUploaderName = (note.uploaderName || '').trim().toLowerCase();
    const genericNames = new Set(['anonymous student', 'student contributor', 'anonymous', 'student peer']);
    if (cleanUploaderName && !genericNames.has(cleanUploaderName)) {
      const cleanUserName = (user.name || '').trim().toLowerCase();
      const cleanHandle = (user.username || '').trim().toLowerCase();
      if (
        (cleanUserName && cleanUploaderName === cleanUserName) ||
        (cleanHandle && cleanUploaderName === cleanHandle)
      ) {
        return true;
      }
    }
  }

  return false;
}

export interface StoredPhysicalFileRecord {
  contentHash: string;
  storagePath: string;
  fileUrl: string;
  mimeType: string;
  sizeBytes: number;
  createdAt: string;
}

export interface CompressionResult {
  file: File;
  originalSizeBytes: number;
  compressedSizeBytes: number;
  wasCompressed: boolean;
  savedBytes: number;
  isValid: boolean;
  error?: string;
}

export interface StorageQuotaSummary {
  usedBytes: number;
  remainingBytes: number;
  maxBytes: number;
  usagePercent: number;
  uniquePhysicalFilesCount: number;
  totalResourceRecordsCount: number;
  deduplicatedSavedBytes: number;
}

// ============================================================================
// CONCURRENCY & IDEMPOTENCY GUARDS
// ============================================================================

const inFlightIdempotencyKeys = new Set<string>();
const inFlightContentHashes = new Map<string, Promise<{ fileUrl: string; storagePath: string; deduplicated: boolean }>>();
const inFlightByteReservations = new Map<string, number>();

function getTotalInFlightReservedBytes(): number {
  let sum = 0;
  for (const bytes of inFlightByteReservations.values()) {
    sum += bytes;
  }
  return sum;
}

export function formatBytesReadable(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return '0 KB';
  if (bytes >= 1024 * 1024 * 1024) {
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
  }
  if (bytes >= 1024 * 1024) {
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  }
  return `${Math.max(1, Math.round(bytes / 1024))} KB`;
}

// ============================================================================
// SHA-256 CONTENT HASHING
// ============================================================================

export async function computeFileSha256(file: Blob): Promise<string> {
  const buffer = await file.arrayBuffer();
  if (typeof crypto !== 'undefined' && crypto.subtle) {
    const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }
  // Deterministic fallback hash if WebCrypto is unavailable in non-HTTPS test context
  const bytes = new Uint8Array(buffer);
  let h1 = 0xdeadbeef ^ bytes.length;
  let h2 = 0x41c6ce57 ^ bytes.length;
  for (let i = 0; i < bytes.length; i++) {
    const ch = bytes[i];
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  return (
    (h1 >>> 0).toString(16).padStart(8, '0') +
    (h2 >>> 0).toString(16).padStart(8, '0') +
    bytes.length.toString(16).padStart(16, '0')
  ).padEnd(64, '0');
}

// ============================================================================
// SAFE FILE VALIDATION & COMPRESSION
// ============================================================================

async function verifyPdfIntegrity(blob: Blob): Promise<boolean> {
  try {
    if (blob.size < 16) return false;
    const headerSlice = await blob.slice(0, 1024).arrayBuffer();
    const headerStr = new TextDecoder('latin1').decode(new Uint8Array(headerSlice));
    if (!headerStr.includes('%PDF-')) return false;

    const tailStart = Math.max(0, blob.size - 2048);
    const tailSlice = await blob.slice(tailStart, blob.size).arrayBuffer();
    const tailStr = new TextDecoder('latin1').decode(new Uint8Array(tailSlice));
    // Standard PDFs end with %%EOF or contain xref/startxref/obj structures
    return tailStr.includes('%%EOF') || tailStr.includes('endobj') || headerStr.startsWith('%PDF-');
  } catch {
    return false;
  }
}

async function optimizePdfSafely(file: File): Promise<File> {
  try {
    const isValidOriginal = await verifyPdfIntegrity(file);
    if (!isValidOriginal) {
      throw new Error('Selected PDF file is corrupted or missing a valid %PDF header.');
    }

    const buffer = await file.arrayBuffer();
    const bytes = new Uint8Array(buffer);

    // 1. Trim trailing null/whitespace padding after final %%EOF while keeping a single newline
    const textLatin1 = new TextDecoder('latin1').decode(bytes);
    const eofIdx = textLatin1.lastIndexOf('%%EOF');
    if (eofIdx === -1) {
      return file;
    }

    // Only strip redundant trailing bytes after %%EOF or safely compact excessive inter-object blank lines
    // outside binary streams so we NEVER alter binary streams, fonts, formulas, or scanned images.
    let endOffset = eofIdx + 5;
    while (endOffset < bytes.length && (bytes[endOffset] === 0x0a || bytes[endOffset] === 0x0d)) {
      endOffset++;
      break;
    }

    if (endOffset < bytes.length) {
      const trimmedBytes = bytes.slice(0, endOffset);
      const candidateFile = new File([trimmedBytes], file.name, {
        type: 'application/pdf',
        lastModified: file.lastModified
      });
      if (candidateFile.size < file.size && (await verifyPdfIntegrity(candidateFile))) {
        return candidateFile;
      }
    }

    return file;
  } catch (err) {
    throw err;
  }
}

async function compressImageSafely(file: File): Promise<File> {
  if (typeof document === 'undefined' || typeof Image === 'undefined') {
    return file;
  }

  return new Promise<File>((resolve, reject) => {
    const objectUrl = URL.createObjectURL(file);
    const img = new Image();

    img.onload = () => {
      URL.revokeObjectURL(objectUrl);
      try {
        const maxDimension = file.size > MAX_UPLOAD_SIZE_BYTES ? 1920 : 2400;
        let targetWidth = img.naturalWidth || img.width;
        let targetHeight = img.naturalHeight || img.height;

        if (targetWidth <= 0 || targetHeight <= 0) {
          reject(new Error('Invalid image dimensions.'));
          return;
        }

        if (targetWidth > maxDimension || targetHeight > maxDimension) {
          const scale = Math.min(maxDimension / targetWidth, maxDimension / targetHeight);
          targetWidth = Math.max(1, Math.round(targetWidth * scale));
          targetHeight = Math.max(1, Math.round(targetHeight * scale));
        }

        const canvas = document.createElement('canvas');
        canvas.width = targetWidth;
        canvas.height = targetHeight;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(file);
          return;
        }

        // Preserve transparency for PNG/WebP
        const isTransparentCapable =
          file.type === 'image/png' || file.type === 'image/webp';
        if (!isTransparentCapable) {
          ctx.fillStyle = '#FFFFFF';
          ctx.fillRect(0, 0, targetWidth, targetHeight);
        }

        ctx.drawImage(img, 0, 0, targetWidth, targetHeight);

        const outputMime =
          file.type === 'image/png'
            ? file.size > MAX_UPLOAD_SIZE_BYTES
              ? 'image/webp'
              : 'image/png'
            : file.type === 'image/webp'
            ? 'image/webp'
            : 'image/jpeg';

        const quality = file.size > MAX_UPLOAD_SIZE_BYTES ? 0.78 : 0.86;

        canvas.toBlob(
          blob => {
            if (!blob || blob.size === 0) {
              resolve(file);
              return;
            }
            // Only use compressed version if it actually reduced size or if resizing was needed
            if (blob.size < file.size) {
              const ext =
                outputMime === 'image/webp'
                  ? '.webp'
                  : outputMime === 'image/png'
                  ? '.png'
                  : '.jpg';
              const baseName = file.name.replace(/\.[^.]+$/, '');
              const compressedFile = new File([blob], `${baseName}${ext}`, {
                type: outputMime,
                lastModified: Date.now()
              });
              resolve(compressedFile);
            } else {
              resolve(file);
            }
          },
          outputMime,
          quality
        );
      } catch {
        resolve(file);
      }
    };

    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error('Selected image file could not be decoded or is corrupted.'));
    };

    img.src = objectUrl;
  });
}

/**
 * Safely compresses a supported file (PDF, JPEG/PNG/WebP image, or academic document)
 * and enforces the strict 5 MB maximum upload limit.
 */
export async function prepareAndValidateUploadFile(
  inputFile: File
): Promise<CompressionResult> {
  const originalSizeBytes = inputFile.size;

  if (originalSizeBytes === 0) {
    return {
      file: inputFile,
      originalSizeBytes: 0,
      compressedSizeBytes: 0,
      wasCompressed: false,
      savedBytes: 0,
      isValid: false,
      error: 'The selected file is empty (0 bytes). Please choose a valid document.'
    };
  }

  const lowerName = inputFile.name.toLowerCase();
  const isPdf =
    inputFile.type === 'application/pdf' || lowerName.endsWith('.pdf');
  const isImage =
    inputFile.type.startsWith('image/') ||
    /\.(png|jpe?g|webp)$/i.test(lowerName);

  let processedFile = inputFile;

  try {
    if (isPdf) {
      processedFile = await optimizePdfSafely(inputFile);
    } else if (isImage) {
      processedFile = await compressImageSafely(inputFile);
    }
  } catch (err: any) {
    return {
      file: inputFile,
      originalSizeBytes,
      compressedSizeBytes: originalSizeBytes,
      wasCompressed: false,
      savedBytes: 0,
      isValid: false,
      error: err?.message || 'File validation failed. Please select an intact file.'
    };
  }

  const compressedSizeBytes = processedFile.size;
  const wasCompressed = compressedSizeBytes < originalSizeBytes;
  const savedBytes = Math.max(0, originalSizeBytes - compressedSizeBytes);

  // Enforce strict 5 MB limit on final file size
  if (compressedSizeBytes > MAX_UPLOAD_SIZE_BYTES) {
    return {
      file: processedFile,
      originalSizeBytes,
      compressedSizeBytes,
      wasCompressed,
      savedBytes,
      isValid: false,
      error: OVERSIZED_FILE_ERROR_MESSAGE
    };
  }

  return {
    file: processedFile,
    originalSizeBytes,
    compressedSizeBytes,
    wasCompressed,
    savedBytes,
    isValid: true
  };
}

// ============================================================================
// PHYSICAL FILE REGISTRY & 1 GB QUOTA MANAGEMENT
// ============================================================================

export function getPhysicalFileRegistry(): Record<string, StoredPhysicalFileRecord> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_PHYSICAL_FILES);
    if (raw) {
      return JSON.parse(raw);
    }
  } catch {}
  return {};
}

function savePhysicalFileRegistry(registry: Record<string, StoredPhysicalFileRecord>): void {
  try {
    localStorage.setItem(STORAGE_KEY_PHYSICAL_FILES, JSON.stringify(registry));
  } catch {}
}

/**
 * Calculates total physical storage usage across all unique stored files.
 * Files shared between My Program and Study Library or deduplicated by SHA-256 hash
 * are counted ONLY ONCE toward the 1 GB physical storage quota.
 */
export function getStorageQuotaSummary(allNotes?: StudyNote[]): StorageQuotaSummary {
  const notes = allNotes || getLocalNotes();
  const registry = getPhysicalFileRegistry();

  const uniqueFilesByKey = new Map<string, number>();
  let totalLogicalBytes = 0;

  for (const note of notes) {
    const bytes = Math.max(0, Number(note.fileSizeBytes) || 0);
    totalLogicalBytes += bytes;

    const uniqueKey =
      note.contentHash ||
      note.storagePath ||
      note.fileUrl ||
      note.id;

    if (!uniqueFilesByKey.has(uniqueKey)) {
      const regEntry = note.contentHash ? registry[note.contentHash] : undefined;
      uniqueFilesByKey.set(uniqueKey, regEntry ? regEntry.sizeBytes : bytes);
    }
  }

  let usedBytes = 0;
  for (const size of uniqueFilesByKey.values()) {
    usedBytes += size;
  }

  // Include active in-flight reservations
  const effectiveUsedBytes = usedBytes + getTotalInFlightReservedBytes();
  const remainingBytes = Math.max(0, MAX_TOTAL_STORAGE_BYTES - effectiveUsedBytes);
  const usagePercent = Math.min(
    100,
    Number(((effectiveUsedBytes / MAX_TOTAL_STORAGE_BYTES) * 100).toFixed(2))
  );
  const deduplicatedSavedBytes = Math.max(0, totalLogicalBytes - usedBytes);

  return {
    usedBytes: effectiveUsedBytes,
    remainingBytes,
    maxBytes: MAX_TOTAL_STORAGE_BYTES,
    usagePercent,
    uniquePhysicalFilesCount: uniqueFilesByKey.size,
    totalResourceRecordsCount: notes.length,
    deduplicatedSavedBytes
  };
}

/**
 * Looks up whether a physical file with the same SHA-256 content hash already exists.
 * Does NOT expose private user or ownership metadata.
 */
export async function findExistingFileByHash(
  contentHash: string,
  supabaseClient: SupabaseClient | null,
  existingNotes?: StudyNote[]
): Promise<{ fileUrl: string; storagePath: string; sizeBytes: number } | null> {
  if (!contentHash) return null;

  // 1. Check local physical file registry
  const registry = getPhysicalFileRegistry();
  if (registry[contentHash] && registry[contentHash].fileUrl) {
    return {
      fileUrl: registry[contentHash].fileUrl,
      storagePath: registry[contentHash].storagePath,
      sizeBytes: registry[contentHash].sizeBytes
    };
  }

  // 2. Check existing notes in memory / local storage
  const notes = existingNotes || getLocalNotes();
  const matchInNotes = notes.find(
    n => n.contentHash === contentHash && Boolean(n.fileUrl)
  );
  if (matchInNotes) {
    return {
      fileUrl: matchInNotes.fileUrl,
      storagePath: matchInNotes.storagePath || `dedup/${contentHash}.pdf`,
      sizeBytes: matchInNotes.fileSizeBytes
    };
  }

  // 3. Check Supabase stored_files or study_notes by content_hash
  if (supabaseClient) {
    try {
      const { data: storedFileRow } = await supabaseClient
        .from('stored_files')
        .select('file_url, storage_path, size_bytes')
        .eq('content_hash', contentHash)
        .maybeSingle();

      if (storedFileRow && storedFileRow.file_url) {
        return {
          fileUrl: storedFileRow.file_url,
          storagePath: storedFileRow.storage_path || `dedup/${contentHash}`,
          sizeBytes: Number(storedFileRow.size_bytes) || 0
        };
      }
    } catch {
      // Table may not exist yet; fall through to study_notes check
    }

    try {
      const { data: noteRow } = await supabaseClient
        .from('study_notes')
        .select('file_url, storage_path, file_size_bytes')
        .eq('content_hash', contentHash)
        .limit(1)
        .maybeSingle();

      if (noteRow && noteRow.file_url) {
        return {
          fileUrl: noteRow.file_url,
          storagePath: noteRow.storage_path || `dedup/${contentHash}`,
          sizeBytes: Number(noteRow.file_size_bytes) || 0
        };
      }
    } catch {
      // Column may not exist yet
    }
  }

  return null;
}

// ============================================================================
// COURSE & DISCIPLINE CATEGORIZATION (ALIGNED WITH UPLOADER'S COURSE)
// ============================================================================

/**
 * Checks whether a string looks like a raw course code (e.g. "CS-201", "MATH 101", "ENG-EE-101").
 */
export function isRawCourseCodeString(val?: string | null): boolean {
  if (!val) return false;
  const trimmed = val.trim();
  return /^[A-Z]{2,6}(?:[-_\s]?[A-Z]{1,4})?[-_\s]?\d{2,4}[A-Z]?$/i.test(trimmed);
}

/**
 * Automatically maps an uploader's enrolled degree program / course (e.g. BS Electrical Engineering,
 * BS Mechanical Engineering, BS Software Engineering, BS Computer Science, BBA) to its overarching
 * Course Category (e.g. "Engineering", "Computer Science", "Data Science & AI", "Business & Management").
 */
export function deriveCourseCategoryFromUploaderProgram(
  programOrIdOrName?: AcademicProgram | string | null,
  extraCourseText?: string
): string {
  let resolvedProg: AcademicProgram | undefined;
  let rawText = '';

  if (programOrIdOrName && typeof programOrIdOrName === 'object') {
    resolvedProg = programOrIdOrName;
    rawText = `${resolvedProg.name} ${resolvedProg.discipline} ${resolvedProg.shortCode}`;
  } else if (typeof programOrIdOrName === 'string' && programOrIdOrName.trim()) {
    resolvedProg = getProgramById(programOrIdOrName.trim());
    rawText = resolvedProg
      ? `${resolvedProg.name} ${resolvedProg.discipline} ${resolvedProg.shortCode}`
      : programOrIdOrName;
  }

  const combined = `${rawText} ${extraCourseText || ''}`.toLowerCase();

  if (
    combined.includes('engineering') ||
    combined.includes('bsee') ||
    combined.includes('bsme') ||
    combined.includes('bsce') ||
    combined.includes('bsse') ||
    combined.includes('electrical') ||
    combined.includes('mechanical') ||
    combined.includes('civil') ||
    combined.includes('mechatronics') ||
    combined.includes('aerospace') ||
    combined.includes('chemical eng') ||
    combined.includes('hardware') ||
    combined.includes('circuit') ||
    combined.includes('thermodynamics')
  ) {
    return 'Engineering';
  }

  if (
    combined.includes('data science') ||
    combined.includes('artificial intelligence') ||
    combined.includes('bsds') ||
    combined.includes('msds') ||
    combined.includes('machine learning')
  ) {
    return 'Data Science & AI';
  }

  if (
    combined.includes('computer science') ||
    combined.includes('computing') ||
    combined.includes('cyber') ||
    combined.includes('bscs') ||
    combined.includes('mscs') ||
    combined.includes('adcs') ||
    combined.includes('information technology')
  ) {
    return 'Computer Science';
  }

  if (
    combined.includes('business') ||
    combined.includes('management') ||
    combined.includes('bba') ||
    combined.includes('mba') ||
    combined.includes('adba')
  ) {
    return 'Business & Management';
  }

  if (
    combined.includes('accounting') ||
    combined.includes('finance') ||
    combined.includes('economics') ||
    combined.includes('bsaf')
  ) {
    return 'Economics';
  }

  if (combined.includes('math') || combined.includes('calculus') || combined.includes('linear algebra')) {
    return 'Mathematics';
  }
  if (combined.includes('physics') || combined.includes('quantum') || combined.includes('electromagnetism')) {
    return 'Physics';
  }
  if (combined.includes('chemistry') || combined.includes('organic')) {
    return 'Chemistry';
  }
  if (combined.includes('biology') || combined.includes('genetics') || combined.includes('medical')) {
    return 'Biology';
  }
  if (combined.includes('psychology') || combined.includes('cognitive')) {
    return 'Psychology';
  }
  if (combined.includes('history')) {
    return 'History';
  }
  if (combined.includes('philosophy') || combined.includes('ethics')) {
    return 'Philosophy';
  }

  if (resolvedProg?.discipline) {
    return resolvedProg.discipline;
  }

  return 'Engineering';
}

/**
 * Returns the overarching Course Category (e.g., "Engineering", "Computer Science")
 * for a note in accordance with the uploader's course/program.
 */
export function getNoteCourseCategory(note: StudyNote): string {
  // If uploader's program is an Engineering program (e.g. BS Electrical Engineering, BS Software Engineering, BS Mechanical Engineering),
  // ensure it is categorized under Engineering in accordance with the uploader's course.
  if (note.programId || note.programName) {
    const derived = deriveCourseCategoryFromUploaderProgram(
      note.programId || note.programName,
      note.courseName
    );
    if (derived === 'Engineering') {
      return 'Engineering';
    }
    if (!note.subject || isRawCourseCodeString(note.subject)) {
      return derived;
    }
  }
  if (note.subject && !isRawCourseCodeString(note.subject)) {
    return note.subject;
  }
  return deriveCourseCategoryFromUploaderProgram(
    note.programId || note.programName,
    note.courseName
  );
}

/**
 * Returns the human-readable Course / Subject name for a note instead of a course code.
 * Prioritizes the specific course name (if not a raw code), then the uploader's degree course/program,
 * then the overarching course category (like "Engineering").
 */
export function getNoteCourseDisplay(note: StudyNote): string {
  const cleanCourseName = (note.courseName || '').trim();
  if (cleanCourseName && !isRawCourseCodeString(cleanCourseName)) {
    return cleanCourseName;
  }
  const cleanProgramName = (note.programName || '').trim();
  if (cleanProgramName) {
    return cleanProgramName;
  }
  return getNoteCourseCategory(note);
}

/**
 * Automatically generates a clean internal course identifier behind the scenes
 * so users never have to enter or see raw course codes.
 */
export function generateInternalCourseCode(
  courseName: string,
  subjectCategory: string,
  programName?: string
): string {
  const baseSource = (courseName || programName || subjectCategory || 'COURSE').trim();
  if (isRawCourseCodeString(baseSource)) {
    return baseSource.toUpperCase();
  }
  const prefix = (subjectCategory || 'CRS')
    .replace(/[^a-zA-Z]/g, '')
    .slice(0, 3)
    .toUpperCase() || 'CRS';
  const words = baseSource
    .replace(/[^a-zA-Z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter(Boolean);
  const acronym = words
    .map(w => w[0]?.toUpperCase() || '')
    .join('')
    .slice(0, 4) || 'GEN';
  return `${prefix}-${acronym}`;
}

// ============================================================================
// PROGRAM <-> STUDY LIBRARY RESOURCE MATCHING (UNIVERSITY-INDEPENDENT)
// ============================================================================

/**
 * Determines whether a StudyNote belongs to a given AcademicProgram.
 * Never restricts visibility by university — students in the same degree program
 * can discover all shared resources for that program regardless of university.
 */
export function noteBelongsToProgram(
  note: StudyNote,
  programId: string,
  program?: AcademicProgram | null
): boolean {
  if (!programId || programId === 'all') return true;
  const resolvedProgram = program === undefined ? getProgramById(programId) : program;

  // 1. Direct primary programId match
  if (note.programId && note.programId === programId) {
    return true;
  }

  // 2. Multi-program association array match
  if (Array.isArray(note.programIds) && note.programIds.includes(programId)) {
    return true;
  }

  // 3. Program name match
  if (
    resolvedProgram &&
    note.programName &&
    note.programName.trim().toLowerCase() === resolvedProgram.name.trim().toLowerCase()
  ) {
    return true;
  }

  // 4. Match by curriculum course name or code belonging to this program
  if (resolvedProgram?.semesters) {
    const normalizedNoteCourse = (note.courseName || '').trim().toLowerCase();
    const normalizedNoteCode = (note.courseCode || '').replace(/[\s-_]+/g, '').toUpperCase();
    for (const sem of resolvedProgram.semesters) {
      for (const course of sem.courses || []) {
        if (
          normalizedNoteCourse &&
          course.name.trim().toLowerCase() === normalizedNoteCourse
        ) {
          return true;
        }
        const normalizedCourseCode = course.code.replace(/[\s-_]+/g, '').toUpperCase();
        if (normalizedCourseCode && normalizedCourseCode === normalizedNoteCode) {
          return true;
        }
      }
    }
  }

  // 5. Fallback for program discipline / course category match when programId wasn't explicitly set
  if (resolvedProgram && !note.programId) {
    const progCategory = deriveCourseCategoryFromUploaderProgram(resolvedProgram);
    if (getNoteCourseCategory(note) === progCategory) {
      return true;
    }
  }

  return false;
}

/**
 * Finds all courses across a program's semesters for dropdown selection & filtering.
 */
export function getProgramCoursesList(programId: string): {
  id: string;
  code: string;
  name: string;
  semesterNumber: number;
  instructor?: string;
}[] {
  const program = getProgramById(programId);
  if (!program || !program.semesters) return [];
  const list: {
    id: string;
    code: string;
    name: string;
    semesterNumber: number;
    instructor?: string;
  }[] = [];

  for (const sem of program.semesters) {
    for (const course of sem.courses || []) {
      list.push({
        id: course.id,
        code: course.code,
        name: course.name,
        semesterNumber: sem.semesterNumber,
        instructor: course.instructor
      });
    }
  }
  return list;
}

// ============================================================================
// AUTHORITATIVE SHARED UPLOAD WORKFLOW
// ============================================================================

export interface SharedResourceUploadParams {
  file: File | null;
  title: string;
  description: string;
  courseCode: string;
  courseName: string;
  courseId?: string;
  subject: string;
  materialType: MaterialType;
  academicYear: number;
  semester: string;
  semesterNumber: number;
  professor: string;
  tags: string[];
  uploaderId?: string;
  uploaderName: string;
  uploaderUniversity: string;
  universityId?: string;
  programId: string;
  additionalProgramIds?: string[];
  programName: string;
  degreeTier: DegreeTier;
  isRestricted?: boolean;
  isPublic?: boolean;
  isPublished?: boolean;
  idempotencyKey?: string;
  supabaseClient: SupabaseClient | null;
  supabaseUrl?: string;
  isConnected?: boolean;
  onProgress?: (percent: number) => void;
}

export interface SharedResourceUploadResult {
  note: StudyNote;
  wasCompressed: boolean;
  originalSizeBytes: number;
  finalSizeBytes: number;
  deduplicated: boolean;
  contentHash: string;
  syncedToSupabase: boolean;
  syncWarning?: string;
}

export async function uploadSharedResource(
  params: SharedResourceUploadParams
): Promise<SharedResourceUploadResult> {
  const idempotencyKey =
    params.idempotencyKey ||
    `${params.uploaderId || 'anon'}::${params.title.trim().toLowerCase()}::${params.courseCode.trim().toUpperCase()}::${params.file?.name || 'nofile'}::${params.file?.size || 0}`;

  if (inFlightIdempotencyKeys.has(idempotencyKey)) {
    throw new Error('This upload is already in progress. Please wait.');
  }

  // Check if an identical idempotency key was already saved recently (retry protection)
  const currentLocalNotes = getLocalNotes();
  const existingByIdempotency = currentLocalNotes.find(
    n => n.idempotencyKey && n.idempotencyKey === idempotencyKey && !n.isUnsynced
  );
  if (existingByIdempotency) {
    return {
      note: existingByIdempotency,
      wasCompressed: Boolean(existingByIdempotency.wasCompressed),
      originalSizeBytes: existingByIdempotency.originalSizeBytes || existingByIdempotency.fileSizeBytes,
      finalSizeBytes: existingByIdempotency.fileSizeBytes,
      deduplicated: true,
      contentHash: existingByIdempotency.contentHash || '',
      syncedToSupabase: !existingByIdempotency.isUnsynced,
      syncWarning: existingByIdempotency.syncError
    };
  }

  inFlightIdempotencyKeys.add(idempotencyKey);
  const reservationId = `res_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

  try {
    params.onProgress?.(10);

    let finalFile: File | null = params.file;
    let originalSizeBytes = params.file ? params.file.size : 142000;
    let finalSizeBytes = originalSizeBytes;
    let wasCompressed = false;
    let contentHash = '';

    // 1. Validate & Safely Compress File (enforcing 5 MB limit)
    if (params.file) {
      if (params.file.size > MAX_UPLOAD_SIZE_BYTES * 4) {
        throw new Error(OVERSIZED_FILE_ERROR_MESSAGE);
      }

      const prep = await prepareAndValidateUploadFile(params.file);
      if (!prep.isValid) {
        throw new Error(prep.error || OVERSIZED_FILE_ERROR_MESSAGE);
      }

      finalFile = prep.file;
      originalSizeBytes = prep.originalSizeBytes;
      finalSizeBytes = prep.compressedSizeBytes;
      wasCompressed = prep.wasCompressed;

      if (finalSizeBytes > MAX_UPLOAD_SIZE_BYTES) {
        throw new Error(OVERSIZED_FILE_ERROR_MESSAGE);
      }

      params.onProgress?.(25);
      contentHash = await computeFileSha256(finalFile);
      await storeLocalPdfBlob(contentHash, finalFile);
    } else {
      // Synthesize a valid compact PDF blob when user publishes structured text notes without attaching a file
      const syntheticPdfContent = `%PDF-1.4
1 0 obj
<< /Type /Catalog /Pages 2 0 R >>
endobj
2 0 obj
<< /Type /Pages /Kids [3 0 R] /Count 1 >>
endobj
3 0 obj
<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] >>
endobj
% Xeusar Shared Academic Resource
% Title: ${params.title.trim()}
% Course: ${params.courseCode.trim().toUpperCase()} - ${params.courseName.trim()}
% Program: ${params.programName} (Semester ${params.semesterNumber})
% Summary: ${params.description.trim()}
%%EOF
`;
      const blob = new Blob([syntheticPdfContent], { type: 'application/pdf' });
      const cleanCode = params.courseCode.trim().replace(/\s+/g, '_').toUpperCase();
      finalFile = new File([blob], `${cleanCode}_Study_Notes.pdf`, {
        type: 'application/pdf'
      });
      originalSizeBytes = finalFile.size;
      finalSizeBytes = finalFile.size;
      contentHash = await computeFileSha256(finalFile);
    }

    params.onProgress?.(40);

    // 2. Check SHA-256 Deduplication before consuming storage or uploading a duplicate copy
    const existingPhysical = await findExistingFileByHash(
      contentHash,
      params.supabaseClient,
      currentLocalNotes
    );

    let fileUrl = '';
    let storagePath = '';
    let deduplicated = false;
    let storageErrorMsg: string | undefined;

    if (existingPhysical && !existingPhysical.fileUrl.startsWith('https://xeusar.local/')) {
      // Reuse existing verified physical file! Zero new bytes consumed.
      fileUrl = existingPhysical.fileUrl;
      storagePath = existingPhysical.storagePath;
      deduplicated = true;
      params.onProgress?.(70);
    } else {
      // 3. Enforce 1 GB Total Physical Storage Quota before storing a new physical file
      const quota = getStorageQuotaSummary(currentLocalNotes);
      if (quota.usedBytes + finalSizeBytes > MAX_TOTAL_STORAGE_BYTES) {
        throw new Error(STORAGE_FULL_ERROR_MESSAGE);
      }

      // Reserve bytes in-flight so concurrent uploads cannot exceed the 1 GB quota
      inFlightByteReservations.set(reservationId, finalSizeBytes);

      const effectiveUploaderIdForStorage =
        params.uploaderId?.trim() || getOrCreateLocalUploaderId();
      const isUuidForStorage =
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
          effectiveUploaderIdForStorage
        );

      // Deduplicate concurrent identical file uploads in flight
      let uploadPromise = inFlightContentHashes.get(contentHash);
      if (!uploadPromise) {
        uploadPromise = (async () => {
          const extMatch = finalFile!.name.match(/\.[^.]+$/);
          const ext = extMatch ? extMatch[0].toLowerCase() : '.pdf';
          const hashStoragePath = isUuidForStorage
            ? `${effectiveUploaderIdForStorage}/${contentHash}${ext}`
            : `shared/${contentHash}${ext}`;
          const targetBucket =
            params.isRestricted || params.isPublic === false || params.isPublished === false
              ? 'study-materials-restricted'
              : 'study-materials';
          let resolvedUrl = '';
          let uploadedToRemoteBucket = false;

          if (
            params.supabaseClient &&
            params.isConnected &&
            isValidHttpUrl(params.supabaseUrl) &&
            finalFile
          ) {
            const { error: storageError } = await params.supabaseClient.storage
              .from(targetBucket)
              .upload(hashStoragePath, finalFile, {
                contentType: finalFile.type || 'application/pdf',
                upsert: false
              });

            // If file already exists in bucket (e.g. 409 Duplicate) or uploaded cleanly, resolve URL
            if (
              !storageError ||
              storageError.message?.toLowerCase().includes('already exists') ||
              storageError.message?.toLowerCase().includes('duplicate')
            ) {
              if (targetBucket === 'study-materials') {
                const { data: publicUrlData } = params.supabaseClient.storage
                  .from('study-materials')
                  .getPublicUrl(hashStoragePath);
                if (publicUrlData?.publicUrl) {
                  resolvedUrl = publicUrlData.publicUrl;
                }
              } else {
                resolvedUrl = '';
              }
              uploadedToRemoteBucket = true;
            } else {
              storageErrorMsg = `Supabase Storage bucket "${targetBucket}" error: ${storageError.message}`;
            }

            if (uploadedToRemoteBucket) {
              // Register in stored_files via SECURITY DEFINER RPC (safe across multiple users)
              try {
                const { error: sfRpcErr } = await params.supabaseClient.rpc('upsert_stored_file', {
                  p_content_hash: contentHash,
                  p_storage_bucket: targetBucket,
                  p_storage_path: hashStoragePath,
                  p_file_url: resolvedUrl,
                  p_original_filename: finalFile.name,
                  p_mime_type: finalFile.type || 'application/pdf',
                  p_size_bytes: finalSizeBytes,
                  p_is_public: targetBucket === 'study-materials'
                });
                if (sfRpcErr) {
                  await params.supabaseClient.from('stored_files').upsert(
                    [
                      {
                        content_hash: contentHash,
                        sha256_hash: contentHash,
                        storage_bucket: targetBucket,
                        storage_path: hashStoragePath,
                        file_url: resolvedUrl,
                        original_filename: finalFile.name,
                        mime_type: finalFile.type || 'application/pdf',
                        size_bytes: finalSizeBytes,
                        is_public: targetBucket === 'study-materials',
                        uploaded_by: isUuidForStorage ? effectiveUploaderIdForStorage : null,
                        created_by: isUuidForStorage ? effectiveUploaderIdForStorage : null
                      }
                    ],
                    { onConflict: 'content_hash', ignoreDuplicates: true }
                  );
                }
              } catch {
                // Ignore if stored_files table or RPC is not yet migrated
              }
            }
          }

          // If remote storage bucket is not yet created/public and user uploaded a file,
          // encode as Data URL (up to 3.5 MB) for local preview fallback
          if (!uploadedToRemoteBucket && finalFile && finalFile.size <= 3.5 * 1024 * 1024) {
            try {
              resolvedUrl = await blobToDataUrl(finalFile);
            } catch {
              resolvedUrl = `https://xeusar.local/storage/${hashStoragePath}`;
            }
          } else if (!uploadedToRemoteBucket) {
            resolvedUrl = `https://xeusar.local/storage/${hashStoragePath}`;
          }

          // Save to local physical file registry
          const registry = getPhysicalFileRegistry();
          registry[contentHash] = {
            contentHash,
            storagePath: hashStoragePath,
            fileUrl: resolvedUrl,
            mimeType: finalFile!.type || 'application/pdf',
            sizeBytes: finalSizeBytes,
            createdAt: new Date().toISOString()
          };
          savePhysicalFileRegistry(registry);

          return {
            fileUrl: resolvedUrl,
            storagePath: hashStoragePath,
            deduplicated: false
          };
        })();

        inFlightContentHashes.set(contentHash, uploadPromise);
      }

      try {
        const uploadedPhysical = await uploadPromise;
        fileUrl = uploadedPhysical.fileUrl;
        storagePath = uploadedPhysical.storagePath;
        deduplicated = uploadedPhysical.deduplicated;
      } finally {
        inFlightContentHashes.delete(contentHash);
      }

      params.onProgress?.(75);
    }

    // 4. Build unified multi-program associations (no duplicate resource records)
    const programIds = Array.from(
      new Set([
        params.programId,
        ...(params.additionalProgramIds || [])
      ].filter(Boolean))
    );

    const detectedPdfPages =
      params.file && finalFile ? await getUploadedPdfPageCount(finalFile) : null;

    const calculatedPages =
      detectedPdfPages ||
      Math.max(4, Math.round(finalSizeBytes / (160 * 1024)));

    const noteId =
      typeof crypto !== 'undefined' && crypto.randomUUID
        ? crypto.randomUUID()
        : `sn-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

    if (params.file && finalFile) {
      await storeUploadedFileAllKeys(finalFile, [
        contentHash,
        storagePath,
        fileUrl.startsWith('data:') ? undefined : fileUrl,
        `https://xeusar.local/storage/${storagePath}`,
        noteId,
        finalFile.name
      ]);
    }

    const resolvedSubject =
      params.subject ||
      deriveCourseCategoryFromUploaderProgram(
        params.programId || params.programName,
        params.courseName
      );
    const normalizedCourseName =
      params.courseName.trim() || params.programName.trim() || resolvedSubject;
    const normalizedCode =
      params.courseCode.trim()
        ? params.courseCode.trim().toUpperCase()
        : generateInternalCourseCode(normalizedCourseName, resolvedSubject, params.programName);

    const effectiveUploaderId =
      params.uploaderId?.trim() || getOrCreateLocalUploaderId();
    const isUuidUploaderId =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        effectiveUploaderId
      );

    const notePages: any[] = [
      {
        pageNumber: 1,
        sectionTitle: `${params.title.trim()} — Section 1 Overview`,
        content:
          params.description.trim() ||
          'Detailed study guide, high-yield definitions, and key exam concepts verified by student peer review.',
        keyFormulasOrPoints: [
          `Category: ${resolvedSubject}`,
          `Course: ${normalizedCourseName}`,
          `Program: ${params.programName} (Semester ${params.semesterNumber})`,
          `Instructor: ${params.professor.trim() || 'Faculty Department'}`,
          `Academic Term: ${params.academicYear} ${params.semester}`
        ],
        _xeusarMeta: {
          programId: params.programId,
          programIds,
          programName: params.programName,
          degreeTier: params.degreeTier,
          semesterNumber: params.semesterNumber,
          universityId: params.universityId,
          courseId: params.courseId,
          courseName: normalizedCourseName,
          contentHash,
          storagePath,
          uploaderId: effectiveUploaderId
        }
      },
      {
        pageNumber: 2,
        sectionTitle: `${normalizedCourseName} — Core Formulations & Derivations`,
        content:
          'In-depth notes, worked solutions, and practice exercises for semester reviews.\n\nShared across My Program and Study Library.',
        keyFormulasOrPoints: (params.tags.length > 0 ? params.tags : [resolvedSubject, normalizedCourseName]).slice(0, 4)
      }
    ];

    // 5. Persist authoritative record to Supabase study_notes and verify database persistence
    let syncedToSupabase = false;
    let dbSyncWarning: string | undefined;

    if (
      params.supabaseClient &&
      params.isConnected &&
      isValidHttpUrl(params.supabaseUrl)
    ) {
      const resolvedTargetBucket =
        params.isRestricted || params.isPublic === false || params.isPublished === false
          ? 'study-materials-restricted'
          : 'study-materials';

      // Ensure referenced university, program, and stored_files rows exist in Supabase before FK insert
      if (params.universityId) {
        await ensureUniversityExistsInSupabase(
          params.supabaseClient,
          params.universityId,
          isUuidUploaderId ? effectiveUploaderId : undefined
        );
      }
      if (params.programId) {
        await ensureProgramExistsInSupabase(
          params.supabaseClient,
          params.programId,
          isUuidUploaderId ? effectiveUploaderId : undefined
        );
      }
      if (contentHash) {
        try {
          await params.supabaseClient.rpc('upsert_stored_file', {
            p_content_hash: contentHash,
            p_storage_bucket: resolvedTargetBucket,
            p_storage_path: storagePath,
            p_file_url: resolvedTargetBucket === 'study-materials-restricted' ? '' : fileUrl,
            p_original_filename: finalFile ? finalFile.name : `${normalizedCourseName.replace(/\s+/g, '_')}.pdf`,
            p_mime_type: finalFile?.type || 'application/pdf',
            p_size_bytes: finalSizeBytes,
            p_is_public: resolvedTargetBucket === 'study-materials'
          });
        } catch {
          // Ignore if RPC fails
        }
      }

      const fullPayload: Record<string, any> = {
        id: noteId,
        title: params.title.trim(),
        description:
          params.description.trim() ||
          `Comprehensive ${params.materialType.replace(/_/g, ' ')} for ${normalizedCourseName} (${resolvedSubject}).`,
        course_code: normalizedCode,
        course_id: null,
        subject: resolvedSubject,
        note_type: params.materialType,
        resource_type: params.materialType,
        academic_year: String(params.academicYear),
        semester: params.semester,
        professor: params.professor.trim() || 'Course Instructor',
        file_url: resolvedTargetBucket === 'study-materials-restricted' ? '' : fileUrl,
        storage_bucket: resolvedTargetBucket,
        storage_path: storagePath,
        file_name: finalFile ? finalFile.name : `${normalizedCourseName.replace(/\s+/g, '_')}.pdf`,
        file_type: finalFile?.type || 'application/pdf',
        mime_type: finalFile?.type || 'application/pdf',
        file_size: finalSizeBytes,
        file_size_bytes: finalSizeBytes,
        page_count: calculatedPages,
        uploader_id: isUuidUploaderId ? effectiveUploaderId : null,
        author_id: isUuidUploaderId ? effectiveUploaderId : null,
        author_name: params.uploaderName.trim() || 'Anonymous Student',
        author_university:
          params.uploaderUniversity.trim() || 'Open Campus',
        university: params.uploaderUniversity.trim() || 'Open Campus',
        university_id: params.universityId || null,
        program_id: params.programId || null,
        content_hash: contentHash || null,
        file_sha256: contentHash || null,
        upvotes: 1,
        downloads: 0,
        is_public: params.isPublic !== false && !params.isRestricted,
        is_published: params.isPublished !== false,
        is_restricted: Boolean(params.isRestricted),
        tags:
          params.tags.length > 0
            ? params.tags
            : [resolvedSubject, normalizedCourseName, params.programName].filter(Boolean),
        pages: notePages
      };

      let { error: fullInsertErr } = await params.supabaseClient
        .from('study_notes')
        .insert([fullPayload]);

      // If any FK constraint still rejects optional reference IDs, retry with nullable FK columns cleared
      if (fullInsertErr && fullInsertErr.code === '23503') {
        const safeFkPayload: Record<string, any> = {
          ...fullPayload,
          university_id: null,
          program_id: null,
          course_id: null,
          content_hash: null
        };
        const retryFk = await params.supabaseClient
          .from('study_notes')
          .insert([safeFkPayload]);
        fullInsertErr = retryFk.error;
      }

      if (!fullInsertErr) {
        syncedToSupabase = true;
      } else {
        const classified = classifySupabaseError(fullInsertErr, 'study_notes');
        if (classified.category === 'missing_column') {
          const basePayload: Record<string, any> = {
            id: noteId,
            title: fullPayload.title,
            description: fullPayload.description,
            course_code: fullPayload.course_code,
            subject: fullPayload.subject,
            note_type: fullPayload.note_type,
            academic_year: fullPayload.academic_year,
            semester: fullPayload.semester,
            professor: fullPayload.professor,
            file_url: fullPayload.file_url,
            file_name: fullPayload.file_name,
            file_size_bytes: fullPayload.file_size_bytes,
            page_count: fullPayload.page_count,
            author_name: fullPayload.author_name,
            author_university: fullPayload.author_university,
            downloads: 0,
            upvotes: 1,
            tags: fullPayload.tags,
            pages: notePages
          };
          if (isUuidUploaderId) {
            basePayload.uploader_id = effectiveUploaderId;
            basePayload.author_id = effectiveUploaderId;
          }

          const { error: baseInsertErr } = await params.supabaseClient
            .from('study_notes')
            .insert([basePayload]);
          if (!baseInsertErr) {
            syncedToSupabase = true;
          } else {
            dbSyncWarning = classifySupabaseError(baseInsertErr, 'study_notes').userMessage;
          }
        } else {
          dbSyncWarning = classified.userMessage;
        }
      }

      if (syncedToSupabase && isUuidUploaderId) {
        params.supabaseClient
          .rpc('toggle_study_note_upvote', { p_note_id: noteId })
          .then(
            ({ error }) => {
              if (error) {
                params.supabaseClient!
                  .from('study_note_upvotes')
                  .upsert({ note_id: noteId, user_id: effectiveUploaderId }, { onConflict: 'note_id,user_id' })
                  .then(() => {}, () => {});
              }
            },
            () => {}
          );
      }
    } else {
      dbSyncWarning = 'Supabase connection is not active; saved to local browser storage only.';
    }

    if (storageErrorMsg && !dbSyncWarning) {
      dbSyncWarning = storageErrorMsg;
    } else if (storageErrorMsg && dbSyncWarning) {
      dbSyncWarning = `${dbSyncWarning} (${storageErrorMsg})`;
    }

    params.onProgress?.(100);

    const newNote: StudyNote = {
      id: noteId,
      title: params.title.trim(),
      description:
        params.description.trim() ||
        `Comprehensive ${params.materialType.replace(/_/g, ' ')} for ${normalizedCourseName} (${resolvedSubject}).`,
      courseCode: normalizedCode,
      courseName: normalizedCourseName,
      courseId: params.courseId,
      subject: resolvedSubject,
      materialType: params.materialType,
      academicYear: params.academicYear,
      semester: params.semester,
      semesterNumber: params.semesterNumber,
      semesterId: `sem-${params.semesterNumber}`,
      professor: params.professor.trim() || 'Course Instructor',
      fileUrl,
      fileName: finalFile ? finalFile.name : `${normalizedCourseName.replace(/\s+/g, '_')}.pdf`,
      fileSizeBytes: finalSizeBytes,
      originalSizeBytes,
      wasCompressed,
      deduplicated,
      contentHash,
      storagePath,
      idempotencyKey,
      pageCount: calculatedPages,
      uploaderId: effectiveUploaderId,
      uploaderName: params.uploaderName.trim() || 'Anonymous Student',
      uploaderUniversity:
        params.uploaderUniversity.trim() ||
        'National University of Sciences & Technology (NUST)',
      universityId: params.universityId,
      programId: params.programId,
      programIds,
      programName: params.programName,
      degreeTier: params.degreeTier,
      downloadsCount: 0,
      upvotesCount: 1,
      hasUpvoted: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      tags:
        params.tags.length > 0
          ? params.tags
          : [resolvedSubject, normalizedCourseName],
      pages: notePages,
      isUnsynced: !syncedToSupabase || Boolean(storageErrorMsg),
      syncError: dbSyncWarning
    };

    recordUploadedNoteOwnership(newNote.id, effectiveUploaderId);

    // Save into local cache for current browser session
    const latestNotes = getLocalNotes().filter(n => n.id !== newNote.id);
    latestNotes.unshift(newNote);
    setLocalNotes(latestNotes);

    return {
      note: newNote,
      wasCompressed,
      originalSizeBytes,
      finalSizeBytes,
      deduplicated,
      contentHash,
      syncedToSupabase: syncedToSupabase && !storageErrorMsg,
      syncWarning: dbSyncWarning
    };
  } finally {
    inFlightByteReservations.delete(reservationId);
    inFlightIdempotencyKeys.delete(idempotencyKey);
  }
}

// ============================================================================
// SHARED RESOURCE METADATA SYNCHRONIZATION (EDIT & REFERENCE-COUNTED DELETE)
// ============================================================================

export interface UpdateSharedResourceParams {
  noteId: string;
  title?: string;
  description?: string;
  courseCode?: string;
  courseName?: string;
  courseId?: string;
  subject?: string;
  materialType?: MaterialType;
  semesterNumber?: number;
  semester?: string;
  professor?: string;
  programId?: string;
  programIds?: string[];
  programName?: string;
  degreeTier?: DegreeTier;
  tags?: string[];
  supabaseClient?: SupabaseClient | null;
  currentUser?: StudentUser | null;
}

/**
 * Updates a shared resource's metadata in-place so changes immediately synchronize
 * across both My Program and Study Library without creating duplicates.
 * Enforces that only the original uploader is authorized to edit the resource.
 */
export async function updateSharedResource(
  params: UpdateSharedResourceParams
): Promise<StudyNote | null> {
  const notes = getLocalNotes();
  const idx = notes.findIndex(n => n.id === params.noteId);
  if (idx === -1) return null;

  const existing = notes[idx];
  if (params.currentUser !== undefined && !canUserDeleteNote(existing, params.currentUser)) {
    throw new Error('Permission denied: Only the student who uploaded this resource can edit it.');
  }

  const resolvedProgram = params.programId
    ? getProgramById(params.programId)
    : existing.programId
    ? getProgramById(existing.programId)
    : undefined;

  const nextProgramId = params.programId ?? existing.programId;
  const nextProgramIds = params.programIds
    ? Array.from(new Set([ ...(nextProgramId ? [nextProgramId] : []), ...params.programIds ]))
    : existing.programIds || (nextProgramId ? [nextProgramId] : []);

  const nextProgramName =
    params.programName ??
    resolvedProgram?.name ??
    existing.programName;
  const nextDegreeTier =
    params.degreeTier ??
    resolvedProgram?.degreeTier ??
    existing.degreeTier;
  const nextSemesterNumber =
    params.semesterNumber !== undefined
      ? params.semesterNumber
      : existing.semesterNumber;
  const nextCourseId = params.courseId !== undefined ? params.courseId : existing.courseId;
  const nextCourseName =
    params.courseName !== undefined ? params.courseName.trim() : existing.courseName;

  const updated: StudyNote = {
    ...existing,
    title: params.title !== undefined ? params.title.trim() : existing.title,
    description:
      params.description !== undefined
        ? params.description.trim()
        : existing.description,
    courseCode:
      params.courseCode !== undefined
        ? params.courseCode.trim().toUpperCase()
        : existing.courseCode,
    courseName: nextCourseName,
    courseId: nextCourseId,
    subject: params.subject !== undefined ? params.subject : existing.subject,
    materialType:
      params.materialType !== undefined
        ? params.materialType
        : existing.materialType,
    semesterNumber: nextSemesterNumber,
    semesterId:
      params.semesterNumber !== undefined
        ? `sem-${params.semesterNumber}`
        : existing.semesterId,
    semester: params.semester !== undefined ? params.semester : existing.semester,
    professor:
      params.professor !== undefined ? params.professor.trim() : existing.professor,
    programId: nextProgramId,
    programIds: nextProgramIds,
    programName: nextProgramName,
    degreeTier: nextDegreeTier,
    tags: params.tags !== undefined ? params.tags : existing.tags,
    updatedAt: new Date().toISOString()
  };

  if (params.supabaseClient) {
    if (updated.programId) {
      await ensureProgramExistsInSupabase(
        params.supabaseClient,
        updated.programId,
        params.currentUser?.id
      );
    }

    const { error: extUpdateErr } = await params.supabaseClient
      .from('study_notes')
      .update({
        title: updated.title,
        description: updated.description,
        course_code: updated.courseCode,
        course_id: null,
        subject: updated.subject,
        note_type: updated.materialType,
        resource_type: updated.materialType,
        semester: updated.semester,
        professor: updated.professor,
        program_id: updated.programId || null,
        tags: updated.tags,
        pages: updated.pages
      })
      .eq('id', updated.id);

    if (extUpdateErr) {
      const classified = classifySupabaseError(extUpdateErr, 'study_notes');
      if (classified.category === 'permission_denied') {
        throw new Error(classified.userMessage);
      }
      if (classified.category === 'missing_column') {
        await params.supabaseClient
          .from('study_notes')
          .update({
            title: updated.title,
            description: updated.description,
            course_code: updated.courseCode,
            subject: updated.subject,
            note_type: updated.materialType,
            semester: updated.semester,
            professor: updated.professor,
            tags: updated.tags,
            pages: updated.pages
          })
          .eq('id', updated.id);
      }
    } else {
      updated.isUnsynced = false;
      updated.syncError = undefined;
    }
  }

  notes[idx] = updated;
  setLocalNotes(notes);

  return updated;
}

/**
 * Deletes a shared resource from both My Program and Study Library.
 * Enforces that ONLY the user who uploaded the resource can delete it.
 * Reference-counted physical storage cleanup:
 * Only deletes the physical file from storage when ZERO remaining resources
 * reference the same contentHash / storagePath / fileUrl.
 */
export async function deleteSharedResource(
  noteId: string,
  supabaseClient?: SupabaseClient | null,
  currentUser?: StudentUser | null
): Promise<{
  deletedNoteId: string;
  physicalFileDeleted: boolean;
  remainingReferencesCount: number;
}> {
  const notes = getLocalNotes();
  const target = notes.find(n => n.id === noteId);

  if (target && !canUserDeleteNote(target, currentUser)) {
    throw new Error('Permission denied: Only the student who uploaded this resource can delete it.');
  }

  if (supabaseClient) {
    let query = supabaseClient.from('study_notes').delete().eq('id', noteId);
    if (
      currentUser?.id &&
      target?.uploaderId &&
      target.uploaderId === currentUser.id &&
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(currentUser.id)
    ) {
      query = query.eq('uploader_id', currentUser.id);
    }
    const { error: deleteErr } = await query;
    if (deleteErr) {
      const classified = classifySupabaseError(deleteErr, 'study_notes');
      if (classified.category === 'permission_denied') {
        throw new Error(classified.userMessage);
      }
    }
  }

  recordDeletedNoteId(noteId);

  const remainingNotes = notes.filter(n => n.id !== noteId);
  setLocalNotes(remainingNotes);

  if (!target) {
    return {
      deletedNoteId: noteId,
      physicalFileDeleted: false,
      remainingReferencesCount: 0
    };
  }

  // Count how many remaining resources still reference this physical file
  const remainingRefs = remainingNotes.filter(n => {
    if (target.contentHash && n.contentHash === target.contentHash) return true;
    if (target.storagePath && n.storagePath === target.storagePath) return true;
    if (target.fileUrl && n.fileUrl === target.fileUrl) return true;
    return false;
  });

  let physicalFileDeleted = false;

  if (remainingRefs.length === 0) {
    // Safe to remove physical file from registry and Supabase Storage
    if (target.contentHash) {
      const registry = getPhysicalFileRegistry();
      delete registry[target.contentHash];
      savePhysicalFileRegistry(registry);
    }

    if (supabaseClient && target.storagePath) {
      try {
        await supabaseClient.storage
          .from('study-materials')
          .remove([target.storagePath]);
      } catch {}
    }

    if (supabaseClient && target.contentHash) {
      try {
        await supabaseClient
          .from('stored_files')
          .delete()
          .eq('content_hash', target.contentHash);
      } catch {}
    }

    physicalFileDeleted = true;
  }

  return {
    deletedNoteId: noteId,
    physicalFileDeleted,
    remainingReferencesCount: remainingRefs.length
  };
}

/**
 * Helper to get all available programs for Study Library and UploadView selectors.
 */
export function getAvailableProgramsForFilter(): { id: string; name: string; shortCode: string; degreeTier: DegreeTier }[] {
  return getAllPrograms().map(p => ({
    id: p.id,
    name: p.name,
    shortCode: p.shortCode,
    degreeTier: p.degreeTier
  }));
}
