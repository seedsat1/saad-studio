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

    // 2. Fetch last 1000 generations including user info
    const generations = await prismadb.generation.findMany({
      orderBy: { createdAt: "desc" },
      take: 1000,
      include: {
        user: {
          select: {
            email: true,
          }
        }
      }
    });

    // 3. Map to final UI tracking format
    const mapped = generations.map((gen) => {
      const actualCreditValue = userCreditValues[gen.userId] || 0;
      const revenue = gen.cost * actualCreditValue;

      const costEst = estimateProviderCostSync(gen.modelUsed, gen.duration || 5, gen.resolution);

      const providerCostUsd = gen.providerCostUsd !== null && gen.providerCostUsd !== undefined
        ? gen.providerCostUsd
        : costEst.usd;

      const providerCostSource = gen.providerCostSource || costEst.source;

      const profit = providerCostUsd !== null ? revenue - providerCostUsd : null;
      let marginPercent: number | null = null;
      if (providerCostUsd !== null) {
        if (revenue > 0) {
          marginPercent = (profit! / revenue) * 100;
        } else {
          // Zero revenue (e.g. trial/admin/free) but positive cost is a -100% margin or negative
          marginPercent = providerCostUsd > 0 ? -100 : 0;
        }
      }

      // Determine provider name
      let provider = gen.providerName;
      if (!provider) {
        const modelLower = gen.modelUsed.toLowerCase();
        if (modelLower.includes("dreamina") || modelLower.includes("seedance") || modelLower.includes("byteplus")) {
          provider = "BytePlus";
        } else if (modelLower.includes("veo") || modelLower.includes("gemini") || modelLower.includes("google")) {
          provider = "Google";
        } else if (modelLower.includes("wavespeed")) {
          provider = "WaveSpeed";
        } else {
          provider = "KIE.ai";
        }
      }

      return {
        id: gen.id,
        userEmail: gen.user?.email || "Unknown",
        model: gen.modelUsed,
        provider,
        duration: gen.duration || 5,
        resolution: gen.resolution || "720p",
        creditsCharged: gen.cost,
        providerCostUsd: providerCostUsd !== null ? parseFloat(providerCostUsd.toFixed(4)) : null,
        providerTokens: gen.providerTokens || null,
        providerCredits: gen.providerCredits || null,
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
