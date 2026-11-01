import React from 'react';
import {
  Home,
  BookOpen,
  PlusCircle,
  FileText,
  Zap,
  Award,
  Sparkles,
  User as UserIcon,
  Code2,
  Compass,
  GraduationCap,
  Building2
} from 'lucide-react';
import { StudentUser, FilterState } from '../types/index.ts';

interface VerticalTaskbarProps {
  currentTab: 'landing' | 'browse' | 'upload' | 'explore' | 'university';
  setCurrentTab: (tab: 'landing' | 'browse' | 'upload' | 'explore' | 'university') => void;
  filters?: FilterState;
  setFilters?: React.Dispatch<React.SetStateAction<FilterState>>;
  user: StudentUser | null;
  onOpenMyUniversity: () => void;
  onOpenExplore: () => void;
  onOpenAuthModal: (mode?: 'signin' | 'signup' | 'settings' | 'profile') => void;
  onOpenCodeDrawer?: () => void;
}

export const VerticalTaskbar: React.FC<VerticalTaskbarProps> = ({
  currentTab,
  setCurrentTab,
  filters,
  setFilters,
  user,
  onOpenMyUniversity,
  onOpenExplore,
  onOpenAuthModal,
  onOpenCodeDrawer,
}) => {
  const handleQuickTypeFilter = (typeKey: string) => {
    if (currentTab !== 'browse') {
      setCurrentTab('browse');
    }
    if (setFilters) {
      setFilters(prev => ({
        ...prev,
        materialType: prev.materialType === typeKey ? 'all' : typeKey
      }));
    }
  };

  return (
    <aside
      aria-label="Vertical Taskbar"
      className="fixed left-3 sm:left-5 md:left-6 top-1/2 -translate-y-1/2 z-40 font-outfit select-none"
    >
      <div className="bg-black/60 backdrop-blur-xl border border-white/10 rounded-2xl sm:rounded-full shadow-2xl shadow-black/80 p-2 sm:p-2.5 flex flex-col items-center gap-1.5 sm:gap-2">
        {/* Task 1: Overview */}
        <button
          type="button"
          onClick={() => setCurrentTab('landing')}
          aria-label="Overview"
          className={`w-9 h-9 sm:w-10 sm:h-10 rounded-xl sm:rounded-full flex items-center justify-center transition-all duration-200 cursor-pointer relative group active:scale-95 ${
            currentTab === 'landing'
              ? 'bg-cyan-400 text-black shadow-[0_0_15px_rgba(0,240,255,0.4)] font-bold'
              : 'text-white/60 hover:text-white hover:bg-white/10'
          }`}
        >
          <Home className="w-4 h-4 sm:w-4.5 sm:h-4.5" />
          <span className="pointer-events-none absolute left-full ml-3 top-1/2 -translate-y-1/2 px-2.5 py-1 bg-black/90 backdrop-blur-md text-white text-[11px] font-medium font-outfit rounded-lg border border-white/15 shadow-xl whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity z-50">
            Overview
          </span>
        </button>

        {/* Task 2: Study Library */}
        <button
          type="button"
          onClick={() => {
            setCurrentTab('browse');
            if (setFilters) {
              setFilters(prev => ({ ...prev, materialType: 'all' }));
            }
          }}
          aria-label="Study Library"
          className={`w-9 h-9 sm:w-10 sm:h-10 rounded-xl sm:rounded-full flex items-center justify-center transition-all duration-200 cursor-pointer relative group active:scale-95 ${
            currentTab === 'browse' && (!filters || filters.materialType === 'all')
              ? 'bg-cyan-400 text-black shadow-[0_0_15px_rgba(0,240,255,0.4)] font-bold'
              : 'text-white/60 hover:text-white hover:bg-white/10'
          }`}
        >
          <BookOpen className="w-4 h-4 sm:w-4.5 sm:h-4.5" />
          <span className="pointer-events-none absolute left-full ml-3 top-1/2 -translate-y-1/2 px-2.5 py-1 bg-black/90 backdrop-blur-md text-white text-[11px] font-medium font-outfit rounded-lg border border-white/15 shadow-xl whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity z-50">
            Study Library
          </span>
        </button>

        {/* Task 3: My University (Module 1) */}
        <button
          type="button"
          onClick={onOpenMyUniversity}
          aria-label="My University"
          className={`w-9 h-9 sm:w-10 sm:h-10 rounded-xl sm:rounded-full flex items-center justify-center transition-all duration-200 cursor-pointer relative group active:scale-95 ${
            currentTab === 'university'
              ? 'bg-cyan-400 text-black shadow-[0_0_15px_rgba(0,240,255,0.4)] font-bold'
              : 'text-white/60 hover:text-white hover:bg-white/10'
          }`}
        >
          <GraduationCap className="w-4 h-4 sm:w-4.5 sm:h-4.5" />
          <span className="pointer-events-none absolute left-full ml-3 top-1/2 -translate-y-1/2 px-2.5 py-1 bg-black/90 backdrop-blur-md text-white text-[11px] font-medium font-outfit rounded-lg border border-white/15 shadow-xl whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity z-50">
            {user?.university ? `My University: ${user.university}` : 'Set My University'}
          </span>
        </button>

        {/* Task 4: Explore Universities with Compass icon (Module 2) */}
        <button
          type="button"
          onClick={onOpenExplore}
          aria-label="Explore Universities"
          className={`w-9 h-9 sm:w-10 sm:h-10 rounded-xl sm:rounded-full flex items-center justify-center transition-all duration-200 cursor-pointer relative group active:scale-95 ${
            currentTab === 'explore'
              ? 'bg-cyan-400 text-black shadow-[0_0_15px_rgba(0,240,255,0.4)] font-bold'
              : 'text-white/60 hover:text-white hover:bg-white/10'
          }`}
        >
          <Compass className="w-4 h-4 sm:w-4.5 sm:h-4.5" />
          <span className="pointer-events-none absolute left-full ml-3 top-1/2 -translate-y-1/2 px-2.5 py-1 bg-black/90 backdrop-blur-md text-white text-[11px] font-medium font-outfit rounded-lg border border-white/15 shadow-xl whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity z-50">
            Explore Universities
          </span>
        </button>

        {/* Task 5: Upload Resource */}
        <button
          type="button"
          onClick={() => setCurrentTab('upload')}
          aria-label="Upload Notes"
          className={`w-9 h-9 sm:w-10 sm:h-10 rounded-xl sm:rounded-full flex items-center justify-center transition-all duration-200 cursor-pointer relative group active:scale-95 ${
            currentTab === 'upload'
              ? 'bg-cyan-400 text-black shadow-[0_0_15px_rgba(0,240,255,0.4)] font-bold'
              : 'text-white/60 hover:text-white hover:bg-white/10'
          }`}
        >
          <PlusCircle className="w-4 h-4 sm:w-4.5 sm:h-4.5" />
          <span className="pointer-events-none absolute left-full ml-3 top-1/2 -translate-y-1/2 px-2.5 py-1 bg-black/90 backdrop-blur-md text-white text-[11px] font-medium font-outfit rounded-lg border border-white/15 shadow-xl whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity z-50">
            Upload Notes
          </span>
        </button>

        {/* Gutter separator */}
        <div className="w-5 h-px bg-white/10 my-0.5" />

        {/* Task 6: Filter Lecture Notes */}
        <button
          type="button"
          onClick={() => handleQuickTypeFilter('lecture_notes')}
          aria-label="Lecture Notes Filter"
          className={`w-9 h-9 sm:w-10 sm:h-10 rounded-xl sm:rounded-full flex items-center justify-center transition-all duration-200 cursor-pointer relative group active:scale-95 ${
            currentTab === 'browse' && filters?.materialType === 'lecture_notes'
              ? 'bg-cyan-400 text-black shadow-[0_0_15px_rgba(0,240,255,0.4)] font-bold'
              : 'text-white/60 hover:text-white hover:bg-white/10'
          }`}
        >
          <FileText className="w-4 h-4 sm:w-4.5 sm:h-4.5" />
          <span className="pointer-events-none absolute left-full ml-3 top-1/2 -translate-y-1/2 px-2.5 py-1 bg-black/90 backdrop-blur-md text-white text-[11px] font-medium font-outfit rounded-lg border border-white/15 shadow-xl whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity z-50">
            Lecture Notes
          </span>
        </button>

        {/* Task 7: Filter Cheat Sheets */}
        <button
          type="button"
          onClick={() => handleQuickTypeFilter('cheat_sheet')}
          aria-label="Cheat Sheets Filter"
          className={`w-9 h-9 sm:w-10 sm:h-10 rounded-xl sm:rounded-full flex items-center justify-center transition-all duration-200 cursor-pointer relative group active:scale-95 ${
            currentTab === 'browse' && filters?.materialType === 'cheat_sheet'
              ? 'bg-cyan-400 text-black shadow-[0_0_15px_rgba(0,240,255,0.4)] font-bold'
              : 'text-white/60 hover:text-white hover:bg-white/10'
          }`}
        >
          <Zap className="w-4 h-4 sm:w-4.5 sm:h-4.5" />
          <span className="pointer-events-none absolute left-full ml-3 top-1/2 -translate-y-1/2 px-2.5 py-1 bg-black/90 backdrop-blur-md text-white text-[11px] font-medium font-outfit rounded-lg border border-white/15 shadow-xl whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity z-50">
            Cheat Sheets
          </span>
        </button>

        {/* Task 8: Filter Past Exams */}
        <button
          type="button"
          onClick={() => handleQuickTypeFilter('past_exam')}
          aria-label="Past Exams Filter"
          className={`w-9 h-9 sm:w-10 sm:h-10 rounded-xl sm:rounded-full flex items-center justify-center transition-all duration-200 cursor-pointer relative group active:scale-95 ${
            currentTab === 'browse' && filters?.materialType === 'past_exam'
              ? 'bg-cyan-400 text-black shadow-[0_0_15px_rgba(0,240,255,0.4)] font-bold'
              : 'text-white/60 hover:text-white hover:bg-white/10'
          }`}
        >
          <Award className="w-4 h-4 sm:w-4.5 sm:h-4.5" />
          <span className="pointer-events-none absolute left-full ml-3 top-1/2 -translate-y-1/2 px-2.5 py-1 bg-black/90 backdrop-blur-md text-white text-[11px] font-medium font-outfit rounded-lg border border-white/15 shadow-xl whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity z-50">
            Past Exams
          </span>
        </button>

        {/* Gutter separator */}
        <div className="w-5 h-px bg-white/10 my-0.5" />

        {/* Task 9: Background Setting */}
        <button
          type="button"
          onClick={() => onOpenAuthModal('settings')}
          aria-label="Background Setting"
          className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl sm:rounded-full flex items-center justify-center transition-all duration-200 cursor-pointer relative group active:scale-95 text-cyan-300 hover:text-white hover:bg-white/10"
        >
          <Sparkles className="w-4 h-4 sm:w-4.5 sm:h-4.5" />
          <span className="pointer-events-none absolute left-full ml-3 top-1/2 -translate-y-1/2 px-2.5 py-1 bg-black/90 backdrop-blur-md text-white text-[11px] font-medium font-outfit rounded-lg border border-white/15 shadow-xl whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity z-50">
            Background Setting
          </span>
        </button>

        {/* Task 10: Student Profile */}
        <button
          type="button"
          onClick={() => onOpenAuthModal(user ? 'profile' : 'signin')}
          aria-label="Student Profile"
          className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl sm:rounded-full flex items-center justify-center transition-all duration-200 cursor-pointer relative group active:scale-95 text-white/60 hover:text-white hover:bg-white/10"
        >
          {user?.avatarUrl ? (
            <img
              src={user.avatarUrl}
              alt={user.name || 'Student'}
              className="w-5 h-5 rounded-lg object-cover border border-white/20"
            />
          ) : (
            <UserIcon className="w-4 h-4 sm:w-4.5 sm:h-4.5" />
          )}
          <span className="pointer-events-none absolute left-full ml-3 top-1/2 -translate-y-1/2 px-2.5 py-1 bg-black/90 backdrop-blur-md text-white text-[11px] font-medium font-outfit rounded-lg border border-white/15 shadow-xl whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity z-50">
            {user ? (user.username ? `@${user.username}` : user.name) : 'Student Profile'}
          </span>
        </button>

        {/* Task 11: Export Code / Schema */}
        {onOpenCodeDrawer && (
          <button
            type="button"
            onClick={onOpenCodeDrawer}
            aria-label="Export Code"
            className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl sm:rounded-full flex items-center justify-center transition-all duration-200 cursor-pointer relative group active:scale-95 text-white/50 hover:text-white hover:bg-white/10"
          >
            <Code2 className="w-4 h-4 sm:w-4.5 sm:h-4.5" />
            <span className="pointer-events-none absolute left-full ml-3 top-1/2 -translate-y-1/2 px-2.5 py-1 bg-black/90 backdrop-blur-md text-white text-[11px] font-medium font-outfit rounded-lg border border-white/15 shadow-xl whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity z-50">
              Export Code
            </span>
          </button>
        )}
      </div>
    </aside>
  );
};
