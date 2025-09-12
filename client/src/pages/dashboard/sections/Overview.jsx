import React, { useState } from 'react';
import { User, Clock, TrendingUp, ChevronRight, Briefcase, Edit3, Send } from 'lucide-react';
import { euro, statusBadgeClass } from 'utils/format';
import { fetchJSON } from 'services/api';
import CalculationEditModal from 'features/kalkulation/CalculationEditModal';

/** Kleines, eigenständiges Modal zum Versenden einer Kalkulation per Mail */
function SendEmailModal({ open, onClose, kalkId, defaultSubject = '', onSent }) {
  const [to, setTo] = useState('');
  const [cc, setCc] = useState('');
  const [subject, setSubject] = useState(defaultSubject);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState('');

  React.useEffect(() => {
    setErr('');
    setLoading(false);
    // Default-Betreff setzen, wenn Modal neu geöffnet wird
    setSubject(defaultSubject || `Stundenkalkulation (ID ${kalkId})`);
  }, [open, kalkId, defaultSubject]);

  if (!open) return null;

  const onSubmit = async (e) => {
    e.preventDefault();
    setErr('');
    if (!to || !to.includes('@')) {
      setErr('Bitte eine gültige Empfänger-E-Mail angeben.');
      return;
    }
    setLoading(true);
    try {
      const payload = {
        to: to.trim(),
        subject: subject?.trim() || `Stundenkalkulation (ID ${kalkId})`,
      };
      const ccList = cc
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);
      if (ccList.length) payload.cc = ccList;

      await fetchJSON(`/kalkulationen/${kalkId}/send-email`, {
        method: 'POST',
        body: JSON.stringify(payload),
      });

      onSent?.();
      onClose?.();
      alert('E-Mail wurde versendet (PDF im Anhang).');
    } catch (e2) {
      setErr(e2?.message || 'Versand fehlgeschlagen');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Overlay */}
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      {/* Dialog */}
      <div className="relative w-full max-w-lg mx-4 rounded-lg bg-white dark:bg-gray-800 shadow-xl border border-gray-200 dark:border-gray-700">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Kalkulation per E-Mail senden</h3>
          <p className="text-sm text-gray-500 dark:text-gray-400">Eine PDF der Kalkulation wird automatisch angehängt.</p>
        </div>

        <form onSubmit={onSubmit} className="px-6 py-5 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Empfänger (To)</label>
            <input
              type="email"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              placeholder="kunde@example.com"
              className="w-full rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-900 dark:text-gray-100 focus:ring-blue-500 focus:border-blue-500"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">CC (optional, mehrere mit Komma)</label>
            <input
              type="text"
              value={cc}
              onChange={(e) => setCc(e.target.value)}
              placeholder="cc1@example.com, cc2@example.com"
              className="w-full rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-900 dark:text-gray-100 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Betreff (optional)</label>
            <input
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder={`Stundenkalkulation (ID ${kalkId})`}
              className="w-full rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-900 dark:text-gray-100 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          {err && (
            <div className="text-sm text-red-600 dark:text-red-400">{err}</div>
          )}

          <div className="flex items-center justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="inline-flex items-center px-3 py-1.5 text-sm rounded border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700"
            >
              Abbrechen
            </button>
            <button
              type="submit"
              disabled={loading}
              className="inline-flex items-center px-3 py-1.5 text-sm rounded bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-60"
            >
              <Send className="w-4 h-4 mr-1" />
              {loading ? 'Senden…' : 'Senden'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function Overview({ stats = {}, kalkulationen = [], onGoCustomers, onGoProjects, onEdited }) {
  const [editId, setEditId] = useState(null);

  // Neu: Modal-State für Senden
  const [sendOpen, setSendOpen] = useState(false);
  const [sendKalkId, setSendKalkId] = useState(null);

  const safeStats = {
    activeCustomers: stats.activeCustomers ?? 0,
    runningProjects: stats.runningProjects ?? 0,
    totalHours: stats.totalHours ?? 0,
  };

  const list = Array.isArray(kalkulationen) ? kalkulationen : [];

  const openSend = (id) => {
    setSendKalkId(id);
    setSendOpen(true);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-semibold text-gray-900 dark:text-gray-100 mb-2">Dashboard Übersicht</h2>
        <p className="text-gray-600 dark:text-gray-400">Aktuelle Statistiken und Kalkulationen</p>
      </div>

      {/* KPI-Kacheln */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {[
          { icon: User,      bg: 'bg-blue-500',   label: 'Kunden',   value: safeStats.activeCustomers, clickable: true, onClick: onGoCustomers },
          { icon: Briefcase, bg: 'bg-purple-500', label: 'Projekte', value: safeStats.runningProjects,  clickable: true, onClick: onGoProjects },
          { icon: Clock,     bg: 'bg-orange-500', label: 'Stunden',  value: Math.round(safeStats.totalHours) + 'h' },
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
                  <th key={h} className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              {list.slice(0, 5).map((k, idx) => (
                <tr key={k.kalkulations_id ?? `${k.kunde_id ?? '...'}-${idx}`} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                      {k.kunde_name || k.firmenname || '—'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="text-sm text-gray-900 dark:text-gray-300">{k.datum ? new Date(k.datum).toLocaleDateString('de-DE') : '—'}</span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="text-sm text-gray-900 dark:text-gray-300">{Number(k.gesamtzeit || 0)}h</span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="text-sm text-gray-900 dark:text-gray-300">{euro(k.sum_brutto ?? k.gesamtpreis)}</span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${statusBadgeClass(k.status)}`}>{k.status || 'neu'}</span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setEditId(k.kalkulations_id)}
                        className="inline-flex items-center px-3 py-1.5 text-xs font-medium rounded border border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-200"
                        title="Bearbeiten"
                      >
                        <Edit3 className="w-4 h-4 mr-1" /> Bearbeiten
                      </button>
                      <button
                        onClick={() => openSend(k.kalkulations_id)}
                        className="inline-flex items-center px-3 py-1.5 text-xs font-medium rounded border border-blue-300 dark:border-blue-700 bg-blue-50 dark:bg-blue-900/30 hover:bg-blue-100 dark:hover:bg-blue-900/50 text-blue-700 dark:text-blue-200"
                        title="Kalkulation senden (PDF)"
                      >
                        <Send className="w-4 h-4 mr-1" /> Senden
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

      {/* Modal: Kalkulation senden */}
      <SendEmailModal
        open={sendOpen}
        onClose={() => setSendOpen(false)}
        kalkId={sendKalkId}
        onSent={onEdited}
      />

      {/* Modal: Kalkulation bearbeiten */}
      {editId != null && (
        <CalculationEditModal
          open={true}
          kalkId={editId}
          onClose={() => setEditId(null)}
          onSaved={onEdited}
        />
      )}
    </div>
  );
}
