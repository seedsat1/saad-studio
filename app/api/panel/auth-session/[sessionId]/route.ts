import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { generatePanelToken } from "@/lib/panel-auth";
import { ensureUserRow } from "@/lib/credit-ledger";
import prismadb from "@/lib/prismadb";

export const dynamic = "force-dynamic";

const TTL_MS = 5 * 60 * 1000; // 5 minutes

const SESSION_RE = /^[a-zA-Z0-9_-]{8,64}$/;

async function purgeExpired() {
  await prismadb.panelAuthSession.deleteMany({
    where: { expiresAt: { lt: new Date() } },
  });
}

/** GET — plugin polls for result every 2.5 seconds */
export async function GET(
  _req: NextRequest,
  { params }: { params: { sessionId: string } },
) {
  const { sessionId } = params;
  if (!SESSION_RE.test(sessionId))
    return NextResponse.json({ error: "Invalid session id" }, { status: 400 });

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
}

/** POST — web connect page calls this once user is signed in */
export async function POST(
  _req: NextRequest,
  { params }: { params: { sessionId: string } },
) {
  const { sessionId } = params;
  if (!SESSION_RE.test(sessionId))
    return NextResponse.json({ error: "Invalid session id" }, { status: 400 });

  const { userId } = await auth();
  if (!userId)
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });

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

  await ensureUserRow(userId);
  const token = generatePanelToken(userId);

  await prismadb.panelAuthSession.update({
    where: { id: sessionId },
    data: { status: "approved", token },
  });

  return NextResponse.json({ ok: true });
}

