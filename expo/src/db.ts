/**
 * Venting's fully-local native storage layer.
 *
 * Structured data (notes, recordings, diary pages, vault items, check-ins,
 * passcode lock) lives in expo-sqlite; binary files (audio, video, photos)
 * live under expo-file-system's document directory. Nothing here touches the
 * network — no user content ever leaves the device.
 *
 * A small in-memory cache mirrors the sqlite tables so React components read
 * synchronously through `useTable` and stay in sync via a subscription bus.
 */

import * as SQLite from "expo-sqlite";
import * as FileSystem from "expo-file-system";
import { useSyncExternalStore } from "react";
import type {
  Attachment,
  DiaryEntry,
  GifFrame,
  KVPair,
  MoodCheckin,
  Note,
  Recording,
  TableName,
  VaultItem,
} from "./types";

const DB_NAME = "venting.db";
const DIR_NAME = "venting";

export const STORES: TableName[] = [
  "notes",
  "recordings",
  "diaryEntries",
  "vaultItems",
  "moodCheckins",
  "kv",
];

/* ─── Key-value lock keys ──────────────────────────────────────────── */

export const KV_PASSCODE_HASH = "passcodeHash";
export const KV_PASSCODE_SALT = "passcodeSalt";
export const KV_ONBOARDING_DONE = "onboardingDone";
export const KV_PROFILE_EMAIL = "profileEmail";
export const KV_PROFILE_NAME = "profileName";
export const KV_PROFILE_AVATAR = "profileAvatar";
export const KV_DIARY_COVER = "diaryCover";
export const KV_LOCK_SKIPPED = "lockSkipped";
export const KV_BIOMETRIC = "biometricEnabled";
export const KV_VAULT_DOUBLE_LOCK = "vaultDoubleLock";
export const KV_AUTO_LOCK_MIN = "autoLockMinutes";
export const KV_GENTLE_REMINDERS = "gentleReminders";
export const KV_LANGUAGE = "language";

export const biometricEnabled = (): boolean => getKvFromCache(KV_BIOMETRIC) !== "false";
export const vaultDoubleLockEnabled = (): boolean => getKvFromCache(KV_VAULT_DOUBLE_LOCK) !== "false";
export const autoLockMinutes = (): number => {
  const v = Number(getKvFromCache(KV_AUTO_LOCK_MIN));
  return Number.isFinite(v) && v > 0 ? v : 0;
};
export const gentleRemindersEnabled = (): boolean => getKvFromCache(KV_GENTLE_REMINDERS) === "true";

/* ─── SQLite plumbing ──────────────────────────────────────────────── */

let db: SQLite.SQLiteDatabase | null = null;

export function openDb(): SQLite.SQLiteDatabase {
  if (db) return db;
  db = SQLite.openDatabaseSync(DB_NAME);
  db.execSync(`
    CREATE TABLE IF NOT EXISTS kv (
      key TEXT PRIMARY KEY NOT NULL,
      value TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS moodCheckins (
      dateKey TEXT PRIMARY KEY NOT NULL,
      mood TEXT NOT NULL,
      intensity INTEGER NOT NULL,
      note TEXT,
      at INTEGER NOT NULL
    );
    CREATE TABLE IF NOT EXISTS notes (
      id TEXT PRIMARY KEY NOT NULL,
      body TEXT NOT NULL,
      mood TEXT,
      attachments TEXT NOT NULL DEFAULT '[]',
      at INTEGER NOT NULL
    );
    CREATE TABLE IF NOT EXISTS recordings (
      id TEXT PRIMARY KEY NOT NULL,
      kind TEXT NOT NULL,
      mood TEXT,
      duration INTEGER NOT NULL,
      fileUri TEXT,
      avatar TEXT,
      noteId TEXT,
      diaryId TEXT,
      at INTEGER NOT NULL
    );
    CREATE TABLE IF NOT EXISTS diaryEntries (
      id TEXT PRIMARY KEY NOT NULL,
      title TEXT NOT NULL,
      body TEXT NOT NULL,
      mood TEXT,
      weather TEXT NOT NULL,
      stickers TEXT NOT NULL DEFAULT '[]',
      attachments TEXT NOT NULL DEFAULT '[]',
      at INTEGER NOT NULL
    );
    CREATE TABLE IF NOT EXISTS vaultItems (
      id TEXT PRIMARY KEY NOT NULL,
      kind TEXT NOT NULL,
      art TEXT NOT NULL,
      bg TEXT NOT NULL,
      caption TEXT,
      fileUri TEXT,
      frames TEXT,
      data TEXT,
      at INTEGER NOT NULL
    );
  `);
  return db;
}

