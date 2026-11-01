import React from 'react';
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
  Database
} from 'lucide-react';

interface LandingHeroProps {
  onBrowseMaterials: () => void;
  onUploadNotes: () => void;
  onWatchDemo: () => void;
}

export const LandingHero: React.FC<LandingHeroProps> = ({
  onBrowseMaterials,
  onUploadNotes,
  onWatchDemo,
}) => {
  return (
    <div className="relative z-10 font-outfit text-white">
      {/* 1. HERO SHOWCASE SECTION (Responsive for PC & Phone) */}
      <section className="relative min-h-[75vh] sm:min-h-[85vh] flex flex-col items-center justify-center text-center px-4 overflow-hidden pt-8 sm:pt-12 pb-12 sm:pb-16">
        <div className="max-w-5xl mx-auto w-full">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-3 sm:px-4 py-1.5 mb-6 sm:mb-8 text-[11px] sm:text-xs font-bold tracking-[0.15em] sm:tracking-[0.2em] uppercase bg-white/10 border border-white/20 rounded-full backdrop-blur-md">
            <Sparkles className="w-3.5 h-3.5 text-white" />
            <span>Next-Gen Learning Experience</span>
          </div>

          {/* Headline with Responsive Typography */}
          <h1 className="text-4xl xs:text-5xl sm:text-7xl md:text-8xl lg:text-9xl font-black uppercase tracking-tighter mb-4 sm:mb-6 neon-text [text-wrap:balance] break-words">
            Connect. Learn. Share.
          </h1>

          {/* Subtitle */}
          <p className="text-sm sm:text-base md:text-xl text-white/60 mb-8 sm:mb-10 max-w-2xl mx-auto leading-relaxed [text-wrap:balance] px-2">
            The ultimate interactive platform for students to exchange materials, engage in high-level discussions, and build a global knowledge network.
          </p>

          {/* Action Buttons: Stack on mobile, inline on desktop */}
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
              <span>Watch Demo</span>
            </button>
          </div>
        </div>
      </section>

      {/* 2. PLACEHOLDER: DYNAMIC STUDY MATERIALS MODULE */}
      <section id="materials-placeholder" className="py-12 sm:py-20 px-4 sm:px-6 max-w-6xl mx-auto border-t border-white/10">
        <div className="border border-dashed border-cyan-500/30 rounded-2xl sm:rounded-3xl p-5 sm:p-12 bg-white/[0.015] relative overflow-hidden backdrop-blur-sm">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 sm:mb-8">
            <div>
              <div className="inline-flex items-center gap-1.5 text-[11px] sm:text-xs uppercase tracking-widest text-cyan-400 font-jetbrains mb-1">
                <FileText className="w-3.5 h-3.5 shrink-0" />
                <span>[Placeholder: Dynamic Study Materials Module]</span>
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
                <span>Browse All</span>
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

          <p className="text-xs sm:text-sm text-white/50 max-w-xl mb-6 sm:mb-8 leading-relaxed">
            Dynamic study notes, lecture slide decks, past exams, and formula sheets fetched from the real-time database will populate here. Ready for API data binding.
          </p>

          {/* Skeletons / Card Slots Placeholder Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6">
            {[1, 2, 3].map((slot) => (
              <div
                key={slot}
                className="p-5 sm:p-6 rounded-2xl border border-dashed border-white/10 bg-white/[0.02] flex flex-col justify-between h-40 sm:h-44 hover:border-cyan-400/40 transition-colors"
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-jetbrains text-white/40 uppercase tracking-widest">
                      Slot #{slot} · Pending Query
                    </span>
                    <span className="w-2 h-2 rounded-full bg-cyan-400/60 animate-pulse" />
                  </div>
                  <div className="h-4 w-3/4 bg-white/10 rounded animate-pulse" />
                  <div className="h-3 w-1/2 bg-white/5 rounded" />
                </div>
                <div className="flex items-center justify-between pt-4 border-t border-white/5 text-[11px] text-white/40 font-jetbrains">
                  <span>Author / Course</span>
                  <span>PDF Document</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 3. PLACEHOLDER: PLATFORM METRICS & ANALYTICS */}
      <section id="metrics-placeholder" className="py-12 sm:py-16 border-y border-white/10 bg-black/40 backdrop-blur-md">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="border border-dashed border-white/15 rounded-2xl sm:rounded-3xl p-5 sm:p-10 text-center bg-white/[0.015]">
            <div className="inline-flex items-center gap-2 text-[10px] sm:text-xs uppercase tracking-[0.2em] text-white/50 font-jetbrains mb-2">
              <BarChart3 className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
              <span>[Placeholder: Platform Analytics & Live Metrics]</span>
            </div>
            <p className="text-xs sm:text-sm text-white/50 max-w-lg mx-auto mb-6 sm:mb-8 leading-relaxed">
              Real-time platform statistics will dynamically stream into these 4 metric counters once analytical pipelines are attached.
            </p>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-6">
              {[
                { label: 'Active Students', hint: 'Live Socket Presence' },
                { label: 'Verified Documents', hint: 'Storage Bucket Count' },
                { label: 'Academic Rating', hint: 'Calculated Mean Upvotes' },
                { label: 'Partner Campuses', hint: 'Registered Universities' },
              ].map((metric) => (
                <div
                  key={metric.label}
                  className="p-3.5 sm:p-5 rounded-xl sm:rounded-2xl bg-white/[0.02] border border-dashed border-white/10"
                >
                  <div className="text-xl sm:text-3xl font-black font-jetbrains text-white/30 mb-1">
                    --
                  </div>
                  <div className="text-[11px] sm:text-xs font-bold text-white uppercase tracking-wider font-jetbrains">
                    {metric.label}
                  </div>
                  <div className="text-[9px] sm:text-[10px] text-white/40 font-jetbrains mt-1">
                    {metric.hint}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* 4. PLACEHOLDER: ACADEMIC CAPABILITIES MODULE */}
      <section id="features-placeholder" className="py-12 sm:py-20 px-4 sm:px-6 max-w-6xl mx-auto">
        <div className="border border-dashed border-purple-500/30 rounded-2xl sm:rounded-3xl p-5 sm:p-12 bg-white/[0.015] text-center">
          <div className="inline-flex items-center gap-2 text-[11px] sm:text-xs uppercase tracking-widest text-purple-400 font-jetbrains mb-3">
            <Layers className="w-4 h-4 shrink-0" />
            <span>[Placeholder: Core Academic Capabilities Grid]</span>
          </div>
          <h2 className="text-2xl sm:text-4xl font-bold tracking-tight text-white mb-3 neon-text">
            Extensible Feature Framework
          </h2>
          <p className="text-xs sm:text-sm text-white/50 max-w-xl mx-auto mb-8 sm:mb-10 leading-relaxed">
            Pluggable feature modules for Document Readers, Collaborative Peer Rooms, Campus Graphs, and Proof Verification will hook into these slots.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 text-left">
            {[
              { title: 'Material Hub', desc: 'PDF preview & annotation reader module' },
              { title: 'Discussion Rooms', desc: 'Realtime collaborative peer Q&A rooms' },
              { title: 'Knowledge Network', desc: 'Inter-university student exchange graph' },
              { title: 'Verified Proofs', desc: 'T.A. & peer-reviewed derivation checks' },
            ].map((feature) => (
              <div
                key={feature.title}
                className="p-5 sm:p-6 rounded-2xl bg-white/[0.02] border border-dashed border-white/10 hover:border-purple-400/40 transition-colors"
              >
                <div className="w-2 h-2 rounded-full bg-purple-400/60 mb-2.5" />
                <div className="text-xs font-bold text-white uppercase tracking-wider font-jetbrains">
                  {feature.title}
                </div>
                <div className="text-xs text-white/40 mt-1.5 leading-relaxed">
                  {feature.desc}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 5. PLACEHOLDER: COMMUNITY FEEDBACK & RATINGS */}
      <section id="reviews-placeholder" className="py-12 sm:py-20 px-4 sm:px-6 max-w-6xl mx-auto border-t border-white/10">
        <div className="border border-dashed border-emerald-500/30 rounded-2xl sm:rounded-3xl p-5 sm:p-12 bg-white/[0.015] text-center">
          <div className="inline-flex items-center gap-2 text-[11px] sm:text-xs uppercase tracking-widest text-emerald-400 font-jetbrains mb-2">
            <MessageSquare className="w-3.5 h-3.5 shrink-0" />
            <span>[Placeholder: Verified Student Testimonials]</span>
          </div>
          <h3 className="text-xl sm:text-3xl font-bold text-white mt-1 mb-2">
            Student Experiences & Peer Endorsements
          </h3>
          <p className="text-xs sm:text-sm text-white/50 max-w-lg mx-auto mb-6 sm:mb-8 leading-relaxed">
            Verified student reviews, course feedback, and rating aggregations will be rendered dynamically from the database.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6 text-left">
            {[1, 2, 3].map((slot) => (
              <div
                key={slot}
                className="p-5 sm:p-6 rounded-2xl bg-white/[0.02] border border-dashed border-white/10 space-y-3"
              >
                <div className="flex items-center justify-between">
                  <div className="text-[10px] font-jetbrains text-emerald-400 uppercase tracking-widest">
                    Review Slot #{slot}
                  </div>
                  <span className="w-2 h-2 rounded-full bg-emerald-400/60 animate-pulse" />
                </div>
                <div className="h-3 w-5/6 bg-white/10 rounded" />
                <div className="h-3 w-4/6 bg-white/5 rounded" />
                <div className="pt-3 border-t border-white/5 text-[11px] text-white/30 font-jetbrains">
                  Verified Student Profile Slot
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 6. PLACEHOLDER: CONTRIBUTOR ENGAGEMENT & CTA STRIP */}
      <section id="cta-placeholder" className="py-12 sm:py-20 px-4 sm:px-6">
        <div className="max-w-5xl mx-auto border border-dashed border-white/20 rounded-2xl sm:rounded-3xl p-6 sm:p-10 md:p-14 text-center bg-white/[0.02] relative overflow-hidden backdrop-blur-sm">
          <div className="inline-flex items-center gap-2 text-[11px] sm:text-xs uppercase tracking-widest text-white/50 font-jetbrains mb-3">
            <Database className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
            <span>[Placeholder: Contributor Engagement Strip]</span>
          </div>
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-black uppercase tracking-tight text-white mb-3 neon-text">
            Ready To Share Knowledge?
          </h2>
          <p className="text-white/60 text-xs sm:text-sm max-w-xl mx-auto mb-6 sm:mb-8 leading-relaxed">
            Connect students to your university notes and contribute to the open knowledge repository.
          </p>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-center gap-3 sm:gap-4 max-w-sm sm:max-w-none mx-auto w-full">
            <button
              onClick={onUploadNotes}
              className="w-full sm:w-auto px-8 py-3.5 bg-white text-black font-black uppercase text-xs tracking-widest rounded-full hover:bg-white/90 hover:scale-105 transition-all cursor-pointer shadow-[0_0_25px_rgba(255,255,255,0.3)] flex items-center justify-center gap-2 active:scale-95"
            >
              <Upload className="w-3.5 h-3.5" />
              <span>Upload Your Notes</span>
            </button>
            <button
              onClick={onBrowseMaterials}
              className="w-full sm:w-auto px-8 py-3.5 bg-white/10 border border-white/20 text-white font-black uppercase text-xs tracking-widest rounded-full hover:bg-white/20 transition-all cursor-pointer text-center active:scale-95"
            >
              Browse Library
            </button>
          </div>
        </div>
      </section>
    </div>
  );
};
