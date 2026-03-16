-- ═══════════════════════════════════════════════════════════════════════════════
-- DIALECTIX AI — Migration 008: Duel Stats (Speed Run)
-- ═══════════════════════════════════════════════════════════════════════════════
-- Additive only. Safe to run multiple times (IF NOT EXISTS guards).
-- Table duel_stats:
--   • One row per user (upserted after each speed run)
--   • best_score_1min   — personal record (sophisms detected in 60s)
--   • sophisms_detected — JSONB counter per fallacy type {"ad_hominem": 3, ...}
--   • total_correct / total_answered — accuracy aggregate
-- RLS: users can only read/write their own row.
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS duel_stats (
  user_id          UUID         PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
  total_duels      INTEGER      NOT NULL DEFAULT 0,
  best_score_1min  INTEGER      NOT NULL DEFAULT 0,
  sophisms_detected JSONB       NOT NULL DEFAULT '{}',
  total_correct    INTEGER      NOT NULL DEFAULT 0,
  total_answered   INTEGER      NOT NULL DEFAULT 0,
  updated_at       TIMESTAMPTZ  DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_duel_stats_best ON duel_stats (best_score_1min DESC);

ALTER TABLE duel_stats ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "duel_stats_own_read"   ON duel_stats;
CREATE POLICY "duel_stats_own_read"
  ON duel_stats FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "duel_stats_own_upsert" ON duel_stats;
CREATE POLICY "duel_stats_own_upsert"
  ON duel_stats FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "duel_stats_own_update" ON duel_stats;
CREATE POLICY "duel_stats_own_update"
  ON duel_stats FOR UPDATE
  USING (auth.uid() = user_id);

-- World record read: allow any authenticated user to query the leaderboard
DROP POLICY IF EXISTS "duel_stats_world_read" ON duel_stats;
CREATE POLICY "duel_stats_world_read"
  ON duel_stats FOR SELECT
  USING (true);

-- ═══════════════════════════════════════════════════════════════════════════════
-- END MIGRATION 008
-- ═══════════════════════════════════════════════════════════════════════════════
