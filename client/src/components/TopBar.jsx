import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../lib/AuthContext.jsx';

export default function TopBar({ tabs }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  async function handleLogout() {
    await logout();
    navigate('/login');
  }

  return (
    <div className="topbar">
      <div className="brand">
        <div className="brand-mark" />
        <div className="brand-text">
          <div className="brand-title">Systemischer Kompass</div>
          <div className="brand-sub">Business Landkarte</div>
        </div>
      </div>
      <div className="nav-tabs">
        {tabs.map((t) => (
          <NavLink
            key={t.to}
            to={t.to}
            className={({ isActive }) => `nav-tab${isActive ? ' active' : ''}`}
            end={t.end}
          >
            {t.label}
          </NavLink>
        ))}
      </div>
      <div className="user-chip">
        <span>{user?.name}{user?.organizationName ? ` · ${user.organizationName}` : ''}</span>
        <button className="logout-link" onClick={handleLogout}>Abmelden</button>
      </div>
    </div>
  );
}
