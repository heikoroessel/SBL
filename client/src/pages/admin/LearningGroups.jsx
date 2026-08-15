import { useEffect, useState } from 'react';
import { api } from '../../lib/api.js';

export default function LearningGroups() {
  const [groups, setGroups] = useState([]);
  const [orgs, setOrgs] = useState([]);
  const [name, setName] = useState('');
  const [selectedOrgs, setSelectedOrgs] = useState([]);
  const [error, setError] = useState('');

  async function load() {
    const [g, o] = await Promise.all([
      api.get('/admin/learning-groups'),
      api.get('/admin/organizations'),
    ]);
    setGroups(g);
    setOrgs(o);
  }
  useEffect(() => { load(); }, []);

  function toggleOrg(id) {
    setSelectedOrgs((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }

  async function createGroup(e) {
    e.preventDefault();
    if (!name.trim()) return;
    setError('');
    try {
      await api.post('/admin/learning-groups', { name, organization_ids: selectedOrgs });
      setName('');
      setSelectedOrgs([]);
      await load();
    } catch (err) {
      setError(err.message);
    }
  }

  async function addMember(groupId, orgId) {
    if (!orgId) return;
    await api.post(`/admin/learning-groups/${groupId}/members`, { organization_id: Number(orgId) });
    await load();
  }

  async function removeMember(groupId, orgId) {
    await api.del(`/admin/learning-groups/${groupId}/members/${orgId}`);
    await load();
  }

  async function toggleGroupActive(g) {
    await api.patch(`/admin/learning-groups/${g.id}`, { is_active: !g.is_active });
    await load();
  }

  return (
    <div className="page">
      <div className="page-header">
        <h1 className="page-title">Lerngruppen</h1>
        <p className="page-lede">
          Eine Lerngruppe bündelt mehrere Organisationen (z. B. deinen aktuellen Jahrgang). Module werden pro
          Lerngruppe freigegeben — mehrere Lerngruppen können parallel und unterschiedlich weit laufen.
        </p>
      </div>

      <div className="panel">
        <div className="section-title">Neue Lerngruppe</div>
        <form onSubmit={createGroup}>
          <div className="field-group">
            <label className="field-label">Name</label>
            <input className="text-input" value={name} onChange={(e) => setName(e.target.value)} placeholder="z. B. Jahrgang 2026" />
          </div>
          <div className="field-group">
            <label className="field-label">Organisationen</label>
            <div className="flex gap-8" style={{ flexWrap: 'wrap' }}>
              {orgs.map((o) => (
                <label key={o.id} className="badge badge-optional" style={{ cursor: 'pointer', gap: 6 }}>
                  <input
                    type="checkbox"
                    checked={selectedOrgs.includes(o.id)}
                    onChange={() => toggleOrg(o.id)}
                    style={{ marginRight: 4 }}
                  />
                  {o.name}
                </label>
              ))}
            </div>
          </div>
          <button className="btn btn-accent">Lerngruppe anlegen</button>
          {error && <div className="error-text mt-8">{error}</div>}
        </form>
      </div>

      <div className="panel">
        <div className="section-title">Bestehende Lerngruppen</div>
        {groups.length === 0 && <div className="empty-state">Noch keine Lerngruppe angelegt.</div>}
        {groups.map((g) => (
          <div key={g.id} style={{ borderTop: '1px solid var(--line)', padding: '14px 0' }}>
            <div className="flex justify-between items-center">
              <div style={{ fontWeight: 700 }}>
                {g.name}{' '}
                {!g.is_active && <span className="badge badge-optional">deaktiviert</span>}
              </div>
              <button className="btn btn-ghost btn-sm" onClick={() => toggleGroupActive(g)}>
                {g.is_active ? 'Deaktivieren' : 'Aktivieren'}
              </button>
            </div>
            <div className="flex gap-8 mt-8" style={{ flexWrap: 'wrap' }}>
              {g.organizations.map((o) => (
                <span key={o.id} className="badge badge-optional" style={{ gap: 6 }}>
                  {o.name}
                  <button
                    onClick={() => removeMember(g.id, o.id)}
                    style={{ border: 'none', background: 'none', cursor: 'pointer', fontSize: 12 }}
                    title="Entfernen"
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
            <div className="flex gap-8 mt-8" style={{ alignItems: 'center' }}>
              <select
                className="select"
                defaultValue=""
                onChange={(e) => { addMember(g.id, e.target.value); e.target.value = ''; }}
              >
                <option value="" disabled>Organisation hinzufügen …</option>
                {orgs.filter((o) => !g.organizations.some((m) => m.id === o.id)).map((o) => (
                  <option key={o.id} value={o.id}>{o.name}</option>
                ))}
              </select>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
