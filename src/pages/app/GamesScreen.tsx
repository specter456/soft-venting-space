import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import { WORRY_BUBBLES } from "@/lib/art";
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

  if (open) {
    return (
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
    );
  }

  return (
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
            onClick={() => setOpen(g.id)}
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

/* ─── 3. Dandelion Wishes (press & hold) ───────────────────────────── */

function DandelionWishes() {
  const [holding, setHolding] = useState(false);
  const [bursts, setBursts] = useState<number[]>([]);
  const [wishes, setWishes] = useState(0);
  const counter = useRef(0);
  const timerRef = useRef<number | null>(null);

  const spawn = () => {
    counter.current += 1;
    setBursts((b) => [...b.slice(-4), counter.current]);
    setWishes((w) => w + 1);
  };

  const start = () => {
    if (timerRef.current) return;
    setHolding(true);
    spawn();
    timerRef.current = window.setInterval(spawn, 480);
  };

  const stop = () => {
    setHolding(false);
    if (timerRef.current) {
      window.clearInterval(timerRef.current);
      timerRef.current = null;
    }
  };

  useEffect(() => {
    return () => {
      if (timerRef.current) window.clearInterval(timerRef.current);
    };
  }, []);

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
        sub="Press and hold to blow the seeds away — each one carries a little weight with it."
      />

      <div className="relative mx-auto mt-8 flex h-56 items-center justify-center">
        <motion.span
          animate={holding ? { scale: [1, 0.9, 1], rotate: [0, -5, 3, 0] } : { y: [0, -6, 0] }}
          transition={holding ? { duration: 0.9 } : { duration: 3.4, repeat: Infinity, ease: "easeInOut" }}
          className="text-7xl drop-shadow-md select-none"
          aria-hidden
        >
          🌼
        </motion.span>
        <AnimatePresence>
          {bursts.map((b) => (
            <SeedBurst key={b} />
          ))}
        </AnimatePresence>
      </div>

      <button
        type="button"
        onPointerDown={start}
        onPointerUp={stop}
        onPointerLeave={stop}
        onPointerCancel={stop}
        className={cn(
          "mt-4 inline-flex touch-none items-center gap-2 rounded-full px-7 py-3 text-sm font-bold text-ink-deep select-none",
          holding ? "clay-btn-blush scale-95" : "clay-btn-blush",
        )}
      >
        {holding ? "whoosh… keep holding" : "🌬️ press & hold to blow"}
      </button>
      <p className="mt-4 text-sm font-bold text-mint-500">
        {wishes} seed{wishes === 1 ? "" : "s"} sent to the wind
      </p>
      <p className="mt-1 text-xs font-medium text-ink-soft">
        hold as long as you need — no rush, no score
      </p>
    </motion.div>
  );
}

function SeedBurst() {
  // computed once per burst (lazy initializer — never during render)
  const [seeds] = useState(() =>
    Array.from({ length: 10 }, (_, i) => ({
      angle: (Math.PI * 2 * i) / 10 + Math.random() * 0.5,
      dist: 70 + Math.random() * 60,
      size: 10 + Math.random() * 14,
    })),
  );
  return (
    <>
      {seeds.map((s, i) => (
        <motion.span
          key={i}
          initial={{ x: 0, y: 0, opacity: 1, scale: 0.6 }}
          animate={{
            x: Math.cos(s.angle) * s.dist,
            y: Math.sin(s.angle) * s.dist - 40,
            opacity: 0,
            scale: 1,
            rotate: s.angle * 2,
          }}
          exit={{ opacity: 0 }}
          transition={{ duration: 1.6, ease: "easeOut", delay: i * 0.04 }}
          className="absolute text-mint-500 select-none"
          style={{ fontSize: s.size }}
          aria-hidden
        >
          🌱
        </motion.span>
      ))}
    </>
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

/* ─── 6. Star Trace ────────────────────────────────────────────────── */

// 10 points of a soft five-pointed star (outer + inner radii), as percents.
const STAR_POINTS = Array.from({ length: 10 }, (_, i) => {
  const angle = -Math.PI / 2 + (i * Math.PI) / 5;
  const r = i % 2 === 0 ? 42 : 17;
  return { x: 50 + Math.cos(angle) * r, y: 50 + Math.sin(angle) * r };
});

function StarTrace() {
  const [lit, setLit] = useState<Set<number>>(new Set());
  const boxRef = useRef<HTMLDivElement | null>(null);
  const complete = lit.size >= STAR_POINTS.length;

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
      STAR_POINTS.forEach((p, i) => {
        if (!next.has(i) && Math.hypot(p.x - px, p.y - py) < 17) {
          next.add(i);
          changed = true;
        }
      });
      return changed ? next : prev;
    });
  };

  const reset = useTapGuard(() => setLit(new Set()), 400);

  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      className="clay-card rounded-[2.25rem] px-5 py-7"
    >
      <GameIntro
        emoji="⭐"
        title="Star Trace"
        sub="Slowly trace the glowing star with your finger — the light follows you."
      />

      <div
        ref={boxRef}
        onPointerMove={(e) => touch(e.clientX, e.clientY)}
        onPointerDown={(e) => touch(e.clientX, e.clientY)}
        className="relative mx-auto mt-6 h-72 w-full max-w-xs touch-none select-none"
      >
        {/* soft star outline */}
        <svg viewBox="0 0 100 100" className="absolute inset-0 h-full w-full" aria-hidden>
          <polygon
            points={STAR_POINTS.map((p) => `${p.x},${p.y}`).join(" ")}
            fill={complete ? "rgba(255,214,150,0.25)" : "none"}
            stroke={complete ? "#f0b96a" : "#e2d5f5"}
            strokeWidth="1.5"
            strokeLinejoin="round"
            className="transition-all duration-700"
          />
        </svg>

        {STAR_POINTS.map((p, i) => (
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
            className="absolute inset-x-0 -bottom-1 text-center text-sm font-bold text-mint-500"
          >
            a full, steady star — tracing it slowed your mind ✨
          </motion.p>
        )}
      </div>

      <div className="mt-8 flex items-center justify-center">
        {complete ? (
          <button
            type="button"
            onClick={reset}
            className="clay-btn-soft rounded-full px-5 py-2.5 text-xs font-bold text-ink-deep"
          >
            trace another star
          </button>
        ) : (
          <p className="text-xs font-semibold text-ink-soft">
            {STAR_POINTS.length - lit.size} star-light
            {STAR_POINTS.length - lit.size === 1 ? "" : "s"} to light — go slowly
          </p>
        )}
      </div>
    </motion.div>
  );
}
