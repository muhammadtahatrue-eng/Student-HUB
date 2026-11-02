import React, { useState, useMemo, useEffect } from 'react';
import {
  GraduationCap,
  BookOpen,
  MessageSquare,
  HelpCircle,
  Layers,
  ChevronLeft,
  Search,
  Filter,
  Plus,
  Bookmark,
  BookmarkCheck,
  Share2,
  ThumbsUp,
  Download,
  Eye,
  CheckCircle2,
  Clock,
  Sparkles,
  Users,
  Award,
  AlertCircle,
  Send,
  Flag,
  Pin,
  FileText,
  CornerDownRight,
  Check,
  X,
  Paperclip,
  ExternalLink
} from 'lucide-react';
import {
  AcademicProgram,
  ProgramSemester,
  ProgramCourse,
  ProgramDiscussionPost,
  ProgramDiscussionCategory,
  ProgramDoubtQuestion,
  ProgramDoubtAnswer,
  StudyNote,
  StudentUser,
  DegreeTier,
  MaterialType
} from '../../types/index.ts';
import {
  getProgramById,
  getFollowedProgramIds,
  toggleFollowProgram,
  getProgramDiscussions,
  createProgramDiscussion,
  toggleUpvoteProgramDiscussion,
  addProgramDiscussionComment,
  getProgramDoubts,
  createProgramDoubt,
  toggleUpvoteProgramDoubt,
  addProgramDoubtAnswer,
  markAcceptedProgramAnswer
} from '../../lib/programStore.ts';
import { MATERIAL_TYPE_LABELS } from '../../data/seedData.ts';
import {
  noteBelongsToProgram,
  getNoteCourseCategory,
  getNoteCourseDisplay,
  deriveCourseCategoryFromUploaderProgram,
  canUserDeleteNote
} from '../../lib/resourceService.ts';

export type ProgramTabKey = 'overview' | 'materials' | 'courses' | 'discussions' | 'doubts';

interface ProgramDirectoryViewProps {
  programId: string;
  allNotes?: StudyNote[];
  notes?: StudyNote[];
  currentUser?: StudentUser | null;
  user?: StudentUser | null;
  activeTab?: ProgramTabKey;
  onTabChange?: (tab: ProgramTabKey) => void;
  onBackToExplore: () => void;
  onPreviewNote: (note: StudyNote) => void;
  onDownloadNote: (note: StudyNote) => void;
  onToggleUpvoteNote?: (noteId: string) => void;
  onUpvoteNote?: (noteOrId: StudyNote | string) => void;
  onEditNote?: (note: StudyNote) => void;
  onDeleteNote?: (note: StudyNote) => void;
  onUploadToProgram?: (programId: string, courseCode?: string, semesterNumber?: number) => void;
  onOpenUpload?: (programId: string, courseCode?: string, semesterNumber?: number) => void;
  onOpenAuthModal?: () => void;
  onOpenSetupModal?: () => void;
}

