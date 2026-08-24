/**
 * File-based bridge to the Saad Studio CEP panel.
 *
 * Protocol:
 *   Requests: <bridgeDir>/req/<uuid>.json    { fn: string, args: unknown[] }
 *   Responses: <bridgeDir>/res/<uuid>.json   { ok: boolean, result?: unknown, error?: string }
 *
 * The CEP panel polls <bridgeDir>/req/, executes each request via evalScript
 * against $.saadstudio.<fn>(...args), and writes the parsed return to
 * <bridgeDir>/res/. On success the panel deletes the request; on failure the
 * request is renamed with a `.err` suffix.
 *
 * The server owns request/response lifecycle: it deletes both files after
 * reading the response.
 */

import { promises as fs } from "node:fs";
import { existsSync, mkdirSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { randomUUID } from "node:crypto";

export interface BridgeResponse<T = unknown> {
  ok: boolean;
  result?: T;
  error?: string;
}

const DEFAULT_DIR = join(homedir(), ".saadstudio", "bridge");

function envDir(): string {
  return process.env.SAADSTUDIO_BRIDGE_DIR || DEFAULT_DIR;
}

export function bridgeDir(): string {
  const d = envDir();
  mkdirSync(join(d, "req"), { recursive: true });
  mkdirSync(join(d, "res"), { recursive: true });
  return d;
}

export function bridgeStatus(): { dir: string; ready: boolean; hint?: string } {
  const dir = bridgeDir();
  const stampFile = join(dir, "panel.alive");
  const ready = existsSync(stampFile);
  if (!ready) {
    return {
      dir,
      ready: false,
      hint: `The CEP panel is not polling this bridge. In Adobe: Window > Extensions > Saad Studio, open Settings > MCP, and start the bridge with directory: ${dir}`,
    };
  }
  return { dir, ready: true };
}

/** Send one call to the CEP panel and await its response. */
export async function callPanel<T = unknown>(
  fn: string,
  args: unknown[] = [],
  opts: { timeoutMs?: number } = {},
): Promise<BridgeResponse<T>> {
  const dir = bridgeDir();
  const id = randomUUID();
  const reqPath = join(dir, "req", `${id}.json`);
  const resPath = join(dir, "res", `${id}.json`);
  const errPath = join(dir, "req", `${id}.json.err`);
  const timeout = opts.timeoutMs ?? 15_000;

  await fs.writeFile(reqPath, JSON.stringify({ fn, args }), "utf8");

  const start = Date.now();
  while (Date.now() - start < timeout) {
    if (existsSync(resPath)) {
      const raw = await fs.readFile(resPath, "utf8");
      // Cleanup: remove both request and response after reading.
      await Promise.allSettled([fs.rm(resPath, { force: true }), fs.rm(reqPath, { force: true })]);
      try {
        return JSON.parse(raw) as BridgeResponse<T>;
      } catch (e) {
        return { ok: false, error: `Malformed response JSON: ${(e as Error).message}` };
      }
    }
    if (existsSync(errPath)) {
      const raw = await fs.readFile(errPath, "utf8").catch(() => "{}");
      await fs.rm(errPath, { force: true }).catch(() => undefined);
      try {
        const p = JSON.parse(raw);
        return { ok: false, error: p.error || "Panel reported an error." };
      } catch {
        return { ok: false, error: "Panel reported an error (unparseable)." };
      }
    }
    await sleep(120);
  }
  // Timeout — cleanup the pending request.
  await fs.rm(reqPath, { force: true }).catch(() => undefined);
  return {
    ok: false,
    error: `Timed out after ${timeout}ms waiting for the Saad Studio CEP panel. Open Premiere/AE, load Saad Studio, and start the MCP bridge from its Settings page.`,
  };
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}
