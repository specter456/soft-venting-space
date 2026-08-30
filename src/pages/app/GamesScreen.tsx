import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import MusicWidget from "@/components/MusicWidget";
import { WORRY_BUBBLES } from "@/lib/art";
import { music } from "@/lib/music";
import { useTapGuard } from "@/lib/useTapGuard";
import { cn } from "@/lib/utils";

/* ─── Game registry — six games, two per row ──────────────────────── */

type GameId = "pop" | "tiles" | "moon" | "honeycomb" | "nimbus" | "garden";

const GAMES: {
  id: GameId;
  emoji: string;
  name: string;
  line: string;
  tile: string;
}[] = [
  { id: "pop", emoji: "🫧", name: "Bubble Pop", line: "gently pop floating worry bubbles", tile: "tile-blush" },
  { id: "tiles", emoji: "🎹", name: "Soft Tiles", line: "tap slow tiles, play a gentle melody", tile: "tile-blush" },
  { id: "moon", emoji: "🌙", name: "Moonlight Glide", line: "glide through a dreamy sky and catch falling stars", tile: "tile-lavender" },
  { id: "honeycomb", emoji: "🍯", name: "Honeycomb Pop", line: "pop the honey cells — soft thocks, golden calm", tile: "tile-peach" },
  { id: "nimbus", emoji: "☁️", name: "Nimbus Friend", line: "a little cloud friend who loves your company", tile: "tile-mint" },
  { id: "garden", emoji: "🌱", name: "Memory Garden", line: "match the feelings, grow a little garden", tile: "tile-lavender" },
];

/**
 * Games — gentle emotional regulation, never competitive. No scores, no
 * timers, no winning or losing. Each game is a small safe room of its own.
 */
export default function GamesScreen() {
  const [open, setOpen] = useState<GameId | null>(null);

  // Leaving the Games section softly fades the music out and stops it.
  useEffect(() => {
    return () => {
      music.stop(1000);
    };
  }, []);

  // Opening a game is a user gesture, so the browser allows audio — the
  // gentle music starts softly (default on, low volume).
  const openGame = (id: GameId) => {
    setOpen(id);
    music.playDefault();
  };

  return (
    <div className="relative">
      <MusicWidget />

      {open ? (
        <div className="space-y-4">
          <button
            type="button"
            onClick={() => setOpen(null)}
            className="clay-chip rounded-full px-4 py-2 text-xs font-bold text-ink-deep transition-transform hover:scale-105 active:scale-95"
          >
            ← all games
          </button>
          {open === "pop" && <BubblePop />}
          {open === "tiles" && <SoftTiles />}
          {open === "moon" && <MoonlightGlide />}
          {open === "honeycomb" && <HoneycombPop />}
          {open === "nimbus" && <NimbusFriend />}
          {open === "garden" && <MemoryGarden />}
        </div>
      ) : (
        <div className="space-y-5">
          <div className="text-center">
            <p className="text-lg font-bold tracking-tight text-ink-deep">
              Games
            </p>
            <p className="mt-1 text-sm font-medium text-ink-soft">
              gentle places to land — no scores, no timers, no rush
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:gap-4">
            {GAMES.map((g, i) => (
              <motion.button
                key={g.id}
                type="button"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: i * 0.05 }}
                onClick={() => openGame(g.id)}
                className={cn(
                  "clay-card group flex flex-col items-center gap-2 rounded-[1.8rem] px-4 py-5 sm:py-6 text-center transition-transform hover:-translate-y-0.5",
                  i === GAMES.length - 1 ? "col-span-2 justify-self-center w-[calc(50%-0.375rem)]" : "h-full",
                )}
              >              <span
                className={cn(
                  "flex h-12 w-12 sm:h-14 sm:w-14 items-center justify-center rounded-2xl text-2xl sm:text-3xl transition-transform group-hover:scale-110",
                  g.tile,
                )}
            >
              <span aria-hidden className="drop-shadow-sm">
                {g.emoji}
              </span>
            </span>
            <span className="text-sm sm:text-base font-bold tracking-tight text-ink-deep">
              {g.name}
            </span>
            <span className="text-[11px] sm:text-xs leading-snug font-medium text-ink-soft">
              {g.line}
            </span>
          </motion.button>
          ))}
        </div>

        <p className="pt-1 text-center text-[11px] font-semibold text-ink-soft">
          🔒 private, calm, and all on this device
        </p>
      </div>
      )}
    </div>
  );
}

