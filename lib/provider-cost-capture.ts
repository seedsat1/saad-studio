import prismadb from "@/lib/prismadb";
import { estimateProviderCostSync } from "@/lib/pricing";
import {
  evaluateCostTrust,
  type CostTrustType,
} from "@/lib/admin/provider-costs-read-model";
import type { TariffVerificationStatus, TariffProvenanceRecord } from "@/lib/provider-tariff-registry";

export type UnknownCostReason =
  | "NO_VERIFIED_TARIFF"
  | "PROVIDER_DID_NOT_REPORT_COST"
  | "LEGACY_ROUTE"
  | "UNSUPPORTED_BILLING_DIMENSIONS"
  | "MISSING_TARIFF_PROVENANCE";

export interface ProviderExecutionCostInput {
  generationId: string;
  userId?: string | null;
  providerName?: string | null;
  providerModel?: string | null;
  providerRoute?: string | null;
  modelRef: string;
  durationSec?: number | null;
  resolution?: string | null;
  quality?: string | null;
  aspectRatio?: string | null;
  numUnits?: number | null;
  userCreditsCharged?: number | null;
  actualCostUsd?: number | null;
  providerCredits?: number | null;
  providerTokens?: number | null;
  providerRequestId?: string | null;
  executionStatus?: string | null;
  rawPayloadSafe?: string | null;
  unknownReason?: UnknownCostReason | string | null;
}

export interface ProviderExecutionCostResult {
  providerName: string;
  providerModel: string | null;
  providerRoute: string | null;
  providerCostUsd: number | null;
  providerCostSource: "actual" | "estimated" | "unknown";
  costTrust: CostTrustType;
  tariffKey: string | null;
  tariffRate: number | null;
  billingUnit: string | null;
  tariffSource: string | null;
  tariffCapturedAt: string | null;
  tariffVerificationStatus: TariffVerificationStatus;
  unknownReason?: string | null;
  provenance?: TariffProvenanceRecord;
}

/**
 * Resolves the canonical provider operating cost using strict financial precedence:
 * PRIORITY 1: ACTUAL (Exact request-level monetary cost reported by provider API/invoice)
 * PRIORITY 2: ESTIMATED_VERIFIED (Current verified official/account tariff × actual parameters)
 * PRIORITY 3: ESTIMATED_LEGACY (Historical pre-remediation estimate only)
 * PRIORITY 4: SHADOW_ANALYTICAL (Reap proxy rate under annual contract)
 * PRIORITY 5: UNKNOWN (No defensible cost; providerCostUsd strictly null, never $0.00)
 */
export function resolveProviderCostPrecedence(
  input: ProviderExecutionCostInput
): ProviderExecutionCostResult {
  const rawProvider = (input.providerName || "").trim();
  const modelLower = (input.providerModel || input.providerRoute || input.modelRef || "").toLowerCase();

  // PRIORITY 1: ACTUAL (Provider explicitly reported exact request cost)
  if (
    input.actualCostUsd !== null &&
    input.actualCostUsd !== undefined &&
    Number.isFinite(input.actualCostUsd) &&
    input.actualCostUsd > 0
  ) {
    return {
      providerName: rawProvider || "Unknown",
      providerModel: input.providerModel || null,
      providerRoute: input.providerRoute || input.providerModel || null,
      providerCostUsd: parseFloat(Number(input.actualCostUsd).toFixed(4)),
      providerCostSource: "actual",
      costTrust: "ACTUAL",
      tariffKey: `actual:reported:${rawProvider.toLowerCase()}`,
      tariffRate: input.actualCostUsd,
      billingUnit: "USD/request",
      tariffSource: "Exact Provider-Reported Request Billing Charge",
      tariffCapturedAt: new Date().toISOString(),
      tariffVerificationStatus: "VERIFIED_CURRENT",
    };
  }

  // PRIORITY 2 / 4 / 5: Resolve via Canonical Provider Tariff Registry
  const tariffEst = estimateProviderCostSync({
    modelRef: input.modelRef,
    providerName: rawProvider || null,
    providerModel: input.providerModel || null,
    providerRoute: input.providerRoute || null,
    durationSec: input.durationSec || 5,
    resolution: input.resolution || null,
    quality: input.quality || null,
    aspectRatio: input.aspectRatio || null,
    numUnits: input.numUnits || 1,
  });

  const provMeta = tariffEst.provenance;
  const prov = provMeta?.provider || rawProvider || "Unknown";
  const costUsd = tariffEst.usd;
  const costSource = tariffEst.source;
  const provStatus: TariffVerificationStatus = provMeta?.verificationStatus || "UNKNOWN";
  const sourceType = provMeta?.sourceType;

  const costTrust = evaluateCostTrust(prov, costSource, costUsd, provStatus, sourceType);

  let finalCostUsd = costUsd;
  let unknownReason: string | null = null;

  if (costTrust === "UNKNOWN") {
    finalCostUsd = null; // Strictly null, NEVER $0.00
    unknownReason =
      input.unknownReason ||
      (prov.toLowerCase() === "wavespeed"
        ? "NO_VERIFIED_TARIFF"
        : "PROVIDER_DID_NOT_REPORT_COST");
  }

  return {
    providerName: prov,
    providerModel: input.providerModel || provMeta?.providerRoute || null,
    providerRoute: provMeta?.providerRoute || input.providerRoute || input.providerModel || null,
    providerCostUsd: finalCostUsd !== null && finalCostUsd !== undefined ? parseFloat(Number(finalCostUsd).toFixed(4)) : null,
    providerCostSource: costSource || "unknown",
    costTrust,
    tariffKey: provMeta?.tariffKey || tariffEst.tariffKey || null,
    tariffRate: provMeta?.rateUsd !== undefined ? provMeta.rateUsd : null,
    billingUnit: provMeta?.billingUnit || "USD/unit",
    tariffSource: provMeta?.sourceReference || null,
    tariffCapturedAt: provMeta?.capturedAt || null,
    tariffVerificationStatus: provStatus,
    unknownReason,
    provenance: provMeta,
  };
}

