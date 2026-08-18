import { useEffect, useState } from 'react';
import { Outlet } from 'react-router-dom';
import TopBar from '../../components/TopBar.jsx';
import Footer from '../../components/Footer.jsx';
import Guide from '../../components/Guide.jsx';
import { ToastProvider } from '../../lib/ToastContext.jsx';
import { PointsProvider } from '../../lib/PointsContext.jsx';
import { api } from '../../lib/api.js';

const TABS = [
  { to: '/app/homework', label: 'Hausaufgaben' },
  { to: '/app/canvas', label: 'Landkarte' },
  { to: '/app/todos', label: 'Aufgaben' },
  { to: '/app/fortschritt', label: 'Fortschritt' },
];

export default function OrgLayout() {
  const [guideOpen, setGuideOpen] = useState(false);

  useEffect(() => {
    api.get('/org/guide-status')
      .then((res) => {
        if (!res.dismissed) setGuideOpen(true);
      })
      .catch(() => {});
  }, []);

  return (
    <ToastProvider>
      <PointsProvider>
        <div className="app-shell">
          <TopBar tabs={TABS} onOpenGuide={() => setGuideOpen(true)} />
          <Outlet />
          <Footer />
        </div>
        {guideOpen && <Guide onClose={() => setGuideOpen(false)} />}
      </PointsProvider>
    </ToastProvider>
  );
}
