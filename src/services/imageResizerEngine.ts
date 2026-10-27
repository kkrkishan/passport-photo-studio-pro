import { ResizeUnit, DpiMode, ImageFormat } from '../types';

/**
 * High-performance, offline image resizing and DPI manipulation engine.
 */

export interface DimensionConvertParams {
  value: number;
  fromUnit: ResizeUnit;
  toUnit: ResizeUnit;
  dpi: number;
  originalDimensionPx?: number;
}

/**
 * Convert values between px, mm, cm, inch, and percentage
 */
export function convertUnitValue({
  value,
  fromUnit,
  toUnit,
  dpi = 300,
  originalDimensionPx = 1000,
}: DimensionConvertParams): number {
  if (fromUnit === toUnit) return Math.round(value * 100) / 100;

  // 1. Convert from source unit to Pixels
  let px = 0;
  switch (fromUnit) {
    case 'px':
      px = value;
      break;
    case 'mm':
      px = (value / 25.4) * dpi;
      break;
    case 'cm':
      px = (value / 2.54) * dpi;
      break;
    case 'inch':
      px = value * dpi;
      break;
    case 'percent':
      px = (value / 100) * originalDimensionPx;
      break;
  }

  // 2. Convert from Pixels to destination unit
  let result = 0;
  switch (toUnit) {
    case 'px':
      result = Math.round(px);
      break;
    case 'mm':
      result = (px / dpi) * 25.4;
      break;
    case 'cm':
      result = (px / dpi) * 2.54;
      break;
    case 'inch':
      result = px / dpi;
      break;
    case 'percent':
      result = originalDimensionPx > 0 ? (px / originalDimensionPx) * 100 : 100;
      break;
  }

  return Math.round(result * 100) / 100;
}

/**
 * Calculate output pixel dimensions from any unit and DPI
 */
export function calculatePixelDimensions(
  width: number,
  height: number,
  unit: ResizeUnit,
  dpi: number,
  originalWidth: number,
  originalHeight: number
): { widthPx: number; heightPx: number } {
  if (unit === 'px') {
    return { widthPx: Math.max(1, Math.round(width)), heightPx: Math.max(1, Math.round(height)) };
  }
  if (unit === 'percent') {
    return {
      widthPx: Math.max(1, Math.round((width / 100) * originalWidth)),
      heightPx: Math.max(1, Math.round((height / 100) * originalHeight)),
    };
  }

  const widthPx = Math.max(1, Math.round(convertUnitValue({ value: width, fromUnit: unit, toUnit: 'px', dpi })));
  const heightPx = Math.max(1, Math.round(convertUnitValue({ value: height, fromUnit: unit, toUnit: 'px', dpi })));
  return { widthPx, heightPx };
}

/**
 * Checks if resizing with given dimensions will stretch/distort the aspect ratio
 */
export function checkAspectRatioDistortion(
  origW: number,
  origH: number,
  newW: number,
  newH: number,
  tolerancePercent = 3
): { isDistorted: boolean; diffPercent: number } {
  if (origW <= 0 || origH <= 0 || newW <= 0 || newH <= 0) {
    return { isDistorted: false, diffPercent: 0 };
  }
  const origRatio = origW / origH;
  const newRatio = newW / newH;
  const diffPercent = Math.abs(origRatio - newRatio) / origRatio * 100;
  return {
    isDistorted: diffPercent > tolerancePercent,
    diffPercent: Math.round(diffPercent * 10) / 10,
  };
}

/**
 * High-quality multi-step canvas resize (step-down downsampling for crisp sharpness)
 */
