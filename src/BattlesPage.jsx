/**
 * BattlesPage.jsx — Dialectix spectator mode
 *
 * Displays the list of recent public battles and allows reading
 * completed debate transcripts.
 * Route: page='battles'
 *
 * Storage keys:
 *   'dx_public_battles' — array of PublicBattle objects (written at debate end)
 *
 * Props: { user, setPage, showToast }
 */

import { useState, useEffect } from 'react';

/* ── Public battle storage helpers ──────────────────────────────────── */
export function savePublicBattle(battle) {
  try {
    const existing = JSON.parse(localStorage.getItem('dx_public_battles') || '[]');
    const updated  = [battle, ...existing].slice(0, 50); // keep last 50
    localStorage.setItem('dx_public_battles', JSON.stringify(updated));
  } catch { /* ignore */ }
}

export function getPublicBattles() {
  try {
    return JSON.parse(localStorage.getItem('dx_public_battles') || '[]');
  } catch { return []; }
}

/* ── Helpers ─────────────────────────────────────────────────────────── */
const VERDICT_COLORS = {
  'Victoire dominante': 'var(--G)',
  'Victoire nette':     'var(--A)',
  'Victoire serrée':    'var(--Y)',
  'Égalité':            'var(--muted)',
};

function fmtDate(ts) {
  if (!ts) return '';
  try {
    return new Date(ts).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
  } catch { return ''; }
}

function fmtTime(seconds) {
  if (!seconds) return '--:--';
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
}

/* ── Component ───────────────────────────────────────────────────────── */
export default function BattlesPage({ user, setPage, showToast }) {
  const [battles, setBattles]       = useState([]);
  const [selected, setSelected]     = useState(null);
  const [filter, setFilter]         = useState('all'); // 'all' | 'won' | 'drew' | 'lost'
  const [search, setSearch]         = useState('');

  useEffect(() => {
    setBattles(getPublicBattles());
  }, []);

  const displayed = battles.filter(b => {
    if (filter === 'won'  && b.verdict === 'Égalité') return false;
    if (filter === 'drew' && b.verdict !== 'Égalité') return false;
    if (search && !b.topic?.toLowerCase().includes(search.toLowerCase()) &&
        !b.nameA?.toLowerCase().includes(search.toLowerCase()) &&
        !b.nameB?.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  if (selected) {
    return <BattleTranscript battle={selected} onBack={() => setSelected(null)} user={user}/>;
  }

  return (
    <div style={{ maxWidth: 900, margin: '0 auto', padding: '32px 20px', fontFamily: 'var(--fB)' }}>

      {/* Header */}
      <div style={{ marginBottom: 28 }}>
        <div style={{ fontFamily: 'var(--fH)', fontSize: '1.3rem', letterSpacing: '.14em', color: 'var(--txt)', marginBottom: 6 }}>
          BATTLES <span style={{ color: 'var(--Y)' }}>RÉCENTES</span>
        </div>
        <div style={{ fontFamily: 'var(--fM)', fontSize: '.6rem', color: 'var(--muted)', letterSpacing: '.06em' }}>
          Lisez les débats terminés — mode spectateur
        </div>
      </div>

      {/* Search + filters */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 20, flexWrap: 'wrap', alignItems: 'center' }}>
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Rechercher par sujet ou joueur…"
          style={{ flex: 1, minWidth: 200, fontFamily: 'var(--fB)', fontSize: '.76rem', padding: '8px 14px', borderRadius: 7, border: '1px solid var(--bd)', background: '#FDFAF4', color: 'var(--txt)', outline: 'none' }}
        />
        {['all', 'won', 'drew'].map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            style={{ fontFamily: 'var(--fM)', fontSize: '.56rem', letterSpacing: '.06em', padding: '6px 14px', borderRadius: 20, border: `1px solid ${filter === f ? 'var(--A)' : 'var(--bd)'}`, background: filter === f ? 'rgba(44,74,110,.08)' : 'transparent', color: filter === f ? 'var(--A)' : 'var(--muted)', cursor: 'pointer' }}
          >
            {f === 'all' ? 'Tous' : f === 'won' ? 'Décisifs' : 'Égalités'}
          </button>
        ))}
      </div>

      {/* Stats bar */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 24, flexWrap: 'wrap' }}>
        {[
          { label: 'Débats enregistrés', value: battles.length, color: 'var(--A)' },
          { label: 'Arguments total',    value: battles.reduce((s,b) => s + (b.argCount || 0), 0), color: 'var(--Y)' },
          { label: 'Joueurs uniques',    value: new Set(battles.flatMap(b => [b.nameA, b.nameB]).filter(Boolean)).size, color: 'var(--G)' },
        ].map(s => (
          <div key={s.label} style={{ padding: '10px 18px', background: '#FDFAF4', border: '1px solid var(--bd)', borderRadius: 8, boxShadow: 'var(--sh)', textAlign: 'center', minWidth: 90 }}>
            <div style={{ fontFamily: 'var(--fH)', fontSize: '1.2rem', color: s.color, lineHeight: 1 }}>{s.value}</div>
            <div style={{ fontFamily: 'var(--fM)', fontSize: '.5rem', color: 'var(--muted)', marginTop: 3, textTransform: 'uppercase', letterSpacing: '.06em' }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Battle list */}
      {displayed.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--muted)' }}>
          <div style={{ fontSize: '2.5rem', marginBottom: 14 }}>🤺</div>
          <div style={{ fontFamily: 'var(--fH)', fontSize: '1rem', letterSpacing: '.1em', marginBottom: 8 }}>Aucun débat disponible</div>
          <div style={{ fontFamily: 'var(--fM)', fontSize: '.66rem' }}>
            Les débats terminés apparaîtront ici automatiquement.
          </div>
          {user && (
            <button className="btn b-a b-sm" style={{ marginTop: 20 }} onClick={() => setPage('train')}>
              Débuter maintenant →
            </button>
          )}
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {displayed.map((b, i) => (
            <BattleCard key={b.id || i} battle={b} onSelect={() => setSelected(b)} currentUser={user}/>
          ))}
        </div>
      )}
    </div>
  );
}

