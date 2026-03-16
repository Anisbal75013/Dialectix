// ═══════════════════════════════════════════════════════════════════════════════
// DIALECTIX AI — AcademyMap.jsx  (Phase 2 — City Builder Gamification)
// ═══════════════════════════════════════════════════════════════════════════════
// • Terrain "City Builder" inspiré Clash of Clans — bâtiment central proéminent
// • Bâtiments secondaires évoluant visuellement selon ELO (Niv 1→4)
// • academy_name affiché en titre sur le bâtiment principal
// • "Chemin vers l'Excellence" — connexion visuelle ELO / activités
// • Boutique d'items (skins, drapeaux, titres)
// ═══════════════════════════════════════════════════════════════════════════════

import { useState, useEffect, useRef } from 'react';
import { createClient } from '@supabase/supabase-js';

const SB = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
);

// ─── Boutique catalog ─────────────────────────────────────────────────────────
const SHOP_ITEMS = [
  { id: 'skin_gold_orator',  name: "Orateur d'Or",          desc: 'Pour les vainqueurs qui brillent.',           type: 'avatar_skin',  emoji: '✨', isPremium: false, priceXp: 200 },
  { id: 'skin_philosopher',  name: 'Philosophe Classique',   desc: "L'avatar du sage de l'Antiquité.",           type: 'avatar_skin',  emoji: '🏛', isPremium: false, priceXp: 350 },
  { id: 'skin_challenger',   name: 'Challenger des Ombres',  desc: 'Identité mystérieuse redoutée.',              type: 'avatar_skin',  emoji: '⚔️', isPremium: false, priceXp: 500 },
  { id: 'flag_fire',         name: 'Bannière Ardente',        desc: "Drapeau d'académie pour les audacieux.",     type: 'academy_flag', emoji: '🔥', isPremium: false, priceXp: 150 },
  { id: 'flag_laurels',      name: 'Bannière des Lauriers',   desc: 'La couronne du vainqueur.',                  type: 'academy_flag', emoji: '🏅', isPremium: false, priceXp: 300 },
  { id: 'title_rhetor',      name: 'Rhéteur Certifié',        desc: 'Titre des maîtres de la persuasion.',        type: 'title',        emoji: '🗣', isPremium: false, priceXp: 400 },
  { id: 'skin_shadow',       name: 'Ombre Dialectique',       desc: 'Édition Premium — identité secrète.',        type: 'avatar_skin',  emoji: '🌑', isPremium: true,  priceXp: 0   },
  { id: 'skin_phoenix',      name: 'Phénix Rhétorique',       desc: 'Édition Premium — renaît de chaque défaite.',type: 'avatar_skin',  emoji: '🦅', isPremium: true,  priceXp: 0   },
  { id: 'flag_crown',        name: 'Bannière Royale',         desc: "Édition Premium — académies d'élite.",       type: 'academy_flag', emoji: '👑', isPremium: true,  priceXp: 0   },
  { id: 'title_sage',        name: "Sage de l'Arène",         desc: 'Édition Premium — le titre suprême.',        type: 'title',        emoji: '⭐', isPremium: true,  priceXp: 0   },
];

// ─── ELO Thresholds ───────────────────────────────────────────────────────────
const ELO_TIERS = [
  { min: 0,    max: 1099, level: 1, label: 'Novice',      color: '#8A7A60', bg: 'rgba(138,122,96,.08)'  },
  { min: 1100, max: 1399, level: 2, label: 'Scribe',      color: '#3A6E52', bg: 'rgba(58,110,82,.08)'   },
  { min: 1400, max: 1799, level: 3, label: 'Philosophe',  color: '#2C4A6E', bg: 'rgba(44,74,110,.08)'   },
  { min: 1800, max: 9999, level: 4, label: 'Légendaire',  color: '#C6A15B', bg: 'rgba(198,161,91,.10)'  },
];

function getEloTier(elo = 1000) {
  return ELO_TIERS.find(t => elo >= t.min && elo <= t.max) || ELO_TIERS[0];
}

// ─── ELO Milestones for progression path ──────────────────────────────────────
const ELO_MILESTONES = [
  { elo: 1100, label: 'Agora Standard',         building: 'Agora',           icon: '🏛' },
  { elo: 1200, label: 'Agora Supérieure',        building: 'Agora',           icon: '🏛' },
  { elo: 1400, label: 'Grande Bibliothèque',     building: 'Bibliothèque',    icon: '📚' },
  { elo: 1600, label: 'Amphithéâtre',            building: 'Hall des Débats', icon: '⚔️' },
  { elo: 1800, label: 'Académie Légendaire',     building: 'Académie',        icon: '🏰' },
  { elo: 2000, label: 'Colisée Dialectique',     building: 'Hall des Débats', icon: '🏆' },
];

