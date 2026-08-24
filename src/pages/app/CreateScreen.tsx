import { motion } from "framer-motion";
import { toast } from "sonner";
import { useState } from "react";
import { Link } from "react-router";
import { ArrowLeft, Check, Images, Loader2, Lock, Palette, Sparkles, ImageDown, Grid2x2 } from "lucide-react";
import { createVaultItem } from "@/lib/db";
import { saveToGallery } from "@/lib/save-to-gallery";
import { combineIntoCollage } from "@/lib/collage";
import { PHOTO_SCENES } from "@/lib/art";
import { renderPhotoScene } from "@/lib/canvas-art";
import { cn } from "@/lib/utils";

const TOOLS = [
  {
    to: "/dashboard/scribble",
    title: "Scribble",
    emoji: "🖍️",
    tile: "tile-lavender",
    blurb: "draw the feelings words can't reach",
    action: "Scribble →",
  },
  {
    to: "/dashboard/stickers",
    title: "Stickers",
    emoji: "🧸",
    tile: "tile-peach",
    blurb: "make tiny felt companions for hard days",
    action: "Make stickers →",
  },
  {
    to: "/dashboard/gif-studio",
    title: "GIF Studio",
    emoji: "🎞️",
    tile: "tile-blush",
    blurb: "doodle, collage & turn moments into GIFs",
    action: "Open studio →",
  },
];

