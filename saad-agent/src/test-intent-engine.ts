import assert from "assert";
import { CognitiveOrchestratorService } from "./platform/services/cognitive-orchestrator.js";
import { GoalManager } from "./platform/services/goal-manager.js";
import { UserMemoryService } from "./platform/services/user-memory.js";
import { ConversationStateEngine } from "./platform/services/conversation-state-engine.js";

async function runTests() {
  console.log("�� Starting Intent Routing & Memory Protection Automated Test Suite...");
  const sessionId = "routing_test_session";

  // --- Test 1: Memory Save Without Name ("احفظ اسمي") ---
  const prompt1 = "احفظ اسمي";
  const result1 = await CognitiveOrchestratorService.evaluateCognitivePipeline(prompt1, sessionId);
  console.log(`[Test 1] Memory Save Prompt ("احفظ اسمي") -> Intent: ${result1.intentResult.intent}`);
  assert.strictEqual(result1.intentResult.intent, "memory_save");

  // --- Test 2: Memory Save With Name ("احفظ اسمي، أنا المهندس سعد نعمة") ---
  const prompt2 = "احفظ اسمي، أنا المهندس سعد نعمة";
  const result2 = await CognitiveOrchestratorService.evaluateCognitivePipeline(prompt2, sessionId);
  console.log(`[Test 2] Memory Save With Name -> Intent: ${result2.intentResult.intent}`);
  assert.strictEqual(result2.intentResult.intent, "memory_save");
  await UserMemoryService.saveFact(prompt2, "name", "المهندس سعد نعمة");

  // --- Test 3: Memory Recall ("من أنا؟") ---
  const prompt3 = "من أنا؟";
  const result3 = await CognitiveOrchestratorService.evaluateCognitivePipeline(prompt3, sessionId);
  console.log(`[Test 3] Memory Recall ("من أنا؟") -> Intent: ${result3.intentResult.intent}`);
  assert.strictEqual(result3.intentResult.intent, "memory_recall");

  const facts = await UserMemoryService.getAllFacts();
  const nameFact = facts.find((f) => f.key === "name");
  console.log(`[Test 3 Verification] Recalled Name Fact: ${nameFact?.value}`);
  assert.strictEqual(nameFact?.value, "المهندس سعد نعمة");

  // --- Test 3b: Memory Recall Must Override Pending Clarification / State Inheritance ---
  ConversationStateEngine.updateState(sessionId, { activeWorkflow: "general_chat", lastIntent: "general_chat" });
  ConversationStateEngine.setPendingClarification(sessionId, {
    id: "test_pending_clarification",
    question: "Could you please clarify your request?",
    originalPrompt: "غلط",
    timestamp: Date.now(),
  });
  const result3b = await CognitiveOrchestratorService.evaluateCognitivePipeline("من انا", sessionId);
  console.log(`[Test 3b] Memory Recall With Pending Clarification -> Intent: ${result3b.intentResult.intent}`);
  assert.strictEqual(result3b.intentResult.intent, "memory_recall");
  ConversationStateEngine.clearPendingClarification(sessionId);

  // --- Test 3c: Typo-tolerant Memory Save ("احفظ رسمي انا سعد مصمم كرافك") ---
  const result3c = await CognitiveOrchestratorService.evaluateCognitivePipeline("احفظ رسمي انا سعد مصمم كرافك", sessionId);
  console.log(`[Test 3c] Typo-tolerant Memory Save -> Intent: ${result3c.intentResult.intent}`);
  assert.strictEqual(result3c.intentResult.intent, "memory_save");

  // --- Test 4: Composer Override Protection ---
  // Even if prompt is clean and active workspace is set, "احفظ اسمي" MUST remain memory_save
  GoalManager.updateActiveReferences(sessionId, { activeProject: "next14-ai-saas-main" });
  const prompt4 = "احفظ اسمي";
  const result4 = await CognitiveOrchestratorService.evaluateCognitivePipeline(prompt4, sessionId);
  console.log(`[Test 4] Composer/Workspace Protection ("احفظ اسمي" with active workspace) -> Intent: ${result4.intentResult.intent}`);
  assert.strictEqual(result4.intentResult.intent, "memory_save");

  // --- Test 5: Real Coding Request ("أنشئ صفحة Next.js جديدة باسم /test") ---
  const prompt5 = "أنشئ صفحة Next.js جديدة باسم /test";
  const result5 = await CognitiveOrchestratorService.evaluateCognitivePipeline(prompt5, sessionId);
  console.log(`[Test 5] Real Coding Request -> Intent: ${result5.intentResult.intent}`);
  assert.strictEqual(result5.intentResult.intent, "code_generation");

  console.log("✅ All Intent Routing & Memory Protection automated tests PASSED 100% successfully!");
}

runTests().catch((err) => {
  console.error("❌ Test suite failed:", err);
  process.exit(1);
});
