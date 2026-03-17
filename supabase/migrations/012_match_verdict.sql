-- ═══════════════════════════════════════════════════════════════════════════════
-- DIALECTIX — Migration 012 : Verdict IA & Statuts de Match + Camp des Participants
-- ═══════════════════════════════════════════════════════════════════════════════
--
-- Nouveautés :
--   1. tournament_matches  — colonnes status, ai_verdict_text, is_duel_de_nuances
--   2. tournament_participants — colonne stance ('affirmation' | 'refutation' | NULL)
-- ═══════════════════════════════════════════════════════════════════════════════

-- ─── 1. Statut & Verdict dans tournament_matches ─────────────────────────────

-- Statut du match : flux  pending → ai_judged → (contested →) finalized
ALTER TABLE tournament_matches
  ADD COLUMN IF NOT EXISTS status TEXT
    NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'ai_judged', 'contested', 'finalized'));

-- Texte du verdict généré par l'IA (JSON sérialisé ou texte brut)
ALTER TABLE tournament_matches
  ADD COLUMN IF NOT EXISTS ai_verdict_text TEXT;

-- Indicateur "Duel de Nuances" (les deux joueurs défendent le même camp)
ALTER TABLE tournament_matches
  ADD COLUMN IF NOT EXISTS is_duel_de_nuances BOOLEAN NOT NULL DEFAULT FALSE;

-- ─── 2. Camp des participants ─────────────────────────────────────────────────
ALTER TABLE tournament_participants
  ADD COLUMN IF NOT EXISTS stance TEXT
    CHECK (stance IN ('affirmation', 'refutation'));

-- ─── 3. Index pour accélérer les requêtes par statut ─────────────────────────
CREATE INDEX IF NOT EXISTS idx_t_matches_status
  ON tournament_matches (status);

CREATE INDEX IF NOT EXISTS idx_t_matches_contested
  ON tournament_matches (tournament_id, status)
  WHERE status = 'contested';

-- ─── 4. Politique : joueur peut contester son propre match ───────────────────
-- (passe status de ai_judged → contested uniquement pour les joueurs impliqués)
DROP POLICY IF EXISTS "t_matches_player_contest" ON tournament_matches;

CREATE POLICY "t_matches_player_contest"
  ON tournament_matches FOR UPDATE
  USING (
    auth.uid() = player1_id OR auth.uid() = player2_id
  )
  WITH CHECK (
    -- Le joueur ne peut passer le statut qu'en 'contested', pas en 'finalized'
    status = 'contested' AND (auth.uid() = player1_id OR auth.uid() = player2_id)
  );

-- ─── 5. Politique : Admin peut finaliser (confirmed / overridden) ─────────────
-- Déjà couvert par t_matches_admin_update de la migration 011,
-- qui vérifie tournament_sessions.created_by = auth.uid().
-- La finalisation (status → 'finalized') est donc déjà protégée.

-- ─── 6. Rappel des flux autorisés ────────────────────────────────────────────
--
--   ÉTAT          ACTEUR         ACTION
--   pending    → Admin          déclare vainqueur → ai_judged
--   ai_judged  → Joueur perdant  conteste         → contested
--   contested  → Admin          confirme / change  → finalized
--   ai_judged  → (aucune action) reste tel quel     (match accepté tacitement)
--
-- Note : En production, remplacer generateMatchVerdict() (côté React, simulation)
-- par une Edge Function Supabase appelant l'API Claude avec le transcript du débat.
