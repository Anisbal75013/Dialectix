/**
 * CheckmateSystem.jsx — Dialectix
 *
 * Three exports:
 *   isCheckmate(entry)          — utility predicate
 *   getCheckmateType(entry)     — utility classifier
 *   CheckmateOverlay (default)  — full-screen dramatic reveal
 *   CheckmateBadge              — inline transcript badge
 */

import { useEffect, useRef } from 'react';

/* ─── CSS KEYFRAMES (injected once) ─────────────────────────────────────── */

const CHECKMATE_STYLES = `
@keyframes checkmate-flash {
  0%   { background: rgba(0,0,0,.78); }
  8%   { background: rgba(255,255,255,.92); }
  18%  { background: rgba(0,0,0,.85); }
  28%  { background: rgba(255,240,180,.18); }
  100% { background: rgba(0,0,0,.82); }
}

@keyframes checkmate-text {
  0%   { transform: scale(.3)  rotate(-6deg); opacity: 0; }
  55%  { transform: scale(1.1) rotate(1.5deg); opacity: 1; }
  72%  { transform: scale(.97) rotate(-.5deg); opacity: 1; }
  84%  { transform: scale(1.03) rotate(.25deg); opacity: 1; }
  100% { transform: scale(1)   rotate(0deg);  opacity: 1; }
}

@keyframes checkmate-glow {
  0%,100% {
    text-shadow:
      0 0  12px rgba(198,161,91,.55),
      0 0  28px rgba(198,161,91,.35),
      0 0  60px rgba(198,161,91,.18);
  }
  50% {
    text-shadow:
      0 0  20px rgba(230,195,110,.85),
      0 0  50px rgba(198,161,91,.65),
      0 0 100px rgba(198,161,91,.35);
  }
}

@keyframes lightning-bolt {
  0%,100% { transform: scale(1)    rotate(0deg);   filter: drop-shadow(0 0 8px rgba(255,230,80,.7));  }
  20%     { transform: scale(1.35) rotate(-8deg);  filter: drop-shadow(0 0 24px rgba(255,230,80,1));  }
  40%     { transform: scale(.9)   rotate(6deg);   filter: drop-shadow(0 0 12px rgba(255,230,80,.8)); }
  60%     { transform: scale(1.2)  rotate(-4deg);  filter: drop-shadow(0 0 20px rgba(255,230,80,.95));}
  80%     { transform: scale(.95)  rotate(2deg);   filter: drop-shadow(0 0 10px rgba(255,230,80,.7)); }
}

@keyframes cm-vignette-in {
  from { opacity: 0; }
  to   { opacity: 1; }
}

@keyframes cm-card-rise {
  0%   { transform: translateY(48px) scale(.88); opacity: 0; }
  60%  { transform: translateY(-6px) scale(1.02); opacity: 1; }
  80%  { transform: translateY(3px)  scale(.99);  opacity: 1; }
  100% { transform: translateY(0)    scale(1);    opacity: 1; }
}

@keyframes cm-score-pop {
  0%   { transform: scale(0) rotate(-18deg); opacity: 0; }
  65%  { transform: scale(1.18) rotate(2deg); opacity: 1; }
  82%  { transform: scale(.94) rotate(-.5deg); opacity: 1; }
  100% { transform: scale(1) rotate(0deg); opacity: 1; }
}

@keyframes cm-elo-slide {
  from { transform: translateX(20px); opacity: 0; }
  to   { transform: translateX(0);    opacity: 1; }
}

@keyframes cm-type-label {
  0%   { letter-spacing: .6em; opacity: 0; }
  100% { letter-spacing: .18em; opacity: 1; }
}

@keyframes cm-dismiss-hint {
  0%,75% { opacity: 0; }
  100%   { opacity: .42; }
}

@media (prefers-reduced-motion: reduce) {
  .cm-overlay      { animation: none !important; background: rgba(0,0,0,.88) !important; }
  .cm-title        { animation: none !important; }
  .cm-lightning    { animation: none !important; }
  .cm-card         { animation: none !important; opacity: 1; transform: none; }
  .cm-score-badge  { animation: none !important; opacity: 1; transform: none; }
  .cm-elo-badge    { animation: none !important; opacity: 1; }
  .cm-type-label   { animation: none !important; opacity: 1; letter-spacing: .18em; }
}
`;

