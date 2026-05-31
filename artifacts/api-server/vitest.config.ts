import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
    // The integration tests share a single Postgres connection and create or
    // delete real rows, so they must not run in parallel against each other.
    fileParallelism: false,
    hookTimeout: 30000,
    testTimeout: 30000,
  },
});
