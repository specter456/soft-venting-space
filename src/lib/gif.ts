/**
 * Minimal GIF89a encoder written in pure TypeScript — no dependencies.
 *
 * Turns a list of RGBA frames into a looping animated GIF. Each frame gets
 * its own adaptive 256-color palette (median cut) and a local color table,
 * then the indexed pixels are LZW-compressed. Deliberately simple, but fully
 * correct: the output plays in any browser / <img> tag.
 *
 * All encoding happens on-device; nothing is uploaded anywhere.
 */

interface RgbaFrame {
  width: number;
  height: number;
  data: Uint8ClampedArray; // RGBA, length width*height*4
}

/* ─── Quantization (median cut) ────────────────────────────────────── */

function quantize(
  frame: RgbaFrame,
): { palette: [number, number, number][]; indices: Uint8Array } {
  const { width, height, data } = frame;
  const count = width * height;

  // unique colors → packed rgb ints
  const colorMap = new Map<number, number>();
  const colors: number[] = [];
  const pixelColor = new Uint32Array(count);
  for (let i = 0, p = 0; i < data.length; i += 4, p++) {
    const key = (data[i] << 16) | (data[i + 1] << 8) | data[i + 2];
    let ci = colorMap.get(key);
    if (ci === undefined) {
      ci = colors.length;
      colorMap.set(key, ci);
      colors.push(key);
    }
    pixelColor[p] = ci;
  }

  // median cut: repeatedly split the box with the largest channel range
  const boxes: number[][] = [colors.map((_, i) => i)];
  const target = Math.min(256, colors.length);
  while (boxes.length < target) {
    let best = -1;
    let bestRange = -1;
    let bestChan = 0;
    for (let b = 0; b < boxes.length; b++) {
      const box = boxes[b];
      if (box.length < 2) continue;
      let minR = 255, minG = 255, minB = 255;
      let maxR = 0, maxG = 0, maxB = 0;
      for (const ci of box) {
        const c = colors[ci];
        const r = (c >> 16) & 255, g = (c >> 8) & 255, bl = c & 255;
        if (r < minR) minR = r;
        if (g < minG) minG = g;
        if (bl < minB) minB = bl;
        if (r > maxR) maxR = r;
        if (g > maxG) maxG = g;
        if (bl > maxB) maxB = bl;
      }
      const range = Math.max(maxR - minR, maxG - minG, maxB - minB);
      if (range > bestRange) {
        bestRange = range;
        best = b;
        bestChan = range === maxR - minR ? 0 : range === maxG - minG ? 1 : 2;
      }
    }
    if (best === -1) break;
    const box = boxes[best];
    const channel = (ci: number) => {
      const c = colors[ci];
      return bestChan === 0 ? (c >> 16) & 255 : bestChan === 1 ? (c >> 8) & 255 : c & 255;
    };
    box.sort((a, b) => channel(a) - channel(b));
    const mid = box.length >> 1;
    boxes[best] = box.slice(0, mid);
    boxes.push(box.slice(mid));
  }

  // palette = box averages, padded to 256 entries
  const palette: [number, number, number][] = boxes.map((box) => {
    let r = 0, g = 0, b = 0;
    for (const ci of box) {
      const c = colors[ci];
      r += (c >> 16) & 255;
      g += (c >> 8) & 255;
      b += c & 255;
    }
    const n = Math.max(1, box.length);
    return [Math.round(r / n), Math.round(g / n), Math.round(b / n)];
  });
  while (palette.length < 256) palette.push([0, 0, 0]);

  // map each pixel to its palette index via a 5-bit lookup grid
  const cellMap = new Map<number, number>();
  for (let p = 0; p < boxes.length; p++) {
    const [r, g, b] = palette[p];
    const key = ((r >> 3) << 10) | ((g >> 3) << 5) | (b >> 3);
    if (!cellMap.has(key)) cellMap.set(key, p);
  }

  const indices = new Uint8Array(count);
  for (let i = 0; i < count; i++) {
    const c = colors[pixelColor[i]];
    const r = (c >> 16) & 255, g = (c >> 8) & 255, b = c & 255;
    const key = ((r >> 3) << 10) | ((g >> 3) << 5) | (b >> 3);
    let p = cellMap.get(key);
    if (p === undefined) {
      let bestD = Infinity;
      p = 0;
      for (let q = 0; q < boxes.length; q++) {
        const pr = palette[q][0], pg = palette[q][1], pb = palette[q][2];
        const d = (pr - r) * (pr - r) + (pg - g) * (pg - g) + (pb - b) * (pb - b);
        if (d < bestD) {
          bestD = d;
          p = q;
        }
      }
    }
    indices[i] = p;
  }

  return { palette, indices };
}

/* ─── LZW compression (GIF flavor) ─────────────────────────────────── */

