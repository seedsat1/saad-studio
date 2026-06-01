import { NextRequest, NextResponse } from "next/server";
import { extractPanelToken, verifyPanelToken } from "@/lib/panel-auth";
import { listTranslationLanguages } from "@/lib/providers/reap";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const token = extractPanelToken(req);
  if (!token) return NextResponse.json({ error: "Missing Authorization header." }, { status: 401 });

  const verified = verifyPanelToken(token);
  if (!verified) return NextResponse.json({ error: "Invalid or expired panel token." }, { status: 401 });

  try {
    const languages = await listTranslationLanguages();
    return NextResponse.json({ languages });
  } catch (err) {
    console.error("[panel/reap/translation-languages]", err);
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg, languages: [] }, { status: 502 });
  }
}
