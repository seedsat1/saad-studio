import prismadb from "@/lib/prismadb";
import { AdBreakpoint, ResolvedPromotion } from "./types";
import { deserializeAdCampaign } from "./ad-campaign-serializer";

export interface ResolvePromotionsOptions {
  pageRoute: string;
  breakpoint?: AdBreakpoint;
  userId?: string | null;
  userPlan?: string | null;
}

/**
 * Authoritative runtime resolver for promotions on any subscriber page.
 * Evaluates schedule, page targeting, audience targeting, priority ordering, and responsive placement.
 */
export async function resolveActivePromotions(
  options: ResolvePromotionsOptions
): Promise<ResolvedPromotion[]> {
  const { pageRoute, breakpoint = "desktop", userId, userPlan } = options;

  const now = new Date();

  // Query active campaigns that haven't expired, including normalized placements
  const rows = await prismadb.adCampaign.findMany({
    where: {
      isActive: true,
      OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
    },
    include: {
      placements: true,
    },
    orderBy: { createdAt: "desc" },
  });

  const resolved: ResolvedPromotion[] = [];

  for (const row of rows) {
    const campaign = deserializeAdCampaign(row);

    // 1. Verify schedule start date
    if (campaign.startDate) {
      const startTime = new Date(campaign.startDate).getTime();
      if (!Number.isNaN(startTime) && startTime > now.getTime()) {
        continue; // Not yet active
      }
    }

    // 2. Verify page targeting
    const isTargetPage =
      campaign.targetPages.includes("ALL") ||
      campaign.targetPages.includes(pageRoute) ||
      campaign.targetPages.some((p) => p.toLowerCase() === pageRoute.toLowerCase());

    if (!isTargetPage) {
      continue;
    }

    // 3. Verify audience targeting
    const target = campaign.audience;
    const isAuthenticated = Boolean(userId);
    const plan = (userPlan || "free").toLowerCase();
    const isPaid = ["starter", "pro", "max", "custom", "enterprise"].includes(plan);
    const isProOrMax = ["pro", "max"].includes(plan);

    if (target === "GUESTS" && isAuthenticated) continue;
    if (target === "AUTHENTICATED" && !isAuthenticated) continue;
    if (target === "FREE_TIER" && (isAuthenticated && isPaid)) continue;
    if (target === "PAID_SUBSCRIBERS" && !isPaid) continue;
    if (target === "PRO_MAX_ONLY" && !isProOrMax) continue;

    // 4. Resolve responsive placement geometry for this page
    const pagePlacements =
      campaign.placements[pageRoute] ||
      campaign.placements["ALL"] ||
      Object.values(campaign.placements)[0];

    const geometry =
      pagePlacements?.[breakpoint] ||
      pagePlacements?.desktop || {
        xPct: 50,
        yPct: 50,
        widthPct: 40,
        anchor: "center",
        placementMode: "FLOATING",
      };

    resolved.push({
      id: campaign.id,
      title: campaign.title,
      headline: campaign.headline || campaign.title,
      description: campaign.description || "",
      mediaType: campaign.mediaType,
      mediaUrl: campaign.mediaUrl,
      ctaLabel: campaign.ctaLabel || null,
      ctaUrl: campaign.ctaUrl || null,
      ctaTarget: campaign.ctaTarget || "_self",
      placementFamily: campaign.type,
      placementMode: geometry.placementMode || "FLOATING",
      geometry,
      theme: campaign.theme,
      animation: campaign.animation,
      priority: campaign.priority,
      dismissible: campaign.dismissible,
      dismissalModel: campaign.dismissalModel,
      expiresAt: campaign.expiresAt || null,
    });
  }

  // Deterministic ordering: highest priority first, then tiebreak by id
  resolved.sort((a, b) => b.priority - a.priority || a.id.localeCompare(b.id));

  return resolved;
}
