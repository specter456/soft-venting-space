import { useState, useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { scopedGetItem, scopedSetItem } from "@/lib/safe-storage";
import { useTapGuard } from "@/lib/useTapGuard";

const JAR_KEY = "venting-gratitude-jar";

interface JarNote {
  id: string;
  text: string;
  date: string;
}

function loadJar(): JarNote[] {
  try {
    const raw = scopedGetItem(JAR_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as JarNote[];
  } catch {
    return [];
  }
}

function saveJar(notes: JarNote[]) {
  scopedSetItem(JAR_KEY, JSON.stringify(notes));
}

export default function GratitudeJar() {
  const [notes, setNotes] = useState<JarNote[]>(loadJar);
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const [dropped, setDropped] = useState<JarNote | null>(null);
  const [showConfetti, setShowConfetti] = useState(false);
  const [confettiMsg, setConfettiMsg] = useState("");

  useEffect(() => {
    saveJar(notes);
  }, [notes]);

  const addNote = useTapGuard(() => {
    if (!text.trim()) return;
    const note: JarNote = {
      id: `g-${Date.now()}`,
      text: text.trim(),
      date: new Date().toLocaleDateString(undefined, { month: "short", day: "numeric" }),
    };
    const next = [...notes, note];
    setNotes(next);
    setText("");

    // Milestone check
    if (next.length === 10 || next.length === 30 || next.length === 50) {
      setShowConfetti(true);
      setConfettiMsg(
        next.length === 10
          ? "your jar is glowing ✨"
          : next.length === 30
            ? "your jar is shining so bright ✨"
            : "your jar is full of light ✨"
      );
      setTimeout(() => setShowConfetti(false), 3000);
    }
  }, 400);

  const openMemory = useTapGuard(() => {
    if (notes.length === 0) return;
    const random = notes[Math.floor(Math.random() * notes.length)];
    setDropped(random);
  }, 400);

  // Fill level (cap at ~100% around 30 notes)
  const fillPct = Math.min(100, (notes.length / 30) * 100);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="clay-card relative overflow-hidden px-5 py-5 text-left transition-transform hover:-translate-y-0.5"
      >
        <div className="flex items-center gap-4">
          {/* Tiny jar visual */}
          <div className="relative h-14 w-10 shrink-0 overflow-hidden rounded-b-2xl rounded-t-lg border-2 border-[#C9A96A]/50 bg-[#FDF5E6]/60">
            <div
              className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-[#C9A96A]/50 to-[#F0E2B8]/40 transition-all duration-500"
              style={{ height: `${fillPct}%` }}
            />
            <span className="absolute inset-0 flex items-center justify-center text-lg opacity-40">🫙</span>
          </div>
          <div>
            <p className="text-sm font-bold tracking-tight text-ink-deep">gratitude jar 🫙</p>
            <p className="mt-0.5 text-[11px] font-medium text-ink-soft">
              {notes.length === 0
                ? "tuck in the good things"
                : `${notes.length} tiny ${notes.length === 1 ? "good thing" : "good things"} saved`}
            </p>
          </div>
        </div>
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[80] flex items-center justify-center bg-black/20 px-5 backdrop-blur-sm"
            onClick={() => { setOpen(false); setDropped(null); }}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="clay-card relative w-full max-w-sm overflow-hidden px-6 py-7"
            >
              <p className="text-center text-lg font-bold tracking-tight text-ink-deep">gratitude jar 🫙</p>
              <p className="mt-1 text-center text-xs font-medium text-ink-soft">
                {notes.length} tiny good {notes.length === 1 ? "thing" : "things"} inside
              </p>

              {/* Jar visual */}
              <div className="relative mx-auto mt-4 h-36 w-28 overflow-hidden rounded-b-3xl rounded-t-xl border-2 border-[#C9A96A]/40 bg-[#FDF5E6]/40">
                <div
                  className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-[#C9A96A]/40 to-[#F0E2B8]/30 transition-all duration-700"
                  style={{ height: `${fillPct}%` }}
                />
                {notes.slice(-6).map((n, i) => (
                  <motion.span
                    key={n.id}
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 0.6, y: 0 }}
                    className="absolute text-[10px] text-[#8B6820]"
                    style={{ left: `${15 + (i % 3) * 25}%`, top: `${60 - i * 8}%` }}
                  >
                    ✦
                  </motion.span>
                ))}
              </div>

              {showConfetti && (
                <motion.p
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="mt-3 text-center text-sm font-bold text-[#C9A96A]"
                >
                  {confettiMsg}
                </motion.p>
              )}

              {!dropped ? (
                <div className="mt-5 space-y-3">
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={text}
                      onChange={(e) => setText(e.target.value)}
                      onKeyDown={(e) => { if (e.key === "Enter") addNote(); }}
                      placeholder="a tiny good thing…"
                      maxLength={200}
                      className="flex-1 rounded-xl border-0 bg-[#FDF5E6]/60 px-3.5 py-2.5 text-sm text-ink-deep placeholder:text-ink-soft/60 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#C9A96A]/50"
                    />
                    <button
                      type="button"
                      onClick={addNote}
                      disabled={!text.trim()}
                      className="rounded-full bg-[#C9A96A] px-4 py-2.5 text-xs font-bold text-white transition-all hover:scale-105 disabled:opacity-40"
                    >
                      tuck in
                    </button>
                  </div>
                  {notes.length > 0 && (
                    <button
                      type="button"
                      onClick={openMemory}
                      className="w-full rounded-full border border-[#C9A96A]/30 bg-[#FDF5E6]/40 px-4 py-2.5 text-xs font-bold text-[#8B6820] transition-all hover:scale-[1.02]"
                    >
                      open a memory 💌
                    </button>
                  )}
                </div>
              ) : (
                <motion.div
                  initial={{ y: 30, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  className="mt-5 rounded-2xl bg-[#FDF5E6]/60 p-4 text-center"
                >
                  <p className="text-2xl">💌</p>
                  <p className="mt-2 text-sm font-bold text-ink-deep">"{dropped.text}"</p>
                  <p className="mt-1 text-[10px] font-medium text-ink-soft">{dropped.date}</p>
                  <button
                    type="button"
                    onClick={() => setDropped(null)}
                    className="mt-3 rounded-full px-4 py-2 text-xs font-bold text-[#8B6820] underline-offset-4 hover:underline"
                  >
                    put it back
                  </button>
                </motion.div>
              )}

              <button
                type="button"
                onClick={() => { setOpen(false); setDropped(null); }}
                className="mt-4 w-full text-center text-[11px] font-bold text-ink-soft hover:text-ink-deep"
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
