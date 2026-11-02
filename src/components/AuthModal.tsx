import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';

export type AuthModalMode = 'signin' | 'signup';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialMode?: AuthModalMode;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  initialMode = 'signin',
}) => {
  const [mode, setMode] = useState<AuthModalMode>(initialMode);

  useEffect(() => {
    if (isOpen && (initialMode === 'signin' || initialMode === 'signup')) {
      setMode(initialMode);
    }
  }, [isOpen, initialMode]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200 font-outfit"
      onClick={onClose}
    >
      {/* Blank Black Login / Sign Up Window (Ready for future updates) */}
      <div
        className="relative w-full max-w-md min-h-[500px] bg-black border border-white/15 rounded-3xl shadow-[0_25px_80px_rgba(0,0,0,0.98)] overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label={mode === 'signin' ? 'Log In Window' : 'Sign Up Window'}
      >
        {/* Minimal Window Header with Login / Sign Up Switcher & Close Button */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/10 bg-black">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setMode('signin')}
              className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all cursor-pointer ${
                mode === 'signin'
                  ? 'bg-white text-black'
                  : 'text-white/50 hover:text-white'
              }`}
            >
              Log In
            </button>
            <button
              type="button"
              onClick={() => setMode('signup')}
              className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all cursor-pointer ${
                mode === 'signup'
                  ? 'bg-white text-black'
                  : 'text-white/50 hover:text-white'
              }`}
            >
              Sign Up
            </button>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close window"
            className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/15 border border-white/10 flex items-center justify-center text-white/60 hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Empty Black Window Canvas for Login & Sign Up */}
        <div className="flex-1 bg-black" />
      </div>
    </div>
  );
};
