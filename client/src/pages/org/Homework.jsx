import { useEffect, useState } from 'react';
import { api } from '../../lib/api.js';
import PostitModal from '../../components/PostitModal.jsx';
import StatusBadge from '../../components/StatusBadge.jsx';

export default function Homework() {
  const [modules, setModules] = useState([]);
  const [activeTask, setActiveTask] = useState(null);

  async function load() {
    setModules(await api.get('/org/homework'));
  }
  useEffect(() => { load(); }, []);

  function handleSaved() {
    setActiveTask(null);
    load();
  }

  return (
    <div className="page">
      <div className="page-header">
        <h1 className="page-title">Hausaufgaben</h1>
        <p className="page-lede">
          Hier siehst du die freigegebenen Module. Fülle die Pflichtfelder aus, die Wahlfelder sind
          Fleißaufgaben — beides zählt für dein Punktekonto.
        </p>
      </div>

      {modules.length === 0 && (
        <div className="empty-state">Aktuell ist keine Hausaufgabe freigegeben. Schau später wieder vorbei.</div>
      )}

      {modules.map((m) => {
        const pflichtDone = m.tasks.filter((t) => t.task_type === 'pflicht' && t.is_completed).length;
        const pflichtTotal = m.tasks.filter((t) => t.task_type === 'pflicht').length;
        const optionalDone = m.tasks.filter((t) => t.task_type === 'optional' && t.is_completed).length;
        const optionalTotal = m.tasks.filter((t) => t.task_type === 'optional').length;
        return (
          <div key={m.assignment_id} className="panel">
            <div className="flex justify-between items-center">
              <div>
                <div className="section-title" style={{ marginBottom: 4 }}>
                  {m.number ? `Modul ${m.number}` : 'Modul'}
                </div>
                <div style={{ fontWeight: 700, fontSize: 17 }}>{m.title}</div>
                <div className="small muted mt-8">{m.subtitle}</div>
              </div>
              <div className="small muted" style={{ textAlign: 'right' }}>
                Pflicht {pflichtDone}/{pflichtTotal}<br />
                Wahl {optionalDone}/{optionalTotal}
              </div>
            </div>

            <div className="tile-grid mt-16">
              {m.tasks.map((t) => (
                <button
                  key={t.id}
                  onClick={() => setActiveTask(t)}
                  className="panel"
                  style={{ textAlign: 'left', cursor: 'pointer', padding: 14, border: `1px solid ${t.is_completed ? 'var(--line)' : 'var(--line-strong)'}`, height: '100%' }}
                >
                  <div className="flex justify-between items-center">
                    <span className={`badge ${t.task_type === 'pflicht' ? 'badge-pflicht' : 'badge-optional'}`}>
                      {t.task_type === 'pflicht' ? 'Pflicht' : 'Wahl'}
                    </span>
                    {t.status && <StatusBadge status={t.status} />}
                  </div>
                  <div className="flex gap-8 items-center mt-8">
                    <span className="dot" style={{ background: t.color_hex }} />
                    <span className="small muted">{t.perspective_label}</span>
                  </div>
                  <div style={{ fontWeight: 700, marginTop: 6 }}>{t.field_label}</div>
                  {t.card_title && <div className="small mt-8">„{t.card_title}"</div>}
                </button>
              ))}
            </div>
          </div>
        );
      })}

      {activeTask && (
        <PostitModal task={activeTask} onClose={() => setActiveTask(null)} onSaved={handleSaved} />
      )}
    </div>
  );
}
