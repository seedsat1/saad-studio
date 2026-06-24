import { NextResponse } from "next/server";
import prismadb from "@/lib/prismadb";
import { getClientSafePresets } from "@/lib/transition-presets";
import { normalizeMediaUrl } from "@/lib/r2-storage";

export const dynamic = "force-dynamic";

const PAGE_NAME = "cms-transitions-media";

async function loadMediaMap(): Promise<Record<string, string>> {
  try {
    const layout = await prismadb.pageLayout.findUnique({ where: { pageName: PAGE_NAME } });
    const blocks = layout?.layoutBlocks;
    if (blocks && typeof blocks === "object" && !Array.isArray(blocks)) {
      const map = (blocks as { presetMedia?: unknown }).presetMedia;
      if (map && typeof map === "object" && !Array.isArray(map)) {
        return Object.fromEntries(
          Object.entries(map as Record<string, unknown>).filter(
            ([, v]) => typeof v === "string",
          ).map(([k, v]) => [k, normalizeMediaUrl(v) || ""]) as Array<[string, string]>,
        );
      }
    }
    return {};
  } catch {
    return {};
  }
}

export async function GET() {
  const presets = getClientSafePresets();
  const mediaMap = await loadMediaMap();

  const merged = presets.map((p: { id: string; previewVideoUrl?: string; [k: string]: unknown }) => ({
    ...p,
    previewVideoUrl: normalizeMediaUrl(mediaMap[p.id] || p.previewVideoUrl || "") || "",
  }));

  return NextResponse.json(
    { presets: merged },
    { headers: { "Cache-Control": "no-store" } }
  );
}
