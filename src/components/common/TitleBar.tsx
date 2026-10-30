import React, { useState, useEffect } from 'react';
import {
  Minus,
  Square,
  X,
  Camera,
  FolderOpen,
  Save,
  Printer,
  HelpCircle,
  Sparkles,
  FileText,
  Layers,
  Info,
  Maximize2
} from 'lucide-react';
import { ActiveModule } from '../../types';

interface TitleBarProps {
  activeModule: ActiveModule;
  onSelectModule: (mod: ActiveModule) => void;
  onOpenImage: () => void;
  onOpenProject: () => void;
  onSaveProject: () => void;
  onPrint: () => void;
  onOpenAbout: () => void;
  onCheckUpdates?: () => void;
  hasUpdate?: boolean;
}

export const TitleBar: React.FC<TitleBarProps> = ({
  activeModule,
  onSelectModule,
  onOpenImage,
  onOpenProject,
  onSaveProject,
  onPrint,
  onOpenAbout,
  onCheckUpdates,
  hasUpdate,
}) => {
  const [isMaximized, setIsMaximized] = useState(false);
  const [activeMenu, setActiveMenu] = useState<string | null>(null);

  const electronAPI = (window as any).electronAPI;

  useEffect(() => {
    if (electronAPI) {
      electronAPI.isMaximized().then(setIsMaximized);
    }
  }, [electronAPI]);

  const handleMinimize = () => electronAPI?.minimize();
  const handleMaximize = async () => {
    if (electronAPI) {
      const max = await electronAPI.maximize();
      setIsMaximized(max);
    }
  };
  const handleClose = () => electronAPI?.close();

  // Close menus on click outside
  useEffect(() => {
    const handleClickOutside = () => setActiveMenu(null);
    window.addEventListener('click', handleClickOutside);
    return () => window.removeEventListener('click', handleClickOutside);
  }, []);

  return (
    <header
      className="min-h-11 md:h-10 bg-slate-900 border-b border-slate-800 flex items-center justify-between px-3 select-none z-50 text-xs text-slate-300 relative"
      style={{
        paddingTop: 'env(safe-area-inset-top, 0px)',
        WebkitAppRegion: 'drag',
      } as any}
    >
      {/* Left: App Logo, Name & Menu bar */}
      <div className="flex items-center space-x-2 min-w-0" style={{ WebkitAppRegion: 'no-drag' } as any}>
        <div className="flex items-center space-x-2 font-bold tracking-wider text-blue-400 shrink-0">
          <div className="w-6 h-6 rounded bg-gradient-to-tr from-blue-600 to-cyan-500 flex items-center justify-center text-white shadow-md">
            <Camera className="w-3.5 h-3.5" />
          </div>
          <span className="text-xs sm:text-sm font-black bg-gradient-to-r from-blue-400 via-indigo-300 to-cyan-400 bg-clip-text text-transparent truncate max-w-[190px] sm:max-w-none">
            PASSPORT PHOTO STUDIO PRO
          </span>
        </div>

        {/* Desktop Menu Bar (Hidden on Mobile) */}
        <div className="hidden md:flex items-center space-x-1 pl-2">
          {/* File Menu */}
          <div className="relative">
            <button
              onClick={(e) => {
                e.stopPropagation();
                setActiveMenu(activeMenu === 'file' ? null : 'file');
              }}
              className={`px-2.5 py-1 rounded hover:bg-slate-800 transition ${activeMenu === 'file' ? 'bg-slate-800 text-white' : ''}`}
            >
              File
            </button>
            {activeMenu === 'file' && (
              <div
                onClick={(e) => e.stopPropagation()}
                className="absolute left-0 top-full mt-1 w-52 bg-slate-850 bg-slate-900 border border-slate-700/80 rounded-md shadow-2xl py-1 z-50 text-slate-200"
              >
                <button
                  onClick={() => { onOpenImage(); setActiveMenu(null); }}
                  className="w-full text-left px-3 py-1.5 hover:bg-blue-600 flex items-center space-x-2 transition"
                >
                  <FolderOpen className="w-3.5 h-3.5 text-blue-400" />
                  <span>Open Image / Document...</span>
                </button>
                <div className="my-1 border-t border-slate-800" />
                <button
                  onClick={() => { onOpenProject(); setActiveMenu(null); }}
                  className="w-full text-left px-3 py-1.5 hover:bg-blue-600 flex items-center space-x-2 transition"
                >
                  <Layers className="w-3.5 h-3.5 text-amber-400" />
                  <span>Open Project (.ppsp)...</span>
                </button>
                <button
                  onClick={() => { onSaveProject(); setActiveMenu(null); }}
                  className="w-full text-left px-3 py-1.5 hover:bg-blue-600 flex items-center space-x-2 transition"
                >
                  <Save className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Save Project (.ppsp)</span>
                </button>
                <div className="my-1 border-t border-slate-800" />
                <button
                  onClick={() => { onPrint(); setActiveMenu(null); }}
                  className="w-full text-left px-3 py-1.5 hover:bg-blue-600 flex items-center space-x-2 transition"
                >
                  <Printer className="w-3.5 h-3.5 text-slate-300" />
                  <span>Print Document (Ctrl+P)</span>
                </button>
                <div className="my-1 border-t border-slate-800" />
                <button
                  onClick={handleClose}
                  className="w-full text-left px-3 py-1.5 hover:bg-rose-600 flex items-center space-x-2 text-rose-300 hover:text-white transition"
                >
                  <X className="w-3.5 h-3.5" />
                  <span>Exit Software</span>
                </button>
              </div>
            )}
          </div>

          {/* Modules Menu */}
          <div className="relative">
            <button
              onClick={(e) => {
                e.stopPropagation();
                setActiveMenu(activeMenu === 'modules' ? null : 'modules');
              }}
              className={`px-2.5 py-1 rounded hover:bg-slate-800 transition ${activeMenu === 'modules' ? 'bg-slate-800 text-white' : ''}`}
            >
              Modules
            </button>
            {activeMenu === 'modules' && (
              <div
                onClick={(e) => e.stopPropagation()}
                className="absolute left-0 top-full mt-1 w-64 bg-slate-900 border border-slate-700/80 rounded-md shadow-2xl py-1 z-50 text-slate-200"
              >
                <button
                  onClick={() => { onSelectModule('passport'); setActiveMenu(null); }}
                  className={`w-full text-left px-3 py-2 hover:bg-blue-600 flex items-center space-x-2.5 transition ${activeModule === 'passport' ? 'bg-blue-900/40 text-blue-300 font-semibold' : ''}`}
                >
                  <Camera className="w-4 h-4 text-blue-400" />
                  <div>
                    <div className="text-xs">Passport Photo Studio</div>
                    <div className="text-[10px] text-slate-400">Crop, Edit, Biometric & Sheet Maker</div>
                  </div>
                </button>
                <button
                  onClick={() => { onSelectModule('scanner'); setActiveMenu(null); }}
                  className={`w-full text-left px-3 py-2 hover:bg-blue-600 flex items-center space-x-2.5 transition ${activeModule === 'scanner' ? 'bg-blue-900/40 text-blue-300 font-semibold' : ''}`}
                >
                  <FileText className="w-4 h-4 text-emerald-400" />
                  <div>
                    <div className="text-xs">Document Scanner Studio</div>
                    <div className="text-[10px] text-slate-400">Straighten, Enhance & A4 Front+Back</div>
                  </div>
                </button>
                <button
                  onClick={() => { onSelectModule('resizer'); setActiveMenu(null); }}
                  className={`w-full text-left px-3 py-2 hover:bg-blue-600 flex items-center space-x-2.5 transition ${activeModule === 'resizer' ? 'bg-blue-900/40 text-blue-300 font-semibold' : ''}`}
                >
                  <Maximize2 className="w-4 h-4 text-amber-400" />
                  <div>
                    <div className="text-xs">Photo & Document Resizer Pro</div>
                    <div className="text-[10px] text-slate-400">Target KB, Exam Presets, DPI & PDF Compress</div>
                  </div>
                </button>
              </div>
            )}
          </div>

          {/* Help Menu */}
          <div className="relative">
            <button
              onClick={(e) => {
                e.stopPropagation();
                setActiveMenu(activeMenu === 'help' ? null : 'help');
              }}
              className={`px-2.5 py-1 rounded hover:bg-slate-800 transition relative flex items-center space-x-1.5 ${activeMenu === 'help' ? 'bg-slate-800 text-white' : ''}`}
            >
              <span>Help</span>
              {hasUpdate && (
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              )}
            </button>
            {activeMenu === 'help' && (
              <div
                onClick={(e) => e.stopPropagation()}
                className="absolute left-0 top-full mt-1 w-64 bg-slate-900 border border-slate-700/80 rounded-md shadow-2xl py-1 z-50 text-slate-200"
              >
                <button
                  onClick={() => { onCheckUpdates?.(); setActiveMenu(null); }}
                  className="w-full text-left px-3 py-2 hover:bg-blue-600 flex items-center justify-between transition group"
                >
                  <div className="flex items-center space-x-2">
                    <Sparkles className="w-3.5 h-3.5 text-amber-400 group-hover:text-white" />
                    <span className="text-xs">Check for Updates (अपडेट जांचें)</span>
                  </div>
                  {hasUpdate && (
                    <span className="text-[9px] px-1.5 py-0.2 bg-emerald-500 text-slate-950 font-bold rounded">
                      NEW
                    </span>
                  )}
                </button>
                <div className="h-px bg-slate-800 my-1"></div>
                <button
                  onClick={() => { onOpenAbout(); setActiveMenu(null); }}
                  className="w-full text-left px-3 py-1.5 hover:bg-blue-600 flex items-center space-x-2 transition"
                >
                  <Info className="w-3.5 h-3.5 text-blue-400" />
                  <span>About Passport Photo Studio Pro</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Center: Module quick switcher pill (desktop only) */}
      <div className="hidden md:flex items-center space-x-1 bg-slate-950/70 p-0.5 rounded-lg border border-slate-800" style={{ WebkitAppRegion: 'no-drag' } as any}>
        <button
          onClick={() => onSelectModule('dashboard')}
          className={`flex items-center space-x-1 px-2.5 py-1 rounded-md text-xs font-medium transition ${
            activeModule === 'dashboard'
              ? 'bg-slate-800 text-white shadow-sm'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
          }`}
          title="Return to Home Dashboard"
        >
          <span>Home</span>
        </button>
        <button
          onClick={() => onSelectModule('passport')}
          className={`flex items-center space-x-1.5 px-3 py-1 rounded-md text-xs font-medium transition ${
            activeModule === 'passport'
              ? 'bg-blue-600 text-white shadow-sm'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
          }`}
        >
          <Camera className="w-3.5 h-3.5" />
          <span>Passport Studio</span>
        </button>
        <button
          onClick={() => onSelectModule('scanner')}
          className={`flex items-center space-x-1.5 px-3 py-1 rounded-md text-xs font-medium transition ${
            activeModule === 'scanner'
              ? 'bg-emerald-600 text-white shadow-sm'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
          }`}
        >
          <FileText className="w-3.5 h-3.5" />
          <span>Document Scanner</span>
        </button>
        <button
          onClick={() => onSelectModule('resizer')}
          className={`flex items-center space-x-1.5 px-3 py-1 rounded-md text-xs font-medium transition ${
            activeModule === 'resizer'
              ? 'bg-amber-600 text-white shadow-sm'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
          }`}
        >
          <Maximize2 className="w-3.5 h-3.5" />
          <span>Resizer Pro</span>
        </button>
      </div>

      {/* Right: Window Controls (Desktop Electron only) or Mobile Actions */}
      {electronAPI ? (
        <div className="hidden md:flex items-center h-full -mr-3" style={{ WebkitAppRegion: 'no-drag' } as any}>
          <button
            onClick={handleMinimize}
            className="h-full px-3.5 hover:bg-slate-800 flex items-center justify-center text-slate-400 hover:text-white transition"
            title="Minimize"
          >
            <Minus className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={handleMaximize}
            className="h-full px-3.5 hover:bg-slate-800 flex items-center justify-center text-slate-400 hover:text-white transition"
            title={isMaximized ? "Restore" : "Maximize"}
          >
            <Square className="w-3 h-3" />
          </button>
          <button
            onClick={handleClose}
            className="h-full px-4 hover:bg-red-600 flex items-center justify-center text-slate-400 hover:text-white transition"
            title="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      ) : (
        <div className="flex md:hidden items-center space-x-2">
          <button
            onClick={onOpenAbout}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
            title="About Passport Photo Studio Pro"
          >
            <Info className="w-4 h-4 text-blue-400" />
          </button>
        </div>
      )}
    </header>
  );
};
