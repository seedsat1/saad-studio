import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import prismadb from "@/lib/prismadb";
import { parseClientDevice, ALLOWED_TELEMETRY_CODES } from "@/lib/mobile/mobile-control-plane";

// In-memory sliding rate limiter (Max 30 events per minute per client key)
const rateLimitMap = new Map<string, { count: number; expiresAt: number }>();

function isRateLimited(key: string, limit = 30, windowMs = 60_000): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(key);

  if (!entry || now > entry.expiresAt) {
    rateLimitMap.set(key, { count: 1, expiresAt: now + windowMs });
    return false;
  }

  if (entry.count >= limit) {
    return true;
  }

  entry.count++;
  return false;
}

// Clean up stale rate limit entries periodically
if (typeof setInterval !== "undefined") {
  setInterval(() => {
    const now = Date.now();
    rateLimitMap.forEach((entry, key) => {
      if (now > entry.expiresAt) {
        rateLimitMap.delete(key);
      }
    });
  }, 120_000);
}

// Strict metadata sanitizer to strip sensitive PII, tokens, and media bytes
function sanitizeMetadata(input: unknown): Record<string, unknown> | null {
  if (!input || typeof input !== "object" || Array.isArray(input)) return null;

  const sanitized: Record<string, unknown> = {};
  const blockedKeys = /token|password|auth|secret|cookie|key|authorization|bearer|prompt|byte|base64|data:/i;

  for (const [k, v] of Object.entries(input as Record<string, unknown>)) {
    if (blockedKeys.test(k)) continue;

    if (typeof v === "string") {
      // Don't store long strings or data URLs
      if (v.startsWith("data:") || v.length > 500) {
        sanitized[k] = v.slice(0, 500) + "...";
      } else {
        sanitized[k] = v;
      }
    } else if (typeof v === "number" || typeof v === "boolean" || v === null) {
      sanitized[k] = v;
    }
  }

  return Object.keys(sanitized).length > 0 ? sanitized : null;
}

export async function POST(req: NextRequest) {
  try {
    // 1. Identify Client & Apply Rate Limiting
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "anonymous";
    let userId: string | null = null;
    try {
      const session = auth();
      userId = session.userId || null;
    } catch {
      // Anonymous / pre-auth telemetry allowed
    }

    const rateKey = userId ? `user:${userId}` : `ip:${ip}`;
    if (isRateLimited(rateKey, 40, 60_000)) {
      return NextResponse.json({ ok: false, message: "Rate limit exceeded" }, { status: 429 });
    }

    // 2. Payload size & JSON parsing
    const body = await req.json().catch(() => null);
    if (!body || typeof body !== "object") {
      return NextResponse.json({ ok: false, error: "Invalid JSON" }, { status: 400 });
    }

    const {
      route = "/",
      feature = "unknown",
      operation = "unknown",
      status = "SUCCESS",
      errorCode,
      httpStatus,
      durationMs,
      generationId,
      metadata,
    } = body;

    // 3. Validate Status and Event Code
    const cleanStatus = status === "FAILURE" || status === "DEGRADED" ? status : "SUCCESS";
    const cleanErrorCode = typeof errorCode === "string" && ALLOWED_TELEMETRY_CODES.has(errorCode)
      ? errorCode
      : cleanStatus === "FAILURE" ? "UNKNOWN_ERROR" : null;

    // 4. Derive Device & Browser context from server-side User-Agent
    const userAgent = req.headers.get("user-agent");
    const parsedDevice = parseClientDevice(userAgent);

    // 5. Ingest into append-only MobileTelemetryEvent table
    await prismadb.mobileTelemetryEvent.create({
      data: {
        userId,
        route: String(route).slice(0, 100),
        feature: String(feature).slice(0, 50),
        operation: String(operation).slice(0, 50),
        status: cleanStatus,
        deviceClass: parsedDevice.deviceClass,
        browser: parsedDevice.browser,
        os: parsedDevice.os,
        errorCode: cleanErrorCode,
        httpStatus: typeof httpStatus === "number" ? httpStatus : undefined,
        durationMs: typeof durationMs === "number" ? Math.max(0, Math.min(300_000, durationMs)) : undefined,
        generationId: typeof generationId === "string" ? generationId.slice(0, 100) : undefined,
        metadata: (sanitizeMetadata(metadata) as any) ?? undefined,
      },
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    // Fail-safe: telemetry errors must never crash client flows
    console.warn("[telemetry/mobile] Ingestion failed safely:", error);
    return NextResponse.json({ ok: true, note: "swallowed" });
  }
}
