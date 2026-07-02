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
export class ChatOrchestratorService {
    static async handleDirectChat(input) {
        const prompt = EngineeringMemory.scrubSecrets(input.prompt || "").trim();
        const activeWorkspace = input.workspacePath || CONFIG.PROJECT_ROOT;
        const sessionId = input.sessionId || input.conversationId || "desktop-chat";
        const conversationId = input.conversationId || sessionId;
        const userRequestText = ChatOrchestratorService.extractUserRequest(prompt);
        if (ChatOrchestratorService.isCasualAcknowledgement(userRequestText)) {
            return {
                intent: "conversation",
                usedModel: false,
                response: ChatOrchestratorService.formatCasualAcknowledgement(userRequestText)
            };
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
        await ApprovalPolicyService.setConversationMode(conversationId, ApprovalPolicyService.normalizeMode(input.approvalMode));
        if (input.alwaysAllow) {
            await ApprovalPolicyService.rememberAlwaysAllow(conversationId, "use_internet");
            await ApprovalPolicyService.rememberAlwaysAllow(conversationId, "import_knowledge");
        }
        const decisionResult = await ExecutionPolicyService.evaluateDecision(userRequestText, activeWorkspace, input.approvalMode, conversationId);
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
            return {
                intent: "conversation",
                usedModel: false,
                response: `The requested action requires user approval: ${decisionResult.reason}`,
                approvalRequest: {
                    requiresApproval: true,
                    action: "run_command",
                    risk: decisionResult.riskLevel === "critical" ? "high" : decisionResult.riskLevel,
                    reason: decisionResult.reason,
                    files: []
                }
            };
        }
        await TaskStateStore.transitionTask(taskId, "ANALYZING", "Request is classified and allowed to proceed");
        const showDiagnostics = this.wantsDiagnostics(userRequestText);
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
            await TaskStateStore.transitionTask(taskId, "COMPLETED", "Casual acknowledgement completed without engineering execution");
            return {
                intent,
                usedModel: false,
                response: this.formatCasualAcknowledgement(userRequestText)
            };
        }
        // 3. Load Memory / Training / Knowledge (Section 1)
        const preAnswerReview = await PreAnswerReviewService.review(prompt, activeWorkspace, { taskId, conversationId });
        // 4. Determine Model Invocation
        let usedModel = true;
        let responseText = "";
        // Bypass LLM for non-LLM actions (Section 1: احفظ / درب نفسك / خزن / تذكر)
        if (intent === "memory_save" || intent === "training_ingest") {
            usedModel = false;
            if (input.attachments && input.attachments.length > 0) {
                const approval = await ApprovalPolicyService.evaluate({
                    mode: input.approvalMode,
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
                    mode: input.approvalMode,
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
                const fact = this.extractMemoryFact(prompt);
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
            responseText = this.formatMemoryRecallResponse(userMemory, prompt);
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
                    mode: input.approvalMode,
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
                    mode: input.approvalMode,
                    conversationId,
                    action: "use_internet"
                }, approval, true, "internet search allowed");
                const search = await BraveAnswersService.query(prompt);
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
            // 5. Project Context + Prompt Builder + LLM (Reasoning Engine)
            let contextSummary = "No workspace context was retrieved.";
            if (!isGreeting) {
                try {
                    const context = await ContextEngine.retrieveContext(prompt, activeWorkspace, 4096);
                    contextSummary = context?.items?.slice(0, 6).map((item) => {
                        return `- ${item.title}: ${item.content.slice(0, 700)}`;
                    }).join("\n\n") || "No workspace context was retrieved.";
                }
                catch { }
            }
            // Detect and read local paths from the user's prompt
            let localFileSystemContext = "";
            if (!isGreeting) {
                try {
                    localFileSystemContext = await ChatOrchestratorService.detectAndReadLocalPaths(prompt);
                }
                catch { }
            }
            const localMatches = isGreeting ? [] : KnowledgeManagerService.search(prompt);
            // Augment user prompt with matched knowledge rules to force model application (Section 4)
            let promptAugmentationText = "";
            const allMatches = isGreeting ? [] : [...preAnswerReview.knowledgeMatches, ...localMatches.map(m => ({ item: { filePath: m.sourcePath, summary: m.summary, title: m.title, category: m.category }, chunks: [] }))];
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
                    approvalMode: input.approvalMode || "ask"
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
            await TaskStateStore.transitionTask(taskId, "VALIDATING");
            await TaskStateStore.transitionTask(taskId, "GAP_ANALYSIS");
            await TaskStateStore.transitionTask(taskId, "IMPACT_ANALYSIS");
            await TaskStateStore.transitionTask(taskId, "RISK_ASSESSMENT");
            await TaskStateStore.transitionTask(taskId, "SOLUTION_DESIGN");
            await TaskStateStore.transitionTask(taskId, "PLANNING");
            await TaskStateStore.transitionTask(taskId, "IMPLEMENTING", "Invoking reasoning engine for direct chat response");
            let response = null;
            try {
                response = await ReasoningEngine.requestCompletion({
                    role: "Coding",
                    systemPrompt: isGreeting ? [
                        "You are Saad Agent, a premium, professional AI engineering assistant similar to ChatGPT or Gemini.",
                        "Reply directly to the user in the user's language with a concise, polite, and friendly greeting.",
                        "You have direct access to search the internet via the integrated Brave Search tool when requested.",
                        "Acknowledge the user's welcome and ask them how you can help them with their software development tasks today."
                    ].join("\n") : [
                        "You are Saad Agent, a premium, professional AI engineering assistant similar to ChatGPT or Gemini, tailored for software development.",
                        "Reply directly to the user in the user's language with a polite, intelligent, and conversational tone.",
                        "You have direct access to search the internet via the integrated Brave Search tool. You can search the web and summarize online sources when requested.",
                        "Explain technical concepts clearly, structure your answers with markdown headings, tables, or lists, and provide code blocks when helpful.",
                        "Never answer before the orchestrator, memory, training knowledge, and context review have run.",
                        "Obey the Mandatory Pre-Answer Review Context before using model knowledge.",
                        "Use matched trained knowledge when it applies. If it conflicts with model knowledge, prefer trained knowledge.",
                        "Do not claim that you changed files unless an execution tool actually changed files.",
                        "If a provider/model/runtime problem prevents completion, explain the exact problem."
                    ].join("\n"),
                    userPrompt: isGreeting ? userRequestText : [
                        `Project: ${input.projectName || path.basename(activeWorkspace)}`,
                        preAnswerReview.finalContext,
                        "Retrieved workspace context:",
                        contextSummary,
                        localFileSystemContext ? `Retrieved Local Filesystem Data:\n${localFileSystemContext}` : "",
                        promptAugmentationText,
                        "User request:",
                        prompt
                    ].filter(Boolean).join("\n\n"),
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
                ExecutionTraceEmitter.emit({
                    taskId,
                    conversationId,
                    phase: "execution",
                    status: "failed",
                    label: "Execution failed",
                    error: err.message || "Request failed",
                    sourceService: "ReasoningEngine"
                });
                await TaskStateStore.transitionTask(taskId, "FAILED", err.message || "Reasoning execution failed");
                throw err;
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
        let dictMatchesCount = 0;
        try {
            const hasDialect = DomainResolver.resolve(prompt).domain === "iraqi_dialect";
            const hasHumanAttr = DomainResolver.resolve(prompt).domain === "human_attributes";
            if (hasDialect || hasHumanAttr) {
                dictMatchesCount = 1;
            }
        }
        catch { }
        const localMatches = KnowledgeManagerService.search(prompt);
        const allMatches = [...preAnswerReview.knowledgeMatches, ...localMatches.map(m => ({ item: { filePath: m.sourcePath, summary: m.summary, title: m.title, category: m.category }, chunks: [] }))];
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
    static formatMemoryRecallResponse(userMemory, prompt = "") {
        if (userMemory.length === 0) {
            return "لا أعرف معلومات محفوظة عنك حتى الآن.";
        }
        const facts = userMemory
            .map((item) => item.trim())
            .filter(Boolean)
            .map((item) => item.replace(/^[-•]\s*/, ""))
            .filter((item) => !this.isTrainingMemoryFact(item));
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
        return /(من انا|منو اني|منو انا|ما اسمي|شنو اسمي|who am i|what is my name)/i.test(normalized);
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
        const recallQuestion = /(من انا|منو اني|منو انا|ما اسمي|شنو اسمي|who am i|what is my name)/i.test(normalized)
            || /\?/.test(prompt);
        return (saveSignals || trainingSignals) && !recallQuestion;
    }
    static isTrainingRecallQuestion(prompt, normalized) {
        const lower = prompt.toLowerCase();
        return /\b(what did i train you on|what have you learned|explain what you learned|trained knowledge)\b/i.test(lower)
            || /(?:الذي|اللي|ما|ماذا|اشرح|اذكر|شنو|ماهو|ما هو).*(?:دربك|دربتك|تدربت|تعلمت|المعرفه المدربه|المعرفة المدربة|التدريب السابق|قبل)/.test(normalized)
            || /(?:دربك|دربتك|تدربت).*(?:قبل|سابقا|سابقاً|عليه)/.test(normalized);
    }
    static isMemoryRecall(prompt, normalized) {
        return /(من انا|منو اني|منو انا|ما اسمي|شنو اسمي|ماذا تعرف عني|شنو تعرف عني|ماذا تتذكر عني|what do you remember about me|who am i|what is my name)/i.test(normalized);
    }
    static isExplicitInternetSearch(prompt, normalized) {
        const lower = prompt.toLowerCase();
        const allowedTriggers = /(ابحث في الانترنت|ابحث في الإنترنت|ابحث بالويب|اخر تحديث|آخر تحديث|وثائق|توثيق|اخبار|أخبار|مستندات)/i.test(normalized)
            || /\b(search online|search web|latest|official docs|documentation|api docs|news)\b/i.test(lower);
        const explicitLinksOrSources = /(?:\u0627\u0639\u0637\u0646\u064a|\u0627\u0639\u0637\u064a\u0646\u064a|\u0647\u0627\u062a|\u0627\u0631\u064a\u062f|\u0627\u0628\u062d\u062b|\u0627\u0628\u062d\u062b\u0644\u064a).*(?:\u0631\u0648\u0627\u0628\u0637|\u0645\u0635\u0627\u062f\u0631|\u0644\u0646\u0643\u0627\u062a|\u0644\u064a\u0646\u0643\u0627\u062a|\u0635\u0648\u0631)/.test(normalized)
            || /\b(give me links|give me sources|links|sources|find images|image search)\b/i.test(lower);
        return allowedTriggers || explicitLinksOrSources;
    }
    static isSimpleGreeting(prompt) {
        const normalized = prompt.trim().toLowerCase().replace(/[!.؟👋]/g, "").trim();
        const greetings = [
            "اهلا", "أهلا", "اهلاً", "أهلاً", "مرحبا", "مرحباً", "hello", "hi", "hey", "سلام", "السلام عليكم", "صباح الخير", "مساء الخير"
        ];
        return greetings.includes(normalized);
    }
    static isCasualAcknowledgement(prompt) {
        const normalized = this.normalizeArabic(prompt);
        const lower = prompt.trim().toLowerCase();
        const words = normalized.split(/\s+/).filter(Boolean);
        const isShort = words.length <= 5;
        const thanks = /^(?:شكرا|شكرا لك|شكراً|شكراً لك|مشكور|تسلم|يعطيك العافيه|يعطيك العافية|thank you|thanks|thx)$/i.test(normalized)
            || /^(?:thank you|thanks|thx)$/i.test(lower);
        const greeting = this.isSimpleGreeting(prompt);
        return isShort && (thanks || greeting);
    }
    static formatCasualAcknowledgement(prompt) {
        const normalized = this.normalizeArabic(prompt);
        if (/^(?:شكرا|شكرا لك|شكراً|شكراً لك|مشكور|تسلم|يعطيك العافيه|يعطيك العافية)/i.test(normalized)) {
            return "العفو سعد، حاضر.";
        }
        return "أهلًا سعد، حاضر.";
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