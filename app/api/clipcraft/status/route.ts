import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { checkRateLimit, rateLimitHeaders } from "@/lib/rate-limit";
import { getClientIp } from "@/lib/security";
import { setGenerationMediaUrl, saveAdditionalGenerationUrls, ensureUserRow, finalizeReapGeneration } from "@/lib/credit-ledger";
import prismadb from "@/lib/prismadb";
import { pollReapStatus } from "@/lib/providers/reap";
import { persistProviderUrl } from "@/lib/providers/persist-output";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const { userId } = auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const projectId = req.nextUrl.searchParams.get("projectId");
  const generationId = req.nextUrl.searchParams.get("generationId");
  if (!projectId) {
    return NextResponse.json({ error: "Missing projectId" }, { status: 400 });
  }

  const ip = getClientIp(req);
  const rate = checkRateLimit(`clipcraft-status:${userId}:${ip}`, 60, 60_000);
  if (!rate.allowed) {
    return NextResponse.json(
      { error: "Too many requests" },
      { status: 429, headers: rateLimitHeaders(rate) }
    );
  }

  try {
    await ensureUserRow(userId);

    const result = await pollReapStatus(projectId);

    // Not done yet → just relay the status.
    if (result.status !== "completed") {
      return NextResponse.json({
        status: result.status,
        progress: result.progress,
        error: result.error,
      });
    }

    // Determine assetType from the generation row or default to VIDEO
    let assetType: "VIDEO" | "TRANSCRIPTION" = "VIDEO";
    if (generationId) {
      const genRow = await prismadb.generation.findUnique({
        where: { id: generationId },
        select: { assetType: true },
      });
      if (genRow?.assetType === "TRANSCRIPTION") {
        assetType = "TRANSCRIPTION";
      }
    }

    // Completed: persist the asset(s) to R2 so we get a stable URL.
    const persistedUrls: string[] = [];
    if (Array.isArray(result.urls) && result.urls.length) {
      for (let i = 0; i < result.urls.length; i++) {
        const localId = i === 0
          ? generationId ?? `clipcraft-${projectId}`
          : `${generationId ?? `clipcraft-${projectId}`}-${i}`;
        const persisted = await persistProviderUrl({
          url: result.urls[i],
          userId,
          generationId: localId,
          assetType: "VIDEO",
        });
        persistedUrls.push(persisted);
      }
    } else if (result.url) {
      const persisted = await persistProviderUrl({
        url: result.url,
        userId,
        generationId: generationId ?? `clipcraft-${projectId}`,
        assetType: "VIDEO",
      });
      persistedUrls.push(persisted);
    }

    // Save the primary URL on the Generation row, secondary URLs as extras.
    if (generationId && persistedUrls[0]) {
      await setGenerationMediaUrl(generationId, persistedUrls[0]).catch(() => {});
      if (persistedUrls.length > 1) {
        const row = await prismadb.generation
          .findUnique({
            where: { id: generationId },
            select: { prompt: true, modelUsed: true },
          })
          .catch(() => null);
        await saveAdditionalGenerationUrls(
          userId,
          row?.prompt ?? "ClipCraft output",
          row?.modelUsed ?? `clipcraft:${projectId}`,
          assetType,
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
    console.error("[api/clipcraft/status]", err);
    const msg = err instanceof Error ? err.message : String(err);
    if (/rate limit|too many requests|429/i.test(msg)) {
      return NextResponse.json({
        status: "processing",
        progress: undefined,
        rateLimited: true,
      });
    }
    return NextResponse.json({ error: `ClipCraft status check failed: ${msg}` }, { status: 502 });
  }
}
