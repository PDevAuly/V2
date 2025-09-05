// client/src/hooks/useDashboardData.js
import { useState, useCallback, useRef, useEffect } from 'react';
import { fetchJSON } from 'services/api'; // absolut dank baseUrl: "src"

export default function useDashboardData() {
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState({ activeCustomers: 0, runningProjects: 0, totalHours: 0 });
  const [customers, setCustomers] = useState([]);
  const [kalkulationen, setKalkulationen] = useState([]);

  // verhindert setState nach Unmount (z. B. bei schnellem Routenwechsel)
  const isMountedRef = useRef(true);
  useEffect(() => {
    return () => { isMountedRef.current = false; };
  }, []);

  const loadDashboardData = useCallback(async () => {
    setLoading(true);
    try {
      const [statsP, customersP, kalkP] = await Promise.allSettled([
        fetchJSON('/kalkulationen/stats'),
        fetchJSON('/customers'),
        fetchJSON('/kalkulationen'),
      ]);

      if (!isMountedRef.current) return;

      // Stats
      if (statsP.status === 'fulfilled' && statsP.value) {
        const s = statsP.value;
        setStats({
  activeCustomers: Number(s.activeCustomers ?? 0),
  runningProjects: Number(s.runningProjects ?? 0),  // NEU
  totalHours: Number(s.totalHours ?? 0),            // NEU
});
      } else {
        setStats({ activeCustomers: 0, runningProjects: 0, totalHours: 0 });
      }

      // Customers
      setCustomers(customersP.status === 'fulfilled' && Array.isArray(customersP.value) ? customersP.value : []);

      // Kalkulationen
      setKalkulationen(kalkP.status === 'fulfilled' && Array.isArray(kalkP.value) ? kalkP.value : []);
    } catch (err) {
      // Optional: Logging
      console.error('loadDashboardData failed:', err);
      if (isMountedRef.current) {
        setStats({ activeCustomers: 0, runningProjects: 0, totalHours: 0 });
        setCustomers([]);
        setKalkulationen([]);
      }
    } finally {
      if (isMountedRef.current) setLoading(false);
    }
  }, []);

  return {
    loading,
    stats,
    customers,
    kalkulationen,
    loadDashboardData,

    // Falls du irgendwo manuell setzen möchtest:
    setLoading,
    setCustomers,
    setKalkulationen,
  };
}
