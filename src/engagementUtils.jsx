/**
 * @file engagementUtils.jsx
 * @description Competitive engagement layer for Dialectix.
 *
 * Five READ-ONLY display components that plug into the existing ProfilePage.
 * They do NOT touch:
 *   – ELO calculation logic  (calcELO / applyELO)
 *   – Scoring pipeline       (callClaude / aiAnalyze)
 *   – Arena system           (Arena.jsx / arenaUtils.js)
 *   – saveUser flow          (all saves stay in App.jsx)
 *   – Supabase auth          (SB.auth untouched)
 *
 * All state is READ from props (passed by ProfilePage which already has
 * access to user, leaderboard, getBadge helpers, etc.).
 *
 * Inline styles use only existing CSS variables so no new global CSS is added.
 *
 * @exports RankTrendCard      – Last-10 ELO delta timeline + W/L/D strip
 * @exports PromotionIndicator – Points-to-next-badge with "promotion zone" pulse
 * @exports ReputationBadge    – Percentile rank badge computed from leaderboard
 * @exports PeakRatingCard     – Current ELO vs personal-best peak ELO
 * @exports RematchButton      – Inline "Revanche" CTA on lost match rows
 */

import { useState, useCallback, useMemo } from 'react';

// ─── BADGE THRESHOLDS (mirrors BADGES in App.jsx) ───────────────────────────
// Kept in sync manually. Used to compute accurate progress percentages without
// importing from App.jsx (which would create a circular dependency risk).
const _BADGE_MINS = [0, 900, 1050, 1200, 1350, 1500, 1650, 1800, 2000];
function _currentBadgeMin(elo) {
  return [..._BADGE_MINS].reverse().find(m => elo >= m) ?? 0;
}

// ─── SHARED MICRO-STYLES ────────────────────────────────────────────────────
// Tiny helpers so we don't repeat long style objects everywhere.

const S = {
  label: {
    fontFamily: 'var(--fM)',
    fontSize:   '.52rem',
    color:      'var(--muted)',
    textTransform: 'uppercase',
    letterSpacing: '.12em',
    marginBottom:  8,
  },
  mono: {
    fontFamily: 'var(--fM)',
    fontSize:   '.6rem',
  },
  cinzel: (size = '.9rem') => ({
    fontFamily:    'var(--fH)',
    fontSize:       size,
    letterSpacing: '.08em',
  }),
  card: {
    borderRadius:  8,
    border:        '1px solid var(--bd)',
    padding:       '14px 16px',
    background:    'var(--s2)',
    marginBottom:  16,
  },
  pill: (color) => ({
    fontFamily:    'var(--fM)',
    fontSize:      '.5rem',
    letterSpacing: '.1em',
    textTransform: 'uppercase',
    background:    `${color}18`,
    color:          color,
    border:        `1px solid ${color}44`,
    borderRadius:   20,
    padding:       '3px 9px',
    display:       'inline-flex',
    alignItems:    'center',
    gap:            4,
  }),
};

// ─── 1. RANK TREND CARD ─────────────────────────────────────────────────────

/**
 * Displays the last ≤10 match results as two visual rows:
 *   – W/L/D coloured letter strip
 *   – ELO delta sequence (±N)
 * Plus a trailing trend arrow (▲/▼/—) based on net delta over those matches.
 *
 * @param {{ history: Array<{result:string, eloDelta:number}> }} props
 *   Uses `user.history` directly — no schema changes required.
 */
