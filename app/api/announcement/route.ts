/**
 * /api/announcement — PUBLIC GET
 * Returns announcement bar config for all visitors
 */
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const FILE = "admin-cms/announcement-bar.json";
const BUCKET = "media";

export async function GET() {
  try {
    const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !key) return NextResponse.json({ config: null });
    const supabase = createClient(url, key, { auth: { persistSession: false } });
    const { data, error } = await supabase.storage.from(BUCKET).download(FILE);
    if (error || !data) return NextResponse.json({ config: null });
    const text = await data.text();
    const config = JSON.parse(text);
    if (!config.enabled) return NextResponse.json({ config: null });
    return NextResponse.json({ config }, {
      headers: { "Cache-Control": "public, s-maxage=30, stale-while-revalidate=120" },
    });
  } catch {
    return NextResponse.json({ config: null });
  }
}
