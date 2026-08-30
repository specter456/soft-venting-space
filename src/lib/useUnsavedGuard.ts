/**
 * useUnsavedGuard — global unsaved-work guard.
 *
 * The Dashboard header has the back button for all child routes. This module
 * lets any child screen mark itself as "dirty" (unsaved changes). When the
 * user taps back (browser or header), Dashboard shows the guard dialog.
 *
 * Usage in a creation screen:
 *   import { useSetDirty } from "@/lib/useUnsavedGuard";
 *   const setDirty = useSetDirty();
 *   useEffect(() => { setDirty(hasChanges); }, [hasChanges, setDirty]);
 *
 * Usage in Dashboard:
 *   import { useUnsavedGuard } from "@/lib/useUnsavedGuard";
 *   const { showGuard, handleSave, handleLeave, handleBack } = useUnsavedGuard(onBack);
 */

import { useCallback, useEffect, useRef, useState } from "react";

/* ─── Global dirty flag (module-level) ───────────────────────────── */

let _isDirty = false;
const _dirtyListeners = new Set<() => void>();

function notifyDirty(): void { for (const l of _dirtyListeners) l(); }

/** Called by creation screens to mark themselves dirty or clean. */
export function setGlobalDirty(dirty: boolean): void {
  if (_isDirty === dirty) return;
  _isDirty = dirty;
  notifyDirty();
}

export function isGlobalDirty(): boolean { return _isDirty; }

/* ─── Hook for creation screens ──────────────────────────────────── */

/** Simple hook: returns a setter to mark the screen dirty/clean. */
export function useSetDirty(): (dirty: boolean) => void {
  useEffect(() => {
    return () => setGlobalDirty(false); // clean up on unmount
  }, []);
  return setGlobalDirty;
}

/* ─── Hook for Dashboard ─────────────────────────────────────────── */

/**
 * Used in Dashboard. Intercepts back navigation when dirty.
 * Returns dialog state + handlers.
 */
export function useUnsavedGuard(onBack: () => void) {
  const [showGuard, setShowGuard] = useState(false);
  const [dirty, setDirty] = useState(() => _isDirty);
  const onBackRef = useRef(onBack);
  useEffect(() => { onBackRef.current = onBack; });

  // Subscribe to global dirty changes
  useEffect(() => {
    const listener = () => setDirty(_isDirty);
    _dirtyListeners.add(listener);
    return () => { _dirtyListeners.delete(listener); };
  }, []);

  // Intercept browser back when dirty
  useEffect(() => {
    if (!dirty) return;
    const handlePopState = () => { setShowGuard(true); };
    window.addEventListener("popstate", handlePopState);
    return () => { window.removeEventListener("popstate", handlePopState); };
  }, [dirty]);

  const handleSave = useCallback(() => {
    setShowGuard(false);
    setGlobalDirty(false);
    onBackRef.current();
  }, []);

  const handleLeave = useCallback(() => {
    setShowGuard(false);
    setGlobalDirty(false);
    onBackRef.current();
  }, []);

  const handleBack = useCallback(() => {
    if (isGlobalDirty()) {
      setShowGuard(true);
    } else {
      onBackRef.current();
    }
  }, []);

  const clearDirty = useCallback(() => {
    setGlobalDirty(false);
    setShowGuard(false);
  }, []);

  return { dirty, showGuard, handleSave, handleLeave, handleBack, clearDirty };
}
