import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useTable, type MoodCheckin, type DiaryEntry } from "@/lib/db";
import { cn } from "@/lib/utils";

/** Mood → weather mapping */
const WEATHER_MAP: Record<string, { icon: string; label: string }> = {
  happy: { icon: "☀️", label: "sunny" },
  calm: { icon: "🌤", label: "clear" },
  sad: { icon: "🌧", label: "rainy" },
  angry: { icon: "⛈", label: "stormy" },
  nervous: { icon: "💨", label: "windy" },
  tired: { icon: "🌫", label: "foggy" },
  irritated: { icon: "🌦", label: "drizzly" },
  overwhelmed: { icon: "☁️", label: "heavy clouds" },
};

function monthKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function monthLabel(key: string): string {
  const [y, m] = key.split("-").map(Number);
  const d = new Date(y, m - 1, 1);
  return d.toLocaleDateString(undefined, { month: "long", year: "numeric" });
}

/**
 * "Your Month's Weather" — soft horizontal sky strip with weather icons.
 * Shows on Home, expands into a recap with month navigation.
 */
export default function MonthlyWeather() {
  const checkins = useTable<MoodCheckin>("moodCheckins");
  const diaryEntries = useTable<DiaryEntry>("diaryEntries");
  const [open, setOpen] = useState(false);

  const now = new Date();
  const [viewMonth, setViewMonth] = useState(() => monthKey(now));

  // Build weather counts for the viewed month
  const [year, month] = viewMonth.split("-").map(Number);

  const moodCounts: Record<string, number> = {};

  // Count check-ins for this month
  checkins.forEach((c) => {
    const d = new Date(c.dateKey + "T00:00:00");
    if (d.getFullYear() === year && d.getMonth() === month - 1) {
      const mood = c.mood?.toLowerCase() || "calm";
      moodCounts[mood] = (moodCounts[mood] || 0) + 1;
    }
  });

  // Count diary moods for this month
  diaryEntries.forEach((e) => {
    try {
      const d = new Date(Number(e._id));
      if (!isNaN(d.getTime()) && d.getFullYear() === year && d.getMonth() === month - 1) {
        const mood = e.mood?.toLowerCase();
        if (mood && WEATHER_MAP[mood]) {
          moodCounts[mood] = (moodCounts[mood] || 0) + 1;
        }
      }
    } catch {
      /* skip */
    }
  });

  const total = Object.values(moodCounts).reduce((s, n) => s + n, 0);

  // Sorted weather entries (most frequent first)
  const weatherEntries = Object.entries(moodCounts)
    .map(([mood, count]) => ({
      mood,
      count,
      ...((WEATHER_MAP[mood]) || { icon: "🌤", label: mood }),
    }))
    .sort((a, b) => b.count - a.count);

  // Previous/next month navigation
  const prevMonth = () => {
    const d = new Date(year, month - 2, 1);
    setViewMonth(monthKey(d));
  };
  const nextMonth = () => {
    const d = new Date(year, month, 1);
    setViewMonth(monthKey(d));
  };
  const canGoNext = viewMonth !== monthKey(now);

  // Always show the card, but only expand when tapped
  return (
    <>
      {/* Compact card on Home */}
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="clay-card w-full overflow-hidden px-5 py-4 text-left transition-transform hover:-translate-y-0.5"
      >
        <div className="flex items-center gap-3">
          <span className="text-2xl" aria-hidden>🌦</span>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-ink-deep">your month&apos;s weather</p>
            <p className="text-[11px] font-medium text-ink-soft">
              {total > 0
                ? `${total} moment${total !== 1 ? "s" : ""} this month`
                : "no check-ins yet this month"}
            </p>
          </div>
          {/* Mini weather preview */}
          {weatherEntries.length > 0 && (
            <div className="flex items-center gap-0.5">
              {weatherEntries.slice(0, 3).map((w) => (
                <span key={w.mood} className="text-base" aria-hidden>{w.icon}</span>
              ))}
            </div>
          )}
        </div>
      </button>

      {/* ─── Expanded recap overlay ────────────────────────────────── */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[70] flex items-center justify-center bg-black/15 px-5"
            onClick={() => setOpen(false)}
          >
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 16 }}
              transition={{ type: "spring", stiffness: 220, damping: 20 }}
              onClick={(e) => e.stopPropagation()}
              className="clay-card relative w-full max-w-sm overflow-hidden px-6 py-8 text-center"
            >
              <div aria-hidden className="pointer-events-none absolute -top-14 -right-14 h-36 w-36 rounded-full bg-[#AAB6E3]/30 blur-2xl" />
              <div aria-hidden className="pointer-events-none absolute -bottom-14 -left-14 h-36 w-36 rounded-full bg-[#F3E7C9]/30 blur-2xl" />

              {/* Month navigation */}
              <div className="flex items-center justify-between">
                <button
                  type="button"
                  onClick={prevMonth}
                  className="clay-chip flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold text-ink-deep"
                  aria-label="Previous month"
                >
                  ←
                </button>
                <p className="font-script text-lg font-bold text-ink-deep">
                  {monthLabel(viewMonth)}
                </p>
                <button
                  type="button"
                  onClick={nextMonth}
                  disabled={canGoNext}
                  className={cn(
                    "clay-chip flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold",
                    canGoNext ? "text-ink-soft/40" : "text-ink-deep",
                  )}
                  aria-label="Next month"
                >
                  →
                </button>
              </div>

              <p className="font-script mt-1 text-xl font-bold text-ink-deep">🌦 your month&apos;s weather</p>

              {/* Sky strip */}
              {weatherEntries.length > 0 ? (
                <div className="mt-5 flex items-end justify-center gap-3">
                  {weatherEntries.map((w) => (
                    <div key={w.mood} className="flex flex-col items-center gap-1">
                      <span className="text-2xl" aria-hidden>{w.icon}</span>
                      <span className="text-[10px] font-bold text-ink-soft">{w.label}</span>
                      <span className="text-xs font-bold text-ink-deep">{w.count}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="mt-6 flex flex-col items-center gap-2">
                  <span className="text-3xl opacity-40" aria-hidden>🌤</span>
                  <p className="text-sm text-ink-soft">no weather yet this month</p>
                </div>
              )}

              {/* Gentle line */}
              <p className="mt-6 text-xs font-medium text-ink-soft italic">
                every kind of weather was welcome here.
              </p>

              <button
                type="button"
                onClick={() => setOpen(false)}
                className="mt-5 text-xs font-bold text-ink-soft underline-offset-4 hover:text-ink-deep hover:underline"
              >
                close
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
