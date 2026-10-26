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

// Props-agnostic wrapper: C is the exact component type each call site
// imports, so its concrete props flow through to the JSX usage untouched.
// The `ComponentType<never>` constraint accepts every component (props are
// contravariant: `never` is assignable to any props type) — no `any` needed.
type Loader<C> = () => Promise<{ default: C }>;

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

export function lazyWithRetry<C extends React.ComponentType<never>>(
  importer: Loader<C>,
  retries = 3,
  delayMs = 300,
): C {
  const attempt = (
    remaining: number,
    delay: number,
  ): Promise<{ default: C }> =>
    importer().catch((err: unknown) => {
      if (remaining <= 0) {
        // Retries exhausted → ONE soft reload; while it fires, keep the
        // soft skeleton visible (never resolve, never reject).
        if (trySoftReload()) return new Promise<never>(() => {});
        logError("lazy-chunk", err instanceof Error ? err : String(err));
        // The retry card renders no props, so it is safe for any screen.
        return { default: ChunkRetryCard as unknown as C };
      }
      console.info(
        `[venting] chunk retry (${retries - remaining + 1}/${retries})…`,
      );
      return new Promise<{ default: C }>((resolve) =>
        setTimeout(resolve, delay),
      ).then(() => attempt(remaining - 1, delay + delayMs));
    });

  // Memoised loader: React.lazy's factory and prefetchScreen both hit this
  // one promise, so warming a screen and rendering a screen share the same chunk.
  let load: Promise<{ default: C }> | null = null;
  const start = () => (load ??= attempt(retries, delayMs));

  // React.lazy's public signature is written against `ComponentType<any>`
  // internally; C is always a real component type, so this single bridge
  // at the React boundary is the only cast the wrapper needs.
  const lazy = React.lazy(
    () =>
      start() as unknown as Promise<{
        default: React.ComponentType<Record<string, unknown>>;
      }>,
  ) as unknown as C;
  starters.set(lazy, start);
  return lazy;
}
