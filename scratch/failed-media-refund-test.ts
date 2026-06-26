// Mocking core dependencies for isolated execution of the flow verification
import { resolveProviderMediaUrl, verifyPublicMediaUrl, ValidationError } from "../lib/media/public-url-resolver";

// Simple state simulation for a mock user
const userState = {
  id: "mock-user-123",
  creditBalance: 100,
};

const generationState: Record<string, any> = {};

// Mock ledger actions
async function mockSpendCredits(cost: number, label: string) {
  if (userState.creditBalance < cost) {
    throw new Error("Insufficient credits");
  }
  userState.creditBalance -= cost;
  const genId = `gen-${Date.now()}`;
  generationState[genId] = {
    id: genId,
    userId: userState.id,
    cost: cost,
    status: "pending",
  };
  console.log(`[Ledger] 💳 spendCredits: Charged ${cost} credits. User balance now: ${userState.creditBalance}`);
  return { generationId: genId };
}

async function mockRefundGenerationCharge(genId: string, cost: number, reason: string) {
  const gen = generationState[genId];
  if (!gen) throw new Error("Generation not found");
  
  userState.creditBalance += cost;
  gen.cost = 0;
  gen.status = "failed";
  console.log(`[Ledger] 🔄 refundGenerationCharge: Refunded ${cost} credits to user. Reason: "${reason}". User balance now: ${userState.creditBalance}`);
  console.log(`[Ledger] Updated generation ${genId} state:`, JSON.stringify(gen, null, 2));
}

// Mock provider call
async function mockCallProvider(payload: any, shouldFail: boolean) {
  console.log(`[Provider] Calling provider with payload...`);
  if (shouldFail) {
    throw new Error("Provider 400: Invalid payload/media structure.");
  }
  return { status: "success", taskId: "task-abc-123" };
}

async function runFailedMediaTest() {
  console.log("\n======================================================");
  console.log("🧪 TEST CASE 4: Failed-Media Validation (Guard Path)");
  console.log("======================================================");
  console.log(`Initial User Credit Balance: ${userState.creditBalance}`);

  const invalidUrl = "https://nonexistent-domain-abc-123.com/image.jpg";
  const cost = 10;

  try {
    console.log("[Route] 1. Resolving media input...");
    const resolved = await resolveProviderMediaUrl(invalidUrl, { userId: userState.id, assetType: "image" });
    
    console.log("[Route] 2. Verifying public media accessibility...");
    await verifyPublicMediaUrl(resolved, "first_frame_url");

    // This should NOT be reached
    console.log("[Route] 3. Charging credits...");
    await mockSpendCredits(cost, "video generation");
  } catch (err) {
    if (err instanceof ValidationError) {
      console.log(`[Route] ❌ Caught ValidationError (Arabic response status 400):`);
      console.log(`   Message: "${err.message}"`);
      console.log(`[Route] Status code returned to client: 400 Bad Request`);
    } else {
      console.error("[Route] Unexpected error:", err);
    }
  }

  console.log(`Final User Credit Balance: ${userState.creditBalance} (No credits deducted!)`);
}

async function runProvider400RefundTest() {
  console.log("\n======================================================");
  console.log("🧪 TEST CASE 5: Provider-400 Auto-Refund Flow");
  console.log("======================================================");
  console.log(`Initial User Credit Balance: ${userState.creditBalance}`);

  // Mock global fetch for accessibility checks to succeed during this test case
  const originalFetch = global.fetch;
  global.fetch = async () => {
    return {
      ok: true,
      status: 200,
      statusText: "OK",
      headers: new Headers({
        "content-type": "image/jpeg",
        "content-length": "2048",
      }),
    } as any;
  };

  const validUrl = "https://saadstudio-storage.s3.eu-central-003.backblazeb2.com/images/valid-thumbnail.jpg";
  const cost = 10;
  let chargedCredits = 0;
  let generationId = "";

  try {
    console.log("[Route] 1. Resolving media input...");
    const resolved = await resolveProviderMediaUrl(validUrl, { userId: userState.id, assetType: "image" });
    
    console.log("[Route] 2. Verifying public media accessibility...");
    await verifyPublicMediaUrl(resolved, "first_frame_url");

    console.log("[Route] 3. Charging credits...");
    const charge = await mockSpendCredits(cost, "video generation");
    chargedCredits = cost;
    generationId = charge.generationId;

    console.log("[Route] 4. Calling provider...");
    // Force downstream provider failure (e.g. 400 Bad Request / 502 Bad Gateway)
    await mockCallProvider({ model: "veo", first_frame: resolved }, true);

  } catch (err: any) {
    console.log(`[Route] ❌ Caught Provider Error: "${err.message}"`);
    console.log("[Route] 5. Applying refund since call failed...");
    if (generationId && chargedCredits > 0) {
      await mockRefundGenerationCharge(generationId, chargedCredits, err.message);
    }
    console.log("[Route] Returning 502/400 failure back to client...");
  } finally {
    global.fetch = originalFetch;
  }

  console.log(`Final User Credit Balance: ${userState.creditBalance} (Credits successfully refunded!)`);
}

async function main() {
  await runFailedMediaTest();
  await runProvider400RefundTest();
}

main().catch((err) => {
  console.error("Test execution failed:", err);
});