/* ─── shared ───────────────────────────────────────────────────────── */

function GameIntro({
  emoji,
  title,
  sub,
}: {
  emoji: string;
  title: string;
  sub: string;
}) {
  return (
    <div className="text-center">
      <p className="text-xl font-bold tracking-tight text-ink-deep">
        {emoji} {title}
      </p>
      <p className="mt-1 text-sm font-medium text-ink-soft">{sub}</p>
    </div>
  );
}

/* ─── 1. Bubble Pop ────────────────────────────────────────────────── */

function BubblePop() {
  const [worries, setWorries] = useState(
    () => WORRY_BUBBLES.map((w, i) => ({ id: i, text: w, popped: false })),
  );
  const popped = worries.filter((w) => w.popped).length;

  const reset = useTapGuard(() => {
    setWorries((prev) => prev.map((w) => ({ ...w, popped: false })));
  }, 400);

  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      className="clay-card relative overflow-hidden rounded-[2.25rem] px-5 py-7"
    >
      {/* soft floating sparkles */}
      <span className="pointer-events-none absolute top-6 left-8 text-sm text-blush-200 animate-twinkle" aria-hidden>✦</span>
      <span className="pointer-events-none absolute top-12 right-10 text-xs text-lavender-200 animate-twinkle" style={{ animationDelay: "0.8s" }} aria-hidden>✧</span>
      <span className="pointer-events-none absolute bottom-16 left-12 text-xs text-mint-200 animate-twinkle" style={{ animationDelay: "1.5s" }} aria-hidden>✦</span>
      <span className="pointer-events-none absolute bottom-10 right-14 text-sm text-peach-200 animate-twinkle" style={{ animationDelay: "2.2s" }} aria-hidden>✧</span>

      <GameIntro
        emoji="🫧"
        title="Bubble Pop"
        sub="Each bubble holds a worry — tap it and watch it burst. Lighter, not forgotten."
      />

      <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3">
        {worries.map((w) => (
          <AnimatePresence key={w.id}>
            {!w.popped ? (
              <motion.button
                type="button"
                exit={{ scale: 0, opacity: 0, rotate: 12 }}
                transition={{ duration: 0.3 }}
                onClick={() =>
                  setWorries((prev) => prev.map((x) => (x.id === w.id ? { ...x, popped: true } : x)))
                }
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.94 }}
                className="clay-chip flex h-24 items-center justify-center rounded-full p-4 text-center text-xs leading-snug font-bold text-ink"
              >
                {w.text}
              </motion.button>
            ) : (
              <motion.span
                key={`popped-${w.id}`}
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="flex h-24 items-center justify-center text-2xl"
                aria-hidden
              >
                💨
              </motion.span>
            )}
          </AnimatePresence>
        ))}
      </div>

      <div className="mt-6 flex items-center justify-between">
        <p className="text-sm font-bold text-mint-500">
          {popped}/{worries.length} worries floated away
        </p>
        <button
          type="button"
          onClick={reset}
          className="clay-btn-soft rounded-full px-4 py-2 text-xs font-bold text-ink-deep"
        >
          Fill them again
        </button>
      </div>
    </motion.div>
  );
}


/* ─── 2. Soft Tiles ───────────────────────────────────────────────── */

const TILE_NOTES = [262, 294, 330, 392];

let _tileAudioCtx: AudioContext | null = null;
function tileAudioCtx(): AudioContext {
  if (!_tileAudioCtx) _tileAudioCtx = new AudioContext();
  return _tileAudioCtx;
}

function playTileNote(freq: number) {
  try {
    const ctx = tileAudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(0.25, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.5);
  } catch { /* audio unavailable */ }
}

