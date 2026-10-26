import { showFriendlyErrorToast } from "@/lib/friendly";
import { logError } from "@/lib/error-journal";
import { isChunkLoadError, trySoftReload } from "@/lib/lazyWithRetry";

let lastGlobalErrorAt = 0;

/**
 * Global safety net: uncaught errors and unhandled rejections outside React
 * show a friendly toast instead of silently leaving the app broken. Fires at
 * most once every 5 seconds to avoid toast storms.
 */
export function installGlobalErrorHandlers(): () => void {
  const report = () => {
    const now = Date.now();
    if (now - lastGlobalErrorAt < 5000) return;
    lastGlobalErrorAt = now;
    showFriendlyErrorToast();
  };

  const onError = (event: ErrorEvent) => {
    console.error("[venting] uncaught error:", event.error ?? event.message);
    report();
  };
  const onRejection = (event: PromiseRejectionEvent) => {
    // Lazy-chunk failures self-heal: ONE soft reload per session (guarded
    // against loops). Keep the console clean — we handle it, no snag card.
    if (isChunkLoadError(event.reason)) {
      event.preventDefault();
      if (trySoftReload()) return;
      logError("lazy-chunk-global", String(event.reason?.message ?? event.reason));
      report();
      return;
    }
    console.error("[venting] unhandled rejection:", event.reason);
    report();
  };

  window.addEventListener("error", onError);
  window.addEventListener("unhandledrejection", onRejection);
  return () => {
    window.removeEventListener("error", onError);
    window.removeEventListener("unhandledrejection", onRejection);
  };
}
