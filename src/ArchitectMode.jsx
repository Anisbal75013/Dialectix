// ═══════════════════════════════════════════════════════════════════════════════
// DIALECTIX AI — ArchitectMode.jsx
// Mode "L'Architecte" : bâtis un argument solide
// ═══════════════════════════════════════════════════════════════════════════════
// • Chaque défi : 1 Conclusion + 4 Prémisses (2 valides, 2 sophismes)
// • Le joueur sélectionne les 2 prémisses qu'il juge valides
// • Chaque prémisse-sophisme sélectionnée → explication + perte de Solidité
// • Score final : Solidité restante (0–100) + XP
// ═══════════════════════════════════════════════════════════════════════════════

import { useState } from 'react';
import { FALLACIES } from './SophismDuel.jsx';

// ─── Challenge catalog ────────────────────────────────────────────────────────
const ARCHITECT_CHALLENGES = [
  {
    id: 'ch1',
    conclusion: "Le gouvernement devrait investir davantage dans les énergies renouvelables.",
    premises: [
      { id: 'p1', text: "Les énergies renouvelables réduisent les émissions de CO₂, contribuant ainsi à limiter le réchauffement climatique.", valid: true },
      { id: 'p2', text: "Les investissements dans le renouvelable créent des emplois locaux non délocalisables et stimulent l'économie.", valid: true },
      { id: 'p3', text: "Si on arrête d'investir dans le charbon aujourd'hui, demain toute l'industrie s'effondrera et le pays sera plongé dans le noir.", valid: false, fallacyId: 'pente_glissante', explanation: "Cette prémisse est une Pente Glissante : elle suppose une chaîne d'événements catastrophiques inévitables sans apporter de preuves pour chaque étape." },
      { id: 'p4', text: "Le ministre de l'environnement lui-même a été surpris à prendre l'avion privé — ses arguments écologiques ne valent rien.", valid: false, fallacyId: 'ad_hominem', explanation: "C'est un Ad Hominem : attaquer le comportement du ministre ne réfute pas les arguments économiques en faveur du renouvelable." },
    ],
  },
  {
    id: 'ch2',
    conclusion: "La semaine de travail de 4 jours améliorerait la productivité.",
    premises: [
      { id: 'p1', text: "Des études en Islande et en Finlande montrent une productivité stable ou améliorée avec moins d'heures travaillées.", valid: true },
      { id: 'p2', text: "Des employés moins épuisés font moins d'erreurs et sont plus créatifs sur leurs tâches.", valid: true },
      { id: 'p3', text: "Tout le monde veut travailler moins — c'est la preuve que c'est une bonne idée pour l'économie.", valid: false, fallacyId: 'appel_masse', explanation: "C'est un Appel à la Masse : la popularité d'une préférence personnelle ne démontre pas son efficacité économique." },
      { id: 'p4', text: "Soit on adopte la semaine de 4 jours, soit les employés continuent à s'épuiser jusqu'à l'effondrement de la santé publique.", valid: false, fallacyId: 'faux_dilemme', explanation: "C'est un Faux Dilemme : il existe de nombreuses options intermédiaires (horaires flexibles, télétravail, congés supplémentaires…)." },
    ],
  },
  {
    id: 'ch3',
    conclusion: "L'intelligence artificielle représente une opportunité économique majeure pour la France.",
    premises: [
      { id: 'p1', text: "La France dispose d'un vivier exceptionnel de chercheurs en IA et d'écoles d'ingénieurs de rang mondial.", valid: true },
      { id: 'p2', text: "Les secteurs de la santé, de la logistique et de la finance peuvent augmenter leur efficacité de 20 à 40% grâce à l'automatisation intelligente.", valid: true },
      { id: 'p3', text: "Un célèbre acteur hollywoodien a déclaré que l'IA allait transformer l'économie mondiale — c'est une opinion qui mérite qu'on l'écoute.", valid: false, fallacyId: 'appel_autorite', explanation: "C'est un Appel à l'Autorité hors domaine : la notoriété d'un acteur ne lui confère pas une expertise en économie de l'IA." },
      { id: 'p4', text: "Depuis qu'OpenAI a lancé ChatGPT en 2022, le cours des actions technologiques a monté — l'IA est donc responsable de cette croissance.", valid: false, fallacyId: 'post_hoc', explanation: "C'est un Post Hoc : la hausse des actions coïncide avec le lancement de ChatGPT, mais de nombreux autres facteurs expliquent cette tendance." },
    ],
  },
  {
    id: 'ch4',
    conclusion: "Le sport professionnel de haut niveau bénéficie à la société.",
    premises: [
      { id: 'p1', text: "Les grands événements sportifs génèrent des milliards en retombées économiques : tourisme, emplois, infrastructures.", valid: true },
      { id: 'p2', text: "Les sportifs professionnels servent de modèles inspirants pour les jeunes, favorisant la pratique du sport et la santé publique.", valid: true },
      { id: 'p3', text: "Les salaires des footballeurs sont scandaleux — ce ne sont que des fainéants qui courent après un ballon, leurs arguments ne comptent pas.", valid: false, fallacyId: 'ad_hominem', explanation: "C'est un Ad Hominem : attaquer la rémunération des sportifs ne réfute pas les bénéfices économiques ou sociaux du sport professionnel." },
      { id: 'p4', text: "Si on commence à critiquer les salaires des sportifs, bientôt on interdira le sport, puis les loisirs, et on vivra dans un État totalitaire.", valid: false, fallacyId: 'pente_glissante', explanation: "C'est une Pente Glissante : critiquer les salaires n'implique aucune des conséquences extrêmes décrites." },
    ],
  },
  {
    id: 'ch5',
    conclusion: "L'enseignement de la philosophie dès le primaire serait bénéfique pour les élèves.",
    premises: [
      { id: 'p1', text: "Les programmes de 'philosophie pour enfants' ont démontré une amélioration mesurable des capacités de raisonnement et d'écoute.", valid: true },
      { id: 'p2', text: "Apprendre à questionner et argumenter dès le jeune âge développe l'esprit critique, essentiel dans une société d'information.", valid: true },
      { id: 'p3', text: "J'ai interrogé cinq élèves de CM2 — ils n'avaient aucune idée de ce qu'est la philosophie, preuve que c'est inutile à cet âge.", valid: false, fallacyId: 'generalisation_hative', explanation: "C'est une Généralisation Hâtive : cinq élèves ne constituent pas un échantillon représentatif pour conclure sur l'utilité d'un enseignement." },
      { id: 'p4', text: "Soit on enseigne la philosophie à l'école primaire, soit on abandonne toute ambition d'esprit critique dans l'éducation nationale.", valid: false, fallacyId: 'faux_dilemme', explanation: "C'est un Faux Dilemme : de nombreuses approches pédagogiques développent l'esprit critique sans nécessiter la philosophie formelle." },
    ],
  },
];

