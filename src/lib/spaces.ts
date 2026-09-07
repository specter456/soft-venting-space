/**
 * Saved spaces — the list of private spaces created on this device.
 * Stored as one JSON row in the local kv store; never leaves the device.
 *
 * Matching rules (strict):
 * - usernames/emails are trimmed before saving and before comparing
 * - comparison is case-insensitive (trimmed + lowercased); stored as typed
 * - passcodes live only as salted hashes and are compared exactly
 */

import {
  KV_PASSCODE_HASH,
  KV_PASSCODE_SALT,
  KV_USER_EMAIL,
  KV_USER_NAME,
  KV_USER_TYPE,
  getKvFromCache,
  setKv,
} from "./db";

const KV_SPACES = "savedSpaces";

export interface SavedSpace {
  id: string;
  type: "guest" | "email";
  /** Guest name — stored as typed (trimmed), compared case-insensitively. */
  name?: string;
  /** Email — stored as typed (trimmed), compared case-insensitively. */
  email?: string;
  /** Salted hash of the passcode — the code itself is never stored. */
  hash: string;
  salt: string;
}

export function normalizeIdentifier(value: string): string {
  return value.trim().toLowerCase();
}

export function spaceIdentifier(space: SavedSpace): string {
  return normalizeIdentifier(
    space.type === "guest" ? (space.name ?? "") : (space.email ?? ""),
  );
}

export function spaceLabel(space: SavedSpace): string {
  return (space.type === "guest" ? space.name : space.email) ?? "";
}

export function loadSpaces(): SavedSpace[] {
  try {
    const raw = getKvFromCache(KV_SPACES);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as SavedSpace[];
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (s) =>
        s &&
        typeof s.id === "string" &&
        (s.type === "guest" || s.type === "email") &&
        typeof s.hash === "string" &&
        typeof s.salt === "string",
    );
  } catch {
    return [];
  }
}

export async function saveSpaces(list: SavedSpace[]): Promise<void> {
  await setKv(KV_SPACES, JSON.stringify(list));
}

export function findSpaceByIdentifier(
  spaces: SavedSpace[],
  type: "guest" | "email",
  value: string,
): SavedSpace | null {
  const needle = normalizeIdentifier(value);
  if (!needle) return null;
  return (
    spaces.find((s) => s.type === type && spaceIdentifier(s) === needle) ??
    null
  );
}

export function newSpaceId(): string {
  return typeof crypto !== "undefined" && crypto.randomUUID
    ? crypto.randomUUID()
    : `sp-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

/**
 * Add a space to the saved list (dedupes by type + identifier).
 * New wins over old, so re-creating a space with the same name/email
 * replaces the old passcode instead of stacking a broken duplicate.
 */
export async function upsertSpace(space: SavedSpace): Promise<void> {
  const list = loadSpaces();
  const filtered = list.filter(
    (s) => !(s.type === space.type && spaceIdentifier(s) === spaceIdentifier(space)),
  );
  await saveSpaces([...filtered, space]);
}

/** Remove a space from the saved list by id. */
export async function removeSpace(id: string): Promise<void> {
  await saveSpaces(loadSpaces().filter((s) => s.id !== id));
}

/** Make a space the active identity for the whole app (lock + profile keys). */
export async function activateSpace(space: SavedSpace): Promise<void> {
  await setKv(KV_PASSCODE_HASH, space.hash);
  await setKv(KV_PASSCODE_SALT, space.salt);
  await setKv(KV_USER_TYPE, space.type);
  if (space.type === "guest") {
    await setKv(KV_USER_NAME, space.name ?? "");
    await setKv(KV_USER_EMAIL, "");
  } else {
    await setKv(KV_USER_EMAIL, space.email ?? "");
    await setKv(KV_USER_NAME, "");
  }
}

/**
 * Older devices saved a single space directly in the identity keys.
 * Build a space record from that identity so existing users keep working.
 */
export function spaceFromActiveIdentity(
  type: string | null,
  name: string | null,
  email: string | null,
  hash: string | null,
  salt: string | null,
): SavedSpace | null {
  if (!hash || !salt || (type !== "guest" && type !== "email")) return null;
  if (type === "guest" && !name) return null;
  if (type === "email" && !email) return null;
  return {
    id: newSpaceId(),
    type,
    name: type === "guest" ? (name ?? undefined) : undefined,
    email: type === "email" ? (email ?? undefined) : undefined,
    hash,
    salt,
  };
}

/** Deterministic cute face for a space (shown in the login list). */
const FACE_POOL = ["💜", "🌸", "🌙", "⭐", "☁️", "🌷", "🍀", "🫧", "🌻", "🐰"];

export function spaceFace(space: SavedSpace): string {
  let h = 0;
  for (const ch of space.id) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return FACE_POOL[h % FACE_POOL.length] ?? "💜";
}
