import React from 'react';
import { GraduationCap } from 'lucide-react';
import {
  InfoCenterSectionId,
  XEUSAR_CONTACT_EMAIL,
  GENERAL_CONTACT_MAILTO
} from '../data/legalAndInfoData.ts';

interface FooterProps {
  onOpenLibrary: () => void;
  onOpenUpload: () => void;
  onOpenCodeDrawer: () => void;
  onOpenSupabaseModal: () => void;
  onOpenInfoCenter?: (section?: InfoCenterSectionId) => void;
  onOpenPrivacyPolicy?: () => void;
}

export const Footer: React.FC<FooterProps> = ({
  onOpenLibrary,
  onOpenUpload,
  onOpenInfoCenter,
  onOpenPrivacyPolicy,
}) => {
  return (
    <footer className="py-10 sm:py-12 px-4 sm:px-6 pb-24 md:pb-12 border-t border-white/10 bg-black font-outfit text-white relative z-10">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="flex flex-col sm:flex-row items-center gap-2 text-center sm:text-left">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-white rounded flex items-center justify-center">
              <GraduationCap className="w-3.5 h-3.5 text-black" />
            </div>
            <span className="font-black tracking-tighter uppercase text-sm text-white">
              Xeusar
            </span>
          </div>
          <span className="text-white/40 text-xs sm:ml-2">
            Academic Learning &amp; Collaboration Platform
          </span>
        </div>

        <div className="flex flex-wrap items-center justify-center gap-5 sm:gap-6 text-xs text-white/60">
          <button
            type="button"
            onClick={onOpenLibrary}
            className="hover:text-white transition-colors cursor-pointer"
          >
            Study Library
          </button>
          <button
            type="button"
            onClick={onOpenUpload}
            className="hover:text-white transition-colors cursor-pointer"
          >
            Share Notes
          </button>
          {onOpenInfoCenter && (
            <>
              <button
                type="button"
                onClick={() => onOpenInfoCenter('about')}
                className="hover:text-white transition-colors cursor-pointer"
              >
                About Us
              </button>
              <button
                type="button"
                onClick={() => onOpenInfoCenter('faq')}
                className="hover:text-white transition-colors cursor-pointer"
              >
                FAQs
              </button>
              <button
                type="button"
                onClick={() => onOpenInfoCenter('terms')}
                className="hover:text-white transition-colors cursor-pointer"
              >
                Terms &amp; Conditions
              </button>
              <button
                type="button"
                onClick={() => onOpenInfoCenter('copyright')}
                className="hover:text-white transition-colors cursor-pointer"
              >
                Copyright Policy
              </button>
            </>
          )}
          {onOpenPrivacyPolicy && (
            <button
              type="button"
              onClick={onOpenPrivacyPolicy}
              className="hover:text-white transition-colors cursor-pointer"
            >
              Privacy Policy
            </button>
          )}
          <a
            href={GENERAL_CONTACT_MAILTO}
            className="text-cyan-300/85 hover:text-cyan-200 font-jetbrains transition-colors"
          >
            {XEUSAR_CONTACT_EMAIL}
          </a>
        </div>
      </div>
    </footer>
  );
};
