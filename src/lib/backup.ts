import JSZip from "jszip";
import {
  STORE_NAMES,
  type StoreName,
  type LocalRow,
  type VaultItem,
  type DiaryEntry,
} from "@/lib/db";

/**
 * Bundle ALL local Venting data into a zip file and trigger a download.
 * Includes: IndexedDB stores + localStorage keys.
 */
export async function downloadBackup(): Promise<void> {
  const zip = new JSZip();

  // ─── 1. IndexedDB stores ────────────────────────────────────────
  const dbData: Record<string, LocalRow[]> = {};
  for (const storeName of STORE_NAMES) {
    const rows = await idbGetAll(storeName);
    dbData[storeName] = rows;
  }
  zip.file("db.json", JSON.stringify(dbData, null, 2));

  // ─── 2. localStorage keys ───────────────────────────────────────
  const lsData: Record<string, string> = {};
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && key.startsWith("venting-")) {
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
 * Restore from a Venting backup zip. Replaces all local data.
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

    // ─── Wipe existing data first ─────────────────────────────────
    await wipeAllIDB();

    // ─── Restore IndexedDB stores ─────────────────────────────────
    for (const storeName of STORE_NAMES) {
      const rows = dbData[storeName] || [];
      for (const row of rows) {
        await idbPut(storeName as StoreName, row);
      }
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
      // Clear existing venting keys first
      const keysToRemove: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k && k.startsWith("venting-")) keysToRemove.push(k);
      }
      keysToRemove.forEach((k) => localStorage.removeItem(k));
      // Write restored keys
      for (const [k, v] of Object.entries(lsData)) {
        localStorage.setItem(k, v);
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

async function wipeAllIDB(): Promise<void> {
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
