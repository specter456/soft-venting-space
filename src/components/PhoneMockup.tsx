import { motion } from "framer-motion";
import {
  BookHeart,
  Brush,
  CloudSun,
  Lock,
  LockKeyhole,
  Mic,
  NotebookPen,
  Sticker,
} from "lucide-react";
import { Logo } from "@/components/Logo";
import { MoodBubble } from "@/components/MoodBubble";
import { MOODS } from "@/lib/moods";
import { cn } from "@/lib/utils";

const TOOLS = [
  { label: "Voice Vent", icon: Mic, tile: "tile-mist" },
  { label: "Notes", icon: NotebookPen, tile: "tile-blush" },
  { label: "Scribble", icon: Brush, tile: "tile-lavender" },
  { label: "Stickers", icon: Sticker, tile: "tile-peach" },
  { label: "Calm Game", icon: CloudSun, tile: "tile-mint" },
  { label: "Diary", icon: BookHeart, tile: "tile-lavender" },
];

export function PhoneMockup({ className }: { className?: string }) {
  return (
    <div className={cn("relative", className)}>
      {/* floating hearts & sparkles */}
      <motion.span
        aria-hidden
        className="animate-floaty absolute -top-6 -left-8 text-3xl drop-shadow-sm select-none"
      >
        🫧
      </motion.span>
      <motion.span
        aria-hidden
        className="animate-floaty-slow absolute -right-9 top-24 text-3xl select-none"
      >
        💜
      </motion.span>
      <motion.span
        aria-hidden
        className="animate-floaty absolute -bottom-5 left-6 text-2xl select-none"
      >
        ✨
      </motion.span>
      <motion.span
        aria-hidden
        className="animate-floaty-slow absolute -right-5 -bottom-8 text-3xl select-none"
      >
        🍑
      </motion.span>

      {/* phone body */}
      <div className="relative mx-auto w-[290px] rounded-[3rem] bg-gradient-to-b from-[#52496b] to-[#3d3654] p-[10px] shadow-[0_30px_60px_-20px_rgba(70,64,92,0.55)] sm:w-[320px]">
        {/* side buttons */}
        <div className="absolute top-24 -left-[2px] h-10 w-[3px] rounded-l bg-[#3d3654]" />
        <div className="absolute top-36 -left-[2px] h-10 w-[3px] rounded-l bg-[#3d3654]" />
        <div className="absolute top-28 -right-[2px] h-14 w-[3px] rounded-r bg-[#3d3654]" />

        <div className="relative overflow-hidden rounded-[2.4rem] bg-gradient-to-b from-cream-soft via-cream to-lavender-50">
          {/* notch */}
          <div className="absolute top-2.5 left-1/2 z-10 h-5 w-24 -translate-x-1/2 rounded-full bg-[#3d3654]" />

          <div className="px-5 pt-12 pb-6">
            {/* status-ish header */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Logo className="h-8 w-8" />
                <div>
                  <p className="text-[13px] font-bold tracking-tight text-ink-deep leading-none">
                    Venting
                  </p>
                  <p className="text-[9px] text-ink-soft mt-0.5">
                    your soft space
                  </p>
                </div>
              </div>
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-blush-100 to-lavender-100 text-base shadow-inner">
                🌙
              </div>
            </div>

            {/* greeting */}
            <p className="mt-5 text-[15px] font-bold tracking-tight text-ink-deep">
              Good evening, friend
            </p>
            <p className="mt-0.5 flex items-center gap-1 text-[10px] font-medium text-ink-soft">
              <LockKeyhole className="h-3 w-3" /> only you can see this space
            </p>

            {/* check-in card */}
            <div className="clay-card mt-4 rounded-[1.6rem] px-4 py-4">
              <p className="text-center text-[14px] font-bold tracking-tight text-ink-deep">
                How are you feeling today?
              </p>
              <p className="mt-1 text-center text-[10px] text-ink-soft">
                tap a feeling — there&apos;s no wrong answer
              </p>
              <div className="mt-4 grid grid-cols-4 gap-x-1 gap-y-3">
                {MOODS.map((mood, i) => (
                  <div key={mood.id} className="flex flex-col items-center gap-1">
                    <MoodBubble
                      mood={mood}
                      size="sm"
                      selected={i === 1}
                      onClick={() => undefined}
                      className={i === 1 ? "animate-floaty" : undefined}
                    />
                    <span className="text-[8px] font-semibold text-ink-soft">
                      {mood.label}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* toolkit preview */}
            <p className="mt-5 text-[11px] font-bold tracking-tight text-ink-soft">
              your soft toolkit <span className="font-medium">· blooming soon</span>
            </p>
            <div className="mt-2.5 grid grid-cols-3 gap-2.5">
              {TOOLS.map((tool) => (
                <div
                  key={tool.label}
                  className="clay-chip relative flex flex-col items-center gap-1.5 rounded-2xl px-1 py-2.5"
                >
                  <span className="absolute top-1.5 right-1.5 flex h-3 w-3 items-center justify-center rounded-full bg-lavender-100 text-lavender-500">
                    <Lock className="size-2" />
                  </span>
                  <div
                    className={cn(
                      "flex h-9 w-9 items-center justify-center rounded-xl text-ink-deep",
                      tool.tile,
                    )}
                  >
                    <tool.icon className="size-4" strokeWidth={2.2} />
                  </div>
                  <span className="text-[8px] font-semibold text-ink">
                    {tool.label}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
