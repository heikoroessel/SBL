import { useState } from 'react';
import { api } from '../lib/api.js';
import StarRating from './StarRating.jsx';

export default function TodoDetailModal({ todo, colleagues, onClose, onSaved, onDeleted }) {
  const [description, setDescription] = useState(todo.description || '');
  const [dueDate, setDueDate] = useState(todo.due_date ? todo.due_date.slice(0, 10) : '');
  const [priority, setPriority] = useState(todo.priority || 'B');
  const [assigneeId, setAssigneeId] = useState(todo.assignee_id || '');
  const [note, setNote] = useState(todo.note || '');
  const [ratingStars, setRatingStars] = useState(todo.rating_stars || 0);
  const [ratingText, setRatingText] = useState(todo.rating_text || '');
  const [shareInGroup, setShareInGroup] = useState(todo.share_in_group || false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  async function saveFields(extra = {}) {
    setSaving(true);
    setError('');
    try {
      await api.patch(`/org/todos/${todo.id}`, {
        description, due_date: dueDate || null, priority, assignee_id: assigneeId || null, note,
        ...extra,
      });
      onSaved();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function markDone() {
    if (!ratingStars) {
      setError('Bitte eine Bewertung (Sterne) vergeben, bevor du die Aufgabe abschließt.');
      return;
    }
    await saveFields({ is_done: true, rating_stars: ratingStars, rating_text: ratingText, share_in_group: shareInGroup });
  }

  async function reopen() {
    await saveFields({ is_done: false });
  }

  async function handleDelete() {
    if (!window.confirm('Aufgabe wirklich löschen?')) return;
    await api.del(`/org/todos/${todo.id}`);
    onDeleted();
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()} style={{ position: 'relative' }}>
        <button className="modal-close" onClick={onClose}>×</button>

        <div className="small muted mt-8">
          Modul {todo.module_number} · {todo.field_label}{todo.card_title ? ` · „${todo.card_title}"` : ''}
        </div>
        <div className="modal-title mt-8">Aufgabe</div>
        {todo.created_by_name && (
          <div className="small muted mt-8">Zugewiesen von {todo.created_by_name}</div>
        )}

        <div className="field-group mt-16">
          <label className="field-label">Beschreibung</label>
          <textarea className="textarea" value={description} onChange={(e) => setDescription(e.target.value)} rows={2} />
        </div>

        <div className="flex gap-8">
          <div className="field-group" style={{ flex: 1 }}>
            <label className="field-label">Termin</label>
            <input className="text-input" type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
          </div>
          <div className="field-group" style={{ flex: 1 }}>
            <label className="field-label">Priorität</label>
            <select className="select" value={priority} onChange={(e) => setPriority(e.target.value)}>
              <option value="A">A</option>
              <option value="B">B</option>
              <option value="C">C</option>
            </select>
          </div>
          <div className="field-group" style={{ flex: 1 }}>
            <label className="field-label">Zuständig</label>
            <select className="select" value={assigneeId} onChange={(e) => setAssigneeId(e.target.value)}>
              <option value="">Ich selbst</option>
              {colleagues?.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
        </div>

        <div className="field-group">
          <label className="field-label">Notiz (Zwischenstand)</label>
          <textarea className="textarea" value={note} onChange={(e) => setNote(e.target.value)} rows={2} placeholder="Optional: Stand, Hindernisse, Gedanken vor Abschluss" />
        </div>

        <button className="btn btn-ghost btn-sm" onClick={() => saveFields()} disabled={saving}>Änderungen speichern</button>

        <div className="section-title mt-24">Abschluss</div>

        {todo.is_done ? (
          <>
            <div className="mt-8"><StarRating value={todo.rating_stars} readOnly /></div>
            {todo.rating_text && <p className="small mt-8">{todo.rating_text}</p>}
            <button className="btn btn-ghost mt-16" onClick={reopen} disabled={saving}>Wieder öffnen</button>
          </>
        ) : (
          <>
            <div className="field-group">
              <label className="field-label">Wie ist es gelaufen?</label>
              <StarRating value={ratingStars} onChange={setRatingStars} />
            </div>
            <div className="field-group">
              <label className="field-label">Was lief gut, was mittelmäßig, was nicht?</label>
              <textarea className="textarea" value={ratingText} onChange={(e) => setRatingText(e.target.value)} rows={4} />
            </div>
            <label className="styled-checkbox">
              <input type="checkbox" checked={shareInGroup} onChange={(e) => setShareInGroup(e.target.checked)} />
              <span className="styled-checkbox-text">
                <strong>Zusätzlich in der Lerngruppe teilen.</strong> Dein Text erscheint dann auf der
                gemeinsamen Pinnwand — bitte ausformuliert schreiben, nicht nur stichwortartig.
              </span>
            </label>
            <button className="btn btn-accent mt-16" onClick={markDone} disabled={saving}>Als erledigt markieren</button>
          </>
        )}

        {error && <div className="error-text mt-8">{error}</div>}

        <button className="btn btn-danger mt-24" onClick={handleDelete}>Aufgabe löschen</button>
      </div>
    </div>
  );
}
