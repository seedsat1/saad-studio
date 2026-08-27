import crypto from "crypto";
import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import prismadb from "@/lib/prismadb";

export const IDEMPOTENCY_PROCESSING_LEASE_MS = Number(process.env.IDEMPOTENCY_PROCESSING_LEASE_MS ?? 5 * 60 * 1000);
export const IDEMPOTENCY_HEARTBEAT_MS = Number(process.env.IDEMPOTENCY_HEARTBEAT_MS ?? 60 * 1000);
export const IDEMPOTENCY_FINAL_RETENTION_MS = Number(process.env.IDEMPOTENCY_FINAL_RETENTION_MS ?? 7 * 24 * 60 * 60 * 1000);
export const IDEMPOTENCY_RETRY_BACKOFF_MS = [2_000, 4_000, 8_000] as const;
export const IDEMPOTENCY_MAX_AUTO_ATTEMPTS = 3;

export type ApiIdempotencyStatus =
  | "new"
  | "processing"
  | "completed"
  | "failed_retryable"
  | "failed_terminal"
  | "review_required"
  | "expired";

export type IdempotencyBeginResult =
  | { kind: "replay"; responseStatus: number; responseJson: unknown; generationId: string | null }
  | { kind: "in_progress"; generationId: string | null; status: ApiIdempotencyStatus }
  | { kind: "created"; key: string; requestHash: string; attemptCount: number };

class IdempotencyError extends Error {
  constructor(
    public readonly code: string,
    public readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = "IdempotencyError";
  }
}

export class IdempotencyRequiredError extends IdempotencyError {
  constructor() {
    super("idempotency_required", 428, "Idempotency-Key header is required for paid generation requests.");
    this.name = "IdempotencyRequiredError";
  }
}

export class IdempotencyUnavailableError extends IdempotencyError {
  constructor() {
    super("idempotency_unavailable", 503, "Idempotency infrastructure is unavailable.");
    this.name = "IdempotencyUnavailableError";
  }
}

export class IdempotencyConflictError extends IdempotencyError {
  constructor() {
    super("idempotency_conflict", 409, "Idempotency-Key conflict: request payload does not match the original request.");
    this.name = "IdempotencyConflictError";
  }
}

export class IdempotencyReviewRequiredError extends IdempotencyError {
  constructor() {
    super("idempotency_review_required", 409, "The original request has an uncertain provider state and requires manual review.");
    this.name = "IdempotencyReviewRequiredError";
  }
}

function idempotencyClient() {
  const client = (prismadb as unknown as { apiIdempotency?: any }).apiIdempotency;
  if (!client) throw new IdempotencyUnavailableError();
  return client;
}

function leaseExpiresAt(now = Date.now()): Date {
  return new Date(now + IDEMPOTENCY_PROCESSING_LEASE_MS);
}

function finalExpiresAt(now = Date.now()): Date {
  return new Date(now + IDEMPOTENCY_FINAL_RETENTION_MS);
}

function isFinalStatus(status: ApiIdempotencyStatus): boolean {
  return ["completed", "failed_terminal", "expired"].includes(status);
}

function retryReadyAt(failedAt: Date | string | null | undefined, attemptCount: number): Date {
  const backoffIndex = Math.max(0, Math.min(IDEMPOTENCY_RETRY_BACKOFF_MS.length - 1, attemptCount - 1));
  const base = failedAt ? new Date(failedAt).getTime() : 0;
  return new Date(base + IDEMPOTENCY_RETRY_BACKOFF_MS[backoffIndex]);
}

export function getIdempotencyKey(headers: Headers): string | null {
  const raw = headers.get("idempotency-key");
  if (!raw) return null;
  const key = raw.trim();
  if (!key) return null;
  if (key.length > 200) return key.slice(0, 200);
  return key;
}

export function hashRequestBody(body: unknown): string {
  const raw = JSON.stringify(body ?? null);
  return crypto.createHash("sha256").update(raw).digest("hex");
}

