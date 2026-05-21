import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { getGenAI } from "@/lib/gemini-veo";
import { checkRateLimit, rateLimitHeaders } from "@/lib/rate-limit";
import { getClientIp, isAllowedOrigin, sanitizePrompt } from "@/lib/security";
import {
  generateProceduralCinemaScene,
  normalizeCinemaRender,
  type CinemaRenderInput,
} from "@/lib/cinema-studio-vso";

export const runtime = "nodejs";
export const maxDuration = 45;

const SYSTEM = `You are Saad Studio's cinema director engine.
Create a practical cinematic scene plan for a visual preview tool.
Return JSON only. No markdown. No explanation.
The plan must include title, directorNotes, moodColor, accentColor, particlesType, and one or more scenes.
Each scene must include visualDescription, dialogue, subtitles with start/end seconds, lensType, cameraMovement, soundEffects, and visualLayout.
Keep subtitle timings inside 0 to 8 seconds.`;

function extractText(response: any): string {
  return String(
    response?.text ??
    response?.candidates?.[0]?.content?.parts?.[0]?.text ??
    "",
  ).trim();
}

function parseJsonObject(text: string): unknown {
  const trimmed = text.trim();
  if (!trimmed) return null;
  try {
    return JSON.parse(trimmed);
  } catch {
    const match = trimmed.match(/\{[\s\S]*\}/);
    if (!match) return null;
    return JSON.parse(match[0]);
  }
}

export async function POST(req: Request) {
  try {
    if (!isAllowedOrigin(req.headers.get("origin"))) {
      return new NextResponse("Origin not allowed", { status: 403 });
    }

    const { userId } = await auth();
    if (!userId) return new NextResponse("Unauthorized", { status: 401 });

    const ip = getClientIp(req);
    const rate = checkRateLimit(`cinema-studio-vso:${userId}:${ip}`, 20, 60_000);
    if (!rate.allowed) {
      return new NextResponse("Too many requests", {
        status: 429,
        headers: rateLimitHeaders(rate),
      });
    }

    const raw = (await req.json().catch(() => null)) as Partial<CinemaRenderInput> | null;
    const prompt = sanitizePrompt(typeof raw?.prompt === "string" ? raw.prompt : "");
    if (!prompt || prompt.length < 4) {
      return NextResponse.json({ error: "Description prompt is required." }, { status: 400 });
    }

    const input: CinemaRenderInput = {
      prompt,
      dialogueText: sanitizePrompt(typeof raw?.dialogueText === "string" ? raw.dialogueText : "").slice(0, 1200),
      cameraMovement: sanitizePrompt(typeof raw?.cameraMovement === "string" ? raw.cameraMovement : "Dolly Zoom").slice(0, 160),
      lensType: sanitizePrompt(typeof raw?.lensType === "string" ? raw.lensType : "85mm Anamorphic Cinema").slice(0, 160),
      voiceId: sanitizePrompt(typeof raw?.voiceId === "string" ? raw.voiceId : "").slice(0, 120),
    };

    let data = generateProceduralCinemaScene(input);

    try {
      const ai = getGenAI();
      const response: any = await (ai.models as any).generateContent({
        model: "gemini-2.5-flash",
        contents: [
          {
            role: "user",
            parts: [
              {
                text: `${SYSTEM}

Prompt:
${input.prompt}

Dialogue:
${input.dialogueText || "(none)"}

Camera movement:
${input.cameraMovement}

Lens:
${input.lensType}

Voice reference:
${input.voiceId || "(default)"}`,
              },
            ],
          },
        ],
        config: {
          temperature: 0.75,
          maxOutputTokens: 1800,
          responseMimeType: "application/json",
        },
      });

      const text = extractText(response);
      const parsed = parseJsonObject(text);
      data = normalizeCinemaRender(parsed, input);
    } catch (err) {
      console.error("[cinema-studio-vso] Gemini render fallback:", err);
    }

    return NextResponse.json({
      success: true,
      generationId: `cin_${Date.now().toString(36)}`,
      status: "COMPLETED",
      progress: 100,
      data,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Internal Server Error rendering cinema scene";
    console.error("[cinema-studio-vso] render error:", err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
