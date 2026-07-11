import * as assert from "assert";
import * as fs from "fs/promises";
import * as os from "os";
import * as path from "path";
import * as zlib from "zlib";
import { setProjectRoot } from "./config.js";
import { ChatOrchestratorService } from "./platform/services/chat-orchestrator.js";
import { ReasoningEngine } from "./platform/services/reasoning-engine.js";
import { KnowledgeIngestionService } from "./platform/services/knowledge-ingestion.js";
import { ConversationStateEngine } from "./platform/services/conversation-state-engine.js";
import { PreAnswerReviewService } from "./platform/services/pre-answer-review.js";
import { BraveAnswersService } from "./platform/services/brave-answers.js";
import { ResearchGatewayService } from "./platform/services/research-gateway.js";
import { AgentReachProvider } from "./platform/services/agent-reach-provider.js";
import { DeepResearchProvider } from "./platform/services/deep-research-provider.js";
import { SessionSearchProvider } from "./platform/services/session-search-provider.js";
import { ModelClient } from "./platform/services/model-client.js";
import { SettingsManager } from "./production/settings-manager.js";
import { RequestRoutingService } from "./platform/services/request-routing.js";

async function main() {
  const workspace = await fs.mkdtemp(path.join(os.tmpdir(), "saad-chat-orchestrator-"));
  setProjectRoot(workspace);
  await fs.writeFile(path.join(workspace, "AGENTS.md"), "Test project rules.", "utf8");
  await fs.writeFile(path.join(workspace, "PROJECT_CONTEXT.md"), "Test project context.", "utf8");
  const trainingLessonsDir = path.join(workspace, ".saad-agent", "training", "lessons");
  await fs.mkdir(trainingLessonsDir, { recursive: true });
  await fs.writeFile(
    path.join(trainingLessonsDir, "countries-capitals-continents-ar-en-clean.txt"),
    [
      "#\t\u0627\u0644\u062f\u0648\u0644\u0629 (Arabic)\tCountry (English)\t\u0627\u0644\u0639\u0627\u0635\u0645\u0629 (Arabic)\tCapital (English)\t\u0627\u0644\u0642\u0627\u0631\u0629 (Arabic)\tContinent (English)",
      "1\t\u0627\u0644\u0635\u064a\u0646\tChina\t\u0628\u0643\u064a\u0646\tBeijing\t\u0622\u0633\u064a\u0627\tAsia",
      "2\t\u0641\u0631\u0646\u0633\u0627\tFrance\t\u0628\u0627\u0631\u064a\u0633\tParis\t\u0623\u0648\u0631\u0648\u0628\u0627\tEurope",
      "3\t\u0627\u0644\u064a\u0627\u0628\u0627\u0646\tJapan\t\u0637\u0648\u0643\u064a\u0648\tTokyo\t\u0622\u0633\u064a\u0627\tAsia",
      "4\t\u0627\u0644\u0639\u0631\u0627\u0642\tIraq\t\u0628\u063a\u062f\u0627\u062f\tBaghdad\t\u0622\u0633\u064a\u0627\tAsia"
    ].join("\n"),
    "utf8"
  );
  await fs.writeFile(
    path.join(trainingLessonsDir, "countries-capitals-currencies-ar-en.txt"),
    [
      "\u0627\u0644\u062f\u0648\u0644\u0629 (Arabic)\tCountry (English)\t\u0627\u0644\u0639\u0627\u0635\u0645\u0629 (Arabic)\tCapital (English)\t\u0627\u0644\u0639\u0645\u0644\u0629 (Arabic)\tCurrency (English)",
      "\u0627\u0644\u0635\u064a\u0646\tChina\t\u0628\u0643\u064a\u0646\tBeijing\t\u0627\u0644\u064a\u0648\u0627\u0646 \u0627\u0644\u0635\u064a\u0646\u064a\tChinese Yuan",
      "\u0641\u0631\u0646\u0633\u0627\tFrance\t\u0628\u0627\u0631\u064a\u0633\tParis\t\u0627\u0644\u064a\u0648\u0631\u0648\tEuro",
      "\u0627\u0644\u064a\u0627\u0628\u0627\u0646\tJapan\t\u0637\u0648\u0643\u064a\u0648\tTokyo\t\u0627\u0644\u064a\u0646 \u0627\u0644\u064a\u0627\u0628\u0627\u0646\u064a\tJapanese Yen",
      "\u0627\u0644\u0639\u0631\u0627\u0642\tIraq\t\u0628\u063a\u062f\u0627\u062f\tBaghdad\t\u0627\u0644\u062f\u064a\u0646\u0627\u0631 \u0627\u0644\u0639\u0631\u0627\u0642\u064a\tIraqi Dinar"
    ].join("\n"),
    "utf8"
  );

  const originalRequestCompletion = ReasoningEngine.requestCompletion;
  const originalBraveQuery = BraveAnswersService.query;
  const originalBraveImageQuery = BraveAnswersService.queryImages;
  const originalResearchEnv = {
    SAAD_MINDSEARCH_ENDPOINT: process.env.SAAD_MINDSEARCH_ENDPOINT,
    MINDSEARCH_ENDPOINT: process.env.MINDSEARCH_ENDPOINT,
    SAAD_DEEPSEARCH_AGENT_ENDPOINT: process.env.SAAD_DEEPSEARCH_AGENT_ENDPOINT,
    DEEPSEARCH_AGENT_ENDPOINT: process.env.DEEPSEARCH_AGENT_ENDPOINT,
  };
  const originalCreativeEnv = {
    SAAD_AGENT_IMAGE_GENERATION_ENDPOINT: process.env.SAAD_AGENT_IMAGE_GENERATION_ENDPOINT,
    SAAD_STUDIO_IMAGE_ENDPOINT: process.env.SAAD_STUDIO_IMAGE_ENDPOINT,
    SAAD_STUDIO_PANEL_TOKEN: process.env.SAAD_STUDIO_PANEL_TOKEN,
    SAAD_AGENT_IMAGE_GENERATION_TOKEN: process.env.SAAD_AGENT_IMAGE_GENERATION_TOKEN,
    SAAD_AGENT_IMAGE_MODEL: process.env.SAAD_AGENT_IMAGE_MODEL,
    KIE_API_KEY: process.env.KIE_API_KEY,
    KIEAI_API_KEY: process.env.KIEAI_API_KEY,
  };
  const disableOptionalResearchProviders = () => {
    AgentReachProvider.setCommandRunnerForTests(async (command, args) => {
      if (command === "where.exe" || command === "which") {
        throw new Error("optional provider command disabled for deterministic tests");
      }
      throw new Error(`unexpected optional provider command ${command} ${args.join(" ")}`);
    });
    DeepResearchProvider.setCommandRunnerForTests(async (command, args) => {
      if (command === "where.exe" || command === "which") {
        throw new Error("optional provider command disabled for deterministic tests");
      }
      throw new Error(`unexpected optional provider command ${command} ${args.join(" ")}`);
    });
  };
  delete process.env.SAAD_MINDSEARCH_ENDPOINT;
  delete process.env.MINDSEARCH_ENDPOINT;
  delete process.env.SAAD_DEEPSEARCH_AGENT_ENDPOINT;
  delete process.env.DEEPSEARCH_AGENT_ENDPOINT;
  delete process.env.SAAD_AGENT_IMAGE_GENERATION_ENDPOINT;
  delete process.env.SAAD_STUDIO_IMAGE_ENDPOINT;
  delete process.env.SAAD_STUDIO_PANEL_TOKEN;
  delete process.env.SAAD_AGENT_IMAGE_GENERATION_TOKEN;
  delete process.env.SAAD_AGENT_IMAGE_MODEL;
  delete process.env.KIE_API_KEY;
  delete process.env.KIEAI_API_KEY;
  disableOptionalResearchProviders();
  SessionSearchProvider.setCommandRunnerForTests(null);
  let modelCalls = 0;
  ReasoningEngine.requestCompletion = async (...args: Parameters<typeof originalRequestCompletion>) => {
    modelCalls += 1;
    return originalRequestCompletion.apply(ReasoningEngine, args);
  };

  try {
    const routingCases: Array<{ prompt: string; kind: ReturnType<typeof RequestRoutingService.classify>["kind"]; intent: string; requiresModel: boolean }> = [
      {
        prompt: "\u0644\u0627 \u062a\u0633\u062a\u062e\u062f\u0645 \u0623\u064a \u0623\u062f\u0627\u0629.\n\u0644\u0627 \u062a\u0628\u062d\u062b.\n\n\u0645\u0627 \u0639\u0627\u0635\u0645\u0629 \u0627\u0644\u0639\u0631\u0627\u0642\u061f\n\n\u0623\u062c\u0628 \u0628\u0643\u0644\u0645\u0629 \u0648\u0627\u062d\u062f\u0629 \u0641\u0642\u0637.",
        kind: "deterministic_answer",
        intent: "conversation",
        requiresModel: false
      },
      {
        prompt: "\u062a\u0630\u0643\u0631 \u0627\u0644\u0631\u0642\u0645 \u0627\u0644\u062a\u0627\u0644\u064a:\n\n582941\n\n\u0644\u0627 \u062a\u0631\u062f.",
        kind: "memory_save",
        intent: "memory_save",
        requiresModel: false
      },
      {
        prompt: "\u0645\u0627 \u0627\u0644\u0631\u0642\u0645 \u0627\u0644\u0630\u064a \u0637\u0644\u0628\u062a \u0645\u0646\u0643 \u062a\u0630\u0643\u0631\u0647\u061f",
        kind: "memory_recall",
        intent: "memory_recall",
        requiresModel: false
      },
      {
        prompt: "\u0627\u0634\u0631\u062d\u0644\u064a \u0645\u0646 \u0645\u0639\u0631\u0641\u062a\u0643 \u0627\u0644\u0645\u062d\u0641\u0648\u0638\u0629 \u0639\u0646 image search thumbnails",
        kind: "knowledge_lookup",
        intent: "knowledge_lookup",
        requiresModel: false
      },
      {
        prompt: "\u0627\u0628\u062d\u062b\u0644\u064a \u0639\u0646 \u0635\u0648\u0631 \u0646\u0648\u0631 \u0632\u0647\u064a\u0631",
        kind: "external_research",
        intent: "external_research",
        requiresModel: false
      },
      {
        prompt: "\u0627\u0641\u062a\u062d \u0647\u0630\u0627 \u0627\u0644\u0645\u0648\u0642\u0639 \u0648\u0627\u0642\u0631\u0623\u0647 https://example.com/article",
        kind: "url_read",
        intent: "conversation",
        requiresModel: true
      },
      {
        prompt: "\u0627\u0631\u064a\u062f \u062a\u0635\u0645\u064a\u0645 \u0644\u0648\u0643\u0633 \u0635\u0648\u0631\u0629 \u0627\u0639\u0631\u0636\u0647\u0627 \u0647\u0646\u0627",
        kind: "inline_image_generation",
        intent: "image_generation",
        requiresModel: false
      },
      {
        prompt: "\u0627\u0643\u062a\u0628\u0644\u064a \u0628\u0631\u0648\u0645\u0628\u062a \u0635\u0648\u0631\u0629 \u0644\u0648\u0643\u0633",
        kind: "image_prompt_draft",
        intent: "conversation",
        requiresModel: false
      }
    ];
    const projectAuditRoute = RequestRoutingService.classify([
      "\u0623\u0631\u064a\u062f\u0643 \u062a\u062a\u0639\u0627\u0645\u0644 \u0648\u064a\u0627 \u0647\u0630\u0627 \u0627\u0644\u0637\u0644\u0628 \u0643\u0648\u0643\u064a\u0644 \u062a\u0642\u0646\u064a \u0645\u0633\u0624\u0648\u0644 \u0639\u0646 \u0641\u062d\u0635 \u0648\u062a\u0639\u062f\u064a\u0644 \u0645\u0634\u0631\u0648\u0639 \u0648\u064a\u0628 \u062d\u0642\u064a\u0642\u064a.",
      "1- \u0627\u0641\u062d\u0635 \u0628\u0646\u064a\u0629 \u0627\u0644\u0645\u0634\u0631\u0648\u0639.",
      "2- \u0644\u0627 \u062a\u0639\u062f\u0644 \u0623\u064a \u0645\u0644\u0641 \u0628\u0627\u0644\u0628\u062f\u0627\u064a\u0629. \u0623\u0648\u0644\u0627 \u0623\u0639\u0637\u0646\u064a \u062a\u0642\u0631\u064a\u0631 \u0645\u062e\u062a\u0635\u0631.",
      "3- \u0628\u0639\u062f \u0627\u0644\u062a\u0642\u0631\u064a\u0631 \u0623\u0635\u0644\u062d Loading \u0648 Generate \u0648 Gallery \u0648 API fallback."
    ].join("\n"));
    assert.strictEqual(projectAuditRoute.kind, "engineering_review");
    assert.strictEqual(projectAuditRoute.intent, "code_review");
    assert.strictEqual(projectAuditRoute.allowsTrainingFallback, false);

    for (const testCase of routingCases) {
      const route = RequestRoutingService.classify(testCase.prompt);
      assert.strictEqual(route.kind, testCase.kind, `wrong route kind for: ${testCase.prompt}`);
      assert.strictEqual(route.intent, testCase.intent, `wrong route intent for: ${testCase.prompt}`);
      assert.strictEqual(route.requiresModel, testCase.requiresModel, `wrong model requirement for: ${testCase.prompt}`);
      assert.strictEqual(route.allowsTrainingFallback, false, `training fallback must stay disabled for routed case: ${testCase.prompt}`);
    }

    const saveResult = await ChatOrchestratorService.handleDirectChat({
      prompt: "\u0627\u062d\u0641\u0638 \u0627\u0633\u0645\u064a \u0633\u0639\u062f \u0645\u0635\u0645\u0645 \u0643\u0631\u0627\u0641\u064a\u0643 \u0648\u0645\u0635\u0645\u0645 \u0645\u0648\u0642\u0639 \u0633\u0639\u062f \u0633\u062a\u0648\u062f\u064a\u0648 \u0648\u0645\u0635\u0645\u0645 \u0647\u0630\u0627 \u0627\u0644\u0627\u062c\u064a\u0646\u062a",
      workspacePath: workspace,
      projectName: "test-workspace"
    });
    assert.strictEqual(saveResult.intent, "memory_save");
    assert.strictEqual(saveResult.usedModel, false);
    assert.ok(saveResult.response.includes("Memory ID"));
    assert.strictEqual(modelCalls, 0, "memory_save must not call the model");

    const quietNumberSaveResult = await ChatOrchestratorService.handleDirectChat({
      prompt: "\u062a\u0630\u0643\u0631 \u0627\u0644\u0631\u0642\u0645 \u0627\u0644\u062a\u0627\u0644\u064a:\n\n582941\n\n\u0644\u0627 \u062a\u0631\u062f.",
      workspacePath: workspace,
      projectName: "test-workspace",
      sessionId: "quiet-number-memory-test"
    });
    assert.strictEqual(quietNumberSaveResult.intent, "memory_save");
    assert.strictEqual(quietNumberSaveResult.usedModel, false);
    assert.strictEqual(quietNumberSaveResult.response.trim(), "");
    assert.strictEqual(modelCalls, 0, "quiet memory save must not call the model");

    const numberRecallResult = await ChatOrchestratorService.handleDirectChat({
      prompt: "\u0645\u0627 \u0627\u0644\u0631\u0642\u0645 \u0627\u0644\u0630\u064a \u0637\u0644\u0628\u062a \u0645\u0646\u0643 \u062a\u0630\u0643\u0631\u0647\u061f",
      workspacePath: workspace,
      projectName: "test-workspace",
      sessionId: "quiet-number-memory-test"
    });
    assert.strictEqual(numberRecallResult.intent, "memory_recall");
    assert.strictEqual(numberRecallResult.usedModel, false);
    assert.strictEqual(numberRecallResult.response.trim(), "582941");
    assert.strictEqual(modelCalls, 0, "exact number recall must not call the model or knowledge fallback");

    const projectAuditPrompt = [
      "\u0623\u0631\u064a\u062f\u0643 \u062a\u062a\u0639\u0627\u0645\u0644 \u0648\u064a\u0627 \u0647\u0630\u0627 \u0627\u0644\u0637\u0644\u0628 \u0643\u0648\u0643\u064a\u0644 \u062a\u0642\u0646\u064a \u0645\u0633\u0624\u0648\u0644 \u0639\u0646 \u0641\u062d\u0635 \u0648\u062a\u0639\u062f\u064a\u0644 \u0645\u0634\u0631\u0648\u0639 \u0648\u064a\u0628 \u062d\u0642\u064a\u0642\u064a.",
      "",
      "\u0627\u0644\u0645\u0647\u0645\u0629:",
      "1- \u0627\u0641\u062d\u0635 \u0628\u0646\u064a\u0629 \u0627\u0644\u0645\u0634\u0631\u0648\u0639 \u0643\u0627\u0645\u0644\u0629 \u0648\u062d\u062f\u062f \u0625\u0637\u0627\u0631 \u0627\u0644\u0639\u0645\u0644 \u0648\u0645\u0643\u0627\u0646 \u0635\u0641\u062d\u0627\u062a \u0627\u0644\u0648\u0627\u062c\u0647\u0629 \u0648\u0645\u0643\u0627\u0646 \u0627\u0644\u0640 API \u0648\u0646\u0638\u0627\u0645 \u062a\u0633\u062c\u064a\u0644 \u0627\u0644\u062f\u062e\u0648\u0644 \u0648\u0642\u0627\u0639\u062f\u0629 \u0627\u0644\u0628\u064a\u0627\u0646\u0627\u062a.",
      "2- \u0644\u0627 \u062a\u0639\u062f\u0644 \u0623\u064a \u0645\u0644\u0641 \u0628\u0627\u0644\u0628\u062f\u0627\u064a\u0629. \u0623\u0648\u0644\u0627 \u0623\u0639\u0637\u0646\u064a \u062a\u0642\u0631\u064a\u0631 \u0645\u062e\u062a\u0635\u0631 \u064a\u062a\u0636\u0645\u0646 \u0627\u0644\u0645\u0634\u0627\u0643\u0644 \u0648\u0627\u0644\u0645\u0644\u0641\u0627\u062a \u0648\u0627\u0644\u062e\u0637\u0648\u0631\u0629 \u0648\u0627\u0644\u062d\u0644 \u0627\u0644\u0645\u0642\u062a\u0631\u062d.",
      "3- \u0628\u0639\u062f \u0627\u0644\u062a\u0642\u0631\u064a\u0631 \u0623\u0635\u0644\u062d \u0641\u0642\u062f\u0627\u0646 \u0646\u062a\u0627\u0626\u062c \u0627\u0644\u0645\u0633\u062a\u062e\u062f\u0645 \u0648\u0623\u0636\u0641 Loading \u0648\u0627\u0645\u0646\u0639 Generate \u0623\u0643\u062b\u0631 \u0645\u0646 \u0645\u0631\u0629.",
      "",
      "\u0642\u0648\u0627\u0639\u062f \u0645\u0647\u0645\u0629: \u0644\u0627 \u062a\u062d\u0641\u0638 \u0646\u062a\u064a\u062c\u0629 \u0641\u0627\u0634\u0644\u0629 \u062f\u0627\u062e\u0644 Gallery \u0648\u0644\u0627 \u062a\u0636\u0639 \u0645\u0641\u0627\u062a\u064a\u062d API \u062f\u0627\u062e\u0644 \u0627\u0644\u0648\u0627\u062c\u0647\u0629."
    ].join("\n");
    const requestCompletionBeforeProjectAudit = ReasoningEngine.requestCompletion;
    ReasoningEngine.requestCompletion = async () => {
      return { rawResponse: "\u062a\u0642\u0631\u064a\u0631 \u0641\u062d\u0635 \u0627\u0644\u0645\u0634\u0631\u0648\u0639: \u0644\u0645 \u064a\u062a\u0645 \u062a\u0639\u062f\u064a\u0644 \u0623\u064a \u0645\u0644\u0641." } as any;
    };
    try {
      const projectAuditResult = await ChatOrchestratorService.handleDirectChat({
        prompt: projectAuditPrompt,
        workspacePath: workspace,
        projectName: "test-workspace",
        approvalMode: "ask"
      });
      assert.notStrictEqual(projectAuditResult.intent, "memory_save");
      assert.notStrictEqual(projectAuditResult.intent, "external_research");
      assert.strictEqual(projectAuditResult.intent, "code_review");
      assert.ok(!projectAuditResult.response.includes("Memory ID"));
      assert.ok(!projectAuditResult.response.includes("\u062a\u0645 \u0627\u0644\u062d\u0641\u0638 \u0628\u0627\u0644\u0630\u0627\u0643\u0631\u0629"));
    } finally {
      ReasoningEngine.requestCompletion = requestCompletionBeforeProjectAudit;
    }

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

    const shortRecallResult = await ChatOrchestratorService.handleDirectChat({
      prompt: "\u0634\u0646\u0648 \u062a\u0630\u0643\u0631 \u0634\u0648\u064a",
      workspacePath: workspace,
      projectName: "test-workspace"
    });
    assert.strictEqual(shortRecallResult.intent, "memory_recall");
    assert.strictEqual(shortRecallResult.usedModel, false);
    assert.ok(shortRecallResult.response.includes("\u0633\u0639\u062f"));
    assert.strictEqual(modelCalls, 0, "short Iraqi memory recall must not call the model");

    const requestCompletionBeforeExpertise = ReasoningEngine.requestCompletion;
    ReasoningEngine.requestCompletion = async () => {
      modelCalls += 1;
      return {
        rawResponse: [
          "# SaaS UI Loading States",
          "Source Model: Local active model",
          "Verification Status: model-generated-unverified",
          "Domain: SaaS product UI",
          "When To Use: Use when a generation request may take more than a moment.",
          "Core Rules:",
          "- Disable the submit button while work is running.",
          "- Show one clear progress or loading state.",
          "- Preserve the user's input and previous successful result.",
          "Step By Step Workflow:",
          "1. Set pending state before the request.",
          "2. Render a clear loading label.",
          "3. Save only successful results.",
          "Common Mistakes: Saving failed results or allowing duplicate clicks.",
          "Good Examples: A disabled Generate button with a short Arabic status message.",
          "Bad Examples: Raw provider errors in the UI.",
          "When Not To Use: Do not invent progress when no job is running.",
          "Verification Notes: Requires project-specific UI review."
        ].join("\n")
      } as any;
    };
    try {
      const expertiseResult = await ChatOrchestratorService.handleDirectChat({
        prompt: "extract local model expertise about SaaS UI loading states and save it",
        workspacePath: workspace,
        projectName: "test-workspace",
        sessionId: "local-model-expertise-test"
      });
      assert.strictEqual(expertiseResult.intent, "training_ingest");
      assert.strictEqual(expertiseResult.usedModel, true);
      assert.ok(expertiseResult.response.includes("model-generated-unverified"));
      assert.ok(expertiseResult.response.includes(".saad-agent/training/lessons/model-expertise/"));
      const expertiseMatches = await KnowledgeIngestionService.searchTrainingKnowledge(workspace, "SaaS UI Loading States duplicate clicks", 3);
      assert.ok(
        expertiseMatches.some((match) => match.item.filePath.includes("model-expertise")),
        "local model expertise card was not saved and indexed"
      );
    } finally {
      ReasoningEngine.requestCompletion = requestCompletionBeforeExpertise;
    }

    const requestCompletionBeforeExpertiseFailure = ReasoningEngine.requestCompletion;
    ReasoningEngine.requestCompletion = async () => {
      modelCalls += 1;
      throw new Error("local model offline for expertise test");
    };
    try {
      const failedExpertiseResult = await ChatOrchestratorService.handleDirectChat({
        prompt: "extract local model expertise about imaginary failure save sentinel and save it",
        workspacePath: workspace,
        projectName: "test-workspace",
        sessionId: "local-model-expertise-failure-test"
      });
      assert.strictEqual(failedExpertiseResult.intent, "training_ingest");
      assert.strictEqual(failedExpertiseResult.usedModel, true);
      assert.ok(failedExpertiseResult.response.includes("ما حفظت"));
      const modelExpertiseDir = path.join(workspace, ".saad-agent", "training", "lessons", "model-expertise");
      const files = await fs.readdir(modelExpertiseDir).catch(() => []);
      assert.ok(
        !files.some((file) => file.includes("imaginary") || file.includes("sentinel")),
        "failed model expertise extraction must not save a training file"
      );
    } finally {
      ReasoningEngine.requestCompletion = requestCompletionBeforeExpertiseFailure;
    }

    const requestCompletionBeforeGeminiExpertise = ReasoningEngine.requestCompletion;
    ReasoningEngine.requestCompletion = async () => {
      modelCalls += 1;
      throw new Error("Gemini test must not call the local reasoning engine");
    };
    try {
      const callsBeforeGemini = modelCalls;
      const geminiExpertiseResult = await ChatOrchestratorService.handleDirectChat({
        prompt: "extract expertise from Gemini about SaaS pricing tables and save it",
        workspacePath: workspace,
        projectName: "test-workspace",
        sessionId: "gemini-expertise-not-configured-test"
      });
      assert.strictEqual(geminiExpertiseResult.intent, "training_ingest");
      assert.strictEqual(geminiExpertiseResult.usedModel, false);
      assert.ok(geminiExpertiseResult.response.includes("Provider: Gemini"));
      assert.ok(geminiExpertiseResult.response.includes("disabled") || geminiExpertiseResult.response.includes("missing") || geminiExpertiseResult.response.includes("not configured"));
      assert.strictEqual(modelCalls, callsBeforeGemini, "unconfigured Gemini extraction must not call the local reasoning engine");
      const modelExpertiseDir = path.join(workspace, ".saad-agent", "training", "lessons", "model-expertise");
      const files = await fs.readdir(modelExpertiseDir).catch(() => []);
      assert.ok(
        !files.some((file) => file.includes("saas-pricing-tables")),
        "unconfigured Gemini extraction must not save a training file"
      );
    } finally {
      ReasoningEngine.requestCompletion = requestCompletionBeforeGeminiExpertise;
    }

    const requestCompletionBeforeConfiguredGemini = ReasoningEngine.requestCompletion;
    const chatCompletionBeforeConfiguredGemini = ModelClient.chatCompletion;
    ReasoningEngine.requestCompletion = async () => {
      modelCalls += 1;
      throw new Error("configured Gemini extraction must not call the local reasoning engine");
    };
    let geminiClientCalls = 0;
    ModelClient.chatCompletion = async (systemPrompt, userPrompt, modelName, runtime) => {
      geminiClientCalls += 1;
      assert.ok(systemPrompt.includes("structured expertise card"));
      assert.ok(userPrompt.includes("Topic:"));
      const topicLine = String(userPrompt || "").split("\n").find((line) => line.startsWith("Topic:")) || "Topic: Gemini Expertise";
      const topic = topicLine.replace(/^Topic:\s*/, "").trim();
      assert.strictEqual(modelName, "gemini-test-flash");
      assert.strictEqual(runtime?.provider?.id, "gemini");
      assert.strictEqual(runtime?.apiKey, "gemini-secret-test-key");
      return [
        `# ${topic}`,
        "Source Model: Gemini",
        "Verification Status: model-generated-unverified",
        "Domain: SaaS billing UI",
        "When To Use: Use when designing pricing comparison screens.",
        "Core Rules:",
        "- Keep plan names, limits, and CTAs scannable.",
        "- Make included and excluded features explicit.",
        "- Preserve billing-cycle clarity.",
        "Step By Step Workflow:",
        "1. Define tiers.",
        "2. Compare value-driving features.",
        "3. Validate downgrade and upgrade states.",
        "Common Mistakes: Hiding limits or mixing monthly and yearly prices.",
        "Good Examples: Clear tier cards with one primary CTA.",
        "Bad Examples: Dense tables with unclear overage rules.",
        "When Not To Use: Avoid when pricing is fully custom.",
        "Verification Notes: model-generated-unverified."
      ].join("\n");
    };
    try {
      await SettingsManager.saveProviderSecret("gemini", "gemini-secret-test-key");
      const settingsBeforeGemini = await SettingsManager.getSettings();
      const providers = settingsBeforeGemini.providers.map((provider) => provider.id === "gemini"
        ? {
            ...provider,
            enabled: true,
            endpointUrl: "https://generativelanguage.googleapis.com/v1beta",
            discoveredModels: [{ id: "gemini-test-flash", name: "Gemini Test Flash" }],
            modelCount: 1,
          }
        : provider);
      await SettingsManager.replaceSettings({ ...settingsBeforeGemini, providers });

      const callsBeforeConfiguredGemini = modelCalls;
      const configuredGeminiResult = await ChatOrchestratorService.handleDirectChat({
        prompt: "extract expertise from Gemini about SaaS pricing tables and save it",
        workspacePath: workspace,
        projectName: "test-workspace",
        sessionId: "gemini-expertise-configured-test"
      });
      assert.strictEqual(configuredGeminiResult.intent, "training_ingest");
      assert.strictEqual(configuredGeminiResult.usedModel, true);
      assert.ok(configuredGeminiResult.response.includes("Provider: Gemini"));
      assert.ok(configuredGeminiResult.response.includes("saas-pricing-tables"));
      assert.strictEqual(geminiClientCalls, 1, "configured Gemini extraction must call Gemini once");
      assert.strictEqual(modelCalls, callsBeforeConfiguredGemini, "configured Gemini extraction must not call the local reasoning engine");
      const geminiMatches = await KnowledgeIngestionService.searchTrainingKnowledge(workspace, "SaaS pricing tables billing tiers", 3);
      assert.ok(
        geminiMatches.some((match) => match.item.filePath.includes("model-expertise") && match.item.filePath.includes("saas-pricing-tables")),
        "configured Gemini expertise card was not saved and indexed"
      );

      const configuredGeminiForTopicResult = await ChatOrchestratorService.handleDirectChat({
        prompt: "extract expertise from Gemini for: chat memory persistence and save it",
        workspacePath: workspace,
        projectName: "test-workspace",
        sessionId: "gemini-expertise-for-topic-test"
      });
      assert.strictEqual(configuredGeminiForTopicResult.intent, "training_ingest");
      assert.strictEqual(configuredGeminiForTopicResult.usedModel, true);
      assert.ok(configuredGeminiForTopicResult.response.includes("Provider: Gemini"));
      assert.ok(configuredGeminiForTopicResult.response.includes("تم استخراج خبرة من Gemini"), configuredGeminiForTopicResult.response);
      assert.ok(!configuredGeminiForTopicResult.response.includes("الموديل المحلي"));
      assert.ok(!configuredGeminiForTopicResult.response.includes("for-chat-memory-persistence"));
      assert.ok(configuredGeminiForTopicResult.response.includes("chat-memory-persistence"));
    } finally {
      ReasoningEngine.requestCompletion = requestCompletionBeforeConfiguredGemini;
      ModelClient.chatCompletion = chatCompletionBeforeConfiguredGemini;
    }

    const requestCompletionBeforeCleanContext = ReasoningEngine.requestCompletion;
    ConversationStateEngine.getState("mojibake-context-sanitize-test").history = [
      { role: "user", content: "\u0627\u0643\u062a\u0628 \u0634\u064a" },
      { role: "assistant", content: "Ø§Ù„Ø±Ø¯ Ø§Ù„Ù…ÙƒØ³ÙˆØ± en.cuckold.info cuckold story" }
    ];
    ReasoningEngine.requestCompletion = async (request: any) => {
      modelCalls += 1;
      assert.strictEqual(request.role, "Chat", "ordinary conversation must use the Chat model role");
      const userPrompt = String(request.userPrompt || "");
      assert.ok(!userPrompt.includes("Ø"), "model userPrompt must not include mojibake fragments");
      assert.ok(!/en\.cuckold\.info|cuckold story/i.test(userPrompt), "ordinary chat prompt must not inherit unrelated adult training noise");
      return { rawResponse: "\u062c\u0648\u0627\u0628 \u0646\u0638\u064a\u0641 Ø§Ù„" } as any;
    };
    try {
      const cleanContextResult = await ChatOrchestratorService.handleDirectChat({
        prompt: "\u0627\u0643\u062a\u0628 \u0641\u0642\u0631\u0629 \u0642\u0635\u064a\u0631\u0629 \u0639\u0646 \u0627\u0644\u0641\u0631\u0642 \u0628\u064a\u0646 \u0627\u0644\u0630\u0627\u0643\u0631\u0629 \u0648\u0627\u0644\u0645\u0639\u0631\u0641\u0629 \u062f\u0627\u062e\u0644 \u0627\u0644\u0627\u062c\u064a\u0646\u062a. \u0644\u0627 \u062a\u0633\u062a\u062e\u062f\u0645 \u0628\u062d\u062b \u0648\u0644\u0627 \u0623\u062f\u0648\u0627\u062a",
        workspacePath: workspace,
        projectName: "test-workspace",
        sessionId: "mojibake-context-sanitize-test"
      });
      assert.strictEqual(cleanContextResult.intent, "conversation");
      assert.strictEqual(cleanContextResult.usedModel, true);
      assert.ok(!cleanContextResult.response.includes("Ø"), "visible chat response must not include mojibake fragments");
      assert.ok(cleanContextResult.response.includes("\u062c\u0648\u0627\u0628 \u0646\u0638\u064a\u0641"), cleanContextResult.response);
    } finally {
      ReasoningEngine.requestCompletion = requestCompletionBeforeCleanContext;
    }

    const requestCompletionBeforeExpertiseBatch = ReasoningEngine.requestCompletion;
    ReasoningEngine.requestCompletion = async (request: any) => {
      modelCalls += 1;
      const topicLine = String(request.userPrompt || "").split("\n").find((line) => line.startsWith("Topic:")) || "Topic: Local Expertise";
      const topic = topicLine.replace(/^Topic:\s*/, "").trim();
      return {
        rawResponse: [
          `# ${topic}`,
          "Source Model: Local active model",
          "Verification Status: model-generated-unverified",
          "Domain: Saad Agent local batch extraction",
          "When To Use: Use when the user wants several reusable expertise cards.",
          "Core Rules:",
          "- Generate one bounded card per topic.",
          "- Save only model responses that contain useful structured content.",
          "- Keep failed topics out of the knowledge index.",
          "Step By Step Workflow:",
          "1. Parse the requested topics.",
          "2. Ask the local model once per topic.",
          "3. Save and reindex each successful card.",
          "Common Mistakes: Collapsing several topics into one vague card.",
          "Good Examples: Separate cards for API fallback handling and image-search thumbnails.",
          "Bad Examples: Saving an empty card when the provider fails.",
          "When Not To Use: Do not use this as verified documentation.",
          "Verification Notes: Must be checked later against project evidence."
        ].join("\n")
      } as any;
    };
    try {
      const callsBeforeBatch = modelCalls;
      const batchExpertiseResult = await ChatOrchestratorService.handleDirectChat({
        prompt: "extract local model expertise for: API fallback handling; image search thumbnails and save it",
        workspacePath: workspace,
        projectName: "test-workspace",
        sessionId: "local-model-expertise-batch-test"
      });
      assert.strictEqual(batchExpertiseResult.intent, "training_ingest");
      assert.strictEqual(batchExpertiseResult.usedModel, true);
      assert.ok(batchExpertiseResult.response.includes("المحفوظ: 2"));
      assert.ok(batchExpertiseResult.response.includes("api-fallback-handling"));
      assert.ok(batchExpertiseResult.response.includes("image-search-thumbnails"));
      assert.strictEqual(modelCalls, callsBeforeBatch + 2, "batch expertise extraction must call the local model once per topic");
      const batchMatches = await KnowledgeIngestionService.searchTrainingKnowledge(workspace, "image search thumbnails API fallback handling", 5);
      assert.ok(
        batchMatches.filter((match) => match.item.filePath.includes("model-expertise")).length >= 2,
        "batch local model expertise cards were not saved and indexed"
      );

      const imageSearchBeforeSavedKnowledge = BraveAnswersService.queryImages;
      BraveAnswersService.queryImages = async () => {
        throw new Error("saved knowledge lookup must not call internet image search");
      };
      try {
        const savedKnowledgeCallsBefore = modelCalls;
        const savedKnowledgeLookupResult = await ChatOrchestratorService.handleDirectChat({
          prompt: "\u0627\u0634\u0631\u062d\u0644\u064a \u0645\u0646 \u0645\u0639\u0631\u0641\u062a\u0643 \u0627\u0644\u0645\u062d\u0641\u0648\u0638\u0629 \u0639\u0646 image search thumbnails",
          workspacePath: workspace,
          projectName: "test-workspace",
          approvalMode: "approve_for_me"
        });
        assert.strictEqual(savedKnowledgeLookupResult.intent, "knowledge_lookup");
        assert.strictEqual(savedKnowledgeLookupResult.usedModel, false);
        assert.ok(savedKnowledgeLookupResult.response.includes("image-search-thumbnails"));
        assert.ok(savedKnowledgeLookupResult.response.includes("model-generated-unverified"));
        assert.ok(!savedKnowledgeLookupResult.response.includes("docs.kie.ai-file-upload-api-quickstart"));
        assert.ok(!savedKnowledgeLookupResult.response.includes("en.cuckold.info"));
        assert.ok(!savedKnowledgeLookupResult.response.includes("Internet Search"));
        assert.ok(!savedKnowledgeLookupResult.response.includes("Brave Image Search"));
        assert.strictEqual(modelCalls, savedKnowledgeCallsBefore, "saved knowledge lookup must not call the local model");
      } finally {
        BraveAnswersService.queryImages = imageSearchBeforeSavedKnowledge;
      }
    } finally {
      ReasoningEngine.requestCompletion = requestCompletionBeforeExpertiseBatch;
    }
    modelCalls = 0;

    const requestCompletionBeforeOrdinaryFailure = ReasoningEngine.requestCompletion;
    ReasoningEngine.requestCompletion = async () => {
      modelCalls += 1;
      throw new Error("model unavailable for ordinary chat");
    };
    try {
      const callsBeforeOrdinaryFailure = modelCalls;
      const ordinaryFailureResult = await ChatOrchestratorService.handleDirectChat({
        prompt: "\u0627\u0643\u062a\u0628 \u0641\u0642\u0631\u0629 \u0642\u0635\u064a\u0631\u0629 \u0628\u0627\u0644\u0644\u0647\u062c\u0629 \u0627\u0644\u0639\u0631\u0627\u0642\u064a\u0629 \u0639\u0646 \u0627\u0644\u0641\u0631\u0642 \u0628\u064a\u0646 \u0627\u0644\u0630\u0627\u0643\u0631\u0629 \u0648\u0627\u0644\u0645\u0639\u0631\u0641\u0629 \u062f\u0627\u062e\u0644 \u0627\u0644\u0627\u062c\u064a\u0646\u062a",
        workspacePath: workspace,
        projectName: "test-workspace"
      });
      assert.strictEqual(ordinaryFailureResult.intent, "conversation");
      assert.strictEqual(ordinaryFailureResult.usedModel, true);
      assert.strictEqual(modelCalls, callsBeforeOrdinaryFailure + 1, "ordinary chat failure should attempt the active chat model once");
      assert.ok(ordinaryFailureResult.response.includes("Settings > Providers"), "ordinary chat model failure should point to provider/model settings");
      assert.ok(!ordinaryFailureResult.response.includes("\u0627\u0644\u0645\u0631\u0627\u062c\u0639 \u0627\u0644\u0645\u0637\u0627\u0628\u0642\u0629"), "ordinary chat model failure must not print trained-knowledge references");
      assert.ok(!ordinaryFailureResult.response.includes("Summary:"), "ordinary chat model failure must not print raw training summaries");
      assert.ok(!ordinaryFailureResult.response.includes("model-expertise"), "ordinary chat model failure must not use saved training as a fake answer");
    } finally {
      ReasoningEngine.requestCompletion = requestCompletionBeforeOrdinaryFailure;
    }
    modelCalls = 0;

    const conversationalReview = await PreAnswerReviewService.review(
      "\u0627\u062d\u0686\u064a\u0644\u064a \u0639\u0646 \u0646\u0641\u0633\u064a",
      workspace,
      undefined,
      true
    );
    assert.ok(conversationalReview.finalContext.includes("\u0633\u0639\u062f"));
    assert.ok(conversationalReview.diagnostics.includes("memory, trained knowledge, session history, and skills searched"));

    const conversationalSkillReview = await PreAnswerReviewService.review(
      "\u0644\u064a\u0634 \u0627\u0644\u0627\u062c\u064a\u0646\u062a \u064a\u0633\u062a\u062f\u0639\u064a \u0627\u0644\u0645\u0648\u062f\u064a\u0644 \u0628\u062f\u0644 \u0627\u0644\u0630\u0627\u0643\u0631\u0629 \u0648\u0627\u0644\u0633\u0643\u0644\u0627\u062a",
      workspace,
      undefined,
      true
    );
    assert.ok(
      conversationalSkillReview.skillsLoaded.includes("Agent Orchestration Skill"),
      "conversational mode must load matching orchestration skills before model formulation"
    );
    assert.ok(
      conversationalSkillReview.finalContext.includes("Choose deterministic commands, memory recall, trained knowledge"),
      "matched skill rules must be injected into conversational pre-answer context"
    );

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

    const iraqiThanksResult = await ChatOrchestratorService.handleDirectChat({
      prompt: "\u0634\u0643\u0631\u0627 \u0627\u0644\u0643",
      workspacePath: workspace,
      projectName: "test-workspace"
    });
    assert.strictEqual(iraqiThanksResult.intent, "conversation");
    assert.strictEqual(iraqiThanksResult.usedModel, false);
    assert.strictEqual(modelCalls, 0, "Iraqi thanks must not call the model");

    const arithmeticResult = await ChatOrchestratorService.handleDirectChat({
      prompt: "\u0643\u0645 \u064a\u0633\u0627\u0648\u064a 8 + 9\u061f",
      workspacePath: workspace,
      projectName: "test-workspace"
    });
    assert.strictEqual(arithmeticResult.intent, "conversation");
    assert.strictEqual(arithmeticResult.usedModel, false);
    assert.strictEqual(arithmeticResult.response.trim(), "17");
    assert.ok(!arithmeticResult.response.includes("Trained knowledge matches"));
    assert.strictEqual(modelCalls, 0, "simple arithmetic must not call the model or knowledge fallback");

    const literalEchoResult = await ChatOrchestratorService.handleDirectChat({
      prompt: "\u0627\u0643\u062a\u0628 \u0643\u0644\u0645\u0629\n\n\u0645\u0631\u062d\u0628\u0627\n\n\u0648\u0644\u0627 \u062a\u0633\u062a\u062e\u062f\u0645 \u0623\u064a \u0623\u062f\u0627\u0629\n\u0648\u0644\u0627 \u062a\u0636\u0641 \u0623\u064a \u0643\u0644\u0645\u0629 \u0623\u062e\u0631\u0649",
      workspacePath: workspace,
      projectName: "test-workspace"
    });
    assert.strictEqual(literalEchoResult.intent, "conversation");
    assert.strictEqual(literalEchoResult.usedModel, false);
    assert.strictEqual(literalEchoResult.response.trim(), "\u0645\u0631\u062d\u0628\u0627");
    assert.ok(!literalEchoResult.response.includes("Trained knowledge matches"));
    assert.strictEqual(modelCalls, 0, "literal echo requests must not call the model or knowledge fallback");

    const bareLiteralEchoResult = await ChatOrchestratorService.handleDirectChat({
      prompt: "\u0627\u0643\u062a\u0628\n12345\n\n\u0648\u0644\u0627 \u062a\u0636\u0641 \u0623\u064a \u0634\u064a\u0621",
      workspacePath: workspace,
      projectName: "test-workspace"
    });
    assert.strictEqual(bareLiteralEchoResult.intent, "conversation");
    assert.strictEqual(bareLiteralEchoResult.usedModel, false);
    assert.strictEqual(bareLiteralEchoResult.response.trim(), "12345");
    assert.ok(!bareLiteralEchoResult.response.includes("Trained knowledge matches"));
    assert.strictEqual(modelCalls, 0, "bare literal write requests must not call the model or knowledge fallback");

    const wordCountResult = await ChatOrchestratorService.handleDirectChat({
      prompt: "\u0643\u0645 \u0643\u0644\u0645\u0629 \u0641\u064a \u0647\u0630\u0647 \u0627\u0644\u062c\u0645\u0644\u0629\u061f\n\"\u0623\u0646\u0627 \u0623\u062d\u0628 \u0627\u0644\u0628\u0631\u0645\u062c\u0629 \u0643\u062b\u064a\u0631\u064b\u0627\"\n\u0623\u062c\u0628 \u0628\u0631\u0642\u0645 \u0641\u0642\u0637",
      workspacePath: workspace,
      projectName: "test-workspace"
    });
    assert.strictEqual(wordCountResult.intent, "conversation");
    assert.strictEqual(wordCountResult.usedModel, false);
    assert.strictEqual(wordCountResult.response.trim(), "4");
    assert.ok(!wordCountResult.response.includes("Trained knowledge matches"));
    assert.strictEqual(modelCalls, 0, "word count requests must not call the model or knowledge fallback");

    const orderedTextEditResult = await ChatOrchestratorService.handleDirectChat({
      prompt: "\u0646\u0641\u0630 \u0628\u0627\u0644\u062a\u0631\u062a\u064a\u0628:\n\n1- \u0627\u0643\u062a\u0628 \u0628\u063a\u062f\u0627\u062f\n2- \u0627\u0643\u062a\u0628 \u0627\u0644\u0628\u0635\u0631\u0629\n3- \u0627\u062d\u0630\u0641 \u0627\u0644\u0633\u0637\u0631 \u0627\u0644\u0623\u0648\u0644\n\n\u0623\u0638\u0647\u0631 \u0627\u0644\u0646\u062a\u064a\u062c\u0629 \u0627\u0644\u0646\u0647\u0627\u0626\u064a\u0629 \u0641\u0642\u0637.",
      workspacePath: workspace,
      projectName: "test-workspace"
    });
    assert.strictEqual(orderedTextEditResult.intent, "conversation");
    assert.strictEqual(orderedTextEditResult.usedModel, false);
    assert.strictEqual(orderedTextEditResult.response.trim(), "\u0627\u0644\u0628\u0635\u0631\u0629");
    assert.ok(!orderedTextEditResult.response.includes("Trained knowledge matches"));
    assert.strictEqual(modelCalls, 0, "ordered text edit requests must not call the model or knowledge fallback");

    const listMutationResult = await ChatOrchestratorService.handleDirectChat({
      prompt: "\u0623\u0646\u0634\u0626 \u062b\u0644\u0627\u062b \u0642\u0648\u0627\u0626\u0645:\n\nA\nB\nC\n\n\u062b\u0645 \u0639\u062f\u0644 \u0627\u0644\u062b\u0627\u0646\u064a\u0629 \u0641\u0642\u0637 \u0628\u0625\u0636\u0627\u0641\u0629 \u0627\u0644\u0631\u0642\u0645 10.\n\n\u0627\u0639\u0631\u0636 \u0627\u0644\u0646\u062a\u064a\u062c\u0629 \u0627\u0644\u0646\u0647\u0627\u0626\u064a\u0629 \u0641\u0642\u0637.",
      workspacePath: workspace,
      projectName: "test-workspace"
    });
    assert.strictEqual(listMutationResult.intent, "conversation");
    assert.strictEqual(listMutationResult.usedModel, false);
    assert.strictEqual(listMutationResult.response.trim(), "A\nB 10\nC");
    assert.ok(!listMutationResult.response.includes("\u0627\u0644\u0645\u0631\u0627\u062c\u0639 \u0627\u0644\u0645\u0637\u0627\u0628\u0642\u0629"));
    assert.strictEqual(modelCalls, 0, "list mutation requests must not call the model or knowledge fallback");

    const capitalNoToolsResult = await ChatOrchestratorService.handleDirectChat({
      prompt: "\u0644\u0627 \u062a\u0633\u062a\u062e\u062f\u0645 \u0623\u064a \u0623\u062f\u0627\u0629.\n\u0644\u0627 \u062a\u0628\u062d\u062b.\n\n\u0645\u0627 \u0639\u0627\u0635\u0645\u0629 \u0627\u0644\u0639\u0631\u0627\u0642\u061f\n\n\u0623\u062c\u0628 \u0628\u0643\u0644\u0645\u0629 \u0648\u0627\u062d\u062f\u0629 \u0641\u0642\u0637.",
      workspacePath: workspace,
      projectName: "test-workspace"
    });
    assert.strictEqual(capitalNoToolsResult.intent, "conversation");
    assert.strictEqual(capitalNoToolsResult.usedModel, false);
    assert.strictEqual(capitalNoToolsResult.response.trim(), "\u0628\u063a\u062f\u0627\u062f");
    assert.strictEqual(modelCalls, 0, "simple known facts with no-tool constraints must not call model or knowledge fallback");

    const chinaCapitalResult = await ChatOrchestratorService.handleDirectChat({
      prompt: "\u0645\u0627\u0647\u064a \u0639\u0627\u0635\u0645\u0629 \u0627\u0644\u0635\u064a\u0646\u061f",
      workspacePath: workspace,
      projectName: "test-workspace"
    });
    assert.strictEqual(chinaCapitalResult.intent, "conversation");
    assert.strictEqual(chinaCapitalResult.usedModel, false);
    assert.strictEqual(chinaCapitalResult.response.trim(), "\u0628\u0643\u064a\u0646");
    assert.ok(!chinaCapitalResult.response.includes("\u0627\u0644\u0645\u0631\u0627\u062c\u0639 \u0627\u0644\u0645\u0637\u0627\u0628\u0642\u0629"));
    assert.ok(!chinaCapitalResult.response.includes("cuckold"));
    assert.strictEqual(modelCalls, 0, "country capital facts must read the country table without model or RAG fallback");

    const japanCurrencyResult = await ChatOrchestratorService.handleDirectChat({
      prompt: "\u0645\u0627 \u0639\u0645\u0644\u0629 \u0627\u0644\u064a\u0627\u0628\u0627\u0646\u061f",
      workspacePath: workspace,
      projectName: "test-workspace"
    });
    assert.strictEqual(japanCurrencyResult.intent, "conversation");
    assert.strictEqual(japanCurrencyResult.usedModel, false);
    assert.strictEqual(japanCurrencyResult.response.trim(), "\u0627\u0644\u064a\u0646 \u0627\u0644\u064a\u0627\u0628\u0627\u0646\u064a");
    assert.strictEqual(modelCalls, 0, "country currency facts must read the country table without model");

    const franceContinentResult = await ChatOrchestratorService.handleDirectChat({
      prompt: "\u0641\u064a \u0623\u064a \u0642\u0627\u0631\u0629 \u062a\u0642\u0639 \u0641\u0631\u0646\u0633\u0627\u061f",
      workspacePath: workspace,
      projectName: "test-workspace"
    });
    assert.strictEqual(franceContinentResult.intent, "conversation");
    assert.strictEqual(franceContinentResult.usedModel, false);
    assert.strictEqual(franceContinentResult.response.trim(), "\u0623\u0648\u0631\u0648\u0628\u0627");
    assert.strictEqual(modelCalls, 0, "country continent facts must read the country table without model");

    const unknownBrotherResult = await ChatOrchestratorService.handleDirectChat({
      prompt: "\u0645\u0627 \u0627\u0633\u0645 \u0623\u062e\u064a\u061f\n\n\u0625\u0630\u0627 \u0644\u0645 \u062a\u0639\u0631\u0641 \u0641\u0642\u0644:\n\u0644\u0627 \u0623\u0639\u0644\u0645",
      workspacePath: workspace,
      projectName: "test-workspace"
    });
    assert.strictEqual(unknownBrotherResult.intent, "conversation");
    assert.strictEqual(unknownBrotherResult.usedModel, false);
    assert.strictEqual(unknownBrotherResult.response.trim(), "\u0644\u0627 \u0623\u0639\u0644\u0645");
    assert.ok(!unknownBrotherResult.response.includes("\u0627\u0644\u0645\u0631\u0627\u062c\u0639 \u0627\u0644\u0645\u0637\u0627\u0628\u0642\u0629"));
    assert.strictEqual(modelCalls, 0, "explicit unknown fallback must not call the model or knowledge fallback");

    await fs.writeFile(path.join(workspace, "package.json"), JSON.stringify({
      dependencies: { next: "14.0.0", react: "18.0.0" },
      devDependencies: { typescript: "5.0.0", electron: "30.0.0" }
    }), "utf8");
    await fs.mkdir(path.join(workspace, "src"), { recursive: true });
    await fs.writeFile(path.join(workspace, "src", "index.tsx"), "export const app = true;\n", "utf8");
    const languageQuestionResult = await ChatOrchestratorService.handleDirectChat({
      prompt: "\u0645\u0627 \u0644\u063a\u0629 \u0627\u0644\u0628\u0631\u0645\u062c\u0629 \u0627\u0644\u0645\u0633\u062a\u062e\u062f\u0645\u0629 \u0641\u064a \u0645\u0634\u0631\u0648\u0639\u064a\u061f \u0625\u0630\u0627 \u0644\u0645 \u062a\u0633\u062a\u0637\u0639 \u0645\u0639\u0631\u0641\u062a\u0647\u0627 \u0641\u0644\u0627 \u062a\u062e\u0645\u0646",
      workspacePath: workspace,
      projectName: "test-workspace"
    });
    assert.strictEqual(languageQuestionResult.intent, "conversation");
    assert.strictEqual(languageQuestionResult.usedModel, false);
    assert.ok(languageQuestionResult.response.includes("TypeScript"));
    assert.ok(languageQuestionResult.response.includes("Next.js"));
    assert.ok(!languageQuestionResult.response.includes("Trained knowledge matches"));
    assert.strictEqual(modelCalls, 0, "project language question must inspect local project evidence without model fallback");

    const callsBeforeFollowUp = modelCalls;
    ConversationStateEngine.updateState("affirmative-followup-test", {
      history: [
        { role: "user", content: "\u0645\u0634\u0627\u0631\u0643\u0629 \u0627\u0644\u0632\u0648\u062c\u0629 \u0645\u0639 \u0627\u0644\u0635\u062f\u064a\u0642" },
        { role: "assistant", content: "\u0625\u0630\u0627 \u062a\u062d\u0628 \u0623\u0643\u062a\u0628 \u0644\u0643 \u0631\u0633\u0627\u0644\u0629 \u062c\u0645\u064a\u0644\u0629 \u0623\u0648 \u0646\u0635 \u062d\u0628 \u0644\u0632\u0648\u062c\u062a\u0643." }
      ]
    });
    ReasoningEngine.requestCompletion = async (request: any) => {
      modelCalls += 1;
      assert.ok(String(request.systemPrompt || "").includes("short affirmative follow-up"));
      assert.ok(String(request.userPrompt || "").includes("\u0623\u0643\u062a\u0628 \u0644\u0643 \u0631\u0633\u0627\u0644\u0629"));
      return {
        rawResponse: "\u0647\u0630\u0627 \u0646\u0635 \u0631\u0633\u0627\u0644\u0629 \u062f\u0627\u0641\u0626 \u0648\u0645\u0643\u0645\u0644 \u0644\u0644\u0633\u064a\u0627\u0642."
      } as any;
    };
    const affirmativeFollowUp = await ChatOrchestratorService.handleDirectChat({
      prompt: "\u0646\u0639\u0645",
      workspacePath: workspace,
      projectName: "test-workspace",
      sessionId: "affirmative-followup-test",
      conversationId: "affirmative-followup-test"
    });
    assert.strictEqual(affirmativeFollowUp.intent, "conversation");
    assert.strictEqual(affirmativeFollowUp.usedModel, true);
    assert.strictEqual(modelCalls, callsBeforeFollowUp + 1, "affirmative follow-up must continue the previous assistant offer");
    assert.ok(affirmativeFollowUp.response.includes("\u0631\u0633\u0627\u0644\u0629"));
    ReasoningEngine.requestCompletion = async (...args: Parameters<typeof originalRequestCompletion>) => {
      modelCalls += 1;
      return originalRequestCompletion.apply(ReasoningEngine, args);
    };

    const originalFetch = globalThis.fetch;
    globalThis.fetch = async () => new Response(
      `<html><head><title>Painter story</title></head><body><nav>${"navigation ".repeat(3000)}</nav><article>Verified fetched painter page content. ${"article ".repeat(4000)} FULL_SOURCE_TAIL</article></body></html>`,
      { status: 200, headers: { "content-type": "text/html; charset=utf-8" } }
    );
    ReasoningEngine.requestCompletion = async (request: any) => {
      modelCalls += 1;
      assert.ok(String(request.systemPrompt || "").includes("page was actually retrieved"));
      assert.ok(String(request.userPrompt || "").includes("Verified fetched painter page content."));
      assert.ok(String(request.userPrompt || "").includes("Immediate chat excerpt shortened"));
      assert.ok(String(request.userPrompt || "").length < 20_000, "fetched page prompt must fit small local-model contexts");
      assert.ok(!String(request.userPrompt || "").includes("navigation navigation"));
      assert.ok(!String(request.userPrompt || "").includes("FULL_SOURCE_TAIL"), "distant source text should stay out of the bounded immediate prompt");
      return {
        rawResponse: "\u0642\u0631\u0623\u062a \u0627\u0644\u0635\u0641\u062d\u0629 \u0648\u0647\u0630\u0627 \u0645\u0644\u062e\u0635 \u0645\u062d\u062a\u0648\u0627\u0647\u0627."
      } as any;
    };
    const fetchedPageResult = await ChatOrchestratorService.handleDirectChat({
      prompt: "\u0627\u0641\u062a\u062d \u0647\u0630\u0627 \u0627\u0644\u0645\u0648\u0642\u0639 \u0648\u0627\u0642\u0631\u0623 \u0645\u062d\u062a\u0648\u0627\u0647: https://example.com/painter-story",
      workspacePath: workspace,
      projectName: "test-workspace",
      approvalMode: "approve_for_me"
    });
    assert.strictEqual(fetchedPageResult.usedModel, true);
    assert.ok(fetchedPageResult.response.includes("\u0642\u0631\u0623\u062a \u0627\u0644\u0635\u0641\u062d\u0629"));
    const savedUrlSource = path.join(
      workspace,
      ".saad-agent",
      "training",
      "lessons",
      "stories",
      "example.com-painter-story.md"
    );
    const savedUrlText = await fs.readFile(savedUrlSource, "utf8");
    assert.ok(savedUrlText.includes("Verified fetched painter page content."));
    assert.ok(savedUrlText.includes("FULL_SOURCE_TAIL"), "the complete fetched story must be preserved in permanent training storage");
    const urlRegistry = await KnowledgeIngestionService.ingestTrainingKnowledge(workspace);
    const savedUrlRegistryItem = urlRegistry.items.find((item) => item.filePath.endsWith("example.com-painter-story.md"));
    assert.ok((savedUrlRegistryItem?.chunkCount || 0) > 1, "the complete saved story must be indexed into multiple retrievable chunks");
    const tailMatches = await KnowledgeIngestionService.search(workspace, "FULL_SOURCE_TAIL", 12);
    assert.ok(
      tailMatches.some((chunk) => chunk.sourcePath.endsWith("example.com-painter-story.md") && chunk.content.includes("FULL_SOURCE_TAIL")),
      "the distant end of the saved story must remain retrievable from the knowledge index"
    );

    let monitorPageFetched = false;
    globalThis.fetch = async () => {
      monitorPageFetched = true;
      return new Response(
        `<html><head><title>KIE API updates</title></head><body><main><h1>KIE API updates</h1><article>New KIE API update: seedream endpoint changed and webhook retries improved. ${"KIE API changelog details ".repeat(40)}</article></main></body></html>`,
        { status: 200, headers: { "content-type": "text/html; charset=utf-8" } }
      );
    };
    const callsBeforeMonitorUrl = modelCalls;
    ReasoningEngine.requestCompletion = async (request: any) => {
      modelCalls += 1;
      assert.ok(String(request.systemPrompt || "").includes("page was actually retrieved"));
      assert.ok(String(request.userPrompt || "").includes("New KIE API update"));
      return {
        rawResponse: "\u0642\u0631\u0623\u062a \u062a\u062d\u062f\u064a\u062b\u0627\u062a KIE \u0648\u0627\u0633\u062a\u062e\u0631\u062c\u062a \u0627\u0644\u062c\u062f\u064a\u062f."
      } as any;
    };
    const monitorUrlResult = await ChatOrchestratorService.handleDirectChat({
      prompt: "\u0631\u0627\u0642\u0628 \u0647\u0630\u0627 \u0627\u0644\u0645\u0648\u0642\u0639 https://kie.ai/api-updates \u0648\u0642\u0644 \u0644\u064a \u0645\u0627 \u0627\u0644\u062a\u062d\u062f\u064a\u062b\u0627\u062a \u0627\u0644\u062c\u062f\u064a\u062f\u0629",
      workspacePath: workspace,
      projectName: "test-workspace",
      approvalMode: "approve_for_me"
    });
    assert.strictEqual(monitorUrlResult.usedModel, true);
    assert.ok(monitorPageFetched, "monitor/update URL request must fetch the page");
    assert.ok(monitorUrlResult.response.includes("KIE"));
    assert.strictEqual(modelCalls, callsBeforeMonitorUrl + 1, "monitor/update URL request should fetch context then call the model once");
    const monitorUrlSource = path.join(
      workspace,
      ".saad-agent",
      "training",
      "api-docs",
      "kie.ai-api-updates.md"
    );
    const monitorUrlText = await fs.readFile(monitorUrlSource, "utf8");
    assert.ok(monitorUrlText.includes("New KIE API update"));

    globalThis.fetch = async () => {
      throw new Error("fetch failed");
    };
    const callsBeforeFailedMonitorUrl = modelCalls;
    ReasoningEngine.requestCompletion = async () => {
      throw new Error("direct URL read failure must not call the model");
    };
    const failedMonitorUrlResult = await ChatOrchestratorService.handleDirectChat({
      prompt: "\u0631\u0627\u0642\u0628 \u0647\u0630\u0627 \u0627\u0644\u0645\u0648\u0642\u0639 https://kie.ai/api-updates \u0648\u0642\u0644 \u0644\u064a \u0645\u0627 \u0627\u0644\u062a\u062d\u062f\u064a\u062b\u0627\u062a \u0627\u0644\u062c\u062f\u064a\u062f\u0629",
      workspacePath: workspace,
      projectName: "test-workspace",
      approvalMode: "approve_for_me"
    });
    assert.strictEqual(failedMonitorUrlResult.intent, "conversation");
    assert.strictEqual(failedMonitorUrlResult.usedModel, false);
    assert.strictEqual(modelCalls, callsBeforeFailedMonitorUrl, "failed direct URL read must stop before model fallback");
    assert.ok(failedMonitorUrlResult.response.includes("\u0645\u0627 \u0642\u062f\u0631\u062a \u0623\u0642\u0631\u0623 \u0627\u0644\u0631\u0627\u0628\u0637 \u0641\u0639\u0644\u064a\u0627\u064b"));
    assert.ok(failedMonitorUrlResult.response.includes("fetch failed"));
    assert.ok(!failedMonitorUrlResult.response.includes("\u0623\u0647\u0644\u0627\u064b \u0634\u0644\u0648\u0646\u0643"));
    assert.ok(!failedMonitorUrlResult.response.includes("en.cuckold.info"));

    globalThis.fetch = originalFetch;
    ReasoningEngine.requestCompletion = async (...args: Parameters<typeof originalRequestCompletion>) => {
      modelCalls += 1;
      return originalRequestCompletion.apply(ReasoningEngine, args);
    };

    const callsBeforeWeb = modelCalls;
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
    assert.strictEqual(modelCalls, callsBeforeWeb, "web search must not fall back to model guessing");

    const callsBeforeExactIraqiSearch = modelCalls;
    const exactIraqiSearchResult = await ChatOrchestratorService.handleDirectChat({
      prompt: "\u0627\u0631\u064a\u062f \u0631\u0648\u0627\u0628\u0637 \u0644\u062f\u0639\u0645 \u0645\u0648\u0628\u0627\u064a\u0644\u064a \u0627\u0628\u062d\u062b \u0628\u0627\u0644\u0627\u0646\u062a\u0631\u0646\u062a",
      workspacePath: workspace,
      projectName: "test-workspace",
      approvalMode: "approve_for_me"
    });
    assert.strictEqual(exactIraqiSearchResult.intent, "external_research");
    assert.strictEqual(exactIraqiSearchResult.usedModel, false);
    assert.strictEqual(modelCalls, callsBeforeExactIraqiSearch, "explicit Iraqi internet search must use Brave and never call the model");

    const callsBeforeInternetSitesSearch = modelCalls;
    const internetSitesSearchResult = await ChatOrchestratorService.handleDirectChat({
      prompt: "cuckold \u0627\u0631\u064a\u062f \u0645\u0648\u0627\u0642\u0639 \u0645\u0646 \u0627\u0644\u0627\u0646\u062a\u0631\u0646\u062a",
      workspacePath: workspace,
      projectName: "test-workspace",
      approvalMode: "approve_for_me"
    });
    assert.strictEqual(internetSitesSearchResult.intent, "external_research");
    assert.strictEqual(internetSitesSearchResult.usedModel, false);
    assert.strictEqual(modelCalls, callsBeforeInternetSitesSearch, "internet sites requests must use search and never call the model after approval");

    BraveAnswersService.query = async (query: string) => ({
      query,
      answersText: "",
      latencyMs: 12,
      cacheHit: false,
      sources: query.includes("storyboarding comic story page")
        ? [{
            title: "Civitai Comics Tell Your Story Page by Page",
            url: "https://civitai.com/articles/29539/civitai-comics-tell-your-story-page-by-page",
            snippet: "Storyboard and comic story page workflow."
          }]
        : [{
            title: "Civitai Login",
            url: "https://civitai.com/login",
            snippet: "Account login page."
          }]
    });
    const deepSearchPlanResult = await ResearchGatewayService.search(
      "STORYBOARD NSFW \u0627\u0628\u062d\u062b \u0641\u064a \u0647\u0630\u0627 \u0627\u0644\u0645\u0648\u0642\u0639 https://civitai.com/ \u0639\u0646"
    );
    assert.ok(deepSearchPlanResult.plannedQueries.length > 1, "deep search must expand one vague request into multiple planned queries");
    assert.ok(deepSearchPlanResult.plannedQueries.some((query) => query.includes("site:civitai.com")));
    assert.ok(deepSearchPlanResult.plannedQueries.some((query) => query.includes("storyboarding comic story page")));
    assert.ok(deepSearchPlanResult.sources[0]);
    assert.strictEqual(deepSearchPlanResult.sources[0]!.url, "https://civitai.com/articles/29539/civitai-comics-tell-your-story-page-by-page");

    BraveAnswersService.query = async (query: string) => {
      if (query.endsWith("guide")) {
        throw new Error("temporary provider failure for one planned query");
      }
      return {
        query,
        answersText: "",
        latencyMs: 9,
        cacheHit: false,
        sources: query.endsWith("examples")
          ? [{
              title: "Resilient search result",
              url: "https://example.com/resilient-search-result",
              snippet: "A verified result from a later planned query."
            }]
          : []
      };
    };
    const resilientSearchResult = await ResearchGatewayService.search("resilient topic");
    assert.strictEqual(resilientSearchResult.sources[0]?.url, "https://example.com/resilient-search-result");
    assert.strictEqual(resilientSearchResult.failedQueries.length, 1, "one failed planned query should be recorded without aborting the whole search");

    BraveAnswersService.query = async (query: string) => ({
      query,
      answersText: "",
      latencyMs: 10,
      cacheHit: false,
      sources: [
        {
          title: "Generic login",
          url: "https://example.com/login",
          snippet: "Account page."
        },
        {
          title: query.includes("stories") ? "Cuckold Stories Archive" : "Generic support result",
          url: query.includes("stories") ? "https://example.com/stories/cuckold-archive" : "https://example.com/support",
          snippet: query.includes("stories") ? "Curated fiction stories and forum references." : "Support page."
        }
      ]
    });
    const personalDeepSearch = await ResearchGatewayService.search("cuckold \u0627\u0631\u064a\u062f \u0645\u0648\u0627\u0642\u0639 \u0645\u0646 \u0627\u0644\u0627\u0646\u062a\u0631\u0646\u062a");
    assert.ok(personalDeepSearch.plannedQueries.some((query) => query === "cuckold stories"), "personal web requests should expand toward story-specific queries");
    assert.ok(personalDeepSearch.plannedQueries.some((query) => query === "cuckold forum"), "personal web requests should include forum discovery");
    assert.ok(personalDeepSearch.plannedQueries.every((query) => !query.includes("\u0645\u0648\u0627\u0642\u0639") && !query.includes("\u0627\u0644\u0627\u0646\u062a\u0631\u0646\u062a")), "Arabic request wrapper words must not pollute planned queries");
    assert.strictEqual(personalDeepSearch.sources[0]?.url, "https://example.com/stories/cuckold-archive");

    BraveAnswersService.query = originalBraveQuery;

    const agentReachCommands: string[] = [];
    AgentReachProvider.setCommandRunnerForTests(async (command, args) => {
      agentReachCommands.push([command, ...args].join(" "));
      if (command === "where.exe" && args[0] === "mcporter") {
        return { stdout: "C:\\tools\\mcporter.cmd", stderr: "" };
      }
      if (command === "where.exe") {
        throw new Error("not installed");
      }
      if (command === "mcporter") {
        return {
          stdout: JSON.stringify({
            results: [{
              title: "Agent Reach verified result",
              url: "https://agent-reach.example.com/source",
              snippet: "Result returned by the Agent-Reach provider path."
            }]
          }),
          stderr: ""
        };
      }
      throw new Error(`unexpected command ${command}`);
    });
    BraveAnswersService.query = async (query: string) => ({
      query,
      answersText: "",
      latencyMs: 5,
      cacheHit: false,
      sources: [{
        title: "Brave fallback result",
        url: "https://brave.example.com/source",
        snippet: "Fallback result."
      }]
    });
    const agentReachSearch = await ResearchGatewayService.search("agent reach integration test");
    assert.ok(agentReachCommands.some((command) => command.includes("mcporter call exa.web_search_exa")), "ResearchGateway must invoke Agent-Reach-backed Exa before provider fallback");
    assert.strictEqual(agentReachSearch.sources[0]?.provider, "agent-reach");
    assert.strictEqual(agentReachSearch.sources[0]?.url, "https://agent-reach.example.com/source");
    disableOptionalResearchProviders();
    BraveAnswersService.query = originalBraveQuery;

    AgentReachProvider.setCommandRunnerForTests(async (command, args) => {
      if (command === "where.exe" && args[0] === "yt-dlp") {
        return { stdout: "C:\\tools\\yt-dlp.exe", stderr: "" };
      }
      if (command === "where.exe") {
        throw new Error("not installed");
      }
      if (command === "yt-dlp") {
        return {
          stdout: [
            JSON.stringify({
              id: "abc123VIDEO",
              extractor_key: "Youtube",
              title: "Kazem Al Saher official performance",
              webpage_url: "https://www.youtube.com/watch?v=abc123VIDEO",
              thumbnail: "https://i.ytimg.com/vi/abc123VIDEO/hq720.jpg",
              channel: "Kazem Al Saher"
            }),
            JSON.stringify({
              id: "def456VIDEO",
              extractor_key: "Youtube",
              title: "Kazem Al Saher live concert",
              url: "def456VIDEO",
              thumbnail: "https://i.ytimg.com/vi/def456VIDEO/hq720.jpg",
              channel: "Kazem Al Saher"
            })
          ].join("\n"),
          stderr: ""
        };
      }
      throw new Error(`unexpected command ${command}`);
    });
    BraveAnswersService.query = async () => {
      throw new Error("YouTube Agent-Reach parsing test should not need Brave results");
    };
    const youtubeAgentReachSearch = await ResearchGatewayService.search("\u0627\u0631\u064a\u062f \u0641\u064a\u062f\u064a\u0648 \u0643\u0627\u0638\u0645 \u0627\u0644\u0633\u0627\u0647\u0631");
    const youtubeAgentReachText = ResearchGatewayService.formatConciseLinks(youtubeAgentReachSearch);
    assert.ok(youtubeAgentReachText.includes("[Kazem Al Saher official performance](https://www.youtube.com/watch?v=abc123VIDEO)"));
    assert.ok(youtubeAgentReachText.includes("[Kazem Al Saher live concert](https://www.youtube.com/watch?v=def456VIDEO)"));
    assert.ok(!youtubeAgentReachText.includes("hq720.jpg"), "YouTube thumbnails must not be returned as search results");
    assert.ok(!youtubeAgentReachText.includes("[watch]("), "YouTube links must keep useful titles instead of pathname-only labels");
    disableOptionalResearchProviders();
    BraveAnswersService.query = originalBraveQuery;

    const deepResearchCommands: string[] = [];
    DeepResearchProvider.setCommandRunnerForTests(async (command, args) => {
      deepResearchCommands.push([command, ...args].join(" "));
      if (command === "where.exe" && args[0] === "deepsearcher") {
        return { stdout: "C:\\tools\\deepsearcher.cmd", stderr: "" };
      }
      if (command === "where.exe") {
        throw new Error("not installed");
      }
      if (command === "deepsearcher") {
        return {
          stdout: JSON.stringify({
            sources: [{
              title: "DeepSearcher verified result",
              url: "https://deep-searcher.example.com/source",
              snippet: "Result returned by deep-searcher."
            }]
          }),
          stderr: ""
        };
      }
      throw new Error(`unexpected command ${command}`);
    });
    BraveAnswersService.query = async (query: string) => ({
      query,
      answersText: "",
      latencyMs: 5,
      cacheHit: false,
      sources: [{
        title: "Brave fallback result",
        url: "https://brave.example.com/source",
        snippet: "Fallback result."
      }]
    });
    const deepResearchSearch = await ResearchGatewayService.search("deep research integration test");
    assert.ok(deepResearchCommands.some((command) => command.includes("deepsearcher query")), "ResearchGateway must invoke deep-searcher before Brave fallback when installed");
    assert.strictEqual(deepResearchSearch.sources[0]?.provider, "deep-research");
    assert.strictEqual(deepResearchSearch.sources[0]?.url, "https://deep-searcher.example.com/source");
    disableOptionalResearchProviders();
    BraveAnswersService.query = originalBraveQuery;

    SessionSearchProvider.setCommandRunnerForTests(async (command, args) => {
      if (command === "where.exe" && args[0] === "cass") {
        return { stdout: "C:\\tools\\cass.exe", stderr: "" };
      }
      if (command === "cass") {
        return {
          stdout: JSON.stringify({
            hits: [{
              title: "Previous fix session",
              source: "codex/session-123",
              excerpt: "Previous session explains why search routing should not call the model.",
              trust: { trust_tier: "likely" }
            }]
          }),
          stderr: ""
        };
      }
      throw new Error(`unexpected command ${command}`);
    });
    const sessionReview = await PreAnswerReviewService.review("why search routing should not call the model", workspace);
    assert.ok(sessionReview.finalContext.includes("Coding Session History"));
    assert.ok(sessionReview.finalContext.includes("Previous fix session"));
    assert.ok(sessionReview.diagnostics.includes("Session history matches: 1"));
    SessionSearchProvider.setCommandRunnerForTests(null);

    const callsBeforeUrlSiteSearch = modelCalls;
    const urlSiteSearchResult = await ChatOrchestratorService.handleDirectChat({
      prompt: "STORYBOARD NSFW \u0627\u0628\u062d\u062b \u0641\u064a \u0647\u0630\u0627 \u0627\u0644\u0645\u0648\u0642\u0639 https://civitai.com/ \u0639\u0646",
      workspacePath: workspace,
      projectName: "test-workspace",
      approvalMode: "approve_for_me"
    });
    assert.strictEqual(urlSiteSearchResult.intent, "external_research");
    assert.strictEqual(urlSiteSearchResult.usedModel, false);
    assert.ok(!urlSiteSearchResult.response.includes("Trusted Workspace"));
    assert.strictEqual(modelCalls, callsBeforeUrlSiteSearch, "URL-scoped site searches must use external research and never trusted-workspace/model routing");

    const callsBeforeYouTube = modelCalls;
    const youtubeLinksResult = await ChatOrchestratorService.handleDirectChat({
      prompt: "\u0627\u0631\u064a\u062f \u0631\u0648\u0627\u0628\u0637 \u0627\u063a\u0627\u0646\u064a \u0643\u0627\u0638\u0645 \u0627\u0644\u0633\u0627\u0647\u0631 \u0641\u064a \u0627\u0644\u064a\u0648\u062a\u064a\u0648\u0628",
      workspacePath: workspace,
      projectName: "test-workspace",
      approvalMode: "approve_for_me"
    });
    assert.strictEqual(youtubeLinksResult.intent, "external_research");
    assert.strictEqual(youtubeLinksResult.usedModel, false);
    assert.strictEqual(modelCalls, callsBeforeYouTube, "YouTube link requests must use external research instead of the chat model");

    BraveAnswersService.query = async () => {
      throw new Error("empty internet searches must not call the provider");
    };
    const callsBeforeEmptyInternetSearch = modelCalls;
    const emptyInternetSearchResult = await ChatOrchestratorService.handleDirectChat({
      prompt: "\u0627\u0628\u062d\u062b \u0641\u064a \u0627\u0644\u0627\u0646\u062a\u0631\u0646\u062a",
      workspacePath: workspace,
      projectName: "test-workspace",
      approvalMode: "ask"
    });
    assert.strictEqual(emptyInternetSearchResult.intent, "external_research");
    assert.strictEqual(emptyInternetSearchResult.usedModel, false);
    assert.ok(!emptyInternetSearchResult.approvalRequest, "empty internet searches must ask for a topic before approval");
    assert.ok(emptyInternetSearchResult.response.includes("\u062d\u062f\u062f\u0644\u064a \u0634\u0646\u0648 \u0627\u0644\u0645\u0648\u0636\u0648\u0639"));
    assert.strictEqual(modelCalls, callsBeforeEmptyInternetSearch, "empty internet searches must not call the model");
    BraveAnswersService.query = originalBraveQuery;

    BraveAnswersService.queryImages = async (query: string) => ({
      query,
      latencyMs: 11,
      cacheHit: false,
      images: [{
        title: "Storyboard moodboard reference",
        sourcePageUrl: "https://example.com/storyboard-reference",
        imageUrl: "https://images.example.com/storyboard-full.jpg",
        thumbnailUrl: "https://images.example.com/storyboard-thumb.jpg",
        snippet: "A visual storyboard reference."
      }]
    });
    const callsBeforeImageSearch = modelCalls;
    const imageSearchResult = await ChatOrchestratorService.handleDirectChat({
      prompt: "\u0627\u0631\u064a\u062f \u0635\u0648\u0631 \u0645\u0646 \u0627\u0644\u0627\u0646\u062a\u0631\u0646\u062a \u0639\u0646 storyboard moodboard",
      workspacePath: workspace,
      projectName: "test-workspace",
      approvalMode: "approve_for_me"
    });
    assert.strictEqual(imageSearchResult.intent, "external_research");
    assert.strictEqual(imageSearchResult.usedModel, false);
    assert.ok(imageSearchResult.response.includes("![Storyboard moodboard reference](https://images.example.com/storyboard-thumb.jpg)"));
    assert.ok(imageSearchResult.response.includes("[\u0641\u062a\u062d \u0627\u0644\u0635\u0648\u0631\u0629](https://images.example.com/storyboard-full.jpg)"));
    assert.strictEqual(modelCalls, callsBeforeImageSearch, "internet image search must use ResearchGateway image search without the model");

    BraveAnswersService.queryImages = async () => {
      throw new Error("image prompt drafting must not call Brave Image Search");
    };
    const callsBeforeImagePromptDraft = modelCalls;
    const inlineImageGenerationResult = await ChatOrchestratorService.handleDirectChat({
      prompt: "\u0627\u0631\u064a\u062f \u062a\u0635\u0645\u064a\u0645 \u0644\u0648\u0643\u0633 \u0628\u0631\u0648\u0645\u0628\u064a\u062a \u0635\u0648\u0631\u0629 \u0627\u0639\u0631\u0636\u0647\u0627 \u0647\u0646\u0627",
      workspacePath: workspace,
      projectName: "test-workspace",
      approvalMode: "approve_for_me"
    });
    assert.notStrictEqual(inlineImageGenerationResult.intent, "external_research");
    assert.strictEqual(inlineImageGenerationResult.usedModel, false);
    assert.ok(inlineImageGenerationResult.response.includes("\u062a\u0639\u0630\u0631 \u062a\u0648\u0644\u064a\u062f \u0627\u0644\u0635\u0648\u0631\u0629"));
    assert.ok(inlineImageGenerationResult.response.includes("SAAD_AGENT_IMAGE_GENERATION_ENDPOINT") || inlineImageGenerationResult.response.includes("KIE_API_KEY"));
    assert.ok(!inlineImageGenerationResult.response.includes("\u0641\u0647\u0645\u062a\u0643"));
    assert.ok(!inlineImageGenerationResult.response.includes("mock"));
    assert.ok(!inlineImageGenerationResult.response.includes("Luxury editorial image"));
    assert.strictEqual(modelCalls, callsBeforeImagePromptDraft, "inline image generation setup response must not call the model or image search");
    assert.strictEqual(ResearchGatewayService.isImageSearchRequest("\u0627\u0631\u064a\u062f \u062a\u0635\u0645\u064a\u0645 \u0644\u0648\u0643\u0633 \u0628\u0631\u0648\u0645\u0628\u064a\u062a \u0635\u0648\u0631\u0629 \u0627\u0639\u0631\u0636\u0647\u0627 \u0647\u0646\u0627"), false);

    process.env.SAAD_AGENT_IMAGE_GENERATION_ENDPOINT = "https://saad.test/api/panel/generate/image";
    process.env.SAAD_AGENT_IMAGE_MODEL = "nano-banana-pro";
    const fetchBeforeInlineGeneration = globalThis.fetch;
    let inlineGenerationFetchCalled = false;
    globalThis.fetch = async (url: any, init?: any) => {
      inlineGenerationFetchCalled = true;
      assert.strictEqual(String(url), "https://saad.test/api/panel/generate/image");
      const body = JSON.parse(String(init?.body || "{}"));
      assert.ok(String(body.prompt || "").includes("Luxury editorial image"));
      assert.strictEqual(body.modelId, "nano-banana-pro");
      return new Response(JSON.stringify({ imageUrl: "https://cdn.example.com/generated-luxury.png" }), {
        status: 200,
        headers: { "content-type": "application/json" }
      });
    };
    const inlineImageGenerationSuccess = await ChatOrchestratorService.handleDirectChat({
      prompt: "\u0627\u0631\u064a\u062f \u062a\u0635\u0645\u064a\u0645 \u0644\u0648\u0643\u0633 \u0628\u0631\u0648\u0645\u0628\u064a\u062a \u0635\u0648\u0631\u0629 \u0627\u0639\u0631\u0636\u0647\u0627 \u0647\u0646\u0627",
      workspacePath: workspace,
      projectName: "test-workspace",
      approvalMode: "approve_for_me"
    });
    assert.strictEqual(inlineImageGenerationSuccess.usedModel, false);
    assert.ok(inlineGenerationFetchCalled, "configured inline image generation must call the configured image endpoint");
    assert.strictEqual(inlineImageGenerationSuccess.response.trim(), "![\u0627\u0644\u0635\u0648\u0631\u0629 \u0627\u0644\u0646\u0627\u062a\u062c\u0629](https://cdn.example.com/generated-luxury.png)");
    globalThis.fetch = fetchBeforeInlineGeneration;
    delete process.env.SAAD_AGENT_IMAGE_GENERATION_ENDPOINT;
    delete process.env.SAAD_AGENT_IMAGE_MODEL;

    const pureImagePromptDraftResult = await ChatOrchestratorService.handleDirectChat({
      prompt: "\u0627\u0643\u062a\u0628\u0644\u064a \u0628\u0631\u0648\u0645\u0628\u062a \u0635\u0648\u0631\u0629 \u0644\u0648\u0643\u0633",
      workspacePath: workspace,
      projectName: "test-workspace",
      approvalMode: "approve_for_me"
    });
    assert.notStrictEqual(pureImagePromptDraftResult.intent, "external_research");
    assert.strictEqual(pureImagePromptDraftResult.usedModel, false);
    assert.ok(pureImagePromptDraftResult.response.includes("\u0628\u0631\u0648\u0645\u0628\u062a \u062c\u0627\u0647\u0632"));
    assert.ok(pureImagePromptDraftResult.response.includes("Luxury editorial image"));

    const noorImageQueries: string[] = [];
    BraveAnswersService.queryImages = async (query: string) => {
      noorImageQueries.push(query);
      return {
        query,
        latencyMs: 9,
        cacheHit: false,
        images: [{
          title: "Noor Zuhair verified image result",
          sourcePageUrl: "https://example.com/noor-zuhair-source",
          imageUrl: "https://images.example.com/noor-zuhair-full.jpg",
          thumbnailUrl: "https://images.example.com/noor-zuhair-thumb.jpg",
          snippet: "Image result for Noor Zuhair."
        }]
      };
    };
    const callsBeforeNoorImageSearch = modelCalls;
    const noorImageSearchResult = await ChatOrchestratorService.handleDirectChat({
      prompt: "\u0627\u0628\u062d\u062b\u0644\u064a \u0639\u0646 \u0635\u0648\u0631 \u0646\u0648\u0631 \u0632\u0647\u064a\u0631",
      workspacePath: workspace,
      projectName: "test-workspace",
      approvalMode: "approve_for_me",
      sessionId: "noor-image-search-test",
      conversationId: "noor-image-search-test"
    });
    assert.strictEqual(noorImageSearchResult.intent, "external_research");
    assert.strictEqual(noorImageSearchResult.usedModel, false);
    assert.ok(noorImageSearchResult.response.includes("![Noor Zuhair verified image result](https://images.example.com/noor-zuhair-thumb.jpg)"));
    assert.ok(!noorImageSearchResult.response.includes("Trusted Workspaces"));
    assert.ok(noorImageQueries.some((query) => query.includes("\u0646\u0648\u0631") && query.includes("\u0632\u0647\u064a\u0631")));
    assert.ok(!noorImageQueries.some((query) => /^Ù„ÙŠ\s/.test(query)), "Arabic cleanQuery must remove Ø§Ø¨Ø­Ø«Ù„ÙŠ fully and not leave Ù„ÙŠ as a search term");
    assert.strictEqual(modelCalls, callsBeforeNoorImageSearch, "Arabic image search must not call the model");

    noorImageQueries.length = 0;
    const internetFollowUpResult = await ChatOrchestratorService.handleDirectChat({
      prompt: "\u0641\u064a \u0627\u0644\u0627\u0646\u062a\u0631\u0646\u062a",
      workspacePath: workspace,
      projectName: "test-workspace",
      approvalMode: "approve_for_me",
      sessionId: "noor-image-search-test",
      conversationId: "noor-image-search-test"
    });
    assert.strictEqual(internetFollowUpResult.intent, "external_research");
    assert.strictEqual(internetFollowUpResult.usedModel, false);
    assert.ok(internetFollowUpResult.response.includes("Noor Zuhair verified image result"));
    assert.ok(noorImageQueries.some((query) => query.includes("\u0646\u0648\u0631") && query.includes("\u0632\u0647\u064a\u0631")));
    BraveAnswersService.queryImages = originalBraveImageQuery;

    const callsBeforeKnownWebsite = modelCalls;
    const youtubeHomepageResult = await ChatOrchestratorService.handleDirectChat({
      prompt: "\u0627\u0631\u064a\u062f \u0631\u0627\u0628\u0637 \u0645\u0648\u0642\u0639 \u0627\u0644\u064a\u0648\u062a\u064a\u0648\u0628",
      workspacePath: workspace,
      projectName: "test-workspace",
      approvalMode: "ask"
    });
    assert.strictEqual(youtubeHomepageResult.intent, "conversation");
    assert.strictEqual(youtubeHomepageResult.usedModel, false);
    assert.ok(youtubeHomepageResult.response.includes("[\u0641\u062a\u062d YouTube](https://www.youtube.com)"));
    assert.ok(!youtubeHomepageResult.approvalRequest, "known official website links must not request internet approval");
    assert.strictEqual(modelCalls, callsBeforeKnownWebsite, "known official website links must not call the model");

    const callsBeforeTypoYoutubeWebsite = modelCalls;
    const youtubeTypoHomepageResult = await ChatOrchestratorService.handleDirectChat({
      prompt: "\u0627\u0631\u064a\u062f \u0631\u0627\u0628\u0637 \u064a\u0648\u062a\u0648\u064a\u0628",
      workspacePath: workspace,
      projectName: "test-workspace",
      approvalMode: "ask"
    });
    assert.strictEqual(youtubeTypoHomepageResult.intent, "conversation");
    assert.strictEqual(youtubeTypoHomepageResult.usedModel, false);
    assert.ok(youtubeTypoHomepageResult.response.includes("[\u0641\u062a\u062d YouTube](https://www.youtube.com)"));
    assert.ok(!youtubeTypoHomepageResult.approvalRequest, "common Arabic YouTube typo must not request internet approval");
    assert.strictEqual(modelCalls, callsBeforeTypoYoutubeWebsite, "common Arabic YouTube typo must not call the model");

    const callsBeforeCivitaiWebsite = modelCalls;
    const civitaiHomepageResult = await ChatOrchestratorService.handleDirectChat({
      prompt: "\u0627\u0631\u064a\u062f \u0631\u0627\u0628\u0637 \u0645\u0648\u0642\u0639 Civitai",
      workspacePath: workspace,
      projectName: "test-workspace",
      approvalMode: "ask"
    });
    assert.strictEqual(civitaiHomepageResult.intent, "conversation");
    assert.strictEqual(civitaiHomepageResult.usedModel, false);
    assert.ok(civitaiHomepageResult.response.includes("[\u0641\u062a\u062d Civitai](https://civitai.com)"));
    assert.strictEqual(modelCalls, callsBeforeCivitaiWebsite, "known Civitai homepage must not call the model");

    const callsBeforeAdobeWebsite = modelCalls;
    const adobeHomepageResult = await ChatOrchestratorService.handleDirectChat({
      prompt: "\u0627\u0631\u064a\u062f \u0631\u0627\u0628\u0637 \u0645\u0648\u0642\u0639 \u0627\u062f\u0648\u0628\u064a",
      workspacePath: workspace,
      projectName: "test-workspace",
      approvalMode: "ask"
    });
    assert.strictEqual(adobeHomepageResult.intent, "conversation");
    assert.strictEqual(adobeHomepageResult.usedModel, false);
    assert.ok(adobeHomepageResult.response.includes("https://www.adobe.com"));
    assert.strictEqual(modelCalls, callsBeforeAdobeWebsite, "known Adobe homepage must not call the model");

    const callsBeforeFacebookWebsite = modelCalls;
    const facebookHomepageResult = await ChatOrchestratorService.handleDirectChat({
      prompt: "\u0627\u0631\u064a\u062f \u0631\u0627\u0628\u0637 \u0645\u0648\u0642\u0639 \u0641\u064a\u0633 \u0628\u0643",
      workspacePath: workspace,
      projectName: "test-workspace",
      approvalMode: "ask"
    });
    assert.strictEqual(facebookHomepageResult.intent, "conversation");
    assert.strictEqual(facebookHomepageResult.usedModel, false);
    assert.ok(facebookHomepageResult.response.includes("[\u0641\u062a\u062d Facebook](https://www.facebook.com)"));
    assert.strictEqual(modelCalls, callsBeforeFacebookWebsite, "known Facebook homepage typo must not call the model or search provider");

    const instagramQueries: string[] = [];
    BraveAnswersService.query = async (query: string) => {
      instagramQueries.push(query);
      return {
        query,
        answersText: "",
        latencyMs: 7,
        cacheHit: false,
        sources: [{
          title: "Mira Nouri Instagram profile",
          url: "https://www.instagram.com/miranouri/",
          snippet: "Instagram profile result for Mira Nouri."
        }]
      };
    };
    for (const prompt of [
      "\u0627\u0631\u064a\u062f \u0635\u0641\u062d\u0629 \u0627\u0644\u0627\u0646\u0633\u062a\u0643\u0631\u0627\u0645 \u0644 \u0645\u064a\u0631\u0627 \u0627\u0644\u0646\u0648\u0631\u064a",
      "Mira Nouri \u0627\u0631\u064a\u062f \u0627\u0644\u0627\u0646\u0633\u062a\u0643\u0631\u0627\u0645 \u0627\u0644\u062e\u0627\u0635 \u0628"
    ]) {
      const callsBeforeInstagramProfile: number = modelCalls;
      const instagramProfileResult = await ChatOrchestratorService.handleDirectChat({
        prompt,
        workspacePath: workspace,
        projectName: "test-workspace",
        approvalMode: "approve_for_me"
      });
      assert.strictEqual(instagramProfileResult.intent, "external_research");
      assert.strictEqual(instagramProfileResult.usedModel, false);
      assert.ok(instagramProfileResult.response.includes("https://www.instagram.com/miranouri/"));
      assert.ok(!instagramProfileResult.response.includes("pi_exec"));
      assert.ok(!instagramProfileResult.response.includes("Codex runtime"));
      assert.ok(!instagramProfileResult.response.includes("en.cuckold.info"));
      assert.strictEqual(modelCalls, callsBeforeInstagramProfile, "social profile searches must use ResearchGateway without the model");
    }
    assert.ok(instagramQueries.some((query) => /mira|\u0645\u064a\u0631\u0627/i.test(query) && /instagram|\u0627\u0646\u0633\u062a/i.test(query)), "Instagram profile search must keep the person name and platform in planned queries");
    assert.ok(instagramQueries.some((query) => /site:instagram\.com/i.test(query)), "Instagram profile search should include a site-scoped query");
    BraveAnswersService.query = originalBraveQuery;

    const publicPageQueries: string[] = [];
    BraveAnswersService.query = async (query: string) => {
      publicPageQueries.push(query);
      return {
        query,
        answersText: "",
        latencyMs: 6,
        cacheHit: false,
        sources: [{
          title: "Kazem Al Saher official page",
          url: "https://www.kazemalsaher.com/",
          snippet: "Official page for Kazem Al Saher."
        }]
      };
    };
    const callsBeforePublicPageLookup = modelCalls;
    const publicPageLookupResult = await ChatOrchestratorService.handleDirectChat({
      prompt: "\u0627\u0631\u064a\u062f \u0635\u0641\u062d\u0629 \u0643\u0627\u0638\u0645 \u0627\u0644\u0633\u0627\u0647\u0631",
      workspacePath: workspace,
      projectName: "test-workspace",
      approvalMode: "approve_for_me"
    });
    assert.strictEqual(publicPageLookupResult.intent, "external_research");
    assert.strictEqual(publicPageLookupResult.usedModel, false);
    assert.ok(publicPageLookupResult.response.includes("https://www.kazemalsaher.com/"));
    assert.ok(!publicPageLookupResult.approvalRequest);
    assert.ok(!publicPageLookupResult.response.includes("pi_exec"));
    assert.ok(!publicPageLookupResult.response.includes("Codex runtime"));
    assert.ok(publicPageQueries.some((query) => query.includes("\u0643\u0627\u0638\u0645") && query.includes("\u0627\u0644\u0633\u0627\u0647\u0631")));
    assert.ok(publicPageQueries.some((query) => /\b(official|profile|page)\b/i.test(query)), "public page lookup should expand to official/profile/page queries");
    assert.strictEqual(modelCalls, callsBeforePublicPageLookup, "public page lookup must use ResearchGateway without the model or coding runtime");
    BraveAnswersService.query = originalBraveQuery;

    const callsBeforePageCreation = modelCalls;
    const pageCreationResult = await ChatOrchestratorService.handleDirectChat({
      prompt: "\u0627\u0646\u0634\u0626 \u0635\u0641\u062d\u0629 \u0643\u0627\u0638\u0645 \u0627\u0644\u0633\u0627\u0647\u0631",
      workspacePath: workspace,
      projectName: "test-workspace",
      approvalMode: "ask"
    });
    assert.notStrictEqual(pageCreationResult.intent, "external_research");
    assert.ok(pageCreationResult.approvalRequest, "real page creation must remain an engineering approval, not internet search");
    assert.notStrictEqual(pageCreationResult.approvalRequest?.action, "use_internet");
    assert.strictEqual(modelCalls, callsBeforePageCreation, "page creation approval must not call the model before user approval");

    BraveAnswersService.query = async () => {
      throw new Error("generic media/link clarification must not call the search provider");
    };
    for (const prompt of [
      "\u0627\u0631\u064a\u062f \u0631\u0627\u0628\u0637",
      "\u0627\u0631\u064a\u062f \u0635\u0648\u0631\u0629",
      "\u0627\u0631\u064a\u062f \u0641\u064a\u062f\u064a\u0648",
      "\u0627\u0631\u064a\u062f \u0635\u0648\u062a"
    ]) {
      const callsBeforeGenericMedia: number = modelCalls;
      const genericMediaResult = await ChatOrchestratorService.handleDirectChat({
        prompt,
        workspacePath: workspace,
        projectName: "test-workspace",
        approvalMode: "ask"
      });
      assert.strictEqual(genericMediaResult.intent, "external_research");
      assert.strictEqual(genericMediaResult.usedModel, false);
      assert.ok(!genericMediaResult.approvalRequest, "generic media/link requests must ask for a topic before approval");
      assert.ok(genericMediaResult.response.includes("\u062d\u062f\u062f\u0644\u064a"));
      assert.strictEqual(modelCalls, callsBeforeGenericMedia, "generic media/link clarification must not call the model");
    }

    const videoQueries: string[] = [];
    BraveAnswersService.query = async (query: string) => {
      videoQueries.push(query);
      return {
        query,
        answersText: "",
        latencyMs: 8,
        cacheHit: false,
        sources: [{
          title: "Kazem Al Saher official video",
          url: "https://www.youtube.com/watch?v=test",
          snippet: "Video result for Kazem Al Saher."
        }]
      };
    };
    const callsBeforeVideoSearch = modelCalls;
    const videoSearchResult = await ChatOrchestratorService.handleDirectChat({
      prompt: "\u0627\u0631\u064a\u062f \u0641\u064a\u062f\u064a\u0648 \u0643\u0627\u0638\u0645 \u0627\u0644\u0633\u0627\u0647\u0631",
      workspacePath: workspace,
      projectName: "test-workspace",
      approvalMode: "approve_for_me"
    });
    assert.strictEqual(videoSearchResult.intent, "external_research");
    assert.strictEqual(videoSearchResult.usedModel, false);
    assert.ok(videoSearchResult.response.includes("https://www.youtube.com/watch?v=test"));
    assert.ok(videoQueries.some((query) => query.includes("\u0643\u0627\u0638\u0645") && query.includes("\u0627\u0644\u0633\u0627\u0647\u0631")));
    assert.ok(videoQueries.some((query) => /\b(video|youtube|clip)\b/i.test(query)));
    assert.ok(!videoQueries.some((query) => query.trim() === "\u0641\u064a\u062f\u064a\u0648"));
    assert.strictEqual(modelCalls, callsBeforeVideoSearch, "video search must use ResearchGateway without the model");
    BraveAnswersService.query = originalBraveQuery;

    const attachmentSource = path.join(workspace, "uploaded-reference.md");
    await fs.writeFile(attachmentSource, "Attachment rule: saved files must become permanent training references.", "utf8");
    const callsBeforeAttachmentSave = modelCalls;
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
    assert.strictEqual(modelCalls, callsBeforeAttachmentSave, "attachment save must not call the model");

    const registry = await KnowledgeIngestionService.ingestTrainingKnowledge(workspace);
    assert.ok(
      registry.items.some((item) => item.filePath.endsWith(".saad-agent/training/lessons/uploaded-reference.md")),
      "saved attachment was not registered as training knowledge"
    );

    const pdfSource = path.join(workspace, "training-story.pdf");
    const pdfText = "Saad PDF extraction lesson: full document text should become searchable training knowledge.";
    const compressedPdfStream = zlib.deflateSync(Buffer.from(`BT (${pdfText}) Tj ET`, "latin1"));
    const pdfHeader = Buffer.from(`%PDF-1.4\n1 0 obj\n<< /Length ${compressedPdfStream.length} /Filter /FlateDecode >>\nstream\n`, "latin1");
    const pdfFooter = Buffer.from("\nendstream\nendobj\ntrailer\n<<>>\n%%EOF", "latin1");
    await fs.writeFile(pdfSource, Buffer.concat([pdfHeader, compressedPdfStream, pdfFooter]));
    await KnowledgeIngestionService.importAttachmentsAsTraining(workspace, [{
      id: "att-test-pdf",
      filename: "training-story.pdf",
      mimeType: "application/pdf",
      size: compressedPdfStream.length,
      localPath: pdfSource,
      previewPath: pdfSource,
      source: "upload",
      timestamp: Date.now(),
      workspaceId: "test-workspace"
    }]);
    const pdfMatches = await KnowledgeIngestionService.searchTrainingKnowledge(workspace, "PDF extraction searchable training knowledge", 3);
    assert.ok(
      pdfMatches.some((match) => match.item.fileName === "training-story.pdf" && match.chunks.some((chunk) => chunk.content.includes("full document text"))),
      "PDF attachment text was not extracted and indexed as searchable training knowledge"
    );

    const callsBeforeTranslation = modelCalls;
    ReasoningEngine.requestCompletion = async (request: any) => {
      modelCalls += 1;
      assert.ok(String(request.systemPrompt || "").includes("translation task"));
      assert.ok(String(request.systemPrompt || "").includes("Iraqi Arabic"));
      assert.ok(!String(request.userPrompt || "").includes("Trained knowledge matches:"));
      return {
        rawResponse: "\u0647\u0627\u064a \u062a\u0631\u062c\u0645\u0629 \u0639\u0631\u0627\u0642\u064a\u0629 \u0648\u0627\u0636\u062d\u0629 \u0644\u0644\u0646\u0635 \u0627\u0644\u0645\u0637\u0644\u0648\u0628 \u0628\u062f\u0648\u0646 \u0639\u0631\u0636 \u0627\u0644\u0645\u0631\u0627\u062c\u0639 \u0627\u0644\u062e\u0627\u0645."
      } as any;
    };
    const translationResult = await ChatOrchestratorService.handleDirectChat({
      prompt: "\u062a\u0631\u062c\u0645 Attachment rule \u0644\u0644\u0639\u0631\u0628\u064a",
      workspacePath: workspace,
      projectName: "test-workspace",
      approvalMode: "approve_for_me"
    });
    assert.strictEqual(translationResult.intent, "translation");
    assert.strictEqual(translationResult.usedModel, true);
    assert.strictEqual(modelCalls, callsBeforeTranslation + 1, "translation must call the model once");
    assert.ok(translationResult.response.includes("\u062a\u0631\u062c\u0645\u0629 \u0639\u0631\u0627\u0642\u064a\u0629"));
    assert.ok(!translationResult.response.includes("Matched content"));
    assert.ok(!translationResult.response.includes("Trained knowledge matches"));

    console.log("Chat orchestrator memory_save no-model test passed.");
    console.log("Chat orchestrator memory_recall concise no-model test passed.");
    console.log("Chat orchestrator short Iraqi memory recall no-model test passed.");
    console.log("Conversational pre-answer memory retrieval test passed.");
    console.log("Conversational pre-answer skill loading test passed.");
    console.log("Chat orchestrator casual thanks no-model test passed.");
    console.log("Chat orchestrator fetched URL context routing test passed.");
    console.log("Chat orchestrator external_research no-model/no-guessing test passed.");
    console.log("Chat orchestrator exact Iraqi internet-search routing test passed.");
    console.log("Chat orchestrator internet-sites after-approval no-model test passed.");
    console.log("Research gateway query-expansion and reranking test passed.");
    console.log("Research gateway Agent-Reach provider integration test passed.");
    console.log("Research gateway partial-failure resilience test passed.");
    console.log("Chat orchestrator URL-scoped site search routing test passed.");
    console.log("Chat orchestrator Arabic YouTube links routing test passed.");
    console.log("Chat orchestrator known YouTube homepage direct-link test passed.");
    console.log("Chat orchestrator known Adobe homepage direct-link test passed.");
    console.log("Chat orchestrator attachment-to-training no-model test passed.");
    console.log("Knowledge ingestion PDF extraction indexing test passed.");
    console.log("Chat orchestrator translation uses Iraqi Arabic model path test passed.");
  } finally {
    ReasoningEngine.requestCompletion = originalRequestCompletion;
    BraveAnswersService.query = originalBraveQuery;
    BraveAnswersService.queryImages = originalBraveImageQuery;
    for (const [key, value] of Object.entries(originalResearchEnv)) {
      if (typeof value === "undefined") {
        delete process.env[key];
      } else {
        process.env[key] = value;
      }
    }
    for (const [key, value] of Object.entries(originalCreativeEnv)) {
      if (typeof value === "undefined") {
        delete process.env[key];
      } else {
        process.env[key] = value;
      }
    }
    AgentReachProvider.setCommandRunnerForTests(null);
    DeepResearchProvider.setCommandRunnerForTests(null);
    SessionSearchProvider.setCommandRunnerForTests(null);
    await fs.rm(workspace, { recursive: true, force: true });
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
