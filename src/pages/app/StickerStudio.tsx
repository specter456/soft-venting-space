import { motion } from "framer-motion";
import { toast } from "sonner";
import { useState } from "react";
import { useUnsavedWork } from "@/lib/useUnsavedGuard";
import { Loader2, Save, ImageDown } from "lucide-react";
import { Input } from "@/components/ui/input";
import { createVaultItem } from "@/lib/db";
import { saveToGallery } from "@/lib/save-to-gallery";
import {
  STICKER_ACCESSORIES,
  STICKER_COLORS,
  STICKER_EYES,
  STICKER_EXPRESSIONS,
  STICKER_MOUTHS,
} from "@/lib/art";
import { renderStickerArt } from "@/lib/canvas-art";
import { importGalleryPhoto, squareCropPhoto } from "@/lib/gallery";
import { cn } from "@/lib/utils";

const COLOR_TO_TILE: Record<string, string> = {
  lav: "tile-lavender",
  blush: "tile-blush",
  sky: "tile-mist",
  mint: "tile-mint",
  peach: "tile-peach",
  cream: "tile-peach",
};

export default function StickerStudio() {
  const [color, setColor] = useState(STICKER_COLORS[0]);
  const [expression, setExpression] = useState(STICKER_EXPRESSIONS[0]);
  const [eyes, setEyes] = useState(STICKER_EYES[1]);
  const [mouth, setMouth] = useState(STICKER_MOUTHS[1]);
  const [blush, setBlush] = useState(true);
  const [tear, setTear] = useState(false);
  const [accessory, setAccessory] = useState<string | null>("💗");
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);

  // Sticker source: the felt friend, or a gallery photo (square crop, soft edges).
  const [source, setSource] = useState<"felt" | "photo">("felt");
  const [photoArt, setPhotoArt] = useState<string | null>(null);

  // Unsaved-work signature: every control compared with the moment we
  // opened (or the last save) — any tweak makes the sticker dirty.
  const sig = JSON.stringify([
    STICKER_COLORS.indexOf(color),
    STICKER_EXPRESSIONS.indexOf(expression),
    STICKER_EYES.indexOf(eyes),
    STICKER_MOUTHS.indexOf(mouth),
    blush,
    tear,
    accessory ?? "",
    name.trim(),
    source,
    photoArt ?? "",
  ]);
  const [savedSig, setSavedSig] = useState(sig);

  const pickPhoto = async () => {
    const item = await importGalleryPhoto({ caption: "sticker photo" });
    if (!item) return; // cancelled, or the soft "didn't open" line showed
    const cropped = await squareCropPhoto(item.art);
    setPhotoArt(cropped ?? item.art);
    setSource("photo");
  };

  /** What gets saved/exported — the photo sticker, or the felt sticker. */
  const buildStickerArt = () =>
    source === "photo" && photoArt
      ? photoArt
      : renderStickerArt({
          color: color.hex,
          eyes: eyes.render,
          mouth: mouth.render,
          blush,
          tear,
          accessory,
        });

  const applyExpression = (id: string) => {
    const expr = STICKER_EXPRESSIONS.find((e) => e.id === id);
    if (!expr) return;
    setExpression(expr);
    setEyes(STICKER_EYES.find((e) => e.id === expr.eyes) ?? STICKER_EYES[0]);
    setMouth(STICKER_MOUTHS.find((m) => m.id === expr.mouth) ?? STICKER_MOUTHS[0]);
    setBlush(expr.blush);
    setTear(Boolean((expr as { tear?: boolean }).tear));
  };

  const save = async () => {
    if (saving) return false;
    setSaving(true);
    try {
      // capture the real sticker as a PNG — the vault shows the picture,
      // never a raw emoji. Stored on this device only.
      const art = buildStickerArt();
      createVaultItem({
        kind: "sticker",
        art: art || accessory || "🧸",
        bg: COLOR_TO_TILE[color.id] ?? "tile-peach",
        caption: name.trim() || (source === "photo" ? "a photo sticker" : `a ${expression.label} sticker`),
      });
      setSavedSig(sig);
      toast("Sticker saved", { description: "Tucked into your vault, ready whenever you need it." });
      return true;
    } catch (error) {
      console.error(error);
      toast("Couldn't save your sticker", { description: "Please try again in a moment." });
      return false;
    } finally {
      setSaving(false);
    }
  };

  // Unsaved = any control (or the name) changed since opening / last save.
  useUnsavedWork({ dirty: sig !== savedSig, onSave: save });

  return (
    <div className="space-y-5">
      {/* ─── Sticker source: felt friend, or a gallery photo ──────── */}
      <section>
        <p className="text-xs font-bold text-ink-soft uppercase tracking-wide">Sticker source</p>
        <div className="mt-2 flex gap-2">
          <button
            type="button"
            onClick={() => setSource("felt")}
            className={cn(
              "rounded-full px-4 py-2 text-xs font-bold transition-transform",
              source === "felt"
                ? "bg-lavender-500 text-cream-soft shadow-[0_6px_12px_-6px_rgba(118,90,190,0.6)]"
                : "clay-chip text-ink hover:-translate-y-0.5",
            )}
          >
            🧶 felt friend
          </button>
          <button
            type="button"
            onClick={() => {
              setSource("photo");
              if (!photoArt) void pickPhoto();
            }}
            className={cn(
              "rounded-full px-4 py-2 text-xs font-bold transition-transform",
              source === "photo"
                ? "bg-lavender-500 text-cream-soft shadow-[0_6px_12px_-6px_rgba(118,90,190,0.6)]"
                : "clay-chip text-ink hover:-translate-y-0.5",
            )}
          >
            📷 from gallery
          </button>
        </div>
        {source === "photo" && !photoArt && (
          <button
            type="button"
            onClick={() => void pickPhoto()}
            className="clay-btn-soft mt-2 flex w-full items-center justify-center gap-2 rounded-2xl px-5 py-3 text-sm font-bold text-ink-deep"
          >
            📷 choose a photo from your gallery
          </button>
        )}
        {source === "photo" && photoArt && (
          <button
            type="button"
            onClick={() => void pickPhoto()}
            className="mt-2 text-[11px] font-bold text-lavender-600 transition-colors hover:text-lavender-700"
          >
            choose a different photo
          </button>
        )}
      </section>

      {/* ─── Preview ──────────────────────────────────────────────── */}
      <div className="clay-card flex items-center justify-center px-5 py-8">
        {source === "photo" && photoArt ? (
          <img
            src={photoArt}
            alt="your photo sticker"
            draggable={false}
            className="h-44 w-44 object-contain drop-shadow-[0_10px_18px_rgba(99,82,150,0.35)]"
          />
        ) : (
          <StickerPreview
            color={color.hex}
            eyes={eyes.render}
            mouth={mouth.render}
            blush={blush}
            tear={tear}
            accessory={accessory}
            big
          />
        )}
      </div>

      {source === "felt" && (
        <>
      {/* ─── Expressions ──────────────────────────────────────────── */}
      <section>
        <p className="text-xs font-bold text-ink-soft uppercase tracking-wide">Expression</p>
        <div className="mt-2 flex gap-2 overflow-x-auto pb-1">
          {STICKER_EXPRESSIONS.map((e) => (
            <button
              key={e.id}
              type="button"
              onClick={() => applyExpression(e.id)}
              className={cn(
                "shrink-0 rounded-full px-4 py-2 text-xs font-bold transition-transform",
                expression.id === e.id
                  ? "bg-lavender-500 text-cream-soft shadow-[0_6px_12px_-6px_rgba(118,90,190,0.6)]"
                  : "clay-chip text-ink hover:-translate-y-0.5",
              )}
            >
              {e.label}
            </button>
          ))}
        </div>
      </section>

      {/* ─── Base color ───────────────────────────────────────────── */}
      <section>
        <p className="text-xs font-bold text-ink-soft uppercase tracking-wide">Soft base color</p>
        <div className="mt-2 flex flex-wrap gap-2">
          {STICKER_COLORS.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => setColor(c)}
              aria-label={c.name}
              className={cn(
                "h-10 w-10 rounded-full transition-transform hover:scale-110",
                color.id === c.id && "ring-2 ring-lavender-400 ring-offset-2 ring-offset-cream",
              )}
              style={{
                backgroundColor: c.hex,
                boxShadow: "inset 0 2px 4px rgba(255,255,255,0.7), 0 6px 12px -6px rgba(99,82,150,0.45)",
              }}
            />
          ))}
        </div>
      </section>

      {/* ─── Eyes & mouth ─────────────────────────────────────────── */}
      <section>
        <p className="text-xs font-bold text-ink-soft uppercase tracking-wide">Eyes</p>
        <div className="mt-2 flex gap-2 overflow-x-auto pb-1">
          {STICKER_EYES.map((e) => (
            <button
              key={e.id}
              type="button"
              onClick={() => setEyes(e)}
              className={cn(
                "shrink-0 rounded-2xl px-3 py-2 text-xs font-bold transition-transform",
                eyes.id === e.id
                  ? "bg-lavender-500 text-cream-soft"
                  : "clay-chip text-ink hover:-translate-y-0.5",
              )}
            >
              {e.render}
            </button>
          ))}
        </div>
      </section>

      <section>
        <p className="text-xs font-bold text-ink-soft uppercase tracking-wide">Mouth</p>
        <div className="mt-2 flex gap-2 overflow-x-auto pb-1">
          {STICKER_MOUTHS.map((m) => (
            <button
              key={m.id}
              type="button"
              onClick={() => setMouth(m)}
              className={cn(
                "shrink-0 rounded-2xl px-3 py-2 text-xs font-bold transition-transform",
                mouth.id === m.id
                  ? "bg-lavender-500 text-cream-soft"
                  : "clay-chip text-ink hover:-translate-y-0.5",
              )}
            >
              {m.render}
            </button>
          ))}
        </div>
      </section>

      {/* ─── Blush & tears ────────────────────────────────────────── */}
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => setBlush((b) => !b)}
          className={cn(
            "flex-1 rounded-2xl px-4 py-3 text-xs font-bold transition-transform",
            blush ? "bg-blush-200/80 text-ink-deep" : "clay-chip text-ink-soft",
          )}
        >
          {blush ? "〃 blush on" : "no blush"}
        </button>
        <button
          type="button"
          onClick={() => setTear((t) => !t)}
          className={cn(
            "flex-1 rounded-2xl px-4 py-3 text-xs font-bold transition-transform",
            tear ? "bg-mist-100 text-ink-deep" : "clay-chip text-ink-soft",
          )}
        >
          {tear ? "💧 tear on" : "no tears"}
        </button>
      </div>

      {/* ─── Accessories ──────────────────────────────────────────── */}
      <section>
        <p className="text-xs font-bold text-ink-soft uppercase tracking-wide">Accessories</p>
        <div className="mt-2 flex gap-2 overflow-x-auto pb-1">
          {STICKER_ACCESSORIES.map((a) => (
            <button
              key={a}
              type="button"
              onClick={() => setAccessory(accessory === a ? null : a)}
              className={cn(
                "clay-chip flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-xl transition-transform hover:scale-110",
                accessory === a && "ring-2 ring-lavender-400 ring-offset-2 ring-offset-cream",
              )}
            >
              {a}
            </button>
          ))}
        </div>
      </section>
        </>
      )}

      <Input
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Name your sticker (optional)"
        className="rounded-2xl border-lavender-200/70 bg-cream-soft text-sm text-ink-deep placeholder:text-ink-soft/70 focus-visible:ring-lavender-300"
      />

      <div className="flex gap-2">
        <button
          type="button"
          onClick={save}
          disabled={saving}
          className="clay-btn flex flex-1 items-center justify-center gap-2 rounded-2xl px-4 py-3.5 text-sm font-bold text-cream-soft"
        >
          {saving ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <Save className="size-4" />
          )}
          Save to vault
        </button>
        <button
          type="button"
          onClick={() => {
            const art = buildStickerArt();
            if (art) saveToGallery(art, `venting-sticker-${Date.now()}.png`);
          }}
          className="clay-btn-soft flex items-center justify-center gap-1.5 rounded-2xl px-4 py-3.5 text-sm font-bold text-ink-deep"
        >
          <ImageDown className="size-4" />
          Save to gallery
        </button>
      </div>
    </div>
  );
}

