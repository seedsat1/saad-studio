/**
 * Runs once before the integration suite.
 *
 * Its job is to fail loudly and early when the local test database is not
 * there. The alternative — letting the suite start and watching every test
 * time out against a closed port — buries the real problem under thirty
 * identical connection errors.
 *
 * It deliberately does not start the container itself. Spawning Docker from
 * inside a test run makes the suite slow to fail, hard to interrupt, and
 * surprising when it leaves a container behind. `npm run test:db:up` is one
 * command, and the message below says so.
 */

import net from "node:net";

import { TEST_DATABASE_URL } from "./database";

function connectable(host: string, port: number, timeoutMs = 2000): Promise<boolean> {
  return new Promise((resolve) => {
    const socket = new net.Socket();
    const done = (result: boolean) => {
      socket.destroy();
      resolve(result);
    };
    socket.setTimeout(timeoutMs);
    socket.once("connect", () => done(true));
    socket.once("timeout", () => done(false));
    socket.once("error", () => done(false));
    socket.connect(port, host);
  });
}

export async function setup(): Promise<void> {
  const url = new URL(TEST_DATABASE_URL);
  const host = url.hostname;
  const port = Number(url.port || 5432);

  if (await connectable(host, port)) return;

  throw new Error(
    [
      "",
      "  ──────────────────────────────────────────────────────────────────",
      "  The integration suite needs the local test database, and nothing is",
      `  listening on ${host}:${port}.`,
      "",
      "  Start it with:",
      "      npm run test:db:up",
      "",
      "  That launches a throwaway Postgres in Docker and pushes the Prisma",
      "  schema into it. It is isolated from Neon and from production: a local",
      "  container on port 5433 with its own disposable data.",
      "",
      "  Stop it again with:",
      "      npm run test:db:down",
      "  ──────────────────────────────────────────────────────────────────",
      "",
    ].join("\n"),
  );
}
