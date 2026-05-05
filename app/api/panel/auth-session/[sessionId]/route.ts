import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { generatePanelToken } from "@/lib/panel-auth";
import { ensureUserRow } from "@/lib/credit-ledger";

export const dynamic = "force-dynamic";

const TTL = 5 * 60 * 1000; // 5 minutes

type Session = {
  status: "pending" | "approved";
  token?: string;
  createdAt: number;
};

// Survive Next.js hot-reloads in dev via global
declare global {
  // eslint-disable-next-line no-var
  var __panelAuthSessions: Map<string, Session> | undefined;
}
const db: Map<string, Session> =
  global.__panelAuthSessions ??
  (global.__panelAuthSessions = new Map<string, Session>());

const SESSION_RE = /^[a-zA-Z0-9_-]{8,64}$/;

function purge() {
  const cut = Date.now() - TTL;
  for (const [k, v] of db) if (v.createdAt < cut) db.delete(k);
}

/** GET — plugin polls for result every 2.5 seconds */
export async function GET(
  _req: NextRequest,
  { params }: { params: { sessionId: string } },
) {
  purge();
  const { sessionId } = params;
  if (!SESSION_RE.test(sessionId))
    return NextResponse.json({ error: "Invalid session id" }, { status: 400 });

  let s = db.get(sessionId);
  if (!s) {
    // First poll — register the session as pending
    s = { status: "pending", createdAt: Date.now() };
    db.set(sessionId, s);
    return NextResponse.json({ status: "pending" });
  }

  if (Date.now() - s.createdAt > TTL) {
    db.delete(sessionId);
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
  purge();
  const { sessionId } = params;
  if (!SESSION_RE.test(sessionId))
    return NextResponse.json({ error: "Invalid session id" }, { status: 400 });

  const s = db.get(sessionId);
  if (!s || Date.now() - s.createdAt > TTL)
    return NextResponse.json(
      { error: "Session not found or expired." },
      { status: 404 },
    );

  const { userId } = await auth();
  if (!userId)
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });

  await ensureUserRow(userId);
  s.status = "approved";
  s.token = generatePanelToken(userId);

  return NextResponse.json({ ok: true });
}
