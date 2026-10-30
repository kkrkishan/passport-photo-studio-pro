import { Adjustments, BackgroundSettings } from '../types';

/**
 * Applies color and tonal adjustments to ImageData
 */
export function applyAdjustments(
  imageData: ImageData,
  adj: Adjustments
): ImageData {
  const data = imageData.data;
  const len = data.length;

  // Pre-calculate factor lookups
  // Brightness: -100 to 100 -> offset -128 to 128
  const brightOffset = (adj.brightness / 100) * 128;

  // Contrast: -100 to 100 -> factor
  const contrastFactor = adj.contrast === 100 ? 10 : (259 * (adj.contrast + 255)) / (255 * (259 - adj.contrast));

  // Exposure: -100 to 100 -> multiplier
  const exposureMult = Math.pow(2, adj.exposure / 50);

  // Saturation: -100 to 100 -> factor 0 to 2
  const satFactor = (adj.saturation + 100) / 100;

  // Temperature: -100 (cool/blue) to 100 (warm/amber)
  const tempR = adj.temperature > 0 ? 1 + (adj.temperature / 100) * 0.25 : 1;
  const tempB = adj.temperature < 0 ? 1 + (-adj.temperature / 100) * 0.25 : 1;

  // Shadows / Highlights multipliers
  const shadowsFactor = adj.shadows / 100;
  const highlightsFactor = adj.highlights / 100;

  for (let i = 0; i < len; i += 4) {
    let r = data[i];
    let g = data[i + 1];
    let b = data[i + 2];

    // 1. Exposure
    if (adj.exposure !== 0) {
      r *= exposureMult;
      g *= exposureMult;
      b *= exposureMult;
    }

    // 2. Brightness
    if (adj.brightness !== 0) {
      r += brightOffset;
      g += brightOffset;
      b += brightOffset;
    }

    // 3. Contrast
    if (adj.contrast !== 0) {
      r = contrastFactor * (r - 128) + 128;
      g = contrastFactor * (g - 128) + 128;
      b = contrastFactor * (b - 128) + 128;
    }

    // 4. Highlights and Shadows
    const lum = 0.299 * r + 0.587 * g + 0.114 * b;
    if (shadowsFactor !== 0 && lum < 128) {
      const shadowWeight = (1 - lum / 128);
      const boost = shadowsFactor * 60 * shadowWeight;
      r += boost;
      g += boost;
      b += boost;
    }
    if (highlightsFactor !== 0 && lum >= 128) {
      const highlightWeight = ((lum - 128) / 127);
      const boost = highlightsFactor * 60 * highlightWeight;
      r += boost;
      g += boost;
      b += boost;
    }

    // 5. Saturation
    if (adj.saturation !== 0) {
      const gray = 0.299 * r + 0.587 * g + 0.114 * b;
      r = gray + satFactor * (r - gray);
      g = gray + satFactor * (g - gray);
      b = gray + satFactor * (b - gray);
    }

    // 6. Color Temperature
    if (adj.temperature !== 0) {
      r *= tempR;
      b *= tempB;
    }

    data[i] = Math.max(0, Math.min(255, r));
    data[i + 1] = Math.max(0, Math.min(255, g));
    data[i + 2] = Math.max(0, Math.min(255, b));
  }

  // 7. Sharpness via 3x3 unsharp mask convolution if requested
  if (adj.sharpness > 0) {
    return applySharpness(imageData, adj.sharpness);
  }

  return imageData;
}

/**
 * 3x3 Convolution Sharpness filter
 */
export function applySharpness(imageData: ImageData, sharpness: number): ImageData {
  const w = imageData.width;
  const h = imageData.height;
  const src = imageData.data;
  const copy = new Uint8ClampedArray(src);

  // Sharpness weight: 0.1 to 1.5
  const amount = (sharpness / 100) * 1.2;

  // Unsharp kernel:
  // [ 0,  -a,  0 ]
  // [-a, 1+4a, -a]
  // [ 0,  -a,  0 ]
  const centerWeight = 1 + 4 * amount;
  const edgeWeight = -amount;

  for (let y = 1; y < h - 1; y++) {
    const yOffset = y * w;
    for (let x = 1; x < w - 1; x++) {
      const idx = (yOffset + x) * 4;

      for (let c = 0; c < 3; c++) {
        const top = copy[((y - 1) * w + x) * 4 + c];
        const bottom = copy[((y + 1) * w + x) * 4 + c];
        const left = copy[(yOffset + (x - 1)) * 4 + c];
        const right = copy[(yOffset + (x + 1)) * 4 + c];
        const current = copy[idx + c];

        const val = current * centerWeight + (top + bottom + left + right) * edgeWeight;
        src[idx + c] = Math.max(0, Math.min(255, val));
      }
    }
  }

  return imageData;
}

/**
 * Auto-enhancement: analyzes image histogram and balances dynamic range
 */
export function calculateAutoEnhance(imageData: ImageData): Partial<Adjustments> {
  const data = imageData.data;
  let minLum = 255;
  let maxLum = 0;
  let totalLum = 0;
  const step = 8; // sample every 8th pixel for speed
  let count = 0;

  for (let i = 0; i < data.length; i += 4 * step) {
    const lum = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
    if (lum < minLum) minLum = lum;
    if (lum > maxLum) maxLum = lum;
    totalLum += lum;
    count++;
  }

  const avgLum = totalLum / count;

  // Target average ~ 125, range spanning [10, 245]
  let suggestedBrightness = 0;
  let suggestedContrast = 15;
  let suggestedExposure = 0;

  if (avgLum < 100) {
    suggestedBrightness = Math.min(30, Math.round((115 - avgLum) * 0.4));
    suggestedExposure = 10;
  } else if (avgLum > 155) {
    suggestedBrightness = Math.max(-25, Math.round((140 - avgLum) * 0.3));
  }

  return {
    brightness: suggestedBrightness,
    contrast: suggestedContrast,
    exposure: suggestedExposure,
    saturation: 10,
    sharpness: 25,
    highlights: -5,
    shadows: 15,
    temperature: 0,
  };
}

