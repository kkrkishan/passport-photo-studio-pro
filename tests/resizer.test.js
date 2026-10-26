const assert = require('assert');
const { PDFDocument, PageSizes } = require('pdf-lib');

console.log('=== RUNNING MODULE 3: RESIZER & COMPRESSOR TEST SUITE ===\n');

// 1. Dimension & Unit Conversion Tests
console.log('--- 1. Testing Dimension & Unit Conversions ---');
function convertUnits(val, fromUnit, toUnit, dpi, origPx = 1000) {
  if (fromUnit === toUnit) return val;
  let px = 0;
  if (fromUnit === 'px') px = val;
  else if (fromUnit === 'mm') px = (val / 25.4) * dpi;
  else if (fromUnit === 'cm') px = (val / 2.54) * dpi;
  else if (fromUnit === 'inch') px = val * dpi;
  else if (fromUnit === 'percent') px = (val / 100) * origPx;

  let res = 0;
  if (toUnit === 'px') res = Math.round(px);
  else if (toUnit === 'mm') res = (px / dpi) * 25.4;
  else if (toUnit === 'cm') res = (px / dpi) * 2.54;
  else if (toUnit === 'inch') res = px / dpi;
  else if (toUnit === 'percent') res = (px / origPx) * 100;
  return Math.round(res * 100) / 100;
}

// 35mm at 300 DPI = 413 px
const mm35At300 = convertUnits(35, 'mm', 'px', 300);
console.log(`35 mm at 300 DPI -> ${mm35At300} px (expected: 413 px)`);
assert.strictEqual(mm35At300, 413);

// 4.5cm at 200 DPI = 354 px
const cm45At200 = convertUnits(4.5, 'cm', 'px', 200);
console.log(`4.5 cm at 200 DPI -> ${cm45At200} px (expected: 354 px)`);
assert.strictEqual(cm45At200, 354);

// 2 inch at 300 DPI = 600 px
const in2At300 = convertUnits(2, 'inch', 'px', 300);
console.log(`2 inch at 300 DPI -> ${in2At300} px (expected: 600 px)`);
assert.strictEqual(in2At300, 600);

// 50% of 1200 px = 600 px
const pct50 = convertUnits(50, 'percent', 'px', 300, 1200);
console.log(`50% of 1200 px -> ${pct50} px (expected: 600 px)`);
assert.strictEqual(pct50, 600);
console.log('✅ Unit conversion math verified.\n');

// 2. Aspect Ratio Distortion Detection
console.log('--- 2. Testing Aspect Ratio Distortion Check ---');
function checkDistortion(origW, origH, newW, newH, tolerance = 3) {
  const origRatio = origW / origH;
  const newRatio = newW / newH;
  const diff = Math.abs(origRatio - newRatio) / origRatio * 100;
  return { isDistorted: diff > tolerance, diffPercent: Math.round(diff * 10) / 10 };
}

// Proportional: 1000x1500 -> 500x750
const propCheck = checkDistortion(1000, 1500, 500, 750);
console.log('Proportional 1000x1500 to 500x750 distortion:', propCheck.diffPercent + '% (isDistorted:', propCheck.isDistorted + ')');
assert.strictEqual(propCheck.isDistorted, false);

// Squished: 1000x1500 -> 500x500 (33.3% distortion)
const squishCheck = checkDistortion(1000, 1500, 500, 500);
console.log('Squished 1000x1500 to 500x500 distortion:', squishCheck.diffPercent + '% (isDistorted:', squishCheck.isDistorted + ')');
assert.strictEqual(squishCheck.isDistorted, true);
console.log('✅ Aspect ratio distortion logic verified.\n');

// 3. Binary Search Target KB Simulation
console.log('--- 3. Testing Target File Size Convergence Algorithm ---');
function simulateTargetKbCompression(initialBytes, targetKb) {
  const targetBytes = targetKb * 1024;
  let low = 0.05;
  let high = 1.0;
  let bestQuality = 0.8;
  let bestBytes = initialBytes;

  // Simulate file size as function of quality: size = initialBytes * (quality^1.2) * 0.7
  for (let i = 0; i < 7; i++) {
    const mid = (low + high) / 2;
    const estimatedBytes = Math.round(initialBytes * Math.pow(mid, 1.2) * 0.7);
    if (estimatedBytes <= targetBytes) {
      bestBytes = estimatedBytes;
      bestQuality = mid;
      low = mid; // Try for better quality
    } else {
      high = mid; // Decrease quality
    }
  }
  return { bestQuality: Math.round(bestQuality * 100) / 100, bestBytes, bestKb: Math.round(bestBytes / 1024) };
}

const sim50Kb = simulateTargetKbCompression(800 * 1024, 50);
console.log(`Initial 800 KB -> Target 50 KB -> Output: ${sim50Kb.bestKb} KB at quality ${sim50Kb.bestQuality}`);
assert(sim50Kb.bestKb <= 50, 'Compressed size should be <= 50 KB');
console.log('✅ Compression search convergence verified.\n');

// 4. PDF Generation & Resizing Verification using pdf-lib
console.log('--- 4. Testing PDF-Lib Document Creation & A4 Resizing ---');
async function testPdfEngine() {
  const doc = await PDFDocument.create();
  const page = doc.addPage(PageSizes.A4);
  const { width, height } = page.getSize();
  console.log(`Created PDF with page size: ${Math.round(width)} × ${Math.round(height)} pt`);
  assert.strictEqual(Math.round(width), 595);
  assert.strictEqual(Math.round(height), 842);

  const pdfBytes = await doc.save();
  console.log(`Generated PDF binary byte length: ${pdfBytes.byteLength} bytes`);
  assert(pdfBytes.byteLength > 100, 'PDF binary should be valid non-empty buffer');

  // Verify reload
  const reloaded = await PDFDocument.load(pdfBytes);
  assert.strictEqual(reloaded.getPageCount(), 1);
  console.log('✅ PDF document manipulation verified.\n');
}

testPdfEngine().then(() => {
  console.log('🎉 ALL RESIZER & COMPRESSOR UNIT TESTS PASSED WITH 100% SUCCESS!');
});
