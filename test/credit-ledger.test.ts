import { describe, it, expect, vi, beforeEach } from "vitest";

const {
  mockUserFindUnique,
  mockUserUpdate,
  mockUserUpdateMany,
  mockUserSubscriptionFindUnique,
  mockGenerationUpdate,
  mockCreditLedgerEntryCreate,
} = vi.hoisted(() => {
  return {
    mockUserFindUnique: vi.fn(async () => null),
    mockUserUpdate: vi.fn(async () => ({})),
    mockUserUpdateMany: vi.fn(async () => ({ count: 1 })),
    mockUserSubscriptionFindUnique: vi.fn(async () => null),
    mockGenerationUpdate: vi.fn(async () => ({})),
    mockCreditLedgerEntryCreate: vi.fn(async () => ({})),
  };
});

const tx = {
  user: {
    findUnique: mockUserFindUnique,
    findMany: vi.fn(async () => []),
    update: mockUserUpdate,
    updateMany: mockUserUpdateMany,
  },
  userSubscription: {
    findUnique: mockUserSubscriptionFindUnique,
    findMany: vi.fn(async () => []),
  },
  generation: {
    findUnique: vi.fn(async () => ({ id: "g1", cost: 10, isFlagged: false })),
    update: mockGenerationUpdate,
  },
  creditLedgerEntry: {
    create: mockCreditLedgerEntryCreate,
  },
};

vi.mock("@/lib/prismadb", () => {
  return {
    default: {
      $transaction: async (fn: any) => await fn(tx),
      generation: {
        update: vi.fn(async () => ({})),
        updateMany: vi.fn(async () => ({})),
        findUnique: vi.fn(async () => null),
        findMany: vi.fn(async () => []),
      },
      providerUsageRecord: {
        updateMany: vi.fn(async () => ({})),
      },
      user: {
        findUnique: mockUserFindUnique,
        findMany: vi.fn(async () => []),
        update: mockUserUpdate,
        updateMany: mockUserUpdateMany,
      },
      userSubscription: {
        findUnique: mockUserSubscriptionFindUnique,
        findMany: vi.fn(async () => []),
      },
      creditLedgerEntry: {
        create: mockCreditLedgerEntryCreate,
      },
    },
  };
});

vi.mock("@clerk/nextjs/server", () => {
  return {
    clerkClient: async () => ({
      users: {
        getUser: vi.fn(async () => null),
      },
    }),
  };
});

import prismadb from "@/lib/prismadb";
import {
  CreditAdvanceError,
  keywordBlocksPrompt,
  precheckGenerationPolicy,
  refundGenerationCharge,
  requestAnnualCreditAdvance,
  setActualProviderUsage,
  setGenerationCompletedWithoutMedia,
} from "@/lib/credit-ledger";

