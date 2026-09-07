import { motion, useAnimate } from "framer-motion";
import type { ChangeEvent, RefObject } from "react";
import type { World } from "@/pages/app/GamesScreen";

const WORLDS: {
  id: World;
  label: string;
  gradient: string;
  accent: string;
  emoji: string;
  puffs: string;
}[] = [
  {
    id: "sky",
    label: "Sky",
    gradient: "from-[#B8D4E8] via-[#D0E4F0] to-[#E8F0F8]",
    accent: "#5F6DBE",
    emoji: "☀️",
    puffs: "☁️",
  },
  {
    id: "sunset",
    label: "Sunset",
    gradient: "from-[#E8C8A0] via-[#E0A888] to-[#D090B0]",
    accent: "#C97B4E",
    emoji: "🌅",
    puffs: "☁️",
  },
  {
    id: "starry",
    label: "Starry",
    gradient: "from-[#283058] via-[#383868] to-[#484078]",
    accent: "#AAB6E3",
    emoji: "🌙",
    puffs: "✨",
  },
  {
    id: "garden",
    label: "Garden",
    gradient: "from-[#B4D8B0] via-[#C8E8C0] to-[#E0F0D8]",
    accent: "#5E9E6C",
    emoji: "🌿",
    puffs: "🌸",
  },
  {
    id: "sea",
    label: "Sea",
    gradient: "from-[#80C0D8] via-[#A0D8E8] to-[#C0E8F0]",
    emoji: "🌊",
    accent: "#5FA8C4",
    puffs: "🫧",
  },
  {
    id: "cozy",
    label: "Cozy room",
    gradient: "from-[#E8D8C8] via-[#F0E4D8] to-[#F8F0E8]",
    emoji: "🕯️",
    accent: "#C9A96A",
    puffs: "🤍",
  },
];

