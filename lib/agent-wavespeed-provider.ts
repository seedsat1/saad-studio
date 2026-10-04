import type { AgentUsage } from "@/lib/agent-pricing";
import type { AgentChatMessage, AgentGoogleTool } from "@/lib/agent-google-provider";

export type AgentWaveSpeedRequest = {
  model: string;
  messages: AgentChatMessage[];
  tools?: AgentGoogleTool[];
  toolChoice?: unknown;
  maxOutputTokens: number;
  responseFormat?: unknown;
};

export type AgentWaveSpeedResponse = {
  id: string;
  text: string;
  toolCalls: Array<{ name: string; args: Record<string, unknown> }>;
  usage: AgentUsage;
  rawFinishReason: string | null;
  rawResponse: unknown;
};

function getWaveSpeedApiKey(): string | null {
  return process.env.WAVESPEED_API_KEY?.trim() || null;
}

function contentToText(content: AgentChatMessage["content"]): string {
  if (typeof content === "string") return content;
  if (!Array.isArray(content)) return "";
  return content.map((part) => typeof part?.text === "string" ? part.text : "").join("\n");
}

function toOpenAiMessages(messages: AgentChatMessage[]) {
  return messages
    .map((message) => {
      const content = contentToText(message.content);
      if (!content.trim()) return null;
      const role = message.role === "model" ? "assistant" : message.role;
      return { role, content };
    })
    .filter(Boolean);
}

function toOpenAiTools(tools: AgentGoogleTool[] | undefined) {
  const out: Array<{ type: "function"; function: { name: string; description?: string; parameters?: unknown } }> = [];
  for (const tool of tools ?? []) {
    const source = tool.function ?? tool;
    if (!source.name || typeof source.name !== "string") continue;
    out.push({
      type: "function",
      function: {
        name: source.name,
        description: typeof source.description === "string" ? source.description : undefined,
        parameters: source.parameters && typeof source.parameters === "object"
          ? source.parameters
          : { type: "object", properties: {} },
      },
    });
  }
  return out;
}

function parseToolArgs(value: unknown): Record<string, unknown> {
  if (!value) return {};
  if (typeof value === "object" && !Array.isArray(value)) return value as Record<string, unknown>;
  if (typeof value !== "string") return {};
  try {
    const parsed = JSON.parse(value) as unknown;
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed as Record<string, unknown> : {};
  } catch {
    return {};
  }
}

function readUsage(response: any): AgentUsage {
  const usage = response?.usage ?? {};
  const inputTokens = Number(usage.prompt_tokens ?? usage.input_tokens ?? 0);
  const outputTokens = Number(usage.completion_tokens ?? usage.output_tokens ?? 0);
  const totalTokens = Number(usage.total_tokens ?? (inputTokens + outputTokens));
  if (!Number.isFinite(inputTokens) || !Number.isFinite(outputTokens) || !Number.isFinite(totalTokens)) {
    throw new Error("WaveSpeed response did not include authoritative numeric usage metadata.");
  }
  if (inputTokens < 0 || outputTokens < 0 || totalTokens <= 0) {
    throw new Error("WaveSpeed response usage metadata is invalid.");
  }
  return {
    inputTokens: Math.floor(inputTokens),
    outputTokens: Math.floor(outputTokens),
    totalTokens: Math.floor(totalTokens),
  };
}

export function estimateWaveSpeedInputTokens(input: {
  messages: AgentChatMessage[];
  tools?: AgentGoogleTool[];
  responseFormat?: unknown;
}): number {
  const payload = JSON.stringify({
    messages: toOpenAiMessages(input.messages),
    tools: toOpenAiTools(input.tools),
    responseFormat: input.responseFormat ?? null,
  });
  return Math.max(1, Math.ceil(payload.length / 3) + 256);
}

export async function runAgentWaveSpeedCompletion(input: AgentWaveSpeedRequest): Promise<AgentWaveSpeedResponse> {
  const apiKey = getWaveSpeedApiKey();
  if (!apiKey) throw new Error("WaveSpeed API key is not configured.");

  const messages = toOpenAiMessages(input.messages);
  if (!messages.length) throw new Error("At least one user message is required.");
  const tools = toOpenAiTools(input.tools);
  const payload: Record<string, unknown> = {
    model: input.model,
    messages,
    max_tokens: Math.max(1, Math.floor(input.maxOutputTokens)),
  };
  if (tools.length) payload.tools = tools;
  if (input.toolChoice) payload.tool_choice = input.toolChoice;
  if (input.responseFormat) payload.response_format = { type: "json_object" };

  const response = await fetch("https://llm.wavespeed.ai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  const raw = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message = typeof raw?.error?.message === "string"
      ? raw.error.message
      : `WaveSpeed chat completion failed (${response.status}).`;
    throw new Error(message);
  }

  const choice = raw?.choices?.[0] ?? {};
  const message = choice?.message ?? {};
  const toolCalls = Array.isArray(message.tool_calls)
    ? message.tool_calls.map((call: any) => ({
      name: String(call?.function?.name ?? call?.name ?? ""),
      args: parseToolArgs(call?.function?.arguments ?? call?.arguments),
    })).filter((call: { name: string }) => call.name)
    : [];

  return {
    id: typeof raw?.id === "string" ? raw.id : `wavespeed-${Date.now()}`,
    text: typeof message.content === "string" ? message.content.trim() : "",
    toolCalls,
    usage: readUsage(raw),
    rawFinishReason: typeof choice?.finish_reason === "string" ? choice.finish_reason : null,
    rawResponse: raw,
  };
}
