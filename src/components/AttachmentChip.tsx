import { motion } from "framer-motion";
import { useState } from "react";
import { ImageIcon, Pause, Play, Video } from "lucide-react";
import { cn } from "@/lib/utils";

export interface Attachment {
  kind: "audio" | "video" | "photo";
  label: string;
  duration?: number;
  art?: string;
}

function fmt(seconds?: number): string {
  if (!seconds) return "0:07";
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

/** Animated waveform for audio chips and the recorder. */
export function Waveform({
  playing = false,
  bars = 22,
  className,
}: {
  playing?: boolean;
  bars?: number;
  className?: string;
}) {
  return (
    <div className={cn("flex h-6 items-center gap-[3px]", className)} aria-hidden>
      {Array.from({ length: bars }).map((_, i) => {
        const h = 4 + ((i * 7) % 13);
        return (
          <motion.span
            key={i}
            animate={
              playing
                ? { scaleY: [0.35, 1, 0.45, 0.9, 0.4], opacity: [0.7, 1, 0.7] }
                : { scaleY: 0.4, opacity: 0.75 }
            }
            transition={
              playing
                ? {
                    duration: 0.9,
                    repeat: Infinity,
                    ease: "easeInOut",
                    delay: (i % 7) * 0.09,
                  }
                : { duration: 0.2 }
            }
            style={{ height: h }}
            className="w-[3px] origin-center rounded-full bg-lavender-400"
          />
        );
      })}
    </div>
  );
}

/**
 * A cozy attachment chip. Audio shows a playable waveform, video a rounded
 * avatar frame, photo a pastel thumbnail. Attachments are always optional —
 * notes and diaries are complete without them.
 */
export function AttachmentChip({ attachment }: { attachment: Attachment }) {
  const [playing, setPlaying] = useState(false);

  if (attachment.kind === "audio") {
    return (
      <div className="flex items-center gap-2.5 rounded-full bg-lavender-100/70 py-1.5 pr-4 pl-1.5">
        <button
          type="button"
          onClick={() => setPlaying((p) => !p)}
          className="clay-chip flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-lavender-600 transition-transform hover:scale-105 active:scale-95"
          aria-label={playing ? "Pause voice note" : "Play voice note"}
        >
          {playing ? <Pause className="size-3.5" /> : <Play className="ml-0.5 size-3.5" />}
        </button>
        <Waveform playing={playing} bars={16} />
        <span className="text-[11px] font-bold text-ink">
          {attachment.label}
        </span>
        <span className="text-[10px] font-semibold text-ink-soft">
          {fmt(attachment.duration)}
        </span>
      </div>
    );
  }

  if (attachment.kind === "video") {
    return (
      <div className="flex items-center gap-2 rounded-2xl bg-mint-100/70 py-1.5 pr-3 pl-1.5">
        <div className="relative flex h-10 w-12 items-center justify-center overflow-hidden rounded-xl bg-gradient-to-b from-mint-200 to-mint-100">
          <span className="text-lg drop-shadow-sm">{attachment.art ?? "🐻"}</span>
          <span className="absolute right-1 bottom-1 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-ink-deep/70">
            <Play className="ml-px size-2 text-cream-soft" />
          </span>
        </div>
        <div className="leading-tight">
          <p className="text-[11px] font-bold text-ink">{attachment.label}</p>
          <p className="flex items-center gap-1 text-[9px] font-semibold text-ink-soft">
            <Video className="size-2.5" /> private video vent
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2 rounded-2xl bg-blush-100/70 py-1.5 pr-3 pl-1.5">
      <div
        className={cn(
          "flex h-10 w-12 items-center justify-center overflow-hidden rounded-xl",
          attachment.art ? "tile-peach" : "bg-gradient-to-b from-blush-200 to-blush-100",
        )}
      >
        <span className="text-lg drop-shadow-sm">{attachment.art ?? "🌸"}</span>
      </div>
      <div className="leading-tight">
        <p className="text-[11px] font-bold text-ink">{attachment.label}</p>
        <p className="flex items-center gap-1 text-[9px] font-semibold text-ink-soft">
          <ImageIcon className="size-2.5" /> kept private
        </p>
      </div>
    </div>
  );
}
