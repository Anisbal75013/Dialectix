// ═══════════════════════════════════════════════════════════════════════════════
// DIALECTIX AI — SiegeAgora.jsx  (Le Siège de l'Agora)
// ═══════════════════════════════════════════════════════════════════════════════
// • Duel asynchrone : créer un défi argumentatif stocké en Supabase
// • D'autres joueurs y répondent
// • Score calculé selon présence des sophismes clés dans la réponse
// • Onglets : Créer | Défis en attente | Mes résultats
// ═══════════════════════════════════════════════════════════════════════════════

import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';

const SB = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
);

// ─── Sujets de débat prédéfinis ────────────────────────────────────────────────
const SIEGE_TOPICS = [
  {
    id: 'ia_emploi',
    title: "L'IA va-t-elle détruire l'emploi ?",
    prompt: "Un économiste affirme : « L'automatisation par l'IA détruira 30% des emplois d'ici 2035. Nous devons interdire certaines IA pour protéger les travailleurs. »",
    hint: "Identifiez les sophismes potentiels et construisez un contre-argument rigoureux.",
    color: '#2C4A6E',
  },
  {
    id: 'veganisme',
    title: "Le véganisme est-il une obligation morale ?",
    prompt: "Une militante affirme : « Tout le monde devrait être vegan. Si vous mangez des animaux, vous êtes complice de meurtre. Il n'y a pas d'autre position acceptable. »",
    hint: "Analysez la structure de cet argument et répondez sans utiliser de sophisme.",
    color: '#3A6E52',
  },
  {
    id: 'reseaux_sociaux',
    title: "Les réseaux sociaux devraient-ils être interdits aux mineurs ?",
    prompt: "Un député propose : « Depuis que TikTok existe, les adolescents sont plus dépressifs — c'est la preuve que les réseaux sociaux causent la dépression. Il faut les interdire. »",
    hint: "Repérez la confusion entre corrélation et causalité et construisez votre argument.",
    color: '#8C3A30',
  },
  {
    id: 'energies',
    title: "Nucléaire vs renouvelables : le faux débat ?",
    prompt: "Un énergéticien affirme : « Soit vous acceptez le nucléaire, soit vous acceptez que la France revienne à l'âge des bougies. Les renouvelables seules ne peuvent pas fonctionner. »",
    hint: "Déconstruisez ce raisonnement et proposez une position nuancée.",
    color: '#5A3A6E',
  },
  {
    id: 'sport',
    title: "Le sport de haut niveau détruit-il la santé ?",
    prompt: "Un médecin sportif écrit : « Tous les sportifs que j'ai soignés en carrière avaient des blessures chroniques. Le sport de haut niveau est donc dangereux pour la santé. »",
    hint: "Identifiez la généralisation hâtive et répondez avec un argument solide.",
    color: '#C6A15B',
  },
  {
    id: 'philosophie',
    title: "La philosophie est-elle utile dans le monde actuel ?",
    prompt: "Un chef d'entreprise déclare : « Les philosophes ne servent à rien. Aucun de mes employés philosophes n'a jamais apporté de valeur concrète. La philosophie est inutile. »",
    hint: "Répondez en évitant tout sophisme — construisez un argument sur la valeur de la réflexion critique.",
    color: '#A05A2C',
  },
];

// ─── Score calculator (keyword-based) ─────────────────────────────────────────
const SOPHISM_KEYWORDS = {
  ad_hominem:            ['attaque', 'caractère', 'personne', 'vie privée'],
  pente_glissante:       ['ensuite', 'bientôt', 'inévitablement', 'catastrophe'],
  homme_de_paille:       ['déformer', 'exagère', 'pas vraiment dit', 'caricature'],
  faux_dilemme:          ['soit', 'ou bien', 'aucune autre', 'pas d\'autre'],
  appel_autorite:        ['expert dit', 'selon', 'célébrité', 'autorité'],
  appel_masse:           ['tout le monde', 'majorité', 'millions de', 'consensus'],
  post_hoc:              ['depuis que', 'après que', 'corrélation', 'causalité'],
  generalisation_hative: ['tous les', 'chaque fois', 'jamais', 'toujours'],
};

