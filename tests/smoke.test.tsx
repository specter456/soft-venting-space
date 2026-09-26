/**
 * Smoke test — `bun run smoke`.
 *
 * Boots the REAL app headlessly (src/main.tsx, exactly as shipped: router,
 * theme provider, error boundaries, lazy screens, local DB) and walks the
 * core flows the way a user would. The run FAILS if:
 *   - the soft-snag error boundary catches anywhere in the tree, or
 *   - any console.error appears, or
 *   - an unhandled error/rejection escapes, or
 *   - any flow can't complete its expected state transition.
 *
 * Regression guard for snag #5191: that failure was an infinite re-render
 * loop (Maximum update depth exceeded) inside MusicWidget, caused by the
 * music store's getState() building a fresh snapshot object per call —
 * useSyncExternalStore treats a new object identity as "the store changed",
 * so the component re-rendered forever. In a real browser the loop starves
 * the tab (frozen screen / snap #5191 card). The per-test "setState loop
 * detector" below watches the console for that error so this class can
 * never ship silently again.
 *
 * Why not a real browser: this sandbox has no Chrome (no Playwright cache,
 * no chromium binary). happy-dom provides window/document, localStorage,
 * sessionStorage, history and events — enough for this app, which is
 * deliberately 100% local (no network calls in any user feature). Audio /
 * getUserMedia / rIC are stubbed before the app is imported so sound and
 * scheduling never break the run.
 */

import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";
import * as React from "react";

// ─── Browser-environment shims (before any app import) ────────────────

class FakeAudioContext {
  destination = {};
  sampleRate = 48000;
  currentTime = 0;
  state = "running";
  createGain() {
    const g: Record<string, unknown> = {
      gain: { value: 1, setValueAtTime: () => {}, linearRampToValueAtTime: () => {}, exponentialRampToValueAtTime: () => {} },
      connect: () => g,
      disconnect: () => {},
    };
    return g;
  }
  createOscillator() {
    const o: Record<string, unknown> = {
      frequency: { value: 440, setValueAtTime: () => {}, linearRampToValueAtTime: () => {}, exponentialRampToValueAtTime: () => {} },
      detune: { value: 0 },
      type: "sine",
      connect: () => o,
      start: () => {},
      stop: () => {},
      onended: null,
    };
    return o;
  }
  createBufferSource() {
    const s: Record<string, unknown> = {
      buffer: null,
      loop: false,
      playbackRate: { value: 1 },
      connect: () => s,
      start: () => {},
      stop: () => {},
    };
    return s;
  }
  createBiquadFilter() {
    const f: Record<string, unknown> = {
      type: "lowpass",
      frequency: { value: 350, setValueAtTime: () => {} },
      Q: { value: 1 },
      connect: () => f,
      disconnect: () => {},
    };
    return f;
  }
  createBuffer(_ch: number, length: number, sampleRate: number) {
    return { getChannelData: () => new Float32Array(Math.max(1, length || sampleRate)) };
  }
  createMediaStreamSource() {
    return { connect: () => {}, disconnect: () => {} };
  }
  decodeAudioData() {
    return Promise.resolve({ getChannelData: () => new Float32Array(1) });
  }
  resume() { return Promise.resolve(); }
  suspend() { return Promise.resolve(); }
  close() { return Promise.resolve(); }
}

vi.stubGlobal("AudioContext", FakeAudioContext);
vi.stubGlobal("webkitAudioContext", FakeAudioContext);
vi.stubGlobal("matchMedia", (q: string) => ({ matches: false, media: q, addEventListener: () => {}, removeEventListener: () => {}, addListener: () => {}, removeListener: () => {} }));
vi.stubGlobal("requestAnimationFrame", (cb: (t: number) => void) => window.setTimeout(() => cb(performance.now()), 16));
vi.stubGlobal("cancelAnimationFrame", (id: number) => window.clearTimeout(id));
vi.stubGlobal("scrollTo", () => {});
window.HTMLElement.prototype.scrollIntoView = () => {};
if (typeof window.PointerEvent === "undefined") {
  (window as unknown as { PointerEvent: typeof MouseEvent }).PointerEvent = MouseEvent;
}

// ─── Failure capture ──────────────────────────────────────────────────

const consoleErrors: string[] = [];
const boundaryHits: { name: string; message: string }[] = [];

