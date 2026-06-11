CREATE TABLE IF NOT EXISTS "NotificationPreference" (
  "userId" TEXT PRIMARY KEY,
  "emailReceipts" BOOLEAN NOT NULL DEFAULT TRUE,
  "creditAlerts" BOOLEAN NOT NULL DEFAULT TRUE,
  "paymentConfirm" BOOLEAN NOT NULL DEFAULT TRUE,
  "productUpdates" BOOLEAN NOT NULL DEFAULT FALSE,
  "weeklyDigest" BOOLEAN NOT NULL DEFAULT FALSE,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "NotificationDelivery" (
  "key" TEXT PRIMARY KEY,
  "userId" TEXT NOT NULL,
  "kind" TEXT NOT NULL,
  "sentAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS "NotificationDelivery_userId_kind_idx"
ON "NotificationDelivery" ("userId", "kind");
