import { Platform } from "react-native";

/**
 * Venting's pastel claymorphism design system.
 * Soft inflated surfaces, matte pastels, rounded corners, gentle depth.
 * Ported from the web theme (src/index.css) so both versions feel identical.
 */

export const palette = {
  bg: "#f5f0fc", // soft lavender-tinged cream
  surface: "#fdfbf7",
  ink: "#4a4458", // soft plum ink (never harsh black)
  inkSoft: "#8a8299",
  inkFaint: "#b7b0c4",

  lavender: "#d9c8f2",
  lavenderDeep: "#c3aee6",
  blush: "#f6cdd5",
  blushDeep: "#eeb2bf",
  sky: "#c4e0f0",
  skyDeep: "#a3cbe3",
  mint: "#c2e5d0",
  mintDeep: "#9fd4b4",
  peach: "#f7d8ae",
  peachDeep: "#f0c18a",
  cream: "#f5ecd9",
  creamDeep: "#eadfc0",

  white: "#ffffff",
  shadow: "rgba(90, 74, 120, 0.22)",
  shadowDeep: "rgba(90, 74, 120, 0.30)",
  pressShadow: "rgba(90, 74, 120, 0.10)",
} as const;

/** Per-mood clay bubble colors (same mapping as the web mood classes). */
export const MOOD_COLORS: Record<string, string> = {
  calm: palette.mint,
  sad: palette.sky,
  angry: palette.blush,
  nervous: palette.peach,
  irritated: palette.peach,
  happy: palette.cream,
  tired: palette.lavender,
  overwhelmed: palette.lavender,
};

export const MOOD_TEXT: Record<string, string> = {
  calm: "#5f8f77",
  sad: "#5b86a8",
  angry: "#b0707e",
  nervous: "#b08a52",
  irritated: "#b08a52",
  happy: "#a08a4f",
  tired: "#8d7bb0",
  overwhelmed: "#8d7bb0",
};

export const TILE_BGS: Record<string, string> = {
  "tile-lavender": "#e6dcf7",
  "tile-blush": "#f9e0e6",
  "tile-mist": "#dcebf5",
  "tile-mint": "#ddf0e4",
  "tile-peach": "#faead2",
  "tile-cream": "#f7f1e1",
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 14,
  lg: 20,
  xl: 28,
  xxl: 40,
} as const;

export const radius = {
  sm: 14,
  md: 20,
  lg: 28,
  xl: 36,
  full: 999,
} as const;

/**
 * Soft inflated clay shadow — the signature of the claymorphism look.
 * `raised: true` gives the floating feel; pressed style uses a subtle inset.
 */
export const clayShadow = (raised = true) =>
  raised
    ? {
        shadowColor: palette.shadow,
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 1,
        shadowRadius: 18,
        elevation: 10,
      }
    : {
        shadowColor: palette.pressShadow,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 1,
        shadowRadius: 4,
        elevation: 2,
      };

export const font = {
  /** Rounded, friendly. Falls back gracefully on Android. */
  display: Platform.select({
    ios: "AvenirNext-DemiBold",
    android: "sans-serif-medium",
    default: "sans-serif",
  }),
  body: Platform.select({
    ios: "Avenir Next",
    android: "sans-serif",
    default: "sans-serif",
  }),
  /** Handwritten feel for diary pages (swap in a bundled font later). */
  hand: Platform.select({
    ios: "Snell Roundhand",
    android: "sans-serif",
    default: "serif",
  }),
};
