import { CreativeEngine } from "./creative/creative-engine.js";
import { EventBus } from "./platform/services/event-bus.js";
import { CONFIG, setProjectRoot } from "./config.js";
import * as fs from "fs/promises";
import * as path from "path";

async function runTests() {
  console.log("=== Saad Agent Phase 18 Creative AI & Product Integration Tests ===");

  const originalRoot = CONFIG.PROJECT_ROOT;
  const tempWorkspace = path.join(process.cwd(), "temp-test-creative-workspace");
  const eventsFired: string[] = [];

  EventBus.subscribe("CreativePlanCreated", () => { eventsFired.push("CreativePlanCreated"); });
  EventBus.subscribe("GenerationApprovalRequired", () => { eventsFired.push("GenerationApprovalRequired"); });
  EventBus.subscribe("GenerationStarted", () => { eventsFired.push("GenerationStarted"); });
  EventBus.subscribe("GenerationProgressUpdated", () => { eventsFired.push("GenerationProgressUpdated"); });
  EventBus.subscribe("GenerationCompleted", () => { eventsFired.push("GenerationCompleted"); });
  EventBus.subscribe("GenerationFailed", () => { eventsFired.push("GenerationFailed"); });
  EventBus.subscribe("GeneratedAssetStored", () => { eventsFired.push("GeneratedAssetStored"); });

  try {
    await fs.rm(tempWorkspace, { recursive: true, force: true });
    await fs.mkdir(tempWorkspace, { recursive: true });
    setProjectRoot(tempWorkspace);

    // 1. Provider Discovery
    console.log("\n--- Test 1: Provider Discovery ---");
    const providers = CreativeEngine.getProviders();
    console.log("Total creative providers registered:", providers.length);
    const hasLocal = providers.some(p => p.id === "provider-local");
    const hasSaad = providers.some(p => p.id === "provider-saad-studio");
    console.log("Found Local Creative Provider:", hasLocal);
    console.log("Found Saad Studio Creative Provider:", hasSaad);

    // 2. Plan Creation & Approval Gate Verification
    console.log("\n--- Test 2: Plan Creation & Approval Gate ---");
    const plan = await CreativeEngine.createCreativePlan(
      "Cinematic cyberpunk cityscape with neon reflections",
      "provider-saad-studio",
      "flux-1.0-dev",
      "1024x1024",
      "temp-workspace"
    );

    console.log("Creative plan task ID generated:", plan.taskId);
    console.log("Requires approval is true:", plan.requiresApproval);
    console.log("Initial plan status (should be awaiting_approval):", plan.status);

    // Test Rejection Gate
    const rejectStatus = await CreativeEngine.approveJob(plan.taskId, false);
    console.log("Status after rejection (should be failed):", rejectStatus.status);
    console.log("Rejection error message:", rejectStatus.error);

    // 3. Generation Execution Truthfulness Guard
    console.log("\n--- Test 3: Approved Generation Without Mock Asset ---");
    const plan2 = await CreativeEngine.createCreativePlan(
      "Futuristic Saad Studio logo concept 3D render",
      "provider-local",
      "sd-xl-turbo",
      "512x512",
      "temp-workspace"
    );

    const approveStatus = await CreativeEngine.approveJob(plan2.taskId, true);
    console.log("Initial job execution status (should be failed until a real provider is configured):", approveStatus.status);
    console.log("Failure reason:", approveStatus.error);

    const finalJobStatus = await CreativeEngine.getJobStatus(plan2.taskId);
    console.log("Final job status (should remain failed):", finalJobStatus.status);
    console.log("Final job progress:", finalJobStatus.progress);
    console.log("Generated asset is absent:", !finalJobStatus.asset);
    if (finalJobStatus.status !== "failed" || finalJobStatus.asset) {
      throw new Error("Creative providers must not generate placeholder assets when no real generator is configured.");
    }

    // 4. EventBus Verification
    console.log("\n--- Test 4: EventBus Notifications Verification ---");
    console.log("Fired events list:", eventsFired);
    console.log("CreativePlanCreated fired:", eventsFired.includes("CreativePlanCreated"));
    console.log("GenerationApprovalRequired fired:", eventsFired.includes("GenerationApprovalRequired"));
    console.log("GenerationStarted fired:", eventsFired.includes("GenerationStarted"));
    console.log("GenerationFailed fired:", eventsFired.includes("GenerationFailed"));
    console.log("GenerationCompleted not fired:", !eventsFired.includes("GenerationCompleted"));
    console.log("GeneratedAssetStored not fired:", !eventsFired.includes("GeneratedAssetStored"));
    if (eventsFired.includes("GenerationCompleted") || eventsFired.includes("GeneratedAssetStored")) {
      throw new Error("Creative mock providers must not emit completed/stored events.");
    }

    console.log("\n✅ All Phase 18 Creative AI & Product Integration tests completed successfully!");
  } catch (err) {
    console.error("Test execution failed:", err);
  } finally {
    setProjectRoot(originalRoot);
    await fs.rm(tempWorkspace, { recursive: true, force: true });
  }
}

runTests();