function calculateScore(text) {
  if (!text || text.length < 50) return 0;
  const lower = text.toLowerCase();
  let score = 0;
  // Length bonus (10 pts per 100 chars, max 30)
  score += Math.min(30, Math.floor(text.length / 100) * 10);
  // Keyword analysis
  Object.values(SOPHISM_KEYWORDS).forEach(keywords => {
    if (keywords.some(k => lower.includes(k))) score += 15;
  });
  // Structure bonus (has multiple paragraphs or sentences)
  const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 10);
  if (sentences.length >= 3) score += 10;
  if (sentences.length >= 5) score += 10;
  return Math.min(100, score);
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════
export default function SiegeAgora({ user, saveUser, showToast }) {
  const [tab, setTab] = useState('create');       // 'create' | 'pending' | 'results'
  const [selectedTopic, setSelectedTopic] = useState(null);
  const [challengeText, setChallengeText] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const [pendingChallenges, setPendingChallenges] = useState([]);
  const [loadingPending, setLoadingPending] = useState(false);
  const [answering, setAnswering] = useState(null);  // challenge being answered
  const [answerText, setAnswerText] = useState('');

  const [myResults, setMyResults] = useState([]);
  const [loadingResults, setLoadingResults] = useState(false);

  // Load pending challenges when tab switches
  useEffect(() => {
    if (tab === 'pending') loadPending();
    if (tab === 'results') loadMyResults();
  }, [tab]); // eslint-disable-line

  const loadPending = async () => {
    setLoadingPending(true);
    try {
      const { data } = await SB
        .from('siege_agora')
        .select('*')
        .is('answer_text', null)
        .neq('challenger_id', user?.id || 'none')
        .order('created_at', { ascending: false })
        .limit(20);
      setPendingChallenges(data || []);
    } catch {
      showToast('Erreur de chargement des défis', 'error');
    }
    setLoadingPending(false);
  };

  const loadMyResults = async () => {
    if (!user?.id) return;
    setLoadingResults(true);
    try {
      const { data } = await SB
        .from('siege_agora')
        .select('*')
        .or(`challenger_id.eq.${user.id},answered_by.eq.${user.id}`)
        .order('created_at', { ascending: false })
        .limit(30);
      setMyResults(data || []);
    } catch {
      showToast('Erreur de chargement des résultats', 'error');
    }
    setLoadingResults(false);
  };

  const handleCreateChallenge = async () => {
    if (!selectedTopic || challengeText.trim().length < 50) {
      showToast('Rédigez un argument d\'au moins 50 caractères.', 'error');
      return;
    }
    if (!user) {
      showToast('Connectez-vous pour créer un défi.', 'error');
      return;
    }
    setSubmitting(true);
    try {
      const score = calculateScore(challengeText);
      await SB.from('siege_agora').insert({
        topic: selectedTopic.id,
        topic_title: selectedTopic.title,
        challenge_text: challengeText,
        challenger_id: user.id,
        challenger_name: user.name || user.email || 'Anonyme',
        score: score,
      });
      showToast('⚔️ Défi lancé dans l\'Agora ! +25 XP', 'achievement');
      saveUser({ ...user, xp: (user?.xp || 0) + 25 });
      setChallengeText('');
      setSelectedTopic(null);
      setTab('results');
    } catch {
      showToast('Erreur lors de l\'envoi du défi.', 'error');
    }
    setSubmitting(false);
  };

  const handleAnswerChallenge = async () => {
    if (!answering || answerText.trim().length < 50) {
      showToast('Rédigez une réponse d\'au moins 50 caractères.', 'error');
      return;
    }
    if (!user) {
      showToast('Connectez-vous pour répondre.', 'error');
      return;
    }
    setSubmitting(true);
    try {
      const score = calculateScore(answerText);
      await SB.from('siege_agora').update({
        answer_text: answerText,
        answered_by: user.id,
        answered_name: user.name || user.email || 'Anonyme',
        answer_score: score,
      }).eq('id', answering.id);
      showToast(`✅ Réponse soumise ! Score : ${score}/100 · +20 XP`, 'achievement');
      saveUser({ ...user, xp: (user?.xp || 0) + 20 });
      setAnswering(null);
      setAnswerText('');
      loadPending();
    } catch {
      showToast('Erreur lors de la soumission.', 'error');
    }
    setSubmitting(false);
  };

  const timeAgo = (dateStr) => {
    if (!dateStr) return '';
    const diff = Date.now() - new Date(dateStr).getTime();
    const h = Math.floor(diff / 3600000);
    if (h < 1) return 'il y a moins d\'1h';
    if (h < 24) return `il y a ${h}h`;
    return `il y a ${Math.floor(h / 24)}j`;
  };

  // ─── RENDER ────────────────────────────────────────────────────────────────
  return (
    <div className="page">
      <div style={{ maxWidth: 680, margin: '0 auto' }}>

        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <div style={{ fontSize: '2.8rem', marginBottom: 8 }}>⚔️</div>
          <div style={{ fontFamily: 'var(--fH)', fontSize: '1.4rem', letterSpacing: '.12em' }}>LE SIÈGE DE L'AGORA</div>
          <div style={{ fontFamily: 'var(--fC)', fontSize: '.88rem', color: 'var(--dim)', fontStyle: 'italic', marginTop: 6 }}>
            Duel asynchrone — Lancez des défis, répondez à la communauté
          </div>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: 6, marginBottom: 22, borderBottom: '1px solid var(--bd)', paddingBottom: 6 }}>
          {[
            { id: 'create',  label: '⚔️ Créer un Défi' },
            { id: 'pending', label: '🏟 Défis en attente' },
            { id: 'results', label: '📊 Mes résultats' },
          ].map(t => (
            <button key={t.id} onClick={() => setTab(t.id)}
              style={{
                padding: '6px 16px', borderRadius: 8, border: 'none', cursor: 'pointer',
                fontFamily: 'var(--fB)', fontSize: '.68rem', fontWeight: 600,
                background: tab === t.id ? 'var(--B)' : 'var(--s1)',
                color: tab === t.id ? '#fff' : 'var(--dim)',
                transition: 'all .15s',
              }}>
              {t.label}
            </button>
          ))}
        </div>

        {/* ══ TAB: CRÉER ══ */}
        {tab === 'create' && (
          <div>
            <div style={{ fontFamily: 'var(--fB)', fontSize: '.72rem', fontWeight: 600, color: 'var(--dim)', marginBottom: 12 }}>
              1. Choisissez un sujet de débat
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 22 }}>
              {SIEGE_TOPICS.map(topic => (
                <div key={topic.id}
                  onClick={() => setSelectedTopic(topic)}
                  style={{
                    padding: '12px 14px', border: `2px solid ${selectedTopic?.id === topic.id ? topic.color : 'var(--bd)'}`,
                    borderRadius: 10, cursor: 'pointer', background: selectedTopic?.id === topic.id ? `${topic.color}0e` : '#FDFAF4',
                    transition: 'all .15s',
                  }}>
                  <div style={{ fontFamily: 'var(--fB)', fontSize: '.7rem', fontWeight: 700, color: selectedTopic?.id === topic.id ? topic.color : 'var(--txt)', marginBottom: 4 }}>
                    {topic.title}
                  </div>
                  <div style={{ fontFamily: 'var(--fM)', fontSize: '.50rem', color: 'var(--muted)', lineHeight: 1.4 }}>
                    {topic.prompt.slice(0, 60)}…
                  </div>
                </div>
              ))}
            </div>

            {selectedTopic && (
              <div style={{ marginBottom: 20 }}>
                {/* Context */}
                <div style={{ background: `${selectedTopic.color}0a`, border: `1px solid ${selectedTopic.color}44`, borderLeft: `4px solid ${selectedTopic.color}`, borderRadius: 10, padding: '14px 18px', marginBottom: 14 }}>
                  <div style={{ fontFamily: 'var(--fM)', fontSize: '.52rem', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '.1em', marginBottom: 6 }}>
                    💬 Contexte du défi
                  </div>
                  <p style={{ fontFamily: 'var(--fC)', fontSize: '.88rem', color: 'var(--dim)', lineHeight: 1.75, fontStyle: 'italic', margin: '0 0 8px' }}>
                    « {selectedTopic.prompt} »
                  </p>
                  <div style={{ fontFamily: 'var(--fM)', fontSize: '.56rem', color: selectedTopic.color }}>
                    💡 {selectedTopic.hint}
                  </div>
                </div>

                {/* Text area */}
                <div style={{ fontFamily: 'var(--fB)', fontSize: '.68rem', fontWeight: 600, color: 'var(--dim)', marginBottom: 8 }}>
                  2. Rédigez votre argument ({challengeText.length}/50 min.)
                </div>
                <textarea
                  value={challengeText}
                  onChange={e => setChallengeText(e.target.value)}
                  placeholder="Construisez votre argument rigoureux ici. Identifiez les sophismes présents et répondez avec une logique irréfutable…"
                  style={{
                    width: '100%', minHeight: 160, padding: '14px 16px',
                    border: '1.5px solid var(--bd)', borderRadius: 10,
                    fontFamily: 'var(--fC)', fontSize: '.88rem', lineHeight: 1.7,
                    background: '#FDFAF4', color: 'var(--txt)', resize: 'vertical',
                    boxSizing: 'border-box',
                  }}
                />

                {/* Score preview */}
                {challengeText.length >= 50 && (
                  <div style={{ fontFamily: 'var(--fM)', fontSize: '.56rem', color: 'var(--G)', marginTop: 6 }}>
                    📊 Score estimé : {calculateScore(challengeText)}/100
                  </div>
                )}

                <button
                  className="btn b-a b-lg"
                  onClick={handleCreateChallenge}
                  disabled={submitting || challengeText.length < 50}
                  style={{ width: '100%', justifyContent: 'center', marginTop: 14 }}>
                  {submitting ? '⏳ Envoi en cours…' : '⚔️ Lancer ce défi dans l\'Agora → +25 XP'}
                </button>
              </div>
            )}

            {!user && (
              <div style={{ background: 'rgba(140,58,48,.07)', border: '1px solid rgba(140,58,48,.2)', borderRadius: 9, padding: '12px 16px', textAlign: 'center' }}>
                <div style={{ fontFamily: 'var(--fM)', fontSize: '.62rem', color: 'var(--B)' }}>
                  🔒 Connectez-vous pour créer et répondre aux défis
                </div>
              </div>
            )}
          </div>
        )}

        {/* ══ TAB: DÉFIS EN ATTENTE ══ */}
        {tab === 'pending' && (
          <div>
            {loadingPending ? (
              <div style={{ textAlign: 'center', padding: '40px 0', fontFamily: 'var(--fM)', fontSize: '.65rem', color: 'var(--muted)' }}>
                ⏳ Chargement des défis…
              </div>
            ) : (
              <>
                {answering && (
                  <div style={{ position: 'fixed', inset: 0, zIndex: 300, background: 'rgba(0,0,0,.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 16px' }}>
                    <div style={{ background: 'var(--bg)', borderRadius: 14, padding: '22px 20px', maxWidth: 540, width: '100%', border: '1px solid var(--bd)', boxShadow: '0 12px 40px rgba(0,0,0,.25)', maxHeight: '90vh', overflowY: 'auto' }}>
                      <div style={{ fontFamily: 'var(--fH)', fontSize: '1rem', letterSpacing: '.08em', marginBottom: 12 }}>
                        ⚔️ Répondre au défi
                      </div>
                      <div style={{ background: 'rgba(44,74,110,.05)', border: '1px solid rgba(44,74,110,.15)', borderRadius: 8, padding: '12px 14px', marginBottom: 14 }}>
                        <div style={{ fontFamily: 'var(--fM)', fontSize: '.50rem', color: 'var(--muted)', marginBottom: 4 }}>
                          {answering.challenger_name || 'Anonyme'} · {answering.topic_title}
                        </div>
                        <div style={{ fontFamily: 'var(--fC)', fontSize: '.82rem', color: 'var(--dim)', fontStyle: 'italic', lineHeight: 1.6 }}>
                          « {answering.challenge_text} »
                        </div>
                      </div>
                      <textarea
                        value={answerText}
                        onChange={e => setAnswerText(e.target.value)}
                        placeholder="Votre réponse argumentée…"
                        style={{ width: '100%', minHeight: 140, padding: '12px 14px', border: '1.5px solid var(--bd)', borderRadius: 8, fontFamily: 'var(--fC)', fontSize: '.86rem', lineHeight: 1.7, background: '#FDFAF4', color: 'var(--txt)', resize: 'vertical', boxSizing: 'border-box' }}
                      />
                      <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
                        <button className="btn b-a b-lg" onClick={handleAnswerChallenge} disabled={submitting || answerText.length < 50} style={{ flex: 1, justifyContent: 'center' }}>
                          {submitting ? '⏳…' : '✅ Soumettre +20 XP'}
                        </button>
                        <button className="btn b-ghost" onClick={() => { setAnswering(null); setAnswerText(''); }} style={{ flexShrink: 0 }}>
                          Annuler
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {pendingChallenges.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '40px 0' }}>
                    <div style={{ fontSize: '2.5rem', marginBottom: 12 }}>🏟</div>
                    <div style={{ fontFamily: 'var(--fM)', fontSize: '.65rem', color: 'var(--muted)', marginBottom: 16 }}>
                      Aucun défi en attente pour l'instant.<br/>Soyez le premier à en lancer un !
                    </div>
                    <button className="btn b-a b-lg" onClick={() => setTab('create')} style={{ justifyContent: 'center' }}>
                      ⚔️ Créer le premier défi →
                    </button>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    {pendingChallenges.map(c => (
                      <div key={c.id} style={{ background: '#FDFAF4', border: '1px solid var(--bd)', borderLeft: '4px solid var(--B)', borderRadius: 10, padding: '14px 18px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                          <div>
                            <div style={{ fontFamily: 'var(--fB)', fontSize: '.72rem', fontWeight: 700, color: 'var(--txt)', marginBottom: 3 }}>
                              {c.topic_title || c.topic}
                            </div>
                            <div style={{ fontFamily: 'var(--fM)', fontSize: '.50rem', color: 'var(--muted)' }}>
                              Par {c.challenger_name || 'Anonyme'} · {timeAgo(c.created_at)}
                            </div>
                          </div>
                          <div style={{ fontFamily: 'var(--fM)', fontSize: '.50rem', color: 'var(--A)', background: 'rgba(44,74,110,.1)', borderRadius: 20, padding: '2px 8px', flexShrink: 0, marginLeft: 8 }}>
                            Score : {c.score || 0}/100
                          </div>
                        </div>
                        <div style={{ fontFamily: 'var(--fC)', fontSize: '.8rem', color: 'var(--dim)', fontStyle: 'italic', lineHeight: 1.6, marginBottom: 12 }}>
                          « {c.challenge_text?.slice(0, 140)}{(c.challenge_text?.length || 0) > 140 ? '…' : ''} »
                        </div>
                        <button className="btn b-a b-sm" onClick={() => { setAnswering(c); setAnswerText(''); }} style={{ justifyContent: 'center' }}>
                          ⚔️ Relever ce défi → +20 XP
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* ══ TAB: MES RÉSULTATS ══ */}
        {tab === 'results' && (
          <div>
            {!user ? (
              <div style={{ textAlign: 'center', padding: '40px 0', fontFamily: 'var(--fM)', fontSize: '.65rem', color: 'var(--muted)' }}>
                🔒 Connectez-vous pour voir vos résultats
              </div>
            ) : loadingResults ? (
              <div style={{ textAlign: 'center', padding: '40px 0', fontFamily: 'var(--fM)', fontSize: '.65rem', color: 'var(--muted)' }}>
                ⏳ Chargement…
              </div>
            ) : myResults.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px 0' }}>
                <div style={{ fontSize: '2.5rem', marginBottom: 12 }}>📊</div>
                <div style={{ fontFamily: 'var(--fM)', fontSize: '.65rem', color: 'var(--muted)', marginBottom: 16 }}>
                  Vous n'avez encore ni créé ni répondu à de défi.
                </div>
                <button className="btn b-a b-lg" onClick={() => setTab('create')} style={{ justifyContent: 'center' }}>
                  ⚔️ Lancer mon premier défi →
                </button>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {myResults.map(c => {
                  const isChallenger = c.challenger_id === user?.id;
                  const hasAnswer = !!c.answer_text;
                  return (
                    <div key={c.id} style={{ background: 'var(--s1)', border: '1px solid var(--bd)', borderRadius: 10, padding: '14px 18px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8, flexWrap: 'wrap', gap: 6 }}>
                        <div>
                          <div style={{ fontFamily: 'var(--fB)', fontSize: '.7rem', fontWeight: 700, color: 'var(--txt)' }}>
                            {c.topic_title || c.topic}
                          </div>
                          <div style={{ fontFamily: 'var(--fM)', fontSize: '.50rem', color: 'var(--muted)' }}>
                            {isChallenger ? '⚔️ Votre défi' : `⚔️ Réponse à ${c.challenger_name || 'Anonyme'}`} · {timeAgo(c.created_at)}
                          </div>
                        </div>
                        <div style={{ display: 'flex', gap: 6 }}>
                          <div style={{ fontFamily: 'var(--fM)', fontSize: '.50rem', color: 'var(--A)', background: 'rgba(44,74,110,.1)', borderRadius: 20, padding: '2px 8px' }}>
                            Défi : {c.score || 0}/100
                          </div>
                          {hasAnswer && (
                            <div style={{ fontFamily: 'var(--fM)', fontSize: '.50rem', color: 'var(--G)', background: 'rgba(58,110,82,.1)', borderRadius: 20, padding: '2px 8px' }}>
                              Réponse : {c.answer_score || 0}/100
                            </div>
                          )}
                        </div>
                      </div>
                      <div style={{ fontFamily: 'var(--fC)', fontSize: '.78rem', color: 'var(--dim)', fontStyle: 'italic', lineHeight: 1.55, marginBottom: hasAnswer ? 8 : 0 }}>
                        « {c.challenge_text?.slice(0, 100)}{(c.challenge_text?.length || 0) > 100 ? '…' : ''} »
                      </div>
                      {hasAnswer && (
                        <div style={{ background: 'rgba(58,110,82,.06)', border: '1px solid rgba(58,110,82,.2)', borderRadius: 7, padding: '8px 12px' }}>
                          <div style={{ fontFamily: 'var(--fM)', fontSize: '.50rem', color: 'var(--G)', marginBottom: 3 }}>
                            ✅ Répondu par {c.answered_name || 'Anonyme'}
                          </div>
                          <div style={{ fontFamily: 'var(--fC)', fontSize: '.76rem', color: 'var(--dim)', fontStyle: 'italic', lineHeight: 1.5 }}>
                            « {c.answer_text?.slice(0, 80)}{(c.answer_text?.length || 0) > 80 ? '…' : ''} »
                          </div>
                        </div>
                      )}
                      {!hasAnswer && isChallenger && (
                        <div style={{ fontFamily: 'var(--fM)', fontSize: '.52rem', color: 'var(--muted)', marginTop: 4 }}>
                          ⏳ En attente d'une réponse de la communauté…
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

      </div>
    </div>
  );
}
