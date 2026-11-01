import React, { useState, useMemo } from 'react';
import {
  Compass,
  Search,
  MapPin,
  BookOpen,
  GraduationCap,
  Users,
  Check,
  Plus,
  ArrowRight,
  Sparkles,
  Building2,
  ShieldCheck,
  MessageSquare,
  HelpCircle,
  Lock,
  Unlock
} from 'lucide-react';
import { University, StudentUser, StudyNote } from '../../types/index.ts';
import {
  getUnlockedUniversities,
  getAllHecUniversities,
  getFollowedUniversityIds,
  toggleFollowUniversity,
  getUniversityRealStats
} from '../../lib/universityStore.ts';

interface ExploreUniversitiesViewProps {
  user: StudentUser | null;
  notes: StudyNote[];
  onSelectUniversity: (universityId: string) => void;
  onOpenSetupModal: () => void;
}

export const ExploreUniversitiesView: React.FC<ExploreUniversitiesViewProps> = ({
  user,
  notes,
  onSelectUniversity,
  onOpenSetupModal
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDiscipline, setSelectedDiscipline] = useState<string>('all');
  const [selectedProvince, setSelectedProvince] = useState<string>('all');
  const [selectedSector, setSelectedSector] = useState<'all' | 'Public' | 'Private'>('all');
  const [onlyFollowed, setOnlyFollowed] = useState<boolean>(false);
  const [followedIds, setFollowedIds] = useState<string[]>(() => getFollowedUniversityIds());

  // Dynamic Unlock Rule: Only universities with >= 1 registered student appear in the Explore grid
  const unlockedUniversities = useMemo(() => getUnlockedUniversities(), [user]);
  const allMasterCount = useMemo(() => getAllHecUniversities().length, []);

  // Compute available provinces and disciplines from unlocked pool
  const provinces = useMemo(() => {
    const list = Array.from(
      new Set(unlockedUniversities.map(u => u.province).filter(Boolean) as string[])
    ).sort();
    return ['all', ...list];
  }, [unlockedUniversities]);

  const allDisciplines = useMemo(() => {
    const set = new Set<string>();
    unlockedUniversities.forEach(u => u.disciplines.forEach(d => set.add(d)));
    return ['all', ...Array.from(set).sort()];
  }, [unlockedUniversities]);

  const handleToggleFollow = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    const result = toggleFollowUniversity(id);
    setFollowedIds(result.followedIds);
  };

  // Filter unlocked universities
  const filteredUniversities = useMemo(() => {
    return unlockedUniversities.filter(u => {
      if (onlyFollowed && !followedIds.includes(u.id)) return false;

      if (selectedProvince !== 'all' && u.province !== selectedProvince) return false;
      if (selectedSector !== 'all' && u.sector !== selectedSector) return false;

      if (
        selectedDiscipline !== 'all' &&
        !u.disciplines.some(d => d.toLowerCase() === selectedDiscipline.toLowerCase())
      ) {
        return false;
      }

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchesName = u.name.toLowerCase().includes(q) || u.shortName.toLowerCase().includes(q);
        const matchesLocation =
          (u.location || '').toLowerCase().includes(q) ||
          (u.city || '').toLowerCase().includes(q) ||
          (u.province || '').toLowerCase().includes(q);
        const matchesDiscipline = u.disciplines.some(d => d.toLowerCase().includes(q));
        if (!matchesName && !matchesLocation && !matchesDiscipline) return false;
      }

      return true;
    });
  }, [
    unlockedUniversities,
    searchQuery,
    selectedDiscipline,
    selectedProvince,
    selectedSector,
    onlyFollowed,
    followedIds
  ]);

  return (
    <div className="relative z-10 max-w-6xl w-full mx-auto px-4 sm:px-6 pl-14 sm:pl-20 md:pl-24 lg:px-8 py-6 sm:py-8 font-outfit text-white">
      {/* Header Banner */}
      <div className="mb-6 flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-white/10 pb-6">
        <div>
          <div className="flex items-center gap-2 text-cyan-400 text-xs font-mono uppercase tracking-wider mb-2">
            <Compass className="w-4 h-4 animate-spin-slow" />
            <span>HEC Academic Directory & Campus Vaults</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
            Explore Universities
          </h1>
          <p className="text-xs sm:text-sm text-white/60 mt-1 max-w-2xl leading-relaxed">
            Discover unlocked HEC-recognized campus repositories in Pakistan. Access verified course materials, peer discussions, and doubt resolution.
          </p>
        </div>

        {/* Student affiliation status / Set university prompt */}
        {user?.university ? (
          <div className="bg-white/[0.03] border border-cyan-500/30 rounded-2xl p-3 flex items-center gap-3 shrink-0 shadow-lg">
            <div className="w-9 h-9 rounded-xl bg-cyan-400/10 border border-cyan-400/30 flex items-center justify-center text-cyan-400">
              <Building2 className="w-4.5 h-4.5" />
            </div>
            <div>
              <div className="text-[10px] uppercase font-mono text-cyan-300">Your Primary Campus</div>
              <div className="text-xs font-semibold text-white truncate max-w-[200px] sm:max-w-xs">
                {user.university}
              </div>
            </div>
            <button
              onClick={onOpenSetupModal}
              className="text-[11px] text-cyan-400 hover:text-cyan-300 underline ml-2 cursor-pointer transition-colors"
            >
              Switch
            </button>
          </div>
        ) : (
          <button
            onClick={onOpenSetupModal}
            className="px-4 py-2.5 rounded-xl bg-cyan-400 text-black text-xs font-bold hover:bg-cyan-300 transition-colors cursor-pointer flex items-center gap-2 shrink-0 shadow-[0_0_20px_rgba(0,240,255,0.25)] active:scale-95"
          >
            <GraduationCap className="w-4 h-4" />
            <span>Connect My University</span>
          </button>
        )}
      </div>

      {/* Dynamic Unlock Rule Info Banner */}
      <div className="mb-6 p-3.5 bg-gradient-to-r from-cyan-950/40 via-zinc-900/60 to-black border border-cyan-500/20 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs backdrop-blur-md">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-cyan-400/10 border border-cyan-400/20 text-cyan-300 flex items-center justify-center shrink-0">
            <Unlock className="w-3.5 h-3.5" />
          </div>
          <div>
            <span className="font-semibold text-white">
              Showing {unlockedUniversities.length} Active Campus Directories
            </span>
            <span className="text-white/50 block text-[11px]">
              Universities automatically unlock the moment at least 1 student registers. ({allMasterCount} recognized institutions in HEC registry).
            </span>
          </div>
        </div>

        <button
          type="button"
          onClick={onOpenSetupModal}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-cyan-300 border border-cyan-400/30 text-xs font-semibold transition-all shrink-0 cursor-pointer self-start sm:self-auto"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Unlock Your Campus</span>
        </button>
      </div>

      {/* Filter Toolbar */}
      <div className="bg-zinc-950/80 backdrop-blur-xl border border-white/10 rounded-2xl p-4 sm:p-5 mb-8 space-y-4 shadow-2xl">
        {/* Search Bar */}
        <div className="relative">
          <Search className="w-4 h-4 text-white/40 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search unlocked universities by name, acronym (NUST, FAST, LUMS), city, or discipline..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 text-xs sm:text-sm bg-white/5 border border-white/15 rounded-xl text-white placeholder:text-white/30 focus:outline-none focus:border-cyan-400 transition-colors"
          />
        </div>

        {/* Filter Controls Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-white/5">
          {/* Disciplines Horizontal Scroll */}
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-1">
            <span className="text-xs text-white/40 font-mono mr-1 shrink-0">Field:</span>
            {allDisciplines.slice(0, 6).map(d => (
              <button
                key={d}
                type="button"
                onClick={() => setSelectedDiscipline(d)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer whitespace-nowrap ${
                  selectedDiscipline === d
                    ? 'bg-cyan-400 text-black font-semibold'
                    : 'text-white/60 hover:text-white hover:bg-white/5'
                }`}
              >
                {d === 'all' ? 'All Disciplines' : d}
              </button>
            ))}
          </div>

          {/* Secondary Dropdowns & Follow Toggle */}
          <div className="flex items-center gap-2 shrink-0 flex-wrap">
            {/* Sector Selector */}
            <select
              value={selectedSector}
              onChange={e => setSelectedSector(e.target.value as any)}
              className="px-3 py-1.5 text-xs bg-zinc-900 border border-white/15 rounded-lg text-white/80 focus:outline-none focus:border-cyan-400 cursor-pointer"
            >
              <option value="all">All Sectors</option>
              <option value="Public">Public Sector</option>
              <option value="Private">Private Sector</option>
            </select>

            {/* Province Selector */}
            <select
              value={selectedProvince}
              onChange={e => setSelectedProvince(e.target.value)}
              className="px-3 py-1.5 text-xs bg-zinc-900 border border-white/15 rounded-lg text-white/80 focus:outline-none focus:border-cyan-400 cursor-pointer"
            >
              <option value="all">All Regions</option>
              {provinces.filter(p => p !== 'all').map(p => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>

            {/* Followed Only Toggle */}
            <button
              type="button"
              onClick={() => setOnlyFollowed(prev => !prev)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer border ${
                onlyFollowed
                  ? 'bg-cyan-500/20 text-cyan-300 border-cyan-400/40'
                  : 'bg-white/[0.02] text-white/60 border-white/10 hover:text-white hover:border-white/20'
              }`}
            >
              Followed ({followedIds.length})
            </button>
          </div>
        </div>
      </div>

      {/* Grid of Unlocked Universities */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredUniversities.map(uni => {
          const isFollowed = followedIds.includes(uni.id);
          const isMyUniversity =
            user?.universityId === uni.id ||
            user?.university?.toLowerCase().trim() === uni.name.toLowerCase().trim();

          const stats = getUniversityRealStats(uni, notes);

          return (
            <div
              key={uni.id}
              onClick={() => onSelectUniversity(uni.id)}
              className="group relative bg-[#0c0d12]/90 hover:bg-[#12141a] border border-white/10 hover:border-cyan-500/50 rounded-2xl p-5 transition-all duration-300 cursor-pointer flex flex-col justify-between shadow-xl hover:shadow-[0_0_25px_rgba(0,240,255,0.12)] hover:-translate-y-1"
            >
              {/* Card Top: Header */}
              <div>
                <div className="flex items-start justify-between gap-3 mb-4">
                  <div className="flex items-center gap-3 min-w-0">
                    <img
                      src={uni.logoUrl}
                      alt={uni.name}
                      className="w-12 h-12 rounded-xl object-cover border border-white/15 group-hover:border-cyan-400/40 transition-colors shrink-0 shadow-md"
                    />
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <h3 className="text-sm sm:text-base font-bold text-white group-hover:text-cyan-300 transition-colors leading-snug truncate">
                          {uni.name}
                        </h3>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-white/50 mt-0.5">
                        <span className="flex items-center gap-1 truncate">
                          <MapPin className="w-3 h-3 text-cyan-400 shrink-0" />
                          <span className="truncate">{uni.city || uni.location}</span>
                        </span>
                        {uni.sector && (
                          <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-white/5 border border-white/10 text-white/70">
                            {uni.sector}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Follow Button */}
                  <button
                    type="button"
                    onClick={e => handleToggleFollow(e, uni.id)}
                    aria-label={isFollowed ? 'Unfollow' : 'Follow'}
                    className={`p-2 rounded-xl border text-xs transition-colors shrink-0 ${
                      isFollowed
                        ? 'bg-cyan-500/20 border-cyan-400/40 text-cyan-300'
                        : 'bg-white/5 border-white/10 text-white/60 hover:text-white hover:bg-white/10'
                    }`}
                  >
                    {isFollowed ? <Check className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                  </button>
                </div>

                {/* Badge if custom or HEC verified */}
                <div className="flex items-center gap-2 mb-3">
                  {uni.hecRecognized ? (
                    <span className="inline-flex items-center gap-1 text-[10px] font-medium text-emerald-400 bg-emerald-400/10 px-2 py-0.5 rounded-md border border-emerald-400/20 font-mono">
                      <ShieldCheck className="w-3 h-3" />
                      <span>HEC Recognized</span>
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-[10px] font-medium text-amber-300 bg-amber-400/10 px-2 py-0.5 rounded-md border border-amber-400/20 font-mono">
                      <Sparkles className="w-3 h-3 text-amber-400" />
                      <span>Pending HEC Verification</span>
                    </span>
                  )}
                  {uni.badge && (
                    <span className="text-[10px] text-cyan-300 font-mono truncate">
                      {uni.badge}
                    </span>
                  )}
                </div>

                {/* Description */}
                <p className="text-xs text-white/60 line-clamp-2 leading-relaxed mb-4">
                  {uni.description}
                </p>

                {/* Disciplines */}
                <div className="text-[11px] text-white/40 mb-4 truncate font-mono">
                  {uni.disciplines.join(' · ')}
                </div>
              </div>

              {/* Card Bottom: Real-Time Stats (No Fake Counts) */}
              <div className="pt-4 border-t border-white/10">
                <div className="grid grid-cols-3 gap-2 text-center text-xs text-white/70 mb-3 bg-white/[0.02] p-2 rounded-xl border border-white/5">
                  <div>
                    <div className="font-bold text-white text-xs sm:text-sm">{stats.documentsCount}</div>
                    <div className="text-[10px] text-white/40">Notes</div>
                  </div>
                  <div>
                    <div className="font-bold text-white text-xs sm:text-sm">{stats.discussionsCount}</div>
                    <div className="text-[10px] text-white/40">Posts</div>
                  </div>
                  <div>
                    <div className="font-bold text-white text-xs sm:text-sm">{stats.studentsCount}</div>
                    <div className="text-[10px] text-white/40">Students</div>
                  </div>
                </div>

                {/* Action button */}
                <div className="flex items-center justify-between pt-1">
                  {isMyUniversity ? (
                    <span className="text-[11px] text-cyan-400 font-semibold font-mono flex items-center gap-1">
                      <GraduationCap className="w-3.5 h-3.5" />
                      Your Campus
                    </span>
                  ) : (
                    <span className="text-[11px] text-white/40">Est. {uni.establishedYear}</span>
                  )}
                  <span className="text-xs font-semibold text-white/80 group-hover:text-cyan-400 transition-colors flex items-center gap-1">
                    Enter Vault
                    <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {filteredUniversities.length === 0 && (
        <div className="text-center py-20 px-6 bg-zinc-950/50 border border-white/10 rounded-2xl max-w-md mx-auto">
          <Compass className="w-10 h-10 text-white/30 mx-auto mb-3" />
          <h3 className="text-base font-bold text-white mb-1">No unlocked universities found</h3>
          <p className="text-xs text-white/50 mb-5 leading-relaxed">
            No registered students currently mapped to this filter. You can unlock any HEC university or create a custom campus directory right now.
          </p>
          <div className="flex items-center justify-center gap-2">
            <button
              onClick={() => {
                setSearchQuery('');
                setSelectedDiscipline('all');
                setSelectedProvince('all');
                setSelectedSector('all');
                setOnlyFollowed(false);
              }}
              className="px-4 py-2 text-xs font-semibold text-white bg-white/10 rounded-xl hover:bg-white/20 transition-colors cursor-pointer"
            >
              Reset Filters
            </button>
            <button
              onClick={onOpenSetupModal}
              className="px-4 py-2 text-xs font-bold text-black bg-cyan-400 rounded-xl hover:bg-cyan-300 transition-colors cursor-pointer"
            >
              Unlock a University
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
