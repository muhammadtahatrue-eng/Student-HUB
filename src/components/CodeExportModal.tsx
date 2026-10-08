import React, { useState } from 'react';
import {
  FileCode,
  Copy,
  Check,
  X,
  Download,
  Terminal,
  Database,
  Layers,
  Sparkles
} from 'lucide-react';
import { NEXTJS_EXPORT_FILES, ExportFile } from '../lib/exportTemplates.ts';

interface CodeExportModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const CodeExportModal: React.FC<CodeExportModalProps> = ({
  isOpen,
  onClose,
}) => {
  const [selectedFileIndex, setSelectedFileIndex] = useState(0);
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const currentFile = NEXTJS_EXPORT_FILES[selectedFileIndex] || NEXTJS_EXPORT_FILES[0];

  const handleCopy = () => {
    navigator.clipboard?.writeText(currentFile.code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadFile = () => {
    const blob = new Blob([currentFile.code], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = currentFile.path.split('/').pop() || 'code.txt';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-stone-950/70 backdrop-blur-xs animate-in fade-in duration-150"
    >
      <div className="bg-white rounded-xl shadow-2xl border border-stone-200 w-full max-w-5xl h-[90vh] flex flex-col overflow-hidden">
        {/* Header */}
        <header className="px-6 py-4 border-b border-stone-200 flex items-center justify-between bg-stone-50 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-900/10 text-indigo-950 rounded-lg">
              <FileCode className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-stone-900 flex items-center gap-2">
                Next.js 15 + Supabase Code Export
                <span className="text-[11px] font-medium text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-full">
                  Production Ready
                </span>
              </h2>
              <p className="text-xs text-stone-500">
                Complete, file-by-file source code with SQL schemas, RLS rules, and storage setup.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleCopy}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-stone-800 bg-white border border-stone-300 hover:bg-stone-100 rounded-lg transition-colors cursor-pointer"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'Copied to Clipboard' : 'Copy File'}</span>
            </button>
            <button
              onClick={handleDownloadFile}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-indigo-950 hover:bg-indigo-900 rounded-lg transition-colors cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-stone-400 hover:text-stone-700 rounded-lg transition-colors ml-2 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </header>

        {/* Body Split: Sidebar File List + Code Viewer */}
        <div className="flex-1 flex flex-col md:flex-row min-h-0 overflow-hidden">
          {/* File Selector Sidebar */}
          <aside className="w-full md:w-64 border-r border-stone-200 bg-stone-50/70 p-3 overflow-y-auto shrink-0 space-y-1">
            <div className="px-2 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-stone-400">
              Project Files
            </div>
            {NEXTJS_EXPORT_FILES.map((file, idx) => {
              const isSelected = selectedFileIndex === idx;
              const isSql = file.path.endsWith('.sql');
              return (
                <button
                  key={file.path}
                  onClick={() => setSelectedFileIndex(idx)}
                  className={`w-full text-left px-3 py-2 rounded-lg text-xs font-mono transition-colors flex items-center justify-between cursor-pointer ${
                    isSelected
                      ? 'bg-indigo-950 text-white font-semibold'
                      : 'text-stone-700 hover:bg-stone-200/60'
                  }`}
                >
                  <span className="truncate">{file.path}</span>
                  {isSql && (
                    <Database className={`w-3.5 h-3.5 shrink-0 ml-1.5 ${isSelected ? 'text-indigo-200' : 'text-stone-400'}`} />
                  )}
                </button>
              );
            })}

            <div className="pt-4 px-2">
              <div className="p-3 bg-stone-100 rounded-lg text-[11px] text-stone-600 space-y-1">
                <span className="font-semibold text-stone-800 block">How to use this code:</span>
                <p>1. Copy <code className="font-mono text-stone-800">supabase/schema.sql</code> into your Supabase SQL Editor.</p>
                <p>2. Create a Next.js app with Tailwind.</p>
                <p>3. Drop these files in place and set your <code className="font-mono text-stone-800">.env.local</code>.</p>
              </div>
            </div>
          </aside>

          {/* Code Viewer Main Pane */}
          <main className="flex-1 flex flex-col min-w-0 bg-stone-900 overflow-hidden text-stone-100">
            {/* File Path & Info Bar */}
            <div className="px-5 py-2.5 bg-stone-950/80 border-b border-stone-800 flex items-center justify-between text-xs font-mono shrink-0">
              <span className="text-indigo-300 font-semibold">{currentFile.path}</span>
              <span className="text-stone-400 text-[11px] font-sans">{currentFile.description}</span>
            </div>

            {/* Code Content */}
            <div className="flex-1 overflow-auto p-4 sm:p-5 font-mono text-xs leading-relaxed selection:bg-indigo-700 selection:text-white">
              <pre className="text-stone-200 whitespace-pre">
                <code>{currentFile.code}</code>
              </pre>
            </div>
          </main>
        </div>

        {/* Footer */}
        <footer className="px-6 py-3 border-t border-stone-200 bg-stone-50 flex items-center justify-between text-xs text-stone-500 shrink-0">
          <div className="flex items-center gap-2">
            <span className="font-medium text-stone-700">StudyVault Next.js Exporter</span>
            <span>·</span>
            <span>Next.js 15 App Router · Supabase PostgreSQL & Storage · Tailwind CSS</span>
          </div>

          <button
            onClick={onClose}
            className="px-3 py-1.5 text-xs font-medium text-stone-600 hover:text-stone-900 rounded-lg transition-colors cursor-pointer"
          >
            Close Viewer
          </button>
        </footer>
      </div>
    </div>
  );
};