/* ── BattleCard ──────────────────────────────────────────────────────── */
function BattleCard({ battle, onSelect, currentUser }) {
  const vc = VERDICT_COLORS[battle.verdict] || 'var(--muted)';
  const isUserInvolved = currentUser && (battle.nameA === currentUser.name || battle.nameB === currentUser.name);

  return (
    <div
      onClick={onSelect}
      style={{ background: isUserInvolved ? 'rgba(44,74,110,.03)' : '#FDFAF4', border: `1px solid ${isUserInvolved ? 'var(--A)' : 'var(--bd)'}`, borderRadius: 10, padding: '16px 20px', cursor: 'pointer', display: 'flex', gap: 16, alignItems: 'center', flexWrap: 'wrap', boxShadow: 'var(--sh)', transition: 'all .14s' }}
      onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = 'var(--sh2)'; }}
      onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = 'var(--sh)'; }}
    >
      {/* Verdict badge */}
      <div style={{ width: 52, height: 52, borderRadius: 10, background: vc+'12', border: `1px solid ${vc}28`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        <span style={{ fontFamily: 'var(--fH)', fontSize: '1.3rem' }}>
          {battle.verdict === 'Égalité' ? '⚖️' : '⚔️'}
        </span>
      </div>

      {/* Topic + players */}
      <div style={{ flex: 1, minWidth: 180 }}>
        <div style={{ fontFamily: 'var(--fH)', fontSize: '.82rem', color: 'var(--txt)', letterSpacing: '.02em', marginBottom: 5, lineHeight: 1.3 }}>
          {battle.topic || 'Sujet non renseigné'}
        </div>
        <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
          <span style={{ fontFamily: 'var(--fM)', fontSize: '.56rem', padding: '2px 8px', background: 'rgba(44,74,110,.08)', border: '1px solid rgba(44,74,110,.2)', borderRadius: 10, color: 'var(--A)' }}>{battle.nameA || 'Joueur A'}</span>
          <span style={{ fontFamily: 'var(--fM)', fontSize: '.54rem', color: 'var(--muted)' }}>vs</span>
          <span style={{ fontFamily: 'var(--fM)', fontSize: '.56rem', padding: '2px 8px', background: 'rgba(140,58,48,.08)', border: '1px solid rgba(140,58,48,.2)', borderRadius: 10, color: 'var(--B)' }}>{battle.nameB || 'Joueur B'}</span>
        </div>
      </div>

      {/* Scores */}
      <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexShrink: 0 }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontFamily: 'var(--fH)', fontSize: '1.1rem', color: 'var(--A)', lineHeight: 1 }}>{battle.scoreA?.toFixed(1) || '--'}</div>
          <div style={{ fontFamily: 'var(--fM)', fontSize: '.48rem', color: 'var(--muted)', marginTop: 2 }}>Score A</div>
        </div>
        <div style={{ fontFamily: 'var(--fM)', fontSize: '.6rem', color: 'var(--muted)' }}>·</div>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontFamily: 'var(--fH)', fontSize: '1.1rem', color: 'var(--B)', lineHeight: 1 }}>{battle.scoreB?.toFixed(1) || '--'}</div>
          <div style={{ fontFamily: 'var(--fM)', fontSize: '.48rem', color: 'var(--muted)', marginTop: 2 }}>Score B</div>
        </div>
      </div>

      {/* Meta */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4, alignItems: 'flex-end', flexShrink: 0 }}>
        {battle.verdict && (
          <span style={{ fontFamily: 'var(--fM)', fontSize: '.5rem', padding: '2px 8px', background: vc+'14', border: `1px solid ${vc}28`, borderRadius: 10, color: vc, letterSpacing: '.04em' }}>
            {battle.verdict}
          </span>
        )}
        {battle.argCount && (
          <span style={{ fontFamily: 'var(--fM)', fontSize: '.5rem', color: 'var(--muted)' }}>{battle.argCount} args · {fmtTime(battle.elapsed)}</span>
        )}
        <span style={{ fontFamily: 'var(--fM)', fontSize: '.5rem', color: 'var(--muted)' }}>{fmtDate(battle.timestamp)}</span>
        <span style={{ fontFamily: 'var(--fM)', fontSize: '.5rem', color: 'var(--A)', letterSpacing: '.04em' }}>Lire →</span>
      </div>
    </div>
  );
}

