import { ExamPreset } from '../types';
import { OFFICIAL_EXAM_PRESETS } from './examPresetsDatabase';

const STORAGE_KEY = 'ppsp_custom_presets_v1';

/**
 * Retrieves custom presets created by the user from localStorage
 */
export function getCustomPresets(): ExamPreset[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch (err) {
    console.error('Failed to load custom presets from localStorage:', err);
    return [];
  }
}

/**
 * Returns all presets combined (Official System Presets + User Custom Presets)
 */
export function getAllPresets(): ExamPreset[] {
  const custom = getCustomPresets();
  return [...OFFICIAL_EXAM_PRESETS, ...custom];
}

/**
 * Saves a new custom preset into localStorage
 */
export function saveCustomPreset(
  preset: Omit<ExamPreset, 'id' | 'isVerified' | 'isCustom' | 'lastVerifiedDate'> & { id?: string; lastVerifiedDate?: string }
): ExamPreset {
  const customPresets = getCustomPresets();
  const id = preset.id || `custom-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
  const newPreset: ExamPreset = {
    ...preset,
    id,
    isVerified: false,
    isCustom: true,
    lastVerifiedDate: new Date().toISOString().split('T')[0],
  };

  const existingIdx = customPresets.findIndex((p) => p.id === id);
  if (existingIdx >= 0) {
    customPresets[existingIdx] = newPreset;
  } else {
    customPresets.push(newPreset);
  }

  localStorage.setItem(STORAGE_KEY, JSON.stringify(customPresets));
  return newPreset;
}

/**
 * Deletes a custom preset by ID (system presets cannot be deleted)
 */
export function deleteCustomPreset(id: string): boolean {
  // Prevent deleting system presets
  if (OFFICIAL_EXAM_PRESETS.some((p) => p.id === id)) {
    return false;
  }
  const customPresets = getCustomPresets();
  const filtered = customPresets.filter((p) => p.id !== id);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
  return true;
}

/**
 * Duplicates a preset (system or custom) into a new editable custom preset
 */
export function duplicatePreset(preset: ExamPreset): ExamPreset {
  return saveCustomPreset({
    ...preset,
    id: undefined,
    name: `${preset.name} (Copy)`,
  });
}

/**
 * Restores defaults (clears user custom presets)
 */
export function clearCustomPresets(): void {
  localStorage.removeItem(STORAGE_KEY);
}
