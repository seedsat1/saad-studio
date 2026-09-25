import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { generatePanelToken } from "@/lib/panel-auth";

const {
  ensureUserRow,
  handleCreditExpiry,
  spendCredits,
  countAgentInputTokens,
  runAgentGoogleCompletion,
  beginIdempotency,
  completeIdempotency,
  failIdempotency,
  markIdempotencyProviderDispatched,
  userFindUnique,
  subscriptionFindUnique,
  generationUpdate,
  usageUpdateMany,
  platformFindUnique,
} = vi.hoisted(() => ({
  ensureUserRow: vi.fn(),
  handleCreditExpiry: vi.fn(),
  spendCredits: vi.fn(),
  countAgentInputTokens: vi.fn(),
  runAgentGoogleCompletion: vi.fn(),
  beginIdempotency: vi.fn(),
  completeIdempotency: vi.fn(),
  failIdempotency: vi.fn(),
  markIdempotencyProviderDispatched: vi.fn(),
  userFindUnique: vi.fn(),
  subscriptionFindUnique: vi.fn(),
  generationUpdate: vi.fn(),
  usageUpdateMany: vi.fn(),
  platformFindUnique: vi.fn(),
}));

vi.mock("@/lib/credit-ledger", () => ({
  ensureUserRow,
  handleCreditExpiry,
  spendCredits,
  InsufficientCreditsError: class InsufficientCreditsError extends Error {
    constructor(public readonly currentBalance: number, public readonly requiredCredits: number) {
      super("Insufficient credits");
    }
  },
}));

vi.mock("@/lib/agent-google-provider", () => ({
  countAgentInputTokens,
  runAgentGoogleCompletion,
}));

vi.mock("@/lib/idempotency", () => ({
  hashRequestBody: (body: unknown) => JSON.stringify(body),
  idempotencyErrorResponse: () => null,
  beginIdempotency,
  completeIdempotency,
  failIdempotency,
  markIdempotencyProviderDispatched,
}));

vi.mock("@/lib/prismadb", () => ({
  default: {
    user: { findUnique: userFindUnique },
    userSubscription: { findUnique: subscriptionFindUnique },
    generation: { update: generationUpdate },
    providerUsageRecord: { updateMany: usageUpdateMany },
    platformConfig: { findUnique: platformFindUnique },
  },
}));

import { POST } from "@/app/api/panel/director/v1/chat/completions/route";

function request(body: unknown, token?: string | null, idempotencyKey = "idem_1") {
  const headers = new Headers({ "content-type": "application/json" });
  if (token) headers.set("Authorization", `Bearer ${token}`);
  headers.set("Idempotency-Key", idempotencyKey);
  return new NextRequest("https://saad.test/api/panel/director/v1/chat/completions", {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });
}

