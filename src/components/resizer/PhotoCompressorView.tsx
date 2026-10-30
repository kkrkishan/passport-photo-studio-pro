import React, { useState, useEffect, useRef } from 'react';
import {
  Upload,
  Download,
  AlertTriangle,
  RefreshCw,
  Zap,
  Sliders,
  CheckCircle2,
  Minimize2,
  Crop as CropIcon,
  ShieldCheck,
  Info
} from 'lucide-react';
import { ImageFormat } from '../../types';
import {
  compressImageToTargetKb,
  compressImageWithFixedQuality
} from '../../services/photoCompressorEngine';
import {
  getDataUrlByteSize,
  formatFileSize,
  formatDetailedBytes
} from '../../services/imageResizerEngine';
import { BeforeAfterPreview } from './BeforeAfterPreview';
import { ManualCropModal } from './ManualCropModal';
import { OutputInfoPanel, ProcessingStatus } from './OutputInfoPanel';
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
  // Raw uncropped image
  const [rawOriginalDataUrl, setRawOriginalDataUrl] = useState<string | null>(initialImage?.dataUrl || null);
  const [rawW, setRawW] = useState<number>(initialImage?.width || 0);
  const [rawH, setRawH] = useState<number>(initialImage?.height || 0);
  const [rawBytes, setRawBytes] = useState<number>(initialImage?.sizeBytes || 0);

  // Working image
  const [workingDataUrl, setWorkingDataUrl] = useState<string | null>(initialImage?.dataUrl || null);
  const [fileName, setFileName] = useState<string>(initialImage?.name || 'photo.jpg');
  const [curW, setCurW] = useState<number>(initialImage?.width || 0);
  const [curH, setCurH] = useState<number>(initialImage?.height || 0);
  const [curBytes, setCurBytes] = useState<number>(initialImage?.sizeBytes || 0);
  const [isCropped, setIsCropped] = useState<boolean>(false);

  // Crop Modal State
  const [isCropModalOpen, setIsCropModalOpen] = useState<boolean>(false);

  // Mode Selection: 'target-kb' vs 'manual-quality'
  const [compressMode, setCompressMode] = useState<'target-kb' | 'manual-quality'>('target-kb');

  // Feature 5: Real Target KB
  const [targetKb, setTargetKb] = useState<number>(50);
  const [customKb, setCustomKb] = useState<string>('50');
  const [allowDownscale, setAllowDownscale] = useState<boolean>(true);

  // Feature 2: 0–100% Quality Slider (Default 80%)
  const [qualitySlider, setQualitySlider] = useState<number>(80);

  // Format & Background
  const [format, setFormat] = useState<ImageFormat>('jpg');
  const [bgColor, setBgColor] = useState<string>('#ffffff');

  // Results & Verification
  const [outputDataUrl, setOutputDataUrl] = useState<string>('');
  const [outputBytes, setOutputBytes] = useState<number>(0);
  const [estimatedBytes, setEstimatedBytes] = useState<number | undefined>();
  const [outputW, setOutputW] = useState<number>(0);
  const [outputH, setOutputH] = useState<number>(0);
  const [achievedQuality, setAchievedQuality] = useState<number>(0.80);
  const [verifiedSavedBytes, setVerifiedSavedBytes] = useState<number | undefined>();
  const [status, setStatus] = useState<ProcessingStatus>('ready');
  const [statusMessage, setStatusMessage] = useState<string | undefined>();
  const [warning, setWarning] = useState<string | undefined>();

  const fileInputRef = useRef<HTMLInputElement>(null);
  const workingImageRef = useRef<HTMLImageElement | null>(null);
  const renderJobIdRef = useRef<number>(0);

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

  // Manual Crop Handlers
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

  // Re-run compression when parameters change (Debounced & cancellable)
  useEffect(() => {
    if (!workingDataUrl || !workingImageRef.current) return;

    setStatus('calculating');
    if (compressMode === 'target-kb') {
      setEstimatedBytes(targetKb * 1024);
    } else {
      setEstimatedBytes(Math.round(curBytes * (qualitySlider / 100) * 0.85));
    }

    const jobId = ++renderJobIdRef.current;
    const timer = setTimeout(() => {
      if (jobId === renderJobIdRef.current) {
        runCompression(jobId);
      }
    }, 120);

    return () => clearTimeout(timer);
  }, [
    workingDataUrl,
    compressMode,
    targetKb,
    qualitySlider,
    format,
    bgColor,
    allowDownscale
  ]);

  const runCompression = async (jobId: number) => {
    if (!workingImageRef.current || jobId !== renderJobIdRef.current) return;
    setStatus('generating');

    try {
      if (compressMode === 'target-kb') {
        const res = await compressImageToTargetKb({
          sourceImage: workingImageRef.current,
          targetKb,
          format,
          backgroundColor: bgColor,
          allowDimensionDownscale: allowDownscale,
        });

        if (jobId !== renderJobIdRef.current) return;

        setOutputDataUrl(res.dataUrl);
        setOutputBytes(res.actualBytes);
        setOutputW(res.appliedWidth);
        setOutputH(res.appliedHeight);
        setAchievedQuality(res.quality);
        setEstimatedBytes(undefined);

        if (!res.isWithinTarget) {
          setStatus('target-unachievable');
          setWarning(res.warning);
          setStatusMessage(`Could not fit within ${targetKb} KB. Achieved: ${(res.actualBytes / 1024).toFixed(1)} KB`);
        } else {
          setStatus('preview-ready');
          setWarning(res.warning);
          setStatusMessage(`Target achieved: ${(res.actualBytes / 1024).toFixed(2)} KB (<= ${targetKb} KB)`);
        }
      } else {
        // Manual Quality Slider Mode
        const normalizedQuality = Math.max(0.05, Math.min(1.0, qualitySlider / 100));
        const res = await compressImageWithFixedQuality({
          sourceImage: workingImageRef.current,
          quality: normalizedQuality,
          format,
          backgroundColor: bgColor,
        });

        if (jobId !== renderJobIdRef.current) return;

        setOutputDataUrl(res.dataUrl);
        setOutputBytes(res.actualBytes);
        setOutputW(curW);
        setOutputH(curH);
        setAchievedQuality(normalizedQuality);
        setEstimatedBytes(undefined);
        setStatus('preview-ready');
        setWarning(undefined);
        setStatusMessage(`Actual byte length: ${res.actualBytes.toLocaleString()} bytes`);
      }
    } catch (err: any) {
      console.error('Compression error:', err);
      if (jobId === renderJobIdRef.current) {
        setStatus('failed');
        setStatusMessage(err.message || 'Compression failed');
      }
    }
  };

  // Feature 8: Exact Save & Verify
  const handleDownload = async () => {
    if (!outputDataUrl) return;
    setStatus('saving');

    const baseName = fileName.replace(/\.[^/.]+$/, '');
    const outName = `${baseName}_compressed_${Math.round(outputBytes / 1024)}KB.${format === 'jpeg' ? 'jpg' : format}`;

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

  const TARGET_KB_PRESETS = [10, 20, 30, 50, 100, 200, 500, 1000];

  return (
    <div className="flex-1 flex flex-col p-6 overflow-y-auto space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-800">
        <div>
          <h2 className="text-lg sm:text-xl font-black text-white flex items-center space-x-2">
            <Minimize2 className="w-5 h-5 text-emerald-400" />
            <span>Photo Compressor (Target KB & Quality Slider)</span>
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Strict target KB limits for government exams or manual 0–100% compression slider with verified disk export.
          </p>
        </div>

        {workingDataUrl && (
          <div className="flex flex-wrap items-center gap-2">
            {/* MANUAL CROP BUTTON (FEATURE 3) */}
            <button
              onClick={() => setIsCropModalOpen(true)}
              className="px-3.5 py-1.5 rounded-xl bg-emerald-600/20 hover:bg-emerald-600 border border-emerald-500/40 text-emerald-300 hover:text-white text-xs font-bold flex items-center space-x-1.5 transition shadow-sm"
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
              className="px-4 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-xs font-bold shadow-lg shadow-emerald-900/30 flex items-center space-x-2 transition"
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

      {!workingDataUrl ? (
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
            {/* Mode Switcher: Target KB vs Quality Slider */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-3 shadow-lg">
              <span className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                Select Active Compression Mode
              </span>
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
                  <span>0–100% Quality Slider</span>
                </button>
              </div>

              {/* Informative mode explanation banner */}
              <div className="p-2.5 rounded-xl bg-slate-950/70 border border-slate-800/80 text-[11px] text-slate-400 flex items-start space-x-2">
                <Info className="w-3.5 h-3.5 text-blue-400 shrink-0 mt-0.5" />
                <span>
                  {compressMode === 'target-kb'
                    ? `Target KB Mode is active: System binary-searches optimal quality to stay strictly under ${targetKb} KB.`
                    : `Quality Slider Mode is active: System applies fixed ${qualitySlider}% quality without automatic downscaling.`}
                </span>
              </div>
            </div>

            {/* FEATURE 5: TARGET FILE SIZE CONTROLS */}
            {compressMode === 'target-kb' ? (
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-4 shadow-lg">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                    Target File Size Limit
                  </span>
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
              /* FEATURE 2: 0–100% QUALITY SLIDER CONTROLS */
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-4 shadow-lg">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                    Quality / Compression Slider
                  </span>
                  <span className="text-xs font-mono font-bold text-emerald-400">{qualitySlider}%</span>
                </div>

                <input
                  type="range"
                  min="0"
                  max="100"
                  step="1"
                  value={qualitySlider}
                  onChange={(e) => setQualitySlider(parseInt(e.target.value, 10))}
                  className="w-full accent-emerald-500 cursor-pointer"
                />

                <div className="flex justify-between items-center text-[10px] text-slate-400 font-mono">
                  <span>0% (Max Compression)</span>
                  <span className="text-white font-semibold">
                    Quality: {qualitySlider}% | Compression: {100 - qualitySlider}%
                  </span>
                  <span>100% (Lossless / Max Quality)</span>
                </div>

                <div className="grid grid-cols-4 gap-1.5 pt-2 border-t border-slate-800/80">
                  {[100, 80, 50, 20].map((q) => (
                    <button
                      key={q}
                      onClick={() => setQualitySlider(q)}
                      className="py-1 rounded bg-slate-800 hover:bg-slate-750 text-slate-300 text-xs font-medium"
                    >
                      {q}%
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Format & Background Color */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-3 shadow-lg">
              <span className="text-xs font-bold text-slate-300 uppercase tracking-wider">Format & Background</span>

              <div className="grid grid-cols-2 gap-3 items-center">
                <div>
                  <label className="text-[11px] font-semibold text-slate-400 block mb-1">Target Format</label>
                  <select
                    value={format}
                    onChange={(e) => setFormat(e.target.value as ImageFormat)}
                    className="w-full bg-slate-950 border border-slate-700/80 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                  >
                    <option value="jpg">JPG (Standard Online Forms)</option>
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
            {/* Visual Preview */}
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
              isWithinTarget={compressMode === 'target-kb' ? outputBytes <= targetKb * 1024 : true}
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
              dpi={300}
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
                  <span>Ready to write exact compressed buffer to disk.</span>
                )}
              </div>

              <button
                onClick={handleDownload}
                disabled={status === 'calculating' || status === 'generating' || status === 'saving'}
                className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-xs font-bold shadow-xl shadow-emerald-900/30 flex items-center space-x-2 transition"
              >
                <Download className="w-4 h-4" />
                <span>Download Compressed Photo</span>
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