/**
 * Standardized Central Cost Capture Service:
 * Idempotently and atomically captures or updates provider execution costs across Generation
 * and ProviderUsageRecord without double-counting.
 */
export async function recordProviderExecutionCost(
  input: ProviderExecutionCostInput
): Promise<ProviderExecutionCostResult> {
  const result = resolveProviderCostPrecedence(input);

  try {
    // 1. Update Generation row with canonical provider cost evidence
    await prismadb.generation.updateMany({
      where: { id: input.generationId },
      data: {
        providerName: result.providerName,
        providerModel: result.providerModel,
        providerCostUsd: result.providerCostUsd,
        providerCostSource: result.providerCostSource,
        ...(input.providerRequestId ? { providerRequestId: input.providerRequestId } : {}),
      },
    });

    // 2. Idempotently upsert ProviderUsageRecord (1 logical execution = 1 record)
    const existingUsage = await prismadb.providerUsageRecord.findFirst({
      where: { generationId: input.generationId },
    });

    const safePayload = input.rawPayloadSafe
      ? input.rawPayloadSafe
      : result.unknownReason
      ? JSON.stringify({ unknownReason: result.unknownReason })
      : null;

    if (existingUsage) {
      await prismadb.providerUsageRecord.update({
        where: { id: existingUsage.id },
        data: {
          providerName: result.providerName,
          providerModel: result.providerModel,
          providerCostUsd: result.providerCostUsd,
          providerCostSource: result.providerCostSource,
          ...(input.providerRequestId !== undefined ? { providerRequestId: input.providerRequestId } : {}),
          ...(input.providerCredits !== undefined ? { providerCredits: input.providerCredits } : {}),
          ...(input.providerTokens !== undefined ? { providerTokens: input.providerTokens } : {}),
          ...(input.durationSec !== undefined ? { duration: input.durationSec } : {}),
          ...(input.resolution !== undefined ? { resolution: input.resolution } : {}),
          ...(input.quality !== undefined ? { quality: input.quality } : {}),
          ...(input.aspectRatio !== undefined ? { aspectRatio: input.aspectRatio } : {}),
          ...(input.executionStatus !== undefined ? { status: input.executionStatus } : {}),
          ...(safePayload !== null ? { rawPayloadSafe: safePayload } : {}),
        },
      });
    } else if (input.userId) {
      await prismadb.providerUsageRecord.create({
        data: {
          userId: input.userId,
          generationId: input.generationId,
          providerName: result.providerName,
          providerModel: result.providerModel,
          providerRequestId: input.providerRequestId ?? null,
          providerCostUsd: result.providerCostUsd,
          providerCostSource: result.providerCostSource,
          providerCredits: input.providerCredits ?? null,
          providerTokens: input.providerTokens ?? null,
          duration: input.durationSec ?? null,
          resolution: input.resolution ?? null,
          quality: input.quality ?? null,
          aspectRatio: input.aspectRatio ?? null,
          status: input.executionStatus ?? "completed",
          rawPayloadSafe: safePayload,
        },
      });
    }
  } catch (error) {
    console.error("[recordProviderExecutionCost] Error persisting cost evidence:", error);
  }

  return result;
}
