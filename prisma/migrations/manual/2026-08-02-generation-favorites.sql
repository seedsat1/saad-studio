ALTER TABLE "Generation"
ADD COLUMN IF NOT EXISTS "isFavorite" BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS "Generation_isFavorite_idx"
ON "Generation"("isFavorite");