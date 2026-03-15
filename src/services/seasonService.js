// ═══════════════════════════════════════════════════════════════════════════════
// DIALECTIX AI — seasonService.js
// ═══════════════════════════════════════════════════════════════════════════════
// ENGINEERING PRINCIPLE: "Prepare systems without activating them."
//
// Covers:
//   • Reading the active season
//   • Adding season points to a profile
//   • Fetching season leaderboard (top-N by season_points)
//
// NOT included (not yet built):
//   • Season rotation / end-season logic
//   • Title grants at season end
//   • Season history / archives
//   • Any scheduled automation
// ═══════════════════════════════════════════════════════════════════════════════

// ─── FETCH ACTIVE SEASON ─────────────────────────────────────────────────────
// Returns the single row where is_active = true, or null if no season is live.
// RLS: public read — no auth required.
//
export async function fetchActiveSeason(supabase) {
  const { data, error } = await supabase
    .from('seasons')
    .select('*')
    .eq('is_active', true)
    .maybeSingle();

  return { data: data ?? null, error };
}

// ─── FETCH ALL SEASONS ────────────────────────────────────────────────────────
// Returns all seasons ordered by start_date descending.
// Useful for rendering a season history page.
//
export async function fetchAllSeasons(supabase) {
  const { data, error } = await supabase
    .from('seasons')
    .select('*')
    .order('start_date', { ascending: false });

  return { data: data ?? [], error };
}

// ─── ADD SEASON POINTS ───────────────────────────────────────────────────────
// Increments season_points on a profile by `points`.
// Uses a Postgres RPC call (increment) to avoid race conditions on concurrent writes.
//
// NOTE: Requires this Postgres function to exist (add to a future migration):
//
//   CREATE OR REPLACE FUNCTION increment_season_points(uid UUID, delta INT)
//   RETURNS void AS $$
//     UPDATE profiles SET season_points = season_points + delta WHERE id = uid;
//   $$ LANGUAGE sql SECURITY DEFINER;
//
// Fallback: if RPC is unavailable, falls through to a safe read-modify-write.
//
export async function addSeasonPoints(supabase, userId, points) {
  if (!userId || typeof points !== 'number' || points <= 0) {
    return { error: new Error('Invalid addSeasonPoints parameters.') };
  }

  // Attempt atomic RPC increment first
  const { error: rpcError } = await supabase.rpc('increment_season_points', {
    uid: userId,
    delta: points,
  });

  if (!rpcError) return { error: null };

  // Fallback: read-modify-write (less ideal but safe for low-concurrency scenarios)
  const { data: profile, error: fetchError } = await supabase
    .from('profiles')
    .select('season_points')
    .eq('id', userId)
    .single();

  if (fetchError) return { error: fetchError };

  const current = typeof profile?.season_points === 'number' ? profile.season_points : 0;

  const { error: updateError } = await supabase
    .from('profiles')
    .update({ season_points: current + points })
    .eq('id', userId);

  return { error: updateError };
}

// ─── RESET SEASON POINTS ─────────────────────────────────────────────────────
// Resets season_points to 0 for a user.
// Called at season end by season rotation logic (not yet built).
// Exposed here as a building block.
//
export async function resetSeasonPoints(supabase, userId) {
  if (!userId) return { error: new Error('userId is required.') };

  const { error } = await supabase
    .from('profiles')
    .update({ season_points: 0 })
    .eq('id', userId);

  return { error };
}

// ─── FETCH SEASON LEADERBOARD ─────────────────────────────────────────────────
// Returns top-N profiles ranked by season_points descending.
// Default limit: 50.
//
export async function fetchSeasonLeaderboard(supabase, limit = 50) {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, username, avatar_id, elo, season_points, country')
    .order('season_points', { ascending: false })
    .limit(limit);

  return { data: data ?? [], error };
}

// ─── GET USER SEASON RANK ─────────────────────────────────────────────────────
// Returns the ordinal rank of a user in the current season leaderboard.
// Counts how many profiles have strictly more season_points than the user.
//
// NOTE: Not a precise rank for ties — uses rank = count(higher) + 1.
//
export async function getUserSeasonRank(supabase, userId) {
  if (!userId) return { rank: null, error: new Error('userId is required.') };

  // Get user's own season_points first
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('season_points')
    .eq('id', userId)
    .single();

  if (profileError) return { rank: null, error: profileError };

  const userPoints = profile?.season_points ?? 0;

  // Count users with strictly more points
  const { count, error: countError } = await supabase
    .from('profiles')
    .select('id', { count: 'exact', head: true })
    .gt('season_points', userPoints);

  if (countError) return { rank: null, error: countError };

  return { rank: (count ?? 0) + 1, error: null };
}
