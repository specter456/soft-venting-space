import { toast } from "sonner";
import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import { useNavigate } from "react-router";
import { useUnsavedWork } from "@/lib/useUnsavedGuard";
import { armPendingPin } from "@/components/PolaroidWall";
import { Eraser, Loader2, Paintbrush, Pen, Save, Square, ImageDown, Copy, Grid2x2 } from "lucide-react";
import { createVaultItem } from "@/lib/db";
import { importGalleryPhoto } from "@/lib/gallery";
import { saveToGallery } from "@/lib/save-to-gallery";
import { combineIntoCollage } from "@/lib/collage";
import { cn } from "@/lib/utils";

type ToolId = "pencil" | "crayon" | "brush" | "marker" | "eraser";

const TOOLS: { id: ToolId; label: string; icon: typeof Pen }[] = [
  { id: "pencil", label: "Pencil", icon: Pen },
  { id: "crayon", label: "Crayon", icon: Paintbrush },
  { id: "brush", label: "Brush", icon: Paintbrush },
  { id: "marker", label: "Marker", icon: Square },
  { id: "eraser", label: "Eraser", icon: Eraser },
];

const TOOL_STYLE: Record<ToolId, { width: number; cap: CanvasLineCap; globalAlpha: number }> = {
  pencil: { width: 3, cap: "round", globalAlpha: 1 },
  crayon: { width: 12, cap: "round", globalAlpha: 0.85 },
  brush: { width: 20, cap: "round", globalAlpha: 0.4 },
  marker: { width: 16, cap: "butt", globalAlpha: 0.85 },
  eraser: { width: 32, cap: "round", globalAlpha: 1 },
};

const COLORS = [
  "#8f7bd4",
  "#e88aa5",
  "#7fb8e8",
  "#7fc4a4",
  "#f2b26b",
  "#5a5470",
  "#ffffff",
];

const BACKGROUNDS = [
  { id: "cream", label: "cream", cls: "bg-[#fdf6ea]" },
  { id: "lavender", label: "lavender", cls: "bg-[#efe7fa]" },
  { id: "blush", label: "blush", cls: "bg-[#fbe9ec]" },
  { id: "mint", label: "mint", cls: "bg-[#e2f3e9]" },
  { id: "peach", label: "peach", cls: "bg-[#fdeeda]" },
  { id: "night", label: "night", cls: "bg-[#3f3a52]" },
];

