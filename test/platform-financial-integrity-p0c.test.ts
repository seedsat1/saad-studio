import fs from "fs";
import path from "path";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { Prisma } from "@prisma/client";

const {
  mockApiIdempotencyFindUnique,
  mockApiIdempotencyCreate,
  mockApiIdempotencyUpdate,
  mockApiIdempotencyFindMany,
  mockApiIdempotencyDeleteMany,
  mockCreditLedgerCreate,
} = vi.hoisted(() => ({
  mockApiIdempotencyFindUnique: vi.fn(),
  mockApiIdempotencyCreate: vi.fn(),
  mockApiIdempotencyUpdate: vi.fn(),
  mockApiIdempotencyFindMany: vi.fn(),
  mockApiIdempotencyDeleteMany: vi.fn(),
  mockCreditLedgerCreate: vi.fn(),
}));

vi.mock("@/lib/prismadb", () => ({
  default: {
    apiIdempotency: {
      findUnique: mockApiIdempotencyFindUnique,
      create: mockApiIdempotencyCreate,
      update: mockApiIdempotencyUpdate,
      findMany: mockApiIdempotencyFindMany,
      deleteMany: mockApiIdempotencyDeleteMany,
    },
  },
}));

vi.mock("@clerk/nextjs/server", () => ({
  clerkClient: async () => ({ users: { getUser: vi.fn(async () => null) } }),
}));

import {
  beginIdempotency,
  completeIdempotency,
  deleteExpiredFinalIdempotencyRecords,
  IdempotencyConflictError,
  IdempotencyRequiredError,
  IDEMPOTENCY_FINAL_RETENTION_MS,
  IDEMPOTENCY_HEARTBEAT_MS,
  IDEMPOTENCY_MAX_AUTO_ATTEMPTS,
  IDEMPOTENCY_PROCESSING_LEASE_MS,
  IDEMPOTENCY_RETRY_BACKOFF_MS,
} from "@/lib/idempotency";
import { CreditLedgerUnavailableError, tryCreateCreditLedgerEntry } from "@/lib/credit-ledger";

