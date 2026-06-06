/** GET /api/panel/reap/status?projectId=...&generationId=...
 *
 * Polls Reap for project status. When the project completes the final
 * URL is persisted to R2 (so the panel can display it directly without
 * worrying about Reap link expiry) and the Generation row is updated.
 *
 * Returns:
 *   { status: "queued"|"processing"|"completed"|"failed"|...,
 *     progress?: number,
 *     url?: string,         // R2-hosted on completion
 *     urls?: string[],      // for edit-videos (multi-clip)
 *     metadata?: any,
 *     error?: string } */

import { NextRequest, NextResponse } from "next/server";
import { extractPanelToken, verifyPanelToken } from "@/lib/panel-auth";
import { setGenerationMediaUrl, saveAdditionalGenerationUrls, ensureUserRow } from "@/lib/credit-ledger";
import { hitRateLimit, panelRateLimitResponse, getRequestIp } from "@/lib/panel-rate-limit";
import prismadb from "@/lib/prismadb";
import { pollReapStatus } from "@/lib/providers/reap";
import { persistProviderUrl } from "@/lib/providers/persist-output";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const token = extractPanelToken(req);
  if (!token) return NextResponse.json({ error: "Missing Authorization header." }, { status: 401 });

  const verified = verifyPanelToken(token);
  if (!verified) return NextResponse.json({ error: "Invalid or expired panel token." }, { status: 401 });

  const projectId = req.nextUrl.searchParams.get("projectId");
  const generationId = req.nextUrl.searchParams.get("generationId");
  if (!projectId) return NextResponse.json({ error: "Missing projectId" }, { status: 400 });

  const rate = hitRateLimit({
    key: `panel:reap:status:${verified.userId}`,
    limit: 60,
    windowMs: 60_000,
  });
  if (!rate.allowed) return panelRateLimitResponse(rate.retryAfterSec);

  try {
    const userId = verified.userId;
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

    // Completed: persist the asset(s) to R2 so the panel gets a stable URL.
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
          assetType: "VIDEO",
        });
        persistedUrls.push(persisted);
      }
    } else if (result.url) {
      const persisted = await persistProviderUrl({
        url: result.url,
        userId,
        generationId: generationId ?? `reap-${projectId}`,
        assetType: "VIDEO",
      });
      persistedUrls.push(persisted);
    }

    // Save the primary URL on the Generation row, secondary URLs as extras.
    if (generationId && persistedUrls[0]) {
      await setGenerationMediaUrl(generationId, persistedUrls[0]).catch(() => {});
      if (persistedUrls.length > 1) {
        // Look up the prompt + modelUsed off the existing row to keep the
        // saveAdditionalGenerationUrls signature happy.
        const row = await prismadb.generation
          .findUnique({
            where: { id: generationId },
            select: { prompt: true, modelUsed: true },
          })
          .catch(() => null);
        await saveAdditionalGenerationUrls(
          userId,
          row?.prompt ?? "Reap output",
          row?.modelUsed ?? `reap:${projectId}`,
          "VIDEO",
          persistedUrls.slice(1),
        ).catch(() => {});
      }
    }

    return NextResponse.json({
      status: "completed",
      url: persistedUrls[0] ?? null,
      urls: persistedUrls,
      metadata: result.metadata,
    });
  } catch (err) {
    console.error("[panel/reap/status]", err);
    const msg = err instanceof Error ? err.message : String(err);
    if (/rate limit|too many requests|429/i.test(msg)) {
      return NextResponse.json({
        status: "processing",
        progress: undefined,
        rateLimited: true,
      });
    }
    return NextResponse.json({ error: `Reap status check failed: ${msg}` }, { status: 502 });
  }
}
