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
    console.log("[CHAT_API] Incoming request for userId:", verified.userId, "isBanned:", dbUser?.isBanned);
    if (dbUser?.isBanned) {
      return NextResponse.json({ error: "Account suspended." }, { status: 403 });
    }

    const wavespeedKey = process.env.WAVESPEED_API_KEY;
    if (!wavespeedKey) throw new Error("WaveSpeed API key not configured on server.");

    const body = await req.json() as { messages?: unknown[] };
    if (!body.messages?.length) {
      return NextResponse.json({ error: "Please provide messages." }, { status: 400 });
    }

    // Format OpenAI messages array into a single prompt for WaveSpeed any-llm
    const formattedMessages = (body.messages as { role: string; content: string }[]).map((m) => {
      if (m.role === "system") return `System: ${m.content}`;
      if (m.role === "user") return `User: ${m.content}`;
      return `Assistant: ${m.content}`;
    });
    const prompt = formattedMessages.join("\n\n") + "\n\nAssistant:";

    const res = await fetch("https://api.wavespeed.ai/api/v3/wavespeed-ai/any-llm", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${wavespeedKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "anthropic/claude-3-5-sonnet",
        prompt: prompt,
        enable_sync_mode: true,
      }),
    });

    const json = await res.json().catch(() => null) as any;
    if (!res.ok || json?.code !== 200) {
      const msg = json?.message || json?.msg || `HTTP ${res.status}`;
      throw new Error(msg);
    }

    const textOutput = json?.data?.outputs?.[0] || "";

    // Return in standard OpenAI chat completions shape for the client
    return NextResponse.json({
      choices: [
        {
          message: {
            content: textOutput,
          },
        },
      ],
    });
  } catch (err) {
    console.error("[panel/chat]", err);
    const msg = err instanceof Error ? err.message : "Server error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
