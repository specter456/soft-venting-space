import '@vly-ai/integrations';
import { Toaster } from "@/components/ui/sonner";
import { VlyToolbar } from "../vly-toolbar-readonly.tsx";
import { AppErrorBoundary, installGlobalErrorHandlers } from "@/components/AppErrorBoundary";
import { OfflineNotice } from "@/components/Friendly";
import { hydrate } from "@/lib/db";
import React, { Suspense, lazy } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, Route, Routes, useLocation } from "react-router";
import "./index.css";

// Kick off local-storage hydration immediately — everything Venting needs
// lives on this device, so no async auth gate is required.
void hydrate();

// Lazy load route components for better code splitting
const Landing = lazy(() => import("./pages/Landing.tsx"));
const WelcomeCheckin = lazy(() => import("./pages/WelcomeCheckin.tsx"));
const Dashboard = lazy(() => import("./pages/Dashboard.tsx"));
const NotFound = lazy(() => import("./pages/NotFound.tsx"));
const HomeScreen = lazy(() => import("./pages/app/HomeScreen.tsx"));
const RecordScreen = lazy(() => import("./pages/app/RecordScreen.tsx"));
const NotesScreen = lazy(() => import("./pages/app/NotesScreen.tsx"));
const NoteEditor = lazy(() => import("./pages/app/NoteEditor.tsx"));
const CreateScreen = lazy(() => import("./pages/app/CreateScreen.tsx"));
const VaultScreen = lazy(() => import("./pages/app/VaultScreen.tsx"));
const ScribbleScreen = lazy(() => import("./pages/app/ScribbleScreen.tsx"));
const StickerStudio = lazy(() => import("./pages/app/StickerStudio.tsx"));
const GifStudio = lazy(() => import("./pages/app/GifStudio.tsx"));
const CalmScreen = lazy(() => import("./pages/app/CalmScreen.tsx"));
const DiaryScreen = lazy(() => import("./pages/app/DiaryScreen.tsx"));

// Simple loading fallback for route transitions
function RouteLoading() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="animate-pulse text-muted-foreground">Loading...</div>
    </div>
  );
}

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

createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <AppErrorBoundary onContinue={() => (window.location.href = "/")}>
      <ToolbarErrorBoundary>
        <VlyToolbar />
      </ToolbarErrorBoundary>
      <BrowserRouter>
        <RouteSyncer />
        <GlobalNotice />
        <Suspense fallback={<RouteLoading />}>
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
              <Route path="calm" element={<CalmScreen />} />
              <Route path="diary" element={<DiaryScreen />} />
            </Route>
            <Route path="*" element={<NotFound />} />
          </Routes>
        </Suspense>
      </BrowserRouter>
      <Toaster />
    </AppErrorBoundary>
  </React.StrictMode>,
);
