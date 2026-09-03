import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";

const LINES = [
  "you're okay.",
  "breathe with the bubble.",
  "this moment will pass.",
  "no rush here.",
];

const DURATION = 60; // seconds

/**
 * Floating 🫧 button + full-screen breathing bubble overlay.
 * Tiny, soft, non-intrusive. Shows on every dashboard screen.
 */
export default function BreathingMinute() {
  const [open, setOpen] = useState(false);
  const [done, setDone] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [lineIdx, setLineIdx] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const close = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = null;
    if (elapsed >= DURATION) {
      setDone(true);
      setTimeout(() => {
        setDone(false);
        setOpen(false);
        setElapsed(0);
        setLineIdx(0);
      }, 2600);
    } else {
      setOpen(false);
      setElapsed(0);
      setLineIdx(0);
    }
  }, [elapsed]);

  const start = useCallback(() => {
    setOpen(true);
    setDone(false);
    setElapsed(0);
    setLineIdx(0);
  }, []);

  useEffect(() => {
    if (!open || done) return;
    timerRef.current = setInterval(() => {
      setElapsed((prev) => {
        if (prev >= DURATION - 1) {
          clearInterval(timerRef.current!);
          timerRef.current = null;
          return DURATION;
        }
        return prev + 1;
      });
    }, 1000);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [open, done]);

  // rotate lines
  useEffect(() => {
    if (!open || done) return;
    const id = setInterval(() => {
      setLineIdx((i) => (i + 1) % LINES.length);
    }, 8000);
    return () => clearInterval(id);
  }, [open, done]);

  const progress = elapsed / DURATION;
  const r = 80;
  const circumference = 2 * Math.PI * r;
  const dashOffset = circumference * (1 - progress);

  return (
    <>
      {/* Floating button — bottom-right above taskbar */}
      <button
        type="button"
        onClick={start}
        className="fixed bottom-24 right-5 z-40 flex h-11 w-11 items-center justify-center rounded-full bg-[#EDEBF6]/85 border border-[#C4CBE8]/50 shadow-lg shadow-[#8C9AD6]/15 transition-transform hover:scale-110 active:scale-95"
        aria-label="I need a minute"
        title="I need a minute"
      >
        <span className="text-lg leading-none" aria-hidden>🫧</span>
      </button>

      {/* Full-screen overlay */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5 }}
            className="fixed inset-0 z-[80] flex flex-col items-center justify-center"
            style={{
              background: "rgba(253,245,230,0.92)",
              backdropFilter: "blur(12px)",
              WebkitBackdropFilter: "blur(12px)",
            }}
          >
            {/* Done message */}
            <AnimatePresence>
              {done && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="flex flex-col items-center gap-4 text-center"
                >
                  <span className="text-4xl" aria-hidden>💜</span>
                  <p className="font-script text-2xl font-bold text-ink-deep">
                    that was a brave minute 💜
                  </p>
                </motion.div>
              )}
            </AnimatePresence>

            {!done && (
              <div className="flex flex-col items-center gap-6">
                {/* Ring + bubble */}
                <div className="relative flex items-center justify-center">
                  <svg
                    width="220"
                    height="220"
                    className="absolute"
                    style={{ transform: "rotate(-90deg)" }}
                  >
                    {/* Background ring */}
                    <circle
                      cx="110"
                      cy="110"
                      r={r}
                      fill="none"
                      stroke="#C4CBE8"
                      strokeWidth="3"
                      opacity="0.4"
                    />
                    {/* Progress ring */}
                    <circle
                      cx="110"
                      cy="110"
                      r={r}
                      fill="none"
                      stroke="#8C9AD6"
                      strokeWidth="3"
                      strokeLinecap="round"
                      strokeDasharray={circumference}
                      strokeDashoffset={dashOffset}
                      style={{ transition: "stroke-dashoffset 1s linear" }}
                    />
                  </svg>

                  {/* Breathing bubble */}
                  <motion.div
                    animate={{
                      scale: [1, 1.15, 1],
                    }}
                    transition={{
                      duration: 6,
                      repeat: Infinity,
                      ease: "easeInOut",
                    }}
                    className="flex h-28 w-28 items-center justify-center rounded-full"
                    style={{
                      background: "linear-gradient(180deg, #D9DEF4, #EDEBF6)",
                      boxShadow: "0 8px 32px -8px rgba(140,154,214,0.35), inset 0 2px 4px rgba(255,255,255,0.6)",
                    }}
                  >
                    <span className="text-3xl opacity-60" aria-hidden>🫧</span>
                  </motion.div>
                </div>

                {/* Rotating line */}
                <AnimatePresence mode="wait">
                  <motion.p
                    key={lineIdx}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    transition={{ duration: 0.5 }}
                    className="font-script text-xl font-semibold text-ink-deep"
                  >
                    {LINES[lineIdx]}
                  </motion.p>
                </AnimatePresence>

                {/* Time display */}
                <p className="text-xs font-semibold text-ink-soft">
                  {Math.floor(elapsed / 60)}:{String(elapsed % 60).padStart(2, "0")} / 1:00
                </p>

                {/* Done button */}
                <button
                  type="button"
                  onClick={close}
                  className="rounded-full bg-[#8C9AD6]/20 px-6 py-2.5 text-sm font-bold text-ink-deep transition-colors hover:bg-[#8C9AD6]/30"
                >
                  done
                </button>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
