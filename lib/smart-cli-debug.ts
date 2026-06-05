/**
 * Best-effort OAuth/MCP failure capture.
 *
 * Writes diagnostic events to a `_smart_cli_debug` table that's created
 * lazily — no migration required. Use `logSmartCliDebug({ ... })` from
 * any route that wants its failure inspected from /admin/smart-cli-debug.
 *
 * Never throws — debug logging must never break the route it's logging.
 */

import prismadb from "@/lib/prismadb";

let tableReady = false;

async function ensureTable() {
  if (tableReady) return;
  try {
    await prismadb.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "_smart_cli_debug" (
        id            BIGSERIAL PRIMARY KEY,
        created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
        route         TEXT        NOT NULL,
        kind          TEXT        NOT NULL,
        message       TEXT,
        request_ip    TEXT,
        user_agent    TEXT,
        origin        TEXT,
        payload       JSONB
      );
    `);
    await prismadb.$executeRawUnsafe(`
      CREATE INDEX IF NOT EXISTS "_smart_cli_debug_created_at_idx"
      ON "_smart_cli_debug" (created_at DESC);
    `);
    tableReady = true;
  } catch {
    // Suppress — we don't want diagnostic plumbing to break OAuth.
  }
}

export interface SmartCliDebugInput {
  route: string;
  kind: string;
  message?: string | null;
  request?: Request;
  payload?: Record<string, unknown>;
}

export async function logSmartCliDebug(input: SmartCliDebugInput): Promise<void> {
  try {
    await ensureTable();
    const headers = input.request?.headers;
    const ip =
      headers?.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      headers?.get("x-real-ip") ||
      null;
    const ua = headers?.get("user-agent") ?? null;
    const origin = headers?.get("origin") ?? headers?.get("referer") ?? null;

    await prismadb.$executeRawUnsafe(
      `INSERT INTO "_smart_cli_debug" (route, kind, message, request_ip, user_agent, origin, payload)
       VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb)`,
      input.route,
      input.kind,
      input.message ?? null,
      ip,
      ua,
      origin,
      JSON.stringify(input.payload ?? {}),
    );
  } catch {
    // Never throw from a debug logger.
  }
}

export interface SmartCliDebugRow {
  id: string;
  createdAt: string;
  route: string;
  kind: string;
  message: string | null;
  requestIp: string | null;
  userAgent: string | null;
  origin: string | null;
  payload: Record<string, unknown> | null;
}

export async function fetchSmartCliDebug(limit = 30): Promise<SmartCliDebugRow[]> {
  try {
    await ensureTable();
    const rows = await prismadb.$queryRawUnsafe<Array<{
      id: bigint;
      created_at: Date;
      route: string;
      kind: string;
      message: string | null;
      request_ip: string | null;
      user_agent: string | null;
      origin: string | null;
      payload: unknown;
    }>>(
      `SELECT id, created_at, route, kind, message, request_ip, user_agent, origin, payload
       FROM "_smart_cli_debug"
       ORDER BY created_at DESC
       LIMIT $1`,
      Math.max(1, Math.min(200, limit)),
    );
    return rows.map((r) => ({
      id: r.id.toString(),
      createdAt: r.created_at.toISOString(),
      route: r.route,
      kind: r.kind,
      message: r.message,
      requestIp: r.request_ip,
      userAgent: r.user_agent,
      origin: r.origin,
      payload: (r.payload as Record<string, unknown>) ?? null,
    }));
  } catch {
    return [];
  }
}
