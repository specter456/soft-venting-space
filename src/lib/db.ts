/**
 * Venting's fully-local storage layer.
 *
 * Everything lives in IndexedDB on this device — notes, recordings, diary
 * pages, vault items, mood check-ins, and the passcode lock. There are no
 * network calls anywhere in this module; no user content ever leaves the
 * device.
 *
 * A small in-memory cache mirrors IndexedDB so React components can read
 * synchronously through `useTable`/`useSyncExternalStore` and stay in sync
 * across screens via a tiny subscription bus.
 */

import { useSyncExternalStore } from "react";
import { setScopedSpaceId } from "@/lib/safe-storage";

const DB_NAME = "venting-local";
// v2: adds the calendarEntries store. Existing devices get the new store
// created in onupgradeneeded; nothing else changes.
const DB_VERSION = 2;

export const STORE_NAMES = [
  "notes",
  "recordings",
  "diaryEntries",
  "vaultItems",
  "moodCheckins",
  "calendarEntries",
  "kv",
] as const;
export type StoreName = (typeof STORE_NAMES)[number];

export interface LocalRow {
  _id: string;
  _creationTime: number;
  /** Per-space isolation — stamped on creation, used to filter by active space. */
  spaceId?: string;
}

export type AttachmentKind = "audio" | "video" | "photo";
export interface Attachment {
  kind: AttachmentKind;
  label: string;
  duration?: number;
  art?: string;
}

export interface Recording extends LocalRow {
  kind: "voice" | "video";
  mood?: string;
  duration: number;
  noteId?: string;
  diaryId?: string;
}

export interface Note extends LocalRow {
  body: string;
  mood?: string;
  attachments: Attachment[];
}

export interface DiaryPageSticker {
  emoji: string;
  x: number;
  y: number;
  size: number;
  rotation?: number;
}

