import { motion } from "framer-motion";
import { toast } from "sonner";
import { useEffect, useRef, useState, useCallback, type PointerEvent as ReactPointerEvent } from "react";
import { useSetDirty } from "@/lib/useUnsavedGuard";
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
  x: number;
  y: number;
  size: number;
  motion: MotionType;
}

interface CanvasText {
  text: string;
  font: TextFont;
  color: string;
  bouncy: boolean;
  x: number;
  y: number;
  size: number;
}

interface Frame {
  img: string;
}

type BrushStyle = "pencil" | "crayon" | "marker" | "sparkle-trail" | "hearts-trail" | "star-dust" | "rainbow-soft";
type InkColor = string;
type MotionType = "still" | "float" | "spin" | "pulse" | "sparkle";
type TextFont = "script" | "rounded";
type GifSpeed = "sleepy" | "gentle" | "lively";

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
  { id: "sparkle-trail", label: "Sparkle", emoji: "✨" },
  { id: "hearts-trail", label: "Hearts", emoji: "💜" },
  { id: "star-dust", label: "Star dust", emoji: "⭐" },
  { id: "rainbow-soft", label: "Rainbow", emoji: "🌈" },
];

const BRUSH_SIZES = [
  { label: "Thin", value: 3 },
  { label: "Medium", value: 7 },
  { label: "Thick", value: 14 },
];

const SIZE = 700;

const MOTION_TYPES: { id: MotionType; label: string; emoji: string }[] = [
  { id: "still", label: "Still", emoji: "📌" },
  { id: "float", label: "Float", emoji: "🫧" },
  { id: "spin", label: "Spin", emoji: "🌀" },
  { id: "pulse", label: "Pulse", emoji: "💗" },
  { id: "sparkle", label: "Sparkle", emoji: "✨" },
];

const TEXT_FONTS: { id: TextFont; label: string }[] = [
  { id: "script", label: "Script" },
  { id: "rounded", label: "Rounded" },
];

const TEXT_COLORS = [
  { name: "lavender", value: "#8C9AD6" },
  { name: "plum", value: "#5F6DBE" },
  { name: "pink", value: "#C48B9E" },
  { name: "mint", value: "#6bc9a0" },
  { name: "peach", value: "#C9A96A" },
  { name: "dark", value: "#3E3358" },
];

const GIF_SPEEDS: { id: GifSpeed; label: string; ms: number; emoji: string }[] = [
  { id: "sleepy", label: "Sleepy", ms: 1000, emoji: "😴" },
  { id: "gentle", label: "Gentle", ms: 650, emoji: "🌿" },
  { id: "lively", label: "Lively", ms: 400, emoji: "🦋" },
];

