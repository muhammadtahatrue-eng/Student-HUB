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

export type ProgramTabKey = 'overview' | 'materials' | 'courses' | 'discussions' | 'doubts';

interface ProgramDirectoryViewProps {
  programId: string;
  allNotes: StudyNote[];
  currentUser: StudentUser | null;
  onBackToExplore: () => void;
  onPreviewNote: (note: StudyNote) => void;
  onDownloadNote: (note: StudyNote) => void;
  onToggleUpvoteNote: (noteId: string) => void;
  onUploadToProgram: (programId: string, courseCode?: string) => void;
  onOpenAuthModal: () => void;
}

export const ProgramDirectoryView: React.FC<ProgramDirectoryViewProps> = ({
  programId,
  allNotes,
  currentUser,
  onBackToExplore,
  onPreviewNote,
  onDownloadNote,
  onToggleUpvoteNote,
  onUploadToProgram,
  onOpenAuthModal
}) => {
  const [activeTab, setActiveTab] = useState<ProgramTabKey>('overview');
  const [followedIds, setFollowedIds] = useState<string[]>(() => getFollowedProgramIds());

  // Program details
  const program = useMemo(() => getProgramById(programId), [programId]);

  // Scoped Notes for this Program
  const programNotes = useMemo(() => {
    return allNotes.filter(
      n =>
        n.programId === programId ||
        (program && n.programName?.toLowerCase() === program.name.toLowerCase()) ||
        // Fallback match by subject or default to top program if none
        (programId === 'bs-cs' && (!n.programId || n.subject === 'Computer Science'))
    );
  }, [allNotes, programId, program]);

  // Notes filtering inside "Study Materials" tab
  const [notesSearch, setNotesSearch] = useState('');
  const [notesSemesterFilter, setNotesSemesterFilter] = useState<string>('all');
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
        if (notesTypeFilter !== 'all' && note.materialType !== notesTypeFilter) {
          return false;
        }
        if (notesSearch.trim()) {
          const q = notesSearch.toLowerCase().trim();
          const matchTitle = note.title.toLowerCase().includes(q);
          const matchCode = note.courseCode.toLowerCase().includes(q);
          const matchCourse = note.courseName.toLowerCase().includes(q);
          const matchProf = note.professor.toLowerCase().includes(q);
          if (!matchTitle && !matchCode && !matchCourse && !matchProf) {
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
  }, [programNotes, notesSemesterFilter, notesTypeFilter, notesSearch, notesSortBy]);

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
      <div className="text-center py-20 font-outfit">
        <h2 className="text-xl font-bold text-white">Degree Program Not Found</h2>
        <p className="text-sm text-white/50 mt-1 mb-4">The requested academic cohort does not exist or has been relocated.</p>
        <button
          type="button"
          onClick={onBackToExplore}
          className="px-4 py-2 bg-cyan-400 text-black font-semibold rounded-xl text-xs hover:bg-cyan-300"
        >
          Return to Explore Programs
        </button>
      </div>
    );
  }

  const isFollowed = followedIds.includes(program.id);

  const handleToggleFollow = () => {
    toggleFollowProgram(program.id);
    setFollowedIds(getFollowedProgramIds());
  };

  // Discussions actions
  const handleCreatePost = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) {
      onOpenAuthModal();
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
      author: currentUser
    });

    setDiscussions([created, ...discussions]);
    setIsNewPostModalOpen(false);
    setNewPostTitle('');
    setNewPostContent('');
    setNewPostSemesterTag('');
    setNewPostCourseTag('');
  };

  const handleUpvotePost = (postId: string) => {
    if (!currentUser) {
      onOpenAuthModal();
      return;
    }
    const { upvotesCount, hasUpvoted } = toggleUpvoteProgramDiscussion(postId);
    setDiscussions(prev =>
      prev.map(p => (p.id === postId ? { ...p, upvotesCount, hasUpvoted } : p))
    );
  };

  const handleAddComment = (postId: string) => {
    if (!currentUser) {
      onOpenAuthModal();
      return;
    }
    const text = commentInputMap[postId]?.trim();
    if (!text) return;

    const comment = addProgramDiscussionComment({
      postId,
      content: text,
      author: currentUser
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
    if (!currentUser) {
      onOpenAuthModal();
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
      author: currentUser
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
    if (!currentUser) {
      onOpenAuthModal();
      return;
    }
    const { upvotesCount, hasUpvoted } = toggleUpvoteProgramDoubt(doubtId);
    setDoubts(prev =>
      prev.map(d => (d.id === doubtId ? { ...d, upvotesCount, hasUpvoted } : d))
    );
  };

  const handleAddAnswer = (doubtId: string) => {
    if (!currentUser) {
      onOpenAuthModal();
      return;
    }
    const text = answerInputMap[doubtId]?.trim();
    if (!text) return;

    const answer = addProgramDoubtAnswer({
      questionId: doubtId,
      content: text,
      author: currentUser,
      role: currentUser.degreeTier === "Master's" || currentUser.degreeTier === 'PhD' ? 'Graduate Peer' : 'Peer Student'
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
    if (!currentUser) {
      onOpenAuthModal();
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
    <div className="font-outfit pb-24">
      {/* Breadcrumb Navigation */}
      <nav aria-label="Breadcrumb" className="mb-4 flex items-center gap-2 text-xs text-white/50">
        <button
          type="button"
          onClick={onBackToExplore}
          className="hover:text-cyan-400 flex items-center gap-1 transition-colors cursor-pointer"
        >
          <ChevronLeft className="w-3.5 h-3.5" />
          <span>Explore Programs</span>
        </button>
        <span>/</span>
        <span className="text-white/40">{program.degreeTier}</span>
        <span>/</span>
        <span className="text-cyan-400 font-semibold truncate max-w-xs">{program.name}</span>
      </nav>

      {/* Program Banner & Header Card */}
      <div className="rounded-3xl border border-white/10 bg-gradient-to-b from-zinc-900/90 via-zinc-950/90 to-black p-6 sm:p-8 backdrop-blur-xl shadow-2xl relative overflow-hidden mb-6">
        <div className="absolute top-0 right-10 w-96 h-48 bg-cyan-500/10 blur-[100px] pointer-events-none rounded-full" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="max-w-3xl">
            <div className="flex items-center gap-2.5 flex-wrap mb-3">
              <span className={`text-xs font-mono px-2.5 py-0.5 rounded-full border uppercase font-bold ${getTierColor(program.degreeTier)}`}>
                {program.degreeTier} Degree
              </span>
              <span className="text-xs font-mono px-2.5 py-0.5 rounded-full bg-white/5 border border-white/10 text-white/70">
                {program.shortCode}
              </span>
              {program.badge && (
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-cyan-500/15 text-cyan-300 border border-cyan-500/30 font-medium">
                  ★ {program.badge}
                </span>
              )}
            </div>

            <h1 className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-white tracking-tight">
              {program.name}
            </h1>
            <p className="mt-1 text-sm text-cyan-400/80 font-medium">
              {program.discipline} • {program.durationYears} Years ({program.totalSemesters} Semesters) • {program.totalCredits} Credit Hours
            </p>
            <p className="mt-3 text-xs sm:text-sm text-white/65 leading-relaxed max-w-2xl">
              {program.description}
            </p>
          </div>

          {/* Action CTAs */}
          <div className="flex flex-col sm:flex-row md:flex-col gap-2.5 shrink-0">
            <button
              type="button"
              onClick={() => onUploadToProgram(program.id)}
              className="px-4 py-2.5 rounded-xl bg-cyan-400 text-black text-xs font-bold hover:bg-cyan-300 transition-colors cursor-pointer shadow-lg shadow-cyan-400/20 flex items-center justify-center gap-2"
            >
              <Plus className="w-4 h-4" />
              Upload Resource to Program
            </button>

            <button
              type="button"
              onClick={handleToggleFollow}
              className={`px-4 py-2.5 rounded-xl border text-xs font-semibold transition-all cursor-pointer flex items-center justify-center gap-2 ${
                isFollowed
                  ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40'
                  : 'bg-zinc-800/80 hover:bg-zinc-800 text-white border-white/10'
              }`}
            >
              {isFollowed ? (
                <>
                  <BookmarkCheck className="w-4 h-4 text-cyan-400" />
                  Following Program
                </>
              ) : (
                <>
                  <Bookmark className="w-4 h-4" />
                  Follow Program
                </>
              )}
            </button>
          </div>
        </div>

        {/* Quick Program Metrics Bar */}
        <div className="mt-6 pt-5 border-t border-white/10 grid grid-cols-2 sm:grid-cols-4 gap-4 text-center sm:text-left">
          <div className="p-3 rounded-xl bg-black/40 border border-white/5">
            <div className="text-[10px] text-white/40 uppercase tracking-wider">Enrolled Peers</div>
            <div className="text-lg font-bold text-white flex items-center sm:justify-start justify-center gap-1.5 mt-0.5">
              <Users className="w-4 h-4 text-cyan-400" />
              {program.activeStudents} Students
            </div>
          </div>
          <div className="p-3 rounded-xl bg-black/40 border border-white/5">
            <div className="text-[10px] text-white/40 uppercase tracking-wider">Vault Materials</div>
            <div className="text-lg font-bold text-white flex items-center sm:justify-start justify-center gap-1.5 mt-0.5">
              <BookOpen className="w-4 h-4 text-indigo-400" />
              {programNotes.length} Documents
            </div>
          </div>
          <div className="p-3 rounded-xl bg-black/40 border border-white/5">
            <div className="text-[10px] text-white/40 uppercase tracking-wider">Curriculum Semesters</div>
            <div className="text-lg font-bold text-white flex items-center sm:justify-start justify-center gap-1.5 mt-0.5">
              <Layers className="w-4 h-4 text-emerald-400" />
              {program.totalSemesters} Semesters
            </div>
          </div>
          <div className="p-3 rounded-xl bg-black/40 border border-white/5">
            <div className="text-[10px] text-white/40 uppercase tracking-wider">Doubts Solved</div>
            <div className="text-lg font-bold text-white flex items-center sm:justify-start justify-center gap-1.5 mt-0.5">
              <CheckCircle2 className="w-4 h-4 text-cyan-400" />
              {doubts.filter(d => d.status === 'answered').length} Solved
            </div>
          </div>
        </div>
      </div>

      {/* 5 Consistent Sub-Navigation Tabs */}
      <div className="sticky top-20 z-30 mb-6 bg-black/80 backdrop-blur-xl p-1.5 rounded-2xl border border-white/10 shadow-xl flex items-center gap-1 overflow-x-auto scrollbar-none">
        {[
          { key: 'overview', label: 'Overview', icon: Layers },
          { key: 'materials', label: `Study Materials (${programNotes.length})`, icon: BookOpen },
          { key: 'courses', label: 'Core Courses & Semesters', icon: GraduationCap },
          { key: 'discussions', label: `Discussions (${discussions.length})`, icon: MessageSquare },
          { key: 'doubts', label: `Doubt Center (${doubts.length})`, icon: HelpCircle }
        ].map(tab => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActiveTab(tab.key as ProgramTabKey)}
              className={`px-3.5 py-2 rounded-xl text-xs font-semibold transition-all duration-200 flex items-center gap-2 shrink-0 cursor-pointer ${
                isActive
                  ? 'bg-cyan-400 text-black shadow-[0_0_15px_rgba(0,240,255,0.3)] font-bold'
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
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Left 2 Cols: Academic Syllabus Summary */}
            <div className="md:col-span-2 space-y-6">
              <div className="p-6 rounded-2xl bg-zinc-900/60 border border-white/10">
                <h3 className="text-base font-bold text-white mb-2 flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-cyan-400" />
                  Program Core Architecture &amp; Outcomes
                </h3>
                <p className="text-xs text-white/70 leading-relaxed">
                  The {program.name} is structured to balance rigorous foundational theoretical concepts with state-of-the-art practical methodologies. Students complete {program.totalSemesters} semesters covering core computing, mathematics, and specialized electives.
                </p>

                <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="p-3 rounded-xl bg-black/40 border border-white/5">
                    <div className="text-xs font-bold text-cyan-400 mb-1">Degree Level Standards</div>
                    <div className="text-[11px] text-white/60">
                      Standardized {program.degreeTier} tier with international accreditation equivalents.
                    </div>
                  </div>
                  <div className="p-3 rounded-xl bg-black/40 border border-white/5">
                    <div className="text-xs font-bold text-indigo-400 mb-1">Shared Knowledge Vault</div>
                    <div className="text-[11px] text-white/60">
                      Materials uploaded by any student in this degree program are scoped directly to cohort peers.
                    </div>
                  </div>
                </div>
              </div>

              {/* Semester Jump Matrix */}
              <div className="p-6 rounded-2xl bg-zinc-900/60 border border-white/10">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-base font-bold text-white flex items-center gap-2">
                    <Layers className="w-4 h-4 text-emerald-400" />
                    Semester Progression
                  </h3>
                  <button
                    type="button"
                    onClick={() => setActiveTab('courses')}
                    className="text-xs text-cyan-400 hover:text-cyan-300 font-semibold cursor-pointer"
                  >
                    View All Courses &rarr;
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
                      className="p-3 rounded-xl bg-zinc-950/80 border border-white/5 hover:border-cyan-500/40 transition-all cursor-pointer group"
                    >
                      <div className="text-xs font-bold text-white group-hover:text-cyan-300">
                        Semester {sem.semesterNumber}
                      </div>
                      <div className="text-[10px] text-white/45 mt-0.5">
                        {sem.courses?.length || 0} Core Courses
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Right 1 Col: Community & Recent Activity */}
            <div className="space-y-6">
              <div className="p-5 rounded-2xl bg-zinc-900/60 border border-white/10">
                <h3 className="text-sm font-bold text-white mb-3 flex items-center gap-2">
                  <MessageSquare className="w-4 h-4 text-cyan-400" />
                  Recent Discussions
                </h3>
                {discussions.length > 0 ? (
                  <div className="space-y-3">
                    {discussions.slice(0, 3).map(d => (
                      <div
                        key={d.id}
                        onClick={() => setActiveTab('discussions')}
                        className="p-2.5 rounded-xl bg-black/40 border border-white/5 hover:border-cyan-500/30 transition-all cursor-pointer"
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
                  <p className="text-xs text-white/40">No discussions yet.</p>
                )}
                <button
                  type="button"
                  onClick={() => setActiveTab('discussions')}
                  className="mt-3 w-full py-2 text-center text-xs font-semibold text-cyan-400 hover:text-cyan-300 bg-cyan-950/30 rounded-xl border border-cyan-500/20 cursor-pointer"
                >
                  Join Cohort Forum
                </button>
              </div>

              {/* Doubt Center highlights */}
              <div className="p-5 rounded-2xl bg-zinc-900/60 border border-white/10">
                <h3 className="text-sm font-bold text-white mb-3 flex items-center gap-2">
                  <HelpCircle className="w-4 h-4 text-amber-400" />
                  Cohort Doubt Center
                </h3>
                {doubts.length > 0 ? (
                  <div className="space-y-3">
                    {doubts.slice(0, 2).map(q => (
                      <div
                        key={q.id}
                        onClick={() => setActiveTab('doubts')}
                        className="p-2.5 rounded-xl bg-black/40 border border-white/5 hover:border-amber-500/30 transition-all cursor-pointer"
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
                  <p className="text-xs text-white/40">No doubts posted yet.</p>
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
        </div>
      )}

      {/* TAB 2: STUDY MATERIALS (Lecture Notes, Past Papers, Assignments, Lab Manuals) */}
      {activeTab === 'materials' && (
        <div className="space-y-5">
          {/* Filters Bar */}
          <div className="p-4 rounded-2xl bg-zinc-900/80 border border-white/10 space-y-3">
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-white/40 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={notesSearch}
                  onChange={e => setNotesSearch(e.target.value)}
                  placeholder="Filter materials by title, course code (e.g. CS-201), professor..."
                  className="w-full pl-10 pr-4 py-2 bg-zinc-950 border border-white/10 rounded-xl text-xs text-white placeholder-white/35 focus:outline-none focus:border-cyan-400"
                />
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <span className="text-xs text-white/50">Sort:</span>
                <select
                  value={notesSortBy}
                  onChange={e => setNotesSortBy(e.target.value as any)}
                  className="bg-zinc-950 border border-white/10 rounded-xl px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-cyan-400 cursor-pointer"
                >
                  <option value="latest">Latest Uploads</option>
                  <option value="popular">Most Upvoted</option>
                  <option value="downloads">Most Downloaded</option>
                </select>
              </div>
            </div>

            {/* Semester & Type Filter Chips */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-2 border-t border-white/5">
              {/* Semester selector */}
              <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none pb-1">
                <span className="text-xs text-white/40 shrink-0 mr-1">Semester:</span>
                <button
                  type="button"
                  onClick={() => setNotesSemesterFilter('all')}
                  className={`px-2.5 py-1 text-xs rounded-lg font-medium transition-all shrink-0 cursor-pointer ${
                    notesSemesterFilter === 'all'
                      ? 'bg-cyan-400 text-black font-bold'
                      : 'bg-zinc-950 text-white/60 hover:text-white'
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
                        : 'bg-zinc-950 text-white/60 hover:text-white'
                    }`}
                  >
                    Sem {num}
                  </button>
                ))}
              </div>

              {/* Material Type selector */}
              <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none pb-1">
                <span className="text-xs text-white/40 shrink-0 mr-1">Type:</span>
                {Object.entries(MATERIAL_TYPE_LABELS).map(([k, meta]) => (
                  <button
                    key={k}
                    type="button"
                    onClick={() => setNotesTypeFilter(k)}
                    className={`px-2.5 py-1 text-xs rounded-lg font-medium transition-all shrink-0 cursor-pointer ${
                      notesTypeFilter === k
                        ? 'bg-indigo-500 text-white font-bold'
                        : 'bg-zinc-950 text-white/60 hover:text-white'
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
              {filteredMaterials.map(note => (
                <div
                  key={note.id}
                  className="p-5 rounded-2xl bg-zinc-900/60 border border-white/10 hover:border-cyan-500/40 transition-all flex flex-col justify-between group"
                >
                  <div>
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-bold text-cyan-400 bg-cyan-950/40 border border-cyan-500/30 px-2 py-0.5 rounded-lg">
                          {note.courseCode}
                        </span>
                        <span className="text-[10px] font-mono text-indigo-300 bg-indigo-950/40 border border-indigo-500/30 px-2 py-0.5 rounded-lg">
                          {MATERIAL_TYPE_LABELS[note.materialType]?.label || note.materialType}
                        </span>
                        {note.semesterNumber && (
                          <span className="text-[10px] text-white/50 bg-white/5 px-2 py-0.5 rounded-lg">
                            Sem {note.semesterNumber}
                          </span>
                        )}
                      </div>

                      <div className="text-[11px] text-white/40">
                        {note.pageCount} Pages
                      </div>
                    </div>

                    <h4
                      onClick={() => onPreviewNote(note)}
                      className="text-base font-bold text-white group-hover:text-cyan-300 transition-colors cursor-pointer line-clamp-1"
                    >
                      {note.title}
                    </h4>
                    <p className="text-xs text-white/50 mt-0.5 mb-2">
                      {note.courseName} • Prof. {note.professor}
                    </p>

                    <p className="text-xs text-white/65 line-clamp-2 leading-relaxed">
                      {note.description}
                    </p>

                    {/* Tags */}
                    <div className="flex items-center gap-1.5 flex-wrap mt-3">
                      {note.tags.slice(0, 4).map(tag => (
                        <span key={tag} className="text-[10px] text-white/45 bg-black/40 px-2 py-0.5 rounded-md">
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
                        onClick={() => onToggleUpvoteNote(note.id)}
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
                        className="px-3 py-1.5 rounded-lg bg-cyan-400 hover:bg-cyan-300 text-black font-bold text-xs transition-colors cursor-pointer flex items-center gap-1.5 shadow-md shadow-cyan-400/20"
                      >
                        <Download className="w-3.5 h-3.5" />
                        Download
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12 rounded-2xl bg-zinc-950/60 border border-white/10 p-6">
              <BookOpen className="w-10 h-10 text-white/20 mx-auto mb-2" />
              <p className="text-sm font-semibold text-white">No materials found matching this filter</p>
              <p className="text-xs text-white/50 mt-1 mb-4">Be the first student to upload a lecture note, past exam, or summary for this semester!</p>
              <button
                type="button"
                onClick={() => onUploadToProgram(program.id)}
                className="px-4 py-2 rounded-xl bg-cyan-400 text-black text-xs font-bold hover:bg-cyan-300"
              >
                Upload Resource Now
              </button>
            </div>
          )}
        </div>
      )}

      {/* TAB 3: CORE COURSES & SEMESTERS */}
      {activeTab === 'courses' && (
        <div className="space-y-6">
          {(program.semesters && program.semesters.length > 0) ? (
            program.semesters.map(sem => (
              <div
                key={sem.semesterNumber}
                className="p-6 rounded-3xl bg-zinc-900/60 border border-white/10 shadow-lg"
              >
                <div className="flex items-center justify-between mb-4 pb-3 border-b border-white/10">
                  <div className="flex items-center gap-3">
                    <span className="w-8 h-8 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 font-bold flex items-center justify-center text-sm">
                      {sem.semesterNumber}
                    </span>
                    <div>
                      <h3 className="text-base font-bold text-white">{sem.name}</h3>
                      <p className="text-xs text-white/50">{sem.courses.length} Core Curriculum Courses</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setNotesSemesterFilter(sem.semesterNumber.toString());
                      setActiveTab('materials');
                    }}
                    className="text-xs text-cyan-400 hover:text-cyan-300 font-semibold cursor-pointer"
                  >
                    View Semester Materials &rarr;
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {sem.courses.map(course => (
                    <div
                      key={course.id}
                      className="p-4 rounded-2xl bg-black/40 border border-white/5 hover:border-cyan-500/30 transition-all flex flex-col justify-between"
                    >
                      <div>
                        <div className="flex items-center justify-between gap-2 mb-1.5">
                          <span className="font-mono text-xs font-bold text-cyan-400 bg-cyan-950/40 border border-cyan-500/30 px-2 py-0.5 rounded-lg">
                            {course.code}
                          </span>
                          <span className="text-[11px] text-white/50">
                            {course.credits} Credits
                          </span>
                        </div>
                        <h4 className="text-sm font-bold text-white mb-1">{course.name}</h4>
                        <p className="text-xs text-white/60 leading-relaxed mb-2">{course.description}</p>
                        {course.instructor && (
                          <div className="text-[11px] text-white/40">
                            Instructor: <span className="text-white/70">{course.instructor}</span>
                          </div>
                        )}
                      </div>

                      <div className="mt-3 pt-2.5 border-t border-white/5 flex items-center justify-between text-xs">
                        <span className="text-[11px] text-white/45">
                          {course.resourceCount || 0} Vault Documents
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            setNotesSearch(course.code);
                            setActiveTab('materials');
                          }}
                          className="text-cyan-400 hover:text-cyan-300 font-semibold text-xs cursor-pointer"
                        >
                          Find Notes
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))
          ) : (
            <div className="text-center py-12 bg-zinc-950/60 rounded-2xl border border-white/10 p-6">
              <p className="text-sm text-white/60">Curriculum catalog being populated by student peer leaders.</p>
            </div>
          )}
        </div>
      )}

      {/* TAB 4: PROGRAM DISCUSSIONS */}
      {activeTab === 'discussions' && (
        <div className="space-y-5">
          {/* Forum Header & Actions */}
          <div className="p-4 rounded-2xl bg-zinc-900/80 border border-white/10 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none pb-1 flex-1">
              {(['all', 'Academics', 'Course Advice', 'Study Groups', 'Career & Internships', 'General', 'Announcements'] as const).map(cat => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setDiscCategory(cat)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all shrink-0 cursor-pointer ${
                    discCategory === cat
                      ? 'bg-cyan-400 text-black font-bold'
                      : 'bg-zinc-950 text-white/60 hover:text-white'
                  }`}
                >
                  {cat === 'all' ? 'All Topics' : cat}
                </button>
              ))}
            </div>

            <button
              type="button"
              onClick={() => {
                if (!currentUser) onOpenAuthModal();
                else setIsNewPostModalOpen(true);
              }}
              className="px-4 py-2 rounded-xl bg-cyan-400 text-black text-xs font-bold hover:bg-cyan-300 transition-colors shrink-0 cursor-pointer flex items-center justify-center gap-1.5 shadow-md shadow-cyan-400/20"
            >
              <Plus className="w-3.5 h-3.5" />
              New Discussion Post
            </button>
          </div>

          {/* Posts Feed */}
          <div className="space-y-4">
            {discussions
              .filter(d => (discCategory === 'all' ? true : d.category === discCategory))
              .map(post => (
                <div
                  key={post.id}
                  className="p-5 sm:p-6 rounded-2xl bg-zinc-900/60 border border-white/10 space-y-4"
                >
                  {/* Post Author & Tags */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-cyan-500/20 border border-cyan-500/30 flex items-center justify-center text-cyan-300 font-bold text-xs uppercase overflow-hidden">
                        {post.authorAvatar ? (
                          <img src={post.authorAvatar} alt={post.authorName} className="w-full h-full object-cover" />
                        ) : (
                          post.authorName[0]
                        )}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-white">{post.authorName}</span>
                          <span className="text-[10px] text-white/40">• {post.authorProgram}</span>
                        </div>
                        <div className="text-[10px] text-white/40">
                          {new Date(post.createdAt).toLocaleDateString()} at {new Date(post.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[10px] font-semibold text-cyan-400 bg-cyan-950/40 border border-cyan-500/30 px-2 py-0.5 rounded-full">
                        {post.category}
                      </span>
                      {post.semesterTag && (
                        <span className="text-[10px] text-white/50 bg-white/5 px-2 py-0.5 rounded-full">
                          {post.semesterTag}
                        </span>
                      )}
                      {post.isPinned && (
                        <span className="text-[10px] text-amber-300 bg-amber-950/40 border border-amber-500/30 px-2 py-0.5 rounded-full flex items-center gap-1">
                          <Pin className="w-2.5 h-2.5" /> Pinned
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Post Title & Content */}
                  <div>
                    <h4 className="text-base font-bold text-white mb-1.5">{post.title}</h4>
                    <p className="text-xs text-white/75 leading-relaxed whitespace-pre-line">{post.content}</p>
                    {post.courseTag && (
                      <div className="mt-2.5">
                        <span className="text-[10px] font-mono text-cyan-400 bg-black/40 px-2 py-1 rounded-md border border-white/5">
                          Tag: {post.courseTag}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Post Actions */}
                  <div className="flex items-center justify-between text-xs pt-3 border-t border-white/10">
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
                    <div className="space-y-2.5 pt-2 pl-4 border-l-2 border-white/10">
                      {post.comments.map(c => (
                        <div key={c.id} className="p-3 rounded-xl bg-black/40 border border-white/5 text-xs">
                          <div className="flex items-center justify-between gap-2 mb-1">
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
                      className="flex-1 px-3 py-2 bg-zinc-950 border border-white/10 rounded-xl text-xs text-white placeholder-white/35 focus:outline-none focus:border-cyan-400"
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
        <div className="space-y-5">
          {/* Header & Filter Bar */}
          <div className="p-4 rounded-2xl bg-zinc-900/80 border border-white/10 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              {(['all', 'unanswered', 'answered'] as const).map(f => (
                <button
                  key={f}
                  type="button"
                  onClick={() => setDoubtFilter(f)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                    doubtFilter === f
                      ? 'bg-amber-400 text-black font-bold'
                      : 'bg-zinc-950 text-white/60 hover:text-white'
                  }`}
                >
                  {f === 'all' ? 'All Doubts' : f === 'unanswered' ? 'Unanswered' : '✓ Solved Doubts'}
                </button>
              ))}
            </div>

            <button
              type="button"
              onClick={() => {
                if (!currentUser) onOpenAuthModal();
                else setIsAskDoubtModalOpen(true);
              }}
              className="px-4 py-2 rounded-xl bg-amber-400 text-black text-xs font-bold hover:bg-amber-300 transition-colors shrink-0 cursor-pointer flex items-center justify-center gap-1.5 shadow-md shadow-amber-400/20"
            >
              <HelpCircle className="w-3.5 h-3.5" />
              Ask a Doubt
            </button>
          </div>

          {/* Doubts List */}
          <div className="space-y-4">
            {doubts
              .filter(d => (doubtFilter === 'all' ? true : d.status === doubtFilter))
              .map(doubt => (
                <div
                  key={doubt.id}
                  className="p-5 sm:p-6 rounded-2xl bg-zinc-900/60 border border-white/10 space-y-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono text-xs font-bold text-cyan-400 bg-cyan-950/40 border border-cyan-500/30 px-2 py-0.5 rounded-lg">
                        {doubt.courseCode}
                      </span>
                      {doubt.status === 'answered' ? (
                        <span className="text-[10px] text-emerald-300 bg-emerald-950/40 border border-emerald-500/30 px-2 py-0.5 rounded-full font-bold flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3 text-emerald-400" /> Solved Answer
                        </span>
                      ) : (
                        <span className="text-[10px] text-amber-300 bg-amber-950/40 border border-amber-500/30 px-2 py-0.5 rounded-full font-bold">
                          Awaiting Solution
                        </span>
                      )}
                      {doubt.semesterTag && (
                        <span className="text-[10px] text-white/50 bg-white/5 px-2 py-0.5 rounded-full">
                          {doubt.semesterTag}
                        </span>
                      )}
                    </div>

                    <div className="text-[10px] text-white/40">
                      Asked by <span className="text-white/70 font-semibold">{doubt.authorName}</span>
                    </div>
                  </div>

                  <div>
                    <h4 className="text-base font-bold text-white mb-1.5">{doubt.title}</h4>
                    <p className="text-xs text-white/75 leading-relaxed whitespace-pre-line">{doubt.content}</p>

                    {/* Attachments */}
                    {doubt.attachments && doubt.attachments.length > 0 && (
                      <div className="mt-2.5 flex items-center gap-2 flex-wrap">
                        {doubt.attachments.map(att => (
                          <div
                            key={att.name}
                            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-black/40 border border-white/10 text-xs text-cyan-400"
                          >
                            <Paperclip className="w-3 h-3" />
                            <span>{att.name}</span>
                            {att.size && <span className="text-white/40">({att.size})</span>}
                          </div>
                        ))}
                      </div>
                    )}

                    <div className="flex items-center gap-1.5 flex-wrap mt-3">
                      {doubt.tags.map(t => (
                        <span key={t} className="text-[10px] text-white/45 bg-black/40 px-2 py-0.5 rounded-md">
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
                    <div className="space-y-3 pt-2">
                      <h5 className="text-xs font-bold text-white/60 uppercase tracking-wider">Solutions &amp; Answers:</h5>
                      {doubt.answers.map(ans => (
                        <div
                          key={ans.id}
                          className={`p-4 rounded-xl border transition-all ${
                            ans.isAccepted
                              ? 'bg-emerald-950/20 border-emerald-500/40 shadow-sm'
                              : 'bg-black/40 border-white/5'
                          }`}
                        >
                          <div className="flex items-center justify-between gap-2 mb-2">
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-bold text-white">{ans.authorName}</span>
                              {ans.authorRole && (
                                <span className="text-[10px] text-cyan-400 bg-cyan-950/40 border border-cyan-500/20 px-1.5 py-0.2 rounded">
                                  {ans.authorRole}
                                </span>
                              )}
                              {ans.isAccepted && (
                                <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full flex items-center gap-1 border border-emerald-500/30">
                                  <Check className="w-3 h-3" /> Accepted Solution
                                </span>
                              )}
                            </div>

                            {/* Author control to accept answer */}
                            {currentUser && !ans.isAccepted && (
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
                      className="flex-1 px-3 py-2 bg-zinc-950 border border-white/10 rounded-xl text-xs text-white placeholder-white/35 focus:outline-none focus:border-amber-400"
                    />
                    <button
                      type="button"
                      onClick={() => handleAddAnswer(doubt.id)}
                      className="px-4 py-2 rounded-xl bg-amber-400 hover:bg-amber-300 text-black text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5 shrink-0"
                    >
                      <Send className="w-3.5 h-3.5" />
                      Submit Solution
                    </button>
                  </div>
                </div>
              ))}
          </div>

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
                      <label className="block text-xs font-semibold text-white/80 mb-1">Course Code *</label>
                      <input
                        type="text"
                        required
                        value={doubtCourseCode}
                        onChange={e => setDoubtCourseCode(e.target.value)}
                        placeholder="e.g. CS-201, MATH-101"
                        className="w-full px-3 py-2 bg-zinc-900 border border-white/15 rounded-xl text-xs text-white focus:outline-none focus:border-amber-400 uppercase"
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
                      onChange={e => setNewPostContent(e.target.value)}
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
