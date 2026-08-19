import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { resolveActivePromotions } from "@/lib/ads/runtime-resolver";
import { AdBreakpoint } from "@/lib/ads/types";
import prismadb from "@/lib/prismadb";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const pageRoute = searchParams.get("page") || "/dashboard";
    const breakpoint = (searchParams.get("breakpoint") || "desktop") as AdBreakpoint;

    let userId: string | null = null;
    let userPlan: string | null = null;

    try {
      const authSession = await auth();
      userId = authSession.userId || null;
      if (userId) {
        const sub = await prismadb.userSubscription.findUnique({
          where: { userId },
          select: { planId: true },
        });
        userPlan = sub?.planId || "free";
      }
    } catch {
      // Unauthenticated / guest mode
    }

    const promotions = await resolveActivePromotions({
      pageRoute,
      breakpoint,
      userId,
      userPlan,
    });

    return NextResponse.json({
      ok: true,
      promotions,
    });
  } catch (error) {
    console.error("[ADS_API_ERROR]", error);
    return NextResponse.json({ ok: false, promotions: [] }, { status: 500 });
  }
}
