import {
  getAgentPricePeriod,
  type AgentModelDefinition,
  type AgentPricePeriod,
} from "@/lib/agent-model-registry";

export const AGENT_USER_CREDIT_USD = 0.05;
export const AGENT_MARKUP_MULTIPLIER = 1.4;

export type AgentUsage = {
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
};

export type AgentPriceQuote = {
  period: AgentPricePeriod;
  tier: AgentPricePeriod["tiers"][number];
  providerCostUsd: number;
  subscriberPriceUsd: number;
  credits: number;
  markupMultiplier: number;
  userCreditUsd: number;
};

export function getAgentPriceTier(model: AgentModelDefinition, inputTokens: number, at = new Date()) {
  if (!model.pricing.verified) return null;
  const period = getAgentPricePeriod(model, at);
  if (!period) return null;
  const safeInputTokens = Math.max(0, Math.floor(inputTokens));
  const tier = period.tiers.find((entry) => entry.maxInputTokens === null || safeInputTokens <= entry.maxInputTokens);
  return tier ? { period, tier } : null;
}

export function calculateAgentCredits(input: {
  model: AgentModelDefinition;
  usage: AgentUsage;
  at?: Date;
}): AgentPriceQuote | null {
  const selected = getAgentPriceTier(input.model, input.usage.inputTokens, input.at);
  if (!selected) return null;

  const inputTokens = Math.max(0, Math.floor(input.usage.inputTokens));
  const outputTokens = Math.max(0, Math.floor(input.usage.outputTokens));
  const providerCostUsd =
    (inputTokens / 1_000_000) * selected.tier.inputUsd +
    (outputTokens / 1_000_000) * selected.tier.outputUsd;
  const subscriberPriceUsd = providerCostUsd * AGENT_MARKUP_MULTIPLIER;
  const credits = Math.max(1, Math.ceil(subscriberPriceUsd / AGENT_USER_CREDIT_USD));

  return {
    period: selected.period,
    tier: selected.tier,
    providerCostUsd,
    subscriberPriceUsd,
    credits,
    markupMultiplier: AGENT_MARKUP_MULTIPLIER,
    userCreditUsd: AGENT_USER_CREDIT_USD,
  };
}

export function calculateMaxOutputTokensForCreditCap(input: {
  model: AgentModelDefinition;
  inputTokens: number;
  creditCap: number;
  safetyMargin?: number;
  at?: Date;
}): number | null {
  const selected = getAgentPriceTier(input.model, input.inputTokens, input.at);
  if (!selected) return null;
  const creditCap = Math.max(0, Math.floor(input.creditCap));
  if (creditCap < 1) return null;

  const safetyMargin = Math.max(0.5, Math.min(1, input.safetyMargin ?? 0.9));
  const budgetUsd = creditCap * AGENT_USER_CREDIT_USD * safetyMargin;
  const inputCostUsd = (Math.max(0, Math.floor(input.inputTokens)) / 1_000_000) * selected.tier.inputUsd * AGENT_MARKUP_MULTIPLIER;
  const remainingUsd = budgetUsd - inputCostUsd;
  if (remainingUsd <= 0) return null;

  const outputUsdPerToken = (selected.tier.outputUsd / 1_000_000) * AGENT_MARKUP_MULTIPLIER;
  if (outputUsdPerToken <= 0) return null;

  const budgetedOutputTokens = Math.floor(remainingUsd / outputUsdPerToken);
  const hardCap = Math.max(1, Math.floor(input.model.outputTokenLimit));
  const safeOutputTokens = Math.max(1, Math.min(hardCap, budgetedOutputTokens));
  return safeOutputTokens > 0 ? safeOutputTokens : null;
}
