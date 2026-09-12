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

const TYPES: {
  id: CalendarEntryType;
  emoji: string;
  label: string;
  chip: string;
  cardBg: string;
  cardBorder: string;
  symbolBg: string;
  symbolText: string;
}[] = [
  {
    id: "important",
    emoji: "⭐",
    label: "Important",
    chip: "bg-mint-200 text-mint-700",
    cardBg: "bg-mint-100/70",
    cardBorder: "border-mint-300",
    symbolBg: "bg-mint-300",
    symbolText: "text-mint-700",
  },
  {
    id: "dump",
    emoji: "💭",
    label: "Thought dump",
    chip: "bg-peach-200/80 text-peach-700",
    cardBg: "bg-peach-100/70",
    cardBorder: "border-peach-300",
    symbolBg: "bg-peach-200",
    symbolText: "text-peach-700",
  },
  {
    id: "normal",
    emoji: "🌤",
    label: "Normal thought",
    chip: "bg-sky-100 text-sky-700",
    cardBg: "bg-sky-100/70",
    cardBorder: "border-sky-300",
    symbolBg: "bg-sky-200",
    symbolText: "text-sky-700",
  },
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
      if (a.time && !b.time) return -1;
      if (!a.time && b.time) return 1;
      return 0;
    });

  // ─── New entry form ─────────────────────────────────────────
  const [heading, setHeading] = useState("");
  const [body, setBody] = useState("");
  const [type, setType] = useState<CalendarEntryType>("normal");
  const [time, setTime] = useState("");

  // ─── Edit state ─────────────────────────────────────────────
  const [editing, setEditing] = useState<string | null>(null);
  const [editHeading, setEditHeading] = useState("");
  const [editBody, setEditBody] = useState("");
  const [editType, setEditType] = useState<CalendarEntryType>("normal");
  const [editTime, setEditTime] = useState("");

  const save = useTapGuard(() => {
    if (!dateKey || !body.trim()) return;
    createCalendarEntry({
      dateKey,
      type,
      heading: heading.trim() || undefined,
      body: body.trim(),
      time: time.trim() || undefined,
    });
    setHeading("");
    setBody("");
    setTime("");
    setType("normal");
  }, 450);

  const saveEdit = (id: string) => {
    updateCalendarEntry(id, {
      heading: editHeading.trim() || undefined,
      body: editBody.trim(),
      type: editType,
      time: editTime.trim() || undefined,
    });
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
        <p className="mt-2 font-bold text-ink-deep">
          That date doesn&apos;t look right
        </p>
        <Link
          to="/dashboard/calendar"
          className="mt-3 inline-block rounded-full bg-lavender-100 px-4 py-2 text-xs font-bold text-lavender-600"
        >
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

      {/* ─── New entry form ────────────────────────────────────── */}
      <section className="clay-card px-5 py-5 space-y-4">
        {/* 1. Heading */}
        <input
          type="text"
          value={heading}
          onChange={(e) => setHeading(e.target.value)}
          placeholder="Give it a small heading… (example: my normal thought)"
          autoCapitalize="sentences"
          autoCorrect="off"
          spellCheck={false}
          className="w-full rounded-xl border-0 bg-cream-soft/80 px-4 py-2.5 text-sm font-bold text-ink-deep placeholder:font-normal placeholder:text-ink-soft/60 focus:outline-none focus-visible:ring-2 focus-visible:ring-lavender-300"
        />

        {/* 2. Big body textarea */}
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="Write as much as you want… full paragraphs welcome."
          rows={5}
          autoCapitalize="sentences"
          spellCheck={false}
          className="w-full resize-none rounded-2xl border-0 bg-cream-soft px-4 py-3.5 text-sm leading-relaxed text-ink-deep shadow-[inset_0_2px_6px_rgba(99,82,150,0.08)] placeholder:text-ink-soft/60 focus:outline-none focus-visible:ring-2 focus-visible:ring-lavender-300"
        />

        {/* 3. Type chips */}
        <div className="flex flex-wrap gap-2">
          {TYPES.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setType(t.id)}
              className={cn(
                "rounded-full px-3.5 py-1.5 text-xs font-bold transition-transform",
                type === t.id
                  ? t.chip + " shadow-sm ring-1 ring-black/5"
                  : "bg-cream-soft/70 text-ink-soft",
              )}
            >
              {t.emoji} {t.label}
            </button>
          ))}
        </div>

        {/* 4. Time field — small, clearly labeled, at the bottom */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-ink-soft">🕐</span>
          <input
            type="text"
            value={time}
            onChange={(e) => setTime(e.target.value)}
            placeholder="Add a time (optional — e.g. 4:00 pm)"
            autoCorrect="off"
            spellCheck={false}
            className="w-full rounded-lg border-0 bg-cream-soft/50 px-3 py-1.5 text-[11px] text-ink-soft placeholder:text-ink-soft/50 focus:outline-none focus-visible:ring-1 focus-visible:ring-lavender-300"
          />
        </div>

        {/* 5. Save */}
        <button
          type="button"
          onClick={save}
          disabled={!body.trim()}
          className={cn(
            "w-full rounded-full py-3 text-sm font-bold transition-transform",
            body.trim()
              ? "clay-btn text-ink-deep"
              : "bg-lavender-100/50 text-ink-soft cursor-not-allowed",
          )}
        >
          🌸 tuck it into this day
        </button>
      </section>

      {/* ─── Entries list ──────────────────────────────────────── */}
      {dayEntries.length > 0 && (
        <section className="space-y-3">
          <p className="text-xs font-bold text-ink-soft pl-1">
            {dayEntries.length} {dayEntries.length === 1 ? "entry" : "entries"}{" "}
            for this day
          </p>
          {dayEntries.map((e) => {
            const tc = typeConfig(e.type);
            const isEditing = editing === e._id;

            if (isEditing) {
              return (
                <div
                  key={e._id}
                  className={cn(
                    "rounded-[1.5rem] border-2 px-5 py-4 space-y-3",
                    tc.cardBg,
                    tc.cardBorder,
                  )}
                >
                  <input
                    type="text"
                    value={editHeading}
                    onChange={(ev) => setEditHeading(ev.target.value)}
                    placeholder="Heading (optional)"
                    autoCapitalize="sentences"
                    autoCorrect="off"
                    spellCheck={false}
                    className="w-full rounded-xl border-0 bg-white/60 px-3 py-2 text-sm font-bold text-ink-deep placeholder:font-normal placeholder:text-ink-soft/50 focus:outline-none focus-visible:ring-2 focus-visible:ring-lavender-300"
                  />
                  <textarea
                    value={editBody}
                    onChange={(ev) => setEditBody(ev.target.value)}
                    rows={3}
                    autoCapitalize="sentences"
                    spellCheck={false}
                    className="w-full resize-none rounded-xl border-0 bg-white/60 px-3 py-2 text-sm text-ink-deep focus:outline-none focus-visible:ring-2 focus-visible:ring-lavender-300"
                  />
                  <div className="flex flex-wrap gap-1.5">
                    {TYPES.map((t) => (
                      <button
                        key={t.id}
                        type="button"
                        onClick={() => setEditType(t.id)}
                        className={cn(
                          "rounded-full px-2.5 py-1 text-[10px] font-bold transition-transform",
                          editType === t.id
                            ? t.chip + " shadow-sm"
                            : "bg-white/50 text-ink-soft",
                        )}
                      >
                        {t.emoji} {t.label}
                      </button>
                    ))}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-ink-soft">🕐</span>
                    <input
                      type="text"
                      value={editTime}
                      onChange={(ev) => setEditTime(ev.target.value)}
                      placeholder="Time (optional)"
                      autoCorrect="off"
                      spellCheck={false}
                      className="w-full rounded-lg border-0 bg-white/50 px-2.5 py-1 text-[11px] text-ink placeholder:text-ink-soft/50 focus:outline-none focus-visible:ring-1 focus-visible:ring-lavender-300"
                    />
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => saveEdit(e._id)}
                      className="rounded-full bg-white/80 px-3.5 py-1.5 text-xs font-bold text-ink-deep shadow-sm"
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
              );
            }

            return (
              <div
                key={e._id}
                className={cn(
                  "rounded-[1.5rem] border-2 px-5 py-4",
                  tc.cardBg,
                  tc.cardBorder,
                )}
              >
                {/* Top row: type symbol + heading + actions */}
                <div className="flex items-start gap-2.5">
                  <span
                    className={cn(
                      "flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-sm",
                      tc.symbolBg,
                      tc.symbolText,
                    )}
                  >
                    {tc.emoji}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-baseline gap-2">
                      <span className="text-[10px] font-bold text-ink-soft">
                        {new Date(e._creationTime).toLocaleTimeString(
                          undefined,
                          { hour: "numeric", minute: "2-digit" },
                        )}
                      </span>
                      {e.heading && (
                        <span className="text-sm font-bold text-ink-deep truncate">
                          {e.heading}
                        </span>
                      )}
                    </div>
                    {/* Full body */}
                    <p className="mt-1.5 text-sm leading-relaxed text-ink-deep whitespace-pre-wrap">
                      {e.body}
                    </p>
                    {/* Time badge */}
                    {e.time && (
                      <p className="mt-2 inline-flex items-center gap-1 rounded-full bg-white/60 px-2.5 py-0.5 text-[10px] font-bold text-ink-soft">
                        🕐 {e.time}
                      </p>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div className="mt-2.5 flex gap-2 pl-9">
                  <button
                    type="button"
                    onClick={() => {
                      setEditing(e._id);
                      setEditHeading(e.heading ?? "");
                      setEditBody(e.body);
                      setEditType(e.type);
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
