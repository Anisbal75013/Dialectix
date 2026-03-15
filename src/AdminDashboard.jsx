/**
 * AdminDashboard.jsx — Version Tailwind CSS, mobile-first
 *
 * Breakpoints :
 *   mobile  < 640px  : cards empilées, tableaux → liste, 1 colonne
 *   tablet  640-1024 : 2 colonnes, tableaux compacts
 *   desktop > 1024px : 3-5 colonnes, tableaux complets
 *
 * Accessible uniquement si isAdmin() === true.
 */
import { useState, useEffect, useCallback } from 'react';
import {
  getUsers, getBattles, getBattleStats,
  getAcademies, getTournaments, setTournamentStatus,
  health, healthDb,
} from './services/api.js';

/* ── Helpers ──────────────────────────────────────────────────────────────── */
const fmt     = (n) => (n ?? 0).toLocaleString('fr-FR');
const fmtDate = (d) => d
  ? new Date(d).toLocaleDateString('fr-FR', { day:'2-digit', month:'short', year:'numeric' })
  : '—';

/* ── Composants atomiques Tailwind ───────────────────────────────────────── */

function StatCard({ icon, label, value, sub, colorClass = 'text-[var(--A)]' }) {
  return (
    <div className="bg-[var(--bg)] border border-[var(--bd)] rounded-xl p-4 md:p-5 shadow-sm flex flex-col gap-2">
      <span className="text-2xl">{icon}</span>
      <span className={`font-bold text-2xl md:text-3xl ${colorClass}`}>{value}</span>
      <span className="text-[var(--dim)] text-xs uppercase tracking-wider font-mono">{label}</span>
      {sub && <span className="text-[var(--muted)] text-xs font-mono">{sub}</span>}
    </div>
  );
}

function SectionTitle({ children }) {
  return (
    <h2 className="text-xs font-mono uppercase tracking-widest text-[var(--muted)] mb-3 pb-2 border-b border-[var(--bd)]">
      {children}
    </h2>
  );
}

