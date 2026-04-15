import { NextRequest, NextResponse } from "next/server";
import prismadb from "@/lib/prismadb";
import { ensureProjectOwnership, requireCinemaUser } from "@/lib/cinema";

const KIE_BASE = "https://api.kie.ai/api/v1";

function kieHeaders(apiKey: string) {
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${apiKey}`,
  };
}

function normalizeState(status: string) {
  const s = status.toLowerCase();
  if (["success", "completed", "done"].includes(s)) return "done";
  if (["failed", "fail", "error", "cancelled", "canceled"].includes(s)) return "failed";
  return "processing";
}

function extractOutputs(resultPayload: unknown): string[] {
  if (!resultPayload) return [];
  if (typeof resultPayload === "string") {
    try {
      return extractOutputs(JSON.parse(resultPayload));
    } catch {
      return [];
    }
  }
  if (Array.isArray(resultPayload)) {
    return resultPayload.filter((v): v is string => typeof v === "string" && /^https?:\/\//.test(v));
  }
  if (typeof resultPayload === "object") {
    const data = resultPayload as Record<string, unknown>;
    return (
      extractOutputs(data.resultUrls) ||
      extractOutputs(data.outputs) ||
      extractOutputs(data.url) ||
      extractOutputs(data.videoUrl) ||
      []
    );
  }
  return [];
}

export async function GET(_: NextRequest, { params }: { params: { id: string } }) {
  try {
    const userId = await requireCinemaUser();
    const job = await prismadb.cinemaJob.findUnique({ where: { id: params.id } });
    if (!job || job.userId !== userId) {
      return NextResponse.json({ error: "Job not found" }, { status: 404 });
    }

    await ensureProjectOwnership(job.projectId, userId);
    if (!job.taskId) return NextResponse.json({ job });

    const apiKey = process.env.KIE_API_KEY ?? process.env.KIEAI_API_KEY;
    if (!apiKey) throw new Error("KIE API key is not configured.");

    const pollRes = await fetch(`${KIE_BASE}/jobs/recordInfo?taskId=${encodeURIComponent(job.taskId)}`, {
      method: "GET",
      headers: kieHeaders(apiKey),
      cache: "no-store",
    });
    const pollJson = await pollRes.json().catch(() => null);
    if (!pollRes.ok || (pollJson?.code != null && pollJson.code !== 200)) {
      return NextResponse.json({ error: pollJson?.msg || "Failed to query job" }, { status: pollRes.ok ? 500 : pollRes.status });
    }

    const rawData = pollJson?.data ?? {};
    const status = normalizeState(String(rawData.taskStatus || rawData.status || rawData.state || ""));
    const outputs = (() => {
      for (const field of [rawData.response, rawData.resultJson, rawData.result, rawData.outputs, rawData.output, rawData.works]) {
        const found = extractOutputs(field);
        if (found.length) return found;
      }
      return [] as string[];
    })();
    const errorMessage = typeof rawData.errorMessage === "string" ? rawData.errorMessage
      : typeof rawData.failMsg === "string" ? rawData.failMsg : null;

    let updated = job;

    if (status === "done" && outputs.length > 0) {
      const asset = await prismadb.cinemaAsset.create({
        data: {
          projectId: job.projectId,
          shotId: job.shotId,
          type: "video",
          url: outputs[0],
          thumbnailUrl: outputs[0],
          metadata: { taskId: job.taskId, modelRoute: job.modelRoute },
        },
      });

      await prismadb.cinemaShot.update({
        where: { id: job.shotId },
        data: {
          generationStatus: "done",
          outputAssetId: asset.id,
        },
      });

      updated = await prismadb.cinemaJob.update({
        where: { id: job.id },
        data: {
          status: "done",
          resultUrl: outputs[0],
          error: null,
        },
      });
    } else if (status === "failed") {
      await prismadb.cinemaShot.update({
        where: { id: job.shotId },
        data: { generationStatus: "failed" },
      });
      updated = await prismadb.cinemaJob.update({
        where: { id: job.id },
        data: {
          status: "failed",
          error: errorMessage || "Generation failed",
        },
      });
    } else {
      updated = await prismadb.cinemaJob.update({
        where: { id: job.id },
        data: { status: "processing" },
      });
    }

    return NextResponse.json({ job: updated, outputs, pollStatus: status });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal error";
    const status = message === "Unauthorized" ? 401 : message === "Project not found" ? 404 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}

