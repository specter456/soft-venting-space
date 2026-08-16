import { AnimatePresence, motion } from "framer-motion";
import { toast } from "sonner";
import { useEffect, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router";
import { Check, Loader2, Pause, Play, Trash2 } from "lucide-react";
import { Waveform } from "@/components/AttachmentChip";
import { createRecording, removeItem, useTable, type Recording } from "@/lib/db";
import { VIDEO_AVATARS, VOICE_COMPANION } from "@/lib/art";
import { MOODS, type MoodId, moodById } from "@/lib/moods";
import { cn } from "@/lib/utils";
import { useTapGuard } from "@/lib/useTapGuard";

type Mode = "voice" | "video";
type Stage = "idle" | "recording" | "done";

const MOOD_CHIPS = MOODS;

function fmt(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

export default function RecordScreen() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const recordings = useTable<Recording>("recordings");

  // The home grid deep-links here with ?mode=voice | ?mode=video. The query
  // param is the source of truth until the user toggles it on screen.
  const [localMode, setLocalMode] = useState<Mode | null>(null);
  const mode: Mode = localMode ?? (params.get("mode") === "video" ? "video" : "voice");
  const [mood, setMood] = useState<MoodId | null>(null);
  const [stage, setStage] = useState<Stage>("idle");
  const [seconds, setSeconds] = useState(0);
  const [savedId, setSavedId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const timerRef = useRef<number | null>(null);

  // stop the timer if we leave the screen mid-recording
  useEffect(() => {
    return () => {
      if (timerRef.current) window.clearInterval(timerRef.current);
    };
  }, []);

  // Guarded so a double-tap or held press can't start two timers at once.
  const startRecording = useTapGuard(() => {
    if (stage === "recording") return;
    setStage("recording");
    setSeconds(0);
    setSavedId(null);
    timerRef.current = window.setInterval(() => {
      setSeconds((s) => s + 1);
    }, 1000);
  }, 400);

  const stopRecording = () => {
    if (timerRef.current) window.clearInterval(timerRef.current);
    setStage("done");
  };

  const reset = () => {
    setStage("idle");
    setSeconds(0);
    setSavedId(null);
  };

  const persist = async () => {
    if (saving || savedId) return null;
    setSaving(true);
    try {
      // stored on this device only — the media itself never leaves
      const recording = createRecording({
        kind: mode,
        mood: mood ?? undefined,
        duration: Math.max(1, seconds),
      });
      setSavedId(recording._id);
      return recording._id;
    } catch (error) {
      console.error(error);
      toast("Couldn't save that recording", {
        description: "Please try again in a moment.",
      });
      return null;
    } finally {
      setSaving(false);
    }
  };

  const handleSave = async () => {
    const id = await persist();
    if (!id) return;
    toast(mode === "voice" ? "Voice note saved" : "Video vent saved", {
      description: "Kept privately — only you can open it.",
    });
  };

  const handleReflect = async () => {
    const id = await persist();
    if (!id) return;
    navigate(`/dashboard/notes/new?attach=${id}&kind=${mode}`);
  };

  const handleDiary = async () => {
    const id = await persist();
    if (!id) return;
    navigate(`/dashboard/diary?attach=${id}&kind=${mode}`);
  };

  const handleVideoExtra = async (action: "doodle" | "gif") => {
    const id = await persist();
    if (!id) return;
    if (action === "gif") {
      toast("Great choice — make it a GIF", {
        description: "Your vent becomes the first frame of something softer.",
      });
    }
    navigate("/dashboard/gif-studio");
  };

  // pick one cozy avatar per visit — stable across re-renders
  const [avatar] = useState(
    () => VIDEO_AVATARS[Math.floor(Math.random() * VIDEO_AVATARS.length)],
  );

  return (
    <div className="space-y-6">
      {/* ─── Voice | Video toggle ─────────────────────────────────── */}
      <div className="clay-chip mx-auto flex w-fit items-center gap-1 rounded-full p-1">
        {(["voice", "video"] as Mode[]).map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => {
              setLocalMode(m);
              setStage("idle");
              setSavedId(null);
            }}
            className={cn(
              "rounded-full px-5 py-2 text-sm font-bold transition-all",
              mode === m
                ? "bg-gradient-to-b from-[#cdb9f2] to-[#b59de8] text-cream-soft shadow-[inset_0_1px_0_rgba(255,255,255,0.6),0_6px_12px_-6px_rgba(118,90,190,0.55)]"
                : "text-ink-soft hover:text-ink-deep",
            )}
          >
            {m === "voice" ? "🎤 Voice" : "🎬 Video"}
          </button>
        ))}
      </div>

      <p className="text-center text-sm font-medium text-ink-soft">
        {mode === "voice"
          ? "Say it out loud — this room is quietly listening."
          : "Express it with your face, hands, or just silliness. No one sees this but you."}
      </p>

      {/* ─── Mood tags ────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center justify-center gap-2">
        {MOOD_CHIPS.map((m) => (
          <button
            key={m.id}
            type="button"
            onClick={() => setMood((prev) => (prev === m.id ? null : m.id))}
            className={cn(
              "rounded-full px-3 py-1.5 text-xs font-bold transition-all",
              mood === m.id
                ? "bg-lavender-500 text-cream-soft shadow-[0_6px_12px_-6px_rgba(118,90,190,0.6)]"
                : "clay-chip text-ink hover:-translate-y-0.5",
            )}
          >
            {m.emoji} {m.label}
          </button>
        ))}
      </div>

      {/* ─── Recorder ─────────────────────────────────────────────── */}
      <motion.div
        layout
        className="clay-card relative overflow-hidden rounded-[2.25rem] px-6 py-8"
      >
        <div
          aria-hidden
          className="pointer-events-none absolute -top-14 -right-14 h-40 w-40 rounded-full bg-lavender-100/60 blur-2xl"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute -bottom-14 -left-14 h-40 w-40 rounded-full bg-blush-100/60 blur-2xl"
        />

        <AnimatePresence mode="wait">
          {stage === "idle" && (
            <motion.div
              key="idle"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.25 }}
              className="flex flex-col items-center"
            >
              {mode === "voice" ? (
                <div className="relative">
                  <motion.div
                    animate={{ scale: [1, 1.12, 1], opacity: [0.4, 0.7, 0.4] }}
                    transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                    className="absolute inset-0 rounded-full bg-lavender-200/50 blur-md"
                  />
                  <div className="clay-chip relative flex h-28 w-28 items-center justify-center rounded-full text-6xl">
                    <span aria-hidden className="animate-floaty drop-shadow-sm">
                      {VOICE_COMPANION}
                    </span>
                  </div>
                </div>
              ) : (
                <div className="relative w-full max-w-[15rem]">
                  <div className="relative aspect-[3/4] overflow-hidden rounded-[1.8rem] bg-gradient-to-b from-mint-100 via-cream-soft to-lavender-50 shadow-[inset_0_2px_4px_rgba(255,255,255,0.9),inset_0_-6px_12px_-8px_rgba(99,82,150,0.25)]">
                    <span className="absolute top-3 left-3 rounded-full bg-ink-deep/60 px-2.5 py-1 text-[9px] font-bold tracking-wide text-cream-soft uppercase">
                      {savedId ? "saved" : "private"}
                    </span>
                    <span className="absolute top-3 right-3 rounded-full bg-white/70 px-2 py-1 text-[10px] font-bold text-lavender-600">
                      🔒 only you
                    </span>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className="animate-floaty text-7xl drop-shadow-md">
                        {avatar}
                      </span>
                    </div>
                    <span className="absolute bottom-3 left-1/2 -translate-x-1/2 rounded-full bg-white/80 px-3 py-1 text-[10px] font-bold text-ink-soft">
                      your soft avatar · not a real face
                    </span>
                  </div>
                </div>
              )}

              <button
                type="button"
                onClick={startRecording}
                className="mt-8 flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-b from-blush-300 to-blush-400 text-cream-soft shadow-[inset_0_2px_4px_rgba(255,255,255,0.5),inset_0_-6px_12px_-6px_rgba(160,80,105,0.6),0_16px_28px_-10px_rgba(200,110,135,0.7)] transition-transform hover:scale-105 active:scale-95"
                aria-label={mode === "voice" ? "Start voice recording" : "Start video recording"}
              >
                <span className="text-2xl" aria-hidden>
                  {mode === "voice" ? "🎤" : "🎥"}
                </span>
              </button>
              <p className="mt-4 text-sm font-bold text-ink-deep">
                {mode === "voice" ? "Tap to start recording" : "Tap to start your vent"}
              </p>
              <p className="mt-1 text-[11px] font-medium text-ink-soft">
                {mode === "voice"
                  ? "Safe, quiet, non-judgmental — always."
                  : "A private emotional mirror, never social media."}
              </p>
            </motion.div>
          )}

          {stage === "recording" && (
            <motion.div
              key="recording"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.25 }}
              className="flex flex-col items-center"
            >
              {mode === "voice" ? (
                <>
                  <div className="flex h-28 items-center justify-center">
                    <Waveform playing bars={34} className="h-16" />
                  </div>
                  <motion.p
                    animate={{ opacity: [0.6, 1, 0.6] }}
                    transition={{ duration: 2, repeat: Infinity }}
                    className="mt-3 text-sm font-bold text-lavender-600"
                  >
                    listening… quietly, safely
                  </motion.p>
                </>
              ) : (
                <div className="relative w-full max-w-[15rem]">
                  <div className="relative aspect-[3/4] overflow-hidden rounded-[1.8rem] bg-gradient-to-b from-mint-100 via-cream-soft to-lavender-50 shadow-[inset_0_2px_4px_rgba(255,255,255,0.9),inset_0_-6px_12px_-8px_rgba(99,82,150,0.25)]">
                    <span className="absolute top-3 left-3 flex items-center gap-1.5 rounded-full bg-ink-deep/60 px-2.5 py-1 text-[9px] font-bold tracking-wide text-cream-soft uppercase">
                      <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-blush-300" />
                      rec
                    </span>
                    <span className="absolute top-3 right-3 rounded-full bg-white/70 px-2 py-1 text-[10px] font-bold text-lavender-600">
                      🔒 only you
                    </span>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <motion.span
                        animate={{ y: [0, -8, 0], rotate: [-3, 3, -3] }}
                        transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut" }}
                        className="text-7xl drop-shadow-md"
                      >
                        {avatar}
                      </motion.span>
                    </div>
                  </div>
                </div>
              )}

              <div className="mt-5 flex items-center justify-center gap-3">
                <button
                  type="button"
                  onClick={stopRecording}
                  className="flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-b from-blush-300 to-blush-400 text-cream-soft shadow-[inset_0_2px_4px_rgba(255,255,255,0.5),inset_0_-6px_12px_-6px_rgba(160,80,105,0.6),0_16px_28px_-10px_rgba(200,110,135,0.7)] transition-transform hover:scale-105 active:scale-95"
                  aria-label="Stop recording"
                >
                  <span className="h-7 w-7 rounded-lg bg-cream-soft" />
                </button>
              </div>
              <p className="mt-4 font-mono text-2xl font-bold text-ink-deep tabular-nums">
                {fmt(seconds)}
              </p>
            </motion.div>
          )}

          {stage === "done" && (
            <motion.div
              key="done"
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.3 }}
              className="flex flex-col items-center"
            >
              <motion.div
                initial={{ scale: 0.6, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ type: "spring", stiffness: 200, damping: 14 }}
                className="clay-chip flex h-16 w-16 items-center justify-center rounded-full"
              >
                <span className="text-3xl" aria-hidden>
                  {savedId ? "🫧" : mode === "voice" ? "🎤" : "🎬"}
                </span>
              </motion.div>
              <p className="mt-4 text-lg font-bold tracking-tight text-ink-deep">
                {savedId ? "Kept safely in your space" : `A ${fmt(seconds)} ${mode} vent, just for you`}
              </p>
              <p className="mt-1 max-w-[16rem] text-center text-xs font-medium text-ink-soft">
                {savedId
                  ? "Only you can open it. Attach it to a note or your diary whenever you like."
                  : "You can save it, turn it into a reflection, or let it go."}
              </p>

              {mood && (
                <span className="mt-3 rounded-full bg-lavender-100/80 px-3 py-1.5 text-xs font-bold text-lavender-600">
                  {moodById(mood)?.emoji} feeling {moodById(mood)?.label.toLowerCase()}
                </span>
              )}

              <div className="mt-6 flex w-full flex-wrap items-center justify-center gap-2">
                <ActionChip
                  onClick={handleSave}
                  icon={savedId ? <Check className="size-3.5" /> : undefined}
                  label={savedId ? "Saved" : mode === "voice" ? "Save" : "Save privately"}
                  disabled={Boolean(savedId) || saving}
                />
                <ActionChip
                  onClick={handleReflect}
                  label="Reflect in Notes"
                  disabled={Boolean(saving)}
                />
                {mode === "voice" ? (
                  <>
                    <ActionChip onClick={handleDiary} label="Attach to Diary" disabled={Boolean(saving)} />
                    <ActionChip onClick={() => handleVideoExtra("doodle")} label="Doodle on it" disabled={Boolean(saving)} />
                  </>
                ) : (
                  <>
                    <ActionChip onClick={() => handleVideoExtra("doodle")} label="Doodle on it" disabled={Boolean(saving)} />
                    <ActionChip onClick={() => handleVideoExtra("gif")} label="Make GIF" disabled={Boolean(saving)} />
                    <ActionChip onClick={handleDiary} label="Attach to Note" disabled={Boolean(saving)} />
                  </>
                )}
                <button
                  type="button"
                  onClick={reset}
                  disabled={saving}
                  className="flex items-center gap-1.5 rounded-full bg-blush-100/80 px-4 py-2.5 text-xs font-bold text-blush-500 transition-colors hover:bg-blush-100 disabled:opacity-50"
                >
                  <Trash2 className="size-3.5" /> Delete
                </button>
              </div>
              {saving && (
                <p className="mt-3 flex items-center gap-1.5 text-xs font-semibold text-ink-soft">
                  <Loader2 className="size-3.5 animate-spin" /> tucking it away…
                </p>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* ─── Recent recordings ────────────────────────────────────── */}
      <section className="space-y-3">
        <h2 className="text-sm font-bold tracking-tight text-ink-deep">
          Recently let out
        </h2>
        {recordings === undefined ? (
          <div className="flex h-20 items-center justify-center">
            <Loader2 className="size-4 animate-spin text-lavender-400" />
          </div>
        ) : recordings.length === 0 ? (
          <div className="clay-card rounded-3xl px-5 py-6 text-center">
            <p className="text-2xl">🕊️</p>
            <p className="mt-2 text-sm font-bold text-ink-deep">
              Nothing here yet
            </p>
            <p className="mt-1 text-xs text-ink-soft">
              Your vents will gather here, quietly and privately.
            </p>
          </div>
        ) : (
          recordings.map((rec) => (
            <RecordingRow
              key={rec._id}
              kind={rec.kind}
              duration={rec.duration}
              mood={rec.mood}
              createdAt={rec._creationTime}
              onDelete={() => {
                removeItem("recordings", rec._id);
                if (savedId === rec._id) setSavedId(null);
              }}
            />
          ))
        )}
      </section>

      {/* vault hint */}
      <p className="text-center text-[11px] font-semibold text-ink-soft">
        Video vents can also live in your <span className="text-lavender-600">🔒 Photo Vault</span>
      </p>
    </div>
  );
}

