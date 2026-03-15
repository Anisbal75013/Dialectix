// ═══════════════════════════════════════════════════════════════════════════════
// DIALECTIX AI — TournamentLobby.jsx
// ═══════════════════════════════════════════════════════════════════════════════
// Minimal self-contained component. Renders a list of open tournaments with:
//   • Side A / Side B player counts (psychological signal)
//   • Registration button with side picker
//   • Registered status display + cancel option
//
// Props:
//   user        — Supabase user object (null = not logged in)
//   supabase    — Supabase client (passed from App.jsx)
//   showToast   — function(message, type) — matches App.jsx toast convention
//
// DOES NOT modify App.jsx. Import and render as a page-level component.
// All styles use existing CSS variables from App.jsx's :root definitions.
// ═══════════════════════════════════════════════════════════════════════════════

import { useState, useEffect, useCallback } from 'react';
import {
  fetchTournaments,
  fetchAllSideCounts,
  fetchUserRegistrations,
  registerForTournament,
  cancelRegistration,
} from './services/tournamentService.js';

// ─── INLINE STYLES ────────────────────────────────────────────────────────────
// All styles are scoped to this component and reference existing CSS variables.
// No new classes added to the global stylesheet.

const S = {
  // Outer container — full scrollable area
  wrap: {
    padding: '28px 24px',
    maxWidth: 780,
    margin: '0 auto',
    fontFamily: 'var(--fB)',
  },

  // Section header
  header: {
    marginBottom: 24,
  },
  title: {
    fontFamily: 'var(--fH)',
    fontSize: '1.15rem',
    fontWeight: 600,
    letterSpacing: '.12em',
    color: 'var(--txt)',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: '.75rem',
    color: 'var(--muted)',
    letterSpacing: '.01em',
  },

  // Tournament card
  card: {
    background: 'var(--s0)',
    border: '1px solid var(--bd)',
    borderRadius: 8,
    padding: '20px 22px',
    marginBottom: 14,
    boxShadow: 'var(--sh)',
    transition: 'box-shadow .2s',
  },
  cardHover: {
    boxShadow: 'var(--sh2)',
  },

  // Card title row
  cardTitleRow: {
    display: 'flex',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
    marginBottom: 8,
  },
  cardTitle: {
    fontFamily: 'var(--fC)',
    fontSize: '1.05rem',
    fontWeight: 600,
    color: 'var(--txt)',
    lineHeight: 1.3,
  },

  // Status chip
  chipOpen: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 4,
    padding: '3px 10px',
    borderRadius: 20,
    border: '1px solid rgba(58,110,82,.3)',
    background: 'rgba(58,110,82,.07)',
    color: 'var(--G)',
    fontSize: '.62rem',
    fontWeight: 600,
    letterSpacing: '.04em',
    flexShrink: 0,
    whiteSpace: 'nowrap',
  },
  chipRegistered: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 4,
    padding: '3px 10px',
    borderRadius: 20,
    border: '1px solid rgba(44,74,110,.3)',
    background: 'rgba(44,74,110,.07)',
    color: 'var(--A)',
    fontSize: '.62rem',
    fontWeight: 600,
    letterSpacing: '.04em',
    flexShrink: 0,
    whiteSpace: 'nowrap',
  },

  // Description
  description: {
    fontSize: '.78rem',
    color: 'var(--dim)',
    lineHeight: 1.55,
    marginBottom: 16,
  },

  // Counters row
  countersRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    marginBottom: 16,
  },
  counterBlock: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    padding: '8px 14px',
    borderRadius: 6,
    border: '1px solid',
    minWidth: 80,
    cursor: 'default',
  },
  counterBlockA: {
    borderColor: 'rgba(44,74,110,.28)',
    background: 'rgba(44,74,110,.06)',
  },
  counterBlockB: {
    borderColor: 'rgba(140,58,48,.28)',
    background: 'rgba(140,58,48,.06)',
  },
  counterLabel: {
    fontSize: '.58rem',
    fontWeight: 700,
    letterSpacing: '.08em',
    marginBottom: 3,
    textTransform: 'uppercase',
  },
  counterLabelA: { color: 'var(--A)' },
  counterLabelB: { color: 'var(--B)' },
  counterNum: {
    fontSize: '1.3rem',
    fontWeight: 700,
    lineHeight: 1,
    fontFamily: 'var(--fM)',
  },
  counterNumA: { color: 'var(--A)' },
  counterNumB: { color: 'var(--B)' },
  counterSub: {
    fontSize: '.58rem',
    color: 'var(--muted)',
    marginTop: 2,
  },

  // VS divider
  vsDivider: {
    fontSize: '.72rem',
    fontWeight: 700,
    color: 'var(--muted)',
    letterSpacing: '.08em',
    padding: '0 4px',
  },

  // Psychological pressure text
  pressureText: {
    fontSize: '.68rem',
    color: 'var(--muted)',
    fontStyle: 'italic',
    marginLeft: 'auto',
    textAlign: 'right',
    maxWidth: 160,
    lineHeight: 1.4,
  },

  // Action area
  actionRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
  },

  // Side picker (shown when not registered)
  sidePicker: {
    display: 'flex',
    gap: 6,
  },
  sideBtn: {
    padding: '7px 14px',
    borderRadius: 5,
    border: '1px solid',
    fontSize: '.72rem',
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'all .15s',
    fontFamily: 'var(--fB)',
    letterSpacing: '.01em',
  },
  sideBtnA: {
    borderColor: 'rgba(44,74,110,.35)',
    background: 'transparent',
    color: 'var(--A)',
  },
  sideBtnAActive: {
    borderColor: 'var(--A)',
    background: 'rgba(44,74,110,.1)',
    color: 'var(--A)',
  },
  sideBtnB: {
    borderColor: 'rgba(140,58,48,.35)',
    background: 'transparent',
    color: 'var(--B)',
  },
  sideBtnBActive: {
    borderColor: 'var(--B)',
    background: 'rgba(140,58,48,.1)',
    color: 'var(--B)',
  },

  // Register button
  registerBtn: {
    padding: '7px 18px',
    borderRadius: 5,
    border: '1px solid var(--A)',
    background: 'var(--A)',
    color: '#fff',
    fontSize: '.72rem',
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'opacity .15s',
    fontFamily: 'var(--fB)',
    letterSpacing: '.01em',
  },
  registerBtnDisabled: {
    opacity: .5,
    cursor: 'not-allowed',
  },

  // Cancel registration
  cancelBtn: {
    padding: '7px 14px',
    borderRadius: 5,
    border: '1px solid var(--bd2)',
    background: 'transparent',
    color: 'var(--muted)',
    fontSize: '.68rem',
    fontWeight: 500,
    cursor: 'pointer',
    transition: 'all .15s',
    fontFamily: 'var(--fB)',
  },

  // Registered badge row
  registeredRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
  },
  registeredSide: {
    fontSize: '.72rem',
    color: 'var(--dim)',
  },

  // Login prompt
  loginPrompt: {
    fontSize: '.72rem',
    color: 'var(--muted)',
    fontStyle: 'italic',
  },

  // Empty state
  emptyState: {
    textAlign: 'center',
    padding: '40px 20px',
    color: 'var(--muted)',
    fontSize: '.8rem',
  },

  // Loading state
  loadingState: {
    textAlign: 'center',
    padding: '40px 20px',
    color: 'var(--muted)',
    fontSize: '.78rem',
  },
};

