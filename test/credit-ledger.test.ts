import { describe, it, expect, vi, beforeEach } from "vitest";

const tx = {
  user: {
    update: vi.fn(async () => ({})),
  },
  generation: {
    findUnique: vi.fn(async () => ({ id: "g1", cost: 10, isFlagged: false })),
    update: vi.fn(async () => ({})),
  },
  creditLedgerEntry: {
    create: vi.fn(async () => ({})),
  },
};

vi.mock("@/lib/prismadb", () => {
  return {
    default: {
      $transaction: async (fn: any) => await fn(tx),
      generation: {
        update: vi.fn(async () => ({})),
        findUnique: vi.fn(async () => null),
        findMany: vi.fn(async () => []),
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

import { keywordBlocksPrompt, precheckGenerationPolicy, refundGenerationCharge } from "@/lib/credit-ledger";

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
      data: { cost: 0, mediaUrl: null },
    });
    expect(tx.creditLedgerEntry.create).toHaveBeenCalledWith({
      data: { userId: "u1", generationId: "g1", delta: 10, reason: "generation_refund_provider_failed" },
    });
  });
});
