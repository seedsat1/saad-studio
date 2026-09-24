/** Agent brains are a separate catalog, never DynamicImageModel/DynamicVideoModel. */
export type AgentModelDefinition = {
  id: string;
  displayName: string;
  category: "agent_llm";
  provider: "google";
  role: "economy" | "main" | "advanced";
  roleLabel: string;
  release: "stable" | "preview";
  registrationStatus: "registered";
  runtimeStatus: "not_connected";
  capabilities: {
    chat: boolean;
    reasoning: boolean;
    functionCalling: boolean;
    structuredOutput: boolean;
    streaming: boolean;
  };
  inputTokenLimit: number;
  outputTokenLimit: number;
  pricing: {
    currency: "USD";
    unit: "per_million_tokens";
    serviceTier: "standard";
    inputModality: "text";
    outputIncludesThinking: true;
    sourceUrl: string;
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
  runtimeStatus: "not_connected" as const,
  capabilities: {
    chat: true, reasoning: true, functionCalling: true,
    structuredOutput: true, streaming: true,
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
  sourceUrl: "https://ai.google.dev/gemini-api/docs/pricing",
};

const AGENT_MODELS: AgentModelDefinition[] = [
  {
    ...common,
    id: "gemini-2.5-flash-lite",
    displayName: "Gemini 2.5 Flash-Lite",
    role: "economy",
    roleLabel: "Lowest-cost legacy Agent",
    release: "stable",
    documentationUrl: "https://ai.google.dev/gemini-api/docs/models/gemini-2.5-flash-lite",
    pricing: { ...pricing, periods: [{
      effectiveFrom: "2026-09-24", effectiveUntil: null,
      tiers: [{ maxInputTokens: null, inputUsd: 0.10, outputUsd: 0.40 }],
    }] },
  },
  {
    ...common,
    id: "gemini-3.1-flash-lite",
    displayName: "Gemini 3.1 Flash-Lite",
    role: "economy",
    roleLabel: "Fast / Economy Agent",
    release: "stable",
    documentationUrl: "https://ai.google.dev/gemini-api/docs/models/gemini-3.1-flash-lite",
    pricing: { ...pricing, periods: [{
      effectiveFrom: "2026-09-24", effectiveUntil: null,
      tiers: [{ maxInputTokens: null, inputUsd: 0.25, outputUsd: 1.50 }],
    }] },
  },
  {
    ...common,
    id: "gemini-2.5-flash",
    displayName: "Gemini 2.5 Flash",
    role: "main",
    roleLabel: "Low-cost legacy Main Agent",
    release: "stable",
    documentationUrl: "https://ai.google.dev/gemini-api/docs/models/gemini-2.5-flash",
    pricing: { ...pricing, periods: [{
      effectiveFrom: "2026-09-24", effectiveUntil: null,
      tiers: [{ maxInputTokens: null, inputUsd: 0.30, outputUsd: 2.50 }],
    }] },
  },
  {
    ...common,
    id: "gemini-2.5-pro",
    displayName: "Gemini 2.5 Pro",
    role: "advanced",
    roleLabel: "Legacy Advanced Reasoning Agent",
    release: "stable",
    documentationUrl: "https://ai.google.dev/gemini-api/docs/models/gemini-2.5-pro",
    pricing: { ...pricing, periods: [{
      effectiveFrom: "2026-09-24", effectiveUntil: null,
      tiers: [
        { maxInputTokens: 200_000, inputUsd: 1.25, outputUsd: 10 },
        { maxInputTokens: null, inputUsd: 2.50, outputUsd: 15 },
      ],
    }] },
  },
  {
    ...common,
    id: "gemini-3.8-flash",
    displayName: "Gemini 3.8 Flash",
    role: "main",
    roleLabel: "Default / Main Agent",
    release: "stable",
    documentationUrl: "https://ai.google.dev/gemini-api/docs/models/gemini-3.8-flash",
    pricing: { ...pricing, periods: [
      {
        effectiveFrom: "2026-09-24", effectiveUntil: "2027-01-01",
        tiers: [{ maxInputTokens: null, inputUsd: 0.75, outputUsd: 3.75 }],
      },
      {
        effectiveFrom: "2027-01-01", effectiveUntil: null,
        tiers: [{ maxInputTokens: null, inputUsd: 1.50, outputUsd: 7.50 }],
      },
    ] },
  },
  {
    ...common,
    id: "gemini-3.1-pro-preview",
    displayName: "Gemini 3.1 Pro Preview",
    role: "advanced",
    roleLabel: "Advanced Reasoning / Complex Directing",
    release: "preview",
    documentationUrl: "https://ai.google.dev/gemini-api/docs/models/gemini-3.1-pro-preview",
    pricing: { ...pricing, periods: [{
      effectiveFrom: "2026-09-24", effectiveUntil: null,
      tiers: [
        { maxInputTokens: 200_000, inputUsd: 2, outputUsd: 12 },
        { maxInputTokens: null, inputUsd: 4, outputUsd: 18 },
      ],
    }] },
  },
];

/** Return isolated definitions so consumers cannot mutate the shared catalog. */
export function getAgentModels(): AgentModelDefinition[] {
  return AGENT_MODELS.map((model) => structuredClone(model));
}

export function getAgentPricePeriod(model: AgentModelDefinition, at = new Date()): AgentPricePeriod | null {
  const time = at.getTime();
  return model.pricing.periods.find((period) =>
    time >= Date.parse(`${period.effectiveFrom}T00:00:00Z`) &&
    (period.effectiveUntil === null || time < Date.parse(`${period.effectiveUntil}T00:00:00Z`))
  ) ?? null;
}
