import { useEffect, useState } from 'react';
import { api } from '../../lib/api.js';

export default function Modules() {
  const [modules, setModules] = useState([]);
  const [groups, setGroups] = useState([]);
  const [selectedGroup, setSelectedGroup] = useState('');
  const [assignments, setAssignments] = useState([]);
  const [expandedModule, setExpandedModule] = useState(null);
  const [error, setError] = useState('');

  async function load() {
    const [m, g] = await Promise.all([
      api.get('/admin/modules'),
      api.get('/admin/learning-groups'),
    ]);
    setModules(m);
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
        <h1 className="page-title">Module &amp; Freigabe</h1>
        <p className="page-lede">
          Alle 16 Lektionen des Systemischer-Kompass-Programms sind bereits mit Fragen und
          Pflicht-/Wahlfeldern befüllt. Wähle eine Lerngruppe aus und gib die Module frei, die sie
          als Hausaufgabe bearbeiten soll — in beliebiger Reihenfolge und jederzeit erweiterbar.
        </p>
      </div>

      <div className="panel">
        <div className="section-title">Lerngruppe wählen</div>
        <select className="select" value={selectedGroup} onChange={(e) => setSelectedGroup(e.target.value)}>
          <option value="">— Lerngruppe auswählen —</option>
          {groups.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
        </select>
        {error && <div className="error-text mt-8">{error}</div>}
      </div>

      <div className="panel">
        <div className="section-title">Modul-Datenbank ({modules.length})</div>
        {modules.map((m) => {
          const released = releasedModuleIds.has(m.id);
          const isOpen = expandedModule === m.id;
          const pflichtCount = m.tasks.filter((t) => t.task_type === 'pflicht').length;
          const optionalCount = m.tasks.filter((t) => t.task_type === 'optional').length;
          return (
            <div key={m.id} style={{ borderTop: '1px solid var(--line)', padding: '14px 0' }}>
              <div className="flex justify-between items-center">
                <div style={{ flex: 1 }}>
                  <div className="flex gap-8 items-center">
                    {m.number && <span className="badge badge-optional">Modul {m.number}</span>}
                    <span style={{ fontWeight: 700 }}>{m.title}</span>
                  </div>
                  <div className="small muted mt-8">{m.subtitle}</div>
                  <div className="small muted mt-8">
                    {pflichtCount} Pflichtfeld{pflichtCount === 1 ? '' : 'er'}, {optionalCount} Wahlfeld{optionalCount === 1 ? '' : 'er'}
                  </div>
                </div>
                <div className="flex gap-8">
                  <button className="btn btn-ghost btn-sm" onClick={() => setExpandedModule(isOpen ? null : m.id)}>
                    {isOpen ? 'Details schließen' : 'Details'}
                  </button>
                  {selectedGroup && (
                    released ? (
                      <span className="badge badge-done">Freigegeben</span>
                    ) : (
                      <button className="btn btn-accent btn-sm" onClick={() => release(m.id)}>Freigeben</button>
                    )
                  )}
                </div>
              </div>

              {isOpen && (
                <div style={{ marginTop: 14, background: 'var(--paper-tint)', padding: 16, borderRadius: 4 }}>
                  {m.description && <p className="small" style={{ marginBottom: 14, lineHeight: 1.6 }}>{m.description}</p>}
                  {m.tasks.map((t) => (
                    <div key={t.id} className="panel" style={{ marginBottom: 10, padding: 14 }}>
                      <div className="flex gap-8 items-center">
                        <span className={`badge ${t.task_type === 'pflicht' ? 'badge-pflicht' : 'badge-optional'}`}>
                          {t.task_type === 'pflicht' ? 'Pflicht' : 'Wahl'}
                        </span>
                        <span className="dot" style={{ background: t.color_hex }} />
                        <span className="small muted">{t.perspective_label}</span>
                        <span style={{ fontWeight: 700, marginLeft: 4 }}>{t.field_label}</span>
                      </div>
                      {t.question_1 && <p className="small mt-8">→ {t.question_1}</p>}
                      {t.question_2 && <p className="small mt-8">→ {t.question_2}</p>}
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
