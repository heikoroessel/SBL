import { useEffect, useState } from 'react';
import { api } from '../lib/api.js';
import { usePoints } from '../lib/PointsContext.jsx';
import StatusBadge from './StatusBadge.jsx';
import TodoDetailModal from './TodoDetailModal.jsx';

export default function PostitModal({ task, onClose, onSaved }) {
  const [reflectionAnswer, setReflectionAnswer] = useState(task.reflection_answer || '');
  const [cardTitle, setCardTitle] = useState(task.card_title || '');
  const [intention, setIntention] = useState(task.intention || '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [todos, setTodos] = useState([]);
  const [colleagues, setColleagues] = useState([]);
  const [newTodo, setNewTodo] = useState({ description: '', due_date: '', priority: 'B', assignee_id: '' });
  const [activeTodo, setActiveTodo] = useState(null);
  const points = usePoints();

  const postitId = task.postit_id;

  useEffect(() => {
    api.get('/org/colleagues').then(setColleagues);
    if (postitId) loadTodos();
  }, [postitId]);

  async function loadTodos() {
    const all = await api.get('/org/todos');
    setTodos(all.filter((t) => t.module_task_id === task.id));
  }

  async function handleSave(markCompleted) {
    setSaving(true);
    setError('');
    try {
      await api.put(`/org/postits/task/${task.id}`, {
        reflection_answer: reflectionAnswer,
        card_title: cardTitle,
        intention,
        mark_completed: markCompleted,
      });
      points?.refresh();
      onSaved();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function addTodo(e) {
    e.preventDefault();
    if (!newTodo.description.trim() || !postitId) return;
    await api.post(`/org/postits/${postitId}/todos`, {
      ...newTodo,
      assignee_id: newTodo.assignee_id || undefined,
      due_date: newTodo.due_date || undefined,
    });
    setNewTodo({ description: '', due_date: '', priority: 'B', assignee_id: '' });
    points?.refresh();
    await loadTodos();
  }

  async function handleTodoSaved() {
    setActiveTodo(null);
    points?.refresh();
    await loadTodos();
  }

  async function handleTodoDeleted() {
    setActiveTodo(null);
    await loadTodos();
  }

  const needsSaveFirst = !postitId;

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()} style={{ position: 'relative' }}>
        <button className="modal-close" onClick={onClose}>×</button>

        {/* Kärtchen-Überschrift ganz oben — betitelt das gesamte Postit */}
        <div className="field-group mt-8">
          <label className="field-label">Kärtchen-Überschrift</label>
          <input className="text-input" value={cardTitle} onChange={(e) => setCardTitle(e.target.value)} placeholder="Kurzer Titel für dieses Postit" />
          <div className="field-hint">Ein sprechender Name hilft dir später, das Postit auf der Landkarte wiederzufinden.</div>
        </div>

        <div className="flex gap-8 items-center mt-16">
          <span className={`badge ${task.task_type === 'pflicht' ? 'badge-pflicht' : 'badge-optional'}`}>
            {task.task_type === 'pflicht' ? 'Pflicht' : 'Wahl'}
          </span>
          <span className="dot" style={{ background: task.color_hex }} />
          <span className="small muted">{task.perspective_label}</span>
          <span style={{ fontWeight: 700 }}>· {task.field_label}</span>
          {task.status && <StatusBadge status={task.status} />}
        </div>

        {/* Block 1: das Postit selbst — Reflexion und Veränderungswunsch */}
        <div className="mt-24">
          {task.question_1 && <p className="small mt-8">→ {task.question_1}</p>}
          {task.question_2 && <p className="small mt-8">→ {task.question_2}</p>}
          <div className="field-group mt-16">
            <label className="field-label">Deine Antwort / Erkenntnis</label>
            <textarea className="textarea" value={reflectionAnswer} onChange={(e) => setReflectionAnswer(e.target.value)} rows={4} />
          </div>

          <div className="field-group">
            <label className="field-label">Was will ich hier leisten?</label>
            <textarea className="textarea" value={intention} onChange={(e) => setIntention(e.target.value)} rows={3} placeholder="Geplantes Vorhaben für die eigene Organisation" />
            <div className="field-hint">
              Setze das, was du leisten möchtest, am besten in einzelnen Aufgaben um, damit du den
              Überblick behältst — weise sie dir selbst oder anderen zu und terminiere sie.
            </div>
          </div>

          {error && <div className="error-text">{error}</div>}

          <div className="flex gap-8 mt-16">
            <button className="btn btn-ghost" onClick={() => handleSave(task.is_completed)} disabled={saving}>
              Zwischenspeichern
            </button>
            <button className="btn btn-accent" onClick={() => handleSave(true)} disabled={saving}>
              {task.is_completed ? 'Änderungen speichern' : 'Postit fertigstellen'}
            </button>
          </div>
        </div>

        {/* Block 2: Aufgaben — optisch klar abgegrenzt als Fortsetzung */}
        <div className="postit-todos-block mt-24">
          <div className="section-title" style={{ marginBottom: 4 }}>Und jetzt: Aufgaben ableiten</div>
          <p className="small muted mt-8">
            Überlege dir am besten konkrete Aufgaben, mit denen du deinem Veränderungswunsch
            näherkommst — mit Termin und Zuständigkeit, damit nichts versandet.
          </p>

          {needsSaveFirst ? (
            <div className="field-hint mt-16">Speichere das Postit einmal, um Aufgaben hinzuzufügen.</div>
          ) : (
            <>
              {todos.length === 0 && <div className="field-hint mt-16">Noch keine Aufgaben angelegt.</div>}
              {todos.map((t) => (
                <button key={t.id} className={`todo-card${t.is_done ? ' is-done' : ''}`} onClick={() => setActiveTodo(t)} style={{ marginTop: 12 }}>
                  <div className={`todo-card-title${t.is_done ? ' done' : ''}`}>{t.description}</div>
                  <div className="todo-card-meta">
                    <span className="todo-card-meta-item">Priorität {t.priority}</span>
                    <span className="todo-card-meta-item">{t.due_date ? `fällig ${t.due_date}` : 'kein Termin'}</span>
                    <span className="todo-card-meta-item">{t.assignee_name || 'nicht zugewiesen'}</span>
                    {t.is_done && <span className="todo-card-meta-item">✓ erledigt</span>}
                  </div>
                </button>
              ))}
              <form onSubmit={addTodo} className="mt-16">
                <div className="field-group">
                  <label className="field-label">Neue Aufgabe</label>
                  <input
                    className="text-input"
                    value={newTodo.description}
                    onChange={(e) => setNewTodo({ ...newTodo, description: e.target.value })}
                    placeholder="Wie kannst du Strukturen verändern, damit der gewünschte Zustand wahrscheinlicher wird?"
                    required
                  />
                </div>
                <div className="flex gap-8">
                  <div className="field-group" style={{ marginBottom: 0 }}>
                    <label className="field-label">Termin</label>
                    <input className="text-input" type="date" value={newTodo.due_date} onChange={(e) => setNewTodo({ ...newTodo, due_date: e.target.value })} />
                  </div>
                  <div className="field-group" style={{ marginBottom: 0 }}>
                    <label className="field-label">Priorität</label>
                    <select className="select" value={newTodo.priority} onChange={(e) => setNewTodo({ ...newTodo, priority: e.target.value })}>
                      <option value="A">A</option>
                      <option value="B">B</option>
                      <option value="C">C</option>
                    </select>
                  </div>
                  <div className="field-group" style={{ marginBottom: 0, flex: 1 }}>
                    <label className="field-label">Zuständig</label>
                    <select className="select" value={newTodo.assignee_id} onChange={(e) => setNewTodo({ ...newTodo, assignee_id: e.target.value })}>
                      <option value="">Ich selbst</option>
                      {colleagues.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                  </div>
                </div>
                <button className="btn btn-primary btn-sm mt-8">Aufgabe hinzufügen</button>
              </form>
            </>
          )}
        </div>
      </div>

      {activeTodo && (
        <TodoDetailModal
          todo={activeTodo}
          colleagues={colleagues}
          onClose={() => setActiveTodo(null)}
          onSaved={handleTodoSaved}
          onDeleted={handleTodoDeleted}
        />
      )}
    </div>
  );
}
