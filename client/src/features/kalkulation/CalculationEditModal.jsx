// src/features/kalkulation/CalculationEditModal.jsx
import React, { useEffect, useState } from 'react';
import { X, Save, Plus, Trash2 } from 'lucide-react';
import { fetchJSON } from 'services/api';

const STATUS = ['neu', 'in Arbeit', 'erledigt'];

const num = (v) => (v === '' || v === null || v === undefined ? '' : String(v));
const toNumOrNull = (v) => (v === '' || v === null || v === undefined ? null : Number(v) || 0);

export default function CalculationEditModal({ kalkId, open, onClose, onSaved }) {
  const [loading, setLoading]   = useState(false);
  const [saving, setSaving]     = useState(false);
  const [error, setError]       = useState('');
  const [kunde, setKunde]       = useState('');
  const [header, setHeader]     = useState({ stundensatz: 85, mwst_prozent: 19, status: 'neu' });
  const [pos, setPos]           = useState([]);

  useEffect(() => {
    if (!open || !kalkId) return;
    let alive = true;
    const load = async () => {
      try {
        setLoading(true);
        setError('');
        // Erwartet: { header: {...}, positionen: [...] }
        const data = await fetchJSON(`/kalkulationen/${kalkId}`);
        if (!alive) return;
        setHeader({
          stundensatz: Number(data?.header?.stundensatz ?? 85),
          mwst_prozent: Number(data?.header?.mwst_prozent ?? 19),
          status: data?.header?.status || 'neu',
        });
        setKunde(data?.header?.firmenname || data?.header?.kunde_name || '');
        setPos(Array.isArray(data?.positionen) ? data.positionen.map((p) => ({
          id: p.position_id || crypto.randomUUID(),
          section: p.section || '',
          beschreibung: p.beschreibung || '',
          anzahl: num(p.anzahl ?? 1),
          dauer_pro_einheit: num(p.dauer_pro_einheit ?? 0),
          stundensatz: num(p.stundensatz ?? ''),
          info: p.info || '',
        })) : []);
      } catch (e) {
        console.error(e);
        setError(e?.message || 'Fehler beim Laden');
      } finally {
        if (alive) setLoading(false);
      }
    };
    load();
    return () => { alive = false; };
  }, [open, kalkId]);

  const addRow = () => setPos(prev => ([
    { id: crypto.randomUUID(), section: '', beschreibung: '', anzahl: '1', dauer_pro_einheit: '0', stundensatz: '', info: '' },
    ...prev,
  ]));

  const patchRow = (id, key, val) =>
    setPos(prev => prev.map(r => (r.id === id ? { ...r, [key]: val } : r)));

  const removeRow = (id) =>
    setPos(prev => prev.filter(r => r.id !== id));

  const save = async () => {
    try {
      setSaving(true);
      setError('');

      const payload = {
        stundensatz: toNumOrNull(header.stundensatz),
        mwst_prozent: toNumOrNull(header.mwst_prozent),
        status: header.status,
        dienstleistungen: pos.map(p => ({
          section: p.section || null,
          beschreibung: p.beschreibung || '',
          anzahl: toNumOrNull(p.anzahl),
          dauer_pro_einheit: toNumOrNull(p.dauer_pro_einheit),
          stundensatz: p.stundensatz === '' ? null : toNumOrNull(p.stundensatz),
          info: p.info || null,
        })),
      };

      await fetchJSON(`/kalkulationen/${kalkId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      onSaved?.();
      onClose?.();
    } catch (e) {
      console.error(e);
      setError(e?.message || 'Fehler beim Speichern');
    } finally {
      setSaving(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100] bg-black/50 backdrop-blur-sm flex items-center justify-center">
      <div className="w-full max-w-5xl max-h-[92vh] overflow-hidden rounded-xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 shadow-xl flex flex-col">
        {/* Header */}
        <div className="px-5 py-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Kalkulation bearbeiten</h3>
            {kunde ? <p className="text-sm text-gray-500 dark:text-gray-400">Kunde: {kunde}</p> : null}
          </div>
          <button onClick={onClose} className="p-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 overflow-auto space-y-5">
          {loading ? (
            <div className="text-center py-10 text-gray-600 dark:text-gray-300">Lade…</div>
          ) : (
            <>
              {error && <div className="p-3 bg-red-50 dark:bg-red-950/30 text-red-700 dark:text-red-300 rounded">{error}</div>}

              {/* Header-Felder */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm text-gray-600 dark:text-gray-300 mb-1">Standard-Stundensatz (€)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={header.stundensatz}
                    onChange={(e) => setHeader(h => ({ ...h, stundensatz: e.target.value }))}
                    className="w-full rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-800"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-600 dark:text-gray-300 mb-1">MwSt. (%)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={header.mwst_prozent}
                    onChange={(e) => setHeader(h => ({ ...h, mwst_prozent: e.target.value }))}
                    className="w-full rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-800"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-600 dark:text-gray-300 mb-1">Status</label>
                  <select
                    value={header.status}
                    onChange={(e) => setHeader(h => ({ ...h, status: e.target.value }))}
                    className="w-full rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-800"
                  >
                    {STATUS.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
              </div>

              {/* Positionen */}
              <div className="flex items-center justify-between mt-2">
                <h4 className="font-medium text-gray-900 dark:text-gray-100">Positionen</h4>
                <button onClick={addRow} className="inline-flex items-center px-3 py-1.5 rounded-md bg-blue-600 hover:bg-blue-700 text-white">
                  <Plus className="w-4 h-4 mr-1" /> Position
                </button>
              </div>

              <div className="overflow-x-auto border rounded-md border-gray-200 dark:border-gray-700">
                <table className="min-w-full text-sm">
                  <thead className="bg-gray-50 dark:bg-gray-800">
                    <tr className="text-left text-gray-600 dark:text-gray-300">
                      <th className="px-3 py-2 w-40">Bereich</th>
                      <th className="px-3 py-2">Beschreibung</th>
                      <th className="px-3 py-2 w-24">Anzahl</th>
                      <th className="px-3 py-2 w-28">Dauer/Einh.</th>
                      <th className="px-3 py-2 w-32">Stundensatz (€)</th>
                      <th className="px-3 py-2 w-40">Info</th>
                      <th className="px-3 py-2 w-10"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {pos.map((r) => (
                      <tr key={r.id} className="border-t border-gray-200 dark:border-gray-700">
                        <td className="px-3 py-2">
                          <input value={r.section} onChange={(e)=>patchRow(r.id,'section',e.target.value)} className="w-full rounded border-gray-300 dark:border-gray-600 dark:bg-gray-800"/>
                        </td>
                        <td className="px-3 py-2">
                          <input value={r.beschreibung} onChange={(e)=>patchRow(r.id,'beschreibung',e.target.value)} className="w-full rounded border-gray-300 dark:border-gray-600 dark:bg-gray-800"/>
                        </td>
                        <td className="px-3 py-2">
                          <input type="number" step="0.01" value={r.anzahl} onChange={(e)=>patchRow(r.id,'anzahl',e.target.value)} className="w-full rounded border-gray-300 dark:border-gray-600 dark:bg-gray-800 text-right"/>
                        </td>
                        <td className="px-3 py-2">
                          <input type="number" step="0.01" value={r.dauer_pro_einheit} onChange={(e)=>patchRow(r.id,'dauer_pro_einheit',e.target.value)} className="w-full rounded border-gray-300 dark:border-gray-600 dark:bg-gray-800 text-right"/>
                        </td>
                        <td className="px-3 py-2">
                          <input type="number" step="0.01" placeholder="leer = Standard" value={r.stundensatz} onChange={(e)=>patchRow(r.id,'stundensatz',e.target.value)} className="w-full rounded border-gray-300 dark:border-gray-600 dark:bg-gray-800 text-right"/>
                        </td>
                        <td className="px-3 py-2">
                          <input value={r.info} onChange={(e)=>patchRow(r.id,'info',e.target.value)} className="w-full rounded border-gray-300 dark:border-gray-600 dark:bg-gray-800"/>
                        </td>
                        <td className="px-3 py-2 text-right">
                          <button onClick={()=>removeRow(r.id)} className="p-1.5 rounded hover:bg-red-50 dark:hover:bg-red-900/30 text-red-600">
                            <Trash2 className="w-4 h-4"/>
                          </button>
                        </td>
                      </tr>
                    ))}
                    {pos.length === 0 && (
                      <tr><td colSpan={7} className="px-3 py-6 text-center text-gray-500 dark:text-gray-400">Keine Positionen – füge eine hinzu.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-gray-200 dark:border-gray-700 flex items-center justify-end gap-3">
          <button onClick={onClose} className="px-4 py-2 rounded-md border border-gray-300 dark:border-gray-600">Abbrechen</button>
          <button onClick={save} disabled={saving || loading} className="inline-flex items-center px-4 py-2 rounded-md bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-60">
            <Save className="w-4 h-4 mr-2"/>{saving ? 'Speichere…' : 'Speichern'}
          </button>
        </div>
      </div>
    </div>
  );
}
