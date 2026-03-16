-- ═══════════════════════════════════════════════════════════════════════════════
-- DIALECTIX — Migration 010 : Tournois par élimination directe
-- ═══════════════════════════════════════════════════════════════════════════════

-- ─── Table principale : sessions de tournoi ──────────────────────────────────
CREATE TABLE IF NOT EXISTS tournament_sessions (
  id              UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  name            TEXT         NOT NULL,
  weekly_topic    TEXT,                          -- Sujet de la Semaine
  size            INTEGER      NOT NULL DEFAULT 8 CHECK (size IN (8,16,32)),
  status          TEXT         NOT NULL DEFAULT 'pending'
                               CHECK (status IN ('pending','active','bracket','ended')),
  -- pending  → inscriptions ouvertes
  -- active   → round-robin (warm-up)
  -- bracket  → élimination directe lancée
  -- ended    → terminé, badges attribués
  start_at        TIMESTAMPTZ  DEFAULT now(),
  bracket_start_at TIMESTAMPTZ,
  end_at          TIMESTAMPTZ,
  created_by      UUID         REFERENCES profiles(id) ON DELETE SET NULL,
  champion_id     UUID         REFERENCES profiles(id) ON DELETE SET NULL,
  champion_name   TEXT,
  elo_prize       INTEGER      NOT NULL DEFAULT 150,  -- bonus ELO pour le champion
  xp_prize        INTEGER      NOT NULL DEFAULT 500,
  created_at      TIMESTAMPTZ  DEFAULT now()
);

-- ─── Participants ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS tournament_participants (
  id              UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  tournament_id   UUID         NOT NULL REFERENCES tournament_sessions(id) ON DELETE CASCADE,
  user_id         UUID         REFERENCES profiles(id) ON DELETE SET NULL,
  display_name    TEXT         NOT NULL,
  elo_at_entry    INTEGER      NOT NULL DEFAULT 1000,
  avatar          TEXT,
  seed            INTEGER,                       -- numéro de tête de série (1 = meilleur)
  bracket_slot    INTEGER,                       -- position dans le bracket (1-based)
  is_eliminated   BOOLEAN      NOT NULL DEFAULT false,
  round_reached   INTEGER      NOT NULL DEFAULT 1,
  wins            INTEGER      NOT NULL DEFAULT 0,
  losses          INTEGER      NOT NULL DEFAULT 0,
  joined_at       TIMESTAMPTZ  DEFAULT now(),
  UNIQUE (tournament_id, user_id)
);

-- ─── Matchs du bracket ───────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS tournament_matches (
  id              UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  tournament_id   UUID         NOT NULL REFERENCES tournament_sessions(id) ON DELETE CASCADE,
  round           INTEGER      NOT NULL,          -- 1 = quarts, 2 = demies, 3 = finale
  match_number    INTEGER      NOT NULL,          -- numéro dans le round
  player1_id      UUID         REFERENCES profiles(id) ON DELETE SET NULL,
  player1_name    TEXT,
  player2_id      UUID         REFERENCES profiles(id) ON DELETE SET NULL,
  player2_name    TEXT,
  winner_id       UUID         REFERENCES profiles(id) ON DELETE SET NULL,
  winner_name     TEXT,
  -- Mode de contrainte rhétorique pour ce match
  constraint_mode TEXT         NOT NULL DEFAULT 'libre'
                               CHECK (constraint_mode IN ('libre','sophiste','architecte','oracle')),
  constraint_desc TEXT,                          -- description du mode pour l'UI
  topic           TEXT,                          -- sujet spécifique à ce match
  verdict_text    TEXT,                          -- verdict de l'IA (court)
  played_at       TIMESTAMPTZ,
  created_at      TIMESTAMPTZ  DEFAULT now(),
  UNIQUE (tournament_id, round, match_number)
);

-- ─── Index ────────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_t_sessions_status   ON tournament_sessions     (status);
CREATE INDEX IF NOT EXISTS idx_t_participants_tid  ON tournament_participants  (tournament_id);
CREATE INDEX IF NOT EXISTS idx_t_participants_uid  ON tournament_participants  (user_id);
CREATE INDEX IF NOT EXISTS idx_t_matches_tid       ON tournament_matches       (tournament_id, round, match_number);

-- ─── Row Level Security ───────────────────────────────────────────────────────
ALTER TABLE tournament_sessions     ENABLE ROW LEVEL SECURITY;
ALTER TABLE tournament_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE tournament_matches      ENABLE ROW LEVEL SECURITY;

-- Lecture publique pour tout le monde
CREATE POLICY "t_sessions_public_read"
  ON tournament_sessions FOR SELECT USING (true);

CREATE POLICY "t_participants_public_read"
  ON tournament_participants FOR SELECT USING (true);

CREATE POLICY "t_matches_public_read"
  ON tournament_matches FOR SELECT USING (true);

-- Inscription : l'utilisateur connecté peut s'inscrire lui-même
CREATE POLICY "t_participants_self_insert"
  ON tournament_participants FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Mise à jour participant : seulement soi-même
CREATE POLICY "t_participants_self_update"
  ON tournament_participants FOR UPDATE
  USING (auth.uid() = user_id);

-- Matchs : mise à jour par les deux joueurs ou l'admin (simplifié)
CREATE POLICY "t_matches_player_update"
  ON tournament_matches FOR UPDATE
  USING (
    auth.uid() = player1_id
    OR auth.uid() = player2_id
  );

-- Sessions : insertion par admin (géré côté application)
CREATE POLICY "t_sessions_admin_insert"
  ON tournament_sessions FOR INSERT
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY "t_sessions_admin_update"
  ON tournament_sessions FOR UPDATE
  USING (auth.uid() = created_by);
