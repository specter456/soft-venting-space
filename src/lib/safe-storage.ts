/**
 * Safe localStorage / sessionStorage access.
 *
 * Some browsers (notably Safari private mode and strict webviews) throw on
 * any storage access. Every read/write is wrapped so storage problems can
 * never crash the app — worst case the value is treated as missing.
 */

function storageAvailable(storage: Storage | undefined): storage is Storage {
  if (!storage) return false;
  try {
    const probe = "__venting_probe__";
    storage.setItem(probe, "1");
    storage.removeItem(probe);
    return true;
  } catch {
    return false;
  }
}

const local = typeof window !== "undefined" ? window.localStorage : undefined;
const session = typeof window !== "undefined" ? window.sessionStorage : undefined;

const localOk = storageAvailable(local);
const sessionOk = storageAvailable(session);

export function safeGetItem(key: string): string | null {
  try {
    return localOk ? (local as Storage).getItem(key) : null;
  } catch {
    return null;
  }
}

export function safeSetItem(key: string, value: string): void {
  try {
    if (localOk) (local as Storage).setItem(key, value);
  } catch {
    /* ignore — storage unavailable */
  }
}

export function safeRemoveItem(key: string): void {
  try {
    if (localOk) (local as Storage).removeItem(key);
  } catch {
    /* ignore */
  }
}

export function safeSessionGetItem(key: string): string | null {
  try {
    return sessionOk ? (session as Storage).getItem(key) : null;
  } catch {
    return null;
  }
}

export function safeSessionSetItem(key: string, value: string): void {
  try {
    if (sessionOk) (session as Storage).setItem(key, value);
  } catch {
    /* ignore */
  }
}

export function safeSessionRemoveItem(key: string): void {
  try {
    if (sessionOk) (session as Storage).removeItem(key);
  } catch {
    /* ignore */
  }
}

/** True when this device can persist anything at all. */
export function canPersist(): boolean {
  return localOk || sessionOk;
}
