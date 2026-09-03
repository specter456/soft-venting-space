import { createContext, useContext, useState, useEffect, type ReactNode } from "react";
import { safeGetItem, safeSetItem } from "@/lib/safe-storage";

export type ThemeId = "old-lace" | "midnight" | "spring-mint" | "peach-morning";

export interface ThemeDef {
  id: ThemeId;
  label: string;
  swatch: string; // CSS gradient for the swatch preview
  vars: Record<string, string>;
}

const STORAGE_KEY = "venting-theme";

export const THEMES: ThemeDef[] = [
  {
    id: "old-lace",
    label: "Old Lace",
    swatch: "linear-gradient(135deg, #FDF5E6, #EDEBF6, #D9DEF4)",
    vars: {
      "--theme-bg-start": "#FDF5E6",
      "--theme-bg-mid": "#EDEBF6",
      "--theme-bg-end": "#D9DEF4",
      "--theme-card": "rgba(253,245,230,0.7)",
      "--theme-card-border": "rgba(253,245,230,0.6)",
      "--theme-text": "#3A4170",
      "--theme-text-soft": "#7A7FA8",
      "--theme-accent": "#8C9AD6",
      "--theme-accent-deep": "#5F6DBE",
      "--theme-accent-light": "#C4CBE8",
      "--theme-blob-1": "rgba(170,182,227,0.3)",
      "--theme-blob-2": "rgba(243,231,201,0.3)",
      "--theme-blob-3": "rgba(196,203,232,0.3)",
      "--theme-header-bg": "rgba(237,235,246,0.8)",
      "--theme-tile-recording": "#7C8BD0",
      "--theme-tile-notes": "#A88BC4",
      "--theme-tile-scribble": "#9AA5D6",
      "--theme-tile-photo": "#8FA8C9",
      "--theme-tile-stickers": "#B79BD9",
      "--theme-tile-gif": "#7F9BD9",
      "--theme-tile-diary": "#6F7BC0",
      "--theme-tile-vault": "#C9A96A",
      "--theme-btn-primary": "#5F6DBE",
      "--theme-btn-secondary": "#C9A96A",
    },
  },
  {
    id: "midnight",
    label: "Midnight Wisteria",
    swatch: "linear-gradient(135deg, #221E3A, #3A3565, #2A2550)",
    vars: {
      "--theme-bg-start": "#221E3A",
      "--theme-bg-mid": "#2D2952",
      "--theme-bg-end": "#3A3565",
      "--theme-card": "rgba(58,53,101,0.65)",
      "--theme-card-border": "rgba(90,82,160,0.4)",
      "--theme-text": "#EDEAFF",
      "--theme-text-soft": "#B0ADDA",
      "--theme-accent": "#A9B4E8",
      "--theme-accent-deep": "#7B8AD0",
      "--theme-accent-light": "rgba(169,180,232,0.25)",
      "--theme-blob-1": "rgba(120,100,200,0.2)",
      "--theme-blob-2": "rgba(169,180,232,0.12)",
      "--theme-blob-3": "rgba(90,82,160,0.15)",
      "--theme-header-bg": "rgba(34,30,58,0.85)",
      "--theme-tile-recording": "#7B8AD0",
      "--theme-tile-notes": "#A990D8",
      "--theme-tile-scribble": "#8B95D6",
      "--theme-tile-photo": "#7FAAC9",
      "--theme-tile-stickers": "#B79BD9",
      "--theme-tile-gif": "#7F9BD9",
      "--theme-tile-diary": "#6F7BC0",
      "--theme-tile-vault": "#D4B87A",
      "--theme-btn-primary": "#7B8AD0",
      "--theme-btn-secondary": "#D4B87A",
    },
  },
  {
    id: "spring-mint",
    label: "Spring Mint",
    swatch: "linear-gradient(135deg, #E8F5F0, #F0F7F4, #D4EDE4)",
    vars: {
      "--theme-bg-start": "#E8F5F0",
      "--theme-bg-mid": "#F0F7F4",
      "--theme-bg-end": "#D4EDE4",
      "--theme-card": "rgba(232,245,240,0.7)",
      "--theme-card-border": "rgba(180,220,205,0.6)",
      "--theme-text": "#2A4A3E",
      "--theme-text-soft": "#5C8A7A",
      "--theme-accent": "#4DAF9A",
      "--theme-accent-deep": "#3A8A7A",
      "--theme-accent-light": "rgba(77,175,154,0.2)",
      "--theme-blob-1": "rgba(77,175,154,0.2)",
      "--theme-blob-2": "rgba(180,220,205,0.3)",
      "--theme-blob-3": "rgba(77,175,154,0.12)",
      "--theme-header-bg": "rgba(232,245,240,0.85)",
      "--theme-tile-recording": "#4DAF9A",
      "--theme-tile-notes": "#6BBFA8",
      "--theme-tile-scribble": "#5BB89F",
      "--theme-tile-photo": "#7CC8B5",
      "--theme-tile-stickers": "#8DD4C0",
      "--theme-tile-gif": "#4DAF9A",
      "--theme-tile-diary": "#3A8A7A",
      "--theme-tile-vault": "#A0C8B0",
      "--theme-btn-primary": "#4DAF9A",
      "--theme-btn-secondary": "#8BB8A8",
    },
  },
  {
    id: "peach-morning",
    label: "Peach Morning",
    swatch: "linear-gradient(135deg, #FFF0E6, #FDF5E6, #FFE8D8)",
    vars: {
      "--theme-bg-start": "#FFF0E6",
      "--theme-bg-mid": "#FDF5E6",
      "--theme-bg-end": "#FFE8D8",
      "--theme-card": "rgba(255,240,230,0.7)",
      "--theme-card-border": "rgba(240,210,185,0.6)",
      "--theme-text": "#5A3A2A",
      "--theme-text-soft": "#8A7060",
      "--theme-accent": "#E8865C",
      "--theme-accent-deep": "#D07048",
      "--theme-accent-light": "rgba(232,134,92,0.2)",
      "--theme-blob-1": "rgba(232,134,92,0.2)",
      "--theme-blob-2": "rgba(240,210,185,0.3)",
      "--theme-blob-3": "rgba(232,134,92,0.12)",
      "--theme-header-bg": "rgba(255,240,230,0.85)",
      "--theme-tile-recording": "#E8865C",
      "--theme-tile-notes": "#D09878",
      "--theme-tile-scribble": "#C8A890",
      "--theme-tile-photo": "#D4A888",
      "--theme-tile-stickers": "#E0B8A0",
      "--theme-tile-gif": "#E8865C",
      "--theme-tile-diary": "#D07048",
      "--theme-tile-vault": "#C8A070",
      "--theme-btn-primary": "#E8865C",
      "--theme-btn-secondary": "#C8A070",
    },
  },
];

function getSavedTheme(): ThemeId {
  try {
    const saved = safeGetItem(STORAGE_KEY);
    if (saved && THEMES.some((t) => t.id === saved)) return saved as ThemeId;
  } catch {
    /* ignore */
  }
  return "old-lace";
}

interface ThemeCtx {
  themeId: ThemeId;
  setTheme: (id: ThemeId) => void;
}

const ThemeContext = createContext<ThemeCtx>({
  themeId: "old-lace",
  setTheme: () => {},
});

export function useTheme() {
  return useContext(ThemeContext);
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [themeId, setThemeId] = useState<ThemeId>(getSavedTheme);

  useEffect(() => {
    const theme = THEMES.find((t) => t.id === themeId);
    if (!theme) return;
    const root = document.documentElement;
    Object.entries(theme.vars).forEach(([k, v]) => root.style.setProperty(k, v));
    safeSetItem(STORAGE_KEY, themeId);
  }, [themeId]);

  return (
    <ThemeContext.Provider value={{ themeId, setTheme: setThemeId }}>
      {children}
    </ThemeContext.Provider>
  );
}
