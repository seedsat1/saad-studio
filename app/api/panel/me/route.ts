import { NextRequest, NextResponse } from "next/server";
import { extractPanelToken, verifyPanelToken } from "@/lib/panel-auth";
import { ensureUserRow } from "@/lib/credit-ledger";
import prismadb from "@/lib/prismadb";

export const dynamic = "force-dynamic";

const DAY_IN_MS = 86_400_000;

/** GET /api/panel/me — returns user info + credit balance + subscription for a panel token. */
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

    const [user, subscription] = await Promise.all([
      prismadb.user.findUnique({
        where: { id: verified.userId },
        select: {
          name: true,
          email: true,
          creditBalance: true,
          role: true,
          isBanned: true,
        },
      }),
      prismadb.userSubscription.findUnique({
        where: { userId: verified.userId },
        select: {
          planId: true,
          billingInterval: true,
          stripePriceId: true,
          stripeCurrentPeriodEnd: true,
        },
      }),
    ]);

    if (!user) {
      return NextResponse.json({ error: "User not found." }, { status: 404 });
    }
    if (user.isBanned) {
      return NextResponse.json({ error: "Account suspended." }, { status: 403 });
    }

    const subscriptionActive = !!(
      subscription?.stripePriceId &&
      subscription?.stripeCurrentPeriodEnd &&
      subscription.stripeCurrentPeriodEnd.getTime() + DAY_IN_MS > Date.now()
    );

    return NextResponse.json({
      userId: verified.userId,
      name: user.name,
      email: user.email,
      creditBalance: user.creditBalance,
      role: user.role,
      subscription: {
        active: subscriptionActive,
        planId: subscription?.planId ?? null,
        billingInterval: subscription?.billingInterval ?? null,
        renewsAt: subscription?.stripeCurrentPeriodEnd ?? null,
      },
    });
  } catch (err) {
    console.error("[panel/me]", err);
    return NextResponse.json({ error: "Server error." }, { status: 500 });
  }
}
