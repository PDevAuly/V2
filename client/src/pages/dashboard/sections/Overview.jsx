import React, { useState } from 'react';
import { User, Clock, ChevronRight, Briefcase, Edit, Send } from 'lucide-react';
import { euro, statusBadgeClass } from 'utils/format';
import { fetchJSON } from 'services/api';
import CalculationEditModal from 'features/kalkulation/CalculationEditModal'; // ggf. Pfad anpassen

export default function Overview({ stats = {}, kalkulationen = [], onGoCustomers, onGoProjects, onEdited }) {
  const [editOpen, setEditOpen] = useState(false);
  const [editId, setEditId] = useState(null);
  const [sending, setSending] = useState({});

  const safeStats = {
    activeCustomers: stats.activeCustomers ?? 0,
    runningProjects: stats.runningProjects ?? 0,
    totalHours: stats.totalHours ?? 0,
  };

  const list = Array.isArray(kalkulationen) ? kalkulationen : [];

  const openEdit = (id) => {
    setEditId(id);
    setEditOpen(true);
  };

  const sendCalculation = async (row) => {
    if (!row?.kalkulations_id) return;
    const id = row.kalkulations_id;
    setSending((s) => ({ ...s, [id]: true }));
    
    try {
      // 1) Erst ohne Empfänger senden -> Backend nutzt Kunden-E-Mail aus DB (falls vorhanden)
      await fetchJSON(`/kalkulationen/${id}/send-email`, { 
        method: 'POST', 
        body: JSON.stringify({}) 
      });
      alert('E-Mail wurde versendet (PDF im Anhang).');
    } catch (e) {
      const msg = e?.message || '';
      // 2) Falls keine Empfängeradresse hinterlegt: nachfragen
      if (msg.toLowerCase().includes('empfängeradresse')) {
        const to = window.prompt('Empfänger-E-Mail eingeben:');
        if (!to) return;
        
        try {
          await fetchJSON(`/kalkulationen/${id}/send-email`, {
            method: 'POST',
            body: JSON.stringify({ to }),
          });
          alert('E-Mail wurde versendet (PDF im Anhang).');
        } catch (secondError) {
          console.error(secondError);
          alert('Senden fehlgeschlagen: ' + (secondError?.message || 'Unbekannter Fehler'));
        }
      } else {
        console.error(e);
        alert('Senden fehlgeschlagen: ' + (e?.message || 'Unbekannter Fehler'));
      }
    } finally {
      setSending((s) => ({ ...s, [id]: false }));
    }
  };

  return (
    <div className="space-y-6">
      {/* KPI-Kacheln */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {[
          { icon: User, label: 'Aktive Kunden', value: safeStats.activeCustomers, onClick: onGoCustomers },
          { icon: Briefcase, label: 'Laufende Projekte', value: safeStats.runningProjects, onClick: onGoProjects },
          { icon: Clock, label: 'Gesamtstunden', value: safeStats.totalHours },
        ].map((item, idx) => (
          <div
            key={idx}
            onClick={item.onClick}
            className={`bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-5 ${item.onClick ? 'cursor-pointer hover:shadow-md transition-shadow' : ''}`}
          >
            <div className="flex items-center">
              <div className="p-2 rounded-md bg-blue-50 dark:bg-blue-900/40 text-blue-600 dark:text-blue-200">
                <item.icon className="w-5 h-5" />
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

      {/* Aktuelle Kalkulationen */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">Aktuelle Kalkulationen</h3>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-gray-700 border-b border-gray-200 dark:border-gray-600">
              <tr>
                {['Kunde', 'Datum', 'Stunden', 'Gesamtpreis€', 'Status', 'Aktionen'].map((h) => (
                  <th key={h} className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {list.map((k) => (
                <tr key={k.kalkulations_id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900 dark:text-gray-100">{k.firmenname || '—'}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-700 dark:text-gray-300">
                      {k.datum ? new Date(k.datum).toLocaleDateString('de-DE') : '—'}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-700 dark:text-gray-300">{k.gesamtzeit ?? '—'}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-700 dark:text-gray-300">{euro(k.sum_brutto ?? k.gesamtpreis)}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${statusBadgeClass(k.status)}`}>
                      {k.status || 'neu'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => openEdit(k.kalkulations_id)}
                        className="inline-flex items-center px-2.5 py-1.5 text-xs font-medium rounded border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200"
                        title="Bearbeiten"
                      >
                        <Edit className="w-4 h-4 mr-1" /> Bearbeiten
                      </button>
                      <button
                        onClick={() => sendCalculation(k)}
                        disabled={!!sending[k.kalkulations_id]}
                        className="inline-flex items-center px-2.5 py-1.5 text-xs font-medium rounded border border-blue-300 dark:border-blue-700 bg-blue-50 dark:bg-blue-900/30 hover:bg-blue-100 dark:hover:bg-blue-900/50 text-blue-700 dark:text-blue-200 disabled:opacity-60"
                        title="Kalkulation senden (PDF)"
                      >
                        <Send className="w-4 h-4 mr-1" /> {sending[k.kalkulations_id] ? 'Senden…' : 'Senden'}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {list.length === 0 && (
                <tr>
                  <td colSpan="6" className="px-6 py-8 text-center text-sm text-gray-500 dark:text-gray-400">
                    Keine Kalkulationen vorhanden.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <CalculationEditModal
        kalkId={editId}
        open={editOpen}
        onClose={() => setEditOpen(false)}
        onSaved={() => {
          setEditOpen(false);
          if (onEdited) onEdited(); // Dashboard-Daten neu laden
        }}
      />
    </div>
  );
}