import { NextResponse } from "next/server";

type Entry = {
  count: number;
  resetAt: number;
};

const store = new Map<string, Entry>();

function now() {
  return Date.now();
}

function cleanupExpired(current: number) {
  if (store.size < 5000) return;
  store.forEach((value, key) => {
    if (value.resetAt <= current) {
      store.delete(key);
    }
  });
}

export function getRequestIp(headers: Headers): string {
  const forwarded = headers.get("x-forwarded-for");
  if (forwarded) {
    const first = forwarded.split(",")[0]?.trim();
    if (first) return first;
  }
  return headers.get("x-real-ip")?.trim() || "unknown";
}

export function hitRateLimit(input: {
  key: string;
  limit: number;
  windowMs: number;
}): { allowed: true; remaining: number; resetAt: number } | { allowed: false; retryAfterSec: number; resetAt: number } {
  const current = now();
  cleanupExpired(current);

  const prev = store.get(input.key);
  if (!prev || prev.resetAt <= current) {
    const resetAt = current + input.windowMs;
    store.set(input.key, { count: 1, resetAt });
    return { allowed: true, remaining: Math.max(0, input.limit - 1), resetAt };
  }

  if (prev.count >= input.limit) {
    return {
      allowed: false,
      retryAfterSec: Math.max(1, Math.ceil((prev.resetAt - current) / 1000)),
      resetAt: prev.resetAt,
    };
  }

  prev.count += 1;
  store.set(input.key, prev);
  return { allowed: true, remaining: Math.max(0, input.limit - prev.count), resetAt: prev.resetAt };
}

export function panelRateLimitResponse(retryAfterSec: number) {
  return NextResponse.json(
    { error: "Too many requests. Please wait and try again." },
    {
      status: 429,
      headers: {
        "Retry-After": String(retryAfterSec),
      },
    },
  );
}