let _stylesInjected = false;
function ensureStyles() {
  if (_stylesInjected) return;
  const el = document.createElement('style');
  el.setAttribute('data-dialectix-cm', '1');
  el.textContent = CHECKMATE_STYLES;
  document.head.appendChild(el);
  _stylesInjected = true;
}

/* ─── UTILITY FUNCTIONS ──────────────────────────────────────────────────── */

/**
 * Returns true if an entry qualifies as a checkmate argument.
 * Threshold: overall_score >= 9.0 (stricter than "decisive" which is >= 7.5).
 */
/**
 * Returns true if an entry qualifies as a checkmate argument.
 * Rules:
 *   1. entry.overall_score >= 9.0 (dominant argument)
 *   2. opponentScore <= 5 (opponent is clearly losing)
 * Both conditions must be met simultaneously.
 *
 * @param {object} entry         — scored argument entry
 * @param {number} opponentScore — opponent's current weighted score (from gScore)
 */
export function isCheckmate(entry, opponentScore = null) {
  if (!entry || entry.overall_score == null) return false;
  const strongEntry = (+entry.overall_score) >= 9.0;
  // If opponent score is provided, require double condition
  if (opponentScore !== null) {
    return strongEntry && (+opponentScore) <= 5;
  }
  // Fallback: single condition (backward compatibility)
  return strongEntry;
}

/**
 * Classifies the checkmate type based on analysis text keywords.
 * Supports French keywords found in AI analysis responses.
 */
export function getCheckmateType(entry) {
  const analysis = (entry.analysis || '').toLowerCase();
  if (analysis.includes('contradiction') || analysis.includes('contredit'))
    return 'contradiction';
  if (
    analysis.includes('irréfutable') ||
    analysis.includes('preuve')      ||
    analysis.includes('démontré')
  ) return 'preuve';
  if (
    analysis.includes('réfutation') ||
    analysis.includes('démonte')    ||
    analysis.includes('invalide')
  ) return 'réfutation';
  return 'décisif';
}

const CHECKMATE_LABELS = {
  contradiction: 'CONTRADICTION DÉMONTRÉE',
  preuve:        'PREUVE IRRÉFUTABLE',
  réfutation:    'RÉFUTATION COMPLÈTE',
  décisif:       'ARGUMENT DÉCISIF',
};

/* ─── CHECKMATE OVERLAY ──────────────────────────────────────────────────── */

/**
 * CheckmateOverlay
 *
 * Full-screen dramatic reveal when a checkmate argument is detected.
 *
 * Props:
 *   active      boolean   — whether the overlay is shown
 *   entry       object    — the debate entry (for score + type)
 *   winnerName  string    — display name of the winner
 *   onDismiss   function  — called when dismissed
 */
