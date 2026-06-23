import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/is-admin";
import prismadb from "@/lib/prismadb";
import { estimateProviderCostSync } from "@/lib/pricing";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const isUserAdmin = await isAdmin();
    if (!isUserAdmin) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    // 1. Calculate actualCreditValue per user to compute recognized revenue
    const allUsers = await prismadb.user.findMany({ select: { id: true, email: true } });
    const allTxs = await prismadb.adminTransaction.findMany({
      where: { paymentStatus: "COMPLETED" },
      select: { userId: true, amount: true, credits: true },
    });

    const userCreditValues: Record<string, number> = {};
    allUsers.forEach((user) => {
      const userTxs = allTxs.filter(t => t.userId === user.id);
      const totalPayments = userTxs.reduce((sum, t) => sum + t.amount, 0);
      const txCredits = userTxs.reduce((sum, t) => sum + t.credits, 0);
      const isOmar = user.email === "omarworkimn@gmail.com";
      const creditsGranted = txCredits + (isOmar ? 2700 : 0);

      userCreditValues[user.id] = creditsGranted > 0 ? (totalPayments / creditsGranted) : 0;
    });

    // 2. Fetch last 1000 generations including user info and provider usage record
    const generations = await prismadb.generation.findMany({
      orderBy: { createdAt: "desc" },
      take: 1000,
      include: {
        user: {
          select: {
            email: true,
          }
        },
        providerUsageRecords: {
          take: 1
        }
      }
    });

    // 3. Map to final UI tracking format
    const mapped = generations.map((gen) => {
      const actualCreditValue = userCreditValues[gen.userId] || 0;
      const revenue = gen.cost * actualCreditValue;

      const usage = gen.providerUsageRecords[0] || null;

      let duration = usage ? usage.duration : gen.duration;
      let resolution = usage ? usage.resolution : gen.resolution;
      let quality = usage ? usage.quality : gen.quality;
      let providerCostUsd = usage ? usage.providerCostUsd : gen.providerCostUsd;
      let providerCostSource = usage ? usage.providerCostSource : gen.providerCostSource;
      let providerCredits = usage ? usage.providerCredits : gen.providerCredits;
      let providerTokens = usage ? usage.providerTokens : gen.providerTokens;
      let providerRequestId = usage ? usage.providerRequestId : gen.providerRequestId;
      let providerName = usage ? usage.providerName : gen.providerName;
      let providerModel = usage ? usage.providerModel : gen.providerModel;

      // Estimate only if we have sufficient details
      if (providerCostUsd === null || providerCostUsd === undefined) {
        const modelLower = gen.modelUsed.toLowerCase();
        const isPerSec = modelLower.includes("video") || modelLower.includes("cinema") || modelLower.includes("seedance") || modelLower.includes("veo") || modelLower.includes("sora") || modelLower.includes("hailuo") || modelLower.includes("kling") || modelLower.includes("grok");
        
        if (isPerSec && (duration === null || duration === undefined)) {
          providerCostUsd = null;
          providerCostSource = "unknown";
        } else {
          const costEst = estimateProviderCostSync(gen.modelUsed, duration || 0, resolution || quality);
          providerCostUsd = costEst.usd;
          providerCostSource = costEst.source;
        }
      }

      if (!providerCostSource) {
        providerCostSource = "unknown";
      }

      // Re-calculate profit/margin strictly if cost source is not unknown
      let profit: number | null = null;
      let marginPercent: number | null = null;
      if (providerCostSource !== "unknown" && providerCostUsd !== null && providerCostUsd !== undefined) {
        profit = revenue - providerCostUsd;
        if (revenue > 0) {
          marginPercent = (profit / revenue) * 100;
        } else {
          marginPercent = providerCostUsd > 0 ? -100 : 0;
        }
      }

      // Determine provider name
      let provider = providerName;
      if (!provider) {
        const modelLower = (providerModel || gen.modelUsed || "").toLowerCase();
        if (modelLower.includes("dreamina") || modelLower.includes("seedance") || modelLower.includes("byteplus") || modelLower.includes("bytedance")) {
          provider = "BytePlus";
        } else if (modelLower.includes("veo") || modelLower.includes("gemini") || modelLower.includes("google") || modelLower.includes("banana") || modelLower.includes("imagen")) {
          provider = "Google";
        } else if (modelLower.includes("wavespeed") || modelLower.includes("heartmula") || modelLower.includes("music") || modelLower.includes("transition")) {
          provider = "WaveSpeed";
        } else if (modelLower.includes("openai") || modelLower.includes("gpt") || modelLower.includes("sora") || modelLower.includes("dall-e")) {
          provider = "OpenAI";
        } else if (modelLower.includes("reap") || modelLower.includes("clipcraft")) {
          provider = "Reap";
        } else {
          provider = "KIE.ai";
        }
      }

      return {
        id: gen.id,
        userEmail: gen.user?.email || "Unknown",
        model: gen.modelUsed,
        provider,
        taskId: providerRequestId || null,
        duration: duration || null,
        resolution: resolution || null,
        quality: quality || null,
        creditsCharged: gen.cost,
        providerCostUsd: providerCostUsd !== null ? parseFloat(providerCostUsd.toFixed(4)) : null,
        providerTokens: providerTokens || null,
        providerCredits: providerCredits || null,
        profit: profit !== null ? parseFloat(profit.toFixed(4)) : null,
        margin: marginPercent !== null ? parseFloat(marginPercent.toFixed(2)) : null,
        costSource: providerCostSource,
        createdAt: gen.createdAt,
      };
    });

    return NextResponse.json(mapped);
  } catch (error) {
    console.error("[api/admin/provider-costs] Error:", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}
