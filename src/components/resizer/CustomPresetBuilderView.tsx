import React, { useState, useEffect } from 'react';
import {
  PlusCircle,
  Trash2,
  Edit2,
  Copy,
  Save,
  RotateCcw,
  Sliders,
  CheckCircle2,
  Sparkles
} from 'lucide-react';
import { ExamPreset, ExamPresetCategory, ResizeUnit, ImageFormat } from '../../types';
import {
  getCustomPresets,
  saveCustomPreset,
  deleteCustomPreset,
  duplicatePreset
} from '../../services/presetStorageService';

interface CustomPresetBuilderViewProps {
  onNotify?: (msg: string) => void;
  onApplyPreset?: (preset: ExamPreset) => void;
}

export const CustomPresetBuilderView: React.FC<CustomPresetBuilderViewProps> = ({
  onNotify,
  onApplyPreset,
}) => {
  const [customPresets, setCustomPresets] = useState<ExamPreset[]>([]);
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [editId, setEditId] = useState<string | null>(null);

  // Form Fields
  const [name, setName] = useState<string>('');
  const [category, setCategory] = useState<ExamPresetCategory>('other');
  const [documentType, setDocumentType] = useState<'photo' | 'signature' | 'thumb' | 'certificate'>('photo');
  const [width, setWidth] = useState<number>(35);
  const [height, setHeight] = useState<number>(45);
  const [unit, setUnit] = useState<ResizeUnit>('mm');
  const [minKB, setMinKB] = useState<number>(20);
  const [maxKB, setMaxKB] = useState<number>(50);
  const [preferredKB, setPreferredKB] = useState<number>(35);
  const [dpi, setDpi] = useState<number>(300);
  const [allowedFormats, setAllowedFormats] = useState<ImageFormat[]>(['jpg', 'jpeg']);
  const [notes, setNotes] = useState<string>('');

  useEffect(() => {
    loadPresets();
  }, []);

  const loadPresets = () => {
    setCustomPresets(getCustomPresets());
  };

  const resetForm = () => {
    setIsEditing(false);
    setEditId(null);
    setName('');
    setCategory('other');
    setDocumentType('photo');
    setWidth(35);
    setHeight(45);
    setUnit('mm');
    setMinKB(20);
    setMaxKB(50);
    setPreferredKB(35);
    setDpi(300);
    setAllowedFormats(['jpg', 'jpeg']);
    setNotes('');
  };

  const handleEdit = (preset: ExamPreset) => {
    setIsEditing(true);
    setEditId(preset.id);
    setName(preset.name);
    setCategory(preset.category);
    setDocumentType(preset.documentType);
    setWidth(preset.width);
    setHeight(preset.height);
    setUnit(preset.unit);
    setMinKB(preset.minKB || 20);
    setMaxKB(preset.maxKB || 50);
    setPreferredKB(preset.preferredKB || 35);
    setDpi(preset.dpi || 300);
    setAllowedFormats(preset.allowedFormats || ['jpg', 'jpeg']);
    setNotes(preset.notes || '');
  };

  const handleDelete = (id: string) => {
    deleteCustomPreset(id);
    loadPresets();
    onNotify?.('Preset deleted.');
  };

  const handleDuplicate = (preset: ExamPreset) => {
    duplicatePreset(preset);
    loadPresets();
    onNotify?.(`Preset duplicated: ${preset.name} (Copy)`);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      onNotify?.('Please enter a preset name.');
      return;
    }

    saveCustomPreset({
      id: editId || undefined,
      name: name.trim(),
      category,
      documentType,
      width,
      height,
      unit,
      minKB,
      maxKB,
      preferredKB,
      dpi,
      allowedFormats,
      notes: notes.trim(),
    });

    onNotify?.(isEditing ? 'Preset updated successfully!' : 'New preset created successfully!');
    resetForm();
    loadPresets();
  };

  return (
    <div className="flex-1 flex flex-col p-6 overflow-y-auto space-y-6">
      {/* Top Banner */}
      <div>
        <h2 className="text-xl font-black text-white flex items-center space-x-2">
          <Sliders className="w-5 h-5 text-amber-400" />
          <span>Custom Preset Builder & Manager</span>
        </h2>
        <p className="text-xs text-slate-400 mt-0.5">
          Create, save, edit and duplicate custom examination presets stored permanently in local application storage.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Form Column (5 cols) */}
        <form onSubmit={handleSave} className="lg:col-span-5 bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-slate-800">
            <span className="text-xs font-bold text-slate-200">
              {isEditing ? 'Edit Custom Preset' : 'Create New Custom Preset'}
            </span>
            {isEditing && (
              <button
                type="button"
                onClick={resetForm}
                className="text-[11px] text-slate-400 hover:text-white flex items-center space-x-1"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Cancel</span>
              </button>
            )}
          </div>

          {/* Name & Category */}
          <div className="space-y-3">
            <div>
              <label className="text-[11px] font-semibold text-slate-400 block mb-1">Preset Name</label>
              <input
                type="text"
                placeholder="e.g. My State Police Exam Photo"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className="w-full bg-slate-950 border border-slate-700/80 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] font-semibold text-slate-400 block mb-1">Category</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value as ExamPresetCategory)}
                  className="w-full bg-slate-950 border border-slate-700/80 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
                >
                  <option value="banking">Banking</option>
                  <option value="railway">Railway</option>
                  <option value="ssc">SSC</option>
                  <option value="upsc">UPSC</option>
                  <option value="nta">NTA / Entrance</option>
                  <option value="rajasthan">Rajasthan</option>
                  <option value="education">Education</option>
                  <option value="other">Other / General</option>
                </select>
              </div>

              <div>
                <label className="text-[11px] font-semibold text-slate-400 block mb-1">Document Type</label>
                <select
                  value={documentType}
                  onChange={(e) => setDocumentType(e.target.value as any)}
                  className="w-full bg-slate-950 border border-slate-700/80 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
                >
                  <option value="photo">Passport Photo</option>
                  <option value="signature">Signature</option>
                  <option value="thumb">Thumb Impression</option>
                  <option value="certificate">Document / Certificate</option>
                </select>
              </div>
            </div>
          </div>

          {/* Dimensions & Unit */}
          <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 space-y-3">
            <span className="text-[11px] font-bold text-slate-300">Dimensions</span>
            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className="text-[10px] text-slate-400 block mb-1">Width</label>
                <input
                  type="number"
                  step="0.1"
                  value={width}
                  onChange={(e) => setWidth(parseFloat(e.target.value) || 0)}
                  className="w-full bg-slate-900 border border-slate-700/80 rounded-lg px-2.5 py-1.5 text-xs text-white font-mono"
                />
              </div>

              <div>
                <label className="text-[10px] text-slate-400 block mb-1">Height</label>
                <input
                  type="number"
                  step="0.1"
                  value={height}
                  onChange={(e) => setHeight(parseFloat(e.target.value) || 0)}
                  className="w-full bg-slate-900 border border-slate-700/80 rounded-lg px-2.5 py-1.5 text-xs text-white font-mono"
                />
              </div>

              <div>
                <label className="text-[10px] text-slate-400 block mb-1">Unit</label>
                <select
                  value={unit}
                  onChange={(e) => setUnit(e.target.value as ResizeUnit)}
                  className="w-full bg-slate-900 border border-slate-700/80 rounded-lg px-2 py-1.5 text-xs text-white"
                >
                  <option value="px">px</option>
                  <option value="mm">mm</option>
                  <option value="cm">cm</option>
                  <option value="inch">inch</option>
                </select>
              </div>
            </div>
          </div>

          {/* KB Limits */}
          <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 space-y-3">
            <span className="text-[11px] font-bold text-slate-300">File Size Limits (KB) & DPI</span>
            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className="text-[10px] text-slate-400 block mb-1">Min KB</label>
                <input
                  type="number"
                  value={minKB}
                  onChange={(e) => setMinKB(parseInt(e.target.value, 10) || 0)}
                  className="w-full bg-slate-900 border border-slate-700/80 rounded-lg px-2.5 py-1.5 text-xs text-white font-mono"
                />
              </div>

              <div>
                <label className="text-[10px] text-slate-400 block mb-1">Max KB</label>
                <input
                  type="number"
                  value={maxKB}
                  onChange={(e) => setMaxKB(parseInt(e.target.value, 10) || 0)}
                  className="w-full bg-slate-900 border border-slate-700/80 rounded-lg px-2.5 py-1.5 text-xs text-white font-mono"
                />
              </div>

              <div>
                <label className="text-[10px] text-slate-400 block mb-1">DPI</label>
                <input
                  type="number"
                  value={dpi}
                  onChange={(e) => setDpi(parseInt(e.target.value, 10) || 300)}
                  className="w-full bg-slate-900 border border-slate-700/80 rounded-lg px-2.5 py-1.5 text-xs text-white font-mono"
                />
              </div>
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="text-[11px] font-semibold text-slate-400 block mb-1">Special Requirements / Notes</label>
            <textarea
              rows={2}
              placeholder="e.g. White background, name and date stamped at bottom"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700/80 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
            />
          </div>

          <button
            type="submit"
            className="w-full py-2.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold shadow-lg shadow-amber-900/30 flex items-center justify-center space-x-2 transition"
          >
            <Save className="w-4 h-4" />
            <span>{isEditing ? 'Update Custom Preset' : 'Save Custom Preset'}</span>
          </button>
        </form>

        {/* Presets List Column (7 cols) */}
        <div className="lg:col-span-7 space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-slate-800">
            <span className="text-xs font-bold text-slate-300">
              Saved Custom Presets ({customPresets.length})
            </span>
          </div>

          {customPresets.length === 0 ? (
            <div className="p-8 text-center bg-slate-900/50 border border-dashed border-slate-800 rounded-2xl">
              <Sparkles className="w-8 h-8 text-amber-400/50 mx-auto mb-2" />
              <p className="text-xs text-slate-400">No custom presets created yet.</p>
              <p className="text-[11px] text-slate-500 mt-1">
                Fill the form on the left or duplicate any government exam preset to create your custom preset.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {customPresets.map((preset) => (
                <div
                  key={preset.id}
                  className="bg-slate-900 border border-slate-800 hover:border-slate-700 rounded-2xl p-4 flex items-center justify-between space-x-4 transition"
                >
                  <div className="space-y-1.5 flex-1 min-w-0">
                    <div className="flex items-center space-x-2">
                      <span className="text-sm font-bold text-white truncate">{preset.name}</span>
                      <span className="px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-400 text-[10px] font-semibold uppercase">
                        {preset.category}
                      </span>
                    </div>

                    <div className="flex items-center space-x-3 text-xs text-slate-400 font-mono">
                      <span>{preset.width} × {preset.height} {preset.unit}</span>
                      <span>•</span>
                      <span className="text-emerald-400">{preset.minKB}–{preset.maxKB} KB</span>
                      <span>•</span>
                      <span>{preset.dpi} DPI</span>
                    </div>

                    {preset.notes && (
                      <p className="text-[11px] text-slate-400 truncate">{preset.notes}</p>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex items-center space-x-1 shrink-0">
                    <button
                      onClick={() => handleDuplicate(preset)}
                      title="Duplicate"
                      className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition"
                    >
                      <Copy className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleEdit(preset)}
                      title="Edit"
                      className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-amber-400 transition"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleDelete(preset.id)}
                      title="Delete"
                      className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-rose-400 transition"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
