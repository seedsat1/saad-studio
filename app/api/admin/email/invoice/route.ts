import { NextRequest, NextResponse } from "next/server";
import { isAdmin } from "@/lib/is-admin";
import { buildInvoiceHtml, sendInvoiceEmail, type InvoiceParams } from "@/lib/email-templates/invoice";

const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;
const ONE_YEAR_MS = 365 * 24 * 60 * 60 * 1000;

type InvoiceBody = {
  to?: string;
  orderId?: string;
  displayPlan?: string;
  amount?: number | string;
  credits?: number | string;
  startsAt?: string | null;
  endsAt?: string | null;
  method?: string | null;
  billingCycle?: "monthly" | "annual";
  preview?: boolean;
};

function normalizeEmail(value: string): string {
  return String(value || "").trim().toLowerCase();
}

function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizeEmail(value));
}

function parseDate(value: string | null | undefined, fallback: Date): Date {
  if (!value) return fallback;
  const d = new Date(value);
  return Number.isFinite(d.getTime()) ? d : fallback;
}

function buildParams(body: InvoiceBody): { ok: true; params: InvoiceParams } | { ok: false; error: string } {
  const to = normalizeEmail(String(body.to ?? ""));
  if (!isValidEmail(to)) return { ok: false, error: "Valid recipient email is required" };

  const orderId = String(body.orderId ?? "").trim() || `SS-${Date.now().toString(36).toUpperCase()}`;
  const displayPlan = String(body.displayPlan ?? "").trim();
  if (!displayPlan) return { ok: false, error: "Plan / description is required" };

  const amount = Number(body.amount ?? 0);
  if (!Number.isFinite(amount) || amount <= 0) {
    return { ok: false, error: "Amount must be a positive number" };
  }

  const credits = Math.max(0, Math.floor(Number(body.credits ?? 0)));
  const method = body.method ? String(body.method).trim() : null;

  const now = new Date();
  const isAnnual = body.billingCycle === "annual" || displayPlan.toLowerCase().includes("annual");
  const defaultEnds = new Date(now.getTime() + (isAnnual ? ONE_YEAR_MS : THIRTY_DAYS_MS));
  const startsAt = parseDate(body.startsAt, now);
  const endsAt = parseDate(body.endsAt, defaultEnds);

  return {
    ok: true,
    params: { to, orderId, displayPlan, amount, credits, startsAt, endsAt, method },
  };
}

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  if (!(await isAdmin())) return new NextResponse("Unauthorized", { status: 401 });

  const body = (await req.json().catch(() => ({}))) as InvoiceBody;
  const parsed = buildParams(body);
  if (!parsed.ok) {
    return NextResponse.json({ error: parsed.error }, { status: 400 });
  }

  if (body.preview) {
    const html = await buildInvoiceHtml(parsed.params);
    return NextResponse.json({ ok: true, preview: true, html });
  }

  const result = await sendInvoiceEmail(parsed.params);
  if (!result.ok) {
    return NextResponse.json({ error: result.error ?? "Failed to send invoice" }, { status: 500 });
  }
  return NextResponse.json({ ok: true, to: parsed.params.to, orderId: parsed.params.orderId });
}
