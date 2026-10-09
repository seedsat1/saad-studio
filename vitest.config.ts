import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "path";

import { SAFE_TEST_DATABASE_URL } from "./test/db-safety";

/**
 * Unit suite — `npm test`.
 *
 * No database. test/integration/** is excluded and runs under
 * vitest.integration.config.ts against a real local Postgres instead.
 *
 * Database variables are pinned here because Vitest loads the project's .env
 * files, and those hold production credentials on a developer machine. Several
 * modules construct a PrismaClient on import, so without this a plain
 * `npm test` reaches the production database. Values set here take precedence
 * over anything dotenv loaded, and over a DATABASE_URL exported in the shell:
 * pointing the suite at another database has to be deliberate, which is what
 * the integration config is for. test/setup.ts verifies the result either way.
 */
export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    setupFiles: "./test/setup.ts",
    globals: true,
    include: ["test/**/*.test.ts", "test/**/*.test.tsx"],
    exclude: [
      "**/node_modules/**",
      "**/.claude/**",
      "**/seedsat1/**",
      "**/dist/**",
      // Owned by vitest.integration.config.ts.
      "test/integration/**",
    ],
    env: {
      DATABASE_URL: SAFE_TEST_DATABASE_URL,
      DIRECT_URL: SAFE_TEST_DATABASE_URL,
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "."),
    },
  },
});
