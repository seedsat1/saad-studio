/**
 * /api/admin/beauty/media
 * GET  → returns all beauty option media mappings { media: Record<"toolId/optionId", { url, type }> }
 * PUT  → saves/updates a media mapping for a tool thumb or option
 * Body for option: { toolId, optionId, type: "option", url, mediaType: "image"|"video" }
 * Body for thumb:  { toolId, type: "thumb", url }
 *
 * Storage: Cloudflare R2 JSON file (admin-cms/beauty-media.json)
 * This works on Vercel (read-only filesystem) because media lives in object storage.
 */
import { NextRequest, NextResponse } from "next/server";
import { isAdmin } from "@/lib/is-admin";
import { BUCKETS, readJsonFromStorage, writeJsonToStorage } from "@/lib/r2-storage";

const MEDIA_FILE = "admin-cms/beauty-media.json";
const BUCKET = "media";

type MediaMap = Record<string, { url: string; type: string }>;

async function loadMediaMap(): Promise<MediaMap> {
  try {
    return (await readJsonFromStorage<MediaMap>({ bucket: BUCKETS.media, path: MEDIA_FILE })) || {};
  } catch {
    return {};
  }
}

async function saveMediaMap(map: MediaMap): Promise<void> {
  await writeJsonToStorage({ bucket: BUCKETS.media, path: MEDIA_FILE, data: map });
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
