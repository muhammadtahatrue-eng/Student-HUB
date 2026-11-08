import React, { useState, useEffect, useMemo } from 'react';
import {
  MessageSquare,
  Plus,
  Search,
  ArrowBigUp,
  ArrowBigDown,
  Bookmark,
  BookmarkCheck,
  Share2,
  Flag,
  CheckCircle2,
  Clock,
  ExternalLink,
  BookOpen,
  GraduationCap,
  Edit3,
  Trash2,
  CornerDownRight,
  ShieldCheck,
  AlertCircle,
  X,
  Check,
  SlidersHorizontal,
  User as UserIcon,
  Eye,
  Code,
  Quote,
  List,
  Sigma,
  ChevronLeft,
  RefreshCw
} from 'lucide-react';
import {
  ForumPost,
  ForumPostType,
  ForumTopicId,
  ForumComment,
  ForumReport,
  ForumReportReason,
  StudentUser,
  StudyNote,
  SupabaseConfig
} from '../../types/index.ts';
import { getSupabaseInstance } from '../../lib/supabaseClient.ts';
import {
  FORUM_MAX_TITLE_LENGTH,
  FORUM_MAX_BODY_LENGTH,
  FORUM_MAX_COMMENT_LENGTH,
  FORUM_PAGE_SIZE,
  FORUM_POST_TYPES,
  FORUM_TOPICS,
  FORUM_REPORT_REASONS,
  fetchForumPosts,
  computeRealTopicCounts,
  createForumPost,
  updateForumPost,
  deleteForumPost,
  fetchForumComments,
  createForumComment,
  updateForumComment,
  deleteForumComment,
  toggleAcceptedForumAnswer,
  voteOnForumTarget,
  toggleForumBookmark,
  submitForumReport,
  fetchForumModerationReports,
  resolveForumReport,
  isForumModerator,
  canUserAccessForumLinkedResource,
  saveForumPostDraft,
  loadForumPostDraft,
  clearForumPostDraft,
  getFollowedForumTopics,
  toggleFollowForumTopic
} from '../../lib/forumService.ts';
import { getAllPrograms } from '../../lib/programStore.ts';
import { getNoteCourseCategory, getNoteCourseDisplay } from '../../lib/resourceService.ts';

export type ForumFeedFilter =
  | 'for-you'
  | 'latest'
  | 'popular'
  | 'top'
  | 'unanswered'
  | 'saved';

export type ForumTopTimeRange = 'all' | 'month' | 'week' | 'today';

interface PublicForumViewProps {
  user: StudentUser | null;
  supabaseConfig: SupabaseConfig;
  notes: StudyNote[];
  initialPostId?: string | null;
  onPreviewNote: (note: StudyNote) => void;
  onOpenProgram: (programId: string, subTab?: any) => void;
  onOpenAuthModal: (mode?: 'signin' | 'signup' | 'settings' | 'profile') => void;
  onTriggerToast: (msg: string) => void;
}

// ============================================================================
// SAFE TEXT, CODE, LIST, QUOTE & MATH FORMATTER (NO ARBITRARY HTML)
// ============================================================================

function formatReadableMathExpression(expr: string): string {
  return expr
    .replace(/\\alpha/g, 'α')
    .replace(/\\beta/g, 'β')
    .replace(/\\gamma/g, 'γ')
    .replace(/\\delta/g, 'δ')
    .replace(/\\epsilon/g, 'ε')
    .replace(/\\theta/g, 'θ')
    .replace(/\\lambda/g, 'λ')
    .replace(/\\mu/g, 'μ')
    .replace(/\\pi/g, 'π')
    .replace(/\\sigma/g, 'σ')
    .replace(/\\omega/g, 'ω')
    .replace(/\\Delta/g, 'Δ')
    .replace(/\\Sigma/g, '∑')
    .replace(/\\sum/g, '∑')
    .replace(/\\prod/g, '∏')
    .replace(/\\int/g, '∫')
    .replace(/\\infty/g, '∞')
    .replace(/\\approx/g, '≈')
    .replace(/\\neq/g, '≠')
    .replace(/\\leq/g, '≤')
    .replace(/\\geq/g, '≥')
    .replace(/\\pm/g, '±')
    .replace(/\\times/g, '×')
    .replace(/\\cdot/g, '·')
    .replace(/\\rightarrow/g, '→')
    .replace(/\\Rightarrow/g, '⇒')
    .replace(/\\forall/g, '∀')
    .replace(/\\exists/g, '∃')
    .replace(/\\in/g, '∈')
    .replace(/\\subset/g, '⊂')
    .replace(/\\sqrt\{([^}]+)\}/g, '√($1)')
    .replace(/\\frac\{([^}]+)\}\{([^}]+)\}/g, '($1)/($2)');
}