const TILE_COLORS = [
  "bg-[#E8B4C8]/80",
  "bg-[#B4BCE8]/80",
  "bg-[#B4E0D0]/80",
  "bg-[#E8D4B4]/80",
];

interface DriftTile {
  id: number;
  col: number;
  born: number;
}

function SoftTiles() {
  const [tiles, setTiles] = useState<DriftTile[]>([]);
  const [played, setPlayed] = useState(0);
  const nextId = useRef(0);
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setTiles((prev) => {
        if (prev.length > 8) return prev;
        return [...prev, { id: nextId.current++, col: Math.floor(Math.random() * 4), born: Date.now() }];
      });
    }, 1200);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const timer = setInterval(() => {
      const now = Date.now();
      setTiles((prev) => prev.filter((t) => now - t.born < 4200));
    }, 500);
    return () => clearInterval(timer);
  }, []);

  // Track elapsed time
  useEffect(() => {
    const timer = setInterval(() => setElapsed((e) => e + 1), 1000);
    return () => clearInterval(timer);
  }, []);

  const tapTile = (col: number) => {
    playTileNote(TILE_NOTES[col]);
    setPlayed((p) => p + 1);
  };

  return (
    <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }}
      className="clay-card relative overflow-hidden rounded-[2.25rem] px-5 py-7">
      <span className="pointer-events-none absolute top-6 left-8 text-sm text-blush-200 animate-twinkle" aria-hidden>✦</span>
      <span className="pointer-events-none absolute bottom-10 right-14 text-xs text-lavender-200 animate-twinkle" style={{ animationDelay: "1.2s" }} aria-hidden>✧</span>
      <GameIntro emoji="🎹" title="Soft Tiles" sub="tap tiles before they fade — every tap sounds like a soft piano note" />
      <div className="relative mt-6 grid grid-cols-4 gap-2 overflow-hidden rounded-2xl bg-[#FDF5E6]/50" style={{ height: 320, animation: "hueShift 30s linear infinite" }}>
        {Array.from({ length: 4 }).map((_, col) => (
          <div key={col} className="relative border-r border-[#C4CBE8]/20 last:border-r-0">
            <span className="absolute bottom-2 left-1/2 -translate-x-1/2 text-lg text-ink-soft/30">{["♪","♫","♩","♬"][col]}</span>
            {tiles.filter((t) => t.col === col).map((t) => {
              const pct = Math.min(((Date.now() - t.born) / 4000) * 100, 100);
              return (
                <button key={t.id} type="button" onClick={() => tapTile(col)}
                  className={cn("absolute left-1 right-1 h-14 rounded-xl transition-opacity", TILE_COLORS[col], pct > 85 ? "opacity-40" : "opacity-90")}
                  style={{ top: `${pct}%` }} />
              );
            })}
          </div>
        ))}
      </div>
      <p className="mt-4 text-center text-sm font-bold text-ink-deep">🎵 {played} notes played</p>
      <p className="mt-2 text-center text-xs font-medium text-ink-soft">{elapsed > 60 ? "the melody is gentle" : "tap the drifting tiles — every sound is a soft note"}</p>
    </motion.div>
  );
}

/* ─── 3. Moonlight Glide ──────────────────────────────────────────── */

type SkyPhase = "meadow" | "sunset" | "starry";
const SKY_GRADIENTS: Record<SkyPhase, string> = {
  meadow: "from-[#B8D4E8] via-[#C8E0D0] to-[#E0E8C8]",
  sunset: "from-[#E8C8A0] via-[#E0A888] to-[#D090B0]",
  starry: "from-[#283058] via-[#383868] to-[#484078]",
};

interface FallingItem { id: number; emoji: string; lane: number; y: number; }

