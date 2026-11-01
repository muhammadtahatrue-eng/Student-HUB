import React, { useState, useRef, useEffect } from 'react';
import {
  GraduationCap,
  Home,
  BookOpen,
  PlusCircle,
  User as UserIcon,
  Settings,
  LogOut,
  Compass
} from 'lucide-react';
import { SupabaseConfig, StudentUser } from '../types/index.ts';

interface NavbarProps {
  currentTab: 'landing' | 'browse' | 'upload' | 'explore' | 'university';
  setCurrentTab: (tab: 'landing' | 'browse' | 'upload' | 'explore' | 'university') => void;
  supabaseConfig?: SupabaseConfig;
  onOpenSupabaseModal?: () => void;
  user: StudentUser | null;
  onOpenAuthModal: (mode?: 'signin' | 'signup' | 'settings' | 'profile') => void;
  onOpenCodeDrawer?: () => void;
  onSignOut?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentTab,
  setCurrentTab,
  user,
  onOpenAuthModal,
  onSignOut,
}) => {
  const [isHovered, setIsHovered] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const profileContainerRef = useRef<HTMLDivElement>(null);

  // Close floating account menu on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        profileContainerRef.current &&
        !profileContainerRef.current.contains(event.target as Node)
      ) {
        setIsMenuOpen(false);
      }
    };

    if (isMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isMenuOpen]);

  // Close menu on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isMenuOpen) {
        setIsMenuOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isMenuOpen]);

  const displayHandle = user?.username
    ? `@${user.username}`
    : user?.name || 'student';

  const isExpanded = isHovered || isMenuOpen;

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
                onClick={() => setCurrentTab('explore')}
                className={`hover:text-white transition-colors cursor-pointer ${
                  currentTab === 'explore' ? 'text-white font-semibold' : ''
                }`}
              >
                Explore
              </button>
              <button
                onClick={() => setCurrentTab('university')}
                className={`hover:text-white transition-colors cursor-pointer ${
                  currentTab === 'university' ? 'text-white font-semibold' : ''
                }`}
              >
                My University
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
              <div ref={profileContainerRef} className="relative">
                {/* Compact 3D Flip Profile Button */}
                <div
                  className="[perspective:1000px] cursor-pointer"
                  onMouseEnter={() => setIsHovered(true)}
                  onMouseLeave={() => setIsHovered(false)}
                  onClick={() => setIsMenuOpen((prev) => !prev)}
                  role="button"
                  tabIndex={0}
                  aria-haspopup="menu"
                  aria-expanded={isMenuOpen}
                  aria-label={`User profile for ${displayHandle}. Click to open account menu.`}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      setIsMenuOpen((prev) => !prev);
                    }
                  }}
                >
                  <div
                    className={`relative h-9 rounded-full transition-all duration-500 ease-[cubic-bezier(0.23,1,0.32,1)] [transform-style:preserve-3d] select-none ${
                      isExpanded
                        ? '[transform:rotateY(-180deg)] shadow-[0_0_18px_rgba(0,240,255,0.4)] border border-cyan-400/60 ring-1 ring-cyan-400/40'
                        : 'border border-white/20 hover:border-white/40 shadow-[0_2px_10px_rgba(0,0,0,0.5)]'
                    }`}
                    style={{
                      width: isExpanded
                        ? `${Math.max(105, Math.min(160, displayHandle.length * 8.5 + 32))}px`
                        : '36px',
                    }}
                  >
                    {/* Front Face: Compact Circular Avatar */}
                    <div className="absolute inset-0 rounded-full overflow-hidden [backface-visibility:hidden] flex items-center justify-center bg-black/60">
                      {user.avatarUrl ? (
                        <img
                          src={user.avatarUrl}
                          alt={user.name}
                          className="w-full h-full object-cover rounded-full"
                        />
                      ) : (
                        <div className="w-full h-full rounded-full bg-gradient-to-tr from-cyan-500/20 to-blue-500/20 text-cyan-300 font-bold flex items-center justify-center text-xs">
                          {user.name.charAt(0).toUpperCase()}
                        </div>
                      )}
                    </div>

                    {/* Back Face: Revealed Username (Rotated -180deg to read cleanly after vertical 3D flip) */}
                    <div className="absolute inset-0 rounded-full px-2.5 [transform:rotateY(-180deg)] [backface-visibility:hidden] flex items-center justify-center bg-[#0d1017] border border-cyan-400/50 text-cyan-300 text-xs font-mono font-medium truncate">
                      <span className="truncate max-w-[125px] tracking-tight">
                        {displayHandle}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Floating Account Menu (Settings & Logout) */}
                {isMenuOpen && (
                  <div
                    className="absolute right-0 top-full mt-2.5 w-44 rounded-2xl bg-[#0c0e14]/95 border border-white/10 shadow-[0_12px_40px_rgba(0,0,0,0.9)] backdrop-blur-2xl p-1.5 z-50 animate-in fade-in slide-in-from-top-2 duration-200"
                    role="menu"
                    aria-label="Account options"
                  >
                    {/* Option 1: Settings */}
                    <button
                      onClick={() => {
                        setIsMenuOpen(false);
                        onOpenAuthModal('settings');
                      }}
                      className="w-full flex items-center gap-2.5 px-3 py-2 text-xs text-white/80 hover:text-white hover:bg-white/10 rounded-xl transition-all cursor-pointer text-left group"
                      role="menuitem"
                    >
                      <Settings className="w-3.5 h-3.5 text-white/60 group-hover:text-cyan-400 transition-colors" />
                      <span className="font-medium">Settings</span>
                    </button>

                    {/* Option 2: Logout */}
                    <button
                      onClick={() => {
                        setIsMenuOpen(false);
                        if (onSignOut) {
                          onSignOut();
                        } else {
                          onOpenAuthModal('signin');
                        }
                      }}
                      className="w-full flex items-center gap-2.5 px-3 py-2 text-xs text-rose-300/85 hover:text-rose-200 hover:bg-rose-500/10 rounded-xl transition-all cursor-pointer text-left group"
                      role="menuitem"
                    >
                      <LogOut className="w-3.5 h-3.5 text-rose-400/80 group-hover:text-rose-400 transition-colors" />
                      <span className="font-medium">Logout</span>
                    </button>
                  </div>
                )}
              </div>
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
          onClick={() => setCurrentTab('explore')}
          className={`flex-1 flex flex-col items-center justify-center py-1.5 px-2 rounded-xl transition-all cursor-pointer active:scale-95 ${
            currentTab === 'explore'
              ? 'text-[#00f0ff] font-bold bg-white/10'
              : 'text-white/60 hover:text-white'
          }`}
        >
          <Compass className="w-4 h-4 mb-0.5" />
          <span className="text-[10px] tracking-tight">Explore</span>
        </button>

        <button
          onClick={() => setCurrentTab('university')}
          className={`flex-1 flex flex-col items-center justify-center py-1.5 px-2 rounded-xl transition-all cursor-pointer active:scale-95 ${
            currentTab === 'university'
              ? 'text-[#00f0ff] font-bold bg-white/10'
              : 'text-white/60 hover:text-white'
          }`}
        >
          <GraduationCap className="w-4 h-4 mb-0.5" />
          <span className="text-[10px] tracking-tight">Campus</span>
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
            user ? 'text-cyan-300 font-semibold' : 'text-white/60 hover:text-white'
          }`}
        >
          {user?.avatarUrl ? (
            <img
              src={user.avatarUrl}
              alt={user.name}
              className="w-4 h-4 rounded-full object-cover mb-0.5 border border-cyan-400 shrink-0"
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
