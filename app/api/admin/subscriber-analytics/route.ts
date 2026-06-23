import { NextResponse } from "next/server";
import prismadb from "@/lib/prismadb";
import { isAdmin } from "@/lib/is-admin";
import { DEFAULT_MODELS, SAAD_PLANS, type PricingModel } from "@/lib/pricing-models";

// Define default test accounts to exclude by default
const DEFAULT_TEST_ACCOUNTS = ["seedsat@googlemail.com", "cookwife5@gmail.com"];

// Helper maps to resolve model ID to pricing models
const MODEL_ALIAS_MAP: Record<string, string> = {
  "kling-3.0/video": "kling30",
  "kling-3.0/motion-control": "kling30_mc",
  "kling/v2-5-turbo-text-to-video-pro": "kling25t",
  "kling/v2-5-turbo-image-to-video-pro": "kling25t",
  "hailuo/2-3-image-to-video-pro": "hailuo23",
  "hailuo/2-3-image-to-video-standard": "hailuo23f",
  "hailuo/02-text-to-video-pro": "hailuo23",
  "hailuo/02-image-to-video-pro": "hailuo23",
  "hailuo/02-text-to-video-standard": "hailuo23f",
  "sora-2-text-to-video": "sora2",
  "sora-2-image-to-video": "sora2_i2v",
  "sora-2-pro-text-to-video": "sora2_pro",
  "sora-2-pro-image-to-video": "sora2_pro",
  "runwayml/gen4-aleph": "kling25t",
  "runwayml/gen4-turbo": "kling25t",
  "bytedance/seedance-2": "seedance2",
  "bytedance/seedance-2-fast": "seedance2f",
  "bytedance/seedance-1.5-pro": "seedance2f",
  "bytedance/v1-pro-fast-image-to-video": "seedance2f",
  "bytedance/v1-pro-image-to-video": "seedance2f",
  "bytedance/v1-pro-text-to-video": "seedance2f",
  "bytedance/v1-lite-image-to-video": "seedance2f",
  "bytedance/v1-lite-text-to-video": "seedance2f",
  "grok-imagine/text-to-video": "grok_vid",
  "grok-imagine/image-to-video": "grok_vid",
  "grok-imagine/text-to-video-1-5": "grok_vid_v15",
  "grok-imagine/image-to-video-1-5": "grok_vid_v15_i2v",

  "kwaivgi/kling-v3.0-pro/text-to-video": "kling30",
  "kwaivgi/kling-v3.0-pro/motion-control": "kling30_mc",
  "minimax/hailuo-2.3/i2v-standard": "hailuo23f",
  "minimax/hailuo-2.3/i2v-pro": "hailuo23",
  "openai/sora-2/text-to-video": "sora2",
  "openai/sora-2/image-to-video": "sora2_i2v",
  "openai/sora-2/text-to-video-pro": "sora2_pro",
  "openai/sora-2-pro/text-to-video": "sora2_pro",
  "openai/sora-2-pro/text-to-video-pro": "sora2_pro",
  "google/veo3.1-lite-text-to-video": "veo31_lite",
  "google/veo3.1-fast-text-to-video": "veo31_fast",
  "google/veo3.1-text-to-video": "veo31",
  "google/veo-3.1-generate-preview": "gemini_omni_video",
  "google/gemini-omni-video": "gemini_omni_video",
  "bytedance/seedance-v2/text-to-video-fast": "seedance2f",
  "bytedance/seedance-v2/text-to-video": "seedance2",
  "bytedance/dreamina-v3.0/text-to-video-720p": "seedance2",
  "x-ai/grok-imagine-video/text-to-video": "grok_vid",
  "x-ai/grok-imagine-video/edit-video": "grok_vid",
  "x-ai/grok-imagine-video/text-to-video-1-5": "grok_vid_v15",
  "x-ai/grok-imagine-video/edit-video-1-5": "grok_vid_v15_i2v",

  "tripo3d-2.5.image": "tripo25",
  "tripo3d-2.5.multiview": "tripo25",
  "hunyuan3d-3.1.text": "hunya31",
  "hunyuan3d-3.1.image": "hunya31",
  "hunyuan3d-3.text": "hunya3",
  "hunyuan3d-3.image": "hunya3",
  "hunyuan3d-3.sketch": "hunya3",
  "meshy-6.text": "meshy6",
  "meshy-6.image": "meshy6",

  "wavespeed-ai/ace-step-1.5": "music_gen",
  "wavespeed-ai/song-generation": "music_gen",
  "wavespeed-ai/ace-step": "music_gen",
  "wavespeed-ai/heartmula-generate-music": "music_gen",
  "minimax/minimax-music-2.5": "music_gen",
  "minimax/minimax-music-02": "music_gen",
  "minimax/minimax-music-v1.5": "music_gen",
  "google/lyria-3": "music_gen",
  "google/lyria-3-clip/music": "music_gen",
  "google/lyria-3-pro/music": "music_gen",
  "elevenlabs/music": "music_gen",
  "elevenlabs/elevenlabs-music": "music_gen",

  "elevenlabs/multilingual-v2": "el_v2",
  "elevenlabs/text-to-speech-multilingual-v2": "el_v2",
  "elevenlabs/text-to-dialogue-v3": "voice_gen",
  "elevenlabs/sound-effect-v2": "sfx",
  "elevenlabs/speech-to-text": "voice_gen",
  "elevenlabs/audio-isolation": "voice_chg",
  "elevenlabs/eleven-v3": "el_v3",
  "wavespeed-ai/mmaudio-v2": "sfx",
  "elevenlabs/voice-changer": "voice_chg",
  "elevenlabs/dubbing": "dubbing",
  "sync/lipsync-3": "lipsync",
  "infinitalk/from-audio": "lipsync",
  "kling/ai-avatar-pro": "lipsync",
  "minimax/voice-clone": "voice_clone",

  "audio:tts": "el_v2",
  "audio:video2audio": "sfx",
  "audio:music": "music_gen",
  "audio:speech-to-text": "voice_gen",
  "audio:audio-isolation": "voice_chg",
  "audio:voice-changer": "voice_chg",
  "audio:dubbing": "dubbing",
  "audio:lip-sync": "lipsync",
  "audio:voice-cloning": "voice_clone",

  "nano-banana-pro": "nano_pro",
  "nano-banana-2": "nano2",
  "google/nano-banana": "nano",
  "google/nano-banana-edit": "nano_edit",
  "google/imagen4-fast": "imagen4f",
  "google/imagen4": "imagen4",
  "google/imagen4-ultra": "imagen4u",
  "seedream/4.5-text-to-image": "seedream45",
  "seedream/4.5-edit": "seedream45e",
  "seedream/5-lite-text-to-image": "seedream5l",
  "seedream/5-lite-image-to-image": "seedream5i",
  "z-image": "zimage",
  "grok-imagine/text-to-image": "grok_img",
  "grok-imagine/image-to-image": "grok_imge",
  "gpt-image/1.5-text-to-image": "gpt15t",
  "gpt-image/1.5-image-to-image": "gpt15i",
  "gpt-image-2-text-to-image": "gpt2t",
  "gpt-image-2-image-to-image": "gpt2i",
  "qwen2/text-to-image": "qwen_t",
  "qwen2/image-edit": "qwen_i",
  "qwen/image-to-image": "qwen_i",
  "wan/2-7-image-pro": "nano_pro",
  "flux-2/pro-text-to-image": "flux2_pro_t",
  "flux-2/pro-image-to-image": "flux2_pro_i",
  "flux-2/flex-text-to-image": "flux2_flex_t",
  "flux-2/flex-image-to-image": "flux2_flex_i",
  "flux-2/pro": "flux2_pro_t",
  "flux-2/flex": "flux2_flex_t",
  "flux-2/max": "flux2_pro_t",
  "flux-2": "flux2_flex_t",

  "tool:upscale": "tool_upscale",
  "tool:remove-bg": "tool_rmbg",
  "tool:face-swap": "tool_faceswap",
  "tool:watermark-remover": "tool_watermark_remover",
  "tool:instant-character": "tool_instant_character",
  "gemini-3-pro-image-preview": "gemini_omni_character",
  "gemini-omni-character": "gemini_omni_character",
  "tool:gemini-omni-character": "gemini_omni_character",
  "gemini-omni-audio": "gemini_omni_audio",
  "gemini-3.1-flash-tts-preview": "gemini_omni_audio",
  "gemini-2.5-flash-preview-tts": "gemini_omni_audio",
  "gemini-2.5-pro-preview-tts": "gemini_omni_audio",
  "dall-e-3": "dalle3",
};

