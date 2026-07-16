import { NextRequest, NextResponse } from "next/server";
import prismadb from "@/lib/prismadb";
import { extractPanelToken, verifyPanelToken } from "@/lib/panel-auth";
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
            ([, value]) => typeof value === "string" && String(value).trim().length > 0,
          ) as Array<[string, string]>,
        );
      }
    }
    return {};
  } catch {
    return {};
  }
}

export async function GET(req: NextRequest) {
  const token = extractPanelToken(req);
  if (!token) {
    return NextResponse.json({ error: "Missing Authorization header." }, { status: 401 });
  }

  const verified = verifyPanelToken(token);
  if (!verified) {
    return NextResponse.json({ error: "Invalid panel token." }, { status: 401 });
  }

  const presets = getClientSafePresets();
  const mediaMap = await loadMediaMap();

  const merged = presets.map((preset) => ({
    ...preset,
    previewVideoUrl: normalizeMediaUrl(mediaMap[preset.id] || preset.previewVideoUrl || "") || "",
  }));

  return NextResponse.json(
    { presets: merged },
    { headers: { "Cache-Control": "no-store" } },
  );
}
