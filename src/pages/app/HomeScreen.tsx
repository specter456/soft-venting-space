import { motion } from "framer-motion";
import { useQuery } from "convex/react";
import { Loader2 } from "lucide-react";
import { useMemo, useState } from "react";
import { Link } from "react-router";
import { api } from "@/convex/_generated/api";
import { MoodBubble } from "@/components/MoodBubble";
import { MoodCheckinDialog } from "@/components/MoodCheckinDialog";
import { useAuth } from "@/hooks/use-auth";
import { MOODS, type MoodId, moodById, todayDateKey } from "@/lib/moods";
import { cn } from "@/lib/utils";

const ROOMS = [
  {
    to: "/dashboard/record",
    title: "Record",
    emoji: "🎙️",
    tile: "tile-mist",
    blurb: "voice & video vents — let it out",
  },
  {
    to: "/dashboard/create",
    title: "Create",
    emoji: "🎨",
    tile: "tile-blush",
    blurb: "photos, scribbles, stickers & GIFs",
  },
  {
    to: "/dashboard/calm",
    title: "Calm",
    emoji: "🌬️",
    tile: "tile-mint",
    blurb: "breathe, pop worries, drift away",
  },
  {
    to: "/dashboard/diary",
    title: "Diary",
    emoji: "📖",
    tile: "tile-lavender",
    blurb: "a cozy private book that turns pages",
  },
];

function greeting(): { text: string; emoji: string } {
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 12) return { text: "Good morning", emoji: "🌅" };
  if (hour >= 12 && hour < 17) return { text: "Good afternoon", emoji: "☀️" };
  if (hour >= 17 && hour < 22) return { text: "Good evening", emoji: "🌙" };
  return { text: "Good night", emoji: "✨" };
}

