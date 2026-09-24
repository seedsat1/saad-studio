import { describe, expect, it, vi, beforeEach } from "vitest";
import { getAgentModels, getAgentPricePeriod } from "@/lib/agent-model-registry";

const { isAdmin } = vi.hoisted(() => ({ isAdmin: vi.fn() }));
vi.mock("@/lib/is-admin", () => ({ isAdmin }));

import { GET } from "@/app/api/admin/agent-models/route";

describe("Agent / LLM catalog", () => {
  beforeEach(() => vi.clearAllMocks());

  it("registers the three exact Google IDs without pretending runtime integration", () => {
    const models = getAgentModels();
    expect(models.map((model) => model.id)).toEqual([
      "gemini-3.1-flash-lite", "gemini-3.8-flash", "gemini-3.1-pro-preview",
    ]);
    expect(models.every((model) => model.category === "agent_llm" && model.provider === "google" && model.runtimeStatus === "not_connected")).toBe(true);
    expect(models[2].release).toBe("preview");
    expect(models.every((model) => !("creditCost" in model) && !("api_route" in model))).toBe(true);
  });

  it("switches Flash prices exactly at the UTC promotional boundary", () => {
    const flash = getAgentModels()[1];
    expect(getAgentPricePeriod(flash, new Date("2026-12-31T23:59:59.999Z"))?.tiers[0]).toEqual({ maxInputTokens: null, inputUsd: 0.75, outputUsd: 3.75 });
    expect(getAgentPricePeriod(flash, new Date("2027-01-01T00:00:00Z"))?.tiers[0]).toEqual({ maxInputTokens: null, inputUsd: 1.5, outputUsd: 7.5 });
    expect(getAgentPricePeriod(flash, new Date("2026-01-01"))).toBeNull();
  });

  it("preserves both Pro context pricing tiers and the thinking-inclusive rate", () => {
    const pro = getAgentModels()[2];
    const period = getAgentPricePeriod(pro, new Date("2026-09-24"))!;
    const rate = (tokens: number) => period.tiers.find((tier) => tier.maxInputTokens === null || tokens <= tier.maxInputTokens);
    expect(rate(200_000)?.outputUsd).toBe(12);
    expect(rate(200_001)?.outputUsd).toBe(18);
    expect(pro.pricing.outputIncludesThinking).toBe(true);
  });

  it("isolates callers from mutations to another catalog copy", () => {
    const models = getAgentModels();
    models[0].capabilities.chat = false;
    models[0].pricing.periods[0].tiers[0].inputUsd = 99;
    expect(getAgentModels()[0].capabilities.chat).toBe(true);
    expect(getAgentModels()[0].pricing.periods[0].tiers[0].inputUsd).toBe(0.25);
    expect(models[1].capabilities.chat).toBe(true);
  });

  it("denies unauthenticated/non-admin access", async () => {
    isAdmin.mockResolvedValue(false);
    expect((await GET()).status).toBe(401);
  });

  it("returns the catalog only to an admin with no shared caching", async () => {
    isAdmin.mockResolvedValue(true);
    const response = await GET();
    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("private, no-store");
    const data = await response.json();
    expect(data.models).toHaveLength(3);
    expect(data.sourceOfTruth).toBe("agent_model_registry");
    expect(data.imageModels).toBeUndefined();
    expect(data.videoModels).toBeUndefined();
  });
});
