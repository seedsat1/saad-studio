import prismadb from "@/lib/prismadb";
import { refundGenerationCharge, setGenerationMediaUrl } from "@/lib/credit-ledger";

const BYTEPLUS_ARK_BASE = (
  process.env.BYTEPLUS_ARK_BASE_URL ||
  "https://ark.ap-southeast.bytepluses.com/api/v3"
).replace(/\/+$/, "");
const BYTEPLUS_CONTENT_TASKS_URL = `${BYTEPLUS_ARK_BASE}/contents/generations/tasks`;

export type BytePlusTaskStatus = "processing" | "completed" | "failed";

export interface BytePlusTaskResult {
  status: BytePlusTaskStatus;
  outputs: string[];
  error: string | null;
  missing: boolean;
  tokensUsed?: number;
  providerRequestId?: string;
  duration?: number;
  resolution?: string;
}

export interface BytePlusReconcileSummary {
  checked: number;
  completed: number;
  failed: number;
  processing: number;
  errors: number;
}

function getArkApiKey(): string {
  const key =
    process.env.ARK_API_KEY ||
    process.env.BYTEPLUS_ARK_API_KEY ||
    process.env.BYTEPLUS_API_KEY;
  if (!key?.trim()) {
    throw new Error("BytePlus ModelArk API key is not configured.");
  }
  return key.trim();
}

function normalizeTaskState(status: string): BytePlusTaskStatus {
  const value = status.trim().toLowerCase();
  if (["success", "succeeded", "completed", "done", "finished"].includes(value)) {
    return "completed";
  }
  if (["fail", "failed", "error", "cancelled", "canceled", "expired"].includes(value)) {
    return "failed";
  }
  return "processing";
}