export function resizeImageToCanvas(
  sourceImage: HTMLImageElement | HTMLCanvasElement,
  targetWidth: number,
  targetHeight: number,
  backgroundColor?: string
): HTMLCanvasElement {
  let curW = sourceImage.width;
  let curH = sourceImage.height;

  // For downscaling more than 2x, perform progressive multi-step downsampling to prevent aliasing
  let curCanvas = document.createElement('canvas');
  curCanvas.width = curW;
  curCanvas.height = curH;
  let curCtx = curCanvas.getContext('2d')!;

  if (backgroundColor) {
    curCtx.fillStyle = backgroundColor;
    curCtx.fillRect(0, 0, curW, curH);
  }
  curCtx.drawImage(sourceImage, 0, 0);

  if (curW > targetWidth * 2 || curH > targetHeight * 2) {
    while (curW > targetWidth * 2 || curH > targetHeight * 2) {
      const nextW = Math.max(targetWidth, Math.floor(curW / 2));
      const nextH = Math.max(targetHeight, Math.floor(curH / 2));

      const nextCanvas = document.createElement('canvas');
      nextCanvas.width = nextW;
      nextCanvas.height = nextH;
      const nextCtx = nextCanvas.getContext('2d')!;
      nextCtx.imageSmoothingEnabled = true;
      nextCtx.imageSmoothingQuality = 'high';
      nextCtx.drawImage(curCanvas, 0, 0, curW, curH, 0, 0, nextW, nextH);

      curCanvas = nextCanvas;
      curW = nextW;
      curH = nextH;
    }
  }

  // Final resize step to exact target width and height
  const finalCanvas = document.createElement('canvas');
  finalCanvas.width = targetWidth;
  finalCanvas.height = targetHeight;
  const finalCtx = finalCanvas.getContext('2d')!;
  finalCtx.imageSmoothingEnabled = true;
  finalCtx.imageSmoothingQuality = 'high';

  if (backgroundColor) {
    finalCtx.fillStyle = backgroundColor;
    finalCtx.fillRect(0, 0, targetWidth, targetHeight);
  }

  finalCtx.drawImage(curCanvas, 0, 0, curW, curH, 0, 0, targetWidth, targetHeight);
  return finalCanvas;
}

/**
 * Calculates accurate byte size from Base64 Data URL
 */
export function getDataUrlByteSize(dataUrl: string): number {
  if (!dataUrl) return 0;
  const commaIdx = dataUrl.indexOf(',');
  if (commaIdx === -1) return 0;
  const base64 = dataUrl.slice(commaIdx + 1);
  const padding = (base64.endsWith('==') ? 2 : base64.endsWith('=') ? 1 : 0);
  return Math.round((base64.length * 3) / 4) - padding;
}

/**
 * Crops source image at specified natural coordinates
 */
export function cropImageToCanvas(
  sourceImage: HTMLImageElement | HTMLCanvasElement,
  cropX: number,
  cropY: number,
  cropWidth: number,
  cropHeight: number,
  backgroundColor?: string
): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  const w = Math.max(1, Math.round(cropWidth));
  const h = Math.max(1, Math.round(cropHeight));
  canvas.width = w;
  canvas.height = h;

  const ctx = canvas.getContext('2d')!;
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';

  if (backgroundColor) {
    ctx.fillStyle = backgroundColor;
    ctx.fillRect(0, 0, w, h);
  }

  ctx.drawImage(
    sourceImage,
    Math.round(cropX),
    Math.round(cropY),
    w,
    h,
    0,
    0,
    w,
    h
  );
  return canvas;
}

/**
 * Resize image respecting aspect ratio mismatch modes:
 * - 'crop-to-fit': fills target dimensions by trimming excess edges (no distortion)
 * - 'fit-padding': fits entirely within target dimensions with letterbox/pillarbox background (no distortion)
 * - 'stretch': forces exact dimensions with stretching
 */
export function resizeImageWithFitMode(
  sourceImage: HTMLImageElement | HTMLCanvasElement,
  targetWidth: number,
  targetHeight: number,
  fitMode: 'crop-to-fit' | 'fit-padding' | 'stretch' = 'crop-to-fit',
  backgroundColor = '#ffffff'
): HTMLCanvasElement {
  const targetW = Math.max(1, Math.round(targetWidth));
  const targetH = Math.max(1, Math.round(targetHeight));
  const srcW = sourceImage.width;
  const srcH = sourceImage.height;

  if (fitMode === 'stretch') {
    return resizeImageToCanvas(sourceImage, targetW, targetH, backgroundColor);
  }

  if (fitMode === 'fit-padding') {
    const canvas = document.createElement('canvas');
    canvas.width = targetW;
    canvas.height = targetH;
    const ctx = canvas.getContext('2d')!;

    // Fill background
    ctx.fillStyle = backgroundColor;
    ctx.fillRect(0, 0, targetW, targetH);

    const scale = Math.min(targetW / srcW, targetH / srcH);
    const drawW = Math.round(srcW * scale);
    const drawH = Math.round(srcH * scale);
    const drawX = Math.round((targetW - drawW) / 2);
    const drawY = Math.round((targetH - drawH) / 2);

    const scaledCanvas = resizeImageToCanvas(sourceImage, drawW, drawH);
    ctx.drawImage(scaledCanvas, drawX, drawY);
    return canvas;
  }

  // 'crop-to-fit' (center crop to exact ratio, then resize)
  const scale = Math.max(targetW / srcW, targetH / srcH);
  const srcCropW = Math.min(srcW, targetW / scale);
  const srcCropH = Math.min(srcH, targetH / scale);
  const srcCropX = (srcW - srcCropW) / 2;
  const srcCropY = (srcH - srcCropH) / 2;

  const cropped = cropImageToCanvas(sourceImage, srcCropX, srcCropY, srcCropW, srcCropH);
  return resizeImageToCanvas(cropped, targetW, targetH, backgroundColor);
}

