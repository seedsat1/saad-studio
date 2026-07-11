import assert from "assert";
import * as fs from "fs/promises";
import * as path from "path";
import { WorkspaceManager } from "./platform/workspace-manager.js";
import { PROJECT_ROOT, CONFIG } from "./config.js";

async function runTests() {
  console.log("=== Saad Agent Workspace System Tests ===");

  const tempRoot = path.join(process.cwd(), "temp-test-workspace");
  const nestedFolder = path.join(tempRoot, "my-project");
  const appDataRoot = path.join(tempRoot, "app-data");
  const oldSettingsRoot = process.env["SAAD_AGENT_SETTINGS_ROOT"];

  try {
    process.env["SAAD_AGENT_SETTINGS_ROOT"] = appDataRoot;
    await fs.rm(tempRoot, { recursive: true, force: true });
    await fs.mkdir(nestedFolder, { recursive: true });

    console.log("\n--- Step 1: Validating accessible workspace folder ---");
    const val1 = await WorkspaceManager.validateWorkspace(nestedFolder);
    console.log("Valid accessible folder:", val1.valid);
    assert.strictEqual(val1.valid, true);

    console.log("\n--- Step 2: Validating populated workspace footprint ---");
    await fs.writeFile(path.join(nestedFolder, "package.json"), "{}", "utf8");
    const val2 = await WorkspaceManager.validateWorkspace(nestedFolder);
    console.log("Valid populated folder:", val2.valid);
    assert.strictEqual(val2.valid, true);

    console.log("\n--- Step 3: Initializing workspace directories ---");
    await WorkspaceManager.initializeWorkspace(nestedFolder);
    const subfolders = ["knowledge", "memory", "checkpoints", "history", "logs"];
    for (const folder of subfolders) {
      const exists = await fs.access(path.join(nestedFolder, ".saad-agent", folder))
        .then(() => true)
        .catch(() => false);
      console.log(`Directory .saad-agent/${folder} created:`, exists);
      assert.strictEqual(exists, true);
    }

    console.log("\n--- Step 4: Handling corrupted workspace databases ---");
    const memoryPath = path.join(nestedFolder, ".saad-agent", "knowledge", "memory.json");
    await fs.writeFile(memoryPath, "{ invalid-json }", "utf8");
    await assert.rejects(
      () => WorkspaceManager.initializeWorkspace(nestedFolder),
      /corrupted/
    );
    console.log("Correctly caught corruption error: true");

    console.log("\n--- Step 5: Switching active workspace and saving sessions ---");
    await fs.writeFile(memoryPath, "{}", "utf8");
    const oldRoot = PROJECT_ROOT;
    await WorkspaceManager.switchWorkspace(nestedFolder);
    const normalized = path.resolve(nestedFolder).replace(/\\/g, "/");

    console.log("Active PROJECT_ROOT updated:", PROJECT_ROOT === normalized);
    console.log("CONFIG.PROJECT_ROOT resolves to new root:", CONFIG.PROJECT_ROOT === PROJECT_ROOT);
    assert.strictEqual(PROJECT_ROOT, normalized);
    assert.strictEqual(CONFIG.PROJECT_ROOT, PROJECT_ROOT);

    console.log("\n--- Step 6: Verifying global AppData caches ---");
    const globalConfig = await WorkspaceManager.loadGlobalConfig();
    console.log("Last active workspace saved:", globalConfig.lastActiveWorkspace === PROJECT_ROOT);
    assert.strictEqual(globalConfig.lastActiveWorkspace, PROJECT_ROOT);

    const recent = await WorkspaceManager.loadRecentWorkspaces();
    const recentEntry = recent.workspaces.find((item) => item.path === PROJECT_ROOT);
    console.log("Workspace added to recent list:", !!recentEntry);
    console.log("Recent workspace name:", recentEntry?.name);
    assert.ok(recentEntry);

    globalConfig.lastActiveWorkspace = oldRoot;
    await WorkspaceManager.saveGlobalConfig(globalConfig);

    console.log("\nAll Workspace System tests passed.");
  } finally {
    if (oldSettingsRoot === undefined) {
      delete process.env["SAAD_AGENT_SETTINGS_ROOT"];
    } else {
      process.env["SAAD_AGENT_SETTINGS_ROOT"] = oldSettingsRoot;
    }
    await fs.rm(tempRoot, { recursive: true, force: true });
  }
}

runTests().catch((err) => {
  console.error("Workspace system tests failed:", err);
  process.exit(1);
});
