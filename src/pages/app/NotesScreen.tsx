import { motion } from "framer-motion";
import { Plus, Trash2 } from "lucide-react";
import { Link } from "react-router";
import { AttachmentChip } from "@/components/AttachmentChip";
import { removeItem, useTable, type Note } from "@/lib/db";
import { moodById } from "@/lib/moods";

export default function NotesScreen() {
  const notes = useTable<Note>("notes");

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold tracking-tight text-ink-deep">
            Your reflections
          </h2>
          <p className="text-xs font-medium text-ink-soft">
            a private journal — attachments are always optional
          </p>
        </div>
        <Link
          to="/dashboard/notes/new"
          className="clay-btn flex h-11 w-11 items-center justify-center text-cream-soft transition-transform hover:scale-105 active:scale-95"
          aria-label="Write a new note"
        >
          <Plus className="size-5" />
        </Link>
      </div>

      {notes.length === 0 ? (
        <div className="clay-card px-6 py-12 text-center">
          <span className="text-4xl">🌙</span>
          <p className="mt-3 text-lg font-bold tracking-tight text-ink-deep">
            Your journal is waiting
          </p>
          <p className="mx-auto mt-1.5 max-w-[15rem] text-sm leading-relaxed text-ink-soft">
            A word, a sentence, a feeling — notes here don&apos;t need to be
            perfect. Attachments are optional, always.
          </p>
          <Link
            to="/dashboard/notes/new"
            className="clay-btn mt-6 inline-flex items-center gap-2 px-6 py-3 text-sm font-bold text-cream-soft"
          >
            <Plus className="size-4" /> Write a note
          </Link>
        </div>
      ) : (
        notes.map((note, i) => {
          const mood = moodById(note.mood);
          return (
            <motion.article
              key={note._id}
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: Math.min(i * 0.05, 0.3) }}
              className="clay-card relative px-5 py-5"
            >
              <div className="flex items-center justify-between gap-2">
                <p className="text-[11px] font-semibold text-ink-soft">
                  {new Date(note._creationTime).toLocaleDateString(undefined, {
                    weekday: "short",
                    month: "short",
                    day: "numeric",
                  })}{" "}
                  ·{" "}
                  {new Date(note._creationTime).toLocaleTimeString([], {
                    hour: "numeric",
                    minute: "2-digit",
                  })}
                </p>
                <div className="flex items-center gap-1.5">
                  {mood && (
                    <span className="rounded-full bg-lavender-100/80 px-2.5 py-1 text-[10px] font-bold text-lavender-600">
                      {mood.emoji} {mood.label}
                    </span>
                  )}
                  <button
                    type="button"
                    onClick={() => removeItem("notes", note._id)}
                    className="flex h-7 w-7 items-center justify-center rounded-full text-ink-soft transition-colors hover:bg-blush-100/70 hover:text-blush-500"
                    aria-label="Delete note"
                  >
                    <Trash2 className="size-3.5" />
                  </button>
                </div>
              </div>

              {note.body.trim() ? (
                <p className="mt-3 text-sm leading-relaxed whitespace-pre-wrap text-ink">
                  {note.body}
                </p>
              ) : (
                <p className="mt-3 text-sm text-ink-soft italic">
                  A note held without words.
                </p>
              )}

              {note.attachments.length > 0 && (
                <div className="mt-4 flex flex-wrap gap-2">
                  {note.attachments.map((a, idx) => (
                    <AttachmentChip key={idx} attachment={a} />
                  ))}
                </div>
              )}
            </motion.article>
          );
        })
      )}
    </div>
  );
}
