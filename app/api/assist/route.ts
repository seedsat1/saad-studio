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
    "You are a helpful assistant for Saad Studio. Give clear, practical answers." +
    PLAIN_TEXT_RULE,
  prompt:
    "You are a prompt engineer. Produce clean high-quality prompts for image and video generation." +
    PLAIN_TEXT_RULE,
  script:
    "You are a cinematic scriptwriter. Write concise and production-ready scripts." +
    PLAIN_TEXT_RULE,
  code:
    "You are a senior full-stack engineer. Provide robust code and short explanations." +
    PLAIN_TEXT_RULE,
};

function getKieKey(): string {
  const key = process.env.KIE_API_KEY || process.env.KIEAI_API_KEY;
  if (!key) throw new Error("KIE_API_KEY is not configured.");
  return key;
}

/** GPT-5.4 — KIE Responses API: POST /codex/v1/responses */
async function callGpt54(messages: ChatMessage[], key: string): Promise<string> {
  const systemMsg = messages.find((m) => m.role === "system");
  const chatMsgs = messages.filter((m) => m.role !== "system");

  const input: unknown[] = [];
  if (systemMsg) {
    input.push({ role: "system", content: [{ type: "input_text", text: systemMsg.content }] });
  }
  for (const m of chatMsgs) {
    input.push({ role: m.role, content: [{ type: "input_text", text: m.content }] });
  }

  const res = await fetchWithTimeout(
    "https://api.kie.ai/codex/v1/responses",
    {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({ model: "gpt-5-4", stream: false, input }),
    },
    40000,
  );
  if (!res.ok) throw new Error(`KIE GPT-5.4 ${res.status}: ${await readErrorBody(res)}`);
  const data = await res.json();
  type OutputBlock = { type: string; content?: { type: string; text: string }[] };
  const msgBlock = (data?.output as OutputBlock[] | undefined)?.find((o) => o.type === "message");
  const text = msgBlock?.content?.find((c) => c.type === "output_text")?.text ?? "";
  if (!text) throw new Error("KIE GPT-5.4 returned an empty reply.");
  return text.trim();
}

/** Claude Sonnet 4.6 — KIE Anthropic format: POST /claude/v1/messages */
async function callClaude(messages: ChatMessage[], key: string): Promise<string> {
  const systemMsg = messages.find((m) => m.role === "system");
  const chatMsgs = messages
    .filter((m) => m.role !== "system")
    .map((m) => ({ role: m.role, content: m.content }));

  const body: Record<string, unknown> = {
    model: "claude-sonnet-4-6",
    stream: false,
    max_tokens: 2048,
    messages: chatMsgs,
  };
  if (systemMsg) body.system = systemMsg.content;

  const res = await fetchWithTimeout(
    "https://api.kie.ai/claude/v1/messages",
    {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify(body),
    },
    40000,
  );
  if (!res.ok) throw new Error(`KIE Claude ${res.status}: ${await readErrorBody(res)}`);
  const data = await res.json();
  type ContentBlock = { type: string; text?: string };
  const textBlock = (data?.content as ContentBlock[] | undefined)?.find((c) => c.type === "text");
  const text = textBlock?.text ?? "";
  if (!text) throw new Error("KIE Claude returned an empty reply.");
  return text.trim();
}

/** Gemini 3 Pro — KIE OpenAI chat completions: POST /gemini-3-pro/v1/chat/completions */
async function callGemini(messages: ChatMessage[], key: string): Promise<string> {
  const res = await fetchWithTimeout(
    "https://api.kie.ai/gemini-3-pro/v1/chat/completions",
    {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        messages: messages.map((m) => ({ role: m.role, content: m.content })),
        stream: false,
        max_tokens: 2048,
      }),
    },
    40000,
  );
  if (!res.ok) throw new Error(`KIE Gemini ${res.status}: ${await readErrorBody(res)}`);
  const data = await res.json();
  const text = data?.choices?.[0]?.message?.content ?? "";
  if (!text) throw new Error("KIE Gemini returned an empty reply.");
  return String(text).trim();
}

async function callKie(messages: ChatMessage[], modelId: string): Promise<string> {
  const key = getKieKey();
  if (modelId === "gpt-5.4") return callGpt54(messages, key);
  if (modelId === "claude-sonnet-4.6") return callClaude(messages, key);
  return callGemini(messages, key); // gemini-3-pro + default
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
      return { role, content: sanitizePrompt(content, 6000) } as ChatMessage;
    })
    .filter((m): m is ChatMessage => !!m)
    .slice(-25);
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
      prompt:
        typeof messages[messages.length - 1]?.content === "string"
          ? messages[messages.length - 1].content.slice(0, 500)
          : "Assist chat",
      assetType: "TEXT",
      modelUsed: `assist/${modelId}`,
    });

    const content = await callKie(allMessages, modelId);
    return NextResponse.json({ content });
  } catch (error) {
    if (error instanceof InsufficientCreditsError) {
      return NextResponse.json(
        {
          error: "Insufficient credits. Please top up your balance.",
          requiredCredits: error.requiredCredits,
          currentBalance: error.currentBalance,
        },
        { status: 402 },
      );
    }
    console.error("assist API error", error);
    const message = error instanceof Error ? error.message : "Internal error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}