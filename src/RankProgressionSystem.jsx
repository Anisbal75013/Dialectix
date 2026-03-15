/**
 * RankProgressionSystem.jsx — Dialectix
 *
 * Chess.com-style rank progression display.
 * Separate from the BADGES system in App.jsx — this is an independent
 * chess-themed rank ladder for the profile / rank page.
 *
 * Exports:
 *   getChessRank(elo)     — returns current CHESS_RANKS entry
 *   getNextChessRank(elo) — returns next rank or null
 *   getChessRankPct(elo)  — returns 0-100 progress % within current rank
 *   default               — RankProgressionSystem({ elo, debates, wins, user })
 */

/* ─── RANK TABLE ─────────────────────────────────────────────────────────── */

const CHESS_RANKS = [
  { id: 'novice',      label: 'Novice',      icon: '🌱', color: '#8A9070', min: 0,    max: 999  },
  { id: 'debater',     label: 'Debater',     icon: '💬', color: '#8A7A60', min: 1000, max: 1199 },
  { id: 'rhetorician', label: 'Rhetorician', icon: '🗣', color: '#606070', min: 1200, max: 1399 },
  { id: 'strategist',  label: 'Strategist',  icon: '♟', color: '#2C4A6E', min: 1400, max: 1599 },
  { id: 'sophist',     label: 'Sophist',     icon: '⚖️', color: '#5A3A6E', min: 1600, max: 1799 },
  { id: 'master',      label: 'Master',      icon: '🏛', color: '#A05A2C', min: 1800, max: 1999 },
  { id: 'grandmaster', label: 'Grandmaster', icon: '👑', color: '#C6A15B', min: 2000, max: 9999 },
];

/* ─── HELPER FUNCTIONS ───────────────────────────────────────────────────── */

/** Returns the CHESS_RANKS entry matching the given ELO. */
export function getChessRank(elo) {
  const n = +elo || 0;
  for (let i = CHESS_RANKS.length - 1; i >= 0; i--) {
    if (n >= CHESS_RANKS[i].min) return CHESS_RANKS[i];
  }
  return CHESS_RANKS[0];
}

/** Returns the next rank above the current one, or null if already Grandmaster. */
export function getNextChessRank(elo) {
  const current = getChessRank(elo);
  const idx = CHESS_RANKS.findIndex(r => r.id === current.id);
  return idx < CHESS_RANKS.length - 1 ? CHESS_RANKS[idx + 1] : null;
}

/**
 * Returns a 0-100 progress percentage within the current rank band.
 * Grandmaster always returns 100.
 */
export function getChessRankPct(elo) {
  const n    = +elo || 0;
  const cur  = getChessRank(n);
  const next = getNextChessRank(n);
  if (!next) return 100;
  const band = next.min - cur.min;
  if (band <= 0) return 100;
  return Math.min(100, Math.max(0, Math.round(((n - cur.min) / band) * 100)));
}

/* ─── PALETTE / TOKENS ───────────────────────────────────────────────────── */

const GOLD   = '#C6A15B';
const GOLD_D = '#A07C38';
const MUTED  = 'rgba(140,120,90,.65)';
const DARK   = '#1A1510';
const CARD_BG  = 'rgba(253,250,244,.96)';
const CARD_BD  = 'rgba(198,161,91,.22)';
const LOCKED_BG = 'rgba(230,225,215,.38)';
const LOCKED_BD = 'rgba(180,170,155,.3)';

/* ─── MAIN COMPONENT ─────────────────────────────────────────────────────── */

/**
 * RankProgressionSystem
 *
 * Props:
 *   elo      number   — current ELO rating
 *   debates  number   — total debates played
 *   wins     number   — total wins
 *   user     object   — user profile object (optional, for display name)
 */
