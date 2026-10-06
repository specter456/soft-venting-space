import async_hooks from "node:async_hooks";
import { startVitest } from "vitest/node";

// ─── Microtask-storm detector ──────────────────────────────────────────
// The 5191 freeze class: an endless promise chain starves the event loop so
// even timers can't fire. async_hooks counts promise creations; if the count
// explodes, dump the stack of the exact call site creating them.
let promiseCount = 0;
const hook = async_hooks.createHook({
  init(asyncId, type) {
    if (type === "PROMISE") {
      promiseCount++;
      if (promiseCount === 100_000) {
        console.error(`\n[storm] 100k promises created — dumping creator stack:\n${new Error().stack}\n`);
        process.exit(99);
      }
    }
  },
});
hook.enable();

// Boots vitest programmatically and hard-exits afterwards — the smoke test
// mounts the real app (timers, IndexedDB shim, WebAudio stubs) which can leave
// live handles that would otherwise keep the process alive forever.
let failed = true;
try {
  failed = await startVitest("test", ["tests/smoke.test.tsx"], {
    watch: false,
    run: true,
    // The tour waits out real tap-guards and AnimatePresence exits and the
    // first visit to each lazy screen pays a one-off transform cost, so the
    // stock 5s/15s budgets kill the signup flow mid-act and cascade failures.
    testTimeout: 60000,
    hookTimeout: 60000,
    reporters: ["default"],
  });
} catch (err) {
  console.error("smoke runner crashed:", err);
  process.exit(1);
}
process.exit(failed ? 1 : 0);
