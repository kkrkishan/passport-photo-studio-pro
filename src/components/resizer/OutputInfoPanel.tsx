import React from 'react';
import {
  FileText,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  HardDrive,
  ShieldCheck,
  Scale,
  Sparkles,
  Info
} from 'lucide-react';
import { formatDetailedBytes, formatFileSize } from '../../services/imageResizerEngine';

export type ProcessingStatus =
  | 'ready'
  | 'calculating'
  | 'generating'
  | 'preview-ready'
  | 'saving'
  | 'save-verified'
  | 'target-unachievable'
  | 'failed';

interface OutputInfoPanelProps {
  originalFileName: string;
  originalBytes: number;
  originalWidth: number;
  originalHeight: number;
  originalFormat: string;

  outputBytes: number;
  estimatedBytes?: number;
  outputWidth: number;
  outputHeight: number;
  outputFormat: string;
  dpi?: number;
  status: ProcessingStatus;
  statusMessage?: string;
  verifiedSavedBytes?: number;
  warning?: string;
}

export const OutputInfoPanel: React.FC<OutputInfoPanelProps> = ({
  originalFileName,
  originalBytes,
  originalWidth,
  originalHeight,
  originalFormat,
  outputBytes,
  estimatedBytes,
  outputWidth,
  outputHeight,
  outputFormat,
  dpi = 300,
  status,
  statusMessage,
  verifiedSavedBytes,
  warning,
}) => {
  // Physical dimensions in mm
  const mmW = Math.round((outputWidth / dpi) * 25.4 * 10) / 10;
  const mmH = Math.round((outputHeight / dpi) * 25.4 * 10) / 10;

  // Reduction % calculation (exact)
  const effectiveOutputBytes = verifiedSavedBytes ?? (outputBytes > 0 ? outputBytes : (estimatedBytes ?? 0));
  const reductionPercent =
    originalBytes > 0 && effectiveOutputBytes > 0
      ? Math.round(((originalBytes - effectiveOutputBytes) / originalBytes) * 10000) / 100
      : 0;

  const renderStatusBadge = () => {
    switch (status) {
      case 'calculating':
        return (
          <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full bg-blue-500/15 border border-blue-500/30 text-blue-400 text-[10px] font-bold">
            <RefreshCw className="w-3 h-3 animate-spin" />
            <span>Calculating Estimate</span>
          </span>
        );
      case 'generating':
        return (
          <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full bg-indigo-500/15 border border-indigo-500/30 text-indigo-400 text-[10px] font-bold">
            <RefreshCw className="w-3 h-3 animate-spin" />
            <span>Generating Preview</span>
          </span>
        );
      case 'preview-ready':
        return (
          <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-[10px] font-bold">
            <CheckCircle2 className="w-3 h-3" />
            <span>Preview Ready</span>
          </span>
        );
      case 'saving':
        return (
          <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full bg-purple-500/15 border border-purple-500/30 text-purple-400 text-[10px] font-bold">
            <RefreshCw className="w-3 h-3 animate-spin" />
            <span>Writing to Disk...</span>
          </span>
        );
      case 'save-verified':
        return (
          <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-[10px] font-black">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span>Save Verified</span>
          </span>
        );
      case 'target-unachievable':
        return (
          <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-400 text-[10px] font-bold">
            <AlertTriangle className="w-3 h-3" />
            <span>Target Not Achievable</span>
          </span>
        );
      case 'failed':
        return (
          <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full bg-rose-500/15 border border-rose-500/30 text-rose-400 text-[10px] font-bold">
            <AlertTriangle className="w-3 h-3" />
            <span>Processing Failed</span>
          </span>
        );
      case 'ready':
      default:
        return (
          <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full bg-slate-800 border border-slate-700 text-slate-400 text-[10px] font-bold">
            <span>Ready to Process</span>
          </span>
        );
    }
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-4 shadow-xl">
      {/* Top Header & Status */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-800">
        <div className="flex items-center space-x-2">
          <Scale className="w-4 h-4 text-blue-400" />
          <span className="text-xs font-bold text-slate-200">Real-Time Output Size & Geometry</span>
        </div>
        <div>{renderStatusBadge()}</div>
      </div>

      {/* Warning Box */}
      {warning && (
        <div className="flex items-start space-x-2 p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/25 text-amber-300 text-xs">
          <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
          <span className="leading-relaxed">{warning}</span>
        </div>
      )}

      {/* Comparison Grid */}
      <div className="grid grid-cols-2 gap-4">
        {/* Original Information Card */}
        <div className="p-3.5 bg-slate-950/70 border border-slate-800/80 rounded-xl space-y-2">
          <div className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">
            Original File Information
          </div>
          <div className="space-y-1.5 text-xs">
            <div className="flex justify-between">
              <span className="text-slate-400">File Name:</span>
              <span className="font-semibold text-white truncate max-w-[130px]" title={originalFileName}>
                {originalFileName}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Original Size:</span>
              <span className="font-mono text-blue-400 font-bold">
                {formatFileSize(originalBytes)}
              </span>
            </div>
            <div className="text-[10px] font-mono text-slate-500 text-right">
              {originalBytes.toLocaleString()} bytes
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Dimensions:</span>
              <span className="font-mono text-white">
                {originalWidth} × {originalHeight} px
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Format:</span>
              <span className="font-mono text-slate-300 uppercase font-semibold">{originalFormat}</span>
            </div>
          </div>
        </div>

        {/* Output Information Card */}
        <div className="p-3.5 bg-slate-950/70 border border-slate-800/80 rounded-xl space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[10px] uppercase font-bold text-emerald-400 tracking-wider">
              Output Information
            </span>
            {reductionPercent > 0 && (
              <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded">
                ↓ {reductionPercent}%
              </span>
            )}
            {reductionPercent < 0 && (
              <span className="text-[10px] font-bold text-amber-400 bg-amber-500/10 px-1.5 py-0.5 rounded">
                ↑ {Math.abs(reductionPercent)}%
              </span>
            )}
          </div>

          <div className="space-y-1.5 text-xs">
            {/* Real vs Estimated Size */}
            <div className="flex justify-between items-baseline">
              <span className="text-slate-400">
                {verifiedSavedBytes !== undefined
                  ? 'Verified Saved Size:'
                  : status === 'calculating' || status === 'generating'
                  ? 'Estimated Size:'
                  : 'Actual Output Size:'}
              </span>
              <span className="font-mono text-emerald-400 font-bold text-sm">
                {verifiedSavedBytes !== undefined
                  ? formatFileSize(verifiedSavedBytes)
                  : outputBytes > 0
                  ? formatFileSize(outputBytes)
                  : estimatedBytes
                  ? `~${formatFileSize(estimatedBytes)}`
                  : '—'}
              </span>
            </div>
            <div className="text-[10px] font-mono text-slate-500 text-right">
              {verifiedSavedBytes !== undefined
                ? `${verifiedSavedBytes.toLocaleString()} bytes (verified on disk)`
                : outputBytes > 0
                ? `${outputBytes.toLocaleString()} bytes (1 KiB = 1024 B)`
                : 'Calculating buffer...'}
            </div>

            <div className="flex justify-between">
              <span className="text-slate-400">Output Pixels:</span>
              <span className="font-mono text-white font-semibold">
                {outputWidth} × {outputHeight} px
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Physical Size:</span>
              <span className="font-mono text-slate-300">
                {mmW} × {mmH} mm ({dpi} DPI)
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Output Format:</span>
              <span className="font-mono text-emerald-400 uppercase font-semibold">{outputFormat}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Footer Notes on Convention */}
      <div className="flex items-center justify-between text-[10px] text-slate-500 pt-1 border-t border-slate-800/80">
        <span className="flex items-center space-x-1">
          <Info className="w-3 h-3 text-slate-400" />
          <span>Standard binary calculation: 1 KiB = 1,024 bytes • Measured from real binary encoded buffers.</span>
        </span>
        {statusMessage && <span className="text-blue-400 font-medium">{statusMessage}</span>}
      </div>
    </div>
  );
};