function MoonlightGlide() {
  const [lane, setLane] = useState(1);
  const [items, setItems] = useState<FallingItem[]>([]);
  const [caught, setCaught] = useState(0);
  const [sky, setSky] = useState<SkyPhase>("meadow");
  const nextId = useRef(0);

  useEffect(() => {
    const phases: SkyPhase[] = ["meadow", "sunset", "starry"];
    let idx = 0;
    const timer = setInterval(() => { idx = (idx + 1) % phases.length; setSky(phases[idx]); }, 6000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const timer = setInterval(() => {
      const emojis = ["⭐", "💛", "🏮"];
      setItems((prev) => {
        if (prev.length > 6) return prev;
        return [...prev, { id: nextId.current++, emoji: emojis[Math.floor(Math.random() * emojis.length)], lane: Math.floor(Math.random() * 3), y: 0 }];
      });
    }, 1600);
    return () => clearInterval(timer);
  }, []);

  // Move items down and check catches in one pass
  useEffect(() => {
    const timer = setInterval(() => {
      setItems((prev) => {
        const updated = prev.map((it) => ({ ...it, y: it.y + 2.5 }));
        const caughtItems = updated.filter(
          (it) => it.lane === lane && it.y >= 70 && it.y <= 90,
        );
        if (caughtItems.length > 0) {
          setCaught((c) => c + caughtItems.length);
          return updated.filter(
            (it) => !caughtItems.some((c) => c.id === it.id) && it.y < 110,
          );
        }
        return updated.filter((it) => it.y < 110);
      });
    }, 80);
    return () => clearInterval(timer);
  }, [lane]);

  return (
    <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }}
      className="clay-card relative overflow-hidden rounded-[2.25rem] px-5 py-7">
      <GameIntro emoji="🌙" title="Moonlight Glide" sub="tap left or right to drift lanes — catch stars as they fall softly" />
      <div className={cn("relative mt-6 h-64 overflow-hidden rounded-2xl bg-gradient-to-b transition-all duration-[3000ms]", SKY_GRADIENTS[sky])}>
        {sky === "starry" && Array.from({ length: 12 }).map((_, i) => (
          <span key={i} className="absolute text-xs text-white/70 animate-twinkle" style={{ left: `${10 + (i * 17) % 80}%`, top: `${5 + (i * 13) % 50}%`, animationDelay: `${i * 0.3}s` }} aria-hidden>✦</span>
        ))}
        <button type="button" onClick={() => setLane((l) => Math.max(0, l - 1))} className="absolute inset-y-0 left-0 w-1/3 opacity-0" aria-label="Move left" />
        <button type="button" onClick={() => setLane((l) => Math.min(2, l + 1))} className="absolute inset-y-0 right-0 w-1/3 opacity-0" aria-label="Move right" />
        {items.map((it) => (
          <span key={it.id} className="absolute text-2xl transition-all duration-100" style={{ left: `${16.67 + it.lane * 33.33}%`, top: `${it.y}%`, transform: "translateX(-50%)" }}>{it.emoji}</span>
        ))}
        <div className="absolute bottom-4 text-4xl transition-all duration-300 ease-out" style={{ left: `${16.67 + lane * 33.33}%`, transform: "translateX(-50%)" }}>🧸</div>
      </div>
      <p className="mt-4 text-center text-sm font-bold text-ink-deep">⭐ {caught} caught</p>
      <p className="mt-2 text-center text-xs font-medium text-ink-soft">{sky === "meadow" ? "a gentle morning meadow" : sky === "sunset" ? "the sky is turning warm" : "the stars are out tonight"}</p>
    </motion.div>
  );
}

/* ─── 4. Honeycomb Pop ────────────────────────────────────────────── */

const HEX_COUNT = 15;
interface HexCell { id: number; popped: boolean; }

