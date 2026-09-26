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
    // The app is 100% local (IndexedDB/localStorage) — no network mocking needed.
  },
});