export function idempotencyErrorResponse(error: unknown): NextResponse | null {
  if (!(error instanceof IdempotencyError)) return null;
  return NextResponse.json(
    {
      error: error.message,
      code: error.code,
    },
    { status: error.status },
  );
}

export function classifyIdempotencyFailure(error: unknown): {
  status: Extract<ApiIdempotencyStatus, "failed_retryable" | "failed_terminal" | "review_required">;
  code: string;
  message: string;
} {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    return { status: "failed_terminal", code: error.code, message: error.message };
  }
  const message = error instanceof Error ? error.message : "Unknown error";
  const lower = message.toLowerCase();
  if (lower.includes("timeout") || lower.includes("rate limit") || lower.includes("429")) {
    return { status: "failed_retryable", code: "retryable_error", message };
  }
  if (lower.includes("provider state unknown") || lower.includes("dispatch uncertain")) {
    return { status: "review_required", code: "provider_state_unknown", message };
  }
  return { status: "failed_terminal", code: "terminal_error", message };
}

export async function beginIdempotency(input: {
  userId: string;
  route: string;
  key: string | null;
  requestHash: string;
  operationType?: string;
}): Promise<IdempotencyBeginResult> {
  if (!input.key) throw new IdempotencyRequiredError();

  const client = idempotencyClient();
  const operationType = input.operationType ?? "generation";

  const existing = await client.findUnique({
    where: {
      userId_route_operationType_key: {
        userId: input.userId,
        route: input.route,
        operationType,
        key: input.key,
      },
    },
    select: {
      requestHash: true,
      generationId: true,
      responseStatus: true,
      responseJson: true,
      status: true,
      providerDispatchedAt: true,
      processingLeaseExpiresAt: true,
      attemptCount: true,
      failedAt: true,
    },
  });

  if (existing) {
    if (existing.requestHash !== input.requestHash) {
      throw new IdempotencyConflictError();
    }
    if (existing.responseStatus != null && existing.responseJson != null && existing.status === "completed") {
      return {
        kind: "replay",
        responseStatus: existing.responseStatus,
        responseJson: existing.responseJson,
        generationId: existing.generationId ?? null,
      };
    }

    if (existing.status === "review_required" || existing.providerDispatchedAt) {
      if (existing.status !== "review_required") {
        await client.update({
          where: {
            userId_route_operationType_key: {
              userId: input.userId,
              route: input.route,
              operationType,
              key: input.key,
            },
          },
          data: {
            status: "review_required",
            errorCode: "provider_state_unknown",
            errorMessage: "Provider dispatch state is uncertain and requires manual review.",
            processingLeaseExpiresAt: null,
            failedAt: new Date(),
          },
        });
      }
      throw new IdempotencyReviewRequiredError();
    }

    const now = new Date();
    const currentAttemptCount = Math.max(0, Number(existing.attemptCount ?? 0));
    const status = (existing.status ?? "processing") as ApiIdempotencyStatus;

    if (status === "failed_retryable") {
      if (currentAttemptCount >= IDEMPOTENCY_MAX_AUTO_ATTEMPTS) {
        await client.update({
          where: {
            userId_route_operationType_key: {
              userId: input.userId,
              route: input.route,
              operationType,
              key: input.key,
            },
          },
          data: {
            status: "failed_terminal",
            processingLeaseExpiresAt: null,
            expiresAt: finalExpiresAt(),
          },
        });
        return {
          kind: "in_progress",
          generationId: existing.generationId ?? null,
          status: "failed_terminal",
        };
      }

      if (retryReadyAt(existing.failedAt, currentAttemptCount) > now) {
        return {
          kind: "in_progress",
          generationId: existing.generationId ?? null,
          status,
        };
      }

      const reclaimed = await client.updateMany({
        where: {
          userId: input.userId,
          route: input.route,
          operationType,
          key: input.key,
          requestHash: input.requestHash,
          status: "failed_retryable",
          providerDispatchedAt: null,
          attemptCount: currentAttemptCount,
        },
        data: {
          status: "processing",
          attemptCount: { increment: 1 },
          processingLeaseExpiresAt: leaseExpiresAt(),
          lastHeartbeatAt: now,
          failedAt: null,
          errorCode: null,
          errorMessage: null,
        },
      });
      if ((reclaimed.count ?? 0) === 1) {
        return { kind: "created", key: input.key, requestHash: input.requestHash, attemptCount: currentAttemptCount + 1 };
      }
      return {
        kind: "in_progress",
        generationId: existing.generationId ?? null,
        status,
      };
    }

    if (status === "processing") {
      const leaseExpired = !existing.processingLeaseExpiresAt || new Date(existing.processingLeaseExpiresAt) <= now;
      if (leaseExpired) {
        const reclaimed = await client.updateMany({
          where: {
            userId: input.userId,
            route: input.route,
            operationType,
            key: input.key,
            requestHash: input.requestHash,
            status: "processing",
            providerDispatchedAt: null,
            OR: [
              { processingLeaseExpiresAt: { lte: now } },
              { processingLeaseExpiresAt: null },
            ],
          },
          data: {
            attemptCount: { increment: 1 },
            processingLeaseExpiresAt: leaseExpiresAt(),
            lastHeartbeatAt: now,
          },
        });
        if ((reclaimed.count ?? 0) === 1) {
          return { kind: "created", key: input.key, requestHash: input.requestHash, attemptCount: currentAttemptCount + 1 };
        }
      }
    }

    return {
      kind: "in_progress",
      generationId: existing.generationId ?? null,
      status,
    };
  }

  try {
    await client.create({
      data: {
        userId: input.userId,
        route: input.route,
        operationType,
        key: input.key,
        requestHash: input.requestHash,
        status: "processing",
        attemptCount: 1,
        processingLeaseExpiresAt: leaseExpiresAt(),
        lastHeartbeatAt: new Date(),
      },
    });
    return { kind: "created", key: input.key, requestHash: input.requestHash, attemptCount: 1 };
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      const raced = await client.findUnique({
        where: {
          userId_route_operationType_key: {
            userId: input.userId,
            route: input.route,
            operationType,
            key: input.key,
          },
        },
        select: {
          requestHash: true,
          generationId: true,
          responseStatus: true,
          responseJson: true,
          status: true,
          providerDispatchedAt: true,
        },
      });
      if (raced && raced.requestHash === input.requestHash) {
        if (raced.responseStatus != null && raced.responseJson != null && raced.status === "completed") {
          return {
            kind: "replay",
            responseStatus: raced.responseStatus,
            responseJson: raced.responseJson,
            generationId: raced.generationId ?? null,
          };
        }
        if (raced.status === "review_required" || raced.providerDispatchedAt) {
          throw new IdempotencyReviewRequiredError();
        }
        return {
          kind: "in_progress",
          generationId: raced.generationId ?? null,
          status: (raced.status ?? "processing") as ApiIdempotencyStatus,
        };
      }
    }
    throw err;
  }
}

