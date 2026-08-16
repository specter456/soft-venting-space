import { AnimatePresence, motion } from "framer-motion";
import { useMutation, useQuery } from "convex/react";
import { toast } from "sonner";
import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router";
import { Check, ChevronLeft, ChevronRight, Loader2, Lock, Mic, Video } from "lucide-react";
import { api } from "@/convex/_generated/api";
import { AttachmentChip } from "@/components/AttachmentChip";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { DIARY_STICKERS, DIARY_WEATHER, VIDEO_AVATARS } from "@/lib/art";
import { MOODS, type MoodId, moodById } from "@/lib/moods";
import { playPageTurn } from "@/lib/sound";
import { cn } from "@/lib/utils";

const COVER_COLORS = ["#cdb9f2", "#f6cdd5", "#bce3cf", "#f7d8ae", "#c5d9f2"];
const COVER_EMBLEMS = ["💗", "⭐", "🌙", "🦋", "☁️", "🌸"];
const COVER_KEY = "venting-diary-cover";

type View = "cover" | "read" | "compose";

export default function DiaryScreen() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const attachId = params.get("attach");

  const entries = useQuery(api.diary.list);
  const createEntry = useMutation(api.diary.create);
  const removeEntry = useMutation(api.diary.remove);
  const attachToDiary = useMutation(api.recordings.attachToDiary);
  const recordings = useQuery(api.recordings.list);

  const [view, setView] = useState<View>("cover");
  const [page, setPage] = useState(0);

  const [cover, setCover] = useState(() => {
    try {
      const raw = localStorage.getItem(COVER_KEY);
      if (raw) return JSON.parse(raw) as { color: string; emblem: string };
    } catch {
      /* ignore */
    }
    return { color: COVER_COLORS[0], emblem: COVER_EMBLEMS[0] };
  });
  const [showCustomize, setShowCustomize] = useState(false);

  // ─── composer state ──────────────────────────────────────────────
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [weather, setWeather] = useState(DIARY_WEATHER[0]);
  const [stickers, setStickers] = useState<string[]>(["💗"]);
  const [mood, setMood] = useState<MoodId | null>(null);
  const [recordingId, setRecordingId] = useState<string | null>(attachId);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (attachId) setRecordingId(attachId);
  }, [attachId]);

  const selectedRecording = recordings?.find((r) => r._id === recordingId) ?? null;

  const saveCover = (next: { color: string; emblem: string }) => {
    setCover(next);
    localStorage.setItem(COVER_KEY, JSON.stringify(next));
  };

  const save = async () => {
    if (saving) return;
    if (!body.trim()) {
      toast("A page needs a few words", {
        description: "Even one line is a perfect page.",
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
      const entryId = await createEntry({
        title: title.trim() || "an unspoken page",
        body: body.trim(),
        mood: mood ?? undefined,
        weather,
        stickers,
        attachments,
      });
      if (selectedRecording) {
        await attachToDiary({ id: selectedRecording._id, diaryId: entryId });
      }
      toast("Page tucked into your diary", { description: "It'll be waiting for you here." });
      setTitle("");
      setBody("");
      setStickers(["💗"]);
      setMood(null);
      setRecordingId(null);
      setPage(0);
      setView("read");
    } catch (error) {
      console.error(error);
      toast("Couldn't save that page", { description: "Please try again in a moment." });
    } finally {
      setSaving(false);
    }
  };

  const sorted = entries ?? [];
  const total = sorted.length;
  const safePage = Math.min(page, Math.max(0, total - 1));
  const entry = sorted[safePage];

  // ─── Cover ───────────────────────────────────────────────────────
  if (view === "cover") {
    return (
      <div className="flex flex-col items-center pt-4">
        <motion.div
          initial={{ opacity: 0, y: 24, rotateX: -8 }}
          animate={{ opacity: 1, y: 0, rotateX: 0 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className="w-full max-w-xs"
        >
          {/* book */}
          <div
            className="relative rounded-r-[2rem] rounded-l-lg p-7 pt-10 pb-8"
            style={{
              backgroundColor: cover.color,
              boxShadow:
                "inset 0 2px 6px rgba(255,255,255,0.6), inset -10px 0 20px -8px rgba(70,64,92,0.25), 0 24px 40px -18px rgba(99,82,150,0.5)",
            }}
          >
            <div
              className="absolute top-0 right-3 bottom-0 w-3 rounded-l-full"
              style={{ backgroundColor: "rgba(255,255,255,0.35)" }}
              aria-hidden
            />
            <span className="absolute top-3 left-5 flex items-center gap-1.5 text-[10px] font-bold text-ink-deep/60">
              <Lock className="size-3" /> my private book
            </span>
            <div className="flex justify-center pt-4">
              <span className="text-6xl drop-shadow-md">{cover.emblem}</span>
            </div>
            <p className="font-hand mt-4 text-center text-3xl font-bold tracking-wide text-ink-deep">
              My diary
            </p>
            <p className="mt-1 text-center text-xs font-semibold text-ink-deep/60">
              {total} page{total === 1 ? "" : "s"} of feelings
            </p>
            <div className="mt-6 flex flex-col gap-2">
              <button
                type="button"
                onClick={() => setView("read")}
                className="rounded-full bg-cream-soft/90 py-3 text-sm font-bold text-ink-deep shadow-[inset_0_1px_0_rgba(255,255,255,0.9),0_10px_18px_-10px_rgba(70,64,92,0.5)] transition-transform hover:scale-[1.02] active:scale-95"
              >
                Open my diary
              </button>
              <button
                type="button"
                onClick={() => setView("compose")}
                className="rounded-full bg-ink-deep/85 py-3 text-sm font-bold text-cream-soft shadow-[0_10px_18px_-10px_rgba(70,64,92,0.6)] transition-transform hover:scale-[1.02] active:scale-95"
              >
                Write a new page
              </button>
              <button
                type="button"
                onClick={() => setShowCustomize((s) => !s)}
                className="pt-1 text-xs font-bold text-ink-deep/70 underline-offset-4 hover:underline"
              >
                {showCustomize ? "hide customization" : "customize the cover"}
              </button>
            </div>
          </div>

          {/* customize */}
          <AnimatePresence>
            {showCustomize && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.3 }}
                className="overflow-hidden"
              >
                <div className="clay-card mt-4 rounded-3xl p-4">
                  <p className="text-xs font-bold text-ink-soft uppercase tracking-wide">Cover color</p>
                  <div className="mt-2 flex gap-2">
                    {COVER_COLORS.map((c) => (
                      <button
                        key={c}
                        type="button"
                        onClick={() => saveCover({ ...cover, color: c })}
                        aria-label={`Cover color ${c}`}
                        className={cn(
                          "h-9 w-9 rounded-full transition-transform hover:scale-110",
                          cover.color === c && "ring-2 ring-lavender-400 ring-offset-2 ring-offset-cream",
                        )}
                        style={{ backgroundColor: c }}
                      />
                    ))}
                  </div>
                  <p className="mt-4 text-xs font-bold text-ink-soft uppercase tracking-wide">Emblem</p>
                  <div className="mt-2 flex gap-2">
                    {COVER_EMBLEMS.map((e) => (
                      <button
                        key={e}
                        type="button"
                        onClick={() => saveCover({ ...cover, emblem: e })}
                        className={cn(
                          "clay-chip flex h-10 w-10 items-center justify-center rounded-full text-xl transition-transform hover:scale-110",
                          cover.emblem === e && "ring-2 ring-lavender-400 ring-offset-2 ring-offset-cream",
                        )}
                      >
                        {e}
                      </button>
                    ))}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        <p className="mt-6 text-center text-[11px] font-semibold text-ink-soft">
          🔒 weather, stickers & voices — all kept between these covers, only for you
        </p>
      </div>
    );
  }

  // ─── Composer ────────────────────────────────────────────────────
  if (view === "compose") {
    return (
      <div className="space-y-5">
        <Input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Page title (optional)"
          className="rounded-2xl border-lavender-200/70 bg-cream-soft text-base font-bold text-ink-deep placeholder:font-normal placeholder:text-ink-soft/70 focus-visible:ring-lavender-300"
        />
        <Textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="Dear diary…"
          className="font-hand min-h-40 resize-none rounded-[2rem] border-lavender-200/70 bg-cream-soft px-5 py-5 text-lg leading-relaxed text-ink-deep placeholder:text-ink-soft/60 focus-visible:ring-lavender-300"
        />

        <section>
          <p className="text-xs font-bold text-ink-soft uppercase tracking-wide">Today&apos;s weather</p>
          <div className="mt-2 flex gap-2 overflow-x-auto pb-1">
            {DIARY_WEATHER.map((w) => (
              <button
                key={w}
                type="button"
                onClick={() => setWeather(w)}
                className={cn(
                  "clay-chip flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-xl transition-transform hover:scale-110",
                  weather === w && "ring-2 ring-lavender-400 ring-offset-2 ring-offset-cream",
                )}
              >
                {w}
              </button>
            ))}
          </div>
        </section>

        <section>
          <p className="text-xs font-bold text-ink-soft uppercase tracking-wide">Stickers for the page</p>
          <div className="mt-2 flex gap-2 overflow-x-auto pb-1">
            {DIARY_STICKERS.map((s) => {
              const active = stickers.includes(s);
              return (
                <button
                  key={s}
                  type="button"
                  onClick={() =>
                    setStickers((prev) =>
                      active ? prev.filter((x) => x !== s) : [...prev, s],
                    )
                  }
                  className={cn(
                    "clay-chip flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-xl transition-transform hover:scale-110",
                    active && "ring-2 ring-lavender-400 ring-offset-2 ring-offset-cream",
                  )}
                >
                  {s}
                </button>
              );
            })}
          </div>
        </section>

        <section>
          <p className="text-xs font-bold text-ink-soft uppercase tracking-wide">
            Mood <span className="normal-case">(optional)</span>
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

        <section>
          <p className="text-xs font-bold text-ink-soft uppercase tracking-wide">
            Attach a recording <span className="normal-case">(optional)</span>
          </p>
          {recordings === undefined ? (
            <div className="mt-2 flex h-14 items-center justify-center">
              <Loader2 className="size-4 animate-spin text-lavender-400" />
            </div>
          ) : recordings.length === 0 ? (
            <p className="mt-2 rounded-2xl bg-cream-deep/50 px-4 py-3 text-xs font-medium text-ink-soft">
              No recordings yet — a voice or video vent can live on this page.
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
                      active ? "bg-lavender-500/15 ring-2 ring-lavender-400" : "clay-chip",
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

        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setView("cover")}
            className="clay-btn-soft flex-1 rounded-2xl px-5 py-4 text-sm font-bold text-ink-deep"
          >
            Back to cover
          </button>
          <button
            type="button"
            onClick={save}
            disabled={saving}
            className="clay-btn flex-[2] rounded-2xl px-5 py-4 text-sm font-bold text-cream-soft"
          >
            {saving ? (
              <span className="flex items-center justify-center gap-2">
                <Loader2 className="size-4 animate-spin" /> Writing the page…
              </span>
            ) : (
              "Tuck it into the diary"
            )}
          </button>
        </div>
      </div>
    );
  }

  // ─── Read with page-turn ─────────────────────────────────────────
  if (entries === undefined) {
    return (
      <div className="flex h-60 items-center justify-center">
        <Loader2 className="size-5 animate-spin text-lavender-400" />
      </div>
    );
  }

  if (total === 0) {
    return (
      <div className="clay-card rounded-[2rem] px-6 py-14 text-center">
        <span className="text-4xl">📖</span>
        <p className="mt-3 text-lg font-bold tracking-tight text-ink-deep">
          The diary is empty… for now
        </p>
        <p className="mx-auto mt-1.5 max-w-[16rem] text-sm leading-relaxed text-ink-soft">
          Pages appear here with weather, stickers, and whatever you need to
          let out.
        </p>
        <button
          type="button"
          onClick={() => setView("compose")}
          className="clay-btn mt-6 rounded-full px-6 py-3 text-sm font-bold text-cream-soft"
        >
          Write the first page
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <p className="text-sm font-bold text-ink-soft">
          page {safePage + 1} of {total}
        </p>
        <button
          type="button"
          onClick={() => setView("compose")}
          className="clay-btn rounded-full px-4 py-2 text-xs font-bold text-cream-soft"
        >
          + New page
        </button>
      </div>

      {/* book page */}
      <div className="relative" style={{ perspective: "1400px" }}>
        <AnimatePresence mode="wait">
          <motion.div
            key={entry._id}
            initial={{ rotateY: -80, opacity: 0, x: -40 }}
            animate={{ rotateY: 0, opacity: 1, x: 0 }}
            exit={{ rotateY: 80, opacity: 0, x: 40 }}
            transition={{ duration: 0.55, ease: "easeInOut" }}
            style={{ transformStyle: "preserve-3d" }}
            className="clay-card relative min-h-[26rem] rounded-[1.6rem] p-6"
          >
            <div
              aria-hidden
              className="absolute inset-y-0 left-3 w-px bg-lavender-200/60"
            />
            {/* header */}
            <div className="flex items-center justify-between">
              <span className="text-2xl" aria-hidden>
                {entry.weather}
              </span>
              <span className="text-[10px] font-bold text-ink-soft">
                {new Date(entry._creationTime).toLocaleDateString(undefined, {
                  weekday: "long",
                  month: "long",
                  day: "numeric",
                })}
              </span>
              <span className="text-lg" aria-hidden>
                🔒
              </span>
            </div>

            <h3 className="font-hand mt-4 text-2xl font-bold tracking-tight text-ink-deep">
              {entry.title}
            </h3>

            {entry.mood && (
              <span className="mt-2 inline-block rounded-full bg-lavender-100/80 px-2.5 py-1 text-[10px] font-bold text-lavender-600">
                {moodById(entry.mood)?.emoji} {moodById(entry.mood)?.label}
              </span>
            )}

            <p className="font-hand mt-4 text-lg leading-relaxed text-ink">
              {entry.body}
            </p>

            {entry.attachments.length > 0 && (
              <div className="mt-5 flex flex-wrap gap-2">
                {entry.attachments.map((a, i) => (
                  <AttachmentChip key={i} attachment={a} />
                ))}
              </div>
            )}

            {/* stickers */}
            {entry.stickers.length > 0 && (
              <div className="mt-6 flex flex-wrap items-center gap-2">
                {entry.stickers.map((s, i) => (
                  <motion.span
                    key={`${s}-${i}`}
                    initial={{ scale: 0, rotate: -12 }}
                    animate={{ scale: 1, rotate: i % 2 === 0 ? -8 : 8 }}
                    transition={{ type: "spring", stiffness: 240, damping: 14, delay: 0.2 + i * 0.06 }}
                    className="text-2xl drop-shadow-sm"
                    aria-hidden
                  >
                    {s}
                  </motion.span>
                ))}
              </div>
            )}

            <button
              type="button"
              onClick={() => {
                void removeEntry({ id: entry._id });
                setPage((p) => Math.max(0, p - 1));
                toast("Page removed", { description: "That page is gone for good." });
              }}
              className="absolute right-4 bottom-4 flex h-8 w-8 items-center justify-center rounded-full text-ink-soft transition-colors hover:bg-blush-100/70 hover:text-blush-500"
              aria-label="Delete this page"
            >
              🗑️
            </button>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* page controls */}
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={() => {
            setPage((p) => Math.max(0, p - 1));
            playPageTurn();
          }}
          disabled={safePage === 0}
          className="clay-chip flex items-center gap-1 rounded-full px-4 py-2.5 text-xs font-bold text-ink-deep transition-transform hover:scale-105 active:scale-95 disabled:opacity-40"
        >
          <ChevronLeft className="size-4" /> earlier
        </button>
        <button
          type="button"
          onClick={() => setView("cover")}
          className="text-xs font-bold text-lavender-600 underline-offset-4 hover:underline"
        >
          close the book
        </button>
        <button
          type="button"
          onClick={() => {
            setPage((p) => Math.min(total - 1, p + 1));
            playPageTurn();
          }}
          disabled={safePage === total - 1}
          className="clay-chip flex items-center gap-1 rounded-full px-4 py-2.5 text-xs font-bold text-ink-deep transition-transform hover:scale-105 active:scale-95 disabled:opacity-40"
        >
          newer <ChevronRight className="size-4" />
        </button>
      </div>

      <p className="text-center text-[11px] font-semibold text-ink-soft">
        pages turn gently — like this little book knows how you feel
      </p>
    </div>
  );
}
