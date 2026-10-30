import React from 'react';
import { Home, Camera, FileText, Maximize2, Info } from 'lucide-react';
import { ActiveModule } from '../../types';

interface MobileNavBarProps {
  activeModule: ActiveModule;
  onSelectModule: (module: ActiveModule) => void;
  onOpenAbout: () => void;
}

export const MobileNavBar: React.FC<MobileNavBarProps> = ({
  activeModule,
  onSelectModule,
  onOpenAbout,
}) => {
  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-slate-900/95 backdrop-blur-md border-t border-slate-800/90 px-2 py-1.5 flex items-center justify-around select-none safe-area-bottom shadow-2xl">
      <button
        onClick={() => onSelectModule('dashboard')}
        className={`flex flex-col items-center justify-center py-1 px-3 rounded-xl transition-all ${
          activeModule === 'dashboard'
            ? 'text-blue-400 font-bold scale-105'
            : 'text-slate-400 hover:text-slate-200'
        }`}
      >
        <Home className="w-5 h-5 mb-0.5" />
        <span className="text-[10px] tracking-tight">Home</span>
      </button>

      <button
        onClick={() => onSelectModule('passport')}
        className={`flex flex-col items-center justify-center py-1 px-3 rounded-xl transition-all ${
          activeModule === 'passport'
            ? 'text-blue-400 font-bold scale-105'
            : 'text-slate-400 hover:text-slate-200'
        }`}
      >
        <Camera className="w-5 h-5 mb-0.5" />
        <span className="text-[10px] tracking-tight">Passport</span>
      </button>

      <button
        onClick={() => onSelectModule('scanner')}
        className={`flex flex-col items-center justify-center py-1 px-3 rounded-xl transition-all ${
          activeModule === 'scanner'
            ? 'text-emerald-400 font-bold scale-105'
            : 'text-slate-400 hover:text-slate-200'
        }`}
      >
        <FileText className="w-5 h-5 mb-0.5" />
        <span className="text-[10px] tracking-tight">Scanner</span>
      </button>

      <button
        onClick={() => onSelectModule('resizer')}
        className={`flex flex-col items-center justify-center py-1 px-3 rounded-xl transition-all ${
          activeModule === 'resizer'
            ? 'text-amber-400 font-bold scale-105'
            : 'text-slate-400 hover:text-slate-200'
        }`}
      >
        <Maximize2 className="w-5 h-5 mb-0.5" />
        <span className="text-[10px] tracking-tight">Resizer</span>
      </button>

      <button
        onClick={onOpenAbout}
        className="flex flex-col items-center justify-center py-1 px-3 rounded-xl text-slate-400 hover:text-slate-200 transition-all"
      >
        <Info className="w-5 h-5 mb-0.5 text-blue-400/80" />
        <span className="text-[10px] tracking-tight">About</span>
      </button>
    </nav>
  );
};
