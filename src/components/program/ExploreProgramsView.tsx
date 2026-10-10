import React, { useState, useMemo, useEffect } from 'react';
import {
  Compass,
  Search,
  Filter,
  GraduationCap,
  Users,
  BookOpen,
  Sparkles,
  Layers,
  ArrowRight,
  Bookmark,
  BookmarkCheck,
  Plus,
  ShieldCheck,
  ChevronRight,
  TrendingUp,
  Award
} from 'lucide-react';
import { AcademicProgram, DegreeTier, StudentUser } from '../../types/index.ts';
import {
  getUnlockedPrograms,
  getFollowedProgramIds,
  toggleFollowProgram,
  getAllPrograms
} from '../../lib/programStore.ts';
import { ProgramSelect } from './ProgramSelect.tsx';

interface ExploreProgramsViewProps {
  onSelectProgram: (programId: string) => void;
  currentUser: StudentUser | null;
  onOpenAuthModal?: () => void;
  onOpenMyProgram?: () => void;
}

export const ExploreProgramsView: React.FC<ExploreProgramsViewProps> = ({
  onSelectProgram,
  currentUser,
  onOpenAuthModal,
  onOpenMyProgram
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTier, setSelectedTier] = useState<'All' | DegreeTier>('All');
  const [selectedDiscipline, setSelectedDiscipline] = useState<string>('All');
  const [sortBy, setSortBy] = useState<'popular' | 'resources' | 'name'>('popular');
  const [followedIds, setFollowedIds] = useState<string[]>(() => getFollowedProgramIds());
  const [isRegisterModalOpen, setIsRegisterModalOpen] = useState(false);

  // Dynamic Unlock: Pull only unlocked programs (activeStudents >= 1)
  const [unlockedPrograms, setUnlockedPrograms] = useState<AcademicProgram[]>(() => getUnlockedPrograms());

  useEffect(() => {
    setUnlockedPrograms(getUnlockedPrograms());
  }, [isRegisterModalOpen]);

  const handleToggleFollow = (e: React.MouseEvent, progId: string) => {
    e.stopPropagation();
    toggleFollowProgram(progId);
    setFollowedIds(getFollowedProgramIds());
  };

  // Get distinct disciplines from unlocked programs
  const availableDisciplines = useMemo(() => {
    const set = new Set<string>();
    unlockedPrograms.forEach(p => {
      if (p.discipline) set.add(p.discipline);
    });
    return Array.from(set).sort();
  }, [unlockedPrograms]);

  const filteredPrograms = useMemo(() => {
    return unlockedPrograms
      .filter(prog => {
        // Degree Tier filter
        if (selectedTier !== 'All' && prog.degreeTier !== selectedTier) {
          return false;
        }
        // Discipline filter
        if (selectedDiscipline !== 'All' && prog.discipline !== selectedDiscipline) {
          return false;
        }
        // Search query
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase().trim();
          const matchName = prog.name.toLowerCase().includes(q);
          const matchCode = prog.shortCode.toLowerCase().includes(q);
          const matchDisc = prog.discipline.toLowerCase().includes(q);
          const matchDesc = prog.description.toLowerCase().includes(q);
          if (!matchName && !matchCode && !matchDisc && !matchDesc) {
            return false;
          }
        }
        return true;
      })
      .sort((a, b) => {
        if (sortBy === 'popular') return b.activeStudents - a.activeStudents;
        if (sortBy === 'resources') return b.resourceCount - a.resourceCount;
        return a.name.localeCompare(b.name);
      });
  }, [unlockedPrograms, selectedTier, selectedDiscipline, searchQuery, sortBy]);

  const totalVaultMaterials = useMemo(() => {
    return unlockedPrograms.reduce((acc, p) => acc + (p.resourceCount || 0), 0);
  }, [unlockedPrograms]);

  const totalStudentPeers = useMemo(() => {
    return unlockedPrograms.reduce((acc, p) => acc + (p.activeStudents || 0), 0);
  }, [unlockedPrograms]);

  const getTierBadgeStyle = (tier: DegreeTier) => {
    switch (tier) {
      case 'Undergraduate':
        return 'bg-cyan-500/10 text-cyan-400 border-cyan-500/30';
      case "Master's":
        return 'bg-purple-500/10 text-purple-400 border-purple-500/30';
      case 'PhD':
        return 'bg-amber-500/10 text-amber-400 border-amber-500/30';
      case 'Associate':
        return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30';
    }
  };

  return (
    <div className="min-w-0 font-outfit pb-24">
      {/* Hero Header */}
      <div className="relative mb-8 rounded-3xl border border-white/10 bg-gradient-to-b from-zinc-900/90 via-zinc-950/90 to-black p-6 sm:p-8 backdrop-blur-xl shadow-2xl overflow-hidden">
        {/* Subtle decorative glow */}
        <div className="absolute top-0 right-1/4 w-96 h-48 bg-cyan-500/10 blur-[100px] pointer-events-none rounded-full" />
        <div className="absolute bottom-0 left-10 w-72 h-36 bg-indigo-500/10 blur-[80px] pointer-events-none rounded-full" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 text-xs font-semibold mb-3">
              <Compass className="w-3.5 h-3.5 text-cyan-400" />
              <span>Explore Programs Directory</span>
            </div>

            <h1 className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-white tracking-tight">
              Academic Degree Programs &amp; Cohorts
            </h1>
            <p className="mt-2 text-sm sm:text-base text-white/60 leading-relaxed">
              Discover active degree cohorts across Undergraduate, Master's, PhD, and Associate tiers.
              Browse shared lecture notes, past exam solutions, and peer doubt resolution centers.
            </p>

            {/* Dynamic Unlock Rule Notice */}
            <div className="mt-4 flex items-center gap-2 text-xs text-cyan-300/80 bg-cyan-950/30 border border-cyan-500/20 px-3.5 py-2 rounded-xl">
              <ShieldCheck className="w-4 h-4 text-cyan-400 shrink-0" />
              <span>
                <strong>Dynamic Unlock Active:</strong> Degree programs automatically unlock the instant at least 1 student enrolls or creates a custom cohort. Zero mock directories.
              </span>
            </div>
          </div>

          {/* Quick Metrics */}
          <div className="flex flex-row md:flex-col gap-3 shrink-0">
            <div className="flex-1 md:w-56 p-3.5 rounded-2xl bg-zinc-900/70 border border-white/10 backdrop-blur-md">
              <div className="flex items-center justify-between text-xs text-white/50 mb-1">
                <span>Active Cohorts</span>
                <GraduationCap className="w-4 h-4 text-cyan-400" />
              </div>
              <div className="text-2xl font-black text-white">{unlockedPrograms.length}</div>
              <div className="text-[11px] text-cyan-400 font-medium">Unlocked across all tiers</div>
            </div>

            <div className="flex-1 md:w-56 p-3.5 rounded-2xl bg-zinc-900/70 border border-white/10 backdrop-blur-md">
              <div className="flex items-center justify-between text-xs text-white/50 mb-1">
                <span>Vault Materials</span>
                <BookOpen className="w-4 h-4 text-indigo-400" />
              </div>
              <div className="text-2xl font-black text-white">{totalVaultMaterials}+</div>
              <div className="text-[11px] text-white/40">{totalStudentPeers.toLocaleString()} active student peers</div>
            </div>
          </div>
        </div>
      </div>

      {/* Search & Filter Bar */}
      <div className="sticky top-20 z-30 mb-6 bg-black/80 backdrop-blur-xl p-3 sm:p-4 rounded-2xl border border-white/10 shadow-xl space-y-3">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          {/* Search Input */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-white/40 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search programs by name, code, or discipline (e.g. BSCS, Data Science, BBA)..."
              className="w-full pl-10 pr-4 py-2.5 bg-zinc-900/90 border border-white/10 rounded-xl text-sm text-white placeholder-white/35 focus:outline-none focus:border-cyan-400 transition-colors"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-white/40 hover:text-white"
              >
                Clear
              </button>
            )}
          </div>

          {/* Sort dropdown */}
          <div className="flex items-center gap-2 shrink-0">
            <span className="text-xs text-white/50 whitespace-nowrap">Sort by:</span>
            <select
              value={sortBy}
              onChange={e => setSortBy(e.target.value as any)}
              className="bg-zinc-900 border border-white/10 rounded-xl px-3 py-2 text-xs font-semibold text-white focus:outline-none focus:border-cyan-400 cursor-pointer"
            >
              <option value="popular">Most Students (Popular)</option>
              <option value="resources">Most Vault Materials</option>
              <option value="name">Alphabetical (A-Z)</option>
            </select>
          </div>
        </div>

        {/* Tier & Discipline Filter Pills */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pt-2 border-t border-white/5">
          {/* Degree Tier Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none pb-1">
            <span className="text-xs text-white/40 mr-1 shrink-0">Tier:</span>
            {(['All', 'Undergraduate', "Master's", 'PhD', 'Associate'] as const).map(tier => (
              <button
                key={tier}
                type="button"
                onClick={() => setSelectedTier(tier)}
                className={`px-3 py-1 rounded-lg text-xs font-medium transition-all shrink-0 cursor-pointer ${
                  selectedTier === tier
                    ? 'bg-cyan-400 text-black font-bold shadow-[0_0_10px_rgba(0,240,255,0.3)]'
                    : 'bg-zinc-900/80 text-white/60 hover:text-white hover:bg-zinc-800 border border-white/5'
                }`}
              >
                {tier === 'All' ? 'All Tiers' : tier}
              </button>
            ))}
          </div>

          {/* Discipline Selector if available */}
          {availableDisciplines.length > 0 && (
            <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none pb-1">
              <span className="text-xs text-white/40 mr-1 shrink-0">Discipline:</span>
              <select
                value={selectedDiscipline}
                onChange={e => setSelectedDiscipline(e.target.value)}
                className="bg-zinc-900 border border-white/10 rounded-lg px-2.5 py-1 text-xs text-white/80 focus:outline-none focus:border-cyan-400 cursor-pointer"
              >
                <option value="All">All Disciplines ({availableDisciplines.length})</option>
                {availableDisciplines.map(d => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>
      </div>

      {/* Program Cards Grid */}
      {filteredPrograms.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredPrograms.map(prog => {
            const isFollowed = followedIds.includes(prog.id);
            const isUserProgram = currentUser?.programId === prog.id || currentUser?.program === prog.name;

            return (
              <div
                key={prog.id}
                onClick={() => onSelectProgram(prog.id)}
                className={`group relative rounded-2xl border transition-all duration-300 cursor-pointer overflow-hidden flex flex-col justify-between ${
                  isUserProgram
                    ? 'bg-gradient-to-b from-cyan-950/40 via-zinc-900/90 to-black border-cyan-500/50 shadow-[0_0_25px_rgba(0,240,255,0.15)] ring-1 ring-cyan-500/30'
                    : 'bg-zinc-900/60 hover:bg-zinc-900/90 border-white/10 hover:border-cyan-500/40 hover:shadow-xl hover:shadow-black/60'
                }`}
              >
                {/* Top Banner Gradient & Badges */}
                <div className="p-5 pb-3">
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full border uppercase font-bold ${getTierBadgeStyle(prog.degreeTier)}`}>
                        {prog.degreeTier}
                      </span>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-white/5 border border-white/10 text-white/60">
                        {prog.shortCode}
                      </span>
                      {isUserProgram && (
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-cyan-400 text-black font-bold">
                          My Enrolled Program
                        </span>
                      )}
                    </div>

                    {/* Bookmark / Follow button */}
                    <button
                      type="button"
                      onClick={e => handleToggleFollow(e, prog.id)}
                      title={isFollowed ? 'Unfollow program' : 'Follow program'}
                      className={`p-2 rounded-xl border transition-all cursor-pointer ${
                        isFollowed
                          ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40 shadow-sm'
                          : 'bg-black/40 text-white/40 hover:text-white border-white/10 hover:bg-white/10'
                      }`}
                    >
                      {isFollowed ? (
                        <BookmarkCheck className="w-4 h-4 text-cyan-400" />
                      ) : (
                        <Bookmark className="w-4 h-4" />
                      )}
                    </button>
                  </div>

                  <h3 className="text-lg font-bold text-white group-hover:text-cyan-300 transition-colors line-clamp-1">
                    {prog.name}
                  </h3>
                  <div className="text-xs text-white/50 mt-1 mb-2">
                    {prog.discipline}
                  </div>

                  <p className="text-xs text-white/65 line-clamp-2 leading-relaxed">
                    {prog.description}
                  </p>
                </div>

                {/* Middle Info Chips */}
                <div className="px-5 py-2.5 bg-black/40 border-y border-white/5 grid grid-cols-3 gap-2 text-center">
                  <div>
                    <div className="text-[10px] text-white/40 uppercase">Peers</div>
                    <div className="text-xs font-bold text-white flex items-center justify-center gap-1 mt-0.5">
                      <Users className="w-3 h-3 text-cyan-400" />
                      {prog.activeStudents}
                    </div>
                  </div>
                  <div>
                    <div className="text-[10px] text-white/40 uppercase">Materials</div>
                    <div className="text-xs font-bold text-white flex items-center justify-center gap-1 mt-0.5">
                      <BookOpen className="w-3 h-3 text-indigo-400" />
                      {prog.resourceCount}
                    </div>
                  </div>
                  <div>
                    <div className="text-[10px] text-white/40 uppercase">Semesters</div>
                    <div className="text-xs font-bold text-white mt-0.5">
                      {prog.totalSemesters} Sem
                    </div>
                  </div>
                </div>

                {/* Footer Action */}
                <div className="p-4 pt-3 flex items-center justify-between text-xs">
                  <span className="text-[11px] text-white/45 flex items-center gap-1">
                    {prog.badge && (
                      <span className="text-cyan-400/90 font-medium truncate max-w-[170px]">
                        ★ {prog.badge}
                      </span>
                    )}
                  </span>

                  <span className="text-cyan-400 group-hover:text-cyan-300 font-semibold flex items-center gap-1 transition-transform group-hover:translate-x-1">
                    Open Vault
                    <ArrowRight className="w-3.5 h-3.5" />
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="text-center py-16 px-4 rounded-3xl border border-white/10 bg-zinc-950/60 p-8">
          <GraduationCap className="w-12 h-12 text-white/20 mx-auto mb-3" />
          <h3 className="text-lg font-bold text-white">No unlocked programs found</h3>
          <p className="text-xs text-white/50 max-w-md mx-auto mt-1 mb-5">
            No active degree program matched your current search filters. You can register your custom academic program to immediately unlock it in this directory!
          </p>
          <button
            type="button"
            onClick={() => setIsRegisterModalOpen(true)}
            className="px-4 py-2 rounded-xl bg-cyan-400 text-black text-xs font-bold hover:bg-cyan-300 transition-colors inline-flex items-center gap-2 cursor-pointer shadow-lg shadow-cyan-400/20"
          >
            <Plus className="w-4 h-4" />
            Register Custom Degree Program
          </button>
        </div>
      )}

      {/* Floating Register Program Banner */}
      <div className="mt-12 p-6 rounded-3xl border border-white/10 bg-gradient-to-r from-zinc-950 via-zinc-900 to-black flex flex-col sm:flex-row items-center justify-between gap-4 shadow-xl">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400 shrink-0">
            <Sparkles className="w-6 h-6" />
          </div>
          <div>
            <h4 className="text-base font-bold text-white">Enrolled in an unlisted degree program?</h4>
            <p className="text-xs text-white/50 mt-0.5">
              Create your program cohort with 1-click. It instantly unlocks in Explore for other students from your field.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setIsRegisterModalOpen(true)}
          className="px-5 py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-white text-xs font-semibold border border-white/10 transition-colors whitespace-nowrap cursor-pointer flex items-center gap-2 shrink-0"
        >
          <Plus className="w-4 h-4 text-cyan-400" />
          Create / Custom Program
        </button>
      </div>

      {/* Register Custom Program Modal wrapper using ProgramSelect's logic */}
      {isRegisterModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="bg-zinc-950 border border-cyan-500/40 rounded-3xl w-full max-w-lg p-6 shadow-2xl relative">
            <h3 className="text-lg font-bold text-white mb-1">Select or Create Degree Program</h3>
            <p className="text-xs text-white/50 mb-4">
              Select an existing program or register a custom program to unlock it immediately.
            </p>

            <ProgramSelect
              onChange={prog => {
                setIsRegisterModalOpen(false);
                onSelectProgram(prog.id);
              }}
            />

            <div className="mt-5 pt-3 border-t border-white/10 flex justify-end">
              <button
                type="button"
                onClick={() => setIsRegisterModalOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-white/60 hover:text-white"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
