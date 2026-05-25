/**
 * /api/beauty/media — PUBLIC GET endpoint
 * Returns beauty media map { media: Record<key, { url, type }> }
 * Used by beauty2.html to load tool thumbnails and option images.
 */
import { NextResponse } from "next/server";
import { BUCKETS, isStorageConfigured, readJsonFromStorage } from "@/lib/r2-storage";

const MEDIA_FILE = "admin-cms/beauty-media.json";
const BUCKET = "media";

export async function GET() {
  try {
    if (!isStorageConfigured()) return NextResponse.json({ media: {} });
    const media = await readJsonFromStorage<Record<string, unknown>>({
      bucket: BUCKETS.media,
      path: MEDIA_FILE,
    });
    if (!media) return NextResponse.json({ media: {} });
    return NextResponse.json({ media }, {
      headers: { "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300" },
    });
  } catch {
    return NextResponse.json({ media: {} });
  }
}
