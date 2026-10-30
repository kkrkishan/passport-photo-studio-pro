import React from 'react';
import {
  Palette,
  Check,
  RotateCcw,
  Droplets,
  Sparkles,
  Pipette,
  Eraser,
  Paintbrush,
  Sliders,
  Focus,
  Layers,
  Trash2
} from 'lucide-react';
import { BackgroundSettings, BackgroundMode, BrushToolMode } from '../../types';

interface BackgroundStudioProps {
  settings: BackgroundSettings;
  onChange: (updated: BackgroundSettings) => void;
  onReset?: () => void;
  isEyedropperActive?: boolean;
  onToggleEyedropper?: () => void;
  onClearBrushMask?: () => void;
}

const STUDIO_COLORS = [
  { name: 'Pure White (ICAO / US / India)', color: '#ffffff', border: '#cbd5e1' },
  { name: 'Studio Blue (Schengen / Malaysia)', color: '#0284c7', border: '#0284c7' },
  { name: 'Light Gray (UK / Canada / EU)', color: '#e2e8f0', border: '#cbd5e1' },
  { name: 'Off-White / Cream', color: '#f8fafc', border: '#cbd5e1' },
  { name: 'Navy Studio Blue', color: '#1e3a8a', border: '#1e3a8a' },
  { name: 'Warm Light Red', color: '#fee2e2', border: '#fca5a5' },
];

