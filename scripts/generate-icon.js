const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

// PNG CRC32 table
const crcTable = [];
for (let n = 0; n < 256; n++) {
  let c = n;
  for (let k = 0; k < 8; k++) {
    c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
  }
  crcTable[n] = c;
}

function crc32(buf) {
  let crc = -1;
  for (let i = 0; i < buf.length; i++) {
    crc = (crc >>> 8) ^ crcTable[(crc ^ buf[i]) & 0xff];
  }
  return (crc ^ (-1)) >>> 0;
}

function makeChunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);

  const typeBuf = Buffer.from(type, 'ascii');
  const crcBody = Buffer.concat([typeBuf, data]);

  const crcBuf = Buffer.alloc(4);
  crcBuf.writeUInt32BE(crc32(crcBody), 0);

  return Buffer.concat([len, typeBuf, data, crcBuf]);
}

function createPng(width, height, pixelFn) {
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  // IHDR
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr.writeUInt8(8, 8); // 8-bit depth
  ihdr.writeUInt8(6, 9); // RGBA color type
  ihdr.writeUInt8(0, 10);
  ihdr.writeUInt8(0, 11);
  ihdr.writeUInt8(0, 12);
  const ihdrChunk = makeChunk('IHDR', ihdr);

  // Raw scanlines with filter byte 0
  const scanlines = Buffer.alloc(height * (width * 4 + 1));
  let pos = 0;

  for (let y = 0; y < height; y++) {
    scanlines[pos++] = 0; // Filter: None
    for (let x = 0; x < width; x++) {
      const [r, g, b, a] = pixelFn(x, y, width, height);
      scanlines[pos++] = r;
      scanlines[pos++] = g;
      scanlines[pos++] = b;
      scanlines[pos++] = a;
    }
  }

  const compressed = zlib.deflateSync(scanlines);
  const idatChunk = makeChunk('IDAT', compressed);
  const iendChunk = makeChunk('IEND', Buffer.alloc(0));

  return Buffer.concat([signature, ihdrChunk, idatChunk, iendChunk]);
}

function generateStudioIcon() {
  const size = 256;
  const pngBuffer = createPng(size, size, (x, y, w, h) => {
    // Center distance
    const cx = w / 2;
    const cy = h / 2;
    const dx = x - cx;
    const dy = y - cy;
    const dist = Math.sqrt(dx * dx + dy * dy);

    // Rounded app icon shape (squircle)
    const margin = 16;
    const rad = 48;
    const inBoxX = Math.abs(dx) <= (cx - margin - rad);
    const inBoxY = Math.abs(dy) <= (cy - margin - rad);
    const cornerDist = Math.hypot(
      Math.max(0, Math.abs(dx) - (cx - margin - rad)),
      Math.max(0, Math.abs(dy) - (cy - margin - rad))
    );

    if (cornerDist > rad) {
      return [0, 0, 0, 0]; // Transparent outside icon squircle
    }

    // Gradient background: Deep royal blue to electric cyan (#1e40af to #06b6d4)
    const t = (x + y) / (w + h);
    let bgR = Math.round(30 * (1 - t) + 6 * t);
    let bgG = Math.round(64 * (1 - t) + 182 * t);
    let bgB = Math.round(175 * (1 - t) + 212 * t);

    // Inner Card / Passport Frame (White rectangle with portrait silhouette)
    // Card bounds: center at x: 80..176 (width 96), y: 65..190 (height 125)
    const cardL = 72;
    const cardR = 184;
    const cardT = 60;
    const cardB = 196;

    if (x >= cardL && x <= cardR && y >= cardT && y <= cardB) {
      // Border outline
      if (x === cardL || x === cardR || y === cardT || y === cardB ||
          x === cardL + 1 || x === cardR - 1 || y === cardT + 1 || y === cardB - 1) {
        return [226, 232, 240, 255]; // Light border #e2e8f0
      }

      // Card paper background
      let cardR_col = 248;
      let cardG_col = 250;
      let cardB_col = 252;

      // Passport Photo Frame inside card: x: 88..168, y: 76..145
      if (x >= 88 && x <= 168 && y >= 74 && y <= 145) {
        // Photo background: Studio Light Blue #38bdf8
        let pR = 56;
        let pG = 189;
        let pB = 248;

        // Biometric Head Silhouette inside photo
        const headCx = 128;
        const headCy = 100;
        const headDist = Math.hypot(x - headCx, (y - headCy) * 1.15);

        // Head oval
        if (headDist < 16) {
          return [30, 41, 59, 255]; // Dark slate #1e293b
        }

        // Shoulders curve
        if (y >= 115 && y <= 145) {
          const shoulderW = (y - 115) * 1.2 + 14;
          if (Math.abs(x - headCx) < shoulderW) {
            return [30, 41, 59, 255];
          }
        }

        return [pR, pG, pB, 255];
      }

      // ID Card lines / text bars underneath photo
      if (y >= 156 && y <= 160 && x >= 88 && x <= 168) {
        return [148, 163, 184, 255]; // Text bar #94a3b8
      }
      if (y >= 166 && y <= 170 && x >= 88 && x <= 148) {
        return [203, 213, 225, 255]; // Text bar #cbd5e1
      }
      if (y >= 176 && y <= 180 && x >= 88 && x <= 160) {
        return [203, 213, 225, 255]; // Text bar #cbd5e1
      }

      return [cardR_col, cardG_col, cardB_col, 255];
    }

    // Subtle edge highlight on squircle
    if (cornerDist > rad - 2) {
      return [bgR + 40, bgG + 40, bgB + 40, 255];
    }

    return [bgR, bgG, bgB, 255];
  });

  const publicDir = path.join(__dirname, '../public');
  if (!fs.existsSync(publicDir)) {
    fs.mkdirSync(publicDir, { recursive: true });
  }

  // Write icon.png
  const pngPath = path.join(publicDir, 'icon.png');
  fs.writeFileSync(pngPath, pngBuffer);
  console.log(`Generated icon PNG at: ${pngPath} (${pngBuffer.length} bytes)`);

  // Wrap PNG in Windows .ico container
  const icoHeader = Buffer.alloc(6);
  icoHeader.writeUInt16LE(0, 0); // Reserved
  icoHeader.writeUInt16LE(1, 2); // Type: Icon
  icoHeader.writeUInt16LE(1, 4); // Count: 1 image

  const icoDirEntry = Buffer.alloc(16);
  icoDirEntry.writeUInt8(0, 0);   // Width 256 -> 0
  icoDirEntry.writeUInt8(0, 1);   // Height 256 -> 0
  icoDirEntry.writeUInt8(0, 2);   // Color palette
  icoDirEntry.writeUInt8(0, 3);   // Reserved
  icoDirEntry.writeUInt16LE(1, 4);  // Color planes
  icoDirEntry.writeUInt16LE(32, 6); // Bits per pixel
  icoDirEntry.writeUInt32LE(pngBuffer.length, 8); // Image size in bytes
  icoDirEntry.writeUInt32LE(22, 12); // Offset: 6 + 16 = 22

  const icoBuffer = Buffer.concat([icoHeader, icoDirEntry, pngBuffer]);
  const icoPath = path.join(publicDir, 'icon.ico');
  fs.writeFileSync(icoPath, icoBuffer);
  console.log(`Generated icon ICO at: ${icoPath} (${icoBuffer.length} bytes)`);
}

generateStudioIcon();
