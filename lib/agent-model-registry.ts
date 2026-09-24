/** Agent brains are a separate catalog, never DynamicImageModel/DynamicVideoModel. */
export type AgentModelTier = "economy" | "main" | "advanced";
export type AgentRuntimeStatus = "ready" | "disabled" | "not_configured" | "pricing_unverified";

export type AgentModelDefinition = {
  id: string;
  displayName: string;
  category: "agent_llm";
  provider: "google";
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

const common = {
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

const pricing = {
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

const AGENT_MODELS: AgentModelDefinition[] = [
  {
    ...common,
    id: "gemini-2.5-flash-lite",
    displayName: "Gemini 2.5 Flash-Lite",
    tier: "economy",
    role: "economy",
    roleLabel: "Economy Cloud Agent",
    autoSelectable: true,
    manualSelectable: true,
    isDefault: false,
    documentationUrl: "https://ai.google.dev/gemini-api/docs/models/gemini-2.5-flash-lite",
    pricing: { ...pricing, periods: [{
      effectiveFrom: "2026-09-24",
      effectiveUntil: null,
      tiers: [{ maxInputTokens: null, inputUsd: 0.10, outputUsd: 0.40 }],
    }] },
  },
  {
    ...common,
    id: "gemini-2.5-flash",
    displayName: "Gemini 2.5 Flash",
    tier: "main",
    role: "main",
    roleLabel: "Main / Default Cloud Agent",
    autoSelectable: true,
    manualSelectable: true,
    isDefault: true,
    documentationUrl: "https://ai.google.dev/gemini-api/docs/models/gemini-2.5-flash",
    pricing: { ...pricing, periods: [{
      effectiveFrom: "2026-09-24",
      effectiveUntil: null,
      tiers: [{ maxInputTokens: null, inputUsd: 0.30, outputUsd: 2.50 }],
    }] },
  },
  {
    ...common,
    id: "gemini-2.5-pro",
    displayName: "Gemini 2.5 Pro",
    tier: "advanced",
    role: "advanced",
    roleLabel: "Advanced Cloud Agent",
    autoSelectable: false,
    manualSelectable: true,
    isDefault: false,
    documentationUrl: "https://ai.google.dev/gemini-api/docs/models/gemini-2.5-pro",
    pricing: { ...pricing, periods: [{
      effectiveFrom: "2026-09-24",
      effectiveUntil: null,
      tiers: [
        { maxInputTokens: 200_000, inputUsd: 1.25, outputUsd: 10 },
        { maxInputTokens: null, inputUsd: 2.50, outputUsd: 15 },
      ],
    }] },
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
