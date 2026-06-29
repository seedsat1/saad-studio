import assert from "assert";
import { ToolOrchestratorService } from "./platform/services/tool-orchestrator.js";
import { WorkspaceWatcherService } from "./platform/services/workspace-watcher.js";
import { RecoveryEngineService } from "./platform/services/recovery-engine.js";
import { ExecutionHistoryService } from "./platform/services/execution-history.js";
import { OperationalSkillPipelineService } from "./platform/services/operational-skill-pipeline.js";
import { ValidationPipelineService } from "./platform/services/validation-pipeline.js";

async function runCleanProductionTestSuite() {
  console.log("=== SAAD AGENT PRODUCTION VERIFICATION SUITE ===");

  // 1. WorkspaceWatcher (debounced & deduplicated)
  console.log("[Test 1] WorkspaceWatcher debounced event check...");
  WorkspaceWatcherService.startWatching(process.cwd());
  await WorkspaceWatcherService.handleFileChange("src/desktop/main.ts", "change", process.cwd());
  const events = WorkspaceWatcherService.getRecentEvents();
  assert.ok(events.length > 0, "Watcher failed to capture file event.");
  console.log(`PASS: Captured event '${events[events.length - 1]?.eventType}' on ${events[events.length - 1]?.filePath}`);
  await WorkspaceWatcherService.stopWatching();

  // 2. Real Skills Loading & Dynamic Route Derivation
  console.log("[Test 2] Real Skills loading & dynamic route derivation...");
  const pipeline = await OperationalSkillPipelineService.executePipeline("أضف صفحة image-upscaler جديدة", process.cwd());
  assert.ok(pipeline.skillsLoaded.length > 0, "No skills loaded from .saad-agent/skills.");
  assert.strictEqual(pipeline.expectedOutcome.expectedRoute, "/image-upscaler", "Dynamic route mismatch.");
  console.log(`PASS: Loaded ${pipeline.skillsLoaded.length} skills. Derived route: ${pipeline.expectedOutcome.expectedRoute}`);

  // 3. Runtime Verification Execution (tsc/lint/build)
  console.log("[Test 3] Runtime verification execution (tsc/lint/build)...");
  const valRes = ValidationPipelineService.validateGeneratedCode("export const cleanBuild = true;", [], process.cwd());
  assert.strictEqual(valRes.passed, true, "Runtime verification failed.");
  console.log(`PASS: Runtime verification status (tsc: ${valRes.typeCheck}, lint: ${valRes.lintCheck}, build: ${valRes.buildCheck})`);

  // 4. Safe Recovery Engine Stash Behavior
  console.log("[Test 4] Safe Recovery Engine stash check...");
  const recRes = RecoveryEngineService.executeRealRollback(process.cwd());
  assert.strictEqual(recRes.success, true, "Recovery engine rollback returned failure status.");
  console.log(`PASS: Recovery engine response: ${recRes.logs.trim()}`);

  // 5. Execution History DB Check
  console.log("[Test 5] Execution history DB logging...");
  const history = await ExecutionHistoryService.getHistory();
  const last = history[history.length - 1];
  assert.ok(last !== undefined && last.validationPassed === true, "Execution history validation status mismatch.");
  console.log(`PASS: Logged record ${last?.taskId} with validationPassed=${last?.validationPassed}`);

  console.log("=== ALL PRODUCTION VERIFICATION TESTS PASSED ===");
}

runCleanProductionTestSuite().catch((err) => {
  console.error("FAIL: Test suite encountered error:", err);
  process.exit(1);
});
