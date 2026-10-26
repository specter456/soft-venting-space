import { quarantineKey } from "@/lib/error-journal";
import { scopedGetItem, scopedRemoveItem, scopedSetItem } from "@/lib/safe-storage";

/** Set by Photo Doodle on save; the wall consumes and clears it. */
export const PENDING_PIN_KEY = "venting-pending-wall-pin";

export interface PendingPin {
  vaultId: string;
  art: string;
}

/** Call after saving a photo/doodle anywhere: arms the next wall visit to pin it. */
export function armPendingPin(vaultId: string, art: string): void {
  scopedSetItem(PENDING_PIN_KEY, JSON.stringify({ vaultId, art } satisfies PendingPin));
}

/** Read + clear a pending pin (one-shot). */
export function consumePendingPin(): PendingPin | null {
  try {
    const raw = scopedGetItem(PENDING_PIN_KEY);
    if (!raw) return null;
    scopedRemoveItem(PENDING_PIN_KEY);
    const p = JSON.parse(raw) as PendingPin;
    return p && typeof p.art === "string" ? p : null;
  } catch {
    quarantineKey(PENDING_PIN_KEY);
    return null;
  }
}
