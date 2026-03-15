// ═══════════════════════════════════════════════════════════════════════════════
// DIALECTIX AI — debateRules.js
// ═══════════════════════════════════════════════════════════════════════════════
// ENGINEERING PRINCIPLE: "Prepare systems without activating them."
//
// Pure data — no logic, no imports, no side effects.
// This file defines structured debate formats for future use by:
//   • TournamentMatchEngine (not yet built)
//   • Debate phase display in UI
//   • AI prompt phase injection in generateAIArgument
//   • Round timer logic
//
// Existing Arena round logic is untouched.
// This is an additive catalog, not a replacement.
// ═══════════════════════════════════════════════════════════════════════════════

// ─── DEBATE PHASES ────────────────────────────────────────────────────────────
// A "phase" is a named segment of a structured debate.
// Each phase has a label, time limit, word limit, and behavioral notes.
//
export const DEBATE_PHASES = {
  opening: {
    id:          'opening',
    label:       'Ouverture',
    labelEn:     'Opening Statement',
    exchangeIndex: 0,             // corresponds to exchanges === 0 in Arena
    timeLimitSec: 90,             // 90 seconds to deliver
    wordLimit:    150,
    description: 'Présente ta position centrale et ton angle d\'attaque principal.',
    promptHint:  'This is your opening statement. Establish your core position clearly and compellingly. Set the frame for the entire debate.',
    aiWeight:    'establish',     // AI should establish, not refute
  },

  argument: {
    id:          'argument',
    label:       'Argument',
    labelEn:     'Main Argument',
    exchangeIndex: 1,             // corresponds to exchanges === 1 in Arena
    timeLimitSec: 75,
    wordLimit:    130,
    description: 'Développe ton argument principal avec preuves et logique.',
    promptHint:  'Develop your main argument. Support it with reasoning, evidence, or examples. Build momentum.',
    aiWeight:    'develop',
  },

  refutation: {
    id:          'refutation',
    label:       'Réfutation',
    labelEn:     'Rebuttal',
    exchangeIndex: 2,             // corresponds to exchanges >= 2 in Arena
    timeLimitSec: 60,
    wordLimit:    110,
    description: 'Démonte l\'argument adverse. Identifie la faille centrale.',
    promptHint:  'Directly address and dismantle your opponent\'s argument. Identify the core weakness. Do not just reassert your own position.',
    aiWeight:    'refute',
  },

  closing: {
    id:          'closing',
    label:       'Conclusion',
    labelEn:     'Closing Statement',
    exchangeIndex: 3,
    timeLimitSec: 60,
    wordLimit:    100,
    description: 'Synthèse finale. Pourquoi tu as gagné ce débat.',
    promptHint:  'Deliver your closing statement. Summarize why your position prevailed. Leave a strong final impression.',
    aiWeight:    'conclude',
  },
};

// ─── DEBATE FORMATS ───────────────────────────────────────────────────────────
// A "format" is a named sequence of phases that structures a complete debate.
// Formats are referenced by tournament type.
//
export const DEBATE_FORMATS = {
  // Standard format: used by Arena (maps to current exchange-based flow)
  standard: {
    id:          'standard',
    label:       'Arène Standard',
    description: '3 échanges. Ouverture, Argument, Réfutation.',
    phases:      ['opening', 'argument', 'refutation'],
    maxExchanges: 3,
    scoringModel: 'elo_delta',   // uses ARENA_ELO_DELTA — existing system
  },

  // Extended format: 4 phases including closing — for future tournament use
  extended: {
    id:          'extended',
    label:       'Tournoi Étendu',
    description: '4 rounds. Ouverture, Argument, Réfutation, Conclusion.',
    phases:      ['opening', 'argument', 'refutation', 'closing'],
    maxExchanges: 4,
    scoringModel: 'tournament_points',  // future: uses season_points
  },

  // Speed format: fast debates, word limits cut in half
  speed: {
    id:          'speed',
    label:       'Débat Éclair',
    description: 'Format rapide. 2 échanges. Idéal pour la pratique.',
    phases:      ['opening', 'refutation'],
    maxExchanges: 2,
    scoringModel: 'elo_delta',
  },
};

// ─── SCORING MODELS ───────────────────────────────────────────────────────────
// Describes how points/ELO are awarded per format.
// Actual calculation lives in Arena (existing) or a future TournamentMatchEngine.
//
export const SCORING_MODELS = {
  elo_delta: {
    id:          'elo_delta',
    label:       'ELO Delta',
    description: 'Points ELO calculés selon la différence de rang.',
    win:          +15,
    loss:         -12,
    draw:         +3,
    // These mirror ARENA_ELO_DELTA — do NOT change here without syncing App.jsx
  },

  tournament_points: {
    id:          'tournament_points',
    label:       'Points Tournoi',
    description: 'Points fixes attribués par victoire en tournoi.',
    win:          50,
    loss:         10,
    draw:         25,
    // These are future values — not yet active
  },
};

// ─── PHASE DETECTION HELPER ───────────────────────────────────────────────────
// Given an exchange count (0-based), returns the matching DEBATE_PHASE.
// Mirrors the debatePhase detection in generateAIArgument (arenaUtils.js).
// Can be used by UI to display the current phase label.
//
export function getPhaseForExchange(exchangeCount) {
  if (exchangeCount === 0) return DEBATE_PHASES.opening;
  if (exchangeCount === 1) return DEBATE_PHASES.argument;
  if (exchangeCount === 2) return DEBATE_PHASES.refutation;
  return DEBATE_PHASES.closing;
}

// ─── FORMAT LOOKUP ────────────────────────────────────────────────────────────
// Safe accessor — returns the format or falls back to 'standard'.
//
export function getFormat(formatId) {
  return DEBATE_FORMATS[formatId] ?? DEBATE_FORMATS.standard;
}
