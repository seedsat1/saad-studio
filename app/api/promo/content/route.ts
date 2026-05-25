/**
 * /api/promo/content — PUBLIC GET
 * Returns all promo text overrides for frontend rendering
 */
import { NextResponse } from "next/server";
import { BUCKETS, isStorageConfigured, readJsonFromStorage } from "@/lib/r2-storage";

const FILE = "admin-cms/promo-content.json";
const BUCKET = "media";

export async function GET() {
  try {
    if (!isStorageConfigured()) return NextResponse.json({ content: {} });
    const content = await readJsonFromStorage<Record<string, unknown>>({ bucket: BUCKETS.media, path: FILE });
    if (!content) return NextResponse.json({ content: {} });
    return NextResponse.json({ content }, {
      headers: { "Cache-Control": "public, s-maxage=5, stale-while-revalidate=30" },
    });
  } catch {
    return NextResponse.json({ content: {} });
  }
}
