import prismadb from "@/lib/prismadb";

export type InvoiceParams = {
  to: string;
  orderId: string;
  displayPlan: string;
  amount: number;
  credits: number;
  startsAt: Date;
  endsAt: Date;
  method?: string | null;
};

function escapeHtml(value: string): string {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function formatDateISO(date: Date): string {
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, "0");
  const d = String(date.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

async function resolveLogoSrc(siteUrl: string): Promise<string> {
  const siteLogoUrl = await prismadb.siteSetting
    .findFirst({ select: { logoUrl: true } })
    .then((s) => s?.logoUrl ?? null)
    .catch(() => null);
  const logoPath = (siteLogoUrl || "/logo-saad-transparent.png").trim();
  return /^https?:\/\//i.test(logoPath)
    ? logoPath
    : `${siteUrl.replace(/\/$/, "")}${logoPath.startsWith("/") ? "" : "/"}${logoPath}`;
}

export function buildInvoiceSubject(orderId: string): string {
  return `Receipt from Saad Studio — ${orderId}`;
}

export function buildInvoiceText(params: InvoiceParams): string {
  const issuedAt = new Date();
  const issuedHuman = issuedAt.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
    timeZone: "UTC",
  });
  const startsIso = formatDateISO(params.startsAt);
  const endsIso = formatDateISO(params.endsAt);
  const methodLabel = params.method ? String(params.method) : "manual";
  const planLower = String(params.displayPlan).toLowerCase();
  const isAnnual = planLower.includes("annual");
  const isTopupItem = planLower.startsWith("topup:");
  const durationDays = Math.max(
    1,
    Math.round((params.endsAt.getTime() - params.startsAt.getTime()) / 86400000),
  );
  const durationLabelEn = isAnnual ? "12 months" : `${durationDays} days`;
  const amountFmt = Number(params.amount || 0).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  const creditsNum = Math.max(0, Math.floor(Number(params.credits || 0)));
  const creditsFmt = creditsNum.toLocaleString("en-US");
  const itemTitleEn = isTopupItem ? "Credit Top-up" : params.displayPlan;
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://saadstudio.app";
  const supportEmail = "support@saadstudio.app";
  const yearLabel = String(issuedAt.getUTCFullYear());

  return (
    `Receipt from Saad Studio\n` +
    `إيصال من Saad Studio\n\n` +
    `Receipt No. ${params.orderId}\n\n` +
    `Amount paid: US$${amountFmt}\n` +
    `Date paid:   ${issuedHuman}\n` +
    `Method:      ${methodLabel}\n\n` +
    `SUMMARY / الملخص\n` +
    `${itemTitleEn} × 1 .............. US$${amountFmt}\n` +
    `Amount paid ................... US$${amountFmt}\n\n` +
    `Subscription Period: ${startsIso} → ${endsIso} (${durationLabelEn})\n` +
    (creditsNum > 0 ? `Credits added: +${creditsFmt}\n` : "") +
    `\n` +
    `If you have any questions, contact us at ${supportEmail}\n` +
    `لأي استفسار، تواصل معنا عبر ${supportEmail}\n\n` +
    `${siteUrl}\n` +
    `You're receiving this email because you made a purchase at Saad Studio.\n` +
    `© ${yearLabel} Saad Studio. All rights reserved.\n`
  );
}

