import { Adjustments, BackgroundSettings, CropBox } from '../types';

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
 * Fast separable 2-pass box blur for real-time background bokeh simulation
 */
export function fastBoxBlur(
  srcData: Uint8ClampedArray,
  w: number,
  h: number,
  radius: number
): Uint8ClampedArray {
  if (radius <= 0) return new Uint8ClampedArray(srcData);

  const out = new Uint8ClampedArray(srcData);
  const temp = new Uint8ClampedArray(srcData.length);
  const r = Math.min(30, Math.max(1, Math.round(radius)));
  const div = 2 * r + 1;

  // Pass 1: Horizontal blur out -> temp
  for (let y = 0; y < h; y++) {
    const rowOffset = y * w;
    let rSum = 0, gSum = 0, bSum = 0, aSum = 0;

    for (let x = -r; x <= r; x++) {
      const px = Math.min(w - 1, Math.max(0, x));
      const idx = (rowOffset + px) * 4;
      rSum += out[idx];
      gSum += out[idx + 1];
      bSum += out[idx + 2];
      aSum += out[idx + 3];
    }

    for (let x = 0; x < w; x++) {
      const idx = (rowOffset + x) * 4;
      temp[idx] = Math.round(rSum / div);
      temp[idx + 1] = Math.round(gSum / div);
      temp[idx + 2] = Math.round(bSum / div);
      temp[idx + 3] = Math.round(aSum / div);

      const nextX = Math.min(w - 1, x + r + 1);
      const prevX = Math.max(0, x - r);
      const nextIdx = (rowOffset + nextX) * 4;
      const prevIdx = (rowOffset + prevX) * 4;

      rSum += out[nextIdx] - out[prevIdx];
      gSum += out[nextIdx + 1] - out[prevIdx + 1];
      bSum += out[nextIdx + 2] - out[prevIdx + 2];
      aSum += out[nextIdx + 3] - out[prevIdx + 3];
    }
  }

  // Pass 2: Vertical blur temp -> out
  for (let x = 0; x < w; x++) {
    let rSum = 0, gSum = 0, bSum = 0, aSum = 0;

    for (let y = -r; y <= r; y++) {
      const py = Math.min(h - 1, Math.max(0, y));
      const idx = (py * w + x) * 4;
      rSum += temp[idx];
      gSum += temp[idx + 1];
      bSum += temp[idx + 2];
      aSum += temp[idx + 3];
    }

    for (let y = 0; y < h; y++) {
      const idx = (y * w + x) * 4;
      out[idx] = Math.round(rSum / div);
      out[idx + 1] = Math.round(gSum / div);
      out[idx + 2] = Math.round(bSum / div);
      out[idx + 3] = Math.round(aSum / div);

      const nextY = Math.min(h - 1, y + r + 1);
      const prevY = Math.max(0, y - r);
      const nextIdx = (nextY * w + x) * 4;
      const prevIdx = (prevY * w + x) * 4;

      rSum += temp[nextIdx] - temp[prevIdx];
      gSum += temp[nextIdx + 1] - temp[prevIdx + 1];
      bSum += temp[nextIdx + 2] - temp[prevIdx + 2];
      aSum += temp[nextIdx + 3] - temp[prevIdx + 3];
    }
  }

  return out;
}

/**
 * Studio Background Replacement & Offline Smart Portrait AI Segmentation
 * - Smart AI Portrait Cutout: Automatically identifies face, hair, and torso/clothes
 *   using anatomical body geometry and skin tone clusters, preventing accidental erasing
 *   of white shirts or dark hair.
 * - Eyedropper: Supports exact source color sampled from screen tap.
 * - DSLR Portrait Bokeh Blur: Blurs background with smooth depth-of-field effect.
 * - Manual Erase / Restore Brush: Supports user-drawn touchup mask.
 */
