const assert = require('assert');

// 1. DPI & Physical dimensions calculation test
function mmToPx(mm, dpi = 300) {
  return Math.round((mm / 25.4) * dpi);
}

function pxToMm(px, dpi = 300) {
  return (px * 25.4) / dpi;
}

console.log('--- Testing DPI and Millimeter Calculations ---');
const w35mmIn300Dpi = mmToPx(35, 300);
const h45mmIn300Dpi = mmToPx(45, 300);
console.log(`35x45mm at 300 DPI = ${w35mmIn300Dpi} x ${h45mmIn300Dpi} px`);
assert.strictEqual(w35mmIn300Dpi, 413, '35mm at 300 DPI should be 413px');
assert.strictEqual(h45mmIn300Dpi, 531, '45mm at 300 DPI should be 531px');

const us2x2In300Dpi = mmToPx(50.8, 300);
console.log(`2x2 inch (50.8mm) at 300 DPI = ${us2x2In300Dpi} x ${us2x2In300Dpi} px`);
assert.strictEqual(us2x2In300Dpi, 600, '2x2 inch at 300 DPI should be 600px');

// 2. Sheet Layout Engine test (4x6 inch and A4 paper)
function calculateFit(sheetW, sheetH, photoW, photoH, margin, gapX, gapY) {
  const availableW = sheetW - 2 * margin;
  const availableH = sheetH - 2 * margin;
  const cols = Math.floor((availableW + gapX) / (photoW + gapX));
  const rows = Math.floor((availableH + gapY) / (photoH + gapY));
  return { cols, rows, capacity: cols * rows };
}

console.log('\n--- Testing 4x6" Sheet Layout Calculation ---');
// 4x6" = 101.6 x 152.4 mm (Landscape: 152.4 x 101.6 mm)
// 35x45 mm photo with 3mm margins and 2mm gaps (standard studio calibration)
const fit4x6Portrait = calculateFit(101.6, 152.4, 35, 45, 3, 2, 2);
const fit4x6Landscape = calculateFit(152.4, 101.6, 35, 45, 3, 2, 2);

console.log(`4x6 Portrait fit: ${fit4x6Portrait.cols} cols x ${fit4x6Portrait.rows} rows = ${fit4x6Portrait.capacity} photos`);
console.log(`4x6 Landscape fit: ${fit4x6Landscape.cols} cols x ${fit4x6Landscape.rows} rows = ${fit4x6Landscape.capacity} photos`);
assert.strictEqual(fit4x6Landscape.capacity, 8, '4x6 landscape should fit exactly 8 passport photos');

console.log('\n--- Testing A4 Sheet Layout Calculation ---');
// A4 = 210 x 297 mm with 3mm margins and 2mm gaps
const fitA4Portrait = calculateFit(210, 297, 35, 45, 3, 2, 2);
console.log(`A4 Portrait fit: ${fitA4Portrait.cols} cols x ${fitA4Portrait.rows} rows = ${fitA4Portrait.capacity} photos`);
assert(fitA4Portrait.capacity >= 30, 'A4 should fit 30+ passport photos dynamically');

// 3. Testing 8-Equation Homography Matrix Gaussian Elimination
function solveHomography(src, dst) {
  const A = [];
  const b = [];

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

  const n = 8;
  for (let i = 0; i < n; i++) {
    let maxRow = i;
    for (let k = i + 1; k < n; k++) {
      if (Math.abs(A[k][i]) > Math.abs(A[maxRow][i])) maxRow = k;
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

console.log('\n--- Testing Homography Matrix Solver ---');
const srcQuad = [
  { x: 50, y: 30 },
  { x: 380, y: 60 },
  { x: 350, y: 280 },
  { x: 70, y: 250 }
];
const dstRect = [
  { x: 0, y: 0 },
  { x: 300, y: 0 },
  { x: 300, y: 200 },
  { x: 0, y: 200 }
];

const H = solveHomography(srcQuad, dstRect);
console.log('Solved 3x3 Homography Matrix:');
console.log(`[ ${H[0].toFixed(4)}, ${H[1].toFixed(4)}, ${H[2].toFixed(4)} ]`);
console.log(`[ ${H[3].toFixed(4)}, ${H[4].toFixed(4)}, ${H[5].toFixed(4)} ]`);
console.log(`[ ${H[6].toFixed(4)}, ${H[7].toFixed(4)}, ${H[8].toFixed(4)} ]`);

// Verify mapping of Top-Left corner (50, 30) -> should map close to (0, 0)
const w0 = H[6] * 50 + H[7] * 30 + H[8];
const x0 = (H[0] * 50 + H[1] * 30 + H[2]) / w0;
const y0 = (H[3] * 50 + H[4] * 30 + H[5]) / w0;
console.log(`Mapped top-left point: (${x0.toFixed(2)}, ${y0.toFixed(2)}) (expected: ~0, ~0)`);
assert(Math.abs(x0) < 0.1 && Math.abs(y0) < 0.1, 'Homography top-left mapping failed');

console.log('\n✅ ALL MATHEMATICAL & COMPUTATIONAL TESTS PASSED PERFECTLY!\n');
