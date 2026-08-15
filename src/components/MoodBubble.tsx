import type { Mood } from "@/lib/moods";
import { cn } from "@/lib/utils";

interface MoodBubbleProps {
  mood: Mood;
  selected?: boolean;
  size?: "sm" | "md" | "lg";
  onClick?: () => void;
  className?: string;
}

const sizeClasses = {
  sm: "h-11 w-11 text-xl",
  md: "h-14 w-14 text-2xl",
  lg: "h-16 w-16 text-3xl",
};

export function MoodBubble({
  mood,
  selected = false,
  size = "md",
  onClick,
  className,
}: MoodBubbleProps) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      aria-label={mood.label}
      onClick={onClick}
      className={cn(
        "mood-bubble shrink-0",
        mood.clay,
        sizeClasses[size],
        selected && "mood-bubble-selected",
        className,
      )}
    >
      <span aria-hidden="true" className="leading-none drop-shadow-sm">
        {mood.emoji}
      </span>
    </button>
  );
}
