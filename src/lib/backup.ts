import JSZip from "jszip";
import {
  STORE_NAMES,
  getActiveSpaceId,
  type StoreName,
  type LocalRow,
  type KVPair,
  type VaultItem,
  type DiaryEntry,
} from "@/lib/db";

/**
 * Bundle the ACTIVE SPACE's local data into a zip and trigger download.
 * Only includes data belonging to the active space.
 */
export async function downloadBackup(): Promise<void> {
  const zip = new JSZip();
  const spaceId = getActiveSpaceId();

  // ─── 1. IndexedDB stores (filtered by active space) ──────────────
  const dbData: Record<string, LocalRow[]> = {};
  for (const storeName of STORE_NAMES) {
    const allRows = await idbGetAll(storeName);
    // Content stores: only rows belonging to the active space.
    // KV: keep this space's keys, but NEVER ship the device's savedSpaces
    // list (it holds every space's passcode hash — not this space's data).
    if (storeName === "kv") {
      dbData[storeName] = allRows.filter(
        (r) => (r as KVPair).key !== "savedSpaces",
      );
    } else {
      dbData[storeName] = spaceId
        ? allRows.filter((r) => !r.spaceId || r.spaceId === spaceId)
        : allRows;
    }
  }
  zip.file("db.json", JSON.stringify(dbData, null, 2));

  // ─── 2. localStorage keys (scoped to active space) ──────────────
  const lsData: Record<string, string> = {};
  const prefix = spaceId ? `venting:${spaceId}:` : null;
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (!key) continue;
    // Include scoped keys for this space, and cross-space venting-* keys
    if (prefix && key.startsWith(prefix)) {
      const val = localStorage.getItem(key);
      if (val !== null) lsData[key] = val;
    } else if (key.startsWith("venting-") && !key.startsWith("venting:")) {
      const val = localStorage.getItem(key);
      if (val !== null) lsData[key] = val;
    }
  }
  zip.file("localStorage.json", JSON.stringify(lsData, null, 2));

  // ─── 3. Vault images as separate files ──────────────────────────
  const vaultItems = dbData.vaultItems as VaultItem[] | undefined;
  if (vaultItems) {
    for (const item of vaultItems) {
      if (item.art && (item.art.startsWith("data:") || item.art.startsWith("blob:"))) {
        try {
          const blob = await dataUrlToBlob(item.art);
          zip.file(`vault/${item._id}.png`, blob);
        } catch {
          /* skip unconvertible items */
        }
      }
    }
  }

  // ─── 4. Diary photos as separate files ──────────────────────────
  const diaryEntries = dbData.diaryEntries as DiaryEntry[] | undefined;
  if (diaryEntries) {
    for (const entry of diaryEntries) {
      if (entry.photos) {
        for (let pi = 0; pi < entry.photos.length; pi++) {
          const photo = entry.photos[pi];
          if (photo.src && photo.src.startsWith("data:")) {
            try {
              const blob = await dataUrlToBlob(photo.src);
              zip.file(`diary-photos/${entry._id}-${pi}.png`, blob);
            } catch {
              /* skip */
            }
          }
        }
      }
    }
  }

  // ─── Generate and download ──────────────────────────────────────
  const content = await zip.generateAsync({ type: "blob" });
  triggerDownload(content, "my-venting-space.zip");
}

/**
 * Restore from a Venting backup zip.
 *
 * Writes ONLY into the active space: other spaces' rows, keys and passcodes
 * on this device are never touched. Content rows from the zip are restamped
 * into the active space so everything in the backup becomes this space's.
 */
