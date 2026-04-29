-- User-wide reusable character library.
-- Run once on the production database before using /character.

CREATE TABLE IF NOT EXISTS "UserCharacter" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "description" TEXT NOT NULL DEFAULT '',
  "referenceUrls" JSONB NOT NULL DEFAULT '[]',
  "coverUrl" TEXT,
  "provider" TEXT NOT NULL DEFAULT 'reference',
  "providerCharacterId" TEXT,
  "status" TEXT NOT NULL DEFAULT 'ready',
  "metadata" JSONB NOT NULL DEFAULT '{}',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "UserCharacter_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "UserCharacter_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id")
    ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "UserCharacter_userId_updatedAt_idx"
  ON "UserCharacter"("userId", "updatedAt");