function HoneycombPop() {
  const [cells, setCells] = useState<HexCell[]>(() => Array.from({ length: HEX_COUNT }, (_, i) => ({ id: i, popped: false })));
  const [neighbors, setNeighbors] = useState<Set<number>>(new Set());
  const poppedCount = cells.filter((c) => c.popped).length;

  const popCell = (id: number) => {
    setCells((prev) => prev.map((c) => (c.id === id ? { ...c, popped: true } : c)));
    const adjacent = new Set<number>();
    if (id > 0) adjacent.add(id - 1);
    if (id < HEX_COUNT - 1) adjacent.add(id + 1);
    setNeighbors(adjacent);
    setTimeout(() => setNeighbors(new Set()), 300);
  };

  const refill = useTapGuard(() => {
    setCells((prev) => prev.map((c) => ({ ...c, popped: false })));
  }, 500);

  const allPopped = poppedCount === HEX_COUNT;

  return (
    <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }}
      className="clay-card relative overflow-hidden rounded-[2.25rem] px-5 py-7">
      <span className="pointer-events-none absolute top-6 right-10 text-sm text-peach-200 animate-twinkle" aria-hidden>✦</span>
      <span className="pointer-events-none absolute bottom-10 left-12 text-xs text-mint-200 animate-twinkle" style={{ animationDelay: "1s" }} aria-hidden>✧</span>
      <GameIntro emoji="🍯" title="Honeycomb Pop" sub="tap the honey cells — each one pops with a soft thock" />
      <div className="mt-6 grid grid-cols-5 gap-2 justify-items-center">
        {cells.map((cell) => (
          <motion.button key={cell.id} type="button"
            animate={neighbors.has(cell.id) ? { scale: [1, 0.92, 1.04, 1] } : { scale: 1 }}
            transition={{ duration: 0.3 }} disabled={cell.popped} onClick={() => popCell(cell.id)}
            className={cn("h-14 w-14 rounded-xl transition-all duration-200 flex items-center justify-center",
              cell.popped ? "bg-transparent" : "bg-gradient-to-br from-[#F0D080] to-[#D4A840] shadow-[inset_0_2px_4px_rgba(255,255,255,0.5),0_3px_8px_rgba(200,160,60,0.3)] hover:scale-105 active:scale-95 cursor-pointer")}>
            {cell.popped ? <motion.span initial={{ scale: 0, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="text-lg">💧</motion.span>
              : <span className="text-sm font-bold text-[#8B6820]">🍯</span>}
          </motion.button>
        ))}
      </div>
      <div className="mt-6 flex items-center justify-between">
        <p className="text-sm font-bold text-[#C4960A]">{poppedCount}/{HEX_COUNT} cells popped</p>
        {allPopped ? <button type="button" onClick={refill} className="clay-btn rounded-full px-4 py-2 text-xs font-bold text-white">pour a new comb 🍯</button>
          : <span className="text-xs font-medium text-ink-soft">tap each cell</span>}
      </div>
      {allPopped && <motion.p initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="mt-3 text-center text-sm font-bold text-[#C4960A]">all that honey tension is gone ✨</motion.p>}
    </motion.div>
  );
}

/* ─── 5. Nimbus Friend ────────────────────────────────────────────── */

