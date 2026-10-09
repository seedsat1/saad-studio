/**
 * Refuses to let the test suite talk to a production database.
 *
 * Why this exists: 24 test files import `prismadb`, and several of them issue
 * real queries — `credit-reconciler.test.ts` opens with
 * `runCreditReconciliation({ dryRun: true })`, which scans live accounts. Vitest
 * loads the project's .env files, so a plain `npm test` on a machine holding
 * production credentials pointed those queries at the production database. They
 * were reads, but nothing in the setup made that true by design, and a future
 * test that writes would have had the same reach.
 *
 * The rule here is an allowlist, not a blocklist: a connection string is
 * rejected unless its host is one we can be certain is not production. Guessing
 * which remote hosts are "probably safe" is how this kind of guard fails.
 *
 * Loaded from test/setup.ts, which Vitest runs before a test file is imported —
 * so this throws before `lib/prismadb.ts` ever constructs a PrismaClient.
 */

/** Hosts that cannot be production: loopback, and the reserved documentation ranges. */
const ALLOWED_HOSTS = new Set([
  "localhost",
  "127.0.0.1",
  "0.0.0.0",
  "::1",
  "[::1]",
  // Reachable from inside a container to a database on the host.
  "host.docker.internal",
]);

/**
 * RFC 5737 TEST-NET ranges and RFC 3849 documentation IPv6. These are reserved
 * for documentation and examples, are never routed, and so are ideal for
 * "deliberately unreachable" test values.
 */
const ALLOWED_HOST_PATTERNS = [
  /^192\.0\.2\.\d{1,3}$/, // TEST-NET-1
  /^198\.51\.100\.\d{1,3}$/, // TEST-NET-2
  /^203\.0\.113\.\d{1,3}$/, // TEST-NET-3
  /^\[?2001:db8:/i, // IPv6 documentation prefix
];

/** Escape hatch for a real, deliberately provisioned remote test database. */
const OVERRIDE_FLAG = "VITEST_ALLOW_REMOTE_DB";

export const SAFE_TEST_DATABASE_URL =
  "postgresql://vitest:vitest@198.51.100.1:5432/saad_studio_test?connect_timeout=2";

function hostOf(connectionString: string): string | null {
  try {
    // The postgres:// scheme is not special-cased by WHATWG URL, but the
    // authority is parsed the same way, which is all we need.
    return new URL(connectionString).hostname.toLowerCase();
  } catch {
    return null;
  }
}

function isAllowedHost(host: string): boolean {
  if (ALLOWED_HOSTS.has(host)) return true;
  return ALLOWED_HOST_PATTERNS.some((pattern) => pattern.test(host));
}

export interface DbSafetyVerdict {
  ok: boolean;
  host: string | null;
  reason?: string;
}

/** Pure check, exported so a test can assert the guard itself behaves. */
export function checkDatabaseUrl(
  connectionString: string | undefined,
  allowRemote = false,
): DbSafetyVerdict {
  if (!connectionString?.trim()) {
    // No URL at all is safe: Prisma simply cannot connect.
    return { ok: true, host: null };
  }

  const host = hostOf(connectionString);
  if (!host) {
    return { ok: false, host: null, reason: "the connection string could not be parsed" };
  }
  if (isAllowedHost(host)) return { ok: true, host };
  if (allowRemote) return { ok: true, host };

  return {
    ok: false,
    host,
    reason: `"${host}" is not a local or reserved-documentation host`,
  };
}

/**
 * Asserts that every database variable in the environment is safe, and throws
 * with instructions if not. Called for its side effect from test/setup.ts.
 */
export function assertTestDatabaseIsSafe(env: NodeJS.ProcessEnv = process.env): void {
  const allowRemote = env[OVERRIDE_FLAG] === "1";

  for (const name of ["DATABASE_URL", "DIRECT_URL"] as const) {
    const verdict = checkDatabaseUrl(env[name], allowRemote);
    if (verdict.ok) continue;

    throw new Error(
      [
        "",
        "  ──────────────────────────────────────────────────────────────────",
        "  Test run stopped: a database that may be production was configured.",
        "",
        `    ${name} points at ${verdict.host ?? "an unparseable host"}`,
        `    ${verdict.reason}`,
        "",
        "  The suite is not allowed to reach a remote database, because several",
        "  tests issue real queries through lib/prismadb.ts.",
        "",
        "  To run the tests safely, do nothing: vitest.config.ts already supplies",
        "  an unreachable default. This error means something overrode it — most",
        "  often a DATABASE_URL exported in your shell.",
        "",
        "  To use a local Postgres instead:",
        "    DATABASE_URL=postgresql://user:pass@localhost:5432/saad_test npm test",
        "",
        `  To use a real remote test database you have provisioned on purpose,`,
        `  and that is definitely not production, set ${OVERRIDE_FLAG}=1.`,
        "  ──────────────────────────────────────────────────────────────────",
        "",
      ].join("\n"),
    );
  }
}
