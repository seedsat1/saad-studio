ALTER TABLE "User"
  ADD COLUMN IF NOT EXISTS "creditAdvanceBalance" integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "creditAdvanceRequestedAt" timestamp(3),
  ADD COLUMN IF NOT EXISTS "creditAdvanceCycleEnd" timestamp(3);

CREATE INDEX IF NOT EXISTS "User_creditAdvanceBalance_idx"
  ON "User"("creditAdvanceBalance");
