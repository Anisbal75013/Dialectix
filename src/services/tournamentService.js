// ═══════════════════════════════════════════════════════════════════════════════
// DIALECTIX AI — tournamentService.js
// ═══════════════════════════════════════════════════════════════════════════════
// ENGINEERING PRINCIPLE: "Prepare systems without activating them."
//
// This service is READ + REGISTER only.
//   • No match creation.
//   • No tournament progression.
//   • No score calculation.
//   • All functions accept a supabase client — no self-created clients.
//   • Returns { data, error } consistently for uniform error handling.
// ═══════════════════════════════════════════════════════════════════════════════

// ─── FETCH ALL TOURNAMENTS ────────────────────────────────────────────────────
// Returns all tournaments ordered by creation date (newest first).
// RLS: public read — no auth required.
//
export async function fetchTournaments(supabase) {
  const { data, error } = await supabase
    .from('tournaments')
    .select('*')
    .order('created_at', { ascending: false });

  return { data: data ?? [], error };
}

// ─── FETCH SINGLE TOURNAMENT ──────────────────────────────────────────────────
// Returns a single tournament row by ID.
//
export async function fetchTournament(supabase, tournamentId) {
  const { data, error } = await supabase
    .from('tournaments')
    .select('*')
    .eq('id', tournamentId)
    .single();

  return { data: data ?? null, error };
}

// ─── FETCH SIDE COUNTS ────────────────────────────────────────────────────────
// Returns { sideA: number, sideB: number } for a given tournament.
// Uses the tournament_side_counts VIEW for efficiency (no client-side aggregation).
// RLS: public read.
//
export async function fetchSideCounts(supabase, tournamentId) {
  const { data, error } = await supabase
    .from('tournament_side_counts')
    .select('side, player_count')
    .eq('tournament_id', tournamentId);

  if (error) return { sideA: 0, sideB: 0, error };

  const counts = { sideA: 0, sideB: 0, error: null };
  for (const row of data ?? []) {
    if (row.side === 'A') counts.sideA = Number(row.player_count);
    if (row.side === 'B') counts.sideB = Number(row.player_count);
  }
  return counts;
}

// ─── FETCH ALL SIDE COUNTS (BATCH) ───────────────────────────────────────────
// Returns an object keyed by tournament_id: { [id]: { sideA, sideB } }
// Useful for rendering a list of tournaments without N+1 queries.
//
export async function fetchAllSideCounts(supabase) {
  const { data, error } = await supabase
    .from('tournament_side_counts')
    .select('tournament_id, side, player_count');

  if (error) return { data: {}, error };

  const result = {};
  for (const row of data ?? []) {
    if (!result[row.tournament_id]) {
      result[row.tournament_id] = { sideA: 0, sideB: 0 };
    }
    if (row.side === 'A') result[row.tournament_id].sideA = Number(row.player_count);
    if (row.side === 'B') result[row.tournament_id].sideB = Number(row.player_count);
  }
  return { data: result, error: null };
}

// ─── FETCH USER REGISTRATION ──────────────────────────────────────────────────
// Returns the user's registration row for a specific tournament, or null.
// Used to determine if the user is already registered and on which side.
//
export async function fetchUserRegistration(supabase, userId, tournamentId) {
  if (!userId || !tournamentId) return { data: null, error: null };

  const { data, error } = await supabase
    .from('tournament_registrations')
    .select('*')
    .eq('user_id', userId)
    .eq('tournament_id', tournamentId)
    .maybeSingle();

  return { data: data ?? null, error };
}

// ─── FETCH ALL USER REGISTRATIONS ────────────────────────────────────────────
// Returns all tournaments a user is registered for.
// Joins tournament data inline.
//
export async function fetchUserRegistrations(supabase, userId) {
  if (!userId) return { data: [], error: null };

  const { data, error } = await supabase
    .from('tournament_registrations')
    .select('*, tournaments(*)')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  return { data: data ?? [], error };
}

// ─── REGISTER FOR TOURNAMENT ──────────────────────────────────────────────────
// Registers the authenticated user for a tournament on a given side ('A' or 'B').
// RLS enforces auth.uid() === user_id — server-side safety.
// Returns the created registration row on success.
//
// Preconditions (caller must validate):
//   • user is authenticated
//   • tournament status === 'registration_open'
//   • side is 'A' or 'B'
//
export async function registerForTournament(supabase, userId, tournamentId, side) {
  if (!userId || !tournamentId || !['A', 'B'].includes(side)) {
    return { data: null, error: new Error('Invalid registration parameters.') };
  }

  const { data, error } = await supabase
    .from('tournament_registrations')
    .insert({ user_id: userId, tournament_id: tournamentId, side })
    .select()
    .single();

  return { data: data ?? null, error };
}

// ─── CANCEL REGISTRATION ─────────────────────────────────────────────────────
// Removes the authenticated user's registration for a tournament.
// RLS enforces auth.uid() === user_id — server-side safety.
//
export async function cancelRegistration(supabase, userId, tournamentId) {
  if (!userId || !tournamentId) {
    return { error: new Error('Invalid parameters for cancellation.') };
  }

  const { error } = await supabase
    .from('tournament_registrations')
    .delete()
    .eq('user_id', userId)
    .eq('tournament_id', tournamentId);

  return { error };
}

// ─── FETCH TOURNAMENT REGISTRATIONS ──────────────────────────────────────────
// Returns all registrations for a tournament (both sides).
// Joins basic profile data for display purposes.
//
export async function fetchTournamentRegistrations(supabase, tournamentId) {
  const { data, error } = await supabase
    .from('tournament_registrations')
    .select('*, profiles(id, username, elo, avatar_id)')
    .eq('tournament_id', tournamentId)
    .order('created_at', { ascending: true });

  return { data: data ?? [], error };
}
