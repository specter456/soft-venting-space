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
// startVitest resolves to the Vitest *instance* (not a boolean), so the old
// `process.exit(failed ? 1 : 0)` exited 1 even on a fully green run.
// The real verdict comes from the runner state: failed tests + unhandled
// errors (an unhandled rejection / post-teardown crash must fail the smoke).
let vitest;
try {
  vitest = await startVitest("test", ["tests/smoke.test.tsx"], {
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
if (!vitest) {
  console.error("smoke runner: vitest did not start");
  process.exit(1);
}
const failedTests = vitest.state.getCountOfFailedTests();
const unhandled = vitest.state.getUnhandledErrors();
if (unhandled.length) {
  console.error(`\n[smoke] ${unhandled.length} unhandled error(s):`);
  for (const err of unhandled) console.error(String(err?.stack ?? err));
}
if (failedTests > 0) console.error(`\n[smoke] ${failedTests} failing test(s)`);
process.exit(failedTests > 0 || unhandled.length > 0 ? 1 : 0);
