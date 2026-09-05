import { motion, AnimatePresence } from "framer-motion";
import { useState } from "react";
import { useNavigate } from "react-router";
import { Logo } from "@/components/Logo";
import { todayDateKey } from "@/lib/moods";
import { safeSetItem } from "@/lib/safe-storage";
import { useTapGuard } from "@/lib/useTapGuard";
import { cn } from "@/lib/utils";

/** Local-only check-in flag — never sent anywhere. */
const CHECKIN_KEY = "venting-checkin";

/** Exactly four gentle options, in one straight row. */
const DAY_MOODS = [
  { id: "happy", label: "Happy", emoji: "😊" },
  { id: "sad", label: "Sad", emoji: "😢" },
  { id: "angry", label: "Angry", emoji: "😠" },
  { id: "nervous", label: "Nervous", emoji: "😰" },
];

function todayDayName(): string {
  return new Date().toLocaleDateString(undefined, { weekday: "long" });
}

/**
 * Two-step welcome flow:
 * 1. Warm welcome popup ("Welcome! Hope you had a nice day. Keep smiling.")
 * 2. Check-in ("How was your day?" with today's day name + four emojis + Skip)
 *
 * Everything stays on this device.
 */
export default function WelcomeCheckin() {
  const navigate = useNavigate();
  const [step, setStep] = useState<"welcome" | "checkin">("welcome");
  const [picked, setPicked] = useState<string | null>(null);

  const finish = (moodId: string | null) => {
    // the answer lives only on this device — never sent to any server
    safeSetItem(
      CHECKIN_KEY,
      JSON.stringify({ date: todayDateKey(), mood: moodId }),
    );
    navigate("/dashboard");
  };
  const guardedFinish = useTapGuard(finish, 450);
  const guardedNext = useTapGuard(() => setStep("checkin"), 450);

  return (
    <div className="relative flex min-h-dvh items-center justify-center px-5 text-ink">
      {/* dreamy background blobs */}
      <div
        aria-hidden
        className="pointer-events-none fixed -top-24 -left-20 h-72 w-72 rounded-full bg-[#AAB6E3]/30 blur-2xl"
      />
      <div
        aria-hidden
        className="pointer-events-none fixed top-72 -right-24 h-80 w-80 rounded-full bg-[#F3E7C9]/30 blur-2xl"
      />
      <div
        aria-hidden
        className="pointer-events-none fixed bottom-20 -left-24 h-72 w-72 rounded-full bg-[#C4CBE8]/30 blur-2xl"
      />

      {/* ─── Soft popup card ──────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: 22, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ type: "spring", stiffness: 210, damping: 20 }}
        className="clay-card relative w-full max-w-sm overflow-hidden px-6 py-9 text-center"
      >
        <div
          aria-hidden
          className="pointer-events-none absolute -top-14 -right-14 h-36 w-36 rounded-full bg-lavender-100/70 blur-2xl"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute -bottom-14 -left-14 h-36 w-36 rounded-full bg-blush-100/60 blur-2xl"
        />

        <motion.div
          initial={{ scale: 0.7, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", stiffness: 220, damping: 14, delay: 0.1 }}
          className="mx-auto w-fit"
        >
          <Logo className="h-16 w-16" />
        </motion.div>

        <AnimatePresence mode="wait">
          {step === "welcome" ? (
            <motion.div
              key="welcome"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
            >
              <h1 className="font-script mt-4 text-3xl font-bold tracking-tight text-ink-deep">
                Welcome!
              </h1>
              <p className="mt-2 text-[15px] leading-relaxed font-medium text-ink">
                Hope you had a nice day.
              </p>
              <p className="mt-1 text-[15px] leading-relaxed font-medium text-ink">
                Keep smiling. ✨
              </p>

              <div className="mx-auto mt-6 h-px w-24 bg-lavender-200" aria-hidden />

              <button
                type="button"
                onClick={guardedNext}
                className="clay-btn mt-7 inline-flex items-center gap-2 px-7 py-3 text-sm font-bold text-white"
              >
                Continue
              </button>

              <p className="mt-4 text-center text-[11px] font-semibold text-ink-soft">
                🔒 Private and safe. Only you can see this.
              </p>
            </motion.div>
          ) : (
            <motion.div
              key="checkin"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
            >
              <div className="mx-auto mt-4 h-px w-24 bg-lavender-200" aria-hidden />

              {/* ─── One question, four options ─────────────────────── */}
              <p className="font-script mt-6 text-xl font-bold tracking-tight text-ink-deep">
                How was your {todayDayName()}?
              </p>

              <div className="mt-5 flex items-center justify-between gap-2">
                {DAY_MOODS.map((m) => {
                  const active = picked === m.id;
                  return (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => {
                        setPicked(m.id);
                        guardedFinish(m.id);
                      }}
                      aria-pressed={active}
                      className="group flex flex-1 flex-col items-center gap-1.5"
                    >
                      <span
                        className={cn(
                          "clay-chip flex h-14 w-14 items-center justify-center rounded-full text-3xl transition-all",
                          active && "mood-bubble mood-bubble-selected scale-110",
                        )}
                      >
                        <span aria-hidden className="drop-shadow-sm">
                          {m.emoji}
                        </span>
                      </span>
                      <span className="text-[11px] font-bold text-ink-soft group-hover:text-ink">
                        {m.label}
                      </span>
                    </button>
                  );
                })}
              </div>

              <button
                type="button"
                onClick={() => guardedFinish(null)}
                className="mt-7 text-xs font-bold text-ink-soft underline-offset-4 transition-colors hover:text-ink-deep hover:underline"
              >
                Skip
              </button>

              <p className="mt-4 text-center text-[11px] font-semibold text-ink-soft">
                🔒 Private and safe. Only you can see this.
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}