export function StickerPreview({
  color,
  eyes,
  mouth,
  blush,
  tear,
  accessory,
  big = false,
  className,
}: {
  color: string;
  eyes: string;
  mouth: string;
  blush: boolean;
  tear: boolean;
  accessory: string | null;
  big?: boolean;
  className?: string;
}) {
  const [eyeL, eyeR] = eyes.split(" ").filter(Boolean);
  const size = big ? "h-44 w-44" : "h-20 w-20";
  return (
    <motion.div
      initial={{ scale: 0.85, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ type: "spring", stiffness: 220, damping: 18 }}
      className={cn("relative rounded-full", size, className)}
      style={{
        backgroundColor: color,
        boxShadow:
          "inset 0 3px 6px rgba(255,255,255,0.75), inset 0 -8px 14px -8px rgba(99,82,150,0.4), 0 18px 30px -12px rgba(99,82,150,0.5)",
      }}
    >
      {/* blush */}
      {blush && (
        <>
          <span
            aria-hidden
            className="absolute top-[42%] left-[16%] h-3 w-5 rounded-full bg-[#f2a8b8]/70 blur-[1px]"
          />
          <span
            aria-hidden
            className="absolute top-[42%] right-[16%] h-3 w-5 rounded-full bg-[#f2a8b8]/70 blur-[1px]"
          />
        </>
      )}
      {/* eyes */}
      <span aria-hidden className="absolute top-[34%] left-[24%] text-xl font-bold text-ink-deep sm:text-2xl">
        {eyeL || "•"}
      </span>
      <span aria-hidden className="absolute top-[34%] right-[24%] text-xl font-bold text-ink-deep sm:text-2xl">
        {eyeR || "•"}
      </span>
      {/* mouth */}
      <span aria-hidden className="absolute top-[58%] left-1/2 -translate-x-1/2 text-2xl font-bold text-ink-deep sm:text-3xl">
        {mouth}
      </span>
      {/* tear */}
      {tear && (
        <motion.span
          aria-hidden
          animate={{ y: [0, 4, 0], opacity: [1, 0.6, 1] }}
          transition={{ duration: 1.8, repeat: Infinity }}
          className="absolute bottom-[22%] left-[20%] text-lg"
        >
          💧
        </motion.span>
      )}
      {/* accessory */}
      {accessory && (
        <span aria-hidden className="absolute -top-2 -right-1 text-2xl drop-shadow-sm sm:text-3xl">
          {accessory}
        </span>
      )}
    </motion.div>
  );
}
