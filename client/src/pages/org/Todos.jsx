import { useEffect, useState } from 'react';
import { api } from '../../lib/api.js';
import { usePoints } from '../../lib/PointsContext.jsx';
import TodoDetailModal from '../../components/TodoDetailModal.jsx';

function isOverdue(t) {
  if (t.is_done || !t.due_date) return false;
  return new Date(t.due_date) < new Date(new Date().toDateString());
}

export default function Todos() {
  const [todos, setTodos] = useState([]);
  const [colleagues, setColleagues] = useState([]);
  const [mineOnly, setMineOnly] = useState(true);
  const [activeTodo, setActiveTodo] = useState(null);
  const points = usePoints();

  async function load() {
    setTodos(await api.get('/org/todos', { mine: mineOnly ? 'true' : 'false' }));
  }
  useEffect(() => { load(); }, [mineOnly]);
  useEffect(() => { api.get('/org/colleagues').then(setColleagues); }, []);

  async function handleSaved() {
    setActiveTodo(null);
    points?.refresh();
    await load();
  }

  async function handleDeleted() {
    setActiveTodo(null);
    await load();
  }

  function exportCsv() {
    window.location.href = '/api/org/todos/export';
  }

  const open = todos.filter((t) => !t.is_done);
  const done = todos.filter((t) => t.is_done);

  function Row({ t }) {
    const overdue = isOverdue(t);
    const status = t.is_done ? 'erledigt' : overdue ? 'ueberfaellig' : 'offen';
    return (
      <button className={`todo-card${t.is_done ? ' is-done' : ''}`} onClick={() => setActiveTodo(t)}>
        <div className="flex justify-between items-center">
          <div className={`todo-card-title${t.is_done ? ' done' : ''}`}>{t.description}</div>
          <span className={`status-dot ${status}`} />
        </div>
        <div className="todo-card-meta">
          <span className="todo-card-meta-item">Priorität {t.priority}</span>
          <span className="todo-card-meta-item" style={overdue ? { color: '#a32d2d', fontWeight: 700 } : undefined}>
            {t.due_date || 'kein Termin'}
          </span>
          <span className="todo-card-meta-item">Zuständig: {t.assignee_name || '—'}</span>
          <span className="todo-card-meta-item">Zugewiesen von: {t.created_by_name || '—'}</span>
          <span className="todo-card-meta-item">Modul {t.module_number} · {t.field_label}{t.card_title ? ` · „${t.card_title}"` : ''}</span>
        </div>
      </button>
    );
  }

  return (
    <div className="page">
      <div className="page-header">
        <h1 className="page-title">Aufgaben</h1>
        <p className="page-lede">
          Alle To-Dos, die aus deinen Postits entstanden sind — sortiert nach Termin und Priorität.
          Klick auf eine Aufgabe, um sie zu bearbeiten, zu bewerten oder abzuschließen.
        </p>
      </div>

      <div className="panel">
        <div className="flex justify-between items-center">
          <label className="flex gap-8 items-center" style={{ cursor: 'pointer' }}>
            <input type="checkbox" checked={mineOnly} onChange={(e) => setMineOnly(e.target.checked)} />
            Nur meine Aufgaben anzeigen
          </label>
          <button className="btn btn-ghost btn-sm" onClick={exportCsv}>Als CSV exportieren</button>
        </div>
      </div>

      <div className="panel">
        <div className="section-title">Offen ({open.length})</div>
        {open.length === 0 ? (
          <div className="empty-state">Keine offenen Aufgaben.</div>
        ) : (
          open.map((t) => <Row key={t.id} t={t} />)
        )}
      </div>

      {done.length > 0 && (
        <div className="panel">
          <div className="section-title">Erledigt ({done.length})</div>
          {done.map((t) => <Row key={t.id} t={t} />)}
        </div>
      )}

      {activeTodo && (
        <TodoDetailModal
          todo={activeTodo}
          colleagues={colleagues}
          onClose={() => setActiveTodo(null)}
          onSaved={handleSaved}
          onDeleted={handleDeleted}
        />
      )}
    </div>
  );
}
