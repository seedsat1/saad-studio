-- P0-C Platform Financial Integrity
-- Non-destructive migration only: no backfill, no data rewrite, no production application.

CREATE TABLE IF NOT EXISTS "ApiIdempotency" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "route" TEXT NOT NULL,
  "operationType" TEXT NOT NULL DEFAULT 'generation',
  "key" TEXT NOT NULL,
  "requestHash" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'processing',
  "generationId" TEXT,
  "responseStatus" INTEGER,
  "responseJson" JSONB,
  "errorCode" TEXT,
  "errorMessage" TEXT,
  "attemptCount" INTEGER NOT NULL DEFAULT 0,
  "processingLeaseExpiresAt" TIMESTAMP(3),
  "lastHeartbeatAt" TIMESTAMP(3),
  "providerDispatchedAt" TIMESTAMP(3),
  "completedAt" TIMESTAMP(3),
  "failedAt" TIMESTAMP(3),
  "expiresAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ApiIdempotency_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "ApiIdempotency_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "ApiIdempotency_generationId_fkey" FOREIGN KEY ("generationId") REFERENCES "Generation"("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS "ApiIdempotency_userId_route_operationType_key_key"
  ON "ApiIdempotency"("userId", "route", "operationType", "key");
CREATE INDEX IF NOT EXISTS "ApiIdempotency_userId_createdAt_idx" ON "ApiIdempotency"("userId", "createdAt");
CREATE INDEX IF NOT EXISTS "ApiIdempotency_status_idx" ON "ApiIdempotency"("status");
CREATE INDEX IF NOT EXISTS "ApiIdempotency_processingLeaseExpiresAt_idx" ON "ApiIdempotency"("processingLeaseExpiresAt");
CREATE INDEX IF NOT EXISTS "ApiIdempotency_expiresAt_idx" ON "ApiIdempotency"("expiresAt");
CREATE INDEX IF NOT EXISTS "ApiIdempotency_generationId_idx" ON "ApiIdempotency"("generationId");

CREATE TABLE IF NOT EXISTS "CreditLedgerEntry" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "generationId" TEXT,
  "projectId" TEXT,
  "jobId" TEXT,
  "idempotencyKey" TEXT,
  "providerUsageRecordId" TEXT,
  "quoteSnapshotId" TEXT,
  "originalEntryId" TEXT,
  "delta" INTEGER NOT NULL,
  "reason" TEXT NOT NULL,
  "operationType" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'settled',
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "CreditLedgerEntry_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "CreditLedgerEntry_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "CreditLedgerEntry_generationId_fkey" FOREIGN KEY ("generationId") REFERENCES "Generation"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "CreditLedgerEntry_providerUsageRecordId_fkey" FOREIGN KEY ("providerUsageRecordId") REFERENCES "ProviderUsageRecord"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "CreditLedgerEntry_originalEntryId_fkey" FOREIGN KEY ("originalEntryId") REFERENCES "CreditLedgerEntry"("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "CreditLedgerEntry_userId_createdAt_idx" ON "CreditLedgerEntry"("userId", "createdAt");
CREATE INDEX IF NOT EXISTS "CreditLedgerEntry_generationId_idx" ON "CreditLedgerEntry"("generationId");

ALTER TABLE "CreditLedgerEntry" ADD COLUMN IF NOT EXISTS "projectId" TEXT;
ALTER TABLE "CreditLedgerEntry" ADD COLUMN IF NOT EXISTS "jobId" TEXT;
ALTER TABLE "CreditLedgerEntry" ADD COLUMN IF NOT EXISTS "idempotencyKey" TEXT;
ALTER TABLE "CreditLedgerEntry" ADD COLUMN IF NOT EXISTS "providerUsageRecordId" TEXT;
ALTER TABLE "CreditLedgerEntry" ADD COLUMN IF NOT EXISTS "quoteSnapshotId" TEXT;
ALTER TABLE "CreditLedgerEntry" ADD COLUMN IF NOT EXISTS "originalEntryId" TEXT;
ALTER TABLE "CreditLedgerEntry" ADD COLUMN IF NOT EXISTS "operationType" TEXT NOT NULL DEFAULT 'admin_adjustment';
ALTER TABLE "CreditLedgerEntry" ADD COLUMN IF NOT EXISTS "status" TEXT NOT NULL DEFAULT 'settled';
ALTER TABLE "CreditLedgerEntry" ADD COLUMN IF NOT EXISTS "metadata" JSONB;

CREATE INDEX IF NOT EXISTS "CreditLedgerEntry_projectId_idx" ON "CreditLedgerEntry"("projectId");
CREATE INDEX IF NOT EXISTS "CreditLedgerEntry_jobId_idx" ON "CreditLedgerEntry"("jobId");
CREATE INDEX IF NOT EXISTS "CreditLedgerEntry_idempotencyKey_idx" ON "CreditLedgerEntry"("idempotencyKey");
CREATE INDEX IF NOT EXISTS "CreditLedgerEntry_providerUsageRecordId_idx" ON "CreditLedgerEntry"("providerUsageRecordId");
CREATE INDEX IF NOT EXISTS "CreditLedgerEntry_quoteSnapshotId_idx" ON "CreditLedgerEntry"("quoteSnapshotId");
CREATE INDEX IF NOT EXISTS "CreditLedgerEntry_originalEntryId_idx" ON "CreditLedgerEntry"("originalEntryId");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'CreditLedgerEntry_providerUsageRecordId_fkey'
  ) THEN
    ALTER TABLE "CreditLedgerEntry"
      ADD CONSTRAINT "CreditLedgerEntry_providerUsageRecordId_fkey"
      FOREIGN KEY ("providerUsageRecordId") REFERENCES "ProviderUsageRecord"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'CreditLedgerEntry_originalEntryId_fkey'
  ) THEN
    ALTER TABLE "CreditLedgerEntry"
      ADD CONSTRAINT "CreditLedgerEntry_originalEntryId_fkey"
      FOREIGN KEY ("originalEntryId") REFERENCES "CreditLedgerEntry"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

ALTER TABLE "AdminTransaction" ADD COLUMN IF NOT EXISTS "operatorUserId" TEXT;
ALTER TABLE "AdminTransaction" ADD COLUMN IF NOT EXISTS "operatorEmail" TEXT;
ALTER TABLE "AdminTransaction" ADD COLUMN IF NOT EXISTS "decisionAt" TIMESTAMP(3);
ALTER TABLE "AdminTransaction" ADD COLUMN IF NOT EXISTS "decisionReason" TEXT;
