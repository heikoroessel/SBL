import { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../lib/AuthContext.jsx';
import { usePoints } from '../lib/PointsContext.jsx';
import Logo from './Logo.jsx';

export default function TopBar({ tabs, onOpenGuide }) {
  const { user, logout } = useAuth();
  const points = usePoints();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);

  async function handleLogout() {
    await logout();
    navigate('/login');
  }

  return (
    <div className="topbar">
      <NavLink to="/" className="brand-link" onClick={() => setMenuOpen(false)}>
        <Logo />
      </NavLink>

      <div className="nav-tabs nav-tabs-desktop">
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

      <div className="user-chip user-chip-desktop">
        {onOpenGuide && (
          <button className="help-btn" onClick={onOpenGuide} title="Einführung anzeigen">?</button>
        )}
        {user?.role === 'org_user' && points?.total !== null && (
          <span className="points-chip">
            <span className={`points-value${points.bump ? ' bump' : ''}`}>{points.total}</span>
            Punkte
          </span>
        )}
        <span>{user?.name}{user?.organizationName ? ` · ${user.organizationName}` : ''}</span>
        <button className="logout-link" onClick={handleLogout}>Abmelden</button>
      </div>

      <button className="hamburger-btn" onClick={() => setMenuOpen((o) => !o)} aria-label="Menü öffnen">
        <span />
        <span />
        <span />
      </button>

      {menuOpen && (
        <div className="mobile-menu">
          {user?.role === 'org_user' && points?.total !== null && (
            <div className="mobile-menu-points">
              <span className={`points-value${points.bump ? ' bump' : ''}`}>{points.total}</span> Punkte
            </div>
          )}
          {tabs.map((t) => (
            <NavLink
              key={t.to}
              to={t.to}
              className={({ isActive }) => `mobile-menu-link${isActive ? ' active' : ''}`}
              end={t.end}
              onClick={() => setMenuOpen(false)}
            >
              {t.label}
            </NavLink>
          ))}
          <div className="mobile-menu-divider" />
          <div className="mobile-menu-user">{user?.name}{user?.organizationName ? ` · ${user.organizationName}` : ''}</div>
          {onOpenGuide && (
            <button className="mobile-menu-link" onClick={() => { setMenuOpen(false); onOpenGuide(); }}>
              ? Einführung anzeigen
            </button>
          )}
          <button className="mobile-menu-link" onClick={handleLogout}>Abmelden</button>
        </div>
      )}
    </div>
  );
}
