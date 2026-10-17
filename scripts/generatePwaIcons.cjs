const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

// CRC32 table
const crcTable = [];
for (let n = 0; n < 256; n++) {
  let c = n;
  for (let k = 0; k < 8; k++) {
    c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
  }
  crcTable[n] = c;
}

function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    c = crcTable[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  }
  return (c ^ 0xffffffff) >>> 0;
}

function makeChunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const typeBuf = Buffer.from(type, 'ascii');
  const crcBuf = Buffer.alloc(4);
  crcBuf.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])), 0);
  return Buffer.concat([len, typeBuf, data, crcBuf]);
}

function createPng(width, height, getPixel) {
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // 8 bits per channel
  ihdr[9] = 6; // RGBA
  ihdr[10] = 0; // compression
  ihdr[11] = 0; // filter
  ihdr[12] = 0; // interlace

  const rowSize = 1 + width * 4;
  const raw = Buffer.alloc(height * rowSize);
  for (let y = 0; y < height; y++) {
    const rowOffset = y * rowSize;
    raw[rowOffset] = 0; // filter type 0
    for (let x = 0; x < width; x++) {
      const [r, g, b, a] = getPixel(x, y, width, height);
      const pxOffset = rowOffset + 1 + x * 4;
      raw[pxOffset] = r;
      raw[pxOffset + 1] = g;
      raw[pxOffset + 2] = b;
      raw[pxOffset + 3] = a;
    }
  }

  const compressed = zlib.deflateSync(raw, { level: 9 });
  const iend = Buffer.alloc(0);

  return Buffer.concat([
    sig,
    makeChunk('IHDR', ihdr),
    makeChunk('IDAT', compressed),
    makeChunk('IEND', iend)
  ]);
}

// 7x9 Font representation for 'S', 'V', 'M'
const fontSVM = {
  S: [
    " 11111 ",
    "11   11",
    "11     ",
    " 1111  ",
    "   111 ",
    "     11",
    "11   11",
    " 11111 ",
    "       "
  ],
  V: [
    "11   11",
    "11   11",
    "11   11",
    " 11 11 ",
    " 11 11 ",
    "  111  ",
    "  111  ",
    "   1   ",
    "       "
  ],
  M: [
    "11   11",
    "111 111",
    "1111111",
    "11 1 11",
    "11   11",
    "11   11",
    "11   11",
    "11   11",
    "       "
  ]
};

