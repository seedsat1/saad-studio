#!/usr/bin/env node
/**
 * Lifecycle for the local integration-test database.
 *
 *   node scripts/test-db.mjs up      start the container and push the schema
 *   node scripts/test-db.mjs push    push the schema only
 *   node scripts/test-db.mjs status  is it running and reachable
 *   node scripts/test-db.mjs reset   wipe every row, keep the schema
 *   node scripts/test-db.mjs down    stop the container and drop its data
 *
 * Every command that can write runs `assertIsTestDatabase` first, so a stray
 * DATABASE_URL in the environment can never redirect `prisma db push` at a real
 * database. That guard is the point of this file: `prisma db push` against
 * production would rewrite the schema of the live system.
 *
 * The connection string is a constant here rather than an input. There is no
 * flag to point these commands somewhere else, because there is no good reason
 * to and one very bad one.
 */

import { execFileSync, spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import path from "node:path";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const COMPOSE_FILE = path.join(ROOT, "docker-compose.test.yml");
const CONTAINER = "saad-studio-test-db";

/** Must match docker-compose.test.yml. Loopback and port 5433 are deliberate. */
export const TEST_DATABASE_URL =
  "postgresql://saad_test:saad_test@localhost:5433/saad_studio_test";

const GREEN = (s) => `\x1b[32m${s}\x1b[0m`;
const CYAN = (s) => `\x1b[36m${s}\x1b[0m`;
const RED = (s) => `\x1b[31m${s}\x1b[0m`;
const YELLOW = (s) => `\x1b[33m${s}\x1b[0m`;

const log = (s) => console.log(`\n${CYAN("==>")} ${s}`);
const ok = (s) => console.log(`    ${GREEN("ok")} ${s}`);
const warn = (s) => console.log(`    ${YELLOW("!!")} ${s}`);
const die = (s) => {
  console.error(`\n${RED("XX")} ${s}\n`);
  process.exit(1);
};

/**
 * Refuses to continue unless the target is unmistakably the local test
 * database. Host, port and database name all have to match; a URL that is
 * merely "local-looking" is not enough, because a developer's own Postgres on
 * 5432 could hold anything.
 */
function assertIsTestDatabase(url) {
  let parsed;
  try {
    parsed = new URL(url);
  } catch {
    die(`the connection string could not be parsed: ${url}`);
  }
  const host = parsed.hostname.toLowerCase();
  const database = parsed.pathname.replace(/^\//, "");

  const localHosts = new Set(["localhost", "127.0.0.1", "::1", "[::1]"]);
  if (!localHosts.has(host)) die(`refusing to operate on a non-local host: ${host}`);
  if (parsed.port !== "5433") die(`refusing: expected port 5433, got ${parsed.port || "(default)"}`);
  if (database !== "saad_studio_test") die(`refusing: expected database saad_studio_test, got ${database}`);
}

function docker(args, opts = {}) {
  return spawnSync("docker", args, { stdio: "inherit", shell: false, ...opts });
}

function dockerOut(args) {
  const r = spawnSync("docker", args, { encoding: "utf8", shell: false });
  return (r.stdout || "").trim();
}

function requireDocker() {
  const r = spawnSync("docker", ["info", "--format", "{{.ServerVersion}}"], { encoding: "utf8" });
  if (r.status !== 0 || !r.stdout?.trim()) {
    die(
      "Docker is not responding.\n" +
        "   Start Docker Desktop (or the docker service) and try again.\n" +
        `   ${(r.stderr || "").trim().split("\n")[0] ?? ""}`,
    );
  }
  return r.stdout.trim();
}

function isRunning() {
  return dockerOut(["ps", "--filter", `name=^${CONTAINER}$`, "--format", "{{.Names}}"]) === CONTAINER;
}

function isHealthy() {
  return dockerOut(["inspect", "--format", "{{.State.Health.Status}}", CONTAINER]) === "healthy";
}

function waitHealthy(timeoutMs = 90_000) {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    if (isHealthy()) return true;
    execFileSync(process.execPath, ["-e", "setTimeout(()=>{},1500)"], { stdio: "ignore" });
  }
  return false;
}

function up() {
  requireDocker();
  log("Starting the test database");
  if (isRunning()) {
    ok(`${CONTAINER} is already running`);
  } else {
    const r = docker(["compose", "-f", COMPOSE_FILE, "up", "-d", "test-db"]);
    if (r.status !== 0) die("docker compose up failed");
  }
  process.stdout.write("    waiting for it to accept connections");
  if (!waitHealthy()) {
    console.log();
    docker(["compose", "-f", COMPOSE_FILE, "logs", "--tail=30", "test-db"]);
    die("the database never became healthy");
  }
  console.log();
  ok("accepting connections on 127.0.0.1:5433");
  push();
}

function push() {
  assertIsTestDatabase(TEST_DATABASE_URL);
  if (!isRunning()) die("the test database is not running — run: npm run test:db:up");

  log("Pushing the Prisma schema");
  console.log(`    target: ${TEST_DATABASE_URL}`);
  // The URLs are passed explicitly rather than inherited, so whatever is in
  // .env or exported in the shell cannot influence where this writes.
  //
  // shell: true on Windows because npx is a .cmd shim there, which
  // CreateProcess cannot execute directly — without it spawnSync fails with no
  // output at all, which looks like prisma failing when it never ran.
  //
  // Prisma also loads .env by itself, but dotenv does not overwrite a variable
  // that is already set, so the two URLs below win.
  const r = spawnSync(
    "npx",
    ["prisma", "db", "push", "--skip-generate", "--accept-data-loss"],
    {
      stdio: "inherit",
      cwd: ROOT,
      shell: process.platform === "win32",
      env: {
        ...process.env,
        DATABASE_URL: TEST_DATABASE_URL,
        DIRECT_URL: TEST_DATABASE_URL,
      },
    },
  );
  if (r.status !== 0) die("prisma db push failed");
  ok("schema is in place");
}

function status() {
  requireDocker();
  log("Test database");
  if (!isRunning()) {
    warn(`${CONTAINER} is not running — start it with: npm run test:db:up`);
    process.exit(1);
  }
  ok(`${CONTAINER} running, health=${dockerOut(["inspect", "--format", "{{.State.Health.Status}}", CONTAINER])}`);
  console.log(`    url: ${TEST_DATABASE_URL}`);
  const tables = dockerOut([
    "exec", CONTAINER, "psql", "-U", "saad_test", "-d", "saad_studio_test", "-tAc",
    "select count(*) from information_schema.tables where table_schema='public'",
  ]);
  console.log(`    tables in public schema: ${tables || "?"}`);
}

function reset() {
  assertIsTestDatabase(TEST_DATABASE_URL);
  if (!isRunning()) die("the test database is not running — run: npm run test:db:up");
  log("Truncating every table");
  // Faster and safer than dropping the schema: keeps structure, clears rows.
  const sql =
    "DO $$ DECLARE r record; BEGIN " +
    "FOR r IN (SELECT tablename FROM pg_tables WHERE schemaname='public') LOOP " +
    "EXECUTE 'TRUNCATE TABLE public.' || quote_ident(r.tablename) || ' RESTART IDENTITY CASCADE'; " +
    "END LOOP; END $$;";
  const r = docker(["exec", CONTAINER, "psql", "-U", "saad_test", "-d", "saad_studio_test", "-v", "ON_ERROR_STOP=1", "-c", sql]);
  if (r.status !== 0) die("truncate failed");
  ok("all rows removed, schema kept");
}

function down() {
  requireDocker();
  log("Stopping the test database");
  // -v removes the volume. The data is disposable by design.
  const r = docker(["compose", "-f", COMPOSE_FILE, "down", "-v"]);
  if (r.status !== 0) die("docker compose down failed");
  ok("stopped and its data removed");
}

const command = process.argv[2] ?? "status";
const commands = { up, push, status, reset, down };

if (!commands[command]) {
  console.error(`unknown command: ${command}\nexpected one of: ${Object.keys(commands).join(", ")}`);
  process.exit(2);
}
commands[command]();