/**
 * Format bytes to readable string (KB or MB) using standard 1 KiB = 1024 bytes convention
 */
export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

/**
 * Format bytes with both KB/MB and exact raw byte count
 */
export function formatDetailedBytes(bytes: number): string {
  const formatted = formatFileSize(bytes);
  return `${formatted} (${bytes.toLocaleString()} bytes)`;
}

/**
 * Convert HTMLCanvasElement to DataURL in target format with optional background fill for transparent images
 */
export function exportCanvasToFormat(
  canvas: HTMLCanvasElement,
  format: ImageFormat,
  quality = 0.92,
  backgroundColor = '#ffffff'
): string {
  let mimeType = 'image/jpeg';
  if (format === 'png') mimeType = 'image/png';
  else if (format === 'webp') mimeType = 'image/webp';
  else if (format === 'bmp') mimeType = 'image/bmp';

  // If exporting as JPEG, fill background to avoid black background on transparent images
  if (mimeType === 'image/jpeg') {
    const bgCanvas = document.createElement('canvas');
    bgCanvas.width = canvas.width;
    bgCanvas.height = canvas.height;
    const ctx = bgCanvas.getContext('2d')!;
    ctx.fillStyle = backgroundColor;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(canvas, 0, 0);
    return bgCanvas.toDataURL('image/jpeg', quality);
  }

  return canvas.toDataURL(mimeType, quality);
}

// ==========================================
// MODE A: DPI METADATA INJECTION (ZERO RESAMPLE)
// ==========================================

/**
 * Injects or updates JFIF APP0 marker (DPI metadata) directly in JPEG binary without re-encoding
 */
export function setJpegDpiMetadata(dataUrl: string, dpi: number): string {
  try {
    const parts = dataUrl.split(',');
    if (parts.length < 2 || !parts[0].includes('image/jpeg')) {
      return dataUrl;
    }

    const raw = atob(parts[1]);
    const uint8 = new Uint8Array(raw.length);
    for (let i = 0; i < raw.length; i++) {
      uint8[i] = raw.charCodeAt(i);
    }

    // Check SOI marker 0xFFD8
    if (uint8[0] !== 0xff || uint8[1] !== 0xd8) {
      return dataUrl;
    }

    const dpiRounded = Math.max(1, Math.min(65535, Math.round(dpi)));
    const dpiHi = (dpiRounded >> 8) & 0xff;
    const dpiLo = dpiRounded & 0xff;

    // Check if JFIF APP0 (0xFFE0) marker is present
    if (
      uint8[2] === 0xff &&
      uint8[3] === 0xe0 &&
      uint8[6] === 0x4a && // 'J'
      uint8[7] === 0x46 && // 'F'
      uint8[8] === 0x49 && // 'I'
      uint8[9] === 0x46 && // 'F'
      uint8[10] === 0x00
    ) {
      // Modify density unit: 1 = dots per inch (DPI)
      uint8[13] = 1;
      // Xdensity
      uint8[14] = dpiHi;
      uint8[15] = dpiLo;
      // Ydensity
      uint8[16] = dpiHi;
      uint8[17] = dpiLo;

      // Re-encode to base64
      let binary = '';
      for (let i = 0; i < uint8.length; i++) {
        binary += String.fromCharCode(uint8[i]);
      }
      return 'data:image/jpeg;base64,' + btoa(binary);
    } else {
      // Construct a valid standard JFIF APP0 marker block (18 bytes)
      const jfifSegment = new Uint8Array([
        0xff, 0xe0, // APP0 marker
        0x00, 0x10, // Length = 16 bytes
        0x4a, 0x46, 0x49, 0x46, 0x00, // "JFIF\0"
        0x01, 0x01, // Version 1.1
        0x01,       // Density unit: 1 = dots per inch
        dpiHi, dpiLo, // X density
        dpiHi, dpiLo, // Y density
        0x00, 0x00  // Thumbnail w & h = 0
      ]);

      const newBuffer = new Uint8Array(uint8.length + jfifSegment.length);
      // Copy SOI marker (0xFF, 0xD8)
      newBuffer[0] = uint8[0];
      newBuffer[1] = uint8[1];
      // Insert JFIF
      newBuffer.set(jfifSegment, 2);
      // Copy rest of image
      newBuffer.set(uint8.subarray(2), 2 + jfifSegment.length);

      let binary = '';
      for (let i = 0; i < newBuffer.length; i++) {
        binary += String.fromCharCode(newBuffer[i]);
      }
      return 'data:image/jpeg;base64,' + btoa(binary);
    }
  } catch (err) {
    console.warn('Failed to inject JPEG DPI metadata:', err);
    return dataUrl;
  }
}

