import { useEffect, useState } from 'react';
import { api } from '../../lib/api.js';

export default function Assignment() {
  const [modules, setModules] = useState([]);
  const [groups, setGroups] = useState([]);
  const [selectedGroup, setSelectedGroup] = useState('');
  const [assignments, setAssignments] = useState([]);
  const [error, setError] = useState('');

  async function load() {
    const [m, g] = await Promise.all([
      api.get('/admin/modules'),
      api.get('/admin/learning-groups'),
    ]);
    setModules(m.filter((mod) => mod.is_active));
    setGroups(g);
  }
  useEffect(() => { load(); }, []);

  async function loadAssignments(groupId) {
    if (!groupId) { setAssignments([]); return; }
    setAssignments(await api.get(`/admin/learning-groups/${groupId}/assignments`));
  }

  useEffect(() => { loadAssignments(selectedGroup); }, [selectedGroup]);

  const releasedModuleIds = new Set(assignments.map((a) => a.module_id));

  async function release(moduleId) {
    if (!selectedGroup) return;
    setError('');
    try {
      await api.post(`/admin/learning-groups/${selectedGroup}/assignments`, { module_id: moduleId });
      await loadAssignments(selectedGroup);
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <div className="page">
      <div className="page-header">
        <h1 className="page-title">Freigabe</h1>
        <p className="page-lede">
          Wähle eine Lerngruppe aus und gib die Module frei, die sie als Hausaufgabe bearbeiten soll —
          in beliebiger Reihenfolge und jederzeit erweiterbar. Inhalte pflegst du unter „Module verwalten".
        </p>
      </div>

      <div className="panel">
        <div className="section-title">Lerngruppe wählen</div>
        <select className="select" value={selectedGroup} onChange={(e) => setSelectedGroup(e.target.value)}>
          <option value="">— Lerngruppe auswählen —</option>
          {groups.map((g) => <option key={g.id} value={g.id}>{g.name}{!g.is_active ? ' (deaktiviert)' : ''}</option>)}
        </select>
        {error && <div className="error-text mt-8">{error}</div>}
      </div>

      <div className="panel">
        <div className="section-title">Verfügbare Module ({modules.length})</div>
        {modules.map((m) => {
          const released = releasedModuleIds.has(m.id);
          const pflichtCount = m.tasks.filter((t) => t.task_type === 'pflicht').length;
          const optionalCount = m.tasks.filter((t) => t.task_type === 'optional').length;
          return (
            <div key={m.id} className="flex justify-between items-center" style={{ borderTop: '1px solid var(--line)', padding: '14px 0' }}>
              <div>
                <div className="flex gap-8 items-center">
                  {m.number && <span className="badge badge-optional">Modul {m.number}</span>}
                  <span style={{ fontWeight: 700 }}>{m.title}</span>
                </div>
                <div className="small muted mt-8">
                  {m.subtitle} · {pflichtCount} Pflichtfeld{pflichtCount === 1 ? '' : 'er'}, {optionalCount} Wahlfeld{optionalCount === 1 ? '' : 'er'}
                </div>
              </div>
              {selectedGroup && (
                released ? (
                  <span className="badge badge-done">Freigegeben</span>
                ) : (
                  <button className="btn btn-accent btn-sm" onClick={() => release(m.id)}>Freigeben</button>
                )
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
