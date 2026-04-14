import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { checkRateLimit, rateLimitHeaders } from "@/lib/rate-limit";
import { fetchWithTimeout, readErrorBody } from "@/lib/http";
import {
  InsufficientCreditsError,
  rollbackGenerationCharge,
  setGenerationMediaUrl,
  spendCredits,
} from "@/lib/credit-ledger";
import { ASSIST_CHAT_CREDITS } from "@/lib/credits-config";
import {
  getClientIp,
  isAllowedOrigin,
  sanitizePlainText,
  sanitizePrompt,
} from "@/lib/security";

type ChatMessage = { role: "system" | "user" | "assistant"; content: string };
type Provider = "openai" | "wavespeed";

const PERSONA_PROMPTS: Record<string, string> = {
  general:
    "You are a helpful assistant for Saad Studio. Give clear, practical answers.",
  prompt:
    "You are a prompt engineer. Produce clean high-quality prompts for image and video generation.",
  script:
    "You are a cinematic scriptwriter. Write concise and production-ready scripts.",
  code: "You are a senior full-stack engineer. Provide robust code and short explanations.",
};

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY || "" });

function getModelConfig(modelId: string): { preferredProvider: Provider; model: string } {
  switch (modelId) {
    case "gemini-3-pro":
      return { preferredProvider: "wavespeed", model: "google/gemini-3-flash-preview" };
    case "claude-sonnet-4.6":
      return { preferredProvider: "wavespeed", model: "anthropic/claude-3.5-sonnet" };
    case "gpt-5.4":
    default:
      return { preferredProvider: "openai", model: "gpt-4o" };
  }
}

function normalizeMessages(input: unknown): ChatMessage[] {
  if (!Array.isArray(input)) return [];
  return input
    .map((m) => {
      if (!m || typeof m !== "object") return null;
      const row = m as Record<string, unknown>;
      const role = row.role;
      const content = row.content;
      if (
        (role !== "user" && role !== "assistant" && role !== "system") ||
        typeof content !== "string"
      ) {
        return null;
      }
      return {
        role,
        content: sanitizePrompt(content, 6000),
      } as ChatMessage;
    })
    .filter((m): m is ChatMessage => !!m)
    .slice(-25);
}

async function callWaveSpeed(messages: ChatMessage[], model: string): Promise<string> {
  const key = process.env.WAVESPEED_API_KEY;
  if (!key) {
    throw new Error("WaveSpeed key is not configured.");
  }

  const systemPrompt = messages.find((m) => m.role === "system")?.content ?? "";
  const prompt = messages
    .filter((m) => m.role !== "system")
    .map((m) => `${m.role === "user" ? "User" : "Assistant"}: ${m.content}`)
    .join("\n");

  const response = await fetchWithTimeout(
    "https://api.wavespeed.ai/api/v3/wavespeed-ai/any-llm",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        prompt,
        system_prompt: systemPrompt,
        enable_sync_mode: true,
        max_tokens: 2048,
        temperature: 0.8,
      }),
    },
    35000,
  );

  if (!response.ok) {
    const err = await readErrorBody(response);
    throw new Error(`WaveSpeed request failed: ${response.status} ${err}`);
  }

  const data = await response.json();
  const output =
    data?.data?.outputs?.[0] ??
    data?.outputs?.[0] ??
    data?.data?.output ??
    data?.output ??
    "";

  const text = String(output || "").trim();
  if (!text) {
    throw new Error("WaveSpeed returned an empty reply.");
  }

  return text;
}

async function callOpenAI(messages: ChatMessage[], model: string): Promise<string> {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error("OPENAI_API_KEY is not configured.");
  }

  const completion = await openai.chat.completions.create({
    model,
    messages,
    temperature: 0.8,
    max_tokens: 2048,
  });

  const text = completion.choices?.[0]?.message?.content?.trim() || "";
  if (!text) {
    throw new Error("OpenAI returned an empty reply.");
  }

  return text;
}

export async function POST(req: NextRequest) {
  let charge: { generationId: string; remainingCredits: number } | null = null;
  let chargeUserId: string | null = null;

  try {
    if (!isAllowedOrigin(req.headers.get("origin"))) {
      return NextResponse.json({ error: "Origin not allowed" }, { status: 403 });
    }

    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const ip = getClientIp(req);
    const rate = checkRateLimit(`assist:${userId}:${ip}`, 30, 60000);
    if (!rate.allowed) {
      return NextResponse.json(
        { error: "Too many requests" },
        { status: 429, headers: rateLimitHeaders(rate) },
      );
    }

    const body = await req.json();
    const modelId = typeof body?.model === "string" ? body.model : "gpt-5.4";
    const personaRaw = typeof body?.persona === "string" ? body.persona : "general";
    const persona = sanitizePlainText(personaRaw, 40);
    const messages = normalizeMessages(body?.messages);

    if (!messages.length) {
      return NextResponse.json({ error: "Messages are required" }, { status: 400 });
    }

    const latestUserPrompt =
      [...messages].reverse().find((m) => m.role === "user")?.content ?? "Assist chat request";

    charge = await spendCredits({
      userId,
      credits: ASSIST_CHAT_CREDITS,
      prompt: latestUserPrompt,
      assetType: "assist_chat",
      modelUsed: modelId,
    });
    chargeUserId = userId;

    const systemPrompt = PERSONA_PROMPTS[persona] ?? PERSONA_PROMPTS.general;
    const allMessages: ChatMessage[] = [{ role: "system", content: systemPrompt }, ...messages];

    const { preferredProvider, model } = getModelConfig(modelId);
    let content = "";

    if (preferredProvider === "wavespeed") {
      try {
        content = await callWaveSpeed(allMessages, model);
      } catch (wsErr) {
        console.warn("assist wavespeed failed; trying openai fallback", wsErr);
        content = await callOpenAI(allMessages, "gpt-4o");
      }
    } else {
      try {
        content = await callOpenAI(allMessages, model);
      } catch (openaiErr) {
        // Keep the chat usable by retrying on WaveSpeed when OpenAI fails (including quota errors).
        console.warn("assist openai failed; trying wavespeed fallback", openaiErr);
        try {
          content = await callWaveSpeed(allMessages, "google/gemini-3-flash-preview");
        } catch (wsErr) {
          const openaiMsg =
            openaiErr instanceof Error ? openaiErr.message : "OpenAI request failed";
          const waveMsg =
            wsErr instanceof Error ? wsErr.message : "WaveSpeed fallback failed";
          throw new Error(`${openaiMsg}. Fallback failed: ${waveMsg}`);
        }
      }
    }

    await setGenerationMediaUrl(charge.generationId, "text:assist");
    return NextResponse.json({ content, remainingCredits: charge.remainingCredits });
  } catch (error) {
    if (error instanceof InsufficientCreditsError) {
      return NextResponse.json(
        {
          error: "Insufficient credits",
          currentBalance: error.currentBalance,
          requiredCredits: error.requiredCredits,
        },
        { status: 402 },
      );
    }

    if (charge && chargeUserId) {
      await rollbackGenerationCharge(charge.generationId, chargeUserId, ASSIST_CHAT_CREDITS).catch(
        () => {},
      );
    }

    console.error("assist API error", error);
    const message = error instanceof Error ? error.message : "Internal error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
