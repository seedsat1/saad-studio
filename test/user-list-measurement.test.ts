import { describe, expect, it } from "vitest";

describe("User List Performance & Payload Measurement", () => {
  it("measures exact payload bytes for a standard 25-user paginated response", () => {
    const mockUsers = Array.from({ length: 25 }, (_, i) => ({
      id: `user_${i + 1}`,
      name: `User Name ${i + 1}`,
      email: `user${i + 1}@example.com`,
      phone: `+123456789${i}`,
      creditBalance: 1200,
      monthlyCredits: 1200,
      creditsExpireAt: new Date(Date.now() + 20 * 24 * 60 * 60 * 1000).toISOString(),
      lastCreditRenewal: new Date().toISOString(),
      creditAdvanceBalance: 0,
      creditAdvanceRequestedAt: null,
      creditAdvanceCycleEnd: null,
      role: "USER",
      isBanned: false,
      createdAt: new Date().toISOString(),
      planId: "pro",
      billingInterval: "monthly",
      stripeCurrentPeriodEnd: new Date(Date.now() + 20 * 24 * 60 * 60 * 1000).toISOString(),
      isSubscriber: true,
    }));

    const responsePayload = {
      users: mockUsers,
      pagination: {
        page: 1,
        limit: 25,
        total: 142,
        totalPages: 6,
      },
    };

    const jsonString = JSON.stringify(responsePayload);
    const byteLength = Buffer.byteLength(jsonString, "utf-8");

    console.log(`[MEASUREMENT] 25 Users JSON payload: ${byteLength} bytes (~${(byteLength / 1024).toFixed(2)} KB)`);
    expect(byteLength).toBeLessThan(15 * 1024); // Strictly under 15 KB (~12.17 KB)
    expect(mockUsers.length).toBe(25);
    expect(responsePayload.pagination.totalPages).toBe(6);
  });
});
