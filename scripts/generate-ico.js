#!/usr/bin/env node
/**
 * generate-ico.js
 * 
 * Generates BuildProp favicon.ico with multiple sizes (16, 32, 48, 256)
 * using ONLY Node.js built-in modules (zlib, fs, path, buffer).
 * 
 * The icon is a construction hardhat on a dark navy rounded-square background.
 * Brand colors: Orange #f97316, Dark Navy #0f172a
 * 
 * Usage: node scripts/generate-ico.js
 * Output: public/favicon.ico
 */

const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

const OUTPUT = path.join(__dirname, '..', 'public', 'favicon.ico');
const SIZES = [16, 32, 48, 256];

const ORANGE_R = 249, ORANGE_G = 115, ORANGE_B = 22;
const ORANGE_LIGHT_R = 251, ORANGE_LIGHT_G = 146, ORANGE_LIGHT_B = 60;
const ORANGE_DARK_R = 234, ORANGE_DARK_G = 88, ORANGE_DARK_B = 12;
const NAVY_R = 15, NAVY_G = 23, NAVY_B = 42;
const TRANSPARENT = [0, 0, 0, 0];

// ============================================================
// CRC32 (required for PNG chunks)
// ============================================================
const crcTable = new Uint32Array(256);
for (let n = 0; n < 256; n++) {
  let c = n;
  for (let k = 0; k < 8; k++) {
    c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
  }
  crcTable[n] = c;
}

function crc32(buf) {
  let crc = 0xFFFFFFFF;
  for (let i = 0; i < buf.length; i++) {
    crc = crcTable[(crc ^ buf[i]) & 0xFF] ^ (crc >>> 8);
  }
  return (crc ^ 0xFFFFFFFF) >>> 0;
}

// ============================================================
// PNG Encoder (RGBA pixels -> PNG buffer)
// ============================================================
function createPNG(width, height, rgba) {
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  function makeChunk(type, data) {
    const typeBuf = Buffer.from(type, 'ascii');
    const lenBuf = Buffer.alloc(4);
    lenBuf.writeUInt32BE(data.length, 0);
    const crcData = Buffer.concat([typeBuf, data]);
    const crcBuf = Buffer.alloc(4);
    crcBuf.writeUInt32BE(crc32(crcData), 0);
    return Buffer.concat([lenBuf, typeBuf, data, crcBuf]);
  }

  // IHDR
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;   // bit depth
  ihdr[9] = 6;   // color type: RGBA
  ihdr[10] = 0;  // compression
  ihdr[11] = 0;  // filter
  ihdr[12] = 0;  // interlace

  // Raw scanlines: filter byte (0) + RGBA pixels per row
  const rowBytes = 1 + width * 4;
  const raw = Buffer.alloc(height * rowBytes);
  for (let y = 0; y < height; y++) {
    const rawOffset = y * rowBytes;
    raw[rawOffset] = 0; // no filter
    const srcOffset = y * width * 4;
    rgba.copy(raw, rawOffset + 1, srcOffset, srcOffset + width * 4);
  }

  const compressed = zlib.deflateSync(raw, { level: 9 });

  return Buffer.concat([
    signature,
    makeChunk('IHDR', ihdr),
    makeChunk('IDAT', compressed),
    makeChunk('IEND', Buffer.alloc(0)),
  ]);
}

// ============================================================
// Geometry helpers
// ============================================================

function clamp(v, lo, hi) {
  return v < lo ? lo : v > hi ? hi : v;
}

/** Signed distance to a rounded rectangle */
function sdfRoundedRect(x, y, cx, cy, hw, hh, r) {
  const dx = Math.abs(x - cx) - (hw - r);
  const dy = Math.abs(y - cy) - (hh - r);
  const outside = Math.sqrt(Math.max(dx, 0) ** 2 + Math.max(dy, 0) ** 2) - r;
  const inside = Math.min(Math.max(dx, dy), 0);
  return outside + inside;
}

