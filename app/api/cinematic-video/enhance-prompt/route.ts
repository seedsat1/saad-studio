// ============================================================
// FILE: app/api/cinematic-video/enhance-prompt/route.ts
// DESCRIPTION: Uses Gemini Flash to rewrite a short user prompt
//   into a richer cinematic direction (camera moves, lighting,
//   lens, mood, dialogue formatting). Cheap and fast — the
//   user's "Magic Wand" button.
// AUTH: Clerk user
// ============================================================

import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { checkRateLimit, rateLimitHeaders } from "@/lib/rate-limit";
import { getClientIp, isAllowedOrigin, sanitizePrompt } from "@/lib/security";
import { getGenAI } from "@/lib/gemini-veo";

export const runtime = "nodejs";
export const maxDuration = 30;

const SYSTEM = `You are a senior cinematographer rewriting prompts for a text-to-video model (Google Veo 3.1).

Rewrite the user's prompt into a single vivid paragraph (60–120 words) that includes:
- Camera (lens, angle, movement: dolly / pan / push-in / handheld)
- Lighting (key, fill, mood: golden hour / neon / volumetric / hard shadows)
- Subject staging and action
- Atmosphere and ambient sound cues
- If the original prompt has dialogue, KEEP IT verbatim inside double quotes

Output ONLY the rewritten prompt. No preamble, no labels, no markdown, no lists.`;

interface RequestBody {
  prompt?: string;
}

export async function POST(req: Request) {
  try {
    if (!isAllowedOrigin(req.headers.get("origin"))) {
      return new NextResponse("Origin not allowed", { status: 403 });
    }
    const { userId } = await auth();
    if (!userId) return new NextResponse("Unauthorized", { status: 401 });

    const ip = getClientIp(req);
    const rate = checkRateLimit(`enhance-prompt:${userId}:${ip}`, 30, 60_000);
    if (!rate.allowed) {
      return new NextResponse("Too many requests", {
        status: 429,
        headers: rateLimitHeaders(rate),
      });
    }

    const raw = (await req.json().catch(() => null)) as RequestBody | null;
    const prompt = sanitizePrompt(typeof raw?.prompt === "string" ? raw.prompt : "");
    if (!prompt || prompt.length < 3) {
      return NextResponse.json(
        { error: "Prompt too short" },
        { status: 400 },
      );
    }

    const ai = getGenAI();
    const response: any = await (ai.models as any).generateContent({
      model: "gemini-2.5-flash",
      contents: [
        {
          role: "user",
          parts: [{ text: `${SYSTEM}\n\nUSER PROMPT:\n${prompt}` }],
        },
      ],
      config: {
        temperature: 0.85,
        maxOutputTokens: 400,
      },
    });

    const text: string =
      response?.text ??
      response?.candidates?.[0]?.content?.parts?.[0]?.text ??
      "";

    if (!text.trim()) {
      return NextResponse.json(
        { error: "Empty response from Gemini" },
        { status: 502 },
      );
    }

    return NextResponse.json({ enhanced: text.trim() });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Internal error";
    console.error("[enhance-prompt] error:", err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
