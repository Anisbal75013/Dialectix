// ═══════════════════════════════════════════════════════════════════════════════
// DIALECTIX — DialectixActu.jsx
// ═══════════════════════════════════════════════════════════════════════════════
// Weekly debate topics page. Users browse current-events debates, choose a side,
// and enter the arena. Participation is tracked via localStorage.
// ═══════════════════════════════════════════════════════════════════════════════

import { useState, useEffect, useCallback } from 'react';
import {
  getWeeklyTopics,
  getPreviousWeekResults,
  voteOnTopic,
  getUserParticipation,
  recordParticipation,
} from './services/weeklyDebateService.js';

// ─── CATEGORY COLORS ─────────────────────────────────────────────────────────

const CATEGORY_COLORS = {
  géopolitique: { bg: 'rgba(var(--A-rgb,44,74,110),0.18)', text: 'var(--A,#4A90D9)', border: 'rgba(var(--A-rgb,44,74,110),0.4)' },
  science:      { bg: 'rgba(58,110,82,0.18)',               text: 'var(--G,#3A9E6E)',  border: 'rgba(58,110,82,0.4)' },
  société:      { bg: 'rgba(var(--Y-rgb,198,161,91),0.18)', text: 'var(--Y,#C6A15B)', border: 'rgba(198,161,91,0.4)' },
  économie:     { bg: 'rgba(90,58,110,0.18)',               text: 'var(--O,#9B72C4)',  border: 'rgba(90,58,110,0.4)' },
  éthique:      { bg: 'rgba(var(--B-rgb,140,58,48),0.18)', text: 'var(--B,#D95B5B)',  border: 'rgba(140,58,48,0.4)' },
};

function getCategoryStyle(category) {
  return CATEGORY_COLORS[category] || { bg: 'rgba(120,120,120,0.18)', text: 'var(--muted,#888)', border: 'rgba(120,120,120,0.4)' };
}

// ─── CONSTANTS ────────────────────────────────────────────────────────────────

const CATEGORY_LABELS = {
  géopolitique: 'Géopolitique',
  science:      'Science',
  société:      'Société',
  économie:     'Économie',
  éthique:      'Éthique',
};

// ─── SUB-COMPONENTS ───────────────────────────────────────────────────────────

function CategoryPill({ category }) {
  const cs = getCategoryStyle(category);
  return (
    <span style={{
      display: 'inline-block',
      padding: '2px 10px',
      borderRadius: 20,
      fontSize: 11,
      fontWeight: 600,
      letterSpacing: '0.06em',
      textTransform: 'uppercase',
      background: cs.bg,
      color: cs.text,
      border: `1px solid ${cs.border}`,
      fontFamily: 'var(--fM, Inter, sans-serif)',
    }}>
      {CATEGORY_LABELS[category] || category}
    </span>
  );
}

function VoteBar({ pctA, pctB, totalVotes }) {
  return (
    <div style={{ marginTop: 8 }}>
      <div style={{
        display: 'flex',
        height: 6,
        borderRadius: 4,
        overflow: 'hidden',
        background: 'var(--bd,rgba(255,255,255,0.08))',
      }}>
        <div style={{
          width: `${pctA}%`,
          background: 'var(--A,#4A90D9)',
          transition: 'width 0.5s ease',
        }} />
        <div style={{
          width: `${pctB}%`,
          background: 'var(--B,#D95B5B)',
          transition: 'width 0.5s ease',
        }} />
      </div>
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        marginTop: 5,
        fontSize: 11,
        color: 'var(--muted,#888)',
        fontFamily: 'var(--fM, Inter, sans-serif)',
      }}>
        <span style={{ color: 'var(--A,#4A90D9)', fontWeight: 600 }}>Pour {pctA}%</span>
        <span style={{ color: 'var(--muted,#888)' }}>
          {totalVotes > 0 ? `${totalVotes} vote${totalVotes > 1 ? 's' : ''}` : 'Aucun vote'}
        </span>
        <span style={{ color: 'var(--B,#D95B5B)', fontWeight: 600 }}>Contre {pctB}%</span>
      </div>
    </div>
  );
}