export async function buildInvoiceHtml(params: InvoiceParams): Promise<string> {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://saadstudio.app";
  const logoSrc = await resolveLogoSrc(siteUrl);
  const issuedAt = new Date();
  const issuedHuman = issuedAt.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
    timeZone: "UTC",
  });
  const startsIso = formatDateISO(params.startsAt);
  const endsIso = formatDateISO(params.endsAt);
  const methodLabel = params.method ? String(params.method) : "manual";
  const planLower = String(params.displayPlan).toLowerCase();
  const isAnnual = planLower.includes("annual");
  const isTopupItem = planLower.startsWith("topup:");
  const durationDays = Math.max(
    1,
    Math.round((params.endsAt.getTime() - params.startsAt.getTime()) / 86400000),
  );
  const durationLabelEn = isAnnual ? "12 months" : `${durationDays} days`;
  const amountFmt = Number(params.amount || 0).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  const creditsNum = Math.max(0, Math.floor(Number(params.credits || 0)));
  const creditsFmt = creditsNum.toLocaleString("en-US");
  const itemTitleEn = isTopupItem ? "Credit Top-up" : params.displayPlan;
  const itemTitleAr = isTopupItem ? "إعادة شحن كريدت" : "اشتراك";
  const supportEmail = "support@saadstudio.app";
  const dashboardUrl = `${siteUrl.replace(/\/$/, "")}/dashboard`;
  const siteHostname = siteUrl.replace(/^https?:\/\//i, "").replace(/\/$/, "");
  const yearLabel = String(issuedAt.getUTCFullYear());

  const labelEn =
    "color:#7c3aed;font-size:11px;font-weight:700;letter-spacing:.8px;text-transform:uppercase;line-height:1.2";
  const labelAr =
    "color:#a78bfa;font-size:10px;font-weight:600;line-height:1.2;margin-top:3px";

  return `
    <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;background:#f5f6f8;padding:40px 16px;color:#1a1f36;line-height:1.5">
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" align="center" style="width:100%;max-width:600px;margin:0 auto;background:#ffffff;border-radius:8px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,.06)">

        <!-- Banner header with logo -->
        <tr>
          <td style="background:#525f7f;padding:44px 24px 36px;text-align:center">
            <img src="${logoSrc}" alt="Saad Studio" width="120" height="auto" style="display:inline-block;max-width:160px;height:auto" />
          </td>
        </tr>

        <!-- Title block -->
        <tr>
          <td style="padding:28px 32px 0;text-align:center">
            <div style="color:#1a1f36;font-size:22px;font-weight:600;letter-spacing:-.2px">Receipt from Saad Studio</div>
            <div dir="rtl" style="color:#1a1f36;font-size:18px;font-weight:600;margin-top:6px">إيصال من Saad Studio</div>
            <div style="color:#7c3aed;font-size:13px;font-weight:500;margin-top:14px;font-family:'SF Mono',Consolas,Menlo,monospace">Receipt No. ${escapeHtml(params.orderId)}</div>
          </td>
        </tr>

        <!-- Three info columns -->
        <tr>
          <td style="padding:32px 32px 0">
            <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="width:100%">
              <tr>
                <td style="vertical-align:top;width:33%;padding-right:8px">
                  <div style="${labelEn}">Amount Paid</div>
                  <div dir="rtl" style="${labelAr};text-align:left">المبلغ المدفوع</div>
                  <div style="color:#1a1f36;font-size:14px;font-weight:500;margin-top:8px">US$${amountFmt}</div>
                </td>
                <td style="vertical-align:top;width:34%;padding:0 8px">
                  <div style="${labelEn}">Date Paid</div>
                  <div dir="rtl" style="${labelAr};text-align:left">تاريخ الدفع</div>
                  <div style="color:#1a1f36;font-size:14px;font-weight:500;margin-top:8px">${escapeHtml(issuedHuman)}</div>
                </td>
                <td style="vertical-align:top;width:33%;padding-left:8px">
                  <div style="${labelEn}">Payment Method</div>
                  <div dir="rtl" style="${labelAr};text-align:left">طريقة الدفع</div>
                  <div style="color:#1a1f36;font-size:14px;font-weight:500;margin-top:8px">${escapeHtml(methodLabel)}</div>
                </td>
              </tr>
            </table>
          </td>
        </tr>

        <!-- Summary label -->
        <tr>
          <td style="padding:36px 32px 0">
            <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="width:100%">
              <tr>
                <td style="${labelEn};text-align:left">Summary</td>
                <td dir="rtl" style="${labelEn};text-align:right">الملخص</td>
              </tr>
            </table>
          </td>
        </tr>

        <!-- Summary box -->
        <tr>
          <td style="padding:12px 32px 0">
            <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="width:100%;background:#f5f6f8;border-radius:6px">
              <tr>
                <td style="padding:18px 20px;border-bottom:1px solid #e3e8ee">
                  <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="width:100%">
                    <tr>
                      <td style="color:#1a1f36;font-size:14px;vertical-align:top">
                        <div>${escapeHtml(itemTitleEn)} × 1</div>
                        <div dir="rtl" style="color:#697386;font-size:12px;margin-top:2px;text-align:left">${escapeHtml(itemTitleAr)}${creditsNum > 0 ? ` · ${creditsFmt} كريدت` : ""}</div>
                      </td>
                      <td align="right" style="color:#1a1f36;font-size:14px;white-space:nowrap;vertical-align:top">US$${amountFmt}</td>
                    </tr>
                  </table>
                </td>
              </tr>
              <tr>
                <td style="padding:18px 20px">
                  <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="width:100%">
                    <tr>
                      <td style="color:#1a1f36;font-size:14px;font-weight:600;vertical-align:top">
                        <div>Amount paid</div>
                        <div dir="rtl" style="color:#697386;font-size:12px;font-weight:500;margin-top:2px;text-align:left">المبلغ المدفوع</div>
                      </td>
                      <td align="right" style="color:#1a1f36;font-size:14px;font-weight:600;white-space:nowrap;vertical-align:top">US$${amountFmt}</td>
                    </tr>
                  </table>
                </td>
              </tr>
            </table>
          </td>
        </tr>

        <!-- Subscription Period -->
        <tr>
          <td style="padding:28px 32px 0">
            <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="width:100%">
              <tr>
                <td style="${labelEn};text-align:left">Subscription Period</td>
                <td dir="rtl" style="${labelEn};text-align:right">فترة الاشتراك</td>
              </tr>
            </table>
            <div style="color:#1a1f36;font-size:14px;font-weight:500;margin-top:10px">
              ${startsIso} <span style="color:#697386">→</span> ${endsIso} <span style="color:#697386">(${durationLabelEn})</span>
            </div>
          </td>
        </tr>

        ${creditsNum > 0 ? `
        <!-- Credits banner -->
        <tr>
          <td style="padding:20px 32px 0">
            <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="width:100%;background:#ecfdf5;border-radius:6px">
              <tr>
                <td style="padding:14px 18px">
                  <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="width:100%">
                    <tr>
                      <td style="vertical-align:middle">
                        <div style="color:#065f46;font-size:13px;font-weight:600">⚡ +${creditsFmt} credits added to your wallet</div>
                        <div dir="rtl" style="color:#047857;font-size:12px;font-weight:500;margin-top:2px;text-align:left">⚡ تمت إضافة ${creditsFmt} كريدت إلى محفظتك</div>
                      </td>
                      <td align="right" style="vertical-align:middle;white-space:nowrap">
                        <a href="${dashboardUrl}" style="color:#7c3aed;text-decoration:none;font-weight:600;font-size:13px">Open →</a>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
            </table>
          </td>
        </tr>
        ` : ""}

        <!-- Divider -->
        <tr>
          <td style="padding:32px 32px 0">
            <div style="height:1px;background:#e3e8ee;line-height:1px;font-size:0">&nbsp;</div>
          </td>
        </tr>

        <!-- Support text -->
        <tr>
          <td style="padding:24px 32px 0">
            <div style="color:#1a1f36;font-size:13px;line-height:1.7">
              If you have any questions, visit our support site at <a href="${siteUrl}" style="color:#7c3aed;text-decoration:none;font-weight:600">${escapeHtml(siteHostname)}</a> or contact us at <a href="mailto:${supportEmail}" style="color:#7c3aed;text-decoration:none;font-weight:600">${supportEmail}</a>.
            </div>
            <div dir="rtl" style="color:#1a1f36;font-size:13px;line-height:1.7;margin-top:10px;text-align:right">
              لأي استفسار، تواصل معنا عبر <a href="mailto:${supportEmail}" style="color:#7c3aed;text-decoration:none;font-weight:600">${supportEmail}</a>
            </div>
          </td>
        </tr>

        <!-- Divider -->
        <tr>
          <td style="padding:24px 32px 0">
            <div style="height:1px;background:#e3e8ee;line-height:1px;font-size:0">&nbsp;</div>
          </td>
        </tr>

        <!-- Footnote -->
        <tr>
          <td style="padding:18px 32px 32px">
            <div style="color:#8792a2;font-size:12px;line-height:1.7">
              You're receiving this email because you made a purchase at Saad Studio.
            </div>
            <div dir="rtl" style="color:#8792a2;font-size:12px;line-height:1.7;text-align:right;margin-top:2px">
              تستلم هذه الرسالة لأنك أكملت عملية شراء في Saad Studio.
            </div>
            <div style="color:#8792a2;font-size:11px;line-height:1.7;margin-top:10px">
              © ${yearLabel} Saad Studio · All rights reserved
            </div>
          </td>
        </tr>
      </table>
    </div>
  `.trim();
}

export async function sendInvoiceEmail(
  params: InvoiceParams,
): Promise<
  | { ok: true; skipped: false }
  | { ok: false; skipped: true; error: string }
  | { ok: false; skipped: false; error: string }
> {
  const key = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM;
  if (!key || !from) {
    return { ok: false, skipped: true, error: "Missing RESEND_API_KEY/RESEND_FROM" };
  }

  const subject = buildInvoiceSubject(params.orderId);
  const text = buildInvoiceText(params);
  const html = await buildInvoiceHtml(params);

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from,
        to: [params.to],
        subject,
        text,
        html,
      }),
    });
    if (!res.ok) {
      const msg = await res.text().catch(() => "");
      console.error("[invoice email] resend failed:", res.status, msg.slice(0, 500));
      return { ok: false, skipped: false, error: `Resend ${res.status}: ${msg.slice(0, 200)}` };
    }
    return { ok: true, skipped: false };
  } catch (err) {
    console.error("[invoice email] error:", err);
    return { ok: false, skipped: false, error: err instanceof Error ? err.message : "Send failed" };
  }
}
