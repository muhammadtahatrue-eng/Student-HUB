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
  Globe,
  SlidersHorizontal
} from 'lucide-react';
import { University, StudentUser, StudyNote } from '../../types/index.ts';
import {
  getUniversities,
  getFollowedUniversityIds,
  toggleFollowUniversity,
  getUniversityRealResourceCounts
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
  const [selectedCountry, setSelectedCountry] = useState<string>('all');
  const [onlyFollowed, setOnlyFollowed] = useState<boolean>(false);
  const [followedIds, setFollowedIds] = useState<string[]>(() => getFollowedUniversityIds());

  const universities = useMemo(() => getUniversities(), []);

  // Compute available countries and disciplines
  const countries = useMemo(() => {
    const list = Array.from(new Set(universities.map(u => u.country))).sort();
    return ['all', ...list];
  }, [universities]);

  const allDisciplines = useMemo(() => {
    const set = new Set<string>();
    universities.forEach(u => u.disciplines.forEach(d => set.add(d)));
    return ['all', ...Array.from(set).sort()];
  }, [universities]);

  const handleToggleFollow = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    const result = toggleFollowUniversity(id);
    setFollowedIds(result.followedIds);
  };

  // Filter universities
  const filteredUniversities = useMemo(() => {
    return universities.filter(u => {
      if (onlyFollowed && !followedIds.includes(u.id)) return false;

      if (selectedCountry !== 'all' && u.country !== selectedCountry) return false;

      if (
        selectedDiscipline !== 'all' &&
        !u.disciplines.some(d => d.toLowerCase() === selectedDiscipline.toLowerCase())
      ) {
        return false;
      }

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchesName = u.name.toLowerCase().includes(q) || u.shortName.toLowerCase().includes(q);
        const matchesLocation = u.location.toLowerCase().includes(q) || u.country.toLowerCase().includes(q);
        const matchesDiscipline = u.disciplines.some(d => d.toLowerCase().includes(q));
        if (!matchesName && !matchesLocation && !matchesDiscipline) return false;
      }

      return true;
    });
  }, [universities, searchQuery, selectedDiscipline, selectedCountry, onlyFollowed, followedIds]);

  return (
    <div className="relative z-10 max-w-6xl w-full mx-auto px-4 sm:px-6 pl-14 sm:pl-20 md:pl-24 lg:px-8 py-6 sm:py-8 font-outfit">
      {/* Header Banner */}
      <div className="mb-8 flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-white/10 pb-6">
        <div>
          <div className="flex items-center gap-2 text-cyan-400 text-xs font-mono uppercase tracking-wider mb-2">
            <Compass className="w-4 h-4 animate-spin-slow" />
            <span>Academic Directory & Campus Vault</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
            Explore Universities
          </h1>
          <p className="text-xs sm:text-sm text-white/60 mt-1 max-w-2xl leading-relaxed">
            Discover verified campus repositories, browse peer lecture notes, engage in scoped university discussions, and collaborate across academic communities.
          </p>
        </div>

        {/* Home university affiliation prompt */}
        {user?.university ? (
          <div className="bg-white/[0.03] border border-cyan-500/30 rounded-xl p-3 flex items-center gap-3 shrink-0">
            <div className="w-8 h-8 rounded-lg bg-cyan-400/10 border border-cyan-400/30 flex items-center justify-center text-cyan-400">
              <Building2 className="w-4 h-4" />
            </div>
            <div>
              <div className="text-[11px] text-white/50">Your Campus</div>
              <div className="text-xs font-semibold text-white">{user.university}</div>
            </div>
            <button
              onClick={onOpenSetupModal}
              className="text-[11px] text-cyan-400 hover:text-cyan-300 underline ml-2 cursor-pointer"
            >
              Change
            </button>
          </div>
        ) : (
          <button
            onClick={onOpenSetupModal}
            className="px-4 py-2.5 rounded-xl bg-cyan-400 text-black text-xs font-bold hover:bg-cyan-300 transition-colors cursor-pointer flex items-center gap-2 shrink-0 shadow-[0_0_15px_rgba(0,240,255,0.2)]"
          >
            <GraduationCap className="w-4 h-4" />
            <span>Set My University</span>
          </button>
        )}
      </div>

      {/* Filter Toolbar */}
      <div className="bg-zinc-950/80 backdrop-blur-xl border border-white/10 rounded-2xl p-4 sm:p-5 mb-8 space-y-4">
        {/* Search Bar */}
        <div className="relative">
          <Search className="w-4 h-4 text-white/40 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search universities by name, location, country, or department..."
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
            {allDisciplines.slice(0, 7).map(d => (
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
          <div className="flex items-center gap-2 shrink-0">
            {/* Country Selector */}
            <select
              value={selectedCountry}
              onChange={e => setSelectedCountry(e.target.value)}
              className="px-3 py-1.5 text-xs bg-zinc-900 border border-white/15 rounded-lg text-white/80 focus:outline-none focus:border-cyan-400 cursor-pointer"
            >
              <option value="all">All Countries</option>
              {countries.filter(c => c !== 'all').map(c => (
                <option key={c} value={c}>
                  {c}
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

      {/* Grid of Universities */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredUniversities.map(uni => {
          const isFollowed = followedIds.includes(uni.id);
          const isMyUniversity =
            user?.university?.toLowerCase().includes(uni.shortName.toLowerCase()) ||
            user?.university?.toLowerCase() === uni.name.toLowerCase() ||
            user?.universityId === uni.id;

          const stats = getUniversityRealResourceCounts(uni.id, notes);

          return (
            <div
              key={uni.id}
              onClick={() => onSelectUniversity(uni.id)}
              className="group relative bg-zinc-950/70 hover:bg-zinc-900/90 border border-white/10 hover:border-cyan-500/40 rounded-2xl p-5 transition-all duration-300 cursor-pointer flex flex-col justify-between shadow-xl hover:shadow-cyan-500/5 hover:-translate-y-1"
            >
              {/* Card Top: Banner accent + Header */}
              <div>
                <div className="flex items-start justify-between gap-3 mb-4">
                  <div className="flex items-center gap-3">
                    <img
                      src={uni.logoUrl}
                      alt={uni.name}
                      className="w-12 h-12 rounded-xl object-cover border border-white/15 group-hover:border-cyan-400/40 transition-colors shrink-0 shadow-md"
                    />
                    <div>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <h3 className="text-base font-bold text-white group-hover:text-cyan-300 transition-colors leading-snug">
                          {uni.name}
                        </h3>
                      </div>
                      <div className="flex items-center gap-1 text-xs text-white/50 mt-0.5">
                        <MapPin className="w-3 h-3 text-white/40 shrink-0" />
                        <span className="truncate">{uni.location}</span>
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

                {/* Description */}
                <p className="text-xs text-white/60 line-clamp-2 leading-relaxed mb-4">
                  {uni.description}
                </p>

                {/* Disciplines (Unboxed inline text, anti-AI slop) */}
                <div className="text-[11px] text-white/40 mb-4 truncate font-mono">
                  {uni.disciplines.join(' · ')}
                </div>
              </div>

              {/* Card Bottom: Metadata & Stats (Clean typographic layout) */}
              <div className="pt-4 border-t border-white/10">
                <div className="flex items-center justify-between text-xs text-white/60 mb-3">
                  <div className="flex items-center gap-1">
                    <BookOpen className="w-3.5 h-3.5 text-cyan-400" />
                    <span>
                      <strong className="text-white">{stats.documentsCount}</strong> documents
                    </span>
                  </div>
                  <span className="text-white/20">·</span>
                  <div className="flex items-center gap-1">
                    <Users className="w-3.5 h-3.5 text-white/40" />
                    <span>
                      <strong className="text-white">{uni.verifiedStudents.toLocaleString()}</strong> peers
                    </span>
                  </div>
                </div>

                {/* Action button */}
                <div className="flex items-center justify-between pt-1">
                  {isMyUniversity ? (
                    <span className="text-[11px] text-cyan-400 font-medium font-mono flex items-center gap-1">
                      <GraduationCap className="w-3.5 h-3.5" />
                      Your University
                    </span>
                  ) : (
                    <span className="text-[11px] text-white/40">Est. {uni.establishedYear}</span>
                  )}
                  <span className="text-xs font-semibold text-white/80 group-hover:text-cyan-400 transition-colors flex items-center gap-1">
                    Enter Directory
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
          <h3 className="text-base font-bold text-white mb-1">No universities found</h3>
          <p className="text-xs text-white/50 mb-5 leading-relaxed">
            Try resetting your search query or field filters to see the full list of campus vaults.
          </p>
          <button
            onClick={() => {
              setSearchQuery('');
              setSelectedDiscipline('all');
              setSelectedCountry('all');
              setOnlyFollowed(false);
            }}
            className="px-4 py-2 text-xs font-semibold text-black bg-cyan-400 rounded-lg hover:bg-cyan-300 transition-colors"
          >
            Clear All Filters
          </button>
        </div>
      )}
    </div>
  );
};
