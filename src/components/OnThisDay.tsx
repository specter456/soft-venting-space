import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useTable, type DiaryEntry, type CalendarEntry } from "@/lib/db";


/**
 * Shows a card on Home if a diary page or calendar entry exists
 * from a previous month or year with the same month+day as today.
 * Never shows an empty card.
 */
export default function OnThisDay() {
  const diaryEntries = useTable<DiaryEntry>("diaryEntries");
  const calendarEntries = useTable<CalendarEntry>("calendarEntries");
  const [expanded, setExpanded] = useState(false);

  const now = new Date();
  const todayMonth = now.getMonth();
  const todayDate = now.getDate();
  const todayYear = now.getFullYear();

  // Check diary entries: find any from a different month+year
  const matchingDiary = diaryEntries.find((entry) => {
    try {
      // diary entries have a dateKey-like field or we check _id timestamp
      // Since DiaryEntry doesn't have a date field directly, we use _id which is a timestamp
      const entryDate = new Date(Number(entry._id));
      if (isNaN(entryDate.getTime())) return false;
      return (
        entryDate.getMonth() === todayMonth &&
        entryDate.getDate() === todayDate &&
        (entryDate.getFullYear() !== todayYear || entryDate.getMonth() !== todayMonth)
      );
    } catch {
      return false;
    }
  });

  // Check calendar entries: find any from a different month+year
  const matchingCalendar = calendarEntries.find((entry) => {
    try {
      const parts = entry.dateKey.split("-");
      const entryMonth = parseInt(parts[1], 10) - 1;
      const entryDate = parseInt(parts[2], 10);
      const entryYear = parseInt(parts[0], 10);
      return (
        entryMonth === todayMonth &&
        entryDate === todayDate &&
        entryYear !== todayYear
      );
    } catch {
      return false;
    }
  });

  const match = matchingDiary
    ? { type: "diary" as const, entry: matchingDiary }
    : matchingCalendar
      ? { type: "calendar" as const, entry: matchingCalendar }
      : null;

  if (!match) return null;

  const preview =
    match.type === "diary"
      ? (match.entry as DiaryEntry).body?.slice(0, 80) || "a page from your diary"
      : (match.entry as CalendarEntry).heading || (match.entry as CalendarEntry).body?.slice(0, 80) || "a thought you had";

  return (
    <>
      <button
        type="button"
        onClick={() => setExpanded(true)}
        className="clay-card w-full overflow-hidden px-5 py-4 text-left transition-transform hover:-translate-y-0.5"
      >
        <div className="flex items-center gap-3">
          <span className="text-2xl" aria-hidden>🌷</span>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-ink-deep">on this day — look what you carried</p>
            <p className="mt-0.5 truncate text-[11px] font-medium text-ink-soft">{preview}</p>
          </div>
        </div>
      </button>

      {/* ─── Expanded read-only view ──────────────────────────────── */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[70] flex items-center justify-center bg-black/15 px-5"
            onClick={() => setExpanded(false)}
          >
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 16 }}
              transition={{ type: "spring", stiffness: 220, damping: 20 }}
              onClick={(e) => e.stopPropagation()}
              className="clay-card relative w-full max-w-sm overflow-hidden px-6 py-8 text-center max-h-[80vh] overflow-y-auto"
            >
              <div aria-hidden className="pointer-events-none absolute -top-14 -right-14 h-36 w-36 rounded-full bg-[#AAB6E3]/30 blur-lg" />
              <div aria-hidden className="pointer-events-none absolute -bottom-14 -left-14 h-36 w-36 rounded-full bg-[#F3E7C9]/30 blur-lg" />

              <span className="text-3xl" aria-hidden>🌷</span>

              <p className="font-script mt-3 text-lg font-bold text-ink-deep">
                on this day
              </p>

              <div className="mx-auto mt-2 h-px w-20 bg-lavender-200" aria-hidden />

              <div className="mt-4 text-left">
                {match.type === "diary" ? (
                  <>
                    <p className="text-sm font-bold text-ink-deep mb-1">from your diary</p>
                    <p className="text-sm leading-relaxed text-ink whitespace-pre-wrap">
                      {(match.entry as DiaryEntry).body}
                    </p>
                  </>
                ) : (
                  <>
                    {(match.entry as CalendarEntry).heading && (
                      <p className="text-sm font-bold text-ink-deep mb-1">
                        {(match.entry as CalendarEntry).heading}
                      </p>
                    )}
                    <p className="text-sm leading-relaxed text-ink whitespace-pre-wrap">
                      {(match.entry as CalendarEntry).body}
                    </p>
                  </>
                )}
              </div>

              <button
                type="button"
                onClick={() => setExpanded(false)}
                className="mt-6 clay-btn px-5 py-2.5 text-sm font-bold text-white"
              >
                back to today
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