function PositionCard({ position, side, label, selected, hasVoted, onSelect }) {
  const isA = side === 'A';
  const accent = isA ? 'var(--A,#4A90D9)' : 'var(--B,#D95B5B)';
  const accentBg = isA ? 'rgba(74,144,217,0.08)' : 'rgba(217,91,91,0.08)';
  const accentBgSelected = isA ? 'rgba(74,144,217,0.18)' : 'rgba(217,91,91,0.18)';
  const isSelected = selected === side;

  return (
    <div
      onClick={hasVoted ? undefined : onSelect}
      style={{
        flex: 1,
        minWidth: 0,
        padding: '12px 14px',
        borderRadius: 10,
        border: `1.5px solid ${isSelected ? accent : 'var(--bd,rgba(255,255,255,0.1))'}`,
        background: isSelected ? accentBgSelected : accentBg,
        cursor: hasVoted ? 'default' : 'pointer',
        transition: 'border-color 0.2s, background 0.2s, transform 0.15s',
        transform: isSelected ? 'scale(1.01)' : 'scale(1)',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Label strip */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: 6,
        marginBottom: 6,
      }}>
        <span style={{
          fontSize: 10,
          fontWeight: 700,
          letterSpacing: '0.08em',
          textTransform: 'uppercase',
          color: accent,
          fontFamily: 'var(--fM, Inter, sans-serif)',
        }}>
          {label}
        </span>
        {isSelected && (
          <span style={{
            fontSize: 10,
            color: accent,
            fontWeight: 700,
          }}>✓</span>
        )}
      </div>
      {/* Position text */}
      <p style={{
        margin: 0,
        fontSize: 12.5,
        lineHeight: 1.55,
        color: 'var(--txt,#E8E0D0)',
        fontFamily: 'var(--fM, Inter, sans-serif)',
      }}>
        {position}
      </p>
    </div>
  );
}

