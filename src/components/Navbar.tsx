import React, { useState, useRef, useEffect } from 'react';
import {
  GraduationCap,
  Home,
  BookOpen,
  User as UserIcon,
  Settings,
  LogOut,
  Layers,
  Info
} from 'lucide-react';
import { SupabaseConfig, StudentUser } from '../types/index.ts';

interface NavbarProps {
  currentTab:
    | 'landing'
    | 'browse'
    | 'upload'
    | 'explore'
    | 'university'
    | 'program'
    | 'forum'
    | 'about'
    | 'products';
  setCurrentTab: (tab: any) => void;
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

  const handleNavigateSection = (section: 'overview' | 'products' | 'about') => {
    if (section === 'products') {
      setCurrentTab('products');
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
    if (section === 'about') {
      setCurrentTab('about');
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
    setCurrentTab('landing');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

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
              onClick={() => handleNavigateSection('overview')}
              className="flex items-center gap-2 sm:gap-2.5 cursor-pointer text-left focus:outline-none group shrink-0"
            >
              <div className="w-7 h-7 sm:w-8 sm:h-8 bg-white rounded-lg flex items-center justify-center transition-transform group-hover:scale-105 shrink-0">
                <GraduationCap className="w-4 h-4 text-black" />
              </div>
              <span className="text-base sm:text-xl font-bold tracking-tighter uppercase text-white group-hover:text-white/90">
                Xeusar
              </span>
            </button>

            {/* Desktop Navigation Links */}
            <div className="hidden md:flex items-center gap-6 text-sm font-medium text-white/70">
              <button
                onClick={() => handleNavigateSection('overview')}
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
                onClick={() => handleNavigateSection('products')}
                className={`hover:text-white transition-colors cursor-pointer ${
                  currentTab === 'products' ? 'text-white font-semibold' : ''
                }`}
              >
                Products
              </button>
              <button
                onClick={() => handleNavigateSection('about')}
                className={`hover:text-white transition-colors cursor-pointer ${
                  currentTab === 'about' ? 'text-white font-semibold' : ''
                }`}
              >
                About Us
              </button>
            </div>
          </div>

          {/* Right Side: Auth Actions (when logged out) or Synchronized Sliding Profile Pill (when logged in) */}
          <div className="flex items-center gap-2 sm:gap-2.5 shrink-0">
            {!user || user.isGuest ? (
              <>
                <button
                  type="button"
                  onClick={() => onOpenAuthModal('signin')}
                  className="text-xs font-medium text-white/75 hover:text-white px-2.5 sm:px-3.5 py-1.5 rounded-full hover:bg-white/5 transition-colors cursor-pointer"
                >
                  Log In
                </button>
                <button
                  type="button"
                  onClick={() => onOpenAuthModal('signup')}
                  className="bg-white text-black text-xs font-semibold px-3.5 sm:px-4 py-1.5 sm:py-2 rounded-full hover:bg-white/90 transition-all shadow-[0_0_20px_rgba(255,255,255,0.2)] cursor-pointer"
                >
                  Sign Up
                </button>
              </>
            ) : (
              <div
                ref={profileContainerRef}
                className="relative flex items-center justify-end"
                onMouseEnter={() => setIsHovered(true)}
                onMouseLeave={() => setIsHovered(false)}
              >
                {/* Synchronized Sliding Profile & Username Pill Button */}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsMenuOpen((prev) => !prev);
                  }}
                  aria-haspopup="menu"
                  aria-expanded={isMenuOpen}
                  aria-label={`User profile for ${displayHandle}. Click to open account options.`}
                  className={`group/profile relative h-9 rounded-full flex items-center overflow-hidden cursor-pointer select-none transition-all duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] ${
                    isExpanded
                      ? 'bg-[#0d1017]/95 border border-cyan-400/60 ring-1 ring-cyan-400/35 shadow-[0_0_20px_rgba(0,240,255,0.35)] pl-0.5 pr-3'
                      : 'bg-black/60 border border-white/20 hover:border-white/40 shadow-[0_2px_10px_rgba(0,0,0,0.5)] p-0.5'
                  }`}
                >
                  {/* User Profile Avatar: stays visible and slides left in sync as the pill expands */}
                  <div
                    className={`w-8 h-8 rounded-full overflow-hidden shrink-0 flex items-center justify-center transition-transform duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] ${
                      isExpanded ? 'ring-1 ring-cyan-400/50 scale-95' : 'scale-100'
                    }`}
                  >
                    {user?.avatarUrl ? (
                      <img
                        src={user.avatarUrl}
                        alt={user.name || 'Student'}
                        className="w-full h-full object-cover rounded-full"
                      />
                    ) : (
                      <div className="w-full h-full rounded-full bg-gradient-to-tr from-cyan-500/25 to-blue-500/25 text-cyan-300 font-bold flex items-center justify-center text-xs">
                        {(user?.name || 'S').charAt(0).toUpperCase()}
                      </div>
                    )}
                  </div>

                  {/* Sliding Username Container: expands in sync with the avatar sliding left */}
                  <div
                    className={`grid transition-all duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] ${
                      isExpanded
                        ? 'grid-cols-[1fr] opacity-100 ml-2'
                        : 'grid-cols-[0fr] opacity-0 ml-0'
                    }`}
                  >
                    <div className="overflow-hidden flex items-center">
                      <span className="text-cyan-300 text-xs font-mono font-medium whitespace-nowrap tracking-tight max-w-[140px] truncate">
                        {displayHandle}
                      </span>
                    </div>
                  </div>
                </button>

                {/* Floating Option Window (My Profile, Settings & Logout) */}
                {isMenuOpen && (
                  <div
                    className="absolute right-0 top-full mt-2.5 w-48 rounded-2xl bg-[#0c0e14]/95 border border-white/15 shadow-[0_12px_40px_rgba(0,0,0,0.9)] backdrop-blur-2xl p-1.5 z-50 animate-in fade-in slide-in-from-top-2 duration-200"
                    role="menu"
                    aria-label="Account options"
                  >
                    {/* User Identity Header inside Option Window */}
                    <div className="px-3 py-2 border-b border-white/10 mb-1 flex items-center gap-2.5">
                      <div className="w-6 h-6 rounded-full overflow-hidden shrink-0 border border-cyan-400/40 flex items-center justify-center bg-cyan-500/10">
                        {user?.avatarUrl ? (
                          <img
                            src={user.avatarUrl}
                            alt={user.name || 'Student'}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <span className="text-[10px] font-bold text-cyan-300">
                            {(user?.name || 'S').charAt(0).toUpperCase()}
                          </span>
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-[11px] font-semibold text-white truncate">
                          {user?.name || 'Student'}
                        </p>
                        <p className="text-[10px] font-mono text-cyan-300/80 truncate">
                          {displayHandle}
                        </p>
                      </div>
                    </div>

                    {/* Option 1: My Profile */}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setIsMenuOpen(false);
                        setIsHovered(false);
                        onOpenAuthModal('profile');
                      }}
                      className="w-full flex items-center gap-2.5 px-3 py-2 text-xs text-white/85 hover:text-white hover:bg-white/10 rounded-xl transition-all cursor-pointer text-left group"
                      role="menuitem"
                    >
                      <UserIcon className="w-3.5 h-3.5 text-white/60 group-hover:text-cyan-400 transition-colors shrink-0" />
                      <span className="font-medium">My Profile</span>
                    </button>

                    {/* Option 2: Settings */}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setIsMenuOpen(false);
                        setIsHovered(false);
                        onOpenAuthModal('settings');
                      }}
                      className="w-full flex items-center gap-2.5 px-3 py-2 text-xs text-white/85 hover:text-white hover:bg-white/10 rounded-xl transition-all cursor-pointer text-left group"
                      role="menuitem"
                    >
                      <Settings className="w-3.5 h-3.5 text-white/60 group-hover:text-cyan-400 transition-colors shrink-0" />
                      <span className="font-medium">Settings</span>
                    </button>

                    {/* Option 3: Logout */}
                    {onSignOut && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setIsMenuOpen(false);
                          setIsHovered(false);
                          onSignOut();
                        }}
                        className="w-full flex items-center gap-2.5 px-3 py-2 text-xs text-rose-300/85 hover:text-rose-200 hover:bg-rose-500/10 rounded-xl transition-all cursor-pointer text-left group"
                        role="menuitem"
                      >
                        <LogOut className="w-3.5 h-3.5 text-rose-400/80 group-hover:text-rose-400 transition-colors shrink-0" />
                        <span className="font-medium">Logout</span>
                      </button>
                    )}
                  </div>
                )}
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
          onClick={() => handleNavigateSection('overview')}
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
          onClick={() => handleNavigateSection('products')}
          className={`flex-1 flex flex-col items-center justify-center py-1.5 px-2 rounded-xl transition-all cursor-pointer active:scale-95 ${
            currentTab === 'products'
              ? 'text-[#00f0ff] font-bold bg-white/10'
              : 'text-white/60 hover:text-white'
          }`}
        >
          <Layers className="w-4 h-4 mb-0.5" />
          <span className="text-[10px] tracking-tight">Products</span>
        </button>

        <button
          onClick={() => handleNavigateSection('about')}
          className={`flex-1 flex flex-col items-center justify-center py-1.5 px-2 rounded-xl transition-all cursor-pointer active:scale-95 ${
            currentTab === 'about'
              ? 'text-[#00f0ff] font-bold bg-white/10'
              : 'text-white/60 hover:text-white'
          }`}
        >
          <Info className="w-4 h-4 mb-0.5" />
          <span className="text-[10px] tracking-tight">About Us</span>
        </button>

        <button
          onClick={() => onOpenAuthModal('settings')}
          className="flex-1 flex flex-col items-center justify-center py-1.5 px-2 rounded-xl transition-all cursor-pointer active:scale-95 text-cyan-300 font-semibold"
        >
          {user?.avatarUrl ? (
            <img
              src={user.avatarUrl}
              alt={user.name || 'Student'}
              className="w-4 h-4 rounded-full object-cover mb-0.5 border border-cyan-400 shrink-0"
            />
          ) : (
            <Settings className="w-4 h-4 mb-0.5" />
          )}
          <span className="text-[10px] truncate max-w-[60px] tracking-tight">
            Settings
          </span>
        </button>
      </nav>
    </>
  );
};
