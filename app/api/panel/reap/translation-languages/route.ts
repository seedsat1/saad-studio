import { NextRequest, NextResponse } from "next/server";
import { extractPanelToken, verifyPanelToken } from "@/lib/panel-auth";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const token = extractPanelToken(req);
  if (!token) return NextResponse.json({ error: "Missing Authorization header." }, { status: 401 });

  const verified = verifyPanelToken(token);
  if (!verified) return NextResponse.json({ error: "Invalid or expired panel token." }, { status: 401 });

  try {
    const apiKey = process.env.REAP_API_KEY ?? "";
    if (!apiKey) {
      return NextResponse.json({ error: "REAP_API_KEY is not set on the server." }, { status: 500 });
    }

    const res = await fetch("https://public.reap.video/api/v1/automation/get-translation-languages", {
      method: "GET",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        Accept: "application/json",
      },
      cache: "no-store",
    });

    const text = await res.text();
    if (!text.trim()) {
      return NextResponse.json({ error: `Empty response from Reap (${res.status}).` }, { status: 502 });
    }

    let data: unknown;
    try {
      data = JSON.parse(text);
    } catch {
      return NextResponse.json({
        error: `Non-JSON response from Reap (${res.status}): ${text.slice(0, 300)}`,
      }, { status: 502 });
    }

    if (!res.ok) {
      return NextResponse.json(data, { status: res.status });
    }

    return NextResponse.json(data);
  } catch (err) {
    console.error("[panel/reap/translation-languages]", err);
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 502 });
  }
}
