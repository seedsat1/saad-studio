/**
 * /api/admin/beauty/media
 * GET  → returns all beauty option media mappings { media: Record<"toolId/optionId", { url, type }> }
 * PUT  → saves/updates a media mapping for a tool thumb or option
 * Body for option: { toolId, optionId, type: "option", url, mediaType: "image"|"video" }
 * Body for thumb:  { toolId, type: "thumb", url }
 *
 * Storage: Supabase storage JSON file (admin-cms/beauty-media.json)
 * This works on Vercel (read-only filesystem) because we use Supabase storage.
 */
import { NextRequest, NextResponse } from "next/server";
import { isAdmin } from "@/lib/is-admin";
import { createClient } from "@supabase/supabase-js";

const MEDIA_FILE = "admin-cms/beauty-media.json";
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
    const { data, error } = await supabase.storage
      .from(BUCKET)
      .download(MEDIA_FILE);
    if (error || !data) return {};
    const text = await data.text();
    return JSON.parse(text) as MediaMap;
  } catch {
    return {};
  }
}

async function saveMediaMap(map: MediaMap): Promise<void> {
  const supabase = getSupabase();
  const blob = new Blob([JSON.stringify(map, null, 2)], {
    type: "application/json",
  });
  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(MEDIA_FILE, blob, {
      upsert: true,
      contentType: "application/json",
    });
  if (error) throw new Error(`Failed to save media map: ${error.message}`);
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
    const body = await req.json();
    const { toolId, type, url } = body as {
      toolId: string;
      type: "thumb" | "option";
      url: string;
    };

    if (!toolId || !type || !url) {
      return NextResponse.json(
        { error: "Missing required fields: toolId, type, url" },
        { status: 400 }
      );
    }

    // Basic URL validation
    if (!url.startsWith("https://")) {
      return NextResponse.json(
        { error: "URL must be HTTPS" },
        { status: 400 }
      );
    }

    const map = await loadMediaMap();

    if (type === "thumb") {
      map[`thumb/${toolId}`] = { url, type: "image" };
    } else if (type === "option") {
      const { optionId, mediaType } = body as {
        optionId: string;
        mediaType: "image" | "video";
      };
      if (!optionId || !mediaType) {
        return NextResponse.json(
          { error: "Missing optionId or mediaType for option upload" },
          { status: 400 }
        );
      }
      map[`${toolId}/${optionId}`] = { url, type: mediaType };
    } else {
      return NextResponse.json(
        { error: "Invalid type: must be 'thumb' or 'option'" },
        { status: 400 }
      );
    }

    await saveMediaMap(map);

    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to update" },
      { status: 500 }
    );
  }
}
