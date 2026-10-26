import React, { useState, useEffect, useRef } from 'react';
import {
  Upload,
  Download,
  AlertTriangle,
  RefreshCw,
  Zap,
  Sliders,
  CheckCircle2,
  Minimize2
} from 'lucide-react';
import { ImageFormat } from '../../types';
import {
  compressImageToTargetKb,
  compressImageWithFixedQuality
} from '../../services/photoCompressorEngine';
import {
  getDataUrlByteSize,
  formatFileSize
} from '../../services/imageResizerEngine';
import { BeforeAfterPreview } from './BeforeAfterPreview';
import { saveOrDownloadFile } from '../../services/exportHelper';

interface PhotoCompressorViewProps {
  initialImage?: {
    dataUrl: string;
    name: string;
    width: number;
    height: number;
    sizeBytes: number;
  } | null;
  onNotify?: (msg: string) => void;
}

export const PhotoCompressorView: React.FC<PhotoCompressorViewProps> = ({ initialImage, onNotify }) => {
  const [fileDataUrl, setFileDataUrl] = useState<string | null>(initialImage?.dataUrl || null);
  const [fileName, setFileName] = useState<string>(initialImage?.name || 'photo.jpg');
  const [origW, setOrigW] = useState<number>(initialImage?.width || 0);
  const [origH, setOrigH] = useState<number>(initialImage?.height || 0);
  const [origBytes, setOrigBytes] = useState<number>(initialImage?.sizeBytes || 0);

  // Compression mode: 'target-kb' or 'manual-quality'
  const [compressMode, setCompressMode] = useState<'target-kb' | 'manual-quality'>('target-kb');
  const [targetKb, setTargetKb] = useState<number>(50);
  const [customKb, setCustomKb] = useState<string>('50');
  const [quality, setQuality] = useState<number>(0.85);
  const [format, setFormat] = useState<ImageFormat>('jpg');
  const [bgColor, setBgColor] = useState<string>('#ffffff');
  const [allowDownscale, setAllowDownscale] = useState<boolean>(true);

  // Results
  const [outputDataUrl, setOutputDataUrl] = useState<string>('');
  const [outputBytes, setOutputBytes] = useState<number>(0);
  const [outputW, setOutputW] = useState<number>(0);
  const [outputH, setOutputH] = useState<number>(0);
  const [achievedQuality, setAchievedQuality] = useState<number>(0.85);
  const [warning, setWarning] = useState<string | undefined>();
  const [isProcessing, setIsProcessing] = useState<boolean>(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageElementRef = useRef<HTMLImageElement | null>(null);

  useEffect(() => {
    if (initialImage) {
      loadImageData(initialImage.dataUrl, initialImage.name);
    }
  }, [initialImage]);

  const loadImageData = (dataUrl: string, name: string) => {
    const img = new Image();
    img.onload = () => {
      imageElementRef.current = img;
      setFileDataUrl(dataUrl);
      setFileName(name);
      setOrigW(img.width);
      setOrigH(img.height);
      const bytes = getDataUrlByteSize(dataUrl);
      setOrigBytes(bytes);
    };
    img.src = dataUrl;
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      onNotify?.('Please select a valid image file (JPG, PNG, WEBP, BMP).');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      loadImageData(dataUrl, file.name);
    };
    reader.readAsDataURL(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file && file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const dataUrl = event.target?.result as string;
        loadImageData(dataUrl, file.name);
      };
      reader.readAsDataURL(file);
    }
  };

  // Re-run compression when parameters change
  useEffect(() => {
    if (!fileDataUrl || !imageElementRef.current) return;

    const timer = setTimeout(() => {
      runCompression();
    }, 150);

    return () => clearTimeout(timer);
  }, [fileDataUrl, compressMode, targetKb, quality, format, bgColor, allowDownscale]);

  const runCompression = async () => {
    if (!imageElementRef.current) return;
    setIsProcessing(true);

    try {
      if (compressMode === 'target-kb') {
        const res = await compressImageToTargetKb({
          sourceImage: imageElementRef.current,
          targetKb,
          format,
          backgroundColor: bgColor,
          allowDimensionDownscale: allowDownscale,
        });

        setOutputDataUrl(res.dataUrl);
        setOutputBytes(res.actualBytes);
        setOutputW(res.appliedWidth);
        setOutputH(res.appliedHeight);
        setAchievedQuality(res.quality);
        setWarning(res.warning);
      } else {
        const res = await compressImageWithFixedQuality({
          sourceImage: imageElementRef.current,
          quality,
          format,
          backgroundColor: bgColor,
        });

        setOutputDataUrl(res.dataUrl);
        setOutputBytes(res.actualBytes);
        setOutputW(origW);
        setOutputH(origH);
        setAchievedQuality(quality);
        setWarning(undefined);
      }
    } catch (err: any) {
      console.error('Compression error:', err);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDownload = async () => {
    if (!outputDataUrl) return;
    const baseName = fileName.replace(/\.[^/.]+$/, '');
    const outName = `${baseName}_compressed_${Math.round(outputBytes / 1024)}KB.${format === 'jpeg' ? 'jpg' : format}`;
    const res = await saveOrDownloadFile({
      dataUrl: outputDataUrl,
      defaultName: outName,
      format: format === 'jpeg' ? 'jpg' : format as any,
    });
    if (res.success) {
      onNotify?.(`Saved successfully: ${outName}`);
    }
  };

  const TARGET_KB_PRESETS = [10, 20, 30, 50, 100, 200, 500, 1000];

  return (
    <div className="flex-1 flex flex-col p-6 overflow-y-auto space-y-6">
      {/* Top Banner */}
      <div className="flex items-center justify-between pb-4 border-b border-slate-800">
        <div>
          <h2 className="text-xl font-black text-white flex items-center space-x-2">
            <Minimize2 className="w-5 h-5 text-emerald-400" />
            <span>Photo Compressor (Target KB & Quality Optimizer)</span>
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Reduce photo file size to exact KB limits for government exams and online portals without ugly pixelation.
          </p>
        </div>

        {fileDataUrl && (
          <div className="flex items-center space-x-2">
            <button
              onClick={() => fileInputRef.current?.click()}
              className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold flex items-center space-x-1.5 transition"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Change Image</span>
            </button>
            <button
              onClick={handleDownload}
              className="px-4 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-lg shadow-emerald-900/30 flex items-center space-x-2 transition"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Save Compressed Photo</span>
            </button>
          </div>
        )}
      </div>

      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileUpload}
        accept="image/jpeg,image/png,image/webp,image/bmp"
        className="hidden"
      />

      {!fileDataUrl ? (
        /* Upload Area */
        <div
          onDragOver={(e) => e.preventDefault()}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className="flex-1 min-h-[380px] border-2 border-dashed border-slate-700/80 hover:border-emerald-500/80 bg-slate-900/50 hover:bg-slate-900/80 rounded-3xl p-8 flex flex-col items-center justify-center text-center cursor-pointer transition-all duration-300 group"
        >
          <div className="w-16 h-16 rounded-3xl bg-emerald-600/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 mb-4 group-hover:scale-110 transition-transform">
            <Upload className="w-8 h-8" />
          </div>
          <h3 className="text-lg font-bold text-white mb-1">Select Photo to Compress</h3>
          <p className="text-xs text-slate-400 max-w-sm mb-4">
            Supports large DSLR, mobile camera, or scanner photos up to 50MB. All compressed offline locally on your device.
          </p>
          <span className="px-4 py-2 rounded-xl bg-emerald-600 text-white text-xs font-bold shadow-md shadow-emerald-900/40">
            Select Photo from PC
          </span>
        </div>
      ) : (
        /* Workspace Grid */
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Controls Column (5 cols) */}
          <div className="lg:col-span-5 space-y-4">
            {/* Mode Switcher */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-3">
              <span className="text-xs font-bold text-slate-300 uppercase tracking-wider">Compression Method</span>
              <div className="grid grid-cols-2 gap-2 p-1 bg-slate-950 rounded-xl border border-slate-800">
                <button
                  onClick={() => setCompressMode('target-kb')}
                  className={`py-2 px-3 rounded-lg text-xs font-semibold flex items-center justify-center space-x-1.5 transition ${
                    compressMode === 'target-kb'
                      ? 'bg-emerald-600 text-white shadow-sm'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <Zap className="w-3.5 h-3.5" />
                  <span>Target File Size (KB)</span>
                </button>
                <button
                  onClick={() => setCompressMode('manual-quality')}
                  className={`py-2 px-3 rounded-lg text-xs font-semibold flex items-center justify-center space-x-1.5 transition ${
                    compressMode === 'manual-quality'
                      ? 'bg-emerald-600 text-white shadow-sm'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <Sliders className="w-3.5 h-3.5" />
                  <span>Manual Quality (%)</span>
                </button>
              </div>
            </div>

            {/* Target Size Controls */}
            {compressMode === 'target-kb' ? (
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-300 uppercase tracking-wider">Target Size</span>
                  <span className="text-xs font-mono font-bold text-emerald-400">{targetKb} KB</span>
                </div>

                {/* Preset Chips */}
                <div className="grid grid-cols-4 gap-2">
                  {TARGET_KB_PRESETS.map((kb) => (
                    <button
                      key={kb}
                      onClick={() => {
                        setTargetKb(kb);
                        setCustomKb(kb.toString());
                      }}
                      className={`py-1.5 rounded-lg text-xs font-semibold transition ${
                        targetKb === kb
                          ? 'bg-emerald-600 text-white shadow-sm font-bold'
                          : 'bg-slate-800 hover:bg-slate-750 text-slate-300'
                      }`}
                    >
                      {kb >= 1000 ? `${kb / 1000} MB` : `${kb} KB`}
                    </button>
                  ))}
                </div>

                {/* Custom Input */}
                <div>
                  <label className="text-[11px] font-semibold text-slate-400 block mb-1">
                    Or Enter Custom Target (KB)
                  </label>
                  <div className="flex items-center space-x-2">
                    <input
                      type="number"
                      min="5"
                      max="50000"
                      value={customKb}
                      onChange={(e) => {
                        setCustomKb(e.target.value);
                        const num = parseInt(e.target.value, 10);
                        if (num > 0) setTargetKb(num);
                      }}
                      className="flex-1 bg-slate-950 border border-slate-700/80 rounded-xl px-3 py-2 text-sm text-white font-mono focus:outline-none focus:border-emerald-500"
                    />
                    <span className="text-xs font-bold text-slate-400">KB</span>
                  </div>
                </div>

                {/* Downscale checkbox */}
                <div className="pt-2 border-t border-slate-800/80">
                  <label className="flex items-start space-x-2 text-xs text-slate-300 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={allowDownscale}
                      onChange={(e) => setAllowDownscale(e.target.checked)}
                      className="mt-0.5 rounded border-slate-700 text-emerald-600 focus:ring-0"
                    />
                    <span className="leading-snug">
                      Allow resolution downscaling if target KB cannot be reached with quality reduction alone.
                    </span>
                  </label>
                </div>
              </div>
            ) : (
              /* Manual Quality Controls */
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-300 uppercase tracking-wider">Quality Slider</span>
                  <span className="text-xs font-mono font-bold text-emerald-400">{Math.round(quality * 100)}%</span>
                </div>

                <input
                  type="range"
                  min="0.1"
                  max="1.0"
                  step="0.05"
                  value={quality}
                  onChange={(e) => setQuality(parseFloat(e.target.value))}
                  className="w-full accent-emerald-500"
                />

                <div className="grid grid-cols-4 gap-1.5 pt-2 border-t border-slate-800/80">
                  {[0.95, 0.85, 0.75, 0.60].map((q) => (
                    <button
                      key={q}
                      onClick={() => setQuality(q)}
                      className="py-1 rounded bg-slate-800 hover:bg-slate-750 text-slate-300 text-xs font-medium"
                    >
                      {Math.round(q * 100)}%
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Format & Background Color */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-3">
              <span className="text-xs font-bold text-slate-300 uppercase tracking-wider">Format & Background</span>

              <div className="grid grid-cols-2 gap-3 items-center">
                <div>
                  <label className="text-[11px] font-semibold text-slate-400 block mb-1">Target Format</label>
                  <select
                    value={format}
                    onChange={(e) => setFormat(e.target.value as ImageFormat)}
                    className="w-full bg-slate-950 border border-slate-700/80 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                  >
                    <option value="jpg">JPG (Best Compatibility)</option>
                    <option value="webp">WEBP (Highest Compression)</option>
                    <option value="png">PNG (Lossless)</option>
                  </select>
                </div>

                <div>
                  <label className="text-[11px] font-semibold text-slate-400 block mb-1">Background Fill</label>
                  <div className="flex items-center space-x-2">
                    <input
                      type="color"
                      value={bgColor}
                      onChange={(e) => setBgColor(e.target.value)}
                      className="w-8 h-8 rounded-lg cursor-pointer bg-transparent border-0"
                    />
                    <span className="text-xs font-mono text-slate-300 uppercase">{bgColor}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Preview & Results Column (7 cols) */}
          <div className="lg:col-span-7 space-y-4">
            <BeforeAfterPreview
              originalUrl={fileDataUrl}
              originalWidth={origW}
              originalHeight={origH}
              originalBytes={origBytes}
              processedUrl={outputDataUrl}
              processedWidth={outputW}
              processedHeight={outputH}
              processedBytes={outputBytes}
              warning={warning}
              isWithinTarget={compressMode === 'target-kb' ? outputBytes <= targetKb * 1024 : true}
            />

            {/* Action Bar */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex items-center justify-between">
              <div className="text-xs">
                <span className="text-slate-400">Final File Size: </span>
                <span className="font-bold text-emerald-400 text-sm">{formatFileSize(outputBytes)}</span>
                <span className="mx-2 text-slate-600">|</span>
                <span className="text-slate-400">Quality: </span>
                <span className="font-bold text-white">{Math.round(achievedQuality * 100)}%</span>
              </div>

              <button
                onClick={handleDownload}
                disabled={isProcessing}
                className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-xs font-bold shadow-xl shadow-emerald-900/30 flex items-center space-x-2 transition"
              >
                <Download className="w-4 h-4" />
                <span>Download Compressed Photo</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
