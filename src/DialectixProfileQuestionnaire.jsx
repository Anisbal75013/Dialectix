/**
 * DialectixProfileQuestionnaire.jsx
 *
 * Shown before the first battle if localStorage['dx_profile'] is absent.
 * Every question can be answered OR skipped.
 * Stored in localStorage['dx_profile'].
 *
 * Props: { onComplete: fn(profile), onSkip: fn() }
 */

import { useState } from 'react';

/* ── Profile helpers (exported for use elsewhere) ─────────────────────── */
export function getPlayerProfile() {
  try {
    const raw = localStorage.getItem('dx_profile');
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

export function savePlayerProfile(profile) {
  try {
    localStorage.setItem('dx_profile', JSON.stringify({ ...profile, completedAt: Date.now() }));
  } catch { /* ignore */ }
}

export function hasCompletedProfile() {
  return !!getPlayerProfile();
}

/* ── Questions definition ─────────────────────────────────────────────── */
const QUESTIONS = [
  {
    id: 'education',
    label: 'Niveau d\'études',
    icon: '🎓',
    type: 'choice',
    options: [
      { value: 'lycee',    label: 'Lycée' },
      { value: 'licence',  label: 'Licence / Bachelor' },
      { value: 'master',   label: 'Master / Grande école' },
      { value: 'doctorat', label: 'Doctorat / Recherche' },
      { value: 'autre',    label: 'Autre' },
    ],
  },
  {
    id: 'domains',
    label: 'Domaines favoris de débat',
    icon: '📚',
    type: 'multiChoice',
    maxSelect: 3,
    options: [
      { value: 'philosophie',  label: '🔵 Philosophie' },
      { value: 'politique',    label: '🔴 Politique' },
      { value: 'science',      label: '🟢 Science & Tech' },
      { value: 'ethique',      label: '⚖️ Éthique' },
      { value: 'economie',     label: '💰 Économie' },
      { value: 'geopolitique', label: '🌍 Géopolitique' },
      { value: 'societe',      label: '👥 Société' },
      { value: 'histoire',     label: '📜 Histoire' },
    ],
  },
  {
    id: 'argumentStyle',
    label: 'Style argumentatif préféré',
    icon: '🗣',
    type: 'choice',
    options: [
      { value: 'logical',   label: '🔷 Logique — Raisonnement structuré et prémisses claires' },
      { value: 'rhetorical',label: '🎭 Rhétorique — Persuasion par le langage et les figures' },
      { value: 'factual',   label: '📊 Factuel — Données, études, sources vérifiables' },
    ],
  },
  {
    id: 'argumentLength',
    label: 'Longueur d\'argument préférée',
    icon: '📝',
    type: 'choice',
    options: [
      { value: 'court',  label: '⚡ Court — Percutant, ciblé (1-2 phrases clés)' },
      { value: 'moyen',  label: '⚖️ Moyen — Équilibré, structuré (3-4 phrases)' },
      { value: 'long',   label: '📖 Long — Développé, nuancé (5+ phrases)' },
    ],
  },
  {
    id: 'confrontationTolerance',
    label: 'Tolérance à la confrontation',
    icon: '⚔️',
    type: 'choice',
    options: [
      { value: 'faible', label: '🕊 Faible — Je préfère les échanges courtois' },
      { value: 'moyen',  label: '🤝 Moyen — J\'accepte les débats animés' },
      { value: 'eleve',  label: '🔥 Élevé — J\'aime les confrontations intenses' },
    ],
  },
];

/* ── Component ────────────────────────────────────────────────────────── */
export default function DialectixProfileQuestionnaire({ onComplete, onSkip }) {
  const [step, setStep]       = useState(0);
  const [answers, setAnswers] = useState({});
  const [skipped, setSkipped] = useState(new Set());

  const q = QUESTIONS[step];
  const isLast = step === QUESTIONS.length - 1;

  function handleSelect(value) {
    if (q.type === 'multiChoice') {
      const current = answers[q.id] || [];
      const next = current.includes(value)
        ? current.filter(v => v !== value)
        : current.length < q.maxSelect ? [...current, value] : current;
      setAnswers(prev => ({ ...prev, [q.id]: next }));
    } else {
      setAnswers(prev => ({ ...prev, [q.id]: value }));
    }
  }

  function handleNext() {
    if (isLast) handleFinish();
    else setStep(s => s + 1);
  }

  function handleSkip() {
    setSkipped(prev => new Set([...prev, q.id]));
    if (isLast) handleFinish();
    else setStep(s => s + 1);
  }

  function handleFinish() {
    const profile = { ...answers, skippedQuestions: [...skipped], version: 1 };
    savePlayerProfile(profile);
    onComplete?.(profile);
  }

  const isAnswered = q.type === 'multiChoice'
    ? (answers[q.id] || []).length > 0
    : !!answers[q.id];

  const progress = ((step + 1) / QUESTIONS.length) * 100;

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(20,14,4,.88)', zIndex: 9800, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <div style={{ background: '#FDFAF4', borderRadius: 14, maxWidth: 560, width: '100%', overflow: 'hidden', boxShadow: '0 24px 80px rgba(0,0,0,.5)' }}>

        {/* Header */}
        <div style={{ background: 'linear-gradient(135deg,rgba(44,74,110,.06),rgba(198,161,91,.05))', borderBottom: '1px solid var(--bd)', padding: '22px 28px 18px' }}>
          <div style={{ fontFamily: 'var(--fH)', fontSize: '1.1rem', letterSpacing: '.14em', color: 'var(--txt)', marginBottom: 6 }}>
            PROFIL <span style={{ color: 'var(--Y)' }}>DIALECTIX</span>
          </div>
          <div style={{ fontFamily: 'var(--fM)', fontSize: '.6rem', color: 'var(--muted)', marginBottom: 14 }}>
            Personnalisez votre expérience — chaque question est optionnelle.
          </div>
          {/* Progress bar */}
          <div style={{ height: 4, background: 'var(--s2)', borderRadius: 2, overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${progress}%`, background: 'linear-gradient(90deg,var(--A),var(--Y))', borderRadius: 2, transition: 'width .3s ease' }}/>
          </div>
          <div style={{ fontFamily: 'var(--fM)', fontSize: '.52rem', color: 'var(--muted)', marginTop: 6 }}>
            Question {step + 1} / {QUESTIONS.length}
          </div>
        </div>

        {/* Question body */}
        <div style={{ padding: '28px 28px 24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
            <span style={{ fontSize: '1.5rem' }}>{q.icon}</span>
            <div style={{ fontFamily: 'var(--fH)', fontSize: '.92rem', color: 'var(--txt)', letterSpacing: '.03em' }}>{q.label}</div>
            {q.type === 'multiChoice' && (
              <span style={{ fontFamily: 'var(--fM)', fontSize: '.52rem', color: 'var(--muted)', marginLeft: 'auto', flexShrink: 0 }}>
                max {q.maxSelect}
              </span>
            )}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {q.options.map(opt => {
              const selected = q.type === 'multiChoice'
                ? (answers[q.id] || []).includes(opt.value)
                : answers[q.id] === opt.value;
              return (
                <button
                  key={opt.value}
                  onClick={() => handleSelect(opt.value)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 12, padding: '11px 16px',
                    borderRadius: 8, border: `1.5px solid ${selected ? 'var(--A)' : 'var(--bd)'}`,
                    background: selected ? 'rgba(44,74,110,.07)' : 'transparent',
                    cursor: 'pointer', textAlign: 'left', transition: 'all .14s',
                    fontFamily: 'var(--fB)', fontSize: '.78rem', color: selected ? 'var(--A)' : 'var(--txt)',
                  }}
                >
                  <div style={{ width: 16, height: 16, borderRadius: q.type === 'multiChoice' ? 3 : '50%', border: `2px solid ${selected ? 'var(--A)' : 'var(--bd2)'}`, background: selected ? 'var(--A)' : 'transparent', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {selected && <span style={{ color: '#fff', fontSize: '.6rem', lineHeight: 1 }}>✓</span>}
                  </div>
                  {opt.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Footer */}
        <div style={{ padding: '0 28px 24px', display: 'flex', gap: 10, justifyContent: 'space-between', alignItems: 'center' }}>
          <button
            onClick={handleSkip}
            style={{ fontFamily: 'var(--fM)', fontSize: '.62rem', color: 'var(--muted)', background: 'none', border: 'none', cursor: 'pointer', padding: '8px 0', letterSpacing: '.04em' }}
          >
            Passer la question →
          </button>
          <div style={{ display: 'flex', gap: 10 }}>
            {step > 0 && (
              <button onClick={() => setStep(s => s - 1)} style={{ fontFamily: 'var(--fH)', fontSize: '.64rem', letterSpacing: '.06em', padding: '9px 16px', borderRadius: 7, border: '1px solid var(--bd)', background: 'transparent', color: 'var(--txt)', cursor: 'pointer' }}>
                ← Retour
              </button>
            )}
            <button
              onClick={handleNext}
              disabled={!isAnswered}
              style={{ fontFamily: 'var(--fH)', fontSize: '.64rem', letterSpacing: '.06em', padding: '9px 20px', borderRadius: 7, border: 'none', background: isAnswered ? 'var(--A)' : 'var(--s2)', color: isAnswered ? '#fff' : 'var(--muted)', cursor: isAnswered ? 'pointer' : 'default', transition: 'background .14s' }}
            >
              {isLast ? '✓ Terminer' : 'Suivant →'}
            </button>
          </div>
        </div>

        {/* Skip all link */}
        <div style={{ borderTop: '1px solid var(--bd)', padding: '12px 28px', textAlign: 'center' }}>
          <button
            onClick={() => { savePlayerProfile({ skippedAll: true, version: 1 }); onSkip?.(); }}
            style={{ fontFamily: 'var(--fM)', fontSize: '.56rem', color: 'var(--muted)', background: 'none', border: 'none', cursor: 'pointer', letterSpacing: '.04em' }}
          >
            Passer le questionnaire complet et débattre maintenant
          </button>
        </div>
      </div>
    </div>
  );
}
