/**
 * My Little Plant — a daily, guilt-free growing companion.
 * Stage 0 seed → 5 full bloom; one watering per real day advances one stage.
 * Missed days change nothing. All state is local-only (localStorage).
 */

import { safeGetItem, safeRemoveItem, safeSetItem } from "./safe-storage";

const PLANT_KEY = "venting-my-little-plant";
const SHELF_KEY = "venting-plant-shelf";

export type SeedColor = "wisteria" | "rose" | "sun-gold" | "mint";

export interface SeedPalette {
  id: SeedColor;
  name: string;
  petal: string;
  petalDeep: string;
  center: string;
  glow: string;
}

export const SEED_PALETTES: Record<SeedColor, SeedPalette> = {
  wisteria: { id: "wisteria", name: "Wisteria", petal: "#AAB6E3", petalDeep: "#6F7BC0", center: "#F7D060", glow: "rgba(140,154,214,0.55)" },
  rose: { id: "rose", name: "Rose", petal: "#F3B8C9", petalDeep: "#D96A93", center: "#F7D060", glow: "rgba(217,106,147,0.5)" },
  "sun-gold": { id: "sun-gold", name: "Sun-Gold", petal: "#F7D060", petalDeep: "#E0A422", center: "#C98A3E", glow: "rgba(240,180,41,0.5)" },
  mint: { id: "mint", name: "Mint", petal: "#8FD9C4", petalDeep: "#3E9B85", center: "#F7D060", glow: "rgba(77,175,154,0.5)" },
};

export const SEED_CHOICES: SeedPalette[] = [
  SEED_PALETTES.wisteria,
  SEED_PALETTES.rose,
  SEED_PALETTES["sun-gold"],
  SEED_PALETTES.mint,
];

export interface ShelfFlower {
  color: SeedColor;
  bloomedOn: string; // YYYY-MM-DD
}

export interface PlantState {
  stage: number; // 0 seed … 5 full bloom
  seed: SeedColor;
  plantedOn: string; // YYYY-MM-DD
  lastWateredOn: string; // "" = never watered
  bloomedOn?: string;
  /** Dev-only day offset for testing daily growth. */
  dayOffset: number;
}

/* ─── dates ─────────────────────────────────────────────────────── */

export function plantDateKey(offset = 0): string {
  const d = new Date();
  d.setDate(d.getDate() + offset);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function daysBetween(fromKey: string, toKey: string): number {
  try {
    const a = new Date(fromKey + "T00:00:00").getTime();
    const b = new Date(toKey + "T00:00:00").getTime();
    if (!Number.isFinite(a) || !Number.isFinite(b)) return 0;
    return Math.round((b - a) / 86_400_000);
  } catch {
    return 0;
  }
}

/* ─── current plant ─────────────────────────────────────────────── */

export function loadPlantState(): PlantState | null {
  try {
    const raw = safeGetItem(PLANT_KEY);
    if (!raw) return null;
    const s = JSON.parse(raw) as PlantState;
    if (!s || typeof s.stage !== "number" || !s.seed) return null;
    return {
      ...s,
      lastWateredOn: s.lastWateredOn ?? "",
      dayOffset: typeof s.dayOffset === "number" ? s.dayOffset : 0,
    };
  } catch {
    return null;
  }
}

export function savePlantState(s: PlantState | null): void {
  try {
    if (s) safeSetItem(PLANT_KEY, JSON.stringify(s));
    else safeRemoveItem(PLANT_KEY);
  } catch { /* ignore */ }
}

/* ─── shelf of past blooms ──────────────────────────────────────── */

export function loadShelf(): ShelfFlower[] {
  try {
    const raw = safeGetItem(SHELF_KEY);
    if (raw) {
      const arr = JSON.parse(raw) as ShelfFlower[];
      return Array.isArray(arr) ? arr : [];
    }
  } catch { /* ignore */ }
  return [];
}

export function saveShelf(flowers: ShelfFlower[]): void {
  try { safeSetItem(SHELF_KEY, JSON.stringify(flowers)); } catch { /* ignore */ }
}

/* ─── growth rules ──────────────────────────────────────────────── */

export function canWaterToday(s: PlantState): boolean {
  return s.lastWateredOn !== plantDateKey(s.dayOffset);
}

/** One watering per day advances exactly one stage. Extra sips change nothing. */
export function waterPlant(s: PlantState): { state: PlantState; grew: boolean } {
  const today = plantDateKey(s.dayOffset);
  if (s.lastWateredOn === today || s.stage >= 5) return { state: s, grew: false };
  const stage = Math.min(5, s.stage + 1);
  return {
    state: { ...s, stage, lastWateredOn: today, bloomedOn: stage === 5 ? today : s.bloomedOn },
    grew: true,
  };
}

/** Move a fully bloomed flower to the shelf; the pot is ready for a new seed. */
export function retireBloom(s: PlantState): ShelfFlower | null {
  if (s.stage < 5) return null;
  const flower: ShelfFlower = { color: s.seed, bloomedOn: s.bloomedOn ?? plantDateKey(s.dayOffset) };
  saveShelf([...loadShelf(), flower]);
  savePlantState(null);
  return flower;
}

/** Status line for the Home card. */
export function plantStatusLine(s: PlantState | null): string {
  if (!s) return "plant a seed to begin 🌱";
  const today = plantDateKey(s.dayOffset);
  if (s.stage >= 5) return "glowing! ✨";
  const day = daysBetween(s.plantedOn, today) + 1;
  return s.lastWateredOn === today
    ? `day ${day} · happily watered 🌿`
    : `day ${day} · needs water 💧`;
}