export function WorldPickerTile({
  world,
  worldPhoto,
  onPhotoSelect,
  fileRef,
  onClear,
}: {
  world: World;
  worldPhoto?: string;
  onPhotoSelect: (e: ChangeEvent<HTMLInputElement>) => void;
  fileRef: RefObject<HTMLInputElement | null>;
  onClear: () => void;
}) {
  const [scope, animate] = useAnimate();

  return (
    <div
      className="relative overflow-hidden rounded-2xl p-3 shadow-[0_20px_50px_-22px_rgba(120,150,190,0.3)]"
      style={{ background: `linear-gradient(135deg, ${WORLDS.find((w) => w.id === world)?.gradient} 0%, rgba(255,255,255,0.12) 100%)` }}
      onPointerEnter={() => {
        animate(scope.current, { scale: [1, 1.012], y: [0, -2] }, { duration: 0.4 });
      }}
      onPointerLeave={() => {
        animate(scope.current, { scale: 1, y: 0 }, { duration: 0.5 });
      }}
    >
      {/* live decorations */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        {world === "starry" ? (
          <>
            {[...Array(6)].map((_, i) => (
              <motion.span
                key={i}
                className="absolute text-[10px] text-white/80"
                animate={{
                  y: [0, -6, 0],
                  opacity: [0.3, 0.8, 0.3],
                }}
                transition={{ duration: 3, repeat: Infinity, delay: i * 0.5 }}
                style={{
                  left: `${10 + (i * 13) % 85}%`,
                  top: `${6 + (i * 7) % 30}%`,
                }}
                aria-hidden
              >
                ✦
              </motion.span>
            ))}
            <motion.span
              className="absolute text-lg text-white/50"
              animate={{ x: [-10, 10, -10], y: [0, -4, 0] }}
              transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
              style={{ left: "70%", top: "40%" }}
              aria-hidden
            >
              ☽
            </motion.span>
          </>
        ) : world === "sea" ? (
          <div className="absolute inset-x-0 top-6 h-4 overflow-hidden opacity-60" aria-hidden>
            {Array.from({ length: 8 }).map((_, i) => (
              <motion.span
                key={i}
                className="absolute text-sm"
                animate={{ x: [`${i * 4}vw`, `${i * 4 - 4}vw`] }}
                transition={{ duration: 6, repeat: Infinity, ease: "linear" }}
                style={{ top: "50%", left: "0%" }}
              >
                🌊
              </motion.span>
            ))}
          </div>
        ) : world === "garden" ? (
          <div className="absolute inset-0 opacity-40" aria-hidden>
            {[...Array(4)].map((_, i) => (
              <motion.span
                key={i}
                className="absolute text-xl"
                animate={{ y: [0, -12, 0], rotate: [0, 12, 0] }}
                transition={{ duration: 4 + i * 0.6, repeat: Infinity, ease: "easeInOut" }}
                style={{ left: `${12 + i * 22}%`, bottom: "4%" }}
              >
                🌸
              </motion.span>
            ))}
          </div>
        ) : world === "cozy" ? (
          <div className="absolute inset-0 opacity-30" aria-hidden>
            {[...Array(3)].map((_, i) => (
              <motion.span
                key={i}
                className="absolute text-2xl"
                animate={{ y: [-2, 0, -2] }}
                transition={{ duration: 3 + i, repeat: Infinity, ease: "easeInOut" }}
                style={{ left: `${30 + i * 20}%`, bottom: "18%" }}
              >
                🤍
              </motion.span>
            ))}
          </div>
        ) : world === "sunset" ? (
          <div className="absolute inset-0 opacity-30" aria-hidden>
            <motion.span
              className="text-5xl"
              animate={{ y: [0, -3, 0] }}
              transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
              style={{ left: "50%", bottom: "18%" }}
            >
              🌅
            </motion.span>
          </div>
        ) : world === "sky" ? (
          <div className="absolute inset-0 opacity-30" aria-hidden>
            {["☁️", "☁️"].map((p, i) => (
              <motion.span
                key={i}
                className="absolute text-2xl"
                animate={{ x: [0, i === 0 ? 30 : -30, 0], y: [0, -4, 0] }}
                transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
                style={{ left: i === 0 ? "50%" : "20%", bottom: "10%" }}
              >
                {p}
              </motion.span>
            ))}
            <motion.span
              className="absolute left-6 top-4 text-2xl"
              animate={{ scale: [1, 1.08, 1] }}
              transition={{ duration: 4, repeat: Infinity }}
            >
              ☀️
            </motion.span>
          </div>
        ) : null}
      </div>

      <div className="relative z-10 mt-2 flex flex-col gap-2">
        <div className="flex items-center gap-2">
          <motion.span className="text-2xl" animate={{ scale: [1, 1.06, 1] }} transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}>
            {WORLDS.find((w) => w.id === world)?.emoji}
          </motion.span>
          <span className="text-sm font-bold text-ink-deep">{WORLDS.find((w) => w.id === world)?.label}</span>
        </div>
        {worldPhoto && (
          <div className="flex items-center gap-2">
            <img src={worldPhoto} alt="world photo" className="h-10 w-10 rounded-lg object-cover" />
            <button type="button" onClick={onClear} className="text-[10px] font-bold text-[#C48B9E]">remove</button>
          </div>
        )}
        <span className="text-[11px] font-medium text-ink-soft">{worldLabel(world)}</span>
        <label className="pointer-events-auto self-start cursor-pointer rounded-full bg-white/70 px-3 py-1.5 text-[11px] font-bold text-ink-deep">
          📷 my photo
          <input ref={fileRef} type="file" accept="image/*" className="sr-only" onChange={onPhotoSelect} />
        </label>
      </div>

      {/* world-spirit puff */}
      <div className="absolute -right-4 -bottom-4 text-3xl opacity-40" aria-hidden>
        {WORLDS.find((w) => w.id === world)?.puffs}
      </div>
    </div>
  );
}

function worldLabel(world: World): string {
  switch (world) {
    case "sky": return "soft blue sky, gentle daylight";
    case "sunset": return "warm golden light, cozy evening";
    case "starry": return "quiet night sky, twinkling stars";
    case "garden": return "soft greens, petals, calm";
    case "sea": return "ripples, breeze, calm";
    case "cozy": return "warm room, soft lamp glow";
    default: return "";
  }
}
