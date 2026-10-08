import React from 'react';
import {
  GraduationCap,
  Home,
  BookOpen,
  PlusCircle,
  User as UserIcon
} from 'lucide-react';
import { SupabaseConfig, StudentUser } from '../types/index.ts';

interface NavbarProps {
  currentTab: 'landing' | 'browse' | 'upload';
  setCurrentTab: (tab: 'landing' | 'browse' | 'upload') => void;
  supabaseConfig?: SupabaseConfig;
  onOpenSupabaseModal?: () => void;
  user: StudentUser | null;
  onOpenAuthModal: (mode?: 'signin' | 'signup') => void;
  onOpenCodeDrawer?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentTab,
  setCurrentTab,
  user,
  onOpenAuthModal,
}) => {
  return (
    <>
      {/* Top Floating Glass Navigation Header (Desktop & Mobile) */}
      <header className="sticky top-2 sm:top-4 z-40 px-3 sm:px-6 w-full max-w-7xl mx-auto font-outfit">
        <nav className="flex items-center justify-between bg-black/60 backdrop-blur-xl rounded-2xl sm:rounded-full px-3.5 sm:px-7 py-2 sm:py-3 border border-white/10 shadow-2xl">
          {/* Left Side: Brand Lockup & Desktop Navigation Links */}
          <div className="flex items-center gap-3 sm:gap-8">
            {/* Brand Lockup */}
            <button
              onClick={() => setCurrentTab('landing')}
              className="flex items-center gap-2 sm:gap-2.5 cursor-pointer text-left focus:outline-none group shrink-0"
            >
              <div className="w-7 h-7 sm:w-8 sm:h-8 bg-white rounded-lg flex items-center justify-center transition-transform group-hover:scale-105 shrink-0">
                <GraduationCap className="w-4 h-4 text-black" />
              </div>
              <span className="text-base sm:text-xl font-bold tracking-tighter uppercase text-white group-hover:text-white/90">
                StudyVault
              </span>
            </button>

            {/* Desktop Navigation Links */}
            <div className="hidden md:flex items-center gap-6 text-sm font-medium text-white/70">
              <button
                onClick={() => setCurrentTab('landing')}
                className={`hover:text-white transition-colors cursor-pointer ${
                  currentTab === 'landing' ? 'text-white font-semibold' : ''
                }`}
              >
                Overview
              </button>
              <button
                onClick={() => setCurrentTab('browse')}
                className={`hover:text-white transition-colors cursor-pointer ${
                  currentTab === 'browse' ? 'text-white font-semibold' : ''
                }`}
              >
                Study Library
              </button>
              <button
                onClick={() => setCurrentTab('upload')}
                className={`hover:text-white transition-colors cursor-pointer ${
                  currentTab === 'upload' ? 'text-white font-semibold' : ''
                }`}
              >
                Upload Note
              </button>
            </div>
          </div>

          {/* Right Side: Account Actions */}
          <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0">
            {user ? (
              <button
                onClick={() => onOpenAuthModal('signin')}
                className="flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm font-medium text-white/90 hover:text-white transition-all cursor-pointer px-2.5 sm:px-3.5 py-1.5 rounded-full bg-white/5 hover:bg-white/10 border border-white/15 group"
                title="View student profile & settings"
              >
                {user.avatarUrl ? (
                  <img
                    src={user.avatarUrl}
                    alt={user.name}
                    className="w-5 h-5 rounded-full object-cover border border-[#00f0ff] group-hover:scale-105 transition-transform shrink-0"
                  />
                ) : (
                  <div className="w-5 h-5 rounded-full bg-[#00f0ff] text-black font-bold flex items-center justify-center text-[10px] shrink-0">
                    {user.name.charAt(0).toUpperCase()}
                  </div>
                )}
                <span className="truncate max-w-[85px] sm:max-w-[130px] font-medium text-[11px] sm:text-xs">
                  {user.username ? `@${user.username}` : user.name}
                </span>
              </button>
            ) : (
              <div className="flex items-center gap-1.5 sm:gap-2">
                <button
                  onClick={() => onOpenAuthModal('signin')}
                  className="text-xs sm:text-sm font-medium text-white/70 hover:text-white transition-colors cursor-pointer px-2.5 sm:px-3 py-1.5 rounded-full hover:bg-white/10"
                >
                  Log In
                </button>
                <button
                  onClick={() => onOpenAuthModal('signup')}
                  className="text-xs sm:text-sm font-bold text-black bg-[#00f0ff] hover:bg-[#00f0ff]/90 transition-all cursor-pointer px-3 sm:px-4 py-1.5 rounded-full shadow-[0_0_15px_rgba(0,240,255,0.25)] hover:shadow-[0_0_20px_rgba(0,240,255,0.4)] active:scale-95"
                >
                  Sign Up
                </button>
              </div>
            )}
          </div>
        </nav>
      </header>

      {/* Mobile Floating Bottom Navigation Dock (Optimized for Phone Ratio) */}
      <nav
        aria-label="Mobile Bottom Navigation"
        className="md:hidden fixed bottom-3 inset-x-3 z-40 bg-[#0c0d14]/90 border border-white/15 rounded-2xl p-1.5 shadow-[0_10px_35px_rgba(0,0,0,0.85)] backdrop-blur-2xl flex items-center justify-around"
      >
        <button
          onClick={() => setCurrentTab('landing')}
          className={`flex-1 flex flex-col items-center justify-center py-1.5 px-2 rounded-xl transition-all cursor-pointer active:scale-95 ${
            currentTab === 'landing'
              ? 'text-[#00f0ff] font-bold bg-white/10'
              : 'text-white/60 hover:text-white'
          }`}
        >
          <Home className="w-4 h-4 mb-0.5" />
          <span className="text-[10px] tracking-tight">Overview</span>
        </button>

        <button
          onClick={() => setCurrentTab('browse')}
          className={`flex-1 flex flex-col items-center justify-center py-1.5 px-2 rounded-xl transition-all cursor-pointer active:scale-95 ${
            currentTab === 'browse'
              ? 'text-[#00f0ff] font-bold bg-white/10'
              : 'text-white/60 hover:text-white'
          }`}
        >
          <BookOpen className="w-4 h-4 mb-0.5" />
          <span className="text-[10px] tracking-tight">Library</span>
        </button>

        <button
          onClick={() => setCurrentTab('upload')}
          className={`flex-1 flex flex-col items-center justify-center py-1.5 px-2 rounded-xl transition-all cursor-pointer active:scale-95 ${
            currentTab === 'upload'
              ? 'text-[#00f0ff] font-bold bg-white/10'
              : 'text-white/60 hover:text-white'
          }`}
        >
          <PlusCircle className="w-4 h-4 mb-0.5" />
          <span className="text-[10px] tracking-tight">Upload</span>
        </button>

        <button
          onClick={() => onOpenAuthModal(user ? 'signin' : 'signup')}
          className={`flex-1 flex flex-col items-center justify-center py-1.5 px-2 rounded-xl transition-all cursor-pointer active:scale-95 ${
            user ? 'text-emerald-400 font-semibold' : 'text-white/60 hover:text-white'
          }`}
        >
          {user?.avatarUrl ? (
            <img
              src={user.avatarUrl}
              alt={user.name}
              className="w-4 h-4 rounded-full object-cover mb-0.5 border border-emerald-400 shrink-0"
            />
          ) : (
            <UserIcon className="w-4 h-4 mb-0.5" />
          )}
          <span className="text-[10px] truncate max-w-[60px] tracking-tight">
            {user ? 'Profile' : 'Account'}
          </span>
        </button>
      </nav>
    </>
  );
};
