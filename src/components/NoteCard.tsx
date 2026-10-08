import React from 'react';
import { FileText, Download, ThumbsUp, Eye } from 'lucide-react';
import { StudyNote } from '../types/index.ts';
import { MATERIAL_TYPE_LABELS } from '../data/seedData.ts';

interface NoteCardProps {
  note: StudyNote;
  onPreview: (note: StudyNote) => void;
  onDownload: (note: StudyNote) => void;
  onUpvote: (noteId: string) => void;
}

export const NoteCard: React.FC<NoteCardProps> = ({
  note,
  onPreview,
  onDownload,
  onUpvote,
}) => {
  // Format bytes into readable MB/KB
  const formattedSize =
    note.fileSizeBytes > 1024 * 1024
      ? `${(note.fileSizeBytes / (1024 * 1024)).toFixed(1)} MB`
      : `${Math.round(note.fileSizeBytes / 1024)} KB`;

  const typeInfo = MATERIAL_TYPE_LABELS[note.materialType] || { label: 'Study Note', short: 'Note' };

  return (
    <article className="glass-card p-6 flex flex-col justify-between font-outfit text-white group">
      <div>
        {/* Unboxed Metadata Line with typographic separators (Zero-Pill Discipline) */}
        <div className="flex items-center gap-2 text-xs text-white/50 mb-2 font-jetbrains">
          <span className="font-bold text-white tracking-wide">{note.courseCode}</span>
          <span aria-hidden="true" className="text-white/20">·</span>
          <span>{note.subject}</span>
          <span aria-hidden="true" className="text-white/20">·</span>
          <span className="text-white/60">{typeInfo.label}</span>
        </div>

        {/* Note Title */}
        <h3
          onClick={() => onPreview(note)}
          className="text-lg font-bold text-white leading-snug mb-2 hover:text-white/80 cursor-pointer line-clamp-2 transition-colors"
        >
          {note.title}
        </h3>

        {/* Note Description */}
        <p className="text-xs text-white/60 leading-relaxed line-clamp-3 mb-4">
          {note.description}
        </p>

        {/* Academic Details Metadata: Clean unboxed text */}
        <div className="flex items-center flex-wrap gap-2 text-xs text-white/40 mb-4 pb-3 border-t border-white/10 pt-3">
          <span>{note.professor}</span>
          <span aria-hidden="true" className="text-white/20">·</span>
          <span className="tabular-nums font-mono">{note.academicYear}</span>
          <span aria-hidden="true" className="text-white/20">·</span>
          <span>{note.uploaderUniversity}</span>
        </div>
      </div>

      <div>
        {/* Document Stats: Tabular figures & Clean layout */}
        <div className="flex items-center justify-between text-xs text-white/50 mb-4 font-jetbrains">
          <div className="flex items-center gap-3 tabular-nums">
            <span className="flex items-center gap-1">
              <FileText className="w-3.5 h-3.5 text-white/40" />
              {note.pageCount}p
            </span>
            <span>{formattedSize}</span>
          </div>

          <div className="flex items-center gap-3 tabular-nums">
            <span className="flex items-center gap-1" title="Total downloads">
              <Download className="w-3.5 h-3.5 text-white/40" />
              {note.downloadsCount}
            </span>
            <button
              onClick={() => onUpvote(note.id)}
              className={`flex items-center gap-1 transition-colors cursor-pointer ${
                note.hasUpvoted
                  ? 'text-white font-bold'
                  : 'text-white/50 hover:text-white'
              }`}
              title="Helpful study resource"
            >
              <ThumbsUp className={`w-3.5 h-3.5 ${note.hasUpvoted ? 'fill-white text-white' : ''}`} />
              {note.upvotesCount}
            </button>
          </div>
        </div>

        {/* Primary Action Row */}
        <div className="flex items-center gap-2 pt-1">
          <button
            onClick={() => onPreview(note)}
            className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 text-xs font-semibold text-white/90 bg-white/10 hover:bg-white/20 rounded-full transition-colors cursor-pointer"
          >
            <Eye className="w-3.5 h-3.5" />
            Preview PDF
          </button>
          <button
            onClick={() => onDownload(note)}
            className="flex items-center justify-center gap-1.5 py-2 px-4 text-xs font-bold text-black bg-white hover:bg-white/90 rounded-full transition-all cursor-pointer shadow-md"
            title="Download PDF"
          >
            <Download className="w-3.5 h-3.5" />
            <span>PDF</span>
          </button>
        </div>
      </div>
    </article>
  );
};
