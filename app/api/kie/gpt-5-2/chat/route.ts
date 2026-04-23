import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";

function getApiKey(): string {
  const key = process.env.KIE_API_KEY || process.env.KIEAI_API_KEY;
  if (!key) throw new Error("Service is not configured.");
  return key;
}

type OpenAiMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

function normalizeMessageContent(raw: unknown): string {
  if (typeof raw === "string") return raw;
  if (!Array.isArray(raw)) return "";

  const parts: string[] = [];
  for (const item of raw) {
    if (!item || typeof item !== "object") continue;
    const row = item as Record<string, unknown>;
    if (row.type === "text" && typeof row.text === "string") parts.push(row.text);
  }
  return parts.join("\n").trim();
}

function extractTextFromResponsesApi(data: unknown): string {
  if (!data || typeof data !== "object") return "";
  const root = data as Record<string, unknown>;

  const direct = root.output_text;
  if (typeof direct === "string" && direct.trim()) return direct.trim();

  const output = Array.isArray(root.output) ? root.output : [];
  for (const block of output) {
    if (!block || typeof block !== "object") continue;
    const msg = block as Record<string, unknown>;
    const content = Array.isArray(msg.content) ? msg.content : [];
    for (const part of content) {
      if (!part || typeof part !== "object") continue;
      const p = part as Record<string, unknown>;
      if ((p.type === "output_text" || p.type === "text") && typeof p.text === "string" && p.text.trim()) {
        return p.text.trim();
      }
    }
  }

  return "";
}

export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = (await req.json()) as Record<string, unknown>;
    const rawMessages = Array.isArray(body.messages) ? body.messages : [];
    const effort = body.reasoning_effort === "low" ? "low" : "high";

    const messages: OpenAiMessage[] = rawMessages
      .map((row) => {
        if (!row || typeof row !== "object") return null;
        const m = row as Record<string, unknown>;
        const role = m.role;
        if (role !== "system" && role !== "user" && role !== "assistant") return null;
        const text = normalizeMessageContent(m.content);
        if (!text) return null;
        return { role, content: text } as OpenAiMessage;
      })
      .filter((v): v is OpenAiMessage => !!v);

    if (!messages.length) {
      return NextResponse.json({ error: "messages are required" }, { status: 400 });
    }

    const input = messages.map((m) => ({
      role: m.role,
      content: [{ type: "input_text", text: m.content }],
    }));

    const upstream = await fetch("https://api.kie.ai/codex/v1/responses", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${getApiKey()}`,
      },
      body: JSON.stringify({
        model: "gpt-5-4",
        stream: false,
        input,
        reasoning: { effort },
      }),
    });

    const data = await upstream.json().catch(() => null);
    if (!upstream.ok || !data) {
      return NextResponse.json(
        { error: { message: "Request failed." } },
        { status: upstream.status || 502 },
      );
    }

    const text = extractTextFromResponsesApi(data);
    if (!text) {
      return NextResponse.json(
        { error: { message: "No response text returned." } },
        { status: 502 },
      );
    }

    return NextResponse.json({
      id: `chatcmpl_${Date.now()}`,
      object: "chat.completion",
      choices: [
        {
          index: 0,
          finish_reason: "stop",
          message: {
            role: "assistant",
            content: text,
          },
        },
      ],
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal error";
    return NextResponse.json({ error: { message } }, { status: 500 });
  }
}
