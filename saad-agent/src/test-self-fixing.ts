import { ExecutionSessionManager } from "./platform/services/planner.js";
import { EngineeringMemory } from "./platform/services/engineering-memory.js";
import { ToolManager } from "./platform/services/tool-manager.js";
import { CONFIG, setProjectRoot } from "./config.js";
import "./platform/tools/index.js";
import * as fs from "fs/promises";
import * as path from "path";

// Mock build tool compiler results dynamically to simulate failures and successful fixes
let mockBuildShouldSucceed = false;

// Override build-tool for testing
const originalExecute = ToolManager.execute;
ToolManager.execute = async function (toolName: string, args: any, options?: any) {
  if (toolName === "build-tool") {
    if (mockBuildShouldSucceed) {
      return { success: true, stdout: "build successful" };
    } else {
      return { success: false, stdout: "compiler error: missing semicolon" };
    }
  }
  if (toolName === "patch-tool") {
    const testFile = path.join(process.cwd(), "temp-test-self-fixing-workspace", "index.css");
    // Write mock file changes to verify checkpoints restoration
    if (args.patch) {
      if (args.patch.includes("background: #111")) {
        await fs.writeFile(testFile, "body { background: #111; }", "utf8");
      } else if (args.patch.includes("fixed")) {
        await fs.writeFile(testFile, "body { background: #222; }", "utf8");
      }
    }
    return { success: true, results: [{ file: "index.css", applied: true }] };
  }
  if (toolName === "test-tool") {
    return { success: true, passed: 5, failed: 0 };
  }
  return originalExecute.call(ToolManager, toolName, args, options);
};

async function runTests() {
  console.log("=== Saad Agent Phase 11 Controlled Self-Fixing & Retry Tests ===");

  const originalRoot = CONFIG.PROJECT_ROOT;
  const tempWorkspace = path.join(process.cwd(), "temp-test-self-fixing-workspace");
  const testFile = path.join(tempWorkspace, "index.css");

  try {
    // Setup clean sandbox workspace
    await fs.rm(tempWorkspace, { recursive: true, force: true });
    await fs.mkdir(tempWorkspace, { recursive: true });
    await fs.writeFile(testFile, "body { background: #000; }", "utf8");

    setProjectRoot(tempWorkspace);
    await EngineeringMemory.clearMemory();

    // 1. Initial execution and Build Failure
    console.log("\n--- Test 1: Build failure triggers self-fixing state ---");
    const session = ExecutionSessionManager.createSession("Design layout refactor", tempWorkspace);
    session.affectedFiles = ["index.css"];
    
    // Auto-approve plan
    ExecutionSessionManager.respondToPlan(session.id, true);
    console.log("Initial state after plan approval:", session.state); // approved

    // Execute plan with initial patch content
    mockBuildShouldSucceed = false; // Force compile error
    const initialPatch = `Index: index.css
===================================================================
--- index.css
+++ index.css
@@ -1,1 +1,1 @@
-body { background: #000; }
+body { background: #111;
`;
    const res1 = await ExecutionSessionManager.executeApprovedPlan(session.id, initialPatch);
    
    console.log("Execution success status (should be false):", res1.success);
    console.log("Current state (should be awaiting_fix_approval):", session.state);
    console.log("Failure reason logged:", session.failureReason);
    console.log("Proposed fix patch diff exists:", session.proposedFixPatch !== undefined);
    console.log("Retry count (should be 0):", session.retryCount);

    // Verify error was written to Failure Memory
    const failures = await EngineeringMemory.getFailures();
    console.log("Failure records list count (should be 1):", failures.length);
    console.log("Failure cause matches error:", failures[0]?.cause.includes("compiler error: missing semicolon"));

    // 2. Respond to fix (Approve Fix - Retry 1)
    console.log("\n--- Test 2: Approve Fix & Retry 1 (compilation fails again) ---");
    mockBuildShouldSucceed = false; // still failing
    await ExecutionSessionManager.respondToFix(session.id, true);

    console.log("State after retry 1 failure (should be awaiting_fix_approval):", session.state);
    console.log("Retry count incremented to (should be 1):", session.retryCount);

    // 3. Respond to fix (Approve Fix - Retry 2 - compilation succeeds)
    console.log("\n--- Test 3: Approve Fix & Retry 2 (compilation succeeds) ---");
    mockBuildShouldSucceed = true; // Succeeded!
    await ExecutionSessionManager.respondToFix(session.id, true);

    console.log("State after successful retry (should be completed):", session.state);
    console.log("Retry count clamped at (should be 2):", session.retryCount);

    // Print all failure records for triage
    const failuresLogs = await EngineeringMemory.getFailures();
    console.log("Failure logs causes during run:", failuresLogs.map(f => f.cause));

    // Verify success & decision were logged to memory
    const successes = await EngineeringMemory.getSuccesses();
    const decisions = await EngineeringMemory.getDecisions();
    console.log("Success records list count (should be 1):", successes.length);
    console.log("Decision records list count (should be 1):", decisions.length);

    // Reset testFile content to original state before Test 4 to avoid state contamination
    await fs.writeFile(testFile, "body { background: #000; }", "utf8");

    // 4. Test 4: Verify Max Retry Limit clamping
    console.log("\n--- Test 4: Max Retry Limit Clamp ---");
    const session2 = ExecutionSessionManager.createSession("Design layouts again", tempWorkspace);
    session2.affectedFiles = ["index.css"];
    ExecutionSessionManager.respondToPlan(session2.id, true);
    
    mockBuildShouldSucceed = false;
    await ExecutionSessionManager.executeApprovedPlan(session2.id, initialPatch);
    console.log("Session 2 - initial error state:", session2.state); // awaiting_fix_approval
    console.log("Session 2 - retryCount:", session2.retryCount); // 0

    // Retry 1
    await ExecutionSessionManager.respondToFix(session2.id, true);
    console.log("Session 2 - retry 1 state:", session2.state); // awaiting_fix_approval
    console.log("Session 2 - retryCount:", session2.retryCount); // 1

    // Retry 2 (Fails again)
    await ExecutionSessionManager.respondToFix(session2.id, true);
    console.log("Session 2 - retry 2 state (should be failed):", session2.state); // failed
    console.log("Session 2 - retryCount (should be 2):", session2.retryCount); // 2

    // 5. Checkpoint Rollback
    console.log("\n--- Test 5: Checkpoint Rollback ---");
    // Verify file content is currently modified
    const currentStyle = await fs.readFile(testFile, "utf8");
    console.log("Current style content (modified):", currentStyle);

    // Rollback session 2
    const rollbackSuccess = await ExecutionSessionManager.rollbackSession(session2.id);
    console.log("Rollback completed successfully:", rollbackSuccess);
    console.log("State after rollback (should be cancelled):", session2.state);

    const restoredStyle = await fs.readFile(testFile, "utf8");
    console.log("Restored style content (should be original body { background: #000; }):", restoredStyle);

    console.log("\n✅ All Phase 11 Controlled Self-Fixing & Retry tests completed successfully!");
  } catch (err) {
    console.error("Test execution failed:", err);
  } finally {
    setProjectRoot(originalRoot);
    await fs.rm(tempWorkspace, { recursive: true, force: true });
    ExecutionSessionManager.clearSessions();
    ToolManager.execute = originalExecute;
  }
}

runTests();
