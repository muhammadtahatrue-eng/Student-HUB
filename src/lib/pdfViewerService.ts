import * as pdfjsLib from 'pdfjs-dist';
// @ts-ignore - Vite ?url import for PDF.js worker
import pdfWorkerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import { StudyNote, StudyNotePage } from '../types/index.ts';
import { getSupabaseInstance } from './supabaseClient.ts';

// Configure PDF.js worker once
if (typeof window !== 'undefined' && pdfWorkerUrl) {
  pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;
}

export { pdfjsLib };

const IDB_NAME = 'xeusar_pdf_storage_v1';
const IDB_STORE = 'pdf_blobs';

// In-memory cache for immediate access during the current session
const memoryBlobCache = new Map<string, Blob>();

function openPdfIdb(): Promise<IDBDatabase | null> {
  if (typeof indexedDB === 'undefined') return Promise.resolve(null);
  return new Promise(resolve => {
    try {
      const req = indexedDB.open(IDB_NAME, 1);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains(IDB_STORE)) {
          db.createObjectStore(IDB_STORE);
        }
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
}

/**
 * Stores an uploaded physical file Blob locally (in memory + IndexedDB)
 * so that the PDF Viewer can always render the exact uploaded file.
 */
export async function storeLocalPdfBlob(key: string, blob: Blob): Promise<void> {
  if (!key || !blob) return;
  memoryBlobCache.set(key, blob);
  try {
    const db = await openPdfIdb();
    if (!db) return;
    await new Promise<void>(resolve => {
      const tx = db.transaction(IDB_STORE, 'readwrite');
      tx.objectStore(IDB_STORE).put(blob, key);
      tx.oncomplete = () => resolve();
      tx.onerror = () => resolve();
    });
  } catch {
    // Ignore IDB quota errors
  }
}

/**
 * Stores an uploaded file under all associated keys (hash, storagePath, fileUrl, noteId, fileName)
 * so it can be retrieved even if only base columns were persisted in Supabase.
 */
export async function storeUploadedFileAllKeys(
  blob: Blob,
  keys: (string | undefined | null)[]
): Promise<void> {
  const uniqueKeys = Array.from(new Set(keys.filter((k): k is string => Boolean(k && k.trim()))));
  for (const key of uniqueKeys) {
    await storeLocalPdfBlob(key, blob);
  }
}

export async function getLocalPdfBlob(key: string): Promise<Blob | null> {
  if (!key) return null;
  if (memoryBlobCache.has(key)) {
    return memoryBlobCache.get(key) || null;
  }
  try {
    const db = await openPdfIdb();
    if (!db) return null;
    return await new Promise<Blob | null>(resolve => {
      const tx = db.transaction(IDB_STORE, 'readonly');
      const req = tx.objectStore(IDB_STORE).get(key);
      req.onsuccess = () => {
        const result = req.result instanceof Blob ? req.result : null;
        if (result) {
          memoryBlobCache.set(key, result);
        }
        resolve(result);
      };
      req.onerror = () => resolve(null);
    });
  } catch {
    return null;
  }
}

export function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      if (typeof reader.result === 'string') {
        resolve(reader.result);
      } else {
        reject(new Error('Failed to encode blob as Data URL'));
      }
    };
    reader.onerror = () => reject(reader.error || new Error('FileReader error'));
    reader.readAsDataURL(blob);
  });
}

export function dataUrlToBlob(dataUrl: string): Blob | null {
  try {
    const commaIdx = dataUrl.indexOf(',');
    if (commaIdx === -1) return null;
    const meta = dataUrl.slice(0, commaIdx);
    const base64 = dataUrl.slice(commaIdx + 1);
    const mimeMatch = meta.match(/^data:([^;]+)/i);
    const mime = mimeMatch ? mimeMatch[1] : 'application/pdf';
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return new Blob([bytes], { type: mime });
  } catch {
    return null;
  }
}

/**
 * Inspects an uploaded PDF file with PDF.js to determine its real page count.
 */
