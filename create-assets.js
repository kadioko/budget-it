const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

const ROOT = __dirname;

const ensureDir = (dir) => {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
};

const crcTable = (() => {
  const table = new Uint32Array(256);
  for (let i = 0; i < 256; i += 1) {
    let c = i;
    for (let k = 0; k < 8; k += 1) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
    table[i] = c >>> 0;
  }
  return table;
})();

const crc32 = (buffer) => {
  let c = 0xffffffff;
  for (let i = 0; i < buffer.length; i += 1) {
    c = crcTable[(c ^ buffer[i]) & 0xff] ^ (c >>> 8);
  }
  return (c ^ 0xffffffff) >>> 0;
};

const chunk = (type, data = Buffer.alloc(0)) => {
  const typeBuffer = Buffer.from(type);
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length, 0);
  const checksum = Buffer.alloc(4);
  checksum.writeUInt32BE(crc32(Buffer.concat([typeBuffer, data])), 0);
  return Buffer.concat([length, typeBuffer, data, checksum]);
};

const createCanvas = (width, height, fill = [0, 0, 0, 0]) => ({
  width,
  height,
  data: new Uint8ClampedArray(width * height * 4).fill(0).map((_, index) => fill[index % 4]),
});

const setPixel = (canvas, x, y, color) => {
  if (x < 0 || y < 0 || x >= canvas.width || y >= canvas.height) return;
  const alpha = color[3] / 255;
  const index = (Math.floor(y) * canvas.width + Math.floor(x)) * 4;
  canvas.data[index] = Math.round(color[0] * alpha + canvas.data[index] * (1 - alpha));
  canvas.data[index + 1] = Math.round(color[1] * alpha + canvas.data[index + 1] * (1 - alpha));
  canvas.data[index + 2] = Math.round(color[2] * alpha + canvas.data[index + 2] * (1 - alpha));
  canvas.data[index + 3] = Math.min(255, Math.round(color[3] + canvas.data[index + 3] * (1 - alpha)));
};

const fillRect = (canvas, x, y, width, height, color) => {
  for (let yy = Math.max(0, Math.floor(y)); yy < Math.min(canvas.height, Math.ceil(y + height)); yy += 1) {
    for (let xx = Math.max(0, Math.floor(x)); xx < Math.min(canvas.width, Math.ceil(x + width)); xx += 1) {
      setPixel(canvas, xx, yy, color);
    }
  }
};

const fillRoundedRect = (canvas, x, y, width, height, radius, color) => {
  for (let yy = Math.floor(y); yy < Math.ceil(y + height); yy += 1) {
    for (let xx = Math.floor(x); xx < Math.ceil(x + width); xx += 1) {
      const dx = xx < x + radius ? x + radius - xx : xx > x + width - radius ? xx - (x + width - radius) : 0;
      const dy = yy < y + radius ? y + radius - yy : yy > y + height - radius ? yy - (y + height - radius) : 0;
      if (dx * dx + dy * dy <= radius * radius) setPixel(canvas, xx, yy, color);
    }
  }
};

const fillCircle = (canvas, cx, cy, radius, color) => {
  const r2 = radius * radius;
  for (let yy = Math.floor(cy - radius); yy <= Math.ceil(cy + radius); yy += 1) {
    for (let xx = Math.floor(cx - radius); xx <= Math.ceil(cx + radius); xx += 1) {
      const dx = xx - cx;
      const dy = yy - cy;
      if (dx * dx + dy * dy <= r2) setPixel(canvas, xx, yy, color);
    }
  }
};

const drawLine = (canvas, x1, y1, x2, y2, width, color) => {
  const steps = Math.max(Math.abs(x2 - x1), Math.abs(y2 - y1)) * 2;
  for (let i = 0; i <= steps; i += 1) {
    const t = steps === 0 ? 0 : i / steps;
    fillCircle(canvas, x1 + (x2 - x1) * t, y1 + (y2 - y1) * t, width / 2, color);
  }
};

