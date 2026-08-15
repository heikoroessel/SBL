import { useEffect, useState } from 'react';
import { api } from '../../lib/api.js';

export default function Progress() {
  const [groups, setGroups] = useState([]);
  const [selectedGroup, setSelectedGroup] = useState('');
  const [rows, setRows] = useState([]);

  useEffect(() => {
    api.get('/admin/learning-groups').then(setGroups);
  }, []);

  useEffect(() => {
    if (!selectedGroup) { setRows([]); return; }
    api.get(`/admin/learning-groups/${selectedGroup}/progress`).then(setRows);
  }, [selectedGroup]);

  const byOrg = {};
  for (const r of rows) {
    (byOrg[r.organization_id] ||= { name: r.organization_name, modules: [] }).modules.push(r);
  }

  return (
    <div className="page">
      <div className="page-header">
        <h1 className="page-title">Fortschritt der Hausaufgaben</h1>
        <p className="page-lede">
          Wer hat welche freigegebene Hausaufgabe erledigt — inklusive der daraus abgeleiteten Aufgaben.
        </p>
      </div>

      <div className="panel">
        <select className="select" value={selectedGroup} onChange={(e) => setSelectedGroup(e.target.value)}>
          <option value="">— Lerngruppe auswählen —</option>
          {groups.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
        </select>
      </div>

      {Object.values(byOrg).map((org) => (
        <div key={org.name} className="panel">
          <div className="section-title">{org.name}</div>
          <table className="data-table">
            <thead>
              <tr>
                <th>Modul</th>
                <th>Pflicht</th>
                <th>Wahl</th>
                <th>Aufgaben def.</th>
                <th>Aufgaben offen</th>
                <th>Aufgaben erledigt</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {org.modules.map((m) => {
                const pflichtDone = Number(m.pflicht_done) === Number(m.pflicht_total) && Number(m.pflicht_total) > 0;
                return (
                  <tr key={m.module_id}>
                    <td>{m.module_number ? `Modul ${m.module_number} — ` : ''}{m.module_title}</td>
                    <td>{m.pflicht_done} / {m.pflicht_total}</td>
                    <td>{m.optional_done} / {m.optional_total}</td>
                    <td>{m.todos_total}</td>
                    <td>{m.todos_open}</td>
                    <td>{m.todos_done}</td>
                    <td>
                      <span className={`badge ${pflichtDone ? 'badge-done' : 'badge-open'}`}>
                        {pflichtDone ? 'Pflicht erledigt' : 'Offen'}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ))}

      {selectedGroup && Object.keys(byOrg).length === 0 && (
        <div className="empty-state">Für diese Lerngruppe wurde noch kein Modul freigegeben.</div>
      )}
    </div>
  );
}
