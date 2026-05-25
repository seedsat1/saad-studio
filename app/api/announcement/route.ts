/**
 * /api/announcement — PUBLIC GET
 * Returns announcement bar config for all visitors
 */
import { NextResponse } from "next/server";
import { BUCKETS, isStorageConfigured, readJsonFromStorage } from "@/lib/r2-storage";

const FILE = "admin-cms/announcement-bar.json";
const BUCKET = "media";

export async function GET() {
  try {
    if (!isStorageConfigured()) return NextResponse.json({ config: null });
    const config = await readJsonFromStorage<Record<string, unknown>>({ bucket: BUCKETS.media, path: FILE });
    if (!config) return NextResponse.json({ config: null });
    if (!config.enabled) return NextResponse.json({ config: null });
    return NextResponse.json({ config }, {
      headers: { "Cache-Control": "public, s-maxage=30, stale-while-revalidate=120" },
    });
  } catch {
    return NextResponse.json({ config: null });
  }
}
