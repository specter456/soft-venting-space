import { lazyWithRetry, prefetchScreen } from "@/lib/lazyWithRetry";

/**
 * Lazy dashboard screens, shared by the router (main.tsx), the shell
 * (Dashboard) and the idle prefetcher.
 *
 * MISSION: tabs open instantly. After Home's first paint we warm ALL four
 * tab chunks during idle time, so the first switch to Games / Calendar /
 * Settings never waits on a download. Once a module is loaded it stays
 * cached for the session — revisits are instant by definition.
 */

/* ── The four main tabs ─────────────────────────────────────────────── */
export const HomeScreen = lazyWithRetry(() => import("@/pages/app/HomeScreen"));
export const GamesScreen = lazyWithRetry(() => import("@/pages/app/GamesScreen"));
export const CalendarScreen = lazyWithRetry(() => import("@/pages/app/CalendarScreen"));
export const SettingsScreen = lazyWithRetry(() => import("@/pages/app/SettingsScreen"));

/* ── Calendar sub-screen (day view) ────────────────────────────────── */
export const CalendarDayView = lazyWithRetry(() => import("@/pages/app/CalendarDayView"));

/* ── Remaining dashboard screens (kept together so any screen can warm them) ── */
export const RecordScreen = lazyWithRetry(() => import("@/pages/app/RecordScreen"));
export const NotesScreen = lazyWithRetry(() => import("@/pages/app/NotesScreen"));
export const NoteEditor = lazyWithRetry(() => import("@/pages/app/NoteEditor"));
export const CreateScreen = lazyWithRetry(() => import("@/pages/app/CreateScreen"));
export const VaultScreen = lazyWithRetry(() => import("@/pages/app/VaultScreen"));
export const ScribbleScreen = lazyWithRetry(() => import("@/pages/app/ScribbleScreen"));
export const StickerStudio = lazyWithRetry(() => import("@/pages/app/StickerStudio"));
export const GifStudio = lazyWithRetry(() => import("@/pages/app/GifStudio"));
export const DiaryScreen = lazyWithRetry(() => import("@/pages/app/DiaryScreen"));
export const PolaroidWallScreen = lazyWithRetry(() =>
  import("@/components/PolaroidWall").then((m) => ({ default: m.PolaroidWallScreen })),
);

/* ── Plant screen — its own route/header, entered from the Home card.
   Home already lazy-loads this exact module for the card, so the chunk is
   warm and the screen opens instantly. ────────────────────────────── */
export const PlantScreen = lazyWithRetry(() => import("@/components/MyLittlePlant"));

/* ─── Idle scheduling ───────────────────────────────────────────────── */

/**
 * Run `fn` during idle time — requestIdleCallback when available (so the
 * work never competes with paint), with a plain ~1s timeout backstop so it
 * always fires even where rIC is missing. Idempotent: whichever fires
 * first wins, the other is a no-op.
 */
export function onIdle(fn: () => void, delayMs = 1000): void {
  let done = false;
  const run = () => {
    if (done) return;
    done = true;
    fn();
  };
  if (typeof requestIdleCallback === "function") {
    requestIdleCallback(() => run(), { timeout: delayMs });
  }
  setTimeout(run, delayMs);
}

/** The four tab chunks, in taskbar order. */
const TAB_CHUNKS: [name: string, component: unknown][] = [
  ["home", HomeScreen],
  ["games", GamesScreen],
  ["calendar", CalendarScreen],
  ["settings", SettingsScreen],
];

/**
 * Warm every main tab chunk during idle — called right after Home's first
 * paint. Games (including the built-in games + the creator) and Settings
 * ship inside their own tab chunks, so warming the four tabs covers the
 * whole bar: after the first ~2s on Home every tab switch is instant.
 */
export function prefetchMainTabs(): void {
  onIdle(() => {
    for (const [name, component] of TAB_CHUNKS) prefetchScreen(component, name);
  });
}

/**
 * Warm a dashboard route's sub-screens during idle.
 *
 * - `/dashboard/calendar/:dateKey` day view is its own chunk.
 * - Settings has no lazy sub-screens (its sections and LockScreen live in
 *   the Settings chunk itself), and Games' built-in games + creator live in
 *   the Games chunk — both already warmed by prefetchMainTabs when the tab
 *   opens, so there is nothing extra to fetch here.
 */
export function prefetchSubScreens(pathname: string): void {
  if (pathname.startsWith("/dashboard/calendar")) {
    onIdle(() => prefetchScreen(CalendarDayView, "calendar-day"));
  }
}
