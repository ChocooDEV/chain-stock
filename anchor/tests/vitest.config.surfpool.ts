import { defineConfig } from "vitest/config";

// Mirrors the solana-foundation/pay-kit pattern referenced in
// .agents/skills/solana-dev/references/testing.md — Surfpool-backed
// suites run serially, not in parallel workers.
export default defineConfig({
  test: {
    include: ["integration/**/*.test.ts"],
    fileParallelism: false,
    maxWorkers: 1,
    testTimeout: 60_000,
    hookTimeout: 60_000,
  },
});