// ─── Solidité bar ──────────────────────────────────────────────────────────────
function SoliditeBar({ value }) {
  const color = value >= 70 ? 'var(--G)' : value >= 40 ? 'var(--Y)' : 'var(--B)';
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
      <div style={{ flex: 1, height: 12, background: 'var(--bd)', borderRadius: 6, overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${value}%`, background: color, borderRadius: 6, transition: 'width .6s ease, background .4s' }} />
      </div>
      <div style={{ fontFamily: 'var(--fH)', fontSize: '1.1rem', color, minWidth: 48, textAlign: 'right' }}>{value}</div>
    </div>
  );
}

// ─── Premise button ───────────────────────────────────────────────────────────
function PremiseBtn({ premise, selected, revealed, locked, onSelect }) {
  const isSelected = selected.includes(premise.id);
  const isBad = revealed && isSelected && !premise.valid;
  const isGood = revealed && isSelected && premise.valid;
  const isRevealedBad = revealed && !premise.valid && !isSelected; // show bad but not selected

  let bg = '#FDFAF4';
  let border = 'var(--bd)';
  if (isGood) { bg = 'rgba(58,110,82,.08)'; border = 'rgba(58,110,82,.4)'; }
  if (isBad) { bg = 'rgba(140,58,48,.08)'; border = 'rgba(140,58,48,.4)'; }
  if (!revealed && isSelected) { bg = 'rgba(44,74,110,.07)'; border = 'var(--A)'; }
  if (isRevealedBad) { bg = 'rgba(140,58,48,.04)'; border = 'rgba(140,58,48,.2)'; }

  return (
    <div style={{
      border: `2px solid ${border}`,
      borderRadius: 10, padding: '14px 16px',
      background: bg, transition: 'all .2s',
      cursor: locked ? 'default' : 'pointer',
    }}
      onClick={() => !locked && onSelect(premise.id)}>
      {/* Selection indicator */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
        <div style={{
          width: 20, height: 20, borderRadius: 4, flexShrink: 0, marginTop: 1,
          border: `2px solid ${isSelected ? 'var(--A)' : 'var(--bd2)'}`,
          background: isSelected ? 'var(--A)' : 'transparent',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          {isSelected && <span style={{ fontSize: '.6rem', color: '#fff' }}>✓</span>}
        </div>
        <div style={{ flex: 1 }}>
          <p style={{ fontFamily: 'var(--fC)', fontSize: '.88rem', color: 'var(--txt)', lineHeight: 1.65, fontStyle: 'italic', margin: 0 }}>
            « {premise.text} »
          </p>
          {/* Explanation (shown after reveal if bad) */}
          {revealed && !premise.valid && (
            <div style={{ marginTop: 10, padding: '8px 12px', background: 'rgba(140,58,48,.06)', border: '1px solid rgba(140,58,48,.2)', borderRadius: 7 }}>
              <div style={{ fontFamily: 'var(--fM)', fontSize: '.52rem', color: 'var(--B)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.1em', marginBottom: 4 }}>
                ⚠️ Sophisme : {FALLACIES.find(f => f.id === premise.fallacyId)?.label}
              </div>
              <p style={{ fontFamily: 'var(--fC)', fontSize: '.82rem', color: 'var(--dim)', lineHeight: 1.65, fontStyle: 'italic', margin: 0 }}>{premise.explanation}</p>
            </div>
          )}
          {/* Valid badge */}
          {revealed && premise.valid && (
            <div style={{ marginTop: 8 }}>
              <span style={{ fontFamily: 'var(--fM)', fontSize: '.52rem', color: 'var(--G)', background: 'rgba(58,110,82,.08)', border: '1px solid rgba(58,110,82,.25)', borderRadius: 20, padding: '2px 10px' }}>
                ✓ Prémisse valide
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function ArchitectMode({ user, saveUser, showToast }) {
  const [phase, setPhase] = useState('intro');    // intro | playing | result
  const [challengeIdx, setChallengeIdx] = useState(0);
  const [selected, setSelected] = useState([]);   // array of premise ids
  const [revealed, setRevealed] = useState(false);
  const [solidite, setSolidite] = useState(100);
  const [totalScore, setTotalScore] = useState(0);
  const [history, setHistory] = useState([]);     // { challenge, selected, score }
  const [showExplanation, setShowExplanation] = useState(false);

  const challenge = ARCHITECT_CHALLENGES[challengeIdx % ARCHITECT_CHALLENGES.length];
  const isLast = challengeIdx >= ARCHITECT_CHALLENGES.length - 1;

  const toggleSelect = (id) => {
    if (revealed) return;
    setSelected(prev => {
      if (prev.includes(id)) return prev.filter(x => x !== id);
      if (prev.length >= 2) return prev; // max 2 selections
      return [...prev, id];
    });
  };

  const handleReveal = () => {
    if (selected.length < 2) {
      showToast('Sélectionnez exactement 2 prémisses', 'info');
      return;
    }
    setRevealed(true);
    setShowExplanation(true);

    // Calculate solidité loss: -30 per invalid selected
    const badChosen = selected.filter(id => {
      const p = challenge.premises.find(x => x.id === id);
      return p && !p.valid;
    });
    const loss = badChosen.length * 30;
    const roundSolidite = Math.max(0, 100 - loss);
    setSolidite(roundSolidite);

    // XP: 50 if perfect (both valid), 20 if 1 bad, 0 if both bad
    const xpGained = badChosen.length === 0 ? 50 : badChosen.length === 1 ? 20 : 0;
    if (xpGained > 0 && user) {
      saveUser({ ...user, xp: (user.xp || 0) + xpGained });
      showToast(`${xpGained === 50 ? '🏛 Architecture parfaite !' : '⚒ Structure partiellement solide'} +${xpGained} XP`, xpGained === 50 ? 'achievement' : 'info');
    }
    setTotalScore(prev => prev + xpGained);
    setHistory(prev => [...prev, { challenge, selected, solidite: roundSolidite, xpGained }]);
  };

  const handleNext = () => {
    if (isLast) {
      setPhase('result');
    } else {
      setChallengeIdx(i => i + 1);
      setSelected([]);
      setRevealed(false);
      setSolidite(100);
      setShowExplanation(false);
    }
  };

  const handleRestart = () => {
    setChallengeIdx(0);
    setSelected([]);
    setRevealed(false);
    setSolidite(100);
    setTotalScore(0);
    setHistory([]);
    setShowExplanation(false);
    setPhase('playing');
  };

  // ── INTRO ────────────────────────────────────────────────────────────────────
  if (phase === 'intro') return (
    <div className="page">
      <div style={{ maxWidth: 560, margin: '0 auto', textAlign: 'center' }}>
        <div style={{ fontSize: '3rem', marginBottom: 12 }}>🏛</div>
        <div style={{ fontFamily: 'var(--fH)', fontSize: '1.4rem', letterSpacing: '.12em', marginBottom: 8 }}>
          L'ARCHITECTE
        </div>
        <div style={{ fontFamily: 'var(--fC)', fontSize: '.95rem', color: 'var(--dim)', fontStyle: 'italic', lineHeight: 1.7, marginBottom: 24 }}>
          Bâtis un argument solide en choisissant les bonnes prémisses.<br/>
          Chaque sophisme dans ta sélection fragilise ta structure.
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginBottom: 26 }}>
          {[
            ['🏛', '1 Conclusion', '4 Prémisses proposées'],
            ['✅', '2 Valides', 'à identifier parmi 4'],
            ['💔', 'Solidité', '-30 par sophisme choisi'],
          ].map(([icon, val, label]) => (
            <div key={val} style={{ background: 'var(--s2)', border: '1px solid var(--bd)', borderRadius: 9, padding: '12px 8px' }}>
              <div style={{ fontSize: '1.3rem', marginBottom: 4 }}>{icon}</div>
              <div style={{ fontFamily: 'var(--fH)', fontSize: '.8rem', color: 'var(--A)', marginBottom: 2 }}>{val}</div>
              <div style={{ fontFamily: 'var(--fM)', fontSize: '.50rem', color: 'var(--muted)' }}>{label}</div>
            </div>
          ))}
        </div>

        <div style={{ background: 'rgba(44,74,110,.04)', border: '1px solid rgba(44,74,110,.15)', borderRadius: 10, padding: '14px 16px', marginBottom: 24, textAlign: 'left' }}>
          <div style={{ fontFamily: 'var(--fM)', fontSize: '.56rem', color: 'var(--A)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.1em', marginBottom: 8 }}>🎯 Système de score</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {[
              ['🏛 Architecture parfaite', '+50 XP · Solidité 100%'],
              ['⚒ Une prémisse-sophisme choisie', '+20 XP · Solidité 70%'],
              ['💥 Deux sophismes choisis', '+0 XP · Solidité 40%'],
            ].map(([label, val]) => (
              <div key={label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontFamily: 'var(--fM)', fontSize: '.58rem' }}>
                <span style={{ color: 'var(--txt)' }}>{label}</span>
                <span style={{ color: 'var(--muted)' }}>{val}</span>
              </div>
            ))}
          </div>
        </div>

        <button className="btn b-a b-lg" onClick={() => setPhase('playing')} style={{ width: '100%', justifyContent: 'center' }}>
          🏛 Commencer à Bâtir
        </button>
      </div>
    </div>
  );

  // ── PLAYING ──────────────────────────────────────────────────────────────────
  if (phase === 'playing') return (
    <div className="page">
      <div style={{ maxWidth: 640, margin: '0 auto' }}>

        {/* Progress header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14, flexWrap: 'wrap', gap: 8 }}>
          <div>
            <div style={{ fontFamily: 'var(--fH)', fontSize: '.72rem', letterSpacing: '.1em', textTransform: 'uppercase', color: 'var(--A)' }}>
              🏛 L'Architecte — Défi {challengeIdx + 1}/{ARCHITECT_CHALLENGES.length}
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontFamily: 'var(--fM)', fontSize: '.56rem', color: 'var(--muted)' }}>Solidité</span>
            <div style={{ width: 120 }}><SoliditeBar value={revealed ? solidite : 100} /></div>
          </div>
        </div>

        {/* Conclusion */}
        <div style={{
          background: 'linear-gradient(135deg,rgba(44,74,110,.06),rgba(198,161,91,.04))',
          border: '2px solid rgba(198,161,91,.35)',
          borderRadius: 12, padding: '20px 22px', marginBottom: 20,
          boxShadow: '0 4px 16px rgba(198,161,91,.1)',
        }}>
          <div style={{ fontFamily: 'var(--fM)', fontSize: '.54rem', color: 'var(--Y)', textTransform: 'uppercase', letterSpacing: '.14em', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
            <span>🏆</span> CONCLUSION À DÉFENDRE
          </div>
          <p style={{ fontFamily: 'var(--fH)', fontSize: '1.05rem', letterSpacing: '.04em', color: 'var(--txt)', lineHeight: 1.6, margin: 0 }}>
            {challenge.conclusion}
          </p>
        </div>

        {/* Instruction */}
        {!revealed && (
          <div style={{ fontFamily: 'var(--fB)', fontSize: '.7rem', fontWeight: 600, color: 'var(--dim)', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
            <span>🔍</span>
            Sélectionnez exactement les <strong>2 prémisses valides</strong> parmi les 4 proposées
            <span style={{ marginLeft: 4, background: `${selected.length === 2 ? 'var(--G)' : 'var(--A)'}22`, color: selected.length === 2 ? 'var(--G)' : 'var(--A)', borderRadius: 20, padding: '1px 8px', fontFamily: 'var(--fH)', fontSize: '.68rem' }}>{selected.length}/2</span>
          </div>
        )}

        {/* Premises */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 18 }}>
          {challenge.premises.map(p => (
            <PremiseBtn
              key={p.id}
              premise={p}
              selected={selected}
              revealed={revealed}
              locked={revealed}
              onSelect={toggleSelect}
            />
          ))}
        </div>

        {/* Actions */}
        {!revealed ? (
          <button className="btn b-a b-lg" onClick={handleReveal} disabled={selected.length < 2}
            style={{ width: '100%', justifyContent: 'center' }}>
            🏛 Valider mon architecture
          </button>
        ) : (
          <div style={{ display: 'flex', gap: 10 }}>
            <button className="btn b-a b-lg" onClick={handleNext} style={{ flex: 1, justifyContent: 'center' }}>
              {isLast ? '📊 Voir le bilan' : 'Défi suivant →'}
            </button>
            <button className="btn b-ghost" onClick={() => setPhase('intro')} style={{ flex: '0 0 auto' }}>← Quitter</button>
          </div>
        )}
      </div>
    </div>
  );

  // ── RESULT ────────────────────────────────────────────────────────────────────
  if (phase === 'result') {
    const perfect = history.filter(h => h.xpGained === 50).length;
    const totalXp = history.reduce((a, h) => a + h.xpGained, 0);
    const avgSolidite = history.length > 0 ? Math.round(history.reduce((a, h) => a + h.solidite, 0) / history.length) : 0;

    return (
      <div className="page">
        <div style={{ maxWidth: 540, margin: '0 auto' }}>
          {/* Banner */}
          <div style={{ background: perfect === ARCHITECT_CHALLENGES.length ? 'linear-gradient(135deg,rgba(198,161,91,.1),rgba(58,110,82,.08))' : 'linear-gradient(135deg,rgba(44,74,110,.06),rgba(198,161,91,.05))', border: `1px solid ${perfect === ARCHITECT_CHALLENGES.length ? 'rgba(198,161,91,.35)' : 'var(--bd)'}`, borderRadius: 14, padding: '28px 24px', textAlign: 'center', marginBottom: 20 }}>
            <div style={{ fontSize: '3rem', marginBottom: 8 }}>
              {perfect === ARCHITECT_CHALLENGES.length ? '🏛' : perfect >= 3 ? '🏅' : '📘'}
            </div>
            <div style={{ fontFamily: 'var(--fH)', fontSize: '1.3rem', letterSpacing: '.1em', marginBottom: 4 }}>
              {perfect === ARCHITECT_CHALLENGES.length ? 'ARCHITECTE MAÎTRE' : perfect >= 3 ? 'ARCHITECTE CONFIRMÉ' : 'ARCHITECTE APPRENTI'}
            </div>
            <div style={{ fontFamily: 'var(--fM)', fontSize: '.6rem', color: 'var(--muted)' }}>
              {perfect}/{ARCHITECT_CHALLENGES.length} architectures parfaites
            </div>
          </div>

          {/* Stats */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 10, marginBottom: 20 }}>
            {[
              ['🏛', perfect, 'Parfaites', 'var(--Y)'],
              ['💎', `${avgSolidite}%`, 'Solidité moy.', 'var(--A)'],
              ['⭐', totalXp, 'XP total', 'var(--O)'],
            ].map(([icon, val, label, color]) => (
              <div key={label} style={{ background: 'var(--s1)', border: '1px solid var(--bd)', borderRadius: 10, padding: '14px 10px', textAlign: 'center' }}>
                <div style={{ fontSize: '1.3rem', marginBottom: 4 }}>{icon}</div>
                <div style={{ fontFamily: 'var(--fH)', fontSize: '1.6rem', color }}>{val}</div>
                <div style={{ fontFamily: 'var(--fM)', fontSize: '.50rem', color: 'var(--muted)', textTransform: 'uppercase' }}>{label}</div>
              </div>
            ))}
          </div>

          {/* History */}
          <div style={{ background: 'var(--s1)', border: '1px solid var(--bd)', borderRadius: 10, padding: '14px 16px', marginBottom: 20 }}>
            <div style={{ fontFamily: 'var(--fM)', fontSize: '.56rem', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '.1em', marginBottom: 10 }}>Détail par défi</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {history.map((h, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 10px', background: '#FDFAF4', borderRadius: 7, border: '1px solid var(--bd)' }}>
                  <span style={{ fontSize: '1rem' }}>{h.xpGained === 50 ? '🏛' : h.xpGained === 20 ? '⚒' : '💥'}</span>
                  <div style={{ flex: 1, fontFamily: 'var(--fM)', fontSize: '.56rem', color: 'var(--txt)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {h.challenge.conclusion.slice(0, 55)}…
                  </div>
                  <span style={{ fontFamily: 'var(--fH)', fontSize: '.7rem', color: h.xpGained === 50 ? 'var(--G)' : h.xpGained === 20 ? 'var(--Y)' : 'var(--B)' }}>
                    +{h.xpGained} XP
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div style={{ display: 'flex', gap: 10 }}>
            <button className="btn b-a b-lg" onClick={handleRestart} style={{ flex: 1, justifyContent: 'center' }}>🔄 Rejouer</button>
            <button className="btn b-ghost" onClick={() => setPhase('intro')} style={{ flex: 1, justifyContent: 'center' }}>← Retour</button>
          </div>
        </div>
      </div>
    );
  }

  return null;
}
