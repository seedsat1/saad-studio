import prismadb from "@/lib/prismadb";

export type NotificationPreferences = {
  emailReceipts: boolean;
  creditAlerts: boolean;
  paymentConfirm: boolean;
  productUpdates: boolean;
  weeklyDigest: boolean;
};

export const DEFAULT_NOTIFICATION_PREFERENCES: NotificationPreferences = {
  emailReceipts: true,
  creditAlerts: true,
  paymentConfirm: true,
  productUpdates: false,
  weeklyDigest: false,
};

type PreferenceKey = keyof NotificationPreferences;

let tablesReady: Promise<void> | null = null;

async function ensureNotificationTables(): Promise<void> {
  if (!tablesReady) {
    tablesReady = (async () => {
      await prismadb.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS "NotificationPreference" (
          "userId" TEXT PRIMARY KEY,
          "emailReceipts" BOOLEAN NOT NULL DEFAULT TRUE,
          "creditAlerts" BOOLEAN NOT NULL DEFAULT TRUE,
          "paymentConfirm" BOOLEAN NOT NULL DEFAULT TRUE,
          "productUpdates" BOOLEAN NOT NULL DEFAULT FALSE,
          "weeklyDigest" BOOLEAN NOT NULL DEFAULT FALSE,
          "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
        )
      `);
      await prismadb.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS "NotificationDelivery" (
          "key" TEXT PRIMARY KEY,
          "userId" TEXT NOT NULL,
          "kind" TEXT NOT NULL,
          "sentAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
        )
      `);
      await prismadb.$executeRawUnsafe(`
        CREATE INDEX IF NOT EXISTS "NotificationDelivery_userId_kind_idx"
        ON "NotificationDelivery" ("userId", "kind")
      `);
    })().catch((error) => {
      tablesReady = null;
      throw error;
    });
  }
  await tablesReady;
}

export async function getNotificationPreferences(userId: string): Promise<NotificationPreferences> {
  await ensureNotificationTables();
  const rows = await prismadb.$queryRaw<Array<NotificationPreferences>>`
    SELECT
      "emailReceipts",
      "creditAlerts",
      "paymentConfirm",
      "productUpdates",
      "weeklyDigest"
    FROM "NotificationPreference"
    WHERE "userId" = ${userId}
    LIMIT 1
  `;
  return rows[0] ?? DEFAULT_NOTIFICATION_PREFERENCES;
}

export async function updateNotificationPreferences(
  userId: string,
  partial: Partial<NotificationPreferences>,
): Promise<NotificationPreferences> {
  const current = await getNotificationPreferences(userId);
  const next = { ...current, ...partial };
  await prismadb.$executeRaw`
    INSERT INTO "NotificationPreference" (
      "userId", "emailReceipts", "creditAlerts", "paymentConfirm",
      "productUpdates", "weeklyDigest", "updatedAt"
    )
    VALUES (
      ${userId}, ${next.emailReceipts}, ${next.creditAlerts}, ${next.paymentConfirm},
      ${next.productUpdates}, ${next.weeklyDigest}, CURRENT_TIMESTAMP
    )
    ON CONFLICT ("userId") DO UPDATE SET
      "emailReceipts" = EXCLUDED."emailReceipts",
      "creditAlerts" = EXCLUDED."creditAlerts",
      "paymentConfirm" = EXCLUDED."paymentConfirm",
      "productUpdates" = EXCLUDED."productUpdates",
      "weeklyDigest" = EXCLUDED."weeklyDigest",
      "updatedAt" = CURRENT_TIMESTAMP
  `;
  return next;
}

export async function getUserIdsWithPreferenceEnabled(key: PreferenceKey): Promise<string[]> {
  await ensureNotificationTables();
  const allowedColumns: Record<PreferenceKey, string> = {
    emailReceipts: "emailReceipts",
    creditAlerts: "creditAlerts",
    paymentConfirm: "paymentConfirm",
    productUpdates: "productUpdates",
    weeklyDigest: "weeklyDigest",
  };
  const column = allowedColumns[key];
  const defaultEnabled = DEFAULT_NOTIFICATION_PREFERENCES[key];
  const rows = await prismadb.$queryRawUnsafe<Array<{ userId: string }>>(
    `
      SELECT u."id" AS "userId"
      FROM "User" u
      LEFT JOIN "NotificationPreference" p ON p."userId" = u."id"
      WHERE COALESCE(p."${column}", $1) = TRUE
        AND u."isBanned" = FALSE
    `,
    defaultEnabled,
  );
  return rows.map((row) => row.userId);
}

