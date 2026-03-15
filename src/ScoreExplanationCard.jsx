/**
 * ScoreExplanationCard — Dialectix retention feature
 *
 * Reads existing score breakdown to show why user won/lost.
 * NO scoring logic modified. Pure display component.
 */

const CRITERIA_META = [
  { key: 'relevance', label: 'Pertinence', weight: .25 },
  { key: 'logic',     label: 'Logique',    weight: .28 },
  { key: 'evidence',  label: 'Preuves',    weight: .22 },
  { key: 'rebuttal',  label: 'Réfutation', weight: .15 },
  { key: 'clarity',   label: 'Clarté',     weight: .10 },
];

const WEAK_REASONS = {
  relevance: 'Vos arguments manquaient de lien direct avec le sujet central du débat.',
  logic:     'Votre raisonnement présentait des lacunes logiques exploitables par l\'adversaire.',
  evidence:  'Vos arguments reposaient trop peu sur des preuves concrètes ou vérifiables.',
  rebuttal:  "Vous n'avez pas suffisamment réfuté les arguments de votre adversaire.",
  clarity:   'Vos arguments manquaient de clarté et de structure explicite.',
};

const IMPROVEMENT_ADVICE = {
  relevance: 'Ancrez chaque argument dans le sujet central — une phrase de lien explicite suffit.',
  logic:     'Structurez : prémisse → développement → conclusion. Une idée par argument.',
  evidence:  'Ajoutez un exemple concret, une donnée chiffrée ou une source vérifiable à chaque point.',
  rebuttal:  "Répondez directement à l'argument adverse avant d'avancer le vôtre.",
  clarity:   'Utilisez des phrases courtes. Une idée par argument.',
};

const STRONG_MSGS = {
  relevance: 'Vos arguments étaient parfaitement centrés sur le sujet du débat.',
  logic:     'Votre logique était rigoureuse et difficile à contester.',
  evidence:  'Vos preuves étaient solides et bien choisies.',
  rebuttal:  'Vous avez efficacement démonté les arguments adverses.',
  clarity:   'Votre expression était claire, structurée et percutante.',
};

export default function ScoreExplanationCard({ sUser, sOpp, isWin, isDraw }) {
  const diffs = CRITERIA_META.map(c => ({
    ...c,
    userVal: sUser[c.key] ?? 5,
    oppVal:  sOpp[c.key]  ?? 5,
    gap:     (sOpp[c.key] ?? 5) - (sUser[c.key] ?? 5),
  }));

  const weakest  = diffs.reduce((w, c) => c.gap  > w.gap      ? c : w, diffs[0]);
  const strongest= diffs.reduce((s, c) => c.userVal > s.userVal ? c : s, diffs[0]);

  const ac = isWin ? 'var(--G)' : isDraw ? 'var(--Y)' : 'var(--B)';
  const bg = isWin ? 'rgba(58,110,82,.05)' : isDraw ? 'rgba(198,161,91,.06)' : 'rgba(140,58,48,.05)';
  const bd = isWin ? 'rgba(58,110,82,.22)' : isDraw ? 'rgba(198,161,91,.28)' : 'rgba(140,58,48,.2)';

  return (
    <div style={{ background: bg, border: `1px solid ${bd}`, borderRadius: 10, padding: '20px 24px', boxShadow: 'var(--sh)' }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
        <div style={{ width: 28, height: 28, borderRadius: '50%', background: ac+'18', border: `1px solid ${ac}44`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '.88rem', flexShrink: 0 }}>
          {isWin ? '✦' : isDraw ? '═' : '▼'}
        </div>
        <div>
          <div style={{ fontFamily: 'var(--fH)', fontSize: '.78rem', color: 'var(--txt)', letterSpacing: '.04em' }}>
            {isWin ? 'Votre point fort décisif' : isDraw ? 'Résultat équilibré' : 'Votre point faible principal'}
          </div>
          <div style={{ fontFamily: 'var(--fM)', fontSize: '.54rem', color: 'var(--muted)', marginTop: 2 }}>
            Basé sur la décomposition des 5 critères d'évaluation
          </div>
        </div>
      </div>

      {/* Criteria comparison bars */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 7, marginBottom: 18 }}>
        {diffs.map(c => {
          const hi = isWin ? c.key === strongest.key : c.key === weakest.key;
          return (
            <div key={c.key}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
                <span style={{ fontFamily: 'var(--fM)', fontSize: '.56rem', color: hi ? ac : 'var(--muted)', fontWeight: hi ? 700 : 400, letterSpacing: '.04em' }}>
                  {c.label}{hi ? ' ◀' : ''}
                </span>
                <span style={{ fontFamily: 'var(--fH)', fontSize: '.62rem', color: 'var(--dim)' }}>
                  {c.userVal.toFixed(1)}{' '}
                  <span style={{ color: 'var(--muted)', fontFamily: 'var(--fM)', fontSize: '.54rem' }}>/ {c.oppVal.toFixed(1)}</span>
                </span>
              </div>
              <div style={{ position: 'relative', height: 5, background: 'var(--s2)', borderRadius: 3 }}>
                {/* Opponent bar (faint background) */}
                <div style={{ position: 'absolute', left: 0, top: 0, height: '100%', width: `${(c.oppVal/10)*100}%`, background: 'rgba(140,58,48,.15)', borderRadius: 3 }}/>
                {/* User bar */}
                <div style={{ position: 'absolute', left: 0, top: 0, height: '100%', width: `${(c.userVal/10)*100}%`, background: hi ? ac : 'rgba(44,74,110,.5)', borderRadius: 3, transition: 'width .4s ease' }}/>
              </div>
            </div>
          );
        })}
      </div>

      {/* Explanation + advice */}
      <div style={{ background: 'rgba(253,250,244,.7)', border: '1px solid var(--bd)', borderLeft: `3px solid ${ac}`, borderRadius: 7, padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: 8 }}>
        <p style={{ fontFamily: 'var(--fB)', fontSize: '.76rem', color: 'var(--txt)', lineHeight: 1.65, margin: 0 }}>
          {isWin
            ? STRONG_MSGS[strongest.key]
            : isDraw
              ? "Débat très serré — aucune faiblesse marquée d'un côté ou de l'autre."
              : WEAK_REASONS[weakest.key]}
        </p>
        {!isWin && !isDraw && (
          <p style={{ fontFamily: 'var(--fM)', fontSize: '.7rem', color: 'var(--dim)', lineHeight: 1.6, margin: 0, paddingTop: 8, borderTop: '1px dashed var(--bd)' }}>
            <span style={{ color: ac, fontWeight: 700 }}>→ </span>
            {IMPROVEMENT_ADVICE[weakest.key]}
          </p>
        )}
      </div>
    </div>
  );
}
