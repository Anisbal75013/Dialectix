// ═══════════════════════════════════════════════════════════════════════════════
// DIALECTIX AI — AcademyMap.jsx
// Feature 2 : Le Monde des Académies — Visual Progression Map + Boutique
// ═══════════════════════════════════════════════════════════════════════════════
// • AcademyMap      — terrain CSS Grid avec 3 bâtiments évolutifs selon ELO/XP
// • AcademyShop     — boutique d'items (skins, drapeaux, titres)
// • Aucune dépendance extérieure — CSS inline uniquement
// ═══════════════════════════════════════════════════════════════════════════════

import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';

const SB = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
);

// ─── Données de la Boutique ───────────────────────────────────────────────────
const SHOP_ITEMS = [
  { id: 'skin_gold_orator',  name: 'Orateur d\'Or',         desc: 'Pour les vainqueurs qui brillent.',          type: 'avatar_skin',  emoji: '✨', isPremium: false, priceXp: 200 },
  { id: 'skin_philosopher',  name: 'Philosophe Classique',  desc: 'L\'avatar du sage de l\'Antiquité.',         type: 'avatar_skin',  emoji: '🏛', isPremium: false, priceXp: 350 },
  { id: 'skin_challenger',   name: 'Challenger des Ombres', desc: 'Identité mystérieuse redoutée.',             type: 'avatar_skin',  emoji: '⚔️', isPremium: false, priceXp: 500 },
  { id: 'flag_fire',         name: 'Bannière Ardente',      desc: 'Drapeau d\'académie pour les audacieux.',    type: 'academy_flag', emoji: '🔥', isPremium: false, priceXp: 150 },
  { id: 'flag_laurels',      name: 'Bannière des Lauriers', desc: 'La couronne du vainqueur.',                  type: 'academy_flag', emoji: '🏅', isPremium: false, priceXp: 300 },
  { id: 'title_rhetor',      name: 'Rhéteur Certifié',      desc: 'Titre des maîtres de la persuasion.',        type: 'title',        emoji: '🗣', isPremium: false, priceXp: 400 },
  { id: 'skin_shadow',       name: 'Ombre Dialectique',     desc: 'Édition Premium — identité secrète.',        type: 'avatar_skin',  emoji: '🌑', isPremium: true,  priceXp: 0   },
  { id: 'skin_phoenix',      name: 'Phénix Rhétorique',     desc: 'Édition Premium — renaît de chaque défaite.', type: 'avatar_skin', emoji: '🦅', isPremium: true,  priceXp: 0   },
  { id: 'flag_crown',        name: 'Bannière Royale',       desc: 'Édition Premium — académies d\'élite.',      type: 'academy_flag', emoji: '👑', isPremium: true,  priceXp: 0   },
  { id: 'title_sage',        name: 'Sage de l\'Arène',      desc: 'Édition Premium — le titre suprême.',        type: 'title',        emoji: '⭐', isPremium: true,  priceXp: 0   },
];

// ─── Niveaux des bâtiments selon ELO ─────────────────────────────────────────
function getBuildingLevel(elo = 1000) {
  if (elo >= 1800) return 4; // Légendaire
  if (elo >= 1400) return 3; // Avancé
  if (elo >= 1100) return 2; // Intermédiaire
  return 1;                  // Débutant
}

