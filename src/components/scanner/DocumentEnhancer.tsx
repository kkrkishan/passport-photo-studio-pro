import React, { useRef, useEffect, useState, useCallback } from 'react';
import {
  Sparkles,
  Eye,
  Check,
  ChevronLeft,
  ZoomIn,
  ZoomOut,
  RotateCcw
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
  const desktopCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const mobileCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const [imageObj, setImageObj] = useState<HTMLImageElement | null>(null);

  const [filterMode, setFilterMode] = useState<'magic' | 'bw' | 'grayscale' | 'enhanced' | 'original'>('magic');
  const [adjustments, setAdjustments] = useState({
    brightness: 0,
    contrast: 0,
    sharpness: 20,
    exposure: 0,
  });
  const [beforeAfterMode, setBeforeAfterMode] = useState(false);
  const [zoom, setZoom] = useState(1);

  // Load image
  useEffect(() => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => setImageObj(img);
    img.src = imageSrc;
  }, [imageSrc]);

  // Render to canvas
  const renderToCanvas = useCallback(
    (canvas: HTMLCanvasElement | null) => {
      if (!imageObj || !canvas) return;
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
    },
    [imageObj, filterMode, adjustments, beforeAfterMode]
  );

  useEffect(() => {
    renderToCanvas(desktopCanvasRef.current);
    renderToCanvas(mobileCanvasRef.current);
  }, [renderToCanvas]);

  const handleConfirm = () => {
    const canvas = mobileCanvasRef.current || desktopCanvasRef.current;
    if (!canvas && imageObj) {
      const temp = document.createElement('canvas');
      renderToCanvas(temp);
      onConfirm(temp.toDataURL('image/jpeg', 0.95), filterMode, adjustments);
      return;
    }
    if (!canvas) return;
    const dataUrl = canvas.toDataURL('image/jpeg', 0.95);
    onConfirm(dataUrl, filterMode, adjustments);
  };

  const renderFilterControls = () => (
    <>
      <div className="space-y-2">
        <label className="text-slate-400 font-semibold text-xs">Scan Filter Profile</label>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <button
            onClick={() => setFilterMode('magic')}
            className={`p-2.5 rounded-xl text-left border transition active:scale-98 ${
              filterMode === 'magic'
                ? 'bg-emerald-950/50 border-emerald-500 text-white shadow-md'
                : 'bg-slate-800/60 border-slate-700/60 text-slate-300 hover:bg-slate-800'
            }`}
          >
            <div className="font-bold flex items-center justify-between text-xs">
              <span>Magic Document Color</span>
              <span className="text-[9px] bg-emerald-500/20 text-emerald-300 px-1.5 py-0.5 rounded font-mono">
                Best
              </span>
            </div>
            <div className="text-[10px] text-slate-400 mt-0.5 leading-tight">
              Removes yellow paper tint while keeping text & seals vibrant.
            </div>
          </button>

          <button
            onClick={() => setFilterMode('bw')}
            className={`p-2.5 rounded-xl text-left border transition active:scale-98 ${
              filterMode === 'bw'
                ? 'bg-emerald-950/50 border-emerald-500 text-white shadow-md'
                : 'bg-slate-800/60 border-slate-700/60 text-slate-300 hover:bg-slate-800'
            }`}
          >
            <div className="font-bold text-xs">Crisp Black & White</div>
            <div className="text-[10px] text-slate-400 mt-0.5 leading-tight">
              High-contrast text binarization. Ideal for Xerox & printouts.
            </div>
          </button>

          <button
            onClick={() => setFilterMode('grayscale')}
            className={`p-2.5 rounded-xl text-left border transition active:scale-98 ${
              filterMode === 'grayscale'
                ? 'bg-emerald-950/50 border-emerald-500 text-white shadow-md'
                : 'bg-slate-800/60 border-slate-700/60 text-slate-300 hover:bg-slate-800'
            }`}
          >
            <div className="font-bold text-xs">Smooth Grayscale</div>
            <div className="text-[10px] text-slate-400 mt-0.5 leading-tight">
              Even tones with clear typography and grayscale photos.
            </div>
          </button>

          <button
            onClick={() => setFilterMode('original')}
            className={`p-2.5 rounded-xl text-left border transition active:scale-98 ${
              filterMode === 'original'
                ? 'bg-emerald-950/50 border-emerald-500 text-white shadow-md'
                : 'bg-slate-800/60 border-slate-700/60 text-slate-300 hover:bg-slate-800'
            }`}
          >
            <div className="font-bold text-xs">Original Colors</div>
            <div className="text-[10px] text-slate-400 mt-0.5 leading-tight">
              Pure photographic color without automated tone conversion.
            </div>
          </button>
        </div>
      </div>

      {/* Fine Tuning Sliders */}
      <div className="space-y-3 border-t border-slate-800 pt-3">
        <div className="flex items-center justify-between">
          <span className="text-slate-300 font-bold text-xs">Fine Tuning Sliders</span>
          <button
            onClick={() => {
              setFilterMode('magic');
              setAdjustments({ brightness: 0, contrast: 0, sharpness: 20, exposure: 0 });
            }}
            className="text-[10px] text-slate-400 hover:text-white flex items-center space-x-1"
          >
            <RotateCcw className="w-3 h-3" />
            <span>Reset</span>
          </button>
        </div>

        <div className="space-y-1">
          <div className="flex justify-between text-slate-400 text-xs">
            <span>Brightness</span>
            <span className="font-mono text-emerald-400 font-bold">{adjustments.brightness > 0 ? `+${adjustments.brightness}` : adjustments.brightness}</span>
          </div>
          <input
            type="range"
            min="-60"
            max="60"
            value={adjustments.brightness}
            onChange={(e) =>
              setAdjustments({ ...adjustments, brightness: parseInt(e.target.value) })
            }
            className="w-full accent-emerald-500 h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer"
          />
        </div>

        <div className="space-y-1">
          <div className="flex justify-between text-slate-400 text-xs">
            <span>Contrast</span>
            <span className="font-mono text-emerald-400 font-bold">{adjustments.contrast > 0 ? `+${adjustments.contrast}` : adjustments.contrast}</span>
          </div>
          <input
            type="range"
            min="-60"
            max="80"
            value={adjustments.contrast}
            onChange={(e) =>
              setAdjustments({ ...adjustments, contrast: parseInt(e.target.value) })
            }
            className="w-full accent-emerald-500 h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer"
          />
        </div>

        <div className="space-y-1">
          <div className="flex justify-between text-slate-400 text-xs">
            <span>Text Sharpness</span>
            <span className="font-mono text-emerald-400 font-bold">+{adjustments.sharpness}</span>
          </div>
          <input
            type="range"
            min="0"
            max="80"
            value={adjustments.sharpness}
            onChange={(e) =>
              setAdjustments({ ...adjustments, sharpness: parseInt(e.target.value) })
            }
            className="w-full accent-emerald-500 h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer"
          />
        </div>
      </div>
    </>
  );

  return (
    <div className="flex-1 flex flex-col md:flex-row overflow-hidden bg-[#0b0f19] select-none text-slate-200 h-full">
      {/* ======================================================== */}
      {/* MOBILE STRICT 50% PREVIEW / 50% FILTERS SPLIT VIEW        */}
      {/* ======================================================== */}
      <div className="flex md:hidden flex-1 flex-col h-full overflow-hidden">
        {/* Top 50%: Live Document Canvas Preview + Instant Apply & Save */}
        <div className="h-1/2 w-full bg-[#070b14] relative flex flex-col justify-between p-2 border-b border-slate-800 shrink-0">
          {/* Top action row */}
          <div className="flex items-center justify-between w-full z-10 gap-1.5 shrink-0">
            <button
              onClick={onBackToCorner}
              className="px-2.5 py-1 rounded-xl bg-slate-800/90 text-slate-300 text-xs font-semibold flex items-center space-x-1 border border-slate-700 active:scale-95"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
              <span>Corners</span>
            </button>

            <span className="text-[11px] font-bold text-emerald-400 bg-emerald-950/70 px-2 py-0.5 rounded-lg border border-emerald-800/60">
              {slotLabel}
            </span>

            <div className="flex items-center space-x-1">
              <button
                onClick={() => setBeforeAfterMode(!beforeAfterMode)}
                className={`px-2.5 py-1 rounded-xl text-xs font-semibold border transition active:scale-95 ${
                  beforeAfterMode
                    ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                    : 'bg-slate-800 text-slate-300 border-slate-700'
                }`}
              >
                <Eye className="w-3.5 h-3.5 inline mr-1" />
                <span>{beforeAfterMode ? 'Raw' : 'Original'}</span>
              </button>

              <button
                onClick={handleConfirm}
                className="px-3 py-1 bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 text-white rounded-xl text-xs font-bold shadow-md shadow-emerald-900/40 flex items-center space-x-1 active:scale-95 transition"
              >
                <Check className="w-3.5 h-3.5" />
                <span>Apply & Save</span>
              </button>
            </div>
          </div>

          {/* Centered Document Canvas */}
          <div
            className="flex-1 w-full flex items-center justify-center p-1 overflow-hidden transition-transform duration-75"
            style={{ transform: `scale(${zoom})` }}
          >
            <canvas
              ref={mobileCanvasRef}
              className="max-h-[34vh] max-w-[95%] object-contain rounded-lg shadow-2xl border border-slate-700/80 bg-white"
            />
          </div>

          {/* Bottom Zoom & Info Bar */}
          <div className="flex items-center justify-between text-[10px] text-slate-400 bg-slate-900/90 px-2.5 py-1 rounded-xl border border-slate-800 shrink-0">
            <span>Filter: <strong className="text-emerald-400 uppercase">{filterMode}</strong></span>
            <div className="flex items-center space-x-1.5">
              <button
                onClick={() => setZoom((z) => Math.max(0.5, Number((z - 0.2).toFixed(2))))}
                className="p-0.5 text-slate-300 active:text-white"
              >
                <ZoomOut className="w-3 h-3" />
              </button>
              <button
                onClick={() => setZoom(1)}
                className="font-mono text-slate-300 px-1"
              >
                {Math.round(zoom * 100)}%
              </button>
              <button
                onClick={() => setZoom((z) => Math.min(3.0, Number((z + 0.2).toFixed(2))))}
                className="p-0.5 text-slate-300 active:text-white"
              >
                <ZoomIn className="w-3 h-3" />
              </button>
            </div>
          </div>
        </div>

        {/* Lower 50%: Scrollable Filter Profiles & Sliders */}
        <div className="h-1/2 w-full overflow-y-auto bg-slate-900 p-3.5 space-y-3.5 text-xs text-slate-200">
          {renderFilterControls()}
        </div>
      </div>

      {/* ======================================================== */}
      {/* DESKTOP SIDE-BY-SIDE VIEW                                 */}
      {/* ======================================================== */}
      <div className="hidden md:flex flex-1 flex-row overflow-hidden h-full">
        {/* Center Image Viewport */}
        <div className="flex-1 flex flex-col items-center justify-between p-4 overflow-hidden relative">
          {/* Top Floating Bar */}
          <div className="w-full flex items-center justify-between bg-slate-900/90 backdrop-blur-md px-4 py-2.5 rounded-2xl border border-slate-800 shadow-xl mb-3">
            <div className="flex items-center space-x-2">
              <span className="text-xs font-bold text-emerald-400 bg-emerald-950/60 px-2.5 py-1 rounded-lg border border-emerald-800/40">
                {slotLabel}
              </span>
              <span className="text-xs text-slate-400">Document Enhancement & Readability Tuning</span>
            </div>

            <div className="flex items-center space-x-2">
              <button
                onClick={() => setBeforeAfterMode(!beforeAfterMode)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition ${
                  beforeAfterMode
                    ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                    : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700'
                }`}
              >
                <Eye className="w-3.5 h-3.5 inline mr-1.5" />
                <span>{beforeAfterMode ? 'Viewing Raw' : 'Compare Original'}</span>
              </button>

              <button
                onClick={onBackToCorner}
                className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs transition"
              >
                Adjust Corners
              </button>

              <button
                onClick={handleConfirm}
                className="px-4 py-1.5 bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 text-white rounded-xl text-xs font-bold shadow-lg shadow-emerald-900/40 flex items-center space-x-1.5 transition"
              >
                <Check className="w-4 h-4" />
                <span>Apply & Save {slotLabel}</span>
              </button>
            </div>
          </div>

          {/* Canvas Display */}
          <div className="flex-1 w-full flex items-center justify-center p-2 overflow-auto">
            <canvas
              ref={desktopCanvasRef}
              className="max-h-[66vh] max-w-[92vw] object-contain rounded-xl shadow-2xl border border-slate-700/80 bg-white"
            />
          </div>

          {/* Footer info */}
          <div className="text-[11px] text-slate-400 pt-2 text-center">
            High-contrast readability engine cleans shadows & reinforces micro-text.
          </div>
        </div>

        {/* Right Adjustment Sidebar */}
        <div className="w-80 bg-slate-900 border-l border-slate-800 flex flex-col h-full shrink-0">
          <div className="p-4 border-b border-slate-800 bg-slate-950/40 flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Sparkles className="w-4 h-4 text-emerald-400" />
              <span className="font-semibold text-sm">Enhancement Profiles</span>
            </div>
          </div>
          <div className="p-4 space-y-4 flex-1 overflow-y-auto text-xs">
            {renderFilterControls()}
          </div>
        </div>
      </div>
    </div>
  );
};
