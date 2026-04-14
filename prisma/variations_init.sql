-- Variations Studio tables
-- Run once to create the VariationProject, VariationJob, and VariationOutput models

CREATE TABLE IF NOT EXISTS "VariationProject" (
  "id"                TEXT NOT NULL PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "userId"            TEXT NOT NULL,
  "title"             TEXT NOT NULL DEFAULT 'Untitled Variation',
  "referenceAssetUrl" TEXT,
  "referenceAssetId"  TEXT,
  "selectedMode"      TEXT NOT NULL DEFAULT 'storyboard',
  "selectedGenMode"   TEXT NOT NULL DEFAULT 'standard',
  "outputCount"       INTEGER NOT NULL DEFAULT 9,
  "aspectRatio"       TEXT NOT NULL DEFAULT '16:9',
  "direction"         TEXT NOT NULL DEFAULT '',
  "negativeDirection" TEXT NOT NULL DEFAULT '',
  "consistencyLock"   BOOLEAN NOT NULL DEFAULT true,
  "settingsJson"      JSONB NOT NULL DEFAULT '{}',
  "createdAt"         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt"         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS "VariationProject_userId_updatedAt_idx"
  ON "VariationProject" ("userId", "updatedAt");


CREATE TABLE IF NOT EXISTS "VariationJob" (
  "id"        TEXT NOT NULL PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "projectId" TEXT NOT NULL,
  "userId"    TEXT NOT NULL,
  "status"    TEXT NOT NULL DEFAULT 'queued',
  "error"     TEXT,
  "payload"   JSONB NOT NULL DEFAULT '{}',
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT "VariationJob_projectId_fkey"
    FOREIGN KEY ("projectId") REFERENCES "VariationProject"("id") ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS "VariationJob_projectId_createdAt_idx"
  ON "VariationJob" ("projectId", "createdAt");

CREATE INDEX IF NOT EXISTS "VariationJob_userId_createdAt_idx"
  ON "VariationJob" ("userId", "createdAt");


CREATE TABLE IF NOT EXISTS "VariationOutput" (
  "id"               TEXT NOT NULL PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "projectId"        TEXT NOT NULL,
  "jobId"            TEXT,
  "userId"           TEXT NOT NULL,
  "variationMode"    TEXT NOT NULL,
  "presetId"         TEXT NOT NULL,
  "presetLabel"      TEXT NOT NULL,
  "modelUsed"        TEXT NOT NULL,
  "fallbackUsed"     BOOLEAN NOT NULL DEFAULT false,
  "assetUrl"         TEXT,
  "thumbnailUrl"     TEXT,
  "generationStatus" TEXT NOT NULL DEFAULT 'pending',
  "creditCost"       INTEGER NOT NULL DEFAULT 0,
  "kieTaskId"        TEXT,
  "createdAt"        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt"        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT "VariationOutput_projectId_fkey"
    FOREIGN KEY ("projectId") REFERENCES "VariationProject"("id") ON DELETE CASCADE,
  CONSTRAINT "VariationOutput_jobId_fkey"
    FOREIGN KEY ("jobId") REFERENCES "VariationJob"("id") ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS "VariationOutput_projectId_createdAt_idx"
  ON "VariationOutput" ("projectId", "createdAt");

CREATE INDEX IF NOT EXISTS "VariationOutput_userId_createdAt_idx"
  ON "VariationOutput" ("userId", "createdAt");

CREATE INDEX IF NOT EXISTS "VariationOutput_jobId_idx"
  ON "VariationOutput" ("jobId");
