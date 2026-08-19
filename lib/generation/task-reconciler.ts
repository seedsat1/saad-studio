import prismadb from "@/lib/prismadb";
import { completeTaskGeneration } from "@/lib/generation/task-orchestrator";
import { refundGenerationCharge } from "@/lib/credit-ledger";
import { downloadVeoVideo, pollVeoOperation, type VeoOperationHandle } from "@/lib/gemini-veo";
import { uploadBufferToStorage, uploadUrlToStorage } from "@/lib/supabase-storage";
import { normalizeMediaUrl } from "@/lib/storage";
import { fetchBytePlusTask } from "@/lib/providers/byteplus-reconcile";
import { pollReapStatus } from "@/lib/providers/reap";

const WAVESPEED_BASE = "https://api.wavespeed.ai/api/v3";
const FIFTEEN_MINUTES_MS = 15 * 60 * 1000;
const TWO_HOURS_MS = 2 * 60 * 60 * 1000;

export type ReconcileTaskStatus = "processing" | "completed" | "failed" | "transient_error";

export type ReconcileResult = {
  generationId: string;
  taskId: string;
  provider: string;
  status: ReconcileTaskStatus;
  mediaUrl?: string | null;
  error?: string | null;
  refunded?: boolean;
};

function decodeGeminiTask(taskId: string): VeoOperationHandle | null {
  try {
    const raw = taskId.slice(4);
    const json = Buffer.from(raw, "base64").toString("utf8");
    const parsed = JSON.parse(json);
    if (!parsed?.name && !parsed?.operationName) return null;
    return parsed as VeoOperationHandle;
  } catch {
    return null;
  }
}

function extractTaskIdFromMediaUrl(mediaUrl: string | null | undefined): string | null {
  if (!mediaUrl || !mediaUrl.startsWith("task:")) return null;
  return mediaUrl.slice(5).trim();
}

/**
 * Reconciles a single in-flight generation record against its authoritative provider.
 * Thread-safe, idempotent, and safe against concurrent client + watchdog execution.
 */
