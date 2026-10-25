import React from 'react';
import { Camera, FileText, Printer, ArrowRight, ShieldCheck, CheckCircle2, Sparkles, Layers } from 'lucide-react';
import { ActiveModule } from '../../types';

interface DashboardProps {
  onSelectModule: (module: ActiveModule) => void;
  onOpenImage: () => void;
}

export const Dashboard: React.FC<DashboardProps> = ({ onSelectModule, onOpenImage }) => {
  return (
    <div className="flex-1 overflow-y-auto bg-gradient-to-b from-[#0b0f19] via-[#0f172a] to-[#0b0f19] p-8 flex flex-col items-center justify-center select-none text-slate-100">
      <div className="max-w-4xl w-full text-center space-y-4 mb-10">
        <div className="inline-flex items-center space-x-2 px-3 py-1.5 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-semibold">
          <Sparkles className="w-3.5 h-3.5" />
          <span>Professional Windows Desktop Suite • Offline-First</span>
        </div>

        <h1 className="text-4xl font-extrabold tracking-tight bg-gradient-to-r from-blue-400 via-indigo-200 to-cyan-400 bg-clip-text text-transparent">
          PASSPORT PHOTO STUDIO PRO
        </h1>

        <p className="text-slate-400 text-sm max-w-xl mx-auto leading-relaxed">
          The comprehensive Windows workstation for biometric passport photo creation, intelligent document perspective scanning, and 300 DPI print sheet generation.
        </p>
      </div>

      {/* The Two Main Modules Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl w-full">
        {/* MODULE 1: PASSPORT PHOTO STUDIO */}
        <div
          onClick={() => onSelectModule('passport')}
          className="group relative bg-slate-900/80 hover:bg-slate-850 border border-slate-800 hover:border-blue-500/60 rounded-3xl p-8 cursor-pointer transition-all duration-300 shadow-2xl hover:shadow-blue-900/30 flex flex-col justify-between"
        >
          <div className="space-y-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center text-white shadow-xl shadow-blue-900/40 group-hover:scale-105 transition-transform duration-300">
              <Camera className="w-7 h-7" />
            </div>

            <div>
              <div className="text-[11px] font-mono uppercase tracking-wider text-blue-400 font-bold mb-1">
                MODULE 1
              </div>
              <h2 className="text-2xl font-bold text-white group-hover:text-blue-300 transition-colors">
                PASSPORT PHOTO STUDIO
              </h2>
              <p className="text-xs text-blue-200/70 font-medium mt-1">
                Create, Edit and Print Passport Photos
              </p>
            </div>

            <p className="text-xs text-slate-400 leading-relaxed">
              Biometric face alignment guides, official size presets (35×45 mm, 2×2 inch), studio background replacement, tonal enhancement, and dynamic multi-photo sheet engine (4×6", A4, 5×7").
            </p>

            <ul className="space-y-2 text-xs text-slate-300 pt-2 border-t border-slate-800/80">
              <li className="flex items-center space-x-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-blue-400" />
                <span>35×45 mm, 2×2", 30×40 mm & Custom Presets</span>
              </li>
              <li className="flex items-center space-x-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-blue-400" />
                <span>Face alignment guides & smart studio background</span>
              </li>
              <li className="flex items-center space-x-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-blue-400" />
                <span>Dynamic 4×6" 8-photo & A4 45+ photo layout</span>
              </li>
            </ul>
          </div>

          <div className="pt-6 flex items-center justify-between text-xs font-bold text-blue-400 group-hover:text-blue-300">
            <span>Enter Studio</span>
            <div className="w-8 h-8 rounded-full bg-blue-600/20 flex items-center justify-center group-hover:translate-x-1 transition-transform">
              <ArrowRight className="w-4 h-4" />
            </div>
          </div>
        </div>

        {/* MODULE 2: DOCUMENT SCANNER STUDIO */}
        <div
          onClick={() => onSelectModule('scanner')}
          className="group relative bg-slate-900/80 hover:bg-slate-850 border border-slate-800 hover:border-emerald-500/60 rounded-3xl p-8 cursor-pointer transition-all duration-300 shadow-2xl hover:shadow-emerald-900/30 flex flex-col justify-between"
        >
          <div className="space-y-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-500 flex items-center justify-center text-white shadow-xl shadow-emerald-900/40 group-hover:scale-105 transition-transform duration-300">
              <FileText className="w-7 h-7" />
            </div>

            <div>
              <div className="text-[11px] font-mono uppercase tracking-wider text-emerald-400 font-bold mb-1">
                MODULE 2
              </div>
              <h2 className="text-2xl font-bold text-white group-hover:text-emerald-300 transition-colors">
                DOCUMENT SCANNER STUDIO
              </h2>
              <p className="text-xs text-emerald-200/70 font-medium mt-1">
                Scan, Straighten, Enhance and Print Document Front & Back
              </p>
            </div>

            <p className="text-xs text-slate-400 leading-relaxed">
              Draggable 4-corner perspective rectifying engine (homography), automatic edge detection, Magic Color & high-contrast document filters, and calibrated A4 Front+Back layout.
            </p>

            <ul className="space-y-2 text-xs text-slate-300 pt-2 border-t border-slate-800/80">
              <li className="flex items-center space-x-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                <span>Aadhaar, PAN, Licence, Voter ID, Certificates</span>
              </li>
              <li className="flex items-center space-x-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                <span>4-point draggable pins with precision magnifier loupe</span>
              </li>
              <li className="flex items-center space-x-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                <span>1-Click A4 Front on Top + Back on Bottom</span>
              </li>
            </ul>
          </div>

          <div className="pt-6 flex items-center justify-between text-xs font-bold text-emerald-400 group-hover:text-emerald-300">
            <span>Enter Scanner</span>
            <div className="w-8 h-8 rounded-full bg-emerald-600/20 flex items-center justify-center group-hover:translate-x-1 transition-transform">
              <ArrowRight className="w-4 h-4" />
            </div>
          </div>
        </div>
      </div>

      {/* Footer Trust Bar */}
      <div className="mt-12 flex items-center space-x-8 text-xs text-slate-500">
        <div className="flex items-center space-x-2">
          <ShieldCheck className="w-4 h-4 text-emerald-400" />
          <span>Local Image Processing (Offline Privacy)</span>
        </div>
        <div className="flex items-center space-x-2">
          <Printer className="w-4 h-4 text-blue-400" />
          <span>300 DPI Physical Print Calibration</span>
        </div>
      </div>
    </div>
  );
};
