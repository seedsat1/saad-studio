import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { isAdmin } from "@/lib/is-admin";
import { DEFAULT_EXPLORE_CMS, normalizeExploreConfig } from "@/lib/explore-cms";

const FILE = "admin-cms/explore-page.json";
const BUCKET = "media";

function getSupabase() {
  const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Supabase not configured");
  return createClient(url, key, { auth: { persistSession: false } });
}

async function loadConfig() {
  try {
    const supabase = getSupabase();
    const { data, error } = await supabase.storage.from(BUCKET).download(FILE);
    if (error || !data) return DEFAULT_EXPLORE_CMS;
    return normalizeExploreConfig(JSON.parse(await data.text()));
  } catch {
    return DEFAULT_EXPLORE_CMS;
  }
}

async function saveConfig(config: unknown) {
  const supabase = getSupabase();
  const normalized = normalizeExploreConfig({
    ...(config as object),
    updatedAt: new Date().toISOString(),
  });
  const blob = new Blob([JSON.stringify(normalized, null, 2)], { type: "application/json" });
  const { error } = await supabase.storage.from(BUCKET).upload(FILE, blob, {
    upsert: true,
    contentType: "application/json",
  });
  if (error) throw new Error(error.message);
  return normalized;
}

export async function GET() {
  if (!(await isAdmin())) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  return NextResponse.json({ config: await loadConfig() });
}

export async function PUT(req: NextRequest) {
  if (!(await isAdmin())) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  try {
    const body = await req.json();
    const config = await saveConfig(body?.config ?? body);
    return NextResponse.json({ ok: true, config });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to save Explore CMS" },
      { status: 500 },
    );
  }
}
