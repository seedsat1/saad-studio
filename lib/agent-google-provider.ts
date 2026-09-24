import { GoogleGenerativeAI, type Content, type FunctionDeclaration } from "@google/generative-ai";
import { getGoogleApiKey } from "@/lib/gemini-veo";
import type { AgentUsage } from "@/lib/agent-pricing";

export type AgentChatMessage = {
  role: "system" | "user" | "assistant" | "model" | "tool";
  content: string | Array<{ type?: string; text?: string }> | null;
};

export type AgentGoogleTool = {
  type?: string;
  function?: {
    name?: string;
    description?: string;
    parameters?: unknown;
  };
  name?: string;
  description?: string;
  parameters?: unknown;
};

export type AgentGoogleRequest = {
  model: string;
  messages: AgentChatMessage[];
  tools?: AgentGoogleTool[];
  toolChoice?: unknown;
  maxOutputTokens: number;
  responseFormat?: unknown;
};

export type AgentGoogleResponse = {
  id: string;
  text: string;
  toolCalls: Array<{ name: string; args: Record<string, unknown> }>;
  usage: AgentUsage;
  rawFinishReason: string | null;
  rawResponse: unknown;
};

let cachedClient: GoogleGenerativeAI | null = null;
let cachedKey: string | null = null;

function getClient(): GoogleGenerativeAI {
  const key = getGoogleApiKey();
  if (!key) {
    throw new Error("Google API key is not configured.");
  }
  if (!cachedClient || cachedKey !== key) {
    cachedClient = new GoogleGenerativeAI(key);
    cachedKey = key;
  }
  return cachedClient;
}

function contentToText(content: AgentChatMessage["content"]): string {
  if (typeof content === "string") return content;
  if (!Array.isArray(content)) return "";
  return content.map((part) => typeof part?.text === "string" ? part.text : "").join("\n");
}

export function splitSystemInstruction(messages: AgentChatMessage[]): {
  systemInstruction: string | undefined;
  contents: Content[];
} {
  const systemParts: string[] = [];
  const contents: Content[] = [];

  for (const message of messages) {
    const text = contentToText(message.content).trim();
    if (!text) continue;
    if (message.role === "system") {
      systemParts.push(text);
      continue;
    }
    const role = message.role === "assistant" || message.role === "model" ? "model" : "user";
    contents.push({ role, parts: [{ text }] });
  }

  return {
    systemInstruction: systemParts.length ? systemParts.join("\n\n") : undefined,
    contents,
  };
}

export function toFunctionDeclarations(tools: AgentGoogleTool[] | undefined): FunctionDeclaration[] {
  const declarations: FunctionDeclaration[] = [];
  for (const tool of tools ?? []) {
    const source = tool.function ?? tool;
    const name = source.name;
    if (!name || typeof name !== "string") continue;
    declarations.push({
      name,
      description: typeof source.description === "string" ? source.description : "",
      parameters: (source.parameters && typeof source.parameters === "object" ? source.parameters : {
        type: "object",
        properties: {},
      }) as FunctionDeclaration["parameters"],
    });
  }
  return declarations;
}

export function buildAgentGoogleModelParams(input: {
  model: string;
  messages: AgentChatMessage[];
  tools?: AgentGoogleTool[];
  responseFormat?: unknown;
  maxOutputTokens?: number;
}) {
  const { systemInstruction, contents } = splitSystemInstruction(input.messages);
  if (!contents.length) throw new Error("At least one user message is required.");
  const declarations = toFunctionDeclarations(input.tools);
  const generationConfig: Record<string, unknown> = {};
  if (input.maxOutputTokens !== undefined) {
    generationConfig.maxOutputTokens = Math.max(1, Math.floor(input.maxOutputTokens));
  }
  if (input.responseFormat) {
    generationConfig.responseMimeType = "application/json";
  }
  return {
    modelParams: {
      model: input.model,
      systemInstruction,
      tools: declarations.length ? [{ functionDeclarations: declarations }] : undefined,
      generationConfig: Object.keys(generationConfig).length ? generationConfig : undefined,
    },
    contents,
  };
}

function readUsage(response: any): AgentUsage {
  const metadata = response?.usageMetadata ?? response?.response?.usageMetadata ?? {};
  const inputTokens = Number(metadata.promptTokenCount ?? metadata.inputTokenCount ?? 0);
  const outputTokens = Number(metadata.candidatesTokenCount ?? metadata.outputTokenCount ?? 0);
  const totalTokens = Number(metadata.totalTokenCount ?? (inputTokens + outputTokens));
  if (!Number.isFinite(inputTokens) || !Number.isFinite(outputTokens) || !Number.isFinite(totalTokens)) {
    throw new Error("Google response did not include authoritative numeric usage metadata.");
  }
  if (inputTokens < 0 || outputTokens < 0 || totalTokens <= 0) {
    throw new Error("Google response usage metadata is invalid.");
  }
  return {
    inputTokens: Math.floor(inputTokens),
    outputTokens: Math.floor(outputTokens),
    totalTokens: Math.floor(totalTokens),
  };
}

export async function countAgentInputTokens(input: {
  model: string;
  messages: AgentChatMessage[];
  tools?: AgentGoogleTool[];
  responseFormat?: unknown;
}): Promise<number> {
  const client = getClient();
  const { modelParams, contents } = buildAgentGoogleModelParams(input);
  const model = client.getGenerativeModel(modelParams as any);
  const result: any = await (model as any).countTokens({ contents });
  const totalTokens = Number(result?.totalTokens ?? result?.totalTokenCount);
  if (!Number.isFinite(totalTokens) || totalTokens <= 0) {
    throw new Error("Google countTokens did not return a usable token count.");
  }
  return Math.floor(totalTokens);
}

export async function runAgentGoogleCompletion(input: AgentGoogleRequest): Promise<AgentGoogleResponse> {
  const client = getClient();
  const { modelParams, contents } = buildAgentGoogleModelParams({
    model: input.model,
    messages: input.messages,
    tools: input.tools,
    responseFormat: input.responseFormat,
    maxOutputTokens: input.maxOutputTokens,
  });
  const model = client.getGenerativeModel(modelParams as any);

  const result = await model.generateContent({ contents });
  const response: any = result.response;
  const toolCalls: Array<{ name: string; args: Record<string, unknown> }> = [];
  let text = "";

  for (const candidate of response?.candidates ?? []) {
    for (const part of candidate?.content?.parts ?? []) {
      if (typeof part?.text === "string") text += part.text;
      if (part?.functionCall?.name) {
        toolCalls.push({
          name: String(part.functionCall.name),
          args: (part.functionCall.args && typeof part.functionCall.args === "object")
            ? part.functionCall.args as Record<string, unknown>
            : {},
        });
      }
    }
  }

  return {
    id: `google-${Date.now()}`,
    text: text.trim(),
    toolCalls,
    usage: readUsage(response),
    rawFinishReason: response?.candidates?.[0]?.finishReason ?? null,
    rawResponse: response,
  };
}
