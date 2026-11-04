import React, { useState, useMemo, useEffect } from 'react';
import {
  Compass,
  Search,
  GraduationCap,
  Users,
  BookOpen,
  Sparkles,
  ArrowRight,
  Bookmark,
  BookmarkCheck,
  ShieldCheck,
  X
} from 'lucide-react';
import { AcademicProgram, DegreeTier, StudentUser } from '../../types/index.ts';
import {
  getUnlockedPrograms,
  getFollowedProgramIds,
  toggleFollowProgram,
  syncProgramsFromSupabase
} from '../../lib/programStore.ts';

interface ExploreProgramsViewProps {
  onSelectProgram: (program: string | AcademicProgram) => void;
  currentUser?: StudentUser | null;
  user?: StudentUser | null;
  notes?: any[];
  onOpenAuthModal?: () => void;
  onOpenMyProgram?: () => void;
  onOpenSetupModal?: () => void;
}

export const ExploreProgramsView: React.FC<ExploreProgramsViewProps> = ({
  onSelectProgram,
  currentUser,
  user,
  notes,
  onOpenMyProgram,
  onOpenSetupModal
}) => {
  const activeUser = currentUser || user || null;
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTier, setSelectedTier] = useState<'All' | DegreeTier>('All');
  const [selectedDiscipline, setSelectedDiscipline] = useState<string>('All');
  const [sortBy, setSortBy] = useState<'popular' | 'resources' | 'name'>('popular');
  const [followedIds, setFollowedIds] = useState<string[]>(() => getFollowedProgramIds(activeUser?.id));

  // Dynamic Unlock: Show ONLY programs that have at least 1 registered student (activeStudents >= 1)
  const [unlockedPrograms, setUnlockedPrograms] = useState<AcademicProgram[]>(() =>
    getUnlockedPrograms().filter(prog => (prog.activeStudents || 0) >= 1)
  );

  useEffect(() => {
    const refresh = () => {
      setUnlockedPrograms(
        getUnlockedPrograms().filter(prog => (prog.activeStudents || 0) >= 1)
      );
      setFollowedIds(getFollowedProgramIds(activeUser?.id));
    };
    refresh();
    syncProgramsFromSupabase(undefined, notes).catch(() => {});

    window.addEventListener('xeusar-program-data-synced', refresh);
    return () => {
      window.removeEventListener('xeusar-program-data-synced', refresh);
    };
  }, [notes, activeUser?.id, activeUser?.programId, activeUser?.program, activeUser?.majorOrField]);

  const handleToggleFollow = (e: React.MouseEvent, progId: string) => {
    e.stopPropagation();
    toggleFollowProgram(progId, activeUser?.id);
    setFollowedIds(getFollowedProgramIds(activeUser?.id));
  };

  const hasActiveFilters =
    Boolean(searchQuery.trim()) ||
    selectedTier !== 'All' ||
    selectedDiscipline !== 'All';

  const handleClearFilters = () => {
    setSearchQuery('');
    setSelectedTier('All');
    setSelectedDiscipline('All');
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
        if ((prog.activeStudents || 0) < 1) {
          return false;
        }
        if (selectedTier !== 'All' && prog.degreeTier !== selectedTier) {
          return false;
        }
        if (selectedDiscipline !== 'All' && prog.discipline !== selectedDiscipline) {
          return false;
        }
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

  const getTierAccentText = (tier: DegreeTier) => {
    switch (tier) {
      case 'Undergraduate':
        return 'text-cyan-400';
      case "Master's":
        return 'text-purple-400';
      case 'PhD':
        return 'text-amber-400';
      case 'Associate':
        return 'text-emerald-400';
    }
  };

  return (
    <div className="min-w-0 font-outfit space-y-4">
      {/* Compact Page Header & Summary Statistics */}
      <header className="rounded-2xl border border-white/10 bg-zinc-950/85 backdrop-blur-xl p-4 sm:p-5 shadow-xl">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 text-xs text-cyan-400 font-medium mb-1">
              <Compass className="w-3.5 h-3.5 shrink-0" />
              <span>Explore Programs Directory</span>
              {activeUser?.program && (
                <>
                  <span aria-hidden="true" className="text-white/25">·</span>
                  <button
                    type="button"
                    onClick={() => {
                      if (onOpenMyProgram) onOpenMyProgram();
                      else if (activeUser.programId) onSelectProgram(activeUser.programId);
                    }}
                    className="text-white/70 hover:text-cyan-300 underline cursor-pointer truncate"
                  >
                    My Cohort: {activeUser.program}
                  </button>
                </>
              )}
            </div>

            <h1 className="text-xl sm:text-2xl font-extrabold text-white tracking-tight">
              Academic Degree Programs &amp; Cohorts
            </h1>
            <p className="mt-1 text-xs sm:text-sm text-white/60 leading-relaxed max-w-2xl">
              Discover active degree cohorts across Undergraduate, Master's, PhD, and Associate tiers.
              Browse shared lecture notes, past exam solutions, and peer doubt resolution centers.
            </p>

            {/* Compact Dynamic Unlock Notice */}
            <div className="mt-2.5 inline-flex items-center gap-2 text-[11px] text-cyan-300/85 bg-cyan-950/25 border border-cyan-500/20 px-3 py-1.5 rounded-xl">
              <ShieldCheck className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
              <span>
                <strong>System Program Unlock:</strong> Only degree programs with at least 1 registered student are displayed. Programs are created automatically by the system when a student registers with that specific program.
              </span>
            </div>
          </div>

          {/* Compact Summary Statistics */}
          <div className="flex flex-col sm:flex-row lg:flex-col xl:flex-row items-stretch sm:items-center gap-2.5 shrink-0">
            <div className="grid grid-cols-2 gap-2.5 sm:flex sm:items-center">
              <div className="px-3.5 py-2.5 rounded-xl bg-zinc-900/80 border border-white/10 min-w-[136px]">
                <div className="flex items-center justify-between gap-2 text-[11px] text-white/50">
                  <span>Active Cohorts</span>
                  <GraduationCap className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                </div>
                <div className="text-lg font-extrabold text-white tabular-nums mt-0.5">
                  {unlockedPrograms.length}
                </div>
                <div className="text-[10px] text-cyan-400/90 font-medium">
                  ≥ 1 student enrolled
                </div>
              </div>

              <div className="px-3.5 py-2.5 rounded-xl bg-zinc-900/80 border border-white/10 min-w-[136px]">
                <div className="flex items-center justify-between gap-2 text-[11px] text-white/50">
                  <span>Vault Materials</span>
                  <BookOpen className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                </div>
                <div className="text-lg font-extrabold text-white tabular-nums mt-0.5">
                  {totalVaultMaterials}
                </div>
                <div className="text-[10px] text-white/45 tabular-nums">
                  {totalStudentPeers.toLocaleString()} active peers
                </div>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Cohesive Search & Degree-Tier Filter Toolbar */}
      <section
        aria-label="Program search and filters"
        className="rounded-2xl border border-white/10 bg-zinc-950/85 backdrop-blur-xl p-3 sm:p-4 shadow-lg space-y-3"
      >
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
          {/* Search Input */}
          <div className="relative flex-1 min-w-0">
            <Search className="w-4 h-4 text-white/40 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search programs by name, code, or discipline (e.g. BSCS, Data Science, BBA)..."
              className="w-full pl-9 pr-9 py-2 bg-zinc-900/90 border border-white/10 rounded-xl text-xs sm:text-sm text-white placeholder-white/35 focus:outline-none focus:border-cyan-400 transition-colors"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-white/40 hover:text-white cursor-pointer"
                title="Clear search"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Sort dropdown */}
          <div className="flex items-center gap-2 shrink-0">
            <label htmlFor="explore-sort-select" className="text-xs text-white/50 whitespace-nowrap">
              Sort by:
            </label>
            <select
              id="explore-sort-select"
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

        {/* Degree Tier Filter Buttons & Discipline Selector */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pt-2.5 border-t border-white/5">
          <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none pb-0.5">
            <span className="text-xs text-white/40 mr-1 shrink-0">Tier:</span>
            {(['All', 'Undergraduate', "Master's", 'PhD', 'Associate'] as const).map(tier => (
              <button
                key={tier}
                type="button"
                onClick={() => setSelectedTier(tier)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all shrink-0 cursor-pointer ${
                  selectedTier === tier
                    ? 'bg-cyan-400 text-black font-bold shadow-sm'
                    : 'bg-zinc-900/80 text-white/65 hover:text-white hover:bg-zinc-800 border border-white/5'
                }`}
              >
                {tier === 'All' ? 'All Tiers' : tier}
              </button>
            ))}
          </div>

          <div className="flex items-center justify-between sm:justify-end gap-2.5 shrink-0">
            {availableDisciplines.length > 0 && (
              <div className="flex items-center gap-1.5">
                <label htmlFor="explore-discipline-select" className="text-xs text-white/40 shrink-0">
                  Discipline:
                </label>
                <select
                  id="explore-discipline-select"
                  value={selectedDiscipline}
                  onChange={e => setSelectedDiscipline(e.target.value)}
                  className="bg-zinc-900 border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-white/85 focus:outline-none focus:border-cyan-400 cursor-pointer max-w-[200px] truncate"
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

            {hasActiveFilters && (
              <button
                type="button"
                onClick={handleClearFilters}
                className="text-xs font-semibold text-cyan-400 hover:text-cyan-300 underline cursor-pointer whitespace-nowrap"
              >
                Reset filters
              </button>
            )}
          </div>
        </div>
      </section>

      {/* Program Cards Grid or Compact Empty State */}
      {filteredPrograms.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredPrograms.map(prog => {
            const isFollowed = followedIds.includes(prog.id);
            const isUserProgram =
              activeUser?.programId === prog.id || activeUser?.program === prog.name;

            return (
              <article
                key={prog.id}
                onClick={() => onSelectProgram(prog.id)}
                className={`group relative rounded-2xl border transition-all duration-200 cursor-pointer flex flex-col justify-between p-4 sm:p-5 ${
                  isUserProgram
                    ? 'bg-zinc-900/90 border-cyan-500/50 ring-1 ring-cyan-500/25'
                    : 'bg-zinc-950/80 hover:bg-zinc-900/90 border-white/10 hover:border-cyan-500/40'
                }`}
              >
                <div>
                  {/* Top Metadata Line & Follow Action */}
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="flex items-center flex-wrap gap-1.5 text-[11px] font-jetbrains">
                      <span className={`font-bold uppercase ${getTierAccentText(prog.degreeTier)}`}>
                        {prog.degreeTier}
                      </span>
                      <span aria-hidden="true" className="text-white/25">·</span>
                      <span className="text-white/75 font-semibold">{prog.shortCode}</span>
                      {isUserProgram && (
                        <>
                          <span aria-hidden="true" className="text-white/25">·</span>
                          <span className="text-cyan-300 font-bold">Enrolled</span>
                        </>
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={e => handleToggleFollow(e, prog.id)}
                      title={isFollowed ? 'Unfollow program' : 'Follow program'}
                      aria-label={isFollowed ? `Unfollow ${prog.name}` : `Follow ${prog.name}`}
                      className={`p-1.5 rounded-lg border transition-colors cursor-pointer shrink-0 ${
                        isFollowed
                          ? 'bg-cyan-500/15 text-cyan-300 border-cyan-500/40'
                          : 'bg-white/5 text-white/45 hover:text-white border-white/10 hover:bg-white/10'
                      }`}
                    >
                      {isFollowed ? (
                        <BookmarkCheck className="w-3.5 h-3.5 text-cyan-400" />
                      ) : (
                        <Bookmark className="w-3.5 h-3.5" />
                      )}
                    </button>
                  </div>

                  {/* Program Title & Discipline */}
                  <h2 className="text-base sm:text-lg font-bold text-white group-hover:text-cyan-300 transition-colors leading-snug line-clamp-2">
                    {prog.name}
                  </h2>
                  <div className="text-xs text-white/50 mt-0.5 mb-2">
                    {prog.discipline}
                  </div>

                  <p className="text-xs text-white/65 line-clamp-2 leading-relaxed mb-4">
                    {prog.description}
                  </p>
                </div>

                <div>
                  {/* Aligned Program Metrics Bar */}
                  <div className="py-2.5 px-3 rounded-xl bg-black/40 border border-white/5 grid grid-cols-3 gap-2 text-center mb-3">
                    <div>
                      <div className="text-[10px] text-white/40 uppercase">Peers</div>
                      <div className="text-xs font-bold text-white flex items-center justify-center gap-1 mt-0.5 tabular-nums">
                        <Users className="w-3 h-3 text-cyan-400 shrink-0" />
                        <span>{prog.activeStudents}</span>
                      </div>
                    </div>
                    <div>
                      <div className="text-[10px] text-white/40 uppercase">Materials</div>
                      <div className="text-xs font-bold text-white flex items-center justify-center gap-1 mt-0.5 tabular-nums">
                        <BookOpen className="w-3 h-3 text-indigo-400 shrink-0" />
                        <span>{prog.resourceCount}</span>
                      </div>
                    </div>
                    <div>
                      <div className="text-[10px] text-white/40 uppercase">Duration</div>
                      <div className="text-xs font-bold text-white mt-0.5 tabular-nums">
                        {prog.totalSemesters} Sem
                      </div>
                    </div>
                  </div>

                  {/* Card Footer */}
                  <div className="flex items-center justify-between text-xs pt-1">
                    <span className="text-[11px] text-white/50 truncate max-w-[180px]">
                      {prog.badge ? `★ ${prog.badge}` : `${prog.totalCredits} Credit Hours`}
                    </span>

                    <span className="text-cyan-400 group-hover:text-cyan-300 font-semibold inline-flex items-center gap-1 transition-transform group-hover:translate-x-0.5">
                      <span>Open Vault</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </span>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      ) : (
        /* Compact Contextual Empty State */
        <div className="max-w-lg mx-auto my-2 py-7 px-5 rounded-2xl border border-white/10 bg-zinc-950/80 text-center shadow-lg">
          <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center mx-auto mb-2.5 text-white/40">
            <GraduationCap className="w-5 h-5" />
          </div>
          <h3 className="text-base font-bold text-white">
            {hasActiveFilters
              ? 'No active programs match these filters'
              : 'No active degree programs with enrolled students yet'}
          </h3>
          <p className="text-xs text-white/55 mt-1 mb-4 leading-relaxed">
            {hasActiveFilters
              ? 'Try clearing your current search or tier filter to view programs with enrolled students.'
              : 'Only programs with at least 1 student are shown here. Programs are automatically created and unlocked by the system when a student registers with that specific program.'}
          </p>
          {hasActiveFilters && (
            <div className="flex flex-wrap items-center justify-center gap-2.5">
              <button
                type="button"
                onClick={handleClearFilters}
                className="px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/15 text-white text-xs font-semibold transition-colors cursor-pointer"
              >
                Clear Filters
              </button>
            </div>
          )}
        </div>
      )}

      {/* System Automatic Program Creation Info Bar */}
      <div className="p-4 rounded-2xl border border-white/10 bg-zinc-950/80 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-9 h-9 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400 shrink-0">
            <Sparkles className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <h4 className="text-xs sm:text-sm font-bold text-white">
              System-Managed Degree Cohorts
            </h4>
            <p className="text-xs text-white/50 truncate sm:whitespace-normal">
              Programs appear automatically when at least 1 student registers with that specific program in their academic profile.
            </p>
          </div>
        </div>

        {onOpenSetupModal && (
          <div className="flex items-center gap-2 shrink-0 w-full sm:w-auto justify-end">
            <button
              type="button"
              onClick={onOpenSetupModal}
              className="px-3.5 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-white/80 hover:text-white text-xs font-semibold border border-white/10 transition-colors cursor-pointer"
            >
              Set My Program
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
