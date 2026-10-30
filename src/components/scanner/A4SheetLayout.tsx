import React, { useState, useEffect, useRef } from 'react';
import {
  FileDown,
  Printer,
  ChevronLeft,
  Layout,
  Scissors,
  Check,
  Plus,
  Trash2,
  Users
} from 'lucide-react';
import {
  DocumentSet,
  A4LayoutSettings,
  DocumentType,
  DOCUMENT_PRESETS,
  DEFAULT_A4_LAYOUT
} from '../../types';
import { generateDocumentA4PDF, renderA4DocumentPageToCanvas } from '../../services/pdfGenerator';
import { saveOrDownloadFile } from '../../services/exportHelper';

interface A4SheetLayoutProps {
  documentSets: DocumentSet[];
  activeSetId: string;
  onSelectSet: (id: string) => void;
  onAddSet: () => void;
  onDeleteSet: (id: string) => void;
  onBackToScanner: () => void;
}

export const A4SheetLayout: React.FC<A4SheetLayoutProps> = ({
  documentSets,
  activeSetId,
  onSelectSet,
  onAddSet,
  onDeleteSet,
  onBackToScanner,
}) => {
  const [layoutSettings, setLayoutSettings] = useState<A4LayoutSettings>(DEFAULT_A4_LAYOUT);
  const [isExporting, setIsExporting] = useState(false);
  const [exportMessage, setExportMessage] = useState<string | null>(null);

  const desktopCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const mobileCanvasRef = useRef<HTMLCanvasElement | null>(null);

  const activeSet = documentSets.find((s) => s.id === activeSetId) || documentSets[0];

  // Helper update
  const updateSettings = (key: keyof A4LayoutSettings, val: any) => {
    setLayoutSettings((prev) => ({ ...prev, [key]: val }));
  };

  // Render both desktop and mobile canvases
  useEffect(() => {
    if (!activeSet) return;
    if (desktopCanvasRef.current) {
      renderA4DocumentPageToCanvas(desktopCanvasRef.current, activeSet, layoutSettings);
    }
    if (mobileCanvasRef.current) {
      renderA4DocumentPageToCanvas(mobileCanvasRef.current, activeSet, layoutSettings);
    }
  }, [activeSet, layoutSettings]);

  // Handle Preset Change
  const handleSelectDocPreset = (type: DocumentType) => {
    const preset = DOCUMENT_PRESETS[type];
    if (preset) {
      setLayoutSettings((prev) => ({
        ...prev,
        documentType: type,
        targetWidthMm: preset.widthMm,
        targetHeightMm: preset.heightMm,
      }));
    }
  };

  // Export PDF
  const handleExportPDF = async () => {
    try {
      setIsExporting(true);
      setExportMessage('Generating Print-Ready A4 Document PDF...');

      const pdfDataUrl = await generateDocumentA4PDF(documentSets, layoutSettings);
      const defaultName = `Document_A4_Sheet_${documentSets.length}Pages.pdf`;

      const res = await saveOrDownloadFile({
        dataUrl: pdfDataUrl,
        defaultName,
        format: 'pdf',
      });

      if (res.success) {
        setExportMessage(res.filePath ? `Saved: ${res.filePath}` : 'A4 Document PDF saved to Gallery/Downloads!');
      } else if (!res.canceled) {
        setExportMessage(`Failed to save PDF: ${res.error || ''}`);
      }
    } catch (err: any) {
      console.error(err);
      setExportMessage(`Failed to generate PDF: ${err.message || ''}`);
    } finally {
      setIsExporting(false);
      setTimeout(() => setExportMessage(null), 3500);
    }
  };

  // Export Image (JPG / PNG)
  const handleExportImage = async (format: 'png' | 'jpg') => {
    if (!activeSet) return;
    try {
      setIsExporting(true);
      setExportMessage(`Exporting ${format.toUpperCase()}...`);

      const exportCanvas = document.createElement('canvas');
      await renderA4DocumentPageToCanvas(exportCanvas, activeSet, layoutSettings);

      const mimeType = format === 'png' ? 'image/png' : 'image/jpeg';
      const dataUrl = exportCanvas.toDataURL(mimeType, 0.95);
      const defaultName = `Document_A4_${activeSet.name.replace(/\s+/g, '_')}.${format}`;

      const res = await saveOrDownloadFile({
        dataUrl,
        defaultName,
        format,
      });

      if (res.success) {
        setExportMessage(res.filePath ? `Saved: ${res.filePath}` : `Saved ${format.toUpperCase()} to Gallery!`);
      } else if (!res.canceled) {
        setExportMessage(`Export failed: ${res.error || ''}`);
      }
    } catch (err: any) {
      console.error(err);
      setExportMessage(`Export failed: ${err.message || ''}`);
    } finally {
      setIsExporting(false);
      setTimeout(() => setExportMessage(null), 3500);
    }
  };

  // Print
  const handlePrint = async () => {
    const electronAPI = (window as any).electronAPI;
    if (electronAPI) {
      await electronAPI.printPage();
    } else {
      window.print();
    }
  };

  // Common Layout Controls rendered on both Mobile bottom panel & Desktop left sidebar
  const renderLayoutControls = () => (
    <>
      {/* Document Sets (Multi-Person batch support) */}
      <div className="space-y-2">
        <div className="flex justify-between items-center text-slate-400 font-semibold text-xs">
          <span className="flex items-center space-x-1.5">
            <Users className="w-3.5 h-3.5 text-blue-400" />
            <span>Document Sets ({documentSets.length})</span>
          </span>
          <button
            onClick={onAddSet}
            className="text-[11px] text-emerald-400 hover:text-emerald-300 font-bold flex items-center space-x-1 active:scale-95 transition"
          >
            <Plus className="w-3 h-3" />
            <span>Add Set</span>
          </button>
        </div>

        <div className="space-y-1">
          {documentSets.map((set, idx) => (
            <div
              key={set.id}
              onClick={() => onSelectSet(set.id)}
              className={`p-2 rounded-xl flex items-center justify-between cursor-pointer border transition ${
                set.id === activeSetId
                  ? 'bg-emerald-950/50 border-emerald-500 text-white'
                  : 'bg-slate-800/60 border-slate-700/60 text-slate-300 hover:bg-slate-800'
              }`}
            >
              <span className="font-semibold text-xs">
                Page {idx + 1}: {set.name}
              </span>
              {documentSets.length > 1 && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onDeleteSet(set.id);
                  }}
                  className="p-1 text-slate-400 hover:text-rose-400"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Standard Document Dimension Presets */}
      <div className="space-y-1.5 border-t border-slate-800 pt-3">
        <label className="text-slate-400 font-semibold text-xs">Document Specification</label>
        <select
          value={layoutSettings.documentType}
          onChange={(e) => handleSelectDocPreset(e.target.value as DocumentType)}
          className="w-full bg-slate-800 border border-slate-700 rounded-xl p-2 text-white font-medium focus:outline-none focus:ring-1 focus:ring-emerald-500 text-xs"
        >
          {Object.values(DOCUMENT_PRESETS).map((p) => (
            <option key={p.type} value={p.type}>
              {p.title} ({p.widthMm} × {p.heightMm} mm)
            </option>
          ))}
        </select>
      </div>

      {/* Arrangement Style */}
      <div className="space-y-1.5">
        <label className="text-slate-400 font-semibold text-xs">Placement on A4 Sheet</label>
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={() => updateSettings('arrangement', 'vertical')}
            className={`py-2 px-2.5 rounded-xl text-left border text-xs transition active:scale-95 ${
              layoutSettings.arrangement === 'vertical'
                ? 'bg-emerald-950/60 border-emerald-500 text-white shadow-md'
                : 'bg-slate-800 border-slate-700 text-slate-300'
            }`}
          >
            <div className="font-bold">Top + Bottom</div>
            <div className="text-[10px] text-slate-400">Front Top, Back Bottom</div>
          </button>

          <button
            onClick={() => updateSettings('arrangement', 'horizontal')}
            className={`py-2 px-2.5 rounded-xl text-left border text-xs transition active:scale-95 ${
              layoutSettings.arrangement === 'horizontal'
                ? 'bg-emerald-950/60 border-emerald-500 text-white shadow-md'
                : 'bg-slate-800 border-slate-700 text-slate-300'
            }`}
          >
            <div className="font-bold">Side by Side</div>
            <div className="text-[10px] text-slate-400">Front Left, Back Right</div>
          </button>
        </div>
      </div>

      {/* Physical Dimensions Fine Adjustment */}
      <div className="space-y-3 border-t border-slate-800 pt-3">
        <div className="text-slate-300 font-bold text-xs">Card Physical Scale (mm)</div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <span className="text-slate-400 text-[11px]">Width (mm)</span>
            <input
              type="number"
              step="0.5"
              value={layoutSettings.targetWidthMm}
              onChange={(e) => updateSettings('targetWidthMm', parseFloat(e.target.value) || 85.6)}
              className="w-full bg-slate-800 border border-slate-700 rounded-xl p-2 text-white font-mono text-xs"
            />
          </div>
          <div className="space-y-1">
            <span className="text-slate-400 text-[11px]">Height (mm)</span>
            <input
              type="number"
              step="0.5"
              value={layoutSettings.targetHeightMm}
              onChange={(e) => updateSettings('targetHeightMm', parseFloat(e.target.value) || 54)}
              className="w-full bg-slate-800 border border-slate-700 rounded-xl p-2 text-white font-mono text-xs"
            />
          </div>
        </div>

        <div className="space-y-1">
          <div className="flex justify-between text-slate-400 text-xs">
            <span>Top Margin</span>
            <span className="font-mono text-emerald-400 font-bold">{layoutSettings.topMarginMm} mm</span>
          </div>
          <input
            type="range"
            min="10"
            max="80"
            value={layoutSettings.topMarginMm}
            onChange={(e) => updateSettings('topMarginMm', parseInt(e.target.value))}
            className="w-full accent-emerald-500 h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer"
          />
        </div>

        <div className="space-y-1">
          <div className="flex justify-between text-slate-400 text-xs">
            <span>Gap Between Cards</span>
            <span className="font-mono text-emerald-400 font-bold">{layoutSettings.gapMm} mm</span>
          </div>
          <input
            type="range"
            min="5"
            max="50"
            value={layoutSettings.gapMm}
            onChange={(e) => updateSettings('gapMm', parseInt(e.target.value))}
            className="w-full accent-emerald-500 h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer"
          />
        </div>
      </div>

      {/* Printable Guides */}
      <div className="space-y-2.5 border-t border-slate-800 pt-3">
        <div className="text-slate-300 font-bold text-xs">Print Features & Guides</div>

        <label className="flex items-center space-x-2.5 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={layoutSettings.showCutLines}
            onChange={(e) => updateSettings('showCutLines', e.target.checked)}
            className="rounded bg-slate-800 border-slate-700 text-emerald-600 focus:ring-0 w-4 h-4"
          />
          <span className="text-slate-300 text-xs flex items-center space-x-1.5">
            <Scissors className="w-3.5 h-3.5 text-emerald-400" />
            <span>Corner Scissor Cut Marks</span>
          </span>
        </label>

        <label className="flex items-center space-x-2.5 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={layoutSettings.showBorders}
            onChange={(e) => updateSettings('showBorders', e.target.checked)}
            className="rounded bg-slate-800 border-slate-700 text-emerald-600 focus:ring-0 w-4 h-4"
          />
          <span className="text-slate-300 text-xs">Clean ID Border Line</span>
        </label>

        <label className="flex items-center space-x-2.5 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={layoutSettings.showLabels}
            onChange={(e) => updateSettings('showLabels', e.target.checked)}
            className="rounded bg-slate-800 border-slate-700 text-emerald-600 focus:ring-0 w-4 h-4"
          />
          <span className="text-slate-300 text-xs">Card Labels ("FRONT" / "BACK")</span>
        </label>
      </div>
    </>
  );

  return (
    <div className="flex-1 flex flex-col md:flex-row overflow-hidden bg-[#0b0f19] select-none text-slate-200 h-full">
      {/* ======================================================== */}
      {/* MOBILE STRICT 50% PREVIEW / 50% CONTROLS SPLIT VIEW        */}
      {/* ======================================================== */}
      <div className="flex md:hidden flex-1 flex-col h-full overflow-hidden">
        {/* Upper 50%: Live A4 Sheet Preview Canvas */}
        <div className="h-1/2 w-full bg-[#070b14] relative flex flex-col justify-between p-2 border-b border-slate-800 shrink-0">
          {/* Top row: Back button, Page info, Export buttons */}
          <div className="flex items-center justify-between w-full z-10 gap-1.5 shrink-0">
            <button
              onClick={onBackToScanner}
              className="px-2.5 py-1 rounded-xl bg-slate-800/90 text-slate-300 text-xs font-semibold flex items-center space-x-1 border border-slate-700 active:scale-95"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
              <span>Scanner</span>
            </button>

            <span className="text-[11px] font-bold text-slate-300 bg-slate-800/80 px-2 py-0.5 rounded-lg border border-slate-700">
              {activeSet?.name || 'A4'}
            </span>

            <div className="flex items-center space-x-1.5">
              <button
                onClick={() => handleExportImage('jpg')}
                className="px-2 py-1 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold border border-slate-700 active:scale-95 transition"
                title="Save JPG"
              >
                <FileDown className="w-3.5 h-3.5 text-blue-400" />
                <span>JPG</span>
              </button>
              <button
                onClick={handleExportPDF}
                disabled={isExporting}
                className="px-2.5 py-1 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 text-white text-xs font-bold shadow-md shadow-emerald-900/40 active:scale-95 transition"
                title="Save A4 PDF"
              >
                <FileDown className="w-3.5 h-3.5" />
                <span>{isExporting ? '...' : 'PDF'}</span>
              </button>
              <button
                onClick={handlePrint}
                className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 active:scale-95"
                title="Print"
              >
                <Printer className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Export notification toast */}
          {exportMessage && (
            <div className="absolute top-12 left-1/2 -translate-x-1/2 z-30 bg-emerald-600 text-white px-3 py-1.5 rounded-xl shadow-2xl text-xs font-semibold flex items-center space-x-1.5 animate-fade-in whitespace-nowrap">
              <Check className="w-3.5 h-3.5" />
              <span>{exportMessage}</span>
            </div>
          )}

          {/* Centered A4 Canvas Preview */}
          <div className="flex-1 w-full flex items-center justify-center p-1 overflow-hidden">
            <canvas
              ref={mobileCanvasRef}
              className="max-h-[35vh] max-w-[95%] object-contain rounded-md shadow-2xl border border-slate-700/80 bg-white"
            />
          </div>

          {/* Bottom badge */}
          <div className="flex items-center justify-between text-[10px] text-slate-400 bg-slate-900/90 px-2.5 py-1 rounded-xl border border-slate-800 shrink-0 font-mono">
            <span>A4 ({documentSets.length} {documentSets.length === 1 ? 'Page' : 'Pages'})</span>
            <span className="text-emerald-400 font-bold">1:1 Physical Calibration (85.6×54mm)</span>
          </div>
        </div>

        {/* Lower 50%: Scrollable Print & Placement Settings */}
        <div className="h-1/2 w-full overflow-y-auto bg-slate-900 p-3.5 space-y-3.5 text-xs text-slate-200">
          <div className="flex items-center space-x-2 text-slate-300 font-bold border-b border-slate-800 pb-2">
            <Layout className="w-4 h-4 text-emerald-400" />
            <span>A4 Front + Back Settings</span>
          </div>
          {renderLayoutControls()}
        </div>
      </div>

      {/* ======================================================== */}
      {/* DESKTOP SIDE-BY-SIDE VIEW                                 */}
      {/* ======================================================== */}
      <div className="hidden md:flex flex-1 flex-row overflow-hidden h-full">
        {/* Left Settings Sidebar */}
        <div className="w-84 bg-slate-900 border-r border-slate-800 flex flex-col h-full shrink-0">
          <div className="p-4 border-b border-slate-800 bg-slate-950/40 flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Layout className="w-4 h-4 text-emerald-400" />
              <span className="font-semibold text-sm">A4 Front + Back Engine</span>
            </div>
            <button
              onClick={onBackToScanner}
              className="text-xs text-slate-400 hover:text-white flex items-center space-x-1"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
              <span>Scanner</span>
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-4 text-xs">
            {renderLayoutControls()}
          </div>
        </div>

        {/* Right Preview Viewport */}
        <div className="flex-1 flex flex-col items-center justify-between p-4 overflow-hidden relative">
          <div className="w-full flex flex-wrap items-center justify-between gap-2 bg-slate-900/90 backdrop-blur-md px-4 py-2.5 rounded-2xl border border-slate-800 shadow-xl mb-3">
            <div className="flex items-center space-x-2">
              <span className="text-xs font-semibold text-slate-300">
                A4: {activeSet?.name || 'Set'}
              </span>
            </div>

            <div className="flex items-center space-x-2">
              <button
                onClick={handlePrint}
                className="px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium flex items-center space-x-1 transition"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Print</span>
              </button>
              <button
                onClick={() => handleExportImage('jpg')}
                className="px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium flex items-center space-x-1 transition"
              >
                <FileDown className="w-3.5 h-3.5 text-blue-400" />
                <span>JPG</span>
              </button>
              <button
                onClick={() => handleExportImage('png')}
                className="px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium flex items-center space-x-1 transition"
              >
                <FileDown className="w-3.5 h-3.5 text-emerald-400" />
                <span>PNG</span>
              </button>
              <button
                onClick={handleExportPDF}
                disabled={isExporting}
                className="px-4 py-1.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 text-white text-xs font-bold flex items-center space-x-1.5 shadow-lg shadow-emerald-900/40 transition"
              >
                <FileDown className="w-4 h-4" />
                <span>{isExporting ? 'Exporting...' : 'Export PDF'}</span>
              </button>
            </div>
          </div>

          {exportMessage && (
            <div className="absolute top-16 z-30 bg-emerald-600 text-white px-4 py-2 rounded-xl shadow-2xl text-xs font-medium animate-fade-in flex items-center space-x-2">
              <Check className="w-4 h-4" />
              <span>{exportMessage}</span>
            </div>
          )}

          <div className="flex-1 w-full flex items-center justify-center p-2 overflow-auto">
            <canvas
              ref={desktopCanvasRef}
              className="max-h-[72vh] max-w-[80vw] object-contain rounded-xl shadow-2xl border border-slate-700/80 bg-white"
            />
          </div>

          <div className="w-full text-center text-[11px] text-slate-400 pt-2 font-mono">
            Physical ID Card Calibration: {layoutSettings.targetWidthMm} × {layoutSettings.targetHeightMm} mm • 100% Print-Scale Guaranteed
          </div>
        </div>
      </div>
    </div>
  );
};
