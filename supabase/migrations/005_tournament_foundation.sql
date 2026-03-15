-- ═══════════════════════════════════════════════════════════════════════════════
-- DIALECTIX AI — Migration 005: Tournament & Season Foundation
-- ═══════════════════════════════════════════════════════════════════════════════
-- ENGINEERING PRINCIPLE: "Prepare systems without activating them."
--
-- This migration is PURELY ADDITIVE.
--   • IF NOT EXISTS guards on every DDL statement.
--   • All new profile columns are NULLABLE with safe defaults.
--   • No existing tables dropped or altered destructively.
--   • Idempotent: safe to run multiple times.
--   • No match logic, no tournament gameplay — structure only.
-- ═══════════════════════════════════════════════════════════════════════════════

-- ─── PART 1: TOURNAMENTS TABLE ───────────────────────────────────────────────
-- Registration-only table. No match rows yet.
-- Status lifecycle: registration_open → upcoming → completed

CREATE TABLE IF NOT EXISTS tournaments (
  id               UUID         DEFAULT gen_random_uuid() PRIMARY KEY,
  title            TEXT         NOT NULL,
  academy          TEXT,                        -- optional sponsoring academy
  description      TEXT,
  status           TEXT         NOT NULL DEFAULT 'registration_open'
                                CHECK (status IN (
                                  'registration_open',
                                  'upcoming',
                                  'completed'
                                )),
  start_date       TIMESTAMPTZ,                 -- null = TBD
  minimum_players  INTEGER      NOT NULL DEFAULT 4,
  created_at       TIMESTAMPTZ  DEFAULT now()
);

-- ─── PART 2: TOURNAMENT REGISTRATIONS TABLE ──────────────────────────────────
-- One row per user per tournament. UNIQUE(user_id, tournament_id) prevents dupes.
-- Side A = Pro position / Side B = Contra position (matches Arena convention).

CREATE TABLE IF NOT EXISTS tournament_registrations (
  id               UUID         DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id          UUID         NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  tournament_id    UUID         NOT NULL REFERENCES tournaments(id) ON DELETE CASCADE,
  side             TEXT         NOT NULL CHECK (side IN ('A', 'B')),
  created_at       TIMESTAMPTZ  DEFAULT now(),

  -- Prevent a user registering twice for the same tournament
  CONSTRAINT uq_user_tournament UNIQUE (user_id, tournament_id)
);

-- Performance indexes for counter queries and user lookups
CREATE INDEX IF NOT EXISTS idx_treg_tournament  ON tournament_registrations (tournament_id);
CREATE INDEX IF NOT EXISTS idx_treg_user        ON tournament_registrations (user_id);
CREATE INDEX IF NOT EXISTS idx_treg_side        ON tournament_registrations (tournament_id, side);

-- ─── RLS: TOURNAMENTS ────────────────────────────────────────────────────────
ALTER TABLE tournaments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "tournaments_public_read" ON tournaments;
CREATE POLICY "tournaments_public_read"
  ON tournaments FOR SELECT
  USING (true);                                  -- public read, no public write

-- ─── RLS: TOURNAMENT REGISTRATIONS ──────────────────────────────────────────
ALTER TABLE tournament_registrations ENABLE ROW LEVEL SECURITY;

-- Anyone can read (needed for side counters)
DROP POLICY IF EXISTS "treg_public_read" ON tournament_registrations;
CREATE POLICY "treg_public_read"
  ON tournament_registrations FOR SELECT
  USING (true);

-- Authenticated users can register themselves only
DROP POLICY IF EXISTS "treg_own_insert" ON tournament_registrations;
CREATE POLICY "treg_own_insert"
  ON tournament_registrations FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can cancel their own registration
DROP POLICY IF EXISTS "treg_own_delete" ON tournament_registrations;
CREATE POLICY "treg_own_delete"
  ON tournament_registrations FOR DELETE
  USING (auth.uid() = user_id);

-- ─── PART 2: SEED — 3 SAFE INITIAL TOURNAMENTS ───────────────────────────────
-- Topics selected for intellectual engagement with minimal moderation risk.
-- No geopolitics, no identity politics, no high-risk territory.

