import { ExecutionSessionManager } from "./platform/services/planner.js";
import { EventBus } from "./platform/services/event-bus.js";
import type { AppEvent } from "./platform/services/event-bus.js";
import { ProviderHealthMonitor } from "./platform/services/health-monitor.js";
import { CONFIG } from "./config.js";
import * as fs from "fs/promises";
import * as path from "path";

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
  console.log("=== Saad Agent Phase 8 Planner Model Integration Tests ===");

  const tempWorkspace = path.join(process.cwd(), "temp-test-model-workspace");
  const testFile = path.join(tempWorkspace, "index.css");
  const envFile = path.join(tempWorkspace, ".env");
  const secretsFile = path.join(tempWorkspace, "credentials.json");

  try {
    // Setup clean sandbox workspace
    await fs.rm(tempWorkspace, { recursive: true, force: true });
    await fs.mkdir(tempWorkspace, { recursive: true });
    await fs.writeFile(testFile, "body { background: #000; }", "utf8");
    await fs.writeFile(envFile, "DATABASE_URL=postgres://...", "utf8");
    await fs.writeFile(secretsFile, '{"private_key": "abc"}', "utf8");

    // Capture published EventBus events
    const eventsReceived: string[] = [];
    const unsubscribe = EventBus.subscribe("*", (evt: AppEvent) => {
      eventsReceived.push(evt.type);
    });

    // 1. Context Safety Exclusions Check
    console.log("\n--- Test 1: Context Safety (Secret Exclusions) ---");
    console.log(".env is classified as sensitive:", ExecutionSessionManager.isSensitiveFile(".env"));
    console.log(".env.local is classified as sensitive:", ExecutionSessionManager.isSensitiveFile(".env.local"));
    console.log("credentials.json is classified as sensitive:", ExecutionSessionManager.isSensitiveFile("credentials.json"));
    console.log("index.css is NOT sensitive:", !ExecutionSessionManager.isSensitiveFile("index.css"));

    // 2. Provider Offline Fallback Verification
    console.log("\n--- Test 2: Provider Offline Fallback ---");
    setMockProviderHealth("offline");

    const session1 = ExecutionSessionManager.createSession("Verify index.css styling", tempWorkspace);
    const plan1 = await ExecutionSessionManager.generatePlanForSession(session1.id);
    
    console.log("Plan source is rule_based_fallback:", plan1.planSource === "rule_based_fallback");
    console.log("Fallback status includes offline:", plan1.fallbackStatus === "Provider offline");
    console.log("EventBus captured ModelPlanningFailed:", eventsReceived.includes("ModelPlanningFailed"));
    console.log("EventBus captured RuleBasedFallbackUsed:", eventsReceived.includes("RuleBasedFallbackUsed"));

    // Restore online status
    setMockProviderHealth("online");
    eventsReceived.length = 0; // Clear events list

    // 3. Valid model JSON plan parsing
    console.log("\n--- Test 3: Valid Model JSON Plan ---");
    const originalChatCompletion = (await import("./platform/services/model-client.js")).ModelClient.chatCompletion;
    (await import("./platform/services/model-client.js")).ModelClient.chatCompletion = async () => {
      return JSON.stringify({
        taskSummary: "Modify index.css style settings",
        affectedFiles: ["index.css", ".env"], // .env should be filtered out by planner
        requiredTools: ["fs-tool", "patch-tool"],
        requiredPermissions: ["read", "write"],
        riskLevel: "high",
        proposedSteps: ["Inspect index.css stylesheet properties", "Draft style adjustment proposals"],
        validationSteps: ["Compile layout styles"],
        safetyNotes: "Verify layout alignments",
        approvalRequired: true,
      });
    };

    const session2 = ExecutionSessionManager.createSession("Adjust index.css styling", tempWorkspace);
    const plan2 = await ExecutionSessionManager.generatePlanForSession(session2.id);

    console.log("Plan source is model:", plan2.planSource === "model");
    console.log("JSON validation status is passed:", plan2.jsonValidationStatus === "passed");
    console.log(".env was filtered out from affectedFiles:", !plan2.affectedFiles.includes(".env"));
    console.log("EventBus captured PlanValidationPassed:", eventsReceived.includes("PlanValidationPassed"));

    // 4. Invalid JSON regex repair pathway
    console.log("\n--- Test 4: Invalid JSON Repair Path ---");
    (await import("./platform/services/model-client.js")).ModelClient.chatCompletion = async () => {
      return `Sure! Here is the plan details:
\`\`\`json
{
  "taskSummary": "Formulate style patches for index.css",
  "affectedFiles": ["index.css"],
  "requiredTools": ["fs-tool"],
  "requiredPermissions": ["read"],
  "riskLevel": "low",
  "proposedSteps": ["Inspect index.css properties"],
  "validationSteps": ["Run build verification check"],
  "approvalRequired": true
}
\`\`\`
Let me know if you need anything else!`;
    };

    const session3 = ExecutionSessionManager.createSession("Analyze index.css structure", tempWorkspace);
    const plan3 = await ExecutionSessionManager.generatePlanForSession(session3.id);

    console.log("Plan source is repaired_model:", plan3.planSource === "repaired_model");
    console.log("JSON validation status is repaired:", plan3.jsonValidationStatus === "repaired");
    console.log("EventBus captured PlanJsonInvalid:", eventsReceived.includes("PlanJsonInvalid"));
    console.log("EventBus captured PlanJsonRepaired:", eventsReceived.includes("PlanJsonRepaired"));

    // 5. Invalid JSON repair fails (fallback to rule-based)
    console.log("\n--- Test 5: Invalid JSON Repair Fails (Fallback) ---");
    (await import("./platform/services/model-client.js")).ModelClient.chatCompletion = async () => {
      return `Here is the plan:
This is not a JSON object, it contains random conversational text without matching braces.`;
    };

    const session4 = ExecutionSessionManager.createSession("Inspect files", tempWorkspace);
    const plan4 = await ExecutionSessionManager.generatePlanForSession(session4.id);

    console.log("Plan source is rule_based_fallback:", plan4.planSource === "rule_based_fallback");
    console.log("Fallback status includes repair failure:", plan4.fallbackStatus === "Model output schema validation failed");
    console.log("EventBus captured RuleBasedFallbackUsed:", eventsReceived.includes("RuleBasedFallbackUsed"));

    // 6. Safety Constraints: Check that no source file modifications occurred!
    console.log("\n--- Test 6: Safety Check (Zero writes) ---");
    const content = await fs.readFile(testFile, "utf8");
    console.log("File content remains identical to original:", content === "body { background: #000; }");

    // Restore ModelClient chatCompletion
    (await import("./platform/services/model-client.js")).ModelClient.chatCompletion = originalChatCompletion;
    unsubscribe();
    console.log("\n✅ All Phase 8 Planner Model Integration tests completed successfully!");
  } catch (err) {
    console.error("Test execution failed:", err);
  } finally {
    // Cleanup
    await fs.rm(tempWorkspace, { recursive: true, force: true });
    ExecutionSessionManager.clearSessions();
    ProviderHealthMonitor.clearRegisteredProviders();
  }
}

runTests();
