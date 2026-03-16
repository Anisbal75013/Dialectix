import { useState, useEffect, useCallback } from 'react';

/* ── Admin system ──────────────────────────────────────────────────────
 * isAdmin()        — returns true if localStorage['dx_admin'] === 'true'
 * enableAdminMode() — run in browser console: enableAdminMode()
 * ─────────────────────────────────────────────────────────────────── */
export function isAdmin() {
  try { return localStorage.getItem('dx_admin') === 'true'; }
  catch { return false; }
}

window.enableAdminMode  = () => { localStorage.setItem('dx_admin','true');  console.log('✅ Admin mode enabled — refresh the page.'); };
window.disableAdminMode = () => { localStorage.removeItem('dx_admin');       console.log('🔒 Admin mode disabled.'); };

const TOURNAMENT_KEY = 'dx_tournament_alpha';

const TOURNAMENT_CONFIG = {
  id: 'alpha_001',
  name: 'Dialectix Alpha Tournament',
  durationMs: 72 * 60 * 60 * 1000,
  maxParticipants: 10,
  minBattles: 5,
  maxRematches: 2,
};

// ─── Modes de contrainte rhétorique ──────────────────────────────────────────
export const CONSTRAINT_MODES = [
  {
    id: 'libre',
    label: 'Libre',
    icon: '🎙',
    color: '#2C4A6E',
    desc: 'Aucune contrainte — argumentation libre.',
    scoring: 'Critères standards : clarté, structure, exemples.',
  },
  {
    id: 'sophiste',
    label: 'Mode Sophiste',
    icon: '🚫',
    color: '#8C3A30',
    desc: "Interdiction d'utiliser l'Homme de Paille et le Faux Dilemme.",
    scoring: "Pénalité si l'un de ces sophismes est détecté dans votre réponse.",
  },
  {
    id: 'architecte',
    label: 'Mode Architecte',
    icon: '🏛',
    color: '#3A6E52',
    desc: 'Construisez votre argument avec 3 prémisses explicites numérotées.',
    scoring: 'Bonus si les 3 prémisses sont valides et mènent logiquement à la conclusion.',
  },
  {
    id: 'oracle',
    label: 'Mode Oracle',
    icon: '🔮',
    color: '#5A3A6E',
    desc: "Identifiez d'abord 2 biais dans l'argument adverse avant de répondre.",
    scoring: "Bonus si les biais identifiés sont corrects. Score doublé sur la réfutation.",
  },
];

// ─── Bracket engine ───────────────────────────────────────────────────────────
// Génère un bracket d'élimination directe à partir d'une liste de participants
// triés par ELO (seed 1 = meilleur). Supports 4, 8, 16, 32 joueurs.
export function generateBracket(participants) {
  const n = participants.length;
  // Tête de série : le meilleur (1) affronte le moins bon (n), etc.
  const seeded = [...participants].sort((a, b) => (b.elo || 1000) - (a.elo || 1000));
  const rounds = Math.log2(n);
  const matches = [];
  // Round 1: paired by seed
  for (let i = 0; i < n / 2; i++) {
    matches.push({
      id: `r1m${i + 1}`,
      round: 1,
      matchNumber: i + 1,
      player1: seeded[i] || null,
      player2: seeded[n - 1 - i] || null,
      winner: null,
      constraintMode: CONSTRAINT_MODES[Math.floor(Math.random() * CONSTRAINT_MODES.length)].id,
      topic: null,
      played: false,
    });
  }
  // Rounds suivants : slots vides, remplis au fur et à mesure des victoires
  for (let r = 2; r <= rounds; r++) {
    const matchesInRound = n / Math.pow(2, r);
    for (let m = 1; m <= matchesInRound; m++) {
      matches.push({
        id: `r${r}m${m}`,
        round: r,
        matchNumber: m,
        player1: null,
        player2: null,
        winner: null,
        constraintMode: CONSTRAINT_MODES[Math.floor(Math.random() * CONSTRAINT_MODES.length)].id,
        topic: null,
        played: false,
      });
    }
  }
  return { matches, totalRounds: rounds, size: n };
}

// Avance un vainqueur dans le bracket et remplit le slot du prochain match
export function advanceBracket(bracket, matchId, winner) {
  const match = bracket.matches.find(m => m.id === matchId);
  if (!match || match.winner) return bracket;
  const updatedMatches = bracket.matches.map(m =>
    m.id === matchId ? { ...m, winner, played: true } : m
  );
  // Calculer le slot dans le prochain round
  const nextRound = match.round + 1;
  const nextMatchNumber = Math.ceil(match.matchNumber / 2);
  const nextMatchId = `r${nextRound}m${nextMatchNumber}`;
  const isPlayer1Slot = match.matchNumber % 2 !== 0;
  const finalMatches = updatedMatches.map(m => {
    if (m.id !== nextMatchId) return m;
    return {
      ...m,
      player1: isPlayer1Slot ? winner : m.player1,
      player2: !isPlayer1Slot ? winner : m.player2,
    };
  });
  return { ...bracket, matches: finalMatches };
}

// Retourne le vainqueur final du bracket (si la grande finale est jouée)
export function getBracketChampion(bracket) {
  if (!bracket) return null;
  const finalMatch = bracket.matches.find(
    m => m.round === bracket.totalRounds && m.matchNumber === 1
  );
  return finalMatch?.winner || null;
}

// Calcul des récompenses ELO/XP en fonction du round atteint
export function computeReward(roundReached, totalRounds) {
  const ratio = roundReached / totalRounds;
  const elo = Math.round(30 + ratio * 120);   // 30 pour R1, jusqu'à 150 pour champion
  const xp  = Math.round(50 + ratio * 450);   // 50 pour R1, jusqu'à 500 pour champion
  return { elo, xp };
}

const SAMPLE_TOPICS = [
  "L'intelligence artificielle remplacera les enseignants",
  "Les réseaux sociaux nuisent à la démocratie",
  "Le travail à distance améliore la productivité",
  "La viande de synthèse est l'avenir de l'alimentation",
  "Les cryptomonnaies remplaceront les monnaies traditionnelles",
  "L'école devrait être facultative après 16 ans",
  "La censure sur internet est parfois justifiée",
  "Le sport professionnel est surpayé",
];

