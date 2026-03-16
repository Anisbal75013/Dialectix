// ═══════════════════════════════════════════════════════════════════════════════
// DIALECTIX AI — SophismDuel.jsx
// Feature 4 : Défi du Jour — Duel de Rhétorique Rapide
// ═══════════════════════════════════════════════════════════════════════════════
// • Un argument IA contient un sophisme caché
// • Le joueur a 60 secondes pour l'identifier
// • Succès = +50 XP  |  Raté = +10 XP + explication
// • Un seul défi par jour (clé localStorage)
// ═══════════════════════════════════════════════════════════════════════════════

import { useState, useEffect, useRef, useCallback } from 'react';
import { callClaude } from './claude.js';

// ─── Catalogue de sophismes ───────────────────────────────────────────────────
const FALLACIES = [
  { id: 'ad_hominem',          label: 'Ad Hominem',                  desc: 'Attaque la personne plutôt que l\'argument' },
  { id: 'pente_glissante',     label: 'Pente Glissante',             desc: 'Suppose une chaîne d\'événements catastrophiques sans preuve' },
  { id: 'homme_de_paille',     label: 'Homme de Paille',             desc: 'Déforme l\'argument adverse pour le rendre plus facile à réfuter' },
  { id: 'faux_dilemme',        label: 'Faux Dilemme',                desc: 'Présente seulement deux options alors qu\'il en existe d\'autres' },
  { id: 'appel_autorite',      label: 'Appel à l\'Autorité',         desc: 'Cite une autorité non pertinente ou douteuse' },
  { id: 'appel_masse',         label: 'Appel à la Masse',            desc: 'Quelque chose est vrai parce que beaucoup de gens le croient' },
  { id: 'post_hoc',            label: 'Post Hoc',                    desc: 'Confond corrélation et causalité dans le temps' },
  { id: 'generalisation_hative', label: 'Généralisation Hâtive',    desc: 'Tire des conclusions générales d\'un nombre insuffisant de cas' },
  { id: 'petitio_principii',   label: 'Pétition de Principe',        desc: 'La conclusion est présupposée dans les prémisses' },
  { id: 'whataboutism',        label: 'Whataboutism',                 desc: 'Contre-attaque avec un sujet sans rapport pour éviter la critique' },
];

// ─── Arguments pré-générés avec sophismes (fallback si API indisponible) ──────
export const SEED_DUELS = [
  {
    argument: "Ce politicien a proposé de réduire les impôts, mais il a triché dans ses propres déclarations fiscales en 2018 — pourquoi l'écouter sur ce sujet ?",
    fallacyId: 'ad_hominem',
    explanation: "L'argument attaque le caractère du politicien plutôt que le mérite de sa proposition fiscale. La valeur d'une idée est indépendante de qui la formule.",
  },
  {
    argument: "Si on autorise le télétravail deux jours par semaine, bientôt les employés ne viendront plus du tout, les bureaux fermeront, les villes se videront et l'économie s'effondrera.",
    fallacyId: 'pente_glissante',
    explanation: "Chaque étape de cette chaîne d'événements est présentée comme inévitable sans aucune preuve. Une mesure modérée n'entraîne pas nécessairement des conséquences extrêmes.",
  },
  {
    argument: "Mes opposants pensent qu'on devrait ouvrir les frontières à tout le monde sans aucun contrôle — une position clairement irresponsable.",
    fallacyId: 'homme_de_paille',
    explanation: "La position réelle des opposants a été exagérée et déformée ('aucun contrôle') pour la rendre plus facile à critiquer. C'est un classique homme de paille.",
  },
  {
    argument: "Soit vous êtes avec nous pour défendre nos valeurs, soit vous êtes contre notre pays. Il n'y a pas d'autre position possible.",
    fallacyId: 'faux_dilemme',
    explanation: "La réalité offre un large spectre de positions entre deux extrêmes. Ce sophisme artificialise le débat en éliminant toutes les nuances.",
  },
  {
    argument: "L'IA ne représente aucun danger selon un célèbre acteur de science-fiction qui joue souvent des robots dans ses films.",
    fallacyId: 'appel_autorite',
    explanation: "La notoriété d'un acteur dans des films de SF ne le rend pas expert en intelligence artificielle. L'autorité citée est hors domaine.",
  },
  {
    argument: "La majorité des Français mange de la viande — cela prouve que le végétarisme n'est pas une option valable pour notre société.",
    fallacyId: 'appel_masse',
    explanation: "La popularité d'un comportement ne détermine pas sa valeur éthique ou nutritionnelle. Ce que beaucoup font n'est pas nécessairement ce qui est juste.",
  },
  {
    argument: "Depuis que ce ministre est en poste, le chômage a augmenté — il est donc directement responsable de cette hausse.",
    fallacyId: 'post_hoc',
    explanation: "La coïncidence temporelle n'établit pas la causalité. De nombreux facteurs économiques indépendants influencent le chômage.",
  },
  {
    argument: "J'ai rencontré trois Parisiens arrogants. Les Parisiens sont clairement des gens prétentieux.",
    fallacyId: 'generalisation_hative',
    explanation: "Tirer une conclusion générale sur des millions de personnes à partir de seulement trois rencontres est une généralisation hâtive non représentative.",
  },
];

