import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../lib/api.js';

export default function SetPassword() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    if (password !== confirm) {
      setError('Die Passwörter stimmen nicht überein.');
      return;
    }
    setBusy(true);
    try {
      await api.post('/auth/set-password', { email, password });
      setDone(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  if (done) {
    return (
      <div className="login-shell">
        <div className="login-card">
          <div className="login-title">Passwort gesetzt</div>
          <div className="login-sub">Du kannst dich jetzt anmelden.</div>
          <Link className="btn btn-primary" style={{ width: '100%' }} to="/login">Zum Login</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="login-shell">
      <div className="login-card">
        <div className="login-title">Passwort vergeben</div>
        <div className="login-sub">
          Nutze die E-Mail-Adresse, die dein Administrator für dich hinterlegt hat.
        </div>
        <form onSubmit={handleSubmit}>
          <div className="field-group">
            <label className="field-label">E-Mail</label>
            <input className="text-input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </div>
          <div className="field-group">
            <label className="field-label">Neues Passwort</label>
            <input className="text-input" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={8} />
          </div>
          <div className="field-group">
            <label className="field-label">Passwort bestätigen</label>
            <input className="text-input" type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} required minLength={8} />
          </div>
          {error && <div className="error-text">{error}</div>}
          <button className="btn btn-primary" style={{ width: '100%', marginTop: 8 }} disabled={busy}>
            {busy ? 'Speichern …' : 'Passwort setzen'}
          </button>
        </form>
        <div className="mt-16">
          <Link className="small" to="/login">Zurück zum Login</Link>
        </div>
      </div>
    </div>
  );
}
