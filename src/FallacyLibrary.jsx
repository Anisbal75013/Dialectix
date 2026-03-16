// ═══════════════════════════════════════════════════════════════════════════════
// DIALECTIX AI — FallacyLibrary.jsx  (La Bibliothèque Universelle)
// ═══════════════════════════════════════════════════════════════════════════════
// • Dictionnaire des 10 sophismes avec définitions + exemples tirés de SEED_DUELS
// • Quiz Express : 5 questions aléatoires, 30s/question
// • Stats personnelles (localStorage)
// ═══════════════════════════════════════════════════════════════════════════════

import { useState, useEffect, useRef } from 'react';
import { FALLACIES, SEED_DUELS } from './SophismDuel.jsx';

// ─── Catégories enrichies ──────────────────────────────────────────────────────
const CATEGORIES = [
  { id: 'all',       label: 'Tous',              icon: '📚' },
  { id: 'attaque',   label: 'Attaque Personne',  icon: '🎯' },
  { id: 'logique',   label: 'Logique Causale',   icon: '🔗' },
  { id: 'emotion',   label: 'Appels Émotifs',    icon: '💬' },
  { id: 'structure', label: 'Structure Fausse',  icon: '⚙️' },
];

// Mapping fallacy → catégorie
const FALLACY_CATEGORY = {
  ad_hominem:            'attaque',
  homme_de_paille:       'attaque',
  whataboutism:          'attaque',
  pente_glissante:       'logique',
  post_hoc:              'logique',
  generalisation_hative: 'logique',
  petitio_principii:     'logique',
  appel_autorite:        'emotion',
  appel_masse:           'emotion',
  faux_dilemme:          'structure',
};

// Enrichissement des fallacies avec niveau de difficulté et exemples célèbres
const FALLACY_META = {
  ad_hominem:            { diff: 1, icon: '🎯', color: '#8C3A30', bg: 'rgba(140,58,48,.08)',  famous: 'Attaquer Einstein sur sa nationalité pour nier la relativité.' },
  pente_glissante:       { diff: 2, icon: '📉', color: '#5A3A6E', bg: 'rgba(90,58,110,.08)',  famous: 'Si on légalise le cannabis, bientôt toutes les drogues seront légales.' },
  homme_de_paille:       { diff: 2, icon: '🌾', color: '#A05A2C', bg: 'rgba(160,90,44,.08)', famous: 'Défenseurs des droits animaux veulent qu\'on mange de l\'herbe.' },
  faux_dilemme:          { diff: 2, icon: '⚖️', color: '#2C4A6E', bg: 'rgba(44,74,110,.08)',  famous: '"Vous êtes avec nous ou contre nous." — G.W. Bush' },
  appel_autorite:        { diff: 1, icon: '👑', color: '#C6A15B', bg: 'rgba(198,161,91,.08)', famous: 'Cette star de cinéma recommande ce médicament.' },
  appel_masse:           { diff: 1, icon: '👥', color: '#3A6E52', bg: 'rgba(58,110,82,.08)',  famous: '1 milliard de personnes ne peuvent pas avoir tort.' },
  post_hoc:              { diff: 2, icon: '⏱', color: '#2C4A6E', bg: 'rgba(44,74,110,.08)',  famous: 'Le coq chante, le soleil se lève — le coq fait lever le soleil.' },
  generalisation_hative: { diff: 2, icon: '🔬', color: '#8C3A30', bg: 'rgba(140,58,48,.08)',  famous: 'J\'ai vu 2 chats griffus — tous les chats sont agressifs.' },
  petitio_principii:     { diff: 3, icon: '🔄', color: '#5A3A6E', bg: 'rgba(90,58,110,.08)',  famous: 'La Bible est vraie car la Bible dit qu\'elle est la parole de Dieu.' },
  whataboutism:          { diff: 2, icon: '🔀', color: '#A05A2C', bg: 'rgba(160,90,44,.08)', famous: 'Vous critiquez nos émissions ? Et les vôtres ?' },
};

