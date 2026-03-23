-- =====================================================
-- SAAD STUDIO — Supabase Migration
-- Run this in your Supabase SQL Editor to create
-- all required tables for the dashboard to work
-- persistently on production (Render).
-- =====================================================

-- 1. cms_settings — stores theme, fonts, CMS data
CREATE TABLE IF NOT EXISTS cms_settings (
  key         TEXT PRIMARY KEY,
  value       JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Enable Row Level Security (service role can bypass)
ALTER TABLE cms_settings ENABLE ROW LEVEL SECURITY;
-- Allow service role full access
CREATE POLICY IF NOT EXISTS "service_role_all"
  ON cms_settings FOR ALL USING (true) WITH CHECK (true);

-- 2. orders — stores upgrade/plan/credit orders
CREATE TABLE IF NOT EXISTS orders (
  id              TEXT PRIMARY KEY,
  user_id         TEXT NOT NULL,
  email           TEXT NOT NULL,
  type            TEXT NOT NULL DEFAULT 'credits',
  current_plan    TEXT,
  new_plan        TEXT,
  pack            INTEGER DEFAULT 0,
  credits         INTEGER DEFAULT 0,
  status          TEXT NOT NULL DEFAULT 'pending',
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  approved_at     TIMESTAMPTZ,
  rejected_at     TIMESTAMPTZ,
  amount          NUMERIC
);

ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
CREATE POLICY IF NOT EXISTS "service_role_all"
  ON orders FOR ALL USING (true) WITH CHECK (true);

CREATE INDEX IF NOT EXISTS orders_user_id_idx ON orders(user_id);
CREATE INDEX IF NOT EXISTS orders_status_idx ON orders(status);
CREATE INDEX IF NOT EXISTS orders_created_at_idx ON orders(created_at DESC);

-- 3. Verify tables created
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN ('profiles', 'orders', 'cms_settings')
ORDER BY table_name;
