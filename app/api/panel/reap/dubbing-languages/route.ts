/** GET /api/panel/reap/dubbing-languages
 *
 * Thin proxy over Reap's /get-dubbing-languages so the panel can fill
 * its language picker without exposing the REAP_API_KEY to the client. */

import { NextRequest, NextResponse } from "next/server";
import { extractPanelToken, verifyPanelToken } from "@/lib/panel-auth";
import { listDubbingLanguages } from "@/lib/providers/reap";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const token = extractPanelToken(req);
  if (!token) return NextResponse.json({ error: "Missing Authorization header." }, { status: 401 });

  const verified = verifyPanelToken(token);
  if (!verified) return NextResponse.json({ error: "Invalid or expired panel token." }, { status: 401 });

  try {
    const languages = await listDubbingLanguages();
    return NextResponse.json({ languages });
  } catch (err) {
    console.error("[panel/reap/dubbing-languages]", err);
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg, languages: [] }, { status: 502 });
  }
}
