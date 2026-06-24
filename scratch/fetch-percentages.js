const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

// Inline estimateProviderCostSync
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
  const generations = await prisma.generation.findMany({
    include: {
      providerUsageRecords: { take: 1 }
    }
  });

  let actualCount = 0;
  let estimatedCount = 0;
  let unknownCount = 0;

  generations.forEach((gen) => {
    const usage = gen.providerUsageRecords[0] || null;

    let duration = usage ? usage.duration : gen.duration;
    let resolution = usage ? usage.resolution : gen.resolution;
    let quality = usage ? usage.quality : gen.quality;
    let providerCostUsd = usage ? usage.providerCostUsd : gen.providerCostUsd;
    let providerCostSource = usage ? usage.providerCostSource : gen.providerCostSource;

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

    if (providerCostSource === "actual") {
      actualCount++;
    } else if (providerCostSource === "estimated") {
      estimatedCount++;
    } else {
      unknownCount++;
    }
  });

  const total = generations.length;
  console.log("=== Dynamic Cost Source Stats ===");
  console.log(`Total records: ${total}`);
  console.log(`ACTUAL: ${actualCount} (${((actualCount/total)*100).toFixed(2)}%)`);
  console.log(`ESTIMATED: ${estimatedCount} (${((estimatedCount/total)*100).toFixed(2)}%)`);
  console.log(`UNKNOWN: ${unknownCount} (${((unknownCount/total)*100).toFixed(2)}%)`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
