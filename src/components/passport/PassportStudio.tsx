import React, { useState, useRef } from 'react';
import {
  Upload,
  Camera,
  RotateCcw,
  Undo2,
  Redo2,
  Grid,
  Sparkles,
  Sliders,
  Check,
  FileImage,
  Layers,
  Printer
} from 'lucide-react';
import {
  PhotoPreset,
  OFFICIAL_PASSPORT_PRESETS,
  Adjustments,
  DEFAULT_ADJUSTMENTS,
  BackgroundSettings,
  SheetConfig,
  DEFAULT_SHEET_CONFIG
} from '../../types';
import { PhotoEditor } from './PhotoEditor';
import { AdjustmentPanel } from './AdjustmentPanel';
import { BackgroundStudio } from './BackgroundStudio';
import { SheetMaker } from './SheetMaker';
import { CameraModal } from '../common/CameraModal';
import { calculateAutoEnhance } from '../../services/imageProcessing';

interface PassportStudioProps {
  onNotify?: (msg: string) => void;
}

export const PassportStudio: React.FC<PassportStudioProps> = ({ onNotify }) => {
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [activePreset, setActivePreset] = useState<PhotoPreset>(OFFICIAL_PASSPORT_PRESETS[0]);
  const [customWidthMm, setCustomWidthMm] = useState(35);
  const [customHeightMm, setCustomHeightMm] = useState(45);

  const [adjustments, setAdjustments] = useState<Adjustments>(DEFAULT_ADJUSTMENTS);
  const [history, setHistory] = useState<Adjustments[]>([DEFAULT_ADJUSTMENTS]);
  const [historyIdx, setHistoryIdx] = useState(0);

  const [background, setBackground] = useState<BackgroundSettings>({
    enabled: false,
    color: '#ffffff',
    tolerance: 35,
    feather: 3,
  });

  const [showFaceGuide, setShowFaceGuide] = useState(true);
  const [beforeAfterMode, setBeforeAfterMode] = useState(false);
  const [croppedCanvas, setCroppedCanvas] = useState<HTMLCanvasElement | null>(null);
  const [viewMode, setViewMode] = useState<'editor' | 'sheet'>('editor');
  const [mobileTab, setMobileTab] = useState<'editor' | 'tuning' | 'bg'>('editor');
  const [isCameraOpen, setIsCameraOpen] = useState(false);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Undo / Redo helpers
  const pushAdjustmentState = (newAdj: Adjustments) => {
    const updated = history.slice(0, historyIdx + 1);
    updated.push(newAdj);
    setHistory(updated);
    setHistoryIdx(updated.length - 1);
    setAdjustments(newAdj);
  };

  const handleUndo = () => {
    if (historyIdx > 0) {
      const targetIdx = historyIdx - 1;
      setHistoryIdx(targetIdx);
      setAdjustments(history[targetIdx]);
    }
  };

  const handleRedo = () => {
    if (historyIdx < history.length - 1) {
      const targetIdx = historyIdx + 1;
      setHistoryIdx(targetIdx);
      setAdjustments(history[targetIdx]);
    }
  };

  const handleResetAdjustments = () => {
    pushAdjustmentState(DEFAULT_ADJUSTMENTS);
    setBackground((b) => ({ ...b, enabled: false }));
  };

  // 1-Click Auto Enhance
  const handleAutoEnhance = () => {
    if (!imageSrc) return;
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = Math.min(600, img.width);
      canvas.height = Math.min(600, img.height);
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      const data = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const suggested = calculateAutoEnhance(data);
      const updated: Adjustments = { ...adjustments, ...suggested };
      pushAdjustmentState(updated);
      onNotify?.('Auto-Enhancement Applied');
    };
    img.src = imageSrc;
  };

  // Open file from native dialog or input
  const handleOpenFile = async () => {
    const electronAPI = (window as any).electronAPI;
    if (electronAPI) {
      const res = await electronAPI.openImage();
      if (res && res.dataUrl) {
        setImageSrc(res.dataUrl);
        setCroppedCanvas(null);
        setViewMode('editor');
      }
    } else {
      fileInputRef.current?.click();
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (ev) => {
        if (ev.target?.result) {
          setImageSrc(ev.target.result as string);
          setCroppedCanvas(null);
          setViewMode('editor');
        }
      };
      reader.readAsDataURL(file);
    }
  };

  // Camera capture callback
  const handleCameraCapture = (dataUrl: string) => {
    setImageSrc(dataUrl);
    setCroppedCanvas(null);
    setViewMode('editor');
  };

  // Handle Preset Selection
  const handleSelectPreset = (preset: PhotoPreset) => {
    if (preset.id === 'custom') {
      setActivePreset({
        ...preset,
        widthMm: customWidthMm,
        heightMm: customHeightMm,
      });
    } else {
      setActivePreset(preset);
    }
  };

  // Handle Crop Applied
  const handleApplyCrop = (canvas: HTMLCanvasElement) => {
    setCroppedCanvas(canvas);
    setViewMode('sheet');
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-[#0b0f19] select-none overflow-hidden">
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        onChange={handleFileChange}
        className="hidden"
      />

      <CameraModal
        isOpen={isCameraOpen}
        onClose={() => setIsCameraOpen(false)}
        onCapture={handleCameraCapture}
        mode="face"
      />

      {/* Top Action Bar */}
      <div className="min-h-12 border-b border-slate-800 bg-slate-900/60 px-3 sm:px-4 py-2 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 shrink-0">
        {/* Left: Input Buttons & Presets */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={handleOpenFile}
            className="flex items-center space-x-1.5 px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-medium text-slate-200 transition active:scale-95"
          >
            <Upload className="w-3.5 h-3.5 text-blue-400" />
            <span>Open Photo</span>
          </button>

          <button
            onClick={() => setIsCameraOpen(true)}
            className="flex items-center space-x-1.5 px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-medium text-slate-200 transition active:scale-95"
          >
            <Camera className="w-3.5 h-3.5 text-cyan-400" />
            <span>Camera</span>
          </button>

          <div className="hidden sm:block h-4 border-r border-slate-700 mx-1" />

          {/* Size Presets Dropdown */}
          <div className="flex items-center space-x-1.5 text-xs">
            <span className="text-slate-400 font-medium">Size:</span>
            <select
              value={activePreset.id}
              onChange={(e) => {
                const found = OFFICIAL_PASSPORT_PRESETS.find(p => p.id === e.target.value);
                if (found) handleSelectPreset(found);
              }}
              className="bg-slate-800 border border-slate-700 rounded-lg px-2 py-1 text-xs text-white focus:outline-none focus:ring-1 focus:ring-blue-500 max-w-[180px] sm:max-w-none truncate"
            >
              {OFFICIAL_PASSPORT_PRESETS.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} — {p.description.substring(0, 24)}...
                </option>
              ))}
            </select>
          </div>

          {activePreset.id === 'custom' && (
            <div className="flex items-center space-x-1 text-xs">
              <input
                type="number"
                min="10"
                max="200"
                value={customWidthMm}
                onChange={(e) => {
                  const val = parseInt(e.target.value) || 35;
                  setCustomWidthMm(val);
                  setActivePreset({ ...activePreset, widthMm: val });
                }}
                className="w-12 bg-slate-800 border border-slate-700 rounded px-1.5 py-0.5 text-center text-white text-xs"
              />
              <span className="text-slate-400">×</span>
              <input
                type="number"
                min="10"
                max="200"
                value={customHeightMm}
                onChange={(e) => {
                  const val = parseInt(e.target.value) || 45;
                  setCustomHeightMm(val);
                  setActivePreset({ ...activePreset, heightMm: val });
                }}
                className="w-12 bg-slate-800 border border-slate-700 rounded px-1.5 py-0.5 text-center text-white text-xs"
              />
              <span className="text-slate-400">mm</span>
            </div>
          )}
        </div>

        {/* Right: History controls & Tab switcher */}
        <div className="flex items-center space-x-2">
          {imageSrc && viewMode === 'editor' && (
            <div className="flex items-center space-x-1 mr-2">
              <button
                disabled={historyIdx === 0}
                onClick={handleUndo}
                className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-slate-300 transition"
                title="Undo (Ctrl+Z)"
              >
                <Undo2 className="w-3.5 h-3.5" />
              </button>
              <button
                disabled={historyIdx >= history.length - 1}
                onClick={handleRedo}
                className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-slate-300 transition"
                title="Redo (Ctrl+Y)"
              >
                <Redo2 className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {croppedCanvas && (
            <div className="flex items-center space-x-1 bg-slate-950 p-0.5 rounded-lg border border-slate-800">
              <button
                onClick={() => setViewMode('editor')}
                className={`px-3 py-1 rounded-md text-xs font-medium transition ${
                  viewMode === 'editor'
                    ? 'bg-blue-600 text-white'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                1. Crop & Edit
              </button>
              <button
                onClick={() => setViewMode('sheet')}
                className={`px-3 py-1 rounded-md text-xs font-medium transition ${
                  viewMode === 'sheet'
                    ? 'bg-blue-600 text-white'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                2. Print Sheet Maker
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Main Workspace Body */}
      {!imageSrc ? (
        // Empty State: Drag & Drop upload or capture prompt
        <div className="flex-1 flex flex-col items-center justify-center p-8 text-center select-none">
          <div className="w-20 h-20 rounded-3xl bg-blue-600/10 border border-blue-500/30 flex items-center justify-center text-blue-400 mb-6 shadow-2xl">
            <FileImage className="w-10 h-10" />
          </div>
          <h2 className="text-xl font-bold text-white mb-2">
            PASSPORT PHOTO STUDIO
          </h2>
          <p className="text-xs text-slate-400 max-w-md leading-relaxed mb-8">
            Create standard biometric passport and visa photographs matching official guidelines (35×45 mm, 2×2 inch, etc.), with automatic face alignment, studio background color replacement, and dynamic multi-size sheet printing.
          </p>

          <div className="flex items-center space-x-4">
            <button
              onClick={handleOpenFile}
              className="px-6 py-3 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-xs font-bold flex items-center space-x-2.5 shadow-xl shadow-blue-900/30 transition transform hover:-translate-y-0.5"
            >
              <Upload className="w-4 h-4" />
              <span>Select Photo From Computer</span>
            </button>

            <button
              onClick={() => setIsCameraOpen(true)}
              className="px-6 py-3 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold flex items-center space-x-2.5 border border-slate-700 shadow-xl transition transform hover:-translate-y-0.5"
            >
              <Camera className="w-4 h-4 text-cyan-400" />
              <span>Capture Live From Camera</span>
            </button>
          </div>

          <div className="mt-12 grid grid-cols-3 gap-6 max-w-2xl text-left border-t border-slate-800/80 pt-6">
            <div className="space-y-1">
              <div className="text-xs font-semibold text-slate-300">Biometric Alignment</div>
              <div className="text-[11px] text-slate-500">Built-in head and eye level guidelines adhering to ISO/ICAO standards.</div>
            </div>
            <div className="space-y-1">
              <div className="text-xs font-semibold text-slate-300">Studio Background</div>
              <div className="text-[11px] text-slate-500">1-click replacement with compliant white, blue, or light gray studio backgrounds.</div>
            </div>
            <div className="space-y-1">
              <div className="text-xs font-semibold text-slate-300">Dynamic Sheet Maker</div>
              <div className="text-[11px] text-slate-500">Print 8 photos on 4×6" or up to 45+ photos on A4 with precision scissor cut marks.</div>
            </div>
          </div>
        </div>
      ) : viewMode === 'editor' ? (
        // Active Editing Mode
        <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
          {/* Mobile View Switcher */}
          <div className="flex md:hidden border-b border-slate-800 bg-slate-900 p-1.5 gap-1 shrink-0">
            <button
              onClick={() => setMobileTab('editor')}
              className={`flex-1 py-1.5 rounded-lg text-xs font-semibold text-center transition ${
                mobileTab === 'editor'
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'text-slate-400 bg-slate-800/80 hover:text-white'
              }`}
            >
              Photo & Crop
            </button>
            <button
              onClick={() => setMobileTab('tuning')}
              className={`flex-1 py-1.5 rounded-lg text-xs font-semibold text-center transition ${
                mobileTab === 'tuning'
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'text-slate-400 bg-slate-800/80 hover:text-white'
              }`}
            >
              Fine Tuning
            </button>
            <button
              onClick={() => setMobileTab('bg')}
              className={`flex-1 py-1.5 rounded-lg text-xs font-semibold text-center transition ${
                mobileTab === 'bg'
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'text-slate-400 bg-slate-800/80 hover:text-white'
              }`}
            >
              Background
            </button>
          </div>

          {/* Photo Editor Canvas & Crop Engine */}
          <div className={`${mobileTab === 'editor' ? 'flex' : 'hidden'} md:flex flex-1 flex-col overflow-hidden`}>
            <PhotoEditor
              imageSrc={imageSrc}
              preset={activePreset}
              adjustments={adjustments}
              background={background}
              showFaceGuide={showFaceGuide}
              onToggleFaceGuide={() => setShowFaceGuide(!showFaceGuide)}
              onApplyCrop={handleApplyCrop}
              beforeAfterMode={beforeAfterMode}
            />
          </div>

          {/* Side Adjustments & Background Studio */}
          <div className={`${mobileTab !== 'editor' ? 'flex' : 'hidden'} md:flex flex-col h-full w-full md:w-80 overflow-y-auto shrink-0 border-l border-slate-800`}>
            <div className={`${mobileTab === 'tuning' ? 'block' : 'hidden'} md:block`}>
              <AdjustmentPanel
                adjustments={adjustments}
                onChange={pushAdjustmentState}
                onAutoEnhance={handleAutoEnhance}
                onReset={handleResetAdjustments}
                beforeAfterMode={beforeAfterMode}
                onToggleBeforeAfter={() => setBeforeAfterMode(!beforeAfterMode)}
              />
            </div>
            <div className={`${mobileTab === 'bg' ? 'block' : 'hidden'} md:block`}>
              <BackgroundStudio
                settings={background}
                onChange={setBackground}
              />
            </div>
          </div>
        </div>
      ) : (
        // Sheet Maker View
        <SheetMaker
          croppedCanvas={croppedCanvas!}
          activePreset={activePreset}
          onBackToEditor={() => setViewMode('editor')}
        />
      )}
    </div>
  );
};
