-- Video poster optimization fields for Generation.
-- Safe to run repeatedly; does not modify mediaUrl/outputUrl/video originals.

ALTER TABLE "Generation"
  ADD COLUMN IF NOT EXISTS "posterUrl" TEXT,
  ADD COLUMN IF NOT EXISTS "posterStatus" TEXT NOT NULL DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS "posterGeneratedAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "posterError" TEXT;

CREATE INDEX IF NOT EXISTS "Generation_posterStatus_idx" ON "Generation"("posterStatus");

UPDATE "Generation"
SET "posterStatus" = 'pending'
WHERE "posterStatus" IS NULL;