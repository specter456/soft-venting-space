import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { WorldPickerTile } from "@/components/WorldPickerTile";
import { FriendsPickerTile } from "@/components/FriendsPickerTile";
import { MagicPickerTile } from "@/components/MagicPickerTile";
import type { CustomGameConfig } from "@/pages/app/GamesScreen";

const RECIPES = [
  { id: "starry-catch", name: "starry catch", preset: { world: "starry" as const, things: ["stars"] as const, touch: "catch" as const, sparkleStyle: "sparkles" as const, objectSize: "medium" as const, sound: "chimes" as const, pace: "slow" as const } },
  { id: "petal-rain",   name: "petal rain",   preset: { world: "garden" as const, things: ["petals"] as const, touch: "blow" as const, sparkleStyle: "hearts" as const, objectSize: "medium" as const, sound: "wind" as const, pace: "medium" as const } },
  { id: "firefly-jar",  name: "firefly jar",  preset: { world: "starry" as const, things: ["fireflies"] as const, touch: "soothe" as const, sparkleStyle: "stars" as const, objectSize: "small" as const, sound: "piano" as const, pace: "slow" as const } },
  { id: "bubble-sea",   name: "bubble sea",   preset: { world: "sea" as const, things: ["bubbles"] as const, touch: "pop" as const, sparkleStyle: "ripples" as const, objectSize: "medium" as const, sound: "rain" as const, pace: "slow" as const } },
];

function guideLine(id: string | null): string {
  const map: Record<string, string> = {
    sky: "a soft blue day ☁️",
    sunset: "golden hour, warm glow 🌅",
    starry: "a quiet night sky 🌙",
    garden: "a gentle garden · soft and green 🌿",
    sea: "ripples and breeze · very calm 🌊",
    cozy: "a warm little room, safe and soft 🕯️",
    bubbles: "bubbles! i love bubbles 🫧",
    stars: "ooh, starry night ✨",
    clouds: "soft clouds floating by ☁️",
    petals: "petals, so gentle 🌸",
    fireflies: "little fireflies flickering ✨",
    hearts: "hearts, always hearts 💜",
    fish: "little fish darting about 🐟",
    pop: "pop them gently",
    catch: "catch them with your fingers",
    note: "a tiny music note",
    blow: "blow them gently away",
    soothe: "soothe them until calm",
    sparkles: "twinkly sparkles",
    ripples: "soft ripples",
    hearts: "tiny hearts float up",
    notes: "music notes drift by",
  };
  return map[id] ?? "";
}

export function BuilderGuide({ phase, phaseId }: { phase: 1 | 2 | 3; phaseId: string | null }) {
  const line = guideLine(phaseId);
  return (
    <div className="clay-chip flex items-center gap-2 rounded-full bg-[var(--theme-card, rgba(255,255,255,0.65))] px-3 py-1 text-sm font-medium text-ink-soft">
      <span className="scaling-emoji text-base" aria-hidden>☁️</span>
      <span>{line || "pick something lovely"}</span>
    </div>
  );
}

