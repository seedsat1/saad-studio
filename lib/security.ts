import type { NextRequest } from "next/server";

const PRIVATE_HOST_PATTERNS = [
  /^localhost$/i,
  /^127\./,
  /^10\./,
  /^172\.(1[6-9]|2\d|3[0-1])\./,
  /^192\.168\./,
  /^169\.254\./,
  /^0\./,
  /\.local$/i,
  /^::1$/,
  /^fc/i,
  /^fd/i,
];

function isPrivateHost(hostname: string): boolean {
  const h = hostname.trim().toLowerCase();
  if (!h) return true;
  return PRIVATE_HOST_PATTERNS.some((pattern) => pattern.test(h));
}

export function isSafePublicHttpUrl(input: string): boolean {
  try {
    const url = new URL(input);
    if (!["http:", "https:"].includes(url.protocol)) return false;
    if (isPrivateHost(url.hostname)) return false;
    return true;
  } catch {
    return false;
  }
}

export function getClientIp(req: NextRequest | Request): string {
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) {
    const first = forwarded.split(",")[0]?.trim();
    if (first) return first;
  }
  return req.headers.get("x-real-ip") || "0.0.0.0";
}

export function getAllowedOrigins(): string[] {
  const defaults = ["https://saadstudio.app", "https://www.saadstudio.app", "http://localhost:3000"];
  const raw = process.env.ALLOWED_ORIGINS;
  if (!raw?.trim()) return defaults;
  const custom = raw.split(",").map((v) => v.trim()).filter(Boolean);
  return custom.length ? custom : defaults;
}

export function isAllowedOrigin(origin: string | null): boolean {
  if (!origin) return true;
  return getAllowedOrigins().includes(origin);
}

export function sanitizePrompt(input: string, maxLen = 5000): string {
  return input.replace(/\s+/g, " ").trim().slice(0, maxLen);
}

export function sanitizePlainText(input: string, maxLen = 500): string {
  return input
    .replace(/[<>]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, maxLen);
}
