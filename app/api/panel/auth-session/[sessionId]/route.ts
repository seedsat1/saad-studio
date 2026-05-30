import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { generatePanelToken } from "@/lib/panel-auth";
import { ensureUserRow } from "@/lib/credit-ledger";
import prismadb from "@/lib/prismadb";
import { getRequestIp, hitRateLimit, panelRateLimitResponse } from "@/lib/panel-rate-limit";

export const dynamic = "force-dynamic";

const TTL_MS = 5 * 60 * 1000; // 5 minutes

const SESSION_RE = /^[a-zA-Z0-9_-]{8,64}$/;

async function purgeExpired() {
  await prismadb.panelAuthSession.deleteMany({
    where: { expiresAt: { lt: new Date() } },
  });
}

/** Wraps a handler so any thrown exception comes back as a JSON 500 with
 *  a readable error message — never an empty body. Empty 500s break the
 *  callers (panel poll + web connect page) that try to .json() the body
 *  and surface the cryptic "Unexpected end of JSON input" toast. */
async function runHandler(
  fn: () => Promise<NextResponse>,
  label: string,
): Promise<NextResponse> {
  try {
    return await fn();
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`[panel/auth-session/${label}]`, err);
    return NextResponse.json(
      { error: `${label} failed: ${message}` },
      { status: 500 },
    );
  }
}

/** GET — plugin polls for result every 2.5 seconds */
export async function GET(
  req: NextRequest,
  { params }: { params: { sessionId: string } },
) {
  return runHandler(async () => {
    const { sessionId } = params;
    if (!SESSION_RE.test(sessionId))
      return NextResponse.json({ error: "Invalid session id" }, { status: 400 });

    const rate = hitRateLimit({
      key: `panel:auth-session:get:${sessionId}:${getRequestIp(req.headers)}`,
      limit: 90,
      windowMs: 5 * 60_000,
    });
    if (!rate.allowed) {
      return panelRateLimitResponse(rate.retryAfterSec);
    }

    await purgeExpired();

    let s = await prismadb.panelAuthSession.findUnique({ where: { id: sessionId } });

    if (!s) {
      // First poll — register the session as pending
      s = await prismadb.panelAuthSession.create({
        data: {
          id: sessionId,
          status: "pending",
          expiresAt: new Date(Date.now() + TTL_MS),
        },
      });
      return NextResponse.json({ status: "pending" });
    }

    if (s.expiresAt < new Date()) {
      await prismadb.panelAuthSession.delete({ where: { id: sessionId } });
      return NextResponse.json({ status: "expired" });
    }

    return NextResponse.json(
      s.status === "approved"
        ? { status: "approved", token: s.token }
        : { status: "pending" },
    );
  }, "GET");
}

/** POST — web connect page calls this once user is signed in */
export async function POST(
  req: NextRequest,
  { params }: { params: { sessionId: string } },
) {
  return runHandler(async () => {
    const { sessionId } = params;
    if (!SESSION_RE.test(sessionId))
      return NextResponse.json({ error: "Invalid session id" }, { status: 400 });

    const { userId } = await auth();
    if (!userId)
      return NextResponse.json({ error: "Not signed in." }, { status: 401 });

    const rate = hitRateLimit({
      key: `panel:auth-session:post:${userId}:${sessionId}:${getRequestIp(req.headers)}`,
      limit: 20,
      windowMs: 5 * 60_000,
    });
    if (!rate.allowed) {
      return panelRateLimitResponse(rate.retryAfterSec);
    }

    await purgeExpired();

    let s = await prismadb.panelAuthSession.findUnique({ where: { id: sessionId } });

    // If the browser POSTs before the plugin's first GET poll, create the session now
    if (!s) {
      s = await prismadb.panelAuthSession.create({
        data: {
          id: sessionId,
          status: "pending",
          expiresAt: new Date(Date.now() + TTL_MS),
        },
      });
    } else if (s.expiresAt < new Date()) {
      await prismadb.panelAuthSession.delete({ where: { id: sessionId } });
      return NextResponse.json({ error: "Session expired." }, { status: 410 });
    }

    // Charge the user row + token mint individually so a Prisma error in
    // one step doesn't crash the whole route with an opaque stack.
    try { await ensureUserRow(userId); }
    catch (err) {
      console.error("[panel/auth-session POST] ensureUserRow failed", err);
      return NextResponse.json(
        { error: `Could not initialise user row: ${(err as Error).message}` },
        { status: 500 },
      );
    }

    let token: string;
    try { token = generatePanelToken(userId); }
    catch (err) {
      console.error("[panel/auth-session POST] generatePanelToken failed", err);
      return NextResponse.json(
        { error: `Token signing failed: ${(err as Error).message}` },
        { status: 500 },
      );
    }

    try {
      await prismadb.panelAuthSession.update({
        where: { id: sessionId },
        data: { status: "approved", token },
      });
    } catch (err) {
      console.error("[panel/auth-session POST] session update failed", err);
      return NextResponse.json(
        { error: `Could not save approved session: ${(err as Error).message}` },
        { status: 500 },
      );
    }

    return NextResponse.json({ ok: true });
  }, "POST");
}

