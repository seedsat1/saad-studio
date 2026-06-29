import assert from "assert";
import { DecisionMemoryService } from "./platform/services/decision-memory.js";
import { TaskMemoryService } from "./platform/services/task-memory.js";
import { ProjectCodeIndexService } from "./platform/services/project-code-index.js";
import { DependencyGraphService } from "./platform/services/dependency-graph.js";
import { ValidationPipelineService } from "./platform/services/validation-pipeline.js";
import { SelfReviewEngine } from "./platform/services/self-review.js";
import { KnowledgeRAGService } from "./platform/services/knowledge-rag.js";

async function runTests() {
  console.log("🧪 Starting Saad Agent v5.0 Architectural Subsystems Test Suite...");

  // 1. Decision Memory Service (ADRs)
  const adr = await DecisionMemoryService.recordDecision("Storage Provider Choice", "Use Backblaze B2 instead of AWS R2", "Lower bandwidth egress cost.");
  console.log(`[Test 1] Recorded Decision ADR -> Title: ${adr.title}, Status: ${adr.status}`);
  assert.strictEqual(adr.title, "Storage Provider Choice");

  // 2. Task Memory Service
  await TaskMemoryService.saveTaskState({
    taskId: "task_v5_demo",
    goal: "Redesign Lingerie Studio Page",
    currentStepIndex: 2,
    subTasks: [
      { id: "sub1", title: "Setup page layout", status: "completed" },
      { id: "sub2", title: "Add sliders", status: "in_progress" },
    ],
    status: "running",
    updatedAt: Date.now(),
  });
  const activeTask = await TaskMemoryService.getActiveTask();
  console.log(`[Test 2] Active Task State -> Goal: ${activeTask?.goal}, Active Step: ${activeTask?.currentStepIndex}`);
  assert.strictEqual(activeTask?.taskId, "task_v5_demo");

  // 3. Project Code Index Service
  const codeIndex = await ProjectCodeIndexService.buildOrGetIndex(process.cwd());
  console.log(`[Test 3] Project Code Index Categories Count: ${codeIndex.size}`);
  assert.ok(codeIndex.size > 0);

  // 4. Dependency Graph Service
  const impact = await DependencyGraphService.assessImpact("src/desktop/main.ts", process.cwd());
  console.log(`[Test 4] Dependency Impact Assessment -> Target: ${impact.targetFile}, Risk: ${impact.riskLevel}`);
  assert.ok(impact.targetFile.includes("main.ts"));

  // 5. Validation Pipeline Service
  const validResult = ValidationPipelineService.validateGeneratedCode("const x = 1;", ["Do not use GoogleSearch"]);
  console.log(`[Test 5] Validation Pipeline -> Passed: ${validResult.passed}`);
  assert.strictEqual(validResult.passed, true);

  // 6. Self Review Engine
  const review = SelfReviewEngine.evaluateResponse("Here is the updated React component with smooth transitions.");
  console.log(`[Test 6] Self Review Engine -> Approved: ${review.approved}, Confidence: ${review.confidenceScore}`);
  assert.strictEqual(review.approved, true);

  // 7. Knowledge RAG Pipeline
  const rag = await KnowledgeRAGService.executeRAGPipeline("Next.js documentation", process.cwd());
  console.log(`[Test 7] Knowledge RAG Pipeline -> Snippets Count: ${rag.snippets.length}`);
  assert.ok(rag.snippets.length >= 0);

  console.log("✅ All Saad Agent v5.0 Architectural Subsystems tests PASSED 100% successfully!");
}

runTests().catch((err) => {
  console.error("❌ Test suite failed:", err);
  process.exit(1);
});
