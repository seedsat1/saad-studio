/**
 * /api/admin/announcement — Admin announcement bar management
 * GET  → returns current announcement config
 * PUT  → updates announcement bar settings
 */
import { NextRequest, NextResponse } from "next/server";
import { isAdmin } from "@/lib/is-admin";
import { BUCKETS, readJsonFromStorage, writeJsonToStorage } from "@/lib/r2-storage";

const FILE = "admin-cms/announcement-bar.json";
const BUCKET = "media";

export type AnnouncementConfig = {
  enabled: boolean;
  text: string;
  link: string;
  linkLabel: string;
  bgColor: string;
  textColor: string;
};

const DEFAULTS: AnnouncementConfig = {
  enabled: false,
  text: "",
  link: "",
  linkLabel: "Learn more",
  bgColor: "#7c3aed",
  textColor: "#ffffff",
};

async function loadConfig(): Promise<AnnouncementConfig> {
  try {
    const config = await readJsonFromStorage<AnnouncementConfig>({ bucket: BUCKETS.media, path: FILE });
    return { ...DEFAULTS, ...(config || {}) };
  } catch {
    return DEFAULTS;
  }
}

async function saveConfig(config: AnnouncementConfig): Promise<void> {
  await writeJsonToStorage({ bucket: BUCKETS.media, path: FILE, data: config });
}

export async function GET() {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const config = await loadConfig();
  return NextResponse.json({ config });
}

export async function PUT(req: NextRequest) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  try {
    const body = await req.json();
    const config: AnnouncementConfig = {
      enabled: Boolean(body.enabled),
      text: String(body.text || "").slice(0, 200),
      link: String(body.link || "").slice(0, 500),
      linkLabel: String(body.linkLabel || "Learn more").slice(0, 50),
      bgColor: String(body.bgColor || "#7c3aed").slice(0, 20),
      textColor: String(body.textColor || "#ffffff").slice(0, 20),
    };
    await saveConfig(config);
    return NextResponse.json({ ok: true, config });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed" },
      { status: 500 }
    );
  }
}
