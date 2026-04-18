/**
 * /api/promo/content — PUBLIC GET
 * Returns all promo text overrides for frontend rendering
 */
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const FILE = "admin-cms/promo-content.json";
const BUCKET = "media";

export async function GET() {
  try {
    const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !key) return NextResponse.json({ content: {} });
    const supabase = createClient(url, key, { auth: { persistSession: false } });
    const { data, error } = await supabase.storage.from(BUCKET).download(FILE);
    if (error || !data) return NextResponse.json({ content: {} });
    const text = await data.text();
    const content = JSON.parse(text);
    return NextResponse.json({ content }, {
      headers: { "Cache-Control": "public, s-maxage=5, stale-while-revalidate=30" },
    });
  } catch {
    return NextResponse.json({ content: {} });
  }
}
