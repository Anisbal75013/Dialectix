// ═══════════════════════════════════════════════════════════════════════════════
// DIALECTIX AI — SophismDuel.jsx  (v3 — Speed Run + Classic)
// ═══════════════════════════════════════════════════════════════════════════════
// • Classic : 60s par question, 1 défi/jour avec XP
// • Speed Run : 60s pour enchaîner le max de sophismes — combo multiplicateur
//   Fin → récap : détectés, précision %, ELO gagné, sauvegarde duel_stats
// ═══════════════════════════════════════════════════════════════════════════════

import { useState, useEffect, useRef, useCallback } from 'react';
import { createClient } from '@supabase/supabase-js';

const SB = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
);

// ─── Sophismes ────────────────────────────────────────────────────────────────
export const FALLACIES = [
  { id: 'ad_hominem',            label: 'Ad Hominem',            desc: "Attaque la personne plutôt que l'argument" },
  { id: 'pente_glissante',       label: 'Pente Glissante',       desc: 'Suppose une chaîne catastrophique sans preuve' },
  { id: 'homme_de_paille',       label: 'Homme de Paille',       desc: "Déforme l'argument adverse pour mieux l'attaquer" },
  { id: 'faux_dilemme',          label: 'Faux Dilemme',          desc: "Présente deux options seulement alors qu'il en existe d'autres" },
  { id: 'appel_autorite',        label: "Appel à l'Autorité",    desc: 'Cite une autorité non pertinente ou douteuse' },
  { id: 'appel_masse',           label: 'Appel à la Masse',      desc: 'Quelque chose est vrai car beaucoup le croient' },
  { id: 'post_hoc',              label: 'Post Hoc',              desc: 'Confond corrélation et causalité dans le temps' },
  { id: 'generalisation_hative', label: 'Généralisation Hâtive', desc: "Tire des conclusions générales d'un nombre insuffisant de cas" },
  { id: 'petitio_principii',     label: 'Pétition de Principe',  desc: 'La conclusion est présupposée dans les prémisses' },
  { id: 'whataboutism',          label: 'Whataboutism',          desc: "Contre-attaque hors-sujet pour éviter la critique" },
];

// ─── Duels pré-générés ────────────────────────────────────────────────────────
export const SEED_DUELS = [
  { argument: "Ce politicien a proposé de réduire les impôts, mais il a triché dans ses déclarations fiscales en 2018 — pourquoi l'écouter sur ce sujet ?", fallacyId: 'ad_hominem', explanation: "L'argument attaque le caractère du politicien plutôt que le mérite de sa proposition fiscale. La valeur d'une idée est indépendante de qui la formule." },
  { argument: "Si on autorise le télétravail deux jours par semaine, bientôt les employés ne viendront plus du tout, les bureaux fermeront, les villes se videront et l'économie s'effondrera.", fallacyId: 'pente_glissante', explanation: "Chaque étape est présentée comme inévitable sans preuve. Une mesure modérée n'entraîne pas nécessairement des conséquences extrêmes." },
  { argument: "Mes opposants pensent qu'on devrait ouvrir les frontières à tout le monde sans aucun contrôle — une position clairement irresponsable.", fallacyId: 'homme_de_paille', explanation: "La position réelle a été exagérée ('aucun contrôle') pour la rendre plus facile à critiquer." },
  { argument: "Soit vous êtes avec nous pour défendre nos valeurs, soit vous êtes contre notre pays. Il n'y a pas d'autre position possible.", fallacyId: 'faux_dilemme', explanation: "La réalité offre un large spectre de positions entre deux extrêmes. Ce sophisme élimine toutes les nuances." },
  { argument: "L'IA ne représente aucun danger selon un célèbre acteur de science-fiction qui joue souvent des robots dans ses films.", fallacyId: 'appel_autorite', explanation: "La notoriété dans des films de SF ne confère pas une expertise en intelligence artificielle." },
  { argument: "La majorité des Français mange de la viande — cela prouve que le végétarisme n'est pas une option valable pour notre société.", fallacyId: 'appel_masse', explanation: "La popularité d'un comportement ne détermine pas sa valeur éthique ou nutritionnelle." },
  { argument: "Depuis que ce ministre est en poste, le chômage a augmenté — il est donc directement responsable de cette hausse.", fallacyId: 'post_hoc', explanation: "La coïncidence temporelle n'établit pas la causalité. De nombreux facteurs indépendants influencent le chômage." },
  { argument: "J'ai rencontré trois Parisiens arrogants. Les Parisiens sont clairement des gens prétentieux.", fallacyId: 'generalisation_hative', explanation: "Tirer une conclusion générale sur des millions de personnes à partir de trois rencontres est non représentatif." },
  { argument: "Bien sûr, la violence dans les jeux vidéo est dangereuse — les études disent que les jeunes passent plus de temps à jouer, et la violence augmente.", fallacyId: 'post_hoc', explanation: "La corrélation entre temps de jeu et violence sociale ne prouve pas de causalité directe." },
  { argument: "Tout le monde pense que cet homme est coupable — il doit l'être.", fallacyId: 'appel_masse', explanation: "L'opinion populaire ne constitue pas une preuve juridique ou logique." },
  { argument: "Si vous n'êtes pas d'accord avec notre politique économique, c'est que vous voulez la ruine du pays.", fallacyId: 'faux_dilemme', explanation: "Exprimer un désaccord économique ne signifie pas vouloir la ruine. Cette dichotomie est artificielle." },
  { argument: "Mon adversaire dit vouloir protéger l'environnement, mais il a pris l'avion vingt fois l'année dernière.", fallacyId: 'ad_hominem', explanation: "Le comportement personnel ne réfute pas les arguments environnementaux avancés." },
];

