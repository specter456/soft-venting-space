import '@vly-ai/integrations';
import { Toaster } from "@/components/ui/sonner";
import { VlyToolbar } from "../vly-toolbar-readonly.tsx";
import { AppErrorBoundary, ScreenBoundary, installGlobalErrorHandlers } from "@/components/AppErrorBoundary";
import { OfflineNotice } from "@/components/Friendly";
import { hydrate } from "@/lib/db";
import React, { Suspense } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, Route, Routes, useLocation } from "react-router";
import { ThemeProvider } from "@/lib/themes";
import "./index.css";

// Public routes — lazy-loaded so the initial bundle stays tiny
const Landing = React.lazy(() => import("./pages/Landing"));
const LoginEntry = React.lazy(() => import("./pages/LoginEntry"));
const NotFound = React.lazy(() => import("./pages/NotFound"));

// Dashboard shell — eagerly imported (has render-time setState, cannot be lazy)
import Dashboard from "./pages/Dashboard";

// Dashboard screens — lazy-loaded for smaller initial bundle
const HomeScreen = React.lazy(() => import("./pages/app/HomeScreen"));
const RecordScreen = React.lazy(() => import("./pages/app/RecordScreen"));
const NotesScreen = React.lazy(() => import("./pages/app/NotesScreen"));
const NoteEditor = React.lazy(() => import("./pages/app/NoteEditor"));
const CreateScreen = React.lazy(() => import("./pages/app/CreateScreen"));
const VaultScreen = React.lazy(() => import("./pages/app/VaultScreen"));
const ScribbleScreen = React.lazy(() => import("./pages/app/ScribbleScreen"));
const StickerStudio = React.lazy(() => import("./pages/app/StickerStudio"));
const GifStudio = React.lazy(() => import("./pages/app/GifStudio"));
const GamesScreen = React.lazy(() => import("./pages/app/GamesScreen"));
const SettingsScreen = React.lazy(() => import("./pages/app/SettingsScreen"));
const DiaryScreen = React.lazy(() => import("./pages/app/DiaryScreen"));
const PolaroidWallScreen = React.lazy(() => import("@/components/PolaroidWall").then(m => ({ default: m.PolaroidWallScreen })));
const CalendarScreen = React.lazy(() => import("./pages/app/CalendarScreen"));
const CalendarDayView = React.lazy(() => import("./pages/app/CalendarDayView"));

/** Soft breathing-heart loader for lazy chunks */
function ScreenLoader() {
  return (
    <div className="flex min-h-[60dvh] flex-col items-center justify-center gap-4 text-center">
      <div className="text-4xl animate-floaty-slow" aria-hidden>💜</div>
      <p className="text-sm font-semibold text-ink-soft">warming up…</p>
    </div>
  );
}

/** Wrap lazy components in Suspense */
function Lazy({ children }: { children: React.ReactNode }) {
  return <Suspense fallback={<ScreenLoader />}>{children}</Suspense>;
}

/** Inline splash loader for top-level lazy routes — shows instantly */
function SplashLoader() {
  return (
    <div className="fixed inset-0 z-[200] flex flex-col items-center justify-center bg-[#EDEBF6]">
      <div className="text-5xl animate-floaty-slow">💜</div>
      <p className="mt-4 text-sm font-semibold text-ink-soft">warming up…</p>
    </div>
  );
}

// Kick off local-storage hydration after first paint — everything Venting needs
// lives on this device, so no async auth gate is required.
// Using requestIdleCallback + setTimeout fallback so hydration never blocks
// the splash screen or first meaningful paint.
const deferHydration = typeof requestIdleCallback === "function"
  ? requestIdleCallback
  : (cb: () => void) => setTimeout(cb, 0);
deferHydration(() => {
  hydrate().catch(() => {
    console.warn("[venting] hydration failed — starting with empty data");
  });
});

/** Guard so runtime errors never leave the app as a blank page. */
class ToolbarErrorBoundary extends React.Component<
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
function RouteShell({ children }: { children: React.ReactNode }) {
  return (
    <AppErrorBoundary onContinue={() => (window.location.href = "/")}>
      {children}
    </AppErrorBoundary>
  );
}

