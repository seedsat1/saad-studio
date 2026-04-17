/**
 * /api/admin/promo/content — Admin promo TEXT content management
 * GET  → returns all promo text overrides { content: Record<slotId, { title?, subtitle?, cta?, ctaHref?, badge? }> }
 * PUT  → saves/updates a slot's text content
 * Body: { slotId: string, title?, subtitle?, cta?, ctaHref?, badge? }
 */
import { NextRequest, NextResponse } from "next/server";
import { isAdmin } from "@/lib/is-admin";
import { createClient } from "@supabase/supabase-js";

const FILE = "admin-cms/promo-content.json";
const BUCKET = "media";

function getSupabase() {
  const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Supabase not configured");
  return createClient(url, key, { auth: { persistSession: false } });
}

type SlotContent = {
  title?: string;
  subtitle?: string;
  cta?: string;
  ctaHref?: string;
  badge?: string;
};
type ContentMap = Record<string, SlotContent>;

async function loadContentMap(): Promise<ContentMap> {
  try {
    const supabase = getSupabase();
    const { data, error } = await supabase.storage.from(BUCKET).download(FILE);
    if (error || !data) return {};
    const text = await data.text();
    return JSON.parse(text) as ContentMap;
  } catch {
    return {};
  }
}

async function saveContentMap(map: ContentMap): Promise<void> {
  const supabase = getSupabase();
  const blob = new Blob([JSON.stringify(map, null, 2)], { type: "application/json" });
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
  const content = await loadContentMap();
  return NextResponse.json({ content });
}

export async function PUT(req: NextRequest) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  try {
    const { slotId, title, subtitle, cta, ctaHref, badge } = await req.json();
    if (!slotId) {
      return NextResponse.json({ error: "slotId required" }, { status: 400 });
    }
    const map = await loadContentMap();
    const existing = map[slotId] || {};
    map[slotId] = {
      ...existing,
      ...(title !== undefined && { title: String(title).slice(0, 200) }),
      ...(subtitle !== undefined && { subtitle: String(subtitle).slice(0, 500) }),
      ...(cta !== undefined && { cta: String(cta).slice(0, 50) }),
      ...(ctaHref !== undefined && { ctaHref: String(ctaHref).slice(0, 500) }),
      ...(badge !== undefined && { badge: String(badge).slice(0, 30) }),
    };
    await saveContentMap(map);
    return NextResponse.json({ ok: true, slotId });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed" },
      { status: 500 }
    );
  }
}
