import { useState, Component, type ReactNode } from "react";
import { Link, useNavigate } from "react-router";

import { MoodBubble } from "@/components/MoodBubble";
import { removeItem, saveCheckin, useTable, getKvFromCache, type MoodCheckin } from "@/lib/db";
import { type MoodId, moodById, todayDateKey } from "@/lib/moods";
import { useTapGuard } from "@/lib/useTapGuard";
import { cn } from "@/lib/utils";
import { useSeasonEmoji } from "@/components/SeasonalParticles";
import FutureNoteSection from "@/components/FutureNoteSection";
import MonthlyWeather from "@/components/MonthlyWeather";
import GratitudeJar from "@/components/GratitudeJar";
import GoodnightWindDown from "@/components/GoodnightWindDown";
import TinyTales from "@/components/TinyTales";
import PolaroidWallSection from "@/components/PolaroidWall";
import { PlantHomeCard } from "@/components/MyLittlePlant";

/** Per-section error boundary: if one card crashes, the rest of Home still shows. */
class SectionBoundary extends Component<{ name: string; children: ReactNode }, { hasError: boolean }> {
  state = { hasError: false };
  static getDerivedStateFromError() { return { hasError: true }; }
  componentDidCatch(err: Error) {
    console.error(`[home] ${this.props.name} crashed:`, err?.message, err);
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="clay-card px-5 py-6 text-center">
          <p className="text-sm font-semibold text-ink-soft">something soft went wrong here 💜</p>
          <button
            type="button"
            onClick={() => this.setState({ hasError: false })}
            className="mt-2 text-xs font-bold text-lavender-600 underline-offset-4 hover:underline"
          >
            try again
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

/** Wrap each home section so one crash never blanks the whole screen. */
function SoftSection({ name, children }: { name: string; children: ReactNode }) {
  return <SectionBoundary name={name}>{children}</SectionBoundary>;
}

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
    to: "/dashboard/create?view=photos",
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

function HomeScreenInner() {
  const checkins = useTable<MoodCheckin>("moodCheckins");
  const dateKey = todayDateKey();
  const today = (checkins ?? []).find((c) => c?.dateKey === dateKey);

  const [feelingText, setFeelingText] = useState("");
  const greet = greeting();
  const seasonEmoji = useSeasonEmoji();
  const todayMood = today?.mood ? moodById(today.mood) : undefined;

  // one tap records one mood — held/double presses are ignored
  const pickMood = useTapGuard((mood: MoodId) => {
    try {
      saveCheckin({
        dateKey,
        mood,
        intensity: 3,
        note: feelingText.trim() || undefined,
      });
    } catch {
      console.warn("[home] saveCheckin failed");
    }
  }, 450);

  const clearToday = useTapGuard(() => {
    try {
      if (today) removeItem("moodCheckins", today._id);
    } catch { /* ignore */ }
  }, 450);

  return (
    <div className="space-y-6">
      {/* ─── Greeting ─────────────────────────────────────────────── */}
      <section>
        <div className="flex items-center gap-3">
          <UserAvatar />
          <div>
            <p className="font-script text-3xl font-bold tracking-tight text-ink-deep">
              {greet.emoji} {greet.text}, friend {seasonEmoji}
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
      <SoftSection name="MoodCard">
        <div className="clay-card relative overflow-hidden px-5 py-6">
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
              <MoodSuggestion moodId={today.mood} />
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
      </SoftSection>

      {/* ─── 4 · My Little Plant — full width ─────────────────── */}
      <SoftSection name="MyLittlePlant"><PlantHomeCard /></SoftSection>

      {/* ─── 5 · Row: gratitude jar + tiny tales (equal, aligned) ── */}
      <div className="grid grid-cols-2 items-stretch gap-4 [&>button]:h-full [&>button]:w-full">
        <SoftSection name="GratitudeJar"><GratitudeJar /></SoftSection>
        <SoftSection name="TinyTales"><TinyTales /></SoftSection>
      </div>

      {/* ─── 6 · Row: month's weather + wind-down (equal, aligned) ─ */}
      <div className="grid grid-cols-2 items-stretch gap-4 [&>button]:h-full [&>button]:w-full">
        <SoftSection name="MonthlyWeather"><MonthlyWeather /></SoftSection>
        <SoftSection name="WindDown"><GoodnightWindDown /></SoftSection>
      </div>

      {/* ─── 7 · A Note for Future You — full width ─────────────── */}
      <SoftSection name="FutureNote"><FutureNoteSection /></SoftSection>

      {/* ─── Polaroid Wall ──────────────────────────────────────── */}
      <SoftSection name="PolaroidWall"><PolaroidWallSection /></SoftSection>

      {/* ─── Feature grid — exactly two per row ───────────────────── */}
      <SoftSection name="FeatureGrid">
        <div className="grid grid-cols-2 gap-3 sm:gap-4">
          {FEATURES.map((f) => (
            <div key={f.to + f.title}>
              <Link
                to={f.to}
                className="clay-card group flex h-full flex-col items-center gap-2 px-4 py-5 text-center transition-transform hover:-translate-y-0.5"
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
      </SoftSection>

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

/* ─── Mood → Game suggestion ────────────────────────────────────── */

const MOOD_GAME_MAP: Record<string, { name: string; emoji: string; path: string }> = {
  happy: { name: "Soft Tiles", emoji: "🎹", path: "/dashboard/games?game=tiles" },
  sad: { name: "Pond Pals", emoji: "🎣", path: "/dashboard/games?game=pond" },
  angry: { name: "Honeycomb Pop", emoji: "🍯", path: "/dashboard/games?game=honeycomb" },
  nervous: { name: "Chime Plinko", emoji: "🎐", path: "/dashboard/games?game=plinko" },
  tired: { name: "Moonlight Glide", emoji: "🌙", path: "/dashboard/games?game=moon" },
  overwhelmed: { name: "Firework Sky", emoji: "🎆", path: "/dashboard/games?game=fireworks" },
  calm: { name: "Soft Tiles", emoji: "🎹", path: "/dashboard/games?game=tiles" },
  irritated: { name: "Jelly Bounce", emoji: "🍮", path: "/dashboard/games?game=jelly" },
};

function MoodSuggestion({ moodId }: { moodId: string }) {
  const navigate = useNavigate();
  const suggestion = MOOD_GAME_MAP[moodId];
  if (!suggestion) return null;

  return (
    <div className="mx-auto mt-3 max-w-[18rem]">
      <div className="flex items-center justify-center gap-2 rounded-2xl bg-lavender-100/50 px-3 py-2">
        <span className="text-xs text-ink-soft">for {moodById(moodId)?.label.toLowerCase() ?? moodId} days:</span>
        <span className="text-xs font-bold text-ink-deep">{suggestion.emoji} {suggestion.name}</span>
        <button
          type="button"
          onClick={() => navigate(suggestion.path)}
          className="ml-1 rounded-full bg-lavender-500/20 px-2 py-0.5 text-[10px] font-bold text-lavender-600 transition-colors hover:bg-lavender-500/30"
        >
          try it →
        </button>
      </div>
    </div>
  );
}

export default function HomeScreen() {
  return <HomeScreenInner />;
}

function UserAvatar() {
  let avatar = "💜";
  try { avatar = getKvFromCache("profileAvatar") || "💜"; } catch { /* safe fallback */ }
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