export function RankTrendCard({ history = [] }) {
  const recent = history.slice(0, 10);
  if (recent.length === 0) return null;

  const netDelta = recent.reduce((sum, d) => sum + (d.eloDelta || 0), 0);
  const wins     = recent.filter(d => d.result === 'win').length;
  const losses   = recent.filter(d => d.result === 'loss').length;

  const trendArrow = netDelta > 5  ? { icon: '▲', color: 'var(--G)', label: 'En progression' }
                   : netDelta < -5 ? { icon: '▼', color: 'var(--B)', label: 'En déclin' }
                   :                 { icon: '—', color: 'var(--muted)', label: 'Stable' };

  const resultColor = r =>
    r === 'win'  ? 'var(--G)' :
    r === 'loss' ? 'var(--B)' :
                   'var(--muted)';

  const resultLetter = r =>
    r === 'win'  ? 'V' :
    r === 'loss' ? 'D' :
                   'N';

  return (
    <div style={{ ...S.card, marginBottom: 16 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <div style={S.label}>📈 Tendance récente ({recent.length} matchs)</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
          <span style={{ ...S.mono, color: trendArrow.color, fontSize: '.8rem' }}>{trendArrow.icon}</span>
          <span style={{ ...S.mono, color: trendArrow.color }}>{trendArrow.label}</span>
        </div>
      </div>

      {/* W/L/D letter strip */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 10, flexWrap: 'wrap' }}>
        {recent.map((d, i) => (
          <div
            key={i}
            title={`vs ${d.vs || '?'} · ${d.eloDelta >= 0 ? '+' : ''}${d.eloDelta}`}
            style={{
              width:          22,
              height:         22,
              borderRadius:   4,
              display:        'flex',
              alignItems:     'center',
              justifyContent: 'center',
              fontFamily:     'var(--fM)',
              fontSize:       '.58rem',
              fontWeight:     600,
              color:          resultColor(d.result),
              background:     `${resultColor(d.result)}18`,
              border:         `1px solid ${resultColor(d.result)}33`,
              cursor:         'default',
            }}
          >
            {resultLetter(d.result)}
          </div>
        ))}
      </div>

      {/* ELO delta sequence */}
      <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginBottom: 12 }}>
        {recent.map((d, i) => (
          <span
            key={i}
            style={{
              ...S.mono,
              fontSize: '.54rem',
              color:    (d.eloDelta || 0) >= 0 ? 'var(--G)' : 'var(--B)',
              minWidth: 28,
              textAlign: 'center',
              background: (d.eloDelta || 0) >= 0 ? 'rgba(62,140,96,.08)' : 'rgba(140,62,62,.08)',
              borderRadius: 3,
              padding: '2px 4px',
            }}
          >
            {(d.eloDelta || 0) >= 0 ? '+' : ''}{d.eloDelta || 0}
          </span>
        ))}
      </div>

      {/* Summary stats */}
      <div style={{ display: 'flex', gap: 16, paddingTop: 10, borderTop: '1px solid var(--bd)' }}>
        {[
          { label: 'Net ELO', value: `${netDelta >= 0 ? '+' : ''}${netDelta}`, color: netDelta >= 0 ? 'var(--G)' : 'var(--B)' },
          { label: 'Victoires', value: wins,             color: 'var(--G)' },
          { label: 'Défaites',  value: losses,           color: 'var(--B)' },
          { label: 'Taux',      value: `${recent.length ? Math.round((wins / recent.length) * 100) : 0}%`, color: 'var(--A)' },
        ].map(({ label, value, color }) => (
          <div key={label} style={{ textAlign: 'center', flex: 1 }}>
            <div style={{ ...S.cinzel('.9rem'), color }}>{value}</div>
            <div style={{ ...S.mono, fontSize: '.5rem', color: 'var(--muted)', marginTop: 2 }}>{label}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── 2. PROMOTION INDICATOR ─────────────────────────────────────────────────

/**
 * Shows the ELO gap to the next badge/rank.
 * Pulses with a gold glow when within 50 points (promotion zone).
 *
 * Receives pre-computed values from ProfilePage (which has getBadge/getNextB in scope)
 * so this component stays decoupled from the BADGES array.
 *
 * @param {{
 *   elo:           number,
 *   nextMin:       number|null,   – getNextB(elo)?.min
 *   nextLabel:     string|null,   – getNextB(elo)?.label
 *   nextColor:     string|null,   – getNextB(elo)?.color
 *   nextIcon:      string|null,   – getNextB(elo)?.icon
 * }} props
 */
export function PromotionIndicator({ elo, nextMin, nextLabel, nextColor, nextIcon }) {
  if (!nextMin || !nextLabel) {
    // Already at maximum rank
    return (
      <div style={{ ...S.pill('var(--Y)'), padding: '5px 12px', display: 'inline-flex', marginTop: 10 }}>
        ⭐ Rang maximum atteint
      </div>
    );
  }

  const gap          = nextMin - elo;
  const inZone       = gap <= 50;
  // Use the actual current-badge floor so the bar reflects real progress.
  const currentMin   = _currentBadgeMin(elo);
  const range        = (nextMin - currentMin) || 1;
  const pct          = Math.max(0, Math.min(100, Math.round(((elo - currentMin) / range) * 100)));
  const barColor     = inZone ? 'var(--Y)' : (nextColor || 'var(--A)');

  return (
    <div
      style={{
        ...S.card,
        marginTop:   0,
        marginBottom: 0,
        borderColor: inZone ? 'rgba(198,161,91,.45)' : 'var(--bd)',
        background:  inZone ? 'rgba(198,161,91,.05)' : 'var(--s2)',
        boxShadow:   inZone ? '0 0 18px rgba(198,161,91,.18)' : 'none',
        transition:  'all .3s',
      }}
    >
      {/* Top row */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
        <div style={S.label}>
          {inZone ? '🔥 Zone de promotion' : '🎯 Prochain rang'}
        </div>
        {inZone && (
          <span style={{ ...S.pill('var(--Y)'), animation: 'pulse 1.5s infinite' }}>
            ● Zone active
          </span>
        )}
      </div>

      {/* Target */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
        <span style={{ fontSize: '1.2rem' }}>{nextIcon || '🏆'}</span>
        <div>
          <div style={{ ...S.cinzel('.82rem'), color: nextColor || 'var(--A)' }}>{nextLabel}</div>
          <div style={{ ...S.mono, fontSize: '.54rem', color: 'var(--muted)', marginTop: 2 }}>
            {elo} ELO actuel · {nextMin} ELO requis
          </div>
        </div>
        <div style={{ marginLeft: 'auto', textAlign: 'right' }}>
          <div style={{ ...S.cinzel('1.1rem'), color: inZone ? 'var(--Y)' : 'var(--txt)' }}>
            {gap}
          </div>
          <div style={{ ...S.mono, fontSize: '.5rem', color: 'var(--muted)' }}>points restants</div>
        </div>
      </div>

      {/* Progress bar */}
      <div style={{ height: 5, borderRadius: 3, background: 'var(--s3)', overflow: 'hidden' }}>
        <div
          style={{
            height:     '100%',
            width:      `${Math.min(100, pct)}%`,
            background: barColor,
            borderRadius: 3,
            transition: 'width .6s ease',
          }}
        />
      </div>
      <div style={{ ...S.mono, fontSize: '.5rem', color: 'var(--muted)', marginTop: 4, textAlign: 'right' }}>
        {pct}% vers {nextLabel}
      </div>
    </div>
  );
}

// ─── 3. REPUTATION BADGE ────────────────────────────────────────────────────

/**
 * Computes the player's percentile from the leaderboard array and renders
 * a coloured percentile badge (Top 10% / Top 25% / Top 50% / etc.).
 *
 * Pure computation — no writes, no side effects.
 *
 * @param {{
 *   userId:      string,
 *   userElo:     number,
 *   leaderboard: Array<{id:string, elo:number}>
 * }} props
 */
export function ReputationBadge({ userId, userElo, leaderboard = [] }) {
  if (leaderboard.length === 0) return null;

  // Memoize the sort so it doesn't run on every parent re-render.
  const sorted     = useMemo(() => [...leaderboard].sort((a, b) => b.elo - a.elo), [leaderboard]);
  const rankIndex  = sorted.findIndex(p => p.elo <= userElo);
  const rank       = rankIndex === -1 ? sorted.length + 1 : rankIndex + 1;
  const total      = sorted.length;
  const percentile = total > 0 ? Math.round((rank / total) * 100) : 100;

  const band =
    percentile <= 5  ? { label: 'Top 5%',  color: '#FFD700', icon: '👑', bg: 'rgba(255,215,0,.1)' } :
    percentile <= 10 ? { label: 'Top 10%', color: '#C084FC', icon: '💜', bg: 'rgba(192,132,252,.1)' } :
    percentile <= 25 ? { label: 'Top 25%', color: '#60A5FA', icon: '🔵', bg: 'rgba(96,165,250,.1)' } :
    percentile <= 50 ? { label: 'Top 50%', color: '#4ADE80', icon: '🟢', bg: 'rgba(74,222,128,.1)' } :
                       { label: `Top ${percentile}%`, color: 'var(--muted)', icon: '⚪', bg: 'transparent' };

  return (
    <div
      style={{
        display:    'flex',
        alignItems: 'center',
        gap:        10,
        padding:    '10px 14px',
        background:  band.bg,
        border:     `1px solid ${band.color}33`,
        borderRadius: 8,
        marginBottom: 16,
      }}
    >
      <span style={{ fontSize: '1.4rem' }}>{band.icon}</span>
      <div style={{ flex: 1 }}>
        <div style={{ ...S.cinzel('.78rem'), color: band.color }}>{band.label} mondial</div>
        <div style={{ ...S.mono, fontSize: '.54rem', color: 'var(--muted)', marginTop: 2 }}>
          Rang #{rank} sur {total} débatteurs classés · {userElo} ELO
        </div>
      </div>
      <div
        style={{
          ...S.mono,
          fontSize:  '.9rem',
          color:      band.color,
          fontWeight: 700,
          background: `${band.color}14`,
          border:     `1px solid ${band.color}33`,
          borderRadius: 6,
          padding:    '4px 10px',
        }}
      >
        #{rank}
      </div>
    </div>
  );
}

// ─── 4. PEAK RATING CARD ────────────────────────────────────────────────────

/**
 * Displays current ELO alongside the personal best (peak_elo).
 * Shows a "Record personnel !" badge when they match.
 *
 * peak_elo is updated in handleEndDebate (App.jsx) and persisted via saveUser.
 * This component is purely display.
 *
 * @param {{ elo: number, peakElo: number }} props
 *   peakElo falls back to elo if the field doesn't exist yet (first run).
 */
export function PeakRatingCard({ elo, peakElo }) {
  const peak       = peakElo ?? elo ?? 1000;
  const isAtPeak   = elo >= peak;
  const gapToPeak  = peak - elo;

  return (
    <div style={{ ...S.card, marginBottom: 0 }}>
      <div style={S.label}>⚡ ELO personnel</div>

      <div style={{ display: 'flex', gap: 0 }}>
        {/* Current */}
        <div style={{ flex: 1, textAlign: 'center', padding: '6px 0' }}>
          <div style={{ ...S.cinzel('1.6rem'), color: 'var(--Y)', lineHeight: 1 }}>{elo}</div>
          <div style={{ ...S.mono, fontSize: '.5rem', color: 'var(--muted)', marginTop: 4 }}>ELO actuel</div>
        </div>

        {/* Divider */}
        <div style={{ width: 1, background: 'var(--bd)', margin: '4px 0' }} />

        {/* Peak */}
        <div style={{ flex: 1, textAlign: 'center', padding: '6px 0', position: 'relative' }}>
          {isAtPeak && (
            <div
              style={{
                position:   'absolute',
                top:        -8,
                left:       '50%',
                transform:  'translateX(-50%)',
                ...S.pill('#FFD700'),
                fontSize:   '.46rem',
                whiteSpace: 'nowrap',
                padding:    '2px 7px',
              }}
            >
              ★ Record
            </div>
          )}
          <div
            style={{
              ...S.cinzel('1.6rem'),
              color:      isAtPeak ? '#FFD700' : 'var(--muted)',
              lineHeight: 1,
            }}
          >
            {peak}
          </div>
          <div style={{ ...S.mono, fontSize: '.5rem', color: 'var(--muted)', marginTop: 4 }}>
            Record personnel
          </div>
        </div>
      </div>

      {/* Gap message */}
      {!isAtPeak && (
        <div
          style={{
            ...S.mono,
            fontSize:   '.56rem',
            color:      'var(--muted)',
            textAlign:  'center',
            marginTop:   10,
            paddingTop:  8,
            borderTop:  '1px solid var(--bd)',
          }}
        >
          À <strong style={{ color: 'var(--txt)' }}>{gapToPeak} points</strong> de votre record personnel
        </div>
      )}
    </div>
  );
}

// ─── 5. REMATCH BUTTON ──────────────────────────────────────────────────────

/**
 * Lightweight "Revanche" CTA shown on lost match rows in the history list.
 * On click:
 *   1. Stores a rematch request in localStorage under `dix_rematches_v1`
 *      (completely isolated key — no conflict with any existing storage)
 *   2. Calls the optional onRematch(match) callback (ProfilePage handles routing)
 *   3. Toggles to "Envoyé ✓" for visual feedback
 *
 * Only renders when match.result === 'loss'.
 * Does NOT modify ELO, user state, or any Supabase tables.
 *
 * Rematch request shape (stored in localStorage array):
 *   {
 *     id:                string,   – uid
 *     rematch_of_vs:     string,   – match.vs (opponent name)
 *     rematch_of_topic:  string,   – match.topic
 *     requester_result:  'loss',
 *     status:            'pending' | 'accepted' | 'declined',
 *     created_at:        number,   – Date.now()
 *   }
 *
 * @param {{
 *   match:     { id:string, result:string, vs:string, topic:string },
 *   onRematch: (match: object) => void,
 * }} props
 */
export function RematchButton({ match, onRematch }) {
  const [sent, setSent] = useState(false);

  // Only show on losses
  if (!match || match.result !== 'loss') return null;

  const handleClick = useCallback(() => {
    if (sent) return;

    // Store lightweight rematch request — completely isolated
    try {
      const key      = 'dix_rematches_v1';
      const existing = JSON.parse(localStorage.getItem(key) || '[]');
      const request  = {
        id:               `RM-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        rematch_of_vs:    match.vs    || 'Adversaire',
        rematch_of_topic: match.topic || '',
        requester_result: 'loss',
        status:           'pending',
        created_at:       Date.now(),
      };
      localStorage.setItem(key, JSON.stringify([request, ...existing].slice(0, 20)));
    } catch { /* quota full — ignore, feature is optional */ }

    setSent(true);
    if (typeof onRematch === 'function') onRematch(match);
  }, [match, onRematch, sent]);

  return (
    <button
      onClick={handleClick}
      disabled={sent}
      style={{
        fontFamily:   'var(--fM)',
        fontSize:     '.5rem',
        letterSpacing:'.06em',
        padding:      '3px 9px',
        borderRadius:  4,
        border:       sent ? '1px solid var(--G)' : '1px solid var(--O)',
        background:   sent ? 'rgba(62,140,96,.08)' : 'rgba(160,90,44,.07)',
        color:        sent ? 'var(--G)' : 'var(--O)',
        cursor:       sent ? 'default' : 'pointer',
        whiteSpace:   'nowrap',
        transition:   'all .2s',
        flexShrink:    0,
      }}
      title={sent ? 'Demande de revanche envoyée' : `Lancer une revanche contre ${match.vs || 'cet adversaire'}`}
    >
      {sent ? '✓ Envoyé' : '🔄 Revanche'}
    </button>
  );
}