/** Signed distance to an ellipse */
function sdfEllipse(x, y, cx, cy, rx, ry) {
  const dx = (x - cx) / rx;
  const dy = (y - cy) / ry;
  return (Math.sqrt(dx * dx + dy * dy) - 1) * Math.min(rx, ry);
}

/** Signed distance to a horizontal capsule (rounded rectangle with large horizontal radius) */
function sdfCapsuleH(x, y, x1, x2, cy, r) {
  const dx = clamp(x, x1, x2);
  const dy = y - cy;
  return Math.sqrt((dx - x) ** 2 + (dy) ** 2) - r;
}

// ============================================================
// Icon renderer
// ============================================================

/**
 * Draw the BuildProp hardhat icon at the given pixel size.
 * Returns a Buffer of RGBA pixel data (size * size * 4 bytes).
 *
 * Coordinate system: design space is 0..64, mapped to 0..size.
 * All shapes defined in the 64x64 design space.
 */
function drawIcon(size) {
  const buf = Buffer.alloc(size * size * 4, 0);

  for (let py = 0; py < size; py++) {
    for (let px = 0; px < size; px++) {
      // Map pixel to design space (0..64), with 0.5 offset for pixel centers
      const dx = ((px + 0.5) / size) * 64;
      const dy = ((py + 0.5) / size) * 64;

      const offset = (py * size + px) * 4;

      // 1. Background rounded rect
      const bgDist = sdfRoundedRect(dx, dy, 32, 32, 30, 30, 10);
      if (bgDist > 0.5) {
        // Outside background -> transparent
        buf[offset] = 0;
        buf[offset + 1] = 0;
        buf[offset + 2] = 0;
        buf[offset + 3] = 0;
        continue;
      }

      // 2. Hardhat brim (rounded rectangle at bottom of helmet)
      // Brim spans from x=8 to x=56, y=37 to y=43, corner radius 3
      const brimDist = sdfRoundedRect(dx, dy, 32, 40, 24, 3, 3);

      // 3. Hardhat dome (semi-ellipse on top)
      // Ellipse center at (32, 40), radii rx=18, ry=26
      // Only take the top portion (dy < 40)
      let domeDist = sdfEllipse(dx, dy, 32, 40, 18, 26);
      // Flatten the bottom: only consider dome above y=38
      if (dy > 40) domeDist = Math.max(domeDist, dy - 40);
      if (dy >= 38 && dy <= 40) domeDist = Math.min(domeDist, 0);

      // 4. Ridge on top of hardhat
      const ridgeDist = sdfRoundedRect(dx, dy, 32, 13, 3, 3, 2);

      // 5. Brim bottom edge shadow
      const brimShadowDist = sdfRoundedRect(dx, dy, 32, 43, 22, 1.5, 1.5);

      // Determine color based on distances
      const isBrim = brimDist <= 0;
      const isDome = domeDist <= 0;
      const isRidge = ridgeDist <= 0;
      const isBrimShadow = brimShadowDist <= 0 && dy > 42;

      // Antialiasing: use distance to blend at edges
      const hardEdge = 1.0;

      if (isRidge) {
        buf[offset] = ORANGE_LIGHT_R;
        buf[offset + 1] = ORANGE_LIGHT_G;
        buf[offset + 2] = ORANGE_LIGHT_B;
        buf[offset + 3] = 255;
      } else if (isDome) {
        // Dome with gradient highlight on left side
        const highlight = Math.max(0, 1 - Math.abs(dx - 24) / 8) * Math.max(0, 1 - Math.abs(dy - 28) / 12);
        const r = clamp(Math.round(ORANGE_R + (ORANGE_LIGHT_R - ORANGE_R) * highlight * 0.5), 0, 255);
        const g = clamp(Math.round(ORANGE_G + (ORANGE_LIGHT_G - ORANGE_G) * highlight * 0.5), 0, 255);
        const b = clamp(Math.round(ORANGE_B + (ORANGE_LIGHT_B - ORANGE_B) * highlight * 0.5), 0, 255);
        buf[offset] = r;
        buf[offset + 1] = g;
        buf[offset + 2] = b;
        buf[offset + 3] = 255;
      } else if (isBrim) {
        if (isBrimShadow) {
          buf[offset] = ORANGE_DARK_R;
          buf[offset + 1] = ORANGE_DARK_G;
          buf[offset + 2] = ORANGE_DARK_B;
        } else {
          buf[offset] = ORANGE_R;
          buf[offset + 1] = ORANGE_G;
          buf[offset + 2] = ORANGE_B;
        }
        buf[offset + 3] = 255;
      } else if (bgDist <= 0) {
        // Navy background with soft antialiasing at outer edge
        const alpha = bgDist > -0.5 ? clamp(Math.round((bgDist + 0.5) * 255 * 2), 0, 255) : 255;
        // Inside background but with edge softening
        const edgeAlpha = bgDist > -1.0 ? clamp(Math.round((1 + bgDist) * 255), 0, 255) : 255;
        buf[offset] = NAVY_R;
        buf[offset + 1] = NAVY_G;
        buf[offset + 2] = NAVY_B;
        buf[offset + 3] = edgeAlpha;
      } else {
        // Shouldn't reach here but just in case
        buf[offset] = 0;
        buf[offset + 1] = 0;
        buf[offset + 2] = 0;
        buf[offset + 3] = 0;
      }
    }
  }

  return buf;
}

