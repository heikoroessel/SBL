import { useEffect, useState } from 'react';
import { api } from '../../lib/api.js';

export default function Organizations() {
  const [orgs, setOrgs] = useState([]);
  const [name, setName] = useState('');
  const [expanded, setExpanded] = useState(null);
  const [users, setUsers] = useState({});
  const [newUser, setNewUser] = useState({ email: '', name: '' });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function load() {
    setOrgs(await api.get('/admin/organizations'));
  }
  useEffect(() => { load(); }, []);

  async function createOrg(e) {
    e.preventDefault();
    if (!name.trim()) return;
    setError('');
    try {
      await api.post('/admin/organizations', { name });
      setName('');
      await load();
    } catch (err) {
      setError(err.message);
    }
  }

  async function toggleActive(org) {
    await api.patch(`/admin/organizations/${org.id}`, { is_active: !org.is_active });
    await load();
  }

  async function loadUsers(orgId) {
    const data = await api.get(`/admin/organizations/${orgId}/users`);
    setUsers((prev) => ({ ...prev, [orgId]: data }));
  }

  async function expand(orgId) {
    if (expanded === orgId) { setExpanded(null); return; }
    setExpanded(orgId);
    if (!users[orgId]) await loadUsers(orgId);
  }

  async function addUser(e, orgId) {
    e.preventDefault();
    if (!newUser.email || !newUser.name) return;
    setBusy(true);
    setError('');
    try {
      await api.post(`/admin/organizations/${orgId}/users`, newUser);
      setNewUser({ email: '', name: '' });
      await loadUsers(orgId);
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function toggleUserActive(user, orgId) {
    await api.patch(`/admin/users/${user.id}`, { is_active: !user.is_active });
    await loadUsers(orgId);
  }

  async function resetPassword(userId, orgId) {
    await api.post(`/admin/users/${userId}/reset-password`);
    await loadUsers(orgId);
  }

  async function deleteUser(user, orgId) {
    if (!window.confirm(`Bearbeiter „${user.name}" (${user.email}) endgültig löschen? Die E-Mail-Adresse wird dadurch wieder frei.`)) return;
    await api.del(`/admin/users/${user.id}`);
    await loadUsers(orgId);
    await load();
  }

  return (
    <div className="page">
      <div className="page-header">
        <h1 className="page-title">Organisationen</h1>
        <p className="page-lede">
          Jede Organisation entspricht einem teilnehmenden Unternehmen mit eigener Business Landkarte.
          Lege hier Organisationen an und hinterlege, wer für sie Zugriff bekommt.
        </p>
      </div>

      <div className="panel">
        <div className="section-title">Neue Organisation</div>
        <form onSubmit={createOrg} className="flex gap-12" style={{ alignItems: 'flex-end' }}>
          <div className="field-group" style={{ flex: 1, marginBottom: 0 }}>
            <label className="field-label">Name der Organisation</label>
            <input className="text-input" value={name} onChange={(e) => setName(e.target.value)} placeholder="z. B. Musterfirma GmbH" />
          </div>
          <button className="btn btn-accent">Anlegen</button>
        </form>
        {error && <div className="error-text mt-8">{error}</div>}
      </div>

      <div className="panel">
        <div className="section-title">Alle Organisationen ({orgs.length})</div>
        {orgs.length === 0 && <div className="empty-state">Noch keine Organisation angelegt.</div>}
        {orgs.map((org) => (
          <div key={org.id} style={{ borderTop: '1px solid var(--line)', padding: '14px 0' }}>
            <div className="flex justify-between items-center">
              <div>
                <div style={{ fontWeight: 700 }}>{org.name}</div>
                <div className="small muted">{org.user_count} Bearbeiter · {org.is_active ? 'aktiv' : 'deaktiviert'}</div>
              </div>
              <div className="flex gap-8">
                <button className="btn btn-ghost btn-sm" onClick={() => expand(org.id)}>
                  {expanded === org.id ? 'Schließen' : 'Bearbeiter verwalten'}
                </button>
                <button className="btn btn-ghost btn-sm" onClick={() => toggleActive(org)}>
                  {org.is_active ? 'Deaktivieren' : 'Aktivieren'}
                </button>
              </div>
            </div>

            {expanded === org.id && (
              <div style={{ marginTop: 14, background: 'var(--paper-tint)', padding: 16, borderRadius: 4 }}>
                <table className="data-table">
                  <thead>
                    <tr><th>Name</th><th>E-Mail</th><th>Passwort</th><th>Status</th><th></th></tr>
                  </thead>
                  <tbody>
                    {(users[org.id] || []).map((u) => (
                      <tr key={u.id}>
                        <td>{u.name}</td>
                        <td>{u.email}</td>
                        <td>{u.has_password ? 'gesetzt' : 'noch nicht gesetzt'}</td>
                        <td>{u.is_active ? 'aktiv' : 'deaktiviert'}</td>
                        <td className="flex gap-8">
                          <button className="btn btn-ghost btn-sm" onClick={() => toggleUserActive(u, org.id)}>
                            {u.is_active ? 'Sperren' : 'Freischalten'}
                          </button>
                          <button className="btn btn-ghost btn-sm" onClick={() => resetPassword(u.id, org.id)}>
                            Passwort zurücksetzen
                          </button>
                          <button className="btn btn-danger btn-sm" onClick={() => deleteUser(u, org.id)}>
                            Löschen
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <form onSubmit={(e) => addUser(e, org.id)} className="flex gap-8 mt-16" style={{ alignItems: 'flex-end' }}>
                  <div className="field-group" style={{ marginBottom: 0 }}>
                    <label className="field-label">Name</label>
                    <input className="text-input" value={newUser.name} onChange={(e) => setNewUser({ ...newUser, name: e.target.value })} />
                  </div>
                  <div className="field-group" style={{ marginBottom: 0, flex: 1 }}>
                    <label className="field-label">E-Mail</label>
                    <input className="text-input" type="email" value={newUser.email} onChange={(e) => setNewUser({ ...newUser, email: e.target.value })} />
                  </div>
                  <button className="btn btn-primary btn-sm" disabled={busy}>Bearbeiter hinzufügen</button>
                </form>
                <div className="field-hint mt-8">
                  Die Person setzt ihr eigenes Passwort beim ersten Login über „Passwort vergeben" mit dieser E-Mail-Adresse.
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
