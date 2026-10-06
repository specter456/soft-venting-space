import { describe, it, expect, vi } from "vitest";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

vi.stubGlobal("matchMedia", (q: string) => ({ matches: false, media: q, addEventListener: () => {}, removeEventListener: () => {}, addListener: () => {}, removeListener: () => {} }));
vi.stubGlobal("requestAnimationFrame", (cb: (t: number) => void) => window.setTimeout(() => cb(16), 16));
vi.stubGlobal("cancelAnimationFrame", (id: number) => window.clearTimeout(id));
vi.stubGlobal("scrollTo", () => {});
window.HTMLElement.prototype.scrollIntoView = () => {};

const log = (...a: unknown[]) => console.log("[diag]", ...a);

async function timed(name: string, loader: () => Promise<unknown>) {
  const t0 = Date.now();
  const timer = setTimeout(() => log(`${name} STILL PENDING after 8s`), 8000);
  try {
    await loader();
    log(`${name} ok in ${Date.now() - t0}ms`);
  } catch (err) {
    log(`${name} FAILED in ${Date.now() - t0}ms:`, String(err));
  } finally {
    clearTimeout(timer);
  }
}

describe("diag imports", () => {
  it("times each screen module", { timeout: 120_000 }, async () => {
    await timed("Landing", () => import("../src/pages/Landing"));
    await timed("LoginEntry", () => import("../src/pages/LoginEntry"));
    await timed("HomeScreen", () => import("../src/pages/app/HomeScreen"));
    await timed("GamesScreen", () => import("../src/pages/app/GamesScreen"));
    await timed("CalendarScreen", () => import("../src/pages/app/CalendarScreen"));
    await timed("SettingsScreen", () => import("../src/pages/app/SettingsScreen"));
    await timed("RecordScreen", () => import("../src/pages/app/RecordScreen"));
    await timed("DiaryScreen", () => import("../src/pages/app/DiaryScreen"));
    expect(true).toBe(true);
  });
});
