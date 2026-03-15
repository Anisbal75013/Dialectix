// ═══════════════════════════════════════════════════════════════════════════════
// DIALECTIX AI — leaderboardService.js
// ═══════════════════════════════════════════════════════════════════════════════
// ENGINEERING PRINCIPLE: "Prepare systems without activating them."
//
// Three leaderboard axes — all READ-only, no writes:
//   1. ELO ranking       — top players by current ELO rating
//   2. Activity ranking  — top players by total debates played
//   3. Season ranking    — top players by season_points (current active season)
//
// Additionally:
//   4. Local leaderboard — rank a set of players passed as an array (client-side)
//      Useful for Arena result screens without extra Supabase round-trips.
//
// All Supabase functions accept a supabase client. No self-created clients.
// Returns { data, error } consistently.
// ═══════════════════════════════════════════════════════════════════════════════

// ─── ELO LEADERBOARD ─────────────────────────────────────────────────────────
// Top-N profiles by ELO descending.
// Includes enough fields for a full leaderboard card.
//
export async function fetchEloLeaderboard(supabase, limit = 50) {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, username, avatar_id, elo, peak_elo, season_points, country, debate_experience')
    .order('elo', { ascending: false })
    .limit(limit);

  return { data: data ?? [], error };
}

// ─── ACTIVITY LEADERBOARD ─────────────────────────────────────────────────────
// Top-N profiles by total_debates descending.
// Falls back gracefully if total_debates column does not exist on older schemas.
//
export async function fetchActivityLeaderboard(supabase, limit = 50) {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, username, avatar_id, elo, total_debates, wins, losses, country')
    .order('total_debates', { ascending: false })
    .limit(limit);

  return { data: data ?? [], error };
}

// ─── SEASON LEADERBOARD ───────────────────────────────────────────────────────
// Top-N profiles by season_points descending.
// Re-exported from seasonService for convenience — leaderboardService is the
// single import point for all leaderboard consumers.
//
export async function fetchSeasonLeaderboard(supabase, limit = 50) {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, username, avatar_id, elo, season_points, country, debate_experience')
    .order('season_points', { ascending: false })
    .limit(limit);

  return { data: data ?? [], error };
}

// ─── LOCAL LEADERBOARD ────────────────────────────────────────────────────────
// Ranks an array of player objects entirely client-side.
// No Supabase call — useful for Arena result screens and offline previews.
//
// Input: players[] — each expected to have at least { id, name, elo }
// sortKey: 'elo' | 'season_points' | 'total_debates' (default: 'elo')
// Returns a sorted copy with `rank` attached to each player.
//
export function fetchLocalLeaderboard(players, sortKey = 'elo') {
  if (!Array.isArray(players) || players.length === 0) return [];

  const validKeys = new Set(['elo', 'season_points', 'total_debates', 'wins']);
  const key = validKeys.has(sortKey) ? sortKey : 'elo';

  const sorted = [...players].sort((a, b) => {
    const aVal = typeof a[key] === 'number' ? a[key] : 0;
    const bVal = typeof b[key] === 'number' ? b[key] : 0;
    return bVal - aVal; // descending
  });

  return sorted.map((player, index) => ({ ...player, rank: index + 1 }));
}

// ─── USER RANK LOOKUP ─────────────────────────────────────────────────────────
// Returns the ELO rank of a specific user within the global leaderboard.
// Counts profiles with strictly higher ELO → rank = count + 1.
//
export async function getUserEloRank(supabase, userId) {
  if (!userId) return { rank: null, error: new Error('userId is required.') };

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('elo')
    .eq('id', userId)
    .single();

  if (profileError) return { rank: null, error: profileError };

  const userElo = profile?.elo ?? 1000;

  const { count, error: countError } = await supabase
    .from('profiles')
    .select('id', { count: 'exact', head: true })
    .gt('elo', userElo);

  if (countError) return { rank: null, error: countError };

  return { rank: (count ?? 0) + 1, error: null };
}

// ─── LEADERBOARD AXIS LABELS ──────────────────────────────────────────────────
// UI display map — used by leaderboard components to label column headers.
// Import this alongside fetch functions to keep display logic consistent.
//
export const LEADERBOARD_AXES = {
  elo: {
    label: 'ELO',
    description: 'Classement par force de débat',
    sortKey: 'elo',
    icon: '⚡',
  },
  activity: {
    label: 'Activité',
    description: 'Classement par nombre de débats',
    sortKey: 'total_debates',
    icon: '🔥',
  },
  season: {
    label: 'Saison',
    description: 'Classement par points de saison',
    sortKey: 'season_points',
    icon: '🏆',
  },
};
