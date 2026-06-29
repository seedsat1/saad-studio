import * as assert from "assert";
import * as fs from "fs/promises";
import * as os from "os";
import * as path from "path";
import { setProjectRoot } from "./config.js";
import { ChatOrchestratorService } from "./platform/services/chat-orchestrator.js";
import { ReasoningEngine } from "./platform/services/reasoning-engine.js";

async function main() {
  const workspace = await fs.mkdtemp(path.join(os.tmpdir(), "saad-chat-orchestrator-"));
  setProjectRoot(workspace);
  await fs.writeFile(path.join(workspace, "AGENTS.md"), "Test project rules.", "utf8");
  await fs.writeFile(path.join(workspace, "PROJECT_CONTEXT.md"), "Test project context.", "utf8");

  const originalRequestCompletion = ReasoningEngine.requestCompletion;
  let modelCalls = 0;
  ReasoningEngine.requestCompletion = async (...args: Parameters<typeof originalRequestCompletion>) => {
    modelCalls += 1;
    return originalRequestCompletion.apply(ReasoningEngine, args);
  };

  try {
    const saveResult = await ChatOrchestratorService.handleDirectChat({
      prompt: "احفظ اسمي سعد",
      workspacePath: workspace,
      projectName: "test-workspace"
    });
    assert.strictEqual(saveResult.intent, "memory_save");
    assert.strictEqual(saveResult.usedModel, false);
    assert.ok(saveResult.response.includes("تم الحفظ"));
    assert.strictEqual(modelCalls, 0, "memory_save must not call the model");

    const recallResult = await ChatOrchestratorService.handleDirectChat({
      prompt: "من انا",
      workspacePath: workspace,
      projectName: "test-workspace"
    });
    assert.strictEqual(recallResult.intent, "memory_recall");
    assert.strictEqual(recallResult.usedModel, false);
    assert.ok(recallResult.response.includes("اسمي سعد"));
    assert.strictEqual(modelCalls, 0, "memory_recall must not call the model");

    const webResult = await ChatOrchestratorService.handleDirectChat({
      prompt: "اعطني روابط عن صور سيدر تراب",
      workspacePath: workspace,
      projectName: "test-workspace"
    });
    assert.strictEqual(webResult.intent, "web_search");
    assert.strictEqual(webResult.usedModel, false);
    assert.ok(
      webResult.response.includes("تعذر تنفيذ البحث") || webResult.response.includes("Internet Search: completed"),
      "web search must either perform real search or report a real search failure"
    );
    assert.strictEqual(modelCalls, 0, "web search must not fall back to model guessing");

    console.log("Chat orchestrator memory_save no-model test passed.");
    console.log("Chat orchestrator memory_recall no-model test passed.");
    console.log("Chat orchestrator web_search no-model/no-guessing test passed.");
  } finally {
    ReasoningEngine.requestCompletion = originalRequestCompletion;
    await fs.rm(workspace, { recursive: true, force: true });
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
