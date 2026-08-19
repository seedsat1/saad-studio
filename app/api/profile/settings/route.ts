import { auth, clerkClient } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import prismadb from "@/lib/prismadb";
import { SAAD_PLANS } from "@/lib/pricing-models";
import { isWithinLastTwoMonthsOfSubscription } from "@/lib/credit-ledger";
import {
  getNotificationPreferences,
  updateNotificationPreferences,
  type NotificationPreferences,
} from "@/lib/notifications";

function inferPlan(stripePriceId?: string | null, hasSubscription?: boolean) {
  const id = (stripePriceId ?? "").toLowerCase();
  if (id.includes("max") || id.includes("ultra")) return "Max";
  if (id.includes("plus")) return "Plus";
  if (id.includes("pro") || hasSubscription) return "Pro";
  if (id.includes("starter") || id.includes("basic")) return "Starter";
  return "Free";
}

function inferPlanId(stripePriceId?: string | null, hasSubscription?: boolean) {
  const id = (stripePriceId ?? "").toLowerCase();
  if (id.includes("max") || id.includes("ultra")) return "max";
  if (id.includes("pro") || hasSubscription) return "pro";
  if (id.includes("plus")) return "plus";
  if (id.includes("starter") || id.includes("basic")) return "starter";
  return "free";
}

function sameCycleEnd(a: Date | null | undefined, b: Date | null | undefined): boolean {
  return Boolean(a && b && a.getTime() === b.getTime());
}

function isMissingCreditAdvanceColumn(error: unknown) {
  if (!error || typeof error !== "object") return false;
  const code = (error as { code?: string }).code;
  const message = String((error as { message?: string }).message ?? "");
  return code === "P2022" && message.includes("creditAdvance");
}