const DIFF_LABELS = ['', '⭐ Facile', '⭐⭐ Moyen', '⭐⭐⭐ Avancé'];

// ─── LocalStorage helpers ─────────────────────────────────────────────────────
const LIB_KEY = 'dix_library_v1';
function getLibStats() {
  try { return JSON.parse(localStorage.getItem(LIB_KEY) || '{}'); }
  catch { return {}; }
}
function saveLibStats(stats) {
  try { localStorage.setItem(LIB_KEY, JSON.stringify(stats)); } catch {}
}

// ─── Quiz helpers ──────────────────────────────────────────────────────────────
function buildQuiz(n = 5) {
  const pool = [...SEED_DUELS].sort(() => Math.random() - 0.5).slice(0, n);
  return pool.map(d => {
    const correct = FALLACIES.find(f => f.id === d.fallacyId);
    const others = FALLACIES.filter(f => f.id !== d.fallacyId)
      .sort(() => Math.random() - 0.5).slice(0, 3);
    const choices = [...others, correct].sort((a, b) => a.label.localeCompare(b.label, 'fr'));
    return { ...d, choices };
  });
}

// ─── TimerBar ─────────────────────────────────────────────────────────────────
function TimerBar({ seconds, total }) {
  const pct = Math.max(0, (seconds / total) * 100);
  const color = pct > 50 ? 'var(--G)' : pct > 20 ? 'var(--Y)' : 'var(--B)';
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <div style={{ flex: 1, height: 8, background: 'var(--bd)', borderRadius: 4, overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${pct}%`, background: color, borderRadius: 4, transition: 'width 1s linear' }} />
      </div>
      <div style={{ fontFamily: 'var(--fH)', fontSize: '1.1rem', color, minWidth: 36, textAlign: 'right' }}>
        {seconds}s
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════
export default function FallacyLibrary({ user, saveUser, showToast }) {
  const [tab, setTab] = useState('dict');       // 'dict' | 'quiz' | 'stats'
  const [category, setCategory] = useState('all');
  const [expanded, setExpanded] = useState(null); // fallacy id expanded in dict

  // ── Quiz state ──
  const [quizPhase, setQuizPhase] = useState('idle'); // idle | playing | done
  const [quizQuestions, setQuizQuestions] = useState([]);
  const [quizIdx, setQuizIdx] = useState(0);
  const [quizSel, setQuizSel] = useState(null);
  const [quizTime, setQuizTime] = useState(30);
  const [quizAnswers, setQuizAnswers] = useState([]);
  const [quizFlash, setQuizFlash] = useState(null); // 'correct'|'wrong'
  const timerRef = useRef(null);

  const stopTimer = () => { if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; } };
  useEffect(() => () => stopTimer(), []);

  // ── Stats state ──
  const [libStats, setLibStats] = useState(getLibStats);

  // ── Filtered fallacies ──
  const filteredFallacies = category === 'all'
    ? FALLACIES
    : FALLACIES.filter(f => FALLACY_CATEGORY[f.id] === category);

  // ── Dict: examples from SEED_DUELS ──
  const examplesFor = id => SEED_DUELS.filter(d => d.fallacyId === id);

  // ─── Quiz logic ────────────────────────────────────────────────────────────
  const startQuiz = () => {
    const qs = buildQuiz(5);
    setQuizQuestions(qs);
    setQuizIdx(0);
    setQuizAnswers([]);
    setQuizSel(null);
    setQuizFlash(null);
    setQuizTime(30);
    setQuizPhase('playing');
    stopTimer();
    timerRef.current = setInterval(() => {
      setQuizTime(t => {
        if (t <= 1) { handleQuizAnswer(null); return 30; }
        return t - 1;
      });
    }, 1000);
  };

  const handleQuizAnswer = (choiceId) => {
    if (quizFlash) return;
    const q = quizQuestions[quizIdx];
    if (!q) return;
    const correct = choiceId === q.fallacyId;
    setQuizFlash(correct ? 'correct' : 'wrong');
    const answers = [...quizAnswers, { correct, fallacyId: q.fallacyId, selected: choiceId }];
    setQuizSel(choiceId);

    setTimeout(() => {
      const nextIdx = quizIdx + 1;
      if (nextIdx >= quizQuestions.length) {
        // Done
        stopTimer();
        const score = answers.filter(a => a.correct).length;
        const xp = score * 8;
        // Update stats
        const s = getLibStats();
        const newStats = {
          ...s,
          quizPlayed: (s.quizPlayed || 0) + 1,
          quizBest: Math.max(s.quizBest || 0, score),
          totalXpEarned: (s.totalXpEarned || 0) + xp,
        };
        saveLibStats(newStats);
        setLibStats(newStats);
        if (user && xp > 0) {
          saveUser({ ...user, xp: (user?.xp || 0) + xp });
          showToast(`📚 Quiz terminé ! +${xp} XP`, 'achievement');
        }
        setQuizAnswers(answers);
        setQuizPhase('done');
      } else {
        setQuizIdx(nextIdx);
        setQuizSel(null);
        setQuizFlash(null);
        setQuizTime(30);
      }
    }, 900);
  };

  // ─── RENDER ────────────────────────────────────────────────────────────────
  return (
    <div className="page">
      <div style={{ maxWidth: 680, margin: '0 auto' }}>

        {/* ── Header ── */}
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <div style={{ fontSize: '2.8rem', marginBottom: 8 }}>📚</div>
          <div style={{ fontFamily: 'var(--fH)', fontSize: '1.4rem', letterSpacing: '.12em' }}>
            BIBLIOTHÈQUE DES SOPHISMES
          </div>
          <div style={{ fontFamily: 'var(--fC)', fontSize: '.88rem', color: 'var(--dim)', fontStyle: 'italic', marginTop: 6 }}>
            Le dictionnaire de référence mondiale des erreurs de raisonnement
          </div>
        </div>

        {/* ── Tabs ── */}
        <div style={{ display: 'flex', gap: 6, marginBottom: 22, borderBottom: '1px solid var(--bd)', paddingBottom: 6 }}>
          {[
            { id: 'dict',  label: '📖 Dictionnaire' },
            { id: 'quiz',  label: '⚡ Quiz Express' },
            { id: 'stats', label: '📊 Mes Stats' },
          ].map(t => (
            <button key={t.id} onClick={() => setTab(t.id)}
              style={{
                padding: '6px 16px', borderRadius: 8, border: 'none', cursor: 'pointer',
                fontFamily: 'var(--fB)', fontSize: '.68rem', fontWeight: 600,
                background: tab === t.id ? 'var(--A)' : 'var(--s1)',
                color: tab === t.id ? '#fff' : 'var(--dim)',
                transition: 'all .15s',
              }}>
              {t.label}
            </button>
          ))}
        </div>

        {/* ══════════════════════════════════════════════════════════
            TAB : DICTIONNAIRE
        ══════════════════════════════════════════════════════════ */}
        {tab === 'dict' && (
          <>
            {/* Category filter */}
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 18 }}>
              {CATEGORIES.map(c => (
                <button key={c.id} onClick={() => setCategory(c.id)}
                  style={{
                    padding: '4px 12px', borderRadius: 20, border: `1px solid ${category === c.id ? 'var(--A)' : 'var(--bd)'}`,
                    background: category === c.id ? 'rgba(44,74,110,.1)' : 'transparent',
                    color: category === c.id ? 'var(--A)' : 'var(--dim)',
                    fontFamily: 'var(--fM)', fontSize: '.58rem', cursor: 'pointer', transition: 'all .12s',
                  }}>
                  {c.icon} {c.label}
                </button>
              ))}
            </div>

            {/* Fallacy cards */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {filteredFallacies.map(f => {
                const meta = FALLACY_META[f.id] || { diff: 1, icon: '📌', color: 'var(--A)', bg: 'rgba(44,74,110,.06)' };
                const examples = examplesFor(f.id);
                const isOpen = expanded === f.id;

                return (
                  <div key={f.id}
                    style={{
                      background: meta.bg, border: `1px solid ${meta.color}44`,
                      borderLeft: `4px solid ${meta.color}`, borderRadius: 10,
                      overflow: 'hidden', transition: 'all .2s',
                    }}>
                    {/* Card header — clickable to expand */}
                    <div
                      onClick={() => setExpanded(isOpen ? null : f.id)}
                      style={{ padding: '14px 18px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 12 }}>
                      <div style={{ fontSize: '1.5rem', flexShrink: 0 }}>{meta.icon}</div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                          <div style={{ fontFamily: 'var(--fB)', fontSize: '.82rem', fontWeight: 700, color: meta.color }}>
                            {f.label}
                          </div>
                          <div style={{ fontFamily: 'var(--fM)', fontSize: '.46rem', color: meta.color, opacity: .7 }}>
                            {DIFF_LABELS[meta.diff]}
                          </div>
                        </div>
                        <div style={{ fontFamily: 'var(--fM)', fontSize: '.6rem', color: 'var(--dim)', marginTop: 3, lineHeight: 1.4 }}>
                          {f.desc}
                        </div>
                      </div>
                      <div style={{ fontSize: '.7rem', color: 'var(--muted)', flexShrink: 0 }}>
                        {isOpen ? '▲' : '▼'}
                      </div>
                    </div>

                    {/* Expanded details */}
                    {isOpen && (
                      <div style={{ padding: '0 18px 18px', borderTop: `1px solid ${meta.color}22` }}>
                        {/* Famous example */}
                        <div style={{ background: 'rgba(0,0,0,.04)', borderRadius: 7, padding: '10px 14px', marginTop: 12, marginBottom: 14 }}>
                          <div style={{ fontFamily: 'var(--fM)', fontSize: '.52rem', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '.1em', marginBottom: 4 }}>
                            💡 Exemple célèbre
                          </div>
                          <div style={{ fontFamily: 'var(--fC)', fontSize: '.82rem', color: 'var(--dim)', fontStyle: 'italic', lineHeight: 1.6 }}>
                            « {meta.famous} »
                          </div>
                        </div>

                        {/* SEED_DUELS examples */}
                        {examples.length > 0 && (
                          <div>
                            <div style={{ fontFamily: 'var(--fM)', fontSize: '.52rem', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '.1em', marginBottom: 8 }}>
                              🎯 Arguments d'entraînement ({examples.length})
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                              {examples.map((ex, i) => (
                                <div key={i} style={{ background: '#FDFAF4', border: '1px solid var(--bd)', borderRadius: 8, padding: '10px 14px' }}>
                                  <div style={{ fontFamily: 'var(--fC)', fontSize: '.8rem', color: 'var(--txt)', fontStyle: 'italic', lineHeight: 1.65, marginBottom: 6 }}>
                                    « {ex.argument} »
                                  </div>
                                  <div style={{ fontFamily: 'var(--fM)', fontSize: '.56rem', color: 'var(--G)', lineHeight: 1.4 }}>
                                    📖 {ex.explanation}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            <div style={{ textAlign: 'center', marginTop: 20, fontFamily: 'var(--fM)', fontSize: '.56rem', color: 'var(--muted)' }}>
              {filteredFallacies.length} sophisme{filteredFallacies.length > 1 ? 's' : ''} affiché{filteredFallacies.length > 1 ? 's' : ''}
            </div>
          </>
        )}

        {/* ══════════════════════════════════════════════════════════
            TAB : QUIZ EXPRESS
        ══════════════════════════════════════════════════════════ */}
        {tab === 'quiz' && (
          <>
            {quizPhase === 'idle' && (
              <div style={{ textAlign: 'center', padding: '40px 0' }}>
                <div style={{ fontSize: '3rem', marginBottom: 12 }}>⚡</div>
                <div style={{ fontFamily: 'var(--fH)', fontSize: '1.2rem', letterSpacing: '.08em', marginBottom: 10 }}>
                  QUIZ EXPRESS
                </div>
                <div style={{ fontFamily: 'var(--fM)', fontSize: '.68rem', color: 'var(--dim)', lineHeight: 1.7, marginBottom: 20, maxWidth: 360, margin: '0 auto 20px' }}>
                  5 arguments · 30 secondes chacun<br />
                  Identifiez le sophisme pour gagner +8 XP par bonne réponse
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, maxWidth: 320, margin: '0 auto 24px' }}>
                  <div style={{ background: 'var(--s1)', border: '1px solid var(--bd)', borderRadius: 9, padding: '12px 14px', textAlign: 'center' }}>
                    <div style={{ fontFamily: 'var(--fH)', fontSize: '1.4rem', color: 'var(--Y)' }}>{libStats.quizBest || 0}/5</div>
                    <div style={{ fontFamily: 'var(--fM)', fontSize: '.48rem', color: 'var(--muted)' }}>Meilleur score</div>
                  </div>
                  <div style={{ background: 'var(--s1)', border: '1px solid var(--bd)', borderRadius: 9, padding: '12px 14px', textAlign: 'center' }}>
                    <div style={{ fontFamily: 'var(--fH)', fontSize: '1.4rem', color: 'var(--G)' }}>{libStats.quizPlayed || 0}</div>
                    <div style={{ fontFamily: 'var(--fM)', fontSize: '.48rem', color: 'var(--muted)' }}>Quiz joués</div>
                  </div>
                </div>
                <button className="btn b-y b-lg" onClick={startQuiz} style={{ justifyContent: 'center', padding: '12px 36px' }}>
                  ⚡ Lancer le Quiz
                </button>
              </div>
            )}

            {quizPhase === 'playing' && (() => {
              const q = quizQuestions[quizIdx];
              if (!q) return null;
              return (
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontFamily: 'var(--fM)', fontSize: '.56rem', color: 'var(--muted)', marginBottom: 8 }}>
                    <span>Question {quizIdx + 1} / {quizQuestions.length}</span>
                    <span>{quizAnswers.filter(a => a.correct).length} correct{quizAnswers.filter(a => a.correct).length > 1 ? 's' : ''}</span>
                  </div>
                  <TimerBar seconds={quizTime} total={30} />

                  {/* Flash overlay */}
                  {quizFlash && (
                    <div style={{
                      position: 'fixed', inset: 0, zIndex: 200, pointerEvents: 'none',
                      background: quizFlash === 'correct' ? 'rgba(58,110,82,.15)' : 'rgba(140,58,48,.15)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      animation: 'fadeIn .15s ease',
                    }}>
                      <div style={{ fontSize: '3.5rem' }}>{quizFlash === 'correct' ? '✅' : '❌'}</div>
                    </div>
                  )}

                  <div style={{ background: 'linear-gradient(160deg,rgba(44,74,110,.05),rgba(198,161,91,.04))', border: '1px solid var(--bd)', borderLeft: '4px solid var(--A)', borderRadius: 10, padding: '18px 20px', margin: '16px 0 14px' }}>
                    <div style={{ fontFamily: 'var(--fM)', fontSize: '.54rem', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '.1em', marginBottom: 8 }}>
                      🤖 Identifiez le sophisme
                    </div>
                    <p style={{ fontFamily: 'var(--fC)', fontSize: '.92rem', color: 'var(--txt)', lineHeight: 1.75, fontStyle: 'italic', margin: 0 }}>
                      « {q.argument} »
                    </p>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                    {q.choices.map(f => {
                      const meta = FALLACY_META[f.id] || {};
                      let borderColor = 'var(--bd)';
                      let bg = '#FDFAF4';
                      if (quizSel && f.id === q.fallacyId) { borderColor = 'var(--G)'; bg = 'rgba(58,110,82,.06)'; }
                      else if (quizSel === f.id && f.id !== q.fallacyId) { borderColor = 'var(--B)'; bg = 'rgba(140,58,48,.06)'; }
                      return (
                        <button key={f.id} onClick={() => handleQuizAnswer(f.id)} disabled={!!quizSel}
                          style={{
                            padding: '12px 14px', border: `2px solid ${borderColor}`,
                            borderRadius: 10, cursor: quizSel ? 'default' : 'pointer',
                            textAlign: 'left', background: bg, transition: 'all .15s',
                            opacity: quizSel && f.id !== q.fallacyId && f.id !== quizSel ? .5 : 1,
                          }}>
                          <div style={{ fontSize: '.9rem', marginBottom: 3 }}>{meta.icon || '📌'}</div>
                          <div style={{ fontFamily: 'var(--fB)', fontSize: '.68rem', fontWeight: 700, color: 'var(--txt)', marginBottom: 2 }}>{f.label}</div>
                          <div style={{ fontFamily: 'var(--fM)', fontSize: '.50rem', color: 'var(--muted)', lineHeight: 1.35 }}>{f.desc}</div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })()}

            {quizPhase === 'done' && (() => {
              const score = quizAnswers.filter(a => a.correct).length;
              const xp = score * 8;
              const pct = Math.round(score / quizQuestions.length * 100);
              const emoji = score === 5 ? '🏆' : score >= 3 ? '🎯' : '📘';
              return (
                <div>
                  <div style={{ textAlign: 'center', background: score >= 4 ? 'rgba(58,110,82,.08)' : 'rgba(44,74,110,.06)', border: `1px solid ${score >= 4 ? 'rgba(58,110,82,.3)' : 'rgba(44,74,110,.2)'}`, borderRadius: 14, padding: '28px 24px', marginBottom: 20 }}>
                    <div style={{ fontSize: '3rem', marginBottom: 8 }}>{emoji}</div>
                    <div style={{ fontFamily: 'var(--fH)', fontSize: '1.4rem', letterSpacing: '.1em', marginBottom: 4 }}>
                      {score}/{quizQuestions.length} CORRECTES
                    </div>
                    <div style={{ fontFamily: 'var(--fM)', fontSize: '.65rem', color: 'var(--dim)' }}>
                      {pct}% de précision · +{xp} XP
                    </div>
                  </div>

                  {/* Answer review */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 20 }}>
                    {quizAnswers.map((a, i) => {
                      const q = quizQuestions[i];
                      const correctFallacy = FALLACIES.find(f => f.id === q?.fallacyId);
                      return q ? (
                        <div key={i} style={{ background: a.correct ? 'rgba(58,110,82,.06)' : 'rgba(140,58,48,.05)', border: `1px solid ${a.correct ? 'rgba(58,110,82,.25)' : 'rgba(140,58,48,.2)'}`, borderRadius: 8, padding: '10px 14px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                            <span style={{ fontSize: '.9rem' }}>{a.correct ? '✅' : '❌'}</span>
                            <span style={{ fontFamily: 'var(--fB)', fontSize: '.68rem', fontWeight: 600, color: a.correct ? 'var(--G)' : 'var(--B)' }}>
                              {correctFallacy?.label}
                            </span>
                          </div>
                          <div style={{ fontFamily: 'var(--fC)', fontSize: '.72rem', color: 'var(--dim)', fontStyle: 'italic', lineHeight: 1.5 }}>
                            «&thinsp;{q.argument.slice(0, 80)}{q.argument.length > 80 ? '…' : ''}&thinsp;»
                          </div>
                          {!a.correct && a.selected && (
                            <div style={{ fontFamily: 'var(--fM)', fontSize: '.54rem', color: 'var(--B)', marginTop: 4 }}>
                              Votre réponse : {FALLACIES.find(f => f.id === a.selected)?.label || 'Temps écoulé'}
                            </div>
                          )}
                        </div>
                      ) : null;
                    })}
                  </div>

                  <div style={{ display: 'flex', gap: 10 }}>
                    <button className="btn b-y b-lg" onClick={startQuiz} style={{ flex: 1, justifyContent: 'center' }}>🔄 Rejouer</button>
                    <button className="btn b-ghost" onClick={() => { setQuizPhase('idle'); setTab('dict'); }} style={{ flex: 1, justifyContent: 'center' }}>📖 Revoir le Dictionnaire</button>
                  </div>
                </div>
              );
            })()}
          </>
        )}

        {/* ══════════════════════════════════════════════════════════
            TAB : STATS PERSONNELLES
        ══════════════════════════════════════════════════════════ */}
        {tab === 'stats' && (
          <div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 10, marginBottom: 24 }}>
              {[
                ['🎮', libStats.quizPlayed || 0, 'Quiz joués', 'var(--A)'],
                ['🏆', `${libStats.quizBest || 0}/5`, 'Meilleur score', 'var(--Y)'],
                ['⭐', libStats.totalXpEarned || 0, 'XP via Biblio', 'var(--O)'],
              ].map(([icon, val, label, color]) => (
                <div key={label} style={{ background: 'var(--s1)', border: '1px solid var(--bd)', borderRadius: 10, padding: '16px 10px', textAlign: 'center' }}>
                  <div style={{ fontSize: '1.4rem', marginBottom: 4 }}>{icon}</div>
                  <div style={{ fontFamily: 'var(--fH)', fontSize: '1.6rem', color }}>{val}</div>
                  <div style={{ fontFamily: 'var(--fM)', fontSize: '.48rem', color: 'var(--muted)', textTransform: 'uppercase' }}>{label}</div>
                </div>
              ))}
            </div>

            <div style={{ background: 'var(--s1)', border: '1px solid var(--bd)', borderRadius: 10, padding: '16px 18px', marginBottom: 20 }}>
              <div style={{ fontFamily: 'var(--fM)', fontSize: '.56rem', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '.1em', marginBottom: 12 }}>
                📊 Les 10 sophismes — guide de révision
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
                {FALLACIES.map(f => {
                  const meta = FALLACY_META[f.id] || { icon: '📌', color: 'var(--A)', diff: 1 };
                  return (
                    <div key={f.id}
                      onClick={() => { setTab('dict'); setExpanded(f.id); setCategory('all'); }}
                      style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '7px 10px', background: '#FDFAF4', borderRadius: 7, border: '1px solid var(--bd)', cursor: 'pointer', transition: 'all .12s' }}
                      onMouseEnter={e => { e.currentTarget.style.borderColor = meta.color; }}
                      onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--bd)'; }}>
                      <span style={{ fontSize: '.85rem' }}>{meta.icon}</span>
                      <div>
                        <div style={{ fontFamily: 'var(--fB)', fontSize: '.62rem', fontWeight: 600, color: meta.color }}>{f.label}</div>
                        <div style={{ fontFamily: 'var(--fM)', fontSize: '.46rem', color: 'var(--muted)' }}>{DIFF_LABELS[meta.diff]}</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {(libStats.quizPlayed || 0) === 0 && (
              <div style={{ textAlign: 'center', padding: '20px 0' }}>
                <div style={{ fontFamily: 'var(--fM)', fontSize: '.65rem', color: 'var(--muted)', marginBottom: 14 }}>
                  Aucune statistique pour l'instant — lancez un Quiz Express !
                </div>
                <button className="btn b-a b-lg" onClick={() => setTab('quiz')} style={{ justifyContent: 'center' }}>
                  ⚡ Premier Quiz →
                </button>
              </div>
            )}
          </div>
        )}

      </div>
    </div>
  );
}
