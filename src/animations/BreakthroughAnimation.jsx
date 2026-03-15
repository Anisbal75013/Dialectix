/**
 * BreakthroughAnimation.jsx
 *
 * Renders the visual overlay elements for a decisive argument.
 *
 * • winner=true  → golden BREAKTHROUGH badge with shimmer sweep
 * • winner=false → crack SVG fracture overlay
 *
 * This component renders ONLY the overlay — position it inside a
 * relatively-positioned parent (.entry).
 *
 * Usage:
 *   <BreakthroughAnimation winner={true}  active={entry.decisive} />
 *   <BreakthroughAnimation winner={false} active={isDefeated}     />
 */

import { useEffect, useState, useRef } from 'react';
import '../styles/animations.css';

/* ─── Winner Badge ──────────────────────────────────────────────────────────── */
function WinnerBadge() {
  return (
    <div
      aria-label="Argument décisif"
      style={{
        position:   'absolute',
        top:        -12,
        right:      10,
        display:    'flex',
        alignItems: 'center',
        gap:        4,
        padding:    '3px 9px 3px 6px',
        background: 'linear-gradient(118deg, #B8902A 0%, #E8C96A 48%, #C6A12A 100%)',
        borderRadius: 4,
        boxShadow:  '0 2px 12px rgba(198,161,91,.45), 0 1px 3px rgba(0,0,0,.18)',
        overflow:   'hidden',
        animation:  'btk-badge-drop .5s cubic-bezier(.34,1.56,.64,1) forwards',
        zIndex:     10,
        whiteSpace: 'nowrap',
        userSelect: 'none',
      }}
    >
      {/* Shimmer sweep */}
      <span
        aria-hidden="true"
        style={{
          position:   'absolute',
          top:        0,
          bottom:     0,
          width:      '38%',
          background: 'linear-gradient(90deg, transparent, rgba(255,255,255,.52), transparent)',
          animation:  'btk-badge-shimmer .85s ease .5s forwards',
          pointerEvents: 'none',
        }}
      />

      {/* Icon */}
      <span style={{ fontSize: '.65rem', lineHeight: 1, position: 'relative', zIndex: 1 }}>⚡</span>

      {/* Label */}
      <span
        style={{
          fontFamily:    'var(--fH, "Cinzel", serif)',
          fontSize:      '.55rem',
          fontWeight:    700,
          letterSpacing: '.1em',
          color:         '#2E1A00',
          position:      'relative',
          zIndex:        1,
        }}
      >
        BREAKTHROUGH
      </span>

      {/* Sub-label */}
      <span
        style={{
          fontFamily: 'var(--fM, sans-serif)',
          fontSize:   '.44rem',
          color:      'rgba(46,26,0,.68)',
          fontStyle:  'italic',
          marginLeft: 2,
          position:   'relative',
          zIndex:     1,
        }}
      >
        · Argument décisif
      </span>
    </div>
  );
}

/* ─── Crack SVG ─────────────────────────────────────────────────────────────── */
function CrackSVG() {
  return (
    <svg
      aria-hidden="true"
      style={{
        position:        'absolute',
        inset:           0,
        width:           '100%',
        height:          '100%',
        borderRadius:    7,
        pointerEvents:   'none',
        animation:       'btk-crack-in 1.5s ease forwards',
        opacity:         0,
        zIndex:          5,
      }}
      viewBox="0 0 320 88"
      preserveAspectRatio="none"
    >
      {/* Main crack — left quarter */}
      <path
        d="M38 0 L33 16 L47 19 L22 44 L32 46 L5 88"
        stroke="rgba(140,58,48,.28)"
        strokeWidth="1.3"
        fill="none"
        strokeLinecap="round"
      />
      {/* Branch crack */}
      <path
        d="M33 16 L24 26"
        stroke="rgba(140,58,48,.16)"
        strokeWidth=".7"
        fill="none"
        strokeLinecap="round"
      />
      {/* Center-right crack */}
      <path
        d="M185 2 L190 14 L175 17 L196 40"
        stroke="rgba(140,58,48,.2)"
        strokeWidth=".9"
        fill="none"
        strokeLinecap="round"
      />
      {/* Far-right hairline */}
      <path
        d="M268 18 L262 38 L277 41 L248 88"
        stroke="rgba(140,58,48,.22)"
        strokeWidth="1.1"
        fill="none"
        strokeLinecap="round"
      />
      {/* Ambient red tint */}
      <rect
        x="0" y="0" width="320" height="88"
        fill="rgba(140,58,48,.05)"
        rx="7"
      />
    </svg>
  );
}

/* ─── Main export ────────────────────────────────────────────────────────────── */
export default function BreakthroughAnimation({ winner = true, active = false }) {
  const [show, setShow]     = useState(false);
  const [fading, setFading] = useState(false);
  const timers              = useRef([]);

  useEffect(() => {
    timers.current.forEach(clearTimeout);
    if (!active) { setShow(false); setFading(false); return; }

    setShow(true);
    setFading(false);

    // Loser crack fades out after 1.5s; winner badge persists until parent unmounts
    if (!winner) {
      timers.current = [
        setTimeout(() => setFading(true),  1100),
        setTimeout(() => setShow(false),   1550),
      ];
    }
    return () => timers.current.forEach(clearTimeout);
  }, [active, winner]);

  if (!show) return null;

  return winner ? <WinnerBadge /> : <CrackSVG />;
}
