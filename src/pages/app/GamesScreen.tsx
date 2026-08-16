import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useMemo, useRef, useState } from "react";
import MusicWidget from "@/components/MusicWidget";
import { WORRY_BUBBLES } from "@/lib/art";
import { music } from "@/lib/music";
import { useTapGuard } from "@/lib/useTapGuard";
import { cn } from "@/lib/utils";

/* ─── Game registry — exactly six games, two per row ───────────────── */

type GameId = "pop" | "breathe" | "dandelion" | "buddy" | "jars" | "star";

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
  { id: "buddy", emoji: "🧸", name: "Comfort the Buddy", line: "a shaky little buddy calms with gentle taps and hugs", tile: "tile-lavender" },
  { id: "jars", emoji: "🫙", name: "Feelings Jars", line: "sort floating feelings into soft colored jars", tile: "tile-peach" },
  { id: "star", emoji: "⭐", name: "Star Trace", line: "trace slow glowing shapes to calm the mind", tile: "tile-mint" },
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
          {open === "buddy" && <ComfortBuddy />}
          {open === "jars" && <FeelingsJars />}
          {open === "star" && <StarTrace />}
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

          <div className="grid grid-cols-2 gap-3">
            {GAMES.map((g, i) => (
              <motion.button
                key={g.id}
                type="button"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: i * 0.05 }}
                onClick={() => openGame(g.id)}
                className="clay-card group flex h-full flex-col items-center gap-2 rounded-[1.8rem] px-4 py-5 text-center transition-transform hover:-translate-y-0.5"
              >
            <span
              className={cn(
                "flex h-12 w-12 items-center justify-center rounded-2xl text-2xl transition-transform group-hover:scale-110",
                g.tile,
              )}
            >
              <span aria-hidden className="drop-shadow-sm">
                {g.emoji}
              </span>
            </span>
            <span className="text-sm font-bold tracking-tight text-ink-deep">
              {g.name}
            </span>
            <span className="text-[11px] leading-snug font-medium text-ink-soft">
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
      className="clay-card rounded-[2.25rem] px-5 py-7"
    >
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
  const [flying, setFlying] = useState<
    { id: number; x: number; y: number; angle: number; dist: number }[]
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
    setGone((g) => new Set(g).add(seedIdx));
    setFlying((f) => [
      ...f.slice(-6),
      { id: flyId.current, x: seed.x, y: seed.y, angle, dist: 90 + Math.random() * 90 },
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
                  className="block rounded-full bg-white shadow-[0_1px_3px_rgba(122,150,180,0.5),inset_0_-1px_2px_rgba(160,185,205,0.55)]"
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
                className="block rounded-full bg-white shadow-[0_1px_3px_rgba(122,150,180,0.5)]"
                style={{ width: 9, height: 9 }}
              />
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
        <motion.p
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-5 text-sm leading-relaxed font-bold text-ink-deep"
        >
          the dandelion is light now — your worries went with the wind.
        </motion.p>
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

/* ─── 4. Comfort the Buddy ─────────────────────────────────────────── */

function ComfortBuddy() {
  const [comfort, setComfort] = useState(0);
  const calm = comfort >= 5;

  const tap = useTapGuard(() => {
    if (!calm) setComfort((c) => Math.min(5, c + 1));
  }, 380);
  const hug = useTapGuard(() => {
    if (!calm) setComfort((c) => Math.min(5, c + 2));
  }, 480);
  const reset = useTapGuard(() => setComfort(0), 400);

  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      className="clay-card rounded-[2.25rem] px-6 py-10 text-center"
    >
      <GameIntro
        emoji="🧸"
        title="Comfort the Buddy"
        sub={calm ? "The buddy feels safe now. 🤍" : "The buddy is a little shaky — gentle taps and hugs help them settle."}
      />

      <div className="relative mx-auto mt-8 flex h-52 items-center justify-center">
        <motion.span
          animate={
            calm
              ? { x: 0, rotate: 0, scale: [1, 1.06, 1] }
              : { x: [0, -6, 6, -4, 4, 0], rotate: [0, -2, 2, -1, 1, 0] }
          }
          transition={calm ? { duration: 1.6, repeat: Infinity, ease: "easeInOut" } : { duration: 0.45, repeat: Infinity }}
          className="text-8xl drop-shadow-md select-none"
          aria-hidden
        >
          {calm ? "🧸" : "🐻"}
        </motion.span>
        {calm &&
          ["💗", "✨", "💛"].map((h, i) => (
            <motion.span
              key={i}
              initial={{ opacity: 0, y: 10, scale: 0 }}
              animate={{ opacity: [0, 1, 0], y: -30 - i * 10, scale: 1 }}
              transition={{ duration: 2.4, repeat: Infinity, delay: i * 0.5, ease: "easeOut" }}
              className="absolute text-2xl"
              aria-hidden
            >
              {h}
            </motion.span>
          ))}
      </div>

      {/* gentle progress — never a score */}
      <div className="mt-4 flex items-center justify-center gap-2">
        {[0, 1, 2, 3, 4].map((i) => (
          <span
            key={i}
            className={cn(
              "h-2.5 rounded-full transition-all duration-500",
              i < comfort ? "w-5 bg-lavender-400" : "w-2.5 bg-lavender-200",
            )}
          />
        ))}
      </div>
      <p className="mt-2 text-xs font-semibold text-ink-soft">
        {calm ? "fully at ease" : "feeling a little steadier, slowly"}
      </p>

      <div className="mt-6 flex items-center justify-center gap-3">
        <button
          type="button"
          onClick={tap}
          disabled={calm}
          className="clay-btn rounded-full px-6 py-3 text-sm font-bold text-ink-deep disabled:opacity-50"
        >
          🤍 gentle tap
        </button>
        <button
          type="button"
          onClick={hug}
          disabled={calm}
          className="clay-btn-blush rounded-full px-6 py-3 text-sm font-bold text-ink-deep disabled:opacity-50"
        >
          🫂 a hug
        </button>
      </div>

      {calm && (
        <button
          type="button"
          onClick={reset}
          className="mt-5 rounded-full px-4 py-2 text-xs font-bold text-ink-soft underline-offset-4 hover:text-ink-deep hover:underline"
        >
          start again with a new shaky friend
        </button>
      )}
    </motion.div>
  );
}

/* ─── 5. Feelings Jars ─────────────────────────────────────────────── */

const JARS = [
  { id: "sad", label: "Sad", bg: "bg-sky-100" },
  { id: "angry", label: "Angry", bg: "bg-blush-100" },
  { id: "happy", label: "Happy", bg: "bg-peach-100" },
  { id: "tired", label: "Tired", bg: "bg-lavender-100" },
];

const FLOATERS = [
  { id: "f1", emoji: "😢", jar: "sad" },
  { id: "f2", emoji: "😠", jar: "angry" },
  { id: "f3", emoji: "😊", jar: "happy" },
  { id: "f4", emoji: "😴", jar: "tired" },
  { id: "f5", emoji: "🥺", jar: "sad" },
  { id: "f6", emoji: "😤", jar: "angry" },
];

function FeelingsJars() {
  const [placed, setPlaced] = useState<Record<string, boolean>>({});
  const allDone = FLOATERS.every((f) => placed[f.id]);

  const reset = useTapGuard(() => setPlaced({}), 400);

  const place = (id: string) => {
    setPlaced((prev) => (prev[id] ? prev : { ...prev, [id]: true }));
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      className="clay-card rounded-[2.25rem] px-5 py-7"
    >
      <GameIntro
        emoji="🫙"
        title="Feelings Jars"
        sub="Tap a floating feeling and it drifts into its own soft jar. No rush — they're all welcome here."
      />

      {/* floating feelings */}
      <div className="mt-6 flex min-h-24 flex-wrap items-center justify-center gap-4">
        {FLOATERS.map((f, i) =>
          placed[f.id] ? null : (
            <motion.button
              key={f.id}
              type="button"
              initial={{ opacity: 0, scale: 0.6 }}
              animate={{ y: [0, -7, 0], opacity: 1, scale: 1 }}
              exit={{ scale: 0, opacity: 0, y: 14 }}
              transition={{ y: { duration: 2.8 + i * 0.4, repeat: Infinity, ease: "easeInOut" }, scale: { type: "spring", stiffness: 240, damping: 16 } }}
              onClick={() => place(f.id)}
              whileHover={{ scale: 1.15 }}
              whileTap={{ scale: 0.92 }}
              className="clay-chip flex h-14 w-14 items-center justify-center rounded-full text-3xl"
              aria-label={`Tuck ${f.emoji} into a jar`}
            >
              <span aria-hidden className="drop-shadow-sm">
                {f.emoji}
              </span>
            </motion.button>
          ),
        )}
        {allDone && (
          <motion.p
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-sm font-bold text-mint-500"
          >
            all your feelings are tucked in 💗
          </motion.p>
        )}
      </div>

      {/* the jars */}
      <div className="mt-6 grid grid-cols-4 gap-2">
        {JARS.map((jar) => {
          const contents = FLOATERS.filter((f) => f.jar === jar.id && placed[f.id]);
          return (
            <div key={jar.id} className="flex flex-col items-center gap-1.5">
              <div
                className={cn(
                  "flex h-24 w-full flex-col items-center justify-start gap-1 overflow-hidden rounded-b-3xl rounded-t-lg border-2 border-ink-deep/10 px-1 pt-2",
                  jar.bg,
                )}
              >
                {contents.map((f) => (
                  <motion.span
                    key={f.id}
                    initial={{ scale: 0, y: -10 }}
                    animate={{ scale: 1, y: 0 }}
                    transition={{ type: "spring", stiffness: 260, damping: 14 }}
                    className="text-xl"
                    aria-hidden
                  >
                    {f.emoji}
                  </motion.span>
                ))}
              </div>
              <span className="text-[10px] font-bold text-ink-soft">{jar.label}</span>
            </div>
          );
        })}
      </div>

      <div className="mt-5 flex items-center justify-center">
        {allDone ? (
          <button
            type="button"
            onClick={reset}
            className="clay-btn-soft rounded-full px-5 py-2.5 text-xs font-bold text-ink-deep"
          >
            let them float again
          </button>
        ) : (
          <p className="text-xs font-semibold text-ink-soft">
            {FLOATERS.length - Object.keys(placed).length} feeling
            {FLOATERS.length - Object.keys(placed).length === 1 ? "" : "s"} still floating
          </p>
        )}
      </div>
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
      className="clay-card rounded-[2.25rem] px-5 py-7"
    >
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
