import { useEffect, useState } from 'react';
import { api } from '../lib/api.js';

export default function PostitModal({ task, onClose, onSaved }) {
  const [reflectionAnswer, setReflectionAnswer] = useState(task.reflection_answer || '');
  const [cardTitle, setCardTitle] = useState(task.card_title || '');
  const [intention, setIntention] = useState(task.intention || '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [todos, setTodos] = useState([]);
  const [colleagues, setColleagues] = useState([]);
  const [newTodo, setNewTodo] = useState({ description: '', due_date: '', priority: 'B', assignee_id: '' });

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
    await loadTodos();
  }

  async function toggleDone(todo) {
    if (!todo.is_done) {
      const stars = window.prompt('Wie ist es gelaufen? Bewertung 1–5 Sterne eingeben:');
      if (!stars) return;
      const ratingText = window.prompt('Kurz beschreiben, was gut / mittelmäßig / nicht gelungen ist (optional):') || '';
      const shareInGroup = window.confirm('Zusätzlich als Erfolgsgeschichte in der Lerngruppen-Pinnwand teilen?');
      await api.patch(`/org/todos/${todo.id}`, {
        is_done: true,
        rating_stars: Number(stars),
        rating_text: ratingText,
        share_in_group: shareInGroup,
      });
    } else {
      await api.patch(`/org/todos/${todo.id}`, { is_done: false });
    }
    await loadTodos();
  }

  async function deleteTodo(id) {
    if (!window.confirm('Aufgabe wirklich löschen?')) return;
    await api.del(`/org/todos/${id}`);
    await loadTodos();
  }

  const needsSaveFirst = !postitId;

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()} style={{ position: 'relative' }}>
        <button className="modal-close" onClick={onClose}>×</button>
        <div className="flex gap-8 items-center mt-8">
          <span className={`badge ${task.task_type === 'pflicht' ? 'badge-pflicht' : 'badge-optional'}`}>
            {task.task_type === 'pflicht' ? 'Pflicht' : 'Wahl'}
          </span>
          <span className="dot" style={{ background: task.color_hex }} />
          <span className="small muted">{task.perspective_label}</span>
        </div>
        <div className="modal-title mt-8">{task.field_label}</div>

        <div className="section-title mt-24">Reflexion</div>
        {task.question_1 && <p className="small mt-8">→ {task.question_1}</p>}
        {task.question_2 && <p className="small mt-8">→ {task.question_2}</p>}
        <div className="field-group mt-16">
          <label className="field-label">Deine Antwort / Erkenntnis</label>
          <textarea className="textarea" value={reflectionAnswer} onChange={(e) => setReflectionAnswer(e.target.value)} rows={4} />
        </div>

        <div className="section-title mt-24">Umsetzung</div>
        <div className="field-group">
          <label className="field-label">Kärtchen-Überschrift</label>
          <input className="text-input" value={cardTitle} onChange={(e) => setCardTitle(e.target.value)} placeholder="Kurzer Titel für dieses Postit" />
        </div>
        <div className="field-group">
          <label className="field-label">Was will ich hier leisten?</label>
          <textarea className="textarea" value={intention} onChange={(e) => setIntention(e.target.value)} rows={3} placeholder="Geplantes Vorhaben für die eigene Organisation" />
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

        <div className="section-title mt-24">Aufgaben (To-Dos)</div>
        {needsSaveFirst ? (
          <div className="field-hint">Speichere das Postit einmal, um Aufgaben hinzuzufügen.</div>
        ) : (
          <>
            {todos.length === 0 && <div className="field-hint">Noch keine Aufgaben angelegt.</div>}
            {todos.map((t) => (
              <div key={t.id} className="panel" style={{ padding: 12, marginBottom: 8, opacity: t.is_done ? 0.6 : 1 }}>
                <div className="flex justify-between items-center">
                  <label className="flex gap-8 items-center" style={{ cursor: 'pointer' }}>
                    <input type="checkbox" checked={t.is_done} onChange={() => toggleDone(t)} />
                    <span style={{ textDecoration: t.is_done ? 'line-through' : 'none' }}>{t.description}</span>
                  </label>
                  <button className="btn btn-danger btn-sm" onClick={() => deleteTodo(t.id)}>Löschen</button>
                </div>
                <div className="small muted mt-8">
                  Priorität {t.priority} · {t.due_date ? `fällig ${t.due_date}` : 'kein Termin'} · {t.assignee_name || 'nicht zugewiesen'}
                  {t.rating_stars && <> · {'★'.repeat(t.rating_stars)}{t.rating_text ? ` — ${t.rating_text}` : ''}</>}
                </div>
              </div>
            ))}
            <form onSubmit={addTodo} className="mt-16">
              <div className="field-group">
                <label className="field-label">Neue Aufgabe</label>
                <input className="text-input" value={newTodo.description} onChange={(e) => setNewTodo({ ...newTodo, description: e.target.value })} placeholder="Was ist zu tun?" />
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
  );
}
