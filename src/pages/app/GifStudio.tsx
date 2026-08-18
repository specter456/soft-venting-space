import { motion } from "framer-motion";
import { toast } from "sonner";
import { useEffect, useRef, useState, useCallback, type PointerEvent as ReactPointerEvent } from "react";
import { Loader2, Pause, Play, Plus, RotateCcw, Save, Trash2, Download, Share2, Minus, X, Copy, Grid2x2 } from "lucide-react";
import { createVaultItem } from "@/lib/db";
import { combineIntoCollage } from "@/lib/collage";
import { saveToGallery } from "@/lib/save-to-gallery";
import { GIFT_STAMPS, PHOTO_SCENES, VIDEO_AVATARS } from "@/lib/art";
import { fillTileGradient, loadImageToCanvas } from "@/lib/canvas-art";
import { gifDataUrlFromCanvases } from "@/lib/gif";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

/* ─── Types ──────────────────────────────────────────────────────────── */

interface Stamp {
  id: string;
  emoji: string;
  x: number; // px inside canvas coordinate space
  y: number;
  size: number;
}

interface Frame {
  img: string;
}

type BrushStyle = "pencil" | "crayon" | "marker";
type InkColor = string;

const INK_COLORS: { name: string; value: InkColor }[] = [
  { name: "pink", value: "#e88fa5" },
  { name: "blue", value: "#7caed4" },
  { name: "mint", value: "#6bc9a0" },
  { name: "yellow", value: "#e8d56a" },
  { name: "purple", value: "#a584c8" },
  { name: "dark", value: "#5a5470" },
];

const BRUSH_STYLES: { id: BrushStyle; label: string; emoji: string }[] = [
  { id: "pencil", label: "Pencil", emoji: "✏️" },
  { id: "crayon", label: "Crayon", emoji: "🖍️" },
  { id: "marker", label: "Marker", emoji: "🖊️" },
];

const BRUSH_SIZES = [
  { label: "Thin", value: 3 },
  { label: "Medium", value: 7 },
  { label: "Thick", value: 14 },
];

const SIZE = 700;

/* ─── Main Component ─────────────────────────────────────────────────── */

