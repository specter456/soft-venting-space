import { motion } from "framer-motion";
import {
  ArrowRight,
  BookHeart,
  Brush,
  CloudSun,
  HeartHandshake,
  Images,
  Lock,
  LockKeyhole,
  Mic,
  NotebookPen,
  ShieldCheck,
  Sparkles,
  Sticker,
  Video,
} from "lucide-react";
import { useNavigate } from "react-router";
import { Logo } from "@/components/Logo";
import { PhoneMockup } from "@/components/PhoneMockup";
import { MOODS } from "@/lib/moods";
import { cn } from "@/lib/utils";

const TOOLS = [
  {
    label: "Voice Vent",
    icon: Mic,
    tile: "tile-mist",
    blurb: "say it out loud, in your own voice",
  },
  {
    label: "Notes",
    icon: NotebookPen,
    tile: "tile-blush",
    blurb: "a private reflection journal",
  },
  {
    label: "Scribble",
    icon: Brush,
    tile: "tile-lavender",
    blurb: "draw the feelings words can't reach",
  },
  {
    label: "Stickers",
    icon: Sticker,
    tile: "tile-peach",
    blurb: "tiny felt companions for hard days",
  },
  {
    label: "Calm Game",
    icon: CloudSun,
    tile: "tile-mint",
    blurb: "breathe, pop worries, drift away",
  },
  {
    label: "Diary",
    icon: BookHeart,
    tile: "tile-lavender",
    blurb: "a cozy book that turns its own pages",
  },
  {
    label: "Photo Vault",
    icon: Images,
    tile: "tile-lavender",
    blurb: "photos & videos under a double lock",
    doubleLocked: true,
  },
  {
    label: "Video Vents",
    icon: Video,
    tile: "tile-blush",
    blurb: "express feelings on camera, privately",
  },
];

/** The four soft rooms — one straight row on wide screens, two per row on small. */
const FEATURES = [
  {
    label: "Record",
    icon: Mic,
    tile: "tile-mist",
  },
  {
    label: "Create",
    icon: Sparkles,
    tile: "tile-blush",
  },
  {
    label: "Calm",
    icon: CloudSun,
    tile: "tile-mint",
  },
  {
    label: "Diary",
    icon: BookHeart,
    tile: "tile-lavender",
  },
];

