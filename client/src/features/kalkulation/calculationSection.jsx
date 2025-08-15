import React from 'react';

export default function CalculationSection({
  customers,
  calculationForm,
  setCalculationForm,
  mwst,
  setMwst,
  loading,
  onSubmit,
  isDark, // Dark Mode Prop hinzugefügt
}) {
  // Dark Mode Klassen
  const bgClass = isDark ? 'bg-gray-800' : 'bg-white';
  const borderClass = isDark ? 'border-gray-700' : 'border-gray-200';
  const textClass = isDark ? 'text-gray-100' : 'text-gray-900';
  const textSecondaryClass = isDark ? 'text-gray-300' : 'text-gray-700';
  const textMutedClass = isDark ? 'text-gray-400' : 'text-gray-500';
  const inputClass = isDark 
    ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400 focus:ring-blue-500 focus:border-blue-500'
    : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500 focus:ring-blue-500 focus:border-blue-500';
  const bgHoverClass = isDark ? 'hover:bg-gray-700' : 'hover:bg-gray-50';
  const tableHeaderClass = isDark ? 'bg-gray-700' : 'bg-gray-50';
  const sumBoxClass = isDark ? 'bg-gray-700' : 'bg-gray-50';

  // Zeilen-Helper
  const addDienstleistung = () => {
    setCalculationForm((prev) => ({
      ...prev,
      dienstleistungen: [
        ...prev.dienstleistungen,
        { beschreibung: '', dauer_pro_einheit: 0, anzahl: 1, info: '', stundensatz: undefined },
      ],
    }));
  };

  const removeDienstleistung = (index) => {
    setCalculationForm((prev) => ({
      ...prev,
      dienstleistungen: prev.dienstleistungen.filter((_, i) => i !== index),
    }));
  };

  const updateDienstleistung = (index, field, value) => {
    setCalculationForm((prev) => {
      const copy = [...prev.dienstleistungen];
      copy[index] = { ...copy[index], [field]: value };
      return { ...prev, dienstleistungen: copy };
    });
  };

  const addRowBelow = (index) => {
    setCalculationForm((prev) => {
      const copy = [...prev.dienstleistungen];
      copy.splice(index + 1, 0, { beschreibung: '', dauer_pro_einheit: 0, anzahl: 1, info: '', stundensatz: undefined });
      return { ...prev, dienstleistungen: copy };
    });
  };

  // Rechen-Helper
  const rowHours = (d) => (Number(d.dauer_pro_einheit) || 0) * (Number(d.anzahl) || 1);
  const rowRate = (d) => Number(d.stundensatz ?? calculationForm.stundensatz) || 0;
  const rowTotal = (d) => rowHours(d) * rowRate(d);

  const sumNetto = calculationForm.dienstleistungen.reduce((acc, d) => acc + rowTotal(d), 0);
  const sumMwst = sumNetto * (Number(mwst) / 100);
  const sumBrutto = sumNetto + sumMwst;

  return (
    <div className={`${bgClass} ${borderClass} rounded-lg shadow-sm border p-6`}>
      <form onSubmit={onSubmit} className="space-y-6">
        {/* Kopf */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div>
            <label className={`block text-sm font-medium ${textSecondaryClass} mb-2`}>Kunde auswählen *</label>
            <select
              required
              value={calculationForm.kunde_id}
              onChange={(e) => setCalculationForm({ ...calculationForm, kunde_id: e.target.value })}
              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 ${inputClass}`}
            >
              <option value="">Kunde wählen...</option>
              {customers.map((k) => (
                <option key={k.kunden_id} value={k.kunden_id}>
                  {k.firmenname}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className={`block text-sm font-medium ${textSecondaryClass} mb-2`}>Standard-Stundensatz (€) *</label>
            <input
              type="number"
              required
              step="0.01"
              value={calculationForm.stundensatz}
              onChange={(e) =>
                setCalculationForm({ ...calculationForm, stundensatz: Number(e.target.value) })
              }
              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 ${inputClass}`}
              placeholder="85.00"
            />
            <p className={`text-xs ${textMutedClass} mt-1`}>Gilt für Zeilen ohne eigenen Satz.</p>
          </div>

          <div>
            <label className={`block text-sm font-medium ${textSecondaryClass} mb-2`}>MwSt (%)</label>
            <input
              type="number"
              step="0.1"
              value={mwst}
              onChange={(e) => setMwst(Number(e.target.value))}
              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 ${inputClass}`}
            />
          </div>
        </div>

        {/* Tabelle */}
        <div className={`border-t ${borderClass} pt-6`}>
          <div className="flex items-center justify-between mb-3">
            <h4 className={`text-md font-medium ${textClass}`}>Dienstleistungen</h4>
            <button
              type="button"
              onClick={addDienstleistung}
              className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 text-sm"
            >
              + Position hinzufügen
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className={`${tableHeaderClass} border-b ${borderClass}`}>
                <tr>
                  <th className={`px-4 py-2 text-left font-medium ${textSecondaryClass}`}>Beschreibung</th>
                  <th className={`px-4 py-2 text-right font-medium ${textSecondaryClass}`}>Anzahl</th>
                  <th className={`px-4 py-2 text-right font-medium ${textSecondaryClass}`}>Std/Einheit</th>
                  <th className={`px-4 py-2 text-right font-medium ${textSecondaryClass}`}>Stundensatz (€)</th>
                  <th className={`px-4 py-2 text-right font-medium ${textSecondaryClass}`}>Stunden gesamt</th>
                  <th className={`px-4 py-2 text-right font-medium ${textSecondaryClass}`}>Betrag (€)</th>
                  <th className={`px-4 py-2 text-left font-medium ${textSecondaryClass}`}>Notiz</th>
                  <th className="px-2 py-2"></th>
                </tr>
              </thead>
              <tbody className={`divide-y ${borderClass}`}>
                {calculationForm.dienstleistungen.map((d, i) => {
                  const hours = rowHours(d);
                  const rate = rowRate(d);
                  const total = hours * rate;
                  return (
                    <tr key={i} className={`${bgClass} ${bgHoverClass}`}>
                      <td className="px-4 py-2">
                        <div className="flex items-center gap-2">
                          <input
                            type="text"
                            required
                            value={d.beschreibung}
                            onChange={(e) => updateDienstleistung(i, 'beschreibung', e.target.value)}
                            className={`w-full px-2 py-1 border rounded-md focus:outline-none focus:ring-1 ${inputClass}`}
                            placeholder="z.B. Server-Setup"
                          />
                          <button
                            type="button"
                            onClick={() => addRowBelow(i)}
                            className="px-2 py-1 bg-green-600 text-white rounded-md hover:bg-green-700 text-xs"
                            title="Zeile darunter einfügen"
                          >
                            +
                          </button>
                        </div>
                      </td>
                      <td className="px-4 py-2 text-right">
                        <input
                          type="number"
                          min="1"
                          value={d.anzahl}
                          onChange={(e) => updateDienstleistung(i, 'anzahl', Number(e.target.value))}
                          className={`w-24 text-right px-2 py-1 border rounded-md focus:outline-none focus:ring-1 ${inputClass}`}
                        />
                      </td>
                      <td className="px-4 py-2 text-right">
                        <input
                          type="number"
                          step="0.25"
                          value={d.dauer_pro_einheit}
                          onChange={(e) =>
                            updateDienstleistung(i, 'dauer_pro_einheit', Number(e.target.value))
                          }
                          className={`w-28 text-right px-2 py-1 border rounded-md focus:outline-none focus:ring-1 ${inputClass}`}
                        />
                      </td>
                      <td className="px-4 py-2 text-right">
                        <input
                          type="number"
                          step="0.01"
                          value={d.stundensatz ?? ''}
                          onChange={(e) =>
                            updateDienstleistung(
                              i,
                              'stundensatz',
                              e.target.value === '' ? undefined : Number(e.target.value)
                            )
                          }
                          className={`w-28 text-right px-2 py-1 border rounded-md focus:outline-none focus:ring-1 ${inputClass}`}
                          placeholder={String(calculationForm.stundensatz)}
                        />
                        <p className={`text-[10px] ${textMutedClass} mt-0.5`}>
                          leer = {Number(calculationForm.stundensatz).toFixed(2)} €
                        </p>
                      </td>
                      <td className={`px-4 py-2 text-right tabular-nums ${textClass}`}>{hours.toFixed(2)}</td>
                      <td className={`px-4 py-2 text-right tabular-nums ${textClass}`}>
                        {total.toLocaleString('de-DE', { style: 'currency', currency: 'EUR' })}
                      </td>
                      <td className="px-4 py-2">
                        <input
                          type="text"
                          value={d.info || ''}
                          onChange={(e) => updateDienstleistung(i, 'info', e.target.value)}
                          className={`w-full px-2 py-1 border rounded-md focus:outline-none focus:ring-1 ${inputClass}`}
                          placeholder="z.B. Remote, vor Ort, Pauschale …"
                        />
                      </td>
                      <td className="px-2 py-2">
                        {calculationForm.dienstleistungen.length > 1 && (
                          <button
                            type="button"
                            onClick={() => removeDienstleistung(i)}
                            className="px-2 py-1 bg-red-600 text-white rounded-md hover:bg-red-700 text-xs"
                            title="Zeile entfernen"
                          >
                            ×
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Summenbox */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className={`md:col-start-3 ${sumBoxClass} ${borderClass} rounded-md p-4`}>
            <div className="flex items-center justify-between">
              <span className={`text-sm ${textSecondaryClass}`}>Summe Netto</span>
              <span className={`font-medium ${textClass}`}>
                {sumNetto.toLocaleString('de-DE', { style: 'currency', currency: 'EUR' })}
              </span>
            </div>
            <div className="flex items-center justify-between mt-2">
              <span className={`text-sm ${textSecondaryClass}`}>MwSt ({mwst}%)</span>
              <span className={`font-medium ${textClass}`}>
                {sumMwst.toLocaleString('de-DE', { style: 'currency', currency: 'EUR' })}
              </span>
            </div>
            <div className={`flex items-center justify-between mt-2 border-t ${borderClass} pt-2`}>
              <span className={`text-sm font-semibold ${textClass}`}>Summe Brutto</span>
              <span className={`text-lg font-bold ${textClass}`}>
                {sumBrutto.toLocaleString('de-DE', { style: 'currency', currency: 'EUR' })}
              </span>
            </div>
          </div>
        </div>

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={loading}
            className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
          >
            {loading ? 'Speichern...' : 'Kalkulation speichern'}
          </button>
        </div>
      </form>
    </div>
  );
}