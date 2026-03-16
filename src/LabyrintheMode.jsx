// ═══════════════════════════════════════════════════════════════════════════════
// DIALECTIX AI — LabyrintheMode.jsx  (Le Labyrinthe du Maître)
// ═══════════════════════════════════════════════════════════════════════════════
// • 5 chapitres narratifs : convaincre Socrate, Aristote, Kant, Descartes, Voltaire
// • Choisir l'argument valide parmi 4 options (dont 3 sophismes)
// • Solidité : 100 pts, -20 par erreur
// • +30 XP par chapitre · Bonus +20 ELO si run parfait
// ═══════════════════════════════════════════════════════════════════════════════

import { useState } from 'react';

// ─── Chapitres ────────────────────────────────────────────────────────────────
const CHAPTERS = [
  {
    id: 'socrate',
    character: 'Socrate',
    title: 'Le Banquet des Questions',
    emoji: '🏛',
    era: 'Athènes, 399 av. J.-C.',
    portrait: '🧔',
    color: '#A05A2C',
    bg: 'rgba(160,90,44,.07)',
    scenario: `Socrate vous reçoit dans le portique de l'Agora. Il vous pose une question simple mais redoutable : « Est-il juste de désobéir à une loi injuste ? »

Vous devez le convaincre que la désobéissance civile peut être moralement légitime — sans utiliser un argument fallacieux.`,
    question: "Comment répondez-vous à Socrate ?",
    options: [
      {
        id: 'a',
        text: "Aristophane, le grand poète, a dit que désobéir peut être noble — qui suis-je pour contredire un génie de la scène ?",
        isValid: false,
        fallacy: "Appel à l'Autorité",
        explanation: "Citer l'autorité d'un poète comique ne prouve rien sur la nature éthique de la désobéissance.",
      },
      {
        id: 'b',
        text: "Tout le monde dans la ville murmure que les lois de Créon sont injustes — la voix du peuple ne peut pas se tromper.",
        isValid: false,
        fallacy: "Appel à la Masse",
        explanation: "L'opinion populaire ne constitue pas une preuve morale. La majorité s'est trompée bien des fois dans l'histoire.",
      },
      {
        id: 'c',
        text: "Si une loi viole un principe moral supérieur et universel — le respect de la vie humaine ou la dignité fondamentale — alors notre conscience nous oblige à refuser de l'appliquer, même au prix de sanctions.",
        isValid: true,
        fallacy: null,
        explanation: "Cet argument distingue la légalité de la moralité et fonde la désobéissance sur un principe universel vérifiable — c'est un raisonnement valide.",
      },
      {
        id: 'd',
        text: "Si on accepte qu'une loi puisse être injuste, alors bientôt toutes les lois seront remises en cause, l'ordre social s'effondrera et la cité sombrera dans le chaos.",
        isValid: false,
        fallacy: "Pente Glissante",
        explanation: "Remettre en cause une loi injuste n'implique pas nécessairement l'effondrement de tout l'ordre légal.",
      },
    ],
    correctId: 'c',
    successText: `Socrate incline légèrement la tête. « Bien. Tu distingues ce qui est légal de ce qui est juste. C'est la première vertu du philosophe. »

Il vous accorde le droit de continuer votre chemin dans le Labyrinthe.`,
    failText: `Socrate plisse les yeux. « Tu utilises une forme d'argument que je reconnais — elle impressionne sans convaincre. Réfléchis encore. »`,
  },
  {
    id: 'aristote',
    character: 'Aristote',
    title: 'L\'École du Lycée',
    emoji: '📜',
    era: 'Athènes, 335 av. J.-C.',
    portrait: '👴',
    color: '#2C4A6E',
    bg: 'rgba(44,74,110,.07)',
    scenario: `Aristote vous reçoit dans son Lycée, entouré de rouleaux de papyrus. Il vous demande : « La vertu peut-elle s'enseigner, ou naît-on vertueux ? »

Il attend de vous un argument structuré, fondé sur l'observation de la réalité.`,
    question: "Comment répondez-vous à Aristote ?",
    options: [
      {
        id: 'a',
        text: "Mon maître Platon a affirmé que la vertu est innée — et comment un élève pourrait-il contredire son maître ?",
        isValid: false,
        fallacy: "Appel à l'Autorité",
        explanation: "L'autorité de Platon ne valide pas l'argument. Aristote lui-même divergeait souvent de Platon.",
      },
      {
        id: 'b',
        text: "La vertu s'enseigne, car j'ai observé des artisans, des guerriers, des orateurs qui, par la répétition et l'entraînement, ont développé l'excellence dans leur art. De même, les habitudes morales se forgent par la pratique répétée d'actes justes.",
        isValid: true,
        fallacy: null,
        explanation: "Cet argument s'appuie sur l'observation empirique et une analogie solide avec d'autres formes d'apprentissage — cohérent avec la méthode aristotélicienne.",
      },
      {
        id: 'c',
        text: "Tous les philosophes que j'ai croisés sur l'Agora pensent que la vertu peut s'acquérir — la sagesse collective doit avoir raison.",
        isValid: false,
        fallacy: "Appel à la Masse",
        explanation: "Le consensus informel de quelques philosophes ne constitue pas une démonstration rigoureuse.",
      },
      {
        id: 'd',
        text: "Si la vertu ne peut s'enseigner, alors les parents ne peuvent rien pour leurs enfants, les cités n'ont aucun rôle éducatif, et finalement la philosophie elle-même est inutile.",
        isValid: false,
        fallacy: "Pente Glissante",
        explanation: "La conclusion que 'la vertu est innée' n'implique pas toutes ces conséquences radicales.",
      },
    ],
    correctId: 'b',
    successText: `Aristote griffonne quelques notes. « Voilà. Tu observes avant de conclure. La vertu est une disposition acquise — une hexis. Tu as compris le fond de ma pensée. »

Il vous remet un parchemin et vous ouvre la porte suivante.`,
    failText: `Aristote ferme ses yeux. « L'argument s'effondre à la première question. Recommence avec plus de rigueur. »`,
  },
  {
    id: 'descartes',
    character: 'Descartes',
    title: 'La Chambre de Poêle',
    emoji: '🕯',
    era: 'Bavière, 1619',
    portrait: '🧑‍💼',
    color: '#5A3A6E',
    bg: 'rgba(90,58,110,.07)',
    scenario: `Descartes est seul dans sa chambre chauffée, absorbé dans ses pensées. Il vous interpelle : « Quelle est la première certitude sur laquelle on peut bâtir tout le savoir ? »

Il doute de tout — il cherche quelque chose d'indubitable.`,
    question: "Que répondez-vous à Descartes ?",
    options: [
      {
        id: 'a',
        text: "La première certitude est que Dieu existe, car la majorité des hommes de mon époque le croient fermement.",
        isValid: false,
        fallacy: "Appel à la Masse",
        explanation: "La croyance majoritaire ne constitue pas une certitude philosophique au sens cartésien.",
      },
      {
        id: 'b',
        text: "Mon précepteur m'a enseigné que le monde sensible est réel — un homme de son érudition ne peut se tromper.",
        isValid: false,
        fallacy: "Appel à l'Autorité",
        explanation: "Descartes remet précisément en cause tout savoir transmis, y compris celui des autorités.",
      },
      {
        id: 'c',
        text: "Si vous doutez de tout, alors demain vous douterez de votre propre méthode, puis de vos sens, puis de votre raison — vous ne pourrez plus jamais rien affirmer.",
        isValid: false,
        fallacy: "Pente Glissante",
        explanation: "Le doute méthodique de Descartes est précisément un outil pour trouver une certitude, non pour sombrer dans l'irrésolution infinie.",
      },
      {
        id: 'd',
        text: "L'acte même de douter implique qu'il existe un être qui doute — je pense, donc je suis. Cette existence de la pensée est la seule chose que le doute ne peut détruire.",
        isValid: true,
        fallacy: null,
        explanation: "C'est le célèbre cogito ergo sum — un raisonnement valide qui fait de l'acte de penser la première certitude indubitable.",
      },
    ],
    correctId: 'd',
    successText: `Descartes se redresse lentement. « Oui. Cogito ergo sum. Voilà le fondement. Tu as suivi le chemin que moi-même j'ai parcouru cette nuit. »

Il vous tend sa plume et vous ouvre la porte.`,
    failText: `Descartes secoue la tête. « Non. Cela repose sur quelque chose qui peut encore être remis en cause. Cherche plus profond. »`,
  },
  {
    id: 'kant',
    character: 'Kant',
    title: 'Le Cabinet de Königsberg',
    emoji: '⚖️',
    era: 'Königsberg, 1785',
    portrait: '👨‍⚖️',
    color: '#3A6E52',
    bg: 'rgba(58,110,82,.07)',
    scenario: `Kant vous reçoit dans son cabinet ordonné avec une précision d'horloge. Il vous pose son dilemme le plus redoutable : « Doit-on toujours dire la vérité, même si cela cause du tort à autrui ? »

Il cherche un principe universel, pas un cas particulier.`,
    question: "Comment répondez-vous à Kant ?",
    options: [
      {
        id: 'a',
        text: "Mon oncle, homme de grande sagesse et d'expérience, m'a toujours dit que la vérité finit toujours par triompher — sa vie entière prouve cette maxime.",
        isValid: false,
        fallacy: "Appel à l'Autorité",
        explanation: "L'expérience personnelle d'un individu, si sage soit-il, ne suffit pas à fonder un impératif moral universel.",
      },
      {
        id: 'b',
        text: "Si on commence à mentir dans certains cas, bientôt tout le monde mentira en toutes occasions, la confiance sociale disparaîtra et la communication humaine s'effondrera.",
        isValid: false,
        fallacy: "Pente Glissante",
        explanation: "Autoriser des exceptions ne conduit pas mécaniquement à une dégradation totale de la communication.",
      },
      {
        id: 'c',
        text: "Nous devons toujours dire la vérité car, si nous universalisons la maxime « il est permis de mentir », nous détruisons le concept même de vérité, rendant toute communication impossible par contradiction performative.",
        isValid: true,
        fallacy: null,
        explanation: "C'est l'impératif catégorique de Kant — universaliser la maxime du mensonge la détruit elle-même : argument valide et cohérent avec son système.",
      },
      {
        id: 'd',
        text: "La plupart des gens dans la rue vous diront qu'il vaut mieux dire la vérité — la morale populaire doit refléter la loi morale universelle.",
        isValid: false,
        fallacy: "Appel à la Masse",
        explanation: "La morale populaire et l'impératif catégorique sont deux choses distinctes chez Kant.",
      },
    ],
    correctId: 'c',
    successText: `Kant s'arrête et vous regarde fixement pendant quelques secondes. « Vous avez compris l'essentiel. Universaliser — c'est le test ultime de toute maxime. »

Il vous inscrit dans son registre et vous guide vers la dernière porte.`,
    failText: `Kant reprend sa plume sans vous regarder. « Cet argument ne tient pas devant l'universalisation. Réexaminez votre maxime. »`,
  },
  {
    id: 'voltaire',
    character: 'Voltaire',
    title: 'Le Château de Ferney',
    emoji: '✍️',
    era: 'Ferney, 1778',
    portrait: '🎭',
    color: '#C6A15B',
    bg: 'rgba(198,161,91,.07)',
    scenario: `Voltaire vous reçoit avec son sourire ironique habituel. La France brûle de révoltes. Il vous demande : « Faut-il se battre contre l'injustice, même sans espoir de victoire immédiate ? »

Il cherche un argument à la hauteur de son engagement pour les victimes de l'intolérance.`,
    question: "Comment répondez-vous à Voltaire ?",
    options: [
      {
        id: 'a',
        text: "Vous vous battez depuis des décennies, cher Voltaire — votre seule existence prouve que le combat vaut la peine. Qui pourrait vous contredire ?",
        isValid: false,
        fallacy: "Appel à l'Autorité",
        explanation: "L'admiration pour Voltaire ne constitue pas un argument logique en faveur de l'engagement.",
      },
      {
        id: 'b',
        text: "La majorité des philosophes des Lumières pensent que la raison finira par triompher. Puisque nous sommes tous d'accord, c'est la bonne voie.",
        isValid: false,
        fallacy: "Appel à la Masse",
        explanation: "Le consensus entre philosophes, si éclairés soient-ils, n'est pas en lui-même une démonstration.",
      },
      {
        id: 'c',
        text: "Soit on se bat sans relâche pour la justice, soit on collabore activement avec l'oppression. Il n'y a pas de position neutre possible.",
        isValid: false,
        fallacy: "Faux Dilemme",
        explanation: "Il existe de nombreuses positions entre l'engagement total et la collaboration active avec l'injustice.",
      },
      {
        id: 'd',
        text: "Même sans victoire immédiate, chaque combat documenté, chaque injustice nommée devient un exemple pour les générations futures. L'histoire de la justice avance lentement mais elle avance — Calas, Sirven, nous combattons pour que leur nom reste.",
        isValid: true,
        fallacy: null,
        explanation: "Argument valide fondé sur l'impact historique du témoignage et de la résistance — cohérent avec l'action concrète de Voltaire dans les affaires Calas et Sirven.",
      },
    ],
    correctId: 'd',
    successText: `Voltaire éclate d'un rire sincère — chose rare. « Voilà ! Vous ne m'avez pas flatté, vous m'avez convaincu. Il faut cultiver notre jardin et écrire l'histoire au passage. »

Les portes du Labyrinthe s'ouvrent devant vous. Vous en êtes sorti victorieux.`,
    failText: `Voltaire lève un sourcil. « Charmant, mais insuffisant. Relisez l'affaire Calas et revenez avec un argument plus solide. »`,
  },
];

