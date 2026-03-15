/**
 * GuidesPage.jsx — Dialectix
 *
 * Static guide page for new beta testers.
 * Route: page='guides'  |  Nav: 📘 Guides
 */

const SECTION_STYLE = {
  background:   '#FDFAF4',
  border:       '1px solid var(--bd)',
  borderRadius: 10,
  padding:      '24px 28px',
  boxShadow:    'var(--sh)',
  marginBottom: 16,
};

const HEADING = {
  fontFamily:    'var(--fH)',
  fontSize:      '.92rem',
  letterSpacing: '.08em',
  color:         'var(--txt)',
  marginBottom:  14,
  display:       'flex',
  alignItems:    'center',
  gap:           10,
};

const BODY = {
  fontFamily: 'var(--fB)',
  fontSize:   '.8rem',
  color:      'var(--dim)',
  lineHeight: 1.75,
  margin:     0,
};

const STEP = {
  display:        'flex',
  gap:            14,
  alignItems:     'flex-start',
  padding:        '10px 0',
  borderBottom:   '1px dashed var(--bd)',
};

const PILL = {
  flexShrink:    0,
  width:         28,
  height:        28,
  borderRadius:  '50%',
  background:    'rgba(44,74,110,.1)',
  border:        '1px solid rgba(44,74,110,.25)',
  display:       'flex',
  alignItems:    'center',
  justifyContent:'center',
  fontFamily:    'var(--fH)',
  fontSize:      '.7rem',
  color:         'var(--A)',
  marginTop:     2,
};

