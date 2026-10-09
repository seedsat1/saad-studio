import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { getGenerationCost } from "@/lib/pricing";

import { disconnectTestPrisma, resetDatabase, testPrisma } from "./database";

/**
 * Dubbing is billed by duration, and these are the properties that must hold of
 * whatever rate is configured: the charge clears provider cost even on the
 * cheapest plan, it scales with length instead of being a flat fee, and it
 * stops growing past the 15 minutes the provider itself bills.
 *
 * Why this needs a database. `dubbing` has no entry in DEFAULT_MODELS in
 * lib/pricing-models.ts — its rate exists only as a PricingConstitution row.
 * resolveModelUserCharge returns 0 for a model it cannot find, so without a row
 * these assertions all compare against zero. The test used to get that row from
 * production, which is why it needed live customer data to say anything at all.
 *
 * It now seeds its own row. That means it verifies the pricing engine rather
 * than the number currently configured in production — the engine is what the
 * assertions were always really about. The missing default is a separate
 * production concern, noted in the migration report.
 */
describe("dubbing is billed by duration", () => {
  // The provider's own rate, from the ElevenLabs dubbing contract.
  const USD_PER_SECOND = 0.01;
  const MAX_BILLED = 900;
  // Max plan: $99 for 2700 credits, the cheapest a credit is ever sold.
  const CHEAPEST_CREDIT = 99 / 2700;
  // The project's convention: credits = provider USD x 56.
  const CREDITS_PER_SECOND = USD_PER_SECOND * 56;

  beforeAll(async () => {
    await resetDatabase();
    await testPrisma().pricingConstitution.create({
      data: {
        id: "dubbing",
        name: "ElevenLabs Dubbing",
        type: "audio",
        provider: "wavespeed",
        billing: "per_sec",
        waveUsd: USD_PER_SECOND,
        userCreditsRate: CREDITS_PER_SECOND,
        maxDuration: MAX_BILLED,
        isActive: true,
      },
    });
  });

  afterAll(async () => {
    await resetDatabase();
    await disconnectTestPrisma();
  });

  it.each([30, 60, 300, 900])("clears provider cost at %i seconds on every plan", async (seconds) => {
    const credits = await getGenerationCost("elevenlabs/dubbing", seconds, 1);
    const providerCost = seconds * USD_PER_SECOND;

    expect(credits).toBeGreaterThan(0);
    expect(credits * CHEAPEST_CREDIT).toBeGreaterThan(providerCost);
  });

  it("scales with duration instead of charging a flat fee", async () => {
    const short = await getGenerationCost("elevenlabs/dubbing", 30, 1);
    const long = await getGenerationCost("elevenlabs/dubbing", 900, 1);

    expect(long).toBeGreaterThan(short * 20);
  });

  it("stops charging past the 15 minutes the provider bills", async () => {
    const atCap = await getGenerationCost("elevenlabs/dubbing", MAX_BILLED, 1);
    const beyond = await getGenerationCost("elevenlabs/dubbing", MAX_BILLED * 3, 1);

    expect(beyond).toBe(atCap);
  });

  it("charges nothing for a model with no row and no default", async () => {
    // The flip side of the gap above, pinned so it cannot change unnoticed: an
    // unknown model bills zero rather than falling back to some other rate.
    const credits = await getGenerationCost("elevenlabs/no-such-model-zzz", 60, 1);

    expect(credits).toBe(0);
  });
});
