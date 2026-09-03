import '@vly-ai/integrations';
import { Toaster } from "@/components/ui/sonner";
import { VlyToolbar } from "../vly-toolbar-readonly.tsx";
import { AppErrorBoundary, installGlobalErrorHandlers } from "@/components/AppErrorBoundary";
import { OfflineNotice } from "@/components/Friendly";
import { hydrate } from "@/lib/db";
import React, { Suspense } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, Route, Routes, useLocation } from "react-router";
import "./index.css";

// Public routes — eagerly imported (small, visible immediately)
import Landing from "./pages/Landing";
import LoginEntry from "./pages/LoginEntry";
import WelcomeCheckin from "./pages/WelcomeCheckin";
import NotFound from "./pages/NotFound";

// Dashboard shell — eagerly imported (thin wrapper)
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

// Kick off local-storage hydration immediately — everything Venting needs
// lives on this device, so no async auth gate is required.
// Wrapped in try/catch so corrupted storage never prevents startup.
hydrate().catch(() => {
  console.warn("[venting] hydration failed — starting with empty data");
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

/** Small per-route boundary so one broken screen never blanks the whole app. */
function RouteShell({ children }: { children: React.ReactNode }) {
  return (
    <AppErrorBoundary onContinue={() => (window.location.href = "/")}>
      {children}
    </AppErrorBoundary>
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
      <BrowserRouter>
        <RouteSyncer />
        <GlobalNotice />
        <Routes>
          <Route
            path="/"
            element={
              <RouteShell>
                <Landing />
              </RouteShell>
            }
          />
          <Route
            path="/login"
            element={
              <RouteShell>
                <LoginEntry />
              </RouteShell>
            }
          />
          <Route
            path="/welcome"
            element={
              <RouteShell>
                <WelcomeCheckin />
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
            <Route index element={<Lazy><HomeScreen /></Lazy>} />
            <Route path="record" element={<Lazy><RecordScreen /></Lazy>} />
            <Route path="notes" element={<Lazy><NotesScreen /></Lazy>} />
            <Route path="notes/new" element={<Lazy><NoteEditor /></Lazy>} />
            <Route path="create" element={<Lazy><CreateScreen /></Lazy>} />
            <Route path="scribble" element={<Lazy><ScribbleScreen /></Lazy>} />
            <Route path="stickers" element={<Lazy><StickerStudio /></Lazy>} />
            <Route path="gif-studio" element={<Lazy><GifStudio /></Lazy>} />
            <Route path="vault" element={<Lazy><VaultScreen /></Lazy>} />
            <Route path="games" element={<Lazy><GamesScreen /></Lazy>} />
            <Route path="calendar" element={<Lazy><CalendarScreen /></Lazy>} />
            <Route path="calendar/:dateKey" element={<Lazy><CalendarDayView /></Lazy>} />
            <Route path="settings" element={<Lazy><SettingsScreen /></Lazy>} />
            <Route path="diary" element={<Lazy><DiaryScreen /></Lazy>} />
          </Route>
          <Route path="*" element={<NotFound title="Page not found" />} />
        </Routes>
      </BrowserRouter>
      <Toaster />
    </AppErrorBoundary>
  </React.StrictMode>,
);
}
