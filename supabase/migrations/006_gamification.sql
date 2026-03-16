-- ═══════════════════════════════════════════════════════════════════════════════
-- DIALECTIX AI — Migration 006: Gamification & Competitive Lobby
-- ═══════════════════════════════════════════════════════════════════════════════
-- ADDITIVE ONLY — no destructive changes, IF NOT EXISTS guards everywhere.
-- Tables:
--   • debate_rooms      — competitive lobby (open rooms players can join)
--   • shop_items        — boutique catalog (avatar skins, academy flags)
--   • user_shop_items   — items owned by a player
-- Profile extensions:
--   • avatar_skin       — currently equipped skin
--   • username          — custom display name (separate from OAuth full_name)
--   • daily_train_count — server-side training daily limit counter
--   • daily_train_date  — date of the last training session (for reset logic)
-- ═══════════════════════════════════════════════════════════════════════════════

-- ─── PART 1: DEBATE ROOMS (competitive lobby) ─────────────────────────────────
-- Players propose debates with a title, topic, expiration and mode.
-- Other players can join open rooms. Supabase Realtime drives the live list.

CREATE TABLE IF NOT EXISTS debate_rooms (
  id               UUID         DEFAULT gen_random_uuid() PRIMARY KEY,
  creator_id       UUID         REFERENCES profiles(id) ON DELETE SET NULL,
  creator_name     TEXT         NOT NULL,
  creator_elo      INTEGER      DEFAULT 1000,
  title            TEXT         NOT NULL,
  topic            TEXT         NOT NULL,
  mode             TEXT         NOT NULL DEFAULT 'direct'
                                CHECK (mode IN ('direct', 'scheduled')),
  scheduled_at     TIMESTAMPTZ,                    -- null for direct mode
  expires_at       TIMESTAMPTZ  NOT NULL,
  status           TEXT         NOT NULL DEFAULT 'open'
                                CHECK (status IN ('open', 'matched', 'expired', 'cancelled')),
  opponent_id      UUID         REFERENCES profiles(id) ON DELETE SET NULL,
  opponent_name    TEXT,
  allow_bot        BOOLEAN      NOT NULL DEFAULT false,  -- creator allows 1 bot if no human found
  created_at       TIMESTAMPTZ  DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_rooms_status     ON debate_rooms (status);
CREATE INDEX IF NOT EXISTS idx_rooms_creator    ON debate_rooms (creator_id);
CREATE INDEX IF NOT EXISTS idx_rooms_expires    ON debate_rooms (expires_at);

ALTER TABLE debate_rooms ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "rooms_public_read"  ON debate_rooms;
CREATE POLICY "rooms_public_read"
  ON debate_rooms FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "rooms_own_insert"   ON debate_rooms;
CREATE POLICY "rooms_own_insert"
  ON debate_rooms FOR INSERT
  WITH CHECK (auth.uid() = creator_id);

DROP POLICY IF EXISTS "rooms_own_update"   ON debate_rooms;
CREATE POLICY "rooms_own_update"
  ON debate_rooms FOR UPDATE
  USING (auth.uid() = creator_id OR auth.uid() = opponent_id);

DROP POLICY IF EXISTS "rooms_own_delete"   ON debate_rooms;
CREATE POLICY "rooms_own_delete"
  ON debate_rooms FOR DELETE
  USING (auth.uid() = creator_id);

-- ─── PART 2: SHOP ITEMS (boutique catalog) ────────────────────────────────────
-- Static catalog seeded below. is_premium items require payment (future).
-- Free items cost price_xp XP to unlock.

CREATE TABLE IF NOT EXISTS shop_items (
  id           TEXT         PRIMARY KEY,
  name         TEXT         NOT NULL,
  description  TEXT,
  type         TEXT         NOT NULL
               CHECK (type IN ('avatar_skin', 'academy_flag', 'title')),
  emoji        TEXT,
  is_premium   BOOLEAN      NOT NULL DEFAULT false,
  price_xp     INTEGER      NOT NULL DEFAULT 0,
  created_at   TIMESTAMPTZ  DEFAULT now()
);

ALTER TABLE shop_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "shop_public_read" ON shop_items;
CREATE POLICY "shop_public_read"
  ON shop_items FOR SELECT
  USING (true);

-- ─── PART 3: USER SHOP ITEMS (owned items) ────────────────────────────────────
CREATE TABLE IF NOT EXISTS user_shop_items (
  id           UUID         DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id      UUID         NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  item_id      TEXT         NOT NULL REFERENCES shop_items(id) ON DELETE CASCADE,
  acquired_at  TIMESTAMPTZ  DEFAULT now(),
  CONSTRAINT uq_user_item UNIQUE (user_id, item_id)
);

CREATE INDEX IF NOT EXISTS idx_usi_user ON user_shop_items (user_id);

ALTER TABLE user_shop_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "user_items_own_read"   ON user_shop_items;
CREATE POLICY "user_items_own_read"
  ON user_shop_items FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "user_items_own_insert"  ON user_shop_items;
CREATE POLICY "user_items_own_insert"
  ON user_shop_items FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "user_items_own_delete"  ON user_shop_items;
CREATE POLICY "user_items_own_delete"
  ON user_shop_items FOR DELETE
  USING (auth.uid() = user_id);

-- ─── PART 4: SEED — BOUTIQUE CATALOG ──────────────────────────────────────────
INSERT INTO shop_items (id, name, description, type, emoji, is_premium, price_xp) VALUES
  ('skin_gold_orator',   'Orateur d''Or',          'Pour les vainqueurs qui brillent en arène.',      'avatar_skin',    '✨', false, 200),
  ('skin_philosopher',   'Philosophe Classique',   'L''avatar du sage de l''Antiquité.',              'avatar_skin',    '🏛', false, 350),
  ('skin_challenger',    'Challenger des Ombres',  'Identité mystérieuse — redouté des adversaires.', 'avatar_skin',    '⚔️', false, 500),
  ('flag_fire',          'Bannière Ardente',        'Drapeau d''académie de feu — pour les audacieux.','academy_flag',   '🔥', false, 150),
  ('flag_laurels',       'Bannière des Lauriers',   'La couronne du vainqueur — tradition olympique.', 'academy_flag',   '🏅', false, 300),
  ('title_rhetor',       'Rhéteur Certifié',        'Titre porté par les maîtres de la persuasion.',   'title',          '🗣', false, 400),
  ('skin_shadow',        'Ombre Dialectique',       'Édition Premium — identité secrète.',             'avatar_skin',    '🌑', true,  0),
  ('skin_phoenix',       'Phénix Rhétorique',       'Édition Premium — renaît de chaque défaite.',     'avatar_skin',    '🦅', true,  0),
  ('flag_crown',         'Bannière Royale',         'Édition Premium — réservée aux académies d''élite.','academy_flag', '👑', true,  0),
  ('title_sage',         'Sage de l''Arène',        'Édition Premium — le titre suprême.',             'title',          '⭐', true,  0)
ON CONFLICT DO NOTHING;

-- ─── PART 5: PROFILE SAFE EXTENSIONS ──────────────────────────────────────────
-- All new columns are NULLABLE or have safe defaults.

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS avatar_skin       TEXT DEFAULT 'default',
  ADD COLUMN IF NOT EXISTS username          TEXT,
  ADD COLUMN IF NOT EXISTS daily_train_count INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS daily_train_date  DATE DEFAULT CURRENT_DATE;

-- ═══════════════════════════════════════════════════════════════════════════════
-- END MIGRATION 006
-- ═══════════════════════════════════════════════════════════════════════════════
