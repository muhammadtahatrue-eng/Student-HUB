import React, { useMemo } from 'react';
import {
  Sparkles,
  Play,
  FileText,
  BarChart3,
  Layers,
  MessageSquare,
  Upload,
  ArrowRight,
  PlusCircle,
  Database,
  ThumbsUp,
  Download,
  Eye,
  GraduationCap,
  Users,
  CheckCircle2,
  BookOpen,
  Compass
} from 'lucide-react';
import { StudyNote, StudentUser, AcademicProgram } from '../types/index.ts';
import { getAllPrograms, getAllProgramDiscussions } from '../lib/programStore.ts';
import { MATERIAL_TYPE_LABELS } from '../data/seedData.ts';
import { getNoteCourseCategory, getNoteCourseDisplay } from '../lib/resourceService.ts';
import { RaysOrigin } from './LightRays.tsx';

import { InfoCenterSectionId } from '../data/legalAndInfoData.ts';

interface LandingHeroProps {
  notes?: StudyNote[];
  user?: StudentUser | null;
  onBrowseMaterials: () => void;
  onUploadNotes: () => void;
  onWatchDemo: () => void;
  onPreviewNote?: (note: StudyNote) => void;
  onDownloadNote?: (note: StudyNote) => void;
  onUpvoteNote?: (noteId: string) => void;
  onOpenProgram?: (programId: string) => void;
  onOpenExplorePrograms?: () => void;
  onOpenInfoCenter?: (section?: InfoCenterSectionId) => void;
  rayColor?: string;
  onChangeRayColor?: (color: string) => void;
  rayOrigin?: RaysOrigin;
  onChangeRayOrigin?: (origin: RaysOrigin) => void;
  rayPulsating?: boolean;
  onTogglePulsating?: () => void;
}

