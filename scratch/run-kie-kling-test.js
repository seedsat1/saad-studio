const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
const fetch = require("node-fetch");

const KIE_API_KEY = "f122d5e686f4ad31e9bd6cea84505e9e";
const userId = "user_3EGsHzh6eCMhZ4OMcgagSaF0Di7"; // omar alnaser

async function main() {
  console.log("Starting real KIE Kling video generation test...");

  // 1. Create a Generation entry (queued)
  const cost = 23; // user credits charged
  const prompt = "A futuristic neon city with flying cars, cinematic slow motion, 4k";
  
  const gen = await prisma.generation.create({
    data: {
      userId,
      prompt,
      status: "queued",
      assetType: "VIDEO",
      modelUsed: "kwaivgi/kling-v3.0-pro/text-to-video",
      cost,
      providerName: "KIE.ai",
      providerModel: "kling-3.0/video",
      providerCostSource: "estimated",
      providerCostUsd: 140 * 0.005, // initial estimated cost based on KIE credits estimate (e.g. 140 credits)
      providerCredits: 140,
      aspectRatio: "16:9",
      duration: 10,
      resolution: "1080p",
      mediaUrl: "task:pending"
    }
  });

  const record = await prisma.providerUsageRecord.create({
    data: {
      userId,
      generationId: gen.id,
      providerName: "KIE.ai",
      providerModel: "kling-3.0/video",
      providerCostSource: "estimated",
      providerCostUsd: 140 * 0.005,
      providerCredits: 140,
      duration: 10,
      resolution: "1080p",
      aspectRatio: "16:9",
      status: "queued"
    }
  });

  console.log(`[Database Created] Generation ID: ${gen.id}`);
  console.log(`[Database Created] ProviderUsageRecord ID: ${record.id}`);

  // 2. Prepare raw request for KIE createTask
  const callbackUrl = "https://saadstudio.app/api/callback";
  const kieModel = "kling-3.0/video";
  const kieInput = {
    prompt: prompt,
    mode: "pro",
    sound: false,
    duration: "10",
    aspect_ratio: "16:9",
    multi_shots: false,
    multi_prompt: []
  };

  const createBody = {
    model: kieModel,
    callBackUrl: callbackUrl,
    input: kieInput
  };

  console.log("\n=== Raw Request sent to KIE ===");
  console.log(JSON.stringify(createBody, null, 2));

  // 3. Dispatch request to KIE
  const response = await fetch("https://api.kie.ai/api/v1/jobs/createTask", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${KIE_API_KEY}`
    },
    body: JSON.stringify(createBody)
  });

  const createJson = await response.json();
  console.log("\n=== Raw Response from KIE ===");
  console.log(JSON.stringify(createJson, null, 2));

  if (!response.ok || !createJson.data || !createJson.data.taskId) {
    console.error("KIE task creation failed.");
    return;
  }

  const taskId = createJson.data.taskId;
  console.log(`\nTask created successfully. taskId: ${taskId}`);

  // Update generation mediaUrl with task identifier
  await prisma.generation.update({
    where: { id: gen.id },
    data: { mediaUrl: `task:${taskId}` }
  });

  // 4. Poll status until complete
  console.log("\nPolling KIE status...");
  let status = "processing";
  let pollCount = 0;
  let finalData = null;

  while (status === "processing" && pollCount < 40) {
    pollCount++;
    console.log(`Polling check #${pollCount}...`);
    
    const pollRes = await fetch(`https://api.kie.ai/api/v1/jobs/recordInfo?taskId=${encodeURIComponent(taskId)}`, {
      headers: { Authorization: `Bearer ${KIE_API_KEY}` }
    });

    if (pollRes.ok) {
      const pollJson = await pollRes.json();
      const taskData = pollJson.data;
      const state = taskData?.taskStatus || taskData?.status || taskData?.state || "";
      console.log(`Current status: ${state}`);
      
      const normalized = (state || "").toLowerCase();
      if (["success", "succeed", "completed", "done", "finish", "finished"].includes(normalized)) {
        status = "completed";
        finalData = pollJson;
        break;
      }
      if (["fail", "failed", "error", "canceled", "cancelled"].includes(normalized)) {
        status = "failed";
        finalData = pollJson;
        break;
      }
    } else {
      console.log(`Poll failed with HTTP status ${pollRes.status}`);
    }

    // Wait 15 seconds
    await new Promise((resolve) => setTimeout(resolve, 15000));
  }

  if (status !== "completed") {
    console.error(`Task did not complete successfully or timed out. Final status: ${status}`);
    if (finalData) console.log(JSON.stringify(finalData, null, 2));
    return;
  }

  console.log("\n=== Raw Polling Final Data (containing completed task info) ===");
  console.log(JSON.stringify(finalData, null, 2));

  // 5. Construct Callback payload
  // In production, KIE posts to /api/callback with:
  // { code: 0, msg: "success", data: { taskId, taskStatus: "SUCCESS", response: { videoUrl: "..." }, credits: 140, duration: 10, resolution: "1080p" } }
  const taskData = finalData.data;
  const videoUrl = taskData.response?.videoUrl || taskData.response?.urls?.[0] || "";
  const actualCredits = taskData.credits || taskData.amount || 140;
  const actualDuration = taskData.duration || 10;
  const actualResolution = taskData.resolution || "1080p";

  const callbackPayload = {
    code: 0,
    msg: "success",
    data: {
      taskId: taskId,
      taskStatus: "SUCCESS",
      response: taskData.response || { videoUrl },
      credits: actualCredits,
      duration: actualDuration,
      resolution: actualResolution,
      quality: taskData.quality || "pro",
      aspectRatio: taskData.aspectRatio || "16:9",
      requestId: taskData.requestId || taskId
    }
  };

  console.log("\n=== Simulated Raw Callback ===");
  console.log(JSON.stringify(callbackPayload, null, 2));

  // 6. Execute Callback handling logic locally on the DB
  console.log("\nApplying callback updates to database...");

  const data = callbackPayload.data;
  const providerCredits = data.credits;
  const providerCostUsd = providerCredits * 0.005; // $0.005 per credit
  const providerRequestId = data.requestId || taskId;

  // Update Generation
  const updatedGen = await prisma.generation.update({
    where: { id: gen.id },
    data: {
      status: "completed",
      outputUrl: videoUrl,
      mediaUrl: videoUrl, // final URL
      providerRequestId,
      providerCredits,
      providerCostUsd,
      providerCostSource: "actual",
      duration: data.duration,
      resolution: data.resolution,
      quality: data.quality,
      aspectRatio: data.aspectRatio
    }
  });

  // Update ProviderUsageRecord
  const updatedRecord = await prisma.providerUsageRecord.update({
    where: { id: record.id },
    data: {
      status: "completed",
      providerRequestId,
      providerCredits,
      providerCostUsd,
      providerCostSource: "actual",
      duration: data.duration,
      resolution: data.resolution,
      quality: data.quality,
      aspectRatio: data.aspectRatio,
      rawPayloadSafe: JSON.stringify(callbackPayload).slice(0, 5000)
    }
  });

  console.log("\n=== Updated Record in Generation ===");
  console.log(JSON.stringify(updatedGen, null, 2));

  console.log("\n=== Updated Record in ProviderUsageRecord ===");
  console.log(JSON.stringify(updatedRecord, null, 2));

  // 7. Verify Dashboard Row mapping
  // Mimic mapping in app/api/admin/provider-costs/route.ts
  const actualCreditValue = 0.05; // Mock user credit value (e.g. $0.05 per user credit)
  const revenue = updatedGen.cost * actualCreditValue;
  const profit = revenue - providerCostUsd;
  const marginPercent = revenue > 0 ? (profit / revenue) * 100 : 0;

  const dashboardRow = {
    id: updatedGen.id,
    userEmail: "omarworkimn@gmail.com",
    model: updatedGen.modelUsed,
    provider: "KIE.ai",
    taskId: providerRequestId,
    duration: updatedGen.duration,
    resolution: updatedGen.resolution,
    quality: updatedGen.quality,
    creditsCharged: updatedGen.cost,
    providerCostUsd: parseFloat(providerCostUsd.toFixed(4)),
    providerTokens: null,
    providerCredits: providerCredits,
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
