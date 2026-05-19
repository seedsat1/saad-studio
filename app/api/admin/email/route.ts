import { NextRequest, NextResponse } from "next/server";
import { isAdmin } from "@/lib/is-admin";
import prismadb from "@/lib/prismadb";

const DAY_MS = 86_400_000;

type Audience = "active_subscribers";
type Mode = "single" | "bulk";
type EmailAttachment = {
  filename: string;
  path: string;
  contentType?: string;
};

function normalizeEmail(value: string): string {
  return String(value || "").trim().toLowerCase();
}

function isValidEmail(value: string): boolean {
  const v = normalizeEmail(value);
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function toHtmlParagraphs(text: string): string {
  const safe = escapeHtml(text);
  const lines = safe.split(/\r?\n/);
  return lines.map((l) => (l.trim() ? `<p style="margin:0 0 10px">${l}</p>` : `<div style="height:8px"></div>`)).join("");
}

async function getLogoSrc(): Promise<string> {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://saadstudio.app";
  const siteLogoUrl = await prismadb.siteSetting
    .findFirst({ select: { logoUrl: true } })
    .then((s) => s?.logoUrl ?? null)
    .catch(() => null);

  const logoPath = String(siteLogoUrl || "/logo-saad-transparent.png").trim();
  if (/^https?:\/\//i.test(logoPath)) return logoPath;
  return `${siteUrl.replace(/\/$/, "")}${logoPath.startsWith("/") ? "" : "/"}${logoPath}`;
}

async function resolveActiveSubscriberEmails(params: { planId?: string | null }): Promise<string[]> {
  const planId = (params.planId ?? "").trim().toLowerCase();
  const threshold = new Date(Date.now() - DAY_MS);

  const subs = await prismadb.userSubscription.findMany({
    where: {
      stripePriceId: { not: null },
      stripeCurrentPeriodEnd: { gt: threshold },
      ...(planId && planId !== "all" ? { planId } : {}),
    },
    select: { userId: true },
  });

  const userIds = Array.from(new Set(subs.map((s) => s.userId).filter(Boolean)));
  if (!userIds.length) return [];

  const users = await prismadb.user.findMany({
    where: {
      id: { in: userIds },
      isBanned: false,
    },
    select: { email: true },
  });

  const emails = Array.from(new Set(users.map((u) => normalizeEmail(u.email)).filter(isValidEmail)));
  return emails;
}

async function sendResendEmail(params: { to: string; subject: string; text: string; html: string; attachments?: EmailAttachment[] }) {
  const key = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM;
  if (!key || !from) {
    return { ok: false as const, error: "Missing RESEND_API_KEY/RESEND_FROM" };
  }

  const attachments = (params.attachments ?? []).slice(0, 3).map((a) => ({
    filename: a.filename,
    path: a.path,
    contentType: a.contentType,
  }));

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to: [params.to],
      subject: params.subject,
      text: params.text,
      html: params.html,
      ...(attachments.length ? { attachments } : {}),
    }),
  });

  if (!res.ok) {
    const msg = await res.text().catch(() => "");
    return { ok: false as const, error: `Resend failed: ${res.status} ${msg.slice(0, 300)}` };
  }

  return { ok: true as const };
}

async function mapLimit<T, R>(
  items: T[],
  limit: number,
  mapper: (item: T, index: number) => Promise<R>,
): Promise<R[]> {
  const concurrency = Math.max(1, Math.floor(limit));
  const results: R[] = new Array(items.length);
  let nextIndex = 0;

  const workers = Array.from({ length: Math.min(concurrency, items.length) }, async () => {
    while (true) {
      const i = nextIndex++;
      if (i >= items.length) break;
      results[i] = await mapper(items[i], i);
    }
  });

  await Promise.all(workers);
  return results;
}

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  if (!(await isAdmin())) return new NextResponse("Unauthorized", { status: 401 });

  const url = new URL(req.url);
  const planId = (url.searchParams.get("planId") ?? "").trim().toLowerCase();

  const emails = await resolveActiveSubscriberEmails({ planId });
  return NextResponse.json({ audience: "active_subscribers", planId: planId || "all", count: emails.length });
}

