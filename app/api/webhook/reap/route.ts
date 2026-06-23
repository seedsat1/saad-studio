import { NextRequest, NextResponse } from "next/server";
import prismadb from "@/lib/prismadb";
import { persistProviderUrl } from "@/lib/providers/persist-output";
import {
  setGenerationMediaUrl,
  saveAdditionalGenerationUrls,
  rollbackGenerationCharge,
  finalizeReapGeneration,
  updateProviderUsageRecord,
} from "@/lib/credit-ledger";

export const dynamic = "force-dynamic";

function normalizeReapStatus(status: string): "completed" | "failed" | "processing" {
  const s = (status || "").toLowerCase();
  if (["completed", "success", "succeeded", "done"].includes(s)) return "completed";
  if (["failed", "fail", "error", "cancelled", "expired", "invalid"].includes(s)) return "failed";
  return "processing";
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null);
    if (!body) {
      return new NextResponse("Invalid JSON", { status: 400 });
    }

    const projectId = String(body.projectId ?? body.id ?? body.project ?? "");
    const rawStatus = String(body.status ?? body.state ?? "");
    const errorMsg = String(body.error ?? body.errorMessage ?? body.message ?? "");

    if (!projectId) {
      return new NextResponse("Missing projectId", { status: 400 });
    }

    const status = normalizeReapStatus(rawStatus);

    // 1. Log Webhook in Database
    await prismadb.reapWebhookLog.create({
      data: {
        projectId,
        status: rawStatus,
        payload: body as any,
      },
    });

    // 2. Find the corresponding ReapJob
    const job = await prismadb.reapJob.findUnique({
      where: { projectId },
    });

    if (!job) {
      console.warn(`[api/webhook/reap] No ReapJob found for projectId: ${projectId}`);
      return new NextResponse("OK", { status: 200 }); // Return 200 so Reap stops retrying
    }

    // If job is already finished, ignore
    if (job.status === "completed" || job.status === "failed") {
      return new NextResponse("OK", { status: 200 });
    }

    if (status === "completed") {
      // Extract output URLs from payload
      let rawUrls: string[] = [];
      if (body.urls && Array.isArray(body.urls)) {
        rawUrls = body.urls;
      } else if (body.urls && typeof body.urls === "object") {
        const u = body.urls as Record<string, unknown>;
        const values = Object.values(u).filter((v): v is string => typeof v === "string" && /^https?:\/\//.test(v));
        rawUrls = values;
      } else if (typeof body.resultUrl === "string") {
        rawUrls = [body.resultUrl];
      } else if (typeof body.outputUrl === "string") {
        rawUrls = [body.outputUrl];
      } else if (typeof body.url === "string") {
        rawUrls = [body.url];
      }

      // Persist files to Cloudflare R2
      const persistedUrls: string[] = [];
      for (let i = 0; i < rawUrls.length; i++) {
        const localId = i === 0 ? job.id : `${job.id}-${i}`;
        try {
          const persisted = await persistProviderUrl({
            url: rawUrls[i],
            userId: job.userId,
            generationId: localId,
            assetType: job.tool === "transcription" ? "IMAGE" : "VIDEO", // Wrap text as IMAGE/Generic asset or VIDEO
          });
          persistedUrls.push(persisted);
        } catch (err) {
          console.error(`[api/webhook/reap] Failed to persist URL ${rawUrls[i]} to R2:`, err);
          persistedUrls.push(rawUrls[i]); // Fallback to original URL
        }
      }

      // If we couldn't find any URLs in the webhook, try calling get-project-status/clips as fallback
      if (persistedUrls.length === 0) {
        console.warn(`[api/webhook/reap] Webhook reported completed but no URLs found for projectId: ${projectId}`);
      }

      // Update ReapJob in database
      await prismadb.reapJob.update({
        where: { id: job.id },
        data: {
          status: "completed",
          outputUrls: persistedUrls,
        },
      });

      // Update Generation row in database
      if (persistedUrls.length > 0) {
        await setGenerationMediaUrl(job.id, persistedUrls[0]).catch(() => {});
        if (persistedUrls.length > 1) {
          await saveAdditionalGenerationUrls(
            job.userId,
            `Clips from Reap project ${projectId}`,
            `reap:${job.tool}`,
            "VIDEO",
            persistedUrls.slice(1)
          ).catch(() => {});
        }
      }

      const rawDur = body.duration ?? body.inputDuration ?? body.outputDuration ?? body.metadata?.duration;
      const actualDuration = typeof rawDur === "number" ? rawDur : (typeof rawDur === "string" ? parseFloat(rawDur) : null);
      await finalizeReapGeneration(projectId, actualDuration).catch(() => {});

      const rawPayloadSafe = body ? JSON.stringify(body).slice(0, 5000) : null;
      await updateProviderUsageRecord(job.id, {
        status: "completed",
        rawPayloadSafe,
        duration: actualDuration,
        resolution: body.resolution ?? body.metadata?.resolution ?? undefined,
        quality: body.quality ?? undefined,
        providerRequestId: projectId,
      }).catch(() => {});

      console.log(`[api/webhook/reap] Job ${job.id} completed. Persisted ${persistedUrls.length} files.`);

    } else if (status === "failed") {
      // Update ReapJob in database
      await prismadb.reapJob.update({
        where: { id: job.id },
        data: {
          status: "failed",
          error: errorMsg || "Reap job failed",
        },
      });

      // Refund credits
      if (job.creditsCost > 0) {
        await rollbackGenerationCharge(job.id, job.userId, job.creditsCost).catch(() => {});
      }

      const rawPayloadSafe = body ? JSON.stringify(body).slice(0, 5000) : null;
      await updateProviderUsageRecord(job.id, {
        status: "failed",
        rawPayloadSafe,
        providerRequestId: projectId,
      }).catch(() => {});

      // Mark Generation row as failed
      await prismadb.generation.updateMany({
        where: { id: job.id },
        data: { mediaUrl: `failed:reap:${projectId}:${errorMsg}` },
      }).catch(() => {});

      console.warn(`[api/webhook/reap] Job ${job.id} failed: ${errorMsg}`);
    }

    return new NextResponse("OK", { status: 200 });
  } catch (err) {
    console.error("[api/webhook/reap] Error processing webhook:", err);
    return new NextResponse("Internal error", { status: 500 });
  }
}