/**
 * Studio Background Replacement
 * Samples background near edges and replaces matching colors with the selected studio color
 */
/**
 * Studio Background Replacement
 * Supports custom source color picking (eyedropper), border-connected flood fill,
 * edge feathering, and transparent PNG cutouts.
 */
export function applyStudioBackground(
  imageData: ImageData,
  bgSettings: BackgroundSettings
): ImageData {
  if (!bgSettings.enabled) return imageData;

  const hex = (bgSettings.color || '#ffffff').replace('#', '');
  const targetR = parseInt(hex.substring(0, 2), 16) || 255;
  const targetG = parseInt(hex.substring(2, 4), 16) || 255;
  const targetB = parseInt(hex.substring(4, 6), 16) || 255;
  const isTransparent = !!bgSettings.transparent;

  const w = imageData.width;
  const h = imageData.height;
  const data = imageData.data;

  // Determine source color to replace
  let sampleR: number, sampleG: number, sampleB: number;

  if (bgSettings.sourceColor) {
    const srcHex = bgSettings.sourceColor.replace('#', '');
    sampleR = parseInt(srcHex.substring(0, 2), 16) || 255;
    sampleG = parseInt(srcHex.substring(2, 4), 16) || 255;
    sampleB = parseInt(srcHex.substring(4, 6), 16) || 255;
  } else {
    // Sample along top and upper side perimeters
    const sampleIndices: number[] = [];
    const step = Math.max(1, Math.floor(w / 16));
    // Top border
    for (let x = 0; x < w; x += step) {
      sampleIndices.push(x * 4);
    }
    // Upper quarter left & right borders
    const quarterH = Math.floor(h / 3);
    for (let y = 0; y < quarterH; y += Math.max(1, Math.floor(h / 20))) {
      sampleIndices.push((y * w) * 4);
      sampleIndices.push((y * w + (w - 1)) * 4);
    }

    let rSum = 0, gSum = 0, bSum = 0;
    for (const idx of sampleIndices) {
      rSum += data[idx];
      gSum += data[idx + 1];
      bSum += data[idx + 2];
    }
    sampleR = rSum / sampleIndices.length;
    sampleG = gSum / sampleIndices.length;
    sampleB = bSum / sampleIndices.length;
  }

  const tolerance = (bgSettings.tolerance / 100) * 140 + 10;
  const feather = Math.max(1, (bgSettings.feather || 3) * 2);

  // Border-connected flood-fill mask
  // 1 = background, 0 = foreground / unvisited
  const mask = new Uint8Array(w * h);
  const queue: number[] = [];

  // Seed with top, left, and right border pixels
  const isColorMatch = (r: number, g: number, b: number) => {
    return Math.hypot(r - sampleR, g - sampleG, b - sampleB) < tolerance;
  };

  // Check top row
  for (let x = 0; x < w; x++) {
    const idx = x * 4;
    if (isColorMatch(data[idx], data[idx + 1], data[idx + 2])) {
      mask[x] = 1;
      queue.push(x);
    }
  }
  // Check left and right columns (top 80%)
  const maxScanY = Math.floor(h * 0.85);
  for (let y = 1; y < maxScanY; y++) {
    const leftIdx = (y * w) * 4;
    if (isColorMatch(data[leftIdx], data[leftIdx + 1], data[leftIdx + 2]) && !mask[y * w]) {
      mask[y * w] = 1;
      queue.push(y * w);
    }
    const rightIdx = (y * w + (w - 1)) * 4;
    if (isColorMatch(data[rightIdx], data[rightIdx + 1], data[rightIdx + 2]) && !mask[y * w + (w - 1)]) {
      mask[y * w + (w - 1)] = 1;
      queue.push(y * w + (w - 1));
    }
  }

  // BFS propagation (flood-fill only matching connected background)
  let head = 0;
  while (head < queue.length) {
    const pos = queue[head++];
    const px = pos % w;
    const py = Math.floor(pos / w);

    const neighbors = [
      px > 0 ? pos - 1 : -1,
      px < w - 1 ? pos + 1 : -1,
      py > 0 ? pos - w : -1,
      py < h - 1 ? pos + w : -1,
    ];

    for (const n of neighbors) {
      if (n >= 0 && mask[n] === 0) {
        const nIdx = n * 4;
        if (isColorMatch(data[nIdx], data[nIdx + 1], data[nIdx + 2])) {
          mask[n] = 1;
          queue.push(n);
        }
      }
    }
  }

  // Apply replacement with feathering to all masked background pixels
  for (let i = 0; i < mask.length; i++) {
    if (mask[i] === 1) {
      const pIdx = i * 4;
      const r = data[pIdx];
      const g = data[pIdx + 1];
      const b = data[pIdx + 2];

      const dist = Math.hypot(r - sampleR, g - sampleG, b - sampleB);
      const alpha = Math.min(1, Math.max(0, (dist - (tolerance - feather)) / feather));

      if (isTransparent) {
        data[pIdx + 3] = Math.round(255 * alpha);
      } else {
        data[pIdx] = Math.round(targetR * (1 - alpha) + r * alpha);
        data[pIdx + 1] = Math.round(targetG * (1 - alpha) + g * alpha);
        data[pIdx + 2] = Math.round(targetB * (1 - alpha) + b * alpha);
      }
    }
  }

  return imageData;
}