// ─── PRESSURE TEXT ────────────────────────────────────────────────────────────
// Dynamic psychological signal based on side imbalance.
//
function getPressureText(sideA, sideB) {
  const total = sideA + sideB;
  if (total === 0) return 'Sois le premier à choisir ton camp.';

  const diff = Math.abs(sideA - sideB);
  const dominant = sideA > sideB ? 'A' : sideA < sideB ? 'B' : null;

  if (diff === 0) return 'Les deux camps sont à égalité — l\'équilibre est parfait.';
  if (diff === 1) return `Le camp ${dominant} prend légèrement l\'avantage.`;
  if (diff <= 3) return `Le camp ${dominant} domine pour l\'instant — renforce l\'opposition.`;
  return `Déséquilibre important. Le camp ${dominant === 'A' ? 'B' : 'A'} a besoin de renforts.`;
}

// ─── MAIN COMPONENT ───────────────────────────────────────────────────────────

export default function TournamentLobby({ user, supabase, showToast }) {
  const [tournaments, setTournaments]         = useState([]);
  const [sideCounts, setSideCounts]           = useState({});
  const [userRegs, setUserRegs]               = useState({}); // { [tournamentId]: reg row }
  const [hoveredCard, setHoveredCard]         = useState(null);
  const [selectedSide, setSelectedSide]       = useState({}); // { [tournamentId]: 'A'|'B' }
  const [loading, setLoading]                 = useState(true);
  const [actionLoading, setActionLoading]     = useState({}); // { [tournamentId]: bool }

  // ── Load tournaments + counts + user registrations ────────────────────────
  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [tournsResult, countsResult] = await Promise.all([
        fetchTournaments(supabase),
        fetchAllSideCounts(supabase),
      ]);

      if (tournsResult.error) throw tournsResult.error;
      setTournaments(tournsResult.data);
      setSideCounts(countsResult.data ?? {});

      // If logged in, load user registrations
      if (user?.id) {
        const { data: regs, error: regErr } = await fetchUserRegistrations(supabase, user.id);
        if (!regErr && regs) {
          const regMap = {};
          for (const r of regs) regMap[r.tournament_id] = r;
          setUserRegs(regMap);
        }
      }
    } catch (err) {
      showToast?.('Impossible de charger les tournois.', 'error');
    } finally {
      setLoading(false);
    }
  }, [supabase, user?.id, showToast]);

  useEffect(() => { load(); }, [load]);

  // ── Register ──────────────────────────────────────────────────────────────
  const handleRegister = async (tournamentId) => {
    if (!user?.id) {
      showToast?.('Connecte-toi pour rejoindre un tournoi.', 'info');
      return;
    }
    const side = selectedSide[tournamentId];
    if (!side) {
      showToast?.('Choisis ton camp avant de t\'inscrire.', 'info');
      return;
    }

    setActionLoading(prev => ({ ...prev, [tournamentId]: true }));
    try {
      const { data, error } = await registerForTournament(supabase, user.id, tournamentId, side);
      if (error) {
        // Unique constraint = already registered
        if (error.code === '23505') {
          showToast?.('Tu es déjà inscrit à ce tournoi.', 'info');
        } else {
          throw error;
        }
      } else {
        showToast?.(`Inscrit côté ${side === 'A' ? 'Pro' : 'Contra'} — bonne chance !`, 'success');
        // Optimistic update
        setUserRegs(prev => ({ ...prev, [tournamentId]: data }));
        setSideCounts(prev => {
          const current = prev[tournamentId] ?? { sideA: 0, sideB: 0 };
          return {
            ...prev,
            [tournamentId]: {
              sideA: side === 'A' ? current.sideA + 1 : current.sideA,
              sideB: side === 'B' ? current.sideB + 1 : current.sideB,
            },
          };
        });
      }
    } catch (err) {
      showToast?.('Erreur lors de l\'inscription. Réessaie.', 'error');
    } finally {
      setActionLoading(prev => ({ ...prev, [tournamentId]: false }));
    }
  };

  // ── Cancel registration ───────────────────────────────────────────────────
  const handleCancel = async (tournamentId) => {
    if (!user?.id) return;

    setActionLoading(prev => ({ ...prev, [tournamentId]: true }));
    try {
      const reg = userRegs[tournamentId];
      const { error } = await cancelRegistration(supabase, user.id, tournamentId);
      if (error) throw error;

      showToast?.('Inscription annulée.', 'info');
      setUserRegs(prev => {
        const next = { ...prev };
        delete next[tournamentId];
        return next;
      });
      // Optimistic count rollback
      if (reg) {
        setSideCounts(prev => {
          const current = prev[tournamentId] ?? { sideA: 0, sideB: 0 };
          return {
            ...prev,
            [tournamentId]: {
              sideA: reg.side === 'A' ? Math.max(0, current.sideA - 1) : current.sideA,
              sideB: reg.side === 'B' ? Math.max(0, current.sideB - 1) : current.sideB,
            },
          };
        });
      }
    } catch (err) {
      showToast?.('Impossible d\'annuler. Réessaie.', 'error');
    } finally {
      setActionLoading(prev => ({ ...prev, [tournamentId]: false }));
    }
  };

  // ── Render ────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div style={S.wrap}>
        <div style={S.loadingState}>Chargement des tournois…</div>
      </div>
    );
  }

  const openTournaments = tournaments.filter(t => t.status === 'registration_open');

  return (
    <div style={S.wrap}>
      {/* Header */}
      <div style={S.header}>
        <div style={S.title}>TOURNOIS OFFICIELS</div>
        <div style={S.subtitle}>
          Choisis ton camp. Affronte les meilleurs. {openTournaments.length > 0
            ? `${openTournaments.length} tournoi${openTournaments.length > 1 ? 's' : ''} ouvert${openTournaments.length > 1 ? 's' : ''} aux inscriptions.`
            : 'Aucun tournoi en cours.'}
        </div>
      </div>

      {/* Tournament list */}
      {openTournaments.length === 0 ? (
        <div style={S.emptyState}>
          🏟️<br />
          <span style={{ marginTop: 8, display: 'block' }}>
            Aucun tournoi ouvert pour l'instant.<br />
            Reviens bientôt.
          </span>
        </div>
      ) : (
        openTournaments.map(tournament => {
          const counts  = sideCounts[tournament.id] ?? { sideA: 0, sideB: 0 };
          const reg     = userRegs[tournament.id] ?? null;
          const busy    = actionLoading[tournament.id] ?? false;
          const isHov   = hoveredCard === tournament.id;
          const pickedSide = selectedSide[tournament.id];

          const pressure = getPressureText(counts.sideA, counts.sideB);

          return (
            <div
              key={tournament.id}
              style={{ ...S.card, ...(isHov ? S.cardHover : {}) }}
              onMouseEnter={() => setHoveredCard(tournament.id)}
              onMouseLeave={() => setHoveredCard(null)}
            >
              {/* Title row */}
              <div style={S.cardTitleRow}>
                <div style={S.cardTitle}>{tournament.title}</div>
                {reg ? (
                  <div style={S.chipRegistered}>
                    ✓ Inscrit côté {reg.side === 'A' ? 'Pro' : 'Contra'}
                  </div>
                ) : (
                  <div style={S.chipOpen}>● INSCRIPTIONS OUVERTES</div>
                )}
              </div>

              {/* Description */}
              {tournament.description && (
                <div style={S.description}>{tournament.description}</div>
              )}

              {/* Side counters */}
              <div style={S.countersRow}>
                {/* Side A */}
                <div style={{ ...S.counterBlock, ...S.counterBlockA }}>
                  <div style={{ ...S.counterLabel, ...S.counterLabelA }}>PRO</div>
                  <div style={{ ...S.counterNum, ...S.counterNumA }}>{counts.sideA}</div>
                  <div style={S.counterSub}>joueur{counts.sideA !== 1 ? 's' : ''}</div>
                </div>

                <div style={S.vsDivider}>VS</div>

                {/* Side B */}
                <div style={{ ...S.counterBlock, ...S.counterBlockB }}>
                  <div style={{ ...S.counterLabel, ...S.counterLabelB }}>CONTRA</div>
                  <div style={{ ...S.counterNum, ...S.counterNumB }}>{counts.sideB}</div>
                  <div style={S.counterSub}>joueur{counts.sideB !== 1 ? 's' : ''}</div>
                </div>

                {/* Pressure signal */}
                <div style={S.pressureText}>{pressure}</div>
              </div>

              {/* Action area */}
              <div style={S.actionRow}>
                {!user ? (
                  <div style={S.loginPrompt}>Connecte-toi pour t'inscrire.</div>
                ) : reg ? (
                  // Already registered — show cancel option
                  <div style={S.registeredRow}>
                    <span style={S.registeredSide}>
                      Tu représentes le camp <strong>{reg.side === 'A' ? 'Pro' : 'Contra'}</strong>.
                    </span>
                    <button
                      style={S.cancelBtn}
                      onClick={() => handleCancel(tournament.id)}
                      disabled={busy}
                    >
                      {busy ? '…' : 'Annuler'}
                    </button>
                  </div>
                ) : (
                  // Not registered — show side picker + register button
                  <>
                    <div style={S.sidePicker}>
                      <button
                        style={{
                          ...S.sideBtn,
                          ...(pickedSide === 'A' ? S.sideBtnAActive : S.sideBtnA),
                        }}
                        onClick={() => setSelectedSide(prev => ({
                          ...prev,
                          [tournament.id]: prev[tournament.id] === 'A' ? null : 'A',
                        }))}
                        disabled={busy}
                      >
                        ⚔ Pro
                      </button>
                      <button
                        style={{
                          ...S.sideBtn,
                          ...(pickedSide === 'B' ? S.sideBtnBActive : S.sideBtnB),
                        }}
                        onClick={() => setSelectedSide(prev => ({
                          ...prev,
                          [tournament.id]: prev[tournament.id] === 'B' ? null : 'B',
                        }))}
                        disabled={busy}
                      >
                        🛡 Contra
                      </button>
                    </div>

                    <button
                      style={{
                        ...S.registerBtn,
                        ...(!pickedSide || busy ? S.registerBtnDisabled : {}),
                      }}
                      onClick={() => handleRegister(tournament.id)}
                      disabled={!pickedSide || busy}
                    >
                      {busy ? 'Inscription…' : 'Rejoindre le tournoi'}
                    </button>
                  </>
                )}
              </div>
            </div>
          );
        })
      )}
    </div>
  );
}