// Estimator for provider costs in USD based on modelUsed and credits cost
// Returns null if the model is not found in either config
function estimateProviderCost(modelRef: string, costCredits: number, modelsConfig: PricingModel[]): { usd: number | null, source: "actual" | "estimated" | "unknown" } {
  const normalizedId = MODEL_ALIAS_MAP[modelRef] || modelRef;
  const config = modelsConfig.find((m) => m.id === normalizedId || m.name === normalizedId);

  if (!config) {
    // If not found in config, return null (accounting audit rule: no guess values)
    return { usd: null, source: "unknown" };
  }

  // Calculate using PricingModel config parameters
  if (config.provider === "wavespeed") {
    if (config.userCreditsRate > 0) {
      const ratio = costCredits / config.userCreditsRate;
      const usd = ratio * config.waveUsd;
      return { usd, source: "actual" };
    }
    return { usd: config.waveUsd, source: "actual" };
  }

  if (config.userCreditsRate > 0) {
    const ratio = costCredits / config.userCreditsRate;
    const kieCredits = ratio * config.kieCredits;
    const usd = kieCredits * 0.005;
    return { usd, source: "actual" };
  }

  const usd = config.kieCredits * 0.005;
  return { usd, source: "actual" };
}

export async function GET(req: Request) {
  try {
    const isUserAdmin = await isAdmin();
    if (!isUserAdmin) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const excludeTest = searchParams.get("excludeTestAccounts") !== "false";
    const dateRange = searchParams.get("dateRange") || "all"; // "7d" | "30d" | "90d" | "all"

    // Fetch database pricing constitution rows
    let pricingModels = DEFAULT_MODELS;
    try {
      const dbConstitution = await prismadb.pricingConstitution.findMany();
      if (dbConstitution.length > 0) {
        pricingModels = dbConstitution as unknown as PricingModel[];
      }
    } catch {}

    // Fetch all records
    const allUsers = await prismadb.user.findMany();
    const allSubs = await prismadb.userSubscription.findMany();
    const allTxs = await prismadb.adminTransaction.findMany({
      where: { paymentStatus: "COMPLETED" },
    });

    // Date filtering parameters
    let dateFilterStart: Date | null = null;
    const now = new Date();
    if (dateRange === "7d") {
      dateFilterStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    } else if (dateRange === "30d") {
      dateFilterStart = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    } else if (dateRange === "90d") {
      dateFilterStart = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
    }

    // Fetch generations & transition jobs
    const generations = await prismadb.generation.findMany({
      where: dateFilterStart ? { createdAt: { gte: dateFilterStart } } : undefined,
    });
    const transitionJobs = await prismadb.transitionJob.findMany({
      where: {
        status: "completed",
        createdAt: dateFilterStart ? { gte: dateFilterStart } : undefined,
      },
    });

    // Filter out test accounts if requested
    const testEmails = excludeTest ? DEFAULT_TEST_ACCOUNTS : [];
    const users = allUsers.filter(u => !testEmails.includes(u.email));
    const userIds = new Set(users.map(u => u.id));

    // Filter generations and transitions for target users
    const filteredGens = generations.filter(g => userIds.has(g.userId));
    const filteredTrans = transitionJobs.filter(t => userIds.has(t.userId));

    // 1. CALCULATE USER CREDIT VALUES (Payments / Granted)
    const userCreditValues: Record<string, number> = {};
    const userGrantedMap: Record<string, number> = {};
    const userPaymentsMap: Record<string, number> = {};

    users.forEach((user) => {
      const userTxs = allTxs.filter(t => t.userId === user.id);
      const totalPayments = userTxs.reduce((sum, t) => sum + t.amount, 0);
      const txCredits = userTxs.reduce((sum, t) => sum + t.credits, 0);
      const isOmar = user.email === "omarworkimn@gmail.com";
      const creditsGranted = txCredits + (isOmar ? 2700 : 0);

      userPaymentsMap[user.id] = totalPayments;
      userGrantedMap[user.id] = creditsGranted;
      userCreditValues[user.id] = creditsGranted > 0 ? (totalPayments / creditsGranted) : 0;
    });

    // 2. PROCESS SUBSCRIBER ANALYTICS & MARGINS
    const subscribers = users.map((user) => {
      const sub = allSubs.find(s => s.userId === user.id);
      const userGens = filteredGens.filter(g => g.userId === user.id);
      const userTrans = filteredTrans.filter(t => t.userId === user.id);

      const totalPayments = userPaymentsMap[user.id] || 0;
      const creditsGranted = userGrantedMap[user.id] || 0;
      const creditsRemaining = user.creditBalance;

      const gensBilled = userGens.reduce((sum, g) => sum + g.cost, 0);
      const transBilled = userTrans.reduce((sum, t) => sum + t.creditsCost, 0);
      const creditsConsumed = gensBilled + transBilled;

      // Actual Cost per credit
      const actualCreditValue = userCreditValues[user.id] || 0;

      // Revenue Equivalent = Credits Consumed * Actual Credit Value
      const revenueEquivalent = creditsConsumed * actualCreditValue;

      // Provider Cost Calculation
      let estProviderCost = 0;
      let costHasNull = false;

      for (const gen of userGens) {
        const est = estimateProviderCost(gen.modelUsed, gen.cost, pricingModels);
        if (est.usd === null) {
          costHasNull = true;
        } else {
          estProviderCost += est.usd;
        }
      }
      for (const tr of userTrans) {
        // Transition: morph 15 cr, flying_cam 50 cr. Billed in KIE.
        estProviderCost += (tr.creditsCost * 0.005);
      }

      // Profitability & Margins (Accounting recognized match)
      const estGrossProfit = revenueEquivalent - estProviderCost;
      const grossMarginPercent = revenueEquivalent > 0 
        ? (estGrossProfit / revenueEquivalent) * 100 
        : (estProviderCost > 0 ? -100 : 0);

      // Plan Details
      const planName = sub?.planId ? sub.planId.toUpperCase() : "FREE";
      const billingType = sub?.billingInterval === "annual" ? "Annual" : sub?.billingInterval === "monthly" ? "Monthly" : "Manual";
      const status = user.creditsExpireAt && new Date(user.creditsExpireAt) < now ? "Expired" : sub?.planId ? "Active" : "None";

      // Dates
      const userTxs = allTxs.filter(t => t.userId === user.id);
      const startDate = userTxs.length > 0 ? userTxs[0].createdAt : user.createdAt;
      const endDate = user.creditsExpireAt || sub?.stripeCurrentPeriodEnd || null;

      // Usage Percentage
      const usagePercent = creditsGranted > 0 ? Math.min(100, (creditsConsumed / creditsGranted) * 100) : 0;
      const lastGenDate = userGens.length > 0 ? userGens[0].createdAt : null;

      // Find top model used
      const modelCounts: Record<string, number> = {};
      userGens.forEach(g => {
        modelCounts[g.modelUsed] = (modelCounts[g.modelUsed] || 0) + 1;
      });
      let topModelUsed = "None";
      let maxCount = 0;
      Object.entries(modelCounts).forEach(([m, count]) => {
        if (count > maxCount) {
          maxCount = count;
          topModelUsed = m;
        }
      });

      return {
        userId: user.id,
        email: user.email,
        name: user.name || "Unnamed User",
        planName,
        billingType,
        status,
        startDate,
        endDate,
        totalPayments,
        creditsGranted,
        creditsConsumed,
        creditsRemaining,
        usagePercent,
        estProviderCost: costHasNull ? null : parseFloat(estProviderCost.toFixed(2)),
        estGrossProfit: parseFloat(estGrossProfit.toFixed(2)),
        revenueEquivalent: parseFloat(revenueEquivalent.toFixed(2)),
        grossMarginPercent: parseFloat(grossMarginPercent.toFixed(1)),
        lastGenDate,
        generationsCount: userGens.length,
        topModelUsed,
      };
    });

    // 3. CUSTOMER PROFITABILITY MATRIX (Sorted by profit desc)
    const profitabilityMatrix = subscribers.map(s => ({
      email: s.email,
      plan: `${s.planName} (${s.billingType})`,
      totalPayments: s.totalPayments,
      creditsGranted: s.creditsGranted,
      creditsConsumed: s.creditsConsumed,
      creditsRemaining: s.creditsRemaining,
      providerCost: s.estProviderCost,
      revenue: s.revenueEquivalent,
      profit: s.estGrossProfit,
      marginPercent: s.grossMarginPercent,
      topModelUsed: s.topModelUsed,
      lastActivity: s.lastGenDate,
    })).sort((a, b) => b.profit - a.profit);

    // 4. TOP FINANCIAL RISK CUSTOMERS (PROJECTIONS)
    const financialRiskCustomers = subscribers.map((sub) => {
      const billingInterval = sub.billingType === "Annual" ? "annual" : "monthly";
      const daysTotal = billingInterval === "annual" ? 365 : 30;

      const startDateObj = new Date(sub.startDate);
      const daysActive = Math.max(1, Math.ceil((now.getTime() - startDateObj.getTime()) / (1000 * 60 * 60 * 24)));
      const dailyCreditsRate = sub.creditsConsumed / daysActive;
      const projectedCredits = dailyCreditsRate * daysTotal;

      const avgCostPerCredit = sub.creditsConsumed > 0 && sub.estProviderCost !== null 
        ? (sub.estProviderCost / sub.creditsConsumed) 
        : 0.008;

      // Projection scenarios
      const projectedCost = projectedCredits * avgCostPerCredit;
      const projectedRevenue = sub.totalPayments;
      const projectedMargin = projectedRevenue > 0 
        ? ((projectedRevenue - projectedCost) / projectedRevenue) * 100 
        : (projectedCost > 0 ? -100 : 0);

      // Capped at credits granted scenario
      const projectedCostCapped = Math.min(sub.creditsGranted, projectedCredits) * avgCostPerCredit;
      const projectedMarginCapped = projectedRevenue > 0
        ? ((projectedRevenue - projectedCostCapped) / projectedRevenue) * 100
        : (projectedCostCapped > 0 ? -100 : 0);

      // Risk score evaluation
      let riskLevel: "LOW" | "MEDIUM" | "HIGH" = "LOW";
      const consumptionExhaustionFactor = sub.creditsGranted > 0 ? (projectedCredits / sub.creditsGranted) : 0;
      
      if (projectedMarginCapped < 15 || projectedCostCapped > projectedRevenue || (sub.billingType === "Annual" && consumptionExhaustionFactor > 2.0)) {
        riskLevel = "HIGH";
      } else if (projectedMarginCapped <= 40 || consumptionExhaustionFactor > 1.2) {
        riskLevel = "MEDIUM";
      }

      return {
        email: sub.email,
        plan: `${sub.planName} (${sub.billingType})`,
        totalPayments: sub.totalPayments,
        creditsGranted: sub.creditsGranted,
        creditsConsumed: sub.creditsConsumed,
        dailyRate: parseFloat(dailyCreditsRate.toFixed(1)),
        daysActive,
        projectedCost: parseFloat(projectedCost.toFixed(2)),
        projectedRevenue: parseFloat(projectedRevenue.toFixed(2)),
        projectedMargin: parseFloat(projectedMargin.toFixed(1)),
        projectedCostCapped: parseFloat(projectedCostCapped.toFixed(2)),
        projectedMarginCapped: parseFloat(projectedMarginCapped.toFixed(1)),
        riskLevel,
      };
    }).filter(r => r.riskLevel === "HIGH" || r.riskLevel === "MEDIUM")
      .sort((a, b) => (a.riskLevel === "HIGH" && b.riskLevel !== "HIGH" ? -1 : 1));

    // 5. ANNUAL PACKAGES REPORT
    // Group subscribers on annual plans
    const annualPlansList = subscribers.filter(s => s.billingType === "Annual");
    const annualPlansMap: Record<string, {
      planName: string;
      payments: number;
      granted: number;
      consumed: number;
      providerCost: number;
      subscribersCount: number;
    }> = {};

    annualPlansList.forEach((s) => {
      const key = s.planName;
      if (!annualPlansMap[key]) {
        annualPlansMap[key] = {
          planName: s.planName,
          payments: 0,
          granted: 0,
          consumed: 0,
          providerCost: 0,
          subscribersCount: 0,
        };
      }
      annualPlansMap[key].payments += s.totalPayments;
      annualPlansMap[key].granted += s.creditsGranted;
      annualPlansMap[key].consumed += s.creditsConsumed;
      annualPlansMap[key].providerCost += (s.estProviderCost || 0);
      annualPlansMap[key].subscribersCount++;
    });

    const annualPlansReport = Object.values(annualPlansMap).map((ap) => {
      const currentProfit = ap.payments - ap.providerCost;
      const avgCostPerCredit = ap.consumed > 0 ? (ap.providerCost / ap.consumed) : 0.008;
      const projectedCostAt100 = ap.granted * avgCostPerCredit;
      const projectedProfitAt100 = ap.payments - projectedCostAt100;
      const marginAt100 = ap.payments > 0 ? (projectedProfitAt100 / ap.payments) * 100 : 0;
      const remainsProfitable = projectedProfitAt100 > 0 && marginAt100 > 15;

      return {
        planName: ap.planName,
        subscribersCount: ap.subscribersCount,
        totalPayments: parseFloat(ap.payments.toFixed(2)),
        creditsGranted: ap.granted,
        creditsConsumed: ap.consumed,
        providerCost: parseFloat(ap.providerCost.toFixed(2)),
        currentProfit: parseFloat(currentProfit.toFixed(2)),
        projectedCostAt100: parseFloat(projectedCostAt100.toFixed(2)),
        projectedProfitAt100: parseFloat(projectedProfitAt100.toFixed(2)),
        marginAt100: parseFloat(marginAt100.toFixed(1)),
        remainsProfitable,
      };
    });

    // 6. DETAILED AI MODEL PROFITABILITY BREAKDOWN (Actual Credit Values)
    const modelUsageMap: Record<string, { model: string; provider: string; count: number; userCredits: number; providerCost: number; actualRevenue: number; hasNull: boolean }> = {};
    for (const gen of filteredGens) {
      const model = gen.modelUsed;
      const normalizedId = MODEL_ALIAS_MAP[model] || model;
      const config = pricingModels.find(m => m.id === normalizedId || m.name === normalizedId);
      const provider = config?.provider || "kie";

      if (!modelUsageMap[model]) {
        modelUsageMap[model] = {
          model,
          provider,
          count: 0,
          userCredits: 0,
          providerCost: 0,
          actualRevenue: 0,
          hasNull: false,
        };
      }

      const costEst = estimateProviderCost(gen.modelUsed, gen.cost, pricingModels);
      const userVal = userCreditValues[gen.userId] || 0;

      modelUsageMap[model].count++;
      modelUsageMap[model].userCredits += gen.cost;
      modelUsageMap[model].actualRevenue += (gen.cost * userVal);

      if (costEst.usd === null) {
        modelUsageMap[model].hasNull = true;
      } else {
        modelUsageMap[model].providerCost += costEst.usd;
      }
    }

    const models = Object.values(modelUsageMap).map(m => {
      const avgCredits = m.count > 0 ? parseFloat((m.userCredits / m.count).toFixed(2)) : 0;
      const avgCost = m.count > 0 && !m.hasNull ? parseFloat((m.providerCost / m.count).toFixed(4)) : null;
      const actualProfit = m.hasNull ? null : m.actualRevenue - m.providerCost;
      const margin = m.actualRevenue > 0 && !m.hasNull ? parseFloat((actualProfit! / m.actualRevenue * 100).toFixed(1)) : 0;

      return {
        model: m.model,
        provider: m.provider,
        count: m.count,
        userCredits: parseFloat(m.userCredits.toFixed(1)),
        providerCost: m.hasNull ? null : parseFloat(m.providerCost.toFixed(2)),
        avgCredits,
        avgCost,
        actualRevenue: parseFloat(m.actualRevenue.toFixed(2)),
        actualProfit: actualProfit === null ? null : parseFloat(actualProfit.toFixed(2)),
        marginPercent: margin,
        costStatus: m.hasNull ? "UNKNOWN_COST" : "ACTUAL",
      };
    });

    // 7. DATA INTEGRITY AUDIT
    const userIdsSet = new Set(allUsers.map(u => u.id));
    const allEmailsMap = new Map(allUsers.map(u => [u.id, u.email]));

    const consumptionWithoutSubscription = subscribers
      .filter(s => s.planName === "FREE" && s.creditsConsumed > 50)
      .map(s => ({ email: s.email, userId: s.userId, creditsConsumed: s.creditsConsumed }));

    const subscriptionWithoutPayments = subscribers
      .filter(s => s.planName !== "FREE" && s.totalPayments === 0)
      .map(s => ({ email: s.email, userId: s.userId, planName: s.planName }));

    const negativeCredits = allUsers
      .filter(u => u.creditBalance < 0)
      .map(u => ({ email: u.email, userId: u.id, balance: u.creditBalance }));

    const orphanTransactions = allTxs
      .filter(tx => !userIdsSet.has(tx.userId))
      .map(tx => ({ transactionId: tx.id, userId: tx.userId, amount: tx.amount }));

    const generationsWithoutProviderMap: Record<string, number> = {};
    const generationsWithoutCostMappingMap: Record<string, number> = {};

    filteredGens.forEach((g) => {
      const normalizedId = MODEL_ALIAS_MAP[g.modelUsed] || g.modelUsed;
      const config = pricingModels.find(m => m.id === normalizedId || m.name === normalizedId);

      if (!config) {
        generationsWithoutCostMappingMap[g.modelUsed] = (generationsWithoutCostMappingMap[g.modelUsed] || 0) + 1;
        generationsWithoutProviderMap[g.modelUsed] = (generationsWithoutProviderMap[g.modelUsed] || 0) + 1;
      } else if (!config.provider) {
        generationsWithoutProviderMap[g.modelUsed] = (generationsWithoutProviderMap[g.modelUsed] || 0) + 1;
      }
    });

    const generationsWithoutProvider = Object.entries(generationsWithoutProviderMap).map(([model, count]) => ({ modelUsed: model, count }));
    const generationsWithoutCostMapping = Object.entries(generationsWithoutCostMappingMap).map(([model, count]) => ({ modelUsed: model, count }));

    const dataIntegrityAudit = {
      consumptionWithoutSubscription,
      subscriptionWithoutPayments,
      negativeCredits,
      orphanTransactions,
      generationsWithoutProvider,
      generationsWithoutCostMapping,
    };

    // 8. PRICING SAFETY SIMULATION
    const totalProviderCostAllTime = subscribers.reduce((sum, s) => sum + (s.estProviderCost || 0), 0);
    const totalCreditsConsumedAllTime = subscribers.reduce((sum, s) => sum + s.creditsConsumed, 0);
    const avgCostPerCredit = totalCreditsConsumedAllTime > 0 ? (totalProviderCostAllTime / totalCreditsConsumedAllTime) : 0.008;

    const pricingSafetySimulation = SAAD_PLANS.filter(p => p.id !== "try").map((plan) => {
      // Monthly rates
      const monthlyPrice = plan.monthlyUsd;
      const monthlyCredits = plan.credits;

      const monthlySubscribers = subscribers.filter(s => s.planName.toLowerCase() === plan.id.toLowerCase() && s.billingType === "Monthly");
      const monthlyAvgConsumed = monthlySubscribers.length > 0 
        ? (monthlySubscribers.reduce((sum, s) => sum + s.creditsConsumed, 0) / monthlySubscribers.length) 
        : (monthlyCredits * 0.45); // default estimate 45% usage

      const monthlyCurrentCost = monthlyAvgConsumed * avgCostPerCredit;
      const monthlyCurrentMargin = monthlyPrice > 0 ? ((monthlyPrice - monthlyCurrentCost) / monthlyPrice) * 100 : 0;

      const monthlyCost100 = monthlyCredits * avgCostPerCredit;
      const monthlyMargin100 = monthlyPrice > 0 ? ((monthlyPrice - monthlyCost100) / monthlyPrice) * 100 : 0;

      const monthlyCost150 = monthlyCredits * 1.5 * avgCostPerCredit;
      const monthlyMargin150 = monthlyPrice > 0 ? ((monthlyPrice - monthlyCost150) / monthlyPrice) * 100 : 0;

      // Annual rates (annual discount applied)
      const annualPrice = plan.monthlyUsd * 12 * (1 - plan.annualDiscount / 100);
      const annualCredits = plan.credits * 12;

      const annualSubscribers = subscribers.filter(s => s.planName.toLowerCase() === plan.id.toLowerCase() && s.billingType === "Annual");
      const annualAvgConsumed = annualSubscribers.length > 0 
        ? (annualSubscribers.reduce((sum, s) => sum + s.creditsConsumed, 0) / annualSubscribers.length) 
        : (annualCredits * 0.45);

      const annualCurrentCost = annualAvgConsumed * avgCostPerCredit;
      const annualCurrentMargin = annualPrice > 0 ? ((annualPrice - annualCurrentCost) / annualPrice) * 100 : 0;

      const annualCost100 = annualCredits * avgCostPerCredit;
      const annualMargin100 = annualPrice > 0 ? ((annualPrice - annualCost100) / annualPrice) * 100 : 0;

      const annualCost150 = annualCredits * 1.5 * avgCostPerCredit;
      const annualMargin150 = annualPrice > 0 ? ((annualPrice - annualCost150) / annualPrice) * 100 : 0;

      return {
        planId: plan.id,
        planName: plan.name,
        monthly: {
          price: monthlyPrice,
          credits: monthlyCredits,
          currentConsumed: parseFloat(monthlyAvgConsumed.toFixed(1)),
          currentMargin: parseFloat(monthlyCurrentMargin.toFixed(1)),
          margin100: parseFloat(monthlyMargin100.toFixed(1)),
          margin150: parseFloat(monthlyMargin150.toFixed(1)),
          isSafe: monthlyMargin150 > 15,
        },
        annual: {
          price: parseFloat(annualPrice.toFixed(2)),
          credits: annualCredits,
          currentConsumed: parseFloat(annualAvgConsumed.toFixed(1)),
          currentMargin: parseFloat(annualCurrentMargin.toFixed(1)),
          margin100: parseFloat(annualMargin100.toFixed(1)),
          margin150: parseFloat(annualMargin150.toFixed(1)),
          isSafe: annualMargin150 > 15,
        }
      };
    });

    // 9. SUMMARY AGGREGATE CARD DATA
    const realActiveSubscribersCount = subscribers.filter(s => s.status === "Active").length;
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    
    const completedTxs30Days = allTxs.filter(t => t.createdAt >= thirtyDaysAgo && userIds.has(t.userId));
    const revenue30Days = completedTxs30Days.reduce((sum, t) => sum + t.amount, 0);

    const gens30Days = filteredGens.filter(g => g.createdAt >= thirtyDaysAgo);
    const trans30Days = filteredTrans.filter(t => t.createdAt >= thirtyDaysAgo);

    let providerCost30Days = 0;
    for (const g of gens30Days) {
      const est = estimateProviderCost(g.modelUsed, g.cost, pricingModels);
      if (est.usd !== null) providerCost30Days += est.usd;
    }
    for (const tr of trans30Days) {
      providerCost30Days += (tr.creditsCost * 0.005);
    }

    const grossMargin30Days = revenue30Days > 0 ? ((revenue30Days - providerCost30Days) / revenue30Days) * 100 : 0;

    const totalCreditsGranted = subscribers.reduce((sum, s) => sum + s.creditsGranted, 0);
    const totalCreditsConsumed = subscribers.reduce((sum, s) => sum + s.creditsConsumed, 0);
    const totalCreditsRemaining = subscribers.reduce((sum, s) => sum + s.creditsRemaining, 0);

    const totalRevenueAllTime = subscribers.reduce((sum, s) => sum + s.totalPayments, 0);
    const totalCostAllTime = subscribers.reduce((sum, s) => sum + (s.estProviderCost || 0), 0);
    const validSubsCount = subscribers.length || 1;

    const averageCostPerSub = totalCostAllTime / validSubsCount;
    const averageRevenuePerSub = totalRevenueAllTime / validSubsCount;

    const summary = {
      realActiveSubscribers: realActiveSubscribersCount,
      revenue30Days: parseFloat(revenue30Days.toFixed(2)),
      providerCost30Days: parseFloat(providerCost30Days.toFixed(2)),
      grossMargin30DaysPercent: parseFloat(grossMargin30Days.toFixed(1)),
      totalCreditsGranted,
      totalCreditsConsumed,
      totalCreditsRemaining,
      averageCostPerSubscriber: parseFloat(averageCostPerSub.toFixed(2)),
      averageRevenuePerSubscriber: parseFloat(averageRevenuePerSub.toFixed(2)),
    };

    // Warnings from integrity checks
    const dataIntegrityWarnings: Array<{ type: string; email: string; message: string }> = [];
    
    // Check Sarmad warning
    subscribers.forEach(sub => {
      const isSarmad = sub.email === "sfa770441@gmail.com";
      if ((isSarmad || sub.planName === "FREE") && (sub.creditsConsumed > 500 || sub.creditsGranted > 500)) {
        dataIntegrityWarnings.push({
          type: "MISSING_SUBSCRIPTION",
          email: sub.email,
          message: `User has consumed ${sub.creditsConsumed} credits but has no active subscription row in database.`,
        });
      }
    });

    return NextResponse.json({
      summary,
      subscribers,
      profitabilityMatrix,
      financialRiskCustomers,
      annualPlansReport,
      models,
      dataIntegrityAudit,
      pricingSafetySimulation,
      dataIntegrityWarnings,
    });
  } catch (error: any) {
    console.error("[SUBSCRIBER_ANALYTICS_ERROR]", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}
