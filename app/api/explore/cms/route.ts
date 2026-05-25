import { NextResponse } from "next/server";
import { DEFAULT_EXPLORE_CMS, normalizeExploreConfig } from "@/lib/explore-cms";
import { BUCKETS, isStorageConfigured, readJsonFromStorage } from "@/lib/r2-storage";

const FILE = "admin-cms/explore-page.json";
const BUCKET = "media";

export async function GET() {
  try {
    if (!isStorageConfigured()) return NextResponse.json({ config: DEFAULT_EXPLORE_CMS });

    const json = await readJsonFromStorage<unknown>({ bucket: BUCKETS.media, path: FILE });
    if (!json) return NextResponse.json({ config: DEFAULT_EXPLORE_CMS });

    return NextResponse.json(
      { config: normalizeExploreConfig(json) },
      { headers: { "Cache-Control": "public, s-maxage=5, stale-while-revalidate=30" } },
    );
  } catch {
    return NextResponse.json({ config: DEFAULT_EXPLORE_CMS });
  }
}
