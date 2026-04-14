import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { spendCredits, InsufficientCreditsError } from "@/lib/credit-ledger";
import { ASSIST_CHAT_CREDITS } from "@/lib/credits-config";
import { checkRateLimit, rateLimitHeaders } from "@/lib/rate-limit";
import { fetchWithTimeout, readErrorBody } from "@/lib/http";
import {
  getClientIp,
  isAllowedOrigin,
  sanitizePlainText,
  sanitizePrompt,
} from "@/lib/security";

type ChatMessage = { role: "system" | "user" | "assistant"; content: string };

const PLAIN_TEXT_RULE =
  " Always respond in plain text only. Do NOT use markdown formatting — no asterisks, no bold, no italics, no headers, no bullet symbols, no backticks, no code blocks. Write naturally as if typing a message.";

const PERSONA_PROMPTS: Record<string, string> = {
  general:
    "You are a helpful assistant for Saad Studio. Give clear, practical answers." + PLAIN_TEXT_RULE,
  prompt:
    "You are a prompt engineer. Produce clean high-quality prompts for image and video generation." + PLAIN_TEXT_RULE,
  script:
    "You are a cinematic scriptwriter. Write concise and production-ready scripts." + PLAIN_TEXT_RULE,
  code:
    "You are a senior full-stack engineer. Provide robust code and short explanations." + PLAIN_TEXT_RULE,
};

const WAVESPEED_MODEL_MAP: Record<string, string> = {
  "gpt-5.4":           "openai/gpt-4o",
  "claude-sonnet-4.6": "anthropic/claude-3.5-sonnet",
  "gemini-3-pro":      "google/gemini-2.0-flash",
};

function getWavespeedModel(modelId: string): string {
  return WAVESPEED_MODEL_MAP[modelId] ?? "openai/gpt-4o";
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
  if (!key) throw new Error("WAVESPEED_API_KEY is not configured.");

  const systemPrompt = messages.find((m) => m.role === "system")?.content ?? "";
  const conversationMessages = messages.filter((m) => m.role !== "system");
  const prompt = conversationMessages
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
    throw new Error(`WaveSpeed error ${response.status}: ${err}`);
  }

  const data = await response.json();
  const output =
    data?.data?.outputs?.[0] ??
    data?.outputs?.[0] ??
    data?.data?.output ??
    data?.output ??
    "";

  const text = String(output || "").trim();
  if (!text) throw new Error("WaveSpeed returned an empty reply.");
  return text;
}

export async function POST(req: NextRequest) {
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

    const systemPrompt = PERSONA_PROMPTS[persona] ?? PERSONA_PROMPTS.general;
    const allMessages: ChatMessage[] = [{ role: "system", content: systemPrompt }, ...messages];

    await spendCredits({
      userId,
      credits: ASSIST_CHAT_CREDITS,
      prompt: typeof messages[messages.length - 1]?.content === "string"
        ? messages[messages.length - 1].content.slice(0, 500)
        : "Assist chat",
      assetType: "TEXT",
      modelUsed: `assist/${modelId}`,
    });

    const wsModel = getWavespeedModel(modelId);
    const content = await callWaveSpeed(allMessages, wsModel);

    return NextResponse.json({ content });
  } catch (error) {
    if (error instanceof InsufficientCreditsError) {
      return NextResponse.json(
        { error: "Insufficient credits. Please top up your balance.", requiredCredits: error.requiredCredits, currentBalance: error.currentBalance },
        { status: 402 },
      );
    }
    console.error("assist API error", error);
    const message = error instanceof Error ? error.message : "Internal error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}