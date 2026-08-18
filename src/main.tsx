import '@vly-ai/integrations';
import { Toaster } from "@/components/ui/sonner";
import { VlyToolbar } from "../vly-toolbar-readonly.tsx";
import { AppErrorBoundary, installGlobalErrorHandlers } from "@/components/AppErrorBoundary";
import { OfflineNotice } from "@/components/Friendly";
import { hydrate } from "@/lib/db";
import React from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, Route, Routes, useLocation } from "react-router";
import "./index.css";

// All screens are imported eagerly: navigation is instant, with no "Loading…"
// flash between screens. Everything reads from the on-device reactive cache,
// so screens paint immediately and content simply fills in.
import Landing from "./pages/Landing";
import LoginEntry from "./pages/LoginEntry";
import WelcomeCheckin from "./pages/WelcomeCheckin";
import Dashboard from "./pages/Dashboard";
import NotFound from "./pages/NotFound";
import HomeScreen from "./pages/app/HomeScreen";
import RecordScreen from "./pages/app/RecordScreen";
import NotesScreen from "./pages/app/NotesScreen";
import NoteEditor from "./pages/app/NoteEditor";
import CreateScreen from "./pages/app/CreateScreen";
import VaultScreen from "./pages/app/VaultScreen";
import ScribbleScreen from "./pages/app/ScribbleScreen";
import StickerStudio from "./pages/app/StickerStudio";
import GifStudio from "./pages/app/GifStudio";
import GamesScreen from "./pages/app/GamesScreen";
import SettingsScreen from "./pages/app/SettingsScreen";
import DiaryScreen from "./pages/app/DiaryScreen";
import CalendarScreen from "./pages/app/CalendarScreen";
import CalendarDayView from "./pages/app/CalendarDayView";

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
            <Route index element={<HomeScreen />} />
            <Route path="record" element={<RecordScreen />} />
            <Route path="notes" element={<NotesScreen />} />
            <Route path="notes/new" element={<NoteEditor />} />
            <Route path="create" element={<CreateScreen />} />
            <Route path="scribble" element={<ScribbleScreen />} />
            <Route path="stickers" element={<StickerStudio />} />
            <Route path="gif-studio" element={<GifStudio />} />
            <Route path="vault" element={<VaultScreen />} />
            <Route path="games" element={<GamesScreen />} />
            <Route path="calendar" element={<CalendarScreen />} />
            <Route path="calendar/:dateKey" element={<CalendarDayView />} />
            <Route path="settings" element={<SettingsScreen />} />
            <Route path="diary" element={<DiaryScreen />} />
          </Route>
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
      <Toaster />
    </AppErrorBoundary>
  </React.StrictMode>,
);
}
