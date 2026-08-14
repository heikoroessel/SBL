import { useEffect, useState } from 'react';
import { api } from '../../lib/api.js';

function Stars({ n }) {
  return <span style={{ color: 'var(--accent)' }}>{'★'.repeat(n)}{'☆'.repeat(5 - n)}</span>;
}

export default function Fortschritt() {
  const [summary, setSummary] = useState(null);
  const [groupPoints, setGroupPoints] = useState([]);
  const [pinboardScope, setPinboardScope] = useState('organization');
  const [stories, setStories] = useState([]);

  useEffect(() => {
    api.get('/org/points/summary').then(setSummary);
    api.get('/org/points/learning-group').then(setGroupPoints);
  }, []);

  useEffect(() => {
    api.get('/org/pinboard', { scope: pinboardScope }).then(setStories);
  }, [pinboardScope]);

  const maxPoints = Math.max(1, ...groupPoints.map((g) => g.total));

  return (
    <div className="page">
      <div className="page-header">
        <h1 className="page-title">Fortschritt &amp; Erfolge</h1>
        <p className="page-lede">
          Punkte für erledigte Postits und abgeschlossene Aufgaben — sowohl deiner Organisation
          als auch im Vergleich zur ganzen Lerngruppe.
        </p>
      </div>

      <div className="panel">
        <div className="section-title">Dein Punktekonto</div>
        <div style={{ fontSize: 40, fontWeight: 800 }}>{summary?.total ?? '…'}</div>
      </div>

      <div className="panel">
        <div className="section-title">Lerngruppe im Vergleich</div>
        {groupPoints.map((g) => (
          <div className="progress-row" key={g.organization_id}>
            <div className="progress-label">{g.organization_name}</div>
            <div className="progress-track">
              <div className="progress-fill" style={{ width: `${(g.total / maxPoints) * 100}%` }} />
            </div>
            <div className="progress-points">{g.total}</div>
          </div>
        ))}
      </div>

      <div className="panel">
        <div className="flex justify-between items-center">
          <div className="section-title" style={{ marginBottom: 0 }}>Pinnwand</div>
          <div className="flex gap-8">
            <button
              className={`btn btn-sm ${pinboardScope === 'organization' ? 'btn-primary' : 'btn-ghost'}`}
              onClick={() => setPinboardScope('organization')}
            >
              Meine Organisation
            </button>
            <button
              className={`btn btn-sm ${pinboardScope === 'group' ? 'btn-primary' : 'btn-ghost'}`}
              onClick={() => setPinboardScope('group')}
            >
              Lerngruppe
            </button>
          </div>
        </div>

        {stories.length === 0 ? (
          <div className="empty-state">Noch keine Erfolgsgeschichten geteilt.</div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 12, marginTop: 14 }}>
            {stories.map((s) => (
              <div key={s.id} className="panel" style={{ padding: 14 }}>
                {s.organization_name && <div className="small muted">{s.organization_name}</div>}
                <div style={{ fontWeight: 700, marginTop: 4 }}>{s.card_title || s.field_label}</div>
                <div className="small mt-8">{s.description}</div>
                <div className="mt-8"><Stars n={s.rating_stars} /></div>
                {s.rating_text && <div className="small muted mt-8">{s.rating_text}</div>}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
