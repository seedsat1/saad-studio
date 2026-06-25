import { NextRequest, NextResponse } from "next/server";
import { extractPanelToken, verifyPanelToken } from "@/lib/panel-auth";
import { ensureUserRow } from "@/lib/credit-ledger";
import prismadb from "@/lib/prismadb";
import { hitRateLimit, panelRateLimitResponse } from "@/lib/panel-rate-limit";
import { normalizeMediaUrl } from "@/lib/r2-storage";

export const dynamic = "force-dynamic";

function isSupportedGeneration(assetType: string | null | undefined, type: string | null | undefined): boolean {
  const normalizedType = String(type ?? "").toLowerCase();
  if (normalizedType === "image" || normalizedType === "video") return true;

  const normalizedAssetType = String(assetType ?? "").toLowerCase();
  return normalizedAssetType.includes("image")
    || normalizedAssetType.includes("video")
    || normalizedAssetType.includes("transition");
}

function inferKind(assetType: string | null | undefined, type: string | null | undefined): "image" | "video" {
  const normalizedType = String(type ?? "").toLowerCase();
  if (normalizedType === "video" || normalizedType === "image") {
    return normalizedType;
  }

  const normalizedAssetType = String(assetType ?? "").toLowerCase();
  if (normalizedAssetType.includes("transition")) {
    return "video";
  }
  return normalizedAssetType.includes("video") ? "video" : "image";
}

function resolvePublicUrl(mediaUrl: string | null | undefined, outputUrl: string | null | undefined): string | null {
  const candidate = outputUrl || mediaUrl;
  if (!candidate) return null;
  if (candidate.startsWith("task:")) return null;
  return normalizeMediaUrl(candidate);
}

function parseLimit(req: NextRequest): number {
  const raw = Number(req.nextUrl.searchParams.get("limit") ?? "12");
  if (!Number.isFinite(raw)) return 12;
  return Math.max(1, Math.min(50, Math.floor(raw)));
}

/** GET /api/panel/generations — latest account-linked outputs for the Adobe panel. */
export async function GET(req: NextRequest) {
  const token = extractPanelToken(req);
  if (!token) {
    return NextResponse.json({ error: "Missing Authorization header." }, { status: 401 });
  }

  const verified = verifyPanelToken(token);
  if (!verified) {
    return NextResponse.json({ error: "Invalid or expired panel token." }, { status: 401 });
  }

  const rate = hitRateLimit({
    key: `panel:generations:${verified.userId}`,
    limit: 60,
    windowMs: 60_000,
  });
  if (!rate.allowed) {
    return panelRateLimitResponse(rate.retryAfterSec);
  }

  try {
    await ensureUserRow(verified.userId);

    const user = await prismadb.user.findUnique({
      where: { id: verified.userId },
      select: { isBanned: true },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found." }, { status: 404 });
    }
    if (user.isBanned) {
      return NextResponse.json({ error: "Account suspended." }, { status: 403 });
    }

    const limit = parseLimit(req);
    const generations = await prismadb.generation.findMany({
      where: {
        userId: verified.userId,
        isFlagged: false,
      },
      orderBy: { createdAt: "desc" },
      take: limit * 3,
      select: {
        id: true,
        prompt: true,
        mediaUrl: true,
        outputUrl: true,
        type: true,
        status: true,
        assetType: true,
        modelUsed: true,
        createdAt: true,
      },
    });

    const items = generations
      .map((generation) => {
        if (!isSupportedGeneration(generation.assetType, generation.type)) return null;
        const url = resolvePublicUrl(generation.mediaUrl, generation.outputUrl);
        if (!url) return null;

        return {
          id: generation.id,
          kind: inferKind(generation.assetType, generation.type),
          url,
          thumbnailUrl: generation.type === "image" ? url : undefined,
          prompt: generation.prompt,
          model: generation.modelUsed,
          createdAt: generation.createdAt.toISOString(),
        };
      })
      .filter((item): item is NonNullable<typeof item> => item !== null)
      .slice(0, limit);

    return NextResponse.json({ items });
  } catch (err) {
    console.error("[panel/generations]", err);
    return NextResponse.json({ error: "Server error." }, { status: 500 });
  }
}
