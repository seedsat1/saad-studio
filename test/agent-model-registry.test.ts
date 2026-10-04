import { beforeEach, describe, expect, it, vi } from "vitest";
import { calculateAgentCredits, calculateMaxOutputTokensForCreditCap } from "@/lib/agent-pricing";
import { getAgentModels, getAgentPricePeriod } from "@/lib/agent-model-registry";
import { buildAgentGoogleModelParams } from "@/lib/agent-google-provider";

const { isAdmin, platformFindUnique, platformUpsert } = vi.hoisted(() => ({
  isAdmin: vi.fn(),
  platformFindUnique: vi.fn(),
  platformUpsert: vi.fn(),
}));

vi.mock("@/lib/is-admin", () => ({ isAdmin }));
vi.mock("@/lib/prismadb", () => ({
  default: {
    platformConfig: {
      findUnique: platformFindUnique,
      upsert: platformUpsert,
    },
  },
}));

import { GET, PATCH } from "@/app/api/admin/agent-models/route";

describe("Agent / LLM runtime catalog", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    platformFindUnique.mockResolvedValue(null);
    platformUpsert.mockResolvedValue({});
  });

  it("registers Google Agent IDs plus the cheapest verified WaveSpeed provider choices", () => {
    const models = getAgentModels();
    expect(models.map((model) => model.id)).toEqual([
      "gemini-2.5-flash-lite",
      "gemini-2.5-flash",
      "gemini-2.5-pro",
      "mistralai/mistral-nemo",
      "qwen/qwen3.7-flash",
      "openai/gpt-oss-120b",
      "deepseek/deepseek-v4-flash",
      "anthropic/claude-3-haiku",
      "minimax/minimax-m3",
      "moonshotai/kimi-k2",
      "z-ai/glm-5.2",
    ]);
    expect(models.every((model) =>
      model.category === "agent_llm" &&
      model.enabled &&
      model.runtimeStatus === "ready" &&
      model.maxCreditsPerRequest === undefined
    )).toBe(true);
    expect(models.filter((model) => model.provider === "google")).toHaveLength(3);
    expect(models.filter((model) => model.provider === "wavespeed")).toHaveLength(8);
    expect(models.find((model) => model.id === "gemini-2.5-flash")?.isDefault).toBe(true);
    expect(models.find((model) => model.id === "gemini-2.5-pro")?.autoSelectable).toBe(false);
    expect(models.every((model) => !("creditCost" in model) && !("api_route" in model))).toBe(true);
  });

  it("preserves verified WaveSpeed per-million-token pricing for the selected cheapest models", () => {
    const rates = Object.fromEntries(getAgentModels()
      .filter((model) => model.provider === "wavespeed")
      .map((model) => [model.id, getAgentPricePeriod(model, new Date("2026-09-26"))!.tiers[0]]));
    expect(rates["mistralai/mistral-nemo"]).toEqual({ maxInputTokens: null, inputUsd: 0.019, outputUsd: 0.05 });
    expect(rates["qwen/qwen3.7-flash"]).toEqual({ maxInputTokens: null, inputUsd: 0.03, outputUsd: 0.13 });
    expect(rates["openai/gpt-oss-120b"]).toEqual({ maxInputTokens: null, inputUsd: 0.037, outputUsd: 0.17 });
    expect(rates["deepseek/deepseek-v4-flash"]).toEqual({ maxInputTokens: null, inputUsd: 0.14, outputUsd: 0.28 });
    expect(rates["anthropic/claude-3-haiku"]).toEqual({ maxInputTokens: null, inputUsd: 0.25, outputUsd: 1.25 });
    expect(rates["minimax/minimax-m3"]).toEqual({ maxInputTokens: null, inputUsd: 0.3, outputUsd: 1.2 });
    expect(rates["moonshotai/kimi-k2"]).toEqual({ maxInputTokens: null, inputUsd: 0.57, outputUsd: 2.3 });
    expect(rates["z-ai/glm-5.2"]).toEqual({ maxInputTokens: null, inputUsd: 1.4, outputUsd: 4.4 });
  });

  it("preserves Gemini 2.5 Pro context pricing tiers and thinking-inclusive output", () => {
    const pro = getAgentModels().find((model) => model.id === "gemini-2.5-pro")!;
    const period = getAgentPricePeriod(pro, new Date("2026-09-24"))!;
    const rate = (tokens: number) => period.tiers.find((tier) => tier.maxInputTokens === null || tokens <= tier.maxInputTokens);
    expect(rate(199_999)).toEqual({ maxInputTokens: 200_000, inputUsd: 1.25, outputUsd: 10 });
    expect(rate(200_000)).toEqual({ maxInputTokens: 200_000, inputUsd: 1.25, outputUsd: 10 });
    expect(rate(200_001)).toEqual({ maxInputTokens: null, inputUsd: 2.5, outputUsd: 15 });
    expect(pro.pricing.outputIncludesThinking).toBe(true);
  });

  it("uses the same Gemini 2.5 Pro pricing tier for preflight and post-usage billing", () => {
    const pro = getAgentModels().find((model) => model.id === "gemini-2.5-pro")!;
    const lowerPreflight = calculateMaxOutputTokensForCreditCap({
      model: pro,
      inputTokens: 199_999,
      creditCap: 20,
      safetyMargin: 1,
      at: new Date("2026-09-24"),
    });
    const thresholdPreflight = calculateMaxOutputTokensForCreditCap({
      model: pro,
      inputTokens: 200_000,
      creditCap: 20,
      safetyMargin: 1,
      at: new Date("2026-09-24"),
    });
    const upperPreflight = calculateMaxOutputTokensForCreditCap({
      model: pro,
      inputTokens: 200_001,
      creditCap: 20,
      safetyMargin: 1,
      at: new Date("2026-09-24"),
    });
    const lowerQuote = calculateAgentCredits({
      model: pro,
      usage: { inputTokens: 199_999, outputTokens: 1_000, totalTokens: 200_999 },
      at: new Date("2026-09-24"),
    })!;
    const thresholdQuote = calculateAgentCredits({
      model: pro,
      usage: { inputTokens: 200_000, outputTokens: 1_000, totalTokens: 201_000 },
      at: new Date("2026-09-24"),
    })!;
    const upperQuote = calculateAgentCredits({
      model: pro,
      usage: { inputTokens: 200_001, outputTokens: 1_000, totalTokens: 201_001 },
      at: new Date("2026-09-24"),
    })!;
    expect(lowerQuote.tier).toEqual({ maxInputTokens: 200_000, inputUsd: 1.25, outputUsd: 10 });
    expect(thresholdQuote.tier).toEqual({ maxInputTokens: 200_000, inputUsd: 1.25, outputUsd: 10 });
    expect(upperQuote.tier).toEqual({ maxInputTokens: null, inputUsd: 2.5, outputUsd: 15 });
    expect(lowerPreflight).toBeGreaterThan(upperPreflight!);
    expect(thresholdPreflight).toBeGreaterThan(upperPreflight!);
  });

  it("calculates Agent credits with 40 percent markup and integer rounding", () => {
    const flash = getAgentModels().find((model) => model.id === "gemini-2.5-flash")!;
    const quote = calculateAgentCredits({
      model: flash,
      usage: { inputTokens: 1_000_000, outputTokens: 1_000_000, totalTokens: 2_000_000 },
      at: new Date("2026-09-24"),
    })!;
    expect(quote.providerCostUsd).toBeCloseTo(2.8, 8);
    expect(quote.subscriberPriceUsd).toBeCloseTo(3.92, 8);
    expect(quote.credits).toBe(79);
    expect(quote.subscriberPriceUsd / quote.providerCostUsd).toBeCloseTo(1.4, 8);
    expect(calculateAgentCredits({
      model: flash,
      usage: { inputTokens: 1, outputTokens: 1, totalTokens: 2 },
      at: new Date("2026-09-24"),
    })?.credits).toBe(1);
  });

  it("builds the same Google request context for countTokens and generation", () => {
    const input = {
      model: "gemini-2.5-flash",
      messages: [
        { role: "system" as const, content: "System rules" },
        { role: "user" as const, content: "Hello" },
      ],
      tools: [{
        type: "function",
        function: {
          name: "lookup_asset",
          description: "Lookup asset",
          parameters: { type: "object", properties: { id: { type: "string" } } },
        },
      }],
      responseFormat: { type: "json_object" },
    };
    const countPayload = buildAgentGoogleModelParams(input);
    const generationPayload = buildAgentGoogleModelParams({ ...input, maxOutputTokens: 123 });
    expect(countPayload.contents).toEqual(generationPayload.contents);
    expect(countPayload.modelParams.model).toBe(generationPayload.modelParams.model);
    expect(countPayload.modelParams.systemInstruction).toBe(generationPayload.modelParams.systemInstruction);
    expect(countPayload.modelParams.tools).toEqual(generationPayload.modelParams.tools);
    expect(countPayload.modelParams.generationConfig).toEqual({ responseMimeType: "application/json" });
    expect(generationPayload.modelParams.generationConfig).toEqual({ maxOutputTokens: 123, responseMimeType: "application/json" });
  });

  it("derives a bounded max output budget from credits and input cost", () => {
    const lite = getAgentModels().find((model) => model.id === "gemini-2.5-flash-lite")!;
    const maxOutput = calculateMaxOutputTokensForCreditCap({
      model: lite,
      inputTokens: 1_000,
      creditCap: 1,
      safetyMargin: 0.9,
      at: new Date("2026-09-24"),
    });
    expect(maxOutput).toBeGreaterThan(1);
    expect(maxOutput).toBeLessThanOrEqual(lite.outputTokenLimit);
  });

  it("denies unauthenticated/non-admin access", async () => {
    isAdmin.mockResolvedValue(false);
    expect((await GET()).status).toBe(401);
  });

  it("returns the runtime catalog only to an admin with no shared caching", async () => {
    isAdmin.mockResolvedValue(true);
    const response = await GET();
    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("private, no-store");
    const data = await response.json();
    expect(data.models).toHaveLength(11);
    expect(data.sourceOfTruth).toBe("agent_model_registry");
    expect(data.imageModels).toBeUndefined();
    expect(data.videoModels).toBeUndefined();
  });

  it("lets admin disable an Agent model through PlatformConfig overrides", async () => {
    isAdmin.mockResolvedValue(true);
    const response = await PATCH(new Request("https://saad.test/api/admin/agent-models", {
      method: "PATCH",
      body: JSON.stringify({ id: "gemini-2.5-pro", enabled: false, runtimeStatus: "disabled" }),
    }));
    const data = await response.json();
    expect(response.status).toBe(200);
    expect(data.model.enabled).toBe(false);
    expect(data.model.runtimeStatus).toBe("disabled");
    expect(platformUpsert).toHaveBeenCalled();
  });
});
