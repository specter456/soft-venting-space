import { useEffect, useState, useCallback } from "react";

type Season = "spring" | "summer" | "autumn" | "winter";

function getSeason(month: number): Season {
  if (month >= 2 && month <= 4) return "spring";   // Mar–May
  if (month >= 5 && month <= 7) return "summer";   // Jun–Aug
  if (month >= 8 && month <= 10) return "autumn";   // Sep–Nov
  return "winter";                                    // Dec–Feb
}

const SEASON_EMOJI: Record<Season, string> = {
  spring: "🌸",
  summer: "✨",
  autumn: "🍂",
  winter: "❄️",
};

const SEASON_PARTICLES: Record<Season, string[]> = {
  spring: ["🌸", "🌺", "💮"],
  summer: ["✨", "💫", "🌟"],
  autumn: ["🍂", "🍁", "🍃"],
  winter: ["❄️", "❅", "❆"],
};

interface Particle {
  id: number;
  emoji: string;
  /** Horizontal drift in px (negative = left, positive = right) */
  drift: number;
  /** Total fall duration in seconds */
  duration: number;
  /** Start X position as vw */
  x: number;
  /** Randomised horizontal sway range */
  sway: number;
}

let nextId = 0;

function spawnParticle(season: Season): Particle {
  const emojis = SEASON_PARTICLES[season];
  return {
    id: nextId++,
    emoji: emojis[Math.floor(Math.random() * emojis.length)],
    x: Math.random() * 100,
    drift: (Math.random() - 0.5) * 120,   // ±60px total horizontal
    sway: 8 + Math.random() * 20,         // sway amplitude px
    duration: 18 + Math.random() * 14,    // 18–32s to fall
  };
}

/** Returns the current season's emoji for use in greetings */
export function useSeasonEmoji(): string {
  return SEASON_EMOJI[getSeason(new Date().getMonth())];
}

/**
 * Floating seasonal particles — decorative, pointer-events-none.
 *
 * Motion is pure CSS keyframes (no setState-driven tick), so this
 * component never triggers re-renders of parent trees.
 */
export default function SeasonalParticles() {
  const [particles, setParticles] = useState<Particle[]>(() => {
    const s = getSeason(new Date().getMonth());
    return [spawnParticle(s)];
  });
  const season = getSeason(new Date().getMonth());

  // Spawn a new particle every ~12 seconds (max 3 on screen for perf)
  useEffect(() => {
    const timer = setInterval(() => {
      setParticles((prev) => {
        const next = [...prev, spawnParticle(season)];
        return next.length > 3 ? next.slice(-3) : next;
      });
    }, 12000);
    return () => clearInterval(timer);
  }, [season]);

  // Remove particles whose CSS animation has ended
  const onEnd = useCallback((id: number) => {
    setParticles((prev) => prev.filter((p) => p.id !== id));
  }, []);

  return (
    <div
      aria-hidden
      className="pointer-events-none fixed inset-0 z-[5] overflow-hidden"
    >
      {particles.map((p) => (
        <span
          key={p.id}
          className="absolute select-none"
          style={
            {
              left: `${p.x}vw`,
              top: "-1.5em",
              fontSize: `${0.7 + (p.id % 3) * 0.15}em`,
              opacity: 0.28,
              filter: "blur(0.3px)",
              "--drift": `${p.drift}px`,
              "--sway": `${p.sway}px`,
              animation: `particle-fall ${p.duration}s linear forwards`,
            } as React.CSSProperties
          }
          onAnimationEnd={() => onEnd(p.id)}
        >
          {p.emoji}
        </span>
      ))}
    </div>
  );
}
