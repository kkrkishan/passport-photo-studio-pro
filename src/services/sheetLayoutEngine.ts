import { SheetConfig, PAPER_PRESETS } from '../types';

export function mmToPx(mm: number, dpi: number = 300): number {
  return Math.round((mm / 25.4) * dpi);
}

export function pxToMm(px: number, dpi: number = 300): number {
  return (px * 25.4) / dpi;
}

export interface PhotoPlacement {
  pageIndex: number;
  xMm: number;
  yMm: number;
  widthMm: number;
  heightMm: number;
  row: number;
  col: number;
  index: number;
}

export interface SheetCalculationResult {
  orientation: 'portrait' | 'landscape';
  sheetWidthMm: number;
  sheetHeightMm: number;
  sheetWidthPx: number;
  sheetHeightPx: number;
  rows: number;
  columns: number;
  capacityPerSheet: number;
  totalPages: number;
  totalPhotos: number;
  placements: PhotoPlacement[];
  printableWidthMm: number;
  printableHeightMm: number;
  warning?: string;
  recommendedOrientation: 'portrait' | 'landscape';
}

/**
 * Calculates optimal layout for passport photos on standard sheets
 */
export function calculateSheetLayout(
  photoWidthMm: number,
  photoHeightMm: number,
  config: SheetConfig
): SheetCalculationResult {
  // 1. Resolve base sheet dimensions
  let baseWidthMm = config.customWidthMm;
  let baseHeightMm = config.customHeightMm;

  const preset = PAPER_PRESETS.find(p => p.id === config.paperId);
  if (preset && preset.id !== 'custom') {
    baseWidthMm = preset.widthMm;
    baseHeightMm = preset.heightMm;
  }

  // Helper to compute layout for a given sheet size
  const computeFit = (sheetW: number, sheetH: number) => {
    const margin = config.marginMm;
    const gapX = config.gapHorizontalMm;
    const gapY = config.gapVerticalMm;

    const availableW = sheetW - 2 * margin;
    const availableH = sheetH - 2 * margin;

    if (availableW < photoWidthMm || availableH < photoHeightMm) {
      return { cols: 0, rows: 0, capacity: 0, availableW, availableH, startX: margin, startY: margin };
    }

    // Number of columns: (cols * photoW) + ((cols - 1) * gapX) <= availableW
    // cols * (photoW + gapX) - gapX <= availableW
    // cols <= (availableW + gapX) / (photoW + gapX)
    const cols = Math.max(1, Math.floor((availableW + gapX) / (photoWidthMm + gapX)));
    const rows = Math.max(1, Math.floor((availableH + gapY) / (photoHeightMm + gapY)));
    const capacity = cols * rows;

    // Center alignment offsets
    const totalUsedW = cols * photoWidthMm + (cols - 1) * gapX;
    const totalUsedH = rows * photoHeightMm + (rows - 1) * gapY;
    const startX = config.centerAlign ? margin + (availableW - totalUsedW) / 2 : margin;
    const startY = config.centerAlign ? margin + (availableH - totalUsedH) / 2 : margin;

    return { cols, rows, capacity, availableW, availableH, startX, startY };
  };

  // Dimensions in portrait (width <= height)
  const pW = Math.min(baseWidthMm, baseHeightMm);
  const pH = Math.max(baseWidthMm, baseHeightMm);

  // Dimensions in landscape
  const lW = pH;
  const lH = pW;

  const fitPortrait = computeFit(pW, pH);
  const fitLandscape = computeFit(lW, lH);

  const recommendedOrientation: 'portrait' | 'landscape' =
    fitLandscape.capacity > fitPortrait.capacity ? 'landscape' : 'portrait';

  // Determine active orientation
  let activeOrientation: 'portrait' | 'landscape' =
    config.orientation === 'auto'
      ? recommendedOrientation
      : config.orientation;

  const activeSheetW = activeOrientation === 'portrait' ? pW : lW;
  const activeSheetH = activeOrientation === 'portrait' ? pH : lH;
  const activeFit = activeOrientation === 'portrait' ? fitPortrait : fitLandscape;

  let warning: string | undefined;
  if (activeFit.capacity === 0) {
    warning = `Selected photo dimensions (${photoWidthMm}×${photoHeightMm} mm) exceed printable sheet area!`;
  } else if (config.paperId === '4x6' && config.copies === 8 && activeFit.capacity < 8) {
    warning = `Standard 8-photo layout does not fit on 4×6" with current margins (${config.marginMm}mm) and gaps (${config.gapHorizontalMm}mm). Capacity: ${activeFit.capacity} photos.`;
  }

  // Generate placements across pages
  const placements: PhotoPlacement[] = [];
  const capacity = Math.max(1, activeFit.capacity);
  const totalPages = Math.max(1, Math.ceil(config.copies / capacity));

  let remaining = config.copies;
  let photoIdx = 0;

  for (let page = 0; page < totalPages; page++) {
    const countThisPage = Math.min(remaining, capacity);
    let placedOnPage = 0;

    for (let r = 0; r < activeFit.rows && placedOnPage < countThisPage; r++) {
      for (let c = 0; c < activeFit.cols && placedOnPage < countThisPage; c++) {
        const xMm = activeFit.startX + c * (photoWidthMm + config.gapHorizontalMm);
        const yMm = activeFit.startY + r * (photoHeightMm + config.gapVerticalMm);

        placements.push({
          pageIndex: page,
          xMm,
          yMm,
          widthMm: photoWidthMm,
          heightMm: photoHeightMm,
          row: r,
          col: c,
          index: photoIdx++,
        });

        placedOnPage++;
      }
    }

    remaining -= countThisPage;
  }

  return {
    orientation: activeOrientation,
    sheetWidthMm: activeSheetW,
    sheetHeightMm: activeSheetH,
    sheetWidthPx: mmToPx(activeSheetW, config.dpi),
    sheetHeightPx: mmToPx(activeSheetH, config.dpi),
    rows: activeFit.rows,
    columns: activeFit.cols,
    capacityPerSheet: activeFit.capacity,
    totalPages,
    totalPhotos: config.copies,
    placements,
    printableWidthMm: activeFit.availableW,
    printableHeightMm: activeFit.availableH,
    warning,
    recommendedOrientation,
  };
}

