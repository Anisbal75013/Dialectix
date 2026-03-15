/**
 * betaBotService.js — Dialectix Beta
 *
 * Three beta bots available when no real player is found.
 * Tracks per-user bot battle count (max 5 total).
 *
 * Storage: localStorage['dx_bot_battles'] = { [userId]: count }
 */

const KEY_BOT_BATTLES = 'dx_bot_battles';
const MAX_BOT_BATTLES = 5;

/* ── 3 Beta bots ─────────────────────────────────────────────────────── */
export const BETA_BOTS = [
  {
    id:    'beta_novice',
    name:  'Novice Bot',
    emoji: '🌱',
    elo:   900,
    style: 'beginner',
    diff:  1,
    color: '#8A9070',
    desc:  'Bot d\'entraînement — niveau débutant. Idéal pour les premiers débats.',
    isBetaBot: true,
  },
  {
    id:    'beta_debater',
    name:  'Debater Bot',
    emoji: '💬',
    elo:   1300,
    style: 'intermediate',
    diff:  2,
    color: '#2C4A6E',
    desc:  'Bot intermédiaire — arguments structurés et réfutations ciblées.',
    isBetaBot: true,
  },
  {
    id:    'beta_elite',
    name:  'Elite Rhetorician Bot',
    emoji: '🎭',
    elo:   1700,
    style: 'advanced',
    diff:  4,
    color: '#A05A2C',
    desc:  'Bot élite — rhétorique avancée, détection des sophismes, style académique.',
    isBetaBot: true,
  },
];

/* ── Counter helpers ─────────────────────────────────────────────────── */
function _load() {
  try { return JSON.parse(localStorage.getItem(KEY_BOT_BATTLES) || '{}'); }
  catch { return {}; }
}
function _save(data) {
  try { localStorage.setItem(KEY_BOT_BATTLES, JSON.stringify(data)); }
  catch { /* ignore */ }
}

/** Returns the number of bot battles this user has completed. */
export function getBotBattleCount(userId) {
  if (!userId) return 0;
  return _load()[userId] || 0;
}

/** Returns true if the user has reached the maximum bot battle limit. */
export function hasReachedBotLimit(userId) {
  if (!userId) return false;
  return getBotBattleCount(userId) >= MAX_BOT_BATTLES;
}

/** Remaining bot battles for this user. */
export function remainingBotBattles(userId) {
  if (!userId) return MAX_BOT_BATTLES;
  return Math.max(0, MAX_BOT_BATTLES - getBotBattleCount(userId));
}

/** Increments the bot battle counter for this user. Call after each completed bot battle. */
export function incrementBotBattleCount(userId) {
  if (!userId) return;
  const data = _load();
  data[userId] = (data[userId] || 0) + 1;
  _save(data);
}

/** Resets the bot battle counter (admin use only). */
export function resetBotBattleCount(userId) {
  if (!userId) return;
  const data = _load();
  delete data[userId];
  _save(data);
}

/* ── Bot selection ───────────────────────────────────────────────────── */
/**
 * Returns the best beta bot for the given user's ELO.
 * Picks the bot with the closest ELO.
 */
export function selectBetaBot(userElo = 1000) {
  return BETA_BOTS.reduce((best, bot) =>
    Math.abs(bot.elo - userElo) < Math.abs(best.elo - userElo) ? bot : best,
    BETA_BOTS[0]
  );
}

/**
 * Returns true if a given bot config is a beta bot (isBetaBot flag).
 * Used to exclude bot battles from tournament ranking.
 */
export function isBetaBotBattle(botConfig) {
  if (!botConfig) return false;
  return !!(botConfig.isBetaBot || BETA_BOTS.find(b => b.id === botConfig.id));
}

/* ── Matchmaking delay helper ────────────────────────────────────────── */
/**
 * Simulates a 5-second wait for a real player, then returns the best bot.
 * resolveWithBot is called when the wait expires with no real player found.
 *
 * @param {number}   userElo
 * @param {Function} resolveWithBot — callback(bot)
 * @returns {Function} cancel — call to abort the wait (e.g. if real player joins)
 */
export function waitForRealPlayer(userElo, resolveWithBot) {
  const timeoutId = setTimeout(() => {
    const bot = selectBetaBot(userElo);
    resolveWithBot(bot);
  }, 5000);
  return () => clearTimeout(timeoutId);
}