function NimbusFriend() {
  const [mood, setMood] = useState<"idle" | "happy" | "boing" | "eat">("idle");
  const [blush, setBlush] = useState(false);
  const dragging = useRef(false);
  const moodTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const setMoodTemp = (m: "happy" | "boing" | "eat", dur = 1200) => {
    if (moodTimer.current) clearTimeout(moodTimer.current);
    setMood(m);
    moodTimer.current = setTimeout(() => setMood("idle"), dur);
  };

  const onPointerDown = () => { dragging.current = true; };
  const onPointerMove = () => { if (dragging.current) { setMood("happy"); setBlush(true); } };
  const onPointerUp = () => { dragging.current = false; setTimeout(() => setBlush(false), 800); };
  const onTap = () => { if (mood === "idle") setMoodTemp("boing"); };
  const feedStar = useTapGuard(() => { setMoodTemp("eat", 1500); }, 600);

  return (
    <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }}
      className="clay-card relative overflow-hidden rounded-[2.25rem] px-5 py-7">
      <span className="pointer-events-none absolute top-6 left-8 text-sm text-mint-200 animate-twinkle" aria-hidden>✦</span>
      <span className="pointer-events-none absolute bottom-10 right-10 text-xs text-lavender-200 animate-twinkle" style={{ animationDelay: "1.5s" }} aria-hidden>✧</span>
      <GameIntro emoji="☁️" title="Nimbus Friend" sub="drag over the cloud to pet it — it loves your company" />
      <div className="relative mx-auto mt-6 flex h-48 w-full max-w-xs items-center justify-center rounded-2xl bg-gradient-to-b from-[#D8E8F8] to-[#E8F0F8]"
        onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={onPointerUp} onPointerLeave={onPointerUp}>
        <motion.div animate={mood === "boing" ? { y: [0, -20, 0, -8, 0] } : mood === "eat" ? { scale: [1, 1.15, 1] } : { y: [0, -4, 0] }}
          transition={mood === "boing" ? { duration: 0.5, ease: "easeOut" } : { duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
          className="relative cursor-pointer select-none" onClick={onTap}>
          <div className="relative flex flex-col items-center">
            <div className="relative">
              <div className="h-24 w-36 rounded-full bg-white shadow-[0_8px_24px_rgba(180,200,220,0.4)]" />
              <div className="absolute -top-4 left-4 h-16 w-16 rounded-full bg-white" />
              <div className="absolute -top-6 left-12 h-14 w-14 rounded-full bg-white" />
              <div className="absolute -top-2 right-4 h-14 w-14 rounded-full bg-white" />
              <div className="absolute inset-0 flex items-center justify-center pt-2">
                {mood === "happy" ? (<><span className="absolute top-6 left-10 text-sm">~</span><span className="absolute top-6 right-10 text-sm">~</span></>)
                  : mood === "eat" ? (<><span className="absolute top-6 left-10 text-sm">🧡</span><span className="absolute top-6 right-10 text-sm">🧡</span></>)
                  : (<><span className="absolute top-6 left-10 h-1.5 w-1.5 rounded-full bg-[#5C5470]" /><span className="absolute top-6 right-10 h-1.5 w-1.5 rounded-full bg-[#5C5470]" /></>)}
                {blush && (<><span className="absolute top-9 left-6 h-3 w-5 rounded-full bg-[#E8B4C8]/60" /><span className="absolute top-9 right-6 h-3 w-5 rounded-full bg-[#E8B4C8]/60" /></>)}
                <span className="absolute top-10 left-1/2 -translate-x-1/2 text-sm">{mood === "eat" ? "😮" : mood === "boing" ? ":D" : "◡"}</span>
              </div>
            </div>
            {mood === "happy" && <motion.span initial={{ opacity: 0, y: 0 }} animate={{ opacity: 1, y: -20 }} className="absolute -top-8 text-lg">💜</motion.span>}
            {mood === "eat" && <motion.span initial={{ opacity: 0, y: 30, scale: 0.5 }} animate={{ opacity: 1, y: -10, scale: 1 }} className="absolute -top-4 text-2xl">⭐</motion.span>}
          </div>
        </motion.div>
      </div>
      <div className="mt-4 flex justify-center">
        <button type="button" onClick={feedStar} className="clay-chip rounded-full px-5 py-2.5 text-sm font-bold text-ink-deep transition-transform hover:scale-105 active:scale-95">feed a star ⭐</button>
      </div>
      <p className="mt-3 text-center text-xs font-medium text-ink-soft">drag over the cloud to pet it — it always loves your company</p>
    </motion.div>
  );
}

/* ─── 6. Memory Garden ────────────────────────────────────────────── */

const GARDEN_STICKERS = [
  { emoji: "❤️", label: "heart" },
  { emoji: "⭐", label: "star" },
  { emoji: "🐰", label: "bunny" },
  { emoji: "🌸", label: "flower" },
  { emoji: "☁️", label: "cloud" },
  { emoji: "🐻", label: "bear" },
];

interface Card { id: number; sticker: (typeof GARDEN_STICKERS)[number]; flipped: boolean; matched: boolean; }

function shuffleCards(): Card[] {
  const pairs = GARDEN_STICKERS.flatMap((s, i) => [
    { id: i * 2, sticker: s, flipped: false, matched: false },
    { id: i * 2 + 1, sticker: s, flipped: false, matched: false },
  ]);
  for (let i = pairs.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [pairs[i], pairs[j]] = [pairs[j], pairs[i]]; }
  return pairs;
}