export const BackgroundStudio: React.FC<BackgroundStudioProps> = ({
  settings,
  onChange,
  onReset,
  isEyedropperActive = false,
  onToggleEyedropper,
  onClearBrushMask,
}) => {
  const update = (key: keyof BackgroundSettings, val: any) => {
    onChange({ ...settings, [key]: val });
  };

  const handleDeselect = () => {
    onChange({
      enabled: false,
      mode: 'smart_ai',
      color: '#ffffff',
      tolerance: 30,
      feather: 4,
      sourceColor: undefined,
      transparent: false,
      blurRadius: 0,
      brushMode: 'none',
      brushSize: 25,
      brushMaskDataUrl: null,
    });
    onReset?.();
  };

  const currentMode: BackgroundMode = settings.mode || (settings.blurRadius && settings.blurRadius > 0 ? 'blur' : 'smart_ai');
  const currentBrush: BrushToolMode = settings.brushMode || 'none';
  const brushSize = settings.brushSize || 25;
  const blurRadius = settings.blurRadius || 0;

  return (
    <div className="p-4 bg-slate-900 border-t border-slate-800 space-y-4 select-none text-slate-200">
      {/* Header with Enable Switch & Deselect Button */}
      <div className="flex items-center justify-between pb-2 border-b border-slate-800">
        <div className="flex items-center space-x-2">
          <Palette className="w-4 h-4 text-cyan-400" />
          <span className="text-sm font-bold text-white">Studio Background & AI Eraser</span>
        </div>

        <div className="flex items-center space-x-2">
          {settings.enabled && (
            <button
              onClick={handleDeselect}
              className="px-2.5 py-1 bg-slate-800 hover:bg-rose-900/30 text-rose-400 hover:text-rose-300 rounded-lg text-xs font-semibold flex items-center space-x-1 border border-slate-700/80 active:scale-95 transition"
              title="Deselect background replacement and restore original"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Deselect</span>
            </button>
          )}

          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={settings.enabled}
              onChange={(e) => update('enabled', e.target.checked)}
              className="sr-only peer"
            />
            <div className="w-10 h-6 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
          </label>
        </div>
      </div>

      {!settings.enabled ? (
        <div className="text-center py-6 px-4 bg-slate-950/60 rounded-2xl border border-dashed border-slate-800 space-y-3">
          <Droplets className="w-8 h-8 text-slate-500 mx-auto" />
          <p className="text-xs text-slate-400 font-medium">Original Background Active</p>
          <p className="text-[11px] text-slate-500 max-w-xs mx-auto">
            100% Offline AI portrait cutout (PicsArt-style), studio white/blue backdrops, and DSLR bokeh portrait blur.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-2 pt-1">
            <button
              onClick={() => {
                onChange({ ...settings, enabled: true, mode: 'smart_ai' });
              }}
              className="w-full sm:w-auto px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 text-white rounded-xl text-xs font-bold shadow-md shadow-blue-900/40 active:scale-95 transition flex items-center justify-center space-x-1.5"
            >
              <Sparkles className="w-3.5 h-3.5 text-yellow-300" />
              <span>Auto AI Portrait Cutout</span>
            </button>
            <button
              onClick={() => {
                onChange({ ...settings, enabled: true, mode: 'blur', blurRadius: 14 });
              }}
              className="w-full sm:w-auto px-4 py-2 bg-slate-800 hover:bg-slate-700 text-cyan-300 rounded-xl text-xs font-bold border border-slate-700 active:scale-95 transition flex items-center justify-center space-x-1.5"
            >
              <Focus className="w-3.5 h-3.5" />
              <span>DSLR Portrait Blur</span>
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {/* 1. Core Segmentation Mode: Smart AI Cutout vs DSLR Blur vs Color Match */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-300 flex items-center justify-between">
              <span>Cutout & Background Mode</span>
              <span className="text-[10px] text-cyan-400 font-mono">100% Offline AI</span>
            </label>
            <div className="grid grid-cols-3 gap-1.5">
              <button
                onClick={() => {
                  onChange({ ...settings, mode: 'smart_ai', blurRadius: 0 });
                }}
                className={`py-2 px-2 rounded-xl text-[11px] font-bold border transition flex flex-col items-center space-y-1 ${
                  currentMode === 'smart_ai'
                    ? 'bg-blue-600 text-white border-blue-500 shadow-md shadow-blue-900/40'
                    : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-white'
                }`}
              >
                <Sparkles className={`w-3.5 h-3.5 ${currentMode === 'smart_ai' ? 'text-yellow-300' : 'text-slate-400'}`} />
                <span>Smart AI Cutout</span>
              </button>

              <button
                onClick={() => {
                  onChange({
                    ...settings,
                    mode: 'blur',
                    blurRadius: settings.blurRadius && settings.blurRadius > 0 ? settings.blurRadius : 12,
                    transparent: false,
                  });
                }}
                className={`py-2 px-2 rounded-xl text-[11px] font-bold border transition flex flex-col items-center space-y-1 ${
                  currentMode === 'blur'
                    ? 'bg-cyan-600 text-white border-cyan-500 shadow-md shadow-cyan-900/40'
                    : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-white'
                }`}
              >
                <Focus className={`w-3.5 h-3.5 ${currentMode === 'blur' ? 'text-cyan-200' : 'text-slate-400'}`} />
                <span>DSLR Blur</span>
              </button>

              <button
                onClick={() => {
                  onChange({ ...settings, mode: 'color_key', blurRadius: 0 });
                }}
                className={`py-2 px-2 rounded-xl text-[11px] font-bold border transition flex flex-col items-center space-y-1 ${
                  currentMode === 'color_key'
                    ? 'bg-indigo-600 text-white border-indigo-500 shadow-md shadow-indigo-900/40'
                    : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-white'
                }`}
              >
                <Sliders className={`w-3.5 h-3.5 ${currentMode === 'color_key' ? 'text-indigo-200' : 'text-slate-400'}`} />
                <span>Color Key Match</span>
              </button>
            </div>
          </div>

          {/* 2. DSLR Background Blur Slider (Shown when in Blur Mode) */}
          {currentMode === 'blur' && (
            <div className="p-3 bg-cyan-950/30 rounded-2xl border border-cyan-800/40 space-y-2">
              <div className="flex justify-between items-center text-xs font-semibold">
                <span className="text-cyan-300 flex items-center space-x-1">
                  <Focus className="w-3.5 h-3.5" />
                  <span>DSLR Portrait Bokeh Intensity</span>
                </span>
                <span className="font-mono text-cyan-400 font-bold">{blurRadius}px</span>
              </div>
              <input
                type="range"
                min="2"
                max="30"
                value={blurRadius}
                onChange={(e) => update('blurRadius', parseInt(e.target.value))}
                className="w-full accent-cyan-400 h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-slate-400">
                <button
                  type="button"
                  onClick={() => update('blurRadius', 6)}
                  className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-cyan-300"
                >
                  Subtle (6px)
                </button>
                <button
                  type="button"
                  onClick={() => update('blurRadius', 14)}
                  className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-cyan-300"
                >
                  Medium (14px)
                </button>
                <button
                  type="button"
                  onClick={() => update('blurRadius', 25)}
                  className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-cyan-300"
                >
                  Deep Bokeh (25px)
                </button>
              </div>
            </div>
          )}

          {/* 3. Output Fill Style: Studio Color vs Transparent (when not in Blur mode) */}
          {currentMode !== 'blur' && (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => update('transparent', false)}
                  className={`py-2 px-3 rounded-xl text-xs font-bold border transition ${
                    !settings.transparent
                      ? 'bg-blue-600 text-white border-blue-500 shadow-md'
                      : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-white'
                  }`}
                >
                  Studio Color Fill
                </button>
                <button
                  onClick={() => update('transparent', true)}
                  className={`py-2 px-3 rounded-xl text-xs font-bold border transition ${
                    settings.transparent
                      ? 'bg-cyan-600 text-white border-cyan-500 shadow-md'
                      : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-white'
                  }`}
                >
                  Transparent PNG Cutout
                </button>
              </div>

              {!settings.transparent && (
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-slate-300 flex justify-between items-center">
                    <span>Select New Backdrop Color</span>
                    <span className="font-mono text-[11px] text-cyan-400 uppercase">{settings.color}</span>
                  </label>

                  <div className="flex flex-wrap items-center gap-2">
                    {STUDIO_COLORS.map((preset) => (
                      <button
                        key={preset.color}
                        onClick={() => update('color', preset.color)}
                        className="w-8 h-8 rounded-full flex items-center justify-center border-2 transition shadow-sm active:scale-95"
                        style={{
                          backgroundColor: preset.color,
                          borderColor: settings.color.toLowerCase() === preset.color.toLowerCase() ? '#2563eb' : preset.border,
                          transform: settings.color.toLowerCase() === preset.color.toLowerCase() ? 'scale(1.15)' : 'none',
                        }}
                        title={preset.name}
                      >
                        {settings.color.toLowerCase() === preset.color.toLowerCase() && (
                          <Check
                            className={`w-4 h-4 ${
                              preset.color === '#ffffff' || preset.color === '#f8fafc' || preset.color === '#e2e8f0'
                                ? 'text-slate-900 font-bold'
                                : 'text-white'
                            }`}
                          />
                        )}
                      </button>
                    ))}

                    {/* Custom Color Input */}
                    <div className="relative flex items-center">
                      <input
                        type="color"
                        value={settings.color}
                        onChange={(e) => update('color', e.target.value)}
                        className="w-8 h-8 rounded-full cursor-pointer opacity-0 absolute inset-0 z-10"
                        title="Choose custom background color"
                      />
                      <div
                        className="w-8 h-8 rounded-full border-2 border-slate-600 flex items-center justify-center text-xs font-bold text-slate-300 shadow-sm"
                        style={{ backgroundColor: settings.color }}
                      >
                        +
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* 4. Screen Eyedropper Color Picker Tool */}
          <div className="space-y-2 border-t border-slate-800 pt-3">
            <div className="flex items-center justify-between text-xs font-semibold text-slate-300">
              <span className="flex items-center space-x-1.5">
                <Pipette className="w-3.5 h-3.5 text-amber-400" />
                <span>Screen Color Eyedropper</span>
              </span>
              {settings.sourceColor && (
                <button
                  onClick={() => update('sourceColor', undefined)}
                  className="text-[11px] text-cyan-400 hover:underline"
                >
                  Reset to Auto-Detect
                </button>
              )}
            </div>

            <div className="flex items-center space-x-2 bg-slate-950/60 p-2 rounded-xl border border-slate-800">
              <div
                className="w-7 h-7 rounded-lg border border-slate-700 shadow-sm shrink-0"
                style={{ backgroundColor: settings.sourceColor || '#e2e8f0' }}
              />
              <div className="flex-1 text-[11px] min-w-0">
                <span className="font-semibold text-white block truncate">
                  {settings.sourceColor ? `Target: ${settings.sourceColor}` : 'Auto-Identified from Edges'}
                </span>
                <span className="text-[10px] text-slate-400 block truncate">
                  {isEyedropperActive
                    ? '👇 फोटो पर टैप करें - कलर सेलेक्ट हो जाएगा'
                    : 'Tap tool to pick exact background hue'}
                </span>
              </div>

              {/* Eyedropper Toggle Button */}
              <button
                type="button"
                onClick={onToggleEyedropper}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center space-x-1 transition active:scale-95 shadow-sm ${
                  isEyedropperActive
                    ? 'bg-amber-500 text-slate-950 animate-pulse border border-amber-400 font-extrabold'
                    : 'bg-slate-800 hover:bg-slate-700 text-amber-300 border border-slate-700'
                }`}
                title="Tap anywhere on the photo to pick exact background color"
              >
                <Pipette className="w-3.5 h-3.5" />
                <span>{isEyedropperActive ? 'Picking...' : 'Pick Color'}</span>
              </button>
            </div>
          </div>

          {/* 5. Manual Erase & Restore Touchup Brushes */}
          <div className="space-y-3 border-t border-slate-800 pt-3">
            <div className="flex items-center justify-between text-xs font-semibold text-slate-300">
              <span className="flex items-center space-x-1.5">
                <Paintbrush className="w-3.5 h-3.5 text-emerald-400" />
                <span>Manual Touchup Brushes</span>
              </span>
              {onClearBrushMask && (
                <button
                  type="button"
                  onClick={onClearBrushMask}
                  className="text-[11px] text-rose-400 hover:text-rose-300 flex items-center space-x-1 hover:underline"
                  title="Wipe manual erase/restore marks"
                >
                  <Trash2 className="w-3 h-3" />
                  <span>Clear Brush Marks</span>
                </button>
              )}
            </div>

            {/* Brush Mode Selector: None vs Erase vs Restore */}
            <div className="grid grid-cols-3 gap-1.5">
              <button
                type="button"
                onClick={() => update('brushMode', 'none')}
                className={`py-1.5 px-2 rounded-xl text-xs font-bold border transition ${
                  currentBrush === 'none'
                    ? 'bg-slate-700 text-white border-slate-600 shadow-sm'
                    : 'bg-slate-800/80 text-slate-400 border-slate-700/80 hover:text-white'
                }`}
              >
                Off (None)
              </button>

              <button
                type="button"
                onClick={() => update('brushMode', 'erase')}
                className={`py-1.5 px-2 rounded-xl text-xs font-bold border transition flex items-center justify-center space-x-1 ${
                  currentBrush === 'erase'
                    ? 'bg-rose-600 text-white border-rose-500 shadow-md shadow-rose-900/40'
                    : 'bg-slate-800/80 text-rose-400 border-slate-700/80 hover:text-white'
                }`}
                title="Paint over unwanted background to erase"
              >
                <Eraser className="w-3.5 h-3.5" />
                <span>Erase Brush</span>
              </button>

              <button
                type="button"
                onClick={() => update('brushMode', 'restore')}
                className={`py-1.5 px-2 rounded-xl text-xs font-bold border transition flex items-center justify-center space-x-1 ${
                  currentBrush === 'restore'
                    ? 'bg-emerald-600 text-white border-emerald-500 shadow-md shadow-emerald-900/40'
                    : 'bg-slate-800/80 text-emerald-400 border-slate-700/80 hover:text-white'
                }`}
                title="Paint over accidentally erased hair or clothes to restore them"
              >
                <Paintbrush className="w-3.5 h-3.5" />
                <span>Restore Brush</span>
              </button>
            </div>

            {/* Brush Size Slider (when brush is active) */}
            {currentBrush !== 'none' && (
              <div className="p-3 bg-slate-950/70 rounded-xl border border-slate-800 space-y-2">
                <div className="flex justify-between items-center text-xs font-medium">
                  <span className="text-slate-300 flex items-center space-x-1.5">
                    <span>Brush Size</span>
                    <span
                      className="inline-block rounded-full bg-cyan-400"
                      style={{ width: Math.max(6, Math.min(22, brushSize / 2)), height: Math.max(6, Math.min(22, brushSize / 2)) }}
                    />
                  </span>
                  <span className="font-mono text-cyan-400 font-bold">{brushSize}px</span>
                </div>
                <input
                  type="range"
                  min="6"
                  max="80"
                  value={brushSize}
                  onChange={(e) => update('brushSize', parseInt(e.target.value))}
                  className="w-full accent-cyan-400 h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer"
                />
                <p className="text-[10px] text-slate-400">
                  {currentBrush === 'erase'
                    ? '👉 फोटो पर उंगली फिराकर अनचाहा बैकग्राउंड मिटाएं।'
                    : '👉 अगर गलती से बाल या कपड़े कट गए हैं तो उंगली फिराकर वापस लाएं।'}
                </p>
              </div>
            )}
          </div>

          {/* 6. Tolerance & Feather Sliders */}
          <div className="space-y-3 border-t border-slate-800 pt-3">
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs font-medium">
                <span className="text-slate-300">Color Sensitivity (Tolerance)</span>
                <span className="font-mono text-cyan-400 font-bold">{settings.tolerance}%</span>
              </div>
              <input
                type="range"
                min="5"
                max="95"
                value={settings.tolerance}
                onChange={(e) => update('tolerance', parseInt(e.target.value))}
                className="w-full accent-cyan-500 h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-slate-500">
                <span>Tight (5%)</span>
                <span>Balanced (30%)</span>
                <span>Broad (95%)</span>
              </div>
            </div>

            <div className="space-y-1.5">
              <div className="flex justify-between text-xs font-medium">
                <span className="text-slate-300">Edge Feathering (Smooth Hair)</span>
                <span className="font-mono text-cyan-400 font-bold">{settings.feather}px</span>
              </div>
              <input
                type="range"
                min="1"
                max="20"
                value={settings.feather}
                onChange={(e) => update('feather', parseInt(e.target.value))}
                className="w-full accent-cyan-500 h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-slate-500">
                <span>Crisp (1px)</span>
                <span>Natural Hair (4px)</span>
                <span>Ultra Soft (20px)</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
