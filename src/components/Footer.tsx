import React from 'react';
import { GraduationCap } from 'lucide-react';

interface FooterProps {
  onOpenLibrary: () => void;
  onOpenUpload: () => void;
  onOpenCodeDrawer: () => void;
  onOpenSupabaseModal: () => void;
}

export const Footer: React.FC<FooterProps> = ({
  onOpenLibrary,
  onOpenUpload,
  onOpenCodeDrawer,
  onOpenSupabaseModal,
}) => {
  return (
    <footer className="py-10 sm:py-12 px-4 sm:px-6 pb-24 md:pb-12 border-t border-white/10 bg-black font-outfit text-white relative z-10">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 bg-white rounded flex items-center justify-center">
            <GraduationCap className="w-3.5 h-3.5 text-black" />
          </div>
          <span className="font-black tracking-tighter uppercase text-sm text-white">
            StudyVault
          </span>
          <span className="text-white/40 text-xs ml-2">
            Student Study-Material Sharing Platform
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-6 text-xs text-white/60">
          <button
            onClick={onOpenLibrary}
            className="hover:text-white transition-colors cursor-pointer"
          >
            Study Library
          </button>
          <button
            onClick={onOpenUpload}
            className="hover:text-white transition-colors cursor-pointer"
          >
            Share Notes
          </button>
          <button
            onClick={onOpenCodeDrawer}
            className="hover:text-white transition-colors cursor-pointer"
          >
            Export Next.js Code
          </button>
          <button
            onClick={onOpenSupabaseModal}
            className="hover:text-white transition-colors cursor-pointer"
          >
            Supabase Connection
          </button>
        </div>
      </div>
    </footer>
  );
};
