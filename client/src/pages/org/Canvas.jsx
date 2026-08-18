import { useEffect, useState } from 'react';
import { api } from '../../lib/api.js';
import PostitModal from '../../components/PostitModal.jsx';
import InfoPopover from '../../components/InfoPopover.jsx';

export default function Canvas() {
  const [fields, setFields] = useState([]);
  const [perspectives, setPerspectives] = useState([]);
  const [activeTask, setActiveTask] = useState(null);
  const [openField, setOpenField] = useState(null);
  const [filterPerspective, setFilterPerspective] = useState(null);

  async function load() {
    setFields(await api.get('/org/canvas'));
  }
  useEffect(() => { load(); }, []);
  useEffect(() => {
    api.get('/org/reference').then((ref) => setPerspectives(ref.perspectives));
  }, []);

  function openPostit(postit) {
    setActiveTask({
      id: postit.module_task_id,
      task_type: postit.task_type,
      field_label: postit.field_label,
      perspective_label: postit.perspective_label,
      color_hex: postit.color_hex,
      question_1: postit.question_1,
      question_2: postit.question_2,
      postit_id: postit.id,
      reflection_answer: postit.reflection_answer,
      card_title: postit.card_title,
      intention: postit.intention,
      is_completed: postit.is_completed,
      status: postit.status,
    });
  }

  function handleSaved() {
    setActiveTask(null);
    load();
  }

  const VISIBLE_LIMIT = 4;

  return (
    <div className="page">
      <div className="page-header">
        <h1 className="page-title">Deine Business Landkarte</h1>
        <p className="page-lede">
          Jedes Feld sammelt über die Lektionen hinweg Postits aus unterschiedlichen Perspektiven.
          Klick auf ein Postit, um Details zu sehen oder weiterzubearbeiten.
        </p>
      </div>

      <p className="small muted" style={{ marginBottom: 10 }}>
        Basis ist das klassische Business Model Canvas, ergänzt um vier systemische Perspektiven — tippe auf das <span className="info-icon" style={{ display: 'inline-flex' }}>i</span> für Hintergrund.
      </p>

      <div className="legend-bar">
        {perspectives.map((p) => (
          <button
            key={p.key}
            className={`legend-chip${filterPerspective === p.key ? ' active' : ''}`}
            onClick={() => setFilterPerspective((cur) => (cur === p.key ? null : p.key))}
            style={{ border: filterPerspective === p.key ? undefined : undefined }}
          >
            <span className="dot" style={{ background: p.color_hex }} />
            {p.label}
            <span onClick={(e) => e.stopPropagation()}>
              <InfoPopover>
                <div className="legend-popover-title">{p.label}</div>
                {p.theorist}
              </InfoPopover>
            </span>
          </button>
        ))}
        {filterPerspective && (
          <button className="legend-chip" onClick={() => setFilterPerspective(null)}>
            Filter zurücksetzen ×
          </button>
        )}
      </div>

      <div className="canvas-grid">
        {fields.map((f) => {
          const isOpen = openField === f.key;
          const filteredPostits = filterPerspective
            ? f.postits.filter((p) => p.perspective_key === filterPerspective)
            : f.postits;
          const visible = isOpen ? filteredPostits : filteredPostits.slice(0, VISIBLE_LIMIT);
          const hidden = filteredPostits.length - visible.length;
          return (
            <div
              key={f.key}
              className="canvas-cell"
              style={{ '--gc': `${f.grid_col} / span 1`, '--gr': `${f.grid_row} / span 1` }}
            >
              <div className="canvas-cell-title">{f.label}</div>
              <div className="canvas-cell-sub">{f.subtitle}</div>
              {filteredPostits.length === 0 ? (
                <div className="small muted">{filterPerspective ? 'Keine Postits dieser Perspektive' : 'Noch keine Postits'}</div>
              ) : (
                <div className="postit-fan">
                  {visible.map((p) => (
                    <button
                      key={p.id}
                      className="postit-chip"
                      style={{ background: p.color_hex, position: 'relative' }}
                      onClick={() => openPostit(p)}
                      title={p.card_title || p.field_label}
                    >
                      {p.status && (
                        <span
                          className={`status-dot ${p.status}`}
                          style={{ position: 'absolute', top: -3, right: -3, border: '2px solid white' }}
                        />
                      )}
                      <span className="chip-title">{p.card_title || `Modul ${p.module_number}`}</span>
                    </button>
                  ))}
                  {hidden > 0 && (
                    <button
                      className="postit-chip"
                      style={{ background: 'var(--ink-muted)' }}
                      onClick={() => setOpenField(f.key)}
                    >
                      +{hidden} weitere
                    </button>
                  )}
                  {isOpen && filteredPostits.length > VISIBLE_LIMIT && (
                    <button className="postit-chip" style={{ background: 'var(--line-strong)', color: 'var(--ink)' }} onClick={() => setOpenField(null)}>
                      einklappen
                    </button>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {activeTask && (
        <PostitModal task={activeTask} onClose={() => setActiveTask(null)} onSaved={handleSaved} />
      )}
    </div>
  );
}
