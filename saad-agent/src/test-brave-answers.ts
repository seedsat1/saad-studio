import assert from "assert";
import { SettingsManager } from "./production/settings-manager.js";
import { BraveAnswersService } from "./platform/services/brave-answers.js";
import { CognitiveOrchestratorService } from "./platform/services/cognitive-orchestrator.js";

async function runTests() {
  console.log("Starting Brave Answers Provider Integration Automated Test Suite...");

  const settings = await SettingsManager.getSettings();
  const provider = settings.providers.find((item) => item.id === "brave-answers");
  console.log(`[Test 1] Registered Brave Answers Provider -> Found: ${!!provider}, Endpoint: ${provider?.endpointUrl}`);
  assert.ok(provider, "Brave Answers Provider should be registered in SettingsManager");
  assert.strictEqual(provider?.id, "brave-answers");

  const needsInternet = BraveAnswersService.requiresInternet("What is the latest Next.js 14 documentation?");
  const doesNotNeedInternet = BraveAnswersService.requiresInternet("Explain React Hooks");
  console.log(`[Test 2] Freshness Evaluation ("latest Next.js") -> Requires Internet: ${needsInternet}`);
  console.log(`[Test 2] Freshness Evaluation ("Explain React Hooks") -> Requires Internet: ${doesNotNeedInternet}`);
  assert.strictEqual(needsInternet, true);
  assert.strictEqual(doesNotNeedInternet, false);

  const cognitiveResult = await CognitiveOrchestratorService.evaluateCognitivePipeline("أحدث وثائق مكتبة BytePlus API", "brave_test_session");
  console.log(`[Test 3] Cognitive Pipeline Intent -> Intent: ${cognitiveResult.intentResult.intent}`);
  assert.strictEqual(cognitiveResult.intentResult.intent, "external_research");

  const mockSources = [
    { title: "Next.js Documentation", url: "https://nextjs.org/docs", snippet: "Latest features and App Router guidance." },
    { title: "GitHub Release Notes", url: "https://github.com/vercel/next.js/releases", snippet: "Version v14.2.35 release patch." }
  ];
  const formattedMarkdown = BraveAnswersService.formatSourcesMarkdown(mockSources);
  console.log(`[Test 4] Formatted Sources Markdown:\n${formattedMarkdown}`);
  assert.ok(formattedMarkdown.includes("### المصادر والتوثيق"));
  assert.ok(formattedMarkdown.includes("[Next.js Documentation]"));

  console.log("All Brave Answers Provider Integration tests passed.");
}

runTests().catch((err) => {
  console.error("Brave Answers test suite failed:", err);
  process.exit(1);
});
