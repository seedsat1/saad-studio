import { NextRequest, NextResponse } from "next/server";
import { extractPanelToken, verifyPanelToken } from "@/lib/panel-auth";
import { ensureUserRow } from "@/lib/credit-ledger";
import prismadb from "@/lib/prismadb";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const KIE_CHAT_URL = "https://api.kie.ai/gpt-5-2/v1/chat/completions";

/** POST /api/panel/chat — proxies KIE chat completions using server KIE key. */
export async function POST(req: NextRequest) {
  const token = extractPanelToken(req);
  if (!token) return NextResponse.json({ error: "Missing Authorization header." }, { status: 401 });

  const verified = verifyPanelToken(token);
  if (!verified) return NextResponse.json({ error: "Invalid panel token." }, { status: 401 });

  try {
    await ensureUserRow(verified.userId);
    const dbUser = await prismadb.user.findUnique({
      where: { id: verified.userId },
      select: { isBanned: true },
    });
    if (dbUser?.isBanned) {
      return NextResponse.json({ error: "Account suspended." }, { status: 403 });
    }

    const kieApiKey = process.env.KIE_API_KEY ?? process.env.KIEAI_API_KEY;
    if (!kieApiKey) throw new Error("KIE API key not configured on server.");

    const body = await req.json() as { messages?: unknown[]; reasoning_effort?: string };
    if (!body.messages?.length) {
      return NextResponse.json({ error: "Please provide messages." }, { status: 400 });
    }

    const res = await fetch(KIE_CHAT_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${kieApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messages: body.messages,
        reasoning_effort: body.reasoning_effort ?? "high",
      }),
    });

    const json = await res.json().catch(() => null) as Record<string, unknown> | null;
    if (!res.ok) {
      const msg = (json && (json.msg || json.message)) ? String(json.msg || json.message) : `HTTP ${res.status}`;
      throw new Error(msg);
    }

    return NextResponse.json(json);
  } catch (err) {
    console.error("[panel/chat]", err);
    const msg = err instanceof Error ? err.message : "Server error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