/* ─── Reactive cache + subscription bus ────────────────────────────── */

type AnyRow = Note | Recording | DiaryEntry | VaultItem | MoodCheckin | KVPair;

const cache: Record<TableName, AnyRow[]> = {
  notes: [],
  recordings: [],
  diaryEntries: [],
  vaultItems: [],
  moodCheckins: [],
  kv: [],
};

let hydrated = false;
const listeners = new Set<() => void>();

function notify(): void {
  for (const l of listeners) l();
}

export function subscribeDb(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function getSnapshot(name: TableName): AnyRow[] {
  return cache[name];
}

function isHydratedSnapshot(): boolean {
  return hydrated;
}

export function useTable<T extends AnyRow>(name: TableName): T[] {
  return useSyncExternalStore(subscribeDb, () => getSnapshot(name)) as T[];
}

export function useHydrated(): boolean {
  return useSyncExternalStore(subscribeDb, isHydratedSnapshot);
}

/* ─── Load everything into memory once at startup ──────────────────── */

/**
 * Safe JSON parsing: one corrupted row must never crash the whole app. If a
 * row's JSON is missing, empty, or malformed, it falls back to an empty
 * array / undefined instead of throwing — the rest of the data loads fine.
 */
function safeParseArray(raw: unknown): unknown[] {
  if (raw === null || raw === undefined || raw === "") return [];
  if (Array.isArray(raw)) return raw;
  try {
    const parsed = JSON.parse(raw as string);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export async function hydrate(): Promise<void> {
  if (hydrated) return;
  try {
    const d = openDb();
    cache.notes = d.getAllSync<Note>("SELECT * FROM notes ORDER BY at DESC");
    cache.recordings = d.getAllSync<Recording>("SELECT * FROM recordings ORDER BY at DESC");
    cache.diaryEntries = d.getAllSync<DiaryEntry>("SELECT * FROM diaryEntries ORDER BY at DESC");
    cache.vaultItems = d.getAllSync<VaultItem>("SELECT * FROM vaultItems ORDER BY at DESC");
    cache.moodCheckins = d.getAllSync<MoodCheckin>("SELECT * FROM moodCheckins ORDER BY at DESC");
    cache.kv = d.getAllSync<KVPair>("SELECT * FROM kv");
    // parse JSON columns — row by row, never crashing on a bad cell
    cache.notes = (cache.notes as Note[]).map((n) => ({
      ...n,
      attachments: safeParseArray((n as unknown as { attachments?: unknown }).attachments) as Attachment[],
    }));
    cache.diaryEntries = (cache.diaryEntries as DiaryEntry[]).map((e) => ({
      ...e,
      stickers: safeParseArray((e as unknown as { stickers?: unknown }).stickers) as string[],
      attachments: safeParseArray((e as unknown as { attachments?: unknown }).attachments) as Attachment[],
    }));
    cache.vaultItems = (cache.vaultItems as VaultItem[]).map((v) => ({
      ...v,
      frames: safeParseArray((v as unknown as { frames?: unknown }).frames) as GifFrame[] | undefined,
    }));
  } catch (err) {
    console.warn("[venting] sqlite unavailable — in-memory only for this session", err);
  }
  hydrated = true;
  notify();
}

/* ─── File storage ─────────────────────────────────────────────────── */
/*
 * Native: files live under expo-file-system's private document directory.
 * Web:   the platform has no document directory, so binary data is kept as
 *        base64 data-URIs inside the same local sqlite store. Either way
 *        nothing leaves the device.
 */

import { Platform } from "react-native";
const IS_WEB = Platform.OS === "web";

const MIME: Record<string, string> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  wav: "audio/wav",
  m4a: "audio/m4a",
  mp4: "video/mp4",
  mov: "video/quicktime",
};

async function ensureDir(): Promise<string> {
  const dir = `${FileSystem.documentDirectory ?? ""}${DIR_NAME}/`;
  const info = await FileSystem.getInfoAsync(dir);
  if (!info.exists) {
    await FileSystem.makeDirectoryAsync(dir, { intermediates: true });
  }
  return dir;
}

function blobToBase64(blob: Blob): Promise<{ base64: string; mime: string }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("read failed"));
    reader.onload = () => {
      const result = reader.result as string;
      resolve({ base64: result.split(",")[1] ?? "", mime: blob.type });
    };
    reader.readAsDataURL(blob);
  });
}

