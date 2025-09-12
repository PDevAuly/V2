import React, { useEffect, useMemo, useState } from 'react';
import { ChevronRight, ChevronDown, Send } from 'lucide-react';
import { fetchJSON } from 'services/api'; // Import hinzufügen

export default function CalculationSection({
  customers,
  calculationForm,
  setCalculationForm,
  mwst,
  setMwst,
  loading,
  onSubmit,
  isDark,
}) {
  const TEMPLATE = [
    { section: 'Vorbereitende Maßnahmen', items: [
      'Aufbau Testumgebung',
      'Installation Firmware Server',
      'Konfiguration Server',
      'Lizenzregistrierungen VMWare,Veeam, VLSC/OpenLicense',
      'Konfiguration USV inkl. Shutdown etc.',
      'Installatioin/Firmwareupdates/Grundkonfiguration MSA',
      'Installatioin/Firmwareupdates/Grundkonfiguration Nimble',
      'Einrichten Volumes',
      'Konfiguration Nimble Peer Persistance',
      'Konfiguration SAN (iSCI)',
      'Konfiguration SAN (Fibre Channel, Zoning)',
      'Konfiguration Storageanbindung (Neusysteme/Altsysteme zur Migration)',
      'Installation und Patchen Betriebssystem VMWare',
      'Installation und Patchen Betriebssystem Windows Server',
      'Installation und Patchen pro Windows-VM',
      'Installation/Grundkonfiguration Hyper-V',
      'Installation/Grundkonfiguration VCSA',
      'Konfiguration VMWare-Dienste (HA etc.)',
      'Installation/Grundkonfiguration Active Directory inkl. Serverrollen (DNS,DHCP etc.)',
    ]},
    { section: 'Hardware-Arbeiten vor Ort', items: [
      'Einbau Hardware vor Ort',
      'Rackumbau',
      'Konfiguration Switch Management, pro VLAN',
    ]},
    { section: 'Software-Arbeiten (Remote)', items: [
      'Migrationsvorbereitungen (Patchen Altsysteme) pro System',
      'Einrichtung/Migration Active Directory pro User',
      'Konfiguration pro Gruppenrichtlinie',
      'Installation/Grundkonfiguration Exchange Server',
      'Konfiguration Exchange DAG',
      'Migration Exchange-Mailbox pro User',
      'Migration Public Folder-Datenbank pro PF',
      'Konfiguration Mail-Filtertools',
      'Grundkonfiguration Exchange Online Admin-Portal',
      'Migration zu Exchange Online mit Office 365 pro Konto',
      'Neueinrichtung Exchange Online 365 ohne bisherigen Exchange',
      'Konfiguration Azure AD-Sync',
      'Neuinstallation/Migration SEPM',
      'Rollout SEPM-Pakete, ggf. Konfiguration Policies',
      'Rollout Sophos',
      'Rollout/Prüfung Monitoring',
      'Installation/Migration Mailstore',
      'Migration pro Fachanwendung (Zeitschätzung circa und in Kooperation mit dem Softwarehersteller)',
      'Migration File-Server, neue Shares, ACL',
      'Installation/Konfiguration/Lizensierung Terminal Server',
      'Migration pro VM auf neue Hosts',
      'Virtualisierung pro VM (P-2-V/V-2-V)',
      'Installation, Konfiguration, Test HPDM/UMS',
      'Installation Backup-Software',
      'Backup-Konfiguration und Test',
    ]},
    { section: 'Client-Anpassungen vor Ort', items: [
      'Migration pro Client-PC',
      'Grundkonfiguration pro Client-PC (neuer PC)',
      'Einrichten Thin-Client',
    ]},
    { section: 'Firewall-Anpassungen / Einrichtung vor Ort', items: [
      'Einrichtung Sonicwall im Netz (Einbau, Einbinden ins Netz, VPN-Zugang, Site-to-Site-VPN)',
    ]},
    { section: 'Dokumentation', items: [
      'Dokumentation inkl. Handout für den Kunden',
    ]},
  ];

  // Map: Beschreibung -> Section (für sauberes Speichern)
  const DESC_TO_SECTION = useMemo(() => {
    const m = {};
    TEMPLATE.forEach(sec => sec.items.forEach(it => { m[it] = sec.section; }));
    return m;
  }, []);

  // Styles
  const bgClass = isDark ? 'bg-gray-800' : 'bg-white';
  const borderClass = isDark ? 'border-gray-700' : 'border-gray-200';
  const textClass = isDark ? 'text-gray-100' : 'text-gray-900';
  const textSecondaryClass = isDark ? 'text-gray-300' : 'text-gray-700';
  const textMutedClass = isDark ? 'text-gray-400' : 'text-gray-500';
  const inputClass = isDark
    ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400 focus:ring-blue-500 focus:border-blue-500'
    : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500 focus:ring-blue-500 focus:border-blue-500';
  const tableHeaderClass = isDark ? 'bg-gray-700' : 'bg-gray-50';
  const sumBoxClass = isDark ? 'bg-gray-700' : 'bg-gray-50';

  // Accordion (initial: alles zu)
  const [openSections, setOpenSections] = useState(() =>
    Object.fromEntries(TEMPLATE.map(s => [s.section, false]))
  );
  const toggleSection = (section) =>
    setOpenSections(prev => ({ ...prev, [section]: !prev[section] }));
  const expandAll = () =>
    setOpenSections(Object.fromEntries(TEMPLATE.map(s => [s.section, true])));
  const collapseAll = () =>
    setOpenSections(Object.fromEntries(TEMPLATE.map(s => [s.section, false])));

  // Seed aus Template
  const buildSeedFromTemplate = () =>
    TEMPLATE.flatMap(sec =>
      sec.items.map(beschreibung => ({
        beschreibung,
        anzahl: 1,
        dauer_pro_einheit: 0,
        info: '',
        stundensatz: undefined,
        section: sec.section,
      })),
    );

  useEffect(() => {
    setCalculationForm(prev => {
      const needsSeed =
        !prev?.dienstleistungen ||
        prev.dienstleistungen.length === 0 ||
        prev.dienstleistungen.every(d => !d?.beschreibung);

      return needsSeed
        ? { ...prev, dienstleistungen: buildSeedFromTemplate() }
        : prev;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Update-Helper
  const updateRow = (beschreibung, patch) => {
    setCalculationForm(prev => {
      const list = [...(prev.dienstleistungen || [])];
      const idx = list.findIndex(x => x.beschreibung === beschreibung);
      if (idx === -1) {
        list.push({
          beschreibung,
          anzahl: 1,
          dauer_pro_einheit: 0,
          info: '',
          stundensatz: undefined,
          section: DESC_TO_SECTION[beschreibung] || null,
          ...patch
        });
      } else {
        list[idx] = { ...list[idx], ...patch };
      }
      return { ...prev, dienstleistungen: list };
    });
  };

  // Rechnen
  const rowHours = d => (Number(d.dauer_pro_einheit) || 0) * (Number(d.anzahl) || 1);
  const rowRate  = d => Number(d.stundensatz ?? calculationForm.stundensatz) || 0;
  const rowTotal = d => rowHours(d) * rowRate(d);

  const sumNetto  = (calculationForm.dienstleistungen || []).reduce((acc, d) => acc + rowTotal(d), 0);
  const sumMwst   = sumNetto * ((Number(mwst) || 0) / 100);
  const sumBrutto = sumNetto + sumMwst;

  const sectionSummary = (sec) => {
    const rows = (calculationForm.dienstleistungen || []).filter(d => sec.items.includes(d.beschreibung));
    const count = rows.length;
    const hours = rows.reduce((a, d) => a + rowHours(d), 0);
    const total = rows.reduce((a, d) => a + rowTotal(d), 0);
    return { count, hours, total };
  };

  // KORRIGIERTE handleSubmit Funktion
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!calculationForm.kunde_id) {
      alert('Bitte einen Kunden auswählen');
      return;
    }

    const defaultRate =
      calculationForm.stundensatz === undefined || calculationForm.stundensatz === ''
        ? null
        : Number(calculationForm.stundensatz) || 0;

    const sanitized = (calculationForm.dienstleistungen || []).map((row) => ({
      beschreibung: row.beschreibung,
      section: row.section || DESC_TO_SECTION[row.beschreibung] || null,
      anzahl: Number(row.anzahl) || 0,
      dauer_pro_einheit: Number(row.dauer_pro_einheit) || 0,
      info: (row.info || '').trim() || null,
      stundensatz:
        row.stundensatz === undefined || row.stundensatz === ''
          ? null
          : Number(row.stundensatz) || 0,
    }));

    const payload = {
      kunde_id: calculationForm.kunde_id,
      stundensatz: defaultRate,
      dienstleistungen: sanitized,
      mwst: Number(mwst) || 0,
    };

    try {
      console.log('🚀 Speichere Kalkulation...', payload);
      
      // Direkter API Call anstelle über Parent
      const response = await fetchJSON('/kalkulationen', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      console.log('✅ Kalkulation gespeichert:', response);
      
      // Erfolgsbenachrichtigung
      alert('✅ Kalkulation erfolgreich gespeichert!');
      
      // Parent-Handler aufrufen (ohne Parameter)
      if (typeof onSubmit === 'function') {
        await onSubmit(); // ← Jetzt ohne Parameter
      }
      
    } catch (error) {
      console.error('❌ Fehler beim Speichern der Kalkulation:', error);
      alert(`❌ Fehler beim Speichern: ${error.message}`);
    }
  };

  // NEU: Funktion zum Senden der Kalkulation per E-Mail
  const handleSendEmail = async (kalkulationId) => {
    try {
      const response = await fetchJSON(`/kalkulationen/${kalkulationId}/send-email`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: '', // Kann leer sein, wird vom Backend aus Kundendaten gefüllt
          subject: `Kalkulation #${kalkulationId}`,
          attachPdf: true
        }),
      });

      alert('✅ Kalkulation wurde per E-Mail versendet!');
      console.log('E-Mail versendet:', response);
    } catch (error) {
      console.error('❌ Fehler beim Senden der E-Mail:', error);
      alert(`❌ Fehler beim Senden: ${error.message}`);
    }
  };

  return (
    <div className={`${bgClass} ${borderClass} rounded-lg shadow-sm border p-6`}>
      <form onSubmit={handleSubmit} className="space-y-6">
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
            <label className={`block text-sm font-medium ${textSecondaryClass} mb-2`}>Standard-Stundensatz (€)</label>
            <input
              type="number"
              min="0"
              step="any"
              value={calculationForm.stundensatz ?? ''}
              onChange={(e) =>
                setCalculationForm({
                  ...calculationForm,
                  stundensatz: e.target.value === '' ? undefined : Number(e.target.value),
                })
              }
              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 ${inputClass}`}
              placeholder="z. B. 85"
            />
            <p className={`text-xs ${textMutedClass} mt-1`}>
              Wird genutzt, wenn in einer Zeile kein eigener Satz steht.
            </p>
          </div>

          <div>
            <label className={`block text-sm font-medium ${textSecondaryClass} mb-2`}>MwSt (%)</label>
            <input
              type="number"
              min="0"
              step="any"
              value={mwst ?? ''}
              onChange={(e) => setMwst(e.target.value === '' ? 0 : Number(e.target.value))}
              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 ${inputClass}`}
              placeholder="z. B. 19"
            />
          </div>
        </div>

        {/* Steuerung */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={expandAll}
            className="px-3 py-1.5 text-sm rounded-md border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700"
          >
            Alle ausklappen
          </button>
          <button
            type="button"
            onClick={collapseAll}
            className="px-3 py-1.5 text-sm rounded-md border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700"
          >
            Alle einklappen
          </button>
        </div>

        {/* Sektionen */}
        <div className={`border-t ${borderClass} pt-4`}>
          {TEMPLATE.map((sec) => {
            const open = openSections[sec.section];
            const sum = sectionSummary(sec);
            return (
              <div key={sec.section} className={`mb-4 rounded-lg border ${borderClass} ${isDark ? 'bg-gray-900' : 'bg-white'}`}>
                <button
                  type="button"
                  onClick={() => toggleSection(sec.section)}
                  aria-expanded={open}
                  className="w-full flex items-center justify-between px-4 py-3"
                >
                  <div className="flex items-center gap-2">
                    {open ? (
                      <ChevronDown className={`w-5 h-5 ${textMutedClass}`} />
                    ) : (
                      <ChevronRight className={`w-5 h-5 ${textMutedClass}`} />
                    )}
                    <h4 className={`text-sm md:text-base font-semibold ${textClass}`}>{sec.section}</h4>
                  </div>
                  <div className={`text-xs md:text-sm ${textMutedClass}`}>
                    {sum.count} Pos. • {sum.hours.toFixed(2)} h •{' '}
                    {sum.total.toLocaleString('de-DE', { style: 'currency', currency: 'EUR' })}
                  </div>
                </button>

                {open && (
                  <div className={`overflow-x-auto border-t ${borderClass}`}>
                    <table className="w-full text-sm">
                      <thead className={`${tableHeaderClass} border-b ${borderClass}`}>
                        <tr>
                          <th className={`px-4 py-2 text-left font-medium ${textSecondaryClass}`}>Tätigkeit</th>
                          <th className={`px-4 py-2 text-right font-medium ${textSecondaryClass}`}>Anzahl</th>
                          <th className={`px-4 py-2 text-right font-medium ${textSecondaryClass}`}>Std/Einheit</th>
                          <th className={`px-4 py-2 text-right font-medium ${textSecondaryClass}`}>Stundensatz (€)</th>
                          <th className={`px-4 py-2 text-right font-medium ${textSecondaryClass}`}>Stunden gesamt</th>
                          <th className={`px-4 py-2 text-right font-medium ${textSecondaryClass}`}>Betrag (€)</th>
                          <th className={`px-4 py-2 text-left font-medium ${textSecondaryClass}`}>Notiz</th>
                        </tr>
                      </thead>
                      <tbody className={`divide-y ${borderClass}`}>
                        {sec.items.map((beschreibung) => {
                          const row =
                            (calculationForm.dienstleistungen || []).find(d => d.beschreibung === beschreibung) ||
                            { beschreibung, anzahl: 1, dauer_pro_einheit: 0, info: '', stundensatz: undefined, section: DESC_TO_SECTION[beschreibung] || null };

                          const hours = rowHours(row);
                          const rate = rowRate(row);
                          const total = hours * rate;

                          return (
                            <tr key={beschreibung} className={bgClass}>
                              <td className="px-4 py-2">
                                <span className={`${textClass}`}>{beschreibung}</span>
                              </td>

                              <td className="px-4 py-2 text-right">
                                <input
                                  type="number"
                                  min="0"
                                  step="any"
                                  value={row.anzahl}
                                  onChange={(e) => updateRow(beschreibung, { anzahl: Number(e.target.value) || 0 })}
                                  className={`w-24 text-right px-2 py-1 border rounded-md focus:outline-none focus:ring-1 ${inputClass}`}
                                />
                              </td>

                              <td className="px-4 py-2 text-right">
                                <input
                                  type="number"
                                  min="0"
                                  step="any"
                                  value={row.dauer_pro_einheit}
                                  onChange={(e) => updateRow(beschreibung, { dauer_pro_einheit: Number(e.target.value) || 0 })}
                                  className={`w-28 text-right px-2 py-1 border rounded-md focus:outline-none focus:ring-1 ${inputClass}`}
                                />
                              </td>

                              <td className="px-4 py-2 text-right">
                                <input
                                  type="number"
                                  min="0"
                                  step="any"
                                  value={row.stundensatz ?? ''}
                                  onChange={(e) =>
                                    updateRow(
                                      beschreibung,
                                      { stundensatz: e.target.value === '' ? undefined : Number(e.target.value) }
                                    )
                                  }
                                  className={`w-28 text-right px-2 py-1 border rounded-md focus:outline-none focus:ring-1 ${inputClass}`}
                                  placeholder={String(calculationForm.stundensatz ?? '')}
                                />
                                <p className={`text-[10px] ${textMutedClass} mt-0.5`}>
                                  leer = {Number(calculationForm.stundensatz || 0).toFixed(2)} €
                                </p>
                              </td>

                              <td className={`px-4 py-2 text-right tabular-nums ${textClass}`}>
                                {hours.toFixed(2)}
                              </td>

                              <td className={`px-4 py-2 text-right tabular-nums ${textClass}`}>
                                {total.toLocaleString('de-DE', { style: 'currency', currency: 'EUR' })}
                              </td>

                              <td className="px-4 py-2">
                                <input
                                  type="text"
                                  value={row.info || ''}
                                  onChange={(e) => updateRow(beschreibung, { info: e.target.value })}
                                  className={`w-full px-2 py-1 border rounded-md focus:outline-none focus:ring-1 ${inputClass}`}
                                  placeholder="z.B. Remote / vor Ort …"
                                />
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            );
          })}
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
              <span className={`text-sm ${textSecondaryClass}`}>MwSt ({mwst || 0}%)</span>
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

        <div className="flex justify-end gap-3">
          {/* NEU: Senden-Button (nur wenn Kalkulation gespeichert wurde) */}
          {calculationForm.kalkulations_id && (
            <button
              type="button"
              onClick={() => handleSendEmail(calculationForm.kalkulations_id)}
              className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 transition-colors flex items-center gap-2"
            >
              <Send size={16} />
              Senden
            </button>
          )}
          
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