INSERT INTO tournaments (title, description, status, minimum_players)
VALUES
  (
    'Believers vs Non-Believers',
    'Can faith and reason coexist? A structured clash between those who affirm the value of religious belief and those who argue from secular rationalism. Both sides must engage with the strongest form of the opposing argument.',
    'registration_open',
    4
  ),
  (
    'AI Progress vs AI Risk',
    'Does accelerating artificial intelligence represent humanity''s greatest opportunity, or its most serious existential threat? Two positions, one defining question for our century.',
    'registration_open',
    4
  ),
  (
    'Is Marriage Obsolete?',
    'In an era of evolving social contracts and shifting values, does the institution of marriage still serve its original social function — or has it become a cultural relic? Defend or challenge the institution.',
    'registration_open',
    4
  )
ON CONFLICT DO NOTHING;

-- ─── PART 6: PROFILE SAFE EXTENSIONS ─────────────────────────────────────────
-- All additions are NULLABLE or have DEFAULT values.
-- Existing profiles are unaffected — no backfill required.
-- No onboarding flow dependency.

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS country           TEXT,
  ADD COLUMN IF NOT EXISTS debate_experience TEXT
                             DEFAULT 'beginner'
                             CHECK (debate_experience IN (
                               'beginner', 'intermediate', 'advanced', 'expert'
                             )),
  ADD COLUMN IF NOT EXISTS interests         TEXT[],          -- array of topic tags
  ADD COLUMN IF NOT EXISTS avatar_id         TEXT DEFAULT 'default',
  ADD COLUMN IF NOT EXISTS season_points     INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS is_verified       BOOLEAN NOT NULL DEFAULT false;

-- NOTE: peak_elo was added in migration 004_engagement.sql
-- Skipped here to avoid duplicate column error.

-- ─── PART 8: SEASONS TABLE ───────────────────────────────────────────────────
-- Stores season metadata. season_points on profiles is already added above.
-- No ranking logic here — that lives in seasonService.js.

CREATE TABLE IF NOT EXISTS seasons (
  id          UUID         DEFAULT gen_random_uuid() PRIMARY KEY,
  name        TEXT         NOT NULL,
  start_date  TIMESTAMPTZ  NOT NULL,
  end_date    TIMESTAMPTZ  NOT NULL,
  is_active   BOOLEAN      NOT NULL DEFAULT false,
  created_at  TIMESTAMPTZ  DEFAULT now(),

  -- Only one season can be active at a time
  CONSTRAINT uq_active_season UNIQUE (is_active) DEFERRABLE INITIALLY DEFERRED
);

ALTER TABLE seasons ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "seasons_public_read" ON seasons;
CREATE POLICY "seasons_public_read"
  ON seasons FOR SELECT
  USING (true);

-- Seed Season 1 (Founders season — 90 days from migration run)
INSERT INTO seasons (name, start_date, end_date, is_active)
VALUES (
  'Saison 1 — Fondateurs',
  now(),
  now() + INTERVAL '90 days',
  true
)
ON CONFLICT DO NOTHING;

-- ─── PART 9: PROFILE TITLES TABLE ────────────────────────────────────────────
-- Structure-only. No unlock logic yet.
-- UNIQUE(user_id, title) prevents duplicate title grants.

CREATE TABLE IF NOT EXISTS profile_titles (
  id           UUID         DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id      UUID         NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  title        TEXT         NOT NULL,
  earned_date  TIMESTAMPTZ  DEFAULT now(),

  CONSTRAINT uq_user_title UNIQUE (user_id, title)
);

ALTER TABLE profile_titles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "titles_public_read" ON profile_titles;
CREATE POLICY "titles_public_read"
  ON profile_titles FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "titles_own_insert" ON profile_titles;
CREATE POLICY "titles_own_insert"
  ON profile_titles FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_profile_titles_user ON profile_titles (user_id);

-- ─── INTEGRITY CHECK VIEW (optional diagnostic) ──────────────────────────────
-- Shows tournament registration counts per side. Useful for counter queries
-- without a separate round-trip. Used by tournamentService.fetchCounts().

CREATE OR REPLACE VIEW tournament_side_counts AS
  SELECT
    tournament_id,
    side,
    COUNT(*) AS player_count
  FROM tournament_registrations
  GROUP BY tournament_id, side;

-- ═══════════════════════════════════════════════════════════════════════════════
-- END MIGRATION 005
-- ═══════════════════════════════════════════════════════════════════════════════
