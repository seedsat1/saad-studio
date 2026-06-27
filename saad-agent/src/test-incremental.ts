import { ProjectMemoryStore } from "./memory/project-memory.js";
import { ProjectScanner } from "./scanner/project-scanner.js";
import * as fs from "fs/promises";
import * as path from "path";
import { CONFIG } from "./config.js";
import { existsSync } from "fs";

async function runTest() {
  console.log("=== Saad Agent Incremental Scan Test ===");

  const memoryStore = new ProjectMemoryStore();
  const scanner = new ProjectScanner();

  // Step 1: Perform full scan
  console.log("\n--- Step 1: Performing full scan ---");
  await memoryStore.load(); // Should initialize empty DEFAULT_MEMORY
  
  const scanResult = await scanner.scan();
  memoryStore.updateSummary(scanResult.summary);
  memoryStore.updateArchitecture(scanResult.architecture);
  memoryStore.updateDependencies(scanResult.dependencies);
  memoryStore.get().fileHashes = scanResult.fileHashes;
  await memoryStore.save();

  console.log("Files created in .saad-agent/knowledge:");
  console.log("memory.json:", existsSync(path.join(CONFIG.PROJECT_ROOT, ".saad-agent", "knowledge", "memory.json")));
  console.log("architecture.json:", existsSync(path.join(CONFIG.PROJECT_ROOT, ".saad-agent", "knowledge", "architecture.json")));
  console.log("dependency-graph.json:", existsSync(path.join(CONFIG.PROJECT_ROOT, ".saad-agent", "knowledge", "dependency-graph.json")));
  console.log("project-summary.json:", existsSync(path.join(CONFIG.PROJECT_ROOT, ".saad-agent", "knowledge", "project-summary.json")));

  // Step 2: Trigger refresh with no changes
  console.log("\n--- Step 2: Refreshing with no changes ---");
  await memoryStore.load();
  const updated1 = await scanner.refresh(memoryStore);
  console.log("Updated (should be false):", updated1);

  // Step 3: Trigger refresh after creating a temporary file
  console.log("\n--- Step 3: Adding a temporary file ---");
  const tempFilePath = path.join(CONFIG.PROJECT_ROOT, "temp-test-file.ts");
  await fs.writeFile(tempFilePath, "import { something } from './another-file.js';\nconst x = 1;\n", "utf8");

  await memoryStore.load();
  const updated2 = await scanner.refresh(memoryStore);
  console.log("Updated (should be true):", updated2);

  // Verify the temp file is in architecture
  await memoryStore.load();
  const memory = memoryStore.get();
  const tempNode = findNode(memory.architecture, "temp-test-file.ts");
  console.log("Temp file in architecture tree:", !!tempNode);
  console.log("Temp file dependencies in modules:", memory.dependencies.modules["temp-test-file.ts"]);

  // Step 4: Modifying the temporary file
  console.log("\n--- Step 4: Modifying the temporary file ---");
  await fs.writeFile(tempFilePath, "import { something } from './another-file.js';\nimport { other } from 'fs';\nconst x = 2;\n", "utf8");
  
  await memoryStore.load();
  const updated3 = await scanner.refresh(memoryStore);
  console.log("Updated (should be true):", updated3);
  
  await memoryStore.load();
  const updatedMemory = memoryStore.get();
  console.log("Updated temp file dependencies in modules:", updatedMemory.dependencies.modules["temp-test-file.ts"]);

  // Step 5: Deleting the temporary file
  console.log("\n--- Step 5: Deleting the temporary file ---");
  await fs.unlink(tempFilePath);

  await memoryStore.load();
  const updated4 = await scanner.refresh(memoryStore);
  console.log("Updated (should be true):", updated4);

  // Verify temp file is pruned
  await memoryStore.load();
  const finalMemory = memoryStore.get();
  const tempNodeFinal = findNode(finalMemory.architecture, "temp-test-file.ts");
  console.log("Temp file in architecture tree after deletion:", !!tempNodeFinal);
  console.log("Temp file dependencies in modules after deletion:", "temp-test-file.ts" in finalMemory.dependencies.modules);

  // Step 6: Test legacy compatibility
  console.log("\n--- Step 6: Testing legacy database compatibility ---");
  const legacyMemory = {
    summary: { ...finalMemory.summary, projectName: "legacy-test" },
    architecture: finalMemory.architecture,
    dependencies: finalMemory.dependencies,
    taskHistory: [],
    lastUpdated: Date.now(),
    fileMtimes: { "some-file.ts": 123456789 }
  };
  
  try {
    await fs.unlink(path.join(CONFIG.PROJECT_ROOT, ".saad-agent", "knowledge", "memory.json"));
  } catch {}

  await fs.writeFile(path.join(CONFIG.PROJECT_ROOT, ".saad-agent", "memory.json"), JSON.stringify(legacyMemory, null, 2), "utf8");
  
  await memoryStore.load();
  console.log("Loaded legacy memory (has fileMtimes):", "fileMtimes" in memoryStore.get());
  
  const updated5 = await scanner.refresh(memoryStore);
  console.log("Refreshed (should be true for upgrade):", updated5);
  
  await memoryStore.load();
  const upgradedMemory = memoryStore.get();
  console.log("Upgraded memory has fileHashes:", !!upgradedMemory.fileHashes);
  console.log("Upgraded memory has fileMtimes (should be false):", "fileMtimes" in upgradedMemory);

  console.log("\n=== Test Completed successfully ===");
}

function findNode(node: any, name: string): any {
  if (node.name === name) return node;
  if (node.children) {
    for (const child of node.children) {
      const found = findNode(child, name);
      if (found) return found;
    }
  }
  return null;
}

runTest().catch(console.error);
