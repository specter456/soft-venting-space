import React from "react";

export type LockPhase = "boot" | "setup" | "unlock" | "open";

export interface LockApi {
  phase: LockPhase;
  /** Lock the app immediately (passcode must exist). */
  lockApp: () => void;
  /** Open the passcode-setup gate (no passcode yet). */
  openSetup: () => void;
  /** Call after a successful unlock or setup. */
  unlock: () => void;
}

export const LockContext = React.createContext<LockApi>({
  phase: "boot",
  lockApp: () => undefined,
  openSetup: () => undefined,
  unlock: () => undefined,
});

export function useLock(): LockApi {
  return React.useContext(LockContext);
}
