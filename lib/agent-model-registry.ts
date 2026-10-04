/** Agent brains are a separate catalog, never DynamicImageModel/DynamicVideoModel. */
export type AgentModelTier = "economy" | "main" | "advanced";
export type AgentRuntimeStatus = "ready" | "disabled" | "not_configured" | "pricing_unverified";
export type AgentModelProvider = "google" | "wavespeed";

export type AgentModelDefinition = {
  id: string;
  displayName: string;
  category: "agent_llm";
  provider: AgentModelProvider;
  tier: AgentModelTier;
  role: AgentModelTier;
  roleLabel: string;
  release: "stable";
  enabled: boolean;
  runtimeStatus: AgentRuntimeStatus;
  autoSelectable: boolean;
  manualSelectable: boolean;
  isDefault: boolean;
  registrationStatus: "registered";
  capabilities: {
    chat: boolean;
    reasoning: boolean;
    functionCalling: boolean;
    structuredOutput: boolean;
    streaming: boolean;
  };
  inputTokenLimit: number;
  outputTokenLimit: number;
  maxCreditsPerRequest?: number;
  pricing: {
    currency: "USD";
    unit: "per_million_tokens";
    serviceTier: "standard";
    inputModality: "text";
    outputIncludesThinking: true;
    markupMultiplier: 1.4;
    sourceUrl: string;
    verified: boolean;
    verifiedAt: string;
    periods: AgentPricePeriod[];
  };
  documentationUrl: string;
  verifiedAt: string;
};

export type AgentPricePeriod = {
  effectiveFrom: string;
  effectiveUntil: string | null;
  tiers: Array<{
    /** The tier applies to the whole request, selected by total input tokens. */
    maxInputTokens: number | null;
    inputUsd: number;
    outputUsd: number;
  }>;
};

const googleCommon = {
  category: "agent_llm" as const,
  provider: "google" as const,
  registrationStatus: "registered" as const,
  release: "stable" as const,
  enabled: true,
  runtimeStatus: "ready" as const,
  capabilities: {
    chat: true,
    reasoning: true,
    functionCalling: true,
    structuredOutput: true,
    streaming: true,
  },
  inputTokenLimit: 1_048_576,
  outputTokenLimit: 65_536,
  verifiedAt: "2026-09-24",
};

const googlePricing = {
  currency: "USD" as const,
  unit: "per_million_tokens" as const,
  serviceTier: "standard" as const,
  inputModality: "text" as const,
  outputIncludesThinking: true as const,
  markupMultiplier: 1.4 as const,
  sourceUrl: "https://ai.google.dev/gemini-api/docs/pricing",
  verified: true,
  verifiedAt: "2026-09-24",
};

const wavespeedCommon = {
  category: "agent_llm" as const,
  provider: "wavespeed" as const,
  registrationStatus: "registered" as const,
  release: "stable" as const,
  enabled: true,
  runtimeStatus: "ready" as const,
  autoSelectable: false,
  manualSelectable: true,
  isDefault: false,
  tier: "economy" as const,
  role: "economy" as const,
  roleLabel: "Economy WaveSpeed Cloud Agent",
  capabilities: {
    chat: true,
    reasoning: true,
    functionCalling: true,
    structuredOutput: true,
    streaming: false,
  },
  verifiedAt: "2026-09-26",
};

function wavespeedPricing(sourceUrl: string, inputUsd: number, outputUsd: number) {
  return {
    currency: "USD" as const,
    unit: "per_million_tokens" as const,
    serviceTier: "standard" as const,
    inputModality: "text" as const,
    outputIncludesThinking: true as const,
    markupMultiplier: 1.4 as const,
    sourceUrl,
    verified: true,
    verifiedAt: "2026-09-26",
    periods: [{
      effectiveFrom: "2026-09-26",
      effectiveUntil: null,
      tiers: [{ maxInputTokens: null, inputUsd, outputUsd }],
    }],
  };
}

