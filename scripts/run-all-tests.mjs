#!/usr/bin/env node
/**
 * Runs both suites and reports both.
 *
 * `npm run test:run && npm run test:integration` would stop at the first
 * failure, and the unit suite currently has pre-existing failures, so the
 * integration suite would never run and its result would be invisible. Here
 * both always run, both summaries are printed, and the exit code is non-zero if
 * either failed — so nothing is hidden in either direction.
 */

import { spawnSync } from "node:child_process";

const SUITES = [
  { name: "unit", args: ["vitest", "run"] },
  { name: "integration", args: ["vitest", "run", "--config", "vitest.integration.config.ts"] },
];

const results = [];

for (const suite of SUITES) {
  console.log(`\n\x1b[36m${"=".repeat(70)}\x1b[0m`);
  console.log(`\x1b[36m  ${suite.name} suite\x1b[0m`);
  console.log(`\x1b[36m${"=".repeat(70)}\x1b[0m\n`);

  const run = spawnSync("npx", suite.args, {
    stdio: "inherit",
    // npx is a .cmd shim on Windows and cannot be executed directly.
    shell: process.platform === "win32",
  });

  results.push({ name: suite.name, code: run.status ?? 1 });
}

console.log(`\n\x1b[36m${"=".repeat(70)}\x1b[0m`);
console.log("\x1b[36m  summary\x1b[0m");
console.log(`\x1b[36m${"=".repeat(70)}\x1b[0m`);
for (const r of results) {
  const label = r.code === 0 ? "\x1b[32mpassed\x1b[0m" : "\x1b[31mfailed\x1b[0m";
  console.log(`  ${r.name.padEnd(14)} ${label}`);
}
console.log();

process.exit(results.some((r) => r.code !== 0) ? 1 : 0);
