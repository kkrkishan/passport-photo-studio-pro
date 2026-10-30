import React from 'react';
import { Palette, Check, RotateCcw, Droplets, Sparkles, XCircle, Sliders } from 'lucide-react';
import { BackgroundSettings } from '../../types';

interface BackgroundStudioProps {
  settings: BackgroundSettings;
  onChange: (updated: BackgroundSettings) => void;
  onReset?: () => void;
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
}) => {
  const update = (key: keyof BackgroundSettings, val: any) => {
    onChange({ ...settings, [key]: val });
  };

  const handleDeselect = () => {
    onChange({
      enabled: false,
      color: '#ffffff',
      tolerance: 30,
      feather: 4,
      sourceColor: undefined,
      transparent: false,
    });
    onReset?.();
  };

  return (
    <div className="p-4 bg-slate-900 border-t border-slate-800 space-y-4 select-none text-slate-200">
      {/* Header with Enable Switch & Deselect Button */}
      <div className="flex items-center justify-between pb-2 border-b border-slate-800">
        <div className="flex items-center space-x-2">
          <Palette className="w-4 h-4 text-cyan-400" />
          <span className="text-sm font-bold text-white">Studio Background</span>
        </div>

        <div className="flex items-center space-x-2">
          {settings.enabled && (
            <button
              onClick={handleDeselect}
              className="px-2 py-1 bg-slate-800 hover:bg-rose-900/30 text-rose-400 hover:text-rose-300 rounded-lg text-xs font-semibold flex items-center space-x-1 border border-slate-700/80 active:scale-95 transition"
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
        <div className="text-center py-6 px-4 bg-slate-950/60 rounded-2xl border border-dashed border-slate-800 space-y-2">
          <Droplets className="w-8 h-8 text-slate-500 mx-auto" />
          <p className="text-xs text-slate-400 font-medium">Original Background Active</p>
          <p className="text-[11px] text-slate-500">
            Toggle the switch above to replace background with compliant studio white, blue, or custom color.
          </p>
          <button
            onClick={() => update('enabled', true)}
            className="mt-2 px-4 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold shadow-md shadow-blue-900/40 active:scale-95 transition"
          >
            Enable Background Changer
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Mode Selector: Color vs Transparent Cutout */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-300">Replacement Mode</label>
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
          </div>

          {/* New Background Color Swatches (if not transparent) */}
          {!settings.transparent && (
            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-300 flex justify-between items-center">
                <span>Select New Background Color</span>
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

          {/* Source Background Color to Remove (Auto vs Eyedropper) */}
          <div className="space-y-2 border-t border-slate-800 pt-3">
            <div className="flex items-center justify-between text-xs font-semibold text-slate-300">
              <span>Source Color to Remove</span>
              {settings.sourceColor && (
                <button
                  onClick={() => update('sourceColor', undefined)}
                  className="text-[11px] text-cyan-400 hover:underline"
                >
                  Reset to Auto-Detect
                </button>
              )}
            </div>

            <div className="flex items-center space-x-3 bg-slate-950/60 p-2.5 rounded-xl border border-slate-800">
              <div
                className="w-7 h-7 rounded-lg border border-slate-700 shadow-sm shrink-0"
                style={{ backgroundColor: settings.sourceColor || '#e2e8f0' }}
              />
              <div className="flex-1 text-xs">
                <span className="font-semibold text-white block">
                  {settings.sourceColor ? `Target: ${settings.sourceColor}` : 'Auto-Detected from Image Edge'}
                </span>
                <span className="text-[10px] text-slate-400">
                  {settings.sourceColor ? 'Custom color being replaced' : 'Automatically identifies wall/backdrop hue'}
                </span>
              </div>
              <div className="relative">
                <input
                  type="color"
                  value={settings.sourceColor || '#ffffff'}
                  onChange={(e) => update('sourceColor', e.target.value)}
                  className="w-7 h-7 opacity-0 absolute inset-0 cursor-pointer z-10"
                  title="Pick exact source background color to erase"
                />
                <button className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-[11px] font-semibold text-slate-200 border border-slate-700">
                  Pick
                </button>
              </div>
            </div>
          </div>

          {/* Tolerance & Feather Sliders */}
          <div className="space-y-4 border-t border-slate-800 pt-3">
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs font-medium">
                <span className="text-slate-300">Color Removal Sensitivity (Tolerance)</span>
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
                <span className="text-slate-300">Edge Smoothing (Feather)</span>
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
                <span>Sharp Edge (1px)</span>
                <span>Soft Natural Hair (4px)</span>
                <span>Ultra Smooth (20px)</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