export const ProgramDirectoryView: React.FC<ProgramDirectoryViewProps> = ({
  programId,
  allNotes,
  notes,
  currentUser,
  user,
  activeTab: controlledTab,
  onTabChange,
  onBackToExplore,
  onPreviewNote,
  onDownloadNote,
  onToggleUpvoteNote,
  onUpvoteNote,
  onEditNote,
  onDeleteNote,
  onUploadToProgram,
  onOpenUpload,
  onOpenAuthModal,
  onOpenSetupModal
}) => {
  const [internalTab, setInternalTab] = useState<ProgramTabKey>('overview');
  const activeTab = controlledTab !== undefined ? controlledTab : internalTab;
  const setActiveTab = (t: ProgramTabKey) => {
    setInternalTab(t);
    onTabChange?.(t);
  };

  const studentUser = currentUser || user || null;
  const notesList = allNotes || notes || [];

  const requestAuth = () => {
    onOpenAuthModal?.();
  };

  const handleToggleUpvote = (id: string) => {
    if (onToggleUpvoteNote) {
      onToggleUpvoteNote(id);
    } else if (onUpvoteNote) {
      const match = notesList.find(n => n.id === id);
      if (match) onUpvoteNote(match);
      else onUpvoteNote(id);
    }
  };

  const handleUploadClick = (progId: string, courseCode?: string, semesterNumber?: number) => {
    if (onOpenUpload) {
      onOpenUpload(progId, courseCode, semesterNumber);
    } else if (onUploadToProgram) {
      onUploadToProgram(progId, courseCode, semesterNumber);
    }
  };

  const [followedIds, setFollowedIds] = useState<string[]>(() => getFollowedProgramIds());

  // Program details
  const program = useMemo(() => getProgramById(programId), [programId]);

  // Scoped Notes for this Program (Shared with Study Library, university-independent)
  const programNotes = useMemo(() => {
    return notesList.filter(n => noteBelongsToProgram(n, programId, program));
  }, [notesList, programId, program]);

  // Available courses for this program (curriculum + uploaded notes, categorized by course name instead of codes)
  const availableProgramCourses = useMemo(() => {
    const map = new Map<string, string>();
    (program?.semesters || []).forEach(sem => {
      (sem.courses || []).forEach(c => {
        if (c.name) {
          map.set(c.name.trim(), c.name.trim());
        }
      });
    });
    programNotes.forEach(n => {
      const courseTitle = getNoteCourseDisplay(n);
      if (courseTitle && !map.has(courseTitle)) {
        map.set(courseTitle, courseTitle);
      }
    });
    return Array.from(map.entries()).map(([code, label]) => ({ code, label }));
  }, [program, programNotes]);

  // Notes filtering inside "Study Materials" tab
  const [notesSearch, setNotesSearch] = useState('');
  const [notesSemesterFilter, setNotesSemesterFilter] = useState<string>('all');
  const [notesCourseFilter, setNotesCourseFilter] = useState<string>('all');
  const [notesTypeFilter, setNotesTypeFilter] = useState<string>('all');
  const [notesSortBy, setNotesSortBy] = useState<'latest' | 'popular' | 'downloads'>('latest');

  const filteredMaterials = useMemo(() => {
    return programNotes
      .filter(note => {
        if (notesSemesterFilter !== 'all') {
          const semNum = parseInt(notesSemesterFilter, 10);
          if (note.semesterNumber && note.semesterNumber !== semNum) {
            return false;
          }
        }
        if (notesCourseFilter !== 'all') {
          const normFilter = notesCourseFilter.trim().toLowerCase();
          const normDisplay = getNoteCourseDisplay(note).trim().toLowerCase();
          const normCourseName = (note.courseName || '').trim().toLowerCase();
          const normSubject = getNoteCourseCategory(note).trim().toLowerCase();
          const normCode = (note.courseCode || '').trim().toLowerCase();
          if (
            normDisplay !== normFilter &&
            normCourseName !== normFilter &&
            normSubject !== normFilter &&
            normCode !== normFilter
          ) {
            return false;
          }
        }
        if (notesTypeFilter !== 'all' && note.materialType !== notesTypeFilter) {
          return false;
        }
        if (notesSearch.trim()) {
          const q = notesSearch.toLowerCase().trim();
          const matchTitle = note.title.toLowerCase().includes(q);
          const matchCategory = getNoteCourseCategory(note).toLowerCase().includes(q);
          const matchCourse = (note.courseName || '').toLowerCase().includes(q);
          const matchProgram = (note.programName || '').toLowerCase().includes(q);
          const matchProf = note.professor.toLowerCase().includes(q);
          const matchUploader = (note.uploaderName || '').toLowerCase().includes(q);
          if (
            !matchTitle &&
            !matchCategory &&
            !matchCourse &&
            !matchProgram &&
            !matchProf &&
            !matchUploader
          ) {
            return false;
          }
        }
        return true;
      })
      .sort((a, b) => {
        if (notesSortBy === 'popular') return b.upvotesCount - a.upvotesCount;
        if (notesSortBy === 'downloads') return b.downloadsCount - a.downloadsCount;
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      });
  }, [programNotes, notesSemesterFilter, notesCourseFilter, notesTypeFilter, notesSearch, notesSortBy]);

  // Discussions state
  const [discussions, setDiscussions] = useState<ProgramDiscussionPost[]>(() => getProgramDiscussions(programId));
  const [discCategory, setDiscCategory] = useState<string>('all');
  const [discSearch, setDiscSearch] = useState('');
  const [isNewPostModalOpen, setIsNewPostModalOpen] = useState(false);
  const [newPostTitle, setNewPostTitle] = useState('');
  const [newPostContent, setNewPostContent] = useState('');
  const [newPostCategory, setNewPostCategory] = useState<ProgramDiscussionCategory>('Academics');
  const [newPostSemesterTag, setNewPostSemesterTag] = useState('');
  const [newPostCourseTag, setNewPostCourseTag] = useState('');
  const [commentInputMap, setCommentInputMap] = useState<Record<string, string>>({});

  // Doubts state
  const [doubts, setDoubts] = useState<ProgramDoubtQuestion[]>(() => getProgramDoubts(programId));
  const [doubtFilter, setDoubtFilter] = useState<'all' | 'unanswered' | 'answered'>('all');
  const [doubtSearch, setDoubtSearch] = useState('');
  const [isAskDoubtModalOpen, setIsAskDoubtModalOpen] = useState(false);
  const [doubtTitle, setDoubtTitle] = useState('');
  const [doubtContent, setDoubtContent] = useState('');
  const [doubtCourseCode, setDoubtCourseCode] = useState('');
  const [doubtSemesterTag, setDoubtSemesterTag] = useState('');
  const [doubtTagsInput, setDoubtTagsInput] = useState('');
  const [answerInputMap, setAnswerInputMap] = useState<Record<string, string>>({});

  useEffect(() => {
    setDiscussions(getProgramDiscussions(programId));
    setDoubts(getProgramDoubts(programId));
  }, [programId]);

  if (!program) {
    return (
      <div className="max-w-lg mx-auto my-8 text-center py-8 px-6 rounded-2xl border border-white/10 bg-zinc-950/75 font-outfit">
        <div className="w-11 h-11 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center mx-auto mb-3 text-cyan-400">
          <GraduationCap className="w-5 h-5" />
        </div>
        <h2 className="text-base font-bold text-white">Degree Program Not Found</h2>
        <p className="text-xs text-white/50 mt-1 mb-4">
          The requested academic cohort does not exist or has not been unlocked yet.
        </p>
        <div className="flex flex-wrap items-center justify-center gap-2.5">
          {onOpenSetupModal && (
            <button
              type="button"
              onClick={onOpenSetupModal}
              className="px-3.5 py-2 bg-cyan-400 text-black font-bold rounded-xl text-xs hover:bg-cyan-300 transition-colors cursor-pointer"
            >
              Select My Degree Program
            </button>
          )}
          <button
            type="button"
            onClick={onBackToExplore}
            className="px-3.5 py-2 bg-zinc-900 border border-white/10 text-white font-semibold rounded-xl text-xs hover:bg-zinc-800 transition-colors cursor-pointer"
          >
            Browse Programs Directory
          </button>
        </div>
      </div>
    );
  }

  const isFollowed = followedIds.includes(program.id);
  const isEnrolledProgram = Boolean(studentUser?.programId && studentUser.programId === program.id);
  const filteredDiscussions = discussions.filter(d => (discCategory === 'all' ? true : d.category === discCategory));
  const filteredDoubts = doubts.filter(d => (doubtFilter === 'all' ? true : d.status === doubtFilter));

  const handleToggleFollow = () => {
    toggleFollowProgram(program.id);
    setFollowedIds(getFollowedProgramIds());
  };

  // Discussions actions
  const handleCreatePost = (e: React.FormEvent) => {
    e.preventDefault();
    if (!studentUser) {
      requestAuth();
      return;
    }
    if (!newPostTitle.trim() || !newPostContent.trim()) return;

    const created = createProgramDiscussion({
      programId: program.id,
      title: newPostTitle,
      content: newPostContent,
      category: newPostCategory,
      semesterTag: newPostSemesterTag.trim() || undefined,
      courseTag: newPostCourseTag.trim() || undefined,
      author: studentUser
    });

    setDiscussions([created, ...discussions]);
    setIsNewPostModalOpen(false);
    setNewPostTitle('');
    setNewPostContent('');
    setNewPostSemesterTag('');
    setNewPostCourseTag('');
  };

  const handleUpvotePost = (postId: string) => {
    if (!studentUser) {
      requestAuth();
      return;
    }
    const { upvotesCount, hasUpvoted } = toggleUpvoteProgramDiscussion(postId);
    setDiscussions(prev =>
      prev.map(p => (p.id === postId ? { ...p, upvotesCount, hasUpvoted } : p))
    );
  };

  const handleAddComment = (postId: string) => {
    if (!studentUser) {
      requestAuth();
      return;
    }
    const text = commentInputMap[postId]?.trim();
    if (!text) return;

    const comment = addProgramDiscussionComment({
      postId,
      content: text,
      author: studentUser
    });

    if (comment) {
      setDiscussions(prev =>
        prev.map(p =>
          p.id === postId
            ? {
                ...p,
                comments: [...p.comments, comment],
                commentsCount: p.comments.length + 1
              }
            : p
        )
      );
      setCommentInputMap(prev => ({ ...prev, [postId]: '' }));
    }
  };

  // Doubt actions
  const handleCreateDoubt = (e: React.FormEvent) => {
    e.preventDefault();
    if (!studentUser) {
      requestAuth();
      return;
    }
    if (!doubtTitle.trim() || !doubtContent.trim() || !doubtCourseCode.trim()) return;

    const tags = doubtTagsInput
      .split(',')
      .map(t => t.trim())
      .filter(Boolean);

    const created = createProgramDoubt({
      programId: program.id,
      title: doubtTitle,
      content: doubtContent,
      courseCode: doubtCourseCode,
      semesterTag: doubtSemesterTag.trim() || undefined,
      tags: tags.length ? tags : ['Academics'],
      author: studentUser
    });

    setDoubts([created, ...doubts]);
    setIsAskDoubtModalOpen(false);
    setDoubtTitle('');
    setDoubtContent('');
    setDoubtCourseCode('');
    setDoubtSemesterTag('');
    setDoubtTagsInput('');
  };

  const handleUpvoteDoubt = (doubtId: string) => {
    if (!studentUser) {
      requestAuth();
      return;
    }
    const { upvotesCount, hasUpvoted } = toggleUpvoteProgramDoubt(doubtId);
    setDoubts(prev =>
      prev.map(d => (d.id === doubtId ? { ...d, upvotesCount, hasUpvoted } : d))
    );
  };

  const handleAddAnswer = (doubtId: string) => {
    if (!studentUser) {
      requestAuth();
      return;
    }
    const text = answerInputMap[doubtId]?.trim();
    if (!text) return;

    const answer = addProgramDoubtAnswer({
      questionId: doubtId,
      content: text,
      author: studentUser,
      role: studentUser.degreeTier === "Master's" || studentUser.degreeTier === 'PhD' ? 'Graduate Peer' : 'Peer Student'
    });

    if (answer) {
      setDoubts(prev =>
        prev.map(d =>
          d.id === doubtId
            ? {
                ...d,
                status: 'answered',
                answers: [...d.answers, answer]
              }
            : d
        )
      );
      setAnswerInputMap(prev => ({ ...prev, [doubtId]: '' }));
    }
  };

  const handleAcceptAnswer = (doubtId: string, answerId: string) => {
    if (!studentUser) {
      requestAuth();
      return;
    }
    const success = markAcceptedProgramAnswer(doubtId, answerId);
    if (success) {
      setDoubts(prev =>
        prev.map(d => {
          if (d.id === doubtId) {
            return {
              ...d,
              acceptedAnswerId: answerId,
              answers: d.answers.map(a => ({
                ...a,
                isAccepted: a.id === answerId
              }))
            };
          }
          return d;
        })
      );
    }
  };

  const getTierColor = (tier: DegreeTier) => {
    switch (tier) {
      case 'Undergraduate':
        return 'text-cyan-400 bg-cyan-950/40 border-cyan-500/30';
      case "Master's":
        return 'text-purple-400 bg-purple-950/40 border-purple-500/30';
      case 'PhD':
        return 'text-amber-400 bg-amber-950/40 border-amber-500/30';
      case 'Associate':
        return 'text-emerald-400 bg-emerald-950/40 border-emerald-500/30';
    }
  };

  return (
    <div className="font-outfit space-y-4">
      {/* Compact Top Breadcrumb & Context Bar */}
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-white/50">
        <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 flex-wrap">
          <button
            type="button"
            onClick={onBackToExplore}
            className="hover:text-cyan-400 flex items-center gap-1 transition-colors cursor-pointer font-medium"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
            <span>Discover Programs</span>
          </button>
          <span className="text-white/25">/</span>
          <span className="text-white/45">{program.degreeTier}</span>
          <span className="text-white/25">/</span>
          <span className="text-cyan-400 font-semibold truncate max-w-xs sm:max-w-md">{program.name}</span>
        </nav>

        {onOpenSetupModal && (
          <button
            type="button"
            onClick={onOpenSetupModal}
            className="text-[11px] font-semibold text-white/60 hover:text-cyan-300 flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white/[0.03] border border-white/10 hover:border-cyan-500/30 transition-colors cursor-pointer"
          >
            <GraduationCap className="w-3.5 h-3.5 text-cyan-400" />
            <span>Switch Program / Semester</span>
          </button>
        )}
      </div>

      {/* Compact Program Header & Summary Metrics */}
      <section className="rounded-2xl border border-white/10 bg-zinc-950/85 backdrop-blur-xl p-4 sm:p-5 shadow-xl relative overflow-hidden">
        <div className="absolute -top-12 right-8 w-64 h-32 bg-cyan-500/10 blur-[80px] pointer-events-none rounded-full" />

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap mb-2">
              {isEnrolledProgram && (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-[10px] font-bold uppercase tracking-wider">
                  <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                  Enrolled Program
                </span>
              )}
              <span className={`text-[10px] font-mono px-2.5 py-0.5 rounded-md border uppercase font-bold ${getTierColor(program.degreeTier)}`}>
                {program.degreeTier} Degree
              </span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-white/5 border border-white/10 text-white/75 font-semibold">
                {program.shortCode}
              </span>
              {isEnrolledProgram && studentUser?.currentSemester && (
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-cyan-500/15 border border-cyan-500/30 text-cyan-300">
                  Current: {studentUser.currentSemester}
                </span>
              )}
              {program.badge && (
                <span className="text-[10px] px-2 py-0.5 rounded-md bg-cyan-500/10 text-cyan-300 border border-cyan-500/25 font-medium">
                  ★ {program.badge}
                </span>
              )}
            </div>

            <h1 className="text-xl sm:text-2xl font-extrabold text-white tracking-tight leading-snug">
              {program.name}
            </h1>
            <p className="mt-0.5 text-xs text-cyan-400/85 font-medium">
              {program.discipline} • {program.durationYears} Years ({program.totalSemesters} Semesters) • {program.totalCredits} Credit Hours
            </p>
            <p className="mt-1.5 text-xs text-white/60 leading-relaxed max-w-3xl line-clamp-2">
              {program.description}
            </p>
          </div>

          {/* Action CTAs */}
          <div className="flex flex-wrap sm:flex-nowrap lg:flex-col gap-2 shrink-0">
            <button
              type="button"
              onClick={() => handleUploadClick(program.id)}
              className="px-3.5 py-2 rounded-xl bg-cyan-400 text-black text-xs font-bold hover:bg-cyan-300 transition-colors cursor-pointer shadow-md shadow-cyan-400/15 flex items-center justify-center gap-1.5"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Upload Resource to Program</span>
            </button>

            <button
              type="button"
              onClick={handleToggleFollow}
              className={`px-3.5 py-2 rounded-xl border text-xs font-semibold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                isFollowed
                  ? 'bg-cyan-500/15 text-cyan-300 border-cyan-500/35'
                  : 'bg-zinc-900/90 hover:bg-zinc-800 text-white/80 hover:text-white border-white/10'
              }`}
            >
              {isFollowed ? (
                <>
                  <BookmarkCheck className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Following Program</span>
                </>
              ) : (
                <>
                  <Bookmark className="w-3.5 h-3.5" />
                  <span>Follow Program</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Compact Program Metrics Strip */}
        <div className="mt-4 pt-3.5 border-t border-white/10 grid grid-cols-2 sm:grid-cols-4 gap-2.5">
          <div className="px-3 py-2 rounded-xl bg-zinc-900/75 border border-white/5 flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400 shrink-0">
              <Users className="w-3.5 h-3.5" />
            </div>
            <div className="min-w-0">
              <div className="text-[10px] text-white/40 uppercase tracking-wider leading-none">Enrolled Peers</div>
              <div className="text-sm font-bold text-white mt-0.5 truncate">{program.activeStudents} Students</div>
            </div>
          </div>

          <div className="px-3 py-2 rounded-xl bg-zinc-900/75 border border-white/5 flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 shrink-0">
              <BookOpen className="w-3.5 h-3.5" />
            </div>
            <div className="min-w-0">
              <div className="text-[10px] text-white/40 uppercase tracking-wider leading-none">Vault Materials</div>
              <div className="text-sm font-bold text-white mt-0.5 truncate">{programNotes.length} Documents</div>
            </div>
          </div>

          <div className="px-3 py-2 rounded-xl bg-zinc-900/75 border border-white/5 flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 shrink-0">
              <Layers className="w-3.5 h-3.5" />
            </div>
            <div className="min-w-0">
              <div className="text-[10px] text-white/40 uppercase tracking-wider leading-none">Semesters</div>
              <div className="text-sm font-bold text-white mt-0.5 truncate">{program.totalSemesters} Semesters</div>
            </div>
          </div>

          <div className="px-3 py-2 rounded-xl bg-zinc-900/75 border border-white/5 flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400 shrink-0">
              <CheckCircle2 className="w-3.5 h-3.5" />
            </div>
            <div className="min-w-0">
              <div className="text-[10px] text-white/40 uppercase tracking-wider leading-none">Doubts Solved</div>
              <div className="text-sm font-bold text-white mt-0.5 truncate">
                {doubts.filter(d => d.status === 'answered').length} Solved
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 5 Aligned Sub-Navigation Tabs */}
      <div className="bg-zinc-950/85 backdrop-blur-xl p-1.5 rounded-xl border border-white/10 flex items-center gap-1 overflow-x-auto scrollbar-none">
        {[
          { key: 'overview', label: 'Overview', icon: Layers },
          { key: 'materials', label: `Study Materials (${programNotes.length})`, icon: BookOpen },
          { key: 'courses', label: 'Semester & Course Roadmap', icon: GraduationCap },
          { key: 'discussions', label: `Discussions (${discussions.length})`, icon: MessageSquare },
          { key: 'doubts', label: `Doubts & Q&A (${doubts.length})`, icon: HelpCircle }
        ].map(tab => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActiveTab(tab.key as ProgramTabKey)}
              className={`px-3.5 py-2 rounded-lg text-xs font-semibold transition-all duration-150 flex items-center gap-2 shrink-0 cursor-pointer ${
                isActive
                  ? 'bg-cyan-400 text-black shadow-sm font-bold'
                  : 'text-white/60 hover:text-white hover:bg-white/5'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* TAB 1: OVERVIEW */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Left 2 Cols: Academic Syllabus Summary & Semester Matrix */}
          <div className="lg:col-span-2 space-y-4">
            <div className="p-5 rounded-2xl bg-zinc-950/75 border border-white/10">
              <h3 className="text-sm font-bold text-white mb-1.5 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-cyan-400" />
                Program Core Architecture &amp; Outcomes
              </h3>
              <p className="text-xs text-white/65 leading-relaxed">
                The {program.name} balances foundational theoretical concepts with practical methodologies. Students complete {program.totalSemesters} semesters covering core curriculum, analytical foundations, and specialized electives.
              </p>

              <div className="mt-3.5 grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="p-3 rounded-xl bg-zinc-900/70 border border-white/5">
                  <div className="text-xs font-bold text-cyan-400 mb-0.5">Degree Level Standards</div>
                  <div className="text-[11px] text-white/60 leading-relaxed">
                    Standardized {program.degreeTier} curriculum with university-independent peer study vaults.
                  </div>
                </div>
                <div className="p-3 rounded-xl bg-zinc-900/70 border border-white/5">
                  <div className="text-xs font-bold text-indigo-400 mb-0.5">Shared Study Library Sync</div>
                  <div className="text-[11px] text-white/60 leading-relaxed">
                    Resources uploaded in this program workspace are automatically synced with the main Study Library.
                  </div>
                </div>
              </div>
            </div>

            {/* Semester Jump Matrix */}
            <div className="p-5 rounded-2xl bg-zinc-950/75 border border-white/10">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <Layers className="w-4 h-4 text-emerald-400" />
                  Semester Progression
                </h3>
                <button
                  type="button"
                  onClick={() => setActiveTab('courses')}
                  className="text-xs text-cyan-400 hover:text-cyan-300 font-semibold cursor-pointer"
                >
                  View Full Curriculum &rarr;
                </button>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                {(program.semesters || []).map(sem => (
                  <div
                    key={sem.semesterNumber}
                    onClick={() => {
                      setNotesSemesterFilter(sem.semesterNumber.toString());
                      setActiveTab('materials');
                    }}
                    className="p-3 rounded-xl bg-zinc-900/75 border border-white/5 hover:border-cyan-500/40 transition-all cursor-pointer group"
                  >
                    <div className="text-xs font-bold text-white group-hover:text-cyan-300">
                      Semester {sem.semesterNumber}
                    </div>
                    <div className="text-[11px] text-white/45 mt-0.5">
                      {sem.courses?.length || 0} Core Courses
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Right 1 Col: Community & Recent Activity */}
          <div className="space-y-4">
            <div className="p-4 rounded-2xl bg-zinc-950/75 border border-white/10">
              <h3 className="text-sm font-bold text-white mb-2.5 flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-cyan-400" />
                Recent Discussions
              </h3>
              {discussions.length > 0 ? (
                <div className="space-y-2">
                  {discussions.slice(0, 3).map(d => (
                    <div
                      key={d.id}
                      onClick={() => setActiveTab('discussions')}
                      className="p-2.5 rounded-xl bg-zinc-900/70 border border-white/5 hover:border-cyan-500/30 transition-all cursor-pointer"
                    >
                      <div className="text-xs font-semibold text-white line-clamp-1 hover:text-cyan-300">
                        {d.title}
                      </div>
                      <div className="flex items-center gap-2 text-[10px] text-white/45 mt-1">
                        <span>{d.category}</span>
                        <span>•</span>
                        <span>{d.upvotesCount} upvotes</span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-white/45 py-2">No discussions posted in this cohort yet.</p>
              )}
              <button
                type="button"
                onClick={() => setActiveTab('discussions')}
                className="mt-3 w-full py-2 text-center text-xs font-semibold text-cyan-400 hover:text-cyan-300 bg-cyan-950/30 rounded-xl border border-cyan-500/20 cursor-pointer"
              >
                Open Cohort Discussions
              </button>
            </div>

            {/* Doubt Center highlights */}
            <div className="p-4 rounded-2xl bg-zinc-950/75 border border-white/10">
              <h3 className="text-sm font-bold text-white mb-2.5 flex items-center gap-2">
                <HelpCircle className="w-4 h-4 text-amber-400" />
                Cohort Doubt Center
              </h3>
              {doubts.length > 0 ? (
                <div className="space-y-2">
                  {doubts.slice(0, 2).map(q => (
                    <div
                      key={q.id}
                      onClick={() => setActiveTab('doubts')}
                      className="p-2.5 rounded-xl bg-zinc-900/70 border border-white/5 hover:border-amber-500/30 transition-all cursor-pointer"
                    >
                      <div className="flex items-center gap-2 text-[10px] mb-1">
                        <span className="font-mono text-cyan-400 font-bold">{q.courseCode}</span>
                        <span className={q.status === 'answered' ? 'text-emerald-400' : 'text-amber-400'}>
                          {q.status === 'answered' ? '✓ Solved' : '● Unanswered'}
                        </span>
                      </div>
                      <div className="text-xs font-semibold text-white line-clamp-2">
                        {q.title}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-white/45 py-2">No doubts posted in this cohort yet.</p>
              )}
              <button
                type="button"
                onClick={() => setActiveTab('doubts')}
                className="mt-3 w-full py-2 text-center text-xs font-semibold text-amber-400 hover:text-amber-300 bg-amber-950/30 rounded-xl border border-amber-500/20 cursor-pointer"
              >
                Ask / Solve Doubts
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: STUDY MATERIALS (Lecture Notes, Past Papers, Assignments, Lab Manuals) */}
      {activeTab === 'materials' && (
        <div className="space-y-4">
          {/* Filters Bar */}
          <div className="p-3.5 sm:p-4 rounded-2xl bg-zinc-950/85 border border-white/10 space-y-3">
            <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-2.5">
              <div className="relative flex-1 min-w-0">
                <Search className="w-4 h-4 text-white/40 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  value={notesSearch}
                  onChange={e => setNotesSearch(e.target.value)}
                  placeholder="Filter materials by title, course (e.g. Engineering, Thermodynamics), professor, or uploader..."
                  className="w-full pl-9 pr-4 py-2 bg-zinc-900/90 border border-white/10 rounded-xl text-xs text-white placeholder-white/35 focus:outline-none focus:border-cyan-400"
                />
              </div>

              <div className="flex flex-wrap items-center gap-2 shrink-0">
                {/* Course Filter Dropdown */}
                <select
                  value={notesCourseFilter}
                  onChange={e => setNotesCourseFilter(e.target.value)}
                  aria-label="Filter by Course"
                  className="bg-zinc-900/90 border border-white/10 rounded-xl px-2.5 py-2 text-xs text-white focus:outline-none focus:border-cyan-400 cursor-pointer max-w-[220px] truncate"
                >
                  <option value="all">All Program Courses</option>
                  {availableProgramCourses.map(c => (
                    <option key={c.code} value={c.code}>
                      {c.label}
                    </option>
                  ))}
                </select>

                <span className="text-[11px] text-white/45">Sort:</span>
                <select
                  value={notesSortBy}
                  onChange={e => setNotesSortBy(e.target.value as any)}
                  className="bg-zinc-900/90 border border-white/10 rounded-xl px-2.5 py-2 text-xs text-white focus:outline-none focus:border-cyan-400 cursor-pointer"
                >
                  <option value="latest">Latest Uploads</option>
                  <option value="popular">Most Upvoted</option>
                  <option value="downloads">Most Downloaded</option>
                </select>
              </div>
            </div>

            {/* Semester & Type Filter Chips */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-2.5 pt-2.5 border-t border-white/5">
              {/* Semester selector */}
              <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none">
                <span className="text-[11px] text-white/40 shrink-0 mr-1">Semester:</span>
                <button
                  type="button"
                  onClick={() => setNotesSemesterFilter('all')}
                  className={`px-2.5 py-1 text-xs rounded-lg font-medium transition-all shrink-0 cursor-pointer ${
                    notesSemesterFilter === 'all'
                      ? 'bg-cyan-400 text-black font-bold'
                      : 'bg-zinc-900 text-white/60 hover:text-white'
                  }`}
                >
                  All
                </button>
                {[1, 2, 3, 4, 5, 6, 7, 8].map(num => (
                  <button
                    key={num}
                    type="button"
                    onClick={() => setNotesSemesterFilter(num.toString())}
                    className={`px-2.5 py-1 text-xs rounded-lg font-medium transition-all shrink-0 cursor-pointer ${
                      notesSemesterFilter === num.toString()
                        ? 'bg-cyan-400 text-black font-bold'
                        : 'bg-zinc-900 text-white/60 hover:text-white'
                    }`}
                  >
                    Sem {num}
                  </button>
                ))}
              </div>

              {/* Material Type selector */}
              <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none">
                <span className="text-[11px] text-white/40 shrink-0 mr-1">Type:</span>
                {Object.entries(MATERIAL_TYPE_LABELS).map(([k, meta]) => (
                  <button
                    key={k}
                    type="button"
                    onClick={() => setNotesTypeFilter(k)}
                    className={`px-2.5 py-1 text-xs rounded-lg font-medium transition-all shrink-0 cursor-pointer ${
                      notesTypeFilter === k
                        ? 'bg-indigo-500 text-white font-bold'
                        : 'bg-zinc-900 text-white/60 hover:text-white'
                    }`}
                  >
                    {meta.short}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Materials Grid */}
          {filteredMaterials.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredMaterials.map(note => {
                const isNoteOwner = canUserDeleteNote(note, studentUser);
                const canManageNote = isNoteOwner && Boolean(
                  onEditNote || onDeleteNote
                );
                return (
                  <div
                    key={note.id}
                    className="p-4 sm:p-5 rounded-2xl bg-zinc-950/80 border border-white/10 hover:border-cyan-500/40 transition-all flex flex-col justify-between group"
                  >
                    <div>
                      <div className="flex items-center justify-between gap-2 mb-2">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="font-mono text-xs font-bold text-cyan-400 bg-cyan-950/40 border border-cyan-500/30 px-2 py-0.5 rounded-md">
                            {getNoteCourseCategory(note)}
                          </span>
                          <span className="text-[10px] font-mono text-indigo-300 bg-indigo-950/40 border border-indigo-500/30 px-2 py-0.5 rounded-md">
                            {MATERIAL_TYPE_LABELS[note.materialType]?.label || note.materialType}
                          </span>
                          {note.semesterNumber && (
                            <span className="text-[10px] text-white/55 bg-white/5 px-2 py-0.5 rounded-md">
                              Sem {note.semesterNumber}
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-2 text-[11px] text-white/40 shrink-0">
                          <span>{note.pageCount} Pages</span>
                          {canManageNote && onEditNote && (
                            <button
                              type="button"
                              onClick={() => onEditNote(note)}
                              className="text-white/40 hover:text-cyan-400 cursor-pointer underline text-[10px]"
                              title="Edit shared resource metadata"
                            >
                              Edit
                            </button>
                          )}
                          {canManageNote && onDeleteNote && (
                            <button
                              type="button"
                              onClick={() => onDeleteNote(note)}
                              className="text-white/40 hover:text-red-400 cursor-pointer underline text-[10px]"
                              title="Delete shared resource"
                            >
                              Remove
                            </button>
                          )}
                        </div>
                      </div>

                      <h4
                        onClick={() => onPreviewNote(note)}
                        className="text-sm sm:text-base font-bold text-white group-hover:text-cyan-300 transition-colors cursor-pointer line-clamp-1"
                      >
                        {note.title}
                      </h4>
                      <p className="text-xs text-white/50 mt-0.5 mb-2">
                        {getNoteCourseDisplay(note)} • Prof. {note.professor}
                        {note.uploaderName ? ` • Shared by ${note.uploaderName}` : ''}
                      </p>

                      <p className="text-xs text-white/65 line-clamp-2 leading-relaxed">
                        {note.description}
                      </p>

                      {/* Tags */}
                      <div className="flex items-center gap-1.5 flex-wrap mt-2.5">
                        {note.tags.slice(0, 4).map(tag => (
                          <span key={tag} className="text-[10px] text-white/45 bg-zinc-900 px-2 py-0.5 rounded-md">
                            #{tag}
                          </span>
                        ))}
                      </div>
                    </div>

                    {/* Note Footer Actions */}
                    <div className="mt-4 pt-3 border-t border-white/10 flex items-center justify-between text-xs">
                      <div className="flex items-center gap-3 text-white/50">
                        <button
                          type="button"
                          onClick={() => handleToggleUpvote(note.id)}
                          className={`flex items-center gap-1 transition-colors cursor-pointer ${
                            note.hasUpvoted ? 'text-cyan-400 font-bold' : 'hover:text-white'
                          }`}
                        >
                          <ThumbsUp className="w-3.5 h-3.5" />
                          <span>{note.upvotesCount}</span>
                        </button>

                        <div className="flex items-center gap-1">
                          <Download className="w-3.5 h-3.5" />
                          <span>{note.downloadsCount}</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => onPreviewNote(note)}
                          className="px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-white font-semibold text-xs transition-colors cursor-pointer flex items-center gap-1.5"
                        >
                          <Eye className="w-3.5 h-3.5 text-cyan-400" />
                          Preview PDF
                        </button>

                        <button
                          type="button"
                          onClick={() => onDownloadNote(note)}
                          className="px-3 py-1.5 rounded-lg bg-cyan-400 hover:bg-cyan-300 text-black font-bold text-xs transition-colors cursor-pointer flex items-center gap-1.5 shadow-sm shadow-cyan-400/20"
                        >
                          <Download className="w-3.5 h-3.5" />
                          Download
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="max-w-lg mx-auto text-center py-7 px-5 rounded-2xl bg-zinc-950/75 border border-white/10">
              <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center mx-auto mb-2.5 text-cyan-400">
                <BookOpen className="w-5 h-5" />
              </div>
              <p className="text-sm font-bold text-white">No study materials match the current filters</p>
              <p className="text-xs text-white/50 mt-1 mb-4">
                Clear your active filters or upload a lecture note, past exam, or lab manual for this program.
              </p>
              <div className="flex flex-wrap items-center justify-center gap-2">
                {(notesSearch || notesSemesterFilter !== 'all' || notesCourseFilter !== 'all' || notesTypeFilter !== 'all') && (
                  <button
                    type="button"
                    onClick={() => {
                      setNotesSearch('');
                      setNotesSemesterFilter('all');
                      setNotesCourseFilter('all');
                      setNotesTypeFilter('all');
                    }}
                    className="px-3.5 py-2 rounded-xl bg-zinc-900 border border-white/10 text-white/80 hover:text-white text-xs font-semibold cursor-pointer"
                  >
                    Reset Filters
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => handleUploadClick(program.id)}
                  className="px-3.5 py-2 rounded-xl bg-cyan-400 text-black text-xs font-bold hover:bg-cyan-300 cursor-pointer"
                >
                  Upload Resource Now
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 3: CORE COURSES & SEMESTERS */}
      {activeTab === 'courses' && (
        <div className="space-y-4">
          {(program.semesters && program.semesters.length > 0) ? (
            program.semesters.map(sem => (
              <div
                key={sem.semesterNumber}
                className="p-4 sm:p-5 rounded-2xl bg-zinc-950/80 border border-white/10"
              >
                <div className="flex flex-wrap items-center justify-between gap-2 mb-3.5 pb-3 border-b border-white/10">
                  <div className="flex items-center gap-2.5">
                    <span className="w-7 h-7 rounded-lg bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 font-bold flex items-center justify-center text-xs">
                      {sem.semesterNumber}
                    </span>
                    <div>
                      <h3 className="text-sm font-bold text-white">{sem.name}</h3>
                      <p className="text-[11px] text-white/50">{sem.courses.length} Core Curriculum Courses</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setNotesSemesterFilter(sem.semesterNumber.toString());
                      setNotesCourseFilter('all');
                      setActiveTab('materials');
                    }}
                    className="text-xs text-cyan-400 hover:text-cyan-300 font-semibold cursor-pointer"
                  >
                    View Semester Materials &rarr;
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                  {sem.courses.map(course => {
                    const normCode = course.code.replace(/[\s-_]+/g, '').toUpperCase();
                    const normCourseName = course.name.trim().toLowerCase();
                    const dynamicCourseDocsCount = programNotes.filter(
                      n =>
                        n.courseId === course.id ||
                        (n.courseName || '').trim().toLowerCase() === normCourseName ||
                        (n.courseCode || '').replace(/[\s-_]+/g, '').toUpperCase() === normCode
                    ).length;
                    return (
                      <div
                        key={course.id}
                        className="p-4 rounded-xl bg-zinc-900/65 border border-white/5 hover:border-cyan-500/30 transition-all flex flex-col justify-between"
                      >
                        <div>
                          <div className="flex items-center justify-between gap-2 mb-1.5">
                            <span className="font-mono text-xs font-bold text-cyan-400 bg-cyan-950/40 border border-cyan-500/30 px-2 py-0.5 rounded-md">
                              {deriveCourseCategoryFromUploaderProgram(program, course.name)}
                            </span>
                            <span className="text-[11px] text-white/50">
                              {course.credits} Credits
                            </span>
                          </div>
                          <h4 className="text-sm font-bold text-white mb-1">{course.name}</h4>
                          <p className="text-xs text-white/60 leading-relaxed mb-2">{course.description}</p>
                          {course.instructor && (
                            <div className="text-[11px] text-white/45">
                              Instructor: <span className="text-white/75">{course.instructor}</span>
                            </div>
                          )}
                        </div>

                        <div className="mt-3 pt-2.5 border-t border-white/5 flex items-center justify-between text-xs">
                          <span className="text-[11px] text-white/45">
                            {dynamicCourseDocsCount} Vault {dynamicCourseDocsCount === 1 ? 'Document' : 'Documents'}
                          </span>
                          <div className="flex items-center gap-3">
                            <button
                              type="button"
                              onClick={() => handleUploadClick(program.id, course.name, sem.semesterNumber)}
                              className="text-white/60 hover:text-white font-semibold text-xs cursor-pointer"
                            >
                              + Upload
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setNotesCourseFilter(course.name);
                                setNotesSemesterFilter('all');
                                setActiveTab('materials');
                              }}
                              className="text-cyan-400 hover:text-cyan-300 font-semibold text-xs cursor-pointer"
                            >
                              Find Notes
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))
          ) : (
            <div className="max-w-lg mx-auto text-center py-7 px-5 bg-zinc-950/75 rounded-2xl border border-white/10">
              <GraduationCap className="w-8 h-8 text-cyan-400/60 mx-auto mb-2" />
              <p className="text-sm font-bold text-white">Semester roadmap being compiled</p>
              <p className="text-xs text-white/50 mt-1 mb-3">
                You can still upload course notes and past papers directly to {program.shortCode} while the course catalog is finalized.
              </p>
              <button
                type="button"
                onClick={() => handleUploadClick(program.id)}
                className="px-3.5 py-2 rounded-xl bg-cyan-400 text-black text-xs font-bold hover:bg-cyan-300 cursor-pointer"
              >
                Upload Course Material
              </button>
            </div>
          )}
        </div>
      )}

      {/* TAB 4: PROGRAM DISCUSSIONS */}
      {activeTab === 'discussions' && (
        <div className="space-y-4">
          {/* Forum Header & Actions */}
          <div className="p-3.5 sm:p-4 rounded-2xl bg-zinc-950/85 border border-white/10 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none flex-1">
              {(['all', 'Academics', 'Course Advice', 'Study Groups', 'Career & Internships', 'General', 'Announcements'] as const).map(cat => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setDiscCategory(cat)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all shrink-0 cursor-pointer ${
                    discCategory === cat
                      ? 'bg-cyan-400 text-black font-bold'
                      : 'bg-zinc-900 text-white/60 hover:text-white'
                  }`}
                >
                  {cat === 'all' ? 'All Topics' : cat}
                </button>
              ))}
            </div>

            <button
              type="button"
              onClick={() => {
                if (!studentUser) requestAuth();
                else setIsNewPostModalOpen(true);
              }}
              className="px-3.5 py-2 rounded-xl bg-cyan-400 text-black text-xs font-bold hover:bg-cyan-300 transition-colors shrink-0 cursor-pointer flex items-center justify-center gap-1.5 shadow-sm shadow-cyan-400/20"
            >
              <Plus className="w-3.5 h-3.5" />
              New Discussion Post
            </button>
          </div>

          {/* Posts Feed */}
          {filteredDiscussions.length > 0 ? (
            <div className="space-y-3.5">
              {filteredDiscussions.map(post => (
                <div
                  key={post.id}
                  className="p-4 sm:p-5 rounded-2xl bg-zinc-950/80 border border-white/10 space-y-3.5"
                >
                  {/* Post Author & Tags */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-full bg-cyan-500/20 border border-cyan-500/30 flex items-center justify-center text-cyan-300 font-bold text-xs uppercase overflow-hidden shrink-0">
                        {post.authorAvatar ? (
                          <img src={post.authorAvatar} alt={post.authorName} className="w-full h-full object-cover" />
                        ) : (
                          post.authorName[0]
                        )}
                      </div>
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-xs font-bold text-white">{post.authorName}</span>
                          <span className="text-[10px] text-white/40">• {post.authorProgram}</span>
                        </div>
                        <div className="text-[10px] text-white/40">
                          {new Date(post.createdAt).toLocaleDateString()} at {new Date(post.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-[10px] font-semibold text-cyan-400 bg-cyan-950/40 border border-cyan-500/30 px-2 py-0.5 rounded-md">
                        {post.category}
                      </span>
                      {post.semesterTag && (
                        <span className="text-[10px] text-white/50 bg-white/5 px-2 py-0.5 rounded-md">
                          {post.semesterTag}
                        </span>
                      )}
                      {post.isPinned && (
                        <span className="text-[10px] text-amber-300 bg-amber-950/40 border border-amber-500/30 px-2 py-0.5 rounded-md flex items-center gap-1">
                          <Pin className="w-2.5 h-2.5" /> Pinned
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Post Title & Content */}
                  <div>
                    <h4 className="text-sm sm:text-base font-bold text-white mb-1">{post.title}</h4>
                    <p className="text-xs text-white/75 leading-relaxed whitespace-pre-line">{post.content}</p>
                    {post.courseTag && (
                      <div className="mt-2">
                        <span className="text-[10px] font-mono text-cyan-400 bg-zinc-900 px-2 py-0.5 rounded-md border border-white/5">
                          Tag: {post.courseTag}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Post Actions */}
                  <div className="flex items-center justify-between text-xs pt-2.5 border-t border-white/10">
                    <div className="flex items-center gap-4 text-white/50">
                      <button
                        type="button"
                        onClick={() => handleUpvotePost(post.id)}
                        className={`flex items-center gap-1.5 transition-colors cursor-pointer ${
                          post.hasUpvoted ? 'text-cyan-400 font-bold' : 'hover:text-white'
                        }`}
                      >
                        <ThumbsUp className="w-3.5 h-3.5" />
                        <span>{post.upvotesCount} Upvotes</span>
                      </button>

                      <div className="flex items-center gap-1.5">
                        <MessageSquare className="w-3.5 h-3.5" />
                        <span>{post.comments?.length || 0} Replies</span>
                      </div>
                    </div>
                  </div>

                  {/* Comments Thread */}
                  {post.comments && post.comments.length > 0 && (
                    <div className="space-y-2 pt-1.5 pl-3.5 border-l-2 border-white/10">
                      {post.comments.map(c => (
                        <div key={c.id} className="p-2.5 rounded-xl bg-zinc-900/75 border border-white/5 text-xs">
                          <div className="flex items-center justify-between gap-2 mb-0.5">
                            <span className="font-bold text-white text-[11px]">{c.authorName}</span>
                            <span className="text-[10px] text-white/40">
                              {new Date(c.createdAt).toLocaleDateString()}
                            </span>
                          </div>
                          <p className="text-white/70 leading-relaxed text-[11px]">{c.content}</p>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Add Reply Input */}
                  <div className="flex items-center gap-2 pt-1">
                    <input
                      type="text"
                      value={commentInputMap[post.id] || ''}
                      onChange={e => setCommentInputMap({ ...commentInputMap, [post.id]: e.target.value })}
                      onKeyDown={e => {
                        if (e.key === 'Enter') handleAddComment(post.id);
                      }}
                      placeholder="Write a constructive peer reply..."
                      className="flex-1 px-3 py-2 bg-zinc-900 border border-white/10 rounded-xl text-xs text-white placeholder-white/35 focus:outline-none focus:border-cyan-400"
                    />
                    <button
                      type="button"
                      onClick={() => handleAddComment(post.id)}
                      className="px-3 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-cyan-400 text-xs font-semibold transition-colors cursor-pointer"
                    >
                      <Send className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="max-w-lg mx-auto text-center py-7 px-5 rounded-2xl bg-zinc-950/75 border border-white/10">
              <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center mx-auto mb-2.5 text-cyan-400">
                <MessageSquare className="w-5 h-5" />
              </div>
              <p className="text-sm font-bold text-white">No discussions in this topic yet</p>
              <p className="text-xs text-white/50 mt-1 mb-4">
                Start a conversation with your {program.shortCode} peers about courses, study groups, or exam prep.
              </p>
              <div className="flex items-center justify-center gap-2">
                {discCategory !== 'all' && (
                  <button
                    type="button"
                    onClick={() => setDiscCategory('all')}
                    className="px-3.5 py-2 rounded-xl bg-zinc-900 border border-white/10 text-white/80 hover:text-white text-xs font-semibold cursor-pointer"
                  >
                    Show All Topics
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => {
                    if (!studentUser) requestAuth();
                    else setIsNewPostModalOpen(true);
                  }}
                  className="px-3.5 py-2 rounded-xl bg-cyan-400 text-black text-xs font-bold hover:bg-cyan-300 cursor-pointer"
                >
                  Create Discussion Post
                </button>
              </div>
            </div>
          )}

          {/* New Discussion Modal */}
          {isNewPostModalOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
              <div className="bg-zinc-950 border border-cyan-500/40 rounded-3xl w-full max-w-lg p-6 shadow-2xl relative">
                <button
                  type="button"
                  onClick={() => setIsNewPostModalOpen(false)}
                  className="absolute right-4 top-4 p-1 rounded-lg text-white/50 hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
                <h3 className="text-lg font-bold text-white mb-1">Create Discussion Post</h3>
                <p className="text-xs text-white/50 mb-4">Post a question, advice, or study group invite for {program.name}</p>

                <form onSubmit={handleCreatePost} className="space-y-3.5">
                  <div>
                    <label className="block text-xs font-semibold text-white/80 mb-1">Post Title *</label>
                    <input
                      type="text"
                      required
                      value={newPostTitle}
                      onChange={e => setNewPostTitle(e.target.value)}
                      placeholder="e.g. Best strategies for preparing CS-201 Red-Black Trees midterm"
                      className="w-full px-3 py-2 bg-zinc-900 border border-white/15 rounded-xl text-xs text-white focus:outline-none focus:border-cyan-400"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-white/80 mb-1">Category *</label>
                      <select
                        value={newPostCategory}
                        onChange={e => setNewPostCategory(e.target.value as any)}
                        className="w-full px-3 py-2 bg-zinc-900 border border-white/15 rounded-xl text-xs text-white focus:outline-none focus:border-cyan-400"
                      >
                        <option value="Academics">Academics</option>
                        <option value="Course Advice">Course Advice</option>
                        <option value="Study Groups">Study Groups</option>
                        <option value="Career & Internships">Career &amp; Internships</option>
                        <option value="General">General</option>
                        <option value="Announcements">Announcements</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-white/80 mb-1">Semester Tag</label>
                      <input
                        type="text"
                        value={newPostSemesterTag}
                        onChange={e => setNewPostSemesterTag(e.target.value)}
                        placeholder="e.g. Semester 3"
                        className="w-full px-3 py-2 bg-zinc-900 border border-white/15 rounded-xl text-xs text-white focus:outline-none focus:border-cyan-400"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-white/80 mb-1">Course Tag (Optional)</label>
                    <input
                      type="text"
                      value={newPostCourseTag}
                      onChange={e => setNewPostCourseTag(e.target.value)}
                      placeholder="e.g. CS-201 Data Structures"
                      className="w-full px-3 py-2 bg-zinc-900 border border-white/15 rounded-xl text-xs text-white focus:outline-none focus:border-cyan-400"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-white/80 mb-1">Content / Details *</label>
                    <textarea
                      required
                      rows={4}
                      value={newPostContent}
                      onChange={e => setNewPostContent(e.target.value)}
                      placeholder="Provide full context, questions, or resources..."
                      className="w-full px-3 py-2 bg-zinc-900 border border-white/15 rounded-xl text-xs text-white focus:outline-none focus:border-cyan-400"
                    />
                  </div>

                  <div className="flex justify-end gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => setIsNewPostModalOpen(false)}
                      className="px-4 py-2 rounded-xl text-xs font-semibold text-white/60 hover:text-white"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-2 rounded-xl bg-cyan-400 text-black text-xs font-bold hover:bg-cyan-300 shadow-md shadow-cyan-400/20"
                    >
                      Publish Post
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 5: DOUBT CENTER (Q&A with Accepted Answers) */}
      {activeTab === 'doubts' && (
        <div className="space-y-4">
          {/* Header & Filter Bar */}
          <div className="p-3.5 sm:p-4 rounded-2xl bg-zinc-950/85 border border-white/10 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none">
              {(['all', 'unanswered', 'answered'] as const).map(f => (
                <button
                  key={f}
                  type="button"
                  onClick={() => setDoubtFilter(f)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer shrink-0 ${
                    doubtFilter === f
                      ? 'bg-amber-400 text-black font-bold'
                      : 'bg-zinc-900 text-white/60 hover:text-white'
                  }`}
                >
                  {f === 'all' ? 'All Doubts' : f === 'unanswered' ? 'Unanswered' : '✓ Solved Doubts'}
                </button>
              ))}
            </div>

            <button
              type="button"
              onClick={() => {
                if (!studentUser) requestAuth();
                else setIsAskDoubtModalOpen(true);
              }}
              className="px-3.5 py-2 rounded-xl bg-amber-400 text-black text-xs font-bold hover:bg-amber-300 transition-colors shrink-0 cursor-pointer flex items-center justify-center gap-1.5 shadow-sm shadow-amber-400/20"
            >
              <HelpCircle className="w-3.5 h-3.5" />
              Ask a Doubt
            </button>
          </div>

          {/* Doubts List */}
          {filteredDoubts.length > 0 ? (
            <div className="space-y-3.5">
              {filteredDoubts.map(doubt => (
                <div
                  key={doubt.id}
                  className="p-4 sm:p-5 rounded-2xl bg-zinc-950/80 border border-white/10 space-y-3.5"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono text-xs font-bold text-cyan-400 bg-cyan-950/40 border border-cyan-500/30 px-2 py-0.5 rounded-md">
                        {doubt.courseCode}
                      </span>
                      {doubt.status === 'answered' ? (
                        <span className="text-[10px] text-emerald-300 bg-emerald-950/40 border border-emerald-500/30 px-2 py-0.5 rounded-md font-bold flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3 text-emerald-400" /> Solved Answer
                        </span>
                      ) : (
                        <span className="text-[10px] text-amber-300 bg-amber-950/40 border border-amber-500/30 px-2 py-0.5 rounded-md font-bold">
                          Awaiting Solution
                        </span>
                      )}
                      {doubt.semesterTag && (
                        <span className="text-[10px] text-white/50 bg-white/5 px-2 py-0.5 rounded-md">
                          {doubt.semesterTag}
                        </span>
                      )}
                    </div>

                    <div className="text-[10px] text-white/40 shrink-0">
                      Asked by <span className="text-white/70 font-semibold">{doubt.authorName}</span>
                    </div>
                  </div>

                  <div>
                    <h4 className="text-sm sm:text-base font-bold text-white mb-1">{doubt.title}</h4>
                    <p className="text-xs text-white/75 leading-relaxed whitespace-pre-line">{doubt.content}</p>

                    {/* Attachments */}
                    {doubt.attachments && doubt.attachments.length > 0 && (
                      <div className="mt-2.5 flex items-center gap-2 flex-wrap">
                        {doubt.attachments.map(att => (
                          <div
                            key={att.name}
                            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-zinc-900 border border-white/10 text-xs text-cyan-400"
                          >
                            <Paperclip className="w-3 h-3" />
                            <span>{att.name}</span>
                            {att.size && <span className="text-white/40">({att.size})</span>}
                          </div>
                        ))}
                      </div>
                    )}

                    <div className="flex items-center gap-1.5 flex-wrap mt-2.5">
                      {doubt.tags.map(t => (
                        <span key={t} className="text-[10px] text-white/45 bg-zinc-900 px-2 py-0.5 rounded-md">
                          #{t}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Upvote Doubt */}
                  <div className="flex items-center justify-between text-xs pt-2 border-t border-white/5">
                    <button
                      type="button"
                      onClick={() => handleUpvoteDoubt(doubt.id)}
                      className={`flex items-center gap-1.5 transition-colors cursor-pointer ${
                        doubt.hasUpvoted ? 'text-amber-400 font-bold' : 'text-white/50 hover:text-white'
                      }`}
                    >
                      <ThumbsUp className="w-3.5 h-3.5" />
                      <span>{doubt.upvotesCount} Upvotes</span>
                    </button>
                    <span className="text-white/40 text-[11px]">{doubt.answers.length} Solutions Submitted</span>
                  </div>

                  {/* Answers Section */}
                  {doubt.answers && doubt.answers.length > 0 && (
                    <div className="space-y-2.5 pt-1.5">
                      <h5 className="text-[11px] font-bold text-white/55 uppercase tracking-wider">Solutions &amp; Answers:</h5>
                      {doubt.answers.map(ans => (
                        <div
                          key={ans.id}
                          className={`p-3.5 rounded-xl border transition-all ${
                            ans.isAccepted
                              ? 'bg-emerald-950/20 border-emerald-500/40 shadow-sm'
                              : 'bg-zinc-900/75 border-white/5'
                          }`}
                        >
                          <div className="flex items-center justify-between gap-2 mb-1.5">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-xs font-bold text-white">{ans.authorName}</span>
                              {ans.authorRole && (
                                <span className="text-[10px] text-cyan-400 bg-cyan-950/40 border border-cyan-500/20 px-1.5 py-0.5 rounded">
                                  {ans.authorRole}
                                </span>
                              )}
                              {ans.isAccepted && (
                                <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-md flex items-center gap-1 border border-emerald-500/30">
                                  <Check className="w-3 h-3" /> Accepted Solution
                                </span>
                              )}
                            </div>

                            {/* Author control to accept answer */}
                            {studentUser && !ans.isAccepted && (
                              <button
                                type="button"
                                onClick={() => handleAcceptAnswer(doubt.id, ans.id)}
                                className="text-[10px] font-semibold text-emerald-400 hover:text-emerald-300 border border-emerald-500/30 px-2 py-1 rounded-lg cursor-pointer"
                              >
                                Mark as Accepted
                              </button>
                            )}
                          </div>

                          <p className="text-xs text-white/80 leading-relaxed whitespace-pre-line">{ans.content}</p>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Submit Answer Input */}
                  <div className="flex items-center gap-2 pt-2 border-t border-white/5">
                    <input
                      type="text"
                      value={answerInputMap[doubt.id] || ''}
                      onChange={e => setAnswerInputMap({ ...answerInputMap, [doubt.id]: e.target.value })}
                      onKeyDown={e => {
                        if (e.key === 'Enter') handleAddAnswer(doubt.id);
                      }}
                      placeholder="Know the answer? Provide your solution to help your peer..."
                      className="flex-1 px-3 py-2 bg-zinc-900 border border-white/10 rounded-xl text-xs text-white placeholder-white/35 focus:outline-none focus:border-amber-400"
                    />
                    <button
                      type="button"
                      onClick={() => handleAddAnswer(doubt.id)}
                      className="px-3.5 py-2 rounded-xl bg-amber-400 hover:bg-amber-300 text-black text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5 shrink-0"
                    >
                      <Send className="w-3.5 h-3.5" />
                      Submit Solution
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="max-w-lg mx-auto text-center py-7 px-5 rounded-2xl bg-zinc-950/75 border border-white/10">
              <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center mx-auto mb-2.5 text-amber-400">
                <HelpCircle className="w-5 h-5" />
              </div>
              <p className="text-sm font-bold text-white">No doubts match this filter</p>
              <p className="text-xs text-white/50 mt-1 mb-4">
                Have a question on a problem set, proof, or lab assignment? Ask your program cohort for step-by-step solutions.
              </p>
              <div className="flex items-center justify-center gap-2">
                {doubtFilter !== 'all' && (
                  <button
                    type="button"
                    onClick={() => setDoubtFilter('all')}
                    className="px-3.5 py-2 rounded-xl bg-zinc-900 border border-white/10 text-white/80 hover:text-white text-xs font-semibold cursor-pointer"
                  >
                    View All Doubts
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => {
                    if (!studentUser) requestAuth();
                    else setIsAskDoubtModalOpen(true);
                  }}
                  className="px-3.5 py-2 rounded-xl bg-amber-400 text-black text-xs font-bold hover:bg-amber-300 cursor-pointer"
                >
                  Ask a Doubt
                </button>
              </div>
            </div>
          )}

          {/* Ask Doubt Modal */}
          {isAskDoubtModalOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
              <div className="bg-zinc-950 border border-amber-500/40 rounded-3xl w-full max-w-lg p-6 shadow-2xl relative">
                <button
                  type="button"
                  onClick={() => setIsAskDoubtModalOpen(false)}
                  className="absolute right-4 top-4 p-1 rounded-lg text-white/50 hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
                <h3 className="text-lg font-bold text-white mb-1">Ask a Doubt in {program.name}</h3>
                <p className="text-xs text-white/50 mb-4">Post a specific homework question or conceptual doubt to your peers</p>

                <form onSubmit={handleCreateDoubt} className="space-y-3.5">
                  <div>
                    <label className="block text-xs font-semibold text-white/80 mb-1">Doubt Title *</label>
                    <input
                      type="text"
                      required
                      value={doubtTitle}
                      onChange={e => setDoubtTitle(e.target.value)}
                      placeholder="e.g. Why is amortized push_back O(1) in dynamic array resizing?"
                      className="w-full px-3 py-2 bg-zinc-900 border border-white/15 rounded-xl text-xs text-white focus:outline-none focus:border-amber-400"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-white/80 mb-1">Course / Subject *</label>
                      <input
                        type="text"
                        required
                        value={doubtCourseCode}
                        onChange={e => setDoubtCourseCode(e.target.value)}
                        placeholder="e.g. Engineering, Circuit Analysis, Data Structures"
                        className="w-full px-3 py-2 bg-zinc-900 border border-white/15 rounded-xl text-xs text-white focus:outline-none focus:border-amber-400"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-white/80 mb-1">Semester Tag</label>
                      <input
                        type="text"
                        value={doubtSemesterTag}
                        onChange={e => setDoubtSemesterTag(e.target.value)}
                        placeholder="e.g. Semester 3"
                        className="w-full px-3 py-2 bg-zinc-900 border border-white/15 rounded-xl text-xs text-white focus:outline-none focus:border-amber-400"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-white/80 mb-1">Tags (Comma-separated)</label>
                    <input
                      type="text"
                      value={doubtTagsInput}
                      onChange={e => setDoubtTagsInput(e.target.value)}
                      placeholder="e.g. Algorithms, Data Structures, Complexity"
                      className="w-full px-3 py-2 bg-zinc-900 border border-white/15 rounded-xl text-xs text-white focus:outline-none focus:border-amber-400"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-white/80 mb-1">Detailed Explanation &amp; Code/Work *</label>
                    <textarea
                      required
                      rows={4}
                      value={doubtContent}
                      onChange={e => setDoubtContent(e.target.value)}
                      placeholder="Explain your current thought process, what you have tried, and where you are stuck..."
                      className="w-full px-3 py-2 bg-zinc-900 border border-white/15 rounded-xl text-xs text-white focus:outline-none focus:border-amber-400"
                    />
                  </div>

                  <div className="flex justify-end gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => setIsAskDoubtModalOpen(false)}
                      className="px-4 py-2 rounded-xl text-xs font-semibold text-white/60 hover:text-white"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-2 rounded-xl bg-amber-400 text-black text-xs font-bold hover:bg-amber-300 shadow-md shadow-amber-400/20"
                    >
                      Post Doubt
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
