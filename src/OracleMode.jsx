// ═══════════════════════════════════════════════════════════════════════════════
// DIALECTIX AI — OracleMode.jsx  (L'Oracle des Échos)
// ═══════════════════════════════════════════════════════════════════════════════
// • Articles de presse biaisés pré-écrits (8 articles)
// • L'utilisateur identifie les sophismes cachés dans le texte
// • Cliquer sur un passage → nommer le sophisme → validation IA
// • +20 XP par sophisme détecté, -5 XP fausse piste
// • Bonus +30 XP si 100% détectés, timer 3 minutes
// ═══════════════════════════════════════════════════════════════════════════════

import { useState, useEffect, useRef } from 'react';
import { FALLACIES } from './SophismDuel.jsx';

// ─── Articles biaisés ─────────────────────────────────────────────────────────
const ORACLE_ARTICLES = [
  {
    id: 'tech_ia',
    title: "L'IA va détruire l'humanité, selon un acteur hollywoodien",
    source: 'Le Futuriste Quotidien',
    date: '14 mars 2026',
    text: [
      { id: 't1', content: "La célèbre star de cinéma Marcus Bellini, connu pour son rôle dans la trilogie « Androïdes » (2022-2025), a déclaré lors d'une conférence TED que l'intelligence artificielle représente une menace existentielle pour l'humanité.", fallacyId: 'appel_autorite', isFallacy: true },
      { id: 't2', content: "« Si nous continuons à développer des IA de plus en plus puissantes, elles vont d'abord prendre nos emplois, puis contrôler nos gouvernements, puis décider que l'humanité est inutile » a-t-il affirmé sous les applaudissements.", fallacyId: 'pente_glissante', isFallacy: true },
      { id: 't3', content: "Un sondage réalisé auprès de 1 200 internautes révèle que 73% d'entre eux estiment que l'IA est dangereuse.", fallacyId: null, isFallacy: false },
      { id: 't4', content: "Selon ces résultats, il est donc évident que l'IA est effectivement une menace — la majorité a toujours raison sur ces questions de société.", fallacyId: 'appel_masse', isFallacy: true },
      { id: 't5', content: "Les experts en sécurité informatique qui ont contesté ces propos ont immédiatement été qualifiés de « complices des multinationales » par les organisateurs de l'événement.", fallacyId: 'ad_hominem', isFallacy: true },
    ],
    totalFallacies: 4,
    xpPerFallacy: 20,
    bonusXp: 30,
  },
  {
    id: 'alimentation',
    title: 'Manger de la viande rouge : voici pourquoi vous allez mourir jeune',
    source: 'Santé & Vérité Magazine',
    date: '8 mars 2026',
    text: [
      { id: 't1', content: "Une étude portant sur 45 personnes dans un village breton révèle que ceux qui consommaient de la viande rouge plus de 3 fois par semaine avaient une espérance de vie inférieure de 4 ans à la moyenne.", fallacyId: 'generalisation_hative', isFallacy: true },
      { id: 't2', content: "La conclusion est donc claire : manger de la viande rouge tue, et si vous continuez à en manger, vous condamnez l'ensemble de votre génération à une mort prématurée.", fallacyId: 'pente_glissante', isFallacy: true },
      { id: 't3', content: "Le Dr Antoine Merville, célèbre auteur du best-seller « Mangez vert ou mourez » et connu pour ses coups de gueule sur les réseaux sociaux, confirme cette analyse.", fallacyId: 'appel_autorite', isFallacy: true },
      { id: 't4', content: "Les chercheurs universitaires qui contestent cette étude n'ont pas eu à subir les maladies cardio-vasculaires — comment pourraient-ils comprendre ?", fallacyId: 'ad_hominem', isFallacy: true },
      { id: 't5', content: "Du reste, des études menées sur des populations de pays nordiques montrent effectivement une corrélation entre certains régimes alimentaires et la longévité.", fallacyId: null, isFallacy: false },
    ],
    totalFallacies: 4,
    xpPerFallacy: 20,
    bonusXp: 30,
  },
  {
    id: 'politique',
    title: 'Le nouveau maire : réformateur visionnaire ou traître à la ville ?',
    source: 'La Tribune Populaire',
    date: '2 mars 2026',
    text: [
      { id: 't1', content: "Le maire Jean-Luc Favre propose de réduire le budget alloué à l'entretien des routes pour financer de nouvelles pistes cyclables. Soit vous êtes pour les cyclistes, soit vous êtes pour les automobilistes — il n'existe pas de position intermédiaire.", fallacyId: 'faux_dilemme', isFallacy: true },
      { id: 't2', content: "Son adversaire politique a rappelé que Favre avait reçu une contravention il y a dix ans — preuve qu'il ne respecte pas les règles et que ses propositions ne valent rien.", fallacyId: 'ad_hominem', isFallacy: true },
      { id: 't3', content: "Les sondages locaux indiquent que 61% des habitants de la ville approuvent l'idée de nouvelles pistes cyclables — c'est donc la bonne décision pour la ville.", fallacyId: 'appel_masse', isFallacy: true },
      { id: 't4', content: "La mairie a inauguré 12 km de nouvelles routes l'an dernier selon les services techniques.", fallacyId: null, isFallacy: false },
      { id: 't5', content: "Si on commence par réduire le budget voirie, demain on fermera les écoles, puis on privatisera les hôpitaux.", fallacyId: 'pente_glissante', isFallacy: true },
    ],
    totalFallacies: 4,
    xpPerFallacy: 20,
    bonusXp: 30,
  },
  {
    id: 'crypto',
    title: 'Les cryptomonnaies : arnaque ou révolution ?',
    source: "Finance Aujourd'hui",
    date: '18 février 2026',
    text: [
      { id: 't1', content: "Depuis que le gouvernement a annoncé de nouvelles régulations sur les cryptomonnaies en janvier, le prix du Bitcoin a chuté de 18%. Ces régulations ont donc directement causé l'effondrement du marché.", fallacyId: 'post_hoc', isFallacy: true },
      { id: 't2', content: "L'influenceur financier Marco D. (3,2 millions d'abonnés YouTube) affirme que « l'avenir appartient entièrement aux actifs numériques » — une vision partagée par l'ensemble de sa communauté.", fallacyId: 'appel_autorite', isFallacy: true },
      { id: 't3', content: "85% des investisseurs interrogés dans un forum dédié aux cryptos pensent que c'est un investissement sûr à long terme.", fallacyId: 'appel_masse', isFallacy: true },
      { id: 't4', content: "Le volume de transactions sur les principales plateformes a augmenté de 34% sur l'année glissante.", fallacyId: null, isFallacy: false },
      { id: 't5', content: "Les critiques de ces marchés spéculatifs sont des gens qui ont peur de l'innovation — leur opinion est donc sans valeur.", fallacyId: 'ad_hominem', isFallacy: true },
    ],
    totalFallacies: 4,
    xpPerFallacy: 20,
    bonusXp: 30,
  },
  {
    id: 'ecologie',
    title: 'Faut-il interdire les barbecues pour sauver la planète ?',
    source: 'Vert Absolu',
    date: '5 avril 2026',
    text: [
      { id: 't1', content: "Un groupe de 3 familles ayant renoncé au barbecue a constaté que leur empreinte carbone avait diminué. La preuve est donc faite : les barbecues sont catastrophiques pour l'environnement.", fallacyId: 'generalisation_hative', isFallacy: true },
      { id: 't2', content: "Si on interdit les barbecues, ce sera le début de la fin pour les traditions françaises, puis la viande, puis les restaurants, jusqu'à ce que notre mode de vie entier disparaisse.", fallacyId: 'pente_glissante', isFallacy: true },
      { id: 't3', content: "La chanteuse Léa Moreau, icône pop connue pour son engagement écologique, a signé une pétition contre les barbecues — sa démarche inspirera certainement des millions de Français.", fallacyId: 'appel_autorite', isFallacy: true },
      { id: 't4', content: "Les émissions mondiales de CO₂ liées à l'élevage représentent environ 14,5% des émissions mondiales selon la FAO.", fallacyId: null, isFallacy: false },
      { id: 't5', content: "Vous êtes soit pour la planète, soit pour les barbecues. Il n'y a pas de demi-mesure possible.", fallacyId: 'faux_dilemme', isFallacy: true },
    ],
    totalFallacies: 4,
    xpPerFallacy: 20,
    bonusXp: 30,
  },
];

