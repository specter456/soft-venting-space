/**
 * Combine multiple image data URLs into a grid collage with a soft rounded frame.
 * Returns a PNG data URL.
 */
export async function combineIntoCollage(
  imageUrls: string[],
  opts?: { cols?: number; cellSize?: number; padding?: number; radius?: number; bgColor?: string; borderColor?: string },
): Promise<string> {
  const cols = opts?.cols ?? (imageUrls.length <= 2 ? imageUrls.length : imageUrls.length <= 4 ? 2 : 3);
  const cellSize = opts?.cellSize ?? 320;
  const padding = opts?.padding ?? 16;
  const radius = opts?.radius ?? 24;
  const bgColor = opts?.bgColor ?? "#f5eef8";
  const borderColor = opts?.borderColor ?? "#d4c5ea";

  const rows = Math.ceil(imageUrls.length / cols);
  const innerW = cols * cellSize + (cols - 1) * padding;
  const innerH = rows * cellSize + (rows - 1) * padding;
  const framePad = 28;
  const totalW = innerW + framePad * 2;
  const totalH = innerH + framePad * 2;

  const canvas = document.createElement("canvas");
  canvas.width = totalW;
  canvas.height = totalH;
  const ctx = canvas.getContext("2d");
  if (!ctx) return "";

  // Frame background
  ctx.fillStyle = bgColor;
  roundRect(ctx, 0, 0, totalW, totalH, radius + 8);
  ctx.fill();

  // Frame border
  ctx.strokeStyle = borderColor;
  ctx.lineWidth = 4;
  roundRect(ctx, 2, 2, totalW - 4, totalH - 4, radius + 6);
  ctx.stroke();

  // Load and draw each image
  for (let i = 0; i < imageUrls.length; i++) {
    const col = i % cols;
    const row = Math.floor(i / cols);
    const x = framePad + col * (cellSize + padding);
    const y = framePad + row * (cellSize + padding);

    try {
      const img = await loadImage(imageUrls[i]);
      ctx.save();
      roundRect(ctx, x, y, cellSize, cellSize, radius);
      ctx.clip();
      // Cover-fill the cell
      const scale = Math.max(cellSize / img.width, cellSize / img.height);
      const dw = img.width * scale;
      const dh = img.height * scale;
      ctx.drawImage(img, x + (cellSize - dw) / 2, y + (cellSize - dh) / 2, dw, dh);
      ctx.restore();
    } catch {
      // If image fails to load, draw a placeholder
      ctx.fillStyle = "#e8dff5";
      roundRect(ctx, x, y, cellSize, cellSize, radius);
      ctx.fill();
    }
  }

  return canvas.toDataURL("image/png");
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}
