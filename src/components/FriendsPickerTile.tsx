import { useRef, useState } from "react";
import type { PointerEvent as ReactPointerEvent } from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import type { FloatingThing } from "@/pages/app/GamesScreen";

const THINGS: {
  id: FloatingThing;
  name: string;
  emoji: string;
  accent: string;
  motion: string;
}[] = [
  { id: "bubbles", name: "Bubbles", emoji: "🫧", accent: "#7FB8E8", motion: "float" },
  { id: "stars", name: "Stars", emoji: "⭐", accent: "#F0C050", motion: "drift" },
  { id: "clouds", name: "Clouds", emoji: "☁️", accent: "#D0E4F0", motion: "float" },
  { id: "petals", name: "Petals", emoji: "🌸", accent: "#F3B8C9", motion: "fall" },
  { id: "fireflies", name: "Fireflies", emoji: "✨", accent: "#F0C050", motion: "glow" },
  { id: "hearts", name: "Hearts", emoji: "💜", accent: "#C48B9E", motion: "float" },
  { id: "fish", name: "Fish", emoji: "🐟", accent: "#7FB8E8", motion: "swim" },
];

export function FriendsPickerTile({
  friends,
  setFriends,
  myDoodle,
  showDoodleCanvas,
  setShowDoodleCanvas,
  onDoodleChange,
}: {
  friends: FloatingThing[];
  setFriends: (f: FloatingThing[]) => void;
  myDoodle: string | undefined;
  showDoodleCanvas: boolean;
  setShowDoodleCanvas: (v: boolean) => void;
  onDoodleChange: (dataUrl: string | undefined) => void;
}) {
  const toggled = (t: FloatingThing) => {
    const prev = friends ?? [];
    if (prev.includes(t)) setFriends(prev.filter((x: FloatingThing) => x !== t));
    else if (prev.length < 3) setFriends([...prev, t]);
  };

  return (
    <div className="relative rounded-2xl bg-white/20 p-3">
      <div className="flex items-center gap-3 mb-2">
        <motion.span className="text-xl" animate={{ scale: [1, 1.1, 1] }} transition={{ duration: 1.4, repeat: Infinity }}>🫧</motion.span>
        <span className="text-sm font-bold text-ink-deep">Floating things — tap up to 3</span>
      </div>
      <div className="flex flex-wrap gap-2">
        {THINGS.map((t) => {
          const chosen = friends.includes(t.id);
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => toggled(t.id)}
              className={cn(
                "flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold transition-all",
                chosen
                  ? "bg-[var(--theme-accent, #5F6DBE)] text-white shadow-md"
                  : "bg-white/60 text-ink-deep hover:bg-white hover:scale-[1.02] active:scale-95",
              )}
            >
              <span className="text-base">{t.emoji}</span>
              <span className="text-[10px]">{t.name}</span>
            </button>
          );
        })}
      </div>

      {/* live little friend previews */}
      <div className="mt-3 flex flex-wrap gap-2">
        {friends.length === 0 ? (
          <span className="text-[11px] text-ink-soft">pick one to see it live ✨</span>
        ) : null}
        {friends.map((f) => (
          <div key={f} className="relative" style={{ width: 72, height: 72 }}>
            <FriendPreview emoji={f} />
          </div>
        ))}
        {myDoodle && (
          <div className="relative" style={{ width: 72, height: 72 }}>
            <img
              src={myDoodle}
              alt="your doodle"
              className="h-full w-full rounded-xl border border-white/60 shadow-sm object-cover"
            />
          </div>
        )}
      </div>

      {/* doodle inline */}
      <label className="mt-2 flex items-center gap-2 cursor-pointer rounded-full bg-white/70 px-3 py-1.5 text-[11px] font-bold text-ink-deep hover:bg-white hover:scale-[1.02]">
        ✏️ my doodle {myDoodle ? "✓" : ""}
        <input
          type="checkbox"
          checked={!!showDoodleCanvas}
          onChange={() => { setShowDoodleCanvas(!showDoodleCanvas); }}
          className="sr-only"
        />
      </label>
      {showDoodleCanvas && (
        <DoodleMicroCanvas
          value={myDoodle}
          onChange={onDoodleChange}
        />
      )}
    </div>
  );
}

