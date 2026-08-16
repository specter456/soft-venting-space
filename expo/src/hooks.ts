import React from "react";

/**
 * Press-lock: one tap fires one action. A second press within `delay` ms is
 * ignored, so double-taps and held presses can never fire a button twice or
 * toggle several options at once. Each call gets its own guard, so tapping
 * one item never affects another.
 */
export function usePressGuard(
  onPress?: () => void,
  delay = 300,
): (() => void) | undefined {
  const last = React.useRef(0);
  const handlerRef = React.useRef(onPress);
  handlerRef.current = onPress;

  return React.useCallback(
    () => {
      const handler = handlerRef.current;
      if (!handler) return;
      const now = Date.now();
      if (now - last.current < delay) return;
      last.current = now;
      handler();
    },
    [delay],
  );
}

/**
 * Press-lock for handlers that need to await an async action (saves,
 * navigation, recordings). Fires the handler at most once per `delay` window
 * and never blocks the UI thread.
 */
export function useAsyncPressGuard(
  onPress?: () => void | Promise<void>,
  delay = 300,
): (() => void) | undefined {
  const busy = React.useRef(false);
  const last = React.useRef(0);
  const handlerRef = React.useRef(onPress);
  handlerRef.current = onPress;

  return React.useCallback(
    () => {
      const handler = handlerRef.current;
      if (!handler || busy.current) return;
      const now = Date.now();
      if (now - last.current < delay) return;
      last.current = now;
      busy.current = true;
      Promise.resolve(handler())
        .catch(() => {
          /* errors are surfaced by the caller's own error handling */
        })
        .finally(() => {
          busy.current = false;
        });
    },
    [delay],
  );
}
