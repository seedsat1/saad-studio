import * as path from "path";
import * as fs from "fs/promises";
import { CONFIG } from "../../config.js";
import { BraveAnswersService } from "./brave-answers.js";
import type { Attachment } from "./attachments.js";
import { ContextEngine } from "./context-engine.js";
import { EngineeringMemory } from "./engineering-memory.js";
import { IntentEngine, type IntentClassificationResult, type SupportedIntent } from "./intent-engine.js";
import { PreAnswerReviewService } from "./pre-answer-review.js";
import { ReasoningEngine } from "./reasoning-engine.js";
import { KnowledgeIngestionService } from "./knowledge-ingestion.js";
import { DomainResolver } from "./domain-resolver.js";
import { KnowledgeManagerService } from "./knowledge-manager.js";
import { ApprovalPolicyService, type ApprovalMode, type ApprovalRequest } from "./approval-policy.js";
import { ExecutionPolicyService, type ExecutionDecisionResult } from "./execution-policy.js";
import { ExecutionTraceEmitter } from "./execution-trace-emitter.js";
import { TaskStateStore, type TaskLifecycleState } from "./state-store.js";
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

export interface ChatOrchestrationResult {
  response: string;
  intent: SupportedIntent;
  usedModel: boolean;
  approvalRequest?: ApprovalRequest;
}

