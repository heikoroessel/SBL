import { Outlet } from 'react-router-dom';
import TopBar from '../../components/TopBar.jsx';

const TABS = [
  { to: '/app/homework', label: 'Hausaufgaben' },
  { to: '/app/canvas', label: 'Landkarte' },
  { to: '/app/todos', label: 'Aufgaben' },
  { to: '/app/fortschritt', label: 'Fortschritt' },
];

export default function OrgLayout() {
  return (
    <div className="app-shell">
      <TopBar tabs={TABS} />
      <Outlet />
    </div>
  );
}
