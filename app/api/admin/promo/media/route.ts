/**
 * /api/admin/promo/media
 * GET  → returns all promo slot media { media: Record<slotId, { url, type }> }
 * PUT  → saves/updates a promo slot image/video
 * Body: { slotId: string, url: string, mediaType: "image"|"video" }
 *
 * Storage: Supabase storage JSON (admin-cms/promo-media.json)
 */
import { NextRequest, NextResponse } from "next/server";
import { isAdmin } from "@/lib/is-admin";
import { createClient } from "@supabase/supabase-js";

const MEDIA_FILE = "admin-cms/promo-media.json";
const BUCKET = "media";

function getSupabase() {
  const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Supabase not configured");
  return createClient(url, key, { auth: { persistSession: false } });
}

type MediaMap = Record<string, { url: string; type: string }>;

async function loadMediaMap(): Promise<MediaMap> {
  try {
    const supabase = getSupabase();
    const { data, error } = await supabase.storage.from(BUCKET).download(MEDIA_FILE);
    if (error || !data) return {};
    const text = await data.text();
    return JSON.parse(text) as MediaMap;
  } catch {
    return {};
  }
}

async function saveMediaMap(map: MediaMap): Promise<void> {
  const supabase = getSupabase();
  const blob = new Blob([JSON.stringify(map, null, 2)], { type: "application/json" });
  const { error } = await supabase.storage.from(BUCKET).upload(MEDIA_FILE, blob, {
    upsert: true,
    contentType: "application/json",
  });
  if (error) throw new Error(`Failed to save: ${error.message}`);
}

export async function GET() {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const media = await loadMediaMap();
  return NextResponse.json({ media });
}

export async function PUT(req: NextRequest) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  try {
    const { slotId, url, mediaType } = (await req.json()) as {
      slotId: string;
      url: string;
      mediaType?: string;
    };
    if (!slotId || !url) {
      return NextResponse.json({ error: "slotId and url required" }, { status: 400 });
    }
    if (!url.startsWith("https://")) {
      return NextResponse.json({ error: "URL must use HTTPS" }, { status: 400 });
    }
    const map = await loadMediaMap();
    map[slotId] = { url, type: mediaType || "image" };
    await saveMediaMap(map);
    return NextResponse.json({ ok: true, slotId });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed" },
      { status: 500 }
    );
  }
}
