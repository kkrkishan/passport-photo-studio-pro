import { PDFDocument, PageSizes } from 'pdf-lib';
import { PageSizePreset, PdfCompressionMode } from '../types';
import { renderPdfToCanvases } from './pdfRenderer';

export interface PdfMetadata {
  pageCount: number;
  fileSizeBytes: number;
  fileSizeKb: number;
  firstPageWidthPt: number;
  firstPageHeightPt: number;
  firstPageWidthMm: number;
  firstPageHeightMm: number;
  orientation: 'portrait' | 'landscape';
}

export interface PdfProcessOptions {
  pdfBytes: ArrayBuffer | Uint8Array;
  targetPageSize?: PageSizePreset;
  customWidthMm?: number;
  customHeightMm?: number;
  orientation?: 'portrait' | 'landscape' | 'original';
  compressionMode?: PdfCompressionMode;
  targetKb?: number;
  qualitySlider?: number; // 0 to 100
  dpi?: number;
  onProgress?: (progress: { current: number; total: number; message: string }) => void;
}

export interface PdfProcessResult {
  pdfBytes: Uint8Array;
  fileSizeBytes: number;
  fileSizeKb: number;
  pageCount: number;
  warning?: string;
  isWithinTarget?: boolean;
  isValidated: boolean;
}

export interface ImageToPdfItem {
  dataUrl: string;
  name: string;
  width: number;
  height: number;
}

export interface ImageToPdfOptions {
  images: ImageToPdfItem[];
  pageSize?: 'a4' | 'a5' | 'letter';
  orientation?: 'portrait' | 'landscape';
  marginMm?: number;
  quality?: number; // 0.1 to 1.0
}

/**
 * Standard Points for Page Sizes (1 pt = 1/72 inch)
 */
export const PAGE_SIZE_POINTS: Record<string, [number, number]> = {
  a4: PageSizes.A4,        // [595.28, 841.89]
  a5: PageSizes.A5,        // [419.53, 595.28]
  letter: PageSizes.Letter, // [612.00, 792.00]
  legal: PageSizes.Legal,   // [612.00, 1008.00]
};

/**
 * Inspect PDF and extract page count, dimensions and orientation
 */
export async function getPdfMetadata(pdfBytes: ArrayBuffer | Uint8Array): Promise<PdfMetadata> {
  const doc = await PDFDocument.load(pdfBytes, { ignoreEncryption: true });
  const pageCount = doc.getPageCount();
  const firstPage = doc.getPage(0);
  const { width: wPt, height: hPt } = firstPage.getSize();

  // Convert points to millimeters (1 pt = 25.4 / 72 mm = ~0.352778 mm)
  const ptToMm = 25.4 / 72;
  const wMm = Math.round(wPt * ptToMm * 10) / 10;
  const hMm = Math.round(hPt * ptToMm * 10) / 10;
  const orientation = wPt > hPt ? 'landscape' : 'portrait';

  const fileSizeBytes = pdfBytes.byteLength;
  return {
    pageCount,
    fileSizeBytes,
    fileSizeKb: Math.round((fileSizeBytes / 1024) * 10) / 10,
    firstPageWidthPt: Math.round(wPt),
    firstPageHeightPt: Math.round(hPt),
    firstPageWidthMm: wMm,
    firstPageHeightMm: hMm,
    orientation,
  };
}

/**
 * Resize and compress PDF pages using robust raster & stream compression.
 * Delivers true, high-quality compression without distortion.
 */