export default function GuidesPage({ setPage }) {
  return (
    <div style={{ maxWidth: 820, margin: '0 auto', padding: '36px 20px', fontFamily: 'var(--fB)' }}>

      {/* ── Page header ─────────────────────────────────────────────────── */}
      <div style={{ marginBottom: 32 }}>
        <div style={{ fontFamily: 'var(--fH)', fontSize: '1.4rem', letterSpacing: '.16em', color: 'var(--txt)', marginBottom: 8 }}>
          📘 GUIDES <span style={{ color: 'var(--Y)' }}>DIALECTIX</span>
        </div>
        <div style={{ fontFamily: 'var(--fM)', fontSize: '.62rem', color: 'var(--muted)', letterSpacing: '.06em' }}>
          Tout ce que vous devez savoir pour débattre, progresser et gagner.
        </div>
      </div>

      {/* ── SECTION 1 — Qu'est-ce que Dialectix ? ───────────────────────── */}
      <div style={SECTION_STYLE}>
        <div style={HEADING}>
          <span style={{ fontSize: '1.2rem' }}>⚔️</span>
          <span>Qu'est-ce que Dialectix ?</span>
        </div>
        <p style={BODY}>
          Dialectix est une plateforme de <strong>débat compétitif</strong> où vos arguments sont analysés en temps réel par une IA.
          Chaque échange est noté sur 5 critères : pertinence, logique, preuves, réfutation et clarté.
        </p>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginTop: 16 }}>
          {[
            { icon: '🤖', label: 'Analyse IA',         desc: 'Chaque argument noté instantanément' },
            { icon: '🏅', label: 'Progression ELO',    desc: 'Votre rang évolue à chaque battle' },
            { icon: '📊', label: 'Rapport final',       desc: 'Compte-rendu complet après chaque débat' },
            { icon: '🏆', label: 'Tournois',            desc: 'Compétitions en temps réel entre joueurs' },
          ].map(f => (
            <div key={f.label} style={{ flex: '1 1 160px', padding: '12px 16px', background: 'rgba(44,74,110,.04)', border: '1px solid rgba(44,74,110,.15)', borderRadius: 8 }}>
              <div style={{ fontSize: '1.1rem', marginBottom: 5 }}>{f.icon}</div>
              <div style={{ fontFamily: 'var(--fH)', fontSize: '.66rem', color: 'var(--txt)', letterSpacing: '.04em', marginBottom: 3 }}>{f.label}</div>
              <div style={{ fontFamily: 'var(--fM)', fontSize: '.58rem', color: 'var(--muted)' }}>{f.desc}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ── SECTION 2 — Comment fonctionne un débat ─────────────────────── */}
      <div style={SECTION_STYLE}>
        <div style={HEADING}>
          <span style={{ fontSize: '1.2rem' }}>🎯</span>
          <span>Comment fonctionne un débat ?</span>
        </div>
        {[
          { n: '01', title: 'Choisir un sujet',        body: 'Sélectionnez un sujet parmi les propositions ou entrez le vôtre. Chaque sujet ne peut être débattu qu\'une seule fois par joueur.' },
          { n: '02', title: 'Entrer dans l\'arène',    body: 'Cliquez sur "Débuter". Le système vous associe à un adversaire humain ou, s\'il n\'y en a pas, à un bot Dialectix.' },
          { n: '03', title: 'Argumenter',              body: 'Rédigez vos arguments dans le temps imparti. Répondez directement à votre adversaire. L\'IA analyse chaque soumission.' },
          { n: '04', title: 'Recevoir le rapport IA',  body: 'À la fin du débat, un rapport détaillé est généré : scores, forces, faiblesses, conseil personnalisé et variation ELO.' },
        ].map((s, i, arr) => (
          <div key={s.n} style={{ ...STEP, borderBottom: i === arr.length - 1 ? 'none' : '1px dashed var(--bd)' }}>
            <div style={PILL}>{s.n}</div>
            <div>
              <div style={{ fontFamily: 'var(--fH)', fontSize: '.74rem', color: 'var(--txt)', letterSpacing: '.04em', marginBottom: 5 }}>{s.title}</div>
              <p style={{ ...BODY, fontSize: '.74rem' }}>{s.body}</p>
            </div>
          </div>
        ))}
      </div>

      {/* ── SECTION 3 — Règles du débat ─────────────────────────────────── */}
      <div style={SECTION_STYLE}>
        <div style={HEADING}>
          <span style={{ fontSize: '1.2rem' }}>📜</span>
          <span>Règles du débat</span>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {[
            { icon: '✅', rule: 'Argumenter clairement',         detail: 'Un argument = une idée principale. Développez-la avec logique et preuves.' },
            { icon: '✅', rule: 'Répondre à l\'adversaire',      detail: 'Ne passez pas d\'un sujet à l\'autre. Réfutez ce qui vient d\'être dit.' },
            { icon: '✅', rule: 'Rester sur le sujet',           detail: 'Tout argument hors-sujet sera pénalisé sur le critère "Pertinence".' },
            { icon: '❌', rule: 'Pas d\'attaques personnelles',  detail: 'Critiquez les arguments, jamais la personne qui les énonce.' },
            { icon: '❌', rule: 'Pas de copié-collé IA',         detail: 'Le système détecte les arguments générés par IA externe. Votre stylométrie est analysée.' },
            { icon: '❌', rule: 'Pas de spam ou de répétitions', detail: 'Répéter le même argument ne fait pas monter votre score.' },
          ].map(r => (
            <div key={r.rule} style={{ display: 'flex', gap: 12, padding: '10px 14px', background: r.icon === '✅' ? 'rgba(58,110,82,.04)' : 'rgba(140,58,48,.04)', border: `1px solid ${r.icon === '✅' ? 'rgba(58,110,82,.18)' : 'rgba(140,58,48,.18)'}`, borderRadius: 7 }}>
              <span style={{ fontSize: '.9rem', flexShrink: 0, marginTop: 1 }}>{r.icon}</span>
              <div>
                <div style={{ fontFamily: 'var(--fH)', fontSize: '.68rem', color: 'var(--txt)', letterSpacing: '.03em', marginBottom: 3 }}>{r.rule}</div>
                <div style={{ fontFamily: 'var(--fM)', fontSize: '.64rem', color: 'var(--muted)', lineHeight: 1.55 }}>{r.detail}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── SECTION 4 — Fonctionnement du tournoi ───────────────────────── */}
      <div style={SECTION_STYLE}>
        <div style={HEADING}>
          <span style={{ fontSize: '1.2rem' }}>🏆</span>
          <span>Tournoi Alpha — Comment ça marche ?</span>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(220px,1fr))', gap: 12, marginBottom: 16 }}>
          {[
            { icon: '⏱', label: 'Durée',         value: '72 heures' },
            { icon: '👥', label: 'Participants',  value: '10 joueurs max' },
            { icon: '⚔️', label: 'Battles',       value: 'Min. 5 par joueur' },
            { icon: '📊', label: 'Classement',    value: 'Par ELO en temps réel' },
            { icon: '🔁', label: 'Rematches',     value: 'Max 2 fois par paire' },
            { icon: '⏳', label: 'Cooldown',      value: '10 min entre paire' },
          ].map(i => (
            <div key={i.label} style={{ padding: '12px 16px', background: 'rgba(198,161,91,.05)', border: '1px solid rgba(198,161,91,.2)', borderRadius: 8 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 5 }}>
                <span style={{ fontSize: '.9rem' }}>{i.icon}</span>
                <span style={{ fontFamily: 'var(--fM)', fontSize: '.54rem', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '.07em' }}>{i.label}</span>
              </div>
              <div style={{ fontFamily: 'var(--fH)', fontSize: '.78rem', color: 'var(--Y)', letterSpacing: '.03em' }}>{i.value}</div>
            </div>
          ))}
        </div>
        <div style={{ padding: '12px 16px', background: 'rgba(58,110,82,.05)', border: '1px solid rgba(58,110,82,.18)', borderRadius: 8 }}>
          <div style={{ fontFamily: 'var(--fH)', fontSize: '.68rem', color: 'var(--G)', letterSpacing: '.05em', marginBottom: 8 }}>🏅 BADGES DE FIN DE TOURNOI</div>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            {['🥇 Pioneer Champion', '🥈 Dialectix Strategist', '🥉 Arena Thinker'].map(b => (
              <span key={b} style={{ fontFamily: 'var(--fM)', fontSize: '.62rem', color: 'var(--txt)', padding: '4px 12px', background: '#FDFAF4', border: '1px solid var(--bd)', borderRadius: 20 }}>{b}</span>
            ))}
          </div>
        </div>
        <p style={{ ...BODY, marginTop: 12, fontSize: '.72rem' }}>
          ⚠ Les battles contre les bots Dialectix ne comptent pas dans le classement du tournoi.
        </p>
      </div>

      {/* ── SECTION 5 — Conseils pour bien débattre ─────────────────────── */}
      <div style={SECTION_STYLE}>
        <div style={HEADING}>
          <span style={{ fontSize: '1.2rem' }}>💡</span>
          <span>Conseils pour bien débattre</span>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {[
            {
              title: 'Structurez votre argument',
              icon: '🔷',
              body: 'Utilisez la structure PPE : Prémisse → Preuve → Explication. Chaque argument doit être auto-suffisant et compréhensible sans contexte extérieur.',
              example: 'Exemple : "La démocratie directe est inefficace [Prémisse] car les décisions complexes nécessitent une expertise technique [Preuve] que le citoyen moyen ne possède pas [Explication]."',
            },
            {
              title: 'Utilisez des exemples concrets',
              icon: '📌',
              body: 'Un exemple factuel vaut dix affirmations abstraites. Citez des études, des statistiques ou des événements historiques vérifiables.',
              example: 'Exemple : "En Suisse, les votations fréquentes ont prouvé que les électeurs peuvent trancher sur des sujets complexes — taux de participation de 67% en 2023."',
            },
            {
              title: 'Répondez directement à l\'adversaire',
              icon: '⚡',
              body: 'Ne passez pas à un nouvel argument sans réfuter le précédent. L\'IA évalue spécifiquement votre capacité à contrer ce qui vient d\'être dit.',
              example: 'Exemple : "Vous affirmez que X, mais cela suppose Y — or Y est faux parce que Z."',
            },
            {
              title: 'Modulez la longueur de vos arguments',
              icon: '📏',
              body: 'Trop court = pas de développement. Trop long = perte de clarté. Visez 3 à 5 phrases pour un argument de poids, 1 à 2 pour une réfutation directe.',
              example: null,
            },
          ].map((c, i) => (
            <div key={i} style={{ padding: '14px 18px', background: i % 2 === 0 ? 'rgba(44,74,110,.03)' : 'rgba(198,161,91,.03)', border: '1px solid var(--bd)', borderLeft: `3px solid var(--${i % 2 === 0 ? 'A' : 'Y'})`, borderRadius: 8 }}>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 7 }}>
                <span style={{ fontSize: '.9rem' }}>{c.icon}</span>
                <div style={{ fontFamily: 'var(--fH)', fontSize: '.72rem', color: 'var(--txt)', letterSpacing: '.03em' }}>{c.title}</div>
              </div>
              <p style={{ ...BODY, fontSize: '.73rem' }}>{c.body}</p>
              {c.example && (
                <p style={{ fontFamily: 'var(--fC)', fontSize: '.68rem', color: 'var(--dim)', fontStyle: 'italic', lineHeight: 1.6, margin: '8px 0 0', paddingTop: 8, borderTop: '1px dashed var(--bd)' }}>
                  {c.example}
                </p>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* ── CTA ──────────────────────────────────────────────────────────── */}
      <div style={{ display: 'flex', gap: 12, justifyContent: 'center', paddingTop: 8, flexWrap: 'wrap' }}>
        <button className="btn b-a b-lg" onClick={() => setPage?.('train')}>
          🤖 Débuter vs Bot
        </button>
        <button className="btn b-ghost b-lg" onClick={() => setPage?.('tournament')}>
          🏆 Voir le tournoi
        </button>
      </div>
    </div>
  );
}
