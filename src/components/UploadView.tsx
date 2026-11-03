import React, { useState, useRef, useMemo } from 'react';
import {
  Upload,
  FileText,
  CheckCircle2,
  AlertCircle,
  ArrowLeft,
  HardDrive,
  Layers
} from 'lucide-react';
import { StudyNote, MaterialType, SupabaseConfig, StudentUser, DegreeTier } from '../types/index.ts';
import { SUBJECT_OPTIONS, MATERIAL_TYPE_LABELS } from '../data/seedData.ts';
import { getSupabaseInstance } from '../lib/supabaseClient.ts';
import { HecUniversitySelect } from './university/HecUniversitySelect.tsx';
import { ProgramSelect } from './program/ProgramSelect.tsx';
import { getProgramById, getAllPrograms } from '../lib/programStore.ts';
import {
  MAX_UPLOAD_SIZE_BYTES,
  OVERSIZED_FILE_ERROR_MESSAGE,
  prepareAndValidateUploadFile,
  uploadSharedResource,
  getStorageQuotaSummary,
  formatBytesReadable,
  getProgramCoursesList,
  deriveCourseCategoryFromUploaderProgram,
  generateInternalCourseCode
} from '../lib/resourceService.ts';
import {
  UPLOAD_COPYRIGHT_NOTICE,
  XEUSAR_CONTACT_EMAIL,
  COPYRIGHT_REPORT_MAILTO
} from '../data/legalAndInfoData.ts';

interface UploadViewProps {
  onBack: () => void;
  onSuccess: (newNote: StudyNote) => void;
  supabaseConfig: SupabaseConfig;
  user: StudentUser | null;
  onOpenSupabaseModal: () => void;
  initialUniversity?: string;
  initialCourseCode?: string;
  initialProgramId?: string;
  initialSemesterNumber?: number;
}