function FriendPreview({ emoji }: { emoji: FloatingThing }) {
  const motionStyle: string =
    emoji === "bubbles" ? "float"
    : emoji === "stars" ? "drift"
    : emoji === "clouds" ? "float"
    : emoji === "petals" ? "fall"
    : emoji === "fireflies" ? "glow"
    : emoji === "hearts" ? "float"
    : "swim";

  if (motionStyle === "glow") {
    return (
      <motion.span
        className="absolute inset-0 flex items-center justify-center text-3xl"
        animate={{
          opacity: [0.3, 1, 0.3],
          scale: [0.6, 1.1, 0.6],
        }}
        transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut" }}
        aria-hidden
      >
        ✨
      </motion.span>
    );
  }
  if (motionStyle === "fall") {
    return (
      <motion.span
        className="absolute inset-0 flex items-center justify-center text-2xl opacity-70"
        animate={{ y: [0, 24, 0], rotate: [0, 40, 0] }}
        transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut" }}
        aria-hidden
      >
        🌸
      </motion.span>
    );
  }
  if (motionStyle === "swim") {
    return (
      <motion.span
        className="absolute inset-0 flex items-center justify-center text-2xl"
        animate={{ x: [-14, 14, -14] }}
        transition={{ duration: 3.2, repeat: Infinity, ease: "easeInOut" }}
        aria-hidden
      >
        🐟
      </motion.span>
    );
  }
  return (
    <motion.span
      className="absolute inset-0 flex items-center justify-center text-2xl opacity-60"
      animate={{ y: [0, -6, 0] }}
      transition={{ duration: 2.6, repeat: Infinity, ease: "easeInOut" }}
      aria-hidden
    >
      {emoji}
    </motion.span>
  );
}

export function DoodleMicroCanvas({
  onChange,
}: {
  value: string | undefined;
  onChange: (dataUrl: string | undefined) => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const drawing = useRef(false);
  const [color, setColor] = useState("#8f7bd4");

  const strokePos = (e: ReactPointerEvent<HTMLCanvasElement>) => {
    const c = canvasRef.current!;
    const r = c.getBoundingClientRect();
    return {
      x: ((e.clientX - r.left) / r.width) * c.width,
      y: ((e.clientY - r.top) / r.height) * c.height,
    };
  };

  return (
    <div className="clay-card mx-auto mt-2 rounded-xl overflow-hidden" style={{ width: 200 }}>
      <div className="flex items-center justify-between px-2 pt-2">
        <span className="text-[9px] text-ink-soft">pick a color</span>
        <div className="flex gap-1">
          {["#8f7bd4", "#e88aa5", "#7fb8e8", "#7fc4a4", "#f2b26b", "#5a5470"].map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setColor(c)}
              className={cn(
                "h-3.5 w-3.5 rounded-full border transition-transform hover:scale-110",
                color === c ? "border-ink-deep" : "border-white/60",
              )}
              style={{ background: c }}
              aria-label={`doodle color ${c}`}
            />
          ))}
        </div>
      </div>
      <canvas
        ref={canvasRef}
        width={184}
        height={72}
        className="mx-auto mt-1.5 block cursor-crosshair touch-none rounded-lg bg-white/80"
        onPointerDown={(e) => {
          drawing.current = true;
          const ctx = canvasRef.current!.getContext("2d")!;
          const p = strokePos(e);
          ctx.strokeStyle = color;
          ctx.lineWidth = 3;
          ctx.lineCap = "round";
          ctx.beginPath();
          ctx.moveTo(p.x, p.y);
        }}
        onPointerMove={(e) => {
          if (!drawing.current) return;
          const ctx = canvasRef.current!.getContext("2d")!;
          const p = strokePos(e);
          ctx.lineTo(p.x, p.y);
          ctx.stroke();
        }}
        onPointerUp={() => { drawing.current = false; }}
        onPointerLeave={() => { drawing.current = false; }}
      />
      <p className="text-[9px] text-ink-soft text-center mt-0.5">draw a little doodle for your game ✨</p>
      <div className="flex items-center justify-between px-2 pb-1.5">
        <button
          type="button"
          onClick={() => {
            const c = canvasRef.current!;
            c.getContext("2d")!.clearRect(0, 0, c.width, c.height);
            onChange(undefined);
          }}
          className="text-[9px] font-bold text-ink-soft hover:text-ink-deep"
        >
          clear
        </button>
        <button
          type="button"
          onClick={() => onChange(canvasRef.current!.toDataURL("image/png"))}
          className="text-[9px] font-bold text-[#C48B9E] hover:opacity-80"
        >
          save doodle ✓
        </button>
      </div>
    </div>
  );
}
