const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

const userId = "user_3EGsHzh6eCMhZ4OMcgagSaF0Di7"; // omar alnaser

async function main() {
  console.log("Starting Simulated BytePlus Dreamina Seedance 2.0 generation flow...");

  const modelRoute = "bytedance/seedance-v2/text-to-video";
  const userCreditsCharged = 23;
  const prompt = "A majestic dragon flying over a medieval castle, highly detailed, 4k resolution";
  const duration = 15;
  const resolution = "1080p";
  const aspectRatio = "16:9";

  // --- STEP 1: INITIAL STATE (QUEUED / PROCESSING) ---
  console.log("\n=== Step 1: Initializing Generation in DB (Queued/Processing) ===");
  
  // Calculate initial estimates
  const bpTokensPerSec = 30000; // For 1080p
  const bpTokens = duration * bpTokensPerSec; // 450,000 tokens
  const bpEstimatedCost = bpTokens * 0.0000043; // $1.935 USD

  const gen = await prisma.generation.create({
    data: {
      userId,
      prompt,
      status: "queued",
      assetType: "VIDEO",
      modelUsed: modelRoute,
      cost: userCreditsCharged,
      providerName: "BytePlus",
      providerModel: "dreamina-seedance-2-0-260128",
      providerCostUsd: bpEstimatedCost, // estimated
      providerTokens: bpTokens, // estimated
      providerCostSource: "estimated", // estimated source
      aspectRatio,
      duration,
      resolution,
      mediaUrl: "task:ark:cgt-1782252248156123456"
    }
  });

  const record = await prisma.providerUsageRecord.create({
    data: {
      userId,
      generationId: gen.id,
      providerName: "BytePlus",
      providerModel: "dreamina-seedance-2-0-260128",
      providerRequestId: "cgt-1782252248156123456",
      providerCostUsd: bpEstimatedCost,
      providerTokens: bpTokens,
      providerCostSource: "estimated",
      duration,
      resolution,
      aspectRatio,
      status: "queued"
    }
  });

  console.log("Staged Generation in DB:");
  console.log(JSON.stringify(gen, null, 2));

  console.log("\nStaged ProviderUsageRecord in DB:");
  console.log(JSON.stringify(record, null, 2));

  // --- STEP 2: RAW REQUEST SENT TO BYTEPLUS ---
  const rawRequest = {
    model: "dreamina-seedance-2-0-260128",
    content: [
      { type: "text", text: prompt }
    ],
    generate_audio: false,
    ratio: aspectRatio,
    duration: duration,
    resolution: resolution,
    watermark: true
  };

  console.log("\n=== Step 2: Raw Request sent to BytePlus (Dreamina/Ark) ===");
  console.log(JSON.stringify(rawRequest, null, 2));

  // --- STEP 3: RAW RESPONSE FROM BYTEPLUS (CREATION) ---
  const rawResponse = {
    id: "cgt-1782252248156123456",
    task_id: "cgt-1782252248156123456",
    status: "processing",
    data: {
      id: "cgt-1782252248156123456",
      status: "processing"
    }
  };

  console.log("\n=== Step 3: Raw Response from BytePlus ===");
  console.log(JSON.stringify(rawResponse, null, 2));

  // --- STEP 4: RAW POLLING/CALLBACK STATUS RESPONSE FROM BYTEPLUS (COMPLETED) ---
  const rawPollingCompleted = {
    id: "cgt-1782252248156123456",
    status: "completed",
    request_id: "req-9876543210",
    data: {
      id: "cgt-1782252248156123456",
      status: "completed",
      content: {
        video_url: "https://pub-3e0355a14eda4ec78c6e81b217a9a399.r2.dev/videos/user_3EGsHzh6eCMhZ4OMcgagSaF0Di7/completed-byteplus.mp4",
        video_duration: 15,
        video_resolution: "1080p"
      },
      usage: {
        completion_tokens: 450000,
        total_tokens: 450000
      }
    }
  };

  console.log("\n=== Step 4: Raw Polling Status from BytePlus (Completed) ===");
  console.log(JSON.stringify(rawPollingCompleted, null, 2));

  // --- STEP 5: APPLY RECONCILIATION UPDATES TO DATABASE ---
  console.log("\n=== Step 5: Applying Reconciled updates to database ===");

  const bpResult = rawPollingCompleted.data;
  const tokensUsed = bpResult.usage.completion_tokens;
  const actualCostUsd = tokensUsed * 0.0000043;
  const outputUrl = bpResult.content.video_url;

  // Update Generation
  const updatedGen = await prisma.generation.update({
    where: { id: gen.id },
    data: {
      status: "completed",
      outputUrl,
      mediaUrl: outputUrl,
      providerRequestId: rawPollingCompleted.id,
      providerTokens: tokensUsed,
      providerCostUsd: actualCostUsd,
      providerCostSource: "actual",
      duration: bpResult.content.video_duration,
      resolution: bpResult.content.video_resolution
    }
  });

  // Update ProviderUsageRecord
  const updatedRecord = await prisma.providerUsageRecord.update({
    where: { id: record.id },
    data: {
      status: "completed",
      providerRequestId: rawPollingCompleted.id,
      providerTokens: tokensUsed,
      providerCostUsd: actualCostUsd,
      providerCostSource: "actual",
      duration: bpResult.content.video_duration,
      resolution: bpResult.content.video_resolution,
      rawPayloadSafe: JSON.stringify(rawPollingCompleted).slice(0, 5000)
    }
  });

  console.log("Updated Generation in DB:");
  console.log(JSON.stringify(updatedGen, null, 2));

  console.log("\nUpdated ProviderUsageRecord in DB:");
  console.log(JSON.stringify(updatedRecord, null, 2));

  // --- STEP 6: VERIFY DASHBOARD ROW MAPPING ---
  const actualCreditValue = 0.05; // Mock user credit value (e.g. $0.05 per user credit)
  const revenue = updatedGen.cost * actualCreditValue;
  const profit = revenue - actualCostUsd;
  const marginPercent = revenue > 0 ? (profit / revenue) * 100 : 0;

  const dashboardRow = {
    id: updatedGen.id,
    userEmail: "omarworkimn@gmail.com",
    model: updatedGen.modelUsed,
    provider: "BytePlus",
    taskId: updatedGen.providerRequestId,
    duration: updatedGen.duration,
    resolution: updatedGen.resolution,
    quality: updatedGen.quality,
    creditsCharged: updatedGen.cost,
    providerCostUsd: parseFloat(actualCostUsd.toFixed(4)),
    providerTokens: tokensUsed,
    providerCredits: null,
    profit: parseFloat(profit.toFixed(4)),
    margin: parseFloat(marginPercent.toFixed(2)),
    costSource: "actual",
    createdAt: updatedGen.createdAt
  };

  console.log("\n=== Dashboard Row mapping ===");
  console.log(JSON.stringify(dashboardRow, null, 2));
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
