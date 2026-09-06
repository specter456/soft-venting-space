import React from "react";
import { useLocation, useNavigate } from "react-router";
import { FriendlyCrashFallback } from "@/components/Friendly";

interface Props {
  children: React.ReactNode;
  onContinue?: () => void;
  resetKey?: unknown;
  /** Compact in-shell fallback (for inner dashboard screens) instead of full-screen. */
  compact?: boolean;
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
      if (this.props.compact) {
        // In-shell fallback: gentle card, shell (header/taskbar) stays alive.
        return (
          <div className="clay-card mx-auto w-full max-w-sm px-6 py-8 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-lavender-100 text-2xl">
              💜
            </div>
            <h2 className="mt-3 text-lg font-bold tracking-tight text-ink-deep">
              this screen hit a soft snag.
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-ink-soft">
              {friendlyText}
            </p>
            <div className="mt-5 flex flex-col gap-2">
              <button
                type="button"
                onClick={this.retry}
                className="clay-btn px-5 py-2.5 text-sm font-bold text-ink-deep"
              >
                try again
              </button>
              {this.props.onContinue ? (
                <button
                  type="button"
                  onClick={this.props.onContinue}
                  className="rounded-full px-5 py-2 text-xs font-bold text-ink-soft transition-colors hover:bg-lavender-100/70 hover:text-ink-deep"
                >
                  back to home
                </button>
              ) : null}
            </div>
          </div>
        );
      }
      return (
        <FriendlyCrashFallback onRetry={this.retry} onContinue={this.props.onContinue} />
      );
    }
    return this.props.children;
  }
}

const friendlyText =
  "Don't worry — your feelings are all still safe on this device. Try again, and if it keeps happening, we're here for you.";

/**
 * Boundary around inner dashboard screens (the <Outlet /> content).
 * If one screen crashes, the shell — header, taskbar, music widget — stays
 * alive, and the boundary auto-resets when the user navigates elsewhere.
 */
export function ScreenBoundary({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const navigate = useNavigate();
  return (
    <AppErrorBoundary
      compact
      resetKey={location.pathname}
      onContinue={() => navigate("/dashboard", { replace: true })}
    >
      {children}
    </AppErrorBoundary>
  );
}

/**
 * Quiet boundary for decorative/utility widgets (particles, toasts, floating
 * buttons). If the widget crashes it is silently unmounted — the rest of the
 * shell keeps working, and no fallback UI appears for something optional.
 */
export class QuietBoundary extends React.Component<{ children: React.ReactNode; name?: string }, { hasError: boolean }> {
  state = { hasError: false };
  static getDerivedStateFromError() { return { hasError: true }; }
  componentDidCatch(error: Error) {
    console.warn(`[venting] ${this.props.name ?? "widget"} crashed — hidden quietly:`, error?.message ?? error);
  }
  render() {
    return this.state.hasError ? null : this.props.children;
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
