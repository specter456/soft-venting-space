import { motion } from "framer-motion";
import { toast } from "sonner";
import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import { Loader2, Pause, Play, Plus, RotateCcw, Save, Trash2 } from "lucide-react";
import { createVaultItem } from "@/lib/db";
import { GIFT_STAMPS, PHOTO_SCENES, VIDEO_AVATARS } from "@/lib/art";
import { fillTileGradient, loadImageToCanvas } from "@/lib/canvas-art";
import { gifDataUrlFromCanvases } from "@/lib/gif";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

interface Stamp {
  id: string;
  emoji: string;
  x: number; // %
  y: number; // %
  size: number; // px
}

/** A frame is its own separate picture — a full composite PNG, like a flipbook page. */
interface Frame {
  img: string;
}

const SIZE = 700;

export default function GifStudio() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawing = useRef(false);
  const lastPoint = useRef<{ x: number; y: number } | null>(null);
  const undoStack = useRef<string[]>([]);
  const [canUndo, setCanUndo] = useState(false);

  const [bg, setBg] = useState<(typeof PHOTO_SCENES)[number] | "avatar">(PHOTO_SCENES[0]);
  const [avatar] = useState(() => VIDEO_AVATARS[Math.floor(Math.random() * VIDEO_AVATARS.length)]);
  const [stamps, setStamps] = useState<Stamp[]>([]);
  const [text, setText] = useState("");
  const stampIdRef = useRef(0);
  const [frames, setFrames] = useState<Frame[]>([]);
  const [playing, setPlaying] = useState(false);
  const [playIdx, setPlayIdx] = useState(0);
  const [saving, setSaving] = useState(false);

  // init doodle canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dpr = window.devicePixelRatio || 1;
    canvas.width = SIZE * dpr;
    canvas.height = SIZE * dpr;
    const ctx = canvas.getContext("2d");
    if (ctx) ctx.scale(dpr, dpr);
  }, []);

  // gif playback
  useEffect(() => {
    if (!playing || frames.length === 0) return;
    const t = window.setInterval(() => {
      setPlayIdx((i) => (i + 1) % frames.length);
    }, 650);
    return () => window.clearInterval(t);
  }, [playing, frames.length]);

  /* ─── Drawing ───────────────────────────────────────────────────── */

  const pos = (e: ReactPointerEvent) => {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    return {
      x: ((e.clientX - rect.left) / rect.width) * SIZE,
      y: ((e.clientY - rect.top) / rect.height) * SIZE,
    };
  };

  const stroke = (e: ReactPointerEvent) => {
    const ctx = canvasRef.current?.getContext("2d");
    if (!ctx) return;
    const p = pos(e);
    ctx.strokeStyle = "#5a5470";
    ctx.lineWidth = 6;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
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

  /** One undo step per completed stroke. */
  const pushUndo = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    undoStack.current.push(canvas.toDataURL());
    if (undoStack.current.length > 30) undoStack.current.shift();
    setCanUndo(undoStack.current.length > 0);
  };

  const undoLast = () => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    const prev = undoStack.current.pop();
    setCanUndo(undoStack.current.length > 0);
    if (!canvas || !ctx || !prev) return;
    const img = new Image();
    img.onload = () => {
      ctx.clearRect(0, 0, SIZE, SIZE);
      ctx.drawImage(img, 0, 0, SIZE, SIZE);
    };
    img.src = prev;
  };

  const clearDoodles = (pushHistory = true) => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    if (pushHistory) pushUndo();
    ctx.clearRect(0, 0, SIZE, SIZE);
    if (!pushHistory) setCanUndo(false);
  };

  const addStamp = (emoji: string) => {
    stampIdRef.current += 1;
    const id = `stamp-${stampIdRef.current}`;
    setStamps((prev) => [
      ...prev,
      {
        id,
        emoji,
        x: 18 + Math.random() * 64,
        y: 18 + Math.random() * 64,
        size: 30 + Math.random() * 18,
      },
    ]);
  };

  /* ─── Frames (flipbook) ─────────────────────────────────────────── */

  /**
   * Composite the current canvas state (base + doodles + stamps + text) into
   * one full picture — this is what a frame really is.
   */
  const composeFrame = (): string => {
    const canvas = document.createElement("canvas");
    canvas.width = SIZE;
    canvas.height = SIZE;
    const ctx = canvas.getContext("2d");
    if (!ctx) return "";

    // base
    if (bg === "avatar") {
      const grad = ctx.createLinearGradient(0, 0, 0, SIZE);
      grad.addColorStop(0, "#dcf1e5");
      grad.addColorStop(0.5, "#fdf6ec");
      grad.addColorStop(1, "#efe7fa");
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, SIZE, SIZE);
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.font = `${Math.round(SIZE * 0.4)}px serif`;
      ctx.fillText(avatar, SIZE / 2, SIZE / 2);
    } else {
      fillTileGradient(ctx, bg.bg, SIZE, SIZE);
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.font = `${Math.round(SIZE * 0.34)}px serif`;
      ctx.fillText(bg.emoji, SIZE / 2, SIZE / 2);
    }

    // doodles
    const doodle = canvasRef.current;
    if (doodle) ctx.drawImage(doodle, 0, 0, SIZE, SIZE);

    // stamps — fixed exactly where placed, never drifting
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    for (const s of stamps) {
      ctx.font = `${s.size}px serif`;
      ctx.fillText(s.emoji, (s.x / 100) * SIZE, (s.y / 100) * SIZE);
    }

    // text
    if (text.trim()) {
      ctx.font = `bold ${Math.round(SIZE * 0.045)}px sans-serif`;
      ctx.fillStyle = "rgba(90,84,112,0.95)";
      ctx.fillText(text.trim(), SIZE / 2, SIZE * 0.06);
    }

    return canvas.toDataURL("image/png");
  };

  const addFrame = () => {
    const img = composeFrame();
    if (!img) return;
    setFrames((prev) => [...prev, { img }]);
    // next frame starts clean — same base, fresh doodle layer
    setStamps([]);
    setText("");
    clearDoodles(false);
    undoStack.current = [];
    setCanUndo(false);
    setPlaying(false);
    setPlayIdx(0);
    toast("Frame added", { description: "Your canvas is clear for the next flipbook page." });
  };

  const removeFrame = (i: number) => {
    setFrames((prev) => prev.filter((_, idx) => idx !== i));
    if (playIdx >= frames.length - 1) setPlayIdx(Math.max(0, frames.length - 2));
  };

  const previewFrame = (i: number) => {
    setPlaying(false);
    setPlayIdx(i);
  };

  /** Change base → start clean (old scribbles never carry over). */
  const changeBase = (next: (typeof PHOTO_SCENES)[number] | "avatar") => {
    if (next === bg) return;
    setBg(next);
    setStamps([]);
    setText("");
    clearDoodles(false);
    undoStack.current = [];
    setCanUndo(false);
  };

  /* ─── Save a real animated GIF ──────────────────────────────────── */

  const save = async () => {
    if (saving) return;
    setSaving(true);
    try {
      let gifUrl = "";
      if (frames.length > 0) {
        // load every flipbook page and encode a true looping GIF
        const canvases = await Promise.all(
          frames.map((f) => loadImageToCanvas(f.img, SIZE, SIZE)),
        );
        gifUrl = gifDataUrlFromCanvases(canvases, 650);
      } else {
        // no frames yet — save the current canvas as a single doodle
        gifUrl = composeFrame();
      }
      if (!gifUrl) throw new Error("could not render gif");
      createVaultItem({
        kind: "gif",
        art: gifUrl,
        bg: "tile-blush",
        caption: frames.length > 0 ? `a ${frames.length}-frame gif` : "a doodled gif",
      });
      toast("GIF saved", { description: "Locked into your vault — frames play in order." });
    } catch (error) {
      console.error(error);
      toast("Couldn't save your GIF", { description: "Please try again in a moment." });
    } finally {
      setSaving(false);
    }
  };

  const renderFrame = (frame: Frame, keyPrefix: string) => (
    <div
      key={keyPrefix}
      className="relative h-full w-full overflow-hidden rounded-[1.6rem] bg-cream"
    >
      <img
        src={frame.img}
        alt=""
        className="pointer-events-none absolute inset-0 h-full w-full object-cover"
        draggable={false}
      />
    </div>
  );

  return (
    <div className="space-y-5">
      {/* ─── Base picker ──────────────────────────────────────────── */}
      <section>
        <p className="text-xs font-bold text-ink-soft uppercase tracking-wide">
          Start from a soft base
        </p>
        <div className="mt-2 flex gap-2 overflow-x-auto pb-1">
          <button
            type="button"
            onClick={() => changeBase("avatar")}
            className={cn(
              "flex h-16 w-14 shrink-0 flex-col items-center justify-center rounded-2xl transition-transform",
              bg === "avatar" ? "ring-2 ring-lavender-400 ring-offset-2 ring-offset-cream" : "",
            )}
            style={{ background: "linear-gradient(180deg,#dcf1e5,#c2e5d0)" }}
          >
            <span className="text-2xl">{avatar}</span>
            <span className="text-[8px] font-bold text-ink-deep/70">video vent</span>
          </button>
          {PHOTO_SCENES.map((scene) => (
            <button
              key={scene.emoji}
              type="button"
              onClick={() => changeBase(scene)}
              className={cn(
                "flex h-16 w-14 shrink-0 flex-col items-center justify-center rounded-2xl transition-transform",
                scene.bg,
                bg !== "avatar" && bg.emoji === scene.emoji &&
                  "ring-2 ring-lavender-400 ring-offset-2 ring-offset-cream",
              )}
            >
              <span className="text-2xl drop-shadow-sm">{scene.emoji}</span>
              <span className="max-w-full truncate px-1 text-[8px] font-bold text-ink-deep/70">
                {scene.label}
              </span>
            </button>
          ))}
        </div>
        <p className="mt-1.5 text-[10px] font-semibold text-ink-soft">
          changing the base starts a fresh page — old scribbles are cleared
        </p>
      </section>

      {/* ─── Editor canvas ────────────────────────────────────────── */}
      <div className="clay-card relative overflow-hidden rounded-[2rem] p-2.5">
        <div className="relative aspect-square overflow-hidden rounded-[1.6rem]">
          {bg === "avatar" ? (
            <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-b from-mint-100 via-cream-soft to-lavender-50">
              <span className="animate-floaty text-7xl drop-shadow-md">{avatar}</span>
            </div>
          ) : (
            <div className={cn("absolute inset-0 flex items-center justify-center", bg.bg)}>
              <span className="text-6xl drop-shadow-sm">{bg.emoji}</span>
            </div>
          )}
          <canvas
            ref={canvasRef}
            onPointerDown={(e) => {
              e.preventDefault();
              drawing.current = true;
              lastPoint.current = null;
              (e.target as HTMLElement).setPointerCapture(e.pointerId);
              stroke(e);
            }}
            onPointerMove={(e) => drawing.current && stroke(e)}
            onPointerUp={(e) => {
              drawing.current = false;
              lastPoint.current = null;
              pushUndo();
              (e.target as HTMLElement).releasePointerCapture?.(e.pointerId);
            }}
            onPointerLeave={() => {
              drawing.current = false;
              lastPoint.current = null;
            }}
            className="absolute inset-0 h-full w-full cursor-crosshair touch-none"
            aria-label="Doodle canvas"
          />
          {stamps.map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => setStamps((prev) => prev.filter((x) => x.id !== s.id))}
              className="absolute -translate-x-1/2 -translate-y-1/2 drop-shadow-sm transition-transform hover:scale-110"
              style={{ left: `${s.x}%`, top: `${s.y}%`, fontSize: s.size }}
              aria-label="Remove stamp"
            >
              {s.emoji}
            </button>
          ))}
          {text && (
            <span className="absolute top-3 left-1/2 w-full -translate-x-1/2 px-4 text-center text-lg font-bold text-ink-deep drop-shadow-sm">
              {text}
            </span>
          )}
        </div>
      </div>

      {/* ─── Clear & undo ─────────────────────────────────────────── */}
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => {
            setStamps([]);
            setText("");
            clearDoodles();
          }}
          className="clay-btn-soft flex flex-1 items-center justify-center gap-2 rounded-2xl px-4 py-3 text-sm font-bold text-ink-deep"
        >
          🗑️ Clear canvas
        </button>
        <button
          type="button"
          onClick={undoLast}
          disabled={!canUndo}
          className="clay-btn-soft flex flex-1 items-center justify-center gap-2 rounded-2xl px-4 py-3 text-sm font-bold text-ink-deep disabled:opacity-40"
        >
          <RotateCcw className="size-4" /> Undo last stroke
        </button>
      </div>

      {/* ─── Stamps & text ────────────────────────────────────────── */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        {GIFT_STAMPS.map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => addStamp(s)}
            className="clay-chip flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-xl transition-transform hover:scale-110 active:scale-95"
          >
            {s}
          </button>
        ))}
      </div>

      <Input
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Add a word or two… (optional)"
        className="rounded-2xl border-lavender-200/70 bg-cream-soft text-sm text-ink-deep placeholder:text-ink-soft/70 focus-visible:ring-lavender-300"
      />

      <button
        type="button"
        onClick={addFrame}
        className="clay-btn-soft flex w-full items-center justify-center gap-2 rounded-2xl px-5 py-3.5 text-sm font-bold text-ink-deep"
      >
        <Plus className="size-4" /> Add this as a frame
      </button>

      {/* ─── Frames strip + GIF preview ───────────────────────────── */}
      {frames.length > 0 && (
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold tracking-tight text-ink-deep">
              GIF preview · {frames.length} frame{frames.length > 1 ? "s" : ""}
            </h2>
            <button
              type="button"
              onClick={() => setPlaying((p) => !p)}
              className="clay-btn flex items-center gap-1.5 rounded-full px-4 py-2 text-xs font-bold text-cream-soft"
            >
              {playing ? <Pause className="size-3.5" /> : <Play className="size-3.5" />}
              {playing ? "Pause" : "Play"}
            </button>
          </div>

          <div className="clay-card rounded-[2rem] p-2.5">
            <div className="relative aspect-square overflow-hidden rounded-[1.6rem]">
              <motion.div
                key={playIdx}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.18 }}
                className="h-full w-full"
              >
                {renderFrame(frames[playIdx], `preview-${playIdx}`)}
              </motion.div>
              <span className="absolute top-2 right-2 rounded-full bg-ink-deep/60 px-2 py-0.5 text-[9px] font-bold text-cream-soft">
                frame {playIdx + 1}/{frames.length}
              </span>
            </div>
          </div>

          <div className="flex gap-2 overflow-x-auto pb-1">
            {frames.map((frame, i) => (
              <div key={i} className="relative shrink-0">
                <button
                  type="button"
                  onClick={() => previewFrame(i)}
                  className={cn(
                    "block h-16 w-16 overflow-hidden rounded-2xl transition-transform",
                    playIdx === i && !playing && "ring-2 ring-lavender-400 ring-offset-2 ring-offset-cream",
                  )}
                  aria-label={`Preview frame ${i + 1}`}
                >
                  {renderFrame(frame, `thumb-${i}`)}
                </button>
                <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 rounded-full bg-white/90 px-1.5 py-0.5 text-[8px] font-bold text-ink-soft">
                  {i + 1}
                </span>
                <button
                  type="button"
                  onClick={() => removeFrame(i)}
                  className="absolute -top-1.5 -right-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-blush-200 text-blush-500 transition-colors hover:bg-blush-300"
                  aria-label={`Delete frame ${i + 1}`}
                >
                  <Trash2 className="size-2.5" />
                </button>
              </div>
            ))}
          </div>
        </section>
      )}

      <button
        type="button"
        onClick={save}
        disabled={saving}
        className="clay-btn flex w-full items-center justify-center gap-2 rounded-2xl px-5 py-4 text-sm font-bold text-cream-soft"
      >
        {saving ? (
          <>
            <Loader2 className="size-4 animate-spin" /> Tucking it away…
          </>
        ) : (
          <>
            <Save className="size-4" /> Save GIF to vault
          </>
        )}
      </button>
      <p className="text-center text-[11px] font-semibold text-ink-soft">
        🎞️ mix photos, doodle on them, and make little looping feelings
      </p>
    </div>
  );
}