export const UploadView: React.FC<UploadViewProps> = ({
  onBack,
  onSuccess,
  supabaseConfig,
  user,
  initialUniversity,
  initialCourseCode,
  initialProgramId,
  initialSemesterNumber
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [originalFileSize, setOriginalFileSize] = useState<number>(0);
  const [wasCompressed, setWasCompressed] = useState<boolean>(false);
  const [isCompressingFile, setIsCompressingFile] = useState<boolean>(false);
  const [dragActive, setDragActive] = useState(false);

  const initialTargetProgramId = initialProgramId || user?.programId || 'bs-ee';
  const initialMatchedProgram = getProgramById(initialTargetProgramId);

  // Form Fields
  const [title, setTitle] = useState('');
  const [courseCode, setCourseCode] = useState(initialCourseCode || '');
  const [courseName, setCourseName] = useState('');
  const [selectedCourseId, setSelectedCourseId] = useState<string>('');
  const [subject, setSubject] = useState(() =>
    deriveCourseCategoryFromUploaderProgram(
      initialMatchedProgram || user?.program || initialTargetProgramId
    )
  );
  const [materialType, setMaterialType] = useState<MaterialType>('lecture_notes');
  const [academicYear, setAcademicYear] = useState(2025);
  const [semester, setSemester] = useState('Fall Semester');
  const [professor, setProfessor] = useState('');
  const [description, setDescription] = useState('');
  const [tagsInput, setTagsInput] = useState('');
  const [uploaderName, setUploaderName] = useState(user?.name || '');
  const [uploaderUniversity, setUploaderUniversity] = useState(
    initialUniversity || user?.university || 'National University of Sciences & Technology (NUST)'
  );
  const [uploaderUniversityId, setUploaderUniversityId] = useState<string | undefined>(
    user?.universityId || 'nust'
  );
  const [uploaderProgramId, setUploaderProgramId] = useState<string>(initialTargetProgramId);
  const [additionalProgramIds, setAdditionalProgramIds] = useState<string[]>([]);
  const [uploaderProgramName, setUploaderProgramName] = useState<string>(
    initialMatchedProgram?.name || user?.program || 'BS Electrical Engineering'
  );
  const [uploaderDegreeTier, setUploaderDegreeTier] = useState<DegreeTier>(
    initialMatchedProgram?.degreeTier || user?.degreeTier || 'Undergraduate'
  );
  const [semesterNumber, setSemesterNumber] = useState<number>(() => {
    if (typeof initialSemesterNumber === 'number' && initialSemesterNumber >= 1) {
      return initialSemesterNumber;
    }
    if (typeof user?.currentSemester === 'number') return user.currentSemester;
    const parsed = parseInt(String(user?.currentSemester || '').replace(/\D/g, ''), 10);
    return isNaN(parsed) ? 1 : parsed;
  });

  // Available curriculum courses for the selected program
  const programCourses = useMemo(
    () => getProgramCoursesList(uploaderProgramId),
    [uploaderProgramId]
  );

  const allProgramsList = useMemo(() => getAllPrograms(), []);
  const storageQuota = useMemo(() => getStorageQuotaSummary(), [file]);

  // Sync profile & course category automatically in accordance with the uploader's course/program
  React.useEffect(() => {
    if (user?.name) {
      setUploaderName(user.name);
    }
    if (initialUniversity) {
      setUploaderUniversity(initialUniversity);
    } else if (user?.university) {
      setUploaderUniversity(user.university);
      setUploaderUniversityId(user.universityId);
    }
    if (initialCourseCode) {
      const matchedCourse = programCourses.find(
        c =>
          c.code.replace(/[\s-_]+/g, '').toUpperCase() ===
            initialCourseCode.replace(/[\s-_]+/g, '').toUpperCase() ||
          c.name.trim().toLowerCase() === initialCourseCode.trim().toLowerCase()
      );
      if (matchedCourse) {
        setSelectedCourseId(matchedCourse.id);
        setCourseCode(matchedCourse.code);
        setCourseName(matchedCourse.name);
        setSemesterNumber(matchedCourse.semesterNumber);
        if (matchedCourse.instructor && !professor) {
          setProfessor(matchedCourse.instructor);
        }
      } else {
        setCourseName(initialCourseCode);
      }
    }
    if (initialProgramId) {
      setUploaderProgramId(initialProgramId);
      const prog = getProgramById(initialProgramId);
      if (prog) {
        setUploaderProgramName(prog.name);
        setUploaderDegreeTier(prog.degreeTier);
        setSubject(deriveCourseCategoryFromUploaderProgram(prog));
      }
    } else if (user?.programId || user?.program) {
      if (user.programId) setUploaderProgramId(user.programId);
      if (user.program) setUploaderProgramName(user.program);
      if (user.degreeTier) setUploaderDegreeTier(user.degreeTier);
      const prog = user.programId ? getProgramById(user.programId) : undefined;
      setSubject(deriveCourseCategoryFromUploaderProgram(prog || user.program));
      if (user.currentSemester && !initialSemesterNumber) {
        const s =
          typeof user.currentSemester === 'number'
            ? user.currentSemester
            : parseInt(String(user.currentSemester).replace(/\D/g, ''), 10);
        if (!isNaN(s)) setSemesterNumber(s);
      }
    }
    if (typeof initialSemesterNumber === 'number' && initialSemesterNumber >= 1) {
      setSemesterNumber(initialSemesterNumber);
    }
  }, [user, initialUniversity, initialCourseCode, initialProgramId, initialSemesterNumber, programCourses]);

  // State
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successNote, setSuccessNote] = useState<StudyNote | null>(null);
  const [hasConfirmedCopyrightRights, setHasConfirmedCopyrightRights] = useState(false);
  const [lastUploadMeta, setLastUploadMeta] = useState<{
    deduplicated: boolean;
    wasCompressed: boolean;
    savedBytes: number;
  } | null>(null);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const validateAndSetFile = async (selectedFile: File) => {
    const lowerName = selectedFile.name.toLowerCase();
    const isSupported =
      selectedFile.type === 'application/pdf' ||
      lowerName.endsWith('.pdf') ||
      selectedFile.type.startsWith('image/') ||
      /\.(png|jpe?g|webp|docx|pptx|xlsx|txt|md)$/i.test(lowerName);

    if (!isSupported) {
      setErrorMessage('Please select a valid PDF document (.pdf), image, or study file.');
      return;
    }

    setIsCompressingFile(true);
    setErrorMessage(null);

    try {
      const prep = await prepareAndValidateUploadFile(selectedFile);
      if (!prep.isValid || prep.compressedSizeBytes > MAX_UPLOAD_SIZE_BYTES) {
        setFile(null);
        setOriginalFileSize(selectedFile.size);
        setWasCompressed(false);
        setErrorMessage(prep.error || OVERSIZED_FILE_ERROR_MESSAGE);
        return;
      }

      setOriginalFileSize(prep.originalSizeBytes);
      setWasCompressed(prep.wasCompressed);
      setFile(prep.file);

      if (!title) {
        const cleanTitle = selectedFile.name
          .replace(/\.[^.]+$/i, '')
          .replace(/[-_]+/g, ' ')
          .trim();
        setTitle(cleanTitle);
      }
    } catch (err: any) {
      setFile(null);
      setErrorMessage(err?.message || OVERSIZED_FILE_ERROR_MESSAGE);
    } finally {
      setIsCompressingFile(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      validateAndSetFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      validateAndSetFile(e.target.files[0]);
    }
  };

  const handleSelectCurriculumCourse = (courseId: string) => {
    setSelectedCourseId(courseId);
    if (!courseId) return;
    const found = programCourses.find(c => c.id === courseId);
    if (found) {
      setCourseCode(found.code);
      setCourseName(found.name);
      setSemesterNumber(found.semesterNumber);
      if (found.instructor && !professor) {
        setProfessor(found.instructor);
      }
    }
  };

  const toggleAdditionalProgram = (progId: string) => {
    if (progId === uploaderProgramId) return;
    setAdditionalProgramIds(prev =>
      prev.includes(progId) ? prev.filter(id => id !== progId) : [...prev, progId]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isUploading || isCompressingFile) return;

    const effectiveCourseName = courseName.trim() || uploaderProgramName || subject;
    if (!title.trim() || !effectiveCourseName) {
      setErrorMessage('Document Title and Course are required.');
      return;
    }

    if (!hasConfirmedCopyrightRights) {
      setErrorMessage(
        'Please confirm that you have the necessary rights or permission to share this material before publishing.'
      );
      return;
    }

    if (file && file.size > MAX_UPLOAD_SIZE_BYTES) {
      setErrorMessage(OVERSIZED_FILE_ERROR_MESSAGE);
      return;
    }

    setIsUploading(true);
    setUploadProgress(15);
    setErrorMessage(null);

    try {
      const tags = tagsInput
        .split(',')
        .map(t => t.trim())
        .filter(Boolean);

      const parsedYear = Number(academicYear) || 2025;
      const supabase = getSupabaseInstance(supabaseConfig);
      const effectiveSubject =
        subject ||
        deriveCourseCategoryFromUploaderProgram(uploaderProgramId || uploaderProgramName, effectiveCourseName);
      const internalCode =
        courseCode.trim() ||
        generateInternalCourseCode(effectiveCourseName, effectiveSubject, uploaderProgramName);

      const result = await uploadSharedResource({
        file,
        title: title.trim(),
        description: description.trim(),
        courseCode: internalCode,
        courseName: effectiveCourseName,
        courseId: selectedCourseId || undefined,
        subject: effectiveSubject,
        materialType,
        academicYear: parsedYear,
        semester,
        semesterNumber,
        professor: professor.trim() || 'Course Instructor',
        tags,
        uploaderId: user?.id,
        uploaderName: uploaderName.trim() || user?.name || 'Anonymous Student',
        uploaderUniversity:
          uploaderUniversity.trim() || 'National University of Sciences & Technology (NUST)',
        universityId: uploaderUniversityId,
        programId: uploaderProgramId,
        additionalProgramIds,
        programName: uploaderProgramName,
        degreeTier: uploaderDegreeTier,
        supabaseClient: supabase,
        supabaseUrl: supabaseConfig.url,
        isConnected: supabaseConfig.isConnected,
        onProgress: pct => setUploadProgress(pct)
      });

      setLastUploadMeta({
        deduplicated: result.deduplicated,
        wasCompressed: result.wasCompressed || wasCompressed,
        savedBytes: Math.max(0, (originalFileSize || result.originalSizeBytes) - result.finalSizeBytes)
      });
      setSuccessNote(result.note);
      onSuccess(result.note);
    } catch (err: any) {
      setErrorMessage(err?.message || 'Failed to process note upload.');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto py-6 sm:py-10 font-outfit text-white relative z-10">
      {/* Back button */}
      <div className="mb-6 flex items-center justify-between">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-xs font-semibold text-white/60 hover:text-white transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Overview
        </button>

        {/* Storage Quota Indicator (1 GB Total Physical Storage Budget) */}
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/5 border border-white/10 text-[11px] font-jetbrains text-white/70">
          <HardDrive className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
          <span>
            Storage: <strong className="text-white">{formatBytesReadable(storageQuota.usedBytes)}</strong> / 1.00 GB ({storageQuota.usagePercent}%)
          </span>
        </div>
      </div>

      {/* Main Form Container */}
      <div className="glass-card p-6 sm:p-10 shadow-2xl">
        <div className="mb-6">
          <span className="text-xs uppercase tracking-widest text-white/40 font-jetbrains">
            Unified Study Library &amp; My Program Vault
          </span>
          <h1 className="text-3xl font-bold text-white tracking-tight mt-1 neon-text">
            Upload Study Material
          </h1>
          <p className="text-xs text-white/60 mt-1">
            Resources uploaded here are automatically shared across both <strong>Study Library</strong> and your selected <strong>My Program</strong> cohort without duplicating files.
          </p>
        </div>

        {/* Success Banner if uploaded */}
        {successNote && (
          <div className="mb-6 p-4 bg-emerald-950/60 border border-emerald-500/40 rounded-2xl flex items-start gap-3">
            <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
            <div className="flex-1 text-xs">
              <p className="font-bold text-emerald-200 mb-1">
                Study Material Published to Study Library &amp; {successNote.programName || 'My Program'}!
              </p>
              <p className="text-emerald-300/80 mb-2">
                "{successNote.title}" ({formatBytesReadable(successNote.fileSizeBytes)}) is now live across both sections via a single shared record.
              </p>
              {lastUploadMeta && (lastUploadMeta.deduplicated || lastUploadMeta.wasCompressed) && (
                <p className="text-[11px] text-cyan-300 font-jetbrains mb-3">
                  {lastUploadMeta.deduplicated
                    ? '✓ Identical file content detected (SHA-256) — reused existing stored file with 0 KB additional storage.'
                    : `✓ Safely compressed before upload (saved ${formatBytesReadable(lastUploadMeta.savedBytes)}).`}
                </p>
              )}
              <div className="flex items-center gap-2">
                <button
                  onClick={onBack}
                  className="px-4 py-2 text-xs font-bold text-black bg-white hover:bg-white/90 rounded-full transition-colors cursor-pointer"
                >
                  View in Library
                </button>
                <button
                  onClick={() => {
                    setSuccessNote(null);
                    setFile(null);
                    setOriginalFileSize(0);
                    setWasCompressed(false);
                    setTitle('');
                    setDescription('');
                  }}
                  className="px-4 py-2 text-xs font-medium text-white bg-white/10 border border-white/20 rounded-full hover:bg-white/20 transition-colors cursor-pointer"
                >
                  Upload Another
                </button>
              </div>
            </div>
          </div>
        )}

        {errorMessage && (
          <div
            role="alert"
            className="mb-6 p-3.5 bg-red-950/60 border border-red-500/40 text-red-200 text-xs rounded-xl flex items-center gap-2"
          >
            <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
            <span>{errorMessage}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* File Dropzone with 5 MB Maximum Upload Limit */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-xs font-bold uppercase tracking-widest text-white/70 font-jetbrains">
                Study Document File (PDF / Image) *
              </label>
              <span className="text-[11px] font-jetbrains text-cyan-300/90">
                Max file size: 5 MB · Safe auto-compression enabled
              </span>
            </div>
            <div
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all ${
                dragActive
                  ? 'border-white bg-white/10'
                  : file
                  ? 'border-emerald-400/60 bg-emerald-950/20'
                  : 'border-white/20 hover:border-white/40 bg-white/5'
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept="application/pdf,image/png,image/jpeg,image/webp,.pdf,.png,.jpg,.jpeg,.webp"
                onChange={handleFileChange}
                className="hidden"
              />

              <div className="flex flex-col items-center justify-center">
                {isCompressingFile ? (
                  <span className="text-xs font-jetbrains text-cyan-300 animate-pulse">
                    Validating &amp; optimizing file for 5 MB upload limit...
                  </span>
                ) : file ? (
                  <>
                    <div className="p-3 bg-white/10 text-white rounded-full mb-3">
                      <FileText className="w-6 h-6" />
                    </div>
                    <span className="text-sm font-bold text-white mb-1">
                      {file.name}
                    </span>
                    <span className="text-xs text-emerald-300 font-mono tabular-nums">
                      Selected size: {(file.size / (1024 * 1024)).toFixed(2)} MB ({formatBytesReadable(file.size)}) / 5.00 MB limit · Ready to publish
                    </span>
                    {wasCompressed && originalFileSize > file.size && (
                      <span className="text-[11px] text-cyan-300 font-jetbrains mt-1">
                        Optimized from {formatBytesReadable(originalFileSize)} &rarr; {formatBytesReadable(file.size)}
                      </span>
                    )}
                    <span className="text-[11px] text-white/40 mt-2 underline">
                      Click to choose a different file
                    </span>
                  </>
                ) : (
                  <>
                    <div className="p-3 bg-white/5 text-white/60 rounded-full mb-3">
                      <Upload className="w-6 h-6" />
                    </div>
                    <span className="text-sm font-medium text-white mb-1">
                      Drag and drop your PDF or study file here, or click to browse
                    </span>
                    <p className="text-xs text-white/40 font-jetbrains">
                      Maximum file size: 5 MB (files are safely compressed &amp; deduplicated via SHA-256)
                    </p>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Academic Program, Semester & Course Association (Shared between My Program & Study Library) */}
          <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/10 space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-cyan-300 font-jetbrains flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5" />
                My Program &amp; Study Library Association
              </span>
              <span className="text-[11px] text-white/45">
                Appears in both sections automatically
              </span>
            </div>

            <ProgramSelect
              label="Uploader's Enrolled Degree Course / Program"
              selectedProgramId={uploaderProgramId}
              onSelectProgram={(program) => {
                setUploaderProgramId(program.id);
                setUploaderProgramName(program.name);
                setUploaderDegreeTier(program.degreeTier);
                setSelectedCourseId('');
                setSubject(deriveCourseCategoryFromUploaderProgram(program));
              }}
              required
            />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-white/70 mb-1.5 font-jetbrains">
                  Program Semester Level *
                </label>
                <select
                  value={semesterNumber}
                  onChange={(e) => setSemesterNumber(Number(e.target.value))}
                  className="w-full px-3.5 py-2.5 text-sm bg-stone-900 border border-white/15 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-white/40 cursor-pointer"
                >
                  {[1, 2, 3, 4, 5, 6, 7, 8].map(s => (
                    <option key={s} value={s}>
                      Semester {s}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-white/70 mb-1.5 font-jetbrains">
                  Program Curriculum Course (Optional Quick-Fill)
                </label>
                <select
                  value={selectedCourseId}
                  onChange={(e) => handleSelectCurriculumCourse(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-sm bg-stone-900 border border-white/15 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-white/40 cursor-pointer"
                >
                  <option value="">Custom / Any Course in {uploaderProgramName}</option>
                  {programCourses.map(c => (
                    <option key={c.id} value={c.id}>
                      Sem {c.semesterNumber} · {c.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Optional Multi-Program Sharing (without duplicating the resource record or file) */}
            <div>
              <label className="block text-[11px] font-semibold text-white/55 mb-1.5 font-jetbrains">
                Also Share With Relevant Degree Programs (Optional — shares same resource without duplicating)
              </label>
              <div className="flex items-center gap-1.5 flex-wrap">
                {allProgramsList
                  .filter(p => p.id !== uploaderProgramId)
                  .slice(0, 6)
                  .map(prog => {
                    const isSelected = additionalProgramIds.includes(prog.id);
                    return (
                      <button
                        key={prog.id}
                        type="button"
                        onClick={() => toggleAdditionalProgram(prog.id)}
                        className={`px-2.5 py-1 rounded-lg text-[11px] font-medium border transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-cyan-400/20 text-cyan-300 border-cyan-400/50 font-bold'
                            : 'bg-white/5 text-white/50 border-white/10 hover:text-white'
                        }`}
                      >
                        {isSelected ? '✓ ' : '+ '}
                        {prog.name}
                      </button>
                    );
                  })}
              </div>
            </div>
          </div>

          {/* Course Categorization (Aligned with Uploader's Course — No Course Codes Required) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-bold text-white/70 font-jetbrains">
                  Course Category (Uploader's Course) *
                </label>
                <span className="text-[10px] font-jetbrains text-cyan-300/90">
                  Synced with {uploaderProgramName}
                </span>
              </div>
              <select
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                className="w-full px-3.5 py-2.5 text-sm bg-stone-900 border border-white/15 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-white/40 cursor-pointer"
              >
                {SUBJECT_OPTIONS.filter(s => s !== 'All Subjects').map(s => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-white/70 mb-1.5 font-jetbrains">
                Course / Subject Name *
              </label>
              <input
                type="text"
                required
                placeholder={`e.g. ${subject === 'Engineering' ? 'Engineering Thermodynamics, Circuit Analysis' : 'Data Structures & Algorithms, Macroeconomics'}`}
                value={courseName}
                onChange={(e) => setCourseName(e.target.value)}
                className="w-full px-3.5 py-2.5 text-sm bg-white/5 border border-white/15 rounded-xl text-white placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-white/40"
              />
            </div>
          </div>

          {/* Document Title & Material Type */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="sm:col-span-2">
              <label className="block text-xs font-bold text-white/70 mb-1.5 font-jetbrains">
                Document Title *
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Complete Lecture Notes, Worked Derivations & Past Exam Solutions"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full px-3.5 py-2.5 text-sm bg-white/5 border border-white/15 rounded-xl text-white placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-white/40"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-white/70 mb-1.5 font-jetbrains">
                Resource Type / Classification
              </label>
              <select
                value={materialType}
                onChange={(e) => setMaterialType(e.target.value as MaterialType)}
                className="w-full px-3.5 py-2.5 text-sm bg-stone-900 border border-white/15 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-white/40 cursor-pointer"
              >
                {Object.entries(MATERIAL_TYPE_LABELS)
                  .filter(([k]) => k !== 'all')
                  .map(([key, info]) => (
                    <option key={key} value={key}>{info.label}</option>
                  ))}
              </select>
            </div>
          </div>

          {/* Professor & Academic Year */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-bold text-white/70 mb-1.5 font-jetbrains">
                Professor / Lecturer
              </label>
              <input
                type="text"
                placeholder="e.g. Prof. Eric Roberts"
                value={professor}
                onChange={(e) => setProfessor(e.target.value)}
                className="w-full px-3.5 py-2.5 text-sm bg-white/5 border border-white/15 rounded-xl text-white placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-white/40"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-white/70 mb-1.5 font-jetbrains">
                Academic Year
              </label>
              <select
                value={academicYear}
                onChange={(e) => setAcademicYear(Number(e.target.value))}
                className="w-full px-3.5 py-2.5 text-sm bg-stone-900 border border-white/15 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-white/40 cursor-pointer"
              >
                <option value={2026}>2026</option>
                <option value={2025}>2025</option>
                <option value={2024}>2024</option>
                <option value={2023}>2023</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-white/70 mb-1.5 font-jetbrains">
                Semester / Term
              </label>
              <select
                value={semester}
                onChange={(e) => setSemester(e.target.value)}
                className="w-full px-3.5 py-2.5 text-sm bg-stone-900 border border-white/15 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-white/40 cursor-pointer"
              >
                <option value="Fall Semester">Fall Semester</option>
                <option value="Spring Semester">Spring Semester</option>
                <option value="Winter Quarter">Winter Quarter</option>
                <option value="Summer Term">Summer Term</option>
              </select>
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-bold text-white/70 mb-1.5 font-jetbrains">
              Description &amp; Chapters Covered
            </label>
            <textarea
              rows={3}
              placeholder="Summary of lecture topics, problem set derivations, exam questions covered..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3.5 py-2.5 text-sm bg-white/5 border border-white/15 rounded-xl text-white placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-white/40"
            />
          </div>

          {/* Tags */}
          <div>
            <label className="block text-xs font-bold text-white/70 mb-1.5 font-jetbrains">
              Topic Tags (Comma-separated)
            </label>
            <input
              type="text"
              placeholder="e.g. Binary Trees, Dijkstra, Shortest Path, Complexity"
              value={tagsInput}
              onChange={(e) => setTagsInput(e.target.value)}
              className="w-full px-3.5 py-2.5 text-sm bg-white/5 border border-white/15 rounded-xl text-white placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-white/40"
            />
          </div>

          {/* Contributor Profile (University is optional metadata and never restricts program visibility) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-white/10">
            <div>
              <label className="block text-xs font-bold text-white/70 mb-1.5 font-jetbrains">
                Your Name / Student Alias
              </label>
              <input
                type="text"
                placeholder="e.g. Sarah Lin"
                value={uploaderName}
                onChange={(e) => setUploaderName(e.target.value)}
                className="w-full px-3.5 py-2.5 text-sm bg-white/5 border border-white/15 rounded-xl text-white placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-white/40"
              />
            </div>
            <div>
              <HecUniversitySelect
                label="University / Institution (Optional Metadata)"
                value={uploaderUniversity}
                onChange={(uniName, uniId) => {
                  setUploaderUniversity(uniName);
                  setUploaderUniversityId(uniId);
                }}
                placeholder="Select or search institution..."
              />
            </div>
          </div>

          {/* Progress */}
          {isUploading && (
            <div className="space-y-1.5 pt-2 font-jetbrains">
              <div className="flex items-center justify-between text-xs text-white/70">
                <span>Publishing shared resource...</span>
                <span className="tabular-nums font-mono">{uploadProgress}%</span>
              </div>
              <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden">
                <div
                  className="h-full bg-white transition-all duration-300 ease-out shadow-[0_0_10px_rgba(255,255,255,0.8)]"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
            </div>
          )}

          {/* Copyright Notice & Acknowledgment Checkbox */}
          <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/15 space-y-3">
            <p className="text-xs text-white/80 leading-relaxed">
              <strong className="text-white font-bold">{UPLOAD_COPYRIGHT_NOTICE.label}</strong>{' '}
              Only upload materials you own, have permission to share, or are legally allowed to
              distribute. Unauthorized sharing of copyrighted books, paid resources, or other
              protected content is not permitted. Copyright concerns? Contact{' '}
              <a
                href={COPYRIGHT_REPORT_MAILTO}
                className="text-cyan-300 hover:text-cyan-200 underline underline-offset-4 font-jetbrains"
              >
                {XEUSAR_CONTACT_EMAIL}
              </a>
              .
            </p>

            <label className="flex items-start gap-2.5 cursor-pointer select-none pt-1 border-t border-white/10">
              <input
                type="checkbox"
                required
                checked={hasConfirmedCopyrightRights}
                onChange={(e) => setHasConfirmedCopyrightRights(e.target.checked)}
                className="mt-0.5 w-4 h-4 rounded border-white/30 bg-black text-cyan-400 focus:ring-2 focus:ring-cyan-400 cursor-pointer accent-cyan-400"
              />
              <span className="text-xs font-medium text-white/90 leading-snug">
                {UPLOAD_COPYRIGHT_NOTICE.acknowledgmentLabel}
              </span>
            </label>
          </div>

          {/* Actions */}
          <div className="pt-4 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onBack}
              disabled={isUploading}
              className="px-5 py-2.5 text-xs font-bold text-white/60 hover:text-white rounded-full transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isUploading || isCompressingFile || !hasConfirmedCopyrightRights}
              className="px-8 py-3 text-xs font-black uppercase tracking-widest text-black bg-white hover:bg-white/90 disabled:opacity-50 rounded-full transition-all cursor-pointer shadow-[0_0_20px_rgba(255,255,255,0.3)] flex items-center gap-2"
            >
              <Upload className="w-4 h-4" />
              <span>{isUploading ? 'Publishing...' : 'Publish Material'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
