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

// React's act() requires this flag; without it every act call logs a
// console.error and the tour's "console clean" assertions can never pass.
(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

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
// (Keep as a plain async/await so the mark fires reliably after the act.)
const settle = async (ms: number) => {
  __mark(`settle ${ms} start`);
  await act(async () => {
    await new Promise((r) => setTimeout(r, ms + 450));
  });
  __mark(`settle ${ms} done`);
};
const __mark = (m: string) => console.log(`[step] ${m}`);

/**
 * Poll until the rendered text matches. Lazy screens are fetched on first
 * visit and the very first transform under vitest can take longer than any
 * fixed settle, so assertions wait for the screen instead of a stopwatch.
 */
async function waitFor(matcher: RegExp, label: string, timeoutMs = 15_000) {
  const started = Date.now();
  for (;;) {
    if (matcher.test(text())) break;
    if (Date.now() - started > timeoutMs) {
      expectVisible(matcher, label);
      return;
    }
    await act(async () => {
      await new Promise((r) => setTimeout(r, 120));
    });
  }
  __mark(`visible: ${label}`);
}

import { act } from "react";

/**
 * Poll until a DOM predicate passes — for flows whose proof is an element
 * (a photo layer, a pinned card) rather than screen text.
 */
async function waitUntil(predicate: () => boolean, label: string, timeoutMs = 30_000) {
  const started = Date.now();
  for (;;) {
    if (predicate()) break;
    if (Date.now() - started > timeoutMs) {
      expect(predicate(), `timed out waiting for ${label}`).toBe(true);
      return;
    }
    await act(async () => {
      await new Promise((r) => setTimeout(r, 120));
    });
  }
  __mark(`ready: ${label}`);
}

function go(to: string) {
  __mark(`go ${to}`);
  act(() => {
    window.history.pushState({}, "", to);
    window.dispatchEvent(new PopStateEvent("popstate"));
  });
  __mark(`go ${to} act done`);
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

  // Import the real entrypoint — it renders itself into #root. Wrapped in
  // act so the initial root render happens inside the act environment
  // (otherwise React logs "update … not wrapped in act(...)").
  await act(async () => {
    await import("../src/main");
  });
  // First visit fetches the entry chunk (on-demand transform here), so wait
  // for the screen rather than for a stopwatch.
  await waitFor(/Open your safe room/, "entry choice after boot", 30_000);

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

afterAll(async () => {
  // Flush React's scheduled work while `window` still exists. Without this,
  // a scheduler callback queued by the final assertion fires after happy-dom
  // tears down → "ReferenceError: window is not defined" as an unhandled
  // error, which fails an otherwise-green run.
  await act(async () => {
    await new Promise((r) => setTimeout(r, 500));
  });
  console.error = origError;
  console.warn = origWarn;
});

// ─── Shared flow helpers ──────────────────────────────────────────────

/** Enter the dashboard as a fresh guest: entry choice → name → passcode ×2 → check-in. */
async function signupFreshGuest() {
  await waitFor(/Open your safe room/, "entry choice");

  __mark("guest click next");
  await settle(350); // tap-guard cool-down before the first real tap
  act(() => { button((t) => t.includes("Continue as guest")).click(); });
  await settle(400); // AnimatePresence exit → guest step enters
  __mark("guest step shown");
  await waitFor(/Choose a name for your space/, "guest name step");

  const input = container.querySelector("input");
  expect(input, "name input should exist").toBeTruthy();
  act(() => {
    // Use the NATIVE value setter: React patches `input.value` with a
    // value-tracker that dedupes identical values, which would swallow the
    // synthetic input event and leave onChange (and the name) unset.
    const nativeSet = Object.getOwnPropertyDescriptor(
      window.HTMLInputElement.prototype,
      "value",
    )?.set;
    nativeSet?.call(input!, "SmokeTester");
    input!.dispatchEvent(new Event("input", { bubbles: true }));
  });
  await settle(350);
  __mark("name continue click");
  act(() => { button((t) => t === "Continue").click(); });
  await settle(400);
  __mark("after name continue");
  await waitFor(/Create a 4-digit passcode/, "passcode create");

  __mark("code1 start");
  await tapCode();
  __mark("code1 done");
  await settle(300);
  expectVisible(/Type it once more/, "passcode confirm");
  __mark("code2 start");
  await tapCode();
  __mark("code2 done");
  await settle(700); // hash + space creation + AnimatePresence
  await waitFor(/How was your/, "check-in screen");

  __mark("checkin visible, mood click next");
  await settle(350);
  act(() => { button((t) => t.includes("Happy")).click(); });
  await settle(600);
  __mark("after mood click");
  await waitFor(/Good (morning|afternoon|evening|night)/, "home greeting");
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
      __mark("test2 start");
      // MISSION 1: sit ~2s on Home after first paint — by the end of it the
      // idle prefetch must have warmed every main tab chunk.
      await settle(2000);
      const { warmedScreenNames } = await import("../src/lib/lazyWithRetry");
      for (const tab of ["home", "games", "calendar", "settings"]) {
        expect(
          warmedScreenNames(),
          `tab chunk "${tab}" should be warmed during idle (warmed: ${warmedScreenNames().join(", ")})`,
        ).toContain(tab);
      }

      go("/dashboard/games");
      await waitFor(/gentle places to land/, "games grid");
      expect(text(), "no 'warming up' wait on a prefetched tab").not.toMatch(/warming up/);
      expectVisible(/recently played|❤️ favorites|Bubble Pop|Create your own game/, "games content");

      // ONE shared pill must glide to the active tab (translateX step = index).
      const pill = () => container.querySelector<HTMLElement>("nav > div > span");
      expect(pill(), "gliding taskbar pill should exist").toBeTruthy();
      expect(pill()!.getAttribute("style"), "pill sits on Games (index 1)").toContain("1 *");

      go("/dashboard/calendar");
      await waitFor(/important|thought dump|notes/i, "calendar");
      expect(text(), "no 'warming up' on calendar").not.toMatch(/warming up/);
      expect(pill()!.getAttribute("style"), "pill glides to Calendar (index 2)").toContain("2 *");

      go("/dashboard/settings");
      await waitFor(/delete everything|theme|about/i, "settings");
      expect(text(), "no 'warming up' on settings").not.toMatch(/warming up/);
      // Version stamp (mission 4): Settings → About must show the real version.
      expectVisible(/Version 1\.0\.0/, "About version in settings");
      expect(pill()!.getAttribute("style"), "pill glides to Settings (index 3)").toContain("3 *");

      go("/dashboard");
      await waitFor(/Good (morning|afternoon|evening|night)|How are you feeling|You're feeling/, "home again");
      expect(pill()!.getAttribute("style"), "pill glides back to Home (index 0)").toContain("0 *");

      // Calendar's sub-screen chunk (day view) warms while idle too.
      await settle(1500);
      expect(warmedScreenNames(), "calendar day view should warm on the calendar tab").toContain("calendar-day");

      // MISSION 1: second full pass — every switch should already be instant,
      // never the old full-screen "warming up…" heart.
      for (const [path, marker, label] of [
        ["/dashboard/games", /gentle places to land/, "games (pass 2)"],
        ["/dashboard/calendar", /important|thought dump|notes/i, "calendar (pass 2)"],
        ["/dashboard/settings", /delete everything|theme|about/i, "settings (pass 2)"],
        ["/dashboard", /Good (morning|afternoon|evening|night)|You're feeling/, "home (pass 2)"],
      ] as const) {
        go(path);
        await waitFor(marker, label);
        expect(text(), `${label} — must never show 'warming up'`).not.toMatch(/warming up/);
      }

      // First-ever visit to an un-warmed sub-screen: soft skeleton only,
      // still no "warming up" heart anywhere.
      go("/dashboard/diary");
      await waitFor(/Open my diary|Dear diary|diary is empty/i, "diary first visit");
      expect(text(), "diary first visit must never show 'warming up'").not.toMatch(/warming up/);

      expectNoBoundary();
      expectNoConsoleErrors();
    },
  );

  it(
    "open one game (Bubble Pop) → back to grid",
    { retry: 2 },
    async () => {
      __mark("test3 start");
      go("/dashboard/games");
      await waitFor(/gentle places to land/, "games grid (test3)");
      await settle(350);
      act(() => { button((t) => t.includes("Bubble Pop")).click(); });
      await waitFor(/Each bubble holds a worry/, "bubble pop open");

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
      __mark("test4 start");
      // Unmount/remount of a screen subtree = what a reload exercises for the
      // boundary + lazy chunk path. Leave games, come back, leave, come back.
      go("/dashboard");
      await settle(300);
      go("/dashboard/games");
      await settle(300);
      go("/dashboard/settings");
      await settle(300);
      go("/dashboard/games");
      await waitFor(/gentle places to land/, "grid after re-entry");

      expectNoBoundary();
      expectNoConsoleErrors();
    },
  );

  it(
    "recording screen loads (no crash without a mic)",
    { retry: 2 },
    async () => {
      __mark("test5 start");
      go("/dashboard/record");
      await waitFor(/How would you like to let it out\?/, "record picker");

      // Voice mode renders its recorder without touching getUserMedia.
      await settle(350);
      act(() => { button((t) => t.includes("Voice Recording")).click(); });
      await waitFor(/Tap to start recording/, "voice recorder");

      expectNoBoundary();
      expectNoConsoleErrors();
    },
  );

  it(
    "gallery import lands in the vault and survives re-entry (Photo Doodle)",
    { retry: 2 },
    async () => {
      __mark("gallery test start");
      // Decode path: stub createImageBitmap so a fake PNG “opens” headlessly.
      vi.stubGlobal(
        "createImageBitmap",
        async () => ({ width: 400, height: 300, close: () => {} }),
      );
      const { importGalleryPhoto } = await import("../src/lib/gallery");
      const file = new File(
        [new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10])],
        "smile.png",
        { type: "image/png" },
      );

      let item: { _id: string; art: string; kind: string } | null = null;
      await act(async () => {
        item = await importGalleryPhoto({ file });
      });
      expect(item, "imported photo should become a vault item").toBeTruthy();
      expect(item!.kind).toBe("photo");
      expect(item!.art.startsWith("data:image"), "stored as a local data URL").toBe(true);

      // Photo Doodle → the fresh import sits in the "from vault" grid.
      go("/dashboard/create?view=photos");
      await waitFor(/photo source/, "photo doodle (photos view)");
      const thumbs = () =>
        [...container.querySelectorAll("img")].filter((i) =>
          (i.getAttribute("src") ?? "").startsWith("data:image"),
        );
      expect(thumbs().length, "imported photo shows in the vault grid").toBeGreaterThan(0);

      // Leave and come back (reload-equivalent for the local cache): still there.
      go("/dashboard");
      await settle(400);
      go("/dashboard/create?view=photos");
      await waitFor(/photo source/, "photo doodle (re-entry)");
      expect(thumbs().length, "imported photo survives re-entry").toBeGreaterThan(0);

      expectNoBoundary();
      expectNoConsoleErrors();
    },
  );

  it(
    "gallery picker drives Stickers, Scribble, GIF Studio and the Wall",
    { retry: 2 },
    async () => {
      __mark("picker wiring test start");
      vi.stubGlobal(
        "createImageBitmap",
        async () => ({ width: 400, height: 300, close: () => {} }),
      );

      // The helper appends a hidden <input type=file accept=image/*> to
      // <body> and clicks it; happy-dom has no OS dialog, so the file is
      // handed to that exact input via a change event — the real plumbing.
      const drivePicker = async (label: string, waitMs = 500) => {
        let input: HTMLInputElement | null = null;
        for (let i = 0; i < 50 && !input; i++) {
          input = document.querySelector<HTMLInputElement>(
            'body > input[type="file"][accept="image/*"]',
          );
          if (!input) {
            await act(async () => {
              await new Promise((r) => setTimeout(r, 60));
            });
          }
        }
        expect(input, `gallery picker should open (${label})`).toBeTruthy();
        const file = new File(
          [new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10])],
          "shot.png",
          { type: "image/png" },
        );
        Object.defineProperty(input!, "files", {
          value: { 0: file, length: 1, item: (i: number) => (i === 0 ? file : null) },
          configurable: true,
        });
        // Keep the whole async import chain inside act() so React's
        // "not wrapped in act" warnings can't mask real failures.
        await act(async () => {
          input!.dispatchEvent(new Event("change"));
          await new Promise((r) => setTimeout(r, waitMs));
        });
      };

      // ── Stickers: photo source → square crop (headless engines never
      //    fire the decode event, so this rides the 3s fallback). ──
      go("/dashboard/stickers");
      await waitFor(/Sticker source/, "sticker studio");
      await settle(350);
      act(() => {
        button((t) => t.includes("from gallery")).click();
      });
      await drivePicker("stickers", 3800);
      await waitFor(/choose a different photo/, "photo sticker source saved", 30_000);

      // ── Scribble: gallery photo becomes the faint background layer ──
      go("/dashboard/scribble");
      await waitFor(/Background/, "scribble");
      await settle(350);
      act(() => {
        button((t) => t.includes("photo bg")).click();
      });
      await drivePicker("scribble");
      await waitUntil(
        () => Boolean(container.querySelector('img[src^="data:image"]')),
        "scribble photo background layer",
      );
      expect(
        button((t) => t.includes("photo bg")).getAttribute("aria-pressed"),
        "photo background chip should be on",
      ).toBe("true");

      // ── GIF Studio: "add photo" places a frame layer ──
      go("/dashboard/gif-studio");
      await waitFor(/add photo/, "gif studio");
      await settle(350);
      act(() => {
        button((t) => t.includes("add photo")).click();
      });
      await drivePicker("gif studio");
      await waitUntil(
        () =>
          [...container.querySelectorAll("img")].some(
            (i) =>
              (i.getAttribute("src") ?? "").startsWith("data:image") &&
              i.style.width === "170px",
          ),
        "gif photo layer",
      );

      // ── Wall: picker → "import from gallery" → pinned ──
      go("/dashboard/polaroid-wall");
      await waitFor(/your wall is waiting/, "empty wall");
      await settle(350);
      act(() => {
        button((t) => t.includes("pick from vault")).click();
      });
      await waitFor(/choose a photo to pin/, "wall picker");
      await settle(250);
      act(() => {
        button((t) => t.includes("import from gallery")).click();
      });
      await drivePicker("wall");
      await waitUntil(
        () => Boolean(container.querySelector('img[src^="data:image"]')),
        "pinned polaroid photo",
      );

      // Drain trailing app timers (pin sparkle 1.1s, toast dismiss 4s)
      // inside act() so late setState can't fire out of scope.
      await act(async () => {
        await new Promise((r) => setTimeout(r, 5000));
      });

      expectNoBoundary();
      expectNoConsoleErrors();
    },
  );

  it(
    "lock from settings → lock screen appears",
    { retry: 2 },
    async () => {
      __mark("test6 start");
      go("/dashboard/settings");
      await waitFor(/delete everything|theme|about/i, "settings header (test6)");
      let lock: HTMLButtonElement | undefined;
      for (let i = 0; i < 60 && !lock; i++) {
        lock = [...container.querySelectorAll("button")].find(
          (b) => b.getAttribute("aria-label")?.includes("Lock your space"),
        );
        if (!lock) {
          await act(async () => { await new Promise((r) => setTimeout(r, 120)); });
        }
      }
      expect(lock, "lock button should exist in the header").toBeTruthy();
      await settle(350);
      act(() => { lock!.click(); });
      await waitFor(/enter your passcode|unlock|passcode/i, "lock screen");

      expectNoBoundary();
      expectNoConsoleErrors();
    },
  );
});
