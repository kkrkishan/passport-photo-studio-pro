import React from 'react';
import { X, ShieldCheck, Cpu, HardDrive, CheckCircle2, Award } from 'lucide-react';

interface AboutModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AboutModal: React.FC<AboutModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-700/80 rounded-2xl w-full max-w-xl overflow-hidden shadow-2xl flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/60">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-blue-600 to-cyan-500 flex items-center justify-center text-white shadow-md">
              <Award className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-white text-base">PASSPORT PHOTO STUDIO PRO</h3>
              <p className="text-xs text-blue-400 font-mono">v1.0.0 • Professional Edition for Windows</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4 text-xs text-slate-300 overflow-y-auto max-h-[70vh]">
          <div className="p-3.5 bg-blue-950/30 border border-blue-800/40 rounded-xl space-y-1.5">
            <div className="font-semibold text-blue-300 flex items-center space-x-1.5">
              <ShieldCheck className="w-4 h-4 text-blue-400" />
              <span>100% Offline & Private Image Processing</span>
            </div>
            <p className="text-slate-400 leading-relaxed">
              All biometric cropping, color enhancement, homography perspective correction, and PDF creation are executed strictly locally on your computer. No photos, scans, or document files are ever uploaded to any cloud server.
            </p>
          </div>

          <div className="grid grid-cols-3 gap-2.5">
            <div className="p-2.5 bg-slate-800/40 rounded-xl border border-slate-700/50">
              <div className="font-medium text-white flex items-center space-x-1.5 mb-1 text-xs">
                <CheckCircle2 className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                <span>Passport Studio</span>
              </div>
              <p className="text-[10px] text-slate-400">
                Biometric alignment, 35×45mm, 2×2", background studio & 4×6"/A4 sheets.
              </p>
            </div>
            <div className="p-2.5 bg-slate-800/40 rounded-xl border border-slate-700/50">
              <div className="font-medium text-white flex items-center space-x-1.5 mb-1 text-xs">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span>Scanner Studio</span>
              </div>
              <p className="text-[10px] text-slate-400">
                4-corner homography warp, document filters, A4 Front+Back layout.
              </p>
            </div>
            <div className="p-2.5 bg-slate-800/40 rounded-xl border border-slate-700/50">
              <div className="font-medium text-white flex items-center space-x-1.5 mb-1 text-xs">
                <CheckCircle2 className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                <span>Resizer Pro</span>
              </div>
              <p className="text-[10px] text-slate-400">
                Target KB compression, exam presets (IBPS, SSC, UPSC), DPI & PDF resize.
              </p>
            </div>
          </div>

          <div className="space-y-1.5 border-t border-slate-800 pt-3">
            <div className="font-semibold text-slate-200">Legal & Verification Notice</div>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              This application is designed solely for photograph cropping, physical print sheet arrangement, and optical straightening of legitimately owned documents. Always verify the specific and updated requirements of the official issuing government agency prior to submitting passport or visa applications.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 bg-slate-950/60 border-t border-slate-800 flex justify-between items-center text-[11px] text-slate-400">
          <span>Engineered for Windows 10 & 11</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-medium transition"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