export default function CheckmateOverlay({ active, entry, winnerName, onDismiss }) {
  const timerRef = useRef(null);

  useEffect(() => {
    ensureStyles();
  }, []);

  useEffect(() => {
    if (!active) return;
    timerRef.current = setTimeout(() => {
      onDismiss && onDismiss();
    }, 4000);
    return () => clearTimeout(timerRef.current);
  }, [active, onDismiss]);

  if (!active || !entry) return null;

  const type      = getCheckmateType(entry);
  const typeLabel = CHECKMATE_LABELS[type] || CHECKMATE_LABELS.décisif;
  const score     = entry.overall_score != null
    ? (+entry.overall_score).toFixed(1)
    : '9.0';
  const name      = winnerName || (entry.side === 'A' ? 'Côté A' : 'Côté B');

  return (
    <div
      className="cm-overlay"
      onClick={() => { clearTimeout(timerRef.current); onDismiss && onDismiss(); }}
      style={{
        position:       'fixed',
        inset:          0,
        zIndex:         9999,
        display:        'flex',
        alignItems:     'center',
        justifyContent: 'center',
        flexDirection:  'column',
        cursor:         'pointer',
        animation:      'checkmate-flash .55s ease forwards',
        background:     'rgba(0,0,0,.82)',
        /* gold vignette via radial overlay */
        backgroundImage:
          'radial-gradient(ellipse at 50% 40%, rgba(198,161,91,.14) 0%, rgba(0,0,0,0) 65%)',
        WebkitTapHighlightColor: 'transparent',
      }}
    >
      {/* ── Vignette ring ─────────────────────────────────────────────────── */}
      <div style={{
        position:      'fixed',
        inset:         0,
        pointerEvents: 'none',
        background:    'radial-gradient(ellipse at 50% 50%, transparent 30%, rgba(0,0,0,.65) 100%)',
        animation:     'cm-vignette-in .4s ease forwards',
      }}/>

      {/* ── Lightning bolt ────────────────────────────────────────────────── */}
      <div
        className="cm-lightning"
        style={{
          fontSize:   '4.5rem',
          lineHeight: 1,
          marginBottom: 8,
          animation: 'lightning-bolt 1.2s ease-in-out infinite',
          willChange: 'transform, filter',
        }}
      >
        ⚡
      </div>

      {/* ── CHECKMATE title ───────────────────────────────────────────────── */}
      <div
        className="cm-title"
        style={{
          fontFamily:    'var(--fH)',
          fontSize:      'clamp(2.6rem, 7vw, 4rem)',
          fontWeight:    700,
          color:         'var(--Y, #C6A15B)',
          letterSpacing: '.12em',
          textTransform: 'uppercase',
          animation:     'checkmate-text .7s cubic-bezier(.22,1,.36,1) .05s both, checkmate-glow 2s ease-in-out .75s infinite',
          willChange:    'transform, text-shadow',
          userSelect:    'none',
        }}
      >
        CHECKMATE
      </div>

      {/* ── Type label ────────────────────────────────────────────────────── */}
      <div
        className="cm-type-label"
        style={{
          fontFamily:    'var(--fM, serif)',
          fontSize:      '.78rem',
          color:         'rgba(198,161,91,.88)',
          letterSpacing: '.18em',
          textTransform: 'uppercase',
          marginTop:     6,
          animation:     'cm-type-label .6s cubic-bezier(.22,1,.36,1) .5s both',
        }}
      >
        {typeLabel}
      </div>

      {/* ── Card ──────────────────────────────────────────────────────────── */}
      <div
        className="cm-card"
        style={{
          marginTop:    28,
          background:   'rgba(20,16,10,.88)',
          border:       '1px solid rgba(198,161,91,.35)',
          borderRadius: 14,
          padding:      '22px 36px',
          textAlign:    'center',
          animation:    'cm-card-rise .65s cubic-bezier(.22,1,.36,1) .35s both',
          boxShadow:    '0 0 48px 0 rgba(198,161,91,.12), 0 8px 32px rgba(0,0,0,.55)',
          minWidth:     280,
          maxWidth:     440,
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Winner line */}
        <div style={{
          fontFamily: 'var(--fB, sans-serif)',
          fontSize:   '1rem',
          color:      '#f5ecd8',
          lineHeight: 1.45,
          marginBottom: 18,
        }}>
          <span style={{ color: 'var(--Y, #C6A15B)', fontFamily: 'var(--fH)', fontWeight: 600 }}>
            {name}
          </span>
          {' '}a détruit l'argument adverse
        </div>

        {/* Score + ELO row */}
        <div style={{
          display:        'flex',
          alignItems:     'center',
          justifyContent: 'center',
          gap:            14,
          marginBottom:   20,
        }}>
          {/* Score badge */}
          <div
            className="cm-score-badge"
            style={{
              background:   'rgba(198,161,91,.15)',
              border:       '1.5px solid rgba(198,161,91,.6)',
              borderRadius: 10,
              padding:      '8px 18px',
              animation:    'cm-score-pop .55s cubic-bezier(.34,1.56,.64,1) .6s both',
            }}
          >
            <div style={{
              fontFamily: 'var(--fH)',
              fontSize:   '1.9rem',
              color:      'var(--Y, #C6A15B)',
              lineHeight: 1,
              fontWeight: 700,
            }}>
              {score}
            </div>
            <div style={{
              fontFamily: 'var(--fM)',
              fontSize:   '.52rem',
              color:      'rgba(198,161,91,.65)',
              letterSpacing: '.1em',
              marginTop:  3,
            }}>
              / 10
            </div>
          </div>

          {/* ELO bonus badge */}
          <div
            className="cm-elo-badge"
            style={{
              background:   'rgba(198,161,91,.22)',
              border:       '1.5px solid rgba(198,161,91,.55)',
              borderRadius: 20,
              padding:      '7px 16px',
              fontFamily:   'var(--fH)',
              fontSize:     '.75rem',
              color:        'var(--Y, #C6A15B)',
              fontWeight:   600,
              letterSpacing: '.08em',
              animation:    'cm-elo-slide .45s cubic-bezier(.22,1,.36,1) .8s both',
            }}
          >
            +5 BONUS ELO
          </div>
        </div>

        {/* Divider */}
        <div style={{
          height:     1,
          background: 'rgba(198,161,91,.2)',
          marginBottom: 18,
        }}/>

        {/* Dismiss button */}
        <button
          onClick={() => { clearTimeout(timerRef.current); onDismiss && onDismiss(); }}
          style={{
            fontFamily:    'var(--fH)',
            fontSize:      '.72rem',
            letterSpacing: '.1em',
            textTransform: 'uppercase',
            padding:       '10px 32px',
            borderRadius:  8,
            border:        '1px solid rgba(198,161,91,.5)',
            background:    'transparent',
            color:         'var(--Y, #C6A15B)',
            cursor:        'pointer',
            transition:    'background .18s, color .18s',
          }}
          onMouseEnter={e => {
            e.currentTarget.style.background = 'rgba(198,161,91,.18)';
            e.currentTarget.style.color = '#f5ecd8';
          }}
          onMouseLeave={e => {
            e.currentTarget.style.background = 'transparent';
            e.currentTarget.style.color = 'var(--Y, #C6A15B)';
          }}
        >
          Continuer
        </button>
      </div>

      {/* ── Auto-dismiss hint ─────────────────────────────────────────────── */}
      <div style={{
        position:   'fixed',
        bottom:     24,
        left:       0,
        right:      0,
        textAlign:  'center',
        fontFamily: 'var(--fM)',
        fontSize:   '.52rem',
        color:      'rgba(255,255,255,.4)',
        letterSpacing: '.06em',
        animation:  'cm-dismiss-hint 4s ease forwards',
        pointerEvents: 'none',
      }}>
        Cliquez n'importe où pour continuer
      </div>
    </div>
  );
}

/* ─── CHECKMATE BADGE (inline transcript) ────────────────────────────────── */

/**
 * CheckmateBadge
 *
 * Small inline badge rendered next to a checkmate argument in the report/transcript.
 *
 * Props:
 *   type  string  — one of: 'contradiction' | 'preuve' | 'réfutation' | 'décisif'
 */
export function CheckmateBadge({ type }) {
  const label = CHECKMATE_LABELS[type] || CHECKMATE_LABELS.décisif;

  return (
    <span style={{
      display:        'inline-flex',
      alignItems:     'center',
      gap:            5,
      padding:        '3px 9px',
      borderRadius:   5,
      border:         '1px solid rgba(198,161,91,.65)',
      background:     'rgba(20,16,10,.85)',
      fontFamily:     'var(--fH)',
      fontSize:       '.54rem',
      color:          'var(--Y, #C6A15B)',
      letterSpacing:  '.08em',
      textTransform:  'uppercase',
      verticalAlign:  'middle',
      whiteSpace:     'nowrap',
      boxShadow:      '0 0 8px rgba(198,161,91,.18)',
      lineHeight:     1,
    }}>
      <span style={{ fontSize: '.75rem', lineHeight: 1 }}>⚡</span>
      <span>CHECKMATE</span>
      <span style={{ color: 'rgba(198,161,91,.6)', margin: '0 1px' }}>—</span>
      <span style={{ color: '#f5ecd8', letterSpacing: '.04em' }}>{label}</span>
    </span>
  );
}
