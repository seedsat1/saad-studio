import { NextRequest, NextResponse } from "next/server";
import { isAdmin } from "@/lib/is-admin";
import prismadb from "@/lib/prismadb";
import { getUserIdsWithPreferenceEnabled } from "@/lib/notifications";

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
  return lines
    .map((l) =>
      l.trim()
        ? `<p style="margin:0 0 16px 0;color:#cbd5e1;font-size:15px;line-height:1.75;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">${l}</p>`
        : `<div style="height:10px"></div>`,
    )
    .join("");
}

async function getLogoSrc(): Promise<string> {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://saadstudio.app";
  const siteLogoUrl = await prismadb.siteSetting
    .findFirst({ select: { logoUrl: true } })
    .then((s) => s?.logoUrl ?? null)
    .catch(() => null);

  const logoPath = String(siteLogoUrl || "/logo-saad.png?v=5").trim();
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

  const optedInUserIds = new Set(await getUserIdsWithPreferenceEnabled("productUpdates"));
  const userIds = Array.from(new Set(
    subs.map((s) => s.userId).filter((userId) => Boolean(userId) && optedInUserIds.has(userId)),
  ));
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
  const from = process.env.RESEND_FROM || "Saad Studio <updates@saadstudio.app>";
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
  const issuedIso = issuedAt.toISOString().slice(0, 10);

  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(subject)}</title>
</head>
<body style="margin:0;padding:0;background-color:#060913;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;-webkit-font-smoothing:antialiased;">
  <table width="100%" border="0" cellpadding="0" cellspacing="0" style="background-color:#060913;padding:40px 16px;">
    <tr>
      <td align="center">
        <!-- Main Card Container -->
        <table width="100%" border="0" cellpadding="0" cellspacing="0" style="max-width:600px;background-color:#0d1322;border:1px solid #1e293b;border-radius:24px;overflow:hidden;box-shadow:0 25px 50px -12px rgba(0,0,0,0.85);">
          
          <!-- Header Branding -->
          <tr>
            <td align="center" style="padding:40px 32px 28px;background:linear-gradient(180deg,#131d33 0%,#0d1322 100%);border-bottom:1px solid #1e293b;">
              <table border="0" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center">
                    <img src="${logoSrc}" alt="Saad Studio" width="76" height="76" style="display:block;margin:0 auto 16px;border-radius:18px;border:1px solid rgba(255,255,255,0.15);box-shadow:0 8px 30px rgba(6,182,212,0.3);" />
                    <div style="font-size:20px;font-weight:900;letter-spacing:2.5px;color:#ffffff;text-transform:uppercase;margin:0;">SAAD STUDIO</div>
                    <div style="font-size:11px;font-weight:700;letter-spacing:2px;color:#38bdf8;text-transform:uppercase;margin-top:6px;">ENTERPRISE AI CREATIVE SUITE</div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Subject & Date -->
          <tr>
            <td style="padding:32px 36px 12px;">
              <table width="100%" border="0" cellpadding="0" cellspacing="0">
                <tr>
                  <td>
                    <div style="display:inline-block;padding:5px 14px;background-color:rgba(56,189,248,0.1);border:1px solid rgba(56,189,248,0.25);border-radius:30px;font-size:11px;font-weight:700;color:#38bdf8;margin-bottom:16px;letter-spacing:0.5px;">
                      OFFICIAL ANNOUNCEMENT • ${escapeHtml(issuedIso)}
                    </div>
                    <h1 style="margin:0 0 8px;font-size:23px;font-weight:800;line-height:1.35;color:#f8fafc;letter-spacing:-0.4px;">
                      ${escapeHtml(subject)}
                    </h1>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Message Body Content -->
          <tr>
            <td style="padding:12px 36px 28px;">
              <div style="background-color:#11192e;border:1px solid #1e293b;border-radius:16px;padding:24px 28px;">
                ${toHtmlParagraphs(message)}
              </div>
            </td>
          </tr>

          <!-- CTA Button -->
          <tr>
            <td align="center" style="padding:8px 36px 36px;">
              <table border="0" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center" style="border-radius:14px;background:linear-gradient(135deg,#06b6d4 0%,#6366f1 100%);box-shadow:0 6px 24px rgba(6,182,212,0.45);">
                    <a href="${siteUrl}" target="_blank" style="display:inline-block;padding:16px 36px;font-size:14px;font-weight:800;letter-spacing:1px;color:#ffffff;text-decoration:none;text-transform:uppercase;border-radius:14px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
                      Launch Saad Studio →
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding:28px 36px;background-color:#080c16;border-top:1px solid #1e293b;text-align:center;">
              <p style="margin:0 0 10px;font-size:13px;font-weight:700;color:#cbd5e1;letter-spacing:0.3px;">
                Saad Studio — The Next-Generation Generative AI Platform
              </p>
              <p style="margin:0 0 14px;font-size:12px;color:#64748b;">
                <a href="${siteUrl}" target="_blank" style="color:#38bdf8;text-decoration:none;font-weight:600;margin:0 8px;">Studio</a>
                •
                <a href="${siteUrl}/explore" target="_blank" style="color:#38bdf8;text-decoration:none;font-weight:600;margin:0 8px;">Explore</a>
                •
                <a href="mailto:support@saadstudio.app" style="color:#38bdf8;text-decoration:none;font-weight:600;margin:0 8px;">Support</a>
              </p>
              <p style="margin:0;font-size:11px;color:#475569;line-height:1.5;">
                You received this email as an active subscriber or member of Saad Studio.<br/>
                © ${new Date().getFullYear()} Saad Studio. All rights reserved.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
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
