/**
 * My Little Plant — streak-based daily companion.
 * One care day per real calendar day; milestones at 7/14/28/100.
 * All state is local-only (localStorage). No death, no withering, no guilt.
 */

import { safeGetItem, safeRemoveItem, safeSetItem } from "./safe-storage";

const PLANT_KEY = "venting-streak-plant";
const SHELF_KEY = "venting-plant-shelf";

export type SeedColor = "wisteria" | "rose" | "sun-gold" | "mint";

export interface SeedPalette {
  id: SeedColor;
  name: string;
  petal: string;
  petalDeep: string;
  center: string;
  glow: string;
  accent: string;
}

export const SEED_PALETTES: Record<SeedColor, SeedPalette> = {
  wisteria: { id: "wisteria", name: "Wisteria", petal: "#AAB6E3", petalDeep: "#6F7BC0", center: "#F7D060", glow: "rgba(140,154,214,0.55)", accent: "#6F7BC0" },
  rose: { id: "rose", name: "Rose", petal: "#F3B8C9", petalDeep: "#D96A93", center: "#F7D060", glow: "rgba(217,106,147,0.5)", accent: "#D96A93" },
  "sun-gold": { id: "sun-gold", name: "Sun-Gold", petal: "#F7D060", petalDeep: "#E0A422", center: "#C98A3E", glow: "rgba(240,180,41,0.5)", accent: "#E0A422" },
  mint: { id: "mint", name: "Mint", petal: "#8FD9C4", petalDeep: "#3E9B85", center: "#F7D060", glow: "rgba(77,175,154,0.5)", accent: "#3E9B85" },
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
  streakAtBloom: number;
}

export interface PlantState {
  seed: SeedColor;
  plantedOn: string; // YYYY-MM-DD
  careDays: number; // total unique days watered
  lastWateredOn: string; // "" = never
  milestonesHit: number[]; // e.g. [7, 14]
  bloomedOn?: string;
  /** Dev-only day offset for testing. */
  dayOffset: number;
  /** Which days of the current month were watered (1..31). */
  wateredMonthDays: number[];
  /** "YYYY-MM" the wateredMonthDays belong to — reset when the month rolls over. */
  wateredMonth: string;
}

export interface PlantStage {
  label: string;
  minDays: number;
  maxDays: number;
}

export const STAGES: PlantStage[] = [
  { label: "A Tiny Seed", minDays: 0, maxDays: 2 },
  { label: "A Little Sprout", minDays: 3, maxDays: 6 },
  { label: "A Budding Friend", minDays: 7, maxDays: 13 },
  { label: "A Blooming Companion", minDays: 14, maxDays: 27 },
  { label: "A Glowing Bouquet", minDays: 28, maxDays: Infinity },
];

export function stageForDays(days: number): PlantStage {
  for (const s of STAGES) {
    if (days >= s.minDays && days <= s.maxDays) return s;
  }
  return STAGES[STAGES.length - 1];
}

export const MILESTONES = [7, 14, 28, 100];

export function nextMilestone(days: number): number | null {
  for (const m of MILESTONES) {
    if (days < m) return m;
  }
  return null;
}

export function daysUntilNextMilestone(days: number): number {
  const m = nextMilestone(days);
  if (m === null) return 0;
  return m - days;
}

export function plantDateKey(offset = 0): string {
  const d = new Date();
  d.setDate(d.getDate() + offset);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function currentMonthDaysWatered(s: PlantState): number[] {
  return [...s.wateredMonthDays].sort((a, b) => a - b);
}

export function loadPlantState(): PlantState | null {
  try {
    const raw = safeGetItem(PLANT_KEY);
    if (!raw) return null;
    const s = JSON.parse(raw) as PlantState;
    if (!s || typeof s.careDays !== "number" || !s.seed) return null;
    return {
      ...s,
      lastWateredOn: s.lastWateredOn ?? "",
      dayOffset: typeof s.dayOffset === "number" ? s.dayOffset : 0,
      wateredMonthDays: Array.isArray(s.wateredMonthDays) ? s.wateredMonthDays : [],
      wateredMonth: typeof s.wateredMonth === "string" ? s.wateredMonth : "",
      milestonesHit: Array.isArray(s.milestonesHit) ? s.milestonesHit : [],
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

export function canWaterToday(s: PlantState): boolean {
  return s.lastWateredOn !== plantDateKey(s.dayOffset);
}

/** One watering per day: +1 careDay, set lastWateredOn, check milestones. */
export function waterPlant(s: PlantState): { state: PlantState; grew: boolean; milestone?: number } {
  const today = plantDateKey(s.dayOffset);
  if (s.lastWateredOn === today) {
    // extra sip: nothing changes
    return { state: s, grew: false };
  }
  const newCareDays = s.careDays + 1;
  // If the month rolled over since the last watering, start a fresh dot row.
  const thisMonth = today.slice(0, 7);
  const baseMonthDays = s.wateredMonth === thisMonth ? s.wateredMonthDays : [];
  const dayNum = parseInt(today.slice(8, 10), 10);
  const newWateredDays = Array.from(new Set([...baseMonthDays, dayNum])).sort((a, b) => a - b);

  // milestone check
  let milestoneHit: number | undefined;
  const newlyHit = MILESTONES.filter((m) => !s.milestonesHit.includes(m) && newCareDays >= m);
  if (newlyHit.length > 0) milestoneHit = newlyHit[0];

  const updated: PlantState = {
    ...s,
    careDays: newCareDays,
    lastWateredOn: today,
    wateredMonth: thisMonth,
    wateredMonthDays: newWateredDays,
    milestonesHit: [...s.milestonesHit, ...(milestoneHit ? [milestoneHit] : [])],
    bloomedOn: milestoneHit === 100 ? today : s.bloomedOn,
  };
  return { state: updated, grew: true, milestone: milestoneHit ?? undefined };
}

/** Move the bloomed bouquet to the shelf; reset for a new seed. */
export function retireBloom(s: PlantState): ShelfFlower | null {
  const flower: ShelfFlower = {
    color: s.seed,
    bloomedOn: s.bloomedOn ?? plantDateKey(s.dayOffset),
    streakAtBloom: s.careDays,
  };
  saveShelf([...loadShelf(), flower]);
  savePlantState(null);
  return flower;
}

/** Status line for the Home card. */
export function plantStatusLine(s: PlantState | null): string {
  if (!s) return "plant a seed to begin 🌱";
  const today = plantDateKey(s.dayOffset);
  if (s.lastWateredOn === today) {
    return `${s.careDays} day${s.careDays === 1 ? "" : "s"} · happily watered 🌿`;
  }
  return `${s.careDays} day${s.careDays === 1 ? "" : "s"} · needs water 💧`;
}
