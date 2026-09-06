import { motion, AnimatePresence } from "framer-motion";
import { ArrowRight } from "lucide-react";
import { useState, useEffect } from "react";
import { useNavigate } from "react-router";
import { Logo } from "@/components/Logo";
import { QuietBoundary } from "@/components/AppErrorBoundary";
import SeasonalParticles from "@/components/SeasonalParticles";
import { SplashScreen } from "@/components/SplashScreen";
import { DocumentHead } from "@/components/DocumentHead";

const STEPS = [
  {
    n: "01",
    emoji: "🫧",
    title: "Pick a feeling",
    body: "Tap the mood bubble that matches right now — happy, sad, angry, or nervous. No wrong answers, ever.",
  },
  {
    n: "02",
    emoji: "🕊️",
    title: "Let a little out",
    body: "Tell us how big the feeling is, and write a word or a sentence if you want to. The note is optional and always private.",
  },
  {
    n: "03",
    emoji: "🌤️",
    title: "Feel a little lighter",
    body: "A gentle affirmation meets you where you are. Your mood is kept safe, and tomorrow you get to check in all over again.",
  },
];

export default function Landing() {
  const navigate = useNavigate();
  const [showSplash, setShowSplash] = useState(true);
  const [showExplanation, setShowExplanation] = useState(false);

  // Splash fades out after 1.2 seconds
  useEffect(() => {
    const t = window.setTimeout(() => setShowSplash(false), 1200);
    return () => window.clearTimeout(t);
  }, []);

  const primaryCta = () => navigate("/login");

  return (
    <div className="relative min-h-screen text-ink" role="landing">
      <QuietBoundary name="SeasonalParticles">
        <SeasonalParticles />
      </QuietBoundary>
      <DocumentHead
        title="Venting — a tiny safe room in your phone"
        description="Venting is a private, calming space to express your feelings through voice recordings, notes, doodling, stickers, calming games, and a cozy diary. Everything stays on your device."
        canonical="/"
      />
      {/* ─── Breadcrumb (public) ──────────────────────────────────── */}
      <nav aria-label="Breadcrumb" className="relative z-20 mx-auto w-full max-w-6xl px-5 pt-4 sm:px-8">
        <ol className="flex items-center gap-1.5 text-xs font-semibold text-ink-soft">
          <li>
            <span aria-current="page" className="text-ink-deep">Home</span>
          </li>
        </ol>
      </nav>
      {/* ─── Drifting sky clouds (decorative) ──────────────────── */}
      <div className="sky-cloud sky-cloud-1" aria-hidden />
      <div className="sky-cloud sky-cloud-2" aria-hidden />
      <div className="sky-cloud sky-cloud-3" aria-hidden />
      <div className="sky-cloud sky-cloud-4" aria-hidden />

      {/* splash screen */}
      <SplashScreen visible={showSplash} />

      {/* dreamy background blobs — new palette colors at 35% */}
      <div
        aria-hidden
        className="pointer-events-none absolute -top-32 -left-24 h-96 w-96 rounded-full bg-[#AAB6E3]/30 blur-2xl"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute top-40 -right-32 h-[28rem] w-[28rem] rounded-full bg-[#F3E7C9]/30 blur-2xl"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute top-[52rem] -left-40 h-96 w-96 rounded-full bg-[#C4CBE8]/30 blur-2xl"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute bottom-0 right-0 h-80 w-80 rounded-full bg-[#EDEBF6]/30 blur-2xl"
      />



      {/* ─── Centered brand: icon → name → tagline → feeling line ──── */}
      <header role="banner" className="relative z-10 mx-auto flex min-h-[80dvh] w-full max-w-xl flex-col items-center justify-center px-5 pt-4 pb-16 sm:px-8">
        {/* floating hearts & sparkles */}
        <div className="pointer-events-none relative">
          <motion.span
            aria-hidden
            className="animate-floaty absolute -top-14 -left-16 text-3xl drop-shadow-sm select-none"
          >
            💜
          </motion.span>
          <motion.span
            aria-hidden
            className="animate-floaty-slow absolute -right-12 top-8 text-2xl select-none"
          >
            ✨
          </motion.span>
          <motion.span
            aria-hidden
            className="animate-floaty absolute -bottom-10 -left-10 text-2xl select-none"
            style={{ animationDelay: "1.2s" }}
          >
            🫧
          </motion.span>
          <motion.span
            aria-hidden
            className="animate-floaty-slow absolute -right-10 bottom-4 text-xl select-none"
            style={{ animationDelay: "0.8s" }}
          >
            🧸
          </motion.span>

          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, ease: "easeOut" }}
            className="flex flex-col items-center text-center"
          >
            <Logo className="h-20 w-20 animate-floaty-slow drop-shadow-[0_10px_20px_rgba(120,100,160,0.25)]" />
            <h1 className="font-script mt-5 text-4xl font-bold tracking-tight text-ink-deep">
              Venting
            </h1>
            <p className="font-script mt-2 text-lg font-semibold text-ink-soft">
              a tiny safe room in your phone
            </p>
            <p className="font-script mt-1.5 text-base font-semibold text-ink">
              your feelings have a home here
            </p>
          </motion.div>
        </div>

        {/* buttons */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3, ease: "easeOut" }}
          className="mt-12 flex flex-col items-center gap-4 sm:flex-row"
        >
          <button
            type="button"
            onClick={primaryCta}
            className="clay-btn flex items-center gap-2 px-6 py-3.5 text-base font-bold text-white"
          >
            Open Venting
            <ArrowRight className="size-4" />
          </button>
          <button
            type="button"
            onClick={() => setShowExplanation(true)}
            className="clay-btn-soft flex items-center gap-2 px-6 py-3.5 text-base font-bold text-ink-deep"
          >
            See how it feels
          </button>
        </motion.div>

        {/* privacy badges */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.5 }}
          className="mt-8 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-xs font-semibold text-ink-soft"
        >
          <span className="flex items-center gap-1.5">🔒 private &amp; safe</span>
          <span className="flex items-center gap-1.5">🤍 no judgment, ever</span>
          <span className="flex items-center gap-1.5">✨ one gentle check-in a day</span>
        </motion.div>
      </header>

      {/* ─── Explanation card (opens when "See how it feels" is tapped) ── */}
      <AnimatePresence>
        {showExplanation && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/20 px-5"
            onClick={() => setShowExplanation(false)}
          >
            <motion.div
              initial={{ opacity: 0, y: 24, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 16, scale: 0.97 }}
              transition={{ type: "spring", stiffness: 260, damping: 22 }}
              className="relative w-full max-w-md overflow-hidden rounded-[2.25rem] bg-[#FDF5E6]/90 border border-[#C4CBE8]/40 px-6 py-9 text-center shadow-lg shadow-[#8C9AD6]/15"
              onClick={(e) => e.stopPropagation()}
            >
              <div
                aria-hidden
                className="pointer-events-none absolute -top-14 -right-14 h-36 w-36 rounded-full bg-[#AAB6E3]/40 blur-2xl"
              />
              <div
                aria-hidden
                className="pointer-events-none absolute -bottom-14 -left-14 h-36 w-36 rounded-full bg-[#F3E7C9]/40 blur-2xl"
              />

              <p className="relative text-sm font-bold tracking-wide text-[#5F6DBE] uppercase">
                how a check-in works
              </p>
              <h2 className="relative mx-auto mt-2 max-w-xs text-2xl font-bold tracking-tight text-ink-deep">
                Three soft steps, then you&apos;re held
              </h2>

              <div className="relative mt-7 space-y-5">
                {STEPS.map((step) => (
                  <div key={step.n} className="flex items-start gap-3 text-left">
                    <span className="mt-0.5 text-2xl" aria-hidden>
                      {step.emoji}
                    </span>
                    <div>
                      <p className="text-sm font-bold text-ink-deep">
                        {step.title}
                      </p>
                      <p className="mt-0.5 text-[13px] leading-relaxed text-ink">
                        {step.body}
                      </p>
                    </div>
                  </div>
                ))}
              </div>

              <button
                type="button"
                onClick={() => {
                  setShowExplanation(false);
                  primaryCta();
                }}
                className="clay-btn relative mt-8 inline-flex items-center gap-2 px-7 py-3 text-sm font-bold text-white"
              >
                Try it now
                <ArrowRight className="size-4" />
              </button>
              <button
                type="button"
                onClick={() => setShowExplanation(false)}
                className="relative mt-3 block w-full text-xs font-bold text-ink-soft underline-offset-4 hover:text-ink-deep hover:underline"
              >
                close
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ─── Footer ──────────────────────────────────────────────────── */}
      <footer role="contentinfo" className="relative z-10 border-t border-[#C4CBE8]/40">
        <div className="mx-auto flex w-full max-w-6xl flex-col items-center justify-between gap-4 px-5 py-8 sm:flex-row sm:px-8">
          <div className="flex items-center gap-2.5">
            <Logo className="h-8 w-8" />
            <p className="text-sm font-bold tracking-tight text-ink-deep">
              Venting
            </p>
          </div>
          <p className="text-xs font-medium text-ink-soft">
            made with softness · private by design · feelings welcome
          </p>
        </div>
      </footer>
    </div>
  );
}
