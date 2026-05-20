/**
 * /api/admin/presets/media
 * GET  → returns all transition presets with their current preview URLs
 * PUT  → updates a preset's previewVideoUrl by id
 * Body: { presetId: string; previewVideoUrl: string }
 *
 * Storage: Neon (PageLayout table) under pageName "cms-transitions-media".
 * In-memory presets come from lib/transition-presets.ts.
 * Preview URLs are overlaid from the Neon map.
 */
import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { isAdmin } from "@/lib/is-admin";
import prismadb from "@/lib/prismadb";
import { getClientSafePresets } from "@/lib/transition-presets";

const PAGE_NAME = "cms-transitions-media";

type MediaMap = Record<string, string>; // presetId → previewVideoUrl

async function loadMediaMap(): Promise<MediaMap> {
  try {
    const layout = await prismadb.pageLayout.findUnique({ where: { pageName: PAGE_NAME } });
    const blocks = layout?.layoutBlocks;
    if (blocks && typeof blocks === "object" && !Array.isArray(blocks)) {
      const map = (blocks as { presetMedia?: unknown }).presetMedia;
      if (map && typeof map === "object" && !Array.isArray(map)) {
        return Object.fromEntries(
          Object.entries(map as Record<string, unknown>).filter(
            ([, v]) => typeof v === "string",
          ) as Array<[string, string]>,
        );
      }
    }
    return {};
  } catch {
    return {};
  }
}

async function saveMediaMap(map: MediaMap): Promise<void> {
  const layoutBlocks = { presetMedia: map } as unknown as Prisma.InputJsonValue;
  await prismadb.pageLayout.upsert({
    where: { pageName: PAGE_NAME },
    update: { layoutBlocks },
    create: { pageName: PAGE_NAME, layoutBlocks },
  });
}

export async function GET() {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const presets = getClientSafePresets();
  const mediaMap = await loadMediaMap();
  const merged = presets.map((p: { id: string; previewVideoUrl?: string; [k: string]: unknown }) => ({
    ...p,
    previewVideoUrl: mediaMap[p.id] || p.previewVideoUrl || "",
  }));
  return NextResponse.json({ presets: merged });
}

export async function PUT(req: NextRequest) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const { presetId, previewVideoUrl } = (await req.json()) as {
      presetId: string;
      previewVideoUrl: string;
    };

    if (!presetId || typeof previewVideoUrl !== "string") {
      return NextResponse.json(
        { error: "presetId and previewVideoUrl required" },
        { status: 400 }
      );
    }

    if (previewVideoUrl && !previewVideoUrl.startsWith("https://")) {
      return NextResponse.json({ error: "URL must use HTTPS" }, { status: 400 });
    }

    const map = await loadMediaMap();
    if (previewVideoUrl) {
      map[presetId] = previewVideoUrl;
    } else {
      delete map[presetId];
    }
    await saveMediaMap(map);

    return NextResponse.json({ ok: true, presetId, previewVideoUrl });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to update" },
      { status: 500 }
    );
  }
}
