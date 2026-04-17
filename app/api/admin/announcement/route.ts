/**
 * /api/admin/announcement — Admin announcement bar management
 * GET  → returns current announcement config
 * PUT  → updates announcement bar settings
 */
import { NextRequest, NextResponse } from "next/server";
import { isAdmin } from "@/lib/is-admin";
import { createClient } from "@supabase/supabase-js";

const FILE = "admin-cms/announcement-bar.json";
const BUCKET = "media";

function getSupabase() {
  const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Supabase not configured");
  return createClient(url, key, { auth: { persistSession: false } });
}

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
    const supabase = getSupabase();
    const { data, error } = await supabase.storage.from(BUCKET).download(FILE);
    if (error || !data) return DEFAULTS;
    const text = await data.text();
    return { ...DEFAULTS, ...JSON.parse(text) };
  } catch {
    return DEFAULTS;
  }
}

async function saveConfig(config: AnnouncementConfig): Promise<void> {
  const supabase = getSupabase();
  const blob = new Blob([JSON.stringify(config, null, 2)], { type: "application/json" });
  const { error } = await supabase.storage.from(BUCKET).upload(FILE, blob, {
    upsert: true,
    contentType: "application/json",
  });
  if (error) throw new Error(`Failed to save: ${error.message}`);
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
