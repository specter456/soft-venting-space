export type MoodId =
  | "calm"
  | "sad"
  | "angry"
  | "nervous"
  | "irritated"
  | "happy"
  | "tired"
  | "overwhelmed";

export interface Mood {
  id: MoodId;
  label: string;
  emoji: string;
  /** clay bubble class from src/index.css */
  clay: string;
  /** short line shown after a check-in */
  affirmation: string;
  /** poetic blurb for the landing page */
  blurb: string;
}

export const MOODS: Mood[] = [
  {
    id: "calm",
    label: "Calm",
    emoji: "😌",
    clay: "mood-calm",
    affirmation: "Quiet and steady. Enjoy this soft moment.",
    blurb: "stillness, collected gently",
  },
  {
    id: "sad",
    label: "Sad",
    emoji: "🥺",
    clay: "mood-sad",
    affirmation: "It's okay to feel this. I'm right here with you.",
    blurb: "tears are feelings finding their way out",
  },
  {
    id: "angry",
    label: "Angry",
    emoji: "😤",
    clay: "mood-angry",
    affirmation: "Let it out. Your anger is allowed here.",
    blurb: "frustration deserves a soft place to land",
  },
  {
    id: "nervous",
    label: "Nervous",
    emoji: "😰",
    clay: "mood-nervous",
    affirmation: "Breathe with me — in, and out. You're safe.",
    blurb: "butterflies need somewhere safe to flutter",
  },
  {
    id: "irritated",
    label: "Irritated",
    emoji: "🫤",
    clay: "mood-irritated",
    affirmation: "Irritation is a signal, not a flaw. Let it soften here.",
    blurb: "little sparks that say enough for today",
  },
  {
    id: "happy",
    label: "Happy",
    emoji: "😊",
    clay: "mood-happy",
    affirmation: "Your joy is safe here — let's keep it glowing.",
    blurb: "bright moments worth remembering",
  },
  {
    id: "tired",
    label: "Tired",
    emoji: "😴",
    clay: "mood-tired",
    affirmation: "You've carried enough today. Rest, sweet one.",
    blurb: "rest is a kind of courage",
  },
  {
    id: "overwhelmed",
    label: "Overwhelmed",
    emoji: "🌪️",
    clay: "mood-overwhelmed",
    affirmation: "One breath at a time. You don't have to hold it all.",
    blurb: "one thing at a time, sweet one",
  },
];

export const moodById = (id: string | undefined | null): Mood | undefined =>
  MOODS.find((m) => m.id === id);

/** Local date key (YYYY-MM-DD) used to group one check-in per day. */
export function todayDateKey(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/** Labels for the 1–5 intensity scale. */
export const INTENSITY_LABELS: Record<number, string> = {
  1: "A whisper",
  2: "Gentle",
  3: "Somewhere in between",
  4: "Heavy",
  5: "A storm",
};
