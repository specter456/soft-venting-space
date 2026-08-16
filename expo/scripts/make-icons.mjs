#!/usr/bin/env node
/**
 * Generates Venting's PWA icons as real PNGs without any image tooling.
 * A pastel lavender rounded square with a white cloud and a tiny blush heart,
 * rendered with supersampled anti-aliasing, encoded with Node's zlib.
 *
 * Usage: node scripts/make-icons.mjs
 */

import { deflateSync } from "node:zlib";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");

/* ─── PNG encoder ─────────────────────────────────────────────────── */

const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();

function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const typeBuf = Buffer.from(type, "ascii");
  const crcBuf = Buffer.alloc(4);
  crcBuf.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])), 0);
  return Buffer.concat([len, typeBuf, data, crcBuf]);
}

function encodePng(width, height, rgba) {
  const sig = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // color type RGBA
  // raw scanlines with filter byte 0
  const raw = Buffer.alloc(height * (1 + width * 4));
  for (let y = 0; y < height; y++) {
    const rowStart = y * (1 + width * 4);
    raw[rowStart] = 0;
    rgba.copy(raw, rowStart + 1, y * width * 4, (y + 1) * width * 4);
  }
  const idat = deflateSync(raw, { level: 9 });
  return Buffer.concat([
    sig,
    chunk("IHDR", ihdr),
    chunk("IDAT", idat),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

/* ─── Shapes (normalized 0..1 coords) ─────────────────────────────── */

const inCircle = (x, y, cx, cy, r) => {
  const dx = x - cx;
  const dy = y - cy;
  return dx * dx + dy * dy <= r * r;
};

const inRoundRect = (x, y, x0, y0, x1, y1, r) => {
  if (x < x0 || x > x1 || y < y0 || y > y1) return false;
  const cx = Math.max(x0 + r, Math.min(x, x1 - r));
  const cy = Math.max(y0 + r, Math.min(y, y1 - r));
  const dx = x - cx;
  const dy = y - cy;
  return dx * dx + dy * dy <= r * r;
};

const inCloud = (x, y) =>
  inCircle(x, y, 0.34, 0.44, 0.15) ||
  inCircle(x, y, 0.5, 0.37, 0.19) ||
  inCircle(x, y, 0.66, 0.44, 0.15) ||
  inRoundRect(x, y, 0.26, 0.42, 0.74, 0.58, 0.1);

const inHeart = (x, y) => {
  // heart: two circles + a downward triangle, centered at (0.5, 0.72)
  const hx = 0.5;
  const hy = 0.72;
  const s = 0.085;
  if (inCircle(x, y, hx - s * 0.55, hy - s * 0.15, s * 0.62)) return true;
  if (inCircle(x, y, hx + s * 0.55, hy - s * 0.15, s * 0.62)) return true;
  // triangle pointing down (the heart tip)
  if (x >= hx - s * 1.05 && x <= hx + s * 1.05 && y >= hy - s * 0.05) {
    const width = s * 1.05 * (1 - (y - (hy - s * 0.05)) / (s * 1.1));
    if (Math.abs(x - hx) <= width) return true;
  }
  return false;
};

function sample(size) {
  const SS = 3; // supersample factor
  const rgba = Buffer.alloc(size * size * 4);
  const bgTop = [0xe6, 0xdc, 0xf7];
  const bgBottom = [0xbf, 0xa8, 0xe6];
  const white = [0xff, 0xff, 0xff];
  const heart = [0xf2, 0xb8, 0xc6];

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      let r = 0;
      let g = 0;
      let b = 0;
      let a = 0;
      for (let sy = 0; sy < SS; sy++) {
        for (let sx = 0; sx < SS; sx++) {
          const px = (x + (sx + 0.5) / SS) / size;
          const py = (y + (sy + 0.5) / SS) / size;
          // rounded-square mask
          const inCard = inRoundRect(px, py, 0.02, 0.02, 0.98, 0.98, 0.22);
          if (!inCard) continue;
          const t = py;
          let cr = bgTop[0] + (bgBottom[0] - bgTop[0]) * t;
          let cg = bgTop[1] + (bgBottom[1] - bgTop[1]) * t;
          let cb = bgTop[2] + (bgBottom[2] - bgTop[2]) * t;
          if (inHeart(px, py)) {
            cr = heart[0];
            cg = heart[1];
            cb = heart[2];
          } else if (inCloud(px, py)) {
            cr = white[0];
            cg = white[1];
            cb = white[2];
          }
          r += cr;
          g += cg;
          b += cb;
          a += 255;
        }
      }
      const n = SS * SS;
      const o = (y * size + x) * 4;
      if (a === 0) {
        rgba[o] = rgba[o + 1] = rgba[o + 2] = rgba[o + 3] = 0;
      } else {
        rgba[o] = Math.round(r / n);
        rgba[o + 1] = Math.round(g / n);
        rgba[o + 2] = Math.round(b / n);
        rgba[o + 3] = Math.round(a / n);
      }
    }
  }
  return rgba;
}

const sizes = [
  { name: "icon-192.png", size: 192 },
  { name: "icon-512.png", size: 512 },
  { name: "favicon-32.png", size: 32 },
  { name: "apple-touch-icon-180.png", size: 180 },
];

const outDir = join(ROOT, "web", "icons");
mkdirSync(outDir, { recursive: true });

for (const { name, size } of sizes) {
  const rgba = sample(size);
  const png = encodePng(size, size, rgba);
  writeFileSync(join(outDir, name), png);
  console.log(`✓ ${name} (${size}x${size}, ${png.length} bytes)`);
}
