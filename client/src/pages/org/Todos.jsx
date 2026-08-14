import { useEffect, useState } from 'react';
import { api } from '../../lib/api.js';

function isOverdue(t) {
  if (t.is_done || !t.due_date) return false;
  return new Date(t.due_date) < new Date(new Date().toDateString());
}

export default function Todos() {
  const [todos, setTodos] = useState([]);
  const [mineOnly, setMineOnly] = useState(true);

  async function load() {
    setTodos(await api.get('/org/todos', { mine: mineOnly ? 'true' : 'false' }));
  }
  useEffect(() => { load(); }, [mineOnly]);

  async function toggleDone(t) {
    if (!t.is_done) {
      const stars = window.prompt('Wie ist es gelaufen? Bewertung 1–5 Sterne eingeben:');
      if (!stars) return;
      const ratingText = window.prompt('Kurz beschreiben, was gut / mittelmäßig / nicht gelungen ist (optional):') || '';
      const shareInGroup = window.confirm('Zusätzlich als Erfolgsgeschichte in der Lerngruppen-Pinnwand teilen?');
      await api.patch(`/org/todos/${t.id}`, { is_done: true, rating_stars: Number(stars), rating_text: ratingText, share_in_group: shareInGroup });
    } else {
      await api.patch(`/org/todos/${t.id}`, { is_done: false });
    }
    await load();
  }

  const open = todos.filter((t) => !t.is_done);
  const done = todos.filter((t) => t.is_done);

  function Row({ t }) {
    const overdue = isOverdue(t);
    return (
      <tr style={{ opacity: t.is_done ? 0.55 : 1 }}>
        <td>
          <input type="checkbox" checked={t.is_done} onChange={() => toggleDone(t)} />
        </td>
        <td style={{ textDecoration: t.is_done ? 'line-through' : 'none' }}>{t.description}</td>
        <td>
          <span className="badge badge-optional">{t.priority}</span>
        </td>
        <td className={overdue ? 'error-text' : ''}>
          {t.due_date || '—'}
        </td>
        <td>{t.assignee_name || '—'}</td>
        <td className="small muted">
          Modul {t.module_number} · {t.field_label}
          {t.card_title ? ` · „${t.card_title}"` : ''}
        </td>
      </tr>
    );
  }

  return (
    <div className="page">
      <div className="page-header">
        <h1 className="page-title">Aufgaben</h1>
        <p className="page-lede">
          Alle To-Dos, die aus deinen Postits entstanden sind — sortiert nach Termin und Priorität.
          Überfällige Aufgaben sind rot markiert, erledigte ausgegraut.
        </p>
      </div>

      <div className="panel">
        <label className="flex gap-8 items-center" style={{ cursor: 'pointer' }}>
          <input type="checkbox" checked={mineOnly} onChange={(e) => setMineOnly(e.target.checked)} />
          Nur meine Aufgaben anzeigen
        </label>
      </div>

      <div className="panel">
        <div className="section-title">Offen ({open.length})</div>
        {open.length === 0 ? (
          <div className="empty-state">Keine offenen Aufgaben.</div>
        ) : (
          <table className="data-table">
            <thead>
              <tr><th></th><th>Aufgabe</th><th>Priorität</th><th>Termin</th><th>Zuständig</th><th>Herkunft</th></tr>
            </thead>
            <tbody>{open.map((t) => <Row key={t.id} t={t} />)}</tbody>
          </table>
        )}
      </div>

      {done.length > 0 && (
        <div className="panel">
          <div className="section-title">Erledigt ({done.length})</div>
          <table className="data-table">
            <thead>
              <tr><th></th><th>Aufgabe</th><th>Priorität</th><th>Termin</th><th>Zuständig</th><th>Herkunft</th></tr>
            </thead>
            <tbody>{done.map((t) => <Row key={t.id} t={t} />)}</tbody>
          </table>
        </div>
      )}
    </div>
  );
}
