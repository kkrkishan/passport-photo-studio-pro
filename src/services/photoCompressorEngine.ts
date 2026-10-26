import {
  getDataUrlByteSize,
  exportCanvasToFormat,
  resizeImageToCanvas,
  setJpegDpiMetadata
} from './imageResizerEngine';
import { ImageFormat } from '../types';

export interface CompressToTargetKbOptions {
  sourceImage: HTMLImageElement | HTMLCanvasElement;
  targetKb: number;
  format?: ImageFormat;
  maxIterations?: number;
  dpi?: number;
  backgroundColor?: string;
  allowDimensionDownscale?: boolean;
}

export interface CompressResult {
  dataUrl: string;
  actualBytes: number;
  actualKb: number;
  quality: number;
  appliedWidth: number;
  appliedHeight: number;
  scaledDown: boolean;
  isWithinTarget: boolean;
  warning?: string;
}

/**
 * Robust binary search compression engine to achieve exact or under-target file size in KB.
 * Does NOT pad garbage bytes. Measures real encoded byte length.
 */
export async function compressImageToTargetKb({
  sourceImage,
  targetKb,
  format = 'jpg',
  maxIterations = 7,
  dpi = 300,
  backgroundColor = '#ffffff',
  allowDimensionDownscale = true,
}: CompressToTargetKbOptions): Promise<CompressResult> {
  const targetBytes = targetKb * 1024;
  let currentWidth = sourceImage.width;
  let currentHeight = sourceImage.height;
  let scaledDown = false;

  // Render initial canvas
  let canvas = resizeImageToCanvas(sourceImage, currentWidth, currentHeight, backgroundColor);

  let bestDataUrl = '';
  let bestBytes = Infinity;
  let bestQuality = 0.85;

  // Binary search for optimal JPEG/WEBP quality (range 0.05 to 1.0)
  const binarySearchQuality = (c: HTMLCanvasElement): { dataUrl: string; bytes: number; quality: number } => {
    let low = 0.05;
    let high = 1.0;
    let candidateDataUrl = '';
    let candidateBytes = Infinity;
    let candidateQuality = 0.8;

    for (let i = 0; i < maxIterations; i++) {
      const midQuality = (low + high) / 2;
      let dataUrl = exportCanvasToFormat(c, format, midQuality, backgroundColor);
      if (format === 'jpg' || format === 'jpeg') {
        dataUrl = setJpegDpiMetadata(dataUrl, dpi);
      }
      const bytes = getDataUrlByteSize(dataUrl);

      if (bytes <= targetBytes) {
        // Fits target! Try to get higher quality
        candidateDataUrl = dataUrl;
        candidateBytes = bytes;
        candidateQuality = midQuality;
        low = midQuality;
      } else {
        // Exceeds target, decrease quality
        high = midQuality;
        // Keep as fallback if nothing fits yet
        if (candidateBytes === Infinity || bytes < candidateBytes) {
          candidateDataUrl = dataUrl;
          candidateBytes = bytes;
          candidateQuality = midQuality;
        }
      }
    }

    return { dataUrl: candidateDataUrl, bytes: candidateBytes, quality: Math.round(candidateQuality * 100) / 100 };
  };

  let searchRes = binarySearchQuality(canvas);
  bestDataUrl = searchRes.dataUrl;
  bestBytes = searchRes.bytes;
  bestQuality = searchRes.quality;

  // If even at lowest quality it exceeds target size and downscaling is allowed,
  // progressively downscale dimensions until it fits within targetKb.
  if (bestBytes > targetBytes && allowDimensionDownscale) {
    let scale = 0.9;
    for (let step = 0; step < 8 && bestBytes > targetBytes; step++) {
      scaledDown = true;
      currentWidth = Math.max(50, Math.round(sourceImage.width * scale));
      currentHeight = Math.max(50, Math.round(sourceImage.height * scale));

      canvas = resizeImageToCanvas(sourceImage, currentWidth, currentHeight, backgroundColor);
      searchRes = binarySearchQuality(canvas);

      bestDataUrl = searchRes.dataUrl;
      bestBytes = searchRes.bytes;
      bestQuality = searchRes.quality;

      if (bestBytes <= targetBytes) break;
      scale *= 0.85; // Step down further
    }
  }

  const isWithinTarget = bestBytes <= targetBytes;
  let warning: string | undefined;

  if (!isWithinTarget) {
    warning = `Could not reach ${targetKb} KB without severe distortion. Closest size achieved: ${(bestBytes / 1024).toFixed(1)} KB.`;
  } else if (scaledDown) {
    warning = `Image resolution was proportionally reduced to ${currentWidth}×${currentHeight} px to meet the ${targetKb} KB limit.`;
  }

  return {
    dataUrl: bestDataUrl,
    actualBytes: bestBytes,
    actualKb: Math.round((bestBytes / 1024) * 10) / 10,
    quality: bestQuality,
    appliedWidth: currentWidth,
    appliedHeight: currentHeight,
    scaledDown,
    isWithinTarget,
    warning,
  };
}

/**
 * Compresses image with fixed quality level
 */
export async function compressImageWithFixedQuality({
  sourceImage,
  quality,
  format = 'jpg',
  dpi = 300,
  backgroundColor = '#ffffff',
}: {
  sourceImage: HTMLImageElement | HTMLCanvasElement;
  quality: number; // 0.1 to 1.0
  format?: ImageFormat;
  dpi?: number;
  backgroundColor?: string;
}): Promise<{ dataUrl: string; actualBytes: number; actualKb: number }> {
  const canvas = resizeImageToCanvas(sourceImage, sourceImage.width, sourceImage.height, backgroundColor);
  let dataUrl = exportCanvasToFormat(canvas, format, quality, backgroundColor);
  if (format === 'jpg' || format === 'jpeg') {
    dataUrl = setJpegDpiMetadata(dataUrl, dpi);
  }
  const bytes = getDataUrlByteSize(dataUrl);
  return {
    dataUrl,
    actualBytes: bytes,
    actualKb: Math.round((bytes / 1024) * 10) / 10,
  };
}
