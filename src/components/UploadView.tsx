import React, { useState, useRef } from 'react';
import {
  Upload,
  FileText,
  CheckCircle2,
  AlertCircle,
  ArrowLeft,
  Sparkles,
  Database
} from 'lucide-react';
import { StudyNote, MaterialType, SupabaseConfig, StudentUser } from '../types/index.ts';
import { SUBJECT_OPTIONS, MATERIAL_TYPE_LABELS } from '../data/seedData.ts';
import { getSupabaseInstance, addLocalNote, isValidHttpUrl } from '../lib/supabaseClient.ts';
import { HecUniversitySelect } from './university/HecUniversitySelect.tsx';

interface UploadViewProps {
  onBack: () => void;
  onSuccess: (newNote: StudyNote) => void;
  supabaseConfig: SupabaseConfig;
  user: StudentUser | null;
  onOpenSupabaseModal: () => void;
  initialUniversity?: string;
  initialCourseCode?: string;
}

export const UploadView: React.FC<UploadViewProps> = ({
  onBack,
  onSuccess,
  supabaseConfig,
  user,
  onOpenSupabaseModal,
  initialUniversity,
  initialCourseCode,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [dragActive, setDragActive] = useState(false);

  // Form Fields
  const [title, setTitle] = useState('');
  const [courseCode, setCourseCode] = useState(initialCourseCode || '');
  const [courseName, setCourseName] = useState('');
  const [subject, setSubject] = useState('Computer Science');
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

  // Sync profile when user signs in or changes
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
      setCourseCode(initialCourseCode);
    }
  }, [user, initialUniversity, initialCourseCode]);

  // State
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successNote, setSuccessNote] = useState<StudyNote | null>(null);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const validateAndSetFile = (selectedFile: File) => {
    if (selectedFile.type !== 'application/pdf' && !selectedFile.name.toLowerCase().endsWith('.pdf')) {
      setErrorMessage('Please select a valid PDF document (.pdf).');
      return;
    }

    if (selectedFile.size > 25 * 1024 * 1024) {
      setErrorMessage('File size exceeds the 25MB maximum limit.');
      return;
    }

    setErrorMessage(null);
    setFile(selectedFile);

    if (!title) {
      const cleanTitle = selectedFile.name
        .replace(/\.pdf$/i, '')
        .replace(/[-_]+/g, ' ')
        .trim();
      setTitle(cleanTitle);
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

  const handleQuickPrefill = () => {
    setTitle('Calculus III: Vector Calculus & Green\'s Theorem Complete Summary');
    setCourseCode('MATH 21A');
    setCourseName('Multivariable Calculus');
    setSubject('Mathematics');
    setMaterialType('cheat_sheet');
    setAcademicYear(2025);
    setSemester('Fall Semester');
    setProfessor('Prof. David Jerison');
    setDescription('High-yield derivation notes with vector flux formulas and surface integrals.');
    setTagsInput('Calculus, Greens Theorem, Stokes Theorem, Flux');
    setUploaderName('Alex Student');
    setUploaderUniversity('University of Michigan');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !courseCode.trim()) {
      setErrorMessage('Title and Course Code are required.');
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
      const fileName = file ? file.name : `${courseCode.replace(/\s+/g, '_')}_Study_Notes.pdf`;
      const fileSizeBytes = file ? file.size : 2415000;
      const calculatedPages = file ? Math.max(4, Math.round(file.size / (180 * 1024))) : 16;

      let fileUrl = 'https://example.com/notes/' + encodeURIComponent(fileName);

      // Safe Supabase check
      const supabase = getSupabaseInstance(supabaseConfig);
      if (supabase && supabaseConfig.isConnected && isValidHttpUrl(supabaseConfig.url) && file) {
        setUploadProgress(40);
        const cleanFileName = `${Date.now()}_${file.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
        const filePath = `uploads/${cleanFileName}`;

        const { error: storageError } = await supabase.storage
          .from('study-materials')
          .upload(filePath, file, {
            contentType: 'application/pdf',
            upsert: false
          });

        if (storageError) {
          console.warn('Storage upload error, continuing with fallback:', storageError.message);
        } else {
          const { data: publicUrlData } = supabase.storage
            .from('study-materials')
            .getPublicUrl(filePath);
          if (publicUrlData?.publicUrl) {
            fileUrl = publicUrlData.publicUrl;
          }
        }

        setUploadProgress(70);

        const { error: dbError } = await supabase
          .from('study_notes')
          .insert([
            {
              title: title.trim(),
              description: description.trim(),
              course_code: courseCode.trim().toUpperCase(),
              course_name: courseName.trim() || courseCode.trim().toUpperCase(),
              subject,
              material_type: materialType,
              academic_year: parsedYear,
              semester,
              professor: professor.trim() || 'Instructor',
              file_url: fileUrl,
              file_name: fileName,
              file_size_bytes: fileSizeBytes,
              page_count: calculatedPages,
              uploader_name: uploaderName.trim() || 'Anonymous Student',
              uploader_university: uploaderUniversity.trim() || 'Open Campus',
              downloads_count: 0,
              upvotes_count: 0,
              tags: tags.length > 0 ? tags : [subject, courseCode]
            }
          ]);

        if (dbError) {
          throw new Error(`Supabase Database Error: ${dbError.message}`);
        }
      } else {
        setUploadProgress(60);
        await new Promise(r => setTimeout(r, 400));
      }

      setUploadProgress(100);

      const newNote: StudyNote = {
        id: `sn-${Date.now()}`,
        title: title.trim(),
        description: description.trim() || `Comprehensive ${materialType.replace(/_/g, ' ')} for ${courseCode}.`,
        courseCode: courseCode.trim().toUpperCase(),
        courseName: courseName.trim() || courseCode.trim().toUpperCase(),
        subject,
        materialType,
        academicYear: parsedYear,
        semester,
        professor: professor.trim() || 'Course Instructor',
        fileUrl,
        fileName,
        fileSizeBytes,
        pageCount: calculatedPages,
        uploaderName: uploaderName.trim() || 'Anonymous Student',
        uploaderUniversity: uploaderUniversity.trim() || 'National University of Sciences & Technology (NUST)',
        universityId: uploaderUniversityId,
        downloadsCount: 0,
        upvotesCount: 1,
        hasUpvoted: true,
        createdAt: new Date().toISOString(),
        tags: tags.length > 0 ? tags : [subject, courseCode],
        pages: [
          {
            pageNumber: 1,
            sectionTitle: `${title.trim()} — Section 1 Overview`,
            content: description.trim() || 'Detailed study guide, high-yield definitions, and key exam concepts verified by student peer review.',
            keyFormulasOrPoints: [
              `Course: ${courseCode.trim().toUpperCase()} (${subject})`,
              `Instructor: ${professor.trim() || 'Faculty Department'}`,
              `Academic Year: ${parsedYear} ${semester}`
            ]
          },
          {
            pageNumber: 2,
            sectionTitle: `${courseCode.trim().toUpperCase()} — Core Formulations & Derivations`,
            content: 'In-depth notes, worked solutions, and practice exercises for semester reviews.\n\nAll theorems and propositions aligned with official syllabus guidelines.',
            keyFormulasOrPoints: tags.slice(0, 4)
          }
        ]
      };

      addLocalNote(newNote);
      setSuccessNote(newNote);
      onSuccess(newNote);
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

        <div className="flex items-center gap-2">
          <button
            onClick={handleQuickPrefill}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-white bg-white/10 hover:bg-white/20 rounded-full transition-colors cursor-pointer"
          >
            <Sparkles className="w-3.5 h-3.5" />
            Quick Example Pre-fill
          </button>
        </div>
      </div>

      {/* Main Form Container */}
      <div className="glass-card p-6 sm:p-10 shadow-2xl">
        <div className="mb-6">
          <span className="text-xs uppercase tracking-widest text-white/40 font-jetbrains">
            Open Knowledge Exchange
          </span>
          <h1 className="text-3xl font-bold text-white tracking-tight mt-1 neon-text">
            Upload Study Material
          </h1>
          <p className="text-xs text-white/60 mt-1">
            Contribute PDF lecture notes, exam papers, or cheat sheets. All uploads are free and accessible to students worldwide.
          </p>

          {/* Connection Mode Indicator */}
          <div className="mt-4 py-2.5 px-4 bg-white/5 border border-white/10 rounded-xl flex items-center justify-between text-xs text-white/70">
            <div className="flex items-center gap-2">
              <Database className="w-4 h-4 text-white/50" />
              <span>
                Storage Engine:{' '}
                <strong className="text-white">
                  {supabaseConfig.isConnected ? 'Live Supabase Bucket (`study-materials`)' : 'Demo Local Engine (Instant preview)'}
                </strong>
              </span>
            </div>
            {!supabaseConfig.isConnected && (
              <button
                onClick={onOpenSupabaseModal}
                className="text-xs text-white underline font-medium hover:text-white/80 cursor-pointer"
              >
                Connect Supabase
              </button>
            )}
          </div>
        </div>

        {/* Success Banner if uploaded */}
        {successNote && (
          <div className="mb-6 p-4 bg-emerald-950/60 border border-emerald-500/40 rounded-2xl flex items-start gap-3">
            <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
            <div className="flex-1 text-xs">
              <p className="font-bold text-emerald-200 mb-1">
                Study Material Published Successfully!
              </p>
              <p className="text-emerald-300/80 mb-3">
                "{successNote.title}" is now available in the study library and document reader.
              </p>
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
          <div className="mb-6 p-3.5 bg-red-950/60 border border-red-500/40 text-red-200 text-xs rounded-xl flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
            <span>{errorMessage}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* PDF Dropzone */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-widest text-white/70 mb-2 font-jetbrains">
              PDF Document File *
            </label>
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
                accept="application/pdf"
                onChange={handleFileChange}
                className="hidden"
              />

              <div className="flex flex-col items-center justify-center">
                {file ? (
                  <>
                    <div className="p-3 bg-white/10 text-white rounded-full mb-3">
                      <FileText className="w-6 h-6" />
                    </div>
                    <span className="text-sm font-bold text-white mb-1">
                      {file.name}
                    </span>
                    <span className="text-xs text-white/60 font-mono tabular-nums">
                      {(file.size / (1024 * 1024)).toFixed(2)} MB · Ready to publish
                    </span>
                    <span className="text-[11px] text-white/40 mt-2 underline">
                      Click to choose a different PDF
                    </span>
                  </>
                ) : (
                  <>
                    <div className="p-3 bg-white/5 text-white/60 rounded-full mb-3">
                      <Upload className="w-6 h-6" />
                    </div>
                    <span className="text-sm font-medium text-white mb-1">
                      Drag and drop your PDF here, or click to browse
                    </span>
                    <p className="text-xs text-white/40 font-jetbrains">
                      Standard PDF documents up to 25 MB
                    </p>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Course Identification */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-white/70 mb-1.5 font-jetbrains">
                Course Code *
              </label>
              <input
                type="text"
                required
                placeholder="e.g. CS 106B, MATH 21A, BIO 101"
                value={courseCode}
                onChange={(e) => setCourseCode(e.target.value)}
                className="w-full px-3.5 py-2.5 text-sm bg-white/5 border border-white/15 rounded-xl text-white placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-white/40 font-jetbrains uppercase"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-white/70 mb-1.5 font-jetbrains">
                Course Name
              </label>
              <input
                type="text"
                placeholder="e.g. Programming Abstractions"
                value={courseName}
                onChange={(e) => setCourseName(e.target.value)}
                className="w-full px-3.5 py-2.5 text-sm bg-white/5 border border-white/15 rounded-xl text-white placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-white/40"
              />
            </div>
          </div>

          {/* Document Title */}
          <div>
            <label className="block text-xs font-bold text-white/70 mb-1.5 font-jetbrains">
              Document Title *
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Red-Black Trees, Priority Queues & Dijkstra Complete Notes"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-3.5 py-2.5 text-sm bg-white/5 border border-white/15 rounded-xl text-white placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-white/40"
            />
          </div>

          {/* Subject & Material Type */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-white/70 mb-1.5 font-jetbrains">
                Academic Subject
              </label>
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
                Classification
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
              Description & Chapters Covered
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

          {/* Contributor Profile */}
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
                label="University / Institution"
                value={uploaderUniversity}
                onChange={(uniName, uniId) => {
                  setUploaderUniversity(uniName);
                  setUploaderUniversityId(uniId);
                }}
                placeholder="Select or search HEC university..."
                required
              />
            </div>
          </div>

          {/* Progress */}
          {isUploading && (
            <div className="space-y-1.5 pt-2 font-jetbrains">
              <div className="flex items-center justify-between text-xs text-white/70">
                <span>Publishing material...</span>
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
              disabled={isUploading}
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