export async function reconcileGenerationRecord(generation: {
  id: string;
  userId: string;
  mediaUrl: string | null;
  outputUrl: string | null;
  cost: number;
  createdAt: Date;
  assetType: string;
  providerName?: string | null;
}): Promise<ReconcileResult> {
  const generationId = generation.id;
  const userId = generation.userId;
  const rawTaskId = extractTaskIdFromMediaUrl(generation.mediaUrl);

  // 1. If already completed with public media URL, return early idempotently
  if (generation.outputUrl && !generation.outputUrl.startsWith("task:") && !generation.outputUrl.startsWith("failed:")) {
    return {
      generationId,
      taskId: rawTaskId || "",
      provider: generation.providerName || "unknown",
      status: "completed",
      mediaUrl: generation.outputUrl,
      refunded: false,
    };
  }

  if (!rawTaskId) {
    return {
      generationId,
      taskId: "",
      provider: generation.providerName || "unknown",
      status: "failed",
      error: "Missing task identifier",
      refunded: false,
    };
  }

  const ageMs = Date.now() - new Date(generation.createdAt).getTime();

  // ── A. GOOGLE VEO / GEMINI ASYNC VIDEO ──────────────────────────────────────
  if (rawTaskId.startsWith("gvo:")) {
    const handle = decodeGeminiTask(rawTaskId);
    if (!handle) {
      if (generation.cost > 0) {
        await refundGenerationCharge(generationId, userId, generation.cost, {
          reason: "generation_refund_provider_failed",
          clearMediaUrl: true,
        }).catch(() => {});
      }
      return {
        generationId,
        taskId: rawTaskId,
        provider: "google",
        status: "failed",
        error: "Corrupt Gemini task identifier",
        refunded: generation.cost > 0,
      };
    }

    try {
      const poll = await pollVeoOperation(handle);

      if (!poll.done) {
        return {
          generationId,
          taskId: rawTaskId,
          provider: "google",
          status: "processing",
        };
      }

      if (!poll.videoUri) {
        if (generation.cost > 0) {
          await refundGenerationCharge(generationId, userId, generation.cost, {
            reason: "generation_refund_provider_failed",
            clearMediaUrl: true,
          }).catch(() => {});
        }
        return {
          generationId,
          taskId: rawTaskId,
          provider: "google",
          status: "failed",
          error: "No video returned by Google provider",
          refunded: generation.cost > 0,
        };
      }

      // Download from Google and persist to Backblaze B2
      const downloaded = await downloadVeoVideo(poll.videoUri);
      const storedUrl = await uploadBufferToStorage({
        buffer: downloaded.buffer,
        contentType: downloaded.contentType,
        userId,
        assetType: "video",
        generationId,
      });

      const finalUrl = storedUrl || poll.videoUri;
      await completeTaskGeneration({ generationId, mediaUrl: finalUrl });

      return {
        generationId,
        taskId: rawTaskId,
        provider: "google",
        status: "completed",
        mediaUrl: finalUrl,
        refunded: false,
      };
    } catch (pollErr: any) {
      const msg = String(pollErr?.message || pollErr || "");
      const isNotFound = msg.includes("404") || /not found/i.test(msg);

      if (isNotFound && ageMs > FIFTEEN_MINUTES_MS) {
        if (generation.cost > 0) {
          await refundGenerationCharge(generationId, userId, generation.cost, {
            reason: "generation_refund_provider_failed",
            clearMediaUrl: true,
          }).catch(() => {});
        }
        return {
          generationId,
          taskId: rawTaskId,
          provider: "google",
          status: "failed",
          error: "Task expired or not found at provider",
          refunded: generation.cost > 0,
        };
      }

      // Transient error (keep processing, do NOT fail)
      return {
        generationId,
        taskId: rawTaskId,
        provider: "google",
        status: "transient_error",
        error: msg,
      };
    }
  }

  // ── B. WAVESPEED ASYNC TASKS ───────────────────────────────────────────────
  if (rawTaskId.startsWith("ws:") || rawTaskId.includes("-") || !rawTaskId.includes(":")) {
    const predictionId = rawTaskId.startsWith("ws:") ? rawTaskId.slice(3) : rawTaskId;
    const wsKey = process.env.WAVESPEED_API_KEY;

    if (!wsKey) {
      return {
        generationId,
        taskId: rawTaskId,
        provider: "wavespeed",
        status: "transient_error",
        error: "WAVESPEED_API_KEY not configured",
      };
    }

    try {
      const res = await fetch(`${WAVESPEED_BASE}/predictions/${predictionId}/result`, {
        headers: { Authorization: `Bearer ${wsKey}` },
        cache: "no-store",
      });

      let json: any = null;
      try {
        json = await res.json();
      } catch {
        json = null;
      }

      const data = json?.data ?? json ?? {};
      const statusRaw = String(data?.status ?? json?.status ?? "").toLowerCase();

      if (statusRaw === "succeeded" || statusRaw === "completed") {
        const rawOutput = data.outputs?.[0] ?? data.result?.[0] ?? data.output ?? data.video_url ?? data.image_url;
        if (rawOutput && typeof rawOutput === "string") {
          let finalUrl = rawOutput;
          // Persist to B2
          const persisted = await uploadUrlToStorage({
            remoteUrl: rawOutput,
            userId,
            assetType: generation.assetType || "video",
            generationId,
          }).catch(() => null);

          if (persisted) finalUrl = persisted;
          await completeTaskGeneration({ generationId, mediaUrl: finalUrl });

          return {
            generationId,
            taskId: rawTaskId,
            provider: "wavespeed",
            status: "completed",
            mediaUrl: finalUrl,
            refunded: false,
          };
        }
      }

      if (statusRaw === "failed" || statusRaw === "error") {
        if (generation.cost > 0) {
          await refundGenerationCharge(generationId, userId, generation.cost, {
            reason: "generation_refund_provider_failed",
            clearMediaUrl: true,
          }).catch(() => {});
        }
        return {
          generationId,
          taskId: rawTaskId,
          provider: "wavespeed",
          status: "failed",
          error: data.error || "WaveSpeed provider reported failure",
          refunded: generation.cost > 0,
        };
      }

      if (!res.ok && res.status === 404 && ageMs > FIFTEEN_MINUTES_MS) {
        if (generation.cost > 0) {
          await refundGenerationCharge(generationId, userId, generation.cost, {
            reason: "generation_refund_provider_failed",
            clearMediaUrl: true,
          }).catch(() => {});
        }
        return {
          generationId,
          taskId: rawTaskId,
          provider: "wavespeed",
          status: "failed",
          error: "Task expired or not found at WaveSpeed",
          refunded: generation.cost > 0,
        };
      }

      return {
        generationId,
        taskId: rawTaskId,
        provider: "wavespeed",
        status: "processing",
      };
    } catch (wsErr: any) {
      return {
        generationId,
        taskId: rawTaskId,
        provider: "wavespeed",
        status: "transient_error",
        error: String(wsErr?.message || wsErr),
      };
    }
  }

  // ── C. BYTEPLUS ARK (STANDBY COMPATIBILITY) ─────────────────────────────────
  if (rawTaskId.startsWith("ark:")) {
    const arkTaskId = rawTaskId.slice(4);
    try {
      const result = await fetchBytePlusTask(arkTaskId);
      if (result.status === "completed" && result.outputs.length > 0) {
        await completeTaskGeneration({ generationId, mediaUrl: result.outputs[0] });
        return {
          generationId,
          taskId: rawTaskId,
          provider: "byteplus",
          status: "completed",
          mediaUrl: result.outputs[0],
          refunded: false,
        };
      }
      if (result.status === "failed") {
        if (generation.cost > 0) {
          await refundGenerationCharge(generationId, userId, generation.cost, {
            reason: "generation_refund_provider_failed",
            clearMediaUrl: true,
          }).catch(() => {});
        }
        return {
          generationId,
          taskId: rawTaskId,
          provider: "byteplus",
          status: "failed",
          error: result.error || "BytePlus task failed",
          refunded: generation.cost > 0,
        };
      }
      return {
        generationId,
        taskId: rawTaskId,
        provider: "byteplus",
        status: "processing",
      };
    } catch (arkErr: any) {
      return {
        generationId,
        taskId: rawTaskId,
        provider: "byteplus",
        status: "transient_error",
        error: String(arkErr?.message || arkErr),
      };
    }
  }

  // ── D. REAP.VIDEO (CLIP_CRAFT POST-PRODUCTION) ──────────────────────────────
  if (rawTaskId.startsWith("reap:")) {
    const projectId = rawTaskId.slice(5);
    try {
      const result = await pollReapStatus(projectId);
      if (result.status === "completed") {
        const rawUrl = result.url || result.urls?.[0];
        if (rawUrl) {
          let finalUrl = rawUrl;
          const persisted = await uploadUrlToStorage({
            remoteUrl: rawUrl,
            userId,
            assetType: generation.assetType || "video",
            generationId,
          }).catch(() => null);
          if (persisted) finalUrl = persisted;
          await completeTaskGeneration({ generationId, mediaUrl: finalUrl });
          return {
            generationId,
            taskId: rawTaskId,
            provider: "reap",
            status: "completed",
            mediaUrl: finalUrl,
            refunded: false,
          };
        }
      }
      if (result.status === "failed" || result.status === "invalid" || result.status === "expired") {
        if (generation.cost > 0) {
          await refundGenerationCharge(generationId, userId, generation.cost, {
            reason: "generation_refund_provider_failed",
            clearMediaUrl: true,
          }).catch(() => {});
        }
        return {
          generationId,
          taskId: rawTaskId,
          provider: "reap",
          status: "failed",
          error: result.error || "Reap project reported failure",
          refunded: generation.cost > 0,
        };
      }
      return {
        generationId,
        taskId: rawTaskId,
        provider: "reap",
        status: "processing",
      };
    } catch (reapErr: any) {
      return {
        generationId,
        taskId: rawTaskId,
        provider: "reap",
        status: "transient_error",
        error: String(reapErr?.message || reapErr),
      };
    }
  }

  // Hard timeout fallback (>2 hours with unrecognized task format)
  if (ageMs > TWO_HOURS_MS && generation.cost > 0) {
    await refundGenerationCharge(generationId, userId, generation.cost, {
      reason: "generation_refund_provider_failed",
      clearMediaUrl: true,
    }).catch(() => {});
    return {
      generationId,
      taskId: rawTaskId,
      provider: "unknown",
      status: "failed",
      error: "Generation timed out after 2 hours without provider update",
      refunded: true,
    };
  }

  return {
    generationId,
    taskId: rawTaskId,
    provider: "unknown",
    status: "processing",
  };
}

