/**
 * RankUpAnimation.jsx
 *
 * Full-screen rank promotion overlay — AAA competitive feel.
 *
 * Trigger: user badge/rank changes to a higher tier (handled in App.jsx
 * via `setPromotion(newBadge)` → rendered as `<PromotionOverlay badge={...}/>`).
 *
 * Effects:
 *   • Soft full-screen glow (2s, backdrop-filter blur)
 *   • Badge slams in with spring physics simulation via CSS
 *   • "PROMOTION" label rises with letter-spacing expand
 *   • Rank label appears with sub-text
 *   • SVG gold particles float upward
 *   • Optional: ambient ring that spins and fades
 *
 * Props:
 *   badge   object  { icon, label, color, cls }  — the new badge
 *   onDone  fn      called after 5 s or on click/tap to skip
 */

import { useEffect, useMemo, useRef } from 'react';
import '../styles/animations.css';

/* ─── Deterministic particle data (stable across renders) ─── */
function useParticles(n = 22) {
  return useMemo(() => {
    // Seeded pseudo-random so particles are consistent per render
    let s = 0xABCD1234;
    const rnd = () => { s ^= s << 13; s ^= s >> 17; s ^= s << 5; return ((s >>> 0) / 0xFFFFFFFF); };

    return Array.from({ length: n }, (_, i) => ({
      id:    i,
      x:     -80 + rnd() * 160,          // horizontal offset from center (px)
      dy:    -(55 + rnd() * 70),          // upward travel (px)
      dx:    -40 + rnd() * 80,            // horizontal drift (px)
      rot:   90 + rnd() * 270,            // final rotation (deg)
      delay: rnd() * .65,                 // stagger delay (s)
      dur:   1.1 + rnd() * .6,            // duration (s)
      size:  4 + rnd() * 7,               // particle size (px)
      shape: rnd() > .55 ? 'circle' : 'diamond',
      // Color variation: gold / amber / off-white
      hue:   rnd() > .6 ? '#E8C96A' : rnd() > .5 ? '#C6A12A' : '#F5E8A8',
      opacity: .55 + rnd() * .4,
    }));
  }, [n]);
}

export default function RankUpAnimation({ badge, onDone }) {
  const particles = useParticles(24);
  const timerRef  = useRef(null);

  useEffect(() => {
    if (!badge) return;
    timerRef.current = setTimeout(() => onDone?.(), 5000);
    return () => clearTimeout(timerRef.current);
  }, [badge, onDone]);

  if (!badge) return null;

  const handleSkip = () => {
    clearTimeout(timerRef.current);
    onDone?.();
  };

  return (
    <div
      className="rku-overlay"
      onClick={handleSkip}
      onKeyDown={e => e.key === 'Enter' || e.key === ' ' ? handleSkip() : null}
      role="dialog"
      aria-modal="true"
      aria-label={`Promotion au rang ${badge.label}`}
      tabIndex={0}
    >

      {/* ── SVG particle field ──────────────────────────────────── */}
      <div
        aria-hidden="true"
        style={{
          position: 'absolute',
          inset:    0,
          overflow: 'hidden',
          pointerEvents: 'none',
        }}
      >
        {particles.map(p => (
          <div
            key={p.id}
            style={{
              position:  'absolute',
              left:      `calc(50% + ${p.x}px)`,
              bottom:    '42%',
              width:      p.size,
              height:     p.size,
              background: p.hue,
              borderRadius: p.shape === 'circle' ? '50%' : '2px',
              transform:  p.shape === 'diamond' ? 'rotate(45deg)' : 'none',
              opacity:    0,
              '--p-dy':   `${p.dy}px`,
              '--p-dx':   `${p.dx}px`,
              '--p-rot':  `${p.rot}deg`,
              animation:  `rku-particle ${p.dur}s ease-out ${p.delay}s forwards`,
              willChange: 'transform, opacity',
            }}
          />
        ))}
      </div>

      {/* ── Ambient spinning ring ────────────────────────────────── */}
      <div
        aria-hidden="true"
        style={{
          position:     'absolute',
          width:         200,
          height:        200,
          borderRadius: '50%',
          border:        '1px solid rgba(198,161,91,.28)',
          animation:
            'rku-ring-spin 3s linear infinite, rku-ring-shrink 2s ease forwards',
          pointerEvents: 'none',
        }}
      />

      {/* ── Badge ───────────────────────────────────────────────── */}
      <div
        style={{
          fontSize:       '5rem',
          lineHeight:     1,
          animation:      'rku-badge-slam .65s cubic-bezier(.34,1.38,.64,1) .1s both',
          filter:         'drop-shadow(0 4px 18px rgba(198,161,91,.55))',
          position:       'relative',
          zIndex:         2,
          willChange:     'transform, opacity',
        }}
      >
        {badge.icon}
      </div>

      {/* ── PROMOTION label ─────────────────────────────────────── */}
      <div
        style={{
          fontFamily:    'var(--fH, "Cinzel", serif)',
          fontSize:      '.72rem',
          fontWeight:    600,
          letterSpacing: '.16em',
          color:         'var(--muted, #8A7A60)',
          textTransform: 'uppercase',
          marginTop:     18,
          animation:     'rku-label-rise .5s ease .5s both',
          position:      'relative',
          zIndex:        2,
        }}
      >
        PROMOTION
      </div>

      {/* ── Rank badge pill ─────────────────────────────────────── */}
      <div
        className={`badge-pill ${badge.cls || ''}`}
        style={{
          fontSize:   '1.08rem',
          padding:    '10px 24px',
          display:    'inline-flex',
          margin:     '12px auto 0',
          justifyContent: 'center',
          animation:  'rku-sub-rise .45s ease .75s both',
          position:   'relative',
          zIndex:     2,
          boxShadow:  `0 2px 16px ${badge.color || 'rgba(198,161,91,.3)'}44`,
        }}
      >
        {badge.icon} {badge.label}
      </div>

      {/* ── Sub-text ────────────────────────────────────────────── */}
      <div
        style={{
          fontFamily:  'var(--fM, sans-serif)',
          fontSize:    '.64rem',
          color:       'var(--muted, #8A7A60)',
          marginTop:   12,
          lineHeight:  1.7,
          textAlign:   'center',
          animation:   'rku-sub-rise .4s ease .95s both',
          position:    'relative',
          zIndex:      2,
        }}
      >
        Nouveau rang atteint :{' '}
        <strong style={{ color: badge.color || 'var(--Y, #C6A15B)' }}>
          {badge.label}
        </strong>
        <br />
        <span style={{ opacity: .7 }}>Palier {badge.min} ELO débloqué</span>
      </div>

      {/* ── Skip hint ───────────────────────────────────────────── */}
      <div
        style={{
          fontFamily:  'var(--fM, sans-serif)',
          fontSize:    '.52rem',
          color:       'var(--muted, #8A7A60)',
          marginTop:   24,
          animation:   'rku-dismiss-hint 2s ease forwards',
          position:    'relative',
          zIndex:      2,
        }}
      >
        Appuyer pour fermer
      </div>

    </div>
  );
}