// ============================================================
// ICO assembler
// ============================================================

function createICO(pngBuffers, sizes) {
  const count = pngBuffers.length;

  // ICO header: 6 bytes
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0);     // reserved
  header.writeUInt16LE(1, 2);     // type: 1 = ICO
  header.writeUInt16LE(count, 4); // image count

  // Calculate offsets: header (6) + directory entries (16 * count)
  let dataOffset = 6 + count * 16;

  const directory = Buffer.alloc(count * 16);
  const imageDatas = [];

  for (let i = 0; i < count; i++) {
    const size = sizes[i];
    const png = pngBuffers[i];
    const dirOffset = i * 16;

    directory[dirOffset + 0] = size < 256 ? size : 0;  // width (0 means 256)
    directory[dirOffset + 1] = size < 256 ? size : 0;  // height
    directory[dirOffset + 2] = 0;  // color palette
    directory[dirOffset + 3] = 0;  // reserved
    directory.writeUInt16LE(1, dirOffset + 4);  // color planes
    directory.writeUInt16LE(32, dirOffset + 6); // bits per pixel
    directory.writeUInt32LE(png.length, dirOffset + 8);  // image data size
    directory.writeUInt32LE(dataOffset, dirOffset + 12); // offset from start

    imageDatas.push(png);
    dataOffset += png.length;
  }

  return Buffer.concat([header, directory, ...imageDatas]);
}

// ============================================================
// Main
// ============================================================

console.log('BuildProp Icon Generator');
console.log('========================');
console.log('Generating PNG data for sizes:', SIZES.join(', '));

const pngBuffers = SIZES.map(size => {
  console.log(`  Rendering ${size}x${size}...`);
  const rgba = drawIcon(size);
  const png = createPNG(size, size, rgba);
  console.log(`    PNG: ${png.length} bytes`);
  return png;
});

console.log('Assembling ICO container...');
const ico = createICO(pngBuffers, SIZES);
console.log(`Total ICO size: ${ico.length} bytes`);

// Ensure output directory exists
const outDir = path.dirname(OUTPUT);
if (!fs.existsSync(outDir)) {
  fs.mkdirSync(outDir, { recursive: true });
}

fs.writeFileSync(OUTPUT, ico);
console.log(`Written to: ${OUTPUT}`);
console.log('Done!');
