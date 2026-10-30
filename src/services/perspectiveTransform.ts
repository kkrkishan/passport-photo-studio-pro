import { DocumentCorners, Point2D } from '../types';

/**
 * High-Precision Document & ID Card Corner Auto-Detection Engine.
 * Robustly detects ID cards (Aadhaar, Voter ID, PAN, Driving Licence) in real-world mobile photos
 * using multi-threshold gradient analysis, edge line regression, and line intersection.
 */
export function autoDetectDocumentCorners(
  imageData: ImageData
): DocumentCorners {
  const w = imageData.width;
  const h = imageData.height;
  const data = imageData.data;

  // 1. Downsample to standardized grid (max dim 360px) for speed & noise suppression
  const maxDim = 360;
  const scale = Math.max(1, Math.max(w, h) / maxDim);
  const gw = Math.max(30, Math.floor(w / scale));
  const gh = Math.max(30, Math.floor(h / scale));

  // Compute luminance
  const lum = new Float32Array(gw * gh);
  let totalLum = 0;
  for (let gy = 0; gy < gh; gy++) {
    const origY = Math.min(h - 1, Math.floor(gy * scale));
    for (let gx = 0; gx < gw; gx++) {
      const origX = Math.min(w - 1, Math.floor(gx * scale));
      const idx = (origY * w + origX) * 4;
      const l = 0.299 * data[idx] + 0.587 * data[idx + 1] + 0.114 * data[idx + 2];
      lum[gy * gw + gx] = l;
      totalLum += l;
    }
  }

  // 2. Sobel Edge Gradient Filter
  const grad = new Float32Array(gw * gh);
  let maxGradVal = 0;

  for (let gy = 1; gy < gh - 1; gy++) {
    for (let gx = 1; gx < gw - 1; gx++) {
      const gxDiff =
        -lum[(gy - 1) * gw + (gx - 1)] + lum[(gy - 1) * gw + (gx + 1)] -
        2 * lum[gy * gw + (gx - 1)] + 2 * lum[gy * gw + (gx + 1)] -
        lum[(gy + 1) * gw + (gx - 1)] + lum[(gy + 1) * gw + (gx + 1)];

      const gyDiff =
        -lum[(gy - 1) * gw + (gx - 1)] - 2 * lum[(gy - 1) * gw + gx] - lum[(gy - 1) * gw + (gx + 1)] +
        lum[(gy + 1) * gw + (gx - 1)] + 2 * lum[(gy + 1) * gw + gx] + lum[(gy + 1) * gw + (gx + 1)];

      const gVal = Math.hypot(gxDiff, gyDiff);
      grad[gy * gw + gx] = gVal;
      if (gVal > maxGradVal) maxGradVal = gVal;
    }
  }

  // Adaptive threshold
  const edgeThreshold = Math.max(30, maxGradVal * 0.18);

  // 3. Scan 4 principal boundaries from frame borders inward toward center
  // Collect candidate edge points for Top, Bottom, Left, and Right sides of the card
  const topEdgePoints: Point2D[] = [];
  const bottomEdgePoints: Point2D[] = [];
  const leftEdgePoints: Point2D[] = [];
  const rightEdgePoints: Point2D[] = [];

  const marginX = Math.floor(gw * 0.08);
  const marginY = Math.floor(gh * 0.08);
  const step = Math.max(2, Math.floor(gw / 30));

  // Top Edge: Scan vertically down from top border across columns
  for (let gx = marginX; gx < gw - marginX; gx += step) {
    for (let gy = marginY; gy < Math.floor(gh * 0.45); gy++) {
      if (grad[gy * gw + gx] > edgeThreshold) {
        topEdgePoints.push({ x: gx, y: gy });
        break;
      }
    }
  }

  // Bottom Edge: Scan vertically up from bottom border across columns
  for (let gx = marginX; gx < gw - marginX; gx += step) {
    for (let gy = gh - marginY - 1; gy > Math.floor(gh * 0.55); gy--) {
      if (grad[gy * gw + gx] > edgeThreshold) {
        bottomEdgePoints.push({ x: gx, y: gy });
        break;
      }
    }
  }

  // Left Edge: Scan horizontally right from left border across rows
  for (let gy = marginY; gy < gh - marginY; gy += step) {
    for (let gx = marginX; gx < Math.floor(gw * 0.45); gx++) {
      if (grad[gy * gw + gx] > edgeThreshold) {
        leftEdgePoints.push({ x: gx, y: gy });
        break;
      }
    }
  }

  // Right Edge: Scan horizontally left from right border across rows
  for (let gy = marginY; gy < gh - marginY; gy += step) {
    for (let gx = gw - marginX - 1; gx > Math.floor(gw * 0.55); gx--) {
      if (grad[gy * gw + gx] > edgeThreshold) {
        rightEdgePoints.push({ x: gx, y: gy });
        break;
      }
    }
  }

  // 4. Line Fitting: Fit line equations to the 4 card edges
  // y = m*x + c for horizontal lines (top, bottom)
  function fitHorizontalLine(points: Point2D[], defaultY: number): { m: number; c: number } {
    if (points.length < 3) return { m: 0, c: defaultY };
    let sumX = 0, sumY = 0, sumXY = 0, sumXX = 0;
    for (const p of points) {
      sumX += p.x;
      sumY += p.y;
      sumXY += p.x * p.y;
      sumXX += p.x * p.x;
    }
    const n = points.length;
    const denom = n * sumXX - sumX * sumX;
    if (Math.abs(denom) < 1e-5) return { m: 0, c: sumY / n };
    const m = (n * sumXY - sumX * sumY) / denom;
    const c = (sumY - m * sumX) / n;
    // Clamp slope to reasonable card tilt (-0.5 to 0.5)
    const clampedM = Math.max(-0.5, Math.min(0.5, m));
    return { m: clampedM, c: (sumY - clampedM * sumX) / n };
  }

  // x = m*y + c for vertical lines (left, right)
  function fitVerticalLine(points: Point2D[], defaultX: number): { m: number; c: number } {
    if (points.length < 3) return { m: 0, c: defaultX };
    let sumX = 0, sumY = 0, sumXY = 0, sumYY = 0;
    for (const p of points) {
      sumX += p.x;
      sumY += p.y;
      sumXY += p.x * p.y;
      sumYY += p.y * p.y;
    }
    const n = points.length;
    const denom = n * sumYY - sumY * sumY;
    if (Math.abs(denom) < 1e-5) return { m: 0, c: sumX / n };
    const m = (n * sumXY - sumY * sumX) / denom;
    const c = (sumX - m * sumY) / n;
    const clampedM = Math.max(-0.5, Math.min(0.5, m));
    return { m: clampedM, c: (sumX - clampedM * sumY) / n };
  }

  const topLine = fitHorizontalLine(topEdgePoints, gh * 0.12);
  const bottomLine = fitHorizontalLine(bottomEdgePoints, gh * 0.88);
  const leftLine = fitVerticalLine(leftEdgePoints, gw * 0.10);
  const rightLine = fitVerticalLine(rightEdgePoints, gw * 0.90);

  // 5. Intersect lines to find 4 corner points
  // Intersection of y = m_h * x + c_h and x = m_v * y + c_v
  // y = m_h * (m_v * y + c_v) + c_h  =>  y * (1 - m_h * m_v) = m_h * c_v + c_h
  function intersectLines(
    hLine: { m: number; c: number },
    vLine: { m: number; c: number },
    fallbackX: number,
    fallbackY: number
  ): Point2D {
    const denom = 1 - hLine.m * vLine.m;
    if (Math.abs(denom) < 1e-4) return { x: fallbackX, y: fallbackY };
    const y = (hLine.m * vLine.c + hLine.c) / denom;
    const x = vLine.m * y + vLine.c;
    return {
      x: Math.round(Math.max(2, Math.min(gw - 2, x))),
      y: Math.round(Math.max(2, Math.min(gh - 2, y))),
    };
  }

  const tlG = intersectLines(topLine, leftLine, gw * 0.10, gh * 0.12);
  const trG = intersectLines(topLine, rightLine, gw * 0.90, gh * 0.12);
  const brG = intersectLines(bottomLine, rightLine, gw * 0.90, gh * 0.88);
  const blG = intersectLines(bottomLine, leftLine, gw * 0.10, gh * 0.88);

  // Scale back to full image resolution
  const tl: Point2D = { x: Math.round(tlG.x * scale), y: Math.round(tlG.y * scale) };
  const tr: Point2D = { x: Math.round(trG.x * scale), y: Math.round(trG.y * scale) };
  const br: Point2D = { x: Math.round(brG.x * scale), y: Math.round(brG.y * scale) };
  const bl: Point2D = { x: Math.round(blG.x * scale), y: Math.round(blG.y * scale) };

  // 6. Convexity and Card Proportion Validation
  const widthTop = Math.hypot(tr.x - tl.x, tr.y - tl.y);
  const widthBottom = Math.hypot(br.x - bl.x, br.y - bl.y);
  const heightLeft = Math.hypot(bl.x - tl.x, bl.y - tl.y);
  const heightRight = Math.hypot(br.x - tr.x, br.y - tr.y);

  const avgW = (widthTop + widthBottom) / 2;
  const avgH = (heightLeft + heightRight) / 2;
  const detectedAspect = avgW / Math.max(1, avgH);

  // Quad area using shoelace formula
  const quadArea = 0.5 * Math.abs(
    (tl.x * tr.y - tr.x * tl.y) +
    (tr.x * br.y - br.x * tr.y) +
    (br.x * bl.y - bl.x * br.y) +
    (bl.x * tl.y - tl.x * bl.y)
  );
  const totalArea = w * h;

  // Standard ID card is ~1.58 aspect ratio (Aadhaar, PAN, Voter ID). Allow 1.1 to 2.2
  const isValidCard =
    quadArea > totalArea * 0.12 &&
    quadArea < totalArea * 0.96 &&
    detectedAspect >= 1.05 &&
    detectedAspect <= 2.4 &&
    tl.x < tr.x && bl.x < br.x &&
    tl.y < bl.y && tr.y < br.y;

  if (isValidCard) {
    return {
      topLeft: tl,
      topRight: tr,
      bottomRight: br,
      bottomLeft: bl,
    };
  }

  // Fallback: Centered official ID card preset box (85.6 x 54 mm = 1.585 aspect)
  return getCardPresetCorners(w, h);
}