const createPNG = (canvas) => {
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(canvas.width, 0);
  ihdr.writeUInt32BE(canvas.height, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;

  const raw = Buffer.alloc(canvas.height * (1 + canvas.width * 4));
  let offset = 0;
  for (let y = 0; y < canvas.height; y += 1) {
    raw[offset] = 0;
    offset += 1;
    for (let x = 0; x < canvas.width; x += 1) {
      const index = (y * canvas.width + x) * 4;
      raw[offset] = canvas.data[index];
      raw[offset + 1] = canvas.data[index + 1];
      raw[offset + 2] = canvas.data[index + 2];
      raw[offset + 3] = canvas.data[index + 3];
      offset += 4;
    }
  }

  return Buffer.concat([
    signature,
    chunk('IHDR', ihdr),
    chunk('IDAT', zlib.deflateSync(raw)),
    chunk('IEND'),
  ]);
};

const writePNG = (file, canvas) => fs.writeFileSync(path.join(ROOT, file), createPNG(canvas));

const drawLogoMark = (size, transparent = false) => {
  const canvas = createCanvas(size, size, transparent ? [0, 0, 0, 0] : [246, 250, 248, 255]);
  const scale = size / 1024;
  const s = (value) => value * scale;

  fillRoundedRect(canvas, s(70), s(70), s(884), s(884), s(210), [10, 39, 46, 255]);
  fillRoundedRect(canvas, s(116), s(116), s(792), s(792), s(178), [19, 83, 80, 255]);
  fillCircle(canvas, s(815), s(178), s(180), [41, 204, 156, 215]);
  fillCircle(canvas, s(190), s(830), s(210), [14, 165, 233, 180]);

  fillRoundedRect(canvas, s(228), s(318), s(568), s(390), s(84), [255, 255, 255, 245]);
  fillRoundedRect(canvas, s(270), s(250), s(390), s(130), s(54), [224, 251, 244, 255]);
  fillRoundedRect(canvas, s(276), s(375), s(470), s(250), s(50), [11, 66, 68, 255]);
  fillRoundedRect(canvas, s(654), s(438), s(150), s(150), s(46), [45, 212, 191, 255]);
  fillCircle(canvas, s(724), s(514), s(26), [10, 39, 46, 255]);

  drawLine(canvas, s(345), s(568), s(450), s(488), s(48), [45, 212, 191, 255]);
  drawLine(canvas, s(450), s(488), s(535), s(535), s(48), [45, 212, 191, 255]);
  drawLine(canvas, s(535), s(535), s(644), s(430), s(48), [45, 212, 191, 255]);
  drawLine(canvas, s(610), s(430), s(650), s(430), s(34), [45, 212, 191, 255]);
  drawLine(canvas, s(644), s(430), s(644), s(470), s(34), [45, 212, 191, 255]);

  fillCircle(canvas, s(345), s(568), s(25), [255, 255, 255, 255]);
  fillCircle(canvas, s(450), s(488), s(25), [255, 255, 255, 255]);
  fillCircle(canvas, s(535), s(535), s(25), [255, 255, 255, 255]);
  return canvas;
};

const drawBrandLogo = () => {
  const canvas = createCanvas(1200, 630, [246, 250, 248, 255]);
  fillRect(canvas, 0, 0, 1200, 630, [246, 250, 248, 255]);
  fillCircle(canvas, 1010, 96, 230, [45, 212, 191, 90]);
  fillCircle(canvas, 120, 560, 260, [14, 165, 233, 70]);
  const mark = drawLogoMark(320, true);
  for (let y = 0; y < mark.height; y += 1) {
    for (let x = 0; x < mark.width; x += 1) {
      const index = (y * mark.width + x) * 4;
      setPixel(canvas, x + 110, y + 155, [
        mark.data[index],
        mark.data[index + 1],
        mark.data[index + 2],
        mark.data[index + 3],
      ]);
    }
  }
  fillRoundedRect(canvas, 500, 220, 520, 62, 18, [10, 39, 46, 255]);
  fillRoundedRect(canvas, 500, 322, 380, 36, 12, [19, 83, 80, 220]);
  fillRoundedRect(canvas, 500, 382, 440, 36, 12, [45, 212, 191, 180]);
  return canvas;
};

const svgLogo = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1024" role="img" aria-label="Budget It logo">
  <rect x="70" y="70" width="884" height="884" rx="210" fill="#0a272e"/>
  <rect x="116" y="116" width="792" height="792" rx="178" fill="#135350"/>
  <circle cx="815" cy="178" r="180" fill="#29cc9c" opacity=".84"/>
  <circle cx="190" cy="830" r="210" fill="#0ea5e9" opacity=".72"/>
  <rect x="228" y="318" width="568" height="390" rx="84" fill="#fff" opacity=".96"/>
  <rect x="270" y="250" width="390" height="130" rx="54" fill="#e0fbf4"/>
  <rect x="276" y="375" width="470" height="250" rx="50" fill="#0b4244"/>
  <rect x="654" y="438" width="150" height="150" rx="46" fill="#2dd4bf"/>
  <circle cx="724" cy="514" r="26" fill="#0a272e"/>
  <path d="M345 568l105-80 85 47 109-105" fill="none" stroke="#2dd4bf" stroke-width="48" stroke-linecap="round" stroke-linejoin="round"/>
  <path d="M610 430h40v40" fill="none" stroke="#2dd4bf" stroke-width="34" stroke-linecap="round" stroke-linejoin="round"/>
  <circle cx="345" cy="568" r="25" fill="#fff"/>
  <circle cx="450" cy="488" r="25" fill="#fff"/>
  <circle cx="535" cy="535" r="25" fill="#fff"/>
</svg>
`;

ensureDir(path.join(ROOT, 'assets'));
ensureDir(path.join(ROOT, 'public'));

writePNG('assets/icon.png', drawLogoMark(1024));
writePNG('assets/adaptive-icon.png', drawLogoMark(1024, true));
writePNG('assets/favicon.png', drawLogoMark(48));
writePNG('assets/splash.png', drawLogoMark(1024, true));
writePNG('public/icon.png', drawLogoMark(1024));
writePNG('public/icon-192.png', drawLogoMark(192));
writePNG('public/icon-512.png', drawLogoMark(512));
writePNG('public/apple-touch-icon.png', drawLogoMark(180));
writePNG('public/favicon-32.png', drawLogoMark(32));
writePNG('public/favicon.ico', drawLogoMark(48));
writePNG('public/brand-logo.png', drawBrandLogo());
fs.writeFileSync(path.join(ROOT, 'public/icon.svg'), svgLogo);

console.log('Created Budget It logo assets.');