function TopicCard({ topic, selectedSide, onSelectSide, onEnterArena, hasVoted, expanded, onToggleExpand }) {
  const votes = topic.votes || { A: 0, B: 0 };
  const totalVotes = (votes.A || 0) + (votes.B || 0);
  const pctA = totalVotes > 0 ? Math.round((votes.A / totalVotes) * 100) : 50;
  const pctB = totalVotes > 0 ? 100 - pctA : 50;
  const chosen = selectedSide;
  const canEnter = !!chosen && !hasVoted;

  return (
    <div style={{
      background: 'var(--bg,#0E0D0B)',
      border: '1px solid var(--bd,rgba(255,255,255,0.1))',
      borderRadius: 14,
      padding: '20px 22px',
      display: 'flex',
      flexDirection: 'column',
      gap: 14,
      boxShadow: 'var(--sh,0 4px 24px rgba(0,0,0,0.4))',
      transition: 'border-color 0.2s',
    }}>
      {/* Top row: category + vote bar */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
        <CategoryPill category={topic.category} />
        {hasVoted && (
          <span style={{
            fontSize: 11,
            color: 'var(--G,#3A9E6E)',
            fontWeight: 600,
            fontFamily: 'var(--fM, Inter, sans-serif)',
            background: 'rgba(58,158,110,0.12)',
            padding: '2px 8px',
            borderRadius: 20,
            border: '1px solid rgba(58,158,110,0.3)',
          }}>
            Déjà participé
          </span>
        )}
      </div>

      {/* Title */}
      <h3 style={{
        margin: 0,
        fontSize: 'clamp(14px, 2.5vw, 17px)',
        fontWeight: 700,
        color: 'var(--txt,#E8E0D0)',
        fontFamily: 'var(--fH, Cinzel, serif)',
        lineHeight: 1.35,
        letterSpacing: '0.01em',
      }}>
        {topic.title}
      </h3>

      {/* Context */}
      <div>
        <p style={{
          margin: 0,
          fontSize: 13,
          lineHeight: 1.6,
          color: 'var(--dim,#9A9285)',
          fontFamily: 'var(--fM, Inter, sans-serif)',
          display: '-webkit-box',
          WebkitLineClamp: expanded ? 'none' : 3,
          WebkitBoxOrient: 'vertical',
          overflow: expanded ? 'visible' : 'hidden',
        }}>
          {topic.context}
        </p>
        <button
          onClick={onToggleExpand}
          style={{
            background: 'none',
            border: 'none',
            padding: '2px 0',
            marginTop: 4,
            cursor: 'pointer',
            fontSize: 12,
            color: 'var(--muted,#888)',
            fontFamily: 'var(--fM, Inter, sans-serif)',
            textDecoration: 'underline',
            textUnderlineOffset: 2,
          }}
        >
          {expanded ? 'Réduire' : 'Lire plus'}
        </button>
      </div>

      {/* Positions */}
      <div style={{ display: 'flex', gap: 10 }}>
        <PositionCard
          position={topic.positionA}
          side="A"
          label="Pour"
          selected={chosen}
          hasVoted={hasVoted}
          onSelect={() => onSelectSide('A')}
        />
        <PositionCard
          position={topic.positionB}
          side="B"
          label="Contre"
          selected={chosen}
          hasVoted={hasVoted}
          onSelect={() => onSelectSide('B')}
        />
      </div>

      {/* Vote distribution */}
      <VoteBar pctA={pctA} pctB={pctB} totalVotes={totalVotes} />

      {/* CTA */}
      <button
        disabled={!canEnter}
        onClick={() => canEnter && onEnterArena()}
        style={{
          padding: '11px 0',
          borderRadius: 9,
          border: 'none',
          background: canEnter
            ? 'linear-gradient(135deg, var(--A,#4A90D9), #2c6eb0)'
            : 'var(--bd2,rgba(255,255,255,0.06))',
          color: canEnter ? '#fff' : 'var(--muted,#888)',
          fontSize: 13,
          fontWeight: 700,
          letterSpacing: '0.06em',
          textTransform: 'uppercase',
          cursor: canEnter ? 'pointer' : 'not-allowed',
          fontFamily: 'var(--fM, Inter, sans-serif)',
          transition: 'background 0.2s, transform 0.15s',
          boxShadow: canEnter ? '0 2px 12px rgba(74,144,217,0.3)' : 'none',
          transform: canEnter ? 'none' : 'none',
        }}
        onMouseEnter={e => { if (canEnter) e.currentTarget.style.transform = 'translateY(-1px)'; }}
        onMouseLeave={e => { e.currentTarget.style.transform = 'none'; }}
      >
        {hasVoted
          ? 'Déjà dans l\'arène'
          : !chosen
            ? 'Choisissez un camp'
            : 'Entrer dans l\'arène →'}
      </button>
    </div>
  );
}

function PreviousResultsTable({ results }) {
  if (!results || results.length === 0) {
    return (
      <div style={{
        textAlign: 'center',
        padding: '32px 20px',
        color: 'var(--muted,#888)',
        fontFamily: 'var(--fM, Inter, sans-serif)',
        fontSize: 14,
        background: 'var(--bg,#0E0D0B)',
        border: '1px solid var(--bd,rgba(255,255,255,0.08))',
        borderRadius: 12,
      }}>
        Bientôt disponible
      </div>
    );
  }

  return (
    <div style={{
      overflowX: 'auto',
      borderRadius: 12,
      border: '1px solid var(--bd,rgba(255,255,255,0.1))',
    }}>
      <table style={{
        width: '100%',
        borderCollapse: 'collapse',
        fontFamily: 'var(--fM, Inter, sans-serif)',
        fontSize: 13,
      }}>
        <thead>
          <tr style={{ borderBottom: '1px solid var(--bd,rgba(255,255,255,0.1))' }}>
            {['Sujet', 'Pour %', 'Contre %', 'Meilleur argument'].map((h, i) => (
              <th key={i} style={{
                padding: '12px 16px',
                textAlign: i === 0 ? 'left' : 'center',
                color: 'var(--muted,#888)',
                fontWeight: 600,
                fontSize: 11,
                letterSpacing: '0.07em',
                textTransform: 'uppercase',
                whiteSpace: 'nowrap',
                background: 'var(--bg,#0E0D0B)',
              }}>
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {results.map((r, idx) => (
            <tr
              key={r.topicId || idx}
              style={{
                borderBottom: idx < results.length - 1 ? '1px solid var(--bd,rgba(255,255,255,0.06))' : 'none',
              }}
            >
              <td style={{
                padding: '12px 16px',
                color: 'var(--txt,#E8E0D0)',
                maxWidth: 260,
                lineHeight: 1.4,
              }}>
                {r.title}
              </td>
              <td style={{ padding: '12px 16px', textAlign: 'center', color: 'var(--A,#4A90D9)', fontWeight: 700 }}>
                {r.pourPct}%
              </td>
              <td style={{ padding: '12px 16px', textAlign: 'center', color: 'var(--B,#D95B5B)', fontWeight: 700 }}>
                {r.contrePct}%
              </td>
              <td style={{
                padding: '12px 16px',
                textAlign: 'center',
                color: 'var(--dim,#9A9285)',
                fontStyle: 'italic',
                fontSize: 12,
              }}>
                {r.bestArgument || '—'}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ─── MAIN COMPONENT ───────────────────────────────────────────────────────────

export default function DialectixActu({ user, onEnterArena, setPage, showToast }) {
  const [topics, setTopics] = useState([]);
  const [selectedSide, setSelectedSide] = useState({}); // { [topicId]: 'A' | 'B' }
  const [expandedContext, setExpandedContext] = useState(new Set());
  const [previousResults, setPreviousResults] = useState([]);
  const [participation, setParticipation] = useState({}); // { [topicId]: 'A' | 'B' }

  // Determine current week number from topics
  const weekNumber = topics.length > 0 ? topics[0].weekNumber : 1;

  // ── Load data ───────────────────────────────────────────────────────────────
  useEffect(() => {
    const loaded = getWeeklyTopics();
    setTopics(loaded);
    const results = getPreviousWeekResults();
    setPreviousResults(results);
  }, []);

  useEffect(() => {
    if (user?.id) {
      const p = getUserParticipation(user.id);
      setParticipation(p);
    }
  }, [user]);

  // ── Handlers ────────────────────────────────────────────────────────────────
  const handleSelectSide = useCallback((topicId, side) => {
    setSelectedSide(prev => ({ ...prev, [topicId]: side }));
  }, []);

  const handleToggleExpand = useCallback((topicId) => {
    setExpandedContext(prev => {
      const next = new Set(prev);
      next.has(topicId) ? next.delete(topicId) : next.add(topicId);
      return next;
    });
  }, []);

  const handleEnterArena = useCallback((topic) => {
    const side = selectedSide[topic.id];
    if (!side) return;

    // Vote + record participation
    voteOnTopic(topic.id, side);
    if (user?.id) {
      recordParticipation(user.id, topic.id, side);
      setParticipation(prev => ({ ...prev, [topic.id]: side }));
    }

    // Refresh topic vote counts in state
    setTopics(prev =>
      prev.map(t => {
        if (t.id !== topic.id) return t;
        const votes = { ...(t.votes || { A: 0, B: 0 }) };
        votes[side] = (votes[side] || 0) + 1;
        return { ...t, votes };
      })
    );

    showToast?.(`Vous entrez dans l'arène — position : ${side === 'A' ? 'Pour' : 'Contre'}`, 'success');

    // Hand off to parent with topic title as debate subject
    onEnterArena?.(topic, side);
  }, [selectedSide, user, onEnterArena, showToast]);

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <div style={{
      minHeight: '100vh',
      background: 'var(--bg,#0E0D0B)',
      padding: '0 0 80px 0',
    }}>

      {/* ── HEADER ─────────────────────────────────────────────────────────── */}
      <div style={{
        padding: 'clamp(28px, 5vw, 52px) clamp(16px, 5vw, 48px) 32px',
        borderBottom: '1px solid var(--bd,rgba(255,255,255,0.08))',
        marginBottom: 0,
        background: 'linear-gradient(180deg, rgba(74,144,217,0.06) 0%, transparent 100%)',
      }}>
        {/* Week badge */}
        <div style={{ marginBottom: 14 }}>
          <span style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            padding: '4px 14px',
            borderRadius: 20,
            background: 'rgba(74,144,217,0.12)',
            border: '1px solid rgba(74,144,217,0.25)',
            fontSize: 12,
            fontWeight: 600,
            color: 'var(--A,#4A90D9)',
            letterSpacing: '0.07em',
            textTransform: 'uppercase',
            fontFamily: 'var(--fM, Inter, sans-serif)',
          }}>
            <span style={{ opacity: 0.8, fontSize: 10 }}>●</span>
            Semaine {weekNumber}
          </span>
        </div>

        {/* Title */}
        <h1 style={{
          margin: '0 0 10px 0',
          fontSize: 'clamp(26px, 5vw, 42px)',
          fontWeight: 700,
          color: 'var(--txt,#E8E0D0)',
          fontFamily: 'var(--fH, Cinzel, serif)',
          letterSpacing: '0.04em',
          lineHeight: 1.15,
        }}>
          DIALECTIX ACTU
        </h1>

        {/* Subtitle */}
        <p style={{
          margin: 0,
          fontSize: 'clamp(13px, 2vw, 15px)',
          color: 'var(--dim,#9A9285)',
          fontFamily: 'var(--fM, Inter, sans-serif)',
          fontStyle: 'italic',
          lineHeight: 1.55,
          maxWidth: 560,
        }}>
          Les grands débats de la semaine — Choisissez votre camp, entrez dans l'arène.
        </p>
      </div>

      {/* ── TOPICS GRID ────────────────────────────────────────────────────── */}
      <div style={{
        padding: 'clamp(24px, 4vw, 40px) clamp(16px, 5vw, 48px)',
      }}>
        {/* Section title */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          marginBottom: 24,
        }}>
          <h2 style={{
            margin: 0,
            fontSize: 13,
            fontWeight: 700,
            color: 'var(--muted,#888)',
            fontFamily: 'var(--fM, Inter, sans-serif)',
            letterSpacing: '0.1em',
            textTransform: 'uppercase',
          }}>
            Débats de la semaine
          </h2>
          <div style={{
            flex: 1,
            height: 1,
            background: 'var(--bd,rgba(255,255,255,0.08))',
          }} />
          <span style={{
            fontSize: 12,
            color: 'var(--muted,#888)',
            fontFamily: 'var(--fM, Inter, sans-serif)',
          }}>
            {topics.length} sujets
          </span>
        </div>

        {topics.length === 0 ? (
          // Loading state
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
            gap: 20,
          }}>
            {[1, 2, 3, 4, 5].map(i => (
              <div key={i} style={{
                height: 280,
                borderRadius: 14,
                background: 'var(--bd2,rgba(255,255,255,0.04))',
                border: '1px solid var(--bd,rgba(255,255,255,0.07))',
                animation: 'pulse 1.5s ease-in-out infinite',
              }} />
            ))}
          </div>
        ) : (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 360px), 1fr))',
            gap: 20,
          }}>
            {topics.map(topic => (
              <TopicCard
                key={topic.id}
                topic={topic}
                selectedSide={selectedSide[topic.id] || null}
                onSelectSide={(side) => handleSelectSide(topic.id, side)}
                onEnterArena={() => handleEnterArena(topic)}
                hasVoted={!!participation[topic.id]}
                expanded={expandedContext.has(topic.id)}
                onToggleExpand={() => handleToggleExpand(topic.id)}
              />
            ))}
          </div>
        )}
      </div>

      {/* ── PREVIOUS WEEK RESULTS ──────────────────────────────────────────── */}
      <div style={{
        padding: '0 clamp(16px, 5vw, 48px) 40px',
      }}>
        {/* Section header */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          marginBottom: 20,
        }}>
          <h2 style={{
            margin: 0,
            fontSize: 13,
            fontWeight: 700,
            color: 'var(--muted,#888)',
            fontFamily: 'var(--fM, Inter, sans-serif)',
            letterSpacing: '0.1em',
            textTransform: 'uppercase',
          }}>
            Résultats de la semaine précédente
          </h2>
          <div style={{
            flex: 1,
            height: 1,
            background: 'var(--bd,rgba(255,255,255,0.08))',
          }} />
        </div>
        <PreviousResultsTable results={previousResults} />
      </div>

    </div>
  );
}