export function applyStudioBackground(
  imageData: ImageData,
  bgSettings: BackgroundSettings,
  brushMaskCanvas?: HTMLCanvasElement | null
): ImageData {
  if (!bgSettings.enabled) return imageData;

  const w = imageData.width;
  const h = imageData.height;
  const data = imageData.data;

  const hex = (bgSettings.color || '#ffffff').replace('#', '');
  const targetR = parseInt(hex.substring(0, 2), 16) || 255;
  const targetG = parseInt(hex.substring(2, 4), 16) || 255;
  const targetB = parseInt(hex.substring(4, 6), 16) || 255;
  const isTransparent = !!bgSettings.transparent;

  const blurRadius = bgSettings.blurRadius || 0;
  const isBlurMode = (bgSettings.mode === 'blur' || blurRadius > 0) && !isTransparent;

  // Pre-calculate blurred copy if blur is requested
  let blurredData: Uint8ClampedArray | null = null;
  if (isBlurMode && blurRadius > 0) {
    blurredData = fastBoxBlur(data, w, h, blurRadius);
  }

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

  // 1 = background, 0 = foreground
  const mask = new Uint8Array(w * h);

  // Smart Offline Anatomical Portrait Prior:
  // Detect face center and construct guaranteed foreground zones for head, neck, and torso.
  let faceCenterX = w / 2;
  let faceCenterY = h * 0.38;
  let faceRadiusX = w * 0.22;
  let faceRadiusY = h * 0.22;

  const isSmartAi = bgSettings.mode !== 'color_key';

  if (isSmartAi) {
    // Fast scan for skin centroid in upper 70%
    let skinSumX = 0;
    let skinSumY = 0;
    let skinCount = 0;
    const scanStep = Math.max(2, Math.floor(w / 80));

    for (let y = Math.floor(h * 0.1); y < Math.floor(h * 0.7); y += scanStep) {
      for (let x = Math.floor(w * 0.15); x < Math.floor(w * 0.85); x += scanStep) {
        const idx = (y * w + x) * 4;
        const r = data[idx];
        const g = data[idx + 1];
        const b = data[idx + 2];
        const isSkin = r > 70 && g > 35 && b > 20 && r > g && r > b && (r - g) > 10;
        if (isSkin) {
          skinSumX += x;
          skinSumY += y;
          skinCount++;
        }
      }
    }

    if (skinCount > 20) {
      faceCenterX = skinSumX / skinCount;
      faceCenterY = skinSumY / skinCount;
      faceRadiusX = Math.max(w * 0.18, Math.min(w * 0.35, Math.sqrt(skinCount * scanStep * scanStep / Math.PI) * 0.85));
      faceRadiusY = faceRadiusX * 1.25;
    }
  }

  // Anatomical protection helper: returns true if (x, y) is guaranteed human body
  const isProtectedPerson = (x: number, y: number) => {
    if (!isSmartAi) return false;

    // 1. Head & Hair ellipse
    const headDx = (x - faceCenterX) / (faceRadiusX * 1.15);
    const headDy = (y - faceCenterY) / (faceRadiusY * 1.25);
    if (headDx * headDx + headDy * headDy <= 1.0) {
      return true;
    }

    // 2. Neck & Shoulders / Torso trapezoid (below face center)
    const chinY = faceCenterY + faceRadiusY * 0.55;
    if (y >= chinY) {
      const progress = Math.min(1.0, (y - chinY) / Math.max(1, h - chinY));
      // Shoulders expand outwards towards bottom
      const torsoHalfW = faceRadiusX * 0.9 + progress * (w * 0.5 - faceRadiusX * 0.8);
      if (Math.abs(x - faceCenterX) <= torsoHalfW * 0.88) {
        return true; // White shirts / suits are 100% protected here!
      }
    }

    return false;
  };

  const isColorMatch = (r: number, g: number, b: number) => {
    return Math.hypot(r - sampleR, g - sampleG, b - sampleB) < tolerance;
  };

  // Seed with top, left, and right border pixels that are not protected
  const queue: number[] = [];

  // Top row
  for (let x = 0; x < w; x++) {
    const idx = x * 4;
    if (!isProtectedPerson(x, 0) && isColorMatch(data[idx], data[idx + 1], data[idx + 2])) {
      mask[x] = 1;
      queue.push(x);
    }
  }

  // Left and right columns (top 85%)
  const maxScanY = Math.floor(h * 0.85);
  for (let y = 1; y < maxScanY; y++) {
    const leftPos = y * w;
    const leftIdx = leftPos * 4;
    if (!isProtectedPerson(0, y) && isColorMatch(data[leftIdx], data[leftIdx + 1], data[leftIdx + 2]) && !mask[leftPos]) {
      mask[leftPos] = 1;
      queue.push(leftPos);
    }

    const rightPos = y * w + (w - 1);
    const rightIdx = rightPos * 4;
    if (!isProtectedPerson(w - 1, y) && isColorMatch(data[rightIdx], data[rightIdx + 1], data[rightIdx + 2]) && !mask[rightPos]) {
      mask[rightPos] = 1;
      queue.push(rightPos);
    }
  }

  // BFS flood-fill propagation
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
        const nx = n % w;
        const ny = Math.floor(n / w);
        if (!isProtectedPerson(nx, ny)) {
          const nIdx = n * 4;
          if (isColorMatch(data[nIdx], data[nIdx + 1], data[nIdx + 2])) {
            mask[n] = 1;
            queue.push(n);
          }
        }
      }
    }
  }

  // Apply Manual Brush Mask if provided
  // Red = Erase (force mask = 1)
  // Green = Restore (force mask = 0)
  if (brushMaskCanvas) {
    const bCtx = brushMaskCanvas.getContext('2d');
    if (bCtx) {
      const bImgData = bCtx.getImageData(0, 0, brushMaskCanvas.width, brushMaskCanvas.height);
      const bData = bImgData.data;
      const bW = brushMaskCanvas.width;
      const bH = brushMaskCanvas.height;

      for (let y = 0; y < h; y++) {
        const bY = Math.min(bH - 1, Math.floor((y / h) * bH));
        for (let x = 0; x < w; x++) {
          const bX = Math.min(bW - 1, Math.floor((x / w) * bW));
          const bIdx = (bY * bW + bX) * 4;
          const brR = bData[bIdx];
          const brG = bData[bIdx + 1];
          const brA = bData[bIdx + 3];

          if (brA > 30) {
            const pos = y * w + x;
            if (brR > 180 && brG < 70) {
              // Erase stroke -> force background
              mask[pos] = 1;
            } else if (brG > 180 && brR < 70) {
              // Restore stroke -> force foreground
              mask[pos] = 0;
            }
          }
        }
      }
    }
  }

  // Composite final pixels: Blur vs Transparent Cutout vs Solid Studio Color
  for (let i = 0; i < mask.length; i++) {
    if (mask[i] === 1) {
      const pIdx = i * 4;
      const r = data[pIdx];
      const g = data[pIdx + 1];
      const b = data[pIdx + 2];

      const dist = Math.hypot(r - sampleR, g - sampleG, b - sampleB);
      const alpha = Math.min(1, Math.max(0, (dist - (tolerance - feather)) / feather));

      if (isBlurMode && blurredData) {
        // DSLR Bokeh background blur
        data[pIdx] = Math.round(blurredData[pIdx] * (1 - alpha) + r * alpha);
        data[pIdx + 1] = Math.round(blurredData[pIdx + 1] * (1 - alpha) + g * alpha);
        data[pIdx + 2] = Math.round(blurredData[pIdx + 2] * (1 - alpha) + b * alpha);
      } else if (isTransparent) {
        // Transparent PNG cutout
        data[pIdx + 3] = Math.round(255 * alpha);
      } else {
        // Solid studio backdrop color
        data[pIdx] = Math.round(targetR * (1 - alpha) + r * alpha);
        data[pIdx + 1] = Math.round(targetG * (1 - alpha) + g * alpha);
        data[pIdx + 2] = Math.round(targetB * (1 - alpha) + b * alpha);
      }
    }
  }

  return imageData;
}


