// ═══════════════════════════════════════════════════════════════════════════════
// DIALECTIX AI — CompetitiveLobby.jsx
// Feature 5 : Refonte de la Page Compétitif — Système de Lobby
// ═══════════════════════════════════════════════════════════════════════════════
// • Liste des Salles Ouvertes (Supabase Realtime)
// • Créer un défi : titre, sujet, mode (direct/programmé), expiration
// • Toast sonore/visuel quand une nouvelle salle apparaît
// • Logique de rendez-vous : Direct ou Programmé
// ═══════════════════════════════════════════════════════════════════════════════

import { useState, useEffect, useRef, useCallback } from 'react';
import { createClient } from '@supabase/supabase-js';

const SB = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
);

const TOPICS = [
  "L'IA va-t-elle détruire plus d'emplois qu'elle n'en créera ?",
  "La démocratie directe est-elle supérieure à la représentative ?",
  "Les données personnelles doivent-elles appartenir aux individus ?",
  "Le capitalisme est-il le meilleur système économique possible ?",
  "La nature humaine est-elle fondamentalement bonne ?",
  "Faut-il interdire les voitures dans les centres-villes ?",
  "Le sport professionnel mérite-t-il ses salaires astronomiques ?",
  "L'exploration spatiale est-elle une priorité pour l'humanité ?",
  "Le végétarisme devrait-il être encouragé par la loi ?",
  "Les réseaux sociaux appauvrissent-ils le débat démocratique ?",
];

const EXPIRY_OPTIONS = [
  { value: 5,  label: '5 minutes' },
  { value: 30, label: '30 minutes' },
  { value: 60, label: '1 heure' },
];

function fmtCountdown(ms) {
  if (ms <= 0) return 'Expiré';
  const s = Math.floor(ms / 1000);
  const m = Math.floor(s / 60);
  const h = Math.floor(m / 60);
  if (h > 0) return `${h}h ${m % 60}min`;
  if (m > 0) return `${m}min ${s % 60}s`;
  return `${s}s`;
}

// ─── Badge ELO court ──────────────────────────────────────────────────────────
function EloBadge({ elo }) {
  const color = elo >= 1800 ? '#C6A15B' : elo >= 1400 ? '#5A3A6E' : elo >= 1100 ? '#2C4A6E' : '#8A7A60';
  return (
    <span style={{
      fontFamily: 'var(--fH)', fontSize: '.62rem', color, padding: '1px 7px',
      border: `1px solid ${color}44`, borderRadius: 10, background: `${color}12`,
    }}>
      {elo} ELO
    </span>
  );
}