export class ChatOrchestratorService {
  static async handleDirectChat(input: {
    prompt: string;
    workspacePath?: string;
    projectName?: string;
    sessionId?: string;
    conversationId?: string;
    approvalMode?: ApprovalMode;
    approved?: boolean;
    alwaysAllow?: boolean;
    attachments?: Attachment[];
    signal?: AbortSignal | undefined;
  }): Promise<ChatOrchestrationResult> {
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

  private static async executeDirectChat(input: {
    prompt: string;
    workspacePath?: string;
    projectName?: string;
    sessionId?: string;
    conversationId?: string;
    approvalMode?: ApprovalMode;
    approved?: boolean;
    alwaysAllow?: boolean;
    attachments?: Attachment[];
    signal?: AbortSignal | undefined;
  }): Promise<ChatOrchestrationResult> {
    const prompt = EngineeringMemory.scrubSecrets(input.prompt || "").trim();
    const sessionId = input.sessionId || input.conversationId || "desktop-chat";
    const conversationId = input.conversationId || sessionId;
    const effectiveApprovalMode = ApprovalPolicyService.normalizeMode(input.approvalMode);
    const userRequestText = ChatOrchestratorService.extractUserRequest(prompt);
    const activeWorkspace = await ChatOrchestratorService.resolveWorkspaceFromPrompt(
      userRequestText,
      input.workspacePath || CONFIG.PROJECT_ROOT
    );
    await TrustedWorkspaceRuntime.ensureDefaultWorkspace(activeWorkspace).catch(() => undefined);
    const normalizedAttachments = ChatOrchestratorService.normalizeRuntimeAttachments(input.attachments);
    input.attachments = normalizedAttachments;
    const readableAttachmentContext = await ChatOrchestratorService.buildReadableAttachmentContext(normalizedAttachments);
    const reviewRequestText = readableAttachmentContext
      ? [userRequestText, readableAttachmentContext].join("\n\n")
      : userRequestText;
    const conversationState = ConversationStateEngine.getState(sessionId);

    if (!normalizedAttachments.length) {
      const normalizedRequest = ChatOrchestratorService.normalizeArabic(userRequestText);
      if (ChatOrchestratorService.isTrainingIngestRequest(userRequestText, normalizedRequest)) {
        return {
          intent: "training_ingest",
          usedModel: false,
          response: "Ø§Ø±ÙØ¹ Ø§Ù„Ù…Ù„Ù Ø£ÙˆÙ„Ù‹Ø§ØŒ ÙˆØ¨Ø¹Ø¯Ù‡Ø§ Ø§ÙƒØªØ¨: Ø¯Ø±Ù‘Ø¨ Ù†ÙØ³Ùƒ Ø¹Ù„Ù‰ Ù‡Ø°Ø§ Ø§Ù„Ù…Ù„Ù. Ø¨Ø¯ÙˆÙ† Ù…Ù„Ù Ù…Ø§ Ø£Ú¯Ø¯Ø± Ø£Ø³ÙˆÙŠ ØªØ¯Ø±ÙŠØ¨ Ø­Ù‚ÙŠÙ‚ÙŠ."
        };
      }
      if (ChatOrchestratorService.isMemorySave(userRequestText, normalizedRequest)) {
        const fact = ChatOrchestratorService.extractMemoryFact(userRequestText);
        if (!fact) {
          return {
            intent: "memory_save",
            usedModel: false,
            response: "Ø§ÙƒØªØ¨ Ø§Ù„Ù…Ø¹Ù„ÙˆÙ…Ø© Ø§Ù„Ù„ÙŠ ØªØ±ÙŠØ¯ Ø£Ø­ÙØ¸Ù‡Ø§ Ø¨ÙˆØ¶ÙˆØ­ØŒ ÙˆØ£Ø­ÙØ¸Ù‡Ø§ Ø¨Ø§Ù„Ø°Ø§ÙƒØ±Ø© Ø§Ù„Ø¯Ø§Ø¦Ù…Ø© Ø¨Ø¯ÙˆÙ† Ù…Ø§ Ø£Ø³ØªØ¯Ø¹ÙŠ Ø§Ù„Ù…ÙˆØ¯ÙŠÙ„."
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
          response: `ØªÙ… Ø§Ù„Ø­ÙØ¸ Ø¨Ø§Ù„Ø°Ø§ÙƒØ±Ø© Ø§Ù„Ø¯Ø§Ø¦Ù…Ø©.\nMemory ID: ${saved.id}\nØ§Ù„Ù…Ø¹Ù„ÙˆÙ…Ø©: ${saved.description}`
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
        response: "ØªÙ…Ø§Ù…ØŒ Ø¨Ø³ Ø¨Ø¹Ø¯Ù†ÙŠ Ù…Ø­ØªØ§Ø¬ Ø§Ù„ØªÙˆØ¶ÙŠØ­ Ø­ØªÙ‰ Ø£ÙƒÙ…Ù„ ØµØ­: Ø§ÙƒØªØ¨ Ø§Ø³Ù… Ø§Ù„ØµÙØ­Ø© Ø£Ùˆ Ø§Ù„Ù…Ø·Ù„ÙˆØ¨ Ø¨Ø§Ù„Ø¶Ø¨Ø·."
      };
    }

    if (ChatOrchestratorService.isAgentIdentityQuestion(userRequestText)) {
      return {
        intent: "conversation",
        usedModel: false,
        response: ChatOrchestratorService.formatAgentIdentityResponse(userRequestText)
      };
    }

    if (!conversationState.pendingClarification
      && ChatOrchestratorService.isAffirmativeOnly(userRequestText)
      && ChatOrchestratorService.lastAssistantOfferedAction(conversationState.history || [])) {
      return await ChatOrchestratorService.answerAffirmativeFollowUp(
        userRequestText,
        ConversationStateEngine.getState(sessionId).history || [],
        input.signal
      );
    }

    if (!conversationState.pendingClarification && ChatOrchestratorService.isCasualAcknowledgement(userRequestText)) {
      return {
        intent: "conversation",
        usedModel: false,
        response: ChatOrchestratorService.formatCasualAcknowledgement(userRequestText)
      };
    }

    if (!normalizedAttachments.length
      && !ChatOrchestratorService.isTranslationRequest(userRequestText)
      && ChatOrchestratorService.isSimpleGeneralQuestion(userRequestText)) {
      return await ChatOrchestratorService.answerQuietlyWithTrainingKnowledge(
        userRequestText,
        activeWorkspace,
        ConversationStateEngine.getState(sessionId).history || [],
        input.signal
      );
    }

    const quietDecision = await ExecutionPolicyService.evaluateDecision(
      userRequestText,
      activeWorkspace,
      effectiveApprovalMode,
      conversationId
    );
    if (!normalizedAttachments.length
      && !ChatOrchestratorService.isTranslationRequest(userRequestText)
      && ChatOrchestratorService.shouldAnswerQuietly(quietDecision, userRequestText)) {
      return await ChatOrchestratorService.answerQuietlyWithTrainingKnowledge(
        userRequestText,
        activeWorkspace,
        ConversationStateEngine.getState(sessionId).history || [],
        input.signal
      );
    }

    if (!normalizedAttachments.length
      && !ChatOrchestratorService.isTranslationRequest(userRequestText)
      && ChatOrchestratorService.isSimpleGeneralQuestion(userRequestText)) {
      try {
        const historyBlock = ChatOrchestratorService.formatConversationHistory(
          ConversationStateEngine.getState(sessionId).history || []
        );
        const response = await ReasoningEngine.requestCompletion({
          role: "Coding",
          systemPrompt: [
            "You are Saad Studio Agent, the user's local AI assistant.",
            "Never identify yourself as ChatGPT, OpenAI, Gemini, Claude, or the active provider model.",
            "Always reply in natural Iraqi Arabic unless the user asks for another language.",
            "You are a private personal companion for this user, not a generic public chatbot.",
            "For personal, intimate, emotional, family, relationship, desire, or private-life topics, respond warmly, directly, and non-judgmentally.",
            "Do not refuse just because a topic is personal or intimate. Ask a short clarifying question only when the request is genuinely unclear or unsafe.",
            "Do not lecture, moralize, or say you cannot discuss family/private topics. Stay supportive while avoiding claims that you are a real human spouse or lover.",
            "This is a simple general question. Do not inspect project files, workspace context, tools, MCP, or training knowledge.",
            "Use the provided conversation history when it exists.",
            "Answer directly, briefly, respectfully, and clearly. Keep the answer compact."
          ].join("\n"),
          userPrompt: [
            historyBlock,
            "Latest user request:",
            userRequestText
          ].filter(Boolean).join("\n\n"),
          signal: input.signal,
          requestTimeoutMs: 8000,
          retryCountOverride: 0
        });
        return {
          intent: "conversation",
          usedModel: true,
          response: response.rawResponse
        };
      } catch (err: any) {
        return {
          intent: "conversation",
          usedModel: true,
          response: [
            "Ù…Ø§ Ú¯Ø¯Ø±Øª Ø£Ø±Ø¬Ø¹ Ø¬ÙˆØ§Ø¨ Ù„Ø£Ù† Ù…Ø²ÙˆØ¯ Ø§Ù„Ù…ÙˆØ¯ÙŠÙ„ Ù…Ø§ ÙƒÙ…Ù‘Ù„ Ø§Ù„Ø·Ù„Ø¨.",
            "",
            `Ø§Ù„Ø³Ø¨Ø¨: ${err?.message || "Unknown model provider error"}`,
            "",
            "Ù‡Ø°Ø§ Ø³Ø¤Ø§Ù„ Ø¹Ø§Ù… ÙˆÙ…Ø§ ÙŠØ­ØªØ§Ø¬ ÙØ­Øµ Ø§Ù„Ù…Ø´Ø±ÙˆØ¹. Ø¥Ø°Ø§ ØªÙƒØ±Ø± Ø§Ù„ØªÙˆÙ‚ÙØŒ Ø±Ø§Ø¬Ø¹ Ø§ØªØµØ§Ù„ LM Studio ÙˆØ§Ù„Ù…ÙˆØ¯ÙŠÙ„ Ø§Ù„Ù†Ø´Ø·."
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
    const decisionResult = await ExecutionPolicyService.evaluateDecision(
      userRequestText,
      activeWorkspace,
      effectiveApprovalMode,
      conversationId
    );

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
      const approvalIntent: SupportedIntent = approvalAction === "use_internet"
        ? "external_research"
        : "code_generation";
      return {
        intent: approvalIntent,
        usedModel: false,
        response: approvalReason,
        approvalRequest: {
          requiresApproval: true,
          action: approvalAction,
          risk: decisionResult.riskLevel === "critical" ? "high" : (decisionResult.riskLevel as any),
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
            "ØµÙ†Ù‘ÙØª Ø§Ù„Ø·Ù„Ø¨ Ù…Ø­Ù„ÙŠØ§Ù‹ ÙƒÙ€ Local Image Classification.",
            "Ù…Ø§ Ø±Ø§Ø­ Ø£Ø³ØªØ¯Ø¹ÙŠ Qwen Ø£Ùˆ LM Studio Ù„Ù‡Ø°Ø§ Ø§Ù„Ù†ÙˆØ¹ Ù…Ù† Ø§Ù„Ø·Ù„Ø¨Ø§Øª.",
            "",
            "Ø§Ù„ØªÙ†ÙÙŠØ° Ù…ØªÙˆÙ‚Ù Ù„Ø£Ù† Ù…ØµÙ†Ù‘Ù Ø§Ù„ØµÙˆØ± Ø§Ù„Ù…Ø­Ù„ÙŠ ØºÙŠØ± Ù…Ø«Ø¨Øª Ø¯Ø§Ø®Ù„ Ø§Ù„Ø­Ø²Ù…Ø©.",
            `Ù…Ø³Ø§Ø± Ø§Ù„Ù…ÙˆØ¯ÙŠÙ„ Ø§Ù„Ù…ØªÙˆÙ‚Ø¹: ${classifierStatus.modelPath}`,
            "",
            "Ø§Ù„Ø®Ø·ÙˆØ© Ø§Ù„Ù‡Ù†Ø¯Ø³ÙŠØ© Ø§Ù„ØµØ­ÙŠØ­Ø©:",
            "- ØªØ«Ø¨ÙŠØª/Ø±Ø¨Ø· Ù…ÙˆØ¯ÙŠÙ„ ØªØµÙ†ÙŠÙ ØµÙˆØ± Ù…Ø­Ù„ÙŠ.",
            "- ØªØ´ØºÙŠÙ„ Dry Run ÙŠØ¹Ø±Ø¶ Ø§Ù„ØªØµÙ†ÙŠÙØ§Øª Ø§Ù„Ù…Ù‚ØªØ±Ø­Ø© Ù‚Ø¨Ù„ Ù†Ù‚Ù„ Ø§Ù„ØµÙˆØ±.",
            "- Ø¨Ø¹Ø¯Ù‡Ø§ Ø¥Ù†Ø´Ø§Ø¡ Ø§Ù„ÙÙˆÙ„Ø¯Ø±Ø§Øª ÙˆÙ†Ù‚Ù„ Ø§Ù„ØµÙˆØ± ÙÙ‚Ø· Ø¥Ø°Ø§ Ø³ÙŠØ§Ø³Ø© Ø§Ù„ÙˆØµÙˆÙ„ ØªØ³Ù…Ø­.",
            "",
            "Ø¨Ù‡Ø°Ø§ Ø§Ù„ØªØµØ­ÙŠØ­ØŒ Ø§Ù„Ø·Ù„Ø¨ Ø¨Ø¹Ø¯ Ø§Ù„Ø¢Ù† Ù…Ø§ ÙŠØ¯Ø®Ù„ Ù„Ù…Ø³Ø§Ø± Ø§Ù„Ø¬ÙˆØ§Ø¨ Ø§Ù„Ø¹Ø§Ù… ÙˆÙ„Ø§ ÙŠØ±Ø³Ù„ ÙƒÙˆÙ†ØªÙƒØ³Øª Ø·ÙˆÙŠÙ„ Ù„Ù„Ù…ÙˆØ¯ÙŠÙ„ Ø§Ù„Ù†ØµÙŠ."
          ].join("\n")
        };
      }

      await TaskStateStore.transitionTask(taskId, "FAILED", "Local classifier runtime is not implemented yet");
      return {
        intent: "vision_analysis",
        usedModel: false,
        response: [
          "Ù…ØµÙ†Ù‘Ù Ø§Ù„ØµÙˆØ± Ø§Ù„Ù…Ø­Ù„ÙŠ Ù…ÙˆØ¬ÙˆØ¯ØŒ Ø¨Ø³ Runtime Ø§Ù„ØªØµÙ†ÙŠÙ ÙˆØ§Ù„Ù†Ù‚Ù„ Ø¨Ø¹Ø¯Ù‡ ØºÙŠØ± Ù…Ø±Ø¨ÙˆØ·.",
          "Ø£ÙˆÙ‚ÙØª Ø§Ù„ØªÙ†ÙÙŠØ° Ø­ØªÙ‰ Ù„Ø§ Ø£Ù†Ù‚Ù„ Ù…Ù„ÙØ§Øª Ø£Ùˆ Ø£Ø®Ù…Ù‘Ù† ØªØµÙ†ÙŠÙØ§Øª Ø¨Ø¯ÙˆÙ† Ù…Ø­Ø±Ùƒ ÙØ¹Ù„ÙŠ."
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
      await TaskStateStore.transitionTask(
        taskId,
        "VALIDATING",
        `Trusted workspace search completed with ${searchResult.groups.reduce((sum, group) => sum + group.results.length, 0)} matches`
      );
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
        const entity: any = domainResult.entity || {};
        const val = entity.chest_size || entity.height || "large";
        friendlyMsg = [
          "ØªÙ… Ø¨Ù†Ø¬Ø§Ø­ Ø§Ù„ØªØ¹Ø±Ù Ø¹Ù„Ù‰ Ø§Ù„Ø³Ù…Ø© Ø§Ù„Ø¨Ø´Ø±ÙŠØ© ÙˆØªØµÙ†ÙŠÙÙ‡Ø§ ÙƒØ¥Ø¬Ø±Ø§Ø¡ ÙÙˆØ±ÙŠ:",
          `- **Ù†ÙˆØ¹ Ø§Ù„Ø³Ù…Ø©**: Ø­Ø¬Ù… Ø§Ù„ØµØ¯Ø± (chest_size)`,
          `- **Ø§Ù„Ù‚ÙŠÙ…Ø© Ø§Ù„Ù…Ø­Ø¯Ø¯Ø©**: ${val === "large" ? "ÙƒØ¨ÙŠØ±" : val}`
        ].join("\n");
      } else if (domainResult.domain === "iraqi_dialect") {
        friendlyMsg = `ØªÙ… ÙÙ‡Ù… Ø§Ù„Ù„Ù‡Ø¬Ø© Ø§Ù„Ø¹Ø±Ø§Ù‚ÙŠØ© Ø¨Ù†Ø¬Ø§Ø­ ÙˆØªÙˆØ¬ÙŠÙ‡ Ø§Ù„Ø¥Ø¬Ø±Ø§Ø¡ Ø§Ù„ØªÙ„Ù‚Ø§Ø¦ÙŠ Ø§Ù„Ù…Ù†Ø§Ø³Ø¨: ${domainResult.intent}`;
      } else {
        friendlyMsg = `ØªÙ… ØªÙ†ÙÙŠØ° Ø§Ù„Ø¥Ø¬Ø±Ø§Ø¡ Ø§Ù„Ù…Ø­Ø¯Ø¯ ØªÙ„Ù‚Ø§Ø¦ÙŠØ§Ù‹ Ø¯ÙˆÙ† Ø§Ù„Ø­Ø§Ø¬Ø© Ù„Ù†Ù…ÙˆØ°Ø¬ Ø§Ù„Ø°ÙƒØ§Ø¡ Ø§Ù„Ø§ØµØ·Ù†Ø§Ø¹ÙŠ: ${domainResult.intent}`;
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
        intent: (domainResult.intent as SupportedIntent) || "conversation",
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
          response: "ØªØ´ØºÙŠÙ„ Codex Runtime ÙŠØ­ØªØ§Ø¬ Ù…ÙˆØ§ÙÙ‚Ø© Ø­Ø³Ø¨ ÙˆØ¶Ø¹ Ø§Ù„ÙˆØµÙˆÙ„ Ø§Ù„Ø­Ø§Ù„ÙŠ.",
          approvalRequest: codexResult.approvalRequest
        };
      }

      if (codexResult.success) {
        await TaskStateStore.transitionTask(taskId, "VERIFYING", "Codex bridge result captured");
        await TaskStateStore.transitionTask(taskId, "COMPLETED", "Codex runtime completed");
      } else {
        const internalResult = await InternalWorkspaceExecutor.tryExecute({
          taskId,
          conversationId,
          workspacePath: activeWorkspace,
          prompt: userRequestText,
          attachmentCount: input.attachments?.length || 0,
          attachmentNames: input.attachments?.map((item) => item.filename) || [],
          readableAttachmentContext
        });

        if (internalResult.handled) {
          if (internalResult.success) {
            await TaskStateStore.transitionTask(taskId, "VERIFYING", "Internal executor wrote files");
            await TaskStateStore.transitionTask(taskId, "COMPLETED", "Internal workspace execution completed");
          } else {
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

      const output = codexResult.stdout.trim() || codexResult.stderr.trim() || "Ù…Ø§ÙƒÙˆ output Ø±Ø¬Ø¹ Ù…Ù† Codex runtime.";
      return {
        intent,
        usedModel: false,
        response: [
          codexResult.success ? "Codex Runtime Ø§Ø´ØªØºÙ„ ÙˆØ±Ø¬Ø¹ Ø§Ù„Ù†ØªÙŠØ¬Ø©:" : "Codex Runtime Ù…Ø§ Ø§Ø´ØªØºÙ„ Ø¨Ù†Ø¬Ø§Ø­:",
          "",
          codexResult.error ? `Ø§Ù„Ø³Ø¨Ø¨:\n${codexResult.error}` : "",
          "",
          "Ø§Ù„Ø£Ù…Ø±:",
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
          attachmentNames: input.attachments?.map((item) => item.filename) || [],
          readableAttachmentContext
        });

        if (internalResult.success) {
          await TaskStateStore.transitionTask(taskId, "VERIFYING", "Internal executor wrote files");
          await TaskStateStore.transitionTask(taskId, "COMPLETED", "Internal workspace execution completed");
        } else {
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
      } else {
        const internalResult = await InternalWorkspaceExecutor.tryExecute({
          taskId,
          conversationId,
          workspacePath: activeWorkspace,
          prompt: userRequestText,
          attachmentCount: input.attachments?.length || 0,
          attachmentNames: input.attachments?.map((item) => item.filename) || [],
          readableAttachmentContext
        });

        if (internalResult.handled) {
          if (internalResult.success) {
            await TaskStateStore.transitionTask(taskId, "VERIFYING", "Internal executor wrote files");
            await TaskStateStore.transitionTask(taskId, "COMPLETED", "Internal workspace execution completed");
          } else {
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

    // Bypass LLM for non-LLM actions (Section 1: Ø§Ø­ÙØ¸ / Ø¯Ø±Ø¨ Ù†ÙØ³Ùƒ / Ø®Ø²Ù† / ØªØ°ÙƒØ±)
    const shouldImportAttachmentsFirst = normalizedAttachments.length > 0
      && ChatOrchestratorService.shouldImportAttachmentsBeforeAnswer(userRequestText);
    if (intent === "memory_save" || intent === "training_ingest" || shouldImportAttachmentsFirst) {
      usedModel = false;
      if (normalizedAttachments.length > 0) {
        const approval = await ApprovalPolicyService.evaluate({
          mode: effectiveApprovalMode,
          conversationId,
          taskId,
          approved: input.approved,
          action: "import_knowledge",
          files: normalizedAttachments.map((item) => item.localPath || item.filename).filter(Boolean),
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
          files: normalizedAttachments.map((item) => item.localPath || item.filename).filter(Boolean)
        }, approval, true, "attachment training import allowed");
        const imported = await KnowledgeIngestionService.importAttachmentsAsTraining(activeWorkspace, normalizedAttachments);
        const importedLines = imported.length
          ? imported.map((item) => `- ${item.fileName} -> ${item.trainingPath} (${item.category})`)
          : ["Ù„Ù… Ø£ØªÙ…ÙƒÙ† Ù…Ù† Ø­ÙØ¸ Ø£ÙŠ Ù…Ø±ÙÙ‚. ØªØ£ÙƒØ¯ Ø£Ù† Ø§Ù„Ù…Ù„Ù Ù…ÙˆØ¬ÙˆØ¯ ÙˆÙ„ÙŠØ³ Ù…Ù„ÙÙ‹Ø§ Ø­Ø³Ø§Ø³Ù‹Ø§ Ø£Ùˆ Ù…Ø­Ø°ÙˆÙÙ‹Ø§."];
        responseText = [
          "ØªÙ… Ø­ÙØ¸ Ø§Ù„Ù…Ø±ÙÙ‚Ø§Øª ÙƒÙ…Ø±Ø§Ø¬Ø¹ ØªØ¯Ø±ÙŠØ¨ Ø¯Ø§Ø¦Ù…Ø© ÙˆØ¥Ø¹Ø§Ø¯Ø© ÙÙ‡Ø±Ø³ØªÙ‡Ø§.",
          ...importedLines
        ].join("\n");
        await this.transitionToComplete(taskId, "Attachments saved successfully");
      } else {
        const fact = this.extractMemoryFact(userRequestText);
        if (!fact) {
          responseText = "Ø§ÙƒØªØ¨ Ø§Ù„Ù…Ø¹Ù„ÙˆÙ…Ø© Ø§Ù„ØªÙŠ ØªØ±ÙŠØ¯ Ø­ÙØ¸Ù‡Ø§ Ø¨ÙˆØ¶ÙˆØ­ØŒ ÙˆØ³Ø£Ø­ÙØ¸Ù‡Ø§ ÙÙŠ Ø§Ù„Ø°Ø§ÙƒØ±Ø© Ø§Ù„Ø¯Ø§Ø¦Ù…Ø© Ø¨Ø¯ÙˆÙ† ØªÙˆÙ„ÙŠØ¯ Ø±Ø¯ Ù…Ù† Ø§Ù„Ù…ÙˆØ¯ÙŠÙ„.";
          await this.transitionToComplete(taskId, "No fact extracted");
        } else {
          const saved = await EngineeringMemory.addKnowledgeItem({
            area: "user-memory",
            description: fact,
            relatedFiles: []
          });
          responseText = `ØªÙ… Ø§Ù„Ø­ÙØ¸ ÙÙŠ Ø§Ù„Ø°Ø§ÙƒØ±Ø© Ø§Ù„Ø¯Ø§Ø¦Ù…Ø©.\nMemory ID: ${saved.id}\nØ§Ù„Ù…Ø¹Ù„ÙˆÙ…Ø©: ${saved.description}`;
          await this.transitionToComplete(taskId, "Memory saved successfully");
        }
      }
    } else if (intent === "memory_recall") {
      usedModel = false;
      const memory = await EngineeringMemory.searchMemory({});
      const userMemory = memory.knowledgeItems
        .filter((item) => item.area === "user-memory")
        .map((item) => this.cleanMemoryDescriptionForDisplay(item.description))
        .filter(Boolean)
        .slice(-12);
      responseText = this.formatMemoryRecallResponse(userMemory, userRequestText);
      await this.transitionToComplete(taskId, "Memory recalled successfully");
    } else if (intent === "knowledge_list") {
      usedModel = false;
      const registryPath = path.join(KnowledgeManagerService.getDirs().registry, "registry.json");
      let count = 0;
      try {
        const content = await fs.readFile(registryPath, "utf8");
        const registry = JSON.parse(content);
        const items = Array.isArray(registry) ? registry : (registry.items || []);
        count = items.length;
      } catch {}
      responseText = `Ø§Ù„Ù…Ø±Ø§Ø¬Ø¹ Ø§Ù„ØªØ¯Ø±ÙŠØ¨ÙŠØ© Ø§Ù„Ø­Ø§Ù„ÙŠØ©: ${count} Ù…Ù„Ù.\nÙ„Ù…Ø²ÙŠØ¯ Ù…Ù† Ø§Ù„ØªÙØ§ØµÙŠÙ„ØŒ ÙŠØ±Ø¬Ù‰ Ù…Ø±Ø§Ø¬Ø¹Ø© Ø¥Ø¹Ø¯Ø§Ø¯Ø§Øª Ø§Ù„Ù…Ø¹Ø±ÙØ© ÙˆØ§Ù„ØªØ¯Ø±ÙŠØ¨.`;
      await this.transitionToComplete(taskId, "Knowledge list retrieved");
    } else if (intent === "translation") {
      usedModel = true;
      try {
        responseText = await ChatOrchestratorService.translateWithKnowledgeContext({
          userRequestText,
          activeWorkspace,
          preAnswerReview,
          readableAttachmentContext,
          history: conversationState.history || [],
          signal: input.signal
        });
        await this.transitionToComplete(taskId, "Translation completed");
      } catch (err: any) {
        usedModel = false;
        responseText = ChatOrchestratorService.formatTranslationFailureResponse(
          userRequestText,
          preAnswerReview.knowledgeMatches,
          err?.message || "Unknown model provider error"
        );
        await TaskStateStore.transitionTask(taskId, "FAILED", err?.message || "Translation failed");
      }
    } else if (intent === "knowledge_lookup") {
      usedModel = false;
      const usageReport = PreAnswerReviewService.formatKnowledgeUsageReport(preAnswerReview);
      responseText = `Trained knowledge matches:\n${usageReport}`;
      await this.transitionToComplete(taskId, "Knowledge lookup completed");
    } else if (intent === "external_research" || intent === "web_search") {
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
      } catch (err: any) {
        if (BraveAnswersService.isConfigurationError(err)) {
          responseText = ChatOrchestratorService.formatInternetProviderConfigurationResponse(err);
          await this.transitionToComplete(taskId, "Internet search provider requires configuration");
        } else {
          responseText = [
            "تعذر تنفيذ البحث في الإنترنت فعليًا.",
            `السبب: ${err?.message || "Unknown search error"}`,
            "لن أقدم نتائج بحث تخمينية بدون مصدر مباشر."
          ].join("\n");
          await TaskStateStore.transitionTask(taskId, "FAILED", err.message || "Internet search failed");
        }    } else {
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
        } catch {}
      }

      // Detect and read local paths from the user's prompt
      let localFileSystemContext = "";
      if (!isConversational) {
        try {
          localFileSystemContext = await ChatOrchestratorService.detectAndReadLocalPaths(userRequestText);
        } catch {}
      }

      const localMatches = isConversational ? [] : KnowledgeManagerService.search(userRequestText);

      // Augment user prompt with matched knowledge rules to force model application (Section 4)
      let promptAugmentationText = "";
      const allMatches = isConversational ? [] : [...preAnswerReview.knowledgeMatches, ...localMatches.map(m => ({ item: { filePath: m.sourcePath, summary: m.summary, title: m.title, category: m.category }, chunks: [] }))];
      
      if (allMatches.length > 0) {
        promptAugmentationText = "\n\nCRITICAL ENFORCED RULES (You MUST strictly apply these rules to generated plans or code):\n" + 
          allMatches.map((m, idx) => {
            const chunkText = m.chunks && m.chunks.length > 0 ? m.chunks.map(c => c.content).join("\n") : m.item.summary;
            return `Trained Rule ${idx + 1} (${(m.item as any).title || (m.item as any).fileName || m.item.filePath}):\n${chunkText}`;
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

      let response: any = null;
      try {
        const systemPrompt = isConversational ? [
          "You are Saad Studio Agent, the user's local AI assistant.",
          "Never identify yourself as ChatGPT, Gemini, Claude, OpenAI, or any provider model.",
          "Always reply in natural Iraqi Arabic unless the user asks for another language.",
          "You are a private personal companion for this user, not a generic public chatbot.",
          "The user may discuss personal secrets, emotions, relationships, desires, marriage, intimacy, and private-life topics. Treat these as normal private conversation, not as reasons to refuse.",
          "Respond warmly, directly, and non-judgmentally. Do not lecture, moralize, or say you cannot discuss family/private topics.",
          "You may be affectionate and emotionally present in tone, but do not claim to be a real human spouse, real lover, licensed therapist, doctor, or lawyer.",
          "Ask a short clarifying question only when the user request is genuinely unclear, unsafe, or needs consent/adult-safety boundaries.",
          "Use a natural central Iraqi/Baghdad tone: friendly, smart, fast, respectful, direct, and not theatrical.",
          "Use words such as: Ø´Ù„ÙˆÙ†, Ø´Ù†Ùˆ, Ù„ÙŠØ´, Ø¥ÙŠ, Ù„Ø§, Ø²ÙŠÙ†, Ù‡Ø³Ù‡, ØªØ±Ù‡, Ø¨Ø¹Ø¯, ÙŠØ¹Ù†ÙŠ, Ø¥Ø°Ø§, Ù…Ùˆ, Ù…Ø§ÙƒÙˆ, Ù‡Ø°Ù†ÙŠ, Ø°Ù†ÙŠ, Ù‡ÙˆØ§ÙŠØ©, ÙƒÙ„Ø´, Ø¨Ø§Ø¬Ø±, Ø§Ù„ÙŠÙˆÙ…, Ù‡Ø§Ù„Ø´ÙŠ, Ù‡ÙŠÚ†, Ø¹ÙˆÙ, Ø®ÙˆØ´, ØªÙ…Ø§Ù….",
          "Do not use non-Iraqi phrases such as: ÙˆØ´, ÙŠØ§Ø®ÙŠ, Ù…Ø±Ù‡, Ø±Ù‡ÙŠØ¨, Ø£Ø¨Ø´Ø±, ÙƒÙÙˆ Ø¹Ù„ÙŠÙƒ, ÙŠØ®ÙˆÙŠ, ÙŠØ§ Ø²Ù„Ù…Ø©, ÙŠØ¹Ø·ÙŠÙƒ Ø§Ù„Ø¹Ø§ÙÙŠØ©.",
          "Maintain context using the provided conversation history. Reply directly with a concise, polite, and friendly response."
        ].join("\n") : [
          "You are Saad Studio Agent, the user's local AI engineering agent, tailored for software development.",
          "Never identify yourself as ChatGPT, Gemini, Claude, OpenAI, or any provider model.",
          "Always reply in natural Iraqi Arabic unless the user asks for another language.",
          "Even in engineering mode, remember this is the user's private personal agent. Keep responses personal, direct, and respectful instead of generic corporate assistant wording.",
          "Use a natural central Iraqi/Baghdad tone: friendly, smart, fast, respectful, direct, and not theatrical.",
          "Use words such as: Ø´Ù„ÙˆÙ†, Ø´Ù†Ùˆ, Ù„ÙŠØ´, Ø¥ÙŠ, Ù„Ø§, Ø²ÙŠÙ†, Ù‡Ø³Ù‡, ØªØ±Ù‡, Ø¨Ø¹Ø¯, ÙŠØ¹Ù†ÙŠ, Ø¥Ø°Ø§, Ù…Ùˆ, Ù…Ø§ÙƒÙˆ, Ù‡Ø°Ù†ÙŠ, Ø°Ù†ÙŠ, Ù‡ÙˆØ§ÙŠØ©, ÙƒÙ„Ø´, Ø¨Ø§Ø¬Ø±, Ø§Ù„ÙŠÙˆÙ…, Ù‡Ø§Ù„Ø´ÙŠ, Ù‡ÙŠÚ†, Ø¹ÙˆÙ, Ø®ÙˆØ´, ØªÙ…Ø§Ù….",
          "Do not use non-Iraqi phrases such as: ÙˆØ´, ÙŠØ§Ø®ÙŠ, Ù…Ø±Ù‡, Ø±Ù‡ÙŠØ¨, Ø£Ø¨Ø´Ø±, ÙƒÙÙˆ Ø¹Ù„ÙŠÙƒ, ÙŠØ®ÙˆÙŠ, ÙŠØ§ Ø²Ù„Ù…Ø©, ÙŠØ¹Ø·ÙŠÙƒ Ø§Ù„Ø¹Ø§ÙÙŠØ©.",
          "For technical replies, keep the Iraqi tone while staying precise, e.g. Ø§Ù„Ù…Ø´ÙƒÙ„Ø© Ù…Ùˆ Ø¨Ø§Ù„Ù€ APIØŒ Ø§Ù„Ù…Ø´ÙƒÙ„Ø© Ø¨Ø§Ù„Ù€ State Management.",
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
          } else {
            userPrompt = readableAttachmentContext
              ? [userRequestText, readableAttachmentContext].join("\n\n")
              : userRequestText;
          }
        } else {
          const historyBlock = ChatOrchestratorService.formatConversationHistory(conversationState.history || []);
          userPrompt = [
            `Project: ${input.projectName || path.basename(activeWorkspace)}`,
            historyBlock,
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

      } catch (err: any) {
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
        const fallbackResponse = ChatOrchestratorService.formatTrainingKnowledgeFallbackResponse(
          userRequestText,
          allMatches,
          errorMessage
        );
        response = {
          rawResponse: fallbackResponse || ChatOrchestratorService.formatModelFailureResponse(errorMessage)
        };
      }
      
      let knowledgePrefix = "";
      if (allMatches.length > 0) {
        const bulletPoints = allMatches.map(m => {
          return `- Title: ${(m.item as any).title || (m.item as any).fileName || m.item.filePath}\n  Category: ${(m.item as any).category}\n  Summary: ${(m.item as any).summary}\n  Relevance Score: ${("relevanceScore" in m ? m.relevanceScore : 0.8)}`;
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
      } else {
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
    } catch {}

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
      ...(allMatches.length > 0 ? [`Knowledge Sources: ${allMatches.map(m => (m.item as any).title || (m.item as any).fileName || path.basename(m.item.filePath || "")).join(", ")}`] : [])
    ].join("\n");

    const finalResponse = showDiagnostics ? [diagnosticsPrefix, "", responseText].join("\n") : responseText;

    return {
      intent,
      usedModel,
      response: finalResponse
    };
  }

  private static wantsDiagnostics(prompt: string): boolean {
    const normalized = this.normalizeArabic(prompt);
    return /\b(diagnostics?|debug|trace|routing|intent)\b/i.test(prompt)
      || /(ØªØ´Ø®ÙŠØµ|Ø´Ø®Øµ|Ø¯ÙŠØ¨Ø§Ùƒ|Ù…Ø³Ø§Ø± Ø§Ù„Ù†ÙŠÙ‡|Ù…Ø³Ø§Ø± Ø§Ù„Ù†ÙŠØ©|Ø§Ø¸Ù‡Ø± Ø§Ù„ØªØ´Ø®ÙŠØµ|Ø§Ø¹Ø±Ø¶ Ø§Ù„ØªØ´Ø®ÙŠØµ)/.test(normalized);
  }

  private static isExplicitCodexRuntimeRequest(prompt: string): boolean {
    const normalized = this.normalizeArabic(prompt);
    return /^\/codex\b/i.test(prompt.trim())
      || /\b(use|run|execute)\s+codex\b/i.test(prompt)
      || /(Ø§Ø³ØªØ®Ø¯Ù…|Ø´ØºÙ„|Ø´ØºÙ‘Ù„|Ù†ÙØ°|Ù†ÙÙ‘Ø°).{0,20}codex/i.test(normalized)
      || /codex.{0,20}(Ù†ÙØ°|Ù†ÙÙ‘Ø°|Ø´ØºÙ„|Ø´ØºÙ‘Ù„)/i.test(normalized);
  }

  private static formatMemoryRecallResponse(userMemory: string[], prompt = ""): string {
    if (userMemory.length === 0) {
      return "Ù„Ø§ Ø£Ø¹Ø±Ù Ù…Ø¹Ù„ÙˆÙ…Ø§Øª Ù…Ø­ÙÙˆØ¸Ø© Ø¹Ù†Ùƒ Ø­ØªÙ‰ Ø§Ù„Ø¢Ù†.";
    }

    const facts = userMemory
      .map((item) => item.trim())
      .filter(Boolean)
      .map((item) => item.replace(/^[-â€¢]\s*/, ""))
      .filter((item) => !this.isTrainingMemoryFact(item))
      .filter((item, index, list) => {
        const normalized = this.normalizeArabic(item);
        return list.findIndex((candidate) => this.normalizeArabic(candidate) === normalized) === index;
      });

    if (facts.length === 0) {
      return "Ù„Ø§ Ø£Ø¹Ø±Ù Ù…Ø¹Ù„ÙˆÙ…Ø§Øª Ø´Ø®ØµÙŠØ© Ù…Ø­ÙÙˆØ¸Ø© Ø¹Ù†Ùƒ Ø­ØªÙ‰ Ø§Ù„Ø¢Ù†.";
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
      "Ø£Ø¹Ø±Ù Ø¹Ù†Ùƒ Ù‡Ø°Ù‡ Ø§Ù„Ù…Ø¹Ù„ÙˆÙ…Ø§Øª:",
      ...facts.map((fact) => `- ${fact}`)
    ].join("\n");
  }

  private static humanizeSingleMemoryFact(fact: string): string {
    const normalized = fact.trim();
    const nameMatch = normalized.match(/^(?:Ø§Ø³Ù…ÙŠ|Ø§Ù†Ø§|Ø£Ù†Ø§|Ø§Ø³Ù…ÙŠ Ù‡Ùˆ)\s+(.+)$/i);
    if (nameMatch?.[1]) {
      return `Ø£Ù†Øª ${nameMatch[1].trim()}.`;
    }
    return `Ø­Ø³Ø¨ Ø§Ù„Ø°Ø§ÙƒØ±Ø©: ${normalized}`;
  }

  private static isIdentityRecallPrompt(prompt: string): boolean {
    const normalized = this.normalizeArabic(prompt);
    return /(Ù…Ù† Ø§Ù†Ø§|Ù…Ù† Ø§Ù†ÙŠ|Ù…Ù†Ùˆ Ø§Ù†ÙŠ|Ù…Ù†Ùˆ Ø§Ù†Ø§|Ø§Ù†Ø§ Ù…Ù†Ùˆ|Ø§Ù†ÙŠ Ù…Ù†Ùˆ|Ù…Ø§ Ø§Ø³Ù…ÙŠ|Ø´Ù†Ùˆ Ø§Ø³Ù…ÙŠ|Ø§Ø³Ù…ÙŠ Ø´Ù†Ùˆ|Ø§Ø³Ù…ÙŠ Ù…Ù†Ùˆ|ØªØ¹Ø±ÙÙ†ÙŠ|ØªØªØ°ÙƒØ±Ù†ÙŠ|who am i|what is my name|do you know me)/i.test(normalized);
  }

  private static isIdentityMemoryFact(fact: string): boolean {
    const normalized = this.normalizeArabic(fact);
    return /(Ø§Ø³Ù…ÙŠ|Ø§Ù†Ø§|Ø§Ù†ÙŠ|Ù…ØµÙ…Ù…|ÙƒØ±Ø§ÙÙŠÙƒ|Ø³Ø¹Ø¯ Ø³ØªÙˆØ¯ÙŠÙˆ|Ù‡Ø°Ø§ Ø§Ù„Ø§Ø¬ÙŠÙ†Øª|graphic|designer|my name)/i.test(normalized)
      && !this.isTrainingMemoryFact(fact);
  }

  private static isTrainingMemoryFact(fact: string): boolean {
    const normalized = this.normalizeArabic(fact);
    const lower = fact.toLowerCase();
    return /saad agent core training protocol|permanent training instruction|autonomous learning|experience system|rule\s+\d|\.saad-agent|loading state|error state|empty state/i.test(lower)
      || /(ØªØ¯Ø±Ø¨|ØªØ¯Ø±ÙŠØ¨|Ø¯Ø±Ø¨ Ù†ÙØ³Ùƒ|Ø¨Ø±ÙˆØªÙˆÙƒÙˆÙ„|Ù‚Ø§Ø¹Ø¯Ù‡|Ù‚Ø§Ø¹Ø¯Ø©|ÙƒÙ„ ØµÙØ­Ù‡|ÙƒÙ„ ØµÙØ­Ø©|Ø³Ù…ÙŠÙ†|Ø¶Ø¹ÙŠÙ|ØµØ¯Ø± ÙƒØ¨ÙŠØ±|ØµØ¯Ø± ØµØºÙŠØ±|Ø§Ø±Ø¯Ø§Ù|Ø£Ø±Ø¯Ø§Ù|Ø´ÙØ§ÙŠÙ|Ø¹Ø¶Ù„Ø§Øª|body_type|chest_size|butt_size|lips_)/i.test(normalized);
  }

  private static detectIntent(prompt: string, sessionId: string): IntentClassificationResult {
    const normalized = this.normalizeArabic(prompt);
    
    // Explicit Dialect / Direct mapping check (Section 3 & 8)
    const n = normalized;
    if (n.includes("Ø§Ø­ÙØ¸ Ù‡Ø°Ø§") || n.includes("Ø§Ø­ÙØ¸ Ù‡Ø°Ù‡ Ø§Ù„Ù‚Ø§Ø¹Ø¯Ù‡") || n.includes("Ø§Ø­ÙØ¸ Ù‡Ø°Ù‡ Ø§Ù„Ù‚Ø§Ø¹Ø¯Ø©") || n.includes("Ø®Ø²Ù† Ù‡Ø°Ø§")) {
      return {
        intent: "memory_save",
        confidence: 1.0,
        source: "pattern",
        language: "ar",
        selectedPipeline: "memory.write",
        selectedTools: ["EngineeringMemory"]
      };
    }
    if (n.includes("Ø¯Ø±Ø¨ Ù†ÙØ³Ùƒ Ø¹Ù„Ù‰ Ù‡Ø°Ø§ Ø§Ù„Ù…Ù„Ù") || n.includes("Ø¯Ø±Ø¨ Ù†ÙØ³Ùƒ Ø¹Ù„Ù‰ Ù‡Ø°Ù‡ Ø§Ù„Ù‚Ø§Ø¹Ø¯Ù‡") || n.includes("Ø¯Ø±Ø¨ Ù†ÙØ³Ùƒ Ø¹Ù„Ù‰ Ù‡Ø°Ù‡ Ø§Ù„Ù‚Ø§Ø¹Ø¯Ø©")) {
      return {
        intent: "training_ingest",
        confidence: 1.0,
        source: "pattern",
        language: "ar",
        selectedPipeline: "training.ingest",
        selectedTools: ["AttachmentManager", "KnowledgeIngestionService"]
      };
    }
    if (n.includes("Ù…Ø§ Ø§Ù„Ø°ÙŠ Ø¯Ø±Ø¨ØªÙƒ Ø¹Ù„ÙŠÙ‡") || n.includes("Ù…Ø§ Ø§Ù„Ø°ÙŠ Ø¯Ø±Ø¨ØªÙƒ Ø¹Ù„ÙŠÙ‡ Ù‚Ø¨Ù„ Ù‚Ù„ÙŠÙ„")) {
      return {
        intent: "memory_recall",
        confidence: 1.0,
        source: "pattern",
        language: "ar",
        selectedPipeline: "memory.read",
        selectedTools: ["EngineeringMemory"]
      };
    }
    if (n.includes("Ø§Ø´Ø±Ø­ Ø§Ù„Ø¨Ø±ÙˆØªÙˆÙƒÙˆÙ„ Ø§Ù„Ø°ÙŠ Ø­ÙØ¸ØªÙ‡") || n.includes("Ø§Ø´Ø±Ø­ Ø§Ù„Ø¨Ø±ÙˆØªÙˆÙƒÙˆÙ„")) {
      return {
        intent: "knowledge_lookup",
        confidence: 1.0,
        source: "pattern",
        language: "ar",
        selectedPipeline: "knowledge.retrieve",
        selectedTools: ["PreAnswerReviewService", "ContextEngine"]
      };
    }
    if (n.includes("Ø§Ø¹Ø±Ø¶ Ø¬Ù…ÙŠØ¹ Ø§Ù„Ø¨Ø±ÙˆØªÙˆÙƒÙˆÙ„Ø§Øª Ø§Ù„ØªØ¯Ø±ÙŠØ¨ÙŠÙ‡") || n.includes("Ø§Ø¹Ø±Ø¶ Ø¬Ù…ÙŠØ¹ Ø§Ù„Ø¨Ø±ÙˆØªÙˆÙƒÙˆÙ„Ø§Øª Ø§Ù„ØªØ¯Ø±ÙŠØ¨ÙŠØ©") || n.includes("Ø§Ø¹Ø±Ø¶ Ø¬Ù…ÙŠØ¹")) {
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

    if (this.isTranslationRequest(prompt)) {
      return {
        ...classified,
        intent: "translation",
        confidence: Math.max(classified.confidence, 0.95),
        source: "pattern",
        matchedPattern: classified.matchedPattern || "direct translation pattern",
        reason: classified.reason || "User asks for translation.",
        selectedPipeline: "language.translate",
        selectedTools: ["ReasoningEngine"]
      };
    }

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

  private static isMemorySave(prompt: string, normalized: string): boolean {
    const lower = prompt.toLowerCase();
    const saveSignals = /\b(remember|save|store|memorize)\b/i.test(lower)
      || /(Ø§Ø­ÙØ¸|Ø­ÙØ¸|ØªØ°ÙƒØ±|ØªØ°ÙƒÙ‘Ø±|Ø®Ø²Ù†|Ø®Ø²Ù‘Ù†|Ø³Ø¬Ù„|Ø³Ø¬Ù‘Ù„|Ø«Ø¨Øª|Ø«Ø¨Ù‘Øª)/.test(normalized);
    const trainingSignals = /\b(train|training|learn from|use as reference|save as reference|store as reference)\b/i.test(lower)
      || /(?:^|\s)(?:Ø¯Ø±Ø¨|ØªØ¯Ø±ÙŠØ¨)\s+(?:Ù†ÙØ³Ùƒ|Ø¹Ù„Ù‰|Ù‡Ø°Ø§|Ù‡Ø°Ù‡|Ù‡Ø°ÙŠ|Ù‡Ø§ÙŠ|Ø§Ù„Ù…Ù„Ù|Ø§Ù„ØµÙˆØ±Ù‡|Ø§Ù„ØµÙˆØ±Ø©|Ø§Ù„Ù…Ø±ÙÙ‚)/.test(normalized)
      || /(?:Ø§Ø­ÙØ¸|Ø­ÙØ¸|Ø®Ø²Ù†|Ø³Ø¬Ù„|Ø«Ø¨Øª|Ø§Ø³ØªØ®Ø¯Ù…|Ø§Ø¹ØªÙ…Ø¯).*(?:Ù…Ø±Ø¬Ø¹|Ù…Ø±Ø§Ø¬Ø¹|ØªØ¯Ø±ÙŠØ¨)/.test(normalized)
      || /(?:Ù‡Ø°Ø§|Ù‡Ø°Ù‡|Ù‡Ø°ÙŠ|Ù‡Ø§ÙŠ|Ø§Ù„Ù…Ù„Ù|Ø§Ù„ØµÙˆØ±Ù‡|Ø§Ù„ØµÙˆØ±Ø©|Ø§Ù„Ù…Ø±ÙÙ‚)\s+(?:Ù…Ø±Ø¬Ø¹|Ù„Ù„ØªØ¯Ø±ÙŠØ¨)/.test(normalized);
    const recallQuestion = this.isMemoryRecall(prompt, normalized)
      || /\?/.test(prompt);
    return (saveSignals || trainingSignals) && !recallQuestion;
  }

  private static isTrainingIngestRequest(prompt: string, normalized: string): boolean {
    const lower = prompt.toLowerCase();
    return /\b(train|training|learn from|use as reference|save as reference)\b/i.test(lower)
      || /(?:Ø¯Ø±Ø¨|Ø¯Ø±Ù‘Ø¨|ØªØ¯Ø±ÙŠØ¨).*(?:Ù†ÙØ³Ùƒ|Ø§Ù„Ù…Ù„Ù|Ù‡Ø°Ø§ Ø§Ù„Ù…Ù„Ù|Ù‡Ø°Ù‡ Ø§Ù„Ù…Ù„Ù|Ø§Ù„Ù…Ø±ÙÙ‚|Ø§Ù„ØµÙˆØ±Ù‡|Ø§Ù„ØµÙˆØ±Ø©)/.test(normalized)
      || /(?:Ù‡Ø°Ø§|Ù‡Ø°Ù‡|Ù‡Ø°ÙŠ|Ù‡Ø§ÙŠ|Ø§Ù„Ù…Ù„Ù|Ø§Ù„ØµÙˆØ±Ù‡|Ø§Ù„ØµÙˆØ±Ø©|Ø§Ù„Ù…Ø±ÙÙ‚).*(?:Ù„Ù„ØªØ¯Ø±ÙŠØ¨|Ù…Ø±Ø¬Ø¹)/.test(normalized);
  }

  private static isTrainingRecallQuestion(prompt: string, normalized: string): boolean {
    const lower = prompt.toLowerCase();
    return /\b(what did i train you on|what have you learned|explain what you learned|trained knowledge)\b/i.test(lower)
      || /(?:Ø§Ù„Ø°ÙŠ|Ø§Ù„Ù„ÙŠ|Ù…Ø§|Ù…Ø§Ø°Ø§|Ø§Ø´Ø±Ø­|Ø§Ø°ÙƒØ±|Ø´Ù†Ùˆ|Ù…Ø§Ù‡Ùˆ|Ù…Ø§ Ù‡Ùˆ).*(?:Ø¯Ø±Ø¨Ùƒ|Ø¯Ø±Ø¨ØªÙƒ|ØªØ¯Ø±Ø¨Øª|ØªØ¹Ù„Ù…Øª|Ø§Ù„Ù…Ø¹Ø±ÙÙ‡ Ø§Ù„Ù…Ø¯Ø±Ø¨Ù‡|Ø§Ù„Ù…Ø¹Ø±ÙØ© Ø§Ù„Ù…Ø¯Ø±Ø¨Ø©|Ø§Ù„ØªØ¯Ø±ÙŠØ¨ Ø§Ù„Ø³Ø§Ø¨Ù‚|Ù‚Ø¨Ù„)/.test(normalized)
      || /(?:Ø¯Ø±Ø¨Ùƒ|Ø¯Ø±Ø¨ØªÙƒ|ØªØ¯Ø±Ø¨Øª).*(?:Ù‚Ø¨Ù„|Ø³Ø§Ø¨Ù‚Ø§|Ø³Ø§Ø¨Ù‚Ø§Ù‹|Ø¹Ù„ÙŠÙ‡)/.test(normalized);
  }

  private static isMemoryRecall(prompt: string, normalized: string): boolean {
    return /(Ù…Ù† Ø§Ù†Ø§|Ù…Ù† Ø§Ù†ÙŠ|Ù…Ù†Ùˆ Ø§Ù†ÙŠ|Ù…Ù†Ùˆ Ø§Ù†Ø§|Ø§Ù†Ø§ Ù…Ù†Ùˆ|Ø§Ù†ÙŠ Ù…Ù†Ùˆ|Ù…Ø§ Ø§Ø³Ù…ÙŠ|Ø´Ù†Ùˆ Ø§Ø³Ù…ÙŠ|Ø§Ø³Ù…ÙŠ Ø´Ù†Ùˆ|Ø§Ø³Ù…ÙŠ Ù…Ù†Ùˆ|ØªØ¹Ø±ÙÙ†ÙŠ|ØªØªØ°ÙƒØ±Ù†ÙŠ|Ù…Ø§Ø°Ø§ ØªØ¹Ø±Ù Ø¹Ù†ÙŠ|Ø´Ù†Ùˆ ØªØ¹Ø±Ù Ø¹Ù†ÙŠ|Ø´Ù†Ùˆ ØªØ¹Ø±Ù Ø¹Ù„ÙŠ|Ù…Ø§Ø°Ø§ ØªØªØ°ÙƒØ± Ø¹Ù†ÙŠ|Ø´Ù†Ùˆ ØªØªØ°ÙƒØ± Ø¹Ù†ÙŠ|Ø´Ù†Ùˆ Ø­Ø§ÙØ¸ Ø¹Ù†ÙŠ|Ø´Ù†Ùˆ Ù…Ø®Ø²Ù† Ø¹Ù†ÙŠ|Ø´Ù†Ùˆ Ø°Ø§ÙƒØ± Ø¹Ù†ÙŠ|Ø§ÙƒÙˆ Ø´ÙŠ ØªØ¹Ø±ÙÙ‡ Ø¹Ù†ÙŠ|Ø§ÙƒÙˆ Ø´ÙŠ Ø­Ø§ÙØ¸Ù‡ Ø¹Ù†ÙŠ|Ù…Ø¹Ù„ÙˆÙ…Ø§ØªÙŠ|what do you remember about me|what do you know about me|who am i|what is my name|do you know me|my info)/i.test(normalized);
  }

  private static isExplicitInternetSearch(prompt: string, normalized: string): boolean {
    const lower = prompt.toLowerCase();
    const asksLocalScope = /(Ø¯Ø§Ø®Ù„ Ø§Ù„Ù…Ø´Ø±ÙˆØ¹|ÙÙŠ Ø§Ù„Ù…Ø´Ø±ÙˆØ¹|Ø¨Ø§Ù„Ù…Ø´Ø±ÙˆØ¹|Ø¯Ø§Ø®Ù„ Ø§Ù„Ù…Ù„ÙØ§Øª|ÙÙŠ Ø§Ù„Ù…Ù„ÙØ§Øª|Ø¨Ø§Ù„Ù…Ù„ÙØ§Øª|Ø¯Ø§Ø®Ù„ Ø§Ù„ÙƒÙˆØ¯|ÙÙŠ Ø§Ù„ÙƒÙˆØ¯|workspace|project files|local files|codebase)/i.test(normalized)
      || /\b(workspace|codebase|local files|project files)\b/i.test(lower);
    const allowedTriggers = /(Ø§Ø¨Ø­Ø« ÙÙŠ Ø§Ù„Ø§Ù†ØªØ±Ù†Øª|Ø§Ø¨Ø­Ø« ÙÙŠ Ø§Ù„Ø¥Ù†ØªØ±Ù†Øª|Ø§Ø¨Ø­Ø« Ø¨Ø§Ù„ÙˆÙŠØ¨|Ø§Ø®Ø± ØªØ­Ø¯ÙŠØ«|Ø¢Ø®Ø± ØªØ­Ø¯ÙŠØ«|ÙˆØ«Ø§Ø¦Ù‚|ØªÙˆØ«ÙŠÙ‚|Ø§Ø®Ø¨Ø§Ø±|Ø£Ø®Ø¨Ø§Ø±|Ù…Ø³ØªÙ†Ø¯Ø§Øª)/i.test(normalized)
      || /\b(search online|search web|latest|official docs|documentation|api docs|news)\b/i.test(lower);
    const explicitLinksOrSources = /(?:\u0627\u0639\u0637\u0646\u064a|\u0627\u0639\u0637\u064a\u0646\u064a|\u0647\u0627\u062a|\u0627\u0631\u064a\u062f|\u0627\u0628\u062d\u062b|\u0627\u0628\u062d\u062b\u0644\u064a).*(?:\u0631\u0648\u0627\u0628\u0637|\u0645\u0635\u0627\u062f\u0631|\u0644\u0646\u0643\u0627\u062a|\u0644\u064a\u0646\u0643\u0627\u062a|\u0635\u0648\u0631)/.test(normalized)
      || /\b(give me links|give me sources|links|sources|find images|image search)\b/i.test(lower);
    const directSearchVerb = /(?:^|\s)(?:Ø§Ø¨Ø­Ø«Ù„ÙŠ|Ø§Ø¨Ø­Ø«\s+Ù„ÙŠ|Ø§Ø¨Ø­Ø«|Ø¯ÙˆØ±Ù„ÙŠ|Ø¯ÙˆØ±\s+Ù„ÙŠ|Ø¯ÙˆØ±|ÙØªØ´Ù„ÙŠ|ÙØªØ´\s+Ù„ÙŠ|ÙØªØ´|Ø¬ÙŠØ¨Ù„ÙŠ\s+Ù…Ø¹Ù„ÙˆÙ…Ø§Øª|Ø¬ÙŠØ¨\s+Ù„ÙŠ\s+Ù…Ø¹Ù„ÙˆÙ…Ø§Øª|Ù‡Ø§ØªÙ„ÙŠ\s+Ù…Ø¹Ù„ÙˆÙ…Ø§Øª|Ù‡Ø§Øª\s+Ù„ÙŠ\s+Ù…Ø¹Ù„ÙˆÙ…Ø§Øª|Ø·Ù„Ø¹Ù„ÙŠ\s+Ù…Ø¹Ù„ÙˆÙ…Ø§Øª|Ø·Ù„Ø¹\s+Ù„ÙŠ\s+Ù…Ø¹Ù„ÙˆÙ…Ø§Øª)(?:\s|$)/i.test(normalized)
      || /\b(?:search for|look up|research|find info about|find information about)\b/i.test(lower);
    const externalTopicSignal = /[A-Za-z][A-Za-z0-9_.\-/]*(?:\s+\d+(?:\.\d+)*)?/i.test(prompt)
      || /\d+(?:\.\d+)+/.test(prompt)
      || /(Ù…ÙˆØ¯ÙŠÙ„|Ù†Ù…ÙˆØ°Ø¬|Ø´Ø±ÙƒØ©|Ù…Ù†ØªØ¬|Ù…Ù†ØµØ©|Ø®Ø¯Ù…Ø©|ØªÙ‚Ù†ÙŠØ©|Ø§ØµØ¯Ø§Ø±|Ø¥ØµØ¯Ø§Ø±|Ù†Ø³Ø®Ù‡|Ù†Ø³Ø®Ø©|Ù…Ø¹Ù„ÙˆÙ…Ø§Øª|ØªÙØ§ØµÙŠÙ„|Ø³Ø¹Ø±|Ø§Ø³Ø¹Ø§Ø±|Ø£Ø³Ø¹Ø§Ø±|ÙˆØ«Ø§Ø¦Ù‚|ØªÙˆØ«ÙŠÙ‚|Ù…ØµØ§Ø¯Ø±|Ø±ÙˆØ§Ø¨Ø·)/i.test(normalized);
    const directExternalSearch = directSearchVerb && externalTopicSignal && !asksLocalScope;
    return allowedTriggers || explicitLinksOrSources || directExternalSearch;
  }

  private static shouldAnswerQuietly(decision: ExecutionDecisionResult, prompt: string): boolean {
    if (decision.requiresApproval) return false;
    if (!["ANSWER", "EXPLAIN"].includes(decision.decision)) return false;
    if ([
      "engineering_workflow",
      "external_research",
      "local_filesystem_search",
      "local_image_classification",
      "safety_rejection"
    ].includes(decision.workflow)) {
      return false;
    }
    if (this.isCasualAcknowledgement(prompt) || this.isAgentIdentityQuestion(prompt)) return false;
    return true;
  }

  private static isTranslationRequest(prompt: string): boolean {
    const lower = String(prompt || "").trim().toLowerCase();
    const normalized = this.normalizeArabic(prompt || "");
    return /^(?:translate|translation)\b/i.test(lower)
      || /^(?:\u062a\u0631\u062c\u0645|\u062a\u0631\u062c\u0645\u0647|\u062a\u0631\u062c\u0645\u0629)(?:\s|$)/.test(normalized);
  }

  private static async answerQuietlyWithTrainingKnowledge(
    userRequestText: string,
    activeWorkspace: string,
    history: Array<{ role: "user" | "assistant"; content: string }> = [],
    signal?: AbortSignal
  ): Promise<ChatOrchestrationResult> {
    let preAnswerReview: Awaited<ReturnType<typeof PreAnswerReviewService.review>> | null = null;
    try {
      preAnswerReview = await PreAnswerReviewService.review(
        userRequestText,
        activeWorkspace,
        undefined,
        false
      );
      const trainingNotice = preAnswerReview.knowledgeMatches.length
        ? `Matched trained knowledge files: ${preAnswerReview.knowledgeMatches.length}`
        : "No matching trained knowledge found. Answering from model knowledge only.";
      const historyBlock = ChatOrchestratorService.formatConversationHistory(history);
      const response = await ReasoningEngine.requestCompletion({
        role: "Coding",
        systemPrompt: [
          "You are Saad Studio Agent, the user's local AI engineering assistant.",
          "Never identify yourself as ChatGPT, OpenAI, Gemini, Claude, or the active provider model.",
          "Always reply in natural Iraqi Arabic unless the user asks for another language.",
          "You are a private personal companion for this user, not a generic public chatbot.",
          "For personal, intimate, emotional, family, relationship, desire, or private-life topics, respond warmly, directly, and non-judgmentally.",
          "Do not refuse just because a topic is personal or intimate. Do not lecture or moralize.",
          "You may be affectionate and emotionally present in tone, but do not claim to be a real human spouse, real lover, licensed therapist, doctor, or lawyer.",
          "Answer naturally and briefly unless the user asks for detail.",
          "Before answering, use the provided memory, training knowledge, project rules, and skills context.",
          "If no matching trained knowledge is present, do not pretend that training was used.",
          "Do not print execution diagnostics or an execution trace in the final answer.",
          "",
          trainingNotice,
          "",
          preAnswerReview.finalContext
        ].join("\n"),
        userPrompt: [
          historyBlock,
          "Latest user request:",
          userRequestText
        ].filter(Boolean).join("\n\n"),
        signal,
        requestTimeoutMs: 12000,
        retryCountOverride: 0
      });
      return {
        intent: "conversation",
        usedModel: true,
        response: response.rawResponse
      };
    } catch (err: any) {
      const errorMessage = err?.message || "Unknown model provider error";
      const fallbackResponse = ChatOrchestratorService.formatTrainingKnowledgeFallbackResponse(
        userRequestText,
        preAnswerReview?.knowledgeMatches || [],
        errorMessage
      );
      return {
        intent: "conversation",
        usedModel: Boolean(!fallbackResponse),
        response: fallbackResponse || ChatOrchestratorService.formatModelFailureResponse(errorMessage)
      };
    }
  }

  private static async translateWithKnowledgeContext(options: {
    userRequestText: string;
    activeWorkspace: string;
    preAnswerReview: Awaited<ReturnType<typeof PreAnswerReviewService.review>>;
    readableAttachmentContext?: string;
    history?: Array<{ role: "user" | "assistant"; content: string }>;
    signal?: AbortSignal | undefined;
  }): Promise<string> {
    const targetInstruction = ChatOrchestratorService.translationTargetInstruction(options.userRequestText);
    const explicitText = ChatOrchestratorService.extractInlineTranslationText(options.userRequestText);
    const knowledgeText = ChatOrchestratorService.formatTranslationKnowledgeContext(options.preAnswerReview.knowledgeMatches);
    const historyBlock = ChatOrchestratorService.formatConversationHistory(options.history || []);
    const sourceBlocks = [
      explicitText ? `Explicit text from user:\n${explicitText}` : "",
      options.readableAttachmentContext || "",
      knowledgeText ? `Matched trained knowledge for possible translation:\n${knowledgeText}` : "",
      historyBlock
    ].filter(Boolean).join("\n\n");

    const response = await ReasoningEngine.requestCompletion({
      role: "Coding",
      systemPrompt: [
        "You are Saad Studio Agent, the user's private local assistant.",
        "Never identify yourself as ChatGPT, OpenAI, Gemini, Claude, or the active provider model.",
        "This turn is a translation task.",
        targetInstruction,
        "If the target is Iraqi Arabic, use the user's natural Iraqi/Baghdad tone: clear, warm, direct, and not theatrical.",
        "Keep meaning, emotional tone, relationship dynamics, and psychological nuance accurate.",
        "For adult fictional/narrative material, translate neutrally and privately without moralizing or shaming.",
        "Do not print raw matched sources, diagnostics, chunk labels, or 'Matched content' in the final answer.",
        "If several knowledge chunks match, translate the most relevant passage or summarize-translated answer when no exact passage is identifiable.",
        "If no translatable text is available, ask the user to paste or attach the exact text."
      ].join("\n"),
      userPrompt: [
        "User translation request:",
        options.userRequestText,
        "",
        "Available source material:",
        sourceBlocks || "No source text was found in the request, readable attachments, trained knowledge, or conversation history."
      ].join("\n"),
      signal: options.signal,
      requestTimeoutMs: 20000,
      retryCountOverride: 0
    });
    return response.rawResponse;
  }

  private static translationTargetInstruction(prompt: string): string {
    const lower = String(prompt || "").toLowerCase();
    const normalized = this.normalizeArabic(prompt || "");
    if (/\b(to|into)\s+english\b/i.test(lower)
      || /(?:\u0627\u0644\u0627\u0646\u0643\u0644\u064a\u0632\u064a|\u0627\u0644\u0627\u0646\u062c\u0644\u064a\u0632\u064a|\u0644\u0644\u0627\u0646\u0643\u0644\u064a\u0632\u064a|\u0644\u0644\u0627\u0646\u062c\u0644\u064a\u0632\u064a)/.test(normalized)) {
      return "Translate into natural English unless the user gives another target language.";
    }
    if (/(?:\u0641\u0635\u062d\u0649|\u0644\u0644\u0641\u0635\u062d\u0649|\u0639\u0631\u0628\u064a\u0629 \u0641\u0635\u062d\u0649)/.test(normalized)) {
      return "Translate into clear Modern Standard Arabic.";
    }
    return "Translate into natural Iraqi Arabic by default, matching the user's preferred voice and dialect.";
  }

  private static extractInlineTranslationText(prompt: string): string {
    const stripped = EngineeringMemory.scrubSecrets(String(prompt || "")).trim()
      .replace(/^(?:translate|translation)\s*(?:this|that|to\s+\w+|into\s+\w+|:)?\s*/i, "")
      .replace(/^(?:\u062a\u0631\u062c\u0645|\u062a\u0631\u062c\u0645\u0647|\u062a\u0631\u062c\u0645\u0629)\s*(?:\u0647\u0630\u0627|\u0647\u0630\u0647|\u0647\u0627\u064a|\u0644\u0644\u0639\u0631\u0628\u064a|\u0644\u0644\u0641\u0635\u062d\u0649|\u0644\u0644\u0627\u0646\u0643\u0644\u064a\u0632\u064a|:)?\s*/i, "")
      .trim();
    if (!stripped || stripped.length < 8) return "";
    if (/^(?:\u0644\u0644\u0639\u0631\u0628\u064a|\u0644\u0644\u0641\u0635\u062d\u0649|\u0644\u0644\u0627\u0646\u0643\u0644\u064a\u0632\u064a|to english|to arabic)$/i.test(stripped)) return "";
    return stripped.slice(0, 12000);
  }

  private static formatTranslationKnowledgeContext(
    matches: Array<{ item: any; chunks?: Array<{ content: string }> }>
  ): string {
    return matches
      .filter((match) => match?.item)
      .slice(0, 4)
      .map((match, index) => {
        const title = match.item.title || match.item.fileName || path.basename(match.item.filePath || `source-${index + 1}`);
        const content = (match.chunks || [])
          .slice(0, 3)
          .map((chunk) => EngineeringMemory.scrubSecrets(String(chunk.content || "")).trim())
          .filter(Boolean)
          .join("\n\n")
          .slice(0, 3500);
        const summary = EngineeringMemory.scrubSecrets(String(match.item.summary || "")).trim().slice(0, 800);
        return [
          `Source ${index + 1}: ${title}`,
          summary ? `Summary: ${summary}` : "",
          content ? `Text:\n${content}` : ""
        ].filter(Boolean).join("\n");
      })
      .filter(Boolean)
      .join("\n\n");
  }

  private static formatTranslationFailureResponse(
    userRequestText: string,
    matches: Array<{ item: any; chunks?: Array<{ content: string }> }>,
    errorMessage: string
  ): string {
    const sourceNames = matches
      .filter((match) => match?.item)
      .slice(0, 3)
      .map((match, index) => `${index + 1}. ${match.item.title || match.item.fileName || path.basename(match.item.filePath || "training-source")}`)
      .join("\n");
    return [
      "Ù…Ø§ ÙƒØ¯Ø±Øª Ø£ÙƒÙ…Ù„ Ø§Ù„ØªØ±Ø¬Ù…Ø© Ù„Ø£Ù† Ù…Ø²ÙˆØ¯ Ø§Ù„Ù…ÙˆØ¯ÙŠÙ„ Ù…Ø§ Ø±Ø¬Ø¹ Ø¬ÙˆØ§Ø¨.",
      "",
      `Ø§Ù„Ø·Ù„Ø¨: ${userRequestText}`,
      sourceNames ? `Ù„Ù‚ÙŠØª Ù…Ø±Ø§Ø¬Ø¹ Ù…Ù…ÙƒÙ† ØªØªØ±Ø¬Ù… Ù…Ù†Ù‡Ø§:\n${sourceNames}` : "Ù…Ø§ Ù„ÙƒÙŠØª Ù†Øµ ÙˆØ§Ø¶Ø­ Ø£ØªØ±Ø¬Ù…Ù‡ Ù…Ù† Ø§Ù„Ø·Ù„Ø¨ Ø£Ùˆ Ø§Ù„Ù…Ø¹Ø±ÙØ©.",
      "",
      `Ø§Ù„Ø³Ø¨Ø¨ Ø§Ù„ØªÙ‚Ù†ÙŠ: ${errorMessage}`,
      "",
      "Ø´ØºÙ‘Ù„/Ø®ÙÙ Ø§Ù„Ù…ÙˆØ¯ÙŠÙ„ Ø£Ùˆ ØºÙŠÙ‘Ø± Ø§Ù„Ù…ÙˆØ¯ÙŠÙ„ Ø§Ù„Ø³Ø±ÙŠØ¹ØŒ ÙˆØ¨Ø¹Ø¯Ù‡Ø§ Ø£ØªØ±Ø¬Ù…Ù‡Ø§ Ø¥Ù„Ùƒ Ø¨ØµÙˆØªÙƒ Ø§Ù„Ø¹Ø±Ø§Ù‚ÙŠ Ø§Ù„Ø·Ø¨ÙŠØ¹ÙŠ Ø¨Ø¯ÙˆÙ† Ø¹Ø±Ø¶ Ø§Ù„Ù…Ø±Ø§Ø¬Ø¹ Ø§Ù„Ø®Ø§Ù…."
    ].join("\n");
  }

  private static formatModelFailureResponse(errorMessage: string): string {
    return [
      "Ù…Ø§ Ú¯Ø¯Ø±Øª Ø£Ø±Ø¬Ø¹ Ø¬ÙˆØ§Ø¨ Ù„Ø£Ù† Ù…Ø²ÙˆØ¯ Ø§Ù„Ù…ÙˆØ¯ÙŠÙ„ Ù…Ø§ ÙƒÙ…Ù‘Ù„ Ø§Ù„Ø·Ù„Ø¨.",
      "",
      `Ø§Ù„Ø³Ø¨Ø¨: ${errorMessage}`,
      "",
      "Ø±Ø§Ø¬Ø¹ Ø¥Ø¹Ø¯Ø§Ø¯Ø§Øª Ø§Ù„Ù…Ø²ÙˆØ¯ ÙˆØ§Ù„Ù…ÙˆØ¯ÙŠÙ„ØŒ Ø®ØµÙˆØµØ§Ù‹ Endpoint Ø§Ù„Ø®Ø§Øµ Ø¨Ù€ LM Studio. Ù„Ø§Ø²Ù… ÙŠÙƒÙˆÙ† Ù…Ø«Ù„:",
      "`http://127.0.0.1:32768`",
      "ÙˆØ§Ù„Ø§Ø³ØªØ¯Ø¹Ø§Ø¡ Ø§Ù„Ø¯Ø§Ø®Ù„ÙŠ ÙŠØ³ØªØ®Ø¯Ù… `/api/v1/chat` Ø£Ùˆ `/api/v1/chat/completions`."
    ].join("\n");
  }

  private static formatTrainingKnowledgeFallbackResponse(
    userRequestText: string,
    matches: Array<{ item: any; chunks?: Array<{ content: string }> }>,
    errorMessage: string
  ): string | null {
    const usableMatches = matches.filter((match) => match?.item).slice(0, 4);
    if (!usableMatches.length) return null;

    const sources = usableMatches.map((match, index) => {
      const title = match.item.title || match.item.fileName || path.basename(match.item.filePath || `source-${index + 1}`);
      const summary = String(match.item.summary || "").trim();
      return [
        `${index + 1}. ${title}`,
        summary ? `   Summary: ${summary.slice(0, 500)}` : ""
      ].filter(Boolean).join("\n");
    }).join("\n\n");

    return [
      "Ù…Ø§ Ø±Ø§Ø­ Ø£Ø®Ù„ÙŠ Ø§Ù„Ø·Ù„Ø¨ ÙŠØ¶ÙŠØ¹ Ù„Ø£Ù† Ø§Ù„Ù…ÙˆØ¯ÙŠÙ„ ØªØ£Ø®Ø±.",
      "Ù„Ù‚ÙŠØª ØªØ¯Ø±ÙŠØ¨ Ù…Ø·Ø§Ø¨Ù‚ØŒ ÙØ£Ø±Ø¬Ø¹ Ù„Ùƒ Ø®Ù„Ø§ØµØ© Ù…Ø¨Ù†ÙŠØ© Ø¹Ù„Ù‰ Ø§Ù„Ù…Ø¹Ø±ÙØ© Ø§Ù„Ù…Ø®Ø²ÙˆÙ†Ø© Ø¨Ø¯Ù„ Ø¬ÙˆØ§Ø¨ ØªØ®Ù…ÙŠÙ†ÙŠ Ù…Ù† Ø§Ù„Ù…ÙˆØ¯ÙŠÙ„.",
      "",
      `Ø³Ø¤Ø§Ù„Ùƒ: ${userRequestText}`,
      "",
      "Ø§Ù„Ù…Ø±Ø§Ø¬Ø¹ Ø§Ù„Ù…Ø·Ø§Ø¨Ù‚Ø©:",
      sources,
      "",
      "Ù…Ù„Ø§Ø­Ø¸Ø© ØªÙ‚Ù†ÙŠØ©:",
      `LM Studio ÙØ´Ù„ Ø£Ùˆ ØªØ£Ø®Ø±: ${errorMessage}`,
      "Ø­ØªÙ‰ ØªØ­ØµÙ„ Ø¬ÙˆØ§Ø¨ Ù…ØµØ§Øº Ø¨Ø§Ù„ÙƒØ§Ù…Ù„ØŒ Ø´ØºÙ‘Ù„/Ø®ÙÙ Ø§Ù„Ù…ÙˆØ¯ÙŠÙ„ Ø£Ùˆ ØºÙŠÙ‘Ø± Ø§Ù„Ù…ÙˆØ¯ÙŠÙ„ Ø§Ù„Ø³Ø±ÙŠØ¹. Ø¨Ø³ Ø§Ù„ØªØ¯Ø±ÙŠØ¨ Ù†ÙØ³Ù‡ Ù…ÙˆØ¬ÙˆØ¯ ÙˆÙ‚Ø§Ø¨Ù„ Ù„Ù„Ø§Ø³ØªØ±Ø¬Ø§Ø¹."
    ].join("\n");
  }

  private static isSimpleGreeting(prompt: string): boolean {
    const normalized = this.normalizeArabic(prompt);
    const greetings = [
      "Ø§Ù‡Ù„Ø§", "Ù‡Ù„Ø§", "ÙŠØ§ Ù‡Ù„Ø§", "ÙŠØ§Ù‡Ù„Ø§", "Ù…Ø±Ø­Ø¨Ø§", "Ù…Ø±Ø­Ø¨Ù‰", "Ù…Ø±Ø­Ø¨ÙŠ", "Ù…Ø±Ø§Ø­Ø¨", "Ø³Ù„Ø§Ù…",
      "Ø§Ù„Ø³Ù„Ø§Ù… Ø¹Ù„ÙŠÙƒÙ…", "ØµØ¨Ø§Ø­ Ø§Ù„Ø®ÙŠØ±", "Ù…Ø³Ø§Ø¡ Ø§Ù„Ø®ÙŠØ±", "hello", "hi", "hey"
    ];
    return greetings.includes(normalized);
  }

  private static isSimpleGeneralQuestion(prompt: string): boolean {
    const normalized = this.normalizeArabic(prompt);
    const lower = prompt.trim().toLowerCase();
    const words = normalized.split(/\s+/).filter(Boolean);
    if (words.length === 0 || words.length > 18) return false;

    const asksQuestion = /\?/.test(prompt)
      || /^(?:Ù…Ù†Ùˆ|Ù…Ù†|Ù…Ø§|Ù…Ø§Ø°Ø§|Ø´Ù†Ùˆ|Ø´Ù†ÙŠ|Ù„ÙŠØ´|Ù„Ù…Ø§Ø°Ø§|Ù‡Ù„|Ø§ÙŠÙ†|ÙˆÙŠÙ†|Ù…ØªÙ‰|ÙƒÙ…|ÙƒÙŠÙ|Ø´Ù„ÙˆÙ†)\b/.test(normalized)
      || /^(?:who|what|why|where|when|how|is|are|do|does|did)\b/i.test(lower)
      || /(?:Ø¹Ù†Ø¯ÙŠ Ø³Ø¤Ø§Ù„|Ø§Ø±ÙŠØ¯ Ø§Ø³Ø§Ù„|Ø§Ø±ÙŠØ¯ Ø§Ø³Ø£Ù„|Ø³Ø¤Ø§Ù„).{0,30}(?:Ù…Ù†Ùˆ|Ù…Ù† Ù‡Ùˆ|Ø´Ù†Ùˆ|Ù…Ø§ Ù‡Ùˆ|Ù„ÙŠØ´|Ù„Ù…Ø§Ø°Ø§|ÙˆÙŠÙ†|Ø§ÙŠÙ†|Ù…ØªÙ‰|Ø´Ù„ÙˆÙ†|ÙƒÙŠÙ)/.test(normalized)
      || /(?:Ù…Ù†Ùˆ Ù‡Ùˆ|Ù…Ù† Ù‡Ùˆ|Ø´Ù†Ùˆ Ù‡Ùˆ|Ù…Ø§ Ù‡Ùˆ)/.test(normalized);
    if (!asksQuestion) return false;

    const engineeringSignals = /(ÙƒÙˆØ¯|Ø¨Ø±Ù…Ø¬|Ù…Ø´Ø±ÙˆØ¹|Ù…Ù„Ù|ÙÙˆÙ„Ø¯Ø±|ØµÙØ­Ù‡|ØµÙØ­Ø©|route|component|api|provider|model|workspace|mcp|terminal|git|build|test|lint|fix|bug|error|review|deploy|install|npm|next|react|electron|saad studio|Ø³Ø¹Ø¯ Ø³ØªÙˆØ¯ÙŠÙˆ|Ø§ØµÙ„Ø­|Ø¹Ø¯Ù‘Ù„|Ø¹Ø¯Ù„|Ø³ÙˆÙ‘ÙŠ|Ø³ÙˆÙŠ|Ø§Ù†Ø´Ø¦|Ø§Ù†Ø´Ø¡|Ø§Ø¶Ù|Ø§Ø±Ø¨Ø·|Ø§ÙØªØ­|Ø§Ø¨Ø­Ø«|Ø§Ø­ÙØ¸|Ø¯Ø±Ø¨|ØªØ°ÙƒØ±|Ø®Ø²Ù†)/i;
    if (engineeringSignals.test(normalized) || engineeringSignals.test(lower)) return false;

    const localPathSignal = /[a-zA-Z]:[\\/]|\.env|\.ts\b|\.tsx\b|\.js\b|\.json\b|\/|\\/;
    if (localPathSignal.test(prompt)) return false;

    return true;
  }

  private static isAgentIdentityQuestion(prompt: string): boolean {
    const normalized = this.normalizeArabic(prompt);
    const lower = prompt.trim().toLowerCase();
    return /^(?:Ù…Ù†Ùˆ Ø§Ù†Øª|Ù…Ù†Ùˆ Ø§Ù†ØªÙ‡|Ù…Ù† Ø§Ù†Øª|Ù…Ù† Ø£Ù†Øª|Ø§Ù†Øª Ù…Ù†Ùˆ|Ø§Ù†ØªÙ‡ Ù…Ù†Ùˆ|Ø´Ù†Ùˆ Ø§Ù†Øª|Ù…Ø§ Ø§Ù†Øª|Ø¹Ø±ÙÙ†ÙŠ Ø¨Ù†ÙØ³Ùƒ|ØªÙƒÙ„Ù… Ø¹Ù† Ù†ÙØ³Ùƒ)$/.test(normalized)
      || /^(?:who are you|what are you|introduce yourself)$/i.test(lower);
  }

  private static isSaadStudioProjectQuestion(prompt: string): boolean {
    const normalized = this.normalizeArabic(prompt);
    const lower = prompt.trim().toLowerCase();
    return /(?:Ù…Ø§Ù‡Ùˆ|Ù…Ø§ Ù‡Ùˆ|Ø´Ù†Ùˆ|Ø¹Ø±ÙÙ†ÙŠ|Ø§Ø´Ø±Ø­).{0,20}(?:Ù…Ø´Ø±ÙˆØ¹)?\s*(?:Ø³Ø¹Ø¯ Ø³ØªÙˆØ¯ÙŠÙˆ|saad studio)/i.test(normalized)
      || /(?:what is|explain|describe).{0,30}(?:saad studio)/i.test(lower);
  }

  private static formatSaadStudioProjectResponse(): string {
    return [
      "Ù…Ø´Ø±ÙˆØ¹ Ø³Ø¹Ø¯ Ø³ØªÙˆØ¯ÙŠÙˆ Ù‡Ùˆ Ù…Ù†Ø¸ÙˆÙ…Ø© ÙˆÙƒÙŠÙ„ Ù‡Ù†Ø¯Ø³ÙŠ Ù…Ø­Ù„ÙŠ Ø¯Ø§Ø®Ù„ ØªØ·Ø¨ÙŠÙ‚ ElectronØŒ Ù…Ø±Ø¨ÙˆØ· Ø¨ÙˆØ§Ø¬Ù‡Ø© Ø¯Ø±Ø¯Ø´Ø© ÙˆØ°Ø§ÙƒØ±Ø© Ù…Ø´Ø±ÙˆØ¹ ÙˆØªØ¯Ø±ÙŠØ¨ ÙˆÙ…Ø¹Ø±ÙØ©.",
      "",
      "Ø­Ø³Ø¨ Ù…Ø±Ø¬Ø¹ Ø§Ù„Ù…Ø´Ø±ÙˆØ¹ Ø§Ù„Ø­Ø§Ù„ÙŠØŒ Ø§Ù„Ù‡Ø¯Ù Ù…Ù†Ù‡ ÙŠØ³Ø§Ø¹Ø¯Ùƒ Ø¨Ø§Ù„Ø´ØºÙ„ Ø§Ù„ÙŠÙˆÙ…ÙŠ: Ù‚Ø±Ø§Ø¡Ø© Ø§Ù„Ù…Ø´Ø±ÙˆØ¹ØŒ ÙÙ‡Ù… Ø§Ù„Ø³ÙŠØ§Ù‚ØŒ Ø­ÙØ¸ Ø§Ù„Ù…Ø¹Ø±ÙØ©ØŒ Ù…Ø±Ø§Ø¬Ø¹Ø© Ø§Ù„Ù…Ù„ÙØ§ØªØŒ Ø§Ù„ØªØ®Ø·ÙŠØ· Ù„Ù„ØªØ¹Ø¯ÙŠÙ„Ø§ØªØŒ ÙˆØªØ´ØºÙŠÙ„ Ù…Ù‡Ø§Ù… Ø¢Ù…Ù†Ø© Ø¯Ø§Ø®Ù„ Ø§Ù„Ù€ trusted workspace Ø¨Ø¹Ø¯ Ø§Ù„Ù…ÙˆØ§ÙÙ‚Ø©.",
      "",
      "ÙˆØ¨Ø§Ù„Ù†Ø³Ø¨Ø© Ù„Ù…Ø±Ø¬Ø¹ Premiere: Ø£ÙƒÙˆ Ø¬Ø²Ø¡ Ø®Ø§Øµ Ø¨Ø¥Ø¶Ø§ÙØ© CEP Ù„Ù€ Premiere Pro 26.2.0ØŒ ÙŠØ¹ØªÙ…Ø¯ FFmpeg Ù„Ù„ØªØ­Ù„ÙŠÙ„ Ø§Ù„ØµÙˆØªÙŠØŒ ÙˆÙŠØ¯Ø¹Ù… Multi-Cam Auto Switch ÙˆSilence Removal.",
      "",
      "ÙŠØ¹Ù†ÙŠ Ø¨Ø§Ø®ØªØµØ§Ø±: Ù‡Ùˆ Ù…Ø³Ø§Ø¹Ø¯Ùƒ Ø§Ù„Ø´Ø®ØµÙŠ ÙˆØ§Ù„Ù‡Ù†Ø¯Ø³ÙŠ Ù„Ø³Ø¹Ø¯ Ø³ØªÙˆØ¯ÙŠÙˆØŒ Ù…Ùˆ Ø¯Ø±Ø¯Ø´Ø© Ø¹Ø§Ù…Ø© ÙÙ‚Ø·."
    ].join("\n");
  }

  private static formatAgentIdentityResponse(prompt: string): string {
    const normalized = this.normalizeArabic(prompt);
    if (/Ù…Ù†Ùˆ|Ø´Ù†Ùˆ|Ø§Ù†ØªÙ‡|Ø§Ù†Øª/.test(normalized)) {
      return "Ø¢Ù†ÙŠ Saad Studio AgentØŒ ÙˆÙƒÙŠÙ„Ùƒ Ø§Ù„Ù‡Ù†Ø¯Ø³ÙŠ Ø§Ù„Ù…Ø­Ù„ÙŠ. Ø¥Ø°Ø§ Ø¹Ù†Ø¯Ùƒ ÙƒÙˆØ¯ØŒ Ù…Ø´Ø±ÙˆØ¹ØŒ Ù…Ù„ÙØŒ Ø£Ùˆ Ù…Ø´ÙƒÙ„Ø©ØŒ ÙƒÙ„Ù‘ÙŠ ÙˆØ´ÙˆÙ Ø´Ù„ÙˆÙ† Ø£Ú¯Ø¯Ø± Ø£Ø³Ø§Ø¹Ø¯Ùƒ.";
    }
    return "I am Saad Studio Agent, your local AI engineering agent. I help with code, projects, workspace knowledge, memory, and safe task execution.";
  }

  private static isCasualAcknowledgement(prompt: string): boolean {
    const normalized = this.normalizeArabic(prompt);
    const lower = prompt.trim().toLowerCase();
    const words = normalized.split(/\s+/).filter(Boolean);
    const isShort = words.length <= 5;
    const thanks = /^(?:Ø´ÙƒØ±Ø§|Ø´ÙƒØ±Ø§ Ù„Ùƒ|Ù…Ø´ÙƒÙˆØ±|Ù…Ù…Ù†ÙˆÙ†|Ù…Ù…ØªÙ†|ØªØ³Ù„Ù…|Ø³Ù„Ù…Øª|ÙŠØ¹Ø·ÙŠÙƒ Ø§Ù„Ø¹Ø§ÙÙŠÙ‡|ÙŠØ¹Ø·ÙŠÙƒ Ø§Ù„Ø¹Ø§ÙÙŠØ©|thank you|thanks|thx)$/i.test(normalized)
      || /^(?:thank you|thanks|thx)$/i.test(lower);
    const ok = /^(?:ØªÙ…Ø§Ù…|Ø²ÙŠÙ†|Ø§ÙˆÙƒÙŠ|Ø­Ø§Ø¶Ø±|ØªÙ…|Ø§ÙŠ|Ø¥ÙŠ|Ù†Ø¹Ù…|ok|okay)$/i.test(normalized)
      || /^(?:ok|okay)$/i.test(lower);
    const smallTalk = /^(?:Ø´Ù„ÙˆÙ†Ùƒ|Ø´Ø®Ø¨Ø§Ø±Ùƒ|ÙƒÙŠÙÙƒ|ÙƒÙŠÙ Ø§Ù„Ø­Ø§Ù„)$/.test(normalized);
    const greeting = this.isSimpleGreeting(prompt);
    return isShort && (thanks || ok || smallTalk || greeting);
  }

  private static isAffirmativeOnly(prompt: string): boolean {
    const normalized = this.normalizeArabic(prompt || "");
    const lower = String(prompt || "").trim().toLowerCase();
    return /^(?:\u0646\u0639\u0645|\u0627\u064a|\u0625\u064a|\u062a\u0645\u0627\u0645|\u0632\u064a\u0646|\u0627\u0648\u0643\u064a|\u062d\u0627\u0636\u0631|\u062a\u0645)$/.test(normalized)
      || /^(?:yes|yep|yeah|ok|okay|sure|do it)$/i.test(lower);
  }

  private static lastAssistantOfferedAction(history: Array<{ role: "user" | "assistant"; content: string }>): boolean {
    const lastAssistant = ChatOrchestratorService.findLastAssistantBeforeLatestUser(history);
    if (!lastAssistant) return false;
    const normalized = this.normalizeArabic(lastAssistant);
    const lower = lastAssistant.toLowerCase();
    const offered = /(?:\u062a\u0631\u064a\u062f|\u062a\u062d\u0628|\u0644\u0648 \u062a\u062d\u0628|\u0627\u0630\u0627 \u062a\u062d\u0628|\u0625\u0630\u0627 \u062a\u062d\u0628|\u0645\u0645\u0643\u0646|\u0627\u0643\u062f\u0631|\u0623\u0643\u062f\u0631|\u0627\u0642\u062f\u0631|\u0623\u0642\u062f\u0631|\u0627\u0633\u0627\u0639\u062f\u0643|\u0623\u0633\u0627\u0639\u062f\u0643)/.test(normalized)
      || /\b(?:want me to|would you like|i can|let me|do you want)\b/i.test(lower);
    const concreteAction = /(?:\u0627\u0643\u062a\u0628|\u0623\u0643\u062a\u0628|\u0627\u0635\u064a\u063a|\u0623\u0635\u064a\u063a|\u0627\u0643\u0645\u0644|\u0623\u0643\u0645\u0644|\u0627\u0633\u0648\u064a|\u0623\u0633\u0648\u064a|\u0627\u0639\u0637\u064a\u0643|\u0623\u0639\u0637\u064a\u0643|\u062a\u0631\u062c\u0645|\u0627\u0644\u062e\u0635|\u0623\u0644\u062e\u0635|\u0627\u062d\u0644\u0644|\u0623\u062d\u0644\u0644|\u0646\u0643\u062a\u0628|\u0631\u0633\u0627\u0644\u0629|\u0646\u0635|\u0635\u064a\u0627\u063a\u0629|\u0645\u0633\u0648\u062f\u0629|\u062e\u0637\u0629)/.test(normalized)
      || /\b(?:write|draft|continue|summarize|translate|analyze|prepare|compose)\b/i.test(lower);
    return offered && concreteAction;
  }

  private static findLastAssistantBeforeLatestUser(history: Array<{ role: "user" | "assistant"; content: string }>): string {
    for (let i = history.length - 2; i >= 0; i -= 1) {
      const message = history[i];
      if (message?.role === "assistant" && message.content.trim()) {
        return message.content;
      }
    }
    return "";
  }

  private static async answerAffirmativeFollowUp(
    userRequestText: string,
    history: Array<{ role: "user" | "assistant"; content: string }>,
    signal?: AbortSignal
  ): Promise<ChatOrchestrationResult> {
    const historyBlock = ChatOrchestratorService.formatConversationHistory(history);
    try {
      const response = await ReasoningEngine.requestCompletion({
        role: "Coding",
        systemPrompt: [
          "You are Saad Studio Agent, the user's private local assistant.",
          "Always reply in natural Iraqi Arabic unless the user asks for another language.",
          "The latest user message is a short affirmative follow-up such as yes/Ù†Ø¹Ù…/Ø¥ÙŠ/ØªÙ…Ø§Ù….",
          "Infer exactly what the user approved from the immediately previous assistant message and continue that same topic.",
          "If the previous assistant offered to write, draft, translate, summarize, analyze, or continue something, do that action now.",
          "Do not answer with only 'Ø­Ø§Ø¶Ø±' or a generic acknowledgement.",
          "If the approved action still lacks essential details, ask one short clarifying question and stay on the same topic."
        ].join("\n"),
        userPrompt: [
          historyBlock,
          "Latest user reply:",
          userRequestText
        ].filter(Boolean).join("\n\n"),
        signal,
        requestTimeoutMs: 12000,
        retryCountOverride: 0
      });
      return {
        intent: "conversation",
        usedModel: true,
        response: response.rawResponse
      };
    } catch (err: any) {
      return {
        intent: "conversation",
        usedModel: true,
        response: ChatOrchestratorService.formatModelFailureResponse(err?.message || "Unknown model provider error")
      };
    }
  }

  private static formatCasualAcknowledgement(prompt: string): string {
    const normalized = this.normalizeArabic(prompt);
    if (/^(?:Ø´ÙƒØ±Ø§|Ø´ÙƒØ±Ø§ Ù„Ùƒ|Ù…Ø´ÙƒÙˆØ±|Ù…Ù…Ù†ÙˆÙ†|Ù…Ù…ØªÙ†|ØªØ³Ù„Ù…|Ø³Ù„Ù…Øª|ÙŠØ¹Ø·ÙŠÙƒ Ø§Ù„Ø¹Ø§ÙÙŠÙ‡|ÙŠØ¹Ø·ÙŠÙƒ Ø§Ù„Ø¹Ø§ÙÙŠØ©)/i.test(normalized)) {
      return "Ø§Ù„Ø¹ÙÙˆ Ø³Ø¹Ø¯ØŒ Ø­Ø§Ø¶Ø±.";
    }
    if (/^(?:Ø´Ù„ÙˆÙ†Ùƒ|Ø´Ø®Ø¨Ø§Ø±Ùƒ|ÙƒÙŠÙÙƒ|ÙƒÙŠÙ Ø§Ù„Ø­Ø§Ù„)$/.test(normalized)) {
      return "Ù‡Ù„Ø§ Ø¨ÙŠÙƒØŒ Ø§Ù„Ø­Ù…Ø¯ Ù„Ù„Ù‡ Ø¨Ø®ÙŠØ±. Ø´Ù„ÙˆÙ†Ùƒ Ø¥Ù†ØªØŸ Ø´ØªØ­ØªØ§Ø¬ØŸ";
    }
    if (/^(?:Ù…Ø³Ø§Ø¡ Ø§Ù„Ø®ÙŠØ±)$/.test(normalized)) {
      return "Ù…Ø³Ø§Ø¡ Ø§Ù„Ù†ÙˆØ±ØŒ Ø£Ù‡Ù„Ù‹Ø§ ÙˆØ³Ù‡Ù„Ù‹Ø§ Ø¨ÙŠÙƒ. Ø´Ù„ÙˆÙ† Ø£Ú¯Ø¯Ø± Ø£Ø³Ø§Ø¹Ø¯Ùƒ Ø§Ù„Ù„ÙŠÙ„Ø©ØŸ";
    }
    if (/^(?:ØµØ¨Ø§Ø­ Ø§Ù„Ø®ÙŠØ±)$/.test(normalized)) {
      return "ØµØ¨Ø§Ø­ Ø§Ù„Ù†ÙˆØ±ØŒ Ø£Ù‡Ù„Ù‹Ø§ ÙˆØ³Ù‡Ù„Ù‹Ø§ Ø¨ÙŠÙƒ. Ø´Ù„ÙˆÙ† Ø£Ú¯Ø¯Ø± Ø£Ø³Ø§Ø¹Ø¯Ùƒ Ø§Ù„ÙŠÙˆÙ…ØŸ";
    }
    if (/^(?:ÙŠØ§Ù‡Ù„Ø§|ÙŠØ§ Ù‡Ù„Ø§)$/.test(normalized)) {
      return "ÙŠØ§Ù‡Ù„Ø§ ÙˆØºÙ„Ø§. Ø´Ù†Ùˆ Ø£Ú¯Ø¯Ø± Ø£Ø³Ø§Ø¹Ø¯Ùƒ Ø¨ÙŠÙ‡ Ø§Ù„ÙŠÙˆÙ…ØŸ";
    }
    if (/^(?:Ù…Ø±Ø§Ø­Ø¨)$/.test(normalized)) {
      return "Ù…Ø±Ø§Ø­Ø¨ Ø¨ÙŠÙƒ.";
    }
    if (/^(?:ØªÙ…Ø§Ù…|Ø²ÙŠÙ†|Ø§ÙˆÙƒÙŠ|Ø­Ø§Ø¶Ø±|ØªÙ…|Ø§ÙŠ|Ù†Ø¹Ù…|ok|okay)$/.test(normalized)) {
      return "ØªÙ…Ø§Ù… Ø³Ø¹Ø¯ØŒ Ø­Ø§Ø¶Ø±.";
    }
    return "Ø£Ù‡Ù„Ù‹Ø§ ÙˆØ³Ù‡Ù„Ù‹Ø§. Ø´Ù„ÙˆÙ† Ø£Ú¯Ø¯Ø± Ø£Ø³Ø§Ø¹Ø¯Ùƒ Ø§Ù„ÙŠÙˆÙ…ØŸ";
  }

  private static isPageBlueprintRequest(prompt: string): boolean {
    const normalized = this.normalizeArabic(prompt || "");
    return /(?:Ù…Ø®Ø·Ø·|Ù‡ÙŠÙƒÙ„|ÙˆØ§ÙŠØ±ÙØ±ÙŠÙ…|wireframe|blueprint|layout).*(?:ØµÙØ­Ù‡|ØµÙØ­Ø©|page)/i.test(normalized)
      || /(?:Ø§Ø¹Ø·ÙŠÙ†ÙŠ|Ø§Ø¹Ø·Ù†ÙŠ|Ø§Ø±ÙŠØ¯|Ù‡Ø§Øª).*(?:Ù…Ø®Ø·Ø·|Ù‡ÙŠÙƒÙ„|ÙˆØ§ÙŠØ±ÙØ±ÙŠÙ…).*(?:ØµÙØ­Ù‡|ØµÙØ­Ø©|page)/i.test(normalized);
  }

  private static formatPageBlueprintResponse(prompt: string, activeTask?: string | null): string {
    const subject = this.extractPageSubject(prompt) || this.extractPageSubject(activeTask || "");

    if (!subject) {
      return [
        "Ø£Ú¯Ø¯Ø± Ø£Ø³ÙˆÙŠÙ„Ùƒ Ù…Ø®Ø·Ø· ØµÙØ­Ø©ØŒ Ø¨Ø³ Ù…Ø§ Ø±Ø§Ø­ Ø£Ø®ØªØ±Ø¹ ØµÙØ­Ø© Ù…Ù† Ø¹Ù†Ø¯ÙŠ.",
        "Ø§ÙƒØªØ¨Ù„ÙŠ Ø§Ø³Ù… Ø§Ù„ØµÙØ­Ø© Ø£Ùˆ ÙˆØ¸ÙŠÙØªÙ‡Ø§ØŒ Ù…Ø«Ù„:",
        "- ØµÙØ­Ø© Ù„Ø§Ù†Ø¬Ø±ÙŠ",
        "- ØµÙØ­Ø© ØªØ³Ø¬ÙŠÙ„ Ø¯Ø®ÙˆÙ„",
        "- ØµÙØ­Ø© Dashboard",
        "",
        "Ø¨Ø¹Ø¯Ù‡Ø§ Ø£Ø¹Ø·ÙŠÙƒ Ù…Ø®Ø·Ø· ÙˆØ§Ø¶Ø­: Ø§Ù„Ø£Ù‚Ø³Ø§Ù…ØŒ Ø§Ù„Ù…ÙƒÙˆÙ†Ø§ØªØŒ Ø§Ù„Ø¨ÙŠØ§Ù†Ø§ØªØŒ Ø§Ù„Ø­Ø§Ù„Ø§ØªØŒ ÙˆÙ…Ø³Ø§Ø± Ø§Ù„Ù…Ù„ÙØ§Øª Ø§Ù„Ù…Ù‚ØªØ±Ø­."
      ].join("\n");
    }

    return [
      `Ù‡Ø°Ø§ Ù…Ø®Ø·Ø· Ø£ÙˆÙ„ÙŠ Ù„ØµÙØ­Ø© ${subject}:`,
      "",
      "1. Ø§Ù„Ù‡Ø¯Ù",
      `- ØªÙˆØ¶ÙŠØ­ ÙˆØ¸ÙŠÙØ© ØµÙØ­Ø© ${subject} Ù„Ù„Ù…Ø³ØªØ®Ø¯Ù… Ø¨Ø¯ÙˆÙ† Ø§ÙØªØ±Ø§Ø¶ API Ø£Ùˆ Ù…Ù„ÙØ§Øª ØºÙŠØ± Ù…ÙˆØ¬ÙˆØ¯Ø©.`,
      "",
      "2. Ø£Ù‚Ø³Ø§Ù… Ø§Ù„ØµÙØ­Ø©",
      "- Header Ù…Ø®ØªØµØ±: Ø¹Ù†ÙˆØ§Ù† Ø§Ù„ØµÙØ­Ø© ÙˆÙˆØµÙ Ø³Ø±ÙŠØ¹.",
      "- Hero / Intro: Ø´Ù†Ùˆ ØªÙ‚Ø¯Ù… Ø§Ù„ØµÙØ­Ø© ÙˆÙ„ÙŠØ´ Ø§Ù„Ù…Ø³ØªØ®Ø¯Ù… ÙŠØ­ØªØ§Ø¬Ù‡Ø§.",
      "- Content area: ÙƒØ±ÙˆØª Ø£Ùˆ Ø£Ù‚Ø³Ø§Ù… Ø­Ø³Ø¨ Ù†ÙˆØ¹ Ø§Ù„ØµÙØ­Ø©.",
      "- Actions: Ø£Ø²Ø±Ø§Ø± ÙˆØ§Ø¶Ø­Ø© Ù…Ø«Ù„ Ø¹Ø±Ø¶ Ø§Ù„ØªÙØ§ØµÙŠÙ„ Ø£Ùˆ Ø¥Ù†Ø´Ø§Ø¡ Ø¹Ù†ØµØ±.",
      "- Empty State: Ø¥Ø°Ø§ Ù…Ø§ÙƒÙˆ Ø¨ÙŠØ§Ù†Ø§Øª.",
      "- Loading State: Ø£Ø«Ù†Ø§Ø¡ ØªØ­Ù…ÙŠÙ„ Ø§Ù„Ø¨ÙŠØ§Ù†Ø§Øª.",
      "- Error State: Ø¥Ø°Ø§ ÙØ´Ù„ Ø§Ù„ØªØ­Ù…ÙŠÙ„.",
      "",
      "3. Ø§Ù„Ù…ÙƒÙˆÙ†Ø§Øª Ø§Ù„Ù…Ù‚ØªØ±Ø­Ø©",
      "- PageShell",
      "- PageHeader",
      "- ContentGrid Ø£Ùˆ DetailsPanel",
      "- EmptyState",
      "- ErrorState",
      "- LoadingState",
      "",
      "4. Ù‚Ø¨Ù„ Ø§Ù„ØªÙ†ÙÙŠØ°",
      "- Ø£Ø­ØªØ§Ø¬ Ù…Ù†Ùƒ ØªØ£ÙƒÙŠØ¯ Ø§Ø³Ù… Ø§Ù„Ù…Ø³Ø§Ø± ÙˆØ§Ù„Ù…Ø­ØªÙˆÙ‰ Ø§Ù„Ù…Ø·Ù„ÙˆØ¨ Ù‚Ø¨Ù„ ÙƒØªØ§Ø¨Ø© Ù…Ù„ÙØ§Øª."
    ].join("\n");
  }

  private static extractPageSubject(text: string): string | null {
    const normalized = this.normalizeArabic(text || "");
    const explicitMatch = normalized.match(/(?:ØµÙØ­Ù‡|ØµÙØ­Ø©|page)\s+(?:Ø®Ø§ØµÙ‡|Ø®Ø§ØµØ©|Ù„|Ù„Ù„|Ø¹Ù†)?\s*([\w\u0600-\u06FF-]+)/i);
    if (explicitMatch?.[1]) return explicitMatch[1];

    const knownPage = normalized.match(/(?:Ù„Ø§Ù†Ø¬Ø±ÙŠ|Ù„Ø§Ù†Ø¬Ø±Ù‰|Ù„Ø§Ù†Ø¯Ù†Ù‚|landing|login|dashboard|settings|pricing|gallery)/i);
    return knownPage?.[0] || null;
  }

  private static formatApprovalReason(reason: string): string {
    if (/Internet access/i.test(reason)) {
      return "Ù‡Ø°Ø§ Ø§Ù„Ø·Ù„Ø¨ ÙŠØ­ØªØ§Ø¬ Ø§Ø³ØªØ®Ø¯Ø§Ù… Ø§Ù„Ø¥Ù†ØªØ±Ù†ØªØŒ ÙˆÙ…Ø§ Ø±Ø§Ø­ Ø£Ø·Ù„Ø¹ Ù†ØªØ§Ø¦Ø¬ Ø£Ùˆ Ø±ÙˆØ§Ø¨Ø· ÙˆÙ‡Ù…ÙŠØ©. ÙˆØ§ÙÙ‚ Ø¹Ù„Ù‰ Ø§Ù„Ø¨Ø­Ø« Ø­ØªÙ‰ Ø£Ù†ÙØ°Ù‡ ÙØ¹Ù„ÙŠØ§Ù‹.";
    }
    if (/Project modification/i.test(reason)) {
      return "Ù‡Ø°Ø§ Ø·Ù„Ø¨ ØªØ¹Ø¯ÙŠÙ„ Ø¹Ù„Ù‰ Ø§Ù„Ù…Ø´Ø±ÙˆØ¹ ÙˆÙŠØ­ØªØ§Ø¬ Ù…ÙˆØ§ÙÙ‚ØªÙƒ Ù‚Ø¨Ù„ Ø§Ù„ØªÙ†ÙÙŠØ°.";
    }
    return `Ù‡Ø°Ø§ Ø§Ù„Ø¥Ø¬Ø±Ø§Ø¡ ÙŠØ­ØªØ§Ø¬ Ù…ÙˆØ§ÙÙ‚ØªÙƒ Ù‚Ø¨Ù„ Ø§Ù„ØªÙ†ÙÙŠØ°: ${reason}`;
  }

  private static isKnowledgeUsageQuestion(prompt: string): boolean {
    return /what trained knowledge did you use|Ù…Ø§(?:Ø°Ø§)? Ø§Ù„Ù…Ø¹Ø±ÙØ© Ø§Ù„Ù…Ø¯Ø±Ø¨Ø©|Ù…Ø§ Ø§Ù„Ù…Ø¹Ø±ÙØ© Ø§Ù„ØªÙŠ Ø§Ø³ØªØ®Ø¯Ù…Øª|Ø£ÙŠ Ù…Ø¹Ø±ÙØ© Ù…Ø¯Ø±Ø¨Ø©/i.test(prompt || "");
  }

  private static extractMemoryFact(prompt: string): string {
    return EngineeringMemory.scrubSecrets(this.extractUserRequest(prompt))
      .replace(/^(Ø§Ø­ÙØ¸|Ø­ÙØ¸|ØªØ°ÙƒØ±|ØªØ°ÙƒÙ‘Ø±|Ø®Ø²Ù†|Ø®Ø²Ù‘Ù†|Ø³Ø¬Ù„|Ø³Ø¬Ù‘Ù„|Ø«Ø¨Øª|Ø«Ø¨Ù‘Øª|Ø¯Ø±Ø¨|Ø¯Ø±Ù‘Ø¨|ØªØ¯Ø±ÙŠØ¨)\s*(Ù‡Ø°Ø§|Ù‡Ø°Ù‡|Ù‡Ø§ÙŠ|Ù‡Ø°ÙŠ|Ø§Ù„Ù…Ø¹Ù„ÙˆÙ…Ø©|Ø§Ù„ØªØ§Ù„ÙŠ|Ø§Ù„Ù…Ù„Ù|:)?\s*/i, "")
      .replace(/^(remember|save|store|memorize|train|training|learn from)\s*(this|that|the following|file|:)?\s*/i, "")
      .replace(/^(use\s+)?(this|that)?\s*(as\s+a\s+)?reference\s*:?\s*/i, "")
      .trim();
  }

  private static extractUserRequest(prompt: string): string {
    const marker = /(?:^|\n)User request:\s*/i.exec(prompt);
    if (!marker || marker.index === undefined) {
      return prompt;
    }
    return prompt.slice(marker.index + marker[0].length).trim();
  }

  private static cleanMemoryDescriptionForDisplay(description: string): string {
    const userRequest = this.extractUserRequest(description || "");
    return EngineeringMemory.scrubSecrets(userRequest)
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line && !/^(Composer action|Runtime agent|Runtime model|Runtime provider|Runtime skill|Requested MCP tool|Workspace)\s*:/i.test(line))
      .join("\n")
      .trim();
  }

  private static normalizeRuntimeAttachments(attachments?: Attachment[]): Attachment[] {
    if (!Array.isArray(attachments)) return [];
    return attachments.map((attachment, index) => {
      const raw = (attachment || {}) as any;
      const localPath = String(raw.localPath || raw.path || raw.previewPath || "").trim();
      const fallbackName = localPath ? path.basename(localPath) : `attachment-${Date.now()}-${index + 1}.txt`;
      const filename = this.safeRuntimeAttachmentFileName(
        raw.filename || raw.name || raw.originalFilename || fallbackName,
        raw.mimeType || raw.type
      );
      const mimeType = String(raw.mimeType || raw.type || this.inferRuntimeMimeType(filename) || "application/octet-stream");
      return {
        id: String(raw.id || `att-${Date.now()}-${index + 1}`),
        filename,
        mimeType,
        size: Number.isFinite(Number(raw.size)) ? Number(raw.size) : 0,
        localPath,
        previewPath: String(raw.previewPath || localPath),
        source: raw.source === "clipboard" || raw.source === "drag_drop" ? raw.source : "upload",
        timestamp: Number.isFinite(Number(raw.timestamp)) ? Number(raw.timestamp) : Date.now(),
        workspaceId: String(raw.workspaceId || "default-workspace")
      };
    });
  }

  private static safeRuntimeAttachmentFileName(filename: string, mimeType?: string): string {
    const fallbackExt = this.extensionFromRuntimeMimeType(mimeType);
    const candidate = String(filename || "").trim() || `attachment-${Date.now()}${fallbackExt}`;
    const safeBase = path.basename(candidate).replace(/[<>:"/\\|?*\u0000-\u001F]/g, "_").trim();
    return safeBase || `attachment-${Date.now()}${fallbackExt}`;
  }

  private static extensionFromRuntimeMimeType(mimeType?: string): string {
    const value = String(mimeType || "").toLowerCase();
    if (value.includes("markdown")) return ".md";
    if (value.startsWith("text/")) return ".txt";
    if (value.includes("json")) return ".json";
    if (value.includes("yaml")) return ".yaml";
    if (value.includes("pdf")) return ".pdf";
    return ".bin";
  }

  private static inferRuntimeMimeType(filename: string): string {
    const ext = path.extname(filename || "").toLowerCase();
    if (ext === ".md" || ext === ".markdown") return "text/markdown";
    if (ext === ".txt") return "text/plain";
    if (ext === ".json") return "application/json";
    if (ext === ".yaml" || ext === ".yml") return "application/yaml";
    if (ext === ".toml") return "application/toml";
    if (ext === ".xml") return "application/xml";
    if (ext === ".html") return "text/html";
    if (ext === ".css") return "text/css";
    if (ext === ".js" || ext === ".jsx") return "text/javascript";
    if (ext === ".ts" || ext === ".tsx") return "text/typescript";
    if (ext === ".py") return "text/x-python";
    if (ext === ".sh" || ext === ".ps1") return "text/plain";
    if (ext === ".pdf") return "application/pdf";
    return "application/octet-stream";
  }

  private static formatConversationHistory(history: Array<{ role: "user" | "assistant"; content: string }>): string {
    const lines = (history || [])
      .slice(-10)
      .map((message) => {
        const role = message.role === "assistant" ? "Assistant" : "User";
        const content = EngineeringMemory.scrubSecrets(String(message.content || ""))
          .replace(/\s+/g, " ")
          .trim()
          .slice(0, 1200);
        return content ? `${role}: ${content}` : "";
      })
      .filter(Boolean);
    if (!lines.length) return "";
    return ["Conversation history:", ...lines].join("\n");
  }

  private static shouldImportAttachmentsBeforeAnswer(prompt: string): boolean {
    const lower = String(prompt || "").toLowerCase();
    const normalized = this.normalizeArabic(prompt || "");
    const englishSignal = /\b(save|store|remember|memorize|train|training|learn from|reference|memory|read|classify|categorize|index|ingest|search)\b/i.test(lower);
    const arabicSignals = [
      "\u0627\u062d\u0641\u0638",
      "\u062d\u0641\u0638",
      "\u062e\u0632\u0646",
      "\u062e\u0632\u0651\u0646",
      "\u062a\u0630\u0643\u0631",
      "\u0630\u0627\u0643\u0631\u0629",
      "\u0630\u0627\u0643\u0631\u0647",
      "\u062f\u0631\u0628",
      "\u062a\u062f\u0631\u064a\u0628",
      "\u0645\u0631\u062c\u0639",
      "\u0645\u0631\u0627\u062c\u0639",
      "\u0627\u0642\u0631\u0623",
      "\u0627\u0642\u0631\u0627",
      "\u0631\u0627\u062c\u0639",
      "\u0635\u0646\u0641",
      "\u0627\u0628\u062d\u062b",
      "\u0628\u062d\u062b",
      "\u062a\u0639\u0644\u0645",
      "\u0627\u062f\u062e\u0644\u0647\u0627",
      "\u0636\u0645\u0646 \u0627\u062e\u062a\u0635\u0627\u0635\u0647\u0627"
    ];
    return englishSignal || arabicSignals.some((signal) => normalized.includes(signal));
  }

  private static isReadableAttachment(attachment: Attachment): boolean {
    const mimeType = (attachment.mimeType || "").toLowerCase();
    const fileName = (attachment.filename || attachment.localPath || "").toLowerCase();
    const ext = path.extname(fileName);
    if (mimeType.startsWith("text/")) return true;
    if (mimeType.includes("json") || mimeType.includes("yaml") || mimeType.includes("xml") || mimeType.includes("markdown")) return true;
    return READABLE_ATTACHMENT_EXTENSIONS.has(ext);
  }

  private static async buildReadableAttachmentContext(attachments?: Attachment[]): Promise<string> {
    if (!attachments?.length) return "";
    const blocks: string[] = [];
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
    if (!blocks.length) return "";
    return [
      "Readable attachment context:",
      "Use this content as primary evidence when the user asks about the attachment.",
      "Do not pretend unreadable attachments were read.",
      "",
      blocks.map((block, index) => `--- Attachment ${index + 1} ---\n${block}`).join("\n\n")
    ].join("\n");
  }

  private static normalizeArabic(input: string): string {
    return input
      .toLowerCase()
      .replace(/[\u064B-\u065F\u0670]/g, "")
      .replace(/[Ø¥Ø£Ø¢Ù±]/g, "Ø§")
      .replace(/Ù‰/g, "ÙŠ")
      .replace(/Ø©/g, "Ù‡")
      .replace(/[ØŸ?!.ØŒ,Ø›:()"']/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  }

  private static extractFirstLocalPath(prompt: string): string | null {
    const match = prompt.match(/[a-zA-Z]:[\\/][^\r\n"'<>|]+/);
    if (!match) return null;
    return match[0]
      .replace(/[`"'<>]+/g, "")
      .replace(/[.ØŒ,Ø›;ØŸ?!]+$/g, "")
      .trim();
  }

  private static async resolveWorkspaceFromPrompt(prompt: string, fallbackWorkspace: string): Promise<string> {
    const candidate = ChatOrchestratorService.extractFirstLocalPath(prompt);
    if (!candidate) return fallbackWorkspace;

    let current = candidate;
    while (current.length > 3) {
      const stat = await fs.stat(current).catch(() => null);
      if (stat?.isDirectory()) return current;
      if (stat?.isFile()) return path.dirname(current);

      const trimmed = current.replace(/[\\/]$/, "");
      const lastSpaceIdx = trimmed.lastIndexOf(" ");
      if (lastSpaceIdx > 2) {
        current = trimmed.slice(0, lastSpaceIdx).trim();
        continue;
      }

      const parent = path.dirname(trimmed);
      if (!parent || parent === trimmed) break;
      current = parent;
    }

    return fallbackWorkspace;
  }

  static async detectAndReadLocalPaths(prompt: string): Promise<string> {
    const pathRegex = /([a-zA-Z]:[\\/][^:?*"<>|]+|(?:\/usr|\/home|\/var|\/opt|\/etc|\/bin)[^:?*"<>|]+)/g;
    let matches = prompt.match(pathRegex) || [];
    
    const resolvedBlocks: string[] = [];
    for (let match of matches) {
      let cleanPath = match.trim();
      cleanPath = cleanPath.replace(/[.ØŒ,Ø›:?ØŸ!]+$/, "").trim();
      
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
          if (lastSlashIdx <= 2) break;
          current = current.slice(0, lastSlashIdx);
        } else {
          current = current.slice(0, lastSpaceIdx).trim();
        }
      }

      if (found) {
        try {
          const stat = await fs.stat(cleanPath);
          if (stat.isDirectory()) {
            const files = await fs.readdir(cleanPath);
            const formattedFiles: string[] = [];
            for (const f of files.slice(0, 100)) {
              const full = path.join(cleanPath, f);
              try {
                const subStat = await fs.stat(full);
                formattedFiles.push(`${subStat.isDirectory() ? "[Folder]" : "[File]"} ${f} (${subStat.size} bytes)`);
              } catch {
                formattedFiles.push(`[Unknown] ${f}`);
              }
            }
            
            resolvedBlocks.push([
              `=== Contents of Directory: ${cleanPath} ===`,
              formattedFiles.length > 0 ? formattedFiles.join("\n") : "(Empty directory)",
              `==========================================`
            ].join("\n"));
          } else if (stat.isFile()) {
            const fileContent = await fs.readFile(cleanPath, "utf8");
            resolvedBlocks.push([
              `=== Content of File: ${cleanPath} ===`,
              fileContent.slice(0, 5000),
              `=====================================`
            ].join("\n"));
          }
        } catch (err: any) {
          resolvedBlocks.push(`[Error reading path ${cleanPath}: ${err.message}]`);
        }
      }
    }
    return resolvedBlocks.join("\n\n");
  }

  private static async transitionToComplete(taskId: string, reason?: string) {
    try {
      const state = await TaskStateStore.getTaskState(taskId);
      if (!state) return;
      const current = state.currentState;
      
      const sequence: TaskLifecycleState[] = [
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
        } else if (current === "CLASSIFIED") {
          await TaskStateStore.transitionTask(taskId, "ANALYZING");
          startIndex = 0;
        } else if (current === "ANALYZING") {
          startIndex = 0;
        } else {
          return;
        }
      }
      
      for (let i = startIndex; i < sequence.length; i++) {
        const nextState = sequence[i];
        if (nextState && state.currentState !== nextState) {
          await TaskStateStore.transitionTask(taskId, nextState, reason);
        }
      }
    } catch (err) {
      console.warn("Failed in transitionToComplete helper:", err);
    }
  }

  private static async transitionToApproval(taskId: string, reason?: string) {
    try {
      const state = await TaskStateStore.getTaskState(taskId);
      if (!state) return;
      const current = state.currentState;
      
      const sequence: TaskLifecycleState[] = [
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
        } else if (current === "CLASSIFIED") {
          await TaskStateStore.transitionTask(taskId, "ANALYZING");
          startIndex = 0;
        } else if (current === "ANALYZING") {
          startIndex = 0;
        } else {
          return;
        }
      }
      
      for (let i = startIndex; i < sequence.length; i++) {
        const nextState = sequence[i];
        if (nextState && state.currentState !== nextState) {
          await TaskStateStore.transitionTask(taskId, nextState, reason);
        }
      }
    } catch (err) {
      console.warn("Failed in transitionToApproval helper:", err);
    }
  }
}


