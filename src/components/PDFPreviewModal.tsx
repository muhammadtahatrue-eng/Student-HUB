import React, { useState, useEffect } from 'react';
import {
  X,
  Download,
  ThumbsUp,
  ZoomIn,
  ZoomOut,
  ChevronLeft,
  ChevronRight,
  FileText,
  Bookmark,
  Share2,
  Check,
  Eye
} from 'lucide-react';
import { StudyNote } from '../types/index.ts';

interface PDFPreviewModalProps {
  note: StudyNote | null;
  onClose: () => void;
  onDownload: (note: StudyNote) => void;
  onUpvote: (noteId: string) => void;
}

export const PDFPreviewModal: React.FC<PDFPreviewModalProps> = ({
  note,
  onClose,
  onDownload,
  onUpvote,
}) => {
  const [currentPage, setCurrentPage] = useState(1);
  const [zoomLevel, setZoomLevel] = useState(100);
  const [copiedLink, setCopiedLink] = useState(false);

  useEffect(() => {
    setCurrentPage(1);
    setZoomLevel(100);
  }, [note?.id]);

  // Handle ESC key to close
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  if (!note) return null;

  const totalPages = note.pages?.length || 1;
  const activePageData = note.pages?.[currentPage - 1] || {
    pageNumber: currentPage,
    sectionTitle: note.title,
    content: note.description,
    keyFormulasOrPoints: note.tags
  };

  const handleZoom = (delta: number) => {
    setZoomLevel(prev => Math.min(150, Math.max(70, prev + delta)));
  };

  const handleShare = () => {
    navigator.clipboard?.writeText(window.location.href);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const formattedSize =
    note.fileSizeBytes > 1024 * 1024
      ? `${(note.fileSizeBytes / (1024 * 1024)).toFixed(1)} MB`
      : `${Math.round(note.fileSizeBytes / 1024)} KB`;

  return (
    <div
      role="dialog"
      aria-modal="true"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-150"
    >
      <div className="bg-[#0c0e14] rounded-2xl shadow-[0_0_50px_rgba(0,0,0,0.9)] border border-white/10 w-full max-w-5xl h-[95vh] sm:h-[92vh] flex flex-col overflow-hidden text-white font-outfit">
        {/* Top Header Bar (Responsive for Phone & PC) */}
        <header className="px-3 sm:px-5 py-2.5 sm:py-3.5 border-b border-white/10 flex items-center justify-between bg-white/[0.02] shrink-0 gap-2">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            <div className="p-2 bg-cyan-400/10 text-cyan-300 border border-cyan-400/20 rounded-xl shrink-0">
              <FileText className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 sm:gap-2 text-[10px] sm:text-xs text-white/50 truncate font-jetbrains">
                <span className="font-bold text-cyan-300">{note.courseCode}</span>
                <span aria-hidden="true">·</span>
                <span className="truncate">{note.subject}</span>
                <span aria-hidden="true" className="hidden xs:inline">·</span>
                <span className="tabular-nums hidden xs:inline">{note.academicYear}</span>
              </div>
              <h2 className="text-xs sm:text-base font-bold text-white truncate max-w-[180px] xs:max-w-xs sm:max-w-md">
                {note.title}
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-1 sm:gap-2 shrink-0">
            {/* Share */}
            <button
              onClick={handleShare}
              className="p-1.5 sm:p-2 text-white/60 hover:text-white hover:bg-white/10 rounded-xl transition-colors cursor-pointer"
              title="Copy link"
            >
              {copiedLink ? <Check className="w-4 h-4 text-emerald-400" /> : <Share2 className="w-4 h-4" />}
            </button>

            {/* Upvote */}
            <button
              onClick={() => onUpvote(note.id)}
              className={`flex items-center gap-1 sm:gap-1.5 px-2.5 sm:px-3 py-1.5 text-xs font-medium rounded-xl border transition-colors cursor-pointer ${
                note.hasUpvoted
                  ? 'border-cyan-400 bg-cyan-400/10 text-cyan-300 font-bold'
                  : 'border-white/10 bg-white/5 text-white/70 hover:text-white hover:bg-white/10'
              }`}
            >
              <ThumbsUp className={`w-3.5 h-3.5 ${note.hasUpvoted ? 'fill-cyan-400 text-cyan-400' : ''}`} />
              <span className="tabular-nums">{note.upvotesCount}</span>
            </button>

            {/* Download CTA */}
            <button
              onClick={() => onDownload(note)}
              className="flex items-center gap-1.5 px-3 sm:px-3.5 py-1.5 text-xs font-bold text-black bg-[#00f0ff] hover:bg-[#00f0ff]/90 rounded-xl transition-all cursor-pointer shadow-[0_0_15px_rgba(0,240,255,0.25)] active:scale-95"
            >
              <Download className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Download ({formattedSize})</span>
              <span className="sm:hidden font-mono">PDF</span>
            </button>

            {/* Close */}
            <button
              onClick={onClose}
              className="p-1.5 sm:p-2 text-white/50 hover:text-white hover:bg-white/10 rounded-xl transition-colors cursor-pointer ml-0.5"
              aria-label="Close document viewer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </header>

        {/* Reader Toolbar: Zoom, Page Flip */}
        <div className="px-3 sm:px-5 py-2 bg-[#12141c]/90 border-b border-white/10 flex flex-col sm:flex-row items-stretch sm:items-center justify-between text-xs text-white/60 gap-2 shrink-0">
          <div className="flex items-center gap-2 truncate text-[11px] sm:text-xs">
            <span className="font-semibold text-white/80">Document:</span>
            <span className="truncate text-white/70">{note.fileName}</span>
            <span aria-hidden="true" className="text-white/20 hidden sm:inline">·</span>
            <span className="hidden sm:inline truncate">{note.uploaderName}</span>
          </div>

          <div className="flex items-center justify-between sm:justify-end gap-3 sm:gap-4 shrink-0">
            {/* Zoom Controls */}
            <div className="flex items-center gap-1 bg-white/5 border border-white/10 rounded-xl p-0.5">
              <button
                onClick={() => handleZoom(-10)}
                disabled={zoomLevel <= 70}
                className="p-1 text-white/60 hover:text-white disabled:opacity-30 cursor-pointer"
                title="Zoom Out"
              >
                <ZoomOut className="w-3.5 h-3.5" />
              </button>
              <span className="px-1.5 text-[11px] font-mono tabular-nums text-white/80">
                {zoomLevel}%
              </span>
              <button
                onClick={() => handleZoom(10)}
                disabled={zoomLevel >= 150}
                className="p-1 text-white/60 hover:text-white disabled:opacity-30 cursor-pointer"
                title="Zoom In"
              >
                <ZoomIn className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Page Flipping Navigation */}
            <div className="flex items-center gap-1 bg-white/5 border border-white/10 rounded-xl p-0.5">
              <button
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage <= 1}
                className="p-1 text-white/60 hover:text-white disabled:opacity-30 cursor-pointer"
                title="Previous Page"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="px-2 text-xs font-medium tabular-nums text-white/90">
                {currentPage} / {totalPages}
              </span>
              <button
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage >= totalPages}
                className="p-1 text-white/60 hover:text-white disabled:opacity-30 cursor-pointer"
                title="Next Page"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Document Body & Page Viewer Canvas */}
        <div className="flex-1 overflow-auto bg-[#07080c] p-2 sm:p-8 flex justify-center">
          <div
            style={{ transform: `scale(${zoomLevel / 100})`, transformOrigin: 'top center' }}
            className="transition-transform duration-100 ease-out w-full max-w-3xl"
          >
            {/* High-Fidelity Academic Document Sheet */}
            <div className="bg-[#11131a] rounded-xl shadow-2xl border border-white/10 p-5 sm:p-12 min-h-[560px] sm:min-h-[820px] text-white flex flex-col justify-between">
              <div>
                {/* Academic Page Header Rule */}
                <div className="flex items-center justify-between pb-3 border-b border-white/15 mb-6 sm:mb-8 text-[11px] sm:text-xs font-mono uppercase tracking-wider text-white/50">
                  <span className="truncate">{note.courseCode} — {note.courseName}</span>
                  <span className="truncate">{note.professor}</span>
                </div>

                {/* Section Title */}
                <div className="mb-5 sm:mb-6">
                  <div className="text-[11px] font-semibold uppercase tracking-wider text-cyan-300 font-jetbrains mb-1">
                    Study Section {currentPage}
                  </div>
                  <h3 className="text-lg sm:text-2xl font-bold text-white tracking-tight">
                    {activePageData.sectionTitle}
                  </h3>
                </div>

                {/* Page Content Body */}
                <div className="text-xs sm:text-sm leading-relaxed mb-6 sm:mb-8 whitespace-pre-line text-white/80 font-sans">
                  {activePageData.content}
                </div>

                {/* Key Formulas / Takeaway Box */}
                {activePageData.keyFormulasOrPoints && activePageData.keyFormulasOrPoints.length > 0 && (
                  <div className="bg-white/[0.03] border-l-4 border-cyan-400 p-3.5 sm:p-4 rounded-r-xl my-4 sm:my-6 border border-white/5">
                    <h4 className="text-[11px] sm:text-xs font-bold uppercase tracking-wider text-cyan-300 mb-2 flex items-center gap-1.5 font-jetbrains">
                      <Bookmark className="w-3.5 h-3.5 text-cyan-400" />
                      Key Formulas & Derivation Points
                    </h4>
                    <ul className="space-y-1.5 text-xs text-white/70">
                      {activePageData.keyFormulasOrPoints.map((pt, idx) => (
                        <li key={idx} className="flex items-start gap-2">
                          <span className="text-cyan-400 font-bold">›</span>
                          <span>{pt}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>

              {/* Page Footer */}
              <div className="pt-4 sm:pt-6 border-t border-white/10 flex items-center justify-between text-[10px] sm:text-[11px] font-mono text-white/40">
                <span>StudyVault Verified Document · {note.uploaderUniversity}</span>
                <span>Page {currentPage} of {totalPages}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
