import React, { useState, useEffect, useRef, useMemo } from 'react';
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
  Search,
  Printer,
  PanelLeft,
  RotateCcw,
  Maximize2,
  Minimize2,
  BookOpen,
  Layers
} from 'lucide-react';
import { StudyNote } from '../types/index.ts';
import {
  pdfjsLib,
  resolveViewablePdfForNote,
  getNormalizedNotePages
} from '../lib/pdfViewerService.ts';
import { getNoteCourseCategory, getNoteCourseDisplay } from '../lib/resourceService.ts';

interface PDFPreviewModalProps {
  note: StudyNote | null;
  onClose: () => void;
  onDownload: (note: StudyNote) => void;
  onUpvote: (noteId: string) => void;
}

/**
 * Renders a single PDF.js page onto an HTML5 <canvas> at crisp HiDPI resolution.
 */
const PdfPageCanvas: React.FC<{
  pdfDoc: any;
  pageNumber: number;
  scale: number;
  className?: string;
}> = ({ pdfDoc, pageNumber, scale, className }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    let cancelled = false;
    let renderTask: any = null;

    const renderPage = async () => {
      if (!pdfDoc || !canvasRef.current) return;
      try {
        const page = await pdfDoc.getPage(pageNumber);
        if (cancelled || !canvasRef.current) return;

        const dpr = Math.min(window.devicePixelRatio || 1, 2);
        const viewport = page.getViewport({ scale });
        const outputScale = dpr;

        const canvas = canvasRef.current;
        const context = canvas.getContext('2d');
        if (!context) return;

        canvas.width = Math.floor(viewport.width * outputScale);
        canvas.height = Math.floor(viewport.height * outputScale);
        canvas.style.width = `${Math.floor(viewport.width)}px`;
        canvas.style.height = `${Math.floor(viewport.height)}px`;

        const transform =
          outputScale !== 1 ? [outputScale, 0, 0, outputScale, 0, 0] : undefined;

        renderTask = page.render({
          canvasContext: context,
          transform,
          viewport
        });

        await renderTask.promise;
      } catch {
        // Ignore cancelled render tasks during rapid zoom/page switch
      }
    };

    renderPage();

    return () => {
      cancelled = true;
      if (renderTask && typeof renderTask.cancel === 'function') {
        try {
          renderTask.cancel();
        } catch {}
      }
    };
  }, [pdfDoc, pageNumber, scale]);

  return (
    <canvas
      ref={canvasRef}
      className={
        className ||
        'rounded-lg shadow-[0_18px_50px_rgba(0,0,0,0.85)] border border-white/15 bg-white mx-auto block'
      }
    />
  );
};

