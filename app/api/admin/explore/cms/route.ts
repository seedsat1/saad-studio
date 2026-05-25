import { NextRequest, NextResponse } from "next/server";
import { isAdmin } from "@/lib/is-admin";
import { DEFAULT_EXPLORE_CMS, normalizeExploreConfig } from "@/lib/explore-cms";
import { BUCKETS, readJsonFromStorage, writeJsonToStorage } from "@/lib/r2-storage";

const FILE = "admin-cms/explore-page.json";
const BUCKET = "media";

async function loadConfig() {
  try {
    const config = await readJsonFromStorage<unknown>({ bucket: BUCKETS.media, path: FILE });
    if (!config) return DEFAULT_EXPLORE_CMS;
    return normalizeExploreConfig(config);
  } catch {
    return DEFAULT_EXPLORE_CMS;
  }
}

async function saveConfig(config: unknown) {
  const normalized = normalizeExploreConfig({
    ...(config as object),
    updatedAt: new Date().toISOString(),
  });
  await writeJsonToStorage({ bucket: BUCKETS.media, path: FILE, data: normalized });
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