async function findSettingsUser(userId: string) {
  try {
    return {
      row: await prismadb.user.findUnique({
        where: { id: userId },
        select: {
          name: true,
          email: true,
          phone: true,
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
        name: true,
        email: true,
        phone: true,
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
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const [userResult, subscription, notifications] = await Promise.all([
      findSettingsUser(userId),
      prismadb.userSubscription.findUnique({
        where: { userId },
        select: {
          planId: true,
          stripePriceId: true,
          stripeCurrentPeriodEnd: true,
          stripeSubscriptionId: true,
          billingInterval: true,
        },
      }),
      getNotificationPreferences(userId),
    ]);
    const userRow = userResult.row;

    // STRICT TIMING: no grace period — subscription ends at the exact moment
    // stripeCurrentPeriodEnd passes.
    const subscriptionActive = Boolean(
      subscription?.stripeCurrentPeriodEnd &&
        subscription.stripeCurrentPeriodEnd.getTime() > Date.now(),
    );
    const inferredPlanId = subscription?.planId ?? inferPlanId(subscription?.stripePriceId, Boolean(subscription?.stripeSubscriptionId));
    const planCredits = SAAD_PLANS.find((p) => p.id === inferredPlanId)?.credits ?? 0;
    const monthlyCredits = Math.max(0, Math.floor(planCredits || userRow?.monthlyCredits || 0));

    const isWithinLastTwoMonths = isWithinLastTwoMonthsOfSubscription(subscription?.stripeCurrentPeriodEnd);

    return NextResponse.json({
      profile: {
        name: userRow?.name ?? "",
        email: userRow?.email ?? "",
        phone: userRow?.phone ?? "",
      },
      subscription: {
        plan: inferPlan(subscription?.stripePriceId, Boolean(subscription?.stripeSubscriptionId)),
        planId: inferredPlanId,
        active: subscriptionActive,
        billingInterval: subscription?.billingInterval ?? null,
        nextBillingAt: subscription?.stripeCurrentPeriodEnd?.toISOString() ?? null,
      },
      credits: Math.max(0, Math.floor(userRow?.creditBalance ?? 0)),
      notifications,
      creditAdvance: {
        balance: Math.max(0, Math.floor(userRow?.creditAdvanceBalance ?? 0)),
        requestedAt: userRow?.creditAdvanceRequestedAt?.toISOString() ?? null,
        cycleEnd: userRow?.creditAdvanceCycleEnd?.toISOString() ?? null,
        available: Boolean(
          userResult.advanceColumnsReady &&
          subscriptionActive &&
            subscription?.billingInterval === "annual" &&
            monthlyCredits > 0 &&
            !isWithinLastTwoMonths &&
            userRow?.creditsExpireAt &&
            !sameCycleEnd(userRow.creditAdvanceCycleEnd, userRow.creditsExpireAt),
        ),
        amount: monthlyCredits,
        needsMigration: !userResult.advanceColumnsReady,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load settings.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    if (body?.notifications && typeof body.notifications === "object") {
      const allowed: Array<keyof NotificationPreferences> = [
        "emailReceipts",
        "creditAlerts",
        "paymentConfirm",
        "productUpdates",
        "weeklyDigest",
      ];
      const partial: Partial<NotificationPreferences> = {};
      for (const key of allowed) {
        if (typeof body.notifications[key] === "boolean") {
          partial[key] = body.notifications[key];
        }
      }
      const notifications = await updateNotificationPreferences(userId, partial);
      return NextResponse.json({ notifications });
    }

    const updateData: { name?: string; email?: string; phone?: string | null } = {};

    if (typeof body?.name === "string") {
      const trimmedName = body.name.trim();
      if (!trimmedName) return NextResponse.json({ error: "Name cannot be empty." }, { status: 400 });
      updateData.name = trimmedName;
    }

    if (typeof body?.email === "string") {
      const trimmedEmail = body.email.trim();
      if (!trimmedEmail) return NextResponse.json({ error: "Email cannot be empty." }, { status: 400 });
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
        return NextResponse.json({ error: "Invalid email format." }, { status: 400 });
      }
      updateData.email = trimmedEmail;
    }

    if (typeof body?.phone === "string") {
      updateData.phone = body.phone.trim() || null;
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ error: "No valid profile fields provided to update." }, { status: 400 });
    }

    const updated = await prismadb.user.update({
      where: { id: userId },
      data: updateData,
      select: { name: true, email: true, phone: true },
    });

    return NextResponse.json({ profile: updated });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to update settings.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

function isPrismaTableMissingError(error: unknown) {
  if (!error || typeof error !== "object") return false;
  const code = (error as { code?: string }).code;
  return code === "P2021";
}

async function safeDelete(op: () => Promise<unknown>) {
  try {
    await op();
  } catch (error) {
    if (isPrismaTableMissingError(error)) return;
    throw error;
  }
}

export async function DELETE() {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    await safeDelete(() => prismadb.variationOutput.deleteMany({ where: { userId } }));
    await safeDelete(() => prismadb.variationJob.deleteMany({ where: { userId } }));
    await safeDelete(() => prismadb.variationProject.deleteMany({ where: { userId } }));

    await safeDelete(() => prismadb.transitionOutput.deleteMany({ where: { userId } }));
    await safeDelete(() => prismadb.transitionJob.deleteMany({ where: { userId } }));
    await safeDelete(() => prismadb.transitionProject.deleteMany({ where: { userId } }));

    await safeDelete(() => prismadb.cinemaJob.deleteMany({ where: { userId } }));
    await safeDelete(() => prismadb.cinemaProject.deleteMany({ where: { userId } }));

    await safeDelete(() => prismadb.generation.deleteMany({ where: { userId } }));
    await safeDelete(() => prismadb.adminTransaction.deleteMany({ where: { userId } }));

    await safeDelete(() => prismadb.userSubscription.deleteMany({ where: { userId } }));
    await safeDelete(() => prismadb.userApiLimit.deleteMany({ where: { userId } }));

    await safeDelete(() => prismadb.user.deleteMany({ where: { id: userId } }));

    const clerk = await clerkClient();
    await clerk.users.deleteUser(userId).catch(() => {});

    return NextResponse.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to delete account.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
