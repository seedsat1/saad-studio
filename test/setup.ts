import "@testing-library/jest-dom";

import { assertTestDatabaseIsSafe } from "./db-safety";

// Runs before any test file is imported, and therefore before lib/prismadb.ts
// can construct a PrismaClient. Throws if DATABASE_URL or DIRECT_URL point
// anywhere that could be production. See test/db-safety.ts for the reasoning.
assertTestDatabaseIsSafe();
