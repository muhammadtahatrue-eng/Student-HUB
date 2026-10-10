import React, { useState } from 'react';
import {
  GraduationCap,
  Sparkles,
  X,
  Layers,
  ArrowRight,
  ShieldCheck,
  Check
} from 'lucide-react';
import { AcademicProgram, DegreeTier, StudentUser } from '../../types/index.ts';
import { ProgramSelect } from './ProgramSelect.tsx';
import { enrollStudentInProgram } from '../../lib/programStore.ts';

interface ProgramSetupModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: StudentUser | null;
  onSaveProgram: (program: AcademicProgram, semester?: string) => void;
}

export const ProgramSetupModal: React.FC<ProgramSetupModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  onSaveProgram
}) => {
  const [selectedProgram, setSelectedProgram] = useState<AcademicProgram | null>(null);
  const [semester, setSemester] = useState<string>(currentUser?.currentSemester || 'Semester 1');

  if (!isOpen) return null;

  const handleSave = () => {
    if (!selectedProgram) return;
    enrollStudentInProgram(selectedProgram.id);
    onSaveProgram(selectedProgram, semester);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md font-outfit">
      <div className="bg-zinc-950 border border-cyan-500/40 rounded-3xl w-full max-w-lg p-6 sm:p-7 shadow-2xl relative animate-in fade-in zoom-in-95">
        <button
          type="button"
          onClick={onClose}
          className="absolute right-4 top-4 p-1 rounded-lg text-white/50 hover:text-white transition-colors"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
            <GraduationCap className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-white">Set Your Academic Degree Program</h3>
            <p className="text-xs text-white/50">
              Map your profile to your degree cohort to access your shared library vault and doubt center
            </p>
          </div>
        </div>

        <div className="space-y-4">
          <ProgramSelect
            selectedProgramId={selectedProgram?.id || currentUser?.programId}
            value={selectedProgram?.name || currentUser?.program}
            onChange={prog => setSelectedProgram(prog)}
            label="Degree Level & Academic Program"
            placeholder="Search or select your degree program (e.g. BSCS, BBA)..."
          />

          <div>
            <label className="block text-xs font-semibold text-white/80 mb-1">
              Current Semester / Academic Stage
            </label>
            <select
              value={semester}
              onChange={e => setSemester(e.target.value)}
              className="w-full px-3 py-2 bg-zinc-900 border border-white/15 rounded-xl text-xs text-white focus:outline-none focus:border-cyan-400 cursor-pointer"
            >
              {[1, 2, 3, 4, 5, 6, 7, 8].map(num => (
                <option key={num} value={`Semester ${num}`}>
                  Semester {num}
                </option>
              ))}
              <option value="Graduate / Final Year">Graduate / Final Year</option>
              <option value="Postgraduate / Research">Postgraduate / Research</option>
            </select>
          </div>

          <div className="p-3.5 rounded-xl bg-cyan-950/25 border border-cyan-500/20 text-xs text-cyan-300/80 flex items-start gap-2.5">
            <ShieldCheck className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
            <p className="text-[11px] leading-relaxed">
              <strong>Isolated Ownership:</strong> Changing your program will update your primary "My Program" view and discussions feed without transferring or altering the authorship of past notes you have uploaded.
            </p>
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 mt-6 pt-4 border-t border-white/10">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-semibold text-white/60 hover:text-white"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={!selectedProgram}
            onClick={handleSave}
            className="px-5 py-2 rounded-xl bg-cyan-400 text-black text-xs font-bold hover:bg-cyan-300 transition-colors cursor-pointer shadow-lg shadow-cyan-400/20 disabled:opacity-40 flex items-center gap-1.5"
          >
            <Check className="w-4 h-4" />
            Confirm Program
          </button>
        </div>
      </div>
    </div>
  );
};
