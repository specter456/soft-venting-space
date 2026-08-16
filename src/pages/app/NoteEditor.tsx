import { useMutation, useQuery } from "convex/react";
import { toast } from "sonner";
import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router";
import { Check, Loader2, Mic, Video } from "lucide-react";
import { api } from "@/convex/_generated/api";
import { Textarea } from "@/components/ui/textarea";
import { PHOTO_SCENES, VIDEO_AVATARS } from "@/lib/art";
import { MOODS, type MoodId } from "@/lib/moods";
import { cn } from "@/lib/utils";

export default function NoteEditor() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const attachId = params.get("attach");
  const attachKind = params.get("kind");

  const createNote = useMutation(api.notes.create);
  const attachToNote = useMutation(api.recordings.attachToNote);
  const recordings = useQuery(api.recordings.list);

  const [body, setBody] = useState("");
  const [mood, setMood] = useState<MoodId | null>(null);
  const [recordingId, setRecordingId] = useState<string | null>(attachId);
  const [photo, setPhoto] = useState<(typeof PHOTO_SCENES)[number] | null>(null);
  const [saving, setSaving] = useState(false);

  // pre-select the recording we were sent here with
  useEffect(() => {
    if (attachId) setRecordingId(attachId);
  }, [attachId]);

  const selectedRecording = recordings?.find((r) => r._id === recordingId) ?? null;

  const save = async () => {
    if (saving) return;
    if (!body.trim() && !selectedRecording && !photo) {
      toast("Nothing to save yet", {
        description: "Write a line, attach a recording, or add a photo — any one is enough.",
      });
      return;
    }
    setSaving(true);
    try {
      const attachments = [];
      if (selectedRecording) {
        attachments.push(
          selectedRecording.kind === "voice"
            ? {
                kind: "audio" as const,
                label: "a voice vent",
                duration: selectedRecording.duration,
              }
            : {
                kind: "video" as const,
                label: "a video vent",
                duration: selectedRecording.duration,
                art: VIDEO_AVATARS[Math.floor(Math.random() * VIDEO_AVATARS.length)],
              },
        );
      }
      if (photo) {
        attachments.push({
          kind: "photo" as const,
          label: photo.label,
          art: photo.emoji,
        });
      }
      const noteId = await createNote({
        body: body.trim(),
        mood: mood ?? undefined,
        attachments,
      });
      if (selectedRecording) {
        await attachToNote({ id: selectedRecording._id, noteId });
      }
      toast("Reflection saved", {
        description: "Tucked safely into your private journal.",
      });
      navigate("/dashboard/notes");
    } catch (error) {
      console.error(error);
      toast("Couldn't save that note", { description: "Please try again in a moment." });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-5">
      <Textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        placeholder="Let it out, gently. There's no wrong way to write this…"
        className="clay-card min-h-44 resize-none rounded-[2rem] border-0 px-5 py-5 text-[15px] leading-relaxed text-ink-deep shadow-none placeholder:text-ink-soft/70 focus-visible:ring-lavender-300"
      />

      {/* ─── Mood (optional) ──────────────────────────────────────── */}
      <section>
        <p className="text-xs font-bold text-ink-soft uppercase tracking-wide">
          How did it feel? <span className="normal-case">(optional)</span>
        </p>
        <div className="mt-2 flex flex-wrap gap-2">
          {MOODS.map((m) => (
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
      </section>

      {/* ─── Attach a recording (optional) ────────────────────────── */}
      <section>
        <p className="text-xs font-bold text-ink-soft uppercase tracking-wide">
          Tie a recording to this note <span className="normal-case">(optional)</span>
        </p>
        {recordings === undefined ? (
          <div className="mt-2 flex h-16 items-center justify-center">
            <Loader2 className="size-4 animate-spin text-lavender-400" />
          </div>
        ) : recordings.length === 0 ? (
          <p className="mt-2 rounded-2xl bg-cream-deep/50 px-4 py-3 text-xs font-medium text-ink-soft">
            No recordings yet — save one in Record and it can live here.
          </p>
        ) : (
          <div className="mt-2 space-y-2">
            {recordings.map((rec) => {
              const active = recordingId === rec._id;
              return (
                <button
                  key={rec._id}
                  type="button"
                  onClick={() => setRecordingId(active ? null : rec._id)}
                  className={cn(
                    "flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-left transition-all",
                    active
                      ? "bg-lavender-500/15 ring-2 ring-lavender-400"
                      : "clay-chip",
                  )}
                >
                  <span className="clay-chip flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-lavender-600">
                    {rec.kind === "voice" ? <Mic className="size-4" /> : <Video className="size-4" />}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-xs font-bold text-ink-deep">
                      {rec.kind === "voice" ? "Voice vent" : "Video vent"}
                    </span>
                    <span className="block text-[10px] font-semibold text-ink-soft">
                      {Math.floor(rec.duration / 60)}:{String(rec.duration % 60).padStart(2, "0")} · 🔒 private
                    </span>
                  </span>
                  {active && <Check className="size-4 shrink-0 text-lavender-600" />}
                </button>
              );
            })}
          </div>
        )}
      </section>

      {/* ─── Add a photo (optional) ───────────────────────────────── */}
      <section>
        <p className="text-xs font-bold text-ink-soft uppercase tracking-wide">
          Or a soft photo <span className="normal-case">(optional)</span>
        </p>
        <div className="mt-2 flex gap-2 overflow-x-auto pb-1">
          {PHOTO_SCENES.map((scene) => {
            const active = photo?.emoji === scene.emoji;
            return (
              <button
                key={scene.emoji}
                type="button"
                onClick={() => setPhoto(active ? null : scene)}
                className={cn(
                  "relative flex h-20 w-16 shrink-0 flex-col items-center justify-center rounded-2xl transition-transform",
                  scene.bg,
                  active && "ring-2 ring-lavender-400 ring-offset-2 ring-offset-cream",
                )}
              >
                <span className="text-2xl drop-shadow-sm">{scene.emoji}</span>
                <span className="mt-1 max-w-full truncate px-1 text-[8px] font-bold text-ink-deep/70">
                  {scene.label}
                </span>
              </button>
            );
          })}
        </div>
      </section>

      <button
        type="button"
        onClick={save}
        disabled={saving}
        className="clay-btn flex w-full items-center justify-center gap-2 rounded-2xl px-5 py-4 text-sm font-bold text-cream-soft"
      >
        {saving ? (
          <>
            <Loader2 className="size-4 animate-spin" /> Tucking it away…
          </>
        ) : (
          <>Save to my journal</>
        )}
      </button>
    </div>
  );
}
