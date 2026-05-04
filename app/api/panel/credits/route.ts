import { NextRequest, NextResponse } from "next/server";
import { extractPanelToken, verifyPanelToken } from "@/lib/panel-auth";
import { ensureUserRow } from "@/lib/credit-ledger";
import prismadb from "@/lib/prismadb";

export const dynamic = "force-dynamic";

/**
 * GET /api/panel/credits
 *
 * Lightweight endpoint — returns only the current credit balance.
 * Used by the Premiere plugin to refresh the credits display without
 * fetching all user data again.
 *
 * Authorization: Bearer ssp_...
 */
export async function GET(req: NextRequest) {
  const token = extractPanelToken(req);
  if (!token) {
    return NextResponse.json({ error: "Missing Authorization header." }, { status: 401 });
  }

  const verified = verifyPanelToken(token);
  if (!verified) {
    return NextResponse.json({ error: "Invalid or expired panel token." }, { status: 401 });
  }

  try {
    await ensureUserRow(verified.userId);

    const user = await prismadb.user.findUnique({
      where: { id: verified.userId },
      select: { creditBalance: true, isBanned: true },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found." }, { status: 404 });
    }
    if (user.isBanned) {
      return NextResponse.json({ error: "Account suspended." }, { status: 403 });
    }

    return NextResponse.json({ creditBalance: user.creditBalance });
  } catch (err) {
    console.error("[panel/credits]", err);
    return NextResponse.json({ error: "Server error." }, { status: 500 });
  }
}
