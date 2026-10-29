import React from 'react';
import { X, Sparkles, Download, ExternalLink, Calendar, CheckCircle2 } from 'lucide-react';
import { UpdateInfo } from '../../types';

interface UpdateModalProps {
  isOpen: boolean;
  updateInfo: UpdateInfo | null;
  onClose: () => void;
}

export const UpdateModal: React.FC<UpdateModalProps> = ({
  isOpen,
  updateInfo,
  onClose,
}) => {
  if (!isOpen || !updateInfo) return null;

  const electronAPI = (window as any).electronAPI;

  const handleDownload = () => {
    const url = updateInfo.releaseUrl || 'https://github.com/kkrkishan/passport-photo-studio-pro/releases';
    if (electronAPI && electronAPI.openExternal) {
      electronAPI.openExternal(url);
    } else {
      window.open(url, '_blank');
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in select-none">
      <div className="bg-slate-900 border border-slate-700/80 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl flex flex-col">
        {/* Header with vibrant accent */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-gradient-to-r from-blue-950/60 via-indigo-950/40 to-slate-950/60">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-blue-600 via-indigo-500 to-cyan-400 flex items-center justify-center text-white shadow-lg shadow-blue-500/20">
              <Sparkles className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <h3 className="font-bold text-white text-base tracking-wide flex items-center gap-2">
                <span>नया अपडेट उपलब्ध है!</span>
                <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                  Update Ready
                </span>
              </h3>
              <p className="text-xs text-blue-300 font-mono">
                Passport Photo Studio Pro • {updateInfo.latestVersion}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition"
            title="बंद करें (Close)"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-4 text-xs text-slate-300 overflow-y-auto max-h-[60vh]">
          {/* Version badge comparison */}
          <div className="flex items-center justify-between p-3.5 bg-slate-800/60 border border-slate-700/60 rounded-xl">
            <div className="space-y-0.5">
              <span className="text-[10px] text-slate-400 uppercase tracking-wider block font-semibold">मौजूदा वर्ज़न (Current)</span>
              <span className="font-mono text-sm font-bold text-slate-300">{updateInfo.currentVersion}</span>
            </div>
            <div className="text-slate-500 font-bold text-base">➔</div>
            <div className="space-y-0.5 text-right">
              <span className="text-[10px] text-emerald-400 uppercase tracking-wider block font-semibold">नया वर्ज़न (New)</span>
              <span className="font-mono text-sm font-bold text-emerald-400">{updateInfo.latestVersion}</span>
            </div>
          </div>

          {/* Release Name & Date */}
          {updateInfo.publishedAt && (
            <div className="flex items-center space-x-1.5 text-[11px] text-slate-400">
              <Calendar className="w-3.5 h-3.5 text-blue-400" />
              <span>रिलीज़ दिनांक: {new Date(updateInfo.publishedAt).toLocaleDateString('hi-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
            </div>
          )}

          {/* Changelog / Release Notes */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-semibold text-slate-200 block uppercase tracking-wider">
              इस अपडेट में क्या नया है (Changelog):
            </label>
            <div className="p-3 bg-slate-950/70 border border-slate-800 rounded-xl font-sans text-slate-300 leading-relaxed whitespace-pre-line text-[11px] max-h-40 overflow-y-auto">
              {updateInfo.releaseNotes || 'नया परफॉरमेंस सुधार और बग फिक्स उपलब्ध हैं।'}
            </div>
          </div>

          {/* Microsoft Store / GitHub Notice */}
          <div className="p-3 bg-blue-950/30 border border-blue-900/40 rounded-xl flex items-start space-x-2 text-[11px] text-blue-200/90">
            <CheckCircle2 className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
            <p>
              यदि आपने इसे Microsoft Store से इंस्टॉल किया है, तो Windows बैकग्राउंड में स्वतः अपडेट कर देगा। या फिर आप नीचे दिए बटन से तुरंत नया इंस्टॉलर डाउनलोड कर सकते हैं।
            </p>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 bg-slate-950/80 border-t border-slate-800 flex items-center justify-between">
          <button
            onClick={onClose}
            className="px-4 py-2 text-slate-400 hover:text-slate-200 hover:bg-slate-800/80 rounded-xl transition text-xs font-medium"
          >
            बाद में याद दिलाएं (Later)
          </button>
          <button
            onClick={handleDownload}
            className="flex items-center space-x-2 px-5 py-2.5 bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-500 hover:from-blue-500 hover:to-indigo-500 text-white rounded-xl shadow-lg shadow-blue-500/25 font-semibold text-xs transition transform hover:scale-[1.02] active:scale-[0.98]"
          >
            <Download className="w-4 h-4" />
            <span>अभी अपडेट डाउनलोड करें</span>
            <ExternalLink className="w-3.5 h-3.5 ml-1 opacity-75" />
          </button>
        </div>
      </div>
    </div>
  );
};
