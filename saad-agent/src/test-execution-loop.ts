import { ExecutionSessionManager } from "./platform/services/planner.js";
import { ReasoningEngine } from "./platform/services/reasoning-engine.js";
import { EventBus } from "./platform/services/event-bus.js";
import type { AppEvent } from "./platform/services/event-bus.js";
import { ProviderHealthMonitor } from "./platform/services/health-monitor.js";
import { CheckpointManager } from "./memory/checkpoint.js";
import { ToolManager } from "./platform/services/tool-manager.js";
import "./platform/tools/index.js";
import { CONFIG, setProjectRoot } from "./config.js";
import * as fs from "fs/promises";
import * as path from "path";

// Register mock tools to isolate test run compilation / test steps
ToolManager.registerTool({
  definition: {
    name: "build-tool",
    description: "mock build",
    parameters: {},
    permissions: ["execute"],
    approvalRequired: false,
  },
  execute: async () => ({ success: true, stdout: "mock build success" }),
});

ToolManager.registerTool({
  definition: {
    name: "test-tool",
    description: "mock test",
    parameters: {},
    permissions: ["execute"],
    approvalRequired: false,
  },
  execute: async () => ({ success: true, stats: { passed: 5, failed: 0 } }),
});

// Helper to inject mock health outcomes
function setMockProviderHealth(status: "online" | "offline") {
  ProviderHealthMonitor.clearRegisteredProviders();
  ProviderHealthMonitor.registerProvider(CONFIG.PROVIDER, async () => ({
    name: "Mock Provider",
    status,
    details: status === "offline" ? "Connection timeout simulated" : "Online",
  }));
}

