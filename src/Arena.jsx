/**
 * @file Arena.jsx
 * @description Dialectix Arena — competitive team tournament mode.
 *
 * ✅  Fully modular: does NOT touch DebateArena, scoring pipeline, or ELO math.
 * ✅  Receives all state via props — zero internal Supabase/localStorage coupling.
 * ✅  Falls back gracefully when user is not logged in.
 *
 * State machine:  idle → queued → team_assigned → results
 *
 * @param {Object}   props
 * @param {Object|null}  props.user        - Current logged-in user (or null)
 * @param {Function}     props.saveUser    - Persists user to localStorage + Supabase
 * @param {Function}     props.showToast   - Show global toast notification
 * @param {Function}     props.setPage     - Navigate to another page key
 * @param {Array}        props.leaderboard - Platform leaderboard (for queue display)
 * @param {Object}       props.supabase    - Supabase client (for future server sync)
 */
import { useState, useEffect, useCallback } from 'react';
import {
  getTier,
  getWeeklyTopic,
  balanceTeams,
  teamTotalElo,
  generatePairings,
  simulateBotMatch,
  computeMVP,
  applyArenaResult,
  fillWithBots,
  enrichLeaderboard,
  ARENA_ELO_DELTA,
} from './arenaUtils.js';

// ─── DEV MODE ────────────────────────────────────────────────────────────────
// Set to false before shipping to production to hide all test tools from users.
// Can also be driven by env: import.meta.env.VITE_DEV_MODE === 'true'

const DEV_MODE = import.meta.env.DEV ?? false;

// ─── TEST PLAYER GENERATOR ───────────────────────────────────────────────────

/**
 * Pool of realistic full names — French, European, Mediterranean, Maghreb.
 * Deliberately diverse so test data feels authentic.
 * Never use "TestUser", "PlayerBot", or numbered names.
 */
const TEST_PLAYER_POOL = [
  'Lucas Moreau',    'Sarah Benali',    'Thomas Garcia',   'Nina Haddad',
  'Maxime Laurent',  'Yanis Ferreira',  'Emma Roussel',    'Karim Bensaid',
  'Julien Petit',    'Sofia Mendes',    'Mehdi Rachedi',   'Camille Dubois',
  'Amine Hadj',      'Léa Martin',      'Nadia Bouazza',   'Antoine Bernard',
  'Sonia Meziane',   'Hugo Simon',      'Farid Lahlou',    'Marie Lefevre',
  'Yasmine Khelif',  'Marco Ricci',     'Elena Vasquez',   'Nikos Petridis',
  'Fatima Oukili',   'Rafael Molina',   'Jana Kovac',      'Lena Schmidt',
  'Pieter Vandenberg','Mia Bergstrom',  'Andrei Popescu',  'Inès Daoudi',
  'Baptiste Renard', 'Amira Tahir',     'Victor Leclercq', 'Rania Chafik',
];

/**
 * Argument style metadata — purely cosmetic.
 * Does NOT affect scoring, ELO, or any calculation.
 * Prepared for future AI personality simulation.
 *
 * Personality bias hints are stored as metadata only:
 *   – logical    → tends toward structured reasoning
 *   – aggressive → tends toward direct rebuttal pressure
 *   – emotional  → tends toward appeal-based framing
 *   – academic   → tends toward evidence-heavy arguments
 *   – provocative → tends toward challenging premises
 */
const ARGUMENT_STYLES = [
  { id: 'logical',     label: 'Logique',      emoji: '🧠', hint: 'structured_reasoning' },
  { id: 'aggressive',  label: 'Agressif',     emoji: '⚡', hint: 'rebuttal_pressure'    },
  { id: 'emotional',   label: 'Émotionnel',   emoji: '💬', hint: 'appeal_framing'       },
  { id: 'academic',    label: 'Académique',   emoji: '📚', hint: 'evidence_heavy'       },
  { id: 'provocative', label: 'Provocateur',  emoji: '🔥', hint: 'premise_challenge'    },
];

/**
 * generateTestPlayers(count)
 *
 * Generates an array of realistic-looking fictional players for local testing.
 *
 * SAFETY GUARANTEES:
 *   – isTest: true     → flagged so no Supabase write is ever triggered
 *   – isBot: false     → rendered as human players in the UI
 *   – IDs use "test_"  → prefix makes accidental DB writes trivially detectable
 *   – No side effects  → pure function, no state / no network calls
 *
 * @param {number} count - Number of test players to generate (3–6 recommended)
 * @returns {Array<Object>} Array of test player objects
 */
