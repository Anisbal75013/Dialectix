// ═══════════════════════════════════════════════════════════════════════════════
// DIALECTIX — weeklyDebateService.js
// ═══════════════════════════════════════════════════════════════════════════════
// Pure JS service for weekly debate topic management.
// No React dependencies. All state via localStorage.
//
// Keys:
//   'dx_weekly_debates'      — array of topic objects
//   'dx_actu_participation'  — object { [userId]: { [topicId]: side } }
//   'dx_weekly_results'      — array of result objects
// ═══════════════════════════════════════════════════════════════════════════════

const KEY_DEBATES       = 'dx_weekly_debates';
const KEY_PARTICIPATION = 'dx_actu_participation';
const KEY_RESULTS       = 'dx_weekly_results';
const KEY_WEEK_DEBATES  = 'dx_week_debate_count'; // { [userId_week]: count }

// ─── SAFETY CONSTANTS ─────────────────────────────────────────────────────
const MAX_DEBATES_PER_WEEK = 5;

/** Banned patterns — filters accusations, judicial topics, defamation */
const BANNED_PATTERNS = [
  // Personal accusations
  /\b(est coupable|a commis|est un criminel|est responsable de)\b/i,
  // Judicial — named individuals
  /\b(procès de|tribunal|condamné|acquitté|inculpé)\b.*\b[A-Z][a-z]+\s[A-Z][a-z]+/,
  // Defamation markers
  /\b(arnaqueur|fraudeur|violeur|pédophile|terroriste)\b/i,
  // Named-person attacks
  /\b(monsieur|madame|m\.|mme\.)\s[A-Z][a-z]+.*\b(menteur|manipulateur|corrompu)\b/i,
];

/**
 * Returns true if a topic title/context contains banned content.
 */
export function hasBannedContent(topic) {
  const text = `${topic.title || ''} ${topic.context || ''}`;
  return BANNED_PATTERNS.some(rx => rx.test(text));
}

/**
 * Filter an array of topics, removing any that contain banned content.
 */
export function filterSafeTopics(topics) {
  return topics.filter(t => !hasBannedContent(t));
}

// ─── WEEKLY DEBATE LIMIT ──────────────────────────────────────────────────
/**
 * Returns the number of debates the user has done this week (Actu only).
 */
export function getUserWeekDebateCount(userId) {
  if (!userId) return 0;
  const week = getCurrentWeekNumber();
  const store = lsGet(KEY_WEEK_DEBATES) || {};
  return store[`${userId}_${week}`] || 0;
}

/**
 * Increments the user's weekly debate count.
 */
export function incrementUserWeekDebateCount(userId) {
  if (!userId) return;
  const week = getCurrentWeekNumber();
  const store = lsGet(KEY_WEEK_DEBATES) || {};
  const key = `${userId}_${week}`;
  store[key] = (store[key] || 0) + 1;
  lsSet(KEY_WEEK_DEBATES, store);
}

/**
 * Returns true if the user has reached the weekly limit (5 debates/week).
 */
export function hasReachedWeeklyLimit(userId) {
  return getUserWeekDebateCount(userId) >= MAX_DEBATES_PER_WEEK;
}

// ─── INTERNAL HELPERS ────────────────────────────────────────────────────────

function lsGet(key) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function lsSet(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}

function getCurrentWeekNumber() {
  const now = new Date();
  const startOfYear = new Date(now.getFullYear(), 0, 1);
  const diff = now - startOfYear;
  const oneWeek = 1000 * 60 * 60 * 24 * 7;
  return Math.ceil(diff / oneWeek);
}

// ─── DEFAULT TOPICS ───────────────────────────────────────────────────────────
// Seeded for week 1. Used when localStorage has no data.

