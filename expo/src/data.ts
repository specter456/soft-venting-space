/** Cute content definitions — ported from the web app (src/lib). */

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
  affirmation: string;
}

export const MOODS: Mood[] = [
  { id: "calm", label: "Calm", emoji: "😌", affirmation: "Quiet and steady. Enjoy this soft moment." },
  { id: "sad", label: "Sad", emoji: "🥺", affirmation: "It's okay to feel this. I'm right here with you." },
  { id: "angry", label: "Angry", emoji: "😤", affirmation: "Let it out. Your anger is allowed here." },
  { id: "nervous", label: "Nervous", emoji: "😰", affirmation: "Breathe with me — in, and out. You're safe." },
  { id: "irritated", label: "Irritated", emoji: "🫤", affirmation: "Irritation is a signal, not a flaw. Let it soften here." },
  { id: "happy", label: "Happy", emoji: "😊", affirmation: "Your joy is safe here — let's keep it glowing." },
  { id: "tired", label: "Tired", emoji: "😴", affirmation: "You've carried enough today. Rest, sweet one." },
  { id: "overwhelmed", label: "Overwhelmed", emoji: "🌪️", affirmation: "One breath at a time. You don't have to hold it all." },
];

export const moodById = (id?: string | null): Mood | undefined =>
  MOODS.find((m) => m.id === id);

export function todayDateKey(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export const INTENSITY_LABELS: Record<number, string> = {
  1: "A whisper",
  2: "Gentle",
  3: "Somewhere in between",
  4: "Heavy",
  5: "A storm",
};

/** Cute placeholder "photos" — pastel scenes with a big emoji. */
export const PHOTO_SCENES = [
  { emoji: "🌅", bg: "tile-peach", label: "warm sunset" },
  { emoji: "🌧️", bg: "tile-mist", label: "rainy window" },
  { emoji: "☁️", bg: "tile-lavender", label: "cloudy sky" },
  { emoji: "🌸", bg: "tile-blush", label: "blooming branch" },
  { emoji: "🍂", bg: "tile-peach", label: "autumn leaves" },
  { emoji: "🌙", bg: "tile-lavender", label: "quiet night" },
  { emoji: "🫧", bg: "tile-mint", label: "soap bubbles" },
  { emoji: "🐈", bg: "tile-mint", label: "a small cat" },
  { emoji: "🍰", bg: "tile-blush", label: "soft cake" },
  { emoji: "🪷", bg: "tile-mist", label: "calm pond" },
  { emoji: "🦋", bg: "tile-lavender", label: "a butterfly" },
  { emoji: "🌿", bg: "tile-mint", label: "green corner" },
];

export const VIDEO_AVATARS = ["🐻", "🐰", "🐱", "🦊", "🐼", "🐨", "🐸", "🦉", "🐷", "🐥"];
export const VOICE_COMPANION = "🐻";

export const STICKER_COLORS = [
  { id: "lav", hex: "#d9c8f2", name: "lavender" },
  { id: "blush", hex: "#f6cdd5", name: "blush" },
  { id: "sky", hex: "#c4e0f0", name: "sky" },
  { id: "mint", hex: "#c2e5d0", name: "mint" },
  { id: "peach", hex: "#f7d8ae", name: "peach" },
  { id: "cream", hex: "#f5ecd9", name: "cream" },
];

export const STICKER_EYES = [
  { id: "dots", label: "soft dots", render: "• •" },
  { id: "closed", label: "happy closed", render: "︶ ︶" },
  { id: "wide", label: "wide", render: "◉ ◉" },
  { id: "squint", label: "squint", render: "> <" },
  { id: "sleepy", label: "sleepy", render: "˘ ˘" },
  { id: "sparkle", label: "sparkly", render: "✧ ✧" },
];

export const STICKER_MOUTHS = [
  { id: "smile", label: "smile", render: "◡" },
  { id: "open", label: "happy", render: "○" },
  { id: "wobble", label: "wobble", render: "ω" },
  { id: "frown", label: "frown", render: "﹏" },
  { id: "cat", label: "cat", render: "ᵕ" },
  { id: "tongue", label: "silly", render: "ω·" },
];

export const STICKER_ACCESSORIES = [
  "🩹", "💗", "⭐", "☁️", "👑", "🧸", "🦋", "🧣", "🌼", "🎀", "🍪", "🌈",
];

export const STICKER_EXPRESSIONS = [
  { id: "happy", label: "happy", eyes: "closed", mouth: "open", blush: true, tear: false },
  { id: "giggly", label: "giggly", eyes: "closed", mouth: "wobble", blush: true, tear: false },
  { id: "tired", label: "tired", eyes: "sleepy", mouth: "smile", blush: false, tear: false },
  { id: "oops", label: "oops", eyes: "wide", mouth: "cat", blush: true, tear: false },
  { id: "hmm", label: "hmm", eyes: "squint", mouth: "frown", blush: false, tear: false },
  { id: "sobbing", label: "sobbing", eyes: "squint", mouth: "frown", blush: false, tear: true },
];

export const GIFT_STAMPS = ["💗", "⭐", "💧", "☁️", "🔥", "🦋", "🌈", "🎀", "🍀", "🫧", "🌙", "🎈"];

export const DIARY_WEATHER = ["☀️", "🌤️", "☁️", "🌧️", "⛈️", "🌨️", "🌈", "🌙", "✨"];

export const DIARY_STICKERS = [
  "💗", "⭐", "🌸", "🦋", "🍀", "🫧", "🎀", "🧸", "☁️", "🌈", "🌙", "🍓", "🐻", "🩹",
];

export const DIARY_COVER_COLORS = ["#d9c8f2", "#f6cdd5", "#c4e0f0", "#c2e5d0", "#f7d8ae", "#f5ecd9"];
export const DIARY_EMBLEMS = ["🌸", "🦋", "🌙", "⭐", "🍀", "🐻", "🌷", "✨"];

export const WORRY_BUBBLES = [
  "that thing I said",
  "the email",
  "tomorrow",
  "the noise",
  "their tone",
  "the list",
  "the past",
  "the unknown",
  "my words",
  "the plan",
  "the silence",
  "the mirror",
];

export const CHECKIN_OPTIONS = [
  "I felt calm",
  "I felt happy",
  "I felt tired",
  "I felt stressed",
  "I felt irritated",
  "I felt sad",
  "I felt lonely",
  "I felt overwhelmed",
  "I need to vent",
  "I need comfort",
  "I need quiet time",
  "I want to express myself",
  "I want to relax",
  "I want to write or draw",
];

/** Big soft greeting emoji, time aware. */
export function greetingEmoji(): string {
  const h = new Date().getHours();
  if (h < 5) return "🌙";
  if (h < 12) return "🌤️";
  if (h < 18) return "☀️";
  return "🌇";
}

export function greetingText(): string {
  const h = new Date().getHours();
  if (h < 5) return "Still awake, sweet one?";
  if (h < 12) return "Good morning";
  if (h < 18) return "Good afternoon";
  return "Good evening";
}
