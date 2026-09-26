/**
 * Error Journal — rolling local log, last 50 entries.
 * Never stores user content (no notes, diary, names, text).
 * All data stays on this device.
 */

import { getActiveSpaceId } from "@/lib/db";
import { copyText } from "@/lib/clipboard";
// Real version from package.json (bundled at build time — no network, no config).
import { version as pkgVersion } from "../../package.json";

const JOURNAL_KEY = "venting-error-journal";
const MAX_ENTRIES = 50;

export interface JournalEntry {
  id: string;
  timestamp: number;
  screen: string;
  message: string;
  code: string; // short 4-char hex hash
  version: string;
}

/** App version — build-time define if present, otherwise package.json. */
export const APP_VERSION: string =
  typeof __APP_VERSION__ !== "undefined" && __APP_VERSION__
    ? (__APP_VERSION__ as string)
    : pkgVersion;

declare const __APP_VERSION__: string | undefined;

/* ─── Short hash for report codes ────────────────────────────────── */

function shortHash(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const ch = str.charCodeAt(i);
    hash = ((hash << 5) - hash + ch) | 0;
  }
  // Convert to 4-char uppercase hex
  return Math.abs(hash).toString(16).toUpperCase().slice(0, 4).padStart(4, "0");
}

/** Generate a friendly report code from an error message. */
export function reportCode(errorMessage: string): string {
  return shortHash(errorMessage);
}

/* ─── Read / Write journal ───────────────────────────────────────── */

function readJournal(): JournalEntry[] {
  try {
    const raw = localStorage.getItem(JOURNAL_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed as JournalEntry[];
  } catch {
    return [];
  }
}

function writeJournal(entries: JournalEntry[]): void {
  try {
    // Only keep the last MAX_ENTRIES
    const trimmed = entries.slice(-MAX_ENTRIES);
    localStorage.setItem(JOURNAL_KEY, JSON.stringify(trimmed));
  } catch {
    /* storage full — silently ignore */
  }
}

/** Get the current journal entry count. */
export function journalCount(): number {
  return readJournal().length;
}

/** Get all journal entries (most recent last). */
export function getJournal(): JournalEntry[] {
  return readJournal();
}

/** Clear the entire journal. */
export function clearJournal(): void {
  try {
    localStorage.removeItem(JOURNAL_KEY);
  } catch {
    /* ignore */
  }
}

/* ─── Log an error ──────────────────────────────────────────────── */

/**
 * Log an error to the journal. Never stores user content.
 * Returns the generated report code.
 */
export function logError(
  screen: string,
  error: Error | string,
  version?: string,
): string {
  const message = typeof error === "string" ? error : error.message ?? String(error);
  const code = reportCode(message + screen);
  const entry: JournalEntry = {
    id: `${Date.now()}-${code}`,
    timestamp: Date.now(),
    screen,
    message,
    code,
    version: version ?? APP_VERSION,
  };

  const entries = readJournal();
  entries.push(entry);
  writeJournal(entries);

  return code;
}

/* ─── Copy report to clipboard ──────────────────────────────────── */

function formatEntryForReport(entry: JournalEntry): string {
  const date = new Date(entry.timestamp).toLocaleString();
  return `[${date}] ${entry.screen} — code: #${entry.code}\n  ${entry.message}\n  version: ${entry.version}`;
}

/** Format the full journal as a plain-text report. */
export function formatReport(): string {
  const entries = readJournal();
  if (entries.length === 0) return "No errors logged.";

  const lines = [
    `Venting Error Journal — ${entries.length} entries`,
    `Version: ${APP_VERSION}`,
    `Generated: ${new Date().toLocaleString()}`,
    `Device only — no user content included.`,
    "",
  ];

  for (const entry of entries) {
    lines.push(formatEntryForReport(entry));
  }

  return lines.join("\n");
}

/** Copy the journal report to clipboard. Returns true on success. */
export async function copyReport(): Promise<boolean> {
  try {
    const text = formatReport();
    return await copyText(text);
  } catch {
    return false;
  }
}

/** Share the journal report via the device share sheet. */
export async function shareReport(): Promise<boolean> {
  try {
    const text = formatReport();
    if (navigator.share) {
      await navigator.share({
        title: "Venting Error Report",
        text,
      });
      return true;
    }
    // Fallback: copy to clipboard
    return await copyReport();
  } catch {
    return false;
  }
}

/* ─── Corrupt data quarantine ────────────────────────────────────── */

/**
 * Quarantine a corrupt localStorage key by renaming it.
 * The original key gets a `_broken_<timestamp>` suffix and the app
 * continues with empty defaults.
 */
export function quarantineKey(key: string): void {
  try {
    // Try the key as-is first
    let value = localStorage.getItem(key);
    let actualKey = key;

    // If not found, try the active-space-scoped version
    if (value === null) {
      const spaceId = getActiveSpaceId();
      if (spaceId) {
        const scopedKey = `venting:${spaceId}:${key}`;
        value = localStorage.getItem(scopedKey);
        actualKey = scopedKey;
      }
    }

    if (value === null) return;
    const brokenKey = `${actualKey}_broken_${Date.now()}`;
    localStorage.setItem(brokenKey, value);
    localStorage.removeItem(actualKey);
    console.warn(`[venting] quarantined corrupt key: ${actualKey} → ${brokenKey}`);
  } catch {
    /* storage unavailable — silently ignore */
  }
}
