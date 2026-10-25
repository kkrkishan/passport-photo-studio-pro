import { DocumentCorners, Point2D } from '../types';

/**
 * Automatically detects document bounding quad or falls back to standard margin inset
 */
export function autoDetectDocumentCorners(
  imageData: ImageData
): DocumentCorners {
  const w = imageData.width;
  const h = imageData.height;
  const data = imageData.data;

  // Compute horizontal and vertical projection profiles of edge gradients
  // Step sample for high performance
  const step = Math.max(1, Math.floor(Math.min(w, h) / 200));
  
  let left = Math.floor(w * 0.08);
  let right = Math.floor(w * 0.92);
  let top = Math.floor(h * 0.08);
  let bottom = Math.floor(h * 0.92);

  // Analyze vertical edges (scanning left to mid, and right to mid)
  const midY = Math.floor(h / 2);
  let maxGradLeft = 0;
  let bestLeft = left;
  for (let x = Math.floor(w * 0.03); x < Math.floor(w * 0.35); x += step) {
    let diff = 0;
    for (let y = Math.floor(h * 0.2); y < Math.floor(h * 0.8); y += step * 3) {
      const idx1 = (y * w + x) * 4;
      const idx2 = (y * w + (x + step)) * 4;
      const lum1 = 0.299 * data[idx1] + 0.587 * data[idx1 + 1] + 0.114 * data[idx1 + 2];
      const lum2 = 0.299 * data[idx2] + 0.587 * data[idx2 + 1] + 0.114 * data[idx2 + 2];
      diff += Math.abs(lum1 - lum2);
    }
    if (diff > maxGradLeft) {
      maxGradLeft = diff;
      bestLeft = x;
    }
  }

  let maxGradRight = 0;
  let bestRight = right;
  for (let x = Math.floor(w * 0.97); x > Math.floor(w * 0.65); x -= step) {
    let diff = 0;
    for (let y = Math.floor(h * 0.2); y < Math.floor(h * 0.8); y += step * 3) {
      const idx1 = (y * w + x) * 4;
      const idx2 = (y * w + (x - step)) * 4;
      const lum1 = 0.299 * data[idx1] + 0.587 * data[idx1 + 1] + 0.114 * data[idx1 + 2];
      const lum2 = 0.299 * data[idx2] + 0.587 * data[idx2 + 1] + 0.114 * data[idx2 + 2];
      diff += Math.abs(lum1 - lum2);
    }
    if (diff > maxGradRight) {
      maxGradRight = diff;
      bestRight = x;
    }
  }

  // Analyze horizontal edges
  let maxGradTop = 0;
  let bestTop = top;
  for (let y = Math.floor(h * 0.03); y < Math.floor(h * 0.35); y += step) {
    let diff = 0;
    for (let x = Math.floor(w * 0.2); x < Math.floor(w * 0.8); x += step * 3) {
      const idx1 = (y * w + x) * 4;
      const idx2 = ((y + step) * w + x) * 4;
      const lum1 = 0.299 * data[idx1] + 0.587 * data[idx1 + 1] + 0.114 * data[idx1 + 2];
      const lum2 = 0.299 * data[idx2] + 0.587 * data[idx2 + 1] + 0.114 * data[idx2 + 2];
      diff += Math.abs(lum1 - lum2);
    }
    if (diff > maxGradTop) {
      maxGradTop = diff;
      bestTop = y;
    }
  }

  let maxGradBottom = 0;
  let bestBottom = bottom;
  for (let y = Math.floor(h * 0.97); y > Math.floor(h * 0.65); y -= step) {
    let diff = 0;
    for (let x = Math.floor(w * 0.2); x < Math.floor(w * 0.8); x += step * 3) {
      const idx1 = (y * w + x) * 4;
      const idx2 = ((y - step) * w + x) * 4;
      const lum1 = 0.299 * data[idx1] + 0.587 * data[idx1 + 1] + 0.114 * data[idx1 + 2];
      const lum2 = 0.299 * data[idx2] + 0.587 * data[idx2 + 1] + 0.114 * data[idx2 + 2];
      diff += Math.abs(lum1 - lum2);
    }
    if (diff > maxGradBottom) {
      maxGradBottom = diff;
      bestBottom = y;
    }
  }

  return {
    topLeft: { x: bestLeft, y: bestTop },
    topRight: { x: bestRight, y: bestTop },
    bottomRight: { x: bestRight, y: bestBottom },
    bottomLeft: { x: bestLeft, y: bestBottom },
  };
}