const MAGIC_MESSAGES = [
  "your little animation is growing 🌱",
  "so cute — save it when ready 💜",
  "look at it come alive ✨",
  "every frame tells a little story 🌸",
  "you're making something lovely 🌷",
];

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
  const [gifSpeed, setGifSpeed] = useState<GifSpeed>("gentle");
  const [magicTouch, setMagicTouch] = useState(false);
  const [canvasTexts, setCanvasTexts] = useState<CanvasText[]>([]);
  const [selectedText, setSelectedText] = useState<number | null>(null);
  const textIdRef = useRef(0);
  const [encouragement, setEncouragement] = useState(MAGIC_MESSAGES[0]);
  const setDirty = useSetDirty();
  // Mark dirty when there are frames, stamps, or doodles
  useEffect(() => {
    setDirty(frames.length > 0 || stamps.length > 0 || undoStack.current.length > 0 || canvasTexts.length > 0);
  }, [frames.length, stamps.length, canvasTexts.length, setDirty]);

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

  // gif playback with speed
  const playMs = GIF_SPEEDS.find((s) => s.id === gifSpeed)?.ms ?? 650;
  useEffect(() => {
    if (!playing || frames.length === 0) return;
    const t = window.setInterval(() => {
      setPlayIdx((i) => (i + 1) % frames.length);
    }, playMs);
    return () => window.clearInterval(t);
  }, [playing, frames.length, playMs]);

  // rotate encouragement
  useEffect(() => {
    if (frames.length === 0) return;
    const t = setInterval(() => {
      setEncouragement(MAGIC_MESSAGES[Math.floor(Math.random() * MAGIC_MESSAGES.length)]);
    }, 6000);
    return () => clearInterval(t);
  }, [frames.length]);

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
          ctx.lineWidth = brushSize * 1.4;
          ctx.lineCap = "round";
          ctx.lineJoin = "round";
          ctx.globalAlpha = 0.7;
          ctx.beginPath();
          ctx.moveTo(x1, y1);
          ctx.lineTo(x2, y2);
          ctx.stroke();
          ctx.globalAlpha = 0.35;
          ctx.lineWidth = brushSize * 0.8;
          ctx.beginPath();
          ctx.moveTo(x1, y1);
          ctx.lineTo(x2, y2);
          ctx.stroke();
          break;
        }
        case "sparkle-trail": {
          ctx.globalAlpha = 0.8;
          ctx.lineWidth = brushSize * 0.5;
          ctx.lineCap = "round";
          ctx.strokeStyle = inkColor;
          ctx.beginPath();
          ctx.moveTo(x1, y1);
          ctx.lineTo(x2, y2);
          ctx.stroke();
          for (let i = 0; i < 3; i++) {
            const sx = x2 + (Math.random() - 0.5) * brushSize * 2;
            const sy = y2 + (Math.random() - 0.5) * brushSize * 2;
            ctx.globalAlpha = 0.5 + Math.random() * 0.4;
            ctx.font = `${4 + Math.random() * 6}px serif`;
            ctx.fillText("✨", sx, sy);
          }
          break;
        }
        case "hearts-trail": {
          ctx.globalAlpha = 0.7;
          ctx.lineWidth = brushSize * 0.5;
          ctx.lineCap = "round";
          ctx.strokeStyle = inkColor;
          ctx.beginPath();
          ctx.moveTo(x1, y1);
          ctx.lineTo(x2, y2);
          ctx.stroke();
          for (let i = 0; i < 2; i++) {
            const hx = x2 + (Math.random() - 0.5) * brushSize * 1.5;
            const hy = y2 + (Math.random() - 0.5) * brushSize * 1.5;
            ctx.globalAlpha = 0.5 + Math.random() * 0.3;
            ctx.font = `${4 + Math.random() * 5}px serif`;
            ctx.fillText("💜", hx, hy);
          }
          break;
        }
        case "star-dust": {
          ctx.globalAlpha = 0.6;
          ctx.lineWidth = brushSize * 0.4;
          ctx.lineCap = "round";
          ctx.strokeStyle = inkColor;
          ctx.beginPath();
          ctx.moveTo(x1, y1);
          ctx.lineTo(x2, y2);
          ctx.stroke();
          for (let i = 0; i < 4; i++) {
            const stx = x2 + (Math.random() - 0.5) * brushSize * 2.5;
            const sty = y2 + (Math.random() - 0.5) * brushSize * 2.5;
            ctx.globalAlpha = 0.4 + Math.random() * 0.5;
            ctx.font = `${3 + Math.random() * 5}px serif`;
            ctx.fillText("⭐", stx, sty);
          }
          break;
        }
        case "rainbow-soft": {
          const rainbowColors = ["#e88fa5", "#e8d56a", "#6bc9a0", "#7caed4", "#a584c8"];
          const rc = rainbowColors[Math.floor(Math.random() * rainbowColors.length)];
          ctx.globalAlpha = 0.6;
          ctx.lineWidth = brushSize;
          ctx.lineCap = "round";
          ctx.strokeStyle = rc;
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
        motion: "still" as MotionType,
      },
    ]);
    setSelectedStamp(id);
    setSelectedText(null);
  };

  const setStampMotion = (stampId: string, motion: MotionType) => {
    setStamps((prev) => prev.map((s) => s.id === stampId ? { ...s, motion } : s));
  };

  const addCanvasText = () => {
    textIdRef.current += 1;
    setCanvasTexts((prev) => [
      ...prev,
      {
        text: "hello ✨",
        font: "script" as TextFont,
        color: "#8C9AD6",
        bouncy: false,
        x: SIZE * 0.5,
        y: SIZE * 0.12,
        size: 28,
      },
    ]);
    setSelectedText(canvasTexts.length);
    setSelectedStamp(null);
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
            ? { ...s, x: Math.max(0, Math.min(SIZE, origX + dx)), y: Math.max(0, Math.min(SIZE, origY + dy)) }
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
        s.id === stampId ? { ...s, size: Math.max(12, Math.min(80, s.size + delta)) } : s,
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
      let sx = s.x;
      let sy = s.y;
      if (s.motion !== "still") {
        const t = Date.now() / 1000;
        if (s.motion === "float") { sy += Math.sin(t * 1.2 + s.x) * 6; sx += Math.cos(t * 0.8 + s.y) * 3; }
        else if (s.motion === "spin") { ctx.save(); ctx.translate(sx, sy); ctx.rotate(t * 0.5); ctx.translate(-sx, -sy); }
        else if (s.motion === "pulse") { const sc = 1 + Math.sin(t * 2) * 0.12; ctx.save(); ctx.translate(sx, sy); ctx.scale(sc, sc); ctx.translate(-sx, -sy); }
        else if (s.motion === "sparkle") { sy += Math.sin(t * 1.5) * 3; }
      }
      ctx.font = `${s.size}px serif`;
      ctx.fillText(s.emoji, sx, sy);
      if (s.motion === "spin" || s.motion === "pulse") ctx.restore();
    }

    for (const ct of canvasTexts) {
      if (!ct.text.trim()) continue;
      const font_family = ct.font === "script" ? "Caveat, cursive" : "Nunito, sans-serif";
      ctx.font = `bold ${ct.size}px ${font_family}`;
      ctx.fillStyle = ct.color;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(ct.text.trim(), ct.x, ct.y);
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
      setFrames((prev) => prev.map((f, i) => (i === editingFrameIdx ? { img } : f)));
      setEditingFrameIdx(null);
      toast("Frame updated", { description: "Your flipbook page has been refreshed." });
    } else {
      setFrames((prev) => [...prev, { img }]);
      toast("Frame added", { description: "Your canvas is clear for the next flipbook page." });
    }

    setStamps([]);
    setText("");
    setCanvasTexts([]);
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
      ctx.clearRect(0, 0, SIZE, SIZE);
      ctx.drawImage(img, 0, 0, SIZE, SIZE);
    };
    img.src = frame.img;

    setEditingFrameIdx(i);
    setStamps([]);
    setText("");
    setCanvasTexts([]);
    undoStack.current = [];
    setCanUndo(false);
    setPlaying(false);
    setPlayIdx(i);
    toast("Frame loaded", { description: "Edit it and tap 'Update frame' to save changes." });
  };

  const changeBase = (next: (typeof PHOTO_SCENES)[number] | "avatar") => {
    if (next === bg) return;
    setBg(next);
    setStamps([]);
    setText("");
    setCanvasTexts([]);
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
        gifUrl = gifDataUrlFromCanvases(canvases, playMs);
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
      gifUrl = gifDataUrlFromCanvases(canvases, playMs);
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
      const file = new File([blob], `venting-gif-${Date.now()}.gif`, { type: "image/gif" });
      if (typeof navigator !== "undefined" && navigator.share && navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], title: "My Venting GIF" });
      } else {
        downloadGif();
        toast("Share not supported", { description: "Downloaded instead — you can share it from your files." });
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.includes("cancel") || msg.includes("AbortError") || msg.includes("permission")) {
        toast("that's okay — nothing was shared", { description: "Your GIF is still safe on your device." });
      } else {
        downloadGif();
        toast("that's okay — nothing was shared", { description: "Downloaded instead so you have it." });
      }
    }
  };

  /* ─── Render ───────────────────────────────────────────────────────── */

  const renderFrame = (frame: Frame, keyPrefix: string) => (
    <div key={keyPrefix} className="relative h-full w-full overflow-hidden rounded-[1.6rem] bg-cream">
      <img src={frame.img} alt="" className="pointer-events-none absolute inset-0 h-full w-full object-cover" draggable={false} />
    </div>
  );

  return (
    <div className="space-y-5">
      {/* Base picker */}
      <section>
        <p className="text-xs font-bold text-ink-soft uppercase tracking-wide">Start from a soft base</p>
        <div className="mt-2 flex gap-2 overflow-x-auto pb-1">
          <button type="button" onClick={() => changeBase("avatar")}
            className={cn("flex h-16 w-14 shrink-0 flex-col items-center justify-center rounded-2xl transition-transform",
              bg === "avatar" ? "ring-2 ring-lavender-400 ring-offset-2 ring-offset-cream" : "")}
            style={{ background: "linear-gradient(180deg,#dcf1e5,#c2e5d0)" }}>
            <span className="text-2xl">{avatar}</span>
            <span className="text-[8px] font-bold text-ink-deep/70">video vent</span>
          </button>
          {PHOTO_SCENES.map((scene) => (
            <button key={scene.emoji} type="button" onClick={() => changeBase(scene)}
              className={cn("flex h-16 w-14 shrink-0 flex-col items-center justify-center rounded-2xl transition-transform", scene.bg,
                bg !== "avatar" && bg.emoji === scene.emoji && "ring-2 ring-lavender-400 ring-offset-2 ring-offset-cream")}>
              <span className="text-2xl drop-shadow-sm">{scene.emoji}</span>
              <span className="max-w-full truncate px-1 text-[8px] font-bold text-ink-deep/70">{scene.label}</span>
            </button>
          ))}
        </div>
        <p className="mt-1.5 text-[10px] font-semibold text-ink-soft">changing the base starts a fresh page — old scribbles are cleared</p>
      </section>

      <p className="text-center text-[12px] font-medium text-ink-soft italic">
        doodle, stick, and drag — each frame is one little moment of your GIF.
      </p>

      {/* Drawing tools */}
      <section className="space-y-3">
        <div className="flex gap-2 flex-wrap">
          {BRUSH_STYLES.map((b) => (
            <button key={b.id} type="button" onClick={() => { setBrushStyle(b.id); setEraserMode(false); }}
              className={cn("clay-chip flex items-center gap-1.5 rounded-full px-3.5 py-2 text-xs font-bold transition-all",
                brushStyle === b.id && !eraserMode ? "bg-lavender-300/70 text-ink-deep shadow-sm" : "text-ink-soft")}>
              {b.emoji} {b.label}
            </button>
          ))}
          <button type="button" onClick={() => setEraserMode((v) => !v)}
            className={cn("clay-chip flex items-center gap-1.5 rounded-full px-3.5 py-2 text-xs font-bold transition-all",
              eraserMode ? "bg-blush-200/70 text-ink-deep shadow-sm" : "text-ink-soft")}>
            🧹 Eraser
          </button>
        </div>
        <div className="flex gap-2 items-center">
          <span className="text-[10px] font-bold text-ink-soft">Color:</span>
          {INK_COLORS.map((c) => (
            <button key={c.name} type="button" onClick={() => { setInkColor(c.value); setEraserMode(false); }}
              className={cn("h-7 w-7 rounded-full border-2 transition-all",
                inkColor === c.value && !eraserMode ? "border-ink-deep scale-110 shadow-md" : "border-white/70")}
              style={{ backgroundColor: c.value }} aria-label={`Ink color ${c.name}`} />
          ))}
        </div>
        <div className="flex gap-2 items-center">
          <span className="text-[10px] font-bold text-ink-soft">Size:</span>
          {BRUSH_SIZES.map((s) => (
            <button key={s.value} type="button" onClick={() => setBrushSize(s.value)}
              className={cn("clay-chip flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[10px] font-bold transition-all",
                brushSize === s.value ? "bg-lavender-300/70 text-ink-deep shadow-sm" : "text-ink-soft")}>
              <span className="rounded-full" style={{ width: Math.max(4, s.value * 0.8), height: Math.max(4, s.value * 0.8), backgroundColor: eraserMode ? "#999" : inkColor }} />
              {s.label}
            </button>
          ))}
        </div>
      </section>

      {/* Canvas text manager */}
      <div className="space-y-2">
        <div className="flex gap-2 items-center">
          <button type="button" onClick={addCanvasText}
            className="clay-chip flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold text-ink-deep">
            ✏️ add text
          </button>
          {canvasTexts.length > 0 && (
            <span className="text-[10px] font-bold text-ink-soft">{canvasTexts.length} text{canvasTexts.length > 1 ? "s" : ""}</span>
          )}
        </div>
        {canvasTexts.map((ct, i) => (
          <div key={i} className={cn("clay-card rounded-xl p-2.5 space-y-1.5", selectedText === i && "ring-2 ring-lavender-400")}>
            <div className="flex items-center gap-1.5">
              <input type="text" value={ct.text}
                onChange={(e) => setCanvasTexts((prev) => prev.map((t, j) => j === i ? { ...t, text: e.target.value } : t))}
                onFocus={() => { setSelectedText(i); setSelectedStamp(null); }}
                placeholder="type something…"
                className="flex-1 rounded-lg border-0 bg-[#FDF5E6]/70 px-2 py-1 text-xs text-ink-deep placeholder:text-ink-soft/50 focus:outline-none focus-visible:ring-1 focus-visible:ring-[#8C9AD6]" />
              <button type="button" onClick={() => { setCanvasTexts((prev) => prev.filter((_, j) => j !== i)); setSelectedText(null); }}
                className="h-5 w-5 rounded-full flex items-center justify-center text-[9px] text-blush-500 hover:bg-blush-50">✕</button>
            </div>
            <div className="flex gap-1 items-center">
              {TEXT_FONTS.map((f) => (
                <button key={f.id} type="button"
                  onClick={() => setCanvasTexts((prev) => prev.map((t, j) => j === i ? { ...t, font: f.id } : t))}
                  className={cn("rounded-full px-2 py-0.5 text-[9px] font-bold transition-all",
                    ct.font === f.id ? "bg-[#5F6DBE] text-white" : "clay-chip text-ink-soft")}>
                  {f.label}
                </button>
              ))}
              <span className="text-[8px] text-ink-soft">|</span>
              {TEXT_COLORS.map((c) => (
                <button key={c.name} type="button"
                  onClick={() => setCanvasTexts((prev) => prev.map((t, j) => j === i ? { ...t, color: c.value } : t))}
                  className={cn("h-4 w-4 rounded-full border transition-all",
                    ct.color === c.value ? "border-ink-deep scale-125" : "border-white/70")}
                  style={{ backgroundColor: c.value }} />
              ))}
              <span className="text-[8px] text-ink-soft">|</span>
              <button type="button"
                onClick={() => setCanvasTexts((prev) => prev.map((t, j) => j === i ? { ...t, bouncy: !t.bouncy } : t))}
                className={cn("rounded-full px-2 py-0.5 text-[9px] font-bold transition-all",
                  ct.bouncy ? "bg-[#5F6DBE] text-white" : "clay-chip text-ink-soft")}>
                {ct.bouncy ? "🫧 bouncy" : "📌 still"}
              </button>
            </div>
          </div>
        ))}
        <Input value={text} onChange={(e) => setText(e.target.value)} placeholder="Quick text (optional)"
          className="rounded-2xl border-lavender-200/70 bg-cream-soft text-sm text-ink-deep placeholder:text-ink-soft/70 focus-visible:ring-lavender-300" />
      </div>

      {/* Editor canvas (fluffy) */}
      <div className="relative">
        <motion.span animate={{ y: [0, -8, 0], opacity: [0.4, 0.8, 0.4] }}
          transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
          className="absolute -top-3 -left-2 text-lg pointer-events-none z-10">✨</motion.span>
        <motion.span animate={{ y: [0, 6, 0], opacity: [0.3, 0.7, 0.3] }}
          transition={{ duration: 4, repeat: Infinity, ease: "easeInOut", delay: 1 }}
          className="absolute -bottom-2 -right-3 text-base pointer-events-none z-10">💜</motion.span>
        <motion.span animate={{ x: [0, 5, 0], opacity: [0.3, 0.6, 0.3] }}
          transition={{ duration: 3.5, repeat: Infinity, ease: "easeInOut", delay: 0.5 }}
          className="absolute top-1/3 -right-4 text-sm pointer-events-none z-10">🌸</motion.span>

        <div className="clay-card relative overflow-hidden p-2.5" style={{ boxShadow: "0 8px 32px -8px rgba(90,70,120,0.18), inset 0 1px 0 rgba(255,255,255,0.6)" }}>
          <div className="relative aspect-square overflow-hidden rounded-[1.6rem]" style={{ boxShadow: "inset 0 2px 12px rgba(90,70,120,0.1)" }}>
            {bg === "avatar" ? (
              <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-b from-mint-100 via-cream-soft to-lavender-50">
                <span className="animate-floaty text-7xl drop-shadow-md">{avatar}</span>
                <div className="absolute inset-0 pointer-events-none" style={{ background: "radial-gradient(ellipse at center, transparent 50%, rgba(90,70,120,0.08) 100%)" }} />
              </div>
            ) : (
              <div className={cn("absolute inset-0 flex items-center justify-center", bg.bg)}>
                <span className="text-6xl drop-shadow-sm">{bg.emoji}</span>
                {bg.label === "warm sunset" && (
                  <div className="absolute inset-0 pointer-events-none overflow-hidden">
                    <motion.div animate={{ opacity: [0.3, 0.6, 0.3], scale: [1, 1.1, 1] }} transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
                      className="absolute top-1/4 left-1/2 -translate-x-1/2 w-24 h-24 rounded-full bg-yellow-300/30 blur-xl" />
                  </div>
                )}
                {bg.label === "rainy window" && (
                  <div className="absolute inset-0 pointer-events-none overflow-hidden">
                    {[0,1,2,3,4,5].map((i) => (
                      <motion.div key={i} animate={{ y: [-(20+i*30), 300], opacity: [0.5, 0] }}
                        transition={{ duration: 2+i*0.3, repeat: Infinity, ease: "linear", delay: i*0.4 }}
                        className="absolute w-0.5 h-3 rounded-full bg-blue-300/50" style={{ left: `${15+i*14}%` }} />
                    ))}
                  </div>
                )}
                {bg.label === "cloudy sky" && (
                  <div className="absolute inset-0 pointer-events-none overflow-hidden">
                    <motion.span animate={{ x: [-20, 40, -20] }} transition={{ duration: 12, repeat: Infinity, ease: "easeInOut" }}
                      className="absolute top-6 left-8 text-2xl opacity-30">☁️</motion.span>
                  </div>
                )}
                {bg.label === "blooming branch" && (
                  <div className="absolute inset-0 pointer-events-none overflow-hidden">
                    {[0,1,2].map((i) => (
                      <motion.span key={i} animate={{ y: [-10, 280], x: [0, (i-1)*20], rotate: [0, 180] }}
                        transition={{ duration: 5+i, repeat: Infinity, ease: "easeIn", delay: i*2 }}
                        className="absolute text-sm opacity-50" style={{ left: `${30+i*18}%` }}>🌸</motion.span>
                    ))}
                  </div>
                )}
                {bg.label === "autumn leaves" && (
                  <div className="absolute inset-0 pointer-events-none overflow-hidden">
                    {[0,1,2,3].map((i) => (
                      <motion.span key={i} animate={{ y: [-10, 280], x: [0, (i%2===0?15:-15)], rotate: [0, 360] }}
                        transition={{ duration: 4+i*0.8, repeat: Infinity, ease: "easeIn", delay: i*1.2 }}
                        className="absolute text-sm opacity-50" style={{ left: `${20+i*18}%` }}>🍂</motion.span>
                    ))}
                  </div>
                )}
                {bg.label === "quiet night" && (
                  <div className="absolute inset-0 pointer-events-none overflow-hidden">
                    {[0,1,2,3,4].map((i) => (
                      <motion.span key={i} animate={{ opacity: [0.2, 0.8, 0.2], scale: [0.8, 1.2, 0.8] }}
                        transition={{ duration: 2+i*0.5, repeat: Infinity, ease: "easeInOut", delay: i*0.7 }}
                        className="absolute text-xs" style={{ left: `${10+i*18}%`, top: `${8+(i%3)*12}%` }}>⭐</motion.span>
                    ))}
                  </div>
                )}
              </div>
            )}
            <canvas ref={canvasRef}
              onPointerDown={(e) => { e.preventDefault(); drawing.current = true; lastPoint.current = null; (e.target as HTMLElement).setPointerCapture(e.pointerId); stroke(e); }}
              onPointerMove={(e) => { if (!drawing.current) return; e.preventDefault(); stroke(e); }}
              onPointerUp={(e) => { drawing.current = false; lastPoint.current = null; pushUndo(); (e.target as HTMLElement).releasePointerCapture?.(e.pointerId); }}
              onPointerLeave={() => { drawing.current = false; lastPoint.current = null; }}
              className={cn("absolute inset-0 h-full w-full touch-none", eraserMode ? "cursor-cell" : "cursor-crosshair")}
              aria-label="Doodle canvas" />

            {/* Draggable stamps with motion picker */}
            {stamps.map((s) => (
              <div key={s.id} className="absolute touch-none"
                style={{ left: `${(s.x / SIZE) * 100}%`, top: `${(s.y / SIZE) * 100}%`, transform: "translate(-50%, -50%)", fontSize: s.size, lineHeight: 1, zIndex: selectedStamp === s.id ? 20 : 10,
                  animation: s.motion === "float" ? "floaty 3s ease-in-out infinite" : s.motion === "pulse" ? "pulse 2s ease-in-out infinite" : undefined }}
                onPointerDown={(e) => { setSelectedStamp(s.id); setSelectedText(null); handleStampPointerDown(e, s.id); }}>
                <span className="drop-shadow-sm select-none pointer-events-none">{s.emoji}</span>
                {selectedStamp === s.id && (
                  <div className="absolute -top-16 left-1/2 flex -translate-x-1/2 flex-col items-center gap-1"
                    onPointerDown={(e) => e.stopPropagation()}>
                    <div className="flex gap-1">
                      <button type="button" onPointerDown={(e) => e.stopPropagation()}
                        onClick={(e) => { e.stopPropagation(); stampSize(s.id, 8); }}
                        className="flex h-6 w-6 items-center justify-center rounded-full bg-white/90 text-ink-deep shadow-md transition-transform hover:scale-110"><Plus className="size-3" /></button>
                      <button type="button" onPointerDown={(e) => e.stopPropagation()}
                        onClick={(e) => { e.stopPropagation(); stampSize(s.id, -8); }}
                        className="flex h-6 w-6 items-center justify-center rounded-full bg-white/90 text-ink-deep shadow-md transition-transform hover:scale-110"><Minus className="size-3" /></button>
                      <button type="button" onPointerDown={(e) => e.stopPropagation()}
                        onClick={(e) => { e.stopPropagation(); setStamps((prev) => prev.filter((x) => x.id !== s.id)); setSelectedStamp(null); }}
                        className="flex h-6 w-6 items-center justify-center rounded-full bg-blush-100 text-blush-500 shadow-md transition-transform hover:scale-110"><X className="size-3" /></button>
                    </div>
                    <div className="flex gap-0.5 bg-white/90 rounded-full px-1 py-0.5 shadow-md">
                      {MOTION_TYPES.map((mt) => (
                        <button key={mt.id} type="button" onPointerDown={(e) => e.stopPropagation()}
                          onClick={(e) => { e.stopPropagation(); setStampMotion(s.id, mt.id); }}
                          className={cn("h-5 w-5 rounded-full text-[9px] flex items-center justify-center transition-all",
                            s.motion === mt.id ? "bg-lavender-300 scale-110" : "hover:bg-lavender-100")}
                          title={mt.label}>{mt.emoji}</button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}

            {/* Canvas text rendering */}
            {canvasTexts.map((ct, i) => (
              <span key={i}
                className={cn("absolute pointer-events-none select-none drop-shadow-sm", ct.font === "script" ? "font-script" : "font-sans")}
                style={{ left: `${(ct.x / SIZE) * 100}%`, top: `${(ct.y / SIZE) * 100}%`, transform: "translate(-50%, -50%)", fontSize: ct.size, color: ct.color, fontWeight: "bold",
                  animation: ct.bouncy ? "floaty 2s ease-in-out infinite" : undefined }}>
                {ct.text}
              </span>
            ))}
            {text && (
              <span className="absolute top-3 left-1/2 w-full -translate-x-1/2 px-4 text-center text-lg font-bold text-ink-deep drop-shadow-sm">{text}</span>
            )}
          </div>
        </div>
      </div>

      {/* Clear & undo */}
      <div className="flex gap-2">
        <button type="button" onClick={() => { setStamps([]); setSelectedStamp(null); setText(""); setCanvasTexts([]); clearDoodles(); }}
          className="clay-btn-soft flex flex-1 items-center justify-center gap-2 rounded-2xl px-4 py-3 text-sm font-bold text-ink-deep">🗑️ Clear canvas</button>
        <button type="button" onClick={undoLast} disabled={!canUndo}
          className="clay-btn-soft flex flex-1 items-center justify-center gap-2 rounded-2xl px-4 py-3 text-sm font-bold text-ink-deep disabled:opacity-40">
          <RotateCcw className="size-4" /> Undo last stroke</button>
      </div>

      {/* Stamps */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        {GIFT_STAMPS.map((s) => (
          <button key={s} type="button" onClick={() => addStamp(s)}
            className="clay-chip flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-xl transition-transform hover:scale-110 active:scale-95">{s}</button>
        ))}
      </div>

      {/* Add / Update / Duplicate frame */}
      <div className="flex gap-2">
        <button type="button" onClick={addFrame}
          className="clay-btn-soft flex flex-1 items-center justify-center gap-2 rounded-2xl px-4 py-3.5 text-sm font-bold text-ink-deep">
          {editingFrameIdx !== null ? <><Save className="size-4" /> Update frame</> : <><Plus className="size-4" /> Add as frame</>}
        </button>
        <button type="button" onClick={() => { const img = composeFrame(); if (!img) return; setFrames((f) => [...f, { img }]); setEditingFrameIdx(null); toast("Frame duplicated"); }}
          className="clay-btn-soft flex items-center justify-center gap-1.5 rounded-2xl px-4 py-3.5 text-sm font-bold text-ink-deep">
          <Copy className="size-4" /> duplicate</button>
      </div>

      {/* Frames strip + GIF preview */}
      {frames.length > 0 && (
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold tracking-tight text-ink-deep">GIF preview · {frames.length} frame{frames.length > 1 ? "s" : ""}</h2>
            <div className="flex gap-1.5">
              <button type="button" onClick={() => setPlaying((p) => !p)}
                className="clay-btn flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-cream-soft">
                {playing ? <Pause className="size-3" /> : <Play className="size-3" />}
                {playing ? "Pause" : "Play"}</button>
              <button type="button" onClick={() => setMagicTouch((m) => !m)}
                className={cn("clay-chip flex items-center gap-1 rounded-full px-2.5 py-1.5 text-[10px] font-bold transition-all",
                  magicTouch ? "bg-lavender-300 text-ink-deep" : "text-ink-soft")}>✨ magic touch</button>
            </div>
          </div>
          <div className="flex gap-1.5">
            {GIF_SPEEDS.map((s) => (
              <button key={s.id} type="button" onClick={() => setGifSpeed(s.id)}
                className={cn("rounded-full px-2.5 py-1 text-[10px] font-bold transition-all",
                  gifSpeed === s.id ? "bg-[#5F6DBE] text-white shadow-md" : "clay-chip text-ink-soft")}>
                {s.emoji} {s.label}</button>
            ))}
          </div>
          <div className="clay-card p-2.5">
            <div className="relative aspect-square overflow-hidden rounded-[1.6rem]" style={{ boxShadow: "inset 0 2px 8px rgba(90,70,120,0.12)" }}>
              {magicTouch && <div className="absolute inset-0 z-10 pointer-events-none" style={{ background: "radial-gradient(circle, rgba(200,180,240,0.25) 0%, transparent 70%)" }} />}
              <motion.div key={playIdx} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3 }} className="h-full w-full">
                {renderFrame(frames[playIdx], `preview-${playIdx}`)}
              </motion.div>
              <span className="absolute top-2 right-2 rounded-full bg-ink-deep/60 px-2 py-0.5 text-[9px] font-bold text-cream-soft">frame {playIdx + 1}/{frames.length}</span>
            </div>
          </div>
          <div className="flex gap-2 overflow-x-auto pb-1">
            {frames.map((frame, i) => (
              <div key={i} className="relative shrink-0">
                <button type="button" onClick={() => loadFrameToCanvas(i)}
                  className={cn("block h-16 w-16 overflow-hidden rounded-2xl transition-transform",
                    editingFrameIdx === i && "ring-2 ring-lavender-400 ring-offset-2 ring-offset-cream",
                    playIdx === i && editingFrameIdx !== i && !playing && "ring-2 ring-mint-400 ring-offset-2 ring-offset-cream")}>
                  {renderFrame(frame, `thumb-${i}`)}
                </button>
                <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 rounded-full bg-white/90 px-1.5 py-0.5 text-[8px] font-bold text-ink-soft">{i + 1}</span>
                <button type="button" onClick={(e) => { e.stopPropagation(); removeFrame(i); }}
                  className="absolute -top-1.5 -right-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-blush-200 text-blush-500 transition-colors hover:bg-blush-300">
                  <Trash2 className="size-2.5" /></button>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Encouraging microcopy */}
      {frames.length > 0 && (
        <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center text-[11px] font-medium text-ink-soft italic">{encouragement}</motion.p>
      )}

      {/* Combine all frames into collage */}
      {frames.length >= 2 && (
        <button type="button" disabled={saving} onClick={async () => {
            setSaving(true);
            try {
              const arts = frames.map((f) => f.img);
              const collage = await combineIntoCollage(arts);
              if (collage) {
                createVaultItem({ kind: "photo", art: collage, bg: "tile-blush", caption: `a ${arts.length}-frame collage` });
                saveToGallery(collage, `venting-collage-${Date.now()}.png`);
                toast("Collage saved", { description: `${arts.length} frames combined into one framed photo.` });
              }
            } catch { toast("Couldn't combine frames", { description: "Please try again." }); }
            finally { setSaving(false); }
          }}
          className="clay-btn-soft flex w-full items-center justify-center gap-2 rounded-2xl px-5 py-3 text-sm font-bold text-ink-deep">
          <Grid2x2 className="size-4" /> combine all into one framed photo ({frames.length} frames)</button>
      )}

      {/* Save / Download / Share */}
      <div className="flex gap-2">
        <button type="button" onClick={save} disabled={saving}
          className="clay-btn flex flex-1 items-center justify-center gap-2 rounded-2xl px-4 py-3.5 text-sm font-bold text-cream-soft">
          {saving ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />} Save to vault</button>
        <button type="button" onClick={downloadGif}
          className="clay-btn-soft flex items-center justify-center gap-1.5 rounded-2xl px-4 py-3.5 text-sm font-bold text-ink-deep">
          <Download className="size-4" /> Save to gallery</button>
        <button type="button" onClick={shareGif}
          className="clay-btn-soft flex items-center justify-center gap-1.5 rounded-2xl px-4 py-3.5 text-sm font-bold text-ink-deep">
          <Share2 className="size-4" /> Share</button>
      </div>
      <p className="text-center text-[11px] font-semibold text-ink-soft">🎞️ mix photos, doodle on them, and make little looping feelings</p>
    </div>
  );
}
