import React from "react";
import { getKvFromCache, setKv } from "./db";
import { palette } from "./theme";

/** Pastel accent options (Appearance settings). */
export const ACCENTS = [
  { id: "lavender", label: "Lavender", hex: palette.lavender, deep: palette.lavenderDeep },
  { id: "blush", label: "Blush", hex: palette.blush, deep: palette.blushDeep },
  { id: "mint", label: "Mint", hex: palette.mint, deep: palette.mintDeep },
  { id: "sky", label: "Sky", hex: palette.sky, deep: palette.skyDeep },
  { id: "peach", label: "Peach", hex: palette.peach, deep: palette.peachDeep },
  { id: "cream", label: "Cream", hex: palette.cream, deep: palette.creamDeep },
] as const;

export type AccentId = (typeof ACCENTS)[number]["id"];

export interface ThemeColors {
  mode: "light" | "night";
  bg: string;
  surface: string;
  ink: string;
  inkSoft: string;
  inkFaint: string;
  card: string;
  accent: string;
  accentDeep: string;
}

const LIGHT: Omit<ThemeColors, "mode" | "accent" | "accentDeep"> = {
  bg: palette.bg,
  surface: palette.surface,
  ink: palette.ink,
  inkSoft: palette.inkSoft,
  inkFaint: palette.inkFaint,
  card: "#fdfbf7",
};

const NIGHT: Omit<ThemeColors, "mode" | "accent" | "accentDeep"> = {
  bg: "#211c30",
  surface: "#332b48",
  ink: "#efe9f7",
  inkSoft: "#a99fc4",
  inkFaint: "#756d92",
  card: "#3a3350",
};

interface ThemeState {
  colors: ThemeColors;
  mode: "light" | "night";
  accent: AccentId;
  sounds: boolean;
  toggleNight: () => void;
  setAccent: (id: AccentId) => void;
  setSounds: (on: boolean) => void;
}

const ThemeContext = React.createContext<ThemeState>({
  colors: { ...LIGHT, mode: "light", accent: "#d9c8f2", accentDeep: "#c3aee6" },
  mode: "light",
  accent: "lavender",
  sounds: true,
  toggleNight: () => undefined,
  setAccent: () => undefined,
  setSounds: () => undefined,
});

const KV_MODE = "appearanceMode";
const KV_ACCENT = "appearanceAccent";
const KV_SOUNDS = "soundsEnabled";

function load(): { mode: "light" | "night"; accent: AccentId; sounds: boolean } {
  const mode = getKvFromCache(KV_MODE) === "night" ? "night" : "light";
  const accentRaw = getKvFromCache(KV_ACCENT) as AccentId | undefined;
  const accent = ACCENTS.some((a) => a.id === accentRaw) ? (accentRaw as AccentId) : "lavender";
  const sounds = getKvFromCache(KV_SOUNDS) !== "false";
  return { mode, accent, sounds };
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [prefs, setPrefs] = React.useState(load);

  const buildColors = React.useCallback((): ThemeColors => {
    const base = prefs.mode === "night" ? NIGHT : LIGHT;
    const accent = ACCENTS.find((a) => a.id === prefs.accent) ?? ACCENTS[0];
    return { ...base, mode: prefs.mode, accent: accent.hex, accentDeep: accent.deep };
  }, [prefs]);

  const colors = React.useMemo(buildColors, [buildColors]);

  const state: ThemeState = React.useMemo(
    () => ({
      colors,
      mode: prefs.mode,
      accent: prefs.accent,
      sounds: prefs.sounds,
      toggleNight: () => {
        setPrefs((p) => {
          const next = p.mode === "night" ? "light" : "night";
          void setKv(KV_MODE, next);
          return { ...p, mode: next };
        });
      },
      setAccent: (id: AccentId) => {
        setPrefs((p) => {
          void setKv(KV_ACCENT, id);
          return { ...p, accent: id };
        });
      },
      setSounds: (on: boolean) => {
        setPrefs((p) => {
          void setKv(KV_SOUNDS, on ? "true" : "false");
          return { ...p, sounds: on };
        });
      },
    }),
    [colors, prefs],
  );

  return <ThemeContext.Provider value={state}>{children}</ThemeContext.Provider>;
}

export function useThemeColors(): ThemeColors {
  return React.useContext(ThemeContext).colors;
}

export function useTheme(): ThemeState {
  return React.useContext(ThemeContext);
}

export const soundEffectsEnabled = (): boolean => getKvFromCache(KV_SOUNDS) !== "false";
