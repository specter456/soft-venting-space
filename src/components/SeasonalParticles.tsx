import { useEffect, useState } from "react";

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
  x: number;   // vw percent
  y: number;   // vh percent
  size: number; // em
  opacity: number;
  drift: number; // horizontal drift speed
  fall: number;  // vertical fall speed
}

let nextId = 0;

function spawnParticle(season: Season): Particle {
  const emojis = SEASON_PARTICLES[season];
  return {
    id: nextId++,
    emoji: emojis[Math.floor(Math.random() * emojis.length)],
    x: Math.random() * 100,
    y: -5,
    size: 0.6 + Math.random() * 0.8,
    opacity: 0.25 + Math.random() * 0.35,
    drift: (Math.random() - 0.5) * 0.3,
    fall: 0.15 + Math.random() * 0.2,
  };
}

/** Returns the current season's emoji for use in greetings */
export function useSeasonEmoji(): string {
  return SEASON_EMOJI[getSeason(new Date().getMonth())];
}

/** Floating seasonal particles — UI only, never blocks interaction */
export default function SeasonalParticles() {
  const [particles, setParticles] = useState<Particle[]>([]);
  const season = getSeason(new Date().getMonth());

  // Spawn a particle every ~10 seconds
  useEffect(() => {
    const timer = setInterval(() => {
      setParticles((prev) => {
        const next = [...prev, spawnParticle(season)];
        // Keep max 3 particles on screen
        if (next.length > 3) next.shift();
        return next;
      });
    }, 10000);

    // Spawn one immediately
    setParticles([spawnParticle(season)]);

    return () => clearInterval(timer);
  }, [season]);

  // Move particles
  useEffect(() => {
    const timer = setInterval(() => {
      setParticles((prev) =>
        prev
          .map((p) => ({
            ...p,
            y: p.y + p.fall,
            x: p.x + p.drift,
          }))
          .filter((p) => p.y < 110),
      );
    }, 80);
    return () => clearInterval(timer);
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
          style={{
            left: `${p.x}vw`,
            top: `${p.y}vh`,
            fontSize: `${p.size}em`,
            opacity: p.opacity,
            transition: "none",
            filter: "blur(0.3px)",
          }}
        >
          {p.emoji}
        </span>
      ))}
    </div>
  );
}
