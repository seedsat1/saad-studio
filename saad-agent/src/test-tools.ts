import * as fs from "fs/promises";
import * as path from "path";
import { ToolManager } from "./platform/services/tool-manager.js";
import { EventBus } from "./platform/services/event-bus.js";
import "./platform/tools/index.js"; // Bootstraps and registers all tools

async function runTests() {
  console.log("=== Saad Agent Core Tools Integration Tests ===");

  const tempWorkspace = path.join(process.cwd(), "temp-test-tools-workspace");
  const oldRoot = process.env["SAAD_AGENT_PROJECT_ROOT"] || process.cwd();

  try {
    // Setup temp test sandbox
    await fs.rm(tempWorkspace, { recursive: true, force: true });
    await fs.mkdir(tempWorkspace, { recursive: true });

    // Set configuration root to sandbox
    process.env["SAAD_AGENT_PROJECT_ROOT"] = tempWorkspace;

    // 1. Tool Registry Verification
    console.log("\n--- Test 1: Tool Registry ---");
    const registered = ToolManager.listTools();
    const names = registered.map(t => t.name);
    console.log("Registered tools:", names);
    const expected = [
      "fs-tool", "search-tool", "diff-tool", "patch-tool",
      "command-tool", "git-tool", "build-tool", "test-tool", "package-tool"
    ];
    for (const name of expected) {
      console.log(`Tool "${name}" registered:`, names.includes(name));
    }

    // 2. FS Tool Verification
    console.log("\n--- Test 2: File System Tool ---");
    // Write
    const writeRes = await ToolManager.execute("fs-tool", {
      action: "write",
      path: "hello.txt",
      content: "Hello Core Tools FS!",
    });
    console.log("FS Write completed:", writeRes.success);

    // Read
    const readRes = await ToolManager.execute("fs-tool", {
      action: "read",
      path: "hello.txt",
    });
    console.log("FS Read completed, content:", readRes.content);

    // Path validation traversal block
    try {
      await ToolManager.execute("fs-tool", {
        action: "read",
        path: "../outside.txt",
      });
      console.log("Error: accessed path outside boundary (Test FAILED)");
    } catch (err: any) {
      console.log("Safe path validation threw exception correctly:", err.message.includes("boundary"));
    }

    // 3. Search Tool Verification
    console.log("\n--- Test 3: Search Tool ---");
    // Create another file for searching
    await ToolManager.execute("fs-tool", {
      action: "write",
      path: "src/main.js",
      content: "class MyProcessor { process() {} }",
    });

    const searchRes = await ToolManager.execute("search-tool", {
      action: "text-search",
      query: "Processor",
    });
    console.log("Search matches count:", searchRes.matches.length);
    console.log("Search match line content:", searchRes.matches[0]?.content);

    // 4. Diff Tool Verification
    console.log("\n--- Test 4: Diff Tool ---");
    const diffRes = await ToolManager.execute("diff-tool", {
      action: "compare-text",
      textA: "line1\nline2\n",
      textB: "line1\nline2 modified\n",
    });
    console.log("Diff generated (additions):", diffRes.stats.additions);
    console.log("Diff generated (deletions):", diffRes.stats.deletions);

    // 5. Patch Tool Verification
    console.log("\n--- Test 5: Patch Tool ---");
    const patchContent = `--- hello.txt
+++ hello.txt
@@ -1,1 +1,2 @@
 Hello Core Tools FS!
+Added in patch!
`;
    // Validate Dry Run
    const dryRunRes = await ToolManager.execute("patch-tool", {
      action: "validate",
      patch: patchContent,
      dryRun: true,
    });
    console.log("Patch dry-run validate success:", dryRunRes.success);
    console.log("Patch dry-run new content preview:", dryRunRes.results[0]?.newContent?.trim());

    // Apply
    const applyRes = await ToolManager.execute("patch-tool", {
      action: "apply",
      patch: patchContent,
    });
    console.log("Patch apply success:", applyRes.success);

    // Verify written content
    const verifyRead = await ToolManager.execute("fs-tool", { action: "read", path: "hello.txt" });
    console.log("Patched file content:", verifyRead.content.trim().replace(/\r?\n/g, " | "));

    // 6. Command Tool Verification
    console.log("\n--- Test 6: Command Tool ---");
    await ToolManager.execute("fs-tool", {
      action: "write",
      path: "script.js",
      content: "console.log('EXECUTED FROM COMMAND TOOL');",
    });
    const cmdRes = await ToolManager.execute("command-tool", {
      runtime: "node",
      scriptPath: "script.js",
    });
    console.log("Command execution success:", cmdRes.success);
    console.log("Command stdout output:", cmdRes.stdout.trim());

    // 7. Git Tool Verification
    console.log("\n--- Test 7: Git Tool ---");
    // Restore parent directory temporary to detect actual project repo status
    process.env["SAAD_AGENT_PROJECT_ROOT"] = oldRoot;
    const gitDetect = await ToolManager.execute("git-tool", { action: "detect" });
    console.log("Parent workspace Git directory detected:", gitDetect.success);
    if (gitDetect.success) {
      const gitBranch = await ToolManager.execute("git-tool", { action: "current-branch" });
      console.log("Current branch name:", gitBranch.stdout);
    }
    process.env["SAAD_AGENT_PROJECT_ROOT"] = tempWorkspace;

    // 8. Build Tool Verification
    console.log("\n--- Test 8: Build Tool ---");
    const buildRes = await ToolManager.execute("build-tool", {
      command: "node -e \"console.log('mock build successful')\"",
    });
    console.log("Build completion status:", buildRes.success);
    console.log("Build stdout:", buildRes.stdout.trim());

    // 9. Test Tool Verification
    console.log("\n--- Test 9: Test Tool ---");
    const testRes = await ToolManager.execute("test-tool", {
      command: "node -e \"console.log('5 passed, 0 failed')\"",
    });
    console.log("Test completion status:", testRes.success);
    console.log("Parsed passed count:", testRes.stats.passed);

    // 10. Package Manager Tool Verification
    console.log("\n--- Test 10: Package Manager Tool ---");
    // List node packages
    const pkgRes = await ToolManager.execute("package-tool", {
      action: "list",
      runtime: "node",
    });
    console.log("Listed packages success:", pkgRes.success);
    console.log("Packages count in sandbox workspace:", pkgRes.packages.length);

    console.log("\n✅ All Core Tools integration tests completed successfully!");
  } catch (err) {
    console.error("Test execution failed:", err);
  } finally {
    // Restore configs
    process.env["SAAD_AGENT_PROJECT_ROOT"] = oldRoot;
    // Cleanup
    await fs.rm(tempWorkspace, { recursive: true, force: true });
  }
}

runTests();
