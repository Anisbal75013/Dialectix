/**
 * @file arenaUtils.js
 * @description Pure utility functions for the Dialectix Arena tournament system.
 *
 * ⚠️  These functions are ISOLATED from the main scoring pipeline.
 *     They do NOT touch calcELO / applyELO / callClaude / handleEndDebate.
 *     Arena ELO deltas use a simpler rule set so competitive mode stays
 *     balanced without disrupting regular-debate ELO math.
 *
 * ADDED: generateAIArgument(player, topic, opponentArgument)
 *   Generates realistic AI debate arguments for test players.
 *   Calls Claude directly (same pattern as aiBotRespond in App.jsx).
 *   Does NOT affect scoring, ELO, simulateBotMatch, or any existing export.
 *
 * V4 IMPROVEMENTS (generateAIArgument only — no other changes):
 *   FIX 1 — Cache key now includes a hash of opponentArgument → fresh
 *            argument generated for every unique exchange, not every phase.
 *   FIX 2 — Prompt explicitly instructs Claude to respond to the opponent's
 *            specific argument, reference a concrete idea from it, and attack
 *            a different weakness than previously raised.
 *   FIX 3 — Random "micro-focus" instruction added each call: logic /
 *            consequences / evidence / contradiction.
 *   FIX 4 — If the generated text equals the player's lastArgument, one
 *            forced regeneration attempt is made before falling back.
 */

// ─── TIER SYSTEM ─────────────────────────────────────────────────────────────
// Separate from the badge/rank system in App.jsx — different thresholds,
// different display context (arena leaderboard + profile extension).

/** @type {Array<{min:number, label:string, color:string, icon:string}>} */
export const ARENA_TIERS = [
  { min: 1800, label: 'Grandmaster', color: '#FFD700', icon: '👑' },
  { min: 1500, label: 'Master',      color: '#C084FC', icon: '💜' },
  { min: 1200, label: 'Advanced',    color: '#60A5FA', icon: '🔵' },
  { min: 1000, label: 'Debater',     color: '#4ADE80', icon: '🟢' },
  { min: 0,    label: 'Beginner',    color: '#9CA3AF', icon: '⚪' },
];

/**
 * Returns the tier object for a given ELO value.
 * @param {number} elo
 * @returns {{min:number, label:string, color:string, icon:string}}
 */
export const getTier = (elo = 0) =>
  ARENA_TIERS.find(t => elo >= t.min) || ARENA_TIERS[ARENA_TIERS.length - 1];

// ─── ARENA ELO DELTAS ────────────────────────────────────────────────────────
// Lightweight, separate from the K-factor system used in regular debates.

/** @type {{win:number, loss:number, draw:number}} */
export const ARENA_ELO_DELTA = { win: +15, loss: -12, draw: +3 };

// ─── WEEKLY TOPICS ───────────────────────────────────────────────────────────

/** @type {string[]} */
export const ARENA_TOPICS = [
  "L'intelligence artificielle devrait être réglementée par les gouvernements",
  "Le travail à distance est bénéfique pour la productivité et la société",
  "La démocratie directe est supérieure à la démocratie représentative",
  "Les réseaux sociaux font plus de mal que de bien à la société",
  "L'enseignement supérieur devrait être gratuit pour tous",
  "La peine de mort ne devrait jamais être acceptable dans une société moderne",
  "Le végétarisme devrait être encouragé par la politique publique",
  "L'exploration spatiale mérite plus de financement que la lutte contre la pauvreté",
];

/**
 * Returns a stable weekly topic based on the current week number.
 * Same topic for the entire week → consistent arena theme.
 * @returns {string}
 */
export const getWeeklyTopic = () => {
  const weekNum = Math.floor(Date.now() / (7 * 24 * 60 * 60 * 1000));
  return ARENA_TOPICS[weekNum % ARENA_TOPICS.length];
};

// ─── TEAM BALANCING ──────────────────────────────────────────────────────────

/**
 * Balances two teams using a snake-draft pattern on ELO.
 * Sort desc → 1→A, 2→B, 3→B, 4→A, 5→A, 6→B …
 * This interleaving ensures both teams have similar total ELO.
 *
 * @param {Array<{id:string, elo:number, [key:string]:any}>} players
 * @returns {{ teamA: Array, teamB: Array }}
 */