/**
 * Draws the photo sheet with cut lines, borders and high-resolution photos onto a canvas
 */
export function renderSheetToCanvas(
  targetCanvas: HTMLCanvasElement,
  photoImage: HTMLImageElement | HTMLCanvasElement,
  calculation: SheetCalculationResult,
  config: SheetConfig,
  pageIndex: number = 0
): void {
  const { sheetWidthPx, sheetHeightPx, placements } = calculation;
  const dpi = config.dpi;

  targetCanvas.width = sheetWidthPx;
  targetCanvas.height = sheetHeightPx;

  const ctx = targetCanvas.getContext('2d');
  if (!ctx) return;

  // 1. Draw clean white paper background
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, sheetWidthPx, sheetHeightPx);

  // 2. Filter placements for requested page
  const pagePlacements = placements.filter(p => p.pageIndex === pageIndex);

  // 3. Render each photo
  for (const item of pagePlacements) {
    const x = mmToPx(item.xMm, dpi);
    const y = mmToPx(item.yMm, dpi);
    const w = mmToPx(item.widthMm, dpi);
    const h = mmToPx(item.heightMm, dpi);

    // Draw photo
    ctx.drawImage(photoImage, x, y, w, h);

    // Optional border around photo
    if (config.showBorders) {
      ctx.strokeStyle = config.borderColor;
      ctx.lineWidth = Math.max(1, Math.round(config.borderWidthPx * (dpi / 300)));
      ctx.strokeRect(x, y, w, h);
    }

    // Optional scissor cut lines / crosshairs
    if (config.showCutLines) {
      ctx.save();
      ctx.strokeStyle = '#94a3b8';
      ctx.lineWidth = 1;

      const markLen = mmToPx(2.5, dpi); // 2.5 mm crosshair marks

      // Corner cross marks
      // Top-Left
      drawCross(ctx, x, y, markLen);
      // Top-Right
      drawCross(ctx, x + w, y, markLen);
      // Bottom-Left
      drawCross(ctx, x, y + h, markLen);
      // Bottom-Right
      drawCross(ctx, x + w, y + h, markLen);

      ctx.restore();
    }
  }

  // Page index & Studio watermark along footer in ultra-small subtle text
  ctx.save();
  ctx.font = `${Math.round(dpi / 40)}px sans-serif`;
  ctx.fillStyle = '#cbd5e1';
  ctx.fillText(
    `Passport Photo Studio Pro • Page ${pageIndex + 1} of ${calculation.totalPages} • 300 DPI 100% Scale`,
    mmToPx(6, dpi),
    sheetHeightPx - mmToPx(2, dpi)
  );
  ctx.restore();
}

function drawCross(ctx: CanvasRenderingContext2D, cx: number, cy: number, len: number) {
  ctx.beginPath();
  ctx.moveTo(cx - len, cy);
  ctx.lineTo(cx + len, cy);
  ctx.moveTo(cx, cy - len);
  ctx.lineTo(cx, cy + len);
  ctx.stroke();
}
