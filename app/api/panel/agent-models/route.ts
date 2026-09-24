import { NextRequest, NextResponse } from "next/server";
import { extractPanelToken, verifyPanelToken } from "@/lib/panel-auth";
import { ensureUserRow } from "@/lib/credit-ledger";
import prismadb from "@/lib/prismadb";
import { getRuntimeAgentModels, resolveAgentEntitlement } from "@/lib/agent-model-runtime";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const token = extractPanelToken(req);
  if (!token) return NextResponse.json({ error: "Missing Authorization header." }, { status: 401 });
  const verified = verifyPanelToken(token);
  if (!verified) return NextResponse.json({ error: "Invalid or expired panel token." }, { status: 401 });

  const userId = verified.userId;
  await ensureUserRow(userId);

  const [user, subscription, models] = await Promise.all([
    prismadb.user.findUnique({
      where: { id: userId },
      select: { isBanned: true, creditBalance: true },
    }),
    prismadb.userSubscription.findUnique({
      where: { userId },
      select: { planId: true, stripeCurrentPeriodEnd: true },
    }),
    getRuntimeAgentModels(),
  ]);

  if (!user) return NextResponse.json({ error: "User not found." }, { status: 404 });
  if (user.isBanned) return NextResponse.json({ error: "Account suspended." }, { status: 403 });

  const safeModels = models.map((model) => {
    const entitlement = resolveAgentEntitlement({ model, subscription });
    return {
      id: model.id,
      displayName: model.displayName,
      tier: model.tier,
      provider: model.provider,
      category: model.category,
      enabled: model.enabled,
      available: entitlement.allowed,
      unavailableReason: entitlement.allowed ? null : entitlement.reason,
      default: model.isDefault,
      autoSelectable: model.autoSelectable && entitlement.allowed,
      manualSelectable: model.manualSelectable && entitlement.allowed,
      maxCreditsPerRequest: model.maxCreditsPerRequest ?? null,
      creditPolicy: {
        unit: "actual_usage_tokens",
        minimumCredits: 1,
        maximumCredits: model.maxCreditsPerRequest !== undefined
          ? Math.min(user.creditBalance, model.maxCreditsPerRequest)
          : user.creditBalance,
        markupMultiplier: model.pricing.markupMultiplier,
      },
      capabilities: model.capabilities,
    };
  });

  return NextResponse.json(
    {
      models: safeModels,
      sourceOfTruth: "agent_model_registry",
      subscription: {
        active: Boolean(subscription?.stripeCurrentPeriodEnd && subscription.stripeCurrentPeriodEnd.getTime() > Date.now()),
        planId: subscription?.planId ?? null,
      },
    },
    { headers: { "Cache-Control": "private, no-store" } },
  );
}
