import React, { useState, useEffect, useRef } from 'react';
import {
  Printer,
  FileDown,
  Layers,
  Grid,
  ChevronLeft,
  ChevronRight,
  AlertTriangle,
  Sparkles,
  Maximize2,
  Sliders,
  Check,
  Scissors
} from 'lucide-react';
import {
  PhotoPreset,
  SheetConfig,
  PAPER_PRESETS,
  DEFAULT_SHEET_CONFIG
} from '../../types';
import {
  calculateSheetLayout,
  renderSheetToCanvas,
  SheetCalculationResult,
  mmToPx
} from '../../services/sheetLayoutEngine';
import { generatePassportSheetPDF } from '../../services/pdfGenerator';
import { saveOrDownloadFile } from '../../services/exportHelper';

interface SheetMakerProps {
  croppedCanvas: HTMLCanvasElement;
  activePreset: PhotoPreset;
  onBackToEditor: () => void;
  initialConfig?: SheetConfig;
  onSaveConfig?: (cfg: SheetConfig) => void;
}

export const SheetMaker: React.FC<SheetMakerProps> = ({
  croppedCanvas,
  activePreset,
  onBackToEditor,
  initialConfig,
  onSaveConfig,
}) => {
  const [config, setConfig] = useState<SheetConfig>(initialConfig || DEFAULT_SHEET_CONFIG);
  const [currentPage, setCurrentPage] = useState(0);
  const [isExporting, setIsExporting] = useState(false);
  const [exportMessage, setExportMessage] = useState<string | null>(null);

  const previewCanvasRef = useRef<HTMLCanvasElement | null>(null);

  // Layout calculation
  const layout: SheetCalculationResult = calculateSheetLayout(
    activePreset.widthMm,
    activePreset.heightMm,
    config
  );

  // Sync config updates
  const updateConfig = (key: keyof SheetConfig, val: any) => {
    const updated = { ...config, [key]: val };
    setConfig(updated);
    onSaveConfig?.(updated);
  };

  // Render sheet preview
  useEffect(() => {
    if (!previewCanvasRef.current || !croppedCanvas) return;
    renderSheetToCanvas(
      previewCanvasRef.current,
      croppedCanvas,
      layout,
      config,
      currentPage
    );
  }, [croppedCanvas, layout, config, currentPage]);

  // Clamp current page when total pages change
  useEffect(() => {
    if (currentPage >= layout.totalPages) {
      setCurrentPage(Math.max(0, layout.totalPages - 1));
    }
  }, [layout.totalPages, currentPage]);

  // Auto fill to maximum capacity for sheet
  const handleAutoFill = () => {
    updateConfig('copies', layout.capacityPerSheet);
  };

  // Export PDF
  const handleExportPDF = async () => {
    try {
      setIsExporting(true);
      setExportMessage('Generating 300 DPI Print-Ready PDF...');

      const pdfDataUrl = await generatePassportSheetPDF(croppedCanvas, layout, config);
      const defaultName = `Passport_Sheet_${config.paperId}_${layout.totalPhotos}Photos.pdf`;

      const res = await saveOrDownloadFile({
        dataUrl: pdfDataUrl,
        defaultName,
        format: 'pdf',
      });

      if (res.success) {
        setExportMessage(res.filePath ? `Saved: ${res.filePath}` : 'PDF saved successfully!');
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

  // Export High Resolution Image (PNG / JPG)
  const handleExportImage = async (format: 'png' | 'jpg') => {
    try {
      setIsExporting(true);
      setExportMessage(`Exporting ${format.toUpperCase()}...`);

      const exportCanvas = document.createElement('canvas');
      renderSheetToCanvas(exportCanvas, croppedCanvas, layout, config, currentPage);

      const mimeType = format === 'png' ? 'image/png' : 'image/jpeg';
      const dataUrl = exportCanvas.toDataURL(mimeType, 0.96);
      const defaultName = `Passport_Sheet_Page${currentPage + 1}_${config.dpi}DPI.${format}`;

      const res = await saveOrDownloadFile({
        dataUrl,
        defaultName,
        format,
      });

      if (res.success) {
        setExportMessage(res.filePath ? `Saved: ${res.filePath}` : `Saved ${format.toUpperCase()} successfully!`);
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

  // Direct Native Print
  const handlePrint = async () => {
    const electronAPI = (window as any).electronAPI;
    if (electronAPI) {
      await electronAPI.printPage();
    } else {
      window.print();
    }
  };

  return (
    <div className="flex-1 flex overflow-hidden bg-[#0b0f19] select-none">
      {/* Left Control Sidebar */}
      <div className="w-84 bg-slate-900 border-r border-slate-800 flex flex-col h-full text-slate-200">
        {/* Header */}
        <div className="p-4 border-b border-slate-800 bg-slate-950/40 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Grid className="w-4 h-4 text-blue-400" />
            <span className="font-semibold text-sm">Dynamic Sheet Engine</span>
          </div>
          <button
            onClick={onBackToEditor}
            className="text-xs text-slate-400 hover:text-white flex items-center space-x-1"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
            <span>Editor</span>
          </button>
        </div>

        {/* Scrollable Layout Controls */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 text-xs">
          {/* Warning banner if layout does not fit */}
          {layout.warning && (
            <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl text-amber-300 flex items-start space-x-2">
              <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0 text-amber-400" />
              <div className="text-[11px] leading-relaxed">{layout.warning}</div>
            </div>
          )}

          {/* Paper Size Preset */}
          <div className="space-y-1.5">
            <label className="text-slate-400 font-medium">Paper Size</label>
            <select
              value={config.paperId}
              onChange={(e) => updateConfig('paperId', e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2 text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              {PAPER_PRESETS.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>

          {/* Orientation Selector */}
          <div className="space-y-1.5">
            <div className="flex justify-between items-center text-slate-400 font-medium">
              <span>Orientation</span>
              {config.orientation === 'auto' && (
                <span className="text-[10px] text-cyan-400 bg-cyan-950/50 px-1.5 py-0.5 rounded border border-cyan-800/50">
                  Recommended: {layout.recommendedOrientation}
                </span>
              )}
            </div>
            <div className="grid grid-cols-3 gap-1.5">
              {(['auto', 'portrait', 'landscape'] as const).map((orient) => (
                <button
                  key={orient}
                  onClick={() => updateConfig('orientation', orient)}
                  className={`py-1.5 capitalize rounded-lg text-xs font-medium transition ${
                    config.orientation === orient
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
                  }`}
                >
                  {orient}
                </button>
              ))}
            </div>
          </div>

          {/* Copies count & Auto-Fill */}
          <div className="space-y-1.5">
            <div className="flex justify-between items-center text-slate-400 font-medium">
              <span>Total Photos</span>
              <button
                onClick={handleAutoFill}
                className="text-[11px] text-cyan-400 hover:text-cyan-300 flex items-center space-x-1"
                title="Fill full sheet"
              >
                <Sparkles className="w-3 h-3" />
                <span>Auto Fill Sheet ({layout.capacityPerSheet})</span>
              </button>
            </div>
            <div className="flex items-center space-x-2">
              <input
                type="number"
                min="1"
                max="200"
                value={config.copies}
                onChange={(e) => updateConfig('copies', Math.max(1, parseInt(e.target.value) || 1))}
                className="w-24 bg-slate-800 border border-slate-700 rounded-lg p-2 text-white font-mono text-center focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
              <div className="flex-1 text-[11px] text-slate-400">
                {layout.capacityPerSheet} photos / sheet ({layout.totalPages} {layout.totalPages === 1 ? 'page' : 'pages'})
              </div>
            </div>
          </div>

          {/* Spacing & Margins */}
          <div className="space-y-3 border-t border-slate-800 pt-3">
            <div className="text-slate-300 font-semibold">Sheet Spacing (mm)</div>

            <div className="space-y-1">
              <div className="flex justify-between text-slate-400">
                <span>Page Margins</span>
                <span className="font-mono text-slate-300">{config.marginMm} mm</span>
              </div>
              <input
                type="range"
                min="0"
                max="25"
                value={config.marginMm}
                onChange={(e) => updateConfig('marginMm', parseInt(e.target.value))}
                className="w-full accent-blue-500 h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <div className="flex justify-between text-slate-400">
                  <span>H-Gap</span>
                  <span className="font-mono text-slate-300">{config.gapHorizontalMm} mm</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="15"
                  value={config.gapHorizontalMm}
                  onChange={(e) => updateConfig('gapHorizontalMm', parseInt(e.target.value))}
                  className="w-full accent-blue-500 h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer"
                />
              </div>

              <div className="space-y-1">
                <div className="flex justify-between text-slate-400">
                  <span>V-Gap</span>
                  <span className="font-mono text-slate-300">{config.gapVerticalMm} mm</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="15"
                  value={config.gapVerticalMm}
                  onChange={(e) => updateConfig('gapVerticalMm', parseInt(e.target.value))}
                  className="w-full accent-blue-500 h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer"
                />
              </div>
            </div>
          </div>

          {/* Print Guides: Borders & Cut Lines */}
          <div className="space-y-2.5 border-t border-slate-800 pt-3">
            <div className="text-slate-300 font-semibold">Print Guides</div>

            <label className="flex items-center space-x-2.5 cursor-pointer">
              <input
                type="checkbox"
                checked={config.showBorders}
                onChange={(e) => updateConfig('showBorders', e.target.checked)}
                className="rounded bg-slate-800 border-slate-700 text-blue-600 focus:ring-0"
              />
              <span className="text-slate-300">Thin Photo Border (0.5pt)</span>
            </label>

            <label className="flex items-center space-x-2.5 cursor-pointer">
              <input
                type="checkbox"
                checked={config.showCutLines}
                onChange={(e) => updateConfig('showCutLines', e.target.checked)}
                className="rounded bg-slate-800 border-slate-700 text-blue-600 focus:ring-0"
              />
              <span className="text-slate-300 flex items-center space-x-1.5">
                <Scissors className="w-3.5 h-3.5 text-cyan-400" />
                <span>Scissor Cut Marks / Crosshairs</span>
              </span>
            </label>

            <label className="flex items-center space-x-2.5 cursor-pointer">
              <input
                type="checkbox"
                checked={config.centerAlign}
                onChange={(e) => updateConfig('centerAlign', e.target.checked)}
                className="rounded bg-slate-800 border-slate-700 text-blue-600 focus:ring-0"
              />
              <span className="text-slate-300">Center Layout on Sheet</span>
            </label>
          </div>

          {/* DPI Resolution */}
          <div className="space-y-1.5 border-t border-slate-800 pt-3">
            <label className="text-slate-400 font-medium">Export Resolution</label>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => updateConfig('dpi', 300)}
                className={`py-1.5 rounded-lg text-xs font-medium transition ${
                  config.dpi === 300
                    ? 'bg-blue-600 text-white'
                    : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
                }`}
              >
                300 DPI (Standard)
              </button>
              <button
                onClick={() => updateConfig('dpi', 600)}
                className={`py-1.5 rounded-lg text-xs font-medium transition ${
                  config.dpi === 600
                    ? 'bg-blue-600 text-white'
                    : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
                }`}
              >
                600 DPI (Ultra Pro)
              </button>
            </div>
          </div>
        </div>

        {/* Live Metrics footer */}
        <div className="p-3 bg-slate-950/60 border-t border-slate-800 text-[11px] text-slate-400 space-y-1 font-mono">
          <div className="flex justify-between">
            <span>Dimensions:</span>
            <span className="text-slate-200">{layout.sheetWidthMm} × {layout.sheetHeightMm} mm</span>
          </div>
          <div className="flex justify-between">
            <span>Grid Layout:</span>
            <span className="text-slate-200">{layout.columns} Columns × {layout.rows} Rows</span>
          </div>
          <div className="flex justify-between">
            <span>Calculated Resolution:</span>
            <span className="text-slate-200">{layout.sheetWidthPx} × {layout.sheetHeightPx} px</span>
          </div>
        </div>
      </div>

      {/* Main Preview & Export Area */}
      <div className="flex-1 flex flex-col items-center justify-between p-4 overflow-hidden relative">
        {/* Top Export Bar */}
        <div className="w-full flex items-center justify-between bg-slate-900/90 backdrop-blur-md px-4 py-2.5 rounded-2xl border border-slate-800 shadow-xl mb-3">
          <div className="flex items-center space-x-3">
            <span className="text-xs font-semibold text-slate-300">
              Page {currentPage + 1} of {layout.totalPages}
            </span>
            {layout.totalPages > 1 && (
              <div className="flex items-center space-x-1">
                <button
                  disabled={currentPage === 0}
                  onClick={() => setCurrentPage((p) => p - 1)}
                  className="p-1 rounded bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-slate-300"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  disabled={currentPage >= layout.totalPages - 1}
                  onClick={() => setCurrentPage((p) => p + 1)}
                  className="p-1 rounded bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-slate-300"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>

          {/* Action Export Buttons */}
          <div className="flex items-center space-x-2">
            <button
              onClick={handlePrint}
              className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium flex items-center space-x-1.5 transition"
            >
              <Printer className="w-3.5 h-3.5 text-slate-300" />
              <span>Print</span>
            </button>
            <button
              onClick={() => handleExportImage('jpg')}
              className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium flex items-center space-x-1.5 transition"
            >
              <FileDown className="w-3.5 h-3.5 text-blue-400" />
              <span>JPG</span>
            </button>
            <button
              onClick={() => handleExportImage('png')}
              className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium flex items-center space-x-1.5 transition"
            >
              <FileDown className="w-3.5 h-3.5 text-cyan-400" />
              <span>PNG (300 DPI)</span>
            </button>
            <button
              onClick={handleExportPDF}
              disabled={isExporting}
              className="px-4 py-1.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-xs font-bold flex items-center space-x-1.5 shadow-lg shadow-blue-900/40 transition"
            >
              <FileDown className="w-4 h-4" />
              <span>{isExporting ? 'Generating...' : 'Export Print-Ready PDF'}</span>
            </button>
          </div>
        </div>

        {/* Status notification toast */}
        {exportMessage && (
          <div className="absolute top-16 z-30 bg-blue-600 text-white px-4 py-2 rounded-xl shadow-2xl text-xs font-medium animate-fade-in flex items-center space-x-2">
            <Check className="w-4 h-4" />
            <span>{exportMessage}</span>
          </div>
        )}

        {/* Live Canvas Viewport */}
        <div className="flex-1 w-full flex items-center justify-center p-2 overflow-auto">
          <canvas
            ref={previewCanvasRef}
            className="max-h-[72vh] max-w-[80vw] object-contain rounded-lg shadow-2xl border border-slate-700/60 bg-white"
          />
        </div>

        {/* Footer info */}
        <div className="w-full text-center text-[11px] text-slate-400 pt-2">
          Exact 1:1 Physical Scale • 100% Print-Ready (No stretching or distortion)
        </div>
      </div>
    </div>
  );
};