// ─── Carte d'une salle ouverte ────────────────────────────────────────────────
function RoomCard({ room, onJoin, currentUserId }) {
  const [timeLeft, setTimeLeft] = useState(new Date(room.expires_at) - Date.now());
  const isOwn = room.creator_id === currentUserId;

  useEffect(() => {
    const iv = setInterval(() => setTimeLeft(new Date(room.expires_at) - Date.now()), 1000);
    return () => clearInterval(iv);
  }, [room.expires_at]);

  const expired = timeLeft <= 0;

  return (
    <div style={{
      background: '#FDFAF4', border: `1px solid ${isOwn ? 'rgba(44,74,110,.3)' : 'var(--bd)'}`,
      borderRadius: 10, padding: '14px 16px', boxShadow: 'var(--sh)',
      opacity: expired ? 0.5 : 1, transition: 'opacity .3s',
    }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: 8 }}>
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 7, flexWrap: 'wrap', marginBottom: 4 }}>
            <div style={{ fontFamily: 'var(--fH)', fontSize: '.82rem', letterSpacing: '.04em' }}>
              {room.title}
            </div>
            {room.mode === 'scheduled' && (
              <span style={{
                fontFamily: 'var(--fM)', fontSize: '.5rem', color: 'var(--P)',
                background: 'rgba(90,58,110,.08)', border: '1px solid rgba(90,58,110,.25)',
                borderRadius: 10, padding: '1px 6px',
              }}>📅 Programmé</span>
            )}
            {isOwn && (
              <span style={{
                fontFamily: 'var(--fM)', fontSize: '.5rem', color: 'var(--A)',
                background: 'rgba(44,74,110,.08)', border: '1px solid rgba(44,74,110,.22)',
                borderRadius: 10, padding: '1px 6px',
              }}>vous</span>
            )}
          </div>
          <div style={{ fontFamily: 'var(--fC)', fontSize: '.82rem', color: 'var(--dim)', fontStyle: 'italic', lineHeight: 1.5, marginBottom: 6 }}>
            {room.topic}
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
            <EloBadge elo={room.creator_elo || 1000} />
            <span style={{ fontFamily: 'var(--fM)', fontSize: '.56rem', color: 'var(--muted)' }}>
              par {room.creator_name}
            </span>
          </div>
        </div>
        <div style={{ textAlign: 'right', flexShrink: 0 }}>
          <div style={{
            fontFamily: 'var(--fM)', fontSize: '.56rem',
            color: timeLeft < 60000 ? 'var(--B)' : timeLeft < 300000 ? 'var(--O)' : 'var(--muted)',
            marginBottom: 8,
          }}>
            ⏱ {fmtCountdown(timeLeft)}
          </div>
          {!expired && !isOwn && (
            <button className="btn b-a b-sm" onClick={() => onJoin(room)}>
              ⚔️ Rejoindre
            </button>
          )}
          {expired && (
            <span style={{ fontFamily: 'var(--fM)', fontSize: '.55rem', color: 'var(--muted)' }}>Expiré</span>
          )}
        </div>
      </div>
      {room.mode === 'scheduled' && room.scheduled_at && (
        <div style={{
          fontFamily: 'var(--fM)', fontSize: '.56rem', color: 'var(--P)',
          background: 'rgba(90,58,110,.05)', border: '1px solid rgba(90,58,110,.15)',
          borderRadius: 6, padding: '5px 10px', marginTop: 4,
        }}>
          📅 Programmé pour : {new Date(room.scheduled_at).toLocaleString('fr-FR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
        </div>
      )}
    </div>
  );
}

