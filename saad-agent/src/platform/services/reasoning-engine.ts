import { ModelClient } from "./model-client.js";
import { ProviderHealthMonitor } from "./health-monitor.js";
import { EventBus } from "./event-bus.js";
import { CONFIG } from "../../config.js";

export type ModelRole = "Coding" | "Vision" | "Reviewer" | "Fast";

export interface ReasoningRequest {
  role: ModelRole;
  systemPrompt: string;
  userPrompt: string;
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
    const modelName = CONFIG.ROLES[request.role];
    if (!modelName) {
      throw new Error(`Model role "${request.role}" is not configured in CONFIG.ROLES`);
    }

    // 1. Provider Health Verification
    const health = await ProviderHealthMonitor.checkProviderHealth(CONFIG.PROVIDER);
    if (health.status === "offline") {
      throw new Error(`Provider "${CONFIG.PROVIDER}" is offline: ${health.details || "Connection failed"}`);
    }

    // 2. Chat Request
    try {
      const response = await ModelClient.chatCompletion(
        request.systemPrompt,
        request.userPrompt,
        modelName
      );
      return { rawResponse: response };
    } catch (err: any) {
      throw new Error(`Reasoning request failed: ${err.message}`);
    }
  }

  static async generateStructuredPlan(
    sessionId: string,
    systemPrompt: string,
    userPrompt: string
  ): Promise<ReasoningResponse> {
    EventBus.publish("ModelPlanningStarted", { sessionId, provider: CONFIG.PROVIDER });

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
