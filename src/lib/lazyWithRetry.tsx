import React from "react";
import { logError } from "@/lib/error-journal";

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
 * While all of this runs, Suspense keeps showing the soft "warming up…"
 * loader — never a stuck overlay, because the reload path is imminent and
 * the final path resolves with a component.
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

/** Gentle retry card shown only after a reload already failed to fix it. */
function ChunkRetryCard(): React.ReactElement {
  return (
    <div className="clay-card mx-auto w-full max-w-sm px-6 py-8 text-center">
      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-lavender-100 text-2xl">
        💜
      </div>
      <h2 className="mt-3 text-lg font-bold tracking-tight text-ink-deep">
        this screen didn&apos;t finish loading.
      </h2>
      <p className="mt-2 text-sm leading-relaxed text-ink-soft">
        Don&apos;t worry — your feelings are all still safe on this device.
        Give it one more gentle try.
      </p>
      <button
        type="button"
        onClick={() => window.location.reload()}
        className="clay-btn mt-5 px-5 py-2.5 text-sm font-bold text-ink-deep"
      >
        try again
      </button>
    </div>
  );
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- each call site keeps its own prop type at the JSX usage; the wrapper stays props-agnostic.
type AnyComponent = React.ComponentType<any>;
type LazyFactory = () => Promise<{ default: AnyComponent }>;

export function lazyWithRetry(
  importer: LazyFactory,
  retries = 3,
  delayMs = 300,
): React.LazyExoticComponent<AnyComponent> {
  return React.lazy(() => {
    const attempt = (
      remaining: number,
      delay: number,
    ): Promise<{ default: AnyComponent }> =>
      importer().catch((err: unknown) => {
        if (remaining <= 0) {
          // Retries exhausted → ONE soft reload; while it fires, keep the
          // soft "warming up…" loader visible (never resolve, never reject).
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
    return attempt(retries, delayMs);
  });
}
