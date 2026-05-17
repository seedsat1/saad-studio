-- Studio Image library — admin-curated prompt cards with image/video media + steps.
-- Run once in Supabase SQL editor (or via your migration tool).

CREATE TABLE IF NOT EXISTS "StudioImg" (
  "id"          TEXT NOT NULL PRIMARY KEY,
  "title"       TEXT NOT NULL,
  "prompt"      TEXT NOT NULL DEFAULT '',
  "params"      TEXT NOT NULL DEFAULT '',
  "model"       TEXT NOT NULL DEFAULT '',
  "category"    TEXT NOT NULL DEFAULT '',
  "beforeUrl"   TEXT,
  "afterUrl"    TEXT,
  "videoUrl"    TEXT,
  "posterUrl"   TEXT,
  "mediaType"   TEXT NOT NULL DEFAULT 'image',
  "isPublished" BOOLEAN NOT NULL DEFAULT true,
  "sortOrder"   INTEGER NOT NULL DEFAULT 0,
  "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"   TIMESTAMP(3) NOT NULL
);

CREATE INDEX IF NOT EXISTS "StudioImg_category_idx"            ON "StudioImg" ("category");
CREATE INDEX IF NOT EXISTS "StudioImg_model_idx"               ON "StudioImg" ("model");
CREATE INDEX IF NOT EXISTS "StudioImg_isPublished_sortOrder_idx" ON "StudioImg" ("isPublished", "sortOrder");

CREATE TABLE IF NOT EXISTS "StudioImgStep" (
  "id"          TEXT NOT NULL PRIMARY KEY,
  "studioImgId" TEXT NOT NULL,
  "label"       TEXT NOT NULL DEFAULT '',
  "content"     TEXT NOT NULL DEFAULT '',
  "beforeUrl"   TEXT,
  "afterUrl"    TEXT,
  "videoUrl"    TEXT,
  "posterUrl"   TEXT,
  "viewMode"    TEXT NOT NULL DEFAULT 'slider',
  "sortOrder"   INTEGER NOT NULL DEFAULT 0,
  "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"   TIMESTAMP(3) NOT NULL,
  CONSTRAINT "StudioImgStep_studioImgId_fkey"
    FOREIGN KEY ("studioImgId") REFERENCES "StudioImg"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "StudioImgStep_studioImgId_sortOrder_idx"
  ON "StudioImgStep" ("studioImgId", "sortOrder");

CREATE TABLE IF NOT EXISTS "StudioImgCategory" (
  "id"        TEXT NOT NULL PRIMARY KEY,
  "name"      TEXT NOT NULL,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX IF NOT EXISTS "StudioImgCategory_name_key" ON "StudioImgCategory" ("name");

CREATE TABLE IF NOT EXISTS "StudioImgModel" (
  "id"        TEXT NOT NULL PRIMARY KEY,
  "name"      TEXT NOT NULL,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX IF NOT EXISTS "StudioImgModel_name_key" ON "StudioImgModel" ("name");
