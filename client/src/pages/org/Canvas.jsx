import { useEffect, useState } from 'react';
import { api } from '../../lib/api.js';
import PostitModal from '../../components/PostitModal.jsx';

export default function Canvas() {
  const [fields, setFields] = useState([]);
  const [activeTask, setActiveTask] = useState(null);
  const [openField, setOpenField] = useState(null);

  async function load() {
    setFields(await api.get('/org/canvas'));
  }
  useEffect(() => { load(); }, []);

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

      <div className="canvas-grid">
        {fields.map((f) => {
          const isOpen = openField === f.key;
          const visible = isOpen ? f.postits : f.postits.slice(0, VISIBLE_LIMIT);
          const hidden = f.postits.length - visible.length;
          return (
            <div
              key={f.key}
              className="canvas-cell"
              style={{ '--gc': `${f.grid_col} / span 1`, '--gr': `${f.grid_row} / span 1` }}
            >
              <div className="canvas-cell-title">{f.label}</div>
              <div className="canvas-cell-sub">{f.subtitle}</div>
              {f.postits.length === 0 ? (
                <div className="small muted">Noch keine Postits</div>
              ) : (
                <div className="postit-fan">
                  {visible.map((p) => (
                    <button
                      key={p.id}
                      className="postit-chip"
                      style={{ background: p.color_hex }}
                      onClick={() => openPostit(p)}
                      title={p.card_title || p.field_label}
                    >
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
                  {isOpen && f.postits.length > VISIBLE_LIMIT && (
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
