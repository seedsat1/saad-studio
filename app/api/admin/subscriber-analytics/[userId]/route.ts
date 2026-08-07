import { NextResponse } from "next/server";
import prismadb from "@/lib/prismadb";
import { isAdmin } from "@/lib/is-admin";
import { DEFAULT_MODELS, calcProviderCost, type PricingModel } from "@/lib/pricing-models";

// Model Alias Map for resolving configuration
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
  "bytedance/seedance-2-mini": "seedance2mini",
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
  "google/veo-3.1-generate-preview": "veo31",
  "google/gemini-omni-video": "gemini_omni_video",
  "google/gemini-omni-flash": "gemini_omni_flash",
  "bytedance/seedance-v2/text-to-video-fast": "seedance2f",
  "bytedance/seedance-v2/text-to-video-mini": "seedance2mini",
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
  "minimax/music-2.5": "music_gen",
  "minimax/music-02": "music_gen",
  "minimax/music-v1.5": "music_gen",
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
  "nano-banana-2-lite": "nano2_lite",
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
  "gemini-3-pro-image": "gemini_omni_character",
  "gemini-omni-character": "gemini_omni_character",
  "tool:gemini-omni-character": "gemini_omni_character",
  "gemini-omni-audio": "gemini_omni_audio",
  "gemini-3.1-flash-live-preview": "gemini_omni_audio",
  "gemini-3.1-flash-tts-preview": "gemini_omni_audio",
  "gemini-2.5-flash-preview-tts": "gemini_omni_audio",
  "gemini-2.5-pro-preview-tts": "gemini_omni_audio",
  "dall-e-3": "dalle3",
};

