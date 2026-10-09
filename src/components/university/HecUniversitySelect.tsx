import React, { useState, useMemo, useRef, useEffect } from 'react';
import {
  Building2,
  Search,
  Check,
  ChevronDown,
  ShieldCheck,
  Plus,
  X,
  AlertCircle,
  Sparkles,
  MapPin
} from 'lucide-react';
import { University } from '../../types/index.ts';
import { getAllHecUniversities, registerCustomUniversity } from '../../lib/universityStore.ts';

interface HecUniversitySelectProps {
  value: string;
  onChange: (
    universityName: string,
    universityId?: string,
    isCustom?: boolean,
    details?: { name: string; city?: string; province?: string; sector?: 'Public' | 'Private' }
  ) => void;
  placeholder?: string;
  label?: string;
  required?: boolean;
  className?: string;
  allowCustom?: boolean;
  studentId?: string;
}

export const HecUniversitySelect: React.FC<HecUniversitySelectProps> = ({
  value,
  onChange,
  placeholder = 'Select HEC-recognized university or institution...',
  label,
  required = false,
  className = '',
  allowCustom = true,
  studentId
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [sectorFilter, setSectorFilter] = useState<'All' | 'Public' | 'Private'>('All');
  const [provinceFilter, setProvinceFilter] = useState<string>('All');

  // Custom university creation modal state
  const [isCustomFormOpen, setIsCustomFormOpen] = useState(false);
  const [customName, setCustomName] = useState('');
  const [customCity, setCustomCity] = useState('');
  const [customProvince, setCustomProvince] = useState('Punjab');
  const [customSector, setCustomSector] = useState<'Public' | 'Private'>('Public');
  const [customError, setCustomError] = useState<string | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Focus search input when opening
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => searchInputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  const allUniversities = useMemo(() => getAllHecUniversities(), [isOpen, isCustomFormOpen]);

  // Find currently selected university object if available
  const selectedUni = useMemo(() => {
    if (!value) return null;
    const clean = value.toLowerCase().trim();
    return (
      allUniversities.find(
        u =>
          u.name.toLowerCase() === clean ||
          u.shortName.toLowerCase() === clean ||
          u.id.toLowerCase() === clean
      ) || null
    );
  }, [value, allUniversities]);

  // Filtered universities based on search and pills
  const filteredUniversities = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    return allUniversities.filter(u => {
      // Sector filter
      if (sectorFilter !== 'All' && u.sector !== sectorFilter) return false;
      // Province filter
      if (provinceFilter !== 'All' && u.province !== provinceFilter) return false;

      // Text search
      if (!q) return true;
      const matchName = u.name.toLowerCase().includes(q);
      const matchShort = u.shortName.toLowerCase().includes(q);
      const matchCity = (u.city || '').toLowerCase().includes(q);
      const matchLoc = (u.location || '').toLowerCase().includes(q);
      const matchProvince = (u.province || '').toLowerCase().includes(q);

      return matchName || matchShort || matchCity || matchLoc || matchProvince;
    });
  }, [allUniversities, searchQuery, sectorFilter, provinceFilter]);

  const handleSelect = (uni: University) => {
    onChange(uni.name, uni.id, uni.isCustom, {
      name: uni.name,
      city: uni.city,
      province: uni.province,
      sector: uni.sector
    });
    setIsOpen(false);
    setSearchQuery('');
  };

  const handleCreateCustom = (e: React.FormEvent) => {
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
        studentId
      });

      onChange(created.name, created.id, true, {
        name: created.name,
        city: created.city,
        province: created.province,
        sector: created.sector
      });

      setIsCustomFormOpen(false);
      setIsOpen(false);
      setCustomName('');
      setCustomCity('');
      setCustomError(null);
    } catch {
      setCustomError('Could not register institution. Please try again.');
    }
  };

  const provinces = ['All', 'Islamabad', 'Punjab', 'Sindh', 'Khyber Pakhtunkhwa', 'Balochistan', 'Azad Jammu & Kashmir', 'Gilgit-Baltistan'];

  return (
    <div className={`relative ${className}`} ref={containerRef}>
      {label && (
        <label className="block text-[11px] font-semibold text-white/80 mb-1 flex items-center justify-between">
          <span className="flex items-center gap-1.5">
            <Building2 className="w-3.5 h-3.5 text-cyan-400" />
            <span>{label}</span>
          </span>
          <span className="text-[10px] text-cyan-300 font-mono flex items-center gap-1">
            <ShieldCheck className="w-3 h-3 text-emerald-400" />
            <span>HEC Master Directory</span>
          </span>
        </label>
      )}

      {/* Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-3.5 py-2.5 bg-white/[0.04] hover:bg-white/[0.07] border border-white/15 focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 rounded-xl text-left text-xs transition-all flex items-center justify-between gap-2 cursor-pointer shadow-inner group"
      >
        <div className="flex items-center gap-2.5 min-w-0 flex-1">
          <div className="w-6 h-6 rounded-lg bg-cyan-500/10 border border-cyan-400/20 flex items-center justify-center text-cyan-400 shrink-0 group-hover:scale-105 transition-transform">
            <Building2 className="w-3.5 h-3.5" />
          </div>

          {selectedUni ? (
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-semibold text-white truncate">
                  {selectedUni.name}
                </span>
                {selectedUni.shortName && (
                  <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-cyan-400/10 border border-cyan-400/20 text-cyan-300">
                    {selectedUni.shortName}
                  </span>
                )}
                {selectedUni.isCustom && (
                  <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-amber-500/10 border border-amber-500/30 text-amber-300">
                    Pending Verification
                  </span>
                )}
              </div>
              <span className="text-[10px] text-white/40 block truncate">
                {selectedUni.location || selectedUni.city} • {selectedUni.sector || 'HEC Institution'}
              </span>
            </div>
          ) : value ? (
            <div className="min-w-0 flex-1">
              <span className="font-medium text-white truncate block">{value}</span>
              <span className="text-[10px] text-amber-300/80 font-mono">Custom Institution</span>
            </div>
          ) : (
            <span className="text-white/40 truncate">{placeholder}</span>
          )}
        </div>

        <ChevronDown
          className={`w-4 h-4 text-white/40 transition-transform shrink-0 ${
            isOpen ? 'rotate-180 text-cyan-400' : ''
          }`}
        />
      </button>

      {/* Hidden input for form validation */}
      {required && (
        <input
          type="text"
          value={value}
          readOnly
          required
          className="opacity-0 absolute pointer-events-none h-0 w-0"
        />
      )}

      {/* Dropdown Panel */}
      {isOpen && (
        <div className="absolute z-50 left-0 right-0 mt-2 bg-[#0d0f14]/98 border border-white/15 rounded-2xl shadow-[0_15px_50px_rgba(0,0,0,0.85)] backdrop-blur-2xl overflow-hidden animate-in fade-in slide-in-from-top-2 duration-150 font-outfit">
          {/* Cyan top accent */}
          <div className="h-0.5 bg-gradient-to-r from-cyan-500/20 via-cyan-400 to-cyan-500/20" />

          {/* Search Bar */}
          <div className="p-3 border-b border-white/10 bg-white/[0.02]">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-white/40 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search by institution name, acronym (e.g. NUST, FAST), or city..."
                className="w-full pl-8 pr-8 py-2 bg-white/[0.04] border border-white/10 rounded-xl text-white placeholder-white/30 text-xs focus:outline-none focus:border-cyan-400 transition-colors"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-white/40 hover:text-white"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>

            {/* Quick Filter Pills */}
            <div className="flex items-center gap-1.5 mt-2.5 overflow-x-auto no-scrollbar pb-0.5 text-[10px]">
              <div className="flex items-center gap-1 shrink-0 bg-white/[0.03] p-0.5 rounded-lg border border-white/10">
                {(['All', 'Public', 'Private'] as const).map(sec => (
                  <button
                    key={sec}
                    type="button"
                    onClick={() => setSectorFilter(sec)}
                    className={`px-2 py-0.5 rounded-md font-medium transition-all ${
                      sectorFilter === sec
                        ? 'bg-cyan-400 text-black font-bold'
                        : 'text-white/60 hover:text-white'
                    }`}
                  >
                    {sec === 'All' ? 'All Sectors' : `${sec} Sector`}
                  </button>
                ))}
              </div>

              {/* Province Pill Selector */}
              <div className="flex items-center gap-1 shrink-0">
                {provinces.slice(0, 5).map(prov => (
                  <button
                    key={prov}
                    type="button"
                    onClick={() => setProvinceFilter(prov)}
                    className={`px-2 py-0.5 rounded-lg border transition-all ${
                      provinceFilter === prov
                        ? 'bg-white/20 text-white border-white/40 font-semibold'
                        : 'bg-white/[0.02] border-white/5 text-white/50 hover:text-white'
                    }`}
                  >
                    {prov === 'All' ? 'All Regions' : prov}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* List of Universities */}
          <div className="max-h-60 sm:max-h-68 overflow-y-auto p-1.5 space-y-1 no-scrollbar">
            {filteredUniversities.length === 0 ? (
              <div className="py-6 px-4 text-center">
                <Building2 className="w-8 h-8 text-white/20 mx-auto mb-2" />
                <p className="text-xs font-semibold text-white/70">No matching HEC university found</p>
                <p className="text-[11px] text-white/40 mt-1 max-w-xs mx-auto">
                  Can't find your specific college or degree institute in the master registry?
                </p>
                {allowCustom && (
                  <button
                    type="button"
                    onClick={() => setIsCustomFormOpen(true)}
                    className="mt-3 inline-flex items-center gap-1.5 px-3 py-1.5 bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-300 border border-cyan-400/30 rounded-xl text-xs font-semibold transition-all cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Custom / Other Institution</span>
                  </button>
                )}
              </div>
            ) : (
              filteredUniversities.map(uni => {
                const isSelected =
                  selectedUni?.id === uni.id ||
                  value.toLowerCase().trim() === uni.name.toLowerCase().trim();

                return (
                  <button
                    key={uni.id}
                    type="button"
                    onClick={() => handleSelect(uni)}
                    className={`w-full text-left p-2.5 rounded-xl transition-all cursor-pointer flex items-center justify-between gap-3 border ${
                      isSelected
                        ? 'bg-cyan-400/[0.12] border-cyan-400/50 text-white shadow-[0_0_15px_rgba(0,240,255,0.15)]'
                        : 'bg-white/[0.02] border-transparent hover:bg-white/[0.05] hover:border-white/10 text-white/80 hover:text-white'
                    }`}
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap mb-0.5">
                        <span className="font-semibold text-xs leading-tight">
                          {uni.name}
                        </span>
                        {uni.shortName && (
                          <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-white/10 text-cyan-300 border border-white/10">
                            {uni.shortName}
                          </span>
                        )}
                        {uni.sector && (
                          <span className="text-[9px] px-1.5 py-0.2 rounded bg-white/5 border border-white/10 text-white/60">
                            {uni.sector}
                          </span>
                        )}
                        {uni.isCustom && (
                          <span className="text-[9px] px-1.5 py-0.2 rounded bg-amber-500/10 text-amber-300 border border-amber-500/30">
                            Custom
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-2 text-[10px] text-white/40 truncate">
                        <span className="flex items-center gap-1">
                          <MapPin className="w-2.5 h-2.5 text-cyan-400 shrink-0" />
                          <span className="truncate">{uni.city || uni.location}</span>
                        </span>
                        {uni.hecRecognized && (
                          <span className="text-emerald-400 flex items-center gap-0.5 font-mono">
                            <ShieldCheck className="w-2.5 h-2.5 shrink-0" />
                            <span>HEC Verified</span>
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="shrink-0 flex items-center gap-1.5">
                      {isSelected ? (
                        <div className="w-5 h-5 rounded-full bg-cyan-400 text-black flex items-center justify-center">
                          <Check className="w-3 h-3 stroke-[3]" />
                        </div>
                      ) : (
                        <span className="text-[10px] text-white/30 font-mono">Select</span>
                      )}
                    </div>
                  </button>
                );
              })
            )}
          </div>

          {/* Footer Action: Custom / Other Institution */}
          {allowCustom && (
            <div className="p-2.5 border-t border-white/10 bg-white/[0.02] flex items-center justify-between">
              <span className="text-[10px] text-white/40">
                Can't find your institution?
              </span>
              <button
                type="button"
                onClick={() => setIsCustomFormOpen(true)}
                className="text-[11px] font-semibold text-cyan-300 hover:text-cyan-200 transition-colors flex items-center gap-1 cursor-pointer hover:underline"
              >
                <Plus className="w-3 h-3" />
                <span>Custom / Other Institution</span>
              </button>
            </div>
          )}
        </div>
      )}

      {/* Custom Institution Modal Flow */}
      {isCustomFormOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md font-outfit animate-in fade-in duration-200">
          <div className="relative w-full max-w-md bg-[#0c0d12] border border-white/15 rounded-2xl shadow-2xl p-5 sm:p-6 text-white overflow-hidden">
            <div className="absolute top-0 inset-x-0 h-0.5 bg-gradient-to-r from-cyan-500 via-amber-400 to-cyan-500" />

            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center">
                  <Sparkles className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-sm tracking-tight">Add Custom / Other Institution</h3>
                  <p className="text-[11px] text-white/50">Register an unlisted college or university</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsCustomFormOpen(false);
                  setCustomError(null);
                }}
                className="p-1 text-white/40 hover:text-white rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Explanatory Banner */}
            <div className="p-3 bg-white/[0.03] border border-white/10 rounded-xl mb-4 text-[11px] text-white/70 space-y-1 leading-relaxed">
              <p className="flex items-center gap-1.5 font-medium text-amber-300">
                <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                <span>Pending Verification Directory</span>
              </p>
              <p className="text-white/50">
                Entering a custom institution creates an unverified campus directory mapped strictly to your academic profile. It will immediately unlock and appear in Explore so your classmates can find and join it.
              </p>
            </div>

            {customError && (
              <div className="p-2.5 mb-3 bg-rose-500/10 border border-rose-500/30 text-rose-300 rounded-xl text-[11px]">
                {customError}
              </div>
            )}

            <form onSubmit={handleCreateCustom} className="space-y-3.5">
              <div>
                <label className="block text-[11px] font-semibold text-white/80 mb-1">
                  Full Institution / College Name *
                </label>
                <input
                  type="text"
                  required
                  value={customName}
                  onChange={e => setCustomName(e.target.value)}
                  placeholder="e.g. Government Postgraduate College Sialkot"
                  className="w-full px-3 py-2 bg-white/[0.04] border border-white/15 rounded-xl text-xs text-white placeholder-white/30 focus:outline-none focus:border-cyan-400 transition-colors"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-white/80 mb-1">
                    City / District
                  </label>
                  <input
                    type="text"
                    value={customCity}
                    onChange={e => setCustomCity(e.target.value)}
                    placeholder="e.g. Sialkot, Rawalpindi"
                    className="w-full px-3 py-2 bg-white/[0.04] border border-white/15 rounded-xl text-xs text-white placeholder-white/30 focus:outline-none focus:border-cyan-400 transition-colors"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-white/80 mb-1">
                    Province / Region
                  </label>
                  <select
                    value={customProvince}
                    onChange={e => setCustomProvince(e.target.value)}
                    className="w-full px-2.5 py-2 bg-[#12141a] border border-white/15 rounded-xl text-xs text-white focus:outline-none focus:border-cyan-400 transition-colors"
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
                <label className="block text-[11px] font-semibold text-white/80 mb-1.5">
                  Sector Classification
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {(['Public', 'Private'] as const).map(sec => (
                    <button
                      key={sec}
                      type="button"
                      onClick={() => setCustomSector(sec)}
                      className={`py-2 px-3 rounded-xl border text-xs font-semibold transition-all ${
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

              <div className="pt-2 flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsCustomFormOpen(false)}
                  className="flex-1 py-2 px-3 bg-white/5 hover:bg-white/10 text-white/70 rounded-xl text-xs transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2 px-3 bg-cyan-400 hover:bg-cyan-300 text-black font-bold rounded-xl text-xs transition-all shadow-[0_0_15px_rgba(0,240,255,0.3)] flex items-center justify-center gap-1.5 active:scale-98"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>Link & Unlock Campus</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
