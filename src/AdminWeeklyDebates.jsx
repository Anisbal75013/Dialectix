/**
 * AdminWeeklyDebates — Dialectix Module 2 (admin side)
 *
 * Admin panel for validating and publishing weekly debate topics.
 * Route: /admin/weekly-debates
 *
 * Props: { user, showToast, setPage }
 */

import { useState, useEffect } from 'react';
import {
  getAllTopics,
  generateMockWeeklyTopics,
  publishTopics,
  saveTopics,
  getWeeklyTopics,
} from './services/weeklyDebateService.js';

const CATEGORY_COLORS = {
  géopolitique: '#2C4A6E',
  science:      '#3A6E52',
  société:      '#C6A15B',
  économie:     '#5A3A6E',
  éthique:      '#8C3A30',
};

export default function AdminWeeklyDebates({ user, showToast, setPage }) {
  const [allTopics, setAllTopics]       = useState([]);
  const [selected, setSelected]         = useState(new Set());
  const [editingId, setEditingId]       = useState(null);
  const [editForm, setEditForm]         = useState({});
  const [generating, setGenerating]     = useState(false);
  const [filter, setFilter]             = useState('all');
  const [weekNumber, setWeekNumber]     = useState(1);

  /* ── Guard: admin only ─────────────────────────────────────────────────── */
  const isAdmin = user?.isAdmin || user?.email?.includes('admin');

  useEffect(() => {
    const topics = getAllTopics();
    setAllTopics(topics);
    const published = topics.filter(t => t.published);
    if (published.length) {
      setWeekNumber((published[published.length - 1]?.weekNumber || 0) + 1);
    }
  }, []);

  /* ── Generate proposals ─────────────────────────────────────────────────── */
  function handleGenerate() {
    setGenerating(true);
    setTimeout(() => {
      const mock = generateMockWeeklyTopics(weekNumber);
      const existing = getAllTopics();
      const merged = [...existing, ...mock.filter(n => !existing.find(e => e.id === n.id))];
      saveTopics(merged);
      setAllTopics(merged);
      setGenerating(false);
      showToast?.({ msg: `${mock.length} sujets générés pour la semaine ${weekNumber}`, type: 'success' });
    }, 1200);
  }

  /* ── Selection ──────────────────────────────────────────────────────────── */
  function toggleSelect(id) {
    setSelected(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  /* ── Edit ───────────────────────────────────────────────────────────────── */
  function startEdit(topic) {
    setEditingId(topic.id);
    setEditForm({ ...topic });
  }

  function saveEdit() {
    const updated = allTopics.map(t => t.id === editingId ? { ...t, ...editForm } : t);
    saveTopics(updated);
    setAllTopics(updated);
    setEditingId(null);
    showToast?.({ msg: 'Sujet mis à jour.', type: 'success' });
  }

  function cancelEdit() { setEditingId(null); setEditForm({}); }

  /* ── Publish ────────────────────────────────────────────────────────────── */
  function handlePublish() {
    if (selected.size === 0) {
      showToast?.({ msg: 'Sélectionnez au moins un sujet à publier.', type: 'error' });
      return;
    }
    if (selected.size > 5) {
      showToast?.({ msg: 'Maximum 5 sujets par semaine.', type: 'error' });
      return;
    }
    publishTopics([...selected]);
    const updated = getAllTopics();
    setAllTopics(updated);
    setSelected(new Set());
    showToast?.({ msg: `${selected.size} sujet(s) publiés pour la semaine ${weekNumber} !`, type: 'success' });
  }

  /* ── Filter ─────────────────────────────────────────────────────────────── */
  const displayed = allTopics.filter(t =>
    filter === 'all'       ? true :
    filter === 'published' ? t.published :
    filter === 'pending'   ? !t.published :
    t.category === filter
  );

  /* ── Guard render ───────────────────────────────────────────────────────── */
  if (!isAdmin) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', gap: 16 }}>
        <div style={{ fontSize: '2.5rem' }}>🔒</div>
        <div style={{ fontFamily: 'var(--fH)', fontSize: '1.1rem', color: 'var(--txt)', letterSpacing: '.08em' }}>ACCÈS RESTREINT</div>
        <div style={{ fontFamily: 'var(--fM)', fontSize: '.72rem', color: 'var(--muted)' }}>Cette page est réservée aux administrateurs Dialectix.</div>
        <button className="btn b-ghost b-sm" onClick={() => setPage?.('home')} style={{ marginTop: 8 }}>← Retour</button>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto', padding: '32px 20px', fontFamily: 'var(--fB)' }}>

      {/* ── Header ── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 32, flexWrap: 'wrap', gap: 16 }}>
        <div>
          <div style={{ fontFamily: 'var(--fH)', fontSize: '1.4rem', letterSpacing: '.14em', color: 'var(--txt)' }}>
            ADMIN — <span style={{ color: 'var(--Y)' }}>DIALECTIX ACTU</span>
          </div>
          <div style={{ fontFamily: 'var(--fM)', fontSize: '.6rem', color: 'var(--muted)', marginTop: 4, letterSpacing: '.08em' }}>
            Validation des sujets hebdomadaires — Semaine {weekNumber}
          </div>
        </div>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <button
            onClick={handleGenerate}
            disabled={generating}
            style={{ fontFamily: 'var(--fH)', fontSize: '.64rem', letterSpacing: '.06em', padding: '8px 16px', borderRadius: 7, border: '1px solid var(--bd2)', background: generating ? 'var(--s2)' : '#FDFAF4', color: 'var(--txt)', cursor: generating ? 'wait' : 'pointer' }}
          >
            {generating ? '⏳ Génération…' : '⚡ Générer 5 sujets'}
          </button>
          <button
            onClick={handlePublish}
            disabled={selected.size === 0}
            style={{ fontFamily: 'var(--fH)', fontSize: '.64rem', letterSpacing: '.06em', padding: '8px 16px', borderRadius: 7, border: 'none', background: selected.size > 0 ? 'var(--G)' : 'var(--s2)', color: selected.size > 0 ? '#fff' : 'var(--muted)', cursor: selected.size > 0 ? 'pointer' : 'default' }}
          >
            ✓ Publier ({selected.size}/5 sélectionnés)
          </button>
        </div>
      </div>

      {/* ── Stats bar ── */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 24, flexWrap: 'wrap' }}>
        {[
          { label: 'Total', value: allTopics.length, color: 'var(--A)' },
          { label: 'Publiés', value: allTopics.filter(t => t.published).length, color: 'var(--G)' },
          { label: 'En attente', value: allTopics.filter(t => !t.published).length, color: 'var(--Y)' },
          { label: 'Semaine actuelle', value: weekNumber, color: 'var(--O)' },
        ].map(s => (
          <div key={s.label} style={{ padding: '10px 18px', background: '#FDFAF4', border: '1px solid var(--bd)', borderRadius: 8, boxShadow: 'var(--sh)', textAlign: 'center', minWidth: 90 }}>
            <div style={{ fontFamily: 'var(--fH)', fontSize: '1.3rem', color: s.color, lineHeight: 1 }}>{s.value}</div>
            <div style={{ fontFamily: 'var(--fM)', fontSize: '.52rem', color: 'var(--muted)', marginTop: 3, textTransform: 'uppercase', letterSpacing: '.06em' }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* ── Filters ── */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
        {['all', 'published', 'pending', 'géopolitique', 'science', 'société', 'économie', 'éthique'].map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            style={{ fontFamily: 'var(--fM)', fontSize: '.56rem', letterSpacing: '.06em', padding: '5px 12px', borderRadius: 20, border: `1px solid ${filter === f ? 'var(--A)' : 'var(--bd)'}`, background: filter === f ? 'rgba(44,74,110,.08)' : 'transparent', color: filter === f ? 'var(--A)' : 'var(--muted)', cursor: 'pointer', textTransform: 'capitalize' }}
          >
            {f === 'all' ? 'Tous' : f === 'published' ? '✓ Publiés' : f === 'pending' ? '⏳ En attente' : f}
          </button>
        ))}
      </div>

      {/* ── Topics list ── */}
      {displayed.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '48px 0', color: 'var(--muted)', fontFamily: 'var(--fM)', fontSize: '.76rem' }}>
          Aucun sujet trouvé. Cliquez sur "Générer 5 sujets" pour commencer.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {displayed.map(topic => (
            <TopicCard
              key={topic.id}
              topic={topic}
              selected={selected.has(topic.id)}
              editing={editingId === topic.id}
              editForm={editForm}
              onToggleSelect={() => toggleSelect(topic.id)}
              onEdit={() => startEdit(topic)}
              onSaveEdit={saveEdit}
              onCancelEdit={cancelEdit}
              onEditFormChange={(field, val) => setEditForm(prev => ({ ...prev, [field]: val }))}
            />
          ))}
        </div>
      )}

      {/* ── Published topics preview ── */}
      {allTopics.some(t => t.published) && (
        <div style={{ marginTop: 40, padding: '24px', background: 'linear-gradient(160deg,rgba(44,74,110,.04),rgba(198,161,91,.03))', border: '1px solid var(--bd)', borderRadius: 10 }}>
          <div style={{ fontFamily: 'var(--fH)', fontSize: '.82rem', color: 'var(--txt)', letterSpacing: '.06em', marginBottom: 14 }}>
            ✓ SUJETS PUBLIÉS — Semaine {weekNumber - 1}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(200px,1fr))', gap: 10 }}>
            {allTopics.filter(t => t.published).slice(-5).map(t => (
              <div key={t.id} style={{ padding: '10px 14px', background: '#FDFAF4', border: '1px solid var(--bd)', borderLeft: `3px solid ${CATEGORY_COLORS[t.category] || 'var(--A)'}`, borderRadius: 7 }}>
                <div style={{ fontFamily: 'var(--fM)', fontSize: '.5rem', color: CATEGORY_COLORS[t.category] || 'var(--A)', textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: 5 }}>{t.category}</div>
                <div style={{ fontFamily: 'var(--fB)', fontSize: '.72rem', color: 'var(--txt)', lineHeight: 1.45 }}>{t.title}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/* ── TopicCard sub-component ──────────────────────────────────────────────── */
function TopicCard({ topic, selected, editing, editForm, onToggleSelect, onEdit, onSaveEdit, onCancelEdit, onEditFormChange }) {
  const catColor = CATEGORY_COLORS[topic.category] || 'var(--A)';

  if (editing) {
    return (
      <div style={{ background: '#FDFAF4', border: '2px solid var(--A)', borderRadius: 10, padding: '20px 24px', boxShadow: 'var(--sh2)' }}>
        <div style={{ fontFamily: 'var(--fH)', fontSize: '.72rem', color: 'var(--A)', letterSpacing: '.08em', marginBottom: 16 }}>✏ ÉDITION</div>
        {[
          { field: 'title',     label: 'Titre',           multiline: false },
          { field: 'context',   label: 'Contexte',        multiline: true },
          { field: 'positionA', label: 'Position Pour',   multiline: false },
          { field: 'positionB', label: 'Position Contre', multiline: false },
        ].map(({ field, label, multiline }) => (
          <div key={field} style={{ marginBottom: 12 }}>
            <label style={{ fontFamily: 'var(--fM)', fontSize: '.56rem', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '.06em', display: 'block', marginBottom: 5 }}>{label}</label>
            {multiline ? (
              <textarea
                value={editForm[field] || ''}
                onChange={e => onEditFormChange(field, e.target.value)}
                rows={3}
                style={{ width: '100%', fontFamily: 'var(--fB)', fontSize: '.76rem', color: 'var(--txt)', border: '1px solid var(--bd)', borderRadius: 6, padding: '8px 12px', background: 'var(--bg)', resize: 'vertical', boxSizing: 'border-box' }}
              />
            ) : (
              <input
                value={editForm[field] || ''}
                onChange={e => onEditFormChange(field, e.target.value)}
                style={{ width: '100%', fontFamily: 'var(--fB)', fontSize: '.76rem', color: 'var(--txt)', border: '1px solid var(--bd)', borderRadius: 6, padding: '8px 12px', background: 'var(--bg)', boxSizing: 'border-box' }}
              />
            )}
          </div>
        ))}
        <div style={{ display: 'flex', gap: 10, marginTop: 16 }}>
          <button onClick={onSaveEdit} style={{ fontFamily: 'var(--fH)', fontSize: '.64rem', padding: '8px 18px', borderRadius: 7, border: 'none', background: 'var(--G)', color: '#fff', cursor: 'pointer', letterSpacing: '.06em' }}>✓ Sauvegarder</button>
          <button onClick={onCancelEdit} style={{ fontFamily: 'var(--fH)', fontSize: '.64rem', padding: '8px 18px', borderRadius: 7, border: '1px solid var(--bd)', background: 'transparent', color: 'var(--txt)', cursor: 'pointer', letterSpacing: '.06em' }}>Annuler</button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ background: selected ? 'rgba(44,74,110,.04)' : '#FDFAF4', border: `1px solid ${selected ? 'var(--A)' : 'var(--bd)'}`, borderLeft: `4px solid ${catColor}`, borderRadius: 10, padding: '16px 20px', boxShadow: selected ? 'var(--sh2)' : 'var(--sh)', display: 'flex', gap: 16, alignItems: 'flex-start', transition: 'all .15s' }}>

      {/* Checkbox */}
      <div
        onClick={topic.published ? undefined : onToggleSelect}
        style={{ width: 20, height: 20, borderRadius: 4, border: `2px solid ${selected ? 'var(--A)' : 'var(--bd2)'}`, background: selected ? 'var(--A)' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: topic.published ? 'default' : 'pointer', flexShrink: 0, marginTop: 2 }}
      >
        {selected && <span style={{ color: '#fff', fontSize: '.7rem', lineHeight: 1 }}>✓</span>}
        {topic.published && <span style={{ color: 'var(--G)', fontSize: '.7rem', lineHeight: 1 }}>✓</span>}
      </div>

      {/* Content */}
      <div style={{ flex: 1 }}>
        <div style={{ display: 'flex', gap: 8, marginBottom: 8, flexWrap: 'wrap', alignItems: 'center' }}>
          <span style={{ fontFamily: 'var(--fM)', fontSize: '.5rem', padding: '2px 8px', borderRadius: 10, background: catColor+'18', color: catColor, textTransform: 'uppercase', letterSpacing: '.08em', fontWeight: 700 }}>{topic.category}</span>
          {topic.published && <span style={{ fontFamily: 'var(--fM)', fontSize: '.5rem', padding: '2px 8px', borderRadius: 10, background: 'rgba(58,110,82,.12)', color: 'var(--G)', letterSpacing: '.06em' }}>✓ Publié · Sem. {topic.weekNumber}</span>}
          <span style={{ fontFamily: 'var(--fM)', fontSize: '.5rem', color: 'var(--muted)' }}>ID: {topic.id}</span>
        </div>
        <div style={{ fontFamily: 'var(--fH)', fontSize: '.88rem', color: 'var(--txt)', lineHeight: 1.4, marginBottom: 8, letterSpacing: '.02em' }}>{topic.title}</div>
        <div style={{ fontFamily: 'var(--fB)', fontSize: '.7rem', color: 'var(--dim)', lineHeight: 1.6, marginBottom: 10 }}>{topic.context}</div>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <PosPill label="Pour" text={topic.positionA} color="var(--A)"/>
          <PosPill label="Contre" text={topic.positionB} color="var(--B)"/>
        </div>
      </div>

      {/* Actions */}
      {!topic.published && (
        <button
          onClick={onEdit}
          style={{ fontFamily: 'var(--fM)', fontSize: '.58rem', padding: '6px 12px', borderRadius: 6, border: '1px solid var(--bd)', background: 'transparent', color: 'var(--muted)', cursor: 'pointer', flexShrink: 0 }}
        >
          ✏ Éditer
        </button>
      )}
    </div>
  );
}

function PosPill({ label, text, color }) {
  return (
    <div style={{ flex: 1, minWidth: 140, padding: '8px 12px', background: color+'08', border: `1px solid ${color}28`, borderRadius: 6 }}>
      <div style={{ fontFamily: 'var(--fM)', fontSize: '.5rem', color, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 3 }}>{label}</div>
      <div style={{ fontFamily: 'var(--fB)', fontSize: '.68rem', color: 'var(--dim)', lineHeight: 1.45 }}>{text}</div>
    </div>
  );
}