// ─── Citations de fin de partie ───────────────────────────────────────────────
const PHILOSOPHER_QUOTES = [
  { quote: "La qualité d'un argument se mesure à la rigueur de sa logique, non à la véhémence de sa défense.", author: "Marc Aurèle" },
  { quote: "Ce n'est pas l'erreur qui est honteuse, c'est de ne pas la reconnaître.", author: "Sénèque" },
  { quote: "Je ne sais qu'une chose, c'est que je ne sais rien — mais je chercherai toujours.", author: "Socrate" },
  { quote: "Agis seulement d'après la maxime dont tu peux vouloir qu'elle devienne une loi universelle.", author: "Emmanuel Kant" },
  { quote: "L'homme qui recourt au sophisme a déjà perdu la moitié du débat.", author: "Aristote" },
  { quote: "La vérité n'a pas besoin de l'applaudissement de la foule pour exister.", author: "Épictète" },
  { quote: "On ne voit bien qu'avec le cœur, l'essentiel est invisible pour les yeux — mais la raison guide le cœur.", author: "Antoine de Saint-Exupéry" },
];
function randomQuote() {
  return PHILOSOPHER_QUOTES[Math.floor(Math.random() * PHILOSOPHER_QUOTES.length)];
}

// ─── LocalStorage helpers ─────────────────────────────────────────────────────
const SR_KEY = 'dix_speedrun_v1';
const CLASSIC_KEY = 'dix_sophism_duel_v1';

function getBestScore() {
  try { return JSON.parse(localStorage.getItem(SR_KEY) || '{}').best || 0; }
  catch { return 0; }
}
function saveBestScore(score) {
  try {
    const cur = getBestScore();
    if (score > cur) localStorage.setItem(SR_KEY, JSON.stringify({ best: score, date: new Date().toDateString() }));
  } catch {}
}

// ─── Supabase helpers ─────────────────────────────────────────────────────────
async function upsertDuelStats(userId, correct, total, score, byType) {
  if (!userId) return;
  try {
    // Read current
    const { data } = await SB.from('duel_stats').select('*').eq('user_id', userId).single();
    const cur = data || {};
    const curByType = cur.sophisms_detected || {};
    Object.entries(byType).forEach(([k, v]) => { curByType[k] = (curByType[k] || 0) + v; });
    await SB.from('duel_stats').upsert({
      user_id: userId,
      total_duels: (cur.total_duels || 0) + 1,
      best_score_1min: Math.max(cur.best_score_1min || 0, score),
      sophisms_detected: curByType,
      total_correct: (cur.total_correct || 0) + correct,
      total_answered: (cur.total_answered || 0) + total,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'user_id' });
  } catch {}
}

async function getWorldRecord() {
  try {
    const { data } = await SB.from('duel_stats').select('best_score_1min, user_id').order('best_score_1min', { ascending: false }).limit(1).single();
    return data?.best_score_1min || 0;
  } catch { return 0; }
}

// ─── ELO increment (if > 5 correct with >80% accuracy) ───────────────────────
async function maybeAddElo(user, saveUser, correct, total) {
  if (!user || correct < 5 || total === 0) return 0;
  const accuracy = correct / total;
  if (accuracy < 0.8) return 0;
  const delta = Math.min(20, Math.round(correct * accuracy * 2));
  const updUser = { ...user, elo: (user.elo || 1000) + delta };
  saveUser(updUser);
  if (user.id) {
    await SB.from('profiles').update({ elo: updUser.elo }).eq('id', user.id);
  }
  return delta;
}

// ─── Deterministic choices (alphabetical, stable per question) ────────────────
function getChoices(correctId) {
  const correct = FALLACIES.find(f => f.id === correctId);
  if (!correct) return FALLACIES.slice(0, 4).sort((a, b) => a.label.localeCompare(b.label, 'fr'));
  const others = FALLACIES.filter(f => f.id !== correctId).slice(0, 3);
  return [...others, correct].sort((a, b) => a.label.localeCompare(b.label, 'fr'));
}

