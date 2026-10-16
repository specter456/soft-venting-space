import { toast } from "sonner";
import { createVaultItem, type VaultItem } from "@/lib/db";

/**
 * Gallery import — every creative tool can pull a photo from the DEVICE
 * gallery (local file picker, accept="image/*"). Photos are read on-device
 * into a data URL and stored in the local vault exactly like any other
 * vault photo. Nothing is ever uploaded anywhere.
 */

/** Soft line shown when a picked file isn't a picture that can open. */
export const GALLERY_ERROR_LINE = "that picture didn't open — try another one";

/** Photos larger than this are quietly downscaled so the vault stays light. */
const MAX_EDGE = 1600;

/** Decode a picked file into a drawable source — null means "didn't open". */
async function decodeImage(
  file: File,
  dataUrl: string,
): Promise<ImageBitmap | HTMLImageElement | null> {
  if (typeof createImageBitmap === "function") {
    try {
      return await createImageBitmap(file);
    } catch {
      return null; // corrupt / unsupported pixels
    }
  }
  // Fallback for engines without createImageBitmap: load the data URL.
  return new Promise((resolve) => {
    const img = new Image();
    const timer = window.setTimeout(() => resolve(null), 8000);
    img.onload = () => {
      window.clearTimeout(timer);
      resolve(img);
    };
    img.onerror = () => {
      window.clearTimeout(timer);
      resolve(null);
    };
    img.src = dataUrl;
  });
}

function dimensions(src: ImageBitmap | HTMLImageElement): { w: number; h: number } {
  return src instanceof HTMLImageElement
    ? { w: src.naturalWidth, h: src.naturalHeight }
    : { w: src.width, h: src.height };
}

/** Downscale to at most MAX_EDGE on the long edge → compact JPEG data URL. */
function downscale(
  src: ImageBitmap | HTMLImageElement,
  w: number,
  h: number,
): string | null {
  const scale = MAX_EDGE / Math.max(w, h);
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(w * scale));
  canvas.height = Math.max(1, Math.round(h * scale));
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;
  ctx.fillStyle = "#fff"; // JPEG has no alpha — keep transparency white
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(src, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL("image/jpeg", 0.9);
}

/**
 * Read one device file into a stored data URL. Returns null when the file
 * isn't an image or its pixels don't decode (corrupt/unsupported) — the
 * caller shows the soft "didn't open" line. Never throws, never uploads.
 */
export async function fileToImageDataUrl(file: File): Promise<string | null> {
  try {
    if (!file || !file.type.startsWith("image/")) return null;

    const dataUrl = await new Promise<string | null>((resolve) => {
      const reader = new FileReader();
      reader.onload = () =>
        resolve(typeof reader.result === "string" ? reader.result : null);
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(file);
    });
    if (!dataUrl) return null;

    // Prove the picture actually decodes before it ever reaches the vault.
    const decoded = await decodeImage(file, dataUrl);
    if (!decoded) return null;
    const { w, h } = dimensions(decoded);
    if (!w || !h) return null;

    if (Math.max(w, h) > MAX_EDGE) {
      try {
        const smaller = downscale(decoded, w, h);
        if (smaller) return smaller;
      } catch {
        /* keep the original — storing it beats losing it */
      }
    }
    return dataUrl;
  } catch {
    return null;
  }
}

/**
 * Open the local gallery picker (accept="image/*"). Resolves null when the
 * user closes it without choosing anything.
 */
export function openGalleryPicker(): Promise<File | null> {
  return new Promise((resolve) => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*";
    input.style.position = "fixed";
    input.style.left = "-9999px";
    let settled = false;
    const done = (file: File | null) => {
      if (settled) return;
      settled = true;
      input.remove();
      resolve(file);
    };
    input.addEventListener("change", () => done(input.files?.[0] ?? null));
    input.addEventListener("cancel", () => done(null));
    document.body.appendChild(input);
    input.click();
  });
}

/**
 * Import a photo from the device gallery straight into the local vault.
 * Returns the fresh vault item (deletable like any vault item), null on
 * cancel, or null + the soft line when the file didn't open.
 *
 * Pass `file` to import an already-picked file (used by tests and anywhere
 * the picker was opened elsewhere).
 */
export async function importGalleryPhoto(
  opts: { file?: File; caption?: string } = {},
): Promise<VaultItem | null> {
  try {
    const file = opts.file ?? (await openGalleryPicker());
    if (!file) return null; // picker closed — silent
    const art = await fileToImageDataUrl(file);
    if (!art) {
      toast(GALLERY_ERROR_LINE);
      return null;
    }
    return createVaultItem({
      kind: "photo",
      art,
      bg: "tile-peach",
      caption: opts.caption ?? "from your gallery",
    });
  } catch (error) {
    console.error("[gallery] import failed", error);
    toast(GALLERY_ERROR_LINE);
    return null;
  }
}

/** Rounded-rect path (arcTo is universally supported). */
function roundRectPath(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
): void {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

/**
 * Square-crop a photo (centre) with soft feathered edges — the sticker
 * source. Returns a PNG data URL with real alpha at the border.
 */
export function squareCropPhoto(
  dataUrl: string,
  size = 512,
): Promise<string | null> {
  return new Promise((resolve) => {
    const img = new Image();
    // Safety net: never leave a caller awaiting a decode that never fires —
    // null means "use the uncropped original", which pickPhoto falls back to.
    const timer = window.setTimeout(() => resolve(null), 3000);
    img.onerror = () => {
      window.clearTimeout(timer);
      resolve(null);
    };
    img.onload = () => {
      window.clearTimeout(timer);
      try {
        const canvas = document.createElement("canvas");
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext("2d");
        if (!ctx) return resolve(null);

        const side = Math.min(img.naturalWidth, img.naturalHeight);
        const sx = (img.naturalWidth - side) / 2;
        const sy = (img.naturalHeight - side) / 2;
        ctx.drawImage(img, sx, sy, side, side, 0, 0, size, size);

        // Soft edges: feather the border with a blurred rounded-rect mask.
        const inset = 26;
        const radius = size * 0.14;
        ctx.globalCompositeOperation = "destination-in";
        ctx.fillStyle = "#ffffff";
        ctx.save();
        ctx.filter = "blur(14px)";
        roundRectPath(ctx, inset, inset, size - inset * 2, size - inset * 2, radius);
        ctx.fill();
        ctx.restore();

        resolve(canvas.toDataURL("image/png"));
      } catch {
        resolve(null);
      }
    };
    img.src = dataUrl;
  });
}
