import { NextRequest, NextResponse } from "next/server";
import prismadb from "@/lib/prismadb";
import { checkRateLimit, rateLimitHeaders } from "@/lib/rate-limit";
import { getClientIp, isAllowedOrigin } from "@/lib/security";

export const dynamic = "force-dynamic";

type FeedItemType = "video" | "image";

function clampInt(value: unknown, min: number, max: number, fallback: number): number {
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.max(min, Math.min(max, Math.floor(n)));
}

function inferType(assetType: string | null | undefined, type: string | null | undefined): FeedItemType {
  const t = String(type || "").toLowerCase();
  if (t === "video") return "video";
  if (t === "image") return "image";
  const a = String(assetType || "").toLowerCase();
  if (a.includes("video")) return "video";
  return "image";
}

function titleFromPrompt(prompt: string): string {
  const cleaned = String(prompt || "").trim().replace(/\s+/g, " ");
  if (!cleaned) return "Untitled";
  const words = cleaned.split(" ").slice(0, 7).join(" ");
  return words.length < cleaned.length ? `${words}…` : words;
}

function pickOutputUrl(outputUrl: string | null, mediaUrl: string | null): string | null {
  const url = outputUrl || mediaUrl;
  if (!url) return null;
  if (url.startsWith("task:")) return null;
  if (url.startsWith("text:")) return null;
  return url;
}

export async function GET(req: NextRequest) {
  try {
    if (!isAllowedOrigin(req.headers.get("origin"))) {
      return NextResponse.json({ error: "Origin not allowed" }, { status: 403 });
    }

    const ip = getClientIp(req);
    const rate = checkRateLimit(`explore:feed:${ip}`, 120, 60_000);
    if (!rate.allowed) {
      return NextResponse.json({ error: "Too many requests" }, { status: 429, headers: rateLimitHeaders(rate) });
    }

    const { searchParams } = new URL(req.url);
    const take = clampInt(searchParams.get("take"), 6, 60, 30);
    const cursor = searchParams.get("cursor");
    const typeFilter = (searchParams.get("type") || "all").toLowerCase();

    const typeWhere: Record<string, unknown> =
      typeFilter === "video"
        ? {
            OR: [
              { type: "video" },
              { assetType: { contains: "video", mode: "insensitive" } },
              { assetType: { contains: "cinema", mode: "insensitive" } },
            ],
          }
        : typeFilter === "image"
          ? {
              OR: [
                { type: "image" },
                { assetType: { contains: "image", mode: "insensitive" } },
              ],
            }
          : {};

    const rows = await prismadb.generation.findMany({
      where: {
        isFlagged: false,
        OR: [{ outputUrl: { not: null } }, { mediaUrl: { not: null } }],
        NOT: [{ mediaUrl: { startsWith: "task:" } }, { outputUrl: { startsWith: "task:" } }],
        ...typeWhere,
      },
      orderBy: [{ createdAt: "desc" }],
      take: take + 1,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      select: {
        id: true,
        prompt: true,
        modelUsed: true,
        assetType: true,
        type: true,
        status: true,
        mediaUrl: true,
        outputUrl: true,
        createdAt: true,
        user: { select: { email: true } },
      },
    });

    const hasMore = rows.length > take;
    const page = hasMore ? rows.slice(0, take) : rows;

    const items = page
      .map((g) => {
        const url = pickOutputUrl(g.outputUrl, g.mediaUrl);
        if (!url) return null;
        const type = inferType(g.assetType, g.type);
        return {
          id: g.id,
          type,
          title: titleFromPrompt(g.prompt),
          model: g.modelUsed,
          creator: g.user.email ?? g.id,
          durationSec: null as number | null,
          mediaUrl: url,
          thumbnailUrl: type === "image" ? url : null,
          prompt: g.prompt,
          status: typeof g.status === "string" ? g.status : null,
          createdAt: g.createdAt.toISOString(),
        };
      })
      .filter((x): x is NonNullable<typeof x> => Boolean(x));

    return NextResponse.json(
      {
        items,
        nextCursor: hasMore ? page[page.length - 1]?.id ?? null : null,
      },
      { status: 200, headers: rateLimitHeaders(rate) },
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load explore feed.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
