import assert from "assert";
import { SettingsManager } from "./production/settings-manager.js";
import { BraveAnswersService } from "./platform/services/brave-answers.js";
import { CognitiveOrchestratorService } from "./platform/services/cognitive-orchestrator.js";

async function runTests() {
  console.log("�� Starting Brave Answers Provider Integration Automated Test Suite...");

  // 1. Verify SettingsManager has Brave Answers Provider registered
  const settings = await SettingsManager.getSettings();
  const provider = settings.providers.find((p) => p.id === "brave-answers");
  console.log(`[Test 1] Registered Brave Answers Provider -> Found: ${!!provider}, Endpoint: ${provider?.endpointUrl}`);
  assert.ok(provider, "Brave Answers Provider should be registered in SettingsManager");
  assert.strictEqual(provider?.id, "brave-answers");

  // 2. Test Freshness Evaluation Logic
  const req1 = BraveAnswersService.requiresInternet("What is the latest Next.js 14 documentation?");
  const req2 = BraveAnswersService.requiresInternet("Explain React Hooks");
  console.log(`[Test 2] Freshness Evaluation ("latest Next.js") -> Requires Internet: ${req1}`);
  console.log(`[Test 2] Freshness Evaluation ("Explain React Hooks") -> Requires Internet: ${req2}`);
  assert.strictEqual(req1, true);
  assert.strictEqual(req2, false);

  // 3. Test Cognitive Router Intent Classification for internet_answers
  const cognitiveRes = await CognitiveOrchestratorService.evaluateCognitivePipeline("أحدث وثائق مكتبة BytePlus API", "brave_test_session");
  console.log(`[Test 3] Cognitive Pipeline Intent -> Intent: ${cognitiveRes.intentResult.intent}`);
  assert.strictEqual(cognitiveRes.intentResult.intent, "internet_answers");

  // 4. Test Source Formatting Utility
  const mockSources = [
    { title: "Next.js Documentation", url: "https://nextjs.org/docs", snippet: "Latest features and App Router guidance." },
    { title: "GitHub Release Notes", url: "https://github.com/vercel/next.js/releases", snippet: "Version v14.2.35 release patch." },
  ];
  const formattedMd = BraveAnswersService.formatSourcesMarkdown(mockSources);
  console.log(`[Test 4] Formatted Sources Markdown:\n${formattedMd}`);
  assert.ok(formattedMd.includes("### �� المصادر والتوثيق"));
  assert.ok(formattedMd.includes("[Next.js Documentation]"));

  console.log("✅ All Brave Answers Provider Integration tests PASSED 100% successfully!");
}

runTests().catch((err) => {
  console.error("❌ Test suite failed:", err);
  process.exit(1);
});
