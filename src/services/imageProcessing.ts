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
export function applyStudioBackground(
  imageData: ImageData,
  bgSettings: BackgroundSettings
): ImageData {
  if (!bgSettings.enabled) return imageData;

  const hex = bgSettings.color.replace('#', '');
  const targetR = parseInt(hex.substring(0, 2), 16) || 255;
  const targetG = parseInt(hex.substring(2, 4), 16) || 255;
  const targetB = parseInt(hex.substring(4, 6), 16) || 255;

  const w = imageData.width;
  const h = imageData.height;
  const data = imageData.data;

  // Sample background color from top-left, top-center, and top-right corners
  const sampleIndices = [
    0, // Top-left
    Math.floor(w / 2) * 4, // Top-mid
    (w - 1) * 4, // Top-right
    (Math.floor(h / 4) * w) * 4, // Left upper
    (Math.floor(h / 4) * w + (w - 1)) * 4 // Right upper
  ];

  let sampleR = 0, sampleG = 0, sampleB = 0;
  for (const idx of sampleIndices) {
    sampleR += data[idx];
    sampleG += data[idx + 1];
    sampleB += data[idx + 2];
  }
  sampleR /= sampleIndices.length;
  sampleG /= sampleIndices.length;
  sampleB /= sampleIndices.length;

  const tolerance = (bgSettings.tolerance / 100) * 130 + 15; // sensitivity threshold
  const feather = Math.max(1, bgSettings.feather * 2);

  for (let i = 0; i < data.length; i += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];

    // Color distance from sampled background
    const dist = Math.sqrt(
      Math.pow(r - sampleR, 2) +
      Math.pow(g - sampleG, 2) +
      Math.pow(b - sampleB, 2)
    );

    if (dist < tolerance) {
      // Calculate blend alpha for smooth edges
      const alpha = Math.min(1, Math.max(0, (dist - (tolerance - feather)) / feather));
      data[i] = Math.round(targetR * (1 - alpha) + r * alpha);
      data[i + 1] = Math.round(targetG * (1 - alpha) + g * alpha);
      data[i + 2] = Math.round(targetB * (1 - alpha) + b * alpha);
    }
  }

  return imageData;
}
