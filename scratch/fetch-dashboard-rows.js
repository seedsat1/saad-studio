const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

// Inline estimateProviderCostSync for pure JS execution in scratch
function estimateProviderCostSync(modelRef, durationSec = 5, quality) {
  const modelLower = (modelRef || "").toLowerCase();

  // 1. Reap/ClipCraft costing
  if (modelLower.includes("reap") || modelLower.includes("clipcraft")) {
    let ratePerMin = 0.05;
    if (modelLower.includes("dubbing") || modelLower.includes("translation")) {
      ratePerMin = 0.12;
    } else if (modelLower.includes("reframe")) {
      ratePerMin = 0.08;
    } else if (modelLower.includes("transcription")) {
      ratePerMin = 0.03;
    } else if (modelLower.includes("edit-videos")) {
      ratePerMin = 0.15;
    }
    const durationMin = durationSec / 60;
    return { usd: parseFloat((durationMin * ratePerMin).toFixed(4)), source: "estimated" };
  }

  // 2. BytePlus/Dreamina/Seedance costing
  const isSeedance2Route =
    modelRef === "bytedance/dreamina-v3.0/text-to-video-720p" ||
    modelRef === "bytedance/seedance-v2/text-to-video" ||
    modelRef === "bytedance/seedance-v2/text-to-video-fast" ||
    modelRef.includes("dreamina-seedance") ||
    modelRef.includes("seedance2");

  if (isSeedance2Route) {
    const bpResolution = String(quality || "720p").toLowerCase();
    let bpTokensPerSec = 12000;
    if (bpResolution.includes("480")) bpTokensPerSec = 6000;
    else if (bpResolution.includes("1080")) bpTokensPerSec = 30000;
    else if (bpResolution.includes("4k")) bpTokensPerSec = 70000;
    const bpTokens = durationSec * bpTokensPerSec;
    const bpEstimatedCost = bpTokens * 0.0000043;
    return { usd: bpEstimatedCost, source: "estimated" };
  }

  // Fallbacks
  if (modelLower.includes("assist") || modelLower.includes("chat") || modelLower.includes("gemini-3-pro") || modelLower.includes("gpt")) {
    return { usd: 0.002, source: "estimated" };
  }
  if (modelLower.includes("transition")) {
    return { usd: 0.02, source: "estimated" };
  }
  if (modelLower.includes("image") || modelLower.includes("banana") || modelLower.includes("rmbg") || modelLower.includes("upscale") || modelLower.includes("face-swap")) {
    return { usd: durationSec * 0.01, source: "estimated" };
  }
  if (modelLower.includes("elevenlabs") || modelLower.includes("audio") || modelLower.includes("voice") || modelLower.includes("tts")) {
    return { usd: durationSec * 0.01, source: "estimated" };
  }
  return { usd: null, source: "unknown" };
}

async function main() {
  const ids = [
    "cmqr700yb0001zrrhwxb2i4sh", // BytePlus
    "cmqr6ore70001wzkzeb7gg9zh", // KIE
    "cmqrx95k500028xq827zaolry", // Google
    "cmq428wsw0002iuhahram9v87", // WaveSpeed
    "cmpvzcqic0002jcuddlxgdwio"  // Reap
  ];

  const generations = await prisma.generation.findMany({
    where: { id: { in: ids } },
    include: {
      user: { select: { email: true } },
      providerUsageRecords: { take: 1 }
    }
  });

  // Calculate actualCreditValue per user to compute recognized revenue
  const allUsers = await prisma.user.findMany({ select: { id: true, email: true } });
  const allTxs = await prisma.adminTransaction.findMany({
    where: { paymentStatus: "COMPLETED" },
    select: { userId: true, amount: true, credits: true },
  });

  const userCreditValues = {};
  allUsers.forEach((user) => {
    const userTxs = allTxs.filter(t => t.userId === user.id);
    const totalPayments = userTxs.reduce((sum, t) => sum + t.amount, 0);
    const txCredits = userTxs.reduce((sum, t) => sum + t.credits, 0);
    const isOmar = user.email === "omarworkimn@gmail.com";
    const creditsGranted = txCredits + (isOmar ? 2700 : 0);
    userCreditValues[user.id] = creditsGranted > 0 ? (totalPayments / creditsGranted) : 0;
  });

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
      costSource: providerCostSource,
    };
  });

  console.log("=== Mapped Dashboard Rows ===");
  console.log(JSON.stringify(mapped, null, 2));
}

main().catch(console.error).finally(() => prisma.$disconnect());
