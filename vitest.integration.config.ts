import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "path";

import { TEST_DATABASE_URL } from "./test/integration/database";

/**
 * Integration suite — `npm run test:integration`.
 *
 * Runs only test/integration/**, against the throwaway Postgres container
 * defined in docker-compose.test.yml. These tests are expected to pass; they
 * are separated from the unit suite because they need a database, not because
 * they are allowed to fail. Nothing here is skipped — if the database is
 * missing, global-setup.ts stops the run with instructions rather than letting
 * the suite report green.
 *
 * The connection string is pinned, so neither .env nor a shell variable can
 * redirect these tests at Neon.
 */
export default defineConfig({
  plugins: [react()],
  test: {
    environment: "node",
    setupFiles: "./test/setup.ts",
    globalSetup: "./test/integration/global-setup.ts",
    globals: true,
    include: ["test/integration/**/*.test.ts", "test/integration/**/*.test.tsx"],
    exclude: ["**/node_modules/**", "**/dist/**"],
    env: {
      DATABASE_URL: TEST_DATABASE_URL,
      DIRECT_URL: TEST_DATABASE_URL,
    },
    // Each file truncates and seeds its own rows, so they must not interleave.
    fileParallelism: false,
    // A real database is slower than a mock, and the first connection pays for
    // pool setup.
    testTimeout: 30_000,
    hookTimeout: 30_000,
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "."),
    },
  },
});