/**
 * Returns centered ID card aspect ratio (85.6 x 54 mm = 1.585 aspect ratio) corners
 */
export function getCardPresetCorners(w: number, h: number): DocumentCorners {
  const cardAspect = 85.6 / 54.0;
  let boxW = w * 0.84;
  let boxH = boxW / cardAspect;

  if (boxH > h * 0.84) {
    boxH = h * 0.84;
    boxW = boxH * cardAspect;
  }

  const startX = Math.round((w - boxW) / 2);
  const startY = Math.round((h - boxH) / 2);

  return {
    topLeft: { x: startX, y: startY },
    topRight: { x: Math.round(startX + boxW), y: startY },
    bottomRight: { x: Math.round(startX + boxW), y: Math.round(startY + boxH) },
    bottomLeft: { x: startX, y: Math.round(startY + boxH) },
  };
}

/**
 * Returns full outer boundary corners
 */
export function getFullImageCorners(w: number, h: number): DocumentCorners {
  const marginX = Math.round(w * 0.04);
  const marginY = Math.round(h * 0.04);
  return {
    topLeft: { x: marginX, y: marginY },
    topRight: { x: w - marginX, y: marginY },
    bottomRight: { x: w - marginX, y: h - marginY },
    bottomLeft: { x: marginX, y: h - marginY },
  };
}

