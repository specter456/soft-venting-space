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
  return cache[name];
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
  const row = { ...input, _id: uid(), _creationTime: Date.now() } as T;
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
 * Gentle full wipe: clears every store (including the lock) on this device.
 * Used by Settings → "Delete everything" after confirmation. Never touches
 * anything outside this device.
 */
export async function wipeAll(): Promise<void> {
  try {
    const db = await openDb();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_NAMES, "readwrite");
      for (const name of STORE_NAMES) {
        tx.objectStore(name).clear();
      }
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch {
    /* in-memory mode — nothing persisted to clear */
  }
  for (const name of STORE_NAMES) {
    cache[name] = [];
  }
  // Also clear localStorage keys so the next visit is a fresh start
  try {
    localStorage.removeItem("venting-profile-email");
    localStorage.removeItem("venting-checkin");
    localStorage.removeItem("venting-lock-dismissed");
  } catch { /* ignore */ }
  notify();
}
