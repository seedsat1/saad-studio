import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import prismadb from "@/lib/prismadb";
import { getPresetById } from "@/lib/transition-presets";
import { setGenerationMediaUrl } from "@/lib/credit-ledger";

const KIE_BASE = "https://api.kie.ai/api/v1";

function kieHeaders(apiKey: string) {
  return { Authorization: `Bearer ${apiKey}` };
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

    const pollRes = await fetch(`${KIE_BASE}/tasks/${job.taskId}/result`, {
      headers: kieHeaders(apiKey),
    }).catch(() => null);

    if (pollRes?.ok) {
      const pollJson = await pollRes.json().catch(() => null);
      const taskStatus: string = pollJson?.data?.status ?? pollJson?.status ?? "";
      const resultUrl: string =
        pollJson?.data?.output?.video_url ??
        pollJson?.data?.output?.url ??
        pollJson?.output?.video_url ??
        "";

      if (taskStatus === "succeed" || taskStatus === "completed" || taskStatus === "success") {
        if (resultUrl) {
          // Get project for output metadata
          const project = await prismadb.transitionProject.findUnique({
            where: { id: job.projectId },
            select: {
              inputAUrl: true,
              inputBUrl: true,
              aspectRatio: true,
              duration: true,
            },
          });

          const preset = getPresetById(job.presetId);

          // Upsert output record
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

          // Save video URL to gallery (update Generation record's mediaUrl)
          if (job.taskId) {
            await prismadb.generation.updateMany({
              where: { mediaUrl: `task:${job.taskId}`, userId },
              data: { mediaUrl: resultUrl },
            }).catch(() => null);
          }

          return NextResponse.json({ job: updatedJob });
        }
      } else if (taskStatus === "failed" || taskStatus === "error") {
        const errorMsg: string = pollJson?.data?.error ?? pollJson?.error ?? "Generation failed";
        const updatedJob = await prismadb.transitionJob.update({
          where: { id: job.id },
          data: { status: "failed", error: errorMsg },
          include: { output: true },
        });
        return NextResponse.json({ job: updatedJob });
      } else if (taskStatus === "processing" || taskStatus === "queued" || taskStatus === "pending") {
        // Still running — update status in DB if changed
        if (job.status !== taskStatus) {
          await prismadb.transitionJob.update({
            where: { id: job.id },
            data: { status: "processing" },
          });
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
