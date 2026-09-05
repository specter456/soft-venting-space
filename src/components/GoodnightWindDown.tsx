import { useState, useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useTapGuard } from "@/lib/useTapGuard";
import { safeGetItem, safeSetItem } from "@/lib/safe-storage";

const GRATITUDE_KEY = "venting-gratitude-jar";

interface JarNote {
  id: string;
  text: string;
  date: string;
}

function loadJar(): JarNote[] {
  try {
    const raw = safeGetItem(GRATITUDE_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as JarNote[];
  } catch {
    return [];
  }
}

function saveJar(notes: JarNote[]) {
  safeSetItem(GRATITUDE_KEY, JSON.stringify(notes));
}

export default function GoodnightWindDown() {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(0); // 0=gratitude, 1=breathe, 2=sound, 3=done
  const [gratitude, setGratitude] = useState("");
  const [breathPhase, setBreathPhase] = useState<"inhale" | "exhale">("inhale");
  const [breathSize, setBreathSize] = useState(1);
  const [breathProgress, setBreathProgress] = useState(0);

  // Breathing animation (step 1)
  useEffect(() => {
    if (step !== 1) return;
    const start = Date.now();
    const duration = 30000; // 30 seconds total
    let raf: number;

    const tick = () => {
      const elapsed = Date.now() - start;
      const pct = Math.min(100, (elapsed / duration) * 100);
      setBreathProgress(pct);

      // 4s inhale, 4s exhale cycle
      const cycleMs = 8000;
      const inCycle = elapsed % cycleMs;
      if (inCycle < 4000) {
        setBreathPhase("inhale");
        setBreathSize(0.6 + 0.4 * (inCycle / 4000));
      } else {
        setBreathPhase("exhale");
        setBreathSize(1 - 0.4 * ((inCycle - 4000) / 4000));
      }

      if (elapsed >= duration) {
        setStep(2);
        return;
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [step]);

  const saveGratitude = useTapGuard(() => {
    if (gratitude.trim()) {
      const notes = loadJar();
      notes.push({
        id: `g-${Date.now()}`,
        text: gratitude.trim(),
        date: new Date().toLocaleDateString(undefined, { month: "short", day: "numeric" }),
      });
      saveJar(notes);
    }
    setStep(1);
  }, 400);

  const skipGratitude = useTapGuard(() => setStep(1), 400);
  const finish = useTapGuard(() => { setOpen(false); setStep(0); setGratitude(""); }, 400);


  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="clay-card relative overflow-hidden px-5 py-5 text-left transition-transform hover:-translate-y-0.5"
      >
        <div className="flex items-center gap-3">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#E4E8F8] text-xl">🌙</span>
          <div>
            <p className="text-sm font-bold tracking-tight text-ink-deep">goodnight wind-down 🌙</p>
            <p className="mt-0.5 text-[11px] font-medium text-ink-soft">a soft way to end the day</p>
          </div>
        </div>
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[85] flex items-center justify-center px-5"
            style={{ background: "linear-gradient(180deg, rgba(40,35,60,0.85) 0%, rgba(60,50,80,0.9) 50%, rgba(30,25,50,0.95) 100%)" }}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="w-full max-w-sm text-center"
            >
              {step === 0 && (
                <div className="space-y-6">
                  <div className="space-y-2">
                    <p className="text-3xl">🌟</p>
                    <p className="font-script text-2xl font-bold text-white/90">one good thing today?</p>
                    <p className="text-sm text-white/50">optional — or just skip ahead</p>
                  </div>
                  <input
                    type="text"
                    value={gratitude}
                    onChange={(e) => setGratitude(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter") saveGratitude(); }}
                    placeholder="something nice that happened…"
                    maxLength={200}
                    className="w-full rounded-2xl border-0 bg-white/10 px-5 py-3.5 text-sm text-white placeholder:text-white/30 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/30"
                  />
                  <div className="flex gap-3">
                    <button
                      type="button"
                      onClick={saveGratitude}
                      className="flex-1 rounded-full bg-white/15 px-5 py-3 text-sm font-bold text-white/90 transition-all hover:bg-white/20"
                    >
                      tuck it in
                    </button>
                    <button
                      type="button"
                      onClick={skipGratitude}
                      className="flex-1 rounded-full border border-white/15 px-5 py-3 text-sm font-bold text-white/50 transition-all hover:text-white/70"
                    >
                      skip
                    </button>
                  </div>
                </div>
              )}

              {step === 1 && (
                <div className="space-y-6">
                  <p className="font-script text-xl font-bold text-white/80">breathe with the star</p>
                  <div className="relative flex h-48 items-center justify-center">
                    {/* Progress ring */}
                    <svg className="absolute h-48 w-48 -rotate-90" viewBox="0 0 200 200">
                      <circle cx="100" cy="100" r="90" fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="3" />
                      <circle
                        cx="100" cy="100" r="90" fill="none"
                        stroke="rgba(255,255,255,0.25)" strokeWidth="3"
                        strokeDasharray={`${breathProgress * 5.65} 565`}
                        strokeLinecap="round"
                      />
                    </svg>
                    <motion.span
                      animate={{ scale: breathSize }}
                      transition={{ duration: 0.3, ease: "easeInOut" }}
                      className="text-6xl select-none"
                    >
                      ✦
                    </motion.span>
                  </div>
                  <p className="font-script text-xl font-bold text-white/70">
                    {breathPhase === "inhale" ? "inhale…" : "exhale…"}
                  </p>
                </div>
              )}

              {step === 2 && (
                <div className="space-y-6">
                  <p className="font-script text-xl font-bold text-white/80">pick your night sound</p>
                  <div className="flex flex-col gap-2">
                    {["music-box lullaby", "night wind", "none"].map((s) => (
                      <button
                        key={s}
                        type="button"
                        onClick={() => setStep(3)}
                        className="rounded-full border border-white/15 bg-white/8 px-5 py-3 text-sm font-bold text-white/80 transition-all hover:bg-white/15"
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {step === 3 && (
                <div className="space-y-6">
                  {/* Drifting stars */}
                  <div className="relative h-32">
                    {Array.from({ length: 8 }).map((_, i) => (
                      <motion.span
                        key={i}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: [0, 0.6, 0], y: [-10, -40] }}
                        transition={{ duration: 3 + i * 0.5, repeat: Infinity, delay: i * 0.4 }}
                        className="absolute text-sm text-white/60"
                        style={{ left: `${10 + i * 11}%`, top: "60%" }}
                      >
                        ✦
                      </motion.span>
                    ))}
                  </div>
                  <p className="font-script text-2xl font-bold text-white/90">
                    sleep tight — tomorrow you get to check in all over again 🌙
                  </p>
                  <button
                    type="button"
                    onClick={finish}
                    className="mx-auto rounded-full bg-white/15 px-8 py-3 text-sm font-bold text-white/90 transition-all hover:bg-white/20"
                  >
                    done
                  </button>
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

