import { CreativeEngine } from "../../creative/creative-engine.js";
import type { CreativePlan, CreativeJobStatus } from "../../creative/creative-types.js";

export class CreativeService {
  static async createPlan(
    prompt: string,
    providerId?: string,
    model?: string,
    size?: string,
    workspaceId?: string
  ): Promise<CreativePlan> {
    return CreativeEngine.createCreativePlan(prompt, providerId, model, size, workspaceId);
  }

  static async approveJob(taskId: string, approved: boolean): Promise<CreativeJobStatus> {
    return CreativeEngine.approveJob(taskId, approved);
  }

  static async getJobStatus(taskId: string): Promise<CreativeJobStatus> {
    return CreativeEngine.getJobStatus(taskId);
  }
}
