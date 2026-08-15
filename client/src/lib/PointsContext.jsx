import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { api } from './api.js';
import { useToast } from './ToastContext.jsx';

const PointsContext = createContext(null);

export function PointsProvider({ children }) {
  const [total, setTotal] = useState(null);
  const [bump, setBump] = useState(false);
  const { showToast } = useToast() || {};

  const refresh = useCallback(async () => {
    try {
      const data = await api.get('/org/points/summary');
      setTotal((prev) => {
        if (prev !== null && data.total > prev) {
          const diff = data.total - prev;
          showToast?.(`+${diff} Punkte`);
          setBump(true);
          setTimeout(() => setBump(false), 300);
        }
        return data.total;
      });
    } catch {
      // Punktekonto ist nicht kritisch für die Kernfunktion, Fehler still ignorieren.
    }
  }, [showToast]);

  useEffect(() => { refresh(); }, [refresh]);

  return (
    <PointsContext.Provider value={{ total, bump, refresh }}>
      {children}
    </PointsContext.Provider>
  );
}

export function usePoints() {
  return useContext(PointsContext);
}
