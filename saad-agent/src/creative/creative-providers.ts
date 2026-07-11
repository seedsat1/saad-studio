import type {
  CreativeProvider,
  CreativeTask,
  CreativeJobStatus,
  GeneratedAssetMetadata,
  CreativeCapability,
} from "./creative-types.js";

const KIE_CREATE_URL = "https://api.kie.ai/api/v1/jobs/createTask";
const KIE_QUERY_URL = "https://api.kie.ai/api/v1/jobs/recordInfo";

function extractImageUrls(value: unknown): string[] {
  if (!value) return [];
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) return [];
    if (trimmed.startsWith("{") || trimmed.startsWith("[")) {
      try {
        return extractImageUrls(JSON.parse(trimmed));
      } catch {
        return [];
      }
    }
    return /^https?:\/\//i.test(trimmed) ? [trimmed] : [];
  }
  if (Array.isArray(value)) return value.flatMap((item) => extractImageUrls(item));
  if (typeof value === "object") {
    const record = value as Record<string, unknown>;
    const direct = record.url ?? record.imageUrl ?? record.image_url ?? record.downloadUrl;
    if (typeof direct === "string") return extractImageUrls(direct);
    for (const key of ["imageUrls", "resultUrls", "images", "outputs", "urls", "result", "output", "response", "data"]) {
      const urls = extractImageUrls(record[key]);
      if (urls.length) return urls;
    }
  }
  return [];
}

function sanitizeError(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error || "Unknown error");
  return message.replace(/Bearer\s+[A-Za-z0-9._~+/=-]+/g, "Bearer [redacted]");
}

function resolveAspectRatio(size: string): string {
  const match = String(size || "").match(/^(\d+)x(\d+)$/);
  if (!match) return "1:1";
  const width = Number(match[1]);
  const height = Number(match[2]);
  if (!width || !height) return "1:1";
  if (width === height) return "1:1";
  return width > height ? "16:9" : "9:16";
}

function createCompletedAsset(task: CreativeTask, providerId: string, providerName: string, imageUrl: string, source: string): GeneratedAssetMetadata {
  return {
    assetId: `asset-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    taskId: task.id,
    prompt: task.prompt,
    providerId,
    providerName,
    model: task.model,
    seed: task.seed,
    size: task.size,
    mimeType: "image/png",
    localPath: imageUrl,
    previewUrl: imageUrl,
    source,
    timestamp: Date.now(),
    cost: source.includes("kie") ? "External provider" : "Saad Studio endpoint",
  };
}

async function postJson(url: string, headers: Record<string, string>, body: unknown): Promise<unknown> {
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...headers },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(180_000),
  });
  const json = await response.json().catch(() => ({}));
  if (!response.ok) {
    const detail = typeof (json as any)?.error === "string"
      ? (json as any).error
      : typeof (json as any)?.message === "string"
        ? (json as any).message
        : response.statusText;
    throw new Error(`Image endpoint failed (${response.status}): ${detail}`);
  }
  return json;
}

async function generateViaEndpoint(task: CreativeTask, endpoint: string, token?: string): Promise<string> {
  const headers = token ? { Authorization: `Bearer ${token}` } : {};
  const json = await postJson(endpoint, headers, {
    prompt: task.prompt,
    model: task.model,
    modelId: task.model,
    size: task.size,
    aspectRatio: task.aspectRatio || resolveAspectRatio(task.size),
    resolution: "1K",
    numImages: 1,
  });
  const urls = extractImageUrls(json);
  if (!urls.length) throw new Error("Image endpoint completed without returning an image URL.");
  return urls[0]!;
}

async function createKieTask(apiKey: string, task: CreativeTask): Promise<string> {
  const input = {
    prompt: task.prompt,
    aspect_ratio: task.aspectRatio || resolveAspectRatio(task.size),
    resolution: "1K",
  };
  const json = await postJson(KIE_CREATE_URL, { Authorization: `Bearer ${apiKey}` }, { model: task.model, input }) as {
    code?: number;
    msg?: string;
    data?: { taskId?: string };
  };
  if (json.code !== undefined && json.code !== 0 && json.code !== 200) {
    throw new Error(`KIE createTask failed: ${json.msg || json.code}`);
  }
  if (!json.data?.taskId) throw new Error("KIE did not return a taskId.");
  return json.data.taskId;
}

async function pollKieTask(apiKey: string, taskId: string): Promise<string> {
  for (let attempt = 0; attempt < 60; attempt++) {
    await new Promise((resolve) => setTimeout(resolve, attempt < 4 ? 1500 : 3000));
    const response = await fetch(`${KIE_QUERY_URL}?taskId=${encodeURIComponent(taskId)}`, {
      headers: { Authorization: `Bearer ${apiKey}` },
      signal: AbortSignal.timeout(30_000),
    });
    const json = await response.json().catch(() => ({})) as {
      data?: { state?: string; resultJson?: string; failMsg?: string; failCode?: string };
    };
    if (!response.ok) throw new Error(`KIE poll failed (${response.status})`);
    const state = String(json.data?.state || "").toLowerCase();
    if (state === "success") {
      const urls = extractImageUrls(json.data?.resultJson);
      if (!urls.length) throw new Error("KIE completed without returning an image URL.");
      return urls[0]!;
    }
    if (state === "fail") {
      throw new Error(`KIE generation failed: ${json.data?.failMsg || json.data?.failCode || "Unknown error"}`);
    }
  }
  throw new Error("KIE image generation timed out.");
}

async function generateViaKie(task: CreativeTask, apiKey: string): Promise<string> {
  const taskId = await createKieTask(apiKey, task);
  return pollKieTask(apiKey, taskId);
}

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
    const processing: CreativeJobStatus = { jobId, status: "processing", progress: 10 };
    this.jobs.set(jobId, processing);

    const endpoint = process.env.SAAD_AGENT_IMAGE_GENERATION_ENDPOINT
      || process.env.SAAD_STUDIO_IMAGE_ENDPOINT
      || "";
    const endpointToken = process.env.SAAD_STUDIO_PANEL_TOKEN || process.env.SAAD_AGENT_IMAGE_GENERATION_TOKEN || "";
    const kieApiKey = process.env.KIE_API_KEY || process.env.KIEAI_API_KEY || "";

    let statusRecord: CreativeJobStatus;
    try {
      let imageUrl: string;
      let source: string;
      if (endpoint.trim()) {
        imageUrl = await generateViaEndpoint(task, endpoint.trim(), endpointToken.trim() || undefined);
        source = "saad_studio_image_endpoint";
      } else if (kieApiKey.trim()) {
        imageUrl = await generateViaKie(task, kieApiKey.trim());
        source = "saad_studio_kie_direct";
      } else {
        throw new Error("No real image generator is configured. Set SAAD_AGENT_IMAGE_GENERATION_ENDPOINT or KIE_API_KEY.");
      }

      statusRecord = {
        jobId,
        status: "completed",
        progress: 100,
        asset: createCompletedAsset(task, this.id, this.name, imageUrl, source),
      };
    } catch (error) {
      statusRecord = {
        jobId,
        status: "failed",
        progress: 0,
        error: sanitizeError(error),
      };
    }
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
