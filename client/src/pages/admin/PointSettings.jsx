import { useEffect, useState } from 'react';
import { api } from '../../lib/api.js';

export default function PointSettings() {
  const [values, setValues] = useState(null);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    api.get('/admin/point-settings').then(setValues);
  }, []);

  function update(key, value) {
    setValues({ ...values, [key]: value });
    setSaved(false);
  }

  async function handleSave(e) {
    e.preventDefault();
    setError('');
    try {
      const result = await api.put('/admin/point-settings', {
        points_postit_pflicht: Number(values.points_postit_pflicht),
        points_postit_optional: Number(values.points_postit_optional),
        points_todo_created: Number(values.points_todo_created),
        points_todo_done_rated: Number(values.points_todo_done_rated),
      });
      setValues(result);
      setSaved(true);
    } catch (err) {
      setError(err.message);
    }
  }

  if (!values) return <div className="page"><div className="empty-state">Lädt …</div></div>;

  return (
    <div className="page">
      <div className="page-header">
        <h1 className="page-title">Punkte-Einstellungen</h1>
        <p className="page-lede">
          Diese Werte bestimmen, wie viele Punkte Organisationen für ihre Aktivitäten bekommen.
          Änderungen wirken nur für zukünftige Punktevergaben — bereits vergebene Punkte bleiben unverändert.
        </p>
      </div>

      <form onSubmit={handleSave} className="panel">
        <div className="field-group">
          <label className="field-label">Pflicht-Postit ausgefüllt</label>
          <input className="text-input" type="number" min="0" value={values.points_postit_pflicht} onChange={(e) => update('points_postit_pflicht', e.target.value)} />
        </div>
        <div className="field-group">
          <label className="field-label">Wahl-Postit ausgefüllt</label>
          <input className="text-input" type="number" min="0" value={values.points_postit_optional} onChange={(e) => update('points_postit_optional', e.target.value)} />
        </div>
        <div className="field-group">
          <label className="field-label">Aufgabe angelegt</label>
          <input className="text-input" type="number" min="0" value={values.points_todo_created} onChange={(e) => update('points_todo_created', e.target.value)} />
        </div>
        <div className="field-group">
          <label className="field-label">Aufgabe abgeschlossen (mit Bewertung)</label>
          <input className="text-input" type="number" min="0" value={values.points_todo_done_rated} onChange={(e) => update('points_todo_done_rated', e.target.value)} />
        </div>
        <button className="btn btn-accent">Speichern</button>
        {saved && <span className="small mt-8" style={{ marginLeft: 12, color: '#3b6d11' }}>Gespeichert.</span>}
        {error && <div className="error-text mt-8">{error}</div>}
      </form>
    </div>
  );
}
