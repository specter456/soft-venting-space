import React, { Suspense } from "react";
import { AppErrorBoundary } from "@/components/AppErrorBoundary";
import { installGlobalErrorHandlers } from "@/lib/global-error-handlers";
import {
  GlobalNotice,
  InnerRoute,
  RouteShell,
  RouteSyncer,
  SplashLoader,
  ToolbarErrorBoundary,
} from "@/app-shell";
import { hydrate } from "@/lib/db";
import { lazyWithRetry } from "@/lib/lazyWithRetry";

// Toaster lazy — pulls in sonner + lucide-react + next-themes, not needed for first paint
const Toaster = lazyWithRetry(() => import("@/components/ui/sonner").then(m => ({ default: m.Toaster })));
// VlyToolbar lazy-loaded — it imports framer-motion + @zumer/snapdom which
// are heavy; only needed on dev deployments (.vly.sh), so defer entirely.
const VlyToolbar = lazyWithRetry(() => import("../vly-toolbar-readonly.tsx").then(m => ({ default: m.VlyToolbar })));

import { createRoot } from "react-dom/client";
import { BrowserRouter, Route, Routes } from "react-router";
import { ThemeProvider } from "@/lib/themes";
import "./index.css";

// Public routes — lazy-loaded so the initial bundle stays tiny
const Landing = lazyWithRetry(() => import("./pages/Landing"));
const LoginEntry = lazyWithRetry(() => import("./pages/LoginEntry"));
const NotFound = lazyWithRetry(() => import("./pages/NotFound"));

// Dashboard shell — eagerly imported (has render-time setState, cannot be lazy)
import Dashboard from "./pages/Dashboard";

// Dashboard screens — lazy-loaded for smaller initial bundle, shared with
// the idle prefetcher in @/lib/screens (warmed after Home's first paint).
import {
  HomeScreen,
  RecordScreen,
  NotesScreen,
  NoteEditor,
  CreateScreen,
  VaultScreen,
  ScribbleScreen,
  StickerStudio,
  GifStudio,
  GamesScreen,
  SettingsScreen,
  DiaryScreen,
  PolaroidWallScreen,
  CalendarScreen,
  CalendarDayView,
  PlantScreen,
} from "@/lib/screens";

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

// Global safety net for errors that happen outside React (runs once).
installGlobalErrorHandlers();

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
        <Suspense fallback={null}>
          <VlyToolbar />
        </Suspense>
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
            <Route path="plant" element={<InnerRoute><PlantScreen /></InnerRoute>} />
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
      <Suspense fallback={null}>
        <Toaster />
      </Suspense>
    </AppErrorBoundary>
  </React.StrictMode>,
);
}
