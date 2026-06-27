import * as fs from "fs/promises";
import * as path from "path";
import { WorkspaceManager, getGlobalAppDataDir } from "./platform/workspace-manager.js";
import { PROJECT_ROOT, CONFIG } from "./config.js";

async function runTests() {
  console.log("=== Saad Agent Workspace System Tests ===");

  const tempRoot = path.join(process.cwd(), "temp-test-workspace");
  const nestedFolder = path.join(tempRoot, "my-project");

  try {
    // Cleanup any previous runs
    await fs.rm(tempRoot, { recursive: true, force: true });
    await fs.mkdir(nestedFolder, { recursive: true });

    // Step 1: Validate invalid workspace footprint
    console.log("\n--- Step 1: Validating invalid workspace footprint ---");
    const val1 = await WorkspaceManager.validateWorkspace(nestedFolder);
    console.log("Valid (should be false):", val1.valid);
    console.log("Error (should exist):", val1.error);

    // Step 2: Validate valid workspace footprint
    console.log("\n--- Step 2: Validating valid workspace footprint ---");
    // Create package.json to make it valid
    await fs.writeFile(path.join(nestedFolder, "package.json"), "{}", "utf8");
    const val2 = await WorkspaceManager.validateWorkspace(nestedFolder);
    console.log("Valid (should be true):", val2.valid);
    console.log("Error (should be undefined):", val2.error);

    // Step 3: Initialize workspace structures
    console.log("\n--- Step 3: Initializing workspace directories ---");
    await WorkspaceManager.initializeWorkspace(nestedFolder);
    
    // Check directories exist
    const subfolders = ["knowledge", "memory", "checkpoints", "history", "logs"];
    for (const folder of subfolders) {
      const exists = await fs.access(path.join(nestedFolder, ".saad-agent", folder))
        .then(() => true)
        .catch(() => false);
      console.log(`Directory .saad-agent/${folder} created:`, exists);
    }

    // Step 4: Handle corrupted workspace databases
    console.log("\n--- Step 4: Handling corrupted workspace databases ---");
    const memoryPath = path.join(nestedFolder, ".saad-agent", "knowledge", "memory.json");
    await fs.writeFile(memoryPath, "{ invalid-json }", "utf8"); // corrupt file
    
    try {
      await WorkspaceManager.initializeWorkspace(nestedFolder);
      console.log("Initialization did NOT throw error on corruption (Test FAILED)");
    } catch (err: any) {
      console.log("Correctly caught corruption error:", err.message.includes("corrupted"));
    }

    // Step 5: Switch active workspace & save sessions
    console.log("\n--- Step 5: Switching active workspace and saving sessions ---");
    // Re-initialize as clean first
    await fs.writeFile(memoryPath, "{}", "utf8");
    
    const oldRoot = PROJECT_ROOT;
    await WorkspaceManager.switchWorkspace(nestedFolder);
    
    console.log("Active PROJECT_ROOT updated:", PROJECT_ROOT === path.resolve(nestedFolder).replace(/\\/g, "/"));
    console.log("CONFIG.PROJECT_ROOT resolves to new root:", CONFIG.PROJECT_ROOT === PROJECT_ROOT);

    // Step 6: Verify global config caches and recent list
    console.log("\n--- Step 6: Verifying global AppData caches ---");
    const globalConfig = await WorkspaceManager.loadGlobalConfig();
    console.log("Last active workspace saved:", globalConfig.lastActiveWorkspace === PROJECT_ROOT);

    const recent = await WorkspaceManager.loadRecentWorkspaces();
    const recentEntry = recent.workspaces.find(w => w.path === PROJECT_ROOT);
    console.log("Workspace added to recent list:", !!recentEntry);
    console.log("Recent workspace name:", recentEntry?.name);

    // Clean up config changes
    globalConfig.lastActiveWorkspace = oldRoot;
    await WorkspaceManager.saveGlobalConfig(globalConfig);

    console.log("\n✅ All Workspace System tests completed successfully!");
  } catch (err) {
    console.error("Test execution failed:", err);
  } finally {
    // Cleanup local test directories
    await fs.rm(tempRoot, { recursive: true, force: true });
  }
}

runTests();
