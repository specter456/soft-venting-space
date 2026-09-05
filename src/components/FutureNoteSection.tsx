import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { safeGetItem, safeSetItem } from "@/lib/safe-storage";
import { cn } from "@/lib/utils";

const STORAGE_KEY = "venting-future-notes";

export interface FutureNote {
  id: string;
  text: string;
  opensOn: string; // YYYY-MM-DD
  createdAt: string;
}

function loadNotes(): FutureNote[] {
  try {
    const raw = safeGetItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveNotes(notes: FutureNote[]) {
  safeSetItem(STORAGE_KEY, JSON.stringify(notes));
}

function todayKey(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

function daysFromNow(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/** Date picker chips */
const PRESETS = [
  { label: "tomorrow", date: () => daysFromNow(1) },
  { label: "in 3 days", date: () => daysFromNow(3) },
  { label: "next week", date: () => daysFromNow(7) },
  { label: "next month", date: () => daysFromNow(30) },
];

/**
 * "A Note for Future You" — sealed envelope system.
 * Shown on HomeScreen: write, seal, and open on the chosen date.
 */
export default function FutureNoteSection() {
  const [notes, setNotes] = useState<FutureNote[]>(loadNotes);
  const [writing, setWriting] = useState(false);
  const [text, setText] = useState("");
  const [selectedDate, setSelectedDate] = useState<string>("");
  const [pickedPreset, setPickedPreset] = useState<number | null>(null);
  const [showDateInput, setShowDateInput] = useState(false);
  const [openingNote, setOpeningNote] = useState<FutureNote | null>(null);
  const [shakeId, setShakeId] = useState<string | null>(null);

  const today = todayKey();



  const sealNote = useCallback(() => {
    if (!text.trim() || !selectedDate) return;
    const note: FutureNote = {
      id: `fn-${Date.now()}`,
      text: text.trim(),
      opensOn: selectedDate,
      createdAt: today,
    };
    const updated = [...notes, note];
    setNotes(updated);
    saveNotes(updated);
    setText("");
    setSelectedDate("");
    setPickedPreset(null);
    setShowDateInput(false);
    setWriting(false);
  }, [text, selectedDate, notes, today]);

  const openEnvelope = useCallback((note: FutureNote) => {
    if (note.opensOn > today) {
      setShakeId(note.id);
      setTimeout(() => setShakeId(null), 800);
      return;
    }
    setOpeningNote(note);
  }, [today]);

  const deleteNote = useCallback(
    (id: string) => {
      const updated = notes.filter((n) => n.id !== id);
      setNotes(updated);
      saveNotes(updated);
      setOpeningNote(null);
    },
    [notes],
  );

  const unsealable = notes.filter((n) => n.opensOn <= today);
  const sealed = notes.filter((n) => n.opensOn > today);

  return (
    <div className="space-y-4">
      {/* ─── "A note for future you" card ────────────────────────── */}
      {!writing && (
        <button
          type="button"
          onClick={() => setWriting(true)}
          className="clay-card w-full overflow-hidden px-5 py-4 text-left transition-transform hover:-translate-y-0.5"
        >
          <div className="flex items-center gap-3">
            <span className="text-2xl" aria-hidden>✉️</span>
            <div>
              <p className="text-sm font-bold text-ink-deep">a note for future you</p>
              <p className="text-[11px] font-medium text-ink-soft">write a little hug, seal it, and it opens when you need it</p>
            </div>
            <span className="ml-auto text-lg text-ink-soft/50" aria-hidden>🪶</span>
          </div>
        </button>
      )}

      {/* ─── Write screen ────────────────────────────────────────── */}
      <AnimatePresence>
        {writing && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="clay-card px-5 py-5">
              <p className="font-script text-lg font-bold text-ink-deep mb-3">a note for future you ✉️</p>

              <textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="write a little hug for future you…"
                rows={4}
                className="w-full rounded-2xl border-0 bg-[#FDF5E6]/70 px-4 py-3 text-sm leading-relaxed text-ink-deep shadow-[inset_0_2px_6px_rgba(90,90,140,0.08)] placeholder:text-ink-soft/60 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#8C9AD6] resize-none"
              />

              <p className="mt-3 text-xs font-semibold text-ink-soft">when should it open?</p>

              {/* Date chips */}
              <div className="mt-2 flex flex-wrap gap-2">
                {PRESETS.map((p, i) => (
                  <button
                    key={p.label}
                    type="button"
                    onClick={() => {
                      setPickedPreset(i);
                      setSelectedDate(p.date());
                      setShowDateInput(false);
                    }}
                    className={cn(
                      "rounded-full px-3.5 py-1.5 text-xs font-bold transition-all",
                      pickedPreset === i
                        ? "bg-[#8C9AD6] text-white"
                        : "bg-[#EDEBF6]/70 text-ink-deep hover:bg-[#D9DEF4]",
                    )}
                  >
                    {p.label}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => {
                    setShowDateInput(!showDateInput);
                    setPickedPreset(null);
                  }}
                  className={cn(
                    "rounded-full px-3.5 py-1.5 text-xs font-bold transition-all",
                    showDateInput
                      ? "bg-[#8C9AD6] text-white"
                      : "bg-[#EDEBF6]/70 text-ink-deep hover:bg-[#D9DEF4]",
                  )}
                >
                  pick a date
                </button>
              </div>

              {showDateInput && (
                <input
                  type="date"
                  value={selectedDate}
                  min={today}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="mt-2 rounded-xl border border-[#C4CBE8]/40 bg-[#FDF5E6]/70 px-3 py-2 text-sm text-ink-deep focus:outline-none focus-visible:ring-2 focus-visible:ring-[#8C9AD6]"
                />
              )}

              <div className="mt-4 flex items-center gap-3">
                <button
                  type="button"
                  onClick={sealNote}
                  disabled={!text.trim() || !selectedDate}
                  className="clay-btn px-5 py-2.5 text-sm font-bold text-white disabled:opacity-40"
                >
                  seal it with a hug
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setWriting(false);
                    setText("");
                    setSelectedDate("");
                    setPickedPreset(null);
                    setShowDateInput(false);
                  }}
                  className="text-xs font-bold text-ink-soft hover:text-ink-deep"
                >
                  cancel
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ─── Ready-to-open envelopes ──────────────────────────────── */}
      {unsealable.map((note) => (
        <motion.button
          key={note.id}
          type="button"
          onClick={() => openEnvelope(note)}
          whileTap={{ scale: 0.97 }}
          className="clay-card w-full overflow-hidden px-5 py-4 text-left transition-transform hover:-translate-y-0.5"
        >
          <div className="flex items-center gap-3">
            <span className="text-2xl" aria-hidden>📬</span>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-ink-deep">a gift from past-you</p>
              <p className="text-[11px] font-medium text-ink-soft">ready to open</p>
            </div>
            <span className="text-xs font-semibold text-lavender-600">open 💌</span>
          </div>
        </motion.button>
      ))}

      {/* ─── Sealed envelopes (not yet open) ──────────────────────── */}
      {sealed.map((note) => (
        <div
          key={note.id}
          className={cn(
            "clay-card w-full overflow-hidden rounded-[1.8rem] px-5 py-4 text-left",
            shakeId === note.id && "animate-[shake_0.4s_ease-in-out]",
          )}
        >
          <div className="flex items-center gap-3">
            <span className="text-2xl" aria-hidden>✉️</span>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-ink-deep">a gift from past-you · opens {formatDate(note.opensOn)}</p>
              <p className="text-[11px] font-medium text-ink-soft">sealed with care</p>
            </div>
          </div>
        </div>
      ))}

      {/* ─── Opened note overlay ──────────────────────────────────── */}
      <AnimatePresence>
        {openingNote && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[70] flex items-center justify-center bg-black/15 px-5"
            onClick={() => setOpeningNote(null)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.85, rotateZ: -5 }}
              animate={{ opacity: 1, scale: 1, rotateZ: 0 }}
              exit={{ opacity: 0, scale: 0.9 }}
              transition={{ type: "spring", stiffness: 200, damping: 18 }}
              onClick={(e) => e.stopPropagation()}
              className="clay-card relative w-full max-w-sm overflow-hidden px-6 py-8 text-center"
            >
              <div aria-hidden className="pointer-events-none absolute -top-14 -right-14 h-36 w-36 rounded-full bg-[#AAB6E3]/30 blur-2xl" />
              <div aria-hidden className="pointer-events-none absolute -bottom-14 -left-14 h-36 w-36 rounded-full bg-[#F3E7C9]/30 blur-2xl" />

              <motion.span
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.15, type: "spring", stiffness: 260, damping: 14 }}
                className="text-4xl"
                aria-hidden
              >
                💜
              </motion.span>

              <p className="font-script mt-3 text-lg font-bold text-ink-deep">
                a note from {formatDate(openingNote.createdAt)}
              </p>

              <div className="mx-auto mt-3 h-px w-20 bg-lavender-200" aria-hidden />

              <p className="mt-4 text-sm leading-relaxed text-ink whitespace-pre-wrap">
                {openingNote.text}
              </p>

              <p className="mt-4 text-[11px] font-semibold text-ink-soft">
                opened on {formatDate(today)}
              </p>

              <div className="mt-5 flex flex-col gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setOpeningNote(null);
                  }}
                  className="clay-btn px-5 py-2.5 text-sm font-bold text-white"
                >
                  write one back
                </button>
                <button
                  type="button"
                  onClick={() => deleteNote(openingNote.id)}
                  className="text-xs font-bold text-ink-soft hover:text-ink-deep"
                >
                  tuck it away
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Shake animation keyframe */}
      <style>{`
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          20% { transform: translateX(-6px); }
          40% { transform: translateX(6px); }
          60% { transform: translateX(-4px); }
          80% { transform: translateX(4px); }
        }
      `}</style>
    </div>
  );
}
