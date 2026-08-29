import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useMemo, useRef, useState } from "react";
import MusicWidget from "@/components/MusicWidget";
import { WORRY_BUBBLES } from "@/lib/art";
import { music } from "@/lib/music";
import { useTapGuard } from "@/lib/useTapGuard";
import { soundsEnabled } from "@/lib/sound";
import { cn } from "@/lib/utils";

/* ─── Game registry — eight games, two per row ────────────────────── */

type GameId = "pop" | "breathe" | "dandelion" | "sand" | "star" | "shelf" | "moon" | "tiles";

const GAMES: {
  id: GameId;
  emoji: string;
  name: string;
  line: string;
  tile: string;
}[] = [
  { id: "pop", emoji: "🫧", name: "Bubble Pop", line: "gently pop floating worry bubbles", tile: "tile-blush" },
  { id: "breathe", emoji: "🫧", name: "Breath Bubble", line: "a soft bubble grows and shrinks, guiding slow breathing", tile: "tile-mint" },
  { id: "dandelion", emoji: "🌼", name: "Dandelion Wishes", line: "press & hold to blow seeds away and release worries", tile: "tile-mist" },
  { id: "sand", emoji: "🏖️", name: "Soft Sand Garden", line: "rake soft patterns in warm sand — no rules, just calm", tile: "tile-peach" },
  { id: "star", emoji: "⭐", name: "Star Trace", line: "trace slow glowing shapes to calm the mind", tile: "tile-mint" },
  { id: "shelf", emoji: "🧸", name: "Squishy Shelf", line: "pick a soft squishy, poke it, squish it, breathe", tile: "tile-lavender" },
  { id: "moon", emoji: "🌙", name: "Moonlight Glide", line: "glide through a dreamy sky and catch falling stars", tile: "tile-lavender" },
  { id: "tiles", emoji: "🎹", name: "Soft Tiles", line: "tap slow tiles, play a gentle melody", tile: "tile-blush" },
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
          {open === "breathe" && <BreathBubble />}
          {open === "dandelion" && <DandelionWishes />}
          {open === "sand" && <SoftSandGarden />}
          {open === "star" && <StarTrace />}
          {open === "shelf" && <SquishyShelf />}
          {open === "moon" && <MoonlightGlide />}
          {open === "tiles" && <SoftTiles />}
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

/* ─── 2. Breath Bubble ─────────────────────────────────────────────── */

const PHASES = [
  { label: "Inhale…", dur: 4, scale: 1.45 },
  { label: "Hold…", dur: 4, scale: 1.45 },
  { label: "Exhale…", dur: 6, scale: 0.8 },
];

function BreathBubble() {
  const [phaseIdx, setPhaseIdx] = useState(0);
  const phase = PHASES[phaseIdx];
  const [rounds, setRounds] = useState(0);

  useEffect(() => {
    const t = window.setTimeout(() => {
      setPhaseIdx((i) => {
        const next = (i + 1) % PHASES.length;
        if (next === 0) setRounds((r) => r + 1);
        return next;
      });
    }, phase.dur * 1000);
    return () => window.clearTimeout(t);
  }, [phaseIdx, phase.dur]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      className="clay-card relative overflow-hidden rounded-[2.25rem] px-6 py-12 text-center"
    >
      <div
        aria-hidden
        className="pointer-events-none absolute -top-16 -left-16 h-48 w-48 rounded-full bg-mint-100/70 blur-2xl"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -right-16 -bottom-16 h-48 w-48 rounded-full bg-mist-100/70 blur-2xl"
      />
      <span aria-hidden className="animate-floaty-slow absolute top-8 left-8 text-2xl opacity-70">
        ☁️
      </span>
      <span
        aria-hidden
        className="animate-floaty absolute top-16 right-10 text-xl opacity-60"
        style={{ animationDelay: "1.4s" }}
      >
        ☁️
      </span>
      <span aria-hidden className="animate-twinkle absolute bottom-14 left-10 text-sm text-mint-400">
        ✦
      </span>
      <span
        aria-hidden
        className="animate-twinkle absolute right-14 bottom-20 text-xs text-mist-400"
        style={{ animationDelay: "0.9s" }}
      >
        ✧
      </span>

      <GameIntro
        emoji="🫧"
        title="Breath Bubble"
        sub="The bubble grows as you breathe in, floats while you hold, and softens as you let go."
      />

      <motion.div
        animate={{ scale: phase.scale }}
        transition={{ duration: phase.dur, ease: "easeInOut" }}
        className="relative mx-auto mt-8 flex h-44 w-44 items-center justify-center rounded-full bg-gradient-to-b from-mint-200/80 to-mist-200/70 shadow-[inset_0_4px_10px_rgba(255,255,255,0.8),inset_0_-10px_18px_-10px_rgba(77,157,121,0.45),0_20px_40px_-16px_rgba(77,157,121,0.5)]"
      >
        <div
          className="absolute inset-4 rounded-full bg-gradient-to-b from-mint-100/90 to-mist-100/80"
          aria-hidden
        />
        <span className="relative animate-floaty text-5xl drop-shadow-sm" aria-hidden>
          🫧
        </span>
      </motion.div>

      <motion.p
        key={phase.label}
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        className="mt-8 text-2xl font-bold tracking-tight text-ink-deep"
      >
        {phase.label}
      </motion.p>
      <p className="mt-2 text-sm font-medium text-ink-soft">
        follow the bubble — in, hold, and let it all out
      </p>
      <p className="mt-3 text-sm font-bold text-ink">
        <span aria-hidden>🐻</span> your little bear is breathing along with you
      </p>
      <p className="mt-4 text-xs font-bold text-mint-500">
        {rounds} gentle round{rounds === 1 ? "" : "s"} done
      </p>
    </motion.div>
  );
}

/* ─── 3. Dandelion Wishes (press & hold to blow) ───────────────────── */

const DANDELION_TOTAL = 33;

/** Seed positions for a full, fluffy white seed head (three rings). */
function dandelionSeeds(): { x: number; y: number; size: number }[] {
  const seeds: { x: number; y: number; size: number }[] = [];
  const rings: { n: number; r: number; size: number; offset: number }[] = [
    { n: 7, r: 12, size: 5, offset: 0 },
    { n: 11, r: 24, size: 6, offset: 0.45 },
    { n: 15, r: 35, size: 7, offset: 0.2 },
  ];
  for (const ring of rings) {
    for (let i = 0; i < ring.n; i++) {
      const a = (Math.PI * 2 * i) / ring.n + ring.offset;
      seeds.push({
        x: 50 + Math.cos(a) * ring.r,
        y: 44 + Math.sin(a) * ring.r * 0.92,
        size: ring.size,
      });
    }
  }
  return seeds;
}

const DANDELION_SEEDS = dandelionSeeds();

/** A random peel order so the head thins from all around, never in a line. */
function shuffleSeeds(): number[] {
  const idx = Array.from({ length: DANDELION_TOTAL }, (_, i) => i);
  for (let i = idx.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [idx[i], idx[j]] = [idx[j], idx[i]];
  }
  return idx;
}

function DandelionWishes() {
  const order = useRef<number[]>(shuffleSeeds());
  const [remaining, setRemaining] = useState(DANDELION_TOTAL);
  const [gone, setGone] = useState<Set<number>>(new Set());
  const WORRY_WORDS = ["the noise", "tomorrow", "their tone", "that look", "the weight", "the waiting", "what if", "too much", "not enough", "the hurry", "the silence", "that word", "the ache", "the rush"];
  const worryIdx = useRef(0);
  const [flying, setFlying] = useState<
    { id: number; x: number; y: number; angle: number; dist: number; word?: string }[]
  >([]);
  const [holding, setHolding] = useState(false);
  const [empty, setEmpty] = useState(false);
  const nextIdx = useRef(0);
  const flyId = useRef(0);
  const timerRef = useRef<number | null>(null);

  const stop = () => {
    setHolding(false);
    if (timerRef.current) {
      window.clearInterval(timerRef.current);
      timerRef.current = null;
    }
  };

  /** One seed lets go and drifts away — the head visibly thins. */
  const releaseOne = () => {
    if (nextIdx.current >= DANDELION_TOTAL) {
      stop();
      return;
    }
    const seedIdx = order.current[nextIdx.current];
    nextIdx.current += 1;
    const seed = DANDELION_SEEDS[seedIdx];
    flyId.current += 1;
    const angle = Math.random() * Math.PI * 2;
    const word = WORRY_WORDS[worryIdx.current % WORRY_WORDS.length];
    worryIdx.current += 1;
    setGone((g) => new Set(g).add(seedIdx));
    setFlying((f) => [
      ...f.slice(-6),
      { id: flyId.current, x: seed.x, y: seed.y, angle, dist: 90 + Math.random() * 90, word },
    ]);
    const left = DANDELION_TOTAL - nextIdx.current;
    setRemaining(left);
    if (left <= 0) {
      setEmpty(true);
      stop();
    }
  };

  const start = () => {
    if (timerRef.current || empty) return;
    setHolding(true);
    releaseOne();
    timerRef.current = window.setInterval(releaseOne, 320);
  };

  useEffect(() => {
    return () => {
      if (timerRef.current) window.clearInterval(timerRef.current);
    };
  }, []);

  const regrow = () => {
    order.current = shuffleSeeds();
    nextIdx.current = 0;
    worryIdx.current = 0;
    setGone(new Set());
    setFlying([]);
    setRemaining(DANDELION_TOTAL);
    setEmpty(false);
    setHolding(false);
  };

  // the head starts full and visibly contracts as the fluff thins out
  const headScale = 0.82 + 0.18 * (remaining / DANDELION_TOTAL);

  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      className="clay-card relative overflow-hidden rounded-[2.25rem] px-6 py-12 text-center"
    >
      <div
        aria-hidden
        className="pointer-events-none absolute -top-14 -right-14 h-44 w-44 rounded-full bg-mist-100/70 blur-2xl"
      />

      <GameIntro
        emoji="🌼"
        title="Dandelion Wishes"
        sub="Press and hold the flower (or the button) to blow gently."
      />

      {/* The whole flower is pressable — hold anywhere on it to blow. */}
      <div
        role="button"
        tabIndex={0}
        aria-label="Press and hold the dandelion to blow its seeds"
        aria-pressed={holding}
        onPointerDown={(e) => {
          e.preventDefault();
          start();
        }}
        onPointerUp={stop}
        onPointerLeave={stop}
        onPointerCancel={stop}
        className="relative mx-auto mt-6 h-64 w-64 cursor-pointer touch-none select-none"
      >
        {/* fluffy seed head — scales down as seeds let go */}
        <div
          className="absolute inset-0 transition-transform duration-500"
          style={{ transform: `scale(${headScale})`, transformOrigin: "50% 44%" }}
          aria-hidden
        >
          {DANDELION_SEEDS.map((s, i) => {
            if (gone.has(i)) return null;
            return (
              <span
                key={i}
                className="absolute -translate-x-1/2 -translate-y-1/2"
                style={{ left: `${s.x}%`, top: `${s.y}%` }}
              >
                <span
                  className="block rounded-full bg-[#F6C878] shadow-[0_1px_3px_rgba(200,160,60,0.4),inset_0_-1px_2px_rgba(230,190,100,0.6)]"
                  style={{ width: s.size * 1.6, height: s.size * 1.6 }}
                />
              </span>
            );
          })}

          {/* seeds floating off while you hold */}
          {flying.map((f) => (
            <motion.span
              key={f.id}
              initial={{ x: 0, y: 0, opacity: 1, scale: 0.7 }}
              animate={{
                x: Math.cos(f.angle) * f.dist,
                y: Math.sin(f.angle) * f.dist - 34,
                opacity: 0,
                scale: 1,
                rotate: f.angle * 2.5,
              }}
              transition={{ duration: 1.5, ease: "easeOut" }}
              className="absolute"
              style={{ left: `${f.x}%`, top: `${f.y}%` }}
            >
              <span
                className="block rounded-full bg-[#F6C878] shadow-[0_1px_3px_rgba(200,160,60,0.4)]"
                style={{ width: 9, height: 9 }}
              />
              {/* worry word fading with the seed */}
              {f.word && (
                <motion.span
                  initial={{ opacity: 0.9, y: 0 }}
                  animate={{ opacity: 0, y: -20 }}
                  transition={{ duration: 1.2, ease: "easeOut" }}
                  className="absolute -top-4 left-1/2 -translate-x-1/2 whitespace-nowrap text-[9px] font-bold text-ink-soft/60 italic"
                >
                  {f.word}
                </motion.span>
              )}
            </motion.span>
          ))}

          {/* the little receptacle at the heart of the head */}
          <span
            className="absolute h-3.5 w-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-gradient-to-b from-amber-200 to-amber-300 shadow-sm"
            style={{ left: "50%", top: "44%" }}
          />
        </div>

        {/* stem + tiny leaves */}
        <div
          className="absolute top-[52%] left-1/2 h-[42%] w-1.5 -translate-x-1/2 rounded-full bg-gradient-to-b from-mint-200 to-mint-300"
          aria-hidden
        />
        <div
          className="absolute top-[62%] left-[34%] h-6 w-3 -rotate-[24deg] rounded-full bg-mint-200"
          aria-hidden
        />
        <div
          className="absolute top-[70%] left-[62%] h-6 w-3 rotate-[24deg] rounded-full bg-mint-200"
          aria-hidden
        />

        {/* a fresh little sprout once every seed is gone */}
        {empty && (
          <motion.span
            initial={{ scale: 0.6, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="absolute top-[40%] left-1/2 -translate-x-1/2 -translate-y-1/2 text-4xl drop-shadow-sm"
            aria-hidden
          >
            🌱
          </motion.span>
        )}
      </div>

      {empty ? (
        <div className="mt-5">
          {/* shooting star sparkle */}
          <motion.div
            initial={{ opacity: 0, scale: 0 }}
            animate={{ opacity: [0, 1, 0], scale: [0.5, 1.2, 0.8], rotate: [0, 15, -10] }}
            transition={{ duration: 1.8, ease: "easeOut" }}
            className="mx-auto mb-2 w-fit text-3xl"
            aria-hidden
          >
            ✨
          </motion.div>
          <motion.p
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="text-sm leading-relaxed font-bold text-ink-deep"
          >
            the dandelion is light now — your worries went with the wind 🌬️
          </motion.p>
        </div>
      ) : (
        <p className="mt-5 text-sm font-bold text-mint-500">
          {remaining} seed{remaining === 1 ? "" : "s"} still holding on
        </p>
      )}

      {empty ? (
        <button
          type="button"
          onClick={regrow}
          className="clay-btn-soft mt-4 rounded-full px-6 py-3 text-sm font-bold text-ink-deep"
        >
          🌱 grow another dandelion
        </button>
      ) : (
        <>
          <button
            type="button"
            onPointerDown={(e) => {
              e.preventDefault();
              start();
            }}
            onPointerUp={stop}
            onPointerLeave={stop}
            onPointerCancel={stop}
            className={cn(
              "mt-4 inline-flex touch-none items-center gap-2 rounded-full px-7 py-3 text-sm font-bold text-ink-deep select-none transition-transform",
              holding ? "clay-btn-blush scale-95" : "clay-btn-blush",
            )}
          >
            {holding ? "whoosh… keep blowing gently" : "🌬️ press & hold to blow"}
          </button>
          <p className="mt-2 text-xs font-medium text-ink-soft">
            hold as long as you need — no rush, no score
          </p>
        </>
      )}
    </motion.div>
  );
}

/* ─── 4. Moonlight Glide ─────────────────────────────────────────── */

const SKY_COLORS = [
  { top: "#b8d4f0", mid: "#d4bfaa", bot: "#e8c898" },   // dawn blue → sunset
  { top: "#2a3a6e", mid: "#3d4a8a", bot: "#5a6ab0" },   // night
  { top: "#6a8ab8", mid: "#a8c8e0", bot: "#d4e8f0" },   // bright day
  { top: "#3a4a78", mid: "#5a6a98", bot: "#8a9ac0" },   // twilight
];

function MoonlightGlide() {
  const [lane, setLane] = useState<0 | 1 | 2>(1);
  const [items, setItems] = useState<
    { id: number; lane: 0 | 1 | 2; y: number; emoji: string }[]
  >([]);
  const [caught, setCaught] = useState(0);
  const [missed, setMissed] = useState(0);
  const [ended, setEnded] = useState(false);
  const [skyIdx, setSkyIdx] = useState(0);
  const [sparkles, setSparkles] = useState<
    { id: number; lane: 0 | 1 | 2; y: number }[]
  >([]);
  const nextId = useRef(0);
  const sparkleId = useRef(0);
  const MAX_MISSES = 5;

  // Cycle sky colors slowly
  useEffect(() => {
    const t = window.setInterval(() => {
      setSkyIdx((i) => (i + 1) % SKY_COLORS.length);
    }, 6000);
    return () => window.clearInterval(t);
  }, []);

  // Spawn falling items
  useEffect(() => {
    if (ended) return;
    const t = window.setInterval(() => {
      const lanes: (0 | 1 | 2)[] = [0, 1, 2];
      const emojis = ["⭐", "💛", "🏮"];
      nextId.current += 1;
      setItems((prev) => [
        ...prev,
        {
          id: nextId.current,
          lane: lanes[Math.floor(Math.random() * 3)],
          y: 0,
          emoji: emojis[Math.floor(Math.random() * 3)],
        },
      ]);
    }, 1700);
    return () => window.clearInterval(t);
  }, [ended]);

  // Move items downward + track misses
  useEffect(() => {
    if (ended) return;
    const t = window.setInterval(() => {
      setItems((prev) => {
        const updated = prev
          .map((item) => ({ ...item, y: item.y + 1.8 }));

        // Items that fell off screen are missed
        const offScreen = updated.filter((item) => item.y >= 100);
        const stillOnScreen = updated.filter((item) => item.y < 100);
        if (offScreen.length > 0) {
          setMissed((m) => {
            const next = m + offScreen.length;
            if (next >= MAX_MISSES) setEnded(true);
            return next;
          });
        }

        // Check catches
        const caughtItems: typeof stillOnScreen = [];
        const remaining: typeof stillOnScreen = [];
        for (const item of stillOnScreen) {
          if (item.lane === lane && item.y >= 72 && item.y <= 88) {
            caughtItems.push(item);
          } else {
            remaining.push(item);
          }
        }
        if (caughtItems.length > 0) {
          setCaught((c) => c + caughtItems.length);
          for (const ci of caughtItems) {
            sparkleId.current += 1;
            setSparkles((sp) => [
              ...sp.slice(-8),
              { id: sparkleId.current, lane: ci.lane, y: ci.y },
            ]);
          }
        }
        return remaining;
      });
    }, 50);
    return () => window.clearInterval(t);
  }, [lane, ended]);

  // Clean up old sparkles
  useEffect(() => {
    const t = window.setInterval(() => {
      setSparkles((sp) => sp.filter((_, i) => i > sp.length - 6));
    }, 1500);
    return () => window.clearInterval(t);
  }, []);

  const sky = SKY_COLORS[skyIdx];
  const laneX = ["16.6%", "50%", "83.4%"];

  const reset = useTapGuard(() => {
    setItems([]);
    setCaught(0);
    setMissed(0);
    setSparkles([]);
    setEnded(false);
    setLane(1);
  }, 400);

  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      className="clay-card relative overflow-hidden rounded-[2.25rem] px-5 py-7 text-center"
    >
      <GameIntro
        emoji="🌙"
        title="Moonlight Glide"
        sub={ended ? "the stars are resting now 🌙" : "glide through a dreamy sky and catch falling stars."}
      />

      {/* soft end screen */}
      {ended ? (
        <div className="mt-8 space-y-4">
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: "spring", stiffness: 200, damping: 16 }}
            className="mx-auto w-fit text-6xl"
          >
            🌙
          </motion.div>
          <motion.p
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="text-sm font-bold text-ink-deep"
          >
            you caught ⭐ {caught} star{caught === 1 ? "" : "s"} in the dreamy sky
          </motion.p>
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
            className="text-xs text-ink-soft"
          >
            the moon will shine again whenever you&apos;re ready
          </motion.p>
          <motion.button
            type="button"
            onClick={reset}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
            className="clay-btn rounded-full px-6 py-3 text-sm font-bold text-white"
          >
            🌙 glide again
          </motion.button>
        </div>
      ) : (
      <>
      {/* sky area */}
      <div
        className="relative mx-auto mt-5 h-80 w-full max-w-sm overflow-hidden rounded-3xl"
        style={{
          background: `linear-gradient(180deg, ${sky.top} 0%, ${sky.mid} 50%, ${sky.bot} 100%)`,
          transition: "background 4s ease",
        }}
      >
        {/* stars in night sky */}
        {skyIdx === 1 && (
          <div className="pointer-events-none absolute inset-0">
            {Array.from({ length: 12 }).map((_, i) => (
              <span
                key={i}
                className="absolute animate-twinkle text-xs text-white/60"
                style={{
                  left: `${8 + (i * 7.5) % 90}%`,
                  top: `${5 + (i * 13) % 60}%`,
                  animationDelay: `${i * 0.3}s`,
                }}
                aria-hidden
              >
                ✦
              </span>
            ))}
          </div>
        )}

        {/* lane indicators (subtle) */}
        <div className="pointer-events-none absolute inset-x-0 top-0 bottom-0 flex">
          {[0, 1, 2].map((l) => (
            <div key={l} className="flex-1 border-r border-white/10 last:border-r-0" />
          ))}
        </div>

        {/* falling items */}
        {items.map((item) => (
          <motion.span
            key={item.id}
            initial={{ opacity: 1 }}
            animate={{ opacity: item.y > 85 ? 0 : 1 }}
            transition={{ duration: 0.4 }}
            className="absolute -translate-x-1/2 -translate-y-1/2 text-2xl"
            style={{ left: laneX[item.lane], top: `${item.y}%` }}
            aria-hidden
          >
            {item.emoji}
          </motion.span>
        ))}

        {/* sparkle effects on catch */}
        {sparkles.map((s) => (
          <motion.span
            key={s.id}
            initial={{ scale: 0.5, opacity: 1 }}
            animate={{ scale: 2, opacity: 0 }}
            transition={{ duration: 0.6, ease: "easeOut" }}
            className="absolute -translate-x-1/2 -translate-y-1/2 text-lg text-[#FDF5E6]"
            style={{ left: laneX[s.lane], top: `${s.y}%` }}
            aria-hidden
          >
            ✨
          </motion.span>
        ))}

        {/* bear character */}
        <motion.div
          animate={{ left: laneX[lane] }}
          transition={{ type: "spring", stiffness: 300, damping: 25 }}
          className="absolute bottom-6 -translate-x-1/2 text-4xl drop-shadow-md"
          style={{ left: laneX[lane] }}
        >
          🧸
        </motion.div>

        {/* tap zones */}
        <div className="absolute inset-0 flex">
          <button
            type="button"
            onClick={() => setLane(0)}
            className="flex-1 opacity-0"
            aria-label="Move left"
          />
          <button
            type="button"
            onClick={() => setLane(1)}
            className="flex-1 opacity-0"
            aria-label="Move center"
          />
          <button
            type="button"
            onClick={() => setLane(2)}
            className="flex-1 opacity-0"
            aria-label="Move right"
          />
        </div>
      </div>

      <p className="mt-4 text-sm font-bold text-ink-deep">
        ⭐ {caught} caught · 💫 {missed} of {MAX_MISSES} stars missed
      </p>
      <p className="mt-1 text-xs font-medium text-ink-soft">
        tap left, center, or right to move the bear
      </p>
    </>
    )}
  </motion.div>
  );
}