export default function RankProgressionSystem({ elo = 1000, debates = 0, wins = 0, user }) {
  const n           = +elo    || 0;
  const totalDebates = +debates || 0;
  const totalWins    = +wins    || 0;

  const current     = getChessRank(n);
  const next        = getNextChessRank(n);
  const pct         = getChessRankPct(n);
  const rankIdx     = CHESS_RANKS.findIndex(r => r.id === current.id);
  const pointsNeeded = next ? Math.max(0, next.min - n) : 0;

  /* ── Seasonal stats ───────────────────────────────────────────────────── */
  const winRate       = totalDebates > 0 ? Math.round((totalWins / totalDebates) * 100) : 0;
  const ELO_PER_WIN   = 15; // typical ELO gain per win
  const battlesToNext = next
    ? Math.ceil(pointsNeeded / ELO_PER_WIN)
    : 0;
  const avgGainLabel  = `~${ELO_PER_WIN} pts`;

  /* ── Objectives ───────────────────────────────────────────────────────── */
  const objectives = buildObjectives({ n, totalWins, totalDebates, next, pointsNeeded, rankIdx });

  return (
    <div style={{
      display:       'flex',
      flexDirection: 'column',
      gap:           20,
      fontFamily:    'var(--fB, sans-serif)',
    }}>

      {/* ══════════════════════════════════════════════════════════════════
          1. CHESS RANK HERO CARD
         ══════════════════════════════════════════════════════════════════ */}
      <div style={{
        background:   CARD_BG,
        border:       `1px solid ${CARD_BD}`,
        borderRadius: 14,
        padding:      '24px 28px',
        boxShadow:    'var(--sh, 0 2px 12px rgba(0,0,0,.07))',
        position:     'relative',
        overflow:     'hidden',
      }}>
        {/* Subtle gold vignette */}
        <div style={{
          position:      'absolute',
          inset:         0,
          background:    `radial-gradient(ellipse at 0% 0%, ${current.color}12 0%, transparent 60%)`,
          pointerEvents: 'none',
          borderRadius:  14,
        }}/>

        {/* Header row */}
        <div style={{
          display:        'flex',
          justifyContent: 'space-between',
          alignItems:     'flex-start',
          marginBottom:   20,
          position:       'relative',
        }}>
          <div>
            <div style={{
              fontFamily:    'var(--fH, serif)',
              fontSize:      '.72rem',
              color:         MUTED,
              letterSpacing: '.08em',
              textTransform: 'uppercase',
              marginBottom:  4,
            }}>
              Rang actuel
            </div>
            <div style={{
              fontFamily:    'var(--fH, serif)',
              fontSize:      '.72rem',
              color:         MUTED,
              letterSpacing: '.04em',
            }}>
              Rang #{rankIdx + 1} dans la hiérarchie
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{
              fontFamily: 'var(--fH, serif)',
              fontSize:   '1.6rem',
              color:      GOLD,
              fontWeight: 700,
              lineHeight: 1,
            }}>
              {n.toLocaleString()}
            </div>
            <div style={{
              fontFamily:    'var(--fM, serif)',
              fontSize:      '.52rem',
              color:         MUTED,
              letterSpacing: '.1em',
              marginTop:     3,
            }}>
              ELO
            </div>
          </div>
        </div>

        {/* Rank identity */}
        <div style={{
          display:        'flex',
          alignItems:     'center',
          gap:            16,
          marginBottom:   22,
          position:       'relative',
        }}>
          <div style={{
            fontSize:    '3rem',
            lineHeight:  1,
            filter:      `drop-shadow(0 0 10px ${current.color}66)`,
            flexShrink:  0,
          }}>
            {current.icon}
          </div>
          <div>
            <div style={{
              fontFamily:    'var(--fH, serif)',
              fontSize:      '1.5rem',
              color:         current.color,
              fontWeight:    700,
              lineHeight:    1,
              letterSpacing: '.04em',
            }}>
              {current.label}
            </div>
            {next ? (
              <div style={{
                fontFamily: 'var(--fM, serif)',
                fontSize:   '.62rem',
                color:      MUTED,
                marginTop:  5,
              }}>
                {pointsNeeded} pts pour atteindre {next.icon} {next.label}
              </div>
            ) : (
              <div style={{
                fontFamily: 'var(--fM, serif)',
                fontSize:   '.62rem',
                color:      GOLD,
                marginTop:  5,
              }}>
                Rang maximum — vous êtes au sommet ✦
              </div>
            )}
          </div>
        </div>

        {/* Progress bar to next rank */}
        {next && (
          <div style={{ position: 'relative' }}>
            <div style={{
              display:        'flex',
              justifyContent: 'space-between',
              marginBottom:   6,
            }}>
              <span style={{
                fontFamily:    'var(--fH, serif)',
                fontSize:      '.56rem',
                color:         current.color,
                letterSpacing: '.05em',
              }}>
                {current.label}
              </span>
              <span style={{
                fontFamily:    'var(--fH, serif)',
                fontSize:      '.56rem',
                color:         next.color,
                letterSpacing: '.05em',
              }}>
                {next.label}
              </span>
            </div>
            <div style={{
              height:       9,
              background:   'rgba(180,168,145,.22)',
              borderRadius: 5,
              overflow:     'hidden',
            }}>
              <div style={{
                height:           '100%',
                width:            `${pct}%`,
                background:       `linear-gradient(90deg, ${current.color}cc, ${next.color}ff)`,
                borderRadius:     5,
                transition:       'width .7s cubic-bezier(.22,1,.36,1)',
                boxShadow:        `0 0 8px ${current.color}55`,
                position:         'relative',
                overflow:         'hidden',
              }}>
                {/* Shimmer sweep */}
                <div style={{
                  position:   'absolute',
                  inset:      0,
                  background: 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,.28) 50%, transparent 100%)',
                  transform:  'translateX(-100%)',
                  animation:  'rku-shine-sweep 2.5s ease-in-out infinite',
                  pointerEvents: 'none',
                }}/>
              </div>
            </div>
            <div style={{
              display:        'flex',
              justifyContent: 'space-between',
              marginTop:      5,
            }}>
              <span style={{ fontFamily: 'var(--fM)', fontSize: '.5rem', color: MUTED }}>
                {n - current.min} pts dans ce rang
              </span>
              <span style={{ fontFamily: 'var(--fH)', fontSize: '.5rem', color: GOLD }}>
                {pct}%
              </span>
              <span style={{ fontFamily: 'var(--fM)', fontSize: '.5rem', color: MUTED }}>
                {next.min - current.min} pts total
              </span>
            </div>
          </div>
        )}
      </div>

      {/* ══════════════════════════════════════════════════════════════════
          2. RANK LADDER
         ══════════════════════════════════════════════════════════════════ */}
      <div style={{
        background:   CARD_BG,
        border:       `1px solid ${CARD_BD}`,
        borderRadius: 14,
        padding:      '20px 24px',
        boxShadow:    'var(--sh, 0 2px 12px rgba(0,0,0,.07))',
      }}>
        <div style={{
          fontFamily:    'var(--fH, serif)',
          fontSize:      '.75rem',
          color:         'var(--txt, #1A1510)',
          letterSpacing: '.05em',
          marginBottom:  16,
        }}>
          Hiérarchie des rangs
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
          {[...CHESS_RANKS].reverse().map((rank, ri) => {
            const isCurrentRank = rank.id === current.id;
            const isAchieved    = n >= rank.min;
            const isPast        = isAchieved && !isCurrentRank;

            return (
              <div
                key={rank.id}
                style={{
                  display:      'flex',
                  alignItems:   'center',
                  gap:          12,
                  padding:      isCurrentRank ? '10px 14px' : '8px 14px',
                  borderRadius: 9,
                  border:       isCurrentRank
                    ? `1.5px solid ${rank.color}88`
                    : `1px solid ${isAchieved ? rank.color + '33' : LOCKED_BD}`,
                  background:   isCurrentRank
                    ? `${rank.color}14`
                    : isAchieved
                      ? `${rank.color}08`
                      : LOCKED_BG,
                  opacity:      isAchieved ? 1 : .5,
                  transition:   'opacity .2s',
                }}
              >
                {/* Icon */}
                <div style={{
                  fontSize:   '1.4rem',
                  lineHeight: 1,
                  flexShrink: 0,
                  filter:     isAchieved
                    ? (isCurrentRank ? `drop-shadow(0 0 6px ${rank.color}88)` : 'none')
                    : 'grayscale(.8) opacity(.5)',
                }}>
                  {rank.icon}
                </div>

                {/* Label + ELO range */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{
                    fontFamily:    'var(--fH, serif)',
                    fontSize:      isCurrentRank ? '.78rem' : '.7rem',
                    color:         isCurrentRank
                      ? rank.color
                      : isAchieved
                        ? 'var(--txt, #1A1510)'
                        : MUTED,
                    letterSpacing: '.04em',
                    fontWeight:    isCurrentRank ? 700 : 400,
                  }}>
                    {rank.label}
                    {isCurrentRank && (
                      <span style={{
                        marginLeft:    8,
                        fontSize:      '.52rem',
                        background:    `${rank.color}22`,
                        border:        `1px solid ${rank.color}55`,
                        borderRadius:  4,
                        padding:       '1px 6px',
                        verticalAlign: 'middle',
                        letterSpacing: '.08em',
                        color:         rank.color,
                      }}>
                        ACTUEL
                      </span>
                    )}
                  </div>
                  <div style={{
                    fontFamily: 'var(--fM, serif)',
                    fontSize:   '.52rem',
                    color:      MUTED,
                    marginTop:  2,
                  }}>
                    {rank.max >= 9999 ? `${rank.min}+ ELO` : `${rank.min} – ${rank.max} ELO`}
                  </div>
                </div>

                {/* Status indicator */}
                <div style={{ flexShrink: 0 }}>
                  {isPast ? (
                    <span style={{
                      fontSize:   '.85rem',
                      color:      '#3A6E52',
                      filter:     'drop-shadow(0 0 3px rgba(58,110,82,.4))',
                    }}>✓</span>
                  ) : isCurrentRank ? (
                    <div style={{
                      width:        8,
                      height:       8,
                      borderRadius: '50%',
                      background:   rank.color,
                      boxShadow:    `0 0 6px ${rank.color}`,
                    }}/>
                  ) : (
                    <span style={{ fontSize: '.75rem', color: MUTED }}>🔒</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════════════
          3. NEXT OBJECTIVES PANEL
         ══════════════════════════════════════════════════════════════════ */}
      <div style={{
        background:   CARD_BG,
        border:       `1px solid ${CARD_BD}`,
        borderRadius: 14,
        padding:      '20px 24px',
        boxShadow:    'var(--sh, 0 2px 12px rgba(0,0,0,.07))',
      }}>
        <div style={{
          fontFamily:    'var(--fH, serif)',
          fontSize:      '.75rem',
          color:         'var(--txt, #1A1510)',
          letterSpacing: '.05em',
          marginBottom:  16,
          display:       'flex',
          alignItems:    'center',
          gap:           8,
        }}>
          <span style={{ fontSize: '1rem' }}>🎯</span>
          Next Objectives
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {objectives.map((obj, i) => (
            <ObjectiveRow key={i} obj={obj} />
          ))}
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════════════
          4. SEASONAL STATS ROW
         ══════════════════════════════════════════════════════════════════ */}
      <div style={{
        background:   CARD_BG,
        border:       `1px solid ${CARD_BD}`,
        borderRadius: 14,
        padding:      '18px 24px',
        boxShadow:    'var(--sh, 0 2px 12px rgba(0,0,0,.07))',
      }}>
        <div style={{
          fontFamily:    'var(--fH, serif)',
          fontSize:      '.75rem',
          color:         'var(--txt, #1A1510)',
          letterSpacing: '.05em',
          marginBottom:  16,
          display:       'flex',
          alignItems:    'center',
          gap:           8,
        }}>
          <span style={{ fontSize: '1rem' }}>📊</span>
          Statistiques de saison
        </div>

        <div style={{
          display:             'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap:                 12,
        }}>
          <StatCell
            icon="🏆"
            label="Taux de victoire"
            value={`${winRate}%`}
            sub={`${totalWins} / ${totalDebates} débats`}
            color="#3A6E52"
          />
          <StatCell
            icon="📈"
            label="ELO moyen / victoire"
            value={avgGainLabel}
            sub="estimation typique"
            color={GOLD}
          />
          <StatCell
            icon="⚔️"
            label="Débats vers le rang suivant"
            value={next ? (battlesToNext > 0 ? `~${battlesToNext}` : '0') : '—'}
            sub={next ? `pour ${next.label}` : 'Rang max atteint'}
            color={next ? next.color : GOLD}
          />
        </div>
      </div>
    </div>
  );
}

/* ─── SUB-COMPONENTS ─────────────────────────────────────────────────────── */

function ObjectiveRow({ obj }) {
  const { icon, title, description, pct, complete } = obj;

  return (
    <div style={{
      display:      'flex',
      gap:          12,
      alignItems:   'flex-start',
      padding:      '12px 14px',
      borderRadius: 9,
      border:       complete
        ? '1px solid rgba(58,110,82,.35)'
        : `1px solid ${CARD_BD}`,
      background:   complete
        ? 'rgba(58,110,82,.06)'
        : 'rgba(253,250,244,.55)',
      borderLeft:   `3px solid ${complete ? '#3A6E52' : GOLD}`,
    }}>
      {/* Icon */}
      <div style={{
        fontSize:    '1.1rem',
        lineHeight:  1,
        flexShrink:  0,
        marginTop:   1,
        filter:      complete ? 'grayscale(0)' : 'none',
        opacity:     complete ? .7 : 1,
      }}>
        {complete ? '✅' : icon}
      </div>

      {/* Text + bar */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontFamily:    'var(--fH, serif)',
          fontSize:      '.7rem',
          color:         complete ? '#3A6E52' : 'var(--txt, #1A1510)',
          letterSpacing: '.03em',
          marginBottom:  2,
        }}>
          {title}
        </div>
        <div style={{
          fontFamily:  'var(--fM, serif)',
          fontSize:    '.58rem',
          color:       MUTED,
          lineHeight:  1.5,
          marginBottom: complete ? 0 : 8,
        }}>
          {description}
        </div>

        {!complete && (
          <>
            <div style={{
              height:       5,
              background:   'rgba(180,168,145,.22)',
              borderRadius: 3,
              overflow:     'hidden',
            }}>
              <div style={{
                height:       '100%',
                width:        `${pct}%`,
                background:   `linear-gradient(90deg, ${GOLD_D}, ${GOLD})`,
                borderRadius: 3,
                transition:   'width .5s ease',
              }}/>
            </div>
            <div style={{
              fontFamily: 'var(--fM)',
              fontSize:   '.5rem',
              color:      MUTED,
              marginTop:  4,
              textAlign:  'right',
            }}>
              {pct}%
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function StatCell({ icon, label, value, sub, color }) {
  return (
    <div style={{
      display:        'flex',
      flexDirection:  'column',
      alignItems:     'center',
      textAlign:      'center',
      padding:        '14px 10px',
      borderRadius:   9,
      border:         `1px solid ${CARD_BD}`,
      background:     'rgba(253,250,244,.55)',
      gap:            4,
    }}>
      <div style={{ fontSize: '1.1rem', lineHeight: 1 }}>{icon}</div>
      <div style={{
        fontFamily:    'var(--fH, serif)',
        fontSize:      '1.15rem',
        color:         color,
        fontWeight:    700,
        lineHeight:    1.1,
        marginTop:     4,
      }}>
        {value}
      </div>
      <div style={{
        fontFamily:    'var(--fM, serif)',
        fontSize:      '.52rem',
        color:         'var(--txt, #1A1510)',
        letterSpacing: '.04em',
        textTransform: 'uppercase',
      }}>
        {label}
      </div>
      <div style={{
        fontFamily: 'var(--fM, serif)',
        fontSize:   '.5rem',
        color:      MUTED,
        marginTop:  1,
      }}>
        {sub}
      </div>
    </div>
  );
}

/* ─── OBJECTIVES BUILDER ─────────────────────────────────────────────────── */

function buildObjectives({ n, totalWins, totalDebates, next, pointsNeeded, rankIdx }) {
  const ELO_PER_WIN = 15;
  const objectives  = [];

  /* Objective 1: Win X battles */
  const WIN_TARGETS = [1, 5, 10, 25, 50, 100, 200];
  const nextWinTarget = WIN_TARGETS.find(t => t > totalWins) || totalWins + 50;
  const winPct = Math.min(100, Math.round((totalWins / nextWinTarget) * 100));
  objectives.push({
    icon:        '🏅',
    title:       `Remporter ${nextWinTarget} batailles`,
    description: `${totalWins} / ${nextWinTarget} victoires accumulées`,
    pct:         winPct,
    complete:    totalWins >= nextWinTarget,
  });

  /* Objective 2: Reach next rank ELO */
  if (next) {
    const battlesNeeded = Math.ceil(pointsNeeded / ELO_PER_WIN);
    const rankPct       = getChessRankPct(n);
    objectives.push({
      icon:        next.icon,
      title:       `Atteindre ${next.min} ELO — rang ${next.label}`,
      description: `Encore ${pointsNeeded} pts · ~${battlesNeeded} débat${battlesNeeded > 1 ? 's' : ''}`,
      pct:         rankPct,
      complete:    n >= next.min,
    });
  } else {
    objectives.push({
      icon:        '👑',
      title:       'Rang Grandmaster atteint',
      description: 'Vous avez atteint le sommet de la hiérarchie.',
      pct:         100,
      complete:    true,
    });
  }

  /* Objective 3: Defeat a higher-ranked opponent */
  if (rankIdx < CHESS_RANKS.length - 1) {
    const higherRank     = CHESS_RANKS[rankIdx + 1];
    const defeatsNeeded  = 3;
    // We don't have a per-opponent tracker; treat as perpetual motivational goal
    objectives.push({
      icon:        '⚔️',
      title:       `Vaincre un adversaire ${higherRank.label}`,
      description: `Affrontez et battez un joueur de rang ${higherRank.label} (${higherRank.min}+ ELO)`,
      pct:         0,
      complete:    false,
    });
  } else {
    /* Grandmaster: encourage volume */
    const eliteTarget = Math.ceil(totalDebates / 10) * 10 + 10;
    const elitePct    = Math.min(100, Math.round((totalDebates / eliteTarget) * 100));
    objectives.push({
      icon:        '🌟',
      title:       `Atteindre ${eliteTarget} débats au total`,
      description: `Maintenez votre statut Grandmaster par le volume`,
      pct:         elitePct,
      complete:    totalDebates >= eliteTarget,
    });
  }

  return objectives;
}
