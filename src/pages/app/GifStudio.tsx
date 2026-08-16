import { AnimatePresence, motion } from "framer-motion";
import { toast } from "sonner";
import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import { Loader2, Pause, Play, Plus, Save, Trash2 } from "lucide-react";
import { createVaultItem } from "@/lib/db";
import { GIFT_STAMPS, PHOTO_SCENES, VIDEO_AVATARS } from "@/lib/art";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

interface Stamp {
  id: string;
  emoji: string;
  x: number; // %
  y: number; // %
  size: number; // px
}

interface Frame {
  bg: (typeof PHOTO_SCENES)[number] | "avatar";
  img?: string;
  stamps: Stamp[];
  text?: string;
}

export default function GifStudio() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawing = useRef(false);
  const lastPoint = useRef<{ x: number; y: number } | null>(null);

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
    canvas.width = 700 * dpr;
    canvas.height = 700 * dpr;
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

  const pos = (e: ReactPointerEvent) => {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    return {
      x: ((e.clientX - rect.left) / rect.width) * 700,
      y: ((e.clientY - rect.top) / rect.height) * 700,
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

  const clearDoodles = () => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    ctx.clearRect(0, 0, 700, 700);
  };

  const addFrame = () => {
    const canvas = canvasRef.current;
    const img = canvas?.toDataURL("image/png");
    setFrames((prev) => [...prev, { bg, img, stamps, text: text.trim() || undefined }]);
    setStamps([]);
    setText("");
    clearDoodles();
    setPlayIdx(0);
    toast("Frame added", { description: `${frames.length + 1} frame${frames.length === 0 ? "" : "s"} so far.` });
  };

  const removeFrame = (i: number) => {
    setFrames((prev) => prev.filter((_, idx) => idx !== i));
    if (playIdx >= frames.length - 1) setPlayIdx(0);
  };

  const save = async () => {
    if (saving) return;
    setSaving(true);
    try {
      // stored on this device only
      createVaultItem({
        kind: "gif",
        art: "🎞️",
        bg: "tile-blush",
        caption: frames.length > 0 ? `a ${frames.length}-frame gif` : "a doodled gif",
      });
      toast("GIF saved", { description: "Locked into your vault, frames and all." });
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
      className={cn(
        "relative h-full w-full overflow-hidden rounded-[1.6rem]",
        frame.bg === "avatar"
          ? "bg-gradient-to-b from-mint-100 via-cream-soft to-lavender-50"
          : frame.bg.bg,
      )}
    >
      <span
        className="absolute inset-0 flex items-center justify-center text-6xl drop-shadow-sm sm:text-7xl"
        aria-hidden
      >
        {frame.bg === "avatar" ? avatar : frame.bg.emoji}
      </span>
      {frame.img && (
        <img src={frame.img} alt="" className="pointer-events-none absolute inset-0 h-full w-full object-cover opacity-90" />
      )}
      {frame.stamps.map((s) => (
        <span
          key={s.id}
          aria-hidden
          className="absolute drop-shadow-sm"
          style={{ left: `${s.x}%`, top: `${s.y}%`, fontSize: s.size }}
        >
          {s.emoji}
        </span>
      ))}
      {frame.text && (
        <span className="absolute top-3 left-1/2 w-full -translate-x-1/2 px-4 text-center text-lg font-bold text-ink-deep drop-shadow-sm">
          {frame.text}
        </span>
      )}
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
            onClick={() => setBg("avatar")}
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
              onClick={() => setBg(scene)}
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

      {/* ─── Frames + GIF preview ─────────────────────────────────── */}
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
              <AnimatePresence mode="wait">
                <motion.div
                  key={playIdx}
                  initial={{ opacity: 0, scale: 0.96 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 1.03 }}
                  transition={{ duration: 0.3 }}
                  className="h-full w-full"
                >
                  {renderFrame(frames[playIdx], `preview-${playIdx}`)}
                </motion.div>
              </AnimatePresence>
              <span className="absolute top-2 right-2 rounded-full bg-ink-deep/60 px-2 py-0.5 text-[9px] font-bold text-cream-soft">
                frame {playIdx + 1}/{frames.length}
              </span>
            </div>
          </div>

          <div className="flex gap-2 overflow-x-auto pb-1">
            {frames.map((frame, i) => (
              <div key={i} className="relative shrink-0">
                <div className="h-16 w-16 overflow-hidden rounded-2xl">{renderFrame(frame, `thumb-${i}`)}</div>
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