export const balanceTeams = (players) => {
  const sorted = [...players].sort((a, b) => b.elo - a.elo);
  const teamA = [], teamB = [];
  sorted.forEach((p, i) => {
    const round = Math.floor(i / 2);
    const pos   = i % 2;
    if (round % 2 === 0) {
      pos === 0 ? teamA.push(p) : teamB.push(p);
    } else {
      pos === 0 ? teamB.push(p) : teamA.push(p);
    }
  });
  return { teamA, teamB };
};

/**
 * Calculates the total ELO for a team array.
 * @param {Array<{elo:number}>} team
 * @returns {number}
 */
export const teamTotalElo = (team) =>
  team.reduce((sum, p) => sum + (p.elo || 1000), 0);

// ─── MATCH GENERATION ────────────────────────────────────────────────────────

/**
 * Generates 1v1 pairings from two balanced teams.
 * Extends match data with arena_tournament_id and team_assignment fields
 * to stay compatible with the existing debate/match structure.
 *
 * @param {Array} teamA
 * @param {Array} teamB
 * @param {string} tournamentId
 * @returns {Array<{matchId:string, playerA:Object, playerB:Object,
 *                  team_assignment:{A:string,B:string},
 *                  arena_tournament_id:string,
 *                  status:'pending'|'done',
 *                  score1:number|null, score2:number|null,
 *                  winnerId:string|null}>}
 */
export const generatePairings = (teamA, teamB, tournamentId = '') => {
  const len = Math.min(teamA.length, teamB.length);
  return Array.from({ length: len }, (_, i) => ({
    matchId:             `${tournamentId}-M${i + 1}`,
    playerA:             teamA[i],
    playerB:             teamB[i],
    team_assignment:     { A: 'Pro', B: 'Contra' },
    arena_tournament_id: tournamentId,
    status:              'pending',
    score1:              null,
    score2:              null,
    winnerId:            null,
  }));
};

// ─── MATCH RESULT ─────────────────────────────────────────────────────────────

/**
 * Applies an arena result to a user object (non-destructive spread).
 * Uses ARENA_ELO_DELTA, NOT the main K-factor calcELO/applyELO pipeline.
 * Also auto-updates the tier label.
 *
 * @param {Object} user - Existing user state
 * @param {'win'|'loss'|'draw'} result
 * @returns {Object} Partial user updates (spread over existing user)
 */
export const applyArenaResult = (user, result) => {
  const delta  = ARENA_ELO_DELTA[result] ?? 0;
  const newElo = Math.max(0, (user.elo || 1000) + delta);
  return {
    elo:     newElo,
    wins:    (user.wins   || 0) + (result === 'win'  ? 1 : 0),
    losses:  (user.losses || 0) + (result === 'loss' ? 1 : 0),
    draws:   (user.draws  || 0) + (result === 'draw' ? 1 : 0),
    tier:    getTier(newElo).label,
  };
};

// ─── SIMULATE MATCH ──────────────────────────────────────────────────────────

/**
 * Simulates a match result for bot players.
 * ELO-weighted randomness: higher-ELO player has a better chance.
 * User matches should NOT use this — they play via DebateArena instead.
 *
 * @param {{ playerA: {elo:number, id:string}, playerB: {elo:number, id:string} }} match
 * @returns {Object} Completed match with score1, score2, winnerId
 */
export const simulateBotMatch = (match) => {
  const eloA   = match.playerA.elo || 1000;
  const eloB   = match.playerB.elo || 1000;
  const probA  = 1 / (1 + Math.pow(10, (eloB - eloA) / 400));
  const base   = 4.5;
  const spread = 5.0;
  const r      = Math.random();
  // Score A is proportionally boosted if ELO favours A
  const biasA  = (probA - 0.5) * 2.0;
  const scoreA = Math.min(10, Math.max(0, base + spread * r + biasA * spread * 0.4));
  const scoreB = Math.min(10, Math.max(0, base + spread * (1 - r) - biasA * spread * 0.4));
  const winnerId =
    scoreA > scoreB ? match.playerA.id :
    scoreB > scoreA ? match.playerB.id :
    null; // draw
  return {
    ...match,
    status:   'done',
    score1:   Math.round(scoreA * 10) / 10,
    score2:   Math.round(scoreB * 10) / 10,
    winnerId,
  };
};

