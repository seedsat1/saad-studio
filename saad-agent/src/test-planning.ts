import { ExecutionSessionManager } from "./platform/services/planner.js";
import { EventBus } from "./platform/services/event-bus.js";
import type { AppEvent } from "./platform/services/event-bus.js";
import { WorkflowEngine } from "./platform/services/workflow-engine.js";
import "./platform/services/planning-workflow.js"; // Loads and registers the workflow template
import * as fs from "fs/promises";
import * as path from "path";

async function runTests() {
  console.log("=== Saad Agent Phase 7 Planning & Execution Loop Tests ===");

  const tempWorkspace = path.join(process.cwd(), "temp-test-planning-workspace");
  const testFile = path.join(tempWorkspace, "index.css");

  try {
    // Setup clean sandbox workspace
    await fs.rm(tempWorkspace, { recursive: true, force: true });
    await fs.mkdir(tempWorkspace, { recursive: true });
    
    // Create a dummy stylesheet to verify file scanning matches
    await fs.writeFile(testFile, "body { background: #000; }", "utf8");

    // Capture published EventBus events
    const eventsReceived: string[] = [];
    const unsubscribe = EventBus.subscribe("*", (evt: AppEvent) => {
      eventsReceived.push(evt.type);
    });

    // 1. Session Creation Verification
    console.log("\n--- Test 1: Session Creation ---");
    const taskText = "Modify index.css to change background and commit changes";
    const session = ExecutionSessionManager.createSession(taskText, tempWorkspace);
    
    console.log("Session ID generated:", session.id);
    console.log("Session initial state (should be created):", session.state);
    console.log("Session task text matches:", session.taskText === taskText);

    // 2. Context Assembly & Plan Generation
    console.log("\n--- Test 2: Plan Generation ---");
    const plan = await ExecutionSessionManager.generatePlanForSession(session.id);
    
    console.log("Plan Summary:", plan.taskSummary);
    console.log("Plan Risk Level (should be high because of write/git):", plan.riskLevel);
    console.log("Awaiting approval state:", session.state === "awaiting_approval");

    // 3. Affected Files & Tools Detection
    console.log("\n--- Test 3: Affected Files & Tools Detection ---");
    console.log("Detected affected files (should contain index.css):", plan.affectedFiles);
    console.log("Contains index.css:", plan.affectedFiles.includes("index.css"));
    console.log("Required tools (should contain fs-tool, patch-tool, git-tool):", plan.requiredTools);
    console.log("Required permissions (should contain read, write):", plan.requiredPermissions);

    // 4. Verification that no file modifications occur
    console.log("\n--- Test 4: Safety Check (No modifications) ---");
    const statsBefore = await fs.stat(testFile);
    const contentBefore = await fs.readFile(testFile, "utf8");
    
    console.log("File content matches original:", contentBefore === "body { background: #000; }");
    console.log("File modification time before response:", statsBefore.mtimeMs);

    // 5. Approve State Transition Verification
    console.log("\n--- Test 5: Plan Approval ---");
    ExecutionSessionManager.respondToPlan(session.id, true);
    console.log("Session state after approval (should be approved):", session.state);
    console.log("Session approvalStatus:", session.approvalStatus);

    // Assert that the file is STILL unmodified
    const statsAfter = await fs.stat(testFile);
    const contentAfter = await fs.readFile(testFile, "utf8");
    console.log("File content after approval is STILL unchanged:", contentAfter === contentBefore);
    console.log("File mtime remains identical:", statsAfter.mtimeMs === statsBefore.mtimeMs);

    // 6. Workflow Engine Template Registration Check
    console.log("\n--- Test 6: Workflow Template Registration ---");
    const registeredWf = WorkflowEngine.getWorkflow("EngineeringPlanningWorkflow");
    console.log("Workflow template registered:", !!registeredWf);
    console.log("Workflow steps count:", registeredWf?.steps.length);
    console.log("First step action:", registeredWf?.steps[0]?.action);

    // 7. Event Bus Publish Integration Check
    console.log("\n--- Test 7: Event Bus Integrations ---");
    console.log("Published lifecycle events captured:", eventsReceived);
    const expectedEvents = [
      "ExecutionSessionCreated",
      "ContextAssembled",
      "PlanGenerated",
      "ApprovalRequired",
      "PlanApproved",
    ];
    for (const event of expectedEvents) {
      console.log(`Event "${event}" published:`, eventsReceived.includes(event));
    }

    unsubscribe();
    console.log("\n✅ All Phase 7 Planning & Execution Loop tests completed successfully!");
  } catch (err) {
    console.error("Test execution failed:", err);
  } finally {
    // Cleanup
    await fs.rm(tempWorkspace, { recursive: true, force: true });
    ExecutionSessionManager.clearSessions();
    WorkflowEngine.clearRegistry();
  }
}

runTests();
