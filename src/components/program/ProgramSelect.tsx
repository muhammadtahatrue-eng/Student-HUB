import React, { useState, useMemo, useRef, useEffect } from 'react';
import {
  GraduationCap,
  Search,
  Check,
  ChevronDown,
  Sparkles,
  Plus,
  X,
  AlertCircle,
  Layers,
  BookOpen,
  Users
} from 'lucide-react';
import { AcademicProgram, DegreeTier } from '../../types/index.ts';
import { getAllPrograms, registerCustomProgram } from '../../lib/programStore.ts';

interface ProgramSelectProps {
  value?: string; // program name or id
  selectedProgramId?: string;
  selectedDegreeTier?: DegreeTier;
  onChange: (program: AcademicProgram) => void;
  label?: string;
  placeholder?: string;
  required?: boolean;
}

export const ProgramSelect: React.FC<ProgramSelectProps> = ({
  value,
  selectedProgramId,
  selectedDegreeTier,
  onChange,
  label = 'Degree Level & Academic Program',
  placeholder = 'Select your degree tier & major program...',
  required = false
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [tierFilter, setTierFilter] = useState<'All' | DegreeTier>(selectedDegreeTier || 'All');
  const [isCustomModalOpen, setIsCustomModalOpen] = useState(false);

  // Custom Program input state
  const [customName, setCustomName] = useState('');
  const [customTier, setCustomTier] = useState<DegreeTier>('Undergraduate');
  const [customDiscipline, setCustomDiscipline] = useState('');
  const [customDuration, setCustomDuration] = useState('4');

  const containerRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const programs = useMemo(() => getAllPrograms(), [isOpen, isCustomModalOpen]);

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node) &&
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const selectedProgram = useMemo(() => {
    if (selectedProgramId) {
      const found = programs.find(p => p.id === selectedProgramId);
      if (found) return found;
    }
    if (value) {
      const found = programs.find(
        p => p.name.toLowerCase() === value.toLowerCase() || p.id === value
      );
      if (found) return found;
    }
    return undefined;
  }, [programs, selectedProgramId, value]);

  const filteredPrograms = useMemo(() => {
    return programs.filter(prog => {
      // Tier filter
      if (tierFilter !== 'All' && prog.degreeTier !== tierFilter) {
        return false;
      }

      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase().trim();
      return (
        prog.name.toLowerCase().includes(q) ||
        prog.shortCode.toLowerCase().includes(q) ||
        prog.discipline.toLowerCase().includes(q) ||
        prog.degreeTier.toLowerCase().includes(q)
      );
    });
  }, [programs, tierFilter, searchQuery]);

  const handleSelect = (program: AcademicProgram) => {
    onChange(program);
    setIsOpen(false);
    setSearchQuery('');
  };

  const handleCreateCustom = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customName.trim()) return;

    const newProg = registerCustomProgram({
      name: customName.trim(),
      degreeTier: customTier,
      discipline: customDiscipline.trim() || 'Interdisciplinary Studies',
      durationYears: parseInt(customDuration, 10) || 4
    });

    onChange(newProg);
    setIsCustomModalOpen(false);
    setIsOpen(false);
    setCustomName('');
    setCustomDiscipline('');
  };

  const getTierColor = (tier: DegreeTier) => {
    switch (tier) {
      case 'Undergraduate':
        return 'text-cyan-400 bg-cyan-950/40 border-cyan-500/30';
      case "Master's":
        return 'text-purple-400 bg-purple-950/40 border-purple-500/30';
      case 'PhD':
        return 'text-amber-400 bg-amber-950/40 border-amber-500/30';
      case 'Associate':
        return 'text-emerald-400 bg-emerald-950/40 border-emerald-500/30';
    }
  };

  return (
    <div className="relative font-outfit" ref={containerRef}>
      {label && (
        <label className="block text-xs font-semibold text-white/80 uppercase tracking-wider mb-1.5 flex items-center justify-between">
          <span className="flex items-center gap-1.5">
            <GraduationCap className="w-3.5 h-3.5 text-cyan-400" />
            {label}
            {required && <span className="text-cyan-400">*</span>}
          </span>
          <span className="text-[10px] text-white/40 normal-case">
            Degree Tier &amp; Program Cohort
          </span>
        </label>
      )}

      {/* Main Trigger Button */}
      <div
        role="button"
        tabIndex={0}
        onClick={() => setIsOpen(!isOpen)}
        onKeyDown={e => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            setIsOpen(!isOpen);
          }
        }}
        className={`w-full px-3.5 py-2.5 rounded-xl bg-zinc-900/90 border transition-all duration-200 cursor-pointer flex items-center justify-between text-left ${
          isOpen
            ? 'border-cyan-400/80 shadow-[0_0_15px_rgba(0,240,255,0.15)] ring-1 ring-cyan-400/50'
            : 'border-white/10 hover:border-white/25 hover:bg-zinc-800/80'
        }`}
      >
        <div className="flex items-center gap-3 min-w-0 pr-2">
          <div className="w-8 h-8 rounded-lg bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400 shrink-0">
            <GraduationCap className="w-4 h-4" />
          </div>

          <div className="min-w-0">
            {selectedProgram ? (
              <div className="flex flex-col">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-white truncate">
                    {selectedProgram.name}
                  </span>
                  <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded border uppercase shrink-0 ${getTierColor(selectedProgram.degreeTier)}`}>
                    {selectedProgram.degreeTier}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-[11px] text-white/50">
                  <span>{selectedProgram.discipline}</span>
                  <span>•</span>
                  <span>{selectedProgram.activeStudents} peers</span>
                  <span>•</span>
                  <span>{selectedProgram.resourceCount} materials</span>
                </div>
              </div>
            ) : value ? (
              <span className="text-sm text-white font-medium truncate">{value}</span>
            ) : (
              <span className="text-sm text-white/40">{placeholder}</span>
            )}
          </div>
        </div>

        <ChevronDown
          className={`w-4 h-4 text-white/50 shrink-0 transition-transform duration-200 ${
            isOpen ? 'rotate-180 text-cyan-400' : ''
          }`}
        />
      </div>

      {/* Dropdown Menu */}
      {isOpen && (
        <div
          ref={dropdownRef}
          className="absolute left-0 right-0 top-full mt-2 z-50 bg-zinc-950/95 backdrop-blur-2xl border border-cyan-500/30 rounded-2xl shadow-2xl shadow-black/90 p-3 max-h-[440px] flex flex-col animate-in fade-in zoom-in-95 duration-150"
        >
          {/* Degree Tier Filter Tabs */}
          <div className="flex items-center gap-1.5 pb-2 border-b border-white/10 overflow-x-auto scrollbar-none">
            {(['All', 'Undergraduate', "Master's", 'PhD', 'Associate'] as const).map(tier => (
              <button
                key={tier}
                type="button"
                onClick={() => setTierFilter(tier)}
                className={`px-2.5 py-1 text-xs rounded-lg font-medium transition-all shrink-0 cursor-pointer ${
                  tierFilter === tier
                    ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                    : 'text-white/60 hover:text-white hover:bg-white/5 border border-transparent'
                }`}
              >
                {tier === 'All' ? 'All Tiers' : tier}
              </button>
            ))}
          </div>

          {/* Search Bar inside dropdown */}
          <div className="relative mt-2 mb-2">
            <Search className="w-3.5 h-3.5 text-white/40 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              autoFocus
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search by program, major, code (e.g. BSCS, Data Science)..."
              className="w-full pl-8 pr-3 py-1.5 bg-zinc-900 border border-white/10 rounded-xl text-xs text-white placeholder-white/35 focus:outline-none focus:border-cyan-400/60"
            />
          </div>

          {/* Programs List */}
          <div className="overflow-y-auto space-y-1.5 pr-1 flex-1 max-h-[250px] scrollbar-thin scrollbar-thumb-white/10">
            {filteredPrograms.length > 0 ? (
              filteredPrograms.map(prog => {
                const isSelected = selectedProgram?.id === prog.id;
                return (
                  <div
                    key={prog.id}
                    onClick={() => handleSelect(prog)}
                    className={`p-2.5 rounded-xl border transition-all cursor-pointer flex items-center justify-between group ${
                      isSelected
                        ? 'bg-cyan-950/40 border-cyan-400/50 shadow-sm'
                        : 'bg-zinc-900/60 border-white/5 hover:border-cyan-500/30 hover:bg-zinc-800/80'
                    }`}
                  >
                    <div className="min-w-0 pr-3">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold text-white group-hover:text-cyan-300 transition-colors">
                          {prog.name}
                        </span>
                        <span className={`text-[9px] font-mono px-1.5 py-0.2 rounded border uppercase shrink-0 ${getTierColor(prog.degreeTier)}`}>
                          {prog.degreeTier}
                        </span>
                        {prog.isCustom && (
                          <span className="text-[9px] bg-amber-500/10 text-amber-300 border border-amber-500/30 px-1 rounded">
                            Custom
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 mt-0.5 text-[10px] text-white/45">
                        <span className="truncate">{prog.discipline}</span>
                        <span>•</span>
                        <span className="flex items-center gap-1">
                          <Users className="w-2.5 h-2.5 text-cyan-400" />
                          {prog.activeStudents} peers
                        </span>
                        <span>•</span>
                        <span className="flex items-center gap-1">
                          <BookOpen className="w-2.5 h-2.5 text-indigo-400" />
                          {prog.resourceCount} materials
                        </span>
                      </div>
                    </div>

                    <div className="shrink-0 flex items-center gap-2">
                      <span className="text-[10px] font-mono text-white/40 bg-white/5 px-1.5 py-0.5 rounded">
                        {prog.shortCode}
                      </span>
                      {isSelected && (
                        <Check className="w-4 h-4 text-cyan-400" />
                      )}
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="p-4 text-center">
                <p className="text-xs text-white/50 mb-2">No degree programs matched "{searchQuery}"</p>
                <button
                  type="button"
                  onClick={() => setIsCustomModalOpen(true)}
                  className="px-3 py-1.5 rounded-lg bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 text-xs font-medium hover:bg-cyan-500/30 transition-colors cursor-pointer inline-flex items-center gap-1.5"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Register Custom Program
                </button>
              </div>
            )}
          </div>

          {/* Footer with "Custom / Other Program" Fallback Action */}
          <div className="pt-2.5 mt-2 border-t border-white/10 flex items-center justify-between text-xs">
            <span className="text-[11px] text-white/40">Can't find your specific major?</span>
            <button
              type="button"
              onClick={() => setIsCustomModalOpen(true)}
              className="text-cyan-400 hover:text-cyan-300 text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              Custom / Other Program
            </button>
          </div>
        </div>
      )}

      {/* Custom Program Registration Modal */}
      {isCustomModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="bg-zinc-950 border border-cyan-500/40 rounded-2xl w-full max-w-md p-5 shadow-2xl relative animate-in fade-in zoom-in-95">
            <button
              type="button"
              onClick={() => setIsCustomModalOpen(false)}
              className="absolute right-4 top-4 p-1 rounded-lg text-white/50 hover:text-white hover:bg-white/10 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-2.5 mb-3">
              <div className="w-9 h-9 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
                <Sparkles className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Register Custom Academic Program</h3>
                <p className="text-xs text-white/50">Instantly unlocks your cohort in the global Explore directory</p>
              </div>
            </div>

            <form onSubmit={handleCreateCustom} className="space-y-3.5 mt-4">
              <div>
                <label className="block text-xs font-semibold text-white/80 mb-1">
                  Program Title / Degree Name *
                </label>
                <input
                  type="text"
                  required
                  value={customName}
                  onChange={e => setCustomName(e.target.value)}
                  placeholder="e.g. BS Artificial Intelligence & Robotics, MS Bioinformatics"
                  className="w-full px-3 py-2 bg-zinc-900 border border-white/15 rounded-xl text-sm text-white placeholder-white/35 focus:outline-none focus:border-cyan-400"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-white/80 mb-1">
                    Degree Tier *
                  </label>
                  <select
                    value={customTier}
                    onChange={e => setCustomTier(e.target.value as DegreeTier)}
                    className="w-full px-3 py-2 bg-zinc-900 border border-white/15 rounded-xl text-sm text-white focus:outline-none focus:border-cyan-400 cursor-pointer"
                  >
                    <option value="Undergraduate">Undergraduate / Bachelor's</option>
                    <option value="Master's">Master's</option>
                    <option value="PhD">PhD / Doctorate</option>
                    <option value="Associate">Associate / Diploma</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-white/80 mb-1">
                    Standard Duration (Years)
                  </label>
                  <select
                    value={customDuration}
                    onChange={e => setCustomDuration(e.target.value)}
                    className="w-full px-3 py-2 bg-zinc-900 border border-white/15 rounded-xl text-sm text-white focus:outline-none focus:border-cyan-400 cursor-pointer"
                  >
                    <option value="1">1 Year</option>
                    <option value="2">2 Years</option>
                    <option value="3">3 Years</option>
                    <option value="4">4 Years</option>
                    <option value="5">5 Years</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-white/80 mb-1">
                  Academic Discipline / Field
                </label>
                <input
                  type="text"
                  value={customDiscipline}
                  onChange={e => setCustomDiscipline(e.target.value)}
                  placeholder="e.g. Computing, Engineering, Health Sciences, Business"
                  className="w-full px-3 py-2 bg-zinc-900 border border-white/15 rounded-xl text-sm text-white placeholder-white/35 focus:outline-none focus:border-cyan-400"
                />
              </div>

              <div className="p-3 rounded-xl bg-cyan-950/30 border border-cyan-500/20 text-[11px] text-cyan-300/80 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
                <span>
                  Adding this custom program maps your profile to it and automatically unlocks its directory card in Explore with 1 active student peer.
                </span>
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setIsCustomModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-white/60 hover:text-white hover:bg-white/5 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!customName.trim()}
                  className="px-4 py-2 rounded-xl bg-cyan-400 text-black text-xs font-bold hover:bg-cyan-300 transition-colors cursor-pointer shadow-lg shadow-cyan-400/20 disabled:opacity-50"
                >
                  Save &amp; Unlock Program
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