// ─── Données des bâtiments ────────────────────────────────────────────────────
const BUILDINGS = [
  {
    id: 'library',
    name: 'Bibliothèque',
    desc: 'Répertoire des arguments et techniques rhétoriques.',
    icon: '📚',
    levels: [
      { label: 'Cabane de parchemins',  scale: 0.55, color: '#8A7A60', stars: 1 },
      { label: 'Bibliothèque de Scribe',scale: 0.75, color: '#A05A2C', stars: 2 },
      { label: 'Grande Librairie',      scale: 0.90, color: '#2C4A6E', stars: 3 },
      { label: 'Bibliothèque d\'Alexandrie', scale: 1.0, color: '#C6A15B', stars: 4 },
    ],
    unlockXp: 0,
  },
  {
    id: 'agora',
    name: 'Agora',
    desc: 'Place publique où les débats se tiennent.',
    icon: '🏛',
    levels: [
      { label: 'Petite place de village', scale: 0.55, color: '#8A7A60', stars: 1 },
      { label: 'Forum des Rhéteurs',      scale: 0.75, color: '#3A6E52', stars: 2 },
      { label: 'Agora d\'Athènes',        scale: 0.90, color: '#2C4A6E', stars: 3 },
      { label: 'Grand Forum de Rome',     scale: 1.0,  color: '#C6A15B', stars: 4 },
    ],
    unlockXp: 50,
  },
  {
    id: 'hall',
    name: 'Hall des Débats',
    desc: 'L\'arène où se décident les championnats.',
    icon: '⚔️',
    levels: [
      { label: 'Salle de classe',         scale: 0.55, color: '#8A7A60', stars: 1 },
      { label: 'Hall de l\'Académie',     scale: 0.75, color: '#8C3A30', stars: 2 },
      { label: 'Amphithéâtre',            scale: 0.90, color: '#5A3A6E', stars: 3 },
      { label: 'Colisée Dialectique',     scale: 1.0,  color: '#C6A15B', stars: 4 },
    ],
    unlockXp: 200,
  },
];

// ─── Composant Étoiles ────────────────────────────────────────────────────────
function Stars({ count }) {
  return (
    <div style={{ display: 'flex', gap: 2, justifyContent: 'center' }}>
      {[1, 2, 3, 4].map(i => (
        <span key={i} style={{ fontSize: '.7rem', opacity: i <= count ? 1 : 0.2 }}>⭐</span>
      ))}
    </div>
  );
}

// ─── Bâtiment visuel ──────────────────────────────────────────────────────────
function BuildingCard({ building, level, xp, eloRequired }) {
  const [hover, setHover] = useState(false);
  const lvl = building.levels[Math.min(level - 1, 3)];
  const size = Math.round(80 + lvl.scale * 100);
  const isLocked = (xp || 0) < building.unlockXp;

  return (
    <div
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
        padding: '16px 12px',
        background: hover ? 'rgba(246,241,232,.95)' : 'rgba(246,241,232,.7)',
        border: `1px solid ${lvl.color}44`,
        borderRadius: 12,
        boxShadow: hover ? `0 8px 24px ${lvl.color}22` : '0 2px 8px rgba(40,28,8,.06)',
        transition: 'all .25s',
        cursor: 'default',
        position: 'relative',
        overflow: 'hidden',
        opacity: isLocked ? 0.5 : 1,
      }}
    >
      {isLocked && (
        <div style={{
          position: 'absolute', inset: 0, background: 'rgba(246,241,232,.82)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          borderRadius: 12, zIndex: 2, flexDirection: 'column', gap: 4,
        }}>
          <span style={{ fontSize: '1.4rem' }}>🔒</span>
          <span style={{ fontFamily: 'var(--fM)', fontSize: '.55rem', color: 'var(--muted)' }}>
            {building.unlockXp} XP requis
          </span>
        </div>
      )}
      {/* Building visual */}
      <div style={{
        fontSize: `${size * 0.018}rem`,
        lineHeight: 1,
        filter: `drop-shadow(0 4px 8px ${lvl.color}44)`,
        transform: `scale(${0.6 + lvl.scale * 0.5})`,
        transition: 'transform .4s cubic-bezier(.34,1.56,.64,1)',
        userSelect: 'none',
      }}>
        {building.icon}
      </div>
      {/* Ground shadow */}
      <div style={{
        width: `${Math.round(50 * lvl.scale + 20)}px`, height: 6,
        background: `radial-gradient(ellipse at center, ${lvl.color}33, transparent)`,
        borderRadius: '50%', marginTop: -8,
      }} />
      {/* Name */}
      <div style={{ fontFamily: 'var(--fH)', fontSize: '.72rem', letterSpacing: '.06em', color: 'var(--txt)', textAlign: 'center', marginTop: 2 }}>
        {building.name}
      </div>
      {/* Level label */}
      <div style={{ fontFamily: 'var(--fM)', fontSize: '.54rem', color: lvl.color, textAlign: 'center', lineHeight: 1.4 }}>
        {lvl.label}
      </div>
      <Stars count={lvl.stars} />
      {/* Description (on hover) */}
      {hover && !isLocked && (
        <div style={{
          position: 'absolute', bottom: '100%', left: '50%', transform: 'translateX(-50%)',
          background: '#1A1A1A', color: '#fff', padding: '6px 10px', borderRadius: 6,
          fontFamily: 'var(--fM)', fontSize: '.58rem', lineHeight: 1.5, whiteSpace: 'nowrap',
          zIndex: 10, boxShadow: '0 4px 12px rgba(0,0,0,.3)', marginBottom: 4,
          pointerEvents: 'none',
        }}>
          {building.desc}
        </div>
      )}
    </div>
  );
}