// ─── Building definitions (3 secondary buildings) ─────────────────────────────
const BUILDINGS = [
  {
    id: 'library',
    name: 'Bibliothèque',
    desc: 'Répertoire des arguments et techniques rhétoriques.',
    icon: '📚',
    levels: [
      { label: 'Cabane de Parchemins',       emoji: '📜', color: '#8A7A60', glow: 'rgba(138,122,96,.25)' },
      { label: 'Bibliothèque du Scribe',      emoji: '📚', color: '#A05A2C', glow: 'rgba(160,90,44,.3)'  },
      { label: 'Grande Librairie',            emoji: '🏺', color: '#2C4A6E', glow: 'rgba(44,74,110,.35)' },
      { label: "Bibliothèque d'Alexandrie",   emoji: '🏛', color: '#C6A15B', glow: 'rgba(198,161,91,.4)' },
    ],
    unlockXp: 0,
  },
  {
    id: 'agora',
    name: 'Agora',
    desc: 'La place publique où les grands débats se tiennent.',
    icon: '🏛',
    levels: [
      { label: 'Place de Village',     emoji: '⛲', color: '#8A7A60', glow: 'rgba(138,122,96,.25)' },
      { label: 'Forum des Rhéteurs',   emoji: '🏟', color: '#3A6E52', glow: 'rgba(58,110,82,.3)'  },
      { label: "Agora d'Athènes",      emoji: '🏛', color: '#2C4A6E', glow: 'rgba(44,74,110,.35)' },
      { label: 'Grand Forum de Rome',  emoji: '🗿', color: '#C6A15B', glow: 'rgba(198,161,91,.4)' },
    ],
    unlockXp: 50,
  },
  {
    id: 'hall',
    name: 'Hall des Débats',
    desc: "L'arène suprême — là où se disputent les championnats.",
    icon: '⚔️',
    levels: [
      { label: 'Salle de Classe',        emoji: '🏫', color: '#8A7A60', glow: 'rgba(138,122,96,.25)' },
      { label: "Hall de l'Académie",     emoji: '🎭', color: '#8C3A30', glow: 'rgba(140,58,48,.3)'  },
      { label: 'Amphithéâtre',           emoji: '🏟', color: '#5A3A6E', glow: 'rgba(90,58,110,.35)' },
      { label: 'Colisée Dialectique',    emoji: '⚔️', color: '#C6A15B', glow: 'rgba(198,161,91,.4)' },
    ],
    unlockXp: 200,
  },
  {
    id: 'stadium',
    name: 'Stade',
    desc: "L'arène des tournois — où les champions s'affrontent en bracket.",
    icon: '🏆',
    levels: [
      { label: 'Terrain de Jeux',        emoji: '⛳', color: '#8A7A60', glow: 'rgba(138,122,96,.25)' },
      { label: 'Stade Régional',         emoji: '🏟', color: '#3A6E52', glow: 'rgba(58,110,82,.3)'  },
      { label: 'Stade National',         emoji: '🏆', color: '#C6A15B', glow: 'rgba(198,161,91,.4)' },
      { label: 'Colisée des Champions',  emoji: '👑', color: '#C6A15B', glow: 'rgba(198,161,91,.5)' },
    ],
    unlockXp: 100,
  },
];

// ─── Stars component ──────────────────────────────────────────────────────────
function Stars({ count, total = 4 }) {
  return (
    <div style={{ display: 'flex', gap: 2, justifyContent: 'center' }}>
      {Array.from({ length: total }).map((_, i) => (
        <span key={i} style={{ fontSize: '.65rem', opacity: i < count ? 1 : 0.18, filter: i < count ? 'drop-shadow(0 0 3px gold)' : 'none' }}>⭐</span>
      ))}
    </div>
  );
}

// ─── Mode link badge (overlaid on building) ───────────────────────────────────
function ModeLinkBadge({ label, icon, color, onClick }) {
  const [hover, setHover] = useState(false);
  return (
    <div
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      onClick={e => { e.stopPropagation(); onClick(); }}
      style={{
        position: 'absolute', bottom: 6, left: '50%', transform: 'translateX(-50%)',
        background: hover ? color : `${color}cc`,
        color: '#fff', borderRadius: 20, padding: '3px 10px',
        fontFamily: 'var(--fM)', fontSize: '.48rem', fontWeight: 700, letterSpacing: '.06em',
        cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4,
        boxShadow: hover ? `0 4px 12px ${color}66` : 'none',
        transition: 'all .18s', whiteSpace: 'nowrap', zIndex: 3,
      }}>
      <span>{icon}</span> {label}
    </div>
  );
}

// ─── Secondary Building Card ──────────────────────────────────────────────────
function BuildingCard({ building, level, xp, onClick, modeLabel, modeIcon, modeColor, onModeClick }) {
  const [hover, setHover] = useState(false);
  const lvl = building.levels[Math.min(level - 1, 3)];
  const isLocked = (xp || 0) < building.unlockXp;
  const size = [3.2, 4.0, 4.8, 5.6][Math.min(level - 1, 3)];

  return (
    <div
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      onClick={onClick}
      title={building.desc}
      style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
        padding: '16px 10px 14px',
        background: hover
          ? `linear-gradient(160deg,${lvl.glow.replace('.',',.12').replace('rgba(','rgba(').replace('.35',',.18')},rgba(253,250,244,1))`
          : 'rgba(253,250,244,.85)',
        border: `1.5px solid ${hover ? lvl.color + '55' : 'var(--bd)'}`,
        borderRadius: 14,
        boxShadow: hover
          ? `0 8px 28px ${lvl.glow}, inset 0 1px 0 rgba(255,255,255,.8)`
          : '0 2px 8px rgba(40,28,8,.07)',
        transition: 'all .28s cubic-bezier(.34,1.2,.64,1)',
        cursor: isLocked ? 'default' : 'pointer',
        position: 'relative', overflow: 'hidden',
        opacity: isLocked ? 0.55 : 1,
      }}
    >
      {isLocked && (
        <div style={{
          position: 'absolute', inset: 0, background: 'rgba(246,241,232,.88)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          borderRadius: 14, zIndex: 2, flexDirection: 'column', gap: 4,
        }}>
          <span style={{ fontSize: '1.4rem' }}>🔒</span>
          <span style={{ fontFamily: 'var(--fM)', fontSize: '.52rem', color: 'var(--muted)' }}>{building.unlockXp} XP requis</span>
        </div>
      )}

      {/* Glow halo */}
      {!isLocked && hover && (
        <div style={{
          position: 'absolute', top: 0, left: 0, right: 0, height: 3,
          background: `linear-gradient(90deg, transparent, ${lvl.color}, transparent)`,
          borderRadius: '14px 14px 0 0',
        }} />
      )}

      {/* Building emoji — scales with level */}
      <div style={{
        fontSize: `${size}rem`, lineHeight: 1,
        filter: `drop-shadow(0 6px 10px ${lvl.glow})`,
        transform: hover ? 'scale(1.08) translateY(-3px)' : 'scale(1)',
        transition: 'transform .28s cubic-bezier(.34,1.56,.64,1)',
        userSelect: 'none',
      }}>
        {lvl.emoji}
      </div>

      {/* Ground shadow ellipse */}
      <div style={{
        width: `${40 + level * 12}px`, height: 5,
        background: `radial-gradient(ellipse at center, ${lvl.color}33, transparent)`,
        borderRadius: '50%', marginTop: -6,
      }} />

      <div style={{ fontFamily: 'var(--fH)', fontSize: '.7rem', letterSpacing: '.06em', color: 'var(--txt)', textAlign: 'center', marginTop: 2 }}>
        {building.name}
      </div>
      <div style={{ fontFamily: 'var(--fM)', fontSize: '.52rem', color: lvl.color, textAlign: 'center', lineHeight: 1.4 }}>
        {lvl.label}
      </div>
      <Stars count={level} />
      {/* Mode link badge */}
      {modeLabel && onModeClick && !isLocked && (
        <ModeLinkBadge label={modeLabel} icon={modeIcon} color={modeColor || '#2C4A6E'} onClick={onModeClick} />
      )}
    </div>
  );
}

