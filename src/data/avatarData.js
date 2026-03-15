// ═══════════════════════════════════════════════════════════════════════════════
// DIALECTIX AI — avatarData.js
// ═══════════════════════════════════════════════════════════════════════════════
// ENGINEERING PRINCIPLE: "Prepare systems without activating them."
//
// Pure data — no logic, no unlock UI, no imports.
// This file defines:
//   • Avatar catalog (ids, labels, visual hints for future asset pipeline)
//   • Unlock requirements (ELO threshold, wins, debates, or free/default)
//   • Avatar categories for grouping in a future selection UI
//
// NOT implemented:
//   • Unlock trigger logic
//   • Avatar image loading
//   • Profile avatar update (handled by profileService when built)
// ═══════════════════════════════════════════════════════════════════════════════

// ─── UNLOCK REQUIREMENT TYPES ────────────────────────────────────────────────
// Each avatar has a `requirement` object describing how to earn it.
// Types: 'free' | 'elo' | 'wins' | 'debates' | 'season' | 'tournament' | 'title'
//
export const UNLOCK_TYPES = {
  free:       'free',        // Available to all from the start
  elo:        'elo',         // Requires a minimum ELO rating
  wins:       'wins',        // Requires N cumulative wins
  debates:    'debates',     // Requires N total debates played
  season:     'season',      // Awarded for top-N season finish
  tournament: 'tournament',  // Awarded for tournament participation/win
  title:      'title',       // Awarded alongside a specific profile title
};

// ─── AVATAR CATALOG ──────────────────────────────────────────────────────────
// Each entry:
//   id          — matches avatar_id on the profiles table
//   label       — display name
//   category    — grouping for UI tabs
//   emoji       — fallback glyph if image assets aren't loaded
//   description — flavor text shown on hover
//   requirement — unlock condition object
//
export const AVATARS = [
  // ── FREE TIER ───────────────────────────────────────────────────────────────
  {
    id:          'default',
    label:       'Orateur',
    category:    'starter',
    emoji:       '🎤',
    description: 'Le point de départ de tout dialecticien.',
    requirement: { type: UNLOCK_TYPES.free },
  },
  {
    id:          'scholar',
    label:       'Érudit',
    category:    'starter',
    emoji:       '📚',
    description: 'Pour ceux qui apportent des faits à un débat d\'opinions.',
    requirement: { type: UNLOCK_TYPES.free },
  },
  {
    id:          'challenger',
    label:       'Challenger',
    category:    'starter',
    emoji:       '⚔️',
    description: 'Prêt à tout remettre en question.',
    requirement: { type: UNLOCK_TYPES.free },
  },

  // ── ELO TIER ────────────────────────────────────────────────────────────────
  {
    id:          'silver_tongue',
    label:       'Langue d\'Argent',
    category:    'elo',
    emoji:       '🗣️',
    description: 'Réservé aux débatteurs ayant prouvé leur valeur.',
    requirement: { type: UNLOCK_TYPES.elo, threshold: 1100 },
  },
  {
    id:          'iron_logic',
    label:       'Logique de Fer',
    category:    'elo',
    emoji:       '🔩',
    description: 'L\'argumentation comme une machine parfaite.',
    requirement: { type: UNLOCK_TYPES.elo, threshold: 1200 },
  },
  {
    id:          'golden_rhetorician',
    label:       'Rhétoricien d\'Or',
    category:    'elo',
    emoji:       '✨',
    description: 'Le sommet de l\'éloquence dialectique.',
    requirement: { type: UNLOCK_TYPES.elo, threshold: 1400 },
  },

  // ── WIN TIER ─────────────────────────────────────────────────────────────────
  {
    id:          'victor_x5',
    label:       'Vainqueur',
    category:    'wins',
    emoji:       '🏅',
    description: 'Cinq victoires consécutives dans l\'arène.',
    requirement: { type: UNLOCK_TYPES.wins, threshold: 5 },
  },
  {
    id:          'dominator',
    label:       'Dominateur',
    category:    'wins',
    emoji:       '💥',
    description: 'Vingt victoires. La maîtrise se prouve.',
    requirement: { type: UNLOCK_TYPES.wins, threshold: 20 },
  },
  {
    id:          'legend',
    label:       'Légende',
    category:    'wins',
    emoji:       '👑',
    description: 'Cent victoires. Une légende vivante.',
    requirement: { type: UNLOCK_TYPES.wins, threshold: 100 },
  },

  // ── DEBATES PLAYED TIER ─────────────────────────────────────────────────────
  {
    id:          'veteran',
    label:       'Vétéran',
    category:    'activity',
    emoji:       '🎖️',
    description: 'Tu as participé à 25 débats. La régularité forge l\'excellence.',
    requirement: { type: UNLOCK_TYPES.debates, threshold: 25 },
  },
  {
    id:          'gladiator',
    label:       'Gladiateur',
    category:    'activity',
    emoji:       '🛡️',
    description: 'Cent débats disputés. Tu vis dans l\'arène.',
    requirement: { type: UNLOCK_TYPES.debates, threshold: 100 },
  },

  // ── SEASON TIER ─────────────────────────────────────────────────────────────
  {
    id:          'season1_founder',
    label:       'Fondateur S1',
    category:    'season',
    emoji:       '🌱',
    description: 'A participé lors de la Saison 1 des Fondateurs.',
    requirement: { type: UNLOCK_TYPES.season, seasonId: 'season_1', topN: null },
  },
  {
    id:          'season1_top10',
    label:       'Top 10 — Saison 1',
    category:    'season',
    emoji:       '🔟',
    description: 'A terminé dans le top 10 de la Saison 1.',
    requirement: { type: UNLOCK_TYPES.season, seasonId: 'season_1', topN: 10 },
  },
  {
    id:          'season1_champion',
    label:       'Champion S1',
    category:    'season',
    emoji:       '🥇',
    description: 'Le meilleur de la Saison 1. Inégalé.',
    requirement: { type: UNLOCK_TYPES.season, seasonId: 'season_1', topN: 1 },
  },

  // ── TOURNAMENT TIER ─────────────────────────────────────────────────────────
  {
    id:          'tournament_participant',
    label:       'Participant Tournoi',
    category:    'tournament',
    emoji:       '🎫',
    description: 'A rejoint son premier tournoi officiel.',
    requirement: { type: UNLOCK_TYPES.tournament, condition: 'participated' },
  },
  {
    id:          'tournament_finalist',
    label:       'Finaliste',
    category:    'tournament',
    emoji:       '🎯',
    description: 'A atteint la finale d\'un tournoi.',
    requirement: { type: UNLOCK_TYPES.tournament, condition: 'finalist' },
  },
  {
    id:          'tournament_champion',
    label:       'Champion Tournoi',
    category:    'tournament',
    emoji:       '🏆',
    description: 'Champion d\'un tournoi officiel Dialectix.',
    requirement: { type: UNLOCK_TYPES.tournament, condition: 'champion' },
  },
];