/**
 * Homography Matrix Calculation (Direct Linear Transformation)
 * Solves the 8-unknown system H * src = dst
 */
export function calculateHomographyMatrix(
  srcCorners: DocumentCorners,
  dstW: number,
  dstH: number
): number[] {
  const { topLeft: tl, topRight: tr, bottomRight: br, bottomLeft: bl } = srcCorners;

  const srcPoints = [
    [tl.x, tl.y],
    [tr.x, tr.y],
    [br.x, br.y],
    [bl.x, bl.y],
  ];

  const dstPoints = [
    [0, 0],
    [dstW, 0],
    [dstW, dstH],
    [0, dstH],
  ];

  const A: number[][] = [];
  const b: number[] = [];

  for (let i = 0; i < 4; i++) {
    const [sx, sy] = srcPoints[i];
    const [dx, dy] = dstPoints[i];

    A.push([sx, sy, 1, 0, 0, 0, -dx * sx, -dx * sy]);
    b.push(dx);

    A.push([0, 0, 0, sx, sy, 1, -dy * sx, -dy * sy]);
    b.push(dy);
  }

  const h = solve8x8LinearSystem(A, b);
  return [h[0], h[1], h[2], h[3], h[4], h[5], h[6], h[7], 1.0];
}

/**
 * Gaussian elimination with partial pivoting for 8x8 system
 */
