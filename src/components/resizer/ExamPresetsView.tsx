import React, { useState } from 'react';
import {
  ShieldAlert,
  Search,
  CheckCircle2,
  ExternalLink,
  ArrowRight,
  Sliders,
  Copy,
  Info,
  Building,
  GraduationCap,
  Train,
  Briefcase
} from 'lucide-react';
import { ExamPreset, ExamPresetCategory } from '../../types';
import { getAllPresets, duplicatePreset } from '../../services/presetStorageService';

interface ExamPresetsViewProps {
  onApplyPreset: (preset: ExamPreset, mode: 'resizer' | 'compressor') => void;
  onNotify?: (msg: string) => void;
}

export const ExamPresetsView: React.FC<ExamPresetsViewProps> = ({ onApplyPreset, onNotify }) => {
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [presets, setPresets] = useState<ExamPreset[]>(getAllPresets());

  const categories = [
    { id: 'all', label: 'All Exams & Portals' },
    { id: 'banking', label: 'Banking (IBPS/SBI)' },
    { id: 'railway', label: 'Railway (RRB)' },
    { id: 'ssc', label: 'SSC (CGL/CHSL)' },
    { id: 'upsc', label: 'UPSC' },
    { id: 'nta', label: 'NTA (NEET/JEE)' },
    { id: 'rajasthan', label: 'Rajasthan (RSMSSB/RPSC)' },
    { id: 'education', label: 'College & Scholarships' },
    { id: 'other', label: 'Passports & ID Cards' },
  ];

  const filteredPresets = presets.filter((p) => {
    const matchesCat = selectedCategory === 'all' || p.category === selectedCategory;
    const matchesSearch =
      searchQuery.trim() === '' ||
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.notes.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.category.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCat && matchesSearch;
  });

  const handleDuplicate = (preset: ExamPreset) => {
    duplicatePreset(preset);
    setPresets(getAllPresets());
    onNotify?.(`Preset duplicated: ${preset.name} (Copy)`);
  };

  return (
    <div className="flex-1 flex flex-col p-6 overflow-y-auto space-y-6">
      {/* Top Banner */}
      <div>
        <h2 className="text-xl font-black text-white flex items-center space-x-2">
          <Briefcase className="w-5 h-5 text-indigo-400" />
          <span>Government Exam & Portal Photo Presets</span>
        </h2>
        <p className="text-xs text-slate-400 mt-0.5">
          Standardized dimension & file-size configurations for IBPS, SSC, UPSC, Railway, NEET, JEE, and State exams.
        </p>
      </div>

      {/* Official Safety Notice Banner */}
      <div className="bg-amber-500/10 border border-amber-500/25 rounded-2xl p-4 flex items-start space-x-3 text-xs text-amber-200/90 leading-relaxed">
        <ShieldAlert className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
        <div>
          <span className="font-bold text-amber-300">Important Safety Disclaimer: </span>
          Online recruitment rules and notification specifications may change with every exam cycle. Always verify
          exact dimension and file size requirements in the latest official examination notification brochure before final submission.
        </div>
      </div>

      {/* Search & Categories Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Category Pills */}
        <div className="flex items-center space-x-1.5 overflow-x-auto pb-1 max-w-full">
          {categories.map((c) => (
            <button
              key={c.id}
              onClick={() => setSelectedCategory(c.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition ${
                selectedCategory === c.id
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-900/30'
                  : 'bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800'
              }`}
            >
              {c.label}
            </button>
          ))}
        </div>

        {/* Search Input */}
        <div className="relative min-w-[240px]">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search exam presets..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-9 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
          />
        </div>
      </div>

      {/* Preset Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredPresets.map((preset) => (
          <div
            key={preset.id}
            className="bg-slate-900/90 border border-slate-800 hover:border-indigo-500/50 rounded-2xl p-5 flex flex-col justify-between space-y-4 transition-all duration-200 group"
          >
            {/* Top: Title & Badges */}
            <div className="space-y-2">
              <div className="flex items-start justify-between gap-2">
                <h3 className="text-sm font-bold text-white group-hover:text-indigo-300 transition-colors">
                  {preset.name}
                </h3>
                {preset.isVerified ? (
                  <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[10px] font-semibold shrink-0">
                    <CheckCircle2 className="w-3 h-3" />
                    <span>Verified</span>
                  </span>
                ) : (
                  <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-[10px] font-semibold shrink-0">
                    <span>User Custom</span>
                  </span>
                )}
              </div>

              {/* Specs Badge Strip */}
              <div className="flex flex-wrap gap-1.5 pt-1">
                <span className="px-2 py-0.5 rounded-lg bg-slate-950 border border-slate-800 text-[11px] font-mono text-indigo-300 font-bold">
                  {preset.width} × {preset.height} {preset.unit}
                </span>

                {preset.minKB && preset.maxKB && (
                  <span className="px-2 py-0.5 rounded-lg bg-slate-950 border border-slate-800 text-[11px] font-mono text-emerald-400 font-semibold">
                    {preset.minKB}–{preset.maxKB} KB
                  </span>
                )}

                {preset.dpi && (
                  <span className="px-2 py-0.5 rounded-lg bg-slate-950 border border-slate-800 text-[11px] font-mono text-slate-400">
                    {preset.dpi} DPI
                  </span>
                )}

                <span className="px-2 py-0.5 rounded-lg bg-slate-950 border border-slate-800 text-[11px] font-mono text-slate-400 uppercase">
                  {preset.allowedFormats.join(', ')}
                </span>
              </div>

              <p className="text-xs text-slate-400 leading-relaxed pt-1">
                {preset.notes}
              </p>
            </div>

            {/* Bottom: Official Source & Actions */}
            <div className="pt-3 border-t border-slate-800/80 space-y-3">
              <div className="flex items-center justify-between text-[11px] text-slate-500">
                {preset.officialSource ? (
                  <a
                    href={preset.officialSource}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center space-x-1 text-indigo-400 hover:text-indigo-300 hover:underline"
                  >
                    <span>Official Portal</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                ) : (
                  <span>Local Preset</span>
                )}
                <span>Verified: {preset.lastVerifiedDate}</span>
              </div>

              {/* Action Buttons */}
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => onApplyPreset(preset, 'resizer')}
                  className="px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold flex items-center justify-center space-x-1.5 transition"
                >
                  <ArrowRight className="w-3.5 h-3.5" />
                  <span>Resize Photo</span>
                </button>
                <button
                  onClick={() => onApplyPreset(preset, 'compressor')}
                  className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold flex items-center justify-center space-x-1.5 transition"
                >
                  <Sliders className="w-3.5 h-3.5" />
                  <span>Compress KB</span>
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
