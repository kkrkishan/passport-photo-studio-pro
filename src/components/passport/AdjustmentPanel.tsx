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
  Rotate3D
} from 'lucide-react';
import { Adjustments } from '../../types';

interface AdjustmentPanelProps {
  adjustments: Adjustments;
  onChange: (updated: Adjustments) => void;
  onAutoEnhance: () => void;
  onReset: () => void;
  beforeAfterMode: boolean;
  onToggleBeforeAfter: () => void;
}

export const AdjustmentPanel: React.FC<AdjustmentPanelProps> = ({
  adjustments,
  onChange,
  onAutoEnhance,
  onReset,
  beforeAfterMode,
  onToggleBeforeAfter,
}) => {
  const update = (key: keyof Adjustments, val: any) => {
    onChange({ ...adjustments, [key]: val });
  };

  return (
    <div className="w-80 bg-slate-900 border-l border-slate-800 flex flex-col h-full select-none text-slate-200">
      {/* Header */}
      <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/40">
        <div className="flex items-center space-x-2">
          <Sliders className="w-4 h-4 text-blue-400" />
          <span className="font-semibold text-sm">Enhancement & Tuning</span>
        </div>
        <button
          onClick={onReset}
          className="text-[11px] text-slate-400 hover:text-rose-400 transition"
          title="Reset all adjustments"
        >
          Reset All
        </button>
      </div>

      {/* Scrollable controls */}
      <div className="flex-1 overflow-y-auto p-4 space-y-5">
        {/* Quick Actions: Auto Enhance & Before/After */}
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={onAutoEnhance}
            className="flex items-center justify-center space-x-1.5 py-2 px-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 rounded-xl text-xs font-semibold text-white shadow-md shadow-blue-900/30 transition"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Auto Enhance</span>
          </button>
          <button
            onClick={onToggleBeforeAfter}
            className={`flex items-center justify-center space-x-1.5 py-2 px-3 rounded-xl text-xs font-semibold border transition ${
              beforeAfterMode
                ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700'
            }`}
          >
            <Eye className="w-3.5 h-3.5" />
            <span>{beforeAfterMode ? 'Viewing Original' : 'Before / After'}</span>
          </button>
        </div>

        {/* Orientation & Rotation */}
        <div className="space-y-2">
          <label className="text-xs font-medium text-slate-400 flex items-center justify-between">
            <span>Orientation & Tilt</span>
            <span className="font-mono text-cyan-400">{adjustments.rotation}°</span>
          </label>
          <div className="grid grid-cols-4 gap-1.5">
            <button
              onClick={() => update('rotation', ((adjustments.rotation - 90 + 360) % 360) - 180)}
              className="p-2 bg-slate-800 hover:bg-slate-700 rounded-lg flex items-center justify-center text-slate-300 transition"
              title="Rotate 90° CCW"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
            <button
              onClick={() => update('rotation', ((adjustments.rotation + 90 + 180) % 360) - 180)}
              className="p-2 bg-slate-800 hover:bg-slate-700 rounded-lg flex items-center justify-center text-slate-300 transition"
              title="Rotate 90° CW"
            >
              <RotateCw className="w-4 h-4" />
            </button>
            <button
              onClick={() => update('flipH', !adjustments.flipH)}
              className={`p-2 rounded-lg flex items-center justify-center transition ${
                adjustments.flipH ? 'bg-blue-600 text-white' : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
              }`}
              title="Flip Horizontal"
            >
              <FlipHorizontal className="w-4 h-4" />
            </button>
            <button
              onClick={() => update('flipV', !adjustments.flipV)}
              className={`p-2 rounded-lg flex items-center justify-center transition ${
                adjustments.flipV ? 'bg-blue-600 text-white' : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
              }`}
              title="Flip Vertical"
            >
              <FlipVertical className="w-4 h-4" />
            </button>
          </div>

          {/* Fine Rotation Slider */}
          <div className="pt-1">
            <div className="flex justify-between text-[11px] text-slate-400 mb-1">
              <span>Fine Straighten</span>
              <span>-45° to +45°</span>
            </div>
            <input
              type="range"
              min="-45"
              max="45"
              step="0.5"
              value={adjustments.rotation}
              onChange={(e) => update('rotation', parseFloat(e.target.value))}
              className="w-full accent-blue-500 h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer"
            />
          </div>
        </div>

        {/* Tonal Adjustments */}
        <div className="space-y-3.5 border-t border-slate-800 pt-3">
          <div className="text-xs font-semibold text-slate-300">Light & Color</div>

          {/* Brightness */}
          <div className="space-y-1">
            <div className="flex justify-between text-xs">
              <span className="text-slate-400">Brightness</span>
              <span className="font-mono text-slate-300">{adjustments.brightness}</span>
            </div>
            <input
              type="range"
              min="-100"
              max="100"
              value={adjustments.brightness}
              onChange={(e) => update('brightness', parseInt(e.target.value))}
              className="w-full accent-blue-500 h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer"
            />
          </div>

          {/* Contrast */}
          <div className="space-y-1">
            <div className="flex justify-between text-xs">
              <span className="text-slate-400">Contrast</span>
              <span className="font-mono text-slate-300">{adjustments.contrast}</span>
            </div>
            <input
              type="range"
              min="-100"
              max="100"
              value={adjustments.contrast}
              onChange={(e) => update('contrast', parseInt(e.target.value))}
              className="w-full accent-blue-500 h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer"
            />
          </div>

          {/* Exposure */}
          <div className="space-y-1">
            <div className="flex justify-between text-xs">
              <span className="text-slate-400">Exposure</span>
              <span className="font-mono text-slate-300">{adjustments.exposure}</span>
            </div>
            <input
              type="range"
              min="-100"
              max="100"
              value={adjustments.exposure}
              onChange={(e) => update('exposure', parseInt(e.target.value))}
              className="w-full accent-blue-500 h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer"
            />
          </div>

          {/* Saturation */}
          <div className="space-y-1">
            <div className="flex justify-between text-xs">
              <span className="text-slate-400">Saturation</span>
              <span className="font-mono text-slate-300">{adjustments.saturation}</span>
            </div>
            <input
              type="range"
              min="-100"
              max="100"
              value={adjustments.saturation}
              onChange={(e) => update('saturation', parseInt(e.target.value))}
              className="w-full accent-blue-500 h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer"
            />
          </div>

          {/* Sharpness */}
          <div className="space-y-1">
            <div className="flex justify-between text-xs">
              <span className="text-slate-400 flex items-center space-x-1">
                <Zap className="w-3 h-3 text-amber-400" />
                <span>Sharpness (Biometric Clarity)</span>
              </span>
              <span className="font-mono text-slate-300">{adjustments.sharpness}</span>
            </div>
            <input
              type="range"
              min="0"
              max="100"
              value={adjustments.sharpness}
              onChange={(e) => update('sharpness', parseInt(e.target.value))}
              className="w-full accent-amber-500 h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer"
            />
          </div>

          {/* Highlights */}
          <div className="space-y-1">
            <div className="flex justify-between text-xs">
              <span className="text-slate-400">Highlights</span>
              <span className="font-mono text-slate-300">{adjustments.highlights}</span>
            </div>
            <input
              type="range"
              min="-100"
              max="100"
              value={adjustments.highlights}
              onChange={(e) => update('highlights', parseInt(e.target.value))}
              className="w-full accent-blue-500 h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer"
            />
          </div>

          {/* Shadows */}
          <div className="space-y-1">
            <div className="flex justify-between text-xs">
              <span className="text-slate-400">Shadows (Face Fill)</span>
              <span className="font-mono text-slate-300">{adjustments.shadows}</span>
            </div>
            <input
              type="range"
              min="-100"
              max="100"
              value={adjustments.shadows}
              onChange={(e) => update('shadows', parseInt(e.target.value))}
              className="w-full accent-blue-500 h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer"
            />
          </div>

          {/* Temperature */}
          <div className="space-y-1">
            <div className="flex justify-between text-xs">
              <span className="text-slate-400 flex items-center space-x-1">
                <Flame className="w-3 h-3 text-orange-400" />
                <span>White Balance / Warmth</span>
              </span>
              <span className="font-mono text-slate-300">{adjustments.temperature}</span>
            </div>
            <input
              type="range"
              min="-100"
              max="100"
              value={adjustments.temperature}
              onChange={(e) => update('temperature', parseInt(e.target.value))}
              className="w-full accent-orange-500 h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer"
            />
          </div>
        </div>
      </div>
    </div>
  );
};