function ActionChip({
  label,
  icon,
  onClick,
  disabled,
}: {
  label: string;
  icon?: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="clay-chip flex items-center gap-1.5 rounded-full px-4 py-2.5 text-xs font-bold text-ink-deep transition-transform hover:-translate-y-0.5 active:scale-95 disabled:opacity-50"
    >
      {icon}
      {label}
    </button>
  );
}

function RecordingRow({
  kind,
  duration,
  mood,
  createdAt,
  onDelete,
}: {
  kind: "voice" | "video";
  duration: number;
  mood?: string;
  createdAt: number;
  onDelete: () => void;
}) {
  const [playing, setPlaying] = useState(false);
  const moodInfo = moodById(mood);
  // Guarded so a double-tap can't toggle play/pause twice in a row.
  const togglePlay = useTapGuard(() => setPlaying((p) => !p), 400);

  useEffect(() => {
    if (!playing) return;
    const t = window.setTimeout(() => setPlaying(false), 3500);
    return () => window.clearTimeout(t);
  }, [playing]);

  return (
    <div className="clay-card flex items-center gap-3 rounded-3xl px-4 py-3">
      <button
        type="button"
        onClick={togglePlay}
        className="clay-chip flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-lavender-600 transition-transform hover:scale-105 active:scale-95"
        aria-label={playing ? "Pause" : "Play recording"}
      >
        {playing ? <Pause className="size-4" /> : <Play className="ml-0.5 size-4" />}
      </button>
      <div className="min-w-0 flex-1">
        <p className="text-xs font-bold text-ink-deep">
          {kind === "voice" ? "🎤 Voice vent" : "🎬 Video vent"}
          {moodInfo ? ` · ${moodInfo.emoji} ${moodInfo.label}` : ""}
        </p>
        <div className="mt-1 flex items-center gap-2">
          <Waveform playing={playing} bars={14} />
        </div>
        <p className="mt-1 text-[10px] font-semibold text-ink-soft">
          {fmt(duration)} ·{" "}
          {new Date(createdAt).toLocaleDateString(undefined, {
            month: "short",
            day: "numeric",
          })}{" "}
          · 🔒 private
        </p>
      </div>
      <button
        type="button"
        onClick={onDelete}
        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-ink-soft transition-colors hover:bg-blush-100/70 hover:text-blush-500"
        aria-label="Delete recording"
      >
        <Trash2 className="size-3.5" />
      </button>
    </div>
  );
}
