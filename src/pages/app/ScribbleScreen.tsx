import { toast } from "sonner";
import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import { Eraser, Loader2, Paintbrush, Pen, Save, Square, ImageDown } from "lucide-react";
import { createVaultItem } from "@/lib/db";
import { saveToGallery } from "@/lib/save-to-gallery";
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
  ctx.drawImage(canvas, 0, 0, 700, 900);
  return out.toDataURL("image/png");
}

export default function ScribbleScreen() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawing = useRef(false);
  const lastPoint = useRef<{ x: number; y: number } | null>(null);

  const [tool, setTool] = useState<ToolId>("pencil");
  const [color, setColor] = useState(COLORS[0]);
  const [bg, setBg] = useState(BACKGROUNDS[0]);
  const [saving, setSaving] = useState(false);

  const bgClass = BACKGROUNDS.find((b) => b.id === bg.id)!.cls;

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
    if (saving) return;
    setSaving(true);
    try {
      // capture the real drawing as a PNG (background + strokes) so the
      // vault shows the actual picture. Stored on this device only.
      const art = captureScribble(canvasRef.current, bg.cls);
      createVaultItem({
        kind: "doodle",
        art: art || "🖍️",
        bg: bg.id === "night" ? "tile-lavender" : "tile-peach",
        caption: "a scribble",
      });
      toast("Scribble saved", {
        description: "Locked away in your private vault.",
      });
    } catch (error) {
      console.error(error);
      toast("Couldn't save your scribble", { description: "Please try again in a moment." });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* ─── Canvas ───────────────────────────────────────────────── */}
      <div className="clay-card relative overflow-hidden rounded-[2rem] p-2.5">
        <div className={cn("relative overflow-hidden rounded-[1.6rem]", bgClass)}>
          <canvas
            ref={canvasRef}
            onPointerDown={(e) => {
              e.preventDefault();
              drawing.current = true;
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
            className="h-[52dvh] w-full cursor-crosshair touch-none"
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
              "flex flex-col items-center gap-0.5 rounded-2xl px-2.5 py-1.5 transition-all",
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
          className="flex flex-col items-center gap-0.5 rounded-2xl px-2.5 py-1.5 text-ink-soft transition-all hover:text-blush-500"
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
            onClick={() => setBg(b)}
            className={cn(
              "h-8 w-8 rounded-full transition-transform hover:scale-110",
              b.cls,
              bg.id === b.id && "ring-2 ring-lavender-400 ring-offset-2 ring-offset-cream",
            )}
            style={{ boxShadow: "inset 0 2px 4px rgba(255,255,255,0.6), 0 4px 8px -4px rgba(99,82,150,0.35)" }}
            aria-label={b.label}
          />
        ))}
      </div>

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
