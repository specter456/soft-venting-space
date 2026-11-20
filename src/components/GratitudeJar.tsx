import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useNavigate } from "react-router";
import {
  JAR_EMPTY_LINE,
  jarFillPct,
  loadJar,
  newestFirst,
  randomSlip,
  saveJar,
  tuckNote,
  type JarNote,
} from "@/lib/jar";

/* ─── Home card — count + fill level, tapping opens the jar screen ───── */

export default function GratitudeJar() {
  const navigate = useNavigate();
  const [notes] = useState<JarNote[]>(loadJar);
  const fillPct = jarFillPct(notes.length);

  return (
    <button
      type="button"
      onClick={() => navigate("/dashboard/jar")}
      className="clay-card relative overflow-hidden px-5 py-5 text-left transition-transform hover:-translate-y-0.5"
      aria-label="open your gratitude jar"
    >
      <div className="flex items-center gap-4">
        {/* Tiny jar visual — fill level mirrors the slip count */}
        <div className="relative h-14 w-10 shrink-0 overflow-hidden rounded-b-2xl rounded-t-lg border-2 border-[#C9A96A]/50 bg-[#FDF5E6]/60">
          <div
            className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-[#C9A96A]/50 to-[#F0E2B8]/40 transition-transform duration-500"
            style={{ height: `${fillPct}%` }}
          />
          <span className="absolute inset-0 flex items-center justify-center text-lg opacity-40">🫙</span>
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-bold tracking-tight text-ink-deep">gratitude jar 🫙</p>
          <p className="mt-0.5 text-[11px] font-medium text-ink-soft">
            {notes.length === 0
              ? "tuck in the good things"
              : `${notes.length} tiny ${notes.length === 1 ? "good thing" : "good things"} saved`}
          </p>
          <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-[#C9A96A]/15">
            <div
              className="h-full rounded-full bg-[#C9A96A]/60 transition-all duration-500"
              style={{ width: `${Math.max(fillPct, notes.length > 0 ? 6 : 0)}%` }}
            />
          </div>
        </div>
        <span aria-hidden className="text-ink-soft">→</span>
      </div>
    </button>
  );
}

/* ─── The jar screen ─────────────────────────────────────────────────── */

export function GratitudeJarScreen() {
  const [notes, setNotes] = useState<JarNote[]>(loadJar);
  const [text, setText] = useState("");
  const [shaking, setShaking] = useState(false);
  const [slip, setSlip] = useState<JarNote | null>(null);
  const [lastSlipId, setLastSlipId] = useState<string | null>(null);
  const [showAll, setShowAll] = useState(false);
  const [reading, setReading] = useState<JarNote | null>(null);

  const update = (next: JarNote[]) => {
    setNotes(next);
    saveJar(next);
  };

  const tuck = () => {
    if (!text.trim()) return;
    update(tuckNote(notes, text));
    setText("");
  };

  const openJar = () => {
    if (notes.length === 0) return;
    setSlip(null);
    setShaking(true);
    window.setTimeout(() => {
      const next = randomSlip(notes, lastSlipId);
      setSlip(next);
      setLastSlipId(next?.id ?? null);
      setShaking(false);
    }, 520);
  };

  const fillPct = jarFillPct(notes.length);
  const visibleSlips = notes.slice(-5);

  return (
    <div className="space-y-5">
      {/* ── The jar ─────────────────────────────────────────────── */}
      <div className="clay-card px-5 py-6">
        <motion.div
          animate={
            shaking
              ? { rotate: [0, -3, 3, -2, 2, 0], x: [0, -3, 3, -2, 2, 0] }
              : { rotate: 0, x: 0 }
          }
          transition={{ duration: 0.5, ease: "easeInOut" }}
          className="relative mx-auto h-52 w-36"
        >
          {/* lid */}
          <div className="mx-auto h-3 w-24 rounded-t-xl bg-[#C9A96A]/70" />
          <div className="mx-auto h-2 w-28 rounded-sm bg-[#B8975A]/80" />
          {/* glass body */}
          <div className="relative mt-1 h-40 w-full overflow-hidden rounded-b-[1.6rem] rounded-t-xl border-2 border-[#C9A96A]/50 bg-[#FDF5E6]/50 shadow-inner">
            <div
              className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-[#C9A96A]/45 to-[#F0E2B8]/35 transition-all duration-700"
              style={{ height: `${fillPct}%` }}
            />
            {/* paper slips inside — a few visible, more as it fills */}
            {visibleSlips.map((n, i) => (
              <span
                key={n.id}
                aria-hidden
                className="absolute rounded-[3px] bg-white/80 shadow-sm"
                style={{
                  left: `${12 + (i % 3) * 24}%`,
                  bottom: `${8 + i * 10}%`,
                  width: "2.1rem",
                  height: "1.3rem",
                  transform: `rotate(${(i % 2 === 0 ? -1 : 1) * (6 + i * 4)}deg)`,
                }}
              />
            ))}
            <span className="absolute inset-0 flex items-center justify-center text-6xl opacity-25">🫙</span>
          </div>
        </motion.div>

        <p className="mt-3 text-center text-sm font-bold tracking-tight text-ink-deep">
          {notes.length} tiny good {notes.length === 1 ? "thing" : "things"} inside
        </p>
        {notes.length === 0 && (
          <p className="mt-1 text-center text-xs font-medium text-ink-soft">{JAR_EMPTY_LINE}</p>
        )}

        <div className="mt-4 flex flex-col gap-2">
          {notes.length > 0 && (
            <button
              type="button"
              onClick={openJar}
              disabled={shaking}
              className="clay-btn w-full rounded-2xl px-5 py-3 text-sm font-bold text-white"
            >
              open the jar
            </button>
          )}
          {notes.length > 0 && (
            <button
              type="button"
              onClick={() => { setShowAll(true); setSlip(null); }}
              className="w-full rounded-full border border-[#C9A96A]/30 bg-[#FDF5E6]/40 px-4 py-2.5 text-xs font-bold text-[#8B6820] transition-transform hover:scale-[1.02]"
            >
              see all papers
            </button>
          )}
        </div>
      </div>

      {/* ── Tuck in a new slip ──────────────────────────────────── */}
      <div className="clay-card px-5 py-4">
        <p className="text-xs font-bold uppercase tracking-wide text-ink-soft">a tiny good thing</p>
        <div className="mt-2 flex gap-2">
          <input
            type="text"
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") tuck(); }}
            placeholder="something good that happened…"
            maxLength={200}
            className="flex-1 rounded-xl border-0 bg-[#FDF5E6]/60 px-3.5 py-2.5 text-sm text-ink-deep placeholder:text-ink-soft/60 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#C9A96A]/50"
          />
          <button
            type="button"
            onClick={tuck}
            disabled={!text.trim()}
            className="rounded-full bg-[#C9A96A] px-4 py-2.5 text-xs font-bold text-white transition-transform hover:scale-105 disabled:opacity-40"
          >
            tuck in
          </button>
        </div>
      </div>

      {/* ── One slip slides out ─────────────────────────────────── */}
      <AnimatePresence>
        {slip && (
          <motion.div
            initial={{ y: -28, opacity: 0, rotate: -2 }}
            animate={{ y: 0, opacity: 1, rotate: -1 }}
            exit={{ y: -20, opacity: 0 }}
            className="clay-card relative px-6 py-6 text-center"
          >
            <span aria-hidden className="absolute -top-2 left-1/2 h-4 w-10 -translate-x-1/2 rotate-[-2deg] rounded-[2px] bg-[#F0E2B8]/90" />
            <p className="font-script text-2xl leading-snug text-ink-deep">{slip.text}</p>
            <p className="mt-2 text-[11px] font-bold text-ink-soft">{slip.date}</p>
            <div className="mt-4 flex flex-col gap-2">
              <button
                type="button"
                onClick={() => { setSlip(null); setLastSlipId(null); }}
                className="w-full rounded-full border border-[#C9A96A]/30 bg-[#FDF5E6]/40 px-4 py-2.5 text-xs font-bold text-[#8B6820]"
              >
                put it back
              </button>
              <button
                type="button"
                onClick={openJar}
                disabled={shaking || notes.length < 2}
                className="w-full rounded-full px-4 py-2.5 text-xs font-bold text-[#8B6820] underline-offset-4 hover:underline disabled:opacity-40"
              >
                another slip
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Every paper, newest first ───────────────────────────── */}
      {showAll && (
        <div className="clay-card px-5 py-5">
          <div className="flex items-center justify-between">
            <p className="text-sm font-bold tracking-tight text-ink-deep">all your papers</p>
            <button
              type="button"
              onClick={() => setShowAll(false)}
              className="text-[11px] font-bold text-ink-soft hover:text-ink-deep"
            >
              close
            </button>
          </div>
          <ul className="mt-3 space-y-2">
            {newestFirst(notes).map((n) => (
              <li key={n.id}>
                <button
                  type="button"
                  onClick={() => setReading(n)}
                  className="w-full rounded-2xl bg-[#FDF5E6]/60 px-4 py-3 text-left transition-transform hover:-translate-y-0.5"
                >
                  <p className="truncate font-script text-lg text-ink-deep">{n.text}</p>
                  <p className="mt-0.5 text-[10px] font-bold text-ink-soft">{n.date}</p>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* ── Read one full-size ──────────────────────────────────── */}
      <AnimatePresence>
        {reading && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[80] flex items-center justify-center bg-black/20 px-5 backdrop-blur-sm"
            onClick={() => setReading(null)}
          >
            <motion.div
              initial={{ scale: 0.92, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.92, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="clay-card relative w-full max-w-sm px-7 py-9 text-center"
            >
              <span aria-hidden className="absolute -top-2 left-1/2 h-4 w-10 -translate-x-1/2 rotate-[-2deg] rounded-[2px] bg-[#F0E2B8]/90" />
              <p className="font-script text-3xl leading-relaxed text-ink-deep">{reading.text}</p>
              <p className="mt-3 text-[11px] font-bold text-ink-soft">{reading.date}</p>
              <button
                type="button"
                onClick={() => setReading(null)}
                className="clay-btn mt-6 w-full rounded-2xl px-5 py-3 text-sm font-bold text-white"
              >
                tuck it back
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
