import { AnimatePresence, motion } from "framer-motion";
import { toast } from "sonner";
import { useEffect, useRef, useState, useCallback } from "react";
import { useSetDirty } from "@/lib/useUnsavedGuard";
import { useSearchParams } from "react-router";
import {
  Check,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Lock,
  Mic,
  Plus,
  Minus,
  X,
  ImagePlus,
} from "lucide-react";
import { AttachmentChip } from "@/components/AttachmentChip";
import {
  attachRecordingToDiary,
  createDiaryEntry,
  updateDiaryEntry,
  removeItem,
  useTable,
  type DiaryEntry,
  type DiaryPageSticker,
  type DiaryPagePhoto,
  type DiaryPageStyle,
  type Recording,
} from "@/lib/db";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { DIARY_STICKERS, DIARY_WEATHER, VIDEO_AVATARS } from "@/lib/art";
import { MOODS, type MoodId, moodById } from "@/lib/moods";
import { playPageTurn } from "@/lib/sound";
import { cn } from "@/lib/utils";
import { safeGetItem, safeSetItem } from "@/lib/safe-storage";

/* ─── Constants ─────────────────────────────────────────────────── */

const COVER_COLORS = ["#c8b2ee", "#f0bcc8", "#ade1c5", "#f2cd99", "#b5d9ef"];
const COVER_EMBLEMS = ["💗", "⭐", "🌙", "🦋", "☁️", "🌸"];
const COVER_KEY = "venting-diary-cover";

const DIARY_FONTS = [
  { id: "hand", label: "Handwritten", className: "font-hand" },
  { id: "cozy", label: "Cozy", className: "rounded-lg" },
  { id: "clean", label: "Clean", className: "font-sans" },
  { id: "elegant", label: "Elegant", className: "font-serif italic" },
];

const INK_COLORS = [
  { id: "lavender", label: "Deep lavender", hex: "#6b5b95" },
  { id: "brown", label: "Soft brown", hex: "#8b6f47" },
  { id: "pink", label: "Dusty pink", hex: "#c97b84" },
  { id: "teal", label: "Teal", hex: "#5a8a7a" },
  { id: "blue", label: "Dark blue", hex: "#4a6fa5" },
  { id: "gray", label: "Warm gray", hex: "#7a7068" },
];

const DEFAULT_STYLE: DiaryPageStyle = {
  font: "hand",
  headingColor: "#6b5b95",
  bodyColor: "#3d3654",
};

type View = "cover" | "read" | "compose";

/* ─── Draggable element on page ─────────────────────────────────── */

function DraggableItem({
  children,
  x,
  y,
  rotation,
  onMove,
  onTap,
  selected,
}: {
  children: React.ReactNode;
  x: number;
  y: number;
  rotation?: number;
  onMove: (dx: number, dy: number) => void;
  onTap: () => void;
  selected: boolean;
}) {
  const dragging = useRef(false);
  const start = useRef({ x: 0, y: 0 });

  const onPointerDown = useCallback(
    (e: React.PointerEvent) => {
      dragging.current = true;
      start.current = { x: e.clientX, y: e.clientY };
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
      e.stopPropagation();
    },
    [],
  );

  const onPointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!dragging.current) return;
      e.preventDefault();
      const dx = e.clientX - start.current.x;
      const dy = e.clientY - start.current.y;
      start.current = { x: e.clientX, y: e.clientY };
      onMove(dx, dy);
    },
    [onMove],
  );

  const onPointerUp = useCallback(
    (e: React.PointerEvent) => {
      if (!dragging.current) return;
      dragging.current = false;
      (e.target as HTMLElement).releasePointerCapture?.(e.pointerId);
    },
    [],
  );

  return (
    <div
      className="absolute touch-none"
      style={{
        left: `${x}%`,
        top: `${y}%`,
        transform: `translate(-50%, -50%) rotate(${rotation ?? 0}deg)`,
        zIndex: selected ? 30 : 10,
      }}
      onPointerDown={(e) => {
        onPointerDown(e);
        onTap();
      }}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
    >
      {children}
    </div>
  );
}

