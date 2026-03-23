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
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='cms_settings' AND policyname='service_role_all') THEN
    CREATE POLICY "service_role_all" ON cms_settings FOR ALL USING (true) WITH CHECK (true);
  END IF;
END $$;

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
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='orders' AND policyname='service_role_all') THEN
    CREATE POLICY "service_role_all" ON orders FOR ALL USING (true) WITH CHECK (true);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS orders_user_id_idx ON orders(user_id);
CREATE INDEX IF NOT EXISTS orders_status_idx ON orders(status);
CREATE INDEX IF NOT EXISTS orders_created_at_idx ON orders(created_at DESC);

-- 3. profiles — ensure all application columns exist
-- (The profiles table is auto-created by Supabase Auth trigger, but app columns must be added manually)
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS credits               INTEGER DEFAULT 0;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS max_credits           INTEGER DEFAULT 0;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS plan                  TEXT DEFAULT 'starter';
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS is_admin              BOOLEAN DEFAULT false;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS nano_banana_free      BOOLEAN DEFAULT true;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS renew_date            TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS subscription_start_date TIMESTAMPTZ;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS subscription_end_date TIMESTAMPTZ;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS pending_plan          TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS updated_at            TIMESTAMPTZ DEFAULT NOW();

-- Allow service role to read/write profiles
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='profiles' AND policyname='service_role_all') THEN
    CREATE POLICY "service_role_all" ON profiles FOR ALL USING (true) WITH CHECK (true);
  END IF;
END $$;

-- 4. Verify tables created
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN ('profiles', 'orders', 'cms_settings')
ORDER BY table_name;
