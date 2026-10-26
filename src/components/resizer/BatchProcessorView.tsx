import React, { useState, useRef } from 'react';
import {
  Upload,
  Download,
  Trash2,
  Play,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  RefreshCw,
  Layers,
  Sparkles,
  Zap
} from 'lucide-react';
import { BatchItem, ExamPreset, ResizeUnit, ImageFormat } from '../../types';
import { getAllPresets } from '../../services/presetStorageService';
import {
  calculatePixelDimensions,
  resizeImageToCanvas,
  exportCanvasToFormat,
  setJpegDpiMetadata,
  getDataUrlByteSize,
  formatFileSize
} from '../../services/imageResizerEngine';
import { compressImageToTargetKb } from '../../services/photoCompressorEngine';
import { saveOrDownloadFile } from '../../services/exportHelper';

interface BatchProcessorViewProps {
  onNotify?: (msg: string) => void;
}

export const BatchProcessorView: React.FC<BatchProcessorViewProps> = ({ onNotify }) => {
  const [items, setItems] = useState<BatchItem[]>([]);
  const [batchAction, setBatchAction] = useState<'preset' | 'target-kb' | 'dimensions'>('preset');
  const [selectedPresetId, setSelectedPresetId] = useState<string>('ibps-photo');
  const [targetKb, setTargetKb] = useState<number>(50);
  const [customW, setCustomW] = useState<number>(300);
  const [customH, setCustomH] = useState<number>(400);
  const [format, setFormat] = useState<ImageFormat>('jpg');

  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [progress, setProgress] = useState<number>(0);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const allPresets = getAllPresets();

  const handleFiles = (files: FileList | null) => {
    if (!files || files.length === 0) return;

    const fileList = Array.from(files).filter((f) => f.type.startsWith('image/'));
    if (fileList.length === 0) {
      onNotify?.('Please select valid image files.');
      return;
    }

    let loaded = 0;
    const newItems: BatchItem[] = [];

    fileList.forEach((file) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const dataUrl = e.target?.result as string;
        const img = new Image();
        img.onload = () => {
          newItems.push({
            id: `batch-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
            file,
            name: file.name,
            type: file.type,
            originalSizeKB: Math.round((file.size / 1024) * 10) / 10,
            originalWidth: img.width,
            originalHeight: img.height,
            format: 'jpg',
            status: 'pending',
          });
          loaded++;
          if (loaded === fileList.length) {
            setItems((prev) => [...prev, ...newItems]);
            onNotify?.(`Loaded ${fileList.length} files to batch queue.`);
          }
        };
        img.src = dataUrl;
      };
      reader.readAsDataURL(file);
    });
  };

  const handleClearAll = () => {
    setItems([]);
    setProgress(0);
  };

  const handleRemove = (id: string) => {
    setItems(items.filter((it) => it.id !== id));
  };

  const handleProcessAll = async () => {
    if (items.length === 0 || isProcessing) return;
    setIsProcessing(true);
    setProgress(0);

    const updated = [...items];
    const preset = allPresets.find((p) => p.id === selectedPresetId);

    for (let i = 0; i < updated.length; i++) {
      const item = updated[i];
      item.status = 'processing';
      setItems([...updated]);

      try {
        // Read image
        const img = await new Promise<HTMLImageElement>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = (ev) => {
            const image = new Image();
            image.onload = () => resolve(image);
            image.onerror = reject;
            image.src = ev.target?.result as string;
          };
          reader.onerror = reject;
          reader.readAsDataURL(item.file);
        });

        let outDataUrl = '';
        let outW = item.originalWidth;
        let outH = item.originalHeight;

        if (batchAction === 'preset' && preset) {
          const dims = calculatePixelDimensions(
            preset.width,
            preset.height,
            preset.unit,
            preset.dpi || 300,
            img.width,
            img.height
          );
          outW = dims.widthPx;
          outH = dims.heightPx;

          const canvas = resizeImageToCanvas(img, outW, outH);
          if (preset.maxKB) {
            const compRes = await compressImageToTargetKb({
              sourceImage: canvas,
              targetKb: preset.maxKB,
              format,
              dpi: preset.dpi || 300,
            });
            outDataUrl = compRes.dataUrl;
          } else {
            outDataUrl = exportCanvasToFormat(canvas, format, 0.9);
            outDataUrl = setJpegDpiMetadata(outDataUrl, preset.dpi || 300);
          }
        } else if (batchAction === 'target-kb') {
          const compRes = await compressImageToTargetKb({
            sourceImage: img,
            targetKb,
            format,
          });
          outDataUrl = compRes.dataUrl;
          outW = compRes.appliedWidth;
          outH = compRes.appliedHeight;
        } else {
          // Custom dimensions
          outW = customW;
          outH = customH;
          const canvas = resizeImageToCanvas(img, outW, outH);
          outDataUrl = exportCanvasToFormat(canvas, format, 0.9);
        }

        const outBytes = getDataUrlByteSize(outDataUrl);
        item.outputDataUrl = outDataUrl;
        item.outputWidth = outW;
        item.outputHeight = outH;
        item.outputSizeKB = Math.round((outBytes / 1024) * 10) / 10;
        item.status = 'completed';
      } catch (err: any) {
        console.error(`Batch item error [${item.name}]:`, err);
        item.status = 'failed';
        item.error = err.message || 'Processing failed';
      }

      setProgress(Math.round(((i + 1) / updated.length) * 100));
      setItems([...updated]);
    }

    setIsProcessing(false);
    onNotify?.('Batch processing complete!');
  };

  const handleDownloadItem = async (item: BatchItem) => {
    if (!item.outputDataUrl) return;
    const baseName = item.name.replace(/\.[^/.]+$/, '');
    const outName = `${baseName}_processed.${format === 'jpeg' ? 'jpg' : format}`;
    await saveOrDownloadFile({
      dataUrl: item.outputDataUrl,
      defaultName: outName,
      format: format === 'jpeg' ? 'jpg' : format as any,
    });
  };

  const handleDownloadAll = async () => {
    for (const item of items) {
      if (item.status === 'completed' && item.outputDataUrl) {
        await handleDownloadItem(item);
        // Small interval between downloads
        await new Promise((r) => setTimeout(r, 200));
      }
    }
  };

  return (
    <div className="flex-1 flex flex-col p-6 overflow-y-auto space-y-6">
      {/* Top Banner */}
      <div className="flex items-center justify-between pb-4 border-b border-slate-800">
        <div>
          <h2 className="text-xl font-black text-white flex items-center space-x-2">
            <Layers className="w-5 h-5 text-purple-400" />
            <span>Batch Processing Queue</span>
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Process multiple candidate photos or documents at once with an exam preset, target KB, or dimensions.
          </p>
        </div>

        {items.length > 0 && (
          <div className="flex items-center space-x-2">
            <button
              onClick={() => fileInputRef.current?.click()}
              className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition"
            >
              Add Files
            </button>
            <button
              onClick={handleProcessAll}
              disabled={isProcessing}
              className="px-4 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white text-xs font-bold shadow-lg shadow-purple-900/30 flex items-center space-x-2 transition"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>{isProcessing ? `Processing (${progress}%)` : 'Process All Queue'}</span>
            </button>
          </div>
        )}
      </div>

      <input
        type="file"
        ref={fileInputRef}
        onChange={(e) => handleFiles(e.target.files)}
        accept="image/*"
        multiple
        className="hidden"
      />

      {items.length === 0 ? (
        /* Empty Upload Area */
        <div
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault();
            handleFiles(e.dataTransfer.files);
          }}
          onClick={() => fileInputRef.current?.click()}
          className="flex-1 min-h-[380px] border-2 border-dashed border-slate-700/80 hover:border-purple-500/80 bg-slate-900/50 hover:bg-slate-900/80 rounded-3xl p-8 flex flex-col items-center justify-center text-center cursor-pointer transition-all duration-300 group"
        >
          <div className="w-16 h-16 rounded-3xl bg-purple-600/10 border border-purple-500/20 flex items-center justify-center text-purple-400 mb-4 group-hover:scale-110 transition-transform">
            <Upload className="w-8 h-8" />
          </div>
          <h3 className="text-lg font-bold text-white mb-1">Select Multiple Photos for Batch Processing</h3>
          <p className="text-xs text-slate-400 max-w-sm mb-4">
            Upload multiple photos (e.g. Student1.jpg, Student2.jpg) and apply the same government preset or file size.
          </p>
          <span className="px-4 py-2 rounded-xl bg-purple-600 text-white text-xs font-bold shadow-md shadow-purple-900/40">
            Select Batch Files
          </span>
        </div>
      ) : (
        /* Batch Queue Workspace */
        <div className="space-y-4">
          {/* Global Batch Controls Bar */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
            <div className="md:col-span-3">
              <label className="text-[11px] font-semibold text-slate-400 block mb-1">Action Mode</label>
              <select
                value={batchAction}
                onChange={(e) => setBatchAction(e.target.value as any)}
                className="w-full bg-slate-950 border border-slate-700/80 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-purple-500"
              >
                <option value="preset">Apply Government Exam Preset</option>
                <option value="target-kb">Compress All to Target KB</option>
                <option value="dimensions">Resize All to Fixed Pixels</option>
              </select>
            </div>

            <div className="md:col-span-5">
              {batchAction === 'preset' ? (
                <div>
                  <label className="text-[11px] font-semibold text-slate-400 block mb-1">Choose Exam Preset</label>
                  <select
                    value={selectedPresetId}
                    onChange={(e) => setSelectedPresetId(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700/80 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-purple-500"
                  >
                    {allPresets.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} ({p.width}×{p.height}{p.unit})
                      </option>
                    ))}
                  </select>
                </div>
              ) : batchAction === 'target-kb' ? (
                <div>
                  <label className="text-[11px] font-semibold text-slate-400 block mb-1">Target Size (KB)</label>
                  <input
                    type="number"
                    min="10"
                    max="5000"
                    value={targetKb}
                    onChange={(e) => setTargetKb(parseInt(e.target.value, 10) || 50)}
                    className="w-full bg-slate-950 border border-slate-700/80 rounded-xl px-3 py-1.5 text-xs text-white font-mono"
                  />
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[11px] font-semibold text-slate-400 block mb-1">Width (px)</label>
                    <input
                      type="number"
                      value={customW}
                      onChange={(e) => setCustomW(parseInt(e.target.value, 10) || 300)}
                      className="w-full bg-slate-950 border border-slate-700/80 rounded-xl px-3 py-1.5 text-xs text-white font-mono"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-semibold text-slate-400 block mb-1">Height (px)</label>
                    <input
                      type="number"
                      value={customH}
                      onChange={(e) => setCustomH(parseInt(e.target.value, 10) || 400)}
                      className="w-full bg-slate-950 border border-slate-700/80 rounded-xl px-3 py-1.5 text-xs text-white font-mono"
                    />
                  </div>
                </div>
              )}
            </div>

            <div className="md:col-span-2">
              <label className="text-[11px] font-semibold text-slate-400 block mb-1">Format</label>
              <select
                value={format}
                onChange={(e) => setFormat(e.target.value as any)}
                className="w-full bg-slate-950 border border-slate-700/80 rounded-xl px-3 py-1.5 text-xs text-white"
              >
                <option value="jpg">JPG</option>
                <option value="png">PNG</option>
                <option value="webp">WEBP</option>
              </select>
            </div>

            <div className="md:col-span-2 flex items-end justify-end space-x-2">
              <button
                onClick={handleDownloadAll}
                className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition"
                title="Save All Completed Files"
              >
                Download All
              </button>
            </div>
          </div>

          {/* Progress Bar when running */}
          {isProcessing && (
            <div className="w-full bg-slate-950 rounded-full h-2.5 overflow-hidden border border-slate-800">
              <div
                className="bg-purple-600 h-2.5 transition-all duration-200"
                style={{ width: `${progress}%` }}
              />
            </div>
          )}

          {/* Queue Table */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
            <div className="px-5 py-3 border-b border-slate-800 flex items-center justify-between text-xs font-bold text-slate-400">
              <span>Queue Items ({items.length})</span>
              <button
                onClick={handleClearAll}
                className="text-slate-500 hover:text-rose-400 transition"
              >
                Clear Queue
              </button>
            </div>

            <div className="divide-y divide-slate-800/80 max-h-[460px] overflow-y-auto">
              {items.map((it) => (
                <div key={it.id} className="p-4 flex items-center justify-between space-x-4 hover:bg-slate-850/50 transition">
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-bold text-white truncate">{it.name}</div>
                    <div className="text-[11px] text-slate-400 font-mono mt-0.5">
                      Original: {it.originalWidth}×{it.originalHeight} px ({it.originalSizeKB} KB)
                    </div>
                  </div>

                  {/* Output details */}
                  <div className="text-right font-mono text-xs">
                    {it.outputSizeKB ? (
                      <div>
                        <span className="text-emerald-400 font-bold">{it.outputSizeKB} KB</span>
                        <div className="text-[10px] text-slate-400">
                          {it.outputWidth}×{it.outputHeight} px
                        </div>
                      </div>
                    ) : (
                      <span className="text-slate-600">—</span>
                    )}
                  </div>

                  {/* Status Badge */}
                  <div className="w-24 text-center">
                    {it.status === 'completed' && (
                      <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 text-[10px] font-bold">
                        <CheckCircle2 className="w-3 h-3" />
                        <span>Ready</span>
                      </span>
                    )}
                    {it.status === 'processing' && (
                      <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full bg-purple-500/10 text-purple-400 text-[10px] font-bold">
                        <RefreshCw className="w-3 h-3 animate-spin" />
                        <span>Working</span>
                      </span>
                    )}
                    {it.status === 'pending' && (
                      <span className="px-2.5 py-0.5 rounded-full bg-slate-800 text-slate-400 text-[10px] font-semibold">
                        Queued
                      </span>
                    )}
                    {it.status === 'failed' && (
                      <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full bg-rose-500/10 text-rose-400 text-[10px] font-bold">
                        <XCircle className="w-3 h-3" />
                        <span>Failed</span>
                      </span>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex items-center space-x-1">
                    {it.outputDataUrl && (
                      <button
                        onClick={() => handleDownloadItem(it)}
                        className="p-1.5 rounded-lg bg-emerald-600/20 hover:bg-emerald-600 text-emerald-300 hover:text-white transition"
                        title="Download Output"
                      >
                        <Download className="w-3.5 h-3.5" />
                      </button>
                    )}
                    <button
                      onClick={() => handleRemove(it.id)}
                      className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-500 hover:text-rose-400 transition"
                      title="Remove"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