function renderInlineSegments(text: string): React.ReactNode[] {
  // Tokenize inline code `...`, inline math $...$, and safe URLs https://...
  const pattern = /(`[^`]+`|\$[^$\n]+\$|https?:\/\/[^\s)]+)/g;
  const parts = text.split(pattern);

  return parts.map((part, idx) => {
    if (!part) return null;
    if (part.startsWith('`') && part.endsWith('`') && part.length > 2) {
      return (
        <code
          key={idx}
          className="px-1.5 py-0.5 rounded bg-white/10 text-cyan-200 font-jetbrains text-[12px]"
        >
          {part.slice(1, -1)}
        </code>
      );
    }
    if (part.startsWith('$') && part.endsWith('$') && part.length > 2) {
      const mathContent = formatReadableMathExpression(part.slice(1, -1));
      return (
        <span
          key={idx}
          className="px-1.5 py-0.5 rounded bg-cyan-950/50 border border-cyan-500/20 text-cyan-200 font-jetbrains text-[12px] italic"
          title="Mathematical expression"
        >
          {mathContent}
        </span>
      );
    }
    if (/^https?:\/\/[^\s)]+$/i.test(part)) {
      return (
        <a
          key={idx}
          href={part}
          target="_blank"
          rel="noopener noreferrer"
          onClick={e => e.stopPropagation()}
          className="text-cyan-400 hover:text-cyan-300 underline break-all inline-flex items-center gap-1"
        >
          <span>{part}</span>
          <ExternalLink className="w-3 h-3 shrink-0 inline" />
        </a>
      );
    }
    return <React.Fragment key={idx}>{part}</React.Fragment>;
  });
}

export const FormattedForumText: React.FC<{ content: string; compact?: boolean }> = ({
  content,
  compact = false
}) => {
  if (!content) return null;

  // Split by fenced code blocks ```...``` or display math blocks $$...$$
  const blockSegments = content.split(/(```[\s\S]*?```|\$\$[\s\S]*?\$\$)/g);

  return (
    <div className={compact ? 'space-y-2 text-xs sm:text-sm text-white/80 leading-relaxed' : 'space-y-3 text-sm text-white/85 leading-relaxed'}>
      {blockSegments.map((segment, blockIdx) => {
        if (!segment.trim()) return null;

        if (segment.startsWith('```') && segment.endsWith('```')) {
          const rawCode = segment.slice(3, -3).replace(/^[a-zA-Z0-9_-]+\n/, '');
          return (
            <pre
              key={blockIdx}
              className="p-3.5 rounded-xl bg-black/80 border border-white/10 text-cyan-200 font-jetbrains text-xs overflow-x-auto leading-relaxed"
            >
              <code>{rawCode.trim()}</code>
            </pre>
          );
        }

        if (segment.startsWith('$$') && segment.endsWith('$$')) {
          const rawMath = formatReadableMathExpression(segment.slice(2, -2).trim());
          return (
            <div
              key={blockIdx}
              className="p-3 rounded-xl bg-cyan-950/25 border border-cyan-500/20 text-cyan-100 font-jetbrains text-xs sm:text-sm text-center overflow-x-auto"
            >
              {rawMath}
            </div>
          );
        }

        // Process paragraphs, lists, and blockquotes line by line
        const lines = segment.trim().split('\n');
        const elements: React.ReactNode[] = [];
        let listItems: { ordered: boolean; text: string }[] = [];

        const flushList = (keyPrefix: string) => {
          if (listItems.length === 0) return;
          const isOrdered = listItems[0].ordered;
          if (isOrdered) {
            elements.push(
              <ol key={keyPrefix} className="list-decimal list-inside space-y-1 pl-1 text-white/85">
                {listItems.map((item, i) => (
                  <li key={i}>{renderInlineSegments(item.text)}</li>
                ))}
              </ol>
            );
          } else {
            elements.push(
              <ul key={keyPrefix} className="list-disc list-inside space-y-1 pl-1 text-white/85">
                {listItems.map((item, i) => (
                  <li key={i}>{renderInlineSegments(item.text)}</li>
                ))}
              </ul>
            );
          }
          listItems = [];
        };

        lines.forEach((line, lineIdx) => {
          const trimmedLine = line.trim();
          if (!trimmedLine) {
            flushList(`${blockIdx}-list-${lineIdx}`);
            return;
          }

          const bulletMatch = /^[-*•]\s+(.+)$/.exec(trimmedLine);
          if (bulletMatch) {
            if (listItems.length > 0 && listItems[0].ordered) {
              flushList(`${blockIdx}-list-${lineIdx}`);
            }
            listItems.push({ ordered: false, text: bulletMatch[1] });
            return;
          }

          const orderedMatch = /^\d+\.\s+(.+)$/.exec(trimmedLine);
          if (orderedMatch) {
            if (listItems.length > 0 && !listItems[0].ordered) {
              flushList(`${blockIdx}-list-${lineIdx}`);
            }
            listItems.push({ ordered: true, text: orderedMatch[1] });
            return;
          }

          flushList(`${blockIdx}-list-${lineIdx}`);

          if (trimmedLine.startsWith('>')) {
            const quoteText = trimmedLine.replace(/^>\s*/, '');
            elements.push(
              <blockquote
                key={`${blockIdx}-quote-${lineIdx}`}
                className="px-3.5 py-2 rounded-xl bg-white/[0.03] border border-white/10 text-white/70 italic"
              >
                {renderInlineSegments(quoteText)}
              </blockquote>
            );
            return;
          }

          elements.push(
            <p key={`${blockIdx}-p-${lineIdx}`} className="break-words">
              {renderInlineSegments(line)}
            </p>
          );
        });

        flushList(`${blockIdx}-list-end`);
        return <React.Fragment key={blockIdx}>{elements}</React.Fragment>;
      })}
    </div>
  );
};

function formatRelativeTime(isoDate: string): string {
  const diffMs = Date.now() - new Date(isoDate).getTime();
  const diffSec = Math.max(1, Math.floor(diffMs / 1000));
  if (diffSec < 60) return 'just now';
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  const diffDay = Math.floor(diffHr / 24);
  if (diffDay < 30) return `${diffDay}d ago`;
  return new Date(isoDate).toLocaleDateString();
}

export const PublicForumView: React.FC<PublicForumViewProps> = ({
  user,
  supabaseConfig,
  notes,
  initialPostId,
  onPreviewNote,
  onOpenProgram,
  onOpenAuthModal,
  onTriggerToast
}) => {
  const supabase = useMemo(() => getSupabaseInstance(supabaseConfig), [supabaseConfig]);
  const unlockedPrograms = useMemo(() => getAllPrograms(), [user]);

  // Core forum data state (strictly real database records — zero mock data)
  const [posts, setPosts] = useState<ForumPost[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Feed filtering & pagination state
  const [feedFilter, setFeedFilter] = useState<ForumFeedFilter>('latest');
  const [topTimeRange, setTopTimeRange] = useState<ForumTopTimeRange>('all');
  const [selectedTopic, setSelectedTopic] = useState<'all' | ForumTopicId>('all');
  const [selectedPostType, setSelectedPostType] = useState<'all' | ForumPostType>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [visibleCount, setVisibleCount] = useState(FORUM_PAGE_SIZE);

  // Followed topics for "For You" feed personalization
  const [followedTopics, setFollowedTopics] = useState<ForumTopicId[]>(() =>
    getFollowedForumTopics(user?.id)
  );

  // Selected post thread view state
  const [activePostId, setActivePostId] = useState<string | null>(initialPostId || null);
  const [comments, setComments] = useState<ForumComment[]>([]);
  const [isLoadingComments, setIsLoadingComments] = useState(false);
  const [commentSortBy, setCommentSortBy] = useState<'best' | 'newest'>('best');

  // Comment & nested reply inputs
  const [newCommentBody, setNewCommentBody] = useState('');
  const [isSubmittingComment, setIsSubmittingComment] = useState(false);
  const [replyingToCommentId, setReplyingToCommentId] = useState<string | null>(null);
  const [replyBody, setReplyBody] = useState('');
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editingCommentBody, setEditingCommentBody] = useState('');

  // Text-only Post Composer modal state
  const [isComposerOpen, setIsComposerOpen] = useState(false);
  const [editingPost, setEditingPost] = useState<ForumPost | null>(null);
  const [composerTitle, setComposerTitle] = useState('');
  const [composerType, setComposerType] = useState<ForumPostType>('Discussion');
  const [composerTopic, setComposerTopic] = useState<ForumTopicId>('general-discussion');
  const [composerBody, setComposerBody] = useState('');
  const [composerResourceId, setComposerResourceId] = useState('');
  const [composerProgramId, setComposerProgramId] = useState('');
  const [composerCourseName, setComposerCourseName] = useState('');
  const [composerExternalLink, setComposerExternalLink] = useState('');
  const [composerError, setComposerError] = useState<string | null>(null);
  const [isSubmittingPost, setIsSubmittingPost] = useState(false);
  const [composerIdempotencyKey, setComposerIdempotencyKey] = useState<string>(() =>
    `post-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
  );

  // Report modal state
  const [reportTarget, setReportTarget] = useState<{
    targetType: 'post' | 'comment';
    targetId: string;
    postId: string;
    snippet: string;
  } | null>(null);
  const [reportReason, setReportReason] = useState<ForumReportReason>('Spam or self-promotion');
  const [reportDetails, setReportDetails] = useState('');
  const [isSubmittingReport, setIsSubmittingReport] = useState(false);

  // Public Author Profile modal state
  const [viewingAuthor, setViewingAuthor] = useState<{
    id: string;
    name: string;
    username: string;
    avatar?: string;
    program?: string;
    degreeTier?: string;
    university?: string;
    bio?: string;
  } | null>(null);

  // Community Guidelines & Moderation Queue modals
  const [isGuidelinesOpen, setIsGuidelinesOpen] = useState(false);
  const [isModerationOpen, setIsModerationOpen] = useState(false);
  const [moderationReports, setModerationReports] = useState<ForumReport[]>([]);
  const [showAllTopics, setShowAllTopics] = useState(false);
  const [isPolicyExpanded, setIsPolicyExpanded] = useState(false);
  const [isMobileTopicsOpen, setIsMobileTopicsOpen] = useState(false);

  const userIsModerator = useMemo(() => isForumModerator(user), [user]);

  // Load real posts from database
  const loadForumFeed = async () => {
    setIsLoading(true);
    setLoadError(null);
    try {
      const res = await fetchForumPosts(supabase, user?.id);
      if (res.error) {
        setLoadError(res.error);
      }
      setPosts(res.posts);
    } catch (err: any) {
      setLoadError(err?.message || 'Unable to load forum posts.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadForumFeed();
    setFollowedTopics(getFollowedForumTopics(user?.id));
  }, [supabase, user?.id]);

  // Subscribe to live cross-user Supabase Realtime updates for forum_posts, forum_comments, and forum_votes
  useEffect(() => {
    if (!supabase || !supabaseConfig.isConnected) return;

    const refreshForumState = () => {
      fetchForumPosts(supabase, user?.id)
        .then(res => {
          if (res.posts) setPosts(res.posts);
        })
        .catch(() => {});

      if (activePostId) {
        fetchForumComments(supabase, activePostId, user?.id)
          .then(list => setComments(list))
          .catch(() => {});
      }
    };

    const channel = supabase
      .channel('public:xeusar_forum_realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'forum_posts' }, refreshForumState)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'forum_comments' }, refreshForumState)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'forum_post_votes' }, refreshForumState)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'forum_comment_votes' }, refreshForumState)
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase, supabaseConfig.isConnected, user?.id, activePostId]);

  useEffect(() => {
    if (initialPostId) {
      setActivePostId(initialPostId);
    }
  }, [initialPostId]);

  // Load comments when opening a post thread
  useEffect(() => {
    if (!activePostId) {
      setComments([]);
      return;
    }
    let cancelled = false;
    setIsLoadingComments(true);
    fetchForumComments(supabase, activePostId, user?.id)
      .then(list => {
        if (!cancelled) {
          setComments(list);
          setIsLoadingComments(false);
        }
      })
      .catch(() => {
        if (!cancelled) setIsLoadingComments(false);
      });
    return () => {
      cancelled = true;
    };
  }, [activePostId, supabase, user?.id]);

  // Hydrate composer draft when opening new post composer
  const handleOpenNewComposer = (presetType?: ForumPostType) => {
    if (!user || user.isGuest) {
      onTriggerToast('Please sign in to create a post in the Public Forum.');
      onOpenAuthModal('signin');
      return;
    }
    setEditingPost(null);
    setComposerError(null);
    setComposerIdempotencyKey(`post-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`);

    const savedDraft = loadForumPostDraft(user.id);
    if (savedDraft) {
      setComposerTitle(savedDraft.title || '');
      setComposerType(presetType || savedDraft.postType || 'Discussion');
      setComposerTopic(savedDraft.topicId || 'general-discussion');
      setComposerBody(savedDraft.body || '');
      setComposerResourceId(savedDraft.resourceId || '');
      setComposerProgramId(savedDraft.programId || user.programId || '');
      setComposerCourseName(savedDraft.courseName || '');
      setComposerExternalLink(savedDraft.externalLink || '');
    } else {
      setComposerTitle('');
      setComposerType(presetType || 'Discussion');
      setComposerTopic(
        selectedTopic !== 'all' ? selectedTopic : 'general-discussion'
      );
      setComposerBody('');
      setComposerResourceId('');
      setComposerProgramId(user.programId || '');
      setComposerCourseName('');
      setComposerExternalLink('');
    }
    setIsComposerOpen(true);
  };

  const handleOpenEditPost = (post: ForumPost) => {
    setEditingPost(post);
    setComposerError(null);
    setComposerTitle(post.title);
    setComposerType(post.postType);
    setComposerTopic(post.topicId);
    setComposerBody(post.body);
    setComposerResourceId(post.resourceId || '');
    setComposerProgramId(post.programCourseRef?.programId || '');
    setComposerCourseName(post.programCourseRef?.courseName || '');
    setComposerExternalLink(post.externalLink || '');
    setIsComposerOpen(true);
  };

  // Persist draft automatically while user types in new post composer
  useEffect(() => {
    if (!isComposerOpen || editingPost || !user) return;
    saveForumPostDraft(user.id, {
      title: composerTitle,
      postType: composerType,
      topicId: composerTopic,
      body: composerBody,
      resourceId: composerResourceId,
      programId: composerProgramId,
      courseName: composerCourseName,
      externalLink: composerExternalLink
    });
  }, [
    isComposerOpen,
    editingPost,
    user,
    composerTitle,
    composerType,
    composerTopic,
    composerBody,
    composerResourceId,
    composerProgramId,
    composerCourseName,
    composerExternalLink
  ]);

  // Insert text formatting snippet into composer body
  const insertFormattingSnippet = (snippet: string) => {
    setComposerBody(prev => {
      const next = prev ? `${prev}\n${snippet}` : snippet;
      return next.slice(0, FORUM_MAX_BODY_LENGTH);
    });
  };

  // Submit New or Edited Post
  const handleSubmitPost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmittingPost) return;
    if (!user || user.isGuest) {
      onOpenAuthModal('signin');
      return;
    }

    setComposerError(null);
    setIsSubmittingPost(true);

    try {
      const matchedProg = composerProgramId
        ? unlockedPrograms.find(p => p.id === composerProgramId)
        : undefined;
      const programCourseRef = matchedProg
        ? {
            programId: matchedProg.id,
            programName: matchedProg.name,
            courseName: composerCourseName.trim() || undefined
          }
        : null;

      if (editingPost) {
        const res = await updateForumPost({
          supabase,
          user,
          postId: editingPost.id,
          title: composerTitle,
          body: composerBody,
          postType: composerType,
          topicId: composerTopic,
          resourceId: composerResourceId || null,
          programCourseRef,
          externalLink: composerExternalLink || null
        });

        if (res.error || !res.post) {
          setComposerError(res.error || 'Could not update post. Your text has been preserved.');
          setIsSubmittingPost(false);
          return;
        }

        setPosts(prev => prev.map(p => (p.id === res.post!.id ? res.post! : p)));
        setIsComposerOpen(false);
        setEditingPost(null);
        onTriggerToast('Forum post updated.');
      } else {
        const res = await createForumPost({
          supabase,
          author: user,
          title: composerTitle,
          body: composerBody,
          postType: composerType,
          topicId: composerTopic,
          resourceId: composerResourceId || null,
          programCourseRef,
          externalLink: composerExternalLink || null,
          idempotencyKey: composerIdempotencyKey
        });

        if (res.error || !res.post) {
          setComposerError(res.error || 'Could not publish post. Your draft is safely preserved.');
          setIsSubmittingPost(false);
          return;
        }

        setPosts(prev => [res.post!, ...prev.filter(p => p.id !== res.post!.id)]);
        clearForumPostDraft(user.id);
        setIsComposerOpen(false);
        setActivePostId(res.post.id);
        onTriggerToast('Published to Public Forum!');
      }
    } finally {
      setIsSubmittingPost(false);
    }
  };

  // Delete Post
  const handleDeletePost = async (post: ForumPost) => {
    const res = await deleteForumPost({
      supabase,
      user,
      postId: post.id
    });
    if (!res.success) {
      onTriggerToast(res.error || 'Could not delete post.');
      return;
    }
    setPosts(prev => prev.filter(p => p.id !== post.id));
    if (activePostId === post.id) {
      setActivePostId(null);
    }
    onTriggerToast('Forum post deleted.');
  };

  // Vote on Post or Comment
  const handleVote = async (
    e: React.MouseEvent,
    targetType: 'post' | 'comment',
    targetId: string,
    desiredVote: 1 | -1
  ) => {
    e.stopPropagation();
    if (!user || user.isGuest) {
      onTriggerToast('Sign in to upvote or downvote.');
      onOpenAuthModal('signin');
      return;
    }

    const res = await voteOnForumTarget({
      supabase,
      user,
      targetType,
      targetId,
      desiredVote
    });

    if (res.error) {
      onTriggerToast(res.error);
      return;
    }

    if (targetType === 'post') {
      setPosts(prev =>
        prev.map(p =>
          p.id === targetId
            ? {
                ...p,
                upvotesCount: res.upvotesCount,
                downvotesCount: res.downvotesCount,
                score: res.score,
                userVote: res.userVote
              }
            : p
        )
      );
    } else {
      setComments(prev =>
        prev.map(c =>
          c.id === targetId
            ? {
                ...c,
                upvotesCount: res.upvotesCount,
                downvotesCount: res.downvotesCount,
                score: res.score,
                userVote: res.userVote
              }
            : c
        )
      );
    }
  };

  // Bookmark / Save Post
  const handleToggleBookmark = async (e: React.MouseEvent, postId: string) => {
    e.stopPropagation();
    if (!user || user.isGuest) {
      onTriggerToast('Sign in to bookmark posts.');
      onOpenAuthModal('signin');
      return;
    }
    const res = await toggleForumBookmark({ supabase, user, postId });
    if (res.error) {
      onTriggerToast(res.error);
      return;
    }
    setPosts(prev =>
      prev.map(p => (p.id === postId ? { ...p, isBookmarked: res.isBookmarked } : p))
    );
    onTriggerToast(res.isBookmarked ? 'Saved to your bookmarked posts' : 'Removed from saved posts');
  };

  // Copy Stable Post Share Link
  const handleSharePost = (e: React.MouseEvent, post: ForumPost) => {
    e.stopPropagation();
    const shareUrl = `${window.location.origin}${window.location.pathname}#forum/post/${post.id}`;
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(shareUrl).then(
        () => onTriggerToast('Post link copied to clipboard'),
        () => onTriggerToast(`Link: #forum/post/${post.id}`)
      );
    } else {
      onTriggerToast(`Link: #forum/post/${post.id}`);
    }
  };

  // Submit Top-Level Comment or Nested Reply
  const handleCreateComment = async (parentCommentId: string | null) => {
    if (!activePostId || isSubmittingComment) return;
    if (!user || user.isGuest) {
      onTriggerToast('Sign in to comment on discussions.');
      onOpenAuthModal('signin');
      return;
    }

    const textToSubmit = parentCommentId ? replyBody : newCommentBody;
    setIsSubmittingComment(true);

    const res = await createForumComment({
      supabase,
      author: user,
      postId: activePostId,
      parentCommentId,
      body: textToSubmit
    });

    setIsSubmittingComment(false);

    if (res.error || !res.comment) {
      onTriggerToast(res.error || 'Could not post comment.');
      return;
    }

    setComments(prev => [...prev, res.comment!]);
    setPosts(prev =>
      prev.map(p =>
        p.id === activePostId ? { ...p, commentsCount: (p.commentsCount || 0) + 1 } : p
      )
    );

    if (parentCommentId) {
      setReplyingToCommentId(null);
      setReplyBody('');
    } else {
      setNewCommentBody('');
    }
    onTriggerToast('Reply posted.');
  };

  const handleSaveEditedComment = async (commentId: string) => {
    const res = await updateForumComment({
      supabase,
      user,
      commentId,
      body: editingCommentBody
    });
    if (res.error || !res.comment) {
      onTriggerToast(res.error || 'Could not update comment.');
      return;
    }
    setComments(prev => prev.map(c => (c.id === commentId ? res.comment! : c)));
    setEditingCommentId(null);
    setEditingCommentBody('');
    onTriggerToast('Comment updated.');
  };

  const handleDeleteComment = async (commentId: string) => {
    const res = await deleteForumComment({
      supabase,
      user,
      commentId
    });
    if (!res.success) {
      onTriggerToast(res.error || 'Could not delete comment.');
      return;
    }
    if (activePostId) {
      const refreshed = await fetchForumComments(supabase, activePostId, user?.id);
      setComments(refreshed);
      setPosts(prev =>
        prev.map(p => (p.id === activePostId ? { ...p, commentsCount: refreshed.length } : p))
      );
    }
    onTriggerToast('Comment removed.');
  };

  const handleToggleAcceptedAnswer = async (commentId: string) => {
    if (!activePostId) return;
    const res = await toggleAcceptedForumAnswer({
      supabase,
      user,
      postId: activePostId,
      commentId
    });
    if (res.error) {
      onTriggerToast(res.error);
      return;
    }
    setPosts(prev =>
      prev.map(p =>
        p.id === activePostId ? { ...p, acceptedCommentId: res.acceptedCommentId } : p
      )
    );
    setComments(prev =>
      prev.map(c => ({
        ...c,
        isAccepted: c.id === res.acceptedCommentId
      }))
    );
    onTriggerToast(
      res.acceptedCommentId ? 'Marked as Accepted Answer!' : 'Unmarked accepted answer'
    );
  };

  // Submit Report
  const handleSubmitReport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reportTarget || isSubmittingReport) return;
    setIsSubmittingReport(true);
    const res = await submitForumReport({
      supabase,
      reporter: user,
      targetType: reportTarget.targetType,
      targetId: reportTarget.targetId,
      postId: reportTarget.postId,
      targetTitleOrSnippet: reportTarget.snippet,
      reason: reportReason,
      details: reportDetails
    });
    setIsSubmittingReport(false);
    if (!res.success) {
      onTriggerToast(res.error || 'Could not submit report.');
      return;
    }
    setReportTarget(null);
    setReportDetails('');
    onTriggerToast('Report submitted to community moderators.');
  };

  const handleOpenModerationQueue = async () => {
    setIsModerationOpen(true);
    const list = await fetchForumModerationReports(supabase, user);
    setModerationReports(list);
  };

  const handleResolveReport = async (reportId: string, action: 'keep' | 'remove') => {
    const res = await resolveForumReport({
      supabase,
      moderator: user,
      reportId,
      action
    });
    if (!res.success) {
      onTriggerToast(res.error || 'Could not resolve report.');
      return;
    }
    const updatedReports = await fetchForumModerationReports(supabase, user);
    setModerationReports(updatedReports);
    await loadForumFeed();
    onTriggerToast(
      action === 'remove' ? 'Reported content removed.' : 'Report dismissed and content kept.'
    );
  };

  // Real topic counts from database records
  const topicCounts = useMemo(() => computeRealTopicCounts(posts), [posts]);

  // Preferred topic IDs derived from followed topics + user profile preferences
  const personalizedTopicSet = useMemo(() => {
    const set = new Set<ForumTopicId>(followedTopics);
    const prefs = user?.preferences?.preferredSubjects || [];
    const major = (user?.program || user?.majorOrField || '').toLowerCase();
    const combinedTerms = [...prefs.map(s => s.toLowerCase()), major];

    combinedTerms.forEach(term => {
      if (!term) return;
      if (term.includes('math')) set.add('mathematics');
      if (term.includes('phys')) set.add('physics');
      if (term.includes('computer') || term.includes('software') || term.includes('data') || term.includes('ai')) {
        set.add('computer-science');
      }
      if (term.includes('engineer')) set.add('engineering');
      if (term.includes('business') || term.includes('econ') || term.includes('finance')) {
        set.add('business');
      }
      if (term.includes('english') || term.includes('literature') || term.includes('language')) {
        set.add('english-languages');
      }
    });
    return set;
  }, [followedTopics, user]);

  // Filtered & sorted feed posts
  const filteredPosts = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const now = Date.now();

    return posts
      .filter(post => {
        if (post.status === 'removed') return false;

        if (selectedTopic !== 'all' && post.topicId !== selectedTopic) {
          return false;
        }

        if (selectedPostType !== 'all' && post.postType !== selectedPostType) {
          return false;
        }

        if (feedFilter === 'unanswered') {
          if (post.postType !== 'Question' || post.commentsCount > 0 || post.acceptedCommentId) {
            return false;
          }
        }

        if (feedFilter === 'saved' && !post.isBookmarked) {
          return false;
        }

        if (feedFilter === 'top' && topTimeRange !== 'all') {
          const ageMs = now - new Date(post.createdAt).getTime();
          const dayMs = 24 * 60 * 60 * 1000;
          if (topTimeRange === 'today' && ageMs > dayMs) return false;
          if (topTimeRange === 'week' && ageMs > 7 * dayMs) return false;
          if (topTimeRange === 'month' && ageMs > 30 * dayMs) return false;
        }

        if (q) {
          const matchTitle = post.title.toLowerCase().includes(q);
          const matchBody = post.body.toLowerCase().includes(q);
          const matchTopic = post.topicName.toLowerCase().includes(q);
          const matchAuthor =
            post.authorUsername.toLowerCase().includes(q) ||
            post.authorName.toLowerCase().includes(q);
          if (!matchTitle && !matchBody && !matchTopic && !matchAuthor) {
            return false;
          }
        }

        return true;
      })
      .sort((a, b) => {
        if (feedFilter === 'for-you') {
          const aPreferred = personalizedTopicSet.has(a.topicId) ? 1 : 0;
          const bPreferred = personalizedTopicSet.has(b.topicId) ? 1 : 0;
          if (aPreferred !== bPreferred) return bPreferred - aPreferred;
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        }
        if (feedFilter === 'popular') {
          const aEngagement = a.score * 2 + a.commentsCount * 3;
          const bEngagement = b.score * 2 + b.commentsCount * 3;
          if (bEngagement !== aEngagement) return bEngagement - aEngagement;
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        }
        if (feedFilter === 'top') {
          if (b.score !== a.score) return b.score - a.score;
          return b.commentsCount - a.commentsCount;
        }
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      });
  }, [
    posts,
    selectedTopic,
    selectedPostType,
    feedFilter,
    topTimeRange,
    searchQuery,
    personalizedTopicSet
  ]);

  const visiblePosts = useMemo(
    () => filteredPosts.slice(0, visibleCount),
    [filteredPosts, visibleCount]
  );

  const activePost = useMemo(
    () => (activePostId ? posts.find(p => p.id === activePostId) || null : null),
    [posts, activePostId]
  );

  // Render Linked Study Library Resource Attachment (Compact inline Reddit-style attachment)
  const renderStudyResourceLinkCard = (resourceId: string | null | undefined) => {
    if (!resourceId) return null;
    const matchedNote = notes.find(n => n.id === resourceId);
    const accessCheck = canUserAccessForumLinkedResource(matchedNote, user);

    if (!matchedNote || !accessCheck.accessible) {
      return (
        <div
          onClick={e => e.stopPropagation()}
          className="mt-2 px-2.5 py-1.5 rounded-lg bg-zinc-900/90 border border-white/10 flex items-center gap-2 text-[11px] text-white/50"
        >
          <AlertCircle className="w-3.5 h-3.5 text-amber-400 shrink-0" />
          <span className="truncate">
            {accessCheck.reason || 'Referenced Study Library resource is no longer available.'}
          </span>
        </div>
      );
    }

    return (
      <div
        onClick={e => {
          e.stopPropagation();
          onPreviewNote(matchedNote);
        }}
        className="mt-2 px-2.5 py-1.5 rounded-lg bg-cyan-950/20 hover:bg-cyan-950/35 border border-cyan-500/20 transition-colors flex items-center justify-between gap-2.5 cursor-pointer"
      >
        <div className="flex items-center gap-2 min-w-0">
          <BookOpen className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
          <div className="flex items-center gap-1.5 min-w-0 text-xs">
            <span className="font-semibold text-white truncate max-w-[200px] sm:max-w-[320px]">
              {matchedNote.title}
            </span>
            <span aria-hidden="true" className="text-white/30">·</span>
            <span className="text-[11px] text-cyan-300/85 truncate hidden sm:inline">
              {getNoteCourseCategory(matchedNote)}
            </span>
            <span aria-hidden="true" className="text-white/30 hidden sm:inline">·</span>
            <span className="text-[11px] text-white/45 shrink-0">
              {matchedNote.pageCount}p
            </span>
          </div>
        </div>

        <button
          type="button"
          onClick={e => {
            e.stopPropagation();
            onPreviewNote(matchedNote);
          }}
          className="px-2 py-0.5 rounded bg-cyan-400/15 hover:bg-cyan-400/25 text-cyan-200 text-[11px] font-semibold inline-flex items-center gap-1 shrink-0 cursor-pointer"
        >
          <Eye className="w-3 h-3" />
          <span>Preview PDF</span>
        </button>
      </div>
    );
  };

  // Recursive Nested Comment Tree Renderer (Compact Reddit-style thread lines)
  const renderCommentNode = (comment: ForumComment, depth = 0): React.ReactNode => {
    const childReplies = comments
      .filter(c => c.parentCommentId === comment.id && c.status !== 'removed')
      .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

    const isCommentOwner = Boolean(user && !user.isGuest && user.id === comment.authorId);
    const isQuestionAuthor = Boolean(
      activePost &&
        activePost.postType === 'Question' &&
        user &&
        !user.isGuest &&
        user.id === activePost.authorId
    );
    const isAccepted =
      Boolean(comment.isAccepted) ||
      Boolean(activePost?.acceptedCommentId && activePost.acceptedCommentId === comment.id);

    return (
      <div
        key={comment.id}
        className={`${
          depth > 0
            ? 'mt-2 pl-3 sm:pl-4 border-l border-white/10'
            : 'py-2.5 border-b border-white/10 last:border-b-0'
        }`}
      >
        <div
          className={`rounded-lg transition-colors ${
            isAccepted
              ? 'p-2.5 bg-emerald-950/20 border border-emerald-500/30'
              : 'py-0.5'
          }`}
        >
          {/* Comment Metadata Line */}
          <div className="flex items-center justify-between gap-2 mb-1">
            <div className="flex items-center gap-1.5 text-[12px] text-white/50 flex-wrap min-w-0">
              <button
                type="button"
                onClick={() =>
                  setViewingAuthor({
                    id: comment.authorId,
                    name: comment.authorName,
                    username: comment.authorUsername,
                    avatar: comment.authorAvatar,
                    program: comment.authorProgram,
                    degreeTier: comment.authorDegreeTier
                  })
                }
                className="inline-flex items-center gap-1.5 text-white/90 hover:text-cyan-300 font-semibold cursor-pointer"
              >
                {comment.authorAvatar ? (
                  <img
                    src={comment.authorAvatar}
                    alt={comment.authorName}
                    className="w-4 h-4 rounded-full object-cover"
                  />
                ) : (
                  <span className="w-4 h-4 rounded-full bg-cyan-500/20 text-cyan-300 text-[10px] flex items-center justify-center font-bold">
                    {comment.authorName.charAt(0).toUpperCase()}
                  </span>
                )}
                <span>@{comment.authorUsername}</span>
              </button>

              {comment.authorProgram && (
                <>
                  <span aria-hidden="true">·</span>
                  <span className="text-white/40 truncate max-w-[160px]">
                    {comment.authorProgram}
                  </span>
                </>
              )}

              <span aria-hidden="true">·</span>
              <span>{formatRelativeTime(comment.createdAt)}</span>

              {comment.updatedAt && comment.updatedAt !== comment.createdAt && (
                <>
                  <span aria-hidden="true">·</span>
                  <span className="text-white/35">edited</span>
                </>
              )}

              {isAccepted && (
                <>
                  <span aria-hidden="true">·</span>
                  <span className="text-emerald-400 font-semibold inline-flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" />
                    Accepted Answer
                  </span>
                </>
              )}
            </div>
          </div>

          {/* Comment Body or Edit Form */}
          {editingCommentId === comment.id ? (
            <div className="space-y-1.5 mt-1.5">
              <textarea
                rows={2}
                maxLength={FORUM_MAX_COMMENT_LENGTH}
                value={editingCommentBody}
                onChange={e => setEditingCommentBody(e.target.value)}
                className="w-full px-2.5 py-1.5 bg-zinc-900 border border-white/15 rounded-lg text-xs sm:text-sm text-white focus:outline-none focus:border-cyan-400"
              />
              <div className="flex items-center justify-between text-[11px] text-white/40">
                <span>
                  {editingCommentBody.length} / {FORUM_MAX_COMMENT_LENGTH} chars
                </span>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => {
                      setEditingCommentId(null);
                      setEditingCommentBody('');
                    }}
                    className="px-2.5 py-1 rounded text-white/60 hover:text-white cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSaveEditedComment(comment.id)}
                    className="px-2.5 py-1 rounded bg-cyan-400 text-black font-bold hover:bg-cyan-300 cursor-pointer"
                  >
                    Save
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <FormattedForumText content={comment.body} compact />
          )}

          {/* Compact Comment Action Bar */}
          <div className="mt-1.5 flex items-center justify-between gap-2 flex-wrap text-[11px] text-white/50">
            <div className="flex items-center gap-2">
              {/* Upvote / Downvote */}
              <div className="inline-flex items-center gap-0.5 bg-white/[0.03] rounded-md px-1 py-0.5 border border-white/10">
                <button
                  type="button"
                  onClick={e => handleVote(e, 'comment', comment.id, 1)}
                  aria-label="Upvote comment"
                  className={`p-0.5 rounded transition-colors cursor-pointer ${
                    comment.userVote === 1
                      ? 'text-cyan-400 bg-cyan-400/15'
                      : 'text-white/50 hover:text-white'
                  }`}
                >
                  <ArrowBigUp className="w-3.5 h-3.5" />
                </button>
                <span
                  className={`text-[11px] font-bold tabular-nums px-1 ${
                    comment.userVote === 1
                      ? 'text-cyan-300'
                      : comment.userVote === -1
                      ? 'text-rose-400'
                      : 'text-white/80'
                  }`}
                >
                  {comment.score}
                </span>
                <button
                  type="button"
                  onClick={e => handleVote(e, 'comment', comment.id, -1)}
                  aria-label="Downvote comment"
                  className={`p-0.5 rounded transition-colors cursor-pointer ${
                    comment.userVote === -1
                      ? 'text-rose-400 bg-rose-400/15'
                      : 'text-white/50 hover:text-white'
                  }`}
                >
                  <ArrowBigDown className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Reply Button */}
              {depth < 4 && (
                <button
                  type="button"
                  onClick={() => {
                    if (!user || user.isGuest) {
                      onOpenAuthModal('signin');
                      return;
                    }
                    setReplyingToCommentId(
                      replyingToCommentId === comment.id ? null : comment.id
                    );
                    setReplyBody('');
                  }}
                  className="px-1.5 py-0.5 rounded hover:bg-white/5 hover:text-white inline-flex items-center gap-1 cursor-pointer"
                >
                  <CornerDownRight className="w-3 h-3" />
                  <span>Reply</span>
                </button>
              )}

              {/* Question Author: Accept Answer Toggle */}
              {isQuestionAuthor && (
                <button
                  type="button"
                  onClick={() => handleToggleAcceptedAnswer(comment.id)}
                  className={`px-1.5 py-0.5 rounded inline-flex items-center gap-1 font-semibold cursor-pointer ${
                    isAccepted
                      ? 'text-emerald-400 hover:text-emerald-300'
                      : 'text-white/55 hover:text-emerald-400'
                  }`}
                >
                  <CheckCircle2 className="w-3 h-3" />
                  <span>{isAccepted ? 'Unmark Accepted' : 'Accept Answer'}</span>
                </button>
              )}
            </div>

            <div className="flex items-center gap-2">
              {isCommentOwner && (
                <>
                  <button
                    type="button"
                    onClick={() => {
                      setEditingCommentId(comment.id);
                      setEditingCommentBody(comment.body);
                    }}
                    className="hover:text-cyan-300 inline-flex items-center gap-1 cursor-pointer"
                  >
                    <Edit3 className="w-3 h-3" />
                    <span>Edit</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDeleteComment(comment.id)}
                    className="hover:text-rose-400 inline-flex items-center gap-1 cursor-pointer"
                  >
                    <Trash2 className="w-3 h-3" />
                    <span>Delete</span>
                  </button>
                </>
              )}

              <button
                type="button"
                onClick={() => {
                  if (!user || user.isGuest) {
                    onOpenAuthModal('signin');
                    return;
                  }
                  setReportTarget({
                    targetType: 'comment',
                    targetId: comment.id,
                    postId: comment.postId,
                    snippet: comment.body.slice(0, 120)
                  });
                }}
                className="hover:text-amber-300 inline-flex items-center gap-1 cursor-pointer"
              >
                <Flag className="w-3 h-3" />
                <span>Report</span>
              </button>
            </div>
          </div>

          {/* Inline Reply Box */}
          {replyingToCommentId === comment.id && (
            <div className="mt-2 pt-2 border-t border-white/10 space-y-1.5">
              <textarea
                rows={2}
                maxLength={FORUM_MAX_COMMENT_LENGTH}
                value={replyBody}
                onChange={e => setReplyBody(e.target.value)}
                placeholder={`Reply to @${comment.authorUsername} (text, code, or $math$)...`}
                className="w-full px-2.5 py-1.5 bg-zinc-900 border border-white/15 rounded-lg text-xs sm:text-sm text-white placeholder-white/35 focus:outline-none focus:border-cyan-400"
              />
              <div className="flex items-center justify-between text-[11px] text-white/40">
                <span>
                  Text-only reply · {replyBody.length}/{FORUM_MAX_COMMENT_LENGTH}
                </span>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => {
                      setReplyingToCommentId(null);
                      setReplyBody('');
                    }}
                    className="px-2.5 py-1 rounded text-white/60 hover:text-white cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    disabled={!replyBody.trim() || isSubmittingComment}
                    onClick={() => handleCreateComment(comment.id)}
                    className="px-3 py-1 rounded-lg bg-cyan-400 text-black font-bold hover:bg-cyan-300 disabled:opacity-40 cursor-pointer"
                  >
                    Post Reply
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Child Replies */}
        {childReplies.length > 0 && (
          <div className="space-y-1.5">
            {childReplies.map(child => renderCommentNode(child, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  // Top-level comments sorted by Best or Newest
  const topLevelComments = useMemo(() => {
    const roots = comments.filter(c => !c.parentCommentId && c.status !== 'removed');
    return roots.sort((a, b) => {
      const aAccepted =
        a.isAccepted || (activePost?.acceptedCommentId && activePost.acceptedCommentId === a.id)
          ? 1
          : 0;
      const bAccepted =
        b.isAccepted || (activePost?.acceptedCommentId && activePost.acceptedCommentId === b.id)
          ? 1
          : 0;
      if (aAccepted !== bAccepted) return bAccepted - aAccepted;

      if (commentSortBy === 'best') {
        if (b.score !== a.score) return b.score - a.score;
      }
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
  }, [comments, commentSortBy, activePost?.acceptedCommentId]);

  const displayedSidebarTopics = useMemo(() => {
    if (showAllTopics) return FORUM_TOPICS;
    const base = FORUM_TOPICS.slice(0, 6);
    if (selectedTopic !== 'all' && !base.some(t => t.id === selectedTopic)) {
      const activeObj = FORUM_TOPICS.find(t => t.id === selectedTopic);
      if (activeObj) return [...base.slice(0, 5), activeObj];
    }
    return base;
  }, [showAllTopics, selectedTopic]);

  return (
    <div className="min-w-0 font-outfit space-y-3">
      {/* Compact Reddit-Style Forum Header */}
      <header className="rounded-xl border border-white/10 bg-zinc-950/85 backdrop-blur-xl px-3.5 py-2.5 sm:px-4 sm:py-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <div className="inline-flex items-center gap-1.5 text-cyan-400">
                <MessageSquare className="w-4 h-4 shrink-0" />
                <h1 className="text-base sm:text-lg font-extrabold text-white tracking-tight">
                  Academic Discussions, Questions &amp; Study Tips
                </h1>
              </div>

              <span aria-hidden="true" className="text-white/20 hidden md:inline">·</span>
              <span className="text-[11px] text-white/50 hidden md:inline">
                Public Forum
              </span>
              <span aria-hidden="true" className="text-white/20">·</span>
              <button
                type="button"
                onClick={() => setIsGuidelinesOpen(true)}
                className="text-[11px] text-white/65 hover:text-cyan-300 underline cursor-pointer"
              >
                Community Guidelines
              </button>
              {userIsModerator && (
                <>
                  <span aria-hidden="true" className="text-white/20">·</span>
                  <button
                    type="button"
                    onClick={handleOpenModerationQueue}
                    className="text-[11px] text-amber-300 hover:text-amber-200 underline cursor-pointer font-semibold"
                  >
                    Moderation Queue
                  </button>
                </>
              )}
            </div>

            <p className="text-xs text-white/55 truncate mt-0.5">
              Ask course questions, share derivations and code snippets, and reference verified Study Library materials.
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0 self-start sm:self-center">
            <button
              type="button"
              onClick={() => handleOpenNewComposer('Question')}
              className="h-8 px-3 rounded-lg bg-white/5 hover:bg-white/10 text-white text-xs font-semibold border border-white/10 transition-colors cursor-pointer inline-flex items-center"
            >
              Ask a Question
            </button>
            <button
              type="button"
              onClick={() => handleOpenNewComposer('Discussion')}
              className="h-8 px-3 rounded-lg bg-cyan-400 hover:bg-cyan-300 text-black text-xs font-bold transition-colors cursor-pointer inline-flex items-center gap-1 shadow-sm"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>New Post</span>
            </button>
          </div>
        </div>
      </header>

      {/* Mobile / Tablet Collapsible Topic Filter Bar (Hidden on lg where sidebar is shown) */}
      <div className="lg:hidden rounded-xl border border-white/10 bg-zinc-950/85 px-3 py-2">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 text-xs text-white/75 min-w-0">
            <SlidersHorizontal className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
            <span className="font-semibold">Topic:</span>
            <span className="text-cyan-300 font-bold truncate">
              {selectedTopic === 'all'
                ? `All Forum Topics (${posts.length})`
                : FORUM_TOPICS.find(t => t.id === selectedTopic)?.name || selectedTopic}
            </span>
          </div>
          <button
            type="button"
            onClick={() => setIsMobileTopicsOpen(prev => !prev)}
            className="text-[11px] font-semibold text-cyan-400 hover:text-cyan-300 cursor-pointer shrink-0"
          >
            {isMobileTopicsOpen ? 'Hide Topics' : 'Browse Topics'}
          </button>
        </div>

        {isMobileTopicsOpen && (
          <div className="mt-2 pt-2 border-t border-white/10 flex items-center gap-1.5 flex-wrap">
            <button
              type="button"
              onClick={() => {
                setSelectedTopic('all');
                setActivePostId(null);
                setIsMobileTopicsOpen(false);
              }}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-medium cursor-pointer ${
                selectedTopic === 'all'
                  ? 'bg-cyan-400 text-black font-bold'
                  : 'bg-white/5 text-white/70 hover:text-white'
              }`}
            >
              All ({posts.length})
            </button>
            {FORUM_TOPICS.map(t => (
              <button
                key={t.id}
                type="button"
                onClick={() => {
                  setSelectedTopic(t.id);
                  setActivePostId(null);
                  setIsMobileTopicsOpen(false);
                }}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-medium cursor-pointer ${
                  selectedTopic === t.id
                    ? 'bg-cyan-400 text-black font-bold'
                    : 'bg-white/5 text-white/70 hover:text-white'
                }`}
              >
                {t.name} ({topicCounts[t.id] || 0})
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Main Layout Grid: 75% Feed / Thread (9 cols) + 25% Compact Sidebar (3 cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-3.5 items-start">
        {/* Left / Center Primary Column (9 cols on desktop = 75%) */}
        <div className="lg:col-span-9 space-y-2.5 min-w-0">
          {activePost ? (
            /* ================================================================
               ACTIVE POST FULL THREAD VIEW (COMPACT REDDIT-STYLE DISCUSSION)
               ================================================================ */
            <div className="rounded-xl border border-white/10 bg-zinc-950/90 backdrop-blur-xl p-3.5 sm:p-4 shadow-lg space-y-3">
              {/* Compact Back to Feed & Topic Bar */}
              <div className="flex items-center justify-between gap-2 pb-2 border-b border-white/10">
                <button
                  type="button"
                  onClick={() => {
                    setActivePostId(null);
                    if (window.location.hash.startsWith('#forum/post/')) {
                      window.history.replaceState(null, '', '#forum');
                    }
                  }}
                  className="text-xs font-semibold text-white/70 hover:text-cyan-300 inline-flex items-center gap-1 cursor-pointer"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                  <span>Back to Feed</span>
                </button>

                <div className="flex items-center gap-1.5 text-[12px] text-white/50">
                  <span className="text-cyan-400 font-semibold">{activePost.topicName}</span>
                  <span aria-hidden="true">·</span>
                  <span className="text-white/75 font-medium">{activePost.postType}</span>
                </div>
              </div>

              {/* Compact Post Metadata, Title, Body & Resource Attachment */}
              <div>
                <div className="flex items-center justify-between gap-2 mb-1.5">
                  <div className="flex items-center gap-1.5 text-[12px] text-white/50 flex-wrap">
                    <button
                      type="button"
                      onClick={() =>
                        setViewingAuthor({
                          id: activePost.authorId,
                          name: activePost.authorName,
                          username: activePost.authorUsername,
                          avatar: activePost.authorAvatar,
                          program: activePost.authorProgram,
                          degreeTier: activePost.authorDegreeTier,
                          university: activePost.authorUniversity,
                          bio: activePost.authorBio
                        })
                      }
                      className="inline-flex items-center gap-1.5 text-white hover:text-cyan-300 font-semibold cursor-pointer"
                    >
                      {activePost.authorAvatar ? (
                        <img
                          src={activePost.authorAvatar}
                          alt={activePost.authorName}
                          className="w-4 h-4 rounded-full object-cover"
                        />
                      ) : (
                        <span className="w-4 h-4 rounded-full bg-cyan-500/20 text-cyan-300 text-[10px] flex items-center justify-center font-bold">
                          {activePost.authorName.charAt(0).toUpperCase()}
                        </span>
                      )}
                      <span>@{activePost.authorUsername}</span>
                    </button>

                    {activePost.authorProgram && (
                      <>
                        <span aria-hidden="true">·</span>
                        <span className="text-white/45">{activePost.authorProgram}</span>
                      </>
                    )}

                    <span aria-hidden="true">·</span>
                    <span>{formatRelativeTime(activePost.createdAt)}</span>

                    {activePost.acceptedCommentId && (
                      <>
                        <span aria-hidden="true">·</span>
                        <span className="text-emerald-400 font-semibold inline-flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          Answered
                        </span>
                      </>
                    )}
                  </div>

                  {user && !user.isGuest && user.id === activePost.authorId && (
                    <div className="flex items-center gap-2 text-[12px] text-white/50">
                      <button
                        type="button"
                        onClick={() => handleOpenEditPost(activePost)}
                        className="hover:text-cyan-300 inline-flex items-center gap-1 cursor-pointer"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                        <span>Edit</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeletePost(activePost)}
                        className="hover:text-rose-400 inline-flex items-center gap-1 cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Delete</span>
                      </button>
                    </div>
                  )}
                </div>

                <h2 className="text-base sm:text-lg font-bold text-white leading-snug mb-2">
                  {activePost.title}
                </h2>

                <FormattedForumText content={activePost.body} />

                {/* Compact Linked Study Library Resource Attachment */}
                {renderStudyResourceLinkCard(activePost.resourceId)}

                {/* Optional Linked My Program Course Reference */}
                {activePost.programCourseRef && (
                  <div className="mt-2 px-2.5 py-1.5 rounded-lg bg-white/[0.03] border border-white/10 flex items-center justify-between gap-2 text-xs">
                    <div className="flex items-center gap-2 text-white/75 min-w-0">
                      <GraduationCap className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                      <span className="truncate">
                        Program: <strong>{activePost.programCourseRef.programName}</strong>
                        {activePost.programCourseRef.courseName
                          ? ` · ${activePost.programCourseRef.courseName}`
                          : ''}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => onOpenProgram(activePost.programCourseRef!.programId)}
                      className="text-[11px] font-semibold text-cyan-400 hover:text-cyan-300 shrink-0 cursor-pointer"
                    >
                      Open Program
                    </button>
                  </div>
                )}

                {/* Optional Validated External Link */}
                {activePost.externalLink && (
                  <div className="mt-2 px-2.5 py-1.5 rounded-lg bg-white/[0.03] border border-white/10 flex items-center justify-between gap-2 text-xs">
                    <div className="flex items-center gap-1.5 text-cyan-300 min-w-0">
                      <ExternalLink className="w-3.5 h-3.5 shrink-0" />
                      <a
                        href={activePost.externalLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="underline truncate hover:text-cyan-200"
                      >
                        {activePost.externalLink}
                      </a>
                    </div>
                    <span className="text-[10px] text-white/40 shrink-0">External Link</span>
                  </div>
                )}
              </div>

              {/* Compact Post Engagement Toolbar */}
              <div className="pt-2 border-t border-white/10 flex items-center justify-between gap-2 flex-wrap text-xs text-white/55">
                <div className="flex items-center gap-2">
                  {/* Grouped Vote Controls */}
                  <div className="h-7 inline-flex items-center gap-0.5 bg-white/[0.04] rounded-md px-1.5 border border-white/10">
                    <button
                      type="button"
                      onClick={e => handleVote(e, 'post', activePost.id, 1)}
                      aria-label="Upvote post"
                      className={`p-0.5 rounded transition-colors cursor-pointer ${
                        activePost.userVote === 1
                          ? 'text-cyan-400 bg-cyan-400/15'
                          : 'text-white/55 hover:text-white'
                      }`}
                    >
                      <ArrowBigUp className="w-3.5 h-3.5" />
                    </button>
                    <span
                      className={`text-xs font-bold tabular-nums px-1 ${
                        activePost.userVote === 1
                          ? 'text-cyan-300'
                          : activePost.userVote === -1
                          ? 'text-rose-400'
                          : 'text-white'
                      }`}
                    >
                      {activePost.score}
                    </span>
                    <button
                      type="button"
                      onClick={e => handleVote(e, 'post', activePost.id, -1)}
                      aria-label="Downvote post"
                      className={`p-0.5 rounded transition-colors cursor-pointer ${
                        activePost.userVote === -1
                          ? 'text-rose-400 bg-rose-400/15'
                          : 'text-white/55 hover:text-white'
                      }`}
                    >
                      <ArrowBigDown className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <span className="h-7 px-2 rounded-md inline-flex items-center gap-1.5 text-white/65">
                    <MessageSquare className="w-3.5 h-3.5 text-cyan-400" />
                    <span className="tabular-nums font-semibold">{comments.length}</span>
                    <span>comments</span>
                  </span>
                </div>

                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={e => handleToggleBookmark(e, activePost.id)}
                    className={`h-7 px-2 rounded-md hover:bg-white/5 inline-flex items-center gap-1 cursor-pointer ${
                      activePost.isBookmarked ? 'text-cyan-300 font-semibold' : 'hover:text-white'
                    }`}
                  >
                    {activePost.isBookmarked ? (
                      <BookmarkCheck className="w-3.5 h-3.5 text-cyan-400" />
                    ) : (
                      <Bookmark className="w-3.5 h-3.5" />
                    )}
                    <span>{activePost.isBookmarked ? 'Saved' : 'Save'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={e => handleSharePost(e, activePost)}
                    className="h-7 px-2 rounded-md hover:bg-white/5 hover:text-white inline-flex items-center gap-1 cursor-pointer"
                  >
                    <Share2 className="w-3.5 h-3.5" />
                    <span>Share</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      if (!user || user.isGuest) {
                        onOpenAuthModal('signin');
                        return;
                      }
                      setReportTarget({
                        targetType: 'post',
                        targetId: activePost.id,
                        postId: activePost.id,
                        snippet: activePost.title
                      });
                    }}
                    className="h-7 px-2 rounded-md hover:bg-white/5 hover:text-amber-300 inline-flex items-center gap-1 cursor-pointer"
                  >
                    <Flag className="w-3.5 h-3.5" />
                    <span>Report</span>
                  </button>
                </div>
              </div>

              {/* Compact Comment Composer directly below action toolbar */}
              <div className="pt-2.5 border-t border-white/10 space-y-1.5">
                <textarea
                  rows={2}
                  maxLength={FORUM_MAX_COMMENT_LENGTH}
                  value={newCommentBody}
                  onChange={e => setNewCommentBody(e.target.value)}
                  placeholder={
                    user && !user.isGuest
                      ? 'Add a comment, answer, mathematical derivation ($...$), or code snippet (```)...'
                      : 'Sign in to contribute a comment or answer...'
                  }
                  className="w-full px-3 py-2 bg-zinc-900 border border-white/15 rounded-lg text-xs sm:text-sm text-white placeholder-white/35 focus:outline-none focus:border-cyan-400"
                />
                <div className="flex items-center justify-between gap-2 text-[11px] text-white/40">
                  <span>
                    Text-first policy: No file/media uploads · {newCommentBody.length}/
                    {FORUM_MAX_COMMENT_LENGTH} chars
                  </span>
                  <button
                    type="button"
                    disabled={!newCommentBody.trim() || isSubmittingComment}
                    onClick={() => handleCreateComment(null)}
                    className="h-7 px-3 rounded-lg bg-cyan-400 hover:bg-cyan-300 text-black text-xs font-bold transition-colors disabled:opacity-40 cursor-pointer shrink-0"
                  >
                    {isSubmittingComment ? 'Posting...' : 'Post Comment'}
                  </button>
                </div>
              </div>

              {/* Compact Community Responses Section */}
              <div className="pt-2.5 border-t border-white/10 space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-white/80">
                    Community Responses ({comments.length})
                  </h3>
                  <div className="flex items-center gap-0.5 bg-zinc-900 p-0.5 rounded-lg border border-white/10">
                    <button
                      type="button"
                      onClick={() => setCommentSortBy('best')}
                      className={`px-2 py-0.5 rounded text-[11px] font-medium transition-colors cursor-pointer ${
                        commentSortBy === 'best'
                          ? 'bg-cyan-400 text-black font-bold'
                          : 'text-white/60 hover:text-white'
                      }`}
                    >
                      Best
                    </button>
                    <button
                      type="button"
                      onClick={() => setCommentSortBy('newest')}
                      className={`px-2 py-0.5 rounded text-[11px] font-medium transition-colors cursor-pointer ${
                        commentSortBy === 'newest'
                          ? 'bg-cyan-400 text-black font-bold'
                          : 'text-white/60 hover:text-white'
                      }`}
                    >
                      Newest
                    </button>
                  </div>
                </div>

                {isLoadingComments ? (
                  <div className="py-4 text-center text-xs text-white/50">
                    Loading responses...
                  </div>
                ) : topLevelComments.length === 0 ? (
                  <div className="py-4 px-3 text-center rounded-lg border border-white/5 bg-white/[0.015]">
                    <p className="text-xs text-white/60">
                      No comments yet — be the first student to reply or answer this discussion.
                    </p>
                  </div>
                ) : (
                  <div className="divide-y divide-white/10">
                    {topLevelComments.map(c => renderCommentNode(c, 0))}
                  </div>
                )}
              </div>
            </div>
          ) : (
            /* ================================================================
               FORUM FEED VIEW & COMPACT TOOLBAR
               ================================================================ */
            <>
              {/* Compact Feed Filter & Search Toolbar */}
              <section
                aria-label="Forum feed controls"
                className="rounded-xl border border-white/10 bg-zinc-950/85 backdrop-blur-xl p-2.5 sm:px-3 sm:py-2.5 space-y-2"
              >
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-2">
                  {/* Segmented Feed Mode Tabs */}
                  <div className="flex items-center gap-1 overflow-x-auto max-w-full">
                    {(
                      [
                        { id: 'for-you', label: 'For You' },
                        { id: 'latest', label: 'Latest' },
                        { id: 'popular', label: 'Popular' },
                        { id: 'top', label: 'Top' },
                        { id: 'unanswered', label: 'Unanswered' },
                        { id: 'saved', label: 'Saved' }
                      ] as { id: ForumFeedFilter; label: string }[]
                    ).map(tab => (
                      <button
                        key={tab.id}
                        type="button"
                        onClick={() => {
                          setFeedFilter(tab.id);
                          setVisibleCount(FORUM_PAGE_SIZE);
                        }}
                        className={`h-7 px-2.5 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap cursor-pointer ${
                          feedFilter === tab.id
                            ? 'bg-cyan-400 text-black font-bold'
                            : 'text-white/65 hover:text-white hover:bg-white/5'
                        }`}
                      >
                        {tab.label}
                      </button>
                    ))}

                    {feedFilter === 'top' && (
                      <select
                        value={topTimeRange}
                        onChange={e => setTopTimeRange(e.target.value as ForumTopTimeRange)}
                        aria-label="Top time range"
                        className="h-7 px-2 bg-zinc-900 border border-white/15 rounded-lg text-xs text-white focus:outline-none focus:border-cyan-400 cursor-pointer shrink-0"
                      >
                        <option value="all">All Time</option>
                        <option value="month">This Month</option>
                        <option value="week">This Week</option>
                        <option value="today">Today</option>
                      </select>
                    )}
                  </div>

                  {/* Compact Search & Post-Type Filter */}
                  <div className="flex items-center gap-1.5 flex-1 md:max-w-xs lg:max-w-sm">
                    <div className="relative flex-1 min-w-0">
                      <Search className="w-3.5 h-3.5 text-white/40 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                      <input
                        type="text"
                        value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
                        placeholder="Search posts or @username..."
                        className="w-full h-7 pl-8 pr-6 bg-zinc-900/90 border border-white/10 rounded-lg text-xs text-white placeholder-white/35 focus:outline-none focus:border-cyan-400"
                      />
                      {searchQuery && (
                        <button
                          type="button"
                          onClick={() => setSearchQuery('')}
                          className="absolute right-1.5 top-1/2 -translate-y-1/2 p-0.5 text-white/40 hover:text-white cursor-pointer"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      )}
                    </div>

                    <select
                      value={selectedPostType}
                      onChange={e => setSelectedPostType(e.target.value as any)}
                      aria-label="Filter by post type"
                      className="h-7 px-2 bg-zinc-900 border border-white/10 rounded-lg text-xs font-medium text-white focus:outline-none focus:border-cyan-400 cursor-pointer shrink-0"
                    >
                      <option value="all">All Types</option>
                      {FORUM_POST_TYPES.map(pt => (
                        <option key={pt} value={pt}>
                          {pt}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </section>

              {/* Feed States: Loading, Error, Empty, or Compact Reddit-Style Feed List */}
              {isLoading ? (
                <div className="rounded-xl border border-white/10 bg-zinc-950/80 divide-y divide-white/10">
                  {[1, 2, 3, 4].map(n => (
                    <div key={n} className="h-24 animate-pulse p-3.5" />
                  ))}
                </div>
              ) : loadError ? (
                <div className="p-4 rounded-xl border border-rose-500/30 bg-zinc-950/90 text-center space-y-2">
                  <AlertCircle className="w-5 h-5 text-rose-400 mx-auto" />
                  <h3 className="text-xs font-bold text-white">Could not load forum feed</h3>
                  <p className="text-xs text-white/60">{loadError}</p>
                  <button
                    type="button"
                    onClick={loadForumFeed}
                    className="h-7 px-3 rounded-lg bg-white/10 hover:bg-white/15 text-white text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer"
                  >
                    <RefreshCw className="w-3 h-3" />
                    <span>Retry</span>
                  </button>
                </div>
              ) : visiblePosts.length === 0 ? (
                <div className="py-6 px-4 rounded-xl border border-white/10 bg-zinc-950/85 text-center">
                  <h3 className="text-sm font-bold text-white">
                    {posts.length === 0
                      ? 'No forum posts published yet'
                      : 'No forum posts match these filters'}
                  </h3>
                  <p className="text-xs text-white/55 mt-1 mb-3">
                    {posts.length === 0
                      ? 'Start the first scholarly discussion, ask a course question, or share a study tip.'
                      : 'Try clearing your current search, topic, or feed filter, or publish a new post.'}
                  </p>
                  <div className="flex flex-wrap items-center justify-center gap-2">
                    {(selectedTopic !== 'all' ||
                      selectedPostType !== 'all' ||
                      searchQuery.trim() ||
                      feedFilter !== 'latest') && (
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedTopic('all');
                          setSelectedPostType('all');
                          setSearchQuery('');
                          setFeedFilter('latest');
                        }}
                        className="h-7 px-3 rounded-lg bg-white/10 hover:bg-white/15 text-white text-xs font-semibold transition-colors cursor-pointer"
                      >
                        Reset Filters
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => handleOpenNewComposer('Discussion')}
                      className="h-7 px-3 rounded-lg bg-cyan-400 hover:bg-cyan-300 text-black text-xs font-bold transition-colors inline-flex items-center gap-1 cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Create Post</span>
                    </button>
                  </div>
                </div>
              ) : (
                <div className="rounded-xl border border-white/10 bg-zinc-950/85 divide-y divide-white/10 overflow-hidden">
                  {visiblePosts.map(post => {
                    const isOwner = Boolean(user && !user.isGuest && user.id === post.authorId);
                    return (
                      <article
                        key={post.id}
                        onClick={() => setActivePostId(post.id)}
                        className="px-3.5 py-2.5 sm:px-4 sm:py-3 hover:bg-white/[0.025] transition-colors cursor-pointer group"
                      >
                        {/* 1. Single-Line Metadata: Avatar, @username, Timestamp, Topic & Post Type */}
                        <div className="flex items-center justify-between gap-2 text-[12px] text-white/50 mb-1">
                          <div className="flex items-center gap-1.5 flex-wrap min-w-0">
                            <button
                              type="button"
                              onClick={e => {
                                e.stopPropagation();
                                setViewingAuthor({
                                  id: post.authorId,
                                  name: post.authorName,
                                  username: post.authorUsername,
                                  avatar: post.authorAvatar,
                                  program: post.authorProgram,
                                  degreeTier: post.authorDegreeTier,
                                  university: post.authorUniversity,
                                  bio: post.authorBio
                                });
                              }}
                              className="inline-flex items-center gap-1.5 text-white/85 hover:text-cyan-300 font-semibold cursor-pointer"
                            >
                              {post.authorAvatar ? (
                                <img
                                  src={post.authorAvatar}
                                  alt={post.authorName}
                                  className="w-4 h-4 rounded-full object-cover"
                                />
                              ) : (
                                <span className="w-4 h-4 rounded-full bg-cyan-500/20 text-cyan-300 text-[10px] flex items-center justify-center font-bold">
                                  {post.authorName.charAt(0).toUpperCase()}
                                </span>
                              )}
                              <span>@{post.authorUsername}</span>
                            </button>

                            <span aria-hidden="true">·</span>
                            <span>{formatRelativeTime(post.createdAt)}</span>
                            <span aria-hidden="true">·</span>
                            <span className="text-cyan-400 font-semibold">{post.topicName}</span>
                            <span aria-hidden="true">·</span>
                            <span className="text-white/70 font-medium">{post.postType}</span>

                            {post.acceptedCommentId && (
                              <>
                                <span aria-hidden="true">·</span>
                                <span className="text-emerald-400 font-semibold inline-flex items-center gap-1">
                                  <CheckCircle2 className="w-3 h-3" />
                                  Answered
                                </span>
                              </>
                            )}
                          </div>

                          {isOwner && (
                            <div
                              onClick={e => e.stopPropagation()}
                              className="flex items-center gap-1.5 shrink-0"
                            >
                              <button
                                type="button"
                                onClick={() => handleOpenEditPost(post)}
                                className="text-white/40 hover:text-cyan-300 p-0.5 cursor-pointer"
                                title="Edit post"
                              >
                                <Edit3 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDeletePost(post)}
                                className="text-white/40 hover:text-rose-400 p-0.5 cursor-pointer"
                                title="Delete post"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          )}
                        </div>

                        {/* 2. Post Title */}
                        <h2 className="text-sm sm:text-[15px] font-bold text-white group-hover:text-cyan-300 transition-colors leading-snug mb-1">
                          {post.title}
                        </h2>

                        {/* 3. Short Body Preview */}
                        <div className="line-clamp-2 text-xs sm:text-[13px] text-white/65 leading-normal">
                          <FormattedForumText content={post.body} compact />
                        </div>

                        {/* 4. Compact Inline Resource Attachment (if present) */}
                        {renderStudyResourceLinkCard(post.resourceId)}

                        {/* 5. Compact Interaction Toolbar */}
                        <div className="mt-2 flex items-center justify-between gap-2 flex-wrap text-[12px] text-white/50">
                          <div className="flex items-center gap-1.5">
                            {/* Grouped Vote Controls */}
                            <div
                              onClick={e => e.stopPropagation()}
                              className="h-7 inline-flex items-center gap-0.5 bg-white/[0.03] rounded-md px-1.5 border border-white/10"
                            >
                              <button
                                type="button"
                                onClick={e => handleVote(e, 'post', post.id, 1)}
                                aria-label="Upvote"
                                className={`p-0.5 rounded transition-colors cursor-pointer ${
                                  post.userVote === 1
                                    ? 'text-cyan-400 bg-cyan-400/15'
                                    : 'text-white/50 hover:text-white'
                                }`}
                              >
                                <ArrowBigUp className="w-3.5 h-3.5" />
                              </button>
                              <span
                                className={`text-xs font-bold tabular-nums px-1 ${
                                  post.userVote === 1
                                    ? 'text-cyan-300'
                                    : post.userVote === -1
                                    ? 'text-rose-400'
                                    : 'text-white/85'
                                }`}
                              >
                                {post.score}
                              </span>
                              <button
                                type="button"
                                onClick={e => handleVote(e, 'post', post.id, -1)}
                                aria-label="Downvote"
                                className={`p-0.5 rounded transition-colors cursor-pointer ${
                                  post.userVote === -1
                                    ? 'text-rose-400 bg-rose-400/15'
                                    : 'text-white/50 hover:text-white'
                                }`}
                              >
                                <ArrowBigDown className="w-3.5 h-3.5" />
                              </button>
                            </div>

                            {/* Comment Count Action */}
                            <span className="h-7 px-2 rounded-md hover:bg-white/5 inline-flex items-center gap-1.5 hover:text-white">
                              <MessageSquare className="w-3.5 h-3.5 text-cyan-400" />
                              <span className="tabular-nums font-semibold">{post.commentsCount}</span>
                              <span className="hidden xs:inline">comments</span>
                            </span>
                          </div>

                          <div
                            onClick={e => e.stopPropagation()}
                            className="flex items-center gap-1"
                          >
                            <button
                              type="button"
                              onClick={e => handleToggleBookmark(e, post.id)}
                              className={`h-7 px-2 rounded-md hover:bg-white/5 inline-flex items-center gap-1 cursor-pointer ${
                                post.isBookmarked ? 'text-cyan-300 font-semibold' : 'hover:text-white'
                              }`}
                            >
                              {post.isBookmarked ? (
                                <BookmarkCheck className="w-3.5 h-3.5 text-cyan-400" />
                              ) : (
                                <Bookmark className="w-3.5 h-3.5" />
                              )}
                              <span>{post.isBookmarked ? 'Saved' : 'Save'}</span>
                            </button>

                            <button
                              type="button"
                              onClick={e => handleSharePost(e, post)}
                              className="h-7 px-2 rounded-md hover:bg-white/5 hover:text-white inline-flex items-center gap-1 cursor-pointer"
                            >
                              <Share2 className="w-3.5 h-3.5" />
                              <span>Share</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => {
                                if (!user || user.isGuest) {
                                  onOpenAuthModal('signin');
                                  return;
                                }
                                setReportTarget({
                                  targetType: 'post',
                                  targetId: post.id,
                                  postId: post.id,
                                  snippet: post.title
                                });
                              }}
                              className="h-7 px-2 rounded-md hover:bg-white/5 hover:text-amber-300 inline-flex items-center gap-1 cursor-pointer"
                            >
                              <Flag className="w-3.5 h-3.5" />
                              <span>Report</span>
                            </button>
                          </div>
                        </div>
                      </article>
                    );
                  })}

                  {/* Incremental Pagination Control */}
                  {filteredPosts.length > visibleCount && (
                    <div className="p-2.5 text-center bg-white/[0.01]">
                      <button
                        type="button"
                        onClick={() => setVisibleCount(prev => prev + FORUM_PAGE_SIZE)}
                        className="h-8 px-4 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-white/10 text-xs font-semibold text-white cursor-pointer"
                      >
                        Load More Discussions ({filteredPosts.length - visibleCount} remaining)
                      </button>
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>

        {/* Right Sidebar: Compact Academic Topics & Text-First Policy (3 cols on desktop = 25%) */}
        <aside className="hidden lg:block lg:col-span-3 space-y-2.5 w-full">
          {/* Compact Topics Directory & Filter Panel */}
          <div className="rounded-xl border border-white/10 bg-zinc-950/85 backdrop-blur-xl p-3 space-y-2">
            <div className="flex items-center justify-between">
              <h2 className="text-[11px] font-bold uppercase tracking-wider text-white/75">
                Academic Topics
              </h2>
              {selectedTopic !== 'all' && (
                <button
                  type="button"
                  onClick={() => {
                    setSelectedTopic('all');
                    setActivePostId(null);
                  }}
                  className="text-[11px] text-cyan-400 hover:text-cyan-300 cursor-pointer"
                >
                  Reset
                </button>
              )}
            </div>

            <div className="space-y-0.5">
              <button
                type="button"
                onClick={() => {
                  setSelectedTopic('all');
                  setActivePostId(null);
                }}
                className={`w-full px-2.5 py-1.5 rounded-lg text-left text-xs flex items-center justify-between transition-colors cursor-pointer ${
                  selectedTopic === 'all'
                    ? 'bg-cyan-400/15 text-cyan-300 border border-cyan-500/30 font-bold'
                    : 'text-white/75 hover:text-white hover:bg-white/5 font-medium'
                }`}
              >
                <span>All Forum Topics</span>
                <span className="text-[11px] text-white/45 tabular-nums">{posts.length}</span>
              </button>

              {displayedSidebarTopics.map(topic => {
                const isSelected = selectedTopic === topic.id;
                const isFollowed = followedTopics.includes(topic.id);
                const count = topicCounts[topic.id] || 0;

                return (
                  <div
                    key={topic.id}
                    className={`px-2.5 py-1.5 rounded-lg flex items-center justify-between gap-1.5 transition-colors ${
                      isSelected
                        ? 'bg-cyan-400/15 border border-cyan-500/30'
                        : 'hover:bg-white/5'
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedTopic(topic.id);
                        setActivePostId(null);
                      }}
                      className="flex-1 text-left min-w-0 cursor-pointer"
                    >
                      <div
                        className={`text-xs truncate leading-tight ${
                          isSelected ? 'text-cyan-300 font-bold' : 'text-white/80 font-medium'
                        }`}
                      >
                        {topic.name}
                      </div>
                      <div className="text-[10px] text-white/40 truncate leading-tight">
                        {topic.description}
                      </div>
                    </button>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <span className="text-[11px] text-white/45 tabular-nums">{count}</span>
                      <button
                        type="button"
                        onClick={() => {
                          const updated = toggleFollowForumTopic(topic.id, user?.id);
                          setFollowedTopics(updated);
                        }}
                        title={
                          isFollowed
                            ? 'Following topic in For You feed'
                            : 'Follow topic for For You feed'
                        }
                        className={`h-5 px-1.5 rounded text-[10px] border transition-colors cursor-pointer inline-flex items-center ${
                          isFollowed
                            ? 'border-cyan-500/40 bg-cyan-500/15 text-cyan-300 font-semibold'
                            : 'border-white/10 text-white/45 hover:text-white'
                        }`}
                      >
                        {isFollowed ? 'Following' : 'Follow'}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            {FORUM_TOPICS.length > 6 && (
              <button
                type="button"
                onClick={() => setShowAllTopics(prev => !prev)}
                className="w-full pt-1 text-center text-[11px] font-semibold text-cyan-400 hover:text-cyan-300 cursor-pointer"
              >
                {showAllTopics
                  ? 'Show fewer topics'
                  : `Show all ${FORUM_TOPICS.length} topics`}
              </button>
            )}
          </div>

          {/* Compact Text-First Academic Policy Panel */}
          <div className="rounded-xl border border-white/10 bg-zinc-950/85 p-3 space-y-1.5 text-[11px] text-white/60">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5 text-white font-bold text-xs">
                <ShieldCheck className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                <span>Text-First Academic Policy</span>
              </div>
              <button
                type="button"
                onClick={() => setIsPolicyExpanded(prev => !prev)}
                className="text-[10px] text-cyan-400 hover:text-cyan-300 font-semibold cursor-pointer"
              >
                {isPolicyExpanded ? 'Hide' : 'Details'}
              </button>
            </div>
            <p className="leading-snug text-white/50">
              Text, math ($...$), code, and Study Library resource links only — direct file/media uploads are disabled.
            </p>
            {isPolicyExpanded && (
              <p className="leading-snug text-white/50 pt-1 border-t border-white/10">
                To share a PDF note or past paper, select an existing item from the{' '}
                <strong className="text-white/75">Study Library</strong> inside the post composer without re-uploading.
              </p>
            )}
          </div>
        </aside>
      </div>

      {/* ====================================================================
          TEXT-ONLY POST COMPOSER MODAL (NO FILE / MEDIA UPLOAD FIELDS)
          ==================================================================== */}
      {isComposerOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="forum-composer-title"
          className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md overflow-y-auto"
        >
          <div className="bg-zinc-950 border border-white/15 rounded-2xl sm:rounded-3xl w-full max-w-2xl p-5 sm:p-6 shadow-2xl my-auto max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between gap-2 pb-3 border-b border-white/10">
              <div>
                <h2 id="forum-composer-title" className="text-base sm:text-lg font-bold text-white">
                  {editingPost ? 'Edit Forum Post' : 'Create Text-First Forum Post'}
                </h2>
                <p className="text-xs text-white/50">
                  Share academic questions, explanations, math ($...$), code snippets, or link an existing Study Library resource.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsComposerOpen(false)}
                className="p-1.5 text-white/50 hover:text-white rounded-lg cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {composerError && (
              <div className="mt-3 p-3 rounded-xl bg-rose-950/40 border border-rose-500/30 text-xs text-rose-200 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                <span>{composerError}</span>
              </div>
            )}

            <form onSubmit={handleSubmitPost} className="space-y-4 mt-4">
              {/* Post Type & Topic Row */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-white/80 mb-1">
                    Post Type *
                  </label>
                  <select
                    value={composerType}
                    onChange={e => setComposerType(e.target.value as ForumPostType)}
                    className="w-full px-3 py-2 bg-zinc-900 border border-white/15 rounded-xl text-xs sm:text-sm text-white focus:outline-none focus:border-cyan-400 cursor-pointer"
                  >
                    {FORUM_POST_TYPES.map(pt => (
                      <option key={pt} value={pt}>
                        {pt}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-white/80 mb-1">
                    Topic Category *
                  </label>
                  <select
                    value={composerTopic}
                    onChange={e => setComposerTopic(e.target.value as ForumTopicId)}
                    className="w-full px-3 py-2 bg-zinc-900 border border-white/15 rounded-xl text-xs sm:text-sm text-white focus:outline-none focus:border-cyan-400 cursor-pointer"
                  >
                    {FORUM_TOPICS.map(t => (
                      <option key={t.id} value={t.id}>
                        {t.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Title with Live Character Count */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-semibold text-white/80">
                    Post Title *
                  </label>
                  <span
                    className={`text-[11px] tabular-nums ${
                      composerTitle.length > FORUM_MAX_TITLE_LENGTH
                        ? 'text-rose-400 font-bold'
                        : 'text-white/45'
                    }`}
                  >
                    {composerTitle.length} / {FORUM_MAX_TITLE_LENGTH}
                  </span>
                </div>
                <input
                  type="text"
                  required
                  maxLength={FORUM_MAX_TITLE_LENGTH}
                  value={composerTitle}
                  onChange={e => setComposerTitle(e.target.value)}
                  placeholder="e.g. How to prove uniform convergence for power series on compact sets?"
                  className="w-full px-3.5 py-2.5 bg-zinc-900 border border-white/15 rounded-xl text-xs sm:text-sm text-white placeholder-white/35 focus:outline-none focus:border-cyan-400"
                />
              </div>

              {/* Text Formatting Helper Bar & Body Textarea */}
              <div>
                <div className="flex items-center justify-between gap-2 mb-1.5 flex-wrap">
                  <label className="text-xs font-semibold text-white/80">
                    Post Body (Text, Math, Lists, Code) *
                  </label>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => insertFormattingSnippet('$\\sum_{n=1}^{\\infty} a_n$')}
                      title="Insert inline math"
                      className="px-2 py-1 rounded bg-white/5 hover:bg-white/10 text-[11px] text-white/75 inline-flex items-center gap-1 cursor-pointer"
                    >
                      <Sigma className="w-3 h-3 text-cyan-400" />
                      <span>Math</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => insertFormattingSnippet('```\n// code snippet\n```')}
                      title="Insert code block"
                      className="px-2 py-1 rounded bg-white/5 hover:bg-white/10 text-[11px] text-white/75 inline-flex items-center gap-1 cursor-pointer"
                    >
                      <Code className="w-3 h-3 text-cyan-400" />
                      <span>Code</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => insertFormattingSnippet('- First key point\n- Second key point')}
                      title="Insert bullet list"
                      className="px-2 py-1 rounded bg-white/5 hover:bg-white/10 text-[11px] text-white/75 inline-flex items-center gap-1 cursor-pointer"
                    >
                      <List className="w-3 h-3 text-cyan-400" />
                      <span>List</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => insertFormattingSnippet('> Key theorem or quotation')}
                      title="Insert quotation"
                      className="px-2 py-1 rounded bg-white/5 hover:bg-white/10 text-[11px] text-white/75 inline-flex items-center gap-1 cursor-pointer"
                    >
                      <Quote className="w-3 h-3 text-cyan-400" />
                      <span>Quote</span>
                    </button>
                  </div>
                </div>

                <textarea
                  required
                  rows={7}
                  maxLength={FORUM_MAX_BODY_LENGTH}
                  value={composerBody}
                  onChange={e => setComposerBody(e.target.value)}
                  placeholder="Write your question, derivation, or discussion in plain text. Wrap inline math in $...$, display math in $$...$$, and code in ```...```."
                  className="w-full px-3.5 py-2.5 bg-zinc-900 border border-white/15 rounded-xl text-xs sm:text-sm text-white placeholder-white/35 focus:outline-none focus:border-cyan-400 leading-relaxed"
                />

                <div className="flex items-center justify-between mt-1 text-[11px] text-white/45">
                  <span>Direct file/media uploads are disabled (link Study Library resources below).</span>
                  <span
                    className={`tabular-nums ${
                      composerBody.length > FORUM_MAX_BODY_LENGTH
                        ? 'text-rose-400 font-bold'
                        : 'text-white/45'
                    }`}
                  >
                    {composerBody.length.toLocaleString()} / {FORUM_MAX_BODY_LENGTH.toLocaleString()}
                  </span>
                </div>
              </div>

              {/* Study Library Resource Link Selector (References existing StudyNote record) */}
              <div className="p-3.5 rounded-xl bg-white/[0.02] border border-white/10 space-y-3">
                <div className="text-xs font-semibold text-white/85 flex items-center gap-1.5">
                  <BookOpen className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Reference Existing Study Library Material or Program Course (Optional)</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] text-white/55 mb-1">
                      Link Study Library Document
                    </label>
                    <select
                      value={composerResourceId}
                      onChange={e => setComposerResourceId(e.target.value)}
                      className="w-full px-3 py-2 bg-zinc-900 border border-white/15 rounded-xl text-xs text-white focus:outline-none focus:border-cyan-400 cursor-pointer"
                    >
                      <option value="">None (No Study Library link)</option>
                      {notes.map(n => (
                        <option key={n.id} value={n.id}>
                          {n.title} ({getNoteCourseDisplay(n)})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] text-white/55 mb-1">
                      Link Academic Degree Program
                    </label>
                    <select
                      value={composerProgramId}
                      onChange={e => setComposerProgramId(e.target.value)}
                      className="w-full px-3 py-2 bg-zinc-900 border border-white/15 rounded-xl text-xs text-white focus:outline-none focus:border-cyan-400 cursor-pointer"
                    >
                      <option value="">None (General Platform-Wide)</option>
                      {unlockedPrograms.map(prog => (
                        <option key={prog.id} value={prog.id}>
                          {prog.name} ({prog.degreeTier})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] text-white/55 mb-1">
                    External Reference Link (Optional, https:// only)
                  </label>
                  <input
                    type="url"
                    value={composerExternalLink}
                    onChange={e => setComposerExternalLink(e.target.value)}
                    placeholder="https://arxiv.org/abs/... or https://ocw.mit.edu/..."
                    className="w-full px-3 py-2 bg-zinc-900 border border-white/15 rounded-xl text-xs text-white placeholder-white/35 focus:outline-none focus:border-cyan-400"
                  />
                </div>
              </div>

              {/* Submit / Cancel Footer */}
              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setIsComposerOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-white/60 hover:text-white cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={
                    isSubmittingPost ||
                    !composerTitle.trim() ||
                    !composerBody.trim()
                  }
                  className="px-5 py-2.5 rounded-xl bg-cyan-400 hover:bg-cyan-300 text-black text-xs font-bold transition-colors disabled:opacity-40 cursor-pointer shadow-sm"
                >
                  {isSubmittingPost
                    ? 'Publishing...'
                    : editingPost
                    ? 'Save Changes'
                    : 'Publish Post'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ====================================================================
          REPORT CONTENT MODAL
          ==================================================================== */}
      {reportTarget && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md"
        >
          <div className="bg-zinc-950 border border-white/15 rounded-2xl w-full max-w-md p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-white">
                Report {reportTarget.targetType === 'post' ? 'Forum Post' : 'Comment'}
              </h3>
              <button
                type="button"
                onClick={() => setReportTarget(null)}
                className="p-1 text-white/50 hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-white/55">
              Reports are confidential and reviewed by authorized community moderators.
            </p>

            <form onSubmit={handleSubmitReport} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-white/80 mb-1">
                  Reason for Report *
                </label>
                <select
                  value={reportReason}
                  onChange={e => setReportReason(e.target.value as ForumReportReason)}
                  className="w-full px-3 py-2 bg-zinc-900 border border-white/15 rounded-xl text-xs text-white focus:outline-none focus:border-cyan-400 cursor-pointer"
                >
                  {FORUM_REPORT_REASONS.map(r => (
                    <option key={r} value={r}>
                      {r}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-white/80 mb-1">
                  Additional Context (Optional)
                </label>
                <textarea
                  rows={3}
                  maxLength={500}
                  value={reportDetails}
                  onChange={e => setReportDetails(e.target.value)}
                  placeholder="Provide any relevant context for moderators..."
                  className="w-full px-3 py-2 bg-zinc-900 border border-white/15 rounded-xl text-xs text-white placeholder-white/35 focus:outline-none focus:border-cyan-400"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setReportTarget(null)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-white/60 hover:text-white cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingReport}
                  className="px-4 py-2 rounded-xl bg-amber-400 hover:bg-amber-300 text-black text-xs font-bold cursor-pointer"
                >
                  {isSubmittingReport ? 'Submitting...' : 'Submit Report'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ====================================================================
          PUBLIC SCHOLAR PROFILE MODAL (INTEGRATED WITH EXISTING PROFILE SYSTEM)
          ==================================================================== */}
      {viewingAuthor && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md"
        >
          <div className="bg-zinc-950 border border-white/15 rounded-2xl w-full max-w-lg p-5 sm:p-6 shadow-2xl space-y-4 max-h-[88vh] overflow-y-auto">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3.5">
                {viewingAuthor.avatar ? (
                  <img
                    src={viewingAuthor.avatar}
                    alt={viewingAuthor.name}
                    className="w-14 h-14 rounded-2xl object-cover border border-cyan-400/40"
                  />
                ) : (
                  <div className="w-14 h-14 rounded-2xl bg-cyan-500/15 border border-cyan-500/30 flex items-center justify-center text-cyan-300 font-bold text-xl">
                    {viewingAuthor.name.charAt(0).toUpperCase()}
                  </div>
                )}
                <div>
                  <h3 className="text-base font-bold text-white">{viewingAuthor.name}</h3>
                  <p className="text-xs text-cyan-300 font-jetbrains">@{viewingAuthor.username}</p>
                  {viewingAuthor.program && (
                    <p className="text-xs text-white/60 mt-0.5">
                      {viewingAuthor.program}
                      {viewingAuthor.degreeTier ? ` · ${viewingAuthor.degreeTier}` : ''}
                    </p>
                  )}
                </div>
              </div>
              <button
                type="button"
                onClick={() => setViewingAuthor(null)}
                className="p-1 text-white/50 hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {viewingAuthor.bio && (
              <p className="text-xs text-white/70 leading-relaxed">{viewingAuthor.bio}</p>
            )}

            {/* Author's Public Forum Posts */}
            <div className="pt-3 border-t border-white/10 space-y-2">
              <h4 className="text-xs font-bold uppercase tracking-wider text-white/60">
                Forum Contributions by @{viewingAuthor.username}
              </h4>
              {posts.filter(p => p.authorId === viewingAuthor.id || p.authorUsername === viewingAuthor.username).length === 0 ? (
                <p className="text-xs text-white/45">No public forum posts yet.</p>
              ) : (
                <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                  {posts
                    .filter(
                      p =>
                        p.authorId === viewingAuthor.id ||
                        p.authorUsername === viewingAuthor.username
                    )
                    .map(p => (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => {
                          setViewingAuthor(null);
                          setActivePostId(p.id);
                        }}
                        className="w-full text-left p-2.5 rounded-xl bg-white/[0.03] hover:bg-white/[0.06] border border-white/10 transition-colors cursor-pointer"
                      >
                        <div className="text-xs font-semibold text-white truncate">{p.title}</div>
                        <div className="text-[11px] text-white/45 mt-0.5">
                          {p.topicName} · {p.score} points · {p.commentsCount} comments
                        </div>
                      </button>
                    ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ====================================================================
          COMMUNITY GUIDELINES MODAL
          ==================================================================== */}
      {isGuidelinesOpen && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md"
        >
          <div className="bg-zinc-950 border border-white/15 rounded-2xl w-full max-w-lg p-5 sm:p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-white">
                Xeusar Public Forum Community Guidelines
              </h3>
              <button
                type="button"
                onClick={() => setIsGuidelinesOpen(false)}
                className="p-1 text-white/50 hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <ol className="list-decimal list-inside space-y-2 text-xs text-white/75 leading-relaxed">
              <li>
                <strong>Text-First Scholarly Exchange:</strong> Write clear titles, mathematical derivations ($...$), structured lists, and code blocks. Direct file and image uploads are disabled in the forum.
              </li>
              <li>
                <strong>Reuse Study Library Resources:</strong> When sharing a PDF note or past paper, reference the existing Study Library item rather than uploading duplicate copies.
              </li>
              <li>
                <strong>Academic Integrity:</strong> Collaborating on concepts, homework methodology, and past exams is encouraged; leaking live/ongoing graded assessments is strictly prohibited.
              </li>
              <li>
                <strong>Constructive Peer Respect:</strong> Critique ideas and proofs rigorously while remaining respectful toward fellow students across all institutions and degree tiers.
              </li>
              <li>
                <strong>Safe External Links:</strong> Only share verified academic links (https://). Never post misleading or unsafe URLs.
              </li>
            </ol>

            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={() => setIsGuidelinesOpen(false)}
                className="px-4 py-2 rounded-xl bg-cyan-400 text-black text-xs font-bold cursor-pointer"
              >
                Got It
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ====================================================================
          MODERATOR QUEUE MODAL (AUTHORIZED MODERATORS ONLY)
          ==================================================================== */}
      {isModerationOpen && userIsModerator && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md"
        >
          <div className="bg-zinc-950 border border-white/15 rounded-2xl w-full max-w-2xl p-5 sm:p-6 shadow-2xl space-y-4 max-h-[88vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <div>
                <h3 className="text-base font-bold text-white">Forum Moderation Queue</h3>
                <p className="text-xs text-white/50">
                  Review community-submitted reports and keep or remove flagged content.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsModerationOpen(false)}
                className="p-1 text-white/50 hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {moderationReports.length === 0 ? (
              <div className="py-8 text-center text-xs text-white/50">
                No reports in the moderation queue.
              </div>
            ) : (
              <div className="space-y-2.5">
                {moderationReports.map(rep => (
                  <div
                    key={rep.id}
                    className="p-3.5 rounded-xl bg-white/[0.03] border border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                  >
                    <div className="space-y-1 min-w-0">
                      <div className="flex items-center gap-2 text-xs text-white/55">
                        <span className="uppercase font-bold text-amber-300">
                          {rep.targetType}
                        </span>
                        <span aria-hidden="true">·</span>
                        <span>Reason: {rep.reason}</span>
                        <span aria-hidden="true">·</span>
                        <span>Reported by @{rep.reporterUsername}</span>
                        <span aria-hidden="true">·</span>
                        <span>Status: {rep.status}</span>
                      </div>
                      <div className="text-xs font-semibold text-white truncate">
                        "{rep.targetTitleOrSnippet}"
                      </div>
                      {rep.details && (
                        <div className="text-[11px] text-white/50">{rep.details}</div>
                      )}
                    </div>

                    {rep.status === 'pending' && (
                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          type="button"
                          onClick={() => handleResolveReport(rep.id, 'keep')}
                          className="px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/15 text-white text-xs font-semibold cursor-pointer"
                        >
                          Keep Content
                        </button>
                        <button
                          type="button"
                          onClick={() => handleResolveReport(rep.id, 'remove')}
                          className="px-3 py-1.5 rounded-lg bg-rose-500 hover:bg-rose-400 text-black text-xs font-bold cursor-pointer"
                        >
                          Remove Content
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
