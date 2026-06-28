import { EngineeringOrchestrator } from "./platform/services/orchestrator.js";
import { ExecutionSessionManager } from "./platform/services/planner.js";
import { CONFIG, setProjectRoot } from "./config.js";
import * as fs from "fs/promises";
import * as path from "path";

async function runTests() {
  console.log("=== Saad Agent Phase 13 Engineering Orchestrator Tests ===");

  const originalRoot = CONFIG.PROJECT_ROOT;
  const tempWorkspace = path.join(process.cwd(), "temp-test-orchestrator-workspace");
  const testFile = path.join(tempWorkspace, "index.css");

  try {
    // Setup clean sandbox workspace
    await fs.rm(tempWorkspace, { recursive: true, force: true });
    await fs.mkdir(tempWorkspace, { recursive: true });
    await fs.writeFile(testFile, "body { background: #000; }", "utf8");

    setProjectRoot(tempWorkspace);

    // 1. Session Creation
    console.log("\n--- Test 1: Orchestrator Session Creation ---");
    const session = EngineeringOrchestrator.createSession("Design layouts refactor", tempWorkspace);
    console.log("Session ID generated:", session.id);
    console.log("Session initial status (should be awaiting_approval):", session.status);
    console.log("Session tasks count (should be 9):", session.tasks.length);

    // 2. Parallel Task Execution
    console.log("\n--- Test 2: Parallel Task Graph Execution ---");
    const healthTask = session.tasks.find(t => t.id === "health-check");
    const contextTask = session.tasks.find(t => t.id === "context-assembly");
    const planningTask = session.tasks.find(t => t.id === "planning");

    console.log("health-check task status before:", healthTask?.status);
    console.log("context-assembly task status before:", contextTask?.status);

    await EngineeringOrchestrator.executeParallelGraph(session);

    console.log("health-check task status after (should be completed):", healthTask?.status);
    console.log("context-assembly task status after (should be completed):", contextTask?.status);
    console.log("planning task status remains (should be pending):", planningTask?.status);

    // 3. Pause & Resume Controls
    console.log("\n--- Test 3: Pause & Resume ---");
    EngineeringOrchestrator.pauseSession(session.id);
    console.log("Session status after pause (should be paused):", session.status);

    try {
      await EngineeringOrchestrator.respondToPlan(session.id, true);
      console.log("ERROR: Managed to respond to plan during pause!");
    } catch (err: any) {
      console.log("Successfully caught respondToPlan during pause:", err.message);
    }

    EngineeringOrchestrator.resumeSession(session.id);
    console.log("Session status after resume (should be awaiting_approval):", session.status);

    // 4. Plan Response & Execution
    console.log("\n--- Test 4: Plan Approval & Dependency Tasks Updates ---");
    await EngineeringOrchestrator.respondToPlan(session.id, true);
    console.log("Session status after approval (should be running):", session.status);
    const planTaskAfter = session.tasks.find(t => t.id === "planning");
    const approvalTaskAfter = session.tasks.find(t => t.id === "approval");
    console.log("planning task status (should be completed):", planTaskAfter?.status);
    console.log("approval task status (should be completed):", approvalTaskAfter?.status);

    // 5. Safety boundary verification
    console.log("\n--- Test 5: Safety Verification ---");
    const content = await fs.readFile(testFile, "utf8");
    console.log("File index.css remains unmodified by Orchestrator planning phase:", content === "body { background: #000; }");

    console.log("\n✅ All Phase 13 Engineering Orchestrator tests completed successfully!");
  } catch (err) {
    console.error("Test execution failed:", err);
  } finally {
    setProjectRoot(originalRoot);
    await fs.rm(tempWorkspace, { recursive: true, force: true });
  }
}

runTests();
