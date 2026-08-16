import { useCallback, useRef } from "react";

/**
 * Press-lock: one tap fires one action. Held presses, double-taps and fast
 * repeat clicks within `delay` ms are ignored, so a single press can never
 * toggle several options or fire a button many times.
 */
export function useTapGuard<T extends (...args: never[]) => unknown>(
  handler: T,
  delay = 350,
): (...args: Parameters<T>) => void {
  const last = useRef(0);

  return useCallback(
    (...args: Parameters<T>) => {
      const now = Date.now();
      if (now - last.current < delay) return;
      last.current = now;
      handler(...args);
    },
    // `handler` is recreated every render by callers, so the guard always
    // calls the freshest version — no ref mutation during render needed.
    [handler, delay],
  );
}

/** Fire-and-forget version for handlers that return promises. */
export function useAsyncTapGuard<T extends (...args: never[]) => Promise<unknown>>(
  handler: T,
  delay = 350,
): (...args: Parameters<T>) => void {
  const busy = useRef(false);
  const last = useRef(0);

  return useCallback(
    (...args: Parameters<T>) => {
      if (busy.current) return;
      const now = Date.now();
      if (now - last.current < delay) return;
      last.current = now;
      busy.current = true;
      Promise.resolve()
        .then(() => handler(...args))
        .catch(() => {
          /* errors are surfaced by the caller's own error handling */
        })
        .finally(() => {
          busy.current = false;
        });
    },
    [handler, delay],
  );
}
