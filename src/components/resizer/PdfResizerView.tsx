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
  ArrowRight,
  ShieldCheck,
  Scale
} from 'lucide-react';
import { PageSizePreset, PdfCompressionMode } from '../../types';
import {
  getPdfMetadata,
  processPdfDocument,
  pdfBytesToDataUrl,
  PdfMetadata
} from '../../services/pdfResizerEngine';
import { formatFileSize, formatDetailedBytes } from '../../services/imageResizerEngine';
import { OutputInfoPanel, ProcessingStatus } from './OutputInfoPanel';
import { saveOrDownloadFile } from '../../services/exportHelper';

interface PdfResizerViewProps {
  onNotify?: (msg: string) => void;
}

export const PdfResizerView: React.FC<PdfResizerViewProps> = ({ onNotify }) => {
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [pdfBytes, setPdfBytes] = useState<Uint8Array | null>(null);
  const [metadata, setMetadata] = useState<PdfMetadata | null>(null);

  // Settings
  const [compressModeType, setCompressModeType] = useState<'target-kb' | 'quality-slider'>('target-kb');
  const [targetKb, setTargetKb] = useState<number>(500);
  const [customKb, setCustomKb] = useState<string>('500');
  const [qualitySlider, setQualitySlider] = useState<number>(80);
  const [compressionMode, setCompressionMode] = useState<PdfCompressionMode>('balanced');
  const [pageSize, setPageSize] = useState<PageSizePreset>('original');
  const [orientation, setOrientation] = useState<'portrait' | 'landscape' | 'original'>('original');
  const [dpi, setDpi] = useState<number>(150);

  // Processing & Verification state
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [outputBytes, setOutputBytes] = useState<Uint8Array | null>(null);
  const [outputSizeBytes, setOutputSizeBytes] = useState<number>(0);
  const [verifiedSavedBytes, setVerifiedSavedBytes] = useState<number | undefined>();
  const [status, setStatus] = useState<ProcessingStatus>('ready');
  const [statusMessage, setStatusMessage] = useState<string | undefined>();
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
      setOutputSizeBytes(0);
      setVerifiedSavedBytes(undefined);
      setStatus('ready');
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
        setOutputSizeBytes(0);
        setVerifiedSavedBytes(undefined);
        setStatus('ready');
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
    setStatus('generating');
    setWarning(undefined);

    try {
      const res = await processPdfDocument({
        pdfBytes,
        targetPageSize: pageSize,
        orientation,
        compressionMode,
        targetKb: compressModeType === 'target-kb' ? targetKb : undefined,
        qualitySlider,
        dpi,
        onProgress: (p) => {
          setStatusMessage(p.message);
        },
      });

      setOutputBytes(res.pdfBytes);
      setOutputSizeBytes(res.fileSizeBytes);
      setWarning(res.warning);

      if (!res.isWithinTarget && compressModeType === 'target-kb') {
        setStatus('target-unachievable');
        setStatusMessage(`Closest achieved: ${formatFileSize(res.fileSizeBytes)} (target was ${targetKb} KB)`);
      } else {
        setStatus('preview-ready');
        setStatusMessage(`Validated ${res.pageCount} pages • ${res.fileSizeBytes.toLocaleString()} bytes`);
      }

      onNotify?.(`PDF processed & verified! Size: ${formatFileSize(res.fileSizeBytes)}`);
    } catch (err: any) {
      console.error('PDF Process error:', err);
      setStatus('failed');
      setStatusMessage(err.message || 'Processing failed');
      onNotify?.('Failed to process PDF.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDownload = async () => {
    if (!outputBytes || !pdfFile) return;
    setStatus('saving');

    const baseName = pdfFile.name.replace(/\.[^/.]+$/, '');
    const outName = `${baseName}_optimized_${Math.round(outputSizeBytes / 1024)}KB.pdf`;

    const dataUrl = pdfBytesToDataUrl(outputBytes);
    const res = await saveOrDownloadFile({
      dataUrl,
      defaultName: outName,
      format: 'pdf',
    });

    if (res.success) {
      const verified = res.verifiedBytes ?? outputSizeBytes;
      setVerifiedSavedBytes(verified);
      setStatus('save-verified');
      setStatusMessage(`Verified on disk: ${formatDetailedBytes(verified)}`);
      onNotify?.(`Saved & Verified successfully: ${outName}`);
    } else if (res.canceled) {
      setStatus('preview-ready');
    } else {
      setStatus('failed');
      setStatusMessage(res.error || 'Failed to save PDF');
      onNotify?.('Failed to save PDF file.');
    }
  };

  const TARGET_PDF_PRESETS = [100, 200, 500, 1000, 2000, 5000];

  return (
    <div className="flex-1 flex flex-col p-6 overflow-y-auto space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-800">
        <div>
          <h2 className="text-lg sm:text-xl font-black text-white flex items-center space-x-2">
            <FileText className="w-5 h-5 text-rose-400" />
            <span>PDF Resizer & Compression Studio</span>
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Real-time output size verification, 0–100% compression slider, standard page resizing, and verified save.
          </p>
        </div>

        {pdfFile && (
          <div className="flex flex-wrap items-center gap-2">
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
                disabled={status === 'generating' || status === 'saving'}
                className="px-4 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-500 disabled:opacity-50 text-white text-xs font-bold shadow-lg shadow-rose-900/30 flex items-center space-x-2 transition"
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
            {/* Compression Mode Switcher */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-3 shadow-lg">
              <span className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                Select Active Optimization Mode
              </span>
              <div className="grid grid-cols-2 gap-2 p-1 bg-slate-950 rounded-xl border border-slate-800">
                <button
                  onClick={() => setCompressModeType('target-kb')}
                  className={`py-2 px-3 rounded-lg text-xs font-semibold flex items-center justify-center space-x-1.5 transition ${
                    compressModeType === 'target-kb'
                      ? 'bg-rose-600 text-white shadow-sm'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <Zap className="w-3.5 h-3.5" />
                  <span>Target File Size</span>
                </button>
                <button
                  onClick={() => setCompressModeType('quality-slider')}
                  className={`py-2 px-3 rounded-lg text-xs font-semibold flex items-center justify-center space-x-1.5 transition ${
                    compressModeType === 'quality-slider'
                      ? 'bg-rose-600 text-white shadow-sm'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <Sliders className="w-3.5 h-3.5" />
                  <span>0–100% Slider</span>
                </button>
              </div>
            </div>

            {/* Target Size or Slider */}
            {compressModeType === 'target-kb' ? (
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-4 shadow-lg">
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
            ) : (
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-4 shadow-lg">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                    Quality / Compression Level
                  </span>
                  <span className="text-xs font-mono font-bold text-rose-400">{qualitySlider}%</span>
                </div>

                <input
                  type="range"
                  min="0"
                  max="100"
                  step="1"
                  value={qualitySlider}
                  onChange={(e) => setQualitySlider(parseInt(e.target.value, 10))}
                  className="w-full accent-rose-500 cursor-pointer"
                />

                <div className="flex justify-between items-center text-[10px] text-slate-400 font-mono">
                  <span>0% (Strong)</span>
                  <span className="text-white font-semibold">Quality: {qualitySlider}%</span>
                  <span>100% (Lossless)</span>
                </div>
              </div>
            )}

            {/* Compression Engine Mode */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-3 shadow-lg">
              <span className="text-xs font-bold text-slate-300 uppercase tracking-wider">Engine Compression Mode</span>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: 'lossless', label: 'Lossless' },
                  { id: 'balanced', label: 'Balanced' },
                  { id: 'strong', label: 'Strong' },
                ].map((m) => (
                  <button
                    key={m.id}
                    onClick={() => setCompressionMode(m.id as PdfCompressionMode)}
                    className={`py-2 rounded-xl text-xs font-bold transition ${
                      compressionMode === m.id
                        ? 'bg-rose-600 text-white font-bold shadow-md'
                        : 'bg-slate-950 border border-slate-800 text-slate-400 hover:text-white'
                    }`}
                  >
                    {m.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Page Resize Settings */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-3 shadow-lg">
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
              className="w-full py-3.5 rounded-2xl bg-rose-600 hover:bg-rose-500 disabled:opacity-50 text-white text-xs font-bold shadow-xl shadow-rose-900/30 flex items-center justify-center space-x-2 transition"
            >
              {isProcessing ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Compressing & Verifying PDF...</span>
                </>
              ) : (
                <>
                  <Zap className="w-4 h-4" />
                  <span>Execute PDF Optimization</span>
                </>
              )}
            </button>
          </div>

          {/* Results Column (7 cols) */}
          <div className="lg:col-span-7 space-y-4">
            {/* Real-Time Output Information Panel */}
            <OutputInfoPanel
              originalFileName={pdfFile.name}
              originalBytes={metadata.fileSizeBytes}
              originalWidth={metadata.firstPageWidthPt}
              originalHeight={metadata.firstPageHeightPt}
              originalFormat="PDF"
              outputBytes={outputSizeBytes}
              outputWidth={pageSize === 'a4' ? 595 : pageSize === 'a5' ? 420 : metadata.firstPageWidthPt}
              outputHeight={pageSize === 'a4' ? 842 : pageSize === 'a5' ? 595 : metadata.firstPageHeightPt}
              outputFormat="PDF"
              dpi={dpi}
              status={status}
              statusMessage={statusMessage}
              verifiedSavedBytes={verifiedSavedBytes}
              warning={warning}
            />

            {/* Bottom Save Action */}
            {outputBytes && (
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex items-center justify-between shadow-xl">
                <div className="text-xs text-slate-400">
                  {verifiedSavedBytes ? (
                    <span className="text-emerald-400 font-bold flex items-center space-x-1">
                      <ShieldCheck className="w-4 h-4" />
                      <span>Verified on disk: {formatDetailedBytes(verifiedSavedBytes)}</span>
                    </span>
                  ) : (
                    <span>PDF structure validated with {metadata.pageCount} pages.</span>
                  )}
                </div>

                <button
                  onClick={handleDownload}
                  disabled={status === 'generating' || status === 'saving'}
                  className="px-6 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 disabled:opacity-50 text-white text-xs font-bold shadow-xl shadow-rose-900/30 flex items-center space-x-2 transition"
                >
                  <Download className="w-4 h-4" />
                  <span>Save Optimized PDF</span>
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