// ─── Central Academy Building ─────────────────────────────────────────────────
function MainAcademyBuilding({ academyName, tier, level, elo }) {
  const [pulse, setPulse] = useState(false);

  useEffect(() => {
    const t = setInterval(() => setPulse(p => !p), 3000);
    return () => clearInterval(t);
  }, []);

  const MAIN_EMOJIS = ['🏚', '🏠', '🏰', '🏯'];
  const emoji = MAIN_EMOJIS[Math.min(level - 1, 3)];
  const mainSize = [5.5, 7.0, 8.5, 10.0][Math.min(level - 1, 3)];

  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      gap: 8, position: 'relative',
    }}>
      {/* Academy name banner — golden/marble style */}
      <div style={{
        background: 'linear-gradient(135deg, #C6A15B 0%, #E8C97A 40%, #C6A15B 70%, #A07830 100%)',
        border: '2px solid #C6A15Baa',
        borderRadius: 12, padding: '6px 20px',
        fontFamily: 'var(--fH)', fontSize: '.78rem', letterSpacing: '.14em',
        color: '#3A2800',
        textAlign: 'center',
        boxShadow: '0 4px 16px rgba(198,161,91,.45), inset 0 1px 0 rgba(255,255,255,.5)',
        maxWidth: 220, wordBreak: 'break-word',
        textShadow: '0 1px 2px rgba(255,255,255,.4)',
        position: 'relative',
      }}>
        {/* Marble shimmer line */}
        <div style={{ position: 'absolute', top: 3, left: 10, right: 10, height: 1, background: 'rgba(255,255,255,.35)', borderRadius: 1, pointerEvents: 'none' }} />
        {academyName || 'Académie Dialectix'}
      </div>

      {/* Stars above the building */}
      <Stars count={level} total={4} />

      {/* The main building emoji */}
      <div style={{
        fontSize: `${mainSize}rem`, lineHeight: 1,
        filter: `drop-shadow(0 12px 20px ${tier.color}55) drop-shadow(0 4px 8px rgba(0,0,0,.15))`,
        transform: pulse ? 'scale(1.02) translateY(-2px)' : 'scale(1)',
        transition: 'transform 1.5s ease-in-out',
        userSelect: 'none',
        position: 'relative',
      }}>
        {emoji}
        {/* Level badge */}
        <div style={{
          position: 'absolute', top: -8, right: -8,
          background: `linear-gradient(135deg, ${tier.color}, ${tier.color}cc)`,
          color: '#fff', borderRadius: '50%',
          width: 26, height: 26, fontSize: '.65rem',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontFamily: 'var(--fH)', fontWeight: 700,
          boxShadow: `0 2px 8px ${tier.color}55`,
          border: '2px solid rgba(255,255,255,.8)',
        }}>
          {level}
        </div>
      </div>

      {/* Ground glow */}
      <div style={{
        width: `${100 + level * 30}px`, height: 12,
        background: `radial-gradient(ellipse at center, ${tier.color}33, transparent)`,
        borderRadius: '50%', marginTop: -10,
      }} />

      {/* Tier label */}
      <div style={{
        fontFamily: 'var(--fH)', fontSize: '.82rem', letterSpacing: '.12em',
        color: tier.color, textShadow: `0 0 12px ${tier.color}44`,
      }}>
        Académie {tier.label}
      </div>
      <div style={{ fontFamily: 'var(--fM)', fontSize: '.54rem', color: 'var(--muted)' }}>
        {elo} ELO
      </div>
    </div>
  );
}

// ─── Floating map decoration ───────────────────────────────────────────────────
function Deco({ emoji, x, y, size = '1.1rem', opacity = 0.55, animate = false }) {
  const [bob, setBob] = useState(false);
  useEffect(() => {
    if (!animate) return;
    const t = setInterval(() => setBob(b => !b), 2200 + Math.random() * 800);
    return () => clearInterval(t);
  }, [animate]);
  return (
    <div style={{
      position: 'absolute', left: `${x}%`, top: `${y}%`,
      fontSize: size, opacity, userSelect: 'none', pointerEvents: 'none',
      transform: `translate(-50%,-50%) translateY(${bob ? '-4px' : '0'})`,
      transition: 'transform 1.2s ease-in-out',
    }}>
      {emoji}
    </div>
  );
}