function StatusBadge({ status }) {
  const map = {
    pending:   { label: 'En attente', cls: 'bg-yellow-50 text-yellow-700 border-yellow-200' },
    active:    { label: 'En cours',   cls: 'bg-green-50 text-green-700 border-green-200' },
    completed: { label: 'Terminé',    cls: 'bg-gray-50 text-gray-500 border-gray-200' },
  };
  const { label, cls } = map[status] || { label: status, cls: 'bg-gray-50 text-gray-500 border-gray-200' };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-mono font-semibold border ${cls}`}>
      {label}
    </span>
  );
}

function RoleBadge({ role }) {
  const map = {
    founder: 'bg-[var(--A)] text-white',
    admin:   'bg-[var(--Y)] text-white',
    member:  'bg-[var(--bd)] text-[var(--dim)]',
  };
  return (
    <span className={`inline-block px-2 py-0.5 rounded text-xs font-mono font-semibold ${map[role] || map.member}`}>
      {role}
    </span>
  );
}

/* ── Tabs ─────────────────────────────────────────────────────────────────── */
const TABS = [
  { key: 'overview',    label: '📊',    labelFull: 'Vue globale' },
  { key: 'battles',     label: '⚔️',    labelFull: 'Battles' },
  { key: 'academies',   label: '🏛',    labelFull: 'Académies' },
  { key: 'tournaments', label: '🏆',    labelFull: 'Tournois' },
];

/* ════════════════════════════════════════════════════════════════════════════
   COMPOSANT PRINCIPAL
   ════════════════════════════════════════════════════════════════════════════ */
export default function AdminDashboard({ onBack }) {
  const [users,       setUsers]       = useState([]);
  const [battles,     setBattles]     = useState([]);
  const [battleStats, setBattleStats] = useState({ total: 0, today: 0 });
  const [academies,   setAcademies]   = useState([]);
  const [tournaments, setTournaments] = useState([]);
  const [sysHealth,   setSysHealth]   = useState({ api: null, db: null });
  const [loading,     setLoading]     = useState(true);
  const [error,       setError]       = useState(null);
  const [tab,         setTab]         = useState('overview');

  /* ── Chargement ─────────────────────────────────────────────────────────── */
  const loadAll = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const [u, b, bs, a, t, h, hd] = await Promise.allSettled([
        getUsers(), getBattles(), getBattleStats(),
        getAcademies(), getTournaments(),
        health(), healthDb(),
      ]);
      if (u.status  === 'fulfilled') setUsers(u.value);
      if (b.status  === 'fulfilled') setBattles(b.value.slice(0, 50));
      if (bs.status === 'fulfilled') setBattleStats(bs.value);
      if (a.status  === 'fulfilled') setAcademies(a.value);
      if (t.status  === 'fulfilled') setTournaments(t.value);
      setSysHealth({
        api: h.status  === 'fulfilled' ? 'ok' : 'error',
        db:  hd.status === 'fulfilled' && hd.value?.db === 'ok' ? 'ok' : 'error',
      });
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadAll(); }, [loadAll]);

  const avgElo     = users.length ? Math.round(users.reduce((s, u) => s + (u.elo || 0), 0) / users.length) : 0;
  const activeTour = tournaments.filter(t => t.status === 'active').length;

  async function handleTournamentStatus(id, status) {
    try {
      await setTournamentStatus(id, status);
      setTournaments(prev => prev.map(t => t.id === id ? { ...t, status } : t));
    } catch (e) { alert('Erreur : ' + e.message); }
  }

  if (loading) return (
    <div className="flex items-center justify-center min-h-[40vh] text-[var(--muted)] font-mono text-sm">
      ⏳ Chargement du dashboard…
    </div>
  );

  return (
    <div className="max-w-6xl mx-auto px-4 py-5 md:px-6 md:py-6 font-[var(--fB)]">

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="flex items-start sm:items-center justify-between gap-3 mb-5">
        <div>
          <h1 className="font-[var(--fH)] text-lg md:text-xl tracking-widest text-[var(--txt)]">
            ⚙️ Dashboard Admin
          </h1>
          <p className="text-xs text-[var(--muted)] font-mono mt-1">
            Dialectix — données temps réel via Supabase
          </p>
        </div>
        <div className="flex gap-2 flex-shrink-0">
          <button
            onClick={loadAll}
            className="touch-target px-3 py-2 text-xs font-mono border border-[var(--A)] text-[var(--A)] rounded-lg hover:bg-[var(--A)] hover:text-white transition-colors"
          >🔄 Actualiser</button>
          {onBack && (
            <button
              onClick={onBack}
              className="touch-target px-3 py-2 text-xs font-mono border border-[var(--bd)] text-[var(--dim)] rounded-lg hover:bg-[rgba(40,28,8,.05)] transition-colors"
            >← Retour</button>
          )}
        </div>
      </div>

      {/* ── System health bar ──────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center gap-3 mb-5 px-4 py-3 bg-[var(--bg)] border border-[var(--bd)] rounded-xl text-xs font-mono">
        <span className={`inline-block w-2.5 h-2.5 rounded-full ${sysHealth.api === 'ok' ? 'bg-green-500' : 'bg-orange-500'}`}/>
        <span className="text-[var(--dim)]">
          API : <strong className={sysHealth.api === 'ok' ? 'text-green-600' : 'text-orange-600'}>
            {sysHealth.api === 'ok' ? 'opérationnel' : 'erreur'}
          </strong>
        </span>
        <span className="text-[var(--bd)] hidden sm:inline">|</span>
        <span className={`inline-block w-2.5 h-2.5 rounded-full ${sysHealth.db === 'ok' ? 'bg-green-500' : 'bg-orange-500'}`}/>
        <span className="text-[var(--dim)]">
          Supabase : <strong className={sysHealth.db === 'ok' ? 'text-green-600' : 'text-orange-600'}>
            {sysHealth.db === 'ok' ? 'connectée' : 'erreur'}
          </strong>
        </span>
        {error && <span className="ml-auto text-orange-600">⚠ {error}</span>}
      </div>

      {/* ── Tabs ──────────────────────────────────────────────────────────── */}
      <div className="flex gap-1 mb-5 overflow-x-auto pb-1">
        {TABS.map(({ key, label, labelFull }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`touch-target flex-shrink-0 px-3 sm:px-4 py-2 rounded-lg text-xs font-mono uppercase tracking-wide border transition-colors whitespace-nowrap
              ${tab === key
                ? 'bg-[var(--A)] text-white border-[var(--A)]'
                : 'bg-transparent text-[var(--dim)] border-[var(--bd)] hover:bg-[rgba(40,28,8,.04)]'
              }`}
          >
            <span className="sm:hidden">{label}</span>
            <span className="hidden sm:inline">{label} {labelFull}</span>
          </button>
        ))}
      </div>

      {/* ════════════════════════════════════════════════════════════════════
          OVERVIEW
         ════════════════════════════════════════════════════════════════════ */}
      {tab === 'overview' && (
        <>
          {/* Stats grid — 2 cols mobile, 3 tablette, 5 desktop */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 mb-6">
            <StatCard icon="👥" label="Utilisateurs"   value={fmt(users.length)}          colorClass="text-[var(--A)]" />
            <StatCard icon="⚔️" label="Battles totales" value={fmt(battleStats.total)}     sub={`+${battleStats.today} aujourd'hui`} colorClass="text-[var(--B)]" />
            <StatCard icon="📈" label="ELO moyen"       value={fmt(avgElo)}                colorClass="text-green-600" />
            <StatCard icon="🏛" label="Académies"        value={fmt(academies.length)}      colorClass="text-[var(--Y)]" />
            <StatCard icon="🏆" label="Tournois actifs"  value={fmt(activeTour)}            colorClass="text-[var(--O)]" />
          </div>

          {/* Leaderboard */}
          <SectionTitle>🏅 Classement ELO — Top 20</SectionTitle>

          {/* Mobile : cards */}
          <div className="sm:hidden flex flex-col gap-2 mb-6">
            {users.slice(0, 20).map((u, i) => (
              <div key={u.id} className="flex items-center gap-3 p-3 bg-[var(--bg)] border border-[var(--bd)] rounded-lg">
                <span className="text-lg w-7 text-center flex-shrink-0">
                  {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : <span className="text-sm text-[var(--muted)]">{i+1}</span>}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-sm truncate">{u.username || '—'}</div>
                  <div className="text-xs text-[var(--muted)] truncate">{u.email || '—'}</div>
                </div>
                <div className="text-right flex-shrink-0">
                  <div className="font-bold text-[var(--A)] text-sm">{u.elo ?? '—'}</div>
                  <div className="text-xs text-[var(--muted)]">{fmtDate(u.created_at)}</div>
                </div>
              </div>
            ))}
            {users.length === 0 && (
              <p className="text-center text-[var(--muted)] text-sm py-8">Aucun utilisateur enregistré</p>
            )}
          </div>

          {/* Tablette+ : tableau */}
          <div className="hidden sm:block overflow-x-auto mb-6">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[var(--bd)]">
                  {['#', 'Joueur', 'Email', 'ELO', 'Inscrit le'].map(h => (
                    <th key={h} className="text-left px-3 py-2 text-xs font-mono uppercase tracking-wider text-[var(--muted)]">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {users.slice(0, 20).map((u, i) => (
                  <tr key={u.id} className="border-b border-[var(--bd2)] hover:bg-[rgba(40,28,8,.02)] transition-colors">
                    <td className="px-3 py-2.5 text-[var(--muted)] w-8">{i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : i+1}</td>
                    <td className="px-3 py-2.5 font-semibold">{u.username || '—'}</td>
                    <td className="px-3 py-2.5 text-[var(--dim)] text-xs">{u.email || '—'}</td>
                    <td className="px-3 py-2.5 font-bold text-[var(--A)]">{u.elo ?? '—'}</td>
                    <td className="px-3 py-2.5 text-[var(--muted)] text-xs">{fmtDate(u.created_at)}</td>
                  </tr>
                ))}
                {users.length === 0 && (
                  <tr><td colSpan={5} className="text-center text-[var(--muted)] py-8">Aucun utilisateur enregistré</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* ════════════════════════════════════════════════════════════════════
          BATTLES
         ════════════════════════════════════════════════════════════════════ */}
      {tab === 'battles' && (
        <>
          <SectionTitle>⚔️ Battles récentes ({battles.length})</SectionTitle>

          {/* Mobile : cards */}
          <div className="sm:hidden flex flex-col gap-2">
            {battles.map(b => {
              const p1 = b.player1?.username || '?';
              const p2 = b.player2?.username || '?';
              const won1 = b.winner_id === b.player1_id;
              const won2 = b.winner_id === b.player2_id;
              return (
                <div key={b.id} className="p-3 bg-[var(--bg)] border border-[var(--bd)] rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs text-[var(--muted)] font-mono">{fmtDate(b.created_at)}</span>
                    {b.winner_id
                      ? <span className="text-xs bg-green-50 text-green-700 border border-green-200 rounded px-2 py-0.5 font-mono">✓ {won1 ? p1 : p2}</span>
                      : <span className="text-xs bg-gray-50 text-gray-500 border border-gray-200 rounded px-2 py-0.5 font-mono">Égalité</span>
                    }
                  </div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`font-semibold text-sm flex-1 truncate ${won1 ? 'text-green-600' : 'text-[var(--txt)]'}`}>{p1}</span>
                    <span className="font-bold text-[var(--A)] text-sm">{b.score_player1?.toFixed(1) ?? '—'}</span>
                    <span className="text-[var(--muted)] text-xs">vs</span>
                    <span className="font-bold text-[var(--B)] text-sm">{b.score_player2?.toFixed(1) ?? '—'}</span>
                    <span className={`font-semibold text-sm flex-1 truncate text-right ${won2 ? 'text-green-600' : 'text-[var(--txt)]'}`}>{p2}</span>
                  </div>
                  {b.topic && <p className="text-xs text-[var(--dim)] truncate mt-1">{b.topic}</p>}
                </div>
              );
            })}
            {battles.length === 0 && (
              <p className="text-center text-[var(--muted)] text-sm py-8">Aucune battle enregistrée</p>
            )}
          </div>

          {/* Tablette+ : tableau */}
          <div className="hidden sm:block overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[var(--bd)]">
                  {['Date','Joueur 1','Score 1','Score 2','Joueur 2','Sujet','Gagnant'].map(h => (
                    <th key={h} className="text-left px-3 py-2 text-xs font-mono uppercase tracking-wider text-[var(--muted)]">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {battles.map(b => {
                  const p1 = b.player1?.username || '?';
                  const p2 = b.player2?.username || '?';
                  const won1 = b.winner_id === b.player1_id;
                  const won2 = b.winner_id === b.player2_id;
                  return (
                    <tr key={b.id} className="border-b border-[var(--bd2)] hover:bg-[rgba(40,28,8,.02)] transition-colors">
                      <td className="px-3 py-2.5 text-[var(--muted)] text-xs whitespace-nowrap">{fmtDate(b.created_at)}</td>
                      <td className={`px-3 py-2.5 ${won1 ? 'font-bold text-green-600' : ''}`}>{p1}</td>
                      <td className="px-3 py-2.5 text-center font-bold text-[var(--A)]">{b.score_player1?.toFixed(1) ?? '—'}</td>
                      <td className="px-3 py-2.5 text-center font-bold text-[var(--B)]">{b.score_player2?.toFixed(1) ?? '—'}</td>
                      <td className={`px-3 py-2.5 ${won2 ? 'font-bold text-green-600' : ''}`}>{p2}</td>
                      <td className="px-3 py-2.5 text-[var(--dim)] text-xs max-w-[180px] truncate">{b.topic || '—'}</td>
                      <td className="px-3 py-2.5">
                        {b.winner_id
                          ? <span className="text-xs bg-green-50 text-green-700 border border-green-200 rounded px-2 py-0.5 font-mono">✓ {won1 ? p1 : p2}</span>
                          : <span className="text-xs bg-gray-50 text-gray-500 border border-gray-200 rounded px-2 py-0.5 font-mono">Égalité</span>
                        }
                      </td>
                    </tr>
                  );
                })}
                {battles.length === 0 && (
                  <tr><td colSpan={7} className="text-center text-[var(--muted)] py-8">Aucune battle</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* ════════════════════════════════════════════════════════════════════
          ACADÉMIES
         ════════════════════════════════════════════════════════════════════ */}
      {tab === 'academies' && (
        <>
          <SectionTitle>🏛 Académies ({academies.length})</SectionTitle>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {academies.map(a => (
              <div key={a.id} className="p-4 bg-[var(--bg)] border border-[var(--bd)] rounded-xl">
                <div className="font-[var(--fH)] text-sm tracking-wide mb-1">{a.name}</div>
                <div className="text-xs text-[var(--dim)] mb-3 line-clamp-2">
                  {a.description || 'Aucune description'}
                </div>
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {a.members?.slice(0, 6).map(m => (
                    <span key={m.id} className="flex items-center gap-1">
                      <RoleBadge role={m.role} />
                      <span className="text-xs text-[var(--dim)]">{m.user?.username || '?'}</span>
                    </span>
                  ))}
                  {(a.members?.length ?? 0) > 6 && (
                    <span className="text-xs text-[var(--muted)] font-mono">+{a.members.length - 6}</span>
                  )}
                </div>
                <div className="text-xs text-[var(--muted)] font-mono mt-2 pt-2 border-t border-[var(--bd)]">
                  Fondateur : <strong>{a.founder?.username || '—'}</strong>
                  {' · '}Créée le {fmtDate(a.created_at)}
                </div>
              </div>
            ))}
            {academies.length === 0 && (
              <p className="col-span-full text-center text-[var(--muted)] text-sm py-8">Aucune académie créée</p>
            )}
          </div>
        </>
      )}

      {/* ════════════════════════════════════════════════════════════════════
          TOURNOIS
         ════════════════════════════════════════════════════════════════════ */}
      {tab === 'tournaments' && (
        <>
          <SectionTitle>🏆 Tournois ({tournaments.length})</SectionTitle>

          {/* Mobile : cards */}
          <div className="sm:hidden flex flex-col gap-2">
            {tournaments.map(t => (
              <div key={t.id} className="p-3 bg-[var(--bg)] border border-[var(--bd)] rounded-lg">
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div>
                    <div className="font-semibold text-sm">{t.name}</div>
                    <div className="text-xs text-[var(--muted)] font-mono mt-0.5">
                      par {t.creator?.username || '—'} · {fmtDate(t.created_at)}
                    </div>
                  </div>
                  <StatusBadge status={t.status} />
                </div>
                <div className="flex gap-2 mt-2">
                  {t.status === 'pending' && (
                    <button
                      onClick={() => handleTournamentStatus(t.id, 'active')}
                      className="touch-target flex-1 py-2 text-xs font-mono border border-green-500 text-green-600 rounded-lg hover:bg-green-50 transition-colors"
                    >▶ Démarrer</button>
                  )}
                  {t.status === 'active' && (
                    <button
                      onClick={() => handleTournamentStatus(t.id, 'completed')}
                      className="touch-target flex-1 py-2 text-xs font-mono border border-orange-500 text-orange-600 rounded-lg hover:bg-orange-50 transition-colors"
                    >■ Terminer</button>
                  )}
                </div>
              </div>
            ))}
            {tournaments.length === 0 && (
              <p className="text-center text-[var(--muted)] text-sm py-8">Aucun tournoi créé</p>
            )}
          </div>

          {/* Tablette+ : tableau */}
          <div className="hidden sm:block overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[var(--bd)]">
                  {['Nom', 'Statut', 'Démarrage', 'Créé par', 'Date', 'Actions'].map(h => (
                    <th key={h} className="text-left px-3 py-2 text-xs font-mono uppercase tracking-wider text-[var(--muted)]">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {tournaments.map(t => (
                  <tr key={t.id} className="border-b border-[var(--bd2)] hover:bg-[rgba(40,28,8,.02)] transition-colors">
                    <td className="px-3 py-2.5 font-semibold">{t.name}</td>
                    <td className="px-3 py-2.5"><StatusBadge status={t.status} /></td>
                    <td className="px-3 py-2.5 text-[var(--dim)] text-xs">{fmtDate(t.start_date)}</td>
                    <td className="px-3 py-2.5 text-[var(--dim)] text-xs">{t.creator?.username || '—'}</td>
                    <td className="px-3 py-2.5 text-[var(--muted)] text-xs">{fmtDate(t.created_at)}</td>
                    <td className="px-3 py-2.5">
                      <div className="flex gap-2">
                        {t.status === 'pending' && (
                          <button
                            onClick={() => handleTournamentStatus(t.id, 'active')}
                            className="touch-target px-3 py-1 text-xs font-mono border border-green-500 text-green-600 rounded hover:bg-green-50 transition-colors"
                          >▶ Démarrer</button>
                        )}
                        {t.status === 'active' && (
                          <button
                            onClick={() => handleTournamentStatus(t.id, 'completed')}
                            className="touch-target px-3 py-1 text-xs font-mono border border-orange-500 text-orange-600 rounded hover:bg-orange-50 transition-colors"
                          >■ Terminer</button>
                        )}
                        {t.status === 'completed' && (
                          <span className="text-xs text-[var(--muted)] font-mono">Archivé</span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
                {tournaments.length === 0 && (
                  <tr><td colSpan={6} className="text-center text-[var(--muted)] py-8">Aucun tournoi créé</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
