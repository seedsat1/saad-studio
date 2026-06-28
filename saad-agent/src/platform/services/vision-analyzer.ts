import { ReasoningEngine } from "./reasoning-engine.js";
import { EventBus } from "./event-bus.js";
import { CONFIG } from "../../config.js";
import * as fs from "fs/promises";

export interface VisionAnalysisResult {
  summary: string;
  detectedElements: string[];
  layoutIssues: string[];
  textDetected: string;
  designIssues: string[];
  recommendedActions: string[];
  confidence: number;
  relatedFilesIfAny: string[];
}

export class VisionAnalyzer {
  static async analyzeImage(localPath: string, mimeType: string): Promise<VisionAnalysisResult> {
    EventBus.publish("VisionAnalysisStarted", { localPath });

    const modelName = CONFIG.ROLES.Vision;
    if (!modelName || modelName.trim() === "") {
      EventBus.publish("VisionModelUnavailable", { localPath });
      throw new Error("Vision model is not configured in CONFIG.ROLES.Vision");
    }

    try {
      const fileBuffer = await fs.readFile(localPath);
      const base64Data = fileBuffer.toString("base64");
      const imageUrl = `data:${mimeType};base64,${base64Data}`;

      const systemPrompt = `You are an expert design, layout, and UI debugging assistant.
Analyze the user's visual image input and identify UI layout issues, text elements, design constraints, and recommended actions.
You must return a raw JSON object complying with the following schema:
{
  "summary": "High-level summary of the visual screenshot",
  "detectedElements": ["List of buttons, forms, elements found"],
  "layoutIssues": ["Alignment errors, overlapping components, formatting bugs"],
  "textDetected": "All textual contents found in the image",
  "designIssues": ["Color palette conflicts, font issues, aesthetic feedback"],
  "recommendedActions": ["Clear list of fixes recommended"],
  "confidence": 0.95,
  "relatedFilesIfAny": []
}`;

      const userPrompt = "Analyze the attached screenshot and extract UI/UX layout, elements, text content, and recommendations.";

      EventBus.publish("MultimodalContextCreated", { localPath });

      const response = await ReasoningEngine.requestCompletion({
        role: "Vision",
        systemPrompt,
        userPrompt,
        imageUrl
      });

      if (!response.parsedJson) {
        throw new Error("Failed to parse vision response as JSON: " + response.error);
      }

      const result: VisionAnalysisResult = {
        summary: response.parsedJson.summary || "No summary provided",
        detectedElements: response.parsedJson.detectedElements || [],
        layoutIssues: response.parsedJson.layoutIssues || [],
        textDetected: response.parsedJson.textDetected || "",
        designIssues: response.parsedJson.designIssues || [],
        recommendedActions: response.parsedJson.recommendedActions || [],
        confidence: response.parsedJson.confidence || 0.8,
        relatedFilesIfAny: response.parsedJson.relatedFilesIfAny || []
      };

      EventBus.publish("VisionAnalysisCompleted", { localPath, result });
      return result;
    } catch (err: any) {
      EventBus.publish("VisionAnalysisFailed", { localPath, error: err.message });
      throw err;
    }
  }
}