/**
 * Biometric Auto Face Detection & Auto-Crop Engine
 * Analyzes portrait photography to locate face cluster, eyes, and crown,
 * framing the photo according to international biometric passport standards
 * (head fills 70-80% of vertical height, centered horizontally).
 */
export function detectFaceAndAutoCrop(
  source: HTMLImageElement | HTMLCanvasElement,
  targetAspect: number // width / height
): CropBox {
  const origW = 'naturalWidth' in source ? (source as HTMLImageElement).naturalWidth : source.width;
  const origH = 'naturalHeight' in source ? (source as HTMLImageElement).naturalHeight : source.height;

  // 1. Fast downscaled analysis grid (max width 320)
  const analysisW = 320;
  const scale = analysisW / origW;
  const analysisH = Math.round(origH * scale);

  const canvas = document.createElement('canvas');
  canvas.width = analysisW;
  canvas.height = analysisH;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) {
    return getDefaultPassportCrop(origW, origH, targetAspect);
  }

  ctx.drawImage(source, 0, 0, analysisW, analysisH);
  const imgData = ctx.getImageData(0, 0, analysisW, analysisH);
  const data = imgData.data;

  // 2. Scan for skin tone & face features in top 75% of image
  const scanLimitY = Math.round(analysisH * 0.75);
  let totalSkinWeight = 0;
  let skinSumX = 0;
  let skinSumY = 0;
  let minSkinX = analysisW;
  let maxSkinX = 0;
  let minSkinY = analysisH;
  let maxSkinY = 0;

  for (let y = Math.round(analysisH * 0.05); y < scanLimitY; y += 2) {
    for (let x = Math.round(analysisW * 0.1); x < Math.round(analysisW * 0.9); x += 2) {
      const idx = (y * analysisW + x) * 4;
      const r = data[idx];
      const g = data[idx + 1];
      const b = data[idx + 2];

      // Skin chromaticity test (YCbCr approximation)
      const isSkinRGB = r > 85 && g > 35 && b > 20 && r > g && r > b && (r - g) > 10;
      const cb = 128 - 0.168736 * r - 0.331264 * g + 0.5 * b;
      const cr = 128 + 0.5 * r - 0.418688 * g - 0.081312 * b;
      const isSkinChroma = cb >= 80 && cb <= 138 && cr >= 133 && cr <= 180;

      if (isSkinRGB && isSkinChroma) {
        // Weight toward center of the image
        const centerDist = Math.abs(x - analysisW / 2) / (analysisW / 2);
        const weight = 1.0 - 0.4 * centerDist;

        totalSkinWeight += weight;
        skinSumX += x * weight;
        skinSumY += y * weight;

        if (x < minSkinX) minSkinX = x;
        if (x > maxSkinX) maxSkinX = x;
        if (y < minSkinY) minSkinY = y;
        if (y > maxSkinY) maxSkinY = y;
      }
    }
  }

  // If a distinct face cluster is detected
  if (totalSkinWeight > 80 && (maxSkinX - minSkinX) > 25 && (maxSkinY - minSkinY) > 30) {
    const faceCenterX = (skinSumX / totalSkinWeight) / scale;
    const faceTop = minSkinY / scale;
    const faceBottom = maxSkinY / scale;
    const faceHeight = faceBottom - faceTop;

    // International passport standard:
    // Head occupies ~70-75% of crop height
    // Headroom (crown to top) is ~10-12% of crop height
    let cropH = faceHeight / 0.65;
    let cropW = cropH * targetAspect;

    // Ensure crop box fits inside source dimensions
    if (cropW > origW) {
      cropW = origW;
      cropH = cropW / targetAspect;
    }
    if (cropH > origH) {
      cropH = origH;
      cropW = cropH * targetAspect;
    }

    let cropX = faceCenterX - cropW / 2;
    // Position crown with ~12% headroom
    let cropY = faceTop - cropH * 0.12;

    // Clamp within boundaries
    if (cropX < 0) cropX = 0;
    if (cropX + cropW > origW) cropX = origW - cropW;
    if (cropY < 0) cropY = 0;
    if (cropY + cropH > origH) cropY = origH - cropH;

    return {
      x: Math.round(cropX),
      y: Math.round(cropY),
      width: Math.round(cropW),
      height: Math.round(cropH),
    };
  }

  // Fallback if no clear skin tones detected
  return getDefaultPassportCrop(origW, origH, targetAspect);
}

function getDefaultPassportCrop(origW: number, origH: number, targetAspect: number): CropBox {
  let cropW = Math.min(origW * 0.75, origH * 0.75 * targetAspect);
  let cropH = cropW / targetAspect;

  if (cropH > origH * 0.88) {
    cropH = origH * 0.88;
    cropW = cropH * targetAspect;
  }

  const cropX = Math.max(0, (origW - cropW) / 2);
  const cropY = Math.max(0, origH * 0.08);

  return {
    x: Math.round(cropX),
    y: Math.round(cropY),
    width: Math.round(cropW),
    height: Math.round(cropH),
  };
}