const DEFAULT_TOPICS = [
  {
    id: 'w1t1',
    title: "Les réseaux sociaux devraient-ils être régulés par les États ?",
    context: "La prolifération des plateformes numériques soulève des questions fondamentales sur la liberté d'expression et la désinformation. Les gouvernements européens ont récemment adopté le DSA. Les débats sur la censure et la modération sont au cœur de l'actualité.",
    positionA: "Oui — une régulation stricte protège les citoyens de la manipulation et de la désinformation.",
    positionB: "Non — réguler les réseaux sociaux revient à museler la liberté d'expression.",
    category: 'société',
    weekNumber: 1,
    votes: { A: 0, B: 0 },
  },
  {
    id: 'w1t2',
    title: "L'intelligence artificielle générale représente-t-elle une menace existentielle ?",
    context: "Les avancées récentes en IA suscitent des débats parmi les chercheurs et décideurs. Des figures comme Elon Musk et Geoffrey Hinton ont exprimé des inquiétudes majeures. L'ONU a créé un groupe d'experts sur la gouvernance de l'IA.",
    positionA: "Oui — le développement incontrôlé de l'AGI fait peser des risques catastrophiques sur l'humanité.",
    positionB: "Non — les risques sont exagérés et l'IA restera un outil sous contrôle humain.",
    category: 'science',
    weekNumber: 1,
    votes: { A: 0, B: 0 },
  },
  {
    id: 'w1t3',
    title: "Le travail à distance devrait-il devenir la norme dans les entreprises ?",
    context: "La pandémie de COVID-19 a transformé les modes de travail à l'échelle mondiale. De nombreuses entreprises ont adopté des politiques hybrides. Le débat sur la productivité, le lien social et la qualité de vie fait rage.",
    positionA: "Oui — le télétravail améliore la qualité de vie, réduit les émissions et augmente la productivité.",
    positionB: "Non — le bureau reste essentiel pour la cohésion d'équipe, l'innovation et la culture d'entreprise.",
    category: 'économie',
    weekNumber: 1,
    votes: { A: 0, B: 0 },
  },
  {
    id: 'w1t4',
    title: "Faut-il interdire les combustibles fossiles d'ici 2035 ?",
    context: "Le GIEC alerte sur l'urgence climatique et la nécessité de réduire drastiquement les émissions. Plusieurs pays ont annoncé des plans de transition énergétique. L'industrie pétrolière représente des millions d'emplois mondiaux.",
    positionA: "Oui — seule une interdiction rapide permettra de limiter le réchauffement à 1,5°C.",
    positionB: "Non — une transition aussi brutale provoquerait une crise économique et sociale majeure.",
    category: 'éthique',
    weekNumber: 1,
    votes: { A: 0, B: 0 },
  },
  {
    id: 'w1t5',
    title: "L'Union Européenne devrait-elle créer une armée commune ?",
    context: "Face aux tensions géopolitiques croissantes, notamment le conflit en Ukraine, la question d'une défense européenne autonome est revenue au premier plan. Certains États membres y sont favorables, d'autres préfèrent compter sur l'OTAN.",
    positionA: "Oui — une armée européenne renforcerait la souveraineté stratégique de l'UE.",
    positionB: "Non — cela fragiliserait l'OTAN et créerait des tensions inutiles entre alliés.",
    category: 'géopolitique',
    weekNumber: 1,
    votes: { A: 0, B: 0 },
  },
];

// ─── MOCK TOPIC POOLS (used by generateMockWeeklyTopics) ─────────────────────