export async function processPdfDocument({
  pdfBytes,
  targetPageSize = 'original',
  customWidthMm,
  customHeightMm,
  orientation = 'original',
  compressionMode = 'balanced',
  targetKb,
  qualitySlider = 80,
  dpi = 150,
  onProgress,
}: PdfProcessOptions): Promise<PdfProcessResult> {
  const originalDoc = await PDFDocument.load(pdfBytes, { ignoreEncryption: true });
  const pageCount = originalDoc.getPageCount();

  // Determine target dimensions in points
  let targetWidthPt: number | null = null;
  let targetHeightPt: number | null = null;

  if (targetPageSize !== 'original') {
    if (targetPageSize === 'custom' && customWidthMm && customHeightMm) {
      targetWidthPt = (customWidthMm / 25.4) * 72;
      targetHeightPt = (customHeightMm / 25.4) * 72;
    } else if (PAGE_SIZE_POINTS[targetPageSize]) {
      const [w, h] = PAGE_SIZE_POINTS[targetPageSize];
      targetWidthPt = w;
      targetHeightPt = h;
    }
  }

  // Adjust for orientation if specified
  if (targetWidthPt && targetHeightPt) {
    if (orientation === 'landscape' && targetWidthPt < targetHeightPt) {
      const tmp = targetWidthPt;
      targetWidthPt = targetHeightPt;
      targetHeightPt = tmp;
    } else if (orientation === 'portrait' && targetWidthPt > targetHeightPt) {
      const tmp = targetWidthPt;
      targetWidthPt = targetHeightPt;
      targetHeightPt = tmp;
    }
  }

  let finalBytes: Uint8Array;
  let warning: string | undefined;

  // Mode 1: Pure Lossless Structural Optimization (when explicitly requested and no target KB set)
  if (compressionMode === 'lossless' && !targetKb) {
    let finalDoc: PDFDocument;

    if (targetWidthPt && targetHeightPt) {
      finalDoc = await PDFDocument.create();
      for (let i = 0; i < pageCount; i++) {
        const [embeddedPage] = await finalDoc.embedPdf(originalDoc, [i]);
        const newPage = finalDoc.addPage([targetWidthPt, targetHeightPt]);

        const origSize = embeddedPage.size();
        const scaleW = targetWidthPt / origSize.width;
        const scaleH = targetHeightPt / origSize.height;
        const scale = Math.min(scaleW, scaleH);

        const scaledW = origSize.width * scale;
        const scaledH = origSize.height * scale;
        const x = (targetWidthPt - scaledW) / 2;
        const y = (targetHeightPt - scaledH) / 2;

        newPage.drawPage(embeddedPage, {
          x,
          y,
          width: scaledW,
          height: scaledH,
        });
      }
    } else {
      finalDoc = originalDoc;
    }

    finalBytes = await finalDoc.save({ useObjectStreams: true });
    warning = 'Lossless mode cleans internal structures. For larger size reductions, select Balanced or Strong mode.';
  } else {
    // Mode 2: True High-Quality Visual Compression (Balanced, Strong, or Target KB)
    // Uses pdfjs-dist to render pages at target resolution and re-encodes with calibrated JPEG quality
    onProgress?.({ current: 0, total: pageCount, message: 'Analyzing & rendering PDF pages...' });

    // Determine target DPI & JPEG quality
    let renderDpi = dpi || 150;
    let jpegQuality = Math.max(0.2, Math.min(0.95, qualitySlider / 100));

    if (compressionMode === 'strong') {
      renderDpi = Math.min(renderDpi, 130);
      jpegQuality = Math.min(jpegQuality, 0.65);
    } else if (compressionMode === 'balanced') {
      renderDpi = Math.min(renderDpi, 160);
      jpegQuality = Math.min(jpegQuality, 0.82);
    }

    // If Target KB is set, adjust quality and DPI dynamically
    if (targetKb && pageCount > 0) {
      const targetBytesPerPage = (targetKb * 1024) / pageCount;
      if (targetBytesPerPage < 40000) {
        // Under 40 KB per page: aggressive settings
        renderDpi = Math.min(renderDpi, 120);
        jpegQuality = 0.55;
      } else if (targetBytesPerPage < 100000) {
        // 40-100 KB per page: balanced settings
        renderDpi = Math.min(renderDpi, 140);
        jpegQuality = 0.70;
      } else {
        renderDpi = Math.min(renderDpi, 160);
        jpegQuality = 0.82;
      }
    }

    try {
      const renderedPages = await renderPdfToCanvases(pdfBytes, {
        dpi: renderDpi,
      });

      const compressedDoc = await PDFDocument.create();

      for (let i = 0; i < renderedPages.length; i++) {
        onProgress?.({
          current: i + 1,
          total: renderedPages.length,
          message: `Compressing page ${i + 1} of ${renderedPages.length}...`,
        });

        const p = renderedPages[i];
        const pageW = targetWidthPt || p.widthPt;
        const pageH = targetHeightPt || p.heightPt;

        // Convert page canvas to compressed JPEG
        const imgDataUrl = p.canvas.toDataURL('image/jpeg', jpegQuality);
        const embeddedImg = await compressedDoc.embedJpg(imgDataUrl);

        const newPage = compressedDoc.addPage([pageW, pageH]);
        newPage.drawImage(embeddedImg, {
          x: 0,
          y: 0,
          width: pageW,
          height: pageH,
        });
      }

      finalBytes = await compressedDoc.save({ useObjectStreams: true });
    } catch (renderErr) {
      console.warn('Advanced PDF rendering fallback to structural optimization:', renderErr);
      finalBytes = await originalDoc.save({ useObjectStreams: true });
      warning = 'Fallback structural optimization applied.';
    }
  }

  const fileSizeBytes = finalBytes.byteLength;
  const fileSizeKb = Math.round((fileSizeBytes / 1024) * 100) / 100;

  // Validation
  let isValidated = false;
  try {
    const verifiedDoc = await PDFDocument.load(finalBytes, { ignoreEncryption: true });
    isValidated = verifiedDoc.getPageCount() === pageCount;
  } catch (err) {
    console.warn('PDF validation warning:', err);
    isValidated = false;
  }

  let isWithinTarget = true;
  if (targetKb) {
    isWithinTarget = fileSizeKb <= targetKb;
    if (!isWithinTarget) {
      warning = `Output PDF size is ${fileSizeKb} KB (Target: ${targetKb} KB). For smaller size, select Strong mode or reduce page dimensions.`;
    }
  }

  return {
    pdfBytes: finalBytes,
    fileSizeBytes,
    fileSizeKb,
    pageCount,
    warning,
    isWithinTarget,
    isValidated,
  };
}