// ─── Formulaire de création de salle ─────────────────────────────────────────
function CreateRoomForm({ user, onCreated, onCancel, showToast }) {
  const [title, setTitle]       = useState('');
  const [topic, setTopic]       = useState(TOPICS[0]);
  const [customTopic, setCustomTopic] = useState('');
  const [mode, setMode]         = useState('direct');
  const [expiry, setExpiry]     = useState(30);
  const [scheduledAt, setScheduledAt] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const finalTopic = customTopic.trim() || topic;

  const handleSubmit = async () => {
    if (!title.trim()) { showToast('Donnez un titre à votre défi', 'error'); return; }
    if (!finalTopic.trim()) { showToast('Choisissez ou saisissez un sujet', 'error'); return; }
    if (mode === 'scheduled' && !scheduledAt) { showToast('Choisissez une date/heure pour le défi programmé', 'error'); return; }

    setSubmitting(true);
    const expiresAt = new Date(Date.now() + expiry * 60 * 1000).toISOString();
    const { error } = await SB.from('debate_rooms').insert({
      creator_id:   user.id,
      creator_name: user.name?.split(' ')[0] || 'Joueur',
      creator_elo:  user.elo || 1000,
      title:        title.trim(),
      topic:        finalTopic,
      mode,
      scheduled_at: mode === 'scheduled' && scheduledAt ? new Date(scheduledAt).toISOString() : null,
      expires_at:   expiresAt,
      status:       'open',
    });
    setSubmitting(false);
    if (error) {
      showToast('Erreur lors de la création. Vérifiez votre connexion.', 'error');
      return;
    }
    showToast('🎯 Défi publié ! En attente d\'un adversaire.', 'info');
    onCreated();
  };

  return (
    <div style={{
      background: '#FDFAF4', border: '1px solid var(--bd2)', borderRadius: 12,
      padding: '22px 20px', boxShadow: 'var(--sh2)',
    }}>
      <div style={{ fontFamily: 'var(--fH)', fontSize: '.95rem', letterSpacing: '.08em', textTransform: 'uppercase', marginBottom: 16, color: 'var(--A)' }}>
        ＋ Proposer un Défi
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {/* Titre */}
        <div>
          <label className="fi-label">Titre du défi *</label>
          <input className="fi" placeholder="ex. Défi du soir — Qui maîtrise la rhétorique ?"
            value={title} onChange={e => setTitle(e.target.value)} />
        </div>

        {/* Sujet */}
        <div>
          <label className="fi-label">Sujet de débat *</label>
          <select className="fi" value={topic} onChange={e => setTopic(e.target.value)}>
            {TOPICS.map((t, i) => <option key={i} value={t}>{t.length > 60 ? t.slice(0, 60) + '…' : t}</option>)}
          </select>
          <input className="fi" style={{ marginTop: 6 }}
            placeholder="Ou saisissez votre propre sujet…"
            value={customTopic} onChange={e => setCustomTopic(e.target.value)} />
        </div>

        {/* Mode */}
        <div>
          <label className="fi-label">Mode de jeu</label>
          <div style={{ display: 'flex', gap: 6 }}>
            {[['direct', '⚡ Direct', 'Départ immédiat dès qu\'un adversaire rejoint'], ['scheduled', '📅 Programmé', 'Fixez une date et heure précise']].map(([v, l, d]) => (
              <button key={v} onClick={() => setMode(v)} style={{
                flex: 1, padding: '10px 8px', border: `2px solid ${mode === v ? 'var(--A)' : 'var(--bd)'}`,
                borderRadius: 8, cursor: 'pointer', background: mode === v ? 'rgba(44,74,110,.06)' : 'transparent',
                transition: 'all .15s',
              }}>
                <div style={{ fontFamily: 'var(--fB)', fontSize: '.72rem', fontWeight: 600, color: mode === v ? 'var(--A)' : 'var(--txt)' }}>{l}</div>
                <div style={{ fontFamily: 'var(--fM)', fontSize: '.54rem', color: 'var(--muted)', marginTop: 3, lineHeight: 1.4 }}>{d}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Date/heure si programmé */}
        {mode === 'scheduled' && (
          <div>
            <label className="fi-label">Date et heure du débat *</label>
            <input type="datetime-local" className="fi"
              value={scheduledAt} onChange={e => setScheduledAt(e.target.value)}
              min={new Date(Date.now() + 5 * 60000).toISOString().slice(0, 16)} />
          </div>
        )}

        {/* Expiration */}
        <div>
          <label className="fi-label">Expiration de la proposition</label>
          <div style={{ display: 'flex', gap: 6 }}>
            {EXPIRY_OPTIONS.map(o => (
              <button key={o.value} onClick={() => setExpiry(o.value)} style={{
                flex: 1, padding: '7px 8px', border: `1px solid ${expiry === o.value ? 'var(--A)' : 'var(--bd)'}`,
                borderRadius: 7, cursor: 'pointer', fontFamily: 'var(--fM)', fontSize: '.6rem',
                background: expiry === o.value ? 'rgba(44,74,110,.06)' : 'transparent',
                color: expiry === o.value ? 'var(--A)' : 'var(--muted)',
                fontWeight: expiry === o.value ? 700 : 400, transition: 'all .15s',
              }}>
                {o.label}
              </button>
            ))}
          </div>
        </div>

        {/* Boutons */}
        <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
          <button className="btn b-a" onClick={handleSubmit} disabled={submitting} style={{ flex: 1, justifyContent: 'center' }}>
            {submitting ? <><div className="spin" /> Publication…</> : '🎯 Publier le défi'}
          </button>
          <button className="btn b-ghost" onClick={onCancel}>Annuler</button>
        </div>
      </div>
    </div>
  );
}

// ─── Lobby Principal ──────────────────────────────────────────────────────────
export default function CompetitiveLobby({ user, showToast, onJoinRoom, startMM, mmPhase, mmTimer, cancelMM, mmPlayBot, selFormat, setSelFormat, FORMATS }) {
  const [rooms, setRooms]           = useState([]);
  const [showCreate, setShowCreate] = useState(false);
  const [loading, setLoading]       = useState(true);
  const [tab, setTab]               = useState('lobby'); // lobby | matchmaking
  const prevRoomCount               = useRef(0);
  const audioCtxRef                 = useRef(null);

  // Jouer un son de notification discret
  const playNotifSound = useCallback(() => {
    try {
      const ctx = audioCtxRef.current || (audioCtxRef.current = new (window.AudioContext || window.webkitAudioContext)());
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain); gain.connect(ctx.destination);
      osc.frequency.setValueAtTime(880, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(440, ctx.currentTime + 0.2);
      gain.gain.setValueAtTime(0.15, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);
      osc.start(); osc.stop(ctx.currentTime + 0.4);
    } catch {}
  }, []);

  // Charger les salles ouvertes
  const loadRooms = useCallback(async () => {
    const { data } = await SB
      .from('debate_rooms')
      .select('*')
      .eq('status', 'open')
      .gt('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false });
    if (data) {
      setRooms(data);
      // Notification si une nouvelle salle est apparue
      if (prevRoomCount.current > 0 && data.length > prevRoomCount.current) {
        const newest = data[0];
        if (newest?.creator_id !== user?.id) {
          showToast(`🎯 Nouveau défi disponible : "${newest?.title}"`, 'info');
          playNotifSound();
        }
      }
      prevRoomCount.current = data.length;
    }
    setLoading(false);
  }, [user?.id, showToast, playNotifSound]);

  // Abonnement Realtime Supabase
  useEffect(() => {
    loadRooms();
    const channel = SB.channel('debate_rooms_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'debate_rooms' }, loadRooms)
      .subscribe();
    return () => SB.removeChannel(channel);
  }, [loadRooms]);

  // Rejoindre une salle
  const handleJoin = async (room) => {
    if (!user) { showToast('Connectez-vous pour rejoindre un défi', 'error'); return; }
    if (room.creator_id === user.id) { showToast('Vous ne pouvez pas rejoindre votre propre défi.', 'info'); return; }
    // Marquer la salle comme matchée
    await SB.from('debate_rooms')
      .update({ status: 'matched', opponent_id: user.id, opponent_name: user.name?.split(' ')[0] || 'Adversaire' })
      .eq('id', room.id);
    showToast(`⚔️ Défi accepté ! Début du débat contre ${room.creator_name}`, 'info');
    onJoinRoom(room);
  };

  // Annuler sa propre salle
  const handleCancelRoom = async (room) => {
    await SB.from('debate_rooms').update({ status: 'cancelled' }).eq('id', room.id);
    showToast('Défi annulé.', 'info');
    loadRooms();
  };

  if (!user) return (
    <div className="lock-screen">
      <div className="lock-icon">🔒</div>
      <div style={{ fontFamily: 'var(--fH)', fontSize: '1.5rem', letterSpacing: '.1em' }}>Mode Compétitif</div>
      <div style={{ fontFamily: 'var(--fM)', fontSize: '.66rem', color: 'var(--muted)', maxWidth: 340, lineHeight: 1.85, textAlign: 'center' }}>
        Connectez-vous pour proposer des défis, affronter de vrais adversaires et grimper au classement.
      </div>
    </div>
  );

  // ── Matchmaking screen ────────────────────────────────────────────────────
  if (mmPhase === 'searching' || mmPhase === 'timedout') return (
    <div className="mm-screen">
      {mmPhase === 'searching' && <>
        <div className="mm-pulse">⚔️</div>
        <div style={{ fontFamily: 'var(--fH)', fontSize: '1.6rem', letterSpacing: '.1em', position: 'relative', zIndex: 1 }}>RECHERCHE</div>
        <div style={{ fontFamily: 'var(--fM)', fontSize: '.65rem', color: 'var(--muted)', position: 'relative', zIndex: 1, animation: 'blink 1.5s infinite' }}>
          ELO cible : {user.elo - 150}–{user.elo + 150} · {mmTimer}s / 20s
        </div>
        <div style={{ width: 220, height: 3, background: 'var(--bd)', borderRadius: 2, overflow: 'hidden', position: 'relative', zIndex: 1 }}>
          <div style={{ height: '100%', background: 'var(--A)', width: `${(mmTimer / 20) * 100}%`, transition: 'width 1s linear' }} />
        </div>
        <button className="btn b-ghost" style={{ position: 'relative', zIndex: 1 }} onClick={cancelMM}>Annuler</button>
      </>}
      {mmPhase === 'timedout' && <>
        <div style={{ fontSize: '2rem', position: 'relative', zIndex: 1 }}>⏱</div>
        <div style={{ fontFamily: 'var(--fH)', fontSize: '1.2rem', letterSpacing: '.1em', position: 'relative', zIndex: 1 }}>Aucun adversaire trouvé</div>
        <div style={{ fontFamily: 'var(--fM)', fontSize: '.65rem', color: 'var(--muted)', position: 'relative', zIndex: 1 }}>Dans la plage ELO ±150 de {user.elo}</div>
        <div className="mm-opts">
          <button className="btn b-ghost" onClick={() => { cancelMM(); startMM(); }}>🔄 Relancer</button>
          <button className="btn b-y" onClick={mmPlayBot}>🤖 Jouer vs Bot</button>
        </div>
      </>}
    </div>
  );

  return (
    <div className="page">
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 16, flexWrap: 'wrap', gap: 10 }}>
        <div>
          <div style={{ fontFamily: 'var(--fH)', fontSize: '1.3rem', letterSpacing: '.1em', textTransform: 'uppercase' }}>⚔️ Compétitif</div>
          <div style={{ fontFamily: 'var(--fM)', fontSize: '.6rem', color: 'var(--muted)', marginTop: 3 }}>Défiez de vrais adversaires — Classé ELO</div>
        </div>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          {[['Débats', user.debates], ['Victoires', user.wins], ['Taux', `${user.debates ? Math.round(user.wins / user.debates * 100) : 0}%`]].map(([l, v]) => (
            <div key={l} style={{ textAlign: 'center', background: 'var(--s1)', borderRadius: 6, padding: '7px 14px', border: '1px solid var(--bd)' }}>
              <div style={{ fontFamily: 'var(--fH)', fontSize: '1.1rem' }}>{v}</div>
              <div style={{ fontFamily: 'var(--fM)', fontSize: '.52rem', color: 'var(--muted)', textTransform: 'uppercase', marginTop: 1 }}>{l}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 2, background: 'var(--s2)', border: '1px solid var(--bd)', borderRadius: 9, padding: 4, marginBottom: 20 }}>
        {[['lobby', '🏟 Salles Ouvertes'], ['matchmaking', '⚡ Matchmaking']].map(([id, label]) => (
          <button key={id} onClick={() => setTab(id)} style={{
            flex: 1, padding: '9px 12px', border: 'none', borderRadius: 6, cursor: 'pointer',
            fontFamily: 'var(--fB)', fontSize: '.72rem', fontWeight: tab === id ? 700 : 500,
            background: tab === id ? '#FDFAF4' : 'transparent',
            color: tab === id ? 'var(--A)' : 'var(--muted)',
            boxShadow: tab === id ? 'var(--sh)' : 'none', transition: 'all .18s',
          }}>
            {label}
          </button>
        ))}
      </div>

      {/* ── LOBBY TAB ── */}
      {tab === 'lobby' && (
        <>
          {/* Créer un défi */}
          {!showCreate ? (
            <button className="btn b-a" onClick={() => setShowCreate(true)}
              style={{ width: '100%', justifyContent: 'center', marginBottom: 18, fontSize: '.75rem' }}>
              ＋ Proposer un défi
            </button>
          ) : (
            <div style={{ marginBottom: 20 }}>
              <CreateRoomForm
                user={user}
                onCreated={() => { setShowCreate(false); loadRooms(); }}
                onCancel={() => setShowCreate(false)}
                showToast={showToast}
              />
            </div>
          )}

          {/* Légende */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
            <div style={{ fontFamily: 'var(--fH)', fontSize: '.88rem', letterSpacing: '.08em', textTransform: 'uppercase' }}>
              🚪 Salles Ouvertes
              {!loading && <span style={{ fontFamily: 'var(--fM)', fontSize: '.58rem', color: 'var(--muted)', marginLeft: 8, fontWeight: 400, textTransform: 'none' }}>
                {rooms.filter(r => r.creator_id !== user.id).length} disponible(s)
              </span>}
            </div>
            <button className="btn b-ghost b-sm" onClick={loadRooms} style={{ fontSize: '.6rem' }}>↺ Actualiser</button>
          </div>

          {loading && (
            <div style={{ display: 'flex', justifyContent: 'center', padding: '40px 0' }}>
              <div style={{ width: 32, height: 32, border: '2px solid var(--bd)', borderTopColor: 'var(--A)', borderRadius: '50%', animation: 'spin .9s linear infinite' }} />
            </div>
          )}

          {!loading && rooms.length === 0 && (
            <div className="empty" style={{ minHeight: 140 }}>
              <div className="empty-i">⚔️</div>
              <div className="empty-t">Aucun défi disponible pour le moment</div>
              <div className="empty-d">Soyez le premier à lancer un défi !</div>
            </div>
          )}

          {!loading && rooms.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {rooms.map(room => (
                <div key={room.id} style={{ position: 'relative' }}>
                  <RoomCard room={room} onJoin={handleJoin} currentUserId={user.id} />
                  {room.creator_id === user.id && (
                    <button className="btn b-ghost b-sm"
                      onClick={() => handleCancelRoom(room)}
                      style={{ position: 'absolute', top: 8, right: 8, fontSize: '.55rem', color: 'var(--B)', borderColor: 'rgba(140,58,48,.2)', padding: '3px 8px' }}>
                      Annuler
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* ── MATCHMAKING TAB ── */}
      {tab === 'matchmaking' && (
        <div>
          <div className="card card-a" style={{ marginBottom: 16 }}>
            <div style={{ fontFamily: 'var(--fH)', fontSize: '.95rem', letterSpacing: '.1em', textTransform: 'uppercase', color: 'var(--A)', marginBottom: 10 }}>
              ⚡ Matchmaking Automatique
            </div>
            <div style={{ fontFamily: 'var(--fM)', fontSize: '.63rem', color: 'var(--dim)', lineHeight: 1.75, marginBottom: 12 }}>
              Trouve un adversaire dans votre fourchette ELO ±150.<br />
              Départ automatique dès la connexion.
            </div>
            <div style={{ marginBottom: 12 }}>
              <label className="fi-label">Format</label>
              <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                {FORMATS.map(f => (
                  <button key={f.id} className={`fmt-btn ${selFormat === f.id ? 'on' : ''}`}
                    onClick={() => setSelFormat(f.id)}
                    title={f.tooltip}>
                    {f.label}
                  </button>
                ))}
              </div>
            </div>
            <button className="btn b-a" onClick={startMM} style={{ width: '100%', justifyContent: 'center' }}>
              ⚔️ Lancer le Matchmaking
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
