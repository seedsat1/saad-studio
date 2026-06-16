import crypto from "crypto";

export type ZainCashJwtPayload = Record<string, unknown> & {
  exp?: number;
  iat?: number;
};

export type ZainCashPaymentKind = "plan" | "topup";

export type ZainCashPaymentMeta = {
  orderId: string;
  orderType: ZainCashPaymentKind;
  planId?: string | null;
  planLabel?: string | null;
  billingCycle?: "monthly" | "annual" | null;
  topupId?: string | null;
  amountUsd: number;
  amountIqd: number;
  credits: number;
};

const DEFAULT_API_BASE = "https://pg-api.zaincash.iq";
const DEFAULT_PAY_BASE = "https://pg.zaincash.iq/transaction/pay";
const DEFAULT_IQD_PER_USD = 1320;

function base64UrlEncode(input: Buffer | string): string {
  return Buffer.from(input)
    .toString("base64")
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");
}

function base64UrlDecode(input: string): Buffer {
  const normalized = input.replace(/-/g, "+").replace(/_/g, "/");
  const padded = normalized.padEnd(normalized.length + ((4 - (normalized.length % 4)) % 4), "=");
  return Buffer.from(padded, "base64");
}

export function signZainCashJwt(payload: ZainCashJwtPayload, secret = getZainCashConfig().secret): string {
  const header = { alg: "HS256", typ: "JWT" };
  const encodedHeader = base64UrlEncode(JSON.stringify(header));
  const encodedPayload = base64UrlEncode(JSON.stringify(payload));
  const signingInput = `${encodedHeader}.${encodedPayload}`;
  const signature = crypto.createHmac("sha256", secret).update(signingInput).digest();
  return `${signingInput}.${base64UrlEncode(signature)}`;
}

export function verifyZainCashJwt(token: string, secret = getZainCashConfig().secret): ZainCashJwtPayload {
  const parts = token.split(".");
  if (parts.length !== 3) throw new Error("Invalid ZainCash token");

  const [encodedHeader, encodedPayload, encodedSignature] = parts;
  const signingInput = `${encodedHeader}.${encodedPayload}`;
  const expected = base64UrlEncode(crypto.createHmac("sha256", secret).update(signingInput).digest());

  const expectedBuffer = Buffer.from(expected);
  const actualBuffer = Buffer.from(encodedSignature);
  if (expectedBuffer.length !== actualBuffer.length || !crypto.timingSafeEqual(expectedBuffer, actualBuffer)) {
    throw new Error("Invalid ZainCash token signature");
  }

  const payload = JSON.parse(base64UrlDecode(encodedPayload).toString("utf8")) as ZainCashJwtPayload;
  if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) {
    throw new Error("Expired ZainCash token");
  }
  return payload;
}

export function getZainCashConfig() {
  const merchantId = process.env.ZAINCASH_MERCHANT_ID?.trim() || process.env.ZAINCASH_CLIENT_ID?.trim();
  const secret = process.env.ZAINCASH_SECRET?.trim() || process.env.ZAINCASH_CLIENT_SECRET?.trim();
  const msisdn = process.env.ZAINCASH_MSISDN?.trim();

  if (!merchantId || !secret || !msisdn) {
    throw new Error("ZainCash environment variables are not configured");
  }

  return {
    merchantId,
    secret,
    msisdn,
    apiBaseUrl: (process.env.ZAINCASH_API_BASE_URL || DEFAULT_API_BASE).replace(/\/$/, ""),
    payBaseUrl: (process.env.ZAINCASH_PAY_BASE_URL || DEFAULT_PAY_BASE).replace(/\/$/, ""),
    iqdPerUsd: Number(process.env.ZAINCASH_IQD_PER_USD || DEFAULT_IQD_PER_USD),
  };
}

export function usdToIqd(usd: number): number {
  const rate = getZainCashConfig().iqdPerUsd;
  if (!Number.isFinite(rate) || rate <= 0) throw new Error("Invalid ZainCash IQD exchange rate");
  return Math.max(250, Math.round(usd * rate));
}

export function buildZainCashReturnUrl(orderId: string): string {
  const origin = (process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_SITE_URL || "").replace(/\/$/, "");
  if (!origin) throw new Error("NEXT_PUBLIC_APP_URL is required for ZainCash redirects");
  return `${origin}/api/payments/zaincash/callback?order=${encodeURIComponent(orderId)}`;
}

export function buildZainCashPayUrl(transactionId: string): string {
  const { payBaseUrl } = getZainCashConfig();
  const separator = payBaseUrl.includes("?") ? "&" : "?";
  return `${payBaseUrl}${separator}id=${encodeURIComponent(transactionId)}`;
}

function stringFrom(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

export function extractZainCashTransactionId(input: unknown): string {
  const data = input as Record<string, unknown> | null | undefined;
  if (!data || typeof data !== "object") return "";
  return (
    stringFrom(data.id) ||
    stringFrom(data.transactionId) ||
    stringFrom(data.transaction_id) ||
    stringFrom(data.transactionID) ||
    stringFrom(data.paymentId) ||
    stringFrom(data.payment_id)
  );
}

export function extractZainCashStatus(input: unknown): string {
  const data = input as Record<string, unknown> | null | undefined;
  if (!data || typeof data !== "object") return "";
  return (
    stringFrom(data.status) ||
    stringFrom(data.paymentStatus) ||
    stringFrom(data.transactionStatus) ||
    stringFrom(data.result)
  ).toLowerCase();
}

export function isZainCashPaidStatus(status: string): boolean {
  return ["success", "successful", "completed", "complete", "paid", "approved"].includes(status.toLowerCase());
}

export function isZainCashFailedStatus(status: string): boolean {
  return ["failed", "failure", "canceled", "cancelled", "rejected", "declined", "expired"].includes(status.toLowerCase());
}
