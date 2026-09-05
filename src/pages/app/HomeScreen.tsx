import { useState } from "react";
import { Link } from "react-router";

import { MoodBubble } from "@/components/MoodBubble";
import { removeItem, saveCheckin, useTable, type MoodCheckin } from "@/lib/db";
import { type MoodId, moodById, todayDateKey } from "@/lib/moods";
import { useTapGuard } from "@/lib/useTapGuard";
import { cn } from "@/lib/utils";
import FutureNoteSection from "@/components/FutureNoteSection";
import OnThisDay from "@/components/OnThisDay";
import MonthlyWeather from "@/components/MonthlyWeather";
import GratitudeJar from "@/components/GratitudeJar";
import GoodnightWindDown from "@/components/GoodnightWindDown";
import TinyTales from "@/components/TinyTales";
import { getKvFromCache } from "@/lib/db"

/** Exactly four quick moods — one tap selects only that one. */
const QUICK_MOODS: MoodId[] = ["happy", "sad", "angry", "nervous"];

/** Main features, exactly two per row — one single Recording entry. */
const FEATURES = [
  {
    to: "/dashboard/record",
    title: "Recording",
    emoji: "🎙️",
    tile: "tile-mist",
    line: "voice & video in one place",
  },
  {
    to: "/dashboard/notes",
    title: "Notes",
    emoji: "📝",
    tile: "tile-peach",
    line: "write it down softly",
  },
  {
    to: "/dashboard/scribble",
    title: "Scribble",
    emoji: "🖍️",
    tile: "tile-lavender",
    line: "draw how it feels",
  },
  {
    to: "/dashboard/create",
    title: "Photo Doodle",
    emoji: "🖼️",
    tile: "tile-mint",
    line: "doodle on your photos",
  },
  {
    to: "/dashboard/stickers",
    title: "Stickers",
    emoji: "🧸",
    tile: "tile-blush",
    line: "make cute feelings",
  },
  {
    to: "/dashboard/gif-studio",
    title: "GIF Studio",
    emoji: "🎞️",
    tile: "tile-mist",
    line: "soft little animations",
  },
  {
    to: "/dashboard/diary",
    title: "Diary",
    emoji: "📖",
    tile: "tile-lavender",
    line: "your private little book",
  },
  {
    to: "/dashboard/vault",
    title: "Private Vault",
    emoji: "🔒",
    tile: "tile-blush",
    line: "double-locked keepsakes",
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
  const checkins = useTable<MoodCheckin>("moodCheckins");
  const dateKey = todayDateKey();
  const today = checkins.find((c) => c.dateKey === dateKey);

  const [feelingText, setFeelingText] = useState("");
  const greet = greeting();
  const todayMood = today ? moodById(today.mood) : undefined;

  // one tap records one mood — held/double presses are ignored
  const pickMood = useTapGuard((mood: MoodId) => {
    saveCheckin({
      dateKey,
      mood,
      intensity: 3,
      note: feelingText.trim() || undefined,
    });
  }, 450);

  const clearToday = useTapGuard(() => {
    if (today) removeItem("moodCheckins", today._id);
  }, 450);

  return (
    <div className="space-y-6">
      {/* ─── Greeting ─────────────────────────────────────────────── */}
      <section>
        <div className="flex items-center gap-3">
          <UserAvatar />
          <div>
            <p className="font-script text-3xl font-bold tracking-tight text-ink-deep">
              {greet.emoji} {greet.text}, friend
            </p>
            <p className="mt-1 text-sm font-medium text-ink-soft">
              {new Date().toLocaleDateString(undefined, {
                weekday: "long",
                month: "long",
                day: "numeric",
              })}
            </p>
          </div>
        </div>
      </section>

      {/* ─── Mood typing box + 4 quick moods ──────────────────────── */}
      <section>
        <div className="clay-card relative overflow-hidden rounded-[2rem] px-5 py-6">
          <SparkleDecor />

          {todayMood && today ? (
            <div className="text-center">
              <div className="mx-auto w-fit">
                <MoodBubble mood={todayMood} size="lg" />
              </div>
              <p className="mt-3 text-lg font-bold tracking-tight text-ink-deep">
                You&apos;re feeling {todayMood.label.toLowerCase()}
              </p>
              <p className="mx-auto mt-1.5 max-w-[17rem] text-sm leading-relaxed text-ink">
                {todayMood.affirmation}
              </p>
              {today.note && (
                <p className="mx-auto mt-4 max-w-[18rem] rounded-2xl bg-cream-deep/60 px-4 py-3 text-sm leading-relaxed text-ink italic">
                  “{today.note}”
                </p>
              )}
              <button
                type="button"
                onClick={clearToday}
                className="mt-4 rounded-full px-4 py-2 text-xs font-bold text-lavender-600 underline-offset-4 transition-colors hover:bg-lavender-100/70 hover:underline"
              >
                I feel differently now
              </button>
            </div>
          ) : (
            <div>
              <p className="font-script text-center text-xl font-bold tracking-tight text-ink-deep">
                How are you feeling today?
              </p>
              <p className="mt-1 text-center text-sm text-ink-soft">
                Type your exact feeling, then tap one mood.
              </p>

              {/* typing box */}
              <input
                type="text"
                value={feelingText}
                onChange={(e) => setFeelingText(e.target.value)}
                autoCorrect="off"
                autoCapitalize="sentences"
                spellCheck={false}
                placeholder="Type how you feel… (slightly happy, extremely sad, a little nervous…)"
                aria-label="How you feel right now"
                className="mt-5 w-full rounded-2xl border-0 bg-[#FDF5E6]/70 px-4 py-3.5 text-sm leading-relaxed text-ink-deep shadow-[inset_0_2px_6px_rgba(90,90,140,0.08)] placeholder:text-ink-soft/70 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#8C9AD6]"
              />

              {/* exactly four quick moods, one row */}
              <div className="mt-5 grid grid-cols-4 gap-x-2 gap-y-3">
                {QUICK_MOODS.map((id) => {
                  const m = moodById(id);
                  if (!m) return null;
                  return (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => pickMood(m.id)}
                      className="group flex flex-col items-center gap-1.5"
                    >
                      <MoodBubble mood={m} size="md" className="group-hover:scale-110" />
                      <span className="text-[11px] font-bold text-ink-soft group-hover:text-ink">
                        {m.label}
                      </span>
                    </button>
                  );
                })}
              </div>
              <p className="mt-4 text-center text-xs text-ink-soft">
                One tap, one mood — no wrong answers here.
              </p>
            </div>
          )}
        </div>
      </section>

      {/* ─── Monthly Weather ────────────────────────────────────── */}
      <MonthlyWeather />

      {/* ─── On This Day — memories from the same date ──────────── */}
      <OnThisDay />

      {/* ─── A Note for Future You ──────────────────────────────── */}
      <FutureNoteSection />

      {/* ─── Gratitude Jar ──────────────────────────────────────── */}
      <GratitudeJar />

      {/* ─── Tiny Tales ──────────────────────────────────────── */}
      <TinyTales />

      {/* ─── Goodnight Wind-Down ──────────────────────────────── */}
      <GoodnightWindDown />

      {/* ─── Feature grid — exactly two per row ───────────────────── */}
      <section>
        <div className="grid grid-cols-2 gap-3 sm:gap-4">
          {FEATURES.map((f) => (
            <div key={f.to + f.title}>
              <Link
                to={f.to}
                className="clay-card group flex h-full flex-col items-center gap-2 rounded-[1.8rem] px-4 py-5 text-center transition-transform hover:-translate-y-0.5"
              >
                <span
                  className={cn(
                    "flex h-12 w-12 sm:h-14 sm:w-14 items-center justify-center rounded-2xl text-2xl sm:text-3xl transition-transform group-hover:scale-110",
                    f.tile,
                  )}
                >
                  <span aria-hidden className="drop-shadow-sm">
                    {f.emoji}
                  </span>
                </span>
                <span className="text-sm sm:text-base font-bold tracking-tight text-ink-deep">
                  {f.title}
                </span>
                <span className="text-[11px] leading-snug font-medium text-ink-soft">
                  {f.line}
                </span>
              </Link>
            </div>
          ))}
        </div>
      </section>

      {/* ─── Tiny privacy footer ──────────────────────────────────── */}
      <p className="pt-1 text-center text-[11px] font-semibold text-ink-soft">
        🔒 Private and safe. Only you can see this.
      </p>
    </div>
  );
}

function SparkleDecor() {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0">
      {/* static sparkles — gentle and stable, never moving on their own */}
      <span className="absolute top-4 left-6 text-sm text-lavender-300/70">✦</span>
      <span className="absolute top-10 right-8 text-xs text-blush-300/70">✦</span>
      <span className="absolute bottom-6 left-10 text-xs text-mint-300/70">✧</span>
    </div>
  );
}

function UserAvatar() {
  const avatar = getKvFromCache("profileAvatar") || "💜";
  // If it's an emoji, show it big. If it's a data URL (sticker), show as image.
  if (avatar.startsWith("data:") || avatar.startsWith("http")) {
    return (
      <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-full border-2 border-[var(--theme-accent-light)]">
        <img src={avatar} alt="your face" className="h-full w-full object-cover" />
      </div>
    );
  }
  return (
    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[var(--theme-accent-light)] text-2xl">
      <span aria-hidden>{avatar}</span>
    </div>
  );
}