/** Compose the scribble canvas over its pastel background → PNG data URL. */
function captureScribble(
  canvas: HTMLCanvasElement | null,
  bgClass: string,
  photo?: HTMLImageElement | null,
): string {
  if (!canvas) return "";
  const hex = bgClass.match(/#[0-9a-fA-F]{6}/)?.[0] ?? "#fdf6ea";
  const out = document.createElement("canvas");
  out.width = 700;
  out.height = 900;
  const ctx = out.getContext("2d");
  if (!ctx) return "";
  ctx.fillStyle = hex;
  ctx.fillRect(0, 0, 700, 900);
  // Faint photo background layer (same 30% look as on screen), cover-fit.
  if (photo && photo.complete && photo.naturalWidth > 0) {
    const scale = Math.max(700 / photo.naturalWidth, 900 / photo.naturalHeight);
    const w = photo.naturalWidth * scale;
    const h = photo.naturalHeight * scale;
    ctx.globalAlpha = 0.3;
    ctx.drawImage(photo, (700 - w) / 2, (900 - h) / 2, w, h);
    ctx.globalAlpha = 1;
  }
  ctx.drawImage(canvas, 0, 0, 700, 900);
  return out.toDataURL("image/png");
}

export default function ScribbleScreen() {
  const navigate = useNavigate();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawing = useRef(false);
  const lastPoint = useRef<{ x: number; y: number } | null>(null);
  const hasDrawn = useRef(false);
  // React state mirror of hasDrawn so the unsaved-guard effect re-runs
  // when the FIRST stroke lands (a ref change alone never re-renders).
  const [drawn, setDrawn] = useState(false);

  const [tool, setTool] = useState<ToolId>("pencil");
  const [color, setColor] = useState(COLORS[0]);
  const [bg, setBg] = useState(BACKGROUNDS[0]);
  // Optional gallery-photo background: faint layer to scribble over (toggle).
  const [photoBg, setPhotoBg] = useState<string | null>(null);
  const [photoOn, setPhotoOn] = useState(false);
  const photoImgRef = useRef<HTMLImageElement | null>(null);
  const [saving, setSaving] = useState(false);
  const [versions, setVersions] = useState<string[]>([]);
  // True once the canvas content has been saved (or cleared away);
  // any new stroke / background change marks it unsaved again.
  const [saved, setSaved] = useState(false);

  const bgClass = BACKGROUNDS.find((b) => b.id === bg.id)!.cls;

  /** The active photo-background layer (only when the toggle is on). */
  const activePhoto = () => (photoBg && photoOn ? photoImgRef.current : null);

  const loadPhotoLayer = (src: string) => {
    const img = new Image();
    img.src = src;
    photoImgRef.current = img;
  };

  /** Chip: first tap imports from the gallery, later taps toggle it on/off. */
  const pickPhotoBg = async () => {
    if (photoBg) {
      setPhotoOn((on) => !on);
      setSaved(false);
      return;
    }
    const item = await importGalleryPhoto({ caption: "scribble background" });
    if (!item) return; // cancelled, or the soft "didn't open" line showed
    setPhotoBg(item.art);
    setPhotoOn(true);
    setSaved(false);
    loadPhotoLayer(item.art);
  };

  const clearPhotoBg = () => {
    setPhotoBg(null);
    setPhotoOn(false);
    setSaved(false);
    photoImgRef.current = null;
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dpr = window.devicePixelRatio || 1;
    canvas.width = 700 * dpr;
    canvas.height = 900 * dpr;
    const ctx = canvas.getContext("2d");
    if (ctx) ctx.scale(dpr, dpr);
  }, []);

  const pos = (e: ReactPointerEvent) => {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    return {
      x: ((e.clientX - rect.left) / rect.width) * 700,
      y: ((e.clientY - rect.top) / rect.height) * 900,
    };
  };

  const stroke = (e: ReactPointerEvent) => {
    const ctx = canvasRef.current?.getContext("2d");
    if (!ctx) return;
    const p = pos(e);
    const style = TOOL_STYLE[tool];
    ctx.globalCompositeOperation = tool === "eraser" ? "destination-out" : "source-over";
    ctx.strokeStyle = color;
    ctx.lineWidth = style.width;
    ctx.lineCap = style.cap;
    ctx.lineJoin = "round";
    ctx.globalAlpha = style.globalAlpha;
    if (!lastPoint.current) {
      ctx.beginPath();
      ctx.moveTo(p.x, p.y);
      ctx.lineTo(p.x + 0.01, p.y + 0.01);
      ctx.stroke();
    } else {
      ctx.beginPath();
      ctx.moveTo(lastPoint.current.x, lastPoint.current.y);
      ctx.lineTo(p.x, p.y);
      ctx.stroke();
    }
    lastPoint.current = p;
  };

  const clear = () => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    ctx.clearRect(0, 0, 700, 900);
  };

  const save = async () => {
    if (saving) return false;
    setSaving(true);
    try {
      // capture the real drawing as a PNG (background + strokes) so the
      // vault shows the actual picture. Stored on this device only.
      const art = captureScribble(canvasRef.current, bg.cls, activePhoto());
      createVaultItem({
        kind: "doodle",
        art: art || "🖍️",
        bg: bg.id === "night" ? "tile-lavender" : "tile-peach",
        caption: "a scribble",
      });
      setSaved(true);
      toast("Scribble saved", {
        description: "Locked away in your private vault.",
        action: art
          ? {
              label: "pin to wall 📌",
              onClick: () => {
                armPendingPin(`vault-${Date.now()}`, art);
                navigate("/dashboard/polaroid-wall");
              },
            }
          : undefined,
      });
      return true;
    } catch (error) {
      console.error(error);
      toast("Couldn't save your scribble", { description: "Please try again in a moment." });
      return false;
    } finally {
      setSaving(false);
    }
  };

  // Unsaved = strokes on the canvas since the last save/clear.
  useUnsavedWork({ dirty: drawn && !saved, onSave: save });

  return (
    <div className="space-y-4">
      {/* ─── Canvas ───────────────────────────────────────────────── */}
      <div className="clay-card relative overflow-hidden p-2.5">
        <div className={cn("relative overflow-hidden rounded-[1.6rem]", bgClass)}>
          {/* Optional faint gallery-photo layer — scribble right over it */}
          {photoBg && photoOn && (
            <img
              src={photoBg}
              alt=""
              aria-hidden
              draggable={false}
              className="pointer-events-none absolute inset-0 h-full w-full object-cover opacity-30"
            />
          )}
          <canvas
            ref={canvasRef}
            onPointerDown={(e) => {
              e.preventDefault();
              drawing.current = true;
              hasDrawn.current = true;
              if (!drawn) setDrawn(true);
              setSaved(false);
              lastPoint.current = null;
              (e.target as HTMLElement).setPointerCapture(e.pointerId);
              stroke(e);
            }}
            onPointerMove={(e) => {
              if (!drawing.current) return;
              stroke(e);
            }}
            onPointerUp={(e) => {
              drawing.current = false;
              lastPoint.current = null;
              (e.target as HTMLElement).releasePointerCapture?.(e.pointerId);
            }}
            onPointerLeave={() => {
              drawing.current = false;
              lastPoint.current = null;
            }}
            className="relative h-[52dvh] w-full cursor-crosshair touch-none"
            aria-label="Free drawing canvas"
          />
          {/* doodle hints */}
          <span aria-hidden className="pointer-events-none absolute top-4 left-4 text-sm opacity-40">
            🫧
          </span>
          <span aria-hidden className="pointer-events-none absolute right-4 bottom-4 text-sm opacity-40">
            💗
          </span>
        </div>
      </div>

      {/* ─── Tools ────────────────────────────────────────────────── */}
      <div className="clay-card flex items-center justify-between gap-1 rounded-3xl px-3 py-2.5">
        {TOOLS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTool(t.id)}
            className={cn(
              "flex flex-col items-center gap-0.5 rounded-2xl px-2.5 py-1.5 transition-transform",
              tool === t.id ? "bg-lavender-100 text-lavender-600" : "text-ink-soft hover:text-ink-deep",
            )}
            aria-label={t.label}
          >
            <t.icon className="size-4" />
            <span className="text-[8px] font-bold">{t.label}</span>
          </button>
        ))}
        <button
          type="button"
          onClick={clear}
          className="flex flex-col items-center gap-0.5 rounded-2xl px-2.5 py-1.5 text-ink-soft transition-transform hover:text-blush-500"
          aria-label="Clear canvas"
        >
          <span aria-hidden className="text-sm">🗑️</span>
          <span className="text-[8px] font-bold">Clear</span>
        </button>
      </div>

      {/* ─── Colors ───────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center gap-2">
        {COLORS.map((c) => (
          <button
            key={c}
            type="button"
            onClick={() => setColor(c)}
            aria-label={`Color ${c}`}
            className={cn(
              "h-9 w-9 rounded-full transition-transform hover:scale-110",
              color === c && "ring-2 ring-lavender-400 ring-offset-2 ring-offset-cream",
            )}
            style={{ backgroundColor: c, boxShadow: "inset 0 -3px 6px rgba(0,0,0,0.12), 0 6px 12px -6px rgba(99,82,150,0.4)" }}
          />
        ))}
      </div>

      {/* ─── Backgrounds ──────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-[11px] font-bold text-ink-soft">Background</span>
        {BACKGROUNDS.map((b) => (
          <button
            key={b.id}
            type="button"
            onClick={() => { setBg(b); setSaved(false); }}
            className={cn(
              "h-8 w-8 rounded-full transition-transform hover:scale-110",
              b.cls,
              bg.id === b.id && "ring-2 ring-lavender-400 ring-offset-2 ring-offset-cream",
            )}
            style={{ boxShadow: "inset 0 2px 4px rgba(255,255,255,0.6), 0 4px 8px -4px rgba(99,82,150,0.35)" }}              aria-label={b.label}
            />
          ))}
          {/* Gallery-photo background: import, then toggle on/off */}
          <button
            type="button"
            onClick={() => void pickPhotoBg()}
            aria-pressed={Boolean(photoBg && photoOn)}
            className={cn(
              "flex h-8 items-center gap-1 rounded-full px-2.5 text-[11px] font-bold transition-transform hover:scale-105",
              photoBg && photoOn
                ? "bg-lavender-500 text-cream-soft ring-2 ring-lavender-300 ring-offset-1 ring-offset-cream"
                : "bg-white/70 text-ink-soft",
            )}
            style={{ boxShadow: "inset 0 2px 4px rgba(255,255,255,0.6), 0 4px 8px -4px rgba(99,82,150,0.35)" }}
          >
            📷 photo bg
          </button>
          {photoBg && photoOn && (
            <button
              type="button"
              onClick={clearPhotoBg}
              aria-label="Remove photo background"
              className="flex h-8 w-8 items-center justify-center rounded-full bg-white/70 text-[11px] font-bold text-ink-soft transition-transform hover:scale-105 hover:text-blush-500"
            >
              ✕
            </button>
          )}
      </div>

      {/* ─── Duplicate ──────────────────────────────────────── */}
      <button
        type="button"
        onClick={() => {
          const art = captureScribble(canvasRef.current, bg.cls, activePhoto());
          if (art) {
            setVersions((v) => [...v, art]);
            clear();
            setSaved(true); // the original is saved as the copy
            toast("Page duplicated", { description: `Now editing copy ${versions.length + 2}. Original saved.` });
          }
        }}
        className="clay-btn-soft flex w-full items-center justify-center gap-2 rounded-2xl px-5 py-3 text-sm font-bold text-ink-deep"
      >
        <Copy className="size-4" /> duplicate this page
      </button>

      {/* ─── Combine ─────────────────────────────────────────── */}
      {versions.length > 0 && (
        <button
          type="button"
          disabled={saving}
          onClick={async () => {
            setSaving(true);
            try {
              const currentArt = captureScribble(canvasRef.current, bg.cls, activePhoto());
              const all = [...versions, ...(currentArt ? [currentArt] : [])];
              const collage = await combineIntoCollage(all);
              if (collage) {
                createVaultItem({ kind: "photo", art: collage, bg: "tile-peach", caption: `a ${all.length}-page collage` });
                saveToGallery(collage, `venting-collage-${Date.now()}.png`);
                setSaved(true);
                toast("Collage saved", { description: `${all.length} pages combined into one framed photo.` });
              }
            } catch {
              toast("Couldn't combine pages", { description: "Please try again." });
            } finally {
              setSaving(false);
            }
          }}
          className="clay-btn-soft flex w-full items-center justify-center gap-2 rounded-2xl px-5 py-3 text-sm font-bold text-ink-deep"
        >
          <Grid2x2 className="size-4" /> combine all into one framed photo ({versions.length + 1} pages)
        </button>
      )}

      <div className="flex gap-2">
        <button
          type="button"
          onClick={save}
          disabled={saving}
          className="clay-btn flex flex-1 items-center justify-center gap-2 rounded-2xl px-4 py-3.5 text-sm font-bold text-cream-soft"
        >
          {saving ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <Save className="size-4" />
          )}
          Save to vault
        </button>
        <button
          type="button"
          onClick={() => {
            const canvas = canvasRef.current;
            if (!canvas) return;
            canvas.toBlob((blob) => {
              if (blob) saveToGallery(blob, `venting-scribble-${Date.now()}.png`);
            });
          }}
          className="clay-btn-soft flex items-center justify-center gap-1.5 rounded-2xl px-4 py-3.5 text-sm font-bold text-ink-deep"
        >
          <ImageDown className="size-4" />
          Save to gallery
        </button>
      </div>
      <p className="text-center text-[11px] font-semibold text-ink-soft">
        🖍️ draw messy, draw big, draw whatever needs out — it stays only with you
      </p>
    </div>
  );
}
