import path from "node:path";
import { defineConfig } from "vitest/config";

// Node environment, not jsdom — everything under test here is server-side
// (API routes, DB/validation helpers), not React components. Manual
// alias rather than a tsconfig-paths plugin dependency: the project only
// has one path mapping (`@/*` -> `src/*`, see tsconfig.json), not worth
// pulling in a plugin to resolve automatically.
export default defineConfig({
  test: {
    environment: "node",
    setupFiles: ["./vitest.setup.ts"],
    // Vitest's default file discovery (**/*.test.ts) would otherwise
    // also pick up anchor/tests/integration/full_flow.test.ts — a
    // separate, not-yet-runnable test suite with its own tooling
    // (anchor/package.json, anchor/tests/vitest.config.surfpool.ts),
    // not installed at the root and not meant to run from here.
    include: ["src/**/*.test.ts"],
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
    },
  },
});
