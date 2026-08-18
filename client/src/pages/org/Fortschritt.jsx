import { useEffect, useState } from 'react';
import { api } from '../../lib/api.js';
import { usePoints } from '../../lib/PointsContext.jsx';
import InfoPopover from '../../components/InfoPopover.jsx';
import StarRating from '../../components/StarRating.jsx';

export default function Fortschritt() {
  const [groupPoints, setGroupPoints] = useState([]);
  const [pinboardScope, setPinboardScope] = useState('organization');
  const [stories, setStories] = useState([]);
  const [config, setConfig] = useState(null);
  const points = usePoints();

  useEffect(() => {
    api.get('/org/points/learning-group').then(setGroupPoints);
    api.get('/org/points/config').then(setConfig);
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
        <div className="flex items-center gap-8" style={{ marginBottom: 4 }}>
          <div className="section-title" style={{ marginBottom: 0 }}>Dein Punktekonto</div>
          <InfoPopover>
            <strong>So werden Punkte vergeben:</strong>
            <ul style={{ margin: '8px 0 0', paddingLeft: 18 }}>
              <li>Pflicht-Postit ausgefüllt: {config?.points_postit_pflicht ?? '…'} Punkte</li>
              <li>Wahl-Postit ausgefüllt: {config?.points_postit_optional ?? '…'} Punkte</li>
              <li>Aufgabe angelegt: {config?.points_todo_created ?? '…'} Punkt(e)</li>
              <li>Aufgabe abgeschlossen (mit Bewertung): {config?.points_todo_done_rated ?? '…'} Punkte</li>
            </ul>
          </InfoPopover>
        </div>
        <div style={{ fontSize: 40, fontWeight: 800 }}>{points?.total ?? '…'}</div>
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
          <div className="flex gap-8 pinboard-scope-toggle">
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
          <div className="pinboard-masonry mt-16">
            {stories.map((s) => (
              <div key={s.id} className="pinboard-card">
                {s.organization_name && <div className="pinboard-card-org">{s.organization_name}</div>}
                <div className="pinboard-card-title">{s.card_title || s.field_label}</div>
                <div className="pinboard-card-body">{s.rating_text || s.description}</div>
                <div className="pinboard-card-stars"><StarRating value={s.rating_stars} readOnly /></div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
