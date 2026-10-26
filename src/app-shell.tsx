/**
 * App shell pieces — the route wrappers and chrome that used to live in
 * main.tsx. Kept in their own module so main.tsx is a pure entry file and
 * every file in the app exports only components (fast-refresh friendly).
 */

import React, { Suspense, useEffect } from "react";
import { useLocation } from "react-router";
import { AppErrorBoundary, ScreenBoundary } from "@/components/AppErrorBoundary";
import { OfflineNotice } from "@/components/Friendly";

/**
 * Soft screen skeleton — shown only if a chunk is still in flight (first
 * visit with no warm-up). It mirrors the shape of a screen and swaps out
 * seamlessly the moment the real screen resolves — never a full-screen
 * "warming up…" heart.
 */
export function ScreenSkeleton() {
  return (
    <div
      aria-hidden
      className="min-h-[55dvh] w-full animate-pulse space-y-4 pt-4 motion-reduce:animate-none"
    >
      <div className="h-4 w-28 rounded-full bg-[var(--theme-accent-light, #D9DEF4)]" />
      <div className="h-40 w-full rounded-[1.6rem] bg-white/70" />
      <div className="grid grid-cols-2 gap-3">
        <div className="h-24 rounded-3xl bg-white/70" />
        <div className="h-24 rounded-3xl bg-white/70" />
        <div className="h-24 rounded-3xl bg-white/70" />
        <div className="h-24 rounded-3xl bg-white/70" />
      </div>
    </div>
  );
}

/** Wrap lazy components in Suspense */
export function Lazy({ children }: { children: React.ReactNode }) {
  return <Suspense fallback={<ScreenSkeleton />}>{children}</Suspense>;
}

/** Inline splash loader for top-level lazy routes — shows instantly */
export function SplashLoader() {
  return (
    <div className="fixed inset-0 z-[200] flex flex-col items-center justify-center bg-[#EDEBF6]">
      <div className="text-5xl animate-floaty-slow">💜</div>
      <p className="mt-4 text-sm font-semibold text-ink-soft">warming up…</p>
    </div>
  );
}

/** Guard so runtime errors never leave the app as a blank page. */
export class ToolbarErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean }
> {
  state = { hasError: false };
  static getDerivedStateFromError() {
    return { hasError: true };
  }
  componentDidCatch(err: Error) {
    console.warn("[VlyToolbar] Caught error, toolbar disabled:", err.message);
  }
  render() {
    return this.state.hasError ? null : this.props.children;
  }
}

/** Per-route boundary so one broken screen never blanks the whole app. */
export function RouteShell({ children }: { children: React.ReactNode }) {
  return (
    <AppErrorBoundary onContinue={() => (window.location.href = "/")}>
      {children}
    </AppErrorBoundary>
  );
}

/** Inner-screen boundary: shell survives; auto-resets on navigation. */
export function InnerRoute({ children }: { children: React.ReactNode }) {
  return (
    <Lazy>
      <ScreenBoundary>{children}</ScreenBoundary>
    </Lazy>
  );
}

export function RouteSyncer() {
  const location = useLocation();
  useEffect(() => {
    window.parent.postMessage(
      { type: "iframe-route-change", path: location.pathname },
      "*",
    );
  }, [location.pathname]);

  useEffect(() => {
    function handleMessage(event: MessageEvent) {
      if (event.data?.type === "navigate") {
        if (event.data.direction === "back") window.history.back();
        if (event.data.direction === "forward") window.history.forward();
      }
    }
    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, []);

  return null;
}

/** Gentle offline notice pinned to the top of the app — never blocking. */
export function GlobalNotice() {
  return (
    <div className="pointer-events-none fixed inset-x-0 top-2 z-[60] flex justify-center px-4">
      <OfflineNotice />
    </div>
  );
}
