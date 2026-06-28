import { EventBus } from "../platform/services/event-bus.js";
import { LocalCreativeProvider, SaadStudioCreativeProvider } from "./creative-providers.js";
import type {
  CreativeProvider,
  CreativeTask,
  CreativePlan,
  CreativeJobStatus,
  GeneratedAssetMetadata,
} from "./creative-types.js";

export class CreativeEngine {
  private static providers: Map<string, CreativeProvider> = new Map();
  private static activePlans: Map<string, { plan: CreativePlan; task: CreativeTask }> = new Map();
  private static activeJobs: Map<string, { jobId: string; providerId: string }> = new Map();

  static initialize(): void {
    if (this.providers.size === 0) {
      const local = new LocalCreativeProvider();
      const saad = new SaadStudioCreativeProvider();
      this.providers.set(local.id, local);
      this.providers.set(saad.id, saad);
    }
  }

  static getProviders(): CreativeProvider[] {
    this.initialize();
    return Array.from(this.providers.values());
  }

  static getProvider(id: string): CreativeProvider | undefined {
    this.initialize();
    return this.providers.get(id);
  }

  static async createCreativePlan(
    prompt: string,
    providerId: string = "provider-saad-studio",
    model: string = "flux-1.0-dev",
    size: string = "1024x1024",
    workspaceId: string = "default"
  ): Promise<CreativePlan> {
    this.initialize();
    const provider = this.getProvider(providerId) || this.getProvider("provider-local")!;

    const taskId = `task-creative-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`;
    const task: CreativeTask = {
      id: taskId,
      type: "text-to-image",
      prompt,
      model,
      size,
      workspaceId
    };

    const outputPath = `.saad-agent/attachments/generated/`;
    const estimatedCost = provider.costMode === "free" ? "Free" : "10 Credits";

    const plan: CreativePlan = {
      taskId,
      providerId: provider.id,
      providerName: provider.name,
      model,
      prompt,
      size,
      estimatedCost,
      outputPath,
      requiresApproval: true,
      status: "awaiting_approval"
    };

    this.activePlans.set(taskId, { plan, task });

    EventBus.publish("CreativePlanCreated", { taskId, plan });
    EventBus.publish("GenerationApprovalRequired", { taskId, plan });

    return plan;
  }

  static async approveJob(taskId: string, approved: boolean): Promise<CreativeJobStatus> {
    this.initialize();
    const record = this.activePlans.get(taskId);
    if (!record) {
      throw new Error(`Creative task not found: ${taskId}`);
    }

    if (!approved) {
      record.plan.status = "rejected";
      EventBus.publish("GenerationFailed", { taskId, error: "User rejected creative generation request." });
      return { jobId: `rejected-${taskId}`, status: "failed", progress: 0, error: "User rejected generation request." };
    }

    record.plan.status = "generating";
    const provider = this.getProvider(record.plan.providerId)!;

    EventBus.publish("GenerationStarted", { taskId, providerId: provider.id });

    try {
      const jobStatus = await provider.generate(record.task);
      this.activeJobs.set(taskId, { jobId: jobStatus.jobId, providerId: provider.id });

      EventBus.publish("GenerationProgressUpdated", { taskId, jobId: jobStatus.jobId, progress: jobStatus.progress });

      // Poll completion helper
      setTimeout(async () => {
        let currentStatus = await provider.getJobStatus(jobStatus.jobId);
        let retries = 0;
        while (currentStatus.status === "processing" && retries < 20) {
          await new Promise(r => setTimeout(r, 100));
          currentStatus = await provider.getJobStatus(jobStatus.jobId);
          retries++;
        }

        if (currentStatus.status === "completed" && currentStatus.asset) {
          record.plan.status = "completed";
          EventBus.publish("GenerationCompleted", { taskId, asset: currentStatus.asset });
          EventBus.publish("GeneratedAssetStored", { taskId, localPath: currentStatus.asset.localPath });
        } else {
          record.plan.status = "failed";
          EventBus.publish("GenerationFailed", { taskId, error: currentStatus.error || "Generation failed" });
        }
      }, 150);

      return jobStatus;
    } catch (err: any) {
      record.plan.status = "failed";
      EventBus.publish("GenerationFailed", { taskId, error: err.message });
      throw err;
    }
  }

  static async getJobStatus(taskId: string): Promise<CreativeJobStatus> {
    this.initialize();
    const jobRef = this.activeJobs.get(taskId);
    if (!jobRef) {
      const record = this.activePlans.get(taskId);
      if (record && record.plan.status === "rejected") {
        return { jobId: `rejected-${taskId}`, status: "failed", progress: 0, error: "User rejected generation request." };
      }
      return { jobId: `unknown-${taskId}`, status: "failed", progress: 0, error: "Job reference not found" };
    }

    const provider = this.getProvider(jobRef.providerId)!;
    return provider.getJobStatus(jobRef.jobId);
  }
}
