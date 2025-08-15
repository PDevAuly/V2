import React from 'react';
import {
  Building,
  Network,
  Shield,
  User,
  Server,
  Mail,
  Settings,
  HardDrive,
  CheckCircle,
  ChevronRight,
} from 'lucide-react';

export default function OnboardingSection({
  currentOnboardingStep,
  setCurrentOnboardingStep,
  onboardingCustomerData,
  setOnboardingCustomerData,
  infrastructureData,
  setInfrastructureData,
  loading,
  onFinalSubmit,
  isDark, // Dark Mode Status als Prop
}) {
  const onboardingSteps = [
    { id: 1, title: 'Kundendaten', icon: Building, description: 'Firmendaten und Kontakt' },
    { id: 2, title: 'IT-Infrastruktur', icon: Network, description: 'Technische Dokumentation' },
    { id: 3, title: 'Bestätigung', icon: CheckCircle, description: 'Daten prüfen und speichern' },
  ];

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

  const handleOnboardingCustomerSubmit = () => {
    if (!onboardingCustomerData.firmenname || !onboardingCustomerData.email) {
      alert('Bitte füllen Sie mindestens Firmenname und E-Mail aus');
      return;
    }
    setCurrentOnboardingStep(2);
  };

  const handleInfrastructureSubmit = () => setCurrentOnboardingStep(3);

  const yesNo = (v) => (v ? 'Ja' : 'Nein');
  const dash = (v) => (v !== undefined && v !== null && String(v).trim() !== '' ? String(v) : '—');

  // ---- STEP 1: Kundendaten ---------------------------------------------------
  const Step1 = () => (
    <div className="space-y-6">
      <div className={`${bgClass} ${borderClass} rounded-lg shadow-sm border p-6`}>
        <h3 className={`text-lg font-medium ${textClass} mb-4`}>Firmendaten</h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {[
            { label: 'Firmenname *', key: 'firmenname', type: 'text', placeholder: 'Firmenname', required: true },
            { label: 'E-Mail *', key: 'email', type: 'email', placeholder: 'firma@example.com', required: true },
            { label: 'Straße *', key: 'strasse', type: 'text', placeholder: 'Musterstraße' },
            { label: 'Hausnummer *', key: 'hausnummer', type: 'text', placeholder: '123a' },
            { label: 'PLZ *', key: 'plz', type: 'text', placeholder: '12345' },
            { label: 'Ort *', key: 'ort', type: 'text', placeholder: 'Musterstadt' },
            { label: 'Telefon *', key: 'telefonnummer', type: 'tel', placeholder: '+49 123 456789' },
          ].map((field) => (
            <div key={field.key}>
              <label className={`block text-sm font-medium ${textSecondaryClass} mb-2`}>{field.label}</label>
              <input
                type={field.type}
                required={field.required}
                value={onboardingCustomerData[field.key]}
                onChange={(e) =>
                  setOnboardingCustomerData({ ...onboardingCustomerData, [field.key]: e.target.value })
                }
                className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 ${inputClass}`}
                placeholder={field.placeholder}
              />
            </div>
          ))}
        </div>

        <div className={`border-t ${borderClass} pt-6 mt-6`}>
          <h4 className={`text-md font-medium ${textClass} mb-4`}>Ansprechpartner</h4>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              { label: 'Vorname', key: 'vorname', placeholder: 'Max' },
              { label: 'Nachname', key: 'name', placeholder: 'Mustermann' },
              { label: 'Position', key: 'position', placeholder: 'IT-Leiter' },
            ].map((field) => (
              <div key={field.key}>
                <label className={`block text-sm font-medium ${textSecondaryClass} mb-2`}>{field.label}</label>
                <input
                  type="text"
                  value={onboardingCustomerData.ansprechpartner[field.key]}
                  onChange={(e) =>
                    setOnboardingCustomerData({
                      ...onboardingCustomerData,
                      ansprechpartner: {
                        ...onboardingCustomerData.ansprechpartner,
                        [field.key]: e.target.value,
                      },
                    })
                  }
                  className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 ${inputClass}`}
                  placeholder={field.placeholder}
                />
              </div>
            ))}
          </div>
        </div>

        <div className="flex justify-end mt-6">
          <button
            onClick={handleOnboardingCustomerSubmit}
            className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
          >
            Weiter zur IT-Infrastruktur →
          </button>
        </div>
      </div>
    </div>
  );

  // ---- STEP 2: Infrastruktur -------------------------------------------------
  const Step2 = () => (
    <div className="space-y-6">
      {/* Internet & Firewall */}
      <div className={`${bgClass} ${borderClass} rounded-lg shadow-sm border p-6`}>
        <div className="flex items-center mb-4">
          <Shield className="w-5 h-5 text-blue-500 mr-2" />
          <h3 className={`text-lg font-medium ${textClass}`}>Internet & Firewall</h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {[
            { label: 'Internetzugang', key: 'zugang', placeholder: 'z.B. DSL 100/40 Mbit, Glasfaser...' },
            { label: 'Firewall Modell', key: 'firewall_modell', placeholder: 'z.B. Sophos XG 125' },
          ].map((field) => (
            <div key={field.key}>
              <label className={`block text-sm font-medium ${textSecondaryClass} mb-2`}>{field.label}</label>
              <input
                type="text"
                value={infrastructureData.internet[field.key]}
                onChange={(e) =>
                  setInfrastructureData({
                    ...infrastructureData,
                    internet: { ...infrastructureData.internet, [field.key]: e.target.value },
                  })
                }
                className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 ${inputClass}`}
                placeholder={field.placeholder}
              />
            </div>
          ))}

          {/* Feste IP + optionales IP-Feld */}
          <div className="col-span-2">
            <div className="flex items-center">
              <input
                type="checkbox"
                id="feste_ip"
                checked={infrastructureData.internet.feste_ip}
                onChange={(e) =>
                  setInfrastructureData({
                    ...infrastructureData,
                    internet: {
                      ...infrastructureData.internet,
                      feste_ip: e.target.checked,
                      ip_adresse: e.target.checked ? infrastructureData.internet.ip_adresse || '' : '',
                    },
                  })
                }
                className={`h-4 w-4 text-blue-600 rounded focus:ring-blue-500 ${isDark ? 'border-gray-500' : 'border-gray-300'}`}
              />
              <label htmlFor="feste_ip" className={`ml-2 text-sm ${textSecondaryClass}`}>
                Feste IP-Adresse vorhanden
              </label>
            </div>

            {infrastructureData.internet.feste_ip && (
              <div className="mt-3">
                <label className={`block text-sm font-medium ${textSecondaryClass} mb-1`}>IP-Adresse</label>
                <input
                  type="text"
                  value={infrastructureData.internet.ip_adresse || ''}
                  onChange={(e) =>
                    setInfrastructureData({
                      ...infrastructureData,
                      internet: {
                        ...infrastructureData.internet,
                        ip_adresse: e.target.value,
                      },
                    })
                  }
                  className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 ${inputClass}`}
                  placeholder="z.B. 192.168.0.10"
                />
              </div>
            )}
          </div>

          <div className="flex items-center">
            <input
              type="checkbox"
              id="vpn_erforderlich"
              checked={infrastructureData.internet.vpn_erforderlich}
              onChange={(e) =>
                setInfrastructureData({
                  ...infrastructureData,
                  internet: {
                    ...infrastructureData.internet,
                    vpn_erforderlich: e.target.checked,
                  },
                })
              }
              className={`h-4 w-4 text-blue-600 rounded focus:ring-blue-500 ${isDark ? 'border-gray-500' : 'border-gray-300'}`}
            />
            <label htmlFor="vpn_erforderlich" className={`ml-2 text-sm ${textSecondaryClass}`}>
              VPN-Einwahl erforderlich
            </label>
          </div>
        </div>
      </div>

      {/* Benutzer */}
      <div className={`${bgClass} ${borderClass} rounded-lg shadow-sm border p-6`}>
        <div className="flex items-center mb-4">
          <User className="w-5 h-5 text-green-500 mr-2" />
          <h3 className={`text-lg font-medium ${textClass}`}>Benutzer</h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {[
            { label: 'Anzahl User im Netz', key: 'netz_user_anzahl', type: 'number' },
            { label: 'Anzahl Mail-User', key: 'mail_user_anzahl', type: 'number' },
          ].map((field) => (
            <div key={field.key}>
              <label className={`block text-sm font-medium ${textSecondaryClass} mb-2`}>{field.label}</label>
              <input
                type={field.type}
                value={infrastructureData.users[field.key]}
                onChange={(e) =>
                  setInfrastructureData({
                    ...infrastructureData,
                    users: {
                      ...infrastructureData.users,
                      [field.key]: parseInt(e.target.value) || 0,
                    },
                  })
                }
                className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 ${inputClass}`}
                min="0"
              />
            </div>
          ))}
        </div>
      </div>

      {/* Hardware */}
      <div className={`${bgClass} ${borderClass} rounded-lg shadow-sm border p-6`}>
        <div className="flex items-center mb-4">
          <Server className="w-5 h-5 text-purple-500 mr-2" />
          <h3 className={`text-lg font-medium ${textClass}`}>Hardware</h3>
        </div>

        <div className="grid grid-cols-1 gap-6">
          <div>
            <label className={`block text-sm font-medium ${textSecondaryClass} mb-2`}>Hardware hinzufügen</label>

            <div className="flex gap-2 mb-3">
              <select
                value=""
                onChange={(e) => {
                  if (!e.target.value) return;
                  const newList = [...(infrastructureData.hardware.verwendete_hardware || [])];
                  if (!newList.some((hw) => hw.startsWith(e.target.value))) {
                    newList.push(e.target.value);
                    setInfrastructureData({
                      ...infrastructureData,
                      hardware: { ...infrastructureData.hardware, verwendete_hardware: newList },
                    });
                  }
                  e.target.value = '';
                }}
                className={`flex-1 px-3 py-2 border rounded-md focus:outline-none focus:ring-2 ${inputClass}`}
              >
                <option value="">Hardware-Typ auswählen...</option>
                <optgroup label="Server & Storage">
                  <option value="Server">Server</option>
                  <option value="NAS">NAS</option>
                  <option value="SAN">SAN</option>
                  <option value="Backup-Server">Backup-Server</option>
                  <option value="Virtualisierungs-Host">Virtualisierungs-Host</option>
                  <option value="RAID 0">RAID 0</option>
                  <option value="RAID 1">RAID 1</option>
                  <option value="RAID 5">RAID 5</option>
                  <option value="RAID 6">RAID 6</option>
                  <option value="RAID 10">RAID 10</option>
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
                  <option value="USV APC Smart-UPS 1500">USV APC Smart-UPS 1500</option>
                  <option value="Eaton 9PX">Eaton 9PX</option>
                  <option value="PDU">PDU</option>
                </optgroup>
              </select>

              <input
                type="text"
                placeholder="Oder Modell eingeben…"
                onKeyDown={(e) => {
                  if (e.key !== 'Enter' || !e.target.value.trim()) return;
                  const v = e.target.value.trim();
                  const list = [...(infrastructureData.hardware.verwendete_hardware || [])];
                  list.push(v);
                  setInfrastructureData({
                    ...infrastructureData,
                    hardware: { ...infrastructureData.hardware, verwendete_hardware: list },
                  });
                  e.target.value = '';
                }}
                className={`flex-1 px-3 py-2 border rounded-md focus:outline-none focus:ring-2 ${inputClass}`}
              />
            </div>

            {infrastructureData.hardware.verwendete_hardware?.length > 0 && (
              <div className="mt-3">
                <p className={`text-sm ${textMutedClass} mb-2`}>Erfasste Hardware:</p>
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {infrastructureData.hardware.verwendete_hardware.map((hw, index) => (
                    <div
                      key={`${hw}-${index}`}
                      className={`flex items-center justify-between ${isDark ? 'bg-gray-700' : 'bg-gray-50'} px-3 py-2 rounded-md`}
                    >
                      <span className={`text-sm ${textClass}`}>{hw}</span>
                      <button
                        type="button"
                        onClick={() => {
                          const updated = infrastructureData.hardware.verwendete_hardware.filter(
                            (_, i) => i !== index
                          );
                          setInfrastructureData({
                            ...infrastructureData,
                            hardware: { ...infrastructureData.hardware, verwendete_hardware: updated },
                          });
                        }}
                        className="text-red-500 hover:text-red-700 text-sm px-2"
                        title="Entfernen"
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Mail */}
      <div className={`${bgClass} ${borderClass} rounded-lg shadow-sm border p-6`}>
        <div className="flex items-center mb-4">
          <Mail className="w-5 h-5 text-orange-500 mr-2" />
          <h3 className={`text-lg font-medium ${textClass}`}>Mail Server</h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {[
            { label: 'Mail Speicherort', key: 'mail_speicherort', placeholder: 'z.B. Exchange, Office 365' },
            { label: 'Mail Server Volumen', key: 'mail_server_volumen', placeholder: 'z.B. 100 GB' },
          ].map((field) => (
            <div key={field.key}>
              <label className={`block text-sm font-medium ${textSecondaryClass} mb-2`}>{field.label}</label>
              <input
                type="text"
                value={infrastructureData.mail[field.key]}
                onChange={(e) =>
                  setInfrastructureData({
                    ...infrastructureData,
                    mail: { ...infrastructureData.mail, [field.key]: e.target.value },
                  })
                }
                className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 ${inputClass}`}
                placeholder={field.placeholder}
              />
            </div>
          ))}
        </div>
      </div>

      {/* Software */}
      <div className={`${bgClass} ${borderClass} rounded-lg shadow-sm border p-6`}>
        <div className="flex items-center mb-4">
          <Settings className="w-5 h-5 text-indigo-500 mr-2" />
          <h3 className={`text-lg font-medium ${textClass}`}>Software</h3>
        </div>

        <div className="grid grid-cols-1 gap-6">
          <div>
            <label className={`block text-sm font-medium ${textSecondaryClass} mb-2`}>Virenschutz</label>
            <input
              type="text"
              value={infrastructureData.software.virenschutz}
              onChange={(e) =>
                setInfrastructureData({
                  ...infrastructureData,
                  software: { ...infrastructureData.software, virenschutz: e.target.value },
                })
              }
              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 ${inputClass}`}
              placeholder="z.B. Sophos, Kaspersky"
            />
          </div>

          <div>
            <label className={`block text-sm font-medium ${textSecondaryClass} mb-2`}>
              Verwendete Applikationen (eine pro Zeile)
            </label>
            <textarea
              value={infrastructureData.software.verwendete_applikationen_text || ''}
              onChange={(e) =>
                setInfrastructureData({
                  ...infrastructureData,
                  software: {
                    ...infrastructureData.software,
                    verwendete_applikationen_text: e.target.value,
                    verwendete_applikationen: e.target.value
                      .split(/\n+/)
                      .map((s) => s.trim())
                      .filter(Boolean),
                  },
                })
              }
              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 ${inputClass}`}
              rows="5"
              placeholder={`z.B.\nMicrosoft Office\nAdobe Creative Cloud\nSage 50`}
            />
          </div>
        </div>
      </div>

      {/* Backup */}
      <div className={`${bgClass} ${borderClass} rounded-lg shadow-sm border p-6`}>
        <div className="flex items-center mb-4">
          <HardDrive className="w-5 h-5 text-red-500 mr-2" />
          <h3 className={`text-lg font-medium ${textClass}`}>Backup</h3>
        </div>

        <div className="grid grid-cols-1 gap-6">
          <div>
            <label className={`block text-sm font-medium ${textSecondaryClass} mb-2`}>Backup-Strategie</label>
            <textarea
              value={infrastructureData.backup.strategie}
              onChange={(e) =>
                setInfrastructureData({
                  ...infrastructureData,
                  backup: { ...infrastructureData.backup, strategie: e.target.value },
                })
              }
              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 ${inputClass}`}
              rows="2"
              placeholder="z.B. Tägliches Backup auf NAS, wöchentlich Offsite…"
            />
          </div>

          <div className="flex items-center space-x-6">
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={infrastructureData.backup.nas_vorhanden}
                onChange={(e) =>
                  setInfrastructureData({
                    ...infrastructureData,
                    backup: { ...infrastructureData.backup, nas_vorhanden: e.target.checked },
                  })
                }
                className={`h-4 w-4 text-blue-600 rounded focus:ring-blue-500 ${isDark ? 'border-gray-500' : 'border-gray-300'}`}
              />
              <span className={`ml-2 text-sm ${textSecondaryClass}`}>NAS vorhanden</span>
            </label>

            <label className="flex items-center">
              <input
                type="checkbox"
                checked={infrastructureData.backup.dokumentation_vorhanden}
                onChange={(e) =>
                  setInfrastructureData({
                    ...infrastructureData,
                    backup: {
                      ...infrastructureData.backup,
                      dokumentation_vorhanden: e.target.checked,
                    },
                  })
                }
                className={`h-4 w-4 text-blue-600 rounded focus:ring-blue-500 ${isDark ? 'border-gray-500' : 'border-gray-300'}`}
              />
              <span className={`ml-2 text-sm ${textSecondaryClass}`}>Dokumentation vorhanden</span>
            </label>
          </div>
        </div>
      </div>

      {/* Sonstiges */}
      <div className={`${bgClass} ${borderClass} rounded-lg shadow-sm border p-6`}>
        <div className="flex items-center mb-4">
          <Settings className="w-5 h-5 text-yellow-500 mr-2" />
          <h3 className={`text-lg font-medium ${textClass}`}>Sonstiges</h3>
        </div>

        <div className="grid grid-cols-1 gap-6">
          <div>
            <label className={`block text-sm font-medium ${textSecondaryClass} mb-2`}>
              Sonstige Anmerkungen oder Informationen
            </label>
            <textarea
              value={infrastructureData.sonstiges?.text || ''}
              onChange={(e) =>
                setInfrastructureData({
                  ...infrastructureData,
                  sonstiges: { ...(infrastructureData.sonstiges || {}), text: e.target.value },
                })
              }
              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 ${inputClass}`}
              rows="4"
              placeholder="Besonderheiten, Hinweise, TODOs…"
            />
          </div>
        </div>
      </div>

      <div className="flex justify-between">
        <button
          onClick={() => setCurrentOnboardingStep(1)}
          className="px-6 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-500 transition-colors"
        >
          ← Zurück zu Kundendaten
        </button>
        <button
          onClick={handleInfrastructureSubmit}
          className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
        >
          Weiter zur Bestätigung →
        </button>
      </div>
    </div>
  );

  // ---- STEP 3: Zusammenfassung ----------------------------------------------
  const Step3 = () => {
    const { firmenname, email, strasse, hausnummer, plz, ort, telefonnummer, ansprechpartner } =
      onboardingCustomerData;
    const { internet, users, hardware, mail, software, backup, sonstiges } = infrastructureData;

    const appsText = software?.verwendete_applikationen_text || '';
    const appsList = Array.isArray(software?.verwendete_applikationen)
      ? software.verwendete_applikationen
      : [];
    const verwendeteHardware = Array.isArray(hardware?.verwendete_hardware)
      ? hardware.verwendete_hardware
      : [];

    return (
      <div className="space-y-6">
        <div className={`${bgClass} ${borderClass} rounded-lg shadow-sm border p-6`}>
          <h3 className={`text-lg font-medium ${textClass} mb-4`}>Zusammenfassung</h3>

          {/* Kunde */}
          <div className="space-y-2 mb-6">
            <h4 className={`font-semibold ${textClass}`}>Kunde</h4>
            <dl className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-2">
              {[
                { label: 'Firmenname', value: firmenname },
                { label: 'E-Mail', value: email },
                { label: 'Straße / Nr.', value: `${dash(strasse)} ${dash(hausnummer)}` },
                { label: 'PLZ / Ort', value: `${dash(plz)} ${dash(ort)}` },
                { label: 'Telefon', value: telefonnummer },
              ].map((item) => (
                <div key={item.label}>
                  <dt className={`text-sm ${textMutedClass}`}>{item.label}</dt>
                  <dd className={`text-sm ${textClass}`}>{dash(item.value)}</dd>
                </div>
              ))}
            </dl>

            <h5 className={`font-medium ${textClass} mt-4`}>Ansprechpartner</h5>
            <dl className="grid grid-cols-1 md:grid-cols-3 gap-x-8 gap-y-2">
              {[
                { label: 'Vorname', value: ansprechpartner?.vorname },
                { label: 'Nachname', value: ansprechpartner?.name },
                { label: 'Position', value: ansprechpartner?.position },
              ].map((item) => (
                <div key={item.label}>
                  <dt className={`text-sm ${textMutedClass}`}>{item.label}</dt>
                  <dd className={`text-sm ${textClass}`}>{dash(item.value)}</dd>
                </div>
              ))}
            </dl>
          </div>

          {/* Internet & Firewall */}
          <div className="space-y-2 mb-6">
            <h4 className={`font-semibold ${textClass}`}>Internet &amp; Firewall</h4>
            <dl className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-2">
              {[
                { label: 'Internetzugang', value: internet?.zugang },
                { label: 'Firewall-Modell', value: internet?.firewall_modell },
                { label: 'Feste IP', value: yesNo(internet?.feste_ip) },
                ...(internet?.feste_ip ? [{ label: 'IP-Adresse', value: internet?.ip_adresse }] : []),
                { label: 'VPN erforderlich', value: yesNo(internet?.vpn_erforderlich) },
                { label: 'VPN-User (Anzahl)', value: internet?.vpn_user_anzahl },
              ].map((item) => (
                <div key={item.label}>
                  <dt className={`text-sm ${textMutedClass}`}>{item.label}</dt>
                  <dd className={`text-sm ${textClass}`}>{dash(item.value)}</dd>
                </div>
              ))}
            </dl>
          </div>

          {/* Benutzer */}
          <div className="space-y-2 mb-6">
            <h4 className={`font-semibold ${textClass}`}>Benutzer</h4>
            <dl className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-2">
              {[
                { label: 'Anzahl User im Netz', value: users?.netz_user_anzahl },
                { label: 'Anzahl Mail-User', value: users?.mail_user_anzahl },
              ].map((item) => (
                <div key={item.label}>
                  <dt className={`text-sm ${textMutedClass}`}>{item.label}</dt>
                  <dd className={`text-sm ${textClass}`}>{dash(item.value)}</dd>
                </div>
              ))}
            </dl>
          </div>

          {/* Hardware */}
          <div className="space-y-2 mb-6">
            <h4 className={`font-semibold ${textClass}`}>Hardware</h4>
            <dl className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-2">
              {[
                { label: 'RAID-Level', value: hardware?.raid_level },
                { label: 'USV vorhanden', value: yesNo(hardware?.usv_vorhanden) },
                { label: 'USV-Modell', value: hardware?.usv_modell },
              ].map((item) => (
                <div key={item.label}>
                  <dt className={`text-sm ${textMutedClass}`}>{item.label}</dt>
                  <dd className={`text-sm ${textClass}`}>{dash(item.value)}</dd>
                </div>
              ))}
            </dl>

            <div className="mt-2">
              <dt className={`text-sm ${textMutedClass} mb-1`}>Verwendete Hardware</dt>
              {verwendeteHardware.length > 0 ? (
                <ul className="list-disc list-inside text-sm space-y-1">
                  {verwendeteHardware.map((h, i) => (
                    <li key={i} className={textClass}>{h}</li>
                  ))}
                </ul>
              ) : (
                <p className={`text-sm ${textMutedClass}`}>—</p>
              )}
            </div>
          </div>

          {/* Mail */}
          <div className="space-y-2 mb-6">
            <h4 className={`font-semibold ${textClass}`}>Mail</h4>
            <dl className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-2">
              {[
                { label: 'Mail-Speicherort', value: mail?.mail_speicherort },
                { label: 'Mail-Server Volumen', value: mail?.mail_server_volumen },
                { label: 'POP3-Connector', value: yesNo(mail?.pop3_connector) },
                { label: 'Sonstige Mailadressen', value: mail?.sonstige_mailadressen },
                { label: 'Mobiler Zugriff', value: yesNo(mail?.mobiler_zugriff) },
                { label: 'Zertifikat erforderlich', value: yesNo(mail?.zertifikat_erforderlich) },
              ].map((item) => (
                <div key={item.label}>
                  <dt className={`text-sm ${textMutedClass}`}>{item.label}</dt>
                  <dd className={`text-sm ${textClass}`}>{dash(item.value)}</dd>
                </div>
              ))}
            </dl>
          </div>

          {/* Software */}
          <div className="space-y-2 mb-6">
            <h4 className={`font-semibold ${textClass}`}>Software</h4>
            <dl className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-2">
              {[
                { label: 'Virenschutz', value: software?.virenschutz },
                { label: 'Schnittstellen', value: software?.schnittstellen },
                { label: 'Wartungsvertrag', value: yesNo(software?.wartungsvertrag) },
                { label: 'Migration Support', value: yesNo(software?.migration_support) },
              ].map((item) => (
                <div key={item.label}>
                  <dt className={`text-sm ${textMutedClass}`}>{item.label}</dt>
                  <dd className={`text-sm ${textClass}`}>{dash(item.value)}</dd>
                </div>
              ))}
            </dl>

            <div className="mt-2">
              <dt className={`text-sm ${textMutedClass} mb-1`}>Verwendete Applikationen (Text)</dt>
              <dd className={`text-sm ${textClass} whitespace-pre-line`}>{appsText.trim() ? appsText : '—'}</dd>
            </div>

            <div className="mt-2">
              <dt className={`text-sm ${textMutedClass} mb-1`}>Verwendete Applikationen (Liste)</dt>
              {appsList.length > 0 ? (
                <ul className="list-disc list-inside text-sm space-y-1">
                  {appsList.map((app, i) => (
                    <li key={i} className={textClass}>{app}</li>
                  ))}
                </ul>
              ) : (
                <p className={`text-sm ${textMutedClass}`}>—</p>
              )}
            </div>
          </div>

          {/* Backup */}
          <div className="space-y-2 mb-6">
            <h4 className={`font-semibold ${textClass}`}>Backup</h4>
            <dl className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-2">
              {[
                { label: 'Strategie', value: backup?.strategie },
                { label: 'NAS vorhanden', value: yesNo(backup?.nas_vorhanden) },
                { label: 'Externe HDDs', value: backup?.externe_hdds },
                { label: 'Doku vorhanden', value: yesNo(backup?.dokumentation_vorhanden) },
                { label: 'Admin-Passwörter bekannt', value: yesNo(backup?.admin_passwoerter_bekannt) },
              ].map((item) => (
                <div key={item.label}>
                  <dt className={`text-sm ${textMutedClass}`}>{item.label}</dt>
                  <dd className={`text-sm ${textClass}`}>{dash(item.value)}</dd>
                </div>
              ))}
            </dl>
          </div>

          {/* Sonstiges */}
          <div className="space-y-2">
            <h4 className={`font-semibold ${textClass}`}>Sonstiges</h4>
            <p className={`text-sm ${textClass} whitespace-pre-line`}>{dash(sonstiges?.text)}</p>
          </div>

          <div className="flex justify-between mt-6">
            <button
              onClick={() => setCurrentOnboardingStep(2)}
              className="px-6 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-500 transition-colors"
            >
              ← Zurück zur IT-Infrastruktur
            </button>
            <button
              onClick={onFinalSubmit}
              disabled={loading}
              className="px-6 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-green-500 transition-colors"
            >
              {loading ? 'Speichern...' : 'Kunde und IT-Infrastruktur speichern'}
            </button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="max-w-6xl">
      {/* Progress Steps */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          {onboardingSteps.map((step) => (
            <div key={step.id} className="flex items-center">
              <div
                className={`flex items-center justify-center w-10 h-10 rounded-full border-2 ${
                  currentOnboardingStep >= step.id
                    ? 'bg-blue-600 border-blue-600 text-white'
                    : `${isDark ? 'bg-gray-700' : 'bg-white'} ${borderClass} ${textMutedClass}`
                }`}
              >
                {currentOnboardingStep > step.id ? (
                  <CheckCircle className="w-5 h-5" />
                ) : (
                  <step.icon className="w-5 h-5" />
                )}
              </div>
              <div className="ml-3">
                <p
                  className={`text-sm font-medium ${
                    currentOnboardingStep >= step.id ? 'text-blue-600' : textMutedClass
                  }`}
                >
                  {step.title}
                </p>
                <p className={`text-xs ${textMutedClass}`}>{step.description}</p>
              </div>
              {step.id < onboardingSteps.length && (
                <ChevronRight className={`w-5 h-5 ${textMutedClass} mx-4`} />
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Step Content */}
      {currentOnboardingStep === 1 && <Step1 />}
      {currentOnboardingStep === 2 && <Step2 />}
      {currentOnboardingStep === 3 && <Step3 />}
    </div>
  );
}