import { motion } from "framer-motion";
import { LockKeyhole } from "lucide-react";
import { Logo } from "@/components/Logo";
import { MoodBubble } from "@/components/MoodBubble";
import { MOODS } from "@/lib/moods";
import { cn } from "@/lib/utils";

const ROOMS = [
  { title: "Record", emoji: "🎙️", tile: "tile-mist", blurb: "voice & video vents" },
  { title: "Create", emoji: "🎨", tile: "tile-blush", blurb: "photos, stickers, GIFs" },
  { title: "Calm", emoji: "🌬️", tile: "tile-mint", blurb: "breathe & pop worries" },
  { title: "Diary", emoji: "📖", tile: "tile-lavender", blurb: "a cozy private book" },
];

/**
 * The phone mockup. By default it previews the app's cozy home screen; pass
 * `locked` to show only a gentle lock seal — the real app is never revealed
 * before login.
 */
export function PhoneMockup({
  className,
  locked = false,
}: {
  className?: string;
  locked?: boolean;
}) {
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

          {locked ? <LockedInside /> : <AppInside />}
        </div>
      </div>
    </div>
  );
}

/** Soft locked preview — the real app is never shown before login. */
function LockedInside() {
  return (
    <div className="flex min-h-[560px] flex-col px-5 pt-12 pb-6">
      {/* status-ish header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Logo className="h-8 w-8" />
          <div>
            <p className="text-[13px] font-bold tracking-tight text-ink-deep leading-none">
              Venting
            </p>
            <p className="text-[9px] text-ink-soft mt-0.5">your soft space</p>
          </div>
        </div>
        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-blush-100 to-lavender-100 text-base shadow-inner">
          🔒
        </div>
      </div>

      {/* lock seal + gentle message */}
      <div className="flex flex-1 flex-col items-center justify-center text-center">
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", stiffness: 220, damping: 16, delay: 0.15 }}
          className="clay-card flex h-20 w-20 items-center justify-center rounded-full"
        >
          <LockKeyhole className="h-9 w-9 text-lavender-500" />
        </motion.div>
        <p className="mt-5 text-[15px] font-bold tracking-tight text-ink-deep">
          What&apos;s inside is private.
        </p>
        <p className="mt-1.5 max-w-[200px] text-[10.5px] leading-relaxed font-medium text-ink-soft">
          Only you can see the feelings, notes, and little creations kept here.
        </p>
      </div>

      <p className="mt-4 text-center text-[8px] font-semibold text-ink-soft">
        🔒 no feed · no likes · no followers — only yours
      </p>
    </div>
  );
}

/** The cozy home preview shown only inside the app experience. */
function AppInside() {
  return (
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
        <div className="mt-3.5 grid grid-cols-4 gap-x-1 gap-y-2.5">
          {MOODS.map((mood, i) => (
            <div key={mood.id} className="flex flex-col items-center gap-0.5">
              <MoodBubble
                mood={mood}
                size="sm"
                selected={i === 5}
                onClick={() => undefined}
                className={i === 5 ? "animate-floaty" : undefined}
              />
              <span className="text-[7px] font-semibold text-ink-soft">
                {mood.label}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* the four rooms */}
      <div className="mt-4 space-y-2.5">
        {ROOMS.map((room) => (
          <div
            key={room.title}
            className="clay-card flex items-center gap-2.5 rounded-[1.4rem] px-3 py-2.5"
          >
            <div
              className={cn(
                "flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-base",
                room.tile,
              )}
            >
              <span aria-hidden>{room.emoji}</span>
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[11px] font-bold tracking-tight text-ink-deep">
                {room.title}
              </p>
              <p className="truncate text-[8px] font-medium text-ink-soft">
                {room.blurb}
              </p>
            </div>
            <span aria-hidden className="text-xs text-lavender-400">
              →
            </span>
          </div>
        ))}
      </div>

      <p className="mt-4 text-center text-[8px] font-semibold text-ink-soft">
        🔒 no feed · no likes · no followers — only yours
      </p>
    </div>
  );
}