/**
 * Solves 8-equation linear system for 3x3 Projective Homography Matrix using Gaussian Elimination
 */
function solveHomography(
  src: [Point2D, Point2D, Point2D, Point2D],
  dst: [Point2D, Point2D, Point2D, Point2D]
): number[] {
  // src -> dst mapping
  // [ x' ]   [ h0 h1 h2 ] [ x ]
  // [ y' ] = [ h3 h4 h5 ] [ y ]
  // [ 1  ]   [ h6 h7 1  ] [ 1 ]
  const A: number[][] = [];
  const b: number[] = [];

  for (let i = 0; i < 4; i++) {
    const sx = src[i].x;
    const sy = src[i].y;
    const dx = dst[i].x;
    const dy = dst[i].y;

    A.push([sx, sy, 1, 0, 0, 0, -dx * sx, -dx * sy]);
    b.push(dx);

    A.push([0, 0, 0, sx, sy, 1, -dy * sx, -dy * sy]);
    b.push(dy);
  }

  // Gaussian elimination with partial pivoting
  const n = 8;
  for (let i = 0; i < n; i++) {
    let maxRow = i;
    for (let k = i + 1; k < n; k++) {
      if (Math.abs(A[k][i]) > Math.abs(A[maxRow][i])) {
        maxRow = k;
      }
    }
    [A[i], A[maxRow]] = [A[maxRow], A[i]];
    [b[i], b[maxRow]] = [b[maxRow], b[i]];

    if (Math.abs(A[i][i]) < 1e-12) continue;

    for (let k = i + 1; k < n; k++) {
      const factor = A[k][i] / A[i][i];
      for (let j = i; j < n; j++) {
        A[k][j] -= factor * A[i][j];
      }
      b[k] -= factor * b[i];
    }
  }

  // Back-substitution
  const h = new Array(8).fill(0);
  for (let i = n - 1; i >= 0; i--) {
    let sum = b[i];
    for (let j = i + 1; j < n; j++) {
      sum -= A[i][j] * h[j];
    }
    h[i] = Math.abs(A[i][i]) > 1e-12 ? sum / A[i][i] : 0;
  }

  return [...h, 1];
}

/**
 * Computes the 3x3 matrix inverse
 */
function invert3x3(m: number[]): number[] {
  const [
    m0, m1, m2,
    m3, m4, m5,
    m6, m7, m8
  ] = m;

  const det =
    m0 * (m4 * m8 - m5 * m7) -
    m1 * (m3 * m8 - m5 * m6) +
    m2 * (m3 * m7 - m4 * m6);

  if (Math.abs(det) < 1e-12) {
    return [1, 0, 0, 0, 1, 0, 0, 0, 1];
  }

  const invDet = 1 / det;
  return [
    (m4 * m8 - m5 * m7) * invDet,
    (m2 * m7 - m1 * m8) * invDet,
    (m1 * m5 - m2 * m4) * invDet,
    (m5 * m6 - m3 * m8) * invDet,
    (m0 * m8 - m2 * m6) * invDet,
    (m2 * m3 - m0 * m5) * invDet,
    (m3 * m7 - m4 * m6) * invDet,
    (m1 * m6 - m0 * m7) * invDet,
    (m0 * m4 - m1 * m3) * invDet,
  ];
}

/**
 * Warps a 4-corner document quad into a flat, rectified rectangle with bilinear interpolation
 */
