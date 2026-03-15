import { useState, useEffect, useCallback } from 'react';

/* ── Admin system ──────────────────────────────────────────────────────
 * isAdmin()        — returns true if localStorage['dx_admin'] === 'true'
 * enableAdminMode() — run in browser console: enableAdminMode()
 *
 * Usage (browser console):
 *   localStorage.setItem('dx_admin', 'true'); location.reload();
 * ─────────────────────────────────────────────────────────────────── */
export function isAdmin() {
  try { return localStorage.getItem('dx_admin') === 'true'; }
  catch { return false; }
}

/** Run in the browser console to gain admin access. */
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

function createTournament() {
  const now = Date.now();
  const state = {
    id: TOURNAMENT_CONFIG.id,
    name: TOURNAMENT_CONFIG.name,
    startTime: now,
    endTime: now + TOURNAMENT_CONFIG.durationMs,
    participants: [],
    matches: [],
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

export default function TournamentSystem({ user, setPage, showToast, onChallenge }) {
  const [tournament, setTournament] = useState(() => loadTournament());
  const [countdown, setCountdown] = useState('');
  const [now, setNow] = useState(Date.now());

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
    onChallenge && onChallenge(participant);
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

      {/* ── LEADERBOARD ── */}
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
          <div style={styles.emptyState}>
            Aucune bataille jouée pour l'instant.
          </div>
        ) : (
          <div style={styles.matchList}>
            {[...tournament.matches].reverse().map(match => (
              <div key={match.id} style={styles.matchCard}>
                <span style={styles.matchResult}>
                  {formatMatchResult(match)}
                </span>
                <span style={styles.matchTopic} title={match.topic}>
                  {match.topic}
                </span>
                <span style={styles.matchTime}>
                  {formatTime(match.timestamp)}
                </span>
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
                  <div style={styles.badgeOwner}>
                    Attribué à <strong>{winner.name}</strong>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div style={{ height: 40 }} />
    </div>
  );
}
