import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import prismadb from "@/lib/prismadb";
import { SAAD_PLANS } from "@/lib/pricing-models";

type UsageBuckets = {
  images: number;
  videos: number;
  music: number;
  models3d: number;
};

function mapAssetTypeToUsage(raw: string, usage: UsageBuckets) {
  const t = raw.toUpperCase();
  if (t === "AUDIO") {
    usage.music += 1;
    return;
  }
  if (t === "VIDEO") {
    usage.videos += 1;
    return;
  }
  if (t === "3D") {
    usage.models3d += 1;
    return;
  }
  if (t === "IMAGE" || t === "IMAGE_LEGACY" || t === "VARIATION" || t === "TRANSITION") {
    usage.images += 1;
  }
}

function mapAssetTypeToRecentType(raw: string): "Image" | "Video" | "Audio" | "3D" {
  const t = raw.toUpperCase();
  if (t === "AUDIO") return "Audio";
  if (t === "VIDEO") return "Video";
  if (t === "3D") return "3D";
  return "Image";
}

function inferPlanId(stripePriceId?: string | null, hasSubscription?: boolean) {
  const id = (stripePriceId ?? "").toLowerCase();
  if (id.includes("max") || id.includes("ultra")) return "max";
  if (id.includes("pro") || hasSubscription) return "pro";
  if (id.includes("plus")) return "plus";
  if (id.includes("starter") || id.includes("basic")) return "starter";
  return "free";
}

function isMissingCreditAdvanceColumn(error: unknown) {
  if (!error || typeof error !== "object") return false;
  const code = (error as { code?: string }).code;
  const message = String((error as { message?: string }).message ?? "");
  return code === "P2022" && message.includes("creditAdvance");
}

async function findOverviewUser(userId: string) {
  try {
    return {
      row: await prismadb.user.findUnique({
        where: { id: userId },
        select: {
          creditBalance: true,
          monthlyCredits: true,
          creditsExpireAt: true,
          creditAdvanceBalance: true,
          creditAdvanceRequestedAt: true,
          creditAdvanceCycleEnd: true,
        },
      }),
      advanceColumnsReady: true,
    };
  } catch (error) {
    if (!isMissingCreditAdvanceColumn(error)) throw error;
    const row = await prismadb.user.findUnique({
      where: { id: userId },
      select: {
        creditBalance: true,
        monthlyCredits: true,
        creditsExpireAt: true,
      },
    });

    return {
      row: row
        ? {
            ...row,
            creditAdvanceBalance: 0,
            creditAdvanceRequestedAt: null,
            creditAdvanceCycleEnd: null,
          }
        : null,
      advanceColumnsReady: false,
    };
  }
}

export async function GET() {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const [userResult, subscription, projectCounts, recentRows, allRows] = await Promise.all([
      findOverviewUser(userId),
      prismadb.userSubscription.findUnique({
        where: { userId },
        select: {
          planId: true,
          billingInterval: true,
          stripePriceId: true,
          stripeSubscriptionId: true,
          stripeCurrentPeriodEnd: true,
        },
      }),
      Promise.all([
        prismadb.cinemaProject.count({ where: { userId } }),
        prismadb.variationProject.count({ where: { userId } }),
        prismadb.transitionProject.count({ where: { userId } }),
        prismadb.generation.count({ where: { userId, assetType: "editor_project" } }),
      ]),
      prismadb.generation.findMany({
        where: {
          userId,
          AND: [{ mediaUrl: { not: null } }, { NOT: { mediaUrl: { startsWith: "task:" } } }],
        },
        orderBy: { createdAt: "desc" },
        take: 4,
        select: {
          id: true,
          prompt: true,
          assetType: true,
          createdAt: true,
        },
      }),
      prismadb.generation.findMany({
        where: {
          userId,
          AND: [{ mediaUrl: { not: null } }, { NOT: { mediaUrl: { startsWith: "task:" } } }],
        },
        select: { assetType: true },
      }),
    ]);
    const userRow = userResult.row;

    const usage: UsageBuckets = { images: 0, videos: 0, music: 0, models3d: 0 };
    for (const row of allRows) {
      mapAssetTypeToUsage(row.assetType, usage);
    }

    const totalGenerations = usage.images + usage.videos + usage.music + usage.models3d;
    const totalProjects = projectCounts.reduce((sum, n) => sum + n, 0);

    const recentActivity = recentRows.map((row) => ({
      id: row.id,
      label: row.prompt?.trim()
        ? row.prompt.trim().slice(0, 72)
        : `Generated ${mapAssetTypeToRecentType(row.assetType).toLowerCase()} asset`,
      type: mapAssetTypeToRecentType(row.assetType),
      createdAt: row.createdAt.toISOString(),
    }));
    const subscriptionActive = Boolean(
      subscription?.stripeCurrentPeriodEnd &&
        subscription.stripeCurrentPeriodEnd.getTime() > Date.now(),
    );
    const inferredPlanId = subscription?.planId ??
      inferPlanId(subscription?.stripePriceId, Boolean(subscription?.stripeSubscriptionId));
    const planCredits = SAAD_PLANS.find((p) => p.id === inferredPlanId)?.credits ?? 0;
    const monthlyCredits = Math.max(0, Math.floor(planCredits || userRow?.monthlyCredits || 0));

    const sixtyDaysMs = 60 * 24 * 60 * 60 * 1000;
    const isWithinLastTwoMonths = Boolean(
      subscription?.stripeCurrentPeriodEnd &&
        Date.now() >= subscription.stripeCurrentPeriodEnd.getTime() - sixtyDaysMs
    );

    return NextResponse.json({
      credits: Math.max(0, Math.floor(userRow?.creditBalance ?? 0)),
      creditAdvance: {
        balance: Math.max(0, Math.floor(userRow?.creditAdvanceBalance ?? 0)),
        requestedAt: userRow?.creditAdvanceRequestedAt?.toISOString?.() ?? null,
        cycleEnd: userRow?.creditAdvanceCycleEnd?.toISOString?.() ?? null,
        available: Boolean(
          userResult.advanceColumnsReady &&
          subscriptionActive &&
            subscription?.billingInterval === "annual" &&
            monthlyCredits > 0 &&
            !isWithinLastTwoMonths &&
            !(
              userRow?.creditAdvanceCycleEnd &&
              userRow?.creditsExpireAt &&
              userRow.creditAdvanceCycleEnd.getTime() === userRow.creditsExpireAt.getTime()
            ),
        ),
        amount: monthlyCredits,
        needsMigration: !userResult.advanceColumnsReady,
      },
      subscription: {
        // STRICT TIMING: no grace period of any kind.
        active: subscriptionActive,
        planId: inferredPlanId,
        billingInterval: subscription?.billingInterval ?? null,
        renewsAt: subscription?.stripeCurrentPeriodEnd?.toISOString() ?? null,
      },
      topStats: {
        generations: totalGenerations,
        projects: totalProjects,
      },
      usage,
      recentActivity,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load profile overview.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
