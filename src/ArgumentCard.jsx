/**
 * ArgumentCard.jsx
 *
 * Enhanced debate-argument entry card.
 *
 * Wraps the existing entry layout (.entry, .emeta, .etext, …) with
 * Breakthrough animation effects — no scoring logic is touched.
 *
 * Props:
 *   entry         object   — debate entry ({ id, side, formalized, raw,
 *                            time, type, overall_score, decisive, … })
 *   side          'A'|'B'  — which speaker this card belongs to
 *   name          string   — speaker display name
 *   defeatedId    string   — id of the entry currently being "defeated"
 *                            (receives shake + crack overlay)
 *   scoreDisplay  ReactNode — <ArgScoreDisplay> passed from App.jsx
 *                             (keeps ArgScoreDisplay in its original scope)
 */

import { useEffect, useRef, useState } from 'react';
import BreakthroughAnimation from './animations/BreakthroughAnimation.jsx';
import './styles/animations.css';

/* ─── Local time formatter (mirrors App.jsx fmt) ────────────────────────────── */
const fmtTime = s =>
  `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;

/* ─── Animated score number ─────────────────────────────────────────────────── */
function AnimatedScore({ value, color }) {
  const [displayed, setDisplayed] = useState(value);
  const [bumped,    setBumped]    = useState(false);
  const prev                      = useRef(value);

  useEffect(() => {
    if (value == null) return;
    if (prev.current !== value) {
      prev.current = value;
      setBumped(true);
      // Count-up from previous to new value over 600 ms
      const from     = parseFloat(displayed ?? 0);
      const to       = parseFloat(value);
      const steps    = 12;
      const interval = 600 / steps;
      let  step      = 0;
      const id       = setInterval(() => {
        step++;
        const progress = step / steps;
        const eased    = 1 - Math.pow(1 - progress, 3); // easeOutCubic
        setDisplayed((from + (to - from) * eased).toFixed(1));
        if (step >= steps) { clearInterval(id); setDisplayed(to.toFixed(1)); setBumped(false); }
      }, interval);
      return () => clearInterval(id);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  if (value == null) return null;

  return (
    <span
      className={bumped ? 'btk-score-new' : ''}
      style={{
        fontFamily:    'var(--fH, serif)',
        fontSize:      '.92rem',
        color,
        lineHeight:    1,
        letterSpacing: '.02em',
        display:       'inline-block',
      }}
    >
      {displayed}
    </span>
  );
}

/* ─── Main component ─────────────────────────────────────────────────────────── */
export default function ArgumentCard({ entry, side, name, defeatedId, scoreDisplay }) {
  const isWinner   = !!entry.decisive;
  const isDefeated = !isWinner && entry.id === defeatedId;

  /* Winner state: persists as long as entry.decisive is true */
  const [winnerSettled, setWinnerSettled] = useState(false);
  const winTimerRef = useRef(null);

  useEffect(() => {
    if (isWinner) {
      winTimerRef.current = setTimeout(() => setWinnerSettled(true), 1400);
      return () => clearTimeout(winTimerRef.current);
    }
    setWinnerSettled(false);
  }, [isWinner]);

  /* Build className — never mutate existing .entry / .ea / .eb classes */
  const cls = [
    'entry',
    `e${side.toLowerCase()}`,
    isWinner && !winnerSettled ? 'btk-entry-winner' : '',
    isWinner &&  winnerSettled ? 'btk-entry-winner-settled' : '',
    isDefeated                 ? 'btk-entry-loser' : '',
  ].filter(Boolean).join(' ');

  const color = side === 'A' ? 'var(--A)' : 'var(--B)';

  return (
    <div className={cls} style={{ position: 'relative' }}>

      {/* ── Breakthrough overlay (badge or crack) ── */}
      <BreakthroughAnimation winner={true}  active={isWinner}   />
      <BreakthroughAnimation winner={false} active={isDefeated} />

      {/* ── Meta row ── */}
      <div className="emeta">
        <div className={`ebadge eb${side.toLowerCase()}`}>
          {name.split(' ')[0]}
        </div>
        <div className="etime">{fmtTime(entry.time)}</div>
        <div className="etype">{entry.type}</div>

        {/* Decisive star indicator in meta row */}
        {isWinner && (
          <div
            aria-hidden="true"
            style={{
              marginLeft:  'auto',
              fontSize:    '.65rem',
              color:       '#C6A15B',
              animation:   'glow 2s ease-in-out infinite',
            }}
          >
            ★
          </div>
        )}
      </div>

      {/* ── Content ── */}
      <div style={{ flex: 1, position: 'relative', zIndex: 1 }}>
        <div className="etext">{entry.formalized || entry.raw}</div>

        {entry.raw && entry.formalized && entry.raw !== entry.formalized && (
          <div className="eraw">🗣 {entry.raw}</div>
        )}

        {/* Animated overall score number — wraps the score from scoreDisplay */}
        {entry.overall_score != null && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 6, marginBottom: 4 }}>
            <AnimatedScore value={entry.overall_score} color={color} />
            <span
              style={{
                fontFamily:    'var(--fM, sans-serif)',
                fontSize:      '.48rem',
                color:         'var(--muted)',
                textTransform: 'uppercase',
                letterSpacing: '.08em',
              }}
            >
              / 10
            </span>
            {entry.confidence != null && (
              <span
                style={{
                  fontFamily: 'var(--fM, sans-serif)',
                  fontSize:   '.48rem',
                  color:      'var(--muted)',
                  opacity:    .7,
                }}
              >
                · {Math.round(entry.confidence * 100)}% confiance
              </span>
            )}
          </div>
        )}

        {/* Existing score display (criteria chips, analysis, advice) */}
        {scoreDisplay}
      </div>

    </div>
  );
}
