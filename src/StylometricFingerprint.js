/**
 * StylometricFingerprint.js
 * -------------------------
 * Stylometric analysis module for Dialectix.
 * Detects potential AI-assisted writing by building per-user style fingerprints
 * and comparing them against live text samples.
 *
 * Pure ES module — no dependencies, no React, no JSX.
 * Works in both browser (via import) and Node.js environments.
 */

// ---------------------------------------------------------------------------
// 1. CONSTANTS
// ---------------------------------------------------------------------------

/** Suspicion level thresholds with display metadata. */
export const SUSPICION_THRESHOLDS = {
  NORMAL:   { min: 0,  max: 30,  label: 'Normal',        color: '#3A6E52' },
  MONITOR:  { min: 31, max: 60,  label: 'Surveillance',  color: '#C6A15B' },
  SUSPECT:  { min: 61, max: 80,  label: 'Suspect',       color: '#C6751B' },
  CRITICAL: { min: 81, max: 100, label: 'Très suspect',  color: '#8C3A30' },
};

/**
 * French logical connectors used to measure rhetorical/argumentative density.
 * Multi-word expressions are intentionally included and matched first.
 */
export const FR_CONNECTORS = [
  'par conséquent',
  'en revanche',
  'en effet',
  'de plus',
  'dès lors',
  'il convient',
  'force est',
  "il s'agit",
  'néanmoins',
  'cependant',
  'toutefois',
  'certes',
  'donc',
  'ainsi',
  'car',
  'or',
];

/**
 * French argument signal phrases used to detect structured argumentation.
 * Typical of academic / formal persuasive writing — and of LLM output.
 */
export const FR_ARGUMENT_SIGNALS = [
  'premièrement',
  'deuxièmement',
  "d'une part",
  "d'autre part",
  'en conclusion',
  'pour conclure',
  'en premier lieu',
  'il faut noter',
  'on peut observer',
  'il est évident',
];

/**
 * Thresholds above which individual fingerprint dimensions are considered
 * indicative of AI-generated text.
 */
export const AI_PATTERN_THRESHOLDS = {
  vocabularyRichness: 0.85, // above this → suspicious
  avgSentenceLength:  32,   // above this → suspicious (words per sentence)
  formalityScore:     0.88, // above this → suspicious
  argumentStructure:  0.82, // above this → suspicious
};

// ---------------------------------------------------------------------------
// Internal localStorage keys
// ---------------------------------------------------------------------------
const LS_FINGERPRINTS  = 'dx_style_fp';
const LS_FLAGS         = 'dx_suspicion_flags';
const MAX_SAMPLES      = 20;   // rolling window for fingerprint averaging
const MIN_TEXT_LENGTH  = 50;   // characters — shorter texts are ignored

// ---------------------------------------------------------------------------
// 2. FINGERPRINT GENERATION
// ---------------------------------------------------------------------------

/**
 * Tokenises text into sentences.
 * Splits on '.', '!', '?' followed by whitespace or end-of-string.
 * @param {string} text
 * @returns {string[]}
 */
function splitSentences(text) {
  return text
    .split(/(?<=[.!?])\s+|(?<=[.!?])$/)
    .map(s => s.trim())
    .filter(s => s.length > 0);
}

/**
 * Tokenises text into word tokens (letters only, lowercase).
 * @param {string} text
 * @returns {string[]}
 */