// Estimator for provider costs in USD based on modelUsed and credits cost
function estimateProviderCost(modelRef: string, costCredits: number, modelsConfig: PricingModel[]): { usd: number, source: "actual" | "estimated" | "unknown" } {
  const normalizedId = MODEL_ALIAS_MAP[modelRef] || modelRef;
  const config = modelsConfig.find((m) => m.id === normalizedId || m.name === normalizedId);

  if (!config) {
    if (modelRef.includes("image") || modelRef.includes("banana") || modelRef.includes("rmbg") || modelRef.includes("upscale") || modelRef.includes("face-swap")) {
      return { usd: costCredits * 0.01, source: "estimated" };
    }
    if (modelRef.includes("elevenlabs") || modelRef.includes("audio") || modelRef.includes("voice") || modelRef.includes("tts")) {
      return { usd: costCredits * 0.01, source: "estimated" };
    }
    return { usd: costCredits * 0.029, source: "estimated" };
  }

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

// Parse prompt fields for extra info
function parsePromptInfo(promptStr: string) {
  let duration: number | null = null;
  let resolution: string | null = null;
  let cleanPrompt = promptStr;

  try {
    if (promptStr.startsWith("{") && promptStr.endsWith("}")) {
      const parsed = JSON.parse(promptStr);
      if (parsed.prompt) cleanPrompt = parsed.prompt;
      if (parsed.duration !== undefined) duration = Number(parsed.duration);
      if (parsed.width && parsed.height) {
        resolution = `${parsed.width}x${parsed.height}`;
      } else if (parsed.resolution) {
        resolution = parsed.resolution;
      }
    }
  } catch {}

  // Fallback regex detection if text prompt
  if (!duration) {
    const durMatch = cleanPrompt.match(/duration:\s*(\d+)/i);
    if (durMatch) duration = parseInt(durMatch[1], 10);
  }
  if (!resolution) {
    const resMatch = cleanPrompt.match(/(\d{3,4})x(\d{3,4})/);
    if (resMatch) resolution = resMatch[0];
  }

  // Crop preview length
  const preview = cleanPrompt.length > 100 ? cleanPrompt.substring(0, 100) + "..." : cleanPrompt;

  return { preview, duration, resolution };
}

export async function GET(req: Request, { params }: { params: { userId: string } }) {
  try {
    const isUserAdmin = await isAdmin();
    if (!isUserAdmin) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const { userId } = params;
    if (!userId) {
      return new NextResponse("User ID required", { status: 400 });
    }

    // Fetch User
    const user = await prismadb.user.findUnique({
      where: { id: userId },
    });
    if (!user) {
      return new NextResponse("User not found", { status: 404 });
    }

    // Fetch pricing models
    let pricingModels = DEFAULT_MODELS;
    try {
      const dbConstitution = await prismadb.pricingConstitution.findMany();
      if (dbConstitution.length > 0) {
        pricingModels = dbConstitution as unknown as PricingModel[];
      }
    } catch {}

    // Fetch sub, txs, generations & transition jobs
    const sub = await prismadb.userSubscription.findUnique({
      where: { userId },
    });
    const userTxs = await prismadb.adminTransaction.findMany({
      where: { userId, paymentStatus: "COMPLETED" },
    });
    const userGens = await prismadb.generation.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
    });
    const userTrans = await prismadb.transitionJob.findMany({
      where: { userId, status: "completed" },
      orderBy: { createdAt: "desc" },
    });

    const now = new Date();

    // Calculations
    const totalPayments = userTxs.reduce((sum, t) => sum + t.amount, 0);
    const txCredits = userTxs.reduce((sum, t) => sum + t.credits, 0);
    const isOmar = user.email === "omarworkimn@gmail.com";
    const creditsGranted = txCredits + (isOmar ? 2700 : 0);

    const creditsRemaining = user.creditBalance;
    const gensBilled = userGens.reduce((sum, g) => sum + g.cost, 0);
    const transBilled = userTrans.reduce((sum, t) => sum + t.creditsCost, 0);
    const creditsConsumed = gensBilled + transBilled;

    let totalEstProviderCost = 0;
    const modelUsageMap: Record<string, {
      modelName: string;
      provider: string;
      generationCount: number;
      creditsConsumed: number;
      estProviderCost: number;
      revenueEquivalent: number;
      profitLoss: number;
      lastUsedAt: Date;
    }> = {};

    // Grouping by model (generations)
    for (const gen of userGens) {
      const model = gen.modelUsed;
      const normalizedId = MODEL_ALIAS_MAP[model] || model;
      const config = pricingModels.find(m => m.id === normalizedId || m.name === normalizedId);
      const provider = config?.provider || "kie";
      const costEst = estimateProviderCost(gen.modelUsed, gen.cost, pricingModels);
      const providerCost = gen.providerCostUsd !== null ? gen.providerCostUsd : costEst.usd;

      totalEstProviderCost += providerCost;

      if (!modelUsageMap[model]) {
        modelUsageMap[model] = {
          modelName: model,
          provider,
          generationCount: 0,
          creditsConsumed: 0,
          estProviderCost: 0,
          revenueEquivalent: 0,
          profitLoss: 0,
          lastUsedAt: gen.createdAt,
        };
      }

      modelUsageMap[model].generationCount++;
      modelUsageMap[model].creditsConsumed += gen.cost;
      modelUsageMap[model].estProviderCost += providerCost;
      if (gen.createdAt > modelUsageMap[model].lastUsedAt) {
        modelUsageMap[model].lastUsedAt = gen.createdAt;
      }
    }

    // Grouping transition jobs as a model usage
    if (userTrans.length > 0) {
      const transModelKey = "transition-job";
      const transProviderCost = userTrans.reduce((sum, t) => sum + (t.creditsCost * 0.005), 0);
      totalEstProviderCost += transProviderCost;

      modelUsageMap[transModelKey] = {
        modelName: "Video Transitions",
        provider: "wavespeed",
        generationCount: userTrans.length,
        creditsConsumed: transBilled,
        estProviderCost: transProviderCost,
        revenueEquivalent: 0,
        profitLoss: 0,
        lastUsedAt: userTrans[0].createdAt,
      };
    }

    const actualCreditValue = creditsGranted > 0 ? (totalPayments / creditsGranted) : 0;
    const revenueEquivalent = creditsConsumed * actualCreditValue;

    // Finalize usageByModel statistics
    const usageByModel = Object.values(modelUsageMap).map((item) => {
      const revEq = item.creditsConsumed * actualCreditValue;
      const profitLoss = revEq - item.estProviderCost;
      return {
        ...item,
        estProviderCost: parseFloat(item.estProviderCost.toFixed(3)),
        revenueEquivalent: parseFloat(revEq.toFixed(2)),
        profitLoss: parseFloat(profitLoss.toFixed(3)),
      };
    });

    const estGrossProfit = revenueEquivalent - totalEstProviderCost;
    const grossMarginPercent = revenueEquivalent > 0 ? (estGrossProfit / revenueEquivalent) * 100 : (totalEstProviderCost > 0 ? -100 : 0);

    const planName = sub?.planId ? sub.planId.toUpperCase() : "FREE";
    const billingType = sub?.billingInterval === "annual" ? "Annual" : sub?.billingInterval === "monthly" ? "Monthly" : "Manual";
    const status = user.creditsExpireAt && new Date(user.creditsExpireAt) < now ? "Expired" : sub?.planId ? "Active" : "None";
    const startDate = userTxs.length > 0 ? userTxs[0].createdAt : user.createdAt;
    const endDate = user.creditsExpireAt || sub?.stripeCurrentPeriodEnd || null;
    const usagePercent = creditsGranted > 0 ? Math.min(100, (creditsConsumed / creditsGranted) * 100) : 0;

    const subscriber = {
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
      estProviderCost: parseFloat(totalEstProviderCost.toFixed(2)),
      estGrossProfit: parseFloat(estGrossProfit.toFixed(2)),
      revenueEquivalent: parseFloat(revenueEquivalent.toFixed(2)),
      grossMarginPercent: parseFloat(grossMarginPercent.toFixed(1)),
      generationsCount: userGens.length,
      creditAdvanceBalance: user.creditAdvanceBalance,
      creditAdvanceRequestedAt: user.creditAdvanceRequestedAt,
      creditAdvanceCycleEnd: user.creditAdvanceCycleEnd,
    };

    // Construct generations history (last 50)
    const mappedGens = userGens.map(g => {
      const normalizedId = MODEL_ALIAS_MAP[g.modelUsed] || g.modelUsed;
      const config = pricingModels.find(m => m.id === normalizedId || m.name === normalizedId);
      const provider = config?.provider || "kie";
      const costEst = estimateProviderCost(g.modelUsed, g.cost, pricingModels);
      const { preview, duration, resolution } = parsePromptInfo(g.prompt);

      return {
        date: g.createdAt,
        toolType: g.assetType || g.type || "Generation",
        model: g.modelUsed,
        provider,
        promptPreview: preview,
        duration,
        resolution,
        creditsCharged: g.cost,
        providerCostEstimate: g.providerCostUsd !== null ? g.providerCostUsd : parseFloat(costEst.usd.toFixed(4)),
        status: g.status || "COMPLETED",
        outputUrl: g.outputUrl || g.mediaUrl || null,
      };
    });

    const mappedTrans = userTrans.map(t => {
      return {
        date: t.createdAt,
        toolType: "TRANSITION",
        model: t.presetId || "Transition",
        provider: "wavespeed",
        promptPreview: `Transition Project: ${t.projectId}`,
        duration: null,
        resolution: null,
        creditsCharged: t.creditsCost,
        providerCostEstimate: parseFloat((t.creditsCost * 0.005).toFixed(4)),
        status: t.status.toUpperCase(),
        outputUrl: t.resultUrl || null,
      };
    });

    const generations = [...mappedGens, ...mappedTrans]
      .sort((a, b) => b.date.getTime() - a.date.getTime())
      .slice(0, 50);

    return NextResponse.json({
      subscriber,
      usageByModel,
      generations,
    });
  } catch (error: any) {
    console.error("[SUBSCRIBER_DETAIL_ANALYTICS_ERROR]", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}
