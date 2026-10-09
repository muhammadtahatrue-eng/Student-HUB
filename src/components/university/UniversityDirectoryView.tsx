import React, { useState, useMemo } from 'react';
import {
  Building2,
  MapPin,
  Globe,
  Users,
  BookOpen,
  Calendar,
  Check,
  Plus,
  ArrowLeft,
  Search,
  MessageSquare,
  HelpCircle,
  FileText,
  Filter,
  Eye,
  Download,
  ThumbsUp,
  Share2,
  Lock,
  CheckCircle2,
  AlertCircle,
  Send,
  Flag,
  Award,
  ChevronRight,
  GraduationCap,
  Sparkles,
  Tag,
  Clock
} from 'lucide-react';
import {
  University,
  StudentUser,
  StudyNote,
  DiscussionPost,
  DiscussionCategory,
  DoubtQuestion,
  Department,
  Course,
  MaterialType
} from '../../types/index.ts';
import {
  getUniversityById,
  getFollowedUniversityIds,
  toggleFollowUniversity,
  getDepartmentsByUniversity,
  getCoursesByUniversity,
  getDiscussionsByUniversity,
  addDiscussionPost,
  addDiscussionComment,
  toggleDiscussionUpvote,
  reportDiscussionPost,
  getDoubtsByUniversity,
  addDoubtQuestion,
  addDoubtAnswer,
  acceptDoubtAnswer,
  toggleDoubtUpvote,
  getUniversityRealResourceCounts,
  checkDocumentAccess
} from '../../lib/universityStore.ts';
import { NoteCard } from '../NoteCard.tsx';

export type UniversityTabKey = 'overview' | 'materials' | 'departments' | 'discussions' | 'doubts';

interface UniversityDirectoryViewProps {
  universityId: string;
  user: StudentUser | null;
  notes: StudyNote[];
  activeTab?: UniversityTabKey;
  onTabChange?: (tab: UniversityTabKey) => void;
  onBackToExplore: () => void;
  onPreviewNote: (note: StudyNote) => void;
  onDownloadNote: (note: StudyNote) => void;
  onUpvoteNote: (noteId: string) => void;
  onOpenUpload: (prefilledUniversity?: string, prefilledCourse?: string) => void;
  onOpenSetupModal: () => void;
}

const DISCUSSION_CATEGORIES: DiscussionCategory[] = [
  'Academics',
  'Course Advice',
  'Study Groups',
  'Campus Life',
  'General',
  'Announcements'
];

