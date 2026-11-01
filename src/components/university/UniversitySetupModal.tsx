import React, { useState, useMemo } from 'react';
import {
  X,
  Search,
  Building2,
  Check,
  ArrowRight,
  ShieldCheck,
  Plus,
  MapPin,
  Sparkles,
  AlertCircle
} from 'lucide-react';
import { StudentUser, University } from '../../types/index.ts';
import {
  getAllHecUniversities,
  registerCustomUniversity,
  registerStudentToUniversity
} from '../../lib/universityStore.ts';

interface UniversitySetupModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: StudentUser | null;
  onSaveUniversity: (universityName: string, universityId?: string) => void;
}

export const UniversitySetupModal: React.FC<UniversitySetupModalProps> = ({
  isOpen,
  onClose,
  user,
  onSaveUniversity
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [sectorFilter, setSectorFilter] = useState<'All' | 'Public' | 'Private'>('All');
  const [isCustomMode, setIsCustomMode] = useState(false);

  // Custom Form fields
  const [customName, setCustomName] = useState('');
  const [customCity, setCustomCity] = useState('');
  const [customProvince, setCustomProvince] = useState('Punjab');
  const [customSector, setCustomSector] = useState<'Public' | 'Private'>('Public');
  const [customError, setCustomError] = useState<string | null>(null);

  const allUniversities = useMemo(() => getAllHecUniversities(), [isOpen, isCustomMode]);

  if (!isOpen) return null;

  const filtered = allUniversities.filter(u => {
    if (sectorFilter !== 'All' && u.sector !== sectorFilter) return false;
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase().trim();
    return (
      u.name.toLowerCase().includes(q) ||
      u.shortName.toLowerCase().includes(q) ||
      (u.location || '').toLowerCase().includes(q) ||
      (u.city || '').toLowerCase().includes(q) ||
      (u.province || '').toLowerCase().includes(q)
    );
  });

  const handleSelect = (uni: University) => {
    if (user?.id) {
      registerStudentToUniversity(user.id, uni.id);
    }
    onSaveUniversity(uni.name, uni.id);
    onClose();
  };

  const handleCustomSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customName.trim()) {
      setCustomError('Institution name is required.');
      return;
    }

    try {
      const created = registerCustomUniversity({
        name: customName.trim(),
        city: customCity.trim() || 'Pakistan',
        province: customProvince,
        sector: customSector,
        studentId: user?.id || 'current-user'
      });

      onSaveUniversity(created.name, created.id);
      setIsCustomMode(false);
      onClose();
    } catch {
      setCustomError('Failed to register custom institution. Please try again.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md font-outfit animate-in fade-in duration-200">
      <div className="relative w-full max-w-xl bg-[#0c0d12] border border-white/15 rounded-2xl shadow-2xl p-6 sm:p-7 overflow-hidden text-white">
        {/* Glow */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20" />

        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <div className="w-8 h-8 rounded-xl bg-cyan-500/10 border border-cyan-400/20 flex items-center justify-center text-cyan-400">
                <Building2 className="w-4 h-4" />
              </div>
              <h2 className="text-base sm:text-lg font-bold text-white tracking-tight">
                {user?.university ? 'Select or Switch Campus Directory' : 'Connect Your Campus Directory'}
              </h2>
            </div>
            <p className="text-xs text-white/60 leading-relaxed">
              Choose from Higher Education Commission (HEC) recognized universities in Pakistan to unlock shared notes, exams, doubt solving, and campus discussions.
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-white/50 hover:text-white rounded-lg hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Historical Integrity Notice */}
        <div className="p-3 mb-4 bg-white/[0.03] border border-white/10 rounded-xl flex items-start gap-2.5 text-xs text-white/70 leading-relaxed">
          <ShieldCheck className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
          <span>
            <strong>Historical Integrity Guaranteed:</strong> Switching your campus updates your primary directory and peers feed. Your previously contributed notes, past comments, and existing bookmarks retain their original author metadata and will never be rewritten or transferred.
          </span>
        </div>

        {!isCustomMode ? (
          <>
            {/* Search & Sector Filters */}
            <div className="space-y-2.5 mb-4">
              <div className="relative">
                <Search className="w-4 h-4 text-white/40 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search HEC university, acronym (NUST, FAST, LUMS, GIKI, UET), or city..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  autoFocus
                  className="w-full pl-9 pr-4 py-2.5 text-xs bg-white/5 border border-white/15 rounded-xl text-white placeholder:text-white/30 focus:outline-none focus:border-cyan-400 transition-colors"
                />
              </div>

              <div className="flex items-center justify-between text-[11px]">
                <div className="flex items-center gap-1 bg-white/[0.03] p-0.5 rounded-lg border border-white/10">
                  {(['All', 'Public', 'Private'] as const).map(sec => (
                    <button
                      key={sec}
                      type="button"
                      onClick={() => setSectorFilter(sec)}
                      className={`px-2.5 py-1 rounded-md font-medium transition-all cursor-pointer ${
                        sectorFilter === sec
                          ? 'bg-cyan-400 text-black font-bold shadow-sm'
                          : 'text-white/60 hover:text-white'
                      }`}
                    >
                      {sec === 'All' ? 'All Sectors' : `${sec} Sector`}
                    </button>
                  ))}
                </div>

                <span className="text-[10px] text-white/40 font-mono">
                  {filtered.length} HEC Institutions
                </span>
              </div>
            </div>

            {/* List */}
            <div className="max-h-64 overflow-y-auto space-y-2 pr-1 mb-4 no-scrollbar">
              {filtered.map(uni => {
                const isSelected =
                  user?.universityId === uni.id ||
                  user?.university?.toLowerCase().trim() === uni.name.toLowerCase().trim();

                const isAlreadyUnlocked = (uni.verifiedStudents || 0) >= 1;

                return (
                  <button
                    key={uni.id}
                    type="button"
                    onClick={() => handleSelect(uni)}
                    className={`w-full p-3 rounded-xl border flex items-center justify-between text-left transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-cyan-500/15 border-cyan-400/50 text-white shadow-[0_0_15px_rgba(0,240,255,0.15)]'
                        : 'bg-white/[0.02] border-white/10 hover:border-white/20 hover:bg-white/[0.05] text-white/80 hover:text-white'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <div className="w-9 h-9 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center shrink-0 overflow-hidden">
                        {uni.logoUrl ? (
                          <img
                            src={uni.logoUrl}
                            alt={uni.name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <Building2 className="w-4 h-4 text-cyan-400" />
                        )}
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap mb-0.5">
                          <span className="text-xs font-semibold text-white truncate">
                            {uni.name}
                          </span>
                          {uni.shortName && (
                            <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-cyan-400/10 text-cyan-300 border border-cyan-400/20">
                              {uni.shortName}
                            </span>
                          )}
                          {uni.sector && (
                            <span className="text-[9px] px-1.5 py-0.2 rounded bg-white/5 text-white/60 border border-white/10">
                              {uni.sector}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 text-[10px] text-white/50 truncate">
                          <span className="flex items-center gap-1">
                            <MapPin className="w-2.5 h-2.5 text-cyan-400 shrink-0" />
                            <span>{uni.city || uni.location}</span>
                          </span>
                          {isAlreadyUnlocked ? (
                            <span className="text-emerald-400 font-mono">
                              • {uni.verifiedStudents} active students
                            </span>
                          ) : (
                            <span className="text-amber-300/80 font-mono">
                              • Unlocks on your selection
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="shrink-0 ml-2">
                      {isSelected ? (
                        <span className="flex items-center gap-1 text-[11px] text-cyan-400 font-bold">
                          <Check className="w-3.5 h-3.5 stroke-[3]" />
                          Current
                        </span>
                      ) : (
                        <span className="text-[11px] text-white/40 font-mono group-hover:text-white flex items-center gap-1">
                          Select <ArrowRight className="w-3 h-3" />
                        </span>
                      )}
                    </div>
                  </button>
                );
              })}

              {filtered.length === 0 && (
                <div className="text-center py-8 text-xs text-white/50 bg-white/[0.02] rounded-xl border border-white/10 p-4">
                  <p className="font-semibold text-white/80">No HEC university found for "{searchQuery}"</p>
                  <p className="text-[11px] text-white/40 mt-1">
                    You can add your college, sub-campus, or custom institution directly below.
                  </p>
                  <button
                    type="button"
                    onClick={() => setIsCustomMode(true)}
                    className="mt-3 inline-flex items-center gap-1.5 px-3 py-1.5 bg-cyan-400 text-black font-bold rounded-xl text-xs cursor-pointer shadow-md"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Custom / Other Institution</span>
                  </button>
                </div>
              )}
            </div>

            {/* Custom option button */}
            <div className="pt-3 border-t border-white/10 flex items-center justify-between text-xs">
              <span className="text-white/50">Can’t find your specific institution?</span>
              <button
                type="button"
                onClick={() => setIsCustomMode(true)}
                className="text-cyan-300 hover:text-cyan-200 font-semibold inline-flex items-center gap-1 transition-colors cursor-pointer hover:underline"
              >
                <Plus className="w-3 h-3" />
                <span>Custom / Other Institution</span>
              </button>
            </div>
          </>
        ) : (
          /* Custom University Addition Form */
          <form onSubmit={handleCustomSubmit} className="space-y-4 animate-in fade-in">
            <div className="p-3 bg-white/[0.03] border border-white/10 rounded-xl text-[11px] text-white/70 space-y-1">
              <div className="flex items-center gap-1.5 font-semibold text-amber-300">
                <Sparkles className="w-3.5 h-3.5 shrink-0" />
                <span>Custom Campus Instantiation</span>
              </div>
              <p className="text-white/50">
                Registering a custom institution creates a pending unverified directory tied to your academic profile. It will immediately unlock and appear in Explore with 1 active student (you).
              </p>
            </div>

            {customError && (
              <div className="p-2.5 bg-rose-500/10 border border-rose-500/30 text-rose-300 rounded-xl text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{customError}</span>
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-white/80 mb-1">
                Full Institution / College Name *
              </label>
              <input
                type="text"
                required
                value={customName}
                onChange={e => setCustomName(e.target.value)}
                placeholder="e.g. Government Postgraduate College Gujranwala"
                autoFocus
                className="w-full px-3.5 py-2.5 bg-white/5 border border-white/15 rounded-xl text-xs text-white placeholder:text-white/30 focus:outline-none focus:border-cyan-400 transition-colors"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-white/80 mb-1">
                  City / District
                </label>
                <input
                  type="text"
                  value={customCity}
                  onChange={e => setCustomCity(e.target.value)}
                  placeholder="e.g. Sialkot, Abbottabad"
                  className="w-full px-3.5 py-2.5 bg-white/5 border border-white/15 rounded-xl text-xs text-white placeholder:text-white/30 focus:outline-none focus:border-cyan-400 transition-colors"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-white/80 mb-1">
                  Province / Region
                </label>
                <select
                  value={customProvince}
                  onChange={e => setCustomProvince(e.target.value)}
                  className="w-full px-3 py-2.5 bg-[#12141a] border border-white/15 rounded-xl text-xs text-white focus:outline-none focus:border-cyan-400 transition-colors"
                >
                  <option value="Punjab">Punjab</option>
                  <option value="Sindh">Sindh</option>
                  <option value="Islamabad">Islamabad (ICT)</option>
                  <option value="Khyber Pakhtunkhwa">Khyber Pakhtunkhwa</option>
                  <option value="Balochistan">Balochistan</option>
                  <option value="Azad Jammu & Kashmir">AJK</option>
                  <option value="Gilgit-Baltistan">Gilgit-Baltistan</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-white/80 mb-1.5">
                Sector
              </label>
              <div className="grid grid-cols-2 gap-2">
                {(['Public', 'Private'] as const).map(sec => (
                  <button
                    key={sec}
                    type="button"
                    onClick={() => setCustomSector(sec)}
                    className={`py-2 px-3 rounded-xl border text-xs font-semibold transition-all cursor-pointer ${
                      customSector === sec
                        ? 'bg-cyan-400 text-black border-cyan-400 font-bold shadow-sm'
                        : 'bg-white/[0.04] text-white/60 border-white/10 hover:text-white'
                    }`}
                  >
                    {sec} Sector
                  </button>
                ))}
              </div>
            </div>

            <div className="pt-2 flex items-center gap-3">
              <button
                type="button"
                onClick={() => setIsCustomMode(false)}
                className="py-2.5 px-4 bg-white/5 hover:bg-white/10 text-white/70 rounded-xl text-xs transition-colors cursor-pointer"
              >
                Back to Master List
              </button>
              <button
                type="submit"
                className="flex-1 py-2.5 px-4 bg-cyan-400 hover:bg-cyan-300 text-black font-bold rounded-xl text-xs transition-all shadow-[0_0_15px_rgba(0,240,255,0.3)] flex items-center justify-center gap-2 cursor-pointer active:scale-98"
              >
                <Check className="w-4 h-4" />
                <span>Save & Unlock Campus</span>
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