describe("credit-ledger policy + refunds", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.GENERATION_PRECHECK_ENABLED = "1";
    delete process.env.OPENAI_API_KEY;
  });

  it("keywordBlocksPrompt detects explicit terms (EN + AR)", () => {
    expect(keywordBlocksPrompt("a nude portrait")).toBe(true);
    expect(keywordBlocksPrompt("صورة عاري")).toBe(true);
    expect(keywordBlocksPrompt("a landscape photo")).toBe(false);
  });

  it("keywordBlocksPrompt allows cosmetic and fashion editing prompts", () => {
    expect(keywordBlocksPrompt("change her outfit to an elegant black dress")).toBe(false);
    expect(keywordBlocksPrompt("natural breast enhancement and body shaping for a fashion photo")).toBe(false);
    expect(keywordBlocksPrompt("fuller lips, makeup retouch, deep neckline, no visible nipples")).toBe(false);
    expect(keywordBlocksPrompt("rich nude-berry satin lipstick for a fashion portrait")).toBe(false);
  });

  it("precheckGenerationPolicy blocks keyword-matched prompts without charging", async () => {
    const res = await precheckGenerationPolicy({ prompt: "nude" });
    expect(res.allowed).toBe(false);
    if (!res.allowed) {
      expect(res.reason).toBe("keyword_blocked");
      expect(res.message).toContain("blocked");
    }
  });

  it("refundGenerationCharge is idempotent (no-op when generation cost is already 0)", async () => {
    tx.generation.findUnique.mockResolvedValueOnce({ id: "g1", cost: 0, isFlagged: false });
    await refundGenerationCharge("g1", "u1", 10, {
      reason: "generation_refund_provider_failed",
      clearMediaUrl: true,
    });
    expect(tx.user.update).not.toHaveBeenCalled();
    expect(tx.generation.update).not.toHaveBeenCalled();
  });

  it("refundGenerationCharge refunds exact credits and writes a ledger entry", async () => {
    tx.generation.findUnique.mockResolvedValueOnce({ id: "g1", cost: 10, isFlagged: false });
    await refundGenerationCharge("g1", "u1", 10, {
      reason: "generation_refund_provider_failed",
      clearMediaUrl: true,
    });
    expect(tx.user.update).toHaveBeenCalledWith({
      where: { id: "u1" },
      data: { creditBalance: { increment: 10 } },
    });
    expect(tx.generation.update).toHaveBeenCalledWith({
      where: { id: "g1" },
      data: { cost: 0, mediaUrl: null, outputUrl: null, status: "failed" },
    });
    expect(tx.creditLedgerEntry.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        userId: "u1",
        generationId: "g1",
        delta: 10,
        reason: "generation_refund_provider_failed",
        operationType: "refund",
        status: "settled",
      }),
    });
  });

  it("setActualProviderUsage records the provider that actually executed", async () => {
    await setActualProviderUsage("gen_1", {
      providerName: "WaveSpeed",
      providerModel: "bytedance/seedream-v5.0-pro",
      providerRequestId: "task_1",
      status: "completed",
    });

    expect(prismadb.generation.updateMany).toHaveBeenCalledWith({
      where: { id: "gen_1" },
      data: {
        providerName: "WaveSpeed",
        providerModel: "bytedance/seedream-v5.0-pro",
        providerRequestId: "task_1",
      },
    });
    expect(prismadb.providerUsageRecord.updateMany).toHaveBeenCalledWith({
      where: { generationId: "gen_1" },
      data: {
        providerName: "WaveSpeed",
        providerModel: "bytedance/seedream-v5.0-pro",
        providerRequestId: "task_1",
        status: "completed",
      },
    });
  });

  it("setGenerationCompletedWithoutMedia completes transcript-only generations without media", async () => {
    await setGenerationCompletedWithoutMedia("gen_transcript");

    expect(prismadb.generation.updateMany).toHaveBeenCalledWith({
      where: { id: "gen_transcript" },
      data: { status: "completed" },
    });
    expect(prismadb.providerUsageRecord.updateMany).toHaveBeenCalledWith({
      where: { generationId: "gen_transcript" },
      data: { status: "completed" },
    });
  });

  it("requestAnnualCreditAdvance blocks advance in the last 2 months", async () => {
    const now = Date.now();
    const mockUser = {
      id: "u1",
      creditBalance: 100,
      monthlyCredits: 1000,
      creditsExpireAt: new Date(now + 15 * 24 * 60 * 60 * 1000),
      creditAdvanceBalance: 0,
      creditAdvanceCycleEnd: null,
    };
    // 30 days from now (within the last 2 months/60 days of subscription)
    const mockSubscription = {
      billingInterval: "annual",
      planId: "pro",
      stripePriceId: "price_123",
      stripeCurrentPeriodEnd: new Date(now + 30 * 24 * 60 * 60 * 1000),
    };

    mockUserFindUnique.mockResolvedValue(mockUser);
    mockUserSubscriptionFindUnique.mockResolvedValue(mockSubscription);

    await expect(requestAnnualCreditAdvance("u1", 500)).rejects.toThrow(
      new CreditAdvanceError("last_two_months_restriction", "لا يمكن طلب السلفة خلال آخر شهرين من الاشتراك السنوي. (Credit advance is not available during the last two months of the annual subscription.)")
    );
  });

  it("requestAnnualCreditAdvance allows advance when not in the last 2 months", async () => {
    const now = Date.now();
    const mockUser = {
      id: "u1",
      creditBalance: 100,
      monthlyCredits: 1000,
      creditsExpireAt: new Date(now + 15 * 24 * 60 * 60 * 1000),
      creditAdvanceBalance: 0,
      creditAdvanceCycleEnd: null,
    };
    // 90 days from now (not in the last 2 months/60 days of subscription)
    const mockSubscription = {
      billingInterval: "annual",
      planId: "pro",
      stripePriceId: "price_123",
      stripeCurrentPeriodEnd: new Date(now + 90 * 24 * 60 * 60 * 1000),
    };

    let advanceBalance = 0;
    mockUserFindUnique.mockImplementation(async () => {
      return {
        ...mockUser,
        creditBalance: 100 + advanceBalance,
        creditAdvanceBalance: advanceBalance,
        creditAdvanceCycleEnd: advanceBalance > 0 ? mockUser.creditsExpireAt : null,
        creditAdvanceRequestedAt: advanceBalance > 0 ? new Date() : null,
      };
    });
    mockUserUpdateMany.mockImplementation(async () => {
      advanceBalance = 500;
      return { count: 1 };
    });
    mockUserSubscriptionFindUnique.mockResolvedValue(mockSubscription);

    const res = await requestAnnualCreditAdvance("u1", 500);
    expect(res.credited).toBe(500);
    expect(res.creditAdvanceBalance).toBe(500);
  });
});