export async function getUploadedPdfPageCount(blob: Blob): Promise<number | null> {
  try {
    const buffer = await blob.arrayBuffer();
    const loadingTask = pdfjsLib.getDocument({ data: new Uint8Array(buffer) });
    const pdfDoc = await loadingTask.promise;
    const numPages = pdfDoc.numPages;
    if (typeof (pdfDoc as any).destroy === 'function') {
      await (pdfDoc as any).destroy();
    }
    return numPages > 0 ? numPages : null;
  } catch {
    return null;
  }
}

/**
 * Escapes characters for PDF literal strings: \, (, ), and non-ASCII characters.
 */
function escapePdfText(input: string): string {
  return (input || '')
    .replace(/[^\x20-\x7E]/g, ch => {
      if (ch === '•' || ch === '·') return '-';
      if (ch === '—' || ch === '–') return '-';
      if (ch === '“' || ch === '”') return '"';
      if (ch === '‘' || ch === '’') return "'";
      if (ch === '→' || ch === '›') return '->';
      return ' ';
    })
    .replace(/\\/g, '\\\\')
    .replace(/\(/g, '\\(')
    .replace(/\)/g, '\\)');
}

/**
 * Word-wraps a paragraph into lines of at most `maxChars` characters.
 */
function wrapTextLines(text: string, maxChars: number): string[] {
  const paragraphs = (text || '').split(/\r?\n/);
  const lines: string[] = [];

  for (const para of paragraphs) {
    const trimmed = para.trim();
    if (!trimmed) {
      lines.push('');
      continue;
    }
    const words = trimmed.split(/\s+/);
    let currentLine = '';
    for (const word of words) {
      if (!currentLine) {
        currentLine = word;
      } else if (currentLine.length + 1 + word.length <= maxChars) {
        currentLine += ' ' + word;
      } else {
        lines.push(currentLine);
        currentLine = word;
      }
    }
    if (currentLine) {
      lines.push(currentLine);
    }
  }
  return lines;
}

/**
 * Builds normalized pages for a StudyNote so every posted document has rich,
 * structured multi-page content ready for both the native PDF generator and interactive viewer.
 */
export function getNormalizedNotePages(note: StudyNote): StudyNotePage[] {
  if (Array.isArray(note.pages) && note.pages.length > 0) {
    return note.pages;
  }
  const courseLabel = note.courseName || note.programName || note.subject;
  return [
    {
      pageNumber: 1,
      sectionTitle: `${note.title} — Overview & Core Concepts`,
      content:
        note.description ||
        `Comprehensive academic study material for ${courseLabel} (${note.subject}).`,
      keyFormulasOrPoints:
        note.tags && note.tags.length > 0
          ? note.tags
          : [
              `Course: ${courseLabel}`,
              `Discipline: ${note.subject}`,
              `Instructor: ${note.professor}`
            ]
    }
  ];
}

/**
 * Generates a 100% spec-compliant, multi-page PDF 1.4 binary Blob for any StudyNote.
 * Every object offset in the xref table is calculated to the exact byte so PDF.js,
 * Chrome's PDFium, and desktop PDF readers render all pages cleanly.
 */