function splitWords(text) {
  return text
    .toLowerCase()
    .match(/[a-zàâäéèêëîïôöùûüç'-]+/g) || [];
}

/**
 * Tokenises text into paragraphs (blocks separated by one or more blank lines).
 * @param {string} text
 * @returns {string[]}
 */
function splitParagraphs(text) {
  return text
    .split(/\n\s*\n/)
    .map(p => p.trim())
    .filter(p => p.length > 0);
}

/**
 * Counts how many times any phrase in `phrases` appears in `lowerText`.
 * Longer phrases are matched first so multi-word expressions are not double-counted.
 * @param {string}   lowerText  — pre-lowercased source text
 * @param {string[]} phrases
 * @returns {number}
 */
function countPhrases(lowerText, phrases) {
  // Sort descending by length so multi-word expressions win over sub-words.
  const sorted = [...phrases].sort((a, b) => b.length - a.length);
  let count = 0;
  let remaining = lowerText;
  for (const phrase of sorted) {
    const re = new RegExp(phrase.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
    const matches = remaining.match(re) || [];
    count += matches.length;
    // Blank out matched regions so they are not counted again.
    remaining = remaining.replace(re, ' '.repeat(phrase.length));
  }
  return count;
}

/**
 * Analyses a text sample and returns a stylometric fingerprint object.
 *
 * @param {string} text  — raw user input (French prose)
 * @returns {{
 *   avgSentenceLength:  number,
 *   avgWordLength:      number,
 *   vocabularyRichness: number,
 *   longWordRatio:      number,
 *   punctuationDensity: number,
 *   connectorDensity:   number,
 *   questionRatio:      number,
 *   avgParagraphLength: number,
 *   formalityScore:     number,
 *   argumentStructure:  number,
 * }}
 */
export function analyzeText(text) {
  if (!text || text.trim().length === 0) {
    return _emptyFingerprint();
  }

  const sentences  = splitSentences(text);
  const words      = splitWords(text);
  const paragraphs = splitParagraphs(text);
  const lowerText  = text.toLowerCase();

  const totalSentences  = sentences.length  || 1;
  const totalWords      = words.length       || 1;
  const totalChars      = text.length        || 1;
  const totalParagraphs = paragraphs.length  || 1;

  // --- avgSentenceLength: mean words per sentence ---
  const wordCounts = sentences.map(s => splitWords(s).length);
  const avgSentenceLength = wordCounts.reduce((a, b) => a + b, 0) / totalSentences;

  // --- avgWordLength: mean characters per word token ---
  const totalWordChars = words.reduce((acc, w) => acc + w.length, 0);
  const avgWordLength = totalWordChars / totalWords;

  // --- vocabularyRichness: Type-Token Ratio (unique / total) ---
  const uniqueWords = new Set(words).size;
  const vocabularyRichness = uniqueWords / totalWords;

  // --- longWordRatio: fraction of words with 7+ characters ---
  const longWords = words.filter(w => w.length >= 7).length;
  const longWordRatio = longWords / totalWords;

  // --- punctuationDensity: punctuation marks / total characters ---
  const punctuationMatches = text.match(/[.,;:!?«»""''()\-–—]/g) || [];
  const punctuationDensity = punctuationMatches.length / totalChars;

  // --- connectorDensity: logical connector occurrences / total words ---
  const connectorCount = countPhrases(lowerText, FR_CONNECTORS);
  const connectorDensity = connectorCount / totalWords;

  // --- questionRatio: sentences ending in '?' / total sentences ---
  const questionSentences = sentences.filter(s => s.trimEnd().endsWith('?')).length;
  const questionRatio = questionSentences / totalSentences;

  // --- avgParagraphLength: mean sentences per paragraph ---
  const sentencesPerParagraph = paragraphs.map(p => splitSentences(p).length);
  const avgParagraphLength =
    sentencesPerParagraph.reduce((a, b) => a + b, 0) / totalParagraphs;

  // --- formalityScore: 0-1 ---
  // Combines connector density, long-word ratio, and low question usage.
  // All three sub-scores are clamped to [0, 1] then averaged.
  const formalConnectorScore = Math.min(connectorDensity / 0.06, 1);   // ~6% connector rate = max
  const formalLexiconScore   = Math.min(longWordRatio   / 0.40, 1);   // ~40% long-word rate = max
  const formalToneScore      = 1 - Math.min(questionRatio / 0.20, 1); // fewer questions = more formal
  const formalityScore = (formalConnectorScore + formalLexiconScore + formalToneScore) / 3;

  // --- argumentStructure: 0-1 ---
  // Fraction of argument signal phrases present relative to a "maximum expected" density.
  const signalCount = countPhrases(lowerText, FR_ARGUMENT_SIGNALS);
  // Normalise: treat 1 signal per 50 words as a score of 1.0.
  const argumentStructure = Math.min(signalCount / (totalWords / 50), 1);

  return {
    avgSentenceLength:  _round(avgSentenceLength),
    avgWordLength:      _round(avgWordLength),
    vocabularyRichness: _round(vocabularyRichness),
    longWordRatio:      _round(longWordRatio),
    punctuationDensity: _round(punctuationDensity),
    connectorDensity:   _round(connectorDensity),
    questionRatio:      _round(questionRatio),
    avgParagraphLength: _round(avgParagraphLength),
    formalityScore:     _round(formalityScore),
    argumentStructure:  _round(argumentStructure),
  };
}

// ---------------------------------------------------------------------------
// 3. FINGERPRINT COMPARISON
// ---------------------------------------------------------------------------

/**
 * Per-dimension weights for the divergence calculation.
 * Higher weight = dimension matters more in the final distance score.
 * Weights are internally normalised, so absolute values only matter relatively.
 */
const DIMENSION_WEIGHTS = {
  avgSentenceLength:  2.0,  // strong stylistic signal
  avgWordLength:      1.5,
  vocabularyRichness: 2.0,  // strong AI signal
  longWordRatio:      1.5,
  punctuationDensity: 1.0,
  connectorDensity:   1.5,
  questionRatio:      1.0,
  avgParagraphLength: 1.0,
  formalityScore:     2.0,  // strong AI signal
  argumentStructure:  2.0,  // strong AI signal
};

/**
 * Expected natural ranges for each dimension used to normalise raw differences.
 * A difference equal to `range` yields a normalised value of 1.0.
 */
const DIMENSION_RANGES = {
  avgSentenceLength:  40,    // words
  avgWordLength:      4,     // chars
  vocabularyRichness: 1,     // 0-1
  longWordRatio:      1,     // 0-1
  punctuationDensity: 0.15,  // 0-~0.15
  connectorDensity:   0.15,
  questionRatio:      1,     // 0-1
  avgParagraphLength: 10,    // sentences
  formalityScore:     1,     // 0-1
  argumentStructure:  1,     // 0-1
};

/**
 * Computes a weighted divergence score between two fingerprints.
 *
 * @param {ReturnType<analyzeText>} fp1
 * @param {ReturnType<analyzeText>} fp2
 * @returns {number} value in [0, 1] — 0 = identical style, 1 = completely different
 */
export function compareFingerprints(fp1, fp2) {
  const dimensions = Object.keys(DIMENSION_WEIGHTS);
  const totalWeight = dimensions.reduce((s, k) => s + DIMENSION_WEIGHTS[k], 0);

  let weightedSumSq = 0;

  for (const dim of dimensions) {
    const diff       = (fp1[dim] ?? 0) - (fp2[dim] ?? 0);
    const range      = DIMENSION_RANGES[dim] || 1;
    const normalised = Math.min(Math.abs(diff) / range, 1); // clamp to [0, 1]
    const weight     = DIMENSION_WEIGHTS[dim];
    weightedSumSq   += weight * (normalised ** 2);
  }

  // Weighted Euclidean distance, normalised to [0, 1].
  const rawDistance = Math.sqrt(weightedSumSq / totalWeight);
  return _round(Math.min(rawDistance, 1));
}

// ---------------------------------------------------------------------------
// 4. USER FINGERPRINT MANAGEMENT  (localStorage-based)
// ---------------------------------------------------------------------------

/**
 * Reads the fingerprint store from localStorage.
 * @returns {Object} map of userId → { fingerprint, sampleCount }
 */
function _loadStore() {
  try {
    const raw = localStorage.getItem(LS_FINGERPRINTS);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

/**
 * Persists the fingerprint store to localStorage.
 * @param {Object} store
 */
function _saveStore(store) {
  try {
    localStorage.setItem(LS_FINGERPRINTS, JSON.stringify(store));
  } catch {
    // localStorage may be unavailable (SSR, private browsing quota exceeded, etc.)
  }
}

/**
 * Returns the stored style fingerprint for a given user, or null if none exists.
 *
 * @param {string} userId
 * @returns {{ fingerprint: ReturnType<analyzeText>, sampleCount: number } | null}
 */
export function getUserFingerprint(userId) {
  const store = _loadStore();
  return store[userId] ?? null;
}

/**
 * Updates the rolling-average fingerprint for a user with a new text sample.
 * Uses an exponential moving average capped at MAX_SAMPLES contributions.
 * Ignores samples shorter than MIN_TEXT_LENGTH characters.
 *
 * @param {string} userId
 * @param {string} text
 */
export function updateUserFingerprint(userId, text) {
  if (!text || text.length < MIN_TEXT_LENGTH) return;

  const newFp  = analyzeText(text);
  const store  = _loadStore();
  const entry  = store[userId];

  if (!entry) {
    // First sample — store as-is.
    store[userId] = { fingerprint: newFp, sampleCount: 1 };
  } else {
    const n       = Math.min(entry.sampleCount, MAX_SAMPLES);
    const alpha   = 1 / (n + 1); // weight for the new sample
    const oldFp   = entry.fingerprint;
    const blended = {};

    for (const key of Object.keys(newFp)) {
      blended[key] = _round(oldFp[key] * (1 - alpha) + newFp[key] * alpha);
    }

    store[userId] = {
      fingerprint:  blended,
      sampleCount:  Math.min(n + 1, MAX_SAMPLES),
    };
  }

  _saveStore(store);
}

/**
 * Returns all stored user fingerprint entries.
 *
 * @returns {Object} map of userId → { fingerprint, sampleCount }
 */
export function getAllFingerprints() {
  return _loadStore();
}

// ---------------------------------------------------------------------------
// 5. SUSPICION SCORING
// ---------------------------------------------------------------------------

/**
 * Evaluates how many AI pattern thresholds are exceeded by a fingerprint.
 * Returns a score in [0, 1] proportional to the number of triggered patterns.
 *
 * @param {ReturnType<analyzeText>} fp
 * @returns {number} 0-1
 */
function _aiPatternScore(fp) {
  let triggered = 0;
  const checks = [
    fp.vocabularyRichness > AI_PATTERN_THRESHOLDS.vocabularyRichness,
    fp.avgSentenceLength  > AI_PATTERN_THRESHOLDS.avgSentenceLength,
    fp.formalityScore     > AI_PATTERN_THRESHOLDS.formalityScore,
    fp.argumentStructure  > AI_PATTERN_THRESHOLDS.argumentStructure,
  ];
  for (const hit of checks) if (hit) triggered++;
  return triggered / checks.length; // 0, 0.25, 0.5, 0.75, or 1.0
}

/**
 * Computes an AI-assistance suspicion score for a specific user and text.
 *
 * Algorithm:
 *  1. Retrieve user's historical fingerprint (if none exists, rely on AI patterns only).
 *  2. Analyse the current text.
 *  3. Compute divergence from historical fingerprint.
 *  4. Compute AI pattern score independently.
 *  5. Combine: 60 % divergence + 40 % AI patterns (when history exists);
 *              100 % AI patterns (when no history yet).
 *  6. Scale to 0-100.
 *
 * @param {string} userId
 * @param {string} currentText
 * @returns {number} integer in [0, 100]
 */
export function getSuspicionScore(userId, currentText) {
  if (!currentText || currentText.trim().length === 0) return 0;

  const currentFp   = analyzeText(currentText);
  const aiPatterns  = _aiPatternScore(currentFp);
  const userRecord  = getUserFingerprint(userId);

  let rawScore;

  if (!userRecord || userRecord.sampleCount < 3) {
    // Not enough history — use only AI pattern heuristics.
    rawScore = aiPatterns;
  } else {
    const divergence = compareFingerprints(userRecord.fingerprint, currentFp);
    rawScore = divergence * 0.60 + aiPatterns * 0.40;
  }

  return Math.round(Math.min(rawScore * 100, 100));
}

/**
 * Maps a suspicion score (0-100) to a human-readable French label.
 *
 * @param {number} score
 * @returns {'Normal' | 'Surveillance' | 'Suspect' | 'Très suspect'}
 */
export function getSuspicionLabel(score) {
  if (score <= 30) return 'Normal';
  if (score <= 60) return 'Surveillance';
  if (score <= 80) return 'Suspect';
  return 'Très suspect';
}

// ---------------------------------------------------------------------------
// 6. BATTLE ANALYSIS
// ---------------------------------------------------------------------------

/**
 * Analyses all argument entries in a battle and returns per-player suspicion data.
 *
 * @param {Array<{ id: string, side: 'A'|'B', raw: string, formalized?: string }>} entries
 * @param {string} userIdA  — userId of player A
 * @param {string} userIdB  — userId of player B
 * @returns {{
 *   A: { score: number, label: string, avgDivergence: number },
 *   B: { score: number, label: string, avgDivergence: number },
 * }}
 */
export function analyzeBattleSuspicion(entries, userIdA, userIdB) {
  /**
   * Processes one side of the battle.
   * @param {'A'|'B'} side
   * @param {string}  userId
   */
  function processSide(side, userId) {
    const sideEntries = entries.filter(e => e.side === side);

    if (sideEntries.length === 0) {
      return { score: 0, label: 'Normal', avgDivergence: 0 };
    }

    const userRecord   = getUserFingerprint(userId);
    const fingerprints = sideEntries.map(e => analyzeText(e.raw || e.formalized || ''));

    // Average divergence from stored fingerprint (or 0 if no history).
    let avgDivergence = 0;
    if (userRecord && userRecord.sampleCount >= 3) {
      const divergences = fingerprints.map(fp =>
        compareFingerprints(userRecord.fingerprint, fp)
      );
      avgDivergence = divergences.reduce((a, b) => a + b, 0) / divergences.length;
    }

    // Use the combined text of all entries for a single suspicion score.
    const combinedText = sideEntries.map(e => e.raw || e.formalized || '').join('\n\n');
    const score        = getSuspicionScore(userId, combinedText);
    const label        = getSuspicionLabel(score);

    return { score, label, avgDivergence: _round(avgDivergence) };
  }

  return {
    A: processSide('A', userIdA),
    B: processSide('B', userIdB),
  };
}

// ---------------------------------------------------------------------------
// 7. ADMIN / FLAG MANAGEMENT
// ---------------------------------------------------------------------------

/**
 * Loads the suspicion flag store from localStorage.
 * @returns {Object} map of userId → Array<{ battleId, score, label, timestamp }>
 */
function _loadFlags() {
  try {
    const raw = localStorage.getItem(LS_FLAGS);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

/**
 * Persists the suspicion flag store to localStorage.
 * @param {Object} flagStore
 */
function _saveFlags(flagStore) {
  try {
    localStorage.setItem(LS_FLAGS, JSON.stringify(flagStore));
  } catch {
    // Silent fail — same as fingerprint store.
  }
}

/**
 * Records a suspicion flag for a specific battle and user.
 *
 * @param {string} battleId
 * @param {string} userId
 * @param {number} score
 * @param {string} label
 */
export function recordSuspicionFlag(battleId, userId, score, label) {
  const flags = _loadFlags();
  if (!flags[userId]) flags[userId] = [];

  flags[userId].push({
    battleId,
    score,
    label,
    timestamp: new Date().toISOString(),
  });

  _saveFlags(flags);
}

/**
 * Returns all suspicion flags recorded for a given user.
 *
 * @param {string} userId
 * @returns {Array<{ battleId: string, score: number, label: string, timestamp: string }>}
 */
export function getUserFlags(userId) {
  const flags = _loadFlags();
  return flags[userId] ?? [];
}

/**
 * Returns flagged users (suspicion score >= 31) for admin display.
 * Aggregates fingerprint data and flag history per user.
 *
 * @returns {Array<{
 *   userId:         string,
 *   suspicionScore: number,
 *   label:          string,
 *   flaggedBattles: Array<{ battleId: string, score: number, label: string, timestamp: string }>,
 * }>}
 */
export function getFlaggedUsers() {
  const store     = _loadStore();
  const flags     = _loadFlags();
  const results   = [];

  for (const [userId, entry] of Object.entries(store)) {
    // Estimate current suspicion from stored fingerprint via AI pattern check.
    const fp    = entry.fingerprint;
    const score = Math.round(_aiPatternScore(fp) * 100);

    if (score < 31) continue; // Below monitoring threshold — skip.

    results.push({
      userId,
      suspicionScore:  score,
      label:           getSuspicionLabel(score),
      flaggedBattles:  flags[userId] ?? [],
    });
  }

  // Sort descending by suspicion score.
  results.sort((a, b) => b.suspicionScore - a.suspicionScore);
  return results;
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/**
 * Returns a fingerprint where every dimension is zero.
 * Used as a safe default for empty inputs.
 * @returns {ReturnType<analyzeText>}
 */
function _emptyFingerprint() {
  return {
    avgSentenceLength:  0,
    avgWordLength:      0,
    vocabularyRichness: 0,
    longWordRatio:      0,
    punctuationDensity: 0,
    connectorDensity:   0,
    questionRatio:      0,
    avgParagraphLength: 0,
    formalityScore:     0,
    argumentStructure:  0,
  };
}

/**
 * Rounds a number to 4 decimal places for storage/comparison consistency.
 * @param {number} n
 * @returns {number}
 */
function _round(n) {
  return Math.round(n * 10000) / 10000;
}
