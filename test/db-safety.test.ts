import { describe, expect, it } from "vitest";

import { SAFE_TEST_DATABASE_URL, assertTestDatabaseIsSafe, checkDatabaseUrl } from "./db-safety";

/**
 * The guard that keeps the suite away from a production database. It is the
 * only thing standing between `npm test` and the live data, so it carries its
 * own tests rather than being trusted because it looks right.
 */
describe("test database safety guard", () => {
  describe("hosts that are accepted", () => {
    it.each([
      ["loopback by name", "postgresql://u:p@localhost:5432/saad_test"],
      ["loopback by address", "postgresql://u:p@127.0.0.1:5432/saad_test"],
      ["IPv6 loopback", "postgresql://u:p@[::1]:5432/saad_test"],
      ["the host from a container", "postgresql://u:p@host.docker.internal:5432/saad_test"],
      ["TEST-NET-1", "postgresql://u:p@192.0.2.5:5432/db"],
      ["TEST-NET-2", "postgresql://u:p@198.51.100.1:5432/db"],
      ["TEST-NET-3", "postgresql://u:p@203.0.113.9:5432/db"],
      ["the built-in default", SAFE_TEST_DATABASE_URL],
    ])("allows %s", (_label, url) => {
      expect(checkDatabaseUrl(url).ok).toBe(true);
    });

    it("allows an absent URL, because Prisma then cannot connect at all", () => {
      expect(checkDatabaseUrl(undefined).ok).toBe(true);
      expect(checkDatabaseUrl("").ok).toBe(true);
      expect(checkDatabaseUrl("   ").ok).toBe(true);
    });
  });

  describe("hosts that are refused", () => {
    // Hostnames below are examples, not anyone's real infrastructure.
    it.each([
      ["a Neon endpoint", "postgresql://u:p@ep-example-00000.eu-central-1.aws.neon.tech:5432/neondb"],
      ["an RDS endpoint", "postgresql://u:p@db.ctexample.eu-west-1.rds.amazonaws.com:5432/app"],
      ["a Supabase pooler", "postgresql://u:p@db.exampleref.supabase.co:6543/postgres"],
      ["a bare public IP", "postgresql://u:p@203.0.114.9:5432/app"],
      ["any other hostname", "postgresql://u:p@db.internal.example.com:5432/app"],
    ])("refuses %s", (_label, url) => {
      const verdict = checkDatabaseUrl(url);
      expect(verdict.ok).toBe(false);
      expect(verdict.reason).toMatch(/not a local or reserved-documentation host/);
    });

    it("refuses a string it cannot parse, rather than assuming it is harmless", () => {
      const verdict = checkDatabaseUrl("not a connection string");
      expect(verdict.ok).toBe(false);
      expect(verdict.reason).toMatch(/could not be parsed/);
    });

    it("is an allowlist: a host merely containing 'localhost' does not pass", () => {
      expect(checkDatabaseUrl("postgresql://u:p@localhost.attacker.example:5432/db").ok).toBe(false);
    });
  });

  describe("the deliberate override", () => {
    const remote = "postgresql://u:p@ep-example-00000.eu-central-1.aws.neon.tech:5432/neondb";

    it("still refuses the host without the flag", () => {
      expect(checkDatabaseUrl(remote, false).ok).toBe(false);
    });

    it("accepts it once the flag is passed", () => {
      expect(checkDatabaseUrl(remote, true).ok).toBe(true);
    });
  });

  describe("assertTestDatabaseIsSafe", () => {
    it("passes for a safe environment", () => {
      expect(() =>
        assertTestDatabaseIsSafe({ DATABASE_URL: SAFE_TEST_DATABASE_URL, DIRECT_URL: SAFE_TEST_DATABASE_URL }),
      ).not.toThrow();
    });

    it("throws on DATABASE_URL, naming the host and how to recover", () => {
      expect(() =>
        assertTestDatabaseIsSafe({ DATABASE_URL: "postgresql://u:p@db.example.com:5432/app" }),
      ).toThrow(/Test run stopped[\s\S]*db\.example\.com[\s\S]*VITEST_ALLOW_REMOTE_DB/);
    });

    it("also checks DIRECT_URL, which prisma migrate uses", () => {
      expect(() =>
        assertTestDatabaseIsSafe({
          DATABASE_URL: SAFE_TEST_DATABASE_URL,
          DIRECT_URL: "postgresql://u:p@db.example.com:5432/app",
        }),
      ).toThrow(/DIRECT_URL points at db\.example\.com/);
    });

    it("honours the override flag", () => {
      expect(() =>
        assertTestDatabaseIsSafe({
          DATABASE_URL: "postgresql://u:p@db.example.com:5432/app",
          VITEST_ALLOW_REMOTE_DB: "1",
        }),
      ).not.toThrow();
    });

    it("treats any value other than exactly '1' as not overriding", () => {
      expect(() =>
        assertTestDatabaseIsSafe({
          DATABASE_URL: "postgresql://u:p@db.example.com:5432/app",
          VITEST_ALLOW_REMOTE_DB: "true",
        }),
      ).toThrow(/Test run stopped/);
    });
  });

  it("guards the environment this very run is using", () => {
    // If the config regressed, the suite is already talking to something it
    // should not be, and this fails rather than passing quietly.
    expect(checkDatabaseUrl(process.env.DATABASE_URL).ok).toBe(true);
  });
});
