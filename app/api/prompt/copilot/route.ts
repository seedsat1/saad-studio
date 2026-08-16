// ============================================================
// FILE: app/api/prompt/copilot/route.ts
// DESCRIPTION: AI Prompt Copilot endpoint for Saad Studio Prompt Editor.
//   Supports:
//   - "enhance": Rewrites/enriches prompt with lighting, camera moves, and textures.
//   - "random": Generates a creative high-fidelity prompt from scratch.
//   - "chat": Refines the prompt based on a specific user instruction.
// AUTH: Clerk user
// ============================================================

import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { checkRateLimit, rateLimitHeaders } from "@/lib/rate-limit";
import { getClientIp, isAllowedOrigin, sanitizePrompt } from "@/lib/security";
import { getGenAI } from "@/lib/gemini-veo";
import { fetchWithTimeout } from "@/lib/http";

export const runtime = "nodejs";
export const maxDuration = 30;

interface RequestBody {
  prompt?: string;
  mode?: "enhance" | "random" | "chat";
  instruction?: string;
  type?: "video" | "image";
}

const SYSTEM_PROMPTS = {
  video: `You are an elite Hollywood cinematographer and AI video prompt director for cutting-edge generative video models (such as Kling 3.0, Veo 3.1, Seedance 2.5, and Minimax Hailuo).
Your goal is to output pristine, vivid, and highly descriptive prompts that produce breathtaking motion pictures.
Focus on:
- Subject action, dynamic staging, and movement speed.
- Camera work: lens focal length (e.g. 35mm anamorphic, 85mm portrait), camera motion (dolly-in, orbiting arc, sweeping crane, fpv drone, steadicam follow).
- Cinematic Lighting & Atmosphere: volumetric rays, golden hour, neon rim light, chiaroscuro, rain haze, ambient particle reflections.
- Visual texture, photorealism, and 8k hyper-detail.
- If the original prompt includes dialogue inside double quotes, preserve it verbatim.

Rules:
1. Always output ONLY the final refined prompt in plain English or the user's intended language.
2. Never include meta-commentary, markdown headlines, bullet points, quotes at start/end, or phrases like "Here is your prompt:".`,

  image: `You are an elite commercial art director and prompt engineer for state-of-the-art image generation models (Midjourney v6, Flux.1 Pro, Google Imagen 3, Stable Diffusion XL).
Your goal is to craft high-impact, award-winning visual descriptions.
Focus on:
- Composition, focal point, aspect, and perspective (e.g. wide-angle low shot, extreme macro, centered symmetrical framing).
- Color grading, palette, lighting setup (Rembrandt lighting, dual-tone studio strobes, diffused natural overcast, bioluminescent glow).
- Materials, skin textures, micro-details, octane render aesthetics, raytraced reflections.

Rules:
1. Always output ONLY the final refined prompt in plain English or the user's intended language.
2. Never include meta-commentary, markdown headlines, bullet points, quotes at start/end, or phrases like "Here is your prompt:".`,
};

function getKieKey(): string | null {
  return process.env.KIE_API_KEY || process.env.KIEAI_API_KEY || null;
}

async function callKieFallback(systemPrompt: string, userInstruction: string): Promise<string> {
  const key = getKieKey();
  if (!key) throw new Error("No fallback AI key available");

  const res = await fetchWithTimeout("https://api.kie.ai/gemini-3-pro/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${key}`,
    },
    body: JSON.stringify({
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userInstruction },
      ],
      temperature: 0.8,
      max_tokens: 500,
    }),
  }, 15_000);

  if (!res.ok) throw new Error(`KIE fallback failed (${res.status})`);
  const data = await res.json();
  return (data?.choices?.[0]?.message?.content ?? "").trim();
}

export async function POST(req: Request) {
  try {
    if (!isAllowedOrigin(req.headers.get("origin"))) {
      return new NextResponse("Origin not allowed", { status: 403 });
    }
    const { userId } = await auth();
    if (!userId) return new NextResponse("Unauthorized", { status: 401 });

    const ip = getClientIp(req);
    const rate = checkRateLimit(`prompt-copilot:${userId}:${ip}`, 45, 60_000);
    if (!rate.allowed) {
      return new NextResponse("Too many requests", {
        status: 429,
        headers: rateLimitHeaders(rate),
      });
    }

    const body = (await req.json().catch(() => null)) as RequestBody | null;
    const mode = body?.mode || "enhance";
    const mediaType = body?.type === "image" ? "image" : "video";
    const prompt = sanitizePrompt(typeof body?.prompt === "string" ? body.prompt : "");
    const instruction = sanitizePrompt(typeof body?.instruction === "string" ? body.instruction : "");

    const systemPrompt = SYSTEM_PROMPTS[mediaType];
    let userMessage = "";

    if (mode === "random") {
      userMessage = `Generate a brand new, wildly creative, and visually stunning ${mediaType} prompt for a trending viral cinematic visual. Choose a compelling genre (Sci-fi, High Fantasy, Cyberpunk, Neo-noir, Wildlife Macro, Luxury Editorial, or Surrealist Architecture).`;
    } else if (mode === "chat") {
      if (!instruction) {
        return NextResponse.json({ error: "Instruction required for chat mode" }, { status: 400 });
      }
      userMessage = `Current Prompt:
"${prompt || "Empty"}"

User Request / Refinement:
"${instruction}"

Incorporate the user's request into the prompt while maintaining professional ${mediaType} prompt structure, lighting, and detail. Output ONLY the updated prompt.`;
    } else {
      // mode === "enhance"
      if (!prompt || prompt.length < 2) {
        return NextResponse.json(
          { error: "Please enter a prompt to enhance" },
          { status: 400 }
        );
      }
      userMessage = `Rewrite and enhance the following ${mediaType} prompt to make it deeply cinematic, professional, and visually rich:

"${prompt}"`;
    }

    let output = "";

    // Primary: Google Gemini Flash via getGenAI
    try {
      const ai = getGenAI();
      const response: any = await (ai.models as any).generateContent({
        model: "gemini-2.5-flash",
        contents: [
          {
            role: "user",
            parts: [{ text: `${systemPrompt}\n\n${userMessage}` }],
          },
        ],
        config: {
          temperature: mode === "random" ? 0.95 : 0.8,
          maxOutputTokens: 500,
        },
      });

      output =
        response?.text ??
        response?.candidates?.[0]?.content?.parts?.[0]?.text ??
        "";
    } catch (geminiErr) {
      console.warn("[prompt-copilot] Gemini primary failed, attempting KIE fallback:", geminiErr);
      try {
        output = await callKieFallback(systemPrompt, userMessage);
      } catch (fallbackErr) {
        console.error("[prompt-copilot] Both Gemini and KIE fallback failed:", fallbackErr);
        throw geminiErr;
      }
    }

    // Clean up any extraneous quotes or formatting
    let cleaned = output.trim();
    if (cleaned.startsWith('"') && cleaned.endsWith('"') && cleaned.length > 2) {
      cleaned = cleaned.slice(1, -1).trim();
    }
    if (cleaned.startsWith("```") && cleaned.endsWith("```")) {
      cleaned = cleaned.replace(/^```[a-z]*\n?/i, "").replace(/\n?```$/, "").trim();
    }

    if (!cleaned) {
      return NextResponse.json({ error: "No response generated" }, { status: 502 });
    }

    return NextResponse.json({
      result: cleaned,
      mode,
      mediaType,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Internal error";
    console.error("[prompt-copilot] error:", err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
