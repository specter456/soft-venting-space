import { motion } from "framer-motion";
import { useState } from "react";
import { Navigate, useNavigate } from "react-router";
import { Logo } from "@/components/Logo";
import { todayDateKey } from "@/lib/moods";
import { safeGetItem, safeSetItem } from "@/lib/safe-storage";
import { useTapGuard } from "@/lib/useTapGuard";
import { cn } from "@/lib/utils";

/** Local-only onboarding flags — never sent anywhere. */
const DONE_KEY = "venting-onboarding-done";
const CHECKIN_KEY = "venting-checkin";

const CHECKLIST = [
  { id: "calm", label: "I felt calm", emoji: "😌" },
  { id: "happy", label: "I felt happy", emoji: "😊" },
  { id: "tired", label: "I felt tired", emoji: "😴" },
  { id: "stressed", label: "I felt stressed", emoji: "😣" },
  { id: "irritated", label: "I felt irritated", emoji: "🫤" },
  { id: "sad", label: "I felt sad", emoji: "🥺" },
  { id: "lonely", label: "I felt lonely", emoji: "🕊️" },
  { id: "overwhelmed", label: "I felt overwhelmed", emoji: "🌪️" },
  { id: "vent", label: "I need to vent", emoji: "🎙️" },
  { id: "comfort", label: "I need comfort", emoji: "🫂" },
  { id: "quiet", label: "I need quiet time", emoji: "🧘" },
  { id: "express", label: "I want to express myself", emoji: "🎨" },
  { id: "relax", label: "I want to relax", emoji: "🌬️" },
  { id: "write", label: "I want to write or draw", emoji: "✍️" },
];

const ACTIONS = [
  {
    to: "/dashboard/record",
    label: "Record",
    emoji: "🎙️",
    tile: "tile-mist",
    blurb: "voice & video vents",
  },
  {
    to: "/dashboard/create",
    label: "Create",
    emoji: "🎨",
    tile: "tile-blush",
    blurb: "photos, scribbles, stickers & GIFs",
  },
  {
    to: "/dashboard/calm",
    label: "Calm",
    emoji: "🌬️",
    tile: "tile-mint",
    blurb: "breathe, pop worries, drift",
  },
  {
    to: "/dashboard/diary",
    label: "Diary",
    emoji: "📖",
    tile: "tile-lavender",
    blurb: "a cozy private book",
  },
];

/**
 * First-time welcome check-in. Gentle, skippable, and stored only on this
 * device. Shown once after the entry screen, then the home takes over.
 */
export default function WelcomeCheckin() {
  const navigate = useNavigate();
  const [checked, setChecked] = useState<string[]>([]);
  // local-only gate: this screen shows once, ever, per device (never throws)
  const [alreadyDone] = useState(() => safeGetItem(DONE_KEY) === "1");

  const toggle = (id: string) => {
    setChecked((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };
  // one tap toggles exactly one option — held/double presses are ignored
  const guardedToggle = useTapGuard(toggle, 300);

  const finish = (to?: string) => {
    // answers live only on this device — never sent to any server
    safeSetItem(
      CHECKIN_KEY,
      JSON.stringify({ date: todayDateKey(), answers: checked }),
    );
    safeSetItem(DONE_KEY, "1");
    navigate(to ?? "/dashboard");
  };
  const guardedFinish = useTapGuard(finish, 400);

  if (alreadyDone) return <Navigate to="/dashboard" replace />;

  return (
    <div className="relative min-h-dvh overflow-hidden bg-gradient-to-b from-cream-soft via-cream to-lavender-50 text-ink">
      {/* dreamy background blobs */}
      <div
        aria-hidden
        className="pointer-events-none fixed -top-24 -left-20 h-72 w-72 rounded-full bg-lavender-100/60 blur-3xl"
      />
      <div
        aria-hidden
        className="pointer-events-none fixed top-72 -right-24 h-80 w-80 rounded-full bg-blush-100/50 blur-3xl"
      />
      <div
        aria-hidden
        className="pointer-events-none fixed bottom-20 -left-24 h-72 w-72 rounded-full bg-mint-100/50 blur-3xl"
      />

      <div className="relative mx-auto max-w-[440px] px-5 pt-8 pb-14">
        {/* ─── Greeting ───────────────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="flex flex-col items-center text-center"
        >
          <Logo className="h-14 w-14" />
          <h1 className="mt-4 text-2xl font-bold tracking-tight text-ink-deep">
            Welcome to Venting.
          </h1>
          <p className="mt-1.5 text-base font-medium text-ink-soft">
            We hope you had a nice day.
          </p>
        </motion.div>

        {/* ─── Checklist ──────────────────────────────────────────── */}
        <motion.section
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="mt-8"
        >
          <h2 className="text-sm font-bold tracking-tight text-ink-deep">
            How was your day?
          </h2>
          <p className="mt-0.5 text-xs font-medium text-ink-soft">
            Tap anything that fits — or nothing at all. No wrong answers.
          </p>
          <div className="mt-3 grid grid-cols-2 gap-2.5">
            {CHECKLIST.map((item, i) => {
              const active = checked.includes(item.id);
              return (
                <motion.button
                  key={item.id}
                  type="button"
                  initial={{ opacity: 0, scale: 0.96 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.3, delay: 0.12 + i * 0.03 }}
                  onClick={() => guardedToggle(item.id)}
                  aria-pressed={active}
                  className={cn(
                    "flex items-center gap-2 rounded-2xl px-3.5 py-3 text-left text-[13px] font-bold transition-all",
                    active
                      ? "bg-lavender-500 text-cream-soft shadow-[0_8px_16px_-8px_rgba(118,90,190,0.6)]"
                      : "clay-chip text-ink hover:-translate-y-0.5",
                  )}
                >
                  <span className="text-lg" aria-hidden>
                    {item.emoji}
                  </span>
                  <span className="leading-tight">{item.label}</span>
                </motion.button>
              );
            })}
          </div>
        </motion.section>

        {/* ─── What now? ──────────────────────────────────────────── */}
        <motion.section
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.45 }}
          className="mt-8"
        >
          <h2 className="text-sm font-bold tracking-tight text-ink-deep">
            What would you like to do now?
          </h2>
          <div className="mt-3 grid grid-cols-2 gap-3">
            {ACTIONS.map((action) => (
              <button
                key={action.to}
                type="button"
                onClick={() => guardedFinish(action.to)}
                className="clay-card group flex flex-col items-start gap-2 rounded-[1.6rem] px-4 py-4 text-left transition-transform hover:-translate-y-1"
              >
                <span
                  className={cn(
                    "flex h-11 w-11 items-center justify-center rounded-2xl text-xl transition-transform group-hover:scale-110",
                    action.tile,
                  )}
                >
                  <span aria-hidden className="drop-shadow-sm">
                    {action.emoji}
                  </span>
                </span>
                <span className="text-base font-bold tracking-tight text-ink-deep">
                  {action.label}
                </span>
                <span className="text-[11px] leading-snug font-medium text-ink-soft">
                  {action.blurb}
                </span>
              </button>
            ))}
          </div>
        </motion.section>

        {/* ─── Skip ───────────────────────────────────────────────── */}
        <div className="mt-8 flex flex-col items-center gap-2">
          <button
            type="button"
            onClick={() => guardedFinish()}
            className="text-xs font-bold text-ink-soft underline-offset-4 transition-colors hover:text-ink-deep hover:underline"
          >
            Skip for now
          </button>
          <p className="text-center text-[11px] font-semibold text-ink-soft">
            🔒 Private and safe. Only you can see this.
          </p>
        </div>
      </div>
    </div>
  );
}