/** Copy a picked/temporary file (camera, picker) into private storage. */
export async function storeFile(uri: string, ext: string): Promise<string> {
  if (IS_WEB) {
    const res = await fetch(uri);
    const blob = await res.blob();
    const { base64, mime } = await blobToBase64(blob);
    return `data:${mime || MIME[ext] || "application/octet-stream"};base64,${base64}`;
  }
  const dir = await ensureDir();
  const dest = `${dir}${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
  await FileSystem.copyAsync({ from: uri, to: dest });
  return dest;
}

/** Persist a base64 payload (doodles/gif frames as png if provided) as a file. */
export async function storeBase64File(base64: string, ext: string): Promise<string> {
  if (IS_WEB) {
    return `data:${MIME[ext] ?? "application/octet-stream"};base64,${base64}`;
  }
  const dir = await ensureDir();
  const dest = `${dir}${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
  await FileSystem.writeAsStringAsync(dest, base64, {
    encoding: FileSystem.EncodingType.Base64,
  });
  return dest;
}

export async function fileExists(uri?: string): Promise<boolean> {
  if (!uri) return false;
  if (IS_WEB) return uri.startsWith("data:");
  try {
    const info = await FileSystem.getInfoAsync(uri);
    return info.exists;
  } catch {
    return false;
  }
}

export async function deleteFile(uri?: string): Promise<void> {
  if (!uri || IS_WEB) return; // data-URIs need no cleanup
  try {
    const info = await FileSystem.getInfoAsync(uri);
    if (info.exists) await FileSystem.deleteAsync(uri, { idempotent: true });
  } catch {
    /* ignore */
  }
}

/* ─── Mutations ────────────────────────────────────────────────────── */

function uid(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

type RowWithId = { id: string };

function rowId(row: AnyRow): string | undefined {
  return "id" in row ? (row as unknown as RowWithId).id : undefined;
}

function upsertCache(name: TableName, row: AnyRow): void {
  const id = rowId(row);
  const rest = cache[name].filter((r) => (id === undefined ? true : rowId(r) !== id));
  cache[name] = [row, ...rest];
  notify();
}

function removeCache(name: TableName, id: string): void {
  cache[name] = cache[name].filter((r) => rowId(r) !== id);
  notify();
}

export function createNote(input: Omit<Note, "id" | "at">): Note {
  const row: Note = { ...input, id: uid(), at: Date.now() };
  openDb().runSync(
    "INSERT INTO notes (id, body, mood, attachments, at) VALUES (?, ?, ?, ?, ?)",
    row.id,
    row.body,
    row.mood ?? null,
    JSON.stringify(row.attachments),
    row.at,
  );
  upsertCache("notes", row);
  return row;
}

export function updateNote(note: Note): void {
  openDb().runSync(
    "UPDATE notes SET body = ?, mood = ?, attachments = ? WHERE id = ?",
    note.body,
    note.mood ?? null,
    JSON.stringify(note.attachments),
    note.id,
  );
  upsertCache("notes", note);
}

export function createRecording(input: Omit<Recording, "id" | "at">): Recording {
  const row: Recording = { ...input, id: uid(), at: Date.now() };
  openDb().runSync(
    "INSERT INTO recordings (id, kind, mood, duration, fileUri, avatar, noteId, diaryId, at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
    row.id,
    row.kind,
    row.mood ?? null,
    row.duration,
    row.fileUri ?? null,
    row.avatar ?? null,
    row.noteId ?? null,
    row.diaryId ?? null,
    row.at,
  );
  upsertCache("recordings", row);
  return row;
}

export function createDiaryEntry(input: Omit<DiaryEntry, "id" | "at">): DiaryEntry {
  const row: DiaryEntry = { ...input, id: uid(), at: Date.now() };
  openDb().runSync(
    "INSERT INTO diaryEntries (id, title, body, mood, weather, stickers, attachments, at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
    row.id,
    row.title,
    row.body,
    row.mood ?? null,
    row.weather,
    JSON.stringify(row.stickers),
    JSON.stringify(row.attachments),
    row.at,
  );
  upsertCache("diaryEntries", row);
  return row;
}

export function createVaultItem(input: Omit<VaultItem, "id" | "at">): VaultItem {
  const row: VaultItem = { ...input, id: uid(), at: Date.now() };
  openDb().runSync(
    "INSERT INTO vaultItems (id, kind, art, bg, caption, fileUri, frames, data, at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
    row.id,
    row.kind,
    row.art,
    row.bg,
    row.caption ?? null,
    row.fileUri ?? null,
    row.frames ? JSON.stringify(row.frames) : null,
    row.data ?? null,
    row.at,
  );
  upsertCache("vaultItems", row);
  return row;
}

/** One check-in per day: replaces the same dateKey's entry. */
export function saveCheckin(input: Omit<MoodCheckin, "at">): MoodCheckin {
  const d = openDb();
  d.runSync("DELETE FROM moodCheckins WHERE dateKey = ?", input.dateKey);
  const row: MoodCheckin = { ...input, at: Date.now() };
  d.runSync(
    "INSERT INTO moodCheckins (dateKey, mood, intensity, note, at) VALUES (?, ?, ?, ?, ?)",
    row.dateKey,
    row.mood,
    row.intensity,
    row.note ?? null,
    row.at,
  );
  const rest = cache.moodCheckins.filter((c) => (c as MoodCheckin).dateKey !== row.dateKey);
  cache.moodCheckins = [row, ...rest];
  notify();
  return row;
}

export function removeItem(name: TableName, id: string): void {
  openDb().runSync(`DELETE FROM ${name} WHERE id = ?`, id);
  removeCache(name, id);
}

/** Remove today's check-in (the check-ins table is keyed by dateKey, not id). */
export function clearCheckin(dateKey: string): void {
  openDb().runSync("DELETE FROM moodCheckins WHERE dateKey = ?", dateKey);
  cache.moodCheckins = (cache.moodCheckins as MoodCheckin[]).filter((c) => c.dateKey !== dateKey);
  notify();
}

export function attachRecordingToNote(recordingId: string, noteId: string): void {
  openDb().runSync("UPDATE recordings SET noteId = ? WHERE id = ?", noteId, recordingId);
  const rec = (cache.recordings as Recording[]).find((r) => r.id === recordingId);
  if (rec) {
    upsertCache("recordings", { ...rec, noteId });
  }
}

export function attachRecordingToDiary(recordingId: string, diaryId: string): void {
  openDb().runSync("UPDATE recordings SET diaryId = ? WHERE id = ?", diaryId, recordingId);
  const rec = (cache.recordings as Recording[]).find((r) => r.id === recordingId);
  if (rec) {
    upsertCache("recordings", { ...rec, diaryId });
  }
}

/* ─── Key-value (lock, device prefs) ───────────────────────────────── */

export async function setKv(key: string, value: string): Promise<void> {
  openDb().runSync(
    "INSERT INTO kv (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value",
    key,
    value,
  );
  const rest = cache.kv.filter((k) => (k as KVPair).key !== key);
  cache.kv = [...rest, { key, value } as KVPair];
  notify();
}

export async function deleteKv(key: string): Promise<void> {
  openDb().runSync("DELETE FROM kv WHERE key = ?", key);
  cache.kv = cache.kv.filter((k) => (k as KVPair).key !== key);
  notify();
}

export function getKvFromCache(key: string): string | undefined {
  return (cache.kv as KVPair[]).find((k) => k.key === key)?.value;
}

export function hasPasscodeLocally(): boolean {
  const kv = cache.kv as KVPair[];
  return (
    kv.some((k) => k.key === KV_PASSCODE_HASH && k.value) &&
    kv.some((k) => k.key === KV_PASSCODE_SALT && k.value)
  );
}

export function getPasscodeLocally(): { hash: string; salt: string } | null {
  const kv = cache.kv as KVPair[];
  const hash = kv.find((k) => k.key === KV_PASSCODE_HASH)?.value;
  const salt = kv.find((k) => k.key === KV_PASSCODE_SALT)?.value;
  return hash && salt ? { hash, salt } : null;
}

/* ─── Delete everything ────────────────────────────────────────────── */

/**
 * Gentle full wipe: clears every table (including the lock) and removes all
 * stored files. Used by Settings → “Delete everything” after confirmation.
 */
export async function wipeAll(): Promise<void> {
  try {
    const d = openDb();
    for (const table of ["notes", "recordings", "diaryEntries", "vaultItems", "moodCheckins", "kv"]) {
      d.execSync(`DELETE FROM ${table}`);
    }
  } catch (err) {
    console.warn("[venting] wipe failed partially", err);
  }
  // native: also remove binary files
  try {
    const dir = `${FileSystem.documentDirectory ?? ""}${DIR_NAME}`;
    const info = await FileSystem.getInfoAsync(dir);
    if (info.exists) await FileSystem.deleteAsync(dir, { idempotent: true });
  } catch {
    /* ignore */
  }
  for (const name of STORES) {
    cache[name] = [];
  }
  hydrated = true;
  notify();
}