/** Inner-screen boundary: shell survives; auto-resets on navigation. */
function InnerRoute({ children }: { children: React.ReactNode }) {
  return (
    <Lazy>
      <ScreenBoundary>{children}</ScreenBoundary>
    </Lazy>
  );
}

function RouteSyncer() {
  const location = useLocation();
  React.useEffect(() => {
    window.parent.postMessage(
      { type: "iframe-route-change", path: location.pathname },
      "*",
    );
  }, [location.pathname]);

  React.useEffect(() => {
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

// Global safety net for errors that happen outside React (runs once).
installGlobalErrorHandlers();

// Gentle offline notice pinned to the top of the app — never blocking.
function GlobalNotice() {
  return (
    <div className="pointer-events-none fixed inset-x-0 top-2 z-[60] flex justify-center px-4">
      <OfflineNotice />
    </div>
  );
}

const rootEl = document.getElementById("root");
if (!rootEl) {
  // Extremely unlikely, but guard so we never white-screen
  document.body.innerHTML = `
    <div style="display:flex;align-items:center;justify-content:center;min-height:100dvh;background:#f5eef8;font-family:system-ui;color:#6b5b95;text-align:center;padding:2rem">
      <div>
        <div style="font-size:2.5rem">💜</div>
        <p style="margin-top:0.5rem;font-weight:bold">something went softly wrong</p>
        <p style="font-size:0.8rem;opacity:0.7;margin-top:0.25rem">Try reloading the page.</p>
      </div>
    </div>`;
} else {
createRoot(rootEl).render(
  <React.StrictMode>
    <AppErrorBoundary onContinue={() => (window.location.href = "/")}>
      <ToolbarErrorBoundary>
        <VlyToolbar />
      </ToolbarErrorBoundary>
      <ThemeProvider>
      <BrowserRouter>
        <RouteSyncer />
        <GlobalNotice />
        <Routes>
          <Route
            path="/"
            element={
              <RouteShell>
                <React.Suspense fallback={<SplashLoader />}>
                  <Landing />
                </React.Suspense>
              </RouteShell>
            }
          />
          <Route
            path="/login"
            element={
              <RouteShell>
                <React.Suspense fallback={<SplashLoader />}>
                  <LoginEntry />
                </React.Suspense>
              </RouteShell>
            }
          />

          <Route
            path="/dashboard"
            element={
              <RouteShell>
                <Dashboard />
              </RouteShell>
            }
          >
            <Route index element={<InnerRoute><HomeScreen /></InnerRoute>} />
            <Route path="record" element={<InnerRoute><RecordScreen /></InnerRoute>} />
            <Route path="notes" element={<InnerRoute><NotesScreen /></InnerRoute>} />
            <Route path="notes/new" element={<InnerRoute><NoteEditor /></InnerRoute>} />
            <Route path="create" element={<InnerRoute><CreateScreen /></InnerRoute>} />
            <Route path="scribble" element={<InnerRoute><ScribbleScreen /></InnerRoute>} />
            <Route path="stickers" element={<InnerRoute><StickerStudio /></InnerRoute>} />
            <Route path="gif-studio" element={<InnerRoute><GifStudio /></InnerRoute>} />
            <Route path="vault" element={<InnerRoute><VaultScreen /></InnerRoute>} />
            <Route path="games" element={<InnerRoute><GamesScreen /></InnerRoute>} />
            <Route path="calendar" element={<InnerRoute><CalendarScreen /></InnerRoute>} />
            <Route path="calendar/:dateKey" element={<InnerRoute><CalendarDayView /></InnerRoute>} />
            <Route path="settings" element={<InnerRoute><SettingsScreen /></InnerRoute>} />
            <Route path="diary" element={<InnerRoute><DiaryScreen /></InnerRoute>} />
            <Route path="polaroid-wall" element={<InnerRoute><PolaroidWallScreen /></InnerRoute>} />
          </Route>
          <Route path="*" element={<RouteShell><React.Suspense fallback={<SplashLoader />}><NotFound title="Page not found" /></React.Suspense></RouteShell>} />
        </Routes>
      </BrowserRouter>
      </ThemeProvider>
      <Toaster />
    </AppErrorBoundary>
  </React.StrictMode>,
);
}
