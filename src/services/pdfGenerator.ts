import { jsPDF } from 'jspdf';
import { SheetCalculationResult, renderSheetToCanvas } from './sheetLayoutEngine';
import { A4LayoutSettings, DocumentSet, SheetConfig } from '../types';

/**
 * Generates high-precision PDF for Passport Photo Sheets
 */
export async function generatePassportSheetPDF(
  photoImage: HTMLImageElement | HTMLCanvasElement,
  calculation: SheetCalculationResult,
  config: SheetConfig
): Promise<string> {
  const { sheetWidthMm, sheetHeightMm, totalPages, orientation } = calculation;

  const doc = new jsPDF({
    orientation: orientation === 'portrait' ? 'p' : 'l',
    unit: 'mm',
    format: [sheetWidthMm, sheetHeightMm],
    compress: true,
  });

  const tempCanvas = document.createElement('canvas');

  for (let page = 0; page < totalPages; page++) {
    if (page > 0) {
      doc.addPage([sheetWidthMm, sheetHeightMm], orientation === 'portrait' ? 'p' : 'l');
    }

    renderSheetToCanvas(tempCanvas, photoImage, calculation, config, page);
    const imgData = tempCanvas.toDataURL('image/jpeg', 0.95);

    // Place exactly filling the page dimensions with 0 margins
    doc.addImage(imgData, 'JPEG', 0, 0, sheetWidthMm, sheetHeightMm, undefined, 'FAST');
  }

  return doc.output('datauristring');
}

/**
 * Generates print-ready A4 PDF for Document Scanner (Front + Back)
 */
export async function generateDocumentA4PDF(
  documentSets: DocumentSet[],
  layoutSettings: A4LayoutSettings
): Promise<string> {
  const a4WidthMm = 210;
  const a4HeightMm = 297;

  const doc = new jsPDF({
    orientation: 'p',
    unit: 'mm',
    format: 'a4',
    compress: true,
  });

  const tempCanvas = document.createElement('canvas');

  for (let idx = 0; idx < documentSets.length; idx++) {
    const set = documentSets[idx];
    if (idx > 0) {
      doc.addPage('a4', 'p');
    }

    await renderA4DocumentPageToCanvas(tempCanvas, set, layoutSettings);
    const imgData = tempCanvas.toDataURL('image/jpeg', 0.95);

    doc.addImage(imgData, 'JPEG', 0, 0, a4WidthMm, a4HeightMm, undefined, 'FAST');
  }

  return doc.output('datauristring');
}

/**
 * Renders an A4 document page containing Front + Back cards to a canvas at 300 DPI
 */
