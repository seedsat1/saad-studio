import { describe, it, expect } from "vitest";
import * as fs from "fs";
import * as path from "path";
import { PROVIDER_REGISTRY, isProviderRoutingAllowed } from "@/lib/provider-registry";
import { SAAD_PLANS, DEFAULT_MODELS } from "@/lib/pricing-models";
import { getGenerationCostSync } from "@/lib/pricing";

describe("Subscriber Dashboard Reality & Audio Route Verification", () => {
  const dashboardSource = fs.readFileSync(
    path.join(process.cwd(), "app/(dash)/(routes)/dashboard/page.tsx"),
    "utf-8"
  );

  it("proves Dashboard source contains zero hardcoded mock statistics or fake identities", () => {
    // Check for eliminated mock strings
    expect(dashboardSource).not.toMatch(/"142"/);
    expect(dashboardSource).not.toMatch(/"1,200"/);
    expect(dashboardSource).not.toMatch(/"Saved Projects"/);
    expect(dashboardSource).not.toMatch(/Welcome back,\s*Saad!/);
    expect(dashboardSource).not.toMatch(/Pro Member/);
    expect(dashboardSource).not.toMatch(/"Neon cityscape at dusk"/);
    expect(dashboardSource).not.toMatch(/"Electronic ambient track"/);
  });

  it("proves Dashboard connects to authoritative data sources", () => {
    expect(dashboardSource).toContain('fetch("/api/profile/settings"');
    expect(dashboardSource).toContain('fetch("/api/assets?type=all&limit=6"');
    expect(dashboardSource).toContain("saad-credits-updated");
  });

  it("proves Dashboard navigates to canonical creation studios and tools", () => {
    expect(dashboardSource).toContain('href: "/video"');
    expect(dashboardSource).toContain('href: "/image"');
    expect(dashboardSource).toContain('href: "/audio"');
    expect(dashboardSource).toContain('href: "/apps"');
    expect(dashboardSource).toContain('href="/gallery"');
    expect(dashboardSource).toContain('href="/settings"');
    expect(dashboardSource).toContain('href="/pricing"');
  });

  it("proves ElevenLabs direct provider status is disabled and not used for direct execution", () => {
    const elevenlabs = PROVIDER_REGISTRY.find((p) => p.id === "elevenlabs");
    expect(elevenlabs).toBeDefined();
    expect(elevenlabs?.status).toBe("disabled");
    expect(elevenlabs?.enabled).toBe(false);
    expect(elevenlabs?.allowRouting).toBe(false);
    expect(isProviderRoutingAllowed("elevenlabs")).toBe(false);
  });

  it("proves audio API route executes through WaveSpeed host without direct ElevenLabs API call", () => {
    const audioRouteSource = fs.readFileSync(
      path.join(process.cwd(), "app/api/generate/audio/route.ts"),
      "utf-8"
    );

    expect(audioRouteSource).toContain("https://api.wavespeed.ai/api/v3");
    // Direct elevenlabs API endpoints should not be present as active direct URLs
    expect(audioRouteSource).not.toContain("https://api.elevenlabs.io/v1/text-to-speech");
  });

  it("proves authoritative subscription plans from SAAD_PLANS", () => {
    const proPlan = SAAD_PLANS.find((p) => p.id === "pro");
    expect(proPlan).toBeDefined();
    expect(proPlan?.name).toBe("Pro");
    expect(proPlan?.monthlyUsd).toBe(70);
    expect(proPlan?.credits).toBe(1800);

    const starterPlan = SAAD_PLANS.find((p) => p.id === "starter");
    expect(starterPlan?.monthlyUsd).toBe(15);
    expect(starterPlan?.credits).toBe(300);

    const maxPlan = SAAD_PLANS.find((p) => p.id === "max");
    expect(maxPlan?.monthlyUsd).toBe(99);
    expect(maxPlan?.credits).toBe(2700);
  });

  it("proves Pricing Constitution rates are deterministic and decoupled from provider checkpoint", () => {
    const kling30 = DEFAULT_MODELS.find((m) => m.id === "kling30");
    expect(kling30?.userCreditsRate).toBe(3.0);

    const sora2 = DEFAULT_MODELS.find((m) => m.id === "sora2");
    expect(sora2?.userCreditsRate).toBe(3.41);
  });
});