function extractOutputs(input: unknown): string[] {
  if (!input) return [];
  if (typeof input === "string") {
    if (/^https?:\/\//i.test(input)) return [input];
    try {
      return extractOutputs(JSON.parse(input));
    } catch {
      return [];
    }
  }
  if (Array.isArray(input)) {
    return input.flatMap(extractOutputs);
  }
  if (typeof input !== "object") return [];

  const record = input as Record<string, unknown>;
  const directKeys = [
    "video_url",
    "videoUrl",
    "output_url",
    "outputUrl",
    "download_url",
    "downloadUrl",
    "url",
  ];
  for (const key of directKeys) {
    const outputs = extractOutputs(record[key]);
    if (outputs.length) return outputs;
  }
  for (const key of ["content", "output", "outputs", "result", "response", "data"]) {
    const outputs = extractOutputs(record[key]);
    if (outputs.length) return outputs;
  }
  return [];
}

function providerError(payload: Record<string, unknown> | null, fallback: string): string {
  if (!payload) return fallback;
  const data = (payload.data ?? payload) as Record<string, unknown>;
  const nestedError =
    data.error && typeof data.error === "object"
      ? (data.error as Record<string, unknown>).message
      : data.error;
  return String(
    nestedError ??
    data.error_message ??
    data.message ??
    payload.message ??
    fallback
  ).slice(0, 500);
}

export async function fetchBytePlusTask(taskId: string): Promise<BytePlusTaskResult> {
  const response = await fetch(
    `${BYTEPLUS_CONTENT_TASKS_URL}/${encodeURIComponent(taskId)}`,
    {
      headers: { Authorization: `Bearer ${getArkApiKey()}` },
      cache: "no-store",
    },
  );
  const payload = await response.json().catch(() => null) as Record<string, unknown> | null;

  if (response.status === 404 || response.status === 410) {
    return {
      status: "failed",
      outputs: [],
      error: "BytePlus task was not found or has expired.",
      missing: true,
    };
  }
  if (!response.ok || !payload) {
    throw new Error(providerError(payload, `BytePlus status check failed (${response.status})`));
  }

  const data = (payload.data ?? payload) as Record<string, unknown>;
  const status = normalizeTaskState(
    String(data.status ?? data.task_status ?? data.state ?? payload.status ?? ""),
  );
  const outputs = extractOutputs(data);
  const error =
    status === "failed"
      ? providerError(payload, "BytePlus generation failed.")
      : null;

  if (status === "completed" && outputs.length === 0) {
    return {
      status: "failed",
      outputs: [],
      error: "BytePlus completed the task without returning a video URL.",
      missing: false,
    };
  }

  const usage = (data.usage ?? payload.usage) as Record<string, unknown> | undefined;
  const tokensUsed = typeof usage?.completion_tokens === "number" ? usage.completion_tokens
    : typeof usage?.total_tokens === "number" ? usage.total_tokens
    : undefined;

  const providerRequestId = typeof payload.request_id === "string" ? payload.request_id
    : typeof data.request_id === "string" ? data.request_id
    : typeof payload.requestId === "string" ? payload.requestId
    : undefined;

  const content = (data.content ?? payload.content) as Record<string, unknown> | undefined;
  const duration = typeof content?.video_duration === "number" ? content.video_duration : undefined;
  const resolution = typeof content?.video_resolution === "string" ? content.video_resolution : undefined;

  return {
    status,
    outputs,
    error,
    missing: false,
    tokensUsed,
    providerRequestId,
    duration,
    resolution,
  };
}

export async function reconcileBytePlusGeneration(generation: {
  id: string;
  userId: string;
  cost: number;
  mediaUrl: string | null;
  createdAt: Date;
}): Promise<BytePlusTaskStatus> {
  const marker = generation.mediaUrl ?? "";
  if (!marker.startsWith("task:ark:")) return "processing";

  const taskId = marker.slice("task:ark:".length);
  const result = await fetchBytePlusTask(taskId);

  // BytePlus can briefly return 404 before a newly-created task is visible
  // across its status API. Only treat a missing task as terminal after 15 min.
  if (result.missing && Date.now() - generation.createdAt.getTime() < 15 * 60_000) {
    return "processing";
  }

  if (result.status === "completed") {
    const tokensUsed = result.tokensUsed || 0;
    
    const genDetails = await prismadb.generation.findUnique({
      where: { id: generation.id },
      select: { modelUsed: true }
    });
    const modelUsed = genDetails?.modelUsed || "";
    
    const isMini =
      modelUsed === "bytedance-seedance-v2-t2v-mini" ||
      modelUsed === "bytedance/seedance-v2/text-to-video-mini" ||
      modelUsed === "bytedance/seedance-2-mini" ||
      modelUsed.toLowerCase().includes("mini");

    let ratePerToken = 0.0000043; // Default for Seedance Pro/Fast
    if (isMini) {
      const snapshot = await prismadb.generationRequestSnapshot.findUnique({
        where: { generationId: generation.id },
        select: { inputType: true }
      });
      const hasVideo = snapshot?.inputType === "video";
      ratePerToken = hasVideo ? 0.0000021 : 0.0000035;
    }
    
    const actualCost = tokensUsed * ratePerToken;
    const costSource = tokensUsed > 0 ? "DERIVED_FROM_ACTUAL_USAGE" : "estimated";

    await prismadb.generation.update({
      where: { id: generation.id },
      data: {
        providerTokens: tokensUsed,
        providerCostUsd: actualCost,
        providerCostSource: costSource,
        providerRequestId: result.providerRequestId || null,
        ...(result.duration ? { duration: result.duration } : {}),
        ...(result.resolution ? { resolution: result.resolution } : {}),
      }
    });

    await prismadb.providerUsageRecord.updateMany({
      where: { generationId: generation.id },
      data: {
        providerTokens: tokensUsed,
        providerCostUsd: actualCost,
        providerCostSource: costSource,
        providerRequestId: result.providerRequestId || null,
        ...(result.duration ? { duration: result.duration } : {}),
        ...(result.resolution ? { resolution: result.resolution } : {}),
      }
    });

    await setGenerationMediaUrl(generation.id, result.outputs[0]);
    return "completed";
  }

  if (result.status === "failed") {
    await refundGenerationCharge(generation.id, generation.userId, generation.cost, {
      reason: "generation_refund_provider_failed",
      clearMediaUrl: true,
    });
    return "failed";
  }

  return "processing";
}

export async function reconcilePendingBytePlusGenerations(
  limit = 25,
  userId?: string,
): Promise<BytePlusReconcileSummary> {
  const generations = await prismadb.generation.findMany({
    where: {
      ...(userId ? { userId } : {}),
      status: "processing",
      mediaUrl: { startsWith: "task:ark:" },
      modelUsed: { in: [
        "bytedance/seedance-v2/text-to-video",
        "bytedance/seedance-v2/text-to-video-fast",
        "bytedance/seedance-v2/text-to-video-mini",
      ] },
    },
    orderBy: { createdAt: "asc" },
    take: Math.max(1, Math.min(limit, 100)),
    select: { id: true, userId: true, cost: true, mediaUrl: true, createdAt: true },
  });

  const summary: BytePlusReconcileSummary = {
    checked: generations.length,
    completed: 0,
    failed: 0,
    processing: 0,
    errors: 0,
  };

  let nextIndex = 0;
  const workers = Array.from({ length: Math.min(5, generations.length) }, async () => {
    while (true) {
      const index = nextIndex++;
      if (index >= generations.length) return;
      try {
        const status = await reconcileBytePlusGeneration(generations[index]);
        summary[status] += 1;
      } catch (error) {
        summary.errors += 1;
        console.error(
          `[byteplus-reconcile] Failed generation ${generations[index].id}:`,
          error,
        );
      }
    }
  });

  await Promise.all(workers);
  return summary;
}
