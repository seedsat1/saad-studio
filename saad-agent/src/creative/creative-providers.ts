import * as fs from "fs/promises";
import * as path from "path";
import { CONFIG } from "../config.js";
import type {
  CreativeProvider,
  CreativeTask,
  CreativeJobStatus,
  GeneratedAssetMetadata,
  CreativeCapability,
} from "./creative-types.js";

export class LocalCreativeProvider implements CreativeProvider {
  id = "provider-local";
  name = "Local Offline Generator";
  type = "local" as const;
  capabilities: CreativeCapability[] = [
    "text-to-image",
    "image-to-image",
    "image-editing",
    "storyboard",
  ];
  costMode = "free" as const;
  requiresApproval = true;

  private jobs: Map<string, CreativeJobStatus> = new Map();

  async generate(task: CreativeTask): Promise<CreativeJobStatus> {
    const jobId = `job-local-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`;
    const statusRecord: CreativeJobStatus = {
      jobId,
      status: "processing",
      progress: 50,
    };
    this.jobs.set(jobId, statusRecord);

    // Simulate async local rendering
    setTimeout(async () => {
      try {
        const genDir = path.join(CONFIG.PROJECT_ROOT, ".saad-agent", "attachments", "generated");
        await fs.mkdir(genDir, { recursive: true });
        const assetId = `asset-${Date.now()}`;
        const fileName = `${assetId}-${task.model.replace(/[/\\?%*:|"<>]/g, "_")}.png`;
        const localPath = path.join(genDir, fileName);

        // Generate a 1x1 clean PNG buffer placeholder
        const mockPngBuffer = Buffer.from(
          "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
          "base64"
        );
        await fs.writeFile(localPath, mockPngBuffer);

        const asset: GeneratedAssetMetadata = {
          assetId,
          taskId: task.id,
          prompt: task.prompt,
          providerId: this.id,
          providerName: this.name,
          model: task.model,
          seed: task.seed || Math.floor(Math.random() * 1000000),
          size: task.size || "1024x1024",
          mimeType: "image/png",
          localPath,
          previewUrl: `data:image/png;base64,${mockPngBuffer.toString("base64")}`,
          source: "local_mock",
          timestamp: Date.now(),
          cost: "Free (0 Credits)"
        };

        this.jobs.set(jobId, {
          jobId,
          status: "completed",
          progress: 100,
          asset
        });
      } catch (err: any) {
        this.jobs.set(jobId, {
          jobId,
          status: "failed",
          progress: 0,
          error: err.message
        });
      }
    }, 100);

    return statusRecord;
  }

  async getJobStatus(jobId: string): Promise<CreativeJobStatus> {
    return this.jobs.get(jobId) || { jobId, status: "failed", progress: 0, error: "Job not found" };
  }

  async retrieveAsset(jobId: string): Promise<GeneratedAssetMetadata | null> {
    const job = this.jobs.get(jobId);
    return job?.asset || null;
  }
}

export class SaadStudioCreativeProvider implements CreativeProvider {
  id = "provider-saad-studio";
  name = "Saad Studio AI Suite";
  type = "saad_studio" as const;
  capabilities: CreativeCapability[] = [
    "text-to-image",
    "image-to-image",
    "image-editing",
    "storyboard",
  ];
  costMode = "credits" as const;
  requiresApproval = true;

  private jobs: Map<string, CreativeJobStatus> = new Map();

  async generate(task: CreativeTask): Promise<CreativeJobStatus> {
    const jobId = `job-saad-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`;
    const statusRecord: CreativeJobStatus = {
      jobId,
      status: "processing",
      progress: 30,
    };
    this.jobs.set(jobId, statusRecord);

    // Standard internal Saad Studio API shape execution
    setTimeout(async () => {
      try {
        const genDir = path.join(CONFIG.PROJECT_ROOT, ".saad-agent", "attachments", "generated");
        await fs.mkdir(genDir, { recursive: true });
        const assetId = `asset-saad-${Date.now()}`;
        const fileName = `${assetId}.png`;
        const localPath = path.join(genDir, fileName);

        const mockPngBuffer = Buffer.from(
          "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
          "base64"
        );
        await fs.writeFile(localPath, mockPngBuffer);

        const asset: GeneratedAssetMetadata = {
          assetId,
          taskId: task.id,
          prompt: task.prompt,
          providerId: this.id,
          providerName: `${this.name} (Mock Generation)`,
          model: task.model || "saad-studio-flux-1.0",
          seed: task.seed || 42,
          size: task.size || "1024x1024",
          mimeType: "image/png",
          localPath,
          previewUrl: `data:image/png;base64,${mockPngBuffer.toString("base64")}`,
          source: "saad_studio_mock",
          timestamp: Date.now(),
          cost: "10 Credits"
        };

        this.jobs.set(jobId, {
          jobId,
          status: "completed",
          progress: 100,
          asset
        });
      } catch (err: any) {
        this.jobs.set(jobId, {
          jobId,
          status: "failed",
          progress: 0,
          error: err.message
        });
      }
    }, 100);

    return statusRecord;
  }

  async getJobStatus(jobId: string): Promise<CreativeJobStatus> {
    return this.jobs.get(jobId) || { jobId, status: "failed", progress: 0, error: "Job not found" };
  }

  async retrieveAsset(jobId: string): Promise<GeneratedAssetMetadata | null> {
    const job = this.jobs.get(jobId);
    return job?.asset || null;
  }
}
