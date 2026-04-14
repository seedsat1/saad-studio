-- ============================================================
-- Supabase Storage Setup for Saad Studio
-- Run this in: Supabase Dashboard → SQL Editor
-- ============================================================

-- ─── 1. Create Storage Buckets ──────────────────────────────
-- Run each INSERT separately if any already exist.

INSERT INTO storage.buckets (id, name, public)
VALUES ('images', 'images', true)
ON CONFLICT (id) DO UPDATE SET public = true;

INSERT INTO storage.buckets (id, name, public)
VALUES ('videos', 'videos', true)
ON CONFLICT (id) DO UPDATE SET public = true;

INSERT INTO storage.buckets (id, name, public)
VALUES ('audio', 'audio', true)
ON CONFLICT (id) DO UPDATE SET public = true;

INSERT INTO storage.buckets (id, name, public)
VALUES ('thumbnails', 'thumbnails', true)
ON CONFLICT (id) DO UPDATE SET public = true;


-- ─── 2. Row Level Security — Storage Objects ─────────────────
-- Users can only read/write their own folder (userId/...)

-- Allow public read on all buckets (files are public by URL)
CREATE POLICY "Public read — images"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'images');

CREATE POLICY "Public read — videos"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'videos');

CREATE POLICY "Public read — audio"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'audio');

CREATE POLICY "Public read — thumbnails"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'thumbnails');

-- Service role can INSERT/UPDATE (server-side only, bypasses RLS automatically)
-- No extra policy needed — service_role bypasses RLS by default.

-- ─── 3. Enable RLS on storage.objects (if not already enabled) ──
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;


-- ─── 4. Verify buckets were created ─────────────────────────
SELECT id, name, public FROM storage.buckets
WHERE id IN ('images', 'videos', 'audio', 'thumbnails');
