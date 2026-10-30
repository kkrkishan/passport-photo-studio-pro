import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Upload,
  Lock,
  Unlock,
  Maximize2,
  Download,
  AlertTriangle,
  Sparkles,
  RefreshCw,
  Crop as CropIcon,
  Sliders,
  Check,
  CheckCircle2,
  FileCheck,
  ShieldCheck
} from 'lucide-react';
import { ResizeUnit, ImageFormat, DpiMode } from '../../types';
import {
  calculatePixelDimensions,
  convertUnitValue,
  checkAspectRatioDistortion,
  resizeImageToCanvas,
  resizeImageWithFitMode,
  exportCanvasToFormat,
  setJpegDpiMetadata,
  setPngDpiMetadata,
  getDataUrlByteSize,
  formatFileSize,
  formatDetailedBytes
} from '../../services/imageResizerEngine';
import { BeforeAfterPreview } from './BeforeAfterPreview';
import { ManualCropModal } from './ManualCropModal';
import { OutputInfoPanel, ProcessingStatus } from './OutputInfoPanel';
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
  // Raw uploaded image state (preserved for restore)
  const [rawOriginalDataUrl, setRawOriginalDataUrl] = useState<string | null>(initialImage?.dataUrl || null);
  const [rawW, setRawW] = useState<number>(initialImage?.width || 0);
  const [rawH, setRawH] = useState<number>(initialImage?.height || 0);
  const [rawBytes, setRawBytes] = useState<number>(initialImage?.sizeBytes || 0);

  // Current Working Image State (can be cropped or uncropped)
  const [workingDataUrl, setWorkingDataUrl] = useState<string | null>(initialImage?.dataUrl || null);
  const [fileName, setFileName] = useState<string>(initialImage?.name || 'photo.jpg');
  const [curW, setCurW] = useState<number>(initialImage?.width || 0);
  const [curH, setCurH] = useState<number>(initialImage?.height || 0);
  const [curBytes, setCurBytes] = useState<number>(initialImage?.sizeBytes || 0);
  const [isCropped, setIsCropped] = useState<boolean>(false);

  // Crop Modal State
  const [isCropModalOpen, setIsCropModalOpen] = useState<boolean>(false);

  // Resize Controls
  const [unit, setUnit] = useState<ResizeUnit>('px');
  const [width, setWidth] = useState<number>(0);
  const [height, setHeight] = useState<number>(0);
  const [lockAspect, setLockAspect] = useState<boolean>(true);
  const [fitMode, setFitMode] = useState<'crop-to-fit' | 'fit-padding' | 'stretch'>('crop-to-fit');
  const [bgColor, setBgColor] = useState<string>('#ffffff');
  const [dpi, setDpi] = useState<number>(300);
  const [dpiMode, setDpiMode] = useState<DpiMode>('metadata');
  const [format, setFormat] = useState<ImageFormat>('jpg');

  // Feature 2: 0–100% Quality / Compression Slider (Default 80%)
  const [qualitySlider, setQualitySlider] = useState<number>(80);

  // Processing & Verification Results
  const [outputDataUrl, setOutputDataUrl] = useState<string>('');
  const [outputW, setOutputW] = useState<number>(0);
  const [outputH, setOutputH] = useState<number>(0);
  const [outputBytes, setOutputBytes] = useState<number>(0);
  const [estimatedBytes, setEstimatedBytes] = useState<number | undefined>();
  const [verifiedSavedBytes, setVerifiedSavedBytes] = useState<number | undefined>();
  const [status, setStatus] = useState<ProcessingStatus>('ready');
  const [statusMessage, setStatusMessage] = useState<string | undefined>();
  const [warning, setWarning] = useState<string | undefined>();

  const fileInputRef = useRef<HTMLInputElement>(null);
  const workingImageRef = useRef<HTMLImageElement | null>(null);
  const renderJobIdRef = useRef<number>(0);

  // Load image when initialImage changes
  useEffect(() => {
    if (initialImage) {
      loadImageData(initialImage.dataUrl, initialImage.name);
    }
  }, [initialImage]);

  const loadImageData = (dataUrl: string, name: string) => {
    const img = new Image();
    img.onload = () => {
      workingImageRef.current = img;
      setRawOriginalDataUrl(dataUrl);
      setRawW(img.width);
      setRawH(img.height);

      setWorkingDataUrl(dataUrl);
      setFileName(name);
      setCurW(img.width);
      setCurH(img.height);

      const bytes = getDataUrlByteSize(dataUrl);
      setRawBytes(bytes);
      setCurBytes(bytes);
      setIsCropped(false);

      // Default dimensions match natural pixels
      setWidth(img.width);
      setHeight(img.height);
      setUnit('px');
      setVerifiedSavedBytes(undefined);
      setStatus('ready');
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
    if (lockAspect && curW > 0 && curH > 0) {
      const ratio = curH / curW;
      setHeight(Math.round(val * ratio * 100) / 100);
    }
  };

  const handleHeightChange = (val: number) => {
    setHeight(val);
    if (lockAspect && curW > 0 && curH > 0) {
      const ratio = curW / curH;
      setWidth(Math.round(val * ratio * 100) / 100);
    }
  };

  // Handle unit switch and preserve dimensions
  const handleUnitChange = (newUnit: ResizeUnit) => {
    if (unit === newUnit) return;
    const newW = convertUnitValue({ value: width, fromUnit: unit, toUnit: newUnit, dpi, originalDimensionPx: curW });
    const newH = convertUnitValue({ value: height, fromUnit: unit, toUnit: newUnit, dpi, originalDimensionPx: curH });
    setUnit(newUnit);
    setWidth(newW);
    setHeight(newH);
  };

  // Quick percentage presets
  const handlePercentagePreset = (pct: number) => {
    setUnit('px');
    const newW = Math.max(1, Math.round((pct / 100) * curW));
    const newH = Math.max(1, Math.round((pct / 100) * curH));
    setWidth(newW);
    setHeight(newH);
  };

  // Feature 3: Manual Crop handlers
  const handleApplyManualCrop = (croppedDataUrl: string, croppedW: number, croppedH: number) => {
    const img = new Image();
    img.onload = () => {
      workingImageRef.current = img;
      setWorkingDataUrl(croppedDataUrl);
      setCurW(croppedW);
      setCurH(croppedH);
      const bytes = getDataUrlByteSize(croppedDataUrl);
      setCurBytes(bytes);
      setIsCropped(true);

      // Reset resize fields to cropped dimensions
      setWidth(croppedW);
      setHeight(croppedH);
      setUnit('px');
      setVerifiedSavedBytes(undefined);
      onNotify?.(`Crop applied: ${croppedW} × ${croppedH} px`);
    };
    img.src = croppedDataUrl;
  };

  const handleRestoreOriginal = () => {
    if (!rawOriginalDataUrl) return;
    loadImageData(rawOriginalDataUrl, fileName);
    onNotify?.('Restored original uncropped image.');
  };

  // Feature 4: Dimension preset buttons
  const handleApplyDimensions = () => {
    // triggers re-render via state
    setVerifiedSavedBytes(undefined);
    onNotify?.(`Dimensions applied: ${width} × ${height} ${unit}`);
  };

  const handleResetDimensions = () => {
    setUnit('px');
    setWidth(curW);
    setHeight(curH);
    setLockAspect(true);
    setFitMode('crop-to-fit');
    setVerifiedSavedBytes(undefined);
  };

  // Feature 2 & 5: Live Size Update & Processing with Debounce & Cancellation Token
  useEffect(() => {
    if (!workingDataUrl || !workingImageRef.current || width <= 0 || height <= 0) return;

    setStatus('calculating');
    // Pre-calculate immediate coarse estimate
    const coarseEstimate = Math.round((curBytes * (qualitySlider / 100) * 0.85));
    setEstimatedBytes(Math.max(500, coarseEstimate));

    const jobId = ++renderJobIdRef.current;
    const timer = setTimeout(() => {
      if (jobId === renderJobIdRef.current) {
        processResize(jobId);
      }
    }, 120);

    return () => clearTimeout(timer);
  }, [
    workingDataUrl,
    width,
    height,
    unit,
    lockAspect,
    fitMode,
    bgColor,
    dpi,
    dpiMode,
    format,
    qualitySlider
  ]);

  const processResize = (jobId: number) => {
    if (!workingImageRef.current || jobId !== renderJobIdRef.current) return;
    setStatus('generating');

    try {
      // 1. Calculate target pixel dimensions
      const { widthPx, heightPx } = calculatePixelDimensions(width, height, unit, dpi, curW, curH);

      // Check aspect ratio distortion
      const distortion = checkAspectRatioDistortion(curW, curH, widthPx, heightPx);
      if (distortion.isDistorted && fitMode === 'stretch') {
        setWarning(`Aspect ratio distorted by ${distortion.diffPercent}%. Image appears stretched because 'Stretch' mode is selected.`);
      } else {
        setWarning(undefined);
      }

      // Safe quality mapping (0% -> 0.05 min safe quality; 100% -> 1.0)
      const normalizedQuality = Math.max(0.05, Math.min(1.0, qualitySlider / 100));

      let resultDataUrl = '';
      if (dpiMode === 'metadata' && widthPx === curW && heightPx === curH && (format === 'jpg' || format === 'jpeg')) {
        resultDataUrl = setJpegDpiMetadata(workingDataUrl!, dpi);
      } else {
        // High quality multi-step or fit-mode canvas
        const canvas = resizeImageWithFitMode(workingImageRef.current, widthPx, heightPx, fitMode, bgColor);
        resultDataUrl = exportCanvasToFormat(canvas, format, normalizedQuality, bgColor);

        // Inject DPI metadata
        if (format === 'jpg' || format === 'jpeg') {
          resultDataUrl = setJpegDpiMetadata(resultDataUrl, dpi);
        } else if (format === 'png') {
          resultDataUrl = setPngDpiMetadata(resultDataUrl, dpi);
        }
      }

      // Check if job is still fresh
      if (jobId === renderJobIdRef.current) {
        const bytes = getDataUrlByteSize(resultDataUrl);
        setOutputDataUrl(resultDataUrl);
        setOutputW(widthPx);
        setOutputH(heightPx);
        setOutputBytes(bytes);
        setEstimatedBytes(undefined);
        setStatus('preview-ready');
        setStatusMessage(`Actual byte length: ${bytes.toLocaleString()} bytes`);
      }
    } catch (err: any) {
      console.error('Resize error:', err);
      if (jobId === renderJobIdRef.current) {
        setStatus('failed');
        setStatusMessage(err.message || 'Processing failed');
      }
    }
  };

  // Feature 8: Save Exactly the Previewed Output & Verify Saved Bytes
  const handleDownload = async () => {
    if (!outputDataUrl) return;
    setStatus('saving');

    const baseName = fileName.replace(/\.[^/.]+$/, '');
    const outName = `${baseName}_resized_${outputW}x${outputH}.${format === 'jpeg' ? 'jpg' : format}`;

    const res = await saveOrDownloadFile({
      dataUrl: outputDataUrl,
      defaultName: outName,
      format: format === 'jpeg' ? 'jpg' : format as any,
    });

    if (res.success) {
      const verified = res.verifiedBytes ?? outputBytes;
      setVerifiedSavedBytes(verified);
      setStatus('save-verified');
      setStatusMessage(`Verified on disk: ${formatDetailedBytes(verified)}`);
      onNotify?.(`Saved & Verified successfully: ${outName}`);
    } else if (res.canceled) {
      setStatus('preview-ready');
    } else {
      setStatus('failed');
      setStatusMessage(res.error || 'Failed to save file');
      onNotify?.('Save operation failed. No file written.');
    }
  };

  // Check if aspect ratio mismatch exists
  const hasAspectMismatch = curW > 0 && curH > 0 && width > 0 && height > 0
    ? checkAspectRatioDistortion(curW, curH, width, height).isDistorted
    : false;

  return (
    <div className="flex-1 flex flex-col p-6 overflow-y-auto space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-800">
        <div>
          <h2 className="text-lg sm:text-xl font-black text-white flex items-center space-x-2">
            <Maximize2 className="w-5 h-5 text-blue-400" />
            <span>Photo Resizer & Quality Controller</span>
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Manual Crop, exact dimensions, 0–100% quality slider, real-time actual output size, and verified save.
          </p>
        </div>

        {workingDataUrl && (
          <div className="flex flex-wrap items-center gap-2">
            {/* MANUAL CROP BUTTON (FEATURE 3) */}
            <button
              onClick={() => setIsCropModalOpen(true)}
              className="px-3.5 py-1.5 rounded-xl bg-blue-600/20 hover:bg-blue-600 border border-blue-500/40 text-blue-300 hover:text-white text-xs font-bold flex items-center space-x-1.5 transition shadow-sm"
              title="Open Manual Photo Crop Tool"
            >
              <CropIcon className="w-3.5 h-3.5" />
              <span>MANUAL CROP</span>
            </button>

            {isCropped && (
              <button
                onClick={handleRestoreOriginal}
                className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold flex items-center space-x-1 transition"
                title="Revert to original uncropped photo"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Restore Original</span>
              </button>
            )}

            <button
              onClick={() => fileInputRef.current?.click()}
              className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold flex items-center space-x-1.5 transition"
            >
              <Upload className="w-3.5 h-3.5" />
              <span>Change Image</span>
            </button>

            <button
              onClick={handleDownload}
              disabled={status === 'calculating' || status === 'generating' || status === 'saving'}
              className="px-4 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-xs font-bold shadow-lg shadow-blue-900/30 flex items-center space-x-2 transition"
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

      {!workingDataUrl ? (
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
            {/* FEATURE 2: 0–100% QUALITY / COMPRESSION SLIDER */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-3 shadow-lg">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center space-x-1.5">
                  <Sliders className="w-3.5 h-3.5 text-blue-400" />
                  <span>Compression / Quality Level</span>
                </span>
                <span className="text-xs font-mono font-bold text-blue-400">
                  {qualitySlider}%
                </span>
              </div>

              <input
                type="range"
                min="0"
                max="100"
                step="1"
                value={qualitySlider}
                onChange={(e) => setQualitySlider(parseInt(e.target.value, 10))}
                className="w-full accent-blue-500 cursor-pointer"
              />

              <div className="flex justify-between items-center text-[10px] text-slate-400 font-mono">
                <span>0% (Max Compression)</span>
                <span className="text-white font-semibold">
                  Quality: {qualitySlider}% | Compression: {100 - qualitySlider}%
                </span>
                <span>100% (Lossless / Max Quality)</span>
              </div>

              {/* PNG Warning / Conversion helper */}
              {format === 'png' && qualitySlider < 70 && (
                <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-[11px] text-amber-300 space-y-1.5">
                  <div className="flex items-center space-x-1.5 font-semibold">
                    <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                    <span>PNG is a lossless format</span>
                  </div>
                  <p className="text-[10px] text-amber-200/80 leading-snug">
                    PNG retains high fidelity and cannot reach tiny KB sizes. To achieve aggressive compression, switch to WebP or JPG.
                  </p>
                  <div className="flex space-x-2 pt-1">
                    <button
                      onClick={() => setFormat('jpg')}
                      className="px-2 py-0.5 rounded bg-amber-600/30 hover:bg-amber-600 text-white text-[10px] font-bold"
                    >
                      Switch to JPG
                    </button>
                    <button
                      onClick={() => setFormat('webp')}
                      className="px-2 py-0.5 rounded bg-amber-600/30 hover:bg-amber-600 text-white text-[10px] font-bold"
                    >
                      Switch to WebP
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* FEATURE 4: MANUAL DIMENSIONS & ASPECT RATIO HANDLING */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-4 shadow-lg">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                  Manual Dimensions & Units
                </span>
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

                <span className="text-[11px] text-slate-500 font-mono">
                  Base: {curW}×{curH} px
                </span>
              </div>

              {/* Exact Dimensions Aspect Mismatch Handling */}
              {!lockAspect && hasAspectMismatch && (
                <div className="p-3 bg-slate-950/80 border border-slate-800 rounded-xl space-y-2">
                  <span className="text-[11px] font-bold text-slate-300 block">
                    Aspect Ratio Mismatch Mode
                  </span>
                  <div className="grid grid-cols-3 gap-1.5">
                    <button
                      onClick={() => setFitMode('crop-to-fit')}
                      className={`py-1.5 px-2 rounded-lg text-[10px] font-semibold text-center transition ${
                        fitMode === 'crop-to-fit'
                          ? 'bg-blue-600 text-white font-bold'
                          : 'bg-slate-900 text-slate-400 hover:text-white'
                      }`}
                      title="Centers and clips excess edges to fill dimensions without distortion"
                    >
                      Crop to Fit
                    </button>
                    <button
                      onClick={() => setFitMode('fit-padding')}
                      className={`py-1.5 px-2 rounded-lg text-[10px] font-semibold text-center transition ${
                        fitMode === 'fit-padding'
                          ? 'bg-blue-600 text-white font-bold'
                          : 'bg-slate-900 text-slate-400 hover:text-white'
                      }`}
                      title="Fits entire image inside dimensions with background letterbox"
                    >
                      Fit with Padding
                    </button>
                    <button
                      onClick={() => setFitMode('stretch')}
                      className={`py-1.5 px-2 rounded-lg text-[10px] font-semibold text-center transition ${
                        fitMode === 'stretch'
                          ? 'bg-amber-600 text-white font-bold'
                          : 'bg-slate-900 text-slate-400 hover:text-white'
                      }`}
                      title="Stretches image non-proportionally"
                    >
                      Stretch (Warning)
                    </button>
                  </div>
                </div>
              )}

              {/* Action Buttons: Apply, Fit Within, Reset */}
              <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-800/80">
                <button
                  onClick={handleApplyDimensions}
                  className="py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold flex items-center justify-center space-x-1"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>Apply</span>
                </button>
                <button
                  onClick={() => handlePercentagePreset(100)}
                  className="py-1.5 rounded-lg bg-slate-800 hover:bg-slate-750 text-slate-300 text-xs font-semibold"
                >
                  100% Fit
                </button>
                <button
                  onClick={handleResetDimensions}
                  className="py-1.5 rounded-lg bg-slate-800 hover:bg-slate-750 text-slate-300 text-xs font-semibold"
                >
                  Reset
                </button>
              </div>
            </div>

            {/* DPI Configuration Card */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-4 shadow-lg">
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
                  <div className="text-[9px] font-normal opacity-80">Zero resampling of pixels</div>
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

            {/* Export Format Card */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-3 shadow-lg">
              <span className="text-xs font-bold text-slate-300 uppercase tracking-wider">Export Format</span>
              <div className="grid grid-cols-3 gap-2">
                {(['jpg', 'png', 'webp'] as ImageFormat[]).map((fmt) => (
                  <button
                    key={fmt}
                    onClick={() => setFormat(fmt)}
                    className={`py-2 rounded-xl text-xs font-bold uppercase transition ${
                      format === fmt
                        ? 'bg-blue-600 text-white shadow-md'
                        : 'bg-slate-950 border border-slate-800 text-slate-400 hover:text-white'
                    }`}
                  >
                    {fmt}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Preview & Results Column (7 cols) */}
          <div className="lg:col-span-7 space-y-4">
            {/* Visual Before/After Preview */}
            <BeforeAfterPreview
              originalUrl={workingDataUrl}
              originalWidth={curW}
              originalHeight={curH}
              originalBytes={curBytes}
              processedUrl={outputDataUrl}
              processedWidth={outputW}
              processedHeight={outputH}
              processedBytes={outputBytes}
              warning={warning}
            />

            {/* FEATURE 1 & 9: REAL-TIME OUTPUT SIZE & GEOMETRY PANEL */}
            <OutputInfoPanel
              originalFileName={fileName}
              originalBytes={curBytes}
              originalWidth={curW}
              originalHeight={curH}
              originalFormat={fileName.split('.').pop() || 'jpg'}
              outputBytes={outputBytes}
              estimatedBytes={estimatedBytes}
              outputWidth={outputW}
              outputHeight={outputH}
              outputFormat={format}
              dpi={dpi}
              status={status}
              statusMessage={statusMessage}
              verifiedSavedBytes={verifiedSavedBytes}
              warning={warning}
            />

            {/* Bottom Save Action */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex items-center justify-between shadow-xl">
              <div className="text-xs text-slate-400">
                {verifiedSavedBytes ? (
                  <span className="text-emerald-400 font-bold flex items-center space-x-1">
                    <ShieldCheck className="w-4 h-4" />
                    <span>Saved to disk: {formatDetailedBytes(verifiedSavedBytes)}</span>
                  </span>
                ) : (
                  <span>Ready to write exact previewed buffer to disk.</span>
                )}
              </div>

              <button
                onClick={handleDownload}
                disabled={status === 'calculating' || status === 'generating' || status === 'saving'}
                className="px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-xs font-bold shadow-xl shadow-blue-900/30 flex items-center space-x-2 transition"
              >
                <Download className="w-4 h-4" />
                <span>Download Resized Photo</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Manual Crop Modal (Feature 3) */}
      {workingDataUrl && (
        <ManualCropModal
          isOpen={isCropModalOpen}
          imageDataUrl={workingDataUrl}
          originalFileName={fileName}
          onApplyCrop={handleApplyManualCrop}
          onRestoreOriginal={handleRestoreOriginal}
          onClose={() => setIsCropModalOpen(false)}
        />
      )}
    </div>
  );
};
