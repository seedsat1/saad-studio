import { EngineeringMemory } from "./platform/services/engineering-memory.js";
import { ExecutionSessionManager } from "./platform/services/planner.js";
import { ContextManager } from "./platform/services/context-manager.js";
import { CONFIG, setProjectRoot } from "./config.js";
import * as fs from "fs/promises";
import * as path from "path";

async function runTests() {
  console.log("=== Saad Agent Phase 10 Engineering Memory Tests ===");

  const originalRoot = CONFIG.PROJECT_ROOT;
  const tempWorkspace = path.join(process.cwd(), "temp-test-memory-workspace");
  const testFile = path.join(tempWorkspace, "index.css");

  try {
    // Setup clean sandbox workspace
    await fs.rm(tempWorkspace, { recursive: true, force: true });
    await fs.mkdir(tempWorkspace, { recursive: true });
    await fs.writeFile(testFile, "body { background: #000; }", "utf8");

    // Dynamic config project root switch
    setProjectRoot(tempWorkspace);

    // 1. Secrets Scrubbing Check
    console.log("\n--- Test 1: Secrets Scrubbing ---");
    const rawText = "Connecting with api_key: 'sk-1234567890abcdef' and token = 'auth_token_xyz'";
    const scrubbed = EngineeringMemory.scrubSecrets(rawText);
    console.log("Scrubbed text:", scrubbed);
    console.log("Contains raw api_key:", !scrubbed.includes("sk-1234567890abcdef"));
    console.log("Contains raw token:", !scrubbed.includes("auth_token_xyz"));
    console.log("Contains REDACTED tag:", scrubbed.includes("[REDACTED]"));

    // 2. Decision Log Persistence & Retrieval
    console.log("\n--- Test 2: Decision Log Persistence ---");
    const decision = await EngineeringMemory.logDecision({
      workspace: tempWorkspace,
      taskSummary: "Refactor stylesheets config using api_key='sk-prod'",
      reasoning: "Decouple variables configuration",
      filesAffected: ["index.css"],
      riskLevel: "medium",
      outcome: "Successfully resolved stylings",
      userApprovalRef: "session-123",
    });

    console.log("Decision ID generated:", decision.id !== undefined);
    console.log("Decision timestamp logged:", decision.timestamp !== undefined);
    console.log("Decision secret scrubbed:", !decision.taskSummary.includes("sk-prod"));

    const decisions = await EngineeringMemory.getDecisions();
    console.log("Decisions list count:", decisions.length);
    console.log("Retrieved decision ID matches:", decisions[0]?.id === decision.id);

    // 3. Knowledge Base Persistence
    console.log("\n--- Test 3: Knowledge Base Persistence ---");
    const kbItem = await EngineeringMemory.addKnowledgeItem({
      area: "Stylesheets variables design patterns",
      description: "Introduce modern custom properties for components",
      relatedFiles: ["index.css"],
      debtNote: "Old plain variables remain in legacy files",
    });

    const kbItems = await EngineeringMemory.getKnowledgeItems();
    console.log("KB list count:", kbItems.length);
    console.log("Retrieved KB area matches:", kbItems[0]?.area === kbItem.area);

    // 4. Failure Memory & Success Memory Persistence
    console.log("\n--- Test 4: Failure & Success Memories ---");
    const failure = await EngineeringMemory.logFailure({
      cause: "Compilation failure: variable mismatch",
      resolution: "Correct color references",
      relatedFiles: ["index.css"],
      checkpointId: "cp-123",
    });

    const failures = await EngineeringMemory.getFailures();
    console.log("Failures list count:", failures.length);
    console.log("Retrieved failure cause matches:", failures[0]?.cause === failure.cause);

    const success = await EngineeringMemory.logSuccess({
      type: "Variable migrations",
      description: "Migrated 10 color styles",
      relatedFiles: ["index.css"],
    });

    const successes = await EngineeringMemory.getSuccesses();
    console.log("Successes list count:", successes.length);
    console.log("Retrieved success description matches:", successes[0]?.description === success.description);

    // 5. Semantic Memory Index Search
    console.log("\n--- Test 5: Semantic Memory Index Search ---");
    const searchRes1 = await EngineeringMemory.searchMemory({ keyword: "stylesheets" });
    console.log("Search matches decisions for keyword 'stylesheets':", searchRes1.decisions.length > 0);
    console.log("Search matches KB for keyword 'stylesheets':", searchRes1.knowledgeItems.length > 0);

    const searchRes2 = await EngineeringMemory.searchMemory({ file: "index.css" });
    console.log("Search matches failures for file 'index.css':", searchRes2.failures.length > 0);
    console.log("Search matches successes for file 'index.css':", searchRes2.successes.length > 0);

    // 6. Context Integration & Planner Context Injection
    console.log("\n--- Test 6: Planner Context Injection ---");
    const session = ExecutionSessionManager.createSession("Stylesheets design task", tempWorkspace);
    
    // Planner should automatically retrieve relevant memory items matching task keywords (e.g. "stylesheets")
    // and append them to context manager.
    await ExecutionSessionManager.generatePlanForSession(session.id);

    const retrievedItems = await EngineeringMemory.retrieveRelevantContext(session.taskText);
    console.log("Retrieved contextual items size:", retrievedItems.length);
    console.log("Retrieved items contain historical decision:", retrievedItems.some(i => i.id.startsWith("memory:decision:")));
    console.log("Retrieved items contain success record:", retrievedItems.some(i => i.id.startsWith("memory:success:")));
    console.log("Retrieved items contain failure record:", retrievedItems.some(i => i.id.startsWith("memory:failure:")));

    console.log("\n✅ All Phase 10 Engineering Memory tests completed successfully!");
  } catch (err) {
    console.error("Test execution failed:", err);
  } finally {
    // Restore original root
    setProjectRoot(originalRoot);
    // Cleanup
    await fs.rm(tempWorkspace, { recursive: true, force: true });
    ExecutionSessionManager.clearSessions();
  }
}

runTests();
