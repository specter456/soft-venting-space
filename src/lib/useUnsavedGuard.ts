/**
 * useUnsavedGuard — global unsaved-work guard for EVERY creation/edit screen.
 *
 * A screen registers itself with:
 *   const dirty = …;                       // any change since opening / last save
 *   useUnsavedWork({ dirty, onSave, onDiscard });
 *     - onSave     — what "yes, save it 💜" runs (persist immediately)
 *     - onDiscard  — what "no, don't save" runs (revert auto-persisted changes)
 *
 * Dashboard uses useUnsavedGuard(onBack):
 *   - header back / taskbar taps / real browser back while dirty → the soft
 *     yes/no dialog;  not dirty → leave immediately, no dialog.
 *   - "yes, save it 💜"   → runs the screen's save, leaves, toasts "saved 💜"
 *     (if the save itself already navigated, we don't navigate again).
 *   - "no, don't save"    → runs the screen's discard, then leaves.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { useLocation } from "react-router";

/* ─── Global dirty flag (module-level) ───────────────────────────── */

let _isDirty = false;
const _dirtyListeners = new Set<() => void>();

function notifyDirty(): void { for (const l of _dirtyListeners) l(); }

/** Mark the active screen dirty or clean. */
export function setGlobalDirty(dirty: boolean): void {
  if (_isDirty === dirty) return;
  _isDirty = dirty;
  notifyDirty();
}

export function isGlobalDirty(): boolean { return _isDirty; }

/* ─── Save / discard actions of the dirty screen ─────────────────── */

/**
 * A save action returns `true`/`void` on success or `false` when nothing
 * could be saved — `false` suppresses the "saved 💜" toast (the dialog
 * still leaves, because the user asked to).
 */
export type UnsavedSaveAction = () => boolean | void | Promise<boolean | void>;

let _saveAction: UnsavedSaveAction | null = null;
let _discardAction: (() => void) | null = null;

function registerUnsavedActions(
  save: UnsavedSaveAction | null,
  discard: (() => void) | null,
): void {
  _saveAction = save;
  _discardAction = discard;
}

function getUnsavedActions(): { save: UnsavedSaveAction | null; discard: (() => void) | null } {
  return { save: _saveAction, discard: _discardAction };
}

/* ─── Hook for creation/edit screens ─────────────────────────────── */

export function useUnsavedWork({
  dirty,
  onSave,
  onDiscard,
}: {
  /** Any change made since opening or since the last save. */
  dirty: boolean;
  /** What "yes, save it 💜" runs. */
  onSave?: UnsavedSaveAction;
  /** What "no, don't save" runs — only needed for auto-persisting screens. */
  onDiscard?: () => void;
}): void {
  const saveRef = useRef(onSave);
  const discardRef = useRef(onDiscard);
  useEffect(() => {
    saveRef.current = onSave;
    discardRef.current = onDiscard;
  });

  useEffect(() => {
    setGlobalDirty(dirty);
  }, [dirty]);

  useEffect(() => {
    registerUnsavedActions(
      () => (saveRef.current ? saveRef.current() : false),
      () => { discardRef.current?.(); },
    );
    return () => {
      // Leaving the screen clears the guard — nothing dirty off-screen.
      registerUnsavedActions(null, null);
      setGlobalDirty(false);
    };
  }, []);
}

/* ─── Hook for Dashboard ─────────────────────────────────────────── */

/**
 * Intercepts back navigation (header arrow, taskbar, real browser back)
 * while dirty. Returns dialog state + handlers.
 */
export function useUnsavedGuard(onBack: () => void) {
  const [showGuard, setShowGuard] = useState(false);
  const [dirty, setDirty] = useState(() => _isDirty);
  const onBackRef = useRef(onBack);
  useEffect(() => { onBackRef.current = onBack; });
  const pendingRef = useRef<(() => void) | null>(null);

  // Where we are now — used to restore the location when a real browser-back
  // is intercepted. Synced inside an effect: refs must not be written during
  // render.
  const location = useLocation();
  const hereUrlRef = useRef(location.pathname + location.search + location.hash);
  useEffect(() => {
    hereUrlRef.current = location.pathname + location.search + location.hash;
  }, [location]);

  // Subscribe to global dirty changes. The dialog may only exist while
  // something is actually dirty: the moment the screen clears (its own save,
  // or an unmount after a browser back we didn't intercept), any open dialog
  // quietly closes.
  useEffect(() => {
    const listener = () => {
      setDirty(_isDirty);
      if (!_isDirty) setShowGuard(false);
    };
    _dirtyListeners.add(listener);
    return () => { _dirtyListeners.delete(listener); };
  }, []);

  // Intercept a REAL browser back while dirty: undo the navigation so the
  // screen stays mounted (its save action is still alive), then ask.
  // Synthetic popstate events (tests driving history) are not intercepted.
  useEffect(() => {
    if (!dirty) return;
    let restoring = false;
    const handlePopState = (e: PopStateEvent) => {
      if (e.isTrusted && !restoring) {
        restoring = true;
        try {
          window.history.pushState(window.history.state ?? {}, "", hereUrlRef.current);
          window.dispatchEvent(new PopStateEvent("popstate"));
        } finally {
          restoring = false;
        }
      }
      pendingRef.current = null;
      setShowGuard(true);
    };
    window.addEventListener("popstate", handlePopState);
    return () => { window.removeEventListener("popstate", handlePopState); };
  }, [dirty]);

  const finish = useCallback(async (save: boolean) => {
    const action = pendingRef.current ?? onBackRef.current;
    pendingRef.current = null;
    setShowGuard(false);
    setGlobalDirty(false);

    const { save: saveAction, discard: discardAction } = getUnsavedActions();

    if (!save) {
      // "no, don't save" → discard, then leave.
      try { discardAction?.(); } catch { /* leave softly */ }
      action();
      return;
    }

    // "yes, save it 💜" → save, then leave, then a tiny "saved 💜" toast.
    // Read window.location directly: history.pushState updates it
    // synchronously, so there is no effect-timing race.
    const urlBefore = window.location.pathname + window.location.search + window.location.hash;
    let saved = false;
    try {
      saved = (await (saveAction?.() ?? false)) !== false;
    } catch {
      saved = false;
    }
    // If saving already navigated somewhere, don't move a second time.
    const urlNow = window.location.pathname + window.location.search + window.location.hash;
    if (urlNow === urlBefore) action();
    if (saved) {
      try {
        const { toast } = await import("sonner");
        toast("saved 💜");
      } catch { /* toast is a nicety, never a failure */ }
    }
  }, []);

  const handleSave = useCallback(() => { void finish(true); }, [finish]);
  const handleLeave = useCallback(() => { void finish(false); }, [finish]);

  const handleBack = useCallback(() => {
    pendingRef.current = null;
    if (isGlobalDirty()) {
      setShowGuard(true);
    } else {
      onBackRef.current();
    }
  }, []);

  /** Leave toward `action` (e.g. a taskbar tap) — asks first when dirty. */
  const requestLeave = useCallback((action: () => void) => {
    if (isGlobalDirty()) {
      pendingRef.current = action;
      setShowGuard(true);
    } else {
      action();
    }
  }, []);

  const clearDirty = useCallback(() => {
    pendingRef.current = null;
    setGlobalDirty(false);
    setShowGuard(false);
  }, []);

  return { dirty, showGuard, handleSave, handleLeave, handleBack, requestLeave, clearDirty };
}