describe("POST /api/panel/director/v1/chat/completions", () => {
  beforeEach(() => {
    process.env.PANEL_TOKEN_SECRET = "test-panel-secret-key-1234567890-secure";
    process.env.NODE_ENV = "test";
    vi.clearAllMocks();
    ensureUserRow.mockResolvedValue({});
    handleCreditExpiry.mockResolvedValue(undefined);
    userFindUnique.mockResolvedValue({ creditBalance: 5, isBanned: false });
    subscriptionFindUnique.mockResolvedValue({
      planId: "starter",
      stripeCurrentPeriodEnd: new Date(Date.now() + 86_400_000),
    });
    platformFindUnique.mockResolvedValue(null);
    beginIdempotency.mockResolvedValue({ kind: "created", key: "idem_1", requestHash: "hash", attemptCount: 1 });
    completeIdempotency.mockResolvedValue(undefined);
    failIdempotency.mockResolvedValue("failed_terminal");
    markIdempotencyProviderDispatched.mockResolvedValue(undefined);
    countAgentInputTokens.mockResolvedValue(100);
    runAgentGoogleCompletion.mockResolvedValue({
      id: "google-test",
      text: "hello",
      toolCalls: [],
      usage: { inputTokens: 100, outputTokens: 25, totalTokens: 125 },
      rawFinishReason: "STOP",
      rawResponse: {},
    });
    spendCredits.mockResolvedValue({ generationId: "gen_1", remainingCredits: 4 });
    generationUpdate.mockResolvedValue({});
    usageUpdateMany.mockResolvedValue({ count: 1 });
  });

  it("rejects invalid auth before provider dispatch and before billing", async () => {
    const response = await POST(request({ model: "gemini-2.5-flash", messages: [{ role: "user", content: "hi" }] }, "ssp_bad"));
    expect(response.status).toBe(401);
    expect(countAgentInputTokens).not.toHaveBeenCalled();
    expect(runAgentGoogleCompletion).not.toHaveBeenCalled();
    expect(spendCredits).not.toHaveBeenCalled();
  });

  it("rejects insufficient credits before provider dispatch", async () => {
    userFindUnique.mockResolvedValue({ creditBalance: 0, isBanned: false });
    const token = generatePanelToken("user_agent_low");
    const response = await POST(request({ model: "gemini-2.5-flash", messages: [{ role: "user", content: "hi" }] }, token));
    expect(response.status).toBe(402);
    expect(beginIdempotency).not.toHaveBeenCalled();
    expect(countAgentInputTokens).not.toHaveBeenCalled();
    expect(runAgentGoogleCompletion).not.toHaveBeenCalled();
    expect(spendCredits).not.toHaveBeenCalled();
  });

  it("rejects disabled models before provider dispatch", async () => {
    platformFindUnique.mockResolvedValue({
      value: JSON.stringify({ "gemini-2.5-pro": { enabled: false, runtimeStatus: "disabled" } }),
    });
    const token = generatePanelToken("user_agent_disabled");
    const response = await POST(request({ model: "gemini-2.5-pro", messages: [{ role: "user", content: "hi" }] }, token));
    expect(response.status).toBe(403);
    expect(runAgentGoogleCompletion).not.toHaveBeenCalled();
    expect(spendCredits).not.toHaveBeenCalled();
  });

  it("uses the user balance as requestCreditCap when no admin cap is configured", async () => {
    userFindUnique.mockResolvedValue({ creditBalance: 5, isBanned: false });
    const token = generatePanelToken("user_agent_no_cap");
    const response = await POST(request({ model: "gemini-2.5-flash", messages: [{ role: "user", content: "hi" }] }, token));
    expect(response.status).toBe(200);
    expect(runAgentGoogleCompletion).toHaveBeenCalledWith(expect.objectContaining({
      maxOutputTokens: expect.any(Number),
    }));
    expect(runAgentGoogleCompletion.mock.calls[0][0].maxOutputTokens).toBeGreaterThan(50_000);
    expect(spendCredits.mock.calls[0][0].requestPayload.pricing.requestCreditCap).toBe(5);
  });

  it("uses min(user balance, configured model cap) when admin cap is configured", async () => {
    userFindUnique.mockResolvedValue({ creditBalance: 5, isBanned: false });
    platformFindUnique.mockResolvedValue({
      value: JSON.stringify({ "gemini-2.5-flash": { maxCreditsPerRequest: 2 } }),
    });
    const token = generatePanelToken("user_agent_configured_cap");
    const response = await POST(request({ model: "gemini-2.5-flash", messages: [{ role: "user", content: "hi" }] }, token));
    expect(response.status).toBe(200);
    expect(runAgentGoogleCompletion.mock.calls[0][0].maxOutputTokens).toBeLessThan(30_000);
    expect(spendCredits.mock.calls[0][0].requestPayload.pricing.requestCreditCap).toBe(2);
  });


  it("allows inactive subscriptions to reach authoritative credit preflight", async () => {
    subscriptionFindUnique.mockResolvedValue({
      planId: "podcast",
      stripeCurrentPeriodEnd: new Date(Date.now() - 86_400_000),
    });
    userFindUnique.mockResolvedValue({ creditBalance: 5, isBanned: false });
    const token = generatePanelToken("user_agent_inactive_with_credits");
    const response = await POST(request({ model: "gemini-2.5-flash", messages: [{ role: "user", content: "hi" }] }, token));
    const json = await response.json();
    expect(response.status).toBe(200);
    expect(JSON.stringify(json)).not.toContain("active_subscription_required");
    expect(countAgentInputTokens).toHaveBeenCalledTimes(1);
    expect(runAgentGoogleCompletion).toHaveBeenCalledTimes(1);
    expect(spendCredits).toHaveBeenCalledTimes(1);
  });

  it("runs credit reconciliation before provider dispatch and blocks expired/insufficient credits", async () => {
    userFindUnique.mockResolvedValue({ creditBalance: 5, isBanned: false });
    handleCreditExpiry.mockImplementation(async () => {
      userFindUnique.mockResolvedValue({ creditBalance: 0, isBanned: false });
    });
    subscriptionFindUnique.mockResolvedValue({
      planId: "podcast",
      stripeCurrentPeriodEnd: new Date(Date.now() - 86_400_000),
    });
    const token = generatePanelToken("user_agent_expired_credits");
    const response = await POST(request({ model: "gemini-2.5-flash", messages: [{ role: "user", content: "hi" }] }, token));
    const json = await response.json();
    expect(response.status).toBe(402);
    expect(json.error).toBe("Insufficient credits");
    expect(handleCreditExpiry).toHaveBeenCalledWith("user_agent_expired_credits");
    expect(beginIdempotency).not.toHaveBeenCalled();
    expect(countAgentInputTokens).not.toHaveBeenCalled();
    expect(runAgentGoogleCompletion).not.toHaveBeenCalled();
    expect(spendCredits).not.toHaveBeenCalled();
  });
  it("charges exactly once after authoritative usage and records existing ledger path", async () => {
    const token = generatePanelToken("user_agent_ok");
    const response = await POST(request({ model: "gemini-2.5-flash", messages: [{ role: "user", content: "hi" }] }, token));
    const json = await response.json();
    expect(response.status).toBe(200);
    expect(markIdempotencyProviderDispatched.mock.invocationCallOrder[0]).toBeLessThan(
      runAgentGoogleCompletion.mock.invocationCallOrder[0],
    );
    expect(spendCredits).toHaveBeenCalledTimes(1);
    expect(spendCredits).toHaveBeenCalledWith(expect.objectContaining({
      userId: "user_agent_ok",
      credits: 1,
      assetType: "AGENT_LLM",
      modelUsed: "gemini-2.5-flash",
      providerName: "Google",
      providerModel: "gemini-2.5-flash",
      providerTokens: 125,
      providerCostSource: "actual",
      idempotency: {
        route: "panel:director:v1:chat-completions",
        key: "idem_1",
        operationType: "agent_chat",
      },
    }));
    expect(json.billing.credits).toBe(1);
    expect(completeIdempotency).toHaveBeenCalledWith(expect.objectContaining({
      generationId: "gen_1",
      responseStatus: 200,
    }));
  });

  it("replays duplicate idempotency without a second provider call or debit", async () => {
    beginIdempotency.mockResolvedValue({
      kind: "replay",
      responseStatus: 200,
      responseJson: { id: "gen_existing", billing: { credits: 1 } },
      generationId: "gen_existing",
    });
    const token = generatePanelToken("user_agent_replay");
    const response = await POST(request({ model: "gemini-2.5-flash", messages: [{ role: "user", content: "hi" }] }, token));
    const json = await response.json();
    expect(response.status).toBe(200);
    expect(json.id).toBe("gen_existing");
    expect(runAgentGoogleCompletion).not.toHaveBeenCalled();
    expect(spendCredits).not.toHaveBeenCalled();
  });
});

