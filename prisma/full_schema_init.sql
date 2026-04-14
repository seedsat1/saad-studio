-- ==============================================================
-- SAAD STUDIO — Full Database Init Script
-- Run in: Supabase Dashboard → SQL Editor → New query → Run all
-- Safe to run multiple times (CREATE TABLE IF NOT EXISTS)
-- ==============================================================

-- ─── Core Auth / Limits ───────────────────────────────────────

CREATE TABLE IF NOT EXISTS "UserApiLimit" (
  "id"        TEXT        NOT NULL PRIMARY KEY,
  "userId"    TEXT        NOT NULL UNIQUE,
  "count"     INTEGER     NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS "UserSubscription" (
  "id"                     TEXT        NOT NULL PRIMARY KEY,
  "userId"                 TEXT        NOT NULL UNIQUE,
  "stripe_customer_id"     TEXT        UNIQUE,
  "stripe_subscription_id" TEXT        UNIQUE,
  "stripe_price_id"        TEXT,
  "stripe_current_period_end" TIMESTAMPTZ
);

-- ─── Admin / Users ────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS "User" (
  "id"            TEXT        NOT NULL PRIMARY KEY,
  "name"          TEXT,
  "email"         TEXT        NOT NULL UNIQUE,
  "phone"         TEXT,
  "creditBalance" INTEGER     NOT NULL DEFAULT 0,
  "role"          TEXT        NOT NULL DEFAULT 'USER',
  "isBanned"      BOOLEAN     NOT NULL DEFAULT FALSE,
  "createdAt"     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS "Generation" (
  "id"        TEXT        NOT NULL PRIMARY KEY,
  "userId"    TEXT        NOT NULL REFERENCES "User"("id") ON DELETE CASCADE,
  "prompt"    TEXT        NOT NULL,
  "mediaUrl"  TEXT,
  "assetType" TEXT        NOT NULL,
  "modelUsed" TEXT        NOT NULL,
  "cost"      DOUBLE PRECISION NOT NULL DEFAULT 0,
  "isFlagged" BOOLEAN     NOT NULL DEFAULT FALSE,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS "Generation_userId_idx"    ON "Generation"("userId");
CREATE INDEX IF NOT EXISTS "Generation_createdAt_idx" ON "Generation"("createdAt");

CREATE TABLE IF NOT EXISTS "AdminTransaction" (
  "id"            TEXT        NOT NULL PRIMARY KEY,
  "userId"        TEXT        NOT NULL REFERENCES "User"("id") ON DELETE CASCADE,
  "plan"          TEXT        NOT NULL,
  "amount"        DOUBLE PRECISION NOT NULL,
  "credits"       INTEGER     NOT NULL,
  "paymentStatus" TEXT        NOT NULL DEFAULT 'PENDING',
  "createdAt"     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS "AdminTransaction_userId_idx"        ON "AdminTransaction"("userId");
CREATE INDEX IF NOT EXISTS "AdminTransaction_paymentStatus_idx" ON "AdminTransaction"("paymentStatus");

-- ─── CMS / Settings ───────────────────────────────────────────

CREATE TABLE IF NOT EXISTS "SiteSetting" (
  "id"                 TEXT    NOT NULL PRIMARY KEY,
  "siteName"           TEXT    NOT NULL DEFAULT 'Saad Studio',
  "logoUrl"            TEXT,
  "primaryColor"       TEXT    NOT NULL DEFAULT '#7c3aed',
  "topBannerAdText"    TEXT,
  "isBannerActive"     BOOLEAN NOT NULL DEFAULT FALSE,
  "adsEnabled"         BOOLEAN NOT NULL DEFAULT FALSE,
  "termsOfServiceText" TEXT,
  "privacyPolicyText"  TEXT
);

CREATE TABLE IF NOT EXISTS "PageContent" (
  "id"          TEXT        NOT NULL PRIMARY KEY,
  "slug"        TEXT        NOT NULL,
  "sectionName" TEXT        NOT NULL,
  "textContent" TEXT,
  "mediaUrl"    TEXT,
  "isVideo"     BOOLEAN     NOT NULL DEFAULT FALSE,
  "updatedAt"   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE("slug", "sectionName")
);
CREATE INDEX IF NOT EXISTS "PageContent_slug_idx" ON "PageContent"("slug");

CREATE TABLE IF NOT EXISTS "PageLayout" (
  "id"           TEXT        NOT NULL PRIMARY KEY,
  "pageName"     TEXT        NOT NULL UNIQUE,
  "layoutBlocks" JSONB       NOT NULL DEFAULT '[]',
  "updatedAt"    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS "AdCampaign" (
  "id"         TEXT        NOT NULL PRIMARY KEY,
  "title"      TEXT        NOT NULL,
  "type"       TEXT        NOT NULL,
  "mediaUrl"   TEXT,
  "targetLink" TEXT,
  "isActive"   BOOLEAN     NOT NULL DEFAULT TRUE,
  "expiresAt"  TIMESTAMPTZ,
  "createdAt"  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt"  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS "AdCampaign_type_idx"     ON "AdCampaign"("type");
CREATE INDEX IF NOT EXISTS "AdCampaign_isActive_idx" ON "AdCampaign"("isActive");

-- ─── Cinema Studio ────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS "CinemaProject" (
  "id"                TEXT        NOT NULL PRIMARY KEY,
  "userId"            TEXT        NOT NULL,
  "name"              TEXT        NOT NULL DEFAULT 'Untitled Cinema Project',
  "conceptPrompt"     TEXT        NOT NULL DEFAULT '',
  "negativePrompt"    TEXT        NOT NULL DEFAULT '',
  "toneGenre"         TEXT        NOT NULL DEFAULT 'cinematic',
  "modelRoute"        TEXT        NOT NULL DEFAULT 'kwaivgi/kling-v3.0-pro/text-to-video',
  "aspectRatio"       TEXT        NOT NULL DEFAULT '16:9',
  "defaultDuration"   INTEGER     NOT NULL DEFAULT 5,
  "creditBalanceSnap" INTEGER     NOT NULL DEFAULT 0,
  "createdAt"         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt"         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS "CinemaProject_userId_updatedAt_idx" ON "CinemaProject"("userId", "updatedAt");

CREATE TABLE IF NOT EXISTS "CinemaShot" (
  "id"               TEXT        NOT NULL PRIMARY KEY,
  "projectId"        TEXT        NOT NULL REFERENCES "CinemaProject"("id") ON DELETE CASCADE,
  "orderIndex"       INTEGER     NOT NULL DEFAULT 0,
  "title"            TEXT        NOT NULL DEFAULT 'New Shot',
  "prompt"           TEXT        NOT NULL DEFAULT '',
  "negativePrompt"   TEXT        NOT NULL DEFAULT '',
  "duration"         INTEGER     NOT NULL DEFAULT 5,
  "ratio"            TEXT        NOT NULL DEFAULT '16:9',
  "characterIds"     TEXT[]      NOT NULL DEFAULT '{}',
  "locationId"       TEXT,
  "cameraPreset"     TEXT        NOT NULL DEFAULT 'static',
  "cameraSpeed"      INTEGER     NOT NULL DEFAULT 50,
  "motionIntensity"  INTEGER     NOT NULL DEFAULT 50,
  "smoothness"       INTEGER     NOT NULL DEFAULT 50,
  "lighting"         TEXT        NOT NULL DEFAULT 'neutral',
  "lens"             TEXT        NOT NULL DEFAULT '35mm',
  "colorGrade"       TEXT        NOT NULL DEFAULT 'cinematic',
  "audioPrompt"      TEXT        NOT NULL DEFAULT '',
  "seed"             INTEGER,
  "consistencyLock"  BOOLEAN     NOT NULL DEFAULT TRUE,
  "generationStatus" TEXT        NOT NULL DEFAULT 'idle',
  "outputAssetId"    TEXT,
  "createdAt"        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt"        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS "CinemaShot_projectId_orderIndex_idx" ON "CinemaShot"("projectId", "orderIndex");

CREATE TABLE IF NOT EXISTS "CinemaCharacter" (
  "id"           TEXT        NOT NULL PRIMARY KEY,
  "projectId"    TEXT        NOT NULL REFERENCES "CinemaProject"("id") ON DELETE CASCADE,
  "name"         TEXT        NOT NULL,
  "description"  TEXT        NOT NULL DEFAULT '',
  "referenceUrl" TEXT,
  "attributes"   JSONB       NOT NULL DEFAULT '{}',
  "createdAt"    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt"    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS "CinemaCharacter_projectId_name_idx" ON "CinemaCharacter"("projectId", "name");

CREATE TABLE IF NOT EXISTS "CinemaLocation" (
  "id"           TEXT        NOT NULL PRIMARY KEY,
  "projectId"    TEXT        NOT NULL REFERENCES "CinemaProject"("id") ON DELETE CASCADE,
  "name"         TEXT        NOT NULL,
  "description"  TEXT        NOT NULL DEFAULT '',
  "referenceUrl" TEXT,
  "attributes"   JSONB       NOT NULL DEFAULT '{}',
  "createdAt"    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt"    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS "CinemaLocation_projectId_name_idx" ON "CinemaLocation"("projectId", "name");

CREATE TABLE IF NOT EXISTS "CinemaAsset" (
  "id"           TEXT        NOT NULL PRIMARY KEY,
  "projectId"    TEXT        NOT NULL REFERENCES "CinemaProject"("id") ON DELETE CASCADE,
  "shotId"       TEXT,
  "type"         TEXT        NOT NULL,
  "url"          TEXT        NOT NULL,
  "thumbnailUrl" TEXT,
  "metadata"     JSONB       NOT NULL DEFAULT '{}',
  "createdAt"    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS "CinemaAsset_projectId_createdAt_idx" ON "CinemaAsset"("projectId", "createdAt");

CREATE TABLE IF NOT EXISTS "CinemaJob" (
  "id"          TEXT        NOT NULL PRIMARY KEY,
  "projectId"   TEXT        NOT NULL REFERENCES "CinemaProject"("id") ON DELETE CASCADE,
  "shotId"      TEXT        NOT NULL,
  "userId"      TEXT        NOT NULL,
  "status"      TEXT        NOT NULL DEFAULT 'queued',
  "taskId"      TEXT,
  "modelRoute"  TEXT        NOT NULL,
  "creditsCost" INTEGER     NOT NULL DEFAULT 0,
  "error"       TEXT,
  "resultUrl"   TEXT,
  "payload"     JSONB       NOT NULL DEFAULT '{}',
  "createdAt"   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt"   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS "CinemaJob_projectId_createdAt_idx" ON "CinemaJob"("projectId", "createdAt");
CREATE INDEX IF NOT EXISTS "CinemaJob_shotId_createdAt_idx"    ON "CinemaJob"("shotId", "createdAt");
CREATE INDEX IF NOT EXISTS "CinemaJob_userId_createdAt_idx"    ON "CinemaJob"("userId", "createdAt");

-- ─── Transitions Studio ───────────────────────────────────────

CREATE TABLE IF NOT EXISTS "TransitionProject" (
  "id"               TEXT        NOT NULL PRIMARY KEY,
  "userId"           TEXT        NOT NULL,
  "title"            TEXT        NOT NULL DEFAULT 'Untitled Transition',
  "inputAUrl"        TEXT,
  "inputAType"       TEXT        NOT NULL DEFAULT 'image',
  "inputBUrl"        TEXT,
  "inputBType"       TEXT        NOT NULL DEFAULT 'image',
  "presetId"         TEXT,
  "aspectRatio"      TEXT        NOT NULL DEFAULT '16:9',
  "duration"         INTEGER     NOT NULL DEFAULT 5,
  "intensity"        INTEGER     NOT NULL DEFAULT 50,
  "smoothness"       INTEGER     NOT NULL DEFAULT 50,
  "cinematicStr"     INTEGER     NOT NULL DEFAULT 60,
  "preserveFraming"  BOOLEAN     NOT NULL DEFAULT TRUE,
  "subjectFocus"     BOOLEAN     NOT NULL DEFAULT TRUE,
  "resolution"       TEXT        NOT NULL DEFAULT '1080p',
  "fps"              INTEGER     NOT NULL DEFAULT 24,
  "enhance"          BOOLEAN     NOT NULL DEFAULT TRUE,
  "createdAt"        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt"        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS "TransitionProject_userId_updatedAt_idx" ON "TransitionProject"("userId", "updatedAt");

CREATE TABLE IF NOT EXISTS "TransitionJob" (
  "id"          TEXT        NOT NULL PRIMARY KEY,
  "projectId"   TEXT        NOT NULL REFERENCES "TransitionProject"("id") ON DELETE CASCADE,
  "userId"      TEXT        NOT NULL,
  "presetId"    TEXT        NOT NULL,
  "status"      TEXT        NOT NULL DEFAULT 'queued',
  "taskId"      TEXT,
  "creditsCost" INTEGER     NOT NULL DEFAULT 0,
  "error"       TEXT,
  "resultUrl"   TEXT,
  "payload"     JSONB       NOT NULL DEFAULT '{}',
  "createdAt"   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt"   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS "TransitionJob_projectId_createdAt_idx" ON "TransitionJob"("projectId", "createdAt");
CREATE INDEX IF NOT EXISTS "TransitionJob_userId_createdAt_idx"    ON "TransitionJob"("userId", "createdAt");

CREATE TABLE IF NOT EXISTS "TransitionOutput" (
  "id"           TEXT        NOT NULL PRIMARY KEY,
  "projectId"    TEXT        NOT NULL REFERENCES "TransitionProject"("id") ON DELETE CASCADE,
  "jobId"        TEXT        NOT NULL UNIQUE REFERENCES "TransitionJob"("id") ON DELETE CASCADE,
  "userId"       TEXT        NOT NULL,
  "url"          TEXT        NOT NULL,
  "thumbnailUrl" TEXT,
  "presetId"     TEXT        NOT NULL,
  "presetName"   TEXT        NOT NULL,
  "aspectRatio"  TEXT        NOT NULL,
  "duration"     INTEGER     NOT NULL,
  "inputAUrl"    TEXT,
  "inputBUrl"    TEXT,
  "reuseAsA"     BOOLEAN     NOT NULL DEFAULT FALSE,
  "reuseAsB"     BOOLEAN     NOT NULL DEFAULT FALSE,
  "createdAt"    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS "TransitionOutput_userId_createdAt_idx"    ON "TransitionOutput"("userId", "createdAt");
CREATE INDEX IF NOT EXISTS "TransitionOutput_projectId_createdAt_idx" ON "TransitionOutput"("projectId", "createdAt");

-- ─── Variations Studio ────────────────────────────────────────

CREATE TABLE IF NOT EXISTS "VariationProject" (
  "id"                TEXT        NOT NULL PRIMARY KEY,
  "userId"            TEXT        NOT NULL,
  "title"             TEXT        NOT NULL DEFAULT 'Untitled Variation',
  "referenceAssetUrl" TEXT,
  "referenceAssetId"  TEXT,
  "selectedMode"      TEXT        NOT NULL DEFAULT 'storyboard',
  "selectedGenMode"   TEXT        NOT NULL DEFAULT 'standard',
  "outputCount"       INTEGER     NOT NULL DEFAULT 9,
  "aspectRatio"       TEXT        NOT NULL DEFAULT '16:9',
  "direction"         TEXT        NOT NULL DEFAULT '',
  "negativeDirection" TEXT        NOT NULL DEFAULT '',
  "consistencyLock"   BOOLEAN     NOT NULL DEFAULT TRUE,
  "settingsJson"      JSONB       NOT NULL DEFAULT '{}',
  "createdAt"         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt"         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS "VariationProject_userId_updatedAt_idx" ON "VariationProject"("userId", "updatedAt");

CREATE TABLE IF NOT EXISTS "VariationJob" (
  "id"        TEXT        NOT NULL PRIMARY KEY,
  "projectId" TEXT        NOT NULL REFERENCES "VariationProject"("id") ON DELETE CASCADE,
  "userId"    TEXT        NOT NULL,
  "status"    TEXT        NOT NULL DEFAULT 'queued',
  "error"     TEXT,
  "payload"   JSONB       NOT NULL DEFAULT '{}',
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS "VariationJob_projectId_createdAt_idx" ON "VariationJob"("projectId", "createdAt");
CREATE INDEX IF NOT EXISTS "VariationJob_userId_createdAt_idx"    ON "VariationJob"("userId", "createdAt");

CREATE TABLE IF NOT EXISTS "VariationOutput" (
  "id"               TEXT        NOT NULL PRIMARY KEY,
  "projectId"        TEXT        NOT NULL REFERENCES "VariationProject"("id") ON DELETE CASCADE,
  "jobId"            TEXT        REFERENCES "VariationJob"("id"),
  "userId"           TEXT        NOT NULL,
  "variationMode"    TEXT        NOT NULL,
  "presetId"         TEXT        NOT NULL,
  "presetLabel"      TEXT        NOT NULL,
  "modelUsed"        TEXT        NOT NULL,
  "fallbackUsed"     BOOLEAN     NOT NULL DEFAULT FALSE,
  "assetUrl"         TEXT,
  "thumbnailUrl"     TEXT,
  "generationStatus" TEXT        NOT NULL DEFAULT 'pending',
  "creditCost"       INTEGER     NOT NULL DEFAULT 0,
  "kieTaskId"        TEXT,
  "createdAt"        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt"        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS "VariationOutput_projectId_createdAt_idx" ON "VariationOutput"("projectId", "createdAt");
CREATE INDEX IF NOT EXISTS "VariationOutput_userId_createdAt_idx"    ON "VariationOutput"("userId", "createdAt");
CREATE INDEX IF NOT EXISTS "VariationOutput_jobId_idx"               ON "VariationOutput"("jobId");

-- ─── Done ─────────────────────────────────────────────────────
-- Verify: SELECT tablename FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename;
