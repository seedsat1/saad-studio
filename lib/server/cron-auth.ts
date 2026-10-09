/**
 * Shared authorization for the scheduled (cron) endpoints.
 *
 * Each of the six cron routes had grown its own check, and three of them
 * accepted the `x-vercel-cron: 1` request header as sufficient proof on its
 * own. That is only safe on Vercel, where the platform controls inbound
 * `x-vercel-*` headers. On a self-hosted server any client can send that header,
 * which would leave credit reconciliation, storage cleanup and the digest mailer
 * open to the internet. Two routes were worse still: they allowed the request
 * through when `CRON_SECRET` was simply unset.
 *
 * The replacement is one shared-secret check that behaves identically on both
 * hosts. Vercel sends `Authorization: Bearer $CRON_SECRET` automatically once
 * CRON_SECRET is set on the project, and a system crontab or external scheduler
 * can send the same header, so no host needs a special case.
 *
 * Deliberately not accepted:
 *  - `x-vercel-cron` on its own. Forgeable off-platform, and redundant on it.
 *  - The secret in a query string (`?key=` / `?secret=`). Query strings land in
 *    access logs, proxy logs and referrer headers.
 *
 * The check fails closed: a missing or too-short CRON_SECRET rejects every
 * request rather than letting them all through.
 */

import { timingSafeEqual } from "crypto";
import { NextResponse } from "next/server";

/** Vercel's own guidance is at least 16 characters. */
const MIN_SECRET_LENGTH = 16;

export type CronAuthResult =
  | { ok: true }
  | { ok: false; status: 401 | 403 | 503; reason: string };

/** Constant-time comparison that does not leak length through timing. */
function secretsMatch(provided: string, expected: string): boolean {
  const a = Buffer.from(provided, "utf8");
  const b = Buffer.from(expected, "utf8");
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

/** Reads the presented secret from either accepted header. */
function presentedSecret(req: Request): string | null {
  const authorization = req.headers.get("authorization");
  if (authorization) {
    const bearer = /^Bearer\s+(.+)$/i.exec(authorization.trim());
    if (bearer) {
      const value = bearer[1].trim();
      if (value) return value;
    }
  }

  const direct = req.headers.get("x-cron-secret")?.trim();
  if (direct) return direct;

  return null;
}

/**
 * Authorizes a scheduled request.
 *
 * Returns a 503 when the deployment itself is misconfigured, so a missing
 * secret is diagnosable instead of looking like a rejected caller.
 */
export function authorizeCronRequest(req: Request): CronAuthResult {
  const expected = process.env.CRON_SECRET?.trim();

  if (!expected) {
    return {
      ok: false,
      status: 503,
      reason: "CRON_SECRET is not configured on this deployment, so scheduled endpoints are disabled.",
    };
  }

  if (expected.length < MIN_SECRET_LENGTH) {
    return {
      ok: false,
      status: 503,
      reason: `CRON_SECRET must be at least ${MIN_SECRET_LENGTH} characters.`,
    };
  }

  const provided = presentedSecret(req);
  if (!provided) {
    return {
      ok: false,
      status: 401,
      reason: "Missing credentials. Send 'Authorization: Bearer <CRON_SECRET>'.",
    };
  }

  if (!secretsMatch(provided, expected)) {
    return { ok: false, status: 403, reason: "Invalid credentials." };
  }

  return { ok: true };
}

/**
 * Builds the rejection response. Kept here so all six routes answer a failed
 * cron call the same way.
 */
export function cronAuthFailureResponse(result: Extract<CronAuthResult, { ok: false }>): NextResponse {
  return NextResponse.json({ ok: false, error: result.reason }, { status: result.status });
}

/** Non-throwing configuration report for the health endpoint. */
export function describeCronSecret(): { configured: boolean; reason?: string } {
  const expected = process.env.CRON_SECRET?.trim();
  if (!expected) return { configured: false, reason: "CRON_SECRET is not set." };
  if (expected.length < MIN_SECRET_LENGTH) {
    return { configured: false, reason: `CRON_SECRET is shorter than ${MIN_SECRET_LENGTH} characters.` };
  }
  return { configured: true };
}
