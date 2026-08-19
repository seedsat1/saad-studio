import { describe, expect, it } from "vitest";
import {
  PROVIDER_REGISTRY,
  isProviderFallbackAllowed,
  isProviderRoutingAllowed,
  normalizeProviderId,
} from "@/lib/provider-registry";

describe("Admin Providers — Visual Telemetry & Operational Boundaries", () => {
  it("strictly registers exactly 7 valid providers", () => {
    expect(PROVIDER_REGISTRY).toHaveLength(7);
    const ids = PROVIDER_REGISTRY.map((p) => p.id);
    expect(ids).toContain("google");
    expect(ids).toContain("openai");
    expect(ids).toContain("wavespeed");
    expect(ids).toContain("elevenlabs");
    expect(ids).toContain("reap");
    expect(ids).toContain("byteplus");
    expect(ids).toContain("kie");
  });

  it("enforces that BytePlus and KIE are strictly standby and prohibited from routing", () => {
    const byteplus = PROVIDER_REGISTRY.find((p) => p.id === "byteplus");
    const kie = PROVIDER_REGISTRY.find((p) => p.id === "kie");

    expect(byteplus?.status).toBe("standby");
    expect(byteplus?.enabled).toBe(false);
    expect(byteplus?.allowRouting).toBe(false);
    expect(byteplus?.allowFallback).toBe(false);
    expect(isProviderRoutingAllowed("byteplus")).toBe(false);
    expect(isProviderFallbackAllowed("byteplus")).toBe(false);

    expect(kie?.status).toBe("standby");
    expect(kie?.enabled).toBe(false);
    expect(kie?.allowRouting).toBe(false);
    expect(kie?.allowFallback).toBe(false);
    expect(isProviderRoutingAllowed("kie")).toBe(false);
    expect(isProviderFallbackAllowed("kie")).toBe(false);
  });

  it("enforces that active providers allow routing when enabled", () => {
    expect(isProviderRoutingAllowed("google")).toBe(true);
    expect(isProviderRoutingAllowed("openai")).toBe(true);
    expect(isProviderRoutingAllowed("wavespeed")).toBe(true);
    expect(isProviderRoutingAllowed("reap")).toBe(true);
    expect(isProviderRoutingAllowed("elevenlabs")).toBe(false);
  });

  it("preserves strict pricing boundary without inventing profit or user margin", () => {
    for (const provider of PROVIDER_REGISTRY) {
      // Ensure provider registry contains NO pricing markup, margins, or profit fields
      expect((provider as any).profitMargin).toBeUndefined();
      expect((provider as any).userCreditRate).toBeUndefined();
      expect((provider as any).retailPrice).toBeUndefined();
    }
  });

  it("normalizes provider aliases faithfully across variations", () => {
    expect(normalizeProviderId("Google AI")).toBe("google");
    expect(normalizeProviderId("gemini-3.1-flash")).toBe("google");
    expect(normalizeProviderId("openai-sora")).toBe("openai");
    expect(normalizeProviderId("wavespeed-flux")).toBe("wavespeed");
    expect(normalizeProviderId("bytedance/seedance")).toBe("byteplus");
    expect(normalizeProviderId("eleven-multilingual")).toBe("elevenlabs");
    expect(normalizeProviderId("reap-export")).toBe("reap");
    expect(normalizeProviderId("kie-standard")).toBe("kie");
    expect(normalizeProviderId("unknown_vendor")).toBeNull();
  });
});