// ─── Boutique (Shop) ──────────────────────────────────────────────────────────
function AcademyShop({ user, saveUser, showToast }) {
  const [tab, setTab] = useState('avatar_skin');
  const [owned, setOwned] = useState([]);
  const [buying, setBuying] = useState(null);

  // Charger les items possédés depuis Supabase
  useEffect(() => {
    if (!user?.id) return;
    SB.from('user_shop_items')
      .select('item_id')
      .eq('user_id', user.id)
      .then(({ data }) => {
        if (data) setOwned(data.map(r => r.item_id));
      });
  }, [user?.id]);

  const handleBuy = async (item) => {
    if (!user) { showToast('Connectez-vous pour acheter un item', 'error'); return; }
    if (item.isPremium) { showToast('Item Premium — disponible prochainement !', 'info'); return; }
    if (owned.includes(item.id)) { showToast('Vous possédez déjà cet item !', 'info'); return; }
    if ((user.xp || 0) < item.priceXp) {
      showToast(`XP insuffisants — il vous faut ${item.priceXp - (user.xp || 0)} XP de plus.`, 'error');
      return;
    }
    setBuying(item.id);
    try {
      await SB.from('user_shop_items').insert({ user_id: user.id, item_id: item.id });
      setOwned(prev => [...prev, item.id]);
      const updUser = { ...user, xp: (user.xp || 0) - item.priceXp };
      saveUser(updUser);
      showToast(`✨ "${item.name}" débloqué ! (-${item.priceXp} XP)`, 'achievement');
    } catch (e) {
      showToast('Erreur lors de l\'achat. Réessayez.', 'error');
    }
    setBuying(null);
  };

  const TABS = [
    { id: 'avatar_skin',  label: 'Tenues',  icon: '👤' },
    { id: 'academy_flag', label: 'Drapeaux', icon: '🚩' },
    { id: 'title',        label: 'Titres',   icon: '🎖' },
  ];

  const filteredItems = SHOP_ITEMS.filter(i => i.type === tab);

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
        <div>
          <div style={{ fontFamily: 'var(--fH)', fontSize: '1rem', letterSpacing: '.1em', textTransform: 'uppercase' }}>
            🛍 Boutique
          </div>
          <div style={{ fontFamily: 'var(--fM)', fontSize: '.58rem', color: 'var(--muted)', marginTop: 2 }}>
            Débloquez tenues, drapeaux et titres avec vos XP
          </div>
        </div>
        {user && (
          <div style={{ background: 'rgba(198,161,91,.12)', border: '1px solid rgba(198,161,91,.3)', borderRadius: 8, padding: '6px 14px', textAlign: 'center' }}>
            <div style={{ fontFamily: 'var(--fH)', fontSize: '1.1rem', color: 'var(--Y)' }}>{user.xp || 0}</div>
            <div style={{ fontFamily: 'var(--fM)', fontSize: '.5rem', color: 'var(--muted)' }}>XP</div>
          </div>
        )}
      </div>

      {/* Tabs */}
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

      {/* Items grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(150px,1fr))', gap: 10 }}>
        {filteredItems.map(item => {
          const isOwned = owned.includes(item.id);
          return (
            <div key={item.id} style={{
              background: '#FDFAF4', border: `1px solid ${item.isPremium ? 'rgba(198,161,91,.4)' : 'var(--bd)'}`,
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
                <div style={{
                  fontFamily: 'var(--fM)', fontSize: '.58rem', color: 'var(--G)',
                  background: 'rgba(58,110,82,.08)', border: '1px solid rgba(58,110,82,.25)',
                  borderRadius: 20, padding: '4px 12px', display: 'inline-block',
                }}>✓ Possédé</div>
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

// ─── Décorations du terrain ───────────────────────────────────────────────────
function MapDecoration({ emoji, x, y, size = '1.2rem', opacity = 0.6 }) {
  return (
    <div style={{
      position: 'absolute', left: `${x}%`, top: `${y}%`,
      fontSize: size, opacity, userSelect: 'none', pointerEvents: 'none',
      transform: 'translate(-50%,-50%)',
    }}>
      {emoji}
    </div>
  );
}

// ─── AcademyMap — Composant principal ────────────────────────────────────────
export default function AcademyMap({ user, saveUser, showToast, setPage }) {
  const [activeTab, setActiveTab] = useState('map');
  const elo   = user?.elo   || 1000;
  const xp    = user?.xp    || 0;
  const level = getBuildingLevel(elo);

  // Progression globale de la carte
  const mapProgress = Math.min(100, Math.round(((elo - 1000) / 1000) * 100));

  return (
    <div className="page">
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 20, flexWrap: 'wrap', gap: 10 }}>
        <div>
          <div style={{ fontFamily: 'var(--fH)', fontSize: '1.4rem', letterSpacing: '.1em', textTransform: 'uppercase', marginBottom: 4 }}>
            🏰 Votre Académie
          </div>
          <div style={{ fontFamily: 'var(--fM)', fontSize: '.6rem', color: 'var(--muted)' }}>
            Développez vos bâtiments en gagnant de l'ELO · Boutique d'items exclusifs
          </div>
        </div>
        {user && (
          <div style={{ display: 'flex', gap: 8 }}>
            {[['ELO', elo, 'var(--Y)'], ['XP', xp, 'var(--O)']].map(([l, v, c]) => (
              <div key={l} style={{ textAlign: 'center', background: 'var(--s1)', borderRadius: 7, padding: '6px 14px', border: '1px solid var(--bd)' }}>
                <div style={{ fontFamily: 'var(--fH)', fontSize: '1.1rem', color: c }}>{v}</div>
                <div style={{ fontFamily: 'var(--fM)', fontSize: '.52rem', color: 'var(--muted)' }}>{l}</div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 2, background: 'var(--s2)', border: '1px solid var(--bd)', borderRadius: 9, padding: 4, marginBottom: 20 }}>
        {[['map', '🗺 Carte'], ['shop', '🛍 Boutique']].map(([id, label]) => (
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

      {/* ── MAP VIEW ── */}
      {activeTab === 'map' && (
        <>
          {/* Niveau de l'académie */}
          <div style={{
            background: 'linear-gradient(135deg,rgba(44,74,110,.05),rgba(198,161,91,.04))',
            border: '1px solid var(--bd)', borderRadius: 12, padding: '14px 18px',
            marginBottom: 18, display: 'flex', alignItems: 'center', gap: 14,
          }}>
            <div style={{ fontSize: '2rem' }}>🏰</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontFamily: 'var(--fH)', fontSize: '.9rem', letterSpacing: '.06em', marginBottom: 4 }}>
                Niveau d'Académie : {['Novice', 'Scribe', 'Philosophe', 'Légendaire'][level - 1]}
              </div>
              <div style={{ height: 6, background: 'var(--bd)', borderRadius: 3, overflow: 'hidden' }}>
                <div style={{
                  height: '100%', width: `${mapProgress}%`,
                  background: 'linear-gradient(90deg,var(--A),var(--Y))',
                  borderRadius: 3, transition: 'width .8s ease',
                }} />
              </div>
              <div style={{ fontFamily: 'var(--fM)', fontSize: '.54rem', color: 'var(--muted)', marginTop: 3 }}>
                {elo} / 2000 ELO pour Niveau Légendaire
              </div>
            </div>
            <div style={{ fontFamily: 'var(--fH)', fontSize: '1.6rem', color: 'var(--Y)' }}>Niv.{level}</div>
          </div>

          {/* Terrain visuel */}
          <div style={{
            position: 'relative',
            background: `
              radial-gradient(ellipse 80% 40% at 50% 110%, rgba(58,110,82,.12) 0%, transparent 70%),
              linear-gradient(180deg, rgba(44,74,110,.04) 0%, rgba(198,161,91,.06) 100%)
            `,
            border: '1px solid var(--bd)',
            borderRadius: 16,
            padding: '40px 20px 24px',
            marginBottom: 20,
            overflow: 'hidden',
            minHeight: 260,
          }}>
            {/* Décorations de fond */}
            <MapDecoration emoji="🌳" x={8}  y={75} size="1.6rem" opacity={0.5} />
            <MapDecoration emoji="🌲" x={92} y={72} size="1.4rem" opacity={0.45} />
            <MapDecoration emoji="🌿" x={22} y={88} size=".9rem"  opacity={0.4} />
            <MapDecoration emoji="🌿" x={78} y={85} size=".9rem"  opacity={0.4} />
            <MapDecoration emoji="⛲" x={50} y={90} size="1rem"   opacity={0.35} />
            {level >= 2 && <MapDecoration emoji="🏺" x={35} y={82} size=".9rem" opacity={0.4} />}
            {level >= 3 && <MapDecoration emoji="🗿" x={65} y={80} size="1rem"  opacity={0.4} />}
            {level >= 4 && <MapDecoration emoji="🌟" x={50} y={10} size="1.2rem" opacity={0.7} />}

            {/* Bâtiments */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
              gap: 12,
              position: 'relative', zIndex: 1,
            }}>
              {BUILDINGS.map(b => (
                <BuildingCard
                  key={b.id}
                  building={b}
                  level={level}
                  xp={xp}
                  eloRequired={b.unlockXp}
                />
              ))}
            </div>

            {/* Sol décoratif */}
            <div style={{
              position: 'absolute', bottom: 0, left: 0, right: 0, height: 40,
              background: 'linear-gradient(180deg,transparent,rgba(58,110,82,.08))',
              pointerEvents: 'none',
            }} />
          </div>

          {/* Prochaine amélioration */}
          {level < 4 && (
            <div style={{
              background: 'rgba(44,74,110,.04)', border: '1px solid rgba(44,74,110,.15)',
              borderRadius: 10, padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 12,
            }}>
              <span style={{ fontSize: '1.2rem' }}>🚀</span>
              <div style={{ flex: 1 }}>
                <div style={{ fontFamily: 'var(--fB)', fontSize: '.72rem', fontWeight: 600, marginBottom: 2 }}>
                  Prochaine amélioration — Niveau {level + 1}
                </div>
                <div style={{ fontFamily: 'var(--fM)', fontSize: '.58rem', color: 'var(--muted)' }}>
                  {level === 1 && `Atteignez ELO 1100 (encore ${Math.max(0, 1100 - elo)} points)`}
                  {level === 2 && `Atteignez ELO 1400 (encore ${Math.max(0, 1400 - elo)} points)`}
                  {level === 3 && `Atteignez ELO 1800 (encore ${Math.max(0, 1800 - elo)} points)`}
                </div>
              </div>
              <button className="btn b-a b-sm" onClick={() => setPage('train')}>
                S'entraîner
              </button>
            </div>
          )}
        </>
      )}

      {/* ── SHOP VIEW ── */}
      {activeTab === 'shop' && (
        <AcademyShop user={user} saveUser={saveUser} showToast={showToast} />
      )}
    </div>
  );
}
