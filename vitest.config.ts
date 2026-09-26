import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "node:path";

// Smoke-test config — the app needs a DOM, so the environment is happy-dom.
// Aliases mirror the app's "@/" convention. No .env files are read here;
// the smoke run is fully offline and local-only.
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: { "@": path.resolve(__dirname, "src") },
  },
  test: {
    environment: "happy-dom",
    globals: false,
    include: ["tests/**/*.test.tsx", "tests/**/*.test.ts"],
    // forks (child processes) instead of worker_threads: the DOM-heavy app
    // boot under happy-dom + threads hangs this environment indefinitely;
    // forks completes reliably and isolates crashes better.
    pool: "forks",
  },
});