function escapeHtml(value: string): string {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

export async function sendNotificationEmail(input: {
  to: string;
  subject: string;
  heading: string;
  message: string;
  actionLabel?: string;
  actionUrl?: string;
}): Promise<{ ok: boolean; error?: string }> {
  const key = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM;
  if (!key || !from) return { ok: false, error: "Missing RESEND_API_KEY/RESEND_FROM" };

  const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL || "https://saadstudio.app").replace(/\/$/, "");
  const actionUrl = input.actionUrl || siteUrl;
  const actionLabel = input.actionLabel || "Open Saad Studio";
  const html = `
    <div style="font-family:Arial,sans-serif;background:#f8fafc;padding:28px 16px;color:#0f172a">
      <div style="max-width:600px;margin:auto;background:#fff;border:1px solid #e2e8f0;border-radius:10px;overflow:hidden">
        <div style="background:#0b1220;padding:20px 24px;color:#fff;font-size:18px;font-weight:700">Saad Studio</div>
        <div style="padding:28px 24px">
          <h1 style="font-size:22px;margin:0 0 14px">${escapeHtml(input.heading)}</h1>
          <p style="font-size:15px;line-height:1.7;color:#475569;margin:0 0 24px">${escapeHtml(input.message)}</p>
          <a href="${escapeHtml(actionUrl)}" style="display:inline-block;background:#7c3aed;color:#fff;text-decoration:none;padding:11px 18px;border-radius:7px;font-weight:700">${escapeHtml(actionLabel)}</a>
        </div>
        <div style="padding:16px 24px;border-top:1px solid #e2e8f0;color:#94a3b8;font-size:12px">
          Manage notification preferences in your Saad Studio settings.
        </div>
      </div>
    </div>
  `.trim();

  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from,
        to: [input.to],
        subject: input.subject,
        text: `${input.heading}\n\n${input.message}\n\n${actionUrl}`,
        html,
      }),
      signal: AbortSignal.timeout(8_000),
    });
    if (!response.ok) {
      const error = await response.text().catch(() => "");
      return { ok: false, error: `Resend ${response.status}: ${error.slice(0, 200)}` };
    }
    return { ok: true };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "Email send failed" };
  }
}

export async function claimNotificationDelivery(input: {
  key: string;
  userId: string;
  kind: string;
}): Promise<boolean> {
  await ensureNotificationTables();
  const claimed = await prismadb.$queryRaw<Array<{ key: string }>>`
    INSERT INTO "NotificationDelivery" ("key", "userId", "kind")
    VALUES (${input.key}, ${input.userId}, ${input.kind})
    ON CONFLICT ("key") DO NOTHING
    RETURNING "key"
  `;
  return claimed.length > 0;
}

export async function releaseNotificationDelivery(key: string): Promise<void> {
  await ensureNotificationTables();
  await prismadb.$executeRaw`
    DELETE FROM "NotificationDelivery" WHERE "key" = ${key}
  `;
}

export async function sendDedupedNotification(input: {
  key: string;
  userId: string;
  kind: string;
  to: string;
  subject: string;
  heading: string;
  message: string;
  actionLabel?: string;
  actionUrl?: string;
}): Promise<{ ok: boolean; skipped?: boolean; error?: string }> {
  const claimed = await claimNotificationDelivery(input);
  if (!claimed) return { ok: true, skipped: true };

  const result = await sendNotificationEmail(input);
  if (!result.ok) {
    await releaseNotificationDelivery(input.key).catch(() => {});
  }
  return result;
}

export async function maybeSendLowCreditAlert(userId: string, remainingCredits: number): Promise<void> {
  const prefs = await getNotificationPreferences(userId);
  if (!prefs.creditAlerts) return;

  const user = await prismadb.user.findUnique({
    where: { id: userId },
    select: { email: true, monthlyCredits: true, creditsExpireAt: true },
  });
  if (!user?.email) return;

  const threshold = Math.max(10, Math.ceil(Math.max(0, user.monthlyCredits) * 0.1));
  if (remainingCredits > threshold) return;

  const cycle = user.creditsExpireAt?.toISOString().slice(0, 10)
    ?? new Date().toISOString().slice(0, 7);
  await sendDedupedNotification({
    key: `low-credit:${userId}:${cycle}`,
    userId,
    kind: "credit_alert",
    to: user.email,
    subject: "Your Saad Studio credits are running low",
    heading: "Low credit balance",
    message: `You have ${Math.max(0, remainingCredits).toLocaleString()} credits remaining. Add credits or upgrade your plan to keep creating without interruption.`,
    actionLabel: "View credits",
    actionUrl: `${(process.env.NEXT_PUBLIC_SITE_URL || "https://saadstudio.app").replace(/\/$/, "")}/profile`,
  });
}
