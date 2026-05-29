import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { generatePanelToken } from "@/lib/panel-auth";
import { ensureUserRow } from "@/lib/credit-ledger";
import { getRequestIp, hitRateLimit, panelRateLimitResponse } from "@/lib/panel-rate-limit";

export const dynamic = "force-dynamic";

/** POST /api/panel/token — generates a panel access token for the logged-in Clerk user. */
export async function POST(req: Request) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Please sign in first." }, { status: 401 });
    }
    const ip = getRequestIp(req.headers);
    const rate = hitRateLimit({
      key: `panel:token:${userId}:${ip}`,
      limit: 8,
      windowMs: 60_000,
    });
    if (!rate.allowed) {
      return panelRateLimitResponse(rate.retryAfterSec);
    }
    await ensureUserRow(userId);
    const token = generatePanelToken(userId);
    return NextResponse.json({ token });
  } catch (err) {
    console.error("[panel/token]", err);
    return NextResponse.json({ error: "Failed to generate token." }, { status: 500 });
  }
}
