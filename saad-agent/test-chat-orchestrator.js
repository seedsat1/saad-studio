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
import { CodexRuntimeBridge } from "./platform/services/codex-runtime-bridge.js";
import { TrustedWorkspaceRuntime } from "./platform/services/trusted-workspace-runtime.js";
async function main() {
    const workspace = await fs.mkdtemp(path.join(os.tmpdir(), "saad-chat-orchestrator-"));
    setProjectRoot(workspace);
    await fs.writeFile(path.join(workspace, "AGENTS.md"), "Test project rules.", "utf8");
    await fs.writeFile(path.join(workspace, "PROJECT_CONTEXT.md"), "Test project context.", "utf8");
    await fs.writeFile(path.join(workspace, "index.html"), "<!doctype html><html><head><title>Test</title><meta name=\"viewport\" content=\"width=device-width, initial-scale=1\"></head><body><script src=\"script.js\"></script></body></html>", "utf8");
    await fs.writeFile(path.join(workspace, "script.js"), "const ready = true;\n", "utf8");
    await fs.writeFile(path.join(workspace, "styles.css"), "body { margin: 0; }\n@media (max-width: 760px) { body { padding: 12px; } }\n", "utf8");
    assert.strictEqual(TrustedWorkspaceRuntime.isReferenceOnlyPath("E:\\Agent-Reach-main\\claude-code"), true, "Claude Code reference folder must be recognized as read-only reference material");
    assert.strictEqual(TrustedWorkspaceRuntime.isReferenceOnlyPath("E:\\موقع ثاني\\next14 ai saas\\next14-ai-saas-main\\next14-ai-saas-main\\saad-agent\\release-production-v4\\win-unpacked\\DEZ"), true, "DEZ design folder must be recognized as read-only reference material");
    {
        const promptWithReferenceAndTarget = [
            `اختبار تصميم: صمم صفحة SaaS / AI Studio داخل ${workspace}.`,
            "استخدم مراجع التصميم المحلية من DEZ عبر DESIGN_REFERENCE_MANIFEST.json.",
            "واستخدم E:\\Agent-Reach-main\\claude-code كمرجع أسلوب فقط، لا كمسار تنفيذ."
        ].join("\n");
        const resolvedWorkspace = await ChatOrchestratorService.resolveWorkspaceFromPrompt(promptWithReferenceAndTarget, "E:\\Agent-Reach-main\\claude-code");
        assert.strictEqual(path.resolve(resolvedWorkspace), path.resolve(workspace), "Explicit target workspace must win over read-only Claude Code reference and unsafe fallback");
    }
    {
        const originalCodexRunTaskForTaskLedger = CodexRuntimeBridge.runTask;
        const targetOne = path.join(workspace, "landing-one");
        const targetTwo = path.join(workspace, "landing-two");
        await fs.mkdir(targetOne, { recursive: true });
        await fs.mkdir(targetTwo, { recursive: true });
        let firstRuntimePrompt = "";
        let secondRuntimePrompt = "";
        let callCount = 0;
        CodexRuntimeBridge.runTask = async (request) => {
            callCount += 1;
            if (callCount === 1) {
                firstRuntimePrompt = String(request.prompt || "");
            }
            else {
                secondRuntimePrompt = String(request.prompt || "");
            }
            return {
                success: true,
                stdout: "DEZ files inspected: DESIGN_REFERENCE_MANIFEST.json; DEZ/reference/landing.tsx\nFiles touched: index.html",
                stderr: "",
                command: "pi",
                args: ["exec"],
                cwd: request.workspacePath
            };
        };
        const fullDesignRequest = [
            `Design a SaaS / AI Studio page inside ${targetOne}.`,
            "Use DEZ through DESIGN_REFERENCE_MANIFEST.json as a local design reference.",
            "Use E:\\Agent-Reach-main\\claude-code as read-only architecture reference only.",
            "The page must include navbar, Choose your studio cards, Built for real outputs, responsive layout, and no RTL."
        ].join("\n");
        const firstLedgerResult = await ChatOrchestratorService.handleDirectChat({
            prompt: fullDesignRequest,
            workspacePath: workspace,
            projectName: "test-workspace",
            sessionId: "task-ledger-followup-test",
            conversationId: "task-ledger-followup-test",
            approvalMode: "approve_for_me",
            approved: true
        });
        assert.strictEqual(firstLedgerResult.usedModel, false);
        assert.ok(firstRuntimePrompt.includes("SAAD TASK LEDGER:"), "engineering runtime prompt must include task ledger");
        assert.ok(firstRuntimePrompt.includes(`Target workspace: ${targetOne}`), "task ledger must record the first explicit target workspace");
        assert.ok(firstRuntimePrompt.includes("Reference paths: E:\\Agent-Reach-main\\claude-code"), "task ledger must record read-only reference paths");
        const followUpResult = await ChatOrchestratorService.handleDirectChat({
            prompt: `ضع نفس الصفحة هنا ${targetTwo}`,
            workspacePath: workspace,
            projectName: "test-workspace",
            sessionId: "task-ledger-followup-test",
            conversationId: "task-ledger-followup-test",
            approvalMode: "approve_for_me",
            approved: true
        });
        assert.strictEqual(followUpResult.usedModel, false);
        assert.ok(secondRuntimePrompt.includes("FOLLOW-UP TARGET UPDATE"), "short path follow-up must preserve the previous full task");
        assert.ok(secondRuntimePrompt.includes("Choose your studio cards"), "short path follow-up must keep original design requirements");
        assert.ok(secondRuntimePrompt.includes(`Target workspace: ${targetTwo}`), "task ledger must update to the new explicit target workspace");
        CodexRuntimeBridge.runTask = originalCodexRunTaskForTaskLedger;
    }
    const trainingLessonsDir = path.join(workspace, ".saad-agent", "training", "lessons");
    await fs.mkdir(trainingLessonsDir, { recursive: true });
    await fs.writeFile(path.join(trainingLessonsDir, "countries-capitals-continents-ar-en-clean.txt"), [
        "#\t\u0627\u0644\u062f\u0648\u0644\u0629 (Arabic)\tCountry (English)\t\u0627\u0644\u0639\u0627\u0635\u0645\u0629 (Arabic)\tCapital (English)\t\u0627\u0644\u0642\u0627\u0631\u0629 (Arabic)\tContinent (English)",
        "1\t\u0627\u0644\u0635\u064a\u0646\tChina\t\u0628\u0643\u064a\u0646\tBeijing\t\u0622\u0633\u064a\u0627\tAsia",
        "2\t\u0641\u0631\u0646\u0633\u0627\tFrance\t\u0628\u0627\u0631\u064a\u0633\tParis\t\u0623\u0648\u0631\u0648\u0628\u0627\tEurope",
        "3\t\u0627\u0644\u064a\u0627\u0628\u0627\u0646\tJapan\t\u0637\u0648\u0643\u064a\u0648\tTokyo\t\u0622\u0633\u064a\u0627\tAsia",
        "4\t\u0627\u0644\u0639\u0631\u0627\u0642\tIraq\t\u0628\u063a\u062f\u0627\u062f\tBaghdad\t\u0622\u0633\u064a\u0627\tAsia"
    ].join("\n"), "utf8");
    await fs.writeFile(path.join(trainingLessonsDir, "countries-capitals-currencies-ar-en.txt"), [
        "\u0627\u0644\u062f\u0648\u0644\u0629 (Arabic)\tCountry (English)\t\u0627\u0644\u0639\u0627\u0635\u0645\u0629 (Arabic)\tCapital (English)\t\u0627\u0644\u0639\u0645\u0644\u0629 (Arabic)\tCurrency (English)",
        "\u0627\u0644\u0635\u064a\u0646\tChina\t\u0628\u0643\u064a\u0646\tBeijing\t\u0627\u0644\u064a\u0648\u0627\u0646 \u0627\u0644\u0635\u064a\u0646\u064a\tChinese Yuan",
        "\u0641\u0631\u0646\u0633\u0627\tFrance\t\u0628\u0627\u0631\u064a\u0633\tParis\t\u0627\u0644\u064a\u0648\u0631\u0648\tEuro",
        "\u0627\u0644\u064a\u0627\u0628\u0627\u0646\tJapan\t\u0637\u0648\u0643\u064a\u0648\tTokyo\t\u0627\u0644\u064a\u0646 \u0627\u0644\u064a\u0627\u0628\u0627\u0646\u064a\tJapanese Yen",
        "\u0627\u0644\u0639\u0631\u0627\u0642\tIraq\t\u0628\u063a\u062f\u0627\u062f\tBaghdad\t\u0627\u0644\u062f\u064a\u0646\u0627\u0631 \u0627\u0644\u0639\u0631\u0627\u0642\u064a\tIraqi Dinar"
    ].join("\n"), "utf8");
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
    ReasoningEngine.requestCompletion = async (...args) => {
        modelCalls += 1;
        return originalRequestCompletion.apply(ReasoningEngine, args);
    };
    try {
        const agentReferences = await TrustedWorkspaceRuntime.loadAgentReferences(workspace);
        const designReference = agentReferences.find((reference) => reference.path.endsWith("DESIGN_REFERENCE_INDEX.md"));
        assert.ok(designReference?.loaded, "Design reference index should be loaded for engineering context.");
        assert.ok(/DEZ/.test(designReference.content || "") && /landing/i.test(designReference.content || "") && /dashboard/i.test(designReference.content || ""), "Design reference index should describe the DEZ landing/dashboard reference map.");
        const designManifest = agentReferences.find((reference) => reference.path.endsWith("DESIGN_REFERENCE_MANIFEST.json"));
        assert.ok(designManifest?.loaded, "Design reference manifest should be loaded for engineering context.");
        assert.ok(/authoritative file-level source|Indexed files|Absolute DEZ root/i.test(designManifest.content || ""), "Design reference manifest should expose the authoritative DEZ file-level inventory summary.");
        const claudeReference = agentReferences.find((reference) => reference.path.endsWith("CLAUDE_CODE_REFERENCE_INDEX.md"));
        assert.ok(claudeReference?.loaded, "Claude Code reference index should be loaded for engineering context.");
        assert.ok(/read-only comparative architecture reference|Claude-code files inspected/i.test(claudeReference.content || ""), "Claude Code reference index should expose the read-only evidence rule.");
        const claudeManifest = agentReferences.find((reference) => reference.path.endsWith("CLAUDE_CODE_REFERENCE_MANIFEST.json"));
        assert.ok(claudeManifest?.loaded, "Claude Code reference manifest should be loaded for engineering context.");
        assert.ok(/authoritative file-level source|Indexed files|Absolute reference root/i.test(claudeManifest.content || ""), "Claude Code reference manifest should expose the authoritative file-level inventory summary.");
        const routingCases = [
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
                prompt: [
                    "لا تعتمد على أي رسالة سابقة. اشتغل فقط داخل:",
                    path.join(workspace, "lang"),
                    "",
                    "استخدم الصور الموجودة هنا:",
                    path.join(workspace, "lang", "New folder"),
                    "",
                    "صمم صفحة HTML/CSS/JS تشبه الصورة المرفقة: SAAD STUDIO داكنة وفخمة، Navbar، Hero كبير، Sidebar AI Tools، شبكة منتجات 3 أعمدة.",
                    "أنشئ أو عدّل فقط: index.html styles.css script.js",
                    "لا تولد صور جديدة، اربط الصور المحلية داخل الصفحة."
                ].join("\n"),
                kind: "engineering_modify",
                intent: "code_modification",
                requiresModel: true
            },
            {
                prompt: "\u0627\u0643\u062a\u0628\u0644\u064a \u0628\u0631\u0648\u0645\u0628\u062a \u0635\u0648\u0631\u0629 \u0644\u0648\u0643\u0633",
                kind: "image_prompt_draft",
                intent: "conversation",
                requiresModel: false
            },
            {
                prompt: "\u0627\u0639\u0645\u0644 \u0643\u0645\u0647\u0646\u062f\u0633 \u0627\u0644\u0635\u064a\u0627\u0646\u0629 \u0627\u0644\u064a\u0648\u0645\u064a\u0629 \u0644\u0645\u0648\u0642\u0639\u064a: \u0627\u0641\u062d\u0635 \u0627\u0644\u0645\u0634\u0631\u0648\u0639 \u0648\u062d\u0633\u0646 \u0627\u0644\u062a\u0635\u0645\u064a\u0645 \u0648\u0627\u0635\u0644\u062d \u0627\u0644\u0623\u062e\u0637\u0627\u0621",
                kind: "engineering_modify",
                intent: "code_modification",
                requiresModel: true
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
        const dailyEngineerReviewRoute = RequestRoutingService.classify("\u0627\u0646\u062a \u0645\u0647\u0646\u062f\u0633 \u0627\u0644\u0635\u064a\u0627\u0646\u0629 \u0627\u0644\u064a\u0648\u0645\u064a\u0629 \u0644\u0645\u0648\u0642\u0639\u064a. \u0631\u0627\u062c\u0639 \u0627\u0644\u0645\u0634\u0631\u0648\u0639 \u0641\u0642\u0637 \u0648\u0644\u0627 \u062a\u0639\u062f\u0644.");
        assert.strictEqual(dailyEngineerReviewRoute.kind, "engineering_review");
        assert.strictEqual(dailyEngineerReviewRoute.intent, "code_review");
        assert.strictEqual(dailyEngineerReviewRoute.pipeline, "daily_maintenance.review");
        assert.ok(dailyEngineerReviewRoute.tools.includes("DailyEngineerService"));
        assert.strictEqual(dailyEngineerReviewRoute.requiresModel, false);
        assert.strictEqual(dailyEngineerReviewRoute.allowsTrainingFallback, false);
        const requestCompletionBeforeReadOnlyMaintenance = ReasoningEngine.requestCompletion;
        let readOnlyMaintenanceModelCalls = 0;
        ReasoningEngine.requestCompletion = async () => {
            readOnlyMaintenanceModelCalls += 1;
            throw new Error("daily maintenance read-only inspection must not call the model");
        };
        try {
            const readOnlyMaintenanceResult = await ChatOrchestratorService.handleDirectChat({
                prompt: "\u0643\u0645\u0647\u0646\u062f\u0633 \u0635\u064a\u0627\u0646\u0629 \u064a\u0648\u0645\u064a \u0627\u0641\u062d\u0635 \u0645\u0644\u0641\u0627\u062a \u0627\u0644\u0645\u0634\u0631\u0648\u0639 \u0641\u0639\u0644\u064a\u0627 \u0628\u0627\u0633\u062a\u062e\u062f\u0627\u0645 \u0623\u062f\u0648\u0627\u062a \u0627\u0644\u0642\u0631\u0627\u0621\u0629 \u0641\u0642\u0637. \u0644\u0627 \u062a\u0639\u062f\u0644 \u0623\u064a \u0645\u0644\u0641. \u0627\u0630\u0643\u0631 \u0623\u0633\u0645\u0627\u0621 \u0627\u0644\u0645\u0644\u0641\u0627\u062a \u0627\u0644\u062a\u064a \u0642\u0631\u0623\u062a\u0647\u0627\u060c \u062b\u0645 \u0623\u0639\u0637\u0646\u064a \u062a\u0642\u0631\u064a\u0631 \u0645\u062e\u062a\u0635\u0631 \u0645\u0646 5 \u0623\u0633\u0637\u0631.",
                workspacePath: workspace,
                projectName: "test-workspace",
                approvalMode: "approve_for_me",
                sessionId: "daily-maintenance-read-only-inspection-test"
            });
            assert.strictEqual(readOnlyMaintenanceResult.intent, "code_review");
            assert.strictEqual(readOnlyMaintenanceResult.usedModel, false);
            assert.strictEqual(readOnlyMaintenanceModelCalls, 0);
            assert.ok(readOnlyMaintenanceResult.response.includes("index.html"));
            assert.ok(readOnlyMaintenanceResult.response.includes("script.js") || readOnlyMaintenanceResult.response.includes("styles.css"));
            assert.ok(readOnlyMaintenanceResult.response.includes("0"));
            assert.ok(!readOnlyMaintenanceResult.response.includes("PROHIBITED_CONTENT"));
        }
        finally {
            ReasoningEngine.requestCompletion = requestCompletionBeforeReadOnlyMaintenance;
        }
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
            return { rawResponse: "\u062a\u0642\u0631\u064a\u0631 \u0641\u062d\u0635 \u0627\u0644\u0645\u0634\u0631\u0648\u0639: \u0644\u0645 \u064a\u062a\u0645 \u062a\u0639\u062f\u064a\u0644 \u0623\u064a \u0645\u0644\u0641." };
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
        }
        finally {
            ReasoningEngine.requestCompletion = requestCompletionBeforeProjectAudit;
        }
        const dailyMaintenanceApprovalResult = await ChatOrchestratorService.handleDirectChat({
            prompt: "\u0627\u0639\u0645\u0644 \u0643\u0645\u0647\u0646\u062f\u0633 \u0627\u0644\u0635\u064a\u0627\u0646\u0629 \u0627\u0644\u064a\u0648\u0645\u064a\u0629 \u0644\u0645\u0648\u0642\u0639\u064a: \u0627\u0641\u062d\u0635 \u0627\u0644\u0645\u0634\u0631\u0648\u0639 \u0648\u062d\u0633\u0646 \u0627\u0644\u062a\u0635\u0645\u064a\u0645 \u0648\u0627\u0635\u0644\u062d \u0627\u0644\u0623\u062e\u0637\u0627\u0621",
            workspacePath: workspace,
            projectName: "test-workspace",
            approvalMode: "ask",
            sessionId: "daily-maintenance-approval-test"
        });
        assert.strictEqual(dailyMaintenanceApprovalResult.intent, "code_generation");
        assert.strictEqual(dailyMaintenanceApprovalResult.usedModel, false);
        assert.ok(dailyMaintenanceApprovalResult.approvalRequest, "daily maintenance modification must require approval in ask mode");
        assert.ok(dailyMaintenanceApprovalResult.response.includes("Daily Maintenance Engineer"));
        const dailyMaintenanceNegatedInstallPrompt = [
            "كمهندس صيانة يومي افحص المشروع، وإذا وجدت مشكلة بسيطة في التصميم أو التجاوب أصلحها مباشرة بعد موافقتي الأولى.",
            "لا تعمل أشياء كبيرة ولا تثبت مكتبات ولا تحذف ملفات."
        ].join(" ");
        const dailyMaintenanceNegatedInstallResult = await ChatOrchestratorService.handleDirectChat({
            prompt: dailyMaintenanceNegatedInstallPrompt,
            workspacePath: workspace,
            projectName: "test-workspace",
            approvalMode: "ask",
            sessionId: "daily-maintenance-negated-install-test"
        });
        assert.notStrictEqual(dailyMaintenanceNegatedInstallResult.intent, "memory_save");
        assert.strictEqual(dailyMaintenanceNegatedInstallResult.intent, "code_generation");
        assert.strictEqual(dailyMaintenanceNegatedInstallResult.usedModel, false);
        assert.ok(dailyMaintenanceNegatedInstallResult.approvalRequest, "daily maintenance prompt with negated install/delete wording must still require approval");
        assert.ok(!dailyMaintenanceNegatedInstallResult.response.includes("Memory ID"));
        const rawRuntimeErrorBefore = ReasoningEngine.requestCompletion;
        ReasoningEngine.requestCompletion = async () => ({
            rawResponse: "{\"error\":{\"type\":\"llm_call_failed\",\"message\":\"{\\\"message\\\":\\\"Operation not allowed\\\"}\\n\"}}"
        });
        try {
            const rawRuntimeErrorResult = await ChatOrchestratorService.handleDirectChat({
                prompt: "\u0627\u0643\u062a\u0628 \u062c\u0645\u0644\u0629 \u0642\u0635\u064a\u0631\u0629 \u0639\u0646 \u0627\u062e\u062a\u0628\u0627\u0631 \u0627\u0644\u0645\u0648\u062f\u064a\u0644 \u0627\u0644\u0645\u062d\u0644\u064a",
                workspacePath: workspace,
                projectName: "test-workspace",
                approvalMode: "approve_for_me",
                sessionId: "raw-runtime-error-format-test"
            });
            assert.ok(rawRuntimeErrorResult.response.includes("\u062a\u0648\u0642\u0641\u062a \u0645\u0647\u0645\u0629 \u0627\u0644\u0635\u064a\u0627\u0646\u0629"));
            assert.ok(rawRuntimeErrorResult.response.includes("Operation not allowed"));
            assert.ok(rawRuntimeErrorResult.response.includes("Saad Local Direct"));
            assert.ok(!rawRuntimeErrorResult.response.trim().startsWith("{\"error\""), "raw llm_call_failed JSON must not be shown directly");
        }
        finally {
            ReasoningEngine.requestCompletion = rawRuntimeErrorBefore;
        }
        const dailyMaintenanceManualApprovalOverrideResult = await ChatOrchestratorService.handleDirectChat({
            prompt: dailyMaintenanceNegatedInstallPrompt,
            workspacePath: workspace,
            projectName: "test-workspace",
            approvalMode: "approve_for_me",
            sessionId: "daily-maintenance-manual-approval-override-test"
        });
        assert.notStrictEqual(dailyMaintenanceManualApprovalOverrideResult.intent, "memory_save");
        assert.strictEqual(dailyMaintenanceManualApprovalOverrideResult.intent, "code_generation");
        assert.strictEqual(dailyMaintenanceManualApprovalOverrideResult.usedModel, false);
        assert.ok(dailyMaintenanceManualApprovalOverrideResult.approvalRequest, "daily maintenance wording that says after my approval must force a manual approval gate");
        assert.ok(!dailyMaintenanceManualApprovalOverrideResult.response.includes("Inspection Plan"));
        const originalCodexRunTask = CodexRuntimeBridge.runTask;
        ConversationStateEngine.updateState("daily-maintenance-approval-test", {
            activeWorkflow: null,
            activeTask: undefined
        });
        CodexRuntimeBridge.runTask = async (request) => {
            assert.ok(request.approved, "phase-two continuation must carry explicit approval into the runtime bridge");
            assert.ok(request.prompt.includes("SAAD AGENT LOOP PREFLIGHT OBSERVATIONS"), "phase-two runtime prompt must include agent-loop preflight observations");
            assert.ok(request.prompt.includes("SAAD DAILY MAINTENANCE WORKSPACE EXECUTION CONTRACT"), "daily-maintenance runtime prompt must include workspace execution guidance");
            assert.ok(request.prompt.includes("Do not ask the user to provide project files"), "daily-maintenance runtime prompt must not ask the user for files when workspace is mounted");
            assert.ok(request.prompt.includes("USER APPROVAL SCOPE FOR THIS DAILY MAINTENANCE RUN"), "approved daily-maintenance runtime prompt must include scoped approval guidance");
            assert.ok(request.prompt.includes("SAAD DAILY MAINTENANCE OUTPUT CONTRACT"), "daily-maintenance runtime prompt must include the clean output contract");
            assert.ok(request.prompt.includes("Do not stop for a second approval"), "approved daily-maintenance runtime prompt must allow bounded low-risk edits without repeated approval");
            assert.ok(request.prompt.includes("Stop and request a specific second approval before destructive actions"), "approval scope must preserve high-risk second-approval guardrails");
            return {
                success: true,
                available: true,
                command: "pi",
                args: ["exec"],
                cwd: workspace,
                durationMs: 1,
                stdout: "phase two runtime accepted",
                stderr: ""
            };
        };
        try {
            const dailyMaintenancePhaseTwoResult = await ChatOrchestratorService.handleDirectChat({
                prompt: "\u0627\u0644\u0641\u062d\u0635 \u0646\u062c\u062d\u060c \u0627\u0628\u062f\u0623 \u0627\u0644\u0645\u0631\u062d\u0644\u0629 \u0627\u0644\u062b\u0627\u0646\u064a\u0629",
                workspacePath: workspace,
                projectName: "test-workspace",
                approvalMode: "ask",
                sessionId: "daily-maintenance-approval-test"
            });
            assert.strictEqual(dailyMaintenancePhaseTwoResult.intent, "code_modification");
            assert.strictEqual(dailyMaintenancePhaseTwoResult.usedModel, false);
            assert.ok(dailyMaintenancePhaseTwoResult.response.includes("phase two runtime accepted"));
        }
        finally {
            CodexRuntimeBridge.runTask = originalCodexRunTask;
        }
        const originalCodexRunTaskForCleanDailySuccess = CodexRuntimeBridge.runTask;
        CodexRuntimeBridge.runTask = async (request) => {
            assert.ok(request.prompt.includes("SAAD DAILY MAINTENANCE OUTPUT CONTRACT"));
            assert.ok(request.prompt.includes("SAAD DAILY MAINTENANCE WORKSPACE EXECUTION CONTRACT"));
            assert.ok(request.prompt.includes("A successful maintenance report must name at least one file actually read"));
            return {
                success: true,
                available: true,
                command: "C:\\Users\\PC\\AppData\\Roaming\\npm\\pi.cmd",
                args: ["-p", "--provider", "lm-studio", "--model", "qwen/qwen3-coder-30b", "[PROMPT]"],
                cwd: workspace,
                durationMs: 1,
                stdout: [
                    "I've reviewed the project files thoroughly.",
                    "",
                    "Files examined:",
                    "- index.html",
                    "- style.css",
                    "- script.js",
                    "",
                    "No changes were made."
                ].join("\n"),
                stderr: ""
            };
        };
        try {
            const cleanDailySuccessResult = await ChatOrchestratorService.handleDirectChat({
                prompt: dailyMaintenanceNegatedInstallPrompt,
                workspacePath: workspace,
                projectName: "test-workspace",
                approvalMode: "approve_for_me",
                approved: true,
                sessionId: "daily-maintenance-clean-success-output-test"
            });
            assert.strictEqual(cleanDailySuccessResult.intent, "code_modification");
            assert.strictEqual(cleanDailySuccessResult.usedModel, false);
            assert.ok(cleanDailySuccessResult.response.includes("\u062a\u0645 \u062a\u0646\u0641\u064a\u0630 \u0641\u062d\u0635 \u0627\u0644\u0635\u064a\u0627\u0646\u0629 \u0627\u0644\u064a\u0648\u0645\u064a"));
            assert.ok(cleanDailySuccessResult.response.includes("Files examined:"));
            assert.ok(!cleanDailySuccessResult.response.includes("Codex Runtime completed"));
            assert.ok(!cleanDailySuccessResult.response.includes("Command:"));
            assert.ok(!cleanDailySuccessResult.response.includes("Workspace:"));
            assert.ok(!cleanDailySuccessResult.response.includes("pi.cmd"));
        }
        finally {
            CodexRuntimeBridge.runTask = originalCodexRunTaskForCleanDailySuccess;
        }
        const selfWorkspace = path.join(workspace, "saad-agent");
        const wrongActiveWorkspace = path.join(workspace, "TEST ANG");
        await fs.mkdir(path.join(selfWorkspace, "ui", "src"), { recursive: true });
        await fs.mkdir(wrongActiveWorkspace, { recursive: true });
        await fs.writeFile(path.join(selfWorkspace, "package.json"), JSON.stringify({ name: "saad-agent" }), "utf8");
        await fs.writeFile(path.join(selfWorkspace, "ui", "src", "App.tsx"), "export default function App() { return null; }\n", "utf8");
        const originalCodexRunTaskForSelfWorkspace = CodexRuntimeBridge.runTask;
        CodexRuntimeBridge.runTask = async (request) => {
            assert.strictEqual(request.workspacePath, selfWorkspace, "requests that explicitly target Saad Agent must execute in the app workspace, not the currently selected external project");
            assert.ok(!String(request.workspacePath || "").includes("TEST ANG"));
            return {
                success: true,
                available: true,
                command: "pi",
                args: ["exec"],
                cwd: selfWorkspace,
                durationMs: 1,
                stdout: "Saad Agent self-workspace selected",
                stderr: ""
            };
        };
        try {
            const selfWorkspaceRoutingResult = await ChatOrchestratorService.handleDirectChat({
                prompt: "\u0627\u0631\u064a\u062f \u0627\u0644\u0627\u0646 \u0627\u0644\u0627\u062c\u064a\u0646\u062a \u064a\u062a\u0641\u0639\u0644 \u0641\u064a\u0647 \u0632\u0631 \u0639\u0631\u0628\u064a \u0648 \u0627\u0646\u0643\u0644\u064a\u0632\u064a \u0643\u0644 \u0645\u0641\u0627\u0635\u0644 \u0627\u0644\u0627\u062c\u064a\u0646\u062a \u064a\u0639\u0645\u0644 \u0641\u064a\u0647 \u0632\u0631 \u0627\u0644\u0639\u0631\u0628\u064a \u0648 \u0627\u0644\u0627\u0646\u0643\u0644\u064a\u0632\u064a \u0644\u0627\u0643\u0646 \u0644\u0627 \u0627\u0631\u064a\u062f \u062a\u063a\u064a\u064a\u0631 \u0627\u0644\u0627\u062a\u062c\u0627\u0647",
                workspacePath: wrongActiveWorkspace,
                projectName: "TEST ANG",
                approvalMode: "approve_for_me",
                approved: true,
                sessionId: "saad-agent-self-workspace-routing-test"
            });
            assert.strictEqual(selfWorkspaceRoutingResult.usedModel, false);
            assert.ok(selfWorkspaceRoutingResult.response.includes("Saad Agent self-workspace selected"));
        }
        finally {
            CodexRuntimeBridge.runTask = originalCodexRunTaskForSelfWorkspace;
        }
        const followUpTargetWorkspace = path.join(workspace, "TEST ANG", "New folder");
        await fs.mkdir(followUpTargetWorkspace, { recursive: true });
        const originalCodexRunTaskForDesignFollowUp = CodexRuntimeBridge.runTask;
        let designFollowUpRuntimeCalled = false;
        CodexRuntimeBridge.runTask = async (request) => {
            if (!request.approved) {
                return {
                    success: false,
                    available: true,
                    command: "pi",
                    args: ["exec"],
                    cwd: request.workspacePath,
                    durationMs: 1,
                    stdout: "",
                    stderr: "",
                    approvalRequest: {
                        requiresApproval: true,
                        action: "run_command",
                        risk: "high",
                        reason: "test approval",
                        files: []
                    }
                };
            }
            designFollowUpRuntimeCalled = true;
            assert.strictEqual(request.workspacePath, followUpTargetWorkspace);
            assert.ok(request.prompt.includes("Choose your studio"), "follow-up target prompt must preserve the previous page specification");
            assert.ok(request.prompt.includes("Image Studio"), "follow-up target prompt must preserve card requirements");
            assert.ok(request.prompt.includes("FOLLOW-UP TARGET UPDATE"), "follow-up prompt must explain that the short message is a target update");
            assert.ok(request.prompt.includes("New folder"), "follow-up target path must remain visible to the runtime");
            assert.ok(request.prompt.includes("SAAD DESIGN REFERENCE EVIDENCE GATE"), "design runtime prompt must force DEZ reference evidence collection");
            assert.ok(request.prompt.includes("SAAD DESIGN REFERENCE PREFLIGHT"), "design runtime prompt must include concrete DEZ preflight references");
            assert.ok(/Selected DEZ reference files:[\s\S]+DEZ/i.test(request.prompt), "design runtime prompt must include actual DEZ paths");
            assert.ok(request.prompt.includes("DEZ files inspected:"), "design runtime prompt must require reporting the actual DEZ files inspected");
            assert.ok(!/^.*Welcome to My Page.*$/m.test(request.prompt), "runtime prompt must not collapse to a generic sample page");
            return {
                success: true,
                available: true,
                command: "pi",
                args: ["exec"],
                cwd: followUpTargetWorkspace,
                durationMs: 1,
                stdout: [
                    "Implemented SaaS AI Studio page in follow-up target workspace",
                    "DEZ files inspected: DESIGN_REFERENCE_MANIFEST.json; DEZ/shadcn-dashboard-landing-template-main/.../landing/page.tsx"
                ].join("\n"),
                stderr: ""
            };
        };
        try {
            const designFollowUpSession = "design-page-follow-up-target-test";
            const designPrompt = [
                "اريدك تصمم وتنفذ صفحة داخل المشروع الحالي تشبه الصورة المرفقة من حيث الفكرة والأسلوب، وليس نسخاً حرفياً.",
                "المطلوب:",
                "- صفحة SaaS / AI Studio داكنة وفخمة.",
                "- Navbar علوي فيه شعار، روابط أدوات، زر عربي/English، Pricing، تسجيل الدخول، وتسجيل مجاني.",
                "- قسم رئيسي بعنوان: Choose your studio",
                "- شبكة كروت كبيرة 3 أعمدة و2 صف: Image Studio, Video Studio, AI Canvas, Next Scene, Character, Apps",
                "- كل كرت يحتوي صورة خلفية داكنة، تدرج أسود فوق الصورة، أيقونة صغيرة، عنوان، وصف قصير.",
                "- قسم ثاني بعنوان: Built for real outputs",
                "- لا تغيّر اتجاه الصفحة عند العربية. ممنوع RTL.",
                "- لا تثبت مكتبات جديدة ولا تحذف ملفات.",
                "- إذا كان الطلب سيعدل ملفات، اطلب موافقتي أولاً حسب سياسة Saad Agent."
            ].join("\n");
            const designApproval = await ChatOrchestratorService.handleDirectChat({
                prompt: designPrompt,
                workspacePath: workspace,
                projectName: "test-workspace",
                approvalMode: "ask",
                sessionId: designFollowUpSession
            });
            assert.notStrictEqual(designApproval.intent, "memory_save", "initial page implementation request must remain an engineering/design conversation");
            const designFollowUpResult = await ChatOrchestratorService.handleDirectChat({
                prompt: `ضع الصفحة هنا ${followUpTargetWorkspace}`,
                workspacePath: workspace,
                projectName: "test-workspace",
                approvalMode: "approve_for_me",
                approved: true,
                sessionId: designFollowUpSession
            });
            assert.strictEqual(designFollowUpResult.usedModel, false);
            assert.ok(designFollowUpRuntimeCalled, `follow-up target request must reach the runtime with the merged previous design spec. Actual response:\n${designFollowUpResult.response}`);
            assert.ok(designFollowUpResult.response.includes("Implemented SaaS AI Studio page"));
        }
        finally {
            CodexRuntimeBridge.runTask = originalCodexRunTaskForDesignFollowUp;
        }
        const originalCodexRunTaskForSelfContainedDesignPath = CodexRuntimeBridge.runTask;
        let selfContainedDesignRuntimeCalled = false;
        CodexRuntimeBridge.runTask = async (request) => {
            selfContainedDesignRuntimeCalled = true;
            assert.ok(request.prompt.includes("SAAD DESIGN REFERENCE EVIDENCE GATE"), "self-contained design runtime prompt must force DEZ reference evidence collection");
            assert.ok(request.prompt.includes("SAAD DESIGN REFERENCE PREFLIGHT"), "self-contained design runtime prompt must include concrete DEZ preflight references");
            assert.ok(/Selected DEZ reference files:[\s\S]+DEZ/i.test(request.prompt), "self-contained design runtime prompt must include actual DEZ paths");
            assert.ok(request.prompt.includes("DESIGN_REFERENCE_MANIFEST.json"), "self-contained design runtime prompt must include the authoritative manifest path");
            assert.ok(String(request.workspacePath || "").endsWith(path.join("TEST ANG", "New folder")));
            assert.ok(request.prompt.includes("SaaS / AI Studio"), "self-contained design path request must preserve SaaS/AI Studio spec");
            assert.ok(request.prompt.includes("Choose your studio"), "self-contained design path request must preserve section spec");
            assert.ok(request.prompt.includes("6 كروت"), "self-contained design path request must preserve cards spec");
            return {
                success: true,
                available: true,
                command: "pi",
                args: ["exec"],
                cwd: request.workspacePath,
                durationMs: 1,
                stdout: [
                    "Implemented self-contained SaaS AI Studio page from path prompt",
                    "DEZ files inspected: DESIGN_REFERENCE_MANIFEST.json; DEZ/shadcn-dashboard-landing-template-main/.../landing/page.tsx"
                ].join("\n"),
                stderr: ""
            };
        };
        try {
            const selfContainedDesignResult = await ChatOrchestratorService.handleDirectChat({
                prompt: [
                    "أعد تنفيذ نفس طلب صفحة SaaS / AI Studio بالكامل داخل هذا المسار:",
                    followUpTargetWorkspace,
                    "",
                    "لا تعتبر هذا طلباً جديداً. استخدم نفس المواصفات السابقة والصورة المرفقة السابقة كمرجع:",
                    "- صفحة داكنة فخمة",
                    "- Navbar",
                    "- Choose your studio",
                    "- 6 كروت",
                    "- Built for real outputs",
                    "- responsive",
                    "- زر عربي/English بدون RTL",
                    "- لا تثبت مكتبات ولا تحذف ملفات",
                    "",
                    "افحص الملفات أولاً، ثم نفذ، ثم تحقق."
                ].join("\n"),
                workspacePath: workspace,
                projectName: "test-workspace",
                approvalMode: "approve_for_me",
                approved: true,
                sessionId: "self-contained-design-path-not-training-test"
            });
            assert.strictEqual(selfContainedDesignResult.usedModel, false);
            assert.ok(selfContainedDesignRuntimeCalled, "self-contained path design request must route to engineering runtime");
            assert.ok(!selfContainedDesignResult.response.includes("ارفع الملف"));
            assert.ok(!selfContainedDesignResult.response.includes("تدريب حقيقي"));
            assert.ok(selfContainedDesignResult.response.includes("Implemented self-contained SaaS AI Studio page"));
        }
        finally {
            CodexRuntimeBridge.runTask = originalCodexRunTaskForSelfContainedDesignPath;
        }
        const localImageAssetWorkspace = path.join(workspace, "lang");
        const localImageAssetFolder = path.join(localImageAssetWorkspace, "New folder");
        await fs.mkdir(localImageAssetFolder, { recursive: true });
        await fs.writeFile(path.join(localImageAssetFolder, "hero.jpg"), "fake image bytes", "utf8");
        const originalCodexRunTaskForLocalImageAssets = CodexRuntimeBridge.runTask;
        let localImageAssetRuntimeCalled = false;
        CodexRuntimeBridge.runTask = async (request) => {
            localImageAssetRuntimeCalled = true;
            assert.ok(request.prompt.includes("SAAD DESIGN REFERENCE EVIDENCE GATE"), "local-image page design prompt must force DEZ reference evidence collection");
            assert.ok(request.prompt.includes("SAAD DESIGN REFERENCE PREFLIGHT"), "local-image page design prompt must include concrete DEZ preflight references");
            assert.ok(/Selected DEZ reference files:[\s\S]+DEZ/i.test(request.prompt), "local-image page design prompt must include actual DEZ paths");
            assert.ok(request.prompt.includes("If the runtime cannot read the manifest or DEZ reference files"), "design runtime prompt must not allow fake reference claims");
            assert.strictEqual(request.workspacePath, localImageAssetWorkspace);
            assert.ok(request.prompt.includes("New folder"));
            assert.ok(request.prompt.includes("index.html"));
            assert.ok(request.prompt.includes("script.js"));
            return {
                success: true,
                available: true,
                command: "pi",
                args: ["exec"],
                cwd: localImageAssetWorkspace,
                durationMs: 1,
                stdout: [
                    "Implemented SAAD STUDIO page using local image assets",
                    "DEZ files inspected: DESIGN_REFERENCE_MANIFEST.json; DEZ/shadcn-dashboard-landing-template-main/.../dashboard/page.tsx"
                ].join("\n"),
                stderr: ""
            };
        };
        try {
            const localImageAssetResult = await ChatOrchestratorService.handleDirectChat({
                prompt: [
                    "لا تعتمد على أي رسالة سابقة. هذا طلب جديد مستقل.",
                    "",
                    "اشتغل فقط داخل هذا المسار:",
                    localImageAssetWorkspace,
                    "",
                    "استخدم الصور الموجودة هنا داخل التصميم:",
                    localImageAssetFolder,
                    "",
                    "صمم ونفذ صفحة HTML/CSS/JS داخل هذا المجلد تشبه الصورة المرفقة من حيث التخطيط والأسلوب.",
                    "واجهة داكنة فخمة باسم SAAD STUDIO، Navbar، Hero كبير، Sidebar AI Tools، شبكة منتجات 3 أعمدة.",
                    "أنشئ أو عدّل فقط: index.html styles.css script.js",
                    "لا تولّد صور جديدة. اربط الصور الموجودة محلياً داخل HTML/CSS."
                ].join("\n"),
                workspacePath: workspace,
                projectName: "test-workspace",
                approvalMode: "approve_for_me",
                approved: true,
                sessionId: "local-image-assets-page-routing-test"
            });
            assert.strictEqual(localImageAssetResult.usedModel, false);
            assert.ok(localImageAssetRuntimeCalled, "local image asset page requests must reach the engineering runtime");
            assert.ok(localImageAssetResult.response.includes("local image assets"));
            assert.ok(!localImageAssetResult.response.includes("No real image generator"));
            assert.ok(!localImageAssetResult.response.includes("SAAD_AGENT_IMAGE_GENERATION_ENDPOINT"));
        }
        finally {
            CodexRuntimeBridge.runTask = originalCodexRunTaskForLocalImageAssets;
        }
        const originalCodexRunTaskForDesignEvidenceRepair = CodexRuntimeBridge.runTask;
        let designEvidenceRepairAttempts = 0;
        CodexRuntimeBridge.runTask = async (request) => {
            designEvidenceRepairAttempts += 1;
            if (designEvidenceRepairAttempts === 1) {
                assert.ok(request.prompt.includes("SAAD DESIGN REFERENCE PREFLIGHT"), "initial design run must include concrete DEZ preflight references");
                return {
                    success: true,
                    available: true,
                    command: "pi",
                    args: ["exec"],
                    cwd: request.workspacePath,
                    durationMs: 1,
                    stdout: "I need to examine the current workspace to understand what files are available.",
                    stderr: ""
                };
            }
            assert.ok(request.prompt.includes("SAAD DESIGN REFERENCE SELF-REPAIR"), "missing DEZ evidence must trigger one self-repair run");
            assert.ok(request.prompt.includes("Previous failed runtime output"), "self-repair run must include the failed runtime output");
            assert.ok(request.prompt.includes("Selected DEZ reference files:"), "self-repair run must preserve concrete DEZ file paths");
            return {
                success: true,
                available: true,
                command: "pi",
                args: ["exec"],
                cwd: request.workspacePath,
                durationMs: 1,
                stdout: [
                    "Implemented SaaS AI Studio design after evidence repair",
                    "DEZ files inspected: E:/repo/saad-agent/release-production-v4/win-unpacked/DEZ/shadcn-dashboard/vite-version/src/app/landing/page.tsx"
                ].join("\n"),
                stderr: ""
            };
        };
        try {
            const designEvidenceRepairResult = await ChatOrchestratorService.handleDirectChat({
                prompt: [
                    `اختبار تصميم: صمم صفحة SaaS / AI Studio داخل ${localImageAssetWorkspace}.`,
                    "قبل التنفيذ استخدم مراجع التصميم المحلية من DEZ عبر DESIGN_REFERENCE_MANIFEST.json.",
                    "افحص ملفات landing وdashboard وcomponents المناسبة، ثم نفذ داخل المسار الهدف فقط.",
                    "لا تنشئ صفحة عامة. لا تثبت مكتبات. لا تحذف ملفات."
                ].join("\n"),
                workspacePath: workspace,
                projectName: "test-workspace",
                approvalMode: "approve_for_me",
                approved: true,
                sessionId: "design-evidence-self-repair-test"
            });
            assert.strictEqual(designEvidenceRepairResult.usedModel, false);
            assert.strictEqual(designEvidenceRepairAttempts, 2, "missing DEZ evidence must retry exactly once");
            assert.ok(designEvidenceRepairResult.response.includes("Implemented SaaS AI Studio design after evidence repair"));
            assert.ok(designEvidenceRepairResult.response.includes("DEZ files inspected:"));
            assert.ok(!designEvidenceRepairResult.response.includes("توقف تحقق مراجع التصميم"));
        }
        finally {
            CodexRuntimeBridge.runTask = originalCodexRunTaskForDesignEvidenceRepair;
        }
        const originalCodexRunTaskForClaudeCodeReference = CodexRuntimeBridge.runTask;
        let claudeCodeReferenceRuntimeCalled = false;
        CodexRuntimeBridge.runTask = async (request) => {
            claudeCodeReferenceRuntimeCalled = true;
            assert.ok(request.prompt.includes("SAAD CLAUDE CODE REFERENCE EVIDENCE GATE"), "agent runtime prompt must force Claude Code reference evidence collection");
            assert.ok(request.prompt.includes("CLAUDE_CODE_REFERENCE_MANIFEST.json"), "agent runtime prompt must include the authoritative Claude Code manifest path");
            assert.ok(request.prompt.includes("Claude-code files inspected:"), "agent runtime prompt must require reporting the actual Claude Code files inspected");
            assert.ok(request.prompt.includes("Do not copy, run, import, vendor, bundle, or reverse-engineer"), "agent runtime prompt must preserve legal/safety guardrails");
            assert.ok(String(request.workspacePath || "").startsWith(workspace), "agent runtime request must stay inside the Saad Agent project source workspace");
            assert.ok(!String(request.workspacePath || "").includes("Agent-Reach-main"), "Claude Code reference must not become the execution workspace");
            return {
                success: true,
                available: true,
                command: "pi",
                args: ["exec"],
                cwd: workspace,
                durationMs: 1,
                stdout: [
                    "Added original Saad Agent runtime wiring using existing services",
                    "Claude-code files inspected: CLAUDE_CODE_REFERENCE_MANIFEST.json; claude-code-main/src/entrypoints/cli.tsx; claude-code-main/src/Tool.ts"
                ].join("\n"),
                stderr: ""
            };
        };
        try {
            const claudeCodeReferenceResult = await ChatOrchestratorService.handleDirectChat({
                prompt: [
                    "نفذ داخل Saad Agent طبقة agent runtime أصلية مستوحاة من claude-code.",
                    "استخدم مرجع claude-code المحلي كمرجع معماري فقط ولا تجعله workspace target.",
                    "اربط AgentLoopService و ToolManager و ApprovalPolicyService و ExecutionTraceEmitter.",
                    "لا تنسخ كود من claude-code، فقط افحص المرجع واذكر الملفات التي قرأتها."
                ].join("\n"),
                workspacePath: workspace,
                projectName: "test-workspace",
                approvalMode: "approve_for_me",
                approved: true,
                sessionId: "claude-code-reference-evidence-gate-test"
            });
            assert.strictEqual(claudeCodeReferenceResult.usedModel, false);
            assert.ok(claudeCodeReferenceRuntimeCalled, "agent architecture request must reach engineering runtime");
            assert.ok(claudeCodeReferenceResult.response.includes("Claude-code files inspected"));
        }
        finally {
            CodexRuntimeBridge.runTask = originalCodexRunTaskForClaudeCodeReference;
        }
        const referenceBindingRoute = RequestRoutingService.classify([
            "Implement mandatory binding for these two sources inside Saad Agent.",
            "Design source: E:\\موقع ثاني\\next14 ai saas\\next14-ai-saas-main\\next14-ai-saas-main\\saad-agent\\release-production-v4\\win-unpacked\\DEZ",
            "Use shadcn-dashboard files as the primary design reference: landing dashboard dashboard-2 auth chat settings pricing components/ui layouts theme-customizer.",
            "Any design/page/SaaS/Dashboard task must inspect these files and report DEZ files inspected.",
            "Agent architecture source: E:\\Agent-Reach-main\\claude-code",
            "Use it only as a comparative architecture reference for agent loop tools planning memory approvals hooks context compression subagents.",
            "Create a separate claude-code manifest like DEZ, wire the manifest into Saad Agent, add a mandatory gate, update PROJECT_CONTEXT and SAAD_AGENT_CONTEXT, build, test, then repack app.asar."
        ].join("\n"));
        assert.strictEqual(referenceBindingRoute.kind, "engineering_modify", "DEZ/Claude Code manifest binding request must route to engineering_modify, not deterministic links or chat");
        const originalCodexRunTaskForReferenceBinding = CodexRuntimeBridge.runTask;
        let referenceBindingRuntimeCalled = false;
        CodexRuntimeBridge.runTask = async (request) => {
            referenceBindingRuntimeCalled = true;
            assert.ok(request.prompt.includes("SAAD DESIGN REFERENCE EVIDENCE GATE"), "reference binding prompt must keep DEZ evidence gate");
            assert.ok(request.prompt.includes("SAAD DESIGN REFERENCE PREFLIGHT"), "reference binding prompt must include concrete DEZ preflight");
            assert.ok(request.prompt.includes("SAAD CLAUDE CODE REFERENCE EVIDENCE GATE"), "reference binding prompt must keep Claude Code evidence gate");
            assert.ok(request.prompt.includes("DESIGN_REFERENCE_MANIFEST.json"), "reference binding prompt must include DEZ manifest");
            assert.ok(request.prompt.includes("CLAUDE_CODE_REFERENCE_MANIFEST.json"), "reference binding prompt must include Claude Code manifest");
            return {
                success: true,
                available: true,
                command: "pi",
                args: ["exec"],
                cwd: request.workspacePath,
                durationMs: 1,
                stdout: [
                    "Implemented mandatory reference gates in Saad Agent routing.",
                    "DEZ files inspected: E:/repo/saad-agent/release-production-v4/win-unpacked/DEZ/shadcn-dashboard/vite-version/src/app/landing/page.tsx",
                    "Claude-code files inspected: CLAUDE_CODE_REFERENCE_MANIFEST.json; E:/Agent-Reach-main/claude-code/package.json"
                ].join("\n"),
                stderr: ""
            };
        };
        try {
            const referenceBindingResult = await ChatOrchestratorService.handleDirectChat({
                prompt: [
                    "Implement mandatory binding for these two sources inside Saad Agent.",
                    "Design source: E:\\موقع ثاني\\next14 ai saas\\next14-ai-saas-main\\next14-ai-saas-main\\saad-agent\\release-production-v4\\win-unpacked\\DEZ",
                    "Use shadcn-dashboard files as the primary design reference: landing dashboard dashboard-2 auth chat settings pricing components/ui layouts theme-customizer.",
                    "Any design/page/SaaS/Dashboard task must inspect these files and report: DEZ files inspected: <actual reference paths>",
                    "Agent architecture source: E:\\Agent-Reach-main\\claude-code",
                    "Use it only as a comparative architecture reference for agent loop tools planning memory approvals hooks context compression subagents.",
                    "Do not copy leaked or proprietary code. Extract architecture patterns only.",
                    "Create a separate claude-code manifest like DEZ. Wire the manifest into Saad Agent. Add a mandatory gate. Update PROJECT_CONTEXT and SAAD_AGENT_CONTEXT and the Arabic reference. Build, test, then repack app.asar."
                ].join("\n"),
                workspacePath: workspace,
                projectName: "test-workspace",
                approvalMode: "approve_for_me",
                approved: true,
                sessionId: "reference-binding-routing-regression-test"
            });
            assert.strictEqual(referenceBindingResult.usedModel, false);
            assert.ok(referenceBindingRuntimeCalled, "reference binding request must reach engineering runtime");
            assert.ok(!referenceBindingResult.response.includes("Google الرسمي"), "reference binding request must not open Google");
            assert.ok(!referenceBindingResult.response.includes("فتح Google"), "reference binding request must not return direct Google link");
            assert.ok(referenceBindingResult.response.includes("DEZ files inspected:"));
            assert.ok(referenceBindingResult.response.includes("Claude-code files inspected:"));
        }
        finally {
            CodexRuntimeBridge.runTask = originalCodexRunTaskForReferenceBinding;
        }
        const attachedOpenApiSpec = path.join(workspace, "pasted-config.txt");
        await fs.writeFile(attachedOpenApiSpec, [
            "openapi: 3.0.1",
            "servers:",
            "  - url: https://api.kie.ai",
            "paths:",
            "  /api/v1/jobs/createTask:",
            "    post:",
            "      requestBody:",
            "        required: true",
            "components:",
            "  schemas:",
            "    SeedreamInput:",
            "      properties:",
            "        model:",
            "          enum: [seedream/5-pro-image-to-image]",
            "        prompt:",
            "          maxLength: 5000",
            "        image_urls:",
            "          maxItems: 10",
            "        aspect_ratio:",
            "          enum: [1:1, 4:3, 3:4, 16:9, 9:16, 2:3, 3:2, 21:9]",
            "        quality:",
            "          enum: [basic, high]",
            "        output_format:",
            "          enum: [png, jpeg]"
        ].join("\n"), "utf8");
        const attachedSpecRoute = RequestRoutingService.classify([
            "Local engineering modification request.",
            `Workspace path: ${workspace}`,
            "\u0627\u0631\u0628\u0637 \u0645\u0648\u062f\u064a\u0644 Seedream \u0628\u0627\u0644\u0635\u0641\u062d\u0629 \u062d\u0633\u0628 \u0645\u0644\u0641 OpenAPI \u0627\u0644\u0645\u0631\u0641\u0642.",
            "openapi: 3.0.1",
            "seedream/5-pro-image-to-image"
        ].join("\n"));
        assert.strictEqual(attachedSpecRoute.kind, "engineering_modify");
        const originalCodexRunTaskForAttachedSpec = CodexRuntimeBridge.runTask;
        const originalRequestCompletionForAttachedSpec = ReasoningEngine.requestCompletion;
        let attachedSpecRuntimeCalled = false;
        ReasoningEngine.requestCompletion = async () => {
            throw new Error("attached OpenAPI engineering requests must not call the chat model");
        };
        CodexRuntimeBridge.runTask = async (request) => {
            attachedSpecRuntimeCalled = true;
            assert.strictEqual(request.workspacePath, workspace);
            assert.ok(String(request.prompt || "").includes("seedream/5-pro-image-to-image"));
            assert.ok(String(request.prompt || "").includes("/api/v1/jobs/createTask"));
            assert.ok(String(request.prompt || "").includes("OpenAPI"));
            return {
                success: true,
                available: true,
                command: "pi",
                args: ["exec"],
                cwd: workspace,
                durationMs: 1,
                stdout: "Integrated Seedream5 Pro model panel from attached OpenAPI spec",
                stderr: ""
            };
        };
        try {
            const attachedSpecResult = await ChatOrchestratorService.handleDirectChat({
                prompt: "\u0627\u0633\u062a\u062e\u062f\u0645 \u0645\u0644\u0641 OpenAPI \u0627\u0644\u0645\u0631\u0641\u0642 \u0648\u0627\u0631\u0628\u0637 \u0645\u0648\u062f\u064a\u0644 Seedream5.0 Pro \u062f\u0627\u062e\u0644 \u0646\u0641\u0633 \u0627\u0644\u0635\u0641\u062d\u0629 \u0628\u0643\u0644 \u062e\u0635\u0627\u0626\u0635\u0647. \u0646\u0641\u0630 \u0643\u062a\u0639\u062f\u064a\u0644 \u0645\u0644\u0641\u0627\u062a.",
                workspacePath: workspace,
                projectName: "test-workspace",
                approvalMode: "approve_for_me",
                approved: true,
                sessionId: "attached-openapi-spec-engineering-routing-test",
                attachments: [{
                        id: "att-openapi-spec",
                        filename: "pasted-config.txt",
                        mimeType: "text/plain",
                        size: 900,
                        localPath: attachedOpenApiSpec,
                        previewPath: attachedOpenApiSpec,
                        source: "clipboard",
                        timestamp: Date.now(),
                        workspaceId: "test-workspace"
                    }]
            });
            assert.strictEqual(attachedSpecResult.usedModel, false);
            assert.ok(attachedSpecRuntimeCalled, "attached OpenAPI spec implementation must reach engineering runtime");
            assert.ok(attachedSpecResult.response.includes("Seedream5 Pro"));
        }
        finally {
            CodexRuntimeBridge.runTask = originalCodexRunTaskForAttachedSpec;
            ReasoningEngine.requestCompletion = originalRequestCompletionForAttachedSpec;
        }
        const originalCodexRunTaskForAttachedSpecFollowUp = CodexRuntimeBridge.runTask;
        const originalRequestCompletionForAttachedSpecFollowUp = ReasoningEngine.requestCompletion;
        let attachedSpecFollowUpRuntimeCalled = false;
        ReasoningEngine.requestCompletion = async () => {
            throw new Error("attachment-only OpenAPI follow-up must not call the chat model");
        };
        CodexRuntimeBridge.runTask = async (request) => {
            attachedSpecFollowUpRuntimeCalled = true;
            assert.strictEqual(request.workspacePath, workspace);
            const promptText = String(request.prompt || "");
            assert.ok(promptText.includes("Seedream") || promptText.includes("seedream"));
            assert.ok(promptText.includes("seedream/5-pro-image-to-image"));
            assert.ok(promptText.includes("/api/v1/jobs/createTask"));
            return {
                success: true,
                available: true,
                command: "pi",
                args: ["exec"],
                cwd: workspace,
                durationMs: 1,
                stdout: "Integrated Seedream5 Pro from attachment-only follow-up",
                stderr: ""
            };
        };
        try {
            const attachedSpecFollowUpResult = await ChatOrchestratorService.handleDirectChat({
                prompt: "Attached long pasted content as file.",
                workspacePath: workspace,
                projectName: "test-workspace",
                approvalMode: "approve_for_me",
                approved: true,
                sessionId: "attached-openapi-file-only-followup-test",
                history: [{
                        role: "user",
                        content: "\u0627\u0644\u0627\u062e\u062a\u0628\u0627\u0631 \u0627\u0644\u062b\u0627\u0646\u064a: \u0627\u0631\u0628\u0637 \u0645\u0648\u062f\u064a\u0644 Seedream5.0 Pro \u0628\u0644\u0643\u0627\u0645\u0644 \u0645\u0639 \u062c\u0645\u064a\u0639 \u062e\u0635\u0627\u0626\u0635\u0647 \u062f\u0627\u062e\u0644 \u0646\u0641\u0633 \u0627\u0644\u0635\u0641\u062d\u0629 \u062d\u0633\u0628 \u0645\u0644\u0641 OpenAPI."
                    }],
                attachments: [{
                        id: "att-openapi-spec-follow-up",
                        filename: "pasted-config.txt",
                        mimeType: "text/yaml",
                        size: 900,
                        localPath: attachedOpenApiSpec,
                        previewPath: attachedOpenApiSpec,
                        source: "clipboard",
                        timestamp: Date.now(),
                        workspaceId: "test-workspace"
                    }]
            });
            assert.strictEqual(attachedSpecFollowUpResult.usedModel, false);
            assert.ok(attachedSpecFollowUpRuntimeCalled, "attachment-only OpenAPI follow-up must use previous engineering task");
            assert.ok(attachedSpecFollowUpResult.response.includes("Seedream5 Pro"));
        }
        finally {
            CodexRuntimeBridge.runTask = originalCodexRunTaskForAttachedSpecFollowUp;
            ReasoningEngine.requestCompletion = originalRequestCompletionForAttachedSpecFollowUp;
        }
        const attachedFullSeedreamRequest = path.join(workspace, "pasted-full-seedream-request.txt");
        const seedreamPageWorkspace = path.join(workspace, "lang");
        const seedreamAssetFolder = path.join(seedreamPageWorkspace, "New folder");
        await fs.mkdir(seedreamAssetFolder, { recursive: true });
        await fs.writeFile(attachedFullSeedreamRequest, [
            "\u0627\u062e\u062a\u0628\u0627\u0631 \u062b\u0627\u0646\u064a \u0645\u0647\u0645: \u0623\u0631\u064a\u062f \u0631\u0628\u0637 \u0645\u0648\u062f\u064a\u0644 Seedream5.0 Pro - Image to Image \u062f\u0627\u062e\u0644 \u0646\u0641\u0633 \u0627\u0644\u0635\u0641\u062d\u0629 \u0627\u0644\u062d\u0627\u0644\u064a\u0629.",
            "\u0644\u0627 \u062a\u0628\u062f\u0623 \u0635\u0641\u062d\u0629 \u062c\u062f\u064a\u062f\u0629 \u0645\u0646 \u0627\u0644\u0635\u0641\u0631.",
            "\u062d\u0633\u0651\u0646 \u0627\u0644\u0635\u0641\u062d\u0629 \u0627\u0644\u062d\u0627\u0644\u064a\u0629 \u0641\u0642\u0637 \u062f\u0627\u062e\u0644:",
            seedreamPageWorkspace,
            "",
            "\u0645\u0635\u062f\u0631 \u0627\u0644\u0635\u0648\u0631 \u0627\u0644\u0645\u062d\u0644\u064a\u0629 \u0641\u0642\u0637:",
            seedreamAssetFolder,
            "",
            "Endpoint:",
            "POST /api/v1/jobs/createTask",
            "Full URL:",
            "https://api.kie.ai/api/v1/jobs/createTask",
            "Authentication: Authorization: Bearer YOUR_API_KEY",
            "Content-Type: application/json",
            "model: seedream/5-pro-image-to-image",
            "",
            "\u062d\u0642\u0648\u0644 \u0627\u0644\u0641\u0648\u0631\u0645: API Key, prompt, image_urls, aspect_ratio, quality, output_format, nsfw_checker, callBackUrl.",
            "\u0639\u062f\u0651\u0644 \u0641\u0642\u0637: index.html styles.css script.js",
            "\u0644\u0627 \u062a\u062e\u062a\u0631\u0639 endpoint \u0644\u0644\u0627\u0633\u062a\u0639\u0644\u0627\u0645 \u0639\u0646 \u062d\u0627\u0644\u0629 \u0627\u0644\u0645\u0647\u0645\u0629."
        ].join("\n"), "utf8");
        const originalCodexRunTaskForFullAttachedRequest = CodexRuntimeBridge.runTask;
        const originalRequestCompletionForFullAttachedRequest = ReasoningEngine.requestCompletion;
        let fullAttachedRequestRuntimeCalled = false;
        ReasoningEngine.requestCompletion = async () => {
            throw new Error("full engineering prompt attached as pasted text must not call the chat model");
        };
        CodexRuntimeBridge.runTask = async (request) => {
            fullAttachedRequestRuntimeCalled = true;
            assert.strictEqual(request.workspacePath, seedreamPageWorkspace);
            const promptText = String(request.prompt || "");
            assert.ok(promptText.includes("Seedream5.0 Pro - Image to Image"));
            assert.ok(promptText.includes("seedream/5-pro-image-to-image"));
            assert.ok(promptText.includes("/api/v1/jobs/createTask"));
            assert.ok(promptText.includes("index.html styles.css script.js"));
            return {
                success: true,
                available: true,
                command: "pi",
                args: ["exec"],
                cwd: seedreamPageWorkspace,
                durationMs: 1,
                stdout: "Added Seedream5.0 Pro Image to Image section from full pasted request attachment",
                stderr: ""
            };
        };
        try {
            const fullAttachedRequestResult = await ChatOrchestratorService.handleDirectChat({
                prompt: "Attached long pasted content as file.",
                workspacePath: workspace,
                projectName: "test-workspace",
                approvalMode: "approve_for_me",
                approved: true,
                sessionId: "attached-full-engineering-request-routing-test",
                attachments: [{
                        id: "att-full-seedream-request",
                        filename: "pasted-config.txt",
                        mimeType: "text/plain",
                        size: 4600,
                        localPath: attachedFullSeedreamRequest,
                        previewPath: attachedFullSeedreamRequest,
                        source: "clipboard",
                        timestamp: Date.now(),
                        workspaceId: "test-workspace"
                    }]
            });
            assert.strictEqual(fullAttachedRequestResult.usedModel, false);
            assert.ok(fullAttachedRequestRuntimeCalled, "full pasted engineering request attachment must reach engineering runtime");
            assert.ok(fullAttachedRequestResult.response.includes("Seedream5.0 Pro"));
        }
        finally {
            CodexRuntimeBridge.runTask = originalCodexRunTaskForFullAttachedRequest;
            ReasoningEngine.requestCompletion = originalRequestCompletionForFullAttachedRequest;
        }
        const originalCodexRunTaskForDetachedSpec = CodexRuntimeBridge.runTask;
        const originalRequestCompletionForDetachedSpec = ReasoningEngine.requestCompletion;
        CodexRuntimeBridge.runTask = async () => {
            throw new Error("detached spec without task must not run engineering runtime");
        };
        ReasoningEngine.requestCompletion = async () => {
            throw new Error("detached spec without task must not call the chat model");
        };
        try {
            const detachedSpecResult = await ChatOrchestratorService.handleDirectChat({
                prompt: "Attached long pasted content as file.",
                workspacePath: workspace,
                projectName: "test-workspace",
                approvalMode: "approve_for_me",
                approved: true,
                sessionId: "detached-openapi-file-no-task-test",
                attachments: [{
                        id: "att-openapi-spec-detached",
                        filename: "pasted-config.txt",
                        mimeType: "text/yaml",
                        size: 900,
                        localPath: attachedOpenApiSpec,
                        previewPath: attachedOpenApiSpec,
                        source: "clipboard",
                        timestamp: Date.now(),
                        workspaceId: "test-workspace"
                    }]
            });
            assert.strictEqual(detachedSpecResult.usedModel, false);
            assert.ok(detachedSpecResult.response.includes("\u0645\u0644\u0641 \u0645\u0648\u0627\u0635\u0641\u0627\u062a"));
            assert.ok(detachedSpecResult.response.includes("\u0644\u0646 \u0623\u0631\u0633\u0644"));
        }
        finally {
            CodexRuntimeBridge.runTask = originalCodexRunTaskForDetachedSpec;
            ReasoningEngine.requestCompletion = originalRequestCompletionForDetachedSpec;
        }
        const claudeReferenceTargetWorkspace = path.join(workspace, "Agent-Reach-main", "claude-code");
        const wrongCopiedWorkspace = path.join(workspace, "TEST ANG");
        await fs.mkdir(claudeReferenceTargetWorkspace, { recursive: true });
        await fs.mkdir(wrongCopiedWorkspace, { recursive: true });
        let copiedLogDesignPrompt = [
            `Active workspace: ${wrongCopiedWorkspace}`,
            "لا يذهب التصميم الى هذا المسار القديم.",
            `أعد تنفيذ صفحة SaaS / AI Studio بالكامل داخل هذا المسار: ${claudeReferenceTargetWorkspace}`,
            "- Choose your studio",
            "- 6 cards",
            "- Built for real outputs",
            "- responsive",
            "- no RTL",
            "افحص الملفات أولاً ثم نفذ ثم تحقق."
        ].join("\n");
        copiedLogDesignPrompt = [
            `Active workspace: ${wrongCopiedWorkspace}`,
            "Do not put the design in the old active workspace.",
            `Rebuild the SaaS / AI Studio page fully inside this target path: ${claudeReferenceTargetWorkspace}`,
            "- Choose your studio",
            "- 6 cards",
            "- Built for real outputs",
            "- responsive",
            "- no RTL",
            "Inspect files first, then implement, then verify."
        ].join("\n");
        const copiedLogRoute = RequestRoutingService.classify(copiedLogDesignPrompt);
        assert.strictEqual(copiedLogRoute.kind, "engineering_modify");
        assert.notStrictEqual(copiedLogRoute.pipeline, "daily_maintenance.modify");
        const originalCodexRunTaskForExplicitTargetPath = CodexRuntimeBridge.runTask;
        let explicitTargetPathRuntimeCalled = false;
        CodexRuntimeBridge.runTask = async (request) => {
            explicitTargetPathRuntimeCalled = true;
            throw new Error(`reference-only target path must not reach coding runtime: ${request.workspacePath}`);
        };
        try {
            const explicitTargetPathResult = await ChatOrchestratorService.handleDirectChat({
                prompt: copiedLogDesignPrompt,
                workspacePath: wrongCopiedWorkspace,
                projectName: "TEST ANG",
                approvalMode: "approve_for_me",
                approved: true,
                sessionId: "explicit-target-path-beats-active-workspace-test"
            });
            assert.strictEqual(explicitTargetPathResult.usedModel, false);
            assert.strictEqual(explicitTargetPathRuntimeCalled, false, "reference-only target path must stop before coding runtime");
            assert.ok(explicitTargetPathResult.response.includes("مسار مرجعي محمي"));
            assert.ok(explicitTargetPathResult.response.includes("E:") || explicitTargetPathResult.response.includes("claude-code"));
        }
        finally {
            CodexRuntimeBridge.runTask = originalCodexRunTaskForExplicitTargetPath;
        }
        const originalCodexRunTaskForUnknownProvider = CodexRuntimeBridge.runTask;
        CodexRuntimeBridge.runTask = async () => ({
            success: false,
            available: true,
            command: "pi",
            args: ["-p", "--provider", "ollama", "[PROMPT]"],
            cwd: workspace,
            durationMs: 1,
            stdout: "Error: Unknown provider \"ollama\". Use --list-models to see available providers/models.",
            stderr: "",
            error: "Error: Unknown provider \"ollama\". Use --list-models to see available providers/models."
        });
        try {
            const unknownOllamaProviderResult = await ChatOrchestratorService.handleDirectChat({
                prompt: dailyMaintenanceNegatedInstallPrompt,
                workspacePath: workspace,
                projectName: "test-workspace",
                approvalMode: "approve_for_me",
                approved: true,
                sessionId: "daily-maintenance-unknown-ollama-provider-test"
            });
            assert.strictEqual(unknownOllamaProviderResult.intent, "code_modification");
            assert.strictEqual(unknownOllamaProviderResult.usedModel, false);
            assert.ok(unknownOllamaProviderResult.response.includes("LM Studio") || unknownOllamaProviderResult.response.includes("Saad Local Direct"));
            assert.ok(unknownOllamaProviderResult.response.includes("Ollama"));
            assert.ok(!unknownOllamaProviderResult.response.includes("Codex Runtime failed"));
            assert.ok(!unknownOllamaProviderResult.response.includes("Command:"));
        }
        finally {
            CodexRuntimeBridge.runTask = originalCodexRunTaskForUnknownProvider;
        }
        const originalCodexRunTaskForUnknownLmStudio = CodexRuntimeBridge.runTask;
        CodexRuntimeBridge.runTask = async () => ({
            success: false,
            available: true,
            command: "pi",
            args: ["-p", "--provider", "lm-studio", "--model", "qwen/qwen3-coder-30b", "[PROMPT]"],
            cwd: workspace,
            durationMs: 1,
            stdout: "Error: Unknown provider \"lm-studio\". Use --list-models to see available providers/models.",
            stderr: "",
            error: "Error: Unknown provider \"lm-studio\". Use --list-models to see available providers/models."
        });
        try {
            const unknownLmStudioProviderResult = await ChatOrchestratorService.handleDirectChat({
                prompt: dailyMaintenanceNegatedInstallPrompt,
                workspacePath: workspace,
                projectName: "test-workspace",
                approvalMode: "approve_for_me",
                approved: true,
                sessionId: "daily-maintenance-unknown-lm-studio-provider-test"
            });
            assert.strictEqual(unknownLmStudioProviderResult.intent, "code_modification");
            assert.strictEqual(unknownLmStudioProviderResult.usedModel, false);
            assert.ok(unknownLmStudioProviderResult.response.includes("lm-studio"));
            assert.ok(unknownLmStudioProviderResult.response.includes("models.json"));
            assert.ok(!unknownLmStudioProviderResult.response.includes("Qwen2.5-Coder-32B-Instruct-Q4_K_M.gguf"));
            assert.ok(!unknownLmStudioProviderResult.response.includes("Codex Runtime failed"));
            assert.ok(!unknownLmStudioProviderResult.response.includes("Command:"));
        }
        finally {
            CodexRuntimeBridge.runTask = originalCodexRunTaskForUnknownLmStudio;
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
            };
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
            assert.ok(expertiseMatches.some((match) => match.item.filePath.includes("model-expertise")), "local model expertise card was not saved and indexed");
        }
        finally {
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
            assert.ok(!files.some((file) => file.includes("imaginary") || file.includes("sentinel")), "failed model expertise extraction must not save a training file");
        }
        finally {
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
            assert.ok(!files.some((file) => file.includes("saas-pricing-tables")), "unconfigured Gemini extraction must not save a training file");
        }
        finally {
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
            assert.ok(geminiMatches.some((match) => match.item.filePath.includes("model-expertise") && match.item.filePath.includes("saas-pricing-tables")), "configured Gemini expertise card was not saved and indexed");
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
        }
        finally {
            ReasoningEngine.requestCompletion = requestCompletionBeforeConfiguredGemini;
            ModelClient.chatCompletion = chatCompletionBeforeConfiguredGemini;
        }
        const requestCompletionBeforeCleanContext = ReasoningEngine.requestCompletion;
        ConversationStateEngine.getState("mojibake-context-sanitize-test").history = [
            { role: "user", content: "\u0627\u0643\u062a\u0628 \u0634\u064a" },
            { role: "assistant", content: "Ø§Ù„Ø±Ø¯ Ø§Ù„Ù…ÙƒØ³ÙˆØ± en.cuckold.info cuckold story" }
        ];
        ReasoningEngine.requestCompletion = async (request) => {
            modelCalls += 1;
            assert.strictEqual(request.role, "Chat", "ordinary conversation must use the Chat model role");
            const userPrompt = String(request.userPrompt || "");
            assert.ok(!userPrompt.includes("Ø"), "model userPrompt must not include mojibake fragments");
            assert.ok(!/en\.cuckold\.info|cuckold story/i.test(userPrompt), "ordinary chat prompt must not inherit unrelated adult training noise");
            return { rawResponse: "\u062c\u0648\u0627\u0628 \u0646\u0638\u064a\u0641 Ø§Ù„" };
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
        }
        finally {
            ReasoningEngine.requestCompletion = requestCompletionBeforeCleanContext;
        }
        const requestCompletionBeforeMinimalCloudSmoke = ReasoningEngine.requestCompletion;
        ConversationStateEngine.getState("minimal-cloud-smoke-context-test").history = [
            { role: "user", content: "old unrelated request" },
            { role: "assistant", content: "Retrieved Knowledge: en.cuckold.info cuckold story private training noise" }
        ];
        ReasoningEngine.requestCompletion = async (request) => {
            modelCalls += 1;
            assert.strictEqual(request.role, "Chat", "short cloud smoke prompts must use the Chat model role");
            const userPrompt = String(request.userPrompt || "");
            assert.ok(userPrompt.includes("\u0627\u062e\u062a\u0628\u0627\u0631 \u0643\u0644\u0627\u0648\u062f \u0641\u0642\u0637"), "short cloud smoke prompt must keep the latest user request");
            assert.ok(!userPrompt.includes("Conversation history:"), `short cloud smoke prompt must not send old conversation history. Actual prompt:\n${userPrompt}`);
            assert.ok(!userPrompt.includes("Relevant private-agent context"), "short cloud smoke prompt must not send pre-answer context");
            assert.ok(!/Retrieved Knowledge|en\.cuckold\.info|cuckold story/i.test(userPrompt), "short cloud smoke prompt must not send unrelated training noise");
            return { rawResponse: "\u0627\u062e\u062a\u0628\u0627\u0631 \u0643\u0644\u0627\u0648\u062f \u0646\u0627\u062c\u062d" };
        };
        try {
            const minimalCloudSmokeResult = await ChatOrchestratorService.handleDirectChat({
                prompt: "\u0627\u0643\u062a\u0628 \u0644\u064a \u062c\u0645\u0644\u0629 \u0642\u0635\u064a\u0631\u0629: \u0627\u062e\u062a\u0628\u0627\u0631 \u0643\u0644\u0627\u0648\u062f \u0641\u0642\u0637",
                workspacePath: workspace,
                projectName: "test-workspace",
                sessionId: "minimal-cloud-smoke-context-test"
            });
            assert.strictEqual(minimalCloudSmokeResult.intent, "conversation");
            assert.strictEqual(minimalCloudSmokeResult.usedModel, true);
            assert.ok(minimalCloudSmokeResult.response.includes("\u0627\u062e\u062a\u0628\u0627\u0631 \u0643\u0644\u0627\u0648\u062f \u0646\u0627\u062c\u062d"), minimalCloudSmokeResult.response);
        }
        finally {
            ReasoningEngine.requestCompletion = requestCompletionBeforeMinimalCloudSmoke;
        }
        const requestCompletionBeforeExpertiseBatch = ReasoningEngine.requestCompletion;
        ReasoningEngine.requestCompletion = async (request) => {
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
            };
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
            assert.ok(batchMatches.filter((match) => match.item.filePath.includes("model-expertise")).length >= 2, "batch local model expertise cards were not saved and indexed");
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
            }
            finally {
                BraveAnswersService.queryImages = imageSearchBeforeSavedKnowledge;
            }
        }
        finally {
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
        }
        finally {
            ReasoningEngine.requestCompletion = requestCompletionBeforeOrdinaryFailure;
        }
        modelCalls = 0;
        const conversationalReview = await PreAnswerReviewService.review("\u0627\u062d\u0686\u064a\u0644\u064a \u0639\u0646 \u0646\u0641\u0633\u064a", workspace, undefined, true);
        assert.ok(conversationalReview.finalContext.includes("\u0633\u0639\u062f"));
        assert.ok(conversationalReview.diagnostics.includes("memory, trained knowledge, session history, and skills searched"));
        const conversationalSkillReview = await PreAnswerReviewService.review("\u0644\u064a\u0634 \u0627\u0644\u0627\u062c\u064a\u0646\u062a \u064a\u0633\u062a\u062f\u0639\u064a \u0627\u0644\u0645\u0648\u062f\u064a\u0644 \u0628\u062f\u0644 \u0627\u0644\u0630\u0627\u0643\u0631\u0629 \u0648\u0627\u0644\u0633\u0643\u0644\u0627\u062a", workspace, undefined, true);
        assert.ok(conversationalSkillReview.skillsLoaded.includes("Agent Orchestration Skill"), "conversational mode must load matching orchestration skills before model formulation");
        assert.ok(conversationalSkillReview.finalContext.includes("Choose deterministic commands, memory recall, trained knowledge"), "matched skill rules must be injected into conversational pre-answer context");
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
        ConversationStateEngine.updateState("immediate-previous-user-message-test", {
            history: [
                { role: "user", content: "\u0647\u0644 \u0627\u0646\u062a \u0645\u062a\u0627\u0643\u062f" }
            ]
        });
        const previousUserMessageResult = await ChatOrchestratorService.handleDirectChat({
            prompt: "\u0645\u0627\u0630\u0627 \u0631\u0633\u0644\u062a \u0644\u0643 \u0641\u064a \u0627\u0644\u0631\u0633\u0627\u0644\u0629 \u0627\u0644\u0633\u0627\u0628\u0642\u0629",
            workspacePath: workspace,
            projectName: "test-workspace",
            sessionId: "immediate-previous-user-message-test"
        });
        assert.strictEqual(previousUserMessageResult.intent, "conversation");
        assert.strictEqual(previousUserMessageResult.usedModel, false);
        assert.ok(previousUserMessageResult.response.includes("\u0647\u0644 \u0627\u0646\u062a \u0645\u062a\u0627\u0643\u062f"));
        assert.ok(!previousUserMessageResult.response.includes("\u0645\u0627 \u0639\u0646\u062f\u064a\u0634 \u0630\u0627\u0643\u0631\u0629"));
        assert.ok(!previousUserMessageResult.response.includes("\u0644\u0627 \u0623\u0645\u0644\u0643 \u0630\u0627\u0643\u0631\u0629"));
        assert.strictEqual(modelCalls, 0, "previous-message recall must use session history without model fallback");
        const persistedHistoryRecallResult = await ChatOrchestratorService.handleDirectChat({
            prompt: "\u0627\u0646\u0627 \u0627\u0639\u0637\u064a\u062a\u0643 \u0627\u0645\u0631 \u0641\u064a \u0627\u0644\u0631\u0633\u0627\u0644\u0629 \u0627\u0644\u0633\u0627\u0628\u0642\u0629",
            workspacePath: workspace,
            projectName: "test-workspace",
            sessionId: "persisted-history-after-restart-test",
            history: [
                {
                    role: "user",
                    content: "\u0627\u0631\u064a\u062f \u0627\u0644\u0627\u0646 \u0627\u0644\u0627\u062c\u064a\u0646\u062a \u0646\u0641\u0633\u0647 \u064a\u062a\u0641\u0639\u0644 \u0641\u064a\u0647 \u0632\u0631 \u0639\u0631\u0628\u064a \u0648 \u0627\u0646\u0643\u0644\u064a\u0632\u064a"
                },
                {
                    role: "assistant",
                    content: "\u0647\u0630\u0627 \u0627\u0644\u0625\u062c\u0631\u0627\u0621 \u064a\u062d\u062a\u0627\u062c \u0645\u0648\u0627\u0641\u0642\u0629 \u0642\u0628\u0644 \u0627\u0644\u062a\u0646\u0641\u064a\u0630."
                }
            ]
        });
        assert.strictEqual(persistedHistoryRecallResult.intent, "conversation");
        assert.strictEqual(persistedHistoryRecallResult.usedModel, false);
        assert.ok(persistedHistoryRecallResult.response.includes("\u0632\u0631 \u0639\u0631\u0628\u064a \u0648 \u0627\u0646\u0643\u0644\u064a\u0632\u064a"));
        assert.ok(!persistedHistoryRecallResult.response.includes("\u0644\u0627 \u0623\u0639\u0631\u0641"));
        assert.strictEqual(modelCalls, 0, "persisted conversation history must hydrate backend state after app restart");
        ConversationStateEngine.updateState("maintenance-certainty-followup-test", {
            history: [
                {
                    role: "assistant",
                    content: "\u062a\u0645 \u062a\u0646\u0641\u064a\u0630 \u0641\u062d\u0635 \u0627\u0644\u0635\u064a\u0627\u0646\u0629 \u0627\u0644\u064a\u0648\u0645\u064a.\n\u0627\u0644\u0645\u0644\u0641\u0627\u062a \u0627\u0644\u062a\u064a \u062a\u0645 \u062a\u0639\u062f\u064a\u0644\u0647\u0627: index.html, styles.css\n\u0627\u0644\u062a\u062d\u0642\u0642: \u062a\u0645."
                }
            ]
        });
        const maintenanceCertaintyResult = await ChatOrchestratorService.handleDirectChat({
            prompt: "\u0647\u0644 \u0627\u0646\u062a \u0645\u062a\u0627\u0643\u062f",
            workspacePath: workspace,
            projectName: "test-workspace",
            sessionId: "maintenance-certainty-followup-test"
        });
        assert.strictEqual(maintenanceCertaintyResult.intent, "conversation");
        assert.strictEqual(maintenanceCertaintyResult.usedModel, false);
        assert.ok(maintenanceCertaintyResult.response.includes("\u0644\u0627 \u0623\u0642\u062f\u0631 \u0623\u0624\u0643\u062f"));
        assert.ok(maintenanceCertaintyResult.response.includes("\u0623\u062a\u062d\u0642\u0642 \u0623\u0648\u0644\u0627"));
        assert.ok(!maintenanceCertaintyResult.response.includes("\u0623\u0646\u0627 \u0645\u062a\u0623\u0643\u062f \u0645\u0646 \u0643\u0644 \u0645\u0627 \u0623\u0642\u0648\u0644\u0647"));
        assert.strictEqual(modelCalls, 0, "maintenance certainty follow-up must not call the model");
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
        ReasoningEngine.requestCompletion = async (request) => {
            modelCalls += 1;
            assert.ok(String(request.systemPrompt || "").includes("short affirmative follow-up"));
            assert.ok(String(request.userPrompt || "").includes("\u0623\u0643\u062a\u0628 \u0644\u0643 \u0631\u0633\u0627\u0644\u0629"));
            return {
                rawResponse: "\u0647\u0630\u0627 \u0646\u0635 \u0631\u0633\u0627\u0644\u0629 \u062f\u0627\u0641\u0626 \u0648\u0645\u0643\u0645\u0644 \u0644\u0644\u0633\u064a\u0627\u0642."
            };
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
        ReasoningEngine.requestCompletion = async (...args) => {
            modelCalls += 1;
            return originalRequestCompletion.apply(ReasoningEngine, args);
        };
        const originalFetch = globalThis.fetch;
        globalThis.fetch = async () => new Response(`<html><head><title>Painter story</title></head><body><nav>${"navigation ".repeat(3000)}</nav><article>Verified fetched painter page content. ${"article ".repeat(4000)} FULL_SOURCE_TAIL</article></body></html>`, { status: 200, headers: { "content-type": "text/html; charset=utf-8" } });
        ReasoningEngine.requestCompletion = async (request) => {
            modelCalls += 1;
            assert.ok(String(request.systemPrompt || "").includes("page was actually retrieved"));
            assert.ok(String(request.userPrompt || "").includes("Verified fetched painter page content."));
            assert.ok(String(request.userPrompt || "").includes("Immediate chat excerpt shortened"));
            assert.ok(String(request.userPrompt || "").length < 20_000, "fetched page prompt must fit small local-model contexts");
            assert.ok(!String(request.userPrompt || "").includes("navigation navigation"));
            assert.ok(!String(request.userPrompt || "").includes("FULL_SOURCE_TAIL"), "distant source text should stay out of the bounded immediate prompt");
            return {
                rawResponse: "\u0642\u0631\u0623\u062a \u0627\u0644\u0635\u0641\u062d\u0629 \u0648\u0647\u0630\u0627 \u0645\u0644\u062e\u0635 \u0645\u062d\u062a\u0648\u0627\u0647\u0627."
            };
        };
        const fetchedPageResult = await ChatOrchestratorService.handleDirectChat({
            prompt: "\u0627\u0641\u062a\u062d \u0647\u0630\u0627 \u0627\u0644\u0645\u0648\u0642\u0639 \u0648\u0627\u0642\u0631\u0623 \u0645\u062d\u062a\u0648\u0627\u0647: https://example.com/painter-story",
            workspacePath: workspace,
            projectName: "test-workspace",
            approvalMode: "approve_for_me"
        });
        assert.strictEqual(fetchedPageResult.usedModel, true);
        assert.ok(fetchedPageResult.response.includes("\u0642\u0631\u0623\u062a \u0627\u0644\u0635\u0641\u062d\u0629"));
        const savedUrlSource = path.join(workspace, ".saad-agent", "training", "lessons", "stories", "example.com-painter-story.md");
        const savedUrlText = await fs.readFile(savedUrlSource, "utf8");
        assert.ok(savedUrlText.includes("Verified fetched painter page content."));
        assert.ok(savedUrlText.includes("FULL_SOURCE_TAIL"), "the complete fetched story must be preserved in permanent training storage");
        const urlRegistry = await KnowledgeIngestionService.ingestTrainingKnowledge(workspace);
        const savedUrlRegistryItem = urlRegistry.items.find((item) => item.filePath.endsWith("example.com-painter-story.md"));
        assert.ok((savedUrlRegistryItem?.chunkCount || 0) > 1, "the complete saved story must be indexed into multiple retrievable chunks");
        const tailMatches = await KnowledgeIngestionService.search(workspace, "FULL_SOURCE_TAIL", 12);
        assert.ok(tailMatches.some((chunk) => chunk.sourcePath.endsWith("example.com-painter-story.md") && chunk.content.includes("FULL_SOURCE_TAIL")), "the distant end of the saved story must remain retrievable from the knowledge index");
        let monitorPageFetched = false;
        globalThis.fetch = async () => {
            monitorPageFetched = true;
            return new Response(`<html><head><title>KIE API updates</title></head><body><main><h1>KIE API updates</h1><article>New KIE API update: seedream endpoint changed and webhook retries improved. ${"KIE API changelog details ".repeat(40)}</article></main></body></html>`, { status: 200, headers: { "content-type": "text/html; charset=utf-8" } });
        };
        const callsBeforeMonitorUrl = modelCalls;
        ReasoningEngine.requestCompletion = async (request) => {
            modelCalls += 1;
            assert.ok(String(request.systemPrompt || "").includes("page was actually retrieved"));
            assert.ok(String(request.userPrompt || "").includes("New KIE API update"));
            return {
                rawResponse: "\u0642\u0631\u0623\u062a \u062a\u062d\u062f\u064a\u062b\u0627\u062a KIE \u0648\u0627\u0633\u062a\u062e\u0631\u062c\u062a \u0627\u0644\u062c\u062f\u064a\u062f."
            };
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
        const monitorUrlSource = path.join(workspace, ".saad-agent", "training", "api-docs", "kie.ai-api-updates.md");
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
        ReasoningEngine.requestCompletion = async (...args) => {
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
        assert.ok(webResult.response.includes("Internet Search: completed") || webResult.response.length > 0, "web search must either perform real search or report a real search failure");
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
        BraveAnswersService.query = async (query) => ({
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
        const deepSearchPlanResult = await ResearchGatewayService.search("STORYBOARD NSFW \u0627\u0628\u062d\u062b \u0641\u064a \u0647\u0630\u0627 \u0627\u0644\u0645\u0648\u0642\u0639 https://civitai.com/ \u0639\u0646");
        assert.ok(deepSearchPlanResult.plannedQueries.length > 1, "deep search must expand one vague request into multiple planned queries");
        assert.ok(deepSearchPlanResult.plannedQueries.some((query) => query.includes("site:civitai.com")));
        assert.ok(deepSearchPlanResult.plannedQueries.some((query) => query.includes("storyboarding comic story page")));
        assert.ok(deepSearchPlanResult.sources[0]);
        assert.strictEqual(deepSearchPlanResult.sources[0].url, "https://civitai.com/articles/29539/civitai-comics-tell-your-story-page-by-page");
        BraveAnswersService.query = async (query) => {
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
        BraveAnswersService.query = async (query) => ({
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
        const agentReachCommands = [];
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
        BraveAnswersService.query = async (query) => ({
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
        const deepResearchCommands = [];
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
        BraveAnswersService.query = async (query) => ({
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
        BraveAnswersService.queryImages = async (query) => ({
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
        globalThis.fetch = async (url, init) => {
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
        const noorImageQueries = [];
        BraveAnswersService.queryImages = async (query) => {
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
        const instagramQueries = [];
        BraveAnswersService.query = async (query) => {
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
            const callsBeforeInstagramProfile = modelCalls;
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
        const publicPageQueries = [];
        BraveAnswersService.query = async (query) => {
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
            const callsBeforeGenericMedia = modelCalls;
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
        const videoQueries = [];
        BraveAnswersService.query = async (query) => {
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
        assert.ok(registry.items.some((item) => item.filePath.endsWith(".saad-agent/training/lessons/uploaded-reference.md")), "saved attachment was not registered as training knowledge");
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
        assert.ok(pdfMatches.some((match) => match.item.fileName === "training-story.pdf" && match.chunks.some((chunk) => chunk.content.includes("full document text"))), "PDF attachment text was not extracted and indexed as searchable training knowledge");
        const callsBeforeTranslation = modelCalls;
        ReasoningEngine.requestCompletion = async (request) => {
            modelCalls += 1;
            assert.ok(String(request.systemPrompt || "").includes("translation task"));
            assert.ok(String(request.systemPrompt || "").includes("Iraqi Arabic"));
            assert.ok(!String(request.userPrompt || "").includes("Trained knowledge matches:"));
            return {
                rawResponse: "\u0647\u0627\u064a \u062a\u0631\u062c\u0645\u0629 \u0639\u0631\u0627\u0642\u064a\u0629 \u0648\u0627\u0636\u062d\u0629 \u0644\u0644\u0646\u0635 \u0627\u0644\u0645\u0637\u0644\u0648\u0628 \u0628\u062f\u0648\u0646 \u0639\u0631\u0636 \u0627\u0644\u0645\u0631\u0627\u062c\u0639 \u0627\u0644\u062e\u0627\u0645."
            };
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
    }
    finally {
        ReasoningEngine.requestCompletion = originalRequestCompletion;
        BraveAnswersService.query = originalBraveQuery;
        BraveAnswersService.queryImages = originalBraveImageQuery;
        for (const [key, value] of Object.entries(originalResearchEnv)) {
            if (typeof value === "undefined") {
                delete process.env[key];
            }
            else {
                process.env[key] = value;
            }
        }
        for (const [key, value] of Object.entries(originalCreativeEnv)) {
            if (typeof value === "undefined") {
                delete process.env[key];
            }
            else {
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
//# sourceMappingURL=test-chat-orchestrator.js.map