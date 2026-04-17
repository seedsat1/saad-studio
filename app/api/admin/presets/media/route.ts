/**
 * /api/admin/presets/media
 * GET  → returns all transition presets with their current preview URLs
 * PUT  → updates a preset's previewVideoUrl by id
 * Body: { presetId: string; previewVideoUrl: string }
 *
 * Storage: Supabase storage JSON (admin-cms/transition-media.json)
 * In-memory presets come from lib/transition-presets.ts (read-only on Vercel).
 * Preview URLs are overlaid from the Supabase JSON map.
 */
import { NextRequest, NextResponse } from "next/server";
import { isAdmin } from "@/lib/is-admin";
import { getClientSafePresets } from "@/lib/transition-presets";
import { createClient } from "@supabase/supabase-js";

const MEDIA_FILE = "admin-cms/transition-media.json";
const BUCKET = "media";

function getSupabase() {
  const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Supabase not configured");
  return createClient(url, key, { auth: { persistSession: false } });
}

type MediaMap = Record<string, string>; // presetId → previewVideoUrl

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
  if (error) throw new Error(`Failed to save media map: ${error.message}`);
}

export async function GET() {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const presets = getClientSafePresets();
  const mediaMap = await loadMediaMap();
  // Overlay saved preview URLs onto presets
  const merged = presets.map((p: { id: string; previewVideoUrl?: string; [k: string]: unknown }) => ({
    ...p,
    previewVideoUrl: mediaMap[p.id] || p.previewVideoUrl || "",
  }));
  return NextResponse.json({ presets: merged });
}

export async function PUT(req: NextRequest) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const { presetId, previewVideoUrl } = (await req.json()) as {
      presetId: string;
      previewVideoUrl: string;
    };

    if (!presetId || typeof previewVideoUrl !== "string") {
      return NextResponse.json(
        { error: "presetId and previewVideoUrl required" },
        { status: 400 }
      );
    }

    // Validate URL
    if (previewVideoUrl && !previewVideoUrl.startsWith("https://")) {
      return NextResponse.json({ error: "URL must use HTTPS" }, { status: 400 });
    }

    const map = await loadMediaMap();
    map[presetId] = previewVideoUrl;
    await saveMediaMap(map);

    return NextResponse.json({ ok: true, presetId, previewVideoUrl });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to update" },
      { status: 500 }
    );
  }
}
