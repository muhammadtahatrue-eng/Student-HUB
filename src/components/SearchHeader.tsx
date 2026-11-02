import React, { useRef, useEffect, useMemo } from 'react';
import { Search, X, BookOpen } from 'lucide-react';
import { FilterState, StudentUser } from '../types/index.ts';
import { MATERIAL_TYPE_LABELS } from '../data/seedData.ts';
import { getAvailableProgramsForFilter } from '../lib/resourceService.ts';

interface SearchHeaderProps {
  filters: FilterState;
  setFilters: React.Dispatch<React.SetStateAction<FilterState>>;
  totalCount: number;
  availableCourses?: string[];
  availableYears?: string[];
  availableSubjects?: string[];
  user?: StudentUser | null;
}

export const SearchHeader: React.FC<SearchHeaderProps> = ({
  filters,
  setFilters,
  totalCount,
  availableCourses = [],
  availableYears = [],
  availableSubjects = [],
}) => {
  const searchInputRef = useRef<HTMLInputElement>(null);
  const availablePrograms = useMemo(() => getAvailableProgramsForFilter(), []);

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

  const handleSubjectSelect = (subj: string) => {
    setFilters(prev => ({ ...prev, subject: subj === 'All Subjects' ? 'all' : subj }));
  };

  const clearAllFilters = () => {
    setFilters({
      searchQuery: '',
      materialType: 'all',
      subject: 'all',
      courseCode: 'all',
      academicYear: 'all',
      programId: 'all',
      semesterNumber: 'all',
      sortBy: 'latest'
    });
  };

  const hasActiveFilters =
    Boolean(filters.searchQuery) ||
    filters.materialType !== 'all' ||
    filters.subject !== 'all' ||
    filters.courseCode !== 'all' ||
    filters.academicYear !== 'all' ||
    (Boolean(filters.programId) && filters.programId !== 'all') ||
    (Boolean(filters.semesterNumber) && filters.semesterNumber !== 'all');

  return (
    <section className="mb-6 font-outfit">
      {/* Primary Search Bar */}
      <div className="w-full mb-3 sm:mb-4">
        <div className="relative flex items-center">
          <Search className="w-4 sm:w-5 h-4 sm:h-5 text-white/40 absolute left-3.5 sm:left-4 pointer-events-none" />
          <input
            ref={searchInputRef}
            type="text"
            value={filters.searchQuery}
            onChange={(e) => setFilters(prev => ({ ...prev, searchQuery: e.target.value }))}
            placeholder="Search by course (e.g. Engineering, Thermodynamics), title, degree program, or uploader..."
            className="w-full pl-9 sm:pl-11 pr-14 sm:pr-24 py-3 sm:py-3.5 text-xs sm:text-sm bg-white/5 border border-white/15 rounded-2xl shadow-lg text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-[#00f0ff]/50 focus:border-[#00f0ff] transition-all backdrop-blur-md"
          />
          {filters.searchQuery ? (
            <button
              type="button"
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
      </div>

      {/* Dynamic Filter Controls Bar */}
      <div className="glass-card p-3 sm:p-4 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
          {/* Dynamic Select Dropdowns & Sort */}
          <div className="flex flex-wrap items-center gap-2 sm:gap-2.5">
            {/* Degree Program & Major Selector */}
            <select
              value={filters.programId || 'all'}
              onChange={(e) => setFilters(prev => ({ ...prev, programId: e.target.value }))}
              aria-label="Filter by Degree Program"
              className="text-xs font-medium text-white/80 bg-white/5 border border-white/15 rounded-xl px-2.5 sm:px-3 py-2 sm:py-1.5 focus:outline-none focus:ring-1 focus:ring-[#00f0ff] cursor-pointer"
            >
              <option value="all" className="bg-stone-900 text-white">All Degree Programs</option>
              {availablePrograms.map(prog => (
                <option key={prog.id} value={prog.id} className="bg-stone-900 text-white">
                  {prog.name}
                </option>
              ))}
            </select>

            {/* Semester Selector */}
            <select
              value={filters.semesterNumber || 'all'}
              onChange={(e) => setFilters(prev => ({ ...prev, semesterNumber: e.target.value }))}
              aria-label="Filter by Semester"
              className="text-xs font-medium text-white/80 bg-white/5 border border-white/15 rounded-xl px-2.5 sm:px-3 py-2 sm:py-1.5 focus:outline-none focus:ring-1 focus:ring-[#00f0ff] cursor-pointer"
            >
              <option value="all" className="bg-stone-900 text-white">All Semesters</option>
              {[1, 2, 3, 4, 5, 6, 7, 8].map(s => (
                <option key={s} value={String(s)} className="bg-stone-900 text-white">
                  Semester {s}
                </option>
              ))}
            </select>

            {/* Course Category / Discipline Selector (e.g. Engineering, Computer Science, etc.) */}
            {availableSubjects.length > 0 && (
              <select
                value={filters.subject === 'all' ? 'All Subjects' : filters.subject}
                onChange={(e) => handleSubjectSelect(e.target.value)}
                aria-label="Filter by Course Category"
                className="text-xs font-medium text-white/80 bg-white/5 border border-white/15 rounded-xl px-2.5 sm:px-3 py-2 sm:py-1.5 focus:outline-none focus:ring-1 focus:ring-[#00f0ff] cursor-pointer"
              >
                {availableSubjects.map(subj => (
                  <option key={subj} value={subj} className="bg-stone-900 text-white">
                    {subj === 'All Subjects' ? 'All Course Categories' : subj}
                  </option>
                ))}
              </select>
            )}

            {/* Course Name Selector (Categorized by Uploader's Course) */}
            {availableCourses.length > 0 && (
              <select
                value={filters.courseCode}
                onChange={(e) => setFilters(prev => ({ ...prev, courseCode: e.target.value }))}
                aria-label="Filter by Course"
                className="text-xs font-medium text-white/80 bg-white/5 border border-white/15 rounded-xl px-2.5 sm:px-3 py-2 sm:py-1.5 focus:outline-none focus:ring-1 focus:ring-[#00f0ff] cursor-pointer"
              >
                <option value="all" className="bg-stone-900 text-white">All Courses</option>
                {availableCourses.map(course => (
                  <option key={course} value={course} className="bg-stone-900 text-white">
                    {course}
                  </option>
                ))}
              </select>
            )}

            {/* Resource Type Selector */}
            <select
              value={filters.materialType}
              onChange={(e) => setFilters(prev => ({ ...prev, materialType: e.target.value }))}
              aria-label="Filter by Resource Type"
              className="text-xs font-medium text-white/80 bg-white/5 border border-white/15 rounded-xl px-2.5 sm:px-3 py-2 sm:py-1.5 focus:outline-none focus:ring-1 focus:ring-[#00f0ff] cursor-pointer"
            >
              <option value="all" className="bg-stone-900 text-white">All Types</option>
              {Object.entries(MATERIAL_TYPE_LABELS)
                .filter(([k]) => k !== 'all')
                .map(([key, info]) => (
                  <option key={key} value={key} className="bg-stone-900 text-white">
                    {info.label}
                  </option>
                ))}
            </select>

            {/* Dynamic Academic Year Selector */}
            {availableYears.length > 0 && (
              <select
                value={filters.academicYear}
                onChange={(e) => setFilters(prev => ({ ...prev, academicYear: e.target.value }))}
                aria-label="Filter by Academic Year"
                className="text-xs font-medium text-white/80 bg-white/5 border border-white/15 rounded-xl px-2.5 sm:px-3 py-2 sm:py-1.5 focus:outline-none focus:ring-1 focus:ring-[#00f0ff] cursor-pointer"
              >
                <option value="all" className="bg-stone-900 text-white">All Years</option>
                {availableYears.map(yr => (
                  <option key={yr} value={yr} className="bg-stone-900 text-white">
                    {yr}
                  </option>
                ))}
              </select>
            )}

            {/* Sort Order */}
            <select
              value={filters.sortBy}
              onChange={(e) => setFilters(prev => ({ ...prev, sortBy: e.target.value as any }))}
              aria-label="Sort Materials"
              className="text-xs font-medium text-white/80 bg-white/5 border border-white/15 rounded-xl px-2.5 sm:px-3 py-2 sm:py-1.5 focus:outline-none focus:ring-1 focus:ring-[#00f0ff] cursor-pointer"
            >
              <option value="latest" className="bg-stone-900 text-white">Newest First</option>
              <option value="popular" className="bg-stone-900 text-white">Most Downloaded</option>
              <option value="pages" className="bg-stone-900 text-white">Page Count</option>
            </select>

            {hasActiveFilters && (
              <button
                type="button"
                onClick={clearAllFilters}
                className="text-xs font-medium text-cyan-400 hover:text-white underline ml-1 cursor-pointer py-1"
              >
                Clear all
              </button>
            )}
          </div>

          {/* Dynamic Status / Active Count */}
          <div className="flex items-center gap-2 text-xs text-white/50 shrink-0">
            <BookOpen className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
            <span className="tabular-nums font-mono text-white/80 text-[11px] sm:text-xs">
              {totalCount} {totalCount === 1 ? 'document' : 'documents'} found
            </span>
          </div>
        </div>
      </div>
    </section>
  );
};
