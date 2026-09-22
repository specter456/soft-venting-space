import { motion } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import { ImageIcon, Pause, Play, Video } from "lucide-react";
import { cn } from "@/lib/utils";
import { useTable, type Recording } from "@/lib/db";
import { music } from "@/lib/music";

export interface Attachment {
  kind: "audio" | "video" | "photo";
  label: string;
  duration?: number;
  art?: string;
  /** Linked recording so the chip can actually play the audio back. */
  recordingId?: string;
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
export function AttachmentChip({
  attachment,
  recordingId,
}: {
  attachment: Attachment;
  /** Fallback link (e.g. resolved from the note/diary's attached recording). */
  recordingId?: string;
}) {
  const [playing, setPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const musicWasPlaying = useRef(false);
  const blipTimer = useRef<number | null>(null);

  // Resolve the real recording so the play button makes actual sound.
  const recordings = useTable<Recording>("recordings");
  const linkedId = attachment.recordingId ?? recordingId;
  const dataUrl = linkedId
    ? recordings.find((r) => r._id === linkedId)?.dataUrl
    : undefined;

  const resumeMusic = () => {
    if (musicWasPlaying.current) {
      musicWasPlaying.current = false;
      music.resume();
    }
  };

  // Stop sound and timers if the chip unmounts mid-playback.
  useEffect(() => {
    const audio = audioRef.current;
    return () => {
      if (blipTimer.current) window.clearTimeout(blipTimer.current);
      audio?.pause();
      if (musicWasPlaying.current) {
        musicWasPlaying.current = false;
        music.resume();
      }
    };
  }, []);

  const toggle = () => {
    if (!dataUrl) {
      // Legacy attachment with no recoverable audio — gentle waveform blip
      // so the button still gives feedback instead of feeling dead.
      if (playing) {
        if (blipTimer.current) window.clearTimeout(blipTimer.current);
        setPlaying(false);
        return;
      }
      setPlaying(true);
      blipTimer.current = window.setTimeout(() => setPlaying(false), 3500);
      return;
    }
    if (playing) {
      audioRef.current?.pause();
      return;
    }
    // One-brain: duck ambient music, then play the recording out loud.
    musicWasPlaying.current = music.getState().playing;
    music.stop(300);
    audioRef.current?.play().catch(() => {
      setPlaying(false);
      resumeMusic();
    });
  };

  if (attachment.kind === "audio") {
    return (
      <div className="flex items-center gap-2.5 rounded-full bg-lavender-100/70 py-1.5 pr-4 pl-1.5">
        <button
          type="button"
          onClick={toggle}
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
        {dataUrl && (
          <audio
            ref={audioRef}
            src={dataUrl}
            preload="auto"
            className="hidden"
            onPlay={() => setPlaying(true)}
            onPause={() => {
              setPlaying(false);
              resumeMusic();
            }}
            onEnded={() => {
              setPlaying(false);
              resumeMusic();
            }}
          />
        )}
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