const AGENT_MODELS: AgentModelDefinition[] = [
  {
    ...googleCommon,
    id: "gemini-2.5-flash-lite",
    displayName: "Gemini 2.5 Flash-Lite",
    tier: "economy",
    role: "economy",
    roleLabel: "Economy Cloud Agent",
    autoSelectable: true,
    manualSelectable: true,
    isDefault: false,
    documentationUrl: "https://ai.google.dev/gemini-api/docs/models/gemini-2.5-flash-lite",
    pricing: { ...googlePricing, periods: [{
      effectiveFrom: "2026-09-24",
      effectiveUntil: null,
      tiers: [{ maxInputTokens: null, inputUsd: 0.10, outputUsd: 0.40 }],
    }] },
  },
  {
    ...googleCommon,
    id: "gemini-2.5-flash",
    displayName: "Gemini 2.5 Flash",
    tier: "main",
    role: "main",
    roleLabel: "Main / Default Cloud Agent",
    autoSelectable: true,
    manualSelectable: true,
    isDefault: true,
    documentationUrl: "https://ai.google.dev/gemini-api/docs/models/gemini-2.5-flash",
    pricing: { ...googlePricing, periods: [{
      effectiveFrom: "2026-09-24",
      effectiveUntil: null,
      tiers: [{ maxInputTokens: null, inputUsd: 0.30, outputUsd: 2.50 }],
    }] },
  },
  {
    ...googleCommon,
    id: "gemini-2.5-pro",
    displayName: "Gemini 2.5 Pro",
    tier: "advanced",
    role: "advanced",
    roleLabel: "Advanced Cloud Agent",
    autoSelectable: false,
    manualSelectable: true,
    isDefault: false,
    documentationUrl: "https://ai.google.dev/gemini-api/docs/models/gemini-2.5-pro",
    pricing: { ...googlePricing, periods: [{
      effectiveFrom: "2026-09-24",
      effectiveUntil: null,
      tiers: [
        { maxInputTokens: 200_000, inputUsd: 1.25, outputUsd: 10 },
        { maxInputTokens: null, inputUsd: 2.50, outputUsd: 15 },
      ],
    }] },
  },
  {
    ...wavespeedCommon,
    id: "mistralai/mistral-nemo",
    displayName: "Mistral Nemo",
    inputTokenLimit: 131_072,
    outputTokenLimit: 16_384,
    capabilities: { ...wavespeedCommon.capabilities, structuredOutput: false },
    documentationUrl: "https://wavespeed.ai/llm/mistralai/mistral-nemo",
    pricing: wavespeedPricing("https://wavespeed.ai/llm/mistralai/mistral-nemo", 0.019, 0.05),
  },
  {
    ...wavespeedCommon,
    id: "qwen/qwen3.7-flash",
    displayName: "Qwen 3.7 Flash",
    inputTokenLimit: 1_000_000,
    outputTokenLimit: 65_536,
    documentationUrl: "https://wavespeed.ai/llm/qwen/qwen3.7-flash",
    pricing: wavespeedPricing("https://wavespeed.ai/llm/qwen/qwen3.7-flash", 0.03, 0.13),
  },
  {
    ...wavespeedCommon,
    id: "openai/gpt-oss-120b",
    displayName: "GPT OSS 120B",
    inputTokenLimit: 131_072,
    outputTokenLimit: 131_072,
    documentationUrl: "https://wavespeed.ai/llm/openai/gpt-oss-120b",
    pricing: wavespeedPricing("https://wavespeed.ai/llm/openai/gpt-oss-120b", 0.037, 0.17),
  },
  {
    ...wavespeedCommon,
    id: "deepseek/deepseek-v4-flash",
    displayName: "DeepSeek V4 Flash",
    inputTokenLimit: 1_048_576,
    outputTokenLimit: 384_000,
    documentationUrl: "https://wavespeed.ai/llm/deepseek/deepseek-v4-flash",
    pricing: wavespeedPricing("https://wavespeed.ai/llm/deepseek/deepseek-v4-flash", 0.14, 0.28),
  },
  {
    ...wavespeedCommon,
    id: "anthropic/claude-3-haiku",
    displayName: "Claude 3 Haiku",
    inputTokenLimit: 200_000,
    outputTokenLimit: 4_096,
    capabilities: { ...wavespeedCommon.capabilities, structuredOutput: false },
    documentationUrl: "https://wavespeed.ai/llm/anthropic/claude-3-haiku",
    pricing: wavespeedPricing("https://wavespeed.ai/llm/anthropic/claude-3-haiku", 0.25, 1.25),
  },
  {
    ...wavespeedCommon,
    id: "minimax/minimax-m3",
    displayName: "MiniMax M3",
    inputTokenLimit: 1_048_576,
    outputTokenLimit: 512_000,
    documentationUrl: "https://wavespeed.ai/llm/minimax/minimax-m3",
    pricing: wavespeedPricing("https://wavespeed.ai/llm/minimax/minimax-m3", 0.30, 1.20),
  },
  {
    ...wavespeedCommon,
    id: "moonshotai/kimi-k2",
    displayName: "Kimi K2",
    inputTokenLimit: 131_072,
    outputTokenLimit: 131_072,
    capabilities: { ...wavespeedCommon.capabilities, structuredOutput: false },
    documentationUrl: "https://wavespeed.ai/llm/moonshotai/kimi-k2",
    pricing: wavespeedPricing("https://wavespeed.ai/llm/moonshotai/kimi-k2", 0.57, 2.30),
  },
  {
    ...wavespeedCommon,
    id: "z-ai/glm-5.2",
    displayName: "GLM 5.2",
    tier: "advanced",
    role: "advanced",
    roleLabel: "Advanced WaveSpeed Cloud Agent",
    inputTokenLimit: 1_048_576,
    outputTokenLimit: 262_144,
    documentationUrl: "https://wavespeed.ai/llm/z-ai/glm-5.2",
    pricing: wavespeedPricing("https://wavespeed.ai/llm/z-ai/glm-5.2", 1.40, 4.40),
  },
];

/** Return isolated definitions so consumers cannot mutate the shared catalog. */
export function getAgentModels(): AgentModelDefinition[] {
  return AGENT_MODELS.map((model) => structuredClone(model));
}

export function getAgentModel(id: string): AgentModelDefinition | null {
  return getAgentModels().find((model) => model.id === id) ?? null;
}

export function getDefaultAgentModel(): AgentModelDefinition {
  return getAgentModels().find((model) => model.isDefault) ?? getAgentModels()[0];
}

export function getAgentPricePeriod(model: AgentModelDefinition, at = new Date()): AgentPricePeriod | null {
  const time = at.getTime();
  return model.pricing.periods.find((period) =>
    time >= Date.parse(`${period.effectiveFrom}T00:00:00Z`) &&
    (period.effectiveUntil === null || time < Date.parse(`${period.effectiveUntil}T00:00:00Z`))
  ) ?? null;
}