function solve8x8LinearSystem(A: number[][], b: number[]): number[] {
  const n = 8;
  const M: number[][] = [];
  for (let i = 0; i < n; i++) {
    M.push([...A[i], b[i]]);
  }

  for (let i = 0; i < n; i++) {
    let maxRow = i;
    for (let k = i + 1; k < n; k++) {
      if (Math.abs(M[k][i]) > Math.abs(M[maxRow][i])) {
        maxRow = k;
      }
    }
    const temp = M[i];
    M[i] = M[maxRow];
    M[maxRow] = temp;

    const pivot = M[i][i];
    if (Math.abs(pivot) < 1e-10) continue;

    for (let k = i; k <= n; k++) {
      M[i][k] /= pivot;
    }

    for (let j = 0; j < n; j++) {
      if (j !== i) {
        const factor = M[j][i];
        for (let k = i; k <= n; k++) {
          M[j][k] -= factor * M[i][k];
        }
      }
    }
  }

  const res: number[] = [];
  for (let i = 0; i < n; i++) {
    res.push(M[i][n]);
  }
  return res;
}

/**
 * Applies perspective warp transformation (homography) to a source canvas/image
 */
export function warpPerspective(
  sourceImage: HTMLImageElement | HTMLCanvasElement,
  corners: DocumentCorners,
  outputWidth?: number,
  outputHeight?: number
): HTMLCanvasElement {
  const topDist = Math.hypot(corners.topRight.x - corners.topLeft.x, corners.topRight.y - corners.topLeft.y);
  const bottomDist = Math.hypot(corners.bottomRight.x - corners.bottomLeft.x, corners.bottomRight.y - corners.bottomLeft.y);
  const leftDist = Math.hypot(corners.bottomLeft.x - corners.topLeft.x, corners.bottomLeft.y - corners.topLeft.y);
  const rightDist = Math.hypot(corners.bottomRight.x - corners.topRight.x, corners.bottomRight.y - corners.topRight.y);

  const finalWidth = Math.round(outputWidth || Math.max(topDist, bottomDist));
  const finalHeight = Math.round(outputHeight || Math.max(leftDist, rightDist));

  const outputCanvas = document.createElement('canvas');
  outputCanvas.width = finalWidth;
  outputCanvas.height = finalHeight;
  const outCtx = outputCanvas.getContext('2d');
  if (!outCtx) return outputCanvas;

  const srcCanvas = document.createElement('canvas');
  srcCanvas.width = sourceImage.width;
  srcCanvas.height = sourceImage.height;
  const srcCtx = srcCanvas.getContext('2d');
  if (!srcCtx) return outputCanvas;

  srcCtx.drawImage(sourceImage, 0, 0);
  const srcImgData = srcCtx.getImageData(0, 0, srcCanvas.width, srcCanvas.height);
  const dstImgData = outCtx.createImageData(finalWidth, finalHeight);

  const H = calculateHomographyMatrix(corners, finalWidth, finalHeight);

  // Invert H matrix
  const Hinv = invert3x3(H);
  if (!Hinv) {
    outCtx.drawImage(sourceImage, 0, 0, finalWidth, finalHeight);
    return outputCanvas;
  }

  const srcData = srcImgData.data;
  const dstData = dstImgData.data;
  const sw = srcCanvas.width;
  const sh = srcCanvas.height;

  for (let dy = 0; dy < finalHeight; dy++) {
    for (let dx = 0; dx < finalWidth; dx++) {
      const z = Hinv[6] * dx + Hinv[7] * dy + Hinv[8];
      if (Math.abs(z) < 1e-8) continue;

      const sx = (Hinv[0] * dx + Hinv[1] * dy + Hinv[2]) / z;
      const sy = (Hinv[3] * dx + Hinv[4] * dy + Hinv[5]) / z;

      if (sx >= 0 && sx < sw - 1 && sy >= 0 && sy < sh - 1) {
        // Bilinear interpolation
        const x0 = Math.floor(sx);
        const y0 = Math.floor(sy);
        const x1 = x0 + 1;
        const y1 = y0 + 1;

        const fx = sx - x0;
        const fy = sy - y0;

        const idx00 = (y0 * sw + x0) * 4;
        const idx10 = (y0 * sw + x1) * 4;
        const idx01 = (y1 * sw + x0) * 4;
        const idx11 = (y1 * sw + x1) * 4;

        const dstIdx = (dy * finalWidth + dx) * 4;

        for (let c = 0; c < 3; c++) {
          const val =
            (1 - fx) * (1 - fy) * srcData[idx00 + c] +
            fx * (1 - fy) * srcData[idx10 + c] +
            (1 - fx) * fy * srcData[idx01 + c] +
            fx * fy * srcData[idx11 + c];
          dstData[dstIdx + c] = Math.round(val);
        }
        dstData[dstIdx + 3] = 255;
      }
    }
  }

  outCtx.putImageData(dstImgData, 0, 0);
  return outputCanvas;
}

