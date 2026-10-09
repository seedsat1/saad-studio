/**
 * Shared access to the local integration-test database.
 *
 * Everything in test/integration/ talks to a throwaway Postgres container, not
 * to Neon. The connection string is a constant rather than something read from
 * the environment: an integration test that silently picks up whatever
 * DATABASE_URL happens to be set is exactly the failure this whole arrangement
 * exists to prevent.
 */

import { PrismaClient } from "@prisma/client";

/**
 * Must stay in step with docker-compose.test.yml and scripts/test-db.mjs.
 * Loopback, port 5433 rather than 5432, and a database name that could not be
 * mistaken for anything real.
 */
export const TEST_DATABASE_URL =
  "postgresql://saad_test:saad_test@localhost:5433/saad_studio_test";

let client: PrismaClient | null = null;

/** The one client the integration suite shares, created on first use. */
export function testPrisma(): PrismaClient {
  if (!client) {
    client = new PrismaClient({
      datasources: { db: { url: TEST_DATABASE_URL } },
      log: ["warn", "error"],
    });
  }
  return client;
}

export async function disconnectTestPrisma(): Promise<void> {
  if (client) {
    await client.$disconnect();
    client = null;
  }
}

/**
 * Empties every table, keeping the schema.
 *
 * TRUNCATE ... CASCADE in one statement rather than per-model deletes: it
 * ignores foreign-key ordering, which matters with 57 models, and it resets
 * identity sequences so a test cannot accidentally depend on an id from a
 * previous run.
 */
export async function resetDatabase(): Promise<void> {
  const prisma = testPrisma();
  await prisma.$executeRawUnsafe(`
    DO $$
    DECLARE r record;
    BEGIN
      FOR r IN (SELECT tablename FROM pg_tables WHERE schemaname = 'public') LOOP
        EXECUTE 'TRUNCATE TABLE public.' || quote_ident(r.tablename) || ' RESTART IDENTITY CASCADE';
      END LOOP;
    END $$;
  `);
}

/** Unique-enough ids for fixtures, so tests cannot collide with each other. */
let counter = 0;
export function fixtureId(prefix: string): string {
  counter += 1;
  return `${prefix}_test_${process.pid}_${counter}`;
}
