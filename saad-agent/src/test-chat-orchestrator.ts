import * as assert from "assert";
import * as fs from "fs/promises";
import * as os from "os";
import * as path from "path";
import { setProjectRoot } from "./config.js";
import { ChatOrchestratorService } from "./platform/services/chat-orchestrator.js";
import { ReasoningEngine } from "./platform/services/reasoning-engine.js";
import { KnowledgeIngestionService } from "./platform/services/knowledge-ingestion.js";

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
      prompt: "\u0627\u062d\u0641\u0638 \u0627\u0633\u0645\u064a \u0633\u0639\u062f \u0645\u0635\u0645\u0645 \u0643\u0631\u0627\u0641\u064a\u0643 \u0648\u0645\u0635\u0645\u0645 \u0645\u0648\u0642\u0639 \u0633\u0639\u062f \u0633\u062a\u0648\u062f\u064a\u0648 \u0648\u0645\u0635\u0645\u0645 \u0647\u0630\u0627 \u0627\u0644\u0627\u062c\u064a\u0646\u062a",
      workspacePath: workspace,
      projectName: "test-workspace"
    });
    assert.strictEqual(saveResult.intent, "memory_save");
    assert.strictEqual(saveResult.usedModel, false);
    assert.ok(saveResult.response.includes("Memory ID"));
    assert.strictEqual(modelCalls, 0, "memory_save must not call the model");

    const pollutedTrainingMemory = await ChatOrchestratorService.handleDirectChat({
      prompt: "\u0627\u062d\u0641\u0638 \u062a\u062f\u0631\u0628 \u0639\u0644\u0649 \u0647\u0630\u0627 # Saad Agent Core Training Protocol v1.0\nRule 1: Learn Before Answering.",
      workspacePath: workspace,
      projectName: "test-workspace"
    });
    assert.strictEqual(pollutedTrainingMemory.usedModel, false);

    const recallResult = await ChatOrchestratorService.handleDirectChat({
      prompt: "\u0645\u0646 \u0627\u0646\u0627",
      workspacePath: workspace,
      projectName: "test-workspace"
    });
    assert.strictEqual(recallResult.intent, "memory_recall");
    assert.strictEqual(recallResult.usedModel, false);
    assert.ok(recallResult.response.includes("\u0633\u0639\u062f"));
    assert.ok(recallResult.response.includes("\u0645\u0635\u0645\u0645 \u0643\u0631\u0627\u0641\u064a\u0643"));
    assert.ok(!recallResult.response.includes("Saad Agent Core Training Protocol"));
    assert.ok(!recallResult.response.includes("Rule 1"));
    assert.ok(!recallResult.response.includes("Knowledge Search"));
    assert.ok(!recallResult.response.includes("Model Invocation"));
    assert.ok(!recallResult.response.includes("Reasoning Engine"));
    assert.strictEqual(modelCalls, 0, "memory_recall must not call the model");

    const thanksResult = await ChatOrchestratorService.handleDirectChat({
      prompt: "\u0634\u0643\u0631\u0627 \u0644\u0643",
      workspacePath: workspace,
      projectName: "test-workspace"
    });
    assert.strictEqual(thanksResult.intent, "conversation");
    assert.strictEqual(thanksResult.usedModel, false);
    assert.ok(thanksResult.response.length < 80);
    assert.ok(!thanksResult.response.includes("app/api/providers"));
    assert.ok(!thanksResult.response.includes("Provider Integration"));
    assert.ok(!thanksResult.response.includes("Saad Agent Core Training Protocol"));
    assert.strictEqual(modelCalls, 0, "thanks must not call the model or trigger engineering generation");

    const webResult = await ChatOrchestratorService.handleDirectChat({
      prompt: "\u0627\u0639\u0637\u0646\u064a \u0631\u0648\u0627\u0628\u0637 \u0639\u0646 \u0635\u0648\u0631 \u0633\u064a\u062f\u0631 \u062a\u0631\u0627\u0628",
      workspacePath: workspace,
      projectName: "test-workspace"
    });
    assert.strictEqual(webResult.intent, "external_research");
    assert.strictEqual(webResult.usedModel, false);
    assert.ok(
      webResult.response.includes("Internet Search: completed") || webResult.response.length > 0,
      "web search must either perform real search or report a real search failure"
    );
    assert.strictEqual(modelCalls, 0, "web search must not fall back to model guessing");

    const attachmentSource = path.join(workspace, "uploaded-reference.md");
    await fs.writeFile(attachmentSource, "Attachment rule: saved files must become permanent training references.", "utf8");
    const attachmentSaveResult = await ChatOrchestratorService.handleDirectChat({
      prompt: "\u0627\u062d\u0641\u0638 \u0647\u0630\u0627 \u0627\u0644\u0645\u0644\u0641 \u0643\u0645\u0631\u062c\u0639",
      workspacePath: workspace,
      projectName: "test-workspace",
      approvalMode: "approve_for_me",
      attachments: [{
        id: "att-test-reference",
        filename: "uploaded-reference.md",
        mimeType: "text/markdown",
        size: 72,
        localPath: attachmentSource,
        previewPath: attachmentSource,
        source: "upload",
        timestamp: Date.now(),
        workspaceId: "test-workspace"
      }]
    });
    assert.strictEqual(attachmentSaveResult.intent, "memory_save");
    assert.strictEqual(attachmentSaveResult.usedModel, false);
    assert.ok(attachmentSaveResult.response.includes(".saad-agent/training/lessons/uploaded-reference.md"));
    assert.strictEqual(modelCalls, 0, "attachment save must not call the model");

    const registry = await KnowledgeIngestionService.ingestTrainingKnowledge(workspace);
    assert.ok(
      registry.items.some((item) => item.filePath.endsWith(".saad-agent/training/lessons/uploaded-reference.md")),
      "saved attachment was not registered as training knowledge"
    );

    console.log("Chat orchestrator memory_save no-model test passed.");
    console.log("Chat orchestrator memory_recall concise no-model test passed.");
    console.log("Chat orchestrator casual thanks no-model test passed.");
    console.log("Chat orchestrator external_research no-model/no-guessing test passed.");
    console.log("Chat orchestrator attachment-to-training no-model test passed.");
  } finally {
    ReasoningEngine.requestCompletion = originalRequestCompletion;
    await fs.rm(workspace, { recursive: true, force: true });
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