export function warpPerspective(
  sourceCanvas: HTMLCanvasElement,
  corners: DocumentCorners,
  targetWidth?: number,
  targetHeight?: number
): HTMLCanvasElement {
  const { topLeft, topRight, bottomRight, bottomLeft } = corners;

  // Calculate target dimensions from corner edge lengths if not provided
  const topDist = Math.hypot(topRight.x - topLeft.x, topRight.y - topLeft.y);
  const bottomDist = Math.hypot(bottomRight.x - bottomLeft.x, bottomRight.y - bottomLeft.y);
  const leftDist = Math.hypot(bottomLeft.x - topLeft.x, bottomLeft.y - topLeft.y);
  const rightDist = Math.hypot(bottomRight.x - topRight.x, bottomRight.y - topRight.y);

  const outWidth = Math.round(targetWidth || Math.max(topDist, bottomDist));
  const outHeight = Math.round(targetHeight || Math.max(leftDist, rightDist));

  const destCanvas = document.createElement('canvas');
  destCanvas.width = outWidth;
  destCanvas.height = outHeight;

  const destCtx = destCanvas.getContext('2d');
  const srcCtx = sourceCanvas.getContext('2d');
  if (!destCtx || !srcCtx) return destCanvas;

  const srcImageData = srcCtx.getImageData(0, 0, sourceCanvas.width, sourceCanvas.height);
  const destImageData = destCtx.createImageData(outWidth, outHeight);

  const srcData = srcImageData.data;
  const destData = destImageData.data;
  const srcW = sourceCanvas.width;
  const srcH = sourceCanvas.height;

  // Destination rectangle points
  const dstPoints: [Point2D, Point2D, Point2D, Point2D] = [
    { x: 0, y: 0 },
    { x: outWidth - 1, y: 0 },
    { x: outWidth - 1, y: outHeight - 1 },
    { x: 0, y: outHeight - 1 },
  ];

  // Source quad points
  const srcPoints: [Point2D, Point2D, Point2D, Point2D] = [
    topLeft,
    topRight,
    bottomRight,
    bottomLeft,
  ];

  // Compute Homography from destination (u, v) -> source (x, y)
  // This allows inverse backward mapping (no holes in destination)
  const H_inv = solveHomography(dstPoints, srcPoints);

  const [h0, h1, h2, h3, h4, h5, h6, h7, h8] = H_inv;

  for (let dy = 0; dy < outHeight; dy++) {
    for (let dx = 0; dx < outWidth; dx++) {
      // Map destination coordinate to source coordinate
      const w = h6 * dx + h7 * dy + h8;
      if (Math.abs(w) < 1e-8) continue;

      const sx = (h0 * dx + h1 * dy + h2) / w;
      const sy = (h3 * dx + h4 * dy + h5) / w;

      if (sx >= 0 && sx < srcW - 1 && sy >= 0 && sy < srcH - 1) {
        // Bilinear interpolation
        const x0 = Math.floor(sx);
        const y0 = Math.floor(sy);
        const x1 = x0 + 1;
        const y1 = y0 + 1;

        const xFrac = sx - x0;
        const yFrac = sy - y0;

        const idx00 = (y0 * srcW + x0) * 4;
        const idx10 = (y0 * srcW + x1) * 4;
        const idx01 = (y1 * srcW + x0) * 4;
        const idx11 = (y1 * srcW + x1) * 4;

        const destIdx = (dy * outWidth + dx) * 4;

        for (let c = 0; c < 4; c++) {
          const val =
            srcData[idx00 + c] * (1 - xFrac) * (1 - yFrac) +
            srcData[idx10 + c] * xFrac * (1 - yFrac) +
            srcData[idx01 + c] * (1 - xFrac) * yFrac +
            srcData[idx11 + c] * xFrac * yFrac;

          destData[destIdx + c] = Math.round(val);
        }
      }
    }
  }

  destCtx.putImageData(destImageData, 0, 0);
  return destCanvas;
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
