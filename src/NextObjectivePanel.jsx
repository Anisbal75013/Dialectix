/**
 * NextObjectivePanel — Dialectix retention feature
 *
 * Post-debate panel showing user's next objectives and action buttons.
 * Rules:
 *  - No "Revanche" button (cannot debate the same topic twice)
 *  - Buttons: Entraînement | Voir rapport
 */

/* ── Topic-deduplication helpers (localStorage) ──────────────────────────── */
export function hasUserDebatedTopic(userId, topicId) {
  if (!userId || !topicId) return false;
  try {
    const store = JSON.parse(localStorage.getItem('dx_debated_topics') || '{}');
    return !!(store[userId] || []).includes(String(topicId));
  } catch { return false; }
}

export function markUserDebatedTopic(userId, topicId) {
  if (!userId || !topicId) return;
  try {
    const store = JSON.parse(localStorage.getItem('dx_debated_topics') || '{}');
    const existing = store[userId] || [];
    if (!existing.includes(String(topicId))) {
      store[userId] = [...existing, String(topicId)];
      localStorage.setItem('dx_debated_topics', JSON.stringify(store));
    }
  } catch { /* ignore */ }
}

/* ── Component ──────────────────────────────────────────────────────────── */
export default function NextObjectivePanel({
  user, isWin, isDraw, nextBadge, pointsNeeded,
  weakCritLabel, onTrain, onScrollToReport, report,
}) {
  if (!user) return null;

  const streak   = user.streak || 0;
  const headline = isWin
    ? streak >= 2 ? `Série en cours · ${streak} victoires consécutives 🔥` : 'Bonne performance — continuez sur cette lancée.'
    : isDraw
      ? 'Débat serré — un effort supplémentaire suffit.'
      : 'Chaque défaite est une leçon. Rebondissez.';

  return (
    <div style={{ background: 'linear-gradient(160deg,rgba(44,74,110,.04),rgba(198,161,91,.03))', border: '1px solid var(--bd)', borderRadius: 10, padding: '20px 24px', boxShadow: 'var(--sh)' }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 18 }}>
        <span style={{ fontSize: '1.3rem' }}>{isWin ? '🎯' : isDraw ? '⚖️' : '📈'}</span>
        <div>
          <div style={{ fontFamily: 'var(--fH)', fontSize: '.82rem', color: 'var(--txt)', letterSpacing: '.03em' }}>Prochains objectifs</div>
          <div style={{ fontFamily: 'var(--fM)', fontSize: '.56rem', color: 'var(--muted)', marginTop: 2 }}>{headline}</div>
        </div>
      </div>

      {/* Objectives list */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 20 }}>
        <ObjRow icon="🎯" label="Priorité d'amélioration" value={`Renforcer : ${weakCritLabel}`} color="var(--B)"/>
        {nextBadge && (
          <ObjRow
            icon="⬆"
            label="Prochain rang"
            value={pointsNeeded <= 0
              ? `Rang ${nextBadge.label} déjà atteint !`
              : `Encore ${pointsNeeded} pt${pointsNeeded > 1 ? 's' : ''} pour ${nextBadge.icon} ${nextBadge.label}`}
            color="var(--Y)"
          />
        )}
        {!isWin && (
          <ObjRow icon="🏅" label="Objectif victoire" value="Débattez sur un nouveau sujet pour progresser" color="var(--G)"/>
        )}
        {report?.rec_a && (
          <ObjRow icon="💡" label="Conseil de l'arbitre IA" value={report.rec_a} color="var(--A)"/>
        )}
      </div>

      {/* Action buttons — No "Revanche": same topic cannot be replayed */}
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
        <ActBtn onClick={onTrain} primary label="🧠 Entraînement"/>
        <ActBtn onClick={onScrollToReport || (() => window.scrollTo({ top: 0, behavior: 'smooth' }))} label="📊 Voir rapport"/>
      </div>

      {/* Rule reminder */}
      <div style={{ marginTop: 14, fontFamily: 'var(--fM)', fontSize: '.52rem', color: 'var(--muted)', letterSpacing: '.04em' }}>
        ℹ Chaque sujet ne peut être débattu qu'une seule fois par joueur.
      </div>
    </div>
  );
}

/* ── Sub-components ──────────────────────────────────────────────────────── */

function ObjRow({ icon, label, value, color }) {
  return (
    <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start', padding: '10px 14px', background: 'rgba(253,250,244,.6)', border: '1px solid var(--bd)', borderLeft: `3px solid ${color}`, borderRadius: 7 }}>
      <span style={{ fontSize: '.9rem', flexShrink: 0, marginTop: 1 }}>{icon}</span>
      <div>
        <div style={{ fontFamily: 'var(--fM)', fontSize: '.52rem', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: 3 }}>{label}</div>
        <div style={{ fontFamily: 'var(--fB)', fontSize: '.76rem', color: 'var(--txt)', lineHeight: 1.5 }}>{value}</div>
      </div>
    </div>
  );
}

function ActBtn({ onClick, label, primary }) {
  return (
    <button
      onClick={onClick}
      style={{ fontFamily: 'var(--fH)', fontSize: '.68rem', letterSpacing: '.06em', padding: '9px 18px', borderRadius: 7, border: primary ? 'none' : '1px solid var(--bd)', background: primary ? 'var(--A)' : 'rgba(253,250,244,.8)', color: primary ? '#fff' : 'var(--txt)', cursor: 'pointer', flexShrink: 0, transition: 'opacity .15s, transform .15s' }}
      onMouseEnter={e => { e.currentTarget.style.opacity = '.82'; e.currentTarget.style.transform = 'translateY(-1px)'; }}
      onMouseLeave={e => { e.currentTarget.style.opacity = '1';   e.currentTarget.style.transform = 'translateY(0)'; }}
    >
      {label}
    </button>
  );
}
