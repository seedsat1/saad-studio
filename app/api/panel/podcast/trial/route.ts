import { NextRequest, NextResponse } from "next/server";
import { extractPanelToken, verifyPanelToken } from "@/lib/panel-auth";
import prismadb from "@/lib/prismadb";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const token = extractPanelToken(req);
  if (!token) {
    return NextResponse.json({ error: "Missing Authorization header." }, { status: 401 });
  }

  const verified = verifyPanelToken(token);
  if (!verified) {
    return NextResponse.json({ error: "Invalid or expired panel token." }, { status: 401 });
  }

  try {
    const userId = verified.userId;

    // Check if user has already claimed the podcast trial or is subscribed
    const existing = await prismadb.userSubscription.findUnique({
      where: { userId },
      select: {
        stripePriceId: true,
      },
    });

    // If stripePriceId is "podcast" (paid) or "podcast-trial" (trial claimed), they cannot activate again
    if (existing?.stripePriceId === "podcast-trial" || existing?.stripePriceId === "podcast") {
      return NextResponse.json({ error: "You have already claimed your 7-day free trial." }, { status: 400 });
    }

    const trialEnd = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days from now

    await prismadb.userSubscription.upsert({
      where: { userId },
      create: {
        userId,
        planId: "podcast",
        stripePriceId: "podcast-trial",
        stripeCurrentPeriodEnd: trialEnd,
      },
      update: {
        planId: "podcast",
        stripePriceId: "podcast-trial",
        stripeCurrentPeriodEnd: trialEnd,
      },
    });

    return NextResponse.json({ ok: true, renewsAt: trialEnd });
  } catch (err) {
    console.error("[panel/podcast/trial]", err);
    return NextResponse.json({ error: "Server error." }, { status: 500 });
  }
}
