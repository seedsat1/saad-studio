import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "path";

import { SAFE_TEST_DATABASE_URL } from "./test/db-safety";

/**
 * Database variables for the test run.
 *
 * Vitest loads the project's .env files, and those hold production credentials
 * on a developer machine. Several test files query through lib/prismadb.ts, so
 * without this block `npm test` reaches the production database. Values set
 * here take precedence over anything dotenv loaded.
 *
 * A plain DATABASE_URL exported in the shell is deliberately ignored: pointing
 * the suite at a different database has to be a conscious act, which is what
 * TEST_DATABASE_URL is for. test/setup.ts verifies the result either way.
 */
const testDatabaseUrl = process.env.TEST_DATABASE_URL?.trim() || SAFE_TEST_DATABASE_URL;
const testDirectUrl = process.env.TEST_DIRECT_URL?.trim() || testDatabaseUrl;

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    setupFiles: "./test/setup.ts",
    globals: true,
    include: ["test/**/*.test.ts", "test/**/*.test.tsx"],
    exclude: ["**/node_modules/**", "**/.claude/**", "**/seedsat1/**", "**/dist/**"],
    env: {
      DATABASE_URL: testDatabaseUrl,
      DIRECT_URL: testDirectUrl,
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "."),
    },
  },
});