async function runTests() {
  console.log("=== Saad Agent Phase 9 Execution Loop & Reasoning Refactor Tests ===");

  const originalRoot = CONFIG.PROJECT_ROOT;
  const tempWorkspace = path.join(process.cwd(), "temp-test-exec-workspace");
  const testFile = path.join(tempWorkspace, "index.css");

  try {
    // Setup clean sandbox workspace
    await fs.rm(tempWorkspace, { recursive: true, force: true });
    await fs.mkdir(tempWorkspace, { recursive: true });
    await fs.writeFile(testFile, "body { background: #000; }", "utf8");

    // Dynamic config project root switch
    setProjectRoot(tempWorkspace);

    // Capture published EventBus events
    const eventsReceived: string[] = [];
    const unsubscribe = EventBus.subscribe("*", (evt: AppEvent) => {
      eventsReceived.push(evt.type);
    });

    // 1. Configurable Model Roles Check
    console.log("\n--- Test 1: Configurable Model Roles ---");
    console.log("Coding role model mapped correctly:", CONFIG.ROLES.Coding !== undefined);
    console.log("Vision role model mapped correctly:", CONFIG.ROLES.Vision !== undefined);
    console.log("Reviewer role model mapped correctly:", CONFIG.ROLES.Reviewer !== undefined);
    console.log("Fast role model mapped correctly:", CONFIG.ROLES.Fast !== undefined);

    // 2. Planner to Reasoning Engine Delegation & Model Client Communication
    console.log("\n--- Test 2: Planner & Reasoning Engine Integration ---");
    setMockProviderHealth("online");

    let completionCalled = false;
    let requestedModelName = "";
    const originalChatCompletion = (await import("./platform/services/model-client.js")).ModelClient.chatCompletion;
    (await import("./platform/services/model-client.js")).ModelClient.chatCompletion = async (sys, usr, model) => {
      completionCalled = true;
      requestedModelName = model;
      return JSON.stringify({
        taskSummary: "Adjust style configurations in index.css",
        affectedFiles: ["index.css"],
        requiredTools: ["fs-tool", "patch-tool"],
        requiredPermissions: ["read", "write"],
        riskLevel: "high",
        proposedSteps: ["Inspect index.css stylesheet properties", "Apply style patches"],
        validationSteps: ["Compile layouts"],
        safetyNotes: "Verify layout alignments",
        approvalRequired: true,
      });
    };

    const session = ExecutionSessionManager.createSession("Adjust index.css styling", tempWorkspace);
    const plan = await ExecutionSessionManager.generatePlanForSession(session.id);

    console.log("Planner delegated to ReasoningEngine (completionCalled):", completionCalled);
    console.log("ModelClient received correct dynamic role model:", requestedModelName === CONFIG.ROLES.Coding);
    console.log("Plan source is model:", plan.planSource === "model");

    // 3. Execution Loop Flow (Create checkpoint -> Apply patch -> Build -> Test -> Report)
    console.log("\n--- Test 3: Controlled Execution Loop (Apply patch, build, test, report) ---");
    
    // Check that we cannot execute before approval
    let executionThrew = false;
    try {
      await ExecutionSessionManager.executeApprovedPlan(session.id);
    } catch {
      executionThrew = true;
    }
    console.log("Execution halted before plan approval:", executionThrew);

    // Approve the plan
    ExecutionSessionManager.respondToPlan(session.id, true);
    console.log("Session state is approved:", session.state === "approved");

    // Build unified diff mock patch
    const patchContent = `Index: index.css
===================================================================
--- index.css
+++ index.css
@@ -1,1 +1,2 @@
 body { background: #000; }
+body { color: #fff; }
`;

    // Run execution loop
    const execResult = await ExecutionSessionManager.executeApprovedPlan(session.id, patchContent);
    console.log("execResult:", execResult);
    console.log("Execution loop completed successfully:", execResult.success);
    console.log("Checkpoint ID created:", execResult.checkpointId !== undefined);
    console.log("Patch applied:", execResult.patchApplied);
    console.log("Report path exists:", execResult.reportPath !== undefined);

    // Check patch applied successfully to sandbox workspace file
    const content = await fs.readFile(testFile, "utf8");
    console.log("File contains patched modifications:", content.includes("body { color: #fff; }"));

    // Check pre-patch rollback checkpoint is registered
    const cpManager = new CheckpointManager();
    const checkpoints = await cpManager.list();
    console.log("Backup checkpoint exists in checkpoints manager list:", checkpoints.some(cp => cp.id === execResult.checkpointId));

    // Verify EventBus events for build check, test check and execution status
    console.log("EventBus captured ExecutionStarted:", eventsReceived.includes("ExecutionStarted"));
    console.log("EventBus captured BuildCheckStarted:", eventsReceived.includes("BuildCheckStarted"));
    console.log("EventBus captured BuildCheckCompleted:", eventsReceived.includes("BuildCheckCompleted"));
    console.log("EventBus captured TestCheckStarted:", eventsReceived.includes("TestCheckStarted"));
    console.log("EventBus captured TestCheckCompleted:", eventsReceived.includes("TestCheckCompleted"));
    console.log("EventBus captured ExecutionCompleted:", eventsReceived.includes("ExecutionCompleted"));

    // Restore ModelClient chatCompletion
    (await import("./platform/services/model-client.js")).ModelClient.chatCompletion = originalChatCompletion;
    unsubscribe();
    console.log("\n✅ All Phase 9 Execution Loop & Reasoning tests completed successfully!");
  } catch (err) {
    console.error("Test execution failed:", err);
  } finally {
    // Restore original root
    setProjectRoot(originalRoot);

    // Cleanup
    await fs.rm(tempWorkspace, { recursive: true, force: true });
    ExecutionSessionManager.clearSessions();
    ProviderHealthMonitor.clearRegisteredProviders();
    
    // Clear temp checkpoints folder
    const checkpointsDir = path.join(CONFIG.PROJECT_ROOT, ".saad-agent", "checkpoints");
    const cpEntries = await fs.readdir(checkpointsDir, { withFileTypes: true }).catch(() => []);
    for (const entry of cpEntries) {
      if (entry.name.startsWith("cp-")) {
        await fs.rm(path.join(checkpointsDir, entry.name), { recursive: true, force: true }).catch(() => {});
      }
    }
  }
}

runTests();