/* ─── 5. Soft Tiles ──────────────────────────────────────────────── */

const TILE_NOTES = [262, 294, 330, 392]; // C4, D4, E4, G4
const TILE_COLORS = [
  "bg-blush-200",
  "bg-lavender-200",
  "bg-mint-200",
  "bg-peach-200",
];

function playTileNote(freq: number) {
  try {
    const ctx = new AudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.value = freq;
    gain.gain.value = 0.3;
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.35);
  } catch {
    /* audio not available */
  }
}

interface Tile {
  id: number;
  col: number;
  y: number;
  color: string;
  freq: number;
}

function SoftTiles() {
  const [tiles, setTiles] = useState<Tile[]>([]);
  const [played, setPlayed] = useState(0);
  const [missed, setMissed] = useState(0);
  const [ended, setEnded] = useState(false);
  const [hue, setHue] = useState(0);
  const nextId = useRef(0);
  const enabled = soundsEnabled();
  const MAX_MISSES = 5;

  // Slowly shift background hue
  useEffect(() => {
    const t = window.setInterval(() => {
      setHue((h) => (h + 1) % 360);
    }, 83); // 360 * 83ms ≈ 30s full cycle
    return () => window.clearInterval(t);
  }, []);

  // Spawn tiles
  useEffect(() => {
    if (ended) return;
    const t = window.setInterval(() => {
      const col = Math.floor(Math.random() * 4);
      nextId.current += 1;
      setTiles((prev) => [
        ...prev,
        {
          id: nextId.current,
          col,
          y: -5,
          color: TILE_COLORS[col],
          freq: TILE_NOTES[col],
        },
      ]);
    }, 1200);
    return () => window.clearInterval(t);
  }, [ended]);

  // Move tiles down + track misses
  useEffect(() => {
    if (ended) return;
    const t = window.setInterval(() => {
      setTiles((prev) => {
        const moved = prev.map((tile) => ({ ...tile, y: tile.y + 0.625 }));
        const offScreen = moved.filter((tile) => tile.y >= 105);
        const visible = moved.filter((tile) => tile.y < 105);
        if (offScreen.length > 0) {
          setMissed((m) => {
            const next = m + offScreen.length;
            if (next >= MAX_MISSES) setEnded(true);
            return next;
          });
        }
        return visible;
      });
    }, 50);
    return () => window.clearInterval(t);
  }, [ended]);

  const tapTile = (tile: Tile) => {
    if (ended) return;
    if (enabled) playTileNote(tile.freq);
    setTiles((prev) => prev.filter((t) => t.id !== tile.id));
    setPlayed((p) => p + 1);
  };

  const reset = useTapGuard(() => {
    setTiles([]);
    setPlayed(0);
    setMissed(0);
    setEnded(false);
  }, 400);

  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      className="clay-card relative overflow-hidden rounded-[2.25rem] px-5 py-7 text-center"
    >
      <GameIntro
        emoji="🎹"
        title="Soft Tiles"
        sub={ended ? "the melody has paused 🎵" : "tap slow tiles, play a gentle melody."}
      />

      {/* soft end screen */}
      {ended ? (
        <div className="mt-8 space-y-4">
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: "spring", stiffness: 200, damping: 16 }}
            className="mx-auto w-fit text-6xl"
          >
            🎵
          </motion.div>
          <motion.p
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="text-sm font-bold text-ink-deep"
          >
            you played 🎵 {played} note{played === 1 ? "" : "s"} softly
          </motion.p>
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
            className="text-xs text-ink-soft"
          >
            the melody will come back whenever you want
          </motion.p>
          <motion.button
            type="button"
            onClick={reset}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
            className="clay-btn rounded-full px-6 py-3 text-sm font-bold text-white"
          >
            🎵 play again
          </motion.button>
        </div>
      ) : (
      <>
      {/* tile area with hue-rotate */}
      <div
        className="relative mx-auto mt-5 h-80 w-full max-w-sm overflow-hidden rounded-3xl"
        style={{ filter: `hue-rotate(${hue}deg)`, transition: "filter 0.1s" }}
      >
        <div className="absolute inset-0 bg-gradient-to-b from-[#EDEBF6] to-[#FDF5E6]" />

        {/* four columns */}
        <div className="relative flex h-full gap-1 p-1">
          {[0, 1, 2, 3].map((col) => (
            <div
              key={col}
              className="relative flex-1 rounded-2xl border border-white/40 bg-white/20"
            >
              {/* column label */}
              <span className="absolute bottom-2 left-1/2 -translate-x-1/2 text-lg opacity-20">
                {["♪", "♫", "♩", "♬"][col]}
              </span>
            </div>
          ))}
        </div>

        {/* falling tiles (absolute positioned) */}
        {tiles.map((tile) => (
          <button
            key={tile.id}
            type="button"
            onClick={() => tapTile(tile)}
            className={cn(
              "absolute left-0 right-0 mx-auto h-14 w-[calc(25%-4px)] rounded-2xl shadow-md transition-transform hover:scale-105 active:scale-95",
              tile.color,
            )}
            style={{
              top: `${tile.y}%`,
              marginLeft: `${tile.col * 25 + 1}%`,
            }}
          >
            <span className="text-2xl drop-shadow-sm">{["🎹", "🎵", "🎶", "🎹"][tile.col]}</span>
          </button>
        ))}
      </div>

      <p className="mt-4 text-sm font-bold text-ink-deep">
        🎵 {played} notes played · 🍃 {missed} of {MAX_MISSES} tiles missed
      </p>
      <p className="mt-1 text-xs font-medium text-ink-soft">
        tap tiles before they fade — the melody is gentle
      </p>
    </>
    )}
  </motion.div>
  );
}

