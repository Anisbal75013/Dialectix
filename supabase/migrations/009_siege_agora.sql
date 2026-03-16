-- ═══════════════════════════════════════════════════════════════════════════════
-- DIALECTIX — Migration 009 : Le Siège de l'Agora (Duels asynchrones)
-- ═══════════════════════════════════════════════════════════════════════════════
-- TABLE : siege_agora
-- Chaque row = un défi argumentatif créé par un utilisateur
-- Un autre utilisateur peut y répondre (answered_by / answer_text)
-- Score calculé côté client selon la qualité de l'argumentation
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS siege_agora (
  id               UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  topic            TEXT         NOT NULL,
  topic_title      TEXT,
  challenge_text   TEXT         NOT NULL,
  challenger_id    UUID         REFERENCES profiles(id) ON DELETE SET NULL,
  challenger_name  TEXT,
  score            INTEGER      NOT NULL DEFAULT 0,
  answer_text      TEXT,
  answered_by      UUID         REFERENCES profiles(id) ON DELETE SET NULL,
  answered_name    TEXT,
  answer_score     INTEGER,
  created_at       TIMESTAMPTZ  DEFAULT now(),
  answered_at      TIMESTAMPTZ
);

-- Index pour filtrer les défis sans réponse (les plus récents en premier)
CREATE INDEX IF NOT EXISTS idx_siege_agora_unanswered
  ON siege_agora (created_at DESC)
  WHERE answer_text IS NULL;

-- Index pour retrouver les défis d'un challenger
CREATE INDEX IF NOT EXISTS idx_siege_agora_challenger
  ON siege_agora (challenger_id);

-- Index pour retrouver les réponses d'un joueur
CREATE INDEX IF NOT EXISTS idx_siege_agora_answered_by
  ON siege_agora (answered_by);

-- ─── Row Level Security ───────────────────────────────────────────────────────
ALTER TABLE siege_agora ENABLE ROW LEVEL SECURITY;

-- Lecture publique (pour voir les défis en attente)
CREATE POLICY "siege_agora_public_read"
  ON siege_agora FOR SELECT
  USING (true);

-- Insertion : uniquement pour l'utilisateur connecté comme challenger
CREATE POLICY "siege_agora_challenger_insert"
  ON siege_agora FOR INSERT
  WITH CHECK (auth.uid() = challenger_id);

-- Mise à jour : uniquement pour celui qui répond (answered_by) ou le challenger original
CREATE POLICY "siege_agora_update"
  ON siege_agora FOR UPDATE
  USING (
    auth.uid() = challenger_id
    OR auth.uid() = answered_by
    OR (answer_text IS NULL AND auth.uid() IS NOT NULL)
  );