const origError = console.error;
console.error = (...args: unknown[]) => {
  const msg = args.map((a) => (a instanceof Error ? a.message : String(a))).join(" ");
  consoleErrors.push(msg);
  // Intentionally swallowed from stdout; failures surface in the assertions.
};

const origWarn = console.warn;
console.warn = (...args: unknown[]) => {
  const msg = args.map((a) => (a instanceof Error ? a.message : String(a))).join(" ");
  // Warnings are recorded but never fail the run.
  consoleErrors.push(`(warn) ${msg}`);
};

// ─── Boot the real app ONCE (side-effect module) ──────────────────────

let container: HTMLElement;
const text = () => container.textContent ?? "";
// 350ms covers the app's tap-guard cool-down; the extra 450 lets any
// AnimatePresence exit (mode="wait") finish before the next step asserts.
const settle = (ms: number) => act(async () => { await new Promise((r) => setTimeout(r, ms + 450)); });

import { act } from "react";

function go(to: string) {
  act(() => {
    window.history.pushState({}, "", to);
    window.dispatchEvent(new PopStateEvent("popstate"));
  });
}
function button(match: (t: string) => boolean): HTMLButtonElement {
  const all = [...container.querySelectorAll("button")];
  const hit = all.find((b) => match(b.textContent ?? ""));
  if (!hit) throw new Error(`button not found; page text: ${text().slice(0, 300)}`);
  return hit as HTMLButtonElement;
}
function expectNoBoundary() {
  expect(boundaryHits, `error boundary caught: ${JSON.stringify(boundaryHits)}`).toHaveLength(0);
}
function expectNoConsoleErrors() {
  const real = consoleErrors.filter(
    (m) => !m.includes("The above error occurred in") && !m.startsWith("(warn)"),
  );
  expect(real, `console.error fired:\n${consoleErrors.join("\n")}`).toHaveLength(0);
}
function expectVisible(matcher: RegExp, label: string) {
  const t = text();
  expect(t, `${label} — page text did not include ${matcher}; got: ${t.slice(0, 300)}`).toMatch(matcher);
}

beforeAll(async () => {
  // Fresh, empty device.
  localStorage.clear();
  sessionStorage.clear();
  document.head.innerHTML = "";
  document.body.innerHTML = `<div id="root"></div>`;
  container = document.getElementById("root") as HTMLElement;

  // Boot at the entry choice screen.
  window.history.replaceState({}, "", "/login");

  // Import the real entrypoint — it renders itself into #root.
  await import("../src/main");
  await settle(400);

  // ---- Test instrumentation (no app code changes) ----
  // Every error boundary in the app is a class with componentDidCatch.
  // The boundary module instance is shared with the one main.tsx uses, so
  // instrumenting the prototype covers App/Screen/Quiet boundaries alike.
  const eb = await import("../src/components/AppErrorBoundary");
  for (const cls of [eb.AppErrorBoundary, eb.QuietBoundary]) {
    const proto = (cls as unknown as { prototype: Record<string, unknown> }).prototype;
    const orig = proto.componentDidCatch as (this: unknown, ...a: unknown[]) => void;
    proto.componentDidCatch = function (this: { props?: { name?: string } }, ...a: unknown[]) {
      const err = a[0] as Error | undefined;
      boundaryHits.push({
        name: (this.props?.name as string) ?? "unknown-boundary",
        message: String(err?.message ?? err ?? a[0]),
      });
      return orig.apply(this, a);
    };
  }
});

afterAll(() => {
  console.error = origError;
  console.warn = origWarn;
});

// ─── Shared flow helpers ──────────────────────────────────────────────

