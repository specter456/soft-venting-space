import { motion } from "framer-motion";
import { useMutation } from "convex/react";
import { toast } from "sonner";
import { useState } from "react";
import { Loader2, Save } from "lucide-react";
import { api } from "@/convex/_generated/api";
import { Input } from "@/components/ui/input";
import {
  STICKER_ACCESSORIES,
  STICKER_COLORS,
  STICKER_EYES,
  STICKER_EXPRESSIONS,
  STICKER_MOUTHS,
} from "@/lib/art";
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
  const addToVault = useMutation(api.vault.create);

  const [color, setColor] = useState(STICKER_COLORS[0]);
  const [expression, setExpression] = useState(STICKER_EXPRESSIONS[0]);
  const [eyes, setEyes] = useState(STICKER_EYES[1]);
  const [mouth, setMouth] = useState(STICKER_MOUTHS[1]);
  const [blush, setBlush] = useState(true);
  const [tear, setTear] = useState(false);
  const [accessory, setAccessory] = useState<string | null>("💗");
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);

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
    if (saving) return;
    setSaving(true);
    try {
      await addToVault({
        kind: "sticker",
        art: accessory ?? "🧸",
        bg: COLOR_TO_TILE[color.id] ?? "tile-peach",
        caption: name.trim() || `a ${expression.label} sticker`,
      });
      toast("Sticker saved", { description: "Tucked into your vault, ready whenever you need it." });
    } catch (error) {
      console.error(error);
      toast("Couldn't save your sticker", { description: "Please try again in a moment." });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-5">
      {/* ─── Preview ──────────────────────────────────────────────── */}
      <div className="clay-card flex items-center justify-center rounded-[2rem] px-5 py-8">
        <StickerPreview
          color={color.hex}
          eyes={eyes.render}
          mouth={mouth.render}
          blush={blush}
          tear={tear}
          accessory={accessory}
          big
        />
      </div>

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
                "shrink-0 rounded-full px-4 py-2 text-xs font-bold transition-all",
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
                "shrink-0 rounded-2xl px-3 py-2 text-xs font-bold transition-all",
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
                "shrink-0 rounded-2xl px-3 py-2 text-xs font-bold transition-all",
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
            "flex-1 rounded-2xl px-4 py-3 text-xs font-bold transition-all",
            blush ? "bg-blush-200/80 text-ink-deep" : "clay-chip text-ink-soft",
          )}
        >
          {blush ? "〃 blush on" : "no blush"}
        </button>
        <button
          type="button"
          onClick={() => setTear((t) => !t)}
          className={cn(
            "flex-1 rounded-2xl px-4 py-3 text-xs font-bold transition-all",
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

      <Input
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Name your sticker (optional)"
        className="rounded-2xl border-lavender-200/70 bg-cream-soft text-sm text-ink-deep placeholder:text-ink-soft/70 focus-visible:ring-lavender-300"
      />

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
          <>
            <Save className="size-4" /> Save sticker to vault
          </>
        )}
      </button>
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