function lzwEncode(indices: Uint8Array, minCodeSize: number): number[] {
  const clearCode = 1 << minCodeSize; // 256
  const eoiCode = clearCode + 1; // 257
  let codeSize = minCodeSize + 1;
  let nextCode = eoiCode + 1;
  const dict = new Map<string, number>();
  const out: number[] = [];
  let bits = 0;
  let bitCount = 0;

  const emit = (code: number) => {
    bits |= code << bitCount;
    bitCount += codeSize;
    while (bitCount >= 8) {
      out.push(bits & 0xff);
      bits >>>= 8;
      bitCount -= 8;
    }
  };

  const resetDict = () => {
    dict.clear();
    nextCode = eoiCode + 1;
    codeSize = minCodeSize + 1;
  };

  // GIF LZW code-size rule: the encoder emits a code at the current size,
  // then bumps the size when the *next* dictionary entry would cross
  // 2^codeSize (checked here, before the insert that happens after this
  // call). The decoder runs one dictionary entry behind and bumps after its
  // own increment, so the two sides stay in lock-step on the same code
  // boundary — codes 1..255 at 9 bits, 256..767 at 10 bits, etc.
  const emitCode = (code: number) => {
    emit(code);
    if (nextCode >= 1 << codeSize && codeSize < 12) {
      codeSize++;
    }
  };

  emit(clearCode);

  if (indices.length === 0) {
    emit(eoiCode);
    if (bitCount > 0) out.push(bits & 0xff);
    return out;
  }

  // The first byte seeds the walk — its code is the byte value itself
  // (single bytes are never added to the string dictionary).
  let current = String(indices[0]);
  for (let i = 1; i < indices.length; i++) {
    const k = indices[i];
    const key = `${current},${k}`;
    if (dict.has(key)) {
      current = key;
    } else {
      // emit the code for the longest known prefix (raw byte for singles)
      emitCode(dict.get(current) ?? Number(current));
      if (nextCode <= 4095) {
        dict.set(key, nextCode++);
      } else {
        // string table full (12-bit max) — start over with a clear code
        emit(clearCode);
        resetDict();
      }
      current = String(k);
    }
  }
  emitCode(dict.get(current) ?? Number(current));
  emit(eoiCode);
  if (bitCount > 0) out.push(bits & 0xff);
  return out;
}

function toSubBlocks(codes: number[]): number[] {
  const out: number[] = [];
  for (let i = 0; i < codes.length; i += 255) {
    const chunk = codes.slice(i, i + 255);
    out.push(chunk.length);
    for (const c of chunk) out.push(c);
  }
  out.push(0);
  return out;
}

/* ─── GIF assembly ─────────────────────────────────────────────────── */

function u16(v: number): number[] {
  return [v & 0xff, (v >> 8) & 0xff];
}

/**
 * Encode RGBA frames into a looping GIF89a binary.
 * @param frames the frames in playback order
 * @param delayMs delay between frames (per-frame in the GIF is 100ms units)
 */
export function encodeGif(frames: RgbaFrame[], delayMs = 650): Uint8Array {
  if (frames.length === 0) throw new Error("no frames to encode");

  const { width, height } = frames[0];
  const delay = Math.max(1, Math.round(delayMs / 10));

  const bytes: number[] = [];
  bytes.push(0x47, 0x49, 0x46, 0x38, 0x39, 0x61); // "GIF89a"
  bytes.push(...u16(width), ...u16(height));
  bytes.push(0x00, 0x00, 0x00); // no global color table

  // NETSCAPE2.0 loop extension — loop forever
  bytes.push(0x21, 0xff, 0x0b);
  bytes.push(...Array.from("NETSCAPE2.0", (c) => c.charCodeAt(0)));
  bytes.push(0x03, 0x01, 0x00, 0x00, 0x00);

  for (const frame of frames) {
    const { palette, indices } = quantize(frame);

    // graphic control extension (delay + no transparency)
    bytes.push(0x21, 0xf9, 0x04, 0x04);
    bytes.push(...u16(delay), 0x00, 0x00);

    // image descriptor with local color table (256 colors → size field 7)
    bytes.push(0x2c);
    bytes.push(...u16(0), ...u16(0), ...u16(width), ...u16(height));
    bytes.push(0x87);

    // local color table
    for (const [r, g, b] of palette) bytes.push(r, g, b);

    // LZW min code size + compressed data
    bytes.push(8);
    bytes.push(...toSubBlocks(lzwEncode(indices, 8)));
  }

  bytes.push(0x3b); // trailer
  return new Uint8Array(bytes);
}

/** Convenience: encode canvas frames → base64 GIF data URL. */
export function gifDataUrlFromCanvases(
  canvases: HTMLCanvasElement[],
  delayMs = 650,
  maxSize = 360,
): string {
  const frames: RgbaFrame[] = canvases.map((canvas) => {
    // downscale for a fast, cozy encode
    const scale = Math.min(1, maxSize / Math.max(canvas.width, canvas.height));
    const w = Math.max(1, Math.round(canvas.width * scale));
    const h = Math.max(1, Math.round(canvas.height * scale));
    const temp = document.createElement("canvas");
    temp.width = w;
    temp.height = h;
    const ctx = temp.getContext("2d");
    if (!ctx) throw new Error("no 2d context");
    ctx.drawImage(canvas, 0, 0, w, h);
    return { width: w, height: h, data: ctx.getImageData(0, 0, w, h).data };
  });
  const bytes = encodeGif(frames, delayMs);
  let binary = "";
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
  return `data:image/gif;base64,${btoa(binary)}`;
}
