import { Outlet } from 'react-router-dom';
import TopBar from '../../components/TopBar.jsx';
import Footer from '../../components/Footer.jsx';
import { ToastProvider } from '../../lib/ToastContext.jsx';
import { PointsProvider } from '../../lib/PointsContext.jsx';

const TABS = [
  { to: '/app/homework', label: 'Hausaufgaben' },
  { to: '/app/canvas', label: 'Landkarte' },
  { to: '/app/todos', label: 'Aufgaben' },
  { to: '/app/fortschritt', label: 'Fortschritt' },
];

export default function OrgLayout() {
  return (
    <ToastProvider>
      <PointsProvider>
        <div className="app-shell">
          <TopBar tabs={TABS} />
          <Outlet />
          <Footer />
        </div>
      </PointsProvider>
    </ToastProvider>
  );
}