export function generateValidPdfDocumentBlob(note: StudyNote): Blob {
  const pages = getNormalizedNotePages(note);
  const pageCount = Math.max(1, pages.length);

  const objects: { id: number; body: string }[] = [];

  const pageObjectIds: number[] = [];
  for (let i = 0; i < pageCount; i++) {
    pageObjectIds.push(6 + i * 2);
  }

  objects.push({
    id: 1,
    body: `<< /Type /Catalog /Pages 2 0 R >>`
  });

  objects.push({
    id: 2,
    body: `<< /Type /Pages /Kids [${pageObjectIds.map(id => `${id} 0 R`).join(' ')}] /Count ${pageCount} >>`
  });

  objects.push({
    id: 3,
    body: `<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>`
  });

  objects.push({
    id: 4,
    body: `<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>`
  });

  objects.push({
    id: 5,
    body: `<< /Type /Font /Subtype /Type1 /BaseFont /Courier /Encoding /WinAnsiEncoding >>`
  });

  for (let i = 0; i < pageCount; i++) {
    const pageData = pages[i];
    const pageObjId = 6 + i * 2;
    const contentObjId = 7 + i * 2;

    const ops: string[] = [];

    // White paper background
    ops.push('1 1 1 rg');
    ops.push('0 0 612 792 re f');

    // Top header bar background
    ops.push('0.05 0.08 0.14 rg');
    ops.push('42 715 528 42 re f');

    // Cyan accent rule under header
    ops.push('0.0 0.78 0.92 RG');
    ops.push('1.5 w');
    ops.push('42 715 m 570 715 l S');

    // Header text inside dark banner
    const headerCourseTitle = note.courseName || note.programName || note.subject;
    ops.push('BT');
    ops.push('/F2 10 Tf');
    ops.push('0.0 0.90 1.0 rg');
    ops.push(`52 741 Td (${escapePdfText(`${note.subject} - ${headerCourseTitle}`)}) Tj`);
    ops.push('ET');

    ops.push('BT');
    ops.push('/F1 8.5 Tf');
    ops.push('0.82 0.86 0.92 rg');
    ops.push(
      `52 726 Td (${escapePdfText(
        `Prof. ${note.professor}  |  ${note.programName || note.subject}  |  ${note.academicYear} ${note.semester}`
      )}) Tj`
    );
    ops.push('ET');

    // Document Title on Page 1
    let cursorY = 688;
    if (i === 0) {
      const titleLines = wrapTextLines(note.title, 62);
      for (const tLine of titleLines.slice(0, 2)) {
        ops.push('BT');
        ops.push('/F2 16 Tf');
        ops.push('0.08 0.10 0.15 rg');
        ops.push(`42 ${cursorY} Td (${escapePdfText(tLine)}) Tj`);
        ops.push('ET');
        cursorY -= 21;
      }

      ops.push('BT');
      ops.push('/F3 8.5 Tf');
      ops.push('0.35 0.42 0.52 rg');
      ops.push(
        `42 ${cursorY + 3} Td (${escapePdfText(
          `Shared by ${note.uploaderName} (${note.uploaderUniversity})  |  Page ${i + 1} of ${pageCount}`
        )}) Tj`
      );
      ops.push('ET');
      cursorY -= 18;

      // Divider line
      ops.push('0.82 0.85 0.90 RG');
      ops.push('0.75 w');
      ops.push(`42 ${cursorY} m 570 ${cursorY} l S`);
      cursorY -= 22;
    }

    // Section Label & Heading
    ops.push('BT');
    ops.push('/F3 9 Tf');
    ops.push('0.0 0.52 0.68 rg');
    ops.push(`42 ${cursorY} Td (${escapePdfText(`STUDY SECTION ${i + 1}`)}) Tj`);
    ops.push('ET');
    cursorY -= 16;

    const secLines = wrapTextLines(pageData.sectionTitle || note.title, 68);
    for (const sLine of secLines.slice(0, 2)) {
      ops.push('BT');
      ops.push('/F2 13 Tf');
      ops.push('0.10 0.12 0.18 rg');
      ops.push(`42 ${cursorY} Td (${escapePdfText(sLine)}) Tj`);
      ops.push('ET');
      cursorY -= 18;
    }
    cursorY -= 6;

    // Body Content Lines
    const bodyLines = wrapTextLines(pageData.content || note.description, 82);
    for (const line of bodyLines) {
      if (cursorY < 185) break;
      if (!line) {
        cursorY -= 8;
        continue;
      }
      ops.push('BT');
      ops.push('/F1 10.5 Tf');
      ops.push('0.16 0.19 0.25 rg');
      ops.push(`42 ${cursorY} Td (${escapePdfText(line)}) Tj`);
      ops.push('ET');
      cursorY -= 15;
    }

    // Key Formulas & Derivation Points Box
    const points = pageData.keyFormulasOrPoints || [];
    if (points.length > 0 && cursorY > 110) {
      cursorY -= 10;
      const maxPoints = Math.min(points.length, 5);
      const boxHeight = 28 + maxPoints * 15;
      const boxBottomY = Math.max(68, cursorY - boxHeight);

      ops.push('0.95 0.98 1.0 rg');
      ops.push(`42 ${boxBottomY} 528 ${boxHeight} re f`);

      ops.push('0.0 0.68 0.86 RG');
      ops.push('2 w');
      ops.push(`42 ${boxBottomY} m 42 ${boxBottomY + boxHeight} l S`);

      let ptY = boxBottomY + boxHeight - 16;
      ops.push('BT');
      ops.push('/F2 9.5 Tf');
      ops.push('0.0 0.45 0.62 rg');
      ops.push(`54 ${ptY} Td (KEY FORMULAS & DERIVATION POINTS) Tj`);
      ops.push('ET');
      ptY -= 15;

      for (let pIdx = 0; pIdx < maxPoints; pIdx++) {
        const ptText = wrapTextLines(`- ${points[pIdx]}`, 76)[0] || '';
        ops.push('BT');
        ops.push('/F3 9 Tf');
        ops.push('0.15 0.20 0.28 rg');
        ops.push(`54 ${ptY} Td (${escapePdfText(ptText)}) Tj`);
        ops.push('ET');
        ptY -= 14;
      }
    }

    // Footer line & metadata
    ops.push('0.85 0.87 0.90 RG');
    ops.push('0.5 w');
    ops.push('42 48 m 570 48 l S');

    ops.push('BT');
    ops.push('/F3 8 Tf');
    ops.push('0.45 0.48 0.55 rg');
    ops.push(
      `42 34 Td (${escapePdfText(
        `Xeusar Verified Academic Document  |  ${note.fileName || `${note.courseCode}.pdf`}`
      )}) Tj`
    );
    ops.push('ET');

    ops.push('BT');
    ops.push('/F2 8.5 Tf');
    ops.push('0.25 0.30 0.38 rg');
    ops.push(`505 34 Td (${escapePdfText(`Page ${i + 1} of ${pageCount}`)}) Tj`);
    ops.push('ET');

    const streamContent = ops.join('\n');
    const streamByteLength = new TextEncoder().encode(streamContent).length;

    objects.push({
      id: pageObjId,
      body: `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 3 0 R /F2 4 0 R /F3 5 0 R >> >> /Contents ${contentObjId} 0 R >>`
    });

    objects.push({
      id: contentObjId,
      body: `<< /Length ${streamByteLength} >>\nstream\n${streamContent}\nendstream`
    });
  }

  objects.sort((a, b) => a.id - b.id);

  const encoder = new TextEncoder();
  const chunks: Uint8Array[] = [];
  const offsets: number[] = [0];
  let currentByteOffset = 0;

  const pushStr = (str: string) => {
    const bytes = encoder.encode(str);
    chunks.push(bytes);
    currentByteOffset += bytes.length;
  };

  pushStr('%PDF-1.4\n%\xE2\xE3\xCF\xD3\n');

  for (const obj of objects) {
    offsets[obj.id] = currentByteOffset;
    pushStr(`${obj.id} 0 obj\n${obj.body}\nendobj\n`);
  }

  const xrefStartOffset = currentByteOffset;
  const totalObjCount = objects.length + 1;

  pushStr(`xref\n0 ${totalObjCount}\n`);
  pushStr(`0000000000 65535 f \n`);
  for (let id = 1; id < totalObjCount; id++) {
    const padded = String(offsets[id] || 0).padStart(10, '0');
    pushStr(`${padded} 00000 n \n`);
  }

  pushStr(
    `trailer\n<< /Size ${totalObjCount} /Root 1 0 R >>\nstartxref\n${xrefStartOffset}\n%%EOF\n`
  );

  return new Blob(chunks as BlobPart[], { type: 'application/pdf' });
}