export const UniversityDirectoryView: React.FC<UniversityDirectoryViewProps> = ({
  universityId,
  user,
  notes,
  activeTab = 'overview',
  onTabChange,
  onBackToExplore,
  onPreviewNote,
  onDownloadNote,
  onUpvoteNote,
  onOpenUpload,
  onOpenSetupModal
}) => {
  const [currentSubTab, setCurrentSubTab] = useState<UniversityTabKey>(activeTab);
  const university = useMemo(() => getUniversityById(universityId), [universityId]);

  // Tab switch wrapper
  const handleSelectTab = (tab: UniversityTabKey) => {
    setCurrentSubTab(tab);
    if (onTabChange) onTabChange(tab);
  };

  // Follow State
  const [followedIds, setFollowedIds] = useState<string[]>(() => getFollowedUniversityIds());
  const isFollowed = followedIds.includes(universityId);

  const handleToggleFollow = () => {
    const res = toggleFollowUniversity(universityId);
    setFollowedIds(res.followedIds);
  };

  // Departments & Courses
  const departments = useMemo(() => getDepartmentsByUniversity(universityId), [universityId]);
  const courses = useMemo(() => getCoursesByUniversity(universityId), [universityId]);

  // Filter notes linked to this university
  const universityNotes = useMemo(() => {
    if (!university) return [];
    return notes.filter(n => {
      if (n.universityId && n.universityId.toLowerCase() === universityId.toLowerCase()) return true;
      if (
        n.uploaderUniversity &&
        (n.uploaderUniversity.toLowerCase().includes(university.shortName.toLowerCase()) ||
          university.name.toLowerCase().includes(n.uploaderUniversity.toLowerCase()))
      ) {
        return true;
      }
      return false;
    });
  }, [notes, university, universityId]);

  // Study Materials State (Hierarchy filter)
  const [selectedDeptId, setSelectedDeptId] = useState<string>('all');
  const [selectedCourseCode, setSelectedCourseCode] = useState<string>('all');
  const [materialTypeFilter, setMaterialTypeFilter] = useState<string>('all');
  const [materialsSearch, setMaterialsSearch] = useState<string>('');

  const filteredMaterials = useMemo(() => {
    return universityNotes.filter(note => {
      if (selectedCourseCode !== 'all' && note.courseCode !== selectedCourseCode) {
        return false;
      }
      if (materialTypeFilter !== 'all' && note.materialType !== materialTypeFilter) {
        return false;
      }
      if (materialsSearch.trim()) {
        const q = materialsSearch.toLowerCase();
        const matchesTitle = note.title.toLowerCase().includes(q);
        const matchesCourse = note.courseCode.toLowerCase().includes(q) || note.courseName.toLowerCase().includes(q);
        const matchesTags = note.tags.some(t => t.toLowerCase().includes(q));
        if (!matchesTitle && !matchesCourse && !matchesTags) return false;
      }
      return true;
    });
  }, [universityNotes, selectedCourseCode, materialTypeFilter, materialsSearch]);

  // Discussions State
  const [discCategory, setDiscCategory] = useState<DiscussionCategory | 'all'>('all');
  const [discSort, setDiscSort] = useState<'latest' | 'popular'>('latest');
  const [discSearch, setDiscSearch] = useState('');
  const [discussionsVersion, setDiscussionsVersion] = useState(0);
  const [isNewPostModalOpen, setIsNewPostModalOpen] = useState(false);
  const [openCommentsPostId, setOpenCommentsPostId] = useState<string | null>(null);
  const [commentInput, setCommentInput] = useState('');

  // New Post Form
  const [newPostTitle, setNewPostTitle] = useState('');
  const [newPostContent, setNewPostContent] = useState('');
  const [newPostCategory, setNewPostCategory] = useState<DiscussionCategory>('Academics');
  const [newPostCourseTag, setNewPostCourseTag] = useState('');

  const discussions = useMemo(() => {
    return getDiscussionsByUniversity(universityId, {
      category: discCategory,
      searchQuery: discSearch,
      sortBy: discSort
    });
  }, [universityId, discCategory, discSearch, discSort, discussionsVersion]);

  // Doubts State
  const [doubtStatusFilter, setDoubtStatusFilter] = useState<'all' | 'answered' | 'unanswered'>('all');
  const [doubtSearch, setDoubtSearch] = useState('');
  const [doubtsVersion, setDoubtsVersion] = useState(0);
  const [isAskDoubtModalOpen, setIsAskDoubtModalOpen] = useState(false);
  const [expandedDoubtId, setExpandedDoubtId] = useState<string | null>(null);
  const [answerContent, setAnswerContent] = useState('');

  // Ask Doubt Form
  const [newDoubtTitle, setNewDoubtTitle] = useState('');
  const [newDoubtContent, setNewDoubtContent] = useState('');
  const [newDoubtDept, setNewDoubtDept] = useState(departments[0]?.name || 'Computer Science');
  const [newDoubtCourse, setNewDoubtCourse] = useState(courses[0]?.code || 'CS 106B');
  const [newDoubtTags, setNewDoubtTags] = useState('');

  const doubts = useMemo(() => {
    return getDoubtsByUniversity(universityId, {
      status: doubtStatusFilter,
      searchQuery: doubtSearch
    });
  }, [universityId, doubtStatusFilter, doubtSearch, doubtsVersion]);

  if (!university) {
    return (
      <div className="relative z-10 max-w-4xl mx-auto px-6 py-20 text-center">
        <h2 className="text-xl font-bold text-white mb-2">University Not Found</h2>
        <p className="text-sm text-white/50 mb-6">The requested campus directory does not exist or was moved.</p>
        <button
          onClick={onBackToExplore}
          className="px-5 py-2.5 bg-cyan-400 text-black text-xs font-bold rounded-xl"
        >
          Return to Explore
        </button>
      </div>
    );
  }

  const isMyUniversity =
    user?.university?.toLowerCase().includes(university.shortName.toLowerCase()) ||
    user?.university?.toLowerCase() === university.name.toLowerCase() ||
    user?.universityId === university.id;

  const stats = getUniversityRealResourceCounts(universityId, notes);

  // Discussion Handlers
  const handleCreatePost = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPostTitle.trim() || !newPostContent.trim()) return;

    addDiscussionPost(universityId, {
      title: newPostTitle,
      content: newPostContent,
      category: newPostCategory,
      courseTag: newPostCourseTag,
      authorName: user?.name || 'Anonymous Student',
      authorId: user?.id,
      authorAvatar: user?.avatarUrl,
      authorMajor: user?.majorOrField || 'Student Member',
      authorUniversity: university.name
    });

    setNewPostTitle('');
    setNewPostContent('');
    setNewPostCourseTag('');
    setIsNewPostModalOpen(false);
    setDiscussionsVersion(v => v + 1);
  };

  const handlePostUpvote = (postId: string) => {
    toggleDiscussionUpvote(postId);
    setDiscussionsVersion(v => v + 1);
  };

  const handleAddComment = (postId: string) => {
    if (!commentInput.trim()) return;
    addDiscussionComment(postId, {
      content: commentInput,
      authorName: user?.name || 'Peer Scholar',
      authorId: user?.id,
      authorAvatar: user?.avatarUrl,
      authorUniversity: user?.university || university.name
    });
    setCommentInput('');
    setDiscussionsVersion(v => v + 1);
  };

  // Doubt Handlers
  const handleCreateDoubt = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDoubtTitle.trim() || !newDoubtContent.trim()) return;

    const tagsArray = newDoubtTags
      .split(',')
      .map(t => t.trim())
      .filter(Boolean);

    addDoubtQuestion(universityId, {
      title: newDoubtTitle,
      content: newDoubtContent,
      department: newDoubtDept,
      courseCode: newDoubtCourse,
      tags: tagsArray.length > 0 ? tagsArray : ['Course Concept'],
      authorName: user?.name || 'Academic Inquirer',
      authorId: user?.id,
      authorAvatar: user?.avatarUrl,
      authorUniversity: university.name
    });

    setNewDoubtTitle('');
    setNewDoubtContent('');
    setNewDoubtTags('');
    setIsAskDoubtModalOpen(false);
    setDoubtsVersion(v => v + 1);
  };

  const handleAddAnswer = (questionId: string) => {
    if (!answerContent.trim()) return;
    addDoubtAnswer(questionId, {
      content: answerContent,
      authorName: user?.name || 'Peer Assistant',
      authorId: user?.id,
      authorAvatar: user?.avatarUrl,
      authorRole: isMyUniversity ? 'Verified Campus Peer' : 'Peer Contributor',
      authorUniversity: user?.university || university.name
    });
    setAnswerContent('');
    setDoubtsVersion(v => v + 1);
  };

  const handleAcceptAnswer = (questionId: string, answerId: string) => {
    acceptDoubtAnswer(questionId, answerId);
    setDoubtsVersion(v => v + 1);
  };

  const handleDoubtUpvote = (questionId: string) => {
    toggleDoubtUpvote(questionId);
    setDoubtsVersion(v => v + 1);
  };

  return (
    <div className="relative z-10 max-w-6xl w-full mx-auto px-4 sm:px-6 pl-14 sm:pl-20 md:pl-24 lg:px-8 py-6 sm:py-8 font-outfit">
      {/* Top Breadcrumb Navigation */}
      <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-xs text-white/50 mb-6 font-mono">
        <button
          onClick={onBackToExplore}
          className="hover:text-cyan-400 flex items-center gap-1 transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Explore</span>
        </button>
        <span className="text-white/20">/</span>
        <span className="text-white font-medium">{university.shortName}</span>
        <span className="text-white/20">/</span>
        <span className="text-cyan-400 capitalize">{currentSubTab.replace('-', ' ')}</span>
      </nav>

      {/* University Hero Header */}
      <div className="relative bg-zinc-950/80 backdrop-blur-xl border border-white/10 rounded-2xl overflow-hidden mb-8 shadow-2xl">
        {/* Banner Cover */}
        <div className="h-36 sm:h-44 w-full relative overflow-hidden bg-gradient-to-r from-zinc-900 via-neutral-900 to-black">
          <img
            src={university.bannerUrl}
            alt={university.name}
            className="w-full h-full object-cover opacity-35"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-zinc-950/60 to-transparent" />
        </div>

        {/* Header Details */}
        <div className="px-5 sm:px-8 pb-6 sm:pb-8 pt-0 relative flex flex-col md:flex-row md:items-end justify-between gap-6 -mt-14 sm:-mt-16">
          {/* Logo & Identity */}
          <div className="flex flex-col sm:flex-row sm:items-end gap-4 sm:gap-6">
            <img
              src={university.logoUrl}
              alt={university.name}
              className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl object-cover border-2 border-white/20 shadow-2xl bg-zinc-900 shrink-0"
            />
            <div>
              <div className="flex items-center gap-2 flex-wrap mb-1">
                <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-white tracking-tight">
                  {university.name}
                </h1>
                {isMyUniversity && (
                  <span className="px-2.5 py-0.5 rounded-full bg-cyan-400/10 border border-cyan-400/40 text-cyan-300 text-[11px] font-mono flex items-center gap-1">
                    <GraduationCap className="w-3 h-3" />
                    My Campus
                  </span>
                )}
              </div>

              {/* Clean typographic metadata (No static pills) */}
              <div className="flex items-center gap-2 text-xs text-white/60 flex-wrap">
                <span className="flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5 text-white/40" />
                  {university.location}
                </span>
                <span className="text-white/20">·</span>
                <span>Est. {university.establishedYear}</span>
                <span className="text-white/20">·</span>
                <a
                  href={university.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-cyan-400 hover:underline flex items-center gap-1"
                >
                  <Globe className="w-3 h-3" />
                  Official Website
                </a>
              </div>
            </div>
          </div>

          {/* Actions & Follow */}
          <div className="flex items-center gap-3 shrink-0">
            <button
              onClick={handleToggleFollow}
              className={`px-4 py-2.5 rounded-xl text-xs font-semibold border transition-all cursor-pointer flex items-center gap-2 ${
                isFollowed
                  ? 'bg-cyan-500/20 border-cyan-400/50 text-cyan-300'
                  : 'bg-white/5 border-white/10 text-white hover:bg-white/10 hover:border-white/20'
              }`}
            >
              {isFollowed ? (
                <>
                  <Check className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Following</span>
                </>
              ) : (
                <>
                  <Plus className="w-3.5 h-3.5" />
                  <span>Follow Campus</span>
                </>
              )}
            </button>

            <button
              onClick={() => onOpenUpload(university.name)}
              className="px-4 py-2.5 rounded-xl bg-white text-black text-xs font-bold hover:bg-white/90 transition-colors cursor-pointer flex items-center gap-1.5 shadow-lg"
            >
              <FileText className="w-3.5 h-3.5" />
              <span>Contribute Note</span>
            </button>
          </div>
        </div>

        {/* Stats Strip */}
        <div className="border-t border-white/10 bg-white/[0.01] px-5 sm:px-8 py-3 grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs font-mono">
          <div>
            <span className="text-white/40 block text-[11px]">Repository Docs</span>
            <span className="text-white font-bold text-sm">{stats.documentsCount} documents</span>
          </div>
          <div>
            <span className="text-white/40 block text-[11px]">Academic Courses</span>
            <span className="text-white font-bold text-sm">{stats.coursesCount} active</span>
          </div>
          <div>
            <span className="text-white/40 block text-[11px]">Verified Peers</span>
            <span className="text-white font-bold text-sm">{university.verifiedStudents.toLocaleString()} members</span>
          </div>
          <div>
            <span className="text-white/40 block text-[11px]">Peer Downloads</span>
            <span className="text-white font-bold text-sm">{stats.totalDownloads.toLocaleString()} accessed</span>
          </div>
        </div>
      </div>

      {/* Tab Navigation (5 Modules) */}
      <div className="flex items-center gap-2 overflow-x-auto no-scrollbar border-b border-white/10 mb-8 pb-1">
        {[
          { key: 'overview', label: 'Overview', icon: Building2 },
          { key: 'materials', label: `Study Materials (${stats.documentsCount})`, icon: BookOpen },
          { key: 'courses', label: `Courses & Departments (${courses.length})`, icon: GraduationCap, tabKey: 'departments' },
          { key: 'discussions', label: `Discussions (${discussions.length})`, icon: MessageSquare },
          { key: 'doubts', label: `Doubt Center (${doubts.length})`, icon: HelpCircle }
        ].map(t => {
          const tabId = (t.tabKey || t.key) as UniversityTabKey;
          const isActive = currentSubTab === tabId;
          const Icon = t.icon;
          return (
            <button
              key={t.key}
              onClick={() => handleSelectTab(tabId)}
              className={`px-4 py-2.5 rounded-xl text-xs font-medium transition-all cursor-pointer whitespace-nowrap flex items-center gap-2 ${
                isActive
                  ? 'bg-cyan-400 text-black font-bold shadow-[0_0_15px_rgba(0,240,255,0.25)]'
                  : 'text-white/60 hover:text-white hover:bg-white/5'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{t.label}</span>
            </button>
          );
        })}
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: OVERVIEW */}
      {/* ========================================================================= */}
      {currentSubTab === 'overview' && (
        <div className="space-y-8">
          {/* Welcome Card & Access Status */}
          <div className="bg-zinc-950/70 border border-white/10 rounded-2xl p-6 relative overflow-hidden">
            <h2 className="text-lg font-bold text-white mb-2">Welcome to {university.name}</h2>
            <p className="text-xs sm:text-sm text-white/60 max-w-3xl leading-relaxed mb-4">
              {university.description}
            </p>

            <div className="flex flex-wrap items-center gap-4 pt-3 border-t border-white/5 text-xs text-white/50">
              <span className="font-mono text-cyan-400">Core Disciplines:</span>
              <span>{university.disciplines.join(' · ')}</span>
            </div>
          </div>

          {/* Two-column layout: Featured Courses + Recent Discussions */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Featured Courses */}
            <div className="bg-zinc-950/70 border border-white/10 rounded-2xl p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <GraduationCap className="w-4 h-4 text-cyan-400" />
                  <h3 className="text-sm font-bold text-white">Featured Courses</h3>
                </div>
                <button
                  onClick={() => handleSelectTab('departments')}
                  className="text-xs text-cyan-400 hover:underline cursor-pointer"
                >
                  View All ({courses.length})
                </button>
              </div>

              <div className="space-y-3">
                {courses.slice(0, 4).map(c => (
                  <div
                    key={c.id}
                    onClick={() => {
                      setSelectedCourseCode(c.code);
                      handleSelectTab('materials');
                    }}
                    className="p-3 bg-white/[0.02] hover:bg-white/[0.05] border border-white/5 hover:border-white/15 rounded-xl transition-colors cursor-pointer flex items-center justify-between"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-bold text-cyan-400 uppercase">
                          {c.code}
                        </span>
                        <span className="text-xs font-semibold text-white truncate max-w-xs">
                          {c.name}
                        </span>
                      </div>
                      <div className="text-[11px] text-white/40 mt-0.5">
                        {c.instructor} · {c.activeStudents} active students
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-white/30 shrink-0" />
                  </div>
                ))}
              </div>
            </div>

            {/* Recent Discussions Preview */}
            <div className="bg-zinc-950/70 border border-white/10 rounded-2xl p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <MessageSquare className="w-4 h-4 text-cyan-400" />
                  <h3 className="text-sm font-bold text-white">Campus Discussions</h3>
                </div>
                <button
                  onClick={() => handleSelectTab('discussions')}
                  className="text-xs text-cyan-400 hover:underline cursor-pointer"
                >
                  Join Forum ({discussions.length})
                </button>
              </div>

              <div className="space-y-3">
                {discussions.slice(0, 3).map(d => (
                  <div
                    key={d.id}
                    onClick={() => handleSelectTab('discussions')}
                    className="p-3 bg-white/[0.02] hover:bg-white/[0.05] border border-white/5 hover:border-white/15 rounded-xl transition-colors cursor-pointer"
                  >
                    <div className="flex items-center justify-between text-[11px] text-white/40 mb-1">
                      <span>{d.category}</span>
                      <span>{d.commentsCount} replies</span>
                    </div>
                    <h4 className="text-xs font-semibold text-white line-clamp-1 mb-1">
                      {d.title}
                    </h4>
                    <p className="text-[11px] text-white/50 line-clamp-2">
                      {d.content}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Trending Materials in this University */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-cyan-400" />
                <h3 className="text-sm font-bold text-white">Trending Study Materials</h3>
              </div>
              <button
                onClick={() => handleSelectTab('materials')}
                className="text-xs text-cyan-400 hover:underline cursor-pointer"
              >
                Browse All Documents ({universityNotes.length})
              </button>
            </div>

            {universityNotes.length === 0 ? (
              <div className="text-center py-12 px-4 bg-zinc-950/40 border border-white/10 rounded-2xl">
                <p className="text-xs text-white/50 mb-3">
                  No documents have been uploaded for {university.name} yet.
                </p>
                <button
                  onClick={() => onOpenUpload(university.name)}
                  className="px-4 py-2 bg-white text-black text-xs font-bold rounded-xl"
                >
                  Upload First Lecture Note
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {universityNotes.slice(0, 3).map(note => (
                  <NoteCard
                    key={note.id}
                    note={note}
                    onPreview={onPreviewNote}
                    onDownload={onDownloadNote}
                    onUpvote={onUpvoteNote}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: STUDY MATERIALS (6-Tier Hierarchy Integration) */}
      {/* ========================================================================= */}
      {currentSubTab === 'materials' && (
        <div className="space-y-6">
          {/* Hierarchy Filter Bar */}
          <div className="bg-zinc-950/80 backdrop-blur-xl border border-white/10 rounded-2xl p-4 sm:p-5 space-y-4">
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
              {/* Search */}
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-white/40 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search lecture notes, problem sets, formulas in this campus..."
                  value={materialsSearch}
                  onChange={e => setMaterialsSearch(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 text-xs bg-white/5 border border-white/15 rounded-xl text-white placeholder:text-white/30 focus:outline-none focus:border-cyan-400"
                />
              </div>

              {/* Upload Shortcut */}
              <button
                onClick={() => onOpenUpload(university.name, selectedCourseCode !== 'all' ? selectedCourseCode : undefined)}
                className="px-4 py-2 bg-cyan-400 text-black text-xs font-bold rounded-xl hover:bg-cyan-300 transition-colors flex items-center justify-center gap-1.5 cursor-pointer shrink-0"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Publish to this Campus</span>
              </button>
            </div>

            {/* Tier Filters: Course & Material Type */}
            <div className="flex flex-wrap items-center gap-3 pt-3 border-t border-white/5">
              {/* Course Selector */}
              <div className="flex items-center gap-2">
                <span className="text-[11px] text-white/40 font-mono">Course:</span>
                <select
                  value={selectedCourseCode}
                  onChange={e => setSelectedCourseCode(e.target.value)}
                  className="px-3 py-1.5 text-xs bg-zinc-900 border border-white/15 rounded-lg text-white focus:outline-none focus:border-cyan-400 cursor-pointer"
                >
                  <option value="all">All Courses ({courses.length})</option>
                  {courses.map(c => (
                    <option key={c.id} value={c.code}>
                      {c.code} - {c.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Classification Selector */}
              <div className="flex items-center gap-2">
                <span className="text-[11px] text-white/40 font-mono">Classification:</span>
                <select
                  value={materialTypeFilter}
                  onChange={e => setMaterialTypeFilter(e.target.value)}
                  className="px-3 py-1.5 text-xs bg-zinc-900 border border-white/15 rounded-lg text-white focus:outline-none focus:border-cyan-400 cursor-pointer"
                >
                  <option value="all">All Classifications</option>
                  <option value="lecture_notes">Lecture Notes</option>
                  <option value="past_exam">Past Exams</option>
                  <option value="cheat_sheet">Cheat Sheets</option>
                  <option value="lab_manual">Lab Manuals</option>
                  <option value="summary">Summaries</option>
                </select>
              </div>

              {(selectedCourseCode !== 'all' || materialTypeFilter !== 'all' || materialsSearch) && (
                <button
                  onClick={() => {
                    setSelectedCourseCode('all');
                    setMaterialTypeFilter('all');
                    setMaterialsSearch('');
                  }}
                  className="text-xs text-white/40 hover:text-white underline cursor-pointer ml-auto"
                >
                  Reset Filters
                </button>
              )}
            </div>
          </div>

          {/* Results Grid */}
          {filteredMaterials.length === 0 ? (
            <div className="text-center py-16 px-6 bg-zinc-950/40 border border-white/10 rounded-2xl">
              <BookOpen className="w-10 h-10 text-white/30 mx-auto mb-3" />
              <h3 className="text-base font-bold text-white mb-1">No matching documents</h3>
              <p className="text-xs text-white/50 mb-4 max-w-sm mx-auto">
                No materials matched the chosen filters in {university.shortName}. Be the first student to upload notes!
              </p>
              <button
                onClick={() => onOpenUpload(university.name, selectedCourseCode !== 'all' ? selectedCourseCode : undefined)}
                className="px-4 py-2 bg-cyan-400 text-black text-xs font-bold rounded-lg cursor-pointer"
              >
                Upload Resource
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredMaterials.map(note => {
                const access = checkDocumentAccess(note, user);
                return (
                  <div key={note.id} className="relative">
                    <NoteCard
                      note={note}
                      onPreview={onPreviewNote}
                      onDownload={onDownloadNote}
                      onUpvote={onUpvoteNote}
                    />
                    {!access.canAccess && (
                      <div className="absolute top-3 right-3 z-20 px-2 py-1 bg-amber-500/20 border border-amber-400/40 rounded-md text-[10px] text-amber-300 font-mono flex items-center gap-1 backdrop-blur-md">
                        <Lock className="w-3 h-3" />
                        Campus Member Restricted
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: COURSES & DEPARTMENTS */}
      {/* ========================================================================= */}
      {currentSubTab === 'departments' && (
        <div className="space-y-8">
          {/* Departments Grid */}
          <div>
            <h3 className="text-sm font-bold text-white mb-3">Academic Departments</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {departments.map(dept => (
                <div
                  key={dept.id}
                  className="p-5 bg-zinc-950/70 border border-white/10 rounded-2xl"
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-mono text-xs font-bold text-cyan-400 uppercase">
                      {dept.code}
                    </span>
                    <span className="text-[11px] text-white/40 font-mono">
                      {dept.courseCount} courses
                    </span>
                  </div>
                  <h4 className="text-sm font-bold text-white mb-1.5">{dept.name}</h4>
                  <p className="text-xs text-white/50 leading-relaxed mb-3">
                    {dept.description}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Courses Catalog */}
          <div>
            <h3 className="text-sm font-bold text-white mb-3">Course Directory</h3>
            <div className="space-y-3">
              {courses.map(course => {
                const courseNotesCount = universityNotes.filter(n => n.courseCode === course.code).length;
                return (
                  <div
                    key={course.id}
                    className="p-4 bg-zinc-950/70 border border-white/10 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                  >
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-mono text-xs font-bold text-cyan-400 px-2 py-0.5 rounded bg-cyan-500/10 border border-cyan-400/20">
                          {course.code}
                        </span>
                        <h4 className="text-sm font-bold text-white">{course.name}</h4>
                      </div>
                      <p className="text-xs text-white/60 max-w-2xl leading-relaxed mb-1.5">
                        {course.description}
                      </p>
                      <div className="text-[11px] text-white/40 font-mono">
                        Instructor: {course.instructor} · {course.activeStudents} active peers
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={() => {
                          setSelectedCourseCode(course.code);
                          handleSelectTab('materials');
                        }}
                        className="px-3 py-1.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-xs text-white font-medium transition-colors cursor-pointer"
                      >
                        {courseNotesCount} Documents
                      </button>
                      <button
                        onClick={() => onOpenUpload(university.name, course.code)}
                        className="p-2 bg-cyan-400 hover:bg-cyan-300 text-black rounded-xl transition-colors cursor-pointer"
                        title="Upload notes for this course"
                      >
                        <Plus className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 4: UNIVERSITY-WIDE DISCUSSIONS */}
      {/* ========================================================================= */}
      {currentSubTab === 'discussions' && (
        <div className="space-y-6">
          {/* Discussion Header & Filters */}
          <div className="bg-zinc-950/80 backdrop-blur-xl border border-white/10 rounded-2xl p-4 sm:p-5 space-y-4">
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
              {/* Search */}
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-white/40 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search campus discussions, study groups, advice..."
                  value={discSearch}
                  onChange={e => setDiscSearch(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 text-xs bg-white/5 border border-white/15 rounded-xl text-white placeholder:text-white/30 focus:outline-none focus:border-cyan-400"
                />
              </div>

              {/* Sort + New Post Button */}
              <div className="flex items-center gap-2 shrink-0">
                <select
                  value={discSort}
                  onChange={e => setDiscSort(e.target.value as 'latest' | 'popular')}
                  className="px-3 py-2 text-xs bg-zinc-900 border border-white/15 rounded-xl text-white focus:outline-none focus:border-cyan-400 cursor-pointer"
                >
                  <option value="latest">Latest</option>
                  <option value="popular">Most Popular</option>
                </select>

                <button
                  onClick={() => setIsNewPostModalOpen(true)}
                  className="px-4 py-2 bg-cyan-400 text-black text-xs font-bold rounded-xl hover:bg-cyan-300 transition-colors flex items-center gap-1.5 cursor-pointer shadow-[0_0_15px_rgba(0,240,255,0.2)]"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Start Discussion</span>
                </button>
              </div>
            </div>

            {/* Category Pills */}
            <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pt-2 border-t border-white/5">
              <button
                type="button"
                onClick={() => setDiscCategory('all')}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer whitespace-nowrap ${
                  discCategory === 'all'
                    ? 'bg-cyan-400 text-black font-bold'
                    : 'text-white/60 hover:text-white hover:bg-white/5'
                }`}
              >
                All Topics
              </button>
              {DISCUSSION_CATEGORIES.map(cat => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setDiscCategory(cat)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer whitespace-nowrap ${
                    discCategory === cat
                      ? 'bg-cyan-400 text-black font-bold'
                      : 'text-white/60 hover:text-white hover:bg-white/5'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {/* Discussions Feed */}
          {discussions.length === 0 ? (
            <div className="text-center py-16 px-6 bg-zinc-950/40 border border-white/10 rounded-2xl">
              <MessageSquare className="w-10 h-10 text-white/30 mx-auto mb-3" />
              <h3 className="text-base font-bold text-white mb-1">No discussions yet</h3>
              <p className="text-xs text-white/50 mb-4 max-w-sm mx-auto">
                Be the first scholar to initiate a course discussion or study group at {university.shortName}!
              </p>
              <button
                onClick={() => setIsNewPostModalOpen(true)}
                className="px-4 py-2 bg-cyan-400 text-black text-xs font-bold rounded-lg cursor-pointer"
              >
                Start First Post
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {discussions.map(post => {
                const isCommentsOpen = openCommentsPostId === post.id;
                return (
                  <div
                    key={post.id}
                    className="bg-zinc-950/70 border border-white/10 rounded-2xl p-5 transition-all shadow-lg"
                  >
                    {/* Header */}
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <div className="flex items-center gap-3">
                        <img
                          src={post.authorAvatar || 'https://api.dicebear.com/7.x/bottts/svg?seed=Peer'}
                          alt={post.authorName}
                          className="w-9 h-9 rounded-xl object-cover border border-white/15 shrink-0"
                        />
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-xs font-bold text-white">{post.authorName}</span>
                            <span className="text-[11px] text-white/40">{post.authorMajor}</span>
                            {post.isPinned && (
                              <span className="text-[10px] text-cyan-400 font-mono font-semibold px-2 py-0.5 rounded bg-cyan-500/10 border border-cyan-400/20">
                                Pinned
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] text-white/40 flex items-center gap-2 mt-0.5">
                            <span>{new Date(post.createdAt).toLocaleDateString()}</span>
                            <span>·</span>
                            <span>{post.category}</span>
                            {post.courseTag && (
                              <>
                                <span>·</span>
                                <span className="text-cyan-400 font-mono font-bold">{post.courseTag}</span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Report action */}
                      <button
                        onClick={() => {
                          reportDiscussionPost(post.id);
                          setDiscussionsVersion(v => v + 1);
                        }}
                        className="text-white/30 hover:text-white/70 p-1 transition-colors"
                        title="Report post"
                      >
                        <Flag className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    {/* Title & Body */}
                    <h3 className="text-sm sm:text-base font-bold text-white mb-2 leading-snug">
                      {post.title}
                    </h3>
                    <p className="text-xs sm:text-sm text-white/70 whitespace-pre-wrap leading-relaxed mb-4">
                      {post.content}
                    </p>

                    {/* Footer Actions: Upvote & Comments toggle */}
                    <div className="flex items-center gap-4 pt-3 border-t border-white/5 text-xs">
                      <button
                        onClick={() => handlePostUpvote(post.id)}
                        className={`flex items-center gap-1.5 transition-colors cursor-pointer ${
                          post.hasUpvoted ? 'text-cyan-400 font-bold' : 'text-white/50 hover:text-white'
                        }`}
                      >
                        <ThumbsUp className="w-3.5 h-3.5" />
                        <span>{post.upvotesCount} Helpful</span>
                      </button>

                      <button
                        onClick={() =>
                          setOpenCommentsPostId(isCommentsOpen ? null : post.id)
                        }
                        className="flex items-center gap-1.5 text-white/50 hover:text-white transition-colors cursor-pointer"
                      >
                        <MessageSquare className="w-3.5 h-3.5" />
                        <span>
                          {post.commentsCount} {post.commentsCount === 1 ? 'Reply' : 'Replies'}
                        </span>
                      </button>
                    </div>

                    {/* Comments Accordion */}
                    {isCommentsOpen && (
                      <div className="mt-4 pt-4 border-t border-white/10 space-y-3">
                        {/* List existing comments */}
                        {post.comments.length > 0 ? (
                          <div className="space-y-2.5 max-h-60 overflow-y-auto pr-1">
                            {post.comments.map(c => (
                              <div
                                key={c.id}
                                className="p-3 bg-white/[0.02] border border-white/5 rounded-xl text-xs"
                              >
                                <div className="flex items-center justify-between text-[11px] text-white/40 mb-1">
                                  <span className="font-semibold text-white/80">{c.authorName}</span>
                                  <span>{new Date(c.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                </div>
                                <p className="text-white/70 leading-relaxed">{c.content}</p>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="text-[11px] text-white/40 italic">
                            No replies yet. Join the conversation below.
                          </div>
                        )}

                        {/* Comment Input */}
                        <div className="flex items-center gap-2 pt-2">
                          <input
                            type="text"
                            placeholder="Write a reply..."
                            value={commentInput}
                            onChange={e => setCommentInput(e.target.value)}
                            onKeyDown={e => {
                              if (e.key === 'Enter') handleAddComment(post.id);
                            }}
                            className="flex-1 px-3 py-2 text-xs bg-white/5 border border-white/15 rounded-xl text-white placeholder:text-white/30 focus:outline-none focus:border-cyan-400"
                          />
                          <button
                            onClick={() => handleAddComment(post.id)}
                            disabled={!commentInput.trim()}
                            className="p-2 bg-cyan-400 text-black disabled:opacity-40 rounded-xl hover:bg-cyan-300 transition-colors cursor-pointer"
                          >
                            <Send className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 5: UNIVERSITY DOUBT CENTER (Q&A) */}
      {/* ========================================================================= */}
      {currentSubTab === 'doubts' && (
        <div className="space-y-6">
          {/* Doubt Center Filter Header */}
          <div className="bg-zinc-950/80 backdrop-blur-xl border border-white/10 rounded-2xl p-4 sm:p-5 space-y-4">
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
              {/* Search */}
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-white/40 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search homework doubts, derivation steps, course concepts..."
                  value={doubtSearch}
                  onChange={e => setDoubtSearch(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 text-xs bg-white/5 border border-white/15 rounded-xl text-white placeholder:text-white/30 focus:outline-none focus:border-cyan-400"
                />
              </div>

              {/* Ask Question Button */}
              <button
                onClick={() => setIsAskDoubtModalOpen(true)}
                className="px-4 py-2 bg-cyan-400 text-black text-xs font-bold rounded-xl hover:bg-cyan-300 transition-colors flex items-center justify-center gap-1.5 cursor-pointer shadow-[0_0_15px_rgba(0,240,255,0.2)] shrink-0"
              >
                <HelpCircle className="w-3.5 h-3.5" />
                <span>Ask a Doubt</span>
              </button>
            </div>

            {/* Answered / Unanswered Toggle */}
            <div className="flex items-center gap-2 pt-2 border-t border-white/5">
              <span className="text-[11px] text-white/40 font-mono mr-1">Status:</span>
              {[
                { key: 'all', label: 'All Questions' },
                { key: 'unanswered', label: 'Unanswered' },
                { key: 'answered', label: 'Resolved / Answered' }
              ].map(st => (
                <button
                  key={st.key}
                  onClick={() => setDoubtStatusFilter(st.key as any)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                    doubtStatusFilter === st.key
                      ? 'bg-cyan-400 text-black font-bold'
                      : 'text-white/60 hover:text-white hover:bg-white/5'
                  }`}
                >
                  {st.label}
                </button>
              ))}
            </div>
          </div>

          {/* Doubts Feed */}
          {doubts.length === 0 ? (
            <div className="text-center py-16 px-6 bg-zinc-950/40 border border-white/10 rounded-2xl">
              <HelpCircle className="w-10 h-10 text-white/30 mx-auto mb-3" />
              <h3 className="text-base font-bold text-white mb-1">No questions found</h3>
              <p className="text-xs text-white/50 mb-4 max-w-sm mx-auto">
                Have a challenging problem set question or syllabus concept? Ask your peers for a clear explanation.
              </p>
              <button
                onClick={() => setIsAskDoubtModalOpen(true)}
                className="px-4 py-2 bg-cyan-400 text-black text-xs font-bold rounded-lg cursor-pointer"
              >
                Post First Question
              </button>
            </div>
          ) : (
            <div className="space-y-5">
              {doubts.map(doubt => {
                const isExpanded = expandedDoubtId === doubt.id;
                const isAuthor = user?.id === doubt.authorId || user?.name === doubt.authorName;

                return (
                  <div
                    key={doubt.id}
                    className="bg-zinc-950/70 border border-white/10 rounded-2xl p-5 sm:p-6 transition-all shadow-lg"
                  >
                    {/* Header */}
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <div>
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <span className="font-mono text-xs font-bold text-cyan-400 px-2 py-0.5 rounded bg-cyan-500/10 border border-cyan-400/20">
                            {doubt.courseCode}
                          </span>
                          <span className="text-xs text-white/50">{doubt.department}</span>
                          <span className="text-white/20">·</span>
                          {doubt.status === 'answered' ? (
                            <span className="text-[11px] text-emerald-400 font-mono font-medium flex items-center gap-1">
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              Resolved
                            </span>
                          ) : (
                            <span className="text-[11px] text-amber-400 font-mono font-medium flex items-center gap-1">
                              <Clock className="w-3.5 h-3.5" />
                              Awaiting Answer
                            </span>
                          )}
                        </div>
                        <h3 className="text-base font-bold text-white leading-snug">
                          {doubt.title}
                        </h3>
                      </div>

                      {/* Upvote Button */}
                      <button
                        onClick={() => handleDoubtUpvote(doubt.id)}
                        className={`px-3 py-1.5 rounded-xl border text-xs flex items-center gap-1.5 transition-colors shrink-0 ${
                          doubt.hasUpvoted
                            ? 'bg-cyan-500/20 border-cyan-400/40 text-cyan-300 font-bold'
                            : 'bg-white/5 border-white/10 text-white/60 hover:text-white'
                        }`}
                      >
                        <ThumbsUp className="w-3.5 h-3.5" />
                        <span>{doubt.upvotesCount}</span>
                      </button>
                    </div>

                    {/* Question Content */}
                    <p className="text-xs sm:text-sm text-white/70 whitespace-pre-wrap leading-relaxed mb-4">
                      {doubt.content}
                    </p>

                    {/* Tags */}
                    {doubt.tags.length > 0 && (
                      <div className="text-[11px] text-white/40 mb-4 font-mono">
                        Topics: {doubt.tags.join(' · ')}
                      </div>
                    )}

                    {/* Meta & Expand Toggle */}
                    <div className="flex items-center justify-between pt-3 border-t border-white/5 text-xs">
                      <div className="text-white/40">
                        Asked by <strong className="text-white/80">{doubt.authorName}</strong> on {new Date(doubt.createdAt).toLocaleDateString()}
                      </div>

                      <button
                        onClick={() => setExpandedDoubtId(isExpanded ? null : doubt.id)}
                        className="text-xs font-semibold text-cyan-400 hover:text-cyan-300 cursor-pointer flex items-center gap-1"
                      >
                        <span>
                          {doubt.answers.length} {doubt.answers.length === 1 ? 'Solution' : 'Solutions'}
                        </span>
                        <ChevronRight className={`w-3.5 h-3.5 transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
                      </button>
                    </div>

                    {/* Answers Section */}
                    {isExpanded && (
                      <div className="mt-5 pt-5 border-t border-white/10 space-y-4">
                        <h4 className="text-xs font-mono font-bold text-white uppercase tracking-wider">
                          Peer Solutions & Explanations ({doubt.answers.length})
                        </h4>

                        {/* List Answers */}
                        {doubt.answers.map(ans => (
                          <div
                            key={ans.id}
                            className={`p-4 rounded-xl border transition-all ${
                              ans.isAccepted
                                ? 'bg-emerald-950/20 border-emerald-500/40 shadow-[0_0_20px_rgba(16,185,129,0.1)]'
                                : 'bg-white/[0.02] border-white/10'
                            }`}
                          >
                            <div className="flex items-start justify-between gap-2 mb-2">
                              <div className="flex items-center gap-2">
                                <img
                                  src={ans.authorAvatar || 'https://api.dicebear.com/7.x/bottts/svg?seed=Peer'}
                                  alt={ans.authorName}
                                  className="w-7 h-7 rounded-lg object-cover border border-white/10"
                                />
                                <div>
                                  <div className="text-xs font-bold text-white flex items-center gap-2">
                                    <span>{ans.authorName}</span>
                                    <span className="text-[10px] text-white/40 font-mono">({ans.authorRole || 'Peer'})</span>
                                  </div>
                                  <div className="text-[10px] text-white/40">
                                    {new Date(ans.createdAt).toLocaleDateString()}
                                  </div>
                                </div>
                              </div>

                              {/* Accepted Badge / Author Controls */}
                              <div className="flex items-center gap-2">
                                {ans.isAccepted && (
                                  <span className="px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-400/40 text-[11px] font-bold flex items-center gap-1 font-mono">
                                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                                    Accepted Answer
                                  </span>
                                )}

                                {/* Question Author can accept/unaccept */}
                                {isAuthor && (
                                  <button
                                    onClick={() => handleAcceptAnswer(doubt.id, ans.id)}
                                    className="px-2 py-1 text-[11px] text-white/60 hover:text-cyan-400 underline cursor-pointer"
                                  >
                                    {ans.isAccepted ? 'Unmark Accepted' : 'Accept as Answer'}
                                  </button>
                                )}
                              </div>
                            </div>

                            <p className="text-xs text-white/80 whitespace-pre-wrap leading-relaxed">
                              {ans.content}
                            </p>
                          </div>
                        ))}

                        {/* Submit Answer Form */}
                        <div className="pt-2">
                          <label className="block text-xs font-bold text-white/80 mb-2">
                            Provide an Explanation or Derivation
                          </label>
                          <textarea
                            rows={3}
                            placeholder="Detail your solution steps, code example, or counterexample..."
                            value={answerContent}
                            onChange={e => setAnswerContent(e.target.value)}
                            className="w-full px-3.5 py-2.5 text-xs bg-white/5 border border-white/15 rounded-xl text-white placeholder:text-white/30 focus:outline-none focus:border-cyan-400 mb-2"
                          />
                          <button
                            onClick={() => handleAddAnswer(doubt.id)}
                            disabled={!answerContent.trim()}
                            className="px-4 py-2 bg-cyan-400 text-black text-xs font-bold disabled:opacity-40 rounded-xl hover:bg-cyan-300 transition-colors cursor-pointer"
                          >
                            Submit Answer
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: START DISCUSSION */}
      {/* ========================================================================= */}
      {isNewPostModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="relative w-full max-w-lg bg-zinc-950 border border-white/10 rounded-2xl shadow-2xl p-6 overflow-hidden">
            <h3 className="text-base font-bold text-white mb-1">Start Campus Discussion</h3>
            <p className="text-xs text-white/60 mb-4">
              Share advice, organize a study group, or ask about course logistics at {university.shortName}.
            </p>

            <form onSubmit={handleCreatePost} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-white/70 mb-1">Title *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Midterm 2 Red-Black Tree Review Study Group"
                  value={newPostTitle}
                  onChange={e => setNewPostTitle(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-white/5 border border-white/15 rounded-xl text-white focus:outline-none focus:border-cyan-400"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-white/70 mb-1">Category</label>
                  <select
                    value={newPostCategory}
                    onChange={e => setNewPostCategory(e.target.value as DiscussionCategory)}
                    className="w-full px-3 py-2 text-xs bg-zinc-900 border border-white/15 rounded-xl text-white focus:outline-none focus:border-cyan-400 cursor-pointer"
                  >
                    {DISCUSSION_CATEGORIES.map(c => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-white/70 mb-1">Course Tag (Optional)</label>
                  <input
                    type="text"
                    placeholder="e.g. CS 106B, MATH 51"
                    value={newPostCourseTag}
                    onChange={e => setNewPostCourseTag(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-white/5 border border-white/15 rounded-xl text-white focus:outline-none focus:border-cyan-400 uppercase"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-white/70 mb-1">Message *</label>
                <textarea
                  rows={4}
                  required
                  placeholder="Describe your discussion topic, meet-up location, or question in detail..."
                  value={newPostContent}
                  onChange={e => setNewPostContent(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-white/5 border border-white/15 rounded-xl text-white focus:outline-none focus:border-cyan-400"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsNewPostModalOpen(false)}
                  className="px-4 py-2 text-xs text-white/60 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-bold text-black bg-cyan-400 hover:bg-cyan-300 rounded-xl cursor-pointer"
                >
                  Publish Post
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: ASK DOUBT */}
      {/* ========================================================================= */}
      {isAskDoubtModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="relative w-full max-w-lg bg-zinc-950 border border-white/10 rounded-2xl shadow-2xl p-6 overflow-hidden">
            <h3 className="text-base font-bold text-white mb-1">Ask a Campus Doubt</h3>
            <p className="text-xs text-white/60 mb-4">
              Get peer explanations and verified derivations from students at {university.shortName}.
            </p>

            <form onSubmit={handleCreateDoubt} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-white/70 mb-1">Question Title *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Why does Dijkstra fail on negative edges without cycles?"
                  value={newDoubtTitle}
                  onChange={e => setNewDoubtTitle(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-white/5 border border-white/15 rounded-xl text-white focus:outline-none focus:border-cyan-400"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-white/70 mb-1">Department</label>
                  <select
                    value={newDoubtDept}
                    onChange={e => setNewDoubtDept(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-zinc-900 border border-white/15 rounded-xl text-white focus:outline-none focus:border-cyan-400 cursor-pointer"
                  >
                    {departments.map(d => (
                      <option key={d.id} value={d.name}>
                        {d.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-white/70 mb-1">Course Code</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. CS 106B"
                    value={newDoubtCourse}
                    onChange={e => setNewDoubtCourse(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-white/5 border border-white/15 rounded-xl text-white focus:outline-none focus:border-cyan-400 uppercase"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-white/70 mb-1">Detailed Explanation *</label>
                <textarea
                  rows={4}
                  required
                  placeholder="Explain what concept is unclear, your current scratch work, or specific equations..."
                  value={newDoubtContent}
                  onChange={e => setNewDoubtContent(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-white/5 border border-white/15 rounded-xl text-white focus:outline-none focus:border-cyan-400"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-white/70 mb-1">Topic Tags (Comma-separated)</label>
                <input
                  type="text"
                  placeholder="e.g. Graph Theory, Greedy Choice, Counterexample"
                  value={newDoubtTags}
                  onChange={e => setNewDoubtTags(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-white/5 border border-white/15 rounded-xl text-white focus:outline-none focus:border-cyan-400"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAskDoubtModalOpen(false)}
                  className="px-4 py-2 text-xs text-white/60 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-bold text-black bg-cyan-400 hover:bg-cyan-300 rounded-xl cursor-pointer"
                >
                  Post Question
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
