const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

const DEFAULT_MODELS = [
  { id: "bytedance/seedance-v2/text-to-video", provider: "byteplus", waveUsd: 0, billing: "per_sec", kieCredits: 0, isActive: true },
  { id: "bytedance/seedance-v2/text-to-video-fast", provider: "byteplus", waveUsd: 0, billing: "per_sec", kieCredits: 0, isActive: true },
  { id: "kwaivgi/kling-v3.0-pro/text-to-video", provider: "kie", waveUsd: 0, billing: "flat", kieCredits: 140, isActive: true },
  { id: "kling-3.0/video", provider: "kie", waveUsd: 0, billing: "flat", kieCredits: 140, isActive: true },
  { id: "nano-banana-pro", provider: "google", waveUsd: 0, billing: "flat", kieCredits: 4, isActive: true },
  { id: "google/veo3.1-text-to-video", provider: "google", waveUsd: 0, billing: "per_sec", kieCredits: 10, isActive: true },
  { id: "google/veo3.1-lite-text-to-video", provider: "google", waveUsd: 0, billing: "per_sec", kieCredits: 5, isActive: true },
  { id: "google/gemini-omni-video", provider: "google", waveUsd: 0, billing: "per_sec", kieCredits: 10, isActive: true },
  { id: "veo31_gem", provider: "google", waveUsd: 0, billing: "per_sec", kieCredits: 10, isActive: true },
  { id: "veo31_gem_fast", provider: "google", waveUsd: 0, billing: "per_sec", kieCredits: 5, isActive: true },
  { id: "wavespeed/qwen-image-edit-multiple-angles", provider: "wavespeed", waveUsd: 0.005, billing: "flat", kieCredits: 0, isActive: true },
  { id: "elevenlabs/music", provider: "wavespeed", waveUsd: 0.01, billing: "per_sec", kieCredits: 0, isActive: true },
  { id: "gpt-image-2-text-to-image", provider: "openai", waveUsd: 0, billing: "flat", kieCredits: 2, isActive: true }
];

function getRealisticDefaultDuration(modelRef) {
  const m = modelRef.toLowerCase();
  if (m.includes("seedance") || m.includes("dreamina")) {
    return 15;
  }
  if (m.includes("kling") || m.includes("hailuo") || m.includes("sora")) {
    return 10;
  }
  if (m.includes("veo") || m.includes("gemini-omni-video") || m.includes("veo31")) {
    return 5;
  }
  if (m.includes("reap") || m.includes("clipcraft")) {
    if (m.includes("transcription") || m.includes("captions")) return 180;
    if (m.includes("edit")) return 300;
    return 120;
  }
  if (m.includes("music")) {
    return 30;
  }
  if (m.includes("elevenlabs") || m.includes("voice") || m.includes("tts")) {
    return 10;
  }
  return 0;
}

function estimateProviderCostSync(modelRef, durationSec = 5, quality) {
  const modelLower = (modelRef || "").toLowerCase();

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

  if (modelLower.includes("assist") || modelLower.includes("chat") || modelLower.includes("gemini-3-pro") || modelLower.includes("gpt-4") || modelLower.includes("gpt-5") || modelLower.includes("claude")) {
    return { usd: 0.002, source: "estimated" };
  }
  if (modelLower.includes("transition")) {
    return { usd: 0.02, source: "estimated" };
  }
  if (modelLower.includes("image") || modelLower.includes("banana") || modelLower.includes("rmbg") || modelLower.includes("upscale") || modelLower.includes("face-swap")) {
    return { usd: 0.01, source: "estimated" };
  }
  if (modelLower.includes("elevenlabs") || modelLower.includes("audio") || modelLower.includes("voice") || modelLower.includes("tts")) {
    return { usd: durationSec * 0.01, source: "estimated" };
  }

  const model = DEFAULT_MODELS.find(m => m.id === modelRef);
  if (!model) {
    return { usd: 0, source: "unknown" };
  }

  if (model.provider === "wavespeed") {
    const usd = model.billing === "per_sec" ? durationSec * model.waveUsd : model.waveUsd;
    return { usd, source: "estimated" };
  }

  const multiplier = 1.0;
  const baseCredits = model.billing === "per_sec" ? durationSec * model.kieCredits : model.kieCredits;
  const kieCredits = baseCredits * multiplier;
  const usd = kieCredits * 0.005;
  return { usd, source: "estimated" };
}

