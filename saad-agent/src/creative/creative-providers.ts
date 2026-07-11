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
      status: "failed",
      progress: 0,
      error: "Local creative generation is not configured. No placeholder image was generated."
    };
    this.jobs.set(jobId, statusRecord);
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
      status: "failed",
      progress: 0,
      error: "Saad Studio creative generation is not connected to the authenticated panel/KIE pipeline yet. No placeholder image was generated."
    };
    this.jobs.set(jobId, statusRecord);
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
