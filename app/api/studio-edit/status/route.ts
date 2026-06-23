import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import prismadb from "@/lib/prismadb";
import { pollReapStatus } from "@/lib/providers/reap";
import { persistProviderUrl } from "@/lib/providers/persist-output";
import { setGenerationMediaUrl, saveAdditionalGenerationUrls, finalizeReapGeneration } from "@/lib/credit-ledger";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const projectId = req.nextUrl.searchParams.get("projectId");
  const generationId = req.nextUrl.searchParams.get("generationId");

  if (!projectId) {
    return NextResponse.json({ error: "Missing projectId" }, { status: 400 });
  }

  try {
    // 1. Check if we already have it completed/failed in the database
    const job = await prismadb.reapJob.findFirst({
      where: { projectId },
    });

    if (job && (job.status === "completed" || job.status === "failed")) {
      return NextResponse.json({
        status: job.status,
        url: Array.isArray(job.outputUrls) && job.outputUrls.length ? (job.outputUrls as string[])[0] : null,
        urls: job.outputUrls,
        error: job.error,
      });
    }

    // 2. Otherwise, check the upstream status
    const result = await pollReapStatus(projectId);

    if (result.status !== "completed") {
      return NextResponse.json({
        status: result.status,
        progress: result.progress,
        error: result.error,
      });
    }

    // 3. If upstream completed, download/persist it to Cloudflare R2
    const persistedUrls: string[] = [];
    if (Array.isArray(result.urls) && result.urls.length) {
      for (let i = 0; i < result.urls.length; i++) {
        const localId = i === 0
          ? generationId ?? `reap-${projectId}`
          : `${generationId ?? `reap-${projectId}`}-${i}`;
        const persisted = await persistProviderUrl({
          url: result.urls[i],
          userId,
          generationId: localId,
          assetType: job?.tool === "transcription" ? "IMAGE" : "VIDEO",
        });
        persistedUrls.push(persisted);
      }
    } else if (result.url) {
      const persisted = await persistProviderUrl({
        url: result.url,
        userId,
        generationId: generationId ?? `reap-${projectId}`,
        assetType: job?.tool === "transcription" ? "IMAGE" : "VIDEO",
      });
      persistedUrls.push(persisted);
    }

    // 4. Update the Neon DB tables
    if (job) {
      await prismadb.reapJob.update({
        where: { id: job.id },
        data: {
          status: "completed",
          outputUrls: persistedUrls,
        },
      });
    }

    const internalId = generationId || job?.id;
    if (internalId && persistedUrls[0]) {
      await setGenerationMediaUrl(internalId, persistedUrls[0]).catch(() => {});
      if (persistedUrls.length > 1) {
        await saveAdditionalGenerationUrls(
          userId,
          `Clips from Reap project ${projectId}`,
          `reap:${job?.tool ?? "unknown"}`,
          "VIDEO",
          persistedUrls.slice(1)
        ).catch(() => {});
      }
    }

    const rawDur = result.metadata?.duration ?? result.metadata?.inputDuration ?? result.metadata?.outputDuration;
    const actualDuration = typeof rawDur === "number" ? rawDur : (typeof rawDur === "string" ? parseFloat(rawDur) : null);
    await finalizeReapGeneration(projectId, actualDuration).catch(() => {});

    return NextResponse.json({
      status: "completed",
      url: persistedUrls[0] ?? null,
      urls: persistedUrls,
      metadata: result.metadata,
    });
  } catch (err) {
    console.error("[studio-edit/status]", err);
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: `Reap status check failed: ${msg}` }, { status: 502 });
  }
}
