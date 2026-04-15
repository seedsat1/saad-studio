-- ============================================================
-- FILE: prisma/pricing_constitution_init.sql
-- Run this in Supabase → SQL Editor to create the two tables
-- needed for the Pricing Constitution admin feature.
-- ============================================================

-- Table: PricingConstitution
CREATE TABLE IF NOT EXISTS "PricingConstitution" (
  "id"              TEXT        NOT NULL,
  "name"            TEXT        NOT NULL,
  "notes"           TEXT        NOT NULL DEFAULT '',
  "type"            TEXT        NOT NULL,
  "provider"        TEXT        NOT NULL,
  "billing"         TEXT        NOT NULL,
  "kieCredits"      DOUBLE PRECISION NOT NULL DEFAULT 0,
  "waveUsd"         DOUBLE PRECISION NOT NULL DEFAULT 0,
  "userCreditsRate" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "maxDuration"     INTEGER,
  "isActive"        BOOLEAN     NOT NULL DEFAULT TRUE,
  "updatedAt"       TIMESTAMP(3) NOT NULL DEFAULT NOW(),

  CONSTRAINT "PricingConstitution_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "PricingConstitution_type_idx"     ON "PricingConstitution"("type");
CREATE INDEX IF NOT EXISTS "PricingConstitution_isActive_idx" ON "PricingConstitution"("isActive");

-- Table: PlatformConfig
CREATE TABLE IF NOT EXISTS "PlatformConfig" (
  "key"       TEXT         NOT NULL,
  "value"     TEXT         NOT NULL,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT NOW(),

  CONSTRAINT "PlatformConfig_pkey" PRIMARY KEY ("key")
);

-- Auto-update updatedAt on PricingConstitution
CREATE OR REPLACE FUNCTION update_pricing_constitution_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW."updatedAt" = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS pricing_constitution_updated_at ON "PricingConstitution";
CREATE TRIGGER pricing_constitution_updated_at
  BEFORE UPDATE ON "PricingConstitution"
  FOR EACH ROW EXECUTE PROCEDURE update_pricing_constitution_updated_at();

-- Auto-update updatedAt on PlatformConfig
CREATE OR REPLACE FUNCTION update_platform_config_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW."updatedAt" = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS platform_config_updated_at ON "PlatformConfig";
CREATE TRIGGER platform_config_updated_at
  BEFORE UPDATE ON "PlatformConfig"
  FOR EACH ROW EXECUTE PROCEDURE update_platform_config_updated_at();
