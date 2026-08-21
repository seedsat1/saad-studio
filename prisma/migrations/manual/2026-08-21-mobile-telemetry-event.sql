-- Versioned Additive Migration: Mobile Telemetry Event
-- Date: 2026-08-21
-- Description: Creates the MobileTelemetryEvent table and required query indexes for the Mobile Control Plane and Admin Health Matrix.
-- Invariants: Strictly additive. Zero modifications to existing tables, columns, constraints, or financial records.

CREATE TABLE IF NOT EXISTS "MobileTelemetryEvent" (
  "id" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "userId" TEXT,
  "route" TEXT NOT NULL,
  "feature" TEXT NOT NULL,
  "operation" TEXT NOT NULL,
  "status" TEXT NOT NULL,
  "errorCode" TEXT,
  "errorMessage" TEXT,
  "deviceClass" TEXT NOT NULL,
  "browser" TEXT NOT NULL,
  "os" TEXT NOT NULL,
  "metadata" JSONB,

  CONSTRAINT "MobileTelemetryEvent_pkey" PRIMARY KEY ("id")
);

-- Query performance indexes for Admin Control Center & Mobile Health Matrix
CREATE INDEX IF NOT EXISTS "MobileTelemetryEvent_createdAt_idx" ON "MobileTelemetryEvent"("createdAt");
CREATE INDEX IF NOT EXISTS "MobileTelemetryEvent_feature_deviceClass_createdAt_idx" ON "MobileTelemetryEvent"("feature", "deviceClass", "createdAt");
CREATE INDEX IF NOT EXISTS "MobileTelemetryEvent_status_createdAt_idx" ON "MobileTelemetryEvent"("status", "createdAt");
CREATE INDEX IF NOT EXISTS "MobileTelemetryEvent_userId_idx" ON "MobileTelemetryEvent"("userId");
