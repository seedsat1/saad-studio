import { describe, expect, it } from "vitest";
import { loadAdminRoutingData } from "@/lib/routing/admin-routing-data";

describe("Routing Audit Safety & Measurement Suite (Read-Only)", () => {
  it("measures exact payload bytes and rows loaded for loadAdminRoutingData", async () => {
    const data = await loadAdminRoutingData();
    expect(data).toHaveProperty("rows");
    expect(data).toHaveProperty("providers");
    expect(data).toHaveProperty("databaseAvailable");

    const jsonString = JSON.stringify(data);
    const byteLength = Buffer.byteLength(jsonString, "utf-8");

    console.log(`[MEASUREMENT] Routing Control Data payload: ${byteLength} bytes (~${(byteLength / 1024).toFixed(2)} KB) for ${data.rows.length} model rows`);
    expect(byteLength).toBeGreaterThan(0);
    expect(data.rows.length).toBeGreaterThan(10);
  });

  it("verifies provider eligibility and standby restrictions", async () => {
    const data = await loadAdminRoutingData();
    const byteplus = data.providers.find((p) => p.id === "byteplus");
    const kie = data.providers.find((p) => p.id === "kie");
    const wavespeed = data.providers.find((p) => p.id === "wavespeed");
    const google = data.providers.find((p) => p.id === "google");
    const openai = data.providers.find((p) => p.id === "openai");

    expect(byteplus?.routingEligible).toBe(false);
    expect(kie?.routingEligible).toBe(false);
    expect(wavespeed?.routingEligible).toBe(true);
    expect(google?.routingEligible).toBe(true);
    expect(openai?.routingEligible).toBe(true);
  });
});