/* ── BattleTranscript ─────────────────────────────────────────────────── */
function BattleTranscript({ battle, onBack, user }) {
  const [activeTab, setActiveTab] = useState('transcript');
  const tx = battle.transcript || [];

  return (
    <div style={{ maxWidth: 860, margin: '0 auto', padding: '32px 20px' }}>
      {/* Back */}
      <button
        onClick={onBack}
        style={{ fontFamily: 'var(--fH)', fontSize: '.64rem', letterSpacing: '.06em', padding: '8px 16px', borderRadius: 7, border: '1px solid var(--bd)', background: '#FDFAF4', color: 'var(--txt)', cursor: 'pointer', marginBottom: 24 }}
      >
        ← Retour aux battles
      </button>

      {/* Title */}
      <div style={{ background: '#FDFAF4', border: '1px solid var(--bd)', borderRadius: 10, padding: '20px 24px', marginBottom: 20, boxShadow: 'var(--sh)' }}>
        <div style={{ fontFamily: 'var(--fH)', fontSize: '1rem', letterSpacing: '.06em', color: 'var(--txt)', marginBottom: 10, lineHeight: 1.4 }}>{battle.topic}</div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
          <span style={{ fontFamily: 'var(--fM)', fontSize: '.56rem', padding: '2px 8px', background: 'rgba(44,74,110,.08)', border: '1px solid rgba(44,74,110,.2)', borderRadius: 10, color: 'var(--A)' }}>{battle.nameA}</span>
          <span style={{ fontFamily: 'var(--fH)', fontSize: '.82rem', color: 'var(--Y)' }}>{battle.scoreA?.toFixed(1)}</span>
          <span style={{ fontFamily: 'var(--fM)', fontSize: '.6rem', color: 'var(--muted)' }}>vs</span>
          <span style={{ fontFamily: 'var(--fH)', fontSize: '.82rem', color: 'var(--Y)' }}>{battle.scoreB?.toFixed(1)}</span>
          <span style={{ fontFamily: 'var(--fM)', fontSize: '.56rem', padding: '2px 8px', background: 'rgba(140,58,48,.08)', border: '1px solid rgba(140,58,48,.2)', borderRadius: 10, color: 'var(--B)' }}>{battle.nameB}</span>
          {battle.verdict && (
            <span style={{ fontFamily: 'var(--fM)', fontSize: '.5rem', padding: '2px 10px', background: (VERDICT_COLORS[battle.verdict]||'var(--muted)')+'14', border: `1px solid ${(VERDICT_COLORS[battle.verdict]||'var(--muted)')}28`, borderRadius: 10, color: VERDICT_COLORS[battle.verdict]||'var(--muted)', marginLeft: 'auto' }}>
              {battle.verdict}
            </span>
          )}
        </div>
        {battle.winner && (
          <div style={{ fontFamily: 'var(--fH)', fontSize: '.72rem', color: 'var(--G)', marginTop: 10, letterSpacing: '.06em' }}>
            🏅 Vainqueur · {battle.winner}
          </div>
        )}
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 16 }}>
        {['transcript', 'report'].map(t => (
          <button key={t} onClick={() => setActiveTab(t)} style={{ fontFamily: 'var(--fH)', fontSize: '.62rem', letterSpacing: '.08em', padding: '7px 16px', borderRadius: 7, border: `1px solid ${activeTab===t ? 'var(--A)' : 'var(--bd)'}`, background: activeTab===t ? 'rgba(44,74,110,.08)' : 'transparent', color: activeTab===t ? 'var(--A)' : 'var(--muted)', cursor: 'pointer' }}>
            {t === 'transcript' ? '📜 Transcription' : '📊 Rapport'}
          </button>
        ))}
      </div>

      {/* Transcript tab */}
      {activeTab === 'transcript' && (
        <div style={{ background: '#FDFAF4', border: '1px solid var(--bd)', borderRadius: 10, overflow: 'hidden', boxShadow: 'var(--sh)' }}>
          {tx.length === 0 ? (
            <div style={{ padding: '40px', textAlign: 'center', color: 'var(--muted)', fontFamily: 'var(--fM)', fontSize: '.72rem' }}>
              Transcription non disponible pour ce débat.
            </div>
          ) : tx.map((e, i) => (
            <div key={e.id || i} style={{ display: 'flex', gap: 14, padding: '14px 18px', borderBottom: i < tx.length-1 ? '1px solid var(--bd)' : 'none', borderLeft: `4px solid ${e.side==='A'?'var(--A)':'var(--B)'}`, background: i%2===0 ? 'transparent' : 'rgba(40,28,8,.012)' }}>
              <div style={{ flexShrink: 0, width: 60, display: 'flex', flexDirection: 'column', gap: 3 }}>
                <span style={{ fontFamily: 'var(--fM)', fontSize: '.52rem', padding: '2px 7px', borderRadius: 8, background: e.side==='A'?'rgba(44,74,110,.1)':'rgba(140,58,48,.1)', color: e.side==='A'?'var(--A)':'var(--B)', fontWeight: 700 }}>
                  {e.side==='A' ? battle.nameA?.split(' ')[0] : battle.nameB?.split(' ')[0]}
                </span>
                {e.strength!=null && <div style={{ fontFamily: 'var(--fH)', fontSize: '.7rem', color: 'var(--Y)' }}>{(+e.strength).toFixed(0)}/10</div>}
              </div>
              <div style={{ flex: 1 }}>
                <p style={{ fontFamily: 'var(--fC)', fontSize: '.88rem', color: 'var(--txt)', lineHeight: 1.7, fontStyle: 'italic', margin: '0 0 4px' }}>
                  {e.formalized || e.raw || '—'}
                </p>
                {e.analysis && (
                  <p style={{ fontFamily: 'var(--fM)', fontSize: '.58rem', color: 'var(--dim)', lineHeight: 1.5, margin: 0, paddingTop: 4, borderTop: '1px dashed var(--bd)' }}>
                    🤖 {e.analysis}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Report tab */}
      {activeTab === 'report' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {battle.aiReport ? (
            <>
              {[
                { label: 'Résumé', body: battle.aiReport.summary },
                { label: `Point fort de ${battle.nameA}`, body: battle.aiReport.strongest_a },
                { label: `Point fort de ${battle.nameB}`, body: battle.aiReport.strongest_b },
                { label: `Conseil pour ${battle.nameA}`, body: battle.aiReport.rec_a },
                { label: `Conseil pour ${battle.nameB}`, body: battle.aiReport.rec_b },
              ].filter(r => r.body).map((r, i) => (
                <div key={i} style={{ background: '#FDFAF4', border: '1px solid var(--bd)', borderRadius: 9, padding: '14px 18px', boxShadow: 'var(--sh)' }}>
                  <div style={{ fontFamily: 'var(--fM)', fontSize: '.54rem', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: 7 }}>{r.label}</div>
                  <p style={{ fontFamily: 'var(--fB)', fontSize: '.8rem', color: 'var(--txt)', lineHeight: 1.65, margin: 0 }}>{r.body}</p>
                </div>
              ))}
            </>
          ) : (
            <div style={{ padding: '40px', textAlign: 'center', color: 'var(--muted)', fontFamily: 'var(--fM)', fontSize: '.72rem' }}>
              Rapport IA non disponible pour ce débat.
            </div>
          )}
        </div>
      )}
    </div>
  );
}
