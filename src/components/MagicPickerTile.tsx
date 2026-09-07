import { cn } from "@/lib/utils";
import type { TouchAction, SparkleStyle, GameSound, GamePace } from "@/pages/app/GamesScreen";

const TOUCH_ROW = [
  { id: "pop" as const, label: "Pop it", emoji: "💥" },
  { id: "catch" as const, label: "Catch it", emoji: "🫳" },
  { id: "note" as const, label: "A note", emoji: "🎵" },
  { id: "blow" as const, label: "Blow away", emoji: "🌬️" },
  { id: "soothe" as const, label: "Soothe it", emoji: "😊" },
];

const SPARKLE_ROW = [
  { id: "sparkles" as const, label: "Sparkles", emoji: "✨" },
  { id: "ripples" as const, label: "Ripples", emoji: "🌊" },
  { id: "hearts" as const, label: "Hearts", emoji: "💜" },
  { id: "notes" as const, label: "Music notes", emoji: "🎵" },
];

const SOUND_ROW = [
  { id: "chimes" as const, label: "Chimes" },
  { id: "rain" as const, label: "Rain" },
  { id: "wind" as const, label: "Wind" },
  { id: "piano" as const, label: "Piano" },
  { id: "none" as const, label: "None" },
];

const PACE_ROW = [
  { id: "very-slow" as const, label: "Very slow" },
  { id: "slow" as const, label: "Slow" },
  { id: "medium" as const, label: "Medium" },
];

export function MagicPickerTile({
  touch,
  setTouch,
  sparkleStyle,
  setSparkleStyle,
  sound,
  setSound,
  pace,
  setPace,
}: {
  touch: TouchAction;
  setTouch: (t: TouchAction) => void;
  sparkleStyle: SparkleStyle;
  setSparkleStyle: (s: SparkleStyle) => void;
  sound: GameSound;
  setSound: (s: GameSound) => void;
  pace: GamePace;
  setPace: (p: GamePace) => void;
}) {
  return (
    <div className="clay-card overflow-hidden p-4">
      {/* Touch */}
      <div className="mb-3">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-sm" aria-hidden>🎮</span>
          <span className="text-xs font-bold text-ink-deep">Touch</span>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {TOUCH_ROW.map((t) => (
            <TouchChip key={t.id} id={t.id} label={t.label} emoji={t.emoji} active={touch === t.id} onClick={() => setTouch(t.id)} />
          ))}
        </div>
      </div>

      {/* Sparkle style */}
      <div className="mb-3">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-sm" aria-hidden>✨</span>
          <span className="text-xs font-bold text-ink-deep">Sparkle style</span>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {SPARKLE_ROW.map((s) => (
            <TouchChip key={s.id} id={s.id} label={s.label} emoji={s.emoji} active={sparkleStyle === s.id} onClick={() => setSparkleStyle(s.id)} />
          ))}
        </div>
      </div>

      {/* Sound */}
      <div className="mb-3">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-sm" aria-hidden>🎶</span>
          <span className="text-xs font-bold text-ink-deep">Sound</span>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {SOUND_ROW.map((s) => (
            <TouchChip key={s.id} id={s.id} label={s.label} active={sound === s.id} onClick={() => setSound(s.id)} />
          ))}
        </div>
      </div>

      {/* Pace */}
      <div>
        <div className="flex items-center gap-2 mb-2">
          <span className="text-sm" aria-hidden>🐢</span>
          <span className="text-xs font-bold text-ink-deep">Pace</span>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {PACE_ROW.map((p) => (
            <TouchChip key={p.id} id={p.id} label={p.label} active={pace === p.id} onClick={() => setPace(p.id)} />
          ))}
        </div>
      </div>
    </div>
  );
}

function TouchChip({
  label,
  emoji,
  active,
  onClick,
}: {
  id: string;
  label: string;
  emoji?: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex items-center gap-1 rounded-full px-3 py-1.5 text-xs font-bold transition-all",
        active
          ? "bg-[var(--theme-accent, #5F6DBE)] text-white shadow-md"
          : "bg-white/70 text-ink-deep hover:bg-white hover:scale-[1.02] active:scale-95",
      )}
    >
      {emoji && <span className="text-sm" aria-hidden>{emoji}</span>}
      {label}
    </button>
  );
}