// ─── Timer bar ────────────────────────────────────────────────────────────────
function TimerBar({ seconds, total, urgent = false }) {
  const pct = Math.max(0, (seconds / total) * 100);
  const color = pct > 50 ? 'var(--G)' : pct > 20 ? 'var(--Y)' : 'var(--B)';
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
      <div style={{ flex: 1, height: 10, background: 'var(--bd)', borderRadius: 5, overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${pct}%`, background: color, borderRadius: 5, transition: 'width 1s linear, background .4s' }} />
      </div>
      <div style={{ fontFamily: 'var(--fH)', fontSize: '1.4rem', color, minWidth: 50, textAlign: 'right', animation: seconds <= 10 ? 'blink .5s infinite' : 'none' }}>
        {String(Math.floor(seconds / 60)).padStart(2, '0')}:{String(seconds % 60).padStart(2, '0')}
      </div>
    </div>
  );
}

// ─── Combo badge ──────────────────────────────────────────────────────────────
function ComboBadge({ combo }) {
  if (combo < 2) return null;
  const colors = ['', '', '#3A6E52', '#2C4A6E', '#C6A15B', '#8C3A30', '#5A3A6E'];
  const color = colors[Math.min(combo, colors.length - 1)] || '#C6A15B';
  return (
    <div style={{
      display: 'inline-flex', alignItems: 'center', gap: 5,
      background: `${color}18`, border: `1.5px solid ${color}55`,
      borderRadius: 20, padding: '3px 12px',
      fontFamily: 'var(--fH)', fontSize: '.72rem', color,
      animation: 'pulse .4s ease',
    }}>
      🔥 ×{combo} COMBO
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════
export default function SophismDuel({ user, saveUser, showToast }) {
  const DURATION = 60;

  // ── Shared state ──
  const [mode, setMode] = useState(null);       // null | 'classic' | 'speedrun'
  const [phase, setPhase] = useState('intro');  // intro | playing | result | done

  // ── Classic state ──
  const [classicDuel, setClassicDuel] = useState(null);
  const [classicSel, setClassicSel] = useState(null);
  const [classicTime, setClassicTime] = useState(DURATION);
  const [classicResult, setClassicResult] = useState(null);
  const [claimedToday] = useState(() => {
    try { const r = JSON.parse(localStorage.getItem(CLASSIC_KEY) || '{}'); return r.date === new Date().toDateString(); }
    catch { return false; }
  });

  // ── Speed Run state ──
  const [srTime, setSrTime] = useState(DURATION);
  const [srQueue, setSrQueue] = useState([]);     // shuffled question queue
  const [srIdx, setSrIdx] = useState(0);          // current question index
  const [srAnswers, setSrAnswers] = useState([]);  // { correct, fallacyId, selected }
  const [combo, setCombo] = useState(0);
  const [maxCombo, setMaxCombo] = useState(0);
  const [flash, setFlash] = useState(null);       // 'correct' | 'wrong' | null (brief feedback)
  const [srSummary, setSrSummary] = useState(null); // end-of-run stats
  const [worldRecord, setWorldRecord] = useState(0);

  const timerRef = useRef(null);
  const srPhaseRef = useRef('running'); // track SR running state in ref for timer cb
  // Always tracks the latest user prop — fixes stale-closure in async done useEffect
  const userRef = useRef(user);
  useEffect(() => { userRef.current = user; }, [user]);

  // Load world record on mount
  useEffect(() => { getWorldRecord().then(setWorldRecord); }, []);

  // ── Timer helpers ──
  const stopTimer = useCallback(() => {
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
  }, []);

  useEffect(() => () => stopTimer(), [stopTimer]);

  // ── CLASSIC helpers ──────────────────────────────────────────────────────────
  const startClassicTimer = useCallback(() => {
    stopTimer();
    timerRef.current = setInterval(() => {
      setClassicTime(t => {
        if (t <= 1) {
          stopTimer();
          setClassicResult({ correct: false, timedOut: true, xpGained: 0 });
          setPhase('result');
          return 0;
        }
        return t - 1;
      });
    }, 1000);
  }, [stopTimer]);

  const handleClassicStart = () => {
    const q = SEED_DUELS[Math.floor(Math.random() * SEED_DUELS.length)];
    setClassicDuel(q);
    setClassicSel(null);
    setClassicTime(DURATION);
    setClassicResult(null);
    setPhase('playing');
    setTimeout(startClassicTimer, 150);
  };

  const handleClassicSubmit = () => {
    if (!classicSel || !classicDuel) return;
    stopTimer();
    const correct = classicSel === classicDuel.fallacyId;
    const xpGained = correct ? 50 : 10;
    setClassicResult({ correct, timedOut: false, xpGained });
    setPhase('result');
    if (user && !claimedToday) {
      saveUser({ ...user, xp: (user.xp || 0) + xpGained });
      showToast(`${correct ? '🎯 Bravo !' : '📘 Bien tenté !'} +${xpGained} XP`, correct ? 'achievement' : 'info');
      try { localStorage.setItem(CLASSIC_KEY, JSON.stringify({ date: new Date().toDateString(), correct })); } catch {}
    } else if (claimedToday) {
      showToast("Pratique libre — pas de XP aujourd'hui.", 'info');
    }
  };

  // ── SPEED RUN helpers ────────────────────────────────────────────────────────
  const buildQueue = () => {
    // Cycle through SEED_DUELS in random order, repeat as needed to fill 60s
    const shuffled = [...SEED_DUELS].sort(() => Math.random() - 0.5);
    // Double it to ensure we never run out of questions
    return [...shuffled, ...shuffled.sort(() => Math.random() - 0.5)];
  };

  const startSpeedRun = () => {
    const q = buildQueue();
    setSrQueue(q);
    setSrIdx(0);
    setSrAnswers([]);
    setCombo(0);
    setMaxCombo(0);
    setSrTime(DURATION);
    setFlash(null);
    setSrSummary(null);
    srPhaseRef.current = 'running';
    setPhase('playing');

    stopTimer();
    timerRef.current = setInterval(() => {
      setSrTime(t => {
        if (t <= 1) {
          stopTimer();
          srPhaseRef.current = 'done';
          setPhase('done');
          return 0;
        }
        return t - 1;
      });
    }, 1000);
  };

  // Called when player picks an answer in speed run
  const handleSrAnswer = (choiceId) => {
    if (flash || srPhaseRef.current !== 'running') return;
    const current = srQueue[srIdx];
    if (!current) return;

    const correct = choiceId === current.fallacyId;

    // Record answer
    setSrAnswers(prev => [...prev, { correct, fallacyId: current.fallacyId, selected: choiceId }]);

    // Combo
    if (correct) {
      setCombo(c => {
        const next = c + 1;
        setMaxCombo(m => Math.max(m, next));
        return next;
      });
    } else {
      setCombo(0);
    }

    // Flash feedback
    setFlash(correct ? 'correct' : 'wrong');

    // Advance to next question after brief flash
    setTimeout(() => {
      setFlash(null);
      setSrIdx(i => i + 1);
    }, 380);
  };

  // When phase becomes 'done' → compute summary
  useEffect(() => {
    if (phase !== 'done') return;
    stopTimer();

    const correct = srAnswers.filter(a => a.correct).length;
    const total = srAnswers.length;
    const accuracy = total > 0 ? Math.round((correct / total) * 100) : 0;

    // XP: 10 per correct + combo bonuses (each was tracked individually, approximate)
    const xpGained = correct * 12;

    // By-type counts
    const byType = {};
    srAnswers.filter(a => a.correct).forEach(a => {
      byType[a.fallacyId] = (byType[a.fallacyId] || 0) + 1;
    });

    // Save best score locally
    saveBestScore(correct);

    // ELO + Supabase async (non-blocking)
    // Use userRef.current to avoid stale-closure on the user prop
    let eloDelta = 0;
    (async () => {
      const u = userRef.current;
      eloDelta = await maybeAddElo(u, saveUser, correct, total);
      if (u) {
        // Direct object form — App.jsx saveUser doesn't support functional updates
        saveUser({ ...u, xp: (u?.xp || 0) + xpGained, elo: (u?.elo || 1000) + eloDelta });
        await upsertDuelStats(u?.id, correct, total, correct, byType);
      }
      const newWorld = await getWorldRecord();
      setWorldRecord(newWorld);

      setSrSummary({ correct, total, accuracy, xpGained, eloDelta, byType, maxCombo });
    })();
  }, [phase]); // eslint-disable-line

  // ═══════════════════════════════════════════════════════════════════════════
  // RENDER — INTRO
  // ═══════════════════════════════════════════════════════════════════════════
  if (phase === 'intro') {
    const personalBest = getBestScore();
    return (
      <div className="page">
        <div style={{ maxWidth: 580, margin: '0 auto' }}>
          {/* Header */}
          <div style={{ textAlign: 'center', marginBottom: 28 }}>
            <div style={{ fontSize: '3rem', marginBottom: 10 }}>🔍</div>
            <div style={{ fontFamily: 'var(--fH)', fontSize: '1.5rem', letterSpacing: '.12em' }}>DUEL DE RHÉTORIQUE</div>
            <div style={{ fontFamily: 'var(--fC)', fontSize: '.9rem', color: 'var(--dim)', fontStyle: 'italic', marginTop: 6 }}>
              Identifiez les sophismes cachés dans les arguments
            </div>
          </div>

          {/* Records banner */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 24 }}>
            <div style={{ background: 'rgba(44,74,110,.06)', border: '1px solid rgba(44,74,110,.2)', borderRadius: 10, padding: '14px 16px', textAlign: 'center' }}>
              <div style={{ fontFamily: 'var(--fM)', fontSize: '.52rem', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '.1em', marginBottom: 4 }}>🏅 Record Personnel</div>
              <div style={{ fontFamily: 'var(--fH)', fontSize: '2rem', color: 'var(--A)' }}>{personalBest}</div>
              <div style={{ fontFamily: 'var(--fM)', fontSize: '.52rem', color: 'var(--muted)' }}>sophismes / 60s</div>
            </div>
            <div style={{ background: 'rgba(198,161,91,.07)', border: '1px solid rgba(198,161,91,.25)', borderRadius: 10, padding: '14px 16px', textAlign: 'center' }}>
              <div style={{ fontFamily: 'var(--fM)', fontSize: '.52rem', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '.1em', marginBottom: 4 }}>🌍 Record Mondial</div>
              <div style={{ fontFamily: 'var(--fH)', fontSize: '2rem', color: 'var(--Y)' }}>{worldRecord}</div>
              <div style={{ fontFamily: 'var(--fM)', fontSize: '.52rem', color: 'var(--muted)' }}>sophismes / 60s</div>
            </div>
          </div>

          {/* Mode selection */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 20 }}>
            {/* Classic */}
            <div style={{ background: '#FDFAF4', border: '1.5px solid var(--bd)', borderRadius: 12, padding: '20px 16px', textAlign: 'center', cursor: 'pointer', transition: 'all .18s' }}
              onClick={() => { setMode('classic'); handleClassicStart(); }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--A)'; e.currentTarget.style.boxShadow = 'var(--glA)'; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--bd)'; e.currentTarget.style.boxShadow = 'none'; }}>
              <div style={{ fontSize: '2rem', marginBottom: 8 }}>🎯</div>
              <div style={{ fontFamily: 'var(--fH)', fontSize: '.88rem', letterSpacing: '.06em', marginBottom: 6 }}>Mode Classique</div>
              <div style={{ fontFamily: 'var(--fM)', fontSize: '.56rem', color: 'var(--muted)', lineHeight: 1.5 }}>
                Un argument · 60s pour répondre<br/>+50 XP correct · +10 XP raté<br/>1 défi XP / jour
              </div>
              <div style={{ marginTop: 12 }}>
                <span style={{ background: 'rgba(44,74,110,.1)', color: 'var(--A)', borderRadius: 20, padding: '3px 10px', fontFamily: 'var(--fM)', fontSize: '.52rem' }}>
                  {claimedToday ? 'Pratique libre' : '⭐ XP disponible'}
                </span>
              </div>
            </div>

            {/* Speed Run */}
            <div style={{ background: 'linear-gradient(135deg,rgba(140,58,48,.05),rgba(44,74,110,.05))', border: '1.5px solid rgba(140,58,48,.25)', borderRadius: 12, padding: '20px 16px', textAlign: 'center', cursor: 'pointer', transition: 'all .18s', position: 'relative', overflow: 'hidden' }}
              onClick={() => { setMode('speedrun'); startSpeedRun(); }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--B)'; e.currentTarget.style.boxShadow = 'var(--glB)'; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(140,58,48,.25)'; e.currentTarget.style.boxShadow = 'none'; }}>
              <div style={{ position: 'absolute', top: 6, right: 8, background: 'var(--B)', color: '#fff', borderRadius: 10, padding: '2px 8px', fontFamily: 'var(--fM)', fontSize: '.45rem', fontWeight: 700, letterSpacing: '.06em' }}>NOUVEAU</div>
              <div style={{ fontSize: '2rem', marginBottom: 8 }}>⚡</div>
              <div style={{ fontFamily: 'var(--fH)', fontSize: '.88rem', letterSpacing: '.06em', marginBottom: 6 }}>Speed Run</div>
              <div style={{ fontFamily: 'var(--fM)', fontSize: '.56rem', color: 'var(--muted)', lineHeight: 1.5 }}>
                Max de sophismes en 60s<br/>Combo multiplicateur × ELO<br/>Record personnel & mondial
              </div>
              <div style={{ marginTop: 12 }}>
                <span style={{ background: 'rgba(140,58,48,.1)', color: 'var(--B)', borderRadius: 20, padding: '3px 10px', fontFamily: 'var(--fM)', fontSize: '.52rem' }}>
                  🏆 Compétitif
                </span>
              </div>
            </div>
          </div>

          {/* Fallacies catalog (collapsed) */}
          <details style={{ background: 'var(--s1)', border: '1px solid var(--bd)', borderRadius: 10, overflow: 'hidden' }}>
            <summary style={{ padding: '12px 16px', cursor: 'pointer', fontFamily: 'var(--fB)', fontSize: '.7rem', fontWeight: 600 }}>
              📚 Catalogue des 10 sophismes à connaître
            </summary>
            <div style={{ padding: '4px 16px 14px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
              {FALLACIES.map(f => (
                <div key={f.id} style={{ padding: '6px 8px', background: '#FDFAF4', borderRadius: 6, border: '1px solid var(--bd)' }}>
                  <div style={{ fontFamily: 'var(--fB)', fontSize: '.65rem', fontWeight: 600, color: 'var(--txt)', marginBottom: 2 }}>{f.label}</div>
                  <div style={{ fontFamily: 'var(--fM)', fontSize: '.50rem', color: 'var(--muted)', lineHeight: 1.4 }}>{f.desc}</div>
                </div>
              ))}
            </div>
          </details>
        </div>
      </div>
    );
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // RENDER — CLASSIC PLAYING
  // ═══════════════════════════════════════════════════════════════════════════
  if (mode === 'classic' && phase === 'playing' && classicDuel) {
    const choices = getChoices(classicDuel.fallacyId);
    return (
      <div className="page">
        <div style={{ maxWidth: 620, margin: '0 auto' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontFamily: 'var(--fM)', fontSize: '.56rem', color: 'var(--muted)', marginBottom: 6 }}>
            <span>🎯 Mode Classique</span>
            <span>{new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}</span>
          </div>
          <TimerBar seconds={classicTime} total={DURATION} />

          <div style={{ background: 'linear-gradient(160deg,rgba(140,58,48,.04),rgba(44,74,110,.04))', border: '1px solid var(--bd)', borderLeft: '4px solid var(--B)', borderRadius: 12, padding: '24px 26px', margin: '18px 0 16px', boxShadow: 'var(--sh)' }}>
            <div style={{ fontFamily: 'var(--fM)', fontSize: '.58rem', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '.12em', marginBottom: 10 }}>🤖 Argument à analyser</div>
            <p style={{ fontFamily: 'var(--fC)', fontSize: '1.13rem', color: 'var(--txt)', lineHeight: 1.7, fontStyle: 'italic', margin: 0 }}>« {classicDuel.argument} »</p>
          </div>

          <div style={{ fontFamily: 'var(--fB)', fontSize: '.75rem', fontWeight: 600, color: 'var(--dim)', marginBottom: 10 }}>🔎 Quel sophisme est présent ?</div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 18 }}>
            {choices.map(f => (
              <button key={f.id} onClick={() => setClassicSel(f.id)} style={{
                display: 'flex', alignItems: 'flex-start', gap: 14, padding: '14px 18px',
                border: `2px solid ${classicSel === f.id ? 'var(--A)' : 'var(--bd)'}`,
                borderRadius: 10, cursor: 'pointer', textAlign: 'left',
                background: classicSel === f.id ? 'rgba(44,74,110,.07)' : '#FDFAF4',
                transition: 'all .12s', boxShadow: classicSel === f.id ? 'var(--glA)' : 'var(--sh)',
              }}>
                <div style={{ width: 20, height: 20, borderRadius: '50%', border: `2px solid ${classicSel === f.id ? 'var(--A)' : 'var(--bd2)'}`, background: classicSel === f.id ? 'var(--A)' : 'transparent', flexShrink: 0, marginTop: 2, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {classicSel === f.id && <div style={{ width: 7, height: 7, borderRadius: '50%', background: '#fff' }} />}
                </div>
                <div>
                  <div style={{ fontFamily: 'var(--fB)', fontSize: '.82rem', fontWeight: 600, color: classicSel === f.id ? 'var(--A)' : 'var(--txt)', marginBottom: 3 }}>{f.label}</div>
                  <div style={{ fontFamily: 'var(--fM)', fontSize: '.62rem', color: 'var(--muted)', lineHeight: 1.6 }}>{f.desc}</div>
                </div>
              </button>
            ))}
          </div>
          <button className="btn b-y b-lg" onClick={handleClassicSubmit} disabled={!classicSel} style={{ width: '100%', justifyContent: 'center' }}>Valider ma réponse →</button>
        </div>
      </div>
    );
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // RENDER — CLASSIC RESULT
  // ═══════════════════════════════════════════════════════════════════════════
  if (mode === 'classic' && phase === 'result' && classicDuel) {
    const fallacyCorrect = FALLACIES.find(f => f.id === classicDuel.fallacyId);
    const fallacySelected = FALLACIES.find(f => f.id === classicSel);
    const r = classicResult;
    return (
      <div className="page">
        <div style={{ maxWidth: 580, margin: '0 auto' }}>
          <div style={{ background: r?.timedOut ? 'rgba(160,90,44,.07)' : r?.correct ? 'rgba(58,110,82,.08)' : 'rgba(140,58,48,.07)', border: `1px solid ${r?.timedOut ? 'rgba(160,90,44,.3)' : r?.correct ? 'rgba(58,110,82,.3)' : 'rgba(140,58,48,.3)'}`, borderRadius: 12, padding: '24px 22px', marginBottom: 20, textAlign: 'center' }}>
            <div style={{ fontSize: '2.5rem', marginBottom: 8 }}>{r?.timedOut ? '⏰' : r?.correct ? '🎯' : '📘'}</div>
            <div style={{ fontFamily: 'var(--fH)', fontSize: '1.3rem', letterSpacing: '.08em', color: r?.timedOut ? 'var(--O)' : r?.correct ? 'var(--G)' : 'var(--B)' }}>
              {r?.timedOut ? 'TEMPS ÉCOULÉ' : r?.correct ? 'BONNE RÉPONSE !' : 'PAS TOUT À FAIT'}
            </div>
          </div>

          <div style={{ background: 'rgba(58,110,82,.06)', border: '1px solid rgba(58,110,82,.28)', borderRadius: 9, padding: '14px 18px', marginBottom: 12 }}>
            <div style={{ fontFamily: 'var(--fM)', fontSize: '.56rem', color: 'var(--G)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: 4 }}>✓ Le sophisme caché était</div>
            <div style={{ fontFamily: 'var(--fB)', fontSize: '.8rem', fontWeight: 700, marginBottom: 3 }}>{fallacyCorrect?.label}</div>
            <div style={{ fontFamily: 'var(--fM)', fontSize: '.6rem', color: 'var(--dim)' }}>{fallacyCorrect?.desc}</div>
          </div>

          {classicSel && !r?.timedOut && (
            <div style={{ background: r?.correct ? 'rgba(58,110,82,.05)' : 'rgba(140,58,48,.05)', border: `1px solid ${r?.correct ? 'rgba(58,110,82,.2)' : 'rgba(140,58,48,.2)'}`, borderRadius: 9, padding: '10px 16px', marginBottom: 12 }}>
              <div style={{ fontFamily: 'var(--fM)', fontSize: '.54rem', color: 'var(--muted)', marginBottom: 3 }}>{r?.correct ? '✓ Votre réponse (correcte)' : '✗ Votre réponse'}</div>
              <div style={{ fontFamily: 'var(--fB)', fontSize: '.73rem', color: r?.correct ? 'var(--G)' : 'var(--B)' }}>{fallacySelected?.label}</div>
            </div>
          )}

          <div style={{ background: 'rgba(44,74,110,.04)', border: '1px solid rgba(44,74,110,.15)', borderRadius: 10, padding: '18px 22px', marginBottom: 20 }}>
            <div style={{ fontFamily: 'var(--fM)', fontSize: '.58rem', color: 'var(--A)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: 8 }}>📖 Explication</div>
            <p style={{ fontFamily: 'var(--fC)', fontSize: '1rem', color: 'var(--dim)', lineHeight: 1.7, fontStyle: 'italic', margin: 0 }}>{classicDuel.explanation}</p>
          </div>

          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <button className="btn b-a b-lg" onClick={handleClassicStart} style={{ flex: 1, justifyContent: 'center' }}>🔄 Nouveau duel</button>
            <button className="btn b-ghost" onClick={() => { setPhase('intro'); setMode(null); }} style={{ flex: 1, justifyContent: 'center' }}>← Retour</button>
          </div>
        </div>
      </div>
    );
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // RENDER — SPEED RUN PLAYING
  // ═══════════════════════════════════════════════════════════════════════════
  if (mode === 'speedrun' && phase === 'playing') {
    const currentQ = srQueue[srIdx];
    if (!currentQ) return null;
    const choices = getChoices(currentQ.fallacyId);
    const correct = srAnswers.filter(a => a.correct).length;
    const total = srAnswers.length;

    return (
      <div className="page">
        <div style={{ maxWidth: 620, margin: '0 auto' }}>
          {/* Header bar */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', alignItems: 'center', gap: 10, marginBottom: 10 }}>
            <div style={{ display: 'flex', gap: 12 }}>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontFamily: 'var(--fH)', fontSize: '1.4rem', color: 'var(--G)' }}>{correct}</div>
                <div style={{ fontFamily: 'var(--fM)', fontSize: '.46rem', color: 'var(--muted)' }}>CORRECTS</div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontFamily: 'var(--fH)', fontSize: '1.4rem', color: 'var(--txt)' }}>{total}</div>
                <div style={{ fontFamily: 'var(--fM)', fontSize: '.46rem', color: 'var(--muted)' }}>RÉPONDUS</div>
              </div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <ComboBadge combo={combo} />
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontFamily: 'var(--fM)', fontSize: '.52rem', color: 'var(--muted)', marginBottom: 2 }}>⚡ SPEED RUN</div>
              {total > 0 && <div style={{ fontFamily: 'var(--fM)', fontSize: '.52rem', color: 'var(--G)' }}>{Math.round(correct / total * 100)}% précision</div>}
            </div>
          </div>

          <TimerBar seconds={srTime} total={DURATION} />

          {/* Flash overlay */}
          {flash && (
            <div style={{
              position: 'fixed', inset: 0, zIndex: 200, pointerEvents: 'none',
              background: flash === 'correct' ? 'rgba(58,110,82,.18)' : 'rgba(140,58,48,.18)',
              animation: 'blink .38s ease forwards',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <div style={{ fontSize: '4rem', opacity: 0.9 }}>{flash === 'correct' ? '✅' : '❌'}</div>
            </div>
          )}

          {/* Argument */}
          <div style={{ background: 'linear-gradient(160deg,rgba(140,58,48,.04),rgba(44,74,110,.04))', border: '1px solid var(--bd)', borderLeft: `4px solid ${flash === 'correct' ? 'var(--G)' : flash === 'wrong' ? 'var(--B)' : 'var(--A)'}`, borderRadius: 12, padding: '22px 24px', margin: '14px 0 12px', boxShadow: 'var(--sh)', transition: 'border-color .2s' }}>
            <div style={{ fontFamily: 'var(--fM)', fontSize: '.56rem', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '.12em', marginBottom: 10 }}>
              🤖 Argument #{srIdx + 1}
            </div>
            <p style={{ fontFamily: 'var(--fC)', fontSize: '1.1rem', color: 'var(--txt)', lineHeight: 1.7, fontStyle: 'italic', margin: 0 }}>
              « {currentQ.argument} »
            </p>
          </div>

          <div style={{ fontFamily: 'var(--fB)', fontSize: '.72rem', fontWeight: 600, color: 'var(--dim)', marginBottom: 8 }}>⚡ Cliquez immédiatement — pas de bouton valider</div>

          {/* Choices — clicking IS the answer */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            {choices.map(f => (
              <button key={f.id} onClick={() => handleSrAnswer(f.id)}
                disabled={!!flash}
                style={{
                  padding: '14px 16px', border: '1.5px solid var(--bd)', borderRadius: 10,
                  cursor: flash ? 'default' : 'pointer', textAlign: 'left',
                  background: '#FDFAF4', transition: 'all .12s',
                  opacity: flash ? 0.6 : 1,
                }}
                onMouseEnter={e => { if (!flash) { e.currentTarget.style.borderColor = 'var(--A)'; e.currentTarget.style.background = 'rgba(44,74,110,.05)'; } }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--bd)'; e.currentTarget.style.background = '#FDFAF4'; }}>
                <div style={{ fontFamily: 'var(--fB)', fontSize: '.78rem', fontWeight: 700, color: 'var(--txt)', marginBottom: 4 }}>{f.label}</div>
                <div style={{ fontFamily: 'var(--fM)', fontSize: '.58rem', color: 'var(--muted)', lineHeight: 1.6 }}>{f.desc}</div>
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // RENDER — SPEED RUN SUMMARY
  // ═══════════════════════════════════════════════════════════════════════════
  if (mode === 'speedrun' && phase === 'done') {
    const s = srSummary;
    const personalBest = getBestScore();
    const isRecord = s && s.correct >= personalBest;
    // Pick a quote once (stable per render since phase=done doesn't re-trigger)
    const quote = srSummary ? randomQuote() : null;

    return (
      <div className="page">
        <div style={{ maxWidth: 560, margin: '0 auto' }}>
          {/* Banner */}
          <div style={{
            background: s && s.correct >= 7
              ? 'linear-gradient(135deg,rgba(58,110,82,.1),rgba(198,161,91,.08))'
              : 'linear-gradient(135deg,rgba(44,74,110,.06),rgba(198,161,91,.05))',
            border: `1px solid ${s && s.correct >= 7 ? 'rgba(58,110,82,.3)' : 'rgba(44,74,110,.2)'}`,
            borderRadius: 14, padding: '28px 24px', textAlign: 'center', marginBottom: 20,
          }}>
            <div style={{ fontSize: '3rem', marginBottom: 6 }}>{s ? (s.correct >= 7 ? '🏆' : s.correct >= 4 ? '🎯' : '📘') : '⏳'}</div>
            {isRecord && s && (
              <div style={{ fontFamily: 'var(--fM)', fontSize: '.58rem', color: 'var(--Y)', background: 'rgba(198,161,91,.12)', border: '1px solid rgba(198,161,91,.3)', borderRadius: 20, padding: '3px 14px', display: 'inline-block', marginBottom: 8 }}>
                ✨ NOUVEAU RECORD PERSONNEL !
              </div>
            )}
            <div style={{ fontFamily: 'var(--fH)', fontSize: '1.3rem', letterSpacing: '.1em', marginBottom: 4 }}>FIN DU SPEED RUN</div>
            {!s && <div style={{ fontFamily: 'var(--fM)', fontSize: '.62rem', color: 'var(--muted)' }}>Calcul des résultats…</div>}
          </div>

          {s && (
            <>
              {/* Stats grid */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 10, marginBottom: 20 }}>
                {[
                  ['🎯', s.correct, 'Détectés', 'var(--G)'],
                  ['📊', `${s.accuracy}%`, 'Précision', 'var(--A)'],
                  ['🔥', s.maxCombo, 'Max Combo', 'var(--O)'],
                ].map(([icon, val, label, color]) => (
                  <div key={label} style={{ background: 'var(--s1)', border: '1px solid var(--bd)', borderRadius: 10, padding: '14px 10px', textAlign: 'center' }}>
                    <div style={{ fontSize: '1.3rem', marginBottom: 4 }}>{icon}</div>
                    <div style={{ fontFamily: 'var(--fH)', fontSize: '1.6rem', color }}>{val}</div>
                    <div style={{ fontFamily: 'var(--fM)', fontSize: '.50rem', color: 'var(--muted)', textTransform: 'uppercase' }}>{label}</div>
                  </div>
                ))}
              </div>

              {/* XP + ELO */}
              <div style={{ display: 'flex', gap: 10, marginBottom: 20 }}>
                {s.xpGained > 0 && (
                  <div style={{ flex: 1, background: 'rgba(160,90,44,.07)', border: '1px solid rgba(160,90,44,.25)', borderRadius: 9, padding: '12px 14px', textAlign: 'center' }}>
                    <div style={{ fontFamily: 'var(--fH)', fontSize: '1.4rem', color: 'var(--O)' }}>+{s.xpGained}</div>
                    <div style={{ fontFamily: 'var(--fM)', fontSize: '.52rem', color: 'var(--muted)' }}>XP gagné</div>
                  </div>
                )}
                {s.eloDelta > 0 && (
                  <div style={{ flex: 1, background: 'rgba(58,110,82,.07)', border: '1px solid rgba(58,110,82,.25)', borderRadius: 9, padding: '12px 14px', textAlign: 'center' }}>
                    <div style={{ fontFamily: 'var(--fH)', fontSize: '1.4rem', color: 'var(--G)' }}>+{s.eloDelta}</div>
                    <div style={{ fontFamily: 'var(--fM)', fontSize: '.52rem', color: 'var(--muted)' }}>ELO gagné</div>
                  </div>
                )}
                {s.eloDelta === 0 && (
                  <div style={{ flex: 1, background: 'var(--s1)', border: '1px solid var(--bd)', borderRadius: 9, padding: '12px 14px', textAlign: 'center' }}>
                    <div style={{ fontFamily: 'var(--fM)', fontSize: '.58rem', color: 'var(--muted)', lineHeight: 1.5 }}>ELO requis : ≥5 correct + 80% précision</div>
                  </div>
                )}
              </div>

              {/* Sophisms breakdown */}
              {Object.keys(s.byType).length > 0 && (
                <div style={{ background: 'var(--s1)', border: '1px solid var(--bd)', borderRadius: 10, padding: '14px 16px', marginBottom: 20 }}>
                  <div style={{ fontFamily: 'var(--fM)', fontSize: '.56rem', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '.1em', marginBottom: 10 }}>Sophismes correctement identifiés</div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                    {Object.entries(s.byType).map(([id, count]) => {
                      const f = FALLACIES.find(x => x.id === id);
                      return f ? (
                        <div key={id} style={{ background: 'rgba(58,110,82,.08)', border: '1px solid rgba(58,110,82,.22)', borderRadius: 20, padding: '3px 10px', display: 'flex', alignItems: 'center', gap: 5 }}>
                          <span style={{ fontFamily: 'var(--fB)', fontSize: '.62rem', fontWeight: 600, color: 'var(--G)' }}>{f.label}</span>
                          <span style={{ fontFamily: 'var(--fH)', fontSize: '.58rem', color: 'var(--G)' }}>×{count}</span>
                        </div>
                      ) : null;
                    })}
                  </div>
                </div>
              )}
            </>
          )}

          {/* Citation philosophique */}
          {quote && (
            <div style={{ borderTop: '1px solid var(--bd)', paddingTop: 18, marginBottom: 18, textAlign: 'center' }}>
              <p style={{ fontFamily: 'var(--fC)', fontSize: '.88rem', fontStyle: 'italic', color: 'var(--dim)', lineHeight: 1.65, margin: '0 0 6px' }}>
                « {quote.quote} »
              </p>
              <div style={{ fontFamily: 'var(--fM)', fontSize: '.58rem', color: 'var(--muted)', letterSpacing: '.06em' }}>— {quote.author}</div>
            </div>
          )}

          <div style={{ display: 'flex', gap: 10 }}>
            <button className="btn b-a b-lg" onClick={() => { startSpeedRun(); }} style={{ flex: 1, justifyContent: 'center' }}>⚡ Rejouer</button>
            <button className="btn b-ghost" onClick={() => { setPhase('intro'); setMode(null); }} style={{ flex: 1, justifyContent: 'center' }}>← Retour</button>
          </div>
        </div>
      </div>
    );
  }

  return null;
}