export default function GifStudio() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawing = useRef(false);
  const lastPoint = useRef<{ x: number; y: number } | null>(null);
  const undoStack = useRef<string[]>([]);
  const [canUndo, setCanUndo] = useState(false);

  const [bg, setBg] = useState<(typeof PHOTO_SCENES)[number] | "avatar">(
    PHOTO_SCENES[0],
  );
  const [avatar] = useState(
    () => VIDEO_AVATARS[Math.floor(Math.random() * VIDEO_AVATARS.length)],
  );
  const [stamps, setStamps] = useState<Stamp[]>([]);
  const [selectedStamp, setSelectedStamp] = useState<string | null>(null);
  const stampIdRef = useRef(0);
  const [text, setText] = useState("");
  const [frames, setFrames] = useState<Frame[]>([]);
  const [playing, setPlaying] = useState(false);
  const [playIdx, setPlayIdx] = useState(0);
  const [saving, setSaving] = useState(false);
  const [editingFrameIdx, setEditingFrameIdx] = useState<number | null>(null);

  // Drawing settings
  const [inkColor, setInkColor] = useState<InkColor>(INK_COLORS[5].value);
  const [brushStyle, setBrushStyle] = useState<BrushStyle>("pencil");
  const [brushSize, setBrushSize] = useState(7);
  const [eraserMode, setEraserMode] = useState(false);

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

  /* ─── Smooth drawing with brush styles ─────────────────────────────── */

  const canvasPos = useCallback((e: ReactPointerEvent) => {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    return {
      x: ((e.clientX - rect.left) / rect.width) * SIZE,
      y: ((e.clientY - rect.top) / rect.height) * SIZE,
    };
  }, []);

  const applyBrush = useCallback(
    (
      ctx: CanvasRenderingContext2D,
      x1: number,
      y1: number,
      x2: number,
      y2: number,
      isEraser: boolean,
    ) => {
      if (isEraser) {
        ctx.globalCompositeOperation = "destination-out";
        ctx.strokeStyle = "rgba(0,0,0,1)";
        ctx.lineWidth = brushSize * 2.5;
        ctx.lineCap = "round";
        ctx.lineJoin = "round";
        ctx.globalAlpha = 1;
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.stroke();
        ctx.globalCompositeOperation = "source-over";
        return;
      }

      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = "source-over";
      ctx.strokeStyle = inkColor;

      switch (brushStyle) {
        case "pencil": {
          // thin, crisp, slightly transparent — like a real pencil
          ctx.lineWidth = brushSize * 0.7;
          ctx.lineCap = "round";
          ctx.lineJoin = "round";
          ctx.globalAlpha = 0.85;
          ctx.beginPath();
          ctx.moveTo(x1, y1);
          ctx.lineTo(x2, y2);
          ctx.stroke();
          break;
        }
        case "crayon": {
          // textured, waxy feel — multiple offset strokes
          ctx.lineWidth = brushSize;
          ctx.lineCap = "round";
          ctx.lineJoin = "round";
          ctx.globalAlpha = 0.45;
          for (let i = 0; i < 3; i++) {
            const off = (i - 1) * brushSize * 0.3;
            ctx.beginPath();
            ctx.moveTo(x1 + off, y1 + off * 0.5);
            ctx.lineTo(x2 + off, y2 + off * 0.5);
            ctx.stroke();
          }
          ctx.globalAlpha = 1;
          break;
        }
        case "marker": {
          // thick, smooth, slightly transparent — like a felt pen
          ctx.lineWidth = brushSize * 1.4;
          ctx.lineCap = "round";
          ctx.lineJoin = "round";
          ctx.globalAlpha = 0.7;
          ctx.beginPath();
          ctx.moveTo(x1, y1);
          ctx.lineTo(x2, y2);
          ctx.stroke();
          // second pass for saturation
          ctx.globalAlpha = 0.35;
          ctx.lineWidth = brushSize * 0.8;
          ctx.beginPath();
          ctx.moveTo(x1, y1);
          ctx.lineTo(x2, y2);
          ctx.stroke();
          break;
        }
      }
      ctx.globalAlpha = 1;
    },
    [inkColor, brushStyle, brushSize],
  );

  const stroke = useCallback(
    (e: ReactPointerEvent) => {
      const ctx = canvasRef.current?.getContext("2d");
      if (!ctx) return;
      const p = canvasPos(e);
      if (!lastPoint.current) {
        ctx.beginPath();
        ctx.arc(p.x, p.y, (eraserMode ? brushSize * 2.5 : brushSize * 0.35) / 2, 0, Math.PI * 2);
        if (eraserMode) {
          ctx.globalCompositeOperation = "destination-out";
          ctx.fillStyle = "rgba(0,0,0,1)";
          ctx.fill();
          ctx.globalCompositeOperation = "source-over";
        } else {
          ctx.fillStyle = inkColor;
          ctx.fill();
        }
      } else {
        // smooth quadratic bezier for soft curves
        const mid = {
          x: (lastPoint.current.x + p.x) / 2,
          y: (lastPoint.current.y + p.y) / 2,
        };
        applyBrush(ctx, lastPoint.current.x, lastPoint.current.y, mid.x, mid.y, eraserMode);
        applyBrush(ctx, mid.x, mid.y, p.x, p.y, eraserMode);
      }
      lastPoint.current = p;
    },
    [canvasPos, applyBrush, eraserMode, brushSize, inkColor],
  );

  const pushUndo = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    undoStack.current.push(canvas.toDataURL());
    if (undoStack.current.length > 30) undoStack.current.shift();
    setCanUndo(undoStack.current.length > 0);
  }, []);

  const undoLast = useCallback(() => {
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
  }, []);

  const clearDoodles = useCallback(
    (pushHistory = true) => {
      const canvas = canvasRef.current;
      const ctx = canvas?.getContext("2d");
      if (!canvas || !ctx) return;
      if (pushHistory) pushUndo();
      ctx.clearRect(0, 0, SIZE, SIZE);
      if (!pushHistory) setCanUndo(false);
    },
    [pushUndo],
  );

  /* ─── Draggable stamps ─────────────────────────────────────────────── */

  const addStamp = (emoji: string) => {
    stampIdRef.current += 1;
    const id = `stamp-${stampIdRef.current}`;
    setStamps((prev) => [
      ...prev,
      {
        id,
        emoji,
        x: SIZE * 0.3 + Math.random() * SIZE * 0.4,
        y: SIZE * 0.3 + Math.random() * SIZE * 0.4,
        size: 30 + Math.random() * 18,
      },
    ]);
    setSelectedStamp(id);
  };

  const handleStampPointerDown = (
    e: ReactPointerEvent,
    stampId: string,
  ) => {
    e.preventDefault();
    e.stopPropagation();
    const el = e.currentTarget as HTMLElement;
    el.setPointerCapture(e.pointerId);

    const stamp = stamps.find((s) => s.id === stampId);
    if (!stamp) return;

    const container = el.closest(".aspect-square") as HTMLElement;
    if (!container) return;
    const rect = container.getBoundingClientRect();
    const startX = e.clientX;
    const startY = e.clientY;
    const origX = stamp.x;
    const origY = stamp.y;

    const onMove = (ev: PointerEvent) => {
      const dx = ((ev.clientX - startX) / rect.width) * SIZE;
      const dy = ((ev.clientY - startY) / rect.height) * SIZE;
      setStamps((prev) =>
        prev.map((s) =>
          s.id === stampId
            ? {
                ...s,
                x: Math.max(0, Math.min(SIZE, origX + dx)),
                y: Math.max(0, Math.min(SIZE, origY + dy)),
              }
            : s,
        ),
      );
    };

    const onUp = () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };

    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
  };

  const stampSize = (stampId: string, delta: number) => {
    setStamps((prev) =>
      prev.map((s) =>
        s.id === stampId
          ? { ...s, size: Math.max(12, Math.min(80, s.size + delta)) }
          : s,
      ),
    );
  };

  /* ─── Compose frame ───────────────────────────────────────────────── */

  const composeFrame = (): string => {
    const canvas = document.createElement("canvas");
    canvas.width = SIZE;
    canvas.height = SIZE;
    const ctx = canvas.getContext("2d");
    if (!ctx) return "";

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

    const doodle = canvasRef.current;
    if (doodle) ctx.drawImage(doodle, 0, 0, SIZE, SIZE);

    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    for (const s of stamps) {
      ctx.font = `${s.size}px serif`;
      ctx.fillText(s.emoji, s.x, s.y);
    }

    if (text.trim()) {
      ctx.font = `bold ${Math.round(SIZE * 0.045)}px sans-serif`;
      ctx.fillStyle = "rgba(90,84,112,0.95)";
      ctx.fillText(text.trim(), SIZE / 2, SIZE * 0.06);
    }

    return canvas.toDataURL("image/png");
  };

  /* ─── Frame management ─────────────────────────────────────────────── */

  const addFrame = () => {
    const img = composeFrame();
    if (!img) return;

    if (editingFrameIdx !== null) {
      // update existing frame
      setFrames((prev) =>
        prev.map((f, i) => (i === editingFrameIdx ? { img } : f)),
      );
      setEditingFrameIdx(null);
      toast("Frame updated", { description: "Your flipbook page has been refreshed." });
    } else {
      // add new frame
      setFrames((prev) => [...prev, { img }]);
      toast("Frame added", {
        description: "Your canvas is clear for the next flipbook page.",
      });
    }

    // clear canvas for next frame
    setStamps([]);
    setText("");
    clearDoodles(false);
    undoStack.current = [];
    setCanUndo(false);
    setPlaying(false);
    setPlayIdx(0);
  };

  const removeFrame = (i: number) => {
    setFrames((prev) => prev.filter((_, idx) => idx !== i));
    if (editingFrameIdx === i) setEditingFrameIdx(null);
    if (playIdx >= frames.length - 1) setPlayIdx(Math.max(0, frames.length - 2));
  };

  const loadFrameToCanvas = (i: number) => {
    const frame = frames[i];
    if (!frame) return;
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;

    const img = new Image();
    img.onload = () => {
      // draw the frame onto the canvas so it can be edited
      ctx.clearRect(0, 0, SIZE, SIZE);
      ctx.drawImage(img, 0, 0, SIZE, SIZE);
    };
    img.src = frame.img;

    setEditingFrameIdx(i);
    setStamps([]);
    setText("");
    undoStack.current = [];
    setCanUndo(false);
    setPlaying(false);
    setPlayIdx(i);
    toast("Frame loaded", {
      description: "Edit it and tap 'Update frame' to save changes.",
    });
  };

  const changeBase = (next: (typeof PHOTO_SCENES)[number] | "avatar") => {
    if (next === bg) return;
    setBg(next);
    setStamps([]);
    setText("");
    clearDoodles(false);
    undoStack.current = [];
    setCanUndo(false);
    setEditingFrameIdx(null);
  };

  /* ─── Save to vault ────────────────────────────────────────────────── */

  const save = async () => {
    if (saving) return;
    setSaving(true);
    try {
      let gifUrl = "";
      if (frames.length > 0) {
        const canvases = await Promise.all(
          frames.map((f) => loadImageToCanvas(f.img, SIZE, SIZE)),
        );
        gifUrl = gifDataUrlFromCanvases(canvases, 650);
      } else {
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

  /* ─── Download & Share ─────────────────────────────────────────────── */

  const getGifBlob = async (): Promise<Blob | null> => {
    let gifUrl = "";
    if (frames.length > 0) {
      const canvases = await Promise.all(
        frames.map((f) => loadImageToCanvas(f.img, SIZE, SIZE)),
      );
      gifUrl = gifDataUrlFromCanvases(canvases, 650);
    } else {
      gifUrl = composeFrame();
    }
    if (!gifUrl) return null;
    const res = await fetch(gifUrl);
    return res.blob();
  };

  const downloadGif = async () => {
    try {
      const blob = await getGifBlob();
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `venting-gif-${Date.now()}.gif`;
      a.click();
      URL.revokeObjectURL(url);
      toast("saved to your gallery 🌷", { description: "Your GIF is in your downloads." });
    } catch {
      toast("Download failed", { description: "Please try again." });
    }
  };

  const shareGif = async () => {
    try {
      const blob = await getGifBlob();
      if (!blob) return;
      const file = new File([blob], `venting-gif-${Date.now()}.gif`, {
        type: "image/gif",
      });
      if (navigator.share && navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], title: "My Venting GIF" });
      } else {
        // fallback: download instead
        downloadGif();
        toast("Share not supported", { description: "Downloaded instead — you can share it from your files." });
      }
    } catch {
      // user cancelled or error — ignore
    }
  };

  /* ─── Render ───────────────────────────────────────────────────────── */

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
              bg === "avatar"
                ? "ring-2 ring-lavender-400 ring-offset-2 ring-offset-cream"
                : "",
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
                bg !== "avatar" &&
                  bg.emoji === scene.emoji &&
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

      {/* ─── Helper line ─────────────────────────────────────────── */}
      <p className="text-center text-[12px] font-medium text-ink-soft italic">
        doodle, stick, and drag — each frame is one little moment of your GIF.
      </p>

      {/* ─── Drawing tools ───────────────────────────────────────── */}
      <section className="space-y-3">
        {/* brush style */}
        <div className="flex gap-2">
          {BRUSH_STYLES.map((b) => (
            <button
              key={b.id}
              type="button"
              onClick={() => {
                setBrushStyle(b.id);
                setEraserMode(false);
              }}
              className={cn(
                "clay-chip flex items-center gap-1.5 rounded-full px-3.5 py-2 text-xs font-bold transition-all",
                brushStyle === b.id && !eraserMode
                  ? "bg-lavender-300/70 text-ink-deep shadow-sm"
                  : "text-ink-soft",
              )}
            >
              {b.emoji} {b.label}
            </button>
          ))}
          <button
            type="button"
            onClick={() => setEraserMode((v) => !v)}
            className={cn(
              "clay-chip flex items-center gap-1.5 rounded-full px-3.5 py-2 text-xs font-bold transition-all",
              eraserMode
                ? "bg-blush-200/70 text-ink-deep shadow-sm"
                : "text-ink-soft",
            )}
          >
            🧹 Eraser
          </button>
        </div>

        {/* ink colors */}
        <div className="flex gap-2 items-center">
          <span className="text-[10px] font-bold text-ink-soft">Color:</span>
          {INK_COLORS.map((c) => (
            <button
              key={c.name}
              type="button"
              onClick={() => {
                setInkColor(c.value);
                setEraserMode(false);
              }}
              className={cn(
                "h-7 w-7 rounded-full border-2 transition-all",
                inkColor === c.value && !eraserMode
                  ? "border-ink-deep scale-110 shadow-md"
                  : "border-white/70",
              )}
              style={{ backgroundColor: c.value }}
              aria-label={`Ink color ${c.name}`}
            />
          ))}
        </div>

        {/* brush sizes */}
        <div className="flex gap-2 items-center">
          <span className="text-[10px] font-bold text-ink-soft">Size:</span>
          {BRUSH_SIZES.map((s) => (
            <button
              key={s.value}
              type="button"
              onClick={() => setBrushSize(s.value)}
              className={cn(
                "clay-chip flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[10px] font-bold transition-all",
                brushSize === s.value
                  ? "bg-lavender-300/70 text-ink-deep shadow-sm"
                  : "text-ink-soft",
              )}
            >
              <span
                className="rounded-full"
                style={{
                  width: Math.max(4, s.value * 0.8),
                  height: Math.max(4, s.value * 0.8),
                  backgroundColor: eraserMode ? "#999" : inkColor,
                }}
              />
              {s.label}
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
            <div
              className={cn(
                "absolute inset-0 flex items-center justify-center",
                bg.bg,
              )}
            >
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
            onPointerMove={(e) => {
              if (!drawing.current) return;
              e.preventDefault();
              stroke(e);
            }}
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
            className={cn(
              "absolute inset-0 h-full w-full touch-none",
              eraserMode ? "cursor-cell" : "cursor-crosshair",
            )}
            aria-label="Doodle canvas"
          />

          {/* Draggable stamps */}
          {stamps.map((s) => (
            <div
              key={s.id}
              className="absolute touch-none"
              style={{
                left: `${(s.x / SIZE) * 100}%`,
                top: `${(s.y / SIZE) * 100}%`,
                transform: "translate(-50%, -50%)",
                fontSize: s.size,
                lineHeight: 1,
                zIndex: selectedStamp === s.id ? 20 : 10,
              }}
              onPointerDown={(e) => {
                setSelectedStamp(s.id);
                handleStampPointerDown(e, s.id);
              }}
            >
              <span className="drop-shadow-sm select-none pointer-events-none">
                {s.emoji}
              </span>
              {/* Selection controls */}
              {selectedStamp === s.id && (
                <div
                  className="absolute -top-9 left-1/2 flex -translate-x-1/2 gap-1"
                  onPointerDown={(e) => e.stopPropagation()}
                >
                  <button
                    type="button"
                    onPointerDown={(e) => e.stopPropagation()}
                    onClick={(e) => {
                      e.stopPropagation();
                      stampSize(s.id, 8);
                    }}
                    className="flex h-6 w-6 items-center justify-center rounded-full bg-white/90 text-ink-deep shadow-md transition-transform hover:scale-110"
                    aria-label="Bigger"
                  >
                    <Plus className="size-3" />
                  </button>
                  <button
                    type="button"
                    onPointerDown={(e) => e.stopPropagation()}
                    onClick={(e) => {
                      e.stopPropagation();
                      stampSize(s.id, -8);
                    }}
                    className="flex h-6 w-6 items-center justify-center rounded-full bg-white/90 text-ink-deep shadow-md transition-transform hover:scale-110"
                    aria-label="Smaller"
                  >
                    <Minus className="size-3" />
                  </button>
                  <button
                    type="button"
                    onPointerDown={(e) => e.stopPropagation()}
                    onClick={(e) => {
                      e.stopPropagation();
                      setStamps((prev) => prev.filter((x) => x.id !== s.id));
                      setSelectedStamp(null);
                    }}
                    className="flex h-6 w-6 items-center justify-center rounded-full bg-blush-100 text-blush-500 shadow-md transition-transform hover:scale-110"
                    aria-label="Remove stamp"
                  >
                    <X className="size-3" />
                  </button>
                </div>
              )}
            </div>
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
            setSelectedStamp(null);
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

      {/* ─── Add / Update / Duplicate frame button ────────────────── */}
      <div className="flex gap-2">
        <button
          type="button"
          onClick={addFrame}
          className="clay-btn-soft flex flex-1 items-center justify-center gap-2 rounded-2xl px-4 py-3.5 text-sm font-bold text-ink-deep"
        >
          {editingFrameIdx !== null ? (
            <>
              <Save className="size-4" /> Update frame
            </>
          ) : (
            <>
              <Plus className="size-4" /> Add as frame
            </>
          )}
        </button>
        <button
          type="button"
          onClick={() => {
            const img = composeFrame();
            if (!img) return;
            setFrames((f) => [...f, { img }]);
            setEditingFrameIdx(null);
            toast("Frame duplicated", { description: "A copy of the current frame was added." });
          }}
          className="clay-btn-soft flex items-center justify-center gap-1.5 rounded-2xl px-4 py-3.5 text-sm font-bold text-ink-deep"
        >
          <Copy className="size-4" /> duplicate
        </button>
      </div>

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

          {/* Tappable thumbnails */}
          <div className="flex gap-2 overflow-x-auto pb-1">
            {frames.map((frame, i) => (
              <div key={i} className="relative shrink-0">
                <button
                  type="button"
                  onClick={() => loadFrameToCanvas(i)}
                  className={cn(
                    "block h-16 w-16 overflow-hidden rounded-2xl transition-transform",
                    editingFrameIdx === i &&
                      "ring-2 ring-lavender-400 ring-offset-2 ring-offset-cream",
                    playIdx === i &&
                      editingFrameIdx !== i &&
                      !playing &&
                      "ring-2 ring-mint-400 ring-offset-2 ring-offset-cream",
                  )}
                  aria-label={`Edit or preview frame ${i + 1}`}
                >
                  {renderFrame(frame, `thumb-${i}`)}
                </button>
                <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 rounded-full bg-white/90 px-1.5 py-0.5 text-[8px] font-bold text-ink-soft">
                  {i + 1}
                </span>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    removeFrame(i);
                  }}
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

      {/* ─── Combine all frames into collage ──────────────────────── */}
      {frames.length >= 2 && (
        <button
          type="button"
          disabled={saving}
          onClick={async () => {
            setSaving(true);
            try {
              const arts = frames.map((f) => f.img);
              const collage = await combineIntoCollage(arts);
              if (collage) {
                createVaultItem({ kind: "photo", art: collage, bg: "tile-blush", caption: `a ${arts.length}-frame collage` });
                saveToGallery(collage, `venting-collage-${Date.now()}.png`);
                toast("Collage saved", { description: `${arts.length} frames combined into one framed photo.` });
              }
            } catch {
              toast("Couldn't combine frames", { description: "Please try again." });
            } finally {
              setSaving(false);
            }
          }}
          className="clay-btn-soft flex w-full items-center justify-center gap-2 rounded-2xl px-5 py-3 text-sm font-bold text-ink-deep"
        >
          <Grid2x2 className="size-4" /> combine all into one framed photo ({frames.length} frames)
        </button>
      )}

      {/* ─── Save / Download / Share buttons ──────────────────────── */}
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
          onClick={downloadGif}
          className="clay-btn-soft flex items-center justify-center gap-1.5 rounded-2xl px-4 py-3.5 text-sm font-bold text-ink-deep"
        >
          <Download className="size-4" />
          Save to gallery
        </button>
        <button
          type="button"
          onClick={shareGif}
          className="clay-btn-soft flex items-center justify-center gap-1.5 rounded-2xl px-4 py-3.5 text-sm font-bold text-ink-deep"
        >
          <Share2 className="size-4" />
          Share
        </button>
      </div>
      <p className="text-center text-[11px] font-semibold text-ink-soft">
        🎞️ mix photos, doodle on them, and make little looping feelings
      </p>
    </div>
  );
}
