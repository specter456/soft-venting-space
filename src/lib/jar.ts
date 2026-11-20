/**
 * Gratitude jar — data layer.
 *
 * Slips are space content, so they live under the scoped key
 * `venting:<spaceId>:gratitude-jar` — a brand-new space always starts with
 * an empty jar.
 */

import { scopedGetItem, scopedSetItem } from "./safe-storage";
import { quarantineKey } from "@/lib/error-journal";

const JAR_KEY = "venting-gratitude-jar";

/** Slip count at which the jar reads as ~100% full. */
export const JAR_FULL_AT = 30;

export interface JarNote {
  id: string;
  text: string;
  date: string;
}

export function loadJar(): JarNote[] {
  try {
    const raw = scopedGetItem(JAR_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as JarNote[];
    return Array.isArray(parsed)
      ? parsed.filter((n) => n && typeof n.text === "string")
      : [];
  } catch {
    quarantineKey(JAR_KEY);
    return [];
  }
}

export function saveJar(notes: JarNote[]): void {
  scopedSetItem(JAR_KEY, JSON.stringify(notes));
}

export function slipDate(now: Date = new Date()): string {
  return now.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

/** Append one trimmed slip (blank input adds nothing). Newest goes last. */
export function tuckNote(
  notes: JarNote[],
  rawText: string,
  now: Date = new Date(),
): JarNote[] {
  const text = rawText.trim().slice(0, 200);
  if (!text) return notes;
  const note: JarNote = { id: `g-${now.getTime()}`, text, date: slipDate(now) };
  return [...notes, note];
}

/**
 * ONE random slip. When there is more than one, never the same slip twice in
 * a row (that is what "another slip" promises).
 */
export function randomSlip(
  notes: JarNote[],
  avoidId: string | null = null,
): JarNote | null {
  if (notes.length === 0) return null;
  if (notes.length === 1) return notes[0];
  const pool = avoidId ? notes.filter((n) => n.id !== avoidId) : notes;
  const from = pool.length > 0 ? pool : notes;
  return from[Math.floor(Math.random() * from.length)];
}

/** Jar fill level, 0–100. */
export function jarFillPct(count: number): number {
  return Math.min(100, (count / JAR_FULL_AT) * 100);
}

/** Newest first — the "see all papers" order. */
export function newestFirst(notes: JarNote[]): JarNote[] {
  return [...notes].reverse();
}

export const JAR_EMPTY_LINE = "the jar is waiting for its first good thing 🫙";