function MemoryGarden() {
  const [cards, setCards] = useState<Card[]>(() => shuffleCards());
  const [selected, setSelected] = useState<number[]>([]);
  const [matched, setMatched] = useState(0);
  const lockRef = useRef(false);

  const selectCard = (id: number) => {
    if (lockRef.current) return;
    const card = cards.find((c) => c.id === id);
    if (!card || card.flipped || card.matched || selected.includes(id)) return;
    const next = [...selected, id];
    setSelected(next);
    setCards((prev) => prev.map((c) => (c.id === id ? { ...c, flipped: true } : c)));
    if (next.length === 2) {
      lockRef.current = true;
      const [first, second] = next;
      const a = cards.find((c) => c.id === first)!;
      const b = cards.find((c) => c.id === second)!;
      if (a.sticker.label === b.sticker.label) {
        setTimeout(() => {
          setCards((prev) => prev.map((c) => (c.id === first || c.id === second ? { ...c, matched: true, flipped: true } : c)));
          setMatched((m) => m + 1);
          setSelected([]);
          lockRef.current = false;
        }, 500);
      } else {
        setTimeout(() => {
          setCards((prev) => prev.map((c) => (c.id === first || c.id === second ? { ...c, flipped: false } : c)));
          setSelected([]);
          lockRef.current = false;
        }, 800);
      }
    }
  };

  const replant = useTapGuard(() => { setCards(shuffleCards()); setSelected([]); setMatched(0); }, 500);
  const allMatched = matched === GARDEN_STICKERS.length;

  return (
    <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }}
      className="clay-card relative overflow-hidden rounded-[2.25rem] px-5 py-7">
      <span className="pointer-events-none absolute top-6 left-8 text-sm text-mint-200 animate-twinkle" aria-hidden>✦</span>
      <span className="pointer-events-none absolute bottom-10 right-14 text-xs text-blush-200 animate-twinkle" style={{ animationDelay: "1s" }} aria-hidden>✧</span>
      <GameIntro emoji="🌱" title="Memory Garden" sub="flip two cards — when they match, they plant into your garden" />
      <div className="mt-6 grid grid-cols-4 gap-2">
        {cards.map((card) => (
          <motion.button key={card.id} type="button" onClick={() => selectCard(card.id)} disabled={card.matched}
            whileHover={!card.matched ? { scale: 1.05 } : undefined} whileTap={!card.matched ? { scale: 0.93 } : undefined}
            className={cn("aspect-square flex items-center justify-center rounded-xl text-2xl transition-all duration-200",
              card.matched ? "bg-[#B4E0D0]/60 shadow-inner" : card.flipped ? "bg-white/80 shadow-[0_2px_8px_rgba(180,200,220,0.3)]" : "bg-[#E8E0F0]/60 shadow-[0_2px_8px_rgba(180,180,220,0.2)] cursor-pointer hover:bg-[#E0D8EC]/80")}>
            {card.matched ? <motion.span initial={{ scale: 0, rotate: -30 }} animate={{ scale: 1, rotate: 0 }} className="text-xl">🌸</motion.span>
              : card.flipped ? <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", stiffness: 300, damping: 15 }}>{card.sticker.emoji}</motion.span>
              : <span className="text-lg opacity-40">🌱</span>}
          </motion.button>
        ))}
      </div>
      <div className="mt-4 flex items-center justify-center gap-2 rounded-xl bg-[#B4E0D0]/30 py-2">
        {GARDEN_STICKERS.map((s, i) => (
          <motion.span key={i} initial={false} animate={i < matched ? { scale: 1, opacity: 1, y: 0 } : { scale: 0.6, opacity: 0.2, y: 4 }} className="text-xl">🌸</motion.span>
        ))}
      </div>
      <div className="mt-4 flex items-center justify-between">
        <p className="text-sm font-bold text-mint-500">{matched}/{GARDEN_STICKERS.length} planted</p>
        {allMatched ? <button type="button" onClick={replant} className="clay-btn rounded-full px-4 py-2 text-xs font-bold text-white">plant again 🌱</button>
          : <span className="text-xs font-medium text-ink-soft">no rush — take your time</span>}
      </div>
      {allMatched && <motion.p initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="mt-3 text-center text-sm font-bold text-mint-500">your feeling garden is in bloom 🌸</motion.p>}
    </motion.div>
  );
}
