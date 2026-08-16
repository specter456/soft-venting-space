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

/** Pastel clay backgrounds used across vault tiles and art. */
export const TILE_BGS = ["tile-lavender", "tile-blush", "tile-mist", "tile-mint", "tile-peach"] as const;

/** Cute illustrated avatars for video vents (never a real face). */
export const VIDEO_AVATARS = ["🐻", "🐰", "🐱", "🦊", "🐼", "🐨", "🐸", "🦉", "🐷", "🐥"];

/** Comfy companion shown on the record screen. */
export const VOICE_COMPANION = "🐻";

/** Sticker studio palette (base colors). */
export const STICKER_COLORS = [
  { id: "lav", hex: "#d9c8f2", name: "lavender" },
  { id: "blush", hex: "#f6cdd5", name: "blush" },
  { id: "sky", hex: "#c4e0f0", name: "sky" },
  { id: "mint", hex: "#c2e5d0", name: "mint" },
  { id: "peach", hex: "#f7d8ae", name: "peach" },
  { id: "cream", hex: "#f5ecd9", name: "cream" },
];

/** Sticker face parts. Eyes/mouths are rendered as soft shapes, not emoji. */
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
  "🩹",
  "💗",
  "⭐",
  "☁️",
  "👑",
  "🧸",
  "🦋",
  "🧣",
  "🌼",
  "🎀",
  "🍪",
  "🌈",
];

export const STICKER_EXPRESSIONS = [
  {
    id: "happy",
    label: "happy",
    eyes: "closed",
    mouth: "open",
    blush: true,
  },
  {
    id: "giggly",
    label: "giggly",
    eyes: "closed",
    mouth: "wobble",
    blush: true,
  },
  {
    id: "tired",
    label: "tired",
    eyes: "sleepy",
    mouth: "smile",
    blush: false,
  },
  {
    id: "oops",
    label: "oops",
    eyes: "wide",
    mouth: "cat",
    blush: true,
  },
  {
    id: "hmm",
    label: "hmm",
    eyes: "squint",
    mouth: "frown",
    blush: false,
  },
  {
    id: "sobbing",
    label: "sobbing",
    eyes: "squint",
    mouth: "frown",
    blush: false,
    tear: true,
  },
];

export const GIFT_STAMPS = [
  "💗",
  "⭐",
  "💧",
  "☁️",
  "🔥",
  "🦋",
  "🌈",
  "🎀",
  "🍀",
  "🫧",
  "🌙",
  "🎈",
];

export const DIARY_WEATHER = ["☀️", "🌤️", "☁️", "🌧️", "⛈️", "🌨️", "🌈", "🌙", "✨"];

export const DIARY_STICKERS = [
  "💗",
  "⭐",
  "🌸",
  "🦋",
  "🍀",
  "🫧",
  "🎀",
  "🧸",
  "☁️",
  "🌈",
  "🌙",
  "🍓",
  "🐻",
  "🩹",
];

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