/**
 * 3x3 Matrix Inversion for backward mapping
 */
function invert3x3(m: number[]): number[] | null {
  const a = m[0], b = m[1], c = m[2];
  const d = m[3], e = m[4], f = m[5];
  const g = m[6], h = m[7], k = m[8];

  const A = e * k - f * h;
  const B = -(d * k - f * g);
  const C = d * h - e * g;
  const D = -(b * k - c * h);
  const E = a * k - c * g;
  const F = -(a * h - b * g);
  const G = b * f - c * e;
  const H_val = -(a * f - c * d);
  const K = a * e - b * d;

  const det = a * A + b * B + c * C;
  if (Math.abs(det) < 1e-12) return null;

  const invDet = 1.0 / det;
  return [
    A * invDet, D * invDet, G * invDet,
    B * invDet, E * invDet, H_val * invDet,
    C * invDet, F * invDet, K * invDet,
  ];
}

/**
 * Document enhancement filters (Magic Color, High-contrast B&W, Grayscale, Text Boost)
 */
export function applyDocumentEnhance(
  imageData: ImageData,
  filterMode: 'original' | 'magic' | 'bw' | 'grayscale' | 'enhanced',
  adjustments?: { brightness: number; contrast: number; sharpness: number; exposure: number }
): ImageData {
  if (filterMode === 'original' && !adjustments) return imageData;

  const data = imageData.data;
  const len = data.length;

  const bOffset = adjustments ? (adjustments.brightness / 100) * 100 : 0;
  const cFactor = adjustments
    ? adjustments.contrast === 100
      ? 10
      : (259 * (adjustments.contrast + 255)) / (255 * (259 - adjustments.contrast))
    : 1;

  for (let i = 0; i < len; i += 4) {
    let r = data[i];
    let g = data[i + 1];
    let b = data[i + 2];

    const lum = 0.299 * r + 0.587 * g + 0.114 * b;

    if (filterMode === 'bw') {
      // High-contrast clean black and white
      const threshold = 145;
      const val = lum > threshold ? 255 : Math.max(0, (lum - 30) * 1.8);
      r = val;
      g = val;
      b = val;
    } else if (filterMode === 'grayscale') {
      // Clean document grayscale with gamma boost
      let val = Math.pow(lum / 255, 0.85) * 255;
      val = Math.min(255, Math.max(0, val * 1.1 - 10));
      r = val;
      g = val;
      b = val;
    } else if (filterMode === 'magic') {
      // Magic Color: Cleans yellowish paper shadows while boosting text & seal colors
      const whiteBoost = lum > 165 ? 1 + ((lum - 165) / 90) * 0.45 : 1;
      r = Math.min(255, r * whiteBoost * 1.05);
      g = Math.min(255, g * whiteBoost * 1.05);
      b = Math.min(255, b * whiteBoost * 1.05);

      // Contrast curve
      r = ((r / 255 - 0.5) * 1.25 + 0.5) * 255;
      g = ((g / 255 - 0.5) * 1.25 + 0.5) * 255;
      b = ((b / 255 - 0.5) * 1.25 + 0.5) * 255;
    } else if (filterMode === 'enhanced') {
      // General balanced document contrast
      r = Math.min(255, r * 1.08 + 5);
      g = Math.min(255, g * 1.08 + 5);
      b = Math.min(255, b * 1.08 + 5);
    }

    // Apply manual adjustment sliders if provided
    if (adjustments) {
      if (bOffset !== 0) {
        r += bOffset;
        g += bOffset;
        b += bOffset;
      }
      if (cFactor !== 1) {
        r = cFactor * (r - 128) + 128;
        g = cFactor * (g - 128) + 128;
        b = cFactor * (b - 128) + 128;
      }
    }

    data[i] = Math.max(0, Math.min(255, r));
    data[i + 1] = Math.max(0, Math.min(255, g));
    data[i + 2] = Math.max(0, Math.min(255, b));
  }

  return imageData;
}
