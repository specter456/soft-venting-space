import React from "react";
import { FriendlyCrashFallback } from "@/components/Friendly";

interface Props {
  children: React.ReactNode;
  onContinue?: () => void;
  resetKey?: unknown;
}

interface State {
  hasError: boolean;
}

let lastGlobalErrorAt = 0;

/**
 * Friendly error boundary. Never a blank screen, never raw technical text:
 * the fallback explains that data is safe, offers "Try again" (remount) and
 * "Continue offline" (return to the landing page).
 */
export class AppErrorBoundary extends React.Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error) {
    console.error("[venting] caught error:", error?.message ?? error);
  }

  componentDidUpdate(prevProps: Props) {
    // When the parent re-mounts children with a new key, clear the error.
    if (prevProps.resetKey !== this.props.resetKey && this.state.hasError) {
      this.setState({ hasError: false });
    }
  }

  private retry = () => {
    this.setState({ hasError: false });
  };

  render() {
    if (this.state.hasError) {
      return (
        <FriendlyCrashFallback onRetry={this.retry} onContinue={this.props.onContinue} />
      );
    }
    return this.props.children;
  }
}

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
    // Lazy import keeps the main bundle light.
    import("@/components/Friendly").then(({ showFriendlyErrorToast }) =>
      showFriendlyErrorToast(),
    );
  };

  const onError = (event: ErrorEvent) => {
    console.error("[venting] uncaught error:", event.error ?? event.message);
    report();
  };
  const onRejection = (event: PromiseRejectionEvent) => {
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