const STEPS = [
  {
    n: "01",
    emoji: "🫧",
    title: "Pick a feeling",
    body: "Tap the mood bubble that matches right now — sad, angry, nervous, happy, tired, overwhelmed, or calm. No wrong answers, ever.",
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

const fadeUp = {
  initial: { opacity: 0, y: 24 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: "-80px" },
  transition: { duration: 0.6, ease: "easeOut" as const },
};

export default function Landing() {
  const navigate = useNavigate();

  const primaryCta = () => navigate("/welcome");
  const ctaLabel = "Open Venting";

  return (
    <div className="relative min-h-screen overflow-hidden bg-gradient-to-b from-cream-soft via-cream to-lavender-50 text-ink">
      {/* dreamy background blobs */}
      <div
        aria-hidden
        className="pointer-events-none absolute -top-32 -left-24 h-96 w-96 rounded-full bg-lavender-200/50 blur-3xl"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute top-40 -right-32 h-[28rem] w-[28rem] rounded-full bg-blush-100/60 blur-3xl"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute top-[52rem] -left-40 h-96 w-96 rounded-full bg-mint-100/60 blur-3xl"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute bottom-0 right-0 h-80 w-80 rounded-full bg-peach-100/50 blur-3xl"
      />

      {/* ─── Slim top bar (just the app CTA) ─────────────────────────── */}
      <header className="relative z-10 mx-auto flex w-full max-w-6xl items-center justify-end px-5 py-5 sm:px-8">
        <button
          type="button"
          onClick={primaryCta}
          className="clay-btn flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-bold text-cream-soft"
        >
          {ctaLabel}
          <ArrowRight className="size-4" />
        </button>
      </header>

      {/* ─── Centered brand header: icon → name → tagline ────────────── */}
      <section className="relative z-10 mx-auto w-full max-w-6xl px-5 pt-4 pb-8 sm:px-8">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: "easeOut" }}
          className="flex flex-col items-center text-center"
        >
          <Logo className="h-20 w-20 animate-floaty-slow drop-shadow-[0_10px_20px_rgba(120,100,160,0.25)] sm:h-24 sm:w-24" />
          <h1 className="mt-5 text-4xl font-bold tracking-tight text-ink-deep sm:text-5xl">
            Venting
          </h1>
          <p className="mt-2 text-base font-medium text-ink-soft sm:text-lg">
            a tiny safe room in your phone
          </p>
        </motion.div>

        {/* four feature icons — one row on wide, two per row on small */}
        <div className="mx-auto mt-10 grid max-w-3xl grid-cols-2 gap-3.5 sm:gap-4 lg:grid-cols-4">
          {FEATURES.map((feature, i) => (
            <motion.button
              key={feature.label}
              type="button"
              onClick={primaryCta}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.55, delay: 0.1 + i * 0.08, ease: "easeOut" }}
              className="clay-card group flex flex-col items-center gap-2.5 rounded-[1.8rem] px-4 py-6 transition-transform duration-300 hover:-translate-y-1"
            >
              <div
                className={cn(
                  "flex h-14 w-14 items-center justify-center rounded-2xl text-ink-deep",
                  feature.tile,
                )}
              >
                <feature.icon className="size-6" strokeWidth={2.2} />
              </div>
              <p className="text-sm font-bold tracking-tight text-ink-deep">
                {feature.label}
              </p>
            </motion.button>
          ))}
        </div>
      </section>

      {/* ─── Phone + text block (moved below the centered section) ───── */}
      <section className="relative z-10 mx-auto grid w-full max-w-6xl items-center gap-14 px-5 pt-6 pb-20 sm:px-8 lg:grid-cols-2 lg:gap-8">
        <motion.div
          initial={{ opacity: 0, y: 28 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.15, ease: "easeOut" }}
        >
          <div className="clay-chip inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-xs font-bold text-lavender-600">
            <Sparkles className="size-3.5" />
            private · gentle · just for you
          </div>
          <h2 className="mt-6 text-4xl font-bold leading-[1.08] tracking-tight text-ink-deep sm:text-5xl lg:text-[3.4rem]">
            A tiny safe room
            <br />
            inside your phone.
          </h2>
          <p className="mt-5 max-w-md text-base leading-relaxed text-ink sm:text-lg">
            Venting is your private emotional-wellness space — a soft place to
            feel, let it out, and breathe. It starts with one gentle question:
            {" "}
            <span className="font-semibold text-ink-deep">
              how are you feeling today?
            </span>
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={primaryCta}
              className="clay-btn flex items-center gap-2 rounded-full px-7 py-3.5 text-base font-bold text-cream-soft"
            >
              Start checking in
              <ArrowRight className="size-4" />
            </button>
            <a
              href="#how"
              className="clay-btn-soft flex items-center gap-2 rounded-full px-6 py-3.5 text-base font-bold text-ink-deep"
            >
              See how it feels
            </a>
          </div>
          <div className="mt-8 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs font-semibold text-ink-soft">
            <span className="flex items-center gap-1.5">
              <LockKeyhole className="size-3.5" /> passcode-locked & private
            </span>
            <span className="flex items-center gap-1.5">
              <HeartHandshake className="size-3.5" /> no judgment, ever
            </span>
            <span className="flex items-center gap-1.5">
              <Sparkles className="size-3.5" /> one gentle check-in a day
            </span>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 40, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.8, delay: 0.25, ease: "easeOut" }}
          className="flex justify-center"
        >
          <PhoneMockup className="animate-floaty-slow" />
        </motion.div>
      </section>

      {/* ─── Mood strip ──────────────────────────────────────────────── */}
      <section className="relative z-10 mx-auto w-full max-w-6xl px-5 pb-20 sm:px-8">
        <motion.div {...fadeUp} className="text-center">
          <p className="text-sm font-bold tracking-wide text-lavender-500 uppercase">
            every feeling is welcome here
          </p>
          <h2 className="mx-auto mt-3 max-w-xl text-3xl font-bold tracking-tight text-ink-deep sm:text-4xl">
            There&apos;s no wrong answer to a check-in
          </h2>
        </motion.div>
        <div className="mt-10 grid grid-cols-2 gap-3.5 sm:grid-cols-3 lg:grid-cols-8">
          {MOODS.map((mood, i) => (
            <motion.div
              key={mood.id}
              {...fadeUp}
              transition={{ duration: 0.5, delay: i * 0.06, ease: "easeOut" }}
              className="clay-chip flex flex-col items-center gap-2.5 rounded-3xl px-3 py-5 text-center"
            >
              <span className="text-3xl drop-shadow-sm">{mood.emoji}</span>
              <p className="text-sm font-bold text-ink-deep">{mood.label}</p>
              <p className="text-[11px] leading-snug text-ink-soft">
                {mood.blurb}
              </p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* ─── How it works ────────────────────────────────────────────── */}
      <section id="how" className="relative z-10 mx-auto w-full max-w-6xl px-5 pb-20 sm:px-8">
        <motion.div {...fadeUp} className="text-center">
          <p className="text-sm font-bold tracking-wide text-lavender-500 uppercase">
            how a check-in works
          </p>
          <h2 className="mx-auto mt-3 max-w-xl text-3xl font-bold tracking-tight text-ink-deep sm:text-4xl">
            Three soft steps, then you&apos;re held
          </h2>
        </motion.div>
        <div className="mt-10 grid gap-4 md:grid-cols-3">
          {STEPS.map((step, i) => (
            <motion.div
              key={step.n}
              {...fadeUp}
              transition={{ duration: 0.55, delay: i * 0.1, ease: "easeOut" }}
              className="clay-card relative overflow-hidden rounded-[2rem] p-6"
            >
              <span className="absolute -top-3 right-4 text-6xl font-bold text-lavender-100 select-none">
                {step.n}
              </span>
              <span className="text-3xl">{step.emoji}</span>
              <h3 className="mt-3 text-lg font-bold tracking-tight text-ink-deep">
                {step.title}
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-ink">
                {step.body}
              </p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* ─── The full toolkit ────────────────────────────────────────── */}
      <section className="relative z-10 mx-auto w-full max-w-6xl px-5 pb-20 sm:px-8">
        <motion.div {...fadeUp} className="text-center">
          <p className="text-sm font-bold tracking-wide text-lavender-500 uppercase">
            eight soft rooms, one safe space
          </p>
          <h2 className="mx-auto mt-3 max-w-xl text-3xl font-bold tracking-tight text-ink-deep sm:text-4xl">
            The full toolkit, all locked to you
          </h2>
          <p className="mx-auto mt-4 max-w-lg text-sm leading-relaxed text-ink">
            Record, Create, Calm and Diary are open right now — with voice &
            video vents, reflection notes, scribbles, stickers, GIFs, calm
            games and a double-locked photo vault inside. Every room is only
            yours.
          </p>
        </motion.div>
        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {TOOLS.map((tool, i) => (
            <motion.div
              key={tool.label}
              {...fadeUp}
              transition={{ duration: 0.55, delay: i * 0.07, ease: "easeOut" }}
              className="clay-card group relative overflow-hidden rounded-[2rem] p-6"
            >
              <div className="flex items-start justify-between">
                <div
                  className={cn(
                    "flex h-12 w-12 items-center justify-center rounded-2xl text-ink-deep",
                    tool.tile,
                  )}
                >
                  <tool.icon className="size-5" strokeWidth={2.2} />
                </div>
                <div className="flex items-center gap-1.5">
                  {tool.doubleLocked ? (
                    <span className="flex items-center" aria-hidden>
                      <span className="flex h-6 w-6 items-center justify-center rounded-full bg-lavender-100 text-lavender-600">
                        <Lock className="size-3" />
                      </span>
                      <span className="-ml-1.5 flex h-6 w-6 items-center justify-center rounded-full bg-blush-100 text-blush-500">
                        <Lock className="size-3" />
                      </span>
                    </span>
                  ) : (
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-lavender-100 text-lavender-600">
                      <Lock className="size-3" />
                    </span>
                  )}
                  <span className="rounded-full bg-mint-100/80 px-2.5 py-1 text-[10px] font-bold tracking-wide text-mint-500 uppercase">
                    inside
                  </span>
                </div>
              </div>
              <h3 className="mt-4 text-lg font-bold tracking-tight text-ink-deep">
                {tool.label}
              </h3>
              <p className="mt-1.5 text-sm leading-relaxed text-ink">
                {tool.blurb}
              </p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* ─── Private by design ──────────────────────────────────────── */}
      <section className="relative z-10 mx-auto w-full max-w-6xl px-5 pb-20 sm:px-8">
        <motion.div {...fadeUp} className="text-center">
          <p className="text-sm font-bold tracking-wide text-lavender-500 uppercase">
            private by design
          </p>
          <h2 className="mx-auto mt-3 max-w-xl text-3xl font-bold tracking-tight text-ink-deep sm:text-4xl">
            No sharing. No feed. No audience.
          </h2>
          <p className="mx-auto mt-4 max-w-lg text-sm leading-relaxed text-ink">
            Venting isn&apos;t social — it&apos;s a tiny safe room. Nothing you
            express here is posted, seen, liked, or shared with anyone. Ever.
          </p>
        </motion.div>

        <div className="mt-10 grid gap-4 lg:grid-cols-2">
          <motion.div
            {...fadeUp}
            className="clay-card rounded-[2rem] p-7"
          >
            <div className="flex items-center gap-3">
              <span className="clay-chip flex h-12 w-12 items-center justify-center rounded-full text-lavender-600">
                <ShieldCheck className="size-5" />
              </span>
              <div>
                <h3 className="text-lg font-bold tracking-tight text-ink-deep">
                  What Venting has
                </h3>
                <p className="text-sm text-ink-soft">
                  a lock on every room, and a double lock on your vault
                </p>
              </div>
            </div>
            <div className="mt-5 flex flex-wrap gap-2">
              {[
                "Voice Vent",
                "Notes",
                "Scribble",
                "Stickers",
                "Calm Game",
                "Diary",
                "Photo Vault",
                "Video Vents",
              ].map((room) => (
                <span
                  key={room}
                  className="inline-flex items-center gap-1.5 rounded-full bg-lavender-100/70 px-3 py-1.5 text-xs font-bold text-ink"
                >
                  <Lock className="size-3 text-lavender-500" />
                  {room}
                </span>
              ))}
            </div>
          </motion.div>

          <motion.div
            {...fadeUp}
            transition={{ duration: 0.55, delay: 0.08, ease: "easeOut" }}
            className="clay-card rounded-[2rem] p-7"
          >
            <div className="flex items-center gap-3">
              <span className="clay-chip flex h-12 w-12 items-center justify-center rounded-full text-blush-500">
                <HeartHandshake className="size-5" />
              </span>
              <div>
                <h3 className="text-lg font-bold tracking-tight text-ink-deep">
                  What Venting never has
                </h3>
                <p className="text-sm text-ink-soft">
                  the things that make social media feel unsafe
                </p>
              </div>
            </div>
            <div className="mt-5 flex flex-wrap gap-2">
              {[
                "No social feed",
                "No comments",
                "No likes",
                "No followers",
                "No posting",
                "No community",
                "No sharing",
              ].map((item) => (
                <span
                  key={item}
                  className="inline-flex items-center gap-1.5 rounded-full bg-blush-100/70 px-3 py-1.5 text-xs font-bold text-ink"
                >
                  <span aria-hidden className="text-sm">
                    🚫
                  </span>
                  {item}
                </span>
              ))}
            </div>
          </motion.div>
        </div>

        <motion.div
          {...fadeUp}
          transition={{ duration: 0.55, delay: 0.12, ease: "easeOut" }}
          className="clay-card mt-4 flex flex-col items-center gap-2 rounded-[2rem] px-6 py-6 text-center sm:flex-row sm:justify-center sm:gap-4"
        >
          <div className="flex items-center gap-1.5" aria-hidden>
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-lavender-100 text-lavender-600">
              <Lock className="size-4" />
            </span>
            <span className="-ml-2 flex h-9 w-9 items-center justify-center rounded-full bg-blush-100 text-blush-500">
              <Lock className="size-4" />
            </span>
          </div>
          <p className="text-sm font-bold text-ink-deep">
            One lock opens the app — a second, separate lock opens your private
            vault.
          </p>
        </motion.div>
      </section>

      {/* ─── Final CTA ───────────────────────────────────────────────── */}
      <section className="relative z-10 mx-auto w-full max-w-6xl px-5 pb-24 sm:px-8">
        <motion.div
          {...fadeUp}
          className="clay-card relative overflow-hidden rounded-[2.5rem] px-6 py-14 text-center sm:px-12"
        >
          <div
            aria-hidden
            className="pointer-events-none absolute -top-16 -left-16 h-56 w-56 rounded-full bg-lavender-100/70 blur-2xl"
          />
          <div
            aria-hidden
            className="pointer-events-none absolute -right-16 -bottom-16 h-56 w-56 rounded-full bg-blush-100/70 blur-2xl"
          />
          <span className="relative text-4xl">🏡</span>
          <h2 className="relative mx-auto mt-4 max-w-2xl text-3xl font-bold tracking-tight text-ink-deep sm:text-4xl">
            Your feelings have a home here.
          </h2>
          <p className="relative mx-auto mt-4 max-w-lg text-sm leading-relaxed text-ink sm:text-base">
            No sign-up walls, no clinical charts — just a warm, private room
            that asks how you are and actually listens.
          </p>
          <button
            type="button"
            onClick={primaryCta}
            className="clay-btn relative mt-8 inline-flex items-center gap-2 rounded-full px-8 py-3.5 text-base font-bold text-cream-soft"
          >
            Open your safe room
            <ArrowRight className="size-4" />
          </button>
        </motion.div>
      </section>

      {/* ─── Footer ──────────────────────────────────────────────────── */}
      <footer className="relative z-10 border-t border-lavender-100/80">
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
          <button
            type="button"
            onClick={primaryCta}
            className="text-xs font-bold text-lavender-600 underline-offset-4 hover:underline"
          >
            Open the app →
          </button>
        </div>
      </footer>
    </div>
  );
}
