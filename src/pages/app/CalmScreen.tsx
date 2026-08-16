import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useState } from "react";
import { WORRY_BUBBLES } from "@/lib/art";
import { cn } from "@/lib/utils";

type Tab = "breathe" | "pop" | "dandelion";

const TABS: { id: Tab; label: string }[] = [
  { id: "breathe", label: "🫧 Breathe" },
  { id: "pop", label: "💭 Pop worries" },
  { id: "dandelion", label: "🌬️ Dandelion" },
];

const FEELINGS = ["nervous", "angry", "sad", "stressed", "irritated", "overwhelmed"];

const FEELING_NUDGE: Record<string, string> = {
  nervous: "Butterflies are okay — let's slow them down together.",
  angry: "Anger is energy. Let's give it somewhere soft to land.",
  sad: "Sadness is allowed. Breathe with me, slowly.",
  stressed: "You're carrying a lot. Put it down for a minute.",
  irritated: "Everything feels loud right now. Let's turn the volume down.",
  overwhelmed: "One breath is enough. Just one.",
};

const PHASES = [
  { label: "Inhale…", dur: 4, scale: 1.45 },
  { label: "Hold…", dur: 4, scale: 1.45 },
  { label: "Exhale…", dur: 6, scale: 0.8 },
];

export default function CalmScreen() {
  const [tab, setTab] = useState<Tab>("breathe");
  const [feeling, setFeeling] = useState<string | null>(null);

  return (
    <div className="space-y-5">
      {/* ─── How are you right now? ───────────────────────────────── */}
      <div className="flex flex-wrap gap-2">
        {FEELINGS.map((f) => (
          <button
            key={f}
            type="button"
            onClick={() => setFeeling((prev) => (prev === f ? null : f))}
            className={cn(
              "rounded-full px-3 py-1.5 text-xs font-bold transition-all",
              feeling === f
                ? "bg-mint-500 text-cream-soft shadow-[0_6px_12px_-6px_rgba(77,157,121,0.6)]"
                : "clay-chip text-ink hover:-translate-y-0.5",
            )}
          >
            {f}
          </button>
        ))}
      </div>

      {feeling && (
        <motion.p
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          className="clay-card rounded-3xl px-5 py-4 text-sm leading-relaxed font-medium text-ink"
        >
          {FEELING_NUDGE[feeling]}
        </motion.p>
      )}

      {/* ─── Tabs ─────────────────────────────────────────────────── */}
      <div className="clay-chip flex w-full items-center gap-1 rounded-full p-1">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={cn(
              "flex-1 rounded-full px-2 py-2 text-xs font-bold whitespace-nowrap transition-all",
              tab === t.id
                ? "bg-gradient-to-b from-mint-300 to-mint-400 text-cream-soft shadow-[inset_0_1px_0_rgba(255,255,255,0.6),0_6px_12px_-6px_rgba(77,157,121,0.6)]"
                : "text-ink-soft hover:text-ink-deep",
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        {tab === "breathe" && <Breathe key="breathe" />}
        {tab === "pop" && <PopWorries key="pop" />}
        {tab === "dandelion" && <Dandelion key="dandelion" />}
      </AnimatePresence>
    </div>
  );
}

/* ─── Breathe ──────────────────────────────────────────────────────── */
function Breathe() {
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
      key="breathe"
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
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

      <motion.div
        animate={{ scale: phase.scale }}
        transition={{ duration: phase.dur, ease: "easeInOut" }}
        className="relative mx-auto flex h-48 w-48 items-center justify-center rounded-full bg-gradient-to-b from-mint-200/80 to-mist-200/70 shadow-[inset_0_4px_10px_rgba(255,255,255,0.8),inset_0_-10px_18px_-10px_rgba(77,157,121,0.45),0_20px_40px_-16px_rgba(77,157,121,0.5)]"
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
      <p className="mt-4 text-xs font-bold text-mint-500">
        {rounds} gentle round{rounds === 1 ? "" : "s"} done
      </p>
    </motion.div>
  );
}

/* ─── Pop worries ──────────────────────────────────────────────────── */
function PopWorries() {
  const [worries, setWorries] = useState(
    () => WORRY_BUBBLES.map((w, i) => ({ id: i, text: w, popped: false })),
  );
  const popped = worries.filter((w) => w.popped).length;

  const reset = () => {
    setWorries((prev) => prev.map((w) => ({ ...w, popped: false })));
  };

  return (
    <motion.div
      key="pop"
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="clay-card rounded-[2.25rem] px-5 py-7"
    >
      <p className="text-center text-lg font-bold tracking-tight text-ink-deep">
        Pop the worries away
      </p>
      <p className="mt-1 text-center text-sm text-ink-soft">
        Each bubble holds a worry — tap it and watch it burst. Gone doesn&apos;t
        mean forgotten; it means lighter.
      </p>

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
          {popped}/{worries.length} worries popped
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

/* ─── Dandelion ────────────────────────────────────────────────────── */
interface Seed {
  id: number;
  angle: number;
  dist: number;
  size: number;
}

let seedCounter = 0;

function Dandelion() {
  const [seeds, setSeeds] = useState<Seed[]>([]);
  const [wishes, setWishes] = useState(0);
  const [blowing, setBlowing] = useState(false);

  const blow = () => {
    if (blowing) return;
    setBlowing(true);
    const fresh: Seed[] = Array.from({ length: 14 }, (_, i) => ({
      id: ++seedCounter,
      angle: (Math.PI * 2 * i) / 14 + Math.random() * 0.4,
      dist: 70 + Math.random() * 50,
      size: 10 + Math.random() * 14,
    }));
    setSeeds(fresh);
    setWishes((w) => w + 1);
    window.setTimeout(() => {
      setSeeds([]);
      setBlowing(false);
    }, 1600);
  };

  return (
    <motion.div
      key="dandelion"
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="clay-card relative overflow-hidden rounded-[2.25rem] px-6 py-12 text-center"
    >
      <div
        aria-hidden
        className="pointer-events-none absolute -top-14 -right-14 h-44 w-44 rounded-full bg-mist-100/70 blur-2xl"
      />

      <div className="relative mx-auto flex h-56 items-center justify-center">
        <motion.span
          animate={blowing ? { scale: [1, 0.85, 1], rotate: [0, -6, 4, 0] } : { y: [0, -6, 0] }}
          transition={
            blowing
              ? { duration: 1.2 }
              : { duration: 3.4, repeat: Infinity, ease: "easeInOut" }
          }
          className="text-7xl drop-shadow-md select-none"
          aria-hidden
        >
          🌼
        </motion.span>
        <AnimatePresence>
          {seeds.map((s) => (
            <motion.span
              key={s.id}
              initial={{ x: 0, y: 0, opacity: 1, scale: 0.6 }}
              animate={{
                x: Math.cos(s.angle) * s.dist,
                y: Math.sin(s.angle) * s.dist - 30,
                opacity: 0,
                scale: 1,
                rotate: s.angle * 2,
              }}
              exit={{ opacity: 0 }}
              transition={{ duration: 1.5, ease: "easeOut" }}
              className="absolute text-mint-500 select-none"
              style={{ fontSize: s.size }}
              aria-hidden
            >
              🌱
            </motion.span>
          ))}
        </AnimatePresence>
      </div>

      <button
        type="button"
        onClick={blow}
        disabled={blowing}
        className="clay-btn-blush mt-4 inline-flex items-center gap-2 rounded-full px-7 py-3 text-sm font-bold text-ink-deep disabled:opacity-60"
      >
        {blowing ? "whoosh…" : "🌬️ Blow the seeds"}
      </button>
      <p className="mt-4 text-sm font-bold text-mint-500">
        {wishes} wish{wishes === 1 ? "" : "es"} sent to the wind
      </p>
      <p className="mt-1 text-xs font-medium text-ink-soft">
        each seed carries a little weight away with it
      </p>
    </motion.div>
  );
}
