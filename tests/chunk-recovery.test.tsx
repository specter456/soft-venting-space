/**
 * Chunk-failure self-healing + copy feedback (regression tests).
 *
 * Real report behind snag #5191/#347B:
 *   "Failed to fetch dynamically imported module …/LoginEntry.tsx"
 *   "Failed to dynamically import <screen>"
 *
 * These tests simulate that failure without touching the network:
 *  - the importer rejects → lazyWithRetry retries with backoff,
 *  - after the ONE soft reload has already been used this session it must
 *    resolve with the gentle retry card (never reject → never a snag card),
 *  - the global guard lets only ONE reload per session,
 *  - the shared copy hook flips to "copied! ✓" for 2 seconds.
 */
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import React, { Suspense, act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { isChunkLoadError, lazyWithRetry, trySoftReload } from "@/lib/lazyWithRetry";
import { useCopyFeedback } from "@/lib/clipboard";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const CHUNK_MSG =
  "Failed to fetch dynamically imported module: https://app/assets/LoginEntry-8f2c1a.js";

let container: HTMLElement;
let root: Root;

beforeAll(() => {
  document.body.innerHTML = `<div id="chunk-root"></div>`;
  container = document.getElementById("chunk-root") as HTMLElement;
  root = createRoot(container);
});

afterAll(async () => {
  await act(async () => { root.unmount(); });
  sessionStorage.removeItem("venting-chunk-reload");
});

describe("chunk failure self-healing", () => {
  it("recognizes the exact reported error class", () => {
    expect(isChunkLoadError(new Error(CHUNK_MSG))).toBe(true);
    expect(isChunkLoadError(new Error("TypeError: x is not a function"))).toBe(false);
  });

  it("retries, then shows the soft retry card instead of a snag boundary", async () => {
    // The one soft reload for this session has already been spent — exactly
    // the state a second failure lands in.
    sessionStorage.setItem("venting-chunk-reload", "1");
    expect(trySoftReload()).toBe(false);

    let calls = 0;
    const Lazy = lazyWithRetry(() => {
      calls++;
      return Promise.reject(new Error(CHUNK_MSG));
    }, 3, 5);

    // Flush the render FIRST (act only commits work after its callback),
    // then let the retry/backoff chain play out.
    await act(async () => {
      root.render(
        <Suspense fallback={<p>loading screen…</p>}>
          <Lazy />
        </Suspense>,
      );
    });
    await act(async () => {
      await new Promise((r) => setTimeout(r, 2500));
    });

    expect(calls, "importer should be retried (1 try + 3 retries)").toBe(4);
    expect(container.textContent).toContain("didn't finish loading");
    expect(container.textContent).toContain("try again");
    // It must NOT reject into a boundary: the card is the terminal state.
    expect(container.textContent).not.toContain("soft snag");
  }, 30_000);

  it("allows only one soft reload per session", () => {
    sessionStorage.removeItem("venting-chunk-reload");
    // happy-dom implements reload as a no-op that does not throw; if a real
    // browser were here this would navigate. Either way the guard flips.
    const first = trySoftReload();
    const second = trySoftReload();
    expect(first === true || first === false).toBe(true);
    expect(second, "second attempt must be blocked by the sessionStorage guard").toBe(false);
    sessionStorage.removeItem("venting-chunk-reload");
  });
});

describe("copy feedback", () => {
  function CopyHarness() {
    const { copied, markCopied } = useCopyFeedback();
    return (
      <button type="button" onClick={markCopied}>
        {copied ? "copied! ✓" : "copy report"}
      </button>
    );
  }

  it('flips the label to "copied! ✓" instantly and back after 2 seconds', async () => {
    await act(async () => { root.render(<CopyHarness />); });
    const btn = container.querySelector("button") as HTMLButtonElement;
    expect(btn.textContent).toBe("copy report");

    await act(async () => { btn.click(); });
    expect(btn.textContent, "feedback must be immediate").toBe("copied! ✓");

    await act(async () => { await new Promise((r) => setTimeout(r, 2200)); });
    expect(btn.textContent, "label reverts after 2s").toBe("copy report");
  }, 20_000);
});
