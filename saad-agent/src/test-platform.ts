import * as fs from "fs/promises";
import * as path from "path";
import { StorageManager } from "./platform/storage-manager.js";
import { RuntimeManager } from "./platform/runtime/runtime-manager.js";
import { WorkspaceManager } from "./platform/workspace-manager.js";
import { PROJECT_ROOT } from "./config.js";

async function runTests() {
  console.log("=== Saad Agent Phase 4 Platform Tests ===");

  const tempRoot = path.join(process.cwd(), "temp-test-platform");
  
  try {
    // Cleanup previous runs
    await fs.rm(tempRoot, { recursive: true, force: true });
    await fs.mkdir(tempRoot, { recursive: true });

    // 1. Storage Manager Directory Initialization
    console.log("\n--- Step 1: Storage Manager Directories Setup ---");
    await StorageManager.initializeDirectories(tempRoot);
    const requiredSubfolders = [
      "knowledge", "memory", "history", "checkpoints", "attachments",
      "cache", "prompts", "workflows", "logs", "state"
    ];
    for (const folder of requiredSubfolders) {
      const exists = await fs.access(path.join(tempRoot, ".saad-agent", folder))
        .then(() => true)
        .catch(() => false);
      console.log(`Directory .saad-agent/${folder} initialized:`, exists);
    }

    // 2. Storage Manager Migration
    console.log("\n--- Step 2: Storage Manager Legacy Migration ---");
    const agentDir = path.join(tempRoot, ".saad-agent");
    
    // Write fake legacy files directly in .saad-agent/
    await fs.writeFile(path.join(agentDir, "memory.json"), '{"data": "legacy-memory"}', "utf8");
    await fs.writeFile(path.join(agentDir, "architecture.json"), '{"data": "legacy-architecture"}', "utf8");

    const migrationReport = await StorageManager.checkAndMigrate(tempRoot);
    console.log("Migration executed:", !!migrationReport);
    console.log("Migration success status:", migrationReport?.success);
    console.log("Migrated files count:", migrationReport?.migratedFiles.length);

    // Verify files were moved
    const memoryMoved = await fs.access(path.join(agentDir, "knowledge", "memory.json")).then(() => true).catch(() => false);
    const archMoved = await fs.access(path.join(agentDir, "knowledge", "architecture.json")).then(() => true).catch(() => false);
    const oldMemoryRemoved = await fs.access(path.join(agentDir, "memory.json")).then(() => false).catch(() => true);
    console.log("memory.json moved to knowledge/ folder:", memoryMoved);
    console.log("architecture.json moved to knowledge/ folder:", archMoved);
    console.log("Legacy memory.json deleted from root:", oldMemoryRemoved);

    // Verify backup folder exists under checkpoints/
    const backupFolderExists = migrationReport ? await fs.access(path.join(agentDir, "checkpoints", path.basename(migrationReport.backupPath))).then(() => true).catch(() => false) : false;
    console.log("Backup folder created in checkpoints/:", backupFolderExists);

    // Verify report was written to history/
    const reportsInHistory = await fs.readdir(path.join(agentDir, "history"));
    console.log("Report file written in history/:", reportsInHistory.length > 0);

    // 3. Runtime Manager & Detection
    console.log("\n--- Step 3: Runtime Manager & Detection ---");
    const runtimes = await RuntimeManager.detectAll();
    console.log("Node Runtime valid:", runtimes.node.isValid);
    console.log("Node Runtime version:", runtimes.node.version);
    console.log("Node Runtime executable:", runtimes.node.path);

    console.log("Python Runtime detected:", runtimes.python.isValid);
    console.log("Python Runtime version:", runtimes.python.version);
    console.log("Python Runtime executable:", runtimes.python.path);

    // Test Node script execution
    console.log("\n--- Step 4: Testing Script Execution (Node) ---");
    const testScriptPath = path.join(tempRoot, "test-script.js");
    await fs.writeFile(testScriptPath, "console.log('HELLO FROM NODE SCRIPT');", "utf8");
    
    const runResult = await RuntimeManager.execute("node", testScriptPath, [], tempRoot);
    console.log("Execution success:", runResult.success);
    console.log("Execution stdout:", runResult.stdout.trim());
    console.log("Execution code:", runResult.code);

    // Test Node package inspection
    console.log("\n--- Step 5: Testing Packages List (Node) ---");
    const nodeRuntime = RuntimeManager.getRuntime("node");
    const packages = await nodeRuntime.listPackages();
    console.log("Listed packages count:", packages.length);
    if (packages.length > 0) {
      console.log("Sample package:", packages[0]);
    }

    console.log("\n✅ All Phase 4 Platform tests completed successfully!");
  } catch (err) {
    console.error("Test execution failed:", err);
  } finally {
    // Cleanup
    await fs.rm(tempRoot, { recursive: true, force: true });
  }
}

runTests();
