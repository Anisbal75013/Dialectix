/**
 * PressureAnimation.jsx
 *
 * Mental-pressure system — rendered inside the center Score panel.
 *
 * Trigger: |scoreA − scoreB| > 0.8
 *
 * Shows:
 *   Losing side  → "Pression montante" tag (red, subtle)
 *   Winning side → "Dominance" confidence tag (green, subtle)
 *
 * The red tint overlay and avatar shake are applied via CSS classes
 * (prs-red-tint, prs-avatar-shake) that ArgumentCard / the pane
 * elements add when pressureSide matches their side.
 *
 * Props:
 *   pressureSide  'A' | 'B' | null   — which side is under pressure
 *   scoreDiff     number              — signed (tA - tB)
 *   nameA         string
 *   nameB         string
 */

import { useEffect, useState } from 'react';
import '../styles/animations.css';

export default function PressureAnimation({ pressureSide, scoreDiff, nameA, nameB }) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!pressureSide) { setVisible(false); return; }
    // Slight delay so it doesn't flash on trivial differences
    const t = setTimeout(() => setVisible(true), 600);
    return () => clearTimeout(t);
  }, [pressureSide]);

  if (!visible || !pressureSide) return null;

  const losingSide  = pressureSide;
  const winningSide = pressureSide === 'A' ? 'B' : 'A';
  const losingName  = losingSide === 'A'  ? nameA : nameB;
  const winningName = winningSide === 'A' ? nameA : nameB;
  const diff        = Math.abs(scoreDiff).toFixed(1);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 5, margin: '8px 0 2px' }}>

      {/* Losing tag */}
      <div
        role="status"
        aria-live="polite"
        style={{
          display:        'flex',
          alignItems:     'center',
          gap:            5,
          padding:        '4px 10px',
          background:     'rgba(140,58,48,.07)',
          border:         '1px solid rgba(140,58,48,.2)',
          borderRadius:   5,
          animation:      'prs-tag-in .35s ease forwards',
          alignSelf:      'flex-start',
        }}
      >
        <span
          style={{
            fontSize:  '.7rem',
            animation: 'pulse 1.9s ease-in-out infinite',
          }}
        >
          🌡
        </span>
        <span
          style={{
            fontFamily:    'var(--fB, sans-serif)',
            fontSize:      '.55rem',
            fontWeight:    600,
            color:         'rgba(140,58,48,.82)',
            letterSpacing: '.04em',
          }}
        >
          {losingName.split(' ')[0]} — Pression montante
        </span>
      </div>

      {/* Winning tag */}
      <div
        style={{
          display:      'flex',
          alignItems:   'center',
          gap:          5,
          padding:      '4px 10px',
          background:   'rgba(58,110,82,.06)',
          border:       '1px solid rgba(58,110,82,.22)',
          borderRadius: 5,
          animation:    'prs-tag-in .35s ease .1s both',
          alignSelf:    'flex-start',
        }}
      >
        <span style={{ fontSize: '.62rem' }}>✦</span>
        <span
          style={{
            fontFamily:    'var(--fB, sans-serif)',
            fontSize:      '.55rem',
            fontWeight:    600,
            color:         'rgba(58,110,82,.85)',
            letterSpacing: '.04em',
          }}
        >
          {winningName.split(' ')[0]} — Dominance +{diff}
        </span>

        {/* Mini confidence bar */}
        <div
          style={{
            width:        44,
            height:       3,
            background:   'rgba(58,110,82,.15)',
            borderRadius: 2,
            overflow:     'hidden',
            marginLeft:   4,
          }}
        >
          <div
            style={{
              height:           '100%',
              width:            `${Math.min(100, (parseFloat(diff) / 3) * 100)}%`,
              background:       'rgba(58,110,82,.7)',
              borderRadius:     2,
              transition:       'width 1s cubic-bezier(.4,0,.2,1)',
            }}
          />
        </div>
      </div>

    </div>
  );
}
