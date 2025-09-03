import React from 'react';
import { User, Clock, TrendingUp, ChevronRight } from 'lucide-react';
import { euro, statusBadgeClass } from 'utils/format'; // <-- absolut dank baseUrl

export default function Overview({ stats = {}, kalkulationen = [], onGoCustomers }) {
  const safeStats = {
    activeCustomers: stats.activeCustomers ?? 0,
    monthlyHours: stats.monthlyHours ?? 0,
    monthlyRevenue: stats.monthlyRevenue ?? 0,
  };
  const list = Array.isArray(kalkulationen) ? kalkulationen : [];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold text-gray-900 dark:text-gray-100 mb-2">Dashboard Übersicht</h2>
        <p className="text-gray-600 dark:text-gray-400">Aktuelle Statistiken und Kalkulationen</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {[
          { icon: User, bg: 'bg-blue-500',   label: 'Kunden',          value: safeStats.activeCustomers,             clickable: true, onClick: onGoCustomers },
          { icon: Clock, bg: 'bg-orange-500', label: 'Stunden (Monat)', value: Math.round(safeStats.monthlyHours) + 'h' },
          { icon: TrendingUp, bg: 'bg-purple-500', label: 'Umsatz (Monat)', value: euro(safeStats.monthlyRevenue) },
        ].map((item, index) => (
          <div
            key={index}
            onClick={item.onClick}
            className={`bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700
              transition-all duration-200 hover:shadow-md hover:scale-[1.02] hover:border-gray-300 dark:hover:border-gray-600
              ${item.onClick ? 'cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 active:scale-[0.98]' : ''}`}
          >
            <div className="flex items-center">
              <div className={`w-8 h-8 ${item.bg} rounded-md flex items-center justify-center`}>
                <item.icon className="w-4 h-4 text-white" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600 dark:text-gray-300 flex items-center">
                  {item.label}
                  {item.onClick && <ChevronRight className="w-3 h-3 ml-1 opacity-60" />}
                </p>
                <p className="text-2xl font-semibold text-gray-900 dark:text-gray-100">{item.value}</p>
              </div>
            </div>
            {item.onClick && <div className="mt-2 text-xs text-gray-500 dark:text-gray-400">Klicken für Details →</div>}
          </div>
        ))}
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">Aktuelle Kalkulationen</h3>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-gray-700 border-b border-gray-200 dark:border-gray-600">
              <tr>
                {['Kunde', 'Datum', 'Stunden', 'Gesamtpreis, €', 'Status'].map((h) => (
                  <th key={h} className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              {list.slice(0, 5).map((k, idx) => (
                <tr key={k.kalkulations_id ?? `${k.kunde_id ?? 'k'}-${k.datum ?? 'd'}-${idx}`} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                      {k.kunde_name || k.firmenname || '—'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="text-sm text-gray-900 dark:text-gray-300">
                      {k.datum ? new Date(k.datum).toLocaleDateString('de-DE') : '—'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="text-sm text-gray-900 dark:text-gray-300">{Number(k.gesamtzeit || 0)}h</span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="text-sm text-gray-900 dark:text-gray-300">{k.gesamtpreis?.toLocaleString('de-DE')}</span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${statusBadgeClass(k.status)}`}>
                      {k.status || 'neu'}
                    </span>
                  </td>
                </tr>
              ))}
              {list.length === 0 && (
                <tr>
                  <td colSpan="5" className="px-6 py-8 text-center text-sm text-gray-500 dark:text-gray-400">
                    Keine Kalkulationen vorhanden.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
