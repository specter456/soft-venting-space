/**
 * Canvas helpers that turn Venting's cute art into real PNG images, so the
 * vault stores actual pictures instead of raw emoji placeholders. Everything
 * happens on-device — nothing is ever uploaded.
 */

/** Soft pastel gradient stops matching the Tailwind `tile-*` classes. */
export const TILE_GRADIENTS: Record<string, [string, string]> = {
  "tile-lavender": ["#eae0f8", "#dac9f1"],
  "tile-blush": ["#f8e0e4", "#f1c7cf"],
  "tile-mist": ["#dfeef7", "#c5e0f0"],
  "tile-mint": ["#dcf1e5", "#bce3cf"],
  "tile-peach": ["#fbe6cd", "#f6d3a9"],
};

export function isImageArt(art: string | undefined): boolean {
  return Boolean(art && art.startsWith("data:image"));
}

/** A soft pastel gradient fill (180deg, matching the tile classes). */
export function fillTileGradient(
  ctx: CanvasRenderingContext2D,
  tile: string,
  width: number,
  height: number,
): void {
  const [from, to] = TILE_GRADIENTS[tile] ?? TILE_GRADIENTS["tile-lavender"];
  const grad = ctx.createLinearGradient(0, 0, 0, height);
  grad.addColorStop(0, from);
  grad.addColorStop(1, to);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, width, height);
}

/** Render a "photo scene" (pastel tile + big emoji) as a PNG data URL. */
export function renderPhotoScene(
  emoji: string,
  tile: string,
  size = 560,
): string {
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  if (!ctx) return "";
  fillTileGradient(ctx, tile, size, size);
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.font = `${Math.round(size * 0.42)}px serif`;
  ctx.fillText(emoji, size / 2, size / 2 + size * 0.02);
  return canvas.toDataURL("image/png");
}

/** Render the sticker face exactly like the live preview, as a PNG. */
export function renderStickerArt(
  opts: {
    color: string;
    eyes: string;
    mouth: string;
    blush: boolean;
    tear: boolean;
    accessory: string | null;
  },
  size = 480,
): string {
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  if (!ctx) return "";

  // soft drop shadow behind the round face
  ctx.save();
  ctx.shadowColor = "rgba(99, 82, 150, 0.35)";
  ctx.shadowBlur = size * 0.06;
  ctx.shadowOffsetY = size * 0.03;
  ctx.fillStyle = opts.color;
  ctx.beginPath();
  ctx.arc(size / 2, size / 2, size / 2, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  // top inner light for the plush clay feel
  const inner = ctx.createLinearGradient(0, 0, 0, size);
  inner.addColorStop(0, "rgba(255,255,255,0.55)");
  inner.addColorStop(0.35, "rgba(255,255,255,0)");
  inner.addColorStop(1, "rgba(99,82,150,0.12)");
  ctx.fillStyle = inner;
  ctx.beginPath();
  ctx.arc(size / 2, size / 2, size / 2, 0, Math.PI * 2);
  ctx.fill();

  ctx.textAlign = "center";
  ctx.textBaseline = "middle";

  // blush
  if (opts.blush) {
    ctx.fillStyle = "rgba(242,168,184,0.75)";
    for (const bx of [0.16, 0.84]) {
      ctx.beginPath();
      ctx.ellipse(
        bx * size,
        0.42 * size,
        0.09 * size,
        0.055 * size,
        0,
        0,
        Math.PI * 2,
      );
      ctx.fill();
    }
  }

  // eyes
  const [eyeL, eyeR] = opts.eyes.split(" ").filter(Boolean);
  ctx.font = `bold ${Math.round(size * 0.16)}px serif`;
  ctx.fillStyle = "#4a4560";
  ctx.fillText(eyeL || "•", 0.24 * size, 0.34 * size);
  ctx.fillText(eyeR || "•", 0.76 * size, 0.34 * size);

  // mouth
  ctx.font = `bold ${Math.round(size * 0.2)}px serif`;
  ctx.fillText(opts.mouth, size / 2, 0.58 * size);

  // tear
  if (opts.tear) {
    ctx.font = `${Math.round(size * 0.16)}px serif`;
    ctx.fillText("💧", 0.2 * size, 0.76 * size);
  }

  // accessory
  if (opts.accessory) {
    ctx.font = `${Math.round(size * 0.24)}px serif`;
    ctx.fillText(opts.accessory, 0.84 * size, 0.12 * size);
  }

  return canvas.toDataURL("image/png");
}

/** Draw a base64 PNG into a fresh canvas of the given size. */
export function loadImageToCanvas(
  dataUrl: string,
  width: number,
  height: number,
): Promise<HTMLCanvasElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        reject(new Error("no 2d context"));
        return;
      }
      ctx.drawImage(img, 0, 0, width, height);
      resolve(canvas);
    };
    img.onerror = () => reject(new Error("image load failed"));
    img.src = dataUrl;
  });
}