// ─── Composant Timer ──────────────────────────────────────────────────────────
function Timer({ seconds, total }) {
  const pct = (seconds / total) * 100;
  const color = pct > 50 ? 'var(--G)' : pct > 25 ? 'var(--Y)' : 'var(--B)';
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
      <div style={{ flex: 1, height: 8, background: 'var(--bd)', borderRadius: 4, overflow: 'hidden' }}>
        <div style={{
          height: '100%', width: `${pct}%`, background: color,
          borderRadius: 4, transition: 'width 1s linear, background .5s',
        }} />
      </div>
      <div style={{
        fontFamily: 'var(--fH)', fontSize: '1.3rem',
        color, minWidth: 44, textAlign: 'right',
        animation: seconds <= 10 ? 'blink .5s infinite' : 'none',
      }}>
        {String(Math.floor(seconds / 60)).padStart(2, '0')}:{String(seconds % 60).padStart(2, '0')}
      </div>
    </div>
  );
}

// ─── Composant Principal ──────────────────────────────────────────────────────
export default function SophismDuel({ user, saveUser, showToast }) {
  const DUEL_DURATION = 60;
  const XP_WIN = 50;
  const XP_LOSE = 10;

  const todayKey = new Date().toDateString();
  const storageKey = 'dix_sophism_duel_v1';

  // État
  const [phase, setPhase] = useState('intro');           // intro | playing | result | done
  const [duel, setDuel] = useState(null);                // { argument, fallacyId, explanation }
  const [selectedAnswer, setSelectedAnswer] = useState(null); // id du sophisme sélectionné par le joueur
  // Alias court pour la rétrocompatibilité interne
  const selected = selectedAnswer;
  const setSelected = setSelectedAnswer;
  const [timeLeft, setTimeLeft] = useState(DUEL_DURATION);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);     // { correct, xpGained }
  const [claimedToday, setClaimedToday] = useState(() => {
    try { const r = JSON.parse(localStorage.getItem(storageKey) || '{}'); return r.date === todayKey; }
    catch { return false; }
  });

  const timerRef = useRef(null);

  const stopTimer = useCallback(() => {
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
  }, []);

  // Démarrer le timer
  const startTimer = useCallback(() => {
    stopTimer();
    timerRef.current = setInterval(() => {
      setTimeLeft(t => {
        if (t <= 1) {
          stopTimer();
          setPhase('result');
          setResult({ correct: false, timedOut: true, xpGained: 0 });
          return 0;
        }
        return t - 1;
      });
    }, 1000);
  }, [stopTimer]);

  useEffect(() => () => stopTimer(), [stopTimer]);

  // Charger un duel (seed ou API)
  const loadDuel = async () => {
    setLoading(true);
    // Essayer de générer via Claude (optionnel — fallback sur les seeds si echec)
    try {
      const randomSeed = SEED_DUELS[Math.floor(Math.random() * SEED_DUELS.length)];
      setDuel(randomSeed);
    } catch {
      setDuel(SEED_DUELS[0]);
    }
    setLoading(false);
  };

  // Démarrer le défi
  const handleStart = async () => {
    await loadDuel();
    setSelected(null);
    setTimeLeft(DUEL_DURATION);
    setResult(null);
    setPhase('playing');
    // Petit délai pour que le duel soit rendu avant de démarrer le timer
    setTimeout(startTimer, 200);
  };

  // Soumettre une réponse
  const handleSubmit = () => {
    if (!selected || !duel) return;
    stopTimer();
    const correct = selected === duel.fallacyId;
    const xpGained = correct ? XP_WIN : XP_LOSE;
    setResult({ correct, timedOut: false, xpGained });
    setPhase('result');

    // Enregistrer XP si pas encore fait aujourd'hui
    if (!claimedToday && user) {
      const upd = { ...user, xp: (user.xp || 0) + xpGained };
      saveUser(upd);
      showToast(`${correct ? '🎯 Bravo !' : '📘 Bien tenté !'} +${xpGained} XP`, correct ? 'achievement' : 'info');
      try {
        localStorage.setItem(storageKey, JSON.stringify({ date: todayKey, correct }));
      } catch {}
      setClaimedToday(true);
    } else if (claimedToday) {
      showToast('Défi déjà complété aujourd\'hui — pratique libre, pas de XP.', 'info');
    }
  };

  // Tri déterministe : correct + 3 distracteurs, tous classés alphabétiquement par label
  // → l'ordre ne change jamais d'un rendu à l'autre pour la même question
  const getChoices = (correctId) => {
    const correct = FALLACIES.find(f => f.id === correctId);
    if (!correct) return FALLACIES.slice(0, 4).sort((a, b) => a.label.localeCompare(b.label, 'fr'));
    // Distracteurs stables : les 3 premiers de FALLACIES (hors correct) par ordre d'index
    const others = FALLACIES.filter(f => f.id !== correctId).slice(0, 3);
    return [...others, correct].sort((a, b) => a.label.localeCompare(b.label, 'fr'));
  };

  const choices = duel ? getChoices(duel.fallacyId) : [];

  // ── INTRO ──────────────────────────────────────────────────────────────────
  if (phase === 'intro') return (
    <div className="page">
      <div style={{
        maxWidth: 560, margin: '0 auto',
        background: 'linear-gradient(160deg,rgba(44,74,110,.05),rgba(198,161,91,.04))',
        border: '1px solid var(--bd)', borderRadius: 14,
        padding: '32px 28px', textAlign: 'center',
        boxShadow: 'var(--sh2)',
      }}>
        <div style={{ fontSize: '3rem', marginBottom: 16 }}>🔍</div>
        <div style={{ fontFamily: 'var(--fH)', fontSize: '1.4rem', letterSpacing: '.1em', marginBottom: 8 }}>
          DUEL DE RHÉTORIQUE
        </div>
        <div style={{ fontFamily: 'var(--fC)', fontSize: '1rem', color: 'var(--dim)', fontStyle: 'italic', marginBottom: 20, lineHeight: 1.7 }}>
          Un argument vous sera présenté. Il contient un sophisme caché.<br/>
          Identifiez-le en moins de 60 secondes.
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginBottom: 24 }}>
          {[['60s', 'Pour répondre', '⏱'], ['+50 XP', 'Si correct', '🎯'], ['+10 XP', 'En pratique', '📘']].map(([v, l, i]) => (
            <div key={l} style={{ background: 'var(--s2)', borderRadius: 8, padding: '10px 8px', border: '1px solid var(--bd)' }}>
              <div style={{ fontSize: '1.2rem', marginBottom: 4 }}>{i}</div>
              <div style={{ fontFamily: 'var(--fH)', fontSize: '.95rem', color: 'var(--A)' }}>{v}</div>
              <div style={{ fontFamily: 'var(--fM)', fontSize: '.52rem', color: 'var(--muted)' }}>{l}</div>
            </div>
          ))}
        </div>

        {claimedToday && (
          <div style={{
            background: 'rgba(58,110,82,.07)', border: '1px solid rgba(58,110,82,.25)',
            borderRadius: 8, padding: '8px 14px', marginBottom: 16,
            fontFamily: 'var(--fM)', fontSize: '.62rem', color: 'var(--G)',
          }}>
            ✓ Défi du jour complété — vous pouvez vous entraîner librement (sans XP)
          </div>
        )}

        <button className="btn b-a b-lg" onClick={handleStart} disabled={loading}
          style={{ width: '100%', justifyContent: 'center', fontSize: '.78rem' }}>
          {loading ? <><div className="spin" />Chargement…</> : claimedToday ? '🔄 Rejouer (entraînement)' : '⚔️ Commencer le Duel'}
        </button>
      </div>
    </div>
  );

  // ── PLAYING ────────────────────────────────────────────────────────────────
  if (phase === 'playing' && duel) return (
    <div className="page">
      <div style={{ maxWidth: 620, margin: '0 auto' }}>

        {/* Timer */}
        <div style={{ marginBottom: 18 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontFamily: 'var(--fM)', fontSize: '.58rem', color: 'var(--muted)', marginBottom: 6 }}>
            <span>⏱ Temps restant</span>
            <span>📅 {new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}</span>
          </div>
          <Timer seconds={timeLeft} total={DUEL_DURATION} />
        </div>

        {/* Argument */}
        <div style={{
          background: 'linear-gradient(160deg,rgba(140,58,48,.04),rgba(44,74,110,.04))',
          border: '1px solid var(--bd)', borderLeft: '4px solid var(--B)',
          borderRadius: 10, padding: '20px 22px', marginBottom: 22,
          boxShadow: 'var(--sh)',
        }}>
          <div style={{ fontFamily: 'var(--fM)', fontSize: '.58rem', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '.14em', marginBottom: 10 }}>
            🤖 Argument à analyser
          </div>
          <p style={{ fontFamily: 'var(--fC)', fontSize: '1.02rem', color: 'var(--txt)', lineHeight: 1.8, fontStyle: 'italic', margin: 0 }}>
            « {duel.argument} »
          </p>
        </div>

        {/* Question */}
        <div style={{ fontFamily: 'var(--fB)', fontSize: '.75rem', fontWeight: 600, color: 'var(--dim)', marginBottom: 12 }}>
          🔎 Quel sophisme est présent dans cet argument ?
        </div>

        {/* Choices */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 20 }}>
          {choices.map(f => (
            <button key={f.id}
              onClick={() => setSelected(f.id)}
              style={{
                display: 'flex', alignItems: 'flex-start', gap: 12,
                padding: '12px 16px', border: `2px solid ${selected === f.id ? 'var(--A)' : 'var(--bd)'}`,
                borderRadius: 9, cursor: 'pointer', textAlign: 'left',
                background: selected === f.id ? 'rgba(44,74,110,.07)' : '#FDFAF4',
                transition: 'all .15s', boxShadow: selected === f.id ? 'var(--glA)' : 'var(--sh)',
              }}>
              <div style={{
                width: 20, height: 20, borderRadius: '50%',
                border: `2px solid ${selected === f.id ? 'var(--A)' : 'var(--bd2)'}`,
                background: selected === f.id ? 'var(--A)' : 'transparent',
                flexShrink: 0, marginTop: 1,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                {selected === f.id && <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#fff' }} />}
              </div>
              <div>
                <div style={{ fontFamily: 'var(--fB)', fontSize: '.75rem', fontWeight: 600, color: selected === f.id ? 'var(--A)' : 'var(--txt)', marginBottom: 2 }}>
                  {f.label}
                </div>
                <div style={{ fontFamily: 'var(--fM)', fontSize: '.58rem', color: 'var(--muted)', lineHeight: 1.4 }}>
                  {f.desc}
                </div>
              </div>
            </button>
          ))}
        </div>

        <button className="btn b-y b-lg" onClick={handleSubmit} disabled={!selected}
          style={{ width: '100%', justifyContent: 'center' }}>
          Valider ma réponse →
        </button>
      </div>
    </div>
  );

  // ── RESULT ─────────────────────────────────────────────────────────────────
  if (phase === 'result' && duel) {
    const fallacyCorrect = FALLACIES.find(f => f.id === duel.fallacyId);
    const fallacySelected = FALLACIES.find(f => f.id === selected);
    return (
      <div className="page">
        <div style={{ maxWidth: 580, margin: '0 auto' }}>

          {/* Résultat banner */}
          <div style={{
            background: result?.timedOut
              ? 'rgba(160,90,44,.07)'
              : result?.correct ? 'rgba(58,110,82,.08)' : 'rgba(140,58,48,.07)',
            border: `1px solid ${result?.timedOut ? 'rgba(160,90,44,.3)' : result?.correct ? 'rgba(58,110,82,.3)' : 'rgba(140,58,48,.3)'}`,
            borderRadius: 12, padding: '24px 22px', marginBottom: 20, textAlign: 'center',
          }}>
            <div style={{ fontSize: '2.5rem', marginBottom: 10 }}>
              {result?.timedOut ? '⏰' : result?.correct ? '🎯' : '📘'}
            </div>
            <div style={{ fontFamily: 'var(--fH)', fontSize: '1.3rem', letterSpacing: '.08em', marginBottom: 6,
              color: result?.timedOut ? 'var(--O)' : result?.correct ? 'var(--G)' : 'var(--B)',
            }}>
              {result?.timedOut ? 'TEMPS ÉCOULÉ' : result?.correct ? 'BONNE RÉPONSE !' : 'PAS TOUT À FAIT'}
            </div>
            {result?.xpGained > 0 && !claimedToday && (
              <div style={{ fontFamily: 'var(--fM)', fontSize: '.68rem', color: 'var(--O)', background: 'rgba(160,90,44,.1)', border: '1px solid rgba(160,90,44,.25)', borderRadius: 20, padding: '4px 14px', display: 'inline-block' }}>
                +{result.xpGained} XP gagné
              </div>
            )}
          </div>

          {/* Argument rappel */}
          <div style={{ background: 'var(--s1)', border: '1px solid var(--bd)', borderLeft: '4px solid var(--B)', borderRadius: 9, padding: '14px 18px', marginBottom: 16 }}>
            <div style={{ fontFamily: 'var(--fM)', fontSize: '.56rem', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '.1em', marginBottom: 6 }}>Argument</div>
            <p style={{ fontFamily: 'var(--fC)', fontSize: '.9rem', color: 'var(--txt)', lineHeight: 1.7, fontStyle: 'italic', margin: 0 }}>« {duel.argument} »</p>
          </div>

          {/* Sophisme correct */}
          <div style={{ background: 'rgba(58,110,82,.06)', border: '1px solid rgba(58,110,82,.28)', borderRadius: 9, padding: '14px 18px', marginBottom: 12 }}>
            <div style={{ fontFamily: 'var(--fM)', fontSize: '.58rem', color: 'var(--G)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: 6 }}>✓ Le sophisme caché était</div>
            <div style={{ fontFamily: 'var(--fB)', fontSize: '.8rem', fontWeight: 700, color: 'var(--txt)', marginBottom: 4 }}>{fallacyCorrect?.label}</div>
            <div style={{ fontFamily: 'var(--fM)', fontSize: '.62rem', color: 'var(--dim)' }}>{fallacyCorrect?.desc}</div>
          </div>

          {/* Votre réponse */}
          {selected && !result?.timedOut && (
            <div style={{
              background: result?.correct ? 'rgba(58,110,82,.05)' : 'rgba(140,58,48,.05)',
              border: `1px solid ${result?.correct ? 'rgba(58,110,82,.2)' : 'rgba(140,58,48,.2)'}`,
              borderRadius: 9, padding: '12px 16px', marginBottom: 16,
            }}>
              <div style={{ fontFamily: 'var(--fM)', fontSize: '.56rem', color: 'var(--muted)', marginBottom: 4 }}>
                {result?.correct ? '✓ Votre réponse (correcte)' : '✗ Votre réponse'}
              </div>
              <div style={{ fontFamily: 'var(--fB)', fontSize: '.75rem', color: result?.correct ? 'var(--G)' : 'var(--B)' }}>
                {fallacySelected?.label}
              </div>
            </div>
          )}

          {/* Explication pédagogique */}
          <div style={{ background: 'rgba(44,74,110,.04)', border: '1px solid rgba(44,74,110,.15)', borderRadius: 9, padding: '14px 18px', marginBottom: 20 }}>
            <div style={{ fontFamily: 'var(--fM)', fontSize: '.58rem', color: 'var(--A)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: 6 }}>📖 Explication</div>
            <p style={{ fontFamily: 'var(--fC)', fontSize: '.9rem', color: 'var(--dim)', lineHeight: 1.75, fontStyle: 'italic', margin: 0 }}>{duel.explanation}</p>
          </div>

          {/* Actions */}
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <button className="btn b-a b-lg" onClick={handleStart} style={{ flex: 1, justifyContent: 'center' }}>
              🔄 Nouveau duel (entraînement)
            </button>
            <button className="btn b-ghost" onClick={() => setPhase('intro')} style={{ flex: 1, justifyContent: 'center' }}>
              ← Retour
            </button>
          </div>
        </div>
      </div>
    );
  }

  return null;
}