/* ─── Main Component ────────────────────────────────────────────── */

export default function DiaryScreen() {
  const [params] = useSearchParams();
  const attachId = params.get("attach");

  const entries = useTable<DiaryEntry>("diaryEntries");
  const recordings = useTable<Recording>("recordings");

  const [view, setView] = useState<View>("cover");
  const [page, setPage] = useState(0);

  const [cover, setCover] = useState(() => {
    try {
      const raw = safeGetItem(COVER_KEY);
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
  const setDirty = useSetDirty();
  useEffect(() => {
    setDirty(view === "compose" && (title.trim().length > 0 || body.trim().length > 0));
  }, [view, title, body, setDirty]);
  const [weather, setWeather] = useState(DIARY_WEATHER[0]);
  const [stickers, setStickers] = useState<string[]>(["💗"]);
  const [mood, setMood] = useState<MoodId | null>(null);
  const [recordingId, setRecordingId] = useState<string | null>(attachId);
  const [saving, setSaving] = useState(false);

  // photos for composer (stored as data URLs)
  const [composerPhotos, setComposerPhotos] = useState<string[]>([]);
  // style for composer
  const [composerStyle, setComposerStyle] = useState<DiaryPageStyle>({
    ...DEFAULT_STYLE,
  });

  const selectedRecording =
    recordings?.find((r) => r._id === recordingId) ?? null;

  const photoInputRef = useRef<HTMLInputElement>(null);

  // ─── Read-view interactive state ──────────────────────────────
  const [selectedSticker, setSelectedSticker] = useState<number | null>(null);
  const [selectedPhoto, setSelectedPhoto] = useState<number | null>(null);

  const saveCover = (next: { color: string; emblem: string }) => {
    setCover(next);
    safeSetItem(COVER_KEY, JSON.stringify(next));
  };

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    Array.from(files).forEach((file) => {
      const reader = new FileReader();
      reader.onload = () => {
        const src = reader.result as string;
        setComposerPhotos((prev) => [...prev, src]);
      };
      reader.readAsDataURL(file);
    });
    // reset input so same file can be picked again
    e.target.value = "";
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

      // Build positioned stickers: place them in a gentle scatter
      const positioned: DiaryPageSticker[] = stickers.map((emoji, i) => {
        const col = i % 3;
        const row = Math.floor(i / 3);
        return {
          emoji,
          x: 18 + col * 30 + (row % 2 ? 5 : 0),
          y: 70 + row * 14,
          size: 36,
        };
      });

      // Build photos
      const photos: DiaryPagePhoto[] = composerPhotos.map((src) => ({
        src,
        x: 50,
        y: 50,
        w: 140,
        h: 140,
      }));

      const entry = createDiaryEntry({
        title: title.trim() || "an unspoken page",
        body: body.trim(),
        mood: mood ?? undefined,
        weather,
        stickers,
        attachments,
        positionedStickers: positioned,
        photos,
        style: { ...composerStyle },
      });
      if (selectedRecording) {
        attachRecordingToDiary(selectedRecording._id, entry._id);
      }
      toast("Page tucked into your diary", {
        description: "It'll be waiting for you here.",
      });
      setTitle("");
      setBody("");
      setStickers(["💗"]);
      setMood(null);
      setRecordingId(null);
      setComposerPhotos([]);
      setComposerStyle({ ...DEFAULT_STYLE });
      setPage(0);
      setView("read");
    } catch (error) {
      console.error(error);
      toast("Couldn't save that page", {
        description: "Please try again in a moment.",
      });
    } finally {
      setSaving(false);
    }
  };

  const sorted = entries;
  const total = sorted.length;
  const safePage = Math.min(page, Math.max(0, total - 1));
  const entry = sorted[safePage];

  // ─── Helpers for read view: update positioned items ────────────
  const updatePageSticker = useCallback(
    (entryId: string, idx: number, dx: number, dy: number) => {
      const e = sorted.find((x) => x._id === entryId);
      if (!e) return;
      const ps = [...(e.positionedStickers ?? [])];
      if (!ps[idx]) return;
      ps[idx] = { ...ps[idx], x: ps[idx].x + (dx / 3) * 1.2, y: ps[idx].y + (dy / 3) * 1.2 };
      updateDiaryEntry(entryId, { positionedStickers: ps });
    },
    [sorted],
  );

  const rotatePageSticker = useCallback(
    (entryId: string, idx: number, angle: number) => {
      const e = sorted.find((x) => x._id === entryId);
      if (!e) return;
      const ps = [...(e.positionedStickers ?? [])];
      if (!ps[idx]) return;
      ps[idx] = { ...ps[idx], rotation: ((ps[idx].rotation ?? 0) + angle + 360) % 360 };
      updateDiaryEntry(entryId, { positionedStickers: ps });
    },
    [sorted],
  );

  const resizePageSticker = useCallback(
    (entryId: string, idx: number, delta: number) => {
      const e = sorted.find((x) => x._id === entryId);
      if (!e) return;
      const ps = [...(e.positionedStickers ?? [])];
      if (!ps[idx]) return;
      ps[idx] = { ...ps[idx], size: Math.max(16, Math.min(72, ps[idx].size + delta)) };
      updateDiaryEntry(entryId, { positionedStickers: ps });
    },
    [sorted],
  );

  const removePageSticker = useCallback(
    (entryId: string, idx: number) => {
      const e = sorted.find((x) => x._id === entryId);
      if (!e) return;
      const ps = [...(e.positionedStickers ?? [])];
      ps.splice(idx, 1);
      updateDiaryEntry(entryId, { positionedStickers: ps });
      setSelectedSticker(null);
    },
    [sorted],
  );

  const updatePagePhoto = useCallback(
    (entryId: string, idx: number, dx: number, dy: number) => {
      const e = sorted.find((x) => x._id === entryId);
      if (!e) return;
      const ph = [...(e.photos ?? [])];
      if (!ph[idx]) return;
      ph[idx] = { ...ph[idx], x: ph[idx].x + (dx / 3) * 1.2, y: ph[idx].y + (dy / 3) * 1.2 };
      updateDiaryEntry(entryId, { photos: ph });
    },
    [sorted],
  );

  const resizePagePhoto = useCallback(
    (entryId: string, idx: number, delta: number) => {
      const e = sorted.find((x) => x._id === entryId);
      if (!e) return;
      const ph = [...(e.photos ?? [])];
      if (!ph[idx]) return;
      ph[idx] = { ...ph[idx], w: Math.max(40, Math.min(300, ph[idx].w + delta)), h: Math.max(40, Math.min(300, ph[idx].h + delta)) };
      updateDiaryEntry(entryId, { photos: ph });
    },
    [sorted],
  );

  const removePagePhoto = useCallback(
    (entryId: string, idx: number) => {
      const e = sorted.find((x) => x._id === entryId);
      if (!e) return;
      const ph = [...(e.photos ?? [])];
      ph.splice(idx, 1);
      updateDiaryEntry(entryId, { photos: ph });
      setSelectedPhoto(null);
    },
    [sorted],
  );

  const setBackgroundPhoto = useCallback(
    (entryId: string, photoIdx: number) => {
      const e = sorted.find((x) => x._id === entryId);
      if (!e) return;
      const ph = e.photos ?? [];
      if (!ph[photoIdx]) return;
      const s = { ...(e.style ?? DEFAULT_STYLE), bgPhoto: ph[photoIdx].src };
      updateDiaryEntry(entryId, { style: s });
      toast("Background set", { description: "The photo is now this page's background." });
    },
    [sorted],
  );

  const getFontClass = (fontId: string) =>
    DIARY_FONTS.find((f) => f.id === fontId)?.className ?? "font-hand";

  /* ─── Cover ─────────────────────────────────────────────────── */
  if (view === "cover") {
    return (
      <div className="flex flex-col items-center pt-4">
        <motion.div
          initial={{ opacity: 0, y: 24, rotateX: -8 }}
          animate={{ opacity: 1, y: 0, rotateX: 0 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className="w-full max-w-xs"
        >
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
                  <p className="text-xs font-bold text-ink-soft uppercase tracking-wide">
                    Cover color
                  </p>
                  <div className="mt-2 flex gap-2">
                    {COVER_COLORS.map((c) => (
                      <button
                        key={c}
                        type="button"
                        onClick={() => saveCover({ ...cover, color: c })}
                        aria-label={`Cover color ${c}`}
                        className={cn(
                          "h-9 w-9 rounded-full transition-transform hover:scale-110",
                          cover.color === c &&
                            "ring-2 ring-lavender-400 ring-offset-2 ring-offset-cream",
                        )}
                        style={{ backgroundColor: c }}
                      />
                    ))}
                  </div>
                  <p className="mt-4 text-xs font-bold text-ink-soft uppercase tracking-wide">
                    Emblem
                  </p>
                  <div className="mt-2 flex gap-2">
                    {COVER_EMBLEMS.map((e) => (
                      <button
                        key={e}
                        type="button"
                        onClick={() => saveCover({ ...cover, emblem: e })}
                        className={cn(
                          "clay-chip flex h-10 w-10 items-center justify-center rounded-full text-xl transition-transform hover:scale-110",
                          cover.emblem === e &&
                            "ring-2 ring-lavender-400 ring-offset-2 ring-offset-cream",
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
          🔒 weather, stickers & voices — all kept between these covers, only
          for you
        </p>
      </div>
    );
  }

  /* ─── Composer ──────────────────────────────────────────────── */
  if (view === "compose") {
    return (
      <div className="space-y-5">
        <Input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          autoCorrect="off"
          autoCapitalize="sentences"
          spellCheck={false}
          placeholder="Page title (optional)"
          className="rounded-2xl border-lavender-200/70 bg-cream-soft text-base font-bold text-ink-deep placeholder:font-normal placeholder:text-ink-soft/70 focus-visible:ring-lavender-300"
        />
        <Textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          autoCorrect="off"
          autoCapitalize="sentences"
          spellCheck={false}
          placeholder="Dear diary…"
          className={cn(
            "min-h-40 resize-none rounded-[2rem] border-lavender-200/70 bg-cream-soft px-5 py-5 text-lg leading-relaxed text-ink-deep placeholder:text-ink-soft/60 focus-visible:ring-lavender-300",
            getFontClass(composerStyle.font),
          )}
          style={{ color: composerStyle.bodyColor }}
        />

        {/* ─── Weather ────────────────────────────────────────── */}
        <section>
          <p className="text-xs font-bold text-ink-soft uppercase tracking-wide">
            Today&apos;s weather
          </p>
          <div className="mt-2 flex gap-2 overflow-x-auto pb-1">
            {DIARY_WEATHER.map((w) => (
              <button
                key={w}
                type="button"
                onClick={() => setWeather(w)}
                className={cn(
                  "clay-chip flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-xl transition-transform hover:scale-110",
                  weather === w &&
                    "ring-2 ring-lavender-400 ring-offset-2 ring-offset-cream",
                )}
              >
                {w}
              </button>
            ))}
          </div>
        </section>

        {/* ─── Stickers ────────────────────────────────────────── */}
        <section>
          <p className="text-xs font-bold text-ink-soft uppercase tracking-wide">
            Stickers for the page
          </p>
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
                    active &&
                      "ring-2 ring-lavender-400 ring-offset-2 ring-offset-cream",
                  )}
                >
                  {s}
                </button>
              );
            })}
          </div>
        </section>

        {/* ─── Photos ────────────────────────────────────────── */}
        <section>
          <p className="text-xs font-bold text-ink-soft uppercase tracking-wide">
            Photos <span className="normal-case">(optional)</span>
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => photoInputRef.current?.click()}
              className="clay-chip flex h-11 items-center gap-1.5 rounded-full px-3 text-xs font-bold text-ink-soft transition-transform hover:scale-105"
            >
              <ImagePlus className="size-4" /> add photo
            </button>
            {composerPhotos.map((src, i) => (
              <div key={i} className="relative">
                <img
                  src={src}
                  alt={`Photo ${i + 1}`}
                  className="h-11 w-11 rounded-xl object-cover ring-1 ring-lavender-200"
                />
                <button
                  type="button"
                  onClick={() =>
                    setComposerPhotos((prev) =>
                      prev.filter((_, j) => j !== i),
                    )
                  }
                  className="absolute -top-1.5 -right-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-blush-200 text-blush-500"
                >
                  <X className="size-2.5" />
                </button>
              </div>
            ))}
          </div>
          <input
            ref={photoInputRef}
            type="file"
            accept="image/*"
            multiple
            onChange={handlePhotoUpload}
            className="hidden"
          />
        </section>

        {/* ─── Mood ────────────────────────────────────────────── */}
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

        {/* ─── Recording attachment ────────────────────────────── */}
        <section>
          <p className="text-xs font-bold text-ink-soft uppercase tracking-wide">
            Attach a recording{" "}
            <span className="normal-case">(optional)</span>
          </p>
          {recordings.length === 0 ? (
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
                      active
                        ? "bg-lavender-500/15 ring-2 ring-lavender-400"
                        : "clay-chip",
                    )}
                  >
                    <span className="clay-chip flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-lavender-600">
                      {rec.kind === "voice" ? (
                        <Mic className="size-4" />
                      ) : (
                        <span className="text-sm">🎥</span>
                      )}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-xs font-bold text-ink-deep">
                        {rec.kind === "voice" ? "Voice vent" : "Video vent"}
                      </span>
                      <span className="block text-[10px] font-semibold text-ink-soft">
                        {Math.floor(rec.duration / 60)}:
                        {String(rec.duration % 60).padStart(2, "0")} · 🔒
                        private
                      </span>
                    </span>
                    {active && (
                      <Check className="size-4 shrink-0 text-lavender-600" />
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </section>

        {/* ─── Font ────────────────────────────────────────────── */}
        <section>
          <p className="text-xs font-bold text-ink-soft uppercase tracking-wide">
            Page font
          </p>
          <div className="mt-2 flex gap-2 flex-wrap">
            {DIARY_FONTS.map((f) => (
              <button
                key={f.id}
                type="button"
                onClick={() =>
                  setComposerStyle((s) => ({ ...s, font: f.id }))
                }
                className={cn(
                  "rounded-full px-3.5 py-1.5 text-xs font-bold transition-all",
                  composerStyle.font === f.id
                    ? "bg-lavender-500 text-cream-soft shadow-sm"
                    : "clay-chip text-ink-soft",
                )}
              >
                {f.label}
              </button>
            ))}
          </div>
        </section>

        {/* ─── Text colors ──────────────────────────────────────── */}
        <section>
          <p className="text-xs font-bold text-ink-soft uppercase tracking-wide">
            Heading color
          </p>
          <div className="mt-2 flex gap-2 flex-wrap">
            {INK_COLORS.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() =>
                  setComposerStyle((s) => ({ ...s, headingColor: c.hex }))
                }
                aria-label={c.label}
                className={cn(
                  "h-7 w-7 rounded-full border-2 transition-all",
                  composerStyle.headingColor === c.hex
                    ? "border-ink-deep scale-110 shadow-md"
                    : "border-white/70",
                )}
                style={{ backgroundColor: c.hex }}
              />
            ))}
          </div>
        </section>

        <section>
          <p className="text-xs font-bold text-ink-soft uppercase tracking-wide">
            Body text color
          </p>
          <div className="mt-2 flex gap-2 flex-wrap">
            {INK_COLORS.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() =>
                  setComposerStyle((s) => ({ ...s, bodyColor: c.hex }))
                }
                aria-label={c.label}
                className={cn(
                  "h-7 w-7 rounded-full border-2 transition-all",
                  composerStyle.bodyColor === c.hex
                    ? "border-ink-deep scale-110 shadow-md"
                    : "border-white/70",
                )}
                style={{ backgroundColor: c.hex }}
              />
            ))}
          </div>
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
                <Loader2 className="size-4 animate-spin" /> Writing the
                page…
              </span>
            ) : (
              "Tuck it into the diary"
            )}
          </button>
        </div>
      </div>
    );
  }

  /* ─── Read with page-turn ───────────────────────────────────── */
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

  const pageStyle = entry?.style ?? DEFAULT_STYLE;
  const positionedStickers = entry?.positionedStickers ?? [];
  const pagePhotos = entry?.photos ?? [];
  const bgPhoto = pageStyle.bgPhoto;

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
            className="clay-card relative min-h-[26rem] overflow-visible rounded-[1.6rem] p-6"
          >
            {/* Background photo (softened) */}
            {bgPhoto && (
              <div
                className="pointer-events-none absolute inset-0 rounded-[1.6rem]"
                aria-hidden
              >
                <img
                  src={bgPhoto}
                  alt=""
                  className="h-full w-full object-cover opacity-20 blur-[1px]"
                />
                <div className="absolute inset-0 bg-cream-soft/50" />
              </div>
            )}

            {/* Margin line */}
            <div
              aria-hidden
              className="absolute inset-y-0 left-3 w-px bg-lavender-200/60"
            />

            {/* header */}
            <div className="relative flex items-center justify-between">
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

            <h3
              className={cn(
                "relative mt-4 text-2xl font-bold tracking-tight",
                getFontClass(pageStyle.font),
              )}
              style={{ color: pageStyle.headingColor }}
            >
              {entry.title}
            </h3>

            {entry.mood && (
              <span className="relative mt-2 inline-block rounded-full bg-lavender-100/80 px-2.5 py-1 text-[10px] font-bold text-lavender-600">
                {moodById(entry.mood)?.emoji} {moodById(entry.mood)?.label}
              </span>
            )}

            <p
              className={cn(
                "relative mt-4 text-lg leading-relaxed",
                getFontClass(pageStyle.font),
              )}
              style={{ color: pageStyle.bodyColor }}
            >
              {entry.body}
            </p>

            {entry.attachments.length > 0 && (
              <div className="relative mt-5 flex flex-wrap gap-2">
                {entry.attachments.map((a, i) => (
                  <AttachmentChip key={i} attachment={a} />
                ))}
              </div>
            )}

            {/* ─── Draggable positioned stickers ─────────────── */}
            {positionedStickers.map((ps, i) => (
              <DraggableItem
                key={`s-${i}-${ps.emoji}`}
                x={ps.x}
                y={ps.y}
                rotation={ps.rotation}
                selected={selectedSticker === i}
                onTap={() => {
                  setSelectedSticker(selectedSticker === i ? null : i);
                  setSelectedPhoto(null);
                }}
                onMove={(dx, dy) =>
                  updatePageSticker(entry._id, i, dx, dy)
                }
              >
                <span
                  className="drop-shadow-[0_2px_4px_rgba(90,70,120,0.25)]"
                  style={{ fontSize: ps.size, lineHeight: 1 }}
                  aria-hidden
                >
                  {ps.emoji}
                </span>
                {selectedSticker === i && (
                  <div
                    className="absolute -top-10 left-1/2 flex -translate-x-1/2 gap-1"
                    onPointerDown={(e) => e.stopPropagation()}
                  >
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        resizePageSticker(entry._id, i, 6);
                      }}
                      className="flex h-6 w-6 items-center justify-center rounded-full bg-white/90 text-ink-deep shadow-md transition-transform hover:scale-110"
                      aria-label="Bigger"
                    >
                      <Plus className="size-3" />
                    </button>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        resizePageSticker(entry._id, i, -6);
                      }}
                      className="flex h-6 w-6 items-center justify-center rounded-full bg-white/90 text-ink-deep shadow-md transition-transform hover:scale-110"
                      aria-label="Smaller"
                    >
                      <Minus className="size-3" />
                    </button>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        rotatePageSticker(entry._id, i, -15);
                      }}
                      className="flex h-6 w-6 items-center justify-center rounded-full bg-white/90 text-ink-deep shadow-md text-[10px] font-bold transition-transform hover:scale-110"
                      aria-label="Tilt left"
                    >
                      ⟲
                    </button>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        rotatePageSticker(entry._id, i, 15);
                      }}
                      className="flex h-6 w-6 items-center justify-center rounded-full bg-white/90 text-ink-deep shadow-md text-[10px] font-bold transition-transform hover:scale-110"
                      aria-label="Tilt right"
                    >
                      ⟳
                    </button>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        removePageSticker(entry._id, i);
                      }}
                      className="flex h-6 w-6 items-center justify-center rounded-full bg-blush-100 text-blush-500 shadow-md transition-transform hover:scale-110"
                      aria-label="Remove"
                    >
                      <X className="size-3" />
                    </button>
                  </div>
                )}
              </DraggableItem>
            ))}

            {/* ─── Draggable photos ─────────────────────────── */}
            {pagePhotos.map((ph, i) => (
              <DraggableItem
                key={`ph-${i}`}
                x={ph.x}
                y={ph.y}
                selected={selectedPhoto === i}
                onTap={() => {
                  setSelectedPhoto(selectedPhoto === i ? null : i);
                  setSelectedSticker(null);
                }}
                onMove={(dx, dy) => updatePagePhoto(entry._id, i, dx, dy)}
              >
                <img
                  src={ph.src}
                  alt={`Photo ${i + 1}`}
                  className="rounded-xl shadow-md"
                  style={{ width: ph.w, height: ph.h, objectFit: "cover" }}
                />
                {selectedPhoto === i && (
                  <div
                    className="absolute -top-10 left-1/2 flex -translate-x-1/2 gap-1"
                    onPointerDown={(e) => e.stopPropagation()}
                  >
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        resizePagePhoto(entry._id, i, 20);
                      }}
                      className="flex h-6 w-6 items-center justify-center rounded-full bg-white/90 text-ink-deep shadow-md transition-transform hover:scale-110"
                      aria-label="Bigger"
                    >
                      <Plus className="size-3" />
                    </button>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        resizePagePhoto(entry._id, i, -20);
                      }}
                      className="flex h-6 w-6 items-center justify-center rounded-full bg-white/90 text-ink-deep shadow-md transition-transform hover:scale-110"
                      aria-label="Smaller"
                    >
                      <Minus className="size-3" />
                    </button>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        removePagePhoto(entry._id, i);
                      }}
                      className="flex h-6 w-6 items-center justify-center rounded-full bg-blush-100 text-blush-500 shadow-md transition-transform hover:scale-110"
                      aria-label="Remove"
                    >
                      <X className="size-3" />
                    </button>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setBackgroundPhoto(entry._id, i);
                      }}
                      className="flex h-6 items-center gap-0.5 rounded-full bg-white/90 px-2 text-[9px] font-bold text-ink-deep shadow-md transition-transform hover:scale-110"
                      aria-label="Set as background"
                    >
                      🖼 bg
                    </button>
                  </div>
                )}
              </DraggableItem>
            ))}

            <button
              type="button"
              onClick={() => {
                removeItem("diaryEntries", entry._id);
                setPage((p) => Math.max(0, p - 1));
                toast("Page removed", {
                  description: "That page is gone for good.",
                });
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
            setSelectedSticker(null);
            setSelectedPhoto(null);
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
            setSelectedSticker(null);
            setSelectedPhoto(null);
            playPageTurn();
          }}
          disabled={safePage === total - 1}
          className="clay-chip flex items-center gap-1 rounded-full px-4 py-2.5 text-xs font-bold text-ink-deep transition-transform hover:scale-105 active:scale-95 disabled:opacity-40"
        >
          newer <ChevronRight className="size-4" />
        </button>
      </div>

      <p className="text-center text-[11px] font-semibold text-ink-soft">
        drag stickers & photos anywhere — your page, your layout 🌸
      </p>
    </div>
  );
}
