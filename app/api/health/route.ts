/**
 * Deployment readiness probe.
 *
 * Two depths, because a container health check and a post-deploy verification
 * want different things:
 *
 *  - `GET /api/health` is the liveness/readiness check. It pings the database
 *    and confirms the configuration the app cannot run without. Cheap enough to
 *    poll every 30 seconds, which is what the Dockerfile HEALTHCHECK does.
 *  - `GET /api/health?full=1` additionally probes the ffmpeg binary and reports
 *    the storage providers. Run this once after a deploy: it is what catches an
 *    image whose bundled ffmpeg cannot execute.
 *
 * The response deliberately reports booleans and names, never values, so it is
 * safe to expose without authentication. It is listed as a public route in
 * middleware.ts; without that Clerk would answer 401 and the container would
 * never report healthy.
 */

import { NextResponse } from "next/server";

import prismadb from "@/lib/prismadb";
import { describeCronSecret } from "@/lib/server/cron-auth";
import { describeFfmpeg } from "@/lib/server/ffmpeg-path";
import { getStorageProviderRegistry } from "@/lib/storage/provider-registry";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Env vars the app genuinely cannot serve a request without. */
const REQUIRED_ENV = [
  "DATABASE_URL",
  "CLERK_SECRET_KEY",
  "NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY",
] as const;

/**
 * Env vars whose absence degrades a feature but still lets the site serve.
 * Reported so a misconfigured host is visible before a user finds it.
 */
const RECOMMENDED_ENV = [
  "DIRECT_URL",
  "NEXT_PUBLIC_APP_URL",
  "ALLOWED_ORIGINS",
  "CRON_SECRET",
  "STRIPE_API_KEY",
] as const;

/** A short timeout so a wedged database surfaces as unhealthy, not as a hang. */
const DB_TIMEOUT_MS = 5_000;

async function pingDatabase(): Promise<{ ok: boolean; latencyMs: number; error?: string }> {
  const startedAt = Date.now();
  try {
    await Promise.race([
      prismadb.$queryRaw`SELECT 1`,
      new Promise((_, reject) => setTimeout(() => reject(new Error("timeout")), DB_TIMEOUT_MS)),
    ]);
    return { ok: true, latencyMs: Date.now() - startedAt };
  } catch (error) {
    // This endpoint is unauthenticated, so the driver's message is not echoed:
    // Prisma connection errors quote the host, port and database name. The
    // detail stays in the container log, where it belongs.
    console.error("[health] database check failed:", error);
    const timedOut = error instanceof Error && error.message === "timeout";
    return {
      ok: false,
      latencyMs: Date.now() - startedAt,
      error: timedOut ? `No response within ${DB_TIMEOUT_MS}ms.` : "Query failed; see the server log.",
    };
  }
}

function missingFrom(names: readonly string[]): string[] {
  return names.filter((name) => !process.env[name]?.trim());
}

export async function GET(req: Request) {
  const full = new URL(req.url).searchParams.get("full") === "1";

  const database = await pingDatabase();
  const missingRequired = missingFrom(REQUIRED_ENV);
  const missingRecommended = missingFrom(RECOMMENDED_ENV);

  const checks: Record<string, unknown> = {
    database,
    env: {
      ok: missingRequired.length === 0,
      missingRequired,
      missingRecommended,
    },
    cron: describeCronSecret(),
  };

  if (full) {
    checks.ffmpeg = await describeFfmpeg();
    try {
      checks.storage = getStorageProviderRegistry().map((provider) => ({
        id: provider.id,
        configured: provider.configured,
        status: provider.status,
      }));
    } catch (error) {
      checks.storage = { error: error instanceof Error ? error.message : "Storage registry failed." };
    }
  }

  // Only the database and required env decide readiness. ffmpeg and the cron
  // secret are reported but do not flap the container: a missing ffmpeg breaks
  // video export, not page serving, and is better surfaced by the full check.
  const healthy = database.ok && missingRequired.length === 0;

  return NextResponse.json(
    {
      ok: healthy,
      status: healthy ? "healthy" : "unhealthy",
      timestamp: new Date().toISOString(),
      checks,
    },
    {
      status: healthy ? 200 : 503,
      headers: { "Cache-Control": "no-store" },
    },
  );
}