export const LandingHero: React.FC<LandingHeroProps> = ({
  notes = [],
  user,
  onBrowseMaterials,
  onUploadNotes,
  onWatchDemo,
  onPreviewNote,
  onDownloadNote,
  onUpvoteNote,
  onOpenProgram,
  onOpenExplorePrograms,
  onOpenInfoCenter,
}) => {
  // Dynamically calculated platform metrics (zero hardcoded fallbacks)
  const liveStats = useMemo(() => {
    const allPrograms = getAllPrograms();
    const totalStudents = allPrograms.reduce((acc, p) => acc + (p.activeStudents || 0), 0);
    const totalDownloads = notes.reduce((acc, n) => acc + (n.downloadsCount || 0), 0);
    const totalUpvotes = notes.reduce((acc, n) => acc + (n.upvotesCount || 0), 0);
    const verifiedDocs = notes.length;
    const activeProgramsCount = allPrograms.filter(p => (p.activeStudents || 0) > 0).length;

    return {
      activeStudents: totalStudents.toLocaleString(),
      verifiedDocs: verifiedDocs.toLocaleString(),
      totalDownloads: totalDownloads.toLocaleString(),
      academicPrograms: activeProgramsCount.toString(),
      totalUpvotes: totalUpvotes.toLocaleString()
    };
  }, [notes]);

  // Featured top trending study notes sorted by popularity
  const trendingNotes = useMemo(() => {
    return [...notes]
      .sort((a, b) => ((b.upvotesCount * 2) + b.downloadsCount) - ((a.upvotesCount * 2) + a.downloadsCount))
      .slice(0, 3);
  }, [notes]);

  // Spotlight active academic programs (only those with at least 1 student)
  const spotlightPrograms = useMemo(() => {
    return getAllPrograms()
      .filter(p => (p.activeStudents || 0) >= 1)
      .slice(0, 4);
  }, [notes, user]);

  // Real discussions from student store
  const sampleDiscussions = useMemo(() => {
    return getAllProgramDiscussions().slice(0, 3);
  }, [notes, user]);

  return (
    <div className="relative z-10 font-outfit text-white">
      {/* 1. HERO SHOWCASE SECTION */}
      <section className="relative min-h-[75vh] sm:min-h-[85vh] flex flex-col items-center justify-center text-center px-4 overflow-hidden pt-8 sm:pt-12 pb-12 sm:pb-16">
        {/* Radial dark contrast scrim so hero typography and controls stay crisp under any light ray color */}
        <div
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(5,7,10,0.62)_0%,rgba(5,7,10,0.32)_52%,transparent_82%)]"
          aria-hidden="true"
        />
        <div className="relative z-10 max-w-5xl mx-auto w-full">
          {/* Headline */}
          <h1 className="text-4xl xs:text-5xl sm:text-7xl md:text-8xl lg:text-9xl font-black uppercase tracking-tighter mb-4 sm:mb-6 text-white drop-shadow-[0_4px_28px_rgba(0,0,0,0.95)] [text-wrap:balance] break-words">
            Connect. Learn. Share.
          </h1>

          {/* Subtitle */}
          <p className="text-sm sm:text-base md:text-xl text-white/90 drop-shadow-[0_2px_12px_rgba(0,0,0,0.95)] mb-8 sm:mb-10 max-w-2xl mx-auto leading-relaxed [text-wrap:balance] px-2 font-normal">
            The ultimate interactive platform for students to exchange materials, engage in high-level discussions, and build a global knowledge network.
          </p>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-center gap-3 sm:gap-4 max-w-xs sm:max-w-none mx-auto w-full">
            <button
              onClick={onBrowseMaterials}
              className="w-full sm:w-auto px-8 sm:px-10 py-3.5 sm:py-4 bg-white text-black font-black uppercase text-xs sm:text-sm tracking-widest rounded-full hover:bg-white/90 hover:shadow-[0_0_35px_rgba(255,255,255,0.45)] transition-all cursor-pointer text-center active:scale-95 shadow-xl"
            >
              Explore Materials
            </button>
            <button
              onClick={onWatchDemo}
              className="w-full sm:w-auto px-8 sm:px-10 py-3.5 sm:py-4 bg-black/65 border border-white/30 text-white font-black uppercase text-xs sm:text-sm tracking-widest rounded-full hover:bg-white/15 transition-all cursor-pointer flex items-center justify-center gap-2 active:scale-95 backdrop-blur-md shadow-xl"
            >
              <Play className="w-3.5 h-3.5 fill-white" />
              <span>Watch Demo</span>
            </button>
          </div>
        </div>
      </section>

      {/* 2. DYNAMIC LIVE STUDY MATERIALS MODULE */}
      <section id="materials-featured" className="py-12 sm:py-20 px-4 sm:px-6 max-w-6xl mx-auto border-t border-white/10">
        <div className="border border-white/15 rounded-2xl sm:rounded-3xl p-5 sm:p-10 bg-white/[0.02] relative overflow-hidden backdrop-blur-md">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
            <div>
              <div className="inline-flex items-center gap-1.5 text-[11px] sm:text-xs uppercase tracking-widest text-cyan-400 font-jetbrains mb-1">
                <FileText className="w-3.5 h-3.5 shrink-0" />
                <span>Verified Course Repository</span>
              </div>
              <h2 className="text-xl sm:text-3xl font-bold tracking-tight text-white mt-1 neon-text">
                Featured & Trending Study Notes
              </h2>
            </div>

            <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
              <button
                onClick={onBrowseMaterials}
                className="flex-1 sm:flex-initial justify-center px-4 py-2 bg-white/10 hover:bg-white/20 text-white text-xs font-jetbrains uppercase tracking-wider rounded-full transition-all flex items-center gap-1.5 cursor-pointer active:scale-95"
              >
                <span>Browse All ({notes.length})</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={onUploadNotes}
                className="flex-1 sm:flex-initial justify-center px-4 py-2 bg-cyan-400/20 hover:bg-cyan-400/30 text-cyan-300 border border-cyan-400/30 text-xs font-jetbrains uppercase tracking-wider rounded-full transition-all flex items-center gap-1.5 cursor-pointer active:scale-95"
              >
                <PlusCircle className="w-3.5 h-3.5" />
                <span>Upload Note</span>
              </button>
            </div>
          </div>

          {/* Dynamic Real Cards */}
          {trendingNotes.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6">
              {trendingNotes.map((note) => (
                <div
                  key={note.id}
                  className="p-5 sm:p-6 rounded-2xl border border-white/10 bg-white/[0.03] hover:border-cyan-400/50 hover:bg-white/[0.05] transition-all flex flex-col justify-between group shadow-xl"
                >
                  <div>
                    <div className="flex items-center justify-between mb-3 gap-2">
                      <span className="text-[10px] font-jetbrains px-2.5 py-0.5 rounded-full bg-cyan-400/10 text-cyan-300 border border-cyan-400/20 font-semibold uppercase truncate">
                        {getNoteCourseCategory(note)}
                      </span>
                      <span className="text-[10px] text-white/50 uppercase tracking-wider font-jetbrains shrink-0">
                        {MATERIAL_TYPE_LABELS[note.materialType]?.label || note.materialType}
                      </span>
                    </div>

                    <div className="text-[11px] font-medium text-cyan-200/80 mb-1 truncate font-jetbrains">
                      {getNoteCourseDisplay(note)}
                    </div>

                    <h3
                      onClick={() => onPreviewNote?.(note)}
                      className="text-sm sm:text-base font-bold text-white group-hover:text-cyan-300 transition-colors line-clamp-2 mb-2 cursor-pointer"
                    >
                      {note.title}
                    </h3>

                    <p className="text-xs text-white/60 line-clamp-2 mb-4 leading-relaxed font-light">
                      {note.description || `${getNoteCourseCategory(note)} study material shared for ${getNoteCourseDisplay(note)}`}
                    </p>
                  </div>

                  <div className="pt-4 border-t border-white/10 flex items-center justify-between text-xs text-white/60">
                    <div className="flex items-center gap-3">
                      <span className="flex items-center gap-1 text-[11px] text-white/70">
                        <ThumbsUp className="w-3 h-3 text-cyan-400" />
                        {note.upvotesCount}
                      </span>
                      <span className="flex items-center gap-1 text-[11px] text-white/70">
                        <Download className="w-3 h-3 text-emerald-400" />
                        {note.downloadsCount}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      {onPreviewNote && (
                        <button
                          type="button"
                          onClick={() => onPreviewNote(note)}
                          title="Preview PDF"
                          className="px-2.5 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white text-xs font-semibold transition-colors cursor-pointer flex items-center gap-1.5"
                        >
                          <Eye className="w-3.5 h-3.5 text-cyan-400" />
                          <span>Preview PDF</span>
                        </button>
                      )}
                      {onDownloadNote && (
                        <button
                          type="button"
                          onClick={() => onDownloadNote(note)}
                          title="Download PDF"
                          className="p-1.5 rounded-lg bg-cyan-400/20 hover:bg-cyan-400/30 text-cyan-300 transition-colors cursor-pointer"
                        >
                          <Download className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="py-10 px-6 rounded-2xl border border-white/10 bg-white/[0.02] text-center">
              <FileText className="w-8 h-8 text-white/25 mx-auto mb-2.5" />
              <p className="text-sm font-semibold text-white/80">No study notes uploaded yet</p>
              <p className="text-xs text-white/50 mt-1 mb-4">
                Upload the first PDF lecture note, exam paper, or cheat sheet to populate the repository.
              </p>
              <button
                onClick={onUploadNotes}
                className="px-5 py-2 rounded-full bg-white text-black text-xs font-bold uppercase tracking-wider hover:bg-white/90 transition-all cursor-pointer"
              >
                Upload First Note
              </button>
            </div>
          )}
        </div>
      </section>

      {/* 3. REAL-TIME PLATFORM METRICS */}
      <section id="metrics-real" className="py-12 sm:py-16 border-y border-white/10 bg-black/40 backdrop-blur-md">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="border border-white/15 rounded-2xl sm:rounded-3xl p-5 sm:p-10 text-center bg-white/[0.02]">
            <div className="inline-flex items-center gap-2 text-[10px] sm:text-xs uppercase tracking-[0.2em] text-cyan-400 font-jetbrains mb-2">
              <BarChart3 className="w-3.5 h-3.5 shrink-0" />
              <span>Platform Knowledge Activity</span>
            </div>
            <p className="text-xs sm:text-sm text-white/60 max-w-lg mx-auto mb-8 sm:mb-10 leading-relaxed font-light">
              Aggregated across accredited university institutions, active degree programs, and peer contributors.
            </p>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-6">
              {[
                { label: 'Active Students', value: liveStats.activeStudents, desc: 'Enrolled in programs' },
                { label: 'Verified Documents', value: liveStats.verifiedDocs, desc: 'Notes, exams & slides' },
                { label: 'Downloads Served', value: liveStats.totalDownloads, desc: 'Direct student downloads' },
                { label: 'Academic Programs', value: liveStats.academicPrograms, desc: 'Unlocked degrees' },
              ].map((metric) => (
                <div
                  key={metric.label}
                  className="p-4 sm:p-6 rounded-xl sm:rounded-2xl bg-white/[0.03] border border-white/10 hover:border-cyan-400/40 transition-colors"
                >
                  <div className="text-2xl sm:text-4xl font-black font-jetbrains text-cyan-300 mb-1">
                    {metric.value}
                  </div>
                  <div className="text-xs sm:text-sm font-bold text-white uppercase tracking-wider font-jetbrains">
                    {metric.label}
                  </div>
                  <div className="text-[10px] sm:text-xs text-white/50 font-jetbrains mt-1 font-light">
                    {metric.desc}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* 4. ACADEMIC PROGRAMS SPOTLIGHT */}
      <section id="programs-spotlight" className="py-12 sm:py-20 px-4 sm:px-6 max-w-6xl mx-auto">
        <div className="border border-white/15 rounded-2xl sm:rounded-3xl p-5 sm:p-10 bg-white/[0.02] backdrop-blur-md">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
            <div>
              <div className="inline-flex items-center gap-2 text-[11px] sm:text-xs uppercase tracking-widest text-cyan-400 font-jetbrains mb-2">
                <GraduationCap className="w-4 h-4 shrink-0" />
                <span>Degree Hub & Curricula</span>
              </div>
              <h2 className="text-2xl sm:text-4xl font-bold tracking-tight text-white neon-text">
                Active Academic Programs
              </h2>
            </div>
            {onOpenExplorePrograms && (
              <button
                onClick={onOpenExplorePrograms}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-white/10 hover:bg-white/20 text-white text-xs font-semibold transition-all cursor-pointer self-start sm:self-auto"
              >
                <span>Explore All Degrees</span>
                <Compass className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {spotlightPrograms.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {spotlightPrograms.map((prog) => (
                <div
                  key={prog.id}
                  onClick={() => onOpenProgram && onOpenProgram(prog.id)}
                  className="p-5 rounded-2xl bg-white/[0.03] border border-white/10 hover:border-cyan-400/50 hover:bg-white/[0.06] transition-all cursor-pointer flex flex-col justify-between group shadow-lg"
                >
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[10px] font-jetbrains px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-300 font-semibold border border-cyan-500/20">
                        {prog.shortCode}
                      </span>
                      <span className="text-[10px] text-white/50 uppercase font-jetbrains">
                        {prog.degreeTier}
                      </span>
                    </div>
                    <h3 className="text-sm font-bold text-white group-hover:text-cyan-300 transition-colors mb-2">
                      {prog.name}
                    </h3>
                    <p className="text-xs text-white/60 line-clamp-2 mb-4 font-light">
                      {prog.description}
                    </p>
                  </div>

                  <div className="pt-3 border-t border-white/10 flex items-center justify-between text-[11px] text-white/50 font-jetbrains">
                    <span className="flex items-center gap-1">
                      <Users className="w-3 h-3 text-cyan-400" />
                      {prog.activeStudents} Students
                    </span>
                    <span className="text-cyan-400 flex items-center gap-0.5 group-hover:translate-x-0.5 transition-transform">
                      View <ArrowRight className="w-3 h-3" />
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="py-10 px-6 rounded-2xl border border-white/10 bg-white/[0.02] text-center">
              <GraduationCap className="w-8 h-8 text-white/25 mx-auto mb-2.5" />
              <p className="text-sm font-semibold text-white/80">No active degree programs unlocked yet</p>
              <p className="text-xs text-white/50 mt-1 mb-4">
                Degree programs are automatically created and unlocked by the system when at least 1 student registers with that specific program.
              </p>
              {onOpenExplorePrograms && (
                <button
                  onClick={onOpenExplorePrograms}
                  className="px-5 py-2 rounded-full bg-cyan-400/20 hover:bg-cyan-400/30 text-cyan-300 border border-cyan-400/30 text-xs font-bold uppercase tracking-wider transition-all cursor-pointer"
                >
                  View Explore Programs
                </button>
              )}
            </div>
          )}
        </div>
      </section>

      {/* 5. COMMUNITY DISCUSSIONS & PEER FORUMS */}
      <section id="community-discussions" className="py-12 sm:py-20 px-4 sm:px-6 max-w-6xl mx-auto border-t border-white/10">
        <div className="border border-white/15 rounded-2xl sm:rounded-3xl p-5 sm:p-10 bg-white/[0.02]">
          <div className="flex items-center justify-between mb-8">
            <div>
              <div className="inline-flex items-center gap-2 text-[11px] sm:text-xs uppercase tracking-widest text-emerald-400 font-jetbrains mb-2">
                <MessageSquare className="w-3.5 h-3.5 shrink-0" />
                <span>Live Student Discussions</span>
              </div>
              <h3 className="text-xl sm:text-3xl font-bold text-white">
                Recent Peer Q&A and Problem Solvers
              </h3>
            </div>
            {onOpenProgram && (
              <button
                onClick={() => onOpenProgram('bs-cs')}
                className="hidden sm:inline-flex items-center gap-1.5 text-xs text-cyan-300 hover:text-white transition-colors cursor-pointer"
              >
                <span>Join Program Discussion</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {sampleDiscussions.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6">
              {sampleDiscussions.map((post) => (
                <div
                  key={post.id}
                  className="p-5 sm:p-6 rounded-2xl bg-white/[0.03] border border-white/10 hover:border-emerald-400/40 transition-all flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[10px] font-jetbrains text-emerald-400 uppercase tracking-widest">
                        {post.category}
                      </span>
                      <span className="text-[10px] text-white/40 font-jetbrains">
                        {post.commentsCount || 0} replies
                      </span>
                    </div>
                    <h4 className="text-sm font-bold text-white mb-2 line-clamp-2">
                      {post.title}
                    </h4>
                    <p className="text-xs text-white/60 line-clamp-3 mb-4 font-light leading-relaxed">
                      {post.content}
                    </p>
                  </div>
                  <div className="pt-3 border-t border-white/10 flex items-center justify-between text-[11px] text-white/50">
                    <span>by {post.authorName}</span>
                    <span className="flex items-center gap-1 text-cyan-400">
                      <ThumbsUp className="w-3 h-3" />
                      {post.upvotesCount}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="py-10 px-6 rounded-2xl border border-white/10 bg-white/[0.02] text-center">
              <MessageSquare className="w-8 h-8 text-white/25 mx-auto mb-2.5" />
              <p className="text-sm font-semibold text-white/80">No community discussions yet</p>
              <p className="text-xs text-white/50 mt-1">
                Join your academic program cohort to start the first peer Q&A thread.
              </p>
            </div>
          )}
        </div>
      </section>

      {/* 5B. XEUSAR PRODUCTS ECOSYSTEM */}
      <section id="products" className="py-12 sm:py-20 px-4 sm:px-6 max-w-6xl mx-auto border-t border-white/10 scroll-mt-24">
        <div className="border border-white/15 rounded-2xl sm:rounded-3xl p-5 sm:p-10 bg-white/[0.02] backdrop-blur-md">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
            <div>
              <div className="inline-flex items-center gap-2 text-[11px] sm:text-xs uppercase tracking-widest text-cyan-400 font-jetbrains mb-2">
                <Layers className="w-3.5 h-3.5 shrink-0" />
                <span>Xeusar Product Suite</span>
              </div>
              <h2 className="text-2xl sm:text-4xl font-bold tracking-tight text-white neon-text">
                Products Built for Academic Mastery
              </h2>
            </div>
            <button
              onClick={onBrowseMaterials}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-white/10 hover:bg-white/20 text-white text-xs font-semibold transition-all cursor-pointer self-start sm:self-auto"
            >
              <span>Open Study Library</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
            {[
              {
                icon: BookOpen,
                badge: 'Core Repository',
                title: 'Study Library',
                description:
                  'Peer-verified lecture notes, past exams, formula sheets, and lab manuals organized by university course codes.',
                actionLabel: 'Browse Library',
                onClick: onBrowseMaterials,
              },
              {
                icon: GraduationCap,
                badge: 'Cohort Hub',
                title: 'Academic Programs',
                description:
                  'Dedicated degree workspaces that unlock automatically as students enroll and collaborate across semesters.',
                actionLabel: 'Explore Programs',
                onClick: onOpenExplorePrograms || onBrowseMaterials,
              },
              {
                icon: MessageSquare,
                badge: 'Peer Network',
                title: 'Public Forum',
                description:
                  'High-signal academic Q&A, problem-solving threads, and resource-linked discussions with peer voting.',
                actionLabel: 'Join Discussions',
                onClick: () => onOpenProgram?.('bs-cs'),
              },
              {
                icon: Upload,
                badge: 'Creator Studio',
                title: 'Note Publishing',
                description:
                  'Instant PDF indexing and course tagging so contributors can share study materials and build academic reputation.',
                actionLabel: 'Upload Notes',
                onClick: onUploadNotes,
              },
            ].map((product) => {
              const IconComponent = product.icon;
              return (
                <div
                  key={product.title}
                  onClick={product.onClick}
                  className="p-5 sm:p-6 rounded-2xl bg-white/[0.03] border border-white/10 hover:border-cyan-400/50 hover:bg-white/[0.06] transition-all cursor-pointer flex flex-col justify-between group shadow-lg"
                >
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <div className="w-9 h-9 rounded-xl bg-cyan-500/10 border border-cyan-400/30 flex items-center justify-center text-cyan-300 group-hover:scale-105 transition-transform">
                        <IconComponent className="w-4 h-4" />
                      </div>
                      <span className="text-[10px] font-jetbrains px-2.5 py-0.5 rounded-full bg-white/5 text-white/60 border border-white/10 uppercase">
                        {product.badge}
                      </span>
                    </div>
                    <h3 className="text-base font-bold text-white group-hover:text-cyan-300 transition-colors mb-2">
                      {product.title}
                    </h3>
                    <p className="text-xs text-white/60 leading-relaxed font-light mb-5">
                      {product.description}
                    </p>
                  </div>
                  <div className="pt-3 border-t border-white/10 flex items-center justify-between text-xs font-jetbrains text-cyan-300">
                    <span>{product.actionLabel}</span>
                    <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* 5C. ABOUT US SECTION */}
      <section id="about-us" className="py-12 sm:py-20 px-4 sm:px-6 max-w-6xl mx-auto border-t border-white/10 scroll-mt-24">
        <div className="border border-white/15 rounded-2xl sm:rounded-3xl p-5 sm:p-10 bg-white/[0.02] backdrop-blur-md">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            <div className="lg:col-span-7">
              <div className="inline-flex items-center gap-2 text-[11px] sm:text-xs uppercase tracking-widest text-cyan-400 font-jetbrains mb-2">
                <Sparkles className="w-3.5 h-3.5 shrink-0" />
                <span>About Xeusar</span>
              </div>
              <h2 className="text-2xl sm:text-4xl font-bold tracking-tight text-white mb-4 neon-text">
                Your Learning. Your Community. Your Future.
              </h2>
              <p className="text-xs sm:text-sm text-white/75 leading-relaxed font-light mb-3">
                Xeusar is a free educational platform designed to help students discover, access, and share academic resources in one place.
              </p>
              <p className="text-xs sm:text-sm text-white/65 leading-relaxed font-light mb-6">
                Our mission is to make learning resources more accessible, encourage academic collaboration, and help students connect with useful study materials and educational communities.
              </p>

              {onOpenInfoCenter && (
                <div className="flex flex-wrap items-center gap-2.5">
                  <button
                    type="button"
                    onClick={() => onOpenInfoCenter('about')}
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-cyan-400 hover:bg-cyan-300 text-black text-xs font-bold transition-all cursor-pointer"
                  >
                    <span>Read Full About Us &amp; FAQs</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => onOpenInfoCenter('terms')}
                    className="inline-flex items-center gap-2 px-4 py-2.5 rounded-full bg-white/10 hover:bg-white/20 text-white text-xs font-semibold transition-all cursor-pointer"
                  >
                    <span>Terms &amp; Conditions</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => onOpenInfoCenter('copyright')}
                    className="inline-flex items-center gap-2 px-4 py-2.5 rounded-full bg-white/5 hover:bg-white/15 border border-white/15 text-white/80 hover:text-white text-xs font-semibold transition-all cursor-pointer"
                  >
                    <span>Copyright Policy</span>
                  </button>
                </div>
              )}
            </div>

            <div className="lg:col-span-5 grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              {[
                {
                  title: 'Study Library',
                  desc: 'Discover, organize, and access academic study materials tailored for students.',
                },
                {
                  title: 'Academic Programs',
                  desc: 'Explore academic programs and organize learning around degree programs and areas of study.',
                },
                {
                  title: 'Community Forum',
                  desc: 'Ask questions, share ideas, discuss academic topics, and learn from peers.',
                },
                {
                  title: 'Student Collaboration',
                  desc: 'Connect learning resources with discussions in a structured academic environment.',
                },
              ].map((item) => (
                <div
                  key={item.title}
                  className="p-4 rounded-2xl bg-white/[0.03] border border-white/10 hover:border-cyan-400/40 transition-colors"
                >
                  <div className="flex items-center gap-1.5 text-cyan-300 text-xs font-bold mb-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 shrink-0 text-cyan-400" />
                    <span>{item.title}</span>
                  </div>
                  <p className="text-[11px] text-white/55 leading-relaxed font-light">
                    {item.desc}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* 6. CALL TO ACTION STRIP */}
      <section id="cta-contribute" className="py-12 sm:py-20 px-4 sm:px-6">
        <div className="max-w-5xl mx-auto border border-white/20 rounded-2xl sm:rounded-3xl p-6 sm:p-10 md:p-14 text-center bg-white/[0.03] relative overflow-hidden backdrop-blur-md shadow-2xl">
          <div className="inline-flex items-center gap-2 text-[11px] sm:text-xs uppercase tracking-widest text-cyan-400 font-jetbrains mb-3">
            <Database className="w-3.5 h-3.5 shrink-0" />
            <span>Free Study Resource Directory</span>
          </div>
          <h2 className="text-2xl sm:text-3xl md:text-5xl font-black uppercase tracking-tight text-white mb-4 neon-text">
            Ready To Share Knowledge?
          </h2>
          <p className="text-white/70 text-xs sm:text-base max-w-xl mx-auto mb-8 sm:mb-10 leading-relaxed font-light">
            Empower fellow students in your degree program. Upload lecture notes, exam reviews, or formula sheets to the global repository.
          </p>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-center gap-3 sm:gap-4 max-w-sm sm:max-w-none mx-auto w-full">
            <button
              onClick={onUploadNotes}
              className="w-full sm:w-auto px-8 sm:px-10 py-3.5 sm:py-4 bg-white text-black font-black uppercase text-xs sm:text-sm tracking-widest rounded-full hover:bg-white/90 hover:scale-105 transition-all cursor-pointer shadow-[0_0_25px_rgba(255,255,255,0.3)] flex items-center justify-center gap-2 active:scale-95"
            >
              <Upload className="w-4 h-4" />
              <span>Upload Your Notes</span>
            </button>
            <button
              onClick={onBrowseMaterials}
              className="w-full sm:w-auto px-8 sm:px-10 py-3.5 sm:py-4 bg-white/10 border border-white/20 text-white font-black uppercase text-xs sm:text-sm tracking-widest rounded-full hover:bg-white/20 transition-all cursor-pointer text-center active:scale-95"
            >
              Browse Library
            </button>
          </div>
        </div>
      </section>
    </div>
  );
};
