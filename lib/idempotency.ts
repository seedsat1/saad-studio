import crypto from "crypto";
import prismadb from "@/lib/prismadb";
import { Prisma } from "@prisma/client";

export type IdempotencyBeginResult =
  | { kind: "none" }
  | { kind: "replay"; responseStatus: number; responseJson: unknown; generationId: string | null }
  | { kind: "in_progress"; generationId: string | null }
  | { kind: "created"; key: string; requestHash: string };

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

export async function beginIdempotency(input: {
  userId: string;
  route: string;
  key: string | null;
  requestHash: string;
}): Promise<IdempotencyBeginResult> {
  if (!input.key) return { kind: "none" };

  const existing = await prismadb.apiIdempotency.findUnique({
    where: {
      userId_route_key: {
        userId: input.userId,
        route: input.route,
        key: input.key,
      },
    },
    select: {
      requestHash: true,
      generationId: true,
      responseStatus: true,
      responseJson: true,
    },
  });

  if (existing) {
    if (existing.requestHash !== input.requestHash) {
      throw new Error("Idempotency-Key conflict: request payload does not match the original request.");
    }
    if (existing.responseStatus != null && existing.responseJson != null) {
      return {
        kind: "replay",
        responseStatus: existing.responseStatus,
        responseJson: existing.responseJson,
        generationId: existing.generationId ?? null,
      };
    }
    return { kind: "in_progress", generationId: existing.generationId ?? null };
  }

  try {
    await prismadb.apiIdempotency.create({
      data: {
        userId: input.userId,
        route: input.route,
        key: input.key,
        requestHash: input.requestHash,
      },
    });
    return { kind: "created", key: input.key, requestHash: input.requestHash };
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      const raced = await prismadb.apiIdempotency.findUnique({
        where: {
          userId_route_key: {
            userId: input.userId,
            route: input.route,
            key: input.key,
          },
        },
        select: {
          requestHash: true,
          generationId: true,
          responseStatus: true,
          responseJson: true,
        },
      });
      if (raced && raced.requestHash === input.requestHash) {
        if (raced.responseStatus != null && raced.responseJson != null) {
          return {
            kind: "replay",
            responseStatus: raced.responseStatus,
            responseJson: raced.responseJson,
            generationId: raced.generationId ?? null,
          };
        }
        return { kind: "in_progress", generationId: raced.generationId ?? null };
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
}): Promise<void> {
  if (!input.key) return;
  await prismadb.apiIdempotency.update({
    where: {
      userId_route_key: { userId: input.userId, route: input.route, key: input.key },
    },
    data: { generationId: input.generationId },
  });
}

export async function completeIdempotency(input: {
  userId: string;
  route: string;
  key: string | null;
  generationId: string | null;
  responseStatus: number;
  responseJson: unknown;
}): Promise<void> {
  if (!input.key) return;
  await prismadb.apiIdempotency.update({
    where: {
      userId_route_key: { userId: input.userId, route: input.route, key: input.key },
    },
    data: {
      generationId: input.generationId ?? undefined,
      responseStatus: input.responseStatus,
      responseJson: input.responseJson as Prisma.InputJsonValue,
    },
  });
}