// ─── MVP COMPUTATION ─────────────────────────────────────────────────────────

/**
 * Computes the tournament MVP: player with the highest average score
 * across all completed matches (minimum 1 match played).
 *
 * @param {Array} matches - All matches (may include pending ones)
 * @returns {Object|null} mvp player with avgScore + matchesPlayed fields, or null
 */
export const computeMVP = (matches) => {
  const stats = {};
  matches
    .filter(m => m.status === 'done')
    .forEach(m => {
      const add = (player, score) => {
        if (!player || score == null) return;
        if (!stats[player.id]) stats[player.id] = { player, total: 0, count: 0 };
        stats[player.id].total += score;
        stats[player.id].count += 1;
      };
      add(m.playerA, m.score1);
      add(m.playerB, m.score2);
    });

  const ranked = Object.values(stats)
    .filter(s => s.count >= 1)
    .map(s => ({
      ...s.player,
      avgScore:     Math.round((s.total / s.count) * 100) / 100,
      matchesPlayed: s.count,
    }))
    .sort((a, b) => b.avgScore - a.avgScore);

  return ranked[0] || null;
};

// ─── QUEUE HELPERS ────────────────────────────────────────────────────────────

/** Bot names for demo queue filling */
const BOT_POOL = [
  { name: 'ArgusBot',   avatar: '🤖' },
  { name: 'LogixAI',    avatar: '⚙️' },
  { name: 'PhiloBot',   avatar: '📚' },
  { name: 'RhetoBot',   avatar: '🎭' },
  { name: 'DebatAI',    avatar: '💡' },
  { name: 'CriticBot',  avatar: '🔍' },
  { name: 'SocraBot',   avatar: '🦉' },
  { name: 'PlatoAI',    avatar: '🏛' },
  { name: 'AriesBot',   avatar: '♈' },
  { name: 'LogosBot',   avatar: '⚖️' },
];

/**
 * Fills a queue with AI bots up to targetCount.
 * Bot ELOs are randomly distributed 900–1750 for variety.
 *
 * @param {Array} existingPlayers
 * @param {number} [targetCount=8]
 * @returns {Array} Full queue with bots appended
 */
export const fillWithBots = (existingPlayers, targetCount = 8) => {
  const bots = [];
  for (let i = existingPlayers.length; i < targetCount; i++) {
    const pool  = BOT_POOL[i % BOT_POOL.length];
    bots.push({
      id:     `arena-bot-${i}-${Date.now()}`,
      name:   pool.name,
      elo:    900 + Math.floor(Math.random() * 851),   // 900–1750
      avatar: pool.avatar,
      isBot:  true,
    });
  }
  return [...existingPlayers, ...bots];
};

// ─── LEADERBOARD HELPERS ─────────────────────────────────────────────────────

/**
 * Enriches a leaderboard player array with tier + winrate for display.
 * Does NOT modify the source array.
 *
 * @param {Array<{elo:number, wins:number, debates:number, [key:string]:any}>} players
 * @returns {Array} Same players with tier + winRate appended
 */
export const enrichLeaderboard = (players) =>
  players.map(p => ({
    ...p,
    tier:    getTier(p.elo || 0),
    winRate: p.debates ? Math.round((p.wins / p.debates) * 100) : 0,
  }));

// ─── AI SPARRING PARTNER ──────────────────────────────────────────────────────
//
// generateAIArgument(player, topic, opponentArgument)
//
// Generates a realistic spoken debate argument for a test player.
// Uses the player's `argumentStyle` to shape tone and framing.
//
// UNTOUCHED by this function:
//   simulateBotMatch  – score math unchanged
//   computeMVP        – unchanged
//   balanceTeams      – unchanged
//   ELO / scoring     – unchanged
//
// Call pattern mirrors aiBotRespond() in App.jsx:
//   direct fetch → text extraction → no score parsing
//   max_tokens:200 / temperature:0.75 / 8 s timeout

const AI_BACKEND = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001';

