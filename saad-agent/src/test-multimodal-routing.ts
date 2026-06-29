import assert from "assert";
import { CognitiveOrchestratorService } from "./platform/services/cognitive-orchestrator.js";
import { GoalManager } from "./platform/services/goal-manager.js";

async function runTests() {
  const sessionId = "multimodal_routing_test_session";

  const webResult = await CognitiveOrchestratorService.evaluateCognitivePipeline("هل يمكنك البحث في الانترنت؟", sessionId);
  console.log(`[Multimodal Test] Web search intent: ${webResult.intentResult.intent}`);
  assert.strictEqual(webResult.intentResult.intent, "web_search");

  const imageResult = await CognitiveOrchestratorService.evaluateCognitivePipeline("أريد رابط لصورة على الإنترنت", sessionId);
  console.log(`[Multimodal Test] Image search intent: ${imageResult.intentResult.intent}`);
  assert.strictEqual(imageResult.intentResult.intent, "image_search");

  GoalManager.updateActiveReferences(sessionId, {
    activeImage: "C:/tmp/example.png",
    activeImageMimeType: "image/png",
    activeVisionSummary: "Previous image analysis",
  });
  const resolved = GoalManager.resolvePronounReference(sessionId, "اشرح هذا");
  console.log(`[Multimodal Test] Visual pronoun target: ${resolved.targetType}`);
  assert.strictEqual(resolved.targetType, "image");
  assert.strictEqual(resolved.resolvedTarget, "C:/tmp/example.png");

  console.log("Multimodal routing tests passed.");
}

runTests().catch((err) => {
  console.error("Multimodal routing tests failed:", err);
  process.exit(1);
});