function getRandomTopic() {
  return SAMPLE_TOPICS[Math.floor(Math.random() * SAMPLE_TOPICS.length)];
}

function loadTournament() {
  try {
    const raw = localStorage.getItem(TOURNAMENT_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function saveTournament(state) {
  localStorage.setItem(TOURNAMENT_KEY, JSON.stringify(state));
}

function createTournament(weeklyTopic) {
  const now = Date.now();
  const state = {
    id: TOURNAMENT_CONFIG.id,
    name: TOURNAMENT_CONFIG.name,
    weeklyTopic: weeklyTopic || getRandomTopic(),
    startTime: now,
    endTime: now + TOURNAMENT_CONFIG.durationMs,
    participants: [],
    matches: [],       // round-robin warm-up matches
    bracket: null,     // élimination directe — null jusqu'au lancement
    status: 'active',
    createdByAdmin: true,
  };
  saveTournament(state);
  return state;
}

function formatCountdown(ms) {
  if (ms <= 0) return null;
  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return `${String(hours).padStart(2, '0')}h ${String(minutes).padStart(2, '0')}m ${String(seconds).padStart(2, '0')}s`;
}

export default function TournamentSystem({ user, saveUser, setPage, showToast, onChallenge }) {
  const [tournament, setTournament] = useState(() => loadTournament());
  const [countdown, setCountdown] = useState('');
  const [now, setNow] = useState(Date.now());
  // ── Bracket state ──────────────────────────────────────────────────────────
  const [activeTab, setActiveTab] = useState('leaderboard'); // 'leaderboard' | 'bracket'
  const [pendingChallenge, setPendingChallenge] = useState(null); // participant to challenge
  const [selectedMode, setSelectedMode] = useState('libre');     // constraint mode for next match
  const [weeklyTopicEdit, setWeeklyTopicEdit] = useState(false);
  const [weeklyTopicDraft, setWeeklyTopicDraft] = useState('');

  // Sync tournament from localStorage whenever it updates
  const refreshTournament = useCallback(() => {
    const t = loadTournament();
    setTournament(t);
    return t;
  }, []);

  // Countdown + auto-end timer
  useEffect(() => {
    const interval = setInterval(() => {
      const current = Date.now();
      setNow(current);

      const t = loadTournament();
      if (!t) return;

      if (t.status === 'active') {
        const remaining = t.endTime - current;
        if (remaining <= 0) {
          const updated = { ...t, status: 'ended' };
          saveTournament(updated);
          setTournament(updated);
          setCountdown('');
          showToast && showToast('Le tournoi est terminé !');
        } else {
          setCountdown(formatCountdown(remaining));
        }
      }
    }, 1000);

    // Initial countdown
    if (tournament && tournament.status === 'active') {
      const remaining = tournament.endTime - Date.now();
      setCountdown(remaining > 0 ? formatCountdown(remaining) : '');
    }

    return () => clearInterval(interval);
  }, [tournament?.id, tournament?.status]);

  // --- Actions ---

  function handleInit() {
    const t = createTournament();
    setTournament(t);
    showToast && showToast('Tournoi initialisé avec succès !');
  }

  function handleJoin() {
    if (!user) return;
    const t = loadTournament();
    if (!t || t.status !== 'active') return;
    if (t.participants.length >= TOURNAMENT_CONFIG.maxParticipants) {
      showToast && showToast('Le tournoi est complet.');
      return;
    }
    if (t.participants.find(p => p.id === user.id)) {
      showToast && showToast('Vous êtes déjà inscrit.');
      return;
    }
    const updated = {
      ...t,
      participants: [
        ...t.participants,
        {
          id: user.id,
          name: user.name,
          elo: user.elo ?? 1000,
          battles: 0,
          wins: 0,
          losses: 0,
          avatar: user.avatar ?? null,
        },
      ],
    };
    saveTournament(updated);
    setTournament(updated);
    showToast && showToast('Vous avez rejoint le tournoi !');
  }

  function handleEndTournament() {
    if (!isAdmin()) return;
    const t = loadTournament();
    if (!t) return;
    const updated = { ...t, status: 'ended' };
    saveTournament(updated);
    setTournament(updated);
    showToast && showToast('Tournoi terminé par l\'administrateur.');
  }

  function handleResetTournament() {
    if (!isAdmin()) return;
    localStorage.removeItem(TOURNAMENT_KEY);
    setTournament(null);
    showToast && showToast('Tournoi réinitialisé.');
  }

  // ── Bracket handlers ────────────────────────────────────────────────────────
  function handleLaunchBracket() {
    if (!isAdmin()) return;
    const t = loadTournament();
    if (!t || t.participants.length < 4) {
      showToast && showToast('Il faut au moins 4 participants pour lancer le bracket.', 'error');
      return;
    }
    // Normalise to nearest power of 2
    const sizes = [4, 8, 16, 32];
    const size = sizes.find(s => s >= t.participants.length) || 8;
    // Pad with BYE slots if needed
    const padded = [...t.participants];
    while (padded.length < size) padded.push({ id: `bye_${padded.length}`, name: 'BYE', elo: 0, isBye: true });
    const bracket = generateBracket(padded.slice(0, size));
    const updated = { ...t, bracket, status: 'bracket' };
    saveTournament(updated);
    setTournament(updated);
    setActiveTab('bracket');
    showToast && showToast(`🏆 Bracket ${size} joueurs lancé !`, 'achievement');
  }

  function handleBracketWinner(matchId, winner) {
    if (!isAdmin()) return;
    const t = loadTournament();
    if (!t?.bracket) return;
    const newBracket = advanceBracket(t.bracket, matchId, winner);
    const champion = getBracketChampion(newBracket);
    const updated = { ...t, bracket: newBracket, ...(champion ? { status: 'ended', champion } : {}) };
    saveTournament(updated);
    setTournament(updated);
    if (champion) {
      const { elo, xp } = computeReward(newBracket.totalRounds, newBracket.totalRounds);
      showToast && showToast(`🥇 Champion : ${champion.name} ! +${elo} ELO +${xp} XP`, 'achievement');
      // Apply rewards if champion is current user
      if (user && saveUser && user.id === champion.id) {
        saveUser({ ...user, elo: (user.elo || 1000) + elo, xp: (user.xp || 0) + xp });
      }
    }
  }

  // ── Weekly Topic handlers ──────────────────────────────────────────────────
  function handleSaveWeeklyTopic() {
    if (!isAdmin() || !weeklyTopicDraft.trim()) return;
    const t = loadTournament();
    if (!t) return;
    const updated = { ...t, weeklyTopic: weeklyTopicDraft.trim() };
    saveTournament(updated);
    setTournament(updated);
    setWeeklyTopicEdit(false);
    showToast && showToast('Sujet de la semaine mis à jour.');
  }

  const COOLDOWN_MS = 10 * 60 * 1000; // 10 minutes between same-pair battles

  function canChallenge(challengerId, defenderId) {
    const t = loadTournament();
    if (!t) return false;
    if (t.status !== 'active') return false;
    const matchesBetween = t.matches.filter(
      m =>
        (m.challengerId === challengerId && m.defenderId === defenderId) ||
        (m.challengerId === defenderId && m.defenderId === challengerId)
    );
    // Rule 1: maximum 2 rematches between same pair
    if (matchesBetween.length >= TOURNAMENT_CONFIG.maxRematches) return false;
    // Rule 2: 10-minute cooldown since the last battle between this pair
    if (matchesBetween.length > 0) {
      const lastMatch = matchesBetween.reduce((latest, m) =>
        m.timestamp > latest.timestamp ? m : latest, matchesBetween[0]);
      if (Date.now() - lastMatch.timestamp < COOLDOWN_MS) return false;
    }
    return true;
  }

  function getCooldownRemaining(challengerId, defenderId) {
    const t = loadTournament();
    if (!t) return 0;
    const matchesBetween = t.matches.filter(
      m =>
        (m.challengerId === challengerId && m.defenderId === defenderId) ||
        (m.challengerId === defenderId && m.defenderId === challengerId)
    );
    if (!matchesBetween.length) return 0;
    const lastMatch = matchesBetween.reduce((l, m) => m.timestamp > l.timestamp ? m : l, matchesBetween[0]);
    const remaining = COOLDOWN_MS - (Date.now() - lastMatch.timestamp);
    return Math.max(0, remaining);
  }

  function recordMatch(challengerId, defenderId, winnerId) {
    const t = loadTournament();
    if (!t) return;
    const topic = getRandomTopic();
    const match = {
      id: `match_${Date.now()}`,
      challengerId,
      defenderId,
      winnerId,
      timestamp: Date.now(),
      topic,
    };
    const updatedParticipants = t.participants.map(p => {
      if (p.id === challengerId || p.id === defenderId) {
        return {
          ...p,
          battles: p.battles + 1,
          wins: p.id === winnerId ? p.wins + 1 : p.wins,
          losses: p.id !== winnerId && winnerId !== null ? p.losses + 1 : p.losses,
        };
      }
      return p;
    });
    const updated = {
      ...t,
      participants: updatedParticipants,
      matches: [...t.matches, match],
    };
    saveTournament(updated);
    setTournament(updated);
  }

  function handleChallenge(participant) {
    if (!user) return;
    if (!canChallenge(user.id, participant.id)) {
      showToast && showToast('Vous avez déjà affronté ce joueur 2 fois.');
      return;
    }
    // Show constraint picker modal before launching
    setPendingChallenge(participant);
    setSelectedMode('libre');
  }

  function handleConfirmChallenge() {
    if (!pendingChallenge) return;
    const mode = CONSTRAINT_MODES.find(m => m.id === selectedMode) || CONSTRAINT_MODES[0];
    onChallenge && onChallenge(pendingChallenge, mode);
    setPendingChallenge(null);
  }

  // --- Derived data ---

  const isParticipant = tournament && user
    ? !!tournament.participants.find(p => p.id === user.id)
    : false;

  const sortedParticipants = tournament
    ? [...tournament.participants].sort((a, b) => b.elo - a.elo)
    : [];

  const spotsLeft = tournament
    ? TOURNAMENT_CONFIG.maxParticipants - tournament.participants.length
    : TOURNAMENT_CONFIG.maxParticipants;

  // --- Styles ---

  const styles = {
    page: {
      minHeight: '100vh',
      background: 'var(--bg)',
      color: 'var(--txt)',
      fontFamily: 'var(--fB)',
      padding: '0 0 60px 0',
    },
    header: {
      background: 'linear-gradient(135deg, var(--A), var(--B))',
      padding: '32px 24px 28px',
      textAlign: 'center',
      position: 'relative',
      borderBottom: '2px solid var(--bd)',
    },
    headerTitle: {
      fontFamily: 'var(--fH)',
      fontSize: 'clamp(18px, 5vw, 28px)',
      fontWeight: 900,
      letterSpacing: '0.08em',
      color: '#fff',
      margin: '0 0 12px 0',
      textTransform: 'uppercase',
    },
    statusBadge: {
      display: 'inline-block',
      padding: '4px 14px',
      borderRadius: '20px',
      fontSize: 12,
      fontWeight: 700,
      letterSpacing: '0.1em',
      textTransform: 'uppercase',
      background: tournament?.status === 'ended' ? 'var(--muted)' : 'var(--G)',
      color: '#fff',
      marginBottom: 12,
    },
    countdown: {
      fontFamily: 'var(--fM)',
      fontSize: 'clamp(14px, 3.5vw, 20px)',
      color: 'rgba(255,255,255,0.92)',
      marginBottom: 16,
      fontWeight: 700,
      letterSpacing: '0.05em',
    },
    joinBtn: {
      display: 'inline-block',
      padding: '10px 28px',
      background: 'var(--Y)',
      color: '#000',
      border: 'none',
      borderRadius: 8,
      fontFamily: 'var(--fB)',
      fontWeight: 800,
      fontSize: 14,
      cursor: 'pointer',
      letterSpacing: '0.05em',
      textTransform: 'uppercase',
      boxShadow: 'var(--sh)',
      transition: 'opacity 0.15s',
    },
    spotsLabel: {
      fontSize: 12,
      color: 'rgba(255,255,255,0.7)',
      marginTop: 8,
    },
    section: {
      maxWidth: 860,
      margin: '0 auto',
      padding: '24px 16px 0',
    },
    sectionTitle: {
      fontFamily: 'var(--fH)',
      fontSize: 16,
      fontWeight: 800,
      letterSpacing: '0.1em',
      textTransform: 'uppercase',
      color: 'var(--A)',
      margin: '0 0 14px 0',
      paddingBottom: 8,
      borderBottom: '1px solid var(--bd)',
    },
    tableWrap: {
      overflowX: 'auto',
      borderRadius: 10,
      border: '1px solid var(--bd)',
      boxShadow: 'var(--sh2)',
      background: 'var(--s2)',
    },
    table: {
      width: '100%',
      borderCollapse: 'collapse',
      fontSize: 14,
    },
    th: {
      padding: '11px 14px',
      textAlign: 'left',
      fontFamily: 'var(--fM)',
      fontWeight: 700,
      fontSize: 11,
      letterSpacing: '0.08em',
      textTransform: 'uppercase',
      color: 'var(--muted)',
      borderBottom: '1px solid var(--bd)',
      background: 'var(--s2)',
      whiteSpace: 'nowrap',
    },
    td: {
      padding: '11px 14px',
      borderBottom: '1px solid var(--bd2)',
      verticalAlign: 'middle',
      color: 'var(--txt)',
    },
    tdCenter: {
      padding: '11px 14px',
      borderBottom: '1px solid var(--bd2)',
      verticalAlign: 'middle',
      textAlign: 'center',
      color: 'var(--txt)',
    },
    currentUserRow: {
      background: 'rgba(var(--A-rgb, 99,102,241), 0.08)',
    },
    rankCell: {
      fontFamily: 'var(--fH)',
      fontWeight: 900,
      fontSize: 18,
      textAlign: 'center',
    },
    nameCell: {
      fontWeight: 700,
      display: 'flex',
      alignItems: 'center',
      gap: 8,
    },
    avatar: {
      width: 30,
      height: 30,
      borderRadius: '50%',
      background: 'var(--A)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      color: '#fff',
      fontWeight: 800,
      fontSize: 13,
      flexShrink: 0,
      overflow: 'hidden',
    },
    eloValue: {
      fontFamily: 'var(--fM)',
      fontWeight: 800,
      color: 'var(--A)',
    },
    challengeBtn: {
      padding: '5px 14px',
      background: 'var(--A)',
      color: '#fff',
      border: 'none',
      borderRadius: 6,
      fontFamily: 'var(--fB)',
      fontWeight: 700,
      fontSize: 12,
      cursor: 'pointer',
      letterSpacing: '0.04em',
      transition: 'opacity 0.15s',
      whiteSpace: 'nowrap',
    },
    challengeBtnDisabled: {
      padding: '5px 14px',
      background: 'var(--dim)',
      color: 'var(--muted)',
      border: 'none',
      borderRadius: 6,
      fontFamily: 'var(--fB)',
      fontWeight: 700,
      fontSize: 12,
      cursor: 'not-allowed',
      letterSpacing: '0.04em',
      whiteSpace: 'nowrap',
      opacity: 0.55,
    },
    emptyState: {
      textAlign: 'center',
      color: 'var(--muted)',
      padding: '32px 16px',
      fontFamily: 'var(--fM)',
      fontSize: 14,
    },
    matchList: {
      display: 'flex',
      flexDirection: 'column',
      gap: 8,
    },
    matchCard: {
      background: 'var(--s2)',
      border: '1px solid var(--bd)',
      borderRadius: 8,
      padding: '12px 16px',
      fontSize: 13,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 12,
      flexWrap: 'wrap',
      boxShadow: 'var(--sh2)',
    },
    matchResult: {
      fontWeight: 700,
      color: 'var(--txt)',
      flex: 1,
      minWidth: 0,
    },
    matchTopic: {
      color: 'var(--muted)',
      fontSize: 12,
      fontStyle: 'italic',
      maxWidth: 300,
      overflow: 'hidden',
      textOverflow: 'ellipsis',
      whiteSpace: 'nowrap',
    },
    matchTime: {
      color: 'var(--dim)',
      fontSize: 11,
      whiteSpace: 'nowrap',
    },
    badgeGrid: {
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
      gap: 14,
    },
    badgeCard: {
      background: 'var(--s2)',
      border: '1px solid var(--bd)',
      borderRadius: 10,
      padding: '16px',
      textAlign: 'center',
      boxShadow: 'var(--sh)',
    },
    badgeEmoji: {
      fontSize: 36,
      marginBottom: 8,
      display: 'block',
    },
    badgeName: {
      fontFamily: 'var(--fH)',
      fontWeight: 800,
      fontSize: 14,
      color: 'var(--txt)',
      marginBottom: 4,
    },
    badgeOwner: {
      fontSize: 12,
      color: 'var(--muted)',
    },
    initWrap: {
      maxWidth: 480,
      margin: '80px auto',
      padding: '40px 32px',
      background: 'var(--s2)',
      border: '1px solid var(--bd)',
      borderRadius: 14,
      textAlign: 'center',
      boxShadow: 'var(--sh)',
    },
    initTitle: {
      fontFamily: 'var(--fH)',
      fontWeight: 900,
      fontSize: 22,
      color: 'var(--txt)',
      marginBottom: 12,
    },
    initDesc: {
      color: 'var(--muted)',
      fontSize: 14,
      marginBottom: 28,
      lineHeight: 1.6,
    },
    initBtn: {
      padding: '12px 32px',
      background: 'var(--A)',
      color: '#fff',
      border: 'none',
      borderRadius: 8,
      fontFamily: 'var(--fH)',
      fontWeight: 800,
      fontSize: 15,
      cursor: 'pointer',
      letterSpacing: '0.06em',
      textTransform: 'uppercase',
      boxShadow: 'var(--sh)',
    },
    divider: {
      height: 1,
      background: 'var(--bd)',
      margin: '28px 0 0 0',
    },
    metaRow: {
      display: 'flex',
      gap: 24,
      flexWrap: 'wrap',
      marginBottom: 0,
      marginTop: 8,
    },
    metaItem: {
      fontSize: 13,
      color: 'var(--muted)',
    },
    metaValue: {
      fontWeight: 700,
      color: 'var(--txt)',
    },
  };

  // --- Render helpers ---

  function getParticipantName(id) {
    if (!tournament) return id;
    const p = tournament.participants.find(x => x.id === id);
    return p ? p.name : id;
  }

  function formatMatchResult(match) {
    const challenger = getParticipantName(match.challengerId);
    const defender = getParticipantName(match.defenderId);
    if (!match.winnerId) return `${challenger} vs ${defender}`;
    if (match.winnerId === match.challengerId)
      return `${challenger} def. ${defender}`;
    return `${defender} def. ${challenger}`;
  }

  function formatTime(ts) {
    const d = new Date(ts);
    return d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' }) +
      ' ' + d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
  }

  function getRankMedal(index) {
    if (index === 0) return '🥇';
    if (index === 1) return '🥈';
    if (index === 2) return '🥉';
    return String(index + 1);
  }

  function getAvatarContent(participant) {
    if (participant.avatar) {
      return (
        <img
          src={participant.avatar}
          alt={participant.name}
          style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }}
        />
      );
    }
    return participant.name?.[0]?.toUpperCase() ?? '?';
  }

  const podiumBadges = [
    { rank: 0, emoji: '🥇', name: 'Pioneer Champion' },
    { rank: 1, emoji: '🥈', name: 'Dialectix Strategist' },
    { rank: 2, emoji: '🥉', name: 'Arena Thinker' },
  ];

  // ── Computed bracket data ──────────────────────────────────────────────────
  const bracket = tournament?.bracket || null;
  const champion = bracket ? getBracketChampion(bracket) : null;

  // Group bracket matches by round for display
  const bracketRounds = bracket
    ? Array.from({ length: bracket.totalRounds }, (_, i) => {
        const r = i + 1;
        return {
          round: r,
          label: r === bracket.totalRounds ? '🏆 Finale' : r === bracket.totalRounds - 1 ? '⚔️ Demi-Finales' : r === 1 ? '1er Tour' : `Tour ${r}`,
          matches: bracket.matches.filter(m => m.round === r),
        };
      })
    : [];

  // --- No tournament ---

  if (!tournament) {
    return (
      <div style={styles.page}>
        <div style={styles.initWrap}>
          <div style={styles.initTitle}>🏆 Dialectix Alpha Tournament</div>
          {isAdmin() ? (
            <>
              <p style={styles.initDesc}>
                Aucun tournoi actif. Initialisez le tournoi pour lancer une compétition
                de 72 heures ouverte à 10 participants maximum.
              </p>
              <button style={styles.initBtn} onClick={handleInit}>
                Initialiser le tournoi
              </button>
            </>
          ) : (
            <>
              <p style={styles.initDesc}>
                Aucun tournoi en cours pour le moment.<br />
                L'administrateur lancera prochainement une compétition. Revenez bientôt !
              </p>
              <span style={{
                display: 'inline-block',
                padding: '8px 20px',
                background: 'var(--dim)',
                color: 'var(--muted)',
                borderRadius: 8,
                fontSize: 13,
                fontFamily: 'var(--fM)',
              }}>
                ⏳ En attente d'un tournoi
              </span>
            </>
          )}
        </div>
      </div>
    );
  }

  // --- Main render ---

  return (
    <div style={styles.page}>

      {/* ── HEADER ── */}
      <div style={styles.header}>
        <h1 style={styles.headerTitle}>{tournament.name}</h1>
        <div style={styles.statusBadge}>
          {tournament.status === 'ended' ? 'Terminé' : 'Actif'}
        </div>

        {tournament.status === 'active' && countdown && (
          <div style={styles.countdown}>
            Fin dans : {countdown}
          </div>
        )}
        {tournament.status === 'ended' && (
          <div style={styles.countdown}>Tournoi terminé</div>
        )}

        {tournament.status === 'active' && user && !isParticipant && spotsLeft > 0 && (
          <div>
            <button style={styles.joinBtn} onClick={handleJoin}>
              Rejoindre le tournoi
            </button>
            <div style={styles.spotsLabel}>
              {spotsLeft} place{spotsLeft > 1 ? 's' : ''} restante{spotsLeft > 1 ? 's' : ''}
            </div>
          </div>
        )}
        {tournament.status === 'active' && spotsLeft === 0 && !isParticipant && (
          <div style={styles.spotsLabel}>Tournoi complet</div>
        )}

        <div style={{ ...styles.metaRow, justifyContent: 'center', marginTop: 14 }}>
          <span style={styles.metaItem}>
            Participants : <span style={styles.metaValue}>{tournament.participants.length} / {TOURNAMENT_CONFIG.maxParticipants}</span>
          </span>
          <span style={styles.metaItem}>
            Parties jouées : <span style={styles.metaValue}>{tournament.matches.length}</span>
          </span>
          <span style={styles.metaItem}>
            Début : <span style={styles.metaValue}>{formatTime(tournament.startTime)}</span>
          </span>
        </div>

        {/* ── ADMIN CONTROLS ── */}
        {isAdmin() && (
          <div style={{ display: 'flex', gap: 10, justifyContent: 'center', marginTop: 16, flexWrap: 'wrap' }}>
            <span style={{
              fontSize: 11,
              background: 'rgba(0,0,0,0.35)',
              color: 'var(--Y)',
              borderRadius: 4,
              padding: '3px 10px',
              fontWeight: 700,
              letterSpacing: '0.08em',
              alignSelf: 'center',
            }}>
              🔐 ADMIN
            </span>
            {tournament.status === 'active' && (
              <button
                style={{
                  padding: '6px 18px',
                  background: 'var(--O)',
                  color: '#fff',
                  border: 'none',
                  borderRadius: 6,
                  fontFamily: 'var(--fB)',
                  fontWeight: 700,
                  fontSize: 12,
                  cursor: 'pointer',
                  letterSpacing: '0.04em',
                }}
                onClick={handleEndTournament}
              >
                Terminer le tournoi
              </button>
            )}
            <button
              style={{
                padding: '6px 18px',
                background: 'rgba(255,255,255,0.15)',
                color: '#fff',
                border: '1px solid rgba(255,255,255,0.3)',
                borderRadius: 6,
                fontFamily: 'var(--fB)',
                fontWeight: 700,
                fontSize: 12,
                cursor: 'pointer',
                letterSpacing: '0.04em',
              }}
              onClick={handleResetTournament}
            >
              Réinitialiser
            </button>
          </div>
        )}
      </div>

      {/* ── SUJET DE LA SEMAINE ── */}
      {tournament.weeklyTopic && (
        <div style={{ maxWidth: 860, margin: '20px auto 0', padding: '0 16px' }}>
          <div style={{
            background: 'linear-gradient(135deg,rgba(198,161,91,.09),rgba(44,74,110,.06))',
            border: '1px solid rgba(198,161,91,.35)',
            borderLeft: '4px solid var(--Y)',
            borderRadius: 10, padding: '14px 18px',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, justifyContent: 'space-between', flexWrap: 'wrap' }}>
              <div>
                <div style={{ fontFamily: 'var(--fM)', fontSize: '.55rem', color: 'var(--Y)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.1em', marginBottom: 5 }}>
                  📅 Sujet de la Semaine
                </div>
                {weeklyTopicEdit ? (
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                    <input
                      autoFocus
                      value={weeklyTopicDraft}
                      onChange={e => setWeeklyTopicDraft(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && handleSaveWeeklyTopic()}
                      style={{ fontFamily: 'var(--fC)', fontSize: '1rem', fontStyle: 'italic', background: 'transparent', border: '1px solid var(--Y)', borderRadius: 6, padding: '4px 10px', color: 'var(--txt)', minWidth: 280 }}
                    />
                    <button className="btn b-y b-sm" onClick={handleSaveWeeklyTopic}>✓</button>
                    <button className="btn b-ghost b-sm" onClick={() => setWeeklyTopicEdit(false)}>✗</button>
                  </div>
                ) : (
                  <div style={{ fontFamily: 'var(--fC)', fontSize: '1.05rem', fontStyle: 'italic', color: 'var(--txt)', lineHeight: 1.5 }}>
                    « {tournament.weeklyTopic} »
                  </div>
                )}
              </div>
              {isAdmin() && !weeklyTopicEdit && (
                <button className="btn b-ghost b-sm" onClick={() => { setWeeklyTopicEdit(true); setWeeklyTopicDraft(tournament.weeklyTopic); }}
                  style={{ fontSize: '.55rem' }}>✏️ Modifier</button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── TABS: Leaderboard / Bracket ── */}
      <div style={{ maxWidth: 860, margin: '18px auto 0', padding: '0 16px' }}>
        <div style={{ display: 'flex', gap: 0, borderBottom: '2px solid var(--bd)' }}>
          {[
            { id: 'leaderboard', label: '🏅 Classement' },
            { id: 'bracket', label: `🏆 Bracket${bracket ? '' : ' (non lancé)'}` },
          ].map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)} style={{
              padding: '9px 18px', border: 'none', borderBottom: `2.5px solid ${activeTab === tab.id ? 'var(--A)' : 'transparent'}`,
              background: 'none', cursor: 'pointer', fontFamily: 'var(--fB)', fontSize: '.72rem', fontWeight: 700,
              color: activeTab === tab.id ? 'var(--A)' : 'var(--muted)', marginBottom: -2,
            }}>
              {tab.label}
            </button>
          ))}
          {/* Admin: bouton lancer bracket */}
          {isAdmin() && tournament.status === 'active' && tournament.participants.length >= 4 && (
            <button className="btn b-a b-sm" onClick={handleLaunchBracket}
              style={{ marginLeft: 'auto', fontSize: '.6rem', alignSelf: 'center' }}>
              ⚡ Lancer le Bracket
            </button>
          )}
        </div>
      </div>

      {/* ── LEADERBOARD TAB ── */}
      {activeTab === 'leaderboard' && (
      <>
      <div style={styles.section}>
        <h2 style={styles.sectionTitle}>Classement</h2>
        {sortedParticipants.length === 0 ? (
          <div style={styles.emptyState}>
            Aucun participant pour l'instant.<br />
            Soyez le premier à rejoindre !
          </div>
        ) : (
          <div style={styles.tableWrap}>
            <table style={styles.table}>
              <thead>
                <tr>
                  <th style={{ ...styles.th, textAlign: 'center', width: 52 }}>Rang</th>
                  <th style={styles.th}>Pseudo</th>
                  <th style={{ ...styles.th, textAlign: 'center' }}>ELO</th>
                  <th style={{ ...styles.th, textAlign: 'center' }}>Parties</th>
                  <th style={{ ...styles.th, textAlign: 'center' }}>Victoires</th>
                  <th style={{ ...styles.th, textAlign: 'center' }}>Défaites</th>
                  {tournament.status === 'active' && user && isParticipant && (
                    <th style={{ ...styles.th, textAlign: 'center' }}>Action</th>
                  )}
                </tr>
              </thead>
              <tbody>
                {sortedParticipants.map((p, index) => {
                  const isMe = user && p.id === user.id;
                  const rowStyle = isMe
                    ? { ...styles.currentUserRow }
                    : {};
                  const eligible = user && !isMe && tournament.status === 'active' && isParticipant
                    ? canChallenge(user.id, p.id)
                    : false;
                  const cooldownMs = (!eligible && user && !isMe) ? getCooldownRemaining(user.id, p.id) : 0;
                  const cooldownMin = Math.ceil(cooldownMs / 60000);
                  const cooldownLabel = cooldownMs > 0
                    ? `Cooldown ${cooldownMin}min`
                    : 'Limite atteinte';

                  return (
                    <tr key={p.id} style={rowStyle}>
                      <td style={{ ...styles.td, ...styles.rankCell }}>
                        {getRankMedal(index)}
                      </td>
                      <td style={styles.td}>
                        <div style={styles.nameCell}>
                          <div style={styles.avatar}>
                            {getAvatarContent(p)}
                          </div>
                          <span>
                            {p.name}
                            {isMe && (
                              <span style={{
                                marginLeft: 6,
                                fontSize: 10,
                                background: 'var(--A)',
                                color: '#fff',
                                borderRadius: 4,
                                padding: '2px 6px',
                                fontWeight: 700,
                                letterSpacing: '0.06em',
                                verticalAlign: 'middle',
                              }}>
                                Vous
                              </span>
                            )}
                          </span>
                        </div>
                      </td>
                      <td style={{ ...styles.tdCenter, ...styles.eloValue }}>
                        {p.elo}
                      </td>
                      <td style={styles.tdCenter}>{p.battles}</td>
                      <td style={{ ...styles.tdCenter, color: 'var(--G)', fontWeight: 700 }}>
                        {p.wins}
                      </td>
                      <td style={{ ...styles.tdCenter, color: 'var(--O)', fontWeight: 700 }}>
                        {p.losses}
                      </td>
                      {tournament.status === 'active' && user && isParticipant && (
                        <td style={styles.tdCenter}>
                          {isMe ? (
                            <span style={{ color: 'var(--dim)', fontSize: 12 }}>—</span>
                          ) : (
                            <button
                              style={eligible ? styles.challengeBtn : styles.challengeBtnDisabled}
                              disabled={!eligible}
                              onClick={() => eligible && handleChallenge(p)}
                              title={!eligible ? cooldownLabel : `Défier ${p.name}`}
                            >
                              {!eligible && cooldownMs > 0 ? `⏳ ${cooldownMin}min` : 'Défier'}
                            </button>
                          )}
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── BATTLE HISTORY ── */}
      <div style={{ ...styles.section, marginTop: 28 }}>
        <h2 style={styles.sectionTitle}>Historique des batailles</h2>
        {tournament.matches.length === 0 ? (
          <div style={styles.emptyState}>Aucune bataille jouée pour l'instant.</div>
        ) : (
          <div style={styles.matchList}>
            {[...tournament.matches].reverse().map(match => (
              <div key={match.id} style={styles.matchCard}>
                <span style={styles.matchResult}>{formatMatchResult(match)}</span>
                <span style={styles.matchTopic} title={match.topic}>{match.topic}</span>
                <span style={styles.matchTime}>{formatTime(match.timestamp)}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── TOURNAMENT BADGES (shown when ended) ── */}
      {tournament.status === 'ended' && sortedParticipants.length > 0 && (
        <div style={{ ...styles.section, marginTop: 28 }}>
          <h2 style={styles.sectionTitle}>Badges attribués</h2>
          <div style={styles.badgeGrid}>
            {podiumBadges.map(({ rank, emoji, name }) => {
              const winner = sortedParticipants[rank];
              if (!winner) return null;
              return (
                <div key={rank} style={styles.badgeCard}>
                  <span style={styles.badgeEmoji}>{emoji}</span>
                  <div style={styles.badgeName}>{name}</div>
                  <div style={styles.badgeOwner}>Attribué à <strong>{winner.name}</strong></div>
                </div>
              );
            })}
          </div>
        </div>
      )}
      </> /* end activeTab === 'leaderboard' */
      )}

      {/* ══════════════════════════════════════════════════════════════════
          BRACKET TAB — Élimination directe
      ══════════════════════════════════════════════════════════════════ */}
      {activeTab === 'bracket' && (
        <div style={{ maxWidth: 860, margin: '20px auto 0', padding: '0 16px 40px' }}>
          {!bracket ? (
            <div style={{ ...styles.emptyState, padding: '48px 24px' }}>
              <div style={{ fontSize: '3rem', marginBottom: 12 }}>🏟</div>
              <div style={{ fontFamily: 'var(--fH)', fontSize: '.95rem', marginBottom: 8 }}>Bracket pas encore lancé</div>
              <div style={{ fontFamily: 'var(--fM)', fontSize: '.65rem', color: 'var(--muted)', lineHeight: 1.6 }}>
                L'administrateur lancera le bracket d'élimination directe<br />
                une fois les inscriptions closes.
              </div>
              {isAdmin() && tournament.participants.length >= 4 && (
                <button className="btn b-a b-lg" onClick={handleLaunchBracket} style={{ marginTop: 20 }}>
                  ⚡ Lancer le Bracket ({tournament.participants.length} joueurs)
                </button>
              )}
            </div>
          ) : (
            <>
              {champion && (
                <div style={{
                  background: 'linear-gradient(135deg,rgba(198,161,91,.15),rgba(58,110,82,.1))',
                  border: '1.5px solid rgba(198,161,91,.5)', borderRadius: 12, padding: '20px 24px',
                  textAlign: 'center', marginBottom: 24,
                }}>
                  <div style={{ fontSize: '2.5rem', marginBottom: 6 }}>🥇</div>
                  <div style={{ fontFamily: 'var(--fH)', fontSize: '1.2rem', color: 'var(--Y)', letterSpacing: '.08em' }}>
                    CHAMPION : {champion.name}
                  </div>
                  <div style={{ fontFamily: 'var(--fM)', fontSize: '.6rem', color: 'var(--muted)', marginTop: 4 }}>
                    +{computeReward(bracket.totalRounds, bracket.totalRounds).elo} ELO · +{computeReward(bracket.totalRounds, bracket.totalRounds).xp} XP
                  </div>
                </div>
              )}

              {/* Rounds display — scrollable horizontally on mobile */}
              <div style={{ overflowX: 'auto', paddingBottom: 12 }}>
                <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start', minWidth: bracketRounds.length * 200 }}>
                  {bracketRounds.map(({ round, label, matches: rMatches }) => (
                    <div key={round} style={{ flex: '0 0 188px' }}>
                      <div style={{
                        fontFamily: 'var(--fH)', fontSize: '.72rem', textAlign: 'center',
                        letterSpacing: '.08em', color: 'var(--A)', marginBottom: 10,
                        paddingBottom: 6, borderBottom: '1px solid var(--bd)',
                      }}>{label}</div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                        {rMatches.map(match => {
                          const modeInfo = CONSTRAINT_MODES.find(m => m.id === match.constraintMode) || CONSTRAINT_MODES[0];
                          const isBye1 = match.player1?.isBye;
                          const isBye2 = match.player2?.isBye;
                          return (
                            <div key={match.id} style={{
                              background: match.played ? 'rgba(58,110,82,.06)' : 'var(--s2)',
                              border: `1px solid ${match.played ? 'rgba(58,110,82,.3)' : 'var(--bd)'}`,
                              borderRadius: 8, padding: '10px 12px',
                              boxShadow: 'var(--sh2)',
                            }}>
                              {/* Mode badge */}
                              <div style={{
                                display: 'inline-flex', alignItems: 'center', gap: 4,
                                background: `${modeInfo.color}15`, border: `1px solid ${modeInfo.color}44`,
                                borderRadius: 20, padding: '2px 8px', marginBottom: 8,
                                fontFamily: 'var(--fM)', fontSize: '.48rem', color: modeInfo.color,
                              }}>
                                {modeInfo.icon} {modeInfo.label}
                              </div>

                              {/* Player slots */}
                              {[match.player1, match.player2].map((player, pi) => (
                                <div key={pi} style={{
                                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                  padding: '5px 6px', borderRadius: 5, marginBottom: pi === 0 ? 4 : 0,
                                  background: match.winner?.id === player?.id ? 'rgba(58,110,82,.12)' : 'transparent',
                                  border: match.winner?.id === player?.id ? '1px solid rgba(58,110,82,.3)' : '1px solid transparent',
                                }}>
                                  <span style={{
                                    fontFamily: 'var(--fB)', fontSize: '.62rem', fontWeight: 600,
                                    color: player?.isBye ? 'var(--muted)' : match.winner?.id === player?.id ? 'var(--G)' : 'var(--txt)',
                                    fontStyle: player?.isBye ? 'italic' : 'normal',
                                  }}>
                                    {player ? player.name : '—'}
                                  </span>
                                  {match.winner?.id === player?.id && (
                                    <span style={{ fontSize: '.7rem' }}>✅</span>
                                  )}
                                </div>
                              ))}

                              {/* Admin: declare winner buttons if match not played */}
                              {isAdmin() && !match.played && match.player1 && match.player2 && !match.player1.isBye && !match.player2.isBye && (
                                <div style={{ display: 'flex', gap: 4, marginTop: 8 }}>
                                  <button className="btn b-g b-sm" onClick={() => handleBracketWinner(match.id, match.player1)}
                                    style={{ flex: 1, justifyContent: 'center', fontSize: '.50rem' }}>
                                    {match.player1.name?.split(' ')[0]} gagne
                                  </button>
                                  <button className="btn b-g b-sm" onClick={() => handleBracketWinner(match.id, match.player2)}
                                    style={{ flex: 1, justifyContent: 'center', fontSize: '.50rem' }}>
                                    {match.player2.name?.split(' ')[0]} gagne
                                  </button>
                                </div>
                              )}
                              {/* Auto-advance BYE */}
                              {isAdmin() && !match.played && (isBye1 || isBye2) && (match.player1 || match.player2) && (
                                <button className="btn b-ghost b-sm" onClick={() => {
                                  const winner = isBye1 ? match.player2 : match.player1;
                                  if (winner) handleBracketWinner(match.id, winner);
                                }} style={{ width: '100%', justifyContent: 'center', fontSize: '.50rem', marginTop: 6 }}>
                                  BYE → avancer
                                </button>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════
          MODAL — Choix du Mode de Contrainte avant défi
      ══════════════════════════════════════════════════════════════════ */}
      {pendingChallenge && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.55)', backdropFilter: 'blur(4px)', zIndex: 900, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
          <div style={{ background: '#FDFAF4', borderRadius: 14, padding: '28px 24px', maxWidth: 480, width: '100%', boxShadow: '0 24px 60px rgba(0,0,0,.3)' }}>
            <div style={{ fontFamily: 'var(--fH)', fontSize: '1rem', letterSpacing: '.08em', marginBottom: 4 }}>
              ⚔️ Défier {pendingChallenge.name}
            </div>
            <div style={{ fontFamily: 'var(--fM)', fontSize: '.62rem', color: 'var(--muted)', marginBottom: 18 }}>
              Choisissez votre arme rhétorique — ce mode changera les critères de notation de l'IA.
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 20 }}>
              {CONSTRAINT_MODES.map(mode => (
                <button key={mode.id} onClick={() => setSelectedMode(mode.id)} style={{
                  display: 'flex', alignItems: 'flex-start', gap: 12, padding: '12px 14px',
                  border: `2px solid ${selectedMode === mode.id ? mode.color : 'var(--bd)'}`,
                  borderRadius: 9, cursor: 'pointer', textAlign: 'left',
                  background: selectedMode === mode.id ? `${mode.color}0e` : '#FDFAF4',
                  transition: 'all .12s',
                }}>
                  <span style={{ fontSize: '1.3rem', flexShrink: 0, marginTop: 1 }}>{mode.icon}</span>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontFamily: 'var(--fB)', fontSize: '.75rem', fontWeight: 700, color: selectedMode === mode.id ? mode.color : 'var(--txt)', marginBottom: 2 }}>
                      {mode.label}
                    </div>
                    <div style={{ fontFamily: 'var(--fM)', fontSize: '.58rem', color: 'var(--muted)', lineHeight: 1.5 }}>{mode.desc}</div>
                    <div style={{ fontFamily: 'var(--fM)', fontSize: '.54rem', color: mode.color, marginTop: 3, fontStyle: 'italic' }}>Notation : {mode.scoring}</div>
                  </div>
                </button>
              ))}
            </div>

            <div style={{ display: 'flex', gap: 8 }}>
              <button className="btn b-a b-lg" onClick={handleConfirmChallenge} style={{ flex: 1, justifyContent: 'center' }}>
                ⚔️ Lancer le défi
              </button>
              <button className="btn b-ghost" onClick={() => setPendingChallenge(null)} style={{ flex: 1, justifyContent: 'center' }}>
                Annuler
              </button>
            </div>
          </div>
        </div>
      )}

      <div style={{ height: 40 }} />
    </div>
  );
}
