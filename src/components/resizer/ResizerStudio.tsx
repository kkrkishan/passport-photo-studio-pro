import React, { useState } from 'react';
import {
  Maximize2,
  Minimize2,
  FileText,
  Briefcase,
  Sliders,
  Images,
  Layers,
  LayoutDashboard,
  ShieldCheck,
  CheckCircle2,
  ArrowRight,
  Sparkles,
  Info
} from 'lucide-react';
import { PhotoResizerView } from './PhotoResizerView';
import { PhotoCompressorView } from './PhotoCompressorView';
import { ExamPresetsView } from './ExamPresetsView';
import { CustomPresetBuilderView } from './CustomPresetBuilderView';
import { PdfResizerView } from './PdfResizerView';
import { ImagesToPdfView } from './ImagesToPdfView';
import { BatchProcessorView } from './BatchProcessorView';
import { ExamPreset } from '../../types';

interface ResizerStudioProps {
  onNotify?: (msg: string) => void;
}

type SubTab =
  | 'overview'
  | 'photo-resizer'
  | 'photo-compressor'
  | 'exam-presets'
  | 'custom-presets'
  | 'pdf-resizer'
  | 'images-to-pdf'
  | 'batch';

export const ResizerStudio: React.FC<ResizerStudioProps> = ({ onNotify }) => {
  const [activeTab, setActiveTab] = useState<SubTab>('overview');

  const navItems = [
    { id: 'overview', label: 'Resizer Dashboard', icon: LayoutDashboard },
    { id: 'photo-resizer', label: 'Photo Resizer', icon: Maximize2 },
    { id: 'photo-compressor', label: 'Photo Compressor (KB)', icon: Minimize2 },
    { id: 'exam-presets', label: 'Exam Presets', icon: Briefcase },
    { id: 'custom-presets', label: 'Custom Presets', icon: Sliders },
    { id: 'pdf-resizer', label: 'PDF Resizer & Compress', icon: FileText },
    { id: 'images-to-pdf', label: 'Images to PDF', icon: Images },
    { id: 'batch', label: 'Batch Processing', icon: Layers },
  ];

  const handleApplyPreset = (preset: ExamPreset, mode: 'resizer' | 'compressor') => {
    setActiveTab(mode === 'resizer' ? 'photo-resizer' : 'photo-compressor');
    onNotify?.(`Preset applied: ${preset.name}`);
  };

  return (
    <div className="flex-1 flex flex-col md:flex-row overflow-hidden bg-[#0b0f19] text-slate-100 select-none">
      {/* Mobile Sub-Navigation Pills (Scrollable) */}
      <div className="flex md:hidden overflow-x-auto gap-1.5 p-2 bg-slate-900 border-b border-slate-800 shrink-0 no-scrollbar">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id as SubTab)}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition shrink-0 active:scale-95 ${
                isActive
                  ? 'bg-amber-600 text-white shadow-md'
                  : 'bg-slate-800 text-slate-400 hover:text-white'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{item.label}</span>
            </button>
          );
        })}
      </div>

      {/* Resizer Desktop Left Sidebar Navigation */}
      <aside className="hidden md:flex w-64 bg-slate-900/95 border-r border-slate-800 flex-col justify-between p-3 shrink-0">
        <div className="space-y-4">
          {/* Header Title inside Resizer */}
          <div className="px-3 pt-2">
            <div className="text-[10px] font-mono uppercase tracking-wider text-amber-400 font-bold mb-0.5">
              MODULE 3
            </div>
            <h1 className="text-sm font-black bg-gradient-to-r from-amber-400 via-orange-300 to-yellow-400 bg-clip-text text-transparent">
              PHOTO & DOCUMENT RESIZER PRO
            </h1>
            <p className="text-[10px] text-slate-400 mt-0.5">
              Resize, Compress, Adjust DPI & Prepare Forms
            </p>
          </div>

          <div className="h-px bg-slate-800/80 mx-2" />

          {/* Navigation Links */}
          <nav className="space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id as SubTab)}
                  className={`w-full flex items-center space-x-2.5 px-3 py-2 rounded-xl text-xs font-semibold transition ${
                    isActive
                      ? 'bg-amber-600/20 text-amber-300 border border-amber-500/30 shadow-sm'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                  }`}
                >
                  <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-amber-400' : 'text-slate-400'}`} />
                  <span className="truncate">{item.label}</span>
                </button>
              );
            })}
          </nav>
        </div>

        {/* Bottom Trust Badge */}
        <div className="p-3 bg-slate-950/70 border border-slate-800/80 rounded-xl space-y-1 text-[11px] text-slate-400">
          <div className="flex items-center space-x-1.5 text-emerald-400 font-semibold">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>100% Offline & Private</span>
          </div>
          <p className="text-[10px] text-slate-500 leading-tight">
            Your photos and documents never leave your computer.
          </p>
        </div>
      </aside>

      {/* Main Resizer Work Area */}
      <main className="flex-1 flex overflow-hidden bg-gradient-to-b from-[#0b0f19] via-[#0d1424] to-[#0b0f19]">
        {activeTab === 'overview' && (
          <div className="flex-1 overflow-y-auto p-4 sm:p-8 space-y-6 sm:space-y-8 max-w-6xl mx-auto">
            {/* Overview Hero Header */}
            <div className="space-y-2 text-center max-w-3xl mx-auto pt-2 sm:pt-4">
              <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs font-semibold">
                <Sparkles className="w-3.5 h-3.5" />
                <span>One-Stop Station for Online Application Documents</span>
              </div>
              <h2 className="text-xl sm:text-3xl font-extrabold text-white">
                PHOTO & DOCUMENT RESIZER PRO
              </h2>
              <p className="text-xs text-slate-400 leading-relaxed">
                Seamlessly prepare photos, signatures, certificates, and PDF files matching strict government recruitment
                specifications (IBPS, SBI, SSC, UPSC, RRB, NEET, Rajasthan portals) without opening multiple websites.
              </p>
            </div>

            {/* Quick Action Cards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              {/* Card 1: Photo Resizer */}
              <div
                onClick={() => setActiveTab('photo-resizer')}
                className="bg-slate-900/90 hover:bg-slate-850 border border-slate-800 hover:border-blue-500/50 rounded-2xl p-6 cursor-pointer transition-all duration-200 group flex flex-col justify-between space-y-4"
              >
                <div className="space-y-3">
                  <div className="w-12 h-12 rounded-xl bg-blue-600/10 border border-blue-500/20 flex items-center justify-center text-blue-400 group-hover:scale-105 transition-transform">
                    <Maximize2 className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-white group-hover:text-blue-300 transition-colors">
                      Photo Resizer
                    </h3>
                    <p className="text-xs text-slate-400 mt-1">
                      Resize photos by exact pixels, mm, cm, inches or %, with aspect ratio lock and DPI calibration.
                    </p>
                  </div>
                </div>
                <div className="flex items-center text-xs font-bold text-blue-400 group-hover:translate-x-1 transition-transform">
                  <span>Open Resizer</span>
                  <ArrowRight className="w-3.5 h-3.5 ml-1" />
                </div>
              </div>

              {/* Card 2: Photo Compressor */}
              <div
                onClick={() => setActiveTab('photo-compressor')}
                className="bg-slate-900/90 hover:bg-slate-850 border border-slate-800 hover:border-emerald-500/50 rounded-2xl p-6 cursor-pointer transition-all duration-200 group flex flex-col justify-between space-y-4"
              >
                <div className="space-y-3">
                  <div className="w-12 h-12 rounded-xl bg-emerald-600/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 group-hover:scale-105 transition-transform">
                    <Minimize2 className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-white group-hover:text-emerald-300 transition-colors">
                      Photo Compressor (KB)
                    </h3>
                    <p className="text-xs text-slate-400 mt-1">
                      Target exact file sizes (20KB, 50KB, 100KB) using binary-search JPEG quality optimization.
                    </p>
                  </div>
                </div>
                <div className="flex items-center text-xs font-bold text-emerald-400 group-hover:translate-x-1 transition-transform">
                  <span>Open Compressor</span>
                  <ArrowRight className="w-3.5 h-3.5 ml-1" />
                </div>
              </div>

              {/* Card 3: PDF Resizer & Compressor */}
              <div
                onClick={() => setActiveTab('pdf-resizer')}
                className="bg-slate-900/90 hover:bg-slate-850 border border-slate-800 hover:border-rose-500/50 rounded-2xl p-6 cursor-pointer transition-all duration-200 group flex flex-col justify-between space-y-4"
              >
                <div className="space-y-3">
                  <div className="w-12 h-12 rounded-xl bg-rose-600/10 border border-rose-500/20 flex items-center justify-center text-rose-400 group-hover:scale-105 transition-transform">
                    <FileText className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-white group-hover:text-rose-300 transition-colors">
                      PDF Resizer & Compress
                    </h3>
                    <p className="text-xs text-slate-400 mt-1">
                      Compress certificates and marksheets to 200KB / 500KB and resize page to A4, A5 or Letter.
                    </p>
                  </div>
                </div>
                <div className="flex items-center text-xs font-bold text-rose-400 group-hover:translate-x-1 transition-transform">
                  <span>Open PDF Tool</span>
                  <ArrowRight className="w-3.5 h-3.5 ml-1" />
                </div>
              </div>

              {/* Card 4: Exam Presets */}
              <div
                onClick={() => setActiveTab('exam-presets')}
                className="bg-slate-900/90 hover:bg-slate-850 border border-slate-800 hover:border-indigo-500/50 rounded-2xl p-6 cursor-pointer transition-all duration-200 group flex flex-col justify-between space-y-4"
              >
                <div className="space-y-3">
                  <div className="w-12 h-12 rounded-xl bg-indigo-600/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 group-hover:scale-105 transition-transform">
                    <Briefcase className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-white group-hover:text-indigo-300 transition-colors">
                      Exam Presets
                    </h3>
                    <p className="text-xs text-slate-400 mt-1">
                      Pre-calibrated profiles for IBPS, SBI, SSC, UPSC, RRB, NEET, Rajasthan, College & Passports.
                    </p>
                  </div>
                </div>
                <div className="flex items-center text-xs font-bold text-indigo-400 group-hover:translate-x-1 transition-transform">
                  <span>Explore Presets</span>
                  <ArrowRight className="w-3.5 h-3.5 ml-1" />
                </div>
              </div>

              {/* Card 5: Images to PDF */}
              <div
                onClick={() => setActiveTab('images-to-pdf')}
                className="bg-slate-900/90 hover:bg-slate-850 border border-slate-800 hover:border-cyan-500/50 rounded-2xl p-6 cursor-pointer transition-all duration-200 group flex flex-col justify-between space-y-4"
              >
                <div className="space-y-3">
                  <div className="w-12 h-12 rounded-xl bg-cyan-600/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400 group-hover:scale-105 transition-transform">
                    <Images className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-white group-hover:text-cyan-300 transition-colors">
                      Images to PDF
                    </h3>
                    <p className="text-xs text-slate-400 mt-1">
                      Combine multiple scans, photos, or certificate images into a single organized PDF document.
                    </p>
                  </div>
                </div>
                <div className="flex items-center text-xs font-bold text-cyan-400 group-hover:translate-x-1 transition-transform">
                  <span>Create PDF</span>
                  <ArrowRight className="w-3.5 h-3.5 ml-1" />
                </div>
              </div>

              {/* Card 6: Batch Processing */}
              <div
                onClick={() => setActiveTab('batch')}
                className="bg-slate-900/90 hover:bg-slate-850 border border-slate-800 hover:border-purple-500/50 rounded-2xl p-6 cursor-pointer transition-all duration-200 group flex flex-col justify-between space-y-4"
              >
                <div className="space-y-3">
                  <div className="w-12 h-12 rounded-xl bg-purple-600/10 border border-purple-500/20 flex items-center justify-center text-purple-400 group-hover:scale-105 transition-transform">
                    <Layers className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-white group-hover:text-purple-300 transition-colors">
                      Batch Processing Queue
                    </h3>
                    <p className="text-xs text-slate-400 mt-1">
                      Process multiple student or candidate photos in bulk with a single preset or KB target.
                    </p>
                  </div>
                </div>
                <div className="flex items-center text-xs font-bold text-purple-400 group-hover:translate-x-1 transition-transform">
                  <span>Open Batch Queue</span>
                  <ArrowRight className="w-3.5 h-3.5 ml-1" />
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'photo-resizer' && (
          <PhotoResizerView onNotify={onNotify} />
        )}

        {activeTab === 'photo-compressor' && (
          <PhotoCompressorView onNotify={onNotify} />
        )}

        {activeTab === 'exam-presets' && (
          <ExamPresetsView onApplyPreset={handleApplyPreset} onNotify={onNotify} />
        )}

        {activeTab === 'custom-presets' && (
          <CustomPresetBuilderView onNotify={onNotify} />
        )}

        {activeTab === 'pdf-resizer' && (
          <PdfResizerView onNotify={onNotify} />
        )}

        {activeTab === 'images-to-pdf' && (
          <ImagesToPdfView onNotify={onNotify} />
        )}

        {activeTab === 'batch' && (
          <BatchProcessorView onNotify={onNotify} />
        )}
      </main>
    </div>
  );
};