/**
 * Scans a bounded batch of in-flight generations and reconciles them.
 * Safe for automated cron executions.
 */
export async function reconcileStaleInFlightGenerations(batchSize: number = 20): Promise<{
  scanned: number;
  completed: number;
  failed: number;
  processing: number;
  transientErrors: number;
  results: ReconcileResult[];
}> {
  const sixtySecondsAgo = new Date(Date.now() - 60 * 1000);

  // Bounded indexed query for in-flight tasks older than 60s
  const inFlightGenerations = await prismadb.generation.findMany({
    where: {
      mediaUrl: { startsWith: "task:" },
      createdAt: { lte: sixtySecondsAgo },
    },
    select: {
      id: true,
      userId: true,
      mediaUrl: true,
      outputUrl: true,
      cost: true,
      createdAt: true,
      assetType: true,
      providerName: true,
    },
    orderBy: { createdAt: "asc" },
    take: Math.min(50, Math.max(1, batchSize)),
  });

  const results: ReconcileResult[] = [];
  let completed = 0;
  let failed = 0;
  let processing = 0;
  let transientErrors = 0;

  for (const gen of inFlightGenerations) {
    try {
      const res = await reconcileGenerationRecord(gen);
      results.push(res);
      if (res.status === "completed") completed++;
      else if (res.status === "failed") failed++;
      else if (res.status === "processing") processing++;
      else if (res.status === "transient_error") transientErrors++;
    } catch (err) {
      console.error(`[task-reconciler] Error reconciling generation ${gen.id}:`, err);
      transientErrors++;
    }
  }

  return {
    scanned: inFlightGenerations.length,
    completed,
    failed,
    processing,
    transientErrors,
    results,
  };
}