export async function restoreBackup(file: File): Promise<{ ok: boolean; error?: string }> {
  try {
    const zip = await JSZip.loadAsync(file);

    // ─── Validate it's a Venting zip ──────────────────────────────
    const dbFile = zip.file("db.json");
    if (!dbFile) {
      return { ok: false, error: "that file didn't look like a Venting space." };
    }

    const dbRaw = await dbFile.async("text");
    const dbData: Record<string, LocalRow[]> = JSON.parse(dbRaw);

    // ─── Validate structure ───────────────────────────────────────
    const requiredStores = ["notes", "recordings", "diaryEntries", "vaultItems", "moodCheckins", "calendarEntries", "kv"];
    for (const name of requiredStores) {
      if (!Array.isArray(dbData[name])) {
        return { ok: false, error: "that file didn't look like a Venting space." };
      }
    }

    const spaceId = getActiveSpaceId();

    // ─── Remove ONLY the active space's rows (others stay untouched) ──
    for (const storeName of STORE_NAMES) {
      if (storeName === "kv") continue;
      const existing = await idbGetAll(storeName);
      for (const row of existing) {
        const owned = spaceId ? row.spaceId === spaceId : !row.spaceId;
        if (owned) await idbDelete(storeName as StoreName, row._id);
      }
    }

    // ─── Restore IndexedDB stores, restamped into the active space ──
    for (const storeName of STORE_NAMES) {
      if (storeName === "kv") continue;
      const rows = dbData[storeName] || [];
      for (const row of rows) {
        // Restamp (overwrite) so the backup always lands in THIS space and
        // never bleeds into the space it was originally made from.
        if (spaceId) row.spaceId = spaceId;
        await idbPut(storeName as StoreName, row);
      }
    }

    // ─── Restore kv — device/space metadata stays put in-place ───
    // savedSpaces (the device's space list), and — when a space is already
    // active — this device's identity/passcode, never get overwritten, so
    // restoring can't hijack the login list or morph one space into another.
    const PROTECTED_KV = new Set([
      "savedSpaces",
      "activeSpaceId",
      "settingsMigrated",
      "passcodeHash",
      "passcodeSalt",
      "userType",
      "userEmail",
      "userName",
    ]);
    const kvRows = (dbData.kv || []) as KVPair[];
    for (const row of kvRows) {
      if (row.key === "savedSpaces") continue;
      if (spaceId && PROTECTED_KV.has(row.key)) continue;
      await idbPut("kv", row);
    }

    // ─── Restore vault images from zip files ──────────────────────
    const vaultRows = dbData.vaultItems as VaultItem[] | undefined;
    if (vaultRows) {
      for (const item of vaultRows) {
        const zipImg = zip.file(`vault/${item._id}.png`);
        if (zipImg) {
          const blob = await zipImg.async("blob");
          const dataUrl = await blobToDataUrl(blob);
          item.art = dataUrl;
          await idbPut("vaultItems", item);
        }
      }
    }

    // ─── Restore diary photos from zip files ──────────────────────
    const diaryRows = dbData.diaryEntries as DiaryEntry[] | undefined;
    if (diaryRows) {
      for (const entry of diaryRows) {
        if (entry.photos) {
          for (let pi = 0; pi < entry.photos.length; pi++) {
            const zipImg = zip.file(`diary-photos/${entry._id}-${pi}.png`);
            if (zipImg) {
              const blob = await zipImg.async("blob");
              entry.photos[pi].src = await blobToDataUrl(blob);
            }
          }
          await idbPut("diaryEntries", entry);
        }
      }
    }

    // ─── Restore localStorage ─────────────────────────────────────
    const lsFile = zip.file("localStorage.json");
    if (lsFile) {
      const lsRaw = await lsFile.async("text");
      const lsData: Record<string, string> = JSON.parse(lsRaw);
      if (spaceId) {
        // In-place restore: remap EVERY incoming key into the active space.
        // 1. clear this space's current keys (other spaces keep theirs)
        const prefix = `venting:${spaceId}:`;
        const doomed: string[] = [];
        for (let i = 0; i < localStorage.length; i++) {
          const k = localStorage.key(i);
          if (k && k.startsWith(prefix)) doomed.push(k);
        }
        doomed.forEach((k) => localStorage.removeItem(k));
        // 2. write incoming keys under the active space's namespace
        for (const [k, v] of Object.entries(lsData)) {
          let bare: string | null = null;
          if (k.startsWith("venting:")) {
            const rest = k.slice("venting:".length);
            const sep = rest.indexOf(":");
            bare = sep >= 0 ? rest.slice(sep + 1) : null;
          } else if (k.startsWith("venting-")) {
            bare = k.slice("venting-".length);
          }
          if (!bare) continue;
          // canonicalize: strip a caller-side "venting-" prefix if present
          if (bare.startsWith("venting-")) bare = bare.slice("venting-".length);
          localStorage.setItem(prefix + bare, v);
        }
      } else {
        // No active space (fresh-device restore): write keys as-is — the
        // restored activeSpaceId kv row above makes them line up again.
        const keysToRemove: string[] = [];
        for (let i = 0; i < localStorage.length; i++) {
          const k = localStorage.key(i);
          if (k && k.startsWith("venting-")) keysToRemove.push(k);
        }
        keysToRemove.forEach((k) => localStorage.removeItem(k));
        for (const [k, v] of Object.entries(lsData)) {
          localStorage.setItem(k, v);
        }
      }
    }

    return { ok: true };
  } catch {
    return { ok: false, error: "that file didn't look like a Venting space." };
  }
}

/* ─── IndexedDB helpers ────────────────────────────────────────── */

const DB_NAME = "venting-local";
const DB_VERSION = 2;

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
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
}

async function idbGetAll(name: string): Promise<LocalRow[]> {
  try {
    const db = await openDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(name, "readonly");
      const req = tx.objectStore(name).getAll();
      req.onsuccess = () => resolve(req.result ?? []);
      req.onerror = () => reject(req.error);
    });
  } catch {
    return [];
  }
}

async function idbPut(name: StoreName, row: LocalRow): Promise<void> {
  try {
    const db = await openDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(name, "readwrite");
      tx.objectStore(name).put(row);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch {
    /* ignore */
  }
}

async function idbDelete(name: StoreName, id: string): Promise<void> {
  try {
    const db = await openDb();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(name, "readwrite");
      tx.objectStore(name).delete(id);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch {
    /* ignore */
  }
}

/* ─── Blob / DataURL conversion ────────────────────────────────── */

function dataUrlToBlob(dataUrl: string): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const parts = dataUrl.split(",");
    if (parts.length < 2) return reject(new Error("invalid data url"));
    const meta = parts[0];
    const raw = atob(parts[1]);
    const mime = meta.match(/data:(.*?);/)?.[1] || "image/png";
    const arr = new Uint8Array(raw.length);
    for (let i = 0; i < raw.length; i++) arr[i] = raw.charCodeAt(i);
    resolve(new Blob([arr], { type: mime }));
  });
}

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
}

function triggerDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