type SendBody = {
  mode?: Mode;
  audience?: Audience;
  planId?: string | null;
  to?: string | null;
  subject?: string | null;
  message?: string | null;
  attachments?: EmailAttachment[] | null;
};

export async function POST(req: NextRequest) {
  if (!(await isAdmin())) return new NextResponse("Unauthorized", { status: 401 });

  const body = (await req.json().catch(() => ({}))) as SendBody;
  const mode: Mode = body.mode === "single" ? "single" : "bulk";
  const audience: Audience = body.audience === "active_subscribers" ? "active_subscribers" : "active_subscribers";

  const subject = String(body.subject ?? "").trim();
  const message = String(body.message ?? "").trim();
  const planId = (body.planId ?? "").trim().toLowerCase();
  const to = normalizeEmail(String(body.to ?? ""));
  const rawAttachments = Array.isArray(body.attachments) ? body.attachments : [];
  const attachments: EmailAttachment[] = rawAttachments
    .map((a) => ({
      filename: String(a?.filename ?? "").trim(),
      path: String(a?.path ?? "").trim(),
      contentType: String(a?.contentType ?? "").trim() || undefined,
    }))
    .filter((a) => a.filename && a.path && /^https?:\/\//i.test(a.path))
    .slice(0, 3);

  if (!subject) return NextResponse.json({ error: "subject is required" }, { status: 400 });
  if (!message) return NextResponse.json({ error: "message is required" }, { status: 400 });

  let recipients: string[] = [];
  if (mode === "single") {
    if (!to || !isValidEmail(to)) return NextResponse.json({ error: "Valid email is required for single mode" }, { status: 400 });
    recipients = [to];
  } else {
    recipients = await resolveActiveSubscriberEmails({ planId: planId || null });
  }

  if (!recipients.length) {
    return NextResponse.json({ ok: true, requested: 0, sent: 0, failed: 0, failures: [] });
  }

  const logoSrc = await getLogoSrc();
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://saadstudio.app";
  const issuedAt = new Date();
  const issuedIso = issuedAt.toISOString().slice(0, 19).replace("T", " ");

  const html = `
    <div style="font-family:ui-sans-serif,system-ui,-apple-system,Segoe UI,Roboto,Arial;background:#f8fafc;padding:24px">
      <div style="max-width:720px;margin:0 auto;background:#ffffff;border:1px solid #e2e8f0;border-radius:14px;overflow:hidden">
        <div style="display:flex;align-items:center;justify-content:space-between;gap:16px;padding:16px 18px;background:#0b1220">
          <div style="display:flex;align-items:center;gap:12px;min-width:0">
            <img src="${logoSrc}" alt="Saad Studio" width="34" height="34" style="display:block;border-radius:10px" />
            <div style="min-width:0">
              <div style="color:#ffffff;font-weight:800;letter-spacing:.2px">Saad Studio</div>
              <div style="color:#94a3b8;font-size:12px">${escapeHtml(subject)}</div>
            </div>
          </div>
          <div style="text-align:right;color:#94a3b8;font-size:12px">${escapeHtml(issuedIso)}</div>
        </div>
        <div style="padding:18px 18px 6px;color:#0f172a;line-height:1.65">
          ${toHtmlParagraphs(message)}
        </div>
        <div style="padding:12px 18px 18px;color:#94a3b8;font-size:12px;border-top:1px solid #e2e8f0">
          <a href="${siteUrl}" style="color:#6366f1;text-decoration:none">${escapeHtml(siteUrl)}</a>
        </div>
      </div>
    </div>
  `.trim();

  const text = `${subject}\n\n${message}\n\n${siteUrl}\n${issuedIso}`;

  const results = await mapLimit(
    recipients,
    5,
    async (email) => {
      const r = await sendResendEmail({ to: email, subject, text, html, attachments });
      return { email, ok: r.ok, error: r.ok ? null : r.error };
    },
  );

  const failures = results.filter((r) => !r.ok).slice(0, 20).map((r) => ({ email: r.email, error: r.error }));
  const sent = results.filter((r) => r.ok).length;
  const failed = results.length - sent;

  return NextResponse.json({
    ok: true,
    mode,
    audience,
    requested: recipients.length,
    sent,
    failed,
    failures,
  });
}
