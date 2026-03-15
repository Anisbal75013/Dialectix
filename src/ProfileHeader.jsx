/**
 * ProfileHeader.jsx
 *
 * Compact profile header card showing avatar, name, badge, and ELO.
 * Integrates with RankUpAnimation — pass `justPromoted={badge}` to
 * trigger the full-screen overlay.
 *
 * Props:
 *   user          object  { name, avatar, elo, debates, wins, streak }
 *   badge         object  { icon, label, cls, color, min }   — current badge
 *   eloChange     number  — signed ELO delta from last match (optional)
 *   justPromoted  object  — new badge if just promoted (triggers overlay)
 *   onPromoDone   fn      — called when rank-up overlay is dismissed
 */

import { useState } from 'react';
import RankUpAnimation from './animations/RankUpAnimation.jsx';
import './styles/animations.css';

export default function ProfileHeader({
  user,
  badge,
  eloChange     = null,
  justPromoted  = null,
  onPromoDone   = () => {},
}) {
  const [overlayBadge, setOverlayBadge] = useState(justPromoted);

  /* If parent passes new justPromoted, show the overlay */
  if (justPromoted && !overlayBadge) setOverlayBadge(justPromoted);

  if (!user) return null;

  const eloPositive = eloChange != null && eloChange >= 0;
  const eloNegative = eloChange != null && eloChange <  0;

  return (
    <>
      {/* ── Rank-Up overlay ── */}
      {overlayBadge && (
        <RankUpAnimation
          badge={overlayBadge}
          onDone={() => { setOverlayBadge(null); onPromoDone(); }}
        />
      )}

      {/* ── Profile card ── */}
      <div
        style={{
          display:        'flex',
          alignItems:     'center',
          gap:             16,
          padding:         '16px 20px',
          background:      '#FDFAF4',
          border:          '1px solid var(--bd2, rgba(198,161,91,.28))',
          borderRadius:    10,
          boxShadow:       'var(--sh, 0 1px 4px rgba(0,0,0,.06))',
          flexWrap:        'wrap',
          position:        'relative',
          overflow:        'hidden',
        }}
      >
        {/* Subtle badge-color ambient tint */}
        {badge && (
          <div
            aria-hidden="true"
            style={{
              position:      'absolute',
              inset:         0,
              background:    `radial-gradient(ellipse at 0% 50%, ${badge.color}18 0%, transparent 60%)`,
              pointerEvents: 'none',
            }}
          />
        )}

        {/* Avatar */}
        <div
          style={{
            width:         52,
            height:        52,
            borderRadius:  '50%',
            display:       'flex',
            alignItems:    'center',
            justifyContent:'center',
            fontSize:      '1.7rem',
            background:    badge ? `${badge.color}18` : 'rgba(198,161,91,.1)',
            border:        `2px solid ${badge ? badge.color + '55' : 'rgba(198,161,91,.3)'}`,
            flexShrink:    0,
            position:      'relative',
            zIndex:        1,
          }}
        >
          {user.avatar || '👤'}
        </div>

        {/* Name + badge */}
        <div style={{ flex: 1, minWidth: 120, position: 'relative', zIndex: 1 }}>
          <div
            style={{
              fontFamily:    'var(--fH, serif)',
              fontSize:      '1rem',
              color:         'var(--txt, #2A2118)',
              letterSpacing: '.03em',
              lineHeight:    1.2,
            }}
          >
            {user.name}
          </div>

          {badge && (
            <div style={{ marginTop: 5 }}>
              <span className={`badge-pill ${badge.cls || ''}`}>
                {badge.icon} {badge.label}
              </span>
            </div>
          )}

          {/* Micro stats */}
          <div
            style={{
              display:    'flex',
              gap:         12,
              marginTop:   7,
              flexWrap:   'wrap',
            }}
          >
            {[
              { label: 'Débats',   value: user.debates ?? 0 },
              { label: 'Victoires',value: user.wins    ?? 0 },
              { label: 'Série',    value: user.streak  ?? 0, suffix: '🔥', hide: !user.streak },
            ].filter(s => !s.hide).map(s => (
              <div
                key={s.label}
                style={{
                  display:       'flex',
                  flexDirection: 'column',
                  alignItems:    'center',
                }}
              >
                <span
                  style={{
                    fontFamily: 'var(--fH, serif)',
                    fontSize:   '.82rem',
                    color:      'var(--txt, #2A2118)',
                    lineHeight: 1,
                  }}
                >
                  {s.value}{s.suffix || ''}
                </span>
                <span
                  style={{
                    fontFamily:    'var(--fB, sans-serif)',
                    fontSize:      '.48rem',
                    color:         'var(--muted, #8A7A60)',
                    textTransform: 'uppercase',
                    letterSpacing: '.08em',
                    marginTop:     2,
                  }}
                >
                  {s.label}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* ELO + delta */}
        <div
          style={{
            textAlign: 'center',
            position:  'relative',
            zIndex:    1,
          }}
        >
          <div
            className="elo-box"
            style={{
              animation: eloPositive
                ? 'btk-winner-glow .8s ease forwards'
                : undefined,
            }}
          >
            <div className="elo-v">{user.elo}</div>
            <div className="elo-l">ELO</div>
          </div>

          {eloChange != null && (
            <div
              className={`elo-delta ${eloPositive ? 'd-up' : 'd-dn'}`}
              style={{
                marginTop:  5,
                animation:  'btk-score-reveal .35s ease forwards',
                display:    'inline-flex',
                alignItems: 'center',
                gap:        3,
              }}
            >
              {eloPositive ? '▲' : '▼'} {Math.abs(eloChange)}
            </div>
          )}
        </div>

      </div>
    </>
  );
}