export default function HomeScreen() {
  const { user } = useAuth();
  const dateKey = todayDateKey();
  const today = useQuery(api.moods.todayMood, { dateKey });

  const [checkinOpen, setCheckinOpen] = useState(false);
  const [preselect, setPreselect] = useState<{
    mood: MoodId | null;
    intensity: number | null;
  }>({ mood: null, intensity: null });

  const greet = greeting();
  const firstName = user?.name?.split(" ")[0] ?? "friend";
  const todayMood = today ? moodById(today.mood) : undefined;

  const openCheckin = (mood: MoodId | null) => {
    setPreselect({ mood, intensity: null });
    setCheckinOpen(true);
  };

  const editToday = () => {
    if (today) {
      setPreselect({ mood: today.mood as MoodId, intensity: today.intensity });
    }
    setCheckinOpen(true);
  };

  return (
    <div className="space-y-6">
      {/* ─── Greeting ─────────────────────────────────────────────── */}
      <motion.section
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45 }}
      >
        <p className="text-2xl font-bold tracking-tight text-ink-deep">
          {greet.text}, {firstName}
        </p>
        <p className="mt-1 text-sm font-medium text-ink-soft">
          {new Date().toLocaleDateString(undefined, {
            weekday: "long",
            month: "long",
            day: "numeric",
          })}
        </p>
      </motion.section>

      {/* ─── Mood check-in ────────────────────────────────────────── */}
      <motion.section
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.08 }}
      >
        <div className="clay-card relative overflow-hidden rounded-[2rem] px-5 py-6">
          <SparkleDecor />

          {today === undefined ? (
            <div className="flex h-36 items-center justify-center">
              <Loader2 className="size-5 animate-spin text-lavender-400" />
            </div>
          ) : todayMood && today ? (
            <div className="text-center">
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ type: "spring", stiffness: 200, damping: 16 }}
                className="mx-auto w-fit"
              >
                <MoodBubble mood={todayMood} size="lg" />
              </motion.div>
              <p className="mt-3 text-lg font-bold tracking-tight text-ink-deep">
                You&apos;re feeling {todayMood.label.toLowerCase()}
              </p>
              <p className="mx-auto mt-1.5 max-w-[17rem] text-sm leading-relaxed text-ink">
                {todayMood.affirmation}
              </p>
              <div className="mt-3 flex items-center justify-center gap-1.5">
                {[1, 2, 3, 4, 5].map((n) => (
                  <span
                    key={n}
                    className={cn(
                      "h-2 rounded-full transition-all",
                      n <= today.intensity ? "w-4 bg-lavender-400" : "w-2 bg-lavender-200",
                    )}
                  />
                ))}
              </div>
              {today.note && (
                <p className="mx-auto mt-4 max-w-[18rem] rounded-2xl bg-cream-deep/60 px-4 py-3 text-sm leading-relaxed text-ink italic">
                  “{today.note}”
                </p>
              )}
              <button
                type="button"
                onClick={editToday}
                className="mt-4 rounded-full px-4 py-2 text-xs font-bold text-lavender-600 underline-offset-4 transition-colors hover:bg-lavender-100/70 hover:underline"
              >
                I feel differently now
              </button>
            </div>
          ) : (
            <div>
              <p className="text-center text-lg font-bold tracking-tight text-ink-deep">
                How are you feeling today?
              </p>
              <p className="mt-1 text-center text-sm text-ink-soft">
                Tap a feeling — there&apos;s no wrong answer here.
              </p>
              <div className="mt-5 grid grid-cols-4 gap-x-2 gap-y-4">
                {MOODS.map((m) => (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => openCheckin(m.id)}
                    className="group flex flex-col items-center gap-1.5"
                  >
                    <MoodBubble mood={m} size="md" className="group-hover:scale-110" />
                    <span className="text-[11px] font-bold text-ink-soft group-hover:text-ink">
                      {m.label}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </motion.section>

      {/* ─── The four rooms ───────────────────────────────────────── */}
      <motion.section
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.16 }}
        className="space-y-3.5"
      >
        {ROOMS.map((room) => (
          <Link
            key={room.to}
            to={room.to}
            className="clay-card group flex items-center gap-4 rounded-[2rem] px-5 py-4 transition-transform hover:-translate-y-0.5"
          >
            <div
              className={cn(
                "flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl text-2xl transition-transform group-hover:scale-110",
                room.tile,
              )}
            >
              <span aria-hidden className="drop-shadow-sm">
                {room.emoji}
              </span>
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-lg font-bold tracking-tight text-ink-deep">
                {room.title}
              </p>
              <p className="truncate text-[13px] font-medium text-ink-soft">
                {room.blurb}
              </p>
            </div>
            <span
              aria-hidden
              className="text-xl text-lavender-400 transition-transform group-hover:translate-x-1"
            >
              →
            </span>
          </Link>
        ))}
      </motion.section>

      {/* ─── Tiny privacy footer ──────────────────────────────────── */}
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.4 }}
        className="pt-1 text-center text-[11px] font-semibold text-ink-soft"
      >
        🔒 Private and safe. Only you can see this.
      </motion.p>

      <MoodCheckinDialog
        open={checkinOpen}
        onOpenChange={setCheckinOpen}
        initialMood={preselect.mood}
        initialIntensity={preselect.intensity}
      />
    </div>
  );
}

function SparkleDecor() {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0">
      <motion.span
        className="absolute top-4 left-6 text-sm text-lavender-300"
        animate={{ y: [0, -6, 0], opacity: [0.4, 1, 0.4] }}
        transition={{ duration: 3.2, repeat: Infinity, ease: "easeInOut" }}
      >
        ✦
      </motion.span>
      <motion.span
        className="absolute top-10 right-8 text-xs text-blush-300"
        animate={{ y: [0, -8, 0], opacity: [0.4, 1, 0.4] }}
        transition={{ duration: 3.8, repeat: Infinity, ease: "easeInOut", delay: 0.7 }}
      >
        ✦
      </motion.span>
      <motion.span
        className="absolute bottom-6 left-10 text-xs text-mint-300"
        animate={{ y: [0, -5, 0], opacity: [0.3, 0.9, 0.3] }}
        transition={{ duration: 4.2, repeat: Infinity, ease: "easeInOut", delay: 1.3 }}
      >
        ✧
      </motion.span>
    </div>
  );
}