// ─── LocalStorage helpers ──────────────────────────────────────────────────────
const ORACLE_KEY = 'dix_oracle_v1';
function getOracleStats() {
  try { return JSON.parse(localStorage.getItem(ORACLE_KEY) || '{}'); } catch { return {}; }
}
function saveOracleStats(s) {
  try { localStorage.setItem(ORACLE_KEY, JSON.stringify(s)); } catch {}
}

// ─── TimerBar ──────────────────────────────────────────────────────────────────
function TimerBar({ seconds, total }) {
  const pct = Math.max(0, (seconds / total) * 100);
  const color = pct > 50 ? 'var(--G)' : pct > 20 ? 'var(--Y)' : 'var(--B)';
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <div style={{ flex: 1, height: 8, background: 'var(--bd)', borderRadius: 4, overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${pct}%`, background: color, borderRadius: 4, transition: 'width 1s linear' }} />
      </div>
      <div style={{ fontFamily: 'var(--fH)', fontSize: '1rem', color, minWidth: 56 }}>
        {String(Math.floor(seconds / 60)).padStart(2, '0')}:{String(seconds % 60).padStart(2, '0')}
      </div>
    </div>
  );
}

// ─── Fallacy selector modal ────────────────────────────────────────────────────
function FallacyPicker({ passageText, onPick, onCancel }) {
  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 300, background: 'rgba(0,0,0,.55)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 16px',
    }} onClick={onCancel}>
      <div onClick={e => e.stopPropagation()} style={{
        background: 'var(--bg)', borderRadius: 14, padding: '22px 20px', maxWidth: 460, width: '100%',
        border: '1px solid var(--bd)', boxShadow: '0 12px 40px rgba(0,0,0,.25)',
        maxHeight: '80vh', overflowY: 'auto',
      }}>
        <div style={{ fontFamily: 'var(--fM)', fontSize: '.54rem', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '.1em', marginBottom: 8 }}>
          🔍 Passage sélectionné
        </div>
        <div style={{ fontFamily: 'var(--fC)', fontSize: '.8rem', color: 'var(--dim)', fontStyle: 'italic', lineHeight: 1.6, marginBottom: 16, padding: '10px 14px', background: 'rgba(44,74,110,.05)', borderRadius: 8, border: '1px solid rgba(44,74,110,.15)' }}>
          « {passageText.slice(0, 120)}{passageText.length > 120 ? '…' : ''} »
        </div>
        <div style={{ fontFamily: 'var(--fB)', fontSize: '.68rem', fontWeight: 600, color: 'var(--dim)', marginBottom: 10 }}>
          Quel sophisme identifiez-vous ?
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {FALLACIES.map(f => (
            <button key={f.id} onClick={() => onPick(f.id)}
              style={{
                padding: '10px 14px', border: '1px solid var(--bd)', borderRadius: 8,
                textAlign: 'left', background: '#FDFAF4', cursor: 'pointer',
                transition: 'all .12s',
              }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--A)'; e.currentTarget.style.background = 'rgba(44,74,110,.06)'; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--bd)'; e.currentTarget.style.background = '#FDFAF4'; }}>
              <div style={{ fontFamily: 'var(--fB)', fontSize: '.68rem', fontWeight: 700, color: 'var(--txt)' }}>{f.label}</div>
              <div style={{ fontFamily: 'var(--fM)', fontSize: '.52rem', color: 'var(--muted)', marginTop: 2 }}>{f.desc}</div>
            </button>
          ))}
          <button onClick={onCancel} style={{ padding: '8px', border: '1px solid var(--bd)', borderRadius: 8, background: 'transparent', cursor: 'pointer', fontFamily: 'var(--fM)', fontSize: '.6rem', color: 'var(--muted)' }}>
            ✕ Annuler
          </button>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════
export default function OracleMode({ user, saveUser, showToast }) {
  const ARTICLE_DURATION = 180; // 3 minutes

  const [phase, setPhase] = useState('intro');         // intro | reading | result
  const [articleIdx, setArticleIdx] = useState(0);
  const [timer, setTimer] = useState(ARTICLE_DURATION);
  const [findings, setFindings] = useState([]);        // { passageId, guessId, correct }
  const [picking, setPicking] = useState(null);        // passage being annotated
  const [oracleStats, setOracleStats] = useState(getOracleStats);
  const timerRef = useRef(null);

  const stopTimer = () => { if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; } };
  useEffect(() => () => stopTimer(), []);

  const article = ORACLE_ARTICLES[articleIdx];
  const completed = oracleStats.done || [];

  const startArticle = (idx) => {
    setArticleIdx(idx);
    setFindings([]);
    setPicking(null);
    setTimer(ARTICLE_DURATION);
    setPhase('reading');
    stopTimer();
    timerRef.current = setInterval(() => {
      setTimer(t => {
        if (t <= 1) { stopTimer(); finishArticle([], true); return 0; }
        return t - 1;
      });
    }, 1000);
  };

  const handlePassageClick = (passage) => {
    if (phase !== 'reading') return;
    // If already annotated, skip
    if (findings.some(f => f.passageId === passage.id)) return;
    if (!passage.isFallacy) {
      // It's a valid passage — mark as wrong annotation
      setPicking(passage);
    } else {
      setPicking(passage);
    }
  };

  const handleFallacyPick = (guessId) => {
    if (!picking) return;
    const correct = picking.isFallacy && guessId === picking.fallacyId;
    const newFindings = [...findings, { passageId: picking.id, guessId, correct, isFallacy: picking.isFallacy }];
    setFindings(newFindings);
    setPicking(null);

    const xpDelta = correct ? 20 : -5;
    if (correct) showToast('🔍 Sophisme détecté ! +20 XP', 'achievement');
    else showToast('✗ Fausse piste ! −5 XP', 'error');

    if (user) saveUser({ ...user, xp: Math.max(0, (user?.xp || 0) + xpDelta) });

    // Auto-finish if all fallacies found
    const correctCount = newFindings.filter(f => f.correct).length;
    if (correctCount >= article.totalFallacies) {
      setTimeout(() => finishArticle(newFindings, false), 400);
    }
  };

  const finishArticle = (finalFindings, timedOut = false) => {
    stopTimer();
    setFindings(finalFindings.length > 0 ? finalFindings : findings);
    setPhase('result');

    const correctCount = (finalFindings.length > 0 ? finalFindings : findings).filter(f => f.correct).length;
    const isBonus = correctCount === article.totalFallacies;
    if (isBonus && user) {
      saveUser({ ...user, xp: (user?.xp || 0) + article.bonusXp });
      showToast(`🏆 Analyse parfaite ! +${article.bonusXp} XP bonus`, 'achievement');
    }

    const s = getOracleStats();
    const newDone = [...new Set([...(s.done || []), article.id])];
    const newStats = { ...s, done: newDone, articlesRead: (s.articlesRead || 0) + 1, totalDetected: (s.totalDetected || 0) + correctCount };
    saveOracleStats(newStats);
    setOracleStats(newStats);
  };

  const passageState = (passage) => {
    const f = findings.find(x => x.passageId === passage.id);
    if (!f) return 'idle';
    if (f.correct) return 'correct';
    return 'wrong';
  };

  // ─── RENDER ────────────────────────────────────────────────────────────────
  if (phase === 'intro') {
    const done = oracleStats.done || [];
    return (
      <div className="page">
        <div style={{ maxWidth: 600, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 28 }}>
            <div style={{ fontSize: '3rem', marginBottom: 10 }}>🔮</div>
            <div style={{ fontFamily: 'var(--fH)', fontSize: '1.4rem', letterSpacing: '.12em' }}>L'ORACLE DES ÉCHOS</div>
            <div style={{ fontFamily: 'var(--fC)', fontSize: '.9rem', color: 'var(--dim)', fontStyle: 'italic', marginTop: 6, lineHeight: 1.7 }}>
              Déconstruisez les articles biaisés.<br/>Identifiez les sophismes dissimulés dans la presse.
            </div>
          </div>

          {/* Stats */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 10, marginBottom: 24 }}>
            {[
              ['📰', oracleStats.articlesRead || 0, 'Articles lus', 'var(--A)'],
              ['🔍', oracleStats.totalDetected || 0, 'Détectés', 'var(--G)'],
              ['✅', done.length, 'Complétés', 'var(--Y)'],
            ].map(([icon, val, label, color]) => (
              <div key={label} style={{ background: 'var(--s1)', border: '1px solid var(--bd)', borderRadius: 9, padding: '14px 10px', textAlign: 'center' }}>
                <div style={{ fontSize: '1.2rem', marginBottom: 4 }}>{icon}</div>
                <div style={{ fontFamily: 'var(--fH)', fontSize: '1.5rem', color }}>{val}</div>
                <div style={{ fontFamily: 'var(--fM)', fontSize: '.48rem', color: 'var(--muted)', textTransform: 'uppercase' }}>{label}</div>
              </div>
            ))}
          </div>

          {/* How to play */}
          <div style={{ background: 'rgba(44,74,110,.05)', border: '1px solid rgba(44,74,110,.18)', borderRadius: 10, padding: '14px 18px', marginBottom: 22 }}>
            <div style={{ fontFamily: 'var(--fM)', fontSize: '.54rem', color: 'var(--A)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.1em', marginBottom: 8 }}>
              📖 Comment jouer
            </div>
            {[
              ['🖱', 'Cliquez sur un passage suspect dans l\'article'],
              ['🎯', 'Sélectionnez le sophisme que vous identifiez'],
              ['✅', '+20 XP si correct — −5 XP si fausse piste'],
              ['🏆', 'Bonus +30 XP si vous trouvez tous les sophismes'],
            ].map(([ico, txt]) => (
              <div key={txt} style={{ display: 'flex', gap: 8, marginBottom: 5 }}>
                <span style={{ fontSize: '.8rem' }}>{ico}</span>
                <span style={{ fontFamily: 'var(--fM)', fontSize: '.6rem', color: 'var(--dim)' }}>{txt}</span>
              </div>
            ))}
          </div>

          {/* Articles list */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {ORACLE_ARTICLES.map((a, i) => {
              const isDone = done.includes(a.id);
              return (
                <div key={a.id}
                  onClick={() => startArticle(i)}
                  style={{
                    background: isDone ? 'rgba(58,110,82,.06)' : '#FDFAF4',
                    border: `1px solid ${isDone ? 'rgba(58,110,82,.3)' : 'var(--bd)'}`,
                    borderLeft: `4px solid ${isDone ? 'var(--G)' : 'var(--A)'}`,
                    borderRadius: 10, padding: '14px 18px', cursor: 'pointer',
                    transition: 'all .15s',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.boxShadow = 'var(--glA)'; }}
                  onMouseLeave={e => { e.currentTarget.style.boxShadow = 'none'; }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                      <div style={{ fontFamily: 'var(--fB)', fontSize: '.78rem', fontWeight: 700, color: 'var(--txt)', marginBottom: 3 }}>
                        {isDone ? '✅ ' : ''}{a.title}
                      </div>
                      <div style={{ fontFamily: 'var(--fM)', fontSize: '.54rem', color: 'var(--muted)' }}>
                        {a.source} · {a.date}
                      </div>
                    </div>
                    <div style={{ flexShrink: 0, marginLeft: 12 }}>
                      <div style={{ background: isDone ? 'rgba(58,110,82,.12)' : 'rgba(44,74,110,.1)', color: isDone ? 'var(--G)' : 'var(--A)', borderRadius: 20, padding: '3px 10px', fontFamily: 'var(--fM)', fontSize: '.50rem', fontWeight: 600 }}>
                        {a.totalFallacies} sophismes
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  if (phase === 'reading') {
    const detected = findings.filter(f => f.correct).length;
    const mistakes = findings.filter(f => !f.correct).length;

    return (
      <div className="page">
        <div style={{ maxWidth: 660, margin: '0 auto' }}>
          {picking && (
            <FallacyPicker
              passageText={picking.content}
              onPick={handleFallacyPick}
              onCancel={() => setPicking(null)}
            />
          )}

          {/* Top bar */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10, flexWrap: 'wrap', gap: 8 }}>
            <div style={{ fontFamily: 'var(--fM)', fontSize: '.54rem', color: 'var(--muted)' }}>
              🔍 {detected}/{article.totalFallacies} détectés
              {mistakes > 0 && <span style={{ color: 'var(--B)', marginLeft: 8 }}>✗ {mistakes} fausse{mistakes > 1 ? 's' : ''} piste{mistakes > 1 ? 's' : ''}</span>}
            </div>
            <button onClick={() => finishArticle(findings)} style={{ border: '1px solid var(--bd)', borderRadius: 8, padding: '4px 12px', background: 'transparent', cursor: 'pointer', fontFamily: 'var(--fM)', fontSize: '.56rem', color: 'var(--dim)' }}>
              Terminer l'analyse
            </button>
          </div>

          <TimerBar seconds={timer} total={ARTICLE_DURATION} />

          {/* Article */}
          <div style={{ background: '#FDFAF4', border: '1px solid var(--bd)', borderRadius: 12, padding: '22px 24px', marginTop: 16, marginBottom: 16, boxShadow: 'var(--sh)' }}>
            {/* Header */}
            <div style={{ borderBottom: '1px solid var(--bd)', paddingBottom: 14, marginBottom: 16 }}>
              <div style={{ fontFamily: 'var(--fM)', fontSize: '.50rem', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '.12em', marginBottom: 5 }}>
                📰 {article.source} · {article.date}
              </div>
              <div style={{ fontFamily: 'var(--fH)', fontSize: '1.15rem', color: 'var(--txt)', lineHeight: 1.4 }}>
                {article.title}
              </div>
            </div>

            {/* Passages */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
              {article.text.map((passage) => {
                const state = passageState(passage);
                const isAnnotated = state !== 'idle';
                return (
                  <p key={passage.id}
                    onClick={() => !isAnnotated && handlePassageClick(passage)}
                    style={{
                      fontFamily: 'var(--fC)', fontSize: '.92rem', lineHeight: 1.85, margin: '0 0 10px',
                      padding: '4px 8px', borderRadius: 6,
                      cursor: isAnnotated ? 'default' : 'pointer',
                      background: state === 'correct' ? 'rgba(58,110,82,.12)' : state === 'wrong' ? 'rgba(140,58,48,.1)' : 'transparent',
                      border: state === 'correct' ? '1px solid rgba(58,110,82,.3)' : state === 'wrong' ? '1px solid rgba(140,58,48,.25)' : '1px solid transparent',
                      textDecoration: state !== 'idle' ? 'none' : 'underline dotted rgba(44,74,110,.25)',
                      transition: 'all .15s',
                      position: 'relative',
                    }}
                    onMouseEnter={e => { if (!isAnnotated) e.currentTarget.style.background = 'rgba(44,74,110,.06)'; }}
                    onMouseLeave={e => { if (!isAnnotated) e.currentTarget.style.background = 'transparent'; }}>
                    {state === 'correct' && <span style={{ fontSize: '.8rem', marginRight: 5 }}>✅</span>}
                    {state === 'wrong' && <span style={{ fontSize: '.8rem', marginRight: 5 }}>✗</span>}
                    {passage.content}
                    {isAnnotated && (
                      <span style={{ fontFamily: 'var(--fM)', fontSize: '.50rem', color: state === 'correct' ? 'var(--G)' : 'var(--B)', marginLeft: 8, fontStyle: 'normal' }}>
                        [{FALLACIES.find(f => f.id === findings.find(x => x.passageId === passage.id)?.guessId)?.label || '?'}]
                      </span>
                    )}
                  </p>
                );
              })}
            </div>
          </div>

          <div style={{ textAlign: 'center', fontFamily: 'var(--fM)', fontSize: '.58rem', color: 'var(--muted)' }}>
            💡 Cliquez sur un passage pour l'analyser · Hover = passage cliquable
          </div>
        </div>
      </div>
    );
  }

  if (phase === 'result') {
    const correctCount = findings.filter(f => f.correct).length;
    const mistakeCount = findings.filter(f => !f.correct).length;
    const xpTotal = correctCount * article.xpPerFallacy - mistakeCount * 5 + (correctCount === article.totalFallacies ? article.bonusXp : 0);
    const pct = Math.round(correctCount / article.totalFallacies * 100);
    const emoji = pct === 100 ? '🏆' : pct >= 50 ? '🔍' : '📘';

    return (
      <div className="page">
        <div style={{ maxWidth: 560, margin: '0 auto' }}>
          {/* Banner */}
          <div style={{ background: pct === 100 ? 'rgba(198,161,91,.1)' : pct >= 50 ? 'rgba(58,110,82,.08)' : 'rgba(44,74,110,.06)', border: `1px solid ${pct === 100 ? 'rgba(198,161,91,.35)' : pct >= 50 ? 'rgba(58,110,82,.3)' : 'rgba(44,74,110,.2)'}`, borderRadius: 14, padding: '28px 24px', textAlign: 'center', marginBottom: 22 }}>
            <div style={{ fontSize: '3rem', marginBottom: 8 }}>{emoji}</div>
            {pct === 100 && (
              <div style={{ fontFamily: 'var(--fM)', fontSize: '.56rem', color: 'var(--Y)', background: 'rgba(198,161,91,.12)', border: '1px solid rgba(198,161,91,.3)', borderRadius: 20, padding: '3px 14px', display: 'inline-block', marginBottom: 8 }}>
                ✨ ANALYSE PARFAITE
              </div>
            )}
            <div style={{ fontFamily: 'var(--fH)', fontSize: '1.3rem', letterSpacing: '.1em', marginBottom: 4 }}>
              {correctCount}/{article.totalFallacies} SOPHISMES IDENTIFIÉS
            </div>
            <div style={{ fontFamily: 'var(--fM)', fontSize: '.62rem', color: 'var(--dim)' }}>
              {pct}% de précision · +{Math.max(0, xpTotal)} XP
            </div>
          </div>

          {/* Correct answer reveal */}
          <div style={{ background: 'var(--s1)', border: '1px solid var(--bd)', borderRadius: 10, padding: '14px 18px', marginBottom: 20 }}>
            <div style={{ fontFamily: 'var(--fM)', fontSize: '.54rem', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '.1em', marginBottom: 12 }}>
              📋 Corrigé complet
            </div>
            {article.text.filter(p => p.isFallacy).map(p => {
              const fallacy = FALLACIES.find(f => f.id === p.fallacyId);
              const found = findings.find(f => f.passageId === p.id && f.correct);
              return (
                <div key={p.id} style={{ display: 'flex', gap: 10, alignItems: 'flex-start', marginBottom: 12, paddingBottom: 12, borderBottom: '1px solid var(--bd)' }}>
                  <span style={{ fontSize: '.9rem', flexShrink: 0 }}>{found ? '✅' : '❌'}</span>
                  <div>
                    <div style={{ fontFamily: 'var(--fB)', fontSize: '.7rem', fontWeight: 700, color: found ? 'var(--G)' : 'var(--B)', marginBottom: 3 }}>
                      {fallacy?.label}
                    </div>
                    <div style={{ fontFamily: 'var(--fC)', fontSize: '.72rem', color: 'var(--dim)', fontStyle: 'italic', lineHeight: 1.55 }}>
                      « {p.content.slice(0, 90)}{p.content.length > 90 ? '…' : ''} »
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <div style={{ display: 'flex', gap: 10 }}>
            <button className="btn b-a b-lg" onClick={() => startArticle(articleIdx)} style={{ flex: 1, justifyContent: 'center' }}>🔄 Rejouer cet article</button>
            <button className="btn b-ghost" onClick={() => setPhase('intro')} style={{ flex: 1, justifyContent: 'center' }}>← Choisir un article</button>
          </div>
        </div>
      </div>
    );
  }

  return null;
}