/**
 * Injects or updates pHYs (Physical Pixel Dimensions) chunk in PNG binary
 */
export function setPngDpiMetadata(dataUrl: string, dpi: number): string {
  try {
    const parts = dataUrl.split(',');
    if (parts.length < 2 || !parts[0].includes('image/png')) {
      return dataUrl;
    }

    const raw = atob(parts[1]);
    const uint8 = new Uint8Array(raw.length);
    for (let i = 0; i < raw.length; i++) {
      uint8[i] = raw.charCodeAt(i);
    }

    // Verify PNG signature (89 50 4E 47 0D 0A 1A 0A)
    if (uint8[0] !== 0x89 || uint8[1] !== 0x50) {
      return dataUrl;
    }

    // Convert DPI to pixels per meter (1 inch = 0.0254 m)
    const ppm = Math.round(dpi / 0.0254);
    const ppm32 = new Uint8Array(4);
    ppm32[0] = (ppm >>> 24) & 0xff;
    ppm32[1] = (ppm >>> 16) & 0xff;
    ppm32[2] = (ppm >>> 8) & 0xff;
    ppm32[3] = ppm & 0xff;

    // Build pHYs data: 4 bytes X ppm, 4 bytes Y ppm, 1 byte unit (1 = meter)
    const chunkData = new Uint8Array(9);
    chunkData.set(ppm32, 0);
    chunkData.set(ppm32, 4);
    chunkData[8] = 1;

    // CRC32 calculation table
    const crcTable = new Uint32Array(256);
    for (let n = 0; n < 256; n++) {
      let c = n;
      for (let k = 0; k < 8; k++) {
        c = (c & 1) ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
      }
      crcTable[n] = c;
    }
    const calcCrc = (typeAndData: Uint8Array): number => {
      let crc = 0xffffffff;
      for (let i = 0; i < typeAndData.length; i++) {
        crc = crcTable[(crc ^ typeAndData[i]) & 0xff] ^ (crc >>> 8);
      }
      return (crc ^ 0xffffffff) >>> 0;
    };

    const typeAndData = new Uint8Array(4 + 9);
    typeAndData[0] = 0x70; // 'p'
    typeAndData[1] = 0x48; // 'H'
    typeAndData[2] = 0x79; // 'y'
    typeAndData[3] = 0x53; // 's'
    typeAndData.set(chunkData, 4);

    const crcVal = calcCrc(typeAndData);
    const fullChunk = new Uint8Array(4 + 4 + 9 + 4);
    // Length: 9
    fullChunk[0] = 0; fullChunk[1] = 0; fullChunk[2] = 0; fullChunk[3] = 9;
    // Chunk type + data
    fullChunk.set(typeAndData, 4);
    // CRC
    fullChunk[17] = (crcVal >>> 24) & 0xff;
    fullChunk[18] = (crcVal >>> 16) & 0xff;
    fullChunk[19] = (crcVal >>> 8) & 0xff;
    fullChunk[20] = crcVal & 0xff;

    // Insert after IHDR (8 bytes signature + 25 bytes IHDR = 33 bytes)
    const newBuf = new Uint8Array(uint8.length + fullChunk.length);
    newBuf.set(uint8.subarray(0, 33), 0);
    newBuf.set(fullChunk, 33);
    newBuf.set(uint8.subarray(33), 33 + fullChunk.length);

    let binary = '';
    for (let i = 0; i < newBuf.length; i++) {
      binary += String.fromCharCode(newBuf[i]);
    }
    return 'data:image/png;base64,' + btoa(binary);
  } catch (err) {
    console.warn('Failed to inject PNG DPI metadata:', err);
    return dataUrl;
  }
}