/** Enter the dashboard as a fresh guest: entry choice → name → passcode ×2 → check-in. */
async function signupFreshGuest() {
  expectVisible(/Open your safe room/, "entry choice");

  await settle(350); // tap-guard cool-down before the first real tap
  act(() => { button((t) => t.includes("Continue as guest")).click(); });
  await settle(400); // AnimatePresence exit → guest step enters
  expectVisible(/Choose a name for your space/, "guest name step");

  const input = container.querySelector("input");
  expect(input, "name input should exist").toBeTruthy();
  act(() => {
    input!.value = "SmokeTester";
    input!.dispatchEvent(new Event("input", { bubbles: true }));
  });
  await settle(350);
  act(() => { button((t) => t === "Continue").click(); });
  await settle(400);
  expectVisible(/Create a 4-digit passcode/, "passcode create");

  await tapCode();
  await settle(300);
  expectVisible(/Type it once more/, "passcode confirm");
  await tapCode();
  await settle(700); // hash + space creation + AnimatePresence
  expectVisible(/How was your/, "check-in screen");

  await settle(350);
  act(() => { button((t) => t.includes("Happy")).click(); });
  await settle(600);
  expectVisible(/Good (morning|afternoon|evening|night)/, "home greeting");
  expectVisible(/How are you feeling today\?|You're feeling/, "home mood card");
}

/** Type 1-2-3-4 on the on-screen passcode pad. */
async function tapCode() {
  const pad = () => [...container.querySelectorAll("button")].filter((b) => /^[0-9]$/.test(b.textContent ?? ""));
  for (const d of ["1", "2", "3", "4"]) {
    const key = pad().find((x) => x.textContent === d)!;
    act(() => { key.click(); });
    await settle(60);
  }
}

// ─── The tour ─────────────────────────────────────────────────────────

describe("Venting smoke tour", () => {
  it(
    "fresh guest signup → home renders",
    { retry: 2 },
    async () => {
      await signupFreshGuest();
      expectNoBoundary();
      expectNoConsoleErrors();
    },
  );

  it(
    "all four tabs render: home → games → calendar → settings → home",
    { retry: 2 },
    async () => {
      go("/dashboard/games");
      await settle(400);
      expectVisible(/gentle places to land/, "games grid");
      expectVisible(/recently played|❤️ favorites|Bubble Pop|Create your own game/, "games content");

      go("/dashboard/calendar");
      await settle(400);
      expectVisible(/important|thought dump|notes/i, "calendar");

      go("/dashboard/settings");
      await settle(400);
      expectVisible(/delete everything|theme|about/i, "settings");

      go("/dashboard");
      await settle(400);
      expectVisible(/Good (morning|afternoon|evening|night)|How are you feeling|You're feeling/, "home again");

      expectNoBoundary();
      expectNoConsoleErrors();
    },
  );

  it(
    "open one game (Bubble Pop) → back to grid",
    { retry: 2 },
    async () => {
      go("/dashboard/games");
      await settle(400);
      await settle(350);
      act(() => { button((t) => t.includes("Bubble Pop")).click(); });
      await settle(500);
      expectVisible(/Each bubble holds a worry|Bubble Pop/, "bubble pop open");

      await settle(350);
      act(() => { button((t) => t.includes("all games")).click(); });
      await settle(500);
      expectVisible(/gentle places to land/, "back on grid");

      expectNoBoundary();
      expectNoConsoleErrors();
    },
  );

  it(
    "route re-entry (reload-equivalent) on a tab recovers cleanly",
    { retry: 2 },
    async () => {
      // Unmount/remount of a screen subtree = what a reload exercises for the
      // boundary + lazy chunk path. Leave games, come back, leave, come back.
      go("/dashboard");
      await settle(300);
      go("/dashboard/games");
      await settle(300);
      go("/dashboard/settings");
      await settle(300);
      go("/dashboard/games");
      await settle(400);
      expectVisible(/gentle places to land/, "grid after re-entry");

      expectNoBoundary();
      expectNoConsoleErrors();
    },
  );

  it(
    "recording screen loads (no crash without a mic)",
    { retry: 2 },
    async () => {
      go("/dashboard/record");
      await settle(400);
      expectVisible(/How would you like to let it out\?/, "record picker");

      // Voice mode renders its recorder without touching getUserMedia.
      await settle(350);
      act(() => { button((t) => t.includes("Voice Recording")).click(); });
      await settle(500);
      expectVisible(/Tap to start recording/, "voice recorder");

      expectNoBoundary();
      expectNoConsoleErrors();
    },
  );

  it(
    "lock from settings → lock screen appears",
    { retry: 2 },
    async () => {
      go("/dashboard/settings");
      await settle(400);
      const lock = [...container.querySelectorAll("button")].find(
        (b) => b.getAttribute("aria-label")?.includes("Lock your space"),
      );
      expect(lock, "lock button should exist in the header").toBeTruthy();
      await settle(350);
      act(() => { lock!.click(); });
      await settle(600);
      expectVisible(/enter your passcode|unlock|passcode/i, "lock screen");

      expectNoBoundary();
      expectNoConsoleErrors();
    },
  );
});
