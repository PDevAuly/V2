import { useState, useCallback } from 'react';
import { fetchJSON } from '../services/api';

export default function useDashboardData() {
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState({ activeCustomers: 0, monthlyHours: 0, monthlyRevenue: 0 });
  const [customers, setCustomers] = useState([]);
  const [kalkulationen, setKalkulationen] = useState([]);

  const loadDashboardData = useCallback(async () => {
    setLoading(true);
    try {
      const [statsP, customersP, kalkP] = await Promise.allSettled([
        fetchJSON('/kalkulationen/stats'),
        fetchJSON('/customers'),
        fetchJSON('/kalkulationen'),
      ]);

      if (statsP.status === 'fulfilled') {
        const s = statsP.value || {};
        setStats({
          activeCustomers: Number(s.activeCustomers ?? 0),
          monthlyHours: Number(s.monthlyHours ?? s.avg_zeit ?? 0),
          monthlyRevenue: Number(s.monthlyRevenue ?? s.total_umsatz ?? 0),
        });
      } else {
        setStats({ activeCustomers: 0, monthlyHours: 0, monthlyRevenue: 0 });
      }

      setCustomers(customersP.status === 'fulfilled' && Array.isArray(customersP.value) ? customersP.value : []);
      setKalkulationen(kalkP.status === 'fulfilled' && Array.isArray(kalkP.value) ? kalkP.value : []);
    } finally {
      setLoading(false);
    }
  }, []);

  return { loading, stats, customers, kalkulationen, loadDashboardData, setLoading, setCustomers, setKalkulationen };
}
