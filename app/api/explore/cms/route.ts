import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { DEFAULT_EXPLORE_CMS, normalizeExploreConfig } from "@/lib/explore-cms";

const FILE = "admin-cms/explore-page.json";
const BUCKET = "media";

function getSupabase() {
  const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false } });
}

export async function GET() {
  try {
    const supabase = getSupabase();
    if (!supabase) return NextResponse.json({ config: DEFAULT_EXPLORE_CMS });

    const { data, error } = await supabase.storage.from(BUCKET).download(FILE);
    if (error || !data) return NextResponse.json({ config: DEFAULT_EXPLORE_CMS });

    const json = JSON.parse(await data.text());
    return NextResponse.json(
      { config: normalizeExploreConfig(json) },
      { headers: { "Cache-Control": "public, s-maxage=5, stale-while-revalidate=30" } },
    );
  } catch {
    return NextResponse.json({ config: DEFAULT_EXPLORE_CMS });
  }
}