export const PDFPreviewModal: React.FC<PDFPreviewModalProps> = ({
  note,
  onClose,
  onDownload,
  onUpvote
}) => {
  const [currentPage, setCurrentPage] = useState(1);
  const [zoomLevel, setZoomLevel] = useState(110);
  const [copiedLink, setCopiedLink] = useState(false);
  const [showSidebar, setShowSidebar] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [displayMode, setDisplayMode] = useState<'pdf-scroll' | 'pdf-single' | 'reader'>('pdf-scroll');
  const [searchQuery, setSearchQuery] = useState('');

  const [pdfResource, setPdfResource] = useState<{
    blobUrl: string;
    blob: Blob;
    mimeType: string;
    isUploadedFile: boolean;
  } | null>(null);
  const [pdfDoc, setPdfDoc] = useState<any | null>(null);
  const [pdfPageCount, setPdfPageCount] = useState<number>(1);
  const [isLoadingPdf, setIsLoadingPdf] = useState(false);

  const pageScrollRefs = useRef<Record<number, HTMLDivElement | null>>({});

  // Resolve and load the actual PDF binary with PDF.js whenever `note` changes
  useEffect(() => {
    let active = true;
    let currentUrl = '';
    let loadedDoc: any = null;

    if (!note) {
      setPdfResource(null);
      setPdfDoc(null);
      return;
    }

    setCurrentPage(1);
    setZoomLevel(110);
    setSearchQuery('');
    setDisplayMode('pdf-scroll');
    setIsLoadingPdf(true);

    resolveViewablePdfForNote(note)
      .then(async res => {
        if (!active) {
          URL.revokeObjectURL(res.blobUrl);
          return;
        }
        currentUrl = res.blobUrl;
        setPdfResource(res);

        if (!res.mimeType.startsWith('image/')) {
          try {
            const buffer = await res.blob.arrayBuffer();
            const loadingTask = pdfjsLib.getDocument({
              data: new Uint8Array(buffer)
            });
            const doc = await loadingTask.promise;
            if (!active) {
              if (typeof (doc as any).destroy === 'function') {
                await (doc as any).destroy();
              }
              return;
            }
            loadedDoc = doc;
            setPdfDoc(doc);
            setPdfPageCount(Math.max(1, doc.numPages));
          } catch {
            if (active) {
              setPdfDoc(null);
              setPdfPageCount(Math.max(1, getNormalizedNotePages(note).length));
            }
          }
        } else {
          setPdfDoc(null);
          setPdfPageCount(1);
        }
      })
      .finally(() => {
        if (active) setIsLoadingPdf(false);
      });

    return () => {
      active = false;
      if (currentUrl) {
        URL.revokeObjectURL(currentUrl);
      }
      if (loadedDoc && typeof (loadedDoc as any).destroy === 'function') {
        (loadedDoc as any).destroy().catch(() => {});
      }
    };
  }, [note?.id]);

  const fallbackPages = useMemo(
    () => (note ? getNormalizedNotePages(note) : []),
    [note]
  );

  const totalPages = pdfDoc ? pdfPageCount : Math.max(1, fallbackPages.length);

  // Jump to page helper (scrolls into view when in continuous PDF scroll mode)
  const jumpToPage = (targetPage: number) => {
    const clamped = Math.max(1, Math.min(totalPages, targetPage));
    setCurrentPage(clamped);
    if (displayMode === 'pdf-scroll') {
      const el = pageScrollRefs.current[clamped];
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }
  };

  // Keyboard navigation
  useEffect(() => {
    if (!note) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      } else if (
        e.key === 'ArrowRight' &&
        document.activeElement?.tagName !== 'INPUT'
      ) {
        jumpToPage(currentPage + 1);
      } else if (
        e.key === 'ArrowLeft' &&
        document.activeElement?.tagName !== 'INPUT'
      ) {
        jumpToPage(currentPage - 1);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [note, currentPage, totalPages, displayMode, onClose]);

  if (!note) return null;

  const activePageData = fallbackPages[currentPage - 1] || {
    pageNumber: currentPage,
    sectionTitle: note.title,
    content: note.description,
    keyFormulasOrPoints: note.tags
  };

  const handleZoom = (delta: number) => {
    setZoomLevel(prev => Math.min(200, Math.max(60, prev + delta)));
  };

  const handleShare = () => {
    navigator.clipboard?.writeText(window.location.href);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const handlePrintPdf = () => {
    if (!pdfResource?.blobUrl) return;
    const iframe = document.createElement('iframe');
    iframe.style.position = 'fixed';
    iframe.style.right = '0';
    iframe.style.bottom = '0';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = '0';
    iframe.src = pdfResource.blobUrl;
    document.body.appendChild(iframe);
    iframe.onload = () => {
      try {
        iframe.contentWindow?.focus();
        iframe.contentWindow?.print();
      } catch {}
      setTimeout(() => {
        if (document.body.contains(iframe)) {
          document.body.removeChild(iframe);
        }
      }, 15000);
    };
  };

  const formattedSize =
    note.fileSizeBytes > 1024 * 1024
      ? `${(note.fileSizeBytes / (1024 * 1024)).toFixed(1)} MB`
      : `${Math.max(1, Math.round(note.fileSizeBytes / 1024))} KB`;

  const highlightSearchText = (text: string) => {
    const q = searchQuery.trim();
    if (!q) return text;
    const parts = text.split(
      new RegExp(`(${q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi')
    );
    return parts.map((part, i) =>
      part.toLowerCase() === q.toLowerCase() ? (
        <mark key={i} className="bg-cyan-400/35 text-cyan-100 px-0.5 rounded">
          {part}
        </mark>
      ) : (
        part
      )
    );
  };

  const pageNumbersList = Array.from({ length: totalPages }, (_, i) => i + 1);
  const canvasScale = (zoomLevel / 100) * 1.15;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`PDF Viewer - ${note.title}`}
      onClick={e => {
        if (e.target === e.currentTarget) onClose();
      }}
      className="fixed inset-0 z-50 flex items-center justify-center p-1.5 sm:p-3 bg-black/85 backdrop-blur-md animate-in fade-in duration-150"
    >
      <div
        className={`bg-[#0b0d13] rounded-2xl shadow-[0_0_60px_rgba(0,0,0,0.95)] border border-white/15 flex flex-col overflow-hidden text-white font-outfit transition-all ${
          isFullscreen
            ? 'w-screen h-screen rounded-none'
            : 'w-full max-w-6xl h-[95vh] sm:h-[92vh]'
        }`}
      >
        {/* Top PDF Viewer Title Bar */}
        <header className="px-3 sm:px-5 py-2.5 border-b border-white/10 flex items-center justify-between bg-zinc-950/90 shrink-0 gap-2">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            <button
              type="button"
              onClick={() => setShowSidebar(prev => !prev)}
              className={`p-2 rounded-xl border transition-colors cursor-pointer shrink-0 ${
                showSidebar
                  ? 'bg-cyan-400/15 text-cyan-300 border-cyan-400/30'
                  : 'bg-white/5 text-white/60 hover:text-white border-white/10'
              }`}
              title="Toggle PDF Page Thumbnails"
            >
              <PanelLeft className="w-4 h-4" />
            </button>

            <div className="p-2 bg-cyan-400/10 text-cyan-300 border border-cyan-400/20 rounded-xl shrink-0 hidden sm:flex">
              <FileText className="w-4 h-4" />
            </div>

            <div className="min-w-0">
              <div className="flex items-center gap-1.5 text-[10px] sm:text-xs text-white/50 truncate font-jetbrains">
                <span className="font-bold text-cyan-300">{getNoteCourseCategory(note)}</span>
                <span aria-hidden="true">·</span>
                <span className="truncate">{getNoteCourseDisplay(note)}</span>
                <span aria-hidden="true" className="hidden sm:inline">·</span>
                <span className="hidden sm:inline font-mono text-white/50 truncate">
                  {note.fileName}
                </span>
                {pdfResource?.isUploadedFile && (
                  <span className="hidden md:inline-flex items-center px-1.5 py-0.5 rounded bg-emerald-500/15 border border-emerald-500/30 text-[9px] text-emerald-300 font-bold uppercase">
                    Posted PDF
                  </span>
                )}
              </div>
              <h2 className="text-xs sm:text-sm md:text-base font-bold text-white truncate max-w-[180px] xs:max-w-xs sm:max-w-md lg:max-w-xl">
                {note.title}
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            {/* Viewer Mode Switcher */}
            <div className="hidden md:flex items-center bg-zinc-900 border border-white/10 rounded-xl p-0.5 text-[11px]">
              <button
                type="button"
                onClick={() => setDisplayMode('pdf-scroll')}
                className={`px-2.5 py-1 rounded-lg font-semibold transition-all cursor-pointer flex items-center gap-1 ${
                  displayMode === 'pdf-scroll'
                    ? 'bg-cyan-400 text-black font-bold'
                    : 'text-white/60 hover:text-white'
                }`}
                title="View all pages of the posted PDF in continuous scroll"
              >
                <Layers className="w-3 h-3" />
                <span>PDF Continuous</span>
              </button>
              <button
                type="button"
                onClick={() => setDisplayMode('pdf-single')}
                className={`px-2.5 py-1 rounded-lg font-semibold transition-all cursor-pointer flex items-center gap-1 ${
                  displayMode === 'pdf-single'
                    ? 'bg-cyan-400 text-black font-bold'
                    : 'text-white/60 hover:text-white'
                }`}
                title="View one PDF page at a time"
              >
                <FileText className="w-3 h-3" />
                <span>Single Page</span>
              </button>
              <button
                type="button"
                onClick={() => setDisplayMode('reader')}
                className={`px-2.5 py-1 rounded-lg font-semibold transition-all cursor-pointer flex items-center gap-1 ${
                  displayMode === 'reader'
                    ? 'bg-cyan-400 text-black font-bold'
                    : 'text-white/60 hover:text-white'
                }`}
                title="Structured study notes reader view"
              >
                <BookOpen className="w-3 h-3" />
                <span>Study Reader</span>
              </button>
            </div>

            {/* Print PDF */}
            <button
              type="button"
              onClick={handlePrintPdf}
              className="p-2 text-white/60 hover:text-white hover:bg-white/10 rounded-xl transition-colors cursor-pointer hidden sm:flex"
              title="Print PDF Document"
            >
              <Printer className="w-4 h-4" />
            </button>

            {/* Share */}
            <button
              type="button"
              onClick={handleShare}
              className="p-2 text-white/60 hover:text-white hover:bg-white/10 rounded-xl transition-colors cursor-pointer"
              title="Copy document link"
            >
              {copiedLink ? (
                <Check className="w-4 h-4 text-emerald-400" />
              ) : (
                <Share2 className="w-4 h-4" />
              )}
            </button>

            {/* Upvote */}
            <button
              type="button"
              onClick={() => onUpvote(note.id)}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium rounded-xl border transition-colors cursor-pointer ${
                note.hasUpvoted
                  ? 'border-cyan-400 bg-cyan-400/10 text-cyan-300 font-bold'
                  : 'border-white/10 bg-white/5 text-white/70 hover:text-white hover:bg-white/10'
              }`}
            >
              <ThumbsUp
                className={`w-3.5 h-3.5 ${
                  note.hasUpvoted ? 'fill-cyan-400 text-cyan-400' : ''
                }`}
              />
              <span className="tabular-nums">{note.upvotesCount}</span>
            </button>

            {/* Download PDF CTA */}
            <button
              type="button"
              onClick={() => onDownload(note)}
              className="flex items-center gap-1.5 px-3 sm:px-3.5 py-1.5 text-xs font-bold text-black bg-[#00f0ff] hover:bg-[#00f0ff]/90 rounded-xl transition-all cursor-pointer shadow-[0_0_15px_rgba(0,240,255,0.25)] active:scale-95"
            >
              <Download className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Download PDF ({formattedSize})</span>
              <span className="sm:hidden font-mono">PDF</span>
            </button>

            {/* Fullscreen Toggle */}
            <button
              type="button"
              onClick={() => setIsFullscreen(prev => !prev)}
              className="p-2 text-white/50 hover:text-white hover:bg-white/10 rounded-xl transition-colors cursor-pointer hidden sm:flex"
              title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen PDF Viewer'}
            >
              {isFullscreen ? (
                <Minimize2 className="w-4 h-4" />
              ) : (
                <Maximize2 className="w-4 h-4" />
              )}
            </button>

            {/* Close */}
            <button
              type="button"
              onClick={onClose}
              className="p-2 text-white/50 hover:text-white hover:bg-white/10 rounded-xl transition-colors cursor-pointer"
              aria-label="Close PDF viewer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </header>

        {/* Secondary PDF Viewer Control Bar: Page Navigation & Zoom */}
        <div className="px-3 sm:px-5 py-2 bg-[#12151f] border-b border-white/10 flex flex-wrap items-center justify-between text-xs text-white/70 gap-2 shrink-0">
          <div className="flex items-center gap-2.5 flex-1 min-w-[200px]">
            {displayMode === 'reader' ? (
              <div className="relative w-full max-w-xs">
                <Search className="w-3.5 h-3.5 text-white/40 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  placeholder="Search inside study notes..."
                  className="w-full pl-8 pr-3 py-1 bg-zinc-950/90 border border-white/10 rounded-lg text-xs text-white placeholder-white/35 focus:outline-none focus:border-cyan-400"
                />
              </div>
            ) : (
              <div className="flex items-center gap-2 text-[11px] text-white/60 truncate">
                <span className="font-mono text-cyan-300 font-semibold">
                  {note.fileName}
                </span>
                <span>·</span>
                <span className="truncate">
                  Uploaded by <strong className="text-white/85">{note.uploaderName}</strong>
                </span>
                <span className="hidden lg:inline">· Prof. {note.professor}</span>
              </div>
            )}
          </div>

          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            {/* Mobile Display Mode Toggle */}
            <button
              type="button"
              onClick={() =>
                setDisplayMode(prev =>
                  prev === 'pdf-scroll' ? 'pdf-single' : prev === 'pdf-single' ? 'reader' : 'pdf-scroll'
                )
              }
              className="md:hidden px-2.5 py-1 rounded-lg bg-white/5 border border-white/10 text-[11px] font-semibold text-cyan-300 cursor-pointer"
            >
              {displayMode === 'pdf-scroll'
                ? 'All Pages'
                : displayMode === 'pdf-single'
                ? '1 Page'
                : 'Reader'}
            </button>

            {/* Page Navigation */}
            <div className="flex items-center gap-1 bg-zinc-950/90 border border-white/10 rounded-xl p-0.5">
              <button
                type="button"
                onClick={() => jumpToPage(currentPage - 1)}
                disabled={currentPage <= 1}
                className="p-1 text-white/60 hover:text-white disabled:opacity-30 cursor-pointer"
                title="Previous Page"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="px-2 text-xs font-mono tabular-nums text-white/90">
                Page {currentPage} / {totalPages}
              </span>
              <button
                type="button"
                onClick={() => jumpToPage(currentPage + 1)}
                disabled={currentPage >= totalPages}
                className="p-1 text-white/60 hover:text-white disabled:opacity-30 cursor-pointer"
                title="Next Page"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            {/* Zoom Controls */}
            <div className="flex items-center gap-1 bg-zinc-950/90 border border-white/10 rounded-xl p-0.5">
              <button
                type="button"
                onClick={() => handleZoom(-15)}
                disabled={zoomLevel <= 60}
                className="p-1 text-white/60 hover:text-white disabled:opacity-30 cursor-pointer"
                title="Zoom Out"
              >
                <ZoomOut className="w-3.5 h-3.5" />
              </button>
              <span className="px-1.5 text-[11px] font-mono tabular-nums text-white/85">
                {zoomLevel}%
              </span>
              <button
                type="button"
                onClick={() => handleZoom(15)}
                disabled={zoomLevel >= 200}
                className="p-1 text-white/60 hover:text-white disabled:opacity-30 cursor-pointer"
                title="Zoom In"
              >
                <ZoomIn className="w-3.5 h-3.5" />
              </button>
              {zoomLevel !== 110 && (
                <button
                  type="button"
                  onClick={() => setZoomLevel(110)}
                  className="p-1 text-cyan-400 hover:text-cyan-300 cursor-pointer"
                  title="Reset Zoom"
                >
                  <RotateCcw className="w-3 h-3" />
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Main PDF Viewer Workspace */}
        <div className="flex-1 flex min-h-0 overflow-hidden bg-[#07080d]">
          {/* Left Page Thumbnails Sidebar (Renders actual PDF thumbnails via PDF.js!) */}
          {showSidebar && (
            <aside className="w-44 sm:w-52 border-r border-white/10 bg-zinc-950/85 overflow-y-auto p-3 space-y-2.5 shrink-0 hidden sm:block">
              <div className="text-[10px] font-mono uppercase tracking-wider text-white/45 px-1 flex items-center justify-between">
                <span>PDF Pages ({totalPages})</span>
                <span>{formattedSize}</span>
              </div>

              {pageNumbersList.map(pageNum => {
                const isSelected = currentPage === pageNum;
                return (
                  <button
                    key={pageNum}
                    type="button"
                    onClick={() => jumpToPage(pageNum)}
                    className={`w-full text-left p-2 rounded-xl border transition-all cursor-pointer group ${
                      isSelected
                        ? 'bg-cyan-500/15 border-cyan-400/60 shadow-md'
                        : 'bg-zinc-900/60 border-white/5 hover:border-white/20'
                    }`}
                  >
                    <div className="w-full rounded-lg overflow-hidden bg-white flex items-center justify-center mb-1.5 py-1">
                      {pdfDoc ? (
                        <PdfPageCanvas
                          pdfDoc={pdfDoc}
                          pageNumber={pageNum}
                          scale={0.22}
                          className="max-w-full h-auto block shadow-sm"
                        />
                      ) : pdfResource?.mimeType.startsWith('image/') && pdfResource.blobUrl ? (
                        <img
                          src={pdfResource.blobUrl}
                          alt={`Page ${pageNum}`}
                          className="max-h-24 object-contain"
                        />
                      ) : (
                        <div className="h-24 w-full p-2 text-[7px] text-slate-700 font-mono flex flex-col justify-between">
                          <span className="font-bold text-slate-900 truncate">
                            {getNoteCourseCategory(note)}
                          </span>
                          <span className="line-clamp-3">
                            {fallbackPages[pageNum - 1]?.sectionTitle || note.title}
                          </span>
                          <span className="text-slate-400">Page {pageNum}</span>
                        </div>
                      )}
                    </div>

                    <div className="flex items-center justify-between text-[11px] px-0.5">
                      <span
                        className={`font-semibold ${
                          isSelected ? 'text-cyan-300' : 'text-white/70'
                        }`}
                      >
                        Page {pageNum}
                      </span>
                      <span className="text-[10px] font-mono text-white/40">
                        /{totalPages}
                      </span>
                    </div>
                  </button>
                );
              })}
            </aside>
          )}

          {/* Main PDF Document Canvas Area */}
          <div className="flex-1 overflow-auto p-3 sm:p-6">
            {isLoadingPdf ? (
              <div className="h-full flex flex-col items-center justify-center py-16">
                <div className="w-10 h-10 rounded-full border-2 border-cyan-400 border-t-transparent animate-spin mb-3" />
                <p className="text-xs text-white/60 font-medium">
                  Rendering PDF Document in Viewer...
                </p>
              </div>
            ) : pdfResource?.mimeType.startsWith('image/') && pdfResource.blobUrl ? (
              /* Posted Image Document */
              <div className="flex justify-center">
                <div
                  style={{
                    transform: `scale(${zoomLevel / 100})`,
                    transformOrigin: 'top center'
                  }}
                  className="transition-transform duration-100 ease-out bg-zinc-900 p-4 rounded-xl border border-white/10 shadow-2xl"
                >
                  <img
                    src={pdfResource.blobUrl}
                    alt={note.title}
                    className="max-w-full max-h-[80vh] object-contain rounded-lg"
                  />
                </div>
              </div>
            ) : displayMode !== 'reader' && pdfDoc ? (
              /* Actual Posted PDF Rendered directly onto <canvas> via PDF.js */
              displayMode === 'pdf-scroll' ? (
                <div className="space-y-6 pb-10">
                  {pageNumbersList.map(pageNum => (
                    <div
                      key={pageNum}
                      ref={el => {
                        pageScrollRefs.current[pageNum] = el;
                      }}
                      onMouseEnter={() => setCurrentPage(pageNum)}
                      className="flex flex-col items-center"
                    >
                      <div className="mb-1.5 text-[10px] font-mono text-white/40 uppercase tracking-wider">
                        Page {pageNum} of {totalPages}
                      </div>
                      <PdfPageCanvas
                        pdfDoc={pdfDoc}
                        pageNumber={pageNum}
                        scale={canvasScale}
                      />
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center pb-10">
                  <div className="mb-2 text-[10px] font-mono text-white/45 uppercase tracking-wider">
                    Page {currentPage} of {totalPages}
                  </div>
                  <PdfPageCanvas
                    pdfDoc={pdfDoc}
                    pageNumber={currentPage}
                    scale={canvasScale}
                  />
                </div>
              )
            ) : (
              /* Study Reader View / Structured Fallback */
              <div className="flex justify-center">
                <div
                  style={{
                    transform: `scale(${zoomLevel / 100})`,
                    transformOrigin: 'top center'
                  }}
                  className="transition-transform duration-100 ease-out w-full max-w-3xl pb-8"
                >
                  <div className="bg-[#11131a] rounded-xl shadow-[0_20px_60px_rgba(0,0,0,0.85)] border border-white/15 overflow-hidden text-white flex flex-col justify-between min-h-[620px] sm:min-h-[780px]">
                    <div>
                      <div className="bg-gradient-to-r from-slate-950 via-zinc-900 to-slate-950 border-b-2 border-cyan-400/70 px-5 sm:px-10 py-4 flex flex-wrap items-center justify-between gap-2">
                        <div>
                          <div className="text-xs font-mono font-bold text-cyan-300 uppercase tracking-wider">
                            {getNoteCourseCategory(note)} — {getNoteCourseDisplay(note)}
                          </div>
                          <div className="text-[11px] text-white/60 mt-0.5">
                            Prof. {note.professor} · {note.programName || note.subject} · {note.academicYear} {note.semester}
                          </div>
                        </div>
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md bg-cyan-400/10 border border-cyan-400/30 text-[10px] text-cyan-300 font-bold font-mono">
                          PAGE {currentPage} OF {totalPages}
                        </span>
                      </div>

                      <div className="p-5 sm:p-10">
                        {currentPage === 1 && (
                          <div className="mb-6 pb-5 border-b border-white/10">
                            <h1 className="text-xl sm:text-2xl font-extrabold text-white tracking-tight leading-snug">
                              {highlightSearchText(note.title)}
                            </h1>
                            <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-white/50 font-mono">
                              <span>Shared by {note.uploaderName}</span>
                              <span>•</span>
                              <span>{note.uploaderUniversity}</span>
                            </div>
                          </div>
                        )}

                        <div className="mb-5">
                          <div className="text-[11px] font-semibold uppercase tracking-wider text-cyan-400 font-jetbrains mb-1">
                            Section {currentPage} of {totalPages}
                          </div>
                          <h3 className="text-base sm:text-xl font-bold text-white tracking-tight">
                            {highlightSearchText(activePageData.sectionTitle || note.title)}
                          </h3>
                        </div>

                        <div className="text-xs sm:text-sm leading-relaxed mb-6 whitespace-pre-line text-white/85 font-sans">
                          {highlightSearchText(activePageData.content || note.description)}
                        </div>

                        {activePageData.keyFormulasOrPoints &&
                          activePageData.keyFormulasOrPoints.length > 0 && (
                            <div className="bg-cyan-950/20 border-l-4 border-cyan-400 p-4 rounded-r-xl my-5 border border-cyan-500/20">
                              <h4 className="text-xs font-bold uppercase tracking-wider text-cyan-300 mb-2.5 flex items-center gap-1.5 font-jetbrains">
                                <Bookmark className="w-3.5 h-3.5 text-cyan-400" />
                                Key Formulas &amp; Derivation Points
                              </h4>
                              <ul className="space-y-1.5 text-xs text-white/80 font-mono">
                                {activePageData.keyFormulasOrPoints.map((pt: string, idx: number) => (
                                  <li key={idx} className="flex items-start gap-2">
                                    <span className="text-cyan-400 font-bold">›</span>
                                    <span>{highlightSearchText(pt)}</span>
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}
                      </div>
                    </div>

                    <div className="px-5 sm:px-10 py-4 bg-black/40 border-t border-white/10 flex items-center justify-between text-[11px] font-mono text-white/45">
                      <span>Xeusar Verified PDF · {note.fileName}</span>
                      <span>
                        Page {currentPage} of {totalPages}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
