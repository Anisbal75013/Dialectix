-- ═══════════════════════════════════════════════════════════════════════════════
-- DIALECTIX AI — Migration 007: Academy Name on Profiles
-- ═══════════════════════════════════════════════════════════════════════════════
-- ADDITIVE ONLY — safe to run multiple times (IF NOT EXISTS / IF NOT EXISTS guard).
-- Adds: profiles.academy_name — custom academy name displayed on the City Builder map.
-- ═══════════════════════════════════════════════════════════════════════════════

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS academy_name TEXT;

-- Optional: index for leaderboard / academy-name search
CREATE INDEX IF NOT EXISTS idx_profiles_academy_name ON profiles (academy_name)
  WHERE academy_name IS NOT NULL;

-- ═══════════════════════════════════════════════════════════════════════════════
-- END MIGRATION 007
-- ═══════════════════════════════════════════════════════════════════════════════
