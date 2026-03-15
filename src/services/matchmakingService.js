/**
 * matchmakingService.js — Dialectix
 *
 * Profile-aware matchmaking for finding the best opponent.
 * Priority: 1) ELO proximity  2) Domain overlap  3) Confrontation tolerance
 * Falls back to standard matchmaking if no compatible player found.
 *
 * All functions are pure — no React, no side effects (except localStorage reads).
 */

import { getPlayerProfile } from '../DialectixProfileQuestionnaire.jsx';

/* ── ELO band helpers ─────────────────────────────────────────────────── */
const ELO_BAND  = 150;  // max ELO difference for "compatible" opponents
const ELO_WIDE  = 350;  // fallback band

/** Absolute ELO difference between two players */
function eloDiff(a, b) {
  return Math.abs((a.elo || 1000) - (b.elo || 1000));
}

/* ── Domain overlap score (0-1) ──────────────────────────────────────── */
function domainScore(profileA, profileB) {
  const domainsA = profileA?.domains || [];
  const domainsB = profileB?.domains || [];
  if (!domainsA.length || !domainsB.length) return 0.5; // neutral if no data
  const common = domainsA.filter(d => domainsB.includes(d)).length;
  return common / Math.max(domainsA.length, domainsB.length);
}

/* ── Confrontation compatibility score (0-1) ─────────────────────────── */
const TOLERANCE_VALUES = { faible: 1, moyen: 2, eleve: 3 };
function toleranceScore(profileA, profileB) {
  const tA = TOLERANCE_VALUES[profileA?.confrontationTolerance] ?? 2;
  const tB = TOLERANCE_VALUES[profileB?.confrontationTolerance] ?? 2;
  const diff = Math.abs(tA - tB);
  return 1 - diff / 2; // 0 diff → 1.0, max diff 2 → 0.0
}

/* ── Main matchmaking function ───────────────────────────────────────── */
/**
 * Find the best opponent for the user from a candidate pool.
 *
 * @param {object}   user       — current user { id, elo, name }
 * @param {object[]} candidates — array of potential opponents (same shape)
 * @param {string}   [topic]    — optional topic context (unused for now)
 * @returns {object|null}       — best candidate, or null if pool is empty
 */
export function findOpponent(user, candidates, topic = '') {
  if (!candidates || candidates.length === 0) return null;

  const userProfile = getPlayerProfile();

  // Filter out the user themselves
  const pool = candidates.filter(c => c.id !== user?.id);
  if (pool.length === 0) return null;

  // Score each candidate
  const scored = pool.map(candidate => {
    const candidateProfile = (() => {
      try {
        const all = JSON.parse(localStorage.getItem('dx_all_profiles') || '{}');
        return all[candidate.id] || null;
      } catch { return null; }
    })();

    const elo   = eloDiff(user, candidate);
    const eloN  = 1 - Math.min(elo, 600) / 600;      // 0 diff → 1.0, 600+ diff → 0.0
    const dom   = domainScore(userProfile, candidateProfile);
    const tol   = toleranceScore(userProfile, candidateProfile);

    // Weighted composite score
    const score = eloN * 0.55 + dom * 0.30 + tol * 0.15;

    return { candidate, score, elo };
  });

  // Sort by composite score (desc)
  scored.sort((a, b) => b.score - a.score);

  // Accept best candidate if within ELO band, else try wider band
  const best = scored[0];
  if (best.elo <= ELO_BAND) return best.candidate;
  if (best.elo <= ELO_WIDE) return best.candidate;

  // Fallback: return closest ELO regardless of bands
  scored.sort((a, b) => a.elo - b.elo);
  return scored[0].candidate;
}

/* ── Topic-aware filtering ───────────────────────────────────────────── */
/**
 * Filter candidates by domain preference when a topic category is known.
 *
 * @param {object[]} candidates
 * @param {string}   category   — topic category (e.g. 'géopolitique')
 * @returns {object[]}          — sorted by domain relevance
 */
export function filterByTopicDomain(candidates, category) {
  if (!category) return candidates;
  return [...candidates].sort((a, b) => {
    const profileA = (() => { try { return JSON.parse(localStorage.getItem('dx_all_profiles') || '{}')[a.id] || null; } catch { return null; } })();
    const profileB = (() => { try { return JSON.parse(localStorage.getItem('dx_all_profiles') || '{}')[b.id] || null; } catch { return null; } })();
    const hasCatA = (profileA?.domains || []).includes(category) ? 1 : 0;
    const hasCatB = (profileB?.domains || []).includes(category) ? 1 : 0;
    return hasCatB - hasCatA;
  });
}

/* ── Bot selection helper ────────────────────────────────────────────── */
/**
 * Select the best-fit bot from a list based on user profile.
 * Used when no human opponent is available.
 *
 * @param {object}   user
 * @param {object[]} bots   — array of bot configs { id, name, style, elo }
 * @returns {object}        — best bot, or first bot as fallback
 */
export function selectBotOpponent(user, bots = []) {
  if (!bots.length) return { id: 'bot_default', name: 'Adversaire IA', style: 'logical', elo: 1200 };

  const userProfile = getPlayerProfile();
  const styleMap = {
    logical:    ['logical'],
    rhetorical: ['emotional', 'provocative'],
    factual:    ['logical', 'academic'],
  };

  const preferredStyles = styleMap[userProfile?.argumentStyle] || ['logical'];
  const tolerance = userProfile?.confrontationTolerance || 'moyen';

  // Preferred: matching style + close ELO
  const byStyle = bots.filter(b => preferredStyles.includes(b.style));
  const pool    = byStyle.length ? byStyle : bots;

  return findOpponent(user, pool) || bots[0];
}

/* ── Profile storage (for admin/matchmaking use) ─────────────────────── */
/**
 * Store the current user's profile under their userId for matchmaking use.
 * Call this after onComplete from DialectixProfileQuestionnaire.
 */
export function storeProfileForMatchmaking(userId, profile) {
  if (!userId) return;
  try {
    const all = JSON.parse(localStorage.getItem('dx_all_profiles') || '{}');
    all[userId] = profile;
    localStorage.setItem('dx_all_profiles', JSON.stringify(all));
  } catch { /* ignore */ }
}
