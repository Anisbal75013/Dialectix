/**
 * api.js — Service API centralisé Dialectix
 *
 * Tous les appels vers le backend passent ici.
 * Base URL : import.meta.env.VITE_BACKEND_URL
 *   Dev  → http://localhost:3001
 *   Prod → https://dialectix-backend.vercel.app/api
 *
 * Note: en développement local, le backend NestJS n'a PAS le préfixe /api
 * (il est ajouté uniquement dans api/index.ts pour Vercel).
 * Pour unifier, on utilise VITE_BACKEND_URL qui pointe déjà vers la bonne base.
 */

const BASE = (import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001').replace(/\/$/, '');

/* ── Helpers ─────────────────────────────────────────────────────────────── */

async function request(method, path, body = null) {
  const opts = {
    method,
    headers: { 'Content-Type': 'application/json' },
  };
  if (body) opts.body = JSON.stringify(body);

  const res = await fetch(`${BASE}${path}`, opts);

  if (!res.ok) {
    let msg = `API ${method} ${path} → ${res.status}`;
    try { const j = await res.json(); msg = j.message || j.error || msg; } catch {}
    throw new Error(msg);
  }

  return res.status === 204 ? null : res.json();
}

const get  = (path)        => request('GET',   path);
const post = (path, body)  => request('POST',  path, body);
const patch = (path, body) => request('PATCH', path, body);

/* ── Health ──────────────────────────────────────────────────────────────── */
export const health   = () => get('/health');
export const healthDb = () => get('/health/db');

/* ── AI endpoints (already used by App.jsx) ─────────────────────────────── */
export const aiJudge   = (body) => post('/ai/judge',   body);
export const aiRespond = (body) => post('/ai/respond', body);
export const aiReport  = (body) => post('/ai/report',  body);

/* ── Users ───────────────────────────────────────────────────────────────── */
export const getUsers       = ()           => get('/users');
export const getLeaderboard = ()           => get('/users/leaderboard');
export const getUser        = (id)         => get(`/users/${id}`);
export const createUser     = (data)       => post('/users', data);

/* ── Battles ─────────────────────────────────────────────────────────────── */
export const getBattles        = ()     => get('/battles');
export const getBattleStats    = ()     => get('/battles/stats');
export const getUserBattles    = (id)   => get(`/battles/user/${id}`);
export const saveBattle        = (data) => post('/battles', data);

/* ── Academies ────────────────────────────────────────────────────────────── */
export const getAcademies  = ()           => get('/academies');
export const getAcademy    = (id)         => get(`/academies/${id}`);
export const createAcademy = (data)       => post('/academies', data);
export const joinAcademy   = (id, data)   => post(`/academies/${id}/join`, data);

/* ── Tournaments ──────────────────────────────────────────────────────────── */
export const getTournaments    = ()         => get('/tournaments');
export const getTournament     = (id)       => get(`/tournaments/${id}`);
export const createTournament  = (data)     => post('/tournaments', data);
export const setTournamentStatus = (id, status) =>
  patch(`/tournaments/${id}/status`, { status });

/* ── Supabase direct client (frontend-safe, anon key only) ───────────────── */
export const SUPABASE_URL      = import.meta.env.VITE_SUPABASE_URL;
export const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;
