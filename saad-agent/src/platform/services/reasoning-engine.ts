import { ModelClient } from "./model-client.js";
import { ProviderHealthMonitor } from "./health-monitor.js";
import { EventBus } from "./event-bus.js";
import { CONFIG } from "../../config.js";
import { SettingsManager } from "../../production/settings-manager.js";

export type ModelRole = "Coding" | "Vision" | "Reviewer" | "Fast";

export interface ReasoningRequest {
  role: ModelRole;
  systemPrompt: string;
  userPrompt: string;
  imageUrl?: string;
}

export interface ReasoningResponse {
  rawResponse: string;
  parsedJson?: any;
  isRepaired?: boolean;
  isValidJson?: boolean;
  error?: string;
}

export class ReasoningEngine {
  static async requestCompletion(request: ReasoningRequest): Promise<ReasoningResponse> {
    const runtime = await SettingsManager.getModelRuntime(request.role);
    const modelName = runtime.model.modelName || CONFIG.ROLES[request.role];
    if (!modelName) {
      throw new Error(`Model role "${request.role}" is not configured in CONFIG.ROLES`);
    }

    // 1. Provider Health Verification
    const health = await ProviderHealthMonitor.checkProviderHealth(runtime.provider.id);
    if (health.status === "offline" && runtime.provider.healthStatus === "offline") {
      throw new Error(`Provider "${runtime.provider.name}" is offline: ${health.details || runtime.provider.lastError || "Connection failed"}`);
    }

    // 2. Chat Request
    try {
      const response = request.imageUrl
        ? await ModelClient.chatCompletionMultimodal(
            request.systemPrompt,
            request.userPrompt,
            modelName,
            request.imageUrl,
            runtime
          )
        : await ModelClient.chatCompletion(
            request.systemPrompt,
            request.userPrompt,
            modelName,
            runtime
          );

      let parsedJson: any = undefined;
      let isValidJson = false;
      let isRepaired = false;
      try {
        parsedJson = JSON.parse(response);
        isValidJson = true;
      } catch {
        const jsonMatch = response.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          try {
            parsedJson = JSON.parse(jsonMatch[0]);
            isValidJson = true;
            isRepaired = true;
          } catch {}
        }
      }

      return { rawResponse: response, parsedJson, isValidJson, isRepaired };
    } catch (err: any) {
      throw new Error(`Reasoning request failed: ${err.message}`);
    }
  }

  static async generateStructuredPlan(
    sessionId: string,
    systemPrompt: string,
    userPrompt: string
  ): Promise<ReasoningResponse> {
    const settings = await SettingsManager.getSettings();
    const codingProvider = settings.providers.find(p => p.id === settings.models.Coding.providerId);
    EventBus.publish("ModelPlanningStarted", { sessionId, provider: codingProvider?.id || CONFIG.PROVIDER });

    let response: ReasoningResponse;
    try {
      response = await this.requestCompletion({
        role: "Coding",
        systemPrompt,
        userPrompt,
      });
      EventBus.publish("ModelPlanningCompleted", { sessionId });
    } catch (err: any) {
      EventBus.publish("ModelPlanningFailed", { sessionId, error: err.message });
      return { rawResponse: "", error: err.message };
    }

    // 3. JSON Parsing & Repair
    let parsedJson: any = null;
    let isRepaired = false;
    let isValidJson = false;

    try {
      parsedJson = JSON.parse(response.rawResponse);
      isValidJson = true;
    } catch {
      EventBus.publish("PlanJsonInvalid", { sessionId, rawOutput: response.rawResponse });
      try {
        const jsonMatch = response.rawResponse.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          parsedJson = JSON.parse(jsonMatch[0]);
          isRepaired = true;
          isValidJson = true;
          EventBus.publish("PlanJsonRepaired", { sessionId, repairedObj: parsedJson });
        }
      } catch {}
    }

    // 4. Schema structural validations
    if (
      !isValidJson ||
      !parsedJson ||
      typeof parsedJson.taskSummary !== "string" ||
      !Array.isArray(parsedJson.affectedFiles) ||
      !Array.isArray(parsedPlanFilterSteps(parsedJson.proposedSteps)) ||
      !Array.isArray(parsedPlanFilterSteps(parsedJson.validationSteps))
    ) {
      EventBus.publish("PlanValidationFailed", {
        sessionId,
        reason: "Parsed JSON fails required schema structure checks",
      });
      return {
        rawResponse: response.rawResponse,
        error: "JSON schema validation failed",
      };
    }

    EventBus.publish("PlanValidationPassed", { sessionId });

    return {
      rawResponse: response.rawResponse,
      parsedJson,
      isRepaired,
      isValidJson: true,
    };
  }
}

// Internal helper to validate list properties safely
function parsedPlanFilterSteps(arr: any): any[] | null {
  if (!Array.isArray(arr)) return null;
  return arr;
}
