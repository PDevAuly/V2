// src/components/ProjectEditModal.jsx
import React, { useEffect, useMemo, useState } from 'react';
import {
  X, Save, Trash2, Plus, Server, Settings, Mail as MailIcon, Shield,
} from 'lucide-react';
import { fetchJSON } from 'services/api';

const genId = () =>
  (typeof crypto !== 'undefined' && crypto.randomUUID)
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;

const asNum = (v) => (v === '' || v === null || v === undefined ? '' : Number(v));
const toListFromText = (t) =>
  String(t || '')
    .split('\n')
    .map((s) => s.trim())
    .filter(Boolean);

export default function ProjectEditModal({
  onboardingId,
  isDark = false,
  onClose,
  onSaved,
}) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const classes = useMemo(() => ({
    bg: isDark ? 'bg-gray-900' : 'bg-white',
    soft: isDark ? 'bg-gray-800' : 'bg-gray-50',
    border: isDark ? 'border-gray-700' : 'border-gray-200',
    text: isDark ? 'text-gray-100' : 'text-gray-900',
    text2: isDark ? 'text-gray-300' : 'text-gray-700',
    muted: isDark ? 'text-gray-400' : 'text-gray-500',
    input: isDark
      ? 'bg-gray-800 border-gray-600 text-gray-100 focus:ring-blue-500'
      : 'bg-white border-gray-300 text-gray-900 focus:ring-blue-500',
  }), [isDark]);

  // ---------- Formular-State ----------
  const [status, setStatus] = useState('neu');
  const [netzwerk, setNetzwerk] = useState({});
  const [hardwareList, setHardwareList] = useState([]);
  const [mail, setMail] = useState({});
  const [softwareList, setSoftwareList] = useState([]);
  const [backup, setBackup] = useState({});
  const [sonstiges, setSonstiges] = useState({ text: '' });

  // Drafts für Software-Requirements (per Software-ID)
  const [reqDrafts, setReqDrafts] = useState({});

  // ---------- Laden ----------
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        setLoading(true);
        setError('');
        const data = await fetchJSON(`/onboarding/${onboardingId}`);

        if (!mounted) return;
        setStatus(data.status || 'neu');

        // Netzwerk
        setNetzwerk({
          internetzugangsart: data.netzwerk?.internetzugangsart || '',
          firewall_modell: data.netzwerk?.firewall_modell || '',
          feste_ip_vorhanden: !!data.netzwerk?.feste_ip_vorhanden,
          ip_adresse: data.netzwerk?.ip_adresse || '',
          vpn_einwahl_erforderlich: !!data.netzwerk?.vpn_einwahl_erforderlich,
          aktuelle_vpn_user: data.netzwerk?.aktuelle_vpn_user ?? '',
          geplante_vpn_user: data.netzwerk?.geplante_vpn_user ?? '',
          informationen: data.netzwerk?.informationen || '',
        });

        // Hardware
        const hw = Array.isArray(data.hardware) ? data.hardware : [];
        setHardwareList(hw.map((h) => ({
          id: genId(),
          typ: h.typ || '',
          hersteller: h.hersteller || '',
          modell: h.modell || '',
          seriennummer: h.seriennummer || '',
          standort: h.standort || '',
          ip: h.ip || '',
          details_jsonb: typeof h.details_jsonb === 'string'
            ? h.details_jsonb
            : (h.details_jsonb ? JSON.stringify(h.details_jsonb, null, 2) : ''),
          informationen: h.informationen || '',
        })));

        // Mail
        setMail({
          anbieter: data.mail?.anbieter || '',
          anzahl_postfach: data.mail?.anzahl_postfach ?? '',
          anzahl_shared: data.mail?.anzahl_shared ?? '',
          gesamt_speicher: data.mail?.gesamt_speicher ?? '',
          pop3_connector: !!data.mail?.pop3_connector,
          mobiler_zugriff: !!data.mail?.mobiler_zugriff,
          informationen: data.mail?.informationen || '',
        });

        // Software (+requirements +apps)
        const sw = Array.isArray(data.software) ? data.software : [];
        setSoftwareList(sw.map((s) => ({
          id: genId(),
          name: s.name || '',
          licenses: s.licenses ?? '',
          critical: s.critical || '',
          description: s.description || '',
          virenschutz: s.virenschutz || '',
          schnittstellen: s.schnittstellen || '',
          wartungsvertrag: !!s.wartungsvertrag,
          migration_support: !!s.migration_support,
          verwendete_applikationen_text: (s.apps || []).map((a) => a?.name).filter(Boolean).join('\n'),
          requirements: Array.isArray(s.requirements)
            ? s.requirements.map((r) => ({ id: genId(), type: r.type || '', detail: r.detail || '' }))
            : [],
        })));

        // Backup
        setBackup({
          tool: data.backup?.tool || '',
          interval: data.backup?.interval || '',
          retention: data.backup?.retention || '',
          location: data.backup?.location || '',
          size: data.backup?.size ?? '',
          info: data.backup?.info || '',
        });

        // Sonstiges
        setSonstiges({ text: data.sonstiges?.text || '' });
      } catch (e) {
        setError('Fehler beim Laden des Onboardings');
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, [onboardingId]);

  // ---------- Handlers ----------
  const setNetz = (p) => setNetzwerk((prev) => ({ ...prev, ...p }));
  const addHardware = () =>
    setHardwareList((prev) => [{ id: genId(), typ: '', hersteller: '', modell: '', seriennummer: '', standort: '', ip: '', details_jsonb: '', informationen: '' }, ...prev]);
  const updateHW = (idx, patch) =>
    setHardwareList((prev) => prev.map((h, i) => (i === idx ? { ...h, ...patch } : h)));
  const removeHW = (idx) =>
    setHardwareList((prev) => prev.filter((_, i) => i !== idx));

  const setMailField = (p) => setMail((m) => ({ ...m, ...p }));

  const addSoftware = () =>
    setSoftwareList((prev) => [{ id: genId(), name: '', licenses: '', critical: '', description: '', virenschutz: '', schnittstellen: '', wartungsvertrag: false, migration_support: false, verwendete_applikationen_text: '', requirements: [] }, ...prev]);
  const updateSW = (idx, key, val) =>
    setSoftwareList((prev) => prev.map((s, i) => (i === idx ? { ...s, [key]: val } : s)));
  const removeSW = (idx) =>
    setSoftwareList((prev) => prev.filter((_, i) => i !== idx));

  const setReqDraft = (swId, key, value) =>
    setReqDrafts((d) => ({ ...d, [swId]: { ...(d[swId] || { type: '', detail: '' }), [key]: value } }));

  const addRequirement = (swId) =>
    setSoftwareList((prev) => prev.map((s) => {
      if (s.id !== swId) return s;
      const d = reqDrafts[swId] || { type: '', detail: '' };
      if (!d.type || !d.detail) return s;
      return { ...s, requirements: [...(s.requirements || []), { id: genId(), type: d.type, detail: d.detail }] };
    })) || setReqDrafts((d) => ({ ...d, [swId]: { type: '', detail: '' } }));

  const removeRequirement = (swId, reqId) =>
    setSoftwareList((prev) => prev.map((s) => {
      if (s.id !== swId) return s;
      return { ...s, requirements: (s.requirements || []).filter((r) => r.id !== reqId) };
    }));

  // ---------- Speichern ----------