export async function renderA4DocumentPageToCanvas(
  canvas: HTMLCanvasElement,
  set: DocumentSet,
  settings: A4LayoutSettings
): Promise<void> {
  const dpi = settings.dpi;
  const mmToPx = (mm: number) => Math.round((mm / 25.4) * dpi);

  const a4WidthPx = mmToPx(210);
  const a4HeightPx = mmToPx(297);

  canvas.width = a4WidthPx;
  canvas.height = a4HeightPx;

  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  // 1. Fill clean white A4 page
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, a4WidthPx, a4HeightPx);

  const cardW_Px = mmToPx(settings.targetWidthMm);
  const cardH_Px = mmToPx(settings.targetHeightMm);
  const gapPx = mmToPx(settings.gapMm);
  const topMarginPx = mmToPx(settings.topMarginMm);

  // Helper to load image
  const loadImage = (src: string): Promise<HTMLImageElement> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = src;
    });
  };

  const frontSrc = set.front.enhancedImage || set.front.rectifiedImage || set.front.rawImage;
  const backSrc = set.back.enhancedImage || set.back.rectifiedImage || set.back.rawImage;

  let frontImg: HTMLImageElement | null = null;
  let backImg: HTMLImageElement | null = null;

  if (frontSrc) frontImg = await loadImage(frontSrc);
  if (backSrc) backImg = await loadImage(backSrc);

  const drawCard = (
    img: HTMLImageElement | null,
    x: number,
    y: number,
    label: string
  ) => {
    if (img) {
      ctx.drawImage(img, x, y, cardW_Px, cardH_Px);
    } else {
      // Placeholder dashed rect
      ctx.save();
      ctx.setLineDash([8, 8]);
      ctx.strokeStyle = '#cbd5e1';
      ctx.lineWidth = 2;
      ctx.strokeRect(x, y, cardW_Px, cardH_Px);
      ctx.fillStyle = '#94a3b8';
      ctx.font = `${Math.round(dpi / 25)}px sans-serif`;
      ctx.textAlign = 'center';
      ctx.fillText(`No ${label} Provided`, x + cardW_Px / 2, y + cardH_Px / 2);
      ctx.restore();
    }

    // Border
    if (settings.showBorders) {
      ctx.strokeStyle = '#000000';
      ctx.lineWidth = Math.max(1, Math.round(dpi / 300));
      ctx.strokeRect(x, y, cardW_Px, cardH_Px);
    }

    // Label
    if (settings.showLabels) {
      ctx.save();
      ctx.fillStyle = '#334155';
      ctx.font = `bold ${Math.round(dpi / 28)}px sans-serif`;
      ctx.textAlign = 'center';
      ctx.fillText(label, x + cardW_Px / 2, y - mmToPx(3));
      ctx.restore();
    }

    // Cut Marks
    if (settings.showCutLines) {
      ctx.save();
      ctx.strokeStyle = '#64748b';
      ctx.lineWidth = 1;
      const len = mmToPx(3);
      drawCornerMarks(ctx, x, y, cardW_Px, cardH_Px, len);
      ctx.restore();
    }
  };

  if (settings.arrangement === 'vertical') {
    // Front on Top, Back on Bottom centered horizontally
    const centerX = (a4WidthPx - cardW_Px) / 2;
    const frontY = topMarginPx;
    const backY = frontY + cardH_Px + gapPx;

    drawCard(frontImg, centerX, frontY, 'FRONT SIDE');
    if (backImg || frontImg) {
      drawCard(backImg, centerX, backY, 'BACK SIDE');
    }
  } else {
    // Front on Left, Back on Right
    const totalW = cardW_Px * 2 + gapPx;
    const startX = (a4WidthPx - totalW) / 2;
    const startY = topMarginPx;

    drawCard(frontImg, startX, startY, 'FRONT SIDE');
    drawCard(backImg, startX + cardW_Px + gapPx, startY, 'BACK SIDE');
  }

  // Header / Document Set title
  ctx.save();
  ctx.fillStyle = '#64748b';
  ctx.font = `${Math.round(dpi / 32)}px sans-serif`;
  ctx.fillText(
    `PASSPORT PHOTO STUDIO PRO • DOCUMENT SCANNER: ${set.name.toUpperCase()} (100% SCALE PRINT READY)`,
    mmToPx(15),
    mmToPx(12)
  );
  ctx.restore();
}

function drawCornerMarks(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  len: number
) {
  // Top-left
  ctx.beginPath();
  ctx.moveTo(x - len, y);
  ctx.lineTo(x + len, y);
  ctx.moveTo(x, y - len);
  ctx.lineTo(x, y + len);
  ctx.stroke();

  // Top-right
  ctx.beginPath();
  ctx.moveTo(x + w - len, y);
  ctx.lineTo(x + w + len, y);
  ctx.moveTo(x + w, y - len);
  ctx.lineTo(x + w, y + len);
  ctx.stroke();

  // Bottom-left
  ctx.beginPath();
  ctx.moveTo(x - len, y + h);
  ctx.lineTo(x + len, y + h);
  ctx.moveTo(x, y + h - len);
  ctx.lineTo(x, y + h + len);
  ctx.stroke();

  // Bottom-right
  ctx.beginPath();
  ctx.moveTo(x + w - len, y + h);
  ctx.lineTo(x + w + len, y + h);
  ctx.moveTo(x + w, y + h - len);
  ctx.lineTo(x + w, y + h + len);
  ctx.stroke();
}
