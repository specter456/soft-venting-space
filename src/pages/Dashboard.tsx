import { motion } from "framer-motion";
import { useQuery } from "convex/react";
import { toast } from "sonner";
import { useMemo, useState } from "react";
import { useNavigate } from "react-router";
import {
  BookHeart,
  Brush,
  CloudSun,
  Loader2,
  LockKeyhole,
  LogOut,
  Mic,
  NotebookPen,
  Sticker,
} from "lucide-react";
import { api } from "@/convex/_generated/api";
import { Logo } from "@/components/Logo";
import { MoodBubble } from "@/components/MoodBubble";
import { MoodCheckinDialog } from "@/components/MoodCheckinDialog";
import { useAuth } from "@/hooks/use-auth";
import {
  MOODS,
  type MoodId,
  moodById,
  todayDateKey,
} from "@/lib/moods";
import { cn } from "@/lib/utils";

const TOOLKIT = [
  { label: "Voice Vent", icon: Mic, tile: "tile-mist", emoji: "🎙️" },
  { label: "Notes", icon: NotebookPen, tile: "tile-blush", emoji: "📝" },
  { label: "Scribble", icon: Brush, tile: "tile-lavender", emoji: "🖍️" },
  { label: "Stickers", icon: Sticker, tile: "tile-peach", emoji: "🧸" },
  { label: "Calm Game", icon: CloudSun, tile: "tile-mint", emoji: "🌬️" },
  { label: "Diary", icon: BookHeart, tile: "tile-lavender", emoji: "📖" },
];

function greeting(): { text: string; emoji: string } {
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 12) return { text: "Good morning", emoji: "🌅" };
  if (hour >= 12 && hour < 17) return { text: "Good afternoon", emoji: "☀️" };
  if (hour >= 17 && hour < 22) return { text: "Good evening", emoji: "🌙" };
  return { text: "Good night", emoji: "✨" };
}

function localDateKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export default function Dashboard() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();

  const dateKey = todayDateKey();
  const today = useQuery(api.moods.todayMood, { dateKey });
  const recent = useQuery(api.moods.recentMoods, {});

  const [checkinOpen, setCheckinOpen] = useState(false);
  const [preselect, setPreselect] = useState<{
    mood: MoodId | null;
    intensity: number | null;
  }>({ mood: null, intensity: null });

  const days = useMemo(() => {
    const out: { key: string; label: string; isToday: boolean }[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      out.push({
        key: localDateKey(d),
        label: d.toLocaleDateString(undefined, { weekday: "short" }),
        isToday: i === 0,
      });
    }
    return out;
  }, []);

  const byDate = useMemo(() => {
    const map = new Map<string, { mood: string }>();
    for (const c of recent ?? []) {
      if (!map.has(c.dateKey)) map.set(c.dateKey, { mood: c.mood });
    }
    return map;
  }, [recent]);

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
  };

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

  const greet = greeting();
  const firstName = user?.name?.split(" ")[0] ?? "friend";
  const todayMood = today ? moodById(today.mood) : undefined;
  const loading = today === undefined || recent === undefined;

  return (
    <main className="relative min-h-dvh overflow-hidden bg-gradient-to-b from-cream-soft via-cream to-lavender-50 text-ink">
      {/* dreamy background blobs */}
      <div
        aria-hidden
        className="pointer-events-none absolute -top-24 -left-20 h-72 w-72 rounded-full bg-lavender-100/60 blur-3xl"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute top-72 -right-24 h-80 w-80 rounded-full bg-blush-100/50 blur-3xl"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute bottom-20 -left-24 h-72 w-72 rounded-full bg-mint-100/50 blur-3xl"
      />

      <div className="relative mx-auto max-w-[440px] px-5 pt-6 pb-12 sm:pt-8">
        {/* ─── Header ─────────────────────────────────────────────── */}
        <header className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Logo className="h-10 w-10" />
            <div className="leading-tight">
              <p className="text-base font-bold tracking-tight text-ink-deep">
                Venting
              </p>
              <p className="text-[11px] font-medium text-ink-soft">
                your soft space
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleSignOut}
              className="clay-chip flex h-10 w-10 items-center justify-center rounded-full text-ink-soft transition-transform hover:scale-105 hover:text-ink-deep"
              aria-label="Sign out"
              title="Sign out"
            >
              <LogOut className="size-4" />
            </button>
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-blush-100 to-lavender-100 text-lg shadow-[inset_0_2px_4px_rgba(255,255,255,0.8),inset_0_-3px_6px_rgba(139,112,190,0.2)]">
              <span aria-hidden>{greet.emoji}</span>
            </div>
          </div>
        </header>

        {/* ─── Greeting ───────────────────────────────────────────── */}
        <section className="mt-6">
          <motion.p
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45 }}
            className="text-2xl font-bold tracking-tight text-ink-deep"
          >
            {greet.text}, {firstName}
          </motion.p>
          <p className="mt-1 text-sm font-medium text-ink-soft">
            {new Date().toLocaleDateString(undefined, {
              weekday: "long",
              month: "long",
              day: "numeric",
            })}
          </p>
          <span className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-lavender-100/80 px-3 py-1.5 text-[11px] font-bold text-lavender-600">
            <LockKeyhole className="size-3" /> only you can see this space
          </span>
        </section>

        {/* ─── Mood check-in ──────────────────────────────────────── */}
        <motion.section
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="mt-5"
        >
          <div className="clay-card relative overflow-hidden rounded-[2rem] px-5 py-6">
            <SparkleDecor />

            {loading ? (
              <div className="flex h-40 items-center justify-center">
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
                        n <= today.intensity
                          ? "w-4 bg-lavender-400"
                          : "w-2 bg-lavender-200",
                      )}
                    />
                  ))}
                </div>
                {today.note && (
                  <p className="mx-auto mt-4 max-w-[18rem] rounded-2xl bg-cream-deep/60 px-4 py-3 text-sm leading-relaxed text-ink italic">
                    “{today.note}”
                  </p>
                )}
                <p className="mt-3 text-[11px] font-semibold text-ink-soft">
                  checked in{" "}
                  {new Date(today._creationTime).toLocaleTimeString([], {
                    hour: "numeric",
                    minute: "2-digit",
                  })}
                </p>
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
                      <MoodBubble
                        mood={m}
                        size="md"
                        className="group-hover:scale-110"
                      />
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

        {/* ─── Soft toolkit (blooming soon) ───────────────────────── */}
        <motion.section
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="mt-6"
        >
          <div className="flex items-baseline justify-between">
            <h2 className="text-sm font-bold tracking-tight text-ink-deep">
              Your soft toolkit
            </h2>
            <span className="text-[11px] font-semibold text-ink-soft">
              blooming soon
            </span>
          </div>
          <div className="mt-3 grid grid-cols-3 gap-3">
            {TOOLKIT.map((tool) => (
              <button
                key={tool.label}
                type="button"
                onClick={() =>
                  toast(`${tool.emoji} ${tool.label}`, {
                    description:
                      "This little room opens in the next version of Venting.",
                  })
                }
                className="clay-chip group flex flex-col items-center gap-2 rounded-3xl px-2 py-4 transition-transform hover:-translate-y-1"
              >
                <div
                  className={cn(
                    "flex h-11 w-11 items-center justify-center rounded-2xl text-ink-deep transition-transform group-hover:scale-110",
                    tool.tile,
                  )}
                >
                  <tool.icon className="size-5" strokeWidth={2.2} />
                </div>
                <span className="text-[11px] font-bold text-ink">
                  {tool.label}
                </span>
                <span className="rounded-full bg-lavender-100/80 px-2 py-0.5 text-[8px] font-bold tracking-wide text-lavender-600 uppercase">
                  soon
                </span>
              </button>
            ))}
          </div>
        </motion.section>

        {/* ─── Week strip ────────────────────────────────────────── */}
        <motion.section
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="mt-6"
        >
          <h2 className="text-sm font-bold tracking-tight text-ink-deep">
            Your gentle week
          </h2>
          <div className="clay-card mt-3 flex items-center justify-between gap-1 rounded-3xl px-4 py-4">
            {days.map((day) => {
              const entry = byDate.get(day.key);
              const mood = entry ? moodById(entry.mood) : undefined;
              return (
                <div
                  key={day.key}
                  className="flex flex-col items-center gap-1.5"
                >
                  <span
                    className={cn(
                      "text-[10px] font-bold",
                      day.isToday ? "text-lavender-600" : "text-ink-soft",
                    )}
                  >
                    {day.label}
                  </span>
                  {mood ? (
                    <span
                      className={cn(
                        "flex h-8 w-8 items-center justify-center rounded-full text-sm",
                        mood.clay,
                        day.isToday && "ring-2 ring-lavender-400 ring-offset-2 ring-offset-cream",
                      )}
                    >
                      {mood.emoji}
                    </span>
                  ) : (
                    <span
                      className={cn(
                        "h-2 w-2 rounded-full",
                        day.isToday ? "bg-lavender-300" : "bg-lavender-200/70",
                      )}
                    />
                  )}
                </div>
              );
            })}
          </div>
          <p className="mt-2 text-center text-[11px] font-medium text-ink-soft">
            one check-in a day keeps your feelings company
          </p>
        </motion.section>
      </div>

      <MoodCheckinDialog
        open={checkinOpen}
        onOpenChange={setCheckinOpen}
        initialMood={preselect.mood}
        initialIntensity={preselect.intensity}
      />
    </main>
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
        transition={{
          duration: 3.8,
          repeat: Infinity,
          ease: "easeInOut",
          delay: 0.7,
        }}
      >
        ✦
      </motion.span>
      <motion.span
        className="absolute bottom-6 left-10 text-xs text-mint-300"
        animate={{ y: [0, -5, 0], opacity: [0.3, 0.9, 0.3] }}
        transition={{
          duration: 4.2,
          repeat: Infinity,
          ease: "easeInOut",
          delay: 1.3,
        }}
      >
        ✧
      </motion.span>
    </div>
  );
}