// ─── ELO Progress Path ────────────────────────────────────────────────────────
function EloProgressionPath({ elo, setPage }) {
  const nextMilestone = ELO_MILESTONES.find(m => elo < m.elo);
  const completedCount = ELO_MILESTONES.filter(m => elo >= m.elo).length;

  const ACTIVITIES = [
    { icon: '🔍', label: 'Duel Rhétorique',  desc: '+50 XP par succès · Identifiez les sophismes', page: 'daily',   color: '#2C4A6E' },
    { icon: '⚔️', label: 'Matchmaking',       desc: 'Affrontez de vrais joueurs · Gagnez de l\'ELO', page: 'compete', color: '#8C3A30' },
    { icon: '🏆', label: 'Tournois',           desc: 'Compétitions officielles · ELO boosté',         page: 'compete', color: '#C6A15B' },
  ];

  return (
    <div style={{
      background: 'linear-gradient(160deg,rgba(44,74,110,.04),rgba(198,161,91,.03))',
      border: '1px solid var(--bd)', borderRadius: 14, padding: '22px 20px',
      marginTop: 20,
    }}>
      {/* Title */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 18 }}>
        <span style={{ fontSize: '1.4rem' }}>📈</span>
        <div>
          <div style={{ fontFamily: 'var(--fH)', fontSize: '.95rem', letterSpacing: '.1em', textTransform: 'uppercase' }}>
            Chemin vers l'Excellence
          </div>
          <div style={{ fontFamily: 'var(--fM)', fontSize: '.56rem', color: 'var(--muted)', marginTop: 2 }}>
            Gagne de l'ELO en : Duels Rhétoriques · Matchmaking · Tournois
          </div>
        </div>
      </div>

      {/* Milestone progress track */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 0, overflowX: 'auto', paddingBottom: 6 }}>
          {ELO_MILESTONES.map((m, i) => {
            const done = elo >= m.elo;
            const isCurrent = !done && (i === 0 || elo >= ELO_MILESTONES[i - 1].elo);
            return (
              <div key={m.elo} style={{ display: 'flex', alignItems: 'center', flexShrink: 0 }}>
                {/* Connector */}
                {i > 0 && (
                  <div style={{
                    width: 28, height: 3,
                    background: elo >= ELO_MILESTONES[i - 1].elo
                      ? 'linear-gradient(90deg,var(--G),var(--A))'
                      : 'var(--bd)',
                    borderRadius: 2,
                  }} />
                )}
                {/* Milestone node */}
                <div title={`${m.label} — ${m.elo} ELO`} style={{
                  width: 44, height: 44, borderRadius: '50%',
                  background: done
                    ? 'linear-gradient(135deg,var(--G),var(--A))'
                    : isCurrent
                      ? 'linear-gradient(135deg,var(--Y),var(--O))'
                      : 'var(--s2)',
                  border: `2.5px solid ${done ? 'var(--G)' : isCurrent ? 'var(--Y)' : 'var(--bd)'}`,
                  display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                  boxShadow: done
                    ? '0 4px 12px rgba(58,110,82,.3)'
                    : isCurrent
                      ? '0 4px 12px rgba(198,161,91,.35)'
                      : 'none',
                  cursor: 'default', flexShrink: 0,
                  transition: 'all .3s',
                }}>
                  <span style={{ fontSize: done ? '1rem' : isCurrent ? '.95rem' : '.8rem' }}>
                    {done ? '✓' : m.icon}
                  </span>
                  <div style={{ fontFamily: 'var(--fH)', fontSize: '.38rem', color: done ? '#fff' : isCurrent ? '#fff' : 'var(--muted)', letterSpacing: 0, textAlign: 'center', marginTop: 1 }}>
                    {m.elo}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
        {/* Labels row */}
        <div style={{ display: 'flex', gap: 0, overflowX: 'auto', marginTop: 6 }}>
          {ELO_MILESTONES.map((m, i) => (
            <div key={m.elo} style={{ flexShrink: 0, display: 'flex', alignItems: 'flex-start' }}>
              {i > 0 && <div style={{ width: 28 }} />}
              <div style={{ width: 44, textAlign: 'center' }}>
                <div style={{ fontFamily: 'var(--fM)', fontSize: '.44rem', color: elo >= m.elo ? 'var(--G)' : 'var(--muted)', lineHeight: 1.3 }}>
                  {m.label.split(' ').slice(0, 2).join(' ')}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Next milestone banner */}
      {nextMilestone && (
        <div style={{
          background: 'rgba(198,161,91,.07)', border: '1px solid rgba(198,161,91,.28)',
          borderRadius: 10, padding: '12px 16px', marginBottom: 16,
          display: 'flex', alignItems: 'center', gap: 12,
        }}>
          <span style={{ fontSize: '1.4rem' }}>🎯</span>
          <div style={{ flex: 1 }}>
            <div style={{ fontFamily: 'var(--fB)', fontSize: '.72rem', fontWeight: 700, color: 'var(--Y)', marginBottom: 2 }}>
              Prochain débloqué : {nextMilestone.icon} {nextMilestone.label}
            </div>
            <div style={{ fontFamily: 'var(--fM)', fontSize: '.58rem', color: 'var(--muted)' }}>
              Atteins ELO {nextMilestone.elo} — encore {Math.max(0, nextMilestone.elo - elo)} points
            </div>
            {/* Mini ELO progress bar */}
            <div style={{ marginTop: 6, height: 5, background: 'var(--bd)', borderRadius: 3, overflow: 'hidden', maxWidth: 240 }}>
              <div style={{
                height: '100%',
                width: `${Math.min(100, Math.round(((elo - (ELO_MILESTONES[ELO_MILESTONES.indexOf(nextMilestone) - 1]?.elo || 1000)) / (nextMilestone.elo - (ELO_MILESTONES[ELO_MILESTONES.indexOf(nextMilestone) - 1]?.elo || 1000))) * 100))}%`,
                background: 'linear-gradient(90deg,var(--Y),var(--O))',
                borderRadius: 3, transition: 'width .8s ease',
              }} />
            </div>
          </div>
        </div>
      )}

      {/* Activity cards — how to earn ELO */}
      <div style={{ fontFamily: 'var(--fM)', fontSize: '.56rem', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '.12em', marginBottom: 10 }}>
        Comment gagner de l'ELO
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 8 }}>
        {ACTIVITIES.map(a => (
          <button key={a.label} onClick={() => setPage(a.page)}
            style={{
              background: 'var(--s1)', border: '1px solid var(--bd)',
              borderRadius: 10, padding: '12px 10px', cursor: 'pointer',
              textAlign: 'left', transition: 'all .18s',
            }}
            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(246,241,232,1)'; e.currentTarget.style.borderColor = a.color + '44'; e.currentTarget.style.boxShadow = `0 4px 14px ${a.color}18`; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'var(--s1)'; e.currentTarget.style.borderColor = 'var(--bd)'; e.currentTarget.style.boxShadow = 'none'; }}
          >
            <div style={{ fontSize: '1.4rem', marginBottom: 6 }}>{a.icon}</div>
            <div style={{ fontFamily: 'var(--fH)', fontSize: '.65rem', letterSpacing: '.06em', color: 'var(--txt)', marginBottom: 3 }}>{a.label}</div>
            <div style={{ fontFamily: 'var(--fM)', fontSize: '.50rem', color: 'var(--muted)', lineHeight: 1.4 }}>{a.desc}</div>
          </button>
        ))}
      </div>
    </div>
  );
}

// ─── Shop ─────────────────────────────────────────────────────────────────────
function AcademyShop({ user, saveUser, showToast }) {
  const [tab, setTab] = useState('avatar_skin');
  const [owned, setOwned] = useState([]);
  const [buying, setBuying] = useState(null);

  useEffect(() => {
    if (!user?.id) return;
    SB.from('user_shop_items').select('item_id').eq('user_id', user.id)
      .then(({ data }) => { if (data) setOwned(data.map(r => r.item_id)); });
  }, [user?.id]);

  const handleBuy = async (item) => {
    if (!user) { showToast('Connectez-vous pour acheter', 'error'); return; }
    if (item.isPremium) { showToast('Item Premium — disponible prochainement !', 'info'); return; }
    if (owned.includes(item.id)) { showToast('Déjà possédé !', 'info'); return; }
    if ((user.xp || 0) < item.priceXp) {
      showToast(`XP insuffisants — il vous faut ${item.priceXp - (user.xp || 0)} XP de plus.`, 'error');
      return;
    }
    setBuying(item.id);
    try {
      await SB.from('user_shop_items').insert({ user_id: user.id, item_id: item.id });
      setOwned(prev => [...prev, item.id]);
      saveUser({ ...user, xp: (user.xp || 0) - item.priceXp });
      showToast(`✨ "${item.name}" débloqué ! (-${item.priceXp} XP)`, 'achievement');
    } catch { showToast("Erreur lors de l'achat.", 'error'); }
    setBuying(null);
  };

  const TABS = [
    { id: 'avatar_skin',  label: 'Tenues',   icon: '👤' },
    { id: 'academy_flag', label: 'Drapeaux',  icon: '🚩' },
    { id: 'title',        label: 'Titres',    icon: '🎖' },
  ];

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
        <div>
          <div style={{ fontFamily: 'var(--fH)', fontSize: '1rem', letterSpacing: '.1em', textTransform: 'uppercase' }}>🛍 Boutique</div>
          <div style={{ fontFamily: 'var(--fM)', fontSize: '.58rem', color: 'var(--muted)', marginTop: 2 }}>Débloquez tenues, drapeaux et titres avec vos XP</div>
        </div>
        {user && (
          <div style={{ background: 'rgba(198,161,91,.12)', border: '1px solid rgba(198,161,91,.3)', borderRadius: 8, padding: '6px 14px', textAlign: 'center' }}>
            <div style={{ fontFamily: 'var(--fH)', fontSize: '1.1rem', color: 'var(--Y)' }}>{user.xp || 0}</div>
            <div style={{ fontFamily: 'var(--fM)', fontSize: '.5rem', color: 'var(--muted)' }}>XP</div>
          </div>
        )}
      </div>

      <div style={{ display: 'flex', gap: 2, background: 'var(--s2)', border: '1px solid var(--bd)', borderRadius: 8, padding: 3, marginBottom: 16 }}>
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} style={{
            flex: 1, padding: '7px 8px', border: 'none', borderRadius: 6, cursor: 'pointer',
            fontFamily: 'var(--fB)', fontSize: '.68rem', fontWeight: tab === t.id ? 700 : 500,
            background: tab === t.id ? '#FDFAF4' : 'transparent',
            color: tab === t.id ? 'var(--A)' : 'var(--muted)',
            boxShadow: tab === t.id ? 'var(--sh)' : 'none', transition: 'all .18s',
          }}>
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(148px,1fr))', gap: 10 }}>
        {SHOP_ITEMS.filter(i => i.type === tab).map(item => {
          const isOwned = owned.includes(item.id);
          return (
            <div key={item.id} style={{
              background: '#FDFAF4',
              border: `1px solid ${item.isPremium ? 'rgba(198,161,91,.4)' : 'var(--bd)'}`,
              borderRadius: 10, padding: '14px 12px', textAlign: 'center',
              position: 'relative', transition: 'all .2s',
              boxShadow: item.isPremium ? '0 2px 12px rgba(198,161,91,.15)' : 'var(--sh)',
            }}>
              {item.isPremium && (
                <div style={{
                  position: 'absolute', top: 7, right: 7,
                  background: 'linear-gradient(135deg,#C6A15B,#A05A2C)',
                  color: '#fff', borderRadius: 10, padding: '2px 6px',
                  fontFamily: 'var(--fM)', fontSize: '.48rem', fontWeight: 700, letterSpacing: '.06em',
                }}>PREMIUM</div>
              )}
              <div style={{ fontSize: '2rem', marginBottom: 8 }}>{item.emoji}</div>
              <div style={{ fontFamily: 'var(--fH)', fontSize: '.75rem', letterSpacing: '.04em', marginBottom: 4 }}>{item.name}</div>
              <div style={{ fontFamily: 'var(--fM)', fontSize: '.55rem', color: 'var(--muted)', lineHeight: 1.4, marginBottom: 10 }}>{item.desc}</div>
              {isOwned ? (
                <div style={{ fontFamily: 'var(--fM)', fontSize: '.58rem', color: 'var(--G)', background: 'rgba(58,110,82,.08)', border: '1px solid rgba(58,110,82,.25)', borderRadius: 20, padding: '4px 12px', display: 'inline-block' }}>✓ Possédé</div>
              ) : item.isPremium ? (
                <button className="btn b-ghost b-sm" style={{ fontSize: '.58rem', color: 'var(--Y)', borderColor: 'rgba(198,161,91,.4)' }}
                  onClick={() => showToast('Item Premium — disponible prochainement !', 'info')}>
                  🔒 Premium
                </button>
              ) : (
                <button className="btn b-a b-sm" style={{ fontSize: '.58rem', gap: 4 }}
                  disabled={buying === item.id}
                  onClick={() => handleBuy(item)}>
                  {buying === item.id ? '…' : `${item.priceXp} XP`}
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Edit Academy Name Modal ──────────────────────────────────────────────────
function EditAcademyNameModal({ current, userId, onSave, onClose }) {
  const [name, setName] = useState(current || '');
  const [saving, setSaving] = useState(false);
  const inputRef = useRef(null);
  useEffect(() => { setTimeout(() => inputRef.current?.focus(), 80); }, []);

  const handleSave = async () => {
    const trimmed = name.trim().slice(0, 40);
    if (!trimmed) return;
    setSaving(true);
    try {
      if (userId) {
        await SB.from('profiles').update({ academy_name: trimmed }).eq('id', userId);
      }
      onSave(trimmed);
    } catch { /* non-blocking */ }
    setSaving(false);
    onClose();
  };

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 900, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 16px', background: 'rgba(10,8,4,.55)', backdropFilter: 'blur(6px)' }}
      onClick={onClose}>
      <div style={{ background: '#FDFAF4', borderRadius: 14, padding: '26px 24px', maxWidth: 400, width: '100%', boxShadow: '0 20px 60px rgba(0,0,0,.25)', border: '1px solid var(--bd)' }}
        onClick={e => e.stopPropagation()}>
        <div style={{ fontFamily: 'var(--fH)', fontSize: '1rem', letterSpacing: '.08em', marginBottom: 6 }}>🏰 Nommer votre Académie</div>
        <div style={{ fontFamily: 'var(--fM)', fontSize: '.58rem', color: 'var(--muted)', marginBottom: 16 }}>Maximum 40 caractères · Affiché sur votre bâtiment principal</div>
        <input ref={inputRef} className="fi" value={name} onChange={e => setName(e.target.value.slice(0, 40))}
          placeholder="Ex: Académie des Lumières" onKeyDown={e => e.key === 'Enter' && handleSave()}
          style={{ marginBottom: 14 }} />
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn b-a b-lg" onClick={handleSave} disabled={saving || !name.trim()} style={{ flex: 1, justifyContent: 'center' }}>
            {saving ? '…' : '✓ Enregistrer'}
          </button>
          <button className="btn b-ghost" onClick={onClose} style={{ flex: 1, justifyContent: 'center' }}>Annuler</button>
        </div>
      </div>
    </div>
  );
}

// ─── AcademyMap — Main Component ──────────────────────────────────────────────
export default function AcademyMap({ user, saveUser, showToast, setPage }) {
  const [activeTab, setActiveTab] = useState('map');
  const [academyName, setAcademyName] = useState(user?.academy_name || '');
  const [editingName, setEditingName] = useState(false);

  const elo   = user?.elo  || 1000;
  const xp    = user?.xp   || 0;
  const tier  = getEloTier(elo);
  const level = tier.level;

  // Load academy_name from Supabase on mount
  useEffect(() => {
    if (!user?.id) return;
    SB.from('profiles').select('academy_name').eq('id', user.id).single()
      .then(({ data }) => { if (data?.academy_name) setAcademyName(data.academy_name); });
  }, [user?.id]);

  const globalProgress = Math.min(100, Math.round(((elo - 1000) / 1000) * 100));
  const tierNext = ELO_TIERS.find(t => t.level === level + 1);

  return (
    <div className="page">

      {/* ── HEADER ──────────────────────────────────────────────────────────── */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 20, flexWrap: 'wrap', gap: 10 }}>
        <div>
          <div style={{ fontFamily: 'var(--fH)', fontSize: '1.4rem', letterSpacing: '.1em', textTransform: 'uppercase', marginBottom: 4 }}>
            🏰 Votre Académie
          </div>
          <div style={{ fontFamily: 'var(--fM)', fontSize: '.6rem', color: 'var(--muted)' }}>
            Développez vos bâtiments · Grimpez dans les rangs ELO
          </div>
        </div>
        {user && (
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            {[['ELO', elo, tier.color], ['XP', xp, 'var(--O)']].map(([l, v, c]) => (
              <div key={l} style={{ textAlign: 'center', background: 'var(--s1)', borderRadius: 7, padding: '6px 14px', border: '1px solid var(--bd)' }}>
                <div style={{ fontFamily: 'var(--fH)', fontSize: '1.1rem', color: c }}>{v}</div>
                <div style={{ fontFamily: 'var(--fM)', fontSize: '.52rem', color: 'var(--muted)' }}>{l}</div>
              </div>
            ))}
            <div style={{ textAlign: 'center', background: tier.bg, borderRadius: 7, padding: '6px 14px', border: `1px solid ${tier.color}44` }}>
              <div style={{ fontFamily: 'var(--fH)', fontSize: '.82rem', color: tier.color }}>{tier.label}</div>
              <div style={{ fontFamily: 'var(--fM)', fontSize: '.48rem', color: 'var(--muted)' }}>Tier</div>
            </div>
          </div>
        )}
      </div>

      {/* ── TABS ────────────────────────────────────────────────────────────── */}
      <div style={{ display: 'flex', gap: 2, background: 'var(--s2)', border: '1px solid var(--bd)', borderRadius: 9, padding: 4, marginBottom: 20 }}>
        {[['map', '🗺 Carte'], ['progression', '📈 Progression'], ['shop', '🛍 Boutique']].map(([id, label]) => (
          <button key={id} onClick={() => setActiveTab(id)} style={{
            flex: 1, padding: '9px 12px', border: 'none', borderRadius: 6, cursor: 'pointer',
            fontFamily: 'var(--fB)', fontSize: '.72rem', fontWeight: activeTab === id ? 700 : 500,
            background: activeTab === id ? '#FDFAF4' : 'transparent',
            color: activeTab === id ? 'var(--A)' : 'var(--muted)',
            boxShadow: activeTab === id ? 'var(--sh)' : 'none', transition: 'all .18s',
          }}>
            {label}
          </button>
        ))}
      </div>

      {/* ════════════════════ MAP VIEW ════════════════════════════════════════ */}
      {activeTab === 'map' && (
        <>
          {/* Academy level banner */}
          <div style={{
            background: `linear-gradient(135deg,${tier.bg},rgba(253,250,244,.5))`,
            border: `1px solid ${tier.color}33`,
            borderRadius: 12, padding: '14px 18px',
            marginBottom: 20, display: 'flex', alignItems: 'center', gap: 14,
          }}>
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                <div style={{ fontFamily: 'var(--fH)', fontSize: '.92rem', letterSpacing: '.06em' }}>
                  Niveau d'Académie :
                  <span style={{ color: tier.color, marginLeft: 6 }}>{tier.label}</span>
                </div>
                <div style={{ fontFamily: 'var(--fH)', fontSize: '1.2rem', color: tier.color }}>Niv.{level}</div>
              </div>
              <div style={{ height: 7, background: 'var(--bd)', borderRadius: 4, overflow: 'hidden', maxWidth: 340 }}>
                <div style={{
                  height: '100%',
                  width: `${tierNext ? Math.round(((elo - tier.min) / (tierNext.min - tier.min)) * 100) : 100}%`,
                  background: `linear-gradient(90deg,${tier.color},${tier.color}aa)`,
                  borderRadius: 4, transition: 'width .8s ease',
                }} />
              </div>
              <div style={{ fontFamily: 'var(--fM)', fontSize: '.54rem', color: 'var(--muted)', marginTop: 4 }}>
                {tierNext ? `${elo} / ${tierNext.min} ELO → ${tierNext.label}` : `${elo} ELO — Rang Maximum atteint ✦`}
              </div>
            </div>
          </div>

          {/* ── CITY BUILDER TERRAIN ── */}
          <div style={{
            position: 'relative',
            background: `
              radial-gradient(ellipse 90% 50% at 50% 110%, ${tier.color}12 0%, transparent 65%),
              radial-gradient(ellipse 60% 30% at 50% 50%, rgba(253,250,244,.4) 0%, transparent 80%),
              linear-gradient(180deg, rgba(44,74,110,.03) 0%, ${tier.bg} 100%)
            `,
            border: `1.5px solid ${tier.color}22`,
            borderRadius: 20,
            padding: '48px 20px 32px',
            marginBottom: 22,
            overflow: 'hidden',
            minHeight: 340,
          }}>
            {/* Sky gradient at top */}
            <div style={{
              position: 'absolute', top: 0, left: 0, right: 0, height: 60,
              background: `linear-gradient(180deg,${tier.color}08,transparent)`,
              pointerEvents: 'none',
            }} />

            {/* Decorations — more appear at higher levels */}
            <Deco emoji="🌳" x={6}  y={72} size="1.8rem" opacity={0.5} animate />
            <Deco emoji="🌲" x={94} y={70} size="1.6rem" opacity={0.45} animate />
            <Deco emoji="🌿" x={18} y={86} size=".9rem"  opacity={0.4} />
            <Deco emoji="🌿" x={82} y={84} size=".9rem"  opacity={0.4} />
            <Deco emoji="⛲" x={50} y={92} size="1.1rem" opacity={0.35} />
            {level >= 2 && <Deco emoji="🏺" x={32} y={80} size="1rem" opacity={0.45} animate />}
            {level >= 2 && <Deco emoji="🏺" x={68} y={78} size="1rem" opacity={0.4} animate />}
            {level >= 3 && <Deco emoji="🗿" x={12} y={55} size="1.1rem" opacity={0.4} />}
            {level >= 3 && <Deco emoji="⚔️" x={88} y={52} size="1rem" opacity={0.35} />}
            {level >= 4 && <Deco emoji="🌟" x={50} y={8}  size="1.4rem" opacity={0.7} animate />}
            {level >= 4 && <Deco emoji="✨" x={25} y={18} size="1rem" opacity={0.5} animate />}
            {level >= 4 && <Deco emoji="✨" x={75} y={16} size="1rem" opacity={0.5} animate />}

            {/* Path between buildings (decorative) */}
            <svg style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none', opacity: 0.2 }}
              xmlns="http://www.w3.org/2000/svg">
              <path d="M 25% 80% Q 50% 70% 75% 80%" stroke={tier.color} strokeWidth="2" strokeDasharray="6 4" fill="none" />
              <path d="M 25% 80% Q 50% 95% 50% 90%" stroke={tier.color} strokeWidth="2" strokeDasharray="6 4" fill="none" />
              <path d="M 75% 80% Q 50% 95% 50% 90%" stroke={tier.color} strokeWidth="2" strokeDasharray="6 4" fill="none" />
            </svg>

            {/* 3-column layout: secondary | main | secondary */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1.6fr 1fr',
              gap: 16,
              position: 'relative', zIndex: 1,
              alignItems: 'end',
            }}>
              {/* Left — Bibliothèque → FallacyLibrary */}
              <BuildingCard building={BUILDINGS[0]} level={level} xp={xp} onClick={() => {}}
                modeLabel="Bibliothèque" modeIcon="📚" modeColor="#2C4A6E"
                onModeClick={() => setPage('library')} />

              {/* Center — Main Academy Building */}
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
                <MainAcademyBuilding
                  academyName={academyName}
                  tier={tier}
                  level={level}
                  elo={elo}
                />
                {/* Edit name button */}
                <button className="btn b-ghost b-sm"
                  onClick={() => setEditingName(true)}
                  style={{ fontSize: '.58rem', marginTop: 4 }}>
                  ✏️ Renommer
                </button>
              </div>

              {/* Right — Agora → lien Speed Run */}
              <BuildingCard building={BUILDINGS[1]} level={level} xp={xp} onClick={() => {}}
                modeLabel="Speed Run" modeIcon="⚡" modeColor="#8C3A30"
                onModeClick={() => setPage('daily')} />
            </div>

            {/* Bottom row — Hall des Débats + Stade (côte à côte) */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginTop: 18, position: 'relative', zIndex: 1 }}>
              <BuildingCard building={BUILDINGS[2]} level={level} xp={xp} onClick={() => {}}
                modeLabel="Siège Agora" modeIcon="⚔️" modeColor="#8C3A30"
                onModeClick={() => setPage('siege-agora')} />
              <div style={{ position: 'relative' }}>
                <BuildingCard building={BUILDINGS[3]} level={level} xp={xp} onClick={() => {}}
                  modeLabel="Tournoi" modeIcon="🏆" modeColor="#C6A15B"
                  onModeClick={() => setPage('tournament')} />
                {/* Badge LIVE si un tournoi est en cours */}
                {(()=>{
                  try {
                    const t = JSON.parse(localStorage.getItem('dx_tournament_alpha') || 'null');
                    if (t && t.status === 'active') return (
                      <div style={{
                        position: 'absolute', top: 4, right: 4, zIndex: 10,
                        background: '#E53935', color: '#fff', borderRadius: 20,
                        padding: '2px 8px', fontFamily: 'var(--fM)', fontSize: '.44rem',
                        fontWeight: 700, letterSpacing: '.08em',
                        animation: 'blink .9s infinite',
                        boxShadow: '0 2px 8px rgba(229,57,53,.5)',
                      }}>● LIVE</div>
                    );
                  } catch { return null; }
                  return null;
                })()}
              </div>
            </div>

            {/* Ground line */}
            <div style={{
              position: 'absolute', bottom: 0, left: 0, right: 0, height: 50,
              background: `linear-gradient(180deg,transparent,${tier.color}0a)`,
              pointerEvents: 'none',
            }} />
          </div>

          {/* Next upgrade prompt */}
          {level < 4 && (
            <div style={{
              background: `linear-gradient(135deg,rgba(44,74,110,.04),rgba(198,161,91,.03))`,
              border: '1px solid var(--bd)', borderRadius: 12, padding: '14px 18px',
              display: 'flex', alignItems: 'center', gap: 12,
            }}>
              <span style={{ fontSize: '1.3rem' }}>🚀</span>
              <div style={{ flex: 1 }}>
                <div style={{ fontFamily: 'var(--fB)', fontSize: '.75rem', fontWeight: 700, marginBottom: 2 }}>
                  Prochaine amélioration — Niveau {level + 1} ({ELO_TIERS[level].label})
                </div>
                <div style={{ fontFamily: 'var(--fM)', fontSize: '.58rem', color: 'var(--muted)' }}>
                  {level === 1 && `Atteignez ELO 1100 — encore ${Math.max(0, 1100 - elo)} points`}
                  {level === 2 && `Atteignez ELO 1400 — encore ${Math.max(0, 1400 - elo)} points`}
                  {level === 3 && `Atteignez ELO 1800 — encore ${Math.max(0, 1800 - elo)} points`}
                </div>
              </div>
              <button className="btn b-a b-sm" onClick={() => setPage('train')}>S'entraîner</button>
            </div>
          )}
        </>
      )}

      {/* ════════════════ PROGRESSION VIEW ═══════════════════════════════════ */}
      {activeTab === 'progression' && (
        <EloProgressionPath elo={elo} setPage={setPage} />
      )}

      {/* ════════════════════ SHOP VIEW ═══════════════════════════════════════ */}
      {activeTab === 'shop' && (
        <AcademyShop user={user} saveUser={saveUser} showToast={showToast} />
      )}

      {/* Edit academy name modal */}
      {editingName && (
        <EditAcademyNameModal
          current={academyName}
          userId={user?.id}
          onSave={name => { setAcademyName(name); showToast('🏰 Nom d\'académie mis à jour !', 'info'); }}
          onClose={() => setEditingName(false)}
        />
      )}
    </div>
  );
}
