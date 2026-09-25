import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { generatePanelToken } from "@/lib/panel-auth";

const {
  ensureUserRow,
  userFindUnique,
  subscriptionFindUnique,
  platformFindUnique,
} = vi.hoisted(() => ({
  ensureUserRow: vi.fn(),
  userFindUnique: vi.fn(),
  subscriptionFindUnique: vi.fn(),
  platformFindUnique: vi.fn(),
}));

vi.mock("@/lib/credit-ledger", () => ({
  ensureUserRow,
}));

vi.mock("@/lib/prismadb", () => ({
  default: {
    user: { findUnique: userFindUnique },
    userSubscription: { findUnique: subscriptionFindUnique },
    platformConfig: { findUnique: platformFindUnique },
  },
}));

import { GET } from "@/app/api/panel/agent-models/route";

function request(token?: string | null) {
  const headers = new Headers();
  if (token) headers.set("Authorization", `Bearer ${token}`);
  return new NextRequest("https://saad.test/api/panel/agent-models", { method: "GET", headers });
}

describe("GET /api/panel/agent-models", () => {
  beforeEach(() => {
    process.env.PANEL_TOKEN_SECRET = "test-panel-secret-key-1234567890-secure";
    process.env.NODE_ENV = "test";
    vi.clearAllMocks();
    ensureUserRow.mockResolvedValue({});
    userFindUnique.mockResolvedValue({ creditBalance: 4875, isBanned: false });
    subscriptionFindUnique.mockResolvedValue({
      planId: "podcast",
      stripeCurrentPeriodEnd: new Date(Date.now() - 86_400_000),
    });
    platformFindUnique.mockResolvedValue(null);
  });

  it("keeps ready Agent models available for an inactive subscription when the user is authenticated", async () => {
    const token = generatePanelToken("user_agent_catalog_inactive");
    const response = await GET(request(token));
    const json = await response.json();
    expect(response.status).toBe(200);
    expect(json.subscription.active).toBe(false);
    expect(json.subscription.planId).toBe("podcast");
    expect(json.models).toHaveLength(3);
    expect(json.models.every((model: any) => model.enabled === true)).toBe(true);
    expect(json.models.every((model: any) => model.available === true)).toBe(true);
    expect(json.models.every((model: any) => model.unavailableReason === null)).toBe(true);
    expect(json.models.find((model: any) => model.id === "gemini-2.5-flash")?.manualSelectable).toBe(true);
    expect(json.models.find((model: any) => model.id === "gemini-2.5-flash")?.autoSelectable).toBe(true);
    expect(json.models.find((model: any) => model.id === "gemini-2.5-pro")?.manualSelectable).toBe(true);
    expect(json.models.find((model: any) => model.id === "gemini-2.5-pro")?.autoSelectable).toBe(false);
    expect(json.models[0].creditPolicy.maximumCredits).toBe(4875);
  });

  it("keeps disabled/not-ready Agent models unavailable independent of subscription status", async () => {
    platformFindUnique.mockResolvedValue({
      value: JSON.stringify({ "gemini-2.5-flash": { enabled: false, runtimeStatus: "disabled" } }),
    });
    const token = generatePanelToken("user_agent_catalog_disabled");
    const response = await GET(request(token));
    const json = await response.json();
    const flash = json.models.find((model: any) => model.id === "gemini-2.5-flash");
    expect(response.status).toBe(200);
    expect(flash.enabled).toBe(false);
    expect(flash.available).toBe(false);
    expect(flash.unavailableReason).toBe("model_unavailable");
    expect(flash.manualSelectable).toBe(false);
    expect(flash.autoSelectable).toBe(false);
  });
});
