import * as path from "path";
import * as fs from "fs/promises";
import { CONFIG } from "../../config.js";
import { BraveAnswersService } from "./brave-answers.js";
import { ContextEngine } from "./context-engine.js";
import { EngineeringMemory } from "./engineering-memory.js";
import { IntentEngine } from "./intent-engine.js";
import { PreAnswerReviewService } from "./pre-answer-review.js";
import { ReasoningEngine } from "./reasoning-engine.js";
import { KnowledgeIngestionService } from "./knowledge-ingestion.js";
import { DomainResolver } from "./domain-resolver.js";
import { KnowledgeManagerService } from "./knowledge-manager.js";
import { ApprovalPolicyService } from "./approval-policy.js";
import { ExecutionPolicyService } from "./execution-policy.js";
import { ExecutionTraceEmitter } from "./execution-trace-emitter.js";
import { TaskStateStore } from "./state-store.js";
import { LearningEngine } from "./learning-engine.js";
import { ConversationStateEngine } from "./conversation-state-engine.js";
import { CodexRuntimeBridge } from "./codex-runtime-bridge.js";
import { InternalWorkspaceExecutor } from "./internal-workspace-executor.js";
import { LocalFileSearchExecutor } from "./local-file-search-executor.js";
import { TrustedWorkspaceRuntime } from "./trusted-workspace-runtime.js";
import { LocalImageClassifierService } from "./local-image-classifier.js";
const MAX_READABLE_ATTACHMENT_BYTES = 180_000;
const READABLE_ATTACHMENT_EXTENSIONS = new Set([
    ".txt",
    ".md",
    ".markdown",
    ".json",
    ".yaml",
    ".yml",
    ".toml",
    ".xml",
    ".html",
    ".css",
    ".js",
    ".jsx",
    ".ts",
    ".tsx",
    ".py",
    ".sh",
    ".ps1",
    ".env.example",
    ".openapi"
]);
export class ChatOrchestratorService {
    static async handleDirectChat(input) {
        const prompt = EngineeringMemory.scrubSecrets(input.prompt || "").trim();
        const sessionId = input.sessionId || input.conversationId || "desktop-chat";
        const userRequestText = ChatOrchestratorService.extractUserRequest(prompt);
        const conversationState = ConversationStateEngine.getState(sessionId);
        // 1. Record user message in history
        if (!conversationState.history) {
            conversationState.history = [];
        }
        const lastMsg = conversationState.history[conversationState.history.length - 1];
        if (!lastMsg || lastMsg.role !== "user" || lastMsg.content !== userRequestText) {
            conversationState.history.push({ role: "user", content: userRequestText });
        }
        if (conversationState.history.length > 10) {
            conversationState.history = conversationState.history.slice(-10);
        }
        // 2. Execute actual chat orchestration logic
        const result = await this.executeDirectChat(input);
        // 3. Record assistant response in history
        if (result && result.response && !result.approvalRequest) {
            let cleanResponse = result.response;
            // Strip === Diagnostics === block if present to avoid history pollution
            if (cleanResponse.startsWith("=== Diagnostics ===")) {
                const parts = cleanResponse.split("\n\n");
                if (parts.length > 1) {
                    cleanResponse = parts.slice(1).join("\n\n");
                }
            }
            // Strip Knowledge Search: block if present
            if (cleanResponse.startsWith("Knowledge Search:")) {
                const lines = cleanResponse.split("\n");
                const emptyLineIdx = lines.findIndex(l => l.trim() === "");
                if (emptyLineIdx !== -1) {
                    cleanResponse = lines.slice(emptyLineIdx + 1).join("\n");
                }
            }
            const lastAssistantMsg = conversationState.history[conversationState.history.length - 1];
            if (!lastAssistantMsg || lastAssistantMsg.role !== "assistant" || lastAssistantMsg.content !== cleanResponse) {
                conversationState.history.push({ role: "assistant", content: cleanResponse });
            }
            if (conversationState.history.length > 10) {
                conversationState.history = conversationState.history.slice(-10);
            }
        }
        return result;
    }
    static async executeDirectChat(input) {
        const prompt = EngineeringMemory.scrubSecrets(input.prompt || "").trim();
        const sessionId = input.sessionId || input.conversationId || "desktop-chat";
        const conversationId = input.conversationId || sessionId;
        const effectiveApprovalMode = ApprovalPolicyService.normalizeMode(input.approvalMode);
        const userRequestText = ChatOrchestratorService.extractUserRequest(prompt);
        const activeWorkspace = await ChatOrchestratorService.resolveWorkspaceFromPrompt(userRequestText, input.workspacePath || CONFIG.PROJECT_ROOT);
        await TrustedWorkspaceRuntime.ensureDefaultWorkspace(activeWorkspace).catch(() => undefined);
        const readableAttachmentContext = await ChatOrchestratorService.buildReadableAttachmentContext(input.attachments);
        const reviewRequestText = readableAttachmentContext
            ? [userRequestText, readableAttachmentContext].join("\n\n")
            : userRequestText;
        const conversationState = ConversationStateEngine.getState(sessionId);
        if (!input.attachments?.length) {
            const normalizedRequest = ChatOrchestratorService.normalizeArabic(userRequestText);
            if (ChatOrchestratorService.isTrainingIngestRequest(userRequestText, normalizedRequest)) {
                return {
                    intent: "training_ingest",
                    usedModel: false,
                    response: "ارفع الملف أولًا، وبعدها اكتب: درّب نفسك على هذا الملف. بدون ملف ما أگدر أسوي تدريب حقيقي."
                };
            }
            if (ChatOrchestratorService.isMemorySave(userRequestText, normalizedRequest)) {
                const fact = ChatOrchestratorService.extractMemoryFact(userRequestText);
                if (!fact) {
                    return {
                        intent: "memory_save",
                        usedModel: false,
                        response: "اكتب المعلومة اللي تريد أحفظها بوضوح، وأحفظها بالذاكرة الدائمة بدون ما أستدعي الموديل."
                    };
                }
                const saved = await EngineeringMemory.addKnowledgeItem({
                    area: "user-memory",
                    description: fact,
                    relatedFiles: []
                });
                return {
                    intent: "memory_save",
                    usedModel: false,
                    response: `تم الحفظ بالذاكرة الدائمة.\nMemory ID: ${saved.id}\nالمعلومة: ${saved.description}`
                };
            }
            if (ChatOrchestratorService.isMemoryRecall(userRequestText, normalizedRequest)) {
                const memory = await EngineeringMemory.searchMemory({});
                const userMemory = memory.knowledgeItems
                    .filter((item) => item.area === "user-memory")
                    .map((item) => ChatOrchestratorService.cleanMemoryDescriptionForDisplay(item.description))
                    .filter(Boolean)
                    .slice(-12);
                return {
                    intent: "memory_recall",
                    usedModel: false,
                    response: ChatOrchestratorService.formatMemoryRecallResponse(userMemory, userRequestText)
                };
            }
        }
        if (ChatOrchestratorService.isPageBlueprintRequest(userRequestText)) {
            const response = ChatOrchestratorService.formatPageBlueprintResponse(userRequestText, conversationState.activeTask);
            ConversationStateEngine.setPendingClarification(sessionId, {
                id: `clarify-page-blueprint-${Date.now()}`,
                question: "Specify the page name or purpose before generating a concrete page blueprint.",
                originalPrompt: userRequestText,
                timestamp: Date.now()
            });
            return {
                intent: "architecture_question",
                usedModel: false,
                response
            };
        }
        if (ChatOrchestratorService.isSaadStudioProjectQuestion(userRequestText)) {
            return {
                intent: "knowledge_lookup",
                usedModel: false,
                response: ChatOrchestratorService.formatSaadStudioProjectResponse()
            };
        }
        if (conversationState.pendingClarification && ChatOrchestratorService.isCasualAcknowledgement(userRequestText)) {
            return {
                intent: "conversation",
                usedModel: false,
                response: "تمام، بس بعدني محتاج التوضيح حتى أكمل صح: اكتب اسم الصفحة أو المطلوب بالضبط."
            };
        }
        if (ChatOrchestratorService.isAgentIdentityQuestion(userRequestText)) {
            return {
                intent: "conversation",
                usedModel: false,
                response: ChatOrchestratorService.formatAgentIdentityResponse(userRequestText)
            };
        }
        if (!conversationState.pendingClarification && ChatOrchestratorService.isCasualAcknowledgement(userRequestText)) {
            return {
                intent: "conversation",
                usedModel: false,
                response: ChatOrchestratorService.formatCasualAcknowledgement(userRequestText)
            };
        }
        if (!input.attachments?.length && ChatOrchestratorService.isSimpleGeneralQuestion(userRequestText)) {
            return await ChatOrchestratorService.answerQuietlyWithTrainingKnowledge(userRequestText, activeWorkspace, input.signal);
        }
        const quietDecision = await ExecutionPolicyService.evaluateDecision(userRequestText, activeWorkspace, effectiveApprovalMode, conversationId);
        if (!input.attachments?.length && ChatOrchestratorService.shouldAnswerQuietly(quietDecision, userRequestText)) {
            return await ChatOrchestratorService.answerQuietlyWithTrainingKnowledge(userRequestText, activeWorkspace, input.signal);
        }
        if (!input.attachments?.length && ChatOrchestratorService.isSimpleGeneralQuestion(userRequestText)) {
            try {
                const response = await ReasoningEngine.requestCompletion({
                    role: "Coding",
                    systemPrompt: [
                        "You are Saad Studio Agent, the user's local AI assistant.",
                        "Never identify yourself as ChatGPT, OpenAI, Gemini, Claude, or the active provider model.",
                        "Always reply in natural Iraqi Arabic unless the user asks for another language.",
                        "This is a simple general question. Do not inspect project files, workspace context, tools, MCP, or training knowledge.",
                        "Answer directly, briefly, respectfully, and clearly. Keep the answer compact."
                    ].join("\n"),
                    userPrompt: userRequestText,
                    signal: input.signal,
                    requestTimeoutMs: 8000,
                    retryCountOverride: 0
                });
                return {
                    intent: "conversation",
                    usedModel: true,
                    response: response.rawResponse
                };
            }
            catch (err) {
                return {
                    intent: "conversation",
                    usedModel: true,
                    response: [
                        "ما گدرت أرجع جواب لأن مزود الموديل ما كمّل الطلب.",
                        "",
                        `السبب: ${err?.message || "Unknown model provider error"}`,
                        "",
                        "هذا سؤال عام وما يحتاج فحص المشروع. إذا تكرر التوقف، راجع اتصال LM Studio والموديل النشط."
                    ].join("\n")
                };
            }
        }
        const taskId = `task-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
        await TaskStateStore.initializeTask(taskId, conversationId); // State: NEW
        ExecutionTraceEmitter.emit({
            taskId,
            conversationId,
            phase: "reading_request",
            status: "done",
            label: "Reading request",
            safeDetails: {
                promptLength: prompt.length,
                attachmentCount: input.attachments?.length || 0,
            },
            sourceService: "ChatOrchestratorService"
        });
        await ApprovalPolicyService.setConversationMode(conversationId, effectiveApprovalMode);
        if (input.alwaysAllow) {
            await ApprovalPolicyService.rememberAlwaysAllow(conversationId, "use_internet");
            await ApprovalPolicyService.rememberAlwaysAllow(conversationId, "import_knowledge");
        }
        const decisionResult = await ExecutionPolicyService.evaluateDecision(userRequestText, activeWorkspace, effectiveApprovalMode, conversationId);
        await TaskStateStore.transitionTask(taskId, "CLASSIFIED", `Decision evaluated: ${decisionResult.decision}`);
        if (decisionResult.decision === "REJECT") {
            await TaskStateStore.transitionTask(taskId, "FAILED", `Execution policy rejected: ${decisionResult.reason}`);
            return {
                intent: "conversation",
                usedModel: false,
                response: `Execution Policy Rejected: ${decisionResult.reason}`
            };
        }
        if (decisionResult.requiresApproval && !input.approved) {
            await this.transitionToApproval(taskId, `Requires approval: ${decisionResult.reason}`);
            const approvalReason = this.formatApprovalReason(decisionResult.reason);
            const approvalAction = /Internet access/i.test(decisionResult.reason) ? "use_internet" : "write_file";
            if (/Project modification/i.test(decisionResult.reason)) {
                ConversationStateEngine.updateState(sessionId, {
                    lastIntent: "code_generation",
                    activeWorkflow: "code_generation",
                    activeTask: userRequestText
                });
            }
            const approvalIntent = approvalAction === "use_internet"
                ? "external_research"
                : "code_generation";
            return {
                intent: approvalIntent,
                usedModel: false,
                response: approvalReason,
                approvalRequest: {
                    requiresApproval: true,
                    action: approvalAction,
                    risk: decisionResult.riskLevel === "critical" ? "high" : decisionResult.riskLevel,
                    reason: approvalReason,
                    files: []
                }
            };
        }
        await TaskStateStore.transitionTask(taskId, "ANALYZING", "Request is classified and allowed to proceed");
        const showDiagnostics = this.wantsDiagnostics(userRequestText);
        if (decisionResult.workflow === "local_image_classification") {
            ConversationStateEngine.updateState(sessionId, {
                lastIntent: "vision_analysis",
                activeWorkflow: "local_image_classification",
                activeTask: userRequestText
            });
            ExecutionTraceEmitter.emit({
                taskId,
                conversationId,
                phase: "evidence_collection",
                status: "done",
                label: "Local image classification routed",
                safeDetails: {
                    modelInvocation: "blocked",
                    workflow: "local_image_classification"
                },
                sourceService: "ExecutionPolicyService"
            });
            await TaskStateStore.transitionTask(taskId, "EVIDENCE_COLLECTION", "Local image folder classification routed without LLM");
            await TaskStateStore.transitionTask(taskId, "VALIDATING", "Checking local image classifier availability");
            const classifierStatus = LocalImageClassifierService.getStatus();
            if (!classifierStatus.available) {
                await TaskStateStore.transitionTask(taskId, "FAILED", classifierStatus.reason || "Local image classifier is not installed");
                return {
                    intent: "vision_analysis",
                    usedModel: false,
                    response: [
                        "صنّفت الطلب محلياً كـ Local Image Classification.",
                        "ما راح أستدعي Qwen أو LM Studio لهذا النوع من الطلبات.",
                        "",
                        "التنفيذ متوقف لأن مصنّف الصور المحلي غير مثبت داخل الحزمة.",
                        `مسار الموديل المتوقع: ${classifierStatus.modelPath}`,
                        "",
                        "الخطوة الهندسية الصحيحة:",
                        "- تثبيت/ربط موديل تصنيف صور محلي.",
                        "- تشغيل Dry Run يعرض التصنيفات المقترحة قبل نقل الصور.",
                        "- بعدها إنشاء الفولدرات ونقل الصور فقط إذا سياسة الوصول تسمح.",
                        "",
                        "بهذا التصحيح، الطلب بعد الآن ما يدخل لمسار الجواب العام ولا يرسل كونتكست طويل للموديل النصي."
                    ].join("\n")
                };
            }
            await TaskStateStore.transitionTask(taskId, "FAILED", "Local classifier runtime is not implemented yet");
            return {
                intent: "vision_analysis",
                usedModel: false,
                response: [
                    "مصنّف الصور المحلي موجود، بس Runtime التصنيف والنقل بعده غير مربوط.",
                    "أوقفت التنفيذ حتى لا أنقل ملفات أو أخمّن تصنيفات بدون محرك فعلي."
                ].join("\n")
            };
        }
        if (decisionResult.workflow === "local_filesystem_search") {
            ConversationStateEngine.updateState(sessionId, {
                lastIntent: "workspace_query",
                activeWorkflow: "local_filesystem_search",
                activeTask: userRequestText
            });
            await TaskStateStore.transitionTask(taskId, "EVIDENCE_COLLECTION", "Collecting trusted workspace search evidence");
            const searchResult = await LocalFileSearchExecutor.run({
                taskId,
                conversationId,
                prompt: userRequestText,
                workspacePath: activeWorkspace,
                limit: 36
            });
            await TaskStateStore.transitionTask(taskId, "VALIDATING", `Trusted workspace search completed with ${searchResult.groups.reduce((sum, group) => sum + group.results.length, 0)} matches`);
            await TaskStateStore.transitionTask(taskId, "GAP_ANALYSIS", "Local search gaps checked");
            await TaskStateStore.transitionTask(taskId, "IMPACT_ANALYSIS", "Local search response impact assessed");
            await TaskStateStore.transitionTask(taskId, "RISK_ASSESSMENT", "Local search is read-only");
            await TaskStateStore.transitionTask(taskId, "SOLUTION_DESIGN", "Preparing trusted workspace search response");
            await TaskStateStore.transitionTask(taskId, "PLANNING", "No file modification planned");
            await TaskStateStore.transitionTask(taskId, "IMPLEMENTING", "Formatting local search results");
            await TaskStateStore.transitionTask(taskId, "VERIFYING", "Local search response prepared");
            await TaskStateStore.transitionTask(taskId, "COMPLETED", "Local trusted workspace search completed");
            return {
                intent: "workspace_query",
                usedModel: false,
                response: searchResult.response
            };
        }
        // 1. Domain Detection (Section 5)
        const domainResult = DomainResolver.resolve(userRequestText);
        if (domainResult.isResolved && domainResult.skipLLM) {
            const entityStr = JSON.stringify(domainResult.entity, null, 2);
            const diagnosticsPrefix = [
                `=== Diagnostics ===`,
                `Intent: ${domainResult.intent}`,
                `Domain: ${domainResult.domain}`,
                `Entity: ${entityStr}`,
                `Brave: Skipped`,
                `LLM: Skipped`,
                `===================`,
                ""
            ].join("\n");
            let friendlyMsg = "";
            if (domainResult.domain === "human_attributes") {
                const entity = domainResult.entity || {};
                const val = entity.chest_size || entity.height || "large";
                friendlyMsg = [
                    "تم بنجاح التعرف على السمة البشرية وتصنيفها كإجراء فوري:",
                    `- **نوع السمة**: حجم الصدر (chest_size)`,
                    `- **القيمة المحددة**: ${val === "large" ? "كبير" : val}`
                ].join("\n");
            }
            else if (domainResult.domain === "iraqi_dialect") {
                friendlyMsg = `تم فهم اللهجة العراقية بنجاح وتوجيه الإجراء التلقائي المناسب: ${domainResult.intent}`;
            }
            else {
                friendlyMsg = `تم تنفيذ الإجراء المحدد تلقائياً دون الحاجة لنموذج الذكاء الاصطناعي: ${domainResult.intent}`;
            }
            await TaskStateStore.transitionTask(taskId, "EVIDENCE_COLLECTION", "Immediate domain resolved");
            await TaskStateStore.transitionTask(taskId, "VALIDATING");
            await TaskStateStore.transitionTask(taskId, "GAP_ANALYSIS");
            await TaskStateStore.transitionTask(taskId, "IMPACT_ANALYSIS");
            await TaskStateStore.transitionTask(taskId, "RISK_ASSESSMENT");
            await TaskStateStore.transitionTask(taskId, "SOLUTION_DESIGN");
            await TaskStateStore.transitionTask(taskId, "PLANNING");
            await TaskStateStore.transitionTask(taskId, "IMPLEMENTING");
            await TaskStateStore.transitionTask(taskId, "VERIFYING");
            await TaskStateStore.transitionTask(taskId, "COMPLETED");
            return {
                intent: domainResult.intent || "conversation",
                usedModel: false,
                response: diagnosticsPrefix + friendlyMsg
            };
        }
        // 2. Intent Engine
        const intentResult = this.detectIntent(userRequestText, sessionId);
        const intent = intentResult.intent;
        if (intent === "conversation" && this.isCasualAcknowledgement(userRequestText)) {
            await this.transitionToComplete(taskId, "Casual acknowledgement completed without engineering execution");
            return {
                intent,
                usedModel: false,
                response: this.formatCasualAcknowledgement(userRequestText)
            };
        }
        // 3. Load Memory / Training / Knowledge (Section 1)
        const preAnswerReview = await PreAnswerReviewService.review(reviewRequestText, activeWorkspace, { taskId, conversationId }, intent === "conversation");
        if (ChatOrchestratorService.isExplicitCodexRuntimeRequest(userRequestText)) {
            await TaskStateStore.transitionTask(taskId, "EVIDENCE_COLLECTION", "Codex bridge context collected");
            await TaskStateStore.transitionTask(taskId, "VALIDATING", "Validating Codex bridge request");
            await TaskStateStore.transitionTask(taskId, "GAP_ANALYSIS", "Checking Codex bridge availability");
            await TaskStateStore.transitionTask(taskId, "IMPACT_ANALYSIS", "Assessing delegated runtime impact");
            await TaskStateStore.transitionTask(taskId, "RISK_ASSESSMENT", "Applying approval policy before Codex runtime");
            await TaskStateStore.transitionTask(taskId, "SOLUTION_DESIGN", "Preparing Codex runtime envelope");
            await TaskStateStore.transitionTask(taskId, "PLANNING", "Delegating explicit request to Codex runtime bridge");
            const codexPrompt = [
                "You are running as the Codex execution runtime behind Saad Studio Agent.",
                "Work only inside the provided trusted workspace.",
                "Do not read or expose secrets, credentials, tokens, cookies, private keys, or .env files.",
                "Use the project rules and context below before acting.",
                "",
                "Saad Agent pre-answer context:",
                preAnswerReview.finalContext,
                "",
                "User request:",
                userRequestText.replace(/^\/codex\s*/i, "").trim(),
                readableAttachmentContext ? ["", readableAttachmentContext].join("\n") : ""
            ].join("\n");
            await TaskStateStore.transitionTask(taskId, "IMPLEMENTING", "Starting Codex runtime bridge");
            const codexResult = await CodexRuntimeBridge.runTask({
                taskId,
                conversationId,
                workspacePath: activeWorkspace,
                prompt: codexPrompt,
                approvalMode: effectiveApprovalMode,
                approved: input.approved,
                sandboxMode: effectiveApprovalMode === "ask" && !input.approved ? "read-only" : "workspace-write"
            });
            if (codexResult.approvalRequest) {
                await this.transitionToApproval(taskId, "Codex runtime requires approval");
                return {
                    intent,
                    usedModel: false,
                    response: "تشغيل Codex Runtime يحتاج موافقة حسب وضع الوصول الحالي.",
                    approvalRequest: codexResult.approvalRequest
                };
            }
            if (codexResult.success) {
                await TaskStateStore.transitionTask(taskId, "VERIFYING", "Codex bridge result captured");
                await TaskStateStore.transitionTask(taskId, "COMPLETED", "Codex runtime completed");
            }
            else {
                const internalResult = await InternalWorkspaceExecutor.tryExecute({
                    taskId,
                    conversationId,
                    workspacePath: activeWorkspace,
                    prompt: userRequestText,
                    attachmentCount: input.attachments?.length || 0,
                    attachmentNames: input.attachments?.map((item) => item.filename) || []
                });
                if (internalResult.handled) {
                    if (internalResult.success) {
                        await TaskStateStore.transitionTask(taskId, "VERIFYING", "Internal executor wrote files");
                        await TaskStateStore.transitionTask(taskId, "COMPLETED", "Internal workspace execution completed");
                    }
                    else {
                        await TaskStateStore.transitionTask(taskId, "FAILED", internalResult.error || "Internal workspace execution failed");
                    }
                    return {
                        intent,
                        usedModel: false,
                        response: internalResult.response
                    };
                }
                await TaskStateStore.transitionTask(taskId, "FAILED", codexResult.error || "Codex runtime failed");
            }
            const output = codexResult.stdout.trim() || codexResult.stderr.trim() || "ماكو output رجع من Codex runtime.";
            return {
                intent,
                usedModel: false,
                response: [
                    codexResult.success ? "Codex Runtime اشتغل ورجع النتيجة:" : "Codex Runtime ما اشتغل بنجاح:",
                    "",
                    codexResult.error ? `السبب:\n${codexResult.error}` : "",
                    "",
                    "الأمر:",
                    `${codexResult.command} ${codexResult.args.join(" ")}`,
                    "",
                    "Workspace:",
                    codexResult.cwd,
                    "",
                    "Output:",
                    output
                ].filter(Boolean).join("\n")
            };
        }
        if (decisionResult.decision === "PLAN" && decisionResult.workflow === "engineering_workflow") {
            ConversationStateEngine.updateState(sessionId, {
                lastIntent: intent,
                activeWorkflow: "engineering_workflow",
                activeTask: userRequestText
            });
            if (InternalWorkspaceExecutor.canHandle(userRequestText)) {
                await TaskStateStore.transitionTask(taskId, "EVIDENCE_COLLECTION", "Internal workspace executor candidate detected");
                await TaskStateStore.transitionTask(taskId, "VALIDATING", "Validating trusted workspace for internal execution");
                await TaskStateStore.transitionTask(taskId, "GAP_ANALYSIS", "Static page request can be handled without model execution");
                await TaskStateStore.transitionTask(taskId, "IMPACT_ANALYSIS", "Preparing file write impact report");
                await TaskStateStore.transitionTask(taskId, "RISK_ASSESSMENT", "Applying approval policy before internal execution");
                await TaskStateStore.transitionTask(taskId, "SOLUTION_DESIGN", "Using deterministic static page generator");
                await TaskStateStore.transitionTask(taskId, "PLANNING", "Internal executor selected");
                await TaskStateStore.transitionTask(taskId, "IMPLEMENTING", "Writing static page files");
                const internalResult = await InternalWorkspaceExecutor.tryExecute({
                    taskId,
                    conversationId,
                    workspacePath: activeWorkspace,
                    prompt: userRequestText,
                    attachmentCount: input.attachments?.length || 0,
                    attachmentNames: input.attachments?.map((item) => item.filename) || []
                });
                if (internalResult.success) {
                    await TaskStateStore.transitionTask(taskId, "VERIFYING", "Internal executor wrote files");
                    await TaskStateStore.transitionTask(taskId, "COMPLETED", "Internal workspace execution completed");
                }
                else {
                    await TaskStateStore.transitionTask(taskId, "FAILED", internalResult.error || "Internal workspace execution failed");
                }
                return {
                    intent,
                    usedModel: false,
                    response: internalResult.response
                };
            }
            await TaskStateStore.transitionTask(taskId, "EVIDENCE_COLLECTION", "Codex bridge context collected");
            await TaskStateStore.transitionTask(taskId, "VALIDATING", "Validating engineering execution request");
            await TaskStateStore.transitionTask(taskId, "GAP_ANALYSIS", "Checking runtime bridge availability");
            await TaskStateStore.transitionTask(taskId, "IMPACT_ANALYSIS", "Assessing trusted workspace impact");
            await TaskStateStore.transitionTask(taskId, "RISK_ASSESSMENT", "Applying approval policy before runtime execution");
            await TaskStateStore.transitionTask(taskId, "SOLUTION_DESIGN", "Preparing execution runtime envelope");
            await TaskStateStore.transitionTask(taskId, "PLANNING", "Delegating engineering request to Codex runtime bridge");
            const codexPrompt = [
                "You are running as the Codex execution runtime behind Saad Studio Agent.",
                "Work only inside the provided trusted workspace.",
                "Do not read or expose secrets, credentials, tokens, cookies, private keys, or .env files.",
                "Use the project rules and context below before acting.",
                "For project modifications, inspect the codebase first, edit only the required files, and run available verification.",
                "",
                "Saad Agent pre-answer context:",
                preAnswerReview.finalContext,
                "",
                "User request:",
                userRequestText,
                readableAttachmentContext ? ["", readableAttachmentContext].join("\n") : ""
            ].join("\n");
            await TaskStateStore.transitionTask(taskId, "IMPLEMENTING", "Starting Codex runtime bridge");
            const codexResult = await CodexRuntimeBridge.runTask({
                taskId,
                conversationId,
                workspacePath: activeWorkspace,
                prompt: codexPrompt,
                approvalMode: effectiveApprovalMode,
                approved: input.approved,
                sandboxMode: effectiveApprovalMode === "ask" && !input.approved ? "read-only" : "workspace-write"
            });
            if (codexResult.approvalRequest) {
                await this.transitionToApproval(taskId, "Codex runtime requires approval");
                return {
                    intent,
                    usedModel: false,
                    response: "Codex runtime needs approval before executing this engineering task.",
                    approvalRequest: codexResult.approvalRequest
                };
            }
            if (codexResult.success) {
                await TaskStateStore.transitionTask(taskId, "VERIFYING", "Codex bridge result captured");
                await TaskStateStore.transitionTask(taskId, "COMPLETED", "Codex runtime completed");
            }
            else {
                const internalResult = await InternalWorkspaceExecutor.tryExecute({
                    taskId,
                    conversationId,
                    workspacePath: activeWorkspace,
                    prompt: userRequestText,
                    attachmentCount: input.attachments?.length || 0,
                    attachmentNames: input.attachments?.map((item) => item.filename) || []
                });
                if (internalResult.handled) {
                    if (internalResult.success) {
                        await TaskStateStore.transitionTask(taskId, "VERIFYING", "Internal executor wrote files");
                        await TaskStateStore.transitionTask(taskId, "COMPLETED", "Internal workspace execution completed");
                    }
                    else {
                        await TaskStateStore.transitionTask(taskId, "FAILED", internalResult.error || "Internal workspace execution failed");
                    }
                    return {
                        intent,
                        usedModel: false,
                        response: internalResult.response
                    };
                }
                await TaskStateStore.transitionTask(taskId, "FAILED", codexResult.error || "Codex runtime failed");
            }
            const output = codexResult.stdout.trim() || codexResult.stderr.trim() || "No output returned from Codex runtime.";
            return {
                intent,
                usedModel: false,
                response: [
                    codexResult.success ? "Codex Runtime completed and returned this result:" : "Codex Runtime failed:",
                    "",
                    codexResult.error ? `Reason:\n${codexResult.error}` : "",
                    "",
                    "Command:",
                    `${codexResult.command} ${codexResult.args.join(" ")}`,
                    "",
                    "Workspace:",
                    codexResult.cwd,
                    "",
                    "Output:",
                    output
                ].filter(Boolean).join("\n")
            };
        }
        // 4. Determine Model Invocation
        let usedModel = true;
        let responseText = "";
        // Bypass LLM for non-LLM actions (Section 1: احفظ / درب نفسك / خزن / تذكر)
        if (intent === "memory_save" || intent === "training_ingest") {
            usedModel = false;
            if (input.attachments && input.attachments.length > 0) {
                const approval = await ApprovalPolicyService.evaluate({
                    mode: effectiveApprovalMode,
                    conversationId,
                    taskId,
                    approved: input.approved,
                    action: "import_knowledge",
                    files: input.attachments.map((item) => item.localPath || item.filename).filter(Boolean),
                    reason: "Saving attachments as permanent training knowledge writes files into the knowledge vault."
                });
                if (approval.request) {
                    await this.transitionToApproval(taskId, "Requires attachment import approval");
                    return {
                        intent,
                        usedModel: false,
                        response: "Saving these attachment(s) as training knowledge requires approval.",
                        approvalRequest: approval.request
                    };
                }
                await ApprovalPolicyService.logAction({
                    mode: effectiveApprovalMode,
                    conversationId,
                    action: "import_knowledge",
                    files: input.attachments.map((item) => item.localPath || item.filename).filter(Boolean)
                }, approval, true, "attachment training import allowed");
                const imported = await KnowledgeIngestionService.importAttachmentsAsTraining(activeWorkspace, input.attachments);
                const importedLines = imported.length
                    ? imported.map((item) => `- ${item.fileName} -> ${item.trainingPath} (${item.category})`)
                    : ["لم أتمكن من حفظ أي مرفق. تأكد أن الملف موجود وليس ملفًا حساسًا أو محذوفًا."];
                responseText = [
                    "تم حفظ المرفقات كمراجع تدريب دائمة وإعادة فهرستها.",
                    ...importedLines
                ].join("\n");
                await this.transitionToComplete(taskId, "Attachments saved successfully");
            }
            else {
                const fact = this.extractMemoryFact(userRequestText);
                if (!fact) {
                    responseText = "اكتب المعلومة التي تريد حفظها بوضوح، وسأحفظها في الذاكرة الدائمة بدون توليد رد من الموديل.";
                    await this.transitionToComplete(taskId, "No fact extracted");
                }
                else {
                    const saved = await EngineeringMemory.addKnowledgeItem({
                        area: "user-memory",
                        description: fact,
                        relatedFiles: []
                    });
                    responseText = `تم الحفظ في الذاكرة الدائمة.\nMemory ID: ${saved.id}\nالمعلومة: ${saved.description}`;
                    await this.transitionToComplete(taskId, "Memory saved successfully");
                }
            }
        }
        else if (intent === "memory_recall") {
            usedModel = false;
            const memory = await EngineeringMemory.searchMemory({});
            const userMemory = memory.knowledgeItems
                .filter((item) => item.area === "user-memory")
                .map((item) => this.cleanMemoryDescriptionForDisplay(item.description))
                .filter(Boolean)
                .slice(-12);
            responseText = this.formatMemoryRecallResponse(userMemory, userRequestText);
            await this.transitionToComplete(taskId, "Memory recalled successfully");
        }
        else if (intent === "knowledge_list") {
            usedModel = false;
            const registryPath = path.join(KnowledgeManagerService.getDirs().registry, "registry.json");
            let count = 0;
            try {
                const content = await fs.readFile(registryPath, "utf8");
                const registry = JSON.parse(content);
                const items = Array.isArray(registry) ? registry : (registry.items || []);
                count = items.length;
            }
            catch { }
            responseText = `المراجع التدريبية الحالية: ${count} ملف.\nلمزيد من التفاصيل، يرجى مراجعة إعدادات المعرفة والتدريب.`;
            await this.transitionToComplete(taskId, "Knowledge list retrieved");
        }
        else if (intent === "knowledge_lookup") {
            usedModel = false;
            const usageReport = PreAnswerReviewService.formatKnowledgeUsageReport(preAnswerReview);
            responseText = `Trained knowledge matches:\n${usageReport}`;
            await this.transitionToComplete(taskId, "Knowledge lookup completed");
        }
        else if (intent === "external_research" || intent === "web_search") {
            usedModel = false;
            try {
                const approval = await ApprovalPolicyService.evaluate({
                    mode: effectiveApprovalMode,
                    conversationId,
                    taskId,
                    approved: input.approved,
                    action: "use_internet",
                    reason: "The user request requires live internet/search access."
                });
                if (approval.request) {
                    await this.transitionToApproval(taskId, "Requires internet search approval");
                    return {
                        intent,
                        usedModel: false,
                        response: "Internet access requires approval before I search.",
                        approvalRequest: approval.request
                    };
                }
                await ApprovalPolicyService.logAction({
                    mode: effectiveApprovalMode,
                    conversationId,
                    action: "use_internet"
                }, approval, true, "internet search allowed");
                const search = await BraveAnswersService.query(userRequestText);
                const sourceBlock = BraveAnswersService.formatSourcesMarkdown(search.sources);
                responseText = [
                    `Internet Search: completed in ${search.latencyMs}ms${search.cacheHit ? " (cache)" : ""}`,
                    "",
                    search.answersText,
                    sourceBlock
                ].join("\n");
                await this.transitionToComplete(taskId, "Internet search completed");
            }
            catch (err) {
                responseText = [
                    "تعذر تنفيذ البحث في الإنترنت فعليًا.",
                    `السبب: ${err?.message || "Unknown search error"}`,
                    "لن أقدم نتائج بحث تخمينية بدون مصدر مباشر."
                ].join("\n");
                await TaskStateStore.transitionTask(taskId, "FAILED", err.message || "Internet search failed");
            }
        }
        else {
            const isGreeting = ChatOrchestratorService.isSimpleGreeting(userRequestText);
            const isConversational = isGreeting || intent === "conversation";
            // 5. Project Context + Prompt Builder + LLM (Reasoning Engine)
            let contextSummary = "No workspace context was retrieved.";
            if (!isConversational) {
                try {
                    const context = await ContextEngine.retrieveContext(userRequestText, activeWorkspace, 4096);
                    contextSummary = context?.items?.slice(0, 6).map((item) => {
                        return `- ${item.title}: ${item.content.slice(0, 700)}`;
                    }).join("\n\n") || "No workspace context was retrieved.";
                }
                catch { }
            }
            // Detect and read local paths from the user's prompt
            let localFileSystemContext = "";
            if (!isConversational) {
                try {
                    localFileSystemContext = await ChatOrchestratorService.detectAndReadLocalPaths(userRequestText);
                }
                catch { }
            }
            const localMatches = isConversational ? [] : KnowledgeManagerService.search(userRequestText);
            // Augment user prompt with matched knowledge rules to force model application (Section 4)
            let promptAugmentationText = "";
            const allMatches = isConversational ? [] : [...preAnswerReview.knowledgeMatches, ...localMatches.map(m => ({ item: { filePath: m.sourcePath, summary: m.summary, title: m.title, category: m.category }, chunks: [] }))];
            if (allMatches.length > 0) {
                promptAugmentationText = "\n\nCRITICAL ENFORCED RULES (You MUST strictly apply these rules to generated plans or code):\n" +
                    allMatches.map((m, idx) => {
                        const chunkText = m.chunks && m.chunks.length > 0 ? m.chunks.map(c => c.content).join("\n") : m.item.summary;
                        return `Trained Rule ${idx + 1} (${m.item.title || m.item.fileName || m.item.filePath}):\n${chunkText}`;
                    }).join("\n\n");
            }
            ExecutionTraceEmitter.emit({
                taskId,
                conversationId,
                phase: "planning",
                status: "skipped",
                label: "Planning skipped",
                safeDetails: {
                    reason: "V1 direct response path does not require generating execution plans"
                },
                sourceService: "Orchestrator"
            });
            ExecutionTraceEmitter.emit({
                taskId,
                conversationId,
                phase: "safety_check",
                status: "done",
                label: "Safety check passed",
                safeDetails: {
                    approvalMode: effectiveApprovalMode
                },
                sourceService: "ApprovalPolicyService"
            });
            ExecutionTraceEmitter.emit({
                taskId,
                conversationId,
                phase: "execution",
                status: "active",
                label: "Executing completion request",
                sourceService: "ReasoningEngine"
            });
            await TaskStateStore.transitionTask(taskId, "EVIDENCE_COLLECTION", "Direct response context collected");
            await TaskStateStore.transitionTask(taskId, "VALIDATING");
            await TaskStateStore.transitionTask(taskId, "GAP_ANALYSIS");
            await TaskStateStore.transitionTask(taskId, "IMPACT_ANALYSIS");
            await TaskStateStore.transitionTask(taskId, "RISK_ASSESSMENT");
            await TaskStateStore.transitionTask(taskId, "SOLUTION_DESIGN");
            await TaskStateStore.transitionTask(taskId, "PLANNING");
            await TaskStateStore.transitionTask(taskId, "IMPLEMENTING", "Invoking reasoning engine for direct chat response");
            let response = null;
            try {
                const systemPrompt = isConversational ? [
                    "You are Saad Studio Agent, the user's local AI assistant.",
                    "Never identify yourself as ChatGPT, Gemini, Claude, OpenAI, or any provider model.",
                    "Always reply in natural Iraqi Arabic unless the user asks for another language.",
                    "Use a natural central Iraqi/Baghdad tone: friendly, smart, fast, respectful, direct, and not theatrical.",
                    "Use words such as: شلون, شنو, ليش, إي, لا, زين, هسه, تره, بعد, يعني, إذا, مو, ماكو, هذني, ذني, هواية, كلش, باجر, اليوم, هالشي, هيچ, عوف, خوش, تمام.",
                    "Do not use non-Iraqi phrases such as: وش, ياخي, مره, رهيب, أبشر, كفو عليك, يخوي, يا زلمة, يعطيك العافية.",
                    "Maintain context using the provided conversation history. Reply directly with a concise, polite, and friendly response."
                ].join("\n") : [
                    "You are Saad Studio Agent, the user's local AI engineering agent, tailored for software development.",
                    "Never identify yourself as ChatGPT, Gemini, Claude, OpenAI, or any provider model.",
                    "Always reply in natural Iraqi Arabic unless the user asks for another language.",
                    "Use a natural central Iraqi/Baghdad tone: friendly, smart, fast, respectful, direct, and not theatrical.",
                    "Use words such as: شلون, شنو, ليش, إي, لا, زين, هسه, تره, بعد, يعني, إذا, مو, ماكو, هذني, ذني, هواية, كلش, باجر, اليوم, هالشي, هيچ, عوف, خوش, تمام.",
                    "Do not use non-Iraqi phrases such as: وش, ياخي, مره, رهيب, أبشر, كفو عليك, يخوي, يا زلمة, يعطيك العافية.",
                    "For technical replies, keep the Iraqi tone while staying precise, e.g. المشكلة مو بالـ API، المشكلة بالـ State Management.",
                    "If the topic is formal or scientific, use a slightly more formal Arabic style with a light Iraqi touch.",
                    "Reply directly with a polite, intelligent, and conversational tone.",
                    "You have direct access to search the internet via the integrated Brave Search tool. You can search the web and summarize online sources when requested.",
                    "Explain technical concepts clearly, structure your answers with markdown headings, tables, or lists, and provide code blocks when helpful.",
                    "Never answer before the orchestrator, memory, training knowledge, and context review have run.",
                    "Obey the Mandatory Pre-Answer Review Context before using model knowledge.",
                    "Use matched trained knowledge when it applies. If it conflicts with model knowledge, prefer trained knowledge.",
                    "Do not claim that you changed files unless an execution tool actually changed files.",
                    "If a provider/model/runtime problem prevents completion, explain the exact problem."
                ].join("\n");
                let userPrompt = "";
                if (isConversational) {
                    const history = conversationState.history || [];
                    if (history.length > 0) {
                        const formattedHistory = history.map((msg) => {
                            const senderName = msg.role === "user" ? "User" : "Assistant";
                            return `${senderName}: ${msg.content}`;
                        }).join("\n\n");
                        userPrompt = [
                            "Conversation history:",
                            formattedHistory,
                            "",
                            "Latest user request:",
                            userRequestText,
                            readableAttachmentContext ? ["", readableAttachmentContext].join("\n") : ""
                        ].join("\n");
                    }
                    else {
                        userPrompt = readableAttachmentContext
                            ? [userRequestText, readableAttachmentContext].join("\n\n")
                            : userRequestText;
                    }
                }
                else {
                    userPrompt = [
                        `Project: ${input.projectName || path.basename(activeWorkspace)}`,
                        preAnswerReview.finalContext,
                        "Retrieved workspace context:",
                        contextSummary,
                        localFileSystemContext ? `Retrieved Local Filesystem Data:\n${localFileSystemContext}` : "",
                        readableAttachmentContext,
                        promptAugmentationText,
                        "User request:",
                        userRequestText
                    ].filter(Boolean).join("\n\n");
                }
                response = await ReasoningEngine.requestCompletion({
                    role: "Coding",
                    systemPrompt,
                    userPrompt,
                    signal: input.signal
                });
                ExecutionTraceEmitter.emit({
                    taskId,
                    conversationId,
                    phase: "execution",
                    status: "done",
                    label: "Execution completed",
                    safeDetails: {
                        responseLength: response.rawResponse?.length || 0
                    },
                    sourceService: "ReasoningEngine"
                });
                ExecutionTraceEmitter.emit({
                    taskId,
                    conversationId,
                    phase: "verification",
                    status: "skipped",
                    label: "Verification skipped",
                    safeDetails: {
                        reason: "not available in V1 path"
                    },
                    sourceService: "ValidationPipelineService"
                });
                // Asynchronously evaluate conversational turn for continuous learning
                LearningEngine.learnFromTurn({
                    taskId,
                    conversationId,
                    prompt,
                    response: response.rawResponse || "",
                    intent,
                    workspace: activeWorkspace
                }).catch((e) => console.warn("LearningEngine.learnFromTurn failed:", e));
                await TaskStateStore.transitionTask(taskId, "VERIFYING", "Completing direct response");
                await TaskStateStore.transitionTask(taskId, "COMPLETED", "Response generated successfully");
            }
            catch (err) {
                const errorMessage = err?.message || "Reasoning execution failed";
                ExecutionTraceEmitter.emit({
                    taskId,
                    conversationId,
                    phase: "execution",
                    status: "failed",
                    label: "Execution failed",
                    error: errorMessage,
                    sourceService: "ReasoningEngine"
                });
                await TaskStateStore.transitionTask(taskId, "FAILED", errorMessage);
                response = {
                    rawResponse: [
                        "ما گدرت أرجع جواب لأن مزود الموديل ما كمّل الطلب.",
                        "",
                        `السبب: ${errorMessage}`,
                        "",
                        "راجع إعدادات المزود والموديل، خصوصاً Endpoint الخاص بـ LM Studio. لازم يكون مثل:",
                        "`http://127.0.0.1:32768`",
                        "والاستدعاء الداخلي يستخدم `/api/v1/chat` أو `/api/v1/chat/completions`."
                    ].join("\n")
                };
            }
            let knowledgePrefix = "";
            if (allMatches.length > 0) {
                const bulletPoints = allMatches.map(m => {
                    return `- Title: ${m.item.title || m.item.fileName || m.item.filePath}\n  Category: ${m.item.category}\n  Summary: ${m.item.summary}\n  Relevance Score: ${("relevanceScore" in m ? m.relevanceScore : 0.8)}`;
                }).join("\n");
                console.log(`Retrieved Knowledge:\n${bulletPoints}\n\nInjected Knowledge: YES\nPrompt Augmentation: YES\nKnowledge Used: YES`);
                knowledgePrefix = showDiagnostics ? [
                    "Retrieved Knowledge:",
                    bulletPoints,
                    "",
                    "Injected Knowledge: YES",
                    "Prompt Augmentation: YES",
                    "Knowledge Used: YES",
                    "",
                    ""
                ].join("\n") : "";
            }
            else {
                console.log("Retrieved Knowledge: none\nInjected Knowledge: NO\nPrompt Augmentation: NO\nKnowledge Used: NO");
                knowledgePrefix = showDiagnostics ? [
                    "Retrieved Knowledge: none",
                    "Injected Knowledge: NO",
                    "Prompt Augmentation: NO",
                    "Knowledge Used: NO",
                    "",
                    ""
                ].join("\n") : "";
            }
            responseText = knowledgePrefix + response.rawResponse;
        }
        // Check dictionary matches
        const isConversationalDiag = ChatOrchestratorService.isSimpleGreeting(userRequestText) || intent === "conversation";
        let dictMatchesCount = 0;
        try {
            const hasDialect = DomainResolver.resolve(userRequestText).domain === "iraqi_dialect";
            const hasHumanAttr = DomainResolver.resolve(userRequestText).domain === "human_attributes";
            if (!isConversationalDiag && (hasDialect || hasHumanAttr)) {
                dictMatchesCount = 1;
            }
        }
        catch { }
        const localMatches = isConversationalDiag ? [] : KnowledgeManagerService.search(userRequestText);
        const allMatches = isConversationalDiag ? [] : [...preAnswerReview.knowledgeMatches, ...localMatches.map(m => ({ item: { filePath: m.sourcePath, summary: m.summary, title: m.title, category: m.category }, chunks: [] }))];
        // 6. Format Diagnostics Prefix (Section 17)
        const diagnosticsPrefix = [
            `Knowledge Search: Keyword/Concept Search`,
            `Documents Found: ${localMatches.length}`,
            `Dictionary Matches: ${dictMatchesCount}`,
            `Project Matches: 0`,
            `Knowledge Used: ${allMatches.length > 0 ? "yes" : "no"}`,
            `LLM Used: ${usedModel ? "yes" : "no"}`,
            `Model Invocation: ${usedModel ? "true" : "false"}`,
            `Reasoning Engine: ${usedModel ? "used" : "bypassed"}`,
            ...(allMatches.length > 0 ? [`Knowledge Sources: ${allMatches.map(m => m.item.title || m.item.fileName || path.basename(m.item.filePath || "")).join(", ")}`] : [])
        ].join("\n");
        const finalResponse = showDiagnostics ? [diagnosticsPrefix, "", responseText].join("\n") : responseText;
        return {
            intent,
            usedModel,
            response: finalResponse
        };
    }
    static wantsDiagnostics(prompt) {
        const normalized = this.normalizeArabic(prompt);
        return /\b(diagnostics?|debug|trace|routing|intent)\b/i.test(prompt)
            || /(تشخيص|شخص|ديباك|مسار النيه|مسار النية|اظهر التشخيص|اعرض التشخيص)/.test(normalized);
    }
    static isExplicitCodexRuntimeRequest(prompt) {
        const normalized = this.normalizeArabic(prompt);
        return /^\/codex\b/i.test(prompt.trim())
            || /\b(use|run|execute)\s+codex\b/i.test(prompt)
            || /(استخدم|شغل|شغّل|نفذ|نفّذ).{0,20}codex/i.test(normalized)
            || /codex.{0,20}(نفذ|نفّذ|شغل|شغّل)/i.test(normalized);
    }
    static formatMemoryRecallResponse(userMemory, prompt = "") {
        if (userMemory.length === 0) {
            return "لا أعرف معلومات محفوظة عنك حتى الآن.";
        }
        const facts = userMemory
            .map((item) => item.trim())
            .filter(Boolean)
            .map((item) => item.replace(/^[-•]\s*/, ""))
            .filter((item) => !this.isTrainingMemoryFact(item))
            .filter((item, index, list) => {
            const normalized = this.normalizeArabic(item);
            return list.findIndex((candidate) => this.normalizeArabic(candidate) === normalized) === index;
        });
        if (facts.length === 0) {
            return "لا أعرف معلومات شخصية محفوظة عنك حتى الآن.";
        }
        if (this.isIdentityRecallPrompt(prompt)) {
            const identityFacts = facts.filter((fact) => this.isIdentityMemoryFact(fact));
            if (identityFacts.length > 0) {
                const strongest = identityFacts.sort((a, b) => b.length - a.length)[0] || identityFacts[identityFacts.length - 1] || "";
                return this.humanizeSingleMemoryFact(strongest);
            }
        }
        if (facts.length === 1) {
            return this.humanizeSingleMemoryFact(facts[0] || "");
        }
        return [
            "أعرف عنك هذه المعلومات:",
            ...facts.map((fact) => `- ${fact}`)
        ].join("\n");
    }
    static humanizeSingleMemoryFact(fact) {
        const normalized = fact.trim();
        const nameMatch = normalized.match(/^(?:اسمي|انا|أنا|اسمي هو)\s+(.+)$/i);
        if (nameMatch?.[1]) {
            return `أنت ${nameMatch[1].trim()}.`;
        }
        return `حسب الذاكرة: ${normalized}`;
    }
    static isIdentityRecallPrompt(prompt) {
        const normalized = this.normalizeArabic(prompt);
        return /(من انا|من اني|منو اني|منو انا|انا منو|اني منو|ما اسمي|شنو اسمي|اسمي شنو|اسمي منو|تعرفني|تتذكرني|who am i|what is my name|do you know me)/i.test(normalized);
    }
    static isIdentityMemoryFact(fact) {
        const normalized = this.normalizeArabic(fact);
        return /(اسمي|انا|اني|مصمم|كرافيك|سعد ستوديو|هذا الاجينت|graphic|designer|my name)/i.test(normalized)
            && !this.isTrainingMemoryFact(fact);
    }
    static isTrainingMemoryFact(fact) {
        const normalized = this.normalizeArabic(fact);
        const lower = fact.toLowerCase();
        return /saad agent core training protocol|permanent training instruction|autonomous learning|experience system|rule\s+\d|\.saad-agent|loading state|error state|empty state/i.test(lower)
            || /(تدرب|تدريب|درب نفسك|بروتوكول|قاعده|قاعدة|كل صفحه|كل صفحة|سمين|ضعيف|صدر كبير|صدر صغير|ارداف|أرداف|شفايف|عضلات|body_type|chest_size|butt_size|lips_)/i.test(normalized);
    }
    static detectIntent(prompt, sessionId) {
        const normalized = this.normalizeArabic(prompt);
        // Explicit Dialect / Direct mapping check (Section 3 & 8)
        const n = normalized;
        if (n.includes("احفظ هذا") || n.includes("احفظ هذه القاعده") || n.includes("احفظ هذه القاعدة") || n.includes("خزن هذا")) {
            return {
                intent: "memory_save",
                confidence: 1.0,
                source: "pattern",
                language: "ar",
                selectedPipeline: "memory.write",
                selectedTools: ["EngineeringMemory"]
            };
        }
        if (n.includes("درب نفسك على هذا الملف") || n.includes("درب نفسك على هذه القاعده") || n.includes("درب نفسك على هذه القاعدة")) {
            return {
                intent: "training_ingest",
                confidence: 1.0,
                source: "pattern",
                language: "ar",
                selectedPipeline: "training.ingest",
                selectedTools: ["AttachmentManager", "KnowledgeIngestionService"]
            };
        }
        if (n.includes("ما الذي دربتك عليه") || n.includes("ما الذي دربتك عليه قبل قليل")) {
            return {
                intent: "memory_recall",
                confidence: 1.0,
                source: "pattern",
                language: "ar",
                selectedPipeline: "memory.read",
                selectedTools: ["EngineeringMemory"]
            };
        }
        if (n.includes("اشرح البروتوكول الذي حفظته") || n.includes("اشرح البروتوكول")) {
            return {
                intent: "knowledge_lookup",
                confidence: 1.0,
                source: "pattern",
                language: "ar",
                selectedPipeline: "knowledge.retrieve",
                selectedTools: ["PreAnswerReviewService", "ContextEngine"]
            };
        }
        if (n.includes("اعرض جميع البروتوكولات التدريبيه") || n.includes("اعرض جميع البروتوكولات التدريبية") || n.includes("اعرض جميع")) {
            return {
                intent: "knowledge_list",
                confidence: 1.0,
                source: "pattern",
                language: "ar",
                selectedPipeline: "knowledge.list",
                selectedTools: ["KnowledgeIngestionService"]
            };
        }
        const engine = new IntentEngine();
        const classified = engine.classifyIntent(prompt, sessionId);
        if (this.isTrainingRecallQuestion(prompt, normalized) && classified.intent === "memory_save") {
            return {
                ...classified,
                intent: "knowledge_lookup",
                confidence: 0.94,
                source: "context",
                matchedPattern: "previous training recall question",
                reason: "User asks about previous training, not a new save operation.",
                selectedPipeline: "knowledge.retrieve",
                selectedTools: ["PreAnswerReviewService", "ContextEngine"],
            };
        }
        if (this.isMemorySave(prompt, normalized) && classified.intent !== "training_ingest") {
            return {
                ...classified,
                intent: "memory_save",
                confidence: Math.max(classified.confidence, 0.95),
                source: "pattern",
                matchedPattern: classified.matchedPattern || "direct memory save pattern",
                reason: classified.reason || "User asks to save memory.",
                selectedPipeline: "memory.write",
                selectedTools: ["EngineeringMemory"],
            };
        }
        if (this.isMemoryRecall(prompt, normalized)) {
            return {
                ...classified,
                intent: "memory_recall",
                confidence: Math.max(classified.confidence, 0.95),
                source: "pattern",
                matchedPattern: classified.matchedPattern || "direct memory recall pattern",
                reason: classified.reason || "User asks to recall memory.",
                selectedPipeline: "memory.read",
                selectedTools: ["EngineeringMemory"],
            };
        }
        if (this.isExplicitInternetSearch(prompt, normalized)) {
            return {
                ...classified,
                intent: "external_research",
                confidence: Math.max(classified.confidence, 0.95),
                source: "pattern",
                matchedPattern: classified.matchedPattern || "explicit external research pattern",
                reason: classified.reason || "User asks for internet/current information.",
                selectedPipeline: "research.external",
                selectedTools: ["BraveAnswersService"],
            };
        }
        // Demote non-explicit search to workspace_query (Section 6)
        if ((classified.intent === "external_research" || classified.intent === "web_search" || classified.intent === "internet_answers") && !this.isExplicitInternetSearch(prompt, normalized)) {
            classified.intent = "workspace_query";
            classified.selectedPipeline = "workspace.query";
            classified.selectedTools = ["ContextEngine"];
        }
        return classified;
    }
    static isMemorySave(prompt, normalized) {
        const lower = prompt.toLowerCase();
        const saveSignals = /\b(remember|save|store|memorize)\b/i.test(lower)
            || /(احفظ|حفظ|تذكر|تذكّر|خزن|خزّن|سجل|سجّل|ثبت|ثبّت)/.test(normalized);
        const trainingSignals = /\b(train|training|learn from|use as reference|save as reference|store as reference)\b/i.test(lower)
            || /(?:^|\s)(?:درب|تدريب)\s+(?:نفسك|على|هذا|هذه|هذي|هاي|الملف|الصوره|الصورة|المرفق)/.test(normalized)
            || /(?:احفظ|حفظ|خزن|سجل|ثبت|استخدم|اعتمد).*(?:مرجع|مراجع|تدريب)/.test(normalized)
            || /(?:هذا|هذه|هذي|هاي|الملف|الصوره|الصورة|المرفق)\s+(?:مرجع|للتدريب)/.test(normalized);
        const recallQuestion = this.isMemoryRecall(prompt, normalized)
            || /\?/.test(prompt);
        return (saveSignals || trainingSignals) && !recallQuestion;
    }
    static isTrainingIngestRequest(prompt, normalized) {
        const lower = prompt.toLowerCase();
        return /\b(train|training|learn from|use as reference|save as reference)\b/i.test(lower)
            || /(?:درب|درّب|تدريب).*(?:نفسك|الملف|هذا الملف|هذه الملف|المرفق|الصوره|الصورة)/.test(normalized)
            || /(?:هذا|هذه|هذي|هاي|الملف|الصوره|الصورة|المرفق).*(?:للتدريب|مرجع)/.test(normalized);
    }
    static isTrainingRecallQuestion(prompt, normalized) {
        const lower = prompt.toLowerCase();
        return /\b(what did i train you on|what have you learned|explain what you learned|trained knowledge)\b/i.test(lower)
            || /(?:الذي|اللي|ما|ماذا|اشرح|اذكر|شنو|ماهو|ما هو).*(?:دربك|دربتك|تدربت|تعلمت|المعرفه المدربه|المعرفة المدربة|التدريب السابق|قبل)/.test(normalized)
            || /(?:دربك|دربتك|تدربت).*(?:قبل|سابقا|سابقاً|عليه)/.test(normalized);
    }
    static isMemoryRecall(prompt, normalized) {
        return /(من انا|من اني|منو اني|منو انا|انا منو|اني منو|ما اسمي|شنو اسمي|اسمي شنو|اسمي منو|تعرفني|تتذكرني|ماذا تعرف عني|شنو تعرف عني|شنو تعرف علي|ماذا تتذكر عني|شنو تتذكر عني|شنو حافظ عني|شنو مخزن عني|شنو ذاكر عني|اكو شي تعرفه عني|اكو شي حافظه عني|معلوماتي|what do you remember about me|what do you know about me|who am i|what is my name|do you know me|my info)/i.test(normalized);
    }
    static isExplicitInternetSearch(prompt, normalized) {
        const lower = prompt.toLowerCase();
        const asksLocalScope = /(داخل المشروع|في المشروع|بالمشروع|داخل الملفات|في الملفات|بالملفات|داخل الكود|في الكود|workspace|project files|local files|codebase)/i.test(normalized)
            || /\b(workspace|codebase|local files|project files)\b/i.test(lower);
        const allowedTriggers = /(ابحث في الانترنت|ابحث في الإنترنت|ابحث بالويب|اخر تحديث|آخر تحديث|وثائق|توثيق|اخبار|أخبار|مستندات)/i.test(normalized)
            || /\b(search online|search web|latest|official docs|documentation|api docs|news)\b/i.test(lower);
        const explicitLinksOrSources = /(?:\u0627\u0639\u0637\u0646\u064a|\u0627\u0639\u0637\u064a\u0646\u064a|\u0647\u0627\u062a|\u0627\u0631\u064a\u062f|\u0627\u0628\u062d\u062b|\u0627\u0628\u062d\u062b\u0644\u064a).*(?:\u0631\u0648\u0627\u0628\u0637|\u0645\u0635\u0627\u062f\u0631|\u0644\u0646\u0643\u0627\u062a|\u0644\u064a\u0646\u0643\u0627\u062a|\u0635\u0648\u0631)/.test(normalized)
            || /\b(give me links|give me sources|links|sources|find images|image search)\b/i.test(lower);
        const directSearchVerb = /(?:^|\s)(?:ابحثلي|ابحث\s+لي|ابحث|دورلي|دور\s+لي|دور|فتشلي|فتش\s+لي|فتش|جيبلي\s+معلومات|جيب\s+لي\s+معلومات|هاتلي\s+معلومات|هات\s+لي\s+معلومات|طلعلي\s+معلومات|طلع\s+لي\s+معلومات)(?:\s|$)/i.test(normalized)
            || /\b(?:search for|look up|research|find info about|find information about)\b/i.test(lower);
        const externalTopicSignal = /[A-Za-z][A-Za-z0-9_.\-/]*(?:\s+\d+(?:\.\d+)*)?/i.test(prompt)
            || /\d+(?:\.\d+)+/.test(prompt)
            || /(موديل|نموذج|شركة|منتج|منصة|خدمة|تقنية|اصدار|إصدار|نسخه|نسخة|معلومات|تفاصيل|سعر|اسعار|أسعار|وثائق|توثيق|مصادر|روابط)/i.test(normalized);
        const directExternalSearch = directSearchVerb && externalTopicSignal && !asksLocalScope;
        return allowedTriggers || explicitLinksOrSources || directExternalSearch;
    }
    static shouldAnswerQuietly(decision, prompt) {
        if (decision.requiresApproval)
            return false;
        if (!["ANSWER", "EXPLAIN"].includes(decision.decision))
            return false;
        if ([
            "engineering_workflow",
            "external_research",
            "local_filesystem_search",
            "local_image_classification",
            "safety_rejection"
        ].includes(decision.workflow)) {
            return false;
        }
        if (this.isCasualAcknowledgement(prompt) || this.isAgentIdentityQuestion(prompt))
            return false;
        return true;
    }
    static async answerQuietlyWithTrainingKnowledge(userRequestText, activeWorkspace, signal) {
        try {
            const preAnswerReview = await PreAnswerReviewService.review(userRequestText, activeWorkspace, undefined, false);
            const trainingNotice = preAnswerReview.knowledgeMatches.length
                ? `Matched trained knowledge files: ${preAnswerReview.knowledgeMatches.length}`
                : "No matching trained knowledge found. Answering from model knowledge only.";
            const response = await ReasoningEngine.requestCompletion({
                role: "Coding",
                systemPrompt: [
                    "You are Saad Studio Agent, the user's local AI engineering assistant.",
                    "Never identify yourself as ChatGPT, OpenAI, Gemini, Claude, or the active provider model.",
                    "Always reply in natural Iraqi Arabic unless the user asks for another language.",
                    "Answer naturally and briefly unless the user asks for detail.",
                    "Before answering, use the provided memory, training knowledge, project rules, and skills context.",
                    "If no matching trained knowledge is present, do not pretend that training was used.",
                    "Do not print execution diagnostics or an execution trace in the final answer.",
                    "",
                    trainingNotice,
                    "",
                    preAnswerReview.finalContext
                ].join("\n"),
                userPrompt: userRequestText,
                signal,
                requestTimeoutMs: 12000,
                retryCountOverride: 0
            });
            return {
                intent: "conversation",
                usedModel: true,
                response: response.rawResponse
            };
        }
        catch (err) {
            return {
                intent: "conversation",
                usedModel: true,
                response: [
                    "ما گدرت أرجع جواب لأن مزود الموديل ما كمّل الطلب.",
                    "",
                    `السبب: ${err?.message || "Unknown model provider error"}`,
                    "",
                    "بس المهم: هذا المسار هسه يراجع الذاكرة والتدريب قبل استدعاء الموديل، وما يطلع Execution Trace للمحادثة العادية."
                ].join("\n")
            };
        }
    }
    static isSimpleGreeting(prompt) {
        const normalized = this.normalizeArabic(prompt);
        const greetings = [
            "اهلا", "هلا", "يا هلا", "ياهلا", "مرحبا", "مرحبى", "مرحبي", "مراحب", "سلام",
            "السلام عليكم", "صباح الخير", "مساء الخير", "hello", "hi", "hey"
        ];
        return greetings.includes(normalized);
    }
    static isSimpleGeneralQuestion(prompt) {
        const normalized = this.normalizeArabic(prompt);
        const lower = prompt.trim().toLowerCase();
        const words = normalized.split(/\s+/).filter(Boolean);
        if (words.length === 0 || words.length > 18)
            return false;
        const asksQuestion = /\?/.test(prompt)
            || /^(?:منو|من|ما|ماذا|شنو|شني|ليش|لماذا|هل|اين|وين|متى|كم|كيف|شلون)\b/.test(normalized)
            || /^(?:who|what|why|where|when|how|is|are|do|does|did)\b/i.test(lower)
            || /(?:عندي سؤال|اريد اسال|اريد اسأل|سؤال).{0,30}(?:منو|من هو|شنو|ما هو|ليش|لماذا|وين|اين|متى|شلون|كيف)/.test(normalized)
            || /(?:منو هو|من هو|شنو هو|ما هو)/.test(normalized);
        if (!asksQuestion)
            return false;
        const engineeringSignals = /(كود|برمج|مشروع|ملف|فولدر|صفحه|صفحة|route|component|api|provider|model|workspace|mcp|terminal|git|build|test|lint|fix|bug|error|review|deploy|install|npm|next|react|electron|saad studio|سعد ستوديو|اصلح|عدّل|عدل|سوّي|سوي|انشئ|انشء|اضف|اربط|افتح|ابحث|احفظ|درب|تذكر|خزن)/i;
        if (engineeringSignals.test(normalized) || engineeringSignals.test(lower))
            return false;
        const localPathSignal = /[a-zA-Z]:[\\/]|\.env|\.ts\b|\.tsx\b|\.js\b|\.json\b|\/|\\/;
        if (localPathSignal.test(prompt))
            return false;
        return true;
    }
    static isAgentIdentityQuestion(prompt) {
        const normalized = this.normalizeArabic(prompt);
        const lower = prompt.trim().toLowerCase();
        return /^(?:منو انت|منو انته|من انت|من أنت|انت منو|انته منو|شنو انت|ما انت|عرفني بنفسك|تكلم عن نفسك)$/.test(normalized)
            || /^(?:who are you|what are you|introduce yourself)$/i.test(lower);
    }
    static isSaadStudioProjectQuestion(prompt) {
        const normalized = this.normalizeArabic(prompt);
        const lower = prompt.trim().toLowerCase();
        return /(?:ماهو|ما هو|شنو|عرفني|اشرح).{0,20}(?:مشروع)?\s*(?:سعد ستوديو|saad studio)/i.test(normalized)
            || /(?:what is|explain|describe).{0,30}(?:saad studio)/i.test(lower);
    }
    static formatSaadStudioProjectResponse() {
        return [
            "مشروع سعد ستوديو هو منظومة وكيل هندسي محلي داخل تطبيق Electron، مربوط بواجهة دردشة وذاكرة مشروع وتدريب ومعرفة.",
            "",
            "حسب مرجع المشروع الحالي، الهدف منه يساعدك بالشغل اليومي: قراءة المشروع، فهم السياق، حفظ المعرفة، مراجعة الملفات، التخطيط للتعديلات، وتشغيل مهام آمنة داخل الـ trusted workspace بعد الموافقة.",
            "",
            "وبالنسبة لمرجع Premiere: أكو جزء خاص بإضافة CEP لـ Premiere Pro 26.2.0، يعتمد FFmpeg للتحليل الصوتي، ويدعم Multi-Cam Auto Switch وSilence Removal.",
            "",
            "يعني باختصار: هو مساعدك الشخصي والهندسي لسعد ستوديو، مو دردشة عامة فقط."
        ].join("\n");
    }
    static formatAgentIdentityResponse(prompt) {
        const normalized = this.normalizeArabic(prompt);
        if (/منو|شنو|انته|انت/.test(normalized)) {
            return "آني Saad Studio Agent، وكيلك الهندسي المحلي. إذا عندك كود، مشروع، ملف، أو مشكلة، كلّي وشوف شلون أگدر أساعدك.";
        }
        return "I am Saad Studio Agent, your local AI engineering agent. I help with code, projects, workspace knowledge, memory, and safe task execution.";
    }
    static isCasualAcknowledgement(prompt) {
        const normalized = this.normalizeArabic(prompt);
        const lower = prompt.trim().toLowerCase();
        const words = normalized.split(/\s+/).filter(Boolean);
        const isShort = words.length <= 5;
        const thanks = /^(?:شكرا|شكرا لك|مشكور|ممنون|ممتن|تسلم|سلمت|يعطيك العافيه|يعطيك العافية|thank you|thanks|thx)$/i.test(normalized)
            || /^(?:thank you|thanks|thx)$/i.test(lower);
        const ok = /^(?:تمام|زين|اوكي|حاضر|تم|اي|إي|نعم|ok|okay)$/i.test(normalized)
            || /^(?:ok|okay)$/i.test(lower);
        const smallTalk = /^(?:شلونك|شخبارك|كيفك|كيف الحال)$/.test(normalized);
        const greeting = this.isSimpleGreeting(prompt);
        return isShort && (thanks || ok || smallTalk || greeting);
    }
    static formatCasualAcknowledgement(prompt) {
        const normalized = this.normalizeArabic(prompt);
        if (/^(?:شكرا|شكرا لك|مشكور|ممنون|ممتن|تسلم|سلمت|يعطيك العافيه|يعطيك العافية)/i.test(normalized)) {
            return "العفو سعد، حاضر.";
        }
        if (/^(?:شلونك|شخبارك|كيفك|كيف الحال)$/.test(normalized)) {
            return "هلا بيك، الحمد لله بخير. شلونك إنت؟ شتحتاج؟";
        }
        if (/^(?:مساء الخير)$/.test(normalized)) {
            return "مساء النور، أهلًا وسهلًا بيك. شلون أگدر أساعدك الليلة؟";
        }
        if (/^(?:صباح الخير)$/.test(normalized)) {
            return "صباح النور، أهلًا وسهلًا بيك. شلون أگدر أساعدك اليوم؟";
        }
        if (/^(?:ياهلا|يا هلا)$/.test(normalized)) {
            return "ياهلا وغلا. شنو أگدر أساعدك بيه اليوم؟";
        }
        if (/^(?:مراحب)$/.test(normalized)) {
            return "مراحب بيك.";
        }
        if (/^(?:تمام|زين|اوكي|حاضر|تم|اي|نعم|ok|okay)$/.test(normalized)) {
            return "تمام سعد، حاضر.";
        }
        return "أهلًا وسهلًا. شلون أگدر أساعدك اليوم؟";
    }
    static isPageBlueprintRequest(prompt) {
        const normalized = this.normalizeArabic(prompt || "");
        return /(?:مخطط|هيكل|وايرفريم|wireframe|blueprint|layout).*(?:صفحه|صفحة|page)/i.test(normalized)
            || /(?:اعطيني|اعطني|اريد|هات).*(?:مخطط|هيكل|وايرفريم).*(?:صفحه|صفحة|page)/i.test(normalized);
    }
    static formatPageBlueprintResponse(prompt, activeTask) {
        const subject = this.extractPageSubject(prompt) || this.extractPageSubject(activeTask || "");
        if (!subject) {
            return [
                "أگدر أسويلك مخطط صفحة، بس ما راح أخترع صفحة من عندي.",
                "اكتبلي اسم الصفحة أو وظيفتها، مثل:",
                "- صفحة لانجري",
                "- صفحة تسجيل دخول",
                "- صفحة Dashboard",
                "",
                "بعدها أعطيك مخطط واضح: الأقسام، المكونات، البيانات، الحالات، ومسار الملفات المقترح."
            ].join("\n");
        }
        return [
            `هذا مخطط أولي لصفحة ${subject}:`,
            "",
            "1. الهدف",
            `- توضيح وظيفة صفحة ${subject} للمستخدم بدون افتراض API أو ملفات غير موجودة.`,
            "",
            "2. أقسام الصفحة",
            "- Header مختصر: عنوان الصفحة ووصف سريع.",
            "- Hero / Intro: شنو تقدم الصفحة وليش المستخدم يحتاجها.",
            "- Content area: كروت أو أقسام حسب نوع الصفحة.",
            "- Actions: أزرار واضحة مثل عرض التفاصيل أو إنشاء عنصر.",
            "- Empty State: إذا ماكو بيانات.",
            "- Loading State: أثناء تحميل البيانات.",
            "- Error State: إذا فشل التحميل.",
            "",
            "3. المكونات المقترحة",
            "- PageShell",
            "- PageHeader",
            "- ContentGrid أو DetailsPanel",
            "- EmptyState",
            "- ErrorState",
            "- LoadingState",
            "",
            "4. قبل التنفيذ",
            "- أحتاج منك تأكيد اسم المسار والمحتوى المطلوب قبل كتابة ملفات."
        ].join("\n");
    }
    static extractPageSubject(text) {
        const normalized = this.normalizeArabic(text || "");
        const explicitMatch = normalized.match(/(?:صفحه|صفحة|page)\s+(?:خاصه|خاصة|ل|لل|عن)?\s*([\w\u0600-\u06FF-]+)/i);
        if (explicitMatch?.[1])
            return explicitMatch[1];
        const knownPage = normalized.match(/(?:لانجري|لانجرى|لاندنق|landing|login|dashboard|settings|pricing|gallery)/i);
        return knownPage?.[0] || null;
    }
    static formatApprovalReason(reason) {
        if (/Internet access/i.test(reason)) {
            return "هذا الطلب يحتاج استخدام الإنترنت، وما راح أطلع نتائج أو روابط وهمية. وافق على البحث حتى أنفذه فعلياً.";
        }
        if (/Project modification/i.test(reason)) {
            return "هذا طلب تعديل على المشروع ويحتاج موافقتك قبل التنفيذ.";
        }
        return `هذا الإجراء يحتاج موافقتك قبل التنفيذ: ${reason}`;
    }
    static isKnowledgeUsageQuestion(prompt) {
        return /what trained knowledge did you use|ما(?:ذا)? المعرفة المدربة|ما المعرفة التي استخدمت|أي معرفة مدربة/i.test(prompt || "");
    }
    static extractMemoryFact(prompt) {
        return EngineeringMemory.scrubSecrets(this.extractUserRequest(prompt))
            .replace(/^(احفظ|حفظ|تذكر|تذكّر|خزن|خزّن|سجل|سجّل|ثبت|ثبّت|درب|درّب|تدريب)\s*(هذا|هذه|هاي|هذي|المعلومة|التالي|الملف|:)?\s*/i, "")
            .replace(/^(remember|save|store|memorize|train|training|learn from)\s*(this|that|the following|file|:)?\s*/i, "")
            .replace(/^(use\s+)?(this|that)?\s*(as\s+a\s+)?reference\s*:?\s*/i, "")
            .trim();
    }
    static extractUserRequest(prompt) {
        const marker = /(?:^|\n)User request:\s*/i.exec(prompt);
        if (!marker || marker.index === undefined) {
            return prompt;
        }
        return prompt.slice(marker.index + marker[0].length).trim();
    }
    static cleanMemoryDescriptionForDisplay(description) {
        const userRequest = this.extractUserRequest(description || "");
        return EngineeringMemory.scrubSecrets(userRequest)
            .split(/\r?\n/)
            .map((line) => line.trim())
            .filter((line) => line && !/^(Composer action|Runtime agent|Runtime model|Runtime provider|Runtime skill|Requested MCP tool|Workspace)\s*:/i.test(line))
            .join("\n")
            .trim();
    }
    static isReadableAttachment(attachment) {
        const mimeType = (attachment.mimeType || "").toLowerCase();
        const fileName = (attachment.filename || attachment.localPath || "").toLowerCase();
        const ext = path.extname(fileName);
        if (mimeType.startsWith("text/"))
            return true;
        if (mimeType.includes("json") || mimeType.includes("yaml") || mimeType.includes("xml") || mimeType.includes("markdown"))
            return true;
        return READABLE_ATTACHMENT_EXTENSIONS.has(ext);
    }
    static async buildReadableAttachmentContext(attachments) {
        if (!attachments?.length)
            return "";
        const blocks = [];
        for (const attachment of attachments) {
            const sourcePath = attachment.localPath;
            const safeName = EngineeringMemory.scrubSecrets(attachment.filename || path.basename(sourcePath || "attachment"));
            if (!sourcePath || !this.isReadableAttachment(attachment)) {
                blocks.push([
                    `Attachment: ${safeName}`,
                    `Status: metadata-only`,
                    `Reason: attachment is not a supported readable text file in the current runtime.`
                ].join("\n"));
                continue;
            }
            const stat = await fs.stat(sourcePath).catch(() => null);
            if (!stat?.isFile()) {
                blocks.push([
                    `Attachment: ${safeName}`,
                    `Status: unavailable`,
                    `Reason: stored attachment file was not found.`
                ].join("\n"));
                continue;
            }
            if (stat.size > MAX_READABLE_ATTACHMENT_BYTES) {
                const rawPartial = await fs.readFile(sourcePath, "utf8").catch(() => "");
                const safePartial = EngineeringMemory.scrubSecrets(rawPartial.slice(0, MAX_READABLE_ATTACHMENT_BYTES));
                blocks.push([
                    `Attachment: ${safeName}`,
                    `Mime: ${attachment.mimeType || "unknown"}`,
                    `Size: ${stat.size} bytes`,
                    `Status: read-partial`,
                    `Content truncated to ${MAX_READABLE_ATTACHMENT_BYTES} bytes for model context safety.`,
                    "",
                    safePartial
                ].join("\n"));
                continue;
            }
            const raw = await fs.readFile(sourcePath, "utf8").catch(() => "");
            const safeContent = EngineeringMemory.scrubSecrets(raw);
            blocks.push([
                `Attachment: ${safeName}`,
                `Mime: ${attachment.mimeType || "unknown"}`,
                `Size: ${stat.size} bytes`,
                `Status: read`,
                "",
                safeContent
            ].join("\n"));
        }
        if (!blocks.length)
            return "";
        return [
            "Readable attachment context:",
            "Use this content as primary evidence when the user asks about the attachment.",
            "Do not pretend unreadable attachments were read.",
            "",
            blocks.map((block, index) => `--- Attachment ${index + 1} ---\n${block}`).join("\n\n")
        ].join("\n");
    }
    static normalizeArabic(input) {
        return input
            .toLowerCase()
            .replace(/[\u064B-\u065F\u0670]/g, "")
            .replace(/[إأآٱ]/g, "ا")
            .replace(/ى/g, "ي")
            .replace(/ة/g, "ه")
            .replace(/[؟?!.،,؛:()"']/g, " ")
            .replace(/\s+/g, " ")
            .trim();
    }
    static extractFirstLocalPath(prompt) {
        const match = prompt.match(/[a-zA-Z]:[\\/][^\r\n"'<>|]+/);
        if (!match)
            return null;
        return match[0]
            .replace(/[`"'<>]+/g, "")
            .replace(/[.،,؛;؟?!]+$/g, "")
            .trim();
    }
    static async resolveWorkspaceFromPrompt(prompt, fallbackWorkspace) {
        const candidate = ChatOrchestratorService.extractFirstLocalPath(prompt);
        if (!candidate)
            return fallbackWorkspace;
        let current = candidate;
        while (current.length > 3) {
            const stat = await fs.stat(current).catch(() => null);
            if (stat?.isDirectory())
                return current;
            if (stat?.isFile())
                return path.dirname(current);
            const trimmed = current.replace(/[\\/]$/, "");
            const lastSpaceIdx = trimmed.lastIndexOf(" ");
            if (lastSpaceIdx > 2) {
                current = trimmed.slice(0, lastSpaceIdx).trim();
                continue;
            }
            const parent = path.dirname(trimmed);
            if (!parent || parent === trimmed)
                break;
            current = parent;
        }
        return fallbackWorkspace;
    }
    static async detectAndReadLocalPaths(prompt) {
        const pathRegex = /([a-zA-Z]:[\\/][^:?*"<>|]+|(?:\/usr|\/home|\/var|\/opt|\/etc|\/bin)[^:?*"<>|]+)/g;
        let matches = prompt.match(pathRegex) || [];
        const resolvedBlocks = [];
        for (let match of matches) {
            let cleanPath = match.trim();
            cleanPath = cleanPath.replace(/[.،,؛:?؟!]+$/, "").trim();
            let found = false;
            let current = cleanPath;
            while (current.length > 3) {
                const exists = await fs.stat(current).then(() => true).catch(() => false);
                if (exists) {
                    found = true;
                    cleanPath = current;
                    break;
                }
                const lastSpaceIdx = current.lastIndexOf(" ");
                if (lastSpaceIdx === -1) {
                    const lastSlashIdx = Math.max(current.lastIndexOf("\\"), current.lastIndexOf("/"));
                    if (lastSlashIdx <= 2)
                        break;
                    current = current.slice(0, lastSlashIdx);
                }
                else {
                    current = current.slice(0, lastSpaceIdx).trim();
                }
            }
            if (found) {
                try {
                    const stat = await fs.stat(cleanPath);
                    if (stat.isDirectory()) {
                        const files = await fs.readdir(cleanPath);
                        const formattedFiles = [];
                        for (const f of files.slice(0, 100)) {
                            const full = path.join(cleanPath, f);
                            try {
                                const subStat = await fs.stat(full);
                                formattedFiles.push(`${subStat.isDirectory() ? "[Folder]" : "[File]"} ${f} (${subStat.size} bytes)`);
                            }
                            catch {
                                formattedFiles.push(`[Unknown] ${f}`);
                            }
                        }
                        resolvedBlocks.push([
                            `=== Contents of Directory: ${cleanPath} ===`,
                            formattedFiles.length > 0 ? formattedFiles.join("\n") : "(Empty directory)",
                            `==========================================`
                        ].join("\n"));
                    }
                    else if (stat.isFile()) {
                        const fileContent = await fs.readFile(cleanPath, "utf8");
                        resolvedBlocks.push([
                            `=== Content of File: ${cleanPath} ===`,
                            fileContent.slice(0, 5000),
                            `=====================================`
                        ].join("\n"));
                    }
                }
                catch (err) {
                    resolvedBlocks.push(`[Error reading path ${cleanPath}: ${err.message}]`);
                }
            }
        }
        return resolvedBlocks.join("\n\n");
    }
    static async transitionToComplete(taskId, reason) {
        try {
            const state = await TaskStateStore.getTaskState(taskId);
            if (!state)
                return;
            const current = state.currentState;
            const sequence = [
                "EVIDENCE_COLLECTION",
                "VALIDATING",
                "GAP_ANALYSIS",
                "IMPACT_ANALYSIS",
                "RISK_ASSESSMENT",
                "SOLUTION_DESIGN",
                "PLANNING",
                "IMPLEMENTING",
                "VERIFYING",
                "COMPLETED"
            ];
            let startIndex = sequence.indexOf(current);
            if (startIndex === -1) {
                if (current === "NEW") {
                    await TaskStateStore.transitionTask(taskId, "CLASSIFIED");
                    await TaskStateStore.transitionTask(taskId, "ANALYZING");
                    startIndex = 0;
                }
                else if (current === "CLASSIFIED") {
                    await TaskStateStore.transitionTask(taskId, "ANALYZING");
                    startIndex = 0;
                }
                else if (current === "ANALYZING") {
                    startIndex = 0;
                }
                else {
                    return;
                }
            }
            for (let i = startIndex; i < sequence.length; i++) {
                const nextState = sequence[i];
                if (nextState && state.currentState !== nextState) {
                    await TaskStateStore.transitionTask(taskId, nextState, reason);
                }
            }
        }
        catch (err) {
            console.warn("Failed in transitionToComplete helper:", err);
        }
    }
    static async transitionToApproval(taskId, reason) {
        try {
            const state = await TaskStateStore.getTaskState(taskId);
            if (!state)
                return;
            const current = state.currentState;
            const sequence = [
                "EVIDENCE_COLLECTION",
                "VALIDATING",
                "GAP_ANALYSIS",
                "IMPACT_ANALYSIS",
                "RISK_ASSESSMENT",
                "SOLUTION_DESIGN",
                "PLANNING",
                "WAIT_FOR_APPROVAL"
            ];
            let startIndex = sequence.indexOf(current);
            if (startIndex === -1) {
                if (current === "NEW") {
                    await TaskStateStore.transitionTask(taskId, "CLASSIFIED");
                    await TaskStateStore.transitionTask(taskId, "ANALYZING");
                    startIndex = 0;
                }
                else if (current === "CLASSIFIED") {
                    await TaskStateStore.transitionTask(taskId, "ANALYZING");
                    startIndex = 0;
                }
                else if (current === "ANALYZING") {
                    startIndex = 0;
                }
                else {
                    return;
                }
            }
            for (let i = startIndex; i < sequence.length; i++) {
                const nextState = sequence[i];
                if (nextState && state.currentState !== nextState) {
                    await TaskStateStore.transitionTask(taskId, nextState, reason);
                }
            }
        }
        catch (err) {
            console.warn("Failed in transitionToApproval helper:", err);
        }
    }
}
//# sourceMappingURL=chat-orchestrator.js.map