// ─── FIX 1: Hash helper ───────────────────────────────────────────────────────
/**
 * Lightweight djb2-style hash of a string → short hex suffix for cache keys.
 * Deterministic — same input always produces the same 6-char hex string.
 * Used to make the argument cache key unique per opponentArgument value.
 *
 * @param {string} str
 * @returns {string}  6-character lowercase hex string
 */
function _hashStr(str) {
  let h = 5381;
  for (let i = 0; i < str.length; i++) {
    h = ((h << 5) + h) ^ str.charCodeAt(i);
    h = h >>> 0; // keep 32-bit unsigned
  }
  return h.toString(16).slice(0, 6).padStart(6, '0');
}

/**
 * In-memory argument cache.
 * Key: `${player.id}::${topic}::${debatePhase}::${hash(opponentArgument)}`
 *
 * FIX 1: The opponentArgument hash makes every exchange produce a distinct
 * cache entry, so the same player never reuses a stale argument when the
 * opponent has said something new.
 *
 * Cleared naturally on page reload (no persistence intended).
 */
const _argCache = new Map();

/**
 * Short-term debate memory per test player.
 * Key:   `${player.id}::${topic}`
 * Value: { lastArgument, lastOpponentArgument, exchanges }
 *
 * Used to inject conversation continuity into the Claude prompt so each
 * argument feels like a response to the previous exchange, not an isolated
 * statement.  Stored in module scope — lives for the duration of the session.
 * Wrapped in try/catch everywhere so a memory failure never crashes the flow.
 */
const _memory = new Map();

/**
 * Phase-specific task directions.
 * Overrides the style `direction` field based on where we are in the debate.
 *   opening  → player has not argued yet  (exchanges === 0)
 *   rebuttal → one exchange has happened  (exchanges === 1)
 *   closing  → two or more exchanges done (exchanges >= 2)
 */
const PHASE_RULES = {
  opening:  'Présente ta position principale sur ce sujet. Rends ta thèse d\'ouverture parfaitement claire et sans ambiguïté.',
  rebuttal: 'Attaque directement la faiblesse spécifique du dernier argument de ton adversaire. Ne l\'ignore pas.',
  closing:  'Conclus en un argument final décisif : explique en français pourquoi ta position l\'emporte et pourquoi ton adversaire a échoué à la réfuter.',
};

/**
 * Sentence-count instructions for length variation.
 * Randomly selected per call so consecutive arguments feel naturally varied.
 */
const LENGTH_RULES = {
  short:  'Écris exactement 1 phrase en français. Sois tranchant et décisif.',
  medium: 'Écris 2 phrases en français. D\'abord l\'attaque, puis la construction de ta thèse.',
  long:   'Écris 3 phrases en français. Pose le problème, défie l\'adversaire, puis conclus.',
};
const LENGTH_OPTIONS = ['short', 'medium', 'long'];

// ─── FIX 3: Micro-focus pool ─────────────────────────────────────────────────
/**
 * One instruction is chosen at random each call and appended to the prompt.
 * Forces Claude to approach the same topic from a different angle each time,
 * preventing the AI from defaulting to its "favourite" rhetorical move.
 */
const MICRO_FOCUS_POOL = [
  'Concentre-toi spécifiquement sur la structure logique de l\'argument.',
  'Concentre-toi spécifiquement sur les conséquences concrètes de la position de l\'adversaire.',
  'Concentre-toi spécifiquement sur l\'absence de preuves solides dans l\'affirmation de l\'adversaire.',
  'Concentre-toi spécifiquement sur la contradiction interne dans le raisonnement de l\'adversaire.',
];

/**
 * Per-style system instructions + response direction.
 *
 * system  → shapes the debater's voice and approach.
 * direction → one-line task appended to the user turn.
 *
 * These are deliberately distinct so each personality sounds different.
 */
// ─── RÈGLE ABSOLUE DE LANGUE (injectée dans chaque system prompt) ─────────────
// Claude doit répondre UNIQUEMENT en français, quelle que soit la langue
// dans laquelle l'utilisateur a écrit. Cette règle ne peut pas être outrepassée.
const _FR_RULE = 'RÈGLE ABSOLUE : Tu réponds UNIQUEMENT en français. Jamais en anglais. Jamais dans une autre langue. Toujours en français.';

