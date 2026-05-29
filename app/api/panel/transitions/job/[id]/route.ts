import { NextRequest, NextResponse } from "next/server";
import prismadb from "@/lib/prismadb";
import { extractPanelToken, verifyPanelToken } from "@/lib/panel-auth";
import { getPresetById } from "@/lib/transition-presets";

export const dynamic = "force-dynamic";

const KIE_BASE = "https://api.kie.ai/api/v1";

function requirePanelUser(req: NextRequest): string | null {
  const token = extractPanelToken(req);
  if (!token) return null;
  return verifyPanelToken(token)?.userId ?? null;
}

function kieHeaders(apiKey: string) {
  return { Authorization: `Bearer ${apiKey}` };
}

function normalizeTaskState(status: string) {
  const s = String(status || "").toLowerCase();
  if (["success", "succeed", "completed", "done", "finish", "finished"].includes(s)) return "completed";
  if (["fail", "failed", "error", "canceled", "cancelled"].includes(s)) return "failed";
  return "processing";
}

function extractVideoUrl(data: Record<string, unknown>): string {
  const candidates = [
    data.resultUrls,
    data.response,
    data.resultJson,
    data.outputs,
    data.result,
    data.output,
    data.works,
  ];

  for (const candidate of candidates) {
    if (!candidate) continue;
    if (typeof candidate === "string") {
      if (/^https?:\/\//i.test(candidate)) return candidate;
      try {
        const parsed = JSON.parse(candidate) as Record<string, unknown>;
        const nested = extractVideoUrl(parsed);
        if (nested) return nested;
      } catch {}
    }
    if (Array.isArray(candidate)) {
      for (const item of candidate) {
        if (typeof item === "string" && /^https?:\/\//i.test(item)) return item;
        if (item && typeof item === "object") {
          const obj = item as Record<string, unknown>;
          for (const key of ["url", "videoUrl", "video_url", "downloadUrl", "imageUrl"]) {
            if (typeof obj[key] === "string" && /^https?:\/\//i.test(String(obj[key]))) {
              return String(obj[key]);
            }
          }
          const resource = obj.resource as Record<string, unknown> | undefined;
          if (resource && typeof resource.resource === "string" && /^https?:\/\//i.test(resource.resource)) {
            return resource.resource;
          }
          const video = obj.video as Record<string, unknown> | undefined;
          if (video && typeof video.url === "string" && /^https?:\/\//i.test(video.url)) {
            return video.url;
          }
        }
      }
    }
    if (candidate && typeof candidate === "object") {
      const nested = extractVideoUrl(candidate as Record<string, unknown>);
      if (nested) return nested;
    }
  }

  return "";
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const userId = requirePanelUser(req);
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const job = await prismadb.transitionJob.findUnique({
    where: { id },
    include: { output: true },
  });

  if (!job || job.userId !== userId) {
    return NextResponse.json({ error: "Job not found" }, { status: 404 });
  }

  if (job.status === "completed" || job.status === "failed") {
    return NextResponse.json({ job });
  }

  if (job.taskId) {
    const apiKey = process.env.KIE_API_KEY ?? process.env.KIEAI_API_KEY;
    if (apiKey) {
      const pollRes = await fetch(
        `${KIE_BASE}/jobs/recordInfo?taskId=${encodeURIComponent(job.taskId)}`,
        { method: "GET", headers: kieHeaders(apiKey), cache: "no-store" },
      ).catch(() => null);

      if (pollRes?.ok) {
        const pollJson = await pollRes.json().catch(() => null) as
          | { code?: number; data?: Record<string, unknown> }
          | null;
        const kieCodeOk = pollJson?.code == null || pollJson.code === 200 || pollJson.code === 0;

        if (kieCodeOk && pollJson?.data) {
          const data = pollJson.data;
          const taskStatus = normalizeTaskState(
            String(data.taskStatus || data.status || data.state || ""),
          );
          const resultUrl = extractVideoUrl(data);

          if (taskStatus === "completed" && resultUrl) {
            const project = await prismadb.transitionProject.findUnique({
              where: { id: job.projectId },
              select: { inputAUrl: true, inputBUrl: true, aspectRatio: true, duration: true },
            });
            const preset = getPresetById(job.presetId);

            await prismadb.$transaction([
              prismadb.transitionJob.update({
                where: { id: job.id },
                data: { status: "completed", resultUrl },
              }),
              prismadb.transitionOutput.upsert({
                where: { jobId: job.id },
                create: {
                  projectId: job.projectId,
                  jobId: job.id,
                  userId,
                  url: resultUrl,
                  presetId: job.presetId,
                  presetName: preset?.name ?? job.presetId,
                  aspectRatio: project?.aspectRatio ?? "16:9",
                  duration: project?.duration ?? 5,
                  inputAUrl: project?.inputAUrl ?? null,
                  inputBUrl: project?.inputBUrl ?? null,
                },
                update: { url: resultUrl },
              }),
            ]);

            await prismadb.generation.updateMany({
              where: { mediaUrl: `task:${job.taskId}`, userId },
              data: { mediaUrl: resultUrl },
            }).catch(() => null);
          } else if (taskStatus === "failed") {
            const errorMsg = String(data.errorMessage || data.failMsg || "Generation failed");
            await prismadb.transitionJob.update({
              where: { id: job.id },
              data: { status: "failed", error: errorMsg },
            }).catch(() => null);
          } else if (taskStatus === "completed" && !resultUrl) {
            await prismadb.transitionJob.update({
              where: { id: job.id },
              data: {
                status: "failed",
                error: "Generation succeeded on server but video URL could not be extracted.",
              },
            }).catch(() => null);
          } else if (job.status !== "processing") {
            await prismadb.transitionJob.update({
              where: { id: job.id },
              data: { status: "processing" },
            }).catch(() => null);
          }
        }
      }
    }
  }

  const refreshed = await prismadb.transitionJob.findUnique({
    where: { id },
    include: { output: true },
  });
  return NextResponse.json({ job: refreshed ?? job }, { headers: { "Cache-Control": "no-store" } });
}
