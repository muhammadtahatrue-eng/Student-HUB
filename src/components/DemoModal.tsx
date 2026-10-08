import React, { useState } from 'react';
import {
  X,
  Play,
  FileText,
  Search,
  Upload,
  Database,
  ArrowRight,
  CheckCircle2,
  Sparkles
} from 'lucide-react';

interface DemoModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLaunchLibrary: () => void;
  onLaunchUpload: () => void;
}

export const DemoModal: React.FC<DemoModalProps> = ({
  isOpen,
  onClose,
  onLaunchLibrary,
  onLaunchUpload,
}) => {
  const [activeStep, setActiveStep] = useState(0);

  if (!isOpen) return null;

  const steps = [
    {
      title: '1. Discover Peer Study Materials',
      desc: 'Instant debounced search across course codes, professors, and topic keywords with faceted filters for lecture notes, exam papers, cheat sheets, and summaries.',
      highlight: 'No paywalls or subscription barriers.'
    },
    {
      title: '2. High-Fidelity Document Reader',
      desc: 'Preview PDF pages directly inside the browser with zoom controls, page-by-page inspection, formula highlights, and instant downloads.',
      highlight: 'Zero latency in-browser document preview.'
    },
    {
      title: '3. Seamless PDF Upload to Supabase',
      desc: 'Drag and drop PDF notes into the upload page. Files stream directly to the Supabase `study-materials` bucket with automatic metadata indexing.',
      highlight: 'Real-time synchronization across devices.'
    },
    {
      title: '4. Next.js 15 & SQL Schema Export',
      desc: 'Complete production-grade code export ready for deployment on Vercel with PostgreSQL Row Level Security (RLS) rules included.',
      highlight: 'One-click copy and deployment.'
    }
  ];

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-150 font-outfit"
    >
      <div className="glass-card bg-[#0a0a0a]/90 border border-white/20 w-full max-w-2xl rounded-3xl overflow-hidden shadow-2xl flex flex-col text-white">
        {/* Header */}
        <header className="px-6 py-4 border-b border-white/10 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center text-white">
              <Play className="w-4 h-4 fill-white" />
            </div>
            <div>
              <h3 className="font-bold text-base tracking-tight">
                StudyHub Platform Demo
              </h3>
              <p className="text-xs text-white/50">
                Interactive walkthrough of core student capabilities
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-white/50 hover:text-white rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </header>

        {/* Content */}
        <div className="p-6 sm:p-8 space-y-6">
          {/* Step indicators */}
          <div className="grid grid-cols-4 gap-2">
            {steps.map((s, idx) => (
              <button
                key={idx}
                onClick={() => setActiveStep(idx)}
                className={`h-1.5 rounded-full transition-all cursor-pointer ${
                  activeStep === idx
                    ? 'bg-white shadow-[0_0_10px_rgba(255,255,255,0.8)]'
                    : 'bg-white/20 hover:bg-white/40'
                }`}
              />
            ))}
          </div>

          {/* Step Detail Card */}
          <div className="p-6 rounded-2xl bg-white/5 border border-white/10 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs uppercase tracking-widest text-white/40 font-jetbrains">
                Feature Spotlight
              </span>
              <span className="text-xs text-white/60 font-mono">
                {activeStep + 1} / {steps.length}
              </span>
            </div>

            <h4 className="text-xl font-bold text-white">
              {steps[activeStep].title}
            </h4>

            <p className="text-sm text-white/70 leading-relaxed">
              {steps[activeStep].desc}
            </p>

            <div className="pt-2 flex items-center gap-2 text-xs text-emerald-400 font-medium">
              <CheckCircle2 className="w-4 h-4" />
              <span>{steps[activeStep].highlight}</span>
            </div>
          </div>

          {/* Quick jump actions */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <button
                onClick={() => setActiveStep(prev => Math.max(0, prev - 1))}
                disabled={activeStep === 0}
                className="px-4 py-2 text-xs font-semibold text-white/60 hover:text-white disabled:opacity-30 rounded-lg transition-colors cursor-pointer"
              >
                Previous
              </button>
              <button
                onClick={() => setActiveStep(prev => Math.min(steps.length - 1, prev + 1))}
                disabled={activeStep === steps.length - 1}
                className="px-4 py-2 text-xs font-semibold text-white bg-white/10 hover:bg-white/20 disabled:opacity-30 rounded-lg transition-colors cursor-pointer"
              >
                Next Feature
              </button>
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <button
                onClick={() => {
                  onClose();
                  onLaunchLibrary();
                }}
                className="w-full sm:w-auto px-5 py-2 text-xs font-bold text-black bg-white hover:bg-white/90 rounded-full transition-all cursor-pointer shadow-md"
              >
                Launch Study Library
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
