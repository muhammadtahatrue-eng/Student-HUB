import React, { useState } from 'react';
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
  PanelLeftClose,
  PanelLeftOpen,
  Database,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { StudentUser, FilterState, SupabaseConfig } from '../types/index.ts';

interface VerticalTaskbarProps {
  currentTab: 'landing' | 'browse' | 'upload' | 'explore' | 'program' | 'university';
  setCurrentTab: (tab: any) => void;
  filters?: FilterState;
  setFilters?: React.Dispatch<React.SetStateAction<FilterState>>;
  user: StudentUser | null;
  onOpenMyProgram: () => void;
  onOpenMyUniversity?: () => void;
  onOpenExplore: () => void;
  onOpenAuthModal: (mode?: 'signin' | 'signup' | 'settings' | 'profile') => void;
  onOpenCodeDrawer?: () => void;
  supabaseConfig?: SupabaseConfig;
  onOpenSupabaseModal?: () => void;
}

export const VerticalTaskbar: React.FC<VerticalTaskbarProps> = ({
  currentTab,
  setCurrentTab,
  filters,
  setFilters,
  user,
  onOpenMyProgram,
  onOpenExplore,
  onOpenAuthModal,
  onOpenCodeDrawer,
  supabaseConfig,
  onOpenSupabaseModal,
}) => {
  const [isMinimized, setIsMinimized] = useState<boolean>(() => {
    try {
      return localStorage.getItem('studyvault_taskbar_minimized') === 'true';
    } catch {
      return false;
    }
  });

  const toggleMinimized = () => {
    setIsMinimized(prev => {
      const next = !prev;
      try {
        localStorage.setItem('studyvault_taskbar_minimized', String(next));
      } catch {}
      return next;
    });
  };

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

  // Minimized collapsed state: Sleek mini handle with maximize button
  if (isMinimized) {
    return (
      <aside
        aria-label="Vertical Taskbar (Minimized)"
        className="fixed left-2 sm:left-3 top-1/2 -translate-y-1/2 z-40 font-outfit select-none"
      >
        <div className="bg-black/80 backdrop-blur-2xl border border-white/20 hover:border-cyan-400/50 rounded-2xl shadow-2xl p-1.5 flex flex-col items-center gap-1.5 transition-all group">
          <button
            type="button"
            onClick={toggleMinimized}
            aria-label="Maximize taskbar"
            title="Maximize taskbar"
            className="w-8 h-8 rounded-xl flex items-center justify-center bg-cyan-400/10 hover:bg-cyan-400 text-cyan-300 hover:text-black transition-all cursor-pointer shadow-[0_0_15px_rgba(0,240,255,0.25)] active:scale-95 relative"
          >
            <ChevronRight className="w-4 h-4" />
            <span className="pointer-events-none absolute left-full ml-3 top-1/2 -translate-y-1/2 px-2.5 py-1 bg-black/90 backdrop-blur-md text-white text-[11px] font-medium font-outfit rounded-lg border border-white/15 shadow-xl whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity z-50">
              Maximize Taskbar
            </span>
          </button>
          
          <button
            type="button"
            onClick={() => setCurrentTab('landing')}
            aria-label="Overview"
            title="Back to Landing"
            className="w-7 h-7 rounded-lg flex items-center justify-center text-white/50 hover:text-white hover:bg-white/10 transition-colors"
          >
            <Home className="w-3.5 h-3.5" />
          </button>
        </div>
      </aside>
    );
  }

  // Maximized full vertical taskbar
  return (
    <aside
      aria-label="Vertical Taskbar"
      className="fixed left-3 sm:left-5 md:left-6 top-1/2 -translate-y-1/2 z-40 font-outfit select-none transition-transform duration-200"
    >
      <div className="bg-black/70 backdrop-blur-2xl border border-white/15 rounded-2xl sm:rounded-3xl shadow-2xl shadow-black/90 p-2 sm:p-2.5 flex flex-col items-center gap-1.5 sm:gap-2">
        {/* Minimize Button at the top */}
        <button
          type="button"
          onClick={toggleMinimized}
          aria-label="Minimize sidebar"
          title="Minimize sidebar"
          className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl flex items-center justify-center text-white/40 hover:text-cyan-300 hover:bg-white/10 transition-all cursor-pointer relative group active:scale-95"
        >
          <PanelLeftClose className="w-4 h-4 sm:w-4.5 sm:h-4.5" />
          <span className="pointer-events-none absolute left-full ml-3 top-1/2 -translate-y-1/2 px-2.5 py-1 bg-black/90 backdrop-blur-md text-white text-[11px] font-medium font-outfit rounded-lg border border-white/15 shadow-xl whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity z-50">
            Minimize Sidebar
          </span>
        </button>

        <div className="w-5 h-px bg-white/15 my-0.5" />

        {/* Task 1: Overview (Landing page) */}
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

        {/* Task 3: My Program */}
        <button
          type="button"
          onClick={onOpenMyProgram}
          aria-label="My Program"
          className={`w-9 h-9 sm:w-10 sm:h-10 rounded-xl sm:rounded-full flex items-center justify-center transition-all duration-200 cursor-pointer relative group active:scale-95 ${
            currentTab === 'program' || currentTab === 'university'
              ? 'bg-cyan-400 text-black shadow-[0_0_15px_rgba(0,240,255,0.4)] font-bold'
              : 'text-white/60 hover:text-white hover:bg-white/10'
          }`}
        >
          <GraduationCap className="w-4 h-4 sm:w-4.5 sm:h-4.5" />
          <span className="pointer-events-none absolute left-full ml-3 top-1/2 -translate-y-1/2 px-2.5 py-1 bg-black/90 backdrop-blur-md text-white text-[11px] font-medium font-outfit rounded-lg border border-white/15 shadow-xl whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity z-50">
            {user?.program ? `My Program: ${user.program}` : 'Set My Program'}
          </span>
        </button>

        {/* Task 4: Explore Programs */}
        <button
          type="button"
          onClick={onOpenExplore}
          aria-label="Explore Programs"
          className={`w-9 h-9 sm:w-10 sm:h-10 rounded-xl sm:rounded-full flex items-center justify-center transition-all duration-200 cursor-pointer relative group active:scale-95 ${
            currentTab === 'explore'
              ? 'bg-cyan-400 text-black shadow-[0_0_15px_rgba(0,240,255,0.4)] font-bold'
              : 'text-white/60 hover:text-white hover:bg-white/10'
          }`}
        >
          <Compass className="w-4 h-4 sm:w-4.5 sm:h-4.5" />
          <span className="pointer-events-none absolute left-full ml-3 top-1/2 -translate-y-1/2 px-2.5 py-1 bg-black/90 backdrop-blur-md text-white text-[11px] font-medium font-outfit rounded-lg border border-white/15 shadow-xl whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity z-50">
            Explore Programs
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

        {/* Quick Type Filters */}
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

        {/* Database / Supabase indicator and trigger */}
        {onOpenSupabaseModal && (
          <button
            type="button"
            onClick={onOpenSupabaseModal}
            aria-label="Database Connection"
            className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl sm:rounded-full flex items-center justify-center transition-all duration-200 cursor-pointer relative group active:scale-95 text-white/60 hover:text-white hover:bg-white/10"
          >
            <Database className="w-4 h-4 sm:w-4.5 sm:h-4.5" />
            <span className={`w-1.5 h-1.5 rounded-full absolute top-2 right-2 ${supabaseConfig?.isConnected ? 'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]' : 'bg-amber-400'}`} />
            <span className="pointer-events-none absolute left-full ml-3 top-1/2 -translate-y-1/2 px-2.5 py-1 bg-black/90 backdrop-blur-md text-white text-[11px] font-medium font-outfit rounded-lg border border-white/15 shadow-xl whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity z-50">
              {supabaseConfig?.isConnected ? 'Supabase Connected' : 'Connect Supabase'}
            </span>
          </button>
        )}

        {/* Flare Background Settings */}
        <button
          type="button"
          onClick={() => onOpenAuthModal('settings')}
          aria-label="Background Setting"
          className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl sm:rounded-full flex items-center justify-center transition-all duration-200 cursor-pointer relative group active:scale-95 text-cyan-300 hover:text-white hover:bg-white/10"
        >
          <Sparkles className="w-4 h-4 sm:w-4.5 sm:h-4.5" />
          <span className="pointer-events-none absolute left-full ml-3 top-1/2 -translate-y-1/2 px-2.5 py-1 bg-black/90 backdrop-blur-md text-white text-[11px] font-medium font-outfit rounded-lg border border-white/15 shadow-xl whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity z-50">
            Background Flare
          </span>
        </button>

        {/* Student Profile */}
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
            {user ? (user.username ? `@${user.username}` : user.name) : 'Student Sign In'}
          </span>
        </button>

        {/* Export Code / Schema */}
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