function resolveProvider(providerName, modelUsed, providerModel) {
  let provider = providerName;
  if (!provider) {
    const modelLower = (providerModel || modelUsed || "").toLowerCase();
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
  if (provider === "KIE.ai") return "KIE.ai";
  return provider;
}

function resolveModelCategory(modelUsed) {
  const m = modelUsed.toLowerCase();
  if (m.includes("seedance") || m.includes("dreamina") || m.includes("seedream")) {
    return "Seedance";
  }
  if (m.includes("kling") || m.includes("hailuo") || m.includes("minimax")) {
    return "Kling";
  }
  if (m.includes("veo") || m.includes("gemini")) {
    return "Veo";
  }
  if (m.includes("banana")) {
    return "Nano Banana";
  }
  if (m.includes("gpt-image") || m.includes("dall-e") || m.includes("imagine")) {
    return "GPT Image";
  }
  if (m.includes("music") || m.includes("elevenlabs/music")) {
    return "Music";
  }
  if (m.includes("reap") || m.includes("clipcraft")) {
    return "Reap Tools";
  }
  return "Other";
}

async function main() {
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  // Fetch admin/test users to exclude them
  const testUsers = await prisma.user.findMany({
    where: {
      email: {
        in: ["seedsat@googlemail.com", "cookwife5@gmail.com"]
      }
    },
    select: { id: true }
  });
  const testUserIds = testUsers.map(u => u.id);

  // Fetch real transactions to compute credit pricing per user (for actual revenue recognition)
  const allUsers = await prisma.user.findMany({
    where: { id: { notIn: testUserIds } },
    select: { id: true, email: true }
  });
  const allTxs = await prisma.adminTransaction.findMany({
    where: {
      paymentStatus: "COMPLETED",
      userId: { notIn: testUserIds }
    },
    select: { userId: true, amount: true, credits: true },
  });

  const userCreditValues = {};
  allUsers.forEach((user) => {
    const userTxs = allTxs.filter(t => t.userId === user.id);
    const totalPayments = userTxs.reduce((sum, t) => sum + t.amount, 0);
    const txCredits = userTxs.reduce((sum, t) => sum + t.credits, 0);
    const isOmar = user.email === "omarworkimn@gmail.com";
    const creditsGranted = txCredits + (isOmar ? 2700 : 0);
    userCreditValues[user.id] = creditsGranted > 0 ? (totalPayments / creditsGranted) : 0.05; // fallback to $0.05
  });

  // Fetch generations, excluding admin/test users
  const generations = await prisma.generation.findMany({
    where: {
      createdAt: { gte: thirtyDaysAgo },
      userId: { notIn: testUserIds }
    },
    include: {
      providerUsageRecords: { take: 1 }
    }
  });

  console.log(`Found ${generations.length} real customer generations in the last 30 days.`);

  // Group by Provider
  const providerStats = {};
  // Group by Model Category
  const modelStats = {};

  generations.forEach((gen) => {
    const usage = gen.providerUsageRecords[0] || null;
    const provider = resolveProvider(gen.providerName, gen.modelUsed, gen.providerModel || gen.providerName);
    const modelCategory = resolveModelCategory(gen.modelUsed);

    let duration = usage ? usage.duration : gen.duration;
    let resolution = usage ? usage.resolution : gen.resolution;
    let quality = usage ? usage.quality : gen.quality;
    let providerCostUsd = usage ? usage.providerCostUsd : gen.providerCostUsd;

    // Use realistic default duration if duration is null
    if (duration === null || duration === undefined) {
      duration = getRealisticDefaultDuration(gen.modelUsed);
    }

    // Estimate cost if not stored
    if (providerCostUsd === null || providerCostUsd === undefined) {
      const costEst = estimateProviderCostSync(gen.modelUsed, duration, resolution || quality);
      providerCostUsd = costEst.usd;
    }

    const cost = providerCostUsd || 0;
    const creditsCharged = gen.cost || 0;
    const actualCreditValue = userCreditValues[gen.userId] || 0.05;
    const revenue = creditsCharged * actualCreditValue;

    // Grouping by Provider
    if (!providerStats[provider]) {
      providerStats[provider] = {
        totalGenerations: 0,
        totalCreditsCharged: 0,
        totalProviderCost: 0,
        totalRevenue: 0
      };
    }
    providerStats[provider].totalGenerations++;
    providerStats[provider].totalCreditsCharged += creditsCharged;
    providerStats[provider].totalProviderCost += cost;
    providerStats[provider].totalRevenue += revenue;

    // Grouping by Model Category
    if (!modelStats[modelCategory]) {
      modelStats[modelCategory] = {
        totalGenerations: 0,
        totalCreditsCharged: 0,
        totalProviderCost: 0,
        totalRevenue: 0
      };
    }
    modelStats[modelCategory].totalGenerations++;
    modelStats[modelCategory].totalCreditsCharged += creditsCharged;
    modelStats[modelCategory].totalProviderCost += cost;
    modelStats[modelCategory].totalRevenue += revenue;
  });

  console.log("\n=== REAL CUSTOMERS PROVIDER STATS ===");
  for (const [provider, stats] of Object.entries(providerStats)) {
    const grossProfit = stats.totalRevenue - stats.totalProviderCost;
    const margin = stats.totalRevenue > 0 ? (grossProfit / stats.totalRevenue) * 100 : 0;
    console.log(`\nProvider: ${provider}`);
    console.log(`  Total Generations: ${stats.totalGenerations}`);
    console.log(`  Total Credits Charged: ${stats.totalCreditsCharged.toFixed(2)}`);
    console.log(`  Average Credits Charged: ${(stats.totalCreditsCharged / stats.totalGenerations).toFixed(2)}`);
    console.log(`  Total Provider Cost (USD): $${stats.totalProviderCost.toFixed(4)}`);
    console.log(`  Average Cost Per Generation (USD): $${(stats.totalProviderCost / stats.totalGenerations).toFixed(4)}`);
    console.log(`  Total Revenue (USD): $${stats.totalRevenue.toFixed(2)}`);
    console.log(`  Gross Profit (USD): $${grossProfit.toFixed(2)}`);
    console.log(`  Margin %: ${margin.toFixed(2)}%`);
  }

  console.log("\n=== REAL CUSTOMERS MODEL CATEGORY STATS ===");
  for (const [category, stats] of Object.entries(modelStats)) {
    const grossProfit = stats.totalRevenue - stats.totalProviderCost;
    const margin = stats.totalRevenue > 0 ? (grossProfit / stats.totalRevenue) * 100 : 0;
    console.log(`\nModel Category: ${category}`);
    console.log(`  Total Generations: ${stats.totalGenerations}`);
    console.log(`  Total Credits Charged: ${stats.totalCreditsCharged.toFixed(2)}`);
    console.log(`  Average Credits Charged: ${(stats.totalCreditsCharged / stats.totalGenerations).toFixed(2)}`);
    console.log(`  Total Provider Cost (USD): $${stats.totalProviderCost.toFixed(4)}`);
    console.log(`  Average Cost Per Generation (USD): $${(stats.totalProviderCost / stats.totalGenerations).toFixed(4)}`);
    console.log(`  Total Revenue (USD): $${stats.totalRevenue.toFixed(2)}`);
    console.log(`  Gross Profit (USD): $${grossProfit.toFixed(2)}`);
    console.log(`  Margin %: ${margin.toFixed(2)}%`);
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