function generateTestPlayers(count = 5) {
  const rndInt  = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
  const sides   = ['pro', 'contra'];

  // Shuffle the name pool and take `count` unique names
  const names = [...TEST_PLAYER_POOL]
    .sort(() => Math.random() - 0.5)
    .slice(0, count);

  return names.map((name, i) => {
    const style   = ARGUMENT_STYLES[Math.floor(Math.random() * ARGUMENT_STYLES.length)];
    const elo     = rndInt(850, 1450);
    const debates = rndInt(5, 40);
    const winRate = rndInt(35, 72);
    const side    = sides[i % 2]; // alternate pro/contra for rough balance

    return {
      // Identity
      id:            `test_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      name,
      avatar:         style.emoji,   // style emoji as avatar — looks authentic
      isBot:          false,          // shown as human in all existing UI
      isTest:         true,           // sentinel flag — never written to Supabase

      // Stats (realistic range)
      elo,
      debates,
      winRate,
      side,

      // Personality metadata (no scoring impact — metadata only)
      argumentStyle:      style.id,
      argumentStyleLabel: style.label,
      argumentStyleHint:  style.hint,
    };
  });
}

// ─── SMALL DISPLAY COMPONENTS ────────────────────────────────────────────────

/**
 * Renders a coloured tier pill badge.
 * @param {{ elo: number }} props
 */
function TierPill({ elo }) {
  const t = getTier(elo);
  return (
    <span style={{
      fontFamily:    'var(--fM)',
      fontSize:      '.5rem',
      letterSpacing: '.1em',
      textTransform: 'uppercase',
      background:    `${t.color}18`,
      color:         t.color,
      border:        `1px solid ${t.color}55`,
      borderRadius:  20,
      padding:       '2px 8px',
      display:       'inline-flex',
      alignItems:    'center',
      gap:           4,
    }}>
      {t.icon} {t.label}
    </span>
  );
}

/**
 * Queue player card — compact horizontal pill.
 * Test players show a subtle ⚙️ marker in dev mode.
 * @param {{ player: Object, userId: string|undefined }} props
 */
function QueuePlayer({ player, userId }) {
  const isMe = player.id === userId;
  return (
    <div style={{
      display:     'flex',
      alignItems:  'center',
      gap:         6,
      background:  isMe ? 'rgba(44,74,110,.12)' : player.isTest ? 'rgba(90,60,140,.06)' : 'var(--s2)',
      border:      isMe ? '1px solid var(--A)' : player.isTest ? '1px dashed rgba(90,60,140,.3)' : '1px solid var(--bd)',
      borderRadius: 20,
      padding:     '4px 10px',
    }}>
      <span style={{ fontSize: '.75rem' }}>{player.avatar || (player.isBot ? '🤖' : '👤')}</span>
      <span style={{ fontFamily: 'var(--fM)', fontSize: '.58rem', fontWeight: isMe ? 600 : 400 }}>
        {player.name.split(' ')[0]}
        {isMe ? ' (vous)' : player.isBot ? ' 🤖' : player.isTest ? ' ⚙️' : ''}
      </span>
      <span style={{ fontFamily: 'var(--fM)', fontSize: '.5rem', color: 'var(--Y)' }}>{player.elo}</span>
    </div>
  );
}

/**
 * Team column card — lists players with ELO and tier icon.
 * Test players show a subtle ⚙️ suffix in dev mode.
 * @param {{ team: Array, label: string, color: string, userId: string|undefined }} props
 */
function TeamCard({ team, label, color, userId }) {
  const totalElo = teamTotalElo(team);
  return (
    <div className="card" style={{ borderTop: `3px solid ${color}` }}>
      <div style={{ fontFamily: 'var(--fH)', fontSize: '.72rem', letterSpacing: '.1em', color, marginBottom: 4 }}>
        {label}
      </div>
      <div style={{ fontFamily: 'var(--fM)', fontSize: '.52rem', color: 'var(--muted)', marginBottom: 10 }}>
        ELO total : <strong style={{ color: 'var(--txt)' }}>{totalElo}</strong>
      </div>
      {team.map(p => {
        const tier = getTier(p.elo);
        const isMe = p.id === userId;
        return (
          <div key={p.id} style={{
            display:      'flex',
            alignItems:   'center',
            gap:          6,
            padding:      '5px 0',
            borderBottom: '1px solid var(--bd)',
            background:   isMe ? 'rgba(44,74,110,.05)' : 'transparent',
            borderRadius: isMe ? 4 : 0,
          }}>
            <span style={{ fontSize: '.8rem' }}>{p.avatar || (p.isBot ? '🤖' : '👤')}</span>
            <span style={{
              fontFamily: 'var(--fM)',
              fontSize:   '.6rem',
              flex:       1,
              fontWeight: isMe ? 700 : 400,
              color:      isMe ? color : 'var(--txt)',
            }}>
              {p.name.split(' ')[0]}
              {isMe ? ' ★' : p.isTest ? ' ⚙️' : ''}
            </span>
            <span style={{ fontFamily: 'var(--fM)', fontSize: '.5rem', color: 'var(--Y)' }}>{p.elo}</span>
            <span title={tier.label} style={{ fontSize: '.65rem' }}>{tier.icon}</span>
          </div>
        );
      })}
    </div>
  );
}

/**
 * Single match row — shows players, scores (if done), winner highlight.
 * @param {{ match: Object, index: number, userId: string|undefined }} props
 */
function MatchRow({ match, index, userId }) {
  const { playerA, playerB, score1, score2, winnerId, status } = match;
  const done = status === 'done';
  const aWon = done && winnerId === playerA.id;
  const bWon = done && winnerId === playerB.id;
  const draw = done && !winnerId;
  const isMeA = playerA.id === userId;
  const isMeB = playerB.id === userId;

  return (
    <div style={{
      display:      'flex',
      alignItems:   'center',
      gap:          8,
      padding:      '9px 0',
      borderBottom: '1px solid var(--bd)',
    }}>
      {/* Index */}
      <span style={{ fontFamily: 'var(--fM)', fontSize: '.5rem', color: 'var(--muted)', width: 22, textAlign: 'center' }}>
        M{index + 1}
      </span>

      {/* Player A */}
      <span style={{
        fontFamily: 'var(--fM)',
        fontSize:   '.62rem',
        flex:       1,
        fontWeight: aWon ? 700 : 400,
        color:      aWon ? 'var(--G)' : draw ? 'var(--muted)' : isMeA && done ? 'var(--B)' : isMeA ? 'var(--A)' : 'var(--txt)',
      }}>
        {playerA.name.split(' ')[0]}
        {isMeA ? ' (vous)' : playerA.isBot ? ' 🤖' : ''}
      </span>

      {/* Score or pending */}
      <span style={{ fontFamily: 'var(--fM)', fontSize: '.62rem', color: done ? 'var(--Y)' : 'var(--muted)', minWidth: 52, textAlign: 'center' }}>
        {done ? `${score1} – ${score2}` : '· · ·'}
      </span>

      {/* Player B */}
      <span style={{
        fontFamily: 'var(--fM)',
        fontSize:   '.62rem',
        flex:       1,
        textAlign:  'right',
        fontWeight: bWon ? 700 : 400,
        color:      bWon ? 'var(--G)' : draw ? 'var(--muted)' : isMeB && done ? 'var(--B)' : isMeB ? 'var(--A)' : 'var(--txt)',
      }}>
        {playerB.name.split(' ')[0]}
        {isMeB ? ' (vous)' : playerB.isBot ? ' 🤖' : ''}
      </span>

      {/* Result badge */}
      <span style={{
        fontFamily:  'var(--fM)',
        fontSize:    '.48rem',
        textTransform:'uppercase',
        letterSpacing:'.08em',
        color:       done ? (draw ? 'var(--muted)' : 'var(--G)') : 'var(--muted)',
        width:       28,
        textAlign:   'right',
      }}>
        {done ? (draw ? '~' : '✓') : '–'}
      </span>
    </div>
  );
}

// ─── ARENA LEADERBOARD ────────────────────────────────────────────────────────

/**
 * Leaderboard tab inside Arena — extends the global leaderboard with tier.
 * @param {{ leaderboard: Array, userId: string|undefined }} props
 */
function ArenaLeaderboard({ leaderboard, userId }) {
  const enriched = enrichLeaderboard(leaderboard).sort((a, b) => b.elo - a.elo);
  return (
    <div>
      <div style={{
        display:    'grid',
        gridTemplateColumns: '28px 1fr 56px 52px 52px 64px',
        gap:        6,
        fontFamily: 'var(--fM)',
        fontSize:   '.52rem',
        color:      'var(--muted)',
        textTransform:'uppercase',
        letterSpacing:'.08em',
        padding:    '4px 0 8px',
        borderBottom:'1px solid var(--bd)',
        marginBottom:4,
      }}>
        <div>#</div><div>Joueur</div><div style={{textAlign:'center'}}>ELO</div>
        <div style={{textAlign:'center'}}>Débats</div>
        <div style={{textAlign:'center'}}>Taux</div>
        <div style={{textAlign:'center'}}>Tier</div>
      </div>
      {enriched.map((p, i) => {
        const isMe = p.id === userId;
        return (
          <div key={p.id} style={{
            display:    'grid',
            gridTemplateColumns: '28px 1fr 56px 52px 52px 64px',
            gap:        6,
            alignItems: 'center',
            padding:    '7px 0',
            borderBottom:'1px solid var(--bd)',
            background: isMe ? 'rgba(44,74,110,.06)' : 'transparent',
            borderRadius: isMe ? 5 : 0,
          }}>
            <div style={{
              fontFamily: 'var(--fH)',
              fontSize:   '.7rem',
              color:      i === 0 ? 'var(--Y)' : i === 1 ? '#C0C0C0' : i === 2 ? '#CD7F32' : 'var(--muted)',
              fontWeight: i < 3 ? 700 : 400,
            }}>
              {i + 1}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <div style={{ fontSize: '.72rem' }}>{p.avatar || '👤'}</div>
              <div>
                <div style={{ fontFamily: 'var(--fM)', fontSize: '.62rem', fontWeight: isMe ? 700 : 400 }}>
                  {p.name}{isMe && <span style={{ color: 'var(--A)', fontSize: '.5rem', marginLeft: 4 }}>(vous)</span>}
                </div>
              </div>
            </div>
            <div style={{ fontFamily: 'var(--fH)', fontSize: '.82rem', color: 'var(--Y)', textAlign: 'center' }}>{p.elo}</div>
            <div style={{ fontFamily: 'var(--fM)', fontSize: '.6rem', color: 'var(--muted)', textAlign: 'center' }}>{p.debates || 0}</div>
            <div style={{ fontFamily: 'var(--fM)', fontSize: '.6rem', color: 'var(--G)', textAlign: 'center' }}>{p.winRate}%</div>
            <div style={{ textAlign: 'center' }}><TierPill elo={p.elo} /></div>
          </div>
        );
      })}
    </div>
  );
}

// ─── MAIN ARENA PAGE ─────────────────────────────────────────────────────────

/** Number of players needed before auto-starting */
const MIN_PLAYERS  = 4;
/** Target team size (filled with bots if fewer real players) */
const TARGET_QUEUE = 8;

export default function ArenaPage({ user, saveUser, showToast, setPage, leaderboard = [], supabase }) {
  // Arena state machine
  const [arenaPhase,  setArenaPhase]  = useState('idle');  // idle|queued|team_assigned|results
  const [selectedSide, setSelectedSide] = useState(null);   // 'pro' | 'contra'
  const [queue,       setQueue]       = useState([]);
  const [teams,       setTeams]       = useState({ teamA: [], teamB: [] });
  const [matches,     setMatches]     = useState([]);
  const [mvp,         setMvp]         = useState(null);
  const [tab,         setTab]         = useState('arena');  // 'arena' | 'leaderboard'

  // Stable tournament ID for the current session
  const [tournamentId]  = useState(() => `ARENA-${Date.now()}`);
  const weeklyTopic     = getWeeklyTopic();
  const STORAGE_KEY     = `dix_arena_v1_${weeklyTopic.slice(0, 20)}`;

  // ── Dev tool visibility ──────────────────────────────────────────────────
  // Visible when running in dev mode OR when a user is logged in.
  // Test players are NEVER written to Supabase — only local state + localStorage.
  const showDevTools = DEV_MODE || !!user;

  // ── Persist / restore arena state across page navigations ──
  const persistState = useCallback((patch) => {
    try {
      const current = {
        topic: weeklyTopic, arenaPhase, queue, teams, matches, mvp, ...patch,
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(current));
    } catch { /* storage may be full — ignore */ }
  }, [STORAGE_KEY, weeklyTopic, arenaPhase, queue, teams, matches, mvp]);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const s = JSON.parse(saved);
        if (s.topic === weeklyTopic) {
          setArenaPhase(s.arenaPhase || 'idle');
          setQueue(s.queue  || []);
          setTeams(s.teams  || { teamA: [], teamB: [] });
          setMatches(s.matches || []);
          setMvp(s.mvp  || null);
        }
      }
    } catch { /* corrupt storage — start fresh */ }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── JOIN QUEUE ────────────────────────────────────────────────────────────
  const handleJoinQueue = (side) => {
    if (!user) {
      showToast('Connexion requise pour l\'Arena ⚔️', 'error');
      setPage('profile');
      return;
    }

    const playerEntry = {
      id:     user.id,
      name:   user.name,
      elo:    user.elo  || 1000,
      avatar: user.avatar,
      side,
      isBot:  false,
    };

    // Remove previous entry for this user (re-join with new side)
    const newQueue = [...queue.filter(p => p.id !== user.id), playerEntry];
    setSelectedSide(side);
    setQueue(newQueue);
    setArenaPhase('queued');

    showToast(`⏳ En attente d'adversaires (${newQueue.length}/${MIN_PLAYERS})…`, 'info');

    const patch = { arenaPhase: 'queued', queue: newQueue };
    persistState(patch);

    // Auto-fill queue with bots after short delay (demo / offline mode)
    // Real-time Supabase queue can replace this block in production.
    const delay = newQueue.length >= MIN_PLAYERS ? 600 : 1800;
    setTimeout(() => {
      const filled = fillWithBots(newQueue, TARGET_QUEUE);
      const { teamA, teamB } = balanceTeams(filled);
      const newMatches = generatePairings(teamA, teamB, tournamentId);

      setQueue(filled);
      setTeams({ teamA, teamB });
      setMatches(newMatches);
      setArenaPhase('team_assigned');

      const teamPatch = {
        arenaPhase: 'team_assigned',
        queue: filled,
        teams: { teamA, teamB },
        matches: newMatches,
      };
      persistState(teamPatch);

      const myTeamLabel = teamA.find(p => p.id === user.id) ? 'Équipe A (Pro)' : 'Équipe B (Contra)';
      showToast(`🎯 Équipes formées ! Vous êtes dans ${myTeamLabel}`, 'success');
    }, delay);
  };

  // ── RUN TOURNAMENT ────────────────────────────────────────────────────────
  const handleRunTournament = () => {
    // Resolve every match — bots are simulated; user match uses fixed outcome
    const results = matches.map(m => {
      const involvesUser = m.playerA.id === user?.id || m.playerB.id === user?.id;
      if (involvesUser && !m.playerA.isBot && !m.playerB.isBot) {
        // Full real match: for MVP, simulate with slight user advantage
        return simulateBotMatch({ ...m, playerA: { ...m.playerA, elo: (m.playerA.elo || 1000) + 50 } });
      }
      return simulateBotMatch(m);
    });

    const computed = computeMVP(results);
    setMatches(results);
    setMvp(computed);
    setArenaPhase('results');

    const patch = { arenaPhase: 'results', matches: results, mvp: computed };
    persistState(patch);

    // Update user stats if they participated
    if (user) {
      const userMatch = results.find(
        m => m.playerA.id === user.id || m.playerB.id === user.id
      );
      if (userMatch) {
        const isA    = userMatch.playerA.id === user.id;
        const myScore  = isA ? userMatch.score1 : userMatch.score2;
        const oppScore = isA ? userMatch.score2 : userMatch.score1;
        const result   = myScore > oppScore ? 'win' : myScore < oppScore ? 'loss' : 'draw';
        const statDiff = applyArenaResult(user, result);
        const isMVP    = computed?.id === user.id;
        const updUser  = {
          ...user,
          ...statDiff,
          mvp_count: (user.mvp_count || 0) + (isMVP ? 1 : 0),
        };
        saveUser(updUser);

        const resultMsg =
          result === 'win'  ? '🏆 Victoire en Arena ! +15 ELO' :
          result === 'loss' ? '📉 Défaite en Arena. -12 ELO' :
                              '🤝 Égalité. +3 ELO';
        showToast(resultMsg, result === 'win' ? 'success' : 'info');
      }

      if (computed) {
        setTimeout(() => {
          showToast(`🏅 MVP : ${computed.name} (${computed.avgScore}/10)`, 'achievement');
        }, 600);
      }
    }
  };

  // ── RESET ─────────────────────────────────────────────────────────────────
  const handleReset = () => {
    setArenaPhase('idle');
    setQueue([]);
    setTeams({ teamA: [], teamB: [] });
    setMatches([]);
    setMvp(null);
    setSelectedSide(null);
    try { localStorage.removeItem(STORAGE_KEY); } catch { /* ignore */ }
  };

  // ── ADD TEST PLAYERS ──────────────────────────────────────────────────────
  /**
   * Developer testing tool — generates 3–6 fictional players and immediately
   * forms balanced teams so the full tournament flow can be tested at once.
   *
   * SAFETY:
   *   – All generated players carry isTest:true
   *   – persistState() stores them in localStorage only (never Supabase)
   *   – saveUser() is never called for test players
   *   – This function does NOT modify any existing user state
   */
  const handleAddTestPlayers = () => {
    const count       = Math.floor(Math.random() * 4) + 3; // 3–6
    const testPlayers = generateTestPlayers(count);

    // Start from a clean non-test base (keep real user + existing bots if any)
    const realBase = queue.filter(p => !p.isTest);

    // Ensure the logged-in user is in the queue so teams include them
    let base = realBase;
    if (user && !base.find(p => p.id === user.id)) {
      base = [
        { id: user.id, name: user.name, elo: user.elo || 1000, avatar: user.avatar, side: 'pro', isBot: false },
        ...base,
      ];
      if (!selectedSide) setSelectedSide('pro');
    }

    const combined = [...base, ...testPlayers];

    // Fill remainder with bots to reach TARGET_QUEUE, then immediately form teams
    const filled     = fillWithBots(combined, TARGET_QUEUE);
    const { teamA, teamB } = balanceTeams(filled);
    const newMatches = generatePairings(teamA, teamB, tournamentId);

    setQueue(filled);
    setTeams({ teamA, teamB });
    setMatches(newMatches);
    setArenaPhase('team_assigned');

    const patch = { arenaPhase: 'team_assigned', queue: filled, teams: { teamA, teamB }, matches: newMatches };
    persistState(patch);

    console.log('[DEV] Test players added:', testPlayers.map(p => `${p.name} (${p.argumentStyle}, ELO ${p.elo})`));
    showToast(`⚙️ ${count} joueurs test ajoutés — équipes formées !`, 'info');
  };

  // ── CLEAR TEST PLAYERS ────────────────────────────────────────────────────
  /**
   * Removes all players flagged isTest:true from the queue.
   * If no real players remain, resets to idle.
   * Never touches Supabase or user stats.
   */
  const handleClearTestPlayers = () => {
    const hasTestPlayers = queue.some(p => p.isTest);
    if (!hasTestPlayers) {
      showToast('⚙️ Aucun joueur test dans la file', 'info');
      return;
    }

    const cleaned = queue.filter(p => !p.isTest);

    if (cleaned.length === 0) {
      // No real players left — back to idle
      setArenaPhase('idle');
      setQueue([]);
      setTeams({ teamA: [], teamB: [] });
      setMatches([]);
      persistState({ arenaPhase: 'idle', queue: [], teams: { teamA: [], teamB: [] }, matches: [] });
    } else {
      // Real players remain in queue — keep queued state
      setQueue(cleaned);
      setArenaPhase('queued');
      setTeams({ teamA: [], teamB: [] });
      setMatches([]);
      persistState({ arenaPhase: 'queued', queue: cleaned, teams: { teamA: [], teamB: [] }, matches: [] });
    }

    console.log('[DEV] Test players cleared');
    showToast('⚙️ Joueurs test supprimés', 'info');
  };

  // ── DERIVED VALUES ────────────────────────────────────────────────────────
  const myTeam      = teams.teamA.find(p => p.id === user?.id) ? 'A' : 'B';
  const teamAWins   = matches.filter(m => teams.teamA.some(p => p.id === m.winnerId)).length;
  const teamBWins   = matches.filter(m => teams.teamB.some(p => p.id === m.winnerId)).length;
  const overallWinner =
    arenaPhase === 'results'
      ? teamAWins > teamBWins ? 'A'
      : teamBWins > teamAWins ? 'B'
      : 'draw'
      : null;

  // Number of test players currently in queue (for button labels)
  const testPlayerCount = queue.filter(p => p.isTest).length;

  // ─── RENDER ──────────────────────────────────────────────────────────────
  return (
    <div className="page">

      {/* ── PAGE HEADER ── */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ fontFamily: 'var(--fH)', fontSize: '1.4rem', letterSpacing: '.12em', textTransform: 'uppercase' }}>
          ⚔️ Dialectix Arena
        </div>
        <div style={{ fontFamily: 'var(--fM)', fontSize: '.6rem', color: 'var(--muted)', marginTop: 4 }}>
          Mode compétitif par équipes · 4v4 minimum · 10v10 cible
        </div>
      </div>

      {/* ── TAB BAR ── */}
      <div className="rank-tabs" style={{ marginBottom: 16 }}>
        {[['arena', '⚔️ Tournoi'], ['leaderboard', '🏆 Classement']].map(([k, l]) => (
          <button
            key={k}
            className={`rank-tab ${tab === k ? 'on' : ''}`}
            onClick={() => setTab(k)}
          >{l}</button>
        ))}
      </div>

      {/* ════════════════ TAB: LEADERBOARD ════════════════ */}
      {tab === 'leaderboard' && (
        <div>
          <div style={{ fontFamily: 'var(--fH)', fontSize: '.9rem', letterSpacing: '.08em', marginBottom: 14 }}>
            🏆 Classement mondial avec tiers
          </div>
          {leaderboard.length > 0
            ? <ArenaLeaderboard leaderboard={leaderboard} userId={user?.id} />
            : <div style={{ fontFamily: 'var(--fM)', fontSize: '.62rem', color: 'var(--muted)', textAlign: 'center', padding: '24px 0' }}>
                Aucun joueur dans le classement pour l'instant.
              </div>
          }
        </div>
      )}

      {/* ════════════════ TAB: ARENA ════════════════ */}
      {tab === 'arena' && (
        <>
          {/* ── WEEKLY TOPIC ── */}
          <div className="card" style={{ marginBottom: 16, borderLeft: '3px solid var(--A)' }}>
            <div style={{ fontFamily: 'var(--fM)', fontSize: '.52rem', color: 'var(--A)', textTransform: 'uppercase', letterSpacing: '.12em', marginBottom: 6 }}>
              📅 Sujet de la semaine
            </div>
            <div style={{ fontFamily: 'var(--fH)', fontSize: '.98rem', letterSpacing: '.05em', lineHeight: 1.55, color: 'var(--txt)' }}>
              "{weeklyTopic}"
            </div>
            <div style={{ fontFamily: 'var(--fM)', fontSize: '.52rem', color: 'var(--muted)', marginTop: 8 }}>
              ELO en jeu : Victoire <span style={{ color: 'var(--G)' }}>+{ARENA_ELO_DELTA.win}</span> ·
              Défaite <span style={{ color: 'var(--B)' }}>{ARENA_ELO_DELTA.loss}</span> ·
              Égalité <span style={{ color: 'var(--Y)' }}>+{ARENA_ELO_DELTA.draw}</span>
            </div>
          </div>

          {/* ──────────────────── PHASE: IDLE ──────────────────── */}
          {arenaPhase === 'idle' && (
            <div className="card" style={{ marginBottom: 16 }}>
              <div style={{ fontFamily: 'var(--fH)', fontSize: '.9rem', letterSpacing: '.08em', marginBottom: 16 }}>
                Rejoindre la file d'attente
              </div>
              <div style={{ display: 'flex', gap: 12, marginBottom: 16 }}>
                {/* PRO */}
                <button
                  onClick={() => handleJoinQueue('pro')}
                  style={{
                    flex: 1, border: '1px solid var(--A)', borderRadius: 8, background: 'rgba(44,74,110,.08)',
                    color: 'var(--A)', fontFamily: 'var(--fH)', letterSpacing: '.08em',
                    padding: '16px 8px', cursor: 'pointer', transition: 'all .15s',
                  }}
                  onMouseEnter={e => e.target.style.background = 'rgba(44,74,110,.18)'}
                  onMouseLeave={e => e.target.style.background = 'rgba(44,74,110,.08)'}
                >
                  ✅ PRO
                  <div style={{ fontFamily: 'var(--fM)', fontSize: '.52rem', marginTop: 6, color: 'var(--muted)' }}>
                    Défendre le sujet
                  </div>
                </button>
                {/* CONTRA */}
                <button
                  onClick={() => handleJoinQueue('contra')}
                  style={{
                    flex: 1, border: '1px solid var(--B)', borderRadius: 8, background: 'rgba(140,58,48,.06)',
                    color: 'var(--B)', fontFamily: 'var(--fH)', letterSpacing: '.08em',
                    padding: '16px 8px', cursor: 'pointer', transition: 'all .15s',
                  }}
                  onMouseEnter={e => e.target.style.background = 'rgba(140,58,48,.14)'}
                  onMouseLeave={e => e.target.style.background = 'rgba(140,58,48,.06)'}
                >
                  ❌ CONTRA
                  <div style={{ fontFamily: 'var(--fM)', fontSize: '.52rem', marginTop: 6, color: 'var(--muted)' }}>
                    Contester le sujet
                  </div>
                </button>
              </div>

              {!user && (
                <div style={{
                  fontFamily: 'var(--fM)', fontSize: '.6rem', color: 'var(--muted)',
                  textAlign: 'center', padding: '10px 0',
                  background: 'var(--s2)', borderRadius: 6,
                }}>
                  ⚠️ <button
                    onClick={() => setPage('profile')}
                    style={{ background: 'none', border: 'none', color: 'var(--A)', cursor: 'pointer', fontFamily: 'var(--fM)', fontSize: '.6rem', padding: 0 }}
                  >Connexion requise</button> pour participer à l'Arena
                </div>
              )}

              {/* HOW IT WORKS */}
              <div style={{ marginTop: 16, padding: '10px 12px', background: 'var(--s2)', borderRadius: 7 }}>
                <div style={{ fontFamily: 'var(--fM)', fontSize: '.5rem', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '.1em', marginBottom: 8 }}>
                  Comment ça marche
                </div>
                {[
                  ['1', 'Choisissez votre position (Pro / Contra)'],
                  ['2', 'La file se remplit — minimum 4 joueurs (bots si nécessaire)'],
                  ['3', 'Les équipes sont équilibrées automatiquement par ELO'],
                  ['4', 'Pairages 1v1 générés — chaque match compte'],
                  ['5', 'Le MVP reçoit un badge spécial dans son profil'],
                ].map(([n, txt]) => (
                  <div key={n} style={{ display: 'flex', gap: 8, marginBottom: 5 }}>
                    <span style={{ fontFamily: 'var(--fH)', fontSize: '.6rem', color: 'var(--A)', width: 14, flexShrink: 0 }}>{n}.</span>
                    <span style={{ fontFamily: 'var(--fM)', fontSize: '.6rem', color: 'var(--txt)' }}>{txt}</span>
                  </div>
                ))}
              </div>

              {/* ── DEV TESTING PANEL (IDLE) ─────────────────────────────
                  Visible only when showDevTools is true (logged in or DEV_MODE).
                  Purely local — no Supabase, no user stat changes.
              ──────────────────────────────────────────────────────────── */}
              {showDevTools && (
                <div style={{
                  marginTop:    16,
                  padding:      '10px 12px',
                  background:   'rgba(90,60,140,.04)',
                  border:       '1px dashed rgba(90,60,140,.25)',
                  borderRadius:  7,
                }}>
                  {/* Header */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                    <span style={{ fontSize: '.7rem' }}>⚙️</span>
                    <span style={{
                      fontFamily:    'var(--fM)',
                      fontSize:      '.48rem',
                      color:         'rgba(90,60,140,.7)',
                      textTransform: 'uppercase',
                      letterSpacing: '.12em',
                    }}>
                      Outils de test développeur
                    </span>
                  </div>

                  {/* Description */}
                  <div style={{
                    fontFamily:   'var(--fM)',
                    fontSize:     '.54rem',
                    color:        'var(--muted)',
                    marginBottom: 10,
                    lineHeight:   1.6,
                  }}>
                    Génère des joueurs fictifs pour tester le flux de tournoi sans attendre.
                    <br/>
                    <span style={{ color: 'rgba(90,60,140,.6)' }}>
                      ⚙️ = joueur test · Local uniquement · Jamais envoyé à Supabase
                    </span>
                  </div>

                  {/* Buttons */}
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button
                      onClick={handleAddTestPlayers}
                      style={{
                        flex:          1,
                        fontFamily:    'var(--fM)',
                        fontSize:      '.56rem',
                        letterSpacing: '.04em',
                        padding:       '7px 12px',
                        borderRadius:   6,
                        border:        '1px solid rgba(90,60,140,.35)',
                        background:    'rgba(90,60,140,.08)',
                        color:         'rgba(90,60,140,.9)',
                        cursor:        'pointer',
                        transition:    'all .15s',
                      }}
                      onMouseEnter={e => e.currentTarget.style.background = 'rgba(90,60,140,.16)'}
                      onMouseLeave={e => e.currentTarget.style.background = 'rgba(90,60,140,.08)'}
                    >
                      ＋ Ajouter joueurs test
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ──────────────────── PHASE: QUEUED ──────────────────── */}
          {arenaPhase === 'queued' && (
            <div className="card" style={{ marginBottom: 16, textAlign: 'center' }}>
              <div style={{ fontSize: '2.2rem', marginBottom: 10, display: 'inline-block', animation: 'spin 2s linear infinite' }}>⚔️</div>
              <div style={{ fontFamily: 'var(--fH)', fontSize: '1rem', letterSpacing: '.1em', marginBottom: 6 }}>
                En file d'attente…
              </div>
              <div style={{ fontFamily: 'var(--fM)', fontSize: '.62rem', color: 'var(--muted)', marginBottom: 16 }}>
                {queue.length} / {MIN_PLAYERS} joueurs · Recherche d'adversaires
              </div>

              {/* Queue players */}
              <div style={{ display: 'flex', gap: 6, justifyContent: 'center', flexWrap: 'wrap', marginBottom: 20 }}>
                {queue.map(p => <QueuePlayer key={p.id} player={p} userId={user?.id} />)}
              </div>

              {selectedSide && (
                <div style={{ fontFamily: 'var(--fM)', fontSize: '.58rem', color: 'var(--muted)', marginBottom: 14 }}>
                  Votre position : <strong style={{ color: selectedSide === 'pro' ? 'var(--A)' : 'var(--B)' }}>
                    {selectedSide === 'pro' ? '✅ Pro' : '❌ Contra'}
                  </strong>
                </div>
              )}

              <div style={{ display: 'flex', gap: 8, justifyContent: 'center', flexWrap: 'wrap' }}>
                <button className="btn b-ghost b-sm" onClick={handleReset}>Annuler</button>

                {/* ── DEV: Add / Clear test players while in queue ── */}
                {showDevTools && (
                  <>
                    <button
                      onClick={handleAddTestPlayers}
                      style={{
                        fontFamily:    'var(--fM)',
                        fontSize:      '.52rem',
                        padding:       '5px 12px',
                        borderRadius:   5,
                        border:        '1px dashed rgba(90,60,140,.35)',
                        background:    'rgba(90,60,140,.06)',
                        color:         'rgba(90,60,140,.85)',
                        cursor:        'pointer',
                      }}
                    >
                      ⚙️ Ajouter joueurs test
                    </button>
                    {testPlayerCount > 0 && (
                      <button
                        onClick={handleClearTestPlayers}
                        style={{
                          fontFamily:    'var(--fM)',
                          fontSize:      '.52rem',
                          padding:       '5px 12px',
                          borderRadius:   5,
                          border:        '1px dashed rgba(140,60,60,.3)',
                          background:    'rgba(140,60,60,.05)',
                          color:         'rgba(140,60,60,.8)',
                          cursor:        'pointer',
                        }}
                      >
                        ✕ Effacer joueurs test ({testPlayerCount})
                      </button>
                    )}
                  </>
                )}
              </div>
            </div>
          )}

          {/* ──────────────────── PHASE: TEAM_ASSIGNED ──────────────────── */}
          {arenaPhase === 'team_assigned' && (
            <>
              {/* TEAM COLUMNS */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
                <TeamCard team={teams.teamA} label="Équipe A — Pro"   color="var(--A)" userId={user?.id} />
                <TeamCard team={teams.teamB} label="Équipe B — Contra" color="var(--B)" userId={user?.id} />
              </div>

              {/* ELO BALANCE INDICATOR */}
              <div className="card" style={{ marginBottom: 16 }}>
                <div style={{ fontFamily: 'var(--fM)', fontSize: '.52rem', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '.1em', marginBottom: 8 }}>
                  ⚖️ Équilibre des équipes (ELO total)
                </div>
                <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                  <div style={{ fontFamily: 'var(--fH)', fontSize: '.82rem', color: 'var(--A)', width: 52 }}>
                    {teamTotalElo(teams.teamA)}
                  </div>
                  <div style={{ flex: 1, height: 6, borderRadius: 3, background: 'var(--s3)', overflow: 'hidden' }}>
                    {(() => {
                      const tA = teamTotalElo(teams.teamA), tB = teamTotalElo(teams.teamB);
                      const total = tA + tB || 1;
                      return (
                        <div style={{
                          height: '100%',
                          width: `${(tA / total) * 100}%`,
                          background: 'linear-gradient(90deg, var(--A), var(--B))',
                          borderRadius: 3,
                        }} />
                      );
                    })()}
                  </div>
                  <div style={{ fontFamily: 'var(--fH)', fontSize: '.82rem', color: 'var(--B)', width: 52, textAlign: 'right' }}>
                    {teamTotalElo(teams.teamB)}
                  </div>
                </div>
              </div>

              {/* PAIRINGS */}
              <div className="card" style={{ marginBottom: 16 }}>
                <div style={{ fontFamily: 'var(--fH)', fontSize: '.85rem', letterSpacing: '.08em', marginBottom: 12 }}>
                  ⚔️ Pairages ({matches.length} match{matches.length > 1 ? 's' : ''})
                </div>
                {matches.map((m, i) => <MatchRow key={m.matchId} match={m} index={i} userId={user?.id} />)}
              </div>

              <button
                className="btn"
                style={{
                  width: '100%', padding: '14px 0', marginBottom: 10,
                  background: 'var(--A)', color: '#fff',
                  fontFamily: 'var(--fH)', letterSpacing: '.1em', fontSize: '.85rem',
                  border: 'none', borderRadius: 8, cursor: 'pointer',
                }}
                onClick={handleRunTournament}
              >
                🏁 Lancer le tournoi
              </button>

              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <button className="btn b-ghost b-sm" style={{ flex: 1 }} onClick={handleReset}>
                  ✕ Annuler
                </button>

                {/* ── DEV: Clear test players while teams are shown ── */}
                {showDevTools && testPlayerCount > 0 && (
                  <button
                    onClick={handleClearTestPlayers}
                    style={{
                      flex:          1,
                      fontFamily:    'var(--fM)',
                      fontSize:      '.52rem',
                      padding:       '5px 12px',
                      borderRadius:   5,
                      border:        '1px dashed rgba(140,60,60,.3)',
                      background:    'rgba(140,60,60,.05)',
                      color:         'rgba(140,60,60,.8)',
                      cursor:        'pointer',
                    }}
                  >
                    ⚙️ Effacer joueurs test ({testPlayerCount})
                  </button>
                )}
              </div>
            </>
          )}

          {/* ──────────────────── PHASE: RESULTS ──────────────────── */}
          {arenaPhase === 'results' && (
            <>
              {/* OVERALL WINNER BANNER */}
              {overallWinner && (
                <div className="card" style={{
                  marginBottom: 16,
                  textAlign: 'center',
                  borderTop: `3px solid ${overallWinner === 'A' ? 'var(--A)' : overallWinner === 'B' ? 'var(--B)' : 'var(--muted)'}`,
                  background: overallWinner === 'A' ? 'rgba(44,74,110,.06)' : overallWinner === 'B' ? 'rgba(140,58,48,.06)' : 'transparent',
                }}>
                  <div style={{ fontSize: '2rem', marginBottom: 6 }}>
                    {overallWinner === 'draw' ? '🤝' : '🏆'}
                  </div>
                  <div style={{ fontFamily: 'var(--fH)', fontSize: '1.1rem', letterSpacing: '.1em', color: overallWinner === 'A' ? 'var(--A)' : overallWinner === 'B' ? 'var(--B)' : 'var(--muted)' }}>
                    {overallWinner === 'draw' ? 'Égalité parfaite !' : `Équipe ${overallWinner} remporte le tournoi !`}
                  </div>
                  <div style={{ fontFamily: 'var(--fM)', fontSize: '.58rem', color: 'var(--muted)', marginTop: 4 }}>
                    {teamAWins} – {teamBWins} matchs
                  </div>
                  {user && (() => {
                    const myTeamWon = (myTeam === 'A' && overallWinner === 'A') || (myTeam === 'B' && overallWinner === 'B');
                    const myTeamLost = overallWinner !== 'draw' && !myTeamWon;
                    return myTeamWon
                      ? <div style={{ fontFamily: 'var(--fM)', fontSize: '.6rem', color: 'var(--G)', marginTop: 8 }}>✨ Votre équipe a gagné !</div>
                      : myTeamLost
                      ? <div style={{ fontFamily: 'var(--fM)', fontSize: '.6rem', color: 'var(--B)', marginTop: 8 }}>Votre équipe n'a pas gagné cette fois.</div>
                      : null;
                  })()}
                </div>
              )}

              {/* MATCH RESULTS */}
              <div className="card" style={{ marginBottom: 16 }}>
                <div style={{ fontFamily: 'var(--fH)', fontSize: '.85rem', letterSpacing: '.08em', marginBottom: 12 }}>
                  📊 Résultats des matchs
                </div>
                {matches.map((m, i) => <MatchRow key={m.matchId} match={m} index={i} userId={user?.id} />)}
              </div>

              {/* TEAM SCORE CARDS */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
                {[
                  { team: teams.teamA, label: 'Équipe A — Pro',    wins: teamAWins, color: 'var(--A)' },
                  { team: teams.teamB, label: 'Équipe B — Contra', wins: teamBWins, color: 'var(--B)' },
                ].map(({ label, wins, color }) => (
                  <div key={label} className="card" style={{ textAlign: 'center', borderTop: `2px solid ${color}` }}>
                    <div style={{ fontFamily: 'var(--fH)', fontSize: '.65rem', letterSpacing: '.08em', color, marginBottom: 6 }}>{label}</div>
                    <div style={{ fontFamily: 'var(--fH)', fontSize: '2.4rem', color, lineHeight: 1 }}>{wins}</div>
                    <div style={{ fontFamily: 'var(--fM)', fontSize: '.52rem', color: 'var(--muted)', marginTop: 4 }}>victoires</div>
                  </div>
                ))}
              </div>

              {/* MVP */}
              {mvp && (
                <div className="card" style={{
                  marginBottom: 16,
                  textAlign: 'center',
                  borderTop: '3px solid var(--Y)',
                  background: 'rgba(180,140,60,.05)',
                }}>
                  <div style={{ fontFamily: 'var(--fM)', fontSize: '.52rem', color: 'var(--Y)', textTransform: 'uppercase', letterSpacing: '.14em', marginBottom: 10 }}>
                    🏅 MVP du tournoi
                  </div>
                  <div style={{ fontSize: '3rem', marginBottom: 8 }}>{mvp.avatar || '🏆'}</div>
                  <div style={{ fontFamily: 'var(--fH)', fontSize: '1.15rem', letterSpacing: '.1em', color: 'var(--Y)', marginBottom: 4 }}>
                    {mvp.name}
                  </div>
                  <TierPill elo={mvp.elo} />
                  <div style={{ fontFamily: 'var(--fM)', fontSize: '.58rem', color: 'var(--muted)', marginTop: 8 }}>
                    Score moyen : <strong style={{ color: 'var(--txt)' }}>{mvp.avgScore}</strong> / 10 ·{' '}
                    {mvp.matchesPlayed} match{mvp.matchesPlayed > 1 ? 's' : ''} joué{mvp.matchesPlayed > 1 ? 's' : ''}
                  </div>
                  {mvp.id === user?.id && (
                    <div style={{
                      display: 'inline-block',
                      marginTop: 10,
                      fontFamily: 'var(--fM)', fontSize: '.58rem', color: 'var(--Y)',
                      background: 'rgba(180,140,60,.12)', border: '1px solid rgba(180,140,60,.3)',
                      borderRadius: 20, padding: '4px 14px',
                    }}>
                      ✨ Vous êtes le MVP ! mvp_count +1
                    </div>
                  )}
                </div>
              )}

              {/* ACTIONS */}
              <button
                className="btn b-ghost"
                style={{ width: '100%', marginBottom: 8 }}
                onClick={handleReset}
              >
                🔄 Nouveau tournoi
              </button>
              <button
                className="btn b-ghost b-sm"
                style={{ width: '100%' }}
                onClick={() => setTab('leaderboard')}
              >
                🏆 Voir le classement
              </button>
            </>
          )}
        </>
      )}
    </div>
  );
}
