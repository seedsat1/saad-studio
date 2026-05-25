/**
 * /api/promo/media — PUBLIC GET endpoint
 * Returns promo media map { media: Record<slotId, { url, type }> }
 * Used by frontend components (HeroCarousel, TopChoiceGrid, etc.)
 */
import { NextResponse } from "next/server";
import { BUCKETS, isStorageConfigured, readJsonFromStorage } from "@/lib/r2-storage";

const MEDIA_FILE = "admin-cms/promo-media.json";
const BUCKET = "media";

export async function GET() {
  try {
    if (!isStorageConfigured()) {
      return NextResponse.json({ media: {} });
    }
    const media = await readJsonFromStorage<Record<string, unknown>>({
      bucket: BUCKETS.media,
      path: MEDIA_FILE,
    });
    if (!media) {
      return NextResponse.json({ media: {} });
    }
    return NextResponse.json({ media }, {
      headers: { "Cache-Control": "public, s-maxage=5, stale-while-revalidate=30" },
    });
  } catch {
    return NextResponse.json({ media: {} });
  }
}
