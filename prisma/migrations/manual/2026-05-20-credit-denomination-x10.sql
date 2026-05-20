-- ─────────────────────────────────────────────────────────────────────────────
-- Manual migration: credit denomination rescale (÷10)
-- ─────────────────────────────────────────────────────────────────────────────
--
-- After this commit, the SAAD credit system uses a 10× larger denomination
-- (1 credit ≈ $0.05 instead of $0.005). pricing-models.ts was updated so
-- every userCreditsRate and SAAD_PLANS.credits and KIE_PACKAGES.credits is
-- divided by 10. This script applies the matching divide-by-10 to existing
-- user balances in Neon so that purchasing power stays the same as before.
--
-- HOW TO RUN
--   psql "$DATABASE_URL" -f prisma/migrations/manual/2026-05-20-credit-denomination-x10.sql
-- or paste into the Neon SQL editor.
--
-- The script is idempotent ONLY IF run once. Running twice would divide
-- again. Set the marker row in CmsSetting after running so a re-run aborts.
-- ─────────────────────────────────────────────────────────────────────────────

DO $$
DECLARE
  v_already_applied boolean;
BEGIN
  SELECT EXISTS (
    SELECT 1
    FROM "SiteSetting"
    WHERE "id" = 'credit-denomination-x10-applied'
  ) INTO v_already_applied;

  IF v_already_applied THEN
    RAISE NOTICE 'Migration already applied — skipping.';
    RETURN;
  END IF;

  -- ── User credit balance ÷ 10 ───────────────────────────────────────────────
  UPDATE "User"
  SET
    "creditBalance"  = CEIL("creditBalance"::numeric  / 10)::int,
    "monthlyCredits" = CEIL("monthlyCredits"::numeric / 10)::int
  WHERE "creditBalance" > 0 OR "monthlyCredits" > 0;

  -- ── Past generation costs ÷ 10 (analytics consistency) ────────────────────
  UPDATE "Generation"
  SET "cost" = ROUND(("cost"::numeric / 10)::numeric, 2)
  WHERE "cost" > 0;

  -- ── Admin transaction credit grants ÷ 10 ──────────────────────────────────
  UPDATE "AdminTransaction"
  SET "credits" = CEIL("credits"::numeric / 10)::int
  WHERE "credits" > 0;

  -- ── Mark as applied so future runs are no-ops ─────────────────────────────
  INSERT INTO "SiteSetting" ("id", "createdAt", "updatedAt")
  VALUES ('credit-denomination-x10-applied', NOW(), NOW())
  ON CONFLICT ("id") DO NOTHING;

  RAISE NOTICE 'Credit denomination rescale (÷10) applied.';
END $$;
