/**
 * RankProgressCard — Dialectix retention feature
 *
 * Displays rank progression motivation between current and next rank.
 * Reads only existing BADGES data and ELO — no logic changed.
 *
 * Props:
 *   elo           number
 *   currentBadge  { icon, label, color, min }
 *   nextBadge     { icon, label, color, min } | null
 *   pct           number  0-100
 */
export default function RankProgressCard({ elo, currentBadge, nextBadge, pct }) {
  if (!currentBadge) return null;

  const isMax       = !nextBadge;
  const pointsNeeded = nextBadge ? Math.max(0, nextBadge.min - elo) : 0;
  const tierRange    = nextBadge ? nextBadge.min - currentBadge.min : 1;
  const pointsIn     = Math.max(0, elo - currentBadge.min);

  return (
    <div style={{ background: '#FDFAF4', border: '1px solid var(--bd2)', borderRadius: 10, padding: '20px 24px', boxShadow: 'var(--sh)' }}>

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
        <div>
          <div style={{ fontFamily: 'var(--fH)', fontSize: '.78rem', color: 'var(--txt)', letterSpacing: '.04em' }}>Progression de rang</div>
          <div style={{ fontFamily: 'var(--fM)', fontSize: '.54rem', color: 'var(--muted)', marginTop: 2 }}>
            {isMax ? 'Rang maximum atteint — vous êtes au sommet.' : `${pct}% du chemin vers ${nextBadge.label}`}
          </div>
        </div>
        <div style={{ fontFamily: 'var(--fH)', fontSize: '1.1rem', color: 'var(--Y)' }}>
          {elo} <span style={{ fontSize: '.52rem', color: 'var(--muted)', fontFamily: 'var(--fM)' }}>ELO</span>
        </div>
      </div>

      {/* Rank display row */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
        <BadgeBox badge={currentBadge} active/>

        <div style={{ flex: 1, textAlign: 'center' }}>
          {isMax ? (
            <div style={{ fontSize: '1.3rem' }}>⭐</div>
          ) : (
            <>
              <div style={{ fontFamily: 'var(--fM)', fontSize: '.54rem', color: 'var(--muted)', marginBottom: 2 }}>encore</div>
              <div style={{ fontFamily: 'var(--fH)', fontSize: '1.2rem', color: 'var(--Y)', lineHeight: 1 }}>{pointsNeeded}</div>
              <div style={{ fontFamily: 'var(--fM)', fontSize: '.5rem', color: 'var(--muted)', marginTop: 2 }}>pt{pointsNeeded > 1 ? 's' : ''}</div>
              <div style={{ fontSize: '.8rem', color: 'var(--bd3)', marginTop: 4 }}>→</div>
            </>
          )}
        </div>

        {nextBadge ? (
          <BadgeBox badge={nextBadge} active={false}/>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '10px 16px', background: 'rgba(198,161,91,.08)', border: '1px solid rgba(198,161,91,.25)', borderRadius: 8, minWidth: 80, textAlign: 'center' }}>
            <span style={{ fontFamily: 'var(--fH)', fontSize: '.62rem', color: 'var(--Y)', letterSpacing: '.03em' }}>Palier max</span>
            <span style={{ fontFamily: 'var(--fM)', fontSize: '.48rem', color: 'var(--muted)', marginTop: 4 }}>Continuez à grimper</span>
          </div>
        )}
      </div>

      {/* Progress bar */}
      {!isMax && (
        <div>
          <div style={{ height: 7, background: 'var(--s2)', borderRadius: 4, overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${pct}%`, background: `linear-gradient(90deg,${currentBadge.color || 'var(--Y)'}88,${nextBadge?.color || 'var(--Y)'}cc)`, borderRadius: 4, transition: 'width .6s ease' }}/>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4 }}>
            <span style={{ fontFamily: 'var(--fM)', fontSize: '.5rem', color: 'var(--muted)' }}>{pointsIn} pts gagnés</span>
            <span style={{ fontFamily: 'var(--fM)', fontSize: '.5rem', color: 'var(--muted)' }}>{pct}%</span>
            <span style={{ fontFamily: 'var(--fM)', fontSize: '.5rem', color: 'var(--muted)' }}>{tierRange} pts total</span>
          </div>
        </div>
      )}
    </div>
  );
}

function BadgeBox({ badge, active }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '10px 16px', background: `${badge.color || 'rgba(198,161,91,.1)'}14`, border: `1px ${active ? 'solid' : 'dashed'} ${badge.color || 'rgba(198,161,91,.3)'}44`, borderRadius: 8, minWidth: 80, textAlign: 'center', opacity: active ? 1 : .65 }}>
      <span style={{ fontSize: '1.6rem', lineHeight: 1, filter: active ? 'none' : 'grayscale(.4)' }}>{badge.icon}</span>
      <span style={{ fontFamily: 'var(--fH)', fontSize: '.62rem', color: badge.color || 'var(--Y)', marginTop: 5, letterSpacing: '.03em' }}>{badge.label}</span>
      <span style={{ fontFamily: 'var(--fM)', fontSize: '.48rem', color: 'var(--muted)', marginTop: 2 }}>{badge.min} ELO</span>
    </div>
  );
}