/**
 * Extracts potential storage paths or SHA-256 hashes embedded in `note.fileUrl`.
 */
function extractStorageKeysFromUrl(fileUrl?: string): string[] {
  if (!fileUrl || fileUrl.startsWith('data:')) return [];
  const keys: string[] = [fileUrl];
  const sharedMatch = fileUrl.match(/shared\/([a-f0-9]{16,64})(\.[a-z0-9]+)?/i);
  if (sharedMatch) {
    keys.push(sharedMatch[0]); // e.g., shared/<hash>.pdf
    keys.push(sharedMatch[1]); // e.g., <hash>
  }
  return keys;
}

/**
 * Resolves a valid, viewable PDF Blob and Object URL for ANY posted StudyNote.
 * 1. Checks if `note.fileUrl` is an inline base64 Data URL (`data:application/pdf...`).
 * 2. Checks local IndexedDB / memory cache by contentHash, URL hash, storagePath, note.id, and fileName.
 * 3. Fetches from Supabase Storage (public URL or authenticated `.download()`) if available.
 * 4. Synthesizes a spec-compliant multi-page PDF 1.4 binary from the note's pages & metadata.
 */
export async function resolveViewablePdfForNote(note: StudyNote): Promise<{
  blobUrl: string;
  blob: Blob;
  mimeType: string;
  isUploadedFile: boolean;
}> {
  // 1. Check inline Data URL in note.fileUrl
  if (note.fileUrl && note.fileUrl.startsWith('data:')) {
    const decoded = dataUrlToBlob(note.fileUrl);
    if (decoded && decoded.size > 0) {
      await storeUploadedFileAllKeys(decoded, [note.contentHash, note.id, note.fileName]);
      return {
        blobUrl: URL.createObjectURL(decoded),
        blob: decoded,
        mimeType: decoded.type || 'application/pdf',
        isUploadedFile: true
      };
    }
  }

  // 2. Check local IndexedDB / memory cache across all possible keys
  const urlKeys = extractStorageKeysFromUrl(note.fileUrl);
  const candidateKeys = Array.from(
    new Set(
      [
        note.contentHash,
        note.storagePath,
        note.id,
        note.fileUrl,
        note.fileName,
        ...urlKeys
      ].filter((k): k is string => Boolean(k && k.trim()))
    )
  );

  for (const key of candidateKeys) {
    const cachedBlob = await getLocalPdfBlob(key);
    if (cachedBlob && cachedBlob.size > 0) {
      const mimeType = cachedBlob.type || 'application/pdf';
      return {
        blobUrl: URL.createObjectURL(cachedBlob),
        blob: cachedBlob,
        mimeType,
        isUploadedFile: true
      };
    }
  }

  // 3. Try Supabase Storage SDK download if we have a storage path (`shared/...`)
  const storagePathCandidate =
    note.storagePath ||
    urlKeys.find(k => k.startsWith('shared/'));

  if (storagePathCandidate) {
    try {
      const supabase = getSupabaseInstance();
      if (supabase) {
        const { data: downloadedBlob, error } = await supabase.storage
          .from('study-materials')
          .download(storagePathCandidate);
        if (!error && downloadedBlob && downloadedBlob.size > 0) {
          await storeUploadedFileAllKeys(downloadedBlob, candidateKeys);
          return {
            blobUrl: URL.createObjectURL(downloadedBlob),
            blob: downloadedBlob,
            mimeType: downloadedBlob.type || 'application/pdf',
            isUploadedFile: true
          };
        }
      }
    } catch {
      // Fall through to HTTP fetch
    }
  }

  // 4. Check if note.fileUrl is a reachable HTTP(S) URL
  if (
    note.fileUrl &&
    /^https?:\/\//i.test(note.fileUrl) &&
    !note.fileUrl.includes('xeusar.local') &&
    !note.fileUrl.includes('example.com')
  ) {
    try {
      const resp = await fetch(note.fileUrl);
      if (resp.ok) {
        const fetchedBlob = await resp.blob();
        if (fetchedBlob.size > 0) {
          const mimeType = fetchedBlob.type || 'application/pdf';
          const pdfBlob =
            mimeType === 'application/pdf' || mimeType.startsWith('image/')
              ? fetchedBlob
              : new Blob([fetchedBlob], { type: 'application/pdf' });
          await storeUploadedFileAllKeys(pdfBlob, candidateKeys);
          return {
            blobUrl: URL.createObjectURL(pdfBlob),
            blob: pdfBlob,
            mimeType: pdfBlob.type,
            isUploadedFile: true
          };
        }
      }
    } catch {
      // Fall back to generated PDF document below
    }
  }

  // 5. Generate a spec-compliant multi-page PDF 1.4 document from the note's content
  const generatedBlob = generateValidPdfDocumentBlob(note);
  return {
    blobUrl: URL.createObjectURL(generatedBlob),
    blob: generatedBlob,
    mimeType: 'application/pdf',
    isUploadedFile: false
  };
}