/**
 * Convert multiple images into a clean single PDF document
 */
export async function convertImagesToPdf({
  images,
  pageSize = 'a4',
  orientation = 'portrait',
  marginMm = 10,
  quality = 0.85,
}: ImageToPdfOptions): Promise<Uint8Array> {
  const doc = await PDFDocument.create();

  let [stdW, stdH] = PAGE_SIZE_POINTS[pageSize] || PAGE_SIZE_POINTS.a4;
  if (orientation === 'landscape' && stdW < stdH) {
    const tmp = stdW;
    stdW = stdH;
    stdH = tmp;
  } else if (orientation === 'portrait' && stdW > stdH) {
    const tmp = stdW;
    stdW = stdH;
    stdH = tmp;
  }

  const marginPt = (marginMm / 25.4) * 72;
  const availW = Math.max(10, stdW - marginPt * 2);
  const availH = Math.max(10, stdH - marginPt * 2);

  for (const imgItem of images) {
    let embeddedImg;
    if (imgItem.dataUrl.includes('image/png')) {
      embeddedImg = await doc.embedPng(imgItem.dataUrl);
    } else {
      // JPEG or convert to JPEG
      embeddedImg = await doc.embedJpg(imgItem.dataUrl);
    }

    const imgDims = embeddedImg.scale(1);
    const scale = Math.min(availW / imgDims.width, availH / imgDims.height);
    const drawW = imgDims.width * scale;
    const drawH = imgDims.height * scale;

    const x = marginPt + (availW - drawW) / 2;
    const y = marginPt + (availH - drawH) / 2;

    const page = doc.addPage([stdW, stdH]);
    page.drawImage(embeddedImg, {
      x,
      y,
      width: drawW,
      height: drawH,
    });
  }

  return await doc.save({ useObjectStreams: true });
}

/**
 * Converts Uint8Array to DataURL for preview or download (chunked for maximum performance)
 */
export function pdfBytesToDataUrl(pdfBytes: Uint8Array): string {
  let binary = '';
  const chunkSize = 8192;
  const len = pdfBytes.byteLength;
  for (let i = 0; i < len; i += chunkSize) {
    const sub = pdfBytes.subarray(i, Math.min(i + chunkSize, len));
    binary += String.fromCharCode.apply(null, sub as any);
  }
  return 'data:application/pdf;base64,' + btoa(binary);
}
