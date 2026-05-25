/**
 * /api/admin/promo/media
 * GET  → returns all promo slot media { media: Record<slotId, { url, type }> }
 * PUT  → saves/updates a promo slot image/video
 * Body: { slotId: string, url: string, mediaType: "image"|"video" }
 *
 * Storage: Cloudflare R2 JSON (admin-cms/promo-media.json)
 */
import { NextRequest, NextResponse } from "next/server";
import { isAdmin } from "@/lib/is-admin";
import { BUCKETS, readJsonFromStorage, writeJsonToStorage } from "@/lib/r2-storage";

const MEDIA_FILE = "admin-cms/promo-media.json";
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