function renderPixel(x, y, size) {
  // Normalized coords [-1, 1]
  const nx = (x / size) * 2 - 1;
  const ny = (y / size) * 2 - 1;
  const dist = Math.sqrt(nx * nx + ny * ny);

  // Background gradient: Rich navy blue to dark midnight blue
  const angle = Math.atan2(ny, nx);
  let bgR = Math.round(15 + (1 - (ny + 1) * 0.5) * 20);
  let bgG = Math.round(23 + (1 - (ny + 1) * 0.5) * 45);
  let bgB = Math.round(42 + (1 - (ny + 1) * 0.5) * 115);

  // Radiant fireworks glow in the center
  const glow = Math.max(0, 1 - dist * 1.3);
  bgR = Math.min(255, bgR + Math.round(glow * 40));
  bgG = Math.min(255, bgG + Math.round(glow * 50));
  bgB = Math.min(255, bgB + Math.round(glow * 90));

  // Sparks / Rays
  const rays = 12;
  const rayVal = Math.cos(angle * rays);
  if (rayVal > 0.85 && dist > 0.45 && dist < 0.88) {
    const sparkAlpha = (rayVal - 0.85) / 0.15 * (1 - Math.abs(dist - 0.65) / 0.25);
    bgR = Math.min(255, bgR + Math.round(sparkAlpha * 240));
    bgG = Math.min(255, bgG + Math.round(sparkAlpha * 180));
    bgB = Math.min(255, bgB + Math.round(sparkAlpha * 40));
  }

  // Circular golden badge boundary
  const ringDist = Math.abs(dist - 0.82);
  if (ringDist < 0.02) {
    const ringAlpha = (1 - ringDist / 0.02);
    bgR = Math.round(bgR * (1 - ringAlpha) + 245 * ringAlpha);
    bgG = Math.round(bgG * (1 - ringAlpha) + 158 * ringAlpha);
    bgB = Math.round(bgB * (1 - ringAlpha) + 11 * ringAlpha);
  }

  // Draw Letters "SVM"
  // Map normalized area: x in [-0.58, 0.58], y in [-0.28, 0.20]
  const letterBoxX = nx;
  const letterBoxY = ny;

  let isLetterPixel = false;
  let letterType = 0; // 1: S, 2: V, 3: M

  if (letterBoxY >= -0.26 && letterBoxY <= 0.18) {
    const charNormY = (letterBoxY - (-0.26)) / 0.44; // 0 to 1
    const rowIdx = Math.floor(charNormY * 9);

    if (rowIdx >= 0 && rowIdx < 9) {
      // S: x in [-0.54, -0.18]
      if (letterBoxX >= -0.54 && letterBoxX <= -0.18) {
        const charNormX = (letterBoxX - (-0.54)) / 0.36;
        const colIdx = Math.floor(charNormX * 7);
        if (colIdx >= 0 && colIdx < 7 && fontSVM.S[rowIdx][colIdx] === '1') {
          isLetterPixel = true;
          letterType = 1;
        }
      }
      // V: x in [-0.17, 0.17]
      else if (letterBoxX >= -0.17 && letterBoxX <= 0.17) {
        const charNormX = (letterBoxX - (-0.17)) / 0.34;
        const colIdx = Math.floor(charNormX * 7);
        if (colIdx >= 0 && colIdx < 7 && fontSVM.V[rowIdx][colIdx] === '1') {
          isLetterPixel = true;
          letterType = 2;
        }
      }
      // M: x in [0.18, 0.54]
      else if (letterBoxX >= 0.18 && letterBoxX <= 0.54) {
        const charNormX = (letterBoxX - 0.18) / 0.36;
        const colIdx = Math.floor(charNormX * 7);
        if (colIdx >= 0 && colIdx < 7 && fontSVM.M[rowIdx][colIdx] === '1') {
          isLetterPixel = true;
          letterType = 3;
        }
      }
    }
  }

  if (isLetterPixel) {
    // Letters in bright gold with subtle gradient
    const grad = (letterBoxY + 0.26) / 0.44;
    return [
      Math.round(255 - grad * 15),
      Math.round(215 - grad * 35),
      Math.round(40 + grad * 20),
      255
    ];
  }

  // Draw Cracker Sparks at the top (Rocket / Firecracker Burst)
  // Spark 1 at top: nx around 0, ny around -0.55
  const topDist = Math.sqrt(nx * nx + (ny + 0.52) * (ny + 0.52));
  if (topDist < 0.10) {
    const sAlpha = 1 - topDist / 0.10;
    bgR = Math.min(255, bgR + Math.round(sAlpha * 255));
    bgG = Math.min(255, bgG + Math.round(sAlpha * 120));
    bgB = Math.min(255, bgB + Math.round(sAlpha * 20));
  }

  // Subtitle banner "CRACKERS" dot underline at y = 0.32
  if (ny >= 0.28 && ny <= 0.34 && Math.abs(nx) <= 0.45) {
    return [245, 158, 11, 240];
  }

  // Subtitle dot accents
  if (ny >= 0.42 && ny <= 0.46 && Math.abs(nx) <= 0.30) {
    const dotPhase = Math.sin(nx * 20);
    if (dotPhase > 0.4) {
      return [254, 240, 138, 220];
    }
  }

  return [bgR, bgG, bgB, 255];
}

const publicDir = path.resolve(__dirname, '../public');
if (!fs.existsSync(publicDir)) {
  fs.mkdirSync(publicDir, { recursive: true });
}

// Generate 192x192
const pwa192 = createPng(192, 192, (x, y, s) => renderPixel(x, y, s));
fs.writeFileSync(path.join(publicDir, 'pwa-192x192.png'), pwa192);
console.log('Generated pwa-192x192.png (size:', pwa192.length, ')');

// Generate 512x512
const pwa512 = createPng(512, 512, (x, y, s) => renderPixel(x, y, s));
fs.writeFileSync(path.join(publicDir, 'pwa-512x512.png'), pwa512);
console.log('Generated pwa-512x512.png (size:', pwa512.length, ')');

// Generate apple-touch-icon 180x180
const appleIcon = createPng(180, 180, (x, y, s) => renderPixel(x, y, s));
fs.writeFileSync(path.join(publicDir, 'apple-touch-icon.png'), appleIcon);
console.log('Generated apple-touch-icon.png (size:', appleIcon.length, ')');

// Generate favicon.png 64x64
const favicon64 = createPng(64, 64, (x, y, s) => renderPixel(x, y, s));
fs.writeFileSync(path.join(publicDir, 'favicon.png'), favicon64);
console.log('Generated favicon.png (size:', favicon64.length, ')');
