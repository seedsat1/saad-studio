/** GET /api/panel/reap/caption-presets
 *
 * Proxy over Reap's /get-all-presets so the panel can populate the
 * captions style picker. */

import { NextRequest, NextResponse } from "next/server";
import { extractPanelToken, verifyPanelToken } from "@/lib/panel-auth";
import { listCaptionPresets } from "@/lib/providers/reap";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const token = extractPanelToken(req);
  if (!token) return NextResponse.json({ error: "Missing Authorization header." }, { status: 401 });

  const verified = verifyPanelToken(token);
  if (!verified) return NextResponse.json({ error: "Invalid or expired panel token." }, { status: 401 });

  try {
    const presets = await listCaptionPresets();
    return NextResponse.json({ presets });
  } catch (err) {
    console.error("[panel/reap/caption-presets]", err);
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg, presets: [] }, { status: 502 });
  }
}