export async function attachIdempotencyGeneration(input: {
  userId: string;
  route: string;
  key: string | null;
  generationId: string;
  operationType?: string;
}): Promise<void> {
  if (!input.key) throw new IdempotencyRequiredError();
  const client = idempotencyClient();
  await client.update({
    where: {
      userId_route_operationType_key: {
        userId: input.userId,
        route: input.route,
        operationType: input.operationType ?? "generation",
        key: input.key,
      },
    },
    data: { generationId: input.generationId },
  });
}

export async function markIdempotencyProviderDispatched(input: {
  userId: string;
  route: string;
  key: string | null;
  generationId: string | null;
  operationType?: string;
}): Promise<void> {
  if (!input.key) throw new IdempotencyRequiredError();
  const client = idempotencyClient();
  await client.update({
    where: {
      userId_route_operationType_key: {
        userId: input.userId,
        route: input.route,
        operationType: input.operationType ?? "generation",
        key: input.key,
      },
    },
    data: {
      generationId: input.generationId ?? undefined,
      providerDispatchedAt: new Date(),
      lastHeartbeatAt: new Date(),
      processingLeaseExpiresAt: leaseExpiresAt(),
    },
  });
}

export async function heartbeatIdempotency(input: {
  userId: string;
  route: string;
  key: string | null;
  operationType?: string;
}): Promise<void> {
  if (!input.key) throw new IdempotencyRequiredError();
  const client = idempotencyClient();
  await client.update({
    where: {
      userId_route_operationType_key: {
        userId: input.userId,
        route: input.route,
        operationType: input.operationType ?? "generation",
        key: input.key,
      },
    },
    data: {
      status: "processing",
      lastHeartbeatAt: new Date(),
      processingLeaseExpiresAt: leaseExpiresAt(),
    },
  });
}

