-- Migration: Add missing columns to Generation table
-- Run this in your Neon dashboard → SQL Editor
-- Safe to run multiple times (IF NOT EXISTS)

ALTER TABLE "Generation" ADD COLUMN IF NOT EXISTS "outputUrl" TEXT;
ALTER TABLE "Generation" ADD COLUMN IF NOT EXISTS "type"      TEXT;
ALTER TABLE "Generation" ADD COLUMN IF NOT EXISTS "status"    TEXT;
