import React, { useState } from 'react';
import { X, Search, Building2, Check, ArrowRight, ShieldCheck } from 'lucide-react';
import { StudentUser, University } from '../../types/index.ts';
import { getUniversities } from '../../lib/universityStore.ts';

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
  const [customUniversity, setCustomUniversity] = useState('');
  const [isCustomMode, setIsCustomMode] = useState(false);
  const universities = getUniversities();

  if (!isOpen) return null;

  const filtered = universities.filter(
    u =>
      u.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.shortName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.location.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleSelect = (uni: University) => {
    onSaveUniversity(uni.name, uni.id);
    onClose();
  };

  const handleCustomSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (customUniversity.trim()) {
      onSaveUniversity(customUniversity.trim(), undefined);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
      <div className="relative w-full max-w-lg bg-zinc-950 border border-white/10 rounded-2xl shadow-2xl p-6 sm:p-7 overflow-hidden font-outfit">
        {/* Glow */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20" />

        {/* Header */}
        <div className="flex items-start justify-between mb-5">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <Building2 className="w-5 h-5 text-cyan-400" />
              <h2 className="text-lg font-bold text-white tracking-tight">
                {user?.university ? 'Change Primary University' : 'Set Primary University'}
              </h2>
            </div>
            <p className="text-xs text-white/60 leading-relaxed">
              Connect your account with your campus to automatically access course materials, peer discussions, and doubt resolution.
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-white/50 hover:text-white rounded-lg hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Notice regarding historical data */}
        <div className="p-3 mb-5 bg-white/[0.03] border border-white/10 rounded-xl flex items-start gap-2.5 text-xs text-white/60">
          <ShieldCheck className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
          <span>
            <strong>Historical Integrity:</strong> Changing your primary university updates your campus directory without transferring or altering past document uploads or prior discussion post associations.
          </span>
        </div>

        {!isCustomMode ? (
          <>
            {/* Search */}
            <div className="relative mb-4">
              <Search className="w-4 h-4 text-white/40 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search university or campus name..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                autoFocus
                className="w-full pl-9 pr-4 py-2.5 text-xs bg-white/5 border border-white/15 rounded-xl text-white placeholder:text-white/30 focus:outline-none focus:border-cyan-400 transition-colors"
              />
            </div>

            {/* List */}
            <div className="max-h-60 overflow-y-auto space-y-2 pr-1 mb-5">
              {filtered.map(uni => {
                const isSelected =
                  user?.university?.toLowerCase() === uni.name.toLowerCase() ||
                  user?.universityId === uni.id;
                return (
                  <button
                    key={uni.id}
                    type="button"
                    onClick={() => handleSelect(uni)}
                    className={`w-full p-3 rounded-xl border flex items-center justify-between text-left transition-all ${
                      isSelected
                        ? 'bg-cyan-500/10 border-cyan-400/50 text-white'
                        : 'bg-white/[0.02] border-white/10 hover:border-white/20 text-white/80 hover:text-white'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <img
                        src={uni.logoUrl}
                        alt={uni.name}
                        className="w-8 h-8 rounded-lg object-cover shrink-0 border border-white/15"
                      />
                      <div className="min-w-0">
                        <div className="text-xs font-semibold text-white truncate">
                          {uni.name}
                        </div>
                        <div className="text-[11px] text-white/50 truncate">
                          {uni.location}
                        </div>
                      </div>
                    </div>
                    {isSelected ? (
                      <span className="flex items-center gap-1 text-[11px] text-cyan-400 font-medium shrink-0 ml-2">
                        <Check className="w-3.5 h-3.5" />
                        Active
                      </span>
                    ) : (
                      <ArrowRight className="w-3.5 h-3.5 text-white/30 shrink-0 ml-2" />
                    )}
                  </button>
                );
              })}

              {filtered.length === 0 && (
                <div className="text-center py-6 text-xs text-white/40">
                  No registered universities found matching "{searchQuery}".
                </div>
              )}
            </div>

            {/* Custom option */}
            <div className="pt-3 border-t border-white/10 flex items-center justify-between">
              <span className="text-xs text-white/50">Can’t find your institution?</span>
              <button
                type="button"
                onClick={() => setIsCustomMode(true)}
                className="text-xs text-cyan-400 hover:text-cyan-300 font-medium cursor-pointer"
              >
                Enter custom institution
              </button>
            </div>
          </>
        ) : (
          <form onSubmit={handleCustomSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-white/80 mb-1.5">
                Institution Name
              </label>
              <input
                type="text"
                placeholder="e.g. Oxford University, Politecnico di Milano"
                value={customUniversity}
                onChange={e => setCustomUniversity(e.target.value)}
                autoFocus
                className="w-full px-3.5 py-2.5 text-xs bg-white/5 border border-white/15 rounded-xl text-white placeholder:text-white/30 focus:outline-none focus:border-cyan-400"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsCustomMode(false)}
                className="px-4 py-2 text-xs text-white/60 hover:text-white rounded-lg transition-colors"
              >
                Back to List
              </button>
              <button
                type="submit"
                disabled={!customUniversity.trim()}
                className="px-5 py-2 text-xs font-bold text-black bg-cyan-400 hover:bg-cyan-300 disabled:opacity-40 rounded-lg transition-colors cursor-pointer"
              >
                Save University
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
