import * as pdfjsLib from 'pdfjs-dist';

// Configure worker using Vite URL resolution
if (typeof window !== 'undefined' && pdfjsLib.GlobalWorkerOptions) {
  try {
    pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
      'pdfjs-dist/build/pdf.worker.min.mjs',
      import.meta.url
    ).href;
  } catch {
    // Fallback if URL constructor fails
    pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.10.38/pdf.worker.min.mjs';
  }
}

export interface RenderedPdfPage {
  canvas: HTMLCanvasElement;
  widthPt: number;
  heightPt: number;
  pageNumber: number;
}

/**
 * Loads a PDF from bytes and renders specified pages (or all pages) to canvases
 */
export async function renderPdfToCanvases(
  pdfBytes: ArrayBuffer | Uint8Array,
  options?: {
    maxPages?: number;
    dpi?: number;
    scale?: number;
    targetWidthPx?: number;
  }
): Promise<RenderedPdfPage[]> {
  const loadingTask = pdfjsLib.getDocument({
    data: pdfBytes instanceof Uint8Array ? pdfBytes : new Uint8Array(pdfBytes),
    useSystemFonts: true,
  });

  const pdfDoc = await loadingTask.promise;
  const numPages = pdfDoc.numPages;
  const pagesToRender = options?.maxPages ? Math.min(numPages, options.maxPages) : numPages;
  const results: RenderedPdfPage[] = [];

  const targetDpi = options?.dpi || 150;
  // 72 points per inch in PDF standard
  const baseScale = options?.scale || (targetDpi / 72);

  for (let pageNum = 1; pageNum <= pagesToRender; pageNum++) {
    const page = await pdfDoc.getPage(pageNum);
    const unscaledViewport = page.getViewport({ scale: 1.0 });

    let finalScale = baseScale;
    if (options?.targetWidthPx) {
      finalScale = options.targetWidthPx / unscaledViewport.width;
    }

    const viewport = page.getViewport({ scale: finalScale });
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(viewport.width);
    canvas.height = Math.round(viewport.height);

    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) continue;

    // Fill clean white background
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    await (page as any).render({
      canvasContext: ctx,
      canvas: canvas,
      viewport,
    }).promise;

    results.push({
      canvas,
      widthPt: unscaledViewport.width,
      heightPt: unscaledViewport.height,
      pageNumber: pageNum,
    });
  }

  return results;
}
