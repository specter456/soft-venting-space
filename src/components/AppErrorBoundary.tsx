import React from "react";
import { useLocation, useNavigate } from "react-router";
import { FriendlyCrashFallback } from "@/components/Friendly";
import { logError, reportCode, copyReport, shareReport, APP_VERSION } from "@/lib/error-journal";

interface Props {
  children: React.ReactNode;
  onContinue?: () => void;
  resetKey?: unknown;
  /** Compact in-shell fallback (for inner dashboard screens) instead of full-screen. */
  compact?: boolean;
}

interface State {
  hasError: boolean;
  /** Number of automatic recovery attempts made (max 3). */
  recoveryAttempts: number;
  /** The captured error for the report code. */
  capturedError: Error | null;
}

let lastGlobalErrorAt = 0;

/**
 * Friendly error boundary with auto-recovery.
 * Recovery flow:
 *   1) Retry rendering once (setState hasError=false)
 *   2) If it fails again, clear cached UI state and retry
 *   3) If it fails again, soft-reload once
 *   4) Only then show the snag card
 */
export class AppErrorBoundary extends React.Component<Props, State> {
  state: State = { hasError: false, recoveryAttempts: 0, capturedError: null };

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, capturedError: error };
  }

  componentDidCatch(error: Error) {
    console.error("[venting] caught error:", error?.message ?? error);
    // Log to journal (never stores user content)
    logError(
      this.props.compact ? "screen" : "app",
      error,
    );
    // Auto-recovery: attempt up to 3 times before showing the card
    this.attemptRecovery(error);
  }

  private attemptRecovery = (error: Error) => {
    const attempt = this.state.recoveryAttempts + 1;
    this.setState({ recoveryAttempts: attempt });

    if (attempt === 1) {
      // Attempt 1: retry rendering once
      console.info("[venting] recovery attempt 1: retry render");
      setTimeout(() => this.setState({ hasError: false }), 100);
    } else if (attempt === 2) {
      // Attempt 2: clear this screen's cached UI state and retry
      console.info("[venting] recovery attempt 2: clear cache + retry");
      try {
        // Clear any sessionStorage keys that might be corrupt
        const keys: string[] = [];
        for (let i = 0; i < sessionStorage.length; i++) {
          const k = sessionStorage.key(i);
          if (k && k.startsWith("venting-")) keys.push(k);
        }
        keys.forEach((k) => sessionStorage.removeItem(k));
      } catch { /* ignore */ }
      setTimeout(() => this.setState({ hasError: false }), 200);
    } else if (attempt === 3) {
      // Attempt 3: soft-reload once
      console.info("[venting] recovery attempt 3: soft reload");
      try {
        window.location.reload();
      } catch { /* ignore */ }
    }
    // If attempt >= 4, componentDidCatch won't fire again (error boundary
    // is already showing), so the card stays visible.
  };

  componentDidUpdate(prevProps: Props) {
    // When the parent re-mounts children with a new key, clear the error.
    if (prevProps.resetKey !== this.props.resetKey && this.state.hasError) {
      this.setState({ hasError: false, recoveryAttempts: 0, capturedError: null });
    }
  }

  private retry = () => {
    this.setState({ hasError: false, recoveryAttempts: 0, capturedError: null });
  };

  private handleCopy = async () => {
    await copyReport();
  };

  private handleShare = async () => {
    await shareReport();
  };

  render() {
    if (this.state.hasError && this.state.recoveryAttempts >= 3) {
      const code = this.state.capturedError
        ? reportCode(this.state.capturedError.message + (this.props.compact ? "screen" : "app"))
        : "0000";

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
              Don't worry — your feelings are all still safe on this device.
            </p>
            <p className="mt-2 text-[11px] font-mono font-semibold text-lavender-600">
              snag #{code}
            </p>
            <p className="mt-1 text-[11px] text-ink-soft">
              if this keeps happening, tell them this code: {code}
            </p>
            <div className="mt-5 flex flex-col gap-2">
              <button
                type="button"
                onClick={this.retry}
                className="clay-btn px-5 py-2.5 text-sm font-bold text-ink-deep"
              >
                try again
              </button>
              <button
                type="button"
                onClick={this.handleCopy}
                className="rounded-full px-5 py-2 text-xs font-bold text-ink-soft transition-colors hover:bg-lavender-100/70 hover:text-ink-deep"
              >
                copy report
              </button>
              <button
                type="button"
                onClick={this.handleShare}
                className="rounded-full px-5 py-2 text-xs font-bold text-ink-soft transition-colors hover:bg-lavender-100/70 hover:text-ink-deep"
              >
                share report
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
        <FriendlyCrashFallback
          onRetry={this.retry}
          onContinue={this.props.onContinue}
          title="something went softly wrong."
          code={code}
          onCopy={this.handleCopy}
          onShare={this.handleShare}
        />
      );
    }
    // Either no error, or recovery is still in progress (spinner)
    if (this.state.hasError) {
      // Show a soft loading state while auto-recovery runs
      return (
        <div className="flex min-h-[40dvh] items-center justify-center">
          <div className="text-center">
            <div className="text-2xl animate-floaty-slow">💜</div>
            <p className="mt-2 text-sm font-semibold text-ink-soft">let me warm up again…</p>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

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
