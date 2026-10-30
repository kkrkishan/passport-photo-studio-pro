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
  Scissors,
  Check
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
  SheetCalculationResult
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

  const desktopCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const mobileCanvasRef = useRef<HTMLCanvasElement | null>(null);

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

  // Render sheet preview on both desktop and mobile canvases
  useEffect(() => {
    if (!croppedCanvas) return;
    if (desktopCanvasRef.current) {
      renderSheetToCanvas(
        desktopCanvasRef.current,
        croppedCanvas,
        layout,
        config,
        currentPage
      );
    }
    if (mobileCanvasRef.current) {
      renderSheetToCanvas(
        mobileCanvasRef.current,
        croppedCanvas,
        layout,
        config,
        currentPage
      );
    }
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
        setExportMessage(res.filePath ? `Saved: ${res.filePath}` : 'PDF saved to Gallery/Downloads!');
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

  // Direct Native Print
  const handlePrint = async () => {
    const electronAPI = (window as any).electronAPI;
    if (electronAPI) {
      await electronAPI.printPage();
    } else {
      window.print();
    }
  };

  // Common Settings Controls for both Desktop sidebar and Mobile bottom panel
  const renderSettingsControls = () => (
    <>
      {/* Warning banner if layout does not fit */}
      {layout.warning && (
        <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl text-amber-300 flex items-start space-x-2">
          <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0 text-amber-400" />
          <div className="text-[11px] leading-relaxed">{layout.warning}</div>
        </div>
      )}

      {/* Paper Size Preset */}
      <div className="space-y-1.5">
        <label className="text-slate-400 font-semibold text-xs">Paper Size</label>
        <select
          value={config.paperId}
          onChange={(e) => updateConfig('paperId', e.target.value)}
          className="w-full bg-slate-800 border border-slate-700 rounded-xl p-2.5 text-white font-medium focus:outline-none focus:ring-1 focus:ring-blue-500"
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
          <span className="font-semibold text-xs">Orientation</span>
          {config.orientation === 'auto' && (
            <span className="text-[10px] text-cyan-400 bg-cyan-950/50 px-1.5 py-0.5 rounded border border-cyan-800/50">
              Rec: {layout.recommendedOrientation}
            </span>
          )}
        </div>
        <div className="grid grid-cols-3 gap-1.5">
          {(['auto', 'portrait', 'landscape'] as const).map((orient) => (
            <button
              key={orient}
              onClick={() => updateConfig('orientation', orient)}
              className={`py-2 capitalize rounded-xl text-xs font-semibold transition active:scale-95 ${
                config.orientation === orient
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'bg-slate-800 hover:bg-slate-750 text-slate-300'
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
          <span className="font-semibold text-xs">Number of Photos</span>
          <button
            onClick={handleAutoFill}
            className="text-xs text-cyan-400 hover:text-cyan-300 font-bold flex items-center space-x-1 active:scale-95 transition"
            title="Fill full sheet"
          >
            <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
            <span>Auto Fill Sheet ({layout.capacityPerSheet})</span>
          </button>
        </div>
        <div className="flex items-center space-x-2">
          <button
            onClick={() => updateConfig('copies', Math.max(1, config.copies - 1))}
            className="w-10 h-10 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold flex items-center justify-center border border-slate-700 active:scale-95 transition"
          >
            -
          </button>
          <input
            type="number"
            min="1"
            max="200"
            value={config.copies}
            onChange={(e) => updateConfig('copies', Math.max(1, parseInt(e.target.value) || 1))}
            className="flex-1 bg-slate-800 border border-slate-700 rounded-xl py-2 text-white font-mono text-center text-sm font-bold focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
          <button
            onClick={() => updateConfig('copies', config.copies + 1)}
            className="w-10 h-10 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold flex items-center justify-center border border-slate-700 active:scale-95 transition"
          >
            +
          </button>
        </div>
        <div className="text-[11px] text-slate-400 text-center font-mono">
          {layout.capacityPerSheet} photos / sheet • {layout.totalPages} {layout.totalPages === 1 ? 'page' : 'pages'} total
        </div>
      </div>

      {/* Spacing & Margins */}
      <div className="space-y-3 border-t border-slate-800 pt-3">
        <div className="text-slate-300 font-bold text-xs">Sheet Spacing & Margins (mm)</div>

        <div className="space-y-1">
          <div className="flex justify-between text-slate-400">
            <span>Page Margins</span>
            <span className="font-mono text-slate-200 font-semibold">{config.marginMm} mm</span>
          </div>
          <input
            type="range"
            min="0"
            max="25"
            value={config.marginMm}
            onChange={(e) => updateConfig('marginMm', parseInt(e.target.value))}
            className="w-full accent-blue-500 h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <div className="flex justify-between text-slate-400">
              <span>H-Gap</span>
              <span className="font-mono text-slate-200 font-semibold">{config.gapHorizontalMm} mm</span>
            </div>
            <input
              type="range"
              min="0"
              max="15"
              value={config.gapHorizontalMm}
              onChange={(e) => updateConfig('gapHorizontalMm', parseInt(e.target.value))}
              className="w-full accent-blue-500 h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer"
            />
          </div>

          <div className="space-y-1">
            <div className="flex justify-between text-slate-400">
              <span>V-Gap</span>
              <span className="font-mono text-slate-200 font-semibold">{config.gapVerticalMm} mm</span>
            </div>
            <input
              type="range"
              min="0"
              max="15"
              value={config.gapVerticalMm}
              onChange={(e) => updateConfig('gapVerticalMm', parseInt(e.target.value))}
              className="w-full accent-blue-500 h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer"
            />
          </div>
        </div>
      </div>

      {/* Print Guides: Borders & Cut Lines */}
      <div className="space-y-2.5 border-t border-slate-800 pt-3">
        <div className="text-slate-300 font-bold text-xs">Print Guides & Marks</div>

        <label className="flex items-center space-x-2.5 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={config.showBorders}
            onChange={(e) => updateConfig('showBorders', e.target.checked)}
            className="rounded bg-slate-800 border-slate-700 text-blue-600 focus:ring-0 w-4 h-4"
          />
          <span className="text-slate-300 text-xs">Thin Photo Border (0.5pt black outline)</span>
        </label>

        <label className="flex items-center space-x-2.5 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={config.showCutLines}
            onChange={(e) => updateConfig('showCutLines', e.target.checked)}
            className="rounded bg-slate-800 border-slate-700 text-blue-600 focus:ring-0 w-4 h-4"
          />
          <span className="text-slate-300 text-xs flex items-center space-x-1.5">
            <Scissors className="w-3.5 h-3.5 text-cyan-400" />
            <span>Scissor Cut Marks / Crosshairs</span>
          </span>
        </label>

        <label className="flex items-center space-x-2.5 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={config.centerAlign}
            onChange={(e) => updateConfig('centerAlign', e.target.checked)}
            className="rounded bg-slate-800 border-slate-700 text-blue-600 focus:ring-0 w-4 h-4"
          />
          <span className="text-slate-300 text-xs">Center Layout on Sheet</span>
        </label>
      </div>

      {/* DPI Resolution */}
      <div className="space-y-1.5 border-t border-slate-800 pt-3">
        <label className="text-slate-400 font-semibold text-xs">Export Resolution</label>
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={() => updateConfig('dpi', 300)}
            className={`py-2 rounded-xl text-xs font-semibold transition active:scale-95 ${
              config.dpi === 300
                ? 'bg-blue-600 text-white shadow-md'
                : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
            }`}
          >
            300 DPI (Standard)
          </button>
          <button
            onClick={() => updateConfig('dpi', 600)}
            className={`py-2 rounded-xl text-xs font-semibold transition active:scale-95 ${
              config.dpi === 600
                ? 'bg-blue-600 text-white shadow-md'
                : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
            }`}
          >
            600 DPI (Ultra Pro)
          </button>
        </div>
      </div>
    </>
  );

  return (
    <div className="flex-1 flex flex-col md:flex-row overflow-hidden bg-[#0b0f19] select-none h-full">
      {/* ======================================================== */}
      {/* MOBILE STRICT 50% PREVIEW / 50% CONTROLS SPLIT LAYOUT     */}
      {/* ======================================================== */}
      <div className="flex md:hidden flex-1 flex-col h-full overflow-hidden">
        {/* Upper 50%: Live Sheet Canvas Preview + Instant Actions */}
        <div className="h-1/2 w-full bg-[#070b14] relative flex flex-col justify-between p-2 border-b border-slate-800 shrink-0">
          {/* Top row: Back button, Page info, Export PDF & JPG */}
          <div className="flex items-center justify-between w-full z-10 gap-1.5 shrink-0">
            <button
              onClick={onBackToEditor}
              className="px-2.5 py-1 rounded-xl bg-slate-800/95 hover:bg-slate-700 text-slate-200 text-xs font-bold flex items-center space-x-1 border border-slate-700 shadow-sm active:scale-95"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
              <span>Editor</span>
            </button>

            <div className="flex items-center space-x-1 text-xs font-bold text-slate-300 bg-slate-800/90 px-2 py-1 rounded-xl border border-slate-700">
              <span>P.{currentPage + 1}/{layout.totalPages}</span>
              {layout.totalPages > 1 && (
                <div className="flex items-center ml-1 space-x-0.5">
                  <button
                    disabled={currentPage === 0}
                    onClick={() => setCurrentPage((p) => p - 1)}
                    className="p-0.5 rounded text-slate-300 disabled:opacity-30 active:scale-90"
                  >
                    <ChevronLeft className="w-3.5 h-3.5" />
                  </button>
                  <button
                    disabled={currentPage >= layout.totalPages - 1}
                    onClick={() => setCurrentPage((p) => p + 1)}
                    className="p-0.5 rounded text-slate-300 disabled:opacity-30 active:scale-90"
                  >
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
            </div>

            <div className="flex items-center space-x-1.5">
              <button
                onClick={() => handleExportImage('jpg')}
                className="px-2.5 py-1 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold flex items-center space-x-1 border border-slate-700 shadow-sm active:scale-95"
                title="Save High-Res JPG"
              >
                <FileDown className="w-3.5 h-3.5 text-blue-400" />
                <span>JPG</span>
              </button>
              <button
                onClick={handleExportPDF}
                disabled={isExporting}
                className="px-3 py-1 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 text-white text-xs font-bold flex items-center space-x-1 shadow-md shadow-blue-900/40 active:scale-95"
                title="Save Print-Ready PDF"
              >
                <FileDown className="w-3.5 h-3.5" />
                <span>{isExporting ? '...' : 'PDF'}</span>
              </button>
            </div>
          </div>

          {/* Export message toast */}
          {exportMessage && (
            <div className="absolute top-12 left-1/2 -translate-x-1/2 z-30 bg-blue-600 text-white px-3 py-1.5 rounded-xl shadow-2xl text-xs font-semibold flex items-center space-x-1.5 animate-fade-in whitespace-nowrap">
              <Check className="w-3.5 h-3.5" />
              <span>{exportMessage}</span>
            </div>
          )}

          {/* Centered Live Canvas Preview */}
          <div className="flex-1 w-full flex items-center justify-center overflow-hidden p-1">
            <canvas
              ref={mobileCanvasRef}
              className="max-h-[35vh] max-w-[95%] object-contain rounded-md shadow-2xl border border-slate-700/80 bg-white"
            />
          </div>

          {/* Bottom badge */}
          <div className="flex items-center justify-between text-[11px] text-slate-400 bg-slate-900/90 px-2.5 py-1 rounded-xl border border-slate-800 shrink-0">
            <span>{layout.totalPhotos} Photos ({layout.columns}×{layout.rows})</span>
            <span className="font-bold text-blue-400">{config.paperId.toUpperCase()} • {config.dpi} DPI</span>
          </div>
        </div>

        {/* Lower 50%: Scrollable Paper & Grid Controls */}
        <div className="h-1/2 w-full overflow-y-auto bg-slate-900 p-3.5 space-y-3.5 text-xs text-slate-200">
          <div className="flex items-center space-x-2 text-slate-300 font-bold border-b border-slate-800 pb-2">
            <Grid className="w-4 h-4 text-blue-400" />
            <span>Paper & Grid Settings</span>
          </div>
          {renderSettingsControls()}
        </div>
      </div>

      {/* ======================================================== */}
      {/* DESKTOP SIDE-BY-SIDE LAYOUT (Sidebar + Canvas Area)       */}
      {/* ======================================================== */}
      <div className="hidden md:flex flex-1 flex-row overflow-hidden h-full">
        {/* Left Control Sidebar */}
        <div className="w-84 bg-slate-900 border-r border-slate-800 flex flex-col h-full text-slate-200 shrink-0">
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
            {renderSettingsControls()}
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

        {/* Right Preview & Export Area */}
        <div className="flex-1 flex flex-col items-center justify-between p-4 overflow-hidden relative">
          {/* Top Export Bar */}
          <div className="w-full flex flex-wrap items-center justify-between gap-2 bg-slate-900/90 backdrop-blur-md px-4 py-2 rounded-2xl border border-slate-800 shadow-xl mb-3">
            <div className="flex items-center space-x-2">
              <span className="text-xs font-semibold text-slate-300">
                Page {currentPage + 1}/{layout.totalPages}
              </span>
              {layout.totalPages > 1 && (
                <div className="flex items-center space-x-1">
                  <button
                    disabled={currentPage === 0}
                    onClick={() => setCurrentPage((p) => p - 1)}
                    className="p-1 rounded bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-slate-300"
                  >
                    <ChevronLeft className="w-3.5 h-3.5" />
                  </button>
                  <button
                    disabled={currentPage >= layout.totalPages - 1}
                    onClick={() => setCurrentPage((p) => p + 1)}
                    className="p-1 rounded bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-slate-300"
                  >
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
            </div>

            {/* Action Export Buttons */}
            <div className="flex items-center space-x-2">
              <button
                onClick={handlePrint}
                className="px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium flex items-center space-x-1 transition"
              >
                <Printer className="w-3.5 h-3.5 text-slate-300" />
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
                <FileDown className="w-3.5 h-3.5 text-cyan-400" />
                <span>PNG</span>
              </button>
              <button
                onClick={handleExportPDF}
                disabled={isExporting}
                className="px-4 py-1.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-xs font-bold flex items-center space-x-1.5 shadow-lg shadow-blue-900/40 transition"
              >
                <FileDown className="w-4 h-4" />
                <span>{isExporting ? 'Exporting...' : 'Export PDF'}</span>
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
              ref={desktopCanvasRef}
              className="max-h-[72vh] max-w-[80vw] object-contain rounded-lg shadow-2xl border border-slate-700/60 bg-white"
            />
          </div>

          {/* Footer info */}
          <div className="w-full text-center text-[11px] text-slate-400 pt-2">
            Exact 1:1 Physical Scale • 100% Print-Ready (No stretching or distortion)
          </div>
        </div>
      </div>
    </div>
  );
};
