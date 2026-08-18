import { useState } from "react";
import { Link, useParams } from "react-router";
import {
  createCalendarEntry,
  removeItem,
  updateCalendarEntry,
  useTable,
  type CalendarEntry,
  type CalendarEntryType,
} from "@/lib/db";
import { parseDateKey, formatDayHeader } from "@/lib/calendar";
import { useTapGuard } from "@/lib/useTapGuard";
import { cn } from "@/lib/utils";

const TYPES: { id: CalendarEntryType; emoji: string; label: string; chip: string; card: string }[] = [
  { id: "important", emoji: "⭐", label: "Important", chip: "bg-mint-200 text-mint-700", card: "bg-mint-50 border-mint-200" },
  { id: "dump", emoji: "💭", label: "Thought dump", chip: "bg-peach-100 text-peach-600", card: "bg-peach-50 border-peach-200" },
  { id: "normal", emoji: "🌤", label: "Normal thought", chip: "bg-sky-50 text-sky-600", card: "bg-sky-50 border-sky-200" },
];

function typeConfig(t: CalendarEntryType) {
  return TYPES.find((x) => x.id === t) ?? TYPES[2];
}

export default function CalendarDayView() {
  const { dateKey } = useParams<{ dateKey: string }>();
  const date = dateKey ? parseDateKey(dateKey) : null;
  const entries = useTable<CalendarEntry>("calendarEntries");
  const dayEntries = entries
    .filter((e) => e.dateKey === dateKey)
    .sort((a, b) => {
      // timed schedule items first, then untimed thoughts
      if (a.time && !b.time) return -1;
      if (!a.time && b.time) return 1;
      return 0;
    });

  const [body, setBody] = useState("");
  const [type, setType] = useState<CalendarEntryType>("normal");
  const [time, setTime] = useState("");
  const [editing, setEditing] = useState<string | null>(null);
  const [editBody, setEditBody] = useState("");
  const [editTime, setEditTime] = useState("");

  const save = useTapGuard(() => {
    if (!dateKey || !body.trim()) return;
    createCalendarEntry({
      dateKey,
      type,
      body: body.trim(),
      time: time.trim() || undefined,
    });
    setBody("");
    setTime("");
    setType("normal");
  }, 450);

  const saveEdit = (id: string) => {
    updateCalendarEntry(id, { body: editBody.trim(), time: editTime.trim() || undefined });
    setEditing(null);
  };

  const deleteEntry = useTapGuard((id: string) => {
    removeItem("calendarEntries", id);
    if (editing === id) setEditing(null);
  }, 400);

  if (!date) {
    return (
      <div className="text-center text-sm text-ink-soft py-12">
        <p className="text-lg">🌸</p>
        <p className="mt-2 font-bold text-ink-deep">That date doesn't look right</p>
        <Link to="/dashboard/calendar" className="mt-3 inline-block rounded-full bg-lavender-100 px-4 py-2 text-xs font-bold text-lavender-600">
          ← back to calendar
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Back link */}
      <Link
        to="/dashboard/calendar"
        className="clay-chip inline-flex items-center gap-1 rounded-full px-4 py-2 text-xs font-bold text-ink-deep transition-transform hover:scale-105 active:scale-95"
      >
        ← back to calendar
      </Link>

      {/* Day header */}
      <div className="text-center">
        <p className="text-lg font-bold tracking-tight text-ink-deep">
          {formatDayHeader(date)}
        </p>
      </div>

      {/* Writing box */}
      <section className="clay-card rounded-[2rem] px-5 py-5">
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="Write anything… schedule, thoughts, important things."
          rows={3}
          autoCapitalize="sentences"
          spellCheck={false}
          className="w-full resize-none rounded-2xl border-0 bg-cream-soft px-4 py-3 text-sm leading-relaxed text-ink-deep shadow-[inset_0_2px_6px_rgba(99,82,150,0.08)] placeholder:text-ink-soft/70 focus:outline-none focus-visible:ring-2 focus-visible:ring-lavender-300"
        />

        {/* Type chips */}
        <div className="mt-3 flex flex-wrap gap-2">
          {TYPES.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setType(t.id)}
              className={cn(
                "rounded-full px-3.5 py-1.5 text-xs font-bold transition-all",
                type === t.id ? t.chip + " shadow-sm" : "bg-cream-soft/70 text-ink-soft"
              )}
            >
              {t.emoji} {t.label}
            </button>
          ))}
        </div>

        {/* Optional time */}
        <input
          type="text"
          value={time}
          onChange={(e) => setTime(e.target.value)}
          placeholder='Optional time (e.g. "4:00 pm")'
          autoCorrect="off"
          spellCheck={false}
          className="mt-3 w-full rounded-xl border-0 bg-cream-soft/70 px-3.5 py-2 text-xs font-medium text-ink placeholder:text-ink-soft/60 focus:outline-none focus-visible:ring-2 focus-visible:ring-lavender-300"
        />

        {/* Save */}
        <button
          type="button"
          onClick={save}
          disabled={!body.trim()}
          className={cn(
            "mt-4 w-full rounded-full py-3 text-sm font-bold transition-all",
            body.trim()
              ? "clay-btn text-ink-deep"
              : "bg-lavender-100/50 text-ink-soft cursor-not-allowed"
          )}
        >
          🌸 tuck it into this day
        </button>
      </section>

      {/* Entries list */}
      {dayEntries.length > 0 && (
        <section className="space-y-3">
          <p className="text-xs font-bold text-ink-soft pl-1">entries for this day</p>
          {dayEntries.map((e) => {
            const tc = typeConfig(e.type);
            const isEditing = editing === e._id;

            return (
              <div key={e._id} className={cn("rounded-[1.5rem] border px-5 py-4", tc.card)}>
                {isEditing ? (
                  <div className="space-y-2">
                    <textarea
                      value={editBody}
                      onChange={(ev) => setEditBody(ev.target.value)}
                      rows={2}
                      autoCapitalize="sentences"
                      spellCheck={false}
                      className="w-full resize-none rounded-xl border-0 bg-white/70 px-3 py-2 text-sm text-ink-deep focus:outline-none focus-visible:ring-2 focus-visible:ring-lavender-300"
                    />
                    <input
                      type="text"
                      value={editTime}
                      onChange={(ev) => setEditTime(ev.target.value)}
                      placeholder='Time (e.g. "4:00 pm")'
                      autoCorrect="off"
                      spellCheck={false}
                      className="w-full rounded-xl border-0 bg-white/70 px-3 py-2 text-xs text-ink focus:outline-none focus-visible:ring-2 focus-visible:ring-lavender-300"
                    />
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => saveEdit(e._id)}
                        className="rounded-full bg-white/80 px-3.5 py-1.5 text-xs font-bold text-ink-deep"
                      >
                        save
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditing(null)}
                        className="rounded-full px-3 py-1.5 text-xs font-bold text-ink-soft"
                      >
                        cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="flex items-start gap-2">
                      <span className="text-base leading-none mt-0.5" aria-hidden>
                        {tc.emoji}
                      </span>
                      <p className="flex-1 text-sm leading-relaxed text-ink-deep">
                        {e.body}
                      </p>
                    </div>
                    {e.time && (
                      <p className="mt-1.5 pl-6 text-[11px] font-bold text-ink-soft">
                        🕐 {e.time}
                      </p>
                    )}
                    <div className="mt-2 flex gap-2 pl-6">
                      <button
                        type="button"
                        onClick={() => {
                          setEditing(e._id);
                          setEditBody(e.body);
                          setEditTime(e.time ?? "");
                        }}
                        className="rounded-full px-3 py-1 text-[10px] font-bold text-ink-soft transition-colors hover:bg-white/60"
                      >
                        edit
                      </button>
                      <button
                        type="button"
                        onClick={() => deleteEntry(e._id)}
                        className="rounded-full px-3 py-1 text-[10px] font-bold text-blush-400 transition-colors hover:bg-blush-50"
                      >
                        delete
                      </button>
                    </div>
                  </>
                )}
              </div>
            );
          })}
        </section>
      )}

      {dayEntries.length === 0 && (
        <p className="text-center text-[11px] font-semibold text-ink-soft pt-2">
          nothing here yet — tuck something into this day 🌸
        </p>
      )}
    </div>
  );
}
