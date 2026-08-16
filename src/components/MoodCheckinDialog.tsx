import { AnimatePresence, motion } from "framer-motion";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { toast } from "sonner";
import { useState } from "react";
import { ArrowLeft, ArrowRight, Loader2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { MoodBubble } from "@/components/MoodBubble";
import {
  INTENSITY_LABELS,
  MOODS,
  type MoodId,
  moodById,
  todayDateKey,
} from "@/lib/moods";
import { cn } from "@/lib/utils";

type Stage = "mood" | "intensity" | "note" | "done";

interface MoodCheckinDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialMood?: MoodId | null;
  initialIntensity?: number | null;
}

const INTENSITY_EMOJI = ["🌱", "🍃", "☁️", "🌧️", "⛈️"];

export function MoodCheckinDialog({
  open,
  onOpenChange,
  initialMood = null,
  initialIntensity = null,
}: MoodCheckinDialogProps) {
  const checkIn = useMutation(api.moods.checkIn);
  const [stage, setStage] = useState<Stage>("mood");
  const [mood, setMood] = useState<MoodId | null>(null);
  const [intensity, setIntensity] = useState(3);
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);

  // Reset the flow each time the dialog opens. Done as a render-phase
  // adjustment guarded by lastOpen (instead of an effect) so no cascade
  // renders are triggered — the dialog simply starts fresh on every open.
  const [lastOpen, setLastOpen] = useState(open);
  if (open !== lastOpen) {
    setLastOpen(open);
    if (open) {
      setMood(initialMood);
      setIntensity(initialIntensity ?? 3);
      setNote("");
      setStage(initialMood ? "intensity" : "mood");
    }
  }

  const selected = mood ? moodById(mood) : undefined;

  const handleSave = async () => {
    if (!mood || saving) return;
    setSaving(true);
    try {
      await checkIn({
        dateKey: todayDateKey(),
        mood,
        intensity,
        note: note.trim() || undefined,
      });
      toast("Mood saved", {
        description: "Thank you for checking in — this feeling is safe here.",
      });
      setStage("done");
    } catch (error) {
      console.error("Check-in failed:", error);
      toast("Couldn't save your mood", {
        description: "Please try again in a moment.",
      });
    } finally {
      setSaving(false);
    }
  };

  const stepDots = (
    <div className="flex items-center justify-center gap-1.5">
      {(["mood", "intensity", "note"] as Stage[]).map((s) => (
        <span
          key={s}
          className={cn(
            "h-1.5 rounded-full transition-all duration-300",
            stage === s
              ? "w-6 bg-lavender-400"
              : "w-1.5 bg-lavender-200",
          )}
        />
      ))}
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={stage !== "done"}
        className="max-h-[88dvh] w-[calc(100%-1.5rem)] overflow-y-auto rounded-[2rem] border-0 bg-gradient-to-b from-cream-soft via-cream to-lavender-50 p-0 text-ink shadow-[0_30px_60px_-20px_rgba(70,64,92,0.45)] sm:max-w-md"
      >
        <DialogHeader className="sr-only">
          <DialogTitle>Mood check-in</DialogTitle>
          <DialogDescription>
            Check in with how you're feeling today
          </DialogDescription>
        </DialogHeader>

        <AnimatePresence mode="wait">
          {stage === "mood" && (
            <motion.div
              key="mood"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.25 }}
              className="px-6 pt-7 pb-6"
            >
              {stepDots}
              <p className="mt-5 text-center text-xl font-bold tracking-tight text-ink-deep">
                How are you feeling?
              </p>
              <p className="mt-1.5 text-center text-sm text-ink-soft">
                Tap one — there&apos;s no wrong answer here.
              </p>
              <div className="mt-6 grid grid-cols-4 gap-x-2 gap-y-5">
                {MOODS.map((m) => (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => {
                      setMood(m.id);
                      setStage("intensity");
                    }}
                    className="group flex flex-col items-center gap-1.5"
                  >
                    <MoodBubble
                      mood={m}
                      size="md"
                      className="group-hover:scale-105"
                    />
                    <span className="text-[11px] font-bold text-ink-soft group-hover:text-ink">
                      {m.label}
                    </span>
                  </button>
                ))}
              </div>
              <p className="mt-6 text-center text-xs text-ink-soft">
                You can check in once a day — you can always change it.
              </p>
            </motion.div>
          )}

          {stage === "intensity" && (
            <motion.div
              key="intensity"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.25 }}
              className="px-6 pt-7 pb-6"
            >
              <div className="flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setStage("mood")}
                  className="flex h-8 w-8 items-center justify-center rounded-full text-ink-soft transition-colors hover:bg-lavender-100 hover:text-ink-deep"
                  aria-label="Back"
                >
                  <ArrowLeft className="size-4" />
                </button>
                {stepDots}
                <span className="w-8" />
              </div>
              <p className="mt-5 text-center text-xl font-bold tracking-tight text-ink-deep">
                How big is this feeling?
              </p>
              <p className="mt-1.5 text-center text-sm text-ink-soft">
                From a whisper to a storm — all of it counts.
              </p>
              <div className="mt-7 flex items-end justify-center gap-2.5">
                {[1, 2, 3, 4, 5].map((n) => {
                  const active = intensity === n;
                  return (
                    <button
                      key={n}
                      type="button"
                      onClick={() => setIntensity(n)}
                      className={cn(
                        "flex flex-col items-center gap-1.5",
                      )}
                      aria-label={`Intensity ${n}: ${INTENSITY_LABELS[n]}`}
                    >
                      <span
                        className={cn(
                          "flex items-center justify-center rounded-full font-bold text-ink-deep transition-all duration-200",
                          n === 1 && "h-10 w-10 text-sm",
                          n === 2 && "h-11 w-11 text-sm",
                          n === 3 && "h-12 w-12 text-base",
                          n === 4 && "h-14 w-14 text-lg",
                          n === 5 && "h-16 w-16 text-xl",
                          active
                            ? "mood-bubble mood-bubble-selected scale-110"
                            : "clay-chip hover:scale-105",
                        )}
                      >
                        <span aria-hidden>{INTENSITY_EMOJI[n - 1]}</span>
                      </span>
                    </button>
                  );
                })}
              </div>
              <p className="mt-5 text-center text-sm font-bold text-lavender-600">
                {INTENSITY_LABELS[intensity]}
              </p>
              <Button
                type="button"
                onClick={() => setStage("note")}
                className="clay-btn mt-6 h-12 w-full rounded-2xl text-sm font-bold text-cream-soft"
              >
                Continue
                <ArrowRight className="size-4" />
              </Button>
            </motion.div>
          )}

          {stage === "note" && (
            <motion.div
              key="note"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.25 }}
              className="px-6 pt-7 pb-6"
            >
              <div className="flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setStage("intensity")}
                  className="flex h-8 w-8 items-center justify-center rounded-full text-ink-soft transition-colors hover:bg-lavender-100 hover:text-ink-deep"
                  aria-label="Back"
                >
                  <ArrowLeft className="size-4" />
                </button>
                {stepDots}
                <span className="w-8" />
              </div>
              <p className="mt-5 text-center text-xl font-bold tracking-tight text-ink-deep">
                Want to let a little out?
              </p>
              <p className="mt-1.5 text-center text-sm text-ink-soft">
                A word, a sentence, or nothing at all — it&apos;s all welcome.
              </p>
              {selected && (
                <div className="mt-5 flex items-center justify-center gap-2">
                  <MoodBubble mood={selected} size="sm" />
                  <span className="text-sm font-bold text-ink">
                    Feeling {selected.label.toLowerCase()}
                  </span>
                </div>
              )}
              <Textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="This note is only ever yours…"
                className="mt-5 min-h-28 rounded-2xl border-lavender-200/70 bg-cream-soft text-sm leading-relaxed text-ink-deep shadow-[inset_0_2px_6px_rgba(99,82,150,0.08)] placeholder:text-ink-soft/70 focus-visible:ring-lavender-300"
              />
              <Button
                type="button"
                onClick={handleSave}
                disabled={saving}
                className="clay-btn mt-5 h-12 w-full rounded-2xl text-sm font-bold text-cream-soft"
              >
                {saving ? (
                  <>
                    <Loader2 className="size-4 animate-spin" />
                    Tucking it away…
                  </>
                ) : (
                  <>
                    Save my check-in
                    <ArrowRight className="size-4" />
                  </>
                )}
              </Button>
            </motion.div>
          )}

          {stage === "done" && selected && (
            <motion.div
              key="done"
              initial={{ opacity: 0, scale: 0.92 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.35 }}
              className="relative overflow-hidden px-6 pt-8 pb-7 text-center"
            >
              {/* floating sparkles */}
              <Sparkles className="animate-twinkle absolute top-8 left-10 size-4 text-lavender-400" />
              <Sparkles className="animate-twinkle absolute top-16 right-12 size-3.5 text-blush-400" />
              <Sparkles
                className="animate-twinkle absolute top-24 left-16 size-3 text-peach-400"
                style={{ animationDelay: "0.8s" }}
              />
              <Sparkles
                className="animate-twinkle absolute top-10 right-8 size-3 text-mint-400"
                style={{ animationDelay: "1.4s" }}
              />

              <motion.div
                initial={{ scale: 0.7, rotate: -6 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ type: "spring", stiffness: 220, damping: 14 }}
                className="mx-auto w-fit"
              >
                <MoodBubble mood={selected} size="lg" />
              </motion.div>
              <p className="mt-4 text-lg font-bold tracking-tight text-ink-deep">
                Got it. I&apos;ve got you.
              </p>
              <p className="mx-auto mt-2 max-w-[18rem] text-sm leading-relaxed text-ink">
                {selected.affirmation}
              </p>
              <p className="mt-3 text-xs font-semibold text-ink-soft">
                {selected.label} · {INTENSITY_LABELS[intensity]}
              </p>
              <Button
                type="button"
                onClick={() => onOpenChange(false)}
                className="clay-btn-blush mt-6 h-12 w-full rounded-2xl text-sm font-bold text-ink-deep"
              >
                Back to my space
              </Button>
            </motion.div>
          )}
        </AnimatePresence>
      </DialogContent>
    </Dialog>
  );
}
