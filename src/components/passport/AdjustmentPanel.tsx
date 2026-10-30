import React from 'react';
import {
  Sun,
  Contrast,
  Sparkles,
  RotateCcw,
  RotateCw,
  FlipHorizontal,
  FlipVertical,
  Sliders,
  Flame,
  Zap,
  Eye,
  Check
} from 'lucide-react';
import { Adjustments } from '../../types';

interface AdjustmentPanelProps {
  adjustments: Adjustments;
  onChange: (updated: Adjustments) => void;
  onAutoEnhance: () => void;
  onReset: () => void;
  beforeAfterMode: boolean;
  onToggleBeforeAfter: () => void;
  onDone?: () => void;
}

export const AdjustmentPanel: React.FC<AdjustmentPanelProps> = ({
  adjustments,
  onChange,
  onAutoEnhance,
  onReset,
  beforeAfterMode,
  onToggleBeforeAfter,
  onDone,
}) => {
  const update = (key: keyof Adjustments, val: any) => {
    onChange({ ...adjustments, [key]: val });
  };

  return (
    <div className="w-full md:w-80 bg-slate-900 border-l border-slate-800 flex flex-col h-full select-none text-slate-200">
      {/* Header */}
      <div className="p-3.5 border-b border-slate-800 flex items-center justify-between bg-slate-950/50">
        <div className="flex items-center space-x-2">
          <Sliders className="w-4 h-4 text-blue-400" />
          <span className="font-bold text-sm text-white">Enhancement & Tuning</span>
        </div>
        <div className="flex items-center space-x-2">
          <button
            onClick={onReset}
            className="text-xs text-slate-400 hover:text-rose-400 px-2 py-1 rounded bg-slate-800 border border-slate-700/80 active:scale-95 transition"
            title="Reset all adjustments"
          >
            Reset All
          </button>
          {onDone && (
            <button
              onClick={onDone}
              className="px-3 py-1 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-bold shadow-md flex items-center space-x-1 active:scale-95 transition"
            >
              <Check className="w-3.5 h-3.5" />
              <span>Done</span>
            </button>
          )}
        </div>
      </div>

      {/* Scrollable controls */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 text-xs">
        {/* Quick Actions: Auto Enhance & Before/After */}
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={onAutoEnhance}
            className="flex items-center justify-center space-x-1.5 py-2.5 px-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 rounded-xl text-xs font-bold text-white shadow-md shadow-blue-900/30 active:scale-95 transition"
          >
            <Sparkles className="w-4 h-4" />
            <span>Auto Enhance</span>
          </button>
          <button
            onClick={onToggleBeforeAfter}
            className={`flex items-center justify-center space-x-1.5 py-2.5 px-3 rounded-xl text-xs font-bold border active:scale-95 transition ${
              beforeAfterMode
                ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700'
            }`}
          >
            <Eye className="w-4 h-4" />
            <span>{beforeAfterMode ? 'Original' : 'Before / After'}</span>
          </button>
        </div>

        {/* Orientation & Rotation */}
        <div className="space-y-2.5 bg-slate-950/40 p-3 rounded-2xl border border-slate-800/80">
          <label className="text-xs font-bold text-slate-300 flex items-center justify-between">
            <span>Orientation & Tilt</span>
            <span className="font-mono text-cyan-400">{adjustments.rotation}°</span>
          </label>
          <div className="grid grid-cols-4 gap-2">
            <button
              onClick={() => update('rotation', ((adjustments.rotation - 90 + 360) % 360) - 180)}
              className="py-2 bg-slate-800 hover:bg-slate-700 rounded-xl flex items-center justify-center text-slate-300 border border-slate-700/80 active:scale-95 transition"
              title="Rotate 90° CCW"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
            <button
              onClick={() => update('rotation', ((adjustments.rotation + 90 + 180) % 360) - 180)}
              className="py-2 bg-slate-800 hover:bg-slate-700 rounded-xl flex items-center justify-center text-slate-300 border border-slate-700/80 active:scale-95 transition"
              title="Rotate 90° CW"
            >
              <RotateCw className="w-4 h-4" />
            </button>
            <button
              onClick={() => update('flipH', !adjustments.flipH)}
              className={`py-2 rounded-xl flex items-center justify-center border active:scale-95 transition ${
                adjustments.flipH ? 'bg-blue-600 text-white border-blue-500' : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700/80'
              }`}
              title="Flip Horizontal"
            >
              <FlipHorizontal className="w-4 h-4" />
            </button>
            <button
              onClick={() => update('flipV', !adjustments.flipV)}
              className={`py-2 rounded-xl flex items-center justify-center border active:scale-95 transition ${
                adjustments.flipV ? 'bg-blue-600 text-white border-blue-500' : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700/80'
              }`}
              title="Flip Vertical"
            >
              <FlipVertical className="w-4 h-4" />
            </button>
          </div>

          {/* Fine Rotation Slider */}
          <div className="pt-1 space-y-1">
            <div className="flex justify-between text-[11px] text-slate-400">
              <span>Fine Straighten</span>
              <span className="font-mono text-slate-300">{adjustments.rotation}° (-45° to +45°)</span>
            </div>
            <input
              type="range"
              min="-45"
              max="45"
              step="0.5"
              value={adjustments.rotation}
              onChange={(e) => update('rotation', parseFloat(e.target.value))}
              className="w-full accent-blue-500 h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer"
            />
          </div>
        </div>

        {/* Tonal Adjustments */}
        <div className="space-y-3.5 bg-slate-950/40 p-3 rounded-2xl border border-slate-800/80">
          <div className="text-xs font-bold text-white flex items-center justify-between">
            <span>Light & Color Controls</span>
            <span className="text-[10px] text-slate-400 font-normal">Real-Time Calibration</span>
          </div>

          {/* Brightness */}
          <div className="space-y-1">
            <div className="flex justify-between text-xs font-medium">
              <span className="text-slate-300 flex items-center space-x-1.5">
                <Sun className="w-3.5 h-3.5 text-amber-400" />
                <span>Brightness</span>
              </span>
              <span className="font-mono text-cyan-400 font-bold">{adjustments.brightness > 0 ? `+${adjustments.brightness}` : adjustments.brightness}</span>
            </div>
            <input
              type="range"
              min="-100"
              max="100"
              value={adjustments.brightness}
              onChange={(e) => update('brightness', parseInt(e.target.value))}
              className="w-full accent-amber-400 h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer"
            />
          </div>

          {/* Contrast */}
          <div className="space-y-1">
            <div className="flex justify-between text-xs font-medium">
              <span className="text-slate-300 flex items-center space-x-1.5">
                <Contrast className="w-3.5 h-3.5 text-blue-400" />
                <span>Contrast</span>
              </span>
              <span className="font-mono text-cyan-400 font-bold">{adjustments.contrast > 0 ? `+${adjustments.contrast}` : adjustments.contrast}</span>
            </div>
            <input
              type="range"
              min="-100"
              max="100"
              value={adjustments.contrast}
              onChange={(e) => update('contrast', parseInt(e.target.value))}
              className="w-full accent-blue-500 h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer"
            />
          </div>

          {/* Exposure */}
          <div className="space-y-1">
            <div className="flex justify-between text-xs font-medium">
              <span className="text-slate-300">Exposure</span>
              <span className="font-mono text-cyan-400 font-bold">{adjustments.exposure > 0 ? `+${adjustments.exposure}` : adjustments.exposure}</span>
            </div>
            <input
              type="range"
              min="-100"
              max="100"
              value={adjustments.exposure}
              onChange={(e) => update('exposure', parseInt(e.target.value))}
              className="w-full accent-blue-500 h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer"
            />
          </div>

          {/* Saturation */}
          <div className="space-y-1">
            <div className="flex justify-between text-xs font-medium">
              <span className="text-slate-300">Saturation</span>
              <span className="font-mono text-cyan-400 font-bold">{adjustments.saturation > 0 ? `+${adjustments.saturation}` : adjustments.saturation}</span>
            </div>
            <input
              type="range"
              min="-100"
              max="100"
              value={adjustments.saturation}
              onChange={(e) => update('saturation', parseInt(e.target.value))}
              className="w-full accent-blue-500 h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer"
            />
          </div>

          {/* Sharpness */}
          <div className="space-y-1">
            <div className="flex justify-between text-xs font-medium">
              <span className="text-slate-300 flex items-center space-x-1.5">
                <Zap className="w-3.5 h-3.5 text-amber-400" />
                <span>Sharpness (Biometric Clarity)</span>
              </span>
              <span className="font-mono text-amber-400 font-bold">{adjustments.sharpness}</span>
            </div>
            <input
              type="range"
              min="0"
              max="100"
              value={adjustments.sharpness}
              onChange={(e) => update('sharpness', parseInt(e.target.value))}
              className="w-full accent-amber-400 h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer"
            />
          </div>

          {/* Highlights */}
          <div className="space-y-1">
            <div className="flex justify-between text-xs font-medium">
              <span className="text-slate-300">Highlights</span>
              <span className="font-mono text-cyan-400 font-bold">{adjustments.highlights > 0 ? `+${adjustments.highlights}` : adjustments.highlights}</span>
            </div>
            <input
              type="range"
              min="-100"
              max="100"
              value={adjustments.highlights}
              onChange={(e) => update('highlights', parseInt(e.target.value))}
              className="w-full accent-blue-500 h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer"
            />
          </div>

          {/* Shadows */}
          <div className="space-y-1">
            <div className="flex justify-between text-xs font-medium">
              <span className="text-slate-300">Shadows (Face Fill)</span>
              <span className="font-mono text-cyan-400 font-bold">{adjustments.shadows > 0 ? `+${adjustments.shadows}` : adjustments.shadows}</span>
            </div>
            <input
              type="range"
              min="-100"
              max="100"
              value={adjustments.shadows}
              onChange={(e) => update('shadows', parseInt(e.target.value))}
              className="w-full accent-blue-500 h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer"
            />
          </div>

          {/* Temperature */}
          <div className="space-y-1">
            <div className="flex justify-between text-xs font-medium">
              <span className="text-slate-300 flex items-center space-x-1.5">
                <Flame className="w-3.5 h-3.5 text-orange-400" />
                <span>Color Warmth / White Balance</span>
              </span>
              <span className="font-mono text-orange-400 font-bold">{adjustments.temperature > 0 ? `+${adjustments.temperature}` : adjustments.temperature}</span>
            </div>
            <input
              type="range"
              min="-100"
              max="100"
              value={adjustments.temperature}
              onChange={(e) => update('temperature', parseInt(e.target.value))}
              className="w-full accent-orange-500 h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer"
            />
          </div>
        </div>

        {/* Bottom Apply / Done Button on Mobile */}
        {onDone && (
          <button
            onClick={onDone}
            className="w-full py-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 text-white rounded-2xl text-xs font-bold shadow-lg shadow-blue-900/40 active:scale-95 transition flex items-center justify-center space-x-2"
          >
            <Check className="w-4 h-4" />
            <span>Apply Adjustments & Return to Crop</span>
          </button>
        )}
      </div>
    </div>
  );
};
