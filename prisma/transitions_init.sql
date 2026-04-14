-- Transitions Studio tables
-- Run once to seed the new Transition models

CREATE TABLE IF NOT EXISTS "TransitionProject" (
  "id"               TEXT NOT NULL PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "userId"           TEXT NOT NULL,
  "title"            TEXT NOT NULL DEFAULT 'Untitled Transition',
  "inputAUrl"        TEXT,
  "inputAType"       TEXT NOT NULL DEFAULT 'image',
  "inputBUrl"        TEXT,
  "inputBType"       TEXT NOT NULL DEFAULT 'image',
  "presetId"         TEXT,
  "aspectRatio"      TEXT NOT NULL DEFAULT '16:9',
  "duration"         INTEGER NOT NULL DEFAULT 5,
  "intensity"        INTEGER NOT NULL DEFAULT 50,
  "smoothness"       INTEGER NOT NULL DEFAULT 60,
  "cinematicStr"     INTEGER NOT NULL DEFAULT 65,
  "preserveFraming"  BOOLEAN NOT NULL DEFAULT true,
  "subjectFocus"     BOOLEAN NOT NULL DEFAULT true,
  "resolution"       TEXT NOT NULL DEFAULT '1080p',
  "fps"              INTEGER NOT NULL DEFAULT 24,
  "enhance"          BOOLEAN NOT NULL DEFAULT true,
  "createdAt"        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt"        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS "TransitionProject_userId_idx"
  ON "TransitionProject" ("userId");

CREATE INDEX IF NOT EXISTS "TransitionProject_userId_createdAt_idx"
  ON "TransitionProject" ("userId", "createdAt");


CREATE TABLE IF NOT EXISTS "TransitionJob" (
  "id"          TEXT NOT NULL PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "projectId"   TEXT NOT NULL,
  "userId"      TEXT NOT NULL,
  "presetId"    TEXT NOT NULL,
  "status"      TEXT NOT NULL DEFAULT 'queued',
  "taskId"      TEXT,
  "creditsCost" INTEGER NOT NULL DEFAULT 0,
  "error"       TEXT,
  "resultUrl"   TEXT,
  "payload"     TEXT,
  "createdAt"   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt"   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT "TransitionJob_projectId_fkey"
    FOREIGN KEY ("projectId") REFERENCES "TransitionProject"("id") ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS "TransitionJob_projectId_idx"
  ON "TransitionJob" ("projectId");

CREATE INDEX IF NOT EXISTS "TransitionJob_userId_status_idx"
  ON "TransitionJob" ("userId", "status");

CREATE INDEX IF NOT EXISTS "TransitionJob_taskId_idx"
  ON "TransitionJob" ("taskId");


CREATE TABLE IF NOT EXISTS "TransitionOutput" (
  "id"           TEXT NOT NULL PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "projectId"    TEXT NOT NULL,
  "jobId"        TEXT NOT NULL UNIQUE,
  "userId"       TEXT NOT NULL,
  "url"          TEXT NOT NULL,
  "thumbnailUrl" TEXT,
  "presetId"     TEXT NOT NULL,
  "presetName"   TEXT NOT NULL,
  "aspectRatio"  TEXT NOT NULL DEFAULT '16:9',
  "duration"     INTEGER NOT NULL DEFAULT 5,
  "inputAUrl"    TEXT,
  "inputBUrl"    TEXT,
  "reuseAsA"     BOOLEAN NOT NULL DEFAULT false,
  "reuseAsB"     BOOLEAN NOT NULL DEFAULT false,
  "createdAt"    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT "TransitionOutput_projectId_fkey"
    FOREIGN KEY ("projectId") REFERENCES "TransitionProject"("id") ON DELETE CASCADE,
  CONSTRAINT "TransitionOutput_jobId_fkey"
    FOREIGN KEY ("jobId") REFERENCES "TransitionJob"("id") ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS "TransitionOutput_userId_createdAt_idx"
  ON "TransitionOutput" ("userId", "createdAt");

CREATE INDEX IF NOT EXISTS "TransitionOutput_projectId_createdAt_idx"
  ON "TransitionOutput" ("projectId", "createdAt");