/* ─── 5. Soft Sand Garden ─────────────────────────────────────────── */

const SAND_MESSAGES = [
  "no rules here — just you and the sand.",
  "let the rake follow wherever it wants.",
  "soft patterns, soft thoughts.",
  "the sand doesn't judge your lines.",
  "breathe in. breathe out. keep raking.",
];

function SoftSandGarden() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const drawing = useRef(false);
  const lastPos = useRef({ x: 0, y: 0 });
  const msgIdx = useRef(0);
  const [message, setMessage] = useState(SAND_MESSAGES[0]);
  const [pebbles, setPebbles] = useState<{ x: number; y: number }[]>([]);
  const [sprouts, setSprouts] = useState<{ x: number; y: number }[]>([]);
  const sandColor = useRef("#e8d5b8");

  // draw warm sand base
  const drawSand = (ctx: CanvasRenderingContext2D, w: number, h: number) => {
    // sand gradient
    const g = ctx.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, "#f0dfc4");
    g.addColorStop(0.5, "#e8d5b8");
    g.addColorStop(1, "#dcc8a8");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
    // subtle grain dots
    for (let i = 0; i < 300; i++) {
      const x = Math.random() * w;
      const y = Math.random() * h;
      const r = Math.random() * 1.2 + 0.3;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(180,155,120,${Math.random() * 0.15 + 0.05})`;
      ctx.fill();
    }
    // rake shadow lines
    for (let y = 20; y < h; y += 28) {
      ctx.beginPath();
      ctx.moveTo(0, y + Math.sin(y * 0.1) * 3);
      ctx.lineTo(w, y + Math.sin(y * 0.1 + 2) * 3);
      ctx.strokeStyle = "rgba(180,155,120,0.12)";
      ctx.lineWidth = 1;
      ctx.stroke();
    }
  };

  // init canvas
  useEffect(() => {
    const c = canvasRef.current;
    if (!c) return;
    const parent = c.parentElement;
    if (!parent) return;
    const w = parent.clientWidth;
    const h = 280;
    c.width = w * 2;
    c.height = h * 2;
    c.style.width = `${w}px`;
    c.style.height = `${h}px`;
    const ctx = c.getContext("2d");
    if (!ctx) return;
    ctx.scale(2, 2);
    drawSand(ctx, w, h);
    sandColor.current = "#e8d5b8";
  }, []);

  const getPos = (e: React.PointerEvent) => {
    const c = canvasRef.current;
    if (!c) return { x: 0, y: 0 };
    const rect = c.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  };

  const rake = (x: number, y: number) => {
    const c = canvasRef.current;
    if (!c) return;
    const ctx = c.getContext("2d");
    if (!ctx) return;
    ctx.save();
    ctx.scale(2, 2);
    // dark rake line (groove)
    ctx.beginPath();
    ctx.moveTo(lastPos.current.x, lastPos.current.y);
    ctx.lineTo(x, y);
    ctx.strokeStyle = "rgba(140,120,90,0.4)";
    ctx.lineWidth = 6;
    ctx.lineCap = "round";
    ctx.stroke();
    // light ridge next to it
    ctx.beginPath();
    ctx.moveTo(lastPos.current.x + 2, lastPos.current.y + 2);
    ctx.lineTo(x + 2, y + 2);
    ctx.strokeStyle = "rgba(240,225,200,0.7)";
    ctx.lineWidth = 3;
    ctx.stroke();
    ctx.restore();
    lastPos.current = { x, y };
  };

  const onDown = (e: React.PointerEvent) => {
    drawing.current = true;
    lastPos.current = getPos(e);
    // cycle message
    msgIdx.current = (msgIdx.current + 1) % SAND_MESSAGES.length;
    setMessage(SAND_MESSAGES[msgIdx.current]);
  };
  const onMove = (e: React.PointerEvent) => {
    if (!drawing.current) return;
    const pos = getPos(e);
    rake(pos.x, pos.y);
  };
  const onUp = () => { drawing.current = false; };

  const smoothSand = useTapGuard(() => {
    const c = canvasRef.current;
    if (!c) return;
    const ctx = c.getContext("2d");
    if (!ctx) return;
    const w = c.width / 2;
    const h = c.height / 2;
    ctx.save();
    ctx.scale(2, 2);
    drawSand(ctx, w, h);
    ctx.restore();
    setPebbles([]);
    setSprouts([]);
  }, 300);

  const placePebble = useTapGuard(() => {
    const c = canvasRef.current;
    if (!c) return;
    const x = 30 + Math.random() * (c.width / 2 - 60);
    const y = 30 + Math.random() * (c.height / 2 - 60);
    setPebbles((p) => [...p, { x, y }]);
    // draw pebble on canvas
    const ctx = c.getContext("2d");
    if (!ctx) return;
    ctx.save();
    ctx.scale(2, 2);
    const g = ctx.createRadialGradient(x, y, 0, x, y, 8);
    g.addColorStop(0, "#b0a090");
    g.addColorStop(1, "#908070");
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.ellipse(x, y, 8, 6, Math.random() * 0.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "rgba(100,85,65,0.25)";
    ctx.lineWidth = 0.5;
    ctx.stroke();
    ctx.restore();
  }, 300);

  const plantSprout = useTapGuard(() => {
    const c = canvasRef.current;
    if (!c) return;
    const x = 30 + Math.random() * (c.width / 2 - 60);
    const y = 30 + Math.random() * (c.height / 2 - 60);
    setSprouts((s) => [...s, { x, y }]);
    const ctx = c.getContext("2d");
    if (!ctx) return;
    ctx.save();
    ctx.scale(2, 2);
    // stem
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.quadraticCurveTo(x - 3, y - 12, x - 1, y - 18);
    ctx.strokeStyle = "#7ab87a";
    ctx.lineWidth = 2;
    ctx.lineCap = "round";
    ctx.stroke();
    // leaves
    ctx.fillStyle = "#8cc08c";
    ctx.beginPath();
    ctx.ellipse(x - 4, y - 12, 4, 2.5, -0.4, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(x + 2, y - 14, 3.5, 2, 0.3, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }, 300);

  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      className="clay-card rounded-[2.25rem] px-5 py-7"
    >
      <GameIntro
        emoji="🏖️"
        title="Soft Sand Garden"
        sub="rake soft patterns in warm sand — no rules, just calm."
      />

      {/* sand tray */}
      <div className="relative mt-5 overflow-hidden rounded-2xl border-2 border-peach-200/50">
        <canvas
          ref={canvasRef}
          className="block w-full cursor-crosshair touch-none select-none"
          onPointerDown={onDown}
          onPointerMove={onMove}
          onPointerUp={onUp}
          onPointerLeave={onUp}
          onPointerCancel={onUp}
        />
      </div>

      {/* action buttons */}
      <div className="mt-5 flex items-center justify-center gap-3">
        <button
          type="button"
          onClick={placePebble}
          className="clay-chip rounded-full px-4 py-2 text-xs font-bold text-ink-deep transition-transform hover:scale-105 active:scale-95"
        >
          🪨 place a pebble
        </button>
        <button
          type="button"
          onClick={plantSprout}
          className="clay-chip rounded-full px-4 py-2 text-xs font-bold text-ink-deep transition-transform hover:scale-105 active:scale-95"
        >
          🌱 plant a sprout
        </button>
        <button
          type="button"
          onClick={smoothSand}
          className="clay-chip rounded-full px-4 py-2 text-xs font-bold text-ink-deep transition-transform hover:scale-105 active:scale-95"
        >
          ✨ smooth the sand
        </button>
      </div>

      <motion.p
        key={message}
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        className="mt-4 text-center text-sm font-bold text-lavender-500/80"
      >
        {message}
      </motion.p>

      <p className="mt-2 text-center text-xs font-semibold text-ink-soft">
        {pebbles.length + sprouts.length === 0
          ? "drag your finger to rake the sand"
          : `${pebbles.length} pebble${pebbles.length === 1 ? "" : "s"} · ${sprouts.length} sprout${sprouts.length === 1 ? "" : "s"} placed`}
      </p>
    </motion.div>
  );
}

/* ─── 6. Star Trace (many gentle shapes) ───────────────────────────── */

type TraceShapeId = "star" | "heart" | "spiral" | "circle" | "moon" | "flower" | "cloud";

const TRACE_SHAPES: {
  id: TraceShapeId;
  label: string;
  emoji: string;
  closed: boolean;
  done: string;
}[] = [
  { id: "star", label: "star", emoji: "⭐", closed: true, done: "a full, steady star — tracing it slowed your mind ✨" },
  { id: "heart", label: "heart", emoji: "🤍", closed: true, done: "a soft, whole heart — traced gently, held gently 🤍" },
  { id: "spiral", label: "spiral", emoji: "🌀", closed: false, done: "a calm spiral unwound — let it keep going inward ☁️" },
  { id: "circle", label: "circle", emoji: "🫧", closed: true, done: "a complete circle — round and whole, like you 🫧" },
  { id: "moon", label: "moon", emoji: "🌙", closed: true, done: "a gentle crescent — soft light to sit with 🌙" },
  { id: "flower", label: "flower", emoji: "🌸", closed: true, done: "a quiet flower, traced petal by petal 🌸" },
  { id: "cloud", label: "cloud", emoji: "☁️", closed: true, done: "a light cloud traced — let it drift away ☁️" },
];

/** Points (0–100 %) for each shape, in trace order. */
function tracePoints(id: TraceShapeId): { x: number; y: number }[] {
  switch (id) {
    case "star":
      return Array.from({ length: 10 }, (_, i) => {
        const angle = -Math.PI / 2 + (i * Math.PI) / 5;
        const r = i % 2 === 0 ? 42 : 17;
        return { x: 50 + Math.cos(angle) * r, y: 50 + Math.sin(angle) * r };
      });
    case "heart": {
      const pts: { x: number; y: number }[] = [];
      const N = 40;
      for (let i = 0; i <= N; i++) {
        const t = (i / N) * Math.PI * 2;
        const x = 16 * Math.pow(Math.sin(t), 3);
        const y =
          13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t);
        pts.push({ x: 50 + 2.5 * x, y: 100 - (57.5 + 2.5 * y) });
      }
      return pts;
    }
    case "spiral": {
      const pts: { x: number; y: number }[] = [];
      const N = 44;
      for (let i = 0; i < N; i++) {
        const t = (i / (N - 1)) * Math.PI * 2 * 1.75;
        const r = 5 + (36 * i) / (N - 1);
        const a = t - Math.PI / 2;
        pts.push({ x: 50 + Math.cos(a) * r, y: 50 + Math.sin(a) * r });
      }
      return pts;
    }
    case "circle":
      return Array.from({ length: 26 }, (_, i) => {
        const a = (i / 26) * Math.PI * 2;
        return { x: 50 + Math.cos(a) * 38, y: 50 + Math.sin(a) * 38 };
      });
    case "moon": {
      const pts: { x: number; y: number }[] = [];
      const N = 14;
      // crescent: outer arc (right) + inner arc sweeping through the left
      const outerTip = Math.atan2(20.5, 32);
      const innerTip = Math.atan2(20.5, 16);
      for (let i = 0; i <= N; i++) {
        const a = outerTip - (i / N) * 2 * outerTip;
        pts.push({ x: 50 + Math.cos(a) * 38, y: 50 + Math.sin(a) * 38 });
      }
      const sweep = Math.PI * 2 - 2 * innerTip;
      for (let i = 0; i <= N; i++) {
        const a = -innerTip - (i / N) * sweep;
        pts.push({ x: 66 + Math.cos(a) * 26, y: 50 + Math.sin(a) * 26 });
      }
      return pts;
    }
    case "flower": {
      const pts: { x: number; y: number }[] = [];
      const N = 48;
      for (let i = 0; i <= N; i++) {
        const t = (i / N) * Math.PI * 2;
        const r = 28 + 11 * Math.cos(6 * t);
        pts.push({ x: 50 + Math.cos(t) * r, y: 50 + Math.sin(t) * r });
      }
      return pts;
    }
    case "cloud": {
      // a soft puffy silhouette, traced clockwise around its bumps
      const raw: [number, number][] = [
        [34, 66], [26, 58], [28, 46], [36, 40],
        [44, 32], [54, 28], [64, 32], [72, 38],
        [78, 48], [74, 58], [66, 66], [50, 70],
      ];
      const pts: { x: number; y: number }[] = [];
      const steps = 5;
      for (let i = 0; i < raw.length; i++) {
        const a = raw[i];
        const b = raw[(i + 1) % raw.length];
        for (let s = 0; s < steps; s++) {
          const t = s / steps;
          const u = (1 - Math.cos(Math.PI * t)) / 2;
          pts.push({ x: a[0] + (b[0] - a[0]) * u, y: a[1] + (b[1] - a[1]) * u });
        }
      }
      return pts;
    }
  }
}

function StarTrace() {
  const [shapeId, setShapeId] = useState<TraceShapeId>(() => {
    const ids = TRACE_SHAPES;
    return ids[Math.floor(Math.random() * ids.length)].id;
  });
  const [lit, setLit] = useState<Set<number>>(new Set());
  const boxRef = useRef<HTMLDivElement | null>(null);

  const shape = TRACE_SHAPES.find((s) => s.id === shapeId) ?? TRACE_SHAPES[0];
  const points = useMemo(() => tracePoints(shapeId), [shapeId]);
  const complete = lit.size >= points.length;

  const touch = (clientX: number, clientY: number) => {
    const box = boxRef.current;
    if (!box || complete) return;
    const rect = box.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return;
    const px = ((clientX - rect.left) / rect.width) * 100;
    const py = ((clientY - rect.top) / rect.height) * 100;
    setLit((prev) => {
      let changed = false;
      const next = new Set(prev);
      points.forEach((p, i) => {
        if (!next.has(i) && Math.hypot(p.x - px, p.y - py) < 15) {
          next.add(i);
          changed = true;
        }
      });
      return changed ? next : prev;
    });
  };

  // every finish (or button tap) brings a DIFFERENT shape — never the same
  // one twice in a row
  const nextShape = useTapGuard(() => {
    let next = shapeId;
    while (next === shapeId) {
      const ids = TRACE_SHAPES;
      next = ids[Math.floor(Math.random() * ids.length)].id;
    }
    setShapeId(next);
    setLit(new Set());
  }, 400);

  const d =
    points.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ") +
    (shape.closed ? " Z" : "");

  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      className="clay-card relative overflow-hidden rounded-[2.25rem] px-5 py-7"
    >
      {/* soft floating sparkles */}
      <span className="pointer-events-none absolute top-8 left-10 text-sm text-lavender-200 animate-twinkle" aria-hidden>✦</span>
      <span className="pointer-events-none absolute top-14 right-8 text-xs text-mint-200 animate-twinkle" style={{ animationDelay: "1.2s" }} aria-hidden>✧</span>
      <span className="pointer-events-none absolute bottom-12 left-14 text-xs text-peach-200 animate-twinkle" style={{ animationDelay: "0.6s" }} aria-hidden>✦</span>

      <GameIntro
        emoji={shape.emoji}
        title="Star Trace"
        sub="Slowly trace the glowing shape with your finger — the light follows you."
      />

      <div
        ref={boxRef}
        onPointerMove={(e) => touch(e.clientX, e.clientY)}
        onPointerDown={(e) => touch(e.clientX, e.clientY)}
        className="relative mx-auto mt-6 h-72 w-full max-w-xs touch-none select-none"
      >
        {/* soft outline of the current shape */}
        <svg viewBox="0 0 100 100" className="absolute inset-0 h-full w-full" aria-hidden>
          <path
            d={d}
            fill={complete ? "rgba(255,214,150,0.25)" : "none"}
            stroke={complete ? "#f0b96a" : "#e2d5f5"}
            strokeWidth="1.5"
            strokeLinejoin="round"
            strokeLinecap="round"
            className="transition-all duration-700"
          />
        </svg>

        {points.map((p, i) => (
          <span
            key={i}
            className={cn(
              "absolute h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full transition-all duration-300",
              lit.has(i)
                ? "bg-mint-400 shadow-[0_0_14px_4px_rgba(77,157,121,0.55)]"
                : "bg-lavender-200",
            )}
            style={{ left: `${p.x}%`, top: `${p.y}%` }}
            aria-hidden
          />
        ))}

        {complete && (
          <motion.p
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="absolute inset-x-0 -bottom-1 px-2 text-center text-sm font-bold text-mint-500"
          >
            {shape.done}
          </motion.p>
        )}
      </div>

      <div className="mt-8 flex items-center justify-center">
        {complete ? (
          <button
            type="button"
            onClick={nextShape}
            className="clay-btn-soft rounded-full px-5 py-2.5 text-xs font-bold text-ink-deep"
          >
            trace another shape
          </button>
        ) : (
          <p className="text-xs font-semibold text-ink-soft">
            {points.length - lit.size} light{points.length - lit.size === 1 ? "" : "s"} to trace — go slowly
          </p>
        )}
      </div>
    </motion.div>
  );
}

/* ─── 7. Squishy Shelf (satisfying ASMR-style squishy toy shelf) ───── */

const SHELF_TOYS = [
  {
    id: "honeycomb",
    label: "Honeycomb",
    emoji: "🍯",
    color: "from-amber-200 via-amber-100 to-amber-200",
    shadow: "rgba(200,150,50,0.45)",
    hasCells: true,
  },
  {
    id: "bear",
    label: "Honey Bear",
    emoji: "🧸",
    color: "from-amber-100 via-peach-100 to-amber-200",
    shadow: "rgba(200,160,80,0.4)",
    hasCells: false,
  },
  {
    id: "bun",
    label: "Slow Bun",
    emoji: "🍞",
    color: "from-peach-100 via-cream to-peach-200",
    shadow: "rgba(200,140,100,0.4)",
    hasCells: false,
  },
  {
    id: "cloud",
    label: "Cloud",
    emoji: "☁️",
    color: "from-mist-100 via-white to-mist-200",
    shadow: "rgba(140,180,220,0.4)",
    hasCells: false,
  },
  {
    id: "catpaw",
    label: "Cat Paw",
    emoji: "🐾",
    color: "from-blush-100 via-blush-50 to-blush-200",
    shadow: "rgba(210,140,160,0.4)",
    hasCells: false,
  },
  {
    id: "star",
    label: "Star",
    emoji: "⭐",
    color: "from-peach-100 via-amber-50 to-peach-200",
    shadow: "rgba(220,180,80,0.4)",
    hasCells: false,
  },
] as const;

const SHELF_MESSAGES = [
  "squish the stress away…",
  "it always puffs back — just like you.",
  "no rush. squish as long as you need.",
  "soft and bouncy, just like a feeling passing through.",
  "every squish lets a little tension go.",
  "you're doing great — just breathe and squish.",
];

/** Soft squish sound via WebAudio. Respects global sound toggle. */
function shelfSquishSound(): void {
  if (!soundsEnabled()) return;
  try {
    const Ctor =
      window.AudioContext ??
      (window as unknown as { webkitAudioContext?: typeof AudioContext })
        .webkitAudioContext;
    if (!Ctor) return;
    const ctx = new Ctor();
    if (ctx.state === "suspended") void ctx.resume();
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    osc.type = "sine";
    osc.frequency.setValueAtTime(200, now);
    osc.frequency.exponentialRampToValueAtTime(55, now + 0.14);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.14, now);
    g.gain.exponentialRampToValueAtTime(0.001, now + 0.16);
    osc.connect(g);
    g.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.2);
  } catch {
    /* quiet */
  }
}

/** Tiny "thock" for honeycomb cell pop. */
function shelfPopSound(): void {
  if (!soundsEnabled()) return;
  try {
    const Ctor =
      window.AudioContext ??
      (window as unknown as { webkitAudioContext?: typeof AudioContext })
        .webkitAudioContext;
    if (!Ctor) return;
    const ctx = new Ctor();
    if (ctx.state === "suspended") void ctx.resume();
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    osc.type = "sine";
    osc.frequency.setValueAtTime(600, now);
    osc.frequency.exponentialRampToValueAtTime(120, now + 0.06);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.18, now);
    g.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
    osc.connect(g);
    g.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.1);
  } catch {
    /* quiet */
  }
}

function SquishyShelf() {
  const [selected, setSelected] = useState<string>(SHELF_TOYS[0].id);
  const toy = SHELF_TOYS.find((t) => t.id === selected) ?? SHELF_TOYS[0];

  // --- squish physics state ---
  const [squish, setSquish] = useState(0); // 0 = round, 1 = flat
  const [jiggle, setJiggle] = useState(0);
  const [pressing, setPressing] = useState(false);
  const pressTimer = useRef<number | null>(null);
  const dragRef = useRef({ lastX: 0, lastY: 0 });
  const jiggleTimer = useRef<number | null>(null);
  const msgIdx = useRef(0);
  const [message, setMessage] = useState(SHELF_MESSAGES[0]);
  const squishCount = useRef(0);

  // face state: eyes + blush
  const [eyesClosed, setEyesClosed] = useState(false);
  const [showBlush, setShowBlush] = useState(false);
  const [showHearts, setShowHearts] = useState(false);
  const heartTimer = useRef<number | null>(null);

  // tap particles (hearts & sparkles)
  const [particles, setParticles] = useState<
    { id: number; x: number; y: number; emoji: string }[]
  >([]);
  const particleId = useRef(0);

  // honeycomb cell state
  const totalCells = 19;
  const [poppedCells, setPoppedCells] = useState<Set<number>>(new Set());
  const allCellsPopped = poppedCells.size >= totalCells;

  // cleanup on unmount
  useEffect(() => {
    return () => {
      if (pressTimer.current) window.clearInterval(pressTimer.current);
      if (jiggleTimer.current) window.clearInterval(jiggleTimer.current);
      if (heartTimer.current) window.clearTimeout(heartTimer.current);
    };
  }, []);

  // jiggle decay
  useEffect(() => {
    if (jiggle !== 0) {
      jiggleTimer.current = window.setInterval(() => {
        setJiggle((j) => {
          const next = j * 0.85;
          if (Math.abs(next) < 0.3) {
            if (jiggleTimer.current) window.clearInterval(jiggleTimer.current);
            return 0;
          }
          return next;
        });
      }, 40);
    }
    return () => {
      if (jiggleTimer.current) window.clearInterval(jiggleTimer.current);
    };
  }, [jiggle !== 0]); // eslint-disable-line react-hooks/exhaustive-deps

  // --- pointer handlers ---
  const handleDown = (e: React.PointerEvent) => {
    e.preventDefault();
    setPressing(true);
    setEyesClosed(true);
    setShowBlush(true);
    shelfSquishSound();
    try {
      if (typeof navigator !== "undefined" && "vibrate" in navigator) {
        (navigator as { vibrate: (ms: number) => void }).vibrate(10);
      }
    } catch {
      /* ignore */
    }
    // slow squeeze
    pressTimer.current = window.setInterval(() => {
      setSquish((s) => Math.min(1, s + 0.025));
    }, 25);
    dragRef.current = { lastX: e.clientX, lastY: e.clientY };
  };

  const handleMove = (e: React.PointerEvent) => {
    if (!pressing) return;
    const dx = e.clientX - dragRef.current.lastX;
    const dy = e.clientY - dragRef.current.lastY;
    const dist = Math.hypot(dx, dy);
    if (dist > 2) {
      setJiggle(Math.min(12, Math.max(-12, dx * 0.6)));
      dragRef.current = { lastX: e.clientX, lastY: e.clientY };
    }
  };

  const handleUp = () => {
    if (!pressing) return;
    setPressing(false);
    if (pressTimer.current) {
      window.clearInterval(pressTimer.current);
      pressTimer.current = null;
    }
    // slow-rise puff back with happy blink
    setSquish(0);
    heartTimer.current = window.setTimeout(() => {
      setEyesClosed(false);
      setShowBlush(false);
      setShowHearts(true);
      window.setTimeout(() => setShowHearts(false), 800);
    }, 400);
    // count for messages
    squishCount.current += 1;
    if (squishCount.current % 3 === 0) {
      msgIdx.current = (msgIdx.current + 1) % SHELF_MESSAGES.length;
      setMessage(SHELF_MESSAGES[msgIdx.current]);
    }
  };

  // quick poke (tap) — wobble + boing + particles
  const handleTap = () => {
    if (pressing) return;
    shelfSquishSound();
    setSquish(0.25);
    setJiggle(6);
    setEyesClosed(true);
    setShowBlush(true);
    // spawn heart/sparkle particles
    const emojis = ["💖", "✨", "💜", "⭐"];
    const newParticles = Array.from({ length: 3 }, (_, i) => ({
      id: particleId.current++,
      x: -20 + Math.random() * 40,
      y: -30 - Math.random() * 30,
      emoji: emojis[i % emojis.length],
    }));
    setParticles((p) => [...p.slice(-8), ...newParticles]);
    window.setTimeout(() => {
      setParticles((p) => p.filter((pt) => !newParticles.some((np) => np.id === pt.id)));
    }, 1000);
    setTimeout(() => {
      setSquish(0);
      setEyesClosed(false);
      setShowBlush(false);
    }, 180);
    squishCount.current += 1;
    if (squishCount.current % 3 === 0) {
      msgIdx.current = (msgIdx.current + 1) % SHELF_MESSAGES.length;
      setMessage(SHELF_MESSAGES[msgIdx.current]);
    }
  };

  // honeycomb cell pop
  const popCell = (idx: number) => {
    if (poppedCells.has(idx)) return;
    setPoppedCells((prev) => new Set(prev).add(idx));
    shelfPopSound();
    try {
      if (typeof navigator !== "undefined" && "vibrate" in navigator) {
        (navigator as { vibrate: (ms: number) => void }).vibrate(8);
      }
    } catch {
      /* ignore */
    }
  };

  const refillCells = () => setPoppedCells(new Set());

  // visual deformation
  const scaleX = 1 + squish * 0.32;
  const scaleY = 1 - squish * 0.28;
  const jiggleAngle = jiggle;

  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      className="clay-card relative overflow-hidden rounded-[2.25rem] px-5 py-7 text-center"
    >
      <GameIntro
        emoji="🧸"
        title="Squishy Shelf"
        sub="Pick a soft squishy, poke it, squish it, breathe."
      />

      {/* ─── shelf row ─────────────────────────────────────── */}
      <div className="mt-5 flex items-center justify-center gap-2 overflow-x-auto pb-2">
        {SHELF_TOYS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => {
              setSelected(t.id);
              setSquish(0);
              setJiggle(0);
              setPoppedCells(new Set());
            }}
            className={cn(
              "flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-2xl text-2xl transition-all duration-200",
              t.id === selected
                ? "scale-110 bg-white/80 shadow-[0_4px_14px_rgba(0,0,0,0.1)] ring-2 ring-lavender-300"
                : "bg-white/40 hover:bg-white/60",
            )}
          >
            <span aria-hidden>{t.emoji}</span>
          </button>
        ))}
      </div>

      {/* ─── play area ────────────────────────────────────── */}
      <div className="relative mx-auto mt-4 flex h-72 items-center justify-center">
        {/* soft shadow under toy */}
        <div
          className="absolute bottom-6 left-1/2 -translate-x-1/2 rounded-full bg-ink/5 blur-xl transition-all duration-300"
          style={{
            width: pressing ? 160 : 100,
            height: pressing ? 24 : 14,
          }}
          aria-hidden
        />

        {/* the toy body */}
        <div
          role="button"
          tabIndex={0}
          aria-label={`${toy.label} squishy toy — press and hold to squish`}
          onPointerDown={handleDown}
          onPointerMove={handleMove}
          onPointerUp={handleUp}
          onPointerLeave={handleUp}
          onPointerCancel={handleUp}
          onClick={handleTap}
          className="relative cursor-pointer touch-none select-none"
          style={{
            transform: `scaleX(${scaleX}) scaleY(${scaleY}) rotate(${jiggleAngle}deg)`,
            transition: pressing
              ? "transform 0.06s ease-out"
              : "transform 0.7s cubic-bezier(0.34, 1.56, 0.64, 1)",
          }}
        >
          <div
            className={cn(
              "relative flex h-44 w-44 items-center justify-center rounded-full bg-gradient-to-br",
              toy.color,
            )}
            style={{
              boxShadow: `inset 0 4px 14px rgba(255,255,255,0.85), inset 0 -8px 20px -6px ${toy.shadow}, 0 20px 40px -12px ${toy.shadow}`,
            }}
          >
            {/* toy-specific content */}
            {toy.hasCells ? (
              <div className="absolute inset-4 grid grid-cols-5 grid-rows-5 place-items-center">
                {Array.from({ length: totalCells }).map((_, i) => {
                  const row = Math.floor(i / 5);
                  const col = i % 5;
                  if (
                    (row === 0 && (col === 0 || col === 4)) ||
                    (row === 4 && (col === 0 || col === 4))
                  )
                    return <span key={i} />;
                  const isPopped = poppedCells.has(i);
                  return (
                    <button
                      key={i}
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        popCell(i);
                      }}
                      className={cn(
                        "flex h-7 w-7 items-center justify-center rounded-md transition-all duration-200",
                        isPopped
                          ? "scale-50 bg-amber-300/20 opacity-30"
                          : "bg-amber-200/60 hover:bg-amber-300/70 active:scale-90",
                      )}
                      aria-label={isPopped ? "cell popped" : "pop this cell"}
                    >
                      <span className="text-[8px]" aria-hidden>
                        {isPopped ? "·" : "⬡"}
                      </span>
                    </button>
                  );
                })}
              </div>
            ) : (
              <span className="relative z-10 text-6xl drop-shadow-sm" aria-hidden>
                {toy.emoji}
              </span>
            )}

            {/* face overlay — eyes + blush */}
            {!toy.hasCells && (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="absolute top-[38%] flex gap-5">
                  {eyesClosed ? (
                    <>
                      <span className="block h-0.5 w-3 rounded-full bg-ink/30" />
                      <span className="block h-0.5 w-3 rounded-full bg-ink/30" />
                    </>
                  ) : (
                    <>
                      <span className="block h-2.5 w-2.5 rounded-full bg-ink/40" />
                      <span className="block h-2.5 w-2.5 rounded-full bg-ink/40" />
                    </>
                  )}
                </div>
                {showBlush && (
                  <>
                    <span className="absolute top-[50%] left-[22%] h-3 w-4 rounded-full bg-blush-200/60" />
                    <span className="absolute top-[50%] right-[22%] h-3 w-4 rounded-full bg-blush-200/60" />
                  </>
                )}
                {showHearts && (
                  <motion.span
                    initial={{ opacity: 0, y: 0, scale: 0.5 }}
                    animate={{ opacity: [0, 1, 0], y: -20, scale: 1 }}
                    transition={{ duration: 0.8 }}
                    className="absolute -top-2 text-xl"
                    aria-hidden
                  >
                    💖
                  </motion.span>
                )}
              </div>
            )}
          </div>
        </div>

        {/* floating particles (tap hearts/sparkles) */}
        {particles.map((p) => (
          <motion.span
            key={p.id}
            initial={{ opacity: 1, x: 0, y: 0, scale: 0.6 }}
            animate={{ opacity: 0, x: p.x, y: p.y, scale: 1.2 }}
            transition={{ duration: 0.9, ease: "easeOut" }}
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-lg pointer-events-none"
            aria-hidden
          >
            {p.emoji}
          </motion.span>
        ))}
      </div>

      {/* honeycomb refill button */}
      {toy.hasCells && allCellsPopped && (
        <motion.button
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            refillCells();
          }}
          className="mx-auto mt-2 rounded-full bg-amber-100/80 px-4 py-2 text-xs font-bold text-amber-700 transition-transform hover:scale-105 active:scale-95"
        >
          🍯 refill cells
        </motion.button>
      )}

      {/* rotating gentle messages */}
      <motion.p
        key={message}
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        className="mt-3 text-sm font-bold text-lavender-500/80"
      >
        {message}
      </motion.p>

      <p className="mt-2 text-xs font-semibold text-ink-soft">
        {toy.hasCells
          ? allCellsPopped
            ? "all cells popped — refill to play again"
            : `tap the hexagons to pop them — ${totalCells - poppedCells.size} left`
          : "press & hold to squish — drag to jiggle — tap to poke"}
      </p>
    </motion.div>
  );
}
