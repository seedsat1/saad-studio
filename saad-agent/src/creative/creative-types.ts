export type CreativeCapability =
  | "text-to-image"
  | "image-to-image"
  | "image-editing"
  | "storyboard"
  | "video-generation-placeholder"
  | "audio-generation-placeholder";

export type CreativeProviderType = "local" | "saad_studio" | "cloud";

export interface CreativeTask {
  id: string;
  type: CreativeCapability;
  prompt: string;
  model: string;
  size: string;
  aspectRatio?: string;
  seed?: number;
  sourceImageId?: string;
  workspaceId: string;
}

export interface CreativePlan {
  taskId: string;
  providerId: string;
  providerName: string;
  model: string;
  prompt: string;
  size: string;
  estimatedCost: string;
  outputPath: string;
  requiresApproval: boolean;
  status: "awaiting_approval" | "approved" | "rejected" | "generating" | "completed" | "failed";
}

export interface GeneratedAssetMetadata {
  assetId: string;
  taskId: string;
  prompt: string;
  providerId: string;
  providerName: string;
  model: string;
  seed?: number;
  size: string;
  mimeType: string;
  localPath: string;
  previewUrl: string;
  source: string;
  timestamp: number;
  cost?: string;
}

export interface CreativeJobStatus {
  jobId: string;
  status: "queued" | "processing" | "completed" | "failed";
  progress: number; // 0 to 100
  asset?: GeneratedAssetMetadata;
  error?: string;
}

export interface CreativeProvider {
  id: string;
  name: string;
  type: CreativeProviderType;
  capabilities: CreativeCapability[];
  costMode: "free" | "credits" | "paid";
  requiresApproval: boolean;
  generate(task: CreativeTask): Promise<CreativeJobStatus>;
  getJobStatus(jobId: string): Promise<CreativeJobStatus>;
  retrieveAsset(jobId: string): Promise<GeneratedAssetMetadata | null>;
}