export default function CreateScreen() {
  const [view, setView] = useState<"hub" | "photos">("hub");
  const [selected, setSelected] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  const savePhotos = async () => {
    if (saving || selected.length === 0) return;
    setSaving(true);
    try {
      for (const emoji of selected) {
        const scene = PHOTO_SCENES.find((s) => s.emoji === emoji);
        if (!scene) continue;
        // capture the scene as a real PNG — the vault shows the picture,
        // not a raw emoji. Stored on this device only.
        createVaultItem({
          kind: "photo",
          art: renderPhotoScene(scene.emoji, scene.bg) || scene.emoji,
          bg: scene.bg,
          caption: scene.label,
        });
      }
      toast("Saved to your vault", {
        description: `${selected.length} photo${selected.length > 1 ? "s" : ""} tucked behind the double lock.`,
      });
      setSelected([]);
      setView("hub");
    } catch (error) {
      console.error(error);
      toast("Couldn't save those photos", { description: "Please try again in a moment." });
    } finally {
      setSaving(false);
    }
  };

  if (view === "photos") {
    return (
      <div className="space-y-5">
        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={() => setView("hub")}
            className="clay-chip flex h-10 w-10 items-center justify-center rounded-full text-ink-deep transition-transform hover:scale-105 active:scale-95"
            aria-label="Back"
          >
            <ArrowLeft className="size-4" />
          </button>
          <p className="text-sm font-bold tracking-tight text-ink-deep">Add photos</p>
          <span className="w-10" />
        </div>

        <p className="text-center text-sm font-medium text-ink-soft">
          Pick soft moments — they&apos;ll be locked inside your private vault.
        </p>

        <div className="grid grid-cols-3 gap-3">
          {PHOTO_SCENES.map((scene) => {
            const active = selected.includes(scene.emoji);
            return (
              <button
                key={scene.emoji}
                type="button"
                onClick={() =>
                  setSelected((prev) =>
                    active ? prev.filter((e) => e !== scene.emoji) : [...prev, scene.emoji],
                  )
                }
                className={cn(
                  "relative flex aspect-square flex-col items-center justify-center rounded-[1.4rem] transition-transform hover:scale-[1.03]",
                  scene.bg,
                  active && "ring-2 ring-lavender-400 ring-offset-2 ring-offset-cream",
                )}
              >
                <span className="text-4xl drop-shadow-sm">{scene.emoji}</span>
                <span className="mt-1 max-w-full truncate px-2 text-[9px] font-bold text-ink-deep/70">
                  {scene.label}
                </span>
                {active && (
                  <span className="absolute top-2 right-2 flex h-5 w-5 items-center justify-center rounded-full bg-lavender-500 text-cream-soft">
                    <Check className="size-3" />
                  </span>
                )}
              </button>
            );
          })}
        </div>

        <div className="flex gap-2">
          <button
            type="button"
            onClick={savePhotos}
            disabled={selected.length === 0 || saving}
            className="clay-btn flex flex-1 items-center justify-center gap-2 rounded-2xl px-4 py-3.5 text-sm font-bold text-cream-soft disabled:opacity-50"
          >
            {saving ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Lock className="size-4" />
            )}
            Save{selected.length > 0 ? ` ${selected.length}` : ""} to vault
          </button>
          <button
            type="button"
            disabled={selected.length === 0}
            onClick={() => {
              for (const emoji of selected) {
                const scene = PHOTO_SCENES.find((s) => s.emoji === emoji);
                if (!scene) continue;
                const art = renderPhotoScene(scene.emoji, scene.bg);
                if (art) saveToGallery(art, `venting-photo-${scene.label.replace(/\s+/g, "-").toLowerCase()}-${Date.now()}.png`);
              }
            }}
            className="clay-btn-soft flex items-center justify-center gap-1.5 rounded-2xl px-4 py-3.5 text-sm font-bold text-ink-deep disabled:opacity-50"
          >
            <ImageDown className="size-4" />
            Gallery
          </button>
        </div>
        {selected.length >= 2 && (
          <button
            type="button"
            onClick={async () => {
              const arts = selected.map((emoji) => {
                const scene = PHOTO_SCENES.find((s) => s.emoji === emoji);
                return scene ? renderPhotoScene(scene.emoji, scene.bg) : "";
              }).filter(Boolean);
              const collage = await combineIntoCollage(arts);
              if (collage) {
                createVaultItem({ kind: "photo", art: collage, bg: "tile-peach", caption: `a ${arts.length}-photo collage` });
                saveToGallery(collage, `venting-collage-${Date.now()}.png`);
                toast("Collage saved", { description: `${arts.length} photos combined into one framed photo.` });
              }
            }}
            className="clay-btn-soft flex w-full items-center justify-center gap-2 rounded-2xl px-5 py-3 text-sm font-bold text-ink-deep"
          >
            <Grid2x2 className="size-4" /> combine all into one framed photo ({selected.length} photos)
          </button>
        )}
        <p className="text-center text-[11px] font-semibold text-ink-soft">
          🔒 double-locked · only you can open the vault
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-lg font-bold tracking-tight text-ink-deep">Create</h2>
        <p className="text-xs font-medium text-ink-soft">
          make something soft out of how you feel
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <motion.button
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          type="button"
          onClick={() => setView("photos")}
          className="clay-card group flex flex-col items-center justify-center gap-2 rounded-[1.8rem] px-4 py-5 text-center transition-transform hover:-translate-y-1"
        >            <span className="clay-chip flex h-12 w-12 items-center justify-center rounded-full text-2xl transition-transform group-hover:scale-110">
            <Images className="size-5 text-lavender-500" />
          </span>            <span className="text-sm font-bold tracking-tight text-ink-deep">Photos</span>
          <span className="text-[10px] leading-snug font-medium text-ink-soft">
            keep moments in your locked vault
          </span>
          <span className="mt-auto text-xs font-bold text-lavender-600">Add photos →</span>
        </motion.button>

        {TOOLS.map((tool, i) => (
          <motion.div
            key={tool.to}
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.06 * (i + 1) }}
          >
            <Link
              to={tool.to}
              className="clay-card group flex flex-col items-center justify-center gap-2 rounded-[1.8rem] px-4 py-5 text-center transition-transform hover:-translate-y-1"
            >
              <span
                className={cn(
                  "flex h-12 w-12 items-center justify-center rounded-full text-2xl transition-transform group-hover:scale-110",
                  tool.tile,
                )}
              >
                <span aria-hidden className="drop-shadow-sm">
                  {tool.emoji}
                </span>
              </span>
              <span className="text-sm font-bold tracking-tight text-ink-deep">{tool.title}</span>
              <span className="text-[10px] leading-snug font-medium text-ink-soft">{tool.blurb}</span>
              <span className="mt-auto text-xs font-bold text-lavender-600">{tool.action}</span>
            </Link>
          </motion.div>
        ))}

        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.3 }}
        >
          <Link
            to="/dashboard/vault"              className="clay-card group flex flex-col items-center justify-center gap-2 rounded-[1.8rem] px-4 py-5 text-center transition-transform hover:-translate-y-1"
          >
            <div className="relative">
              <span className="clay-chip flex h-12 w-12 items-center justify-center rounded-full bg-lavender-100 text-xl">
                🗝️
              </span>
              <span className="absolute -right-2 -bottom-1 flex items-center" aria-hidden>
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-lavender-100 text-lavender-600">
                  <Lock className="size-2.5" />
                </span>
                <span className="-ml-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-blush-100 text-blush-500">
                  <Lock className="size-2.5" />
                </span>
              </span>
            </div>
            <span className="text-sm font-bold tracking-tight text-ink-deep">Photo Vault</span>
            <span className="text-[10px] leading-snug font-medium text-ink-soft">
              photos, video vents & GIFs, double-locked
            </span>
            <span className="mt-auto text-xs font-bold text-blush-500">Open vault →</span>
          </Link>
        </motion.div>
      </div>

      <div className="clay-card flex items-center gap-3 rounded-[2rem] px-5 py-4">
        <span className="clay-chip flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-lavender-500">
          <Palette className="size-4" />
        </span>
        <p className="text-xs leading-relaxed font-medium text-ink">
          Everything you create here stays in your private vault —{" "}
          <span className="font-bold text-ink-deep">no posting, no sharing, ever.</span>
        </p>
        <Sparkles className="size-4 shrink-0 text-lavender-300" aria-hidden />
      </div>
    </div>
  );
}
