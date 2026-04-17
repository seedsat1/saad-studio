/**
 * /api/promo/media — PUBLIC GET endpoint
 * Returns promo media map { media: Record<slotId, { url, type }> }
 * Used by frontend components (HeroCarousel, TopChoiceGrid, etc.)
 */
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const MEDIA_FILE = "admin-cms/promo-media.json";
const BUCKET = "media";

export async function GET() {
  try {
    const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !key) {
      return NextResponse.json({ media: {} });
    }
    const supabase = createClient(url, key, { auth: { persistSession: false } });
    const { data, error } = await supabase.storage.from(BUCKET).download(MEDIA_FILE);
    if (error || !data) {
      return NextResponse.json({ media: {} });
    }
    const text = await data.text();
    const media = JSON.parse(text);
    return NextResponse.json({ media }, {
      headers: { "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300" },
    });
  } catch {
    return NextResponse.json({ media: {} });
  }
}
