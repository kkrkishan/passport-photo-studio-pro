import React, { useState, useEffect, useRef } from 'react';
import {
  Upload,
  Lock,
  Unlock,
  Maximize2,
  Download,
  AlertTriangle,
  Sparkles,
  RefreshCw,
  Image as ImageIcon
} from 'lucide-react';
import { ResizeUnit, ImageFormat, DpiMode } from '../../types';
import {
  calculatePixelDimensions,
  convertUnitValue,
  checkAspectRatioDistortion,
  resizeImageToCanvas,
  exportCanvasToFormat,
  setJpegDpiMetadata,
  setPngDpiMetadata,
  getDataUrlByteSize,
  formatFileSize
} from '../../services/imageResizerEngine';
import { BeforeAfterPreview } from './BeforeAfterPreview';
import { saveOrDownloadFile } from '../../services/exportHelper';

interface PhotoResizerViewProps {
  initialImage?: {
    dataUrl: string;
    name: string;
    width: number;
    height: number;
    sizeBytes: number;
  } | null;
  onNotify?: (msg: string) => void;
}

export const PhotoResizerView: React.FC<PhotoResizerViewProps> = ({ initialImage, onNotify }) => {
  // Image State
  const [fileDataUrl, setFileDataUrl] = useState<string | null>(initialImage?.dataUrl || null);
  const [fileName, setFileName] = useState<string>(initialImage?.name || 'photo.jpg');
  const [origW, setOrigW] = useState<number>(initialImage?.width || 0);
  const [origH, setOrigH] = useState<number>(initialImage?.height || 0);
  const [origBytes, setOrigBytes] = useState<number>(initialImage?.sizeBytes || 0);

  // Resize Controls
  const [unit, setUnit] = useState<ResizeUnit>('px');
  const [width, setWidth] = useState<number>(0);
  const [height, setHeight] = useState<number>(0);
  const [lockAspect, setLockAspect] = useState<boolean>(true);
  const [dpi, setDpi] = useState<number>(300);
  const [dpiMode, setDpiMode] = useState<DpiMode>('metadata');
  const [format, setFormat] = useState<ImageFormat>('jpg');
  const [quality, setQuality] = useState<number>(0.92);

  // Result state
  const [outputDataUrl, setOutputDataUrl] = useState<string>('');
  const [outputW, setOutputW] = useState<number>(0);
  const [outputH, setOutputH] = useState<number>(0);
  const [outputBytes, setOutputBytes] = useState<number>(0);
  const [warning, setWarning] = useState<string | undefined>();
  const [isProcessing, setIsProcessing] = useState<boolean>(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageElementRef = useRef<HTMLImageElement | null>(null);

  // Load image when initialImage changes
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

      // Default resize dimensions
      setWidth(img.width);
      setHeight(img.height);
      setUnit('px');
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

  // Synchronize proportional dimension change when aspect ratio is locked
  const handleWidthChange = (val: number) => {
    setWidth(val);
    if (lockAspect && origW > 0 && origH > 0) {
      const ratio = origH / origW;
      setHeight(Math.round(val * ratio * 100) / 100);
    }
  };

  const handleHeightChange = (val: number) => {
    setHeight(val);
    if (lockAspect && origW > 0 && origH > 0) {
      const ratio = origW / origH;
      setWidth(Math.round(val * ratio * 100) / 100);
    }
  };

  // Handle unit switch and preserve dimensions
  const handleUnitChange = (newUnit: ResizeUnit) => {
    if (unit === newUnit) return;
    const newW = convertUnitValue({ value: width, fromUnit: unit, toUnit: newUnit, dpi, originalDimensionPx: origW });
    const newH = convertUnitValue({ value: height, fromUnit: unit, toUnit: newUnit, dpi, originalDimensionPx: origH });
    setUnit(newUnit);
    setWidth(newW);
    setHeight(newH);
  };

  // Quick percentage presets
  const handlePercentagePreset = (pct: number) => {
    setUnit('px');
    const newW = Math.max(1, Math.round((pct / 100) * origW));
    const newH = Math.max(1, Math.round((pct / 100) * origH));
    setWidth(newW);
    setHeight(newH);
  };

  // Process resize
  useEffect(() => {
    if (!fileDataUrl || !imageElementRef.current || width <= 0 || height <= 0) return;

    const timer = setTimeout(() => {
      processResize();
    }, 150);

    return () => clearTimeout(timer);
  }, [fileDataUrl, width, height, unit, lockAspect, dpi, dpiMode, format, quality]);

  const processResize = () => {
    if (!imageElementRef.current) return;
    setIsProcessing(true);

    try {
      // 1. Calculate target pixel dimensions
      let { widthPx, heightPx } = calculatePixelDimensions(width, height, unit, dpi, origW, origH);

      // Check aspect ratio distortion
      const distortion = checkAspectRatioDistortion(origW, origH, widthPx, heightPx);
      if (distortion.isDistorted && !lockAspect) {
        setWarning(`Aspect ratio distorted by ${distortion.diffPercent}%. Image may appear squished or stretched.`);
      } else {
        setWarning(undefined);
      }

      // If Mode A (DPI metadata only) and unit is px and same dimensions, no canvas resampling is needed!
      let resultDataUrl = '';
      if (dpiMode === 'metadata' && widthPx === origW && heightPx === origH && (format === 'jpg' || format === 'jpeg')) {
        resultDataUrl = setJpegDpiMetadata(fileDataUrl!, dpi);
      } else {
        // Standard resampling
        const canvas = resizeImageToCanvas(imageElementRef.current, widthPx, heightPx);
        resultDataUrl = exportCanvasToFormat(canvas, format, quality);

        // Inject DPI metadata
        if (format === 'jpg' || format === 'jpeg') {
          resultDataUrl = setJpegDpiMetadata(resultDataUrl, dpi);
        } else if (format === 'png') {
          resultDataUrl = setPngDpiMetadata(resultDataUrl, dpi);
        }
      }

      setOutputDataUrl(resultDataUrl);
      setOutputW(widthPx);
      setOutputH(heightPx);
      setOutputBytes(getDataUrlByteSize(resultDataUrl));
    } catch (err: any) {
      console.error('Resize error:', err);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDownload = async () => {
    if (!outputDataUrl) return;
    const baseName = fileName.replace(/\.[^/.]+$/, '');
    const outName = `${baseName}_resized_${outputW}x${outputH}.${format === 'jpeg' ? 'jpg' : format}`;
    const res = await saveOrDownloadFile({
      dataUrl: outputDataUrl,
      defaultName: outName,
      format: format === 'jpeg' ? 'jpg' : format as any,
    });
    if (res.success) {
      onNotify?.(`Saved successfully: ${outName}`);
    }
  };

  return (
    <div className="flex-1 flex flex-col p-6 overflow-y-auto space-y-6">
      {/* Top Banner */}
      <div className="flex items-center justify-between pb-4 border-b border-slate-800">
        <div>
          <h2 className="text-xl font-black text-white flex items-center space-x-2">
            <Maximize2 className="w-5 h-5 text-blue-400" />
            <span>Photo Resizer & Dimension Controller</span>
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Resize photos by Pixels, Millimeters, Centimeters, Inches or Percentage with DPI calibration.
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
              className="px-4 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow-lg shadow-blue-900/30 flex items-center space-x-2 transition"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Save Resized Photo</span>
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
          className="flex-1 min-h-[380px] border-2 border-dashed border-slate-700/80 hover:border-blue-500/80 bg-slate-900/50 hover:bg-slate-900/80 rounded-3xl p-8 flex flex-col items-center justify-center text-center cursor-pointer transition-all duration-300 group"
        >
          <div className="w-16 h-16 rounded-3xl bg-blue-600/10 border border-blue-500/20 flex items-center justify-center text-blue-400 mb-4 group-hover:scale-110 transition-transform">
            <Upload className="w-8 h-8" />
          </div>
          <h3 className="text-lg font-bold text-white mb-1">Choose Photo or Drag & Drop</h3>
          <p className="text-xs text-slate-400 max-w-sm mb-4">
            Supports JPG, JPEG, PNG, WEBP, and BMP images up to high-resolution offline photos.
          </p>
          <span className="px-4 py-2 rounded-xl bg-blue-600 text-white text-xs font-bold shadow-md shadow-blue-900/40">
            Select Photo from PC
          </span>
        </div>
      ) : (
        /* Workspace Grid */
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Controls Column (5 cols) */}
          <div className="lg:col-span-5 space-y-4">
            {/* Dimensions Card */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-300 uppercase tracking-wider">Dimensions & Units</span>
                <div className="flex items-center space-x-1">
                  {(['px', 'mm', 'cm', 'inch', 'percent'] as ResizeUnit[]).map((u) => (
                    <button
                      key={u}
                      onClick={() => handleUnitChange(u)}
                      className={`px-2 py-0.5 rounded text-[11px] font-semibold uppercase transition ${
                        unit === u ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white hover:bg-slate-800'
                      }`}
                    >
                      {u === 'percent' ? '%' : u}
                    </button>
                  ))}
                </div>
              </div>

              {/* Inputs */}
              <div className="grid grid-cols-2 gap-3 items-center">
                <div>
                  <label className="text-[11px] font-semibold text-slate-400 block mb-1">
                    Width ({unit})
                  </label>
                  <input
                    type="number"
                    step={unit === 'px' || unit === 'percent' ? '1' : '0.1'}
                    value={width}
                    onChange={(e) => handleWidthChange(parseFloat(e.target.value) || 0)}
                    className="w-full bg-slate-950 border border-slate-700/80 rounded-xl px-3 py-2 text-sm text-white font-mono focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-semibold text-slate-400 block mb-1">
                    Height ({unit})
                  </label>
                  <input
                    type="number"
                    step={unit === 'px' || unit === 'percent' ? '1' : '0.1'}
                    value={height}
                    onChange={(e) => handleHeightChange(parseFloat(e.target.value) || 0)}
                    className="w-full bg-slate-950 border border-slate-700/80 rounded-xl px-3 py-2 text-sm text-white font-mono focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              {/* Aspect Ratio Lock Toggle */}
              <div className="flex items-center justify-between pt-2 border-t border-slate-800/80">
                <button
                  onClick={() => setLockAspect(!lockAspect)}
                  className={`flex items-center space-x-2 text-xs font-semibold transition ${
                    lockAspect ? 'text-blue-400' : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {lockAspect ? <Lock className="w-3.5 h-3.5" /> : <Unlock className="w-3.5 h-3.5" />}
                  <span>{lockAspect ? 'Aspect Ratio Locked (Proportional)' : 'Aspect Ratio Unlocked (Free)'}</span>
                </button>

                {origW > 0 && (
                  <span className="text-[11px] text-slate-500 font-mono">
                    Orig: {origW}×{origH} px
                  </span>
                )}
              </div>

              {/* Quick Percentage Presets */}
              <div className="pt-2 border-t border-slate-800/80">
                <span className="text-[11px] font-semibold text-slate-400 block mb-2">Quick Scale Presets</span>
                <div className="grid grid-cols-4 gap-2">
                  {[100, 75, 50, 25].map((pct) => (
                    <button
                      key={pct}
                      onClick={() => handlePercentagePreset(pct)}
                      className="py-1 rounded-lg bg-slate-800 hover:bg-slate-750 border border-slate-700/60 text-xs font-semibold text-slate-300 hover:text-white transition text-center"
                    >
                      {pct}%
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* DPI Configuration Card */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-300 uppercase tracking-wider">DPI / Print Density</span>
                <span className="text-xs font-mono font-bold text-blue-400">{dpi} DPI</span>
              </div>

              {/* DPI Mode Selection */}
              <div className="grid grid-cols-2 gap-2 p-1 bg-slate-950 rounded-xl border border-slate-800">
                <button
                  onClick={() => setDpiMode('metadata')}
                  className={`py-1.5 px-2 rounded-lg text-xs font-semibold text-center transition ${
                    dpiMode === 'metadata'
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <div>Mode A: Metadata Only</div>
                  <div className="text-[9px] font-normal opacity-80">No pixel loss / zero recompress</div>
                </button>
                <button
                  onClick={() => setDpiMode('resample')}
                  className={`py-1.5 px-2 rounded-lg text-xs font-semibold text-center transition ${
                    dpiMode === 'resample'
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <div>Mode B: Resample Image</div>
                  <div className="text-[9px] font-normal opacity-80">Recalculate physical pixels</div>
                </button>
              </div>

              {/* DPI Presets */}
              <div className="flex flex-wrap gap-1.5">
                {[72, 96, 150, 200, 300, 600].map((d) => (
                  <button
                    key={d}
                    onClick={() => setDpi(d)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-mono font-medium transition ${
                      dpi === d
                        ? 'bg-blue-600 text-white font-bold'
                        : 'bg-slate-800 hover:bg-slate-750 text-slate-300'
                    }`}
                  >
                    {d}
                  </button>
                ))}
              </div>
            </div>

            {/* Export Settings Card */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-3">
              <span className="text-xs font-bold text-slate-300 uppercase tracking-wider">Export Settings</span>

              <div className="grid grid-cols-2 gap-3 items-center">
                <div>
                  <label className="text-[11px] font-semibold text-slate-400 block mb-1">Output Format</label>
                  <select
                    value={format}
                    onChange={(e) => setFormat(e.target.value as ImageFormat)}
                    className="w-full bg-slate-950 border border-slate-700/80 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
                  >
                    <option value="jpg">JPG (Standard Web & Forms)</option>
                    <option value="png">PNG (Lossless & High Quality)</option>
                    <option value="webp">WEBP (Modern Compressed)</option>
                  </select>
                </div>

                <div>
                  <label className="text-[11px] font-semibold text-slate-400 block mb-1">
                    Quality ({Math.round(quality * 100)}%)
                  </label>
                  <input
                    type="range"
                    min="0.4"
                    max="1.0"
                    step="0.02"
                    value={quality}
                    onChange={(e) => setQuality(parseFloat(e.target.value))}
                    className="w-full accent-blue-500"
                  />
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
            />

            {/* Action Card */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex items-center justify-between">
              <div className="text-xs">
                <span className="text-slate-400">Target Output: </span>
                <span className="font-bold text-white">{outputW} × {outputH} px</span>
                <span className="mx-2 text-slate-600">|</span>
                <span className="text-slate-400">Est. Size: </span>
                <span className="font-bold text-emerald-400">{formatFileSize(outputBytes)}</span>
              </div>

              <button
                onClick={handleDownload}
                disabled={isProcessing}
                className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-xs font-bold shadow-xl shadow-blue-900/30 flex items-center space-x-2 transition"
              >
                <Download className="w-4 h-4" />
                <span>Download Resized Photo</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