export function StarterRow({ onApply, current }: { onApply: (id: string) => void; current?: Partial<CustomGameConfig> }) {
  const applied = (id: string) => onApply(id);
  return (
    <div className="clay-card px-5 py-4 space-y-3">
      <p className="text-[11px] font-bold text-ink-soft uppercase tracking-wide">or start from a recipe 🍳</p>
      <div className="flex flex-wrap gap-2">
        {RECIPES.map((r) => {
          const chosen = current && (
            current.world === r.preset.world &&
            current.touch === r.preset.touch &&
            current.sound === r.preset.sound &&
            current.pace === r.preset.pace &&
            current.things.length === r.preset.things.length &&
            current.things.every((t) => r.preset.things.includes(t))
          );
          return (
            <button
              key={r.id}
              type="button"
              onClick={() => applied(r.id)}
              className={cn(
                "rounded-full px-4 py-2 text-xs font-bold transition-all",
                chosen
                  ? "bg-[var(--theme-accent, #5F6DBE)] text-white shadow-md"
                  : "bg-[var(--theme-card, rgba(255,255,255,0.65))] text-ink-deep hover:bg-white/80 hover:scale-[1.02] active:scale-95",
              )}
            >
              {r.name}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function SavedGameCards({
  games,
  onOpen,
  onEdit,
  onDuplicate,
  onDelete,
}: {
  games: CustomGameConfig[];
  onOpen: (cfg: CustomGameConfig) => void;
  onEdit: (cfg: CustomGameConfig) => void;
  onDuplicate: (cfg: CustomGameConfig) => void;
  onDelete: (id: string) => void;
}) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm font-bold tracking-tight text-ink-deep">your little games</p>
        {games.length > 0 && (
          <span className="text-[11px] font-bold text-ink-soft">{games.length} saved</span>
        )}
      </div>
      {games.length === 0 ? (
        <div className="clay-card rounded-2xl border border-dashed border-[#C4CBE8]/50 py-10 text-center">
          <p className="text-sm font-semibold text-ink-soft">no games yet — build one above and save it ✨</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {games.map((g) => {
            const meta = g.things.length ? g.things.join(", ") : "the world";
            const firstEmoji = g.things[0] ? { bubbles: "🫧", stars: "⭐", clouds: "☁️", petals: "🌸", fireflies: "✨", hearts: "💜", fish: "🐟" }[g.things[0]] : "✨";
            return (
              <motion.div
                key={g.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="clay-card overflow-hidden"
              >
                {/* live mini thumbnail */}
                <div className="h-24 overflow-hidden rounded-t-2xl bg-gradient-to-br" style={{ background: worldGradientFor(g.world) }}>
                  <div className="flex h-full items-center justify-center gap-2 opacity-70">
                    {g.things.slice(0, 3).map((t, i) => (
                      <span key={t} className="text-2xl" aria-hidden>
                        {t === "bubbles" ? "🫧" : t === "stars" ? "⭐" : t === "clouds" ? "☁️" : t === "petals" ? "🌸" : t === "fireflies" ? "✨" : t === "hearts" ? "💜" : "🐟"}
                      </span>
                    ))}
                  </div>
                  {g.things.length > 0 && (
                    <span className="absolute bottom-2 right-3 text-[9px] font-bold text-white/80 drop-shadow-sm">
                      ✨ {meta}
                    </span>
                  )}
                </div>
                <div className="p-4 space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-bold text-ink-deep">{g.name || "my little game"}</p>
                      <p className="truncate text-[11px] text-ink-soft">{meta}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => onOpen(g)}
                      className="shrink-0 clay-chip rounded-full px-3 py-1 text-[10px] font-bold text-ink-deep hover:scale-105"
                    >
                      ▶ play
                    </button>
                  </div>
                  {g.whisper && <p className="text-[11px] italic text-ink-soft">“{g.whisper}”</p>}
                  <div className="flex gap-2">
                    <button type="button" onClick={() => onEdit(g)} className="clay-chip rounded-full px-3 py-1 text-[10px] font-bold text-ink-soft hover:text-ink-deep flex items-center gap-1">
                      ✎ edit
                    </button>
                    <button type="button" onClick={() => onDuplicate(g)} className="clay-chip rounded-full px-3 py-1 text-[10px] font-bold text-ink-soft hover:text-ink-deep flex items-center gap-1">
                      ⧉ dup
                    </button>
                    <div className="flex-1" />
                    <button type="button" onClick={() => { if (window.confirm("remove this little game?")) onDelete(g.id); }} className="clay-chip rounded-full px-3 py-1 text-[10px] font-bold text-[#C48B9E] hover:text-[#A06070] transition-colors flex items-center gap-1">
                      ✕
                    </button>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function worldGradientFor(world: string): string {
  switch (world) {
    case "sky": return "linear-gradient(135deg, #B8D4E8, #E8F0F8)";
    case "sunset": return "linear-gradient(135deg, #E8C8A0, #D090B0)";
    case "starry": return "linear-gradient(135deg, #283058, #484078)";
    case "garden": return "linear-gradient(135deg, #B4D8B0, #E0F0D8)";
    case "sea": return "linear-gradient(135deg, #80C0D8, #C0E8F0)";
    case "cozy": return "linear-gradient(135deg, #E8D8C8, #F8F0E8)";
    default: return "linear-gradient(135deg, #B8D4E8, #E8F0F8)";
  }
}
