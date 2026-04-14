CREATE TABLE IF NOT EXISTS "CinemaProject" (
  "id" TEXT PRIMARY KEY,
  "userId" TEXT NOT NULL,
  "name" TEXT NOT NULL DEFAULT 'Untitled Cinema Project',
  "conceptPrompt" TEXT NOT NULL DEFAULT '',
  "negativePrompt" TEXT NOT NULL DEFAULT '',
  "toneGenre" TEXT NOT NULL DEFAULT 'cinematic',
  "modelRoute" TEXT NOT NULL DEFAULT 'kwaivgi/kling-v3.0-pro/text-to-video',
  "aspectRatio" TEXT NOT NULL DEFAULT '16:9',
  "defaultDuration" INTEGER NOT NULL DEFAULT 5,
  "creditBalanceSnap" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "CinemaShot" (
  "id" TEXT PRIMARY KEY,
  "projectId" TEXT NOT NULL,
  "orderIndex" INTEGER NOT NULL DEFAULT 0,
  "title" TEXT NOT NULL DEFAULT 'New Shot',
  "prompt" TEXT NOT NULL DEFAULT '',
  "negativePrompt" TEXT NOT NULL DEFAULT '',
  "duration" INTEGER NOT NULL DEFAULT 5,
  "ratio" TEXT NOT NULL DEFAULT '16:9',
  "characterIds" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "locationId" TEXT,
  "cameraPreset" TEXT NOT NULL DEFAULT 'static',
  "cameraSpeed" INTEGER NOT NULL DEFAULT 50,
  "motionIntensity" INTEGER NOT NULL DEFAULT 50,
  "smoothness" INTEGER NOT NULL DEFAULT 50,
  "lighting" TEXT NOT NULL DEFAULT 'neutral',
  "lens" TEXT NOT NULL DEFAULT '35mm',
  "colorGrade" TEXT NOT NULL DEFAULT 'cinematic',
  "audioPrompt" TEXT NOT NULL DEFAULT '',
  "seed" INTEGER,
  "consistencyLock" BOOLEAN NOT NULL DEFAULT TRUE,
  "generationStatus" TEXT NOT NULL DEFAULT 'idle',
  "outputAssetId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "CinemaShot_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "CinemaProject"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS "CinemaCharacter" (
  "id" TEXT PRIMARY KEY,
  "projectId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "description" TEXT NOT NULL DEFAULT '',
  "referenceUrl" TEXT,
  "attributes" JSONB NOT NULL DEFAULT '{}'::jsonb,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "CinemaCharacter_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "CinemaProject"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS "CinemaLocation" (
  "id" TEXT PRIMARY KEY,
  "projectId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "description" TEXT NOT NULL DEFAULT '',
  "referenceUrl" TEXT,
  "attributes" JSONB NOT NULL DEFAULT '{}'::jsonb,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "CinemaLocation_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "CinemaProject"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS "CinemaAsset" (
  "id" TEXT PRIMARY KEY,
  "projectId" TEXT NOT NULL,
  "shotId" TEXT,
  "type" TEXT NOT NULL,
  "url" TEXT NOT NULL,
  "thumbnailUrl" TEXT,
  "metadata" JSONB NOT NULL DEFAULT '{}'::jsonb,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "CinemaAsset_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "CinemaProject"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS "CinemaJob" (
  "id" TEXT PRIMARY KEY,
  "projectId" TEXT NOT NULL,
  "shotId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'queued',
  "taskId" TEXT,
  "modelRoute" TEXT NOT NULL,
  "creditsCost" INTEGER NOT NULL DEFAULT 0,
  "error" TEXT,
  "resultUrl" TEXT,
  "payload" JSONB NOT NULL DEFAULT '{}'::jsonb,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "CinemaJob_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "CinemaProject"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "CinemaProject_userId_updatedAt_idx" ON "CinemaProject"("userId", "updatedAt");
CREATE INDEX IF NOT EXISTS "CinemaShot_projectId_orderIndex_idx" ON "CinemaShot"("projectId", "orderIndex");
CREATE INDEX IF NOT EXISTS "CinemaCharacter_projectId_name_idx" ON "CinemaCharacter"("projectId", "name");
CREATE INDEX IF NOT EXISTS "CinemaLocation_projectId_name_idx" ON "CinemaLocation"("projectId", "name");
CREATE INDEX IF NOT EXISTS "CinemaAsset_projectId_createdAt_idx" ON "CinemaAsset"("projectId", "createdAt");
CREATE INDEX IF NOT EXISTS "CinemaJob_projectId_createdAt_idx" ON "CinemaJob"("projectId", "createdAt");
CREATE INDEX IF NOT EXISTS "CinemaJob_shotId_createdAt_idx" ON "CinemaJob"("shotId", "createdAt");
CREATE INDEX IF NOT EXISTS "CinemaJob_userId_createdAt_idx" ON "CinemaJob"("userId", "createdAt");