// src/components/ProjectEditModal.jsx
// ... (vorheriger Code bleibt unverändert)

  // ---------- Speichern ----------
  const save = async () => {
    try {
      setSaving(true);
      setError('');

      // Backend PATCH akzeptiert array oder {hardwareList}, wir senden Arrays
      const payload = {
        status, // 'neu' | 'in Arbeit' | 'erledigt' (Schema erlaubt nur diese drei)
        netzwerk: {
          ...netzwerk,
          aktuelle_vpn_user: asNum(netzwerk.aktuelle_vpn_user),
          geplante_vpn_user: asNum(netzwerk.geplante_vpn_user),
        },
        hardware: hardwareList.map((h) => ({
          typ: h.typ || null,
          hersteller: h.hersteller || null,
          modell: h.modell || null,
          seriennummer: h.seriennummer || null,
          standort: h.standort || null,
          ip: h.ip || null,
          // details_jsonb darf String (JSON) sein – Server normalisiert
          details_jsonb: h.details_jsonb || null,
          informationen: h.informationen || null,
        })),
        software: softwareList.map((s) => ({
          name: s.name || null,
          licenses: asNum(s.licenses),
          critical: s.critical || null,
          description: s.description || null,
          virenschutz: s.virenschutz || null,
          schnittstellen: s.schnittstellen || null,
          wartungsvertrag: !!s.wartungsvertrag,
          migration_support: !!s.migration_support,
          // Apps als Array von Objekten mit name-Eigenschaft für das Backend
          apps: toListFromText(s.verwendete_applikationen_text).map(name => ({ name })),
          requirements: (s.requirements || []).map((r) => ({ type: r.type || null, detail: r.detail || null })),
        })),
        mail: {
          ...mail,
          anzahl_postfach: asNum(mail.anzahl_postfach),
          anzahl_shared: asNum(mail.anzahl_shared),
          gesamt_speicher: asNum(mail.gesamt_speicher),
          pop3_connector: !!mail.pop3_connector,
          mobiler_zugriff: !!mail.mobiler_zugriff,
        },
        backup: {
          ...backup,
          size: asNum(backup.size),
        },
        sonstiges: { text: sonstiges.text || '' },
      };

      await fetchJSON(`/onboarding/${onboardingId}`, {
        method: 'PATCH',
        body: JSON.stringify(payload),
        headers: { 'Content-Type': 'application/json' },
      });

      if (typeof onSaved === 'function') onSaved();
      onClose();
    } catch (e) {
      setError(e?.message || 'Fehler beim Speichern');
    } finally {
      setSaving(false);
    }
  };

