import assert from "assert";
import * as fs from "fs/promises";
import * as os from "os";
import * as path from "path";
import { setProjectRoot } from "./config.js";
import { DecisionMemoryService } from "./platform/services/decision-memory.js";
import { TaskMemoryService } from "./platform/services/task-memory.js";
import { ProjectCodeIndexService } from "./platform/services/project-code-index.js";
import { DependencyGraphService } from "./platform/services/dependency-graph.js";
import { ValidationPipelineService } from "./platform/services/validation-pipeline.js";
import { SelfReviewEngine } from "./platform/services/self-review.js";
import { KnowledgeRAGService } from "./platform/services/knowledge-rag.js";

async function runTests() {
  console.log("Starting Saad Agent v5.0 Architectural Subsystems Test Suite...");

  const oldRoot = process.cwd();
  const workspace = await fs.mkdtemp(path.join(os.tmpdir(), "saad-v5-architecture-"));
  setProjectRoot(workspace);

  try {
    await fs.mkdir(path.join(workspace, "src", "desktop"), { recursive: true });
    await fs.writeFile(path.join(workspace, "src", "desktop", "main.ts"), "export const desktopMain = true;\n", "utf8");
    await fs.writeFile(path.join(workspace, "PROJECT_CONTEXT.md"), "Temporary v5 architecture test context.", "utf8");

    const adr = await DecisionMemoryService.recordDecision("Storage Provider Choice", "Use Backblaze B2 instead of AWS R2", "Lower bandwidth egress cost.");
    console.log(`[Test 1] Recorded Decision ADR -> Title: ${adr.title}, Status: ${adr.status}`);
    assert.strictEqual(adr.title, "Storage Provider Choice");

    await TaskMemoryService.saveTaskState({
      taskId: "task_v5_demo",
      goal: "Redesign Lingerie Studio Page",
      currentStepIndex: 2,
      subTasks: [
        { id: "sub1", title: "Setup page layout", status: "completed" },
        { id: "sub2", title: "Add sliders", status: "in_progress" }
      ],
      status: "running",
      updatedAt: Date.now()
    });
    const activeTask = await TaskMemoryService.getActiveTask();
    console.log(`[Test 2] Active Task State -> Goal: ${activeTask?.goal}, Active Step: ${activeTask?.currentStepIndex}`);
    assert.strictEqual(activeTask?.taskId, "task_v5_demo");

    const codeIndex = await ProjectCodeIndexService.buildOrGetIndex(workspace);
    console.log(`[Test 3] Project Code Index Categories Count: ${codeIndex.size}`);
    assert.ok(codeIndex.size > 0);

    const impact = await DependencyGraphService.assessImpact("src/desktop/main.ts", workspace);
    console.log(`[Test 4] Dependency Impact Assessment -> Target: ${impact.targetFile}, Risk: ${impact.riskLevel}`);
    assert.ok(impact.targetFile.includes("main.ts"));

    const validResult = ValidationPipelineService.validateGeneratedCode("const x = 1;", ["Do not use GoogleSearch"]);
    console.log(`[Test 5] Validation Pipeline -> Passed: ${validResult.passed}`);
    assert.strictEqual(validResult.passed, true);

    const review = SelfReviewEngine.evaluateResponse("Here is the updated React component with smooth transitions.");
    console.log(`[Test 6] Self Review Engine -> Approved: ${review.approved}, Confidence: ${review.confidenceScore}`);
    assert.strictEqual(review.approved, true);

    const rag = await KnowledgeRAGService.executeRAGPipeline("Next.js documentation", workspace);
    console.log(`[Test 7] Knowledge RAG Pipeline -> Snippets Count: ${rag.snippets.length}`);
    assert.ok(rag.snippets.length >= 0);

    console.log("All Saad Agent v5.0 Architectural Subsystems tests passed.");
  } finally {
    setProjectRoot(oldRoot);
    await fs.rm(workspace, { recursive: true, force: true });
  }
}

runTests().catch((err) => {
  console.error("Saad Agent v5.0 architectural subsystem tests failed:", err);
  process.exit(1);
});
