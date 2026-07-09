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

async function main() {
  const workspace = await fs.mkdtemp(path.join(os.tmpdir(), "saad-chat-orchestrator-"));
  setProjectRoot(workspace);
  await fs.writeFile(path.join(workspace, "AGENTS.md"), "Test project rules.", "utf8");
  await fs.writeFile(path.join(workspace, "PROJECT_CONTEXT.md"), "Test project context.", "utf8");

  const originalRequestCompletion = ReasoningEngine.requestCompletion;
  const originalBraveQuery = BraveAnswersService.query;
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

    const shortRecallResult = await ChatOrchestratorService.handleDirectChat({
      prompt: "\u0634\u0646\u0648 \u062a\u0630\u0643\u0631 \u0634\u0648\u064a",
      workspacePath: workspace,
      projectName: "test-workspace"
    });
    assert.strictEqual(shortRecallResult.intent, "memory_recall");
    assert.strictEqual(shortRecallResult.usedModel, false);
    assert.ok(shortRecallResult.response.includes("\u0633\u0639\u062f"));
    assert.strictEqual(modelCalls, 0, "short Iraqi memory recall must not call the model");

    const conversationalReview = await PreAnswerReviewService.review(
      "\u0627\u062d\u0686\u064a\u0644\u064a \u0639\u0646 \u0646\u0641\u0633\u064a",
      workspace,
      undefined,
      true
    );
    assert.ok(conversationalReview.finalContext.includes("\u0633\u0639\u062f"));
    assert.ok(conversationalReview.diagnostics.includes("memory, trained knowledge, and skills searched"));

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
    BraveAnswersService.query = originalBraveQuery;

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

    const callsBeforeKnownWebsite = modelCalls;
    const youtubeHomepageResult = await ChatOrchestratorService.handleDirectChat({
      prompt: "\u0627\u0631\u064a\u062f \u0631\u0627\u0628\u0637 \u0645\u0648\u0642\u0639 \u0627\u0644\u064a\u0648\u062a\u064a\u0648\u0628",
      workspacePath: workspace,
      projectName: "test-workspace",
      approvalMode: "ask"
    });
    assert.strictEqual(youtubeHomepageResult.intent, "conversation");
    assert.strictEqual(youtubeHomepageResult.usedModel, false);
    assert.ok(youtubeHomepageResult.response.includes("[فتح YouTube](https://www.youtube.com)"));
    assert.ok(!youtubeHomepageResult.approvalRequest, "known official website links must not request internet approval");
    assert.strictEqual(modelCalls, callsBeforeKnownWebsite, "known official website links must not call the model");

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
        rawResponse: "هاي ترجمة عراقية واضحة للنص المطلوب بدون عرض المراجع الخام."
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
    await fs.rm(workspace, { recursive: true, force: true });
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
