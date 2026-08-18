import { Star } from "lucide-react";
import { useState } from "react";
import { Link } from "react-router";
import {
  buildMonthCells,
  dateKeyFor,
  formatMonthLabel,
  WEEKDAY_LABELS,
} from "@/lib/calendar";
import { useTable, type CalendarEntry } from "@/lib/db";
import { useTapGuard } from "@/lib/useTapGuard";

/** Dot colors per entry type — green / yellow / pale blue. */
const DOT: Record<CalendarEntry["type"], string> = {
  important: "bg-mint-400",
  dump: "bg-peach-300",
  normal: "bg-mist-300",
};

export default function CalendarScreen() {
  const entries = useTable<CalendarEntry>("calendarEntries");
  const today = new Date();
  const todayKey = dateKeyFor(today);
  const [view, setView] = useState(() => new Date(today.getFullYear(), today.getMonth(), 1));

  const prevMonth = useTapGuard(() => {
    setView((v) => new Date(v.getFullYear(), v.getMonth() - 1, 1));
  });
  const nextMonth = useTapGuard(() => {
    setView((v) => new Date(v.getFullYear(), v.getMonth() + 1, 1));
  });
  const backToToday = useTapGuard(() => {
    setView((v) =>
      v.getMonth() === today.getMonth() && v.getFullYear() === today.getFullYear()
        ? v
        : new Date(today.getFullYear(), today.getMonth(), 1),
    );
  });

  const byDay = new Map<string, CalendarEntry[]>();
  for (const e of entries) {
    const list = byDay.get(e.dateKey);
    if (list) list.push(e);
    else byDay.set(e.dateKey, [e]);
  }

  const isCurrentMonth =
    view.getMonth() === today.getMonth() && view.getFullYear() === today.getFullYear();
  const cells = buildMonthCells(view);

  return (
    <div className="space-y-5">
      {/* ─── Month header: gentle arrows ─────────────────────────── */}
      <div className="flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={prevMonth}
          className="clay-chip flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-lg text-ink-deep transition-transform hover:scale-105 active:scale-95"
          aria-label="Previous month"
        >
          <span aria-hidden>‹</span>
        </button>
        <div className="flex flex-col items-center">
          <h2 className="text-lg font-bold tracking-tight text-ink-deep">
            {formatMonthLabel(view)}
          </h2>
          {!isCurrentMonth && (
            <button
              type="button"
              onClick={backToToday}
              className="mt-0.5 rounded-full bg-lavender-100/80 px-2.5 py-0.5 text-[10px] font-bold text-lavender-600 transition-colors hover:bg-lavender-200/80"
            >
              back to today
            </button>
          )}
        </div>
        <button
          type="button"
          onClick={nextMonth}
          className="clay-chip flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-lg text-ink-deep transition-transform hover:scale-105 active:scale-95"
          aria-label="Next month"
        >
          <span aria-hidden>›</span>
        </button>
      </div>

      {/* ─── Weekday labels ──────────────────────────────────────── */}
      <div className="grid grid-cols-7 gap-1.5" aria-hidden>
        {WEEKDAY_LABELS.map((w) => (
          <p
            key={w}
            className="text-center text-[10px] font-bold tracking-wide text-ink-soft"
          >
            {w}
          </p>
        ))}
      </div>

      {/* ─── Day grid ────────────────────────────────────────────── */}
      <div className="grid grid-cols-7 gap-1.5">
        {cells.map((cell) => {
          if (!cell.inMonth) {
            return <div key={cell.dateKey} aria-hidden className="aspect-square" />;
          }
          const dayEntries = byDay.get(cell.dateKey);
          const isToday = cell.dateKey === todayKey;
          const hasImportant = dayEntries?.some((e) => e.type === "important") ?? false;
          const types = new Set(dayEntries?.map((e) => e.type) ?? []);
          return (
            <Link
              key={cell.dateKey}
              to={`/dashboard/calendar/${cell.dateKey}`}
              aria-label={`Open ${cell.dateKey}`}
              className={[
                "relative flex aspect-square flex-col items-center justify-center rounded-2xl border transition-transform",
                isToday
                  ? "border-lavender-300 bg-lavender-200/70 shadow-[inset_0_1px_0_rgba(255,255,255,0.7)]"
                  : "border-white/70 bg-white/55 shadow-[0_4px_10px_-5px_rgba(96,78,150,0.28)]",
              ].join(" ")}
            >
              {hasImportant && (
                <Star
                  aria-hidden
                  className="absolute top-0.5 right-1 size-2.5 fill-mint-400 text-mint-400"
                />
              )}
              <span
                className={
                  isToday
                    ? "text-xs font-extrabold text-ink-deep"
                    : "text-xs font-bold text-ink"
                }
              >
                {cell.date.getDate()}
              </span>
              <span className="mt-1 flex h-1.5 items-center gap-[3px]" aria-hidden>
                {(["important", "dump", "normal"] as const).map((t) =>
                  types.has(t) ? (
                    <span
                      key={t}
                      className={`size-1.5 rounded-full ${DOT[t]}`}
                    />
                  ) : null,
                )}
              </span>
            </Link>
          );
        })}
      </div>

      {/* ─── Legend ──────────────────────────────────────────────── */}
      <div className="clay-chip flex items-center justify-center gap-4 rounded-full px-4 py-2.5">
        <span className="flex items-center gap-1.5 text-[10px] font-bold text-ink-soft">
          <span className="size-2 rounded-full bg-mint-400" aria-hidden /> important
        </span>
        <span className="flex items-center gap-1.5 text-[10px] font-bold text-ink-soft">
          <span className="size-2 rounded-full bg-peach-300" aria-hidden /> thought dump
        </span>
        <span className="flex items-center gap-1.5 text-[10px] font-bold text-ink-soft">
          <span className="size-2 rounded-full bg-mist-300" aria-hidden /> normal
        </span>
      </div>

      {/* ─── Gentle hint ─────────────────────────────────────────── */}
      <p className="text-center text-[11px] font-semibold text-ink-soft">
        tap a day to tuck something into it 🌸
      </p>
    </div>
  );
}
