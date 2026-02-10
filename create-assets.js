const fs = require('fs');
const zlib = require('zlib');

function createPNG(w, h, r, g, b) {
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  // IHDR chunk
  const ihdrData = Buffer.alloc(13);
  ihdrData.writeUInt32BE(w, 0);
  ihdrData.writeUInt32BE(h, 4);
  ihdrData[8] = 8;  // bit depth
  ihdrData[9] = 2;  // color type (RGB)
  ihdrData[10] = 0; // compression
  ihdrData[11] = 0; // filter
  ihdrData[12] = 0; // interlace

  const ihdrType = Buffer.from('IHDR');
  const ihdrLen = Buffer.alloc(4);
  ihdrLen.writeUInt32BE(13, 0);
  const ihdrCrc = Buffer.alloc(4);
  ihdrCrc.writeUInt32BE(zlib.crc32(Buffer.concat([ihdrType, ihdrData])) >>> 0, 0);

  // IDAT chunk
  const rawData = Buffer.alloc(h * (1 + w * 3));
  let offset = 0;
  for (let y = 0; y < h; y++) {
    rawData[offset++] = 0; // filter none
    for (let x = 0; x < w; x++) {
      rawData[offset++] = r;
      rawData[offset++] = g;
      rawData[offset++] = b;
    }
  }
  const deflated = zlib.deflateSync(rawData);
  const idatType = Buffer.from('IDAT');
  const idatLen = Buffer.alloc(4);
  idatLen.writeUInt32BE(deflated.length, 0);
  const idatCrc = Buffer.alloc(4);
  idatCrc.writeUInt32BE(zlib.crc32(Buffer.concat([idatType, deflated])) >>> 0, 0);

  // IEND chunk
  const iend = Buffer.from([0, 0, 0, 0, 73, 69, 78, 68, 0xAE, 0x42, 0x60, 0x82]);

  return Buffer.concat([sig, ihdrLen, ihdrType, ihdrData, ihdrCrc, idatLen, idatType, deflated, idatCrc, iend]);
}

if (!fs.existsSync('assets')) fs.mkdirSync('assets');

// Blue (#3498db) icons
fs.writeFileSync('assets/icon.png', createPNG(1024, 1024, 52, 152, 219));
fs.writeFileSync('assets/adaptive-icon.png', createPNG(1024, 1024, 52, 152, 219));
fs.writeFileSync('assets/favicon.png', createPNG(48, 48, 52, 152, 219));
// White splash
fs.writeFileSync('assets/splash.png', createPNG(1284, 2778, 255, 255, 255));

console.log('Created all asset PNGs successfully');