const MOCK_POOL = [
  {
    titleTemplate: "Le revenu universel de base est-il une solution viable ?",
    context: "Plusieurs pays ont expérimenté le revenu universel de base, avec des résultats nuancés. La montée de l'automatisation soulève des inquiétudes sur l'emploi. Le débat économique et philosophique reste ouvert.",
    positionA: "Oui — le RUB garantit la dignité humaine et libère le potentiel créatif des citoyens.",
    positionB: "Non — financer le RUB est économiquement insoutenable et décourage le travail.",
    category: 'économie',
  },
  {
    titleTemplate: "Faut-il légaliser toutes les drogues ?",
    context: "Le Portugal a montré que la dépénalisation peut réduire les overdoses et les infections. Les politiques de prohibition ont largement échoué à enrayer le trafic. La question de santé publique versus ordre moral divise les sociétés.",
    positionA: "Oui — la légalisation permettrait de réduire le trafic et mieux traiter les addictions.",
    positionB: "Non — légaliser les drogues enverrait un signal dangereux et aggraverait les problèmes sociaux.",
    category: 'société',
  },
  {
    titleTemplate: "L'exploration de Mars devrait-elle être une priorité mondiale ?",
    context: "NASA et SpaceX préparent des missions habitées vers Mars. Le coût est estimé en centaines de milliards de dollars. Certains scientifiques préfèrent concentrer les ressources sur les défis terrestres.",
    positionA: "Oui — coloniser Mars est une assurance-vie pour l'espèce humaine et stimule l'innovation.",
    positionB: "Non — ces milliards seraient mieux investis pour résoudre la pauvreté et le changement climatique.",
    category: 'science',
  },
  {
    titleTemplate: "Les États devraient-ils instaurer une taxe sur la richesse des milliardaires ?",
    context: "Les inégalités de richesse ont atteint des niveaux records dans la plupart des pays développés. Des économistes comme Thomas Piketty plaident pour une taxation progressive. Les opposants craignent une fuite des capitaux.",
    positionA: "Oui — taxer les super-riches est nécessaire pour financer les services publics et réduire les inégalités.",
    positionB: "Non — cette taxe est contre-productive et pousse les capitaux à fuir vers des paradis fiscaux.",
    category: 'économie',
  },
  {
    titleTemplate: "L'alimentation végane devrait-elle être encouragée par la loi ?",
    context: "La production animale représente 14,5% des émissions mondiales de gaz à effet de serre selon la FAO. Des études montrent les bénéfices sanitaires et environnementaux du régime végétal. Mais les traditions culinaires et les droits individuels sont en jeu.",
    positionA: "Oui — encourager le véganisme légalement est nécessaire pour le climat et la santé publique.",
    positionB: "Non — l'État n'a pas à légiférer sur les choix alimentaires personnels des citoyens.",
    category: 'éthique',
  },
  {
    titleTemplate: "La Chine représente-t-elle la principale menace géopolitique de ce siècle ?",
    context: "La montée en puissance économique et militaire de la Chine redessine l'ordre mondial. Les tensions autour de Taïwan et en mer de Chine méridionale s'intensifient. Washington et Pékin s'affrontent dans une rivalité technologique et commerciale.",
    positionA: "Oui — l'expansionnisme chinois menace la démocratie et la stabilité mondiale.",
    positionB: "Non — la rivalité sino-américaine est avant tout une compétition d'influence, pas une menace directe.",
    category: 'géopolitique',
  },
  {
    titleTemplate: "Faut-il interdire les smartphones dans les écoles primaires et secondaires ?",
    context: "De nombreux pays débattent de l'interdiction des téléphones portables en classe. Les études montrent des effets négatifs sur la concentration et le bien-être des élèves. Les partisans soulignent les usages pédagogiques potentiels.",
    positionA: "Oui — les smartphones nuisent à l'apprentissage et au développement social des jeunes.",
    positionB: "Non — les interdire ne prépare pas les élèves au monde numérique et ignore leurs besoins réels.",
    category: 'société',
  },
  {
    titleTemplate: "Les humains ont-ils une obligation morale de préserver toutes les espèces animales ?",
    context: "Le taux d'extinction des espèces est actuellement 1000 fois supérieur au rythme naturel. De nombreuses espèces ont un rôle écosystémique crucial. Mais les ressources pour la conservation sont limitées.",
    positionA: "Oui — nous avons une dette morale envers les espèces que nous menaçons et un devoir écologique.",
    positionB: "Non — l'extinction fait partie de l'évolution naturelle et nous devons prioriser les espèces clés.",
    category: 'éthique',
  },
];

// ─── PUBLIC API ───────────────────────────────────────────────────────────────

/**
 * Returns the current week's topics from localStorage.
 * Falls back to DEFAULT_TOPICS (week 1) if no data is stored.
 */
export function getWeeklyTopics() {
  const all = lsGet(KEY_DEBATES);
  if (!Array.isArray(all) || all.length === 0) {
    // Seed with defaults
    lsSet(KEY_DEBATES, DEFAULT_TOPICS);
    return DEFAULT_TOPICS;
  }
  const currentWeek = getCurrentWeekNumber();
  const current = all.filter(t => t.weekNumber === currentWeek);
  if (current.length > 0) return current;
  // Fallback: return highest available week
  const maxWeek = Math.max(...all.map(t => t.weekNumber));
  return all.filter(t => t.weekNumber === maxWeek);
}

/**
 * Returns all topics across all weeks from localStorage.
 */
export function getAllTopics() {
  const all = lsGet(KEY_DEBATES);
  if (!Array.isArray(all)) return DEFAULT_TOPICS;
  return all;
}

