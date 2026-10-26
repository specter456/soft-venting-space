import React from "react";
import { logError } from "@/lib/error-journal";
import { ChunkRetryCard } from "@/components/ChunkRetryCard";

/**
 * lazyWithRetry — chunk-load recovery for every lazy screen.
 *
 * 1. Import fails → retry up to `retries` times with a small linear backoff.
 * 2. Retries exhausted → ONE soft full page reload (sessionStorage guard
 *    prevents reload loops — at most one auto-reload per browser session).
 * 3. Already reloaded once and it still fails → resolve with a gentle retry
 *    card instead of rejecting (so there is no error boundary snag, no
 *    unhandled rejection, and no console error).
 *
 * While all of this runs, Suspense keeps showing the soft screen skeleton —
 * never a stuck overlay, because the reload path is imminent and the final
 * path resolves with a component.
 */

/** One auto-reload per browser session (sessionStorage survives reloads). */
const RELOAD_GUARD_KEY = "venting-chunk-reload";

/** Try the single soft reload for this session. Returns true if it fired. */
export function trySoftReload(): boolean {
  try {
    if (sessionStorage.getItem(RELOAD_GUARD_KEY) === "1") return false;
    sessionStorage.setItem(RELOAD_GUARD_KEY, "1");
  } catch {
    return false; // storage unavailable — never risk a reload loop
  }
  try {
    window.location.reload();
    return true;
  } catch {
    return false;
  }
}

/** Is this rejection/ error the "Failed to fetch dynamically imported module" class? */
export function isChunkLoadError(reason: unknown): boolean {
  const msg = String(
    (reason as { message?: string } | null)?.message ?? reason ?? "",
  );
  return /dynamically imported module|error loading dynamically imported module|importing the module script/i.test(
    msg,
  );
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- each call site keeps its own prop type at the JSX usage; the wrapper stays props-agnostic.
type AnyComponent = React.ComponentType<any>;
type LazyFactory = () => Promise<{ default: AnyComponent }>;

/** Screens warmed by `prefetchScreen` (name → true) — diagnostics/tests. */
const warmedScreens = new Set<string>();
/** Fallback starters when React.lazy internals aren't reachable. */
const starters = new WeakMap<object, () => void>();

/** Names of the lazy screens whose chunks were warmed ahead of first paint. */
export function warmedScreenNames(): string[] {
  return [...warmedScreens];
}

/**
 * prefetchScreen — warm a lazy screen DURING IDLE TIME so its first render
 * never suspends: the chunk downloads now, and React.lazy's payload is
 * resolved ahead of time, so switching to that screen is instant (no
 * Suspense fallback, no "warming up…" wait).
 *
 * Best-effort by design: warming never throws, and a screen that is already
 * loaded or already in flight is a no-op.
 */
export function prefetchScreen(
  component: unknown,
  name = "screen",
): void {
  warmedScreens.add(name);
  try {
    const c = component as { _init?: (payload: unknown) => unknown; _payload?: unknown };
    if (typeof c._init === "function" && c._payload) {
      // Runs React.lazy's initializer now: starts the import (memoised by
      // the factory below) and marks the payload resolved when it lands.
      // It throws the pending thenable while loading — expected, swallowed.
      c._init(c._payload);
    } else {
      starters.get(component as object)?.();
    }
  } catch {
    /* warming is best-effort — the normal lazy path stays intact */
  }
}

export function lazyWithRetry(
  importer: LazyFactory,
  retries = 3,
  delayMs = 300,
): React.LazyExoticComponent<AnyComponent> {
  const attempt = (
    remaining: number,
    delay: number,
  ): Promise<{ default: AnyComponent }> =>
    importer().catch((err: unknown) => {
      if (remaining <= 0) {
        // Retries exhausted → ONE soft reload; while it fires, keep the
        // soft skeleton visible (never resolve, never reject).
        if (trySoftReload()) return new Promise<never>(() => {});
        logError("lazy-chunk", err instanceof Error ? err : String(err));
        return { default: ChunkRetryCard };
      }
      console.info(
        `[venting] chunk retry (${retries - remaining + 1}/${retries})…`,
      );
      return new Promise<{ default: AnyComponent }>((resolve) =>
        setTimeout(resolve, delay),
      ).then(() => attempt(remaining - 1, delay + delayMs));
    });

  // Memoised loader: React.lazy's factory and prefetchScreen both hit this
  // one promise, so warming a screen and rendering a screen share the same chunk.
  let load: Promise<{ default: AnyComponent }> | null = null;
  const start = () => (load ??= attempt(retries, delayMs));

  const lazy = React.lazy(() => start());
  starters.set(lazy, start);
  return lazy;
}