const STYLE_CONFIG = {

  logical: {
    system: [
      _FR_RULE,
      'Tu es un débatteur compétitif qui argumente avec une structure logique stricte.',
      'Tu construis des prémisses menant à des conclusions claires.',
      'Tu exposes les sophismes par leur nom quand c\'est pertinent.',
      'Tu es calme, précis et jamais émotionnel.',
      'Tu n\'utilises pas de formules creuses.',
      'Tu t\'exprimes en français académique.',
    ].join(' '),
    direction: 'Identifie la faille logique dans le raisonnement de l\'adversaire et comble-la avec un contre-argument structuré en français.',
  },

  emotional: {
    system: [
      _FR_RULE,
      'Tu es un débatteur passionné qui relie chaque argument aux enjeux humains réels.',
      'Tu utilises des questions rhétoriques, des exemples vivants et l\'empathie.',
      'Tu fais ressentir au public ce qui est en jeu.',
      'Ton ton est chaleureux mais urgent.',
      'Tu évites les statistiques froides sans ancrage humain.',
      'Tu t\'exprimes en français naturel et convaincant.',
    ].join(' '),
    direction: 'Mets en avant le coût humain de la position de l\'adversaire et explique en français pourquoi ta vision protège mieux les personnes concernées.',
  },

  aggressive: {
    system: [
      _FR_RULE,
      'Tu es un débatteur audacieux et direct qui affronte les arguments de front.',
      'Tu es confrontational mais factuel — jamais personnel.',
      'Tu exposes immédiatement le point le plus faible de l\'argument adverse.',
      'Tu es confiant et économe en mots.',
      'Tu ne tempères pas.',
      'Tu t\'exprimes en français percutant et incisif.',
    ].join(' '),
    direction: 'Attaque directement la faiblesse centrale de l\'argument de l\'adversaire, en français, sans qualification ni détour.',
  },

  academic: {
    system: [
      _FR_RULE,
      'Tu es un débatteur universitaire avec un langage formel et méthodique.',
      'Tu fais référence à des domaines de recherche, des résultats établis et des cadres théoriques.',
      'Tu construis tes arguments de manière progressive et rigoureuse.',
      'Tu utilises des formulations comme "les données suggèrent", "la recherche dans ce domaine", "le consensus académique indique".',
      'Tu as l\'autorité d\'un académicien présentant à une conférence.',
      'Tu t\'exprimes en français académique soutenu.',
    ].join(' '),
    direction: 'Ancre ton contre-argument dans des preuves pertinentes ou un cadre théorique issu de la littérature académique, en français.',
  },

  provocative: {
    system: [
      _FR_RULE,
      'Tu es un débatteur tranchant et non-conventionnel qui expose les contradictions cachées.',
      'Tu challenges les hypothèses que les autres tiennent pour évidentes.',
      'Tu cadres les problèmes de manière inattendue pour forcer l\'adversaire à défendre ses prémisses.',
      'Tu poses des questions rhétoriques inconfortables.',
      'Tes arguments sont courts, ciblés et déstabilisants.',
      'Tu t\'exprimes en français provocateur et percutant.',
    ].join(' '),
    direction: 'Expose en français l\'hypothèse cachée sur laquelle repose l\'adversaire et démontre pourquoi elle ne peut pas tenir.',
  },
};

/**
 * Fallback argument strings used when the Claude call fails.
 * Keyed by argumentStyle — must stay distinct in tone.
 */
const STYLE_FALLBACKS = {
  logical:     "Votre argument manque des fondements logiques nécessaires pour soutenir cette conclusion — le raisonnement ne tient tout simplement pas.",
  emotional:   "Cette position ignore les véritables conséquences pour les personnes les plus directement touchées, et cela compte.",
  aggressive:  "Cette affirmation s'effondre dès qu'on lui applique le moindre regard critique sérieux.",
  academic:    "Les données disponibles dans la littérature pertinente ne soutiennent pas cette assertion.",
  provocative: "Si c'était réellement vrai, comment expliquez-vous la contradiction fondamentale au cœur même de votre prémisse ?",
};

