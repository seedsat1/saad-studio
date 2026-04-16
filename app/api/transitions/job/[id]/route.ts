import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import prismadb from "@/lib/prismadb";
import { getPresetById } from "@/lib/transition-presets";

const KIE_BASE = "https://api.kie.ai/api/v1";

function kieHeaders(apiKey: string) {
  return { Authorization: `Bearer ${apiKey}` };
}

function normalizeTaskState(status: string) {
  const s = (status || "").toLowerCase();
  if (["success", "succeed", "completed", "done", "finish", "finished"].includes(s)) return "completed";
  if (["fail", "failed", "error", "canceled", "cancelled"].includes(s)) return "failed";
  return "processing";
}

function extractVideoUrl(data: Record<string, unknown>): string {
  // KIE wraps results in various fields depending on model
  const candidates = [data.response, data.resultJson, data.outputs, data.result, data.output, data.works];
  for (const candidate of candidates) {
    if (!candidate) continue;
    if (typeof candidate === "string") {
      try {
        const parsed = JSON.parse(candidate) as unknown;
        const url = extractVideoUrl(parsed as Record<string, unknown>);
        if (url) return url;
      } catch { continue; }
    }
    if (Array.isArray(candidate)) {
      for (const item of candidate) {
        if (typeof item === "string" && /^https?:\/\//.test(item)) return item;
        if (item && typeof item === "object") {
          const obj = item as Record<string, unknown>;
          for (const key of ["url", "videoUrl", "video_url", "imageUrl", "downloadUrl"]) {
            if (typeof obj[key] === "string" && /^https?:\/\//.test(obj[key] as string)) return obj[key] as string;
          }
          // KIE Kling 3.0 wraps in resource.resource
          const resource = obj.resource as Record<string, unknown> | undefined;
          if (resource && typeof resource.resource === "string" && /^https?:\/\//.test(resource.resource)) {
            return resource.resource;
          }
        }
      }
    }
    if (candidate && typeof candidate === "object") {
      const obj = candidate as Record<string, unknown>;
      for (const key of ["url", "videoUrl", "video_url", "imageUrl", "downloadUrl"]) {
        if (typeof obj[key] === "string" && /^https?:\/\//.test(obj[key] as string)) return obj[key] as string;
      }
    }
  }
  return "";
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  const job = await prismadb.transitionJob.findUnique({
    where: { id },
    include: { output: true },
  });

  if (!job || job.userId !== userId) {
    return NextResponse.json({ error: "Job not found" }, { status: 404 });
  }

  // If already terminal, return immediately
  if (job.status === "completed" || job.status === "failed") {
    return NextResponse.json({ job });
  }

  // Poll KIE for status
  if (job.taskId) {
    const apiKey = process.env.KIE_API_KEY ?? process.env.KIEAI_API_KEY;
    if (!apiKey) return NextResponse.json({ job });

    const pollRes = await fetch(
      `${KIE_BASE}/jobs/recordInfo?taskId=${encodeURIComponent(job.taskId)}`,
      { method: "GET", headers: kieHeaders(apiKey), cache: "no-store" }
    ).catch(() => null);

    if (pollRes?.ok) {
      const pollJson = await pollRes.json().catch(() => null);
      const kieCodeOk = pollJson?.code == null || pollJson.code === 200 || pollJson.code === 0;

      if (kieCodeOk && pollJson?.data) {
        const data = pollJson.data as Record<string, unknown>;
        const taskStatus = normalizeTaskState(
          String(data.taskStatus || data.status || data.state || "")
        );
        const resultUrl = extractVideoUrl(data);

        if (taskStatus === "completed" && resultUrl) {
          // Get project for output metadata
          const project = await prismadb.transitionProject.findUnique({
            where: { id: job.projectId },
            select: { inputAUrl: true, inputBUrl: true, aspectRatio: true, duration: true },
          });

          const preset = getPresetById(job.presetId);

          const [updatedJob] = await prismadb.$transaction([
            prismadb.transitionJob.update({
              where: { id: job.id },
              data: { status: "completed", resultUrl },
              include: { output: true },
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

          // Link video to gallery generation record
          await prismadb.generation.updateMany({
            where: { mediaUrl: `task:${job.taskId}`, userId },
            data: { mediaUrl: resultUrl },
          }).catch(() => null);

          return NextResponse.json({ job: updatedJob });

        } else if (taskStatus === "failed") {
          const errorMsg =
            String((data as Record<string, unknown>).errorMessage || (data as Record<string, unknown>).failMsg || "Generation failed");
          const updatedJob = await prismadb.transitionJob.update({
            where: { id: job.id },
            data: { status: "failed", error: errorMsg },
            include: { output: true },
          });
          return NextResponse.json({ job: updatedJob });

        } else {
          // Still processing — update DB status if changed
          if (job.status !== "processing") {
            await prismadb.transitionJob.update({
              where: { id: job.id },
              data: { status: "processing" },
            }).catch(() => null);
          }
        }
      }
    }
  }

  // Re-fetch job with potential updates
  const refreshed = await prismadb.transitionJob.findUnique({
    where: { id },
    include: { output: true },
  });
  return NextResponse.json({ job: refreshed ?? job });
}
