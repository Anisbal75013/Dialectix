-- ═══════════════════════════════════════════════════════════════════════════════
-- DIALECTIX — Migration 011 : Renforcement RLS tournois (admin-only score)
-- ═══════════════════════════════════════════════════════════════════════════════
--
-- Objectif : restreindre la validation des scores de matchs à l'admin uniquement.
--
-- La politique "t_matches_player_update" permettait aux deux joueurs de modifier
-- un match (player1_id / player2_id). On la remplace par une vérification que
-- seul le créateur de la session de tournoi peut valider les résultats.
--
-- Note d'architecture :
--   • La logique admin côté React repose sur isAdmin() → localStorage['dx_admin']
--   • Côté Supabase, on utilise created_by = auth.uid() comme proxy admin.
--   • Pour une validation 100 % server-side, utiliser le service_role key dans
--     une Edge Function Supabase (pas de RLS bypass côté client).
-- ═══════════════════════════════════════════════════════════════════════════════

-- ─── 1. Supprimer l'ancienne politique permissive (joueurs) ───────────────────
DROP POLICY IF EXISTS "t_matches_player_update" ON tournament_matches;

-- ─── 2. Nouvelle politique : seul le créateur du tournoi valide les matchs ────
-- Un match appartient à un tournoi (tournament_id → tournament_sessions.created_by)
CREATE POLICY "t_matches_admin_update"
  ON tournament_matches FOR UPDATE
  USING (
    EXISTS (
      SELECT 1
      FROM tournament_sessions ts
      WHERE ts.id = tournament_matches.tournament_id
        AND ts.created_by = auth.uid()
    )
  );

-- ─── 3. INSERT sur les matchs : uniquement via le créateur du tournoi ─────────
DROP POLICY IF EXISTS "t_matches_admin_insert" ON tournament_matches;

CREATE POLICY "t_matches_admin_insert"
  ON tournament_matches FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM tournament_sessions ts
      WHERE ts.id = tournament_matches.tournament_id
        AND ts.created_by = auth.uid()
    )
  );

-- ─── 4. Renforcement tournament_sessions : update uniquement par le créateur ──
-- (déjà présent dans 010 mais on s'assure qu'il n'y a pas de doublons)
DROP POLICY IF EXISTS "t_sessions_admin_update" ON tournament_sessions;

CREATE POLICY "t_sessions_admin_update"
  ON tournament_sessions FOR UPDATE
  USING (auth.uid() = created_by);

-- ─── 5. Rappel : lecture publique (inchangée, déjà définie dans 010) ──────────
-- Les politiques *_public_read sont conservées telles quelles :
--   "t_sessions_public_read"     → USING (true)
--   "t_participants_public_read" → USING (true)
--   "t_matches_public_read"      → USING (true)
--
-- Tout le monde peut VOIR les brackets et les résultats.
-- Seul l'admin (created_by) peut MODIFIER les scores et valider les vainqueurs.