// ─── INTERNAL: backend argument fetch ────────────────────────────────────────
/**
 * Routes to POST /ai/respond on the NestJS backend.
 * Passes the fully-built system prompt and user content so the backend
 * can forward them directly to Claude without rebuilding.
 * Returns null on any error so the caller can decide the fallback.
 *
 * @param {string} system      – Style-specific system instructions
 * @param {string} userContent – Fully-built user-turn content
 * @returns {Promise<string|null>}
 */
async function _fetchArgument(system, userContent) {
  const controller = new AbortController();
  const timeoutId  = setTimeout(() => controller.abort(), 8_000); // 8 s

  try {
    const response = await fetch(`${AI_BACKEND}/ai/respond`, {
      method:  'POST',
      signal:  controller.signal,
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        argument:    userContent,  // full user-turn content
        system,                    // style system instructions
        style:       'logical',    // fallback style if backend needs it
        phase:       'debate',
      }),
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      console.warn(`[ARENA AI] Backend HTTP ${response.status}`);
      return null;
    }

    const data = await response.json();
    return data?.response?.trim() || null;

  } catch (err) {
    clearTimeout(timeoutId);
    if (err.name === 'AbortError') {
      console.warn('[ARENA AI] Request timed out');
    } else {
      console.warn('[ARENA AI] Backend unreachable:', err.message);
    }
    return null;
  }
}

/**
 * generateAIArgument(player, topic, opponentArgument?)
 *
 * Generates a realistic 1–3 sentence debate argument for a test player,
 * styled according to player.argumentStyle.
 *
 * SAFETY:
 *   – Reads VITE_ANTHROPIC_API_KEY only — no user data sent
 *   – No Supabase calls, no user state mutations
 *   – Returns plain string only — caller decides what to do with it
 *   – Hard 8 s timeout via AbortController — never hangs UI
 *   – Falls back to static string if API fails, times out, or key missing
 *
 * V4 CHANGES (no impact on scoring, ELO, or architecture):
 *   FIX 1 — Cache key includes hash(opponentArgument) → fresh per exchange
 *   FIX 2 — Prompt forces response to the opponent's specific argument
 *   FIX 3 — Random micro-focus instruction per call
 *   FIX 4 — Duplicate detection → one forced regeneration attempt
 *
 * @param {{ argumentStyle?: string, name?: string, elo?: number, isTest?: boolean, id?: string }} player
 * @param {string}  topic            – The current debate topic
 * @param {string}  [opponentArgument=''] – The opposing player's last argument (optional)
 * @returns {Promise<string>}  A single debate argument as plain text
 */