describe("P0-C platform financial integrity contracts", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("keeps owner-approved idempotency policy constants centralized", () => {
    expect(IDEMPOTENCY_PROCESSING_LEASE_MS).toBe(5 * 60 * 1000);
    expect(IDEMPOTENCY_HEARTBEAT_MS).toBe(60 * 1000);
    expect(IDEMPOTENCY_FINAL_RETENTION_MS).toBe(7 * 24 * 60 * 60 * 1000);
    expect(IDEMPOTENCY_RETRY_BACKOFF_MS).toEqual([2_000, 4_000, 8_000]);
    expect(IDEMPOTENCY_MAX_AUTO_ATTEMPTS).toBe(3);
  });

  it("fails closed when a paid idempotency key is missing", async () => {
    await expect(
      beginIdempotency({
        userId: "user_1",
        route: "generate:video",
        key: null,
        requestHash: "hash_1",
      }),
    ).rejects.toBeInstanceOf(IdempotencyRequiredError);
    expect(mockApiIdempotencyCreate).not.toHaveBeenCalled();
  });

  it("creates a processing lease for a new idempotency key", async () => {
    mockApiIdempotencyFindUnique.mockResolvedValueOnce(null);
    mockApiIdempotencyCreate.mockResolvedValueOnce({});

    const result = await beginIdempotency({
      userId: "user_1",
      route: "generate:video",
      key: "key_1",
      requestHash: "hash_1",
    });

    expect(result.kind).toBe("created");
    expect(mockApiIdempotencyCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        userId: "user_1",
        route: "generate:video",
        operationType: "generation",
        key: "key_1",
        requestHash: "hash_1",
        status: "processing",
        attemptCount: 1,
        processingLeaseExpiresAt: expect.any(Date),
        lastHeartbeatAt: expect.any(Date),
      }),
    });
  });

  it("preserves P2002 race handling without dispatching a duplicate operation", async () => {
    mockApiIdempotencyFindUnique
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({
        requestHash: "hash_1",
        generationId: "gen_1",
        responseStatus: null,
        responseJson: null,
        status: "processing",
      });
    mockApiIdempotencyCreate.mockRejectedValueOnce(
      new Prisma.PrismaClientKnownRequestError("unique", {
        code: "P2002",
        clientVersion: "test",
      }),
    );

    const result = await beginIdempotency({
      userId: "user_1",
      route: "generate:video",
      key: "key_1",
      requestHash: "hash_1",
    });

    expect(result).toEqual({ kind: "in_progress", generationId: "gen_1", status: "processing" });
  });

  it("rejects reused idempotency keys with a different payload hash", async () => {
    mockApiIdempotencyFindUnique.mockResolvedValueOnce({
      requestHash: "old_hash",
      generationId: null,
      responseStatus: null,
      responseJson: null,
      status: "processing",
      providerDispatchedAt: null,
    });

    await expect(
      beginIdempotency({
        userId: "user_1",
        route: "generate:video",
        key: "key_1",
        requestHash: "new_hash",
      }),
    ).rejects.toBeInstanceOf(IdempotencyConflictError);
  });

  it("marks successful responses completed with bounded final retention", async () => {
    mockApiIdempotencyUpdate.mockResolvedValueOnce({});

    await completeIdempotency({
      userId: "user_1",
      route: "generate:video",
      key: "key_1",
      generationId: "gen_1",
      responseStatus: 200,
      responseJson: { ok: true },
    });

    expect(mockApiIdempotencyUpdate).toHaveBeenCalledWith({
      where: {
        userId_route_operationType_key: {
          userId: "user_1",
          route: "generate:video",
          operationType: "generation",
          key: "key_1",
        },
      },
      data: expect.objectContaining({
        status: "completed",
        responseStatus: 200,
        responseJson: { ok: true },
        processingLeaseExpiresAt: null,
        expiresAt: expect.any(Date),
      }),
    });
  });

  it("cleanup only targets expired final idempotency records", async () => {
    mockApiIdempotencyFindMany.mockResolvedValueOnce([{ id: "idem_1" }, { id: "idem_2" }]);
    mockApiIdempotencyDeleteMany.mockResolvedValueOnce({ count: 2 });

    const result = await deleteExpiredFinalIdempotencyRecords(50);

    expect(result).toEqual({ scanned: 2, deleted: 2 });
    expect(mockApiIdempotencyFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          status: { in: ["completed", "failed_terminal", "expired"] },
          expiresAt: { lt: expect.any(Date) },
        }),
        take: 50,
      }),
    );
    expect(mockApiIdempotencyDeleteMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          id: { in: ["idem_1", "idem_2"] },
          status: { in: ["completed", "failed_terminal", "expired"] },
        }),
      }),
    );
  });

  it("credit ledger writes are mandatory and fail closed when the client is absent", async () => {
    await expect(
      tryCreateCreditLedgerEntry(
        {},
        {
          userId: "user_1",
          generationId: "gen_1",
          delta: -10,
          reason: "generation_charge",
        },
      ),
    ).rejects.toBeInstanceOf(CreditLedgerUnavailableError);
  });

  it("credit ledger entries include operation type and optional linkage fields", async () => {
    await tryCreateCreditLedgerEntry(
      { creditLedgerEntry: { create: mockCreditLedgerCreate } },
      {
        userId: "user_1",
        generationId: "gen_1",
        providerUsageRecordId: "usage_1",
        idempotencyKey: "idem_1",
        delta: -10,
        reason: "generation_charge",
      },
    );

    expect(mockCreditLedgerCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        userId: "user_1",
        generationId: "gen_1",
        providerUsageRecordId: "usage_1",
        idempotencyKey: "idem_1",
        delta: -10,
        reason: "generation_charge",
        operationType: "charge",
        status: "settled",
      }),
    });
  });

  it("credit reconciliation does not keep best-effort ledger writes", () => {
    const reconciler = fs.readFileSync(path.join(process.cwd(), "lib", "credit-reconciler.ts"), "utf-8");
    expect(reconciler).toContain("Credit ledger infrastructure is unavailable.");
    expect(reconciler).toContain('operationType: "reconcile"');
    expect(reconciler).not.toContain("Best effort ledger write");
  });
});
