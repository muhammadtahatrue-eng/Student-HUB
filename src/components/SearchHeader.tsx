import React, { useRef, useEffect } from 'react';
import { Search, X, BookOpen, Sparkles } from 'lucide-react';
import { FilterState, StudentUser } from '../types/index.ts';
import { SUBJECT_OPTIONS, MATERIAL_TYPE_LABELS } from '../data/seedData.ts';

interface SearchHeaderProps {
  filters: FilterState;
  setFilters: React.Dispatch<React.SetStateAction<FilterState>>;
  totalCount: number;
  availableCourses: string[];
  user?: StudentUser | null;
}

export const SearchHeader: React.FC<SearchHeaderProps> = ({
  filters,
  setFilters,
  totalCount,
  availableCourses,
  user,
}) => {
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Keyboard shortcut '/' to focus search
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === '/' && document.activeElement !== searchInputRef.current) {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleTypeSelect = (typeKey: string) => {
    setFilters(prev => ({ ...prev, materialType: typeKey }));
  };

  const handleSubjectSelect = (subj: string) => {
    setFilters(prev => ({ ...prev, subject: subj === 'All Subjects' ? 'all' : subj }));
  };

  const handleCourseQuickSelect = (courseCode: string) => {
    setFilters(prev => ({
      ...prev,
      courseCode: prev.courseCode === courseCode ? 'all' : courseCode
    }));
  };

  const clearAllFilters = () => {
    setFilters({
      searchQuery: '',
      materialType: 'all',
      subject: 'all',
      courseCode: 'all',
      academicYear: 'all',
      sortBy: 'latest'
    });
  };

  const hasActiveFilters =
    filters.searchQuery ||
    filters.materialType !== 'all' ||
    filters.subject !== 'all' ||
    filters.courseCode !== 'all' ||
    filters.academicYear !== 'all';

  return (
    <section className="mb-6 sm:mb-8 font-outfit">
      {/* Title & Core Value */}
      <div className="max-w-3xl mx-auto text-center mb-5 sm:mb-7 px-2">
        <span className="text-[10px] sm:text-xs uppercase tracking-widest text-white/40 font-jetbrains">
          Peer-Reviewed Knowledge Repository
        </span>
        <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold tracking-tight text-white mt-1 neon-text [text-wrap:balance]">
          Search University Study Materials
        </h2>
        <p className="text-white/60 text-xs sm:text-sm md:text-base leading-relaxed mt-1.5 [text-wrap:balance]">
          Free, peer-contributed lecture notes, verified past exam derivations, and high-yield study sheets.
        </p>
      </div>

      {/* Personalized Academic Recommendations Banner */}
      {user && (user.majorOrField || user.educationLevel || user.academicYear) && (
        <div className="max-w-2xl mx-auto mb-4 p-3 bg-white/[0.03] border border-cyan-400/20 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs backdrop-blur-md animate-in fade-in">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-xl bg-cyan-400/10 border border-cyan-400/30 flex items-center justify-center text-cyan-300 shrink-0">
              <Sparkles className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="font-jetbrains text-[10px] uppercase tracking-wider text-cyan-300 font-bold">
                  Program Recommendation
                </span>
                <span className="text-white/40 text-[10px]">·</span>
                <span className="text-white/60 text-[10px] truncate">
                  {user.academicYear || 'Academic Year'}
                </span>
              </div>
              <p className="font-semibold text-white truncate text-xs mt-0.5">
                {user.majorOrField || 'Undergraduate Studies'} · {user.university}
              </p>
            </div>
          </div>

          {user.majorOrField && (
            <button
              onClick={() => {
                setFilters(prev => ({
                  ...prev,
                  searchQuery: user.majorOrField || '',
                  subject: 'all'
                }));
              }}
              className="w-full sm:w-auto px-3 py-1.5 bg-cyan-400/15 hover:bg-cyan-400/25 border border-cyan-400/30 text-cyan-300 hover:text-white rounded-xl text-[11px] font-semibold transition-all cursor-pointer shrink-0 flex items-center justify-center gap-1 active:scale-95"
              title="Filter library by your major"
            >
              <span>Filter My Field</span>
            </button>
          )}
        </div>
      )}

      {/* Main Search Bar */}
      <div className="max-w-2xl mx-auto mb-4 sm:mb-5">
        <div className="relative flex items-center">
          <Search className="w-4 sm:w-5 h-4 sm:h-5 text-white/40 absolute left-3.5 sm:left-4 pointer-events-none" />
          <input
            ref={searchInputRef}
            type="text"
            value={filters.searchQuery}
            onChange={(e) => setFilters(prev => ({ ...prev, searchQuery: e.target.value }))}
            placeholder="Search by course (e.g. CS 106B), topic, or professor..."
            className="w-full pl-9 sm:pl-11 pr-14 sm:pr-24 py-3 sm:py-3.5 text-xs sm:text-sm bg-white/5 border border-white/15 rounded-2xl shadow-lg text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-white/40 focus:border-white transition-all backdrop-blur-md"
          />
          {filters.searchQuery ? (
            <button
              onClick={() => setFilters(prev => ({ ...prev, searchQuery: '' }))}
              className="absolute right-3.5 p-1 text-white/50 hover:text-white cursor-pointer"
              title="Clear search"
            >
              <X className="w-4 h-4" />
            </button>
          ) : (
            <kbd className="hidden sm:inline-block absolute right-3.5 px-2 py-0.5 text-[11px] font-jetbrains font-medium text-white/40 bg-white/5 rounded border border-white/15">
              /
            </kbd>
          )}
        </div>

        {/* Quick Popular Course Codes */}
        <div className="mt-2.5 sm:mt-3 flex items-center gap-1.5 sm:gap-2 flex-wrap text-xs text-white/50">
          <span className="font-jetbrains text-white/40 uppercase tracking-wider text-[10px] sm:text-[11px]">Popular:</span>
          {availableCourses.slice(0, 5).map(course => (
            <button
              key={course}
              onClick={() => handleCourseQuickSelect(course)}
              className={`hover:text-white transition-colors cursor-pointer font-jetbrains text-[11px] sm:text-xs py-0.5 px-1 rounded ${
                filters.courseCode === course ? 'font-bold text-[#00f0ff] bg-white/10' : 'text-white/60'
              }`}
            >
              {course}
            </button>
          ))}
          {filters.courseCode !== 'all' && (
            <button
              onClick={() => setFilters(prev => ({ ...prev, courseCode: 'all' }))}
              className="text-white/40 hover:text-white underline cursor-pointer text-[11px] ml-1"
            >
              Reset
            </button>
          )}
        </div>
      </div>

      {/* Interactive Controls Bar: Segmented Types & Filter Selectors */}
      <div className="glass-card p-3 sm:p-4 shadow-xl">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 sm:gap-4">
          {/* Segmented Filter Control for Material Types (Horizontally scrollable on mobile) */}
          <div className="flex items-center gap-1 sm:gap-1.5 p-1 bg-white/5 border border-white/10 rounded-xl overflow-x-auto no-scrollbar max-w-full">
            {Object.entries(MATERIAL_TYPE_LABELS).map(([key, { label, short }]) => {
              const isActive = filters.materialType === key;
              return (
                <button
                  key={key}
                  onClick={() => handleTypeSelect(key)}
                  className={`px-2.5 sm:px-3 py-1.5 text-xs font-medium rounded-lg transition-all cursor-pointer whitespace-nowrap shrink-0 ${
                    isActive
                      ? 'bg-white text-black font-bold shadow-md'
                      : 'text-white/60 hover:text-white hover:bg-white/5'
                  }`}
                >
                  <span className="hidden sm:inline">{label}</span>
                  <span className="sm:hidden">{short}</span>
                </button>
              );
            })}
          </div>

          {/* Secondary Select Dropdowns & Sort: Responsive Grid on Mobile */}
          <div className="grid grid-cols-2 sm:flex sm:items-center gap-2 sm:gap-2.5">
            {/* Subject Selector */}
            <select
              value={filters.subject === 'all' ? 'All Subjects' : filters.subject}
              onChange={(e) => handleSubjectSelect(e.target.value)}
              className="w-full sm:w-auto text-xs font-medium text-white/80 bg-white/5 border border-white/15 rounded-xl px-2.5 sm:px-3 py-2 sm:py-1.5 focus:outline-none focus:ring-1 focus:ring-white cursor-pointer"
            >
              {SUBJECT_OPTIONS.map(subj => (
                <option key={subj} value={subj} className="bg-stone-900 text-white">
                  {subj}
                </option>
              ))}
            </select>

            {/* Academic Year Selector */}
            <select
              value={filters.academicYear}
              onChange={(e) => setFilters(prev => ({ ...prev, academicYear: e.target.value }))}
              className="w-full sm:w-auto text-xs font-medium text-white/80 bg-white/5 border border-white/15 rounded-xl px-2.5 sm:px-3 py-2 sm:py-1.5 focus:outline-none focus:ring-1 focus:ring-white cursor-pointer"
            >
              <option value="all" className="bg-stone-900 text-white">All Years</option>
              <option value="2025" className="bg-stone-900 text-white">2025</option>
              <option value="2024" className="bg-stone-900 text-white">2024</option>
              <option value="2023" className="bg-stone-900 text-white">2023</option>
            </select>

            {/* Sort Order */}
            <select
              value={filters.sortBy}
              onChange={(e) => setFilters(prev => ({ ...prev, sortBy: e.target.value as any }))}
              className="w-full sm:w-auto text-xs font-medium text-white/80 bg-white/5 border border-white/15 rounded-xl px-2.5 sm:px-3 py-2 sm:py-1.5 focus:outline-none focus:ring-1 focus:ring-white cursor-pointer col-span-2 sm:col-span-1"
            >
              <option value="latest" className="bg-stone-900 text-white">Newest First</option>
              <option value="popular" className="bg-stone-900 text-white">Most Downloaded</option>
              <option value="pages" className="bg-stone-900 text-white">Page Count</option>
            </select>

            {hasActiveFilters && (
              <button
                onClick={clearAllFilters}
                className="text-xs font-medium text-white/50 hover:text-white underline ml-1 cursor-pointer col-span-2 sm:col-span-1 text-center sm:text-left py-1"
              >
                Clear all
              </button>
            )}
          </div>
        </div>

        {/* Status / Active Count */}
        <div className="mt-2.5 pt-2.5 border-t border-white/10 flex items-center justify-between text-xs text-white/50">
          <div className="flex items-center gap-1.5">
            <BookOpen className="w-3.5 h-3.5 text-white/40 shrink-0" />
            <span className="tabular-nums font-mono text-white/80 text-[11px] sm:text-xs">
              {totalCount} {totalCount === 1 ? 'material' : 'materials'} available
            </span>
          </div>
          <span className="text-[10px] sm:text-[11px] text-white/40 font-jetbrains truncate max-w-[180px] sm:max-w-none">
            Free open student repository
          </span>
        </div>
      </div>
    </section>
  );
};
