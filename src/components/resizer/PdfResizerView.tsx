import React, { useState, useRef } from 'react';
import {
  FileText,
  Upload,
  Download,
  AlertTriangle,
  RefreshCw,
  Zap,
  Sliders,
  CheckCircle2,
  FileCheck,
  Layers,
  ArrowRight
} from 'lucide-react';
import { PageSizePreset, PdfCompressionMode } from '../../types';
import {
  getPdfMetadata,
  processPdfDocument,
  pdfBytesToDataUrl,
  PdfMetadata
} from '../../services/pdfResizerEngine';
import { formatFileSize } from '../../services/imageResizerEngine';
import { saveOrDownloadFile } from '../../services/exportHelper';

interface PdfResizerViewProps {
  onNotify?: (msg: string) => void;
}

export const PdfResizerView: React.FC<PdfResizerViewProps> = ({ onNotify }) => {
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [pdfBytes, setPdfBytes] = useState<Uint8Array | null>(null);
  const [metadata, setMetadata] = useState<PdfMetadata | null>(null);

  // Settings
  const [targetKb, setTargetKb] = useState<number>(500);
  const [customKb, setCustomKb] = useState<string>('500');
  const [pageSize, setPageSize] = useState<PageSizePreset>('original');
  const [orientation, setOrientation] = useState<'portrait' | 'landscape' | 'original'>('original');
  const [compressionMode, setCompressionMode] = useState<PdfCompressionMode>('balanced');

  // Processing state
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [outputBytes, setOutputBytes] = useState<Uint8Array | null>(null);
  const [outputSizeKb, setOutputSizeKb] = useState<number>(0);
  const [warning, setWarning] = useState<string | undefined>();

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
      onNotify?.('Please select a valid PDF document.');
      return;
    }

    try {
      const buffer = await file.arrayBuffer();
      const bytes = new Uint8Array(buffer);
      const meta = await getPdfMetadata(bytes);

      setPdfFile(file);
      setPdfBytes(bytes);
      setMetadata(meta);
      setOutputBytes(null);
      setOutputSizeKb(0);
      setWarning(undefined);
    } catch (err: any) {
      console.error('Failed to parse PDF:', err);
      onNotify?.('Failed to open PDF document. File may be encrypted or corrupted.');
    }
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file && (file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf'))) {
      try {
        const buffer = await file.arrayBuffer();
        const bytes = new Uint8Array(buffer);
        const meta = await getPdfMetadata(bytes);

        setPdfFile(file);
        setPdfBytes(bytes);
        setMetadata(meta);
        setOutputBytes(null);
        setOutputSizeKb(0);
        setWarning(undefined);
      } catch (err: any) {
        console.error('Failed to parse PDF:', err);
        onNotify?.('Failed to open PDF document.');
      }
    }
  };

  const handleProcessPdf = async () => {
    if (!pdfBytes) return;
    setIsProcessing(true);
    setWarning(undefined);

    try {
      const res = await processPdfDocument({
        pdfBytes,
        targetPageSize: pageSize,
        orientation,
        compressionMode,
        targetKb,
      });

      setOutputBytes(res.pdfBytes);
      setOutputSizeKb(res.fileSizeKb);
      setWarning(res.warning);
      onNotify?.(`PDF processed! Output size: ${formatFileSize(res.fileSizeBytes)}`);
    } catch (err: any) {
      console.error('PDF Process error:', err);
      onNotify?.('Failed to process PDF.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDownload = async () => {
    if (!outputBytes || !pdfFile) return;
    const baseName = pdfFile.name.replace(/\.[^/.]+$/, '');
    const outName = `${baseName}_optimized_${outputSizeKb}KB.pdf`;

    const dataUrl = pdfBytesToDataUrl(outputBytes);
    const res = await saveOrDownloadFile({
      dataUrl,
      defaultName: outName,
      format: 'pdf',
    });

    if (res.success) {
      onNotify?.(`Saved successfully: ${outName}`);
    }
  };

  const TARGET_PDF_PRESETS = [100, 200, 500, 1000, 2000, 5000];

  return (
    <div className="flex-1 flex flex-col p-6 overflow-y-auto space-y-6">
      {/* Top Banner */}
      <div className="flex items-center justify-between pb-4 border-b border-slate-800">
        <div>
          <h2 className="text-xl font-black text-white flex items-center space-x-2">
            <FileText className="w-5 h-5 text-rose-400" />
            <span>PDF Resizer & Target Size Compressor</span>
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Compress PDF documents to strict portal limits (100KB, 200KB, 500KB), resize pages to standard A4/A5/Letter.
          </p>
        </div>

        {pdfFile && (
          <div className="flex items-center space-x-2">
            <button
              onClick={() => fileInputRef.current?.click()}
              className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold flex items-center space-x-1.5 transition"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Change PDF</span>
            </button>
            {outputBytes && (
              <button
                onClick={handleDownload}
                className="px-4 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold shadow-lg shadow-rose-900/30 flex items-center space-x-2 transition"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Save Optimized PDF</span>
              </button>
            )}
          </div>
        )}
      </div>

      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileUpload}
        accept="application/pdf"
        className="hidden"
      />

      {!pdfFile || !metadata ? (
        /* Upload Area */
        <div
          onDragOver={(e) => e.preventDefault()}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className="flex-1 min-h-[380px] border-2 border-dashed border-slate-700/80 hover:border-rose-500/80 bg-slate-900/50 hover:bg-slate-900/80 rounded-3xl p-8 flex flex-col items-center justify-center text-center cursor-pointer transition-all duration-300 group"
        >
          <div className="w-16 h-16 rounded-3xl bg-rose-600/10 border border-rose-500/20 flex items-center justify-center text-rose-400 mb-4 group-hover:scale-110 transition-transform">
            <Upload className="w-8 h-8" />
          </div>
          <h3 className="text-lg font-bold text-white mb-1">Choose PDF File or Drag & Drop</h3>
          <p className="text-xs text-slate-400 max-w-sm mb-4">
            Supports online form PDFs, certificates, scanned marksheet documents up to 100MB. Processed offline locally.
          </p>
          <span className="px-4 py-2 rounded-xl bg-rose-600 text-white text-xs font-bold shadow-md shadow-rose-900/40">
            Select PDF Document
          </span>
        </div>
      ) : (
        /* Workspace Grid */
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Controls Column (5 cols) */}
          <div className="lg:col-span-5 space-y-4">
            {/* Document Info Card */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-3">
              <span className="text-xs font-bold text-slate-300 uppercase tracking-wider">Document Information</span>
              <div className="space-y-1.5 text-xs text-slate-300">
                <div className="flex justify-between">
                  <span className="text-slate-500">File Name:</span>
                  <span className="font-semibold text-white truncate max-w-[200px]">{pdfFile.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Original Size:</span>
                  <span className="font-mono text-emerald-400 font-bold">{formatFileSize(metadata.fileSizeBytes)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Total Pages:</span>
                  <span className="font-mono text-white font-bold">{metadata.pageCount} pages</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Dimensions:</span>
                  <span className="font-mono text-slate-300">
                    {metadata.firstPageWidthMm} × {metadata.firstPageHeightMm} mm ({metadata.orientation})
                  </span>
                </div>
              </div>
            </div>

            {/* Target Size Presets */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-300 uppercase tracking-wider">Target PDF Size</span>
                <span className="text-xs font-mono font-bold text-rose-400">{targetKb} KB</span>
              </div>

              <div className="grid grid-cols-3 gap-2">
                {TARGET_PDF_PRESETS.map((kb) => (
                  <button
                    key={kb}
                    onClick={() => {
                      setTargetKb(kb);
                      setCustomKb(kb.toString());
                    }}
                    className={`py-1.5 rounded-lg text-xs font-semibold transition ${
                      targetKb === kb
                        ? 'bg-rose-600 text-white font-bold shadow-sm'
                        : 'bg-slate-800 hover:bg-slate-750 text-slate-300'
                    }`}
                  >
                    {kb >= 1000 ? `${kb / 1000} MB` : `${kb} KB`}
                  </button>
                ))}
              </div>

              <div>
                <label className="text-[11px] font-semibold text-slate-400 block mb-1">Custom Target Size (KB)</label>
                <div className="flex items-center space-x-2">
                  <input
                    type="number"
                    min="20"
                    max="100000"
                    value={customKb}
                    onChange={(e) => {
                      setCustomKb(e.target.value);
                      const num = parseInt(e.target.value, 10);
                      if (num > 0) setTargetKb(num);
                    }}
                    className="flex-1 bg-slate-950 border border-slate-700/80 rounded-xl px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-rose-500"
                  />
                  <span className="text-xs font-bold text-slate-400">KB</span>
                </div>
              </div>
            </div>

            {/* Page Resize Settings */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-3">
              <span className="text-xs font-bold text-slate-300 uppercase tracking-wider">Page Resize & Layout</span>

              <div className="grid grid-cols-2 gap-3 items-center">
                <div>
                  <label className="text-[11px] font-semibold text-slate-400 block mb-1">Page Format</label>
                  <select
                    value={pageSize}
                    onChange={(e) => setPageSize(e.target.value as PageSizePreset)}
                    className="w-full bg-slate-950 border border-slate-700/80 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-rose-500"
                  >
                    <option value="original">Keep Original Size</option>
                    <option value="a4">Standard A4 (210 × 297 mm)</option>
                    <option value="a5">A5 (148 × 210 mm)</option>
                    <option value="letter">US Letter (8.5 × 11 in)</option>
                    <option value="legal">US Legal (8.5 × 14 in)</option>
                  </select>
                </div>

                <div>
                  <label className="text-[11px] font-semibold text-slate-400 block mb-1">Orientation</label>
                  <select
                    value={orientation}
                    onChange={(e) => setOrientation(e.target.value as any)}
                    className="w-full bg-slate-950 border border-slate-700/80 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-rose-500"
                  >
                    <option value="original">Keep Original</option>
                    <option value="portrait">Portrait</option>
                    <option value="landscape">Landscape</option>
                  </select>
                </div>
              </div>
            </div>

            <button
              onClick={handleProcessPdf}
              disabled={isProcessing}
              className="w-full py-3 rounded-2xl bg-rose-600 hover:bg-rose-500 disabled:opacity-50 text-white text-xs font-bold shadow-xl shadow-rose-900/30 flex items-center justify-center space-x-2 transition"
            >
              {isProcessing ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Compressing & Resizing PDF...</span>
                </>
              ) : (
                <>
                  <Zap className="w-4 h-4" />
                  <span>Execute PDF Compression</span>
                </>
              )}
            </button>
          </div>

          {/* Results Column (7 cols) */}
          <div className="lg:col-span-7 space-y-4">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 min-h-[300px] flex flex-col justify-between">
              <div>
                <span className="text-xs font-bold text-slate-300 uppercase tracking-wider block mb-4">
                  Optimization Results
                </span>

                {warning && (
                  <div className="flex items-start space-x-2 p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs mb-4">
                    <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                    <span>{warning}</span>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 bg-slate-950 rounded-xl border border-slate-800 text-center space-y-1">
                    <span className="text-[10px] uppercase font-bold text-slate-500">Original Size</span>
                    <div className="text-2xl font-black font-mono text-white">
                      {formatFileSize(metadata.fileSizeBytes)}
                    </div>
                    <span className="text-[11px] text-slate-400">{metadata.pageCount} Pages</span>
                  </div>

                  <div className="p-4 bg-slate-950 rounded-xl border border-slate-800 text-center space-y-1">
                    <span className="text-[10px] uppercase font-bold text-rose-400">Optimized Size</span>
                    <div className="text-2xl font-black font-mono text-emerald-400">
                      {outputBytes ? formatFileSize(outputBytes.byteLength) : '—'}
                    </div>
                    <span className="text-[11px] text-slate-400">
                      {outputBytes
                        ? `${Math.round(((metadata.fileSizeBytes - outputBytes.byteLength) / metadata.fileSizeBytes) * 100)}% Reduction`
                        : 'Ready to Process'}
                    </span>
                  </div>
                </div>

                <div className="mt-6 p-4 rounded-xl bg-slate-950/70 border border-slate-800 text-xs text-slate-300 space-y-2">
                  <div className="flex items-center space-x-2 text-indigo-400 font-semibold">
                    <FileCheck className="w-4 h-4" />
                    <span>Clean Structure & Font Preservation</span>
                  </div>
                  <p className="text-[11px] text-slate-400 leading-relaxed">
                    Embedded fonts and vectors are preserved. Streams are deflated with cross-reference tables optimized
                    to strictly ensure compliance with Indian government job portal PDF specifications.
                  </p>
                </div>
              </div>

              {outputBytes && (
                <div className="pt-6 border-t border-slate-800 flex items-center justify-between">
                  <div className="text-xs text-slate-400">
                    Output: <span className="text-white font-bold">{outputSizeKb} KB</span>
                  </div>
                  <button
                    onClick={handleDownload}
                    className="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold shadow-xl shadow-rose-900/30 flex items-center space-x-2 transition"
                  >
                    <Download className="w-4 h-4" />
                    <span>Download Optimized PDF</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
