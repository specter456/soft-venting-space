import { useState, useEffect, type ReactNode } from "react";
import { scopedGetItem, scopedSetItem } from "@/lib/safe-storage";
import { THEMES, ThemeContext, type ThemeId } from "@/lib/theme";

const STORAGE_KEY = "venting-theme";

function getSavedTheme(): ThemeId {
  try {
    const saved = scopedGetItem(STORAGE_KEY);
    if (saved && THEMES.some((t) => t.id === saved)) return saved as ThemeId;
  } catch {
    /* ignore */
  }
  return "old-lace";
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [themeId, setThemeId] = useState<ThemeId>(getSavedTheme);

  useEffect(() => {
    const theme = THEMES.find((t) => t.id === themeId);
    if (!theme) return;
    const root = document.documentElement;
    Object.entries(theme.vars).forEach(([k, v]) => root.style.setProperty(k, v));
    scopedSetItem(STORAGE_KEY, themeId);
  }, [themeId]);

  return (
    <ThemeContext.Provider value={{ themeId, setTheme: setThemeId }}>
      {children}
    </ThemeContext.Provider>
  );
}