// ... (restlicher Code bleibt unverändert)

  // ---------- UI ----------
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className={`w-full max-w-5xl max-h-[92vh] overflow-hidden flex flex-col rounded-xl border ${classes.border} ${classes.bg} shadow-2xl`}>
        {/* Header */}
        <div className={`flex items-center justify-between px-5 py-3 border-b ${classes.border}`}>
          <h2 className={`text-lg font-semibold ${classes.text}`}>Onboarding bearbeiten</h2>
          <div className="flex items-center gap-2">
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className={`px-3 py-2 border rounded-md ${classes.input}`}
            >
              <option value="neu">neu</option>
              <option value="in Arbeit">in Arbeit</option>
              <option value="erledigt">erledigt</option>
            </select>
            <button
              onClick={onClose}
              className="p-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800"
              title="Schließen"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Body (scrollbar) */}
        <div className="overflow-y-auto flex-1 p-5 space-y-6">
          {loading ? (
            <p className={`${classes.muted}`}>Lade Daten…</p>
          ) : error ? (
            <p className="text-red-500">{error}</p>
          ) : (
            <>
              {/* Netzwerk */}
              <section className={`rounded-lg border ${classes.border} p-4`}>
                <div className="flex items-center gap-2 mb-3">
                  <Shield className="w-5 h-5 text-blue-500" />
                  <h3 className={`font-medium ${classes.text}`}>Netzwerk</h3>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className={`block text-sm ${classes.text2} mb-1`}>Internet­zugangsart</label>
                    <select
                      value={netzwerk.internetzugangsart || ''}
                      onChange={(e) => setNetz({ internetzugangsart: e.target.value })}
                      className={`w-full px-3 py-2 border rounded-md ${classes.input}`}
                    >
                      <option value="">Bitte auswählen</option>
                      {['DSL','VDSL','Glasfaser','Kabel','LTE','Standleitung','Satellit','Sonstiges'].map(v => (
                        <option key={v} value={v}>{v}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className={`block text-sm ${classes.text2} mb-1`}>Firewall Modell</label>
                    <input
                      value={netzwerk.firewall_modell || ''}
                      onChange={(e) => setNetz({ firewall_modell: e.target.value })}
                      className={`w-full px-3 py-2 border rounded-md ${classes.input}`}
                      placeholder="z. B. Sophos XG 125"
                    />
                  </div>

                  <div className="col-span-2">
                    <label className={`inline-flex items-center gap-2 text-sm ${classes.text2}`}>
                      <input
                        type="checkbox"
                        checked={!!netzwerk.feste_ip_vorhanden}
                        onChange={(e) => setNetz({ feste_ip_vorhanden: e.target.checked })}
                      />
                      Feste IP-Adresse vorhanden
                    </label>
                    {netzwerk.feste_ip_vorhanden && (
                      <div className="mt-2 grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className={`block text-sm ${classes.text2} mb-1`}>IP-Adresse</label>
                          <input
                            value={netzwerk.ip_adresse || ''}
                            onChange={(e) => setNetz({ ip_adresse: e.target.value })}
                            className={`w-full px-3 py-2 border rounded-md ${classes.input}`}
                            placeholder="z. B. 192.168.0.10"
                          />
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="col-span-2">
                    <label className={`inline-flex items-center gap-2 text-sm ${classes.text2}`}>
                      <input
                        type="checkbox"
                        checked={!!netzwerk.vpn_einwahl_erforderlich}
                        onChange={(e) => setNetz({ vpn_einwahl_erforderlich: e.target.checked })}
                      />
                      VPN-Einwahl erforderlich
                    </label>
                    {netzwerk.vpn_einwahl_erforderlich && (
                      <div className="mt-2 grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className={`block text-sm ${classes.text2} mb-1`}>Aktuelle VPN User</label>
                          <input
                            type="number"
                            value={netzwerk.aktuelle_vpn_user ?? ''}
                            onChange={(e) => setNetz({ aktuelle_vpn_user: e.target.value })}
                            className={`w-full px-3 py-2 border rounded-md ${classes.input}`}
                            min="0"
                          />
                        </div>
                        <div>
                          <label className={`block text-sm ${classes.text2} mb-1`}>Geplante VPN User</label>
                          <input
                            type="number"
                            value={netzwerk.geplante_vpn_user ?? ''}
                            onChange={(e) => setNetz({ geplante_vpn_user: e.target.value })}
                            className={`w-full px-3 py-2 border rounded-md ${classes.input}`}
                            min="0"
                          />
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="md:col-span-2">
                    <label className={`block text-sm ${classes.text2} mb-1`}>Informationen</label>
                    <textarea
                      rows={3}
                      value={netzwerk.informationen || ''}
                      onChange={(e) => setNetz({ informationen: e.target.value })}
                      className={`w-full px-3 py-2 border rounded-md ${classes.input}`}
                      placeholder="Bandbreite, Besonderheiten..."
                    />
                  </div>
                </div>
              </section>

              {/* Hardware */}
              <section className={`rounded-lg border ${classes.border} p-4`}>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Server className="w-5 h-5 text-purple-500" />
                    <h3 className={`font-medium ${classes.text}`}>Hardware</h3>
                  </div>
                  <button
                    className="px-3 py-2 rounded-md bg-purple-600 text-white hover:bg-purple-700 flex items-center gap-2"
                    onClick={addHardware}
                    type="button"
                  >
                    <Plus className="w-4 h-4" /> Hinzufügen
                  </button>
                </div>

                {hardwareList.length === 0 ? (
                  <p className={`${classes.muted}`}>Noch keine Hardware erfasst.</p>
                ) : hardwareList.map((h, i) => (
                  <div key={h.id} className={`rounded-lg border ${classes.border} p-3 mb-3 ${classes.soft}`}>
                    <div className="flex items-center justify-between mb-2">
                      <h4 className={`font-medium ${classes.text}`}>Eintrag #{i + 1} {h.typ ? `(${h.typ})` : ''}</h4>
                      <button className="text-red-500 hover:text-red-600" onClick={() => removeHW(i)} title="Entfernen">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div>
                        <label className={`block text-sm ${classes.text2} mb-1`}>Typ</label>
                        <select
                          value={h.typ || ''}
                          onChange={(e) => updateHW(i, { typ: e.target.value })}
                          className={`w-full px-3 py-2 border rounded-md ${classes.input}`}
                        >
                          <option value="">Bitte auswählen</option>
                          <optgroup label="Server & Storage">
                            <option value="Server">Server</option>
                            <option value="NAS">NAS</option>
                            <option value="SAN">SAN</option>
                            <option value="Backup-Server">Backup-Server</option>
                            <option value="Virtualisierungs-Host">Virtualisierungs-Host</option>
                          </optgroup>
                          <optgroup label="Netzwerk">
                            <option value="Router">Router</option>
                            <option value="Firewall">Firewall</option>
                            <option value="Switch">Switch</option>
                            <option value="Access Point">WLAN Access Point</option>
                          </optgroup>
                          <optgroup label="Arbeitsplatz">
                            <option value="Desktop-PC">Desktop-PC</option>
                            <option value="Notebook">Notebook</option>
                          </optgroup>
                          <optgroup label="Peripherie">
                            <option value="Drucker">Drucker</option>
                            <option value="Scanner">Scanner</option>
                          </optgroup>
                          <optgroup label="Strom/USV">
                            <option value="USV">USV</option>
                            <option value="PDU">PDU</option>
                          </optgroup>
                        </select>
                      </div>
                      <div>
                        <label className={`block text-sm ${classes.text2} mb-1`}>Hersteller</label>
                        <input value={h.hersteller || ''} onChange={(e) => updateHW(i, { hersteller: e.target.value })} className={`w-full px-3 py-2 border rounded-md ${classes.input}`} />
                      </div>
                      <div>
                        <label className={`block text-sm ${classes.text2} mb-1`}>Modell</label>
                        <input value={h.modell || ''} onChange={(e) => updateHW(i, { modell: e.target.value })} className={`w-full px-3 py-2 border rounded-md ${classes.input}`} />
                      </div>
                      <div>
                        <label className={`block text-sm ${classes.text2} mb-1`}>Seriennummer</label>
                        <input value={h.seriennummer || ''} onChange={(e) => updateHW(i, { seriennummer: e.target.value })} className={`w-full px-3 py-2 border rounded-md ${classes.input}`} />
                      </div>
                      <div>
                        <label className={`block text-sm ${classes.text2} mb-1`}>Standort</label>
                        <input value={h.standort || ''} onChange={(e) => updateHW(i, { standort: e.target.value })} className={`w-full px-3 py-2 border rounded-md ${classes.input}`} />
                      </div>
                      <div>
                        <label className={`block text-sm ${classes.text2} mb-1`}>IP-Adresse</label>
                        <input value={h.ip || ''} onChange={(e) => updateHW(i, { ip: e.target.value })} className={`w-full px-3 py-2 border rounded-md ${classes.input}`} />
                      </div>
                      <div className="md:col-span-2">
                        <label className={`block text-sm ${classes.text2} mb-1`}>Technische Details (JSON oder Text)</label>
                        <textarea rows={3} value={h.details_jsonb || ''} onChange={(e) => updateHW(i, { details_jsonb: e.target.value })} className={`w-full px-3 py-2 border rounded-md ${classes.input}`} placeholder='z.B. {"CPU":"Xeon","RAM":"64GB"}' />
                      </div>
                      <div className="md:col-span-2">
                        <label className={`block text-sm ${classes.text2} mb-1`}>Zusätzliche Informationen</label>
                        <textarea rows={3} value={h.informationen || ''} onChange={(e) => updateHW(i, { informationen: e.target.value })} className={`w-full px-3 py-2 border rounded-md ${classes.input}`} />
                      </div>
                    </div>
                  </div>
                ))}
              </section>

              {/* Mail */}
              <section className={`rounded-lg border ${classes.border} p-4`}>
                <div className="flex items-center gap-2 mb-3">
                  <MailIcon className="w-5 h-5 text-orange-500" />
                  <h3 className={`font-medium ${classes.text}`}>Mail</h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className={`block text-sm ${classes.text2} mb-1`}>Anbieter</label>
                    <select
                      value={mail.anbieter || ''}
                      onChange={(e) => setMailField({ anbieter: e.target.value })}
                      className={`w-full px-3 py-2 border rounded-md ${classes.input}`}
                    >
                      <option value="">Bitte auswählen</option>
                      <option value="Exchange">Microsoft Exchange</option>
                      <option value="Office365">Microsoft Office 365</option>
                      <option value="Gmail">Google Workspace (Gmail)</option>
                      <option value="IMAP">IMAP/POP3 Server</option>
                      <option value="Other">Anderer Anbieter</option>
                    </select>
                  </div>
                  <div>
                    <label className={`block text-sm ${classes.text2} mb-1`}>Anzahl Postfächer</label>
                    <input type="number" min="0" value={mail.anzahl_postfach ?? ''} onChange={(e) => setMailField({ anzahl_postfach: e.target.value })} className={`w-full px-3 py-2 border rounded-md ${classes.input}`} />
                  </div>
                  <div>
                    <label className={`block text-sm ${classes.text2} mb-1`}>Anzahl Shared Mailboxes</label>
                    <input type="number" min="0" value={mail.anzahl_shared ?? ''} onChange={(e) => setMailField({ anzahl_shared: e.target.value })} className={`w-full px-3 py-2 border rounded-md ${classes.input}`} />
                  </div>
                  <div>
                    <label className={`block text-sm ${classes.text2} mb-1`}>Gesamt Speicher (GB)</label>
                    <input type="number" min="0" step="0.1" value={mail.gesamt_speicher ?? ''} onChange={(e) => setMailField({ gesamt_speicher: e.target.value })} className={`w-full px-3 py-2 border rounded-md ${classes.input}`} />
                  </div>
                  <label className={`inline-flex items-center gap-2 text-sm ${classes.text2}`}>
                    <input type="checkbox" checked={!!mail.pop3_connector} onChange={(e) => setMailField({ pop3_connector: e.target.checked })} />
                    POP3-Connector vorhanden
                  </label>
                  <label className={`inline-flex items-center gap-2 text-sm ${classes.text2}`}>
                    <input type="checkbox" checked={!!mail.mobiler_zugriff} onChange={(e) => setMailField({ mobiler_zugriff: e.target.checked })} />
                    Mobiler Zugriff aktiviert
                  </label>
                  <div className="md:col-span-2">
                    <label className={`block text-sm ${classes.text2} mb-1`}>Informationen</label>
                    <textarea rows={3} value={mail.informationen || ''} onChange={(e) => setMailField({ informationen: e.target.value })} className={`w-full px-3 py-2 border rounded-md ${classes.input}`} />
                  </div>
                </div>
              </section>

              {/* Software */}
              <section className={`rounded-lg border ${classes.border} p-4`}>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Settings className="w-5 h-5 text-indigo-500" />
                    <h3 className={`font-medium ${classes.text}`}>Software</h3>
                  </div>
                  <button className="px-3 py-2 rounded-md bg-indigo-600 text-white hover:bg-indigo-700 flex items-center gap-2" onClick={addSoftware} type="button">
                    <Plus className="w-4 h-4" /> Hinzufügen
                  </button>
                </div>

                {softwareList.length === 0 ? (
                  <p className={`${classes.muted}`}>Noch keine Software erfasst.</p>
                ) : softwareList.map((s, i) => {
                  const draft = reqDrafts[s.id] || { type: '', detail: '' };
                  return (
                    <div key={s.id} className={`rounded-lg border ${classes.border} p-3 mb-3 ${classes.soft}`}>
                      <div className="flex items-center justify-between mb-2">
                        <h4 className={`font-medium ${classes.text}`}>Eintrag #{i + 1} {s.name ? `(${s.name})` : ''}</h4>
                        <button className="text-red-500 hover:text-red-600" onClick={() => removeSW(i)} title="Entfernen">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div>
                          <label className={`block text-sm ${classes.text2} mb-1`}>Name</label>
                          <input value={s.name || ''} onChange={(e) => updateSW(i, 'name', e.target.value)} className={`w-full px-3 py-2 border rounded-md ${classes.input}`} placeholder="z. B. Microsoft Office" />
                        </div>
                        <div>
                          <label className={`block text-sm ${classes.text2} mb-1`}>Lizenzen</label>
                          <input type="number" min="0" value={s.licenses ?? ''} onChange={(e) => updateSW(i, 'licenses', asNum(e.target.value))} className={`w-full px-3 py-2 border rounded-md ${classes.input}`} />
                        </div>
                        <div>
                          <label className={`block text-sm ${classes.text2} mb-1`}>Kritikalität</label>
                          <input value={s.critical || ''} onChange={(e) => updateSW(i, 'critical', e.target.value)} className={`w-full px-3 py-2 border rounded-md ${classes.input}`} placeholder="z. B. geschäftskritisch" />
                        </div>
                        <div>
                          <label className={`block text-sm ${classes.text2} mb-1`}>Virenschutz</label>
                          <input value={s.virenschutz || ''} onChange={(e) => updateSW(i, 'virenschutz', e.target.value)} className={`w-full px-3 py-2 border rounded-md ${classes.input}`} placeholder="z. B. Defender" />
                        </div>
                        <div className="md:col-span-2">
                          <label className={`block text-sm ${classes.text2} mb-1`}>Beschreibung</label>
                          <textarea rows={2} value={s.description || ''} onChange={(e) => updateSW(i, 'description', e.target.value)} className={`w-full px-3 py-2 border rounded-md ${classes.input}`} />
                        </div>
                        <div className="md:col-span-2">
                          <label className={`block text-sm ${classes.text2} mb-1`}>Schnittstellen</label>
                          <input value={s.schnittstellen || ''} onChange={(e) => updateSW(i, 'schnittstellen', e.target.value)} className={`w-full px-3 py-2 border rounded-md ${classes.input}`} placeholder="z. B. DATEV, REST, SQL" />
                        </div>

                        <label className={`inline-flex items-center gap-2 text-sm ${classes.text2}`}>
                          <input type="checkbox" checked={!!s.wartungsvertrag} onChange={(e) => updateSW(i, 'wartungsvertrag', e.target.checked)} />
                          Wartungsvertrag vorhanden
                        </label>
                        <label className={`inline-flex items-center gap-2 text-sm ${classes.text2}`}>
                          <input type="checkbox" checked={!!s.migration_support} onChange={(e) => updateSW(i, 'migration_support', e.target.checked)} />
                          Migration geplant/Support nötig
                        </label>

                        <div className="md:col-span-2">
                          <label className={`block text-sm ${classes.text2} mb-1`}>Verwendete Applikationen (eine per Zeile)</label>
                          <textarea rows={3} value={s.verwendete_applikationen_text || ''} onChange={(e) => updateSW(i, 'verwendete_applikationen_text', e.target.value)} className={`w-full px-3 py-2 border rounded-md ${classes.input}`} placeholder="Outlook&#10;Excel&#10;Teams" />
                        </div>

                        {/* Requirements */}
                        <div className="md:col-span-2">
                          <div className="flex items-center justify-between mb-2">
                            <h5 className={`font-medium ${classes.text}`}>Requirements</h5>
                            <div className="flex gap-2">
                              <input
                                className={`px-3 py-2 border rounded-md ${classes.input}`}
                                placeholder="Typ (z. B. CPU, RAM, DB)"
                                value={draft.type}
                                onChange={(e) => setReqDraft(s.id, 'type', e.target.value)}
                              />
                              <input
                                className={`px-3 py-2 border rounded-md ${classes.input}`}
                                placeholder="Detail (z. B. 16 GB RAM)"
                                value={draft.detail}
                                onChange={(e) => setReqDraft(s.id, 'detail', e.target.value)}
                              />
                              <button
                                type="button"
                                onClick={() => addRequirement(s.id)}
                                className="px-3 py-2 rounded-md bg-indigo-600 text-white hover:bg-indigo-700 flex items-center gap-2"
                              >
                                <Plus className="w-4 h-4" /> Hinzufügen
                              </button>
                            </div>
                          </div>
                          {(s.requirements || []).length === 0 ? (
                            <p className={`${classes.muted}`}>Keine Requirements.</p>
                          ) : (
                            <ul className="space-y-2">
                              {s.requirements.map((r) => (
                                <li key={r.id} className={`flex items-center justify-between p-2 rounded border ${classes.border}`}>
                                  <span className={`${classes.text2}`}>{r.type}: <span className={`${classes.text}`}>{r.detail}</span></span>
                                  <button className="text-red-500 hover:text-red-600" onClick={() => removeRequirement(s.id, r.id)} title="Entfernen">
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                </li>
                              ))}
                            </ul>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </section>

              {/* Backup */}
              <section className={`rounded-lg border ${classes.border} p-4`}>
                <div className="flex items-center gap-2 mb-3">
                  <Server className="w-5 h-5 text-emerald-500" />
                  <h3 className={`font-medium ${classes.text}`}>Backup</h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <input className={`px-3 py-2 border rounded-md ${classes.input}`} placeholder="Tool" value={backup.tool || ''} onChange={(e) => setBackup((b) => ({ ...b, tool: e.target.value }))} />
                  <input className={`px-3 py-2 border rounded-md ${classes.input}`} placeholder="Intervall" value={backup.interval || ''} onChange={(e) => setBackup((b) => ({ ...b, interval: e.target.value }))} />
                  <input className={`px-3 py-2 border rounded-md ${classes.input}`} placeholder="Retention" value={backup.retention || ''} onChange={(e) => setBackup((b) => ({ ...b, retention: e.target.value }))} />
                  <input className={`px-3 py-2 border rounded-md ${classes.input}`} placeholder="Location" value={backup.location || ''} onChange={(e) => setBackup((b) => ({ ...b, location: e.target.value }))} />
                  <input type="number" min="0" step="0.01" className={`px-3 py-2 border rounded-md ${classes.input}`} placeholder="Größe (GB)" value={backup.size ?? ''} onChange={(e) => setBackup((b) => ({ ...b, size: e.target.value }))} />
                  <div className="md:col-span-2">
                    <textarea rows={3} className={`w-full px-3 py-2 border rounded-md ${classes.input}`} placeholder="Weitere Informationen" value={backup.info || ''} onChange={(e) => setBackup((b) => ({ ...b, info: e.target.value }))} />
                  </div>
                </div>
              </section>

              {/* Sonstiges */}
              <section className={`rounded-lg border ${classes.border} p-4`}>
                <h3 className={`font-medium ${classes.text} mb-3`}>Sonstiges</h3>
                <textarea
                  rows={4}
                  className={`w-full px-3 py-2 border rounded-md ${classes.input}`}
                  placeholder="Sonstige Informationen, Besonderheiten, Anmerkungen..."
                  value={sonstiges.text || ''}
                  onChange={(e) => setSonstiges({ text: e.target.value })}
                />
              </section>
            </>
          )}
        </div>

        {/* Footer */}
        <div className={`flex items-center justify-between px-5 py-3 border-t ${classes.border}`}>
          <p className={`text-sm ${classes.muted}`}>ID: {onboardingId}</p>
          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-md border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800"
            >
              Abbrechen
            </button>
            <button
              onClick={save}
              disabled={saving}
              className="px-4 py-2 rounded-md bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
            >
              {saving ? 'Speichern...' : (
                <>
                  <Save className="w-4 h-4" /> Speichern
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}