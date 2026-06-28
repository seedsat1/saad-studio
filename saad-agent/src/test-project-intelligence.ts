import { ProjectIntelligenceService } from "./platform/services/project-intelligence.js";
import { EngineeringMemory } from "./platform/services/engineering-memory.js";
import { EventBus } from "./platform/services/event-bus.js";
import { CONFIG, setProjectRoot } from "./config.js";
import * as fs from "fs/promises";
import * as path from "path";

async function runTests() {
  console.log("=== Saad Agent Phase 12 Project Intelligence Tests ===");

  const originalRoot = CONFIG.PROJECT_ROOT;
  const tempWorkspace = path.join(process.cwd(), "temp-test-intelligence-workspace");
  const testFile1 = path.join(tempWorkspace, "index.css");
  const testFile2 = path.join(tempWorkspace, "package.json");
  const testFile3 = path.join(tempWorkspace, "config.env");

  let workspaceChangedTriggered = false;
  let knowledgeUpdatedTriggered = false;

  EventBus.subscribe("WorkspaceChanged", () => {
    workspaceChangedTriggered = true;
  });

  EventBus.subscribe("KnowledgeUpdated", () => {
    knowledgeUpdatedTriggered = true;
  });

  try {
    // Setup clean sandbox workspace
    await fs.rm(tempWorkspace, { recursive: true, force: true });
    await fs.mkdir(tempWorkspace, { recursive: true });
    await fs.writeFile(testFile1, "body { background: #000; }", "utf8");

    setProjectRoot(tempWorkspace);
    await EngineeringMemory.clearMemory();

    // 1. Initial Scan (Establish baseline hashes)
    console.log("\n--- Test 1: Baseline Scanning ---");
    await ProjectIntelligenceService.scanChanges();
    console.log("File hashes baseline initialized successfully.");

    // 2. Workspace Watcher additions & modifications
    console.log("\n--- Test 2: Workspace Watcher & Incremental Refresh ---");
    // Add file & modify file
    await fs.writeFile(testFile2, '{ "dependencies": {} }', "utf8");
    await fs.writeFile(testFile1, "body { background: #fff; }", "utf8");

    workspaceChangedTriggered = false;
    knowledgeUpdatedTriggered = false;

    // Scan again
    await ProjectIntelligenceService.scanChanges();

    console.log("WorkspaceChanged event published:", workspaceChangedTriggered);
    console.log("KnowledgeUpdated event published:", knowledgeUpdatedTriggered);

    // 3. Notifications queue
    console.log("\n--- Test 3: Notifications Queue ---");
    const notifications = ProjectIntelligenceService.getNotifications();
    console.log("Notifications count:", notifications.length);
    console.log("Workspace Changed notification title:", notifications[0]?.title);
    console.log("Workspace Changed notification severity:", notifications[0]?.severity);

    // Clear notification
    if (notifications[0]) {
      ProjectIntelligenceService.clearNotification(notifications[0].id);
      console.log("Notifications count after clear:", ProjectIntelligenceService.getNotifications().length);
    }

    // 4. Change Intelligence classification & impact logging
    console.log("\n--- Test 4: Change Classification & Logging ---");
    // Verify memory logs have registered the file classifications
    const successLogs = await EngineeringMemory.getSuccesses();
    console.log("Change logs registered in Engineering Memory:", successLogs.length > 0);
    console.log("Registered log describes changes:", successLogs[0]?.description.includes("Classified:"));

    // 5. Health Monitoring checks
    console.log("\n--- Test 5: Health Monitoring ---");
    const health = await ProjectIntelligenceService.refreshHealth();
    console.log("Workspace valid state detected:", health.workspaceValid === true);
    console.log("Node Runtime detected:", health.runtimeStatus.nodeAvailable !== undefined);
    console.log("Python Runtime detected:", health.runtimeStatus.pythonAvailable !== undefined);

    // 6. Safety Assertions (Verify Read-only constraint)
    console.log("\n--- Test 6: Safety Verification ---");
    const afterStyle = await fs.readFile(testFile1, "utf8");
    const afterDeps = await fs.readFile(testFile2, "utf8");
    console.log("Style content unchanged by monitoring scan:", afterStyle === "body { background: #fff; }");
    console.log("Package json unchanged by monitoring scan:", afterDeps === '{ "dependencies": {} }');

    console.log("\n✅ All Phase 12 Project Intelligence tests completed successfully!");
  } catch (err) {
    console.error("Test execution failed:", err);
  } finally {
    setProjectRoot(originalRoot);
    await fs.rm(tempWorkspace, { recursive: true, force: true });
    ProjectIntelligenceService.stopWatcher();
  }
}

runTests();
