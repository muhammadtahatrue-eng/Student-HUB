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
import { getAllPrograms, getProgramDiscussions } from '../lib/programStore.ts';
import { MATERIAL_TYPE_LABELS } from '../data/seedData.ts';

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
}) => {
  // Dynamically calculated platform metrics
  const liveStats = useMemo(() => {
    const allPrograms = getAllPrograms();
    const totalStudents = allPrograms.reduce((acc, p) => acc + (p.activeStudents || 0), 0);
    const totalDownloads = notes.reduce((acc, n) => acc + (n.downloadsCount || 0), 0);
    const totalUpvotes = notes.reduce((acc, n) => acc + (n.upvotesCount || 0), 0);
    const verifiedDocs = notes.length;
    const programsCount = allPrograms.length;

    return {
      activeStudents: totalStudents > 0 ? totalStudents.toLocaleString() : '3,800+',
      verifiedDocs: verifiedDocs.toLocaleString(),
      totalDownloads: totalDownloads.toLocaleString(),
      academicPrograms: programsCount.toString(),
      totalUpvotes: totalUpvotes.toLocaleString()
    };
  }, [notes]);

  // Featured top trending study notes sorted by popularity
  const trendingNotes = useMemo(() => {
    return [...notes]
      .sort((a, b) => ((b.upvotesCount * 2) + b.downloadsCount) - ((a.upvotesCount * 2) + a.downloadsCount))
      .slice(0, 3);
  }, [notes]);

  // Spotlight active academic programs
  const spotlightPrograms = useMemo(() => {
    return getAllPrograms()
      .filter(p => p.activeStudents > 0)
      .slice(0, 4);
  }, []);

  // Real discussions from student store
  const sampleDiscussions = useMemo(() => {
    const csDiscussions = getProgramDiscussions('bs-cs');
    return csDiscussions.slice(0, 3);
  }, []);

  return (
    <div className="relative z-10 font-outfit text-white">
      {/* 1. HERO SHOWCASE SECTION */}
      <section className="relative min-h-[75vh] sm:min-h-[85vh] flex flex-col items-center justify-center text-center px-4 overflow-hidden pt-8 sm:pt-12 pb-12 sm:pb-16">
        <div className="max-w-5xl mx-auto w-full">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-3 sm:px-4 py-1.5 mb-6 sm:mb-8 text-[11px] sm:text-xs font-bold tracking-[0.15em] sm:tracking-[0.2em] uppercase bg-white/10 border border-white/20 rounded-full backdrop-blur-md">
            <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
            <span>Next-Gen Academic Knowledge Exchange</span>
          </div>

          {/* Headline */}
          <h1 className="text-4xl xs:text-5xl sm:text-7xl md:text-8xl lg:text-9xl font-black uppercase tracking-tighter mb-4 sm:mb-6 neon-text [text-wrap:balance] break-words">
            Connect. Learn. Share.
          </h1>

          {/* Subtitle */}
          <p className="text-sm sm:text-base md:text-xl text-white/70 mb-8 sm:mb-10 max-w-2xl mx-auto leading-relaxed [text-wrap:balance] px-2 font-light">
            The collaborative open repository for university course notes, cheat sheets, past exams, and academic discussions across verified degree programs.
          </p>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-center gap-3 sm:gap-4 max-w-xs sm:max-w-none mx-auto w-full">
            <button
              onClick={onBrowseMaterials}
              className="w-full sm:w-auto px-8 sm:px-10 py-3.5 sm:py-4 bg-white text-black font-black uppercase text-xs sm:text-sm tracking-widest rounded-full hover:bg-white/90 hover:shadow-[0_0_35px_rgba(255,255,255,0.45)] transition-all cursor-pointer text-center active:scale-95"
            >
              Explore Materials
            </button>
            <button
              onClick={onWatchDemo}
              className="w-full sm:w-auto px-8 sm:px-10 py-3.5 sm:py-4 bg-white/5 border border-white/20 text-white font-black uppercase text-xs sm:text-sm tracking-widest rounded-full hover:bg-white/10 transition-all cursor-pointer flex items-center justify-center gap-2 active:scale-95"
            >
              <Play className="w-3.5 h-3.5 fill-white" />
              <span>Platform Preview</span>
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
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6">
            {trendingNotes.map((note) => (
              <div
                key={note.id}
                className="p-5 sm:p-6 rounded-2xl border border-white/10 bg-white/[0.03] hover:border-cyan-400/50 hover:bg-white/[0.05] transition-all flex flex-col justify-between group shadow-xl"
              >
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-[10px] font-jetbrains px-2 py-0.5 rounded-full bg-cyan-400/10 text-cyan-300 border border-cyan-400/20 font-semibold uppercase">
                      {note.courseCode}
                    </span>
                    <span className="text-[10px] text-white/50 uppercase tracking-wider font-jetbrains">
                      {MATERIAL_TYPE_LABELS[note.materialType]?.label || note.materialType}
                    </span>
                  </div>

                  <h3 className="text-sm sm:text-base font-bold text-white group-hover:text-cyan-300 transition-colors line-clamp-2 mb-2">
                    {note.title}
                  </h3>

                  <p className="text-xs text-white/60 line-clamp-2 mb-4 leading-relaxed font-light">
                    {note.description || `${note.subject} material shared for course ${note.courseCode}`}
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
                        onClick={() => onPreviewNote(note)}
                        title="Preview PDF"
                        className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
                      >
                        <Eye className="w-3.5 h-3.5" />
                      </button>
                    )}
                    {onDownloadNote && (
                      <button
                        onClick={() => onDownloadNote(note)}
                        title="Download"
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
                { label: 'Academic Programs', value: liveStats.academicPrograms, desc: 'Accredited degrees' },
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
        </div>
      </section>

      {/* 6. CALL TO ACTION STRIP */}
      <section id="cta-contribute" className="py-12 sm:py-20 px-4 sm:px-6">
        <div className="max-w-5xl mx-auto border border-white/20 rounded-2xl sm:rounded-3xl p-6 sm:p-10 md:p-14 text-center bg-white/[0.03] relative overflow-hidden backdrop-blur-md shadow-2xl">
          <div className="inline-flex items-center gap-2 text-[11px] sm:text-xs uppercase tracking-widest text-cyan-400 font-jetbrains mb-3">
            <Database className="w-3.5 h-3.5 shrink-0" />
            <span>Open Access Academic Commons</span>
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
