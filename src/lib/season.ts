export type Season = "spring" | "summer" | "autumn" | "winter";

export function getSeason(month: number): Season {
  if (month >= 2 && month <= 4) return "spring"; // Mar–May
  if (month >= 5 && month <= 7) return "summer"; // Jun–Aug
  if (month >= 8 && month <= 10) return "autumn"; // Sep–Nov
  return "winter"; // Dec–Feb
}

const SEASON_EMOJI: Record<Season, string> = {
  spring: "🌸",
  summer: "✨",
  autumn: "🍂",
  winter: "❄️",
};

/** Returns the current season's emoji for use in greetings */
export function useSeasonEmoji(): string {
  return SEASON_EMOJI[getSeason(new Date().getMonth())];
}
