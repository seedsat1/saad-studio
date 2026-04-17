import { NextResponse } from "next/server";
import { getClientSafePresets } from "@/lib/transition-presets";
import { createClient } from "@supabase/supabase-js";

const MEDIA_FILE = "admin-cms/transition-media.json";
const BUCKET = "media";

async function loadMediaMap(): Promise<Record<string, string>> {
  try {
    const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !key) return {};
    const supabase = createClient(url, key, { auth: { persistSession: false } });
    const { data, error } = await supabase.storage.from(BUCKET).download(MEDIA_FILE);
    if (error || !data) return {};
    const text = await data.text();
    return JSON.parse(text) as Record<string, string>;
  } catch {
    return {};
  }
}

export async function GET() {
  const presets = getClientSafePresets();
  const mediaMap = await loadMediaMap();

  // Overlay admin-uploaded preview URLs onto presets
  const merged = presets.map((p: { id: string; previewVideoUrl?: string; [k: string]: unknown }) => ({
    ...p,
    previewVideoUrl: mediaMap[p.id] || p.previewVideoUrl || "",
  }));

  return NextResponse.json({ presets: merged });
}
