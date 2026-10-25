import React from 'react';
import { Palette, Check, HelpCircle, Sparkles } from 'lucide-react';
import { BackgroundSettings } from '../../types';

interface BackgroundStudioProps {
  settings: BackgroundSettings;
  onChange: (updated: BackgroundSettings) => void;
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
}) => {
  const update = (key: keyof BackgroundSettings, val: any) => {
    onChange({ ...settings, [key]: val });
  };

  return (
    <div className="p-4 bg-slate-900 border-t border-slate-800 space-y-3 select-none">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Palette className="w-4 h-4 text-cyan-400" />
          <span className="text-xs font-semibold text-slate-200">Studio Background Replacement</span>
        </div>
        <label className="relative inline-flex items-center cursor-pointer">
          <input
            type="checkbox"
            checked={settings.enabled}
            onChange={(e) => update('enabled', e.target.checked)}
            className="sr-only peer"
          />
          <div className="w-9 h-5 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-600"></div>
        </label>
      </div>

      {settings.enabled && (
        <div className="space-y-3 pt-1">
          {/* Preset Swatches */}
          <div className="flex items-center space-x-2">
            {STUDIO_COLORS.map((preset) => (
              <button
                key={preset.color}
                onClick={() => update('color', preset.color)}
                className="w-7 h-7 rounded-full flex items-center justify-center border-2 transition shadow-sm"
                style={{
                  backgroundColor: preset.color,
                  borderColor: settings.color.toLowerCase() === preset.color.toLowerCase() ? '#2563eb' : preset.border,
                }}
                title={preset.name}
              >
                {settings.color.toLowerCase() === preset.color.toLowerCase() && (
                  <Check
                    className={`w-3.5 h-3.5 ${
                      preset.color === '#ffffff' || preset.color === '#f8fafc' || preset.color === '#e2e8f0'
                        ? 'text-slate-900'
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
                className="w-7 h-7 rounded-full cursor-pointer opacity-0 absolute inset-0"
                title="Choose custom background color"
              />
              <div
                className="w-7 h-7 rounded-full border-2 border-slate-600 flex items-center justify-center text-[10px] text-slate-300 pointer-events-none"
                style={{ backgroundColor: settings.color }}
              >
                +
              </div>
            </div>
          </div>

          {/* Tolerance & Feather controls */}
          <div className="grid grid-cols-2 gap-4 pt-1">
            <div className="space-y-1">
              <div className="flex justify-between text-[11px] text-slate-400">
                <span>Color Tolerance</span>
                <span className="font-mono text-slate-300">{settings.tolerance}%</span>
              </div>
              <input
                type="range"
                min="5"
                max="90"
                value={settings.tolerance}
                onChange={(e) => update('tolerance', parseInt(e.target.value))}
                className="w-full accent-cyan-500 h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer"
              />
            </div>

            <div className="space-y-1">
              <div className="flex justify-between text-[11px] text-slate-400">
                <span>Edge Feather</span>
                <span className="font-mono text-slate-300">{settings.feather}px</span>
              </div>
              <input
                type="range"
                min="1"
                max="15"
                value={settings.feather}
                onChange={(e) => update('feather', parseInt(e.target.value))}
                className="w-full accent-cyan-500 h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
