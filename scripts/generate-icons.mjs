import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { deflateSync } from "node:zlib";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const iconsDir = join(root, "public", "icons");

const ROSE = [159, 18, 57];
const FOLD = [107, 15, 42];

const CRC_TABLE = new Int32Array(256).fill(0).map((_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) {
    c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  }
  return c;
});

function crc32(buf) {
  let c = ~0;
  for (const byte of buf) {
    c = CRC_TABLE[(c ^ byte) & 0xff] ^ (c >>> 8);
  }
  return ~c >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const typeBuf = Buffer.from(type, "ascii");
  const crcBuf = Buffer.alloc(4);
  crcBuf.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])));
  return Buffer.concat([len, typeBuf, data, crcBuf]);
}

function encodePng(size, pixel) {
  const stride = size * 4;
  const raw = Buffer.alloc((stride + 1) * size);
  for (let y = 0; y < size; y++) {
    const rowStart = y * (stride + 1);
    raw[rowStart] = 0;
    for (let x = 0; x < size; x++) {
      const [r, g, b, a] = pixel(x, y);
      const off = rowStart + 1 + x * 4;
      raw[off] = r;
      raw[off + 1] = g;
      raw[off + 2] = b;
      raw[off + 3] = a;
    }
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;
  const idat = deflateSync(raw, { level: 9 });
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", ihdr),
    chunk("IDAT", idat),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

function roundedRectCoverage(px, py, size, radius) {
  const half = (size - 1) / 2;
  const dx = Math.abs(px - half) - (half - radius);
  const dy = Math.abs(py - half) - (half - radius);
  const outer = Math.hypot(Math.max(dx, 0), Math.max(dy, 0));
  const dist = outer + Math.min(Math.max(dx, dy), 0) - radius;
  return Math.min(1, Math.max(0, 0.5 - dist));
}

function edgeDist(px, py, ax, ay, bx, by) {
  const ex = bx - ax;
  const ey = by - ay;
  return (ex * (py - ay) - ey * (px - ax)) / Math.hypot(ex, ey);
}

function pointInTriangle(px, py, ax, ay, bx, by, cx, cy) {
  const d1 = edgeDist(px, py, ax, ay, bx, by);
  const d2 = edgeDist(px, py, bx, by, cx, cy);
  const d3 = edgeDist(px, py, cx, cy, ax, ay);
  const hasNeg = d1 < 0 || d2 < 0 || d3 < 0;
  const hasPos = d1 > 0 || d2 > 0 || d3 > 0;
  return !(hasNeg && hasPos);
}

function makeRenderer(size, { radius, contentScale }) {
  const r = radius === null ? 0 : size * radius;

  const s = (v) => v * size * contentScale + size * (1 - contentScale) * 0.5;

  const notchTop = [s(0.5625), s(0.0625)];
  const notchRight = [s(0.90625), s(0.5)];
  const notchLeft = [s(0.640625), s(0.790625)];

  const foldA = [s(0.5625), s(0.0625)];
  const foldB = [s(0.90625), s(0.3225)];
  const foldC = [s(0.6875), s(0.0625)];

  return (x, y) => {
    const bg = radius === null ? 1 : roundedRectCoverage(x, y, size, r);
    if (bg <= 0) return [0, 0, 0, 0];

    const inNotch =
      pointInTriangle(x, y, notchTop[0], notchTop[1], notchRight[0], notchRight[1], notchLeft[0], notchLeft[1]) ||
      (x > s(0.5625) && y < s(0.0625) + ((s(0.90625) - s(0.5625)) > 0 ? (y - s(0.0625)) * 0 : 0) && false);

    if (inNotch && bg > 0.5) return [0, 0, 0, 0];

    const inFold = pointInTriangle(x, y, foldA[0], foldA[1], foldB[0], foldB[1], foldC[0], foldC[1]);

    const color = inFold ? FOLD : ROSE;
    const edge = inNotch ? Math.min(1, Math.max(0, (bg - 0.3) * 3)) : bg;

    return [
      Math.round(color[0]),
      Math.round(color[1]),
      Math.round(color[2]),
      Math.round(255 * edge),
    ];
  };
}

function encodeIco(pngData) {
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(1, 4);
  const entry = Buffer.alloc(16);
  entry[0] = 32;
  entry[1] = 32;
  entry.writeUInt16LE(1, 4);
  entry.writeUInt16LE(32, 6);
  entry.writeUInt32LE(pngData.length, 8);
  entry.writeUInt32LE(22, 12);
  return Buffer.concat([header, entry, pngData]);
}

function write(name, data) {
  const path = join(iconsDir, name);
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, data);
  console.log(`wrote ${path} (${data.length} bytes)`);
}

write("icon-192.png", encodePng(192, makeRenderer(192, { radius: 0.22, contentScale: 0.85 })));
write("icon-512.png", encodePng(512, makeRenderer(512, { radius: 0.22, contentScale: 0.85 })));
write(
  "icon-maskable-512.png",
  encodePng(512, makeRenderer(512, { radius: null, contentScale: 0.72 })),
);
writeFileSync(join(root, "app", "apple-icon.png"), encodePng(180, makeRenderer(180, { radius: null, contentScale: 0.78 })));
console.log(`wrote ${join(root, "app", "apple-icon.png")}`);
writeFileSync(join(root, "app", "favicon.ico"), encodeIco(encodePng(32, makeRenderer(32, { radius: 0.22, contentScale: 0.85 }))));
console.log(`wrote ${join(root, "app", "favicon.ico")}`);
