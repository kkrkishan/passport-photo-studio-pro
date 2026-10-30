import React, { useRef, useEffect, useState, useCallback } from 'react';
import {
  Sparkles,
  Sliders,
  Eye,
  Check,
  RotateCcw,
  Zap,
  FileText,
  Printer
} from 'lucide-react';
import { applyDocumentEnhance } from '../../services/perspectiveTransform';

interface DocumentEnhancerProps {
  imageSrc: string; // Rectified image
  slotLabel: string;
  onConfirm: (enhancedDataUrl: string, filterMode: any, adjustments: any) => void;
  onBackToCorner: () => void;
}

export const DocumentEnhancer: React.FC<DocumentEnhancerProps> = ({
  imageSrc,
  slotLabel,
  onConfirm,
  onBackToCorner,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [imageObj, setImageObj] = useState<HTMLImageElement | null>(null);

  const [filterMode, setFilterMode] = useState<'magic' | 'bw' | 'grayscale' | 'enhanced' | 'original'>('magic');
  const [adjustments, setAdjustments] = useState({
    brightness: 0,
    contrast: 0,
    sharpness: 20,
    exposure: 0,
  });
  const [beforeAfterMode, setBeforeAfterMode] = useState(false);
  const [mobileTab, setMobileTab] = useState<'preview' | 'filters'>('preview');

  // Load image
  useEffect(() => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => setImageObj(img);
    img.src = imageSrc;
  }, [imageSrc]);

  // Render enhanced document canvas
  const renderCanvas = useCallback(() => {
    if (!imageObj || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = imageObj.naturalWidth;
    canvas.height = imageObj.naturalHeight;

    ctx.drawImage(imageObj, 0, 0);

    if (!beforeAfterMode && filterMode !== 'original') {
      const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      applyDocumentEnhance(imgData, filterMode, adjustments);
      ctx.putImageData(imgData, 0, 0);
    }
  }, [imageObj, filterMode, adjustments, beforeAfterMode]);

  useEffect(() => {
    renderCanvas();
  }, [renderCanvas]);

  const handleConfirm = () => {
    if (!canvasRef.current) return;
    const dataUrl = canvasRef.current.toDataURL('image/jpeg', 0.95);
    onConfirm(dataUrl, filterMode, adjustments);
  };

  return (
    <div className="flex-1 flex flex-col md:flex-row overflow-hidden bg-[#0b0f19] select-none text-slate-200">
      {/* Mobile Tab Switcher */}
      <div className="flex md:hidden border-b border-slate-800 bg-slate-900 p-1.5 gap-2 shrink-0">
        <button
          onClick={() => setMobileTab('preview')}
          className={`flex-1 py-1.5 rounded-lg text-xs font-semibold text-center transition ${
            mobileTab === 'preview'
              ? 'bg-emerald-600 text-white shadow-md'
              : 'text-slate-400 bg-slate-800/80 hover:text-white'
          }`}
        >
          Document Preview
        </button>
        <button
          onClick={() => setMobileTab('filters')}
          className={`flex-1 py-1.5 rounded-lg text-xs font-semibold text-center transition ${
            mobileTab === 'filters'
              ? 'bg-emerald-600 text-white shadow-md'
              : 'text-slate-400 bg-slate-800/80 hover:text-white'
          }`}
        >
          Filters & Tuning
        </button>
      </div>

      {/* Center Image Viewport */}
      <div className={`${mobileTab === 'preview' ? 'flex' : 'hidden'} md:flex flex-1 flex-col items-center justify-between p-2 sm:p-4 overflow-hidden relative`}>
        {/* Top Floating Bar */}
        <div className="w-full flex flex-wrap items-center justify-between gap-2 bg-slate-900/90 backdrop-blur-md px-3 sm:px-4 py-2 sm:py-2.5 rounded-2xl border border-slate-800 shadow-xl mb-3">
          <div className="flex items-center space-x-2">
            <span className="text-xs font-bold text-emerald-400 bg-emerald-950/60 px-2.5 py-1 rounded-lg border border-emerald-800/40">
              {slotLabel}
            </span>
            <span className="text-xs text-slate-400 hidden sm:inline">Enhancement & Tuning</span>
          </div>

          <div className="flex flex-wrap items-center gap-1.5 sm:space-x-2">
            <button
              onClick={() => setBeforeAfterMode(!beforeAfterMode)}
              className={`px-2.5 py-1.5 rounded-xl text-xs font-semibold border transition ${
                beforeAfterMode
                  ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                  : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700'
              }`}
            >
              <span className="flex items-center space-x-1">
                <Eye className="w-3.5 h-3.5" />
                <span>{beforeAfterMode ? 'Raw' : 'Original'}</span>
              </span>
            </button>

            <button
              onClick={onBackToCorner}
              className="px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs transition"
            >
              Corners
            </button>

            <button
              onClick={handleConfirm}
              className="px-3 sm:px-4 py-1.5 bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-white rounded-xl text-xs font-bold shadow-lg shadow-emerald-900/40 flex items-center space-x-1.5 transition"
            >
              <Check className="w-4 h-4" />
              <span>Apply & Save</span>
            </button>
          </div>
        </div>

        {/* Canvas Display */}
        <div className="flex-1 w-full flex items-center justify-center p-2 overflow-auto">
          <canvas
            ref={canvasRef}
            className="max-h-[66vh] max-w-[92vw] object-contain rounded-xl shadow-2xl border border-slate-700/80 bg-white"
          />
        </div>

        {/* Footer info */}
        <div className="text-[11px] text-slate-400 pt-2 text-center">
          High-contrast readability engine cleans shadows & reinforces micro-text.
        </div>
      </div>

      {/* Right Adjustment Sidebar */}
      <div className={`${mobileTab === 'filters' ? 'flex' : 'hidden'} md:flex w-full md:w-80 bg-slate-900 border-l border-slate-800 flex-col h-full shrink-0`}>
        {/* Header */}
        <div className="p-4 border-b border-slate-800 bg-slate-950/40 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Sparkles className="w-4 h-4 text-emerald-400" />
            <span className="font-semibold text-sm">Enhancement Profiles</span>
          </div>
          <button
            onClick={() => {
              setFilterMode('magic');
              setAdjustments({ brightness: 0, contrast: 0, sharpness: 20, exposure: 0 });
            }}
            className="text-[11px] text-slate-400 hover:text-white"
          >
            Reset
          </button>
        </div>

        {/* Filter Presets */}
        <div className="p-4 space-y-4 flex-1 overflow-y-auto text-xs">
          <div className="space-y-2">
            <label className="text-slate-400 font-medium">Scan Filter</label>
            <div className="grid grid-cols-1 gap-2">
              <button
                onClick={() => setFilterMode('magic')}
                className={`p-3 rounded-xl text-left border transition ${
                  filterMode === 'magic'
                    ? 'bg-emerald-950/50 border-emerald-500 text-white shadow-md'
                    : 'bg-slate-800/60 border-slate-700/60 text-slate-300 hover:bg-slate-800'
                }`}
              >
                <div className="font-semibold flex items-center justify-between">
                  <span>Magic Document Color</span>
                  <span className="text-[10px] bg-emerald-500/20 text-emerald-300 px-1.5 py-0.5 rounded">
                    Recommended
                  </span>
                </div>
                <div className="text-[11px] text-slate-400 mt-0.5">
                  Removes shadows & yellow tint while keeping photos and seals vivid.
                </div>
              </button>

              <button
                onClick={() => setFilterMode('bw')}
                className={`p-3 rounded-xl text-left border transition ${
                  filterMode === 'bw'
                    ? 'bg-emerald-950/50 border-emerald-500 text-white shadow-md'
                    : 'bg-slate-800/60 border-slate-700/60 text-slate-300 hover:bg-slate-800'
                }`}
              >
                <div className="font-semibold">Crisp Black & White</div>
                <div className="text-[11px] text-slate-400 mt-0.5">
                  High-contrast text binarization. Perfect for photocopies & printouts.
                </div>
              </button>

              <button
                onClick={() => setFilterMode('grayscale')}
                className={`p-3 rounded-xl text-left border transition ${
                  filterMode === 'grayscale'
                    ? 'bg-emerald-950/50 border-emerald-500 text-white shadow-md'
                    : 'bg-slate-800/60 border-slate-700/60 text-slate-300 hover:bg-slate-800'
                }`}
              >
                <div className="font-semibold">Smooth Grayscale</div>
                <div className="text-[11px] text-slate-400 mt-0.5">
                  Even tones with clear typography and grayscale photos.
                </div>
              </button>

              <button
                onClick={() => setFilterMode('original')}
                className={`p-3 rounded-xl text-left border transition ${
                  filterMode === 'original'
                    ? 'bg-emerald-950/50 border-emerald-500 text-white shadow-md'
                    : 'bg-slate-800/60 border-slate-700/60 text-slate-300 hover:bg-slate-800'
                }`}
              >
                <div className="font-semibold">Original Colors</div>
                <div className="text-[11px] text-slate-400 mt-0.5">
                  Pure photographic color without automated tone conversion.
                </div>
              </button>
            </div>
          </div>

          {/* Fine Tuning Sliders */}
          <div className="space-y-3.5 border-t border-slate-800 pt-3">
            <div className="text-slate-300 font-semibold">Fine Adjustment</div>

            <div className="space-y-1">
              <div className="flex justify-between text-slate-400">
                <span>Brightness</span>
                <span className="font-mono text-slate-300">{adjustments.brightness}</span>
              </div>
              <input
                type="range"
                min="-60"
                max="60"
                value={adjustments.brightness}
                onChange={(e) =>
                  setAdjustments({ ...adjustments, brightness: parseInt(e.target.value) })
                }
                className="w-full accent-emerald-500 h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer"
              />
            </div>

            <div className="space-y-1">
              <div className="flex justify-between text-slate-400">
                <span>Contrast</span>
                <span className="font-mono text-slate-300">{adjustments.contrast}</span>
              </div>
              <input
                type="range"
                min="-60"
                max="80"
                value={adjustments.contrast}
                onChange={(e) =>
                  setAdjustments({ ...adjustments, contrast: parseInt(e.target.value) })
                }
                className="w-full accent-emerald-500 h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer"
              />
            </div>

            <div className="space-y-1">
              <div className="flex justify-between text-slate-400">
                <span>Text Sharpness</span>
                <span className="font-mono text-slate-300">{adjustments.sharpness}</span>
              </div>
              <input
                type="range"
                min="0"
                max="80"
                value={adjustments.sharpness}
                onChange={(e) =>
                  setAdjustments({ ...adjustments, sharpness: parseInt(e.target.value) })
                }
                className="w-full accent-emerald-500 h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