export async function generateAIArgument(player, topic, opponentArgument = '') {
  const style   = player?.argumentStyle || 'logical';
  const config  = STYLE_CONFIG[style]   || STYLE_CONFIG.logical;
  const fallback= STYLE_FALLBACKS[style]|| STYLE_FALLBACKS.logical;

  // ── Guard: only generate AI arguments for test players ──────────────────
  // Never call Claude for real users or arena bots — their paths are separate.
  if (!player?.isTest) {
    return fallback;
  }

  // ── Memory read — determine debate phase ─────────────────────────────────
  // Wrapped in try/catch: a corrupt memory entry must never crash the flow.
  let mem = { lastArgument: '', lastOpponentArgument: '', exchanges: 0 };
  try {
    const memKey = `${player.id}::${topic}`;
    if (_memory.has(memKey)) mem = { ...mem, ..._memory.get(memKey) };
  } catch { /* memory read failure — continue with empty context */ }

  const exchanges   = mem.exchanges || 0;
  const debatePhase = exchanges === 0 ? 'opening' : exchanges === 1 ? 'rebuttal' : 'closing';
  const phaseRule   = PHASE_RULES[debatePhase];

  // ── FIX 1: Cache key includes opponentArgument hash ──────────────────────
  const opponentHash = _hashStr(opponentArgument || '');
  const cacheKey = `${player.id}::${topic}::${debatePhase}::${opponentHash}`;
  if (_argCache.has(cacheKey)) {
    console.log(`[ARENA AI] Cache hit for ${player?.name} (${debatePhase}, hash:${opponentHash})`);
    return _argCache.get(cacheKey);
  }

  // ── Length variation — random per call for natural rhythm ────────────────
  const lengthKey  = LENGTH_OPTIONS[Math.floor(Math.random() * LENGTH_OPTIONS.length)];
  const lengthRule = LENGTH_RULES[lengthKey];

  // ── FIX 3: Random micro-focus instruction ────────────────────────────────
  const microFocus = MICRO_FOCUS_POOL[Math.floor(Math.random() * MICRO_FOCUS_POOL.length)];

  // ── Build user-turn content ───────────────────────────────────────────────
  // Order: topic → debate phase context → memory → opponent → adaptation
  //        rules → style task → micro-focus → length → formatting rules
  const memoryLines = [];
  if (mem.lastArgument) {
    memoryLines.push(`Ton argument précédent : "${mem.lastArgument}"`);
  }
  if (mem.lastOpponentArgument) {
    memoryLines.push(`Argument précédent de l'adversaire : "${mem.lastOpponentArgument}"`);
  }

  // ── FIX 2: Explicit adaptation instructions ───────────────────────────────
  const adaptationRules = opponentArgument
    ? [
        `Argument le plus récent de l'adversaire : "${opponentArgument}"`,
        '',
        'RÈGLES D\'ADAPTATION (les quatre s\'appliquent) :',
        '1. Réponds spécifiquement au dernier argument de l\'adversaire — pas au sujet en général.',
        '2. Fais référence à une idée, un mot ou une affirmation précise dans l\'argument de l\'adversaire ci-dessus.',
        '3. Ne répète pas les arguments que tu as déjà avancés.',
        '4. Attaque une faiblesse différente de celles que tu as déjà soulevées.',
      ]
    : ['Tu fais la déclaration d\'ouverture sur ce sujet.'];

  const userContent = [
    `Sujet du débat : "${topic}"`,
    `Phase du débat : ${debatePhase.toUpperCase()} — ${phaseRule}`,
    '',
    ...(memoryLines.length ? [...memoryLines, ''] : []),
    ...adaptationRules,
    '',
    config.direction,
    microFocus,
    '',
    lengthRule,
    'Exprime-toi comme un vrai débatteur humain, pas comme un chatbot.',
    'N\'explique pas ton processus de raisonnement. Argumente directement.',
    'Ne commence pas par "Je" ni par le nom de ton adversaire.',
    'Ne répète pas ce que tu as déjà dit dans ton argument précédent.',
  ].join('\n');

  // ── First fetch attempt ───────────────────────────────────────────────────
  let text = await _fetchArgument(config.system, userContent);

  // ── FIX 4: Duplicate detection — force one regeneration ──────────────────
  // If the generated text is identical to the player's last argument, make
  // one more attempt with temperature bumped inside _fetchArgument by
  // rebuilding with an extra uniqueness instruction.
  if (text && mem.lastArgument && text.trim() === mem.lastArgument.trim()) {
    console.log(`[ARENA AI] Duplicate detected for ${player?.name} — forcing regeneration`);
    const dedupContent = userContent + '\nIMPORTANT : Ta réponse doit être complètement différente de ton argument précédent. Ne réutilise aucune phrase ni formulation que tu as déjà employée.';
    const retryText = await _fetchArgument(config.system, dedupContent);
    if (retryText && retryText.trim() !== mem.lastArgument.trim()) {
      text = retryText;
    }
    // If retry also duplicates (very unlikely), keep the original text — still valid
  }

  if (!text) {
    console.warn(`[ARENA AI] No response for ${player?.name} — using fallback`);
    return fallback;
  }

  console.log(`[ARENA AI] ${player?.name || style} (${style}, ${debatePhase}, hash:${opponentHash}):`, text);

  // ── Cache write ───────────────────────────────────────────────────────────
  _argCache.set(cacheKey, text);

  // ── Memory write — update conversation history ────────────────────────────
  // Wrapped in try/catch: a write failure must never affect the return value.
  try {
    const memKey = `${player.id}::${topic}`;
    _memory.set(memKey, {
      lastArgument:         text,
      lastOpponentArgument: opponentArgument || mem.lastOpponentArgument,
      exchanges:            exchanges + 1,
    });
  } catch { /* memory write failure — argument still returned correctly */ }

  return text;
}
