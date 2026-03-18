/**
 * claude.js — Dialectix AI Scoring Gateway V4
 *
 * All Claude calls now route through the NestJS backend at localhost:3001.
 * The Anthropic API key never reaches the browser.
 *
 * callClaude() contract is UNCHANGED — callers receive the same ScoreObject
 * shape as before. No changes needed in App.jsx's aiAnalyze mapping.
 *
 * Return paths:
 *  – argument.length < MIN_ARGUMENT_LENGTH  → TOO_SHORT_SCORE  (no backend call)
 *  – backend unreachable / timeout          → DEFAULT_SCORE
 *  – backend HTTP error                     → DEFAULT_SCORE
 *  – backend returned fallback:true         → logged + returned as-is
 *  – success                                → ScoreObject from backend
 */

const BACKEND_URL         = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001';
const TIMEOUT_MS          = 12_000;
const MIN_ARGUMENT_LENGTH = 20;

/* ─── WEIGHTS — Pondération équilibrée Dialectix v2 ────────────────────────
 *  Logique & Preuves  → coeff 1.5  (raisonnement solide avant tout)
 *  Pertinence & Réfutation → coeff 1.0  (standard)
 *  Clarté             → coeff 0.8  (évite de trop favoriser le "beau parleur")
 *  Normalisés sur 5.8 (= 1.5+1.5+1.0+1.0+0.8)
 * ─────────────────────────────────────────────────────────────────────────── */
export const WEIGHTS = {
  logic:     0.259,  // 1.5 / 5.8
  evidence:  0.259,  // 1.5 / 5.8
  relevance: 0.172,  // 1.0 / 5.8
  rebuttal:  0.172,  // 1.0 / 5.8
  clarity:   0.138,  // 0.8 / 5.8
};

/* ─── LOCAL FALLBACK ─────────────────────────────────────────────────────── */
// Returned when the backend is unreachable, times out, or returns non-2xx.
// Shape is identical to what the backend returns on its own failures.

const DEFAULT_SCORE = {
  logic:              4,
  evidence:           3,
  relevance:          4,
  rebuttal:           3,
  clarity:            4,
  overall_score:      3.6,
  confidence:         0.3,
  argument_style:     'mixed',
  fallacies:          [],
  analysis:           'AI unavailable',
  improvement_advice: 'Backend unreachable. Check that the NestJS server is running on port 3001.',
  strengths:          [],
  weaknesses:         [],
  fallback:           true,
};

/* ─── TOO SHORT ──────────────────────────────────────────────────────────── */
// Returned for arguments under MIN_ARGUMENT_LENGTH — never hits the backend.

const TOO_SHORT_SCORE = {
  logic:              2,
  evidence:           1,
  relevance:          2,
  rebuttal:           1,
  clarity:            3,
  overall_score:      1.82,
  confidence:         0.15,
  argument_style:     'mixed',
  fallacies:          [],
  analysis:           'Argument trop court pour une évaluation complète.',
  improvement_advice: 'Développez votre argument avec au moins une idée complète et un exemple.',
  strengths:          [],
  weaknesses:         ['Argument trop court (moins de 20 caractères)'],
};

/* ─── MAIN EXPORT ────────────────────────────────────────────────────────── */
/**
 * callClaude(argument, topic?, _maxTokens?)
 *
 * Routes to POST /ai/judge on the backend.
 * Returns a ScoreObject — never throws.
 *
 * @param {string} argument   – The debate argument to score
 * @param {string} topic      – The debate topic (improves judge accuracy)
 * @param {number} _maxTokens – Ignored (backend controls token budget)
 */
/**
 * callClaude(argument, topic?, _maxTokens?, opts?)
 *
 * opts = {
 *   doctrine?:  string  — École de pensée du joueur (Stoïcien, Sceptique…)
 *                         Transmise au backend pour ajuster le ton du juge.
 *   isMicMode?: boolean — Si true, "Preuves" → "Solidité des Prémisses"
 *                         (backend peut adapter son évaluation en conséquence)
 * }
 */
export async function callClaude(argument, topic = '', _maxTokens = 800, opts = {}) {
  const trimmed = (argument || '').trim();
  const { doctrine = '', isMicMode = false } = opts;

  if (trimmed.length < MIN_ARGUMENT_LENGTH) {
    console.log(`[CLAUDE] Too short (${trimmed.length} < ${MIN_ARGUMENT_LENGTH}) — skipping backend`);
    return TOO_SHORT_SCORE;
  }

  console.log('[CLAUDE] → /ai/judge | arg:', trimmed.slice(0, 100) + (trimmed.length > 100 ? '…' : ''),
    doctrine ? `| doctrine: ${doctrine}` : '', isMicMode ? '| micMode' : '');

  const controller = new AbortController();
  const timeoutId  = setTimeout(() => {
    controller.abort();
    console.warn('[CLAUDE] Backend request timed out (12s)');
  }, TIMEOUT_MS);

  try {
    const res = await fetch(`${BACKEND_URL}/ai/judge`, {
      method:  'POST',
      signal:  controller.signal,
      headers: { 'content-type': 'application/json' },
      body:    JSON.stringify({
        argument:   trimmed,
        topic:      topic || '',
        doctrine:   doctrine || '',     // École de pensée → ajustement du juge
        isMicMode:  isMicMode || false, // Mode oral → critère Preuves adapté
        weights:    WEIGHTS,            // Poids normalisés → recalcul backend
      }),
    });

    clearTimeout(timeoutId);

    if (!res.ok) {
      console.error(`[CLAUDE] Backend HTTP ${res.status} — returning fallback`);
      return DEFAULT_SCORE;
    }

    const scored = await res.json();

    if (scored?.fallback) {
      console.warn('[CLAUDE] Backend returned fallback score — check backend logs');
    } else {
      console.log('[CLAUDE] ← overall_score:', scored.overall_score, '| confidence:', scored.confidence);
    }

    return scored;

  } catch (err) {
    clearTimeout(timeoutId);
    if (err.name === 'AbortError') {
      console.error('[CLAUDE] Backend request aborted (timeout)');
    } else {
      console.error('[CLAUDE] Backend unreachable:', err.message);
    }
    return DEFAULT_SCORE;
  }
}
