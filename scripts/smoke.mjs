import { startVitest } from "vitest/node";

// Boots vitest programmatically and hard-exits afterwards — the smoke test
// mounts the real app (timers, IndexedDB shim, WebAudio stubs) which can leave
// live handles that would otherwise keep the process alive forever.
let failed = true;
try {
  failed = await startVitest("test", ["tests/smoke.test.tsx"], {
    watch: false,
    run: true,
    testTimeout: 15000,
    hookTimeout: 15000,
    reporters: ["default"],
  });
} catch (err) {
  console.error("smoke runner crashed:", err);
  process.exit(1);
}
process.exit(failed ? 1 : 0);