// ─── SoliditéBar ──────────────────────────────────────────────────────────────
function SoliditeBar({ value }) {
  const color = value >= 70 ? 'var(--G)' : value >= 40 ? 'var(--Y)' : 'var(--B)';
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <div style={{ fontFamily: 'var(--fM)', fontSize: '.54rem', color: 'var(--muted)', whiteSpace: 'nowrap' }}>
        🏛 Solidité
      </div>
      <div style={{ flex: 1, height: 10, background: 'var(--bd)', borderRadius: 5, overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${value}%`, background: color, borderRadius: 5, transition: 'width .5s ease, background .4s' }} />
      </div>
      <div style={{ fontFamily: 'var(--fH)', fontSize: '.88rem', color, minWidth: 40, textAlign: 'right' }}>
        {value}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════
export default function LabyrintheMode({ user, saveUser, showToast }) {
  const [phase, setPhase] = useState('intro');    // intro | playing | consequence | summary
  const [chapterIdx, setChapterIdx] = useState(0);
  const [solidite, setSolidite] = useState(100);
  const [selected, setSelected] = useState(null);
  const [history, setHistory] = useState([]);     // { chapterIdx, correct, selectedId }
  const [lastResult, setLastResult] = useState(null); // 'correct' | 'wrong'

  const chapter = CHAPTERS[chapterIdx];

  const handleChoice = (optionId) => {
    if (selected) return;
    const opt = chapter.options.find(o => o.id === optionId);
    if (!opt) return;
    setSelected(optionId);
    const correct = optionId === chapter.correctId;
    setLastResult(correct ? 'correct' : 'wrong');

    const newSolidite = correct ? solidite : Math.max(0, solidite - 20);
    setSolidite(newSolidite);
    const xp = correct ? 30 : 0;
    if (user && xp > 0) saveUser({ ...user, xp: (user?.xp || 0) + xp });
    if (correct) showToast(`✅ ${chapter.character} est convaincu ! +30 XP`, 'achievement');
    else showToast(`❌ ${chapter.character} reste sceptique. −20 Solidité`, 'error');

    setHistory(prev => [...prev, { chapterIdx, correct, selectedId: optionId }]);
    setPhase('consequence');
  };

  const handleNextChapter = () => {
    if (chapterIdx + 1 >= CHAPTERS.length) {
      setPhase('summary');
    } else {
      setChapterIdx(i => i + 1);
      setSelected(null);
      setLastResult(null);
      setPhase('playing');
    }
  };

  const handleRestart = () => {
    setChapterIdx(0);
    setSolidite(100);
    setSelected(null);
    setLastResult(null);
    setHistory([]);
    setPhase('playing');
  };

  // ─── RENDER : INTRO ────────────────────────────────────────────────────────
  if (phase === 'intro') {
    return (
      <div className="page">
        <div style={{ maxWidth: 580, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 28 }}>
            <div style={{ fontSize: '3rem', marginBottom: 10 }}>🗺</div>
            <div style={{ fontFamily: 'var(--fH)', fontSize: '1.4rem', letterSpacing: '.12em' }}>LE LABYRINTHE DU MAÎTRE</div>
            <div style={{ fontFamily: 'var(--fC)', fontSize: '.9rem', color: 'var(--dim)', fontStyle: 'italic', marginTop: 6, lineHeight: 1.7 }}>
              Traversez cinq siècles de philosophie.<br />Seuls les arguments valides ouvrent les portes.
            </div>
          </div>

          {/* Chapters preview */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 24 }}>
            {CHAPTERS.map((c, i) => (
              <div key={c.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', background: c.bg, border: `1px solid ${c.color}44`, borderRadius: 10 }}>
                <div style={{ fontSize: '1.6rem', flexShrink: 0 }}>{c.portrait}</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontFamily: 'var(--fB)', fontSize: '.75rem', fontWeight: 700, color: c.color }}>Chapitre {i + 1} — {c.character}</div>
                  <div style={{ fontFamily: 'var(--fM)', fontSize: '.56rem', color: 'var(--muted)' }}>{c.era} · {c.title}</div>
                </div>
                <div style={{ fontSize: '1.2rem' }}>{c.emoji}</div>
              </div>
            ))}
          </div>

          {/* Rules */}
          <div style={{ background: 'rgba(198,161,91,.06)', border: '1px solid rgba(198,161,91,.25)', borderRadius: 10, padding: '14px 18px', marginBottom: 22 }}>
            <div style={{ fontFamily: 'var(--fM)', fontSize: '.54rem', color: 'var(--Y)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.1em', marginBottom: 8 }}>
              ⚖️ Règles du Labyrinthe
            </div>
            {[
              ['🏛', 'Solidité : 100 pts. −20 par mauvais argument.'],
              ['✅', '+30 XP par philosophe convaincu.'],
              ['⚡', 'Bonus +20 ELO si 5/5 sans erreur.'],
              ['📚', 'Un seul argument est valide — les 3 autres sont des sophismes.'],
            ].map(([ico, txt]) => (
              <div key={txt} style={{ display: 'flex', gap: 8, marginBottom: 5 }}>
                <span style={{ fontSize: '.8rem' }}>{ico}</span>
                <span style={{ fontFamily: 'var(--fM)', fontSize: '.6rem', color: 'var(--dim)' }}>{txt}</span>
              </div>
            ))}
          </div>

          <button className="btn b-y b-lg" onClick={() => setPhase('playing')} style={{ width: '100%', justifyContent: 'center', padding: '14px' }}>
            🗺 Entrer dans le Labyrinthe →
          </button>
        </div>
      </div>
    );
  }

  // ─── RENDER : PLAYING ──────────────────────────────────────────────────────
  if (phase === 'playing') {
    return (
      <div className="page">
        <div style={{ maxWidth: 620, margin: '0 auto' }}>
          {/* Progress */}
          <div style={{ display: 'flex', justifyContent: 'space-between', fontFamily: 'var(--fM)', fontSize: '.52rem', color: 'var(--muted)', marginBottom: 8 }}>
            <span>Chapitre {chapterIdx + 1} / {CHAPTERS.length}</span>
            <span>{history.filter(h => h.correct).length} philosophe{history.filter(h => h.correct).length > 1 ? 's' : ''} convaincu{history.filter(h => h.correct).length > 1 ? 's' : ''}</span>
          </div>
          <SoliditeBar value={solidite} />

          {/* Chapter header */}
          <div style={{ background: chapter.bg, border: `1px solid ${chapter.color}44`, borderLeft: `4px solid ${chapter.color}`, borderRadius: 12, padding: '20px 22px', margin: '16px 0 14px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
              <div style={{ fontSize: '2.2rem' }}>{chapter.portrait}</div>
              <div>
                <div style={{ fontFamily: 'var(--fH)', fontSize: '1rem', letterSpacing: '.06em', color: chapter.color }}>
                  {chapter.character}
                </div>
                <div style={{ fontFamily: 'var(--fM)', fontSize: '.52rem', color: 'var(--muted)' }}>
                  {chapter.era} · {chapter.title}
                </div>
              </div>
              <div style={{ fontSize: '1.8rem', marginLeft: 'auto' }}>{chapter.emoji}</div>
            </div>
            <p style={{ fontFamily: 'var(--fC)', fontSize: '.88rem', color: 'var(--dim)', lineHeight: 1.8, fontStyle: 'italic', margin: 0, whiteSpace: 'pre-line' }}>
              {chapter.scenario}
            </p>
          </div>

          <div style={{ fontFamily: 'var(--fB)', fontSize: '.72rem', fontWeight: 600, color: 'var(--dim)', marginBottom: 10 }}>
            💬 {chapter.question}
          </div>

          {/* Options */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {chapter.options.map((opt) => (
              <button key={opt.id}
                onClick={() => handleChoice(opt.id)}
                disabled={!!selected}
                style={{
                  padding: '14px 18px', border: `2px solid var(--bd)`, borderRadius: 10,
                  textAlign: 'left', background: '#FDFAF4', cursor: selected ? 'default' : 'pointer',
                  transition: 'all .15s',
                }}
                onMouseEnter={e => { if (!selected) { e.currentTarget.style.borderColor = chapter.color; e.currentTarget.style.background = chapter.bg; } }}
                onMouseLeave={e => { if (!selected) { e.currentTarget.style.borderColor = 'var(--bd)'; e.currentTarget.style.background = '#FDFAF4'; } }}>
                <div style={{ fontFamily: 'var(--fM)', fontSize: '.54rem', color: 'var(--muted)', marginBottom: 5, textTransform: 'uppercase', letterSpacing: '.06em' }}>
                  Option {opt.id.toUpperCase()}
                </div>
                <div style={{ fontFamily: 'var(--fC)', fontSize: '.88rem', color: 'var(--txt)', lineHeight: 1.65, fontStyle: 'italic' }}>
                  « {opt.text} »
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // ─── RENDER : CONSEQUENCE ──────────────────────────────────────────────────
  if (phase === 'consequence') {
    const correct = lastResult === 'correct';
    const selectedOpt = chapter.options.find(o => o.id === selected);
    const correctOpt = chapter.options.find(o => o.id === chapter.correctId);

    return (
      <div className="page">
        <div style={{ maxWidth: 560, margin: '0 auto' }}>
          {/* Result banner */}
          <div style={{ background: correct ? 'rgba(58,110,82,.08)' : 'rgba(140,58,48,.07)', border: `1px solid ${correct ? 'rgba(58,110,82,.3)' : 'rgba(140,58,48,.25)'}`, borderRadius: 14, padding: '24px 22px', textAlign: 'center', marginBottom: 22 }}>
            <div style={{ fontSize: '2.5rem', marginBottom: 8 }}>{correct ? chapter.portrait : '🤔'}</div>
            <div style={{ fontFamily: 'var(--fH)', fontSize: '1.1rem', letterSpacing: '.08em', color: correct ? 'var(--G)' : 'var(--B)', marginBottom: 12 }}>
              {correct ? `${chapter.character} est convaincu` : `${chapter.character} reste sceptique`}
            </div>
            <p style={{ fontFamily: 'var(--fC)', fontSize: '.88rem', color: 'var(--dim)', lineHeight: 1.75, fontStyle: 'italic', margin: 0, whiteSpace: 'pre-line' }}>
              {correct ? chapter.successText : chapter.failText}
            </p>
          </div>

          {/* Analysis */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 22 }}>
            {/* What you chose */}
            <div style={{ background: correct ? 'rgba(58,110,82,.06)' : 'rgba(140,58,48,.05)', border: `1px solid ${correct ? 'rgba(58,110,82,.25)' : 'rgba(140,58,48,.2)'}`, borderRadius: 9, padding: '12px 16px' }}>
              <div style={{ fontFamily: 'var(--fM)', fontSize: '.52rem', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '.1em', marginBottom: 5 }}>
                {correct ? '✅ Votre argument (valide)' : `❌ Votre argument — sophisme : ${selectedOpt?.fallacy}`}
              </div>
              <div style={{ fontFamily: 'var(--fC)', fontSize: '.84rem', color: 'var(--txt)', fontStyle: 'italic', lineHeight: 1.6 }}>
                « {selectedOpt?.text} »
              </div>
              <div style={{ fontFamily: 'var(--fM)', fontSize: '.58rem', color: 'var(--dim)', marginTop: 6, lineHeight: 1.5 }}>
                {selectedOpt?.explanation}
              </div>
            </div>

            {/* Correct answer (if wrong) */}
            {!correct && (
              <div style={{ background: 'rgba(58,110,82,.06)', border: '1px solid rgba(58,110,82,.25)', borderRadius: 9, padding: '12px 16px' }}>
                <div style={{ fontFamily: 'var(--fM)', fontSize: '.52rem', color: 'var(--G)', textTransform: 'uppercase', letterSpacing: '.1em', marginBottom: 5 }}>
                  ✓ L'argument valide était
                </div>
                <div style={{ fontFamily: 'var(--fC)', fontSize: '.84rem', color: 'var(--txt)', fontStyle: 'italic', lineHeight: 1.6 }}>
                  « {correctOpt?.text} »
                </div>
                <div style={{ fontFamily: 'var(--fM)', fontSize: '.58rem', color: 'var(--dim)', marginTop: 6, lineHeight: 1.5 }}>
                  {correctOpt?.explanation}
                </div>
              </div>
            )}
          </div>

          <SoliditeBar value={solidite} />
          <div style={{ height: 16 }} />

          {chapterIdx + 1 < CHAPTERS.length ? (
            <button className="btn b-y b-lg" onClick={handleNextChapter} style={{ width: '100%', justifyContent: 'center' }}>
              Chapitre suivant : {CHAPTERS[chapterIdx + 1]?.character} →
            </button>
          ) : (
            <button className="btn b-y b-lg" onClick={() => setPhase('summary')} style={{ width: '100%', justifyContent: 'center' }}>
              🏆 Voir le récapitulatif final →
            </button>
          )}
        </div>
      </div>
    );
  }

  // ─── RENDER : SUMMARY ──────────────────────────────────────────────────────
  if (phase === 'summary') {
    const correctCount = history.filter(h => h.correct).length;
    const isPerfect = correctCount === CHAPTERS.length;
    const xpTotal = correctCount * 30;
    const emoji = isPerfect ? '🏆' : correctCount >= 3 ? '🎓' : '📘';

    // ELO bonus for perfect run
    if (isPerfect && user) {
      saveUser({ ...user, xp: (user?.xp || 0), elo: (user?.elo || 1000) + 20 });
      showToast('🏆 Parcours parfait ! +20 ELO', 'achievement');
    }

    return (
      <div className="page">
        <div style={{ maxWidth: 560, margin: '0 auto' }}>
          {/* Banner */}
          <div style={{ background: isPerfect ? 'linear-gradient(135deg,rgba(198,161,91,.12),rgba(58,110,82,.08))' : 'rgba(44,74,110,.06)', border: `1px solid ${isPerfect ? 'rgba(198,161,91,.4)' : 'rgba(44,74,110,.2)'}`, borderRadius: 14, padding: '28px 24px', textAlign: 'center', marginBottom: 22 }}>
            <div style={{ fontSize: '3rem', marginBottom: 8 }}>{emoji}</div>
            {isPerfect && (
              <div style={{ fontFamily: 'var(--fM)', fontSize: '.56rem', color: 'var(--Y)', background: 'rgba(198,161,91,.12)', border: '1px solid rgba(198,161,91,.3)', borderRadius: 20, padding: '3px 14px', display: 'inline-block', marginBottom: 8 }}>
                ✨ PARCOURS PARFAIT — +20 ELO
              </div>
            )}
            <div style={{ fontFamily: 'var(--fH)', fontSize: '1.3rem', letterSpacing: '.1em', marginBottom: 4 }}>
              {correctCount}/{CHAPTERS.length} PHILOSOPHES CONVAINCUS
            </div>
            <div style={{ fontFamily: 'var(--fM)', fontSize: '.62rem', color: 'var(--dim)' }}>
              Solidité finale : {solidite}/100 · +{xpTotal} XP
            </div>
          </div>

          {/* Stats grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 10, marginBottom: 22 }}>
            {[
              ['✅', correctCount, 'Convaincus', 'var(--G)'],
              ['🏛', solidite, 'Solidité', solidite >= 70 ? 'var(--G)' : solidite >= 40 ? 'var(--Y)' : 'var(--B)'],
              ['⭐', xpTotal, 'XP gagnés', 'var(--O)'],
            ].map(([icon, val, label, color]) => (
              <div key={label} style={{ background: 'var(--s1)', border: '1px solid var(--bd)', borderRadius: 10, padding: '14px 10px', textAlign: 'center' }}>
                <div style={{ fontSize: '1.3rem', marginBottom: 4 }}>{icon}</div>
                <div style={{ fontFamily: 'var(--fH)', fontSize: '1.5rem', color }}>{val}</div>
                <div style={{ fontFamily: 'var(--fM)', fontSize: '.48rem', color: 'var(--muted)', textTransform: 'uppercase' }}>{label}</div>
              </div>
            ))}
          </div>

          {/* Chapter results */}
          <div style={{ background: 'var(--s1)', border: '1px solid var(--bd)', borderRadius: 10, padding: '14px 18px', marginBottom: 22 }}>
            <div style={{ fontFamily: 'var(--fM)', fontSize: '.54rem', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '.1em', marginBottom: 12 }}>
              Résultats par chapitre
            </div>
            {CHAPTERS.map((c, i) => {
              const h = history[i];
              return (
                <div key={c.id} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8, paddingBottom: 8, borderBottom: i < CHAPTERS.length - 1 ? '1px solid var(--bd)' : 'none' }}>
                  <span style={{ fontSize: '.9rem' }}>{h?.correct ? '✅' : '❌'}</span>
                  <span style={{ fontSize: '1.1rem' }}>{c.portrait}</span>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontFamily: 'var(--fB)', fontSize: '.68rem', fontWeight: 600, color: h?.correct ? 'var(--G)' : 'var(--B)' }}>{c.character}</div>
                    <div style={{ fontFamily: 'var(--fM)', fontSize: '.52rem', color: 'var(--muted)' }}>{c.era}</div>
                  </div>
                  <div style={{ fontFamily: 'var(--fH)', fontSize: '.75rem', color: h?.correct ? 'var(--G)' : 'var(--B)' }}>
                    {h?.correct ? '+30 XP' : '—'}
                  </div>
                </div>
              );
            })}
          </div>

          <div style={{ display: 'flex', gap: 10 }}>
            <button className="btn b-y b-lg" onClick={handleRestart} style={{ flex: 1, justifyContent: 'center' }}>🗺 Recommencer</button>
            <button className="btn b-ghost" onClick={() => setPhase('intro')} style={{ flex: 1, justifyContent: 'center' }}>← Retour</button>
          </div>
        </div>
      </div>
    );
  }

  return null;
}