// ─── AVATAR CATEGORIES ───────────────────────────────────────────────────────
// Used by a future avatar selection UI to render grouped tabs.
//
export const AVATAR_CATEGORIES = [
  { id: 'starter',    label: 'Départ',      icon: '🎤' },
  { id: 'elo',        label: 'Rang ELO',    icon: '⚡' },
  { id: 'wins',       label: 'Victoires',   icon: '🏅' },
  { id: 'activity',   label: 'Activité',    icon: '🔥' },
  { id: 'season',     label: 'Saison',      icon: '🏆' },
  { id: 'tournament', label: 'Tournoi',     icon: '🎫' },
];

// ─── AVATAR MAP ───────────────────────────────────────────────────────────────
// Fast O(1) lookup by avatar id. Built from AVATARS array at module load.
//
export const AVATAR_MAP = Object.fromEntries(
  AVATARS.map(avatar => [avatar.id, avatar])
);

// ─── LOOKUP HELPERS ──────────────────────────────────────────────────────────

// Returns avatar data by id, falls back to 'default' if not found.
export function getAvatar(avatarId) {
  return AVATAR_MAP[avatarId] ?? AVATAR_MAP['default'];
}

// Returns all avatars that are free (no unlock requirement).
export function getFreeAvatars() {
  return AVATARS.filter(a => a.requirement.type === UNLOCK_TYPES.free);
}

// Returns all avatars in a specific category.
export function getAvatarsByCategory(categoryId) {
  return AVATARS.filter(a => a.category === categoryId);
}

// Checks if a player profile meets the unlock requirement for an avatar.
// Returns true if unlocked, false otherwise.
// NOTE: Season and tournament conditions are not yet evaluatable client-side.
//       Those require server-side grant logic (not yet built).
//
export function isAvatarUnlocked(avatar, profile) {
  if (!avatar || !profile) return false;
  const { requirement } = avatar;

  switch (requirement.type) {
    case UNLOCK_TYPES.free:
      return true;
    case UNLOCK_TYPES.elo:
      return (profile.elo ?? 0) >= requirement.threshold;
    case UNLOCK_TYPES.wins:
      return (profile.wins ?? 0) >= requirement.threshold;
    case UNLOCK_TYPES.debates:
      return (profile.total_debates ?? 0) >= requirement.threshold;
    case UNLOCK_TYPES.season:
    case UNLOCK_TYPES.tournament:
    case UNLOCK_TYPES.title:
      // Requires server-side check via profile_titles table — not evaluatable here
      return false;
    default:
      return false;
  }
}
