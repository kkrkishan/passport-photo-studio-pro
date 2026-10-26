import React, { useState } from 'react';
import { Columns, SplitSquareVertical, ArrowRight, CheckCircle2, AlertTriangle } from 'lucide-react';
import { formatFileSize } from '../../services/imageResizerEngine';

interface BeforeAfterPreviewProps {
  originalUrl: string;
  originalWidth: number;
  originalHeight: number;
  originalBytes: number;
  processedUrl?: string;
  processedWidth?: number;
  processedHeight?: number;
  processedBytes?: number;
  warning?: string;
  isWithinTarget?: boolean;
}

export const BeforeAfterPreview: React.FC<BeforeAfterPreviewProps> = ({
  originalUrl,
  originalWidth,
  originalHeight,
  originalBytes,
  processedUrl,
  processedWidth = originalWidth,
  processedHeight = originalHeight,
  processedBytes = originalBytes,
  warning,
  isWithinTarget = true,
}) => {
  const [viewMode, setViewMode] = useState<'side-by-side' | 'split'>('side-by-side');
  const [sliderPos, setSliderPos] = useState(50); // percentage for split view

  const sizeDiffPercent = originalBytes > 0 && processedBytes > 0
    ? Math.round(((originalBytes - processedBytes) / originalBytes) * 1000) / 10
    : 0;

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex flex-col space-y-3">
      {/* Header controls & stats */}
      <div className="flex items-center justify-between pb-2 border-b border-slate-800 text-xs">
        <div className="flex items-center space-x-2">
          <span className="font-bold text-slate-300">Live Preview & Comparison</span>
          {sizeDiffPercent > 0 && (
            <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 font-semibold text-[10px]">
              ↓ {sizeDiffPercent}% smaller
            </span>
          )}
          {sizeDiffPercent < 0 && (
            <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-400 font-semibold text-[10px]">
              ↑ {Math.abs(sizeDiffPercent)}% larger
            </span>
          )}
        </div>

        <div className="flex items-center space-x-1 bg-slate-950 p-0.5 rounded-lg border border-slate-800">
          <button
            onClick={() => setViewMode('side-by-side')}
            className={`p-1 rounded ${viewMode === 'side-by-side' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'}`}
            title="Side by Side View"
          >
            <Columns className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => setViewMode('split')}
            className={`p-1 rounded ${viewMode === 'split' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'}`}
            title="Split Slider View"
          >
            <SplitSquareVertical className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Warning message if applicable */}
      {warning && (
        <div className="flex items-center space-x-2 p-2 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span>{warning}</span>
        </div>
      )}

      {/* Preview Container */}
      <div className="relative min-h-[260px] max-h-[360px] bg-slate-950 rounded-xl overflow-hidden border border-slate-800 flex items-center justify-center p-3 select-none">
        {viewMode === 'side-by-side' ? (
          <div className="grid grid-cols-2 gap-4 w-full h-full items-center">
            {/* Original */}
            <div className="flex flex-col items-center justify-center space-y-2 h-full">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Before (Original)</span>
              <div className="max-h-[220px] max-w-full flex items-center justify-center overflow-hidden rounded-lg border border-slate-800 bg-[#161c2c]/40 p-1">
                <img
                  src={originalUrl}
                  alt="Original"
                  className="max-h-[210px] object-contain shadow-md rounded"
                />
              </div>
              <div className="text-[11px] text-slate-400 text-center">
                <span className="text-white font-medium">{originalWidth} × {originalHeight} px</span>
                <span className="mx-1">•</span>
                <span className="text-blue-400 font-semibold">{formatFileSize(originalBytes)}</span>
              </div>
            </div>

            {/* Processed */}
            <div className="flex flex-col items-center justify-center space-y-2 h-full">
              <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider">After (Optimized)</span>
              <div className="max-h-[220px] max-w-full flex items-center justify-center overflow-hidden rounded-lg border border-slate-800 bg-[#161c2c]/40 p-1">
                <img
                  src={processedUrl || originalUrl}
                  alt="Processed"
                  className="max-h-[210px] object-contain shadow-md rounded"
                />
              </div>
              <div className="text-[11px] text-slate-400 text-center">
                <span className="text-white font-medium">{processedWidth} × {processedHeight} px</span>
                <span className="mx-1">•</span>
                <span className="text-emerald-400 font-semibold">{formatFileSize(processedBytes)}</span>
              </div>
            </div>
          </div>
        ) : (
          /* Split View Slider */
          <div className="relative w-full h-[260px] flex items-center justify-center overflow-hidden">
            <div className="relative max-h-[250px] max-w-full overflow-hidden rounded-lg border border-slate-800">
              {/* After image underneath */}
              <img
                src={processedUrl || originalUrl}
                alt="After"
                className="max-h-[250px] object-contain block"
              />

              {/* Before image clipped on top */}
              <div
                className="absolute top-0 left-0 bottom-0 overflow-hidden"
                style={{ width: `${sliderPos}%` }}
              >
                <img
                  src={originalUrl}
                  alt="Before"
                  className="max-h-[250px] object-contain block max-w-none"
                  style={{ width: '100%', height: '100%' }}
                />
              </div>

              {/* Slider divider line */}
              <div
                className="absolute top-0 bottom-0 w-0.5 bg-white shadow-[0_0_8px_rgba(255,255,255,0.8)] z-10"
                style={{ left: `${sliderPos}%` }}
              >
                <div className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-6 h-6 rounded-full bg-white shadow-lg flex items-center justify-center text-slate-900 cursor-ew-resize">
                  <SplitSquareVertical className="w-3.5 h-3.5 rotate-90" />
                </div>
              </div>

              {/* Range input overlay */}
              <input
                type="range"
                min="0"
                max="100"
                value={sliderPos}
                onChange={(e) => setSliderPos(Number(e.target.value))}
                className="absolute inset-0 opacity-0 cursor-ew-resize w-full h-full z-20"
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