/**
 * Saves (overwrites) the topics array to localStorage.
 */
export function saveTopics(topics) {
  if (!Array.isArray(topics)) return false;
  return lsSet(KEY_DEBATES, topics);
}

/**
 * Adds a vote for a topic.
 * side: 'A' | 'B'
 */
export function voteOnTopic(topicId, side) {
  if (side !== 'A' && side !== 'B') return false;
  const all = getAllTopics();
  const idx = all.findIndex(t => t.id === topicId);
  if (idx === -1) return false;
  const topic = { ...all[idx] };
  topic.votes = { ...topic.votes };
  topic.votes[side] = (topic.votes[side] || 0) + 1;
  all[idx] = topic;
  return saveTopics(all);
}

/**
 * Returns participation data for a specific user.
 * Returns object: { [topicId]: 'A' | 'B' }
 */
export function getUserParticipation(userId) {
  if (!userId) return {};
  const all = lsGet(KEY_PARTICIPATION) || {};
  return all[userId] || {};
}

/**
 * Records a user's participation in a topic debate.
 * Does not overwrite an existing participation for the same topic.
 */
export function recordParticipation(userId, topicId, side) {
  if (!userId || !topicId || (side !== 'A' && side !== 'B')) return false;
  const all = lsGet(KEY_PARTICIPATION) || {};
  if (!all[userId]) all[userId] = {};
  // Do not override existing participation
  if (all[userId][topicId]) return false;
  all[userId][topicId] = side;
  return lsSet(KEY_PARTICIPATION, all);
}

/**
 * Generates mock weekly topics for a given week number.
 * Picks 5 topics from the pool, cycling through them.
 * In production this would call the backend API.
 */
export function generateMockWeeklyTopics(weekNumber) {
  const wn = typeof weekNumber === 'number' ? weekNumber : getCurrentWeekNumber();
  const poolLen = MOCK_POOL.length;
  const offset = (wn - 1) * 5;
  const topics = [];
  for (let i = 0; i < 5; i++) {
    const poolEntry = MOCK_POOL[(offset + i) % poolLen];
    topics.push({
      id: `w${wn}t${i + 1}`,
      title: poolEntry.titleTemplate,
      context: poolEntry.context,
      positionA: poolEntry.positionA,
      positionB: poolEntry.positionB,
      category: poolEntry.category,
      weekNumber: wn,
      votes: { A: 0, B: 0 },
    });
  }
  return topics;
}

/**
 * Admin: validates and publishes selected topics by their IDs.
 * Marks matching topics as published: true in localStorage.
 * selectedIds: array of topic id strings
 */
export function publishTopics(selectedIds) {
  if (!Array.isArray(selectedIds) || selectedIds.length === 0) return false;
  const all = getAllTopics();
  const idSet = new Set(selectedIds);
  const updated = all.map(t => idSet.has(t.id) ? { ...t, published: true } : t);
  return saveTopics(updated);
}

/**
 * Gets results for previous week topics.
 * Returns array of result objects from localStorage,
 * or synthesizes them from vote data if no explicit results are stored.
 */
export function getPreviousWeekResults() {
  // Try explicit results store first
  const stored = lsGet(KEY_RESULTS);
  if (Array.isArray(stored) && stored.length > 0) return stored;

  // Synthesize from vote data for the previous week
  const all = getAllTopics();
  if (!all || all.length === 0) return [];

  const maxWeek = Math.max(...all.map(t => t.weekNumber));
  const prevWeek = maxWeek - 1;
  if (prevWeek < 1) return [];

  const prevTopics = all.filter(t => t.weekNumber === prevWeek);
  return prevTopics.map(t => {
    const totalVotes = (t.votes?.A || 0) + (t.votes?.B || 0);
    const pctA = totalVotes > 0 ? Math.round((t.votes.A / totalVotes) * 100) : 50;
    const pctB = totalVotes > 0 ? Math.round((t.votes.B / totalVotes) * 100) : 50;
    return {
      topicId: t.id,
      title: t.title,
      category: t.category,
      weekNumber: t.weekNumber,
      pourPct: pctA,
      contrePct: pctB,
      totalVotes,
      bestArgument: t.bestArgument || null,
    };
  });
}
