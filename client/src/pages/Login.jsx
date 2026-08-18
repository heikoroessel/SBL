import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../lib/AuthContext.jsx';
import Logo from '../components/Logo.jsx';

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      const data = await login(email, password);
      navigate(data.role === 'admin' ? '/admin' : '/app');
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="login-shell">
      <div className="login-card">
        <div style={{ marginBottom: 24 }}>
          <Logo />
        </div>
        <div className="login-title">Anmelden</div>
        <div className="login-sub">Mit deiner hinterlegten E-Mail-Adresse und deinem Passwort.</div>
        <form onSubmit={handleSubmit}>
          <div className="field-group">
            <label className="field-label" htmlFor="email">E-Mail</label>
            <input
              id="email"
              className="text-input"
              type="email"
              autoComplete="username"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div className="field-group">
            <label className="field-label" htmlFor="password">Passwort</label>
            <input
              id="password"
              className="text-input"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          {error && <div className="error-text">{error}</div>}
          <button className="btn btn-primary" style={{ width: '100%', marginTop: 8 }} disabled={busy}>
            {busy ? 'Anmelden …' : 'Anmelden'}
          </button>
        </form>
      </div>
    </div>
  );
}
