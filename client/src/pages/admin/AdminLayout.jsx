import { Outlet } from 'react-router-dom';
import TopBar from '../../components/TopBar.jsx';

const TABS = [
  { to: '/admin/organizations', label: 'Organisationen' },
  { to: '/admin/learning-groups', label: 'Lerngruppen' },
  { to: '/admin/modules', label: 'Module verwalten' },
  { to: '/admin/assignment', label: 'Freigabe' },
  { to: '/admin/progress', label: 'Fortschritt' },
  { to: '/admin/point-settings', label: 'Punkte' },
];

export default function AdminLayout() {
  return (
    <div className="app-shell">
      <TopBar tabs={TABS} />
      <Outlet />
    </div>
  );
}
