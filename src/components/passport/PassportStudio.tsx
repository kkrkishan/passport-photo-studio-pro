import React, { useState, useRef, useEffect } from 'react';
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
  DEFAULT_SHEET_CONFIG,
  CropBox
} from '../../types';
import { PhotoEditor } from './PhotoEditor';
import { AdjustmentPanel } from './AdjustmentPanel';
import { BackgroundStudio } from './BackgroundStudio';
import { SheetMaker } from './SheetMaker';
import { CameraModal } from '../common/CameraModal';
import { calculateAutoEnhance } from '../../services/imageProcessing';
import { capturePhotoOrWebcam } from '../../services/nativeCameraHelper';

interface PassportStudioProps {
  onNotify?: (msg: string) => void;
}

export const PassportStudio: React.FC<PassportStudioProps> = ({ onNotify }) => {
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [activePreset, setActivePreset] = useState<PhotoPreset>(OFFICIAL_PASSPORT_PRESETS[0]);
  const [customWidthMm, setCustomWidthMm] = useState(35);
  const [customHeightMm, setCustomHeightMm] = useState(45);

  // Persistent Crop Box State (Never lost or shifted when switching tabs)
  const [cropBox, setCropBox] = useState<CropBox | null>(null);

  // Studio Adjustments State with History Stack
  const [adjustments, setAdjustments] = useState<Adjustments>(DEFAULT_ADJUSTMENTS);
  const [history, setHistory] = useState<Adjustments[]>([DEFAULT_ADJUSTMENTS]);
  const [historyIdx, setHistoryIdx] = useState(0);

  // Background Studio State
  const [background, setBackground] = useState<BackgroundSettings>({
    enabled: false,
    color: '#ffffff',
    tolerance: 30,
    feather: 4,
  });

  // Biometric & View State
  const [showFaceGuide, setShowFaceGuide] = useState(true);
  const [beforeAfterMode, setBeforeAfterMode] = useState(false);
  const [viewMode, setViewMode] = useState<'editor' | 'sheet'>('editor');
  const [mobileTab, setMobileTab] = useState<'editor' | 'tuning' | 'bg'>('editor');
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [croppedCanvas, setCroppedCanvas] = useState<HTMLCanvasElement | null>(null);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Calculate default biometric crop box
  const calculateDefaultCropBox = (imgW: number, imgH: number, preset: PhotoPreset): CropBox => {
    const targetAspect = preset.widthMm / preset.heightMm;
    let cropH = Math.min(imgH * 0.85, (imgW * 0.85) / targetAspect);
    let cropW = cropH * targetAspect;

    return {
      x: Math.round((imgW - cropW) / 2),
      y: Math.round((imgH - cropH) * 0.35),
      width: Math.round(cropW),
      height: Math.round(cropH),
    };
  };

  // Push adjustment to undo history
  const pushAdjustmentState = (newAdj: Adjustments) => {
    const updatedHistory = history.slice(0, historyIdx + 1);
    updatedHistory.push(newAdj);
    setHistory(updatedHistory);
    setHistoryIdx(updatedHistory.length - 1);
    setAdjustments(newAdj);
  };

  const handleUndo = () => {
    if (historyIdx > 0) {
      setHistoryIdx(historyIdx - 1);
      setAdjustments(history[historyIdx - 1]);
    }
  };

  const handleRedo = () => {
    if (historyIdx < history.length - 1) {
      setHistoryIdx(historyIdx + 1);
      setAdjustments(history[historyIdx + 1]);
    }
  };

  // Handle Photo File Upload
  const handleOpenFile = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      const img = new Image();
      img.onload = () => {
        const initBox = calculateDefaultCropBox(img.naturalWidth, img.naturalHeight, activePreset);
        setCropBox(initBox);
        setImageSrc(dataUrl);
        setAdjustments(DEFAULT_ADJUSTMENTS);
        setHistory([DEFAULT_ADJUSTMENTS]);
        setHistoryIdx(0);
        setViewMode('editor');
        setMobileTab('editor');
        onNotify?.(`Loaded photo: ${file.name}`);
      };
      img.src = dataUrl;
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  // Handle Camera Capture with native Android Camera or Webcam modal
  const handleTriggerCamera = () => {
    capturePhotoOrWebcam({
      openWebcamModal: () => setIsCameraOpen(true),
      onPhotoCaptured: handleCameraCapture,
    });
  };

  const handleCameraCapture = (dataUrl: string) => {
    const img = new Image();
    img.onload = () => {
      const initBox = calculateDefaultCropBox(img.naturalWidth, img.naturalHeight, activePreset);
      setCropBox(initBox);
      setImageSrc(dataUrl);
      setAdjustments(DEFAULT_ADJUSTMENTS);
      setHistory([DEFAULT_ADJUSTMENTS]);
      setHistoryIdx(0);
      setIsCameraOpen(false);
      setViewMode('editor');
      setMobileTab('editor');
      onNotify?.('Live camera photo captured.');
    };
    img.src = dataUrl;
  };

  // Auto-Enhancement Engine
  const handleAutoEnhance = () => {
    if (!imageSrc) return;
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      ctx.drawImage(img, 0, 0);

      const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const enhanced = calculateAutoEnhance(imgData);
      const updatedAdj: Adjustments = {
        ...adjustments,
        brightness: enhanced.brightness ?? adjustments.brightness,
        contrast: enhanced.contrast ?? adjustments.contrast,
        saturation: enhanced.saturation ?? adjustments.saturation,
        highlights: enhanced.highlights ?? adjustments.highlights,
        shadows: enhanced.shadows ?? adjustments.shadows,
        sharpness: 25,
      };
      pushAdjustmentState(updatedAdj);
      onNotify?.('Auto-Enhance calibrated brightness, contrast & sharpness.');
    };
    img.src = imageSrc;
  };

  // Reset Adjustments
  const handleResetAdjustments = () => {
    pushAdjustmentState(DEFAULT_ADJUSTMENTS);
    onNotify?.('Adjustments reset to defaults.');
  };

  // Handle Preset Selection
  const handleSelectPreset = (preset: PhotoPreset) => {
    if (preset.id === 'custom') {
      const customP = {
        ...preset,
        widthMm: customWidthMm,
        heightMm: customHeightMm,
      };
      setActivePreset(customP);
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

      {/* Desktop Top Action Bar */}
      <div className="hidden md:flex min-h-12 border-b border-slate-800 bg-slate-900/60 px-4 py-2 items-center justify-between gap-2 shrink-0">
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={handleOpenFile}
            className="flex items-center space-x-1.5 px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-medium text-slate-200 transition active:scale-95"
          >
            <Upload className="w-3.5 h-3.5 text-blue-400" />
            <span>Open Photo</span>
          </button>

          <button
            onClick={handleTriggerCamera}
            className="flex items-center space-x-1.5 px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-medium text-slate-200 transition active:scale-95"
          >
            <Camera className="w-3.5 h-3.5 text-cyan-400" />
            <span>Camera</span>
          </button>

          <div className="h-4 border-r border-slate-700 mx-1" />

          {/* Size Presets Dropdown */}
          <div className="flex items-center space-x-1.5 text-xs">
            <span className="text-slate-400 font-medium">Size:</span>
            <select
              value={activePreset.id}
              onChange={(e) => {
                const found = OFFICIAL_PASSPORT_PRESETS.find(p => p.id === e.target.value);
                if (found) handleSelectPreset(found);
              }}
              className="bg-slate-800 border border-slate-700 rounded-lg px-2 py-1 text-xs text-white focus:outline-none focus:ring-1 focus:ring-blue-500 max-w-[200px] truncate"
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

      {/* Mobile Streamlined Top Header (Clean 44px) */}
      <div className="flex md:hidden h-12 border-b border-slate-800 bg-slate-900/90 px-3 items-center justify-between gap-2 shrink-0 z-20">
        <div className="flex items-center space-x-1.5 min-w-0">
          <span className="text-[11px] text-slate-400 font-bold shrink-0">Size:</span>
          <select
            value={activePreset.id}
            onChange={(e) => {
              const found = OFFICIAL_PASSPORT_PRESETS.find(p => p.id === e.target.value);
              if (found) handleSelectPreset(found);
            }}
            className="bg-slate-800 border border-slate-700/80 rounded-xl px-2.5 py-1 text-xs font-semibold text-white focus:outline-none focus:ring-1 focus:ring-blue-500 max-w-[150px] truncate shadow-sm"
          >
            {OFFICIAL_PASSPORT_PRESETS.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name} ({p.widthMm}×{p.heightMm}mm)
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center space-x-1.5 shrink-0">
          {imageSrc && viewMode === 'editor' && (
            <div className="flex items-center space-x-1 mr-1">
              <button
                disabled={historyIdx === 0}
                onClick={handleUndo}
                className="p-1.5 rounded-lg bg-slate-800 text-slate-300 disabled:opacity-30 active:scale-95 transition"
                title="Undo"
              >
                <Undo2 className="w-3.5 h-3.5" />
              </button>
              <button
                disabled={historyIdx >= history.length - 1}
                onClick={handleRedo}
                className="p-1.5 rounded-lg bg-slate-800 text-slate-300 disabled:opacity-30 active:scale-95 transition"
                title="Redo"
              >
                <Redo2 className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          <button
            onClick={handleTriggerCamera}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-cyan-400 border border-slate-700/80 active:scale-95 transition shadow-sm"
            title="Take Photo with Camera"
          >
            <Camera className="w-4 h-4" />
          </button>

          <button
            onClick={handleOpenFile}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-blue-400 border border-slate-700/80 active:scale-95 transition shadow-sm"
            title="Open Photo from Gallery"
          >
            <Upload className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Main Workspace Body */}
      {!imageSrc ? (
        <div className="flex-1 flex flex-col items-center justify-center p-6 text-center select-none overflow-y-auto">
          <div className="w-20 h-20 rounded-3xl bg-blue-600/10 border border-blue-500/30 flex items-center justify-center text-blue-400 mb-5 shadow-2xl">
            <FileImage className="w-10 h-10" />
          </div>
          <h2 className="text-xl font-bold text-white mb-2">
            PASSPORT PHOTO STUDIO
          </h2>
          <p className="text-xs text-slate-400 max-w-md leading-relaxed mb-8">
            Create standard biometric passport and visa photographs matching official guidelines (35×45 mm, 2×2 inch, etc.), with automatic face alignment, studio background color replacement, and dynamic multi-size sheet printing.
          </p>

          <div className="flex flex-col sm:flex-row items-center gap-3 w-full max-w-sm sm:max-w-none justify-center">
            <button
              onClick={handleOpenFile}
              className="w-full sm:w-auto px-6 py-3.5 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-xs font-bold flex items-center justify-center space-x-2.5 shadow-xl shadow-blue-900/30 transition transform hover:-translate-y-0.5 active:scale-95"
            >
              <Upload className="w-4 h-4" />
              <span>Select Photo From Gallery</span>
            </button>

            <button
              onClick={handleTriggerCamera}
              className="w-full sm:w-auto px-6 py-3.5 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold flex items-center justify-center space-x-2.5 border border-slate-700 shadow-xl transition transform hover:-translate-y-0.5 active:scale-95"
            >
              <Camera className="w-4 h-4 text-cyan-400" />
              <span>Capture Live From Camera</span>
            </button>
          </div>
        </div>
      ) : viewMode === 'editor' ? (
        // Active Editing Mode
        <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
          {/* Desktop Layout: PhotoEditor on left, Drawer on right */}
          <div className="hidden md:flex flex-1 flex-row overflow-hidden">
            <div className="flex-1 flex flex-col overflow-hidden">
              <PhotoEditor
                imageSrc={imageSrc}
                preset={activePreset}
                adjustments={adjustments}
                background={background}
                showFaceGuide={showFaceGuide}
                onToggleFaceGuide={() => setShowFaceGuide(!showFaceGuide)}
                cropBox={cropBox}
                onCropChange={setCropBox}
                onApplyCrop={handleApplyCrop}
                beforeAfterMode={beforeAfterMode}
              />
            </div>
            <div className="flex flex-col h-full w-80 overflow-y-auto shrink-0 border-l border-slate-800">
              <AdjustmentPanel
                adjustments={adjustments}
                onChange={pushAdjustmentState}
                onAutoEnhance={handleAutoEnhance}
                onReset={handleResetAdjustments}
                beforeAfterMode={beforeAfterMode}
                onToggleBeforeAfter={() => setBeforeAfterMode(!beforeAfterMode)}
              />
              <BackgroundStudio
                settings={background}
                onChange={setBackground}
              />
            </div>
          </div>

          {/* Mobile Layout: 50% Live Preview + 50% Controls */}
          <div className="flex md:hidden flex-1 flex-col overflow-hidden">
            {mobileTab === 'editor' ? (
              // 1. Photo & Crop View (Full screen with Crop handles)
              <div className="flex-1 flex flex-col overflow-hidden relative">
                <PhotoEditor
                  imageSrc={imageSrc}
                  preset={activePreset}
                  adjustments={adjustments}
                  background={background}
                  showFaceGuide={showFaceGuide}
                  onToggleFaceGuide={() => setShowFaceGuide(!showFaceGuide)}
                  cropBox={cropBox}
                  onCropChange={setCropBox}
                  onApplyCrop={handleApplyCrop}
                  beforeAfterMode={beforeAfterMode}
                  previewOnly={false}
                />
              </div>
            ) : (
              // 2. Fine Tuning or Background: STRICT 50% Live Preview / 50% Controls
              <div className="flex-1 flex flex-col overflow-hidden">
                {/* Upper 50%: Live Photo Canvas Preview */}
                <div className="h-1/2 w-full bg-[#070b14] relative flex items-center justify-center p-1 border-b border-slate-800 shrink-0">
                  <PhotoEditor
                    imageSrc={imageSrc}
                    preset={activePreset}
                    adjustments={adjustments}
                    background={background}
                    showFaceGuide={false}
                    onToggleFaceGuide={() => {}}
                    cropBox={cropBox}
                    onCropChange={setCropBox}
                    onApplyCrop={handleApplyCrop}
                    beforeAfterMode={beforeAfterMode}
                    previewOnly={true}
                  />
                  <button
                    onClick={() => setMobileTab('editor')}
                    className="absolute top-2 right-2 px-3 py-1 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold shadow-lg shadow-blue-900/40 active:scale-95 transition z-30 flex items-center space-x-1"
                  >
                    <Check className="w-3.5 h-3.5" />
                    <span>Done</span>
                  </button>
                </div>

                {/* Lower 50%: Scrollable Sliders or Background Tools */}
                <div className="h-1/2 overflow-y-auto bg-slate-900">
                  {mobileTab === 'tuning' ? (
                    <AdjustmentPanel
                      adjustments={adjustments}
                      onChange={pushAdjustmentState}
                      onAutoEnhance={handleAutoEnhance}
                      onReset={handleResetAdjustments}
                      beforeAfterMode={beforeAfterMode}
                      onToggleBeforeAfter={() => setBeforeAfterMode(!beforeAfterMode)}
                      onDone={() => setMobileTab('editor')}
                    />
                  ) : (
                    <BackgroundStudio
                      settings={background}
                      onChange={setBackground}
                    />
                  )}
                </div>
              </div>
            )}

            {/* Mobile Bottom Sub-Tabs (Clean, Fixed above MobileNavBar) */}
            <div className="flex border-t border-slate-800 bg-slate-900/95 backdrop-blur-md px-2 py-1.5 gap-1.5 shrink-0 z-30">
              <button
                onClick={() => setMobileTab('editor')}
                className={`flex-1 py-2 rounded-xl text-xs font-bold text-center transition flex items-center justify-center space-x-1 active:scale-95 ${
                  mobileTab === 'editor'
                    ? 'bg-blue-600 text-white shadow-md'
                    : 'text-slate-400 bg-slate-800/80 hover:text-white'
                }`}
              >
                <span>✂️ Photo & Crop</span>
              </button>
              <button
                onClick={() => setMobileTab('tuning')}
                className={`flex-1 py-2 rounded-xl text-xs font-bold text-center transition flex items-center justify-center space-x-1 active:scale-95 ${
                  mobileTab === 'tuning'
                    ? 'bg-blue-600 text-white shadow-md'
                    : 'text-slate-400 bg-slate-800/80 hover:text-white'
                }`}
              >
                <span>⚙️ Fine Tuning</span>
              </button>
              <button
                onClick={() => setMobileTab('bg')}
                className={`flex-1 py-2 rounded-xl text-xs font-bold text-center transition flex items-center justify-center space-x-1 active:scale-95 ${
                  mobileTab === 'bg'
                    ? 'bg-blue-600 text-white shadow-md'
                    : 'text-slate-400 bg-slate-800/80 hover:text-white'
                }`}
              >
                <span>🎨 Background</span>
              </button>
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
