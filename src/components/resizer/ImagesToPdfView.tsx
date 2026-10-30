import React, { useState, useRef } from 'react';
import {
  Upload,
  Download,
  Trash2,
  ArrowUp,
  ArrowDown,
  FileText,
  Images,
  RefreshCw,
  Plus,
  CheckCircle2
} from 'lucide-react';
import { convertImagesToPdf, pdfBytesToDataUrl, ImageToPdfItem } from '../../services/pdfResizerEngine';
import { formatFileSize, getDataUrlByteSize } from '../../services/imageResizerEngine';
import { saveOrDownloadFile } from '../../services/exportHelper';

interface ImagesToPdfViewProps {
  onNotify?: (msg: string) => void;
}

export const ImagesToPdfView: React.FC<ImagesToPdfViewProps> = ({ onNotify }) => {
  const [images, setImages] = useState<ImageToPdfItem[]>([]);
  const [pageSize, setPageSize] = useState<'a4' | 'a5' | 'letter'>('a4');
  const [orientation, setOrientation] = useState<'portrait' | 'landscape'>('portrait');
  const [marginMm, setMarginMm] = useState<number>(10);
  const [quality, setQuality] = useState<number>(0.85);

  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFiles = (files: FileList | null) => {
    if (!files || files.length === 0) return;

    const fileList = Array.from(files).filter((f) => f.type.startsWith('image/'));
    if (fileList.length === 0) {
      onNotify?.('Please select valid image files.');
      return;
    }

    let loadedCount = 0;
    const newItems: ImageToPdfItem[] = [];

    fileList.forEach((file) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const dataUrl = e.target?.result as string;
        const img = new Image();
        img.onload = () => {
          newItems.push({
            dataUrl,
            name: file.name,
            width: img.width,
            height: img.height,
          });
          loadedCount++;
          if (loadedCount === fileList.length) {
            setImages((prev) => [...prev, ...newItems]);
            onNotify?.(`Added ${fileList.length} image(s).`);
          }
        };
        img.src = dataUrl;
      };
      reader.readAsDataURL(file);
    });
  };

  const handleMove = (index: number, direction: 'up' | 'down') => {
    const targetIdx = direction === 'up' ? index - 1 : index + 1;
    if (targetIdx < 0 || targetIdx >= images.length) return;
    const updated = [...images];
    const temp = updated[index];
    updated[index] = updated[targetIdx];
    updated[targetIdx] = temp;
    setImages(updated);
  };

  const handleRemove = (index: number) => {
    setImages(images.filter((_, i) => i !== index));
  };

  const handleClearAll = () => {
    setImages([]);
  };

  const handleGeneratePdf = async () => {
    if (images.length === 0) return;
    setIsGenerating(true);

    try {
      const pdfBytes = await convertImagesToPdf({
        images,
        pageSize,
        orientation,
        marginMm,
        quality,
      });

      const dataUrl = pdfBytesToDataUrl(pdfBytes);
      const outName = `Combined_Document_${Date.now()}.pdf`;

      const res = await saveOrDownloadFile({
        dataUrl,
        defaultName: outName,
        format: 'pdf',
      });

      if (res.success) {
        onNotify?.(`PDF created successfully: ${outName} (${formatFileSize(pdfBytes.byteLength)})`);
      }
    } catch (err: any) {
      console.error('Images to PDF error:', err);
      onNotify?.('Failed to create PDF from images.');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col p-6 overflow-y-auto space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-800">
        <div>
          <h2 className="text-lg sm:text-xl font-black text-white flex items-center space-x-2">
            <Images className="w-5 h-5 text-cyan-400" />
            <span>Images to PDF Converter</span>
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Convert multiple photos, scanned certificates, and marksheet pages into a single organized PDF file.
          </p>
        </div>

        {images.length > 0 && (
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => fileInputRef.current?.click()}
              className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold flex items-center space-x-1.5 transition"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add More Photos</span>
            </button>
            <button
              onClick={handleGeneratePdf}
              disabled={isGenerating}
              className="px-4 py-1.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 text-white text-xs font-bold shadow-lg shadow-cyan-900/30 flex items-center space-x-2 transition"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Generate Combined PDF</span>
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

      {images.length === 0 ? (
        /* Empty Upload State */
        <div
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault();
            handleFiles(e.dataTransfer.files);
          }}
          onClick={() => fileInputRef.current?.click()}
          className="flex-1 min-h-[380px] border-2 border-dashed border-slate-700/80 hover:border-cyan-500/80 bg-slate-900/50 hover:bg-slate-900/80 rounded-3xl p-8 flex flex-col items-center justify-center text-center cursor-pointer transition-all duration-300 group"
        >
          <div className="w-16 h-16 rounded-3xl bg-cyan-600/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400 mb-4 group-hover:scale-110 transition-transform">
            <Upload className="w-8 h-8" />
          </div>
          <h3 className="text-lg font-bold text-white mb-1">Select Multiple Photos or Drag & Drop</h3>
          <p className="text-xs text-slate-400 max-w-sm mb-4">
            Combine multiple JPG, PNG, or WEBP photos into a single PDF document. Rearrange pages easily.
          </p>
          <span className="px-4 py-2 rounded-xl bg-cyan-600 text-white text-xs font-bold shadow-md shadow-cyan-900/40">
            Browse Images
          </span>
        </div>
      ) : (
        /* Workspace */
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Controls Column (4 cols) */}
          <div className="lg:col-span-4 bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <span className="text-xs font-bold text-slate-200">PDF Page Configuration</span>
              <span className="text-xs font-mono text-cyan-400 font-bold">{images.length} pages</span>
            </div>

            <div>
              <label className="text-[11px] font-semibold text-slate-400 block mb-1">Page Format</label>
              <select
                value={pageSize}
                onChange={(e) => setPageSize(e.target.value as any)}
                className="w-full bg-slate-950 border border-slate-700/80 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-500"
              >
                <option value="a4">Standard A4 (210 × 297 mm)</option>
                <option value="a5">A5 (148 × 210 mm)</option>
                <option value="letter">US Letter (8.5 × 11 in)</option>
              </select>
            </div>

            <div>
              <label className="text-[11px] font-semibold text-slate-400 block mb-1">Orientation</label>
              <select
                value={orientation}
                onChange={(e) => setOrientation(e.target.value as any)}
                className="w-full bg-slate-950 border border-slate-700/80 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-500"
              >
                <option value="portrait">Portrait (Vertical)</option>
                <option value="landscape">Landscape (Horizontal)</option>
              </select>
            </div>

            <div>
              <label className="text-[11px] font-semibold text-slate-400 block mb-1">
                Page Margins ({marginMm} mm)
              </label>
              <div className="grid grid-cols-4 gap-1.5">
                {[0, 5, 10, 15].map((m) => (
                  <button
                    key={m}
                    onClick={() => setMarginMm(m)}
                    className={`py-1 rounded-lg text-xs font-medium transition ${
                      marginMm === m
                        ? 'bg-cyan-600 text-white font-bold'
                        : 'bg-slate-800 hover:bg-slate-750 text-slate-300'
                    }`}
                  >
                    {m} mm
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-[11px] font-semibold text-slate-400 block mb-1">
                Compression Quality ({Math.round(quality * 100)}%)
              </label>
              <input
                type="range"
                min="0.4"
                max="1.0"
                step="0.05"
                value={quality}
                onChange={(e) => setQuality(parseFloat(e.target.value))}
                className="w-full accent-cyan-500"
              />
            </div>

            <div className="pt-2 border-t border-slate-800 space-y-2">
              <button
                onClick={handleGeneratePdf}
                disabled={isGenerating}
                className="w-full py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 text-white text-xs font-bold shadow-lg shadow-cyan-900/30 flex items-center justify-center space-x-2 transition"
              >
                <FileText className="w-4 h-4" />
                <span>{isGenerating ? 'Generating PDF...' : 'Download Combined PDF'}</span>
              </button>

              <button
                onClick={handleClearAll}
                className="w-full py-2 rounded-xl bg-slate-800 hover:bg-rose-900/40 text-slate-400 hover:text-rose-300 text-xs font-semibold transition"
              >
                Clear All Images
              </button>
            </div>
          </div>

          {/* Re-orderable List Column (8 cols) */}
          <div className="lg:col-span-8 space-y-3">
            <span className="text-xs font-bold text-slate-300 uppercase tracking-wider block">
              Pages Queue (Drag or use arrows to reorder)
            </span>

            <div className="space-y-2.5 max-h-[500px] overflow-y-auto pr-1">
              {images.map((img, idx) => (
                <div
                  key={idx}
                  className="bg-slate-900 border border-slate-800 hover:border-slate-700 rounded-2xl p-3 flex items-center justify-between space-x-3 transition"
                >
                  <div className="flex items-center space-x-3 min-w-0">
                    <span className="w-6 h-6 rounded-full bg-slate-800 flex items-center justify-center text-[11px] font-mono font-bold text-slate-300 shrink-0">
                      {idx + 1}
                    </span>

                    <img
                      src={img.dataUrl}
                      alt={img.name}
                      className="w-12 h-12 object-cover rounded-lg border border-slate-800 shrink-0"
                    />

                    <div className="min-w-0">
                      <div className="text-xs font-bold text-white truncate max-w-[240px]">{img.name}</div>
                      <div className="text-[11px] text-slate-400 font-mono">
                        {img.width} × {img.height} px • {formatFileSize(getDataUrlByteSize(img.dataUrl))}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center space-x-1 shrink-0">
                    <button
                      onClick={() => handleMove(idx, 'up')}
                      disabled={idx === 0}
                      className="p-1.5 rounded-lg hover:bg-slate-800 disabled:opacity-30 text-slate-400 hover:text-white transition"
                      title="Move Up"
                    >
                      <ArrowUp className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleMove(idx, 'down')}
                      disabled={idx === images.length - 1}
                      className="p-1.5 rounded-lg hover:bg-slate-800 disabled:opacity-30 text-slate-400 hover:text-white transition"
                      title="Move Down"
                    >
                      <ArrowDown className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleRemove(idx)}
                      className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-rose-400 transition"
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