export interface DiaryPagePhoto {
  src: string;
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface DiaryPageStyle {
  font: string;
  headingColor: string;
  bodyColor: string;
  bgPhoto?: string;
}

export interface DiaryEntry extends LocalRow {
  title: string;
  body: string;
  mood?: string;
  weather: string;
  stickers: string[];
  attachments: Attachment[];
  positionedStickers?: DiaryPageSticker[];
  photos?: DiaryPagePhoto[];
  style?: DiaryPageStyle;
}

export interface VaultItem extends LocalRow {
  kind: "photo" | "video" | "gif" | "doodle" | "sticker";
  art: string;
  bg: string;
  caption?: string;
}

export interface MoodCheckin extends LocalRow {
  mood: string;
  intensity: number;
  note?: string;
  dateKey: string;
}

export type CalendarEntryType = "important" | "dump" | "normal";

export interface CalendarEntry extends LocalRow {
  /** Local calendar day, formatted "YYYY-MM-DD". */
  dateKey: string;
  type: CalendarEntryType;
  heading?: string;
  body: string;
  /** Optional schedule time, free text like "4:00 pm". */
  time?: string;
}

export interface KVPair extends LocalRow {
  key: string;
  value: string;
}

/** Passcode lock keys — stored here (salted hash only, never the code). */
export const KV_PASSCODE_HASH = "passcodeHash";
export const KV_PASSCODE_SALT = "passcodeSalt";

/** User identity keys — stored locally only, never sent anywhere. */
export const KV_USER_TYPE = "userType"; // "email" | "guest"
export const KV_USER_EMAIL = "userEmail";
export const KV_USER_NAME = "userName";

/** Active space ID — set ONLY after signup or correct passcode at login. */
export const KV_ACTIVE_SPACE_ID = "activeSpaceId";

/* ─── Cache + subscription bus ─────────────────────────────────────── */

const cache: Record<StoreName, LocalRow[]> = {
  notes: [],
  recordings: [],
  diaryEntries: [],
  vaultItems: [],
  moodCheckins: [],
  calendarEntries: [],
  kv: [],
};

let hydrated = false;
let dbPromise: Promise<IDBDatabase> | null = null;
const listeners = new Set<() => void>();

/* ─── Per-space isolation ─────────────────────────────────────────── */

/** Content stores that are scoped per-space. */
const CONTENT_STORES: readonly StoreName[] = [
  "notes",
  "recordings",
  "diaryEntries",
  "vaultItems",
  "moodCheckins",
  "calendarEntries",
];

let _activeSpaceId: string | null = null;

/** Returns the active space ID (set only after login/signup). */
export function getActiveSpaceId(): string | null {
  return _activeSpaceId;
}

/** Set the active space. Persists to kv and triggers re-render. */
/** Keys that live in localStorage and need per-space migration. */
const MIGRATABLE_LS_KEYS = [
  "theme", "streak-plant", "plant-shelf", "future-notes", "polaroid-wall",
  "pending-wall-pin", "gratitude-jar", "wind-down-used", "milestone-storyteller",
  "reminder-shown-today", "music-volume", "music-ambient-track", "music-ambient-uploads",
  "music-game-uploads", "music-off", "active-scene", "diary-cover", "custom-games",
  "moon-track", "nimbus-color", "pond-pals", "calendar-decor", "onboarding-done",
  "checkin", "lock-dismissed", "band-songs",
];

/** One-time: copy old unprefixed localStorage keys into the scoped namespace. */
function migrateLocalStorageKeys(spaceId: string): void {
  const prefix = `venting:${spaceId}:`;
  try {
    for (const key of MIGRATABLE_LS_KEYS) {
      const scoped = prefix + key;
      const old = `venting-${key}`;
      if (!localStorage.getItem(scoped) && localStorage.getItem(old)) {
        localStorage.setItem(scoped, localStorage.getItem(old)!);
      }
    }
  } catch { /* private mode — ignore */ }
}

export async function setActiveSpaceId(id: string | null): Promise<void> {
  _activeSpaceId = id;
  setScopedSpaceId(id);
  if (id) {
    migrateLocalStorageKeys(id);
    await setKv(KV_ACTIVE_SPACE_ID, id);
  } else {
    await deleteKv(KV_ACTIVE_SPACE_ID);
  }
  notify();
}

/** Re-read all IDB stores into cache (used after space switch). */
export async function rehydrateActiveSpace(): Promise<void> {
  if (!dbPromise) return;
  try {
    for (const name of STORE_NAMES) {
      const rows = await withStore<LocalRow[]>(name, "readonly", (s) => s.getAll());
      cache[name] = rows ?? [];
    }
    // Re-read activeSpaceId from kv
    _activeSpaceId = (cache.kv as KVPair[]).find((k) => k.key === KV_ACTIVE_SPACE_ID)?.value ?? null;
  } catch { /* ignore */ }
  notify();
}

/** Tag all spaceId-less content rows with the given spaceId (one-time migration). */
async function migrateUntaggedRows(spaceId: string): Promise<void> {
  let changed = false;
  for (const name of CONTENT_STORES) {
    const rows = cache[name];
    const untagged = rows.filter((r) => !r.spaceId);
    if (untagged.length === 0) continue;
    changed = true;
    cache[name] = rows.map((r) => (r.spaceId ? r : { ...r, spaceId }));
    for (const row of untagged) {
      await persistPut(name, { ...row, spaceId });
    }
  }
  if (changed) notify();
}

function notify(): void {
  for (const listener of listeners) {
    listener();
  }
}

export function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function getSnapshot(name: StoreName): LocalRow[] {
  // KV store is never filtered — it holds cross-space metadata (savedSpaces, activeSpaceId)
  // and per-space identity keys that are overwritten by activateSpace().
  if (!CONTENT_STORES.includes(name) || !_activeSpaceId) return cache[name];
  return cache[name].filter((row) => row.spaceId === _activeSpaceId);
}

/* ─── IndexedDB plumbing (with a graceful in-memory fallback) ─────── */

function openDb(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    if (typeof indexedDB === "undefined") {
      reject(new Error("IndexedDB unavailable"));
      return;
    }
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      for (const name of STORE_NAMES) {
        if (!db.objectStoreNames.contains(name)) {
          db.createObjectStore(name, { keyPath: "_id" });
        }
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
  return dbPromise;
}

async function withStore<T>(
  name: StoreName,
  mode: IDBTransactionMode,
  fn: (store: IDBObjectStore) => IDBRequest<T>,
): Promise<T> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(name, mode);
    const request = fn(tx.objectStore(name));
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

/** Load every store into memory once at app start. */
export async function hydrate(): Promise<void> {
  if (hydrated) return;
  try {
    await openDb();
    for (const name of STORE_NAMES) {
      const rows = await withStore<LocalRow[]>(name, "readonly", (s) => s.getAll());
      cache[name] = rows ?? [];
    }
    // Read active space ID from kv
    _activeSpaceId = (cache.kv as KVPair[]).find((k) => k.key === KV_ACTIVE_SPACE_ID)?.value ?? null;
    setScopedSpaceId(_activeSpaceId);
    // One-time migration: tag spaceId-less content rows with active space
    if (_activeSpaceId) {
      await migrateUntaggedRows(_activeSpaceId);
    }
  } catch {
    // No storage available (private mode / odd environment) — stay
    // in-memory only for this session so the app still works.
    console.warn("[venting] IndexedDB unavailable — using in-memory storage for this session.");
  }
  hydrated = true;
  notify();
}

export function isHydrated(): boolean {
  return hydrated;
}

async function persistAdd(name: StoreName, row: LocalRow): Promise<void> {
  try {
    await withStore(name, "readwrite", (s) => s.add(row));
  } catch {
    /* memory-only mode — ignore */
  }
}

async function persistDelete(name: StoreName, id: string): Promise<void> {
  try {
    await withStore(name, "readwrite", (s) => s.delete(id));
  } catch {
    /* memory-only mode — ignore */
  }
}

/* ─── React hooks ──────────────────────────────────────────────────── */

export function useHydrated(): boolean {
  return useSyncExternalStore(subscribe, isHydrated);
}

export function useTable<T extends LocalRow>(name: StoreName): T[] {
  return useSyncExternalStore(subscribe, () => getSnapshot(name)) as T[];
}

/* ─── Content mutations ────────────────────────────────────────────── */

function uid(): string {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function addRow<T extends LocalRow>(name: StoreName, input: Omit<T, "_id" | "_creationTime">): T {
  const row = { ...input, _id: uid(), _creationTime: Date.now(), spaceId: _activeSpaceId ?? undefined } as T;
  cache[name] = [...cache[name], row];
  void persistAdd(name, row);
  notify();
  return row;
}

export function createNote(input: Omit<Note, "_id" | "_creationTime">): Note {
  return addRow<Note>("notes", input);
}

export function createRecording(
  input: Omit<Recording, "_id" | "_creationTime">,
): Recording {
  return addRow<Recording>("recordings", input);
}

export function createDiaryEntry(
  input: Omit<DiaryEntry, "_id" | "_creationTime">,
): DiaryEntry {
  return addRow<DiaryEntry>("diaryEntries", input);
}

export function updateDiaryEntry(
  id: string,
  patch: Partial<Omit<DiaryEntry, "_id" | "_creationTime">>,
): void {
  const entry = (cache.diaryEntries as DiaryEntry[]).find((e) => e._id === id);
  if (!entry) return;
  const updated = { ...entry, ...patch };
  cache.diaryEntries = cache.diaryEntries.map((e) => (e._id === id ? updated : e));
  void persistPut("diaryEntries", updated);
  notify();
}

export function createVaultItem(
  input: Omit<VaultItem, "_id" | "_creationTime">,
): VaultItem {
  return addRow<VaultItem>("vaultItems", input);
}

export function createCalendarEntry(
  input: Omit<CalendarEntry, "_id" | "_creationTime">,
): CalendarEntry {
  return addRow<CalendarEntry>("calendarEntries", input);
}

export function updateCalendarEntry(
  id: string,
  patch: Partial<Omit<CalendarEntry, "_id" | "_creationTime">>,
): void {
  const entry = (cache.calendarEntries as CalendarEntry[]).find((e) => e._id === id);
  if (!entry) return;
  const updated = { ...entry, ...patch };
  cache.calendarEntries = cache.calendarEntries.map((e) => (e._id === id ? updated : e));
  void persistPut("calendarEntries", updated);
  notify();
}

/** One check-in per day: replacing yesterday's entry for the same dateKey. */
export function saveCheckin(input: Omit<MoodCheckin, "_id" | "_creationTime">): MoodCheckin {
  const existing = (cache.moodCheckins as MoodCheckin[]).find(
    (c) => c.dateKey === input.dateKey,
  );
  if (existing) {
    removeItem("moodCheckins", existing._id);
  }
  return addRow<MoodCheckin>("moodCheckins", input);
}

export function removeItem(name: StoreName, id: string): void {
  cache[name] = cache[name].filter((row) => row._id !== id);
  void persistDelete(name, id);
  notify();
}

export function attachRecordingToNote(recordingId: string, noteId: string): void {
  const rec = (cache.recordings as Recording[]).find((r) => r._id === recordingId);
  if (!rec) return;
  const updated = { ...rec, noteId };
  cache.recordings = cache.recordings.map((r) => (r._id === recordingId ? updated : r));
  void persistPut("recordings", updated);
  notify();
}

export function attachRecordingToDiary(recordingId: string, diaryId: string): void {
  const rec = (cache.recordings as Recording[]).find((r) => r._id === recordingId);
  if (!rec) return;
  const updated = { ...rec, diaryId };
  cache.recordings = cache.recordings.map((r) => (r._id === recordingId ? updated : r));
  void persistPut("recordings", updated);
  notify();
}

async function persistPut(name: StoreName, row: LocalRow): Promise<void> {
  try {
    await withStore(name, "readwrite", (s) => s.put(row));
  } catch {
    /* memory-only mode — ignore */
  }
}

/* ─── Key-value (passcode lock, device prefs) ──────────────────────── */

export async function setKv(key: string, value: string): Promise<void> {
  const existing = (cache.kv as KVPair[]).find((k) => k.key === key);
  if (existing) {
    const updated = { ...existing, value };
    cache.kv = cache.kv.map((k) => (k._id === existing._id ? updated : k));
    await persistPut("kv", updated);
  } else {
    addRow<KVPair>("kv", { key, value });
    return;
  }
  notify();
}

export async function deleteKv(key: string): Promise<void> {
  const existing = (cache.kv as KVPair[]).find((k) => k.key === key);
  if (existing) {
    removeItem("kv", existing._id);
  }
}

export function getKvFromCache(key: string): string | undefined {
  return (cache.kv as KVPair[]).find((k) => k.key === key)?.value;
}

/** True once both passcode halves exist on this device. */
export function hasPasscodeLocally(): boolean {
  const kv = cache.kv as KVPair[];
  return (
    kv.some((k) => k.key === KV_PASSCODE_HASH && k.value) &&
    kv.some((k) => k.key === KV_PASSCODE_SALT && k.value)
  );
}

/** The stored salted hash + salt used to verify an unlock. */
export function getPasscodeLocally(): { hash: string; salt: string } | null {
  const kv = cache.kv as KVPair[];
  const hash = kv.find((k) => k.key === KV_PASSCODE_HASH)?.value;
  const salt = kv.find((k) => k.key === KV_PASSCODE_SALT)?.value;
  return hash && salt ? { hash, salt } : null;
}

/**
 * Space-scoped wipe: clears only the active space's data.
 * Used by Settings → "Delete everything" after confirmation.
 */
export async function wipeAll(): Promise<void> {
  const spaceId = _activeSpaceId;
  try {
    const db = await openDb();
    if (spaceId) {
      // Only clear rows belonging to the active space
      for (const name of CONTENT_STORES) {
        const rows = (cache[name] as LocalRow[]).filter((r) => r.spaceId === spaceId);
        for (const row of rows) {
          await persistDelete(name, row._id);
        }
      }
      // Clear this space's identity keys
      await deleteKv(KV_PASSCODE_HASH);
      await deleteKv(KV_PASSCODE_SALT);
      await deleteKv(KV_USER_TYPE);
      await deleteKv(KV_USER_EMAIL);
      await deleteKv(KV_USER_NAME);
      await deleteKv(KV_ACTIVE_SPACE_ID);
      // Remove this space from the savedSpaces list
      try {
        const { loadSpaces, saveSpaces } = await import("./spaces");
        await saveSpaces(loadSpaces().filter((s) => s.id !== spaceId));
      } catch { /* ignore */ }
    } else {
      // No active space — full wipe (fallback for edge cases)
      await new Promise<void>((resolve, reject) => {
        const tx = db.transaction(STORE_NAMES, "readwrite");
        for (const name of STORE_NAMES) {
          tx.objectStore(name).clear();
        }
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
      });
    }
  } catch {
    /* in-memory mode — nothing persisted to clear */
  }
  // Update cache
  if (spaceId) {
    for (const name of CONTENT_STORES) {
      cache[name] = cache[name].filter((r) => r.spaceId !== spaceId);
    }
  } else {
    for (const name of STORE_NAMES) {
      cache[name] = [];
    }
  }
  // Clear scoped localStorage keys for this space
  try {
    const prefix = spaceId ? `venting:${spaceId}:` : null;
    const keysToRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.startsWith("venting-")) keysToRemove.push(k);
      if (prefix && k && k.startsWith(prefix)) keysToRemove.push(k);
    }
    keysToRemove.forEach((k) => localStorage.removeItem(k));
  } catch { /* ignore */ }
  _activeSpaceId = null;
  notify();
}