export async function completeIdempotency(input: {
  userId: string;
  route: string;
  key: string | null;
  generationId: string | null;
  responseStatus: number;
  responseJson: unknown;
  operationType?: string;
}): Promise<void> {
  if (!input.key) throw new IdempotencyRequiredError();
  const client = idempotencyClient();
  const finalStatus: ApiIdempotencyStatus = input.responseStatus >= 400 ? "failed_terminal" : "completed";

  await client.update({
    where: {
      userId_route_operationType_key: {
        userId: input.userId,
        route: input.route,
        operationType: input.operationType ?? "generation",
        key: input.key,
      },
    },
    data: {
      status: finalStatus,
      generationId: input.generationId ?? undefined,
      responseStatus: input.responseStatus,
      responseJson: input.responseJson as Prisma.InputJsonValue,
      completedAt: finalStatus === "completed" ? new Date() : null,
      failedAt: finalStatus !== "completed" ? new Date() : undefined,
      processingLeaseExpiresAt: null,
      expiresAt: isFinalStatus(finalStatus) ? finalExpiresAt() : undefined,
    },
  });
}

export async function failIdempotency(input: {
  userId: string;
  route: string;
  key: string | null;
  generationId: string | null;
  error?: unknown;
  errorMessage?: string;
  providerDispatched?: boolean;
  operationType?: string;
}): Promise<ApiIdempotencyStatus> {
  if (!input.key) throw new IdempotencyRequiredError();
  const client = idempotencyClient();
  const classified = input.providerDispatched
    ? {
        status: "review_required" as const,
        code: "provider_state_unknown",
        message: input.errorMessage ?? (input.error instanceof Error ? input.error.message : "Provider state unknown"),
      }
    : classifyIdempotencyFailure(input.errorMessage ?? input.error);

  await client.update({
    where: {
      userId_route_operationType_key: {
        userId: input.userId,
        route: input.route,
        operationType: input.operationType ?? "generation",
        key: input.key,
      },
    },
    data: {
      status: classified.status,
      generationId: input.generationId ?? undefined,
      errorCode: classified.code,
      errorMessage: classified.message,
      failedAt: new Date(),
      processingLeaseExpiresAt: null,
      expiresAt: isFinalStatus(classified.status) ? finalExpiresAt() : undefined,
    },
  });

  return classified.status;
}

export async function deleteExpiredFinalIdempotencyRecords(limit = 500): Promise<{ scanned: number; deleted: number }> {
  const client = idempotencyClient();
  const now = new Date();
  const rows = await client.findMany({
    where: {
      status: { in: ["completed", "failed_terminal", "expired"] },
      expiresAt: { lt: now },
    },
    select: { id: true },
    take: Math.max(1, Math.min(1000, Math.floor(limit))),
    orderBy: { expiresAt: "asc" },
  });

  if (rows.length === 0) return { scanned: 0, deleted: 0 };

  const deleted = await client.deleteMany({
    where: {
      id: { in: rows.map((row: { id: string }) => row.id) },
      status: { in: ["completed", "failed_terminal", "expired"] },
      expiresAt: { lt: now },
    },
  });

  return { scanned: rows.length, deleted: deleted.count ?? 0 };
}
